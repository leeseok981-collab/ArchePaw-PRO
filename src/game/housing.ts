import * as THREE from 'three';
import {
  getHousingPieceMaxDurability,
  HOUSING_CATALOG,
  HOUSING_COLORS,
  HOUSING_TILE_SIZE,
  HOUSING_WALL_HEIGHT,
  HousingColorId,
  HousingEdge,
  HousingKind,
  HousingMaterial,
} from './types';
import { ProceduralTexturePack } from './textures';

export interface TileNeighborMask {
  /** Local -Z matching neighbor (floor / ceiling) */
  n?: boolean;
  /** Local +Z matching neighbor (floor / ceiling) */
  s?: boolean;
  /** Local -X matching neighbor (floor / ceiling) */
  w?: boolean;
  /** Local +X matching neighbor (floor / ceiling) */
  e?: boolean;
  /** Local -X colinear matching neighbor (walls / roofs) */
  left?: boolean;
  /** Local +X colinear matching neighbor (walls / roofs) */
  right?: boolean;
  /** Vertical level + 1 matching neighbor (walls) */
  up?: boolean;
  /** Vertical level - 1 matching neighbor (walls) */
  down?: boolean;
}

export function neighborMaskToSig(mask?: TileNeighborMask): string {
  if (!mask) return '00000000';
  return (
    (mask.n ? '1' : '0') +
    (mask.s ? '1' : '0') +
    (mask.w ? '1' : '0') +
    (mask.e ? '1' : '0') +
    (mask.left ? '1' : '0') +
    (mask.right ? '1' : '0') +
    (mask.up ? '1' : '0') +
    (mask.down ? '1' : '0')
  );
}

/**
 * Re-projects BoxGeometry UVs continuously in metric tile space (3.0m = 1 UV repeat)
 * so merged adjacent same-material tiles share seamless wood planks, stone courses,
 * stucco plaster, and roof shingles with zero visible UV seam.
 */
function applyContinuousBoxUVs(
  geo: THREE.BoxGeometry,
  offsetX = 0,
  offsetY = 0,
  offsetZ = 0,
  tileScale = HOUSING_TILE_SIZE,
): THREE.BoxGeometry {
  const pos = geo.attributes.position;
  const norm = geo.attributes.normal;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i) + offsetX;
    const vy = pos.getY(i) + offsetY;
    const vz = pos.getZ(i) + offsetZ;
    const ny = Math.abs(norm.getY(i));
    const nz = Math.abs(norm.getZ(i));
    if (ny > 0.5) {
      uv.setXY(i, vx / tileScale + 0.5, vz / tileScale + 0.5);
    } else if (nz > 0.5) {
      uv.setXY(i, vx / tileScale + 0.5, vy / tileScale);
    } else {
      uv.setXY(i, vz / tileScale + 0.5, vy / tileScale);
    }
  }
  uv.needsUpdate = true;
  return geo;
}

export interface PlacedHousingTile {
  id: string;
  kind: HousingKind;
  label: string;
  material: HousingMaterial;
  color: HousingColorId;
  gx: number;
  gz: number;
  level: number;
  edge: HousingEdge | null;
  rotationStep: number; // 0..3
  gridSnapped: boolean;
  heightOffset: number;
  baseY: number;
  // Computed world pose
  x: number;
  y: number;
  z: number;
  rotationY: number;
  slotKey: string;
  neighborSig: string;
  // Interactive door state
  isDoorOpen: boolean;
  doorAngle: number;
  doorPivot?: THREE.Group;
  // Three.js objects
  group: THREE.Group;
  visualGroup: THREE.Group;
  hitMeshes: THREE.Mesh[];
  windowMats: THREE.MeshStandardMaterial[];
  selectionBox: THREE.LineSegments;
  porchLight?: THREE.PointLight;
  // Auto Day/Night Interior Lighting Fixture elements (wall_torch / ceiling_light)
  fixtureLight?: THREE.PointLight;
  fixtureFlameGroup?: THREE.Group;
  fixtureGlowMats: THREE.MeshStandardMaterial[];
  fixtureHaloMesh?: THREE.Mesh;
  // Durability & siege damage state
  durability: number;
  maxDurability: number;
  damageFlashTimer: number;
  damageOverlay: THREE.Mesh;
  damageOverlayMat: THREE.MeshBasicMaterial;
  ownerId?: string;
}

export interface HousingGhostRig {
  kind: HousingKind;
  group: THREE.Group;
  tileContainer: THREE.Group;
  gridLines: THREE.LineSegments;
  ghostMats: THREE.MeshBasicMaterial[];
  footprintFill: THREE.Mesh;
  frontArrow: THREE.Mesh;
  dispose: () => void;
}

/**
 * Canonicalizes a cell edge so shared edges between adjacent tiles always map to
 * the exact same (gx, gz, edge) coordinate:
 * - 's' of (gx, gz) becomes 'n' of (gx, gz + 1)
 * - 'e' of (gx, gz) becomes 'w' of (gx + 1, gz)
 */
export function canonicalizeEdge(
  gx: number,
  gz: number,
  edge: HousingEdge,
): { gx: number; gz: number; edge: 'n' | 'w' } {
  if (edge === 's') return { gx, gz: gz + 1, edge: 'n' };
  if (edge === 'e') return { gx: gx + 1, gz, edge: 'w' };
  return { gx, gz, edge };
}

export function isWallKind(kind: HousingKind): boolean {
  return (
    kind === 'wall' ||
    kind === 'half_wall' ||
    kind === 'fence' ||
    kind === 'doorway' ||
    kind === 'door' ||
    kind === 'window_wall'
  );
}

export function isTopCoverKind(kind: HousingKind): boolean {
  return kind === 'ceiling' || kind === 'flat_roof' || kind === 'roof';
}

export function isWalkableTopKind(kind: HousingKind): boolean {
  return kind === 'floor' || kind === 'ceiling' || kind === 'flat_roof';
}

export function isFixtureKind(kind: HousingKind): boolean {
  return kind === 'wall_torch' || kind === 'ceiling_light';
}

export function isFurnitureKind(kind: HousingKind): boolean {
  return kind === 'bed' || kind === 'chair' || kind === 'table' || kind === 'cabinet';
}

export function getTileSlotKey(
  kind: HousingKind,
  gx: number,
  gz: number,
  level: number,
  edge: HousingEdge | null,
  rotationStep = 0,
  heightOffset = 0,
): string {
  const halfStep = Math.round(heightOffset / (HOUSING_WALL_HEIGHT * 0.5));
  const hSuffix = halfStep !== 0 ? `:h${halfStep}` : '';
  if (isFurnitureKind(kind)) {
    return `furn:${kind}:${gx},${gz},${level}${hSuffix}`;
  }
  if (kind === 'wall_torch') {
    const c = canonicalizeEdge(gx, gz, edge ?? 'n');
    const side = ((rotationStep % 2) + 2) % 2;
    return `wfix:${c.gx},${c.gz},${level},${c.edge},${side}${hSuffix}`;
  }
  if (kind === 'ceiling_light') {
    return `cfix:${gx},${gz},${level}${hSuffix}`;
  }
  if (isWallKind(kind)) {
    const c = canonicalizeEdge(gx, gz, edge ?? 'n');
    return `edge:${c.gx},${c.gz},${level},${c.edge}${hSuffix}`;
  }
  if (kind === 'pillar') return `pillar:${gx},${gz},${level}${hSuffix}`;
  if (kind === 'floor') return `floor:${gx},${gz},${level}${hSuffix}`;
  if (isTopCoverKind(kind)) return `top:${gx},${gz},${level}${hSuffix}`;
  return `stairs:${gx},${gz},${level}${hSuffix}`;
}

export function getTileWorldPose(
  kind: HousingKind,
  gx: number,
  gz: number,
  level: number,
  edge: HousingEdge | null,
  rotationStep: number,
  baseY: number,
): { x: number; y: number; z: number; rotationY: number } {
  const half = HOUSING_TILE_SIZE * 0.5;
  const cx = gx * HOUSING_TILE_SIZE;
  const cz = gz * HOUSING_TILE_SIZE;

  if (kind === 'pillar') {
    const normStep = ((rotationStep % 4) + 4) % 4;
    return {
      x: (gx - 0.5) * HOUSING_TILE_SIZE,
      y: baseY + level * HOUSING_WALL_HEIGHT,
      z: (gz - 0.5) * HOUSING_TILE_SIZE,
      rotationY: normStep * (Math.PI / 2),
    };
  }

  if (isWallKind(kind) || kind === 'wall_torch') {
    const c = canonicalizeEdge(gx, gz, edge ?? 'n');
    const wx = c.gx * HOUSING_TILE_SIZE;
    const wz = c.gz * HOUSING_TILE_SIZE;
    const y = baseY + level * HOUSING_WALL_HEIGHT;
    const side = ((rotationStep % 2) + 2) % 2;
    if (c.edge === 'n') {
      // Wall along X-axis at North edge of cell (c.gx, c.gz)
      // side 0 -> local +Z points South (+Z), side 1 -> local +Z points North (-Z)
      const flip = side === 1 ? Math.PI : 0;
      return { x: wx, y, z: wz - half, rotationY: flip };
    } else {
      // Wall along Z-axis at West edge of cell (c.gx, c.gz)
      // side 0 -> local +Z points East (+X), side 1 -> local +Z points West (-X)
      const flip = side === 1 ? -Math.PI / 2 : Math.PI / 2;
      return { x: wx - half, y, z: wz, rotationY: flip };
    }
  }

  const normStep = ((rotationStep % 4) + 4) % 4;
  const rotationY = normStep * (Math.PI / 2);

  if (isTopCoverKind(kind) || kind === 'ceiling_light') {
    return {
      x: cx,
      y: baseY + (level + 1) * HOUSING_WALL_HEIGHT,
      z: cz,
      rotationY,
    };
  }

  // floor or stairs sit at level's base elevation
  return {
    x: cx,
    y: baseY + level * HOUSING_WALL_HEIGHT,
    z: cz,
    rotationY,
  };
}

/**
 * Computes exact walkable top surface Y on a stairs tile for world position (px, pz).
 * Stairs local space: rises from +Z (y=0) to -Z (y=WALL_HEIGHT).
 * Uses exact Three.js Y-rotation inverse so 0°/90°/180°/270° and free rotations all ramp smoothly.
 */
export function getStairsSurfaceY(tile: PlacedHousingTile, px: number, pz: number): number | null {
  const half = HOUSING_TILE_SIZE * 0.5;
  const dx = px - tile.x;
  const dz = pz - tile.z;
  const cos = Math.cos(tile.rotationY);
  const sin = Math.sin(tile.rotationY);
  const localX = dx * cos - dz * sin;
  const localZ = dx * sin + dz * cos;

  if (Math.abs(localX) > half + 0.16 || Math.abs(localZ) > half + 0.26) {
    return null;
  }
  const t = THREE.MathUtils.clamp((half - localZ) / HOUSING_TILE_SIZE, 0, 1);
  return tile.y + t * HOUSING_WALL_HEIGHT + 0.05;
}

/**
 * Returns the (dgx, dgz) grid step in the upward climbing direction of a stairs tile (local -Z).
 */
export function getStairsAscentGridDelta(rotationStep: number): [number, number] {
  const norm = ((rotationStep % 4) + 4) % 4;
  if (norm === 0) return [0, -1];
  if (norm === 1) return [-1, 0];
  if (norm === 2) return [0, 1];
  return [1, 0];
}

/**
 * Updates the per-tile non-shared damage overlay visual based on current durability & hit flash timer.
 */
export function updateTileDamageVisual(tile: PlacedHousingTile, dt: number): void {
  if (tile.damageFlashTimer > 0) {
    tile.damageFlashTimer = Math.max(0, tile.damageFlashTimer - dt);
  }
  const ratio = tile.durability / Math.max(tile.maxDurability, 1);
  if (tile.damageFlashTimer > 0) {
    tile.damageOverlay.visible = true;
    tile.damageOverlayMat.color.setHex(0xff3b30);
    tile.damageOverlayMat.opacity = 0.22 + (tile.damageFlashTimer / 0.25) * 0.34;
  } else if (ratio < 0.72) {
    tile.damageOverlay.visible = true;
    if (ratio < 0.35) {
      tile.damageOverlayMat.color.setHex(0x991b1b);
      tile.damageOverlayMat.opacity = 0.32;
    } else {
      tile.damageOverlayMat.color.setHex(0xb45309);
      tile.damageOverlayMat.opacity = 0.16;
    }
  } else {
    tile.damageOverlay.visible = false;
  }
}

interface MaterialPalette {
  primary: THREE.MeshStandardMaterial;
  frame: THREE.MeshStandardMaterial;
  floor: THREE.MeshStandardMaterial;
  roof: THREE.MeshStandardMaterial;
  accent: THREE.MeshStandardMaterial;
  base: THREE.MeshStandardMaterial;
}

/**
 * Modular Tile-Connected ArcheAge Housing Library:
 * - 11 snap-connected pieces: floor, wall, pillar, doorway, door, window_wall,
 *   ceiling, roof, stairs, wall_torch, ceiling_light
 * - 4 high-craft PBR material tiers with 512x512 procedural albedo, bump & roughness maps
 * - Strict non-overlapping micro-beveled tile tolerances & orthogonal axis relief
 *   to guarantee zero Z-fighting / seam shimmering on camera motion
 * - Auto day/night interior lighting fixtures (wall torch & ceiling chandelier)
 */
export class HousingLibrary {
  private readonly palettes: Record<HousingMaterial, MaterialPalette>;
  private readonly coloredPalettes = new Map<string, MaterialPalette>();
  private readonly brassMat: THREE.MeshStandardMaterial;
  private readonly ironMat: THREE.MeshStandardMaterial;
  private disposables: Array<{ dispose: () => void }> = [];

  constructor(textures: ProceduralTexturePack) {
    // Architectural European Oak Planks (satin oiled timber + bump + roughness)
    const woodPlank = this.track(
      new THREE.MeshStandardMaterial({
        map: textures.housingTimber,
        bumpMap: textures.housingTimberBump,
        bumpScale: 0.032,
        roughnessMap: textures.housingTimberRough,
        color: 0xe6d2bc,
        roughness: 0.86,
        metalness: 0.03,
        envMapIntensity: 0.55,
      }),
    );

    // Hand-Hewn Aged Walnut Structural Beams
    const woodBeam = this.track(
      new THREE.MeshStandardMaterial({
        map: textures.housingBeam,
        bumpMap: textures.housingBeamBump,
        bumpScale: 0.036,
        color: 0xa37854,
        roughness: 0.84,
        metalness: 0.04,
        envMapIntensity: 0.45,
      }),
    );

    // Warm Cedar Scalloped Shingle Roof
    const woodRoof = this.track(
      new THREE.MeshStandardMaterial({
        map: textures.housingRoofTile,
        bumpMap: textures.housingRoofTileBump,
        bumpScale: 0.048,
        color: 0x9b633c,
        roughness: 0.78,
        metalness: 0.06,
        envMapIntensity: 0.6,
      }),
    );

    // Dressed Medieval Ashlar Stone Masonry (albedo + bump + roughness)
    const stoneBlock = this.track(
      new THREE.MeshStandardMaterial({
        map: textures.housingStone,
        bumpMap: textures.housingStoneBump,
        bumpScale: 0.048,
        roughnessMap: textures.housingStoneRough,
        color: 0xd9d7d2,
        roughness: 0.92,
        metalness: 0.04,
        envMapIntensity: 0.45,
      }),
    );

    // Deeper Cut Granite Trim & Quoins
    const stoneTrim = this.track(
      new THREE.MeshStandardMaterial({
        map: textures.housingStone,
        bumpMap: textures.housingStoneBump,
        bumpScale: 0.042,
        roughnessMap: textures.housingStoneRough,
        color: 0xa6abb0,
        roughness: 0.88,
        metalness: 0.07,
        envMapIntensity: 0.5,
      }),
    );

    // Highland Slate Shingle Roof
    const slateRoof = this.track(
      new THREE.MeshStandardMaterial({
        map: textures.housingRoofTile,
        bumpMap: textures.housingRoofTileBump,
        bumpScale: 0.046,
        color: 0x586b82,
        roughness: 0.64,
        metalness: 0.14,
        envMapIntensity: 0.8,
      }),
    );

    // Artisanal Venetian Lime Stucco Plaster (for ArcheAge Half-Timber)
    const plasterMat = this.track(
      new THREE.MeshStandardMaterial({
        map: textures.housingPlaster,
        bumpMap: textures.housingPlasterBump,
        bumpScale: 0.024,
        color: 0xfbf5ea,
        roughness: 0.91,
        metalness: 0.0,
        envMapIntensity: 0.35,
      }),
    );

    // Kiln-Fired Terracotta Clay Roof Shingles
    const terracottaRoof = this.track(
      new THREE.MeshStandardMaterial({
        map: textures.housingRoofTile,
        bumpMap: textures.housingRoofTileBump,
        bumpScale: 0.05,
        color: 0xc86446,
        roughness: 0.72,
        metalness: 0.07,
        envMapIntensity: 0.65,
      }),
    );

    // Forged Fortress Dressed Masonry & Riveted Plates
    const citadelStone = this.track(
      new THREE.MeshStandardMaterial({
        map: textures.housingCitadel,
        bumpMap: textures.housingCitadelBump,
        bumpScale: 0.042,
        roughnessMap: textures.housingCitadelRough,
        color: 0x9aa9bc,
        roughness: 0.66,
        metalness: 0.32,
        envMapIntensity: 0.9,
      }),
    );

    // Brushed Dark Gunmetal Steel Framing
    const steelTrim = this.track(
      new THREE.MeshStandardMaterial({
        map: textures.housingBeam,
        bumpMap: textures.housingCitadelBump,
        bumpScale: 0.02,
        color: 0x4b5c70,
        roughness: 0.34,
        metalness: 0.82,
        envMapIntensity: 1.05,
      }),
    );

    // Enameled Royal Cobalt Citadel Shingles
    const royalCobaltRoof = this.track(
      new THREE.MeshStandardMaterial({
        map: textures.housingRoofTile,
        bumpMap: textures.housingRoofTileBump,
        bumpScale: 0.046,
        color: 0x456799,
        roughness: 0.5,
        metalness: 0.36,
        envMapIntensity: 1.0,
      }),
    );

    this.ironMat = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x3b434d,
        roughness: 0.42,
        metalness: 0.78,
        envMapIntensity: 0.95,
      }),
    );
    this.brassMat = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xddb04b,
        roughness: 0.28,
        metalness: 0.86,
        envMapIntensity: 1.15,
      }),
    );

    this.palettes = {
      wood: {
        primary: woodPlank,
        frame: woodBeam,
        floor: woodPlank,
        roof: woodRoof,
        accent: this.brassMat,
        base: woodBeam,
      },
      stone: {
        primary: stoneBlock,
        frame: stoneTrim,
        floor: stoneBlock,
        roof: slateRoof,
        accent: this.ironMat,
        base: stoneTrim,
      },
      half_timber: {
        primary: plasterMat,
        frame: woodBeam,
        floor: woodPlank,
        roof: terracottaRoof,
        accent: this.brassMat,
        base: stoneBlock,
      },
      iron_fort: {
        primary: citadelStone,
        frame: steelTrim,
        floor: citadelStone,
        roof: royalCobaltRoof,
        accent: this.brassMat,
        base: steelTrim,
      },
    };
  }

  private track<T extends { dispose: () => void }>(item: T): T {
    this.disposables.push(item);
    return item;
  }

  private createWindowMaterial(): THREE.MeshStandardMaterial {
    return this.track(
      new THREE.MeshStandardMaterial({
        color: 0xb9d0df,
        emissive: 0xffb84d,
        emissiveIntensity: 0.0,
        roughness: 0.16,
        metalness: 0.22,
        envMapIntensity: 1.2,
      }),
    );
  }

  private createClearGlassMaterial(): THREE.MeshPhysicalMaterial {
    return this.track(
      new THREE.MeshPhysicalMaterial({
        color: 0xdcf4ff,
        emissive: 0x3b6e8c,
        emissiveIntensity: 0.05,
        transparent: true,
        opacity: 0.23,
        roughness: 0.06,
        metalness: 0.08,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        envMapIntensity: 1.35,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
  }

  private createFixtureGlowMaterial(
    unlitColor: number,
    emissiveHex: number,
    roughness = 0.22,
  ): THREE.MeshStandardMaterial {
    return this.track(
      new THREE.MeshStandardMaterial({
        color: unlitColor,
        emissive: emissiveHex,
        emissiveIntensity: 0.0,
        roughness,
        metalness: 0.08,
      }),
    );
  }

  private getPalette(material: HousingMaterial, color: HousingColorId): MaterialPalette {
    const base = this.palettes[material];
    if (color === 'natural') return base;

    const key = `${material}:${color}`;
    const cached = this.coloredPalettes.get(key);
    if (cached) return cached;

    const spec = HOUSING_COLORS.find((c) => c.id === color);
    if (!spec) return base;

    const paintCol = new THREE.Color(spec.tintHex);
    const roofCol = new THREE.Color(spec.roofHex);

    const primary = this.track(base.primary.clone());
    primary.color.lerp(paintCol, material === 'half_timber' ? 0.84 : 0.68);

    const floor = this.track(base.floor.clone());
    floor.color.lerp(paintCol, 0.38);

    const roof = this.track(base.roof.clone());
    roof.color.lerp(roofCol, 0.82);

    const frame = this.track(base.frame.clone());
    frame.color.lerp(roofCol, 0.24);

    const baseMat = this.track(base.base.clone());
    baseMat.color.lerp(roofCol, 0.26);

    const pal: MaterialPalette = {
      primary,
      frame,
      floor,
      roof,
      accent: base.accent,
      base: baseMat,
    };
    this.coloredPalettes.set(key, pal);
    return pal;
  }

  private buildTileGeometry(
    kind: HousingKind,
    material: HousingMaterial,
    color: HousingColorId,
    level: number,
    axisTag: number, // 0 for N/X-axis walls, 1 for W/Z-axis walls -> eliminates 90° corner coplanar Z-fighting
    windowMat: THREE.MeshStandardMaterial,
    neighbors: TileNeighborMask = {},
  ): {
    visualGroup: THREE.Group;
    porchLightPos?: THREE.Vector3;
    doorPivot?: THREE.Group;
    fixtureLightPos?: THREE.Vector3;
    fixtureFlameGroup?: THREE.Group;
    fixtureGlowMats: THREE.MeshStandardMaterial[];
    fixtureHaloMesh?: THREE.Mesh;
    bounds: { size: THREE.Vector3; center: THREE.Vector3 };
  } {
    const visualGroup = new THREE.Group();
    const pal = this.getPalette(material, color);
    const S = HOUSING_TILE_SIZE; // 3.0
    const H = HOUSING_WALL_HEIGHT; // 2.7
    const half = S * 0.5; // 1.5
    const SEAM = 0.006; // 6mm reveal ONLY on non-merged exposed edges -> zero Z-fighting
    const W = S - SEAM; // 2.994
    const halfW = W * 0.5; // 1.497
    let porchLightPos: THREE.Vector3 | undefined;
    let doorPivot: THREE.Group | undefined;
    const fixtureGlowMats: THREE.MeshStandardMaterial[] = [];

    // ---------------- FLOOR TILE (Seamless Auto-Merge across same material & color) ----------------
    if (kind === 'floor') {
      const mN = !!neighbors.n;
      const mS = !!neighbors.s;
      const mW = !!neighbors.w;
      const mE = !!neighbors.e;
      const borderT = 0.16;

      // Outer extent reaches exact ±half (1.500) on merged sides, ±halfW (1.497) on exposed sides
      const extMinX = mW ? -half : -halfW;
      const extMaxX = mE ? half : halfW;
      const extMinZ = mN ? -half : -halfW;
      const extMaxZ = mS ? half : halfW;
      const extSpanX = extMaxX - extMinX;
      const extCx = (extMinX + extMaxX) * 0.5;

      // Perimeter border framing beams ONLY on exposed (unmerged) edges
      if (!mN) {
        const bz = -halfW + borderT * 0.5;
        const beam = new THREE.Mesh(
          this.track(applyContinuousBoxUVs(new THREE.BoxGeometry(extSpanX, 0.22, borderT), extCx, -0.112, bz)),
          pal.frame,
        );
        beam.position.set(extCx, -0.112, bz);
        visualGroup.add(beam);
      }
      if (!mS) {
        const bz = halfW - borderT * 0.5;
        const beam = new THREE.Mesh(
          this.track(applyContinuousBoxUVs(new THREE.BoxGeometry(extSpanX, 0.22, borderT), extCx, -0.112, bz)),
          pal.frame,
        );
        beam.position.set(extCx, -0.112, bz);
        visualGroup.add(beam);
      }

      const sideMinZ = mN ? -half : -halfW + borderT + 0.002;
      const sideMaxZ = mS ? half : halfW - borderT - 0.002;
      const sideSpanZ = Math.max(0.1, sideMaxZ - sideMinZ);
      const sideCz = (sideMinZ + sideMaxZ) * 0.5;

      if (!mW) {
        const bx = -halfW + borderT * 0.5;
        const beam = new THREE.Mesh(
          this.track(applyContinuousBoxUVs(new THREE.BoxGeometry(borderT, 0.218, sideSpanZ), bx, -0.112, sideCz)),
          pal.frame,
        );
        beam.position.set(bx, -0.112, sideCz);
        visualGroup.add(beam);
      }
      if (!mE) {
        const bx = halfW - borderT * 0.5;
        const beam = new THREE.Mesh(
          this.track(applyContinuousBoxUVs(new THREE.BoxGeometry(borderT, 0.218, sideSpanZ), bx, -0.112, sideCz)),
          pal.frame,
        );
        beam.position.set(bx, -0.112, sideCz);
        visualGroup.add(beam);
      }

      // Main walkable slab: seamlessly fills exact ±half on merged edges, tucks cleanly inside exposed borders!
      const slabMinX = mW ? -half : -halfW + borderT + 0.002;
      const slabMaxX = mE ? half : halfW - borderT - 0.002;
      const slabMinZ = mN ? -half : -halfW + borderT + 0.002;
      const slabMaxZ = mS ? half : halfW - borderT - 0.002;
      const slabW = Math.max(0.2, slabMaxX - slabMinX);
      const slabD = Math.max(0.2, slabMaxZ - slabMinZ);
      const slabCx = (slabMinX + slabMaxX) * 0.5;
      const slabCz = (slabMinZ + slabMaxZ) * 0.5;

      const slab = new THREE.Mesh(
        this.track(applyContinuousBoxUVs(new THREE.BoxGeometry(slabW, 0.21, slabD), slabCx, -0.108, slabCz)),
        pal.floor,
      );
      slab.position.set(slabCx, -0.108, slabCz); // top flush at -0.003 -> seamless plane across all merged tiles
      visualGroup.add(slab);

      // Corner anchor brackets ONLY on true outer corners where neither adjacent edge is merged
      const corners: Array<[number, number, boolean]> = [
        [-halfW + 0.14, -halfW + 0.14, !mN && !mW],
        [halfW - 0.14, -halfW + 0.14, !mN && !mE],
        [-halfW + 0.14, halfW - 0.14, !mS && !mW],
        [halfW - 0.14, halfW - 0.14, !mS && !mE],
      ];
      for (const [cx, cz, isOuter] of corners) {
        if (!isOuter) continue;
        const cap = new THREE.Mesh(
          this.track(new THREE.BoxGeometry(0.16, 0.008, 0.16)),
          pal.accent,
        );
        cap.position.set(cx, 0.002, cz);
        visualGroup.add(cap);
      }

      if (level === 0) {
        // Foundation plinth merges cleanly to ±half on connected sides -> one solid stone/timber terrace!
        const pMinX = mW ? -half : -half + 0.09;
        const pMaxX = mE ? half : half - 0.09;
        const pMinZ = mN ? -half : -half + 0.09;
        const pMaxZ = mS ? half : half - 0.09;
        const pW = Math.max(0.2, pMaxX - pMinX);
        const pD = Math.max(0.2, pMaxZ - pMinZ);
        const pCx = (pMinX + pMaxX) * 0.5;
        const pCz = (pMinZ + pMaxZ) * 0.5;
        const plinth = new THREE.Mesh(
          this.track(applyContinuousBoxUVs(new THREE.BoxGeometry(pW, 1.54, pD), pCx, -0.995, pCz)),
          pal.base,
        );
        plinth.position.set(pCx, -0.995, pCz);
        visualGroup.add(plinth);

        // Corner foundation piers ONLY on outer exposed corners
        const pierCorners: Array<[number, number, boolean]> = [
          [-half + 0.21, -half + 0.21, !mN && !mW],
          [half - 0.21, -half + 0.21, !mN && !mE],
          [-half + 0.21, half - 0.21, !mS && !mW],
          [half - 0.21, half - 0.21, !mS && !mE],
        ];
        for (const [sx, sz, isOuter] of pierCorners) {
          if (!isOuter) continue;
          const pier = new THREE.Mesh(
            this.track(new THREE.BoxGeometry(0.28, 1.82, 0.28)),
            pal.frame,
          );
          pier.position.set(sx, -1.14, sz);
          visualGroup.add(pier);
        }
      } else {
        // Upper floor underside joists span cleanly across merged rooms
        for (const sx of [-0.88, 0, 0.88]) {
          const beam = new THREE.Mesh(
            this.track(new THREE.BoxGeometry(0.13, 0.14, slabD)),
            pal.frame,
          );
          beam.position.set(sx, -0.284, slabCz);
          visualGroup.add(beam);
        }
      }

      return {
        visualGroup,
        fixtureGlowMats,
        bounds: {
          size: new THREE.Vector3(S + 0.04, 0.36, S + 0.04),
          center: new THREE.Vector3(0, -0.12, 0),
        },
      };
    }

    // Orthogonal relief micro-stagger for walls so 90° intersecting N & W walls NEVER share coplanar faces
    const ax = axisTag * 0.006;
    const mLeft = !!neighbors.left;
    const mRight = !!neighbors.right;
    const mUp = !!neighbors.up;
    const mDown = !!neighbors.down;

    const wallTop = mUp ? H : H - 0.003 - ax * 0.5;
    const wallBot = mDown ? 0 : 0.003 + ax * 0.5;
    const wallSpanH = wallTop - wallBot;
    const wallMidY = (wallTop + wallBot) * 0.5;
    const postW = 0.21;
    const postCenterX = halfW - postW * 0.5;
    const coreD = 0.214 - ax;
    const postD = 0.272 - ax;
    const baseH = mDown ? 0 : 0.33 - ax;
    const baseD = 0.264 - ax;
    const topH = mUp ? 0 : 0.184 - ax;
    const topD = 0.284 - ax;

    // Horizontal extents extend flush to ±half (1.500) on merged sides, inset behind pilasters on exposed ends
    const wallExtMinX = mLeft ? -half : -halfW;
    const wallExtMaxX = mRight ? half : halfW;
    const wallExtW = wallExtMaxX - wallExtMinX;
    const wallExtCx = (wallExtMinX + wallExtMaxX) * 0.5;

    const innerMinX = mLeft ? -half : -halfW + postW + 0.002;
    const innerMaxX = mRight ? half : halfW - postW - 0.002;
    const innerWallW = Math.max(0.2, innerMaxX - innerMinX);
    const innerWallCx = (innerMinX + innerMaxX) * 0.5;

    // ---------------- SOLID WALL (Seamless Auto-Merge horizontally & vertically) ----------------
    if (kind === 'wall') {
      const coreBotY = mDown ? 0 : wallBot + baseH + 0.002;
      const coreTopY = mUp ? H : wallTop - topH - 0.002;
      const coreH = Math.max(0.2, coreTopY - coreBotY);
      const coreCenterY = (coreBotY + coreTopY) * 0.5;

      const wallCore = new THREE.Mesh(
        this.track(applyContinuousBoxUVs(new THREE.BoxGeometry(innerWallW, coreH, coreD), innerWallCx, coreCenterY, 0)),
        pal.primary,
      );
      wallCore.position.set(innerWallCx, coreCenterY, 0);
      visualGroup.add(wallCore);

      // Left & right outer pilasters ONLY on non-merged wall ends!
      const postBotY = wallBot;
      const postTopY = mUp ? H : wallTop - topH - 0.002;
      const postH = Math.max(0.2, postTopY - postBotY);
      const postCy = (postBotY + postTopY) * 0.5;
      if (!mLeft) {
        const post = new THREE.Mesh(
          this.track(applyContinuousBoxUVs(new THREE.BoxGeometry(postW, postH, postD), -postCenterX, postCy, 0)),
          pal.frame,
        );
        post.position.set(-postCenterX, postCy, 0);
        visualGroup.add(post);
      }
      if (!mRight) {
        const post = new THREE.Mesh(
          this.track(applyContinuousBoxUVs(new THREE.BoxGeometry(postW, postH, postD), postCenterX, postCy, 0)),
          pal.frame,
        );
        post.position.set(postCenterX, postCy, 0);
        visualGroup.add(post);
      }

      // Baseboard plinth skirt ONLY when not vertically stacked on top of a matching wall
      if (!mDown) {
        const baseboard = new THREE.Mesh(
          this.track(applyContinuousBoxUVs(new THREE.BoxGeometry(innerWallW, baseH, baseD), innerWallCx, wallBot + baseH * 0.5, 0)),
          pal.base,
        );
        baseboard.position.set(innerWallCx, wallBot + baseH * 0.5, 0);
        visualGroup.add(baseboard);
      }

      // Top cornice beam ONLY when no matching wall sits directly above
      if (!mUp) {
        const topBeam = new THREE.Mesh(
          this.track(applyContinuousBoxUVs(new THREE.BoxGeometry(wallExtW, topH, topD), wallExtCx, wallTop - topH * 0.5, 0)),
          pal.frame,
        );
        topBeam.position.set(wallExtCx, wallTop - topH * 0.5, 0);
        visualGroup.add(topBeam);
      }

      // Continuous mid rail & subtle architectural details only for half-timber / fortress
      if (material === 'half_timber') {
        const midRail = new THREE.Mesh(
          this.track(new THREE.BoxGeometry(innerWallW, 0.1, coreD + 0.032)),
          pal.frame,
        );
        midRail.position.set(innerWallCx, H * 0.52, 0);
        visualGroup.add(midRail);

        const centerStud = new THREE.Mesh(
          this.track(new THREE.BoxGeometry(0.11, coreH - 0.008, coreD + 0.022)),
          pal.frame,
        );
        centerStud.position.set(0, coreCenterY, 0);
        visualGroup.add(centerStud);

        for (const sx of [-0.68, 0.68]) {
          const brace = new THREE.Mesh(
            this.track(new THREE.BoxGeometry(0.085, 1.2, coreD + 0.014)),
            pal.frame,
          );
          brace.position.set(sx, 1.98, 0);
          brace.rotation.z = sx < 0 ? -0.52 : 0.52;
          visualGroup.add(brace);
        }
      } else if (material === 'iron_fort') {
        const midRail = new THREE.Mesh(
          this.track(new THREE.BoxGeometry(innerWallW, 0.09, coreD + 0.032)),
          pal.frame,
        );
        midRail.position.set(innerWallCx, H * 0.52, 0);
        visualGroup.add(midRail);
      } else if (!mLeft && !mRight) {
        // Standalone wood/stone wall keeps subtle decorative center rail; merged walls become pure seamless masonry/planks!
        const midRail = new THREE.Mesh(
          this.track(new THREE.BoxGeometry(innerWallW - 0.004, 0.09, coreD + 0.028)),
          pal.frame,
        );
        midRail.position.set(innerWallCx, H * 0.52, 0);
        visualGroup.add(midRail);
      }

      return {
        visualGroup,
        fixtureGlowMats,
        bounds: {
          size: new THREE.Vector3(S + 0.08, H + 0.06, 0.36),
          center: new THREE.Vector3(0, H * 0.5, 0),
        },
      };
    }

    // ---------------- HALF WALL (반벽 — 일반 벽의 1/2 높이 1.35m, 난간·카운터·낮은 칸막이, 좌우 자동 병합) ----------------
    if (kind === 'half_wall') {
      const halfH = H * 0.5; // 1.35m
      const capH = 0.14;
      const capD = topD + 0.04;
      const hwCoreBotY = wallBot + baseH + 0.002;
      const hwCoreTopY = halfH - capH - 0.002;
      const hwCoreH = Math.max(0.2, hwCoreTopY - hwCoreBotY);
      const hwCoreCy = (hwCoreBotY + hwCoreTopY) * 0.5;

      const hwCore = new THREE.Mesh(
        this.track(
          applyContinuousBoxUVs(
            new THREE.BoxGeometry(innerWallW, hwCoreH, coreD),
            innerWallCx,
            hwCoreCy,
            0,
          ),
        ),
        pal.primary,
      );
      hwCore.position.set(innerWallCx, hwCoreCy, 0);
      visualGroup.add(hwCore);

      // End pilasters only on unmerged ends
      const hwPostH = halfH - capH - wallBot - 0.002;
      const hwPostCy = wallBot + hwPostH * 0.5;
      if (!mLeft) {
        const post = new THREE.Mesh(
          this.track(
            applyContinuousBoxUVs(
              new THREE.BoxGeometry(postW, hwPostH, postD),
              -postCenterX,
              hwPostCy,
              0,
            ),
          ),
          pal.frame,
        );
        post.position.set(-postCenterX, hwPostCy, 0);
        visualGroup.add(post);
      }
      if (!mRight) {
        const post = new THREE.Mesh(
          this.track(
            applyContinuousBoxUVs(
              new THREE.BoxGeometry(postW, hwPostH, postD),
              postCenterX,
              hwPostCy,
              0,
            ),
          ),
          pal.frame,
        );
        post.position.set(postCenterX, hwPostCy, 0);
        visualGroup.add(post);
      }

      // Baseboard plinth
      const hwBase = new THREE.Mesh(
        this.track(
          applyContinuousBoxUVs(
            new THREE.BoxGeometry(innerWallW, baseH, baseD),
            innerWallCx,
            wallBot + baseH * 0.5,
            0,
          ),
        ),
        pal.base,
      );
      hwBase.position.set(innerWallCx, wallBot + baseH * 0.5, 0);
      visualGroup.add(hwBase);

      // Wide sculpted top coping ledge (usable as counter/balcony rail)
      const coping = new THREE.Mesh(
        this.track(
          applyContinuousBoxUVs(
            new THREE.BoxGeometry(wallExtW, capH, capD),
            wallExtCx,
            halfH - capH * 0.5,
            0,
          ),
        ),
        pal.frame,
      );
      coping.position.set(wallExtCx, halfH - capH * 0.5, 0);
      visualGroup.add(coping);

      if (material === 'half_timber') {
        const centerStud = new THREE.Mesh(
          this.track(new THREE.BoxGeometry(0.11, hwCoreH - 0.006, coreD + 0.022)),
          pal.frame,
        );
        centerStud.position.set(0, hwCoreCy, 0);
        visualGroup.add(centerStud);
      } else if (material === 'iron_fort') {
        const trimBand = new THREE.Mesh(
          this.track(new THREE.BoxGeometry(wallExtW, 0.055, capD + 0.014)),
          this.ironMat,
        );
        trimBand.position.set(wallExtCx, halfH - capH - 0.03, 0);
        visualGroup.add(trimBand);
      }

      return {
        visualGroup,
        fixtureGlowMats,
        bounds: {
          size: new THREE.Vector3(S + 0.08, halfH + 0.06, 0.38),
          center: new THREE.Vector3(0, halfH * 0.5, 0),
        },
      };
    }

    // ---------------- DEFENSIVE FENCE (방어 울타리 — 고내구 · 몬스터 침입 차단 · 좌우 자동 병합) ----------------
    if (kind === 'fence') {
      const fenceH = 1.48;
      const postH = 1.62;
      const fPostW = 0.22;
      const fPostX = halfW - fPostW * 0.5;
      const fMinX = mLeft ? -half : -halfW + fPostW * 0.5;
      const fMaxX = mRight ? half : halfW - fPostW * 0.5;
      const fSpanW = Math.max(0.4, fMaxX - fMinX);
      const fCx = (fMinX + fMaxX) * 0.5;

      // Ground stone/iron reinforcement curb along base (blocks small slimes & wolves completely)
      const curb = new THREE.Mesh(
        this.track(applyContinuousBoxUVs(new THREE.BoxGeometry(wallExtW, 0.28, 0.3 - ax), wallExtCx, 0.14, 0)),
        pal.base,
      );
      curb.position.set(wallExtCx, 0.14, 0);
      visualGroup.add(curb);

      // Horizontal fortified rails (lower + upper)
      for (const ry of [0.54, 1.18]) {
        const rail = new THREE.Mesh(
          this.track(applyContinuousBoxUVs(new THREE.BoxGeometry(fSpanW, 0.12, 0.15 - ax), fCx, ry, 0)),
          pal.frame,
        );
        rail.position.set(fCx, ry, 0);
        visualGroup.add(rail);
      }

      // Iron reinforcement strap across mid-height
      const ironBand = new THREE.Mesh(
        this.track(new THREE.BoxGeometry(fSpanW, 0.065, 0.185 - ax)),
        this.ironMat,
      );
      ironBand.position.set(fCx, 0.86, 0);
      visualGroup.add(ironBand);

      if (material === 'stone' || material === 'iron_fort') {
        // Fortified battlement wall + crenellations & iron spikes
        const lowerWall = new THREE.Mesh(
          this.track(applyContinuousBoxUVs(new THREE.BoxGeometry(fSpanW, 0.86, 0.22 - ax), fCx, 0.71, 0)),
          pal.primary,
        );
        lowerWall.position.set(fCx, 0.71, 0);
        visualGroup.add(lowerWall);

        const capBeam = new THREE.Mesh(
          this.track(applyContinuousBoxUVs(new THREE.BoxGeometry(wallExtW, 0.12, 0.28 - ax), wallExtCx, 1.2, 0)),
          pal.frame,
        );
        capBeam.position.set(wallExtCx, 1.2, 0);
        visualGroup.add(capBeam);

        // Crenellations / iron spear tips on top (allows clear sightlines over the fence!)
        const spikeCount = 6;
        for (let i = 0; i < spikeCount; i++) {
          const sx = -half + ((i + 0.5) / spikeCount) * S;
          const merlon = new THREE.Mesh(
            this.track(new THREE.BoxGeometry(0.24, 0.24, 0.22 - ax)),
            pal.frame,
          );
          merlon.position.set(sx, 1.36, 0);
          visualGroup.add(merlon);

          const spike = new THREE.Mesh(
            this.track(new THREE.ConeGeometry(0.055, 0.24, 4)),
            material === 'iron_fort' ? this.brassMat : this.ironMat,
          );
          spike.position.set(sx, 1.56, 0);
          visualGroup.add(spike);
        }
      } else {
        // Sharpened palisade pickets with defensive spear tips
        const picketCount = 8;
        for (let i = 0; i < picketCount; i++) {
          const px = -half + ((i + 0.5) / picketCount) * S;
          if (!mLeft && px < -fPostX + 0.14) continue;
          if (!mRight && px > fPostX - 0.14) continue;
          const picket = new THREE.Mesh(
            this.track(applyContinuousBoxUVs(new THREE.BoxGeometry(0.18, 1.08, 0.11 - ax), px, 0.82, 0)),
            pal.primary,
          );
          picket.position.set(px, 0.82, 0);
          visualGroup.add(picket);

          const tip = new THREE.Mesh(
            this.track(new THREE.ConeGeometry(0.095, 0.24, 4)),
            pal.frame,
          );
          tip.position.set(px, 1.48, 0);
          tip.rotation.y = Math.PI / 4;
          visualGroup.add(tip);
        }
      }

      // Heavy corner defense posts ONLY on exposed non-merged ends (or center post when standalone)
      const postPositions: number[] = [];
      if (!mLeft) postPositions.push(-fPostX);
      if (!mRight) postPositions.push(fPostX);
      if (mLeft && mRight) postPositions.push(0);
      for (const px of postPositions) {
        const post = new THREE.Mesh(
          this.track(new THREE.BoxGeometry(fPostW, postH, 0.26 - ax)),
          pal.frame,
        );
        post.position.set(px, postH * 0.5, 0);
        visualGroup.add(post);

        const cap = new THREE.Mesh(
          this.track(new THREE.OctahedronGeometry(0.11, 0)),
          pal.accent,
        );
        cap.position.set(px, postH + 0.06, 0);
        visualGroup.add(cap);
      }

      return {
        visualGroup,
        fixtureGlowMats,
        bounds: {
          size: new THREE.Vector3(S + 0.08, fenceH + 0.22, 0.36),
          center: new THREE.Vector3(0, fenceH * 0.52, 0),
        },
      };
    }

    // ---------------- PILLAR ----------------
    if (kind === 'pillar') {
      const shaftW = material === 'stone' || material === 'iron_fort' ? 0.34 : 0.3;
      const pilH = H - 0.006;

      // Stepped stone/timber plinth base
      const plinthLower = new THREE.Mesh(
        this.track(new THREE.BoxGeometry(0.48, 0.21, 0.48)),
        pal.base,
      );
      plinthLower.position.y = 0.108;
      visualGroup.add(plinthLower);

      const plinthUpper = new THREE.Mesh(
        this.track(new THREE.BoxGeometry(0.4, 0.15, 0.4)),
        pal.frame,
      );
      plinthUpper.position.y = 0.29;
      visualGroup.add(plinthUpper);

      // Main shaft strictly between plinthUpper top (0.365) and capitalNeck bottom (H - 0.32)
      const shaftBot = 0.367;
      const shaftTop = H - 0.325;
      const shaftH = shaftTop - shaftBot;
      const shaft = new THREE.Mesh(
        this.track(new THREE.BoxGeometry(shaftW, shaftH, shaftW)),
        pal.primary,
      );
      shaft.position.y = shaftBot + shaftH * 0.5;
      visualGroup.add(shaft);

      // Corner vertical chamfer ribs cleanly protruding outside shaftW
      for (const sx of [-shaftW * 0.48, shaftW * 0.48]) {
        for (const sz of [-shaftW * 0.48, shaftW * 0.48]) {
          const rib = new THREE.Mesh(
            this.track(new THREE.BoxGeometry(0.065, shaftH - 0.02, 0.065)),
            pal.frame,
          );
          rib.position.set(sx, shaftBot + shaftH * 0.5, sz);
          visualGroup.add(rib);
        }
      }

      // Mid decorative collar band
      const midBand = new THREE.Mesh(
        this.track(new THREE.BoxGeometry(shaftW + 0.08, 0.09, shaftW + 0.08)),
        pal.accent,
      );
      midBand.position.y = H * 0.52;
      visualGroup.add(midBand);

      // Flared top capital & corbel cap (top strictly at H - 0.004)
      const capitalNeck = new THREE.Mesh(
        this.track(new THREE.BoxGeometry(0.4, 0.14, 0.4)),
        pal.accent,
      );
      capitalNeck.position.y = H - 0.252;
      visualGroup.add(capitalNeck);

      const capitalTop = new THREE.Mesh(
        this.track(new THREE.BoxGeometry(0.5, 0.176, 0.5)),
        pal.frame,
      );
      capitalTop.position.y = H - 0.092;
      visualGroup.add(capitalTop);

      // Level-0 deep foundation footing strictly below y = 0.002
      if (level === 0) {
        const footing = new THREE.Mesh(
          this.track(new THREE.BoxGeometry(0.42, 1.64, 0.42)),
          pal.base,
        );
        footing.position.y = -0.822;
        visualGroup.add(footing);
      }

      return {
        visualGroup,
        fixtureGlowMats,
        bounds: {
          size: new THREE.Vector3(0.56, pilH + 0.06, 0.56),
          center: new THREE.Vector3(0, H * 0.5, 0),
        },
      };
    }

    // ---------------- DOORWAY & HINGED DOOR (Seamless Auto-Merge) ----------------
    if (kind === 'doorway' || kind === 'door') {
      const doorH = 2.08;
      const jambX = 0.67;
      const jambW = 0.15;
      const sideInner = jambX + jambW * 0.5 + 0.002;
      const sideCoreBot = mDown ? 0 : wallBot + baseH + 0.002;
      const sideCoreTop = mUp ? H : wallTop - topH - 0.002;
      const sideCoreH = Math.max(0.2, sideCoreTop - sideCoreBot);
      const sideCoreY = (sideCoreBot + sideCoreTop) * 0.5;

      const leftOuter = mLeft ? -half : -halfW + postW + 0.002;
      const rightOuter = mRight ? half : halfW - postW - 0.002;
      const leftSpan = Math.max(0.1, -sideInner - leftOuter);
      const leftCx = (leftOuter + -sideInner) * 0.5;
      const rightSpan = Math.max(0.1, rightOuter - sideInner);
      const rightCx = (sideInner + rightOuter) * 0.5;

      for (const [cx, sw] of [
        [leftCx, leftSpan],
        [rightCx, rightSpan],
      ] as const) {
        const sideWall = new THREE.Mesh(
          this.track(applyContinuousBoxUVs(new THREE.BoxGeometry(sw, sideCoreH, coreD), cx, sideCoreY, 0)),
          pal.primary,
        );
        sideWall.position.set(cx, sideCoreY, 0);
        visualGroup.add(sideWall);

        if (!mDown) {
          const skirt = new THREE.Mesh(
            this.track(applyContinuousBoxUVs(new THREE.BoxGeometry(sw, baseH, baseD), cx, wallBot + baseH * 0.5, 0)),
            pal.base,
          );
          skirt.position.set(cx, wallBot + baseH * 0.5, 0);
          visualGroup.add(skirt);
        }
      }

      // Header transom wall strictly between door lintel top and top edge
      const lintelTopY = doorH + 0.12;
      const topBeamBotY = mUp ? H : wallTop - topH - 0.002;
      const headerH = Math.max(0.12, topBeamBotY - lintelTopY);
      const header = new THREE.Mesh(
        this.track(applyContinuousBoxUVs(new THREE.BoxGeometry(sideInner * 2, headerH, coreD), 0, lintelTopY + headerH * 0.5, 0)),
        pal.primary,
      );
      header.position.y = lintelTopY + headerH * 0.5;
      visualGroup.add(header);

      // Outer pilasters ONLY on exposed non-merged wall ends
      const postBotY = wallBot;
      const postTopY = mUp ? H : wallTop - topH - 0.002;
      const postH = Math.max(0.2, postTopY - postBotY);
      const postCy = (postBotY + postTopY) * 0.5;
      if (!mLeft) {
        const post = new THREE.Mesh(
          this.track(applyContinuousBoxUVs(new THREE.BoxGeometry(postW, postH, postD), -postCenterX, postCy, 0)),
          pal.frame,
        );
        post.position.set(-postCenterX, postCy, 0);
        visualGroup.add(post);
      }
      if (!mRight) {
        const post = new THREE.Mesh(
          this.track(applyContinuousBoxUVs(new THREE.BoxGeometry(postW, postH, postD), postCenterX, postCy, 0)),
          pal.frame,
        );
        post.position.set(postCenterX, postCy, 0);
        visualGroup.add(post);
      }

      // Door jambs & top lintel (cleanly proud of coreD)
      for (const sx of [-jambX, jambX]) {
        const jamb = new THREE.Mesh(
          this.track(new THREE.BoxGeometry(jambW, doorH - 0.04, coreD + 0.095)),
          pal.frame,
        );
        jamb.position.set(sx, (doorH - 0.04) * 0.5 + wallBot, 0);
        visualGroup.add(jamb);
      }
      const lintel = new THREE.Mesh(
        this.track(new THREE.BoxGeometry(jambX * 2 + jambW + 0.1, 0.155, coreD + 0.115)),
        pal.frame,
      );
      lintel.position.y = doorH + 0.04;
      visualGroup.add(lintel);

      if (!mUp) {
        const topBeam = new THREE.Mesh(
          this.track(applyContinuousBoxUVs(new THREE.BoxGeometry(wallExtW, topH, topD), wallExtCx, wallTop - topH * 0.5, 0)),
          pal.frame,
        );
        topBeam.position.set(wallExtCx, wallTop - topH * 0.5, 0);
        visualGroup.add(topBeam);
      }

      // Threshold sill
      const threshold = new THREE.Mesh(
        this.track(new THREE.BoxGeometry(jambX * 2 - jambW - 0.01, 0.052, coreD + 0.105)),
        pal.base,
      );
      threshold.position.y = wallBot + 0.026;
      visualGroup.add(threshold);

      // Overhead sconce porch lantern
      const lampBracket = new THREE.Mesh(
        this.track(new THREE.BoxGeometry(0.09, 0.09, 0.24)),
        this.ironMat,
      );
      lampBracket.position.set(0, doorH + 0.3, 0.18);
      visualGroup.add(lampBracket);

      const lampCap = new THREE.Mesh(
        this.track(new THREE.ConeGeometry(0.13, 0.09, 6)),
        this.ironMat,
      );
      lampCap.position.set(0, doorH + 0.32, 0.29);
      visualGroup.add(lampCap);

      const lampOrb = new THREE.Mesh(
        this.track(new THREE.OctahedronGeometry(0.095, 0)),
        windowMat,
      );
      lampOrb.position.set(0, doorH + 0.22, 0.29);
      visualGroup.add(lampOrb);
      porchLightPos = new THREE.Vector3(0, doorH + 0.16, 0.52);

      // Interactive Hinged Door Leaf (zero internal coplanarity between rails, stiles, hinges, and panel)
      if (kind === 'door') {
        doorPivot = new THREE.Group();
        doorPivot.position.set(-0.59, 0.06, 0);

        const leafW = 1.18;
        const leafH = doorH - 0.11;

        const leafPanel = new THREE.Mesh(
          this.track(new THREE.BoxGeometry(leafW - 0.04, leafH - 0.04, 0.088)),
          pal.roof,
        );
        leafPanel.position.set(leafW * 0.5, leafH * 0.5, 0);
        doorPivot.add(leafPanel);

        // Horizontal rails (depth 0.118)
        for (const sy of [0.09, leafH * 0.48, leafH - 0.09]) {
          const rail = new THREE.Mesh(
            this.track(new THREE.BoxGeometry(leafW - 0.18, 0.11, 0.118)),
            pal.frame,
          );
          rail.position.set(leafW * 0.5, sy, 0);
          doorPivot.add(rail);
        }
        // Vertical stiles (depth 0.128, full height -> proud of rails, zero coplanar overlap)
        for (const sx of [0.055, leafW - 0.055]) {
          const stile = new THREE.Mesh(
            this.track(new THREE.BoxGeometry(0.1, leafH, 0.128)),
            pal.frame,
          );
          stile.position.set(sx, leafH * 0.5, 0);
          doorPivot.add(stile);
        }

        // Iron strap hinges (depth 0.146 -> proud of stiles & rails)
        for (const hy of [0.36, leafH - 0.36]) {
          const strap = new THREE.Mesh(
            this.track(new THREE.BoxGeometry(0.46, 0.075, 0.146)),
            this.ironMat,
          );
          strap.position.set(0.24, hy, 0);
          doorPivot.add(strap);
        }

        // Upper glazed peep window
        const peepGlass = new THREE.Mesh(
          this.track(new THREE.BoxGeometry(0.3, 0.3, 0.106)),
          windowMat,
        );
        peepGlass.position.set(leafW * 0.5, leafH * 0.72, 0);
        doorPivot.add(peepGlass);

        // Brass door latch plate & twin knobs
        const latchPlate = new THREE.Mesh(
          this.track(new THREE.BoxGeometry(0.08, 0.24, 0.146)),
          this.ironMat,
        );
        latchPlate.position.set(leafW - 0.18, leafH * 0.48, 0);
        doorPivot.add(latchPlate);

        for (const sz of [-0.095, 0.095]) {
          const knob = new THREE.Mesh(
            this.track(new THREE.SphereGeometry(0.052, 8, 8)),
            this.brassMat,
          );
          knob.position.set(leafW - 0.18, leafH * 0.48, sz);
          doorPivot.add(knob);
        }

        visualGroup.add(doorPivot);
      }

      return {
        visualGroup,
        porchLightPos,
        doorPivot,
        fixtureGlowMats,
        bounds: {
          size: new THREE.Vector3(S + 0.08, H + 0.06, 0.36),
          center: new THREE.Vector3(0, H * 0.5, 0),
        },
      };
    }

    // ---------------- TRANSPARENT WINDOW WALL (투명 유리창 벽 · Seamless Auto-Merge) ----------------
    if (kind === 'window_wall') {
      const winHalfW = 0.78;
      const winBot = 0.86;
      const winTop = 2.14;
      const winCenterY = (winBot + winTop) * 0.5;
      const winH = winTop - winBot;
      const sideInner = winHalfW + 0.05;
      const sideCoreBot = mDown ? 0 : wallBot + baseH + 0.002;
      const sideCoreTop = mUp ? H : wallTop - topH - 0.002;
      const sideCoreH = Math.max(0.2, sideCoreTop - sideCoreBot);
      const sideCoreY = (sideCoreBot + sideCoreTop) * 0.5;

      const leftOuter = mLeft ? -half : -halfW + postW + 0.002;
      const rightOuter = mRight ? half : halfW - postW - 0.002;
      const leftSpan = Math.max(0.1, -sideInner - leftOuter);
      const leftCx = (leftOuter + -sideInner) * 0.5;
      const rightSpan = Math.max(0.1, rightOuter - sideInner);
      const rightCx = (sideInner + rightOuter) * 0.5;

      for (const [cx, sw] of [
        [leftCx, leftSpan],
        [rightCx, rightSpan],
      ] as const) {
        const sideWall = new THREE.Mesh(
          this.track(applyContinuousBoxUVs(new THREE.BoxGeometry(sw, sideCoreH, coreD), cx, sideCoreY, 0)),
          pal.primary,
        );
        sideWall.position.set(cx, sideCoreY, 0);
        visualGroup.add(sideWall);
      }

      // Lower parapet strictly between baseboard top and window sill bottom
      const lowerBot = sideCoreBot;
      const lowerTop = winBot - 0.05;
      const lowerH = Math.max(0.1, lowerTop - lowerBot);
      const lower = new THREE.Mesh(
        this.track(applyContinuousBoxUVs(new THREE.BoxGeometry(sideInner * 2, lowerH, coreD), 0, lowerBot + lowerH * 0.5, 0)),
        pal.primary,
      );
      lower.position.y = lowerBot + lowerH * 0.5;
      visualGroup.add(lower);

      // Upper header strictly between window header top and topBeam bottom
      const upperBot = winTop + 0.05;
      const upperTop = sideCoreTop;
      const upperH = Math.max(0.1, upperTop - upperBot);
      const upper = new THREE.Mesh(
        this.track(applyContinuousBoxUVs(new THREE.BoxGeometry(sideInner * 2, upperH, coreD), 0, upperBot + upperH * 0.5, 0)),
        pal.primary,
      );
      upper.position.y = upperBot + upperH * 0.5;
      visualGroup.add(upper);

      // Corner pilasters ONLY on exposed non-merged wall ends
      const postBotY = wallBot;
      const postTopY = mUp ? H : wallTop - topH - 0.002;
      const postH = Math.max(0.2, postTopY - postBotY);
      const postCy = (postBotY + postTopY) * 0.5;
      if (!mLeft) {
        const post = new THREE.Mesh(
          this.track(applyContinuousBoxUVs(new THREE.BoxGeometry(postW, postH, postD), -postCenterX, postCy, 0)),
          pal.frame,
        );
        post.position.set(-postCenterX, postCy, 0);
        visualGroup.add(post);
      }
      if (!mRight) {
        const post = new THREE.Mesh(
          this.track(applyContinuousBoxUVs(new THREE.BoxGeometry(postW, postH, postD), postCenterX, postCy, 0)),
          pal.frame,
        );
        post.position.set(postCenterX, postCy, 0);
        visualGroup.add(post);
      }

      if (!mDown) {
        const baseboard = new THREE.Mesh(
          this.track(applyContinuousBoxUVs(new THREE.BoxGeometry(innerWallW, baseH, baseD), innerWallCx, wallBot + baseH * 0.5, 0)),
          pal.base,
        );
        baseboard.position.set(innerWallCx, wallBot + baseH * 0.5, 0);
        visualGroup.add(baseboard);
      }

      if (!mUp) {
        const topBeam = new THREE.Mesh(
          this.track(applyContinuousBoxUVs(new THREE.BoxGeometry(wallExtW, topH, topD), wallExtCx, wallTop - topH * 0.5, 0)),
          pal.frame,
        );
        topBeam.position.set(wallExtCx, wallTop - topH * 0.5, 0);
        visualGroup.add(topBeam);
      }

      // Crystal-clear transparent see-through glass pane (outside landscape & monsters clearly visible!)
      const clearGlassMat = this.createClearGlassMaterial();
      const glass = new THREE.Mesh(
        this.track(new THREE.PlaneGeometry(winHalfW * 2 - 0.06, winH - 0.06)),
        clearGlassMat,
      );
      glass.position.y = winCenterY;
      glass.renderOrder = 3;
      visualGroup.add(glass);

      // Subtle reflective outer sash trim + protruding sill + slim architectural muntins
      const sill = new THREE.Mesh(
        this.track(new THREE.BoxGeometry(winHalfW * 2 + 0.18, 0.11, coreD + 0.14)),
        pal.frame,
      );
      sill.position.y = winBot - 0.02;
      visualGroup.add(sill);

      const winHead = new THREE.Mesh(
        this.track(new THREE.BoxGeometry(winHalfW * 2 + 0.14, 0.1, coreD + 0.1)),
        pal.frame,
      );
      winHead.position.y = winTop + 0.02;
      visualGroup.add(winHead);

      for (const sx of [-winHalfW, winHalfW]) {
        const st = new THREE.Mesh(
          this.track(new THREE.BoxGeometry(0.085, winH, coreD + 0.085)),
          pal.frame,
        );
        st.position.set(sx, winCenterY, 0);
        visualGroup.add(st);
      }

      const muntinV = new THREE.Mesh(
        this.track(new THREE.BoxGeometry(0.042, winH - 0.04, 0.08)),
        pal.frame,
      );
      muntinV.position.y = winCenterY;
      visualGroup.add(muntinV);

      const muntinH = new THREE.Mesh(
        this.track(new THREE.BoxGeometry(winHalfW * 2 - 0.06, 0.042, 0.074)),
        pal.frame,
      );
      muntinH.position.y = winCenterY + 0.12;
      visualGroup.add(muntinH);

      return {
        visualGroup,
        fixtureGlowMats,
        bounds: {
          size: new THREE.Vector3(S + 0.08, H + 0.06, 0.36),
          center: new THREE.Vector3(0, wallMidY, 0),
        },
      };
    }

    // ---------------- CEILING TILE (Seamless Auto-Merge across same material & color) ----------------
    if (kind === 'ceiling') {
      const mN = !!neighbors.n;
      const mS = !!neighbors.s;
      const mW = !!neighbors.w;
      const mE = !!neighbors.e;
      const borderT = 0.17;

      const extMinX = mW ? -half : -halfW;
      const extMaxX = mE ? half : halfW;
      const extSpanX = extMaxX - extMinX;
      const extCx = (extMinX + extMaxX) * 0.5;

      // Perimeter cornice ONLY on exposed (unmerged) edges
      if (!mN) {
        const bz = -halfW + borderT * 0.5;
        const trim = new THREE.Mesh(
          this.track(applyContinuousBoxUVs(new THREE.BoxGeometry(extSpanX, 0.2, borderT), extCx, -0.104, bz)),
          pal.frame,
        );
        trim.position.set(extCx, -0.104, bz);
        visualGroup.add(trim);
      }
      if (!mS) {
        const bz = halfW - borderT * 0.5;
        const trim = new THREE.Mesh(
          this.track(applyContinuousBoxUVs(new THREE.BoxGeometry(extSpanX, 0.2, borderT), extCx, -0.104, bz)),
          pal.frame,
        );
        trim.position.set(extCx, -0.104, bz);
        visualGroup.add(trim);
      }

      const sideMinZ = mN ? -half : -halfW + borderT + 0.002;
      const sideMaxZ = mS ? half : halfW - borderT - 0.002;
      const sideSpanZ = Math.max(0.1, sideMaxZ - sideMinZ);
      const sideCz = (sideMinZ + sideMaxZ) * 0.5;

      if (!mW) {
        const bx = -halfW + borderT * 0.5;
        const trim = new THREE.Mesh(
          this.track(applyContinuousBoxUVs(new THREE.BoxGeometry(borderT, 0.196, sideSpanZ), bx, -0.104, sideCz)),
          pal.frame,
        );
        trim.position.set(bx, -0.104, sideCz);
        visualGroup.add(trim);
      }
      if (!mE) {
        const bx = halfW - borderT * 0.5;
        const trim = new THREE.Mesh(
          this.track(applyContinuousBoxUVs(new THREE.BoxGeometry(borderT, 0.196, sideSpanZ), bx, -0.104, sideCz)),
          pal.frame,
        );
        trim.position.set(bx, -0.104, sideCz);
        visualGroup.add(trim);
      }

      // Continuous ceiling deck flush to ±half on merged edges
      const deckMinX = mW ? -half : -halfW + borderT + 0.002;
      const deckMaxX = mE ? half : halfW - borderT - 0.002;
      const deckMinZ = mN ? -half : -halfW + borderT + 0.002;
      const deckMaxZ = mS ? half : halfW - borderT - 0.002;
      const deckW = Math.max(0.2, deckMaxX - deckMinX);
      const deckD = Math.max(0.2, deckMaxZ - deckMinZ);
      const deckCx = (deckMinX + deckMaxX) * 0.5;
      const deckCz = (deckMinZ + deckMaxZ) * 0.5;

      const deck = new THREE.Mesh(
        this.track(applyContinuousBoxUVs(new THREE.BoxGeometry(deckW, 0.19, deckD), deckCx, -0.1, deckCz)),
        pal.floor,
      );
      deck.position.set(deckCx, -0.1, deckCz);
      visualGroup.add(deck);

      // Continuous structural rafters running cleanly across merged ceilings
      for (const sx of [-0.88, 0, 0.88]) {
        const rafter = new THREE.Mesh(
          this.track(new THREE.BoxGeometry(0.125, 0.11, deckD)),
          pal.frame,
        );
        rafter.position.set(sx, -0.252, deckCz);
        visualGroup.add(rafter);
      }

      // Architectural center medallion boss underneath center rafter
      const boss = new THREE.Mesh(
        this.track(new THREE.CylinderGeometry(0.14, 0.18, 0.042, 8)),
        pal.accent,
      );
      boss.position.y = -0.328;
      visualGroup.add(boss);

      return {
        visualGroup,
        fixtureGlowMats,
        bounds: {
          size: new THREE.Vector3(S + 0.06, 0.34, S + 0.06),
          center: new THREE.Vector3(0, -0.15, 0),
        },
      };
    }

    // ---------------- WIDE FLAT ROOF / CEILING TERRACE (평면 천장 지붕 · 삼각 박공 없는 광폭 평면 구조) ----------------
    if (kind === 'flat_roof') {
      const mN = !!neighbors.n;
      const mS = !!neighbors.s;
      const mW = !!neighbors.w;
      const mE = !!neighbors.e;
      const parapetT = 0.18;

      const extMinX = mW ? -half : -halfW;
      const extMaxX = mE ? half : halfW;
      const extSpanX = extMaxX - extMinX;
      const extCx = (extMinX + extMaxX) * 0.5;

      const deckMinZ = mN ? -half : -halfW;
      const deckMaxZ = mS ? half : halfW;
      const deckSpanZ = deckMaxZ - deckMinZ;
      const deckCz = (deckMinZ + deckMaxZ) * 0.5;

      // Wide seamless flat architectural ceiling + rooftop deck slab (zero triangular gable!)
      const flatSlab = new THREE.Mesh(
        this.track(applyContinuousBoxUVs(new THREE.BoxGeometry(extSpanX, 0.22, deckSpanZ), extCx, -0.09, deckCz)),
        pal.roof,
      );
      flatSlab.position.set(extCx, -0.09, deckCz);
      visualGroup.add(flatSlab);

      // Clean bright underside ceiling finish panel so wide interiors feel open & lofty
      const underside = new THREE.Mesh(
        this.track(applyContinuousBoxUVs(new THREE.BoxGeometry(extSpanX - 0.004, 0.05, deckSpanZ - 0.004), extCx, -0.226, deckCz)),
        pal.primary,
      );
      underside.position.set(extCx, -0.226, deckCz);
      visualGroup.add(underside);

      // Sleek perimeter cornice & low rooftop parapet coping ONLY on outer unmerged edges
      if (!mN) {
        const coping = new THREE.Mesh(
          this.track(applyContinuousBoxUVs(new THREE.BoxGeometry(extSpanX, 0.24, parapetT), extCx, 0.13, -halfW + parapetT * 0.5)),
          pal.frame,
        );
        coping.position.set(extCx, 0.13, -halfW + parapetT * 0.5);
        visualGroup.add(coping);
      }
      if (!mS) {
        const coping = new THREE.Mesh(
          this.track(applyContinuousBoxUVs(new THREE.BoxGeometry(extSpanX, 0.24, parapetT), extCx, 0.13, halfW - parapetT * 0.5)),
          pal.frame,
        );
        coping.position.set(extCx, 0.13, halfW - parapetT * 0.5);
        visualGroup.add(coping);
      }
      const sideMinZ = mN ? -half : -halfW + parapetT + 0.002;
      const sideMaxZ = mS ? half : halfW - parapetT - 0.002;
      const sideSpanZ = Math.max(0.1, sideMaxZ - sideMinZ);
      const sideCz = (sideMinZ + sideMaxZ) * 0.5;
      if (!mW) {
        const coping = new THREE.Mesh(
          this.track(applyContinuousBoxUVs(new THREE.BoxGeometry(parapetT, 0.236, sideSpanZ), -halfW + parapetT * 0.5, 0.13, sideCz)),
          pal.frame,
        );
        coping.position.set(-halfW + parapetT * 0.5, 0.13, sideCz);
        visualGroup.add(coping);
      }
      if (!mE) {
        const coping = new THREE.Mesh(
          this.track(applyContinuousBoxUVs(new THREE.BoxGeometry(parapetT, 0.236, sideSpanZ), halfW - parapetT * 0.5, 0.13, sideCz)),
          pal.frame,
        );
        coping.position.set(halfW - parapetT * 0.5, 0.13, sideCz);
        visualGroup.add(coping);
      }

      // Corner brass finials ONLY on outer unmerged roof corners
      const outerCorners: Array<[number, number, boolean]> = [
        [-halfW + 0.11, -halfW + 0.11, !mN && !mW],
        [halfW - 0.11, -halfW + 0.11, !mN && !mE],
        [-halfW + 0.11, halfW - 0.11, !mS && !mW],
        [halfW - 0.11, halfW - 0.11, !mS && !mE],
      ];
      for (const [cx, cz, show] of outerCorners) {
        if (!show) continue;
        const cap = new THREE.Mesh(
          this.track(new THREE.BoxGeometry(0.22, 0.07, 0.22)),
          pal.accent,
        );
        cap.position.set(cx, 0.285, cz);
        visualGroup.add(cap);
      }

      return {
        visualGroup,
        fixtureGlowMats,
        bounds: {
          size: new THREE.Vector3(S + 0.06, 0.54, S + 0.06),
          center: new THREE.Vector3(0, 0.0, 0),
        },
      };
    }

    // ---------------- PITCHED ROOF TILE (Seamless horizontal auto-merge) ----------------
    if (kind === 'roof') {
      const ridgeH = 1.55;
      const eaveOverhang = 0.2;
      const roofMinX = mLeft ? -half : -halfW;
      const roofMaxX = mRight ? half : halfW;
      const roofW = roofMaxX - roofMinX;
      const roofCx = (roofMinX + roofMaxX) * 0.5;

      // Extruded triangular gable core spans flush across merged roofs (closed ends only on outer gables)
      const sideShape = new THREE.Shape();
      sideShape.moveTo(-half + 0.02, 0.004);
      sideShape.lineTo(half - 0.02, 0.004);
      sideShape.lineTo(-half + 0.02, ridgeH - 0.07);
      sideShape.closePath();

      const gMinX = mLeft ? -half : -halfW + 0.05;
      const gMaxX = mRight ? half : halfW - 0.05;
      const gableDepth = Math.max(0.2, gMaxX - gMinX);
      const gCx = (gMinX + gMaxX) * 0.5;
      const gableGeo = this.track(
        new THREE.ExtrudeGeometry(sideShape, {
          depth: gableDepth,
          bevelEnabled: false,
        }),
      );
      gableGeo.rotateY(Math.PI / 2);
      gableGeo.translate(-gableDepth * 0.5, 0, 0);
      gableGeo.rotateY(Math.PI);
      gableGeo.translate(gCx, 0, 0);
      const gableMesh = new THREE.Mesh(gableGeo, pal.primary);
      visualGroup.add(gableMesh);

      // Sloped shingle roof slab spans seamlessly across merged same-orientation roof tiles
      const slopeLen = Math.hypot(S + eaveOverhang, ridgeH);
      const slopeAngle = Math.atan2(ridgeH, S);
      const roofSlab = new THREE.Mesh(
        this.track(applyContinuousBoxUVs(new THREE.BoxGeometry(roofW, 0.15, slopeLen), roofCx, 0, 0)),
        pal.roof,
      );
      roofSlab.position.set(roofCx, ridgeH * 0.5 + 0.06, eaveOverhang * 0.34);
      roofSlab.rotation.x = slopeAngle;
      visualGroup.add(roofSlab);

      // Continuous shingle course battens
      for (let i = 0; i < 4; i++) {
        const t = (i + 0.5) / 4;
        const rz = -half + t * S;
        const ry = ridgeH * (1 - t) + 0.155;
        const batten = new THREE.Mesh(
          this.track(new THREE.BoxGeometry(roofW, 0.055, 0.14)),
          pal.frame,
        );
        batten.position.set(roofCx, ry, rz);
        batten.rotation.x = slopeAngle;
        visualGroup.add(batten);
      }

      // Continuous ridge crest beam & fascia eave beam
      const ridgeBeam = new THREE.Mesh(
        this.track(applyContinuousBoxUVs(new THREE.BoxGeometry(roofW, 0.2, 0.22), roofCx, ridgeH + 0.1, 0)),
        pal.frame,
      );
      ridgeBeam.position.set(roofCx, ridgeH + 0.1, -half + 0.02);
      visualGroup.add(ridgeBeam);

      const eaveBeam = new THREE.Mesh(
        this.track(applyContinuousBoxUVs(new THREE.BoxGeometry(roofW, 0.14, 0.16), roofCx, -0.025, 0)),
        pal.frame,
      );
      eaveBeam.position.set(roofCx, -0.025, half + eaveOverhang * 0.7);
      visualGroup.add(eaveBeam);

      return {
        visualGroup,
        fixtureGlowMats,
        bounds: {
          size: new THREE.Vector3(S + 0.06, ridgeH + 0.28, S + 0.26),
          center: new THREE.Vector3(0, ridgeH * 0.52, 0),
        },
      };
    }

    // ---------------- WALL TORCH FIXTURE (벽걸이 횃불) ----------------
    if (kind === 'wall_torch') {
      // Mounted at eye-height y = 1.68 on the +Z face of the parent wall (wall face is at z ≈ 0.11..0.14)
      const mountY = 1.68;
      const wallFaceZ = 0.132;

      // 1. Wrought-iron diamond wall backplate
      const backplate = new THREE.Mesh(
        this.track(new THREE.BoxGeometry(0.18, 0.34, 0.045)),
        this.ironMat,
      );
      backplate.position.set(0, mountY, wallFaceZ + 0.022);
      visualGroup.add(backplate);

      // 2. Top & bottom antique brass mounting rivets
      for (const dy of [-0.12, 0.12]) {
        const rivet = new THREE.Mesh(
          this.track(new THREE.SphereGeometry(0.024, 8, 8)),
          this.brassMat,
        );
        rivet.position.set(0, mountY + dy, wallFaceZ + 0.048);
        visualGroup.add(rivet);
      }

      // 3. Forged angled iron bracket arm + upper ring collar
      const arm = new THREE.Mesh(
        this.track(new THREE.BoxGeometry(0.052, 0.052, 0.24)),
        this.ironMat,
      );
      arm.position.set(0, mountY - 0.04, wallFaceZ + 0.13);
      arm.rotation.x = -0.32;
      visualGroup.add(arm);

      const collar = new THREE.Mesh(
        this.track(new THREE.CylinderGeometry(0.072, 0.065, 0.07, 10)),
        this.brassMat,
      );
      collar.position.set(0, mountY + 0.04, wallFaceZ + 0.23);
      collar.rotation.x = 0.26;
      visualGroup.add(collar);

      // 4. Turned timber torch handle (inherits material & color!)
      const torchPivot = new THREE.Group();
      torchPivot.position.set(0, mountY + 0.04, wallFaceZ + 0.23);
      torchPivot.rotation.x = 0.26;

      const handle = new THREE.Mesh(
        this.track(new THREE.CylinderGeometry(0.044, 0.028, 0.56, 10)),
        pal.frame,
      );
      handle.position.y = 0.03;
      torchPivot.add(handle);

      const pommel = new THREE.Mesh(
        this.track(new THREE.SphereGeometry(0.038, 8, 8)),
        this.brassMat,
      );
      pommel.position.y = -0.26;
      torchPivot.add(pommel);

      // 5. Flared wrought-iron fire brazier cup & cage ribs
      const cup = new THREE.Mesh(
        this.track(new THREE.CylinderGeometry(0.115, 0.056, 0.14, 8)),
        this.ironMat,
      );
      cup.position.y = 0.31;
      torchPivot.add(cup);

      const cupRim = new THREE.Mesh(
        this.track(new THREE.TorusGeometry(0.115, 0.016, 6, 12)),
        this.brassMat,
      );
      cupRim.rotation.x = Math.PI / 2;
      cupRim.position.y = 0.38;
      torchPivot.add(cupRim);

      // 6. Charcoal / glowing ember bed inside cup
      const emberMat = this.createFixtureGlowMaterial(0x3a2c24, 0xff6a1a, 0.78);
      fixtureGlowMats.push(emberMat);
      const embers = new THREE.Mesh(
        this.track(new THREE.DodecahedronGeometry(0.082, 0)),
        emberMat,
      );
      embers.position.y = 0.375;
      embers.scale.set(1.0, 0.65, 1.0);
      torchPivot.add(embers);

      // 7. Animated multi-layered flame group (visible ONLY at dusk/night!)
      const fixtureFlameGroup = new THREE.Group();
      fixtureFlameGroup.position.set(0, 0.41, 0);
      fixtureFlameGroup.visible = false;

      const outerFlameMat = this.createFixtureGlowMaterial(0xff8c24, 0xff6e14, 0.35);
      outerFlameMat.transparent = true;
      outerFlameMat.opacity = 0.92;
      fixtureGlowMats.push(outerFlameMat);

      const outerFlame = new THREE.Mesh(
        this.track(new THREE.ConeGeometry(0.088, 0.29, 8)),
        outerFlameMat,
      );
      outerFlame.position.y = 0.13;
      fixtureFlameGroup.add(outerFlame);

      const innerFlameMat = this.createFixtureGlowMaterial(0xfff3b0, 0xffd56b, 0.2);
      fixtureGlowMats.push(innerFlameMat);

      const innerFlame = new THREE.Mesh(
        this.track(new THREE.ConeGeometry(0.048, 0.18, 7)),
        innerFlameMat,
      );
      innerFlame.position.y = 0.095;
      fixtureFlameGroup.add(innerFlame);

      torchPivot.add(fixtureFlameGroup);

      // 8. Soft additive warm halo orb (visible ONLY at dusk/night, fog: false safe)
      const haloMat = this.track(
        new THREE.MeshBasicMaterial({
          color: 0xffa644,
          transparent: true,
          opacity: 0.0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          fog: false,
        }),
      );
      const fixtureHaloMesh = new THREE.Mesh(
        this.track(new THREE.SphereGeometry(0.24, 12, 10)),
        haloMat,
      );
      fixtureHaloMesh.position.set(0, 0.54, 0);
      fixtureHaloMesh.visible = false;
      fixtureHaloMesh.raycast = () => {};
      torchPivot.add(fixtureHaloMesh);

      visualGroup.add(torchPivot);

      return {
        visualGroup,
        fixtureLightPos: new THREE.Vector3(0, mountY + 0.58, wallFaceZ + 0.52),
        fixtureFlameGroup,
        fixtureGlowMats,
        fixtureHaloMesh,
        bounds: {
          size: new THREE.Vector3(0.42, 0.88, 0.58),
          center: new THREE.Vector3(0, mountY + 0.22, wallFaceZ + 0.26),
        },
      };
    }

    // ---------------- CEILING CHANDELIER LIGHT (천장 조명) ----------------
    if (kind === 'ceiling_light') {
      // Hangs from ceiling underside (y = -0.18) down to y = -0.82 (ample headroom above 1.6m player!)
      const ceilingAttachY = -0.18;

      // 1. Ornate ceiling rosette canopy
      const canopy = new THREE.Mesh(
        this.track(new THREE.CylinderGeometry(0.22, 0.15, 0.08, 10)),
        pal.accent,
      );
      canopy.position.y = ceilingAttachY - 0.04;
      visualGroup.add(canopy);

      // 2. Forged iron suspension drop rod & decorative ring
      const rod = new THREE.Mesh(
        this.track(new THREE.CylinderGeometry(0.024, 0.024, 0.36, 8)),
        this.ironMat,
      );
      rod.position.y = ceilingAttachY - 0.24;
      visualGroup.add(rod);

      const hubY = ceilingAttachY - 0.44;
      const hub = new THREE.Mesh(
        this.track(new THREE.CylinderGeometry(0.11, 0.14, 0.12, 8)),
        this.brassMat,
      );
      hub.position.y = hubY;
      visualGroup.add(hub);

      // 3. Wrought-iron hexagonal chandelier crown ring
      const ring = new THREE.Mesh(
        this.track(new THREE.TorusGeometry(0.42, 0.026, 8, 18)),
        this.ironMat,
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = hubY - 0.05;
      visualGroup.add(ring);

      // 4. Central frosted glass pendant lantern core (unlit cool frosted glass by day -> warm gold by night!)
      const lanternGlassMat = this.createFixtureGlowMaterial(0xd7e2ea, 0xffd27a, 0.22);
      fixtureGlowMats.push(lanternGlassMat);

      const centerLantern = new THREE.Mesh(
        this.track(new THREE.CylinderGeometry(0.11, 0.085, 0.22, 8)),
        lanternGlassMat,
      );
      centerLantern.position.y = hubY - 0.15;
      visualGroup.add(centerLantern);

      const bottomFinial = new THREE.Mesh(
        this.track(new THREE.ConeGeometry(0.09, 0.1, 8)),
        this.brassMat,
      );
      bottomFinial.rotation.x = Math.PI;
      bottomFinial.position.y = hubY - 0.3;
      visualGroup.add(bottomFinial);

      // 5. 4 Radial scrolled chandelier arms + brass saucers + luminous candle globes
      const globeMat = this.createFixtureGlowMaterial(0xeae6dc, 0xffda86, 0.2);
      fixtureGlowMats.push(globeMat);

      for (let i = 0; i < 4; i++) {
        const ang = (i * Math.PI) / 2 + Math.PI / 4;
        const dx = Math.cos(ang);
        const dz = Math.sin(ang);

        const spoke = new THREE.Mesh(
          this.track(new THREE.BoxGeometry(0.42, 0.026, 0.026)),
          this.ironMat,
        );
        spoke.position.set(dx * 0.22, hubY - 0.04, dz * 0.22);
        spoke.rotation.y = -ang;
        visualGroup.add(spoke);

        const saucer = new THREE.Mesh(
          this.track(new THREE.CylinderGeometry(0.072, 0.045, 0.03, 8)),
          this.brassMat,
        );
        saucer.position.set(dx * 0.42, hubY - 0.02, dz * 0.42);
        visualGroup.add(saucer);

        const candleStick = new THREE.Mesh(
          this.track(new THREE.CylinderGeometry(0.024, 0.028, 0.08, 8)),
          pal.primary,
        );
        candleStick.position.set(dx * 0.42, hubY + 0.03, dz * 0.42);
        visualGroup.add(candleStick);

        const globe = new THREE.Mesh(
          this.track(new THREE.SphereGeometry(0.056, 10, 8)),
          globeMat,
        );
        globe.position.set(dx * 0.42, hubY + 0.095, dz * 0.42);
        visualGroup.add(globe);
      }

      // 6. Soft additive warm halo around chandelier (visible ONLY at dusk/night)
      const haloMat = this.track(
        new THREE.MeshBasicMaterial({
          color: 0xffd98a,
          transparent: true,
          opacity: 0.0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          fog: false,
        }),
      );
      const fixtureHaloMesh = new THREE.Mesh(
        this.track(new THREE.SphereGeometry(0.48, 14, 12)),
        haloMat,
      );
      fixtureHaloMesh.position.set(0, hubY - 0.08, 0);
      fixtureHaloMesh.visible = false;
      fixtureHaloMesh.raycast = () => {};
      visualGroup.add(fixtureHaloMesh);

      return {
        visualGroup,
        fixtureLightPos: new THREE.Vector3(0, hubY - 0.32, 0),
        fixtureGlowMats,
        fixtureHaloMesh,
        bounds: {
          size: new THREE.Vector3(1.06, 0.86, 1.06),
          center: new THREE.Vector3(0, ceilingAttachY - 0.42, 0),
        },
      };
    }

    // ---------------- INTERIOR FURNITURE: BED (침대) ----------------
    if (kind === 'bed') {
      const colorSpec = HOUSING_COLORS.find((c) => c.id === color) ?? HOUSING_COLORS[0];
      const blanketHex = color === 'natural' ? 0xb54b3c : colorSpec.tintHex;
      const blanketMat = this.track(
        new THREE.MeshStandardMaterial({ color: blanketHex, roughness: 0.82, metalness: 0.02 }),
      );
      const linenMat = this.track(
        new THREE.MeshStandardMaterial({ color: 0xf4ede0, roughness: 0.86, metalness: 0.01 }),
      );

      // Bed frame & corner posts
      const frame = new THREE.Mesh(this.track(new THREE.BoxGeometry(1.42, 0.24, 2.22)), pal.frame);
      frame.position.set(0, 0.34, 0);
      visualGroup.add(frame);

      for (const sx of [-0.66, 0.66]) {
        for (const sz of [-1.06, 1.06]) {
          const postH = sz < 0 ? 1.08 : 0.64;
          const post = new THREE.Mesh(this.track(new THREE.BoxGeometry(0.11, postH, 0.11)), pal.frame);
          post.position.set(sx, postH * 0.5, sz);
          visualGroup.add(post);
        }
      }
      const headboard = new THREE.Mesh(this.track(new THREE.BoxGeometry(1.36, 0.64, 0.08)), pal.floor);
      headboard.position.set(0, 0.72, -1.06);
      visualGroup.add(headboard);
      const footboard = new THREE.Mesh(this.track(new THREE.BoxGeometry(1.36, 0.28, 0.08)), pal.floor);
      footboard.position.set(0, 0.48, 1.06);
      visualGroup.add(footboard);

      // Mattress, folded colored quilt & twin pillows
      const mattress = new THREE.Mesh(this.track(new THREE.BoxGeometry(1.28, 0.22, 2.04)), linenMat);
      mattress.position.set(0, 0.54, 0);
      visualGroup.add(mattress);

      const blanket = new THREE.Mesh(this.track(new THREE.BoxGeometry(1.32, 0.2, 1.38)), blanketMat);
      blanket.position.set(0, 0.58, 0.32);
      visualGroup.add(blanket);

      for (const px of [-0.32, 0.32]) {
        const pillow = new THREE.Mesh(this.track(new THREE.BoxGeometry(0.5, 0.15, 0.36)), linenMat);
        pillow.position.set(px, 0.71, -0.72);
        pillow.rotation.x = 0.14;
        visualGroup.add(pillow);
      }

      return {
        visualGroup,
        fixtureGlowMats,
        bounds: {
          size: new THREE.Vector3(1.5, 1.12, 2.3),
          center: new THREE.Vector3(0, 0.56, 0),
        },
      };
    }

    // ---------------- INTERIOR FURNITURE: CHAIR (의자) ----------------
    if (kind === 'chair') {
      const colorSpec = HOUSING_COLORS.find((c) => c.id === color) ?? HOUSING_COLORS[0];
      const cushionHex = color === 'natural' ? 0x8f4e36 : colorSpec.tintHex;
      const cushionMat = this.track(
        new THREE.MeshStandardMaterial({ color: cushionHex, roughness: 0.82, metalness: 0.02 }),
      );

      for (const sx of [-0.26, 0.26]) {
        for (const sz of [-0.26, 0.26]) {
          const isBack = sz < 0;
          const legH = isBack ? 1.08 : 0.48;
          const leg = new THREE.Mesh(this.track(new THREE.BoxGeometry(0.07, legH, 0.07)), pal.frame);
          leg.position.set(sx, legH * 0.5, sz);
          visualGroup.add(leg);
        }
      }
      const seat = new THREE.Mesh(this.track(new THREE.BoxGeometry(0.62, 0.07, 0.62)), pal.floor);
      seat.position.set(0, 0.48, 0);
      visualGroup.add(seat);

      const cushion = new THREE.Mesh(this.track(new THREE.BoxGeometry(0.54, 0.08, 0.54)), cushionMat);
      cushion.position.set(0, 0.54, 0.01);
      visualGroup.add(cushion);

      const topRail = new THREE.Mesh(this.track(new THREE.BoxGeometry(0.58, 0.12, 0.06)), pal.frame);
      topRail.position.set(0, 1.02, -0.26);
      visualGroup.add(topRail);
      for (const bx of [-0.14, 0, 0.14]) {
        const slat = new THREE.Mesh(this.track(new THREE.BoxGeometry(0.06, 0.44, 0.04)), pal.floor);
        slat.position.set(bx, 0.76, -0.26);
        visualGroup.add(slat);
      }

      return {
        visualGroup,
        fixtureGlowMats,
        bounds: {
          size: new THREE.Vector3(0.68, 1.12, 0.68),
          center: new THREE.Vector3(0, 0.56, 0),
        },
      };
    }

    // ---------------- INTERIOR FURNITURE: TABLE (테이블) ----------------
    if (kind === 'table') {
      const colorSpec = HOUSING_COLORS.find((c) => c.id === color) ?? HOUSING_COLORS[0];
      const runnerHex = color === 'natural' ? 0x6f9473 : colorSpec.tintHex;
      const runnerMat = this.track(
        new THREE.MeshStandardMaterial({ color: runnerHex, roughness: 0.84, metalness: 0.02 }),
      );
      const brassMat = this.track(
        new THREE.MeshStandardMaterial({ color: 0xd4a448, roughness: 0.32, metalness: 0.78 }),
      );
      const ceramicMat = this.track(
        new THREE.MeshStandardMaterial({ color: 0xf1ebe0, roughness: 0.35, metalness: 0.05 }),
      );

      const top = new THREE.Mesh(this.track(new THREE.BoxGeometry(1.76, 0.1, 1.06)), pal.floor);
      top.position.set(0, 0.82, 0);
      visualGroup.add(top);

      const apron = new THREE.Mesh(this.track(new THREE.BoxGeometry(1.56, 0.12, 0.86)), pal.frame);
      apron.position.set(0, 0.72, 0);
      visualGroup.add(apron);

      for (const sx of [-0.74, 0.74]) {
        for (const sz of [-0.4, 0.4]) {
          const leg = new THREE.Mesh(this.track(new THREE.BoxGeometry(0.1, 0.76, 0.1)), pal.frame);
          leg.position.set(sx, 0.38, sz);
          visualGroup.add(leg);
        }
      }

      const runner = new THREE.Mesh(this.track(new THREE.BoxGeometry(1.78, 0.015, 0.34)), runnerMat);
      runner.position.set(0, 0.878, 0);
      visualGroup.add(runner);

      // Tabletop cozy props (brass candle stand & ceramic mug)
      const candleBase = new THREE.Mesh(this.track(new THREE.CylinderGeometry(0.08, 0.1, 0.05, 10)), brassMat);
      candleBase.position.set(-0.22, 0.905, -0.02);
      visualGroup.add(candleBase);
      const candle = new THREE.Mesh(this.track(new THREE.CylinderGeometry(0.04, 0.045, 0.22, 10)), ceramicMat);
      candle.position.set(-0.22, 1.03, -0.02);
      visualGroup.add(candle);
      const mug = new THREE.Mesh(this.track(new THREE.CylinderGeometry(0.06, 0.055, 0.13, 10)), ceramicMat);
      mug.position.set(0.32, 0.94, 0.16);
      visualGroup.add(mug);

      return {
        visualGroup,
        fixtureGlowMats,
        bounds: {
          size: new THREE.Vector3(1.84, 1.14, 1.12),
          center: new THREE.Vector3(0, 0.57, 0),
        },
      };
    }

    // ---------------- INTERIOR FURNITURE: CABINET (수납장) ----------------
    if (kind === 'cabinet') {
      const brassMat = this.track(
        new THREE.MeshStandardMaterial({ color: 0xd8a94c, roughness: 0.3, metalness: 0.82 }),
      );
      const accentMat = this.track(
        new THREE.MeshStandardMaterial({
          color: color === 'natural' ? 0x6b4528 : (HOUSING_COLORS.find((c) => c.id === color)?.tintHex ?? 0x6b4528),
          roughness: 0.72,
          metalness: 0.06,
        }),
      );

      // Plinth, body, crown molding
      const plinth = new THREE.Mesh(this.track(new THREE.BoxGeometry(1.38, 0.14, 0.66)), pal.frame);
      plinth.position.set(0, 0.07, 0);
      visualGroup.add(plinth);

      const body = new THREE.Mesh(this.track(new THREE.BoxGeometry(1.32, 1.66, 0.6)), pal.floor);
      body.position.set(0, 0.96, 0);
      visualGroup.add(body);

      const crown = new THREE.Mesh(this.track(new THREE.BoxGeometry(1.46, 0.12, 0.72)), pal.frame);
      crown.position.set(0, 1.84, 0);
      visualGroup.add(crown);

      // Twin recessed cabinet doors & brass pulls
      for (const side of [-1, 1] as const) {
        const doorPanel = new THREE.Mesh(this.track(new THREE.BoxGeometry(0.56, 1.38, 0.05)), accentMat);
        doorPanel.position.set(side * 0.31, 0.98, 0.31);
        visualGroup.add(doorPanel);

        const handle = new THREE.Mesh(this.track(new THREE.SphereGeometry(0.036, 8, 8)), brassMat);
        handle.position.set(side * 0.09, 1.04, 0.35);
        visualGroup.add(handle);
      }

      return {
        visualGroup,
        fixtureGlowMats,
        bounds: {
          size: new THREE.Vector3(1.5, 1.92, 0.76),
          center: new THREE.Vector3(0, 0.96, 0),
        },
      };
    }

    // ---------------- STAIRS TILE ----------------
    const stepCount = 9;
    const stepH = H / stepCount;
    const stepD = S / stepCount;
    const stairW = S - 0.34;

    for (let i = 0; i < stepCount; i++) {
      const topY = (i + 1) * stepH;
      const cz = half - (i + 0.5) * stepD;
      const tread = new THREE.Mesh(
        this.track(new THREE.BoxGeometry(stairW, stepH * 0.92, stepD - 0.008)),
        pal.floor,
      );
      tread.position.set(0, topY - stepH * 0.52, cz);
      visualGroup.add(tread);

      const nose = new THREE.Mesh(
        this.track(new THREE.BoxGeometry(stairW + 0.02, 0.05, 0.068)),
        pal.frame,
      );
      nose.position.set(0, topY - 0.026, cz + stepD * 0.45);
      visualGroup.add(nose);
    }

    const diagLen = Math.hypot(S - 0.06, H - 0.06);
    const pitch = Math.atan2(H, S);
    for (const sx of [-stairW * 0.5 - 0.075, stairW * 0.5 + 0.075]) {
      const stringer = new THREE.Mesh(
        this.track(new THREE.BoxGeometry(0.13, 0.26, diagLen)),
        pal.frame,
      );
      stringer.position.set(sx, H * 0.5 - 0.14, 0);
      stringer.rotation.x = pitch;
      visualGroup.add(stringer);

      const handrail = new THREE.Mesh(
        this.track(new THREE.BoxGeometry(0.09, 0.09, diagLen + 0.04)),
        pal.frame,
      );
      handrail.position.set(sx, H * 0.5 + 0.78, 0);
      handrail.rotation.x = pitch;
      visualGroup.add(handrail);

      const lowPost = new THREE.Mesh(
        this.track(new THREE.BoxGeometry(0.145, 0.94, 0.145)),
        pal.frame,
      );
      lowPost.position.set(sx, 0.475, half - 0.12);
      visualGroup.add(lowPost);

      const hiPost = new THREE.Mesh(
        this.track(new THREE.BoxGeometry(0.145, 0.94, 0.145)),
        pal.frame,
      );
      hiPost.position.set(sx, H + 0.35, -half + 0.12);
      visualGroup.add(hiPost);
    }

    return {
      visualGroup,
      fixtureGlowMats,
      bounds: {
        size: new THREE.Vector3(S + 0.04, H + 0.38, S + 0.04),
        center: new THREE.Vector3(0, H * 0.5 + 0.15, 0),
      },
    };
  }

  public createPlacedTile(
    id: string,
    kind: HousingKind,
    material: HousingMaterial,
    color: HousingColorId,
    gx: number,
    gz: number,
    level: number,
    edge: HousingEdge | null,
    rotationStep: number,
    baseY: number,
    isDoorOpen = false,
    neighbors: TileNeighborMask = {},
    options?: {
      customRotationY?: number;
      gridSnapped?: boolean;
      freeX?: number;
      freeZ?: number;
      heightOffset?: number;
      durability?: number;
      maxDurability?: number;
      ownerId?: string;
    },
  ): PlacedHousingTile {
    const spec = HOUSING_CATALOG.find((h) => h.kind === kind) || HOUSING_CATALOG[0];
    const gridSnapped = options?.gridSnapped ?? true;
    const heightOffset = options?.heightOffset ?? 0;
    const usesEdge = gridSnapped && (isWallKind(kind) || kind === 'wall_torch');
    const normEdge = usesEdge ? canonicalizeEdge(gx, gz, edge ?? 'n') : null;
    const finalGx = normEdge ? normEdge.gx : gx;
    const finalGz = normEdge ? normEdge.gz : gz;
    const finalEdge = normEdge ? normEdge.edge : null;
    const normRot = ((rotationStep % 4) + 4) % 4;
    const axisTag = finalEdge === 'w' ? 1 : 0;

    const basePose = getTileWorldPose(kind, finalGx, finalGz, level, finalEdge, normRot, baseY);
    const finalX = !gridSnapped && typeof options?.freeX === 'number' ? options.freeX : basePose.x;
    const finalZ = !gridSnapped && typeof options?.freeZ === 'number' ? options.freeZ : basePose.z;
    const finalY = basePose.y + heightOffset;
    const finalRotationY =
      typeof options?.customRotationY === 'number' ? options.customRotationY : basePose.rotationY;

    const group = new THREE.Group();
    group.position.set(finalX, finalY, finalZ);
    group.rotation.y = finalRotationY;

    const windowMat = this.createWindowMaterial();
    const {
      visualGroup,
      porchLightPos,
      doorPivot,
      fixtureLightPos,
      fixtureFlameGroup,
      fixtureGlowMats,
      fixtureHaloMesh,
      bounds,
    } = this.buildTileGeometry(kind, material, color, level, axisTag, windowMat, gridSnapped ? neighbors : {});

    const initialDoorAngle = kind === 'door' && isDoorOpen ? Math.PI * 0.56 : 0;
    if (doorPivot) {
      doorPivot.rotation.y = initialDoorAngle;
    }

    const isFix = isFixtureKind(kind);
    const hitMeshes: THREE.Mesh[] = [];
    visualGroup.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        if (mesh === fixtureHaloMesh) return;
        mesh.castShadow = !isFix;
        mesh.receiveShadow = true;
        mesh.userData = { housingId: id };
        hitMeshes.push(mesh);
      }
    });
    group.add(visualGroup);

    // Crisp glowing wireframe selection outline around exact tile bounds (fog: false safe)
    const boxGeo = this.track(new THREE.BoxGeometry(bounds.size.x, bounds.size.y, bounds.size.z));
    const edgesGeo = this.track(new THREE.EdgesGeometry(boxGeo));
    const selMat = this.track(
      new THREE.LineBasicMaterial({
        color: 0x38f2c8,
        transparent: true,
        opacity: 0.95,
        depthTest: false,
        fog: false,
      }),
    );
    const selectionBox = new THREE.LineSegments(edgesGeo, selMat);
    selectionBox.position.copy(bounds.center);
    selectionBox.visible = false;
    selectionBox.renderOrder = 10;
    selectionBox.raycast = () => {};
    group.add(selectionBox);

    let porchLight: THREE.PointLight | undefined;
    if (porchLightPos) {
      porchLight = new THREE.PointLight(0xffb85c, 0, 9.0, 1.7);
      porchLight.position.copy(porchLightPos);
      porchLight.visible = false;
      group.add(porchLight);
    }

    let fixtureLight: THREE.PointLight | undefined;
    if (fixtureLightPos) {
      if (kind === 'wall_torch') {
        fixtureLight = new THREE.PointLight(0xff9f42, 0, 13.0, 1.45);
      } else {
        fixtureLight = new THREE.PointLight(0xffe1a6, 0, 16.0, 1.35);
      }
      fixtureLight.position.copy(fixtureLightPos);
      fixtureLight.visible = false;
      group.add(fixtureLight);
    }

    // Per-tile isolated damage/crack tint overlay (never mutates shared palette materials)
    const dmgBoxGeo = this.track(
      new THREE.BoxGeometry(bounds.size.x + 0.03, bounds.size.y + 0.03, bounds.size.z + 0.03),
    );
    const damageOverlayMat = this.track(
      new THREE.MeshBasicMaterial({
        color: 0xff3b30,
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
        fog: false,
      }),
    );
    const damageOverlay = new THREE.Mesh(dmgBoxGeo, damageOverlayMat);
    damageOverlay.position.copy(bounds.center);
    damageOverlay.visible = false;
    damageOverlay.renderOrder = 8;
    damageOverlay.raycast = () => {};
    group.add(damageOverlay);

    const maxDurability =
      typeof options?.maxDurability === 'number' && options.maxDurability > 0
        ? Math.round(options.maxDurability)
        : getHousingPieceMaxDurability(kind, material);
    const durability =
      typeof options?.durability === 'number'
        ? THREE.MathUtils.clamp(Math.round(options.durability), 1, maxDurability)
        : maxDurability;

    const slotKey =
      !gridSnapped || isFurnitureKind(kind)
        ? `free:${id}`
        : getTileSlotKey(kind, finalGx, finalGz, level, finalEdge, normRot, heightOffset);

    const tile: PlacedHousingTile = {
      id,
      kind,
      label: spec.name,
      material,
      color,
      gx: finalGx,
      gz: finalGz,
      level,
      edge: finalEdge,
      rotationStep: normRot,
      gridSnapped,
      heightOffset,
      baseY,
      x: finalX,
      y: finalY,
      z: finalZ,
      rotationY: finalRotationY,
      slotKey,
      neighborSig: neighborMaskToSig(gridSnapped ? neighbors : {}),
      isDoorOpen: kind === 'door' ? isDoorOpen : false,
      doorAngle: initialDoorAngle,
      doorPivot,
      group,
      visualGroup,
      hitMeshes,
      windowMats: [windowMat],
      selectionBox,
      porchLight,
      fixtureLight,
      fixtureFlameGroup,
      fixtureGlowMats,
      fixtureHaloMesh,
      durability,
      maxDurability,
      damageFlashTimer: 0,
      damageOverlay,
      damageOverlayMat,
      ownerId: options?.ownerId,
    };
    updateTileDamageVisual(tile, 0);
    return tile;
  }

  /**
   * Builds a translucent ArcheAge-style hologram preview for a modular tile or lighting fixture.
   */
  public createGhostPreview(kind: HousingKind): HousingGhostRig {
    const group = new THREE.Group();
    const tileContainer = new THREE.Group();
    group.add(tileContainer);

    const localDisposables: Array<{ dispose: () => void }> = [];
    const tempWin = new THREE.MeshStandardMaterial({ color: 0xffffff });
    localDisposables.push(tempWin);

    const { visualGroup, fixtureFlameGroup, fixtureHaloMesh } = this.buildTileGeometry(
      kind,
      'half_timber',
      'natural',
      0,
      0,
      tempWin,
    );
    if (fixtureFlameGroup) fixtureFlameGroup.visible = true;
    if (fixtureHaloMesh) fixtureHaloMesh.visible = false;

    const ghostFillMat = new THREE.MeshBasicMaterial({
      color: 0x38f2c8,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    });
    const ghostWireMat = new THREE.MeshBasicMaterial({
      color: 0xb8fff0,
      transparent: true,
      opacity: 0.34,
      wireframe: true,
      depthWrite: false,
      fog: false,
    });
    localDisposables.push(ghostFillMat, ghostWireMat);

    const meshList: THREE.Mesh[] = [];
    visualGroup.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh && obj !== fixtureHaloMesh) {
        meshList.push(obj as THREE.Mesh);
      }
    });

    for (const m of meshList) {
      m.material = ghostFillMat;
      m.castShadow = false;
      m.receiveShadow = false;
      m.renderOrder = 6;
      m.raycast = () => {};

      const wire = new THREE.Mesh(m.geometry, ghostWireMat);
      wire.position.copy(m.position);
      wire.rotation.copy(m.rotation);
      wire.scale.copy(m.scale).multiplyScalar(1.004);
      wire.castShadow = false;
      wire.receiveShadow = false;
      wire.renderOrder = 7;
      wire.raycast = () => {};
      m.parent?.add(wire);
    }

    tileContainer.add(visualGroup);

    // 3x3 local snap grid lines (in world space, unrotated, positioned at cell center)
    const S = HOUSING_TILE_SIZE;
    const gridVerts: number[] = [];
    const extent = 1.5 * S;
    for (let i = -1; i <= 2; i++) {
      const p = (i - 0.5) * S;
      gridVerts.push(-extent, 0.05, p, extent, 0.05, p);
      gridVerts.push(p, 0.05, -extent, p, 0.05, extent);
    }
    const gridGeo = new THREE.BufferGeometry();
    gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gridVerts, 3));
    const gridMat = new THREE.LineBasicMaterial({
      color: 0x62e5ff,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      fog: false,
    });
    const gridLines = new THREE.LineSegments(gridGeo, gridMat);
    gridLines.visible = !isFixtureKind(kind);
    gridLines.renderOrder = 4;
    gridLines.raycast = () => {};
    group.add(gridLines);

    // Highlighted tile footprint pad
    const isWall = isWallKind(kind);
    const isPillar = kind === 'pillar';
    const isTorch = kind === 'wall_torch';
    const isCeilLight = kind === 'ceiling_light';
    const isFurn = isFurnitureKind(kind);
    const padW =
      isPillar
        ? 0.62
        : isTorch
          ? 0.55
          : isCeilLight
            ? 1.1
            : kind === 'bed'
              ? 1.5
              : kind === 'chair'
                ? 0.72
                : kind === 'table'
                  ? 1.85
                  : kind === 'cabinet'
                    ? 1.5
                    : S;
    const padD =
      isPillar
        ? 0.62
        : isWall || isTorch
          ? 0.42
          : isCeilLight
            ? 1.1
            : kind === 'bed'
              ? 2.3
              : kind === 'chair'
                ? 0.72
                : kind === 'table'
                  ? 1.12
                  : kind === 'cabinet'
                    ? 0.76
                    : S;
    const padGeo = new THREE.PlaneGeometry(padW, padD);
    padGeo.rotateX(-Math.PI / 2);
    const padMat = new THREE.MeshBasicMaterial({
      color: 0x38f2c8,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
      fog: false,
    });
    const footprintFill = new THREE.Mesh(padGeo, padMat);
    footprintFill.position.y = isCeilLight ? -0.22 : isTorch ? 1.65 : 0.04;
    footprintFill.renderOrder = 5;
    footprintFill.raycast = () => {};
    tileContainer.add(footprintFill);

    // Direction arrow (shows roof slope / stairs ascent / doorway & door front / wall torch / furniture front)
    const arrowShape = new THREE.Shape();
    arrowShape.moveTo(0, 0.46);
    arrowShape.lineTo(0.28, 0);
    arrowShape.lineTo(0.11, 0);
    arrowShape.lineTo(0.11, -0.26);
    arrowShape.lineTo(-0.11, -0.26);
    arrowShape.lineTo(-0.11, 0);
    arrowShape.lineTo(-0.28, 0);
    arrowShape.closePath();
    const arrowGeo = new THREE.ShapeGeometry(arrowShape);
    arrowGeo.rotateX(Math.PI / 2);
    const arrowMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
      fog: false,
    });
    const frontArrow = new THREE.Mesh(arrowGeo, arrowMat);
    frontArrow.position.set(
      0,
      isTorch ? 1.7 : 0.09,
      isWall || isTorch ? 0.65 : isFurn ? padD * 0.5 + 0.34 : S * 0.5 + 0.36,
    );
    frontArrow.visible =
      kind === 'roof' ||
      kind === 'stairs' ||
      kind === 'doorway' ||
      kind === 'door' ||
      kind === 'wall_torch' ||
      isFurn;
    frontArrow.renderOrder = 7;
    frontArrow.raycast = () => {};
    tileContainer.add(frontArrow);

    localDisposables.push(gridGeo, gridMat, padGeo, padMat, arrowGeo, arrowMat);

    return {
      kind,
      group,
      tileContainer,
      gridLines,
      ghostMats: [ghostFillMat, ghostWireMat],
      footprintFill,
      frontArrow,
      dispose: () => {
        localDisposables.forEach((d) => d.dispose());
      },
    };
  }

  public setGhostValidity(ghost: HousingGhostRig, isValid: boolean, snapped: boolean, time: number): void {
    const pulse = 0.5 + 0.5 * Math.sin(time * 5.2);
    const mainHex = isValid ? (snapped ? 0x38f2c8 : 0x62e5ff) : 0xff4d6a;
    const wireHex = isValid ? 0xc2fff2 : 0xffb3c1;
    ghost.ghostMats[0].color.setHex(mainHex);
    ghost.ghostMats[0].opacity = (isValid ? 0.36 : 0.44) + pulse * 0.1;
    ghost.ghostMats[1].color.setHex(wireHex);
    ghost.ghostMats[1].opacity = 0.24 + pulse * 0.12;

    const fMat = ghost.footprintFill.material as THREE.MeshBasicMaterial;
    const gMat = ghost.gridLines.material as THREE.LineBasicMaterial;
    const aMat = ghost.frontArrow.material as THREE.MeshBasicMaterial;
    fMat.color.setHex(mainHex);
    fMat.opacity = 0.15 + pulse * 0.07;
    gMat.color.setHex(isValid ? 0x62e5ff : 0xff6b81);
    gMat.opacity = snapped ? 0.45 : 0.28;
    aMat.color.setHex(isValid ? 0xfde047 : 0xff6b81);
  }

  public dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}
