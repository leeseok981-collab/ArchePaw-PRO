import { ArmorId, EmoteId, PlayerClassId, WeaponId } from './types';
import { SavedHousingItem, SavedLandPlot } from './saveSystem';

export type SharedHousingPayload = SavedHousingItem;
export type SharedPlotPayload = SavedLandPlot;

export interface RemotePlayerPayload {
  id: string;
  name: string;
  playerClass?: PlayerClassId;
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
  isSprinting: boolean;
  isGrounded: boolean;
  swinging: boolean;
  weapon: WeaponId;
  armor: ArmorId;
  emote: EmoteId | null;
}

export type MultiplayerTransport = 'ws' | 'http' | 'offline';

export interface MultiplayerCallbacks {
  onStatusChange: (
    connected: boolean,
    roomId: string,
    playerId: string | null,
    playerName: string,
    transport?: MultiplayerTransport,
    serverHost?: string,
  ) => void;
  onInitRoom: (payload: {
    playerId: string;
    roomId: string;
    playerName: string;
    players: RemotePlayerPayload[];
    housing: SavedHousingItem[];
    plots: SavedLandPlot[];
  }) => void;
  onPlayerJoin: (player: RemotePlayerPayload) => void;
  onPlayerState: (player: RemotePlayerPayload) => void;
  onPlayerLeave: (playerId: string) => void;
  onHousingUpsert: (tile: SavedHousingItem) => void;
  onHousingDelete: (id: string, destroyed?: boolean) => void;
  onHousingDamage: (id: string, durability: number) => void;
  onPlotClaim: (plot: SavedLandPlot) => void;
}

const NAME_STORAGE_KEY = 'archepaw_player_name_v1';

function resolveRoomIdFromUrl(): string {
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('room');
    if (raw && /^[a-zA-Z0-9_-]{1,28}$/.test(raw)) {
      return raw;
    }
  } catch {
    // ignore URL parse errors
  }
  return 'main';
}

function loadOrCreatePlayerName(): string {
  try {
    const saved = window.localStorage.getItem(NAME_STORAGE_KEY);
    if (saved && saved.trim().length > 0) return saved.trim().slice(0, 16);
  } catch {
    // ignore storage access errors
  }
  const generated = `냥기사 #${Math.floor(1000 + Math.random() * 8999)}`;
  try {
    window.localStorage.setItem(NAME_STORAGE_KEY, generated);
  } catch {
    // ignore
  }
  return generated;
}

/**
 * Converts a private builder preview host (`ais-dev-*`) to the public Shared App host (`ais-pre-*`)
 * so BOTH the host in AI Studio preview and external PC/mobile visitors connect to the EXACT SAME
 * canonical multiplayer server instead of separate isolated server processes.
 */
function normalizeShareOrigin(rawOrigin: string): string {
  try {
    const u = new URL(rawOrigin);
    if (u.hostname.startsWith('ais-dev-')) {
      u.hostname = 'ais-pre-' + u.hostname.slice('ais-dev-'.length);
    }
    return u.origin;
  } catch {
    return window.location.origin;
  }
}

/**
 * Real-time multiplayer client with:
 * 1. Canonical Shared Server routing (`ais-pre-*`) so `ais-dev-*` and external/mobile `ais-pre-*`
 *    visitors join the EXACT SAME server & room.
 * 2. Automatic WebSocket primary transport + CORS-enabled HTTP delta sync fallback for strict
 *    mobile carriers or reverse proxies where WS upgrades may fail.
 */
export class MultiplayerClient {
  private ws: WebSocket | null = null;
  private wsConnectTimeout: number | null = null;
  private reconnectTimer: number | null = null;
  private httpPollTimer: number | null = null;
  private reconnectDelayMs = 1200;
  private disposed = false;
  private connected = false;
  private transport: MultiplayerTransport = 'offline';
  private activeOrigin: string;
  private triedCanonical = false;

  public roomId: string;
  public playerId: string | null = null;
  public playerName: string;
  private shareBaseUrl: string | null = null;
  private callbacks: MultiplayerCallbacks;

  // HTTP fallback state tracking
  private lastLocalState: Omit<RemotePlayerPayload, 'id' | 'name'> | null = null;
  private pendingActions: Array<Record<string, unknown>> = [];
  private httpInitialized = false;
  private knownHttpPlayerIds = new Set<string>();
  private knownHttpHousingSigs = new Map<string, string>();
  private knownHttpPlotIds = new Set<string>();

  constructor(callbacks: MultiplayerCallbacks) {
    this.callbacks = callbacks;
    this.roomId = resolveRoomIdFromUrl();
    this.playerName = loadOrCreatePlayerName();
    this.activeOrigin = normalizeShareOrigin(window.location.origin);
    this.fetchShareBaseUrl();
  }

  private fetchShareBaseUrl(): void {
    // Skip extra HTTP round-trip if we are already loaded on the canonical public shared host
    if (window.location.hostname.startsWith('ais-pre-')) {
      this.shareBaseUrl = window.location.origin;
      return;
    }
    fetch('/api/share-config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { shareBaseUrl?: string | null } | null) => {
        if (data && typeof data.shareBaseUrl === 'string' && data.shareBaseUrl.length > 0) {
          const canonical = normalizeShareOrigin(data.shareBaseUrl);
          this.shareBaseUrl = canonical;
          if (!this.disposed && canonical !== this.activeOrigin && !this.connected) {
            this.activeOrigin = canonical;
            this.connect();
          }
        }
      })
      .catch(() => {
        // Fallback to normalized window.location.origin
      });
  }

  private getCandidateOrigin(): string {
    const canonical = normalizeShareOrigin(this.shareBaseUrl || window.location.origin);
    // Always prefer canonical shared origin (ais-pre-*) first so ais-dev & external guests share 1 server!
    if (!this.triedCanonical) {
      return canonical;
    }
    return window.location.origin;
  }

  public connect(): void {
    if (this.disposed) return;
    this.cleanupTransports();

    const targetOrigin = this.getCandidateOrigin();
    this.activeOrigin = targetOrigin;

    let wsUrl: string;
    try {
      const u = new URL(targetOrigin);
      const wsProto = u.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${wsProto}//${u.host}/ws?room=${encodeURIComponent(this.roomId)}&name=${encodeURIComponent(this.playerName)}`;
    } catch {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${proto}//${window.location.host}/ws?room=${encodeURIComponent(this.roomId)}&name=${encodeURIComponent(this.playerName)}`;
    }

    let opened = false;
    try {
      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      // Fast 1.1s WebSocket->HTTP fallback so shared-link visitors sync immediately even on strict proxies
      this.wsConnectTimeout = window.setTimeout(() => {
        this.wsConnectTimeout = null;
        if (!opened && !this.disposed) {
          try {
            ws.close();
          } catch {
            // ignore
          }
          this.startHttpFallback(targetOrigin);
        }
      }, 1100);

      ws.onopen = () => {
        if (this.disposed) {
          ws.close();
          return;
        }
        opened = true;
        if (this.wsConnectTimeout !== null) {
          window.clearTimeout(this.wsConnectTimeout);
          this.wsConnectTimeout = null;
        }
        this.connected = true;
        this.transport = 'ws';
        this.reconnectDelayMs = 1200;
        this.emitStatus();
      };

      ws.onmessage = (event) => {
        if (this.disposed || typeof event.data !== 'string') return;
        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(event.data) as Record<string, unknown>;
        } catch {
          return;
        }

        switch (msg.type) {
          case 'init': {
            this.playerId = typeof msg.playerId === 'string' ? msg.playerId : null;
            if (typeof msg.roomId === 'string') this.roomId = msg.roomId;
            if (typeof msg.playerName === 'string') this.playerName = msg.playerName;
            if (typeof msg.shareBaseUrl === 'string' && msg.shareBaseUrl.length > 0) {
              this.shareBaseUrl = normalizeShareOrigin(msg.shareBaseUrl);
            }
            this.emitStatus();
            this.callbacks.onInitRoom({
              playerId: this.playerId || '',
              roomId: this.roomId,
              playerName: this.playerName,
              players: Array.isArray(msg.players) ? (msg.players as RemotePlayerPayload[]) : [],
              housing: Array.isArray(msg.housing) ? (msg.housing as SavedHousingItem[]) : [],
              plots: Array.isArray(msg.plots) ? (msg.plots as SavedLandPlot[]) : [],
            });
            break;
          }
          case 'player:join':
            if (msg.player) this.callbacks.onPlayerJoin(msg.player as RemotePlayerPayload);
            break;
          case 'player:state':
            if (msg.player) this.callbacks.onPlayerState(msg.player as RemotePlayerPayload);
            break;
          case 'player:leave':
            if (typeof msg.id === 'string') this.callbacks.onPlayerLeave(msg.id);
            break;
          case 'housing:upsert':
            if (msg.tile) this.callbacks.onHousingUpsert(msg.tile as SavedHousingItem);
            break;
          case 'housing:delete':
            if (typeof msg.id === 'string') {
              this.callbacks.onHousingDelete(msg.id, Boolean(msg.destroyed));
            }
            break;
          case 'housing:damage':
            if (typeof msg.id === 'string' && typeof msg.durability === 'number') {
              this.callbacks.onHousingDamage(msg.id, msg.durability);
            }
            break;
          case 'plot:claim':
            if (msg.plot) this.callbacks.onPlotClaim(msg.plot as SavedLandPlot);
            break;
        }
      };

      ws.onclose = () => {
        if (this.wsConnectTimeout !== null) {
          window.clearTimeout(this.wsConnectTimeout);
          this.wsConnectTimeout = null;
        }
        if (this.transport === 'http') return; // already switched to HTTP fallback
        const wasOpen = opened;
        this.connected = false;
        this.transport = 'offline';
        this.emitStatus();
        if (!this.disposed) {
          if (!wasOpen) {
            // Immediate HTTP fallback on the same canonical host before giving up on canonical host
            this.startHttpFallback(targetOrigin);
          } else {
            this.scheduleReconnect();
          }
        }
      };

      ws.onerror = () => {
        // handled by onclose / timeout
      };
    } catch {
      this.startHttpFallback(targetOrigin);
    }
  }

  private startHttpFallback(origin: string): void {
    if (this.disposed) return;
    this.cleanupTransports();
    this.activeOrigin = origin;
    this.httpInitialized = false;
    this.knownHttpPlayerIds.clear();
    this.knownHttpHousingSigs.clear();
    this.knownHttpPlotIds.clear();

    let consecutiveFailures = 0;

    const pollOnce = async () => {
      if (this.disposed) return;
      const actionsToSend = this.pendingActions.splice(0, 24);
      const body: Record<string, unknown> = {
        playerId: this.playerId,
        name: this.playerName,
        ...(this.lastLocalState || {}),
        actions: actionsToSend.length > 0 ? actionsToSend : undefined,
      };
      try {
        const res = await fetch(
          `${origin}/api/rooms/${encodeURIComponent(this.roomId)}/sync`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          playerId?: string;
          roomId?: string;
          playerName?: string;
          shareBaseUrl?: string | null;
          players?: RemotePlayerPayload[];
          housing?: SavedHousingItem[];
          plots?: SavedLandPlot[];
        };
        if (this.disposed) return;

        consecutiveFailures = 0;
        this.connected = true;
        this.transport = 'http';
        if (typeof data.playerId === 'string') this.playerId = data.playerId;
        if (typeof data.roomId === 'string') this.roomId = data.roomId;
        if (typeof data.shareBaseUrl === 'string' && data.shareBaseUrl.length > 0) {
          this.shareBaseUrl = normalizeShareOrigin(data.shareBaseUrl);
        }
        this.emitStatus();

        const players = Array.isArray(data.players) ? data.players : [];
        const housing = Array.isArray(data.housing) ? data.housing : [];
        const plots = Array.isArray(data.plots) ? data.plots : [];

        if (!this.httpInitialized) {
          this.httpInitialized = true;
          for (const p of players) this.knownHttpPlayerIds.add(p.id);
          for (const h of housing) {
            this.knownHttpHousingSigs.set(h.id, `${h.material}:${h.color}:${h.durability ?? ''}:${h.isDoorOpen ?? ''}`);
          }
          for (const pl of plots) this.knownHttpPlotIds.add(pl.id);
          this.callbacks.onInitRoom({
            playerId: this.playerId || '',
            roomId: this.roomId,
            playerName: this.playerName,
            players,
            housing,
            plots,
          });
        } else {
          // Diff players
          const currentPids = new Set<string>();
          for (const p of players) {
            currentPids.add(p.id);
            if (!this.knownHttpPlayerIds.has(p.id)) {
              this.knownHttpPlayerIds.add(p.id);
              this.callbacks.onPlayerJoin(p);
            } else {
              this.callbacks.onPlayerState(p);
            }
          }
          for (const oldPid of Array.from(this.knownHttpPlayerIds)) {
            if (!currentPids.has(oldPid)) {
              this.knownHttpPlayerIds.delete(oldPid);
              this.callbacks.onPlayerLeave(oldPid);
            }
          }

          // Diff housing
          const currentHids = new Set<string>();
          for (const h of housing) {
            currentHids.add(h.id);
            const sig = `${h.material}:${h.color}:${h.durability ?? ''}:${h.isDoorOpen ?? ''}:${h.gx}:${h.gz}:${h.level}`;
            if (this.knownHttpHousingSigs.get(h.id) !== sig) {
              this.knownHttpHousingSigs.set(h.id, sig);
              this.callbacks.onHousingUpsert(h);
            }
          }
          for (const oldHid of Array.from(this.knownHttpHousingSigs.keys())) {
            if (!currentHids.has(oldHid)) {
              this.knownHttpHousingSigs.delete(oldHid);
              this.callbacks.onHousingDelete(oldHid, false);
            }
          }

          // Diff plots
          for (const pl of plots) {
            if (!this.knownHttpPlotIds.has(pl.id)) {
              this.knownHttpPlotIds.add(pl.id);
              this.callbacks.onPlotClaim(pl);
            }
          }
        }
      } catch {
        // Put unsent actions back if transient
        if (actionsToSend.length > 0 && this.pendingActions.length < 40) {
          this.pendingActions.unshift(...actionsToSend);
        }
        consecutiveFailures++;
        if (consecutiveFailures >= 3) {
          this.connected = false;
          this.transport = 'offline';
          this.emitStatus();
          // If canonical host was unreachable, flip to window.location.origin and reconnect
          this.triedCanonical = !this.triedCanonical;
          this.cleanupTransports();
          this.scheduleReconnect();
          return;
        }
      }

      if (!this.disposed) {
        this.httpPollTimer = window.setTimeout(pollOnce, 220);
      }
    };

    pollOnce();
  }

  private emitStatus(): void {
    let hostLabel = '';
    try {
      hostLabel = new URL(this.activeOrigin).hostname;
    } catch {
      hostLabel = window.location.hostname;
    }
    this.callbacks.onStatusChange(
      this.connected,
      this.roomId,
      this.playerId,
      this.playerName,
      this.transport,
      hostLabel,
    );
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null || this.disposed) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectDelayMs = Math.min(4500, Math.round(this.reconnectDelayMs * 1.4));
      this.connect();
    }, this.reconnectDelayMs);
  }

  private cleanupTransports(): void {
    if (this.wsConnectTimeout !== null) {
      window.clearTimeout(this.wsConnectTimeout);
      this.wsConnectTimeout = null;
    }
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.httpPollTimer !== null) {
      window.clearTimeout(this.httpPollTimer);
      this.httpPollTimer = null;
    }
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
  }

  public isConnected(): boolean {
    if (this.transport === 'http') return this.connected;
    return this.connected && this.ws?.readyState === WebSocket.OPEN;
  }

  public getShareUrl(): string {
    const base = normalizeShareOrigin(this.shareBaseUrl || window.location.origin);
    return `${base}/?room=${encodeURIComponent(this.roomId)}`;
  }

  public joinRoom(nextRoomId: string): void {
    const cleaned = nextRoomId.trim().slice(0, 28);
    if (!cleaned || !/^[a-zA-Z0-9_-]{1,28}$/.test(cleaned)) return;
    if (cleaned === this.roomId && this.connected) return;
    this.roomId = cleaned;
    this.playerId = null;
    this.triedCanonical = false;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('room', cleaned);
      window.history.replaceState({}, '', url.toString());
    } catch {
      // ignore history update in restricted iframe
    }
    this.connect();
  }

  public setPlayerName(nextName: string): void {
    const cleaned = nextName.replace(/[\u0000-\u001F\u007F<>]/g, '').trim().slice(0, 16);
    if (!cleaned) return;
    this.playerName = cleaned;
    try {
      window.localStorage.setItem(NAME_STORAGE_KEY, cleaned);
    } catch {
      // ignore
    }
    if (this.transport === 'ws' && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'player:rename', name: cleaned }));
    }
    this.emitStatus();
  }

  public sendPlayerState(state: Omit<RemotePlayerPayload, 'id' | 'name'>): void {
    this.lastLocalState = state;
    if (this.transport === 'ws' && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'player:state',
          name: this.playerName,
          ...state,
        }),
      );
    }
  }

  public sendHousingUpsert(tile: SavedHousingItem): void {
    if (this.transport === 'ws' && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'housing:upsert', tile }));
    } else if (this.transport === 'http') {
      this.pendingActions.push({ type: 'housing:upsert', tile });
    }
  }

  public sendHousingDelete(id: string): void {
    if (this.transport === 'ws' && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'housing:delete', id }));
    } else if (this.transport === 'http') {
      this.pendingActions.push({ type: 'housing:delete', id });
    }
  }

  public sendHousingDamage(id: string, durability: number): void {
    if (this.transport === 'ws' && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'housing:damage', id, durability }));
    } else if (this.transport === 'http') {
      this.pendingActions.push({ type: 'housing:damage', id, durability });
    }
  }

  public sendPlotClaim(plot: SavedLandPlot): void {
    if (this.transport === 'ws' && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'plot:claim', plot }));
    } else if (this.transport === 'http') {
      this.pendingActions.push({ type: 'plot:claim', plot });
    }
  }

  public dispose(): void {
    this.disposed = true;
    if (this.transport === 'http' && this.playerId) {
      fetch(`${this.activeOrigin}/api/rooms/${encodeURIComponent(this.roomId)}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: this.playerId, leave: true }),
        keepalive: true,
      }).catch(() => {});
    }
    this.cleanupTransports();
  }
}
