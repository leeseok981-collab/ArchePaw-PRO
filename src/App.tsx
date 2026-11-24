import React, { Component, lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { GameEngine } from './game/engine';
import {
  ArmorId,
  DailyQuestId,
  DEFAULT_HOTBAR_SLOTS,
  EmoteId,
  FloatingFeedback,
  FoodId,
  HotbarItemId,
  HousingColorId,
  HousingKind,
  HousingMaterial,
  HousingStageId,
  HudSnapshot,
  PlayerClassId,
  QuestId,
  SpawnEggId,
  TimePreset,
  WarriorSkillId,
  WeaponId,
  WeatherKind,
  WORLD_TIERS,
  WorldRecord,
} from './game/types';
import {
  createWorldRecord,
  deleteWorldEntry,
  getTodayDateKey,
  loadWorldList,
} from './game/saveSystem';
import {
  GameSettings,
  loadLocalPlayHistory,
  loadLocalProfile,
  loadLocalSavedServers,
  loadSettings,
  makeSafeDocId,
  PlayHistoryEntry,
  PRESET_AVATARS,
  sanitizeRoomCode,
  SavedServerEntry,
  saveLocalPlayHistory,
  saveLocalProfile,
  saveLocalSavedServers,
  saveSettings,
  UserProfile,
} from './game/userConfig';
import {
  addCloudPlayHistory,
  deleteCloudPlayHistoryEntry,
  deleteCloudSavedServer,
  fetchCloudPlayHistory,
  fetchCloudSavedServers,
  fetchCloudUserProfile,
  saveCloudUserProfile,
  signInWithGooglePopup,
  signOutAccount,
  subscribeAuth,
  testConnection,
  upsertCloudSavedServer,
} from './firebase';
import { CreateWorldInput, TitleScreen } from './components/TitleScreen';
import { WorldLoadingScreen } from './components/WorldLoadingScreen';
import { GameHud } from './components/GameHud';
import type { WorkshopTab } from './components/WorkshopModal';
import { MobileControls } from './components/MobileControls';
import { SettingsModal } from './components/SettingsModal';
import { MultiplayerModal } from './components/MultiplayerModal';
import { ProfileModal } from './components/ProfileModal';

const WorkshopModal = lazy(() =>
  import('./components/WorkshopModal').then((m) => ({ default: m.WorkshopModal })),
);
const MasteryModal = lazy(() =>
  import('./components/MasteryModal').then((m) => ({ default: m.MasteryModal })),
);
const TrialTowerModal = lazy(() =>
  import('./components/TrialTowerModal').then((m) => ({ default: m.TrialTowerModal })),
);

class AppErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error?.message || '알 수 없는 오류가 발생했습니다.' };
  }

  componentDidCatch(error: Error) {
    console.error('ArchePaw UI ErrorBoundary:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-[100dvh] flex items-center justify-center bg-[#0f141c] text-[#f7f3ea] p-6">
          <div className="max-w-md w-full rounded-2xl bg-[#161e2a] border border-white/12 p-6 text-center space-y-4">
            <h2 className="text-lg font-bold text-[#fde047]">화면을 불러오는 중 문제가 발생했습니다</h2>
            <p className="text-xs text-[#94a3b8] leading-relaxed break-words">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-[#facc15] hover:bg-[#fde047] text-[#171209] text-sm font-bold cursor-pointer"
            >
              다시 불러오기
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const INITIAL_HUD: HudSnapshot = {
  phase: 'title',
  gameMode: 'survival',
  worldId: null,
  worldName: '아키포우 월드',
  playerClass: 'warrior',
  worldTier: 1,
  zoneName: '시작 마을 · 중앙 광장',
  worldRadius: WORLD_TIERS[0].radius,
  playerX: 0,
  playerZ: 6.2,
  playerYaw: Math.PI,
  cameraYaw: 0,
  hp: 100,
  maxHp: 100,
  stamina: 100,
  maxStamina: 100,
  hunger: 100,
  maxHunger: 100,
  selectedFood: 'apple',
  cameraMode: 'third_back',
  isFullscreen: false,
  isSprinting: false,
  isGrounded: true,
  isSwimming: false,
  breath: 100,
  maxBreath: 100,
  level: 1,
  exp: 0,
  nextExp: 40,
  inventory: {
    wood: 3,
    stone: 2,
    iron: 0,
    crystal: 0,
    leather: 0,
    fang: 0,
    essence: 0,
    potion: 1,
    apple: 2,
    berry: 2,
    mushroom: 0,
    honey: 0,
    coconut: 0,
    cactus_fruit: 0,
    carrot: 0,
    meat: 0,
  },
  upgrades: { toolLevel: 1, bootsLevel: 1, armorLevel: 1 },
  ownedWeapons: ['crystal_sword'],
  equippedWeapon: 'crystal_sword',
  ownedArmors: ['pioneer_denim'],
  equippedArmor: 'pioneer_denim',
  autoEquipTool: true,
  hotbarSlots: [...DEFAULT_HOTBAR_SLOTS],
  quests: [],
  dailyQuests: {
    dateKey: getTodayDateKey(),
    quests: [],
    coopSynced: false,
    completedCount: 0,
    totalCount: 6,
    allClearClaimed: false,
  },
  activeEmote: null,
  nearbyHint: null,
  gatherProgress: 0,
  isGathering: false,
  placedLanterns: 0,
  plantedSaplings: 0,
  harvestedTotal: 0,
  monstersDefeated: 0,
  bossesDefeated: 0,
  activeBoss: null,
  warriorSkills: [],
  skillMasteryPoints: 1,
  warcryBuffRemaining: 0,
  warcryBuffDuration: 8,
  proficiencies: [],
  minimapEntities: [],
  bannerMessage: null,
  webglError: null,
  timeOfDay: 9.5,
  timeClockText: '09:30',
  timePhaseLabel: '아침',
  timePaused: false,
  weather: 'clear',
  weatherLabel: '맑음',
  autoWeather: true,
  rainGrowthBoost: false,
  windStrength: 0.25,
  nightCreaturesActive: false,
  bgmEnabled: true,
  bgmThemeLabel: '낮 테마 · 여명의 초원',
  housing: {
    mode: 'off',
    activeStage: 2,
    selectedBlueprint: 'floor',
    selectedMaterial: 'wood',
    selectedColor: 'natural',
    previewValid: false,
    previewReason: null,
    previewSnapped: false,
    previewRotationDeg: 0,
    previewLevel: 0,
    gridSnap: true,
    freeRotate: false,
    heightOffset: 0,
    claimedPlotsCount: 0,
    inClaimedPlot: false,
    canClaimPlotHere: false,
    claimPlotReason: null,
    selectedHouse: null,
    placedCount: 0,
    inCompletedHouse: false,
    completedHouseRoomCount: 0,
    damagedPieceCount: 0,
  },
  multiplayer: {
    connected: false,
    roomId: 'main',
    playerId: '',
    playerName: '냥기사',
    onlineCount: 1,
    remotePlayers: [],
  },
  trialTower: {
    activeFloor: null,
    highestClearedFloor: 0,
    lastClearedFloor: null,
    nearTower: false,
    inDungeon: false,
    activeFilterHex: null,
    activeBossTitle: null,
  },
  nearbyMonsters: [],
  lastSavedAt: null,
  hasSavedGame: false,
  saveSummary: null,
  fps: 60,
};

function mergeSavedServers(
  cloud: SavedServerEntry[],
  local: SavedServerEntry[],
): SavedServerEntry[] {
  const byCode = new Map<string, SavedServerEntry>();
  for (const s of [...local, ...cloud]) {
    const code = sanitizeRoomCode(s.code);
    if (!code) continue;
    const prev = byCode.get(code);
    if (!prev || (s.lastPlayedAt || 0) >= (prev.lastPlayedAt || 0)) {
      byCode.set(code, { ...s, code });
    }
  }
  return Array.from(byCode.values())
    .sort((a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0))
    .slice(0, 40);
}

function mergePlayHistory(
  cloud: PlayHistoryEntry[],
  local: PlayHistoryEntry[],
): PlayHistoryEntry[] {
  const byId = new Map<string, PlayHistoryEntry>();
  for (const h of [...local, ...cloud]) {
    if (!h.id || !h.code) continue;
    const prev = byId.get(h.id);
    if (!prev || h.playedAt > prev.playedAt) {
      byId.set(h.id, h);
    }
  }
  return Array.from(byId.values())
    .sort((a, b) => b.playedAt - a.playedAt)
    .slice(0, 40);
}

function ArchePawApp() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [feedbacks, setFeedbacks] = useState<FloatingFeedback[]>([]);
  const [muted, setMuted] = useState(false);

  // Network Online / Offline Dual-Mode Status
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  // Detailed Settings & Performance Optimization State
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());

  // Firebase Auth + Profile + Minecraft-style Multiplayer Server List & Play History
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [noticeToast, setNoticeToast] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile>(() => loadLocalProfile());
  const [savedServers, setSavedServers] = useState<SavedServerEntry[]>(() =>
    loadLocalSavedServers(),
  );
  const [playHistory, setPlayHistory] = useState<PlayHistoryEntry[]>(() =>
    loadLocalPlayHistory(),
  );

  const [mobileTouchEnabled, setMobileTouchEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const coarse = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
    return coarse || window.innerWidth < 820;
  });
  const [questLogOpen, setQuestLogOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= 820;
  });
  const [emoteWheelOpen, setEmoteWheelOpen] = useState(false);
  const [masteryOpen, setMasteryOpen] = useState(false);
  const [trialTowerOpen, setTrialTowerOpen] = useState(false);
  const [workshopOpen, setWorkshopOpen] = useState(false);
  const [workshopTab, setWorkshopTab] = useState<WorkshopTab>('forge');

  // World List & Loading Screen State
  const [worlds, setWorlds] = useState<WorldRecord[]>(() => loadWorldList());
  const [loadingWorld, setLoadingWorld] = useState<{
    world: WorldRecord;
    progress: number;
    stageLabel: string;
  } | null>(null);
  const loadingTimersRef = useRef<number[]>([]);

  // New Top-Level Modals (Accessible from Main Menu & In-Game)
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [multiplayerOpen, setMultiplayerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const clearLoadingTimers = useCallback(() => {
    for (const id of loadingTimersRef.current) {
      window.clearTimeout(id);
    }
    loadingTimersRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      clearLoadingTimers();
    };
  }, [clearLoadingTimers]);

  const showToast = useCallback((msg: string) => {
    setNoticeToast(msg);
    window.setTimeout(() => {
      setNoticeToast((cur) => (cur === msg ? null : cur));
    }, 3200);
  }, []);

  // Track browser online / offline status seamlessly
  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      engineRef.current?.setOfflineMode(false);
    };
    const onOffline = () => {
      setIsOnline(false);
      engineRef.current?.setOfflineMode(true);
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Firebase connectivity probe + Auth subscription + Cloud Sync
  useEffect(() => {
    void testConnection();
    const unsub = subscribeAuth((user) => {
      setFirebaseUser(user);
      if (!user || !navigator.onLine) return;

      void (async () => {
        const [cloudProfile, cloudServers, cloudHistory] = await Promise.all([
          fetchCloudUserProfile(user.uid),
          fetchCloudSavedServers(user.uid),
          fetchCloudPlayHistory(user.uid),
        ]);

        const localProf = loadLocalProfile();
        if (cloudProfile && cloudProfile.nickname) {
          const resolved: UserProfile = {
            nickname: cloudProfile.nickname,
            avatarData:
              cloudProfile.avatarData ||
              user.photoURL ||
              localProf.avatarData ||
              PRESET_AVATARS[0].src,
            avatarKind: cloudProfile.avatarKind,
          };
          setProfile(resolved);
          saveLocalProfile(resolved);
          engineRef.current?.setMultiplayerName(resolved.nickname);
        } else {
          // Initialize cloud profile from Google account or existing local profile
          const fallbackName =
            localProf.nickname && !localProf.nickname.startsWith('모험가')
              ? localProf.nickname
              : (user.displayName || localProf.nickname || '모험가').slice(0, 20);
          const resolved: UserProfile = {
            nickname: fallbackName,
            avatarData:
              localProf.avatarKind === 'upload'
                ? localProf.avatarData
                : user.photoURL || localProf.avatarData || PRESET_AVATARS[0].src,
            avatarKind:
              localProf.avatarKind === 'upload'
                ? 'upload'
                : user.photoURL
                  ? 'google'
                  : localProf.avatarKind,
          };
          setProfile(resolved);
          saveLocalProfile(resolved);
          engineRef.current?.setMultiplayerName(resolved.nickname);
          void saveCloudUserProfile(user.uid, resolved);
        }

        if (cloudServers) {
          const mergedServers = mergeSavedServers(cloudServers, loadLocalSavedServers());
          setSavedServers(mergedServers);
          saveLocalSavedServers(mergedServers);
        }

        if (cloudHistory) {
          const mergedHistory = mergePlayHistory(cloudHistory, loadLocalPlayHistory());
          setPlayHistory(mergedHistory);
          saveLocalPlayHistory(mergedHistory);
        }
      })();
    });
    return () => unsub();
  }, []);

  const pushFeedback = useCallback((item: FloatingFeedback) => {
    setFeedbacks((prev) => [...prev.slice(-6), item]);
    window.setTimeout(() => {
      setFeedbacks((prev) => prev.filter((f) => f.id !== item.id));
    }, 1250);
  }, []);

  const openWorkshop = useCallback((tab: WorkshopTab) => {
    setEmoteWheelOpen(false);
    setMasteryOpen(false);
    setTrialTowerOpen(false);
    setSettingsOpen(false);
    setMultiplayerOpen(false);
    setProfileOpen(false);
    setWorkshopTab(tab);
    setWorkshopOpen(true);
    engineRef.current?.setPhase('paused');
  }, []);

  const openTrialTower = useCallback(() => {
    setEmoteWheelOpen(false);
    setMasteryOpen(false);
    setWorkshopOpen(false);
    setTrialTowerOpen(true);
  }, []);

  const closeModals = useCallback(() => {
    setWorkshopOpen(false);
    setMasteryOpen(false);
    setTrialTowerOpen(false);
    setSettingsOpen(false);
    setMultiplayerOpen(false);
    setProfileOpen(false);
    engineRef.current?.setPhase('playing');
  }, []);

  const toggleQuestLog = useCallback(() => {
    setQuestLogOpen((v) => !v);
  }, []);

  const toggleEmoteWheel = useCallback(() => {
    setMasteryOpen(false);
    setTrialTowerOpen(false);
    setEmoteWheelOpen((v) => !v);
  }, []);

  const toggleMastery = useCallback(() => {
    setEmoteWheelOpen(false);
    setTrialTowerOpen(false);
    setMasteryOpen((v) => !v);
  }, []);

  useEffect(() => {
    if (
      !emoteWheelOpen &&
      !masteryOpen &&
      !trialTowerOpen &&
      !settingsOpen &&
      !multiplayerOpen &&
      !profileOpen
    ) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.stopImmediatePropagation();
        e.preventDefault();
        setEmoteWheelOpen(false);
        setMasteryOpen(false);
        setTrialTowerOpen(false);
        setSettingsOpen(false);
        setMultiplayerOpen(false);
        setProfileOpen(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [emoteWheelOpen, masteryOpen, trialTowerOpen, settingsOpen, multiplayerOpen, profileOpen]);

  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    const engine = new GameEngine(mountEl, {
      onHudUpdate: (snapshot) => {
        setHud(snapshot);
      },
      onFloatingFeedback: pushFeedback,
      onOpenWorkshop: openWorkshop,
      onOpenTrialTower: openTrialTower,
      onToggleQuestLog: toggleQuestLog,
      onToggleEmoteWheel: toggleEmoteWheel,
      onToggleMastery: toggleMastery,
    });
    engineRef.current = engine;

    // Immediately apply initial settings, offline state, and profile nickname
    const initialSettings = loadSettings();
    engine.applySettings(initialSettings);
    engine.setOfflineMode(!navigator.onLine);
    const initialProfile = loadLocalProfile();
    if (initialProfile.nickname) {
      engine.setMultiplayerName(initialProfile.nickname);
    }

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [pushFeedback, openWorkshop, openTrialTower, toggleQuestLog, toggleEmoteWheel, toggleMastery]);

  const handleUpdateSettings = useCallback((next: GameSettings) => {
    setSettings(next);
    saveSettings(next);
    engineRef.current?.applySettings(next);
  }, []);

  const handleReturnToTitle = useCallback(() => {
    setWorkshopOpen(false);
    setSettingsOpen(false);
    setMultiplayerOpen(false);
    setProfileOpen(false);
    setEmoteWheelOpen(false);
    setMasteryOpen(false);
    setTrialTowerOpen(false);
    setQuestLogOpen(false);
    engineRef.current?.returnToTitle();
    setWorlds(loadWorldList());
  }, []);

  const handleSignInGoogle = useCallback(async () => {
    if (!isOnline) {
      showToast('오프라인 상태에서는 Google 로그인을 사용할 수 없습니다.');
      return;
    }
    setAuthBusy(true);
    try {
      const user = await signInWithGooglePopup();
      if (user) {
        showToast(`${user.displayName || '계정'}으로 Google 로그인되었습니다.`);
      }
    } catch (err) {
      const msg =
        err instanceof Error && err.message.includes('popup-closed')
          ? 'Google 로그인 창이 닫혔습니다.'
          : err instanceof Error
            ? err.message
            : 'Google 로그인 중 오류가 발생했습니다.';
      showToast(msg);
    } finally {
      setAuthBusy(false);
    }
  }, [isOnline, showToast]);

  const handleSignOutGoogle = useCallback(async () => {
    setAuthBusy(true);
    try {
      await signOutAccount();
      showToast('로그아웃되었습니다. 로컬 프로필로 계속 플레이할 수 있습니다.');
    } catch {
      showToast('로그아웃 처리 중 오류가 발생했습니다.');
    } finally {
      setAuthBusy(false);
    }
  }, [showToast]);

  const handleSaveProfile = useCallback(
    (next: UserProfile) => {
      setProfile(next);
      saveLocalProfile(next);
      engineRef.current?.setMultiplayerName(next.nickname);
      if (firebaseUser && isOnline) {
        void saveCloudUserProfile(firebaseUser.uid, next);
      }
      showToast('프로필이 저장되었습니다.');
    },
    [firebaseUser, isOnline, showToast],
  );

  // Minecraft-style Server List: Add Server (saved to list)
  const handleAddServer = useCallback(
    (name: string, code: string) => {
      const cleanCode = sanitizeRoomCode(code);
      const cleanName = name.trim().slice(0, 32) || cleanCode;
      if (!cleanCode) return;

      setSavedServers((prev) => {
        const existing = prev.find((s) => s.code.toLowerCase() === cleanCode.toLowerCase());
        let entry: SavedServerEntry;
        let nextList: SavedServerEntry[];
        if (existing) {
          entry = { ...existing, name: cleanName, code: cleanCode };
          nextList = [entry, ...prev.filter((s) => s.id !== existing.id)];
        } else {
          entry = {
            id: makeSafeDocId('srv'),
            name: cleanName,
            code: cleanCode,
            lastPlayedAt: 0,
          };
          nextList = [entry, ...prev].slice(0, 40);
        }
        saveLocalSavedServers(nextList);
        if (firebaseUser && isOnline) {
          void upsertCloudSavedServer(firebaseUser.uid, entry);
        }
        return nextList;
      });
      showToast(`서버 "${cleanName}" 목록에 저장됨`);
    },
    [firebaseUser, isOnline, showToast],
  );

  const handleDeleteServer = useCallback(
    (serverId: string) => {
      setSavedServers((prev) => {
        const nextList = prev.filter((s) => s.id !== serverId);
        saveLocalSavedServers(nextList);
        return nextList;
      });
      if (firebaseUser && isOnline) {
        void deleteCloudSavedServer(firebaseUser.uid, serverId);
      }
    },
    [firebaseUser, isOnline],
  );

  const launchWorldWithLoading = useCallback(
    (world: WorldRecord, customNickname?: string) => {
      clearLoadingTimers();
      setLoadingWorld({
        world,
        progress: 14,
        stageLabel: '월드 지형과 수변을 준비하는 중...',
      });

      const t1 = window.setTimeout(() => {
        setLoadingWorld((cur) =>
          cur ? { ...cur, progress: 46, stageLabel: '자원·생태계·건축 데이터를 불러오는 중...' } : null,
        );
      }, 170);

      const t2 = window.setTimeout(() => {
        engineRef.current?.startWorld(world, customNickname || profile.nickname);
        setLoadingWorld((cur) =>
          cur
            ? {
                ...cur,
                progress: 82,
                stageLabel: world.isMultiplayer
                  ? `멀티플레이 코드 ${world.roomCode} 연결 중...`
                  : '모험 입장 준비를 마무리하는 중...',
              }
            : null,
        );
      }, 390);

      const t3 = window.setTimeout(() => {
        setWorlds(loadWorldList());
        setLoadingWorld((cur) => (cur ? { ...cur, progress: 100, stageLabel: '입장 완료!' } : null));
      }, 760);

      const t4 = window.setTimeout(() => {
        setLoadingWorld(null);
      }, 1020);

      loadingTimersRef.current = [t1, t2, t3, t4];
    },
    [clearLoadingTimers, profile.nickname],
  );

  const handleCreateWorld = useCallback(
    (input: CreateWorldInput) => {
      const cleanName = input.nickname.trim().slice(0, 20) || profile.nickname;
      if (cleanName && cleanName !== profile.nickname) {
        const nextProf: UserProfile = { ...profile, nickname: cleanName };
        setProfile(nextProf);
        saveLocalProfile(nextProf);
        if (firebaseUser && isOnline) {
          void saveCloudUserProfile(firebaseUser.uid, nextProf);
        }
      }
      const record = createWorldRecord({
        name: input.name,
        gameMode: input.gameMode,
        playerClass: input.playerClass,
        isMultiplayer: input.isMultiplayer,
        roomCode: input.roomCode,
      });
      setWorlds(loadWorldList());
      launchWorldWithLoading(record, cleanName);
    },
    [profile, firebaseUser, isOnline, launchWorldWithLoading],
  );

  const handleEnterWorld = useCallback(
    (world: WorldRecord) => {
      launchWorldWithLoading(world, profile.nickname);
    },
    [launchWorldWithLoading, profile.nickname],
  );

  const handleDeleteWorld = useCallback(
    (worldId: string) => {
      deleteWorldEntry(worldId);
      setWorlds(loadWorldList());
      showToast('월드가 삭제되었습니다.');
    },
    [showToast],
  );

  const handleSpawnEgg = useCallback((eggId: SpawnEggId) => {
    engineRef.current?.spawnMonsterFromEgg(eggId);
  }, []);

  const enterWorldAfterServerConnect = useCallback(
    (roomCode?: string) => {
      setMultiplayerOpen(false);
      if (hud.phase === 'title') {
        const existingWorlds = loadWorldList();
        const target =
          existingWorlds[0] ||
          createWorldRecord({
            name: '멀티플레이 월드',
            gameMode: 'survival',
            playerClass: hud.playerClass,
            isMultiplayer: true,
            roomCode: roomCode || 'main',
          });
        const mergedTarget: WorldRecord = roomCode
          ? { ...target, isMultiplayer: true, roomCode }
          : target;
        launchWorldWithLoading(mergedTarget, profile.nickname);
      } else if (hud.phase === 'paused') {
        setWorkshopOpen(false);
        engineRef.current?.setPhase('playing');
      }
    },
    [hud.phase, hud.playerClass, profile.nickname, launchWorldWithLoading],
  );

  const recordPlayHistory = useCallback(
    (code: string, serverName: string, directConnect: boolean) => {
      const entry: PlayHistoryEntry = {
        id: makeSafeDocId('hist'),
        code,
        serverName,
        directConnect,
        playedAt: Date.now(),
      };
      setPlayHistory((prev) => {
        const nextList = [entry, ...prev].slice(0, 40);
        saveLocalPlayHistory(nextList);
        return nextList;
      });
      if (firebaseUser && isOnline) {
        void addCloudPlayHistory(firebaseUser.uid, entry);
      }
    },
    [firebaseUser, isOnline],
  );

  // Join Saved Server (updates lastPlayedAt + records play history)
  const handleJoinSavedServer = useCallback(
    (server: SavedServerEntry) => {
      if (!isOnline) {
        showToast('오프라인 상태에서는 멀티플레이 서버에 접속할 수 없습니다.');
        return;
      }
      const cleanCode = sanitizeRoomCode(server.code);
      if (!cleanCode) return;

      const updated: SavedServerEntry = { ...server, code: cleanCode, lastPlayedAt: Date.now() };
      setSavedServers((prev) => {
        const nextList = [updated, ...prev.filter((s) => s.id !== server.id)];
        saveLocalSavedServers(nextList);
        return nextList;
      });
      if (firebaseUser && isOnline) {
        void upsertCloudSavedServer(firebaseUser.uid, updated);
      }

      recordPlayHistory(cleanCode, server.name, false);
      engineRef.current?.setMultiplayerName(profile.nickname);
      engineRef.current?.joinMultiplayerRoom(cleanCode);
      enterWorldAfterServerConnect(cleanCode);
      showToast(`"${server.name}" 서버(${cleanCode})에 접속했습니다.`);
    },
    [isOnline, firebaseUser, profile.nickname, recordPlayHistory, enterWorldAfterServerConnect, showToast],
  );

  // Direct Connect (DOES NOT save to server list — saves ONLY to play history!)
  const handleDirectConnect = useCallback(
    (rawCode: string) => {
      if (!isOnline) {
        showToast('오프라인 상태에서는 직접 연결을 사용할 수 없습니다.');
        return;
      }
      const cleanCode = sanitizeRoomCode(rawCode);
      if (!cleanCode) return;

      recordPlayHistory(cleanCode, '', true);
      engineRef.current?.setMultiplayerName(profile.nickname);
      engineRef.current?.joinMultiplayerRoom(cleanCode);
      enterWorldAfterServerConnect(cleanCode);
      showToast(`코드 "${cleanCode}" 직접 연결 완료 (플레이 기록 저장)`);
    },
    [isOnline, profile.nickname, recordPlayHistory, enterWorldAfterServerConnect, showToast],
  );

  const handleDeleteHistoryEntry = useCallback(
    (entryId: string) => {
      setPlayHistory((prev) => {
        const nextList = prev.filter((h) => h.id !== entryId);
        saveLocalPlayHistory(nextList);
        return nextList;
      });
      if (firebaseUser && isOnline) {
        void deleteCloudPlayHistoryEntry(firebaseUser.uid, entryId);
      }
    },
    [firebaseUser, isOnline],
  );

  const handlePreviewClass = useCallback((classId: PlayerClassId) => {
    engineRef.current?.previewClass(classId);
  }, []);

  const handleTitleCameraMode = useCallback((mode: 'scenic' | 'character') => {
    engineRef.current?.setTitleCameraMode(mode);
  }, []);

  const handleToggleMute = useCallback(() => {
    if (!engineRef.current) return;
    setMuted(engineRef.current.toggleMute());
  }, []);

  const handleToggleBgm = useCallback(() => {
    engineRef.current?.toggleBgm();
  }, []);

  const handleClaimQuest = useCallback((id: QuestId) => {
    engineRef.current?.claimQuestReward(id);
  }, []);

  const handleClaimDailyQuest = useCallback((id: DailyQuestId) => {
    engineRef.current?.claimDailyQuestReward(id);
  }, []);

  const handleClaimDailyAllClear = useCallback(() => {
    engineRef.current?.claimDailyAllClearBonus();
  }, []);

  const handlePause = useCallback(() => {
    setEmoteWheelOpen(false);
    setMasteryOpen(false);
    setTrialTowerOpen(false);
    setWorkshopOpen(false);
    setSettingsOpen(false);
    setMultiplayerOpen(false);
    setProfileOpen(false);
    engineRef.current?.setPhase('paused');
  }, []);

  const handleStartTrialFloor = useCallback((floor: number) => {
    engineRef.current?.startTrialTowerFloor(floor);
  }, []);

  const handleExitTrialTower = useCallback(() => {
    engineRef.current?.exitTrialTower(false);
  }, []);

  const handleCastSkill = useCallback((skillId: WarriorSkillId) => {
    engineRef.current?.castWarriorSkill(skillId);
  }, []);

  const handleUpgradeSkill = useCallback((skillId: WarriorSkillId) => {
    engineRef.current?.upgradeWarriorSkill(skillId);
  }, []);

  const handleTriggerEmote = useCallback((id: EmoteId) => {
    engineRef.current?.triggerEmote(id);
  }, []);

  const handleCancelEmote = useCallback(() => {
    engineRef.current?.cancelEmote();
  }, []);

  const handleSetTimePreset = useCallback((preset: TimePreset) => {
    engineRef.current?.setTimePreset(preset);
  }, []);

  const handleSetTimeOfDay = useCallback((hours: number) => {
    engineRef.current?.setTimeOfDay(hours);
  }, []);

  const handleToggleTimePaused = useCallback(() => {
    engineRef.current?.toggleTimePaused();
  }, []);

  const handleSetWeather = useCallback((weather: WeatherKind) => {
    engineRef.current?.setWeather(weather);
  }, []);

  const handleToggleAutoWeather = useCallback(() => {
    engineRef.current?.toggleAutoWeather();
  }, []);

  const handleForgeWeapon = useCallback((id: WeaponId) => {
    engineRef.current?.forgeWeapon(id);
  }, []);

  const handleEquipWeapon = useCallback((id: WeaponId) => {
    engineRef.current?.equipWeapon(id);
  }, []);

  const handleCraftArmor = useCallback((id: ArmorId) => {
    engineRef.current?.craftArmor(id);
  }, []);

  const handleEquipArmor = useCallback((id: ArmorId) => {
    engineRef.current?.equipArmor(id);
  }, []);

  const handleActivateHotbarSlot = useCallback((slotIndex: number) => {
    engineRef.current?.activateHotbarSlot(slotIndex);
  }, []);

  const handleSetHotbarSlot = useCallback((slotIndex: number, itemId: HotbarItemId) => {
    engineRef.current?.setHotbarSlot(slotIndex, itemId);
  }, []);

  const handleToggleAutoEquip = useCallback(() => {
    engineRef.current?.toggleAutoEquipTool();
  }, []);

  const handleEatFood = useCallback((foodId?: FoodId) => {
    engineRef.current?.eatFood(foodId);
  }, []);

  const handleSelectFood = useCallback((foodId: FoodId) => {
    engineRef.current?.selectFood(foodId);
  }, []);

  const handleCycleCameraMode = useCallback(() => {
    engineRef.current?.cycleCameraMode();
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    engineRef.current?.toggleFullscreen();
  }, []);

  // Housing handlers
  const handleToggleHousing = useCallback(() => {
    setEmoteWheelOpen(false);
    engineRef.current?.toggleHousingMode();
  }, []);

  const handleExitHousing = useCallback(() => {
    engineRef.current?.exitHousingMode();
  }, []);

  const handleSelectBlueprint = useCallback((kind: HousingKind) => {
    engineRef.current?.setHousingBlueprint(kind);
  }, []);

  const handleSelectHousingMaterial = useCallback((material: HousingMaterial) => {
    engineRef.current?.setHousingMaterial(material);
  }, []);

  const handleSelectHousingColor = useCallback((color: HousingColorId) => {
    engineRef.current?.setHousingColor(color);
  }, []);

  const handlePaintConnectedStructure = useCallback((color: HousingColorId) => {
    engineRef.current?.paintConnectedStructure(color);
  }, []);

  const handleToggleDoor = useCallback(() => {
    engineRef.current?.toggleDoorTile();
  }, []);

  const handleEnterHousingEdit = useCallback(() => {
    engineRef.current?.enterHousingEditMode();
  }, []);

  const handleRotateHousing = useCallback((deltaSteps: number) => {
    engineRef.current?.rotateHousingPreview(deltaSteps);
  }, []);

  const handleSwapTileKind = useCallback((kind: HousingKind) => {
    engineRef.current?.swapSelectedTileKind(kind);
  }, []);

  const handleConfirmHousing = useCallback(() => {
    engineRef.current?.confirmHousingPlacement();
  }, []);

  const handleStartMovingHouse = useCallback(() => {
    engineRef.current?.startMovingSelectedHouse();
  }, []);

  const handleCancelMovingHouse = useCallback(() => {
    engineRef.current?.cancelMovingSelectedHouse();
  }, []);

  const handleDemolishHouse = useCallback(() => {
    engineRef.current?.demolishSelectedHouse();
  }, []);

  const handleSetHousingStage = useCallback((stage: HousingStageId) => {
    engineRef.current?.setHousingStage(stage);
  }, []);

  const handleClaimLandPlot = useCallback(() => {
    engineRef.current?.claimLandPlot();
  }, []);

  const handleToggleGridSnap = useCallback(() => {
    engineRef.current?.toggleGridSnap();
  }, []);

  const handleToggleFreeRotate = useCallback(() => {
    engineRef.current?.toggleFreeRotate();
  }, []);

  const handleAdjustHousingHeight = useCallback((delta: number) => {
    engineRef.current?.adjustHousingHeight(delta);
  }, []);

  const handleResetHousingHeight = useCallback(() => {
    engineRef.current?.resetHousingHeight();
  }, []);

  const handleDuplicateHouse = useCallback(() => {
    engineRef.current?.duplicateSelectedHouse();
  }, []);

  const handleRepairHouse = useCallback(() => {
    engineRef.current?.repairSelectedHouse();
  }, []);

  const handleGetShareUrl = useCallback(() => {
    return engineRef.current?.getMultiplayerShareUrl() || window.location.href;
  }, []);

  const handleSetPlayerName = useCallback(
    (name: string) => {
      const clean = name.trim().slice(0, 20);
      if (!clean) return;
      engineRef.current?.setMultiplayerName(clean);
      const nextProf: UserProfile = { ...profile, nickname: clean };
      setProfile(nextProf);
      saveLocalProfile(nextProf);
      if (firebaseUser && isOnline) {
        void saveCloudUserProfile(firebaseUser.uid, nextProf);
      }
    },
    [profile, firebaseUser, isOnline],
  );

  const handleJoinRoom = useCallback((roomId: string) => {
    engineRef.current?.joinMultiplayerRoom(roomId);
  }, []);

  const handleToggleMobileTouch = useCallback(() => {
    setMobileTouchEnabled((v) => !v);
  }, []);

  const handleMobileMoveInput = useCallback((right: number, forward: number, sprint: boolean) => {
    engineRef.current?.setMobileMoveInput(right, forward, sprint);
  }, []);

  const handleMobileJump = useCallback(() => {
    engineRef.current?.triggerMobileJump();
  }, []);

  const handleMobileAction = useCallback(() => {
    engineRef.current?.triggerMobileAction();
  }, []);

  // Save / Load / Export / Import handlers
  const handleSaveGame = useCallback(() => {
    engineRef.current?.saveGame(false);
    setWorlds(loadWorldList());
  }, []);

  const handleLoadGame = useCallback(() => {
    engineRef.current?.loadSavedGame(false);
  }, []);

  const handleResetWorld = useCallback(() => {
    engineRef.current?.resetWorldAndClearSave();
  }, []);

  const handleExportSaveDownload = useCallback(() => {
    const json = engineRef.current?.exportSaveJson();
    if (!json) return;
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `archepaw-world-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const handleExportSaveRaw = useCallback(() => {
    return engineRef.current?.exportSaveJson() || '';
  }, []);

  const handleImportSave = useCallback((jsonText: string) => {
    return Boolean(engineRef.current?.importSaveJson(jsonText));
  }, []);

  const anyOverlayOpen =
    masteryOpen ||
    trialTowerOpen ||
    workshopOpen ||
    settingsOpen ||
    multiplayerOpen ||
    profileOpen;

  return (
    <main className="relative w-full h-[100dvh] overflow-hidden bg-[#12161c]">
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full" />

      {noticeToast && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-xl bg-[#101722]/96 border border-[#facc15]/45 text-xs font-semibold text-[#f8f5ec] shadow-2xl pointer-events-none whitespace-nowrap max-w-[92vw] truncate"
          style={{ top: 'max(14px, env(safe-area-inset-top, 0px))' }}
        >
          {noticeToast}
        </div>
      )}

      {hud.webglError && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#12161c] p-6">
          <div className="max-w-md rounded-2xl bg-[#1a2029] border border-white/10 p-6 text-center space-y-3">
            <h2 className="text-lg font-bold text-[#f7f3ea]">3D 렌더링을 시작할 수 없습니다</h2>
            <p className="text-sm text-[#aeb7c4]">{hud.webglError}</p>
          </div>
        </div>
      )}

      {hud.phase === 'title' && !hud.webglError && !loadingWorld && (
        <TitleScreen
          worlds={worlds}
          selectedClass={hud.playerClass}
          isOnline={isOnline}
          firebaseUser={firebaseUser}
          authBusy={authBusy}
          profile={profile}
          onPreviewClass={handlePreviewClass}
          onTitleCameraMode={handleTitleCameraMode}
          onCreateWorld={handleCreateWorld}
          onEnterWorld={handleEnterWorld}
          onDeleteWorld={handleDeleteWorld}
          onOpenMultiplayer={() => setMultiplayerOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenProfile={() => setProfileOpen(true)}
          onSignInGoogle={() => {
            void handleSignInGoogle();
          }}
        />
      )}

      {loadingWorld && (
        <WorldLoadingScreen
          world={loadingWorld.world}
          progress={loadingWorld.progress}
          stageLabel={loadingWorld.stageLabel}
        />
      )}

      {hud.phase !== 'title' && !hud.webglError && (
        <GameHud
          hud={hud}
          feedbacks={feedbacks}
          muted={muted}
          questLogOpen={questLogOpen}
          emoteWheelOpen={emoteWheelOpen}
          masteryOpen={masteryOpen}
          onToggleQuestLog={toggleQuestLog}
          onToggleEmoteWheel={toggleEmoteWheel}
          onToggleMastery={toggleMastery}
          onCastSkill={handleCastSkill}
          onTriggerEmote={handleTriggerEmote}
          onCancelEmote={handleCancelEmote}
          onClaimQuest={handleClaimQuest}
          onClaimDailyQuest={handleClaimDailyQuest}
          onClaimDailyAllClear={handleClaimDailyAllClear}
          onToggleBgm={handleToggleBgm}
          onToggleMute={handleToggleMute}
          onPause={handlePause}
          onInteract={() => engineRef.current?.triggerPrimaryInteract()}
          onActivateHotbarSlot={handleActivateHotbarSlot}
          onSetHotbarSlot={handleSetHotbarSlot}
          onToggleAutoEquip={handleToggleAutoEquip}
          onOpenWorkshop={openWorkshop}
          onSetTimePreset={handleSetTimePreset}
          onSetTimeOfDay={handleSetTimeOfDay}
          onToggleTimePaused={handleToggleTimePaused}
          onSetWeather={handleSetWeather}
          onToggleAutoWeather={handleToggleAutoWeather}
          onToggleHousing={handleToggleHousing}
          onExitHousing={handleExitHousing}
          onSelectBlueprint={handleSelectBlueprint}
          onSelectHousingMaterial={handleSelectHousingMaterial}
          onSelectHousingColor={handleSelectHousingColor}
          onPaintConnectedStructure={handlePaintConnectedStructure}
          onToggleDoor={handleToggleDoor}
          onEnterHousingEdit={handleEnterHousingEdit}
          onRotateHousing={handleRotateHousing}
          onSwapTileKind={handleSwapTileKind}
          onConfirmHousing={handleConfirmHousing}
          onStartMovingHouse={handleStartMovingHouse}
          onCancelMovingHouse={handleCancelMovingHouse}
          onDemolishHouse={handleDemolishHouse}
          onSetHousingStage={handleSetHousingStage}
          onClaimLandPlot={handleClaimLandPlot}
          onToggleGridSnap={handleToggleGridSnap}
          onToggleFreeRotate={handleToggleFreeRotate}
          onAdjustHousingHeight={handleAdjustHousingHeight}
          onResetHousingHeight={handleResetHousingHeight}
          onDuplicateHouse={handleDuplicateHouse}
          onRepairHouse={handleRepairHouse}
          onGetShareUrl={handleGetShareUrl}
          onSetPlayerName={handleSetPlayerName}
          onJoinRoom={handleJoinRoom}
          mobileTouchEnabled={mobileTouchEnabled}
          onToggleMobileTouch={handleToggleMobileTouch}
          onSaveGame={handleSaveGame}
          onOpenTrialTower={openTrialTower}
          onStartTrialFloor={handleStartTrialFloor}
          onExitTrialTower={handleExitTrialTower}
          isOnline={isOnline}
          showFps={settings.showFps}
          mobileUiScale={settings.mobileUiScale}
          profileAvatarUrl={profile.avatarData}
          profileAvatarKind={profile.avatarKind}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenMultiplayer={() => setMultiplayerOpen(true)}
          onOpenProfile={() => setProfileOpen(true)}
          onEatFood={handleEatFood}
          onSelectFood={handleSelectFood}
          onCycleCameraMode={handleCycleCameraMode}
          onToggleFullscreen={handleToggleFullscreen}
        />
      )}

      {hud.phase === 'playing' &&
        mobileTouchEnabled &&
        !hud.webglError &&
        !anyOverlayOpen && (
          <MobileControls
            hud={hud}
            uiScale={settings.mobileUiScale}
            onMoveInput={handleMobileMoveInput}
            onJump={handleMobileJump}
            onAction={handleMobileAction}
            onCastSkill={handleCastSkill}
            onToggleHousing={handleToggleHousing}
            onConfirmHousing={handleConfirmHousing}
            onRotateHousing={() => handleRotateHousing(1)}
            onExitHousing={handleExitHousing}
          />
        )}

      {/* Categorized Settings & Performance Optimization Modal */}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        muted={muted}
        bgmEnabled={hud.bgmEnabled}
        onToggleMute={handleToggleMute}
        onToggleBgm={handleToggleBgm}
        mobileTouchEnabled={mobileTouchEnabled}
        onToggleMobileTouch={handleToggleMobileTouch}
        autoEquipTool={hud.autoEquipTool}
        onToggleAutoEquip={handleToggleAutoEquip}
        isInGame={hud.phase !== 'title'}
        saveSummary={hud.saveSummary}
        onSaveGame={handleSaveGame}
        onExportSave={handleExportSaveRaw}
        onImportSave={handleImportSave}
        onResetSave={handleResetWorld}
        onReturnToTitle={handleReturnToTitle}
        currentFps={hud.fps}
      />

      {/* Minecraft-style Multiplayer Server List, Direct Connect & Play History Modal */}
      <MultiplayerModal
        open={multiplayerOpen}
        onClose={() => setMultiplayerOpen(false)}
        isOnline={isOnline}
        currentRoomId={hud.multiplayer.roomId}
        savedServers={savedServers}
        playHistory={playHistory}
        onAddServer={handleAddServer}
        onDeleteServer={handleDeleteServer}
        onJoinSavedServer={handleJoinSavedServer}
        onDirectConnect={handleDirectConnect}
        onDeleteHistoryEntry={handleDeleteHistoryEntry}
      />

      {/* Top-Left Account & Profile Customization Modal */}
      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        isOnline={isOnline}
        firebaseUser={firebaseUser}
        authBusy={authBusy}
        profile={profile}
        onSaveProfile={handleSaveProfile}
        onSignInGoogle={() => {
          void handleSignInGoogle();
        }}
        onSignOutGoogle={() => {
          void handleSignOutGoogle();
        }}
      />

      <Suspense fallback={null}>
        {masteryOpen && hud.phase === 'playing' && !hud.webglError && (
          <MasteryModal
            hud={hud}
            onClose={() => setMasteryOpen(false)}
            onUpgradeSkill={handleUpgradeSkill}
          />
        )}

        {trialTowerOpen && hud.phase === 'playing' && !hud.webglError && (
          <TrialTowerModal
            hud={hud}
            onClose={() => setTrialTowerOpen(false)}
            onStartFloor={handleStartTrialFloor}
            onExitTower={handleExitTrialTower}
          />
        )}

        {hud.phase === 'paused' &&
          !hud.webglError &&
          !settingsOpen &&
          !multiplayerOpen &&
          !profileOpen && (
            <WorkshopModal
              mode={workshopOpen ? 'workshop' : 'pause'}
              initialTab={workshopTab}
              hud={hud}
              onClose={closeModals}
              onSwitchTab={setWorkshopTab}
              onForgeWeapon={handleForgeWeapon}
              onEquipWeapon={handleEquipWeapon}
              onCraftArmor={handleCraftArmor}
              onEquipArmor={handleEquipArmor}
              onCraftPotion={() => engineRef.current?.craftPotion()}
              onUsePotion={() => engineRef.current?.usePotion()}
              onEatFood={handleEatFood}
              onSetHotbarSlot={handleSetHotbarSlot}
              onSpawnEgg={handleSpawnEgg}
              onUpgradeBoots={() => engineRef.current?.upgradeBoots()}
              onExpandWorld={() => engineRef.current?.expandWorld()}
              onSaveGame={handleSaveGame}
              onLoadGame={handleLoadGame}
              onResetWorld={handleResetWorld}
              onExportSave={handleExportSaveDownload}
              onImportSave={(raw) => {
                handleImportSave(raw);
              }}
              onOpenSettings={() => setSettingsOpen(true)}
              onOpenMultiplayer={() => setMultiplayerOpen(true)}
              onReturnToTitle={handleReturnToTitle}
            />
          )}
      </Suspense>
    </main>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <ArchePawApp />
    </AppErrorBoundary>
  );
}
