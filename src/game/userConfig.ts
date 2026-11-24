export type OptimizationPreset = 'ultra_low' | 'balanced' | 'high';
export type ShadowQuality = 'low' | 'medium' | 'high';
export type ViewDistanceLevel = 'near' | 'medium' | 'far';
export type ParticleDensityLevel = 'off' | 'low' | 'medium' | 'high';
export type MobileUiScale = 'compact' | 'normal';

export interface GameSettings {
  preset: OptimizationPreset;
  resolutionScale: number; // 0.6 .. 1.5
  shadowsEnabled: boolean;
  shadowQuality: ShadowQuality;
  viewDistance: ViewDistanceLevel;
  grassDensity: number; // 0 .. 1
  particlesLevel: ParticleDensityLevel;
  weatherEffects: boolean;
  fpsLimit: 0 | 30 | 60;
  distanceLod: boolean;
  cameraSensitivity: number; // 0.5 .. 2.0
  masterVolume: number; // 0 .. 1
  bgmVolume: number; // 0 .. 1
  sfxVolume: number; // 0 .. 1
  showFps: boolean;
  mobileUiScale: MobileUiScale;
}

export type AvatarKind = 'preset' | 'google' | 'upload';

export interface UserProfile {
  nickname: string;
  avatarData: string;
  avatarKind: AvatarKind;
}

export interface SavedServerEntry {
  id: string;
  name: string;
  code: string;
  lastPlayedAt: number;
}

export interface PlayHistoryEntry {
  id: string;
  code: string;
  serverName: string;
  directConnect: boolean;
  playedAt: number;
}

export const PRESET_AVATARS: Array<{ id: string; label: string; src: string }> = [
  { id: 'warrior', label: '기사 냥이', src: '/assets/aistudio/1795244105794_7ddd76d2.jpg' },
  { id: 'rogue', label: '도적 냥이', src: '/assets/aistudio/1795244107419_4b23728d.jpg' },
  { id: 'archer', label: '궁수 냥이', src: '/assets/aistudio/1795244109200_82c50c75.jpg' },
  { id: 'healer', label: '치유사 냥이', src: '/assets/aistudio/1795244111640_0b5d11e6.jpg' },
  { id: 'mage', label: '마법사 냥이', src: '/assets/aistudio/image_abfb6366.png' },
];

const SETTINGS_KEY = 'archepaw_settings_v2';
const PROFILE_KEY = 'archepaw_profile_v2';
const SERVERS_KEY = 'archepaw_saved_servers_v2';
const HISTORY_KEY = 'archepaw_play_history_v2';

export function detectCompactMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.innerWidth <= 820 ||
    window.matchMedia?.('(pointer: coarse)')?.matches === true
  );
}

export function getPresetSettings(preset: OptimizationPreset, isMobile = detectCompactMobile()): GameSettings {
  if (preset === 'ultra_low') {
    return {
      preset: 'ultra_low',
      resolutionScale: isMobile ? 0.65 : 0.75,
      shadowsEnabled: false,
      shadowQuality: 'low',
      viewDistance: 'near',
      grassDensity: 0,
      particlesLevel: 'off',
      weatherEffects: false,
      fpsLimit: isMobile ? 30 : 60,
      distanceLod: true,
      cameraSensitivity: 1.0,
      masterVolume: 0.9,
      bgmVolume: 0.75,
      sfxVolume: 0.9,
      showFps: false,
      mobileUiScale: 'compact',
    };
  }
  if (preset === 'high') {
    return {
      preset: 'high',
      resolutionScale: isMobile ? 1.0 : 1.25,
      shadowsEnabled: true,
      shadowQuality: isMobile ? 'medium' : 'high',
      viewDistance: 'far',
      grassDensity: 1.0,
      particlesLevel: 'high',
      weatherEffects: true,
      fpsLimit: 0,
      distanceLod: true,
      cameraSensitivity: 1.0,
      masterVolume: 0.9,
      bgmVolume: 0.75,
      sfxVolume: 0.9,
      showFps: false,
      mobileUiScale: isMobile ? 'compact' : 'normal',
    };
  }
  // Balanced (optimized default — fast, crisp, low overhead)
  return {
    preset: 'balanced',
    resolutionScale: isMobile ? 0.8 : 1.0,
    shadowsEnabled: !isMobile,
    shadowQuality: isMobile ? 'low' : 'medium',
    viewDistance: isMobile ? 'near' : 'medium',
    grassDensity: isMobile ? 0.25 : 0.55,
    particlesLevel: isMobile ? 'low' : 'medium',
    weatherEffects: true,
    fpsLimit: isMobile ? 45 as unknown as 60 : 60,
    distanceLod: true,
    cameraSensitivity: 1.0,
    masterVolume: 0.9,
    bgmVolume: 0.75,
    sfxVolume: 0.9,
    showFps: false,
    mobileUiScale: 'compact',
  };
}

export function getDefaultSettings(): GameSettings {
  const isMobile = detectCompactMobile();
  const base = getPresetSettings(isMobile ? 'ultra_low' : 'balanced', isMobile);
  if (isMobile) {
    base.fpsLimit = 60;
    base.weatherEffects = true;
    base.particlesLevel = 'low';
    base.grassDensity = 0.2;
  } else {
    base.fpsLimit = 60;
  }
  return base;
}

export function loadSettings(): GameSettings {
  const fallback = getDefaultSettings();
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    const fpsLimit = parsed.fpsLimit === 30 || parsed.fpsLimit === 60 || parsed.fpsLimit === 0 ? parsed.fpsLimit : fallback.fpsLimit;
    return {
      ...fallback,
      ...parsed,
      fpsLimit,
      resolutionScale: Math.max(0.55, Math.min(1.5, Number(parsed.resolutionScale ?? fallback.resolutionScale))),
      grassDensity: Math.max(0, Math.min(1, Number(parsed.grassDensity ?? fallback.grassDensity))),
      cameraSensitivity: Math.max(0.4, Math.min(2.2, Number(parsed.cameraSensitivity ?? fallback.cameraSensitivity))),
      masterVolume: Math.max(0, Math.min(1, Number(parsed.masterVolume ?? fallback.masterVolume))),
      bgmVolume: Math.max(0, Math.min(1, Number(parsed.bgmVolume ?? fallback.bgmVolume))),
      sfxVolume: Math.max(0, Math.min(1, Number(parsed.sfxVolume ?? fallback.sfxVolume))),
    };
  } catch {
    return fallback;
  }
}

export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage quota
  }
}

export function loadLocalProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<UserProfile>;
      if (p.nickname && typeof p.nickname === 'string') {
        return {
          nickname: p.nickname.trim().slice(0, 20) || '모험가',
          avatarData: typeof p.avatarData === 'string' && p.avatarData ? p.avatarData : PRESET_AVATARS[0].src,
          avatarKind: p.avatarKind === 'google' || p.avatarKind === 'upload' ? p.avatarKind : 'preset',
        };
      }
    }
  } catch {
    // ignore
  }
  let legacyName = '';
  try {
    legacyName = localStorage.getItem('archepaw_player_name') || '';
  } catch {
    // ignore
  }
  return {
    nickname: legacyName.trim().slice(0, 20) || `모험가${Math.floor(100 + Math.random() * 899)}`,
    avatarData: PRESET_AVATARS[0].src,
    avatarKind: 'preset',
  };
}

export function saveLocalProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    localStorage.setItem('archepaw_player_name', profile.nickname);
  } catch {
    // ignore
  }
}

export function sanitizeRoomCode(raw: string): string {
  let text = raw.trim();
  if (!text) return '';
  try {
    if (text.includes('room=')) {
      const url = new URL(text.startsWith('http') ? text : `https://archepaw.local/?${text.split('?').pop() || text}`);
      const r = url.searchParams.get('room');
      if (r) text = r;
    }
  } catch {
    // fallback to plain string cleaning
  }
  return text.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 28);
}

export function loadLocalSavedServers(): SavedServerEntry[] {
  try {
    const raw = localStorage.getItem(SERVERS_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        return list.filter(
          (item): item is SavedServerEntry =>
            !!item &&
            typeof item.id === 'string' &&
            typeof item.name === 'string' &&
            typeof item.code === 'string',
        );
      }
    }
  } catch {
    // ignore
  }
  return [
    {
      id: 'srv_frontier_main',
      name: '아키포우 공용 광장',
      code: 'frontier-1',
      lastPlayedAt: 0,
    },
  ];
}

export function saveLocalSavedServers(servers: SavedServerEntry[]): void {
  try {
    localStorage.setItem(SERVERS_KEY, JSON.stringify(servers.slice(0, 40)));
  } catch {
    // ignore
  }
}

export function loadLocalPlayHistory(): PlayHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        return list.filter(
          (item): item is PlayHistoryEntry =>
            !!item &&
            typeof item.id === 'string' &&
            typeof item.code === 'string' &&
            typeof item.playedAt === 'number',
        );
      }
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveLocalPlayHistory(history: PlayHistoryEntry[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 40)));
  } catch {
    // ignore
  }
}

export function makeSafeDocId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 9);
  return `${prefix}_${Date.now().toString(36)}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 38);
}

/**
 * Center-crops and resizes an uploaded image file to a compact 160x160 JPEG data URL
 * so it works seamlessly offline (localStorage) and in Firestore (< 40KB).
 */
export function compressAvatarImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('이미지 파일만 업로드할 수 있습니다.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('이미지 파일을 읽지 못했습니다.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('지원되지 않는 이미지 형식입니다.'));
      img.onload = () => {
        const size = 160;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('이미지 처리에 실패했습니다.'));
          return;
        }
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) * 0.5;
        const sy = (img.height - side) * 0.5;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        let dataUrl = canvas.toDataURL('image/jpeg', 0.78);
        if (dataUrl.length > 140000) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.58);
        }
        resolve(dataUrl);
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}
