import * as THREE from 'three';
import {
  ElementKind,
  MonsterSpecies,
  SPIRIT_RANK_META,
  SpiritRank,
  TrialTowerFloorSpec,
  getMonsterElementProfile,
} from './types';
import { getTerrainHeight } from './terrain';

export type MonsterBehaviorState =
  | 'idle_patrol'
  | 'chase_player'
  | 'attack_player'
  | 'approach_structure'
  | 'siege_structure'
  | 'celebrate_break'
  | 'return_home';

export interface WorldMonster {
  id: string;
  species: MonsterSpecies;
  label: string;
  element: ElementKind;
  weakness: ElementKind;
  spiritRank?: SpiritRank;
  isBoss: boolean;
  isNightOnly: boolean;
  isAggressive: boolean;
  bossTitle?: string;
  tier: number;
  group: THREE.Group;
  bodyGroup: THREE.Group;
  headPivot?: THREE.Group;
  hitMeshes: THREE.Mesh[];
  legs: THREE.Group[];
  lowerLegs?: THREE.Group[];
  tail?: THREE.Object3D;
  tailSegments?: THREE.Group[];
  // Mid-boss & nocturnal visual FX
  auraRing?: THREE.Mesh;
  orbitalGroup?: THREE.Group;
  telegraphGroup?: THREE.Group;
  telegraphFill?: THREE.Mesh;
  telegraphOuter?: THREE.Mesh;
  homeX: number;
  homeZ: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  radius: number;
  interactRadius: number;
  headHeight: number;
  hp: number;
  maxHp: number;
  attackDamage: number;
  moveSpeed: number;
  wanderTargetX: number;
  wanderTargetZ: number;
  wanderWait: number;
  aggroTimer: number;
  attackCooldown: number;
  hitFlashTimer: number;
  knockVelX: number;
  knockVelZ: number;
  hopPhase: number;
  slowTimer: number;
  // Species-unique combat trait / charge motion state
  traitCooldown: number;
  chargeTimer: number;
  chargeDirX: number;
  chargeDirZ: number;
  // Behavior Tree & Siege / Structure-Break Reaction Animation state
  btState: MonsterBehaviorState;
  siegeTargetId: string | null;
  attackAnimTimer: number;
  attackAnimDuration: number;
  breakReactTimer: number;
  breakReactKind: 'roar' | 'leap' | 'howl';
  // Mid-boss 2-phase combat state
  phase: 1 | 2;
  enrageTriggered: boolean;
  bossSpecialCooldown: number;
  telegraphTimer: number;
  telegraphDuration: number;
  telegraphRadius: number;
  telegraphLabel: string | null;
  isTrialBoss?: boolean;
  trialFloor?: number;
  trialPotionDrop?: number;
  isDead: boolean;
  respawnTimer: number;
  respawnDuration: number;
  drops: { leather: number; fang: number; essence: number; iron?: number; crystal?: number };
  expReward: number;
}

function createFurTexturePair(
  baseHex: string,
  darkHex: string,
  lightHex: string,
  streakCount: number,
): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const size = 256;
  const colCanvas = document.createElement('canvas');
  colCanvas.width = size;
  colCanvas.height = size;
  const ctx = colCanvas.getContext('2d')!;
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;
  bCtx.fillStyle = '#7f7f7f';
  bCtx.fillRect(0, 0, size, size);

  let seed = 1337;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // Crisp fur tufts optimized for fast boot
  const count = Math.round(streakCount * 0.48);
  for (let i = 0; i < count; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const len = 8 + rand() * 18;
    const w = 1.2 + rand() * 2.0;
    const tilt = (rand() - 0.5) * 3.5;
    const isLight = rand() > 0.52;

    ctx.strokeStyle = isLight ? lightHex : darkHex;
    ctx.globalAlpha = 0.4 + rand() * 0.45;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + tilt, y + len);
    ctx.stroke();

    bCtx.strokeStyle = isLight ? '#ececec' : '#262626';
    bCtx.globalAlpha = 0.55;
    bCtx.lineWidth = w;
    bCtx.lineCap = 'round';
    bCtx.beginPath();
    bCtx.moveTo(x, y);
    bCtx.lineTo(x + tilt, y + len);
    bCtx.stroke();
  }

  const map = new THREE.CanvasTexture(colCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2, 2);
  map.anisotropy = 4;
  map.colorSpace = THREE.SRGBColorSpace;

  const bump = new THREE.CanvasTexture(bumpCanvas);
  bump.wrapS = THREE.RepeatWrapping;
  bump.wrapT = THREE.RepeatWrapping;
  bump.repeat.set(2, 2);
  bump.anisotropy = 4;

  return { map, bump };
}

function createTigerStripeTexturePair(): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const size = 256;
  const colCanvas = document.createElement('canvas');
  colCanvas.width = size;
  colCanvas.height = size;
  const ctx = colCanvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#f8fbff');
  grad.addColorStop(0.65, '#e2ebf5');
  grad.addColorStop(1, '#c9d7e8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  // Bold ink-black tiger stripes with tapered organic curves
  ctx.fillStyle = '#111827';
  bCtx.fillStyle = '#383838';
  for (let i = 0; i < 12; i++) {
    const y = (i / 12) * size + 5;
    const h = 6 + (i % 3) * 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(size * 0.25, y - 8, size * 0.55, y + 9, size, y - 2);
    ctx.lineTo(size, y + h - 2);
    ctx.bezierCurveTo(size * 0.55, y + h + 7, size * 0.25, y + h - 7, 0, y + h);
    ctx.closePath();
    ctx.fill();

    bCtx.beginPath();
    bCtx.moveTo(0, y);
    bCtx.bezierCurveTo(size * 0.25, y - 8, size * 0.55, y + 9, size, y - 2);
    bCtx.lineTo(size, y + h - 2);
    bCtx.bezierCurveTo(size * 0.55, y + h + 7, size * 0.25, y + h - 7, 0, y + h);
    bCtx.closePath();
    bCtx.fill();
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 160; i++) {
    const x = (i * 89) % size;
    const y = (i * 137) % size;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 1.5, y + 9);
    ctx.stroke();
  }

  const map = new THREE.CanvasTexture(colCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 4;
  map.colorSpace = THREE.SRGBColorSpace;

  const bump = new THREE.CanvasTexture(bumpCanvas);
  bump.wrapS = THREE.RepeatWrapping;
  bump.wrapT = THREE.RepeatWrapping;
  bump.anisotropy = 4;
  return { map, bump };
}

function createDragonScaleTexturePair(
  baseHex: string,
  edgeHex: string,
  darkHex: string,
): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const size = 256;
  const colCanvas = document.createElement('canvas');
  colCanvas.width = size;
  colCanvas.height = size;
  const ctx = colCanvas.getContext('2d')!;
  ctx.fillStyle = darkHex;
  ctx.fillRect(0, 0, size, size);

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;
  bCtx.fillStyle = '#303030';
  bCtx.fillRect(0, 0, size, size);

  const cols = 8;
  const rows = 9;
  const rx = size / cols;
  const ry = size / rows;
  for (let r = -1; r <= rows; r++) {
    for (let c = -1; c <= cols; c++) {
      const cx = (c + (r % 2 === 0 ? 0 : 0.5)) * rx;
      const cy = r * ry;
      const g = ctx.createRadialGradient(cx, cy - ry * 0.15, 2, cx, cy, rx * 0.65);
      g.addColorStop(0, edgeHex);
      g.addColorStop(0.55, baseHex);
      g.addColorStop(1, darkHex);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, rx * 0.56, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 2;
      ctx.stroke();

      const bg = bCtx.createRadialGradient(cx, cy - ry * 0.1, 2, cx, cy, rx * 0.56);
      bg.addColorStop(0, '#f2f2f2');
      bg.addColorStop(0.75, '#8c8c8c');
      bg.addColorStop(1, '#202020');
      bCtx.fillStyle = bg;
      bCtx.beginPath();
      bCtx.arc(cx, cy, rx * 0.54, 0, Math.PI * 2);
      bCtx.fill();
    }
  }

  const map = new THREE.CanvasTexture(colCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2, 2);
  map.anisotropy = 4;
  map.colorSpace = THREE.SRGBColorSpace;

  const bump = new THREE.CanvasTexture(bumpCanvas);
  bump.wrapS = THREE.RepeatWrapping;
  bump.wrapT = THREE.RepeatWrapping;
  bump.repeat.set(2, 2);
  bump.anisotropy = 4;
  return { map, bump };
}

function createTortoiseHexTexturePair(): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const size = 256;
  const colCanvas = document.createElement('canvas');
  colCanvas.width = size;
  colCanvas.height = size;
  const ctx = colCanvas.getContext('2d')!;
  ctx.fillStyle = '#141e28';
  ctx.fillRect(0, 0, size, size);

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;
  bCtx.fillStyle = '#202020';
  bCtx.fillRect(0, 0, size, size);

  const r = 24;
  const dx = r * 1.65;
  const dy = r * 1.45;
  const drawHex = (c2d: CanvasRenderingContext2D, x: number, y: number, rad: number) => {
    c2d.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const px = x + Math.cos(a) * rad;
      const py = y + Math.sin(a) * rad;
      if (i === 0) c2d.moveTo(px, py);
      else c2d.lineTo(px, py);
    }
    c2d.closePath();
  };

  for (let row = -1; row < 10; row++) {
    for (let col = -1; col < 10; col++) {
      const cx = col * dx + (row % 2 === 0 ? 0 : dx * 0.5);
      const cy = row * dy;
      drawHex(ctx, cx, cy, r * 0.88);
      const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, r * 0.88);
      g.addColorStop(0, '#364d5e');
      g.addColorStop(0.68, '#1e2f3d');
      g.addColorStop(1, '#0e1720');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = '#38e8d8';
      ctx.lineWidth = 3;
      ctx.stroke();

      drawHex(bCtx, cx, cy, r * 0.85);
      bCtx.fillStyle = '#d4d4d4';
      bCtx.fill();
      bCtx.strokeStyle = '#1a1a1a';
      bCtx.lineWidth = 6;
      bCtx.stroke();
    }
  }

  const map = new THREE.CanvasTexture(colCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(1.5, 1.5);
  map.anisotropy = 4;
  map.colorSpace = THREE.SRGBColorSpace;

  const bump = new THREE.CanvasTexture(bumpCanvas);
  bump.wrapS = THREE.RepeatWrapping;
  bump.wrapT = THREE.RepeatWrapping;
  bump.repeat.set(1.5, 1.5);
  bump.anisotropy = 4;
  return { map, bump };
}

function createSlimeTexture(
  topHex = '#62f7be',
  midHex = '#23ba83',
  botHex = '#0f5c41',
  spotRgba = 'rgba(205, 255, 232, 0.44)',
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, topHex);
  grad.addColorStop(0.52, midHex);
  grad.addColorStop(1, botHex);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 32; i++) {
    const x = (i * 53) % size;
    const y = (i * 79) % size;
    const r = 6 + (i % 14);
    const rg = ctx.createRadialGradient(x, y, 1, x, y, r);
    rg.addColorStop(0, spotRgba);
    rg.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = spotRgba;
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 8; i++) {
    const y = 20 + i * 28;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(size * 0.33, y - 6, size * 0.66, y + 6, size, y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class MonsterLibrary {
  private disposables: Array<{ dispose: () => void }> = [];

  private boarFurMat: THREE.MeshPhysicalMaterial;
  private boarDarkMat: THREE.MeshStandardMaterial;
  private boarSnoutMat: THREE.MeshStandardMaterial;
  private boarHoofMat: THREE.MeshStandardMaterial;
  private boarEyeMat: THREE.MeshPhysicalMaterial;
  private tuskMat: THREE.MeshStandardMaterial;
  private pinkInnerMat: THREE.MeshStandardMaterial;

  private slimeOuterMat: THREE.MeshPhysicalMaterial;
  private slimeInnerMat: THREE.MeshStandardMaterial;
  private slimeCoreMat: THREE.MeshStandardMaterial;
  private slimeBubbleMat: THREE.MeshPhysicalMaterial;
  private mossLeafMat: THREE.MeshStandardMaterial;
  private mushroomCapMat: THREE.MeshStandardMaterial;

  private wolfFurMat: THREE.MeshPhysicalMaterial;
  private wolfDarkMat: THREE.MeshStandardMaterial;
  private wolfBellyMat: THREE.MeshPhysicalMaterial;
  private wolfNoseMat: THREE.MeshStandardMaterial;
  private wolfEyeMat: THREE.MeshStandardMaterial;
  private eyeDarkMat: THREE.MeshPhysicalMaterial;
  private eyeSpecMat: THREE.MeshBasicMaterial;

  // Mid-Boss dedicated materials
  private bossIronMat: THREE.MeshStandardMaterial;
  private bossGoldMat: THREE.MeshStandardMaterial;
  private bossCrimsonGlowMat: THREE.MeshStandardMaterial;
  private bossIceCrystalMat: THREE.MeshPhysicalMaterial;
  private bossGolemStoneMat: THREE.MeshStandardMaterial;
  private bossRuneCyanMat: THREE.MeshStandardMaterial;

  // Nocturnal Undead dedicated materials
  private undeadBoneMat: THREE.MeshStandardMaterial;
  private undeadDarkIronMat: THREE.MeshStandardMaterial;
  private undeadCloakMat: THREE.MeshStandardMaterial;
  private undeadSoulGlowMat: THREE.MeshStandardMaterial;
  private undeadVioletGlowMat: THREE.MeshStandardMaterial;

  // 4 Elemental Slime & Ember Wolf & 4 Guardian Spirits (청룡·백호·주작·현무) materials
  private waterSlimeOuterMat: THREE.MeshPhysicalMaterial;
  private waterSlimeInnerMat: THREE.MeshStandardMaterial;
  private waterSlimeCoreMat: THREE.MeshStandardMaterial;

  private fireSlimeOuterMat: THREE.MeshPhysicalMaterial;
  private fireSlimeInnerMat: THREE.MeshStandardMaterial;
  private fireSlimeCoreMat: THREE.MeshStandardMaterial;

  private windSlimeOuterMat: THREE.MeshPhysicalMaterial;
  private windSlimeInnerMat: THREE.MeshStandardMaterial;
  private windSlimeCoreMat: THREE.MeshStandardMaterial;

  private earthSlimeOuterMat: THREE.MeshPhysicalMaterial;
  private earthSlimeInnerMat: THREE.MeshStandardMaterial;
  private earthSlimeCoreMat: THREE.MeshStandardMaterial;

  private emberWolfFurMat: THREE.MeshPhysicalMaterial;
  private emberWolfDarkMat: THREE.MeshStandardMaterial;
  private emberWolfManeMat: THREE.MeshStandardMaterial;

  private azureDragonScaleMat: THREE.MeshPhysicalMaterial;
  private azureDragonBellyMat: THREE.MeshStandardMaterial;
  private azureDragonFinMat: THREE.MeshStandardMaterial;
  private azurePearlMat: THREE.MeshStandardMaterial;

  private whiteTigerFurMat: THREE.MeshPhysicalMaterial;
  private whiteTigerManeMat: THREE.MeshStandardMaterial;
  private whiteTigerEyeMat: THREE.MeshStandardMaterial;

  private phoenixBodyMat: THREE.MeshPhysicalMaterial;
  private phoenixGoldMat: THREE.MeshStandardMaterial;
  private phoenixFlameMat: THREE.MeshStandardMaterial;

  private tortoiseShellMat: THREE.MeshPhysicalMaterial;
  private tortoiseSkinMat: THREE.MeshStandardMaterial;
  private tortoiseSerpentMat: THREE.MeshPhysicalMaterial;
  private tortoiseJadeMat: THREE.MeshStandardMaterial;

  constructor() {
    const boarTex = createFurTexturePair('#7a4d30', '#331c0e', '#b37d56', 680);
    const wolfTex = createFurTexturePair('#6c829e', '#334154', '#d9e7f7', 760);
    const wolfWhiteTex = createFurTexturePair('#e2ecf7', '#94a7bd', '#ffffff', 520);
    const emberWolfTex = createFurTexturePair('#2b1a18', '#140b0a', '#b93818', 720);
    const slimeTex = createSlimeTexture();
    const waterSlimeTex = createSlimeTexture('#9ef4ff', '#0ea5e9', '#075985', 'rgba(224, 249, 255, 0.56)');
    const fireSlimeTex = createSlimeTexture('#fde047', '#f97316', '#9a1c1c', 'rgba(255, 237, 150, 0.55)');
    const windSlimeTex = createSlimeTexture('#ccfbf1', '#14b8a6', '#115e59', 'rgba(240, 253, 250, 0.58)');
    const earthSlimeTex = createSlimeTexture('#fde68a', '#b47b34', '#4d3217', 'rgba(254, 243, 199, 0.45)');

    const azureScaleTex = createDragonScaleTexturePair('#0ea5e9', '#67e8f9', '#0b2e59');
    const phoenixScaleTex = createDragonScaleTexturePair('#dc2626', '#fbbf24', '#5c0c0c');
    const serpentScaleTex = createDragonScaleTexturePair('#115e59', '#5eead4', '#082226');
    const tigerTex = createTigerStripeTexturePair();
    const tortoiseHexTex = createTortoiseHexTexturePair();

    this.disposables.push(
      boarTex.map,
      boarTex.bump,
      wolfTex.map,
      wolfTex.bump,
      wolfWhiteTex.map,
      wolfWhiteTex.bump,
      emberWolfTex.map,
      emberWolfTex.bump,
      slimeTex,
      waterSlimeTex,
      fireSlimeTex,
      windSlimeTex,
      earthSlimeTex,
      azureScaleTex.map,
      azureScaleTex.bump,
      phoenixScaleTex.map,
      phoenixScaleTex.bump,
      serpentScaleTex.map,
      serpentScaleTex.bump,
      tigerTex.map,
      tigerTex.bump,
      tortoiseHexTex.map,
      tortoiseHexTex.bump,
    );

    this.boarFurMat = new THREE.MeshPhysicalMaterial({
      map: boarTex.map,
      bumpMap: boarTex.bump,
      bumpScale: 0.032,
      color: 0x825538,
      roughness: 0.88,
      metalness: 0.02,
      sheen: 0.32,
      sheenRoughness: 0.85,
      sheenColor: new THREE.Color(0xc2936b),
    });
    this.boarDarkMat = new THREE.MeshStandardMaterial({
      bumpMap: boarTex.bump,
      bumpScale: 0.024,
      color: 0x352014,
      roughness: 0.92,
      metalness: 0.04,
    });
    this.boarSnoutMat = new THREE.MeshStandardMaterial({
      color: 0x9b6b5d,
      roughness: 0.48,
      metalness: 0.04,
    });
    this.boarHoofMat = new THREE.MeshStandardMaterial({
      color: 0x221a16,
      roughness: 0.36,
      metalness: 0.14,
    });
    this.boarEyeMat = new THREE.MeshPhysicalMaterial({
      color: 0xd97706,
      emissive: 0x6b2f00,
      emissiveIntensity: 0.45,
      roughness: 0.12,
      clearcoat: 1.0,
    });
    this.tuskMat = new THREE.MeshStandardMaterial({
      color: 0xf7efe0,
      roughness: 0.34,
      metalness: 0.06,
    });
    this.pinkInnerMat = new THREE.MeshStandardMaterial({
      color: 0xb97573,
      roughness: 0.78,
    });

    this.slimeOuterMat = new THREE.MeshPhysicalMaterial({
      map: slimeTex,
      color: 0x52e3aa,
      emissive: 0x0f5c47,
      emissiveIntensity: 0.28,
      roughness: 0.09,
      metalness: 0.02,
      transparent: true,
      opacity: 0.7,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      sheen: 0.35,
      sheenColor: new THREE.Color(0xb8ffe2),
      depthWrite: false,
    });
    this.slimeInnerMat = new THREE.MeshStandardMaterial({
      color: 0x1ea373,
      emissive: 0x0e5e43,
      emissiveIntensity: 0.42,
      roughness: 0.24,
      transparent: true,
      opacity: 0.52,
    });
    this.slimeCoreMat = new THREE.MeshStandardMaterial({
      color: 0xd1fae5,
      emissive: 0x34d399,
      emissiveIntensity: 1.35,
      roughness: 0.16,
    });
    this.slimeBubbleMat = new THREE.MeshPhysicalMaterial({
      color: 0xdffef2,
      roughness: 0.08,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.65,
    });
    this.mossLeafMat = new THREE.MeshStandardMaterial({
      color: 0x4ca142,
      roughness: 0.8,
      metalness: 0.02,
    });
    this.mushroomCapMat = new THREE.MeshStandardMaterial({
      color: 0xe76f51,
      roughness: 0.55,
    });

    this.wolfFurMat = new THREE.MeshPhysicalMaterial({
      map: wolfTex.map,
      bumpMap: wolfTex.bump,
      bumpScale: 0.028,
      color: 0x7a8ca5,
      roughness: 0.82,
      metalness: 0.04,
      sheen: 0.45,
      sheenRoughness: 0.72,
      sheenColor: new THREE.Color(0xdbeafe),
    });
    this.wolfDarkMat = new THREE.MeshStandardMaterial({
      bumpMap: wolfTex.bump,
      bumpScale: 0.024,
      color: 0x3a4759,
      roughness: 0.86,
      metalness: 0.06,
    });
    this.wolfBellyMat = new THREE.MeshPhysicalMaterial({
      map: wolfWhiteTex.map,
      bumpMap: wolfWhiteTex.bump,
      bumpScale: 0.02,
      color: 0xe2eaf4,
      roughness: 0.8,
      sheen: 0.5,
      sheenColor: new THREE.Color(0xffffff),
    });
    this.wolfNoseMat = new THREE.MeshStandardMaterial({
      color: 0x181c22,
      roughness: 0.24,
      metalness: 0.1,
    });
    this.wolfEyeMat = new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.45,
      roughness: 0.12,
    });
    this.eyeDarkMat = new THREE.MeshPhysicalMaterial({
      color: 0x101318,
      roughness: 0.08,
      clearcoat: 1.0,
    });
    this.eyeSpecMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    this.bossIronMat = new THREE.MeshStandardMaterial({
      color: 0x2c3440,
      roughness: 0.38,
      metalness: 0.84,
    });
    this.bossGoldMat = new THREE.MeshStandardMaterial({
      color: 0xe6b43c,
      roughness: 0.28,
      metalness: 0.88,
    });
    this.bossCrimsonGlowMat = new THREE.MeshStandardMaterial({
      color: 0xff6b4a,
      emissive: 0xff3b1f,
      emissiveIntensity: 1.55,
      roughness: 0.2,
    });
    this.bossIceCrystalMat = new THREE.MeshPhysicalMaterial({
      color: 0x9be7ff,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.9,
      roughness: 0.14,
      metalness: 0.12,
      clearcoat: 1.0,
    });
    this.bossGolemStoneMat = new THREE.MeshStandardMaterial({
      bumpMap: boarTex.bump,
      bumpScale: 0.04,
      color: 0x4e5968,
      roughness: 0.84,
      metalness: 0.18,
    });
    this.bossRuneCyanMat = new THREE.MeshStandardMaterial({
      color: 0x7cf7ff,
      emissive: 0x22d3ee,
      emissiveIntensity: 1.65,
      roughness: 0.18,
    });

    // Nocturnal Undead materials (high roughness/metalness contrast for crisp silhouette at night)
    this.undeadBoneMat = new THREE.MeshStandardMaterial({
      bumpMap: boarTex.bump,
      bumpScale: 0.022,
      color: 0xd9d2c0,
      roughness: 0.84,
      metalness: 0.05,
    });
    this.undeadDarkIronMat = new THREE.MeshStandardMaterial({
      color: 0x2a2f3a,
      roughness: 0.34,
      metalness: 0.78,
    });
    this.undeadCloakMat = new THREE.MeshStandardMaterial({
      color: 0x1c172b,
      roughness: 0.92,
      metalness: 0.04,
      side: THREE.DoubleSide,
    });
    this.undeadSoulGlowMat = new THREE.MeshStandardMaterial({
      color: 0x67ffd8,
      emissive: 0x10e8a8,
      emissiveIntensity: 1.85,
      roughness: 0.16,
      metalness: 0.1,
    });
    this.undeadVioletGlowMat = new THREE.MeshStandardMaterial({
      color: 0xd8a8ff,
      emissive: 0x9333ea,
      emissiveIntensity: 1.9,
      roughness: 0.16,
      metalness: 0.12,
    });

    // Elemental Slimes (Water / Fire / Wind / Earth)
    this.waterSlimeOuterMat = new THREE.MeshPhysicalMaterial({
      map: waterSlimeTex,
      color: 0x56d8ff,
      emissive: 0x0369a1,
      emissiveIntensity: 0.36,
      roughness: 0.06,
      metalness: 0.05,
      transparent: true,
      opacity: 0.74,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      depthWrite: false,
    });
    this.waterSlimeInnerMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x0c4a6e,
      emissiveIntensity: 0.45,
      roughness: 0.2,
      transparent: true,
      opacity: 0.58,
    });
    this.waterSlimeCoreMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.7,
      roughness: 0.12,
    });

    this.fireSlimeOuterMat = new THREE.MeshPhysicalMaterial({
      map: fireSlimeTex,
      color: 0xff8a2b,
      emissive: 0xb91c1c,
      emissiveIntensity: 0.48,
      roughness: 0.14,
      metalness: 0.06,
      transparent: true,
      opacity: 0.82,
      clearcoat: 0.9,
      depthWrite: false,
    });
    this.fireSlimeInnerMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      emissive: 0x991b1b,
      emissiveIntensity: 0.65,
      roughness: 0.25,
      transparent: true,
      opacity: 0.68,
    });
    this.fireSlimeCoreMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf97316,
      emissiveIntensity: 2.0,
      roughness: 0.14,
    });

    this.windSlimeOuterMat = new THREE.MeshPhysicalMaterial({
      map: windSlimeTex,
      color: 0x6ef7df,
      emissive: 0x0f766e,
      emissiveIntensity: 0.38,
      roughness: 0.08,
      metalness: 0.04,
      transparent: true,
      opacity: 0.72,
      clearcoat: 1.0,
      depthWrite: false,
    });
    this.windSlimeInnerMat = new THREE.MeshStandardMaterial({
      color: 0x14b8a6,
      emissive: 0x0d9488,
      emissiveIntensity: 0.48,
      roughness: 0.2,
      transparent: true,
      opacity: 0.56,
    });
    this.windSlimeCoreMat = new THREE.MeshStandardMaterial({
      color: 0xecfeff,
      emissive: 0x2dd4bf,
      emissiveIntensity: 1.75,
      roughness: 0.14,
    });

    this.earthSlimeOuterMat = new THREE.MeshPhysicalMaterial({
      map: earthSlimeTex,
      color: 0xd69f54,
      emissive: 0x5c3a14,
      emissiveIntensity: 0.28,
      roughness: 0.32,
      metalness: 0.12,
      transparent: true,
      opacity: 0.86,
      clearcoat: 0.65,
      depthWrite: false,
    });
    this.earthSlimeInnerMat = new THREE.MeshStandardMaterial({
      color: 0x785226,
      emissive: 0x452a0e,
      emissiveIntensity: 0.35,
      roughness: 0.45,
      transparent: true,
      opacity: 0.72,
    });
    this.earthSlimeCoreMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.65,
      roughness: 0.16,
    });

    // Ember Wolf (South Fire Region)
    this.emberWolfFurMat = new THREE.MeshPhysicalMaterial({
      map: emberWolfTex.map,
      bumpMap: emberWolfTex.bump,
      bumpScale: 0.036,
      color: 0x45221c,
      emissive: 0x3b0c06,
      emissiveIntensity: 0.32,
      roughness: 0.74,
      metalness: 0.08,
      sheen: 0.45,
      sheenColor: new THREE.Color(0xff6b2b),
    });
    this.emberWolfDarkMat = new THREE.MeshStandardMaterial({
      bumpMap: emberWolfTex.bump,
      bumpScale: 0.028,
      color: 0x1c1212,
      roughness: 0.82,
      metalness: 0.14,
    });
    this.emberWolfManeMat = new THREE.MeshStandardMaterial({
      color: 0xff9a2e,
      emissive: 0xf97316,
      emissiveIntensity: 1.15,
      roughness: 0.3,
    });

    // Four Guardian Spirits (청룡·백호·주작·현무)
    this.azureDragonScaleMat = new THREE.MeshPhysicalMaterial({
      map: azureScaleTex.map,
      bumpMap: azureScaleTex.bump,
      bumpScale: 0.055,
      color: 0x1cb7eb,
      emissive: 0x074878,
      emissiveIntensity: 0.36,
      roughness: 0.24,
      metalness: 0.38,
      clearcoat: 0.85,
      clearcoatRoughness: 0.14,
    });
    this.azureDragonBellyMat = new THREE.MeshStandardMaterial({
      color: 0xb8f3ff,
      emissive: 0x0e7490,
      emissiveIntensity: 0.22,
      roughness: 0.4,
      metalness: 0.2,
    });
    this.azureDragonFinMat = new THREE.MeshStandardMaterial({
      color: 0x7ef9ff,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.45,
      roughness: 0.18,
      side: THREE.DoubleSide,
    });
    this.azurePearlMat = new THREE.MeshStandardMaterial({
      color: 0xfef9c3,
      emissive: 0xfacc15,
      emissiveIntensity: 2.1,
      roughness: 0.1,
    });

    this.whiteTigerFurMat = new THREE.MeshPhysicalMaterial({
      map: tigerTex.map,
      bumpMap: tigerTex.bump,
      bumpScale: 0.036,
      color: 0xf5f9ff,
      roughness: 0.68,
      metalness: 0.04,
      sheen: 0.6,
      sheenColor: new THREE.Color(0xcffafe),
    });
    this.whiteTigerManeMat = new THREE.MeshStandardMaterial({
      color: 0xe6f8ff,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.4,
      roughness: 0.5,
    });
    this.whiteTigerEyeMat = new THREE.MeshStandardMaterial({
      color: 0x67ffd8,
      emissive: 0x10b981,
      emissiveIntensity: 2.0,
      roughness: 0.1,
    });

    this.phoenixBodyMat = new THREE.MeshPhysicalMaterial({
      map: phoenixScaleTex.map,
      bumpMap: phoenixScaleTex.bump,
      bumpScale: 0.045,
      color: 0xef3226,
      emissive: 0x991b1b,
      emissiveIntensity: 0.55,
      roughness: 0.28,
      metalness: 0.25,
      clearcoat: 0.7,
    });
    this.phoenixGoldMat = new THREE.MeshStandardMaterial({
      color: 0xfde047,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.35,
      roughness: 0.22,
      metalness: 0.65,
    });
    this.phoenixFlameMat = new THREE.MeshStandardMaterial({
      color: 0xff9f2e,
      emissive: 0xff4500,
      emissiveIntensity: 1.85,
      roughness: 0.2,
      side: THREE.DoubleSide,
    });

    this.tortoiseShellMat = new THREE.MeshPhysicalMaterial({
      map: tortoiseHexTex.map,
      bumpMap: tortoiseHexTex.bump,
      bumpScale: 0.075,
      color: 0x2c4252,
      emissive: 0x0b3642,
      emissiveIntensity: 0.3,
      roughness: 0.42,
      metalness: 0.36,
      clearcoat: 0.5,
    });
    this.tortoiseSkinMat = new THREE.MeshStandardMaterial({
      bumpMap: boarTex.bump,
      bumpScale: 0.036,
      color: 0x25303b,
      roughness: 0.82,
      metalness: 0.14,
    });
    this.tortoiseSerpentMat = new THREE.MeshPhysicalMaterial({
      map: serpentScaleTex.map,
      bumpMap: serpentScaleTex.bump,
      bumpScale: 0.05,
      color: 0x14b8a6,
      emissive: 0x0f766e,
      emissiveIntensity: 0.48,
      roughness: 0.26,
      metalness: 0.32,
      clearcoat: 0.8,
    });
    this.tortoiseJadeMat = new THREE.MeshStandardMaterial({
      color: 0x99f6e4,
      emissive: 0x2dd4bf,
      emissiveIntensity: 1.8,
      roughness: 0.14,
    });

    this.disposables.push(
      this.boarFurMat,
      this.boarDarkMat,
      this.boarSnoutMat,
      this.boarHoofMat,
      this.boarEyeMat,
      this.tuskMat,
      this.pinkInnerMat,
      this.slimeOuterMat,
      this.slimeInnerMat,
      this.slimeCoreMat,
      this.slimeBubbleMat,
      this.mossLeafMat,
      this.mushroomCapMat,
      this.wolfFurMat,
      this.wolfDarkMat,
      this.wolfBellyMat,
      this.wolfNoseMat,
      this.wolfEyeMat,
      this.eyeDarkMat,
      this.eyeSpecMat,
      this.bossIronMat,
      this.bossGoldMat,
      this.bossCrimsonGlowMat,
      this.bossIceCrystalMat,
      this.bossGolemStoneMat,
      this.bossRuneCyanMat,
      this.undeadBoneMat,
      this.undeadDarkIronMat,
      this.undeadCloakMat,
      this.undeadSoulGlowMat,
      this.undeadVioletGlowMat,
      this.waterSlimeOuterMat,
      this.waterSlimeInnerMat,
      this.waterSlimeCoreMat,
      this.fireSlimeOuterMat,
      this.fireSlimeInnerMat,
      this.fireSlimeCoreMat,
      this.windSlimeOuterMat,
      this.windSlimeInnerMat,
      this.windSlimeCoreMat,
      this.earthSlimeOuterMat,
      this.earthSlimeInnerMat,
      this.earthSlimeCoreMat,
      this.emberWolfFurMat,
      this.emberWolfDarkMat,
      this.emberWolfManeMat,
      this.azureDragonScaleMat,
      this.azureDragonBellyMat,
      this.azureDragonFinMat,
      this.azurePearlMat,
      this.whiteTigerFurMat,
      this.whiteTigerManeMat,
      this.whiteTigerEyeMat,
      this.phoenixBodyMat,
      this.phoenixGoldMat,
      this.phoenixFlameMat,
      this.tortoiseShellMat,
      this.tortoiseSkinMat,
      this.tortoiseSerpentMat,
      this.tortoiseJadeMat,
    );
  }

  private trackGeo<T extends THREE.BufferGeometry>(geo: T): T {
    this.disposables.push(geo);
    return geo;
  }

  public createMonster(
    id: string,
    species: MonsterSpecies,
    x: number,
    z: number,
    tier: number,
  ): WorldMonster {
    const y = getTerrainHeight(x, z);
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const bodyGroup = new THREE.Group();
    group.add(bodyGroup);

    const hitMeshes: THREE.Mesh[] = [];
    const legs: THREE.Group[] = [];
    const lowerLegs: THREE.Group[] = [];
    const tailSegments: THREE.Group[] = [];
    let headPivot: THREE.Group | undefined;
    let tail: THREE.Object3D | undefined;

    const isBoss =
      species === 'elder_tusk_boss' ||
      species === 'alpha_frost_boss' ||
      species === 'rune_golem_boss' ||
      species === 'coastal_titan_boss' ||
      species === 'azure_dragon_boss' ||
      species === 'white_tiger_boss' ||
      species === 'vermilion_phoenix_boss' ||
      species === 'black_tortoise_boss';

    // Ground contact shadow
    const shadowRadius =
      species === 'azure_dragon_boss' || species === 'black_tortoise_boss'
        ? 2.15
        : species === 'vermilion_phoenix_boss' || species === 'white_tiger_boss'
          ? 1.85
          : species === 'elder_tusk_boss'
            ? 1.55
            : species === 'alpha_frost_boss'
              ? 1.5
              : species === 'rune_golem_boss'
                ? 1.65
                : species === 'coastal_titan_boss'
                  ? 1.6
                  : species === 'frost_wolf' || species === 'ember_wolf'
                    ? 0.84
                    : species === 'meadow_boar'
                      ? 0.78
                      : 0.7;
    const shadowGeo = this.trackGeo(new THREE.CircleGeometry(shadowRadius, 24));
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x0b1014,
      transparent: true,
      opacity: isBoss ? 0.48 : 0.38,
      depthWrite: false,
    });
    this.disposables.push(shadowMat);
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.position.y = 0.03;
    group.add(shadow);

    let auraRing: THREE.Mesh | undefined;
    let telegraphGroup: THREE.Group | undefined;
    let telegraphFill: THREE.Mesh | undefined;
    let telegraphOuter: THREE.Mesh | undefined;

    if (isBoss) {
      const auraHex =
        species === 'azure_dragon_boss'
          ? 0x0ea5e9
          : species === 'white_tiger_boss'
            ? 0x67ffd8
            : species === 'vermilion_phoenix_boss'
              ? 0xff4d1f
              : species === 'black_tortoise_boss'
                ? 0x2dd4bf
                : species === 'elder_tusk_boss'
                  ? 0xf97316
                  : species === 'alpha_frost_boss'
                    ? 0x38bdf8
                    : species === 'coastal_titan_boss'
                      ? 0x14b8a6
                      : 0x22d3ee;
      const auraGeo = this.trackGeo(new THREE.RingGeometry(shadowRadius * 0.92, shadowRadius * 1.16, 36));
      auraGeo.rotateX(-Math.PI / 2);
      const auraMat = new THREE.MeshBasicMaterial({
        color: auraHex,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false,
        fog: false,
      });
      this.disposables.push(auraMat);
      auraRing = new THREE.Mesh(auraGeo, auraMat);
      auraRing.position.y = 0.06;
      auraRing.renderOrder = 3;
      group.add(auraRing);

      // Telegraphed AoE danger zone ring (hidden until boss starts casting slam!)
      telegraphGroup = new THREE.Group();
      telegraphGroup.position.y = 0.09;
      telegraphGroup.visible = false;

      const outerGeo = this.trackGeo(new THREE.RingGeometry(0.92, 1.0, 40));
      outerGeo.rotateX(-Math.PI / 2);
      const outerMat = new THREE.MeshBasicMaterial({
        color: 0xff3b3b,
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide,
        depthWrite: false,
        fog: false,
      });
      this.disposables.push(outerMat);
      telegraphOuter = new THREE.Mesh(outerGeo, outerMat);
      telegraphOuter.renderOrder = 6;
      telegraphGroup.add(telegraphOuter);

      const fillGeo = this.trackGeo(new THREE.CircleGeometry(1.0, 36));
      fillGeo.rotateX(-Math.PI / 2);
      const fillMat = new THREE.MeshBasicMaterial({
        color: 0xff4d4d,
        transparent: true,
        opacity: 0.24,
        side: THREE.DoubleSide,
        depthWrite: false,
        fog: false,
      });
      this.disposables.push(fillMat);
      telegraphFill = new THREE.Mesh(fillGeo, fillMat);
      telegraphFill.scale.setScalar(0.05);
      telegraphFill.renderOrder = 5;
      telegraphGroup.add(telegraphFill);
      group.add(telegraphGroup);
    }

    const cloneMat = <T extends THREE.Material>(m: T): T => {
      const c = m.clone();
      this.disposables.push(c);
      return c;
    };

    if (species === 'meadow_boar' || species === 'elder_tusk_boss') {
      const furM = cloneMat(this.boarFurMat);
      const darkM = cloneMat(this.boarDarkMat);

      // Muscular chest barrel + sloped shoulder hump + sculpted hindquarters
      const torso = new THREE.Mesh(this.trackGeo(new THREE.CapsuleGeometry(0.41, 0.54, 10, 18)), furM);
      torso.rotation.x = Math.PI / 2;
      torso.scale.set(1.02, 1.0, 0.96);
      torso.position.set(0, 0.66, 0);
      bodyGroup.add(torso);
      hitMeshes.push(torso);

      const shoulderHump = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.44, 16, 14)), furM);
      shoulderHump.scale.set(1.04, 1.08, 1.02);
      shoulderHump.position.set(0, 0.74, 0.28);
      bodyGroup.add(shoulderHump);
      hitMeshes.push(shoulderHump);

      const rump = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.36, 14, 12)), furM);
      rump.scale.set(0.96, 0.94, 1.05);
      rump.position.set(0, 0.62, -0.34);
      bodyGroup.add(rump);

      // Bristled dorsal Mohawk crest (5 layered spikes along the spine)
      for (let s = 0; s < 5; s++) {
        const bristle = new THREE.Mesh(
          this.trackGeo(new THREE.ConeGeometry(0.085 - s * 0.008, 0.26 - s * 0.025, 6)),
          darkM,
        );
        bristle.position.set(0, 1.14 - s * 0.04, 0.36 - s * 0.18);
        bristle.rotation.x = -0.32;
        bristle.scale.set(0.6, 1.0, 1.45);
        bodyGroup.add(bristle);
      }

      // Articulated Head Pivot
      headPivot = new THREE.Group();
      headPivot.position.set(0, 0.68, 0.54);
      bodyGroup.add(headPivot);

      const cranium = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.31, 16, 14)), furM);
      cranium.scale.set(1.02, 0.94, 1.15);
      headPivot.add(cranium);
      hitMeshes.push(cranium);

      // Heavy brow ridge & coarse cheek whiskers
      const brow = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.44, 0.12, 0.24)), darkM);
      brow.position.set(0, 0.14, 0.18);
      brow.rotation.x = 0.2;
      headPivot.add(brow);

      // Tapered snout bridge + leathery pink-brown nose disc with 2 nostrils
      const snoutBridge = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.14, 0.22, 0.34, 14)), furM);
      snoutBridge.rotation.x = Math.PI / 2 + 0.1;
      snoutBridge.position.set(0, -0.05, 0.32);
      headPivot.add(snoutBridge);

      const snoutDisc = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.14, 0.135, 0.06, 16)), this.boarSnoutMat);
      snoutDisc.rotation.x = Math.PI / 2;
      snoutDisc.scale.set(1.12, 1.0, 0.86);
      snoutDisc.position.set(0, -0.08, 0.49);
      headPivot.add(snoutDisc);

      const lowerJaw = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.22, 0.11, 0.3)), darkM);
      lowerJaw.position.set(0, -0.18, 0.26);
      headPivot.add(lowerJaw);

      for (const side of [-1, 1] as const) {
        // Recessed nostrils
        const nostril = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.028, 8, 8)), this.boarHoofMat);
        nostril.position.set(side * 0.052, -0.075, 0.52);
        headPivot.add(nostril);

        // Curved realistic ivory lower tusks (TubeGeometry!)
        const tuskCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(side * 0.12, -0.14, 0.3),
          new THREE.Vector3(side * 0.24, -0.06, 0.4),
          new THREE.Vector3(side * 0.27, 0.12, 0.43),
        ]);
        const tusk = new THREE.Mesh(this.trackGeo(new THREE.TubeGeometry(tuskCurve, 10, 0.032, 8, false)), this.tuskMat);
        headPivot.add(tusk);

        const tuskTip = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.032, 0.09, 8)), this.tuskMat);
        tuskTip.position.set(side * 0.275, 0.16, 0.435);
        tuskTip.rotation.z = -side * 0.18;
        headPivot.add(tuskTip);

        // Cheek ruff tufts
        const cheekTuft = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.09, 0.22, 6)), darkM);
        cheekTuft.position.set(side * 0.28, -0.08, 0.08);
        cheekTuft.rotation.z = -side * 1.15;
        headPivot.add(cheekTuft);

        // Expressive amber eyes with pupil + specular highlight
        const eye = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.052, 10, 10)), this.boarEyeMat);
        eye.position.set(side * 0.2, 0.09, 0.22);
        headPivot.add(eye);
        const pupil = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.028, 8, 8)), this.eyeDarkMat);
        pupil.position.set(side * 0.215, 0.092, 0.26);
        headPivot.add(pupil);

        // Flared tufted ears with inner shell
        const earGroup = new THREE.Group();
        earGroup.position.set(side * 0.23, 0.24, -0.02);
        earGroup.rotation.set(-0.2, side * 0.3, -side * 0.48);
        const earOuter = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.095, 0.22, 8)), darkM);
        earOuter.scale.set(1.0, 1.0, 0.55);
        earGroup.add(earOuter);
        const earInner = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.06, 0.15, 8)), this.pinkInnerMat);
        earInner.scale.set(1.0, 1.0, 0.35);
        earInner.position.set(0, -0.01, 0.032);
        earGroup.add(earInner);
        headPivot.add(earGroup);
      }

      // 4 Two-Segment Articulated Muscular Legs + Cloven Hooves
      const legCoords: Array<[number, number, boolean]> = [
        [-0.27, 0.34, true],
        [0.27, 0.34, true],
        [-0.26, -0.34, false],
        [0.26, -0.34, false],
      ];
      for (const [lx, lz, isFront] of legCoords) {
        const hip = new THREE.Group();
        hip.position.set(lx, 0.5, lz);
        const upper = new THREE.Mesh(
          this.trackGeo(new THREE.CapsuleGeometry(isFront ? 0.115 : 0.125, 0.18, 6, 10)),
          furM,
        );
        upper.position.y = -0.11;
        hip.add(upper);

        const knee = new THREE.Group();
        knee.position.set(0, -0.22, 0);
        hip.add(knee);

        const lower = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.072, 0.056, 0.22, 8)), darkM);
        lower.position.y = -0.11;
        knee.add(lower);

        // Split cloven hooves
        for (const hSide of [-0.026, 0.026]) {
          const hoof = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.044, 0.07, 0.088)), this.boarHoofMat);
          hoof.position.set(hSide, -0.24, 0.015);
          knee.add(hoof);
        }

        bodyGroup.add(hip);
        legs.push(hip);
        lowerLegs.push(knee);
      }

      // Articulated tufted tail
      const tailPivot = new THREE.Group();
      tailPivot.position.set(0, 0.72, -0.64);
      const tailStem = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.022, 0.034, 0.26, 6)), darkM);
      tailStem.rotation.x = 0.75;
      tailStem.position.set(0, -0.05, -0.1);
      tailPivot.add(tailStem);
      const tailTuft = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.06, 0.14, 7)), darkM);
      tailTuft.rotation.x = -2.2;
      tailTuft.position.set(0, -0.14, -0.21);
      tailPivot.add(tailTuft);
      bodyGroup.add(tailPivot);
      tail = tailPivot;

      // Extra Boss Armor & War-Crown Sculpting for Elder Tusk Boar Sovereign
      if (species === 'elder_tusk_boss') {
        furM.color.setHex(0x463228);
        darkM.color.setHex(0x1f1715);

        // Forged iron dorsal plate & gold-trimmed shoulder pauldrons
        const backPlate = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.76, 0.24, 0.72)), this.bossIronMat);
        backPlate.position.set(0, 0.96, 0.2);
        backPlate.rotation.x = 0.14;
        bodyGroup.add(backPlate);
        hitMeshes.push(backPlate);

        const crownPlate = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.52, 0.18, 0.42)), this.bossIronMat);
        crownPlate.position.set(0, 0.24, 0.12);
        crownPlate.rotation.x = 0.22;
        headPivot.add(crownPlate);

        // Twin gilded war horns + volcanic crimson glowing brow gem
        const browGem = new THREE.Mesh(this.trackGeo(new THREE.OctahedronGeometry(0.085, 0)), this.bossCrimsonGlowMat);
        browGem.position.set(0, 0.26, 0.34);
        headPivot.add(browGem);

        for (const side of [-1, 1] as const) {
          const pauldron = new THREE.Mesh(
            this.trackGeo(new THREE.SphereGeometry(0.32, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.58)),
            this.bossIronMat,
          );
          pauldron.position.set(side * 0.44, 0.86, 0.32);
          pauldron.rotation.z = -side * 0.55;
          bodyGroup.add(pauldron);

          const goldBand = new THREE.Mesh(this.trackGeo(new THREE.TorusGeometry(0.044, 0.014, 6, 12)), this.bossGoldMat);
          goldBand.position.set(side * 0.25, 0.04, 0.42);
          goldBand.rotation.x = Math.PI / 2;
          headPivot.add(goldBand);

          const bossHorn = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.065, 0.42, 8)), this.bossGoldMat);
          bossHorn.position.set(side * 0.24, 0.42, 0.05);
          bossHorn.rotation.set(-0.28, 0, -side * 0.38);
          headPivot.add(bossHorn);
        }

        bodyGroup.scale.setScalar(1.74);
      }
    } else if (
      species === 'forest_slime' ||
      species === 'water_slime' ||
      species === 'fire_slime' ||
      species === 'wind_slime' ||
      species === 'earth_slime'
    ) {
      const outerM = cloneMat(
        species === 'water_slime'
          ? this.waterSlimeOuterMat
          : species === 'fire_slime'
            ? this.fireSlimeOuterMat
            : species === 'wind_slime'
              ? this.windSlimeOuterMat
              : species === 'earth_slime'
                ? this.earthSlimeOuterMat
                : this.slimeOuterMat,
      );
      const innerM = cloneMat(
        species === 'water_slime'
          ? this.waterSlimeInnerMat
          : species === 'fire_slime'
            ? this.fireSlimeInnerMat
            : species === 'wind_slime'
              ? this.windSlimeInnerMat
              : species === 'earth_slime'
                ? this.earthSlimeInnerMat
                : this.slimeInnerMat,
      );
      const coreM = cloneMat(
        species === 'water_slime'
          ? this.waterSlimeCoreMat
          : species === 'fire_slime'
            ? this.fireSlimeCoreMat
            : species === 'wind_slime'
              ? this.windSlimeCoreMat
              : species === 'earth_slime'
                ? this.earthSlimeCoreMat
                : this.slimeCoreMat,
      );

      // Rippling elemental base skirt (6 overlapping droplets/shards around rim)
      for (let b = 0; b < 6; b++) {
        const ang = (b / 6) * Math.PI * 2;
        const skirtGeo =
          species === 'earth_slime'
            ? this.trackGeo(new THREE.DodecahedronGeometry(0.24, 0))
            : this.trackGeo(new THREE.SphereGeometry(0.24, 12, 10));
        const skirtDrop = new THREE.Mesh(skirtGeo, outerM);
        skirtDrop.scale.set(1.25, 0.44, 1.15);
        skirtDrop.position.set(Math.cos(ang) * 0.42, 0.1, Math.sin(ang) * 0.42);
        skirtDrop.renderOrder = 2;
        bodyGroup.add(skirtDrop);
      }

      // Inner dense translucent membrane
      const innerDome = new THREE.Mesh(
        this.trackGeo(new THREE.SphereGeometry(0.43, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.64)),
        innerM,
      );
      innerDome.scale.set(1.05, 0.94, 1.05);
      innerDome.position.y = 0.12;
      innerDome.renderOrder = 1;
      bodyGroup.add(innerDome);

      // Glossy outer gel / mineral dome
      const domeGeo =
        species === 'earth_slime'
          ? this.trackGeo(new THREE.IcosahedronGeometry(0.62, 1))
          : this.trackGeo(new THREE.SphereGeometry(0.62, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.65));
      const dome = new THREE.Mesh(domeGeo, outerM);
      dome.scale.set(1.08, species === 'earth_slime' ? 0.78 : 0.96, 1.08);
      dome.position.y = species === 'earth_slime' ? 0.42 : 0.12;
      dome.renderOrder = 3;
      bodyGroup.add(dome);
      hitMeshes.push(dome);

      // Floating glowing elemental nucleus + orbiting elemental accents
      const coreGroup = new THREE.Group();
      coreGroup.position.set(0, 0.38, 0);
      const core = new THREE.Mesh(this.trackGeo(new THREE.OctahedronGeometry(0.2, 1)), coreM);
      coreGroup.add(core);

      const bubblePositions: Array<[number, number, number, number]> = [
        [0.24, 0.06, 0.12, 0.068],
        [-0.22, -0.05, 0.18, 0.054],
        [0.14, 0.18, -0.2, 0.058],
        [-0.18, 0.14, -0.15, 0.046],
        [0.02, -0.12, 0.26, 0.042],
      ];
      for (const [bx, by, bz, br] of bubblePositions) {
        const accentMat =
          species === 'fire_slime'
            ? this.bossIronMat
            : species === 'earth_slime'
              ? this.bossGolemStoneMat
              : this.slimeBubbleMat;
        const accentGeo =
          species === 'earth_slime' || species === 'fire_slime'
            ? this.trackGeo(new THREE.OctahedronGeometry(br * 1.2, 0))
            : this.trackGeo(new THREE.SphereGeometry(br, 10, 8));
        const bubble = new THREE.Mesh(accentGeo, accentMat);
        bubble.position.set(bx, by, bz);
        bubble.renderOrder = 2;
        coreGroup.add(bubble);
      }

      // Wind Slime: twin tilted swirling gale rings around body
      if (species === 'wind_slime') {
        const ring1 = new THREE.Mesh(this.trackGeo(new THREE.TorusGeometry(0.76, 0.036, 8, 28)), coreM);
        ring1.rotation.set(Math.PI / 2 - 0.34, 0, 0.24);
        coreGroup.add(ring1);
        const ring2 = new THREE.Mesh(this.trackGeo(new THREE.TorusGeometry(0.64, 0.028, 8, 24)), coreM);
        ring2.rotation.set(Math.PI / 2 + 0.38, 0.5, -0.28);
        coreGroup.add(ring2);
      }
      bodyGroup.add(coreGroup);
      tail = coreGroup;

      // Expressive sharp eyes (element-matched glowing iris + catchlight)
      const eyeMat =
        species === 'fire_slime'
          ? this.phoenixGoldMat
          : species === 'water_slime'
            ? this.waterSlimeCoreMat
            : species === 'wind_slime'
              ? this.windSlimeCoreMat
              : species === 'earth_slime'
                ? this.earthSlimeCoreMat
                : this.eyeDarkMat;
      for (const side of [-1, 1] as const) {
        const rim = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.082, 12, 10)), this.eyeDarkMat);
        rim.position.set(side * 0.22, 0.38, 0.52);
        rim.renderOrder = 4;
        bodyGroup.add(rim);

        const eye = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.056, 12, 10)), eyeMat);
        eye.position.set(side * 0.22, 0.38, 0.56);
        eye.renderOrder = 5;
        bodyGroup.add(eye);

        const spec = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.022, 8, 8)), this.eyeSpecMat);
        spec.position.set(side * 0.22 - 0.018, 0.405, 0.605);
        spec.renderOrder = 6;
        bodyGroup.add(spec);
      }

      // Species-distinct elemental crown ornament (instant silhouette readability!)
      const crownPivot = new THREE.Group();
      crownPivot.position.set(0, 0.68, -0.02);
      if (species === 'water_slime') {
        // Crystalline aqua droplet crest + twin water fins
        const drop = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.16, 0.38, 12)), coreM);
        drop.position.y = 0.16;
        crownPivot.add(drop);
        for (const side of [-1, 1] as const) {
          const fin = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.09, 0.26, 8)), outerM);
          fin.position.set(side * 0.22, 0.06, -0.06);
          fin.rotation.z = -side * 0.72;
          crownPivot.add(fin);
        }
      } else if (species === 'fire_slime') {
        // Blazing triple-tongue flame crown + obsidian horns
        const centerFlame = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.18, 0.46, 8)), coreM);
        centerFlame.position.y = 0.2;
        crownPivot.add(centerFlame);
        for (const side of [-1, 1] as const) {
          const sideFlame = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.11, 0.32, 7)), this.phoenixFlameMat);
          sideFlame.position.set(side * 0.2, 0.12, -0.04);
          sideFlame.rotation.z = -side * 0.45;
          crownPivot.add(sideFlame);
        }
      } else if (species === 'wind_slime') {
        // Swept aerodynamic breeze wings on top
        for (const side of [-1, 1] as const) {
          const wing = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.1, 0.44, 6)), coreM);
          wing.position.set(side * 0.28, 0.1, -0.08);
          wing.rotation.set(-0.35, 0, -side * 1.05);
          crownPivot.add(wing);
        }
      } else if (species === 'earth_slime') {
        // Protruding amber-quartz crystal cluster
        for (let k = 0; k < 4; k++) {
          const ang = (k / 4) * Math.PI * 2 + 0.4;
          const shard = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.11, 0.36 + (k % 2) * 0.12, 5)), coreM);
          shard.position.set(Math.cos(ang) * 0.16, 0.14, Math.sin(ang) * 0.16);
          shard.rotation.set(Math.sin(ang) * 0.38, ang, -Math.cos(ang) * 0.38);
          crownPivot.add(shard);
        }
      } else {
        // Classic Forest Moss Slime sprout & red mushroom
        const stem = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.022, 0.028, 0.16, 6)), this.mossLeafMat);
        stem.position.set(0.06, 0.07, -0.02);
        crownPivot.add(stem);
        for (const side of [-1, 1] as const) {
          const leaf = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.09, 10, 8)), this.mossLeafMat);
          leaf.scale.set(1.4, 0.28, 0.72);
          leaf.position.set(0.06 + side * 0.09, 0.14, -0.02);
          leaf.rotation.z = -side * 0.35;
          crownPivot.add(leaf);
        }
        const mStem = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.018, 0.024, 0.1, 6)), this.tuskMat);
        mStem.position.set(-0.14, 0.01, 0.08);
        crownPivot.add(mStem);
        const mCap = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.072, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55)), this.mushroomCapMat);
        mCap.position.set(-0.14, 0.055, 0.08);
        crownPivot.add(mCap);
      }
      bodyGroup.add(crownPivot);
      headPivot = crownPivot;
    } else if (species === 'frost_wolf' || species === 'ember_wolf' || species === 'alpha_frost_boss') {
      // Highland Frost Wolf / Southern Ember Wolf — athletic predator anatomy
      const isEmber = species === 'ember_wolf';
      const furM = cloneMat(isEmber ? this.emberWolfFurMat : this.wolfFurMat);
      const darkM = cloneMat(isEmber ? this.emberWolfDarkMat : this.wolfDarkMat);
      const bellyM = cloneMat(isEmber ? this.emberWolfManeMat : this.wolfBellyMat);

      // Deep muscular ribcage + tapered athletic waist + pale underbelly
      const chest = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.35, 16, 14)), furM);
      chest.scale.set(0.92, 1.04, 1.18);
      chest.position.set(0, 0.84, 0.2);
      bodyGroup.add(chest);
      hitMeshes.push(chest);

      const abdomen = new THREE.Mesh(this.trackGeo(new THREE.CapsuleGeometry(0.25, 0.52, 8, 14)), furM);
      abdomen.rotation.x = Math.PI / 2;
      abdomen.position.set(0, 0.8, -0.2);
      bodyGroup.add(abdomen);
      hitMeshes.push(abdomen);

      const underbelly = new THREE.Mesh(this.trackGeo(new THREE.CapsuleGeometry(0.21, 0.62, 8, 12)), bellyM);
      underbelly.rotation.x = Math.PI / 2;
      underbelly.position.set(0, 0.68, 0.02);
      bodyGroup.add(underbelly);

      // Dark dorsal stripe & layered frost-white neck mane hackles
      const dorsal = new THREE.Mesh(this.trackGeo(new THREE.CapsuleGeometry(0.14, 0.72, 6, 10)), darkM);
      dorsal.rotation.x = Math.PI / 2;
      dorsal.scale.set(1.15, 1.0, 0.55);
      dorsal.position.set(0, 1.05, 0.0);
      bodyGroup.add(dorsal);

      for (let m = 0; m < 5; m++) {
        const ang = ((m - 2) / 2) * 1.05;
        const hackle = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.15, 0.36, 7)), bellyM);
        hackle.position.set(Math.sin(ang) * 0.25, 0.92 + Math.cos(ang) * 0.14, 0.42);
        hackle.rotation.set(-0.52, ang * 0.5, -Math.sin(ang) * 0.55);
        bodyGroup.add(hackle);
      }

      // Articulated Lupine Head Pivot
      headPivot = new THREE.Group();
      headPivot.position.set(0, 1.02, 0.62);
      bodyGroup.add(headPivot);

      const skull = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.25, 16, 14)), furM);
      skull.scale.set(0.96, 0.88, 1.12);
      headPivot.add(skull);
      hitMeshes.push(skull);

      const darkMask = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.21, 14, 12)), darkM);
      darkMask.scale.set(0.95, 0.65, 1.05);
      darkMask.position.set(0, 0.08, 0.05);
      headPivot.add(darkMask);

      // Elongated tapered muzzle + lower jaw + wet black nose pad + visible fangs
      const muzzleTop = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.085, 0.155, 0.36, 12)), furM);
      muzzleTop.rotation.x = Math.PI / 2;
      muzzleTop.position.set(0, -0.02, 0.3);
      headPivot.add(muzzleTop);

      const muzzleLower = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.14, 0.08, 0.28)), bellyM);
      muzzleLower.position.set(0, -0.11, 0.26);
      headPivot.add(muzzleLower);

      const nosePad = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.058, 10, 10)), this.wolfNoseMat);
      nosePad.scale.set(1.18, 0.82, 0.88);
      nosePad.position.set(0, 0.005, 0.48);
      headPivot.add(nosePad);

      for (const side of [-1, 1] as const) {
        // Cheek fur tufts
        const cheekRuff = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.085, 0.22, 6)), bellyM);
        cheekRuff.position.set(side * 0.23, -0.06, 0.02);
        cheekRuff.rotation.z = -side * 1.28;
        headPivot.add(cheekRuff);

        // Sharp upper fangs peeking out
        const fang = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.018, 0.075, 6)), this.tuskMat);
        fang.rotation.x = Math.PI;
        fang.position.set(side * 0.055, -0.08, 0.37);
        headPivot.add(fang);

        // Triangular pointed wolf ears with white inner fluff
        const earG = new THREE.Group();
        earG.position.set(side * 0.15, 0.23, -0.02);
        earG.rotation.set(0.12, side * 0.16, -side * 0.22);
        const earO = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.085, 0.26, 8)), darkM);
        earO.scale.set(1.0, 1.0, 0.58);
        earG.add(earO);
        const earI = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.052, 0.18, 8)), bellyM);
        earI.scale.set(1.0, 1.0, 0.35);
        earI.position.set(0, -0.015, 0.032);
        earG.add(earI);
        headPivot.add(earG);

        // Glacial glowing wolf eyes with vertical slit pupils
        const eye = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.044, 10, 10)), this.wolfEyeMat);
        eye.position.set(side * 0.125, 0.055, 0.215);
        headPivot.add(eye);
        const slit = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.014, 0.05, 0.02)), this.eyeDarkMat);
        slit.position.set(side * 0.128, 0.055, 0.252);
        headPivot.add(slit);
      }

      // 4 Two-Segment Athletic Legs + Furry Paws & Claws
      const legCoords: Array<[number, number, boolean]> = [
        [-0.21, 0.36, true],
        [0.21, 0.36, true],
        [-0.2, -0.38, false],
        [0.2, -0.38, false],
      ];
      for (const [lx, lz, isFront] of legCoords) {
        const hip = new THREE.Group();
        hip.position.set(lx, 0.68, lz);
        const upper = new THREE.Mesh(
          this.trackGeo(new THREE.CapsuleGeometry(isFront ? 0.088 : 0.105, 0.26, 6, 10)),
          furM,
        );
        upper.position.y = -0.15;
        upper.rotation.x = isFront ? 0.08 : -0.22;
        hip.add(upper);

        const knee = new THREE.Group();
        knee.position.set(0, -0.3, isFront ? 0.02 : -0.06);
        hip.add(knee);

        const lower = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.062, 0.048, 0.32, 8)), bellyM);
        lower.position.y = -0.16;
        knee.add(lower);

        const paw = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.076, 10, 8)), bellyM);
        paw.scale.set(1.0, 0.56, 1.38);
        paw.position.set(0, -0.34, 0.04);
        knee.add(paw);

        for (const cSide of [-0.032, 0, 0.032]) {
          const claw = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.012, 0.052, 5)), this.wolfNoseMat);
          claw.rotation.x = Math.PI / 2;
          claw.position.set(cSide, -0.355, 0.125);
          knee.add(claw);
        }

        bodyGroup.add(hip);
        legs.push(hip);
        lowerLegs.push(knee);
      }

      // Lush 3-Segment Articulated Bushy Frost Tail
      const t1 = new THREE.Group();
      t1.position.set(0, 0.86, -0.56);
      const t1Mesh = new THREE.Mesh(this.trackGeo(new THREE.CapsuleGeometry(0.085, 0.22, 6, 10)), furM);
      t1Mesh.rotation.x = -Math.PI * 0.58;
      t1Mesh.position.set(0, -0.05, -0.14);
      t1.add(t1Mesh);

      const t2 = new THREE.Group();
      t2.position.set(0, -0.09, -0.26);
      const t2Mesh = new THREE.Mesh(this.trackGeo(new THREE.CapsuleGeometry(0.098, 0.24, 6, 10)), darkM);
      t2Mesh.rotation.x = -Math.PI * 0.48;
      t2Mesh.position.set(0, -0.03, -0.14);
      t2.add(t2Mesh);
      t1.add(t2);

      const t3 = new THREE.Group();
      t3.position.set(0, -0.04, -0.26);
      const t3Mesh = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.095, 0.28, 8)), bellyM);
      t3Mesh.rotation.x = -Math.PI * 0.42;
      t3Mesh.position.set(0, 0.02, -0.13);
      t3.add(t3Mesh);
      t2.add(t3);

      bodyGroup.add(t1);
      tail = t1;
      tailSegments.push(t1, t2, t3);

      // Extra Glacial Crystalline Armor for Alpha Frost Wolf Boss
      if (species === 'alpha_frost_boss') {
        furM.color.setHex(0x4b6382);
        for (let c = 0; c < 6; c++) {
          const shard = new THREE.Mesh(
            this.trackGeo(new THREE.OctahedronGeometry(0.14 - c * 0.012, 0)),
            this.bossIceCrystalMat,
          );
          shard.scale.set(0.55, 2.2, 0.85);
          shard.position.set(0, 1.24 - c * 0.04, 0.38 - c * 0.18);
          shard.rotation.x = -0.34;
          bodyGroup.add(shard);
        }
        for (const side of [-1, 1] as const) {
          const shoulderShard = new THREE.Mesh(
            this.trackGeo(new THREE.ConeGeometry(0.11, 0.42, 6)),
            this.bossIceCrystalMat,
          );
          shoulderShard.position.set(side * 0.36, 1.04, 0.34);
          shoulderShard.rotation.set(-0.25, 0, -side * 0.55);
          bodyGroup.add(shoulderShard);
        }
        bodyGroup.scale.setScalar(1.66);
      }
    } else if (species === 'coastal_titan_boss') {
      // Southern Coast Regional Boss: Abyssal Carapace Guardian (armored reef-shell titan with twin claws)
      const shellMat = cloneMat(this.bossGolemStoneMat);
      shellMat.color.setHex(0x1f6473);
      shellMat.roughness = 0.45;
      shellMat.metalness = 0.25;
      const underMat = cloneMat(this.bossIronMat);
      underMat.color.setHex(0x2d4354);
      const coralMat = cloneMat(this.bossRuneCyanMat);
      coralMat.color.setHex(0x5eead4);
      coralMat.emissive.setHex(0x14b8a6);
      coralMat.emissiveIntensity = 0.9;
      const clawMat = cloneMat(this.bossGoldMat);
      clawMat.color.setHex(0xd97757);
      clawMat.roughness = 0.38;

      // Wide domed sea-carapace body
      const carapace = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(1.05, 18, 14)), shellMat);
      carapace.scale.set(1.22, 0.78, 1.05);
      carapace.position.set(0, 1.18, 0);
      bodyGroup.add(carapace);
      hitMeshes.push(carapace);

      const underbelly = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.95, 0.8, 0.46, 12)), underMat);
      underbelly.position.set(0, 0.78, 0);
      bodyGroup.add(underbelly);

      // Glowing sea-crystal reef spikes across dorsal carapace
      for (let i = -2; i <= 2; i++) {
        const spike = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.16, 0.62 - Math.abs(i) * 0.06, 6)), coralMat);
        spike.position.set(i * 0.34, 1.72 - Math.abs(i) * 0.08, -0.18 + Math.abs(i) * 0.08);
        spike.rotation.z = -i * 0.22;
        spike.rotation.x = -0.18;
        bodyGroup.add(spike);
      }

      // Armored brow & twin glowing stalk eyes
      headPivot = new THREE.Group();
      headPivot.position.set(0, 1.15, 0.92);
      bodyGroup.add(headPivot);

      const visorPlate = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.95, 0.38, 0.48)), underMat);
      headPivot.add(visorPlate);
      hitMeshes.push(visorPlate);

      for (const side of [-1, 1] as const) {
        const eye = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.12, 10, 10)), coralMat);
        eye.position.set(side * 0.28, 0.14, 0.24);
        headPivot.add(eye);
      }

      // Massive twin pincer claw arms (legs[0..1])
      for (const side of [-1, 1] as const) {
        const armHip = new THREE.Group();
        armHip.position.set(side * 1.08, 1.08, 0.56);
        const upperArm = new THREE.Mesh(this.trackGeo(new THREE.CapsuleGeometry(0.18, 0.48, 6, 10)), underMat);
        upperArm.rotation.x = Math.PI * 0.35;
        upperArm.position.set(side * 0.12, -0.12, 0.28);
        armHip.add(upperArm);

        const clawJoint = new THREE.Group();
        clawJoint.position.set(side * 0.18, -0.22, 0.66);
        armHip.add(clawJoint);

        const pincerTop = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.46, 0.32, 0.78)), clawMat);
        pincerTop.position.set(0, 0.06, 0.32);
        clawJoint.add(pincerTop);
        hitMeshes.push(pincerTop);

        const pincerBot = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.36, 0.16, 0.64)), shellMat);
        pincerBot.position.set(0, -0.16, 0.26);
        clawJoint.add(pincerBot);

        bodyGroup.add(armHip);
        legs.push(armHip);
        lowerLegs.push(clawJoint);
      }

      // 4 sturdy crustacean walking legs (legs[2..5])
      const legOffsets: Array<[number, number]> = [
        [-1.02, -0.1],
        [1.02, -0.1],
        [-0.86, -0.68],
        [0.86, -0.68],
      ];
      for (const [lx, lz] of legOffsets) {
        const side = Math.sign(lx);
        const hip = new THREE.Group();
        hip.position.set(lx, 0.84, lz);
        const femur = new THREE.Mesh(this.trackGeo(new THREE.CapsuleGeometry(0.13, 0.44, 6, 8)), shellMat);
        femur.rotation.z = side * 0.55;
        femur.position.set(side * 0.22, -0.18, 0);
        hip.add(femur);

        const knee = new THREE.Group();
        knee.position.set(side * 0.42, -0.36, 0);
        hip.add(knee);

        const tibia = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.11, 0.58, 7)), clawMat);
        tibia.rotation.x = Math.PI;
        tibia.position.set(side * 0.06, -0.26, 0);
        knee.add(tibia);

        bodyGroup.add(hip);
        legs.push(hip);
        lowerLegs.push(knee);
      }

      bodyGroup.scale.setScalar(1.16);
    } else if (species === 'rune_golem_boss') {
      // Tier 3 Mid-Boss: Highland Rune Sentinel Golem — towering dressed-stone & cyan-rune colossus
      const stoneM = cloneMat(this.bossGolemStoneMat);
      const ironM = cloneMat(this.bossIronMat);
      const goldM = cloneMat(this.bossGoldMat);
      const runeM = cloneMat(this.bossRuneCyanMat);

      // Massive broad stone chest & sculpted abdomen
      const torso = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(1.32, 1.38, 0.9)), stoneM);
      torso.position.set(0, 1.72, 0);
      bodyGroup.add(torso);
      hitMeshes.push(torso);

      const chestArmor = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(1.42, 0.56, 0.98)), ironM);
      chestArmor.position.set(0, 2.02, 0.02);
      bodyGroup.add(chestArmor);
      hitMeshes.push(chestArmor);

      const waist = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.46, 0.54, 0.52, 8)), stoneM);
      waist.position.set(0, 0.98, 0);
      bodyGroup.add(waist);

      // Glowing Cyan Rune Reactor Core in chest + golden containment ring
      const core = new THREE.Mesh(this.trackGeo(new THREE.OctahedronGeometry(0.28, 0)), runeM);
      core.position.set(0, 1.88, 0.5);
      bodyGroup.add(core);
      const coreFrame = new THREE.Mesh(this.trackGeo(new THREE.TorusGeometry(0.32, 0.048, 8, 20)), goldM);
      coreFrame.position.set(0, 1.88, 0.48);
      bodyGroup.add(coreFrame);

      // Back crystal obelisk spikes
      for (let i = -1; i <= 1; i++) {
        const spike = new THREE.Mesh(this.trackGeo(new THREE.OctahedronGeometry(0.22 - Math.abs(i) * 0.04, 0)), runeM);
        spike.scale.set(0.7, 2.4, 0.7);
        spike.position.set(i * 0.36, 2.42 - Math.abs(i) * 0.14, -0.34);
        spike.rotation.x = -0.28;
        spike.rotation.z = -i * 0.24;
        bodyGroup.add(spike);
      }

      // Floating Octahedral Shoulder Monoliths
      for (const side of [-1, 1] as const) {
        const pauldron = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.56, 0.44, 0.64)), stoneM);
        pauldron.position.set(side * 0.94, 2.28, 0);
        pauldron.rotation.z = -side * 0.18;
        bodyGroup.add(pauldron);
        hitMeshes.push(pauldron);

        const crystal = new THREE.Mesh(this.trackGeo(new THREE.OctahedronGeometry(0.22, 0)), runeM);
        crystal.scale.set(0.7, 1.8, 0.7);
        crystal.position.set(side * 1.06, 2.66, 0);
        crystal.rotation.z = -side * 0.32;
        bodyGroup.add(crystal);
      }

      // Horned Monolith Head Pivot with Glowing Cyan Visor
      headPivot = new THREE.Group();
      headPivot.position.set(0, 2.62, 0.08);
      bodyGroup.add(headPivot);

      const helm = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.62, 0.6, 0.64)), stoneM);
      headPivot.add(helm);
      hitMeshes.push(helm);

      const crownBand = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.68, 0.14, 0.68)), goldM);
      crownBand.position.set(0, 0.24, 0);
      headPivot.add(crownBand);

      const visor = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.48, 0.12, 0.08)), runeM);
      visor.position.set(0, 0.04, 0.32);
      headPivot.add(visor);

      for (const side of [-1, 1] as const) {
        const horn = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.09, 0.44, 6)), goldM);
        horn.position.set(side * 0.34, 0.38, -0.04);
        horn.rotation.z = -side * 0.35;
        headPivot.add(horn);
      }

      // Massive Articulated Arms (indexed as front legs[0..1]) & Heavy Pillar Legs (legs[2..3])
      for (const side of [-1, 1] as const) {
        const armHip = new THREE.Group();
        armHip.position.set(side * 0.96, 2.08, 0.04);
        const upperArm = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.38, 0.78, 0.42)), stoneM);
        upperArm.position.y = -0.36;
        armHip.add(upperArm);

        const elbow = new THREE.Group();
        elbow.position.set(0, -0.74, 0.06);
        armHip.add(elbow);

        const forearm = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.46, 0.78, 0.52)), ironM);
        forearm.position.y = -0.34;
        elbow.add(forearm);
        hitMeshes.push(forearm);

        const knuckleRune = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.32, 0.14, 0.54)), runeM);
        knuckleRune.position.set(0, -0.52, 0.04);
        elbow.add(knuckleRune);

        bodyGroup.add(armHip);
        legs.push(armHip);
        lowerLegs.push(elbow);
      }

      for (const side of [-1, 1] as const) {
        const legHip = new THREE.Group();
        legHip.position.set(side * 0.42, 0.88, 0);
        const thigh = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.44, 0.54, 0.48)), stoneM);
        thigh.position.y = -0.24;
        legHip.add(thigh);

        const knee = new THREE.Group();
        knee.position.set(0, -0.5, 0);
        legHip.add(knee);

        const shin = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.48, 0.44, 0.56)), ironM);
        shin.position.set(0, -0.2, 0.04);
        knee.add(shin);

        const kneeRune = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.24, 0.12, 0.08)), runeM);
        kneeRune.position.set(0, -0.04, 0.28);
        knee.add(kneeRune);

        bodyGroup.add(legHip);
        legs.push(legHip);
        lowerLegs.push(knee);
      }

      bodyGroup.scale.setScalar(1.18);
    } else if (species === 'night_skeleton') {
      // ================================================================
      // NOCTURNAL AGGRESSIVE UNDEAD: MOONLIT SKELETON KNIGHT (달빛 해골 전사)
      // ================================================================
      const boneM = cloneMat(this.undeadBoneMat);
      const ironM = cloneMat(this.undeadDarkIronMat);
      const cloakM = cloneMat(this.undeadCloakMat);
      const soulM = cloneMat(this.undeadSoulGlowMat);

      // Pelvis & spine
      const pelvis = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.42, 0.16, 0.24)), boneM);
      pelvis.position.set(0, 0.88, 0);
      bodyGroup.add(pelvis);

      const spine = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.06, 0.07, 0.62, 8)), boneM);
      spine.position.set(0, 1.24, -0.02);
      bodyGroup.add(spine);
      hitMeshes.push(spine);

      // Ribcage (4 bone ribs + glowing spectral soul core inside chest)
      const chestCore = new THREE.Mesh(this.trackGeo(new THREE.OctahedronGeometry(0.14, 0)), soulM);
      chestCore.position.set(0, 1.32, 0.03);
      bodyGroup.add(chestCore);
      hitMeshes.push(chestCore);

      for (let r = 0; r < 4; r++) {
        const ry = 1.14 + r * 0.11;
        const ribWidth = 0.44 - Math.abs(r - 1.5) * 0.04;
        const rib = new THREE.Mesh(
          this.trackGeo(new THREE.TorusGeometry(ribWidth * 0.48, 0.026, 6, 12, Math.PI * 1.45)),
          boneM,
        );
        rib.position.set(0, ry, 0.02);
        rib.rotation.x = Math.PI / 2;
        rib.rotation.z = -Math.PI * 0.22;
        bodyGroup.add(rib);
      }

      // Corroded iron breastplate strap & spiked pauldrons
      const collar = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.56, 0.12, 0.28)), ironM);
      collar.position.set(0, 1.56, 0);
      bodyGroup.add(collar);
      hitMeshes.push(collar);

      // Tattered dark mantle on back
      const mantle = new THREE.Mesh(this.trackGeo(new THREE.PlaneGeometry(0.58, 0.92)), cloakM);
      mantle.position.set(0, 1.14, -0.18);
      mantle.rotation.x = 0.14;
      bodyGroup.add(mantle);
      tail = mantle;

      // Articulated Skull Head
      headPivot = new THREE.Group();
      headPivot.position.set(0, 1.66, 0.02);
      bodyGroup.add(headPivot);

      const cranium = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.21, 14, 12)), boneM);
      cranium.scale.set(0.92, 1.04, 1.05);
      cranium.position.set(0, 0.18, 0);
      headPivot.add(cranium);
      hitMeshes.push(cranium);

      const jaw = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.2, 0.11, 0.2)), boneM);
      jaw.position.set(0, 0.03, 0.05);
      headPivot.add(jaw);

      // Glowing emerald eye sockets
      for (const sx of [-0.075, 0.075]) {
        const socket = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.046, 8, 8)), ironM);
        socket.position.set(sx, 0.17, 0.17);
        headPivot.add(socket);

        const eye = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.03, 8, 8)), soulM);
        eye.position.set(sx, 0.17, 0.2);
        headPivot.add(eye);
      }

      // Cracked iron knight helmet crown
      const helm = new THREE.Mesh(
        this.trackGeo(new THREE.SphereGeometry(0.23, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.56)),
        ironM,
      );
      helm.position.set(0, 0.22, -0.01);
      headPivot.add(helm);

      const helmCrest = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.05, 0.16, 0.3)), ironM);
      helmCrest.position.set(0, 0.42, -0.02);
      headPivot.add(helmCrest);

      // Articulated Arms (legs[0] = Left Shield Arm, legs[1] = Right Scimitar Arm)
      for (const side of [-1, 1] as const) {
        const armPivot = new THREE.Group();
        armPivot.position.set(side * 0.36, 1.54, 0.02);

        const pauldron = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.14, 10, 8)), ironM);
        pauldron.scale.set(1.15, 0.72, 1.1);
        armPivot.add(pauldron);

        const upperArm = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.042, 0.036, 0.42, 7)), boneM);
        upperArm.position.y = -0.22;
        armPivot.add(upperArm);

        const elbow = new THREE.Group();
        elbow.position.set(0, -0.42, 0.02);
        armPivot.add(elbow);

        const forearm = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.038, 0.032, 0.36, 7)), boneM);
        forearm.position.set(0, -0.16, 0.08);
        forearm.rotation.x = -0.45;
        elbow.add(forearm);

        if (side === -1) {
          // Left hand: battered iron round shield with spectral rune boss
          const shield = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.32, 0.32, 0.06, 12)), ironM);
          shield.rotation.z = Math.PI / 2;
          shield.position.set(-0.08, -0.24, 0.16);
          elbow.add(shield);
          const boss = new THREE.Mesh(this.trackGeo(new THREE.OctahedronGeometry(0.08, 0)), soulM);
          boss.position.set(-0.12, -0.24, 0.16);
          elbow.add(boss);
        } else {
          // Right hand: curved spectral iron scimitar
          const hilt = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.024, 0.024, 0.24, 6)), ironM);
          hilt.rotation.x = Math.PI / 2;
          hilt.position.set(0.04, -0.28, 0.2);
          elbow.add(hilt);

          const guard = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.18, 0.04, 0.05)), ironM);
          guard.position.set(0.04, -0.28, 0.32);
          elbow.add(guard);

          const blade = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.045, 0.1, 0.82)), ironM);
          blade.position.set(0.04, -0.24, 0.72);
          blade.rotation.x = -0.1;
          elbow.add(blade);

          const bladeEdge = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.02, 0.03, 0.78)), soulM);
          bladeEdge.position.set(0.04, -0.19, 0.72);
          bladeEdge.rotation.x = -0.1;
          elbow.add(bladeEdge);
        }

        bodyGroup.add(armPivot);
        legs.push(armPivot);
        lowerLegs.push(elbow);
      }

      // Articulated Skeletal Legs (legs[2..3])
      for (const side of [-1, 1] as const) {
        const legPivot = new THREE.Group();
        legPivot.position.set(side * 0.16, 0.84, 0);

        const femur = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.048, 0.04, 0.44, 7)), boneM);
        femur.position.y = -0.22;
        legPivot.add(femur);

        const knee = new THREE.Group();
        knee.position.set(0, -0.44, 0);
        legPivot.add(knee);

        const greave = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.065, 0.055, 0.4, 8)), ironM);
        greave.position.y = -0.2;
        knee.add(greave);

        const boot = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.13, 0.08, 0.22)), ironM);
        boot.position.set(0, -0.39, 0.05);
        knee.add(boot);

        bodyGroup.add(legPivot);
        legs.push(legPivot);
        lowerLegs.push(knee);
      }

      // Subtle emerald ground aura ring
      const uRingGeo = this.trackGeo(new THREE.RingGeometry(0.55, 0.78, 24));
      uRingGeo.rotateX(-Math.PI / 2);
      const uRingMat = new THREE.MeshBasicMaterial({
        color: 0x34f5c5,
        transparent: true,
        opacity: 0.34,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      this.disposables.push(uRingMat);
      auraRing = new THREE.Mesh(uRingGeo, uRingMat);
      auraRing.position.y = 0.05;
      group.add(auraRing);
    } else if (species === 'night_wraith') {
      // ================================================================
      // NOCTURNAL AGGRESSIVE UNDEAD: NIGHTMIST WRAITH REAPER (밤안개 망령 사신)
      // ================================================================
      const boneM = cloneMat(this.undeadBoneMat);
      const ironM = cloneMat(this.undeadDarkIronMat);
      const cloakM = cloneMat(this.undeadCloakMat);
      const violetM = cloneMat(this.undeadVioletGlowMat);

      // Levitating spectral cloak torso
      const cloakCone = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.52, 1.38, 12, 1, true)), cloakM);
      cloakCone.position.set(0, 1.12, 0);
      bodyGroup.add(cloakCone);
      hitMeshes.push(cloakCone);

      const chestArmor = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.54, 0.46, 0.3)), ironM);
      chestArmor.position.set(0, 1.48, 0.03);
      bodyGroup.add(chestArmor);
      hitMeshes.push(chestArmor);

      const soulCore = new THREE.Mesh(this.trackGeo(new THREE.OctahedronGeometry(0.18, 0)), violetM);
      soulCore.position.set(0, 1.48, 0.16);
      bodyGroup.add(soulCore);

      // Segmented billowing lower cloak tail (3 segments)
      let prevSeg: THREE.Object3D = bodyGroup;
      for (let i = 0; i < 3; i++) {
        const seg = new THREE.Group();
        seg.position.set(0, i === 0 ? 0.65 : -0.22, i === 0 ? -0.14 : -0.12);
        const strip = new THREE.Mesh(
          this.trackGeo(new THREE.BoxGeometry(0.46 - i * 0.1, 0.28, 0.06)),
          cloakM,
        );
        strip.position.y = -0.1;
        seg.add(strip);
        prevSeg.add(seg);
        tailSegments.push(seg);
        prevSeg = seg;
      }

      // Hooded Horned Skull Head
      headPivot = new THREE.Group();
      headPivot.position.set(0, 1.78, 0.02);
      bodyGroup.add(headPivot);

      const hood = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.32, 0.56, 10)), cloakM);
      hood.position.set(0, 0.24, -0.04);
      hood.rotation.x = -0.18;
      headPivot.add(hood);

      const mask = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.2, 12, 10)), boneM);
      mask.scale.set(0.86, 1.08, 0.96);
      mask.position.set(0, 0.16, 0.06);
      headPivot.add(mask);
      hitMeshes.push(mask);

      for (const sx of [-0.075, 0.075]) {
        const eye = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.036, 8, 8)), violetM);
        eye.position.set(sx, 0.18, 0.22);
        headPivot.add(eye);

        const horn = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.045, 0.34, 6)), ironM);
        horn.position.set(sx * 2.4, 0.36, -0.02);
        horn.rotation.z = -Math.sign(sx) * 0.42;
        horn.rotation.x = 0.2;
        headPivot.add(horn);
      }

      // Articulated Spectral Arms (legs[0..1], right arm holds glowing crescent Soul Scythe)
      for (const side of [-1, 1] as const) {
        const armPivot = new THREE.Group();
        armPivot.position.set(side * 0.42, 1.62, 0.02);

        const shoulder = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.18, 0.3, 6)), ironM);
        shoulder.rotation.z = -side * 0.65;
        armPivot.add(shoulder);

        const sleeve = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.08, 0.14, 0.56, 8)), cloakM);
        sleeve.position.y = -0.28;
        armPivot.add(sleeve);

        const wrist = new THREE.Group();
        wrist.position.set(0, -0.54, 0.08);
        armPivot.add(wrist);

        const claw = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.06, 7, 7)), boneM);
        wrist.add(claw);

        if (side === 1) {
          // Long Soul Scythe
          const shaft = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.026, 0.026, 1.85, 8)), ironM);
          shaft.rotation.x = Math.PI * 0.42;
          shaft.position.set(0.06, -0.05, 0.45);
          wrist.add(shaft);

          const scytheBlade = new THREE.Mesh(
            this.trackGeo(new THREE.TorusGeometry(0.42, 0.045, 6, 14, Math.PI * 0.78)),
            violetM,
          );
          scytheBlade.position.set(0.06, 0.22, 1.18);
          scytheBlade.rotation.y = Math.PI / 2;
          scytheBlade.rotation.z = -0.45;
          wrist.add(scytheBlade);
        }

        bodyGroup.add(armPivot);
        legs.push(armPivot);
        lowerLegs.push(wrist);
      }

      // Orbiting spectral soul wisps (stored in legs[2..3] for smooth animation)
      for (const side of [-1, 1] as const) {
        const wispPivot = new THREE.Group();
        wispPivot.position.set(side * 0.58, 0.95, 0);
        const wisp = new THREE.Mesh(this.trackGeo(new THREE.OctahedronGeometry(0.09, 0)), violetM);
        wispPivot.add(wisp);
        bodyGroup.add(wispPivot);
        legs.push(wispPivot);
        lowerLegs.push(new THREE.Group());
      }

      // Violet necromantic ground ring
      const wRingGeo = this.trackGeo(new THREE.RingGeometry(0.62, 0.88, 28));
      wRingGeo.rotateX(-Math.PI / 2);
      const wRingMat = new THREE.MeshBasicMaterial({
        color: 0xa855f7,
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      this.disposables.push(wRingMat);
      auraRing = new THREE.Mesh(wRingGeo, wRingMat);
      auraRing.position.y = 0.06;
      group.add(auraRing);
    } else if (species === 'azure_dragon_boss') {
      // 동방 수호신 · 청룡 (Azure Dragon of the East — Water Guardian Spirit, High-Detail Mythic Form)
      const scaleM = cloneMat(this.azureDragonScaleMat);
      const bellyM = cloneMat(this.azureDragonBellyMat);
      const finM = cloneMat(this.azureDragonFinMat);
      const goldM = cloneMat(this.bossGoldMat);
      const pearlM = cloneMat(this.azurePearlMat);

      // Hovering muscular serpentine chest with layered golden collar bands
      const chest = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.62, 20, 18)), scaleM);
      chest.scale.set(0.96, 1.08, 1.42);
      chest.position.set(0, 2.32, 0.35);
      bodyGroup.add(chest);
      hitMeshes.push(chest);

      const chestBelly = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.5, 16, 14)), bellyM);
      chestBelly.scale.set(0.84, 0.82, 1.36);
      chestBelly.position.set(0, 2.04, 0.4);
      bodyGroup.add(chestBelly);

      // Segmented golden-cyan belly ribs along chest
      for (let r = 0; r < 4; r++) {
        const rib = new THREE.Mesh(
          this.trackGeo(new THREE.TorusGeometry(0.42 - r * 0.02, 0.036, 6, 16, Math.PI * 1.15)),
          goldM,
        );
        rib.position.set(0, 2.02 - r * 0.03, 0.72 - r * 0.28);
        rib.rotation.set(Math.PI * 0.56, 0, Math.PI * 0.92);
        bodyGroup.add(rib);
      }

      // Sculpted neck arch connecting chest to head
      const neckArch = new THREE.Mesh(this.trackGeo(new THREE.CapsuleGeometry(0.32, 0.62, 8, 14)), scaleM);
      neckArch.position.set(0, 2.58, 0.88);
      neckArch.rotation.x = 0.65;
      bodyGroup.add(neckArch);

      // Articulated Oriental Dragon Head with brow ridges, twin antlers, flowing cloud-whiskers & glowing mane
      headPivot = new THREE.Group();
      headPivot.position.set(0, 2.86, 1.18);
      bodyGroup.add(headPivot);

      const skull = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.72, 0.56, 0.92)), scaleM);
      skull.position.set(0, 0.1, 0.22);
      headPivot.add(skull);
      hitMeshes.push(skull);

      // Sculpted snout ridge + flared nostrils
      const snout = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.5, 0.36, 0.84)), scaleM);
      snout.position.set(0, -0.02, 0.88);
      headPivot.add(snout);

      const noseBridge = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.24, 0.14, 0.78)), goldM);
      noseBridge.position.set(0, 0.16, 0.82);
      headPivot.add(noseBridge);

      const noseTip = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.18, 12, 10)), scaleM);
      noseTip.scale.set(1.25, 0.82, 0.95);
      noseTip.position.set(0, 0.04, 1.28);
      headPivot.add(noseTip);

      // Articulated lower jaw with beard-fin tuft
      const lowerJaw = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.42, 0.16, 0.74)), bellyM);
      lowerJaw.position.set(0, -0.26, 0.78);
      lowerJaw.rotation.x = 0.18;
      headPivot.add(lowerJaw);

      const chinBeard = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.16, 0.58, 6)), finM);
      chinBeard.position.set(0, -0.46, 0.84);
      chinBeard.rotation.x = Math.PI - 0.32;
      headPivot.add(chinBeard);

      // Glowing crown jewel between antlers
      const foreheadGem = new THREE.Mesh(this.trackGeo(new THREE.OctahedronGeometry(0.13, 0)), pearlM);
      foreheadGem.position.set(0, 0.42, 0.44);
      headPivot.add(foreheadGem);

      for (const side of [-1, 1] as const) {
        // Armored brow ridge + luminous pearl-gold eye + dark slit pupil
        const brow = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.18, 0.1, 0.34)), goldM);
        brow.position.set(side * 0.32, 0.32, 0.46);
        brow.rotation.z = -side * 0.24;
        headPivot.add(brow);

        const eye = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.095, 12, 10)), pearlM);
        eye.position.set(side * 0.34, 0.19, 0.48);
        headPivot.add(eye);

        const pupil = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.03, 0.1, 0.05)), this.eyeDarkMat);
        pupil.position.set(side * 0.41, 0.19, 0.52);
        headPivot.add(pupil);

        // Nostril flare
        const nostril = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.06, 8, 8)), finM);
        nostril.position.set(side * 0.16, 0.06, 1.32);
        headPivot.add(nostril);

        // Multi-branched sacred golden stag-dragon antlers with pearl buds
        const hornMain = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.09, 1.18, 8)), goldM);
        hornMain.position.set(side * 0.25, 0.68, -0.22);
        hornMain.rotation.set(-0.68, 0, -side * 0.32);
        headPivot.add(hornMain);

        const hornFork1 = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.055, 0.56, 7)), goldM);
        hornFork1.position.set(side * 0.46, 0.86, -0.36);
        hornFork1.rotation.set(-0.32, 0, -side * 0.78);
        headPivot.add(hornFork1);

        const hornFork2 = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.045, 0.42, 7)), goldM);
        hornFork2.position.set(side * 0.36, 1.04, -0.58);
        hornFork2.rotation.set(-0.85, 0, -side * 0.2);
        headPivot.add(hornFork2);

        const hornOrb = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.065, 8, 8)), finM);
        hornOrb.position.set(side * 0.62, 0.96, -0.44);
        headPivot.add(hornOrb);

        // Flowing double-curved dragon whiskers (수염)
        const whiskerA = new THREE.Mesh(
          this.trackGeo(new THREE.TorusGeometry(0.46, 0.028, 6, 16, Math.PI * 0.85)),
          goldM,
        );
        whiskerA.position.set(side * 0.44, -0.06, 1.12);
        whiskerA.rotation.set(0.28, side * 0.62, side * 0.44);
        headPivot.add(whiskerA);

        const whiskerB = new THREE.Mesh(
          this.trackGeo(new THREE.TorusGeometry(0.32, 0.022, 6, 14, Math.PI * 0.78)),
          finM,
        );
        whiskerB.position.set(side * 0.72, -0.22, 0.88);
        whiskerB.rotation.set(-0.35, side * 0.45, -side * 0.5);
        headPivot.add(whiskerB);

        // Upper & lower curved ivory dragon fangs
        const fangUp = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.048, 0.25, 6)), this.tuskMat);
        fangUp.position.set(side * 0.18, -0.18, 1.12);
        fangUp.rotation.x = Math.PI;
        headPivot.add(fangUp);

        const fangLow = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.036, 0.16, 6)), this.tuskMat);
        fangLow.position.set(side * 0.14, -0.16, 0.98);
        headPivot.add(fangLow);
      }

      // Luminous layered mane collar (9 alternating aqua & gold fins)
      for (let m = 0; m < 9; m++) {
        const a = ((m - 4) / 4) * 1.52;
        const fin = new THREE.Mesh(
          this.trackGeo(new THREE.ConeGeometry(0.15, 0.78 + (m % 2 === 0 ? 0.14 : 0), 5)),
          m % 3 === 0 ? goldM : finM,
        );
        fin.position.set(Math.sin(a) * 0.46, 0.12 + Math.cos(a) * 0.38, -0.28);
        fin.rotation.set(-0.78, 0, -Math.sin(a) * 0.68);
        headPivot.add(fin);
      }

      // 8 Sinuous Articulated Serpentine Body & Tail Segments with golden spine ridges & cloud wisps
      let prevSeg: THREE.Object3D = bodyGroup;
      for (let s = 0; s < 8; s++) {
        const seg = new THREE.Group();
        if (s === 0) {
          seg.position.set(0, 2.08, -0.36);
        } else {
          seg.position.set(0, -0.05, -0.68);
        }
        const rad = Math.max(0.15, 0.56 - s * 0.052);
        const bodyCyl = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(rad, 16, 12)), scaleM);
        bodyCyl.scale.set(0.95, 0.96, 1.48);
        seg.add(bodyCyl);
        hitMeshes.push(bodyCyl);

        const ventral = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(rad * 0.84, 12, 8)), bellyM);
        ventral.scale.set(0.84, 0.62, 1.4);
        ventral.position.y = -rad * 0.36;
        seg.add(ventral);

        // Twin-layered crystalline dorsal ridge fin + golden crest spine
        const dorsalFin = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(rad * 0.3, rad * 1.55, 5)), finM);
        dorsalFin.position.set(0, rad * 1.12, -0.04);
        dorsalFin.rotation.x = -0.48;
        seg.add(dorsalFin);

        if (s % 2 === 0) {
          const goldRidge = new THREE.Mesh(this.trackGeo(new THREE.OctahedronGeometry(rad * 0.32, 0)), goldM);
          goldRidge.scale.set(0.45, 1.25, 1.1);
          goldRidge.position.set(0, rad * 0.96, 0.18);
          seg.add(goldRidge);
        }

        // Celestial floating cloud-ribbon whorls on alternate flanks
        if (s === 1 || s === 3 || s === 5) {
          for (const side of [-1, 1] as const) {
            const cloudArc = new THREE.Mesh(
              this.trackGeo(new THREE.TorusGeometry(rad * 0.95, 0.042, 6, 14, Math.PI * 0.9)),
              finM,
            );
            cloudArc.position.set(side * (rad + 0.24), 0.1, 0);
            cloudArc.rotation.set(0.4, side * 0.7, side * 0.4);
            seg.add(cloudArc);
          }
        }

        if (s === 7) {
          // Layered celestial fan tail plume (3 splayed fin blades)
          for (let tf = -1; tf <= 1; tf++) {
            const fan = new THREE.Mesh(
              this.trackGeo(new THREE.ConeGeometry(0.28, 1.18 - Math.abs(tf) * 0.16, 6)),
              tf === 0 ? goldM : finM,
            );
            fan.rotation.set(-Math.PI / 2, tf * 0.28, 0);
            fan.position.set(tf * 0.26, 0.05, -0.68);
            seg.add(fan);
          }
        }

        prevSeg.add(seg);
        tailSegments.push(seg);
        prevSeg = seg;
      }

      // 4 Articulated Clawed Dragon Limbs with golden bracer cuffs & 3 fanned talons (legs[0..3])
      const clawCoords: Array<[number, number, number]> = [
        [-0.68, 1.96, 0.58],
        [0.68, 1.96, 0.58],
        [-0.58, 1.72, -1.25],
        [0.58, 1.72, -1.25],
      ];
      for (const [lx, ly, lz] of clawCoords) {
        const side = lx < 0 ? -1 : 1;
        const limbPivot = new THREE.Group();
        limbPivot.position.set(lx, ly, lz);

        const shoulderFin = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.14, 0.48, 5)), finM);
        shoulderFin.position.set(side * 0.14, 0.1, -0.14);
        shoulderFin.rotation.set(-0.7, 0, -side * 0.6);
        limbPivot.add(shoulderFin);

        const arm = new THREE.Mesh(this.trackGeo(new THREE.CapsuleGeometry(0.15, 0.48, 6, 10)), scaleM);
        arm.position.set(0, -0.26, 0.16);
        arm.rotation.x = -0.45;
        limbPivot.add(arm);

        const wristRing = new THREE.Mesh(this.trackGeo(new THREE.TorusGeometry(0.15, 0.032, 6, 14)), goldM);
        wristRing.position.set(0, -0.44, 0.28);
        wristRing.rotation.x = Math.PI / 2 - 0.35;
        limbPivot.add(wristRing);

        // 3 fanned golden dragon talons
        for (let cl = -1; cl <= 1; cl++) {
          const talon = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.055, 0.34, 5)), goldM);
          talon.position.set(cl * 0.11, -0.58, 0.38);
          talon.rotation.set(Math.PI * 0.72, 0, cl * 0.28);
          limbPivot.add(talon);
        }

        bodyGroup.add(limbPivot);
        legs.push(limbPivot);
        lowerLegs.push(new THREE.Group());
      }

      // Orbiting Sacred Dragon Pearl (여의주) with twin counter-tilted rune rings attached as `tail`
      const pearlOrbit = new THREE.Group();
      pearlOrbit.position.set(0, 2.48, 1.24);
      const pearl = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.28, 18, 16)), pearlM);
      pearl.position.set(1.06, 0.32, 0.32);
      pearlOrbit.add(pearl);
      const pearlHalo1 = new THREE.Mesh(this.trackGeo(new THREE.TorusGeometry(0.42, 0.032, 8, 28)), finM);
      pearlHalo1.position.copy(pearl.position);
      pearlHalo1.rotation.set(0.45, 0.35, 0);
      pearlOrbit.add(pearlHalo1);
      const pearlHalo2 = new THREE.Mesh(this.trackGeo(new THREE.TorusGeometry(0.5, 0.024, 6, 28)), goldM);
      pearlHalo2.position.copy(pearl.position);
      pearlHalo2.rotation.set(-0.65, -0.4, 0.5);
      pearlOrbit.add(pearlHalo2);
      // Counter-orbiting water spirit bead
      const spiritOrb = new THREE.Mesh(this.trackGeo(new THREE.OctahedronGeometry(0.16, 0)), finM);
      spiritOrb.position.set(-1.05, 0.14, -0.24);
      pearlOrbit.add(spiritOrb);
      bodyGroup.add(pearlOrbit);
      tail = pearlOrbit;

      // Water-vortex sacred aura ring on ground
      const dragonRingGeo = this.trackGeo(new THREE.RingGeometry(1.7, 2.15, 36));
      dragonRingGeo.rotateX(-Math.PI / 2);
      const dragonRingMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide,
      });
      this.disposables.push(dragonRingMat);
      auraRing = new THREE.Mesh(dragonRingGeo, dragonRingMat);
      auraRing.position.y = 0.07;
      group.add(auraRing);
    } else if (species === 'white_tiger_boss') {
      // 서방 수호신 · 백호 (White Tiger of the West — Wind Guardian Spirit, High-Detail Regal Form)
      const furM = cloneMat(this.whiteTigerFurMat);
      const maneM = cloneMat(this.whiteTigerManeMat);
      const eyeM = cloneMat(this.whiteTigerEyeMat);
      const goldM = cloneMat(this.bossGoldMat);
      const darkM = cloneMat(this.bossIronMat);

      // Broad muscular striped feline chest + sculpted back & hindquarters
      const chest = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.82, 20, 18)), furM);
      chest.scale.set(1.08, 1.04, 1.28);
      chest.position.set(0, 1.62, 0.48);
      bodyGroup.add(chest);
      hitMeshes.push(chest);

      const torso = new THREE.Mesh(this.trackGeo(new THREE.CapsuleGeometry(0.58, 1.24, 10, 18)), furM);
      torso.rotation.x = Math.PI / 2;
      torso.position.set(0, 1.52, -0.34);
      bodyGroup.add(torso);
      hitMeshes.push(torso);

      const haunch = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.6, 16, 14)), furM);
      haunch.scale.set(0.98, 0.96, 1.12);
      haunch.position.set(0, 1.48, -0.92);
      bodyGroup.add(haunch);

      // Ornate Golden Wind-Carved Chestplate & Spine Ridge Crest
      const chestPlate = new THREE.Mesh(this.trackGeo(new THREE.OctahedronGeometry(0.38, 0)), goldM);
      chestPlate.scale.set(1.15, 1.25, 0.45);
      chestPlate.position.set(0, 1.42, 1.32);
      bodyGroup.add(chestPlate);

      const chestGem = new THREE.Mesh(this.trackGeo(new THREE.OctahedronGeometry(0.18, 0)), eyeM);
      chestGem.position.set(0, 1.44, 1.48);
      bodyGroup.add(chestGem);

      // Dorsal wind-fur spine ridge
      for (let sp = 0; sp < 5; sp++) {
        const ridge = new THREE.Mesh(
          this.trackGeo(new THREE.ConeGeometry(0.16 - sp * 0.015, 0.44 - sp * 0.03, 5)),
          maneM,
        );
        ridge.position.set(0, 2.18 - sp * 0.05, 0.46 - sp * 0.36);
        ridge.rotation.x = -0.68;
        bodyGroup.add(ridge);
      }

      // Layered Tempest-White Spiky Wind Mane (13 inner & outer radiating tufts)
      for (let m = 0; m < 13; m++) {
        const a = ((m - 6) / 6) * 1.65;
        const isOuter = m % 2 === 0;
        const spike = new THREE.Mesh(
          this.trackGeo(new THREE.ConeGeometry(isOuter ? 0.24 : 0.18, isOuter ? 0.86 : 0.64, 6)),
          isOuter ? maneM : furM,
        );
        spike.position.set(
          Math.sin(a) * (isOuter ? 0.66 : 0.56),
          1.76 + Math.cos(a) * (isOuter ? 0.36 : 0.26),
          0.92 + (isOuter ? -0.05 : 0.06),
        );
        spike.rotation.set(-0.56, a * 0.42, -Math.sin(a) * 0.58);
        bodyGroup.add(spike);
      }

      // Sweeping Celestial Wind-Scarf Ribbons trailing behind shoulders
      for (const side of [-1, 1] as const) {
        const scarf = new THREE.Mesh(
          this.trackGeo(new THREE.TorusGeometry(0.88, 0.055, 6, 20, Math.PI * 0.85)),
          maneM,
        );
        scarf.position.set(side * 0.68, 2.16, -0.05);
        scarf.rotation.set(0.42, side * 0.78, side * 0.34);
        bodyGroup.add(scarf);
      }

      // Regal Roaring Sabertooth White Tiger Head
      headPivot = new THREE.Group();
      headPivot.position.set(0, 2.02, 1.32);
      bodyGroup.add(headPivot);

      const cranium = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.54, 18, 16)), furM);
      cranium.scale.set(1.16, 0.98, 1.08);
      headPivot.add(cranium);
      hitMeshes.push(cranium);

      const muzzle = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.5, 0.32, 0.58)), furM);
      muzzle.position.set(0, -0.1, 0.5);
      headPivot.add(muzzle);

      const jaw = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.4, 0.15, 0.5)), furM);
      jaw.position.set(0, -0.34, 0.44);
      jaw.rotation.x = 0.24;
      headPivot.add(jaw);

      const nose = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.095, 10, 8)), darkM);
      nose.scale.set(1.2, 0.8, 0.9);
      nose.position.set(0, -0.01, 0.78);
      headPivot.add(nose);

      // Sculpted Golden Forehead "王" (King) Crest Emblem!
      const wangGroup = new THREE.Group();
      wangGroup.position.set(0, 0.31, 0.5);
      wangGroup.rotation.x = -0.32;
      const wangVert = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.052, 0.26, 0.04)), goldM);
      wangGroup.add(wangVert);
      for (const wy of [0.1, 0.0, -0.1]) {
        const barW = wy === 0 ? 0.18 : 0.24;
        const bar = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(barW, 0.044, 0.042)), goldM);
        bar.position.y = wy;
        wangGroup.add(bar);
      }
      headPivot.add(wangGroup);

      for (const side of [-1, 1] as const) {
        // Slanted golden brow + glowing emerald-cyan tiger eye + dark pupil
        const brow = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.2, 0.07, 0.12)), darkM);
        brow.position.set(side * 0.23, 0.2, 0.48);
        brow.rotation.z = -side * 0.28;
        headPivot.add(brow);

        const eye = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.082, 12, 10)), eyeM);
        eye.position.set(side * 0.24, 0.11, 0.47);
        headPivot.add(eye);

        const pupil = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.025, 0.09, 0.04)), this.eyeDarkMat);
        pupil.position.set(side * 0.25, 0.11, 0.54);
        headPivot.add(pupil);

        // Swept cheek ruffs
        const cheek = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.18, 0.48, 6)), maneM);
        cheek.position.set(side * 0.52, -0.12, 0.08);
        cheek.rotation.set(0.2, 0, -side * 1.25);
        headPivot.add(cheek);

        // Lynx-tufted tiger ears with inner ear detail
        const ear = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.16, 0.38, 6)), furM);
        ear.position.set(side * 0.36, 0.46, -0.02);
        ear.rotation.z = -side * 0.3;
        headPivot.add(ear);

        const earInner = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.09, 0.24, 5)), maneM);
        earInner.position.set(side * 0.36, 0.44, 0.04);
        earInner.rotation.z = -side * 0.3;
        headPivot.add(earInner);

        // Long curved ivory saber fangs + lower canines
        const fang = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.062, 0.38, 7)), this.tuskMat);
        fang.position.set(side * 0.16, -0.28, 0.68);
        fang.rotation.x = Math.PI - 0.14;
        headPivot.add(fang);

        const lowFang = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.036, 0.16, 6)), this.tuskMat);
        lowFang.position.set(side * 0.12, -0.22, 0.62);
        headPivot.add(lowFang);
      }

      // 4 Articulated Muscular Tiger Legs with Ornate Shoulder Pauldrons, Wind Bracers & 3-Clawed Paws
      const legOffsets: Array<[number, number, number]> = [
        [-0.6, 1.28, 0.68],
        [0.6, 1.28, 0.68],
        [-0.56, 1.26, -0.86],
        [0.56, 1.26, -0.86],
      ];
      for (let i = 0; i < legOffsets.length; i++) {
        const [lx, ly, lz] = legOffsets[i];
        const side = lx < 0 ? -1 : 1;
        const hip = new THREE.Group();
        hip.position.set(lx, ly, lz);

        if (i < 2) {
          const pauldron = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.36, 12, 10)), goldM);
          pauldron.scale.set(1.12, 0.72, 1.24);
          pauldron.position.set(side * 0.1, 0.24, 0);
          hip.add(pauldron);

          const windWing = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.14, 0.56, 5)), maneM);
          windWing.position.set(side * 0.34, 0.34, -0.18);
          windWing.rotation.set(-0.68, 0, -side * 0.68);
          hip.add(windWing);
        }

        const upper = new THREE.Mesh(this.trackGeo(new THREE.CapsuleGeometry(0.22, 0.58, 6, 12)), furM);
        upper.position.y = -0.34;
        hip.add(upper);

        const knee = new THREE.Group();
        knee.position.set(0, -0.68, 0);
        hip.add(knee);

        const lower = new THREE.Mesh(this.trackGeo(new THREE.CapsuleGeometry(0.17, 0.5, 6, 12)), furM);
        lower.position.y = -0.26;
        knee.add(lower);

        // Golden wind bracer cuff
        const bracer = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.2, 0.19, 0.16, 10)), goldM);
        bracer.position.y = -0.34;
        knee.add(bracer);

        const paw = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.24, 12, 10)), maneM);
        paw.scale.set(1.06, 0.54, 1.28);
        paw.position.set(0, -0.54, 0.08);
        knee.add(paw);

        for (let cl = -1; cl <= 1; cl++) {
          const claw = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.042, 0.18, 5)), goldM);
          claw.position.set(cl * 0.095, -0.56, 0.32);
          claw.rotation.x = Math.PI * 0.45;
          knee.add(claw);
        }

        bodyGroup.add(hip);
        legs.push(hip);
        lowerLegs.push(knee);
      }

      // 4-Segment Whip-like Striped Tiger Tail tipped with a glowing tempest wind plume
      let prevT: THREE.Object3D = bodyGroup;
      for (let s = 0; s < 4; s++) {
        const seg = new THREE.Group();
        seg.position.set(0, s === 0 ? 1.58 : 0.1, s === 0 ? -1.24 : -0.52);
        const cyl = new THREE.Mesh(
          this.trackGeo(new THREE.CapsuleGeometry(0.12 - s * 0.016, 0.46, 6, 10)),
          furM,
        );
        cyl.rotation.x = Math.PI / 2 - 0.18;
        cyl.position.z = -0.24;
        seg.add(cyl);
        if (s === 3) {
          const tuft = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.2, 0.56, 6)), maneM);
          tuft.rotation.x = -Math.PI / 2;
          tuft.position.z = -0.62;
          seg.add(tuft);
        }
        prevT.add(seg);
        tailSegments.push(seg);
        prevT = seg;
      }

      // Gale-force rune ring beneath the White Tiger
      const tigerRingGeo = this.trackGeo(new THREE.RingGeometry(1.65, 2.08, 36));
      tigerRingGeo.rotateX(-Math.PI / 2);
      const tigerRingMat = new THREE.MeshBasicMaterial({
        color: 0x67ffd8,
        transparent: true,
        opacity: 0.38,
        side: THREE.DoubleSide,
      });
      this.disposables.push(tigerRingMat);
      auraRing = new THREE.Mesh(tigerRingGeo, tigerRingMat);
      auraRing.position.y = 0.07;
      group.add(auraRing);
    } else if (species === 'vermilion_phoenix_boss') {
      // 남방 수호신 · 주작 (Vermilion Phoenix of the South — Fire Guardian Spirit, Imperial Detail)
      const bodyM = cloneMat(this.phoenixBodyMat);
      const goldM = cloneMat(this.phoenixGoldMat);
      const flameM = cloneMat(this.phoenixFlameMat);

      // Hovering sculpted avian torso with golden breastplate filigree & blazing solar core
      const torso = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.72, 20, 18)), bodyM);
      torso.scale.set(0.9, 1.16, 1.44);
      torso.position.set(0, 2.42, 0.06);
      bodyGroup.add(torso);
      hitMeshes.push(torso);

      const solarRingBezel = new THREE.Mesh(this.trackGeo(new THREE.TorusGeometry(0.36, 0.055, 8, 20)), goldM);
      solarRingBezel.position.set(0, 2.42, 0.68);
      bodyGroup.add(solarRingBezel);

      const solarCore = new THREE.Mesh(this.trackGeo(new THREE.OctahedronGeometry(0.32, 1)), flameM);
      solarCore.position.set(0, 2.42, 0.72);
      bodyGroup.add(solarCore);

      // Layered golden collar plumage around breast
      for (let cp = -3; cp <= 3; cp++) {
        const a = cp * 0.36;
        const plume = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.11, 0.44, 5)), cp % 2 === 0 ? goldM : flameM);
        plume.position.set(Math.sin(a) * 0.56, 2.74, 0.36 + Math.cos(a) * 0.28);
        plume.rotation.set(Math.PI * 0.82, 0, -Math.sin(a) * 0.4);
        bodyGroup.add(plume);
      }

      // Graceful S-curved Feathered Neck & Crowned Imperial Phoenix Head
      headPivot = new THREE.Group();
      headPivot.position.set(0, 3.06, 0.68);
      bodyGroup.add(headPivot);

      const neckLower = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.22, 0.32, 0.44, 12)), bodyM);
      neckLower.position.set(0, 0.08, 0.02);
      neckLower.rotation.x = 0.28;
      headPivot.add(neckLower);

      const neckUpper = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.19, 0.23, 0.4, 12)), bodyM);
      neckUpper.position.set(0, 0.38, 0.1);
      neckUpper.rotation.x = -0.14;
      headPivot.add(neckUpper);

      const skull = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.34, 16, 14)), bodyM);
      skull.scale.set(0.96, 1.0, 1.15);
      skull.position.set(0, 0.62, 0.14);
      headPivot.add(skull);
      hitMeshes.push(skull);

      // Hooked imperial golden beak (upper + lower)
      const upperBeak = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.14, 0.56, 6)), goldM);
      upperBeak.rotation.x = Math.PI / 2 + 0.22;
      upperBeak.position.set(0, 0.58, 0.56);
      headPivot.add(upperBeak);

      const lowerBeak = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.085, 0.34, 6)), goldM);
      lowerBeak.rotation.x = Math.PI / 2 + 0.42;
      lowerBeak.position.set(0, 0.46, 0.46);
      headPivot.add(lowerBeak);

      for (const side of [-1, 1] as const) {
        const eye = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.075, 10, 8)), goldM);
        eye.position.set(side * 0.23, 0.68, 0.3);
        headPivot.add(eye);

        const cheekFeather = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.08, 0.46, 5)), flameM);
        cheekFeather.position.set(side * 0.32, 0.56, -0.06);
        cheekFeather.rotation.set(-0.62, 0, -side * 0.68);
        headPivot.add(cheekFeather);
      }

      // 5-Plume Imperial Golden-Flame Crown Crest with glowing crest beads
      for (let c = -2; c <= 2; c++) {
        const len = 1.04 - Math.abs(c) * 0.16;
        const crest = new THREE.Mesh(
          this.trackGeo(new THREE.ConeGeometry(0.078, len, 6)),
          c === 0 ? goldM : flameM,
        );
        crest.position.set(c * 0.12, 1.04 - Math.abs(c) * 0.06, -0.2);
        crest.rotation.set(-0.74, 0, -c * 0.24);
        headPivot.add(crest);

        if (c === 0) {
          const crownOrb = new THREE.Mesh(this.trackGeo(new THREE.OctahedronGeometry(0.11, 0)), goldM);
          crownOrb.position.set(0, 1.48, -0.56);
          headPivot.add(crownOrb);
        }
      }

      // Grand 2-Tier Articulated Multi-Blade Flame Wings (9 feathers + gold shoulder armor per wing!)
      for (const side of [-1, 1] as const) {
        const wingPivot = new THREE.Group();
        wingPivot.position.set(side * 0.56, 2.66, 0.08);

        const shoulderGuard = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.32, 12, 10)), goldM);
        shoulderGuard.scale.set(1.25, 0.72, 1.15);
        shoulderGuard.position.set(side * 0.18, 0.14, 0.05);
        wingPivot.add(shoulderGuard);

        const wingArm = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(1.78, 0.2, 0.52)), bodyM);
        wingArm.position.set(side * 0.88, 0.14, -0.04);
        wingArm.rotation.z = side * 0.2;
        wingPivot.add(wingArm);
        hitMeshes.push(wingArm);

        // 6 long primary golden-crimson pinion feathers
        for (let f = 0; f < 6; f++) {
          const feather = new THREE.Mesh(
            this.trackGeo(new THREE.ConeGeometry(0.19, 1.52 + f * 0.22, 5)),
            f % 2 === 0 ? flameM : goldM,
          );
          feather.position.set(side * (0.48 + f * 0.36), 0.22 - f * 0.03, -0.44 - f * 0.09);
          feather.rotation.set(-Math.PI / 2 - 0.12, 0, -side * (0.3 + f * 0.13));
          wingPivot.add(feather);
        }

        // 3 inner secondary flame covert feathers
        for (let sf = 0; sf < 3; sf++) {
          const sec = new THREE.Mesh(
            this.trackGeo(new THREE.ConeGeometry(0.14, 0.92 + sf * 0.12, 5)),
            bodyM,
          );
          sec.position.set(side * (0.52 + sf * 0.38), 0.02, -0.18 - sf * 0.08);
          sec.rotation.set(-Math.PI / 2 - 0.25, 0, -side * (0.22 + sf * 0.12));
          wingPivot.add(sec);
        }

        bodyGroup.add(wingPivot);
        legs.push(wingPivot);
        lowerLegs.push(new THREE.Group());
      }

      // Golden Avian Legs with 3 Splayed Talons underneath (legs[2..3])
      for (const side of [-1, 1] as const) {
        const talonPivot = new THREE.Group();
        talonPivot.position.set(side * 0.3, 1.76, 0.12);
        const leg = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.065, 0.052, 0.48, 8)), goldM);
        leg.position.y = -0.24;
        talonPivot.add(leg);
        for (let cl = -1; cl <= 1; cl++) {
          const claw = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.048, 0.28, 5)), goldM);
          claw.position.set(cl * 0.085, -0.5, 0.1);
          claw.rotation.set(Math.PI * 0.78, 0, cl * 0.3);
          talonPivot.add(claw);
        }
        bodyGroup.add(talonPivot);
        legs.push(talonPivot);
        lowerLegs.push(new THREE.Group());
      }

      // Floating Spinning Solar-Halo Sunburst Wheel behind Phoenix (`tail`)
      const solarHalo = new THREE.Group();
      solarHalo.position.set(0, 2.75, -0.52);
      const wheel = new THREE.Mesh(this.trackGeo(new THREE.TorusGeometry(1.18, 0.048, 8, 32)), goldM);
      solarHalo.add(wheel);
      for (let sr = 0; sr < 8; sr++) {
        const a = (sr / 8) * Math.PI * 2;
        const ray = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.08, 0.36, 4)), flameM);
        ray.position.set(Math.cos(a) * 1.38, Math.sin(a) * 1.38, 0);
        ray.rotation.z = a - Math.PI / 2;
        solarHalo.add(ray);
      }
      bodyGroup.add(solarHalo);
      tail = solarHalo;

      // 5 Long Cascading Fire Tail Plumes tipped with glowing phoenix-eye diamond orbs (tailSegments)
      for (let t = -2; t <= 2; t++) {
        const plume = new THREE.Group();
        plume.position.set(t * 0.22, 2.16 - Math.abs(t) * 0.06, -0.82);
        const len = 2.28 - Math.abs(t) * 0.24;
        const ribbon = new THREE.Mesh(
          this.trackGeo(new THREE.ConeGeometry(0.2, len, 6)),
          t === 0 ? goldM : flameM,
        );
        ribbon.rotation.x = -Math.PI / 2 - 0.16;
        ribbon.position.set(t * 0.14, -0.22, -len * 0.48);
        plume.add(ribbon);
        const orb = new THREE.Mesh(this.trackGeo(new THREE.OctahedronGeometry(0.18, 0)), goldM);
        orb.position.set(t * 0.26, -0.44, -len * 0.94);
        plume.add(orb);
        const innerOrb = new THREE.Mesh(this.trackGeo(new THREE.OctahedronGeometry(0.1, 0)), flameM);
        innerOrb.position.set(t * 0.26, -0.44, -len * 0.94 + 0.08);
        plume.add(innerOrb);
        bodyGroup.add(plume);
        tailSegments.push(plume);
      }

      // Solar Flame Rune Ring on ground
      const phoenixRingGeo = this.trackGeo(new THREE.RingGeometry(1.7, 2.18, 36));
      phoenixRingGeo.rotateX(-Math.PI / 2);
      const phoenixRingMat = new THREE.MeshBasicMaterial({
        color: 0xff6b2b,
        transparent: true,
        opacity: 0.44,
        side: THREE.DoubleSide,
      });
      this.disposables.push(phoenixRingMat);
      auraRing = new THREE.Mesh(phoenixRingGeo, phoenixRingMat);
      auraRing.position.y = 0.07;
      group.add(auraRing);
    } else if (species === 'black_tortoise_boss') {
      // 북방 수호신 · 현무 (Black Tortoise & Coiled Spirit Serpent of the North — Ice/Earth Guardian, Fortress Detail)
      const shellM = cloneMat(this.tortoiseShellMat);
      const skinM = cloneMat(this.tortoiseSkinMat);
      const serpentM = cloneMat(this.tortoiseSerpentMat);
      const jadeM = cloneMat(this.tortoiseJadeMat);
      const goldM = cloneMat(this.bossGoldMat);

      // Massive Domed Armored Fortress Carapace
      const carapace = new THREE.Mesh(
        this.trackGeo(new THREE.SphereGeometry(1.56, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.58)),
        shellM,
      );
      carapace.scale.set(1.08, 0.86, 1.26);
      carapace.position.set(0, 0.84, -0.05);
      bodyGroup.add(carapace);
      hitMeshes.push(carapace);

      // Raised Hexagonal Jade-Rimmed Scute Plates across the dome
      const scutePositions: Array<[number, number, number, number, number]> = [
        [0, 2.08, -0.05, 0, 0],
        [0, 1.88, 0.72, 0.52, 0],
        [0, 1.84, -0.82, -0.52, 0],
        [-0.86, 1.72, 0.16, 0.12, 0.62],
        [0.86, 1.72, 0.16, 0.12, -0.62],
        [-0.78, 1.66, -0.62, -0.25, 0.58],
        [0.78, 1.66, -0.62, -0.25, -0.58],
      ];
      for (const [sx, sy, sz, rx, rz] of scutePositions) {
        const scute = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.42, 0.48, 0.14, 6)), shellM);
        scute.position.set(sx, sy, sz);
        scute.rotation.set(rx, 0, rz);
        bodyGroup.add(scute);

        const trim = new THREE.Mesh(this.trackGeo(new THREE.TorusGeometry(0.44, 0.028, 6, 6)), jadeM);
        trim.position.set(sx, sy + 0.04, sz);
        trim.rotation.set(Math.PI / 2 + rx, 0, rz);
        bodyGroup.add(trim);
      }

      // Heavy Armored Beveled Rim Skirt with Protective Corner Spikes
      const shellRim = new THREE.Mesh(this.trackGeo(new THREE.TorusGeometry(1.54, 0.2, 10, 32)), skinM);
      shellRim.rotation.x = Math.PI / 2;
      shellRim.scale.set(1.08, 1.26, 1.0);
      shellRim.position.set(0, 0.88, -0.05);
      bodyGroup.add(shellRim);

      const jadeRimGlow = new THREE.Mesh(this.trackGeo(new THREE.TorusGeometry(1.62, 0.042, 6, 32)), jadeM);
      jadeRimGlow.rotation.x = Math.PI / 2;
      jadeRimGlow.scale.set(1.08, 1.26, 1.0);
      jadeRimGlow.position.set(0, 0.9, -0.05);
      bodyGroup.add(jadeRimGlow);

      for (let sp = 0; sp < 8; sp++) {
        const a = (sp / 8) * Math.PI * 2 + Math.PI / 8;
        const rimSpike = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.12, 0.42, 5)), jadeM);
        rimSpike.position.set(Math.sin(a) * 1.72, 0.92, -0.05 + Math.cos(a) * 1.98);
        rimSpike.rotation.set(Math.cos(a) * 1.15, 0, -Math.sin(a) * 1.15);
        bodyGroup.add(rimSpike);
      }

      // Jagged Glacier-Jade Crystal Crown Ridge erupting along dorsal spine
      const crystalSpots: Array<[number, number, number, number, number]> = [
        [0, 2.34, -0.05, 0.86, 0.22],
        [-0.26, 2.18, 0.14, 0.56, 0.14],
        [0.26, 2.18, 0.14, 0.56, 0.14],
        [-0.68, 1.88, 0.28, 0.52, 0.16],
        [0.68, 1.88, 0.28, 0.52, 0.16],
        [-0.62, 1.82, -0.62, 0.5, 0.15],
        [0.62, 1.82, -0.62, 0.5, 0.15],
      ];
      for (const [cx, cy, cz, ch, cr] of crystalSpots) {
        const crys = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(cr, ch, 6)), jadeM);
        crys.position.set(cx, cy, cz);
        crys.rotation.z = -cx * 0.24;
        bodyGroup.add(crys);
      }

      // Fierce Armored Dragon-Tortoise Head with Armored Neck Rings & Tusked Jaw
      headPivot = new THREE.Group();
      headPivot.position.set(0, 1.08, 1.74);
      bodyGroup.add(headPivot);

      const neck = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.34, 0.42, 0.74, 12)), skinM);
      neck.rotation.x = Math.PI / 2 - 0.14;
      neck.position.set(0, -0.02, 0.12);
      headPivot.add(neck);

      const neckCollar = new THREE.Mesh(this.trackGeo(new THREE.TorusGeometry(0.4, 0.06, 8, 16)), jadeM);
      neckCollar.position.set(0, 0.02, 0.08);
      headPivot.add(neckCollar);

      const skull = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.74, 0.56, 0.88)), skinM);
      skull.position.set(0, 0.1, 0.56);
      headPivot.add(skull);
      hitMeshes.push(skull);

      const headCrestPlate = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.56, 0.12, 0.72)), shellM);
      headCrestPlate.position.set(0, 0.4, 0.46);
      headPivot.add(headCrestPlate);

      const tortoiseJaw = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.56, 0.18, 0.74)), skinM);
      tortoiseJaw.position.set(0, -0.22, 0.58);
      tortoiseJaw.rotation.x = 0.12;
      headPivot.add(tortoiseJaw);

      for (const side of [-1, 1] as const) {
        const eye = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.088, 10, 8)), jadeM);
        eye.position.set(side * 0.35, 0.2, 0.78);
        headPivot.add(eye);

        const browHorn = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.1, 0.52, 6)), jadeM);
        browHorn.position.set(side * 0.28, 0.48, 0.28);
        browHorn.rotation.set(-0.55, 0, -side * 0.35);
        headPivot.add(browHorn);

        const cheekSpike = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.075, 0.34, 5)), goldM);
        cheekSpike.position.set(side * 0.44, -0.02, 0.42);
        cheekSpike.rotation.set(-0.3, 0, -side * 1.15);
        headPivot.add(cheekSpike);

        const jawTusk = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.055, 0.22, 6)), this.tuskMat);
        jawTusk.position.set(side * 0.2, -0.06, 0.94);
        jawTusk.rotation.x = 0.22;
        headPivot.add(jawTusk);
      }

      // 4 Massive Stone-Armored Pillar Legs with Jade Anklets & 3 Obsidian Claws
      const legPos: Array<[number, number, number]> = [
        [-1.18, 0.78, 0.94],
        [1.18, 0.78, 0.94],
        [-1.14, 0.78, -1.0],
        [1.14, 0.78, -1.0],
      ];
      for (const [lx, ly, lz] of legPos) {
        const hip = new THREE.Group();
        hip.position.set(lx, ly, lz);
        const kneePlate = new THREE.Mesh(this.trackGeo(new THREE.OctahedronGeometry(0.28, 0)), shellM);
        kneePlate.position.set(0, -0.1, 0.22);
        hip.add(kneePlate);

        const pillar = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.34, 0.42, 0.82, 12)), skinM);
        pillar.position.y = -0.36;
        hip.add(pillar);

        const footRim = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.44, 0.46, 0.16, 12)), jadeM);
        footRim.position.y = -0.68;
        hip.add(footRim);

        for (let cl = -1; cl <= 1; cl++) {
          const claw = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.075, 0.24, 5)), goldM);
          claw.position.set(cl * 0.16, -0.72, 0.42);
          claw.rotation.x = Math.PI * 0.45;
          hip.add(claw);
        }

        bodyGroup.add(hip);
        legs.push(hip);
        lowerLegs.push(new THREE.Group());
      }

      // Intricately Coiled Spirit Serpent (영사) looping over the Carapace with Cobra Hood & Forked Tongue!
      let prevS: THREE.Object3D = bodyGroup;
      const serpentOffsets: Array<[number, number, number]> = [
        [0, 1.06, -1.78],
        [0.54, 0.48, -0.24],
        [0.44, 0.56, 0.44],
        [0.06, 0.56, 0.56],
        [-0.36, 0.52, 0.44],
        [-0.12, 0.56, 0.48],
      ];
      for (let s = 0; s < serpentOffsets.length; s++) {
        const [sx, sy, sz] = serpentOffsets[s];
        const seg = new THREE.Group();
        seg.position.set(sx, sy, sz);
        const rad = 0.32 - s * 0.024;
        const body = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(rad, 14, 12)), serpentM);
        body.scale.set(0.96, 1.42, 0.96);
        seg.add(body);
        hitMeshes.push(body);

        // Glowing dorsal jade ridge spine along serpent coils
        const spine = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.06, 0.28, 4)), jadeM);
        spine.position.set(0, 0.18, -rad);
        spine.rotation.x = -0.9;
        seg.add(spine);

        if (s === serpentOffsets.length - 1) {
          // Expanded Spirit Cobra Hood with Golden Markings + Menacing Fanged Serpent Head!
          const hood = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.46, 0.26, 0.62, 10)), serpentM);
          hood.scale.set(1.25, 1.0, 0.34);
          hood.position.set(0, 0.12, 0.04);
          seg.add(hood);

          const hoodTrim = new THREE.Mesh(this.trackGeo(new THREE.TorusGeometry(0.42, 0.036, 6, 16)), goldM);
          hoodTrim.scale.set(1.18, 1.0, 0.4);
          hoodTrim.position.set(0, 0.16, 0.12);
          seg.add(hoodTrim);

          const sHead = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.32, 0.86, 8)), serpentM);
          sHead.rotation.x = Math.PI / 2 + 0.08;
          sHead.position.set(0, 0.34, 0.36);
          seg.add(sHead);

          // Forked crimson spirit tongue
          const tongue = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.035, 0.42, 4)), this.bossCrimsonGlowMat);
          tongue.rotation.x = Math.PI / 2 + 0.18;
          tongue.position.set(0, 0.22, 0.94);
          seg.add(tongue);

          for (const side of [-1, 1] as const) {
            const sEye = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.072, 10, 8)), jadeM);
            sEye.position.set(side * 0.18, 0.42, 0.48);
            seg.add(sEye);

            const sFang = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.035, 0.22, 5)), this.tuskMat);
            sFang.position.set(side * 0.1, 0.18, 0.66);
            sFang.rotation.x = Math.PI;
            seg.add(sFang);
          }
        }
        prevS.add(seg);
        tailSegments.push(seg);
        prevS = seg;
      }

      // Frosted Jade-Earth Rune Ring on ground
      const tortoiseRingGeo = this.trackGeo(new THREE.RingGeometry(1.95, 2.45, 36));
      tortoiseRingGeo.rotateX(-Math.PI / 2);
      const tortoiseRingMat = new THREE.MeshBasicMaterial({
        color: 0x2dd4bf,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
      });
      this.disposables.push(tortoiseRingMat);
      auraRing = new THREE.Mesh(tortoiseRingGeo, tortoiseRingMat);
      auraRing.position.y = 0.07;
      group.add(auraRing);
    } else if (
      species === 'water_spirit' ||
      species === 'wind_spirit' ||
      species === 'fire_spirit' ||
      species === 'earth_spirit'
    ) {
      // Cute floating luminous Elemental Spirit (수/풍/화/토 정령)
      const theme =
        species === 'water_spirit'
          ? { body: 0x38bdf8, core: 0xe0f2fe, emissive: 0x0284c7, accent: 0x7dd3fc, cheek: 0xf472b6 }
          : species === 'wind_spirit'
            ? { body: 0x2dd4bf, core: 0xecfeff, emissive: 0x0f766e, accent: 0x99f6e4, cheek: 0xf9a8d4 }
            : species === 'fire_spirit'
              ? { body: 0xf97316, core: 0xfef08a, emissive: 0xc2410c, accent: 0xfbbf24, cheek: 0xfca5a5 }
              : { body: 0xd97706, core: 0xfef3c7, emissive: 0x78350f, accent: 0x84cc16, cheek: 0xfda4af };

      const spiritBodyMat = new THREE.MeshPhysicalMaterial({
        color: theme.body,
        emissive: theme.emissive,
        emissiveIntensity: 0.55,
        roughness: 0.14,
        metalness: 0.08,
        clearcoat: 0.95,
        clearcoatRoughness: 0.08,
      });
      const spiritCoreMat = new THREE.MeshStandardMaterial({
        color: theme.core,
        emissive: theme.accent,
        emissiveIntensity: 1.55,
        roughness: 0.18,
      });
      const spiritAccentMat = new THREE.MeshStandardMaterial({
        color: theme.accent,
        emissive: theme.emissive,
        emissiveIntensity: 0.85,
        roughness: 0.24,
        side: THREE.DoubleSide,
      });
      const cheekMat = new THREE.MeshBasicMaterial({
        color: theme.cheek,
        transparent: true,
        opacity: 0.72,
      });
      this.disposables.push(spiritBodyMat, spiritCoreMat, spiritAccentMat, cheekMat);

      headPivot = new THREE.Group();
      headPivot.position.set(0, 0.96, 0);
      bodyGroup.add(headPivot);

      // Plump floating teardrop/orb spirit torso
      const orbBody = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.46, 18, 16)), spiritBodyMat);
      orbBody.scale.set(1.0, 1.06, 0.96);
      headPivot.add(orbBody);
      hitMeshes.push(orbBody);

      // Inner luminous spirit heart
      const innerHeart = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.24, 12, 12)), spiritCoreMat);
      innerHeart.position.set(0, 0.04, 0.04);
      headPivot.add(innerHeart);

      // Cute tapered floating spirit tail-wisps underneath
      const lowerWisp = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.32, 0.52, 10)), spiritBodyMat);
      lowerWisp.rotation.x = Math.PI;
      lowerWisp.position.set(0, -0.44, -0.06);
      headPivot.add(lowerWisp);

      // Expressive glossy eyes + bright highlights + rosy cheeks
      for (const side of [-1, 1] as const) {
        const eye = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.082, 10, 10)), this.eyeDarkMat);
        eye.position.set(side * 0.16, 0.08, 0.4);
        headPivot.add(eye);
        const glint = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.03, 6, 6)), this.eyeSpecMat);
        glint.position.set(side * 0.18, 0.11, 0.47);
        headPivot.add(glint);
        const cheek = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.06, 8, 8)), cheekMat);
        cheek.scale.set(1.25, 0.72, 0.45);
        cheek.position.set(side * 0.27, -0.02, 0.36);
        headPivot.add(cheek);

        // Tiny animated floating spirit arms/wings
        const armPivot = new THREE.Group();
        armPivot.position.set(side * 0.42, -0.04, 0.06);
        const armMesh = new THREE.Mesh(
          this.trackGeo(
            species === 'wind_spirit'
              ? new THREE.ConeGeometry(0.16, 0.56, 5)
              : new THREE.CapsuleGeometry(0.085, 0.18, 6, 8),
          ),
          spiritAccentMat,
        );
        armMesh.rotation.z = side * (species === 'wind_spirit' ? -1.15 : -0.75);
        armMesh.position.set(side * 0.14, 0, 0);
        armPivot.add(armMesh);
        headPivot.add(armPivot);
        legs.push(armPivot);
      }

      // Elemental signature crown / crest
      if (species === 'water_spirit') {
        const dropTop = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.16, 0.36, 10)), spiritCoreMat);
        dropTop.position.set(0, 0.58, 0);
        headPivot.add(dropTop);
        for (const side of [-1, 1] as const) {
          const fin = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.11, 0.34, 6)), spiritAccentMat);
          fin.position.set(side * 0.44, 0.24, -0.04);
          fin.rotation.z = -side * 1.05;
          headPivot.add(fin);
        }
      } else if (species === 'wind_spirit') {
        for (const side of [-1, 1] as const) {
          const wing = new THREE.Mesh(this.trackGeo(new THREE.PlaneGeometry(0.55, 0.34)), spiritCoreMat);
          wing.position.set(side * 0.56, 0.16, -0.22);
          wing.rotation.y = side * -0.52;
          wing.rotation.z = side * 0.28;
          headPivot.add(wing);
        }
        const swirl = new THREE.Mesh(this.trackGeo(new THREE.TorusGeometry(0.24, 0.045, 8, 18)), spiritCoreMat);
        swirl.rotation.x = Math.PI / 2;
        swirl.position.set(0, 0.56, 0);
        headPivot.add(swirl);
      } else if (species === 'fire_spirit') {
        for (let f = 0; f < 5; f++) {
          const ang = (f / 5) * Math.PI * 2;
          const flame = new THREE.Mesh(
            this.trackGeo(new THREE.ConeGeometry(f === 0 ? 0.19 : 0.12, f === 0 ? 0.52 : 0.34, 6)),
            f % 2 === 0 ? spiritCoreMat : spiritAccentMat,
          );
          flame.position.set(
            f === 0 ? 0 : Math.cos(ang) * 0.22,
            f === 0 ? 0.6 : 0.46,
            f === 0 ? 0 : Math.sin(ang) * 0.22,
          );
          headPivot.add(flame);
        }
      } else {
        // Earth spirit: cute crystalline horn + mossy sprout
        const crystalHorn = new THREE.Mesh(this.trackGeo(new THREE.OctahedronGeometry(0.2, 0)), spiritCoreMat);
        crystalHorn.scale.set(0.75, 1.45, 0.75);
        crystalHorn.position.set(0, 0.58, 0);
        headPivot.add(crystalHorn);
        for (const side of [-1, 1] as const) {
          const leaf = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.13, 8, 8)), spiritAccentMat);
          leaf.scale.set(1.5, 0.55, 0.8);
          leaf.position.set(side * 0.24, 0.5, 0.06);
          leaf.rotation.z = side * 0.45;
          headPivot.add(leaf);
        }
      }
    }

    bodyGroup.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    for (const m of hitMeshes) {
      m.userData.monsterId = id;
    }

    const specMap: Record<
      MonsterSpecies,
      {
        label: string;
        bossTitle?: string;
        maxHp: number;
        attackDamage: number;
        moveSpeed: number;
        radius: number;
        interactRadius: number;
        respawnDuration: number;
        drops: { leather: number; fang: number; essence: number; iron?: number; crystal?: number };
        expReward: number;
      }
    > = {
      meadow_boar: {
        label: '초원 멧돼지',
        maxHp: 45,
        attackDamage: 9,
        moveSpeed: 3.1,
        radius: 0.74,
        interactRadius: 3.1,
        respawnDuration: 24,
        drops: { leather: 2, fang: 1, essence: 0 },
        expReward: 24,
      },
      forest_slime: {
        label: '이끼 슬라임',
        maxHp: 38,
        attackDamage: 7,
        moveSpeed: 2.3,
        radius: 0.64,
        interactRadius: 3.1,
        respawnDuration: 24,
        drops: { leather: 1, fang: 0, essence: 2 },
        expReward: 22,
      },
      water_slime: {
        label: '워터 슬라임',
        maxHp: 46,
        attackDamage: 9,
        moveSpeed: 2.55,
        radius: 0.66,
        interactRadius: 3.2,
        respawnDuration: 22,
        drops: { leather: 1, fang: 0, essence: 3 },
        expReward: 28,
      },
      fire_slime: {
        label: '파이어 슬라임',
        maxHp: 52,
        attackDamage: 12,
        moveSpeed: 2.7,
        radius: 0.66,
        interactRadius: 3.2,
        respawnDuration: 22,
        drops: { leather: 1, fang: 1, essence: 3 },
        expReward: 32,
      },
      wind_slime: {
        label: '윈드 슬라임',
        maxHp: 44,
        attackDamage: 10,
        moveSpeed: 3.2,
        radius: 0.66,
        interactRadius: 3.2,
        respawnDuration: 22,
        drops: { leather: 1, fang: 0, essence: 3 },
        expReward: 30,
      },
      earth_slime: {
        label: '어스 슬라임',
        maxHp: 64,
        attackDamage: 11,
        moveSpeed: 2.15,
        radius: 0.7,
        interactRadius: 3.2,
        respawnDuration: 24,
        drops: { leather: 1, fang: 0, essence: 3, iron: 1 },
        expReward: 34,
      },
      water_spirit: {
        label: '물의 정령',
        maxHp: 56,
        attackDamage: 10,
        moveSpeed: 3.1,
        radius: 0.62,
        interactRadius: 3.2,
        respawnDuration: 22,
        drops: { leather: 0, fang: 0, essence: 4, crystal: 1 },
        expReward: 38,
      },
      wind_spirit: {
        label: '바람의 정령',
        maxHp: 52,
        attackDamage: 11,
        moveSpeed: 3.85,
        radius: 0.6,
        interactRadius: 3.2,
        respawnDuration: 22,
        drops: { leather: 0, fang: 0, essence: 4, crystal: 1 },
        expReward: 38,
      },
      fire_spirit: {
        label: '불의 정령',
        maxHp: 62,
        attackDamage: 13,
        moveSpeed: 3.4,
        radius: 0.64,
        interactRadius: 3.2,
        respawnDuration: 22,
        drops: { leather: 0, fang: 1, essence: 5, crystal: 1 },
        expReward: 42,
      },
      earth_spirit: {
        label: '대지의 정령',
        maxHp: 74,
        attackDamage: 12,
        moveSpeed: 2.85,
        radius: 0.68,
        interactRadius: 3.3,
        respawnDuration: 24,
        drops: { leather: 0, fang: 0, essence: 5, iron: 2, crystal: 1 },
        expReward: 44,
      },
      frost_wolf: {
        label: '북방 서리 늑대',
        maxHp: 78,
        attackDamage: 14,
        moveSpeed: 4.3,
        radius: 0.78,
        interactRadius: 3.1,
        respawnDuration: 24,
        drops: { leather: 3, fang: 2, essence: 1 },
        expReward: 42,
      },
      ember_wolf: {
        label: '남방 화염 늑대',
        maxHp: 82,
        attackDamage: 16,
        moveSpeed: 4.5,
        radius: 0.78,
        interactRadius: 3.2,
        respawnDuration: 24,
        drops: { leather: 3, fang: 3, essence: 2 },
        expReward: 46,
      },
      night_skeleton: {
        label: '달빛 해골 전사',
        maxHp: 64,
        attackDamage: 13,
        moveSpeed: 3.9,
        radius: 0.72,
        interactRadius: 3.2,
        respawnDuration: 22,
        drops: { leather: 1, fang: 2, essence: 3, iron: 1 },
        expReward: 48,
      },
      night_wraith: {
        label: '밤안개 망령 사신',
        maxHp: 94,
        attackDamage: 18,
        moveSpeed: 4.5,
        radius: 0.76,
        interactRadius: 3.4,
        respawnDuration: 26,
        drops: { leather: 1, fang: 2, essence: 5, crystal: 1 },
        expReward: 68,
      },
      azure_dragon_boss: {
        label: '동방 수호신 · 청룡',
        bossTitle: '동방 수류(水) 사신수 수호신',
        maxHp: 560,
        attackDamage: 24,
        moveSpeed: 4.1,
        radius: 1.75,
        interactRadius: 5.0,
        respawnDuration: 65,
        drops: { leather: 6, fang: 6, essence: 10, iron: 5, crystal: 4 },
        expReward: 280,
      },
      white_tiger_boss: {
        label: '서방 수호신 · 백호',
        bossTitle: '서방 질풍(風) 사신수 수호신',
        maxHp: 520,
        attackDamage: 26,
        moveSpeed: 4.65,
        radius: 1.62,
        interactRadius: 4.8,
        respawnDuration: 65,
        drops: { leather: 8, fang: 8, essence: 8, iron: 5, crystal: 3 },
        expReward: 270,
      },
      vermilion_phoenix_boss: {
        label: '남방 수호신 · 주작',
        bossTitle: '남방 화염(火) 사신수 수호신',
        maxHp: 540,
        attackDamage: 27,
        moveSpeed: 4.35,
        radius: 1.68,
        interactRadius: 5.0,
        respawnDuration: 65,
        drops: { leather: 5, fang: 6, essence: 12, iron: 4, crystal: 4 },
        expReward: 290,
      },
      black_tortoise_boss: {
        label: '북방 수호신 · 현무',
        bossTitle: '북방 빙토(氷·土) 사신수 수호신',
        maxHp: 740,
        attackDamage: 28,
        moveSpeed: 3.15,
        radius: 1.85,
        interactRadius: 5.1,
        respawnDuration: 70,
        drops: { leather: 6, fang: 5, essence: 10, iron: 9, crystal: 5 },
        expReward: 340,
      },
      elder_tusk_boss: {
        label: '고대 철갑 멧돼지 군주',
        bossTitle: '서부 외곽 숲 지역 보스',
        maxHp: 320,
        attackDamage: 18,
        moveSpeed: 3.45,
        radius: 1.38,
        interactRadius: 4.4,
        respawnDuration: 55,
        drops: { leather: 6, fang: 5, essence: 4, iron: 3, crystal: 1 },
        expReward: 140,
      },
      coastal_titan_boss: {
        label: '심해 갑각 수호자',
        bossTitle: '남부 외곽 해안 지역 보스',
        maxHp: 390,
        attackDamage: 20,
        moveSpeed: 3.15,
        radius: 1.48,
        interactRadius: 4.5,
        respawnDuration: 60,
        drops: { leather: 5, fang: 4, essence: 7, iron: 4, crystal: 2 },
        expReward: 175,
      },
      alpha_frost_boss: {
        label: '혹한의 알파 서리늑대',
        bossTitle: '동부 외곽 유적 지역 보스',
        maxHp: 520,
        attackDamage: 24,
        moveSpeed: 4.45,
        radius: 1.36,
        interactRadius: 4.4,
        respawnDuration: 65,
        drops: { leather: 8, fang: 7, essence: 6, iron: 5, crystal: 2 },
        expReward: 220,
      },
      rune_golem_boss: {
        label: '고원 룬 수호 거신',
        bossTitle: '북부 외곽 철광산 지역 보스',
        maxHp: 780,
        attackDamage: 32,
        moveSpeed: 3.25,
        radius: 1.5,
        interactRadius: 4.7,
        respawnDuration: 75,
        drops: { leather: 6, fang: 4, essence: 10, iron: 8, crystal: 5 },
        expReward: 340,
      },
    };

    const isNightOnly = species === 'night_skeleton' || species === 'night_wraith';
    const isAggressive = isBoss || isNightOnly || species === 'frost_wolf' || species === 'ember_wolf';
    const breakReactKind: 'roar' | 'leap' | 'howl' =
      species === 'forest_slime' ||
      species === 'water_slime' ||
      species === 'fire_slime' ||
      species === 'wind_slime' ||
      species === 'earth_slime'
        ? 'leap'
        : species === 'frost_wolf' ||
            species === 'ember_wolf' ||
            species === 'alpha_frost_boss' ||
            species === 'white_tiger_boss' ||
            species === 'night_wraith'
          ? 'howl'
          : 'roar';

    // Species-distinct animated detail accents (orbiting elemental shards, dorsal spines, spectral soul wisps)
    let orbitalGroup: THREE.Group | undefined;
    if (
      species === 'forest_slime' ||
      species === 'water_slime' ||
      species === 'fire_slime' ||
      species === 'wind_slime' ||
      species === 'earth_slime'
    ) {
      orbitalGroup = new THREE.Group();
      orbitalGroup.position.y = 0.56;
      const orbMat =
        species === 'water_slime'
          ? this.waterSlimeCoreMat
          : species === 'fire_slime'
            ? this.fireSlimeCoreMat
            : species === 'wind_slime'
              ? this.windSlimeCoreMat
              : species === 'earth_slime'
                ? this.earthSlimeCoreMat
                : this.slimeCoreMat;
      const shardGeo =
        species === 'water_slime'
          ? this.trackGeo(new THREE.SphereGeometry(0.085, 8, 8))
          : species === 'earth_slime'
            ? this.trackGeo(new THREE.DodecahedronGeometry(0.105, 0))
            : species === 'wind_slime'
              ? this.trackGeo(new THREE.ConeGeometry(0.06, 0.24, 5))
              : this.trackGeo(new THREE.OctahedronGeometry(0.09, 0));
      const shardCount = species === 'wind_slime' ? 4 : 3;
      for (let k = 0; k < shardCount; k++) {
        const ang = (k / shardCount) * Math.PI * 2;
        const shard = new THREE.Mesh(shardGeo, orbMat);
        shard.position.set(Math.cos(ang) * 0.72, (k % 2 === 0 ? 0.14 : -0.06), Math.sin(ang) * 0.72);
        if (species === 'wind_slime') shard.rotation.z = Math.PI * 0.5;
        orbitalGroup.add(shard);
      }
      if (species === 'wind_slime' || species === 'water_slime') {
        const halo = new THREE.Mesh(
          this.trackGeo(new THREE.TorusGeometry(0.68, 0.022, 6, 20)),
          orbMat,
        );
        halo.rotation.x = Math.PI * 0.46;
        orbitalGroup.add(halo);
      }
      bodyGroup.add(orbitalGroup);
    } else if (species === 'frost_wolf' || species === 'ember_wolf') {
      // Bristling elemental dorsal crest & orbiting spirit sparks
      const crestMat = species === 'frost_wolf' ? this.bossIceCrystalMat : this.emberWolfManeMat;
      const spineGeo = this.trackGeo(new THREE.ConeGeometry(0.065, 0.26, 5));
      for (let k = 0; k < 4; k++) {
        const spine = new THREE.Mesh(spineGeo, crestMat);
        spine.position.set(0, 0.96 - k * 0.04, 0.28 - k * 0.22);
        spine.rotation.x = -0.52 - k * 0.08;
        bodyGroup.add(spine);
      }
      orbitalGroup = new THREE.Group();
      orbitalGroup.position.y = 0.85;
      const sparkGeo = this.trackGeo(new THREE.OctahedronGeometry(0.06, 0));
      for (let k = 0; k < 2; k++) {
        const ang = k * Math.PI;
        const sp = new THREE.Mesh(sparkGeo, crestMat);
        sp.position.set(Math.cos(ang) * 0.76, 0.12, Math.sin(ang) * 0.76);
        orbitalGroup.add(sp);
      }
      bodyGroup.add(orbitalGroup);
    } else if (species === 'meadow_boar') {
      // Coarse bristled dorsal ridge spines
      const ridgeGeo = this.trackGeo(new THREE.ConeGeometry(0.055, 0.2, 4));
      for (let k = 0; k < 5; k++) {
        const bristle = new THREE.Mesh(ridgeGeo, this.boarDarkMat);
        bristle.position.set(0, 0.96 - k * 0.03, 0.3 - k * 0.17);
        bristle.rotation.x = -0.35;
        bodyGroup.add(bristle);
      }
    } else if (species === 'night_skeleton' || species === 'night_wraith') {
      orbitalGroup = new THREE.Group();
      orbitalGroup.position.y = species === 'night_wraith' ? 1.38 : 1.2;
      const wispMat = species === 'night_wraith' ? this.undeadVioletGlowMat : this.undeadSoulGlowMat;
      const wispGeo = this.trackGeo(new THREE.OctahedronGeometry(0.075, 0));
      for (let k = 0; k < 3; k++) {
        const ang = (k / 3) * Math.PI * 2;
        const wisp = new THREE.Mesh(wispGeo, wispMat);
        wisp.position.set(Math.cos(ang) * 0.72, Math.sin(k * 2.1) * 0.18, Math.sin(ang) * 0.72);
        orbitalGroup.add(wisp);
      }
      bodyGroup.add(orbitalGroup);
    } else if (
      species === 'water_spirit' ||
      species === 'wind_spirit' ||
      species === 'fire_spirit' ||
      species === 'earth_spirit'
    ) {
      orbitalGroup = new THREE.Group();
      orbitalGroup.position.y = 0.96;
      const orbMat =
        species === 'water_spirit'
          ? this.waterSlimeCoreMat
          : species === 'wind_spirit'
            ? this.windSlimeCoreMat
            : species === 'fire_spirit'
              ? this.fireSlimeCoreMat
              : this.earthSlimeCoreMat;
      const moteGeo =
        species === 'water_spirit'
          ? this.trackGeo(new THREE.SphereGeometry(0.09, 8, 8))
          : species === 'earth_spirit'
            ? this.trackGeo(new THREE.DodecahedronGeometry(0.11, 0))
            : this.trackGeo(new THREE.OctahedronGeometry(0.095, 0));
      for (let k = 0; k < 4; k++) {
        const ang = (k / 4) * Math.PI * 2;
        const mote = new THREE.Mesh(moteGeo, orbMat);
        mote.position.set(Math.cos(ang) * 0.76, (k % 2 === 0 ? 0.2 : -0.14), Math.sin(ang) * 0.76);
        orbitalGroup.add(mote);
      }
      const halo = new THREE.Mesh(this.trackGeo(new THREE.TorusGeometry(0.74, 0.025, 6, 22)), orbMat);
      halo.rotation.x = Math.PI * 0.44;
      orbitalGroup.add(halo);
      bodyGroup.add(orbitalGroup);
    }

    const headHeightMap: Record<MonsterSpecies, number> = {
      forest_slime: 1.35,
      water_slime: 1.35,
      fire_slime: 1.35,
      wind_slime: 1.4,
      earth_slime: 1.4,
      water_spirit: 1.65,
      wind_spirit: 1.65,
      fire_spirit: 1.72,
      earth_spirit: 1.72,
      meadow_boar: 1.45,
      frost_wolf: 1.65,
      ember_wolf: 1.7,
      night_skeleton: 2.25,
      night_wraith: 2.5,
      elder_tusk_boss: 2.55,
      coastal_titan_boss: 2.75,
      alpha_frost_boss: 2.7,
      rune_golem_boss: 3.35,
      azure_dragon_boss: 3.6,
      white_tiger_boss: 2.95,
      vermilion_phoenix_boss: 3.55,
      black_tortoise_boss: 3.1,
    };

    const cfg = specMap[species];
    const elemProfile = getMonsterElementProfile(species);
    return {
      id,
      species,
      label: cfg.label,
      element: elemProfile.element,
      weakness: elemProfile.weakness,
      isBoss,
      isNightOnly,
      isAggressive,
      bossTitle: cfg.bossTitle,
      tier,
      group,
      bodyGroup,
      headPivot,
      hitMeshes,
      legs,
      lowerLegs,
      tail,
      tailSegments,
      auraRing,
      orbitalGroup,
      telegraphGroup,
      telegraphFill,
      telegraphOuter,
      homeX: x,
      homeZ: z,
      x,
      y,
      z,
      yaw: Math.random() * Math.PI * 2,
      radius: cfg.radius,
      interactRadius: cfg.interactRadius,
      headHeight: headHeightMap[species] ?? 1.8,
      hp: cfg.maxHp,
      maxHp: cfg.maxHp,
      attackDamage: cfg.attackDamage,
      moveSpeed: cfg.moveSpeed,
      wanderTargetX: x,
      wanderTargetZ: z,
      wanderWait: 1 + Math.random() * 2.5,
      aggroTimer: 0,
      attackCooldown: 0,
      hitFlashTimer: 0,
      knockVelX: 0,
      knockVelZ: 0,
      hopPhase: Math.random() * Math.PI * 2,
      slowTimer: 0,
      traitCooldown: 2.5 + Math.random() * 2.0,
      chargeTimer: 0,
      chargeDirX: 0,
      chargeDirZ: 0,
      btState: 'idle_patrol',
      siegeTargetId: null,
      attackAnimTimer: 0,
      attackAnimDuration: 0.48,
      breakReactTimer: 0,
      breakReactKind,
      phase: 1,
      enrageTriggered: false,
      bossSpecialCooldown: 3.5,
      telegraphTimer: 0,
      telegraphDuration: 0,
      telegraphRadius: 4.6,
      telegraphLabel: null,
      isDead: false,
      respawnTimer: 0,
      respawnDuration: cfg.respawnDuration,
      drops: cfg.drops,
      expReward: cfg.expReward,
    };
  }

  /**
   * Spawns a ranked Elemental Spirit (최하급 아기 정령 -> 하급 -> 중급 -> 상급 -> 최상급 -> 정령왕)
   * matching East(물), West(바람), South(불), North(대지) biome progression across 10 world tiers.
   */
  public createElementalSpirit(
    id: string,
    species: 'water_spirit' | 'wind_spirit' | 'fire_spirit' | 'earth_spirit',
    rank: SpiritRank,
    x: number,
    z: number,
    tier: number,
  ): WorldMonster {
    const m = this.createMonster(id, species, x, z, tier);
    const meta = SPIRIT_RANK_META[rank];
    const elemNoun =
      species === 'water_spirit'
        ? '물'
        : species === 'wind_spirit'
          ? '바람'
          : species === 'fire_spirit'
            ? '불'
            : '대지';

    m.spiritRank = rank;
    m.label =
      rank === 'king'
        ? `${elemNoun}의 정령왕`
        : rank === 'baby'
          ? `최하급 아기 ${elemNoun} 정령`
          : `${meta.prefix} ${elemNoun} 정령`;
    m.maxHp = Math.round(m.maxHp * meta.hpMult);
    m.hp = m.maxHp;
    m.attackDamage = Math.round(m.attackDamage * meta.atkMult);
    m.expReward = Math.round(m.expReward * meta.expMult);
    const dropMult = Math.max(0.75, Math.sqrt(meta.expMult));
    m.drops = {
      leather: 0,
      fang: rank === 'grand' || rank === 'king' ? 3 : 0,
      essence: Math.round(3 * dropMult),
      iron: species === 'earth_spirit' ? Math.round(2 * dropMult) : 0,
      crystal: Math.max(1, Math.round(1.2 * dropMult)),
    };
    m.bodyGroup.scale.setScalar(meta.scale);
    m.radius = Math.min(2.1, m.radius * Math.max(0.85, meta.scale * 0.82));
    m.interactRadius = Math.max(3.2, m.radius + 2.5);
    m.headHeight = m.headHeight * meta.scale + (rank === 'king' ? 0.5 : 0.15);

    if (rank === 'high' || rank === 'grand' || rank === 'king') {
      m.isAggressive = true;
      const ringColor =
        species === 'water_spirit'
          ? 0x38bdf8
          : species === 'wind_spirit'
            ? 0x2dd4bf
            : species === 'fire_spirit'
              ? 0xf97316
              : 0xf59e0b;
      const auraGeo = this.trackGeo(new THREE.RingGeometry(m.radius * 0.9, m.radius * 1.24, 32));
      auraGeo.rotateX(-Math.PI / 2);
      const auraMat = new THREE.MeshBasicMaterial({
        color: ringColor,
        transparent: true,
        opacity: rank === 'king' ? 0.72 : 0.45,
        side: THREE.DoubleSide,
        depthWrite: false,
        fog: false,
      });
      this.disposables.push(auraMat);
      m.auraRing = new THREE.Mesh(auraGeo, auraMat);
      m.auraRing.position.y = 0.06;
      m.auraRing.renderOrder = 3;
      m.group.add(m.auraRing);
    }

    if (rank === 'king') {
      m.isBoss = true;
      m.bossTitle = `${elemNoun} 원소의 절대 지배자 · 정령왕`;
      m.respawnDuration = 75;
      const crown = new THREE.Mesh(
        this.trackGeo(new THREE.TorusGeometry(0.54, 0.09, 8, 18)),
        this.bossGoldMat,
      );
      crown.rotation.x = Math.PI / 2;
      crown.position.y = m.headHeight - 0.18;
      m.group.add(crown);

      const telegraphGroup = new THREE.Group();
      telegraphGroup.position.y = 0.09;
      telegraphGroup.visible = false;
      const outerGeo = this.trackGeo(new THREE.RingGeometry(0.92, 1.0, 36));
      outerGeo.rotateX(-Math.PI / 2);
      const outerMat = new THREE.MeshBasicMaterial({
        color: 0xff3b3b,
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide,
        depthWrite: false,
        fog: false,
      });
      this.disposables.push(outerMat);
      const telegraphOuter = new THREE.Mesh(outerGeo, outerMat);
      telegraphOuter.renderOrder = 6;
      telegraphGroup.add(telegraphOuter);

      const fillGeo = this.trackGeo(new THREE.CircleGeometry(1.0, 32));
      fillGeo.rotateX(-Math.PI / 2);
      const fillMat = new THREE.MeshBasicMaterial({
        color: 0xff4d4d,
        transparent: true,
        opacity: 0.24,
        side: THREE.DoubleSide,
        depthWrite: false,
        fog: false,
      });
      this.disposables.push(fillMat);
      const telegraphFill = new THREE.Mesh(fillGeo, fillMat);
      telegraphFill.scale.setScalar(0.05);
      telegraphFill.renderOrder = 5;
      telegraphGroup.add(telegraphFill);
      m.group.add(telegraphGroup);
      m.telegraphGroup = telegraphGroup;
      m.telegraphOuter = telegraphOuter;
      m.telegraphFill = telegraphFill;
    }

    return m;
  }

  /**
   * Spawns a scaled, crowned Boss for the 30-Floor Trial Tower Dungeon Sanctuary.
   */
  public createTrialBoss(
    spec: TrialTowerFloorSpec,
    x: number,
    z: number,
    overrideY?: number,
  ): WorldMonster {
    const id = `trial_boss_f${spec.floor}_${Date.now()}`;
    const isSpirit =
      spec.species === 'water_spirit' ||
      spec.species === 'wind_spirit' ||
      spec.species === 'fire_spirit' ||
      spec.species === 'earth_spirit';
    const m =
      isSpirit && spec.spiritRank
        ? this.createElementalSpirit(id, spec.species as 'water_spirit' | 'wind_spirit' | 'fire_spirit' | 'earth_spirit', spec.spiritRank, x, z, 10)
        : this.createMonster(id, spec.species, x, z, 10);

    m.isBoss = true;
    m.isTrialBoss = true;
    m.trialFloor = spec.floor;
    m.trialPotionDrop = spec.drops.potion;
    m.isNightOnly = false;
    m.isAggressive = true;
    m.label = spec.bossName;
    m.bossTitle = spec.bossTitle;
    m.weakness = spec.weakness;
    m.hp = spec.hp;
    m.maxHp = spec.hp;
    m.attackDamage = spec.attackDamage;
    m.expReward = spec.expReward;
    m.drops = {
      leather: spec.drops.leather,
      fang: spec.drops.fang,
      essence: spec.drops.essence,
      iron: spec.drops.iron,
      crystal: spec.drops.crystal,
    };
    m.bodyGroup.scale.setScalar(spec.scale);
    m.radius = Math.min(2.35, m.radius * Math.max(1.0, spec.scale * 0.85));
    m.interactRadius = Math.max(4.5, m.radius + 2.8);
    m.headHeight = Math.max(2.1, m.headHeight * (spec.spiritRank ? 1.0 : spec.scale) + 0.35);
    m.aggroTimer = 999;

    if (overrideY !== undefined) {
      m.y = overrideY;
      m.group.position.set(x, overrideY, z);
    }

    // Attach Boss Aura Ring + Telegraph Zone if the base species wasn't already a boss
    if (!m.auraRing) {
      const accentInt = parseInt(spec.accentHex.replace('#', ''), 16) || 0xf59e0b;
      const auraGeo = this.trackGeo(new THREE.RingGeometry(m.radius * 0.95, m.radius * 1.25, 36));
      auraGeo.rotateX(-Math.PI / 2);
      const auraMat = new THREE.MeshBasicMaterial({
        color: accentInt,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
        depthWrite: false,
        fog: false,
      });
      this.disposables.push(auraMat);
      m.auraRing = new THREE.Mesh(auraGeo, auraMat);
      m.auraRing.position.y = 0.06;
      m.auraRing.renderOrder = 3;
      m.group.add(m.auraRing);
    }

    if (!m.telegraphGroup) {
      const telegraphGroup = new THREE.Group();
      telegraphGroup.position.y = 0.09;
      telegraphGroup.visible = false;

      const outerGeo = this.trackGeo(new THREE.RingGeometry(0.92, 1.0, 36));
      outerGeo.rotateX(-Math.PI / 2);
      const outerMat = new THREE.MeshBasicMaterial({
        color: 0xff3b3b,
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide,
        depthWrite: false,
        fog: false,
      });
      this.disposables.push(outerMat);
      const telegraphOuter = new THREE.Mesh(outerGeo, outerMat);
      telegraphOuter.renderOrder = 6;
      telegraphGroup.add(telegraphOuter);

      const fillGeo = this.trackGeo(new THREE.CircleGeometry(1.0, 32));
      fillGeo.rotateX(-Math.PI / 2);
      const fillMat = new THREE.MeshBasicMaterial({
        color: 0xff4d4d,
        transparent: true,
        opacity: 0.24,
        side: THREE.DoubleSide,
        depthWrite: false,
        fog: false,
      });
      this.disposables.push(fillMat);
      const telegraphFill = new THREE.Mesh(fillGeo, fillMat);
      telegraphFill.scale.setScalar(0.05);
      telegraphFill.renderOrder = 5;
      telegraphGroup.add(telegraphFill);

      m.group.add(telegraphGroup);
      m.telegraphGroup = telegraphGroup;
      m.telegraphOuter = telegraphOuter;
      m.telegraphFill = telegraphFill;
    }

    // Floating Golden Trial Crown above the boss
    const crown = new THREE.Mesh(
      this.trackGeo(new THREE.TorusGeometry(0.46, 0.075, 6, 14)),
      this.bossGoldMat,
    );
    crown.rotation.x = Math.PI / 2;
    crown.position.y = m.headHeight - 0.22;
    m.group.add(crown);

    return m;
  }

  public dispose(): void {
    this.disposables.forEach((d) => d.dispose());
  }
}
