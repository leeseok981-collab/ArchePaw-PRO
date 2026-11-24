import * as THREE from 'three';
import { TimePreset, WeatherKind } from './types';
import { getTerrainHeight } from './terrain';
import { SoundEngine } from './audio';

// Pre-allocated scratch colors (zero GC per frame)
const _skyZenith = new THREE.Color();
const _skyHorizon = new THREE.Color();
const _sunColor = new THREE.Color();
const _hemiSky = new THREE.Color();
const _hemiGround = new THREE.Color();
const _cloudColor = new THREE.Color();
const _fogColor = new THREE.Color();
const _tmpColor = new THREE.Color();
const _leafDummy = new THREE.Object3D();

interface FallingLeafData {
  x: number;
  y: number;
  z: number;
  fallSpeed: number;
  flutterFreq: number;
  flutterAmp: number;
  phase: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  spinX: number;
  spinY: number;
  spinZ: number;
  baseScale: number;
}

interface BreezeRibbonData {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  x: number;
  y: number;
  z: number;
  speed: number;
  phase: number;
  life: number;
  maxLife: number;
}

interface TimeKeyframe {
  hour: number;
  zenith: THREE.Color;
  horizon: THREE.Color;
  sunCol: THREE.Color;
  sunInt: number;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemiInt: number;
  cloud: THREE.Color;
  nightFactor: number;
}

const TIME_KEYFRAMES: TimeKeyframe[] = [
  {
    hour: 0,
    zenith: new THREE.Color(0x0b1328),
    horizon: new THREE.Color(0x1b2c4c),
    sunCol: new THREE.Color(0x9ab8e8),
    sunInt: 0.45,
    hemiSky: new THREE.Color(0x3a5280),
    hemiGround: new THREE.Color(0x1b2230),
    hemiInt: 0.42,
    cloud: new THREE.Color(0x364663),
    nightFactor: 1.0,
  },
  {
    hour: 5.0,
    zenith: new THREE.Color(0x283c6b),
    horizon: new THREE.Color(0xe39d7a),
    sunCol: new THREE.Color(0xffb782),
    sunInt: 1.05,
    hemiSky: new THREE.Color(0xc7a3b5),
    hemiGround: new THREE.Color(0x4a423a),
    hemiInt: 0.65,
    cloud: new THREE.Color(0xf7c3a8),
    nightFactor: 0.45,
  },
  {
    hour: 7.5,
    zenith: new THREE.Color(0x4b93d6),
    horizon: new THREE.Color(0xd9ecfa),
    sunCol: new THREE.Color(0xfff1d6),
    sunInt: 2.0,
    hemiSky: new THREE.Color(0xbbe0ff),
    hemiGround: new THREE.Color(0x5c6e44),
    hemiInt: 0.9,
    cloud: new THREE.Color(0xffffff),
    nightFactor: 0.0,
  },
  {
    hour: 12.5,
    zenith: new THREE.Color(0x3684d4),
    horizon: new THREE.Color(0xcbe6fa),
    sunCol: new THREE.Color(0xfff8eb),
    sunInt: 2.25,
    hemiSky: new THREE.Color(0xc8e7ff),
    hemiGround: new THREE.Color(0x617648),
    hemiInt: 0.98,
    cloud: new THREE.Color(0xffffff),
    nightFactor: 0.0,
  },
  {
    hour: 16.5,
    zenith: new THREE.Color(0x4c83c2),
    horizon: new THREE.Color(0xf5d7b0),
    sunCol: new THREE.Color(0xffdca3),
    sunInt: 1.85,
    hemiSky: new THREE.Color(0xe6c8a8),
    hemiGround: new THREE.Color(0x5e533d),
    hemiInt: 0.8,
    cloud: new THREE.Color(0xffe6cc),
    nightFactor: 0.05,
  },
  {
    hour: 18.2,
    zenith: new THREE.Color(0x2d3566),
    horizon: new THREE.Color(0xe87b58),
    sunCol: new THREE.Color(0xff8e4a),
    sunInt: 1.1,
    hemiSky: new THREE.Color(0xc97b74),
    hemiGround: new THREE.Color(0x3b3135),
    hemiInt: 0.62,
    cloud: new THREE.Color(0xf59d78),
    nightFactor: 0.45,
  },
  {
    hour: 20.0,
    zenith: new THREE.Color(0x0f1a36),
    horizon: new THREE.Color(0x213457),
    sunCol: new THREE.Color(0x9ab8e8),
    sunInt: 0.5,
    hemiSky: new THREE.Color(0x425b8a),
    hemiGround: new THREE.Color(0x1f2736),
    hemiInt: 0.45,
    cloud: new THREE.Color(0x3b4d6e),
    nightFactor: 0.95,
  },
  {
    hour: 24.0,
    zenith: new THREE.Color(0x0b1328),
    horizon: new THREE.Color(0x1b2c4c),
    sunCol: new THREE.Color(0x9ab8e8),
    sunInt: 0.45,
    hemiSky: new THREE.Color(0x3a5280),
    hemiGround: new THREE.Color(0x1b2230),
    hemiInt: 0.42,
    cloud: new THREE.Color(0x364663),
    nightFactor: 1.0,
  },
];

const WEATHER_LABELS: Record<WeatherKind, string> = {
  clear: '맑음',
  rain: '보슬비',
  storm: '뇌우',
  fog: '짙은 안개',
  snow: '눈',
};

const WEATHER_ORDER: WeatherKind[] = ['clear', 'rain', 'snow', 'fog', 'clear', 'storm'];

interface MoonMothCreature {
  group: THREE.Group;
  leftWing: THREE.Group;
  rightWing: THREE.Group;
  homeX: number;
  homeZ: number;
  x: number;
  y: number;
  z: number;
  angle: number;
  orbitRadius: number;
  speed: number;
  phase: number;
  fleeOffsetX: number;
  fleeOffsetZ: number;
}

/**
 * Dynamic 24-hour Time-of-Day, Weather, and Night-Specific Wildlife Controller.
 * Night creatures (pulsating Firefly Swarm + articulated luminous Moon Moths)
 * appear strictly when timeOfDay is between 20:00 and 04:00.
 */
export class WorldEnvironmentController {
  public timeOfDay = 9.5;
  public timePaused = false;
  public weather: WeatherKind = 'clear';
  public autoWeather = true;
  public nightFactor = 0;

  private weatherTimer = 75;
  private weatherOrderIdx = 0;

  private rainBlend = 0;
  private stormBlend = 0;
  private fogBlend = 0;
  private snowBlend = 0;

  private lightningTimer = 6;
  private lightningFlash = 0;

  private scene: THREE.Scene;
  private fog: THREE.FogExp2;
  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private rimLight: THREE.DirectionalLight;
  private sound: SoundEngine;

  // Sky & Celestial meshes
  private skyGeo: THREE.SphereGeometry;
  private skyMat: THREE.MeshBasicMaterial;
  private skyMesh: THREE.Mesh;
  private sunGroup: THREE.Group;
  private sunDiscMat: THREE.MeshBasicMaterial;
  private sunHaloMat: THREE.MeshBasicMaterial;
  private moonGroup: THREE.Group;
  private moonMat: THREE.MeshBasicMaterial;
  private starsPoints: THREE.Points;
  private starsMat: THREE.PointsMaterial;
  private clouds: THREE.Group[] = [];
  private cloudMat: THREE.MeshStandardMaterial;

  // Weather VFX
  private rainLines: THREE.LineSegments;
  private rainMat: THREE.LineBasicMaterial;
  private rainPositions: Float32Array;
  private rainSpeeds: Float32Array;
  private rainCount = 460;

  private snowPoints: THREE.Points;
  private snowMat: THREE.PointsMaterial;
  private snowPositions: Float32Array;
  private snowSpeeds: Float32Array;
  private snowPhases: Float32Array;
  private snowCount = 520;

  // Night-Specific Wildlife (strictly 20:00 - 04:00)
  private fireflyPoints: THREE.Points;
  private fireflyMat: THREE.PointsMaterial;
  private fireflyBase: Float32Array;
  private fireflyColors: Float32Array;
  private fireflyCount = 96;

  private mothContainer: THREE.Group;
  private moths: MoonMothCreature[] = [];
  private mothWingMat: THREE.MeshStandardMaterial;
  private mothBodyMat: THREE.MeshStandardMaterial;
  private mothHaloMat: THREE.MeshBasicMaterial;

  // Valley Mist & Volumetric Rolling Fog Banks
  private mistGroup: THREE.Group;
  private mistMat: THREE.MeshBasicMaterial;
  private mistPlanes: THREE.Mesh[] = [];
  private fogBanks: Array<{
    mesh: THREE.Mesh;
    baseX: number;
    baseZ: number;
    yOffset: number;
    speed: number;
    phase: number;
    scale: number;
  }> = [];
  private fogBankMat: THREE.MeshBasicMaterial;

  // Weather-Tied Falling Leaves & Breeze Wind Ribbons
  public windStrength = 0.25;
  private leafMesh: THREE.InstancedMesh;
  private leaves: FallingLeafData[] = [];
  private leafCount = 110;
  private breezeGroup: THREE.Group;
  private breezeRibbons: BreezeRibbonData[] = [];

  private disposables: Array<{ dispose: () => void }> = [];

  constructor(
    scene: THREE.Scene,
    fog: THREE.FogExp2,
    sunLight: THREE.DirectionalLight,
    hemiLight: THREE.HemisphereLight,
    rimLight: THREE.DirectionalLight,
    sound: SoundEngine,
  ) {
    this.scene = scene;
    this.fog = fog;
    this.sunLight = sunLight;
    this.hemiLight = hemiLight;
    this.rimLight = rimLight;
    this.sound = sound;

    // 1. Dynamic Vertex-Colored Sky Dome (scaled for 3x wider world)
    this.skyGeo = new THREE.SphereGeometry(460, 24, 16);
    const pos = this.skyGeo.attributes.position;
    const cols = new Float32Array(pos.count * 3);
    this.skyGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    this.skyMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
    });
    this.skyMesh = new THREE.Mesh(this.skyGeo, this.skyMat);
    this.scene.add(this.skyMesh);
    this.disposables.push(this.skyGeo, this.skyMat);

    // 2. Sun & Halo
    this.sunGroup = new THREE.Group();
    const sunGeo = new THREE.SphereGeometry(11.5, 16, 12);
    this.sunDiscMat = new THREE.MeshBasicMaterial({ color: 0xfff3c4, fog: false });
    this.sunGroup.add(new THREE.Mesh(sunGeo, this.sunDiscMat));

    const haloGeo = new THREE.SphereGeometry(20.5, 16, 12);
    this.sunHaloMat = new THREE.MeshBasicMaterial({
      color: 0xffd27d,
      transparent: true,
      opacity: 0.28,
      fog: false,
      depthWrite: false,
    });
    this.sunGroup.add(new THREE.Mesh(haloGeo, this.sunHaloMat));
    this.scene.add(this.sunGroup);
    this.disposables.push(sunGeo, haloGeo, this.sunDiscMat, this.sunHaloMat);

    // 3. Moon
    this.moonGroup = new THREE.Group();
    const moonGeo = new THREE.SphereGeometry(8.8, 16, 12);
    this.moonMat = new THREE.MeshBasicMaterial({ color: 0xe6f0ff, fog: false });
    this.moonGroup.add(new THREE.Mesh(moonGeo, this.moonMat));
    const moonHaloGeo = new THREE.SphereGeometry(15.2, 14, 10);
    const moonHaloMat = new THREE.MeshBasicMaterial({
      color: 0x8eb8f0,
      transparent: true,
      opacity: 0.2,
      fog: false,
      depthWrite: false,
    });
    this.moonGroup.add(new THREE.Mesh(moonHaloGeo, moonHaloMat));
    this.scene.add(this.moonGroup);
    this.disposables.push(moonGeo, moonHaloGeo, this.moonMat, moonHaloMat);

    // 4. Starfield
    const starCount = 320;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(0.12 + Math.random() * 0.88);
      const r = 410;
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi);
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    this.starsMat = new THREE.PointsMaterial({
      color: 0xebf3ff,
      size: 2.2,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      fog: false,
      depthWrite: false,
    });
    this.starsPoints = new THREE.Points(starGeo, this.starsMat);
    this.scene.add(this.starsPoints);
    this.disposables.push(starGeo, this.starsMat);

    // 5. Clouds
    this.cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.94,
      metalness: 0.0,
      fog: true,
    });
    const puffGeo = new THREE.IcosahedronGeometry(1, 1);
    this.disposables.push(this.cloudMat, puffGeo);

    for (let i = 0; i < 24; i++) {
      const cg = new THREE.Group();
      const puffs = 3 + (i % 3);
      for (let p = 0; p < puffs; p++) {
        const m = new THREE.Mesh(puffGeo, this.cloudMat);
        const s = 4.6 + Math.random() * 4.2;
        m.scale.set(s * 1.45, s * 0.62, s);
        m.position.set((p - 1) * 5.2, (Math.random() - 0.5) * 1.1, (Math.random() - 0.5) * 2.5);
        cg.add(m);
      }
      const angle = (i / 24) * Math.PI * 2;
      const dist = 55 + Math.random() * 175;
      cg.position.set(Math.cos(angle) * dist, 42 + Math.random() * 18, Math.sin(angle) * dist);
      cg.rotation.y = Math.random() * Math.PI;
      this.clouds.push(cg);
      this.scene.add(cg);
    }

    // 6. Falling Rain Streak Field
    this.rainPositions = new Float32Array(this.rainCount * 6);
    this.rainSpeeds = new Float32Array(this.rainCount);
    for (let i = 0; i < this.rainCount; i++) {
      const rx = (Math.random() - 0.5) * 42;
      const ry = Math.random() * 24;
      const rz = (Math.random() - 0.5) * 42;
      this.rainPositions[i * 6] = rx;
      this.rainPositions[i * 6 + 1] = ry;
      this.rainPositions[i * 6 + 2] = rz;
      this.rainPositions[i * 6 + 3] = rx;
      this.rainPositions[i * 6 + 4] = ry - 0.8;
      this.rainPositions[i * 6 + 5] = rz;
      this.rainSpeeds[i] = 18 + Math.random() * 10;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));
    this.rainMat = new THREE.LineBasicMaterial({
      color: 0xcbe4f7,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.rainLines = new THREE.LineSegments(rainGeo, this.rainMat);
    this.rainLines.frustumCulled = false;
    this.rainLines.visible = false;
    this.scene.add(this.rainLines);
    this.disposables.push(rainGeo, this.rainMat);

    // 6b. Soft Falling 3D Snowflake Field
    const snowCanvas = document.createElement('canvas');
    snowCanvas.width = 48;
    snowCanvas.height = 48;
    const sCtx = snowCanvas.getContext('2d')!;
    const sGrad = sCtx.createRadialGradient(24, 24, 2, 24, 24, 22);
    sGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    sGrad.addColorStop(0.45, 'rgba(232, 245, 255, 0.85)');
    sGrad.addColorStop(1, 'rgba(220, 240, 255, 0.0)');
    sCtx.fillStyle = sGrad;
    sCtx.fillRect(0, 0, 48, 48);
    const snowTex = new THREE.CanvasTexture(snowCanvas);
    snowTex.colorSpace = THREE.SRGBColorSpace;

    this.snowPositions = new Float32Array(this.snowCount * 3);
    this.snowSpeeds = new Float32Array(this.snowCount);
    this.snowPhases = new Float32Array(this.snowCount);
    for (let i = 0; i < this.snowCount; i++) {
      this.snowPositions[i * 3] = (Math.random() - 0.5) * 44;
      this.snowPositions[i * 3 + 1] = Math.random() * 22;
      this.snowPositions[i * 3 + 2] = (Math.random() - 0.5) * 44;
      this.snowSpeeds[i] = 1.65 + Math.random() * 1.45;
      this.snowPhases[i] = Math.random() * Math.PI * 2;
    }
    const snowGeo = new THREE.BufferGeometry();
    snowGeo.setAttribute('position', new THREE.BufferAttribute(this.snowPositions, 3));
    this.snowMat = new THREE.PointsMaterial({
      map: snowTex,
      color: 0xf4fbff,
      size: 0.42,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.snowPoints = new THREE.Points(snowGeo, this.snowMat);
    this.snowPoints.frustumCulled = false;
    this.snowPoints.visible = false;
    this.scene.add(this.snowPoints);
    this.disposables.push(snowGeo, this.snowMat, snowTex);

    // 7. Night-Specific Pulsating Firefly Swarm (Strictly 20:00 - 04:00)
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 64;
    glowCanvas.height = 64;
    const gCtx = glowCanvas.getContext('2d')!;
    const gGrad = gCtx.createRadialGradient(32, 32, 2, 32, 32, 30);
    gGrad.addColorStop(0, 'rgba(255, 255, 230, 1.0)');
    gGrad.addColorStop(0.35, 'rgba(255, 234, 110, 0.8)');
    gGrad.addColorStop(1, 'rgba(255, 220, 80, 0.0)');
    gCtx.fillStyle = gGrad;
    gCtx.fillRect(0, 0, 64, 64);
    const fireflyTex = new THREE.CanvasTexture(glowCanvas);
    fireflyTex.colorSpace = THREE.SRGBColorSpace;

    this.fireflyBase = new Float32Array(this.fireflyCount * 3);
    const ffPos = new Float32Array(this.fireflyCount * 3);
    this.fireflyColors = new Float32Array(this.fireflyCount * 3);
    for (let i = 0; i < this.fireflyCount; i++) {
      const r = 3.5 + Math.sqrt(Math.random()) * 42;
      const a = Math.random() * Math.PI * 2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const y = getTerrainHeight(x, z) + 0.65 + Math.random() * 2.6;
      this.fireflyBase[i * 3] = x;
      this.fireflyBase[i * 3 + 1] = y;
      this.fireflyBase[i * 3 + 2] = z;
      ffPos[i * 3] = x;
      ffPos[i * 3 + 1] = y;
      ffPos[i * 3 + 2] = z;
      this.fireflyColors[i * 3] = 1.0;
      this.fireflyColors[i * 3 + 1] = 0.92;
      this.fireflyColors[i * 3 + 2] = 0.45;
    }
    const ffGeo = new THREE.BufferGeometry();
    ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
    ffGeo.setAttribute('color', new THREE.BufferAttribute(this.fireflyColors, 3));
    this.fireflyMat = new THREE.PointsMaterial({
      map: fireflyTex,
      vertexColors: true,
      size: 0.46,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.fireflyPoints = new THREE.Points(ffGeo, this.fireflyMat);
    this.fireflyPoints.visible = false;
    this.scene.add(this.fireflyPoints);
    this.disposables.push(fireflyTex, ffGeo, this.fireflyMat);

    // 8. Night-Specific Articulated Moon Moths (달빛 나방 — Strictly 20:00 - 04:00)
    this.mothContainer = new THREE.Group();
    this.mothContainer.visible = false;
    this.scene.add(this.mothContainer);

    this.mothBodyMat = new THREE.MeshStandardMaterial({
      color: 0xfff3c4,
      emissive: 0xe6c86a,
      emissiveIntensity: 1.0,
      roughness: 0.4,
      transparent: true,
      opacity: 0,
    });
    this.mothWingMat = new THREE.MeshStandardMaterial({
      color: 0x8ef2ff,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.25,
      roughness: 0.25,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
    });
    this.mothHaloMat = new THREE.MeshBasicMaterial({
      map: fireflyTex,
      color: 0x9ef4ff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    const mothBodyGeo = new THREE.CapsuleGeometry(0.032, 0.12, 4, 8);
    mothBodyGeo.rotateX(Math.PI / 2);

    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.quadraticCurveTo(0.16, 0.12, 0.22, 0.04);
    wingShape.quadraticCurveTo(0.24, -0.04, 0.14, -0.08);
    wingShape.quadraticCurveTo(0.16, -0.15, 0.08, -0.17);
    wingShape.lineTo(0, -0.06);
    wingShape.closePath();
    const wingGeo = new THREE.ShapeGeometry(wingShape);
    wingGeo.rotateX(-Math.PI / 2);

    const haloPlaneGeo = new THREE.PlaneGeometry(0.68, 0.68);
    const antGeo = new THREE.CylinderGeometry(0.004, 0.006, 0.09, 5);
    this.disposables.push(
      this.mothBodyMat,
      this.mothWingMat,
      this.mothHaloMat,
      mothBodyGeo,
      wingGeo,
      haloPlaneGeo,
      antGeo,
    );

    const mothCount = 12;
    for (let i = 0; i < mothCount; i++) {
      const mGroup = new THREE.Group();
      const body = new THREE.Mesh(mothBodyGeo, this.mothBodyMat);
      mGroup.add(body);

      for (const side of [-1, 1] as const) {
        const ant = new THREE.Mesh(antGeo, this.mothBodyMat);
        ant.position.set(side * 0.02, 0.025, 0.085);
        ant.rotation.set(0.65, 0, -side * 0.35);
        mGroup.add(ant);
      }

      const leftWing = new THREE.Group();
      const lwMesh = new THREE.Mesh(wingGeo, this.mothWingMat);
      lwMesh.scale.x = -1;
      leftWing.add(lwMesh);
      mGroup.add(leftWing);

      const rightWing = new THREE.Group();
      const rwMesh = new THREE.Mesh(wingGeo, this.mothWingMat);
      rightWing.add(rwMesh);
      mGroup.add(rightWing);

      const halo = new THREE.Mesh(haloPlaneGeo, this.mothHaloMat);
      halo.rotation.x = -Math.PI / 2;
      mGroup.add(halo);

      const a = (i / mothCount) * Math.PI * 2;
      const dist = 6 + (i % 4) * 6.5;
      const homeX = Math.cos(a) * dist;
      const homeZ = Math.sin(a) * dist;
      const y = getTerrainHeight(homeX, homeZ) + 1.45 + (i % 3) * 0.5;
      mGroup.position.set(homeX, y, homeZ);
      this.mothContainer.add(mGroup);

      this.moths.push({
        group: mGroup,
        leftWing,
        rightWing,
        homeX,
        homeZ,
        x: homeX,
        y,
        z: homeZ,
        angle: Math.random() * Math.PI * 2,
        orbitRadius: 2.8 + (i % 3) * 1.8,
        speed: 0.42 + (i % 4) * 0.12,
        phase: i * 1.37,
        fleeOffsetX: 0,
        fleeOffsetZ: 0,
      });
    }

    // 9. Valley Mist Wisps & Volumetric Rolling Fog Banks
    this.mistGroup = new THREE.Group();
    const mistCanvas = document.createElement('canvas');
    mistCanvas.width = 128;
    mistCanvas.height = 128;
    const mCtx = mistCanvas.getContext('2d')!;
    const mGrad = mCtx.createRadialGradient(64, 64, 4, 64, 64, 62);
    mGrad.addColorStop(0, 'rgba(235, 245, 252, 0.54)');
    mGrad.addColorStop(0.5, 'rgba(218, 234, 246, 0.24)');
    mGrad.addColorStop(1, 'rgba(218, 234, 246, 0)');
    mCtx.fillStyle = mGrad;
    mCtx.fillRect(0, 0, 128, 128);
    const mistTex = new THREE.CanvasTexture(mistCanvas);
    mistTex.colorSpace = THREE.SRGBColorSpace;
    const mistGeo = new THREE.PlaneGeometry(22, 22);
    mistGeo.rotateX(-Math.PI / 2);
    this.mistMat = new THREE.MeshBasicMaterial({
      map: mistTex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    for (let i = 0; i < 18; i++) {
      const mp = new THREE.Mesh(mistGeo, this.mistMat);
      const a = (i / 18) * Math.PI * 2;
      const d = 8 + (i % 5) * 10;
      const mx = Math.cos(a) * d;
      const mz = Math.sin(a) * d;
      mp.position.set(mx, getTerrainHeight(mx, mz) + 0.55 + (i % 3) * 0.55, mz);
      this.mistPlanes.push(mp);
      this.mistGroup.add(mp);
    }

    // Upright layered drifting fog cloud banks for true 3D atmospheric fog depth
    const bankGeo = new THREE.PlaneGeometry(16, 7.5);
    this.fogBankMat = new THREE.MeshBasicMaterial({
      map: mistTex,
      color: 0xdcebf7,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    for (let i = 0; i < 24; i++) {
      const bm = new THREE.Mesh(bankGeo, this.fogBankMat);
      const a = (i / 24) * Math.PI * 2 + (i % 3) * 0.25;
      const dist = 10 + (i % 6) * 9.5;
      const bx = Math.cos(a) * dist;
      const bz = Math.sin(a) * dist;
      const yOffset = 1.9 + (i % 4) * 1.1;
      bm.position.set(bx, getTerrainHeight(bx, bz) + yOffset, bz);
      bm.rotation.y = a + Math.PI / 2;
      const sc = 0.85 + (i % 4) * 0.28;
      bm.scale.set(sc, sc * 0.85, 1);
      this.mistGroup.add(bm);
      this.fogBanks.push({
        mesh: bm,
        baseX: bx,
        baseZ: bz,
        yOffset,
        speed: 0.55 + (i % 4) * 0.22,
        phase: i * 1.13,
        scale: sc,
      });
    }

    this.mistGroup.visible = true;
    this.scene.add(this.mistGroup);
    this.disposables.push(mistTex, mistGeo, bankGeo, this.mistMat, this.fogBankMat);

    // 10. Weather-Tied Falling Leaves (InstancedMesh — gentle drift in clear, lush swirl in rain/storm)
    const leafShape = new THREE.Shape();
    leafShape.moveTo(0, -0.13);
    leafShape.quadraticCurveTo(0.085, -0.02, 0, 0.14);
    leafShape.quadraticCurveTo(-0.085, -0.02, 0, -0.13);
    const leafGeo = new THREE.ShapeGeometry(leafShape, 4);
    // Subtle organic arch along leaf blade
    const lPos = leafGeo.attributes.position;
    for (let i = 0; i < lPos.count; i++) {
      const ly = lPos.getY(i);
      const lx = lPos.getX(i);
      lPos.setZ(i, -Math.abs(lx) * 0.28 + Math.cos(ly * 7) * 0.018);
    }
    leafGeo.computeVertexNormals();

    const leafMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.78,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
    this.leafMesh = new THREE.InstancedMesh(leafGeo, leafMat, this.leafCount);
    this.leafMesh.frustumCulled = false;

    const leafPalette = [0x6bb84a, 0x4d923a, 0x8ec752, 0xe8ad42, 0xd87c38, 0xa8cf4c];
    const tmpLeafCol = new THREE.Color();
    for (let i = 0; i < this.leafCount; i++) {
      const lx = (Math.random() - 0.5) * 44;
      const ly = 1.0 + Math.random() * 14;
      const lz = (Math.random() - 0.5) * 44;
      this.leaves.push({
        x: lx,
        y: ly,
        z: lz,
        fallSpeed: 0.75 + Math.random() * 0.85,
        flutterFreq: 1.8 + Math.random() * 2.1,
        flutterAmp: 0.55 + Math.random() * 0.75,
        phase: Math.random() * Math.PI * 2,
        rotX: Math.random() * Math.PI * 2,
        rotY: Math.random() * Math.PI * 2,
        rotZ: Math.random() * Math.PI * 2,
        spinX: (Math.random() - 0.5) * 3.2,
        spinY: (Math.random() - 0.5) * 3.8,
        spinZ: (Math.random() - 0.5) * 3.0,
        baseScale: 0.72 + Math.random() * 0.65,
      });
      tmpLeafCol.setHex(leafPalette[i % leafPalette.length]);
      this.leafMesh.setColorAt(i, tmpLeafCol);
    }
    if (this.leafMesh.instanceColor) {
      this.leafMesh.instanceColor.needsUpdate = true;
    }
    this.scene.add(this.leafMesh);
    this.disposables.push(leafGeo, leafMat);

    // 11. Weather-Tied Translucent Breeze / Wind-Current Ribbons
    this.breezeGroup = new THREE.Group();
    const breezeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.6, 0, 0),
      new THREE.Vector3(-1.1, 0.24, 0.14),
      new THREE.Vector3(0.4, -0.14, -0.1),
      new THREE.Vector3(1.8, 0.22, 0.08),
      new THREE.Vector3(2.8, 0.05, 0),
    ]);
    const breezeGeo = new THREE.TubeGeometry(breezeCurve, 18, 0.022, 5, false);
    this.disposables.push(breezeGeo);

    const ribbonCount = 16;
    for (let i = 0; i < ribbonCount; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xe8f6ff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(breezeGeo, mat);
      const bx = (Math.random() - 0.5) * 38;
      const by = 1.2 + Math.random() * 7.5;
      const bz = (Math.random() - 0.5) * 38;
      mesh.position.set(bx, by, bz);
      this.breezeGroup.add(mesh);
      this.disposables.push(mat);

      const maxLife = 2.4 + Math.random() * 2.2;
      this.breezeRibbons.push({
        mesh,
        mat,
        x: bx,
        y: by,
        z: bz,
        speed: 4.5 + Math.random() * 3.5,
        phase: Math.random() * Math.PI * 2,
        life: Math.random() * maxLife,
        maxLife,
      });
    }
    this.scene.add(this.breezeGroup);

    this.applyAtmosphere(0, 0, 0, 0, 0);
  }

  /**
   * Strict 20:00 - 04:00 night-creature visibility factor (0 outside window, smooth fade at edges).
   */
  public getNightCreatureVisibility(): number {
    const t = this.timeOfDay;
    if (t >= 20.0) {
      return THREE.MathUtils.clamp((t - 20.0) / 0.35, 0, 1);
    }
    if (t < 4.0) {
      return THREE.MathUtils.clamp((4.0 - t) / 0.35, 0, 1);
    }
    return 0;
  }

  public isNightCreaturesActive(): boolean {
    return this.getNightCreatureVisibility() > 0.01 && this.stormBlend < 0.75;
  }

  public setTimePreset(preset: TimePreset): void {
    const map: Record<TimePreset, number> = {
      dawn: 5.5,
      noon: 12.2,
      sunset: 17.85,
      night: 22.0,
    };
    this.timeOfDay = map[preset];
  }

  public setTimeOfDay(hours: number): void {
    this.timeOfDay = ((hours % 24) + 24) % 24;
  }

  public setWeather(weather: WeatherKind, manual = true): void {
    this.weather = weather;
    if (manual) {
      this.autoWeather = false;
    }
    if (weather === 'storm') {
      this.lightningTimer = 2.5 + Math.random() * 3.0;
    }
  }

  public toggleTimePaused(): boolean {
    this.timePaused = !this.timePaused;
    return this.timePaused;
  }

  public toggleAutoWeather(): boolean {
    this.autoWeather = !this.autoWeather;
    this.weatherTimer = 60;
    return this.autoWeather;
  }

  public getWeatherLabel(): string {
    return WEATHER_LABELS[this.weather];
  }

  public getTimeClockText(): string {
    const h = Math.floor(this.timeOfDay) % 24;
    const m = Math.floor((this.timeOfDay - Math.floor(this.timeOfDay)) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  public getTimePhaseLabel(): string {
    const t = this.timeOfDay;
    if (t >= 4.5 && t < 7.0) return '새벽';
    if (t >= 7.0 && t < 11.0) return '아침';
    if (t >= 11.0 && t < 16.5) return '낮';
    if (t >= 16.5 && t < 19.5) return '노을';
    return '밤';
  }

  public isRaining(): boolean {
    return this.weather === 'rain' || this.weather === 'storm';
  }

  public update(dt: number, elapsed: number, playerX: number, playerY: number, playerZ: number): void {
    if (!this.timePaused) {
      this.timeOfDay = (this.timeOfDay + dt / 24) % 24;
    }

    if (this.autoWeather) {
      this.weatherTimer -= dt;
      if (this.weatherTimer <= 0) {
        this.weatherOrderIdx = (this.weatherOrderIdx + 1) % WEATHER_ORDER.length;
        this.weather = WEATHER_ORDER[this.weatherOrderIdx];
        this.weatherTimer = 55 + Math.random() * 35;
      }
    }

    const targetRain = this.weather === 'rain' ? 0.65 : this.weather === 'storm' ? 1.0 : 0.0;
    const targetStorm = this.weather === 'storm' ? 1.0 : 0.0;
    const targetFog = this.weather === 'fog' ? 1.0 : 0.0;
    const targetSnow = this.weather === 'snow' ? 1.0 : 0.0;

    this.rainBlend = THREE.MathUtils.damp(this.rainBlend, targetRain, 2.2, dt);
    this.stormBlend = THREE.MathUtils.damp(this.stormBlend, targetStorm, 2.2, dt);
    this.fogBlend = THREE.MathUtils.damp(this.fogBlend, targetFog, 1.8, dt);
    this.snowBlend = THREE.MathUtils.damp(this.snowBlend, targetSnow, 2.0, dt);

    this.sound.setRainAmbience(this.rainBlend);

    if (this.stormBlend > 0.45) {
      this.lightningTimer -= dt;
      if (this.lightningTimer <= 0) {
        this.lightningFlash = 1.0;
        this.lightningTimer = 6.5 + Math.random() * 8.5;
        this.sound.playThunder();
      }
    }
    this.lightningFlash = Math.max(0, this.lightningFlash - dt * 4.8);

    this.applyAtmosphere(dt, elapsed, playerX, playerY, playerZ);
  }

  private applyAtmosphere(
    dt: number,
    elapsed: number,
    playerX: number,
    playerY = 0,
    playerZ = 0,
  ): void {
    let k0 = TIME_KEYFRAMES[0];
    let k1 = TIME_KEYFRAMES[1];
    for (let i = 0; i < TIME_KEYFRAMES.length - 1; i++) {
      if (this.timeOfDay >= TIME_KEYFRAMES[i].hour && this.timeOfDay <= TIME_KEYFRAMES[i + 1].hour) {
        k0 = TIME_KEYFRAMES[i];
        k1 = TIME_KEYFRAMES[i + 1];
        break;
      }
    }
    const span = Math.max(0.001, k1.hour - k0.hour);
    const alpha = THREE.MathUtils.clamp((this.timeOfDay - k0.hour) / span, 0, 1);

    _skyZenith.copy(k0.zenith).lerp(k1.zenith, alpha);
    _skyHorizon.copy(k0.horizon).lerp(k1.horizon, alpha);
    _sunColor.copy(k0.sunCol).lerp(k1.sunCol, alpha);
    _hemiSky.copy(k0.hemiSky).lerp(k1.hemiSky, alpha);
    _hemiGround.copy(k0.hemiGround).lerp(k1.hemiGround, alpha);
    _cloudColor.copy(k0.cloud).lerp(k1.cloud, alpha);

    let sunInt = THREE.MathUtils.lerp(k0.sunInt, k1.sunInt, alpha);
    let hemiInt = THREE.MathUtils.lerp(k0.hemiInt, k1.hemiInt, alpha);
    this.nightFactor = THREE.MathUtils.lerp(k0.nightFactor, k1.nightFactor, alpha);

    const overcast = Math.max(this.rainBlend * 0.85, this.fogBlend * 0.55, this.snowBlend * 0.52);
    if (overcast > 0.005) {
      const stormDark = 1 - this.stormBlend * 0.42 - this.nightFactor * 0.45;
      _tmpColor.setRGB(0.56 * stormDark, 0.62 * stormDark, 0.69 * stormDark);
      _skyZenith.lerp(_tmpColor, overcast * 0.82);

      _tmpColor.setRGB(0.68 * stormDark, 0.74 * stormDark, 0.79 * stormDark);
      _skyHorizon.lerp(_tmpColor, overcast * 0.86);

      _tmpColor.setRGB(0.45 * stormDark, 0.5 * stormDark, 0.56 * stormDark);
      _cloudColor.lerp(_tmpColor, overcast * 0.8);

      sunInt *= 1 - overcast * 0.52;
      hemiInt *= 1 - this.stormBlend * 0.28;
    }

    if (this.snowBlend > 0.01) {
      const winterBright = 1 - this.nightFactor * 0.58;
      _tmpColor.setRGB(0.76 * winterBright, 0.85 * winterBright, 0.95 * winterBright);
      _skyHorizon.lerp(_tmpColor, this.snowBlend * 0.52);
      _tmpColor.setRGB(0.62 * winterBright, 0.74 * winterBright, 0.88 * winterBright);
      _skyZenith.lerp(_tmpColor, this.snowBlend * 0.42);
      _tmpColor.setRGB(0.86 * winterBright, 0.92 * winterBright, 0.98 * winterBright);
      _cloudColor.lerp(_tmpColor, this.snowBlend * 0.55);
      _hemiSky.lerp(_tmpColor.setRGB(0.75 * winterBright, 0.85 * winterBright, 0.96 * winterBright), this.snowBlend * 0.35);
    }

    if (this.lightningFlash > 0.01) {
      const fl = this.lightningFlash * this.lightningFlash;
      _skyZenith.lerp(_tmpColor.setHex(0xd8ecff), fl * 0.65);
      _skyHorizon.lerp(_tmpColor.setHex(0xe8f4ff), fl * 0.55);
      sunInt += fl * 2.8;
      hemiInt += fl * 1.1;
    }

    const posAttr = this.skyGeo.attributes.position;
    const colAttr = this.skyGeo.attributes.color;
    for (let i = 0; i < posAttr.count; i++) {
      const y = posAttr.getY(i);
      const t = THREE.MathUtils.clamp(y / 145, 0, 1);
      _tmpColor.copy(_skyHorizon).lerp(_skyZenith, Math.pow(t, 0.65));
      colAttr.setXYZ(i, _tmpColor.r, _tmpColor.g, _tmpColor.b);
    }
    colAttr.needsUpdate = true;

    _fogColor.copy(_skyHorizon);
    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.copy(_fogColor);
    }
    this.fog.color.copy(_fogColor);

    this.skyMesh.position.set(playerX, 0, playerZ);

    const baseFog = 0.0032 + this.nightFactor * 0.0012;
    this.fog.density =
      baseFog + this.rainBlend * 0.0038 + this.stormBlend * 0.0028 + this.fogBlend * 0.0115;

    const sunAngle = ((this.timeOfDay - 6) / 24) * Math.PI * 2;
    const sunRadius = 320;
    const sunDirX = Math.cos(sunAngle);
    const sunDirY = Math.sin(sunAngle);
    const sunDirZ = 0.36;

    this.sunGroup.position.set(
      playerX + sunDirX * sunRadius,
      sunDirY * sunRadius,
      playerZ + sunDirZ * sunRadius,
    );
    this.sunGroup.visible = sunDirY > -0.1 && this.rainBlend < 0.75;
    this.sunDiscMat.color.copy(_sunColor);
    this.sunHaloMat.opacity = Math.max(0, 0.28 * (1 - overcast));

    this.moonGroup.position.set(
      playerX - sunDirX * sunRadius,
      -sunDirY * sunRadius,
      playerZ - sunDirZ * sunRadius,
    );
    this.moonGroup.visible = -sunDirY > -0.1 && this.rainBlend < 0.8;

    const activeDirX = this.nightFactor < 0.65 ? sunDirX : -sunDirX;
    const activeDirY = Math.max(0.28, this.nightFactor < 0.65 ? sunDirY : -sunDirY);
    const activeDirZ = this.nightFactor < 0.65 ? sunDirZ : -sunDirZ;

    this.sunLight.position.set(
      playerX + activeDirX * 48,
      playerY + activeDirY * 52,
      playerZ + activeDirZ * 48,
    );
    this.sunLight.target.position.set(playerX, playerY, playerZ);
    this.sunLight.target.updateMatrixWorld();
    this.sunLight.color.copy(_sunColor);
    this.sunLight.intensity = sunInt;

    this.hemiLight.color.copy(_hemiSky);
    this.hemiLight.groundColor.copy(_hemiGround);
    this.hemiLight.intensity = hemiInt;

    this.rimLight.intensity = THREE.MathUtils.lerp(0.55, 0.32, this.nightFactor);
    this.cloudMat.color.copy(_cloudColor);

    const starVis = Math.max(0, (this.nightFactor - 0.35) / 0.65) * (1 - overcast * 0.9);
    this.starsMat.opacity = starVis;
    this.starsPoints.visible = starVis > 0.02;
    this.starsPoints.position.set(playerX, 0, playerZ);
    this.starsPoints.rotation.y = elapsed * 0.004;

    const windMult = 1 + this.rainBlend * 1.4 + this.stormBlend * 2.1;
    for (let i = 0; i < this.clouds.length; i++) {
      this.clouds[i].position.x += dt * (0.45 + (i % 3) * 0.2) * windMult;
      if (this.clouds[i].position.x > 250) this.clouds[i].position.x = -250;
    }

    // Rain Streak Field
    if (this.rainBlend > 0.02) {
      this.rainLines.visible = true;
      this.rainMat.opacity = this.rainBlend * 0.56;
      const windX = 2.4 + this.stormBlend * 5.2;
      const streakLen = 0.65 + this.stormBlend * 0.45;
      const posArr = this.rainPositions;

      for (let i = 0; i < this.rainCount; i++) {
        const idx = i * 6;
        let x = posArr[idx] + windX * dt;
        let y = posArr[idx + 1] - this.rainSpeeds[i] * (0.85 + this.stormBlend * 0.45) * dt;
        let z = posArr[idx + 2];

        if (y < playerY - 1.0) {
          x = playerX + (Math.random() - 0.5) * 42;
          y = playerY + 18 + Math.random() * 8;
          z = playerZ + (Math.random() - 0.5) * 42;
        } else {
          if (x - playerX > 21) x -= 42;
          if (x - playerX < -21) x += 42;
          if (z - playerZ > 21) z -= 42;
          if (z - playerZ < -21) z += 42;
        }

        posArr[idx] = x;
        posArr[idx + 1] = y;
        posArr[idx + 2] = z;
        posArr[idx + 3] = x + windX * 0.04;
        posArr[idx + 4] = y - streakLen;
        posArr[idx + 5] = z;
      }
      this.rainLines.geometry.attributes.position.needsUpdate = true;
    } else {
      this.rainLines.visible = false;
    }

    // Falling 3D Snowflake Field
    if (this.snowBlend > 0.02) {
      this.snowPoints.visible = true;
      this.snowMat.opacity = this.snowBlend * 0.88;
      const sArr = this.snowPositions;
      for (let i = 0; i < this.snowCount; i++) {
        const idx = i * 3;
        const phase = this.snowPhases[i];
        let x = sArr[idx] + Math.sin(elapsed * 0.9 + phase) * 0.95 * dt + 0.35 * dt;
        let y = sArr[idx + 1] - this.snowSpeeds[i] * dt;
        let z = sArr[idx + 2] + Math.cos(elapsed * 0.75 + phase * 1.3) * 0.85 * dt;

        if (y < playerY - 0.8) {
          x = playerX + (Math.random() - 0.5) * 44;
          y = playerY + 15 + Math.random() * 9;
          z = playerZ + (Math.random() - 0.5) * 44;
        } else {
          if (x - playerX > 22) x -= 44;
          if (x - playerX < -22) x += 44;
          if (z - playerZ > 22) z -= 44;
          if (z - playerZ < -22) z += 44;
        }

        sArr[idx] = x;
        sArr[idx + 1] = y;
        sArr[idx + 2] = z;
      }
      this.snowPoints.geometry.attributes.position.needsUpdate = true;
    } else {
      this.snowPoints.visible = false;
    }

    // STRICT 20:00 - 04:00 NIGHT-SPECIFIC WILDLIFE (Firefly Swarm + Moon Moths)
    const nightBioVis = this.getNightCreatureVisibility() * (1 - this.stormBlend * 0.85);
    if (nightBioVis > 0.01) {
      // 1) Pulsating Firefly Swarm
      this.fireflyPoints.visible = true;
      this.fireflyMat.opacity = nightBioVis * 0.92;
      const ffPosAttr = this.fireflyPoints.geometry.attributes.position as THREE.BufferAttribute;
      const ffColAttr = this.fireflyPoints.geometry.attributes.color as THREE.BufferAttribute;

      for (let i = 0; i < this.fireflyCount; i++) {
        const bx = this.fireflyBase[i * 3];
        const by = this.fireflyBase[i * 3 + 1];
        const bz = this.fireflyBase[i * 3 + 2];
        const x = bx + Math.sin(elapsed * 0.65 + i * 1.73) * 1.9;
        const y = by + Math.sin(elapsed * 1.35 + i * 2.11) * 0.65;
        const z = bz + Math.cos(elapsed * 0.72 + i * 1.31) * 1.9;
        ffPosAttr.setXYZ(i, x, y, z);

        // Individual firefly bioluminescent blink pulse
        const pulse = 0.45 + 0.55 * Math.pow(Math.sin(elapsed * (1.8 + (i % 5) * 0.35) + i * 2.4) * 0.5 + 0.5, 2);
        const isEmerald = i % 4 === 0;
        ffColAttr.setXYZ(
          i,
          (isEmerald ? 0.65 : 1.0) * pulse,
          (isEmerald ? 1.0 : 0.9) * pulse,
          (isEmerald ? 0.72 : 0.36) * pulse,
        );
      }
      ffPosAttr.needsUpdate = true;
      ffColAttr.needsUpdate = true;

      // 2) Articulated Luminous Moon Moths (달빛 나방) fluttering around meadow & reacting to player proximity
      this.mothContainer.visible = true;
      this.mothBodyMat.opacity = nightBioVis * 0.95;
      this.mothWingMat.opacity = nightBioVis * 0.82;
      this.mothHaloMat.opacity = nightBioVis * 0.36;

      for (let i = 0; i < this.moths.length; i++) {
        const m = this.moths[i];
        m.angle += dt * m.speed;

        // Gentle figure-8 / elliptical night glide
        const targetX = m.homeX + Math.cos(m.angle) * m.orbitRadius + m.fleeOffsetX;
        const targetZ = m.homeZ + Math.sin(m.angle * 1.5) * m.orbitRadius * 0.8 + m.fleeOffsetZ;

        // Softly flutter aside if player steps close
        const dxP = m.x - playerX;
        const dzP = m.z - playerZ;
        const distP = Math.hypot(dxP, dzP);
        if (distP > 0.05 && distP < 4.5) {
          const push = ((4.5 - distP) / 4.5) * 3.8 * dt;
          m.fleeOffsetX += (dxP / distP) * push;
          m.fleeOffsetZ += (dzP / distP) * push;
        }
        m.fleeOffsetX = THREE.MathUtils.damp(m.fleeOffsetX, 0, 1.2, dt);
        m.fleeOffsetZ = THREE.MathUtils.damp(m.fleeOffsetZ, 0, 1.2, dt);

        const prevX = m.x;
        const prevZ = m.z;
        m.x = THREE.MathUtils.damp(m.x, targetX, 2.4, dt);
        m.z = THREE.MathUtils.damp(m.z, targetZ, 2.4, dt);
        const groundY = getTerrainHeight(m.x, m.z);
        const targetY = groundY + 1.35 + Math.sin(elapsed * 2.4 + m.phase) * 0.55 + (distP < 4.5 ? 0.6 : 0);
        m.y = THREE.MathUtils.damp(m.y, targetY, 3.0, dt);

        m.group.position.set(m.x, m.y, m.z);
        const vx = m.x - prevX;
        const vz = m.z - prevZ;
        if (vx * vx + vz * vz > 0.00001) {
          m.group.rotation.y = Math.atan2(vx, vz);
        }

        // Lively double-beat wing flap
        const flap = Math.sin(elapsed * (11.5 + (i % 3) * 1.4) + m.phase) * 0.78 + 0.12;
        m.leftWing.rotation.z = -flap;
        m.rightWing.rotation.z = flap;
      }
    } else {
      this.fireflyPoints.visible = false;
      this.mothContainer.visible = false;
    }

    // Valley Mist & Layered Volumetric Fog Banks (subtle ambient dawn/night/rain haze + rich thick fog weather)
    const dawnMist = this.timeOfDay >= 4.5 && this.timeOfDay <= 8.2 ? 0.24 : 0;
    const ambientMist = Math.max(
      this.fogBlend,
      this.rainBlend * 0.38,
      this.nightFactor * 0.22,
      dawnMist,
      0.1,
    );
    if (ambientMist > 0.02) {
      this.mistGroup.visible = true;
      this.mistMat.color.copy(_fogColor).lerp(_tmpColor.setHex(0xffffff), 0.35);
      this.fogBankMat.color.copy(_fogColor).lerp(_tmpColor.setHex(0xeef6ff), 0.28);
      this.mistMat.opacity = THREE.MathUtils.clamp(ambientMist * 0.62, 0.06, 0.68);
      this.fogBankMat.opacity = THREE.MathUtils.clamp(ambientMist * 0.44, 0.04, 0.46);

      for (let i = 0; i < this.mistPlanes.length; i++) {
        const mp = this.mistPlanes[i];
        mp.rotation.z += dt * (i % 2 === 0 ? 0.09 : -0.07);
      }
      for (let i = 0; i < this.fogBanks.length; i++) {
        const fb = this.fogBanks[i];
        const driftX = fb.baseX + Math.sin(elapsed * 0.14 * fb.speed + fb.phase) * 7.5;
        const driftZ = fb.baseZ + Math.cos(elapsed * 0.12 * fb.speed + fb.phase) * 6.0;
        fb.mesh.position.set(
          driftX,
          getTerrainHeight(driftX, driftZ) + fb.yOffset + Math.sin(elapsed * 0.5 + fb.phase) * 0.35,
          driftZ,
        );
        // Face softly toward player so fog layers always look volumetric
        fb.mesh.lookAt(playerX, fb.mesh.position.y, playerZ);
      }
    } else {
      this.mistGroup.visible = false;
    }

    // Weather-Tied Wind Gust & Falling Leaves / Breeze System
    const gustWave =
      0.5 + 0.35 * Math.sin(elapsed * 0.85) + 0.15 * Math.sin(elapsed * 2.3 + 1.1);
    const baseWind =
      0.24 * (1 - this.fogBlend * 0.55) +
      this.rainBlend * 0.62 +
      this.stormBlend * 0.88;
    this.windStrength = baseWind * (0.72 + gustWave * 0.58);

    const activeLeafRatio = THREE.MathUtils.clamp(
      0.28 + this.rainBlend * 0.52 + this.stormBlend * 0.28 - this.fogBlend * 0.12,
      0.16,
      1.0,
    );
    const activeLeafCount = Math.floor(this.leafCount * activeLeafRatio);
    const windVelX = 1.4 + this.windStrength * 6.8;
    const windVelZ = 0.45 + this.windStrength * 2.1;

    for (let i = 0; i < this.leafCount; i++) {
      const lf = this.leaves[i];
      if (i >= activeLeafCount) {
        _leafDummy.position.set(0, -100, 0);
        _leafDummy.scale.setScalar(0);
        _leafDummy.updateMatrix();
        this.leafMesh.setMatrixAt(i, _leafDummy.matrix);
        continue;
      }

      const flutter = Math.sin(elapsed * lf.flutterFreq + lf.phase);
      const swirl = Math.cos(elapsed * (lf.flutterFreq * 0.72) + lf.phase);
      lf.x += (windVelX + flutter * lf.flutterAmp) * dt;
      lf.z += (windVelZ + swirl * lf.flutterAmp) * dt;
      lf.y -= lf.fallSpeed * (0.82 + this.rainBlend * 0.48 + this.stormBlend * 0.35) * dt;
      lf.y += Math.sin(elapsed * lf.flutterFreq * 1.4 + lf.phase) * 0.22 * dt;

      const groundAtLeaf = getTerrainHeight(lf.x, lf.z);
      if (lf.y < groundAtLeaf + 0.18 || Math.abs(lf.x - playerX) > 24 || Math.abs(lf.z - playerZ) > 24) {
        lf.x = playerX - windVelX * 1.4 + (Math.random() - 0.5) * 42;
        lf.z = playerZ - windVelZ * 1.1 + (Math.random() - 0.5) * 42;
        lf.y = Math.max(playerY, getTerrainHeight(lf.x, lf.z)) + 4.5 + Math.random() * 11;
      }

      const spinBoost = 1 + this.windStrength * 1.9;
      lf.rotX += lf.spinX * spinBoost * dt;
      lf.rotY += lf.spinY * spinBoost * dt;
      lf.rotZ += lf.spinZ * spinBoost * dt;

      _leafDummy.position.set(lf.x, lf.y, lf.z);
      _leafDummy.rotation.set(lf.rotX, lf.rotY, lf.rotZ);
      _leafDummy.scale.setScalar(lf.baseScale);
      _leafDummy.updateMatrix();
      this.leafMesh.setMatrixAt(i, _leafDummy.matrix);
    }
    this.leafMesh.instanceMatrix.needsUpdate = true;

    // Translucent Breeze Wind-Current Ribbons (intensify noticeably in rain/storm gusts)
    const ribbonVisScale = THREE.MathUtils.clamp(
      0.16 + this.rainBlend * 0.34 + this.stormBlend * 0.36 - this.fogBlend * 0.08,
      0.08,
      0.62,
    );
    const windHeading = Math.atan2(windVelZ, windVelX);
    for (let i = 0; i < this.breezeRibbons.length; i++) {
      const rb = this.breezeRibbons[i];
      rb.life += dt * (0.85 + this.windStrength * 0.9);
      if (rb.life >= rb.maxLife) {
        rb.life = 0;
        rb.x = playerX - windVelX * 1.2 + (Math.random() - 0.5) * 34;
        rb.z = playerZ - windVelZ * 0.9 + (Math.random() - 0.5) * 34;
        rb.y = getTerrainHeight(rb.x, rb.z) + 1.1 + Math.random() * 6.2;
      }
      const moveFactor = (rb.speed * (0.45 + this.windStrength * 1.15)) * dt;
      rb.x += Math.cos(windHeading) * moveFactor;
      rb.z += Math.sin(windHeading) * moveFactor;
      rb.y += Math.sin(elapsed * 2.4 + rb.phase) * 0.25 * dt;

      const lifeFrac = rb.life / rb.maxLife;
      const fade = Math.sin(lifeFrac * Math.PI);
      const activeRibbon = i < Math.ceil(this.breezeRibbons.length * (0.35 + this.rainBlend * 0.45 + this.stormBlend * 0.2));
      rb.mesh.visible = activeRibbon && fade > 0.02;
      if (rb.mesh.visible) {
        rb.mesh.position.set(rb.x, rb.y, rb.z);
        rb.mesh.rotation.set(0, -windHeading, Math.sin(elapsed * 2.0 + rb.phase) * 0.08);
        const stretch = 0.75 + this.windStrength * 0.85;
        rb.mesh.scale.set(stretch, 1, 1);
        rb.mat.opacity = fade * ribbonVisScale * (1 - this.nightFactor * 0.35);
      }
    }
  }

  public dispose(): void {
    this.disposables.forEach((d) => d.dispose());
  }
}
