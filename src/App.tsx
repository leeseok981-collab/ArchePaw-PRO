import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/engine';
import {
  ArmorId,
  DEFAULT_HOTBAR_SLOTS,
  EmoteId,
  FloatingFeedback,
  HotbarItemId,
  HousingColorId,
  HousingKind,
  HousingMaterial,
  HousingStageId,
  HudSnapshot,
  PlayerClassId,
  QuestId,
  TimePreset,
  WarriorSkillId,
  WeaponId,
  WeatherKind,
  WORLD_TIERS,
} from './game/types';
import { TitleScreen } from './components/TitleScreen';
import { GameHud } from './components/GameHud';
import type { WorkshopTab } from './components/WorkshopModal';
import { MobileControls } from './components/MobileControls';

const WorkshopModal = lazy(() =>
  import('./components/WorkshopModal').then((m) => ({ default: m.WorkshopModal })),
);
const MasteryModal = lazy(() =>
  import('./components/MasteryModal').then((m) => ({ default: m.MasteryModal })),
);
const TrialTowerModal = lazy(() =>
  import('./components/TrialTowerModal').then((m) => ({ default: m.TrialTowerModal })),
);

const INITIAL_HUD: HudSnapshot = {
  phase: 'title',
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
  },
  upgrades: { toolLevel: 1, bootsLevel: 1, armorLevel: 1 },
  ownedWeapons: ['crystal_sword'],
  equippedWeapon: 'crystal_sword',
  ownedArmors: ['pioneer_denim'],
  equippedArmor: 'pioneer_denim',
  autoEquipTool: true,
  hotbarSlots: [...DEFAULT_HOTBAR_SLOTS],
  quests: [],
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
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [feedbacks, setFeedbacks] = useState<FloatingFeedback[]>([]);
  const [muted, setMuted] = useState(false);
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
    if (!emoteWheelOpen && !masteryOpen && !trialTowerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.stopImmediatePropagation();
        e.preventDefault();
        setEmoteWheelOpen(false);
        setMasteryOpen(false);
        setTrialTowerOpen(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [emoteWheelOpen, masteryOpen, trialTowerOpen]);

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

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [pushFeedback, openWorkshop, openTrialTower, toggleQuestLog, toggleEmoteWheel, toggleMastery]);

  const handlePreviewClass = useCallback((classId: PlayerClassId) => {
    engineRef.current?.previewClass(classId);
  }, []);

  const handleStartNew = useCallback((classId: PlayerClassId, nickname: string) => {
    engineRef.current?.startGame(false, classId, nickname);
  }, []);

  const handleContinueSave = useCallback(() => {
    engineRef.current?.startGame(true);
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

  const handlePause = useCallback(() => {
    setEmoteWheelOpen(false);
    setMasteryOpen(false);
    setTrialTowerOpen(false);
    setWorkshopOpen(false);
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

  const handleSetPlayerName = useCallback((name: string) => {
    engineRef.current?.setMultiplayerName(name);
  }, []);

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
  }, []);

  const handleLoadGame = useCallback(() => {
    engineRef.current?.loadSavedGame(false);
  }, []);

  const handleResetWorld = useCallback(() => {
    engineRef.current?.resetWorldAndClearSave();
  }, []);

  const handleExportSave = useCallback(() => {
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

  const handleImportSave = useCallback((jsonText: string) => {
    engineRef.current?.importSaveJson(jsonText);
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#12161c]">
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full" />

      {hud.webglError && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#12161c] p-6">
          <div className="max-w-md rounded-2xl bg-[#1a2029] border border-white/10 p-6 text-center space-y-3">
            <h2 className="text-lg font-bold text-[#f7f3ea]">3D 렌더링을 시작할 수 없습니다</h2>
            <p className="text-sm text-[#aeb7c4]">{hud.webglError}</p>
          </div>
        </div>
      )}

      {hud.phase === 'title' && !hud.webglError && (
        <TitleScreen
          saveSummary={hud.saveSummary}
          sharedRoomId={
            new URLSearchParams(window.location.search).get('room')?.trim() || null
          }
          currentRoomId={hud.multiplayer.roomId}
          mpConnected={hud.multiplayer.connected}
          selectedClass={hud.playerClass}
          onPreviewClass={handlePreviewClass}
          onStartNew={handleStartNew}
          onContinue={handleContinueSave}
          onJoinRoom={handleJoinRoom}
          onGetShareUrl={handleGetShareUrl}
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
        />
      )}

      {hud.phase === 'playing' &&
        mobileTouchEnabled &&
        !hud.webglError &&
        !masteryOpen &&
        !trialTowerOpen &&
        !workshopOpen && (
          <MobileControls
            hud={hud}
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

        {hud.phase === 'paused' && !hud.webglError && (
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
            onUpgradeBoots={() => engineRef.current?.upgradeBoots()}
            onExpandWorld={() => engineRef.current?.expandWorld()}
            onSaveGame={handleSaveGame}
            onLoadGame={handleLoadGame}
            onResetWorld={handleResetWorld}
            onExportSave={handleExportSave}
            onImportSave={handleImportSave}
          />
        )}
      </Suspense>
    </main>
  );
}
