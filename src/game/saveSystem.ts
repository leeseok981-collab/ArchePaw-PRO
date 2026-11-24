import {
  ArmorId,
  DailyQuestId,
  FoodId,
  GameMode,
  HotbarItemId,
  HousingColorId,
  HousingEdge,
  HousingKind,
  HousingMaterial,
  Inventory,
  PlayerClassId,
  PlayerUpgrades,
  ProficiencyId,
  ProficiencyState,
  QuestId,
  SaveMetaSummary,
  WarriorSkillId,
  WeaponId,
  WeatherKind,
  WorldRecord,
} from './types';

export const SAVE_STORAGE_KEY = 'archepaw_world_save_v1';
export const WORLDS_INDEX_KEY = 'archepaw_worlds_list_v1';
export const WORLD_SAVE_PREFIX = 'archepaw_world_data_v1_';
export const DAILY_QUESTS_STORAGE_KEY = 'archepaw_daily_quests_v1';

export interface DailyQuestSaveState {
  dateKey: string;
  progress: Partial<Record<DailyQuestId, number>>;
  claimed: DailyQuestId[];
  allClearClaimed: boolean;
}

export function getTodayDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function createEmptyDailyQuestState(dateKey = getTodayDateKey()): DailyQuestSaveState {
  return {
    dateKey,
    progress: {},
    claimed: [],
    allClearClaimed: false,
  };
}

export function loadDailyQuestState(): DailyQuestSaveState {
  const today = getTodayDateKey();
  try {
    const raw = window.localStorage.getItem(DAILY_QUESTS_STORAGE_KEY);
    if (!raw) return createEmptyDailyQuestState(today);
    const parsed = JSON.parse(raw) as Partial<DailyQuestSaveState>;
    if (!parsed || parsed.dateKey !== today) {
      return createEmptyDailyQuestState(today);
    }
    return {
      dateKey: today,
      progress: parsed.progress && typeof parsed.progress === 'object' ? { ...parsed.progress } : {},
      claimed: Array.isArray(parsed.claimed) ? [...parsed.claimed] : [],
      allClearClaimed: Boolean(parsed.allClearClaimed),
    };
  } catch {
    return createEmptyDailyQuestState(today);
  }
}

export function saveDailyQuestState(state: DailyQuestSaveState): void {
  try {
    window.localStorage.setItem(DAILY_QUESTS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage quota errors
  }
}

export interface SavedHousingItem {
  id: string;
  kind: HousingKind;
  material: HousingMaterial;
  color?: HousingColorId;
  gx: number;
  gz: number;
  level: number;
  edge: HousingEdge | null;
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
  ownerId?: string;
}

export interface SavedLandPlot {
  id: string;
  x: number;
  z: number;
  radius: number;
}

export interface SavedLanternItem {
  x: number;
  z: number;
  rotationY: number;
}

export interface SavedSaplingItem {
  kind: 'oak_tree' | 'pine_tree' | 'birch_tree';
  x: number;
  z: number;
  tier: number;
  scale: number;
  isDepleted: boolean;
  regrowTimer: number;
}

export interface GameSaveData {
  version: 2;
  savedAt: number;
  worldId?: string;
  worldName?: string;
  gameMode?: GameMode;
  isMultiplayer?: boolean;
  roomCode?: string;
  worldTier: number;
  playerClass?: PlayerClassId;
  player: {
    x: number;
    z: number;
    yaw: number;
    hp: number;
    stamina: number;
    hunger?: number;
    selectedFood?: FoodId;
    level: number;
    exp: number;
    nextExp: number;
  };
  inventory: Inventory;
  upgrades: PlayerUpgrades;
  ownedWeapons: WeaponId[];
  equippedWeapon: WeaponId;
  ownedArmors: ArmorId[];
  equippedArmor: ArmorId;
  autoEquipTool: boolean;
  hotbarSlots: HotbarItemId[];
  stats: {
    harvestedTotal: number;
    plantedSaplings: number;
    woodGathered: number;
    stoneGathered: number;
    ironGathered: number;
    leatherGathered: number;
    monstersDefeated: number;
    bossesDefeated?: number;
    trialTowerMaxFloor?: number;
    observedNightWildlife: boolean;
  };
  skillMastery?: {
    points: number;
    ranks: Record<WarriorSkillId, number>;
  };
  proficiencies?: Record<ProficiencyId, ProficiencyState>;
  claimedQuests: QuestId[];
  dailyQuests?: DailyQuestSaveState;
  environment: {
    timeOfDay: number;
    timePaused: boolean;
    weather: WeatherKind;
    autoWeather: boolean;
    bgmEnabled: boolean;
  };
  housing: SavedHousingItem[];
  claimedPlots?: SavedLandPlot[];
  suppressedResourceIds?: string[];
  lanterns: SavedLanternItem[];
  saplings: SavedSaplingItem[];
}

const VALID_HOUSING_KINDS: HousingKind[] = [
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
];

const VALID_HOUSING_MATERIALS: HousingMaterial[] = ['wood', 'stone', 'half_timber', 'iron_fort'];

export const VALID_HOUSING_COLORS: HousingColorId[] = [
  'natural',
  'ivory',
  'terracotta',
  'cedar',
  'sage',
  'cobalt',
  'charcoal',
  'ochre',
];

export function isValidSavedTile(item: unknown): item is SavedHousingItem {
  if (!item || typeof item !== 'object') return false;
  const o = item as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    VALID_HOUSING_KINDS.includes(o.kind as HousingKind) &&
    VALID_HOUSING_MATERIALS.includes(o.material as HousingMaterial) &&
    typeof o.gx === 'number' &&
    typeof o.gz === 'number' &&
    typeof o.level === 'number' &&
    typeof o.rotationStep === 'number' &&
    typeof o.baseY === 'number'
  );
}

export function isValidSaveData(raw: unknown): raw is GameSaveData {
  if (!raw || typeof raw !== 'object') return false;
  const obj = raw as Record<string, unknown>;
  if (obj.version !== 2 && obj.version !== 1) return false;
  if (typeof obj.savedAt !== 'number') return false;
  if (typeof obj.worldTier !== 'number' || obj.worldTier < 1 || obj.worldTier > 10) return false;
  if (!obj.player || typeof obj.player !== 'object') return false;
  if (!obj.inventory || typeof obj.inventory !== 'object') return false;
  if (!Array.isArray(obj.housing)) return false;
  return true;
}

export function saveGameToStorage(data: GameSaveData): boolean {
  try {
    window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadGameFromStorage(): GameSaveData | null {
  try {
    const raw = window.localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidSaveData(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearSavedGame(): void {
  try {
    window.localStorage.removeItem(SAVE_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}

export function getSaveSummary(): SaveMetaSummary | null {
  const data = loadGameFromStorage();
  if (!data) return null;
  return {
    savedAt: data.savedAt,
    worldTier: data.worldTier,
    level: data.player.level,
    housingCount: data.housing.length,
    playerClass: data.playerClass || 'warrior',
  };
}

export function formatSavedTime(timestamp: number | null): string {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export function formatSavedDateTime(timestamp: number | null): string {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${mo}/${da} ${hh}:${mm}`;
}

export function generateRandomRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `PAW-${suffix}`;
}

export function loadWorldList(): WorldRecord[] {
  try {
    const raw = window.localStorage.getItem(WORLDS_INDEX_KEY);
    let list: WorldRecord[] = [];
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        list = parsed.filter(
          (w): w is WorldRecord =>
            Boolean(w) &&
            typeof w === 'object' &&
            typeof (w as WorldRecord).id === 'string' &&
            typeof (w as WorldRecord).name === 'string',
        );
      }
    }

    // One-time seamless migration if a legacy single-slot save exists and world list is empty
    if (list.length === 0) {
      const legacy = loadGameFromStorage();
      if (legacy) {
        const migrated: WorldRecord = {
          id: 'legacy_world_1',
          name: legacy.worldName || '기존 아키포우 월드',
          gameMode: legacy.gameMode === 'creative' ? 'creative' : 'survival',
          isMultiplayer: Boolean(legacy.isMultiplayer),
          roomCode: legacy.roomCode || 'main',
          playerClass: legacy.playerClass || 'warrior',
          worldTier: legacy.worldTier || 1,
          level: legacy.player?.level || 1,
          housingCount: Array.isArray(legacy.housing) ? legacy.housing.length : 0,
          createdAt: legacy.savedAt || Date.now(),
          lastPlayedAt: legacy.savedAt || Date.now(),
        };
        list = [migrated];
        saveWorldList(list);
        window.localStorage.setItem(`${WORLD_SAVE_PREFIX}${migrated.id}`, JSON.stringify(legacy));
      }
    }

    return list.sort((a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0));
  } catch {
    return [];
  }
}

export function saveWorldList(worlds: WorldRecord[]): void {
  try {
    window.localStorage.setItem(WORLDS_INDEX_KEY, JSON.stringify(worlds.slice(0, 40)));
  } catch {
    // ignore storage errors
  }
}

export function createWorldRecord(params: {
  name: string;
  gameMode: GameMode;
  isMultiplayer: boolean;
  roomCode: string;
  playerClass: PlayerClassId;
}): WorldRecord {
  const now = Date.now();
  const cleanName = params.name.trim().slice(0, 28) || '새로운 아키포우 월드';
  const cleanCode = params.isMultiplayer
    ? params.roomCode
        .trim()
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .slice(0, 24) || generateRandomRoomCode()
    : '';
  const record: WorldRecord = {
    id: `world_${now}_${Math.floor(Math.random() * 9000 + 1000)}`,
    name: cleanName,
    gameMode: params.gameMode,
    isMultiplayer: params.isMultiplayer,
    roomCode: cleanCode,
    playerClass: params.playerClass,
    worldTier: 1,
    level: 1,
    housingCount: 0,
    createdAt: now,
    lastPlayedAt: now,
  };
  const existing = loadWorldList();
  saveWorldList([record, ...existing]);
  return record;
}

export function saveWorldData(worldId: string, data: GameSaveData): boolean {
  try {
    window.localStorage.setItem(`${WORLD_SAVE_PREFIX}${worldId}`, JSON.stringify(data));
    // Also update legacy slot for backward compatibility
    window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(data));
    const list = loadWorldList();
    const idx = list.findIndex((w) => w.id === worldId);
    if (idx >= 0) {
      const updated: WorldRecord = {
        ...list[idx],
        name: data.worldName || list[idx].name,
        gameMode: data.gameMode || list[idx].gameMode,
        isMultiplayer: data.isMultiplayer ?? list[idx].isMultiplayer,
        roomCode: data.roomCode ?? list[idx].roomCode,
        playerClass: data.playerClass || list[idx].playerClass,
        worldTier: data.worldTier,
        level: data.player.level,
        housingCount: data.housing.length,
        lastPlayedAt: data.savedAt,
      };
      const next = [updated, ...list.filter((w) => w.id !== worldId)];
      saveWorldList(next);
    }
    return true;
  } catch {
    return false;
  }
}

export function loadWorldData(worldId: string): GameSaveData | null {
  try {
    const raw = window.localStorage.getItem(`${WORLD_SAVE_PREFIX}${worldId}`);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidSaveData(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function deleteWorldEntry(worldId: string): WorldRecord[] {
  try {
    window.localStorage.removeItem(`${WORLD_SAVE_PREFIX}${worldId}`);
  } catch {
    // ignore
  }
  const next = loadWorldList().filter((w) => w.id !== worldId);
  saveWorldList(next);
  return next;
}
