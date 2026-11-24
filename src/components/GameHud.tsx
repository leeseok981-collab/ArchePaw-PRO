import React, { useEffect, useState } from 'react';
import {
  Gamepad2,
  Volume2,
  VolumeX,
  Pause,
  ChevronDown,
  ChevronUp,
  Hammer,
  Flame,
  Sprout,
  Compass,
  Sun,
  Moon,
  CloudRain,
  CloudLightning,
  CloudFog,
  Sunrise,
  Sunset,
  Play,
  SlidersHorizontal,
  Axe,
  Pickaxe,
  Sword,
  Backpack,
  Settings2,
  Sparkles,
  Hand,
  X,
  Music,
  ScrollText,
  ChevronLeft,
  ChevronRight,
  Check,
  Gift,
  FlaskConical,
  Smile,
  Heart,
  Coffee,
  PartyPopper,
  Award,
  Shield,
  Home,
  Save,
  RotateCcw,
  RotateCw,
  Move,
  Trash2,
  MousePointerClick,
  CheckCircle2,
  AlertCircle,
  Palette,
  DoorOpen,
  Swords,
  Zap,
  Crown,
  AlertTriangle,
  Copy,
  Grid3X3,
  ArrowUpDown,
  MapPin,
  Sofa,
  Users,
  Link2,
  Wrench,
  ShieldCheck,
  Crosshair,
  Wand2,
  Snowflake,
  Waves,
  ShieldAlert,
} from 'lucide-react';
import {
  ARMORS_CATALOG,
  ELEMENT_META,
  EmoteId,
  EMOTES_CATALOG,
  FloatingFeedback,
  getClassSkillsCatalog,
  getClassSpec,
  getHousingPieceCost,
  getHousingRepairCost,
  HOTBAR_PICKER_OPTIONS,
  HotbarItemId,
  HOUSING_CATALOG,
  HOUSING_COLORS,
  HOUSING_MATERIALS,
  HOUSING_STAGES,
  HousingColorId,
  HousingKind,
  HousingMaterial,
  HousingStageId,
  HudSnapshot,
  Inventory,
  QuestId,
  TimePreset,
  TRIAL_TOWER_FLOORS,
  WarriorSkillId,
  WeaponId,
  WEAPONS_CATALOG,
  WeatherKind,
  WORLD_TIERS,
} from '../game/types';
import { formatSavedTime } from '../game/saveSystem';
import { WorkshopTab } from './WorkshopModal';
import { WeatherScreenOverlay } from './WeatherScreenOverlay';

interface GameHudProps {
  hud: HudSnapshot;
  feedbacks: FloatingFeedback[];
  muted: boolean;
  questLogOpen: boolean;
  emoteWheelOpen: boolean;
  masteryOpen: boolean;
  onToggleQuestLog: () => void;
  onToggleEmoteWheel: () => void;
  onToggleMastery: () => void;
  onCastSkill: (skillId: WarriorSkillId) => void;
  onTriggerEmote: (id: EmoteId) => void;
  onCancelEmote: () => void;
  onClaimQuest: (id: QuestId) => void;
  onToggleBgm: () => void;
  onToggleMute: () => void;
  onPause: () => void;
  onInteract: () => void;
  onActivateHotbarSlot: (slotIndex: number) => void;
  onSetHotbarSlot: (slotIndex: number, itemId: HotbarItemId) => void;
  onToggleAutoEquip: () => void;
  onOpenWorkshop: (tab: WorkshopTab) => void;
  onSetTimePreset: (preset: TimePreset) => void;
  onSetTimeOfDay: (hours: number) => void;
  onToggleTimePaused: () => void;
  onSetWeather: (weather: WeatherKind) => void;
  onToggleAutoWeather: () => void;
  onToggleHousing: () => void;
  onExitHousing: () => void;
  onSelectBlueprint: (kind: HousingKind) => void;
  onSelectHousingMaterial: (material: HousingMaterial) => void;
  onSelectHousingColor: (color: HousingColorId) => void;
  onPaintConnectedStructure: (color: HousingColorId) => void;
  onToggleDoor: () => void;
  onEnterHousingEdit: () => void;
  onRotateHousing: (deltaSteps: number) => void;
  onSwapTileKind: (kind: HousingKind) => void;
  onConfirmHousing: () => void;
  onStartMovingHouse: () => void;
  onCancelMovingHouse: () => void;
  onDemolishHouse: () => void;
  onSetHousingStage: (stage: HousingStageId) => void;
  onClaimLandPlot: () => void;
  onToggleGridSnap: () => void;
  onToggleFreeRotate: () => void;
  onAdjustHousingHeight: (delta: number) => void;
  onResetHousingHeight: () => void;
  onDuplicateHouse: () => void;
  onRepairHouse: () => void;
  onGetShareUrl: () => string;
  onSetPlayerName: (name: string) => void;
  onJoinRoom: (roomId: string) => void;
  mobileTouchEnabled: boolean;
  onToggleMobileTouch: () => void;
  onSaveGame: () => void;
  onOpenTrialTower: () => void;
  onStartTrialFloor: (floor: number) => void;
  onExitTrialTower: () => void;
}

const TIME_PRESETS: Array<{ id: TimePreset; label: string }> = [
  { id: 'dawn', label: '새벽' },
  { id: 'noon', label: '낮' },
  { id: 'sunset', label: '노을' },
  { id: 'night', label: '밤(22:00)' },
];

const WEATHER_OPTIONS: Array<{ id: WeatherKind; label: string }> = [
  { id: 'clear', label: '맑음' },
  { id: 'rain', label: '보슬비' },
  { id: 'storm', label: '뇌우' },
  { id: 'snow', label: '눈' },
  { id: 'fog', label: '안개' },
];

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  feedbacks,
  muted,
  questLogOpen,
  emoteWheelOpen,
  masteryOpen,
  onToggleQuestLog,
  onToggleEmoteWheel,
  onToggleMastery,
  onCastSkill,
  onTriggerEmote,
  onCancelEmote,
  onClaimQuest,
  onToggleBgm,
  onToggleMute,
  onPause,
  onInteract,
  onActivateHotbarSlot,
  onSetHotbarSlot,
  onToggleAutoEquip,
  onOpenWorkshop,
  onSetTimePreset,
  onSetTimeOfDay,
  onToggleTimePaused,
  onSetWeather,
  onToggleAutoWeather,
  onToggleHousing,
  onExitHousing,
  onSelectBlueprint,
  onSelectHousingMaterial,
  onSelectHousingColor,
  onPaintConnectedStructure,
  onToggleDoor,
  onEnterHousingEdit,
  onRotateHousing,
  onSwapTileKind,
  onConfirmHousing,
  onStartMovingHouse,
  onCancelMovingHouse,
  onDemolishHouse,
  onSetHousingStage,
  onClaimLandPlot,
  onToggleGridSnap,
  onToggleFreeRotate,
  onAdjustHousingHeight,
  onResetHousingHeight,
  onDuplicateHouse,
  onRepairHouse,
  onGetShareUrl,
  onSetPlayerName,
  onJoinRoom,
  mobileTouchEnabled,
  onToggleMobileTouch,
  onSaveGame,
  onOpenTrialTower,
  onStartTrialFloor,
  onExitTrialTower,
}) => {
  const [isCompactViewport, setIsCompactViewport] = useState<boolean>(
    () => typeof window !== 'undefined' && window.innerWidth < 768,
  );
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(
    () => typeof window !== 'undefined' && window.innerWidth < 768,
  );
  const [envDrawerOpen, setEnvDrawerOpen] = useState(false);
  const [hotbarEditMode, setHotbarEditMode] = useState(false);
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [showAllPieces, setShowAllPieces] = useState(false);
  const [minimapWide, setMinimapWide] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [mpPopoverOpen, setMpPopoverOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [roomDraft, setRoomDraft] = useState('');
  const [roomRegisterNotice, setRoomRegisterNotice] = useState<string | null>(null);
  const [minimapLayers, setMinimapLayers] = useState({
    resources: true,
    saplings: true,
    combat: true,
    housing: true,
  });

  useEffect(() => {
    const onResize = () => setIsCompactViewport(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    setAvatarFailed(false);
  }, [hud.playerClass]);

  const handleCopyShareLink = () => {
    const shareUrl = onGetShareUrl();
    const markCopied = () => {
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2200);
    };
    const fallbackCopy = () => {
      try {
        const ta = document.createElement('textarea');
        ta.value = shareUrl;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        markCopied();
      } catch {
        // Clipboard unavailable in restricted context
      }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).then(markCopied).catch(fallbackCopy);
    } else {
      fallbackCopy();
    }
  };

  const handleCopyRoomCodeOnly = () => {
    const code = hud.multiplayer.roomId || 'main';
    const mark = () => {
      setCodeCopied(true);
      window.setTimeout(() => setCodeCopied(false), 1800);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(mark).catch(() => {});
    }
  };

  const parseRoomCodeOrUrl = (raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    try {
      if (trimmed.includes('://') || trimmed.includes('?room=') || trimmed.includes('#room=')) {
        const normalized = trimmed.startsWith('http')
          ? trimmed
          : `https://local.invalid/${trimmed.replace(/^\/+/, '')}`;
        const u = new URL(normalized);
        const q = u.searchParams.get('room');
        if (q) return q.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 28);
        const hm = u.hash.match(/room=([a-zA-Z0-9_-]{1,28})/);
        if (hm?.[1]) return hm[1];
      }
    } catch {
      // Fallback below
    }
    const m = trimmed.match(/[?&#]room=([a-zA-Z0-9_-]{1,28})/);
    if (m?.[1]) return m[1];
    return trimmed.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 28);
  };

  const hpPct = Math.round((hud.hp / Math.max(hud.maxHp, 1)) * 100);
  const staminaPct = Math.round((hud.stamina / Math.max(hud.maxStamina, 1)) * 100);
  const expPct = Math.round((hud.exp / Math.max(hud.nextExp, 1)) * 100);

  const equippedSpec =
    WEAPONS_CATALOG.find((w) => w.id === hud.equippedWeapon) || WEAPONS_CATALOG[0];

  const equippedArmorSpec =
    ARMORS_CATALOG.find((a) => a.id === hud.equippedArmor) || ARMORS_CATALOG[0];

  const activeEmoteMeta = hud.activeEmote
    ? EMOTES_CATALOG.find((e) => e.id === hud.activeEmote) || null
    : null;

  const nextTier = hud.worldTier < WORLD_TIERS.length ? WORLD_TIERS[hud.worldTier] : null;
  const canExpandNow =
    !!nextTier &&
    hud.inventory.wood >= nextTier.unlockCost.wood &&
    hud.inventory.stone >= nextTier.unlockCost.stone &&
    hud.inventory.iron >= nextTier.unlockCost.iron &&
    hud.inventory.crystal >= nextTier.unlockCost.crystal;

  const classSpec = getClassSpec(hud.playerClass);
  const classSkills = getClassSkillsCatalog(hud.playerClass);
  const buffSkillSpec = classSkills.find((s) => s.id === 'warcry') || classSkills[3];

  const canForgeSomething =
    WEAPONS_CATALOG.some((w) => {
      if (w.classId && w.classId !== hud.playerClass) return false;
      if (hud.ownedWeapons.includes(w.id)) return false;
      return (
        hud.inventory.wood >= (w.cost.wood ?? 0) &&
        hud.inventory.stone >= (w.cost.stone ?? 0) &&
        hud.inventory.iron >= (w.cost.iron ?? 0) &&
        hud.inventory.crystal >= (w.cost.crystal ?? 0) &&
        hud.inventory.leather >= (w.cost.leather ?? 0) &&
        hud.inventory.fang >= (w.cost.fang ?? 0) &&
        hud.inventory.essence >= (w.cost.essence ?? 0)
      );
    }) ||
    ARMORS_CATALOG.some((a) => {
      if (a.classId && a.classId !== hud.playerClass) return false;
      if (hud.ownedArmors.includes(a.id)) return false;
      return (
        hud.inventory.wood >= (a.cost.wood ?? 0) &&
        hud.inventory.stone >= (a.cost.stone ?? 0) &&
        hud.inventory.iron >= (a.cost.iron ?? 0) &&
        hud.inventory.crystal >= (a.cost.crystal ?? 0) &&
        hud.inventory.leather >= (a.cost.leather ?? 0) &&
        hud.inventory.fang >= (a.cost.fang ?? 0) &&
        hud.inventory.essence >= (a.cost.essence ?? 0)
      );
    });

  const mapSize = isCompactViewport ? 94 : 132;
  const mapHalf = mapSize / 2;
  const mapRange = minimapWide ? Math.max(150, Math.round(hud.worldRadius * 0.85)) : 68;
  const mapScale = mapHalf / mapRange;

  const renderWeatherIcon = () => {
    if (hud.weather === 'storm') return <CloudLightning className="w-3.5 h-3.5 text-[#93c5fd]" />;
    if (hud.weather === 'rain') return <CloudRain className="w-3.5 h-3.5 text-[#7dd3fc]" />;
    if (hud.weather === 'snow') return <Snowflake className="w-3.5 h-3.5 text-[#e0f2fe]" />;
    if (hud.weather === 'fog') return <CloudFog className="w-3.5 h-3.5 text-[#cbd5e1]" />;
    if (hud.timePhaseLabel === '밤') return <Moon className="w-3.5 h-3.5 text-[#bfdbfe]" />;
    if (hud.timePhaseLabel === '새벽') return <Sunrise className="w-3.5 h-3.5 text-[#fdba74]" />;
    if (hud.timePhaseLabel === '노을') return <Sunset className="w-3.5 h-3.5 text-[#fb923c]" />;
    return <Sun className="w-3.5 h-3.5 text-[#fde047]" />;
  };

  const renderEmoteIcon = (id: EmoteId) => {
    switch (id) {
      case 'wave':
        return <Hand className="w-4 h-4 text-[#fde047]" />;
      case 'sit':
        return <Coffee className="w-4 h-4 text-[#86efac]" />;
      case 'cheer':
        return <PartyPopper className="w-4 h-4 text-[#fb923c]" />;
      case 'dance':
        return <Music className="w-4 h-4 text-[#67e8f9]" />;
      case 'bow':
        return <Shield className="w-4 h-4 text-[#93c5fd]" />;
      case 'victory':
        return <Award className="w-4 h-4 text-[#f59e0b]" />;
    }
  };

  const renderHotbarIcon = (itemId: HotbarItemId, owned: boolean) => {
    const dim = owned ? '' : 'opacity-45';
    switch (itemId) {
      case 'weapon:crystal_sword':
        return <Sword className={`w-4 h-4 text-[#67e8f9] ${dim}`} />;
      case 'weapon:hunter_blade':
        return <Sword className={`w-4 h-4 text-[#fca5a5] ${dim}`} />;
      case 'weapon:rune_greatsword':
        return <Sword className={`w-4 h-4 text-[#a5f3fc] ${dim}`} />;
      case 'weapon:stone_axe':
        return <Axe className={`w-4 h-4 text-[#f3c37a] ${dim}`} />;
      case 'weapon:iron_axe':
        return <Axe className={`w-4 h-4 text-[#fde68a] ${dim}`} />;
      case 'weapon:essence_battleaxe':
        return <Axe className={`w-4 h-4 text-[#6ee7b7] ${dim}`} />;
      case 'weapon:stone_pickaxe':
        return <Pickaxe className={`w-4 h-4 text-[#93c5fd] ${dim}`} />;
      case 'weapon:iron_pickaxe':
        return <Pickaxe className={`w-4 h-4 text-[#dbeafe] ${dim}`} />;
      case 'weapon:recurve_bow':
        return <Crosshair className={`w-4 h-4 text-[#a3e635] ${dim}`} />;
      case 'weapon:windstrider_bow':
        return <Crosshair className={`w-4 h-4 text-[#4ade80] ${dim}`} />;
      case 'weapon:azure_star_bow':
        return <Crosshair className={`w-4 h-4 text-[#38bdf8] ${dim}`} />;
      case 'weapon:emerald_wing_staff':
        return <Sparkles className={`w-4 h-4 text-[#34d399] ${dim}`} />;
      case 'weapon:sanctuary_staff':
        return <Sparkles className={`w-4 h-4 text-[#6ee7b7] ${dim}`} />;
      case 'weapon:seraphic_staff':
        return <Sparkles className={`w-4 h-4 text-[#fde047] ${dim}`} />;
      case 'weapon:crystal_wand':
        return <Wand2 className={`w-4 h-4 text-[#67e8f9] ${dim}`} />;
      case 'weapon:amethyst_wand':
        return <Wand2 className={`w-4 h-4 text-[#c084fc] ${dim}`} />;
      case 'weapon:astral_nova_staff':
        return <Wand2 className={`w-4 h-4 text-[#a78bfa] ${dim}`} />;
      case 'weapon:tactical_dagger':
        return <Zap className={`w-4 h-4 text-[#94a3b8] ${dim}`} />;
      case 'weapon:viper_dagger':
        return <Zap className={`w-4 h-4 text-[#4ade80] ${dim}`} />;
      case 'weapon:eclipse_dagger':
        return <Zap className={`w-4 h-4 text-[#38bdf8] ${dim}`} />;
      case 'action:sapling':
        return <Sprout className="w-4 h-4 text-[#86efac]" />;
      case 'action:lantern':
        return <Flame className="w-4 h-4 text-[#fde047]" />;
      case 'action:potion':
        return <FlaskConical className="w-4 h-4 text-[#4ade80]" />;
      case 'action:gather':
        return <Hand className="w-4 h-4 text-[#f7f3ea]" />;
      case 'action:forge':
        return <Hammer className="w-4 h-4 text-[#f59e0b]" />;
      case 'action:housing':
        return <Home className="w-4 h-4 text-[#38f2c8]" />;
      case 'action:inventory':
        return <Backpack className="w-4 h-4 text-[#7dd3fc]" />;
      case 'action:expand':
        return <Compass className="w-4 h-4 text-[#86efac]" />;
    }
  };

  const getSlotBadgeText = (itemId: HotbarItemId): { text: string; tone: string } | null => {
    if (itemId.startsWith('weapon:')) {
      const wId = itemId.slice(7) as WeaponId;
      if (hud.equippedWeapon === wId) return { text: '장착', tone: 'text-[#67e8f9]' };
      if (!hud.ownedWeapons.includes(wId)) return { text: '미제련', tone: 'text-[#94a3b8]' };
      return null;
    }
    if (itemId === 'action:sapling') {
      return {
        text: `${hud.inventory.wood}`,
        tone: hud.inventory.wood >= 1 ? 'text-[#86efac]' : 'text-[#f87171]',
      };
    }
    if (itemId === 'action:lantern') {
      const craftable = Math.min(Math.floor(hud.inventory.wood / 2), hud.inventory.stone);
      return {
        text: `${craftable}`,
        tone: craftable >= 1 ? 'text-[#fde047]' : 'text-[#94a3b8]',
      };
    }
    if (itemId === 'action:potion') {
      return {
        text: `${hud.inventory.potion}`,
        tone: hud.inventory.potion >= 1 ? 'text-[#4ade80]' : 'text-[#94a3b8]',
      };
    }
    if (itemId === 'action:forge' && canForgeSomething) {
      return { text: 'NEW', tone: 'text-[#fbbf24]' };
    }
    if (itemId === 'action:housing' && hud.housing.placedCount > 0) {
      return { text: `${hud.housing.placedCount}`, tone: 'text-[#38f2c8]' };
    }
    if (itemId === 'action:expand' && canExpandNow) {
      return { text: '가능', tone: 'text-[#62e5ff]' };
    }
    return null;
  };

  const canAffordHousing = (cost: Partial<Inventory>) =>
    hud.inventory.wood >= (cost.wood ?? 0) &&
    hud.inventory.stone >= (cost.stone ?? 0) &&
    hud.inventory.iron >= (cost.iron ?? 0);

  const formatHousingCost = (cost: Partial<Inventory>) => {
    const parts: string[] = [];
    if (cost.wood) parts.push(`목${cost.wood}`);
    if (cost.stone) parts.push(`석${cost.stone}`);
    if (cost.iron) parts.push(`철${cost.iron}`);
    return parts.join(' ');
  };

  const handleSlotClick = (idx: number) => {
    if (hotbarEditMode) {
      setEditingSlotIndex((cur) => (cur === idx ? null : idx));
      setEnvDrawerOpen(false);
    } else {
      onActivateHotbarSlot(idx);
    }
  };

  const handleSlotRightClick = (e: React.MouseEvent, idx: number) => {
    e.preventDefault();
    setEnvDrawerOpen(false);
    setEditingSlotIndex((cur) => (cur === idx ? null : idx));
  };

  const housingActive = hud.housing.mode !== 'off';
  const hasUpperDrawer = !dockCollapsed && (envDrawerOpen || editingSlotIndex !== null);

  const bossFilterHex =
    hud.trialTower.activeFloor !== null ? hud.trialTower.activeFilterHex : null;
  const bossEnraged = Boolean(hud.activeBoss?.enraged);
  const breathPct = Math.max(
    0,
    Math.min(100, Math.round((hud.breath / Math.max(hud.maxBreath, 1)) * 100)),
  );
  const totalTrialFloors = TRIAL_TOWER_FLOORS.length;

  return (
    <>
      <WeatherScreenOverlay weather={hud.weather} windStrength={hud.windStrength} />
      {/* INTENSE TRIAL TOWER BOSS BATTLE SCREEN COLOR FILTER */}
      {bossFilterHex && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-[4] pointer-events-none transition-opacity duration-300"
          style={{
            background: bossEnraged
              ? `radial-gradient(ellipse at center, ${bossFilterHex}18 28%, ${bossFilterHex}62 78%, ${bossFilterHex}a8 100%)`
              : `radial-gradient(ellipse at center, ${bossFilterHex}10 38%, ${bossFilterHex}42 82%, ${bossFilterHex}78 100%)`,
            boxShadow: bossEnraged
              ? `inset 0 0 110px ${bossFilterHex}cc, inset 0 0 36px #ef4444aa`
              : `inset 0 0 85px ${bossFilterHex}99`,
          }}
        />
      )}
      <div className="fixed inset-0 z-10 pointer-events-none select-none">
      {/* TOP-LEFT: Compact Character Plate (Responsive for PC & Mobile) */}
      <div className="absolute top-2.5 left-2.5 sm:top-4 sm:left-4 flex items-center gap-2 sm:gap-3 px-2.5 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-[#141920]/88 border border-white/10 shadow-md pointer-events-auto">
        <div
          className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden border bg-[#f5efe4] shrink-0"
          style={{ borderColor: `${classSpec.accentHex}99` }}
        >
          {!avatarFailed ? (
            <img
              src={classSpec.portraitUrl}
              alt={`${classSpec.name} (${classSpec.catTitle}) 정면 초상화`}
              referrerPolicy="no-referrer"
              onError={() => setAvatarFailed(true)}
              className="absolute max-w-none pointer-events-none"
              style={{
                width: `${classSpec.portraitCrop.widthPct}%`,
                height: 'auto',
                left: `${classSpec.portraitCrop.leftPct}%`,
                top: `${classSpec.portraitCrop.topPct}%`,
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#4f321c] text-[#e6b43c] font-bold text-sm">
              {classSpec.name.slice(0, 1)}
            </div>
          )}
        </div>

        <div className="flex flex-col min-w-[126px] sm:min-w-[172px]">
          <div className="flex items-baseline justify-between gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => {
                setNameDraft(hud.multiplayer.playerName || classSpec.defaultNickname);
                setRoomDraft(hud.multiplayer.roomId || 'main');
                setMpPopoverOpen(true);
              }}
              title="클릭하여 닉네임 변경"
              className="text-xs sm:text-sm font-bold text-[#f7f3ea] hover:text-[#fde68a] transition-colors whitespace-nowrap truncate max-w-[96px] sm:max-w-[132px] text-left cursor-pointer"
            >
              {hud.multiplayer.playerName || classSpec.defaultNickname}
            </button>
            <span className="text-[11px] sm:text-xs font-mono-num whitespace-nowrap shrink-0 flex items-center gap-1">
              <span className="font-semibold" style={{ color: classSpec.accentHex }}>
                {classSpec.name}
              </span>
              <span className="text-[#94a3b8]">·</span>
              <span className="text-[#e6b43c]">Lv.{hud.level}</span>
            </span>
          </div>

          <div className="text-[10px] sm:text-[11px] text-[#aeb7c4] mt-0.5 whitespace-nowrap truncate max-w-[140px] sm:max-w-none">
            {hud.zoneName}
            <span className="hidden sm:inline"> · {equippedSpec.name}</span>
          </div>
          <button
            type="button"
            onClick={() => onOpenWorkshop('armor')}
            title="방어구 제작 및 외형 교체 열기"
            className="hidden sm:flex mt-0.5 items-center gap-1.5 text-[10px] text-[#cbd5e1] hover:text-[#f7f3ea] transition-colors cursor-pointer text-left whitespace-nowrap"
          >
            <span
              className="w-2 h-2 rounded-sm border border-white/30 shrink-0"
              style={{ backgroundColor: equippedArmorSpec.accentHex }}
            />
            <span className="truncate">{equippedArmorSpec.name}</span>
          </button>

          {/* HP Bar */}
          <div className="mt-1.5 flex items-center gap-1.5">
            <Heart className="w-3 h-3 text-[#f87171] shrink-0" />
            <div className="flex-1 h-1.5 rounded-full bg-[#242c37] overflow-hidden">
              <div
                className="h-full rounded-full transition-transform duration-100 origin-left"
                style={{
                  transform: `scaleX(${hpPct / 100})`,
                  backgroundColor: hpPct < 35 ? '#ef4444' : '#f87171',
                }}
              />
            </div>
            <span className="text-[10px] text-[#fecaca] font-mono-num w-11 text-right">
              {hud.hp}/{hud.maxHp}
            </span>
          </div>

          {/* Stamina Bar */}
          <div className="mt-1 flex items-center gap-1.5">
            <span className="text-[9px] font-mono-num text-[#e6b43c] w-3 text-center shrink-0">S</span>
            <div className="flex-1 h-1.5 rounded-full bg-[#242c37] overflow-hidden">
              <div
                className="h-full rounded-full transition-transform duration-75 origin-left"
                style={{
                  transform: `scaleX(${staminaPct / 100})`,
                  backgroundColor: hud.isSprinting ? '#62e5ff' : '#e6b43c',
                }}
              />
            </div>
            <span className="text-[10px] text-[#cbd5e1] font-mono-num w-11 text-right">
              {hud.stamina}
            </span>
          </div>

          <div className="mt-1 h-[2px] w-full rounded-full bg-[#242c37] overflow-hidden">
            <div
              className="h-full bg-[#7dd3fc] origin-left transition-transform duration-150"
              style={{ transform: `scaleX(${expPct / 100})` }}
            />
          </div>

          {activeEmoteMeta && (
            <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-[#67e8f9]">
              <span>감정표현: {activeEmoteMeta.label}</span>
              <button
                type="button"
                onClick={onCancelEmote}
                className="underline text-[#cbd5e1] hover:text-white cursor-pointer"
              >
                해제
              </button>
            </div>
          )}

          {(hud.housing.inCompletedHouse || hud.housing.damagedPieceCount > 0) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              {hud.housing.inCompletedHouse && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#11312a] border border-[#38f2c8]/45 text-[10px] font-semibold text-[#6ee7b7] whitespace-nowrap">
                  <ShieldCheck className="w-3 h-3 shrink-0" />
                  <span>완성 가옥 · 몬스터 차단</span>
                </span>
              )}
              {hud.housing.damagedPieceCount > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#361d1c] border border-[#f87171]/45 text-[10px] font-semibold text-[#fca5a5] whitespace-nowrap">
                  <Wrench className="w-3 h-3 shrink-0" />
                  <span>파손 {hud.housing.damagedPieceCount}개 · F 수리</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* TOP-CENTER: Mid-Boss & Trial Tower Boss Health, Weakness Element & Telegraph Bar */}
      {hud.activeBoss && (() => {
        const bossEl = ELEMENT_META[hud.activeBoss.element] || ELEMENT_META.earth;
        const bossWeak = ELEMENT_META[hud.activeBoss.weakness] || ELEMENT_META.fire;
        return (
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 w-[min(490px,60vw)] px-4 py-2.5 rounded-xl bg-[#141920]/94 border shadow-2xl"
            style={{
              borderColor: hud.activeBoss.enraged
                ? '#ef4444cc'
                : bossFilterHex
                  ? `${bossFilterHex}aa`
                  : 'rgba(245, 158, 11, 0.55)',
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Crown
                  className={`w-4 h-4 shrink-0 ${
                    hud.activeBoss.enraged ? 'text-[#ef4444]' : 'text-[#f59e0b]'
                  }`}
                />
                <span className="text-xs font-bold text-[#f7f3ea] truncate">
                  {hud.activeBoss.name}
                </span>
                <span className="text-[10px] text-[#94a3b8] hidden sm:inline truncate">
                  · {hud.activeBoss.title}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 font-mono-num">
                {hud.activeBoss.enraged && (
                  <span className="text-[10px] font-bold text-[#fca5a5] whitespace-nowrap">
                    2페이즈 광폭화
                  </span>
                )}
                <span className="text-[11px] font-bold text-[#fde68a]">
                  {hud.activeBoss.hp} / {hud.activeBoss.maxHp}
                </span>
              </div>
            </div>

            {/* Monster Element & Weakness Readout */}
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[10px]">
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-semibold border whitespace-nowrap"
                  style={{
                    backgroundColor: bossEl.bgHex,
                    borderColor: `${bossEl.hex}66`,
                    color: bossEl.hex,
                  }}
                >
                  <span>속성: {bossEl.label}</span>
                </span>
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-bold border whitespace-nowrap"
                  style={{
                    backgroundColor: bossWeak.bgHex,
                    borderColor: `${bossWeak.hex}99`,
                    color: bossWeak.hex,
                  }}
                >
                  <ShieldAlert className="w-3 h-3 shrink-0" />
                  <span>약점: {bossWeak.label} ({bossWeak.shortLabel})</span>
                </span>
              </div>
              {hud.trialTower.inDungeon && hud.trialTower.activeFloor !== null && (
                <span className="font-mono-num font-bold text-[#7dd3fc] whitespace-nowrap">
                  시련의 탑 던전 {hud.trialTower.activeFloor}층
                </span>
              )}
            </div>

            <div className="mt-1.5 h-2.5 w-full rounded-full bg-[#242c37] overflow-hidden border border-white/8">
              <div
                className="h-full origin-left transition-transform duration-100"
                style={{
                  transform: `scaleX(${Math.max(0, hud.activeBoss.hp / Math.max(hud.activeBoss.maxHp, 1))})`,
                  backgroundColor: hud.activeBoss.enraged
                    ? '#ef4444'
                    : bossFilterHex || '#f59e0b',
                }}
              />
            </div>

            {hud.activeBoss.telegraphLabel && (
              <div className="mt-1.5 space-y-1">
                <div className="flex items-center justify-between text-[10px] font-semibold text-[#fca5a5]">
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-[#ef4444]" />
                    <span>{hud.activeBoss.telegraphLabel}</span>
                  </span>
                  <span className="text-[#fde68a]">E 돌진으로 차단 가능</span>
                </div>
                <div className="h-1 w-full rounded-full bg-[#2a1a1d] overflow-hidden">
                  <div
                    className="h-full bg-[#ef4444] origin-left"
                    style={{ transform: `scaleX(${hud.activeBoss.telegraphProgress})` }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* TOP-CENTER: Transient World Banner Notification */}
      {hud.bannerMessage && (
        <div
          className="absolute left-1/2 -translate-x-1/2 px-5 py-2 rounded-lg bg-[#141920]/92 border border-[#e6b43c]/40 text-sm font-medium text-[#f7f3ea] shadow-md whitespace-nowrap transition-all"
          style={{ top: hud.activeBoss ? (hud.activeBoss.telegraphLabel ? '114px' : '86px') : '20px' }}
        >
          {hud.bannerMessage}
        </div>
      )}

      {/* TOP-CENTER: Trial Tower Quick Controls (30F Dungeon / Next Floor / Near Spire) */}
      {(hud.trialTower.activeFloor !== null ||
        hud.trialTower.lastClearedFloor !== null ||
        hud.trialTower.nearTower ||
        hud.trialTower.inDungeon) && (
        <div
          className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#131b26]/92 border border-[#62e5ff]/45 shadow-lg pointer-events-auto"
          style={{
            top: hud.activeBoss
              ? hud.bannerMessage
                ? '160px'
                : hud.activeBoss.telegraphLabel
                  ? '138px'
                  : '108px'
              : hud.bannerMessage
                ? '66px'
                : '20px',
          }}
        >
          <Crown className="w-3.5 h-3.5 text-[#62e5ff] shrink-0" />
          {hud.trialTower.activeFloor !== null ? (
            <>
              <span className="text-xs font-bold text-[#e0f2fe] whitespace-nowrap font-mono-num">
                시련의 탑 던전 {hud.trialTower.activeFloor}층 도전 중
              </span>
              <button
                type="button"
                onClick={onExitTrialTower}
                className="px-2.5 py-1 rounded-lg bg-[#351b22] hover:bg-[#49232d] border border-[#f87171]/45 text-[11px] font-semibold text-[#fecaca] cursor-pointer whitespace-nowrap"
              >
                던전 퇴장
              </button>
            </>
          ) : hud.trialTower.lastClearedFloor !== null ? (
            <>
              <span className="text-xs font-bold text-[#86efac] whitespace-nowrap font-mono-num">
                {hud.trialTower.lastClearedFloor}층 클리어!
              </span>
              {hud.trialTower.lastClearedFloor < totalTrialFloors && (
                <button
                  type="button"
                  onClick={() => onStartTrialFloor(hud.trialTower.lastClearedFloor! + 1)}
                  className="px-2.5 py-1 rounded-lg bg-[#e6b43c] hover:bg-[#f0c455] text-[#17130d] text-[11px] font-bold cursor-pointer whitespace-nowrap"
                >
                  {hud.trialTower.lastClearedFloor + 1}층 올라가기
                </button>
              )}
              <button
                type="button"
                onClick={onOpenTrialTower}
                className="px-2.5 py-1 rounded-lg bg-[#1d3247] hover:bg-[#25405b] border border-[#62e5ff]/45 text-[11px] font-semibold text-[#bae6fd] cursor-pointer whitespace-nowrap"
              >
                층 선택
              </button>
              {hud.trialTower.inDungeon && (
                <button
                  type="button"
                  onClick={onExitTrialTower}
                  className="px-2.5 py-1 rounded-lg bg-[#27202b] hover:bg-[#352a3b] border border-white/15 text-[11px] font-semibold text-[#e2e8f0] cursor-pointer whitespace-nowrap"
                >
                  필드 복귀
                </button>
              )}
            </>
          ) : (
            <>
              <span className="text-xs font-bold text-[#e0f2fe] whitespace-nowrap">
                북부 시련의 탑 (최고 {hud.trialTower.highestClearedFloor}/{totalTrialFloors}층)
              </span>
              <button
                type="button"
                onClick={onOpenTrialTower}
                className="px-2.5 py-1 rounded-lg bg-[#62e5ff] hover:bg-[#8beeff] text-[#0b1620] text-[11px] font-bold cursor-pointer whitespace-nowrap"
              >
                던전 입장
              </button>
            </>
          )}
        </div>
      )}

      {/* TOP-RIGHT: Compact Clock/Weather Readout + Minimap Radar + Audio/Pause */}
      <div className="absolute top-4 right-4 flex flex-col items-end gap-2 pointer-events-auto">
        <div className="flex items-center gap-2">
          {canExpandNow && (
            <button
              type="button"
              onClick={() => onOpenWorkshop('expand')}
              className="px-3 py-2 rounded-lg bg-[#1e3a4a]/95 hover:bg-[#244a5f] border border-[#62e5ff]/60 text-xs font-semibold text-[#c8f5ff] transition-colors cursor-pointer whitespace-nowrap"
            >
              월드 확장 가능
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setEditingSlotIndex(null);
              setEnvDrawerOpen((v) => !v);
            }}
            title="시간 및 날씨 설정 열기"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#141920]/88 hover:bg-[#1f2733] border border-white/10 text-xs text-[#e2e8f0] transition-colors cursor-pointer whitespace-nowrap"
          >
            {renderWeatherIcon()}
            <span className="font-mono-num font-semibold">{hud.timeClockText}</span>
            <span className="text-[#94a3b8]">·</span>
            <span>{hud.timePhaseLabel}</span>
            <span className="text-[#94a3b8]">·</span>
            <span>{hud.weatherLabel}</span>
          </button>
          {/* Multiplayer Room & Share Link Widget */}
          <div className="relative flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setNameDraft(hud.multiplayer.playerName);
                setRoomDraft(hud.multiplayer.roomId);
                setMpPopoverOpen((v) => !v);
              }}
              title={`멀티플레이 월드 방 (${hud.multiplayer.roomId}) · 클릭해 접속자, 방 코드 이동 및 닉네임 설정`}
              className="flex items-center gap-1.5 px-2 sm:px-2.5 h-9 rounded-lg bg-[#141920]/88 hover:bg-[#1f2936] border border-[#62e5ff]/35 text-xs font-semibold text-[#bae6fd] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Users className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span className="font-mono-num">{hud.multiplayer.onlineCount}명</span>
            </button>
            <button
              type="button"
              onClick={handleCopyShareLink}
              title="현재 월드 멀티플레이 접속 링크 복사 (PC·모바일 동일 공유 서버 접속)"
              className={`flex items-center gap-1 px-2 sm:px-2.5 h-9 rounded-lg border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                linkCopied
                  ? 'bg-[#15352d] border-[#38f2c8] text-[#5df7d4]'
                  : 'bg-[#141920]/88 hover:bg-[#1f2a36] border-[#e6b43c]/40 text-[#fde68a]'
              }`}
            >
              {linkCopied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{linkCopied ? '링크 복사됨' : '링크 공유'}</span>
            </button>

            {mpPopoverOpen && (
              <div className="absolute right-0 top-11 w-72 p-3 rounded-xl bg-[#131922]/96 border border-white/14 shadow-2xl z-30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#f7f3ea]">
                    <Users className="w-3.5 h-3.5 text-[#38bdf8]" />
                    <span>실시간 동시 접속 월드</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMpPopoverOpen(false)}
                    className="p-0.5 rounded hover:bg-white/10 text-[#94a3b8] hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-[11px] text-[#cbd5e1] bg-[#1a2330] rounded-lg px-2.5 py-1.5 border border-white/8 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[#94a3b8]">통합 공유 서버</span>
                    <span
                      className={`font-semibold text-[10px] ${
                        hud.multiplayer.connected ? 'text-[#5df7d4]' : 'text-[#fca5a5]'
                      }`}
                    >
                      {hud.multiplayer.connected
                        ? `연결됨 (${hud.multiplayer.transport === 'http' ? '모바일 HTTP' : '실시간 WS'})`
                        : '서버 재연결 중...'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#94a3b8]">현재 방 코드</span>
                    <span className="font-mono-num font-bold text-[#7dd3fc]">
                      {hud.multiplayer.roomId}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] text-[#94a3b8]">
                    접속 코드 등록 (복사한 링크 또는 방 코드 붙여넣기)
                  </label>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const parsed = parseRoomCodeOrUrl(roomDraft);
                      if (!parsed) {
                        setRoomRegisterNotice('유효한 접속 코드나 링크를 입력해주세요.');
                        return;
                      }
                      setRoomDraft(parsed);
                      onJoinRoom(parsed);
                      setRoomRegisterNotice(`접속 코드 "${parsed}" 등록 완료!`);
                    }}
                    className="flex items-center gap-1"
                  >
                    <input
                      type="text"
                      value={roomDraft}
                      maxLength={220}
                      onChange={(e) => {
                        setRoomDraft(e.target.value);
                        setRoomRegisterNotice(null);
                      }}
                      placeholder="방 코드 또는 공유 링크 붙여넣기"
                      className="flex-1 min-w-0 px-2 py-1 rounded bg-[#0e141c] border border-white/12 text-xs font-mono-num text-[#f7f3ea] focus:outline-none focus:border-[#62e5ff]"
                    />
                    <button
                      type="submit"
                      className="px-2 py-1 rounded bg-[#1d3948] hover:bg-[#274b5e] text-[11px] font-semibold text-[#c8f5ff] cursor-pointer whitespace-nowrap"
                    >
                      코드 등록
                    </button>
                  </form>
                  {roomRegisterNotice && (
                    <div className="text-[10px] text-[#5df7d4]">{roomRegisterNotice}</div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] text-[#94a3b8]">내 닉네임</label>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const clean = nameDraft.trim();
                      if (clean) {
                        onSetPlayerName(clean);
                      }
                    }}
                    className="flex items-center gap-1"
                  >
                    <input
                      type="text"
                      value={nameDraft}
                      maxLength={20}
                      onChange={(e) => setNameDraft(e.target.value)}
                      placeholder="냥기사 이름"
                      className="flex-1 min-w-0 px-2 py-1 rounded bg-[#0e141c] border border-white/12 text-xs text-[#f7f3ea] focus:outline-none focus:border-[#62e5ff]"
                    />
                    <button
                      type="submit"
                      className="px-2 py-1 rounded bg-[#1f3b4a] hover:bg-[#2a5064] text-[11px] font-semibold text-[#c8f5ff] cursor-pointer whitespace-nowrap"
                    >
                      변경
                    </button>
                  </form>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] text-[#94a3b8]">
                    접속 중 ({hud.multiplayer.onlineCount}명)
                  </div>
                  <div className="max-h-24 overflow-y-auto space-y-1 text-[11px]">
                    <div className="flex items-center justify-between px-2 py-1 rounded bg-[#182634] text-[#f7f3ea]">
                      <span className="truncate font-semibold">{hud.multiplayer.playerName} (나)</span>
                      <span className="text-[10px] text-[#5df7d4]">접속</span>
                    </div>
                    {hud.multiplayer.remotePlayers.map((rp) => (
                      <div
                        key={rp.id}
                        className="flex items-center justify-between px-2 py-1 rounded bg-[#18202c] text-[#dce3ec]"
                      >
                        <span className="truncate">{rp.name}</span>
                        <span className="text-[10px] font-mono-num text-[#7dd3fc]">
                          {Math.round(rp.x)},{Math.round(rp.z)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] text-[#94a3b8]">통합 공유 접속 링크 (PC·모바일 동일 서버)</div>
                  <div
                    className="px-2 py-1 rounded bg-[#0e141c] border border-white/10 text-[10px] font-mono-num text-[#93c5fd] truncate select-all"
                    title={onGetShareUrl()}
                  >
                    {onGetShareUrl()}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    className="col-span-2 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-[#38f2c8] hover:bg-[#5df7d4] text-[#0b1c18] text-xs font-bold cursor-pointer"
                  >
                    {linkCopied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                    <span>{linkCopied ? '링크 복사됨' : '동시 접속 링크 복사'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyRoomCodeOnly}
                    className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[#1d2e3d] hover:bg-[#284054] text-[#bae6fd] text-[11px] font-semibold cursor-pointer"
                  >
                    {codeCopied ? <Check className="w-3 h-3 text-[#5df7d4]" /> : <Copy className="w-3 h-3" />}
                    <span>{codeCopied ? '복사됨' : '코드 복사'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onToggleMobileTouch}
            title={mobileTouchEnabled ? '모바일 터치 조작 패드 숨기기' : '모바일 터치 조작 패드 켜기'}
            aria-label="모바일 터치 조작 전환"
            className={`flex items-center justify-center w-9 h-9 rounded-lg border transition-colors cursor-pointer ${
              mobileTouchEnabled
                ? 'bg-[#17323a] border-[#38f2c8]/55 text-[#5df7d4]'
                : 'bg-[#141920]/88 hover:bg-[#1f2732] border-white/10 text-[#aeb7c4]'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onSaveGame}
            title={
              hud.lastSavedAt
                ? `지금 저장하기 (Ctrl+S · 최근 저장 ${formatSavedTime(hud.lastSavedAt)})`
                : '월드 및 하우징 저장하기 (Ctrl+S)'
            }
            aria-label="월드 저장하기"
            className="flex items-center gap-1.5 px-2 sm:px-2.5 h-9 rounded-lg bg-[#141920]/88 hover:bg-[#1f2a35] border border-[#38f2c8]/35 text-xs font-semibold text-[#7cf7dc] transition-colors cursor-pointer whitespace-nowrap"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {hud.lastSavedAt ? formatSavedTime(hud.lastSavedAt) : '저장'}
            </span>
          </button>
          <button
            type="button"
            onClick={onToggleBgm}
            title={
              hud.bgmEnabled
                ? `배경음악 끄기 (재생 중: ${hud.bgmThemeLabel})`
                : '낮/밤 배경음악 켜기'
            }
            aria-label={hud.bgmEnabled ? '배경음악 끄기' : '배경음악 켜기'}
            className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
              hud.bgmEnabled && !muted
                ? 'bg-[#192836]/92 hover:bg-[#23384b] border-[#62e5ff]/40 text-[#7dd3fc]'
                : 'bg-[#141920]/88 hover:bg-[#1f2733] border-white/10 text-[#64748b]'
            }`}
          >
            <Music className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? '소리 켜기' : '음소거'}
            className="w-9 h-9 rounded-lg bg-[#141920]/88 hover:bg-[#1f2733] border border-white/10 flex items-center justify-center text-[#dce3ec] transition-colors cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={onPause}
            aria-label="일시정지 및 저장 관리"
            className="w-9 h-9 rounded-lg bg-[#141920]/88 hover:bg-[#1f2733] border border-white/10 flex items-center justify-center text-[#dce3ec] transition-colors cursor-pointer"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>

        {/* Circular Minimap with Resource, Sapling, Land Plot & Boss Icon Layers */}
        <div
          className="relative rounded-full bg-[#12171e]/92 border border-white/14 overflow-hidden shadow-md"
          style={{ width: mapSize, height: mapSize }}
        >
          <svg width={mapSize} height={mapSize} viewBox={`0 0 ${mapSize} ${mapSize}`}>
            {/* Subtle Cardinal Crosshairs & Range Rings */}
            <line x1={mapHalf} y1={10} x2={mapHalf} y2={mapSize - 10} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <line x1={10} y1={mapHalf} x2={mapSize - 10} y2={mapHalf} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <circle cx={mapHalf} cy={mapHalf} r={mapHalf * 0.52} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <circle
              cx={mapHalf - hud.playerX * mapScale}
              cy={mapHalf - hud.playerZ * mapScale}
              r={hud.worldRadius * mapScale}
              fill="rgba(98, 229, 255, 0.045)"
              stroke="rgba(98, 229, 255, 0.42)"
              strokeWidth="1.2"
              strokeDasharray="3 2"
            />
            {/* Central Lake Indicator (3x expanded world coordinates) */}
            {(() => {
              const lx = mapHalf + (20.0 - hud.playerX) * mapScale;
              const lz = mapHalf + (20.0 - hud.playerZ) * mapScale;
              if (Math.hypot(lx - mapHalf, lz - mapHalf) > mapHalf + 12) return null;
              return (
                <ellipse
                  cx={lx}
                  cy={lz}
                  rx={11.5 * mapScale}
                  ry={9.8 * mapScale}
                  fill="rgba(56, 189, 248, 0.28)"
                  stroke="rgba(125, 211, 252, 0.45)"
                  strokeWidth="0.7"
                />
              );
            })()}

            {/* Pass 1: Claimed Land Plots (underlay) */}
            {minimapLayers.housing &&
              hud.minimapEntities.map((e) => {
                if (e.kind !== 'plot') return null;
                const mx = mapHalf + (e.x - hud.playerX) * mapScale;
                const mz = mapHalf + (e.z - hud.playerZ) * mapScale;
                const rPx = Math.max(6, (e.radius ?? 9) * mapScale);
                if (Math.hypot(mx - mapHalf, mz - mapHalf) > mapHalf + rPx) return null;
                return (
                  <circle
                    key={e.id}
                    cx={mx}
                    cy={mz}
                    r={rPx}
                    fill="rgba(56, 242, 200, 0.12)"
                    stroke="#38f2c8"
                    strokeWidth={1}
                    strokeDasharray="2.5 1.8"
                  />
                );
              })}

            {/* Pass 2: Resources, Saplings, Housing, Monsters & Bosses */}
            {hud.minimapEntities.map((e) => {
              if (e.kind === 'plot') return null;
              const mx = mapHalf + (e.x - hud.playerX) * mapScale;
              const mz = mapHalf + (e.z - hud.playerZ) * mapScale;
              if (Math.hypot(mx - mapHalf, mz - mapHalf) > mapHalf - 4) return null;
              if (
                !e.active &&
                e.kind !== 'landmark' &&
                e.kind !== 'frontier' &&
                e.kind !== 'trial_tower' &&
                e.kind !== 'sapling'
              ) {
                return null;
              }

              // Filter by user-selected minimap icon layers
              if (
                (e.kind === 'tree' || e.kind === 'rock' || e.kind === 'iron' || e.kind === 'crystal') &&
                !minimapLayers.resources
              ) {
                return null;
              }
              if (e.kind === 'sapling' && !minimapLayers.saplings) return null;
              if ((e.kind === 'monster' || e.kind === 'undead' || e.kind === 'boss') && !minimapLayers.combat) {
                return null;
              }
              if ((e.kind === 'housing' || e.kind === 'other_housing') && !minimapLayers.housing) {
                return null;
              }

              // Gatherable Tree: crisp pine-triangle icon
              if (e.kind === 'tree') {
                return (
                  <polygon
                    key={e.id}
                    points={`${mx},${mz - 3.3} ${mx + 2.7},${mz + 2.2} ${mx - 2.7},${mz + 2.2}`}
                    fill="#4ade80"
                    stroke="#14532d"
                    strokeWidth={0.7}
                  />
                );
              }

              // Planted Growing Sapling: distinct twin-leaf sprout icon
              if (e.kind === 'sapling') {
                return (
                  <g key={e.id} transform={`translate(${mx}, ${mz})`}>
                    <circle cx={0} cy={0} r={4.2} fill="rgba(163, 230, 53, 0.22)" />
                    <line x1={0} y1={2.6} x2={0} y2={-1.2} stroke="#bef264" strokeWidth={1.1} strokeLinecap="round" />
                    <ellipse cx={-2} cy={-1.4} rx={1.9} ry={1.1} transform="rotate(-28 -2 -1.4)" fill="#a3e635" />
                    <ellipse cx={2} cy={-1.4} rx={1.9} ry={1.1} transform="rotate(28 2 -1.4)" fill="#84cc16" />
                  </g>
                );
              }

              // Gatherable Rock: stone pentagon icon
              if (e.kind === 'rock') {
                return (
                  <polygon
                    key={e.id}
                    points={`${mx - 2.5},${mz + 1.8} ${mx - 2.8},${mz - 0.7} ${mx - 0.3},${mz - 2.5} ${mx + 2.5},${mz - 0.8} ${mx + 2.2},${mz + 1.8}`}
                    fill="#cbd5e1"
                    stroke="#334155"
                    strokeWidth={0.7}
                  />
                );
              }

              // Iron Ore: steel-blue diamond icon
              if (e.kind === 'iron') {
                return (
                  <polygon
                    key={e.id}
                    points={`${mx},${mz - 3} ${mx + 2.6},${mz} ${mx},${mz + 3} ${mx - 2.6},${mz}`}
                    fill="#93c5fd"
                    stroke="#1e3a8a"
                    strokeWidth={0.7}
                  />
                );
              }

              // Crystal Vein: bright cyan vertical shard
              if (e.kind === 'crystal') {
                return (
                  <polygon
                    key={e.id}
                    points={`${mx},${mz - 3.6} ${mx + 2.2},${mz - 0.4} ${mx},${mz + 3.4} ${mx - 2.2},${mz - 0.4}`}
                    fill="#38bdf8"
                    stroke="#e0f2fe"
                    strokeWidth={0.7}
                  />
                );
              }

              // Nocturnal Aggressive Undead: spectral violet/emerald diamond
              if (e.kind === 'undead') {
                return (
                  <polygon
                    key={e.id}
                    points={`${mx},${mz - 3.9} ${mx + 3.5},${mz} ${mx},${mz + 3.9} ${mx - 3.5},${mz}`}
                    fill="#a855f7"
                    stroke="#34f5c5"
                    strokeWidth={0.95}
                  />
                );
              }

              // Regional Boss: crimson-gold diamond
              if (e.kind === 'boss') {
                return (
                  <polygon
                    key={e.id}
                    points={`${mx},${mz - 5.2} ${mx + 4.8},${mz} ${mx},${mz + 5.2} ${mx - 4.8},${mz}`}
                    fill="#ef4444"
                    stroke="#fde047"
                    strokeWidth={1.2}
                  />
                );
              }

              // Player Housing Piece: bright teal square
              if (e.kind === 'housing') {
                return (
                  <rect
                    key={e.id}
                    x={mx - 2.4}
                    y={mz - 2.4}
                    width={4.8}
                    height={4.8}
                    rx={0.8}
                    fill="#38f2c8"
                    stroke="#0d1922"
                    strokeWidth={0.7}
                  />
                );
              }

              // Other Player's Building: violet roofed cottage icon
              if (e.kind === 'other_housing') {
                return (
                  <g key={e.id} transform={`translate(${mx}, ${mz})`}>
                    <polygon points="0,-4.2 3.8,-0.8 -3.8,-0.8" fill="#c084fc" stroke="#3b0764" strokeWidth={0.6} />
                    <rect x={-2.8} y={-0.9} width={5.6} height={4} fill="#a855f7" stroke="#3b0764" strokeWidth={0.6} />
                  </g>
                );
              }

              // Live Multiplayer Remote Player: bright cyan-gold circle
              if (e.kind === 'remote_player') {
                return (
                  <g key={e.id} transform={`translate(${mx}, ${mz})`}>
                    <circle cx={0} cy={0} r={4.2} fill="#38bdf8" stroke="#fde047" strokeWidth={1.2} />
                  </g>
                );
              }

              // Northern Trial Tower Spire: radiant cyan-gold star spire
              if (e.kind === 'trial_tower') {
                return (
                  <g key={e.id} transform={`translate(${mx}, ${mz})`}>
                    <polygon
                      points="0,-5.4 3.4,1.2 0,4.6 -3.4,1.2"
                      fill="#62e5ff"
                      stroke="#fde047"
                      strokeWidth={1.0}
                    />
                  </g>
                );
              }

              const fill =
                e.kind === 'monster'
                  ? '#f87171'
                  : e.kind === 'frontier'
                    ? '#62e5ff'
                    : e.kind === 'landmark'
                      ? '#f59e0b'
                      : '#fde047';
              const r = e.kind === 'frontier' || e.kind === 'landmark' ? 3.0 : 2.3;
              return <circle key={e.id} cx={mx} cy={mz} r={r} fill={fill} />;
            })}

            {/* Player Arrow */}
            <g transform={`translate(${mapHalf}, ${mapHalf}) rotate(${(-hud.playerYaw * 180) / Math.PI + 180})`}>
              <polygon points="0,-5.8 4.1,4.2 0,2 -4.1,4.2" fill="#f7f3ea" stroke="#0f172a" strokeWidth={0.6} />
            </g>
          </svg>
          <span className="absolute top-0.5 left-1/2 -translate-x-1/2 text-[9px] font-mono-num font-bold text-[#93c5fd]">
            N
          </span>
          <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[9px] font-mono-num text-[#fde68a]">
            S
          </span>
          <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[9px] font-mono-num text-[#86efac]">
            W
          </span>
          <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] font-mono-num text-[#fca5a5]">
            E
          </span>
        </div>

        {/* Minimap Layer Filter Toggle Strip (Resources / Saplings / Combat / Housing) */}
        <div className="flex items-center gap-1 bg-[#141920]/88 px-1.5 py-1 rounded-lg border border-white/10">
          {(
            [
              { key: 'resources', label: '자원', dot: '#4ade80' },
              { key: 'saplings', label: '묘목', dot: '#a3e635' },
              { key: 'combat', label: '몬스터', dot: '#f87171' },
              { key: 'housing', label: '건축', dot: '#38f2c8' },
            ] as const
          ).map((layer) => {
            const active = minimapLayers[layer.key];
            return (
              <button
                key={layer.key}
                type="button"
                onClick={() =>
                  setMinimapLayers((prev) => ({ ...prev, [layer.key]: !prev[layer.key] }))
                }
                title={`미니맵 ${layer.label} 레이어 표시/숨기기`}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-[#222d3a] text-[#f7f3ea] font-semibold'
                    : 'bg-transparent text-[#64748b] hover:text-[#94a3b8]'
                }`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: active ? layer.dot : '#475569' }}
                />
                <span>{layer.label}</span>
              </button>
            );
          })}
          <span className="text-white/15">|</span>
          <button
            type="button"
            onClick={() => setMinimapWide((v) => !v)}
            title="미니맵 축척 전환 (근거리 / 광역 3배 필드)"
            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              minimapWide
                ? 'bg-[#1d3948] text-[#7dd3fc]'
                : 'bg-[#222d3a] text-[#cbd5e1] hover:text-white'
            }`}
          >
            {minimapWide ? '광역' : '근거리'}
          </button>
        </div>

        <div className="text-[11px] font-mono-num text-[#cbd5e1] bg-[#141920]/84 px-2 py-0.5 rounded border border-white/8">
          X {Math.round(hud.playerX)} · Z {Math.round(hud.playerZ)}
          {hud.rainGrowthBoost ? ' · 빗물 성장 1.8×' : ''}
        </div>

        {hud.nightCreaturesActive && (
          <div className="text-[11px] text-[#e9d5ff] bg-[#1b1428]/90 px-2.5 py-0.5 rounded border border-[#a855f7]/45 whitespace-nowrap">
            야간 경보 · 언데드 선공 출몰 & 반딧불이
          </div>
        )}
      </div>

      {/* RIGHT-SIDE SLIDE-OUT QUEST LOG PANEL (Hotkey J) */}
      {(() => {
        const claimableCount = hud.quests.filter((q) => q.completed && !q.claimed).length;
        const completedCount = hud.quests.filter((q) => q.claimed || q.completed).length;
        const sortedQuests = [...hud.quests].sort((a, b) => {
          const rank = (q: typeof a) => (q.completed && !q.claimed ? 0 : !q.claimed ? 1 : 2);
          return rank(a) - rank(b);
        });

        return (
          <div
            className="fixed right-0 z-20 flex items-start pointer-events-none transition-transform duration-200 ease-out"
            style={{
              top: hud.nightCreaturesActive ? '296px' : '270px',
              transform: questLogOpen ? 'translateX(0)' : 'translateX(278px)',
            }}
          >
            {/* Protruding Pull-Tab */}
            <button
              type="button"
              onClick={onToggleQuestLog}
              title="퀘스트 일지 열기/닫기 (단축키 J)"
              className={`pointer-events-auto flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-l-xl border border-r-0 shadow-lg transition-colors cursor-pointer ${
                claimableCount > 0
                  ? 'bg-[#2a2314]/95 hover:bg-[#382e18] border-[#e6b43c]/65 text-[#fde68a]'
                  : 'bg-[#141920]/90 hover:bg-[#1e2632] border-white/12 text-[#dbe3ec]'
              }`}
            >
              {questLogOpen ? (
                <ChevronRight className="w-3.5 h-3.5 text-[#94a3b8]" />
              ) : (
                <ChevronLeft className="w-3.5 h-3.5 text-[#e6b43c]" />
              )}
              <ScrollText className="w-4 h-4" />
              <span
                className="text-[11px] font-semibold tracking-tight"
                style={{ writingMode: 'vertical-rl' }}
              >
                퀘스트
              </span>
              {claimableCount > 0 ? (
                <span className="w-5 h-5 rounded-full bg-[#e6b43c] text-[#17130d] font-mono-num text-[10px] font-bold flex items-center justify-center">
                  {claimableCount}
                </span>
              ) : (
                <span className="text-[10px] font-mono-num text-[#94a3b8]">
                  {completedCount}/{hud.quests.length}
                </span>
              )}
            </button>

            {/* Slide-Out Panel Body */}
            <aside
              className="pointer-events-auto w-[278px] rounded-bl-xl bg-[#141920]/92 border border-r-0 border-white/12 shadow-2xl flex flex-col overflow-hidden"
              style={{ maxHeight: 'calc(100vh - 375px)' }}
            >
              <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-1.5">
                  <ScrollText className="w-4 h-4 text-[#e6b43c]" />
                  <h3 className="text-xs font-bold text-[#f7f3ea] whitespace-nowrap">개척자 퀘스트 일지</h3>
                </div>
                <span className="text-[10px] font-mono-num text-[#94a3b8]">
                  J · {completedCount}/{hud.quests.length}
                </span>
              </div>

              <div className="p-2.5 space-y-2 overflow-y-auto">
                {sortedQuests.map((q) => {
                  const pct = Math.min(100, Math.round((q.current / Math.max(q.target, 1)) * 100));
                  const ready = q.completed && !q.claimed;
                  return (
                    <div
                      key={q.id}
                      className={`p-2.5 rounded-lg border transition-colors ${
                        ready
                          ? 'bg-[#212b22] border-[#e6b43c]/60'
                          : q.claimed
                            ? 'bg-[#12171e]/75 border-white/6 opacity-65'
                            : 'bg-[#1a212b]/90 border-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-xs font-semibold text-[#f7f3ea] leading-snug">
                          {q.title}
                        </div>
                        <span
                          className={`text-[10px] font-mono-num font-bold shrink-0 ${
                            q.claimed
                              ? 'text-[#86efac]'
                              : ready
                                ? 'text-[#fde047]'
                                : 'text-[#93c5fd]'
                          }`}
                        >
                          {q.claimed ? '완료' : `${q.current}/${q.target}`}
                        </span>
                      </div>

                      <p className="text-[11px] text-[#94a3b8] mt-0.5 leading-snug">
                        {q.description}
                      </p>

                      {!q.claimed && (
                        <div className="mt-1.5 h-1.5 w-full rounded-full bg-[#242c37] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-transform duration-150 origin-left"
                            style={{
                              transform: `scaleX(${pct / 100})`,
                              backgroundColor: ready ? '#62e5ff' : '#e6b43c',
                            }}
                          />
                        </div>
                      )}

                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono-num text-[#cbd5e1] truncate">
                          보상: {q.rewardText}
                        </span>
                        {ready ? (
                          <button
                            type="button"
                            onClick={() => onClaimQuest(q.id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#e6b43c] hover:bg-[#f0c455] text-[#17130d] text-[10px] font-bold transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                          >
                            <Gift className="w-3 h-3" />
                            <span>보상 받기</span>
                          </button>
                        ) : q.claimed ? (
                          <span className="flex items-center gap-0.5 text-[10px] text-[#86efac] font-semibold shrink-0">
                            <Check className="w-3 h-3" />
                            <span>수령됨</span>
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>
          </div>
        );
      })()}

      {/* FLOATING WORLD-PROJECTED NEARBY MONSTER NAMEPLATES, HP BARS & WEAKNESS ELEMENT */}
      {hud.phase === 'playing' &&
        hud.nearbyMonsters.map((m) => {
          const hpRatio = Math.max(0, Math.min(1, m.hp / Math.max(m.maxHp, 1)));
          const barColor = m.isBoss
            ? '#f59e0b'
            : m.isAggressive
              ? '#f87171'
              : '#34d399';
          const weakMeta = ELEMENT_META[m.weakness] || ELEMENT_META.fire;
          return (
            <div
              key={m.id}
              className="fixed z-[15] pointer-events-none select-none"
              style={{
                left: `${m.screenX}%`,
                top: `${m.screenY}%`,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <div
                className={`px-2 py-1 rounded-md border shadow-md flex flex-col items-center gap-0.5 ${
                  m.isBoss
                    ? 'bg-[#1a130c]/92 border-[#f59e0b]/65 min-w-[128px]'
                    : 'bg-[#11161f]/88 border-white/15 min-w-[100px]'
                }`}
              >
                <div className="flex items-center gap-1 whitespace-nowrap">
                  {m.isBoss && <Crown className="w-3 h-3 text-[#f59e0b] shrink-0" />}
                  <span
                    className={`text-[10px] font-bold leading-none ${
                      m.isBoss
                        ? 'text-[#fde68a]'
                        : m.isAggressive
                          ? 'text-[#fecaca]'
                          : 'text-[#f1f5f9]'
                    }`}
                  >
                    {m.label}
                  </span>
                  <span
                    className="px-1 py-[1px] rounded text-[8px] font-bold leading-none border"
                    style={{
                      backgroundColor: weakMeta.bgHex,
                      borderColor: `${weakMeta.hex}80`,
                      color: weakMeta.hex,
                    }}
                  >
                    약:{weakMeta.shortLabel}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#242c38] overflow-hidden border border-white/10">
                  <div
                    className="h-full origin-left transition-transform duration-75"
                    style={{
                      transform: `scaleX(${hpRatio})`,
                      backgroundColor: barColor,
                    }}
                  />
                </div>
                <span className="text-[9px] font-mono-num text-[#cbd5e1] leading-none">
                  {m.hp} / {m.maxHp}
                </span>
              </div>
            </div>
          );
        })}

      {/* FLOATING WORLD-PROJECTED GATHER POPUPS */}
      {feedbacks.map((fb) => (
        <div
          key={fb.id}
          className="fixed z-20 pointer-events-none font-bold text-sm tracking-tight animate-float-popup whitespace-nowrap"
          style={{
            left: `${fb.screenX}%`,
            top: `${fb.screenY}%`,
            color: fb.color,
            textShadow: '0 2px 6px rgba(0, 0, 0, 0.85)',
          }}
        >
          {fb.text}
        </div>
      ))}

      {/* RADIAL EMOTE WHEEL OVERLAY (Hotkey B) */}
      {emoteWheelOpen && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-[#0c1016]/45 pointer-events-auto"
          onClick={onToggleEmoteWheel}
        >
          <div
            className="relative w-[328px] h-[328px] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Outer decorative wheel ring */}
            <div className="absolute inset-6 rounded-full border border-[#62e5ff]/25 bg-[#111720]/72 shadow-2xl" />

            {/* 6 Radial Emote Slices */}
            {EMOTES_CATALOG.map((em, idx) => {
              const angle = -Math.PI / 2 + idx * ((Math.PI * 2) / EMOTES_CATALOG.length);
              const radius = 114;
              const cx = Math.cos(angle) * radius;
              const cy = Math.sin(angle) * radius;
              const isActive = hud.activeEmote === em.id;

              return (
                <button
                  key={em.id}
                  type="button"
                  onClick={() => {
                    onTriggerEmote(em.id);
                    onToggleEmoteWheel();
                  }}
                  style={{
                    transform: `translate(${cx}px, ${cy}px)`,
                  }}
                  className={`absolute flex flex-col items-center justify-center w-[92px] h-[72px] rounded-xl border transition-all cursor-pointer shadow-lg ${
                    isActive
                      ? 'bg-[#1c3342] border-[#62e5ff] text-[#e0f8ff]'
                      : 'bg-[#161e29]/95 hover:bg-[#233042] border-white/14 hover:border-[#e6b43c]/65 text-[#f7f3ea]'
                  }`}
                >
                  {renderEmoteIcon(em.id)}
                  <span className="mt-1 text-xs font-bold whitespace-nowrap">{em.label}</span>
                  <span className="text-[9px] text-[#94a3b8] whitespace-nowrap">{em.subtitle}</span>
                </button>
              );
            })}

            {/* Center Hub */}
            <div className="relative z-10 flex flex-col items-center justify-center w-[104px] h-[104px] rounded-full bg-[#141920]/96 border border-[#e6b43c]/50 text-center shadow-xl px-2">
              <Smile className="w-4 h-4 text-[#e6b43c]" />
              <div className="text-[11px] font-bold text-[#f7f3ea] mt-1">감정표현 휠</div>
              <div className="text-[9px] text-[#94a3b8]">단축키 B</div>
              {hud.activeEmote ? (
                <button
                  type="button"
                  onClick={() => {
                    onCancelEmote();
                    onToggleEmoteWheel();
                  }}
                  className="mt-1 px-2 py-0.5 rounded bg-[#2a3444] hover:bg-[#374459] text-[10px] text-[#fca5a5] font-semibold cursor-pointer"
                >
                  동작 중지
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onToggleEmoteWheel}
                  className="mt-1 text-[10px] text-[#94a3b8] hover:text-white cursor-pointer"
                >
                  닫기
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONTEXTUAL INTERACTION PROMPT (hidden while housing builder overlay is active) */}
      {hud.nearbyHint && !housingActive && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-20 pointer-events-auto transition-all duration-150"
          style={{
            bottom: dockCollapsed ? '52px' : hasUpperDrawer ? '276px' : '198px',
          }}
        >
          <button
            type="button"
            onClick={onInteract}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl bg-[#141920]/92 hover:bg-[#1c232e] border shadow-lg transition-colors cursor-pointer min-w-[216px] ${
              hud.nearbyHint.kind === 'monster'
                ? 'border-[#f87171]/60'
                : hud.nearbyHint.kind === 'housing'
                  ? 'border-[#38f2c8]/60'
                  : 'border-[#e6b43c]/45'
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-[#f7f3ea] whitespace-nowrap">
              <span
                className={`inline-flex items-center justify-center w-5 h-5 rounded font-mono-num text-xs font-bold ${
                  hud.nearbyHint.kind === 'monster'
                    ? 'bg-[#ef4444] text-white'
                    : 'bg-[#e6b43c] text-[#17130d]'
                }`}
              >
                F
              </span>
              <span>{hud.nearbyHint.label}</span>
              <span className="text-[#aeb7c4] font-normal">· {hud.nearbyHint.actionLabel}</span>
            </div>

            {hud.nearbyHint.detailText && (
              <div
                className={`text-xs ${
                  hud.nearbyHint.canAfford === false
                    ? 'text-[#fca5a5]'
                    : hud.nearbyHint.kind === 'monster'
                      ? 'text-[#fde68a]'
                      : 'text-[#7dd3fc]'
                }`}
              >
                {hud.nearbyHint.detailText}
              </div>
            )}

            {hud.nearbyHint.maxHp > 1 && (
              <div className="w-full h-1.5 mt-0.5 rounded-full bg-[#242c37] overflow-hidden">
                <div
                  className="h-full transition-transform duration-100 origin-left"
                  style={{
                    transform: `scaleX(${
                      hud.nearbyHint.isDepleted
                        ? hud.nearbyHint.regrowProgress
                        : hud.nearbyHint.hp / hud.nearbyHint.maxHp
                    })`,
                    backgroundColor: hud.nearbyHint.isDepleted
                      ? '#86efac'
                      : hud.nearbyHint.kind === 'monster'
                        ? '#ef4444'
                        : '#e6b43c',
                  }}
                />
              </div>
            )}
          </button>
        </div>
      )}

      {/* UNIFIED BOTTOM EXPOSED INVENTORY + 6-SLOT CUSTOMIZABLE HOTBAR DOCK */}
      <div
        className="fixed bottom-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-auto transition-transform duration-200"
        style={{
          transform: dockCollapsed ? 'translate(-50%, calc(100% - 26px))' : 'translate(-50%, 0)',
          maxWidth: 'min(960px, 96vw)',
        }}
      >
        {/* 6-STAGE MODULAR HOUSING BUILDER & PER-PIECE EDITOR */}
        {housingActive && !dockCollapsed && (
          <div className="mb-1.5 w-full max-w-[940px] px-3.5 py-2.5 rounded-xl bg-[#111820]/95 border border-[#38f2c8]/45 shadow-2xl space-y-2">
            {/* Row 0: 6-Stage Progression Tabs + Validity Status + Save + Close */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-white/10">
              <div className="flex flex-wrap items-center gap-1">
                <Home className="w-4 h-4 text-[#38f2c8] mr-0.5 shrink-0" />
                {HOUSING_STAGES.map((st) => {
                  const isCurrentStage =
                    (hud.housing.mode === 'edit' || hud.housing.mode === 'moving')
                      ? st.id === 6
                      : hud.housing.activeStage === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => onSetHousingStage(st.id)}
                      title={`${st.title} — ${st.description}`}
                      className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                        isCurrentStage
                          ? st.id === 6
                            ? 'bg-[#e6b43c] text-[#17130d]'
                            : 'bg-[#38f2c8] text-[#0b1b18]'
                          : 'bg-[#1b2430] hover:bg-[#273445] text-[#cbd5e1]'
                      }`}
                    >
                      <span>{st.shortLabel}</span>
                      {st.id === 6 && hud.housing.placedCount > 0 && (
                        <span className="font-mono-num text-[10px] opacity-85">({hud.housing.placedCount})</span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5">
                {((hud.housing.mode === 'placing' && hud.housing.activeStage !== 1) ||
                  hud.housing.mode === 'moving') && (
                  <div
                    className={`flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap ${
                      hud.housing.previewValid ? 'text-[#5df7d4]' : 'text-[#f87171]'
                    }`}
                  >
                    {hud.housing.previewValid ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>
                      {hud.housing.previewValid
                        ? hud.housing.selectedBlueprint === 'wall_torch'
                          ? '벽면 부착 가능 · 좌클릭'
                          : hud.housing.selectedBlueprint === 'ceiling_light'
                            ? '천장 아래 배치 가능 · 좌클릭'
                            : hud.housing.previewLevel > 0
                              ? `자동 증설 (${hud.housing.previewLevel + 1}단) · 좌클릭`
                              : hud.housing.previewSnapped
                                ? '타일 연결됨 · 좌클릭'
                                : '설치 가능 · 좌클릭'
                        : hud.housing.previewReason || '설치 불가'}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={onSaveGame}
                  title="개별 부품 목록 및 부지 정보 저장"
                  className="flex items-center gap-1 px-2 py-1 rounded bg-[#1d3142] hover:bg-[#27435a] border border-[#62e5ff]/35 text-[11px] text-[#a5f3fc] font-semibold cursor-pointer whitespace-nowrap"
                >
                  <Save className="w-3 h-3" />
                  <span>저장</span>
                </button>

                <button
                  type="button"
                  onClick={onExitHousing}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-[#232c38] hover:bg-[#313d4e] text-[11px] text-[#dbe3ec] cursor-pointer whitespace-nowrap"
                >
                  <X className="w-3 h-3" />
                  <span>종료</span>
                </button>
              </div>
            </div>

            {/* STAGE 1: LAND CLAIM (토지 확보) */}
            {hud.housing.mode === 'placing' && hud.housing.activeStage === 1 && (
              <div className="flex flex-wrap items-center justify-between gap-3 py-1 text-xs">
                <div className="space-y-1 max-w-[600px]">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#38f2c8] shrink-0" />
                    <span className="font-bold text-[#f7f3ea]">1단계 · 토지 확보</span>
                    <span className="px-2 py-0.5 rounded bg-[#1b2936] text-[11px] font-mono-num text-[#7dd3fc]">
                      확보한 부지 {hud.housing.claimedPlotsCount}곳
                    </span>
                    {hud.housing.inClaimedPlot && (
                      <span className="px-2 py-0.5 rounded bg-[#15352d] border border-[#38f2c8]/40 text-[11px] text-[#5df7d4] font-semibold">
                        내 부지 영역 안
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#aeb7c4] leading-relaxed">
                    건축 가능 지역에서 내 부지를 확보하세요. 건축 자리의 나무·바위를 채집한 뒤 그 위에 부품을 설치하면
                    기존 자원이 리셋(재생성)되지 않으며, 다른 플레이어 건축물과 충돌 시 설치가 차단됩니다.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {!hud.housing.canClaimPlotHere && hud.housing.claimPlotReason && (
                    <span className="text-[11px] text-[#fca5a5] whitespace-nowrap">
                      {hud.housing.claimPlotReason}
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={!hud.housing.canClaimPlotHere}
                    onClick={onClaimLandPlot}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                      hud.housing.canClaimPlotHere
                        ? 'bg-[#38f2c8] hover:bg-[#5df7d4] text-[#0b1c18] cursor-pointer'
                        : 'bg-[#26303d] text-[#64748b] cursor-not-allowed'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>현재 위치 부지 확보</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetHousingStage(2)}
                    className="px-3 py-2 rounded-lg bg-[#1f2c3a] hover:bg-[#2a3b4e] border border-white/10 text-[#e2e8f0] text-xs font-semibold cursor-pointer whitespace-nowrap"
                  >
                    2단계 기초로 →
                  </button>
                </div>
              </div>
            )}

            {/* STAGES 2–5: MODULAR STRUCTURAL, FINISHING & INTERIOR PLACEMENT */}
            {hud.housing.mode === 'placing' && hud.housing.activeStage !== 1 && (
              <div className="space-y-2">
                {/* Piece Catalog Strip (Filtered by Stage or All) */}
                <div className="flex items-stretch gap-1.5">
                  <div className="flex-1 grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-8 gap-1">
                    {(showAllPieces
                      ? HOUSING_CATALOG
                      : HOUSING_CATALOG.filter((bp) => bp.stage === hud.housing.activeStage)
                    ).map((bp) => {
                      const selected = hud.housing.selectedBlueprint === bp.kind;
                      const dynCost = getHousingPieceCost(bp.kind, hud.housing.selectedMaterial);
                      const affordable = canAffordHousing(dynCost);
                      const isLighting = bp.kind === 'wall_torch' || bp.kind === 'ceiling_light';
                      const isFurn =
                        bp.kind === 'bed' ||
                        bp.kind === 'chair' ||
                        bp.kind === 'table' ||
                        bp.kind === 'cabinet';
                      return (
                        <button
                          key={bp.kind}
                          type="button"
                          onClick={() => onSelectBlueprint(bp.kind)}
                          title={`${bp.name} — ${bp.description}`}
                          className={`flex flex-col items-start px-2 py-1.5 rounded-lg border text-left transition-colors cursor-pointer ${
                            selected
                              ? isLighting
                                ? 'bg-[#2c2516] border-[#f59e0b] text-[#fef3c7]'
                                : isFurn
                                  ? 'bg-[#282038] border-[#c084fc] text-[#f3e8ff]'
                                  : 'bg-[#173238] border-[#38f2c8] text-[#f7f3ea]'
                              : isLighting
                                ? 'bg-[#211e18] hover:bg-[#2c271d] border-[#f59e0b]/30 text-[#fde68a]'
                                : isFurn
                                  ? 'bg-[#1d1a29] hover:bg-[#282238] border-[#c084fc]/25 text-[#e9d5ff]'
                                  : 'bg-[#1a222d] hover:bg-[#232e3c] border-white/10 text-[#dce3ec]'
                          }`}
                        >
                          <span className="text-[11px] font-bold truncate w-full flex items-center gap-0.5">
                            {isLighting && <Flame className="w-2.5 h-2.5 text-[#fbbf24] shrink-0" />}
                            {isFurn && <Sofa className="w-2.5 h-2.5 text-[#c084fc] shrink-0" />}
                            <span className="truncate">{bp.shortName}</span>
                          </span>
                          <span
                            className={`text-[10px] font-mono-num truncate w-full ${
                              affordable ? 'text-[#94a3b8]' : 'text-[#f87171]'
                            }`}
                          >
                            {formatHousingCost(dynCost)}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAllPieces((v) => !v)}
                    title="단계별 부품 또는 전체 부품 보기 전환"
                    className={`px-2 py-1 rounded-lg border text-[10px] font-semibold cursor-pointer whitespace-nowrap shrink-0 ${
                      showAllPieces
                        ? 'bg-[#213344] border-[#62e5ff] text-[#a5f3fc]'
                        : 'bg-[#18202a] hover:bg-[#222d3b] border-white/10 text-[#94a3b8]'
                    }`}
                  >
                    {showAllPieces ? '단계별' : '전체'}
                  </button>
                </div>

                {/* Transform Controls: Material + Grid Snap + 90°/Free Rotate + Height Offset + Confirm */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-1">
                    {HOUSING_MATERIALS.map((mat) => {
                      const active = hud.housing.selectedMaterial === mat.id;
                      return (
                        <button
                          key={mat.id}
                          type="button"
                          onClick={() => onSelectHousingMaterial(mat.id)}
                          title={`${mat.label} (기본 내구도 ${mat.baseDurability}) — ${mat.description}`}
                          className={`flex items-center gap-1 px-2 py-1 rounded border text-[11px] transition-colors cursor-pointer whitespace-nowrap ${
                            active
                              ? 'bg-[#243444] border-[#62e5ff] text-white font-semibold'
                              : 'bg-[#1a222d] hover:bg-[#242f3d] border-white/10 text-[#cbd5e1]'
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-sm border border-white/30 shrink-0"
                            style={{ backgroundColor: mat.swatchHex }}
                          />
                          <span>{mat.shortLabel}</span>
                          <span className="text-[9px] font-mono-num text-[#94a3b8]">
                            {mat.baseDurability}
                          </span>
                        </button>
                      );
                    })}

                    <span className="text-white/15 mx-0.5">|</span>

                    {/* Grid Snap Toggle (G) */}
                    <button
                      type="button"
                      onClick={onToggleGridSnap}
                      title="그리드 스냅 ON/OFF (단축키 G)"
                      className={`flex items-center gap-1 px-2 py-1 rounded border text-[11px] transition-colors cursor-pointer whitespace-nowrap ${
                        hud.housing.gridSnap
                          ? 'bg-[#15352d] border-[#38f2c8]/55 text-[#5df7d4] font-semibold'
                          : 'bg-[#1f2834] border-white/10 text-[#94a3b8] hover:text-white'
                      }`}
                    >
                      <Grid3X3 className="w-3 h-3" />
                      <span>스냅 {hud.housing.gridSnap ? 'ON' : 'OFF'} (G)</span>
                    </button>

                    {/* Rotation Mode Toggle (V: 90° / Free 15°) + Rotate Buttons */}
                    <button
                      type="button"
                      onClick={onToggleFreeRotate}
                      title="90도 단위 회전 / 15도 자유 회전 전환 (단축키 V)"
                      className={`px-2 py-1 rounded border text-[11px] transition-colors cursor-pointer whitespace-nowrap ${
                        hud.housing.freeRotate
                          ? 'bg-[#2c2516] border-[#e6b43c]/60 text-[#fde68a] font-semibold'
                          : 'bg-[#1f2834] border-white/10 text-[#cbd5e1] hover:text-white'
                      }`}
                    >
                      {hud.housing.freeRotate ? '자유 15° (V)' : '90° 회전 (V)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onRotateHousing(-1)}
                      title="반시계 회전 (Shift+R)"
                      className="flex items-center gap-0.5 px-1.5 py-1 rounded bg-[#1f2834] hover:bg-[#2c3849] text-[#e2e8f0] cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                    <span className="text-[11px] font-mono-num text-[#cbd5e1] min-w-[34px] text-center">
                      {hud.housing.previewRotationDeg}°
                    </span>
                    <button
                      type="button"
                      onClick={() => onRotateHousing(1)}
                      title="시계 회전 (R)"
                      className="flex items-center gap-0.5 px-1.5 py-1 rounded bg-[#1f2834] hover:bg-[#2c3849] text-[#e2e8f0] cursor-pointer"
                    >
                      <RotateCw className="w-3 h-3" />
                    </button>

                    <span className="text-white/15 mx-0.5">|</span>

                    {/* Height Adjustment ([ / ]) */}
                    <div className="flex items-center gap-0.5 bg-[#18202a] rounded border border-white/10 px-1 py-0.5">
                      <ArrowUpDown className="w-3 h-3 text-[#7dd3fc] mx-0.5" />
                      <button
                        type="button"
                        onClick={() => onAdjustHousingHeight(-0.25)}
                        title="높이 낮추기 ([)"
                        className="px-1.5 py-0.5 rounded hover:bg-[#263344] text-[#cbd5e1] font-mono-num text-[11px] cursor-pointer"
                      >
                        -
                      </button>
                      <button
                        type="button"
                        onClick={onResetHousingHeight}
                        title="높이 오프셋 초기화 (0m)"
                        className="px-1 text-[10px] font-mono-num text-[#a5f3fc] hover:text-white cursor-pointer whitespace-nowrap"
                      >
                        {hud.housing.heightOffset >= 0 ? '+' : ''}
                        {hud.housing.heightOffset.toFixed(2)}m
                      </button>
                      <button
                        type="button"
                        onClick={() => onAdjustHousingHeight(0.25)}
                        title="높이 높이기 (])"
                        className="px-1.5 py-0.5 rounded hover:bg-[#263344] text-[#cbd5e1] font-mono-num text-[11px] cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!hud.housing.previewValid}
                    onClick={onConfirmHousing}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                      hud.housing.previewValid
                        ? 'bg-[#38f2c8] hover:bg-[#5df7d4] text-[#0b1c18] cursor-pointer'
                        : 'bg-[#26303d] text-[#64748b] cursor-not-allowed'
                    }`}
                  >
                    부품 설치 (Enter)
                  </button>
                </div>

                {/* Color Paint Palette Row */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/8 text-xs">
                  <div className="flex items-center gap-1 text-[11px] text-[#94a3b8] mr-0.5 whitespace-nowrap">
                    <Palette className="w-3.5 h-3.5 text-[#7dd3fc]" />
                    <span>색상</span>
                  </div>
                  {HOUSING_COLORS.map((c) => {
                    const active = hud.housing.selectedColor === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => onSelectHousingColor(c.id)}
                        title={`건축 색상: ${c.label}`}
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] transition-colors cursor-pointer whitespace-nowrap ${
                          active
                            ? 'bg-[#213344] border-[#62e5ff] text-white font-semibold'
                            : 'bg-[#18202a] hover:bg-[#222d3b] border-white/10 text-[#cbd5e1]'
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full border border-white/40 shrink-0"
                          style={{ backgroundColor: c.swatchHex }}
                        />
                        <span>{c.label}</span>
                      </button>
                    );
                  })}
                  {hud.housing.selectedBlueprint === 'stairs' && (
                    <span className="ml-auto text-[10px] text-[#7dd3fc] whitespace-nowrap">
                      기존 계단 위·아래에 조준하면 연속 계단이 자동 연결됩니다
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* STAGE 6: EXPANSION, UPGRADE, COPY & PIECE EDITING */}
            {hud.housing.mode === 'edit' && (
              <div className="space-y-2 text-xs">
                {hud.housing.selectedHouse ? (
                  (() => {
                    const sel = hud.housing.selectedHouse;
                    const isWall =
                      sel.kind === 'wall' ||
                      sel.kind === 'half_wall' ||
                      sel.kind === 'fence' ||
                      sel.kind === 'doorway' ||
                      sel.kind === 'door' ||
                      sel.kind === 'window_wall';
                    const isTop =
                      sel.kind === 'ceiling' || sel.kind === 'flat_roof' || sel.kind === 'roof';
                    const canRotatePiece =
                      sel.kind === 'roof' ||
                      sel.kind === 'flat_roof' ||
                      sel.kind === 'stairs' ||
                      sel.kind === 'floor' ||
                      sel.kind === 'ceiling' ||
                      sel.kind === 'wall_torch' ||
                      sel.kind === 'ceiling_light' ||
                      sel.kind === 'bed' ||
                      sel.kind === 'chair' ||
                      sel.kind === 'table' ||
                      sel.kind === 'cabinet';
                    const activeColorLabel =
                      HOUSING_COLORS.find((c) => c.id === sel.color)?.label ?? '원색';
                    const durPct = Math.round(
                      (sel.durability / Math.max(1, sel.maxDurability)) * 100,
                    );
                    const isDamaged = sel.durability < sel.maxDurability;
                    const repairCost = getHousingRepairCost(sel.material);
                    const canRepairNow = isDamaged && canAffordHousing(repairCost);

                    return (
                      <>
                        {/* Edit Row 1: Tile Info, Durability & Repair, Move, Copy (C), Door Open/Close, Rotate, Height, Shape Swap, Material, Demolish */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-2 py-1 rounded bg-[#1a3038] border border-[#38f2c8]/40 text-[#7cf7dc] font-bold whitespace-nowrap">
                              {sel.name}
                              {sel.level > 0 ? ` (${sel.level + 1}단)` : ''}
                            </span>

                            {/* Durability Readout & Instant Repair Button */}
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#17202b] border border-white/10">
                              <span className="text-[10px] text-[#94a3b8]">내구도</span>
                              <div className="w-14 h-1.5 rounded-full bg-[#263140] overflow-hidden">
                                <div
                                  className="h-full origin-left"
                                  style={{
                                    transform: `scaleX(${Math.max(0, Math.min(1, durPct / 100))})`,
                                    backgroundColor:
                                      durPct < 35
                                        ? '#ef4444'
                                        : durPct < 70
                                          ? '#f59e0b'
                                          : '#38f2c8',
                                  }}
                                />
                              </div>
                              <span className="text-[10px] font-mono-num text-[#e2e8f0]">
                                {Math.ceil(sel.durability)}/{sel.maxDurability}
                              </span>
                            </div>

                            {isDamaged && (
                              <button
                                type="button"
                                disabled={!canRepairNow}
                                onClick={onRepairHouse}
                                title={`수리 비용: ${formatHousingCost(repairCost)}`}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded font-bold whitespace-nowrap transition-colors ${
                                  canRepairNow
                                    ? 'bg-[#38f2c8] hover:bg-[#5df7d4] text-[#0b1c18] cursor-pointer'
                                    : 'bg-[#2a2224] border border-[#f87171]/35 text-[#fca5a5] cursor-not-allowed'
                                }`}
                              >
                                <Wrench className="w-3.5 h-3.5" />
                                <span>수리 ({formatHousingCost(repairCost)})</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={onStartMovingHouse}
                              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#e6b43c] hover:bg-[#f0c455] text-[#17130d] font-bold cursor-pointer whitespace-nowrap"
                            >
                              <Move className="w-3.5 h-3.5" />
                              <span>이동</span>
                            </button>

                            <button
                              type="button"
                              onClick={onDuplicateHouse}
                              title="선택한 부품의 종류·자재·색상·회전·높이를 복사해 새 배치 시작 (단축키 C)"
                              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1d3948] hover:bg-[#274b5e] border border-[#62e5ff]/45 text-[#c8f5ff] font-semibold cursor-pointer whitespace-nowrap"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>부품 복사 (C)</span>
                            </button>

                            {sel.kind === 'door' && (
                              <button
                                type="button"
                                onClick={onToggleDoor}
                                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1d3948] hover:bg-[#274b5e] border border-[#62e5ff]/45 text-[#c8f5ff] font-semibold cursor-pointer whitespace-nowrap"
                              >
                                <DoorOpen className="w-3.5 h-3.5" />
                                <span>{sel.isDoorOpen ? '문 닫기' : '문 열기'}</span>
                              </button>
                            )}

                            {canRotatePiece && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => onRotateHousing(-1)}
                                  className="flex items-center gap-0.5 px-1.5 py-1 rounded bg-[#1f2834] hover:bg-[#2c3849] text-[#e2e8f0] cursor-pointer"
                                  title="반시계 회전"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onRotateHousing(1)}
                                  className="flex items-center gap-0.5 px-1.5 py-1 rounded bg-[#1f2834] hover:bg-[#2c3849] text-[#e2e8f0] cursor-pointer"
                                  title="시계 회전"
                                >
                                  <RotateCw className="w-3 h-3" />
                                </button>
                              </>
                            )}

                            {/* Height Offset Fine Control for Selected Piece */}
                            <div className="flex items-center gap-0.5 bg-[#18202a] rounded border border-white/10 px-1 py-0.5">
                              <ArrowUpDown className="w-3 h-3 text-[#7dd3fc] mx-0.5" />
                              <button
                                type="button"
                                onClick={() => onAdjustHousingHeight(-0.25)}
                                title="부품 높이 낮추기 ([)"
                                className="px-1.5 py-0.5 rounded hover:bg-[#263344] text-[#cbd5e1] font-mono-num text-[11px] cursor-pointer"
                              >
                                -
                              </button>
                              <button
                                type="button"
                                onClick={onResetHousingHeight}
                                title="높이 초기화"
                                className="px-1 text-[10px] font-mono-num text-[#a5f3fc] cursor-pointer whitespace-nowrap"
                              >
                                {sel.heightOffset >= 0 ? '+' : ''}
                                {sel.heightOffset.toFixed(2)}m
                              </button>
                              <button
                                type="button"
                                onClick={() => onAdjustHousingHeight(0.25)}
                                title="부품 높이 높이기 (])"
                                className="px-1.5 py-0.5 rounded hover:bg-[#263344] text-[#cbd5e1] font-mono-num text-[11px] cursor-pointer"
                              >
                                +
                              </button>
                            </div>

                            {isWall && (
                              <>
                                <span className="text-white/15">|</span>
                                {(
                                  [
                                    { kind: 'wall', label: '벽' },
                                    { kind: 'half_wall', label: '반벽(1/2)' },
                                    { kind: 'fence', label: '방어 울타리' },
                                    { kind: 'doorway', label: '출입구' },
                                    { kind: 'door', label: '문' },
                                    { kind: 'window_wall', label: '투명 창문' },
                                  ] as const
                                ).map((opt) => (
                                  <button
                                    key={opt.kind}
                                    type="button"
                                    onClick={() => onSwapTileKind(opt.kind)}
                                    className={`px-2 py-1 rounded border text-[11px] cursor-pointer ${
                                      sel.kind === opt.kind
                                        ? 'bg-[#173238] border-[#38f2c8] text-[#7cf7dc] font-semibold'
                                        : 'bg-[#1a222d] hover:bg-[#242f3d] border-white/10 text-[#cbd5e1]'
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </>
                            )}

                            {isTop && (
                              <>
                                <span className="text-white/15">|</span>
                                {(
                                  [
                                    { kind: 'ceiling', label: '평천장' },
                                    { kind: 'flat_roof', label: '평지붕' },
                                    { kind: 'roof', label: '경사지붕' },
                                  ] as const
                                ).map((opt) => (
                                  <button
                                    key={opt.kind}
                                    type="button"
                                    onClick={() => onSwapTileKind(opt.kind)}
                                    className={`px-2 py-1 rounded border text-[11px] cursor-pointer ${
                                      sel.kind === opt.kind
                                        ? 'bg-[#173238] border-[#38f2c8] text-[#7cf7dc] font-semibold'
                                        : 'bg-[#1a222d] hover:bg-[#242f3d] border-white/10 text-[#cbd5e1]'
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </>
                            )}

                            <span className="text-white/15">|</span>
                            {HOUSING_MATERIALS.map((mat) => {
                              const active = sel.material === mat.id;
                              return (
                                <button
                                  key={mat.id}
                                  type="button"
                                  onClick={() => onSelectHousingMaterial(mat.id)}
                                  title={`${mat.label} 자재로 업그레이드/교체 (차액 정산)`}
                                  className={`flex items-center gap-1 px-2 py-1 rounded border text-[11px] cursor-pointer ${
                                    active
                                      ? 'bg-[#243444] border-[#62e5ff] text-white font-semibold'
                                      : 'bg-[#1a222d] hover:bg-[#242f3d] border-white/10 text-[#cbd5e1]'
                                  }`}
                                >
                                  <span
                                    className="w-2.5 h-2.5 rounded-sm border border-white/30"
                                    style={{ backgroundColor: mat.swatchHex }}
                                  />
                                  <span className="hidden lg:inline">{mat.shortLabel}</span>
                                </button>
                              );
                            })}
                          </div>

                          <button
                            type="button"
                            onClick={onDemolishHouse}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#341d22] hover:bg-[#49262e] border border-[#f87171]/40 text-[#fca5a5] font-semibold cursor-pointer whitespace-nowrap"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>제거 (100% 반환)</span>
                          </button>
                        </div>

                        {/* Edit Row 2: Post-Placement Color Change + Connected Structure Batch Paint */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-white/8">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <div className="flex items-center gap-1 text-[11px] text-[#94a3b8] mr-0.5 whitespace-nowrap">
                              <Palette className="w-3.5 h-3.5 text-[#7dd3fc]" />
                              <span>색상 변경</span>
                            </div>
                            {HOUSING_COLORS.map((c) => {
                              const active = sel.color === c.id;
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => onSelectHousingColor(c.id)}
                                  title={`선택 부품을 ${c.label} 색상으로 도색`}
                                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] transition-colors cursor-pointer whitespace-nowrap ${
                                    active
                                      ? 'bg-[#213344] border-[#62e5ff] text-white font-semibold'
                                      : 'bg-[#18202a] hover:bg-[#222d3b] border-white/10 text-[#cbd5e1]'
                                  }`}
                                >
                                  <span
                                    className="w-3 h-3 rounded-full border border-white/40 shrink-0"
                                    style={{ backgroundColor: c.swatchHex }}
                                  />
                                  <span>{c.label}</span>
                                </button>
                              );
                            })}
                          </div>

                          <button
                            type="button"
                            onClick={() => onPaintConnectedStructure(sel.color)}
                            title={`연결된 건물 전체를 '${activeColorLabel}' 색상으로 일괄 도색`}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#1d3142] hover:bg-[#27435a] border border-[#62e5ff]/40 text-[#a5f3fc] text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <Palette className="w-3 h-3" />
                            <span>연결 건물 전체 도색 ({activeColorLabel})</span>
                          </button>
                        </div>
                      </>
                    );
                  })()
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#cbd5e1] py-0.5">
                    <span>
                      설치된 건축·가구 부품을{' '}
                      <span className="text-[#38f2c8] font-semibold">마우스로 좌클릭</span>해 선택하면{' '}
                      <span className="text-[#a5f3fc]">복사(C)·이동·높이 조절·자재 업그레이드·색상 도색·제거</span>를 할 수 있습니다.
                    </span>
                    <span className="text-[11px] text-[#94a3b8] whitespace-nowrap">
                      개별 부품 단위 저장 · 자유 이동 WASD
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* MOVING MODE */}
            {hud.housing.mode === 'moving' && (
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-1.5 text-[#cbd5e1]">
                  <span className="font-semibold text-[#fde68a]">
                    {hud.housing.selectedHouse?.name}
                  </span>
                  <span>새 위치로 이동 중 (무료 · WASD 자유 이동)</span>
                  <button
                    type="button"
                    onClick={onToggleGridSnap}
                    className={`px-2 py-0.5 rounded border text-[11px] cursor-pointer whitespace-nowrap ${
                      hud.housing.gridSnap
                        ? 'bg-[#15352d] border-[#38f2c8]/55 text-[#5df7d4]'
                        : 'bg-[#1f2834] border-white/10 text-[#94a3b8]'
                    }`}
                  >
                    스냅 {hud.housing.gridSnap ? 'ON' : 'OFF'}
                  </button>
                  <button
                    type="button"
                    onClick={onToggleFreeRotate}
                    className="px-2 py-0.5 rounded border border-white/10 bg-[#1f2834] text-[#cbd5e1] text-[11px] cursor-pointer whitespace-nowrap"
                  >
                    {hud.housing.freeRotate ? '15°' : '90°'}
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onRotateHousing(-1)}
                    className="px-2 py-1 rounded bg-[#1f2834] hover:bg-[#2c3849] text-[#e2e8f0] cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                  <span className="font-mono-num text-[11px] text-[#cbd5e1]">
                    {hud.housing.previewRotationDeg}°
                  </span>
                  <button
                    type="button"
                    onClick={() => onRotateHousing(1)}
                    className="px-2 py-1 rounded bg-[#1f2834] hover:bg-[#2c3849] text-[#e2e8f0] cursor-pointer"
                  >
                    <RotateCw className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onAdjustHousingHeight(-0.25)}
                    className="px-1.5 py-1 rounded bg-[#1f2834] hover:bg-[#2c3849] text-[#e2e8f0] font-mono-num cursor-pointer"
                  >
                    -0.25m
                  </button>
                  <button
                    type="button"
                    onClick={() => onAdjustHousingHeight(0.25)}
                    className="px-1.5 py-1 rounded bg-[#1f2834] hover:bg-[#2c3849] text-[#e2e8f0] font-mono-num cursor-pointer"
                  >
                    +0.25m
                  </button>
                  <button
                    type="button"
                    disabled={!hud.housing.previewValid}
                    onClick={onConfirmHousing}
                    className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap ${
                      hud.housing.previewValid
                        ? 'bg-[#38f2c8] hover:bg-[#5df7d4] text-[#0b1c18] cursor-pointer'
                        : 'bg-[#26303d] text-[#64748b] cursor-not-allowed'
                    }`}
                  >
                    이동 확정
                  </button>
                  <button
                    type="button"
                    onClick={onCancelMovingHouse}
                    className="px-2.5 py-1.5 rounded-lg bg-[#242e3b] hover:bg-[#313e4f] text-[#dbe3ec] cursor-pointer whitespace-nowrap"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Expandable Time & Weather Control Strip */}
        {envDrawerOpen && !dockCollapsed && (
          <div className="mb-1.5 flex flex-wrap items-center justify-center gap-3 px-4 py-2 rounded-xl bg-[#141920]/94 border border-white/12 shadow-xl text-xs">
            <div className="flex items-center gap-1.5 pr-3 border-r border-white/10">
              <span className="text-[#94a3b8] whitespace-nowrap">시간</span>
              <input
                type="range"
                min={0}
                max={23.9}
                step={0.1}
                value={hud.timeOfDay}
                onChange={(e) => onSetTimeOfDay(parseFloat(e.target.value))}
                aria-label="시간 조절"
                className="w-24 accent-[#e6b43c] cursor-pointer"
              />
              <div className="flex items-center gap-1">
                {TIME_PRESETS.map((tp) => (
                  <button
                    key={tp.id}
                    type="button"
                    onClick={() => onSetTimePreset(tp.id)}
                    className="px-2 py-1 rounded bg-[#222a36] hover:bg-[#2f3b4d] text-[#e2e8f0] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {tp.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={onToggleTimePaused}
                title={hud.timePaused ? '시간 흐름 재개' : '현재 시간 고정'}
                className={`px-2 py-1 rounded flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
                  hud.timePaused
                    ? 'bg-[#e6b43c] text-[#17130d] font-semibold'
                    : 'bg-[#222a36] hover:bg-[#2f3b4d] text-[#cbd5e1]'
                }`}
              >
                {hud.timePaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                <span>{hud.timePaused ? '고정됨' : '흐름'}</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[#94a3b8] whitespace-nowrap">날씨</span>
              <div className="flex items-center gap-1">
                {WEATHER_OPTIONS.map((w) => {
                  const active = hud.weather === w.id;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => onSetWeather(w.id)}
                      className={`px-2.5 py-1 rounded transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? 'bg-[#62e5ff] text-[#0d1922] font-semibold'
                          : 'bg-[#222a36] hover:bg-[#2f3b4d] text-[#e2e8f0]'
                      }`}
                    >
                      {w.label}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={onToggleAutoWeather}
                className={`px-2 py-1 rounded transition-colors cursor-pointer whitespace-nowrap ${
                  hud.autoWeather
                    ? 'bg-[#233442] text-[#7dd3fc] border border-[#62e5ff]/35'
                    : 'bg-[#222a36] text-[#94a3b8]'
                }`}
              >
                자동 {hud.autoWeather ? 'ON' : 'OFF'}
              </button>
              <span className="text-[11px] text-[#94a3b8] pl-2 border-l border-white/10 whitespace-nowrap">
                ♪ {hud.bgmEnabled && !muted ? hud.bgmThemeLabel : 'BGM 꺼짐'}
              </span>
            </div>
          </div>
        )}

        {/* Hotbar Slot Configuration Picker Popover */}
        {editingSlotIndex !== null && !dockCollapsed && (
          <div className="mb-1.5 w-full max-w-[600px] px-3.5 py-2.5 rounded-xl bg-[#141920]/96 border border-[#e6b43c]/45 shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-[#f7f3ea]">
                단축 슬롯 <span className="text-[#e6b43c] font-mono-num">[{editingSlotIndex + 1}]</span> 항목 지정
              </div>
              <button
                type="button"
                onClick={() => setEditingSlotIndex(null)}
                className="w-6 h-6 rounded hover:bg-white/10 flex items-center justify-center text-[#94a3b8] hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
              {HOTBAR_PICKER_OPTIONS.filter((opt) => {
                if (!opt.weaponId) return true;
                if (hud.ownedWeapons.includes(opt.weaponId)) return true;
                const spec = WEAPONS_CATALOG.find((w) => w.id === opt.weaponId);
                return !spec?.classId || spec.classId === hud.playerClass;
              }).map((opt) => {
                const isSelected = hud.hotbarSlots[editingSlotIndex] === opt.id;
                const isOwned = !opt.weaponId || hud.ownedWeapons.includes(opt.weaponId);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onSetHotbarSlot(editingSlotIndex, opt.id);
                      setEditingSlotIndex(null);
                    }}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#243647] border-[#62e5ff]/60 text-[#f7f3ea]'
                        : 'bg-[#1c232e] hover:bg-[#253040] border-white/8 text-[#dbe3ec]'
                    }`}
                  >
                    {renderHotbarIcon(opt.id, isOwned)}
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-semibold truncate">{opt.shortLabel}</div>
                      <div className="text-[9px] text-[#94a3b8] truncate">
                        {opt.weaponId ? (isOwned ? '보유' : '미제련') : opt.hint}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* SWIMMING BREATH GAUGE ("숨 게이지") */}
        {(hud.isSwimming || hud.breath < hud.maxBreath) && (
          <div className="mb-1.5 w-[240px] sm:w-[272px] px-3 py-2 rounded-xl bg-[#0e1b26]/92 border border-[#38bdf8]/55 shadow-lg">
            <div className="flex items-center justify-between text-[11px] font-bold mb-1">
              <span className="flex items-center gap-1.5 text-[#7dd3fc]">
                <Waves className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>{hud.isSwimming ? '수영 중 · 숨 게이지' : '호흡 회복 중'}</span>
              </span>
              <span
                className={`font-mono-num ${
                  breathPct <= 25 ? 'text-[#f87171]' : 'text-[#bae6fd]'
                }`}
              >
                {breathPct}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-[#182938] overflow-hidden border border-white/10">
              <div
                className="h-full rounded-full origin-left transition-transform duration-100"
                style={{
                  transform: `scaleX(${breathPct / 100})`,
                  backgroundColor: breathPct <= 25 ? '#ef4444' : '#38bdf8',
                }}
              />
            </div>
            {breathPct <= 25 && hud.isSwimming && (
              <div className="mt-1 text-[10px] font-semibold text-[#fca5a5] text-center">
                숨이 부족합니다! 가까운 해안이나 육지로 이동하세요
              </div>
            )}
          </div>
        )}

        {/* Collapse / Expand tab */}
        <button
          type="button"
          onClick={() => setDockCollapsed((v) => !v)}
          className="mb-1 px-3 py-0.5 rounded-t-lg bg-[#141920]/88 border border-b-0 border-white/10 text-[11px] text-[#aeb7c4] hover:text-[#f7f3ea] flex items-center gap-1 cursor-pointer whitespace-nowrap"
        >
          {dockCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{dockCollapsed ? '하단 인벤토리 · 단축바 열기' : '화면 넓게 보기'}</span>
        </button>

        {/* Main Integrated Panel: Exposed Inventory Row + 6-Slot Shortcut Bar */}
        {/* WARRIOR UNIQUE ACTIVE SKILLS STRIP (Q · E · R · T — hidden on compact mobile when touch controls show skills) */}
        {!housingActive && !dockCollapsed && !mobileTouchEnabled && hud.warriorSkills.length > 0 && (
          <div className="mb-1.5 flex flex-col items-center gap-1">
            {hud.warcryBuffRemaining > 0 && (
              <div
                className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[#231d10]/94 border text-[11px] font-semibold shadow"
                style={{
                  borderColor: `${buffSkillSpec.accentHex}88`,
                  color: buffSkillSpec.accentHex,
                }}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>{buffSkillSpec.name} 활성</span>
                <span className="font-mono-num text-[#fef08a]">
                  {hud.warcryBuffRemaining.toFixed(1)}s
                </span>
              </div>
            )}

            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#11171f]/92 border border-white/12 shadow-lg">
              {classSkills.map((spec) => {
                const snap = hud.warriorSkills.find((s) => s.id === spec.id);
                const cd = snap?.cooldownRemaining ?? 0;
                const cdTotal = snap?.cooldownTotal ?? spec.baseCooldown;
                const cdPct = cd > 0 ? Math.min(1, cd / Math.max(cdTotal, 0.1)) : 0;
                const enoughStamina = hud.stamina >= spec.staminaCost;
                const ready = cd <= 0.05 && enoughStamina;

                const icon =
                  hud.playerClass === 'archer' ? (
                    spec.id === 'whirlwind' ? (
                      <Crosshair className="w-3.5 h-3.5" style={{ color: spec.accentHex }} />
                    ) : spec.id === 'vanguard_dash' ? (
                      <Zap className="w-3.5 h-3.5" style={{ color: spec.accentHex }} />
                    ) : spec.id === 'earthbreaker' ? (
                      <Sparkles className="w-3.5 h-3.5" style={{ color: spec.accentHex }} />
                    ) : (
                      <Shield className="w-3.5 h-3.5" style={{ color: spec.accentHex }} />
                    )
                  ) : hud.playerClass === 'healer' ? (
                    spec.id === 'whirlwind' ? (
                      <Sparkles className="w-3.5 h-3.5" style={{ color: spec.accentHex }} />
                    ) : spec.id === 'vanguard_dash' ? (
                      <Heart className="w-3.5 h-3.5" style={{ color: spec.accentHex }} />
                    ) : spec.id === 'earthbreaker' ? (
                      <Flame className="w-3.5 h-3.5" style={{ color: spec.accentHex }} />
                    ) : (
                      <Shield className="w-3.5 h-3.5" style={{ color: spec.accentHex }} />
                    )
                  ) : hud.playerClass === 'mage' ? (
                    spec.id === 'whirlwind' ? (
                      <Wand2 className="w-3.5 h-3.5" style={{ color: spec.accentHex }} />
                    ) : spec.id === 'vanguard_dash' ? (
                      <Sparkles className="w-3.5 h-3.5" style={{ color: spec.accentHex }} />
                    ) : spec.id === 'earthbreaker' ? (
                      <Flame className="w-3.5 h-3.5" style={{ color: spec.accentHex }} />
                    ) : (
                      <Shield className="w-3.5 h-3.5" style={{ color: spec.accentHex }} />
                    )
                  ) : spec.id === 'whirlwind' ? (
                    <Swords className="w-3.5 h-3.5" style={{ color: spec.accentHex }} />
                  ) : spec.id === 'vanguard_dash' ? (
                    <Zap className="w-3.5 h-3.5" style={{ color: spec.accentHex }} />
                  ) : spec.id === 'earthbreaker' ? (
                    <Flame className="w-3.5 h-3.5" style={{ color: spec.accentHex }} />
                  ) : (
                    <Shield className="w-3.5 h-3.5" style={{ color: spec.accentHex }} />
                  );

                return (
                  <button
                    key={spec.id}
                    type="button"
                    onClick={() => onCastSkill(spec.id)}
                    title={`${spec.name} (단축키 ${spec.hotkey} · 마스터리 Lv.${snap?.rank ?? 1} · 기력 ${spec.staminaCost}) — ${spec.description}`}
                    className={`relative overflow-hidden flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer min-w-[104px] ${
                      ready
                        ? 'bg-[#1a222d] hover:bg-[#243040] border-white/15'
                        : 'bg-[#131820] border-white/8 opacity-75'
                    }`}
                  >
                    {cd > 0 && (
                      <div
                        className="absolute inset-0 bg-[#0a0e14]/75 origin-bottom pointer-events-none"
                        style={{ transform: `scaleY(${cdPct})` }}
                      />
                    )}
                    <span className="relative z-10 inline-flex items-center justify-center w-5 h-5 rounded bg-[#273242] font-mono-num text-[11px] font-bold text-[#f7f3ea] shrink-0">
                      {spec.hotkey}
                    </span>
                    <div className="relative z-10 flex flex-col items-start min-w-0">
                      <div className="flex items-center gap-1">
                        {icon}
                        <span className="text-[11px] font-semibold text-[#f7f3ea] whitespace-nowrap">
                          {spec.shortName}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono-num text-[#94a3b8]">
                        {cd > 0 ? `${cd.toFixed(1)}초 대기` : `Lv.${snap?.rank ?? 1} · S${spec.staminaCost}`}
                      </span>
                    </div>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={onToggleMastery}
                title={`${classSpec.name} 스킬 마스터리 및 4대 숙련도 창 열기 (단축키 K)`}
                className={`flex flex-col items-center justify-center px-2.5 py-1 rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                  hud.skillMasteryPoints > 0
                    ? 'bg-[#2a2212] hover:bg-[#382d17] border-[#e6b43c]/65 text-[#fde047]'
                    : 'bg-[#1a222d] hover:bg-[#243040] border-white/12 text-[#cbd5e1]'
                }`}
              >
                <div className="flex items-center gap-1 text-[11px] font-bold">
                  <Crown className="w-3.5 h-3.5" />
                  <span>숙련(K)</span>
                </div>
                <span className="text-[9px] font-mono-num">
                  {hud.skillMasteryPoints > 0 ? `+${hud.skillMasteryPoints}P 강화` : '마스터리'}
                </span>
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 px-3.5 py-2 rounded-xl bg-[#141920]/92 border border-white/12 shadow-xl">
          {/* Top Row: Exposed Inventory Readout + Auto-Weapon & Hotbar Config Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-1.5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onOpenWorkshop('inventory')}
                title="인벤토리 · 장비 창 열기 (I)"
                className="flex items-center gap-1 text-[11px] font-semibold text-[#94a3b8] hover:text-[#f7f3ea] transition-colors cursor-pointer whitespace-nowrap"
              >
                <Backpack className="w-3.5 h-3.5 text-[#7dd3fc]" />
                <span>인벤토리</span>
              </button>

              <div className="flex items-center gap-1.5 whitespace-nowrap" title="원목">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="3" y="7" width="18" height="10" rx="4" fill="#9a6438" stroke="#e3b682" strokeWidth="1.6" />
                  <circle cx="7" cy="12" r="2.2" fill="#d9a870" />
                </svg>
                <span className="text-[11px] text-[#b8c0cc]">원목</span>
                <span className="text-xs font-bold font-mono-num text-[#f3c37a]">{hud.inventory.wood}</span>
              </div>

              <div className="flex items-center gap-1.5 whitespace-nowrap" title="석재">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <polygon points="12,3 20,9 18,19 6,19 4,9" fill="#8b949e" stroke="#d0d7de" strokeWidth="1.5" />
                </svg>
                <span className="text-[11px] text-[#b8c0cc]">석재</span>
                <span className="text-xs font-bold font-mono-num text-[#e2e8f0]">{hud.inventory.stone}</span>
              </div>

              <div className="flex items-center gap-1.5 whitespace-nowrap" title="철광석">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <polygon points="12,3 21,12 12,21 3,12" fill="#6084a8" stroke="#bfdbfe" strokeWidth="1.5" />
                </svg>
                <span className="text-[11px] text-[#b8c0cc]">철광석</span>
                <span className="text-xs font-bold font-mono-num text-[#93c5fd]">{hud.inventory.iron}</span>
              </div>

              <div className="flex items-center gap-1.5 whitespace-nowrap" title="마력 수정">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <polygon points="12,2 18,10 15,21 9,21 6,10" fill="#22d3ee" stroke="#cffafe" strokeWidth="1.4" />
                </svg>
                <span className="text-[11px] text-[#b8c0cc]">수정</span>
                <span className="text-xs font-bold font-mono-num text-[#67e8f9]">{hud.inventory.crystal}</span>
              </div>

              <span className="text-white/15">|</span>

              <div className="flex items-center gap-1 whitespace-nowrap" title="몬스터 가죽">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#b87342] border border-[#eab686]" />
                <span className="text-[11px] text-[#b8c0cc]">가죽</span>
                <span className="text-xs font-bold font-mono-num text-[#fdba74]">{hud.inventory.leather}</span>
              </div>

              <div className="flex items-center gap-1 whitespace-nowrap" title="야수 송곳니">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#e5dcc5] border border-[#fff7e6]" />
                <span className="text-[11px] text-[#b8c0cc]">송곳니</span>
                <span className="text-xs font-bold font-mono-num text-[#fef3c7]">{hud.inventory.fang}</span>
              </div>

              <div className="flex items-center gap-1 whitespace-nowrap" title="마력 정수">
                <span className="w-2.5 h-2.5 rounded-full bg-[#34d399] border border-[#a7f3d0]" />
                <span className="text-[11px] text-[#b8c0cc]">정수</span>
                <span className="text-xs font-bold font-mono-num text-[#6ee7b7]">{hud.inventory.essence}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onToggleMastery}
                title={`${classSpec.name} 스킬 마스터리 · 4대 숙련도 창 열기 (단축키 K)`}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  masteryOpen || hud.skillMasteryPoints > 0
                    ? 'bg-[#2b2313] text-[#fde047] border border-[#e6b43c]/60'
                    : 'bg-[#222a36] hover:bg-[#2c3747] text-[#dce3ec]'
                }`}
              >
                <Crown className="w-3 h-3 text-[#e6b43c]" />
                <span>
                  마스터리(K){hud.skillMasteryPoints > 0 ? ` +${hud.skillMasteryPoints}` : ''}
                </span>
              </button>

              <button
                type="button"
                onClick={onToggleHousing}
                title="아키에이지 하우징 건축 및 설치물 수정 모드 (단축키 H)"
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  housingActive
                    ? 'bg-[#173634] text-[#5df7d4] border border-[#38f2c8]/65'
                    : 'bg-[#222a36] hover:bg-[#2c3747] text-[#dce3ec]'
                }`}
              >
                <Home className="w-3 h-3 text-[#38f2c8]" />
                <span>하우징(H)</span>
              </button>

              <button
                type="button"
                onClick={onToggleEmoteWheel}
                title="감정표현 휠 열기 (단축키 B)"
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  emoteWheelOpen || hud.activeEmote
                    ? 'bg-[#2b2618] text-[#fde68a] border border-[#e6b43c]/55'
                    : 'bg-[#222a36] hover:bg-[#2c3747] text-[#dce3ec]'
                }`}
              >
                <Smile className="w-3 h-3" />
                <span>감정(B)</span>
              </button>

              <button
                type="button"
                onClick={onToggleAutoEquip}
                title="나무/바위/몬스터 접근 시 보유한 최적 장비로 자동 전환"
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  hud.autoEquipTool
                    ? 'bg-[#1b323f] text-[#67e8f9] border border-[#62e5ff]/40'
                    : 'bg-[#222a36] text-[#94a3b8] border border-white/8'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>자동무기 {hud.autoEquipTool ? 'ON' : 'OFF'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const next = !hotbarEditMode;
                  setHotbarEditMode(next);
                  if (!next) setEditingSlotIndex(null);
                  else setEnvDrawerOpen(false);
                }}
                title="하단 6칸 단축바 항목 변경 (슬롯 우클릭으로도 바로 설정 가능)"
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  hotbarEditMode || editingSlotIndex !== null
                    ? 'bg-[#e6b43c] text-[#17130d] font-semibold'
                    : 'bg-[#222a36] hover:bg-[#2c3747] text-[#dce3ec]'
                }`}
              >
                <Settings2 className="w-3 h-3" />
                <span>{hotbarEditMode ? '설정 완료' : '단축 설정'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingSlotIndex(null);
                  setEnvDrawerOpen((v) => !v);
                }}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  envDrawerOpen
                    ? 'bg-[#2a394a] text-[#62e5ff] border border-[#62e5ff]/40'
                    : 'bg-[#222a36] hover:bg-[#2c3747] text-[#dce3ec]'
                }`}
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>시간 · 날씨</span>
              </button>
            </div>
          </div>

          {/* Bottom Row: 6-Slot Exposed Customizable Shortcut Bar (Keys 1 - 6) */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2">
            {hud.hotbarSlots.map((slotItem, idx) => {
              const meta =
                HOTBAR_PICKER_OPTIONS.find((o) => o.id === slotItem) || HOTBAR_PICKER_OPTIONS[0];
              const isWeapon = slotItem.startsWith('weapon:');
              const weaponId = isWeapon ? (slotItem.slice(7) as WeaponId) : undefined;
              const isOwned = !weaponId || hud.ownedWeapons.includes(weaponId);
              const isEquipped = !!weaponId && hud.equippedWeapon === weaponId;
              const isEditingThis = editingSlotIndex === idx;
              const badge = getSlotBadgeText(slotItem);

              return (
                <button
                  key={`${idx}-${slotItem}`}
                  type="button"
                  onClick={() => handleSlotClick(idx)}
                  onContextMenu={(e) => handleSlotRightClick(e, idx)}
                  title={`${meta.label} (단축키 ${idx + 1} · 우클릭으로 슬롯 변경)`}
                  className={`relative flex flex-col items-center justify-center w-[64px] sm:w-[74px] h-[54px] rounded-lg border transition-all cursor-pointer ${
                    isEditingThis
                      ? 'bg-[#2b2618] border-[#e6b43c] shadow-[0_0_0_1px_rgba(230,180,60,0.45)]'
                      : hotbarEditMode
                        ? 'bg-[#1e2631] hover:bg-[#2a3545] border-[#e6b43c]/50 border-dashed'
                        : isEquipped
                          ? 'bg-[#1a3140] border-[#62e5ff]/80 shadow-[inset_0_0_12px_rgba(98,229,255,0.18)]'
                          : isOwned
                            ? 'bg-[#1d242f] hover:bg-[#273140] border-white/12'
                            : 'bg-[#171c24] hover:bg-[#202733] border-white/8'
                  }`}
                >
                  {/* Key Number Badge */}
                  <span className="absolute top-1 left-1.5 text-[10px] font-mono-num font-bold text-[#94a3b8]">
                    {idx + 1}
                  </span>

                  {/* Live Inventory / Equip / Status Readout */}
                  {badge && (
                    <span
                      className={`absolute top-1 right-1.5 text-[9px] font-mono-num font-bold ${badge.tone}`}
                    >
                      {badge.text}
                    </span>
                  )}

                  {/* Slot Icon */}
                  <div className="mt-1">{renderHotbarIcon(slotItem, isOwned)}</div>

                  {/* Short Label */}
                  <span
                    className={`mt-0.5 text-[10px] font-medium truncate max-w-[66px] ${
                      isEquipped
                        ? 'text-[#e0f8ff] font-semibold'
                        : isOwned
                          ? 'text-[#dce3ec]'
                          : 'text-[#7c8798]'
                    }`}
                  >
                    {meta.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
    </>
  );
};
