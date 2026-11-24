import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

/**
 * Resolves a clean public Shared App origin so links copied inside the builder preview
 * (`ais-dev-*`) point to the public Shared App URL (`ais-pre-*`) instead of redirecting
 * external visitors to an auth/history page.
 */
function resolveShareBaseUrl(): string | null {
  const raw = process.env.SHARED_APP_URL || process.env.APP_URL || '';
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.hostname.startsWith('ais-dev-')) {
      parsed.hostname = 'ais-pre-' + parsed.hostname.slice('ais-dev-'.length);
    }
    return parsed.origin;
  } catch {
    return null;
  }
}
const SHARE_BASE_URL = resolveShareBaseUrl();

// ---------------- VALIDATION HELPERS ----------------

const ROOM_ID_RE = /^[a-zA-Z0-9_-]{1,28}$/;

const VALID_HOUSING_KINDS = new Set([
  'floor',
  'wall',
  'half_wall',
  'fence',
  'pillar',
  'doorway',
  'door',
  'window_wall',
  'ceiling',
  'flat_roof',
  'roof',
  'stairs',
  'wall_torch',
  'ceiling_light',
  'bed',
  'chair',
  'table',
  'cabinet',
]);

const VALID_HOUSING_MATERIALS = new Set(['wood', 'stone', 'half_timber', 'iron_fort']);

const VALID_HOUSING_COLORS = new Set([
  'natural',
  'ivory',
  'terracotta',
  'cedar',
  'sage',
  'cobalt',
  'charcoal',
  'ochre',
]);

const VALID_EDGES = new Set(['n', 'e', 's', 'w']);

const VALID_CLASSES = new Set(['warrior', 'archer', 'healer', 'mage', 'rogue']);

const VALID_WEAPONS = new Set([
  'crystal_sword',
  'stone_axe',
  'stone_pickaxe',
  'hunter_blade',
  'iron_axe',
  'iron_pickaxe',
  'essence_battleaxe',
  'rune_greatsword',
  'recurve_bow',
  'windstrider_bow',
  'azure_star_bow',
  'emerald_wing_staff',
  'sanctuary_staff',
  'seraphic_staff',
  'crystal_wand',
  'amethyst_wand',
  'astral_nova_staff',
  'tactical_dagger',
  'viper_dagger',
  'eclipse_dagger',
]);

const VALID_ARMORS = new Set([
  'pioneer_denim',
  'wild_leather',
  'iron_plate',
  'frost_wolf_cloak',
  'rune_paladin',
  'olive_puffer',
  'forest_stalker',
  'gale_hawk_garb',
  'cream_cardigan',
  'ivory_acolyte',
  'seraph_vestment',
  'violet_hoodie',
  'amethyst_robe',
  'astral_archmage',
  'stealth_cargo',
  'nightshade_gear',
  'eclipse_shroud',
]);

const VALID_EMOTES = new Set(['wave', 'sit', 'cheer', 'dance', 'bow', 'victory']);

const VALID_GAME_MODES = new Set(['survival', 'creative']);

const VALID_DAILY_QUEST_IDS = new Set([
  'daily_gather_wood',
  'daily_mine_ore',
  'daily_hunt_monsters',
  'daily_harvest_food',
  'daily_build_or_plant',
  'daily_coop_challenge',
]);

const VALID_SPAWN_EGG_IDS = new Set([
  'forest_slime',
  'meadow_boar',
  'frost_wolf',
  'night_skeleton',
  'night_wraith',
  'water_slime',
  'wind_slime',
  'ember_wolf',
  'sand_scorpion',
  'water_spirit',
  'wind_spirit',
  'fire_spirit',
  'earth_spirit',
  'water_spirit_king',
  'wind_spirit_king',
  'fire_spirit_king',
  'earth_spirit_king',
  'elder_tusk_boss',
  'alpha_frost_boss',
  'rune_golem_boss',
  'coastal_titan_boss',
  'azure_dragon_boss',
  'white_tiger_boss',
  'vermilion_bird_boss',
  'black_tortoise_boss',
  'frost_golem',
]);

function getServerDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function clampNum(v: unknown, min: number, max: number, fallback: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, v));
}

function sanitizeName(raw: unknown, fallback: string): string {
  if (typeof raw !== 'string') return fallback;
  const cleaned = raw.replace(/[\u0000-\u001F\u007F<>]/g, '').trim().slice(0, 16);
  return cleaned.length > 0 ? cleaned : fallback;
}

function sanitizeRoomId(raw: string | null): string {
  if (raw && ROOM_ID_RE.test(raw)) return raw;
  return 'main';
}

function sanitizeId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.trim().slice(0, 64);
  if (!/^[a-zA-Z0-9_:-]{1,64}$/.test(cleaned)) return null;
  return cleaned;
}

interface RemotePlayerState {
  id: string;
  name: string;
  playerClass: string;
  gameMode: 'survival' | 'creative';
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
  isSprinting: boolean;
  isGrounded: boolean;
  swinging: boolean;
  weapon: string;
  armor: string;
  emote: string | null;
}

interface SharedSpawnedMonster {
  id: string;
  eggId: string;
  x: number;
  z: number;
  worldTier: number;
  summonerName: string;
}

interface SharedHousingTile {
  id: string;
  kind: string;
  material: string;
  color: string;
  gx: number;
  gz: number;
  level: number;
  edge: string | null;
  rotationStep: number;
  rotationY?: number;
  gridSnapped?: boolean;
  freeX?: number;
  freeZ?: number;
  heightOffset?: number;
  baseY: number;
  isDoorOpen?: boolean;
  durability?: number;
  maxDurability?: number;
  ownerId: string;
}

interface SharedLandPlot {
  id: string;
  x: number;
  z: number;
  radius: number;
  ownerId: string;
  ownerName: string;
}

interface RoomPlayerEntry {
  ws: WebSocket | null;
  state: RemotePlayerState;
  lastSeenAt: number;
}

interface WorldRoom {
  id: string;
  gameMode: 'survival' | 'creative';
  gameModeLocked: boolean;
  dailyDate: string;
  dailyProgress: Record<string, number>;
  dailyContributors: Record<string, string>;
  spawnedMonsters: Map<string, SharedSpawnedMonster>;
  players: Map<string, RoomPlayerEntry>;
  housing: Map<string, SharedHousingTile>;
  plots: Map<string, SharedLandPlot>;
  lastActivityAt: number;
}

const MAX_HOUSING_PER_ROOM = 900;
const MAX_PLOTS_PER_ROOM = 40;
const MAX_SPAWNED_MONSTERS_PER_ROOM = 40;
const MAX_PLAYERS_PER_ROOM = 32;
const MAX_ROOMS = 200;
const MAX_MSGS_PER_SECOND = 60;
const rooms = new Map<string, WorldRoom>();

function ensureRoomDailyDate(room: WorldRoom): void {
  const today = getServerDateKey();
  if (room.dailyDate !== today) {
    room.dailyDate = today;
    room.dailyProgress = {};
    room.dailyContributors = {};
  }
}

function getRoomDailyPayload(room: WorldRoom) {
  ensureRoomDailyDate(room);
  return {
    dateKey: room.dailyDate,
    progress: { ...room.dailyProgress },
    contributors: { ...room.dailyContributors },
  };
}

function getOrCreateRoom(roomId: string, requestedMode?: string | null): WorldRoom | null {
  let room = rooms.get(roomId);
  const validReqMode =
    typeof requestedMode === 'string' && VALID_GAME_MODES.has(requestedMode)
      ? (requestedMode as 'survival' | 'creative')
      : null;

  if (!room) {
    if (rooms.size >= MAX_ROOMS) {
      // Evict oldest empty room if available
      let evicted = false;
      for (const [rid, existing] of rooms) {
        if (existing.players.size === 0) {
          rooms.delete(rid);
          evicted = true;
          break;
        }
      }
      if (!evicted) return null;
    }
    room = {
      id: roomId,
      gameMode: validReqMode ?? 'survival',
      gameModeLocked: validReqMode !== null,
      dailyDate: getServerDateKey(),
      dailyProgress: {},
      dailyContributors: {},
      spawnedMonsters: new Map(),
      players: new Map(),
      housing: new Map(),
      plots: new Map(),
      lastActivityAt: Date.now(),
    };
    rooms.set(roomId, room);
  } else if (!room.gameModeLocked && validReqMode && room.players.size === 0) {
    room.gameMode = validReqMode;
    room.gameModeLocked = true;
  }
  ensureRoomDailyDate(room);
  room.lastActivityAt = Date.now();
  return room;
}

function broadcast(room: WorldRoom, payload: unknown, excludeId?: string): void {
  const serialized = JSON.stringify(payload);
  for (const [pid, client] of room.players) {
    if (pid === excludeId) continue;
    if (client.ws && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(serialized);
    }
  }
}

function validateHousingPayload(raw: unknown, ownerId: string): SharedHousingTile | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = sanitizeId(o.id);
  if (!id) return null;
  if (typeof o.kind !== 'string' || !VALID_HOUSING_KINDS.has(o.kind)) return null;
  if (typeof o.material !== 'string' || !VALID_HOUSING_MATERIALS.has(o.material)) return null;
  const color = typeof o.color === 'string' && VALID_HOUSING_COLORS.has(o.color) ? o.color : 'natural';
  const edge = typeof o.edge === 'string' && VALID_EDGES.has(o.edge) ? o.edge : null;

  return {
    id,
    kind: o.kind,
    material: o.material,
    color,
    gx: Math.round(clampNum(o.gx, -260, 260, 0)),
    gz: Math.round(clampNum(o.gz, -260, 260, 0)),
    level: Math.round(clampNum(o.level, 0, 8, 0)),
    edge,
    rotationStep: Math.round(clampNum(o.rotationStep, 0, 3, 0)),
    rotationY: typeof o.rotationY === 'number' && Number.isFinite(o.rotationY)
      ? clampNum(o.rotationY, -Math.PI * 4, Math.PI * 4, 0)
      : undefined,
    gridSnapped: typeof o.gridSnapped === 'boolean' ? o.gridSnapped : true,
    freeX: typeof o.freeX === 'number' && Number.isFinite(o.freeX) ? clampNum(o.freeX, -800, 800, 0) : undefined,
    freeZ: typeof o.freeZ === 'number' && Number.isFinite(o.freeZ) ? clampNum(o.freeZ, -800, 800, 0) : undefined,
    heightOffset: typeof o.heightOffset === 'number' && Number.isFinite(o.heightOffset)
      ? clampNum(o.heightOffset, -2, 6, 0)
      : 0,
    baseY: clampNum(o.baseY, -20, 120, 0),
    isDoorOpen: Boolean(o.isDoorOpen),
    durability: typeof o.durability === 'number' && Number.isFinite(o.durability)
      ? clampNum(o.durability, 0, 2000, 120)
      : undefined,
    maxDurability: typeof o.maxDurability === 'number' && Number.isFinite(o.maxDurability)
      ? clampNum(o.maxDurability, 1, 2000, 120)
      : undefined,
    ownerId,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '128kb' }));

  // Fast Brotli + Gzip compression for JS/CSS/HTML/JSON/SVG to minimize shared-link download time
  app.use((req, res, next) => {
    const accept = String(req.headers['accept-encoding'] || '');
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }
    const useBr = accept.includes('br');
    const useGz = accept.includes('gzip');
    if ((!useBr && !useGz) || req.headers.upgrade) {
      next();
      return;
    }

    const origWrite = res.write.bind(res) as typeof res.write;
    const origEnd = res.end.bind(res) as typeof res.end;
    let compStream: zlib.BrotliCompress | zlib.Gzip | null = null;
    let decided = false;

    const shouldCompress = () => {
      const ce = res.getHeader('Content-Encoding');
      if (ce) return false;
      const ct = String(res.getHeader('Content-Type') || '').toLowerCase();
      return (
        ct.includes('javascript') ||
        ct.includes('text/') ||
        ct.includes('json') ||
        ct.includes('svg') ||
        ct.includes('wasm')
      );
    };

    const ensureStream = () => {
      if (decided) return;
      decided = true;
      if (shouldCompress()) {
        res.removeHeader('Content-Length');
        res.setHeader('Vary', 'Accept-Encoding');
        if (useBr) {
          res.setHeader('Content-Encoding', 'br');
          compStream = zlib.createBrotliCompress({
            params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 },
          });
        } else {
          res.setHeader('Content-Encoding', 'gzip');
          compStream = zlib.createGzip({ level: 5 });
        }
        compStream.on('data', (chunk) => {
          origWrite(chunk);
        });
        compStream.on('end', () => {
          origEnd();
        });
      }
    };

    res.write = ((chunk: unknown, encoding?: unknown, cb?: unknown) => {
      ensureStream();
      if (compStream) {
        return compStream.write(chunk as Buffer, encoding as BufferEncoding, cb as () => void);
      }
      return origWrite(chunk as Buffer, encoding as BufferEncoding, cb as () => void);
    }) as typeof res.write;

    res.end = ((chunk?: unknown, encoding?: unknown, cb?: unknown) => {
      ensureStream();
      if (compStream) {
        if (chunk !== undefined && chunk !== null && typeof chunk !== 'function') {
          compStream.end(chunk as Buffer, encoding as BufferEncoding, cb as () => void);
        } else {
          compStream.end(typeof chunk === 'function' ? (chunk as () => void) : undefined);
        }
        return res;
      }
      return origEnd(chunk as Buffer, encoding as BufferEncoding, cb as () => void);
    }) as typeof res.end;

    next();
  });

  // Cache character portraits and static public assets aggressively
  const publicAssetsDir = path.resolve(__dirname, 'public/assets');
  if (fs.existsSync(publicAssetsDir)) {
    app.use('/assets', express.static(publicAssetsDir, { maxAge: '7d', immutable: true }));
  }

  // Allow cross-origin access between ais-dev builder preview and ais-pre public shared server
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  // Clean public share URL endpoint so shared links open the game directly
  app.get('/api/share-config', (_req, res) => {
    res.json({ shareBaseUrl: SHARE_BASE_URL });
  });

  // Lightweight room info API
  app.get('/api/rooms/:roomId', (req, res) => {
    const roomId = sanitizeRoomId(req.params.roomId);
    const room = rooms.get(roomId);
    res.json({
      roomId,
      roomGameMode: room ? room.gameMode : 'survival',
      onlineCount: room ? room.players.size : 0,
      housingCount: room ? room.housing.size : 0,
    });
  });

  // Unified HTTP fallback sync endpoint (shares exact same WorldRoom state with WebSocket clients)
  app.post('/api/rooms/:roomId/sync', (req, res) => {
    const roomId = sanitizeRoomId(req.params.roomId);
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    const requestedMode = typeof body.gameMode === 'string' ? body.gameMode : null;
    const room = getOrCreateRoom(roomId, requestedMode);
    if (!room) {
      res.status(503).json({ error: 'Server room capacity reached' });
      return;
    }
    const now = Date.now();
    let playerId = sanitizeId(body.playerId);
    const fallbackName = `냥기사 #${Math.floor(1000 + Math.random() * 8999)}`;
    const playerName = sanitizeName(body.name, fallbackName);

    if (!playerId) {
      playerId = `p_${crypto.randomUUID().slice(0, 12)}`;
    }

    let entry = room.players.get(playerId);
    if (!entry) {
      if (room.players.size >= MAX_PLAYERS_PER_ROOM) {
        res.status(503).json({ error: 'Room full' });
        return;
      }
      const initialState: RemotePlayerState = {
        id: playerId,
        name: playerName,
        playerClass: typeof body.playerClass === 'string' && VALID_CLASSES.has(body.playerClass) ? body.playerClass : 'warrior',
        gameMode: room.gameMode,
        x: clampNum(body.x, -800, 800, 0),
        y: clampNum(body.y, -20, 120, 0),
        z: clampNum(body.z, -800, 800, 6.2),
        yaw: clampNum(body.yaw, -Math.PI * 4, Math.PI * 4, Math.PI),
        speed: clampNum(body.speed, 0, 25, 0),
        isSprinting: Boolean(body.isSprinting),
        isGrounded: body.isGrounded !== false,
        swinging: Boolean(body.swinging),
        weapon: typeof body.weapon === 'string' && VALID_WEAPONS.has(body.weapon) ? body.weapon : 'crystal_sword',
        armor: typeof body.armor === 'string' && VALID_ARMORS.has(body.armor) ? body.armor : 'pioneer_denim',
        emote: typeof body.emote === 'string' && VALID_EMOTES.has(body.emote) ? body.emote : null,
      };
      entry = { ws: null, state: initialState, lastSeenAt: now };
      room.players.set(playerId, entry);
      broadcast(room, { type: 'player:join', player: initialState }, playerId);
    } else {
      entry.lastSeenAt = now;
      const s = entry.state;
      s.name = sanitizeName(body.name, s.name);
      if (typeof body.playerClass === 'string' && VALID_CLASSES.has(body.playerClass)) {
        s.playerClass = body.playerClass;
      }
      if (typeof body.gameMode === 'string' && VALID_GAME_MODES.has(body.gameMode)) {
        s.gameMode = body.gameMode as 'survival' | 'creative';
      }
      if (typeof body.x === 'number') s.x = clampNum(body.x, -800, 800, s.x);
      if (typeof body.y === 'number') s.y = clampNum(body.y, -20, 120, s.y);
      if (typeof body.z === 'number') s.z = clampNum(body.z, -800, 800, s.z);
      if (typeof body.yaw === 'number') s.yaw = clampNum(body.yaw, -Math.PI * 4, Math.PI * 4, s.yaw);
      if (typeof body.speed === 'number') s.speed = clampNum(body.speed, 0, 25, 0);
      if (typeof body.isSprinting === 'boolean') s.isSprinting = body.isSprinting;
      if (typeof body.isGrounded === 'boolean') s.isGrounded = body.isGrounded;
      if (typeof body.swinging === 'boolean') s.swinging = body.swinging;
      if (typeof body.weapon === 'string' && VALID_WEAPONS.has(body.weapon)) s.weapon = body.weapon;
      if (typeof body.armor === 'string' && VALID_ARMORS.has(body.armor)) s.armor = body.armor;
      if (body.emote === null || (typeof body.emote === 'string' && VALID_EMOTES.has(body.emote))) {
        s.emote = body.emote as string | null;
      }
      broadcast(room, { type: 'player:state', player: s }, playerId);
    }

    // Apply queued housing/plot actions from HTTP client
    if (Array.isArray(body.actions)) {
      for (const rawAct of body.actions.slice(0, 24)) {
        if (!rawAct || typeof rawAct !== 'object') continue;
        const act = rawAct as Record<string, unknown>;
        if (act.type === 'housing:upsert') {
          const tile = validateHousingPayload(act.tile, playerId);
          if (tile && (room.housing.has(tile.id) || room.housing.size < MAX_HOUSING_PER_ROOM)) {
            room.housing.set(tile.id, tile);
            broadcast(room, { type: 'housing:upsert', tile }, playerId);
          }
        } else if (act.type === 'housing:delete') {
          const id = sanitizeId(act.id);
          if (id && room.housing.has(id)) {
            room.housing.delete(id);
            broadcast(room, { type: 'housing:delete', id }, playerId);
          }
        } else if (act.type === 'housing:damage') {
          const id = sanitizeId(act.id);
          const existing = id ? room.housing.get(id) : undefined;
          if (id && existing) {
            const nextDur = clampNum(act.durability, 0, existing.maxDurability ?? 2000, existing.durability ?? 100);
            if (nextDur <= 0) {
              room.housing.delete(id);
              broadcast(room, { type: 'housing:delete', id, destroyed: true }, playerId);
            } else {
              existing.durability = nextDur;
              broadcast(room, { type: 'housing:damage', id, durability: nextDur }, playerId);
            }
          }
        } else if (act.type === 'plot:claim' && act.plot && typeof act.plot === 'object') {
          const p = act.plot as Record<string, unknown>;
          const id = sanitizeId(p.id);
          if (id && (room.plots.has(id) || room.plots.size < MAX_PLOTS_PER_ROOM)) {
            const sharedPlot: SharedLandPlot = {
              id,
              x: clampNum(p.x, -520, 520, 0),
              z: clampNum(p.z, -520, 520, 0),
              radius: clampNum(p.radius, 4, 24, 9.5),
              ownerId: playerId,
              ownerName: entry.state.name,
            };
            room.plots.set(id, sharedPlot);
            broadcast(room, { type: 'plot:claim', plot: sharedPlot }, playerId);
          }
        } else if (act.type === 'daily:progress') {
          const qId = typeof act.questId === 'string' ? act.questId : '';
          if (VALID_DAILY_QUEST_IDS.has(qId)) {
            ensureRoomDailyDate(room);
            const delta = Math.round(clampNum(act.delta, 1, 50, 1));
            const prevVal = room.dailyProgress[qId] ?? 0;
            room.dailyProgress[qId] = Math.min(999, prevVal + delta);
            room.dailyContributors[qId] = entry.state.name;
            broadcast(room, { type: 'daily:state', dailyQuests: getRoomDailyPayload(room) });
          }
        } else if (act.type === 'monster:spawn_egg') {
          const id = sanitizeId(act.id);
          const eggId = typeof act.eggId === 'string' ? act.eggId : '';
          if (id && VALID_SPAWN_EGG_IDS.has(eggId) && !room.spawnedMonsters.has(id)) {
            if (room.spawnedMonsters.size >= MAX_SPAWNED_MONSTERS_PER_ROOM) {
              const oldestKey = room.spawnedMonsters.keys().next().value;
              if (oldestKey) room.spawnedMonsters.delete(oldestKey);
            }
            const monster: SharedSpawnedMonster = {
              id,
              eggId,
              x: clampNum(act.x, -600, 600, 0),
              z: clampNum(act.z, -600, 600, 0),
              worldTier: Math.round(clampNum(act.worldTier, 1, 10, 1)),
              summonerName: entry.state.name,
            };
            room.spawnedMonsters.set(id, monster);
            broadcast(room, { type: 'monster:spawn_egg', monster }, playerId);
          }
        } else if (act.type === 'room:set_mode') {
          if (typeof act.gameMode === 'string' && VALID_GAME_MODES.has(act.gameMode)) {
            room.gameMode = act.gameMode as 'survival' | 'creative';
            room.gameModeLocked = true;
            entry.state.gameMode = room.gameMode;
            broadcast(room, { type: 'room:mode', gameMode: room.gameMode });
          }
        } else if (act.type === 'player:event') {
          const kind = typeof act.kind === 'string' ? act.kind : '';
          const label = sanitizeName(act.label, '');
          if (
            (kind === 'eat_food' || kind === 'daily_complete' || kind === 'boss_defeat') &&
            label.length > 0
          ) {
            broadcast(
              room,
              {
                type: 'player:event',
                kind,
                label: String(act.label).replace(/[\u0000-\u001F\u007F<>]/g, '').trim().slice(0, 60),
                playerName: entry.state.name,
              },
              playerId,
            );
          }
        }
      }
    }

    // Disconnect HTTP-only player explicitly if leaving
    if (body.leave === true) {
      room.players.delete(playerId);
      broadcast(room, { type: 'player:leave', id: playerId }, playerId);
      res.json({ ok: true });
      return;
    }

    res.json({
      playerId,
      roomId: room.id,
      roomGameMode: room.gameMode,
      playerName: entry.state.name,
      shareBaseUrl: SHARE_BASE_URL,
      players: Array.from(room.players.values())
        .filter((c) => c.state.id !== playerId)
        .map((c) => c.state),
      housing: Array.from(room.housing.values()),
      plots: Array.from(room.plots.values()),
      dailyQuests: getRoomDailyPayload(room),
      spawnedMonsters: Array.from(room.spawnedMonsters.values()),
    });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({
    server,
    path: '/ws',
    maxPayload: 32 * 1024,
  });

  // Periodic stale-room cleanup, HTTP-client timeout sweep & WebSocket heartbeat
  const aliveMap = new WeakMap<WebSocket, boolean>();
  const heartbeatInterval = setInterval(() => {
    for (const ws of wss.clients) {
      if (aliveMap.get(ws) === false) {
        ws.terminate();
        continue;
      }
      aliveMap.set(ws, false);
      ws.ping();
    }
    const now = Date.now();
    for (const [rid, room] of rooms) {
      // Sweep timed-out HTTP-polled players (>10s silent)
      for (const [pid, client] of room.players) {
        if (!client.ws && now - client.lastSeenAt > 10_000) {
          room.players.delete(pid);
          broadcast(room, { type: 'player:leave', id: pid });
        }
      }
      if (room.players.size === 0 && now - room.lastActivityAt > 1000 * 60 * 30) {
        rooms.delete(rid);
      }
    }
  }, 8_000);

  wss.on('close', () => clearInterval(heartbeatInterval));

  wss.on('connection', (ws, req) => {
    aliveMap.set(ws, true);
    ws.on('pong', () => aliveMap.set(ws, true));

    const url = new URL(req.url || '/ws', 'http://localhost');
    const roomId = sanitizeRoomId(url.searchParams.get('room'));
    const requestedMode = url.searchParams.get('mode');
    const fallbackName = `모험가 #${Math.floor(1000 + Math.random() * 8999)}`;
    const playerName = sanitizeName(url.searchParams.get('name'), fallbackName);
    const playerId = `p_${crypto.randomUUID().slice(0, 12)}`;

    const room = getOrCreateRoom(roomId, requestedMode);
    if (!room || room.players.size >= MAX_PLAYERS_PER_ROOM) {
      ws.close(1013, 'Room capacity reached');
      return;
    }
    const initialState: RemotePlayerState = {
      id: playerId,
      name: playerName,
      playerClass: 'warrior',
      gameMode: room.gameMode,
      x: 0,
      y: 0,
      z: 6.2,
      yaw: Math.PI,
      speed: 0,
      isSprinting: false,
      isGrounded: true,
      swinging: false,
      weapon: 'crystal_sword',
      armor: 'pioneer_denim',
      emote: null,
    };

    room.players.set(playerId, { ws, state: initialState, lastSeenAt: Date.now() });

    // Send full initial state to joining player
    ws.send(
      JSON.stringify({
        type: 'init',
        playerId,
        roomId: room.id,
        roomGameMode: room.gameMode,
        playerName,
        shareBaseUrl: SHARE_BASE_URL,
        players: Array.from(room.players.values())
          .filter((c) => c.state.id !== playerId)
          .map((c) => c.state),
        housing: Array.from(room.housing.values()),
        plots: Array.from(room.plots.values()),
        dailyQuests: getRoomDailyPayload(room),
        spawnedMonsters: Array.from(room.spawnedMonsters.values()),
      }),
    );

    // Notify everyone else in the room
    broadcast(room, { type: 'player:join', player: initialState }, playerId);

    let msgWindowStart = Date.now();
    let msgCountInWindow = 0;

    ws.on('message', (rawBuf) => {
      const now = Date.now();
      if (now - msgWindowStart >= 1000) {
        msgWindowStart = now;
        msgCountInWindow = 0;
      }
      msgCountInWindow++;
      if (msgCountInWindow > MAX_MSGS_PER_SECOND) return;

      room.lastActivityAt = now;
      let msg: Record<string, unknown>;
      try {
        const parsed = JSON.parse(rawBuf.toString('utf8'));
        if (!parsed || typeof parsed !== 'object') return;
        msg = parsed as Record<string, unknown>;
      } catch {
        return;
      }

      const type = msg.type;
      if (typeof type !== 'string') return;

      if (type === 'player:state') {
        const client = room.players.get(playerId);
        if (!client) return;
        const s = client.state;
        s.x = clampNum(msg.x, -800, 800, s.x);
        s.y = clampNum(msg.y, -20, 120, s.y);
        s.z = clampNum(msg.z, -800, 800, s.z);
        s.yaw = clampNum(msg.yaw, -Math.PI * 4, Math.PI * 4, s.yaw);
        s.speed = clampNum(msg.speed, 0, 25, 0);
        s.isSprinting = Boolean(msg.isSprinting);
        s.isGrounded = msg.isGrounded !== false;
        s.swinging = Boolean(msg.swinging);
        if (typeof msg.playerClass === 'string' && VALID_CLASSES.has(msg.playerClass)) {
          s.playerClass = msg.playerClass;
        }
        if (typeof msg.gameMode === 'string' && VALID_GAME_MODES.has(msg.gameMode)) {
          s.gameMode = msg.gameMode as 'survival' | 'creative';
        }
        if (typeof msg.weapon === 'string' && VALID_WEAPONS.has(msg.weapon)) {
          s.weapon = msg.weapon;
        }
        if (typeof msg.armor === 'string' && VALID_ARMORS.has(msg.armor)) {
          s.armor = msg.armor;
        }
        s.emote = typeof msg.emote === 'string' && VALID_EMOTES.has(msg.emote) ? msg.emote : null;
        if (typeof msg.name === 'string') {
          s.name = sanitizeName(msg.name, s.name);
        }
        broadcast(room, { type: 'player:state', player: s }, playerId);
        return;
      }

      if (type === 'player:rename') {
        const client = room.players.get(playerId);
        if (!client) return;
        client.state.name = sanitizeName(msg.name, client.state.name);
        broadcast(room, { type: 'player:state', player: client.state }, playerId);
        return;
      }

      if (type === 'housing:upsert') {
        const tile = validateHousingPayload(msg.tile, playerId);
        if (!tile) return;
        if (!room.housing.has(tile.id) && room.housing.size >= MAX_HOUSING_PER_ROOM) {
          return;
        }
        room.housing.set(tile.id, tile);
        broadcast(room, { type: 'housing:upsert', tile }, playerId);
        return;
      }

      if (type === 'housing:delete') {
        const id = sanitizeId(msg.id);
        if (!id || !room.housing.has(id)) return;
        room.housing.delete(id);
        broadcast(room, { type: 'housing:delete', id }, playerId);
        return;
      }

      if (type === 'housing:damage') {
        const id = sanitizeId(msg.id);
        if (!id) return;
        const existing = room.housing.get(id);
        if (!existing) return;
        const nextDur = clampNum(msg.durability, 0, existing.maxDurability ?? 2000, existing.durability ?? 100);
        if (nextDur <= 0) {
          room.housing.delete(id);
          broadcast(room, { type: 'housing:delete', id, destroyed: true }, playerId);
        } else {
          existing.durability = nextDur;
          broadcast(room, { type: 'housing:damage', id, durability: nextDur }, playerId);
        }
        return;
      }

      if (type === 'plot:claim') {
        if (!msg.plot || typeof msg.plot !== 'object') return;
        const p = msg.plot as Record<string, unknown>;
        const id = sanitizeId(p.id);
        if (!id) return;
        if (!room.plots.has(id) && room.plots.size >= MAX_PLOTS_PER_ROOM) return;
        const client = room.players.get(playerId);
        const sharedPlot: SharedLandPlot = {
          id,
          x: clampNum(p.x, -520, 520, 0),
          z: clampNum(p.z, -520, 520, 0),
          radius: clampNum(p.radius, 4, 24, 9.5),
          ownerId: playerId,
          ownerName: client?.state.name || playerName,
        };
        room.plots.set(id, sharedPlot);
        broadcast(room, { type: 'plot:claim', plot: sharedPlot }, playerId);
        return;
      }

      if (type === 'daily:progress') {
        const qId = typeof msg.questId === 'string' ? msg.questId : '';
        if (!VALID_DAILY_QUEST_IDS.has(qId)) return;
        ensureRoomDailyDate(room);
        const delta = Math.round(clampNum(msg.delta, 1, 50, 1));
        const client = room.players.get(playerId);
        const prevVal = room.dailyProgress[qId] ?? 0;
        room.dailyProgress[qId] = Math.min(999, prevVal + delta);
        room.dailyContributors[qId] = client?.state.name || playerName;
        broadcast(room, { type: 'daily:state', dailyQuests: getRoomDailyPayload(room) });
        return;
      }

      if (type === 'monster:spawn_egg') {
        const id = sanitizeId(msg.id);
        const eggId = typeof msg.eggId === 'string' ? msg.eggId : '';
        if (!id || !VALID_SPAWN_EGG_IDS.has(eggId) || room.spawnedMonsters.has(id)) return;
        if (room.spawnedMonsters.size >= MAX_SPAWNED_MONSTERS_PER_ROOM) {
          const oldestKey = room.spawnedMonsters.keys().next().value;
          if (oldestKey) room.spawnedMonsters.delete(oldestKey);
        }
        const client = room.players.get(playerId);
        const monster: SharedSpawnedMonster = {
          id,
          eggId,
          x: clampNum(msg.x, -600, 600, 0),
          z: clampNum(msg.z, -600, 600, 0),
          worldTier: Math.round(clampNum(msg.worldTier, 1, 10, 1)),
          summonerName: client?.state.name || playerName,
        };
        room.spawnedMonsters.set(id, monster);
        broadcast(room, { type: 'monster:spawn_egg', monster }, playerId);
        return;
      }

      if (type === 'room:set_mode') {
        if (typeof msg.gameMode !== 'string' || !VALID_GAME_MODES.has(msg.gameMode)) return;
        room.gameMode = msg.gameMode as 'survival' | 'creative';
        room.gameModeLocked = true;
        const client = room.players.get(playerId);
        if (client) client.state.gameMode = room.gameMode;
        broadcast(room, { type: 'room:mode', gameMode: room.gameMode });
        return;
      }

      if (type === 'player:event') {
        const kind = typeof msg.kind === 'string' ? msg.kind : '';
        const rawLabel = typeof msg.label === 'string' ? msg.label : '';
        const label = rawLabel.replace(/[\u0000-\u001F\u007F<>]/g, '').trim().slice(0, 60);
        if (
          (kind === 'eat_food' || kind === 'daily_complete' || kind === 'boss_defeat') &&
          label.length > 0
        ) {
          const client = room.players.get(playerId);
          broadcast(
            room,
            {
              type: 'player:event',
              kind,
              label,
              playerName: client?.state.name || playerName,
            },
            playerId,
          );
        }
      }
    });

    ws.on('close', () => {
      room.players.delete(playerId);
      room.lastActivityAt = Date.now();
      broadcast(room, { type: 'player:leave', id: playerId });
    });
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      // Pre-compress JS/CSS/HTML in memory with Brotli + Gzip for zero-latency shared-link delivery
      const staticCache = new Map<
        string,
        { raw: Buffer; br: Buffer; gz: Buffer; contentType: string; etag: string }
      >();
      const getMime = (file: string): string | null => {
        if (file.endsWith('.js') || file.endsWith('.mjs')) return 'application/javascript; charset=utf-8';
        if (file.endsWith('.css')) return 'text/css; charset=utf-8';
        if (file.endsWith('.html')) return 'text/html; charset=utf-8';
        if (file.endsWith('.svg')) return 'image/svg+xml';
        if (file.endsWith('.json')) return 'application/json; charset=utf-8';
        return null;
      };
      const cacheFile = (urlPath: string, fullPath: string) => {
        const contentType = getMime(fullPath);
        if (!contentType) return;
        try {
          const raw = fs.readFileSync(fullPath);
          const br = zlib.brotliCompressSync(raw, {
            params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 },
          });
          const gz = zlib.gzipSync(raw, { level: 6 });
          const etag = `"${crypto.createHash('md5').update(raw).digest('hex').slice(0, 16)}"`;
          staticCache.set(urlPath, { raw, br, gz, contentType, etag });
        } catch {
          // fallback to express.static
        }
      };

      cacheFile('/index.html', path.join(distDir, 'index.html'));
      const assetsDir = path.join(distDir, 'assets');
      if (fs.existsSync(assetsDir)) {
        for (const f of fs.readdirSync(assetsDir)) {
          cacheFile(`/assets/${f}`, path.join(assetsDir, f));
        }
      }

      app.use((req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();
        const key = req.path === '/' ? '/index.html' : req.path;
        const entry = staticCache.get(key);
        if (!entry) return next();
        if (req.headers['if-none-match'] === entry.etag) {
          res.status(304).end();
          return;
        }
        const accept = String(req.headers['accept-encoding'] || '');
        res.setHeader('Content-Type', entry.contentType);
        res.setHeader('ETag', entry.etag);
        res.setHeader('Vary', 'Accept-Encoding');
        res.setHeader(
          'Cache-Control',
          key.startsWith('/assets/') ? 'public, max-age=2592000, immutable' : 'no-cache',
        );
        if (accept.includes('br')) {
          res.setHeader('Content-Encoding', 'br');
          res.setHeader('Content-Length', String(entry.br.length));
          res.end(req.method === 'HEAD' ? undefined : entry.br);
        } else if (accept.includes('gzip')) {
          res.setHeader('Content-Encoding', 'gzip');
          res.setHeader('Content-Length', String(entry.gz.length));
          res.end(req.method === 'HEAD' ? undefined : entry.gz);
        } else {
          res.setHeader('Content-Length', String(entry.raw.length));
          res.end(req.method === 'HEAD' ? undefined : entry.raw);
        }
      });

      app.use(
        '/assets',
        express.static(path.join(distDir, 'assets'), {
          maxAge: '30d',
          immutable: true,
        }),
      );
      app.use(
        express.static(distDir, {
          maxAge: '1h',
          setHeaders: (res, filePath) => {
            if (filePath.endsWith('index.html')) {
              res.setHeader('Cache-Control', 'no-cache');
            }
          },
        }),
      );
      app.get('*', (_req, res) => {
        const entry = staticCache.get('/index.html');
        if (entry) {
          const accept = String(_req.headers['accept-encoding'] || '');
          res.setHeader('Content-Type', entry.contentType);
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Vary', 'Accept-Encoding');
          if (accept.includes('br')) {
            res.setHeader('Content-Encoding', 'br');
            res.end(entry.br);
            return;
          }
          if (accept.includes('gzip')) {
            res.setHeader('Content-Encoding', 'gzip');
            res.end(entry.gz);
            return;
          }
          res.end(entry.raw);
          return;
        }
        res.setHeader('Cache-Control', 'no-cache');
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[ArchePaw Server] Listening on http://0.0.0.0:${PORT} (${IS_PROD ? 'prod' : 'dev'})`);
  });
}

startServer().catch((err) => {
  console.error('[ArchePaw Server] Failed to start:', err);
  process.exit(1);
});
