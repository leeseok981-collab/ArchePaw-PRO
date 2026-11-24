import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ArmorId,
  ARMORS_CATALOG,
  ArmorSpec,
  BossHudSnapshot,
  CameraPerspectiveMode,
  DAILY_QUESTS_CATALOG,
  DailyQuestId,
  DailyQuestsHudState,
  DEFAULT_HOTBAR_SLOTS,
  ELEMENT_META,
  EmoteId,
  EMOTES_CATALOG,
  FloatingFeedback,
  FOOD_CATALOG,
  FoodId,
  GameMode,
  GamePhase,
  getClassSkillsCatalog,
  getClassSpec,
  getCreativeDefaultHotbarForClass,
  getDefaultHotbarForClass,
  getProficiencyRankTitle,
  getRegionInfoAt,
  HotbarItemId,
  HOUSING_CATALOG,
  HOUSING_COLORS,
  HOUSING_MATERIALS,
  HOUSING_TILE_SIZE,
  HOUSING_WALL_HEIGHT,
  HousingColorId,
  HousingEdge,
  HousingKind,
  HousingMaterial,
  HousingMode,
  HousingStageId,
  HudSnapshot,
  InteractableHint,
  Inventory,
  MATERIAL_ITEMS_CATALOG,
  MaterialItemId,
  MinimapEntity,
  MonsterSpecies,
  NearbyMonsterOverlay,
  PlayerClassId,
  PlayerUpgrades,
  PROFICIENCY_CATALOG,
  ProficiencyId,
  ProficiencySnapshot,
  ProficiencyState,
  QuestId,
  QuestSnapshot,
  SaveMetaSummary,
  SharedSpawnedMonsterPayload,
  SPAWN_EGGS_CATALOG,
  SpawnEggId,
  SpiritRank,
  TimePreset,
  TRIAL_TOWER_FLOORS,
  WARRIOR_SKILLS_CATALOG,
  WarriorSkillId,
  WarriorSkillSnapshot,
  WeaponId,
  WEAPONS_CATALOG,
  WeaponSpec,
  WeatherKind,
  WORLD_TIERS,
  WorldRecord,
  getHousingPieceCost,
  getHousingPieceMaxDurability,
  getHousingRepairCost,
} from './types';
import { SoundEngine } from './audio';
import { createProceduralTextures, ProceduralTexturePack } from './textures';
import {
  buildTerrainMesh,
  buildWaterMeshes,
  COAST_PIER_X,
  COAST_PIER_Z,
  getTerrainHeight,
  getWaterDepthAt,
  getWaterSurfaceAt,
  isWaterAt,
  WorldWaterBundle,
} from './terrain';
import { CatWarriorRig, createCatWarrior } from './catWarrior';
import { WorldEnvironmentController } from './environment';
import { MonsterLibrary, WorldMonster } from './monsters';
import {
  canonicalizeEdge,
  getStairsAscentGridDelta,
  getStairsSurfaceY,
  getTileSlotKey,
  getTileWorldPose,
  HousingGhostRig,
  HousingLibrary,
  isFixtureKind,
  isFurnitureKind,
  isTopCoverKind,
  isWalkableTopKind,
  isWallKind,
  neighborMaskToSig,
  PlacedHousingTile,
  TileNeighborMask,
  updateTileDamageVisual,
} from './housing';
import {
  clearSavedGame,
  createEmptyDailyQuestState,
  DailyQuestSaveState,
  formatSavedTime,
  GameSaveData,
  getSaveSummary,
  getTodayDateKey,
  isValidSaveData,
  isValidSavedTile,
  loadDailyQuestState,
  loadGameFromStorage,
  loadWorldData,
  saveDailyQuestState,
  saveGameToStorage,
  saveWorldData,
  VALID_HOUSING_COLORS,
} from './saveSystem';
import {
  ClaimedLandPlot,
  createCoastalPierLandmark,
  createForestMushroomGrove,
  createLandPlotVisual,
  createMineEntranceLandmark,
  createOtherPlayerHouse,
  createParticlePool,
  createRuinsLandmark,
  createScenicWaterfallLandmark,
  createTrialDungeonArena,
  createTrialTowerLandmark,
  OtherPlayerPlot,
  ParticlePool,
  ScenicWaterfallRig,
  StaticCollider,
  TRIAL_DUNGEON_RADIUS,
  TRIAL_DUNGEON_X,
  TRIAL_DUNGEON_Y,
  TRIAL_DUNGEON_Z,
  TrialDungeonArenaRig,
  WalkableDeck,
  WorldAssetLibrary,
  WorldLandmark,
  WorldResourceNode,
} from './worldObjects';
import {
  MultiplayerClient,
  MultiplayerTransport,
  RemotePlayerPayload,
  RoomDailyQuestPayload,
  SharedHousingPayload,
  SharedPlotPayload,
} from './multiplayer';
import { GameSettings, getDefaultSettings } from './userConfig';

// Pre-allocated module-scope scratch objects (zero GC in render loop)
const _moveDir = new THREE.Vector3();
const _camForward = new THREE.Vector3();
const _camRight = new THREE.Vector3();
const _camDesired = new THREE.Vector3();
const _waterSunDir = new THREE.Vector3();
const _waterSunColor = new THREE.Color();
const _waterSkyHorizon = new THREE.Color();
const _waterSkyZenith = new THREE.Color();
const _waterFogColor = new THREE.Color();
const _waterEnvPayload = {
  elapsed: 0,
  sunDir: _waterSunDir,
  sunColor: _waterSunColor,
  skyHorizon: _waterSkyHorizon,
  skyZenith: _waterSkyZenith,
  fogColor: _waterFogColor,
  fogDensity: 0.0024,
  nightFactor: 0,
};
const _camLookAt = new THREE.Vector3();
const _projVec = new THREE.Vector3();
const _rayMouse = new THREE.Vector2();

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export interface EmoteBroadcastPayload {
  emoteId: EmoteId | null;
  x: number;
  y: number;
  z: number;
  yaw: number;
  timestamp: number;
}

export interface EngineCallbacks {
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onFloatingFeedback: (item: FloatingFeedback) => void;
  onOpenWorkshop: (tab: 'forge' | 'armor' | 'inventory' | 'expand') => void;
  onOpenTrialTower?: () => void;
  onToggleQuestLog?: () => void;
  onToggleEmoteWheel?: () => void;
  onToggleMastery?: () => void;
  onEmoteBroadcast?: (payload: EmoteBroadcastPayload) => void;
}

interface RemotePlayerEntity {
  id: string;
  name: string;
  playerClass: PlayerClassId;
  rig: CatWarriorRig;
  nameplate: THREE.Sprite;
  nameTex: THREE.CanvasTexture;
  nameMat: THREE.SpriteMaterial;
  x: number;
  y: number;
  z: number;
  yaw: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  targetYaw: number;
  speed: number;
  isSprinting: boolean;
  isGrounded: boolean;
  swingTimer: number;
  weapon: WeaponId;
  armor: ArmorId;
  emote: EmoteId | null;
  emoteTime: number;
}

export class GameEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private isSoftwareGl: boolean;

  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private sunLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private rimLight!: THREE.DirectionalLight;
  private fog!: THREE.FogExp2;
  private environment!: WorldEnvironmentController;
  private envRT: THREE.WebGLRenderTarget | null = null;
  private textures!: ProceduralTexturePack;
  private assets!: WorldAssetLibrary;
  private monsterLib!: MonsterLibrary;
  private housingLib!: HousingLibrary;
  private terrainMesh!: THREE.Mesh;
  private particles!: ParticlePool;
  private catRig!: CatWarriorRig;
  public readonly sound = new SoundEngine();

  private resources: WorldResourceNode[] = [];
  private monsters: WorldMonster[] = [];
  private landmarks: WorldLandmark[] = [];
  private placedHouses: PlacedHousingTile[] = [];
  private staticColliders: StaticCollider[] = [];
  private walkableDecks: WalkableDeck[] = [];
  private completedHouseCells = new Set<string>();
  private waterBundle: WorldWaterBundle | null = null;
  private otherPlayerPlots: OtherPlayerPlot[] = [];
  private claimedPlots: ClaimedLandPlot[] = [];
  private plotCounter = 1;
  private suppressedResourceIds = new Set<string>();
  private lanterns: Array<{ x: number; z: number; group: THREE.Group; flame: THREE.Mesh; light: THREE.PointLight }> = [];
  private frontierRingMesh!: THREE.Mesh;
  private trialArenaRing: THREE.Mesh | null = null;
  private trialDungeonRig: TrialDungeonArenaRig | null = null;
  private inTrialDungeon = false;
  private dungeonReturnPos = { x: 24.0, z: -56.0 };
  private trialTowerActiveFloor: number | null = null;
  private trialTowerHighestCleared = 0;
  private trialTowerLastCleared: number | null = null;
  private trialBossId: string | null = null;
  private frontierRingRadius = WORLD_TIERS[0].radius;
  private targetFrontierRadius = WORLD_TIERS[0].radius;
  private worldDeferredBooted = false;
  private isSwimming = false;
  private breath = 100;
  private maxBreath = 100;
  private swimSplashTimer = 0;
  private breathDamageTimer = 0;

  // World & Mode State (Survival vs Creative + Multi-World Registry)
  private gameMode: GameMode = 'survival';
  private currentWorldId: string | null = null;
  private currentWorldName = '아키포우 월드';
  private worldIsMultiplayer = false;
  private worldRoomCode = 'main';

  // Real-Time Multiplayer State (Unified Shared Server: WebSocket + HTTP fallback)
  private mpClient: MultiplayerClient | null = null;
  private mpConnected = false;
  private mpTransport: MultiplayerTransport = 'offline';
  private mpServerHost = '';
  private mpRoomId = 'main';
  private mpPlayerId = '';
  private mpPlayerName = '';
  private mpSendTimer = 0;
  private remotePlayers = new Map<string, RemotePlayerEntity>();

  // Modular Tile-Connected ArcheAge Housing State
  private housingCounter = 1;
  private housingMode: HousingMode = 'off';
  private housingActiveStage: HousingStageId = 2;
  private selectedBlueprint: HousingKind = 'floor';
  private selectedMaterial: HousingMaterial = 'wood';
  private selectedColor: HousingColorId = 'natural';
  private housingGridSnap = true;
  private housingFreeRotate = false;
  private housingFreeYawDeg = 0;
  private housingHeightOffset = 0;
  private selectedHouseId: string | null = null;
  private ghostRig: HousingGhostRig | null = null;
  private ghostGx = 0;
  private ghostGz = 0;
  private ghostLevel = 0;
  private ghostEdge: HousingEdge | null = null;
  private ghostRotationStep = 0; // 0..3 (90 deg increments)
  private ghostEffectiveRotStep = 0; // resolved rotation/side for wall_torch
  private ghostRotationY = 0;
  private ghostBaseY = 0;
  private ghostEffectiveHeightOffset = 0;
  private ghostX = 0;
  private ghostY = 0;
  private ghostZ = 0;
  private ghostSnapped = false;
  private ghostValid = false;
  private ghostInvalidReason: string | null = null;
  private movingOriginalPose: {
    gx: number;
    gz: number;
    level: number;
    edge: HousingEdge | null;
    rotationStep: number;
    rotationY: number;
    gridSnapped: boolean;
    heightOffset: number;
    x: number;
    z: number;
    baseY: number;
  } | null = null;
  private hasHoveredTerrain = false;
  private lastHoverNdcX = 0;
  private lastHoverNdcY = 0;

  // Save / Persistence State
  private lastSavedAt: number | null = null;
  private saveSummary: SaveMetaSummary | null = null;
  private autoSaveTimer = 0;

  // Game & Inventory / Forge state
  private phase: GamePhase = 'title';
  private playerClass: PlayerClassId = 'warrior';
  private worldTier = 1;
  private inventory: Inventory = {
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
  };
  private hunger = 100;
  private maxHunger = 100;
  private selectedFood: FoodId = 'apple';
  private starvationTickTimer = 0;
  private cameraMode: CameraPerspectiveMode = 'third_back';
  private isFullscreen = false;
  private upgrades: PlayerUpgrades = { toolLevel: 1, bootsLevel: 1, armorLevel: 1 };
  private ownedWeapons: WeaponId[] = ['crystal_sword'];
  private equippedWeapon: WeaponId = 'crystal_sword';
  private ownedArmors: ArmorId[] = ['pioneer_denim'];
  private equippedArmor: ArmorId = 'pioneer_denim';
  private autoEquipTool = true;
  private manualEquipHoldTimer = 0;
  private autoIdleReturnTimer = 0;
  private hotbarSlots: HotbarItemId[] = [...DEFAULT_HOTBAR_SLOTS];
  private level = 1;
  private exp = 0;
  private nextExp = 40;
  private harvestedTotal = 0;
  private plantedSaplings = 0;
  private woodGathered = 0;
  private stoneGathered = 0;
  private ironGathered = 0;
  private leatherGathered = 0;
  private monstersDefeated = 0;
  private bossesDefeated = 0;
  private observedNightWildlife = false;
  private claimedQuests = new Set<QuestId>();
  private notifiedQuests = new Set<QuestId>();
  private dailyQuestState: DailyQuestSaveState = loadDailyQuestState();
  private roomDailyProgress: Partial<Record<DailyQuestId, number>> = {};
  private roomDailyContributors: Partial<Record<DailyQuestId, string>> = {};
  private notifiedDailyQuests = new Set<DailyQuestId>();
  private mpRoomGameMode: GameMode = 'survival';

  // Warrior Skill Mastery & 4-Branch Proficiency System
  private skillMasteryPoints = 1;
  private skillRanks: Record<WarriorSkillId, number> = {
    whirlwind: 1,
    vanguard_dash: 1,
    earthbreaker: 1,
    warcry: 1,
  };
  private skillCooldowns: Record<WarriorSkillId, number> = {
    whirlwind: 0,
    vanguard_dash: 0,
    earthbreaker: 0,
    warcry: 0,
  };
  private activeSkillAnim: WarriorSkillId | null = null;
  private skillAnimTimer = 0;
  private skillAnimDuration = 0.5;
  private warcryBuffRemaining = 0;
  private warcryBuffDuration = 8;
  private proficiencies: Record<ProficiencyId, ProficiencyState> = {
    combat: { level: 1, exp: 0, nextExp: 60 },
    logging: { level: 1, exp: 0, nextExp: 60 },
    mining: { level: 1, exp: 0, nextExp: 60 },
    craft: { level: 1, exp: 0, nextExp: 60 },
  };

  // Player kinematics & survival
  private playerX = 0;
  private playerY = 0;
  private playerZ = 6.2;
  private playerYaw = Math.PI;
  private prevPlayerYaw = Math.PI;
  private velX = 0;
  private velY = 0;
  private velZ = 0;
  private isGrounded = true;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private hp = 100;
  private maxHp = 100;
  private playerHurtCooldown = 0;
  private stamina = 100;
  private maxStamina = 100;
  private staminaExhausted = false;
  private landSquash = 0;
  private footstepTimer = 0;

  // Emote state (multiplayer-broadcastable)
  private activeEmote: EmoteId | null = null;
  private emoteTime = 0;
  private emoteDuration = 0;
  private monsterCounter = 1;

  // Gathering / interaction state
  private swingTimer = 0;
  private gatherCooldown = 0;
  private activeGatherNode: WorldResourceNode | null = null;
  private hitstopTimer = 0;
  private shakeIntensity = 0;
  private bannerMessage: string | null = null;
  private bannerTimer = 0;
  private feedbackCounter = 1;
  private nodeCounter = 1;
  private wasNightUndeadActive = false;

  // Camera state
  private cameraYaw = 0;
  private cameraPitch = 0.36;
  private cameraDist = 7.6;
  private targetCameraDist = 7.6;
  private titleOrbitAngle = 0.45;
  private titleCameraMode: 'scenic' | 'character' = 'scenic';
  private waterfallRig: ScenicWaterfallRig | null = null;
  private meadowGrassMesh: THREE.InstancedMesh | null = null;
  private meadowGrassMaxCount = 1200;

  // Optimization & Settings state
  private settings: GameSettings = getDefaultSettings();
  private cullDistance = 125;
  private frameCounter = 0;
  private fpsAccumTime = 0;
  private fpsAccumFrames = 0;
  private currentFps = 60;
  private lastRenderTimeMs = 0;

  // Input state (Keyboard + Mouse + Multi-Touch Mobile Joystick/Camera/Pinch)
  private heldKeys = new Set<string>();
  private mobileMoveX = 0;
  private mobileMoveZ = 0;
  private mobileSprint = false;
  private isDraggingCamera = false;
  private activeCamPointerId: number | null = null;
  private activePointers = new Map<number, { x: number; y: number }>();
  private pinchLastDist = 0;
  private dragMovedDist = 0;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private raycaster = new THREE.Raycaster();

  // Loop & lifecycle
  private running = false;
  private disposed = false;
  private frameId = 0;
  private lastTimeMs = 0;
  private elapsedTime = 0;
  private hudEmitTimer = 0;
  private webglError: string | null = null;

  constructor(container: HTMLElement, callbacks: EngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.isSoftwareGl = detectSoftwareWebGL();
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      52,
      Math.max(container.clientWidth, 1) / Math.max(container.clientHeight, 1),
      0.1,
      580,
    );

    this.initScene();
    this.bindEvents();
    this.startLoop();
  }

  private getEquippedSpec(): WeaponSpec {
    return WEAPONS_CATALOG.find((w) => w.id === this.equippedWeapon) || WEAPONS_CATALOG[0];
  }

  private getEquippedArmorSpec(): ArmorSpec {
    return ARMORS_CATALOG.find((a) => a.id === this.equippedArmor) || ARMORS_CATALOG[0];
  }

  private recalcPlayerStats(refillVitals = false): void {
    const cls = getClassSpec(this.playerClass);
    const armor = this.getEquippedArmorSpec();
    const craftBonusLevels = Math.max(0, this.proficiencies.craft.level - 1);
    const prevMaxHp = this.maxHp;
    this.maxHp = cls.baseHp + armor.bonusHp + craftBonusLevels * 6;
    this.maxStamina = cls.baseStamina + (this.upgrades.bootsLevel - 1) * 30 + armor.bonusStamina + craftBonusLevels * 5;
    if (refillVitals) {
      this.hp = this.maxHp;
      this.stamina = this.maxStamina;
    } else {
      if (this.maxHp > prevMaxHp) {
        this.hp = Math.min(this.maxHp, this.hp + (this.maxHp - prevMaxHp));
      } else {
        this.hp = Math.min(this.maxHp, this.hp);
      }
      this.stamina = Math.min(this.maxStamina, this.stamina);
    }
    const classArmors = ARMORS_CATALOG.filter((a) => !a.classId || a.classId === this.playerClass);
    const tierIdx = classArmors.findIndex((a) => a.id === this.equippedArmor);
    this.upgrades.armorLevel = Math.min(3, Math.max(1, tierIdx + 1));
  }

  private initScene(): void {
    try {
      const renderer = new THREE.WebGLRenderer({
        antialias: !this.isSoftwareGl,
        powerPreference: 'high-performance',
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
      renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, isMobile ? 1.25 : 1.5));
      renderer.setSize(this.container.clientWidth || window.innerWidth, this.container.clientHeight || window.innerHeight);
      renderer.shadowMap.enabled = !this.isSoftwareGl;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      this.container.appendChild(renderer.domElement);
      this.renderer = renderer;

      const pmrem = new THREE.PMREMGenerator(renderer);
      this.envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
      this.scene.environment = this.envRT.texture;
      pmrem.dispose();

      renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
      renderer.domElement.addEventListener('webglcontextrestored', this.handleContextRestored);
    } catch {
      this.webglError = 'WebGL 렌더링 컨텍스트를 초기화할 수 없습니다.';
      this.emitHudSnapshot();
      return;
    }

    const skyColor = new THREE.Color(0xc5e1f5);
    this.scene.background = skyColor;
    this.fog = new THREE.FogExp2(0xc5e1f5, 0.0029);
    this.scene.fog = this.fog;

    const hemi = new THREE.HemisphereLight(0xbbe0ff, 0x5c6e44, 0.92);
    hemi.position.set(0, 60, 0);
    this.scene.add(hemi);
    this.hemiLight = hemi;

    const isMobileShadow = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    const sun = new THREE.DirectionalLight(0xfff1d6, 2.15);
    sun.position.set(28, 42, 22);
    sun.castShadow = !this.isSoftwareGl;
    sun.shadow.mapSize.width = isMobileShadow ? 1024 : 1536;
    sun.shadow.mapSize.height = isMobileShadow ? 1024 : 1536;
    const d = 28;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.camera.near = 4;
    sun.shadow.camera.far = 125;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.025;
    this.scene.add(sun);
    this.scene.add(sun.target);
    this.sunLight = sun;

    const rim = new THREE.DirectionalLight(0xa3d4ff, 0.55);
    rim.position.set(-24, 18, -28);
    this.scene.add(rim);
    this.rimLight = rim;

    this.environment = new WorldEnvironmentController(
      this.scene,
      this.fog,
      this.sunLight,
      this.hemiLight,
      this.rimLight,
      this.sound,
    );

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTextures(maxAniso);
    this.assets = new WorldAssetLibrary(this.textures);
    this.monsterLib = new MonsterLibrary();
    this.housingLib = new HousingLibrary(this.textures);

    const terrain = buildTerrainMesh(this.textures.grassGround);
    this.terrainMesh = terrain;
    this.scene.add(terrain);

    this.saveSummary = getSaveSummary();
    if (this.saveSummary) {
      this.lastSavedAt = this.saveSummary.savedAt;
    }

    this.waterBundle = buildWaterMeshes();
    this.scene.add(this.waterBundle.group);

    const ringGeo = new THREE.RingGeometry(0.992, 1.0, 128);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x62e5ff,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      depthWrite: false,
      fog: false,
    });
    this.frontierRingMesh = new THREE.Mesh(ringGeo, ringMat);
    this.frontierRingMesh.position.y = 0.45;
    this.frontierRingMesh.scale.setScalar(this.frontierRingRadius);
    this.scene.add(this.frontierRingMesh);

    const camp = this.assets.createCampfireWorkbench(0, 0.5);
    this.landmarks.push(camp);
    this.scene.add(camp.group);

    const signpost = this.assets.createSignpost(-2.6, -4.2);
    this.landmarks.push(signpost);
    this.scene.add(signpost.group);

    const monolith = this.assets.createFrontierMonolith(0, -88.0);
    this.landmarks.push(monolith);
    this.scene.add(monolith.group);

    // Northern Tower of Trials (시련의 탑 1~30층)
    const trialTower = createTrialTowerLandmark(24.0, -72.0);
    this.landmarks.push(trialTower.landmark);
    this.scene.add(trialTower.landmark.group);
    this.staticColliders.push(...trialTower.colliders);

    // Scenic Waterfall Cliff & Plunge Pool Vista (featured on rotating Title screen & open world)
    this.waterfallRig = createScenicWaterfallLandmark();
    this.scene.add(this.waterfallRig.group);
    this.staticColliders.push(...this.waterfallRig.colliders);

    this.catRig = createCatWarrior(this.textures);
    this.playerY = getTerrainHeight(this.playerX, this.playerZ);
    this.catRig.root.position.set(this.playerX, this.playerY, this.playerZ);
    this.catRig.root.rotation.y = this.playerYaw;
    this.catRig.setEquippedWeapon(this.equippedWeapon);
    this.catRig.setEquippedArmor(this.equippedArmor);
    this.scene.add(this.catRig.root);

    this.particles = createParticlePool(180);
    this.scene.add(this.particles.group);

    this.applySettings(this.settings);
    this.initMultiplayer();
    this.emitHudSnapshot();

    // Stage 2 Deferred World Hydration (keeps shared-link first paint under ~1 frame!)
    requestAnimationFrame(() => {
      if (this.disposed) return;
      this.ensureWorldBooted();
      if (!this.isSoftwareGl && this.renderer) {
        requestAnimationFrame(() => {
          if (!this.disposed && this.renderer) {
            this.renderer.compile(this.scene, this.camera);
          }
        });
      }
    });
  }

  private ensureWorldBooted(): void {
    if (this.worldDeferredBooted) return;
    this.worldDeferredBooted = true;

    const grass = this.assets.createMeadowGrassInstanced(this.meadowGrassMaxCount, 210);
    this.meadowGrassMesh = grass;
    grass.count = Math.floor(this.meadowGrassMaxCount * this.settings.grassDensity);
    grass.visible = grass.count > 0;
    this.scene.add(grass);

    const neighbor1 = createOtherPlayerHouse(
      'other_luna',
      '모험가 루나',
      '루나의 통나무집',
      -24.0,
      16.0,
      0.42,
      0x9b4634,
      0xeae0cb,
    );
    const neighbor2 = createOtherPlayerHouse(
      'other_tor',
      '제작장인 토르',
      '토르의 석조 작업장',
      26.0,
      -15.0,
      -0.65,
      0x43668f,
      0xd5dae0,
    );
    this.otherPlayerPlots.push(neighbor1, neighbor2);
    this.scene.add(neighbor1.group);
    this.scene.add(neighbor2.group);
    this.staticColliders.push(...neighbor1.colliders, ...neighbor2.colliders);

    // 5-Biome Landmarks (North Desert Mine, West Wind Valley Grove, South Volcano Ruins, East Ocean Pier)
    const mineLandmark = createMineEntranceLandmark(-7.0, -72.0, 0.14);
    this.scene.add(mineLandmark.group);
    this.staticColliders.push(...mineLandmark.colliders);

    const forestGrove = createForestMushroomGrove(-64.0, -10.0);
    this.scene.add(forestGrove.group);
    this.staticColliders.push(...forestGrove.colliders);

    const ruinsLandmark = createRuinsLandmark(14.0, 74.0, Math.PI);
    this.scene.add(ruinsLandmark.group);
    this.staticColliders.push(...ruinsLandmark.colliders);

    // Eastern Ocean Pier extending eastward (+X) from shore
    const coastPier = createCoastalPierLandmark(COAST_PIER_X, COAST_PIER_Z, Math.PI / 2);
    this.scene.add(coastPier.group);
    this.staticColliders.push(...coastPier.colliders);
    if (coastPier.decks) {
      this.walkableDecks.push(...coastPier.decks);
    }

    // Dedicated Isolated 3D Trial Tower Dungeon Chamber at (640, 56, -640)
    this.trialDungeonRig = createTrialDungeonArena();
    this.scene.add(this.trialDungeonRig.group);

    this.spawnTierResources(1);
    this.emitHudSnapshot();
  }

  private isSpotClear(x: number, z: number, minDist = 4.5): boolean {
    if (isWaterAt(x, z)) return false;
    if (Math.hypot(x, z - 0.5) < 8.5) return false;
    if (Math.hypot(x, z - 6.2) < 5.0) return false;
    // Keep cardinal crossroads clean (scaled for 3x wider world)
    if (z < 2 && z > -215 && Math.abs(x - Math.sin(z * 0.03) * 4.2) < 4.2) return false;
    if (z > 2 && z < 98 && Math.abs(x - (-3.5 + Math.sin(z * 0.035) * 3.0)) < 4.0) return false;
    if (x < -2 && x > -210 && Math.abs(z - Math.sin(x * 0.032) * 3.8) < 4.0) return false;
    if (x > 2 && x < 210 && Math.abs(z - (-3.2 + Math.cos(x * 0.03) * 3.5)) < 4.0) return false;
    // Keep biome landmark centers & Tower of Trials arena clear
    if (Math.hypot(x - -7.0, z - -72.0) < 9.5) return false;
    if (Math.hypot(x - 24.0, z - -72.0) < 12.0) return false;
    if (Math.hypot(x - 24.0, z - -61.5) < 11.0) return false;
    if (Math.hypot(x - -64.0, z - -10.0) < 7.5) return false;
    if (Math.hypot(x - 98.0, z - 6.0) < 10.5) return false;
    if (Math.hypot(x - COAST_PIER_X, z - (COAST_PIER_Z + 4.0)) < 9.5) return false;

    for (const sc of this.staticColliders) {
      if (sc.shape === 'circle') {
        if (Math.hypot(x - sc.x, z - sc.z) < sc.radius + minDist * 0.65) return false;
      } else {
        if (Math.abs(x - sc.x) < sc.halfW + minDist * 0.6 && Math.abs(z - sc.z) < sc.halfD + minDist * 0.6) {
          return false;
        }
      }
    }
    for (const op of this.otherPlayerPlots) {
      if (Math.abs(x - op.x) < op.halfW + 2.4 && Math.abs(z - op.z) < op.halfD + 2.4) return false;
    }
    for (const lm of this.landmarks) {
      if (Math.hypot(x - lm.x, z - lm.z) < minDist + lm.radius) return false;
    }
    for (const r of this.resources) {
      if (Math.hypot(x - r.x, z - r.z) < minDist) return false;
    }
    return true;
  }

  private spawnTierResources(tier: number): void {
    let seed = tier * 9301 + 49297;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    const spawnBatch = (
      count: number,
      minR: number,
      maxR: number,
      creator: (id: string, x: number, z: number, scale: number) => WorldResourceNode,
      angleRange?: [number, number],
    ) => {
      let created = 0;
      let tries = 0;
      while (created < count && tries < count * 22) {
        tries++;
        const r = minR + Math.sqrt(rand()) * (maxR - minR);
        const a = angleRange
          ? angleRange[0] + rand() * (angleRange[1] - angleRange[0])
          : rand() * Math.PI * 2;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        if (!this.isSpotClear(x, z, 5.2)) continue;

        const scale = 0.88 + rand() * 0.36;
        const id = `res_${this.nodeCounter++}`;
        const node = creator(id, x, z, scale);
        this.resources.push(node);
        this.scene.add(node.group);
        created++;
      }
    };

    const spawnMonsterBatch = (
      count: number,
      minR: number,
      maxR: number,
      species: MonsterSpecies,
      angleRange?: [number, number],
    ) => {
      let created = 0;
      let tries = 0;
      while (created < count && tries < count * 22) {
        tries++;
        const r = minR + Math.sqrt(rand()) * (maxR - minR);
        const a = angleRange
          ? angleRange[0] + rand() * (angleRange[1] - angleRange[0])
          : rand() * Math.PI * 2;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        if (!this.isSpotClear(x, z, 5.5)) continue;
        if (this.monsters.some((m) => Math.hypot(x - m.homeX, z - m.homeZ) < 11.0)) continue;

        const id = `mon_${this.monsterCounter++}`;
        const m = this.monsterLib.createMonster(id, species, x, z, tier);
        if (m.isNightOnly) {
          const isNightNow = this.environment ? this.environment.isNightCreaturesActive() : false;
          m.group.visible = isNightNow;
        }
        this.monsters.push(m);
        this.scene.add(m.group);
        created++;
      }
    };

    const spawnSpiritBatch = (
      count: number,
      minR: number,
      maxR: number,
      species: 'water_spirit' | 'wind_spirit' | 'fire_spirit' | 'earth_spirit',
      rank: SpiritRank,
      angleRange: [number, number],
    ) => {
      let created = 0;
      let tries = 0;
      while (created < count && tries < count * 26) {
        tries++;
        const r = minR + Math.sqrt(rand()) * (maxR - minR);
        const a = angleRange[0] + rand() * (angleRange[1] - angleRange[0]);
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        if (!this.isSpotClear(x, z, 5.2)) continue;
        if (this.monsters.some((m) => Math.hypot(x - m.homeX, z - m.homeZ) < 10.5)) continue;

        const id = `spirit_${rank}_${this.monsterCounter++}`;
        const m = this.monsterLib.createElementalSpirit(id, species, rank, x, z, tier);
        this.monsters.push(m);
        this.scene.add(m.group);
        created++;
      }
    };

    // Cardinal Biome Angle Sectors: East=Water(해안·바다), West=Wind(바람의 계곡), South=Fire(화산), North=Earth(사막)
    const EAST_WATER: [number, number] = [-Math.PI * 0.28, Math.PI * 0.28];
    const WEST_WIND: [number, number] = [Math.PI * 0.72, Math.PI * 1.28];
    const SOUTH_FIRE: [number, number] = [Math.PI * 0.26, Math.PI * 0.74];
    const NORTH_EARTH: [number, number] = [-Math.PI * 0.74, -Math.PI * 0.26];

    if (tier === 1) {
      const starters: Array<{ type: 'oak' | 'rock' | 'iron'; x: number; z: number; s: number }> = [
        { type: 'oak', x: 7.4, z: 2.2, s: 1.05 },
        { type: 'oak', x: -8.0, z: 2.4, s: 0.96 },
        { type: 'oak', x: 9.2, z: -7.2, s: 1.12 },
        { type: 'rock', x: -6.8, z: 7.8, s: 1.0 },
        { type: 'rock', x: 6.6, z: -3.4, s: 0.92 },
        { type: 'rock', x: -9.4, z: -8.2, s: 1.08 },
        { type: 'iron', x: 6.2, z: -38.0, s: 0.98 },
        { type: 'iron', x: -12.5, z: -46.0, s: 1.04 },
      ];
      for (const st of starters) {
        const id = `res_${this.nodeCounter++}`;
        const node =
          st.type === 'oak'
            ? this.assets.createTreeNode(id, 'oak_tree', st.x, st.z, 1, st.s)
            : st.type === 'iron'
              ? this.assets.createRockNode(id, 'iron_vein', st.x, st.z, 1, st.s)
              : this.assets.createRockNode(id, 'granite_rock', st.x, st.z, 1, st.s);
        this.resources.push(node);
        this.scene.add(node.group);
      }

      spawnBatch(22, 16, 88, (id, x, z, s) => this.assets.createTreeNode(id, 'oak_tree', x, z, 1, s), WEST_WIND);
      spawnBatch(10, 34, 88, (id, x, z, s) => this.assets.createTreeNode(id, 'pine_tree', x, z, 1, s), WEST_WIND);
      spawnBatch(14, 18, 86, (id, x, z, s) => this.assets.createRockNode(id, 'granite_rock', x, z, 1, s), NORTH_EARTH);
      spawnBatch(8, 30, 86, (id, x, z, s) => this.assets.createRockNode(id, 'iron_vein', x, z, 1, s), NORTH_EARTH);
      spawnBatch(10, 18, 82, (id, x, z, s) => this.assets.createTreeNode(id, 'oak_tree', x, z, 1, s), EAST_WATER);
      spawnBatch(10, 18, 82, (id, x, z, s) => this.assets.createRockNode(id, 'granite_rock', x, z, 1, s), SOUTH_FIRE);

      // Curated starter Food Nodes right around the village, waterfall path & meadow borders (7 distinct world foods!)
      const starterFoods: Array<{
        kind:
          | 'apple_tree'
          | 'berry_bush'
          | 'mushroom_patch'
          | 'wild_beehive'
          | 'coconut_palm'
          | 'cactus_pear'
          | 'carrot_patch';
        x: number;
        z: number;
        s: number;
      }> = [
        { kind: 'apple_tree', x: 11.2, z: 6.4, s: 1.02 },
        { kind: 'apple_tree', x: -11.5, z: 7.2, s: 0.96 },
        { kind: 'berry_bush', x: 5.8, z: 10.6, s: 1.05 },
        { kind: 'berry_bush', x: -5.4, z: 11.2, s: 0.98 },
        { kind: 'carrot_patch', x: -10.8, z: -2.2, s: 1.05 },
        { kind: 'carrot_patch', x: 12.6, z: -2.6, s: 1.0 },
        { kind: 'mushroom_patch', x: 19.5, z: 14.2, s: 1.05 },
        { kind: 'mushroom_patch', x: -16.2, z: -11.4, s: 1.0 },
        { kind: 'wild_beehive', x: -15.4, z: 13.8, s: 1.0 },
        { kind: 'wild_beehive', x: 17.8, z: -12.2, s: 1.0 },
        { kind: 'coconut_palm', x: 26.5, z: 2.8, s: 1.02 },
        { kind: 'coconut_palm', x: 38.4, z: -8.6, s: 1.08 },
        { kind: 'cactus_pear', x: -12.5, z: -28.0, s: 1.04 },
        { kind: 'cactus_pear', x: 11.8, z: -31.5, s: 1.0 },
      ];
      for (const sf of starterFoods) {
        const id = `food_${this.nodeCounter++}`;
        const node = this.assets.createFoodNode(id, sf.kind, sf.x, sf.z, 1, sf.s);
        this.resources.push(node);
        this.scene.add(node.group);
      }

      // Biome-distributed wild food batches across Tier 1
      spawnBatch(7, 16, 78, (id, x, z, s) => this.assets.createFoodNode(id, 'apple_tree', x, z, 1, s), WEST_WIND);
      spawnBatch(8, 16, 78, (id, x, z, s) => this.assets.createFoodNode(id, 'berry_bush', x, z, 1, s));
      spawnBatch(6, 20, 82, (id, x, z, s) => this.assets.createFoodNode(id, 'mushroom_patch', x, z, 1, s), WEST_WIND);
      spawnBatch(5, 22, 80, (id, x, z, s) => this.assets.createFoodNode(id, 'wild_beehive', x, z, 1, s), WEST_WIND);
      spawnBatch(7, 24, 82, (id, x, z, s) => this.assets.createFoodNode(id, 'coconut_palm', x, z, 1, s), EAST_WATER);
      spawnBatch(7, 24, 84, (id, x, z, s) => this.assets.createFoodNode(id, 'cactus_pear', x, z, 1, s), NORTH_EARTH);
      spawnBatch(6, 18, 76, (id, x, z, s) => this.assets.createFoodNode(id, 'carrot_patch', x, z, 1, s), SOUTH_FIRE);

      // Cute 최하급 아기 정령 (Baby Elemental Spirits) right near each cardinal meadow border!
      const starterSpirits: Array<{
        species: 'water_spirit' | 'wind_spirit' | 'fire_spirit' | 'earth_spirit';
        x: number;
        z: number;
      }> = [
        { species: 'water_spirit', x: 22.0, z: -2.0 },
        { species: 'wind_spirit', x: -20.0, z: 4.5 },
        { species: 'fire_spirit', x: 4.5, z: 22.5 },
        { species: 'earth_spirit', x: -3.5, z: -22.5 },
      ];
      for (const sp of starterSpirits) {
        const m = this.monsterLib.createElementalSpirit(
          `spirit_baby_${this.monsterCounter++}`,
          sp.species,
          'baby',
          sp.x,
          sp.z,
          1,
        );
        this.monsters.push(m);
        this.scene.add(m.group);
      }

      // Extra Baby Spirits + native monsters in each biome
      spawnSpiritBatch(3, 28, 84, 'water_spirit', 'baby', EAST_WATER);
      spawnSpiritBatch(3, 28, 84, 'wind_spirit', 'baby', WEST_WIND);
      spawnSpiritBatch(3, 28, 84, 'fire_spirit', 'baby', SOUTH_FIRE);
      spawnSpiritBatch(3, 28, 84, 'earth_spirit', 'baby', NORTH_EARTH);

      spawnMonsterBatch(4, 24, 82, 'water_slime', EAST_WATER);
      spawnMonsterBatch(4, 24, 82, 'wind_slime', WEST_WIND);
      spawnMonsterBatch(3, 24, 80, 'meadow_boar', WEST_WIND);
      spawnMonsterBatch(4, 24, 80, 'fire_slime', SOUTH_FIRE);
      spawnMonsterBatch(3, 34, 82, 'ember_wolf', SOUTH_FIRE);
      spawnMonsterBatch(4, 24, 82, 'earth_slime', NORTH_EARTH);
      spawnMonsterBatch(3, 36, 84, 'frost_wolf', NORTH_EARTH);

      spawnMonsterBatch(5, 18, 78, 'night_skeleton');
      spawnMonsterBatch(3, 28, 86, 'night_wraith');

      // Four Cardinal Guardian Spirits (사신수)
      if (!this.monsters.some((m) => m.species === 'azure_dragon_boss')) {
        const azureDragon = this.monsterLib.createMonster(`boss_${this.monsterCounter++}`, 'azure_dragon_boss', 70.0, -4.0, 1);
        this.monsters.push(azureDragon);
        this.scene.add(azureDragon.group);
      }
      if (!this.monsters.some((m) => m.species === 'white_tiger_boss')) {
        const whiteTiger = this.monsterLib.createMonster(`boss_${this.monsterCounter++}`, 'white_tiger_boss', -72.0, 8.0, 1);
        this.monsters.push(whiteTiger);
        this.scene.add(whiteTiger.group);
      }
      if (!this.monsters.some((m) => m.species === 'vermilion_phoenix_boss')) {
        const phoenix = this.monsterLib.createMonster(`boss_${this.monsterCounter++}`, 'vermilion_phoenix_boss', 10.0, 72.0, 1);
        this.monsters.push(phoenix);
        this.scene.add(phoenix.group);
      }
      if (!this.monsters.some((m) => m.species === 'black_tortoise_boss')) {
        const tortoise = this.monsterLib.createMonster(`boss_${this.monsterCounter++}`, 'black_tortoise_boss', -6.0, -76.0, 1);
        this.monsters.push(tortoise);
        this.scene.add(tortoise.group);
      }
    } else {
      // Progressive 10-Tier World Expansion (Tiers 2..10, spanning 96m -> 455m)
      const prevR = WORLD_TIERS[Math.max(0, tier - 2)].radius;
      const nextR = WORLD_TIERS[Math.min(WORLD_TIERS.length - 1, tier - 1)].radius;
      const minR = prevR + 4;
      const maxR = nextR - 4;

      // Progressive Elemental Spirit Rank unlocked by world tier:
      // Tier 2-3: 하급 (lesser), Tier 4-5: 중급 (mid), Tier 6-7: 상급 (high), Tier 8-9: 최상급 (grand), Tier 10: 정령왕 (king)
      const spiritRank: SpiritRank =
        tier <= 3 ? 'lesser' : tier <= 5 ? 'mid' : tier <= 7 ? 'high' : tier <= 9 ? 'grand' : 'king';

      // Tier-scaled resources across newly opened ring
      const treeKind = tier >= 5 ? 'birch_tree' : tier >= 3 ? 'pine_tree' : 'oak_tree';
      spawnBatch(14, minR, maxR, (id, x, z, s) => this.assets.createTreeNode(id, treeKind, x, z, tier, s));
      spawnBatch(10, minR, maxR, (id, x, z, s) => this.assets.createRockNode(id, 'iron_vein', x, z, tier, s));
      spawnBatch(8 + Math.min(8, tier), minR, maxR, (id, x, z, s) => this.assets.createRockNode(id, 'crystal_cluster', x, z, tier, s));
      // Biome food spawns in expanded rings
      spawnBatch(4, minR, maxR, (id, x, z, s) => this.assets.createFoodNode(id, 'apple_tree', x, z, tier, s), WEST_WIND);
      spawnBatch(4, minR, maxR, (id, x, z, s) => this.assets.createFoodNode(id, 'berry_bush', x, z, tier, s));
      spawnBatch(4, minR, maxR, (id, x, z, s) => this.assets.createFoodNode(id, 'coconut_palm', x, z, tier, s), EAST_WATER);
      spawnBatch(4, minR, maxR, (id, x, z, s) => this.assets.createFoodNode(id, 'cactus_pear', x, z, tier, s), NORTH_EARTH);
      spawnBatch(3, minR, maxR, (id, x, z, s) => this.assets.createFoodNode(id, 'mushroom_patch', x, z, tier, s), SOUTH_FIRE);

      if (spiritRank === 'king') {
        // Tier 10 Summit: Summon the 4 Supreme Elemental Spirit Kings in E/W/S/N outer sanctuaries!
        const kingSpawns: Array<{
          species: 'water_spirit' | 'wind_spirit' | 'fire_spirit' | 'earth_spirit';
          x: number;
          z: number;
        }> = [
          { species: 'water_spirit', x: 382, z: 24 },
          { species: 'wind_spirit', x: -418, z: 12 },
          { species: 'fire_spirit', x: 18, z: 420 },
          { species: 'earth_spirit', x: -16, z: -420 },
        ];
        for (const ks of kingSpawns) {
          const king = this.monsterLib.createElementalSpirit(
            `spirit_king_${ks.species}_${this.monsterCounter++}`,
            ks.species,
            'king',
            ks.x,
            ks.z,
            tier,
          );
          this.monsters.push(king);
          this.scene.add(king.group);
        }
        // Also escort 최상급 정령 around the Spirit Kings
        spawnSpiritBatch(2, minR, maxR, 'water_spirit', 'grand', EAST_WATER);
        spawnSpiritBatch(2, minR, maxR, 'wind_spirit', 'grand', WEST_WIND);
        spawnSpiritBatch(2, minR, maxR, 'fire_spirit', 'grand', SOUTH_FIRE);
        spawnSpiritBatch(2, minR, maxR, 'earth_spirit', 'grand', NORTH_EARTH);
      } else {
        const spCount = tier <= 3 ? 3 : 2;
        spawnSpiritBatch(spCount, minR, maxR, 'water_spirit', spiritRank, EAST_WATER);
        spawnSpiritBatch(spCount, minR, maxR, 'wind_spirit', spiritRank, WEST_WIND);
        spawnSpiritBatch(spCount, minR, maxR, 'fire_spirit', spiritRank, SOUTH_FIRE);
        spawnSpiritBatch(spCount, minR, maxR, 'earth_spirit', spiritRank, NORTH_EARTH);
      }

      spawnMonsterBatch(3, minR, maxR, 'ember_wolf', SOUTH_FIRE);
      spawnMonsterBatch(3, minR, maxR, 'frost_wolf', NORTH_EARTH);
      spawnMonsterBatch(2, minR, maxR, 'night_wraith');

      // Regional Mid-Bosses unlocked as frontier expands
      if (tier === 2) {
        if (!this.monsters.some((m) => m.species === 'elder_tusk_boss')) {
          const bossWest = this.monsterLib.createMonster(`boss_${this.monsterCounter++}`, 'elder_tusk_boss', -116.0, 14.0, 2);
          this.monsters.push(bossWest);
          this.scene.add(bossWest.group);
        }
        if (!this.monsters.some((m) => m.species === 'coastal_titan_boss')) {
          const bossEast = this.monsterLib.createMonster(`boss_${this.monsterCounter++}`, 'coastal_titan_boss', 124.0, -18.0, 2);
          this.monsters.push(bossEast);
          this.scene.add(bossEast.group);
        }
      } else if (tier === 3) {
        if (!this.monsters.some((m) => m.species === 'alpha_frost_boss')) {
          const bossN = this.monsterLib.createMonster(`boss_${this.monsterCounter++}`, 'alpha_frost_boss', -18.0, -148.0, 3);
          this.monsters.push(bossN);
          this.scene.add(bossN.group);
        }
      } else if (tier === 4) {
        if (!this.monsters.some((m) => m.species === 'rune_golem_boss')) {
          const bossG = this.monsterLib.createMonster(`boss_${this.monsterCounter++}`, 'rune_golem_boss', 10.0, 188.0, 4);
          this.monsters.push(bossG);
          this.scene.add(bossG.group);
        }
      }
    }
  }

  // ---------------- PUBLIC ACTIONS ----------------

  public previewClass(classId: PlayerClassId): void {
    const spec = getClassSpec(classId);
    this.playerClass = spec.id;
    this.equippedWeapon = spec.starterWeapon;
    this.equippedArmor = spec.starterArmor;
    if (this.catRig) {
      this.catRig.setClass(spec.id);
      this.catRig.setEquippedWeapon(spec.starterWeapon);
      this.catRig.setEquippedArmor(spec.starterArmor);
    }
    if (this.particles) {
      this.particles.spawnRing(this.playerX, this.playerY + 0.12, this.playerZ, parseInt(spec.accentHex.replace('#', ''), 16), 1.9);
    }
    this.sound.playEquipSwap();
    this.emitHudSnapshot();
  }

  public startWorld(world: WorldRecord, customName?: string): void {
    this.ensureWorldBooted();
    this.sound.unlock();
    this.sound.startBgm();

    this.currentWorldId = world.id;
    this.currentWorldName = world.name;
    this.gameMode = world.gameMode;
    this.worldIsMultiplayer = world.isMultiplayer;
    this.worldRoomCode = world.roomCode || 'main';

    const existingSave = loadWorldData(world.id);
    if (existingSave) {
      this.applySaveData({
        ...existingSave,
        worldId: world.id,
        worldName: world.name,
        gameMode: world.gameMode,
        isMultiplayer: world.isMultiplayer,
        roomCode: world.roomCode,
      });
    } else {
      this.resetWorldStateInPlace(world.playerClass, world.gameMode);
    }

    if (this.gameMode === 'creative') {
      this.applyCreativeUnlocks();
    }

    const cls = getClassSpec(this.playerClass);
    if (customName && customName.trim().length > 0) {
      this.setMultiplayerName(customName.trim());
    } else if (!this.mpPlayerName) {
      this.setMultiplayerName(cls.defaultNickname);
    }

    // Apply Multiplayer Room if enabled for this world
    if (world.isMultiplayer && world.roomCode && !this.isOffline) {
      this.joinMultiplayerRoom(world.roomCode, world.gameMode);
    } else if (!world.isMultiplayer) {
      this.mpClient?.dispose();
      this.mpClient = null;
      this.mpConnected = false;
      this.mpTransport = 'offline';
      this.mpRoomGameMode = world.gameMode;
      this.roomDailyProgress = {};
      this.roomDailyContributors = {};
      for (const id of Array.from(this.remotePlayers.keys())) {
        this.removeRemotePlayer(id);
      }
    }

    this.phase = 'playing';
    this.saveGame(true);

    if (this.gameMode === 'creative') {
      this.showBanner(
        `[크리에이티브 · ${world.name}] 무적·무한 달리기·배고픔·체력 활성 · 가방(I)에서 모든 아이템과 몹 생성알을 하단 9칸 바에 배치하세요!`,
      );
    } else {
      this.showBanner(
        `[서바이벌 · ${world.name}] ${cls.name}(으)로 모험을 시작합니다!${world.isMultiplayer && world.roomCode ? ` · 멀티 코드: ${world.roomCode}` : ''}`,
      );
    }
    this.emitHudSnapshot();
  }

  private applyCreativeUnlocks(): void {
    this.ownedWeapons = WEAPONS_CATALOG.map((w) => w.id);
    this.ownedArmors = ARMORS_CATALOG.map((a) => a.id);
    this.inventory = {
      wood: Math.max(this.inventory.wood, 999),
      stone: Math.max(this.inventory.stone, 999),
      iron: Math.max(this.inventory.iron, 999),
      crystal: Math.max(this.inventory.crystal, 999),
      leather: Math.max(this.inventory.leather, 999),
      fang: Math.max(this.inventory.fang, 999),
      essence: Math.max(this.inventory.essence, 999),
      potion: Math.max(this.inventory.potion, 99),
      apple: Math.max(this.inventory.apple, 99),
      berry: Math.max(this.inventory.berry, 99),
      mushroom: Math.max(this.inventory.mushroom, 99),
      honey: Math.max(this.inventory.honey, 99),
      coconut: Math.max(this.inventory.coconut, 99),
      cactus_fruit: Math.max(this.inventory.cactus_fruit, 99),
      carrot: Math.max(this.inventory.carrot, 99),
      meat: Math.max(this.inventory.meat, 99),
    };
    const creativeDefaults = getCreativeDefaultHotbarForClass(this.playerClass);
    if (this.hotbarSlots.length < 9) {
      const padded = [...this.hotbarSlots];
      for (const item of creativeDefaults) {
        if (padded.length >= 9) break;
        if (!padded.includes(item)) padded.push(item);
      }
      while (padded.length < 9) padded.push('egg:forest_slime');
      this.hotbarSlots = padded.slice(0, 9);
    }
    this.hp = this.maxHp;
    this.stamina = this.maxStamina;
    this.hunger = this.maxHunger;
    this.breath = this.maxBreath;
  }

  private resetWorldStateInPlace(classId: PlayerClassId, mode: GameMode): void {
    this.exitHousingMode();
    for (const h of this.placedHouses) this.scene.remove(h.group);
    this.placedHouses = [];
    for (const p of this.claimedPlots) this.scene.remove(p.group);
    this.claimedPlots = [];
    this.suppressedResourceIds.clear();
    for (const l of this.lanterns) this.scene.remove(l.group);
    this.lanterns = [];
    for (const r of this.resources) this.scene.remove(r.group);
    this.resources = [];
    for (const m of this.monsters) this.scene.remove(m.group);
    this.monsters = [];

    this.worldTier = 1;
    this.frontierRingRadius = WORLD_TIERS[0].radius;
    this.targetFrontierRadius = WORLD_TIERS[0].radius;
    this.frontierRingMesh.scale.setScalar(this.frontierRingRadius);
    const monolith = this.landmarks.find((l) => l.kind === 'frontier_stone');
    if (monolith) {
      const my = getTerrainHeight(0, -31.5);
      monolith.x = 0;
      monolith.y = my;
      monolith.z = -31.5;
      monolith.group.position.set(0, my, -31.5);
    }

    const cls = getClassSpec(classId);
    this.playerClass = cls.id;
    this.gameMode = mode;
    this.inventory = {
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
    };
    this.hunger = this.maxHunger;
    this.selectedFood = 'apple';
    this.starvationTickTimer = 0;
    this.upgrades = { toolLevel: 1, bootsLevel: 1, armorLevel: 1 };
    this.ownedWeapons = [cls.starterWeapon];
    this.equippedWeapon = cls.starterWeapon;
    this.ownedArmors = [cls.starterArmor];
    this.equippedArmor = cls.starterArmor;
    this.hotbarSlots =
      mode === 'creative' ? getCreativeDefaultHotbarForClass(cls.id) : getDefaultHotbarForClass(cls.id);
    this.catRig.setClass(cls.id);
    this.catRig.setEquippedWeapon(this.equippedWeapon);
    this.catRig.setEquippedArmor(this.equippedArmor);

    this.level = 1;
    this.exp = 0;
    this.nextExp = 40;
    this.harvestedTotal = 0;
    this.plantedSaplings = 0;
    this.woodGathered = 0;
    this.stoneGathered = 0;
    this.ironGathered = 0;
    this.leatherGathered = 0;
    this.monstersDefeated = 0;
    this.bossesDefeated = 0;
    this.observedNightWildlife = false;
    this.skillMasteryPoints = 1;
    this.skillRanks = { whirlwind: 1, vanguard_dash: 1, earthbreaker: 1, warcry: 1 };
    this.skillCooldowns = { whirlwind: 0, vanguard_dash: 0, earthbreaker: 0, warcry: 0 };
    this.activeSkillAnim = null;
    this.skillAnimTimer = 0;
    this.warcryBuffRemaining = 0;
    this.proficiencies = {
      combat: { level: 1, exp: 0, nextExp: 60 },
      logging: { level: 1, exp: 0, nextExp: 60 },
      mining: { level: 1, exp: 0, nextExp: 60 },
      craft: { level: 1, exp: 0, nextExp: 60 },
    };
    this.recalcPlayerStats(true);
    this.claimedQuests.clear();
    this.notifiedQuests.clear();

    this.playerX = 0;
    this.playerZ = 6.2;
    this.playerY = getTerrainHeight(0, 6.2);
    this.playerYaw = Math.PI;
    this.velX = 0;
    this.velY = 0;
    this.velZ = 0;
    this.catRig.root.position.set(this.playerX, this.playerY, this.playerZ);
    this.catRig.root.rotation.y = this.playerYaw;

    this.spawnTierResources(1);
    if (mode === 'creative') {
      this.applyCreativeUnlocks();
    }
  }

  public startGame(loadExistingSave = false, selectedClass?: PlayerClassId, customName?: string): void {
    this.sound.unlock();
    this.sound.startBgm();
    if (loadExistingSave && loadGameFromStorage()) {
      this.loadSavedGame(true);
      this.phase = 'playing';
      const cls = getClassSpec(this.playerClass);
      this.showBanner(`[${cls.name}] 저장된 월드를 불러왔습니다 · H 키로 하우징 건축, K 키로 스킬 마스터리 확인`);
    } else {
      const cls = getClassSpec(selectedClass || this.playerClass);
      this.playerClass = cls.id;
      this.gameMode = 'survival';
      this.ownedWeapons = [cls.starterWeapon];
      this.equippedWeapon = cls.starterWeapon;
      this.ownedArmors = [cls.starterArmor];
      this.equippedArmor = cls.starterArmor;
      this.hotbarSlots = getDefaultHotbarForClass(cls.id);
      this.catRig.setClass(cls.id);
      this.catRig.setEquippedWeapon(cls.starterWeapon);
      this.catRig.setEquippedArmor(cls.starterArmor);
      this.recalcPlayerStats(true);
      if (customName && customName.trim().length > 0) {
        this.setMultiplayerName(customName.trim());
      } else if (!this.mpPlayerName) {
        this.setMultiplayerName(cls.defaultNickname);
      }
      this.phase = 'playing';
      this.showBanner(`[${cls.name} · ${cls.catTitle}] 모험을 시작합니다! Q/E/R/T 전용 스킬과 제작 작업대 장비를 활용해보세요`);
    }
    this.emitHudSnapshot();
  }

  public setPhase(phase: GamePhase): void {
    this.phase = phase;
    if (phase !== 'playing') {
      this.heldKeys.clear();
    }
    this.sound.updateBgm(this.environment ? this.environment.nightFactor : 0, phase === 'playing');
    this.emitHudSnapshot();
  }

  /**
   * Saves progress cleanly and returns to the scenic Main Menu title screen.
   */
  public returnToTitle(): void {
    if (this.phase === 'playing' || this.phase === 'paused') {
      this.saveGame(true);
    }
    if (this.housingMode !== 'off') {
      this.exitHousingMode();
    }
    if (this.trialTowerActiveFloor !== null) {
      this.exitTrialTower(true);
    }
    this.heldKeys.clear();
    this.mobileMoveX = 0;
    this.mobileMoveZ = 0;
    this.mobileSprint = false;
    this.phase = 'title';
    this.titleCameraMode = 'scenic';
    this.sound.updateBgm(this.environment ? this.environment.nightFactor : 0, false);
    this.emitHudSnapshot();
  }

  public toggleMute(): boolean {
    const next = !this.sound.isMuted();
    this.sound.setMuted(next);
    return next;
  }

  public toggleBgm(): boolean {
    this.sound.unlock();
    const enabled = this.sound.toggleBgm();
    this.showBanner(enabled ? '배경음악 ON (낮/밤 테마 자동 전환)' : '배경음악 OFF');
    this.emitHudSnapshot();
    return enabled;
  }

  public claimQuestReward(id: QuestId): boolean {
    if (this.claimedQuests.has(id)) return false;
    const list = this.buildQuestsSnapshot();
    const q = list.find((item) => item.id === id);
    if (!q || !q.completed) return false;

    this.sound.unlock();
    this.claimedQuests.add(id);

    const rewardMap: Record<QuestId, { exp: number; inv: Partial<Inventory>; masteryPoints?: number }> = {
      gather_wood_10: { exp: 35, inv: { stone: 3 } },
      mine_stone_8: { exp: 35, inv: { wood: 3 } },
      hunt_leather_4: { exp: 45, inv: { potion: 2 } },
      defeat_mid_boss: { exp: 110, inv: { essence: 3, iron: 3 }, masteryPoints: 1 },
      forge_first_tool: { exp: 45, inv: { wood: 2, stone: 2 } },
      plant_saplings_2: { exp: 35, inv: { wood: 2 } },
      expand_tier_2: { exp: 70, inv: { iron: 2 } },
      mine_iron_6: { exp: 60, inv: { wood: 4 } },
      night_lantern_watch: { exp: 55, inv: { stone: 3 } },
      expand_tier_3: { exp: 120, inv: { crystal: 2 } },
    };

    const r = rewardMap[id];
    if (r.inv.wood) this.inventory.wood += r.inv.wood;
    if (r.inv.stone) this.inventory.stone += r.inv.stone;
    if (r.inv.iron) this.inventory.iron += r.inv.iron;
    if (r.inv.crystal) this.inventory.crystal += r.inv.crystal;
    if (r.inv.leather) this.inventory.leather += r.inv.leather;
    if (r.inv.fang) this.inventory.fang += r.inv.fang;
    if (r.inv.essence) this.inventory.essence += r.inv.essence;
    if (r.inv.potion) this.inventory.potion += r.inv.potion;
    if (r.masteryPoints) this.skillMasteryPoints += r.masteryPoints;

    this.gainExp(r.exp);
    this.sound.playQuestComplete();
    this.particles.spawnBurst(this.playerX, this.playerY + 1.4, this.playerZ, 0xfde047, 22, 4.8);
    this.particles.spawnRing(this.playerX, this.playerY, this.playerZ, 0x62e5ff, 3.0);
    this.spawnFeedback(`퀘스트 완료! (${q.rewardText})`, '#fde047', this.playerX, this.playerY + 2.3, this.playerZ);
    this.showBanner(`퀘스트 보상 수령: [${q.title}] (${q.rewardText})`);
    this.emitHudSnapshot();
    return true;
  }

  private buildQuestsSnapshot(): QuestSnapshot[] {
    const raw: Array<{
      id: QuestId;
      title: string;
      description: string;
      current: number;
      target: number;
      rewardText: string;
    }> = [
      {
        id: 'gather_wood_10',
        title: '원목 10개 채집하기',
        description: '초원의 나무를 벌목해 건축·제련용 원목을 모으세요.',
        current: Math.min(this.woodGathered, 10),
        target: 10,
        rewardText: '+35 EXP · 석재 +3',
      },
      {
        id: 'mine_stone_8',
        title: '화강암 석재 8개 채광하기',
        description: '필드 곳곳의 화강암 바위를 채광해 석재를 확보하세요.',
        current: Math.min(this.stoneGathered, 8),
        target: 8,
        rewardText: '+35 EXP · 원목 +3',
      },
      {
        id: 'hunt_leather_4',
        title: '초원 몬스터 사냥 · 가죽 4개 획득',
        description: '초원 멧돼지·이끼 슬라임을 사냥해 가죽과 전리품을 얻으세요.',
        current: Math.min(this.leatherGathered, 4),
        target: 4,
        rewardText: '+45 EXP · 치유 물약 +2',
      },
      {
        id: 'defeat_mid_boss',
        title: '중간 보스 토벌하기',
        description: '초원 북쪽의 고대 철갑 멧돼지 군주 등 구역 중간 보스를 Q/E/R/T 전사 스킬로 토벌하세요.',
        current: Math.min(this.bossesDefeated, 1),
        target: 1,
        rewardText: '+110 EXP · 정수 +3 · 철광석 +3 · 스킬 +1P',
      },
      {
        id: 'forge_first_tool',
        title: '제작에서 채집 도구 만들기',
        description: '제작(6번 슬롯)에서 도끼·곡괭이·사냥검을 제작하세요.',
        current: Math.min(Math.max(0, this.ownedWeapons.length - 1), 1),
        target: 1,
        rewardText: '+45 EXP · 원목 +2 · 석재 +2',
      },
      {
        id: 'plant_saplings_2',
        title: '초원에 묘목 2그루 심기',
        description: '단축바 4번(묘목)으로 나만의 숲을 가꿔보세요.',
        current: Math.min(this.plantedSaplings, 2),
        target: 2,
        rewardText: '+35 EXP · 원목 +2',
      },
      {
        id: 'expand_tier_2',
        title: '월드 2단계 확장: 소나무 언덕',
        description: '원목 6·석재 5를 모아 북쪽 고대 경계석을 개방하세요.',
        current: this.worldTier >= 2 ? 1 : 0,
        target: 1,
        rewardText: '+70 EXP · 철광석 +2',
      },
      {
        id: 'mine_iron_6',
        title: '철광석 6개 채광하기',
        description: '2단계 소나무 언덕의 철광맥에서 철광석을 채광하세요.',
        current: Math.min(this.ironGathered, 6),
        target: 6,
        rewardText: '+60 EXP · 원목 +4',
      },
      {
        id: 'night_lantern_watch',
        title: '밤(20~04시) 횃불 설치 및 관찰',
        description: '횃불(5번)을 밝히고 야간 반딧불이·달빛 나방을 만나보세요.',
        current: (this.lanterns.length >= 1 ? 1 : 0) + (this.observedNightWildlife ? 1 : 0),
        target: 2,
        rewardText: '+55 EXP · 석재 +3',
      },
      {
        id: 'expand_tier_3',
        title: '월드 3단계 확장: 푸른 수정 고원',
        description: '원목 14·석재 10·철광석 6으로 최종 고원을 개방하세요.',
        current: this.worldTier >= 3 ? 1 : 0,
        target: 1,
        rewardText: '+120 EXP · 마력 수정 +2',
      },
    ];

    return raw.map((q) => ({
      ...q,
      completed: q.current >= q.target,
      claimed: this.claimedQuests.has(q.id),
    }));
  }

  private checkQuestNotifications(): void {
    const quests = this.buildQuestsSnapshot();
    for (const q of quests) {
      if (q.completed && !q.claimed && !this.notifiedQuests.has(q.id)) {
        this.notifiedQuests.add(q.id);
        this.sound.playQuestComplete();
        this.showBanner(`퀘스트 달성! [${q.title}] — 우측 퀘스트 일지에서 보상을 수령하세요`);
      }
    }

    const daily = this.buildDailyQuestsSnapshot();
    for (const dq of daily.quests) {
      if (dq.completed && !dq.claimed && !this.notifiedDailyQuests.has(dq.id)) {
        this.notifiedDailyQuests.add(dq.id);
        this.sound.playQuestComplete();
        this.showBanner(`일일 퀘스트 달성! [${dq.title}] — 우측 퀘스트 일지(J)에서 보상을 받으세요`);
      }
    }
  }

  private ensureDailyQuestDate(): void {
    const today = getTodayDateKey();
    if (this.dailyQuestState.dateKey !== today) {
      this.dailyQuestState = createEmptyDailyQuestState(today);
      this.notifiedDailyQuests.clear();
      this.roomDailyProgress = {};
      this.roomDailyContributors = {};
      saveDailyQuestState(this.dailyQuestState);
    }
  }

  private recordDailyProgress(id: DailyQuestId, delta = 1): void {
    if (delta <= 0) return;
    this.ensureDailyQuestDate();
    const spec = DAILY_QUESTS_CATALOG.find((q) => q.id === id);
    if (!spec) return;
    const prev = this.dailyQuestState.progress[id] ?? 0;
    const next = Math.min(spec.target * 2, prev + delta);
    this.dailyQuestState.progress[id] = next;
    saveDailyQuestState(this.dailyQuestState);

    if (this.mpClient && this.mpConnected) {
      this.mpClient.sendDailyProgress(id, delta);
    }
  }

  private applyRemoteDailyState(daily: RoomDailyQuestPayload): void {
    this.ensureDailyQuestDate();
    if (!daily || daily.dateKey !== this.dailyQuestState.dateKey) return;
    const nextProgress: Partial<Record<DailyQuestId, number>> = {};
    for (const spec of DAILY_QUESTS_CATALOG) {
      const rv = Number(daily.progress?.[spec.id] ?? 0);
      if (Number.isFinite(rv) && rv > 0) {
        nextProgress[spec.id] = rv;
      }
    }
    this.roomDailyProgress = nextProgress;
    this.roomDailyContributors = { ...(daily.contributors || {}) };
  }

  private buildDailyQuestsSnapshot(): DailyQuestsHudState {
    this.ensureDailyQuestDate();
    const coopSynced = Boolean(this.mpConnected);
    const quests = DAILY_QUESTS_CATALOG.map((spec) => {
      const localVal = this.dailyQuestState.progress[spec.id] ?? 0;
      const roomVal = coopSynced ? (this.roomDailyProgress[spec.id] ?? 0) : 0;
      const current = Math.min(spec.target, Math.max(localVal, roomVal));
      const claimed = this.dailyQuestState.claimed.includes(spec.id);
      return {
        id: spec.id,
        title: spec.title,
        description: spec.description,
        current,
        target: spec.target,
        completed: current >= spec.target,
        claimed,
        rewardText: spec.rewardText,
        lastContributor: coopSynced ? this.roomDailyContributors[spec.id] : undefined,
      };
    });
    const completedCount = quests.filter((q) => q.completed || q.claimed).length;
    return {
      dateKey: this.dailyQuestState.dateKey,
      quests,
      coopSynced,
      completedCount,
      totalCount: quests.length,
      allClearClaimed: this.dailyQuestState.allClearClaimed,
    };
  }

  public claimDailyQuestReward(id: DailyQuestId): boolean {
    this.ensureDailyQuestDate();
    if (this.dailyQuestState.claimed.includes(id)) return false;
    const snap = this.buildDailyQuestsSnapshot();
    const q = snap.quests.find((item) => item.id === id);
    const spec = DAILY_QUESTS_CATALOG.find((item) => item.id === id);
    if (!q || !spec || !q.completed) return false;

    this.sound.unlock();
    this.dailyQuestState.claimed.push(id);
    saveDailyQuestState(this.dailyQuestState);

    for (const [key, amount] of Object.entries(spec.invReward) as Array<[keyof Inventory, number]>) {
      if (amount && amount > 0) {
        this.inventory[key] = (this.inventory[key] ?? 0) + amount;
      }
    }
    if (spec.masteryPoints && spec.masteryPoints > 0) {
      this.skillMasteryPoints += spec.masteryPoints;
    }

    this.gainExp(spec.expReward);
    this.sound.playQuestComplete();
    this.particles.spawnBurst(this.playerX, this.playerY + 1.4, this.playerZ, 0x38bdf8, 22, 4.8);
    this.particles.spawnRing(this.playerX, this.playerY, this.playerZ, 0xfde047, 3.0);
    this.spawnFeedback(
      `일일 퀘스트 완료! (${spec.rewardText})`,
      '#62e5ff',
      this.playerX,
      this.playerY + 2.35,
      this.playerZ,
    );
    this.showBanner(`일일 퀘스트 보상 수령: [${spec.title}] (${spec.rewardText})`);

    if (this.mpClient && this.mpConnected) {
      this.mpClient.sendPlayerEvent('daily_complete', spec.title);
    }

    this.saveGame(true);
    this.emitHudSnapshot();
    return true;
  }

  public claimDailyAllClearBonus(): boolean {
    this.ensureDailyQuestDate();
    if (this.dailyQuestState.allClearClaimed) return false;
    const snap = this.buildDailyQuestsSnapshot();
    if (snap.completedCount < snap.totalCount) return false;

    this.sound.unlock();
    this.dailyQuestState.allClearClaimed = true;
    saveDailyQuestState(this.dailyQuestState);

    this.inventory.crystal += 5;
    this.inventory.potion += 3;
    this.skillMasteryPoints += 1;
    this.gainExp(200);
    this.sound.playMasteryUp();
    this.particles.spawnBurst(this.playerX, this.playerY + 1.5, this.playerZ, 0xfde047, 36, 6.2);
    this.particles.spawnRing(this.playerX, this.playerY, this.playerZ, 0x62e5ff, 4.2);
    this.spawnFeedback(
      '일일 올클리어 보너스! (+200 EXP · 수정 +5 · 물약 +3 · 스킬 +1P)',
      '#fde047',
      this.playerX,
      this.playerY + 2.5,
      this.playerZ,
    );
    this.showBanner('오늘의 일일 퀘스트 6종 전체 완료 보너스를 수령했습니다! (+200 EXP · 마력 수정 +5 · 치유 물약 +3 · 스킬 +1P)');

    if (this.mpClient && this.mpConnected) {
      this.mpClient.sendPlayerEvent('daily_complete', '일일 퀘스트 올클리어 보너스');
    }

    this.saveGame(true);
    this.emitHudSnapshot();
    return true;
  }

  public setTimePreset(preset: TimePreset): void {
    this.sound.unlock();
    this.environment?.setTimePreset(preset);
    if (preset === 'night') {
      this.showBanner('밤(20:00~04:00)이 되어 반딧불이와 달빛 나방이 초원에 깨어납니다');
    }
    this.emitHudSnapshot();
  }

  public setTimeOfDay(hours: number): void {
    this.environment?.setTimeOfDay(hours);
    this.emitHudSnapshot();
  }

  public toggleTimePaused(): void {
    this.environment?.toggleTimePaused();
    this.emitHudSnapshot();
  }

  public setWeather(weather: WeatherKind): void {
    this.sound.unlock();
    this.environment?.setWeather(weather, true);
    if (weather === 'rain' || weather === 'storm') {
      this.showBanner(`날씨 변경: ${this.environment.getWeatherLabel()} · 비가 내려 묘목 성장 속도가 빨라집니다`);
    } else {
      this.showBanner(`날씨 변경: ${this.environment.getWeatherLabel()}`);
    }
    this.emitHudSnapshot();
  }

  public toggleAutoWeather(): void {
    this.environment?.toggleAutoWeather();
    this.emitHudSnapshot();
  }

  // ---------------- EMOTES (MULTIPLAYER-READY) ----------------

  private broadcastEmoteState(emoteId: EmoteId | null): void {
    const payload: EmoteBroadcastPayload = {
      emoteId,
      x: this.playerX,
      y: this.playerY,
      z: this.playerZ,
      yaw: this.playerYaw,
      timestamp: Date.now(),
    };
    this.callbacks.onEmoteBroadcast?.(payload);
    window.dispatchEvent(new CustomEvent('archepaw:emote', { detail: payload }));
  }

  public triggerEmote(emoteId: EmoteId): void {
    if (this.phase !== 'playing') return;
    const spec = EMOTES_CATALOG.find((e) => e.id === emoteId);
    if (!spec) return;
    this.sound.unlock();
    this.activeEmote = emoteId;
    this.emoteTime = 0;
    this.emoteDuration = spec.looping ? 0 : 2.6;
    this.sound.playEmoteChime();
    this.particles.spawnRing(this.playerX, this.playerY, this.playerZ, 0x62e5ff, 1.8);
    this.spawnFeedback(`감정표현 · ${spec.label}`, '#67e8f9', this.playerX, this.playerY + 2.15, this.playerZ);
    this.broadcastEmoteState(emoteId);
    this.emitHudSnapshot();
  }

  public cancelEmote(silent = false): void {
    if (!this.activeEmote) return;
    this.activeEmote = null;
    this.emoteTime = 0;
    this.emoteDuration = 0;
    this.broadcastEmoteState(null);
    if (!silent) {
      this.emitHudSnapshot();
    }
  }

  // ---------------- FORGING, CONSUMABLES & ARMOR ----------------

  private hasMaterials(cost: Partial<Inventory>): boolean {
    if (this.gameMode === 'creative') return true;
    return (
      this.inventory.wood >= (cost.wood ?? 0) &&
      this.inventory.stone >= (cost.stone ?? 0) &&
      this.inventory.iron >= (cost.iron ?? 0) &&
      this.inventory.crystal >= (cost.crystal ?? 0) &&
      this.inventory.leather >= (cost.leather ?? 0) &&
      this.inventory.fang >= (cost.fang ?? 0) &&
      this.inventory.essence >= (cost.essence ?? 0)
    );
  }

  private deductMaterials(cost: Partial<Inventory>): void {
    if (this.gameMode === 'creative') return;
    this.inventory.wood -= cost.wood ?? 0;
    this.inventory.stone -= cost.stone ?? 0;
    this.inventory.iron -= cost.iron ?? 0;
    this.inventory.crystal -= cost.crystal ?? 0;
    this.inventory.leather -= cost.leather ?? 0;
    this.inventory.fang -= cost.fang ?? 0;
    this.inventory.essence -= cost.essence ?? 0;
  }

  public forgeWeapon(weaponId: WeaponId): boolean {
    const spec = WEAPONS_CATALOG.find((w) => w.id === weaponId);
    if (!spec) return false;
    this.sound.unlock();

    if (this.ownedWeapons.includes(weaponId)) {
      this.equipWeapon(weaponId);
      return true;
    }

    if (!this.hasMaterials(spec.cost)) {
      this.sound.playUiError();
      this.spawnFeedback('제련 재료가 부족합니다', '#f87171', this.playerX, this.playerY + 2.0, this.playerZ);
      return false;
    }

    this.deductMaterials(spec.cost);

    this.ownedWeapons.push(weaponId);
    this.equippedWeapon = weaponId;
    this.catRig.setEquippedWeapon(weaponId);

    // Keep hotbar seamlessly synced when upgrading to a higher tier weapon
    const upgradeMap: Partial<Record<WeaponId, HotbarItemId[]>> = {
      iron_axe: ['weapon:stone_axe'],
      essence_battleaxe: ['weapon:stone_axe', 'weapon:iron_axe'],
      iron_pickaxe: ['weapon:stone_pickaxe'],
      hunter_blade: ['weapon:crystal_sword'],
      rune_greatsword: ['weapon:hunter_blade', 'weapon:crystal_sword'],
      windstrider_bow: ['weapon:recurve_bow'],
      azure_star_bow: ['weapon:windstrider_bow', 'weapon:recurve_bow'],
      sanctuary_staff: ['weapon:emerald_wing_staff'],
      seraphic_staff: ['weapon:sanctuary_staff', 'weapon:emerald_wing_staff'],
      amethyst_wand: ['weapon:crystal_wand'],
      astral_nova_staff: ['weapon:amethyst_wand', 'weapon:crystal_wand'],
      viper_dagger: ['weapon:tactical_dagger'],
      eclipse_dagger: ['weapon:viper_dagger', 'weapon:tactical_dagger'],
    };
    const prevTargets = upgradeMap[weaponId];
    if (prevTargets) {
      for (const prevTarget of prevTargets) {
        const idx = this.hotbarSlots.indexOf(prevTarget);
        if (idx !== -1) {
          this.hotbarSlots[idx] = `weapon:${weaponId}`;
          break;
        }
      }
    }

    this.sound.playForgeAnvil();
    this.particles.spawnBurst(this.playerX, this.playerY + 1.15, this.playerZ, 0xffc857, 24, 5.2);
    this.particles.spawnRing(this.playerX, this.playerY, this.playerZ, 0xffa94d, 2.8);
    this.spawnFeedback(`${spec.name} 제작 완료!`, '#fde047', this.playerX, this.playerY + 2.2, this.playerZ);
    this.showBanner(`제작 성공: [${spec.name}] 자동 장착 완료!`);
    this.gainExp(28);
    this.gainProficiencyExp('craft', 32);
    this.emitHudSnapshot();
    return true;
  }

  public craftPotion(): boolean {
    this.sound.unlock();
    const cost: Partial<Inventory> = { essence: 1, wood: 1 };
    if (!this.hasMaterials(cost)) {
      this.sound.playUiError();
      this.spawnFeedback('마력 정수 1 · 원목 1 필요', '#f87171', this.playerX, this.playerY + 2.0, this.playerZ);
      return false;
    }
    this.deductMaterials(cost);
    this.inventory.potion += 2;
    this.sound.playCollectChime();
    this.particles.spawnBurst(this.playerX, this.playerY + 1.1, this.playerZ, 0x34d399, 14, 3.6);
    this.spawnFeedback('치유 물약 +2 제작!', '#6ee7b7', this.playerX, this.playerY + 2.1, this.playerZ);
    this.gainExp(12);
    this.gainProficiencyExp('craft', 12);
    this.emitHudSnapshot();
    return true;
  }

  public usePotion(): boolean {
    if (this.gameMode !== 'creative') {
      if (this.inventory.potion <= 0) {
        this.sound.playUiError();
        this.spawnFeedback('보유한 치유 물약이 없습니다', '#f87171', this.playerX, this.playerY + 2.0, this.playerZ);
        return false;
      }
      if (this.hp >= this.maxHp && this.stamina >= this.maxStamina) {
        this.spawnFeedback('체력과 기력이 이미 가득합니다', '#cbd5e1', this.playerX, this.playerY + 2.0, this.playerZ);
        return false;
      }
      this.inventory.potion -= 1;
    }
    this.sound.unlock();
    this.hp = Math.min(this.maxHp, this.hp + 50);
    this.stamina = Math.min(this.maxStamina, this.stamina + 40);
    this.sound.playHealPotion();
    this.particles.spawnBurst(this.playerX, this.playerY + 1.0, this.playerZ, 0x4ade80, 18, 4.0);
    this.particles.spawnRing(this.playerX, this.playerY, this.playerZ, 0x4ade80, 2.4);
    this.spawnFeedback(
      this.gameMode === 'creative' ? '치유 물약 사용 (크리에이티브 무한)' : 'HP +50 · 기력 +40 회복!',
      '#4ade80',
      this.playerX,
      this.playerY + 2.1,
      this.playerZ,
    );
    this.emitHudSnapshot();
    return true;
  }

  public selectFood(foodId: FoodId): void {
    this.selectedFood = foodId;
    this.sound.unlock();
    this.sound.playEquipSwap();
    this.emitHudSnapshot();
  }

  public eatFood(foodId?: FoodId): boolean {
    let targetId: FoodId = foodId || this.selectedFood;
    if (this.gameMode !== 'creative' && (this.inventory[targetId] ?? 0) <= 0) {
      // Auto-fallback to any food in inventory
      const fallback = FOOD_CATALOG.find((f) => (this.inventory[f.id] ?? 0) > 0);
      if (!fallback) {
        this.sound.playUiError();
        this.spawnFeedback(
          '보유한 음식이 없습니다 (사과나무·베리덤불 등에서 채집)',
          '#f87171',
          this.playerX,
          this.playerY + 2.0,
          this.playerZ,
        );
        return false;
      }
      targetId = fallback.id;
    }

    const spec = FOOD_CATALOG.find((f) => f.id === targetId);
    if (!spec) return false;

    if (this.gameMode !== 'creative' && this.hunger >= this.maxHunger - 0.5 && this.hp >= this.maxHp - 0.5) {
      this.spawnFeedback('배가 이미 든든합니다!', '#cbd5e1', this.playerX, this.playerY + 2.0, this.playerZ);
      return false;
    }

    this.sound.unlock();
    this.selectedFood = targetId;
    if (this.gameMode !== 'creative') {
      this.inventory[targetId] = Math.max(0, (this.inventory[targetId] ?? 0) - 1);
    }
    this.hunger = Math.min(this.maxHunger, this.hunger + spec.hungerRestore);
    if (spec.hpRestore > 0) {
      this.hp = Math.min(this.maxHp, this.hp + spec.hpRestore);
    }
    if (spec.staminaRestore > 0) {
      this.stamina = Math.min(this.maxStamina, this.stamina + spec.staminaRestore);
    }

    this.sound.playEatFood();
    this.particles.spawnBurst(this.playerX, this.playerY + 1.15, this.playerZ, 0xfbbf24, 14, 3.4);
    this.particles.spawnRing(this.playerX, this.playerY, this.playerZ, 0xfb923c, 1.9);
    const parts = [`배고픔 +${spec.hungerRestore}`];
    if (spec.hpRestore > 0) parts.push(`HP +${spec.hpRestore}`);
    if (spec.staminaRestore > 0) parts.push(`기력 +${spec.staminaRestore}`);
    this.spawnFeedback(
      `${spec.name} 섭취 · ${parts.join(' · ')}`,
      '#fde047',
      this.playerX,
      this.playerY + 2.15,
      this.playerZ,
    );
    if (this.mpClient && this.mpConnected) {
      this.mpClient.sendPlayerEvent('eat_food', spec.name);
    }
    this.emitHudSnapshot();
    return true;
  }

  public cycleCameraMode(): void {
    const order: CameraPerspectiveMode[] = ['third_back', 'first', 'third_front'];
    const idx = order.indexOf(this.cameraMode);
    this.cameraMode = order[(idx + 1) % order.length];
    if (this.catRig) {
      this.catRig.root.visible = this.phase !== 'playing' || this.cameraMode !== 'first';
    }
    const labelMap: Record<CameraPerspectiveMode, string> = {
      third_back: '3인칭 후면 시점',
      first: '1인칭 시점',
      third_front: '3인칭 전면 시점',
    };
    this.sound.unlock();
    this.sound.playEquipSwap();
    this.spawnFeedback(
      `카메라: ${labelMap[this.cameraMode]} (F5)`,
      '#93c5fd',
      this.playerX,
      this.playerY + 2.15,
      this.playerZ,
    );
    this.emitHudSnapshot();
  }

  public toggleFullscreen(): void {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      document.documentElement
        .requestFullscreen()
        .then(() => {
          this.isFullscreen = true;
          this.emitHudSnapshot();
        })
        .catch(() => {
          this.spawnFeedback(
            '이 환경에서는 전체화면 전환이 제한되어 있습니다',
            '#fbbf24',
            this.playerX,
            this.playerY + 2.0,
            this.playerZ,
          );
        });
    } else {
      document
        .exitFullscreen()
        .then(() => {
          this.isFullscreen = false;
          this.emitHudSnapshot();
        })
        .catch(() => {});
    }
  }

  public craftArmor(armorId: ArmorId): boolean {
    const spec = ARMORS_CATALOG.find((a) => a.id === armorId);
    if (!spec) return false;
    this.sound.unlock();

    if (this.ownedArmors.includes(armorId)) {
      return this.equipArmor(armorId);
    }

    if (!this.hasMaterials(spec.cost)) {
      this.sound.playUiError();
      this.spawnFeedback('방어구 제작 재료가 부족합니다', '#f87171', this.playerX, this.playerY + 2.0, this.playerZ);
      return false;
    }

    this.deductMaterials(spec.cost);
    this.ownedArmors.push(armorId);
    this.equippedArmor = armorId;
    this.catRig.setEquippedArmor(armorId);
    this.recalcPlayerStats(true);

    this.sound.playForgeAnvil();
    this.particles.spawnBurst(this.playerX, this.playerY + 1.15, this.playerZ, 0xfbbf24, 26, 5.2);
    this.particles.spawnRing(this.playerX, this.playerY, this.playerZ, 0x62e5ff, 3.0);
    this.spawnFeedback(`${spec.name} 제작 및 착용!`, '#fde047', this.playerX, this.playerY + 2.25, this.playerZ);
    this.showBanner(
      `방어구 제작 완료: [${spec.name}] 착용 (최대 HP ${this.maxHp} · 피해 감소 ${Math.round(spec.damageReduction * 100)}%)`,
    );
    this.gainExp(28);
    this.gainProficiencyExp('craft', 32);
    this.emitHudSnapshot();
    return true;
  }

  public equipArmor(armorId: ArmorId): boolean {
    if (!this.ownedArmors.includes(armorId)) {
      if (this.gameMode === 'creative') {
        this.ownedArmors.push(armorId);
      } else {
        return false;
      }
    }
    const spec = ARMORS_CATALOG.find((a) => a.id === armorId);
    if (!spec) return false;
    if (this.equippedArmor === armorId) return true;

    this.sound.unlock();
    this.equippedArmor = armorId;
    this.catRig.setEquippedArmor(armorId);
    this.recalcPlayerStats(false);
    this.sound.playEquipSwap();
    this.particles.spawnBurst(this.playerX, this.playerY + 1.0, this.playerZ, 0x62e5ff, 14, 3.6);
    this.particles.spawnRing(this.playerX, this.playerY, this.playerZ, 0x62e5ff, 2.2);
    this.spawnFeedback(`방어구 변경 · ${spec.name}`, '#7dd3fc', this.playerX, this.playerY + 2.15, this.playerZ);
    this.emitHudSnapshot();
    return true;
  }

  public upgradeArmor(): boolean {
    const nextUnowned = ARMORS_CATALOG.find((a) => !this.ownedArmors.includes(a.id));
    return nextUnowned ? this.craftArmor(nextUnowned.id) : false;
  }

  public equipWeapon(weaponId: WeaponId, silent = false, isManual = true): boolean {
    if (!this.ownedWeapons.includes(weaponId)) {
      if (this.gameMode === 'creative') {
        this.ownedWeapons.push(weaponId);
      } else {
        return false;
      }
    }
    if (isManual) {
      this.manualEquipHoldTimer = 4.5;
    }
    if (this.equippedWeapon === weaponId) return true;
    this.sound.unlock();
    this.equippedWeapon = weaponId;
    this.catRig.setEquippedWeapon(weaponId);
    this.sound.playEquipSwap();
    const spec = this.getEquippedSpec();
    if (!silent) {
      this.spawnFeedback(
        isManual ? `${spec.name} 장착` : `자동 전환 · ${spec.name}`,
        isManual ? '#93c5fd' : '#67e8f9',
        this.playerX,
        this.playerY + 2.05,
        this.playerZ,
      );
    }
    this.emitHudSnapshot();
    return true;
  }

  public toggleAutoEquipTool(): boolean {
    this.autoEquipTool = !this.autoEquipTool;
    this.manualEquipHoldTimer = 0;
    this.showBanner(
      this.autoEquipTool
        ? '상황별 무기 자동 변경 ON (벌목→도끼 · 채광→곡괭이 · 이동→검)'
        : '상황별 무기 자동 변경 OFF (수동 장착 유지)',
    );
    this.emitHudSnapshot();
    return this.autoEquipTool;
  }

  public spawnMonsterFromEgg(eggId: SpawnEggId): boolean {
    const spec = SPAWN_EGGS_CATALOG.find((e) => e.id === eggId);
    if (!spec) return false;
    this.ensureWorldBooted();
    this.sound.unlock();

    const spawnDist = spec.category === 'boss' ? 5.6 : 4.2;
    let sx = this.playerX + Math.sin(this.playerYaw) * spawnDist;
    let sz = this.playerZ + Math.cos(this.playerYaw) * spawnDist;

    if (!this.inTrialDungeon) {
      const maxR = Math.max(12, this.frontierRingRadius - 2.5);
      const rDist = Math.hypot(sx, sz);
      if (rDist > maxR) {
        sx = (sx / rDist) * maxR;
        sz = (sz / rDist) * maxR;
      }
    }

    const id = `egg_${eggId}_${Date.now()}_${Math.floor(Math.random() * 900 + 100)}`;
    const isSpirit =
      spec.species === 'water_spirit' ||
      spec.species === 'wind_spirit' ||
      spec.species === 'fire_spirit' ||
      spec.species === 'earth_spirit';

    const m =
      isSpirit && spec.spiritRank
        ? this.monsterLib.createElementalSpirit(
            id,
            spec.species as 'water_spirit' | 'wind_spirit' | 'fire_spirit' | 'earth_spirit',
            spec.spiritRank,
            sx,
            sz,
            this.worldTier,
          )
        : this.monsterLib.createMonster(id, spec.species, sx, sz, this.worldTier);

    m.isNightOnly = false;
    m.aggroTimer = 0;
    if (this.inTrialDungeon) {
      m.y = TRIAL_DUNGEON_Y;
      m.group.position.set(sx, TRIAL_DUNGEON_Y, sz);
    }

    this.scene.add(m.group);
    this.monsters.push(m);

    const accentInt = parseInt(spec.accentHex.replace('#', ''), 16) || 0xfacc15;
    this.sound.playCollectChime();
    this.particles.spawnRing(m.x, m.y + 0.12, m.z, accentInt, spec.category === 'boss' ? 3.8 : 2.3);
    this.particles.spawnBurst(m.x, m.y + 1.0, m.z, accentInt, spec.category === 'boss' ? 24 : 14, 4.6);
    this.spawnFeedback(`${m.label} 소환!`, spec.accentHex, m.x, m.y + m.headHeight + 0.4, m.z);

    if (this.mpClient && this.mpConnected) {
      this.mpClient.sendSpawnEgg(id, eggId, sx, sz, this.worldTier);
    }

    this.emitHudSnapshot();
    return true;
  }

  private spawnRemoteEggMonster(payload: SharedSpawnedMonsterPayload): void {
    if (!payload || !payload.id) return;
    if (this.monsters.some((existing) => existing.id === payload.id)) return;
    const spec = SPAWN_EGGS_CATALOG.find((e) => e.id === payload.eggId);
    if (!spec) return;
    this.ensureWorldBooted();

    const tier = Math.max(1, Math.min(WORLD_TIERS.length, payload.worldTier || this.worldTier));
    const isSpirit =
      spec.species === 'water_spirit' ||
      spec.species === 'wind_spirit' ||
      spec.species === 'fire_spirit' ||
      spec.species === 'earth_spirit';

    const m =
      isSpirit && spec.spiritRank
        ? this.monsterLib.createElementalSpirit(
            payload.id,
            spec.species as 'water_spirit' | 'wind_spirit' | 'fire_spirit' | 'earth_spirit',
            spec.spiritRank,
            payload.x,
            payload.z,
            tier,
          )
        : this.monsterLib.createMonster(payload.id, spec.species, payload.x, payload.z, tier);

    m.isNightOnly = false;
    m.aggroTimer = 0;
    this.scene.add(m.group);
    this.monsters.push(m);

    const accentInt = parseInt(spec.accentHex.replace('#', ''), 16) || 0xfacc15;
    this.particles.spawnRing(m.x, m.y + 0.12, m.z, accentInt, spec.category === 'boss' ? 3.8 : 2.3);
    this.particles.spawnBurst(m.x, m.y + 1.0, m.z, accentInt, spec.category === 'boss' ? 20 : 12, 4.2);
    if (payload.summonerName) {
      this.showBanner(`[멀티플레이] ${payload.summonerName}님이 생성알로 ${m.label}을(를) 소환했습니다!`);
    }
    this.emitHudSnapshot();
  }

  public setHotbarSlot(slotIndex: number, itemId: HotbarItemId): void {
    if (slotIndex < 0 || slotIndex >= this.hotbarSlots.length) return;
    this.hotbarSlots[slotIndex] = itemId;
    this.sound.playEquipSwap();
    this.emitHudSnapshot();
  }

  public activateHotbarSlot(slotIndex: number): void {
    if (this.phase !== 'playing') return;
    const item = this.hotbarSlots[slotIndex];
    if (!item) return;
    this.sound.unlock();

    if (item.startsWith('weapon:')) {
      const wId = item.slice(7) as WeaponId;
      if (this.gameMode === 'creative' || this.ownedWeapons.includes(wId)) {
        this.equipWeapon(wId, false, true);
      } else {
        const spec = WEAPONS_CATALOG.find((w) => w.id === wId);
        this.sound.playUiError();
        this.spawnFeedback(
          `${spec ? spec.name : '무기'} 미보유 — 제작 메뉴에서 만드세요`,
          '#fbbf24',
          this.playerX,
          this.playerY + 2.0,
          this.playerZ,
        );
        this.callbacks.onOpenWorkshop('forge');
      }
      return;
    }

    if (item.startsWith('armor:')) {
      const aId = item.slice(6) as ArmorId;
      if (this.gameMode === 'creative' || this.ownedArmors.includes(aId)) {
        this.equipArmor(aId);
      } else {
        this.sound.playUiError();
        this.callbacks.onOpenWorkshop('armor');
      }
      return;
    }

    if (item.startsWith('food:')) {
      const fId = item.slice(5) as FoodId;
      this.eatFood(fId);
      return;
    }

    if (item.startsWith('egg:')) {
      const eId = item.slice(4) as SpawnEggId;
      this.spawnMonsterFromEgg(eId);
      return;
    }

    if (item.startsWith('material:')) {
      const mId = item.slice(9) as MaterialItemId;
      const spec = MATERIAL_ITEMS_CATALOG.find((m) => m.id === mId);
      if (this.gameMode === 'creative') {
        this.inventory[mId] = (this.inventory[mId] ?? 0) + 10;
        this.sound.playCollectChime();
        this.spawnFeedback(
          `${spec ? spec.name : mId} +10 지급 (보유 ${this.inventory[mId]})`,
          spec ? spec.accentHex : '#fde047',
          this.playerX,
          this.playerY + 2.05,
          this.playerZ,
        );
        this.emitHudSnapshot();
      } else {
        this.spawnFeedback(
          `${spec ? spec.name : mId}: ${this.inventory[mId] ?? 0}개 보유`,
          spec ? spec.accentHex : '#e2e8f0',
          this.playerX,
          this.playerY + 2.0,
          this.playerZ,
        );
      }
      return;
    }

    if (item === 'action:gather') {
      this.performInteractOrGather();
    } else if (item === 'action:sapling') {
      this.plantSapling();
    } else if (item === 'action:lantern') {
      this.placeLantern();
    } else if (item === 'action:potion') {
      this.usePotion();
    } else if (item === 'action:food') {
      this.eatFood();
    } else if (item === 'action:forge') {
      this.callbacks.onOpenWorkshop('forge');
    } else if (item === 'action:housing') {
      this.toggleHousingMode();
    } else if (item === 'action:inventory') {
      this.callbacks.onOpenWorkshop('inventory');
    } else if (item === 'action:expand') {
      this.callbacks.onOpenWorkshop('expand');
    }
  }

  private selectBestWeaponForContext(context: 'tree' | 'rock' | 'monster' | 'idle'): WeaponId {
    const starter = getClassSpec(this.playerClass).starterWeapon;
    let bestId: WeaponId = this.ownedWeapons[0] || starter;
    let bestScore = -1;

    for (const id of this.ownedWeapons) {
      const spec = WEAPONS_CATALOG.find((w) => w.id === id);
      if (!spec) continue;
      const isCombatCat =
        spec.category === 'sword' ||
        spec.category === 'bow' ||
        spec.category === 'staff' ||
        spec.category === 'wand' ||
        spec.category === 'dagger';
      const matchesClass = spec.classId === this.playerClass;
      let score = 0;
      if (context === 'tree') {
        score = spec.treeDamage * 12 + spec.woodBonus * 6 + (spec.category === 'axe' ? 4 : 0);
      } else if (context === 'rock') {
        score = spec.rockDamage * 12 + spec.mineralBonus * 6 + (spec.category === 'pickaxe' ? 4 : 0);
      } else if (context === 'monster') {
        score = spec.monsterDamage * 3 + (isCombatCat ? 8 : 0) + (matchesClass ? 10 : 0);
      } else {
        score = (isCombatCat ? 30 : 0) + (matchesClass ? 14 : 0) + spec.monsterDamage * 0.5;
      }
      if (score > bestScore) {
        bestScore = score;
        bestId = id;
      }
    }
    return bestId;
  }

  private updateContextualAutoEquip(dt: number): void {
    if (!this.autoEquipTool || this.ownedWeapons.length <= 1) return;
    if (this.manualEquipHoldTimer > 0) {
      this.manualEquipHoldTimer = Math.max(0, this.manualEquipHoldTimer - dt);
    }

    // Prioritize combat weapon when a live monster is nearby
    let nearestMonster: WorldMonster | null = null;
    let nearestMonsterDist = Infinity;
    for (const m of this.monsters) {
      if (m.isDead || !m.group.visible) continue;
      const d = Math.hypot(m.x - this.playerX, m.z - this.playerZ);
      if (d <= m.interactRadius + 2.4 && d < nearestMonsterDist) {
        nearestMonsterDist = d;
        nearestMonster = m;
      }
    }

    if (nearestMonster) {
      this.autoIdleReturnTimer = 0;
      const combatWeapon = this.selectBestWeaponForContext('monster');
      if (combatWeapon !== this.equippedWeapon && this.manualEquipHoldTimer <= 0) {
        this.equipWeapon(combatWeapon, false, false);
      }
      return;
    }

    let nearestActive: WorldResourceNode | null = null;
    let nearestDist = Infinity;
    for (const n of this.resources) {
      if (n.isDepleted) continue;
      const d = Math.hypot(n.x - this.playerX, n.z - this.playerZ);
      if (d <= n.interactRadius + 1.5 && d < nearestDist) {
        nearestDist = d;
        nearestActive = n;
      }
    }

    if (nearestActive) {
      this.autoIdleReturnTimer = 0;
      const isTree =
        nearestActive.kind === 'oak_tree' ||
        nearestActive.kind === 'pine_tree' ||
        nearestActive.kind === 'birch_tree';
      const targetWeapon = this.selectBestWeaponForContext(isTree ? 'tree' : 'rock');
      if (targetWeapon !== this.equippedWeapon && this.manualEquipHoldTimer <= 0) {
        this.equipWeapon(targetWeapon, false, false);
      }
    } else if (this.manualEquipHoldTimer <= 0 && this.swingTimer <= 0) {
      this.autoIdleReturnTimer += dt;
      if (this.autoIdleReturnTimer >= 1.8) {
        const idleWeapon = this.selectBestWeaponForContext('idle');
        if (idleWeapon !== this.equippedWeapon) {
          this.equipWeapon(idleWeapon, true, false);
        }
      }
    }
  }

  public cycleEquippedWeapon(): void {
    if (this.ownedWeapons.length <= 1) return;
    const idx = this.ownedWeapons.indexOf(this.equippedWeapon);
    const next = this.ownedWeapons[(idx + 1) % this.ownedWeapons.length];
    this.equipWeapon(next, false, true);
  }

  public triggerPrimaryInteract(): void {
    if (this.phase !== 'playing') return;
    this.sound.unlock();
    this.performInteractOrGather();
  }

  public plantSapling(): boolean {
    if (this.phase !== 'playing') return false;
    this.sound.unlock();
    if (this.gameMode !== 'creative' && this.inventory.wood < 1) {
      this.sound.playUiError();
      this.spawnFeedback('원목 1개가 필요합니다', '#f87171', this.playerX, this.playerY + 1.9, this.playerZ);
      return false;
    }

    const px = this.playerX + Math.sin(this.playerYaw) * 2.2;
    const pz = this.playerZ + Math.cos(this.playerYaw) * 2.2;
    const curMaxR = WORLD_TIERS[this.worldTier - 1].radius - 2.0;
    if (Math.hypot(px, pz) > curMaxR) {
      this.sound.playUiError();
      this.spawnFeedback('현재 월드 경계 안쪽에 심어주세요', '#fbbf24', px, this.playerY + 1.8, pz);
      return false;
    }

    for (const r of this.resources) {
      if (Math.hypot(px - r.x, pz - r.z) < 2.2) {
        this.sound.playUiError();
        this.spawnFeedback('주변에 다른 자원이 너무 가깝습니다', '#fbbf24', px, this.playerY + 1.8, pz);
        return false;
      }
    }

    if (this.gameMode !== 'creative') {
      this.inventory.wood -= 1;
    }
    this.plantedSaplings += 1;
    const treeKind = this.worldTier === 3 ? 'birch_tree' : this.worldTier === 2 ? 'pine_tree' : 'oak_tree';
    const id = `sapling_${this.nodeCounter++}`;
    const node = this.assets.createTreeNode(id, treeKind, px, pz, this.worldTier, 0.95 + Math.random() * 0.2, true);
    this.resources.push(node);
    this.scene.add(node.group);

    this.sound.playPlantOrPlace();
    this.particles.spawnBurst(px, node.y + 0.3, pz, 0x76c859, 14, 3.2);
    this.particles.spawnRing(px, node.y, pz, 0x76c859, 2.2);
    const rainNote = this.environment.isRaining() ? ' (빗물 성장 가속!)' : ' (16초 후 성장)';
    this.spawnFeedback(`묘목 심기 완료!${rainNote}`, '#86efac', px, node.y + 1.6, pz);
    this.gainExp(8);
    this.gainProficiencyExp('logging', 10);
    this.recordDailyProgress('daily_build_or_plant', 1);
    if (this.mpConnected && this.remotePlayers.size > 0) {
      this.recordDailyProgress('daily_coop_challenge', 1);
    }
    this.emitHudSnapshot();
    return true;
  }

  public placeLantern(): boolean {
    if (this.phase !== 'playing') return false;
    this.sound.unlock();
    if (this.gameMode !== 'creative' && (this.inventory.wood < 2 || this.inventory.stone < 1)) {
      this.sound.playUiError();
      this.spawnFeedback('원목 2 · 석재 1 필요', '#f87171', this.playerX, this.playerY + 1.9, this.playerZ);
      return false;
    }
    const px = this.playerX + Math.sin(this.playerYaw) * 2.1;
    const pz = this.playerZ + Math.cos(this.playerYaw) * 2.1;
    const curMaxR = WORLD_TIERS[this.worldTier - 1].radius - 2.0;
    if (Math.hypot(px, pz) > curMaxR) {
      this.sound.playUiError();
      this.spawnFeedback('월드 경계 안쪽에 설치하세요', '#fbbf24', px, this.playerY + 1.8, pz);
      return false;
    }

    if (this.gameMode !== 'creative') {
      this.inventory.wood -= 2;
      this.inventory.stone -= 1;
    }

    const lantern = this.assets.createLanternPost(px, pz);
    lantern.group.rotation.y = this.playerYaw + Math.PI * 0.5;
    this.scene.add(lantern.group);
    this.lanterns.push({ x: px, z: pz, ...lantern });

    const y = getTerrainHeight(px, pz);
    this.sound.playPlantOrPlace();
    this.particles.spawnBurst(px, y + 1.5, pz, 0xffd166, 16, 3.6);
    this.particles.spawnRing(px, y, pz, 0xffc857, 2.5);
    this.spawnFeedback('개척지 횃불 설치 완료!', '#fde047', px, y + 2.2, pz);
    this.gainExp(12);
    this.emitHudSnapshot();
    return true;
  }

  public upgradeBoots(): boolean {
    if (this.upgrades.bootsLevel >= 3) return false;
    this.sound.unlock();
    const cost =
      this.upgrades.bootsLevel === 1
        ? { wood: 3, stone: 3, iron: 0 }
        : { wood: 6, stone: 4, iron: 3 };

    if (
      this.inventory.wood < cost.wood ||
      this.inventory.stone < cost.stone ||
      this.inventory.iron < cost.iron
    ) {
      this.sound.playUiError();
      return false;
    }

    this.inventory.wood -= cost.wood;
    this.inventory.stone -= cost.stone;
    this.inventory.iron -= cost.iron;
    this.upgrades.bootsLevel += 1;
    this.recalcPlayerStats(false);
    this.stamina = this.maxStamina;

    this.sound.playForgeAnvil();
    this.particles.spawnBurst(this.playerX, this.playerY + 0.5, this.playerZ, 0xfbbf24, 20, 4.2);
    this.spawnFeedback(`개척자 장화 Lv.${this.upgrades.bootsLevel} 강화!`, '#fde047', this.playerX, this.playerY + 2.1, this.playerZ);
    this.gainExp(20);
    this.gainProficiencyExp('craft', 18);
    this.emitHudSnapshot();
    return true;
  }

  public expandWorld(): boolean {
    if (this.worldTier >= WORLD_TIERS.length) return false;
    this.sound.unlock();
    const nextTierCfg = WORLD_TIERS[this.worldTier];
    const c = nextTierCfg.unlockCost;

    if (
      this.inventory.wood < c.wood ||
      this.inventory.stone < c.stone ||
      this.inventory.iron < c.iron ||
      this.inventory.crystal < c.crystal
    ) {
      this.sound.playUiError();
      this.spawnFeedback('월드 확장 재료가 부족합니다', '#f87171', this.playerX, this.playerY + 2.0, this.playerZ);
      return false;
    }

    this.inventory.wood -= c.wood;
    this.inventory.stone -= c.stone;
    this.inventory.iron -= c.iron;
    this.inventory.crystal -= c.crystal;

    this.worldTier = nextTierCfg.tier;
    this.targetFrontierRadius = nextTierCfg.radius;
    this.spawnTierResources(this.worldTier);

    const monolith = this.landmarks.find((l) => l.kind === 'frontier_stone');
    if (monolith) {
      const oldX = monolith.x;
      const oldY = monolith.y;
      const oldZ = monolith.z;
      this.particles.spawnBurst(oldX, oldY + 2.2, oldZ, 0x62e5ff, 36, 7.5);
      this.particles.spawnRing(oldX, oldY, oldZ, 0x62e5ff, 22);

      if (this.worldTier < WORLD_TIERS.length) {
        const nextZ = -(nextTierCfg.radius - 6.0);
        const nextY = getTerrainHeight(0, nextZ);
        monolith.x = 0;
        monolith.y = nextY;
        monolith.z = nextZ;
        monolith.group.position.set(0, nextY, nextZ);
      }
    }

    this.particles.spawnRing(this.playerX, this.playerY, this.playerZ, 0xfbbf24, 18);
    this.shakeIntensity = 0.28;
    this.sound.playWorldExpand();
    this.gainExp(50);
    this.showBanner(`월드 ${this.worldTier}단계 확장 완료! [${nextTierCfg.name}] 개방`);
    this.saveGame(true);
    this.emitHudSnapshot();
    return true;
  }

  // ---------------- MODULAR TILE-CONNECTED ARCHEAGE HOUSING SYSTEM ----------------

  private destroyGhostPreview(): void {
    if (this.ghostRig) {
      this.scene.remove(this.ghostRig.group);
      this.ghostRig.dispose();
      this.ghostRig = null;
    }
  }

  private rebuildGhostPreview(kind: HousingKind): void {
    this.destroyGhostPreview();
    this.ghostRig = this.housingLib.createGhostPreview(kind);
    this.scene.add(this.ghostRig.group);
    this.updateGhostTransformAndValidity();
  }

  private updateSelectedHouseHighlight(): void {
    for (const h of this.placedHouses) {
      h.selectionBox.visible = h.id === this.selectedHouseId && this.housingMode !== 'moving';
    }
  }

  private getActiveGhostKind(): HousingKind {
    if (this.housingMode === 'moving' && this.selectedHouseId) {
      const h = this.placedHouses.find((item) => item.id === this.selectedHouseId);
      if (h) return h.kind;
    }
    return this.selectedBlueprint;
  }

  private findNeighborBaseY(
    gx: number,
    gz: number,
    ignoreId: string | null,
    isPillar = false,
  ): { baseY: number; snapped: boolean } {
    if (isPillar) {
      // Corner vertex (gx, gz) meets cells (gx, gz), (gx-1, gz), (gx, gz-1), (gx-1, gz-1)
      for (const h of this.placedHouses) {
        if (h.id === ignoreId) continue;
        if (h.kind === 'pillar' && h.gx === gx && h.gz === gz) {
          return { baseY: h.baseY, snapped: true };
        }
      }
      for (const h of this.placedHouses) {
        if (h.id === ignoreId) continue;
        if (h.kind === 'pillar') {
          if (Math.abs(h.gx - gx) <= 1 && Math.abs(h.gz - gz) <= 1) {
            return { baseY: h.baseY, snapped: true };
          }
        } else {
          const dx = gx - h.gx;
          const dz = gz - h.gz;
          if (dx >= 0 && dx <= 1 && dz >= 0 && dz <= 1) {
            return { baseY: h.baseY, snapped: true };
          }
        }
      }
      const wx = (gx - 0.5) * HOUSING_TILE_SIZE;
      const wz = (gz - 0.5) * HOUSING_TILE_SIZE;
      const ground = getTerrainHeight(wx, wz);
      return { baseY: Math.round((ground + 0.34) * 4) / 4, snapped: false };
    }

    // 1. Exact same grid cell (walls/ceilings/floors stacked on same footprint)
    for (const h of this.placedHouses) {
      if (h.id === ignoreId) continue;
      if (h.kind === 'pillar') {
        if ((h.gx === gx || h.gx === gx + 1) && (h.gz === gz || h.gz === gz + 1)) {
          return { baseY: h.baseY, snapped: true };
        }
      } else if (h.gx === gx && h.gz === gz) {
        return { baseY: h.baseY, snapped: true };
      }
    }
    // 2. Cardinal adjacent grid cell (seamless horizontal tile chaining!)
    for (const h of this.placedHouses) {
      if (h.id === ignoreId) continue;
      if (Math.abs(h.gx - gx) + Math.abs(h.gz - gz) === 1) {
        return { baseY: h.baseY, snapped: true };
      }
    }
    // 3. Diagonal neighbor (corner chaining)
    for (const h of this.placedHouses) {
      if (h.id === ignoreId) continue;
      if (Math.abs(h.gx - gx) <= 1 && Math.abs(h.gz - gz) <= 1) {
        return { baseY: h.baseY, snapped: true };
      }
    }
    // Fresh standalone foundation: raise slightly above local terrain so piers ground cleanly
    const wx = gx * HOUSING_TILE_SIZE;
    const wz = gz * HOUSING_TILE_SIZE;
    const ground = getTerrainHeight(wx, wz);
    return { baseY: Math.round((ground + 0.34) * 4) / 4, snapped: false };
  }

  private hasSlotOccupied(slotKey: string, ignoreId: string | null): boolean {
    return this.placedHouses.some((h) => h.id !== ignoreId && h.slotKey === slotKey);
  }

  private hasSupportingWallOrPillarOnCell(
    gx: number,
    gz: number,
    level: number,
    ignoreId: string | null,
  ): boolean {
    const edges: HousingEdge[] = ['n', 's', 'e', 'w'];
    for (const ed of edges) {
      const c = canonicalizeEdge(gx, gz, ed);
      const key = `edge:${c.gx},${c.gz},${level},${c.edge}`;
      if (this.hasSlotOccupied(key, ignoreId)) return true;
    }
    const corners: Array<[number, number]> = [
      [gx, gz],
      [gx + 1, gz],
      [gx, gz + 1],
      [gx + 1, gz + 1],
    ];
    for (const [vx, vz] of corners) {
      if (this.hasSlotOccupied(`pillar:${vx},${vz},${level}`, ignoreId)) return true;
    }
    return false;
  }

  private hasFloorOrCeilingSurface(
    gx: number,
    gz: number,
    surfaceLevel: number,
    ignoreId: string | null,
  ): boolean {
    if (surfaceLevel <= 0) return true;
    const floorKey = `floor:${gx},${gz},${surfaceLevel}`;
    const belowTopKey = `top:${gx},${gz},${surfaceLevel - 1}`;
    return this.placedHouses.some(
      (h) => h.id !== ignoreId && (h.slotKey === floorKey || h.slotKey === belowTopKey),
    );
  }

  private hasPillarSupportAtCorner(
    vx: number,
    vz: number,
    level: number,
    ignoreId: string | null,
  ): boolean {
    if (level <= 0) return true;
    if (this.hasSlotOccupied(`pillar:${vx},${vz},${level - 1}`, ignoreId)) return true;
    const adjEdges: Array<[number, number, 'n' | 'w']> = [
      [vx, vz, 'n'],
      [vx - 1, vz, 'n'],
      [vx, vz, 'w'],
      [vx, vz - 1, 'w'],
    ];
    for (const [ex, ez, ee] of adjEdges) {
      if (this.hasSlotOccupied(`edge:${ex},${ez},${level - 1},${ee}`, ignoreId)) return true;
    }
    const adjCells: Array<[number, number]> = [
      [vx, vz],
      [vx - 1, vz],
      [vx, vz - 1],
      [vx - 1, vz - 1],
    ];
    for (const [cx, cz] of adjCells) {
      if (this.hasFloorOrCeilingSurface(cx, cz, level, ignoreId)) return true;
    }
    return false;
  }

  private evaluateLandPlotClaim(x: number, z: number): { valid: boolean; reason: string | null } {
    const plotRadius = 6.5;
    if (Math.hypot(x, z) > this.frontierRingRadius - plotRadius) {
      return { valid: false, reason: '월드 경계선 안쪽에서 부지를 확보하세요' };
    }
    if (isWaterAt(x, z)) {
      return { valid: false, reason: '호수·바다 위에는 부지를 확보할 수 없습니다' };
    }
    if (Math.hypot(x, z - 0.5) < 9.5) {
      return { valid: false, reason: '시작 마을 모닥불 광장 보호구역입니다' };
    }
    for (const lm of this.landmarks) {
      if (Math.hypot(x - lm.x, z - lm.z) < lm.radius + plotRadius) {
        return { valid: false, reason: '주요 구조물과 너무 가깝습니다' };
      }
    }
    for (const op of this.otherPlayerPlots) {
      if (
        Math.abs(x - op.x) < op.halfW + plotRadius * 0.78 &&
        Math.abs(z - op.z) < op.halfD + plotRadius * 0.78
      ) {
        return { valid: false, reason: `다른 플레이어 부지(${op.ownerName})와 충돌` };
      }
    }
    for (const cp of this.claimedPlots) {
      if (Math.hypot(x - cp.x, z - cp.z) < cp.radius + plotRadius * 0.75) {
        return { valid: false, reason: '이미 확보한 내 부지와 겹칩니다' };
      }
    }
    return { valid: true, reason: null };
  }

  private suppressOverlappingDepletedResources(x: number, z: number, radius: number): void {
    for (const r of this.resources) {
      if (r.isDepleted && !r.isSapling && Math.hypot(r.x - x, r.z - z) <= radius) {
        r.suppressedByHousing = true;
        this.suppressedResourceIds.add(r.id);
      }
    }
  }

  public claimLandPlot(): boolean {
    if (this.phase !== 'playing') return false;
    this.sound.unlock();
    const check = this.evaluateLandPlotClaim(this.playerX, this.playerZ);
    if (!check.valid) {
      this.sound.playUiError();
      this.spawnFeedback(check.reason || '부지 확보 불가', '#f87171', this.playerX, this.playerY + 2.0, this.playerZ);
      return false;
    }
    const id = `plot_${this.plotCounter++}`;
    const plot = createLandPlotVisual(id, this.playerX, this.playerZ, 6.5);
    this.claimedPlots.push(plot);
    this.scene.add(plot.group);
    this.suppressOverlappingDepletedResources(plot.x, plot.z, plot.radius);

    this.sound.playQuestComplete();
    this.particles.spawnBurst(plot.x, this.playerY + 0.8, plot.z, 0x34d399, 22, 4.5);
    this.particles.spawnRing(plot.x, this.playerY + 0.1, plot.z, 0x34d399, 6.2);
    this.spawnFeedback('건축 부지 확보 완료! (자원 리셋 방지)', '#6ee7b7', this.playerX, this.playerY + 2.3, this.playerZ);
    this.showBanner(`건축 부지 #${this.claimedPlots.length} 확보 완료 · 부지 위 자원을 채집 후 건축하면 다시 자라지 않습니다`);
    this.mpClient?.sendPlotClaim({
      id: plot.id,
      x: plot.x,
      z: plot.z,
      radius: plot.radius,
    });
    this.saveGame(true);
    this.emitHudSnapshot();
    return true;
  }

  private isInsideClaimedPlot(x: number, z: number): boolean {
    for (const p of this.claimedPlots) {
      const half = p.radius * 0.82;
      if (Math.abs(x - p.x) <= half && Math.abs(z - p.z) <= half) return true;
    }
    return false;
  }

  private checkOtherPlayerCollision(x: number, z: number, margin = 1.45): string | null {
    for (const op of this.otherPlayerPlots) {
      if (Math.abs(x - op.x) < op.halfW + margin && Math.abs(z - op.z) < op.halfD + margin) {
        return `다른 플레이어 건축물(${op.ownerName})과 충돌`;
      }
    }
    return null;
  }

  private evaluateTilePlacement(
    kind: HousingKind,
    material: HousingMaterial,
    gx: number,
    gz: number,
    level: number,
    edge: HousingEdge | null,
    rotationStep: number,
    baseY: number,
    ignoreId: string | null,
    requireMaterials: boolean,
    overridePos?: { x: number; z: number; gridSnapped: boolean; heightOffset?: number },
  ): { valid: boolean; reason: string | null } {
    const cost = getHousingPieceCost(kind, material);
    if (requireMaterials && !this.hasMaterials(cost)) {
      const parts: string[] = [];
      if (cost.wood && this.inventory.wood < cost.wood) parts.push(`원목 ${cost.wood - this.inventory.wood}`);
      if (cost.stone && this.inventory.stone < cost.stone) parts.push(`석재 ${cost.stone - this.inventory.stone}`);
      if (cost.iron && this.inventory.iron < cost.iron) parts.push(`철광석 ${cost.iron - this.inventory.iron}`);
      return { valid: false, reason: `자재 부족 (${parts.join(' · ')})` };
    }

    if (level > 6) {
      return { valid: false, reason: '최대 건축 높이에 도달했습니다' };
    }

    const H = HOUSING_WALL_HEIGHT;
    const gridSnapped = overridePos ? overridePos.gridSnapped : this.housingGridSnap;
    const effectiveHeightOffset = overridePos?.heightOffset ?? this.housingHeightOffset;
    const pose = getTileWorldPose(kind, gx, gz, level, edge, rotationStep, baseY);
    const checkX = overridePos ? overridePos.x : pose.x;
    const checkZ = overridePos ? overridePos.z : pose.z;
    const targetY = pose.y + effectiveHeightOffset;
    const slotKey = getTileSlotKey(kind, gx, gz, level, edge, rotationStep, effectiveHeightOffset);
    const isFurn = isFurnitureKind(kind);

    const hasWallOrPillarTopAtY = (cellGx: number, cellGz: number, wantY: number): boolean => {
      const edges: HousingEdge[] = ['n', 's', 'e', 'w'];
      for (const h of this.placedHouses) {
        if (h.id === ignoreId || !h.group.visible) continue;
        if (isWallKind(h.kind) && h.edge) {
          const topY = h.y + (h.kind === 'half_wall' ? H * 0.5 : H);
          if (Math.abs(topY - wantY) <= 0.48) {
            for (const ed of edges) {
              const c = canonicalizeEdge(cellGx, cellGz, ed);
              if (h.gx === c.gx && h.gz === c.gz && h.edge === c.edge) return true;
            }
          }
        } else if (h.kind === 'pillar') {
          const topY = h.y + H;
          if (
            Math.abs(topY - wantY) <= 0.48 &&
            (h.gx === cellGx || h.gx === cellGx + 1) &&
            (h.gz === cellGz || h.gz === cellGz + 1)
          ) {
            return true;
          }
        }
      }
      return false;
    };

    const hasDeckSurfaceAtY = (cellGx: number, cellGz: number, wantY: number): boolean => {
      return this.placedHouses.some(
        (h) =>
          h.id !== ignoreId &&
          h.group.visible &&
          (h.kind === 'floor' || isTopCoverKind(h.kind)) &&
          h.gx === cellGx &&
          h.gz === cellGz &&
          Math.abs(h.y - wantY) <= 0.48,
      );
    };

    const hasAdjacentDeckAtY = (cellGx: number, cellGz: number, wantY: number): boolean => {
      return this.placedHouses.some(
        (h) =>
          h.id !== ignoreId &&
          h.group.visible &&
          (h.kind === 'floor' || isTopCoverKind(h.kind)) &&
          Math.abs(h.gx - cellGx) + Math.abs(h.gz - cellGz) === 1 &&
          Math.abs(h.y - wantY) <= 0.48,
      );
    };

    if (!isFixtureKind(kind)) {
      if (Math.hypot(checkX, checkZ) > this.frontierRingRadius - 2.0) {
        return { valid: false, reason: '월드 경계선 밖' };
      }
      if (isWaterAt(checkX, checkZ)) {
        return { valid: false, reason: '호수·바다 위에는 건축할 수 없습니다' };
      }
      if (Math.hypot(checkX, checkZ - 0.5) < 5.1) {
        return { valid: false, reason: '모닥불 캠프 보호구역' };
      }
      const otherCollision = this.checkOtherPlayerCollision(checkX, checkZ, isFurn ? 0.65 : 1.45);
      if (otherCollision) {
        return { valid: false, reason: otherCollision };
      }
      for (const lm of this.landmarks) {
        if (Math.hypot(checkX - lm.x, checkZ - lm.z) < lm.radius + (isFurn ? 0.9 : 1.5)) {
          return { valid: false, reason: '주요 구조물과 겹침' };
        }
      }
    }

    if (gridSnapped && !isFurn && this.hasSlotOccupied(slotKey, ignoreId)) {
      return {
        valid: false,
        reason: isFixtureKind(kind)
          ? '이미 같은 자리에 조명이 설치됨'
          : '이미 같은 자리에 타일이 설치됨',
      };
    }

    // Prevent ground-level floor/stairs/furniture from overlapping uncut trees or rocks
    if (
      (kind === 'floor' || kind === 'stairs' || isFurn || !gridSnapped) &&
      level === 0 &&
      Math.abs(effectiveHeightOffset) < 0.35
    ) {
      const clearRad = isFurn ? 0.85 : 1.45;
      for (const r of this.resources) {
        if (!r.isDepleted && Math.hypot(checkX - r.x, checkZ - r.z) < r.radius + clearRad) {
          return { valid: false, reason: '자재 채집 후 설치하세요 (설치 후 리셋 방지)' };
        }
      }
    }

    if (isFurn) {
      return { valid: true, reason: null };
    }

    if (!gridSnapped) {
      return { valid: true, reason: null };
    }

    if (kind === 'wall_torch') {
      const c = canonicalizeEdge(gx, gz, edge ?? 'n');
      const hasWall = this.placedHouses.some(
        (h) =>
          h.id !== ignoreId &&
          isWallKind(h.kind) &&
          h.gx === c.gx &&
          h.gz === c.gz &&
          h.edge === c.edge &&
          Math.abs(h.y - targetY) <= 0.5,
      );
      if (!hasWall) {
        return { valid: false, reason: '설치된 벽면에 조준해 부착하세요' };
      }
      return { valid: true, reason: null };
    }

    if (kind === 'ceiling_light') {
      const hasTop = this.placedHouses.some(
        (h) =>
          h.id !== ignoreId &&
          (isTopCoverKind(h.kind) || h.kind === 'floor') &&
          h.gx === gx &&
          h.gz === gz &&
          Math.abs(h.y - targetY) <= 0.5,
      );
      if (!hasTop) {
        return { valid: false, reason: '설치된 천장·지붕 아래에 배치하세요' };
      }
      return { valid: true, reason: null };
    }

    // Organic structural support rules (full walls, half-walls, and floor-ceiling links!)
    if (isTopCoverKind(kind)) {
      const hasSupportHere =
        this.hasSupportingWallOrPillarOnCell(gx, gz, level, ignoreId) ||
        hasWallOrPillarTopAtY(gx, gz, targetY);
      const hasAdjacentTop =
        hasAdjacentDeckAtY(gx, gz, targetY) ||
        this.placedHouses.some(
          (h) =>
            h.id !== ignoreId &&
            isTopCoverKind(h.kind) &&
            h.level === level &&
            Math.abs(h.y - targetY) <= 0.48 &&
            Math.abs(h.gx - gx) + Math.abs(h.gz - gz) === 1,
        );
      if (!hasSupportHere && !hasAdjacentTop) {
        return { valid: false, reason: '벽·반벽·기둥 위 또는 인접 천장·바닥에 연결하세요' };
      }
    } else if (kind === 'floor' && (level > 0 || effectiveHeightOffset > 0.35)) {
      const hasSupportBelow =
        (level > 0 && this.hasSupportingWallOrPillarOnCell(gx, gz, level - 1, ignoreId)) ||
        hasWallOrPillarTopAtY(gx, gz, targetY);
      const hasAdjFloor = hasAdjacentDeckAtY(gx, gz, targetY);
      if (!hasSupportBelow && !hasAdjFloor) {
        return { valid: false, reason: '아래 벽·반벽·기둥 또는 인접 천장·바닥에 연결하세요' };
      }
    } else if (isWallKind(kind) && (level > 0 || effectiveHeightOffset > 0.35)) {
      const c = canonicalizeEdge(gx, gz, edge ?? 'n');
      const hasBelowWall = this.placedHouses.some((h) => {
        if (h.id === ignoreId || !isWallKind(h.kind) || h.gx !== c.gx || h.gz !== c.gz || h.edge !== c.edge) {
          return false;
        }
        const topY = h.y + (h.kind === 'half_wall' ? H * 0.5 : H);
        return Math.abs(topY - targetY) <= 0.48;
      });
      const p1 = level > 0 && this.hasSlotOccupied(`pillar:${c.gx},${c.gz},${level - 1}`, ignoreId);
      const p2 =
        level > 0 &&
        (c.edge === 'n'
          ? this.hasSlotOccupied(`pillar:${c.gx + 1},${c.gz},${level - 1}`, ignoreId)
          : this.hasSlotOccupied(`pillar:${c.gx},${c.gz + 1},${level - 1}`, ignoreId));
      const cellAOk =
        (level > 0 && this.hasFloorOrCeilingSurface(c.gx, c.gz, level, ignoreId)) ||
        hasDeckSurfaceAtY(c.gx, c.gz, targetY);
      const cellBOk =
        c.edge === 'n'
          ? (level > 0 && this.hasFloorOrCeilingSurface(c.gx, c.gz - 1, level, ignoreId)) ||
            hasDeckSurfaceAtY(c.gx, c.gz - 1, targetY)
          : (level > 0 && this.hasFloorOrCeilingSurface(c.gx - 1, c.gz, level, ignoreId)) ||
            hasDeckSurfaceAtY(c.gx - 1, c.gz, targetY);
      if (!hasBelowWall && !p1 && !p2 && !cellAOk && !cellBOk) {
        return { valid: false, reason: '벽·반벽·기둥 또는 천장·바닥 위에 세우세요' };
      }
    } else if (kind === 'pillar' && level > 0) {
      if (!this.hasPillarSupportAtCorner(gx, gz, level, ignoreId)) {
        return { valid: false, reason: '아래 기둥·벽 또는 천장 위에 세우세요' };
      }
    } else if (kind === 'stairs' && level > 0) {
      const hasChainedLowerStair = this.placedHouses.some((h) => {
        if (h.id === ignoreId || !h.group.visible || h.kind !== 'stairs' || h.level !== level - 1) return false;
        const [dgx, dgz] = getStairsAscentGridDelta(h.rotationStep);
        return h.gx + dgx === gx && h.gz + dgz === gz;
      });
      if (!this.hasFloorOrCeilingSurface(gx, gz, level, ignoreId) && !hasChainedLowerStair && !hasDeckSurfaceAtY(gx, gz, targetY)) {
        return { valid: false, reason: '계단 아래 바닥·천장 또는 연속 계단에 연결하세요' };
      }
    }

    return { valid: true, reason: null };
  }

  private updateGhostTransformAndValidity(): void {
    if (!this.ghostRig || (this.housingMode !== 'placing' && this.housingMode !== 'moving')) return;

    const MAX_STACK_LEVEL = 6;
    const S = HOUSING_TILE_SIZE;
    const H = HOUSING_WALL_HEIGHT;
    const half = S * 0.5;

    const kind = this.getActiveGhostKind();
    const isMoving = this.housingMode === 'moving';
    const ignoreId = isMoving ? this.selectedHouseId : null;
    const activeMaterial =
      isMoving && this.selectedHouseId
        ? this.placedHouses.find((h) => h.id === this.selectedHouseId)?.material || this.selectedMaterial
        : this.selectedMaterial;

    let aimX = this.playerX + Math.sin(this.playerYaw) * 4.5;
    let aimZ = this.playerZ + Math.cos(this.playerYaw) * 4.5;
    let hitTile: PlacedHousingTile | null = null;
    let hitPt: THREE.Vector3 | null = null;

    if (this.hasHoveredTerrain && this.terrainMesh) {
      _rayMouse.set(this.lastHoverNdcX, this.lastHoverNdcY);
      this.raycaster.setFromCamera(_rayMouse, this.camera);

      // Raycast both existing placed tiles (for organic stacking!) and terrain
      const rayTargets: THREE.Object3D[] = [this.terrainMesh];
      for (const h of this.placedHouses) {
        if (h.id === ignoreId || !h.group.visible) continue;
        rayTargets.push(...h.hitMeshes);
      }
      const hits = this.raycaster.intersectObjects(rayTargets, false);
      if (hits.length > 0) {
        const firstHit = hits[0];
        const pt = firstHit.point;
        const dx = pt.x - this.playerX;
        const dz = pt.z - this.playerZ;
        const dist = Math.hypot(dx, dz);
        const maxPlaceDist = 26;
        if (dist > maxPlaceDist) {
          aimX = this.playerX + (dx / dist) * maxPlaceDist;
          aimZ = this.playerZ + (dz / dist) * maxPlaceDist;
        } else {
          aimX = pt.x;
          aimZ = pt.z;
          hitPt = pt;
          const hid = firstHit.object.userData?.housingId as string | undefined;
          if (hid) {
            hitTile = this.placedHouses.find((h) => h.id === hid) || null;
          }
        }
      } else if (kind === 'ceiling' || kind === 'roof' || kind === 'ceiling_light') {
        // When looking upward at the open sky above walls, project onto the active ceiling plane
        const ray = this.raycaster.ray;
        if (Math.abs(ray.direction.y) > 0.04) {
          const planeY = this.playerY + H;
          const t = (planeY - ray.origin.y) / ray.direction.y;
          if (t > 0.4 && t < 26) {
            aimX = ray.origin.x + ray.direction.x * t;
            aimZ = ray.origin.z + ray.direction.z * t;
          }
        }
      }
    }

    let gx = Math.round(aimX / S);
    let gz = Math.round(aimZ / S);
    let edge: HousingEdge | null = null;
    let level = 0;

    const pickCellEdge = (cx: number, cz: number, wx: number, wz: number) => {
      const lx = wx - cx * S;
      const lz = wz - cz * S;
      const dN = Math.abs(lz + half);
      const dS = Math.abs(lz - half);
      const dW = Math.abs(lx + half);
      const dE = Math.abs(lx - half);
      const minD = Math.min(dN, dS, dW, dE);
      const rawEdge: HousingEdge =
        minD === dN ? 'n' : minD === dS ? 's' : minD === dW ? 'w' : 'e';
      return canonicalizeEdge(cx, cz, rawEdge);
    };

    const pickCellBesideWall = (wall: PlacedHousingTile, wx: number, wz: number): [number, number] => {
      if (wall.edge === 'n') {
        const southCell: [number, number] = [wall.gx, wall.gz];
        const northCell: [number, number] = [wall.gx, wall.gz - 1];
        const zDiff = wz - wall.z;
        if (Math.abs(zDiff) > 0.16) return zDiff >= 0 ? southCell : northCell;
        const sHas = this.hasFloorOrCeilingSurface(southCell[0], southCell[1], wall.level, ignoreId);
        const nHas = this.hasFloorOrCeilingSurface(northCell[0], northCell[1], wall.level, ignoreId);
        if (sHas && !nHas) return southCell;
        if (nHas && !sHas) return northCell;
        return southCell;
      } else {
        const eastCell: [number, number] = [wall.gx, wall.gz];
        const westCell: [number, number] = [wall.gx - 1, wall.gz];
        const xDiff = wx - wall.x;
        if (Math.abs(xDiff) > 0.16) return xDiff >= 0 ? eastCell : westCell;
        const eHas = this.hasFloorOrCeilingSurface(eastCell[0], eastCell[1], wall.level, ignoreId);
        const wHas = this.hasFloorOrCeilingSurface(westCell[0], westCell[1], wall.level, ignoreId);
        if (eHas && !wHas) return eastCell;
        if (wHas && !eHas) return westCell;
        return eastCell;
      }
    };

    let effectiveRotStep = this.ghostRotationStep;
    let autoHeightOffset = 0;

    // ---------------- ORGANIC AUTO-STACKING & FIXTURE SNAPPING ----------------
    if (kind === 'wall_torch') {
      const computeWallSide = (wallEdge: HousingEdge, wallWorldX: number, wallWorldZ: number): number => {
        if (wallEdge === 'n' || wallEdge === 's') {
          const dz = hitPt ? hitPt.z - wallWorldZ : this.camera.position.z - wallWorldZ;
          const ref = Math.abs(dz) > 0.06 ? dz : this.camera.position.z - wallWorldZ;
          return ref >= 0 ? 0 : 1;
        } else {
          const dx = hitPt ? hitPt.x - wallWorldX : this.camera.position.x - wallWorldX;
          const ref = Math.abs(dx) > 0.06 ? dx : this.camera.position.x - wallWorldX;
          return ref >= 0 ? 0 : 1;
        }
      };

      if (hitTile && isWallKind(hitTile.kind) && hitTile.edge) {
        gx = hitTile.gx;
        gz = hitTile.gz;
        edge = hitTile.edge;
        level = hitTile.level;
        const autoSide = computeWallSide(hitTile.edge, hitTile.x, hitTile.z);
        effectiveRotStep = (autoSide + (this.ghostRotationStep % 2)) % 2;
      } else if (hitTile && hitTile.kind === 'wall_torch' && hitTile.edge) {
        gx = hitTile.gx;
        gz = hitTile.gz;
        edge = hitTile.edge;
        level = hitTile.level;
        effectiveRotStep = (hitTile.rotationStep + 1) % 2;
      } else {
        const c = pickCellEdge(gx, gz, aimX, aimZ);
        gx = c.gx;
        gz = c.gz;
        edge = c.edge;
        level = 0;
        let matchedWall: PlacedHousingTile | undefined;
        for (let l = 0; l <= MAX_STACK_LEVEL; l++) {
          const w = this.placedHouses.find(
            (h) => h.id !== ignoreId && h.slotKey === `edge:${gx},${gz},${l},${edge}`,
          );
          if (w) {
            matchedWall = w;
            level = l;
            break;
          }
        }
        if (matchedWall) {
          const autoSide = computeWallSide(c.edge, matchedWall.x, matchedWall.z);
          effectiveRotStep = (autoSide + (this.ghostRotationStep % 2)) % 2;
        }
      }
    } else if (kind === 'ceiling_light') {
      const hasCeilingAt = (cx: number, cz: number, lvl: number) =>
        this.hasSlotOccupied(`top:${cx},${cz},${lvl}`, ignoreId) ||
        this.hasSlotOccupied(`floor:${cx},${cz},${lvl + 1}`, ignoreId);

      if (hitTile && (hitTile.kind === 'ceiling' || hitTile.kind === 'roof')) {
        gx = hitTile.gx;
        gz = hitTile.gz;
        level = hitTile.level;
      } else if (hitTile && hitTile.kind === 'floor') {
        gx = hitTile.gx;
        gz = hitTile.gz;
        if (hasCeilingAt(gx, gz, hitTile.level)) {
          level = hitTile.level;
        } else if (hitTile.level > 0 && hasCeilingAt(gx, gz, hitTile.level - 1)) {
          level = hitTile.level - 1;
        } else {
          level = hitTile.level;
        }
      } else if (hitTile && isWallKind(hitTile.kind) && hitPt) {
        const [cx, cz] = pickCellBesideWall(hitTile, hitPt.x, hitPt.z);
        if (hasCeilingAt(cx, cz, hitTile.level)) {
          gx = cx;
          gz = cz;
          level = hitTile.level;
        } else {
          const altX = hitTile.edge === 'w' ? (cx === hitTile.gx ? hitTile.gx - 1 : hitTile.gx) : cx;
          const altZ = hitTile.edge === 'n' ? (cz === hitTile.gz ? hitTile.gz - 1 : hitTile.gz) : cz;
          gx = hasCeilingAt(altX, altZ, hitTile.level) ? altX : cx;
          gz = hasCeilingAt(altX, altZ, hitTile.level) ? altZ : cz;
          level = hitTile.level;
        }
      } else {
        level = 0;
        for (let l = 0; l <= MAX_STACK_LEVEL; l++) {
          if (hasCeilingAt(gx, gz, l) && !this.hasSlotOccupied(`cfix:${gx},${gz},${l}`, ignoreId)) {
            level = l;
            break;
          }
        }
      }
    } else if (isWallKind(kind)) {
      if (hitTile && isWallKind(hitTile.kind) && hitTile.edge) {
        gx = hitTile.gx;
        gz = hitTile.gz;
        edge = hitTile.edge;
        if (hitTile.kind === 'half_wall') {
          // Stack flush on top of half_wall (+1.35m)
          const topOffset = hitTile.heightOffset + H * 0.5;
          if (Math.abs(topOffset - H) < 0.1) {
            level = hitTile.level + 1;
            autoHeightOffset = 0;
          } else {
            level = hitTile.level;
            autoHeightOffset = topOffset;
          }
        } else {
          level = hitTile.level + 1;
          autoHeightOffset = hitTile.heightOffset;
        }
        while (
          level <= MAX_STACK_LEVEL &&
          this.hasSlotOccupied(getTileSlotKey(kind, gx, gz, level, edge, 0, autoHeightOffset), ignoreId)
        ) {
          level++;
        }
      } else if (hitTile && hitTile.kind === 'pillar' && hitPt) {
        const dx = hitPt.x - hitTile.x;
        const dz = hitPt.z - hitTile.z;
        const raw =
          Math.abs(dx) >= Math.abs(dz)
            ? dx >= 0
              ? { gx: hitTile.gx, gz: hitTile.gz, edge: 'n' as const }
              : { gx: hitTile.gx - 1, gz: hitTile.gz, edge: 'n' as const }
            : dz >= 0
              ? { gx: hitTile.gx, gz: hitTile.gz, edge: 'w' as const }
              : { gx: hitTile.gx, gz: hitTile.gz - 1, edge: 'w' as const };
        gx = raw.gx;
        gz = raw.gz;
        edge = raw.edge;
        level = hitPt.y > hitTile.y + H - 0.35 ? hitTile.level + 1 : hitTile.level;
        autoHeightOffset = hitTile.heightOffset;
        while (
          level <= MAX_STACK_LEVEL &&
          this.hasSlotOccupied(getTileSlotKey(kind, gx, gz, level, edge, 0, autoHeightOffset), ignoreId)
        ) {
          level++;
        }
      } else if (hitTile && (hitTile.kind === 'floor' || hitTile.kind === 'ceiling' || hitTile.kind === 'flat_roof') && hitPt) {
        const c = pickCellEdge(hitTile.gx, hitTile.gz, hitPt.x, hitPt.z);
        gx = c.gx;
        gz = c.gz;
        edge = c.edge;
        level = hitTile.kind === 'floor' ? hitTile.level : hitTile.level + 1;
        autoHeightOffset = hitTile.heightOffset;
        while (
          level <= MAX_STACK_LEVEL &&
          this.hasSlotOccupied(getTileSlotKey(kind, gx, gz, level, edge, 0, autoHeightOffset), ignoreId)
        ) {
          level++;
        }
      } else {
        const c = pickCellEdge(gx, gz, aimX, aimZ);
        gx = c.gx;
        gz = c.gz;
        edge = c.edge;
        level = 0;
        while (level <= MAX_STACK_LEVEL && this.hasSlotOccupied(`edge:${gx},${gz},${level},${edge}`, ignoreId)) {
          level++;
        }
      }
    } else if (kind === 'pillar') {
      if (hitTile && hitTile.kind === 'pillar') {
        gx = hitTile.gx;
        gz = hitTile.gz;
        level = hitTile.level + 1;
        while (level <= MAX_STACK_LEVEL && this.hasSlotOccupied(`pillar:${gx},${gz},${level}`, ignoreId)) {
          level++;
        }
      } else {
        gx = Math.round(aimX / S + 0.5);
        gz = Math.round(aimZ / S + 0.5);
        if (hitTile && (hitTile.kind === 'ceiling' || hitTile.kind === 'flat_roof')) {
          level = hitTile.level + 1;
          autoHeightOffset = hitTile.heightOffset;
        } else if (hitTile && hitTile.kind === 'floor') {
          level = hitTile.level;
          autoHeightOffset = hitTile.heightOffset;
        } else if (hitTile && isWallKind(hitTile.kind) && hitPt) {
          level = hitPt.y > hitTile.y + H * 0.65 ? hitTile.level + 1 : hitTile.level;
          autoHeightOffset = hitTile.heightOffset;
        } else {
          level = 0;
        }
        while (
          level <= MAX_STACK_LEVEL &&
          this.hasSlotOccupied(getTileSlotKey(kind, gx, gz, level, null, 0, autoHeightOffset), ignoreId)
        ) {
          level++;
        }
      }
    } else if (isTopCoverKind(kind)) {
      if (hitTile && isWallKind(hitTile.kind) && hitPt) {
        const [cx, cz] = pickCellBesideWall(hitTile, hitPt.x, hitPt.z);
        gx = cx;
        gz = cz;
        level = hitTile.level;
        // Snap flush onto half_wall top (baseY + level*H + halfH) or full wall top!
        autoHeightOffset =
          hitTile.kind === 'half_wall' ? hitTile.heightOffset - H * 0.5 : hitTile.heightOffset;
      } else if (hitTile && hitTile.kind === 'pillar' && hitPt) {
        gx = hitPt.x >= hitTile.x ? hitTile.gx : hitTile.gx - 1;
        gz = hitPt.z >= hitTile.z ? hitTile.gz : hitTile.gz - 1;
        level = hitTile.level;
        autoHeightOffset = hitTile.heightOffset;
      } else if (hitTile && (isTopCoverKind(hitTile.kind) || hitTile.kind === 'floor') && hitPt) {
        const dx = hitPt.x - hitTile.x;
        const dz = hitPt.z - hitTile.z;
        const isHitFloor = hitTile.kind === 'floor';
        const hasUpperSupport =
          !isHitFloor &&
          this.hasSupportingWallOrPillarOnCell(hitTile.gx, hitTile.gz, hitTile.level + 1, ignoreId);
        if (hasUpperSupport && Math.hypot(dx, dz) < 0.85) {
          gx = hitTile.gx;
          gz = hitTile.gz;
          level = hitTile.level + 1;
          autoHeightOffset = hitTile.heightOffset;
        } else {
          if (Math.abs(dx) >= Math.abs(dz)) {
            gx = hitTile.gx + (dx >= 0 ? 1 : -1);
            gz = hitTile.gz;
          } else {
            gx = hitTile.gx;
            gz = hitTile.gz + (dz >= 0 ? 1 : -1);
          }
          if (isHitFloor) {
            // Link ceiling flush side-by-side with an elevated/half-wall floor!
            const targetDeckY = hitTile.y;
            level = Math.max(0, hitTile.level - 1);
            autoHeightOffset = targetDeckY - (hitTile.baseY + (level + 1) * H);
          } else {
            level = hitTile.level;
            autoHeightOffset = hitTile.heightOffset;
          }
        }
      } else {
        // Check if cell has a half_wall support without a full wall at that cell
        const cellEdges: HousingEdge[] = ['n', 's', 'e', 'w'];
        let foundHalfWall: PlacedHousingTile | null = null;
        let foundFullWall = false;
        for (const h of this.placedHouses) {
          if (h.id === ignoreId || !isWallKind(h.kind) || !h.edge) continue;
          for (const ed of cellEdges) {
            const c = canonicalizeEdge(gx, gz, ed);
            if (h.gx === c.gx && h.gz === c.gz && h.edge === c.edge) {
              if (h.kind === 'half_wall') foundHalfWall = h;
              else foundFullWall = true;
            }
          }
        }
        if (foundHalfWall && !foundFullWall) {
          level = foundHalfWall.level;
          autoHeightOffset = foundHalfWall.heightOffset - H * 0.5;
        } else {
          let chosenLevel = 0;
          for (let l = MAX_STACK_LEVEL; l >= 0; l--) {
            if (
              !this.hasSlotOccupied(`top:${gx},${gz},${l}`, ignoreId) &&
              (this.hasSupportingWallOrPillarOnCell(gx, gz, l, ignoreId) ||
                this.placedHouses.some(
                  (h) =>
                    h.id !== ignoreId &&
                    isTopCoverKind(h.kind) &&
                    h.level === l &&
                    Math.abs(h.gx - gx) + Math.abs(h.gz - gz) === 1,
                ))
            ) {
              chosenLevel = l;
              break;
            }
          }
          level = chosenLevel;
        }
      }
    } else if (kind === 'floor') {
      if (hitTile && hitTile.kind === 'floor' && hitPt) {
        const dx = hitPt.x - hitTile.x;
        const dz = hitPt.z - hitTile.z;
        if (Math.abs(dx) >= Math.abs(dz)) {
          gx = hitTile.gx + (dx >= 0 ? 1 : -1);
          gz = hitTile.gz;
        } else {
          gx = hitTile.gx;
          gz = hitTile.gz + (dz >= 0 ? 1 : -1);
        }
        level = hitTile.level;
        autoHeightOffset = hitTile.heightOffset;
      } else if (hitTile && isWallKind(hitTile.kind) && hitPt) {
        const [cx, cz] = pickCellBesideWall(hitTile, hitPt.x, hitPt.z);
        gx = cx;
        gz = cz;
        if (hitTile.kind === 'half_wall') {
          // Snap floor flush onto half_wall top (+1.35m)!
          level = hitTile.level;
          autoHeightOffset = hitTile.heightOffset + H * 0.5;
        } else {
          level = hitTile.level + 1;
          autoHeightOffset = hitTile.heightOffset;
        }
      } else if (hitTile && hitTile.kind === 'pillar' && hitPt) {
        gx = hitPt.x >= hitTile.x ? hitTile.gx : hitTile.gx - 1;
        gz = hitPt.z >= hitTile.z ? hitTile.gz : hitTile.gz - 1;
        level = hitTile.level + 1;
        autoHeightOffset = hitTile.heightOffset;
      } else if (hitTile && (hitTile.kind === 'ceiling' || hitTile.kind === 'flat_roof') && hitPt) {
        const dx = hitPt.x - hitTile.x;
        const dz = hitPt.z - hitTile.z;
        if (Math.abs(dx) >= Math.abs(dz)) {
          gx = hitTile.gx + (dx >= 0 ? 1 : -1);
          gz = hitTile.gz;
        } else {
          gx = hitTile.gx;
          gz = hitTile.gz + (dz >= 0 ? 1 : -1);
        }
        // Floor-Ceiling continuous link (works seamlessly for both full-height and half-wall ceilings!)
        level = hitTile.level + 1;
        autoHeightOffset = hitTile.heightOffset;
      } else {
        level = 0;
      }
    } else if (isFurnitureKind(kind)) {
      if (hitTile && hitTile.kind === 'floor') {
        gx = hitTile.gx;
        gz = hitTile.gz;
        level = hitTile.level;
        autoHeightOffset = hitTile.heightOffset;
      } else if (hitTile && (hitTile.kind === 'ceiling' || hitTile.kind === 'flat_roof')) {
        gx = hitTile.gx;
        gz = hitTile.gz;
        level = hitTile.level + 1;
        autoHeightOffset = hitTile.heightOffset;
      } else {
        level = 0;
      }
    } else {
      // kind === 'stairs' (supports consecutive multi-story stair chaining!)
      if (hitTile && hitTile.kind === 'stairs' && hitPt) {
        const dx = hitPt.x - hitTile.x;
        const dz = hitPt.z - hitTile.z;
        const localZ = dx * Math.sin(hitTile.rotationY) + dz * Math.cos(hitTile.rotationY);
        const [dgx, dgz] = getStairsAscentGridDelta(hitTile.rotationStep);
        effectiveRotStep = hitTile.rotationStep;
        if (localZ <= 0.18) {
          gx = hitTile.gx + dgx;
          gz = hitTile.gz + dgz;
          level = Math.min(MAX_STACK_LEVEL, hitTile.level + 1);
        } else if (hitTile.level > 0) {
          gx = hitTile.gx - dgx;
          gz = hitTile.gz - dgz;
          level = hitTile.level - 1;
        } else {
          gx = hitTile.gx + dgx;
          gz = hitTile.gz + dgz;
          level = Math.min(MAX_STACK_LEVEL, hitTile.level + 1);
        }
        autoHeightOffset = hitTile.heightOffset;
      } else if (hitTile && (hitTile.kind === 'ceiling' || hitTile.kind === 'flat_roof')) {
        gx = hitTile.gx;
        gz = hitTile.gz;
        level = hitTile.level + 1;
        autoHeightOffset = hitTile.heightOffset;
      } else if (hitTile && hitTile.kind === 'floor') {
        gx = hitTile.gx;
        gz = hitTile.gz;
        level = hitTile.level;
        autoHeightOffset = hitTile.heightOffset;
      } else {
        level = 0;
      }
    }

    const isFurn = isFurnitureKind(kind);
    const useGridSnap = this.housingGridSnap && !isFurn;
    const { baseY: snappedBaseY, snapped } = this.findNeighborBaseY(gx, gz, ignoreId, kind === 'pillar');
    let baseY = snappedBaseY;
    if (hitTile && (hitTile.kind === 'floor' || hitTile.kind === 'ceiling' || hitTile.kind === 'flat_roof' || hitTile.kind === 'half_wall')) {
      baseY = hitTile.baseY;
    } else if (!useGridSnap && !hitTile) {
      baseY = getTerrainHeight(aimX, aimZ);
    }

    const effectiveHeightOffset = autoHeightOffset + this.housingHeightOffset;
    const pose = getTileWorldPose(kind, gx, gz, level, edge, effectiveRotStep, baseY);
    const finalX = useGridSnap ? pose.x : aimX;
    const finalZ = useGridSnap ? pose.z : aimZ;
    const finalY = pose.y + effectiveHeightOffset;
    const finalRotY =
      this.housingFreeRotate || !useGridSnap
        ? THREE.MathUtils.degToRad(this.housingFreeYawDeg)
        : pose.rotationY;

    this.ghostGx = gx;
    this.ghostGz = gz;
    this.ghostLevel = level;
    this.ghostEdge = useGridSnap ? edge : null;
    this.ghostEffectiveRotStep = effectiveRotStep;
    this.ghostRotationY = finalRotY;
    this.ghostBaseY = baseY;
    this.ghostEffectiveHeightOffset = effectiveHeightOffset;
    this.ghostX = finalX;
    this.ghostY = finalY;
    this.ghostZ = finalZ;
    this.ghostSnapped = useGridSnap && (snapped || !!hitTile);

    const gridY =
      (kind === 'ceiling' || kind === 'flat_roof' || kind === 'roof' || kind === 'ceiling_light'
        ? baseY + (level + 1) * H
        : baseY + level * H) + effectiveHeightOffset;
    const gridCellX = useGridSnap ? (kind === 'pillar' ? (gx - 0.5) * S : gx * S) : finalX;
    const gridCellZ = useGridSnap ? (kind === 'pillar' ? (gz - 0.5) * S : gz * S) : finalZ;
    this.ghostRig.group.position.set(gridCellX, gridY, gridCellZ);
    this.ghostRig.group.rotation.set(0, 0, 0);
    this.ghostRig.gridLines.visible = useGridSnap && !isFixtureKind(kind);

    this.ghostRig.tileContainer.position.set(
      finalX - gridCellX,
      finalY - gridY,
      finalZ - gridCellZ,
    );
    this.ghostRig.tileContainer.rotation.set(0, finalRotY, 0);

    const check = this.evaluateTilePlacement(
      kind,
      activeMaterial,
      gx,
      gz,
      level,
      useGridSnap ? edge : null,
      effectiveRotStep,
      baseY,
      ignoreId,
      !isMoving,
      { x: finalX, z: finalZ, gridSnapped: useGridSnap, heightOffset: effectiveHeightOffset },
    );
    this.ghostValid = check.valid;
    this.ghostInvalidReason = check.reason;
    this.housingLib.setGhostValidity(this.ghostRig, check.valid, this.ghostSnapped, this.elapsedTime);
  }

  public toggleHousingMode(): void {
    if (this.phase !== 'playing') return;
    this.sound.unlock();
    if (this.housingMode !== 'off') {
      this.exitHousingMode();
    } else {
      this.cancelEmote(true);
      this.housingMode = 'placing';
      this.selectedHouseId = null;
      this.movingOriginalPose = null;
      this.rebuildGhostPreview(this.selectedBlueprint);
      this.updateSelectedHouseHighlight();
      this.showBanner('모듈 하우징: 벽 위에 벽을 조준하면 자동 증설됩니다 (기둥·문·색상 지원 · R 90° 회전 · ESC 종료)');
      this.emitHudSnapshot();
    }
  }

  public exitHousingMode(): void {
    if (this.housingMode === 'moving' && this.selectedHouseId && this.movingOriginalPose) {
      this.cancelMovingSelectedHouse();
    }
    this.housingMode = 'off';
    this.selectedHouseId = null;
    this.destroyGhostPreview();
    this.updateSelectedHouseHighlight();
    this.emitHudSnapshot();
  }

  public setHousingBlueprint(kind: HousingKind): void {
    if (this.phase !== 'playing') return;
    this.sound.unlock();
    if (this.housingMode === 'moving') {
      this.cancelMovingSelectedHouse();
    }
    this.selectedBlueprint = kind;
    const spec = HOUSING_CATALOG.find((c) => c.kind === kind);
    if (spec) {
      this.housingActiveStage = spec.stage;
    }
    this.selectedHouseId = null;
    this.housingMode = 'placing';
    this.rebuildGhostPreview(kind);
    this.updateSelectedHouseHighlight();
    this.sound.playEquipSwap();
    this.emitHudSnapshot();
  }

  public setHousingMaterial(material: HousingMaterial): void {
    if (this.phase !== 'playing') return;
    this.sound.unlock();
    if (this.housingMode === 'edit' && this.selectedHouseId) {
      this.changeSelectedTileMaterial(material);
      return;
    }
    this.selectedMaterial = material;
    this.updateGhostTransformAndValidity();
    this.sound.playEquipSwap();
    this.emitHudSnapshot();
  }

  public setHousingColor(color: HousingColorId): void {
    if (this.phase !== 'playing') return;
    this.sound.unlock();
    this.selectedColor = color;
    if (this.housingMode === 'edit' && this.selectedHouseId) {
      this.changeSelectedTileColor(color);
      return;
    }
    this.sound.playEquipSwap();
    this.emitHudSnapshot();
  }

  public enterHousingEditMode(): void {
    if (this.phase !== 'playing') return;
    this.sound.unlock();
    if (this.housingMode === 'moving') {
      this.cancelMovingSelectedHouse();
    }
    this.destroyGhostPreview();
    this.housingMode = 'edit';
    this.housingActiveStage = 6;
    this.updateSelectedHouseHighlight();
    this.showBanner('타일 편집 모드: 부품을 클릭해 복사(C)·회전·높이·자재 업그레이드·색상·이동·철거할 수 있습니다');
    this.emitHudSnapshot();
  }

  public setHousingStage(stage: HousingStageId): void {
    if (this.phase !== 'playing') return;
    this.sound.unlock();
    if (this.housingMode === 'moving') {
      this.cancelMovingSelectedHouse();
    }
    this.housingActiveStage = stage;
    if (stage === 6) {
      this.enterHousingEditMode();
      return;
    }
    if (stage === 1) {
      this.destroyGhostPreview();
      this.selectedHouseId = null;
      this.housingMode = 'placing';
      this.updateSelectedHouseHighlight();
      this.sound.playEquipSwap();
      this.emitHudSnapshot();
      return;
    }
    const stagePieces = HOUSING_CATALOG.filter((c) => c.stage === stage);
    const targetKind =
      stagePieces.find((c) => c.kind === this.selectedBlueprint)?.kind ??
      stagePieces[0]?.kind ??
      this.selectedBlueprint;
    this.setHousingBlueprint(targetKind);
  }

  public toggleGridSnap(): void {
    if (this.phase !== 'playing') return;
    this.sound.unlock();
    this.housingGridSnap = !this.housingGridSnap;
    this.updateGhostTransformAndValidity();
    this.sound.playEquipSwap();
    this.showBanner(
      this.housingGridSnap
        ? '그리드 스냅 ON (3m 모듈 자동 연결)'
        : '그리드 스냅 OFF (자유 좌표 배치 모드)',
    );
    this.emitHudSnapshot();
  }

  public toggleFreeRotate(): void {
    if (this.phase !== 'playing') return;
    this.sound.unlock();
    this.housingFreeRotate = !this.housingFreeRotate;
    if (!this.housingFreeRotate) {
      this.ghostRotationStep = ((Math.round(this.housingFreeYawDeg / 90) % 4) + 4) % 4;
      this.housingFreeYawDeg = this.ghostRotationStep * 90;
    }
    this.updateGhostTransformAndValidity();
    this.sound.playEquipSwap();
    this.showBanner(
      this.housingFreeRotate
        ? '자유 회전 ON (15° 정밀 회전)'
        : '90° 단위 회전 모드',
    );
    this.emitHudSnapshot();
  }

  public adjustHousingHeight(delta: number): void {
    if (this.phase !== 'playing') return;
    this.sound.unlock();
    if (this.housingMode === 'edit' && this.selectedHouseId) {
      const idx = this.placedHouses.findIndex((item) => item.id === this.selectedHouseId);
      if (idx !== -1) {
        const h = this.placedHouses[idx];
        const nextOffset = THREE.MathUtils.clamp(
          Math.round((h.heightOffset + delta) * 100) / 100,
          -1.5,
          3.0,
        );
        const rebuilt = this.replacePlacedTileVisual(
          idx,
          h.kind,
          h.material,
          h.color,
          h.gx,
          h.gz,
          h.level,
          h.edge,
          h.rotationStep,
          h.baseY,
          h.isDoorOpen,
          {},
          {
            customRotationY: h.rotationY,
            gridSnapped: h.gridSnapped,
            freeX: h.x,
            freeZ: h.z,
            heightOffset: nextOffset,
          },
        );
        this.housingHeightOffset = nextOffset;
        this.refreshAllSeamlessHousingNeighbors();
        this.updateSelectedHouseHighlight();
        this.sound.playEquipSwap();
        this.spawnFeedback(`높이 ${nextOffset >= 0 ? '+' : ''}${nextOffset.toFixed(2)}m`, '#67e8f9', rebuilt.x, rebuilt.y + 1.4, rebuilt.z);
        this.saveGame(true);
        this.emitHudSnapshot();
        return;
      }
    }
    this.housingHeightOffset = THREE.MathUtils.clamp(
      Math.round((this.housingHeightOffset + delta) * 100) / 100,
      -1.5,
      3.0,
    );
    this.updateGhostTransformAndValidity();
    this.sound.playEquipSwap();
    this.emitHudSnapshot();
  }

  public resetHousingHeight(): void {
    if (this.phase !== 'playing') return;
    this.housingHeightOffset = 0;
    if (this.housingMode === 'edit' && this.selectedHouseId) {
      const idx = this.placedHouses.findIndex((item) => item.id === this.selectedHouseId);
      if (idx !== -1) {
        const h = this.placedHouses[idx];
        this.replacePlacedTileVisual(
          idx,
          h.kind,
          h.material,
          h.color,
          h.gx,
          h.gz,
          h.level,
          h.edge,
          h.rotationStep,
          h.baseY,
          h.isDoorOpen,
          {},
          {
            customRotationY: h.rotationY,
            gridSnapped: h.gridSnapped,
            freeX: h.x,
            freeZ: h.z,
            heightOffset: 0,
          },
        );
        this.refreshAllSeamlessHousingNeighbors();
        this.updateSelectedHouseHighlight();
        this.saveGame(true);
      }
    }
    this.updateGhostTransformAndValidity();
    this.emitHudSnapshot();
  }

  public duplicateSelectedHouse(): boolean {
    if (this.phase !== 'playing' || !this.selectedHouseId) return false;
    const h = this.placedHouses.find((item) => item.id === this.selectedHouseId);
    if (!h) return false;
    this.sound.unlock();
    this.selectedBlueprint = h.kind;
    this.selectedMaterial = h.material;
    this.selectedColor = h.color;
    this.housingGridSnap = h.gridSnapped;
    this.housingHeightOffset = h.heightOffset;
    this.ghostRotationStep = h.rotationStep;
    this.housingFreeYawDeg = ((Math.round(THREE.MathUtils.radToDeg(h.rotationY)) % 360) + 360) % 360;
    const spec = HOUSING_CATALOG.find((c) => c.kind === h.kind);
    if (spec) this.housingActiveStage = spec.stage;
    this.selectedHouseId = null;
    this.housingMode = 'placing';
    this.rebuildGhostPreview(h.kind);
    this.updateSelectedHouseHighlight();
    this.sound.playCollectChime();
    this.showBanner(`[${h.label}] 부품 복사 완료 · 원하는 위치에 클릭하여 설치하세요`);
    this.emitHudSnapshot();
    return true;
  }

  public rotateHousingPreview(deltaSteps = 1): void {
    if (this.housingMode === 'placing' || this.housingMode === 'moving') {
      if (this.housingFreeRotate || !this.housingGridSnap || isFurnitureKind(this.getActiveGhostKind())) {
        const stepDeg = this.housingFreeRotate ? 15 : 90;
        this.housingFreeYawDeg = (((this.housingFreeYawDeg + deltaSteps * stepDeg) % 360) + 360) % 360;
        this.ghostRotationStep = ((Math.round(this.housingFreeYawDeg / 90) % 4) + 4) % 4;
      } else {
        this.ghostRotationStep = (((this.ghostRotationStep + deltaSteps) % 4) + 4) % 4;
        this.housingFreeYawDeg = this.ghostRotationStep * 90;
      }
      this.updateGhostTransformAndValidity();
      this.sound.playEquipSwap();
      this.emitHudSnapshot();
    } else if (this.selectedHouseId) {
      this.rotateSelectedHouse(deltaSteps);
    }
  }

  private localDirToWorldGrid(lx: number, lz: number, rotationY: number): { dx: number; dz: number } {
    const c = Math.cos(rotationY);
    const s = Math.sin(rotationY);
    return {
      dx: Math.round(lx * c + lz * s),
      dz: Math.round(-lx * s + lz * c),
    };
  }

  private computeTileNeighborMask(tile: PlacedHousingTile): TileNeighborMask {
    const mask: TileNeighborMask = {};
    if (!tile.group.visible) return mask;

    const sameStyle = (other: PlacedHousingTile) =>
      other.id !== tile.id &&
      other.group.visible &&
      other.material === tile.material &&
      other.color === tile.color &&
      Math.abs(other.baseY - tile.baseY) < 0.08;

    if (isWalkableTopKind(tile.kind)) {
      const nDir = this.localDirToWorldGrid(0, -1, tile.rotationY);
      const sDir = this.localDirToWorldGrid(0, 1, tile.rotationY);
      const wDir = this.localDirToWorldGrid(-1, 0, tile.rotationY);
      const eDir = this.localDirToWorldGrid(1, 0, tile.rotationY);
      for (const o of this.placedHouses) {
        if (!sameStyle(o) || !isWalkableTopKind(o.kind)) continue;
        // Seamless connection across floors, ceilings, and flat roofs at matching elevation (including half-wall decks!)
        if (Math.abs(o.y - tile.y) > 0.24) continue;
        const dx = o.gx - tile.gx;
        const dz = o.gz - tile.gz;
        if (dx === nDir.dx && dz === nDir.dz) mask.n = true;
        else if (dx === sDir.dx && dz === sDir.dz) mask.s = true;
        else if (dx === wDir.dx && dz === wDir.dz) mask.w = true;
        else if (dx === eDir.dx && dz === eDir.dz) mask.e = true;
      }
    } else if (isWallKind(tile.kind) && tile.edge) {
      const leftDir = this.localDirToWorldGrid(-1, 0, tile.rotationY);
      const rightDir = this.localDirToWorldGrid(1, 0, tile.rotationY);
      const wallMergeGroup = (k: HousingKind) =>
        k === 'fence' ? 'fence' : k === 'half_wall' ? 'half_wall' : 'full';
      const myGroup = wallMergeGroup(tile.kind);
      for (const o of this.placedHouses) {
        if (!sameStyle(o) || !isWallKind(o.kind) || o.edge !== tile.edge) continue;
        if (wallMergeGroup(o.kind) !== myGroup) continue;
        const dx = o.gx - tile.gx;
        const dz = o.gz - tile.gz;
        if (Math.abs(o.y - tile.y) < 0.24) {
          if (dx === leftDir.dx && dz === leftDir.dz) mask.left = true;
          else if (dx === rightDir.dx && dz === rightDir.dz) mask.right = true;
        } else if (myGroup === 'full' && dx === 0 && dz === 0) {
          if (o.level === tile.level + 1) mask.up = true;
          else if (o.level === tile.level - 1) mask.down = true;
        }
      }
    } else if (tile.kind === 'roof') {
      const leftDir = this.localDirToWorldGrid(-1, 0, tile.rotationY);
      const rightDir = this.localDirToWorldGrid(1, 0, tile.rotationY);
      for (const o of this.placedHouses) {
        if (
          !sameStyle(o) ||
          o.kind !== 'roof' ||
          o.level !== tile.level ||
          o.rotationStep !== tile.rotationStep
        ) {
          continue;
        }
        const dx = o.gx - tile.gx;
        const dz = o.gz - tile.gz;
        if (dx === leftDir.dx && dz === leftDir.dz) mask.left = true;
        else if (dx === rightDir.dx && dz === rightDir.dz) mask.right = true;
      }
    }

    return mask;
  }

  private refreshAllSeamlessHousingNeighbors(): void {
    let anyRebuilt = false;
    for (let i = 0; i < this.placedHouses.length; i++) {
      const h = this.placedHouses[i];
      if (!h.group.visible) continue;
      const mask = this.computeTileNeighborMask(h);
      const sig = neighborMaskToSig(mask);
      if (sig !== h.neighborSig) {
        this.replacePlacedTileVisual(
          i,
          h.kind,
          h.material,
          h.color,
          h.gx,
          h.gz,
          h.level,
          h.edge,
          h.rotationStep,
          h.baseY,
          h.isDoorOpen,
          mask,
        );
        anyRebuilt = true;
      }
    }
    if (anyRebuilt) {
      this.updateSelectedHouseHighlight();
    }
    this.recomputeCompletedHouses();
  }

  private replacePlacedTileVisual(
    idx: number,
    newKind: HousingKind,
    newMaterial: HousingMaterial,
    newColor: HousingColorId,
    gx: number,
    gz: number,
    level: number,
    edge: HousingEdge | null,
    rotationStep: number,
    baseY: number,
    isDoorOpen?: boolean,
    neighbors: TileNeighborMask = {},
    options?: {
      customRotationY?: number;
      gridSnapped?: boolean;
      freeX?: number;
      freeZ?: number;
      heightOffset?: number;
      durability?: number;
      ownerId?: string;
    },
  ): PlacedHousingTile {
    const oldTile = this.placedHouses[idx];
    this.scene.remove(oldTile.group);
    const nextMaxDur = getHousingPieceMaxDurability(newKind, newMaterial);
    let nextDur: number;
    if (typeof options?.durability === 'number') {
      nextDur = Math.max(0, Math.min(nextMaxDur, Math.round(options.durability)));
    } else if (newMaterial !== oldTile.material) {
      // Upgrading or changing material restores full durability of the new material
      nextDur = nextMaxDur;
    } else {
      const ratio = oldTile.maxDurability > 0 ? oldTile.durability / oldTile.maxDurability : 1;
      nextDur = Math.max(1, Math.min(nextMaxDur, Math.round(ratio * nextMaxDur)));
    }
    const mergedOptions = {
      customRotationY: options?.customRotationY ?? (oldTile.gridSnapped && !isFurnitureKind(oldTile.kind) ? undefined : oldTile.rotationY),
      gridSnapped: options?.gridSnapped ?? oldTile.gridSnapped,
      freeX: options?.freeX ?? oldTile.x,
      freeZ: options?.freeZ ?? oldTile.z,
      heightOffset: options?.heightOffset ?? oldTile.heightOffset,
      durability: nextDur,
      ownerId: options?.ownerId ?? oldTile.ownerId,
    };
    const rebuilt = this.housingLib.createPlacedTile(
      oldTile.id,
      newKind,
      newMaterial,
      newColor,
      gx,
      gz,
      level,
      edge,
      rotationStep,
      baseY,
      isDoorOpen ?? oldTile.isDoorOpen,
      neighbors,
      mergedOptions,
    );
    rebuilt.damageFlashTimer = oldTile.damageFlashTimer;
    this.placedHouses[idx] = rebuilt;
    this.syncSingleTileLighting(rebuilt);
    this.scene.add(rebuilt.group);
    return rebuilt;
  }

  private getHousingLampPower(): number {
    const nf = this.environment ? this.environment.nightFactor : 0;
    // Automatically OFF in bright daytime (nightFactor <= 0.16), smoothly ignites at dusk/sunset -> full warm glow at night!
    return THREE.MathUtils.smoothstep(nf, 0.16, 0.54);
  }

  private updateHousingTileLighting(h: PlacedHousingTile, lampPower: number, time: number): void {
    const isLit = lampPower > 0.01;
    const seed = h.x * 1.37 + h.z * 2.13 + h.level * 0.91;

    if (h.porchLight) {
      h.porchLight.visible = isLit;
      h.porchLight.intensity = isLit
        ? 2.65 * lampPower * (0.94 + Math.sin(time * 7.5 + seed) * 0.06)
        : 0;
    }

    for (const wm of h.windowMats) {
      wm.emissiveIntensity = isLit ? 1.65 * lampPower : 0.0;
    }

    if (h.kind === 'wall_torch') {
      const flick =
        0.88 +
        Math.sin(time * 13.5 + seed) * 0.075 +
        Math.cos(time * 22.8 + seed * 1.7) * 0.045;

      if (h.fixtureLight) {
        h.fixtureLight.visible = isLit;
        h.fixtureLight.intensity = isLit ? 3.55 * lampPower * flick : 0;
      }
      if (h.fixtureFlameGroup) {
        h.fixtureFlameGroup.visible = isLit;
        if (isLit) {
          const sx = 0.92 + Math.sin(time * 18.2 + seed) * 0.1;
          const sy = (0.86 + Math.sin(time * 15.6 + seed * 1.4) * 0.18) * (0.45 + 0.55 * lampPower);
          const sz = 0.92 + Math.cos(time * 17.1 + seed) * 0.1;
          h.fixtureFlameGroup.scale.set(sx, sy, sz);
          h.fixtureFlameGroup.rotation.z = Math.sin(time * 9.8 + seed) * 0.085;
        }
      }
      if (h.fixtureHaloMesh) {
        h.fixtureHaloMesh.visible = isLit;
        if (isLit) {
          const hMat = h.fixtureHaloMesh.material as THREE.MeshBasicMaterial;
          hMat.opacity = 0.24 * lampPower * flick;
          h.fixtureHaloMesh.scale.setScalar(0.88 + 0.16 * flick);
        }
      }
      for (const gm of h.fixtureGlowMats) {
        gm.emissiveIntensity = isLit ? 1.85 * lampPower * flick : 0.0;
      }
    } else if (h.kind === 'ceiling_light') {
      const shimmer = 0.97 + Math.sin(time * 3.8 + seed) * 0.03;
      if (h.fixtureLight) {
        h.fixtureLight.visible = isLit;
        h.fixtureLight.intensity = isLit ? 4.45 * lampPower * shimmer : 0;
      }
      if (h.fixtureHaloMesh) {
        h.fixtureHaloMesh.visible = isLit;
        if (isLit) {
          const hMat = h.fixtureHaloMesh.material as THREE.MeshBasicMaterial;
          hMat.opacity = 0.19 * lampPower * shimmer;
        }
      }
      for (const gm of h.fixtureGlowMats) {
        gm.emissiveIntensity = isLit ? 2.25 * lampPower * shimmer : 0.0;
      }
    }
  }

  private syncSingleTileLighting(h: PlacedHousingTile): void {
    this.updateHousingTileLighting(h, this.getHousingLampPower(), this.elapsedTime);
  }

  public confirmHousingPlacement(): boolean {
    if (this.phase !== 'playing') return false;
    if (this.housingMode !== 'placing' && this.housingMode !== 'moving') return false;

    this.updateGhostTransformAndValidity();
    if (!this.ghostValid) {
      this.sound.playUiError();
      this.spawnFeedback(
        this.ghostInvalidReason || '설치할 수 없는 위치입니다',
        '#f87171',
        this.ghostX,
        this.ghostY + 1.8,
        this.ghostZ,
      );
      return false;
    }

    if (this.housingMode === 'moving' && this.selectedHouseId) {
      const idx = this.placedHouses.findIndex((h) => h.id === this.selectedHouseId);
      if (idx === -1) return false;
      const old = this.placedHouses[idx];
      const useGridSnap = this.housingGridSnap && !isFurnitureKind(old.kind);
      const moved = this.replacePlacedTileVisual(
        idx,
        old.kind,
        old.material,
        old.color,
        this.ghostGx,
        this.ghostGz,
        this.ghostLevel,
        this.ghostEdge,
        this.ghostEffectiveRotStep,
        this.ghostBaseY,
        old.isDoorOpen,
        {},
        {
          customRotationY: this.housingFreeRotate || !useGridSnap ? this.ghostRotationY : undefined,
          gridSnapped: useGridSnap,
          freeX: this.ghostX,
          freeZ: this.ghostZ,
          heightOffset: this.ghostEffectiveHeightOffset,
        },
      );
      this.suppressOverlappingDepletedResources(moved.x, moved.z, 2.4);
      this.syncSingleTileLighting(moved);
      this.refreshAllSeamlessHousingNeighbors();

      this.movingOriginalPose = null;
      this.destroyGhostPreview();
      this.housingMode = 'edit';
      this.updateSelectedHouseHighlight();

      this.sound.playPlantOrPlace();
      this.particles.spawnBurst(moved.x, moved.y + 0.8, moved.z, 0x62e5ff, 18, 4.0);
      this.spawnFeedback(`${moved.label} 이동 완료!`, '#67e8f9', moved.x, moved.y + 2.2, moved.z);
      this.broadcastHousingTile(moved);
      this.saveGame(true);
      this.emitHudSnapshot();
      return true;
    }

    const spec = HOUSING_CATALOG.find((c) => c.kind === this.selectedBlueprint);
    if (!spec) return false;
    const cost = getHousingPieceCost(spec.kind, this.selectedMaterial);
    if (!this.hasMaterials(cost)) {
      this.sound.playUiError();
      this.spawnFeedback('건축 자재가 부족합니다', '#f87171', this.ghostX, this.ghostY + 1.8, this.ghostZ);
      return false;
    }

    this.deductMaterials(cost);
    const id = this.mpPlayerId
      ? `tile_${this.mpPlayerId.slice(0, 6)}_${Date.now().toString(36)}_${this.housingCounter++}`
      : `tile_${this.housingCounter++}`;
    const useGridSnap = this.housingGridSnap && !isFurnitureKind(spec.kind);
    const built = this.housingLib.createPlacedTile(
      id,
      spec.kind,
      this.selectedMaterial,
      this.selectedColor,
      this.ghostGx,
      this.ghostGz,
      this.ghostLevel,
      this.ghostEdge,
      this.ghostEffectiveRotStep,
      this.ghostBaseY,
      false,
      {},
      {
        customRotationY: this.housingFreeRotate || !useGridSnap ? this.ghostRotationY : undefined,
        gridSnapped: useGridSnap,
        freeX: this.ghostX,
        freeZ: this.ghostZ,
        heightOffset: this.ghostEffectiveHeightOffset,
        ownerId: this.mpPlayerId || undefined,
      },
    );
    // Permanently suppress natural resource respawn beneath built structures
    this.suppressOverlappingDepletedResources(built.x, built.z, 2.4);
    this.syncSingleTileLighting(built);
    const prevRooms = this.completedHouseCells.size;
    this.placedHouses.push(built);
    this.scene.add(built.group);
    this.refreshAllSeamlessHousingNeighbors();
    this.broadcastHousingTile(built);

    if (this.completedHouseCells.size > prevRooms && prevRooms === 0) {
      this.sound.playQuestComplete();
      this.showBanner('집 완성! 내부가 몬스터 침입 차단 안전 구역으로 활성화되었습니다 (외벽은 몬스터 공격 시 내구도 소모)');
    }

    const matSpec = HOUSING_MATERIALS.find((m) => m.id === this.selectedMaterial);
    this.sound.playForgeAnvil();
    this.particles.spawnBurst(
      built.x,
      built.y + (built.kind === 'ceiling_light' ? -0.45 : built.kind === 'wall_torch' ? 1.7 : 0.9),
      built.z,
      isFixtureKind(built.kind) ? 0xffc861 : 0x38f2c8,
      20,
      4.4,
    );
    const stackLabel =
      !isFixtureKind(built.kind) && built.level > 0 ? ` (${built.level + 1}단 증설)` : '';
    const fixtureHint = isFixtureKind(built.kind)
      ? this.environment && this.environment.nightFactor > 0.18
        ? ' · 야간 자동 점등!'
        : ' · 밤이 되면 자동 점등'
      : '';
    this.spawnFeedback(
      `${isFixtureKind(built.kind) ? '' : matSpec ? `${matSpec.shortLabel} ` : ''}${spec.name} 설치${stackLabel}${fixtureHint}`,
      isFixtureKind(built.kind) ? '#fde68a' : '#86efac',
      built.x,
      built.y + (built.kind === 'ceiling_light' ? -0.2 : 2.2),
      built.z,
    );
    this.gainExp(12);
    this.gainProficiencyExp('craft', 16);
    this.recordDailyProgress('daily_build_or_plant', 1);
    if (this.mpConnected && this.remotePlayers.size > 0) {
      this.recordDailyProgress('daily_coop_challenge', 1);
    }
    this.saveGame(true);
    this.updateGhostTransformAndValidity();
    this.emitHudSnapshot();
    return true;
  }

  public selectHouse(houseId: string | null): void {
    if (this.housingMode === 'moving') {
      this.cancelMovingSelectedHouse();
    }
    this.destroyGhostPreview();
    this.selectedHouseId = houseId;
    if (houseId) {
      this.housingMode = 'edit';
      const h = this.placedHouses.find((item) => item.id === houseId);
      if (h) {
        this.selectedMaterial = h.material;
        this.selectedColor = h.color;
        this.sound.playEquipSwap();
      }
    }
    this.updateSelectedHouseHighlight();
    this.emitHudSnapshot();
  }

  public startMovingSelectedHouse(): void {
    if (!this.selectedHouseId) return;
    const h = this.placedHouses.find((item) => item.id === this.selectedHouseId);
    if (!h) return;
    this.sound.unlock();
    this.movingOriginalPose = {
      gx: h.gx,
      gz: h.gz,
      level: h.level,
      edge: h.edge,
      rotationStep: h.rotationStep,
      rotationY: h.rotationY,
      gridSnapped: h.gridSnapped,
      heightOffset: h.heightOffset,
      x: h.x,
      z: h.z,
      baseY: h.baseY,
    };
    this.ghostGx = h.gx;
    this.ghostGz = h.gz;
    this.ghostLevel = h.level;
    this.ghostEdge = h.edge;
    this.ghostRotationStep = h.rotationStep;
    this.housingFreeYawDeg = ((Math.round(THREE.MathUtils.radToDeg(h.rotationY)) % 360) + 360) % 360;
    this.housingGridSnap = h.gridSnapped;
    this.housingHeightOffset = h.heightOffset;
    this.ghostBaseY = h.baseY;
    h.group.visible = false;
    this.housingMode = 'moving';
    this.rebuildGhostPreview(h.kind);
    this.updateSelectedHouseHighlight();
    this.showBanner(`[${h.label}] 이동 모드: 반투명 미리보기로 새 위치를 지정해 클릭하세요`);
    this.emitHudSnapshot();
  }

  public cancelMovingSelectedHouse(): void {
    if (this.housingMode !== 'moving' || !this.selectedHouseId || !this.movingOriginalPose) return;
    const idx = this.placedHouses.findIndex((item) => item.id === this.selectedHouseId);
    if (idx !== -1) {
      const h = this.placedHouses[idx];
      h.group.visible = true;
    }
    this.movingOriginalPose = null;
    this.destroyGhostPreview();
    this.housingMode = 'edit';
    this.updateSelectedHouseHighlight();
    this.emitHudSnapshot();
  }

  public rotateSelectedHouse(deltaSteps = 1): void {
    if (!this.selectedHouseId) return;
    const idx = this.placedHouses.findIndex((item) => item.id === this.selectedHouseId);
    if (idx === -1) return;
    const h = this.placedHouses[idx];
    const useFree = this.housingFreeRotate || !h.gridSnapped || isFurnitureKind(h.kind);
    const stepDeg = this.housingFreeRotate ? 15 : 90;
    const nextStep =
      h.kind === 'wall_torch'
        ? (((h.rotationStep + deltaSteps) % 2) + 2) % 2
        : (((h.rotationStep + deltaSteps) % 4) + 4) % 4;
    const nextRotY = useFree
      ? h.rotationY + THREE.MathUtils.degToRad(deltaSteps * stepDeg)
      : undefined;
    if (h.kind === 'wall_torch' && h.gridSnapped) {
      const targetSlot = getTileSlotKey('wall_torch', h.gx, h.gz, h.level, h.edge, nextStep);
      if (this.hasSlotOccupied(targetSlot, h.id)) {
        this.sound.playUiError();
        this.spawnFeedback('반대쪽 벽면에 이미 횃불이 있습니다', '#f87171', h.x, h.y + 1.8, h.z);
        return;
      }
    }
    const rebuilt = this.replacePlacedTileVisual(
      idx,
      h.kind,
      h.material,
      h.color,
      h.gx,
      h.gz,
      h.level,
      h.edge,
      nextStep,
      h.baseY,
      h.isDoorOpen,
      {},
      {
        customRotationY: nextRotY,
        gridSnapped: h.gridSnapped,
        freeX: h.x,
        freeZ: h.z,
        heightOffset: h.heightOffset,
      },
    );
    this.refreshAllSeamlessHousingNeighbors();
    this.updateSelectedHouseHighlight();
    this.sound.playEquipSwap();
    this.particles.spawnBurst(rebuilt.x, rebuilt.y + 1.0, rebuilt.z, 0x62e5ff, 10, 3.0);
    this.broadcastHousingTile(rebuilt);
    this.saveGame(true);
    this.emitHudSnapshot();
  }

  public changeSelectedTileMaterial(newMaterial: HousingMaterial): boolean {
    if (!this.selectedHouseId) return false;
    const idx = this.placedHouses.findIndex((item) => item.id === this.selectedHouseId);
    if (idx === -1) return false;
    const h = this.placedHouses[idx];
    if (h.material === newMaterial) return true;

    const oldCost = getHousingPieceCost(h.kind, h.material);
    const newCost = getHousingPieceCost(h.kind, newMaterial);

    const needWood = Math.max(0, (newCost.wood ?? 0) - (oldCost.wood ?? 0));
    const needStone = Math.max(0, (newCost.stone ?? 0) - (oldCost.stone ?? 0));
    const needIron = Math.max(0, (newCost.iron ?? 0) - (oldCost.iron ?? 0));

    if (
      this.inventory.wood < needWood ||
      this.inventory.stone < needStone ||
      this.inventory.iron < needIron
    ) {
      this.sound.playUiError();
      this.spawnFeedback('자재 변경에 필요한 재료가 부족합니다', '#f87171', h.x, h.y + 2.0, h.z);
      return false;
    }

    this.inventory.wood += (oldCost.wood ?? 0) - (newCost.wood ?? 0);
    this.inventory.stone += (oldCost.stone ?? 0) - (newCost.stone ?? 0);
    this.inventory.iron += (oldCost.iron ?? 0) - (newCost.iron ?? 0);

    const rebuilt = this.replacePlacedTileVisual(
      idx,
      h.kind,
      newMaterial,
      h.color,
      h.gx,
      h.gz,
      h.level,
      h.edge,
      h.rotationStep,
      h.baseY,
      h.isDoorOpen,
    );
    this.selectedMaterial = newMaterial;
    this.refreshAllSeamlessHousingNeighbors();
    this.updateSelectedHouseHighlight();
    const matSpec = HOUSING_MATERIALS.find((m) => m.id === newMaterial);
    this.sound.playForgeAnvil();
    this.particles.spawnBurst(rebuilt.x, rebuilt.y + 1.2, rebuilt.z, 0xfde047, 18, 4.0);
    this.spawnFeedback(
      `${matSpec ? matSpec.label : newMaterial} 자재로 변경 완료!`,
      '#fde68a',
      rebuilt.x,
      rebuilt.y + 2.2,
      rebuilt.z,
    );
    this.broadcastHousingTile(rebuilt);
    this.saveGame(true);
    this.emitHudSnapshot();
    return true;
  }

  public changeSelectedTileColor(newColor: HousingColorId): boolean {
    if (!this.selectedHouseId) return false;
    const idx = this.placedHouses.findIndex((item) => item.id === this.selectedHouseId);
    if (idx === -1) return false;
    const h = this.placedHouses[idx];
    if (h.color === newColor) return true;

    const rebuilt = this.replacePlacedTileVisual(
      idx,
      h.kind,
      h.material,
      newColor,
      h.gx,
      h.gz,
      h.level,
      h.edge,
      h.rotationStep,
      h.baseY,
      h.isDoorOpen,
    );
    this.selectedColor = newColor;
    this.refreshAllSeamlessHousingNeighbors();
    this.updateSelectedHouseHighlight();
    const colorSpec = HOUSING_COLORS.find((c) => c.id === newColor);
    this.sound.playPlantOrPlace();
    this.particles.spawnBurst(
      rebuilt.x,
      rebuilt.y + 1.2,
      rebuilt.z,
      colorSpec && newColor !== 'natural' ? colorSpec.tintHex : 0xfde68a,
      16,
      3.8,
    );
    this.spawnFeedback(
      `${colorSpec ? colorSpec.label : newColor} 색상 도색 완료!`,
      '#fde68a',
      rebuilt.x,
      rebuilt.y + 2.2,
      rebuilt.z,
    );
    this.broadcastHousingTile(rebuilt);
    this.saveGame(true);
    this.emitHudSnapshot();
    return true;
  }

  public paintConnectedStructure(newColor: HousingColorId): number {
    if (!this.selectedHouseId) return 0;
    const startIdx = this.placedHouses.findIndex((item) => item.id === this.selectedHouseId);
    if (startIdx === -1) return 0;

    const visited = new Set<number>([startIdx]);
    const queue: number[] = [startIdx];
    while (queue.length > 0) {
      const curIdx = queue.shift()!;
      const cur = this.placedHouses[curIdx];
      for (let i = 0; i < this.placedHouses.length; i++) {
        if (visited.has(i)) continue;
        const other = this.placedHouses[i];
        const hd = Math.hypot(cur.x - other.x, cur.z - other.z);
        const vd = Math.abs(cur.y - other.y);
        if (hd <= HOUSING_TILE_SIZE * 1.15 && vd <= HOUSING_WALL_HEIGHT + 0.5) {
          visited.add(i);
          queue.push(i);
        }
      }
    }

    let changed = 0;
    for (const idx of visited) {
      const h = this.placedHouses[idx];
      if (h.color !== newColor) {
        const rebuilt = this.replacePlacedTileVisual(
          idx,
          h.kind,
          h.material,
          newColor,
          h.gx,
          h.gz,
          h.level,
          h.edge,
          h.rotationStep,
          h.baseY,
          h.isDoorOpen,
        );
        this.broadcastHousingTile(rebuilt);
        changed++;
      }
    }

    this.selectedColor = newColor;
    this.refreshAllSeamlessHousingNeighbors();
    this.updateSelectedHouseHighlight();
    const colorSpec = HOUSING_COLORS.find((c) => c.id === newColor);
    const center = this.placedHouses[startIdx];
    this.sound.playCollectChime();
    this.particles.spawnBurst(
      center.x,
      center.y + 1.5,
      center.z,
      colorSpec && newColor !== 'natural' ? colorSpec.tintHex : 0x38f2c8,
      26,
      5.5,
    );
    this.spawnFeedback(
      `연결 건축물 ${visited.size}개 타일 [${colorSpec ? colorSpec.label : newColor}] 일괄 도색!`,
      '#7cf7dc',
      center.x,
      center.y + 2.4,
      center.z,
    );
    this.saveGame(true);
    this.emitHudSnapshot();
    return changed;
  }

  public toggleDoorTile(tileId?: string): boolean {
    const targetId = tileId ?? this.selectedHouseId;
    if (!targetId) return false;
    const h = this.placedHouses.find((item) => item.id === targetId);
    if (!h || h.kind !== 'door') return false;
    h.isDoorOpen = !h.isDoorOpen;
    this.sound.playEquipSwap();
    this.spawnFeedback(
      h.isDoorOpen ? '문을 열었습니다' : '문을 닫았습니다',
      '#7cf7dc',
      h.x,
      h.y + 2.15,
      h.z,
    );
    this.broadcastHousingTile(h);
    this.saveGame(true);
    this.emitHudSnapshot();
    return true;
  }

  public swapSelectedTileKind(newKind: HousingKind): boolean {
    if (!this.selectedHouseId) return false;
    const idx = this.placedHouses.findIndex((item) => item.id === this.selectedHouseId);
    if (idx === -1) return false;
    const h = this.placedHouses[idx];
    if (h.kind === newKind) return true;

    const wallSwap = isWallKind(h.kind) && isWallKind(newKind);
    const topSwap = isTopCoverKind(h.kind) && isTopCoverKind(newKind);
    if (!wallSwap && !topSwap) return false;

    const rebuilt = this.replacePlacedTileVisual(
      idx,
      newKind,
      h.material,
      h.color,
      h.gx,
      h.gz,
      h.level,
      h.edge,
      h.rotationStep,
      h.baseY,
      newKind === 'door' ? false : h.isDoorOpen,
    );
    this.refreshAllSeamlessHousingNeighbors();
    this.updateSelectedHouseHighlight();
    this.sound.playPlantOrPlace();
    this.particles.spawnBurst(rebuilt.x, rebuilt.y + 1.2, rebuilt.z, 0x38f2c8, 14, 3.5);
    this.spawnFeedback(`${rebuilt.label} 형태로 전환 완료!`, '#67e8f9', rebuilt.x, rebuilt.y + 2.2, rebuilt.z);
    this.broadcastHousingTile(rebuilt);
    this.saveGame(true);
    this.emitHudSnapshot();
    return true;
  }

  public demolishSelectedHouse(): boolean {
    if (!this.selectedHouseId) return false;
    const idx = this.placedHouses.findIndex((item) => item.id === this.selectedHouseId);
    if (idx === -1) return false;
    const h = this.placedHouses[idx];
    const refund = getHousingPieceCost(h.kind, h.material);

    this.scene.remove(h.group);
    this.placedHouses.splice(idx, 1);
    this.selectedHouseId = null;
    this.movingOriginalPose = null;
    this.destroyGhostPreview();
    this.refreshAllSeamlessHousingNeighbors();

    // Refund 100% of building materials so players can remodel freely
    if (refund.wood) this.inventory.wood += refund.wood;
    if (refund.stone) this.inventory.stone += refund.stone;
    if (refund.iron) this.inventory.iron += refund.iron;
    if (refund.crystal) this.inventory.crystal += refund.crystal;

    this.sound.playWoodChop(true);
    this.particles.spawnBurst(h.x, h.y + 1.0, h.z, 0xd8b48a, 22, 4.5);
    this.spawnFeedback(`${h.label} 철거 · 자재 100% 반환`, '#fde68a', h.x, h.y + 2.0, h.z);
    this.mpClient?.sendHousingDelete(h.id);
    this.saveGame(true);
    this.emitHudSnapshot();
    return true;
  }

  // ---------------- COMPLETED HOUSE DETECTION, DURABILITY & REPAIR ----------------

  private recomputeCompletedHouses(): void {
    this.completedHouseCells.clear();
    if (this.placedHouses.length < 4) return;

    const wallEdges = new Set<string>();
    const coveredCells = new Map<string, { gx: number; gz: number; level: number; baseY: number }>();

    const hasFloorAt = new Set<string>();
    const hasTopAt = new Set<string>();
    const cellBaseY = new Map<string, number>();

    for (const h of this.placedHouses) {
      if (!h.group.visible) continue;
      if (isWallKind(h.kind) && h.kind !== 'fence' && h.kind !== 'half_wall' && h.edge) {
        const c = canonicalizeEdge(h.gx, h.gz, h.edge);
        wallEdges.add(`${c.gx},${c.gz},${h.level},${c.edge}`);
      } else if (h.kind === 'floor') {
        hasFloorAt.add(`${h.gx},${h.gz},${h.level}`);
        cellBaseY.set(`${h.gx},${h.gz},${h.level}`, h.baseY);
        if (h.level > 0) {
          hasTopAt.add(`${h.gx},${h.gz},${h.level - 1}`);
        }
      } else if (isTopCoverKind(h.kind)) {
        hasTopAt.add(`${h.gx},${h.gz},${h.level}`);
        if (!cellBaseY.has(`${h.gx},${h.gz},${h.level}`)) {
          cellBaseY.set(`${h.gx},${h.gz},${h.level}`, h.baseY);
        }
        if (h.kind === 'ceiling' || h.kind === 'flat_roof') {
          hasFloorAt.add(`${h.gx},${h.gz},${h.level + 1}`);
          cellBaseY.set(`${h.gx},${h.gz},${h.level + 1}`, h.baseY);
        }
      }
    }

    // Collect every cell that has a roof/ceiling cover (plus floor or level 0 ground)
    for (const key of hasTopAt) {
      const [gxStr, gzStr, lvlStr] = key.split(',');
      const gx = Number(gxStr);
      const gz = Number(gzStr);
      const level = Number(lvlStr);
      if (level === 0 || hasFloorAt.has(key)) {
        coveredCells.set(key, {
          gx,
          gz,
          level,
          baseY: cellBaseY.get(key) ?? getTerrainHeight(gx * HOUSING_TILE_SIZE, gz * HOUSING_TILE_SIZE),
        });
      }
    }

    const hasWallBetween = (gx: number, gz: number, dir: 'n' | 's' | 'w' | 'e', level: number): boolean => {
      const c = canonicalizeEdge(gx, gz, dir);
      return wallEdges.has(`${c.gx},${c.gz},${level},${c.edge}`);
    };

    const visited = new Set<string>();
    const dirs: Array<{ dir: 'n' | 's' | 'w' | 'e'; dx: number; dz: number }> = [
      { dir: 'n', dx: 0, dz: -1 },
      { dir: 's', dx: 0, dz: 1 },
      { dir: 'w', dx: -1, dz: 0 },
      { dir: 'e', dx: 1, dz: 0 },
    ];

    for (const [startKey, startCell] of coveredCells) {
      if (visited.has(startKey)) continue;
      const component: string[] = [];
      const queue = [startCell];
      visited.add(startKey);
      let enclosed = true;

      while (queue.length > 0) {
        const cur = queue.shift()!;
        const ck = `${cur.gx},${cur.gz},${cur.level}`;
        component.push(ck);
        if (component.length > 48) {
          enclosed = false;
          break;
        }
        for (const d of dirs) {
          if (hasWallBetween(cur.gx, cur.gz, d.dir, cur.level)) continue;
          const nk = `${cur.gx + d.dx},${cur.gz + d.dz},${cur.level}`;
          const nextCell = coveredCells.get(nk);
          if (!nextCell) {
            // Opened directly to exterior without a wall or roof!
            enclosed = false;
          } else if (!visited.has(nk)) {
            visited.add(nk);
            queue.push(nextCell);
          }
        }
      }

      if (enclosed && component.length > 0) {
        for (const ck of component) {
          this.completedHouseCells.add(ck);
        }
      }
    }
  }

  private isPointInCompletedHouse(x: number, z: number, y: number): boolean {
    if (this.completedHouseCells.size === 0) return false;
    const gx = Math.round(x / HOUSING_TILE_SIZE);
    const gz = Math.round(z / HOUSING_TILE_SIZE);
    for (let lvl = 0; lvl <= 6; lvl++) {
      const key = `${gx},${gz},${lvl}`;
      if (!this.completedHouseCells.has(key)) continue;
      // Verify vertical elevation roughly matches this story
      const refTile = this.placedHouses.find(
        (h) =>
          h.group.visible &&
          h.gx === gx &&
          h.gz === gz &&
          (h.level === lvl || ((h.kind === 'ceiling' || h.kind === 'flat_roof') && h.level === lvl - 1)),
      );
      const storyBase = refTile ? refTile.baseY + lvl * HOUSING_WALL_HEIGHT : getTerrainHeight(x, z) + lvl * HOUSING_WALL_HEIGHT;
      if (y >= storyBase - 1.2 && y <= storyBase + HOUSING_WALL_HEIGHT + 0.4) {
        return true;
      }
    }
    return false;
  }

  public repairSelectedHouse(): boolean {
    if (!this.selectedHouseId) return false;
    return this.repairHousingTile(this.selectedHouseId);
  }

  public repairHousingTile(tileId: string): boolean {
    if (this.phase !== 'playing') return false;
    const tile = this.placedHouses.find((h) => h.id === tileId);
    if (!tile) return false;
    if (tile.durability >= tile.maxDurability) {
      this.spawnFeedback('이미 내구도가 최대입니다', '#86efac', tile.x, tile.y + 2.0, tile.z);
      return false;
    }

    const cost = getHousingRepairCost(tile.material);
    if (!this.hasMaterials(cost)) {
      const parts: string[] = [];
      if (cost.wood) parts.push(`원목 ${cost.wood}`);
      if (cost.stone) parts.push(`석재 ${cost.stone}`);
      if (cost.iron) parts.push(`철광석 ${cost.iron}`);
      this.sound.playUiError();
      this.spawnFeedback(`수리 자재 부족 (${parts.join(' · ')})`, '#f87171', tile.x, tile.y + 2.0, tile.z);
      return false;
    }

    this.deductMaterials(cost);
    tile.durability = tile.maxDurability;
    tile.damageFlashTimer = 0;
    updateTileDamageVisual(tile, 0.016);
    this.sound.playForgeAnvil();
    this.particles.spawnBurst(tile.x, tile.y + 1.2, tile.z, 0x34d399, 18, 4.0);
    this.spawnFeedback(`${tile.label} 수리 완료! (${tile.maxDurability}/${tile.maxDurability})`, '#6ee7b7', tile.x, tile.y + 2.2, tile.z);
    this.broadcastHousingTile(tile);
    this.saveGame(true);
    this.emitHudSnapshot();
    return true;
  }

  private damageHousingTile(tile: PlacedHousingTile, dmg: number, attacker?: WorldMonster): void {
    const applied = Math.max(1, Math.round(dmg));
    tile.durability = Math.max(0, tile.durability - applied);
    tile.damageFlashTimer = 0.3;
    updateTileDamageVisual(tile, 0);

    const isStoneOrIron = tile.material === 'stone' || tile.material === 'iron_fort';
    if (isStoneOrIron) {
      this.sound.playStoneMine(false, tile.durability <= 0);
    } else {
      this.sound.playWoodChop(tile.durability <= 0);
    }
    this.particles.spawnBurst(
      tile.x,
      tile.y + 1.2,
      tile.z,
      isStoneOrIron ? 0xcbd5e1 : 0xd6a674,
      tile.durability <= 0 ? 28 : 10,
      tile.durability <= 0 ? 5.8 : 3.2,
    );
    this.spawnFeedback(
      `-${applied} 내구도 (${tile.durability}/${tile.maxDurability})`,
      tile.durability <= tile.maxDurability * 0.3 ? '#f87171' : '#fbbf24',
      tile.x,
      tile.y + 2.1,
      tile.z,
    );

    if (tile.durability <= 0) {
      const idx = this.placedHouses.findIndex((h) => h.id === tile.id);
      if (idx !== -1) {
        this.scene.remove(tile.group);
        this.placedHouses.splice(idx, 1);
        if (this.selectedHouseId === tile.id) {
          this.selectedHouseId = null;
          this.updateSelectedHouseHighlight();
        }
        this.shakeIntensity = Math.max(this.shakeIntensity, 0.22);
        this.particles.spawnRing(tile.x, tile.y + 0.35, tile.z, 0xf87171, 3.6);
        this.sound.playBossRoar();
        this.refreshAllSeamlessHousingNeighbors();
        this.mpClient?.sendHousingDelete(tile.id);

        // Behavior Tree Structure-Break Reaction Animation: attacker & nearby allies celebrate the breach!
        if (attacker && !attacker.isDead) {
          attacker.btState = 'celebrate_break';
          attacker.breakReactTimer = 1.55;
          attacker.siegeTargetId = null;
          attacker.attackCooldown = 1.55;
          this.particles.spawnRing(attacker.x, attacker.y + 0.2, attacker.z, 0xef4444, 2.8);
          this.spawnFeedback(
            `${attacker.label}: 구조물 파괴!`,
            '#f87171',
            attacker.x,
            attacker.y + 2.4,
            attacker.z,
          );
        }
        for (const ally of this.monsters) {
          if (ally.isDead || !ally.group.visible || ally === attacker) continue;
          if (Math.hypot(ally.x - tile.x, ally.z - tile.z) <= 8.5) {
            ally.btState = 'celebrate_break';
            ally.breakReactTimer = Math.max(ally.breakReactTimer, 1.2);
            ally.siegeTargetId = null;
          }
        }

        this.showBanner(
          `${attacker ? attacker.label : '몬스터'}의 공격으로 [${tile.label}]이(가) 파손되었습니다!`,
        );
        this.saveGame(true);
        this.emitHudSnapshot();
      }
    } else {
      this.mpClient?.sendHousingDamage(tile.id, tile.durability);
    }
  }

  // ---------------- REAL-TIME MULTIPLAYER (SHARED LINK SYNC) ----------------

  private serializeTileForNetwork(tile: PlacedHousingTile): SharedHousingPayload {
    return {
      id: tile.id,
      kind: tile.kind,
      material: tile.material,
      color: tile.color,
      gx: tile.gx,
      gz: tile.gz,
      level: tile.level,
      edge: tile.edge,
      rotationStep: tile.rotationStep,
      rotationY: tile.rotationY,
      gridSnapped: tile.gridSnapped,
      freeX: tile.gridSnapped ? undefined : tile.x,
      freeZ: tile.gridSnapped ? undefined : tile.z,
      heightOffset: tile.heightOffset || undefined,
      baseY: tile.baseY,
      isDoorOpen: tile.kind === 'door' ? tile.isDoorOpen : undefined,
      durability: tile.durability,
      maxDurability: tile.maxDurability,
      ownerId: tile.ownerId || this.mpPlayerId || undefined,
    };
  }

  private broadcastHousingTile(tile: PlacedHousingTile): void {
    this.mpClient?.sendHousingUpsert(this.serializeTileForNetwork(tile));
  }

  public getMultiplayerShareUrl(): string {
    return this.mpClient ? this.mpClient.getShareUrl() : window.location.href;
  }

  public setMultiplayerName(name: string): void {
    if (!this.mpClient) return;
    this.mpClient.setPlayerName(name);
    this.mpPlayerName = this.mpClient.playerName;
    this.emitHudSnapshot();
  }

  public joinMultiplayerRoom(nextRoomId: string, preferredMode?: GameMode): void {
    if (!this.mpClient) {
      this.initMultiplayer();
    }
    if (!this.mpClient) return;
    for (const id of Array.from(this.remotePlayers.keys())) {
      this.removeRemotePlayer(id);
    }
    this.roomDailyProgress = {};
    this.roomDailyContributors = {};
    const targetMode = preferredMode ?? this.gameMode;
    this.mpRoomGameMode = targetMode;
    this.mpClient.joinRoom(nextRoomId, targetMode);
    this.mpRoomId = this.mpClient.roomId;
    this.showBanner(`[멀티플레이] "${this.mpRoomId}" 공유 월드 방에 접속합니다...`);
    this.emitHudSnapshot();
  }

  private applyRoomGameModeSync(mode: GameMode): void {
    this.mpRoomGameMode = mode;
    if (this.gameMode === mode) {
      this.emitHudSnapshot();
      return;
    }
    this.gameMode = mode;
    if (mode === 'creative') {
      this.applyCreativeUnlocks();
      const defaults = getCreativeDefaultHotbarForClass(this.playerClass);
      const nextSlots = [...this.hotbarSlots];
      for (const item of defaults) {
        if (nextSlots.length >= 9) break;
        if (!nextSlots.includes(item)) nextSlots.push(item);
      }
      this.hotbarSlots = nextSlots.slice(0, 9);
      this.showBanner('[멀티 방 동기화] 크리에이티브 모드로 전환되었습니다 (무한 체력·배고픔·달리기 · 9칸 바 활성)');
    } else {
      const defaults = getDefaultHotbarForClass(this.playerClass);
      this.hotbarSlots = this.hotbarSlots.slice(0, 7);
      if (this.hotbarSlots.length < 7) {
        this.hotbarSlots = [...defaults];
      }
      this.showBanner('[멀티 방 동기화] 서바이벌 모드로 전환되었습니다');
    }
    this.emitHudSnapshot();
  }

  private isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;

  public setOfflineMode(offline: boolean): void {
    this.isOffline = offline;
    this.mpClient?.setOfflineMode(offline);
    if (offline) {
      for (const id of Array.from(this.remotePlayers.keys())) {
        this.removeRemotePlayer(id);
      }
      this.mpConnected = false;
      this.mpTransport = 'offline';
      this.emitHudSnapshot();
    }
  }

  public setTitleCameraMode(mode: 'scenic' | 'character'): void {
    this.titleCameraMode = mode;
  }

  public applySettings(next: GameSettings): void {
    this.settings = { ...next };

    if (this.renderer) {
      const baseDpr = this.isSoftwareGl ? 0.85 : Math.min(window.devicePixelRatio || 1, 1.5);
      const targetDpr = THREE.MathUtils.clamp(baseDpr * next.resolutionScale, 0.55, 1.75);
      this.renderer.setPixelRatio(targetDpr);
      this.renderer.setSize(
        this.container.clientWidth || window.innerWidth,
        this.container.clientHeight || window.innerHeight,
      );

      const allowShadows = next.shadowsEnabled && !this.isSoftwareGl;
      this.renderer.shadowMap.enabled = allowShadows;
      if (this.sunLight) {
        this.sunLight.castShadow = allowShadows;
        const mapDim =
          next.shadowQuality === 'low' ? 512 : next.shadowQuality === 'medium' ? 1024 : 1536;
        if (this.sunLight.shadow.mapSize.width !== mapDim) {
          this.sunLight.shadow.mapSize.set(mapDim, mapDim);
          if (this.sunLight.shadow.map) {
            this.sunLight.shadow.map.dispose();
            this.sunLight.shadow.map = null;
          }
        }
      }
      this.renderer.shadowMap.needsUpdate = true;
    }

    const farPlane = next.viewDistance === 'near' ? 155 : next.viewDistance === 'medium' ? 245 : 460;
    this.cullDistance = next.viewDistance === 'near' ? 76 : next.viewDistance === 'medium' ? 124 : 210;
    if (this.camera && Math.abs(this.camera.far - farPlane) > 1) {
      this.camera.far = farPlane;
      this.camera.updateProjectionMatrix();
    }

    if (this.meadowGrassMesh) {
      const count = Math.floor(this.meadowGrassMaxCount * THREE.MathUtils.clamp(next.grassDensity, 0, 1));
      this.meadowGrassMesh.count = count;
      this.meadowGrassMesh.visible = count > 0;
    }

    if (this.environment) {
      const pScale =
        next.particlesLevel === 'off'
          ? 0
          : next.particlesLevel === 'low'
            ? 0.32
            : next.particlesLevel === 'medium'
              ? 0.65
              : 1.0;
      this.environment.applyOptimization({
        particleScale: pScale,
        weatherEffects: next.weatherEffects,
        viewDistance: next.viewDistance,
      });
    }

    this.sound.setVolumes(next.masterVolume, next.bgmVolume, next.sfxVolume);
  }

  private initMultiplayer(): void {
    this.mpClient = new MultiplayerClient({
      onStatusChange: (connected, roomId, playerId, playerName, transport, serverHost) => {
        const wasConnected = this.mpConnected;
        this.mpConnected = connected;
        this.mpTransport = transport ?? (connected ? 'ws' : 'offline');
        this.mpServerHost = serverHost ?? '';
        this.mpRoomId = roomId;
        if (playerId !== null) this.mpPlayerId = playerId;
        this.mpPlayerName = playerName;
        if (wasConnected && !connected) {
          for (const id of Array.from(this.remotePlayers.keys())) {
            this.removeRemotePlayer(id);
          }
        }
        this.emitHudSnapshot();
      },
      onInitRoom: (info) => {
        this.mpConnected = true;
        this.mpRoomId = info.roomId;
        this.mpPlayerId = info.playerId;
        this.mpPlayerName = info.playerName;
        this.mpRoomGameMode = info.roomGameMode || 'survival';

        // Sync room game mode when joining an active room hosted by someone else
        if (info.players.length > 0 && info.roomGameMode && info.roomGameMode !== this.gameMode) {
          this.applyRoomGameModeSync(info.roomGameMode);
        } else if (info.players.length === 0 && this.gameMode === 'creative' && info.roomGameMode !== 'creative') {
          this.mpClient?.sendRoomMode('creative');
          this.mpRoomGameMode = 'creative';
        }

        // Hydrate shared room daily quest progress
        if (info.dailyQuests) {
          this.applyRemoteDailyState(info.dailyQuests);
        }
        // Seed empty room with any local daily progress already earned today
        if (info.players.length === 0) {
          this.ensureDailyQuestDate();
          for (const spec of DAILY_QUESTS_CATALOG) {
            const lv = this.dailyQuestState.progress[spec.id] ?? 0;
            const rv = this.roomDailyProgress[spec.id] ?? 0;
            if (lv > rv) {
              this.mpClient?.sendDailyProgress(spec.id, lv - rv);
            }
          }
        }

        // Hydrate remote players already in room
        for (const rp of info.players) {
          this.spawnOrUpdateRemotePlayer(rp);
        }
        // Hydrate shared plots and housing from room
        for (const p of info.plots) {
          this.applyRemotePlotClaim(p);
        }
        if (info.housing.length > 0) {
          for (const h of info.housing) {
            this.applyRemoteHousingUpsert(h);
          }
          this.refreshAllSeamlessHousingNeighbors();
        } else if (this.placedHouses.length > 0) {
          // Seed empty room with our locally saved houses so joining friends see them immediately
          for (const h of this.placedHouses) {
            this.broadcastHousingTile(h);
          }
        }
        // Hydrate spawn-egg monsters already summoned in this room
        if (info.spawnedMonsters && info.spawnedMonsters.length > 0) {
          for (const sm of info.spawnedMonsters) {
            this.spawnRemoteEggMonster({ ...sm, summonerName: '' });
          }
        }
        this.emitHudSnapshot();
      },
      onPlayerJoin: (player) => {
        this.spawnOrUpdateRemotePlayer(player);
        this.showBanner(`[멀티플레이] ${player.name}님이 월드에 접속했습니다!`);
        this.emitHudSnapshot();
      },
      onPlayerState: (player) => {
        this.spawnOrUpdateRemotePlayer(player);
      },
      onPlayerLeave: (playerId) => {
        const existing = this.remotePlayers.get(playerId);
        if (existing) {
          this.showBanner(`[멀티플레이] ${existing.name}님이 퇴장했습니다`);
        }
        this.removeRemotePlayer(playerId);
        this.emitHudSnapshot();
      },
      onHousingUpsert: (tile) => {
        this.applyRemoteHousingUpsert(tile);
        this.refreshAllSeamlessHousingNeighbors();
        this.emitHudSnapshot();
      },
      onHousingDelete: (tileId) => {
        this.applyRemoteHousingDelete(tileId);
        this.emitHudSnapshot();
      },
      onHousingDamage: (tileId, durability) => {
        this.applyRemoteHousingDamage(tileId, durability);
      },
      onPlotClaim: (plot) => {
        this.applyRemotePlotClaim(plot);
        this.emitHudSnapshot();
      },
      onDailyQuestState: (daily) => {
        this.applyRemoteDailyState(daily);
        this.emitHudSnapshot();
      },
      onRemoteSpawnEgg: (monster) => {
        this.spawnRemoteEggMonster(monster);
      },
      onRoomModeChange: (gameMode) => {
        this.applyRoomGameModeSync(gameMode);
      },
      onPlayerEvent: (event) => {
        if (event.kind === 'eat_food') {
          this.showBanner(`[멀티 협동] ${event.playerName}님이 ${event.label}을(를) 맛있게 먹었습니다`);
        } else if (event.kind === 'daily_complete') {
          this.sound.playCollectChime();
          this.showBanner(`[멀티 일일 퀘스트] ${event.playerName}님이 [${event.label}] 보상을 완료했습니다!`);
        } else if (event.kind === 'boss_defeat') {
          this.sound.playQuestComplete();
          this.showBanner(`[멀티 보스 토벌] ${event.playerName}님이 [${event.label}]을(를) 격파했습니다!`);
        }
      },
    });
    this.mpRoomId = this.mpClient.roomId;
    this.mpPlayerName = this.mpClient.playerName;
    this.mpClient.connect();
  }

  private createNameplateSprite(name: string): {
    sprite: THREE.Sprite;
    tex: THREE.CanvasTexture;
    mat: THREE.SpriteMaterial;
  } {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 256, 64);

    ctx.fillStyle = 'rgba(13, 18, 28, 0.78)';
    ctx.beginPath();
    ctx.roundRect(14, 12, 228, 40, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(98, 229, 255, 0.75)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(name.slice(0, 14), 128, 33);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthTest: false,
      fog: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(2.1, 0.52, 1);
    sprite.position.set(0, 2.25, 0);
    return { sprite, tex, mat };
  }

  private spawnOrUpdateRemotePlayer(p: RemotePlayerPayload): void {
    if (!p.id || p.id === this.mpPlayerId) return;
    const remoteClass: PlayerClassId = p.playerClass || 'warrior';
    let entity = this.remotePlayers.get(p.id);
    if (!entity) {
      const rig = createCatWarrior(this.textures);
      rig.setClass(remoteClass);
      rig.setEquippedWeapon(p.weapon);
      rig.setEquippedArmor(p.armor);
      const { sprite, tex, mat } = this.createNameplateSprite(p.name);
      rig.root.add(sprite);
      rig.root.position.set(p.x, p.y, p.z);
      rig.root.rotation.y = p.yaw;
      this.scene.add(rig.root);

      entity = {
        id: p.id,
        name: p.name,
        playerClass: remoteClass,
        rig,
        nameplate: sprite,
        nameTex: tex,
        nameMat: mat,
        x: p.x,
        y: p.y,
        z: p.z,
        yaw: p.yaw,
        targetX: p.x,
        targetY: p.y,
        targetZ: p.z,
        targetYaw: p.yaw,
        speed: p.speed,
        isSprinting: p.isSprinting,
        isGrounded: p.isGrounded,
        swingTimer: p.swinging ? 1 : 0,
        weapon: p.weapon,
        armor: p.armor,
        emote: p.emote,
        emoteTime: 0,
      };
      this.remotePlayers.set(p.id, entity);
      return;
    }

    if (entity.playerClass !== remoteClass) {
      entity.playerClass = remoteClass;
      entity.rig.setClass(remoteClass);
    }
    if (entity.name !== p.name) {
      entity.name = p.name;
      entity.rig.root.remove(entity.nameplate);
      entity.nameTex.dispose();
      entity.nameMat.dispose();
      const { sprite, tex, mat } = this.createNameplateSprite(p.name);
      entity.nameplate = sprite;
      entity.nameTex = tex;
      entity.nameMat = mat;
      entity.rig.root.add(sprite);
    }
    if (entity.weapon !== p.weapon) {
      entity.weapon = p.weapon;
      entity.rig.setEquippedWeapon(p.weapon);
    }
    if (entity.armor !== p.armor) {
      entity.armor = p.armor;
      entity.rig.setEquippedArmor(p.armor);
    }
    if (entity.emote !== p.emote) {
      entity.emote = p.emote;
      entity.emoteTime = 0;
    }
    entity.targetX = p.x;
    entity.targetY = p.y;
    entity.targetZ = p.z;
    entity.targetYaw = p.yaw;
    entity.speed = p.speed;
    entity.isSprinting = p.isSprinting;
    entity.isGrounded = p.isGrounded;
    if (p.swinging) {
      entity.swingTimer = Math.max(entity.swingTimer, 0.85);
    }
  }

  private removeRemotePlayer(playerId: string): void {
    const entity = this.remotePlayers.get(playerId);
    if (!entity) return;
    this.scene.remove(entity.rig.root);
    entity.nameTex.dispose();
    entity.nameMat.dispose();
    entity.rig.dispose();
    this.remotePlayers.delete(playerId);
  }

  private updateRemotePlayers(dt: number): void {
    const nightFactor = this.environment ? this.environment.nightFactor : 0;
    for (const rp of this.remotePlayers.values()) {
      rp.x = THREE.MathUtils.damp(rp.x, rp.targetX, 12, dt);
      rp.y = THREE.MathUtils.damp(rp.y, rp.targetY, 14, dt);
      rp.z = THREE.MathUtils.damp(rp.z, rp.targetZ, 12, dt);
      let diff = rp.targetYaw - rp.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      rp.yaw += diff * (1 - Math.exp(-12 * dt));
      rp.swingTimer = Math.max(0, rp.swingTimer - dt * 3.0);
      if (rp.emote) rp.emoteTime += dt;

      rp.rig.root.position.set(rp.x, rp.y, rp.z);
      rp.rig.root.rotation.y = rp.yaw;

      const wSpec = WEAPONS_CATALOG.find((w) => w.id === rp.weapon) || WEAPONS_CATALOG[0];
      rp.rig.updateAnimation({
        dt,
        time: this.elapsedTime,
        speed: rp.speed,
        maxSpeed: 6.2,
        turnRate: 0,
        isSprinting: rp.isSprinting,
        isGrounded: rp.isGrounded,
        verticalVel: 0,
        swingTimer: rp.swingTimer,
        swingCategory: wSpec.category,
        landSquash: 0,
        heightAboveGround: Math.max(0, rp.y - getTerrainHeight(rp.x, rp.z)),
        nightFactor,
        activeEmote: rp.emote,
        emoteTime: rp.emoteTime,
      });
    }
  }

  private applyRemoteHousingUpsert(h: SharedHousingPayload): void {
    if (!isValidSavedTile(h)) return;
    const savedColor: HousingColorId =
      h.color && VALID_HOUSING_COLORS.includes(h.color) ? h.color : 'natural';
    const existingIdx = this.placedHouses.findIndex((item) => item.id === h.id);
    if (existingIdx !== -1) {
      this.replacePlacedTileVisual(
        existingIdx,
        h.kind,
        h.material,
        savedColor,
        h.gx,
        h.gz,
        h.level,
        h.edge ?? null,
        h.rotationStep,
        h.baseY,
        !!h.isDoorOpen,
        {},
        {
          customRotationY: typeof h.rotationY === 'number' ? h.rotationY : undefined,
          gridSnapped: h.gridSnapped ?? true,
          freeX: h.freeX,
          freeZ: h.freeZ,
          heightOffset: h.heightOffset ?? 0,
          durability: h.durability,
          ownerId: h.ownerId,
        },
      );
      return;
    }

    const built = this.housingLib.createPlacedTile(
      h.id,
      h.kind,
      h.material,
      savedColor,
      h.gx,
      h.gz,
      h.level,
      h.edge ?? null,
      h.rotationStep,
      h.baseY,
      !!h.isDoorOpen,
      {},
      {
        customRotationY: typeof h.rotationY === 'number' ? h.rotationY : undefined,
        gridSnapped: h.gridSnapped ?? true,
        freeX: h.freeX,
        freeZ: h.freeZ,
        heightOffset: h.heightOffset ?? 0,
        durability: h.durability,
        ownerId: h.ownerId,
      },
    );
    this.suppressOverlappingDepletedResources(built.x, built.z, 2.4);
    this.syncSingleTileLighting(built);
    this.placedHouses.push(built);
    this.scene.add(built.group);
  }

  private applyRemoteHousingDelete(tileId: string): void {
    const idx = this.placedHouses.findIndex((h) => h.id === tileId);
    if (idx === -1) return;
    const tile = this.placedHouses[idx];
    this.scene.remove(tile.group);
    this.placedHouses.splice(idx, 1);
    if (this.selectedHouseId === tileId) {
      this.selectedHouseId = null;
      this.updateSelectedHouseHighlight();
    }
    this.refreshAllSeamlessHousingNeighbors();
  }

  private applyRemoteHousingDamage(tileId: string, durability: number): void {
    const tile = this.placedHouses.find((h) => h.id === tileId);
    if (!tile) return;
    tile.durability = Math.max(0, Math.min(tile.maxDurability, Math.round(durability)));
    tile.damageFlashTimer = 0.25;
    updateTileDamageVisual(tile, 0);
  }

  private applyRemotePlotClaim(p: SharedPlotPayload): void {
    if (this.claimedPlots.some((cp) => cp.id === p.id)) return;
    const plot = createLandPlotVisual(p.id, p.x, p.z, p.radius || 6.5);
    this.claimedPlots.push(plot);
    this.scene.add(plot.group);
    this.suppressOverlappingDepletedResources(plot.x, plot.z, plot.radius);
  }

  // ---------------- COMPLETE WORLD & HOUSING SAVE / LOAD SYSTEM ----------------

  private buildSavePayload(): GameSaveData {
    const saplings = this.resources
      .filter((r) => r.id.startsWith('sapling_'))
      .map((r) => ({
        kind: (r.kind === 'pine_tree' || r.kind === 'birch_tree' ? r.kind : 'oak_tree') as
          | 'oak_tree'
          | 'pine_tree'
          | 'birch_tree',
        x: r.x,
        z: r.z,
        tier: r.tier,
        scale: r.group.scale.x || 1,
        isDepleted: r.isDepleted,
        regrowTimer: r.regrowTimer,
      }));

    return {
      version: 2,
      savedAt: Date.now(),
      worldId: this.currentWorldId || undefined,
      worldName: this.currentWorldName,
      gameMode: this.gameMode,
      isMultiplayer: this.worldIsMultiplayer,
      roomCode: this.worldRoomCode,
      worldTier: this.worldTier,
      playerClass: this.playerClass,
      player: {
        x: this.playerX,
        z: this.playerZ,
        yaw: this.playerYaw,
        hp: Math.round(this.hp),
        stamina: Math.round(this.stamina),
        hunger: Math.round(this.hunger),
        selectedFood: this.selectedFood,
        level: this.level,
        exp: this.exp,
        nextExp: this.nextExp,
      },
      inventory: { ...this.inventory },
      upgrades: { ...this.upgrades },
      ownedWeapons: [...this.ownedWeapons],
      equippedWeapon: this.equippedWeapon,
      ownedArmors: [...this.ownedArmors],
      equippedArmor: this.equippedArmor,
      autoEquipTool: this.autoEquipTool,
      hotbarSlots: [...this.hotbarSlots],
      stats: {
        harvestedTotal: this.harvestedTotal,
        plantedSaplings: this.plantedSaplings,
        woodGathered: this.woodGathered,
        stoneGathered: this.stoneGathered,
        ironGathered: this.ironGathered,
        leatherGathered: this.leatherGathered,
        monstersDefeated: this.monstersDefeated,
        bossesDefeated: this.bossesDefeated,
        trialTowerMaxFloor: this.trialTowerHighestCleared,
        observedNightWildlife: this.observedNightWildlife,
      },
      skillMastery: {
        points: this.skillMasteryPoints,
        ranks: { ...this.skillRanks },
      },
      proficiencies: {
        combat: { ...this.proficiencies.combat },
        logging: { ...this.proficiencies.logging },
        mining: { ...this.proficiencies.mining },
        craft: { ...this.proficiencies.craft },
      },
      claimedQuests: Array.from(this.claimedQuests),
      dailyQuests: {
        dateKey: this.dailyQuestState.dateKey,
        progress: { ...this.dailyQuestState.progress },
        claimed: [...this.dailyQuestState.claimed],
        allClearClaimed: this.dailyQuestState.allClearClaimed,
      },
      environment: {
        timeOfDay: this.environment ? this.environment.timeOfDay : 9.5,
        timePaused: this.environment ? this.environment.timePaused : false,
        weather: this.environment ? this.environment.weather : 'clear',
        autoWeather: this.environment ? this.environment.autoWeather : true,
        bgmEnabled: this.sound.isBgmEnabled(),
      },
      housing: this.placedHouses.map((h) => ({
        id: h.id,
        kind: h.kind,
        material: h.material,
        color: h.color,
        gx: h.gx,
        gz: h.gz,
        level: h.level,
        edge: h.edge,
        rotationStep: h.rotationStep,
        rotationY: h.rotationY,
        gridSnapped: h.gridSnapped,
        freeX: h.gridSnapped ? undefined : h.x,
        freeZ: h.gridSnapped ? undefined : h.z,
        heightOffset: h.heightOffset || undefined,
        baseY: h.baseY,
        isDoorOpen: h.kind === 'door' ? h.isDoorOpen : undefined,
        durability: h.durability,
        maxDurability: h.maxDurability,
        ownerId: h.ownerId,
      })),
      claimedPlots: this.claimedPlots.map((p) => ({
        id: p.id,
        x: p.x,
        z: p.z,
        radius: p.radius,
      })),
      suppressedResourceIds: Array.from(this.suppressedResourceIds),
      lanterns: this.lanterns.map((l) => ({
        x: l.x,
        z: l.z,
        rotationY: l.group.rotation.y,
      })),
      saplings,
    };
  }

  public saveGame(silent = false): boolean {
    const payload = this.buildSavePayload();
    const ok = this.currentWorldId
      ? saveWorldData(this.currentWorldId, payload)
      : saveGameToStorage(payload);
    if (ok) {
      this.lastSavedAt = payload.savedAt;
      this.saveSummary = {
        savedAt: payload.savedAt,
        worldTier: payload.worldTier,
        level: payload.player.level,
        housingCount: payload.housing.length,
        playerClass: this.playerClass,
      };
      if (!silent) {
        this.sound.unlock();
        this.sound.playCollectChime();
        const t = formatSavedTime(payload.savedAt);
        this.spawnFeedback(`저장 완료 (${t})`, '#86efac', this.playerX, this.playerY + 2.25, this.playerZ);
        this.showBanner(`월드·건축 타일(${payload.housing.length}개)·장비 저장 완료 (${t})`);
      }
      this.emitHudSnapshot();
    } else if (!silent) {
      this.sound.playUiError();
      this.showBanner('브라우저 저장 공간에 기록할 수 없습니다');
    }
    return ok;
  }

  private applySaveData(data: GameSaveData): void {
    this.ensureWorldBooted();
    this.exitHousingMode();

    // Clear existing player-placed houses, lanterns, and planted saplings
    for (const h of this.placedHouses) this.scene.remove(h.group);
    this.placedHouses = [];

    for (const l of this.lanterns) this.scene.remove(l.group);
    this.lanterns = [];

    const keptResources: WorldResourceNode[] = [];
    for (const r of this.resources) {
      if (r.id.startsWith('sapling_')) {
        this.scene.remove(r.group);
      } else {
        keptResources.push(r);
      }
    }
    this.resources = keptResources;

    // Expand world tiers up to saved tier cleanly
    while (this.worldTier < data.worldTier && this.worldTier < WORLD_TIERS.length) {
      this.worldTier += 1;
      this.spawnTierResources(this.worldTier);
    }
    const tierCfg = WORLD_TIERS[Math.min(this.worldTier - 1, WORLD_TIERS.length - 1)];
    this.frontierRingRadius = tierCfg.radius;
    this.targetFrontierRadius = tierCfg.radius;
    this.frontierRingMesh.scale.setScalar(this.frontierRingRadius);

    const monolith = this.landmarks.find((l) => l.kind === 'frontier_stone');
    if (monolith) {
      const mz = this.worldTier < WORLD_TIERS.length ? -(tierCfg.radius - 6.0) : -(WORLD_TIERS[1].radius - 6.0);
      const my = getTerrainHeight(0, mz);
      monolith.x = 0;
      monolith.y = my;
      monolith.z = mz;
      monolith.group.position.set(0, my, mz);
    }

    // Restore inventory, equipment, upgrades & stats
    this.inventory = {
      wood: data.inventory.wood ?? 3,
      stone: data.inventory.stone ?? 2,
      iron: data.inventory.iron ?? 0,
      crystal: data.inventory.crystal ?? 0,
      leather: data.inventory.leather ?? 0,
      fang: data.inventory.fang ?? 0,
      essence: data.inventory.essence ?? 0,
      potion: data.inventory.potion ?? 1,
      apple: data.inventory.apple ?? 2,
      berry: data.inventory.berry ?? 2,
      mushroom: data.inventory.mushroom ?? 0,
      honey: data.inventory.honey ?? 0,
      coconut: data.inventory.coconut ?? 0,
      cactus_fruit: data.inventory.cactus_fruit ?? 0,
      carrot: data.inventory.carrot ?? 0,
      meat: data.inventory.meat ?? 0,
    };
    this.upgrades = {
      toolLevel: data.upgrades?.toolLevel ?? 1,
      bootsLevel: data.upgrades?.bootsLevel ?? 1,
      armorLevel: data.upgrades?.armorLevel ?? 1,
    };
    const restoredClass = getClassSpec(data.playerClass || 'warrior');
    this.playerClass = restoredClass.id;
    this.ownedWeapons =
      Array.isArray(data.ownedWeapons) && data.ownedWeapons.length > 0
        ? [...data.ownedWeapons]
        : [restoredClass.starterWeapon];
    this.equippedWeapon = this.ownedWeapons.includes(data.equippedWeapon)
      ? data.equippedWeapon
      : this.ownedWeapons[0];

    this.ownedArmors =
      Array.isArray(data.ownedArmors) && data.ownedArmors.length > 0
        ? [...data.ownedArmors]
        : [restoredClass.starterArmor];
    this.equippedArmor = this.ownedArmors.includes(data.equippedArmor)
      ? data.equippedArmor
      : restoredClass.starterArmor;

    this.gameMode = data.gameMode === 'creative' ? 'creative' : 'survival';
    if (data.worldId) this.currentWorldId = data.worldId;
    if (data.worldName) this.currentWorldName = data.worldName;
    if (typeof data.isMultiplayer === 'boolean') this.worldIsMultiplayer = data.isMultiplayer;
    if (data.roomCode) this.worldRoomCode = data.roomCode;

    this.autoEquipTool = data.autoEquipTool ?? true;
    if (Array.isArray(data.hotbarSlots) && data.hotbarSlots.length >= 6) {
      const restoredSlots = [...data.hotbarSlots];
      if (this.gameMode === 'creative') {
        const defaults = getCreativeDefaultHotbarForClass(this.playerClass);
        for (const item of defaults) {
          if (restoredSlots.length >= 9) break;
          if (!restoredSlots.includes(item)) restoredSlots.push(item);
        }
        this.hotbarSlots = restoredSlots.slice(0, 9);
      } else {
        if (!restoredSlots.includes('action:food')) {
          restoredSlots.splice(Math.min(5, restoredSlots.length), 0, 'action:food');
        }
        this.hotbarSlots = restoredSlots.slice(0, 7);
      }
    }

    this.catRig.setClass(this.playerClass);
    this.catRig.setEquippedWeapon(this.equippedWeapon);
    this.catRig.setEquippedArmor(this.equippedArmor);
    this.recalcPlayerStats(false);

    // Restore player transform & vitals
    this.playerX = data.player.x ?? 0;
    this.playerZ = data.player.z ?? 6.2;
    this.playerY = getTerrainHeight(this.playerX, this.playerZ);
    this.playerYaw = data.player.yaw ?? Math.PI;
    this.velX = 0;
    this.velY = 0;
    this.velZ = 0;
    this.level = data.player.level ?? 1;
    this.exp = data.player.exp ?? 0;
    this.nextExp = data.player.nextExp ?? 40;
    this.hp = THREE.MathUtils.clamp(data.player.hp ?? this.maxHp, 10, this.maxHp);
    this.stamina = THREE.MathUtils.clamp(data.player.stamina ?? this.maxStamina, 0, this.maxStamina);
    this.hunger = THREE.MathUtils.clamp(data.player.hunger ?? this.maxHunger, 0, this.maxHunger);
    this.selectedFood = data.player.selectedFood ?? 'apple';
    this.catRig.root.position.set(this.playerX, this.playerY, this.playerZ);
    this.catRig.root.rotation.y = this.playerYaw;

    // Restore stats & quests
    if (data.stats) {
      this.harvestedTotal = data.stats.harvestedTotal ?? 0;
      this.plantedSaplings = data.stats.plantedSaplings ?? 0;
      this.woodGathered = data.stats.woodGathered ?? 0;
      this.stoneGathered = data.stats.stoneGathered ?? 0;
      this.ironGathered = data.stats.ironGathered ?? 0;
      this.leatherGathered = data.stats.leatherGathered ?? 0;
      this.monstersDefeated = data.stats.monstersDefeated ?? 0;
      this.bossesDefeated = data.stats.bossesDefeated ?? 0;
      this.trialTowerHighestCleared = data.stats.trialTowerMaxFloor ?? 0;
      this.observedNightWildlife = !!data.stats.observedNightWildlife;
    }
    if (data.skillMastery) {
      this.skillMasteryPoints = Math.max(0, data.skillMastery.points ?? 1);
      for (const spec of WARRIOR_SKILLS_CATALOG) {
        const savedRank = data.skillMastery.ranks?.[spec.id];
        this.skillRanks[spec.id] =
          typeof savedRank === 'number' && Number.isFinite(savedRank)
            ? THREE.MathUtils.clamp(Math.round(savedRank), 1, spec.maxRank)
            : 1;
      }
    }
    if (data.proficiencies) {
      for (const spec of PROFICIENCY_CATALOG) {
        const saved = data.proficiencies[spec.id];
        if (saved && typeof saved.level === 'number' && saved.level >= 1) {
          this.proficiencies[spec.id] = {
            level: Math.max(1, Math.round(saved.level)),
            exp: Math.max(0, Math.round(saved.exp ?? 0)),
            nextExp: Math.max(60, Math.round(saved.nextExp ?? 60)),
          };
        }
      }
      this.recalcPlayerStats(false);
    }
    this.claimedQuests = new Set(data.claimedQuests || []);
    this.notifiedQuests = new Set(data.claimedQuests || []);
    this.ensureDailyQuestDate();
    if (data.dailyQuests && data.dailyQuests.dateKey === this.dailyQuestState.dateKey) {
      for (const spec of DAILY_QUESTS_CATALOG) {
        const savedVal = data.dailyQuests.progress?.[spec.id] ?? 0;
        const currVal = this.dailyQuestState.progress[spec.id] ?? 0;
        if (savedVal > currVal) {
          this.dailyQuestState.progress[spec.id] = savedVal;
        }
      }
      const mergedClaimed = new Set<DailyQuestId>([
        ...this.dailyQuestState.claimed,
        ...(data.dailyQuests.claimed || []),
      ]);
      this.dailyQuestState.claimed = Array.from(mergedClaimed);
      this.dailyQuestState.allClearClaimed =
        this.dailyQuestState.allClearClaimed || Boolean(data.dailyQuests.allClearClaimed);
      saveDailyQuestState(this.dailyQuestState);
    }

    // Restore environment
    if (data.environment && this.environment) {
      this.environment.setTimeOfDay(data.environment.timeOfDay ?? 9.5);
      if (this.environment.timePaused !== !!data.environment.timePaused) {
        this.environment.toggleTimePaused();
      }
      this.environment.setWeather(data.environment.weather ?? 'clear', true);
      if (this.environment.autoWeather !== !!data.environment.autoWeather) {
        this.environment.toggleAutoWeather();
      }
    }

    // Clear existing claimed land plots & restore saved plots
    for (const p of this.claimedPlots) this.scene.remove(p.group);
    this.claimedPlots = [];
    this.suppressedResourceIds = new Set(data.suppressedResourceIds || []);

    let maxPlotNum = 1;
    for (const p of data.claimedPlots || []) {
      const pm = p.id.match(/(\d+)$/);
      if (pm) maxPlotNum = Math.max(maxPlotNum, parseInt(pm[1], 10) + 1);
      const plot = createLandPlotVisual(p.id, p.x, p.z, p.radius || 6.5);
      this.claimedPlots.push(plot);
      this.scene.add(plot.group);
    }
    this.plotCounter = Math.max(this.plotCounter, maxPlotNum);

    // Restore placed modular housing tiles (per-piece independent records)
    let maxHouseNum = 1;
    for (const h of data.housing || []) {
      if (!isValidSavedTile(h)) continue;
      const m = h.id.match(/(\d+)$/);
      if (m) maxHouseNum = Math.max(maxHouseNum, parseInt(m[1], 10) + 1);
      const savedColor: HousingColorId =
        h.color && VALID_HOUSING_COLORS.includes(h.color) ? h.color : 'natural';
      const built = this.housingLib.createPlacedTile(
        h.id,
        h.kind,
        h.material,
        savedColor,
        h.gx,
        h.gz,
        h.level,
        h.edge ?? null,
        h.rotationStep,
        h.baseY,
        !!h.isDoorOpen,
        {},
        {
          customRotationY: typeof h.rotationY === 'number' ? h.rotationY : undefined,
          gridSnapped: h.gridSnapped ?? true,
          freeX: h.freeX,
          freeZ: h.freeZ,
          heightOffset: h.heightOffset ?? 0,
          durability: typeof h.durability === 'number' ? h.durability : undefined,
          ownerId: h.ownerId,
        },
      );
      this.syncSingleTileLighting(built);
      this.placedHouses.push(built);
      this.scene.add(built.group);
    }
    this.housingCounter = Math.max(this.housingCounter, maxHouseNum);
    this.refreshAllSeamlessHousingNeighbors();

    // Suppress any natural resources covered by restored housing/plots so they never regrow
    for (const r of this.resources) {
      if (this.suppressedResourceIds.has(r.id)) {
        r.isDepleted = true;
        r.suppressedByHousing = true;
        r.activeVisual.visible = false;
        if (r.stumpVisual) r.stumpVisual.visible = false;
        if (r.saplingVisual) r.saplingVisual.visible = false;
      }
    }

    // Restore lanterns
    for (const l of data.lanterns || []) {
      const lantern = this.assets.createLanternPost(l.x, l.z);
      lantern.group.rotation.y = l.rotationY ?? 0;
      this.scene.add(lantern.group);
      this.lanterns.push({ x: l.x, z: l.z, ...lantern });
    }

    // Restore planted saplings
    for (const s of data.saplings || []) {
      const id = `sapling_${this.nodeCounter++}`;
      const node = this.assets.createTreeNode(id, s.kind, s.x, s.z, s.tier, s.scale, s.isDepleted);
      if (s.isDepleted) {
        node.regrowTimer = Math.max(1, s.regrowTimer);
      }
      this.resources.push(node);
      this.scene.add(node.group);
    }

    this.lastSavedAt = data.savedAt;
    this.saveSummary = {
      savedAt: data.savedAt,
      worldTier: this.worldTier,
      level: this.level,
      housingCount: this.placedHouses.length,
      playerClass: this.playerClass,
    };
  }

  public loadSavedGame(silent = false): boolean {
    const data = loadGameFromStorage();
    if (!data) {
      if (!silent) {
        this.sound.playUiError();
        this.showBanner('저장된 월드 데이터가 없습니다');
      }
      return false;
    }
    this.applySaveData(data);
    if (!silent) {
      this.sound.unlock();
      this.sound.playCollectChime();
      this.showBanner(`저장 데이터 불러오기 완료 (건축 타일 ${this.placedHouses.length}개 복원)`);
    }
    this.emitHudSnapshot();
    return true;
  }

  public resetWorldAndClearSave(): void {
    clearSavedGame();
    this.exitHousingMode();

    for (const h of this.placedHouses) this.scene.remove(h.group);
    this.placedHouses = [];
    for (const p of this.claimedPlots) this.scene.remove(p.group);
    this.claimedPlots = [];
    this.suppressedResourceIds.clear();
    for (const l of this.lanterns) this.scene.remove(l.group);
    this.lanterns = [];
    for (const r of this.resources) this.scene.remove(r.group);
    this.resources = [];
    for (const m of this.monsters) this.scene.remove(m.group);
    this.monsters = [];

    this.worldTier = 1;
    this.frontierRingRadius = WORLD_TIERS[0].radius;
    this.targetFrontierRadius = WORLD_TIERS[0].radius;
    this.frontierRingMesh.scale.setScalar(this.frontierRingRadius);
    const monolith = this.landmarks.find((l) => l.kind === 'frontier_stone');
    if (monolith) {
      const my = getTerrainHeight(0, -31.5);
      monolith.x = 0;
      monolith.y = my;
      monolith.z = -31.5;
      monolith.group.position.set(0, my, -31.5);
    }

    this.inventory = {
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
    };
    this.hunger = this.maxHunger;
    this.selectedFood = 'apple';
    this.starvationTickTimer = 0;
    const clsReset = getClassSpec(this.playerClass);
    this.upgrades = { toolLevel: 1, bootsLevel: 1, armorLevel: 1 };
    this.ownedWeapons = [clsReset.starterWeapon];
    this.equippedWeapon = clsReset.starterWeapon;
    this.ownedArmors = [clsReset.starterArmor];
    this.equippedArmor = clsReset.starterArmor;
    this.hotbarSlots = getDefaultHotbarForClass(clsReset.id);
    this.catRig.setClass(clsReset.id);
    this.catRig.setEquippedWeapon(this.equippedWeapon);
    this.catRig.setEquippedArmor(this.equippedArmor);
    this.recalcPlayerStats(true);

    this.level = 1;
    this.exp = 0;
    this.nextExp = 40;
    this.harvestedTotal = 0;
    this.plantedSaplings = 0;
    this.woodGathered = 0;
    this.stoneGathered = 0;
    this.ironGathered = 0;
    this.leatherGathered = 0;
    this.monstersDefeated = 0;
    this.bossesDefeated = 0;
    this.observedNightWildlife = false;
    this.skillMasteryPoints = 1;
    this.skillRanks = { whirlwind: 1, vanguard_dash: 1, earthbreaker: 1, warcry: 1 };
    this.skillCooldowns = { whirlwind: 0, vanguard_dash: 0, earthbreaker: 0, warcry: 0 };
    this.activeSkillAnim = null;
    this.skillAnimTimer = 0;
    this.warcryBuffRemaining = 0;
    this.proficiencies = {
      combat: { level: 1, exp: 0, nextExp: 60 },
      logging: { level: 1, exp: 0, nextExp: 60 },
      mining: { level: 1, exp: 0, nextExp: 60 },
      craft: { level: 1, exp: 0, nextExp: 60 },
    };
    this.recalcPlayerStats(true);
    this.claimedQuests.clear();
    this.notifiedQuests.clear();

    this.playerX = 0;
    this.playerZ = 6.2;
    this.playerY = getTerrainHeight(0, 6.2);
    this.playerYaw = Math.PI;
    this.velX = 0;
    this.velY = 0;
    this.velZ = 0;
    this.catRig.root.position.set(this.playerX, this.playerY, this.playerZ);
    this.catRig.root.rotation.y = this.playerYaw;

    this.spawnTierResources(1);
    this.lastSavedAt = null;
    this.saveSummary = null;
    this.showBanner('저장 데이터를 초기화하고 새로운 월드를 시작했습니다');
    this.emitHudSnapshot();
  }

  public exportSaveJson(): string {
    return JSON.stringify(this.buildSavePayload(), null, 2);
  }

  public importSaveJson(raw: string): boolean {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isValidSaveData(parsed)) {
        this.sound.playUiError();
        this.showBanner('올바르지 않은 저장 파일 형식입니다');
        return false;
      }
      saveGameToStorage(parsed);
      this.applySaveData(parsed);
      this.sound.unlock();
      this.sound.playQuestComplete();
      this.showBanner(`백업 불러오기 완료 (건축 타일 ${this.placedHouses.length}개 복원)`);
      this.emitHudSnapshot();
      return true;
    } catch {
      this.sound.playUiError();
      this.showBanner('저장 파일을 읽는 중 오류가 발생했습니다');
      return false;
    }
  }

  // ---------------- INPUT HANDLING ----------------

  private bindEvents(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    window.addEventListener('resize', this.handleResize);
    document.addEventListener('fullscreenchange', this.handleFullscreenChange);

    const dom = this.renderer?.domElement;
    if (dom) {
      dom.addEventListener('pointerdown', this.handlePointerDown);
      window.addEventListener('pointermove', this.handlePointerMove);
      window.addEventListener('pointerup', this.handlePointerUp);
      window.addEventListener('pointercancel', this.handlePointerUp);
      dom.addEventListener('wheel', this.handleWheel, { passive: false });
      dom.addEventListener('contextmenu', this.handleContextMenu);
    }
  }

  private handleFullscreenChange = () => {
    this.isFullscreen = Boolean(document.fullscreenElement);
    this.emitHudSnapshot();
  };

  public setMobileMoveInput(right: number, forward: number, sprint: boolean): void {
    this.mobileMoveX = THREE.MathUtils.clamp(right, -1, 1);
    this.mobileMoveZ = THREE.MathUtils.clamp(forward, -1, 1);
    this.mobileSprint = sprint;
  }

  public triggerMobileJump(): void {
    if (this.phase !== 'playing') return;
    this.sound.unlock();
    this.jumpBufferTimer = 0.16;
  }

  public triggerMobileAction(): void {
    if (this.phase !== 'playing') return;
    this.sound.unlock();
    if (this.housingMode === 'placing' || this.housingMode === 'moving') {
      this.confirmHousingPlacement();
    } else {
      this.performInteractOrGather();
    }
  }

  private handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  private handleBlur = () => {
    this.heldKeys.clear();
    this.mobileMoveX = 0;
    this.mobileMoveZ = 0;
    this.mobileSprint = false;
    this.isDraggingCamera = false;
    this.activeCamPointerId = null;
    this.activePointers.clear();
    this.pinchLastDist = 0;
  };

  private handleResize = () => {
    if (!this.renderer) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / Math.max(h, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      (e.target instanceof HTMLElement && e.target.isContentEditable)
    ) {
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
      e.preventDefault();
      if (this.phase === 'playing' || this.phase === 'paused') {
        this.saveGame(false);
      }
      return;
    }

    if (e.code === 'F2') {
      e.preventDefault();
      this.toggleFullscreen();
      return;
    }

    if (e.code === 'F5') {
      e.preventDefault();
      if (this.phase === 'playing') {
        this.cycleCameraMode();
      }
      return;
    }

    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }

    if (this.phase === 'title') {
      return;
    }

    if (e.code === 'Escape') {
      if (this.phase === 'playing' && this.housingMode !== 'off') {
        if (this.housingMode === 'moving') {
          this.cancelMovingSelectedHouse();
        } else {
          this.exitHousingMode();
        }
        return;
      }
      this.setPhase(this.phase === 'playing' ? 'paused' : 'playing');
      return;
    }

    if (this.phase !== 'playing') return;

    const alreadyHeld = this.heldKeys.has(e.code);
    this.heldKeys.add(e.code);

    if (!alreadyHeld) {
      this.sound.unlock();
      if (e.code === 'KeyH') {
        this.toggleHousingMode();
      } else if (e.code === 'KeyK') {
        this.callbacks.onToggleMastery?.();
      } else if (e.code === 'KeyR') {
        if (this.housingMode !== 'off') {
          this.rotateHousingPreview(e.shiftKey ? -1 : 1);
        } else {
          this.castWarriorSkill('earthbreaker');
        }
      } else if (e.code === 'KeyG' && this.housingMode !== 'off') {
        this.toggleGridSnap();
      } else if (e.code === 'KeyV' && this.housingMode !== 'off') {
        this.toggleFreeRotate();
      } else if (e.code === 'KeyC' && this.housingMode === 'edit' && this.selectedHouseId) {
        this.duplicateSelectedHouse();
      } else if (e.code === 'BracketLeft' && this.housingMode !== 'off') {
        this.adjustHousingHeight(-0.25);
      } else if (e.code === 'BracketRight' && this.housingMode !== 'off') {
        this.adjustHousingHeight(0.25);
      } else if ((e.code === 'Delete' || e.code === 'Backspace') && this.housingMode === 'edit' && this.selectedHouseId) {
        this.demolishSelectedHouse();
      } else if (e.code === 'Enter' && (this.housingMode === 'placing' || this.housingMode === 'moving')) {
        this.confirmHousingPlacement();
      } else if (e.code === 'Space') {
        this.jumpBufferTimer = 0.13;
      } else if (e.code === 'KeyF') {
        if (this.housingMode === 'placing' || this.housingMode === 'moving') {
          this.confirmHousingPlacement();
        } else {
          this.performInteractOrGather();
        }
      } else if (e.code === 'KeyQ' && this.housingMode === 'off') {
        this.castWarriorSkill('whirlwind');
      } else if (e.code === 'KeyE') {
        if (this.housingMode === 'placing' || this.housingMode === 'moving') {
          this.confirmHousingPlacement();
        } else if (this.housingMode === 'off') {
          this.castWarriorSkill('vanguard_dash');
        }
      } else if (e.code === 'KeyT' && this.housingMode === 'off') {
        this.castWarriorSkill('warcry');
      } else if (e.code === 'Tab') {
        e.preventDefault();
        this.cycleEquippedWeapon();
      } else if (e.code === 'KeyI') {
        this.callbacks.onOpenWorkshop('inventory');
      } else if (e.code === 'KeyJ') {
        this.callbacks.onToggleQuestLog?.();
      } else if (e.code === 'KeyB') {
        this.callbacks.onToggleEmoteWheel?.();
      } else if (e.code === 'Digit1') {
        this.activateHotbarSlot(0);
      } else if (e.code === 'Digit2') {
        this.activateHotbarSlot(1);
      } else if (e.code === 'Digit3') {
        this.activateHotbarSlot(2);
      } else if (e.code === 'Digit4') {
        this.activateHotbarSlot(3);
      } else if (e.code === 'Digit5') {
        this.activateHotbarSlot(4);
      } else if (e.code === 'Digit6') {
        this.activateHotbarSlot(5);
      } else if (e.code === 'Digit7') {
        this.activateHotbarSlot(6);
      } else if (e.code === 'Digit8') {
        this.activateHotbarSlot(7);
      } else if (e.code === 'Digit9') {
        this.activateHotbarSlot(8);
      }
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.heldKeys.delete(e.code);
  };

  private handlePointerDown = (e: PointerEvent) => {
    if (this.phase !== 'playing') return;
    this.sound.unlock();
    if (e.button === 2 && this.housingMode !== 'off') {
      if (this.housingMode === 'moving') {
        this.cancelMovingSelectedHouse();
      } else {
        this.exitHousingMode();
      }
      return;
    }

    this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.activePointers.size === 2) {
      const pts = Array.from(this.activePointers.values());
      this.pinchLastDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      this.isDraggingCamera = false;
      this.activeCamPointerId = null;
      return;
    }

    if (this.activeCamPointerId === null) {
      this.activeCamPointerId = e.pointerId;
      this.isDraggingCamera = true;
      this.dragMovedDist = 0;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
    }
  };

  private handlePointerMove = (e: PointerEvent) => {
    if (this.phase !== 'playing') return;

    if (this.activePointers.has(e.pointerId)) {
      this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Two-finger pinch-to-zoom on touch screens
    if (this.activePointers.size === 2) {
      const pts = Array.from(this.activePointers.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (this.pinchLastDist > 0) {
        const delta = this.pinchLastDist - dist;
        this.targetCameraDist = THREE.MathUtils.clamp(this.targetCameraDist + delta * 0.024, 3.8, 17.5);
      }
      this.pinchLastDist = dist;
      return;
    }

    // Continuously track terrain aim for translucent housing placement / relocation preview
    if (this.renderer && (this.housingMode === 'placing' || this.housingMode === 'moving')) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        this.lastHoverNdcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.lastHoverNdcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        this.hasHoveredTerrain = true;
        this.updateGhostTransformAndValidity();
      }
    }

    if (!this.isDraggingCamera || this.activeCamPointerId !== e.pointerId) return;
    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    this.dragMovedDist += Math.hypot(dx, dy);
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;

    const sensMult = this.settings.cameraSensitivity || 1.0;
    const sens = (e.pointerType === 'touch' ? 0.0072 : 0.0058) * sensMult;
    const pitchSens = (e.pointerType === 'touch' ? 0.0055 : 0.0046) * sensMult;
    this.cameraYaw -= dx * sens;
    // Allow negative pitch (-0.95 rad ≈ -54°) so players can smoothly look UP at ceilings & ceiling lights!
    this.cameraPitch = THREE.MathUtils.clamp(this.cameraPitch + dy * pitchSens, -0.95, 1.15);
  };

  private handlePointerUp = (e: PointerEvent) => {
    this.activePointers.delete(e.pointerId);
    if (this.activePointers.size < 2) {
      this.pinchLastDist = 0;
    }
    if (!this.isDraggingCamera || this.activeCamPointerId !== e.pointerId) return;
    this.isDraggingCamera = false;
    this.activeCamPointerId = null;

    const tapLimit = e.pointerType === 'touch' ? 13 : 7;
    if ((e.button === 0 || e.pointerType === 'touch') && this.dragMovedDist < tapLimit && this.phase === 'playing' && this.renderer) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      _rayMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _rayMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(_rayMouse, this.camera);

      // In Housing placing/moving mode: left-click confirms placement!
      if (this.housingMode === 'placing' || this.housingMode === 'moving') {
        this.lastHoverNdcX = _rayMouse.x;
        this.lastHoverNdcY = _rayMouse.y;
        this.hasHoveredTerrain = true;
        this.confirmHousingPlacement();
        return;
      }

      // In Housing edit mode: clicking any placed structure selects it for move/rotate/style/demolish!
      if (this.housingMode === 'edit') {
        const houseMeshes: THREE.Object3D[] = [];
        for (const h of this.placedHouses) {
          houseMeshes.push(...h.hitMeshes);
        }
        const houseHits = this.raycaster.intersectObjects(houseMeshes, false);
        if (houseHits.length > 0) {
          const hid = houseHits[0].object.userData?.housingId as string | undefined;
          if (hid) {
            this.selectHouse(hid);
            return;
          }
        }
        this.selectHouse(null);
        return;
      }

      const candidateMeshes: THREE.Object3D[] = [];
      for (const m of this.monsters) {
        if (!m.isDead && m.group.visible && Math.hypot(m.x - this.playerX, m.z - this.playerZ) <= m.interactRadius + 2.5) {
          candidateMeshes.push(...m.hitMeshes);
        }
      }
      for (const n of this.resources) {
        if (!n.isDepleted && Math.hypot(n.x - this.playerX, n.z - this.playerZ) <= n.interactRadius + 2.2) {
          candidateMeshes.push(...n.hitMeshes);
        }
      }
      for (const h of this.placedHouses) {
        if (h.kind === 'door' && h.group.visible && Math.hypot(h.x - this.playerX, h.z - this.playerZ) <= 4.4) {
          candidateMeshes.push(...h.hitMeshes);
        }
      }
      const hits = this.raycaster.intersectObjects(candidateMeshes, false);
      if (hits.length > 0) {
        const doorHousingId = hits[0].object.userData?.housingId as string | undefined;
        if (doorHousingId) {
          const targetDoor = this.placedHouses.find((h) => h.id === doorHousingId && h.kind === 'door');
          if (targetDoor && Math.hypot(targetDoor.x - this.playerX, targetDoor.z - this.playerZ) <= 4.4) {
            this.toggleDoorTile(targetDoor.id);
            return;
          }
        }
        const monsterId = hits[0].object.userData?.monsterId;
        if (monsterId) {
          const targetMonster = this.monsters.find((m) => m.id === monsterId);
          if (
            targetMonster &&
            !targetMonster.isDead &&
            targetMonster.group.visible &&
            Math.hypot(targetMonster.x - this.playerX, targetMonster.z - this.playerZ) <= targetMonster.interactRadius + 1.1
          ) {
            this.hitMonster(targetMonster);
            return;
          }
        }
        const nodeId = hits[0].object.userData?.nodeId;
        const target = this.resources.find((r) => r.id === nodeId);
        if (target && Math.hypot(target.x - this.playerX, target.z - this.playerZ) <= target.interactRadius + 0.8) {
          this.hitResourceNode(target);
          return;
        }
      }

      this.performInteractOrGather();
    }
  };

  private handleWheel = (e: WheelEvent) => {
    if (this.phase !== 'playing') return;
    e.preventDefault();
    if (e.shiftKey && (this.housingMode === 'placing' || this.housingMode === 'moving')) {
      this.rotateHousingPreview(e.deltaY > 0 ? 1 : -1);
      return;
    }
    this.targetCameraDist = THREE.MathUtils.clamp(this.targetCameraDist + e.deltaY * 0.006, 3.6, 15.5);
  };

  private handleContextLost = (e: Event) => {
    e.preventDefault();
    this.running = false;
  };

  private handleContextRestored = () => {
    if (!this.disposed && !this.running) {
      this.startLoop();
    }
  };

  // ---------------- INTERACTION & GATHERING LOGIC ----------------

  private findNearestInteractable():
    | { type: 'monster'; monster: WorldMonster }
    | { type: 'resource'; node: WorldResourceNode }
    | { type: 'landmark'; landmark: WorldLandmark }
    | { type: 'housing'; house: PlacedHousingTile }
    | null {
    let bestDist = Infinity;
    let best:
      | { type: 'monster'; monster: WorldMonster }
      | { type: 'resource'; node: WorldResourceNode }
      | { type: 'landmark'; landmark: WorldLandmark }
      | { type: 'housing'; house: PlacedHousingTile }
      | null = null;

    const clsSpec = getClassSpec(this.playerClass);
    const activeWepSpec = this.getEquippedSpec();
    const combatRange = Math.max(activeWepSpec.attackRange ?? clsSpec.attackRange, 3.4);

    for (const m of this.monsters) {
      if (m.isDead || !m.group.visible) continue;
      const d = Math.hypot(m.x - this.playerX, m.z - this.playerZ);
      const effectiveRadius = Math.max(m.interactRadius, combatRange + m.radius * 0.45);
      if (d <= effectiveRadius && d < bestDist) {
        bestDist = d;
        best = { type: 'monster', monster: m };
      }
    }

    for (const lm of this.landmarks) {
      const d = Math.hypot(lm.x - this.playerX, lm.z - this.playerZ);
      if (d <= lm.interactRadius && d < bestDist) {
        bestDist = d;
        best = { type: 'landmark', landmark: lm };
      }
    }

    for (const n of this.resources) {
      const d = Math.hypot(n.x - this.playerX, n.z - this.playerZ);
      if (d <= n.interactRadius && d < bestDist) {
        bestDist = d;
        best = { type: 'resource', node: n };
      }
    }

    // Prioritize nearby interactive doors so pressing F opens/closes them seamlessly
    for (const h of this.placedHouses) {
      if (!h.group.visible || h.kind !== 'door') continue;
      const d = Math.hypot(h.x - this.playerX, h.z - this.playerZ);
      const dy = Math.abs(h.y - this.playerY);
      if (d <= 2.65 && dy <= 2.4 && d < bestDist) {
        bestDist = d;
        best = { type: 'housing', house: h };
      }
    }

    // Only prompt generic housing tile editing via F if no resource/monster/landmark/door is closer
    if (!best) {
      for (const h of this.placedHouses) {
        if (!h.group.visible) continue;
        const d = Math.hypot(h.x - this.playerX, h.z - this.playerZ);
        const dy = Math.abs(h.y - this.playerY);
        if (d <= 2.9 && dy <= 2.6 && d < bestDist) {
          bestDist = d;
          best = { type: 'housing', house: h };
        }
      }
    }

    return best;
  }

  private performInteractOrGather(): void {
    this.cancelEmote(true);
    const nearest = this.findNearestInteractable();
    if (!nearest) {
      if (this.gatherCooldown <= 0) {
        const spec = this.getEquippedSpec();
        this.swingTimer = 1.0;
        this.gatherCooldown = 0.36 / spec.swingSpeedMult;
        this.sound.playWoodChop(false);
      }
      return;
    }

    if (nearest.type === 'housing') {
      if (nearest.house.kind === 'door') {
        this.toggleDoorTile(nearest.house.id);
        return;
      }
      if (nearest.house.durability < nearest.house.maxDurability) {
        this.repairHousingTile(nearest.house.id);
        return;
      }
      this.selectHouse(nearest.house.id);
      this.showBanner(`[${nearest.house.label}] 선택됨 · 색상·자재 변경, 형태 전환, 이동, 수리, 철거가 가능합니다`);
      return;
    }

    if (nearest.type === 'monster') {
      this.hitMonster(nearest.monster);
      return;
    }

    if (nearest.type === 'landmark') {
      const lm = nearest.landmark;
      if (lm.kind === 'workbench') {
        this.callbacks.onOpenWorkshop('forge');
      } else if (lm.kind === 'frontier_stone') {
        if (this.worldTier >= WORLD_TIERS.length) {
          this.showBanner('모든 월드 구역이 개방되었습니다! 자유롭게 채집하고 개척해보세요');
        } else {
          const next = WORLD_TIERS[this.worldTier];
          const canAfford =
            this.inventory.wood >= next.unlockCost.wood &&
            this.inventory.stone >= next.unlockCost.stone &&
            this.inventory.iron >= next.unlockCost.iron;
          if (canAfford) {
            this.expandWorld();
          } else {
            this.callbacks.onOpenWorkshop('expand');
          }
        }
      } else if (lm.kind === 'signpost') {
        this.sound.playCollectChime();
        this.showBanner('이정표: 몬스터를 사냥해 가죽·송곳니·정수를 얻고, 북쪽 시련의 탑(1~10층)에 도전해보세요!');
      } else if (lm.kind === 'trial_tower') {
        this.sound.playCollectChime();
        this.callbacks.onOpenTrialTower?.();
      }
      return;
    }

    const node = nearest.node;
    if (node.isDepleted) {
      const sec = Math.ceil(node.regrowTimer);
      this.spawnFeedback(
        node.isSapling ? `묘목 성장 중 (${sec}초 남음)` : `자원 재생 중 (${sec}초 남음)`,
        '#cbd5e1',
        node.x,
        node.y + 1.4,
        node.z,
      );
      return;
    }

    this.hitResourceNode(node);
  }

  // ---------------- CLASS SKILL MASTERY & PROFICIENCY SYSTEM ----------------

  private spawnProjectileTrail(
    fromX: number,
    fromY: number,
    fromZ: number,
    toX: number,
    toY: number,
    toZ: number,
    colorHex: number,
  ): void {
    const steps = 6;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const px = THREE.MathUtils.lerp(fromX, toX, t);
      const py = THREE.MathUtils.lerp(fromY, toY, t) + Math.sin(t * Math.PI) * 0.35;
      const pz = THREE.MathUtils.lerp(fromZ, toZ, t);
      this.particles.spawnBurst(px, py, pz, colorHex, i === steps ? 10 : 3, i === steps ? 4.2 : 1.6);
    }
    this.particles.spawnRing(toX, toY - 0.5, toZ, colorHex, 1.55);
  }

  private getSkillComputedStats(skillId: WarriorSkillId) {
    const catalog = getClassSkillsCatalog(this.playerClass);
    const spec = catalog.find((s) => s.id === skillId) || catalog[0];
    const rank = THREE.MathUtils.clamp(this.skillRanks[skillId] || 1, 1, spec.maxRank);
    const rDelta = rank - 1;
    const cooldownTotal = Math.max(2.2, Number((spec.baseCooldown - rDelta * spec.cooldownPerRank).toFixed(2)));
    const damageMult =
      spec.baseDamageMult > 0
        ? Number((spec.baseDamageMult + rDelta * spec.damageMultPerRank).toFixed(2))
        : 0;
    const radius = Number((spec.baseRadius + rDelta * spec.radiusPerRank).toFixed(2));
    const buffDuration = skillId === 'warcry' ? Number((7.5 + rDelta * 1.2).toFixed(1)) : 0;
    const healPct =
      skillId === 'warcry'
        ? (this.playerClass === 'healer' ? 40 : 22) + rDelta * 6
        : this.playerClass === 'healer' && (skillId === 'vanguard_dash' || skillId === 'earthbreaker')
          ? 24 + rDelta * 5
          : 0;
    const atkBonusPct =
      skillId === 'warcry'
        ? (this.playerClass === 'archer' || this.playerClass === 'rogue' ? 32 : 26) + rDelta * 6
        : 0;
    const defBonusPct =
      skillId === 'warcry'
        ? (this.playerClass === 'mage' || this.playerClass === 'healer' ? 30 : 22) + rDelta * 5
        : 0;
    return {
      spec,
      rank,
      cooldownTotal,
      damageMult,
      radius,
      buffDuration,
      healPct,
      atkBonusPct,
      defBonusPct,
    };
  }

  private getCombatAtkMultiplier(): number {
    const clsMult = getClassSpec(this.playerClass).baseAttackMult;
    const profMult = 1 + Math.max(0, this.proficiencies.combat.level - 1) * 0.06;
    const warcryMult =
      this.warcryBuffRemaining > 0 ? 1 + this.getSkillComputedStats('warcry').atkBonusPct / 100 : 1;
    return clsMult * profMult * warcryMult;
  }

  private getCombatCritChance(): number {
    const clsCrit = getClassSpec(this.playerClass).baseCritChance;
    const wepCrit = this.getEquippedSpec().critBonus ?? 0;
    const buffCrit = this.warcryBuffRemaining > 0 && (this.playerClass === 'archer' || this.playerClass === 'rogue') ? 0.18 : 0;
    return Math.min(0.75, clsCrit + wepCrit + buffCrit + Math.max(0, this.proficiencies.combat.level - 1) * 0.025);
  }

  private getPlayerDamageReduction(): number {
    const armorSpec = this.getEquippedArmorSpec();
    const warcryDef =
      this.warcryBuffRemaining > 0 ? this.getSkillComputedStats('warcry').defBonusPct / 100 : 0;
    return Math.min(0.78, armorSpec.damageReduction + warcryDef);
  }

  private gainProficiencyExp(id: ProficiencyId, amount: number): void {
    const state = this.proficiencies[id];
    const spec = PROFICIENCY_CATALOG.find((p) => p.id === id);
    if (!state || !spec || amount <= 0) return;

    state.exp += amount;
    let leveledUp = false;
    let earnedPoints = 0;

    while (state.exp >= state.nextExp) {
      state.exp -= state.nextExp;
      state.level += 1;
      state.nextExp = Math.round(state.nextExp * 1.38);
      leveledUp = true;
      if (state.level % 2 === 0) {
        this.skillMasteryPoints += 1;
        earnedPoints += 1;
      }
    }

    if (leveledUp) {
      if (id === 'craft') {
        this.recalcPlayerStats(false);
      }
      const rankTitle = getProficiencyRankTitle(state.level);
      this.sound.playMasteryUp();
      this.particles.spawnRing(this.playerX, this.playerY, this.playerZ, 0x38bdf8, 2.8);
      const ptSuffix = earnedPoints > 0 ? ` · 스킬 포인트 +${earnedPoints}` : '';
      this.spawnFeedback(
        `${spec.name} Lv.${state.level} (${rankTitle})${ptSuffix}`,
        spec.accentHex,
        this.playerX,
        this.playerY + 2.45,
        this.playerZ,
      );
      this.showBanner(`${spec.name} 상승! Lv.${state.level} [${rankTitle}]${ptSuffix}`);
    }
  }

  public upgradeWarriorSkill(skillId: WarriorSkillId): boolean {
    const stats = this.getSkillComputedStats(skillId);
    if (this.skillMasteryPoints <= 0) {
      this.sound.playUiError();
      this.spawnFeedback('스킬 마스터리 포인트가 부족합니다', '#f87171', this.playerX, this.playerY + 2.1, this.playerZ);
      return false;
    }
    if (stats.rank >= stats.spec.maxRank) {
      this.sound.playUiError();
      return false;
    }

    this.sound.unlock();
    this.skillMasteryPoints -= 1;
    this.skillRanks[skillId] = stats.rank + 1;
    this.sound.playMasteryUp();
    this.particles.spawnBurst(this.playerX, this.playerY + 1.25, this.playerZ, 0xfde047, 22, 4.8);
    this.particles.spawnRing(this.playerX, this.playerY, this.playerZ, 0xf59e0b, 3.0);
    const cls = getClassSpec(this.playerClass);
    this.spawnFeedback(
      `${stats.spec.name} 마스터리 Lv.${stats.rank + 1} 강화!`,
      '#fde047',
      this.playerX,
      this.playerY + 2.35,
      this.playerZ,
    );
    this.showBanner(`${cls.name} 스킬 마스터리 강화: [${stats.spec.name} Lv.${stats.rank + 1}]`);
    this.saveGame(true);
    this.emitHudSnapshot();
    return true;
  }

  private interruptBossTelegraph(m: WorldMonster): void {
    if (m.isBoss && m.telegraphTimer > 0) {
      m.telegraphTimer = 0;
      m.telegraphLabel = null;
      if (m.telegraphGroup) m.telegraphGroup.visible = false;
      m.attackCooldown = 2.4;
      m.bossSpecialCooldown = 4.6;
      this.particles.spawnRing(m.x, m.y + 0.2, m.z, 0x38bdf8, 3.6);
      this.spawnFeedback('시전 차단! (보스 경직)', '#67e8f9', m.x, m.y + 2.8, m.z);
    }
  }

  public castWarriorSkill(skillId: WarriorSkillId): boolean {
    if (this.phase !== 'playing' || this.housingMode !== 'off') return false;
    this.sound.unlock();

    const stats = this.getSkillComputedStats(skillId);
    const cd = this.skillCooldowns[skillId] || 0;
    if (cd > 0.05) {
      this.sound.playUiError();
      this.spawnFeedback(
        `${stats.spec.shortName} 재사용 대기 (${cd.toFixed(1)}초)`,
        '#94a3b8',
        this.playerX,
        this.playerY + 2.0,
        this.playerZ,
      );
      return false;
    }

    if (this.gameMode !== 'creative' && this.stamina < stats.spec.staminaCost) {
      this.sound.playUiError();
      this.spawnFeedback('기력이 부족합니다', '#f87171', this.playerX, this.playerY + 2.0, this.playerZ);
      return false;
    }

    this.cancelEmote(true);
    if (this.gameMode !== 'creative') {
      this.stamina = Math.max(0, this.stamina - stats.spec.staminaCost);
    }
    this.skillCooldowns[skillId] = stats.cooldownTotal;
    this.activeSkillAnim = skillId;
    this.skillAnimDuration =
      skillId === 'whirlwind'
        ? 0.52
        : skillId === 'vanguard_dash'
          ? 0.36
          : skillId === 'earthbreaker'
            ? 0.56
            : 0.5;
    this.skillAnimTimer = this.skillAnimDuration;

    if (this.autoEquipTool && this.ownedWeapons.length > 1) {
      const combatWeapon = this.selectBestWeaponForContext('monster');
      if (combatWeapon !== this.equippedWeapon) {
        this.equipWeapon(combatWeapon, true, false);
      }
      this.manualEquipHoldTimer = 0;
    }

    const baseWeaponDmg = this.getEquippedSpec().monsterDamage;
    const rawSkillDmg = Math.round(baseWeaponDmg * stats.damageMult);
    const accentInt = parseInt(stats.spec.accentHex.replace('#', ''), 16);
    const cls = this.playerClass;

    // Helper: sorted live enemies within range
    const getEnemiesInRange = (maxRange: number) =>
      this.monsters
        .filter((m) => !m.isDead && m.group.visible && Math.hypot(m.x - this.playerX, m.z - this.playerZ) <= maxRange + m.radius)
        .sort((a, b) => Math.hypot(a.x - this.playerX, a.z - this.playerZ) - Math.hypot(b.x - this.playerX, b.z - this.playerZ));

    if (skillId === 'whirlwind') {
      this.sound.playSkillWhirlwind();
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.14);

      if (cls === 'archer' || cls === 'mage' || cls === 'healer') {
        const targets = getEnemiesInRange(stats.radius).slice(0, cls === 'healer' ? 2 : 3);
        this.particles.spawnRing(this.playerX, this.playerY + 0.35, this.playerZ, accentInt, 2.2);
        let hits = 0;
        for (const m of targets) {
          this.playerYaw = Math.atan2(m.x - this.playerX, m.z - this.playerZ);
          this.spawnProjectileTrail(
            this.playerX,
            this.playerY + 1.05,
            this.playerZ,
            m.x,
            m.y + 0.9,
            m.z,
            accentInt,
          );
          this.damageMonster(m, rawSkillDmg, 5.2, stats.spec.shortName);
          hits++;
          if (cls === 'healer') {
            const splashHeal = Math.round(this.maxHp * 0.08);
            this.hp = Math.min(this.maxHp, this.hp + splashHeal);
          }
        }
        this.gainProficiencyExp('combat', hits > 0 ? 14 + hits * 4 : 8);
        if (hits === 0) {
          const fx = this.playerX + Math.sin(this.playerYaw) * 6.5;
          const fz = this.playerZ + Math.cos(this.playerYaw) * 6.5;
          this.spawnProjectileTrail(this.playerX, this.playerY + 1.05, this.playerZ, fx, this.playerY + 1.0, fz, accentInt);
          this.spawnFeedback(`${stats.spec.name}!`, stats.spec.accentHex, this.playerX, this.playerY + 2.15, this.playerZ);
        }
      } else {
        // Warrior Whirlwind / Rogue Shadow Slash
        this.particles.spawnRing(this.playerX, this.playerY + 0.3, this.playerZ, accentInt, stats.radius * 1.05);
        this.particles.spawnRing(this.playerX, this.playerY + 0.65, this.playerZ, 0xfde047, stats.radius * 0.82);
        this.particles.spawnBurst(this.playerX, this.playerY + 0.9, this.playerZ, accentInt, 24, 5.8);

        let hits = 0;
        for (const m of getEnemiesInRange(stats.radius)) {
          const bonusMult = cls === 'rogue' ? 1.18 : 1.0;
          this.damageMonster(m, Math.round(rawSkillDmg * bonusMult), 6.2, stats.spec.shortName);
          hits++;
        }
        this.gainProficiencyExp('combat', hits > 0 ? 14 + hits * 4 : 8);
        if (hits === 0) {
          this.spawnFeedback(`${stats.spec.name}!`, stats.spec.accentHex, this.playerX, this.playerY + 2.15, this.playerZ);
        }
      }
    } else if (skillId === 'vanguard_dash') {
      this.sound.playSkillDash();
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.16);

      if (cls === 'archer') {
        // Evasive back-vault + shock arrow interrupting boss
        const targets = getEnemiesInRange(stats.radius);
        const primary = targets[0] || null;
        if (primary) {
          this.playerYaw = Math.atan2(primary.x - this.playerX, primary.z - this.playerZ);
        }
        const fwdX = Math.sin(this.playerYaw);
        const fwdZ = Math.cos(this.playerYaw);
        // Leap backward 3.8m
        const backX = this.playerX - fwdX * 3.8;
        const backZ = this.playerZ - fwdZ * 3.8;
        const maxR = this.frontierRingRadius - 1.2;
        const clampedR = Math.hypot(backX, backZ);
        this.playerX = clampedR > maxR ? (backX / clampedR) * maxR : backX;
        this.playerZ = clampedR > maxR ? (backZ / clampedR) * maxR : backZ;
        this.velX = -fwdX * 9.0;
        this.velZ = -fwdZ * 9.0;
        if (this.isGrounded) {
          this.velY = 4.6;
          this.isGrounded = false;
        }
        this.particles.spawnRing(this.playerX, this.playerY + 0.2, this.playerZ, accentInt, 2.2);
        if (primary) {
          this.spawnProjectileTrail(this.playerX, this.playerY + 1.05, this.playerZ, primary.x, primary.y + 0.9, primary.z, accentInt);
          this.interruptBossTelegraph(primary);
          primary.slowTimer = Math.max(primary.slowTimer, 3.0);
          this.damageMonster(primary, rawSkillDmg, 8.8, stats.spec.shortName);
          this.gainProficiencyExp('combat', 18);
        } else {
          this.spawnFeedback(`${stats.spec.name}!`, stats.spec.accentHex, this.playerX, this.playerY + 2.15, this.playerZ);
          this.gainProficiencyExp('combat', 8);
        }
      } else if (cls === 'healer') {
        // Healing Wave: instant strong heal + knockback shockwave + boss interrupt
        const healAmt = Math.round((this.maxHp * stats.healPct) / 100);
        this.hp = Math.min(this.maxHp, this.hp + healAmt);
        this.sound.playHealPotion();
        this.particles.spawnRing(this.playerX, this.playerY + 0.25, this.playerZ, 0x34d399, stats.radius);
        this.particles.spawnBurst(this.playerX, this.playerY + 1.1, this.playerZ, 0x6ee7b7, 26, 5.4);
        let hits = 0;
        for (const m of getEnemiesInRange(stats.radius)) {
          this.interruptBossTelegraph(m);
          this.damageMonster(m, rawSkillDmg, 9.2, stats.spec.shortName);
          hits++;
        }
        this.spawnFeedback(`${stats.spec.name}! HP +${healAmt}`, '#34d399', this.playerX, this.playerY + 2.35, this.playerZ);
        this.gainProficiencyExp('combat', 14 + hits * 4);
      } else if (cls === 'mage') {
        // Frost Nova: freeze & slow nearby enemies + boss interrupt
        this.particles.spawnRing(this.playerX, this.playerY + 0.25, this.playerZ, 0x7dd3fc, stats.radius * 1.1);
        this.particles.spawnBurst(this.playerX, this.playerY + 0.85, this.playerZ, 0xbae6fd, 28, 6.0);
        let hits = 0;
        for (const m of getEnemiesInRange(stats.radius)) {
          this.interruptBossTelegraph(m);
          m.slowTimer = Math.max(m.slowTimer, 4.2);
          this.damageMonster(m, rawSkillDmg, 7.6, stats.spec.shortName);
          hits++;
        }
        this.gainProficiencyExp('combat', hits > 0 ? 15 + hits * 4 : 8);
        if (hits === 0) {
          this.spawnFeedback(`${stats.spec.name}!`, stats.spec.accentHex, this.playerX, this.playerY + 2.15, this.playerZ);
        }
      } else {
        // Warrior Vanguard Dash / Rogue Phantom Step (blink behind target!)
        const searchRange = cls === 'rogue' ? 11.5 : 9.5;
        const targetMonster = getEnemiesInRange(searchRange)[0] || null;
        if (targetMonster) {
          this.playerYaw = Math.atan2(targetMonster.x - this.playerX, targetMonster.z - this.playerZ);
        }
        const fwdX = Math.sin(this.playerYaw);
        const fwdZ = Math.cos(this.playerYaw);
        const targetDist = targetMonster ? Math.hypot(targetMonster.x - this.playerX, targetMonster.z - this.playerZ) : 4.2;
        const dashDist = targetMonster
          ? cls === 'rogue'
            ? Math.min(11.0, targetDist + targetMonster.radius + 1.15)
            : Math.min(4.8, Math.max(1.8, targetDist - targetMonster.radius - 0.85))
          : 4.5;

        this.particles.spawnBurst(this.playerX, this.playerY + 0.8, this.playerZ, accentInt, 16, 4.4);
        const nextX = this.playerX + fwdX * dashDist;
        const nextZ = this.playerZ + fwdZ * dashDist;
        const maxR = this.frontierRingRadius - 1.2;
        const clampedR = Math.hypot(nextX, nextZ);
        this.playerX = clampedR > maxR ? (nextX / clampedR) * maxR : nextX;
        this.playerZ = clampedR > maxR ? (nextZ / clampedR) * maxR : nextZ;
        if (cls === 'rogue' && targetMonster) {
          this.playerYaw = Math.atan2(targetMonster.x - this.playerX, targetMonster.z - this.playerZ);
        } else {
          this.velX = fwdX * 11.5;
          this.velZ = fwdZ * 11.5;
        }

        this.particles.spawnRing(this.playerX, this.playerY + 0.25, this.playerZ, accentInt, stats.radius * 0.95);
        this.particles.spawnBurst(this.playerX, this.playerY + 0.9, this.playerZ, 0xfde047, 22, 5.4);

        let hits = 0;
        for (const m of getEnemiesInRange(stats.radius)) {
          this.interruptBossTelegraph(m);
          this.damageMonster(m, rawSkillDmg, 8.2, stats.spec.shortName);
          hits++;
        }
        this.gainProficiencyExp('combat', hits > 0 ? 15 + hits * 4 : 8);
        if (hits === 0) {
          this.spawnFeedback(`${stats.spec.name}!`, stats.spec.accentHex, this.playerX, this.playerY + 2.15, this.playerZ);
        }
      }
    } else if (skillId === 'earthbreaker') {
      this.sound.playSkillSlam();
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.25);

      if (cls === 'archer' || cls === 'mage') {
        // Ranged targeted AoE (Arrow Rain / Meteor Burst)
        const target = getEnemiesInRange(12.5)[0] || null;
        const cx = target ? target.x : this.playerX + Math.sin(this.playerYaw) * 6.5;
        const cz = target ? target.z : this.playerZ + Math.cos(this.playerYaw) * 6.5;
        const cy = getTerrainHeight(cx, cz);
        if (target) {
          this.playerYaw = Math.atan2(cx - this.playerX, cz - this.playerZ);
        }
        this.spawnProjectileTrail(cx, cy + 7.5, cz, cx, cy + 0.5, cz, accentInt);
        this.particles.spawnRing(cx, cy + 0.18, cz, accentInt, stats.radius * 1.12);
        this.particles.spawnRing(cx, cy + 0.28, cz, 0xf59e0b, stats.radius * 0.72);
        this.particles.spawnBurst(cx, cy + 0.8, cz, accentInt, 34, 7.0);

        let hits = 0;
        for (const m of this.monsters) {
          if (m.isDead || !m.group.visible) continue;
          const d = Math.hypot(m.x - cx, m.z - cz);
          if (d <= stats.radius + m.radius) {
            m.slowTimer = Math.max(m.slowTimer, 3.5);
            this.damageMonster(m, rawSkillDmg, 9.5, stats.spec.shortName);
            hits++;
          }
        }
        this.gainProficiencyExp('combat', hits > 0 ? 18 + hits * 5 : 9);
        if (hits === 0) {
          this.spawnFeedback(`${stats.spec.name}!`, stats.spec.accentHex, cx, cy + 2.15, cz);
        }
      } else {
        // Warrior Earthbreaker / Healer Sanctuary Nova / Rogue Venom Fan
        if (this.isGrounded && cls === 'warrior') {
          this.velY = 4.2;
          this.isGrounded = false;
        }
        this.particles.spawnRing(this.playerX, this.playerY + 0.15, this.playerZ, accentInt, stats.radius * 1.15);
        this.particles.spawnRing(this.playerX, this.playerY + 0.25, this.playerZ, 0xf59e0b, stats.radius * 0.78);
        this.particles.spawnBurst(this.playerX, this.playerY + 0.6, this.playerZ, accentInt, 30, 6.8);

        if (cls === 'healer') {
          const healAmt = Math.round((this.maxHp * stats.healPct) / 100);
          this.hp = Math.min(this.maxHp, this.hp + healAmt);
          this.spawnFeedback(`${stats.spec.name}! HP +${healAmt}`, '#fde047', this.playerX, this.playerY + 2.35, this.playerZ);
        }

        let hits = 0;
        for (const m of getEnemiesInRange(stats.radius)) {
          m.slowTimer = Math.max(m.slowTimer, cls === 'rogue' ? 4.5 : 3.5);
          this.damageMonster(m, rawSkillDmg, 10.2, stats.spec.shortName);
          hits++;
        }
        this.gainProficiencyExp('combat', hits > 0 ? 18 + hits * 5 : 9);
        if (hits === 0 && cls !== 'healer') {
          this.spawnFeedback(`${stats.spec.name}!`, stats.spec.accentHex, this.playerX, this.playerY + 2.15, this.playerZ);
        }
      }
    } else if (skillId === 'warcry') {
      this.sound.playSkillWarcry();
      const healAmt = Math.round((this.maxHp * stats.healPct) / 100);
      this.hp = Math.min(this.maxHp, this.hp + healAmt);
      this.stamina = Math.min(this.maxStamina, this.stamina + (cls === 'archer' || cls === 'rogue' ? 42 : 30));
      this.warcryBuffDuration = stats.buffDuration;
      this.warcryBuffRemaining = stats.buffDuration;

      this.particles.spawnRing(this.playerX, this.playerY + 0.2, this.playerZ, accentInt, stats.radius);
      this.particles.spawnBurst(this.playerX, this.playerY + 1.1, this.playerZ, accentInt, 26, 5.2);
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.12);
      this.spawnFeedback(
        `${stats.spec.name}! HP +${healAmt} · 공 +${stats.atkBonusPct}% · 방 +${stats.defBonusPct}%`,
        stats.spec.accentHex,
        this.playerX,
        this.playerY + 2.35,
        this.playerZ,
      );
      this.gainProficiencyExp('combat', 12);
    }

    this.emitHudSnapshot();
    return true;
  }

  private buildWarriorSkillsSnapshot(): WarriorSkillSnapshot[] {
    return getClassSkillsCatalog(this.playerClass).map((spec) => {
      const s = this.getSkillComputedStats(spec.id);
      return {
        id: spec.id,
        rank: s.rank,
        maxRank: spec.maxRank,
        cooldownRemaining: Number((this.skillCooldowns[spec.id] || 0).toFixed(1)),
        cooldownTotal: s.cooldownTotal,
        staminaCost: spec.staminaCost,
        damageMult: s.damageMult,
        radius: s.radius,
        buffDuration: s.buffDuration,
        healPct: s.healPct,
        atkBonusPct: s.atkBonusPct,
        defBonusPct: s.defBonusPct,
      };
    });
  }

  private buildProficienciesSnapshot(): ProficiencySnapshot[] {
    return PROFICIENCY_CATALOG.map((spec) => {
      const st = this.proficiencies[spec.id];
      const lvlDelta = Math.max(0, st.level - 1);
      let bonusSummary = '';
      if (spec.id === 'combat') {
        bonusSummary = `공격력 +${lvlDelta * 6}% · 치명타 ${(5 + lvlDelta * 2.5).toFixed(1)}%`;
      } else if (spec.id === 'logging') {
        bonusSummary = `벌목 위력 +${lvlDelta * 10}% · 추가 원목 ${Math.min(100, lvlDelta * 12)}%`;
      } else if (spec.id === 'mining') {
        bonusSummary = `채광 위력 +${lvlDelta * 10}% · 추가 광물 ${Math.min(100, lvlDelta * 12)}%`;
      } else {
        bonusSummary = `최대 HP +${lvlDelta * 6} · 기력 +${lvlDelta * 5}`;
      }
      return {
        id: spec.id,
        level: st.level,
        exp: st.exp,
        nextExp: st.nextExp,
        rankTitle: getProficiencyRankTitle(st.level),
        bonusSummary,
      };
    });
  }

  private applyPlayerDamage(rawDamage: number, sourceLabel?: string): void {
    if (this.gameMode === 'creative') return;
    const reduction = this.getPlayerDamageReduction();
    const taken = Math.max(2, Math.round(rawDamage * (1 - reduction)));
    this.hp = Math.max(0, this.hp - taken);
    this.sound.playPlayerHurt();
    this.shakeIntensity = Math.max(this.shakeIntensity, rawDamage > 22 ? 0.22 : 0.14);
    this.particles.spawnBurst(this.playerX, this.playerY + 0.9, this.playerZ, 0xf87171, 12, 3.6);
    this.spawnFeedback(
      sourceLabel ? `${sourceLabel} -${taken} HP` : `-${taken} HP`,
      '#f87171',
      this.playerX,
      this.playerY + 2.05,
      this.playerZ,
    );

    if (this.hp <= 0) {
      if (this.trialTowerActiveFloor !== null) {
        this.exitTrialTower(true);
      }
      this.hp = this.maxHp;
      this.stamina = this.maxStamina;
      this.playerX = 0;
      this.playerZ = 6.2;
      this.playerY = getTerrainHeight(0, 6.2);
      this.velX = 0;
      this.velY = 0;
      this.velZ = 0;
      for (const other of this.monsters) {
        other.aggroTimer = 0;
        other.telegraphTimer = 0;
        other.telegraphLabel = null;
        if (other.telegraphGroup) other.telegraphGroup.visible = false;
      }
      this.showBanner('체력이 소진되어 모닥불 캠프로 안전하게 복귀했습니다 (HP 회복 완료)');
    }
    this.emitHudSnapshot();
  }

  private damageMonster(m: WorldMonster, baseDamage: number, knockForce: number, skillLabel?: string): void {
    if (m.isDead) return;

    const isCrit = Math.random() < this.getCombatCritChance();
    const scaled = Math.max(
      1,
      Math.round(baseDamage * this.getCombatAtkMultiplier() * (isCrit ? 1.65 : 1.0)),
    );

    m.hp = Math.max(0, m.hp - scaled);
    m.hitFlashTimer = 0.16;
    if (this.gameMode !== 'creative') {
      m.aggroTimer = m.isBoss ? 15.0 : 9.0;
    }

    const dx = m.x - this.playerX;
    const dz = m.z - this.playerZ;
    const dist = Math.max(Math.hypot(dx, dz), 0.001);
    const bossResist = m.isBoss ? 0.42 : m.species === 'earth_slime' ? 0.45 : 1.0;
    m.knockVelX = (dx / dist) * knockForce * bossResist;
    m.knockVelZ = (dz / dist) * knockForce * bossResist;

    if (!skillLabel) {
      this.sound.playMonsterHit();
    }
    this.particles.spawnBurst(
      m.x,
      m.y + (m.isBoss ? 1.35 : 0.75),
      m.z,
      isCrit ? 0xfde047 : m.species === 'forest_slime' ? 0x34d399 : 0xfbbf24,
      isCrit ? 18 : 12,
      isCrit ? 5.2 : 4.4,
    );
    this.shakeIntensity = Math.max(this.shakeIntensity, m.hp <= 0 ? (m.isBoss ? 0.3 : 0.15) : isCrit ? 0.11 : 0.075);

    if (m.hp <= 0) {
      this.hitstopTimer = m.isBoss ? 0.08 : 0.04;
      m.isDead = true;
      m.respawnTimer = m.respawnDuration;
      m.group.visible = false;
      m.aggroTimer = 0;
      m.telegraphTimer = 0;
      m.telegraphLabel = null;
      if (m.telegraphGroup) m.telegraphGroup.visible = false;

      this.monstersDefeated += 1;
      this.recordDailyProgress('daily_hunt_monsters', 1);
      if (this.mpConnected && this.remotePlayers.size > 0) {
        this.recordDailyProgress('daily_coop_challenge', 1);
      }
      const lootParts: string[] = [];
      if (m.drops.leather > 0) {
        this.inventory.leather += m.drops.leather;
        this.leatherGathered += m.drops.leather;
        lootParts.push(`가죽 +${m.drops.leather}`);
      }
      if (m.drops.fang > 0) {
        this.inventory.fang += m.drops.fang;
        lootParts.push(`송곳니 +${m.drops.fang}`);
      }
      if (m.drops.essence > 0) {
        this.inventory.essence += m.drops.essence;
        lootParts.push(`정수 +${m.drops.essence}`);
      }
      if (m.drops.iron && m.drops.iron > 0) {
        this.inventory.iron += m.drops.iron;
        this.ironGathered += m.drops.iron;
        lootParts.push(`철광석 +${m.drops.iron}`);
      }
      if (m.drops.crystal && m.drops.crystal > 0) {
        this.inventory.crystal += m.drops.crystal;
        lootParts.push(`마력 수정 +${m.drops.crystal}`);
      }
      // Wild beasts & bosses also drop hearty Roasted Meat for hunger survival
      const meatDrop = m.isBoss
        ? 3
        : m.species === 'meadow_boar' || m.species === 'ember_wolf' || m.species === 'frost_wolf'
          ? 2
          : Math.random() < 0.55
            ? 1
            : 0;
      if (meatDrop > 0) {
        this.inventory.meat += meatDrop;
        lootParts.push(`구운 고기 +${meatDrop}`);
      }

      if (m.isTrialBoss && m.trialFloor) {
        const clearedFloor = m.trialFloor;
        const firstClear = clearedFloor > this.trialTowerHighestCleared;
        if (m.trialPotionDrop && m.trialPotionDrop > 0) {
          this.inventory.potion += m.trialPotionDrop;
          lootParts.push(`치유 물약 +${m.trialPotionDrop}`);
        }
        this.bossesDefeated += 1;
        this.trialTowerHighestCleared = Math.max(this.trialTowerHighestCleared, clearedFloor);
        this.trialTowerLastCleared = clearedFloor;
        this.trialTowerActiveFloor = null;
        this.trialBossId = null;
        if (this.trialArenaRing) this.trialArenaRing.visible = false;
        this.scene.remove(m.group);
        const idx = this.monsters.indexOf(m);
        if (idx >= 0) this.monsters.splice(idx, 1);

        let masteryNote = '';
        if (firstClear && clearedFloor % 5 === 0) {
          this.skillMasteryPoints += 1;
          masteryNote = ' · 스킬 마스터리 +1P';
        }
        this.sound.playMasteryUp();
        this.particles.spawnBurst(m.x, m.y + 1.5, m.z, 0x62e5ff, 40, 7.6);
        this.particles.spawnRing(m.x, m.y + 0.12, m.z, 0xfde047, 5.8);
        this.particles.spawnRing(m.x, m.y + 0.32, m.z, 0x38bdf8, 4.2);
        this.spawnFeedback(
          `[시련의 탑 ${clearedFloor}층 클리어!] ${m.label}${masteryNote}`,
          '#62e5ff',
          m.x,
          m.y + 2.6,
          m.z,
        );
        const nextUnlockText =
          clearedFloor < TRIAL_TOWER_FLOORS.length
            ? ` · ${clearedFloor + 1}층 상층 포털 개방!`
            : ' · 시련의 탑 30층 완전 정복!';
        this.showBanner(
          `시련의 탑 ${clearedFloor}층 [${m.label}] 격파! (${lootParts.join(' · ')}${masteryNote})${nextUnlockText}`,
        );
        this.gainProficiencyExp('combat', 110);
        this.recordDailyProgress('daily_coop_challenge', 1);
        if (this.mpClient && this.mpConnected) {
          this.mpClient.sendPlayerEvent('boss_defeat', `시련의 탑 ${clearedFloor}층 ${m.label}`);
        }
        this.saveGame(true);
      } else if (m.isBoss) {
        this.bossesDefeated += 1;
        this.skillMasteryPoints += 1;
        this.sound.playMasteryUp();
        this.particles.spawnBurst(m.x, m.y + 1.4, m.z, 0xfde047, 36, 7.2);
        this.particles.spawnRing(m.x, m.y + 0.1, m.z, 0xf59e0b, 5.2);
        this.particles.spawnRing(m.x, m.y + 0.3, m.z, 0x38bdf8, 3.8);
        this.spawnFeedback(
          `[중간 보스 토벌!] ${m.label} · 스킬 포인트 +1`,
          '#fde047',
          m.x,
          m.y + 2.5,
          m.z,
        );
        this.showBanner(
          `중간 보스 [${m.label}] 토벌 성공! (${lootParts.join(' · ')} · 스킬 마스터리 +1P)`,
        );
        this.gainProficiencyExp('combat', 90);
        this.recordDailyProgress('daily_coop_challenge', 1);
        if (this.mpClient && this.mpConnected) {
          this.mpClient.sendPlayerEvent('boss_defeat', m.label);
        }
        this.saveGame(true);
      } else {
        this.sound.playMonsterDefeat();
        this.particles.spawnBurst(m.x, m.y + 0.85, m.z, 0xfde047, 22, 5.4);
        this.particles.spawnRing(m.x, m.y, m.z, 0xf59e0b, 2.4);
        this.spawnFeedback(
          `${m.label} 처치! ${lootParts.join(' · ')}`,
          '#fde047',
          m.x,
          m.y + 1.85,
          m.z,
        );
        this.gainProficiencyExp('combat', 28);
      }
      this.gainExp(m.expReward);
    } else {
      const prefix = skillLabel ? `${skillLabel} ` : '';
      const critTag = isCrit ? ' 치명타!' : '';
      this.spawnFeedback(
        `${prefix}-${scaled}${critTag} (${m.hp}/${m.maxHp})`,
        isCrit ? '#fde047' : skillLabel ? '#7dd3fc' : '#fca5a5',
        m.x,
        m.y + (m.isBoss ? 2.2 : 1.55),
        m.z,
      );
      if (!skillLabel) {
        this.gainProficiencyExp('combat', 8);
      }
    }
  }

  public startTrialTowerFloor(floor: number): boolean {
    this.ensureWorldBooted();
    const spec = TRIAL_TOWER_FLOORS.find((f) => f.floor === floor);
    if (!spec) return false;
    if (floor > this.trialTowerHighestCleared + 1) {
      this.showBanner(`${floor - 1}층 보스를 먼저 격파해야 도전할 수 있습니다.`);
      return false;
    }

    // Save overworld return position only when entering from outside the dungeon
    if (!this.inTrialDungeon) {
      const distTower = Math.hypot(this.playerX - 24.0, this.playerZ - -72.0);
      this.dungeonReturnPos =
        distTower < 35
          ? { x: this.playerX, z: this.playerZ }
          : { x: 24.0, z: -56.0 };
    }

    // Clear any lingering trial boss without leaving the dungeon
    if (this.trialBossId) {
      const idx = this.monsters.findIndex((m) => m.id === this.trialBossId);
      if (idx >= 0) {
        this.scene.remove(this.monsters[idx].group);
        this.monsters.splice(idx, 1);
      }
      this.trialBossId = null;
    }

    if (!this.trialDungeonRig) {
      this.trialDungeonRig = createTrialDungeonArena();
      this.scene.add(this.trialDungeonRig.group);
    }
    this.trialDungeonRig.setFloorTheme(spec.floor, spec.accentHex);

    // Teleport player into the isolated 3D Trial Tower Dungeon Chamber facing North toward the Boss & Ascending Stairs
    this.inTrialDungeon = true;
    this.isSwimming = false;
    this.breath = this.maxBreath;
    this.playerX = TRIAL_DUNGEON_X;
    this.playerZ = TRIAL_DUNGEON_Z + 10.5;
    this.playerY = TRIAL_DUNGEON_Y;
    this.velX = 0;
    this.velY = 0;
    this.velZ = 0;
    this.playerYaw = Math.PI;
    this.cameraYaw = 0;
    this.hp = Math.max(this.hp, Math.round(this.maxHp * 0.85));
    this.stamina = this.maxStamina;

    const bossX = TRIAL_DUNGEON_X;
    const bossZ = TRIAL_DUNGEON_Z - 6.2;
    const boss = this.monsterLib.createTrialBoss(spec, bossX, bossZ, TRIAL_DUNGEON_Y);
    boss.aggroTimer = 60.0;
    this.monsters.push(boss);
    this.scene.add(boss.group);

    this.trialTowerActiveFloor = spec.floor;
    this.trialTowerLastCleared = null;
    this.trialBossId = boss.id;

    const weakLabel = ELEMENT_META[spec.weakness].label;
    this.sound.playBossRoar();
    this.particles.spawnRing(bossX, TRIAL_DUNGEON_Y + 0.15, bossZ, Number(spec.accentHex.replace('#', '0x')), 6.2);
    this.particles.spawnBurst(bossX, TRIAL_DUNGEON_Y + 1.6, bossZ, Number(spec.accentHex.replace('#', '0x')), 32, 6.5);
    this.showBanner(`시련의 탑 던전 ${spec.floor}층 입장! [${spec.bossName}] 출현 · 약점 속성: ${weakLabel}`);
    this.emitHudSnapshot();
    return true;
  }

  public exitTrialTower(silent = false): void {
    if (this.trialBossId) {
      const idx = this.monsters.findIndex((m) => m.id === this.trialBossId);
      if (idx >= 0) {
        const b = this.monsters[idx];
        this.scene.remove(b.group);
        this.monsters.splice(idx, 1);
      }
      this.trialBossId = null;
    }
    this.trialTowerActiveFloor = null;
    if (this.inTrialDungeon) {
      this.inTrialDungeon = false;
      this.playerX = this.dungeonReturnPos.x;
      this.playerZ = this.dungeonReturnPos.z;
      this.playerY = getTerrainHeight(this.playerX, this.playerZ);
      this.velX = 0;
      this.velY = 0;
      this.velZ = 0;
    }
    if (this.trialArenaRing) {
      this.trialArenaRing.visible = false;
    }
    if (!silent) {
      this.showBanner('시련의 탑 던전에서 필드로 귀환했습니다.');
      this.emitHudSnapshot();
    }
  }

  private hitMonster(m: WorldMonster): void {
    if (this.gatherCooldown > 0 || m.isDead) return;
    this.cancelEmote(true);

    this.playerYaw = Math.atan2(m.x - this.playerX, m.z - this.playerZ);

    if (this.autoEquipTool && this.ownedWeapons.length > 1) {
      const combatWeapon = this.selectBestWeaponForContext('monster');
      if (combatWeapon !== this.equippedWeapon) {
        this.equipWeapon(combatWeapon, false, false);
      }
      this.manualEquipHoldTimer = 0;
    }

    const spec = this.getEquippedSpec();
    this.gatherCooldown = 0.38 / spec.swingSpeedMult;
    this.swingTimer = 1.0;

    if (spec.category === 'bow' || spec.category === 'staff' || spec.category === 'wand') {
      const trailColor =
        spec.category === 'bow' ? 0xa3e635 : spec.category === 'staff' ? 0x34d399 : 0x38bdf8;
      this.spawnProjectileTrail(
        this.playerX,
        this.playerY + 1.02,
        this.playerZ,
        m.x,
        m.y + 0.85,
        m.z,
        trailColor,
      );
    }

    if (spec.healOnHit && spec.healOnHit > 0 && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + spec.healOnHit);
      this.spawnFeedback(`+${spec.healOnHit} HP`, '#6ee7b7', this.playerX, this.playerY + 1.9, this.playerZ);
    }

    this.damageMonster(m, spec.monsterDamage, spec.category === 'dagger' ? 4.2 : 5.6);
    this.emitHudSnapshot();
  }

  private hitResourceNode(node: WorldResourceNode): void {
    if (this.gatherCooldown > 0 || node.isDepleted) return;
    this.cancelEmote(true);

    this.playerYaw = Math.atan2(node.x - this.playerX, node.z - this.playerZ);

    const isFoodNode = Boolean(node.foodYield);
    const isTree = node.kind === 'oak_tree' || node.kind === 'pine_tree' || node.kind === 'birch_tree';
    const isCrystal = node.kind === 'crystal_cluster';

    // Context-aware auto weapon switch right before striking a resource
    if (!isFoodNode && this.autoEquipTool && this.ownedWeapons.length > 1) {
      const optimal = this.selectBestWeaponForContext(isTree ? 'tree' : 'rock');
      if (optimal !== this.equippedWeapon) {
        this.equipWeapon(optimal, false, false);
      }
      this.manualEquipHoldTimer = 0;
    }

    const spec = this.getEquippedSpec();
    this.gatherCooldown = (isFoodNode ? 0.34 : 0.42) / spec.swingSpeedMult;
    this.swingTimer = 1.0;
    this.activeGatherNode = node;

    const profLvlDelta = Math.max(0, (isTree || isFoodNode ? this.proficiencies.logging.level : this.proficiencies.mining.level) - 1);
    const baseDmg = isFoodNode ? 1 : isTree ? spec.treeDamage : spec.rockDamage;
    const dmg = isFoodNode ? 1 : Math.max(1, Math.round(baseDmg * (1 + profLvlDelta * 0.1)));

    node.hp = Math.max(0, node.hp - dmg);
    node.shakeTimer = 0.28;
    node.hitFlashTimer = 0.12;

    const isFinal = node.hp <= 0;

    if (isFoodNode) {
      this.sound.playWoodChop(false);
      const foodBurstColor =
        node.foodYield === 'apple'
          ? 0xef4444
          : node.foodYield === 'berry'
            ? 0xec4899
            : node.foodYield === 'honey'
              ? 0xfacc15
              : node.foodYield === 'carrot'
                ? 0xf97316
                : node.foodYield === 'cactus_fruit'
                  ? 0xe11d48
                  : node.foodYield === 'coconut'
                    ? 0x84cc16
                    : 0xf59e0b;
      this.particles.spawnBurst(node.x, node.y + 1.1, node.z, foodBurstColor, isFinal ? 18 : 8, isFinal ? 4.4 : 3.0);
      this.particles.spawnBurst(node.x, node.y + 1.3, node.z, 0x4ade80, isFinal ? 12 : 5, 3.2);
      this.gainProficiencyExp('logging', isFinal ? 12 : 4);
    } else if (isTree) {
      this.sound.playWoodChop(isFinal);
      this.particles.spawnBurst(node.x, node.y + 1.35, node.z, 0xc8935a, isFinal ? 20 : 9, isFinal ? 5.2 : 3.6);
      this.particles.spawnBurst(node.x, node.y + 2.6, node.z, node.kind === 'birch_tree' ? 0xeab308 : 0x5ca848, isFinal ? 16 : 6, 3.8);
      this.gainProficiencyExp('logging', isFinal ? 16 : 6);
    } else {
      this.sound.playStoneMine(isCrystal, isFinal);
      this.particles.spawnBurst(
        node.x,
        node.y + 0.85,
        node.z,
        isCrystal ? 0x62e5ff : node.kind === 'iron_vein' ? 0xcbd5e1 : 0x9ca3af,
        isFinal ? 22 : 10,
        isFinal ? 5.6 : 4.1,
      );
      this.gainProficiencyExp('mining', isFinal ? 18 : 7);
    }

    this.shakeIntensity = Math.max(this.shakeIntensity, isFinal ? (isFoodNode ? 0.08 : 0.16) : 0.055);
    if (isFinal) {
      this.hitstopTimer = isFoodNode ? 0.025 : 0.045;
      node.isDepleted = true;
      node.regrowTimer = node.regrowDuration;
      node.fallProgress = isFoodNode ? 1.0 : 0.001;
      node.fallDirAngle = Math.atan2(node.z - this.playerZ, node.x - this.playerX);
      if (isFoodNode) {
        node.activeVisual.visible = false;
      }

      if (node.foodYield) {
        const foodId = node.foodYield;
        const specFood = FOOD_CATALOG.find((f) => f.id === foodId);
        const totalAmt = node.yieldAmount + (Math.random() < 0.25 ? 1 : 0);
        this.inventory[foodId] = (this.inventory[foodId] ?? 0) + totalAmt;
        this.harvestedTotal += 1;
        if ((this.inventory[this.selectedFood] ?? 0) <= 0) {
          this.selectedFood = foodId;
        }
        this.spawnFeedback(
          `+${totalAmt} ${specFood ? specFood.name : '음식'}`,
          specFood ? specFood.colorHex : '#fde047',
          node.x,
          node.y + 1.7,
          node.z,
        );
        this.sound.playCollectChime();
        this.particles.spawnRing(node.x, node.y, node.z, 0x86efac, 1.8);
        this.gainExp(8);
        this.recordDailyProgress('daily_harvest_food', totalAmt);
      } else if (node.resourceYield) {
        const toolBonus = isTree ? spec.woodBonus : spec.mineralBonus;
        const profBonusChance = Math.min(1.0, profLvlDelta * 0.12);
        const profBonus = profBonusChance > 0 && Math.random() < profBonusChance ? 1 : 0;
        const totalAmt = node.yieldAmount + toolBonus + profBonus;
        this.inventory[node.resourceYield] += totalAmt;
        this.harvestedTotal += 1;
        if (node.resourceYield === 'wood') {
          this.woodGathered += totalAmt;
          this.recordDailyProgress('daily_gather_wood', totalAmt);
        } else if (node.resourceYield === 'stone') {
          this.stoneGathered += totalAmt;
          this.recordDailyProgress('daily_mine_ore', totalAmt);
        } else if (node.resourceYield === 'iron') {
          this.ironGathered += totalAmt;
          this.recordDailyProgress('daily_mine_ore', totalAmt);
        } else if (node.resourceYield === 'crystal') {
          this.recordDailyProgress('daily_mine_ore', totalAmt);
        }

        const nameMap = {
          wood: { label: '원목', color: '#f3c37a' },
          stone: { label: '석재', color: '#cbd5e1' },
          iron: { label: '철광석', color: '#93c5fd' },
          crystal: { label: '마력 수정', color: '#67e8f9' },
        }[node.resourceYield];

        const bonusTags: string[] = [];
        if (toolBonus > 0) {
          bonusTags.push(`${spec.category === 'axe' ? '도끼' : spec.category === 'pickaxe' ? '곡괭이' : '대검'} +${toolBonus}`);
        }
        if (profBonus > 0) {
          bonusTags.push(`숙련 +${profBonus}`);
        }
        const bonusTag = bonusTags.length > 0 ? ` (${bonusTags.join(', ')})` : '';
        this.spawnFeedback(`+${totalAmt} ${nameMap.label}${bonusTag}`, nameMap.color, node.x, node.y + 1.9, node.z);
        this.sound.playCollectChime();
        this.particles.spawnRing(node.x, node.y, node.z, isCrystal ? 0x62e5ff : 0xfde047, 2.1);
        this.gainExp(isCrystal ? 22 : node.kind === 'iron_vein' ? 16 : 10);
      }
    } else {
      this.spawnFeedback(`채집 (${node.maxHp - node.hp}/${node.maxHp})`, '#f3efe6', node.x, node.y + 1.5, node.z);
    }

    this.emitHudSnapshot();
  }

  private gainExp(amount: number): void {
    this.exp += amount;
    while (this.exp >= this.nextExp) {
      this.exp -= this.nextExp;
      this.level += 1;
      this.skillMasteryPoints += 1;
      this.nextExp = Math.floor(this.nextExp * 1.45);
      this.stamina = this.maxStamina;
      this.hp = this.maxHp;
      this.sound.playMasteryUp();
      this.particles.spawnRing(this.playerX, this.playerY, this.playerZ, 0xfbbf24, 3.6);
      this.spawnFeedback(
        `레벨 업! Lv.${this.level} · 스킬 포인트 +1`,
        '#fde047',
        this.playerX,
        this.playerY + 2.35,
        this.playerZ,
      );
    }
  }

  private showBanner(msg: string): void {
    this.bannerMessage = msg;
    this.bannerTimer = 4.8;
  }

  private spawnFeedback(text: string, color: string, wx: number, wy: number, wz: number): void {
    _projVec.set(wx, wy, wz).project(this.camera);
    const sx = THREE.MathUtils.clamp((_projVec.x * 0.5 + 0.5) * 100, 14, 86);
    const sy = THREE.MathUtils.clamp((-_projVec.y * 0.5 + 0.5) * 100, 16, 78);
    this.callbacks.onFloatingFeedback({
      id: this.feedbackCounter++,
      text,
      color,
      screenX: sx,
      screenY: sy,
    });
  }

  // ---------------- MAIN 60FPS SIMULATION LOOP ----------------

  private startLoop(): void {
    this.running = true;
    this.lastTimeMs = performance.now();
    this.scheduleNextFrame();
  }

  private scheduleNextFrame(): void {
    if (this.disposed || !this.running) return;
    if (this.isSoftwareGl) {
      this.afterDraw(() => this.tick());
    } else {
      this.frameId = requestAnimationFrame(() => this.tick());
    }
  }

  private afterDraw(cb: () => void): void {
    if (!this.renderer) return;
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (typeof gl.fenceSync === 'function') {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.disposed) return;
        const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    } else {
      this.frameId = window.setTimeout(cb, 80);
    }
  }

  private tick(): void {
    if (this.disposed || !this.running || !this.renderer) return;

    const now = performance.now();
    // Optional FPS limiter for battery & thermal optimization
    if (!this.isSoftwareGl && this.settings.fpsLimit > 0) {
      const minFrameMs = 1000 / this.settings.fpsLimit - 1.2;
      if (this.lastRenderTimeMs > 0 && now - this.lastRenderTimeMs < minFrameMs) {
        this.scheduleNextFrame();
        return;
      }
    }
    this.lastRenderTimeMs = now;

    const rawDt = (now - this.lastTimeMs) / 1000;
    this.lastTimeMs = now;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

    this.frameCounter++;
    this.fpsAccumTime += rawDt;
    this.fpsAccumFrames++;
    if (this.fpsAccumTime >= 0.5) {
      this.currentFps = Math.round(this.fpsAccumFrames / this.fpsAccumTime);
      this.fpsAccumTime = 0;
      this.fpsAccumFrames = 0;
    }

    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      this.renderer.render(this.scene, this.camera);
      this.scheduleNextFrame();
      return;
    }

    this.elapsedTime += dt;

    if (this.phase === 'title') {
      this.updateTitleScene(dt);
    } else if (this.phase === 'playing') {
      this.updatePlayer(dt);
      this.updateCamera(dt);
    }

    const focusX =
      this.phase === 'title' && this.titleCameraMode === 'scenic' && this.waterfallRig
        ? this.waterfallRig.focalX
        : this.playerX;
    const focusY =
      this.phase === 'title' && this.titleCameraMode === 'scenic' && this.waterfallRig
        ? this.waterfallRig.focalY - 3.5
        : this.playerY;
    const focusZ =
      this.phase === 'title' && this.titleCameraMode === 'scenic' && this.waterfallRig
        ? this.waterfallRig.focalZ
        : this.playerZ;

    this.environment.update(dt, this.elapsedTime, focusX, focusY, focusZ);
    // Sync live sun direction, sun color, sky reflection & fog into water & waterfall shaders (zero GC)
    this.environment.getSunDirection(_waterSunDir);
    this.environment.getSunColor(_waterSunColor);
    this.environment.getSkyHorizonColor(_waterSkyHorizon);
    this.environment.getSkyZenithColor(_waterSkyZenith);
    _waterFogColor.copy(this.fog.color);
    _waterEnvPayload.elapsed = this.elapsedTime;
    _waterEnvPayload.fogDensity = this.environment.getFogDensity();
    _waterEnvPayload.nightFactor = this.environment.nightFactor;

    if (this.waterBundle) {
      this.waterBundle.update(_waterEnvPayload);
    }
    if (this.waterfallRig) {
      const reducedVfx =
        this.settings.particlesLevel === 'off' || this.settings.particlesLevel === 'low';
      this.waterfallRig.update(dt, this.elapsedTime, reducedVfx, _waterEnvPayload);
    }
    if (this.phase === 'playing' && this.environment.isNightCreaturesActive()) {
      this.observedNightWildlife = true;
    }
    this.sound.updateBgm(this.environment.nightFactor, this.phase === 'playing');
    const wfDist = this.waterfallRig
      ? Math.hypot(
          this.camera.position.x - this.waterfallRig.focalX,
          this.camera.position.y - this.waterfallRig.focalY,
          this.camera.position.z - this.waterfallRig.focalZ,
        )
      : 999;
    this.sound.updateNatureAmbience({
      dt,
      elapsed: this.elapsedTime,
      waterfallDist: this.inTrialDungeon ? 999 : wfDist,
      windStrength: this.environment.windStrength,
      nightFactor: this.environment.nightFactor,
      rainBlend: this.environment.isRaining()
        ? this.environment.weather === 'storm'
          ? 1.0
          : 0.65
        : 0,
      active: !this.inTrialDungeon && this.phase !== 'paused',
    });
    this.updateWorldEntities(dt);
    if (this.phase !== 'title' || this.frameCounter % 4 === 0) {
      this.updateMonsters(dt);
    }
    this.updateRemotePlayers(dt);
    this.particles.update(dt);
    if (this.phase === 'playing') {
      this.checkQuestNotifications();
      this.autoSaveTimer += dt;
      if (this.autoSaveTimer >= 45) {
        this.autoSaveTimer = 0;
        this.saveGame(true);
      }
      if (this.mpClient && this.mpConnected) {
        this.mpSendTimer += dt;
        if (this.mpSendTimer >= 0.08) {
          this.mpSendTimer = 0;
          const horizSpd = Math.hypot(this.velX, this.velZ);
          this.mpClient.sendPlayerState({
            playerClass: this.playerClass,
            gameMode: this.gameMode,
            x: this.playerX,
            y: this.playerY,
            z: this.playerZ,
            yaw: this.playerYaw,
            speed: horizSpd,
            isSprinting:
              (this.heldKeys.has('ShiftLeft') || this.heldKeys.has('ShiftRight')) && horizSpd > 6.5,
            isGrounded: this.isGrounded,
            swinging: this.swingTimer > 0.25,
            weapon: this.equippedWeapon,
            armor: this.equippedArmor,
            emote: this.activeEmote,
          });
        }
      }
    }

    this.renderer.render(this.scene, this.camera);

    this.hudEmitTimer += dt;
    const hudInterval = this.phase === 'title' ? 0.35 : 0.11;
    if (this.hudEmitTimer >= hudInterval) {
      this.hudEmitTimer = 0;
      this.emitHudSnapshot();
    }

    this.scheduleNextFrame();
  }

  private updateTitleScene(dt: number): void {
    if (this.catRig) {
      this.catRig.root.visible = true;
    }
    if (this.titleCameraMode === 'scenic' && this.waterfallRig) {
      // Cinematic sweeping lakefront orbit framing the glittering sunlit lake, wooden arch bridge,
      // cascading waterfall + rainbow mist, glowing morning sun, and soaring sky bird flocks
      this.titleOrbitAngle += dt * 0.13;
      const fx = this.waterfallRig.focalX - 4.2;
      const fz = this.waterfallRig.focalZ + 4.4;
      const fy = this.waterfallRig.focalY - 0.5;
      // Orbit smoothly across the southwest/west lake edge looking east-northeast toward waterfall & sunlit sky
      const sweep = -1.28 + Math.sin(this.titleOrbitAngle) * 0.68;
      const radius = 21.5 + Math.cos(this.titleOrbitAngle * 0.65) * 3.4;
      const tx = fx + Math.sin(sweep) * radius;
      const tz = fz + Math.cos(sweep) * radius;
      const groundAtCam = getTerrainHeight(tx, tz);
      const ty = Math.max(groundAtCam + 3.4, fy + 2.6 + Math.sin(this.titleOrbitAngle * 1.1) * 1.25);

      const k = 1 - Math.exp(-3.2 * dt);
      _camDesired.set(tx, ty, tz);
      if (this.camera.position.distanceToSquared(_camDesired) > 2500) {
        this.camera.position.copy(_camDesired);
      } else {
        this.camera.position.lerp(_camDesired, k);
      }
      _camLookAt.set(
        this.waterfallRig.focalX + Math.sin(this.titleOrbitAngle * 0.45) * 2.4,
        this.waterfallRig.focalY + 0.35 + Math.cos(this.titleOrbitAngle * 0.6) * 0.45,
        this.waterfallRig.focalZ + Math.cos(this.titleOrbitAngle * 0.45) * 1.8,
      );
      this.camera.lookAt(_camLookAt);
      return;
    }

    // Character Select closeup showcase camera
    this.titleOrbitAngle += dt * 0.24;
    const r = 4.35;
    const tx = this.playerX + Math.sin(this.titleOrbitAngle) * r;
    const tz = this.playerZ + Math.cos(this.titleOrbitAngle) * r;
    const ty = this.playerY + 1.92 + Math.sin(this.elapsedTime * 0.65) * 0.12;

    const k = 1 - Math.exp(-5.0 * dt);
    _camDesired.set(tx, ty, tz);
    if (this.camera.position.distanceToSquared(_camDesired) > 200) {
      this.camera.position.copy(_camDesired);
    } else {
      this.camera.position.lerp(_camDesired, k);
    }
    this.camera.lookAt(this.playerX - 0.85, this.playerY + 0.98, this.playerZ);

    this.catRig.updateAnimation({
      dt,
      time: this.elapsedTime,
      speed: 0,
      maxSpeed: 6,
      turnRate: 0,
      isSprinting: false,
      isGrounded: true,
      verticalVel: 0,
      swingTimer: 0,
      swingCategory: 'sword',
      landSquash: 0,
      heightAboveGround: 0,
      nightFactor: this.environment.nightFactor,
    });
  }

  private updatePlayer(dt: number): void {
    let inputForward = this.mobileMoveZ;
    let inputRight = this.mobileMoveX;
    if (this.heldKeys.has('KeyW') || this.heldKeys.has('ArrowUp')) inputForward += 1;
    if (this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown')) inputForward -= 1;
    if (this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight')) inputRight += 1;
    if (this.heldKeys.has('KeyA') || this.heldKeys.has('ArrowLeft')) inputRight -= 1;
    inputForward = THREE.MathUtils.clamp(inputForward, -1, 1);
    inputRight = THREE.MathUtils.clamp(inputRight, -1, 1);

    _camForward.set(-Math.sin(this.cameraYaw), 0, -Math.cos(this.cameraYaw));
    _camRight.set(Math.cos(this.cameraYaw), 0, -Math.sin(this.cameraYaw));
    _moveDir.set(0, 0, 0).addScaledVector(_camForward, inputForward).addScaledVector(_camRight, inputRight);

    const hasMoveInput = _moveDir.lengthSq() > 0.0001;
    if (hasMoveInput) {
      _moveDir.normalize();
      if (this.activeEmote) {
        this.cancelEmote(true);
      }
    }

    // Emote timer & resting HP/stamina boost while sitting
    if (this.activeEmote) {
      this.emoteTime += dt;
      if (this.activeEmote === 'sit') {
        this.hp = Math.min(this.maxHp, this.hp + 14 * dt);
        this.stamina = Math.min(this.maxStamina, this.stamina + 35 * dt);
      }
      if (this.emoteDuration > 0 && this.emoteTime >= this.emoteDuration) {
        this.cancelEmote(true);
      }
    } else if (this.hp < this.maxHp && this.playerHurtCooldown <= 0) {
      // Gentle out-of-combat passive regeneration
      this.hp = Math.min(this.maxHp, this.hp + 2.4 * dt);
    }

    if (this.playerHurtCooldown > 0) {
      this.playerHurtCooldown = Math.max(0, this.playerHurtCooldown - dt);
    }

    for (const s of WARRIOR_SKILLS_CATALOG) {
      if (this.skillCooldowns[s.id] > 0) {
        this.skillCooldowns[s.id] = Math.max(0, this.skillCooldowns[s.id] - dt);
      }
    }
    if (this.warcryBuffRemaining > 0) {
      this.warcryBuffRemaining = Math.max(0, this.warcryBuffRemaining - dt);
    }
    if (this.skillAnimTimer > 0) {
      this.skillAnimTimer = Math.max(0, this.skillAnimTimer - dt);
      if (this.skillAnimTimer <= 0) {
        this.activeSkillAnim = null;
      }
    }

    const isCreative = this.gameMode === 'creative';
    const wantsSprint =
      (this.heldKeys.has('ShiftLeft') || this.heldKeys.has('ShiftRight') || this.mobileSprint) &&
      hasMoveInput;
    if (isCreative) {
      this.staminaExhausted = false;
      this.stamina = this.maxStamina;
      this.hp = this.maxHp;
      this.hunger = this.maxHunger;
      this.breath = this.maxBreath;
      this.starvationTickTimer = 0;
    } else if (this.staminaExhausted && this.stamina > 22) {
      this.staminaExhausted = false;
    }
    const isSprinting = isCreative
      ? wantsSprint
      : wantsSprint && !this.staminaExhausted && this.stamina > 0.5;
    const staminaDrain = Math.max(11, 21 - (this.upgrades.bootsLevel - 1) * 4);
    const craftRegenBonus = Math.max(0, this.proficiencies.craft.level - 1) * 1.6;
    const hungerStaminaMult = this.hunger <= 15 ? 0.52 : this.hunger >= 75 ? 1.18 : 1.0;
    const staminaRegen = (22 + (this.upgrades.bootsLevel - 1) * 6 + craftRegenBonus) * hungerStaminaMult;

    if (!isCreative) {
      if (isSprinting) {
        this.stamina = Math.max(0, this.stamina - staminaDrain * dt);
        if (this.stamina <= 0.5) this.staminaExhausted = true;
      } else {
        this.stamina = Math.min(this.maxStamina, this.stamina + staminaRegen * dt);
      }

      // Hunger survival loop: gradual drain while exploring, bonus heal when full, gentle warning when empty
      const hungerDrainRate = isSprinting
        ? 0.52
        : this.isSwimming
          ? 0.44
          : hasMoveInput
            ? 0.24
            : 0.09;
      this.hunger = Math.max(0, this.hunger - hungerDrainRate * dt);
      if (this.hunger >= 75 && this.hp < this.maxHp && this.playerHurtCooldown <= 0) {
        this.hp = Math.min(this.maxHp, this.hp + 1.8 * dt);
      }
      if (this.hunger <= 0.01) {
        this.starvationTickTimer += dt;
        if (this.starvationTickTimer >= 4.2) {
          this.starvationTickTimer = 0;
          if (this.hp > 10) {
            this.hp = Math.max(10, this.hp - 2);
            this.spawnFeedback('배고픔! 음식을 섭취하세요 (6키)', '#fb923c', this.playerX, this.playerY + 2.05, this.playerZ);
          }
        }
      } else {
        this.starvationTickTimer = 0;
      }
    }

    const classMoveMult = getClassSpec(this.playerClass).moveSpeedMult;
    const buffSpeedMult = this.warcryBuffRemaining > 0 && (this.playerClass === 'rogue' || this.playerClass === 'archer') ? 1.15 : 1.0;
    const bootsBoost = (1 + (this.upgrades.bootsLevel - 1) * 0.14) * classMoveMult * buffSpeedMult;
    const walkSpeed = (this.isSwimming ? 4.85 : 5.8) * bootsBoost;
    const sprintSpeed = (this.isSwimming ? 7.25 : 9.4) * bootsBoost;
    const targetSpeed = hasMoveInput ? (isSprinting ? sprintSpeed : walkSpeed) : 0;

    const accel = this.isSwimming ? 8.5 : this.isGrounded ? 15 : 6.5;
    this.velX = THREE.MathUtils.damp(this.velX, _moveDir.x * targetSpeed, accel, dt);
    this.velZ = THREE.MathUtils.damp(this.velZ, _moveDir.z * targetSpeed, accel, dt);

    this.prevPlayerYaw = this.playerYaw;
    if (hasMoveInput && this.swingTimer <= 0.1) {
      const targetYaw = Math.atan2(_moveDir.x, _moveDir.z);
      let diff = targetYaw - this.playerYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.playerYaw += diff * (1 - Math.exp(-14 * dt));
    }
    let yawDelta = this.playerYaw - this.prevPlayerYaw;
    while (yawDelta > Math.PI) yawDelta -= Math.PI * 2;
    while (yawDelta < -Math.PI) yawDelta += Math.PI * 2;
    const turnRate = yawDelta / Math.max(dt, 0.001);

    if (this.isGrounded) {
      this.coyoteTimer = 0.12;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }
    this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);

    if (this.jumpBufferTimer > 0 && (this.coyoteTimer > 0 || this.isSwimming)) {
      this.cancelEmote(true);
      this.velY = this.isSwimming ? 6.8 : 8.4 + (this.upgrades.bootsLevel - 1) * 0.45;
      this.isGrounded = false;
      this.isSwimming = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      this.sound.playJump();
      this.particles.spawnBurst(
        this.playerX,
        this.playerY + 0.25,
        this.playerZ,
        this.environment.isRaining() || getWaterDepthAt(this.playerX, this.playerZ) > 0.1 ? 0x7dd3fc : 0xd9cbb8,
        7,
        2.4,
      );
    }

    this.velY -= (this.isSwimming ? 6.0 : 22.5) * dt;

    const prevX = this.playerX;
    const prevZ = this.playerZ;
    this.playerX += this.velX * dt;
    this.playerZ += this.velZ * dt;
    this.playerY += this.velY * dt;

    if (!this.inTrialDungeon) {
      // Unified solid collision resolution (resources, landmarks, cottages, ruins, mine, pier pilings, mushrooms, furniture, walls, closed doors)
      const resolved = this.resolveEntityStaticCollisions(
        this.playerX,
        this.playerZ,
        this.playerY,
        0.42,
        false,
        prevX,
        prevZ,
      );
      this.playerX = resolved.x;
      this.playerZ = resolved.z;

      const maxPlayableR = this.frontierRingRadius - 0.8;
      const distFromOrigin = Math.hypot(this.playerX, this.playerZ);
      if (distFromOrigin > maxPlayableR) {
        const s = maxPlayableR / distFromOrigin;
        this.playerX *= s;
        this.playerZ *= s;
      }
    } else {
      // Clamp player cleanly inside the 3D Trial Tower Dungeon Sanctuary
      const ddx = this.playerX - TRIAL_DUNGEON_X;
      const ddz = this.playerZ - TRIAL_DUNGEON_Z;
      const distD = Math.hypot(ddx, ddz);
      const maxD = TRIAL_DUNGEON_RADIUS - 1.35;
      if (distD > maxD) {
        const s = maxD / distD;
        this.playerX = TRIAL_DUNGEON_X + ddx * s;
        this.playerZ = TRIAL_DUNGEON_Z + ddz * s;
      }
    }

    // Compute walkable support surface: Dungeon floor OR terrain + walkable decks + placed housing
    let groundY = this.inTrialDungeon ? TRIAL_DUNGEON_Y : getTerrainHeight(this.playerX, this.playerZ);
    let onStairsOrFloor = false;
    if (!this.inTrialDungeon) {
      for (const deck of this.walkableDecks) {
        const dx = this.playerX - deck.x;
        const dz = this.playerZ - deck.z;
        const cos = Math.cos(deck.rotY);
        const sin = Math.sin(deck.rotY);
        const lx = dx * cos - dz * sin;
        const lz = dx * sin + dz * cos;
        if (Math.abs(lx) <= deck.halfW && Math.abs(lz) <= deck.halfD) {
          if (deck.topY <= this.playerY + 1.05 && deck.topY > groundY) {
            groundY = deck.topY;
            onStairsOrFloor = true;
          }
        }
      }
      const tileHalf = HOUSING_TILE_SIZE * 0.5 + 0.08;
      for (const h of this.placedHouses) {
        if (!h.group.visible) continue;
        if (isWalkableTopKind(h.kind)) {
          if (Math.abs(this.playerX - h.x) <= tileHalf && Math.abs(this.playerZ - h.z) <= tileHalf) {
            if (h.y <= this.playerY + 1.02 && h.y > groundY) {
              groundY = h.y;
              onStairsOrFloor = true;
            }
          }
        } else if (h.kind === 'stairs') {
          const sy = getStairsSurfaceY(h, this.playerX, this.playerZ);
          if (sy !== null && sy <= this.playerY + 1.05 && sy > groundY) {
            groundY = sy;
            onStairsOrFloor = true;
          }
        }
      }
    }

    // Smooth Hill Traversal, Shallow Puddle Wading & Deep-Water Swimming + Breath Gauge
    const waterSurf = this.inTrialDungeon || onStairsOrFloor ? null : getWaterSurfaceAt(this.playerX, this.playerZ);
    const waterDepth = waterSurf !== null ? waterSurf - groundY : 0;
    const inDeepWater = waterSurf !== null && waterDepth > 0.68 && this.playerY <= waterSurf + 0.12;

    const horizSpeed = Math.hypot(this.velX, this.velZ);

    if (inDeepWater && waterSurf !== null) {
      this.isSwimming = true;
      this.isGrounded = false;
      const swimSurfaceY = waterSurf - 0.52;
      this.playerY = THREE.MathUtils.damp(this.playerY, swimSurfaceY, 10, dt);
      this.velY = 0;

      // Breath Gauge drain while swimming (infinite in Creative Mode)
      if (isCreative) {
        this.breath = this.maxBreath;
        this.breathDamageTimer = 0;
      } else {
        const drainRate = isSprinting ? 12.5 : horizSpeed > 0.5 ? 7.2 : 3.2;
        this.breath = Math.max(0, this.breath - drainRate * dt);
        if (this.breath <= 0) {
          this.breathDamageTimer += dt;
          if (this.breathDamageTimer >= 1.15) {
            this.breathDamageTimer = 0;
            if (this.hp > 6) {
              this.hp = Math.max(5, this.hp - 4);
              this.spawnFeedback('숨 부족! -4 HP', '#38bdf8', this.playerX, this.playerY + 1.9, this.playerZ);
            }
          }
        } else {
          this.breathDamageTimer = 0;
        }
      }

      // Swimming splash rings & water droplets
      this.swimSplashTimer -= dt * (horizSpeed > 0.5 ? 1.4 : 0.6);
      if (this.swimSplashTimer <= 0) {
        this.swimSplashTimer = 0.45;
        this.particles.spawnRing(this.playerX, waterSurf + 0.04, this.playerZ, 0xbae6fd, horizSpeed > 0.5 ? 1.85 : 1.25);
        if (horizSpeed > 0.6) {
          this.particles.spawnBurst(this.playerX, waterSurf + 0.08, this.playerZ, 0xe0f2fe, 4, 1.9);
        }
      }
    } else {
      this.isSwimming = false;
      this.breathDamageTimer = 0;
      if (this.breath < this.maxBreath) {
        this.breath = Math.min(this.maxBreath, this.breath + 34 * dt);
      }

      const wasGrounded = this.isGrounded;
      if (this.playerY <= groundY) {
        this.playerY = groundY;
        if (!wasGrounded && this.velY < -3.5) {
          this.landSquash = 1.0;
          this.sound.playLand();
          this.particles.spawnBurst(
            this.playerX,
            groundY + 0.08,
            this.playerZ,
            waterDepth > 0.08 || this.environment.isRaining() ? 0xaedbf5 : 0xc7bba8,
            9,
            2.8,
          );
        }
        this.velY = 0;
        this.isGrounded = true;
      } else if (
        wasGrounded &&
        this.velY <= 0 &&
        this.playerY - groundY <= (onStairsOrFloor ? 0.78 : 0.56)
      ) {
        // Smooth downhill hill & stair stickiness (zero bouncing on hills or slopes!)
        this.playerY = groundY;
        this.velY = 0;
        this.isGrounded = true;
      } else if (this.playerY > groundY + 0.08) {
        this.isGrounded = false;
      }

      if (this.isGrounded && horizSpeed > 1.2) {
        this.footstepTimer -= dt * (isSprinting ? 1.55 : 1.0);
        if (this.footstepTimer <= 0) {
          this.footstepTimer = 0.34;
          const wading = waterDepth > 0.08;
          const wet = wading || this.environment.isRaining();
          this.sound.playFootstep(isSprinting, wet);
          if (isSprinting || wet) {
            this.particles.spawnBurst(
              this.playerX,
              groundY + 0.08,
              this.playerZ,
              wading ? 0x7dd3fc : wet ? 0xbce6ff : 0xd8c8a8,
              wading ? 5 : 3,
              wading ? 2.0 : 1.4,
            );
          }
        }
      }
    }

    this.landSquash = Math.max(0, this.landSquash - dt * 5.2);
    this.gatherCooldown = Math.max(0, this.gatherCooldown - dt);
    this.swingTimer = Math.max(0, this.swingTimer - dt * 3.1);
    if (this.bannerTimer > 0) {
      this.bannerTimer = Math.max(0, this.bannerTimer - dt);
      if (this.bannerTimer === 0) this.bannerMessage = null;
    }

    this.updateContextualAutoEquip(dt);

    const spec = this.getEquippedSpec();
    this.catRig.root.position.set(this.playerX, this.playerY, this.playerZ);
    this.catRig.root.rotation.y = this.playerYaw;
    const skillProgress =
      this.activeSkillAnim && this.skillAnimDuration > 0
        ? 1 - this.skillAnimTimer / this.skillAnimDuration
        : 0;
    this.catRig.updateAnimation({
      dt,
      time: this.elapsedTime,
      speed: horizSpeed,
      maxSpeed: walkSpeed,
      turnRate,
      isSprinting,
      isGrounded: this.isGrounded,
      isSwimming: this.isSwimming,
      verticalVel: this.velY,
      swingTimer: this.swingTimer,
      swingCategory: spec.category,
      landSquash: this.landSquash,
      heightAboveGround: Math.max(0, this.playerY - groundY),
      nightFactor: this.environment.nightFactor,
      activeEmote: this.activeEmote,
      emoteTime: this.emoteTime,
      activeSkill: this.activeSkillAnim,
      skillAnimProgress: skillProgress,
      warcryActive: this.warcryBuffRemaining > 0,
    });

    const targetFov = isSprinting ? 57 : 52;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 7, dt);
      this.camera.updateProjectionMatrix();
    }
  }

  private updateCamera(dt: number): void {
    if (this.catRig) {
      this.catRig.root.visible = this.cameraMode !== 'first';
    }

    if (this.cameraMode === 'first') {
      // 1인칭 시점: eye-level forward camera following cameraYaw & cameraPitch
      const eyeY = this.playerY + (this.isSwimming ? 1.05 : 1.52);
      _camDesired.set(
        this.playerX - Math.sin(this.cameraYaw) * 0.14,
        eyeY,
        this.playerZ - Math.cos(this.cameraYaw) * 0.14,
      );
      const kFirst = 1 - Math.exp(-26 * dt);
      this.camera.position.lerp(_camDesired, kFirst);

      if (this.shakeIntensity > 0.001) {
        this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity * 0.45;
        this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity * 0.45;
        this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 1.4);
      }

      const pitchClamped = THREE.MathUtils.clamp(this.cameraPitch, -1.12, 1.12);
      const cosP = Math.cos(pitchClamped);
      _camLookAt.set(
        this.camera.position.x - Math.sin(this.cameraYaw) * cosP * 12,
        this.camera.position.y - Math.sin(pitchClamped) * 12,
        this.camera.position.z - Math.cos(this.cameraYaw) * cosP * 12,
      );
      this.camera.lookAt(_camLookAt);
      return;
    }

    this.cameraDist = THREE.MathUtils.damp(this.cameraDist, this.targetCameraDist, 10, dt);

    // Smoothly support looking UP at ceilings (negative cameraPitch) without ground-clipping or wall occlusion
    const lookUp = Math.max(0, -this.cameraPitch);
    const lookUpNorm = Math.min(1, lookUp / 0.95);
    const effectiveDist =
      lookUpNorm > 0
        ? Math.max(2.6, this.cameraDist * (1 - lookUpNorm * 0.48))
        : this.cameraDist;

    const horizDist = Math.cos(this.cameraPitch) * effectiveDist;
    const vertDist = Math.sin(this.cameraPitch) * effectiveDist;
    const frontSign = this.cameraMode === 'third_front' ? -1 : 1;

    _camDesired.set(
      this.playerX + Math.sin(this.cameraYaw) * horizDist * frontSign,
      this.playerY + 1.35 + vertDist,
      this.playerZ + Math.cos(this.cameraYaw) * horizDist * frontSign,
    );

    const floorClearance = lookUpNorm > 0 ? 0.34 : 0.85;
    const terrainFloor = this.inTrialDungeon
      ? TRIAL_DUNGEON_Y
      : getTerrainHeight(_camDesired.x, _camDesired.z);
    const camGround = Math.max(
      terrainFloor + floorClearance,
      lookUpNorm > 0 ? this.playerY + 0.38 : -999,
    );
    if (_camDesired.y < camGround) _camDesired.y = camGround;

    const k = 1 - Math.exp(-12 * dt);
    this.camera.position.lerp(_camDesired, k);

    if (this.shakeIntensity > 0.001) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 1.4);
    }

    if (this.cameraMode === 'third_front') {
      // 3인칭 전면 시점: look back directly at the character's face & upper body
      _camLookAt.set(this.playerX, this.playerY + 1.18, this.playerZ);
    } else {
      // 3인칭 후면 시점: when pitching upward, aim lookAt smoothly upward & slightly ahead
      _camLookAt.set(
        this.playerX - Math.sin(this.cameraYaw) * lookUp * 2.1,
        this.playerY + 1.15 + lookUp * 4.2,
        this.playerZ - Math.cos(this.cameraYaw) * lookUp * 2.1,
      );
    }
    this.camera.lookAt(_camLookAt);
  }

  private updateWorldEntities(dt: number): void {
    const nightBoost = 1 + this.environment.nightFactor * 1.65;
    const rainGrowthMult = this.environment.isRaining() ? 1.8 : 1.0;

    if (Math.abs(this.frontierRingRadius - this.targetFrontierRadius) > 0.05) {
      this.frontierRingRadius = THREE.MathUtils.damp(this.frontierRingRadius, this.targetFrontierRadius, 3.2, dt);
      this.frontierRingMesh.scale.setScalar(this.frontierRingRadius);
    }
    this.frontierRingMesh.position.y = 0.5 + Math.sin(this.elapsedTime * 1.8) * 0.08;

    // Water wave displacement, shoreline foam, and sun reflections are animated smoothly
    // inside the depth-aware water shader via this.waterBundle.update(_waterEnvPayload).
    if (this.trialDungeonRig) {
      this.trialDungeonRig.sealRing.rotation.z = this.elapsedTime * 0.25;
      this.trialDungeonRig.portalRing.rotation.z = -this.elapsedTime * 0.85;
    }

    for (const lm of this.landmarks) {
      if (lm.kind === 'workbench' && lm.animatedPart) {
        const flick = 0.92 + Math.sin(this.elapsedTime * 13) * 0.1 + Math.cos(this.elapsedTime * 21) * 0.06;
        lm.animatedPart.scale.set(flick, 0.88 + Math.sin(this.elapsedTime * 16) * 0.16, flick);
        if (lm.light) {
          lm.light.intensity = (2.8 + Math.sin(this.elapsedTime * 14) * 0.55) * nightBoost;
        }
      } else if (lm.kind === 'frontier_stone' && lm.animatedPart) {
        lm.animatedPart.rotation.y += dt * 1.1;
        lm.animatedPart.position.y = 2.65 + Math.sin(this.elapsedTime * 2.2) * 0.18;
        if (lm.light) {
          lm.light.intensity = 3.2 * nightBoost;
        }
      } else if (lm.kind === 'trial_tower' && lm.animatedPart) {
        lm.animatedPart.rotation.y += dt * 0.95;
        lm.animatedPart.position.y = 14.1 + Math.sin(this.elapsedTime * 1.9) * 0.25;
        if (lm.light) {
          lm.light.intensity = (3.4 + Math.sin(this.elapsedTime * 3.1) * 0.6) * nightBoost;
        }
      }
    }
    if (this.trialArenaRing && this.trialArenaRing.visible) {
      this.trialArenaRing.rotation.z += dt * 0.48;
    }

    for (const l of this.lanterns) {
      l.flame.rotation.y += dt * 2.4;
      l.light.intensity = (2.2 + Math.sin(this.elapsedTime * 11 + l.x) * 0.35) * nightBoost;
    }

    // Update placed modular housing automatic day/night lights, durability damage tint, animated hinged doors & translucent snap ghost
    const lampPower = this.getHousingLampPower();
    for (const h of this.placedHouses) {
      this.updateHousingTileLighting(h, lampPower, this.elapsedTime);
      updateTileDamageVisual(h, dt);
      if (h.doorPivot) {
        const targetAngle = h.isDoorOpen ? Math.PI * 0.56 : 0;
        if (Math.abs(h.doorAngle - targetAngle) > 0.002) {
          h.doorAngle = THREE.MathUtils.damp(h.doorAngle, targetAngle, 10, dt);
          h.doorPivot.rotation.y = h.doorAngle;
        }
      }
    }
    if (this.ghostRig && (this.housingMode === 'placing' || this.housingMode === 'moving')) {
      this.updateGhostTransformAndValidity();
    }

    const liveWind = this.environment ? this.environment.windStrength : 0.25;
    const windSwayAmp = 0.008 + liveWind * 0.036;

    // Identify the primary closest gatherable tree/rock within proximity highlight range
    const isPlaying = this.phase === 'playing';
    const refX =
      this.phase === 'title' && this.titleCameraMode === 'scenic' && this.waterfallRig
        ? this.waterfallRig.focalX
        : this.playerX;
    const refZ =
      this.phase === 'title' && this.titleCameraMode === 'scenic' && this.waterfallRig
        ? this.waterfallRig.focalZ
        : this.playerZ;
    const cullDistSq = this.cullDistance * this.cullDistance;
    const swayDistSq = 46 * 46;
    const doCullPass = this.frameCounter % 3 === 0;

    let primaryOutlineNode: WorldResourceNode | null = null;
    let primaryOutlineDist = Infinity;
    if (isPlaying) {
      for (const n of this.resources) {
        if (n.isDepleted || !n.group.visible) continue;
        const dx = n.x - this.playerX;
        const dz = n.z - this.playerZ;
        const dSq = dx * dx + dz * dz;
        const maxR = n.interactRadius + 2.8;
        if (dSq <= maxR * maxR) {
          const d = Math.sqrt(dSq);
          if (d < primaryOutlineDist) {
            primaryOutlineDist = d;
            primaryOutlineNode = n;
          }
        }
      }
    }

    for (const n of this.resources) {
      const dxR = n.x - refX;
      const dzR = n.z - refZ;
      const distSq = dxR * dxR + dzR * dzR;

      if (doCullPass && !n.suppressedByHousing) {
        const shouldShow = distSq <= cullDistSq;
        if (n.group.visible !== shouldShow) {
          n.group.visible = shouldShow;
        }
      }

      if (!n.group.visible && !n.isDepleted) {
        continue;
      }

      const isTree = n.kind === 'oak_tree' || n.kind === 'pine_tree' || n.kind === 'birch_tree';

      if (n.shakeTimer > 0) {
        n.shakeTimer = Math.max(0, n.shakeTimer - dt);
        const s = Math.sin(n.shakeTimer * 52) * n.shakeTimer * 0.35;
        n.activeVisual.rotation.z = s;
        n.activeVisual.rotation.x = s * 0.6;
      } else if (!n.isDepleted) {
        if (isTree && distSq <= swayDistSq && this.settings.weatherEffects) {
          n.activeVisual.rotation.z = Math.sin(this.elapsedTime * 1.9 + n.x * 0.3) * windSwayAmp;
          n.activeVisual.rotation.x = Math.cos(this.elapsedTime * 1.5 + n.z * 0.3) * windSwayAmp * 0.6;
        }
      }

      // Subtle proximity outline highlight for gatherable trees & rocks
      let targetOutline = 0;
      const isPrimary = n === primaryOutlineNode;
      if (isPlaying && !n.isDepleted && distSq <= 81) {
        const highlightMax = n.interactRadius + 2.8;
        const d = Math.hypot(n.x - this.playerX, n.z - this.playerZ);
        if (d <= highlightMax) {
          const proximity = THREE.MathUtils.clamp(
            1 - (d - n.interactRadius * 0.65) / Math.max(highlightMax - n.interactRadius * 0.65, 0.5),
            0.25,
            1.0,
          );
          targetOutline = isPrimary ? Math.max(0.8, proximity) : proximity * 0.42;
        }
      }
      if (n.outlineStrength > 0.005 || targetOutline > 0) {
        n.outlineStrength = THREE.MathUtils.damp(n.outlineStrength, targetOutline, 10, dt);
      }

      if (n.outlineGroup && n.outlineMaterial) {
        if (n.outlineStrength > 0.015 && !n.isDepleted && n.activeVisual.visible) {
          n.outlineGroup.visible = true;
          const pulse = isPrimary ? 0.54 + Math.sin(this.elapsedTime * 4.8) * 0.1 : 0.32;
          n.outlineMaterial.uniforms.uOpacity.value = THREE.MathUtils.clamp(n.outlineStrength * pulse, 0, 0.72);
        } else {
          n.outlineGroup.visible = false;
        }
      }

      if (n.groundHalo) {
        if (isPrimary && !n.isDepleted && n.outlineStrength > 0.05) {
          n.groundHalo.visible = true;
          const hMat = n.groundHalo.material as THREE.MeshBasicMaterial;
          hMat.opacity = n.outlineStrength * (0.36 + Math.sin(this.elapsedTime * 4.2) * 0.08);
          n.groundHalo.rotation.z += dt * 0.48;
        } else {
          n.groundHalo.visible = false;
        }
      }

      if (n.hitFlashTimer > 0) {
        n.hitFlashTimer = Math.max(0, n.hitFlashTimer - dt);
        const flashVal = n.hitFlashTimer > 0 ? 0.45 : 0;
        for (const m of n.hitMeshes) {
          const mat = m.material as THREE.MeshStandardMaterial;
          if (mat.emissive && n.kind !== 'crystal_cluster') {
            mat.emissive.setRGB(flashVal, flashVal * 0.95, flashVal * 0.8);
          }
        }
      }

      if (n.isDepleted) {
        if (isTree && !n.isSapling && n.fallProgress > 0 && n.fallProgress < 1) {
          n.fallProgress = Math.min(1, n.fallProgress + dt * 1.6);
          const ease = n.fallProgress * n.fallProgress;
          n.activeVisual.rotation.z = Math.cos(n.fallDirAngle) * ease * 1.48;
          n.activeVisual.rotation.x = Math.sin(n.fallDirAngle) * ease * 1.48;
          n.activeVisual.scale.setScalar(1 - Math.max(0, (n.fallProgress - 0.72) / 0.28));
          if (n.fallProgress >= 1) {
            n.activeVisual.visible = false;
            n.activeVisual.rotation.set(0, 0, 0);
            n.activeVisual.scale.setScalar(1);
          }
        } else if (!isTree && n.activeVisual.visible) {
          n.activeVisual.visible = false;
        }

        if (n.suppressedByHousing) {
          if (n.stumpVisual) n.stumpVisual.visible = false;
          if (n.saplingVisual) n.saplingVisual.visible = false;
          continue;
        }

        if (n.saplingVisual) {
          const prog = 1 - n.regrowTimer / Math.max(n.regrowDuration, 1);
          if (n.isSapling || prog > 0.35) {
            n.saplingVisual.visible = true;
            n.saplingVisual.scale.setScalar(0.45 + prog * 0.85);
          } else {
            n.saplingVisual.visible = false;
          }
        }

        n.regrowTimer -= dt * (isTree ? rainGrowthMult : 1.0);
        if (n.regrowTimer <= 0) {
          // Final safety check: never regrow if a building or claimed plot was placed here after harvesting!
          const blockedByHouse = this.placedHouses.some((h) => Math.hypot(h.x - n.x, h.z - n.z) < 2.45);
          if (blockedByHouse || (!n.isSapling && this.isInsideClaimedPlot(n.x, n.z))) {
            n.suppressedByHousing = true;
            this.suppressedResourceIds.add(n.id);
            if (n.stumpVisual) n.stumpVisual.visible = false;
            if (n.saplingVisual) n.saplingVisual.visible = false;
            continue;
          }
          n.isDepleted = false;
          n.isSapling = false;
          n.hp = n.maxHp;
          n.fallProgress = 0;
          n.activeVisual.visible = true;
          n.activeVisual.scale.setScalar(1);
          if (n.saplingVisual) n.saplingVisual.visible = false;
          this.particles.spawnBurst(n.x, n.y + 1.0, n.z, 0x86efac, 8, 2.4);
        }
      }
    }
  }

  private isOnAnyWalkableDeckOrFloor(x: number, z: number): boolean {
    for (const deck of this.walkableDecks) {
      const dx = x - deck.x;
      const dz = z - deck.z;
      const cos = Math.cos(deck.rotY);
      const sin = Math.sin(deck.rotY);
      const lx = dx * cos - dz * sin;
      const lz = dx * sin + dz * cos;
      if (Math.abs(lx) <= deck.halfW + 0.15 && Math.abs(lz) <= deck.halfD + 0.15) {
        return true;
      }
    }
    const half = HOUSING_TILE_SIZE * 0.5 + 0.15;
    for (const h of this.placedHouses) {
      if (!h.group.visible) continue;
      if (isWalkableTopKind(h.kind) || h.kind === 'stairs') {
        if (Math.abs(x - h.x) <= half && Math.abs(z - h.z) <= half) return true;
      }
    }
    return false;
  }

  private resolveEntityStaticCollisions(
    x: number,
    z: number,
    y: number,
    radius: number,
    isMonster: boolean,
    prevX?: number,
    prevZ?: number,
  ): { x: number; z: number; blockedTile: PlacedHousingTile | null } {
    let cx = x;
    let cz = z;
    let blockedTile: PlacedHousingTile | null = null;

    // 1. Resources (trees, boulders, iron veins, crystals)
    for (const r of this.resources) {
      if (r.suppressedByHousing) continue;
      const collR = r.isDepleted ? r.radius * 0.55 : r.radius;
      const dx = cx - r.x;
      const dz = cz - r.z;
      const dist = Math.hypot(dx, dz);
      const minDist = radius + collR;
      if (dist > 0.0001 && dist < minDist) {
        const push = (minDist - dist) / dist;
        cx += dx * push;
        cz += dz * push;
      }
    }

    // 2. Interactive Landmarks (Campfire/Workbench, Signpost, Frontier Monolith)
    for (const lm of this.landmarks) {
      const dx = cx - lm.x;
      const dz = cz - lm.z;
      const dist = Math.hypot(dx, dz);
      const minDist = radius + lm.radius;
      if (dist > 0.0001 && dist < minDist) {
        const push = (minDist - dist) / dist;
        cx += dx * push;
        cz += dz * push;
      }
    }

    // 3. Static World Props & Biome Landmarks (Neighbor Cottages, Mine Cliff/Posts, Ruins Columns/Altar, Pier Pilings, Giant Mushrooms)
    for (const sc of this.staticColliders) {
      if (sc.shape === 'circle') {
        const dx = cx - sc.x;
        const dz = cz - sc.z;
        const dist = Math.hypot(dx, dz);
        const minDist = radius + sc.radius;
        if (dist > 0.0001 && dist < minDist) {
          const push = (minDist - dist) / dist;
          cx += dx * push;
          cz += dz * push;
        }
      } else {
        const dx = cx - sc.x;
        const dz = cz - sc.z;
        const cos = Math.cos(sc.rotY);
        const sin = Math.sin(sc.rotY);
        // World -> Local (matching Three.js Y rotation)
        const lx = dx * cos - dz * sin;
        const lz = dx * sin + dz * cos;
        const extX = sc.halfW + radius;
        const extZ = sc.halfD + radius;
        if (Math.abs(lx) < extX && Math.abs(lz) < extZ) {
          const penX = extX - Math.abs(lx);
          const penZ = extZ - Math.abs(lz);
          let pushLx = 0;
          let pushLz = 0;
          if (penX < penZ) {
            pushLx = lx >= 0 ? penX : -penX;
          } else {
            pushLz = lz >= 0 ? penZ : -penZ;
          }
          // Local -> World
          cx += pushLx * cos + pushLz * sin;
          cz += -pushLx * sin + pushLz * cos;
        }
      }
    }

    // 4. Placed Modular Housing (Walls, Closed Doors, Pillars, Furniture)
    for (const h of this.placedHouses) {
      if (!h.group.visible) continue;
      if (isFurnitureKind(h.kind)) {
        if (y + 1.3 < h.y || y > h.y + 1.45) continue;
        const halfW = h.kind === 'bed' ? 0.66 : h.kind === 'table' ? 0.62 : h.kind === 'cabinet' ? 0.56 : 0.34;
        const halfD = h.kind === 'bed' ? 1.02 : h.kind === 'table' ? 0.42 : h.kind === 'cabinet' ? 0.28 : 0.34;
        const dx = cx - h.x;
        const dz = cz - h.z;
        const cos = Math.cos(h.rotationY);
        const sin = Math.sin(h.rotationY);
        const lx = dx * cos - dz * sin;
        const lz = dx * sin + dz * cos;
        const extX = halfW + radius;
        const extZ = halfD + radius;
        if (Math.abs(lx) < extX && Math.abs(lz) < extZ) {
          const penX = extX - Math.abs(lx);
          const penZ = extZ - Math.abs(lz);
          const pushLx = penX < penZ ? (lx >= 0 ? penX : -penX) : 0;
          const pushLz = penX < penZ ? 0 : (lz >= 0 ? penZ : -penZ);
          cx += pushLx * cos + pushLz * sin;
          cz += -pushLx * sin + pushLz * cos;
          if (isMonster) blockedTile = h;
        }
        continue;
      }

      if (y + 1.55 < h.y + 0.08 || y > h.y + HOUSING_WALL_HEIGHT - 0.15) {
        continue;
      }

      if (h.kind === 'pillar') {
        const dx = cx - h.x;
        const dz = cz - h.z;
        const dist = Math.hypot(dx, dz);
        const minDist = radius + 0.24;
        if (dist > 0.0001 && dist < minDist) {
          const push = (minDist - dist) / dist;
          cx += dx * push;
          cz += dz * push;
          if (isMonster) blockedTile = h;
        }
        continue;
      }

      if (!isWallKind(h.kind)) continue;
      // Defensive Fence & Half Wall: block ALL monsters completely, while players can jump cleanly over them
      if (h.kind === 'fence' && !isMonster && y > h.y + 1.38) continue;
      if (h.kind === 'half_wall' && !isMonster && y > h.y + 1.28) continue;

      const dx = cx - h.x;
      const dz = cz - h.z;
      const cos = Math.cos(h.rotationY);
      const sin = Math.sin(h.rotationY);
      const lx = dx * cos - dz * sin;
      const lz = dx * sin + dz * cos;

      const halfW = HOUSING_TILE_SIZE * 0.5 + 0.08;
      const halfT = (h.kind === 'fence' ? 0.2 : 0.16) + radius;

      if (Math.abs(lx) < halfW && Math.abs(lz) < halfT) {
        // Players can walk through doorways & opened doors; monsters are ALWAYS blocked by fences, completed houses & closed doors!
        const passableForPlayer =
          !isMonster &&
          (h.kind === 'doorway' || (h.kind === 'door' && (h.isDoorOpen || h.doorAngle > 0.48)));
        if (passableForPlayer && Math.abs(lx) < 0.54 && y + 1.48 < h.y + 2.08) {
          continue;
        }
        const pushZ = lz >= 0 ? halfT - lz : -halfT - lz;
        cx += pushZ * sin;
        cz += pushZ * cos;
        if (isMonster) blockedTile = h;
      }
    }

    // 5. Completed House Monster Intrusion Barrier (Monsters can NEVER enter enclosed houses!)
    if (isMonster && this.isPointInCompletedHouse(cx, cz, y)) {
      if (prevX !== undefined && prevZ !== undefined && !this.isPointInCompletedHouse(prevX, prevZ, y)) {
        cx = prevX;
        cz = prevZ;
      } else {
        // Push outward away from cell center
        const gx = Math.round(cx / HOUSING_TILE_SIZE);
        const gz = Math.round(cz / HOUSING_TILE_SIZE);
        const cellX = gx * HOUSING_TILE_SIZE;
        const cellZ = gz * HOUSING_TILE_SIZE;
        const ddx = cx - cellX;
        const ddz = cz - cellZ;
        const dLen = Math.hypot(ddx, ddz) || 1;
        cx = cellX + (ddx / dLen) * (HOUSING_TILE_SIZE * 0.55 + radius);
        cz = cellZ + (ddz / dLen) * (HOUSING_TILE_SIZE * 0.55 + radius);
      }
      // Find nearest wall/door on this house to attack
      if (!blockedTile) {
        let bestD = Infinity;
        for (const h of this.placedHouses) {
          if (!h.group.visible || isFixtureKind(h.kind)) continue;
          const d = Math.hypot(h.x - cx, h.z - cz);
          if (d < bestD && d < 4.5) {
            bestD = d;
            blockedTile = h;
          }
        }
      }
    }

    // 6. Deep Water Shore Boundary (land monsters stay out of deep water; players can wade & swim freely!)
    if (isMonster && isWaterAt(cx, cz) && !this.isOnAnyWalkableDeckOrFloor(cx, cz)) {
      if (prevX !== undefined && prevZ !== undefined && (!isWaterAt(prevX, prevZ) || this.isOnAnyWalkableDeckOrFloor(prevX, prevZ))) {
        cx = prevX;
        cz = prevZ;
      }
    }

    return { x: cx, z: cz, blockedTile };
  }

  private findNearestTargetableHousing(
    mx: number,
    mz: number,
    maxDist: number,
  ): PlacedHousingTile | null {
    let best: PlacedHousingTile | null = null;
    let bestScore = Infinity;
    for (const h of this.placedHouses) {
      if (!h.group.visible || isFixtureKind(h.kind)) continue;
      const d = Math.hypot(h.x - mx, h.z - mz);
      if (d > maxDist) continue;
      // Prefer high-durability defensive fences first, then exterior walls/doors/windows/pillars over floors
      const priorityBias =
        h.kind === 'fence'
          ? -0.35
          : h.kind === 'wall' ||
              h.kind === 'half_wall' ||
              h.kind === 'door' ||
              h.kind === 'window_wall' ||
              h.kind === 'doorway'
            ? 0
            : h.kind === 'pillar' || h.kind === 'stairs'
              ? 0.5
              : 1.4;
      const score = d + priorityBias;
      if (score < bestScore) {
        bestScore = score;
        best = h;
      }
    }
    return best;
  }

  private updateMonsters(dt: number): void {
    const isPlaying = this.phase === 'playing';
    const maxPlayableR = this.frontierRingRadius - 1.5;
    const playerInSafeHouse =
      isPlaying && this.isPointInCompletedHouse(this.playerX, this.playerZ, this.playerY);
    const isNightNow = this.environment ? this.environment.isNightCreaturesActive() : false;

    // Nightfall / Dawn transition for Nocturnal Aggressive Undead packs
    if (isNightNow !== this.wasNightUndeadActive) {
      this.wasNightUndeadActive = isNightNow;
      for (const m of this.monsters) {
        if (!m.isNightOnly) continue;
        if (isNightNow) {
          m.isDead = false;
          m.hp = m.maxHp;
          m.x = m.homeX;
          m.z = m.homeZ;
          m.y = getTerrainHeight(m.x, m.z);
          m.aggroTimer = 0;
          m.btState = 'idle_patrol';
          m.siegeTargetId = null;
          m.breakReactTimer = 0;
          m.attackAnimTimer = 0;
          m.group.position.set(m.x, m.y, m.z);
          m.group.visible = true;
          this.particles.spawnBurst(m.x, m.y + 0.9, m.z, 0x34f5c5, 14, 3.6);
        } else {
          if (m.group.visible) {
            this.particles.spawnBurst(m.x, m.y + 0.9, m.z, 0xa855f7, 12, 3.2);
          }
          m.group.visible = false;
          m.aggroTimer = 0;
          m.btState = 'idle_patrol';
          m.siegeTargetId = null;
        }
      }
      if (isPlaying) {
        if (isNightNow) {
          this.showBanner('밤이 깊어지며 선공 언데드 무리가 깨어났습니다! 완성 가옥으로 대피하거나 처치하세요');
        } else {
          this.showBanner('새벽빛이 밝아지며 야간 언데드 무리가 안개 속으로 사라졌습니다');
        }
      }
    }

    const monsterCullDist = Math.max(68, this.cullDistance * 0.88);
    const monsterCullSq = monsterCullDist * monsterCullDist;
    const monsterSleepSq = (this.settings.distanceLod ? 48 : 88) ** 2;

    for (let mi = 0; mi < this.monsters.length; mi++) {
      const m = this.monsters[mi];
      // Night-only undead remain dormant & hidden during daytime
      if (m.isNightOnly && !isNightNow) {
        if (m.group.visible) m.group.visible = false;
        continue;
      }

      // Distance Culling & LOD for distant non-boss monsters (massive CPU/GPU savings!)
      if (!m.isDead && !m.isTrialBoss) {
        const mdx = m.x - this.playerX;
        const mdz = m.z - this.playerZ;
        const mDistSq = mdx * mdx + mdz * mdz;
        const withinView = mDistSq <= monsterCullSq;
        if (m.group.visible !== withinView) {
          m.group.visible = withinView;
        }
        if (!withinView) continue;
        if (this.settings.distanceLod && mDistSq > monsterSleepSq && m.aggroTimer <= 0) {
          if ((this.frameCounter + mi) % 6 !== 0) continue;
        }
      }

      if (m.isDead) {
        m.respawnTimer -= dt;
        if (m.respawnTimer <= 0) {
          m.isDead = false;
          m.hp = m.maxHp;
          m.x = m.homeX;
          m.z = m.homeZ;
          m.y = getTerrainHeight(m.x, m.z);
          m.aggroTimer = 0;
          m.knockVelX = 0;
          m.knockVelZ = 0;
          m.slowTimer = 0;
          m.btState = 'idle_patrol';
          m.siegeTargetId = null;
          m.attackAnimTimer = 0;
          m.breakReactTimer = 0;
          m.phase = 1;
          m.enrageTriggered = false;
          m.bossSpecialCooldown = 3.8;
          m.telegraphTimer = 0;
          m.telegraphLabel = null;
          if (m.telegraphGroup) m.telegraphGroup.visible = false;
          if (m.auraRing) {
            const aMat = m.auraRing.material as THREE.MeshBasicMaterial;
            aMat.color.setHex(
              m.species === 'alpha_frost_boss'
                ? 0x38bdf8
                : m.species === 'rune_golem_boss'
                  ? 0x22d3ee
                  : m.species === 'night_skeleton'
                    ? 0x34f5c5
                    : m.species === 'night_wraith'
                      ? 0xa855f7
                      : 0xf59e0b,
            );
          }
          m.group.position.set(m.x, m.y, m.z);
          m.group.visible = true;
          this.particles.spawnBurst(
            m.x,
            m.y + 0.8,
            m.z,
            m.isNightOnly ? 0x34f5c5 : 0x86efac,
            10,
            3.0,
          );
        }
        continue;
      }

      // Hit-flash emissive decay
      if (m.hitFlashTimer > 0) {
        m.hitFlashTimer = Math.max(0, m.hitFlashTimer - dt);
        const f = m.hitFlashTimer > 0 ? 0.65 : 0;
        for (const mesh of m.hitMeshes) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (mat.emissive && m.species !== 'forest_slime' && !m.isNightOnly) {
            mat.emissive.setRGB(f, f * 0.2, f * 0.15);
          }
        }
      }

      if (m.attackCooldown > 0) m.attackCooldown = Math.max(0, m.attackCooldown - dt);
      if (m.aggroTimer > 0) m.aggroTimer = Math.max(0, m.aggroTimer - dt);
      if (m.slowTimer > 0) m.slowTimer = Math.max(0, m.slowTimer - dt);
      if (m.attackAnimTimer > 0) m.attackAnimTimer = Math.max(0, m.attackAnimTimer - dt);
      if (m.breakReactTimer > 0) m.breakReactTimer = Math.max(0, m.breakReactTimer - dt);
      if (m.traitCooldown > 0) m.traitCooldown = Math.max(0, m.traitCooldown - dt);
      if (m.chargeTimer > 0) m.chargeTimer = Math.max(0, m.chargeTimer - dt);
      if (m.isBoss && m.bossSpecialCooldown > 0) {
        m.bossSpecialCooldown = Math.max(0, m.bossSpecialCooldown - dt);
      }

      // Ground aura ring pulse (Bosses & Nocturnal Undead)
      if (m.auraRing) {
        m.auraRing.rotation.z += dt * (m.phase === 2 ? 1.85 : m.isNightOnly ? 1.25 : 0.85);
        const pulse =
          1 + Math.sin(this.elapsedTime * (m.phase === 2 ? 7.2 : m.isNightOnly ? 4.4 : 3.2)) * 0.06;
        m.auraRing.scale.setScalar(pulse);
      }

      const prevMx = m.x;
      const prevMz = m.z;

      // Apply knockback
      if (Math.abs(m.knockVelX) > 0.04 || Math.abs(m.knockVelZ) > 0.04) {
        m.x += m.knockVelX * dt;
        m.z += m.knockVelZ * dt;
        const damp = Math.exp(-8.5 * dt);
        m.knockVelX *= damp;
        m.knockVelZ *= damp;
      }

      let movingSpeed = 0;
      const distToPlayer = Math.hypot(this.playerX - m.x, this.playerZ - m.z);
      const distToHome = Math.hypot(m.x - m.homeX, m.z - m.homeZ);

      // Aggressive Auto-Aggro (Disabled completely in Creative Mode so monsters never attack!)
      const isCreativeMode = this.gameMode === 'creative';
      if (isCreativeMode) {
        m.aggroTimer = 0;
        m.telegraphTimer = 0;
        m.telegraphLabel = null;
        if (m.telegraphGroup) m.telegraphGroup.visible = false;
      }
      const autoAggroRange = m.isNightOnly ? 18.0 : m.isBoss ? 11.5 : m.isAggressive ? 10.0 : 0;
      if (
        !isCreativeMode &&
        isPlaying &&
        autoAggroRange > 0 &&
        distToPlayer < autoAggroRange &&
        distToHome < (m.isNightOnly ? 36 : 26) &&
        !playerInSafeHouse
      ) {
        m.aggroTimer = Math.max(m.aggroTimer, m.isNightOnly ? 7.5 : 6.0);
      }

      // Boss Phase 2 Enrage trigger (< 50% HP)
      if (m.isBoss && !m.enrageTriggered && m.hp <= m.maxHp * 0.5) {
        m.enrageTriggered = true;
        m.phase = 2;
        m.bossSpecialCooldown = Math.min(m.bossSpecialCooldown, 1.5);
        if (m.auraRing) {
          const aMat = m.auraRing.material as THREE.MeshBasicMaterial;
          aMat.color.setHex(0xef4444);
        }
        this.sound.playBossRoar();
        this.particles.spawnBurst(m.x, m.y + 1.5, m.z, 0xef4444, 28, 6.2);
        this.particles.spawnRing(m.x, m.y + 0.2, m.z, 0xef4444, 4.8);
        this.shakeIntensity = Math.max(this.shakeIntensity, 0.24);
        this.showBanner(`[중간 보스 광폭화] ${m.label} 2페이즈 돌입! 강타 시전을 E(전사의 돌진)로 차단하세요!`);
      }

      // Leash back if too far from home
      const leashDist = m.isBoss ? 36 : m.isNightOnly ? 40 : 28;
      if (distToHome > leashDist) {
        m.aggroTimer = 0;
        m.siegeTargetId = null;
        m.telegraphTimer = 0;
        m.telegraphLabel = null;
        m.btState = 'return_home';
        if (m.telegraphGroup) m.telegraphGroup.visible = false;
      }

      const slowFactor = m.slowTimer > 0 ? 0.65 : 1.0;

      // ================================================================
      // BEHAVIOR TREE EVALUATION
      // Priority 1: Structure-Break Reaction Animation (`celebrate_break`)
      // Priority 2: Boss Telegraphed AoE Slam Cast
      // Priority 3: Housing Proximity Siege (`approach_structure` / `siege_structure`)
      // Priority 4: Player Chase & Melee (`chase_player` / `attack_player`)
      // Priority 5: Patrol / Return Home (`idle_patrol` / `return_home`)
      // ================================================================
      const steerToward = (tx: number, tz: number, turnRate = 8): void => {
        const targetYaw = Math.atan2(tx - m.x, tz - m.z);
        let diff = targetYaw - m.yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        m.yaw += diff * (1 - Math.exp(-turnRate * dt));
      };

      if (m.breakReactTimer > 0) {
        // Priority 1: Structure-Break Celebration / Roar Reaction Animation!
        m.btState = 'celebrate_break';
        if (isPlaying) steerToward(this.playerX, this.playerZ, 6);
      } else if (isPlaying && m.isBoss && m.telegraphTimer > 0) {
        // Priority 2: Active Boss Telegraphed AoE Slam Casting
        m.btState = 'attack_player';
        m.telegraphTimer = Math.max(0, m.telegraphTimer - dt);
        const prog = 1 - m.telegraphTimer / Math.max(m.telegraphDuration, 0.1);
        if (m.telegraphGroup && m.telegraphFill) {
          m.telegraphGroup.visible = true;
          m.telegraphGroup.scale.setScalar(m.telegraphRadius);
          m.telegraphFill.scale.setScalar(0.08 + prog * 0.92);
        }
        if (m.telegraphOuter) {
          m.telegraphOuter.rotation.z -= dt * 2.4;
        }

        if (m.telegraphTimer <= 0) {
          if (m.telegraphGroup) m.telegraphGroup.visible = false;
          const slamName = m.telegraphLabel ? m.telegraphLabel.replace(' 시전 중!', '') : '보스 강타';
          m.telegraphLabel = null;
          m.bossSpecialCooldown = m.phase === 2 ? 3.9 : 5.3;
          m.attackCooldown = 1.4;
          m.attackAnimDuration = 0.55;
          m.attackAnimTimer = 0.55;

          this.sound.playBossSlam();
          this.particles.spawnRing(m.x, m.y + 0.15, m.z, 0xef4444, m.telegraphRadius);
          this.particles.spawnBurst(m.x, m.y + 0.7, m.z, 0xf59e0b, 28, 6.8);
          this.shakeIntensity = Math.max(this.shakeIntensity, 0.26);

          // Damage nearby housing structures within boss slam radius!
          const slamStructDmg = Math.round(m.attackDamage * 2.2);
          for (const h of [...this.placedHouses]) {
            if (!h.group.visible || isFixtureKind(h.kind)) continue;
            if (Math.hypot(h.x - m.x, h.z - m.z) <= m.telegraphRadius + 1.1) {
              this.damageHousingTile(h, slamStructDmg, m);
            }
          }

          const liveDist = Math.hypot(this.playerX - m.x, this.playerZ - m.z);
          if (!playerInSafeHouse && liveDist <= m.telegraphRadius && this.playerHurtCooldown <= 0) {
            this.playerHurtCooldown = 0.95;
            const slamDmg = Math.round(m.attackDamage * (m.phase === 2 ? 1.65 : 1.45));
            this.applyPlayerDamage(slamDmg, slamName);
          }
        }
      } else {
        // Check Priority 3: Housing Proximity Siege Selector
        let activeSiegeTarget: PlacedHousingTile | null = m.siegeTargetId
          ? this.placedHouses.find((h) => h.id === m.siegeTargetId && h.group.visible) || null
          : null;

        if (isPlaying && !isCreativeMode && this.placedHouses.length > 0) {
          const houseDetectRadius = m.isNightOnly
            ? 17.5
            : m.isBoss || m.aggroTimer > 0
              ? 14.0
              : 8.5;
          if (!activeSiegeTarget) {
            const candidate = this.findNearestTargetableHousing(m.x, m.z, houseDetectRadius);
            if (candidate) {
              const candDist = Math.hypot(candidate.x - m.x, candidate.z - m.z);
              // Engage housing when player is sheltered inside, when undead/aggressive spots a house, or when a monster approaches housing closer than the player
              const shouldSiege =
                playerInSafeHouse ||
                m.isNightOnly ||
                candDist < Math.min(distToPlayer - 0.5, houseDetectRadius);
              if (shouldSiege) {
                activeSiegeTarget = candidate;
                m.siegeTargetId = candidate.id;
              }
            }
          } else {
            const targetDist = Math.hypot(activeSiegeTarget.x - m.x, activeSiegeTarget.z - m.z);
            if (targetDist > houseDetectRadius + 5.0 || (!playerInSafeHouse && distToPlayer < 3.6 && targetDist > 3.2)) {
              activeSiegeTarget = null;
              m.siegeTargetId = null;
            }
          }
        } else {
          activeSiegeTarget = null;
          m.siegeTargetId = null;
        }

        if (isPlaying && activeSiegeTarget && (playerInSafeHouse || m.isNightOnly || distToPlayer > 4.2)) {
          // Priority 3: Approach & Siege Player Housing Structure!
          const sdx = activeSiegeTarget.x - m.x;
          const sdz = activeSiegeTarget.z - m.z;
          const sDist = Math.hypot(sdx, sdz);
          const siegeReach = m.radius + 2.05;
          steerToward(activeSiegeTarget.x, activeSiegeTarget.z, 9);

          if (sDist > siegeReach) {
            m.btState = 'approach_structure';
            const spd = m.moveSpeed * (m.isNightOnly ? 1.08 : 0.96) * slowFactor;
            m.x += (sdx / Math.max(sDist, 0.001)) * spd * dt;
            m.z += (sdz / Math.max(sDist, 0.001)) * spd * dt;
            movingSpeed = spd;
          } else {
            m.btState = 'siege_structure';
            if (m.attackCooldown <= 0) {
              m.attackCooldown = m.isBoss ? 1.4 : m.isNightOnly ? 1.35 : 1.7;
              m.attackAnimDuration = 0.52;
              m.attackAnimTimer = 0.52;
              const siegeDmg = Math.round(
                m.attackDamage * (m.isBoss ? 1.85 : m.isNightOnly ? 1.35 : 1.05),
              );
              this.damageHousingTile(activeSiegeTarget, siegeDmg, m);
            }
          }
        } else if (isPlaying && m.aggroTimer > 0 && distToPlayer < (m.isBoss ? 24 : 20)) {
          // Priority 4: Chase & Attack Player
          const dx = this.playerX - m.x;
          const dz = this.playerZ - m.z;
          steerToward(this.playerX, this.playerZ, 8.5);

          // Trigger Boss Telegraphed AoE Slam when ready
          if (m.isBoss && m.bossSpecialCooldown <= 0 && distToPlayer <= 7.2) {
            m.btState = 'attack_player';
            m.telegraphDuration = m.phase === 2 ? 1.15 : 1.35;
            m.telegraphTimer = m.telegraphDuration;
            m.telegraphRadius = m.phase === 2 ? 5.2 : 4.5;
            m.telegraphLabel =
              m.species === 'elder_tusk_boss'
                ? '대지 강타 시전 중!'
                : m.species === 'coastal_titan_boss'
                  ? '해일 집게 강타 시전 중!'
                  : m.species === 'alpha_frost_boss'
                    ? '혹한의 파동 시전 중!'
                    : '룬 지진파 시전 중!';
            if (m.telegraphGroup && m.telegraphFill) {
              m.telegraphGroup.visible = true;
              m.telegraphGroup.scale.setScalar(m.telegraphRadius);
              m.telegraphFill.scale.setScalar(0.08);
            }
            this.sound.playBossRoar();
            this.spawnFeedback(`${m.telegraphLabel} (E 차단 가능)`, '#fca5a5', m.x, m.y + 2.6, m.z);
          } else if (distToPlayer > m.radius + 1.05) {
            m.btState = 'chase_player';
            const canDashSpecies =
              m.species === 'meadow_boar' ||
              m.species === 'elder_tusk_boss' ||
              m.species === 'frost_wolf' ||
              m.species === 'ember_wolf' ||
              m.species === 'wind_slime';
            if (
              canDashSpecies &&
              m.chargeTimer <= 0 &&
              m.traitCooldown <= 0 &&
              distToPlayer > 3.2 &&
              distToPlayer < 10.5
            ) {
              const invD = 1 / Math.max(distToPlayer, 0.001);
              m.chargeDirX = dx * invD;
              m.chargeDirZ = dz * invD;
              m.chargeTimer = m.species === 'wind_slime' ? 0.44 : 0.56;
              m.traitCooldown = m.isBoss ? 4.4 : 5.4;
              const dashHex =
                m.species === 'frost_wolf'
                  ? 0x7dd3fc
                  : m.species === 'ember_wolf'
                    ? 0xf97316
                    : m.species === 'wind_slime'
                      ? 0x99f6e4
                      : 0xfbbf24;
              this.particles.spawnRing(m.x, m.y + 0.14, m.z, dashHex, 2.2);
              this.particles.spawnBurst(m.x, m.y + 0.6, m.z, dashHex, 10, 4.2);
            }
            if (m.chargeTimer > 0) {
              const dashSpd = m.moveSpeed * 1.85 * slowFactor;
              m.x += m.chargeDirX * dashSpd * dt;
              m.z += m.chargeDirZ * dashSpd * dt;
              movingSpeed = dashSpd;
            } else {
              const spd = m.moveSpeed * (m.phase === 2 ? 1.28 : 1.15) * slowFactor;
              m.x += (dx / Math.max(distToPlayer, 0.001)) * spd * dt;
              m.z += (dz / Math.max(distToPlayer, 0.001)) * spd * dt;
              movingSpeed = spd;
            }
          } else if (!playerInSafeHouse && m.attackCooldown <= 0 && this.playerHurtCooldown <= 0) {
            m.btState = 'attack_player';
            m.attackCooldown = m.isBoss ? (m.phase === 2 ? 1.25 : 1.55) : m.isNightOnly ? 1.35 : 1.65;
            m.attackAnimDuration = 0.48;
            m.attackAnimTimer = 0.48;
            this.playerHurtCooldown = 0.85;
            const hitDmg = Math.round(m.attackDamage * (m.phase === 2 ? 1.2 : 1.0));
            let traitLabel: string | undefined = m.isNightOnly ? m.label : undefined;
            if (m.species === 'water_slime') {
              this.stamina = Math.max(0, this.stamina - 10);
              this.particles.spawnRing(this.playerX, this.playerY + 0.15, this.playerZ, 0x38bdf8, 2.3);
              traitLabel = '냉기 물보라';
            } else if (m.species === 'fire_slime' || m.species === 'ember_wolf') {
              this.particles.spawnBurst(this.playerX, this.playerY + 0.8, this.playerZ, 0xf97316, 12, 4.6);
              traitLabel = '화염 작열';
            } else if (m.species === 'earth_slime') {
              this.particles.spawnRing(this.playerX, this.playerY + 0.1, this.playerZ, 0xd97706, 2.6);
              traitLabel = '대지 진동';
            } else if (m.species === 'frost_wolf') {
              this.particles.spawnBurst(this.playerX, this.playerY + 0.8, this.playerZ, 0xbae6fd, 12, 4.2);
              traitLabel = '서리 송곳니';
            } else if (m.species === 'wind_slime') {
              this.particles.spawnRing(this.playerX, this.playerY + 0.2, this.playerZ, 0x99f6e4, 2.5);
              traitLabel = '질풍 강타';
            }
            this.applyPlayerDamage(hitDmg, traitLabel);
          }
        } else {
          // Priority 5: Patrol Wander / Return Home
          m.btState = distToHome > leashDist * 0.85 ? 'return_home' : 'idle_patrol';
          const wx = m.wanderTargetX - m.x;
          const wz = m.wanderTargetZ - m.z;
          const wd = Math.hypot(wx, wz);
          if (wd < 0.7) {
            m.wanderWait -= dt;
            if (m.wanderWait <= 0) {
              const ang = Math.random() * Math.PI * 2;
              const rad = 2.5 + Math.random() * 7.5;
              m.wanderTargetX = m.homeX + Math.cos(ang) * rad;
              m.wanderTargetZ = m.homeZ + Math.sin(ang) * rad;
              m.wanderWait = 1.6 + Math.random() * 2.6;
            }
          } else {
            const spd = m.moveSpeed * (m.isNightOnly ? 0.62 : 0.48) * slowFactor;
            m.x += (wx / wd) * spd * dt;
            m.z += (wz / wd) * spd * dt;
            steerToward(m.wanderTargetX, m.wanderTargetZ, 5);
            movingSpeed = spd;
          }
        }
      }

      // Resolve static landmarks, cottages, trees, water, walls, AND completed-house intrusion barriers!
      const mResolved = this.resolveEntityStaticCollisions(
        m.x,
        m.z,
        m.y,
        m.radius,
        true,
        prevMx,
        prevMz,
      );
      m.x = mResolved.x;
      m.z = mResolved.z;

      // Fallback Siege Hook: if blocked mid-chase by any housing wall/door, lock onto it and strike immediately
      if (isPlaying && mResolved.blockedTile && m.breakReactTimer <= 0) {
        m.siegeTargetId = mResolved.blockedTile.id;
        if (m.attackCooldown <= 0 && (m.aggroTimer > 0 || m.isAggressive)) {
          m.btState = 'siege_structure';
          m.attackCooldown = m.isBoss ? 1.45 : m.isNightOnly ? 1.35 : 1.7;
          m.attackAnimDuration = 0.52;
          m.attackAnimTimer = 0.52;
          const siegeDmg = Math.round(
            m.attackDamage * (m.isBoss ? 1.85 : m.isNightOnly ? 1.35 : 1.05),
          );
          this.damageHousingTile(mResolved.blockedTile, siegeDmg, m);
        }
      }

      // Clamp monster cleanly inside either the isolated 3D Trial Tower Dungeon OR Overworld ring
      if (m.isTrialBoss) {
        const ddx = m.x - TRIAL_DUNGEON_X;
        const ddz = m.z - TRIAL_DUNGEON_Z;
        const distD = Math.hypot(ddx, ddz);
        const maxD = TRIAL_DUNGEON_RADIUS - 1.9;
        if (distD > maxD) {
          const s = maxD / distD;
          m.x = TRIAL_DUNGEON_X + ddx * s;
          m.z = TRIAL_DUNGEON_Z + ddz * s;
        }
        m.y = TRIAL_DUNGEON_Y;
      } else {
        const rOrigin = Math.hypot(m.x, m.z);
        if (rOrigin > maxPlayableR) {
          const s = maxPlayableR / rOrigin;
          m.x *= s;
          m.z *= s;
        }
        const campDist = Math.hypot(m.x, m.z - 0.5);
        if (campDist < 6.8 && campDist > 0.01) {
          m.x = (m.x / campDist) * 6.8;
          m.z = 0.5 + ((m.z - 0.5) / campDist) * 6.8;
        }
        m.y = getTerrainHeight(m.x, m.z);
      }

      m.group.position.set(m.x, m.y, m.z);
      m.group.rotation.y = m.yaw;

      // ================================================================
      // SPECIES ARTICULATED LOCOMOTION, SIEGE STRIKE & BREAK-REACTION ANIMATIONS
      // ================================================================
      const isMoving = movingSpeed > 0.2;
      const isSlimeLike =
        m.species === 'forest_slime' ||
        m.species === 'water_slime' ||
        m.species === 'fire_slime' ||
        m.species === 'wind_slime' ||
        m.species === 'earth_slime';
      const isWolfLike =
        m.species === 'frost_wolf' ||
        m.species === 'ember_wolf' ||
        m.species === 'alpha_frost_boss' ||
        m.species === 'white_tiger_boss';
      const isBoarLike = m.species === 'meadow_boar' || m.species === 'elder_tusk_boss';
      const isUndead = m.species === 'night_skeleton' || m.species === 'night_wraith';
      const isFlyingSpirit =
        m.species === 'azure_dragon_boss' ||
        m.species === 'vermilion_phoenix_boss' ||
        m.species === 'water_spirit' ||
        m.species === 'wind_spirit' ||
        m.species === 'fire_spirit' ||
        m.species === 'earth_spirit';
      m.hopPhase +=
        dt *
        (isMoving
          ? isWolfLike
            ? 8.2
            : m.species === 'rune_golem_boss' || m.species === 'black_tortoise_boss'
              ? 4.6
              : isUndead || isFlyingSpirit
                ? 7.2
                : 6.8
          : 2.3);

      // Normalized strike & break-reaction envelopes (0..1)
      const atkNorm =
        m.attackAnimTimer > 0 && m.attackAnimDuration > 0
          ? 1 - m.attackAnimTimer / m.attackAnimDuration
          : 0;
      const atkLunge = atkNorm > 0 ? Math.sin(atkNorm * Math.PI) : 0;
      const reactNorm = m.breakReactTimer > 0 ? 1 - Math.min(1, m.breakReactTimer / 1.55) : 0;
      const isReacting = m.breakReactTimer > 0;

      // Reset transient body offsets smoothly before species overrides
      m.bodyGroup.position.x = 0;
      m.bodyGroup.position.z = atkLunge * 0.36;
      m.bodyGroup.rotation.x = m.chargeTimer > 0 ? 0.24 : 0;
      m.bodyGroup.rotation.z = 0;

      if (isSlimeLike) {
        if (isReacting) {
          // Slime break reaction: high jubilant bounce + spin!
          const hop = Math.abs(Math.sin(reactNorm * Math.PI * 3));
          const stretch = 1 + hop * 0.42;
          const squash = 1 / Math.sqrt(stretch);
          m.bodyGroup.scale.set(squash, stretch, squash);
          m.bodyGroup.position.y = hop * 0.68;
          m.bodyGroup.rotation.y = reactNorm * Math.PI * 4;
        } else {
          m.bodyGroup.rotation.y = 0;
          const bounce = Math.abs(Math.sin(m.hopPhase));
          const stretch = 1 + bounce * (isMoving ? 0.24 : 0.08) + atkLunge * 0.28;
          const squash = 1 / Math.sqrt(stretch);
          m.bodyGroup.scale.set(squash, stretch, squash);
          m.bodyGroup.position.y = (isMoving ? bounce * 0.26 : 0) + atkLunge * 0.22;
        }
        if (m.tail) {
          const spinRate = m.species === 'wind_slime' ? 5.2 : 1.9;
          m.tail.rotation.y += dt * (isReacting ? 7.5 : spinRate);
          m.tail.rotation.x = Math.sin(this.elapsedTime * 2.1 + m.homeX) * 0.28;
        }
        if (m.headPivot) {
          m.headPivot.rotation.z = Math.sin(m.hopPhase * 1.1) * (isMoving ? 0.18 : 0.07);
          m.headPivot.rotation.x = Math.cos(m.hopPhase * 0.9) * (isMoving ? 0.14 : 0.05);
        }
      } else if (isFlyingSpirit) {
        // Hovering Eastern Azure Dragon & Southern Vermilion Phoenix Guardian Spirits
        const isPhoenix = m.species === 'vermilion_phoenix_boss';
        const hover = Math.sin(this.elapsedTime * (isPhoenix ? 3.4 : 2.6) + m.homeX) * 0.28;
        m.bodyGroup.position.y = hover + (isReacting ? Math.sin(reactNorm * Math.PI) * 0.55 : 0);
        m.bodyGroup.rotation.x = atkLunge * 0.26 - (isReacting ? Math.sin(reactNorm * Math.PI) * 0.25 : 0);

        if (isPhoenix && m.legs.length >= 2) {
          // Majestic sweeping wingbeat!
          const flap = Math.sin(this.elapsedTime * (isMoving || atkNorm > 0 ? 7.2 : 4.2)) * 0.56;
          m.legs[0].rotation.z = flap;
          m.legs[1].rotation.z = -flap;
        } else if (!isPhoenix && m.legs.length >= 4) {
          // Dragon claw gesture
          const clawWave = Math.sin(this.elapsedTime * 3.4) * 0.24;
          m.legs[0].rotation.x = clawWave - atkLunge * 0.85;
          m.legs[1].rotation.x = -clawWave - atkLunge * 0.85;
        }
        if (m.tail) {
          if (isPhoenix) {
            // Spinning Solar Sunburst Halo behind Phoenix
            m.tail.rotation.z += dt * 1.65;
          } else {
            // Orbiting Sacred Dragon Pearl (여의주)
            m.tail.rotation.y += dt * 2.2;
          }
        }
        if (m.tailSegments && m.tailSegments.length > 0) {
          for (let ti = 0; ti < m.tailSegments.length; ti++) {
            if (isPhoenix) {
              m.tailSegments[ti].rotation.x = Math.sin(this.elapsedTime * 4.5 - ti * 0.6) * 0.22;
            } else {
              m.tailSegments[ti].rotation.y = Math.sin(this.elapsedTime * 3.6 - ti * 0.72) * 0.28;
              m.tailSegments[ti].rotation.x = Math.cos(this.elapsedTime * 2.8 - ti * 0.55) * 0.1;
            }
          }
        }
        if (m.headPivot) {
          m.headPivot.rotation.y = Math.sin(this.elapsedTime * 2.2) * 0.18;
          m.headPivot.rotation.x = atkLunge * 0.35;
        }
      } else if (isUndead) {
        // Bipedal Nocturnal Undead (Skeleton Knight & Levitating Wraith Reaper)
        const isWraith = m.species === 'night_wraith';
        const stride = isMoving ? Math.sin(m.hopPhase) * 0.58 : 0;

        if (isReacting) {
          // Dramatic Undead Structure-Break Reaction: raise weapon skyward, levitate/rear back & spectral roar!
          const wave = Math.sin(reactNorm * Math.PI);
          m.bodyGroup.position.y = (isWraith ? 0.42 : 0.08) + wave * 0.34;
          m.bodyGroup.rotation.x = -0.26 * wave;
          if (m.legs.length >= 2) {
            m.legs[0].rotation.x = -2.1 * wave + Math.sin(this.elapsedTime * 16) * 0.18;
            m.legs[1].rotation.x = -2.35 * wave - Math.sin(this.elapsedTime * 16) * 0.18;
          }
          if (m.headPivot) {
            m.headPivot.rotation.x = -0.45 * wave;
            m.headPivot.rotation.y = Math.sin(this.elapsedTime * 14) * 0.25;
          }
        } else if (atkNorm > 0) {
          // Overhead weapon slash / scythe cleave animation!
          const swingCurve = atkNorm < 0.35 ? -(atkNorm / 0.35) * 1.95 : -1.95 + ((atkNorm - 0.35) / 0.65) * 3.1;
          m.bodyGroup.position.y = isWraith ? 0.22 + Math.sin(this.elapsedTime * 3.6) * 0.12 : 0.04;
          m.bodyGroup.rotation.x = atkLunge * 0.24;
          if (m.legs.length >= 2) {
            m.legs[1].rotation.x = swingCurve; // Right weapon arm cleaves down!
            m.legs[0].rotation.x = -0.5 * atkLunge; // Left shield/guard arm braces
          }
        } else {
          m.bodyGroup.position.y = isWraith
            ? 0.22 + Math.sin(this.elapsedTime * 3.2 + m.homeX) * 0.14
            : isMoving
              ? Math.abs(Math.sin(m.hopPhase)) * 0.075
              : Math.sin(m.hopPhase) * 0.02;
          if (isWraith) {
            m.bodyGroup.position.x = Math.sin(this.elapsedTime * 2.2 + m.homeX) * 0.16;
          }
          if (m.legs.length >= 4) {
            if (isWraith) {
              m.legs[0].rotation.x = -0.28 + Math.sin(this.elapsedTime * 2.8) * 0.14;
              m.legs[1].rotation.x = -0.45 + Math.cos(this.elapsedTime * 2.8) * 0.18;
              // Orbit spectral soul wisps
              m.legs[2].position.y = 0.95 + Math.sin(this.elapsedTime * 4.2) * 0.18;
              m.legs[3].position.y = 0.95 + Math.cos(this.elapsedTime * 4.2) * 0.18;
            } else {
              // Skeleton arms & legs walk cycle
              m.legs[0].rotation.x = -stride * 0.55 - 0.2;
              m.legs[1].rotation.x = stride * 0.55 - 0.35;
              m.legs[2].rotation.x = stride;
              m.legs[3].rotation.x = -stride;
            }
          }
          if (m.headPivot) {
            m.headPivot.rotation.x = THREE.MathUtils.damp(
              m.headPivot.rotation.x,
              m.aggroTimer > 0 ? 0.12 : 0.02,
              8,
              dt,
            );
            m.headPivot.rotation.y = Math.sin(m.hopPhase * 0.5) * 0.16;
          }
        }

        if (m.tailSegments && m.tailSegments.length > 0) {
          for (let ti = 0; ti < m.tailSegments.length; ti++) {
            m.tailSegments[ti].rotation.x =
              0.16 + Math.sin(this.elapsedTime * 4.5 - ti * 0.7) * (0.14 + ti * 0.05);
          }
        } else if (m.tail) {
          m.tail.rotation.x = 0.16 + Math.sin(this.elapsedTime * 3.8) * 0.12;
        }
      } else {
        // Quadrupeds & Heavy Golem Boss
        const isCasting = m.telegraphTimer > 0;
        const stride = isMoving ? Math.sin(m.hopPhase) * (isWolfLike ? 0.62 : 0.5) : 0;
        const cosStride = isMoving ? Math.cos(m.hopPhase) : 0;

        if (isReacting) {
          // Quadruped / Boss Structure-Break Reaction: rear up on hind legs, stomp & roar/howl skyward!
          const wave = Math.sin(reactNorm * Math.PI);
          m.bodyGroup.rotation.x = -0.34 * wave;
          m.bodyGroup.position.y = wave * 0.26 + Math.abs(Math.sin(reactNorm * Math.PI * 3)) * 0.08;
          if (m.legs.length >= 4) {
            m.legs[0].rotation.x = -1.35 * wave + Math.sin(this.elapsedTime * 15) * 0.22;
            m.legs[1].rotation.x = -1.35 * wave - Math.sin(this.elapsedTime * 15) * 0.22;
            m.legs[2].rotation.x = 0.25 * wave;
            m.legs[3].rotation.x = 0.25 * wave;
          }
          if (m.headPivot) {
            m.headPivot.rotation.x = m.breakReactKind === 'howl' ? -0.68 * wave : -0.42 * wave;
            m.headPivot.rotation.y = Math.sin(this.elapsedTime * 14) * 0.24;
          }
        } else {
          if (m.legs.length >= 4) {
            if (isCasting && m.species === 'rune_golem_boss') {
              const windup = 1 - m.telegraphTimer / Math.max(m.telegraphDuration, 0.1);
              m.legs[0].rotation.x = -2.2 * windup;
              m.legs[1].rotation.x = -2.2 * windup;
              m.legs[2].rotation.x = 0;
              m.legs[3].rotation.x = 0;
            } else if (atkNorm > 0) {
              // Siege/melee lunge strike!
              m.bodyGroup.rotation.x = atkLunge * 0.22;
              m.legs[0].rotation.x = -1.1 * atkLunge;
              m.legs[1].rotation.x = -1.1 * atkLunge;
              m.legs[2].rotation.x = 0.35 * atkLunge;
              m.legs[3].rotation.x = 0.35 * atkLunge;
            } else {
              m.legs[0].rotation.x = stride;
              m.legs[1].rotation.x = -stride;
              m.legs[2].rotation.x = -stride;
              m.legs[3].rotation.x = stride;
            }
          }
          if (m.lowerLegs && m.lowerLegs.length >= 4) {
            const bendAmp = isWolfLike ? 0.45 : 0.32;
            m.lowerLegs[0].rotation.x = Math.max(0, -cosStride) * bendAmp;
            m.lowerLegs[1].rotation.x = Math.max(0, cosStride) * bendAmp;
            m.lowerLegs[2].rotation.x = Math.max(0, cosStride) * bendAmp;
            m.lowerLegs[3].rotation.x = Math.max(0, -cosStride) * bendAmp;
          }
          m.bodyGroup.position.y = isCasting
            ? Math.sin(this.elapsedTime * 18) * 0.04
            : isMoving
              ? Math.abs(Math.sin(m.hopPhase)) * (isWolfLike ? 0.085 : 0.06)
              : Math.sin(m.hopPhase) * 0.014;

          if (m.headPivot) {
            if (atkNorm > 0) {
              // Headbutt / bite snap forward during siege/melee strike
              m.headPivot.rotation.x = 0.38 * atkLunge;
            } else if (isBoarLike) {
              const chargePitch = m.aggroTimer > 0 ? 0.24 : Math.sin(m.hopPhase * 0.7) * 0.08;
              m.headPivot.rotation.x = THREE.MathUtils.damp(m.headPivot.rotation.x, chargePitch, 8, dt);
              m.headPivot.rotation.y = Math.sin(m.hopPhase * 0.45) * (isMoving ? 0.08 : 0.16);
            } else {
              const stalkPitch = m.aggroTimer > 0 ? 0.2 : -0.04 + Math.sin(m.hopPhase * 0.6) * 0.05;
              m.headPivot.rotation.x = THREE.MathUtils.damp(m.headPivot.rotation.x, stalkPitch, 9, dt);
              m.headPivot.rotation.y = Math.sin(m.hopPhase * 0.55) * (isMoving ? 0.07 : 0.2);
            }
          }
        }

        if (m.tailSegments && m.tailSegments.length > 0) {
          for (let ti = 0; ti < m.tailSegments.length; ti++) {
            m.tailSegments[ti].rotation.y =
              Math.sin(m.hopPhase * 1.25 - ti * 0.6) * (0.18 + ti * 0.06);
          }
        } else if (m.tail) {
          m.tail.rotation.y = Math.sin(m.hopPhase * 1.5) * 0.36;
        }
      }

      // Spin elemental shards / orbiting soul wisps / dorsal energy crests
      if (m.orbitalGroup) {
        const orbitSpd = m.chargeTimer > 0 ? 7.2 : m.aggroTimer > 0 ? 3.8 : 1.7;
        m.orbitalGroup.rotation.y += dt * orbitSpd;
        m.orbitalGroup.position.y = Math.sin(this.elapsedTime * 2.8 + m.homeX) * 0.055;
      }
    }
  }

  private emitHudSnapshot(): void {
    const tierCfg = WORLD_TIERS[this.worldTier - 1];
    const nearest = this.phase === 'playing' ? this.findNearestInteractable() : null;
    let nearbyHint: InteractableHint | null = null;

    if (nearest?.type === 'monster') {
      const m = nearest.monster;
      const dropHint =
        m.species === 'meadow_boar'
          ? '드롭: 가죽 · 송곳니'
          : m.species === 'forest_slime'
            ? '드롭: 가죽 · 마력 정수'
            : '드롭: 가죽 · 송곳니 · 마력 정수';
      nearbyHint = {
        id: m.id,
        kind: 'monster',
        label: m.label,
        actionLabel: '공격하기',
        hp: m.hp,
        maxHp: m.maxHp,
        isDepleted: false,
        regrowProgress: 1,
        detailText: dropHint,
      };
    } else if (nearest?.type === 'resource') {
      const n = nearest.node;
      nearbyHint = {
        id: n.id,
        kind: n.kind,
        label: n.isSapling && n.isDepleted ? `${n.label} 묘목` : n.label,
        actionLabel: n.isDepleted ? (n.isSapling ? '성장 중...' : '재생 대기 중') : n.actionLabel,
        hp: n.hp,
        maxHp: n.maxHp,
        isDepleted: n.isDepleted,
        regrowProgress: n.isDepleted ? 1 - n.regrowTimer / Math.max(n.regrowDuration, 1) : 1,
      };
    } else if (nearest?.type === 'landmark') {
      const lm = nearest.landmark;
      let detailText: string | undefined;
      let canAfford = true;
      if (lm.kind === 'frontier_stone') {
        if (this.worldTier >= WORLD_TIERS.length) {
          detailText = '최대 단계까지 확장 완료';
        } else {
          const next = WORLD_TIERS[this.worldTier];
          const c = next.unlockCost;
          canAfford =
            this.inventory.wood >= c.wood &&
            this.inventory.stone >= c.stone &&
            this.inventory.iron >= c.iron &&
            this.inventory.crystal >= c.crystal;
          const parts = [];
          if (c.wood > 0) parts.push(`원목 ${c.wood}`);
          if (c.stone > 0) parts.push(`석재 ${c.stone}`);
          if (c.iron > 0) parts.push(`철광석 ${c.iron}`);
          if (c.crystal > 0) parts.push(`마력 수정 ${c.crystal}`);
          detailText = `${next.name} 개방 (${parts.join(' · ')})`;
        }
      } else if (lm.kind === 'trial_tower') {
        detailText = `최고 ${this.trialTowerHighestCleared}/${TRIAL_TOWER_FLOORS.length}층 클리어 · 전용 3D 던전 보스 도전`;
      }
      nearbyHint = {
        id: lm.id,
        kind: lm.kind,
        label: lm.label,
        actionLabel: lm.kind === 'workbench' ? '제작 작업대 열기' : lm.actionLabel,
        hp: 1,
        maxHp: 1,
        isDepleted: false,
        regrowProgress: 1,
        canAfford,
        detailText,
      };
    } else if (nearest?.type === 'housing' && this.housingMode === 'off') {
      const h = nearest.house;
      const isDamaged = h.durability < h.maxDurability;
      if (h.kind === 'door') {
        nearbyHint = {
          id: h.id,
          kind: 'housing',
          label: h.label,
          actionLabel: h.isDoorOpen ? '문 닫기' : '문 열기',
          hp: h.durability,
          maxHp: h.maxDurability,
          isDepleted: false,
          regrowProgress: 1,
          detailText: isDamaged
            ? `내구도 ${h.durability}/${h.maxDurability} · 클릭/F 여닫기 · H 편집·수리`
            : `내구도 ${h.durability}/${h.maxDurability} · 클릭 또는 F 키로 여닫기`,
        };
      } else if (isDamaged) {
        nearbyHint = {
          id: h.id,
          kind: 'housing',
          label: `${h.label} (파손됨)`,
          actionLabel: '즉시 수리하기',
          hp: h.durability,
          maxHp: h.maxDurability,
          isDepleted: false,
          regrowProgress: 1,
          detailText: `내구도 ${h.durability}/${h.maxDurability} · F 키로 수리 또는 H 키로 편집`,
        };
      } else {
        nearbyHint = {
          id: h.id,
          kind: 'housing',
          label: h.label,
          actionLabel: '타일 편집하기',
          hp: h.durability,
          maxHp: h.maxDurability,
          isDepleted: false,
          regrowProgress: 1,
          detailText: `내구도 ${h.durability}/${h.maxDurability} · 색상·자재·형태·이동·철거`,
        };
      }
    }

    const minimapEntities: MinimapEntity[] = [];
    for (const p of this.claimedPlots) {
      minimapEntities.push({
        id: p.id,
        x: p.x,
        z: p.z,
        kind: 'plot',
        active: true,
        radius: p.radius,
      });
    }
    for (const op of this.otherPlayerPlots) {
      minimapEntities.push({
        id: op.id,
        x: op.x,
        z: op.z,
        kind: 'other_housing',
        active: true,
      });
    }
    for (const lm of this.landmarks) {
      minimapEntities.push({
        id: lm.id,
        x: lm.x,
        z: lm.z,
        kind:
          lm.kind === 'frontier_stone'
            ? 'frontier'
            : lm.kind === 'trial_tower'
              ? 'trial_tower'
              : 'landmark',
        active: true,
      });
    }
    for (const h of this.placedHouses) {
      minimapEntities.push({
        id: h.id,
        x: h.x,
        z: h.z,
        kind: 'housing',
        active: true,
      });
    }
    for (const r of this.resources) {
      if (r.suppressedByHousing) continue;
      if (r.isSapling && r.isDepleted) {
        minimapEntities.push({
          id: r.id,
          x: r.x,
          z: r.z,
          kind: 'sapling',
          active: true,
          regrowProgress: THREE.MathUtils.clamp(1 - r.regrowTimer / Math.max(r.regrowDuration, 1), 0, 1),
        });
        continue;
      }
      const mk: MinimapEntity['kind'] =
        r.foodYield
          ? 'sapling'
          : r.kind === 'oak_tree' || r.kind === 'pine_tree' || r.kind === 'birch_tree'
            ? 'tree'
            : r.kind === 'iron_vein'
              ? 'iron'
              : r.kind === 'crystal_cluster'
                ? 'crystal'
                : 'rock';
      minimapEntities.push({
        id: r.id,
        x: r.x,
        z: r.z,
        kind: mk,
        active: !r.isDepleted,
      });
    }
    let activeBoss: BossHudSnapshot | null = null;
    let nearestBossDist = Infinity;
    const nearbyMonsters: NearbyMonsterOverlay[] = [];
    for (const m of this.monsters) {
      if (!m.isDead && m.group.visible) {
        minimapEntities.push({
          id: m.id,
          x: m.x,
          z: m.z,
          kind: m.isNightOnly ? 'undead' : m.isBoss ? 'boss' : 'monster',
          active: true,
        });
        const md = Math.hypot(m.x - this.playerX, m.z - this.playerZ);
        if (this.phase === 'playing' && this.renderer && md <= 22.0) {
          _projVec.set(m.x, m.y + m.headHeight, m.z).project(this.camera);
          if (_projVec.z >= -1 && _projVec.z <= 1) {
            const screenX = (_projVec.x * 0.5 + 0.5) * 100;
            const screenY = (-_projVec.y * 0.5 + 0.5) * 100;
            if (screenX >= -6 && screenX <= 106 && screenY >= -6 && screenY <= 102) {
              nearbyMonsters.push({
                id: m.id,
                label: m.label,
                element: m.element,
                weakness: m.weakness,
                hp: m.hp,
                maxHp: m.maxHp,
                isBoss: m.isBoss,
                isAggressive: m.isAggressive || m.aggroTimer > 0,
                isTrialBoss: m.isTrialBoss,
                trialFloor: m.trialFloor,
                screenX,
                screenY,
                distance: md,
              });
            }
          }
        }
        if (m.isBoss) {
          if ((md <= 25 || m.aggroTimer > 0) && md < nearestBossDist) {
            nearestBossDist = md;
            activeBoss = {
              id: m.id,
              name: m.label,
              title: m.bossTitle || '구역 중간 보스',
              tier: m.tier,
              element: m.element,
              weakness: m.weakness,
              hp: m.hp,
              maxHp: m.maxHp,
              enraged: m.phase === 2,
              telegraphLabel: m.telegraphLabel,
              telegraphProgress:
                m.telegraphTimer > 0 && m.telegraphDuration > 0
                  ? THREE.MathUtils.clamp(1 - m.telegraphTimer / m.telegraphDuration, 0, 1)
                  : 0,
              distance: Math.round(md),
            };
          }
        }
      }
    }
    nearbyMonsters.sort((a, b) => a.distance - b.distance);
    if (nearbyMonsters.length > 8) nearbyMonsters.length = 8;
    for (let i = 0; i < this.lanterns.length; i++) {
      minimapEntities.push({
        id: `lantern_${i}`,
        x: this.lanterns[i].x,
        z: this.lanterns[i].z,
        kind: 'lantern',
        active: true,
      });
    }
    for (const rp of this.remotePlayers.values()) {
      minimapEntities.push({
        id: `rp_${rp.id}`,
        x: rp.x,
        z: rp.z,
        kind: 'remote_player',
        active: true,
        label: rp.name,
      });
    }

    const regionInfo = getRegionInfoAt(this.playerX, this.playerZ);
    const claimCheck = this.evaluateLandPlotClaim(this.playerX, this.playerZ);
    const damagedPieceCount = this.placedHouses.filter((h) => h.durability < h.maxDurability).length;
    const inCompletedHouse = this.isPointInCompletedHouse(this.playerX, this.playerZ, this.playerY);

    this.callbacks.onHudUpdate({
      phase: this.phase,
      gameMode: this.gameMode,
      worldId: this.currentWorldId,
      worldName: this.currentWorldName,
      playerClass: this.playerClass,
      worldTier: this.worldTier,
      zoneName: `${regionInfo.name} · ${regionInfo.cardinalLabel}`,
      worldRadius: tierCfg.radius,
      playerX: this.playerX,
      playerZ: this.playerZ,
      playerYaw: this.playerYaw,
      cameraYaw: this.cameraYaw,
      hp: Math.round(this.hp),
      maxHp: this.maxHp,
      stamina: Math.round(this.stamina),
      maxStamina: this.maxStamina,
      hunger: Math.round(this.hunger),
      maxHunger: this.maxHunger,
      selectedFood: this.selectedFood,
      cameraMode: this.cameraMode,
      isFullscreen: this.isFullscreen,
      isSwimming: this.isSwimming,
      breath: Math.round(this.breath),
      maxBreath: this.maxBreath,
      isSprinting: (this.heldKeys.has('ShiftLeft') || this.heldKeys.has('ShiftRight')) && Math.hypot(this.velX, this.velZ) > 6.5,
      isGrounded: this.isGrounded,
      level: this.level,
      exp: this.exp,
      nextExp: this.nextExp,
      inventory: { ...this.inventory },
      upgrades: { ...this.upgrades },
      ownedWeapons: [...this.ownedWeapons],
      equippedWeapon: this.equippedWeapon,
      ownedArmors: [...this.ownedArmors],
      equippedArmor: this.equippedArmor,
      autoEquipTool: this.autoEquipTool,
      hotbarSlots: [...this.hotbarSlots],
      quests: this.buildQuestsSnapshot(),
      dailyQuests: this.buildDailyQuestsSnapshot(),
      activeEmote: this.activeEmote,
      nearbyHint,
      gatherProgress: this.activeGatherNode ? 1 - this.activeGatherNode.hp / this.activeGatherNode.maxHp : 0,
      isGathering: this.swingTimer > 0.05,
      placedLanterns: this.lanterns.length,
      plantedSaplings: this.plantedSaplings,
      harvestedTotal: this.harvestedTotal,
      monstersDefeated: this.monstersDefeated,
      bossesDefeated: this.bossesDefeated,
      activeBoss,
      warriorSkills: this.buildWarriorSkillsSnapshot(),
      skillMasteryPoints: this.skillMasteryPoints,
      warcryBuffRemaining: Number(this.warcryBuffRemaining.toFixed(1)),
      warcryBuffDuration: this.warcryBuffDuration,
      proficiencies: this.buildProficienciesSnapshot(),
      minimapEntities,
      bannerMessage: this.bannerMessage,
      webglError: this.webglError,
      timeOfDay: this.environment ? this.environment.timeOfDay : 9.5,
      timeClockText: this.environment ? this.environment.getTimeClockText() : '09:30',
      timePhaseLabel: this.environment ? this.environment.getTimePhaseLabel() : '아침',
      timePaused: this.environment ? this.environment.timePaused : false,
      weather: this.environment ? this.environment.weather : 'clear',
      weatherLabel: this.environment ? this.environment.getWeatherLabel() : '맑음',
      autoWeather: this.environment ? this.environment.autoWeather : true,
      rainGrowthBoost: this.environment ? this.environment.isRaining() : false,
      windStrength: this.environment ? this.environment.windStrength : 0.25,
      nightCreaturesActive: this.environment ? this.environment.isNightCreaturesActive() : false,
      bgmEnabled: this.sound.isBgmEnabled(),
      bgmThemeLabel:
        this.environment && this.environment.nightFactor >= 0.5
          ? '밤 테마 · 달빛 반딧불'
          : '낮 테마 · 여명의 초원',
      housing: {
        mode: this.housingMode,
        activeStage: this.housingActiveStage,
        selectedBlueprint: this.selectedBlueprint,
        selectedMaterial: this.selectedMaterial,
        selectedColor: this.selectedColor,
        gridSnap: this.housingGridSnap,
        freeRotate: this.housingFreeRotate,
        heightOffset: this.housingHeightOffset,
        previewValid: this.ghostValid,
        previewReason: this.ghostInvalidReason,
        previewSnapped: this.ghostSnapped,
        previewRotationDeg:
          this.housingFreeRotate || !this.housingGridSnap || isFurnitureKind(this.selectedBlueprint)
            ? ((Math.round(this.housingFreeYawDeg) % 360) + 360) % 360
            : (this.ghostRotationStep * 90) % 360,
        previewLevel: this.ghostLevel,
        selectedHouse: (() => {
          const h = this.selectedHouseId
            ? this.placedHouses.find((item) => item.id === this.selectedHouseId)
            : null;
          return h
            ? {
                id: h.id,
                kind: h.kind,
                name: h.label,
                material: h.material,
                color: h.color,
                gx: h.gx,
                gz: h.gz,
                level: h.level,
                edge: h.edge,
                rotationStep: h.rotationStep,
                rotationY: h.rotationY,
                gridSnapped: h.gridSnapped,
                heightOffset: h.heightOffset,
                baseY: h.baseY,
                x: h.x,
                z: h.z,
                isDoorOpen: h.kind === 'door' ? h.isDoorOpen : undefined,
                durability: h.durability,
                maxDurability: h.maxDurability,
                ownerId: h.ownerId,
              }
            : null;
        })(),
        placedCount: this.placedHouses.length,
        claimedPlotsCount: this.claimedPlots.length,
        inClaimedPlot: this.isInsideClaimedPlot(this.playerX, this.playerZ),
        canClaimPlotHere: claimCheck.valid,
        claimPlotReason: claimCheck.reason,
        inCompletedHouse,
        completedHouseRoomCount: this.completedHouseCells.size,
        damagedPieceCount,
      },
      multiplayer: {
        connected: this.mpConnected,
        transport: this.mpTransport,
        serverHost: this.mpServerHost,
        roomId: this.mpRoomId,
        roomGameMode: this.mpRoomGameMode,
        playerId: this.mpPlayerId,
        playerName: this.mpPlayerName || '모험가',
        onlineCount: 1 + this.remotePlayers.size,
        remotePlayers: Array.from(this.remotePlayers.values()).map((rp) => ({
          id: rp.id,
          name: rp.name,
          x: rp.x,
          z: rp.z,
        })),
      },
      trialTower: (() => {
        const activeSpec =
          this.trialTowerActiveFloor !== null
            ? TRIAL_TOWER_FLOORS.find((f) => f.floor === this.trialTowerActiveFloor) || null
            : null;
        return {
          activeFloor: this.trialTowerActiveFloor,
          highestClearedFloor: this.trialTowerHighestCleared,
          lastClearedFloor: this.trialTowerLastCleared,
          nearTower: Math.hypot(this.playerX - 24.0, this.playerZ - -72.0) <= 18.0,
          inDungeon: this.inTrialDungeon,
          activeFilterHex: activeSpec ? activeSpec.accentHex : null,
          activeBossTitle: activeSpec ? activeSpec.bossTitle : null,
        };
      })(),
      nearbyMonsters,
      lastSavedAt: this.lastSavedAt,
      hasSavedGame: !!this.saveSummary,
      saveSummary: this.saveSummary,
      fps: this.currentFps,
    });
  }

  public dispose(): void {
    this.disposed = true;
    this.running = false;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    this.mpClient?.dispose();
    this.mpClient = null;
    for (const id of Array.from(this.remotePlayers.keys())) {
      this.removeRemotePlayer(id);
    }

    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('pointercancel', this.handlePointerUp);

    if (this.renderer) {
      const dom = this.renderer.domElement;
      dom.removeEventListener('pointerdown', this.handlePointerDown);
      dom.removeEventListener('wheel', this.handleWheel);
      dom.removeEventListener('contextmenu', this.handleContextMenu);
      dom.removeEventListener('webglcontextlost', this.handleContextLost);
      dom.removeEventListener('webglcontextrestored', this.handleContextRestored);
      this.renderer.dispose();
      if (dom.parentNode === this.container) {
        this.container.removeChild(dom);
      }
      this.renderer = null;
    }

    this.destroyGhostPreview();
    this.housingLib?.dispose();
    this.envRT?.dispose();
    this.environment?.dispose();
    this.textures?.dispose();
    this.assets?.dispose();
    this.monsterLib?.dispose();
    this.particles?.dispose();
    this.catRig?.dispose();
    this.sound.dispose();
  }
}
