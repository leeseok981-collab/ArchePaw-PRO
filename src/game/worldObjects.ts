import * as THREE from 'three';
import { FoodId, NodeKind, ResourceKind } from './types';
import { ProceduralTexturePack } from './textures';
import { createStylizedWaterMaterial, getTerrainHeight } from './terrain';

export interface WorldResourceNode {
  id: string;
  kind: NodeKind;
  resourceYield?: ResourceKind;
  foodYield?: FoodId;
  yieldAmount: number;
  label: string;
  actionLabel: string;
  tier: number; // 1, 2, or 3
  x: number;
  y: number;
  z: number;
  radius: number; // collision radius
  interactRadius: number;
  hp: number;
  maxHp: number;
  isDepleted: boolean;
  regrowTimer: number;
  regrowDuration: number;
  isSapling?: boolean;
  suppressedByHousing?: boolean;
  group: THREE.Group;
  activeVisual: THREE.Group;
  stumpVisual?: THREE.Group;
  saplingVisual?: THREE.Group;
  shakeTimer: number;
  hitFlashTimer: number;
  fallProgress: number; // 0..1 when freshly felled
  fallDirAngle: number;
  hitMeshes: THREE.Mesh[];
  outlineGroup?: THREE.Group;
  outlineMaterial?: THREE.ShaderMaterial;
  groundHalo?: THREE.Mesh;
  outlineStrength: number;
}

export interface WorldLandmark {
  id: string;
  kind: 'workbench' | 'frontier_stone' | 'signpost' | 'trial_tower';
  label: string;
  actionLabel: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  interactRadius: number;
  group: THREE.Group;
  animatedPart?: THREE.Object3D;
  light?: THREE.PointLight;
}

export interface ParticlePool {
  group: THREE.Group;
  spawnBurst: (x: number, y: number, z: number, colorHex: number, count: number, speed?: number) => void;
  spawnRing: (x: number, y: number, z: number, colorHex: number, maxRadius: number) => void;
  update: (dt: number) => void;
  dispose: () => void;
}

/**
 * Shared procedural material & geometry bank for world resources so draw calls and memory stay lean.
 */
export class WorldAssetLibrary {
  public readonly barkMat: THREE.MeshStandardMaterial;
  public readonly birchBarkMat: THREE.MeshStandardMaterial;
  public readonly stumpCapMat: THREE.MeshStandardMaterial;
  public readonly oakFoliageMats: THREE.MeshStandardMaterial[];
  public readonly pineFoliageMat: THREE.MeshStandardMaterial;
  public readonly birchFoliageMats: THREE.MeshStandardMaterial[];
  public readonly rockMat: THREE.MeshStandardMaterial;
  public readonly mossMat: THREE.MeshStandardMaterial;
  public readonly ironMat: THREE.MeshStandardMaterial;
  public readonly crystalMat: THREE.MeshStandardMaterial;
  public readonly woodPlankMat: THREE.MeshStandardMaterial;
  public readonly metalDarkMat: THREE.MeshStandardMaterial;
  public readonly runeStoneMat: THREE.MeshStandardMaterial;
  public readonly contactShadowMat: THREE.MeshBasicMaterial;
  public readonly shadowPlaneGeo: THREE.PlaneGeometry;

  private extraDisposables: Array<{ dispose: () => void }> = [];

  constructor(textures: ProceduralTexturePack) {
    this.barkMat = new THREE.MeshStandardMaterial({
      map: textures.treeBark,
      color: 0x7c593e,
      roughness: 0.92,
      metalness: 0.02,
    });
    this.birchBarkMat = new THREE.MeshStandardMaterial({
      map: textures.birchBark,
      color: 0xe6dfd3,
      roughness: 0.82,
      metalness: 0.02,
    });
    this.stumpCapMat = new THREE.MeshStandardMaterial({
      color: 0xcfa470,
      roughness: 0.85,
      metalness: 0.0,
    });
    this.oakFoliageMats = [
      new THREE.MeshStandardMaterial({ color: 0x45853d, roughness: 0.86, metalness: 0.02 }),
      new THREE.MeshStandardMaterial({ color: 0x579c43, roughness: 0.84, metalness: 0.02 }),
      new THREE.MeshStandardMaterial({ color: 0x3b7236, roughness: 0.88, metalness: 0.02 }),
    ];
    this.pineFoliageMat = new THREE.MeshStandardMaterial({
      color: 0x2c6142,
      roughness: 0.88,
      metalness: 0.02,
    });
    this.birchFoliageMats = [
      new THREE.MeshStandardMaterial({ color: 0xe2a832, roughness: 0.78, metalness: 0.04 }),
      new THREE.MeshStandardMaterial({ color: 0xd9862b, roughness: 0.82, metalness: 0.04 }),
    ];
    this.rockMat = new THREE.MeshStandardMaterial({
      map: textures.graniteRock,
      color: 0x91979c,
      roughness: 0.86,
      metalness: 0.06,
      flatShading: true,
    });
    this.mossMat = new THREE.MeshStandardMaterial({
      color: 0x5c8a45,
      roughness: 0.94,
      metalness: 0.0,
    });
    this.ironMat = new THREE.MeshStandardMaterial({
      color: 0xb8c2cc,
      roughness: 0.26,
      metalness: 0.88,
      flatShading: true,
    });
    this.crystalMat = new THREE.MeshStandardMaterial({
      color: 0x62e5ff,
      emissive: 0x18a6d8,
      emissiveIntensity: 0.95,
      roughness: 0.16,
      metalness: 0.22,
      flatShading: true,
    });
    this.woodPlankMat = new THREE.MeshStandardMaterial({
      map: textures.shieldWood,
      color: 0x8f613b,
      roughness: 0.78,
      metalness: 0.04,
    });
    this.metalDarkMat = new THREE.MeshStandardMaterial({
      color: 0x454d58,
      roughness: 0.34,
      metalness: 0.82,
    });
    this.runeStoneMat = new THREE.MeshStandardMaterial({
      map: textures.graniteRock,
      color: 0x6c7785,
      roughness: 0.68,
      metalness: 0.16,
    });
    this.contactShadowMat = new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      depthWrite: false,
      opacity: 0.42,
    });
    this.shadowPlaneGeo = new THREE.PlaneGeometry(1, 1);
    this.shadowPlaneGeo.rotateX(-Math.PI / 2);
  }

  public track<T extends { dispose: () => void }>(item: T): T {
    this.extraDisposables.push(item);
    return item;
  }

  private createOutlineMaterial(colorHex: number, thickness: number): THREE.ShaderMaterial {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(colorHex) },
        uOpacity: { value: 0 },
        uThickness: { value: thickness },
      },
      vertexShader: `
        uniform float uThickness;
        void main() {
          vec3 radial = normalize(position + vec3(0.0001));
          vec3 pushDir = normalize(normal + radial * 0.35);
          vec3 displaced = position + pushDir * uThickness;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        void main() {
          gl_FragColor = vec4(uColor, uOpacity);
        }
      `,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      fog: false,
    });
    return this.track(mat);
  }

  private buildNodeOutlineRig(
    parentGroup: THREE.Group,
    activeVisual: THREE.Group,
    sourceMeshes: THREE.Mesh[],
    colorHex: number,
    thickness: number,
    haloRadius: number,
  ): {
    outlineGroup: THREE.Group;
    outlineMaterial: THREE.ShaderMaterial;
    groundHalo: THREE.Mesh;
  } {
    const outlineMaterial = this.createOutlineMaterial(colorHex, thickness);
    const outlineGroup = new THREE.Group();
    outlineGroup.visible = false;
    for (const src of sourceMeshes) {
      const shell = new THREE.Mesh(src.geometry, outlineMaterial);
      shell.position.copy(src.position);
      shell.rotation.copy(src.rotation);
      shell.scale.copy(src.scale);
      shell.castShadow = false;
      shell.receiveShadow = false;
      shell.raycast = () => {};
      outlineGroup.add(shell);
    }
    activeVisual.add(outlineGroup);

    const haloGeo = this.track(new THREE.RingGeometry(haloRadius * 0.84, haloRadius, 36));
    haloGeo.rotateX(-Math.PI / 2);
    const haloMat = this.track(
      new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    const groundHalo = new THREE.Mesh(haloGeo, haloMat);
    groundHalo.position.y = 0.065;
    groundHalo.visible = false;
    groundHalo.raycast = () => {};
    parentGroup.add(groundHalo);

    return { outlineGroup, outlineMaterial, groundHalo };
  }

  public createTreeNode(
    id: string,
    kind: 'oak_tree' | 'pine_tree' | 'birch_tree',
    x: number,
    z: number,
    tier: number,
    scale = 1.0,
    startAsSapling = false,
  ): WorldResourceNode {
    const y = getTerrainHeight(x, z);
    const group = new THREE.Group();
    group.position.set(x, y, z);

    // Contact shadow
    const shd = new THREE.Mesh(this.shadowPlaneGeo, this.contactShadowMat);
    shd.scale.setScalar(3.4 * scale);
    shd.position.y = 0.04;
    group.add(shd);

    // Persistent Stump (visible after chopping)
    const stumpVisual = new THREE.Group();
    const barkM = kind === 'birch_tree' ? this.birchBarkMat : this.barkMat;
    const stumpTrunk = new THREE.Mesh(
      this.track(new THREE.CylinderGeometry(0.28 * scale, 0.42 * scale, 0.48 * scale, 9)),
      barkM,
    );
    stumpTrunk.position.y = 0.22 * scale;
    stumpTrunk.castShadow = true;
    stumpTrunk.receiveShadow = true;
    stumpVisual.add(stumpTrunk);

    const stumpTop = new THREE.Mesh(
      this.track(new THREE.CylinderGeometry(0.26 * scale, 0.27 * scale, 0.04 * scale, 9)),
      this.stumpCapMat,
    );
    stumpTop.position.y = 0.46 * scale;
    stumpVisual.add(stumpTop);
    group.add(stumpVisual);

    // Growing Sapling visual (shown when planted or regenerating)
    const saplingVisual = new THREE.Group();
    const sapStem = new THREE.Mesh(
      this.track(new THREE.CylinderGeometry(0.05, 0.08, 0.9, 6)),
      barkM,
    );
    sapStem.position.y = 0.45;
    sapStem.castShadow = true;
    saplingVisual.add(sapStem);

    const sapLeafMat =
      kind === 'pine_tree'
        ? this.pineFoliageMat
        : kind === 'birch_tree'
          ? this.birchFoliageMats[0]
          : this.oakFoliageMats[1];
    const sapCrown = new THREE.Mesh(this.track(new THREE.IcosahedronGeometry(0.42, 1)), sapLeafMat);
    sapCrown.position.y = 0.95;
    sapCrown.castShadow = true;
    saplingVisual.add(sapCrown);
    saplingVisual.visible = startAsSapling;
    group.add(saplingVisual);

    // Full Tree activeVisual (pivots at stump top so it can lean & fall cleanly!)
    const activeVisual = new THREE.Group();
    activeVisual.position.y = 0.35 * scale;
    const hitMeshes: THREE.Mesh[] = [];
    // Per-tree cloned bark material so hit-flash only affects THIS tree and never signposts/workbench/other trees
    const nodeBarkMat = this.track(barkM.clone());

    if (kind === 'oak_tree' || kind === 'birch_tree') {
      const trunkH = (kind === 'birch_tree' ? 3.5 : 2.9) * scale;
      const trunk = new THREE.Mesh(
        this.track(new THREE.CylinderGeometry(0.18 * scale, 0.31 * scale, trunkH, 9)),
        nodeBarkMat,
      );
      trunk.position.y = trunkH * 0.5;
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      activeVisual.add(trunk);
      hitMeshes.push(trunk);

      // 2 secondary branches
      for (const side of [-1, 1]) {
        const branch = new THREE.Mesh(
          this.track(new THREE.CylinderGeometry(0.07 * scale, 0.13 * scale, 1.2 * scale, 6)),
          nodeBarkMat,
        );
        branch.position.set(side * 0.42 * scale, trunkH * 0.72, side * 0.15 * scale);
        branch.rotation.z = -side * 0.65;
        branch.castShadow = true;
        activeVisual.add(branch);
      }

      // Multi-cluster sculpted foliage domes (5 overlapping irregular clusters)
      const mats = kind === 'birch_tree' ? this.birchFoliageMats : this.oakFoliageMats;
      const clusterSpecs: Array<[number, number, number, number]> = [
        [0, trunkH + 0.55 * scale, 0, 1.38 * scale],
        [-0.85 * scale, trunkH + 0.12 * scale, 0.32 * scale, 0.96 * scale],
        [0.88 * scale, trunkH + 0.18 * scale, -0.25 * scale, 1.02 * scale],
        [0.12 * scale, trunkH + 0.2 * scale, 0.82 * scale, 0.92 * scale],
        [-0.2 * scale, trunkH + 0.35 * scale, -0.78 * scale, 0.9 * scale],
      ];
      clusterSpecs.forEach(([cx, cy, cz, cr], idx) => {
        const mat = mats[idx % mats.length].clone();
        this.track(mat);
        const foliage = new THREE.Mesh(this.track(new THREE.IcosahedronGeometry(cr, 1)), mat);
        foliage.position.set(cx, cy, cz);
        foliage.scale.set(1.08, 0.85, 1.04);
        foliage.rotation.set(idx * 0.7, idx * 1.1, 0);
        foliage.castShadow = true;
        foliage.receiveShadow = true;
        activeVisual.add(foliage);
        hitMeshes.push(foliage);
      });
    } else {
      // Pine Tree: tall tapered trunk + 4 tiered serrated conifer cones
      const trunkH = 3.9 * scale;
      const trunk = new THREE.Mesh(
        this.track(new THREE.CylinderGeometry(0.12 * scale, 0.3 * scale, trunkH, 8)),
        nodeBarkMat,
      );
      trunk.position.y = trunkH * 0.5;
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      activeVisual.add(trunk);
      hitMeshes.push(trunk);

      const tierCount = 4;
      for (let t = 0; t < tierCount; t++) {
        const r = (1.65 - t * 0.32) * scale;
        const h = (1.55 - t * 0.16) * scale;
        const mat = this.pineFoliageMat.clone();
        mat.color.offsetHSL(0, 0, t * 0.025);
        this.track(mat);
        const cone = new THREE.Mesh(this.track(new THREE.ConeGeometry(r, h, 8)), mat);
        cone.position.y = (1.45 + t * 0.92) * scale;
        cone.rotation.y = t * 0.45;
        cone.castShadow = true;
        cone.receiveShadow = true;
        activeVisual.add(cone);
        hitMeshes.push(cone);
      }
    }

    const outlineColor = kind === 'birch_tree' ? 0xfff0a0 : 0xffe484;
    const { outlineGroup, outlineMaterial, groundHalo } = this.buildNodeOutlineRig(
      group,
      activeVisual,
      hitMeshes,
      outlineColor,
      0.065 * scale,
      1.25 * scale,
    );

    activeVisual.visible = !startAsSapling;
    activeVisual.rotation.y = Math.random() * Math.PI * 2;
    group.add(activeVisual);
    group.userData = { nodeId: id };
    hitMeshes.forEach((m) => {
      m.userData = { nodeId: id };
    });

    const labelMap = {
      oak_tree: '참나무',
      pine_tree: '고산 소나무',
      birch_tree: '황금 자작나무',
    };

    return {
      id,
      kind,
      resourceYield: 'wood',
      yieldAmount: kind === 'birch_tree' ? 3 : kind === 'pine_tree' ? 2 : 2,
      label: labelMap[kind],
      actionLabel: '벌목하기',
      tier,
      x,
      y,
      z,
      radius: 0.58 * scale,
      interactRadius: 3.1,
      hp: startAsSapling ? 0 : 3,
      maxHp: 3,
      isDepleted: startAsSapling,
      regrowTimer: startAsSapling ? 16 : 0,
      regrowDuration: startAsSapling ? 16 : 26,
      isSapling: startAsSapling,
      group,
      activeVisual,
      stumpVisual,
      saplingVisual,
      shakeTimer: 0,
      hitFlashTimer: 0,
      fallProgress: 0,
      fallDirAngle: Math.random() * Math.PI * 2,
      hitMeshes,
      outlineGroup,
      outlineMaterial,
      groundHalo,
      outlineStrength: 0,
    };
  }

  public createRockNode(
    id: string,
    kind: 'granite_rock' | 'iron_vein' | 'crystal_cluster',
    x: number,
    z: number,
    tier: number,
    scale = 1.0,
  ): WorldResourceNode {
    const y = getTerrainHeight(x, z);
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const shd = new THREE.Mesh(this.shadowPlaneGeo, this.contactShadowMat);
    shd.scale.setScalar(2.8 * scale);
    shd.position.y = 0.04;
    group.add(shd);

    // Depleted rubble bed
    const stumpVisual = new THREE.Group();
    for (let r = 0; r < 4; r++) {
      const a = (r / 4) * Math.PI * 2 + 0.4;
      const pebble = new THREE.Mesh(
        this.track(new THREE.DodecahedronGeometry(0.24 * scale, 0)),
        this.rockMat,
      );
      pebble.position.set(Math.cos(a) * 0.42 * scale, 0.1 * scale, Math.sin(a) * 0.42 * scale);
      pebble.scale.set(1.2, 0.55, 1.0);
      stumpVisual.add(pebble);
    }
    group.add(stumpVisual);

    // Active rock cluster (5-8 composite facets)
    const activeVisual = new THREE.Group();
    const hitMeshes: THREE.Mesh[] = [];

    const mainMat = this.rockMat.clone();
    if (kind === 'iron_vein') mainMat.color.setHex(0x6d747d);
    if (kind === 'crystal_cluster') mainMat.color.setHex(0x526173);
    this.track(mainMat);

    // Main central boulder
    const mainBoulder = new THREE.Mesh(
      this.track(new THREE.DodecahedronGeometry(0.88 * scale, 0)),
      mainMat,
    );
    mainBoulder.scale.set(1.2, 0.85, 1.05);
    mainBoulder.position.y = 0.52 * scale;
    mainBoulder.rotation.set(0.3, Math.random() * 3, 0.15);
    mainBoulder.castShadow = true;
    mainBoulder.receiveShadow = true;
    activeVisual.add(mainBoulder);
    hitMeshes.push(mainBoulder);

    // Flanking stone slabs
    const flankOffsets: Array<[number, number, number, number]> = [
      [0.65 * scale, 0.34 * scale, 0.25 * scale, 0.56 * scale],
      [-0.58 * scale, 0.3 * scale, -0.35 * scale, 0.52 * scale],
      [-0.2 * scale, 0.28 * scale, 0.62 * scale, 0.46 * scale],
    ];
    flankOffsets.forEach(([fx, fy, fz, fr], idx) => {
      const slab = new THREE.Mesh(this.track(new THREE.DodecahedronGeometry(fr, 0)), mainMat);
      slab.position.set(fx, fy, fz);
      slab.rotation.set(idx, idx * 1.4, 0.2);
      slab.scale.set(1.1, 0.78, 1.0);
      slab.castShadow = true;
      slab.receiveShadow = true;
      activeVisual.add(slab);
      hitMeshes.push(slab);
    });

    if (kind === 'granite_rock') {
      // Moss cap accent
      const moss = new THREE.Mesh(
        this.track(new THREE.DodecahedronGeometry(0.55 * scale, 1)),
        this.mossMat,
      );
      moss.scale.set(1.25, 0.35, 1.15);
      moss.position.set(-0.08 * scale, 0.96 * scale, 0.06 * scale);
      activeVisual.add(moss);
    } else if (kind === 'iron_vein') {
      // Metallic iron ore nuggets jutting out (per-node cloned material so hit-flash stays isolated)
      const nodeIronMat = this.track(this.ironMat.clone());
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        const ore = new THREE.Mesh(
          this.track(new THREE.OctahedronGeometry(0.24 * scale, 0)),
          nodeIronMat,
        );
        ore.position.set(
          Math.cos(a) * 0.55 * scale,
          (0.55 + (k % 2) * 0.35) * scale,
          Math.sin(a) * 0.52 * scale,
        );
        ore.rotation.set(k * 0.5, a, 0.4);
        ore.castShadow = true;
        activeVisual.add(ore);
        hitMeshes.push(ore);
      }
    } else {
      // Glowing cyan crystal spires
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        const h = (0.85 + (k % 3) * 0.32) * scale;
        const spire = new THREE.Mesh(
          this.track(new THREE.ConeGeometry(0.18 * scale, h, 5)),
          this.crystalMat,
        );
        spire.position.set(
          Math.cos(a) * 0.36 * scale,
          0.75 * scale + h * 0.32,
          Math.sin(a) * 0.36 * scale,
        );
        spire.rotation.set((Math.random() - 0.5) * 0.45, a, (Math.random() - 0.5) * 0.45);
        spire.castShadow = true;
        activeVisual.add(spire);
        hitMeshes.push(spire);
      }
    }

    const rockOutlineColor =
      kind === 'crystal_cluster' ? 0x67e8f9 : kind === 'iron_vein' ? 0xbae6fd : 0xfff0b8;
    const { outlineGroup, outlineMaterial, groundHalo } = this.buildNodeOutlineRig(
      group,
      activeVisual,
      hitMeshes,
      rockOutlineColor,
      0.055 * scale,
      1.48 * scale,
    );

    group.add(activeVisual);
    group.userData = { nodeId: id };
    hitMeshes.forEach((m) => {
      m.userData = { nodeId: id };
    });

    const cfg = {
      granite_rock: { label: '화강암 바위', res: 'stone' as ResourceKind, amt: 2, hp: 3 },
      iron_vein: { label: '철광석 광맥', res: 'iron' as ResourceKind, amt: 2, hp: 4 },
      crystal_cluster: { label: '마력 수정 군락', res: 'crystal' as ResourceKind, amt: 2, hp: 4 },
    }[kind];

    return {
      id,
      kind,
      resourceYield: cfg.res,
      yieldAmount: cfg.amt,
      label: cfg.label,
      actionLabel: '채광하기',
      tier,
      x,
      y,
      z,
      radius: 1.05 * scale,
      interactRadius: 3.2,
      hp: cfg.hp,
      maxHp: cfg.hp,
      isDepleted: false,
      regrowTimer: 0,
      regrowDuration: 30,
      group,
      activeVisual,
      stumpVisual,
      shakeTimer: 0,
      hitFlashTimer: 0,
      fallProgress: 0,
      fallDirAngle: 0,
      hitMeshes,
      outlineGroup,
      outlineMaterial,
      groundHalo,
      outlineStrength: 0,
    };
  }

  public createFoodNode(
    id: string,
    kind:
      | 'apple_tree'
      | 'berry_bush'
      | 'mushroom_patch'
      | 'wild_beehive'
      | 'coconut_palm'
      | 'cactus_pear'
      | 'carrot_patch',
    x: number,
    z: number,
    tier: number,
    scale = 1.0,
  ): WorldResourceNode {
    const y = getTerrainHeight(x, z);
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const shd = new THREE.Mesh(this.shadowPlaneGeo, this.contactShadowMat);
    shd.scale.setScalar((kind === 'apple_tree' || kind === 'coconut_palm' ? 3.2 : 1.9) * scale);
    shd.position.y = 0.04;
    group.add(shd);

    const stumpVisual = new THREE.Group();
    const activeVisual = new THREE.Group();
    const hitMeshes: THREE.Mesh[] = [];

    let foodYield: FoodId = 'apple';
    let yieldAmount = 2;
    let label = '사과 나무';
    let actionLabel = '채집하기';
    let radius = 0.65 * scale;
    let interactRadius = 3.15;
    let maxHp = 2;
    let regrowDuration = 38;
    let outlineColor = 0xfde047;
    let haloRadius = 1.2 * scale;

    if (kind === 'apple_tree') {
      foodYield = 'apple';
      yieldAmount = 2;
      label = '사과 나무';
      actionLabel = '사과 따기';
      radius = 0.56 * scale;
      maxHp = 2;
      regrowDuration = 40;
      outlineColor = 0xff7b7b;
      haloRadius = 1.3 * scale;

      const stumpTrunk = new THREE.Mesh(
        this.track(new THREE.CylinderGeometry(0.24 * scale, 0.36 * scale, 0.45 * scale, 8)),
        this.barkMat,
      );
      stumpTrunk.position.y = 0.22 * scale;
      stumpVisual.add(stumpTrunk);

      const nodeBark = this.track(this.barkMat.clone());
      const trunkH = 2.6 * scale;
      const trunk = new THREE.Mesh(
        this.track(new THREE.CylinderGeometry(0.18 * scale, 0.3 * scale, trunkH, 8)),
        nodeBark,
      );
      trunk.position.y = trunkH * 0.5;
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      activeVisual.add(trunk);
      hitMeshes.push(trunk);

      const leafMat = this.track(
        new THREE.MeshStandardMaterial({ color: 0x4b9440, roughness: 0.84, metalness: 0.02 }),
      );
      const crownOffsets: Array<[number, number, number, number]> = [
        [0, trunkH + 0.55 * scale, 0, 1.35 * scale],
        [-0.75 * scale, trunkH + 0.12 * scale, 0.35 * scale, 0.92 * scale],
        [0.78 * scale, trunkH + 0.16 * scale, -0.25 * scale, 0.96 * scale],
        [0.1 * scale, trunkH + 0.22 * scale, 0.72 * scale, 0.88 * scale],
      ];
      for (const [cx, cy, cz, cr] of crownOffsets) {
        const dome = new THREE.Mesh(this.track(new THREE.IcosahedronGeometry(cr, 1)), leafMat);
        dome.position.set(cx, cy, cz);
        dome.scale.set(1.06, 0.84, 1.04);
        dome.castShadow = true;
        dome.receiveShadow = true;
        activeVisual.add(dome);
        hitMeshes.push(dome);
      }

      const appleMat = this.track(
        new THREE.MeshStandardMaterial({
          color: 0xe63946,
          emissive: 0x590d14,
          emissiveIntensity: 0.25,
          roughness: 0.32,
          metalness: 0.08,
        }),
      );
      const appleGeo = this.track(new THREE.SphereGeometry(0.17 * scale, 8, 7));
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.25;
        const r = (0.92 + (i % 2) * 0.28) * scale;
        const apple = new THREE.Mesh(appleGeo, appleMat);
        apple.position.set(
          Math.cos(a) * r,
          trunkH + (0.05 + (i % 3) * 0.32) * scale,
          Math.sin(a) * r,
        );
        apple.castShadow = true;
        activeVisual.add(apple);
        hitMeshes.push(apple);
      }
    } else if (kind === 'berry_bush') {
      foodYield = 'berry';
      yieldAmount = 3;
      label = '베리 덤불';
      actionLabel = '베리 따기';
      radius = 0.58 * scale;
      maxHp = 1;
      regrowDuration = 30;
      outlineColor = 0xf472b6;
      haloRadius = 1.05 * scale;

      const bareLeafMat = this.track(
        new THREE.MeshStandardMaterial({ color: 0x355c32, roughness: 0.9 }),
      );
      const bareBush = new THREE.Mesh(
        this.track(new THREE.IcosahedronGeometry(0.56 * scale, 1)),
        bareLeafMat,
      );
      bareBush.scale.set(1.15, 0.65, 1.15);
      bareBush.position.y = 0.34 * scale;
      stumpVisual.add(bareBush);

      const bushMat = this.track(
        new THREE.MeshStandardMaterial({ color: 0x2d7a47, roughness: 0.85, metalness: 0.02 }),
      );
      const puffs: Array<[number, number, number, number]> = [
        [0, 0.55 * scale, 0, 0.68 * scale],
        [0.48 * scale, 0.4 * scale, 0.22 * scale, 0.48 * scale],
        [-0.45 * scale, 0.42 * scale, -0.2 * scale, 0.5 * scale],
        [0.05 * scale, 0.38 * scale, -0.44 * scale, 0.45 * scale],
      ];
      for (const [px, py, pz, pr] of puffs) {
        const puff = new THREE.Mesh(this.track(new THREE.IcosahedronGeometry(pr, 1)), bushMat);
        puff.position.set(px, py, pz);
        puff.scale.set(1.08, 0.85, 1.08);
        puff.castShadow = true;
        puff.receiveShadow = true;
        activeVisual.add(puff);
        hitMeshes.push(puff);
      }

      const berryMat = this.track(
        new THREE.MeshStandardMaterial({
          color: 0xdb2777,
          emissive: 0x701a4a,
          emissiveIntensity: 0.35,
          roughness: 0.28,
        }),
      );
      const berryGeo = this.track(new THREE.SphereGeometry(0.1 * scale, 7, 6));
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const rad = (0.48 + (i % 3) * 0.16) * scale;
        const berry = new THREE.Mesh(berryGeo, berryMat);
        berry.position.set(
          Math.cos(a) * rad,
          (0.45 + (i % 3) * 0.22) * scale,
          Math.sin(a) * rad,
        );
        activeVisual.add(berry);
        hitMeshes.push(berry);
      }
    } else if (kind === 'mushroom_patch') {
      foodYield = 'mushroom';
      yieldAmount = 2;
      label = '숲 버섯 군락';
      actionLabel = '버섯 채집';
      radius = 0.45 * scale;
      maxHp = 1;
      regrowDuration = 34;
      outlineColor = 0xf59e0b;
      haloRadius = 0.95 * scale;

      const mossPad = new THREE.Mesh(
        this.track(new THREE.CylinderGeometry(0.68 * scale, 0.78 * scale, 0.14 * scale, 9)),
        this.mossMat,
      );
      mossPad.position.y = 0.07 * scale;
      stumpVisual.add(mossPad);

      const stemMat = this.track(
        new THREE.MeshStandardMaterial({ color: 0xf4ead5, roughness: 0.8 }),
      );
      const capMat = this.track(
        new THREE.MeshStandardMaterial({
          color: 0xd97706,
          emissive: 0x5c2c04,
          emissiveIntensity: 0.22,
          roughness: 0.45,
        }),
      );
      const spotMat = this.track(
        new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.7 }),
      );
      const specs: Array<[number, number, number, number]> = [
        [0, 0, 0.56, 0.44],
        [0.42, 0.24, 0.38, 0.32],
        [-0.38, 0.2, 0.42, 0.34],
        [0.14, -0.4, 0.34, 0.28],
        [-0.25, -0.32, 0.3, 0.25],
      ];
      for (const [mx, mz, h, capR] of specs) {
        const stem = new THREE.Mesh(
          this.track(new THREE.CylinderGeometry(capR * 0.3 * scale, capR * 0.4 * scale, h * scale, 7)),
          stemMat,
        );
        stem.position.set(mx * scale, h * 0.5 * scale, mz * scale);
        stem.castShadow = true;
        activeVisual.add(stem);
        hitMeshes.push(stem);

        const cap = new THREE.Mesh(
          this.track(new THREE.SphereGeometry(capR * scale, 9, 6, 0, Math.PI * 2, 0, Math.PI * 0.58)),
          capMat,
        );
        cap.position.set(mx * scale, h * 0.9 * scale, mz * scale);
        cap.castShadow = true;
        activeVisual.add(cap);
        hitMeshes.push(cap);

        const spot = new THREE.Mesh(this.track(new THREE.SphereGeometry(capR * 0.18 * scale, 5, 5)), spotMat);
        spot.position.set((mx + capR * 0.2) * scale, (h * 0.9 + capR * 0.52) * scale, mz * scale);
        activeVisual.add(spot);
      }
    } else if (kind === 'wild_beehive') {
      foodYield = 'honey';
      yieldAmount = 2;
      label = '야생 벌집';
      actionLabel = '꿀 채취';
      radius = 0.55 * scale;
      maxHp = 2;
      regrowDuration = 48;
      outlineColor = 0xfacc15;
      haloRadius = 1.05 * scale;

      const post = new THREE.Mesh(
        this.track(new THREE.CylinderGeometry(0.18 * scale, 0.26 * scale, 1.45 * scale, 8)),
        this.barkMat,
      );
      post.position.y = 0.72 * scale;
      post.castShadow = true;
      stumpVisual.add(post);

      const arm = new THREE.Mesh(
        this.track(new THREE.CylinderGeometry(0.08 * scale, 0.12 * scale, 0.85 * scale, 6)),
        this.barkMat,
      );
      arm.position.set(0.32 * scale, 1.38 * scale, 0);
      arm.rotation.z = -Math.PI * 0.36;
      stumpVisual.add(arm);

      const hiveMat = this.track(
        new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          emissive: 0x92400e,
          emissiveIntensity: 0.32,
          roughness: 0.42,
        }),
      );
      const bandRadii = [0.22, 0.34, 0.38, 0.3, 0.18];
      bandRadii.forEach((br, idx) => {
        const ring = new THREE.Mesh(
          this.track(new THREE.CylinderGeometry(br * scale, (br * 1.04) * scale, 0.16 * scale, 9)),
          hiveMat,
        );
        ring.position.set(0.55 * scale, (1.28 - idx * 0.14) * scale, 0);
        ring.castShadow = true;
        activeVisual.add(ring);
        hitMeshes.push(ring);
      });

      const hole = new THREE.Mesh(
        this.track(new THREE.SphereGeometry(0.1 * scale, 6, 6)),
        this.metalDarkMat,
      );
      hole.position.set(0.55 * scale, 0.96 * scale, 0.34 * scale);
      activeVisual.add(hole);
    } else if (kind === 'coconut_palm') {
      foodYield = 'coconut';
      yieldAmount = 2;
      label = '해변 야자수';
      actionLabel = '코코넛 따기';
      radius = 0.56 * scale;
      maxHp = 2;
      regrowDuration = 46;
      outlineColor = 0xa3e635;
      haloRadius = 1.25 * scale;

      const palmBase = new THREE.Mesh(
        this.track(new THREE.CylinderGeometry(0.22 * scale, 0.34 * scale, 0.48 * scale, 8)),
        this.barkMat,
      );
      palmBase.position.y = 0.24 * scale;
      stumpVisual.add(palmBase);

      const palmBarkMat = this.track(
        new THREE.MeshStandardMaterial({ color: 0x9b744c, roughness: 0.88 }),
      );
      // Curved segmented trunk
      let topX = 0;
      let topY = 0;
      for (let s = 0; s < 5; s++) {
        const segH = 0.72 * scale;
        const seg = new THREE.Mesh(
          this.track(new THREE.CylinderGeometry((0.23 - s * 0.022) * scale, (0.27 - s * 0.022) * scale, segH, 7)),
          palmBarkMat,
        );
        const lean = s * 0.075;
        topX += Math.sin(lean) * segH * 0.72;
        topY += Math.cos(lean) * segH * 0.92;
        seg.position.set(topX, topY - segH * 0.35, 0);
        seg.rotation.z = -lean;
        seg.castShadow = true;
        activeVisual.add(seg);
        hitMeshes.push(seg);
      }

      const frondMat = this.track(
        new THREE.MeshStandardMaterial({ color: 0x4ca649, roughness: 0.78, side: THREE.DoubleSide }),
      );
      for (let f = 0; f < 6; f++) {
        const a = (f / 6) * Math.PI * 2;
        const frond = new THREE.Mesh(
          this.track(new THREE.ConeGeometry(0.42 * scale, 2.1 * scale, 4)),
          frondMat,
        );
        frond.scale.set(1, 1, 0.24);
        frond.position.set(
          topX + Math.cos(a) * 0.95 * scale,
          topY + 0.15 * scale,
          Math.sin(a) * 0.95 * scale,
        );
        frond.rotation.order = 'YXZ';
        frond.rotation.y = -a + Math.PI * 0.5;
        frond.rotation.x = 1.18;
        frond.castShadow = true;
        activeVisual.add(frond);
        hitMeshes.push(frond);
      }

      const cocoMat = this.track(
        new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.75 }),
      );
      const cocoGeo = this.track(new THREE.SphereGeometry(0.22 * scale, 8, 7));
      for (let c = 0; c < 3; c++) {
        const a = (c / 3) * Math.PI * 2;
        const coco = new THREE.Mesh(cocoGeo, cocoMat);
        coco.position.set(
          topX + Math.cos(a) * 0.28 * scale,
          topY - 0.16 * scale,
          Math.sin(a) * 0.28 * scale,
        );
        coco.castShadow = true;
        activeVisual.add(coco);
        hitMeshes.push(coco);
      }
    } else if (kind === 'cactus_pear') {
      foodYield = 'cactus_fruit';
      yieldAmount = 2;
      label = '사막 선인장';
      actionLabel = '열매 채집';
      radius = 0.55 * scale;
      maxHp = 2;
      regrowDuration = 42;
      outlineColor = 0xf43f5e;
      haloRadius = 1.05 * scale;

      const cactusMat = this.track(
        new THREE.MeshStandardMaterial({ color: 0x3b8c52, roughness: 0.82 }),
      );
      const baseCactus = new THREE.Mesh(
        this.track(new THREE.CylinderGeometry(0.28 * scale, 0.34 * scale, 0.5 * scale, 8)),
        cactusMat,
      );
      baseCactus.position.y = 0.25 * scale;
      stumpVisual.add(baseCactus);

      const mainStem = new THREE.Mesh(
        this.track(new THREE.CapsuleGeometry(0.32 * scale, 1.6 * scale, 5, 8)),
        cactusMat,
      );
      mainStem.position.y = 1.1 * scale;
      mainStem.castShadow = true;
      activeVisual.add(mainStem);
      hitMeshes.push(mainStem);

      for (const side of [-1, 1]) {
        const arm = new THREE.Mesh(
          this.track(new THREE.CapsuleGeometry(0.21 * scale, 0.75 * scale, 4, 7)),
          cactusMat,
        );
        arm.position.set(side * 0.52 * scale, (1.15 + side * 0.16) * scale, 0);
        arm.rotation.z = -side * 0.25;
        arm.castShadow = true;
        activeVisual.add(arm);
        hitMeshes.push(arm);
      }

      const pearMat = this.track(
        new THREE.MeshStandardMaterial({
          color: 0xe11d48,
          emissive: 0x881337,
          emissiveIntensity: 0.38,
          roughness: 0.35,
        }),
      );
      const pearCoords: Array<[number, number, number]> = [
        [0, 2.22 * scale, 0],
        [-0.58 * scale, 1.56 * scale, 0],
        [0.58 * scale, 1.88 * scale, 0],
      ];
      for (const [px, py, pz] of pearCoords) {
        const pear = new THREE.Mesh(this.track(new THREE.SphereGeometry(0.17 * scale, 8, 7)), pearMat);
        pear.scale.set(0.85, 1.22, 0.85);
        pear.position.set(px, py, pz);
        activeVisual.add(pear);
        hitMeshes.push(pear);
      }
    } else {
      // carrot_patch
      foodYield = 'carrot';
      yieldAmount = 3;
      label = '야생 당근 밭';
      actionLabel = '당근 수확';
      radius = 0.52 * scale;
      maxHp = 1;
      regrowDuration = 32;
      outlineColor = 0xfb923c;
      haloRadius = 1.05 * scale;

      const soilMat = this.track(
        new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.95 }),
      );
      const mound = new THREE.Mesh(
        this.track(new THREE.CylinderGeometry(0.75 * scale, 0.92 * scale, 0.22 * scale, 10)),
        soilMat,
      );
      mound.position.y = 0.1 * scale;
      mound.receiveShadow = true;
      stumpVisual.add(mound);

      const carrotMat = this.track(
        new THREE.MeshStandardMaterial({
          color: 0xf97316,
          emissive: 0x7c2d12,
          emissiveIntensity: 0.22,
          roughness: 0.45,
        }),
      );
      const leafTopMat = this.track(
        new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.82 }),
      );

      const spots: Array<[number, number]> = [
        [0, 0],
        [0.36, 0.22],
        [-0.34, 0.24],
        [0.24, -0.34],
        [-0.28, -0.26],
      ];
      for (const [cx, cz] of spots) {
        const root = new THREE.Mesh(
          this.track(new THREE.ConeGeometry(0.11 * scale, 0.36 * scale, 6)),
          carrotMat,
        );
        root.rotation.x = Math.PI;
        root.position.set(cx * scale, 0.26 * scale, cz * scale);
        root.castShadow = true;
        activeVisual.add(root);
        hitMeshes.push(root);

        const top = new THREE.Mesh(
          this.track(new THREE.ConeGeometry(0.16 * scale, 0.42 * scale, 5)),
          leafTopMat,
        );
        top.position.set(cx * scale, 0.58 * scale, cz * scale);
        top.castShadow = true;
        activeVisual.add(top);
        hitMeshes.push(top);
      }
    }

    group.add(stumpVisual);

    const { outlineGroup, outlineMaterial, groundHalo } = this.buildNodeOutlineRig(
      group,
      activeVisual,
      hitMeshes,
      outlineColor,
      0.055 * scale,
      haloRadius,
    );

    activeVisual.rotation.y = Math.random() * Math.PI * 2;
    group.add(activeVisual);
    group.userData = { nodeId: id };
    hitMeshes.forEach((m) => {
      m.userData = { nodeId: id };
    });

    return {
      id,
      kind,
      foodYield,
      yieldAmount,
      label,
      actionLabel,
      tier,
      x,
      y,
      z,
      radius,
      interactRadius,
      hp: maxHp,
      maxHp,
      isDepleted: false,
      regrowTimer: 0,
      regrowDuration,
      group,
      activeVisual,
      stumpVisual,
      shakeTimer: 0,
      hitFlashTimer: 0,
      fallProgress: 0,
      fallDirAngle: Math.random() * Math.PI * 2,
      hitMeshes,
      outlineGroup,
      outlineMaterial,
      groundHalo,
      outlineStrength: 0,
    };
  }

  public createCampfireWorkbench(x: number, z: number): WorldLandmark {
    const y = getTerrainHeight(x, z);
    const group = new THREE.Group();
    group.position.set(x, y, z);

    // Stone campfire ring
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const stone = new THREE.Mesh(this.track(new THREE.DodecahedronGeometry(0.24, 0)), this.rockMat);
      stone.scale.set(1.1, 0.65, 1.0);
      stone.position.set(Math.cos(a) * 0.82, 0.12, Math.sin(a) * 0.82);
      stone.castShadow = true;
      stone.receiveShadow = true;
      group.add(stone);
    }

    // Crossed logs
    for (let i = 0; i < 3; i++) {
      const log = new THREE.Mesh(this.track(new THREE.CylinderGeometry(0.09, 0.1, 1.05, 8)), this.barkMat);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = (i / 3) * Math.PI;
      log.position.y = 0.12;
      group.add(log);
    }

    // Glowing fire cluster (animated)
    const fireGroup = new THREE.Group();
    fireGroup.position.y = 0.35;
    const outerFlameMat = this.track(
      new THREE.MeshBasicMaterial({ color: 0xff7b24, transparent: true, opacity: 0.9 }),
    );
    const innerFlameMat = this.track(new THREE.MeshBasicMaterial({ color: 0xffe066 }));
    const outerFlame = new THREE.Mesh(this.track(new THREE.ConeGeometry(0.32, 0.85, 7)), outerFlameMat);
    outerFlame.position.y = 0.22;
    fireGroup.add(outerFlame);
    const innerFlame = new THREE.Mesh(this.track(new THREE.ConeGeometry(0.18, 0.55, 6)), innerFlameMat);
    innerFlame.position.y = 0.14;
    fireGroup.add(innerFlame);
    group.add(fireGroup);

    const fireLight = new THREE.PointLight(0xff9b42, 3.2, 14, 1.6);
    fireLight.position.set(0, 1.25, 0);
    group.add(fireLight);

    // Adjacent wooden crafting workbench
    const bench = new THREE.Group();
    bench.position.set(2.35, 0, -0.5);
    bench.rotation.y = -0.35;

    const top = new THREE.Mesh(this.track(new THREE.BoxGeometry(1.75, 0.14, 0.95)), this.woodPlankMat);
    top.position.y = 0.92;
    top.castShadow = true;
    top.receiveShadow = true;
    bench.add(top);

    for (const lx of [-0.72, 0.72]) {
      for (const lz of [-0.34, 0.34]) {
        const leg = new THREE.Mesh(this.track(new THREE.BoxGeometry(0.14, 0.92, 0.14)), this.barkMat);
        leg.position.set(lx, 0.46, lz);
        leg.castShadow = true;
        bench.add(leg);
      }
    }

    // Mini anvil & timber stack on workbench
    const anvilBase = new THREE.Mesh(this.track(new THREE.BoxGeometry(0.45, 0.22, 0.24)), this.metalDarkMat);
    anvilBase.position.set(-0.38, 1.1, 0);
    anvilBase.castShadow = true;
    bench.add(anvilBase);

    const anvilTop = new THREE.Mesh(this.track(new THREE.BoxGeometry(0.62, 0.12, 0.28)), this.ironMat);
    anvilTop.position.set(-0.35, 1.24, 0);
    anvilTop.castShadow = true;
    bench.add(anvilTop);

    const woodBlock = new THREE.Mesh(this.track(new THREE.CylinderGeometry(0.12, 0.12, 0.55, 8)), this.stumpCapMat);
    woodBlock.rotation.z = Math.PI / 2;
    woodBlock.position.set(0.42, 1.08, 0.08);
    bench.add(woodBlock);

    group.add(bench);

    return {
      id: 'landmark_workbench',
      kind: 'workbench',
      label: '정착지 모닥불 & 제작 작업대',
      actionLabel: '제작 열기',
      x,
      y,
      z,
      radius: 1.5,
      interactRadius: 4.5,
      group,
      animatedPart: fireGroup,
      light: fireLight,
    };
  }

  public createFrontierMonolith(x: number, z: number): WorldLandmark {
    const y = getTerrainHeight(x, z);
    const group = new THREE.Group();
    group.position.set(x, y, z);

    // Stepped stone dais
    const base1 = new THREE.Mesh(this.track(new THREE.CylinderGeometry(1.7, 2.0, 0.35, 8)), this.runeStoneMat);
    base1.position.y = 0.17;
    base1.castShadow = true;
    base1.receiveShadow = true;
    group.add(base1);

    const base2 = new THREE.Mesh(this.track(new THREE.CylinderGeometry(1.15, 1.35, 0.35, 8)), this.runeStoneMat);
    base2.position.y = 0.52;
    base2.castShadow = true;
    base2.receiveShadow = true;
    group.add(base2);

    // Carved split obelisk pillars
    for (const side of [-1, 1]) {
      const pillar = new THREE.Mesh(
        this.track(new THREE.CylinderGeometry(0.24, 0.42, 3.2, 6)),
        this.runeStoneMat,
      );
      pillar.position.set(side * 0.52, 2.1, 0);
      pillar.rotation.z = side * 0.06;
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      group.add(pillar);
    }

    // Floating spinning cyan rune crystal in center
    const crystalPivot = new THREE.Group();
    crystalPivot.position.y = 2.65;
    const core = new THREE.Mesh(this.track(new THREE.OctahedronGeometry(0.48, 0)), this.crystalMat);
    core.scale.set(0.85, 1.55, 0.85);
    crystalPivot.add(core);

    const runeRing = new THREE.Mesh(
      this.track(new THREE.TorusGeometry(0.76, 0.04, 8, 24)),
      this.track(
        new THREE.MeshStandardMaterial({
          color: 0xe8b948,
          emissive: 0x9e6a12,
          emissiveIntensity: 0.45,
          roughness: 0.25,
          metalness: 0.85,
        }),
      ),
    );
    runeRing.rotation.x = Math.PI * 0.35;
    crystalPivot.add(runeRing);
    group.add(crystalPivot);

    const monoLight = new THREE.PointLight(0x4be3ff, 3.5, 16, 1.5);
    monoLight.position.set(0, 2.8, 0);
    group.add(monoLight);

    return {
      id: 'landmark_frontier',
      kind: 'frontier_stone',
      label: '고대 경계석',
      actionLabel: '월드 확장 의식',
      x,
      y,
      z,
      radius: 1.55,
      interactRadius: 4.8,
      group,
      animatedPart: crystalPivot,
      light: monoLight,
    };
  }

  public createSignpost(x: number, z: number): WorldLandmark {
    const y = getTerrainHeight(x, z);
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const post = new THREE.Mesh(this.track(new THREE.CylinderGeometry(0.1, 0.13, 2.1, 8)), this.barkMat);
    post.position.y = 1.05;
    post.castShadow = true;
    group.add(post);

    const board1 = new THREE.Mesh(this.track(new THREE.BoxGeometry(1.15, 0.32, 0.09)), this.woodPlankMat);
    board1.position.set(0.15, 1.72, 0.05);
    board1.rotation.y = 0.22;
    board1.castShadow = true;
    group.add(board1);

    const board2 = new THREE.Mesh(this.track(new THREE.BoxGeometry(0.95, 0.28, 0.09)), this.woodPlankMat);
    board2.position.set(-0.18, 1.32, -0.04);
    board2.rotation.y = -0.35;
    board2.castShadow = true;
    group.add(board2);

    return {
      id: 'landmark_signpost',
      kind: 'signpost',
      label: '개척자 이정표',
      actionLabel: '안내 읽기',
      x,
      y,
      z,
      radius: 0.4,
      interactRadius: 3.4,
      group,
    };
  }

  public createLanternPost(x: number, z: number): { group: THREE.Group; flame: THREE.Mesh; light: THREE.PointLight } {
    const y = getTerrainHeight(x, z);
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const pole = new THREE.Mesh(this.track(new THREE.CylinderGeometry(0.075, 0.11, 2.35, 8)), this.barkMat);
    pole.position.y = 1.17;
    pole.castShadow = true;
    group.add(pole);

    const arm = new THREE.Mesh(this.track(new THREE.BoxGeometry(0.62, 0.09, 0.09)), this.woodPlankMat);
    arm.position.set(0.24, 2.25, 0);
    arm.castShadow = true;
    group.add(arm);

    const cap = new THREE.Mesh(this.track(new THREE.ConeGeometry(0.22, 0.18, 6)), this.metalDarkMat);
    cap.position.set(0.48, 2.1, 0);
    group.add(cap);

    const flame = new THREE.Mesh(
      this.track(new THREE.OctahedronGeometry(0.15, 0)),
      this.track(
        new THREE.MeshBasicMaterial({
          color: 0xffc857,
        }),
      ),
    );
    flame.position.set(0.48, 1.9, 0);
    group.add(flame);

    const light = new THREE.PointLight(0xffb84d, 2.4, 12, 1.6);
    light.position.set(0.48, 1.9, 0);
    group.add(light);

    return { group, flame, light };
  }

  public createMeadowGrassInstanced(count: number, maxRadius: number): THREE.InstancedMesh {
    // Sculpted 3-blade grass tuft geometry merged cleanly into one BufferGeometry
    const tuftGeo = this.track(new THREE.ConeGeometry(0.08, 0.52, 4));
    tuftGeo.translate(0, 0.24, 0);

    const tuftMat = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.9,
        metalness: 0.0,
      }),
    );

    const inst = new THREE.InstancedMesh(tuftGeo, tuftMat, count);
    inst.receiveShadow = true;
    inst.castShadow = false;
    inst.frustumCulled = false;

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    let placed = 0;
    let attempts = 0;

    while (placed < count && attempts < count * 4) {
      attempts++;
      const r = 4.5 + Math.sqrt(Math.random()) * (maxRadius - 4.5);
      const theta = Math.random() * Math.PI * 2;
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;

      // Avoid main dirt road
      const roadX = Math.sin(z * 0.085) * 3.2;
      if (z < 2 && z > -78 && Math.abs(x - roadX) < 2.2) continue;

      const y = getTerrainHeight(x, z);
      dummy.position.set(x, y - 0.03, z);
      dummy.rotation.set(
        (Math.random() - 0.5) * 0.25,
        Math.random() * Math.PI * 2,
        (Math.random() - 0.5) * 0.25,
      );
      const s = 0.72 + Math.random() * 0.75;
      dummy.scale.set(s * 1.1, s, s * 1.1);
      dummy.updateMatrix();
      inst.setMatrixAt(placed, dummy.matrix);

      // Subtle meadow greens & occasional wildflowers
      const roll = Math.random();
      if (roll > 0.94) {
        color.setHex(0xf4d35e); // dandelion yellow
      } else if (roll > 0.9) {
        color.setHex(0xedf2f4); // white daisy
      } else {
        color.setHSL(0.26 + (Math.random() - 0.5) * 0.05, 0.44, 0.34 + Math.random() * 0.14);
      }
      inst.setColorAt(placed, color);
      placed++;
    }

    inst.count = placed;
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.computeBoundingSphere();
    return inst;
  }

  public dispose(): void {
    this.barkMat.dispose();
    this.birchBarkMat.dispose();
    this.stumpCapMat.dispose();
    this.oakFoliageMats.forEach((m) => m.dispose());
    this.pineFoliageMat.dispose();
    this.birchFoliageMats.forEach((m) => m.dispose());
    this.rockMat.dispose();
    this.mossMat.dispose();
    this.ironMat.dispose();
    this.crystalMat.dispose();
    this.woodPlankMat.dispose();
    this.metalDarkMat.dispose();
    this.runeStoneMat.dispose();
    this.contactShadowMat.dispose();
    this.shadowPlaneGeo.dispose();
    this.extraDisposables.forEach((d) => d.dispose());
  }
}

/**
 * Zero-GC pooled particle burst & shockwave ring system for chopping, mining, landing, and world expansion.
 */
export function createParticlePool(maxParticles = 140): ParticlePool {
  const group = new THREE.Group();
  const geo = new THREE.DodecahedronGeometry(0.085, 0);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.7,
    metalness: 0.1,
  });

  const mesh = new THREE.InstancedMesh(geo, mat, maxParticles);
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  group.add(mesh);

  interface Particle {
    active: boolean;
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    rot: number;
    life: number;
    maxLife: number;
    scale: number;
  }

  const particles: Particle[] = Array.from({ length: maxParticles }, () => ({
    active: false,
    x: 0,
    y: -999,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    rot: 0,
    life: 0,
    maxLife: 1,
    scale: 1,
  }));

  const dummy = new THREE.Object3D();
  const tmpColor = new THREE.Color();

  // Initialize hidden
  for (let i = 0; i < maxParticles; i++) {
    dummy.position.set(0, -999, 0);
    dummy.scale.setScalar(0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, tmpColor.setHex(0xffffff));
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

  // Reusable shockwave rings (up to 4)
  const ringGeo = new THREE.RingGeometry(0.85, 1.0, 48);
  ringGeo.rotateX(-Math.PI / 2);
  interface RingItem {
    mesh: THREE.Mesh;
    mat: THREE.MeshBasicMaterial;
    active: boolean;
    life: number;
    maxLife: number;
    maxRadius: number;
  }
  const rings: RingItem[] = Array.from({ length: 4 }, () => {
    const rMat = new THREE.MeshBasicMaterial({
      color: 0x62e5ff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const rMesh = new THREE.Mesh(ringGeo, rMat);
    rMesh.visible = false;
    group.add(rMesh);
    return { mesh: rMesh, mat: rMat, active: false, life: 0, maxLife: 0.9, maxRadius: 4 };
  });

  let cursor = 0;

  const spawnBurst = (
    x: number,
    y: number,
    z: number,
    colorHex: number,
    count: number,
    speed = 4.2,
  ) => {
    tmpColor.setHex(colorHex);
    for (let i = 0; i < count; i++) {
      const p = particles[cursor];
      cursor = (cursor + 1) % maxParticles;
      p.active = true;
      p.x = x + (Math.random() - 0.5) * 0.35;
      p.y = y + (Math.random() - 0.5) * 0.25;
      p.z = z + (Math.random() - 0.5) * 0.35;
      const angle = Math.random() * Math.PI * 2;
      const spd = speed * (0.45 + Math.random() * 0.75);
      p.vx = Math.cos(angle) * spd;
      p.vy = speed * (0.55 + Math.random() * 0.7);
      p.vz = Math.sin(angle) * spd;
      p.rot = Math.random() * Math.PI;
      p.maxLife = 0.45 + Math.random() * 0.4;
      p.life = p.maxLife;
      p.scale = 0.65 + Math.random() * 0.85;
      mesh.setColorAt(cursor === 0 ? maxParticles - 1 : cursor - 1, tmpColor);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };

  const spawnRing = (x: number, y: number, z: number, colorHex: number, maxRadius: number) => {
    const ring = rings.find((r) => !r.active) || rings[0];
    ring.active = true;
    ring.life = 0;
    ring.maxLife = maxRadius > 8 ? 1.45 : 0.45;
    ring.maxRadius = maxRadius;
    ring.mat.color.setHex(colorHex);
    ring.mat.opacity = 0.75;
    ring.mesh.position.set(x, y + 0.08, z);
    ring.mesh.scale.setScalar(0.3);
    ring.mesh.visible = true;
  };

  const update = (dt: number) => {
    let dirty = false;
    for (let i = 0; i < maxParticles; i++) {
      const p = particles[i];
      if (!p.active) continue;
      dirty = true;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        dummy.position.set(0, -999, 0);
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        continue;
      }
      p.vy -= 14.5 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.rot += dt * 7.5;
      const t = p.life / p.maxLife;
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(p.rot, p.rot * 0.6, 0);
      dummy.scale.setScalar(p.scale * t);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    if (dirty) {
      mesh.instanceMatrix.needsUpdate = true;
    }

    for (const r of rings) {
      if (!r.active) continue;
      r.life += dt;
      const t = r.life / r.maxLife;
      if (t >= 1) {
        r.active = false;
        r.mesh.visible = false;
        continue;
      }
      const easeOut = 1 - Math.pow(1 - t, 3);
      r.mesh.scale.setScalar(0.4 + easeOut * r.maxRadius);
      r.mat.opacity = (1 - t) * 0.72;
    }
  };

  return {
    group,
    spawnBurst,
    spawnRing,
    update,
    dispose: () => {
      geo.dispose();
      mat.dispose();
      ringGeo.dispose();
      rings.forEach((r) => r.mat.dispose());
    },
  };
}

export interface StaticCircleCollider {
  shape: 'circle';
  x: number;
  z: number;
  radius: number;
}

export interface StaticBoxCollider {
  shape: 'box';
  x: number;
  z: number;
  halfW: number;
  halfD: number;
  rotY: number;
}

export type StaticCollider = StaticCircleCollider | StaticBoxCollider;

export interface WalkableDeck {
  x: number;
  z: number;
  halfW: number;
  halfD: number;
  rotY: number;
  topY: number;
}

export interface LandmarkBuildResult {
  group: THREE.Group;
  colliders: StaticCollider[];
  decks?: WalkableDeck[];
}

function localToWorldXZ(
  originX: number,
  originZ: number,
  rotY: number,
  lx: number,
  lz: number,
): [number, number] {
  const c = Math.cos(rotY);
  const s = Math.sin(rotY);
  return [originX + lx * c + lz * s, originZ - lx * s + lz * c];
}

export interface OtherPlayerPlot {
  id: string;
  ownerName: string;
  label: string;
  x: number;
  z: number;
  halfW: number;
  halfD: number;
  rotationY: number;
  colliders: StaticCollider[];
  group: THREE.Group;
}

export interface ClaimedLandPlot {
  id: string;
  x: number;
  z: number;
  radius: number;
  group: THREE.Group;
}

/**
 * Builds a pre-existing neighbor/other-player cottage in the Starting Village perimeter
 * with solid oriented box collision so neither players nor monsters pass through it.
 */
export function createOtherPlayerHouse(
  id: string,
  ownerName: string,
  label: string,
  x: number,
  z: number,
  rotationY: number,
  roofHex = 0x9b4634,
  wallHex = 0xe8dcc4,
): OtherPlayerPlot {
  const y = getTerrainHeight(x, z);
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = rotationY;

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x7b8188, roughness: 0.9 });
  const timberMat = new THREE.MeshStandardMaterial({ color: 0x5c3c22, roughness: 0.85 });
  const wallMat = new THREE.MeshStandardMaterial({ color: wallHex, roughness: 0.86 });
  const roofMat = new THREE.MeshStandardMaterial({ color: roofHex, roughness: 0.78 });
  const winMat = new THREE.MeshStandardMaterial({
    color: 0xffe4a0,
    emissive: 0xffb347,
    emissiveIntensity: 0.55,
    roughness: 0.3,
  });

  // Stone foundation plinth
  const base = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.75, 4.8), stoneMat);
  base.position.y = 0.2;
  group.add(base);

  // Main cottage body
  const body = new THREE.Mesh(new THREE.BoxGeometry(5.1, 2.7, 4.3), wallMat);
  body.position.y = 1.9;
  group.add(body);

  // Corner timber posts & middle beam
  for (const sx of [-2.52, 2.52]) {
    for (const sz of [-2.12, 2.12]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.76, 0.24), timberMat);
      post.position.set(sx, 1.9, sz);
      group.add(post);
    }
  }
  const midBeam = new THREE.Mesh(new THREE.BoxGeometry(5.3, 0.18, 4.5), timberMat);
  midBeam.position.y = 3.22;
  group.add(midBeam);

  // Pitched gable roof (two slopes + ridge beam)
  for (const side of [-1, 1] as const) {
    const slope = new THREE.Mesh(new THREE.BoxGeometry(5.9, 0.24, 3.05), roofMat);
    slope.position.set(0, 4.02, side * 1.15);
    slope.rotation.x = side * 0.56;
    group.add(slope);
  }
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.24, 0.24), timberMat);
  ridge.position.y = 4.78;
  group.add(ridge);

  // Stone chimney
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.75, 2.2, 0.75), stoneMat);
  chimney.position.set(1.65, 4.35, -0.85);
  group.add(chimney);

  // Front oak door + porch awning
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.08, 1.95, 0.16), timberMat);
  door.position.set(0, 1.54, 2.16);
  group.add(door);

  const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.14, 1.1), roofMat);
  porchRoof.position.set(0, 2.72, 2.58);
  porchRoof.rotation.x = 0.22;
  group.add(porchRoof);

  // Warm glowing cottage windows
  for (const wx of [-1.55, 1.55]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.82, 0.12), winMat);
    w.position.set(wx, 2.02, 2.16);
    group.add(w);
  }

  // Subtle violet-gold neighbor plot corner stakes (visual boundary cue)
  const stakeMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 0.88 });
  const flagMat = new THREE.MeshBasicMaterial({ color: 0xc084fc, fog: false });
  const halfW = 4.4;
  const halfD = 4.1;
  for (const sx of [-halfW, halfW]) {
    for (const sz of [-halfD, halfD]) {
      const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.9, 6), stakeMat);
      stake.position.set(sx, 0.45, sz);
      group.add(stake);
      const cap = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), flagMat);
      cap.position.set(sx, 0.96, sz);
      group.add(cap);
    }
  }

  group.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  const colliders: StaticCollider[] = [
    { shape: 'box', x, z, halfW: 2.9, halfD: 2.5, rotY: rotationY },
  ];

  return {
    id,
    ownerName,
    label,
    x,
    z,
    halfW: 4.5,
    halfD: 4.2,
    rotationY,
    colliders,
    group,
  };
}

/**
 * Builds visual corner boundary stakes & subtle emerald perimeter outline for a player-claimed land plot.
 */
export function createLandPlotVisual(id: string, x: number, z: number, radius: number): ClaimedLandPlot {
  const group = new THREE.Group();
  const baseY = getTerrainHeight(x, z);
  group.position.set(x, baseY, z);

  const postMat = new THREE.MeshStandardMaterial({ color: 0x6b4728, roughness: 0.88 });
  const orbMat = new THREE.MeshBasicMaterial({ color: 0x34d399, fog: false });
  const half = radius * 0.76;

  const corners: Array<[number, number]> = [
    [-half, -half],
    [half, -half],
    [half, half],
    [-half, half],
  ];
  for (const [cx, cz] of corners) {
    const localY = getTerrainHeight(x + cx, z + cz) - baseY;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.08, 1.05, 7), postMat);
    post.position.set(cx, localY + 0.5, cz);
    post.castShadow = true;
    group.add(post);

    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), orbMat);
    gem.position.set(cx, localY + 1.12, cz);
    group.add(gem);
  }

  // Terrain-following boundary line loop
  const pts: THREE.Vector3[] = [];
  const segsPerEdge = 8;
  for (let e = 0; e < 4; e++) {
    const [x1, z1] = corners[e];
    const [x2, z2] = corners[(e + 1) % 4];
    for (let s = 0; s < segsPerEdge; s++) {
      const t = s / segsPerEdge;
      const px = THREE.MathUtils.lerp(x1, x2, t);
      const pz = THREE.MathUtils.lerp(z1, z2, t);
      const py = getTerrainHeight(x + px, z + pz) - baseY + 0.12;
      pts.push(new THREE.Vector3(px, py, pz));
    }
  }
  const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
  const lineMat = new THREE.LineBasicMaterial({
    color: 0x34d399,
    transparent: true,
    opacity: 0.65,
    fog: false,
  });
  const borderLoop = new THREE.LineLoop(lineGeo, lineMat);
  borderLoop.raycast = () => {};
  group.add(borderLoop);

  return { id, x, z, radius, group };
}

/**
 * Northern Mine Biome Landmark: Timber mine tunnel portal, rocky ridge & rail track with solid collision.
 */
export function createMineEntranceLandmark(x: number, z: number, rotY = 0): LandmarkBuildResult {
  const y = getTerrainHeight(x, z);
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = rotY;

  const rockMat = new THREE.MeshStandardMaterial({ color: 0x626970, roughness: 0.92 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x11161b, roughness: 0.95 });
  const timberMat = new THREE.MeshStandardMaterial({ color: 0x634124, roughness: 0.86 });
  const railMat = new THREE.MeshStandardMaterial({ color: 0x8995a3, roughness: 0.4, metalness: 0.7 });
  const lanternMat = new THREE.MeshBasicMaterial({ color: 0xffc864, fog: false });

  // Rocky cliff arch mound
  const mound = new THREE.Mesh(new THREE.DodecahedronGeometry(3.8, 1), rockMat);
  mound.scale.set(1.4, 1.08, 1.05);
  mound.position.set(0, 2.3, -1.6);
  group.add(mound);

  // Dark tunnel opening
  const cave = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.7, 1.4), darkMat);
  cave.position.set(0, 1.35, -0.35);
  group.add(cave);

  // Heavy timber portal frame
  for (const sx of [-1.45, 1.45]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.32, 3.0, 0.34), timberMat);
    post.position.set(sx, 1.5, 0.45);
    group.add(post);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.34, 0.42), timberMat);
  lintel.position.set(0, 3.02, 0.45);
  group.add(lintel);

  // Hanging mine lantern
  const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.36, 0.28), lanternMat);
  lantern.position.set(1.15, 2.52, 0.65);
  group.add(lantern);

  // Mine rails & sleepers extending forward
  for (const rx of [-0.55, 0.55]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 5.2), railMat);
    rail.position.set(rx, 0.08, 2.4);
    group.add(rail);
  }
  for (let i = 0; i < 6; i++) {
    const tie = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.06, 0.22), timberMat);
    tie.position.set(0, 0.04, 0.3 + i * 0.85);
    group.add(tie);
  }

  group.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });

  const [mx, mz] = localToWorldXZ(x, z, rotY, 0, -1.5);
  const [pLx, pLz] = localToWorldXZ(x, z, rotY, -1.45, 0.45);
  const [pRx, pRz] = localToWorldXZ(x, z, rotY, 1.45, 0.45);

  return {
    group,
    colliders: [
      { shape: 'box', x: mx, z: mz, halfW: 4.4, halfD: 2.35, rotY },
      { shape: 'circle', x: pLx, z: pLz, radius: 0.34 },
      { shape: 'circle', x: pRx, z: pRz, radius: 0.34 },
    ],
  };
}

/**
 * Eastern Ancient Ruins Landmark: Weathered stone archway, broken pillars & floating cyan rune relic
 * with solid column, altar, and broken-pillar collision.
 */
export function createRuinsLandmark(x: number, z: number, rotY = 0): LandmarkBuildResult {
  const y = getTerrainHeight(x, z);
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = rotY;

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x9b9a8e, roughness: 0.9 });
  const mossStoneMat = new THREE.MeshStandardMaterial({ color: 0x6f846a, roughness: 0.92 });
  const runeMat = new THREE.MeshStandardMaterial({
    color: 0x67e8f9,
    emissive: 0x22d3ee,
    emissiveIntensity: 1.15,
    roughness: 0.2,
  });

  // Circular stone dais
  const dais = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 4.3, 0.45, 12), stoneMat);
  dais.position.y = 0.2;
  group.add(dais);

  // Twin standing ancient columns + lintel arch
  for (const sx of [-2.2, 2.2]) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 4.2, 10), stoneMat);
    col.position.set(sx, 2.4, -0.8);
    group.add(col);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.32, 1.05), mossStoneMat);
    cap.position.set(sx, 4.55, -0.8);
    group.add(cap);
  }
  const archBeam = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.56, 0.95), stoneMat);
  archBeam.position.set(0, 4.92, -0.8);
  group.add(archBeam);

  // Broken side column & glowing rune crystal pedestal
  const brokenCol = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 1.7, 10), mossStoneMat);
  brokenCol.position.set(2.9, 1.0, 1.8);
  brokenCol.rotation.z = -0.14;
  group.add(brokenCol);

  const altar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.95, 1.1), stoneMat);
  altar.position.set(0, 0.82, 0.6);
  group.add(altar);

  const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), runeMat);
  orb.position.set(0, 1.95, 0.6);
  group.add(orb);

  group.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });

  const [c1x, c1z] = localToWorldXZ(x, z, rotY, -2.2, -0.8);
  const [c2x, c2z] = localToWorldXZ(x, z, rotY, 2.2, -0.8);
  const [bkx, bkz] = localToWorldXZ(x, z, rotY, 2.9, 1.8);
  const [alx, alz] = localToWorldXZ(x, z, rotY, 0, 0.6);

  return {
    group,
    colliders: [
      { shape: 'circle', x: c1x, z: c1z, radius: 0.58 },
      { shape: 'circle', x: c2x, z: c2z, radius: 0.58 },
      { shape: 'circle', x: bkx, z: bkz, radius: 0.52 },
      { shape: 'box', x: alx, z: alz, halfW: 0.62, halfD: 0.62, rotY },
    ],
  };
}

/**
 * Southern Coast Landmark: Wooden fishing dock / pier over the sandy bay
 * with walkable elevated deck planks & solid mooring pilings.
 */
export function createCoastalPierLandmark(x: number, z: number, rotY = 0): LandmarkBuildResult {
  const y = Math.max(getTerrainHeight(x, z), -0.15);
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = rotY;

  const plankMat = new THREE.MeshStandardMaterial({ color: 0x9b7248, roughness: 0.88 });
  const pilingMat = new THREE.MeshStandardMaterial({ color: 0x5c3e24, roughness: 0.92 });
  const lanternMat = new THREE.MeshBasicMaterial({ color: 0xffe08a, fog: false });

  // Pier deck planks extending toward +Z (sea)
  for (let i = 0; i < 16; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.14, 0.54), plankMat);
    plank.position.set(0, 0.55, i * 0.64);
    group.add(plank);
  }
  const colliders: StaticCollider[] = [];
  // Support pilings (solid posts along pier sides)
  for (const sx of [-1.32, 1.32]) {
    for (let i = 0; i <= 4; i++) {
      const pzLocal = i * 2.45;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 2.3, 8), pilingMat);
      post.position.set(sx, 0.25, pzLocal);
      group.add(post);
      const [wx, wz] = localToWorldXZ(x, z, rotY, sx, pzLocal);
      colliders.push({ shape: 'circle', x: wx, z: wz, radius: 0.22 });
    }
  }
  // Dock end lantern post
  const tallPost = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.6, 8), pilingMat);
  tallPost.position.set(1.32, 1.85, 9.7);
  group.add(tallPost);
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.32), lanternMat);
  lamp.position.set(1.32, 3.05, 9.7);
  group.add(lamp);

  group.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });

  const [deckX, deckZ] = localToWorldXZ(x, z, rotY, 0, 4.8);
  return {
    group,
    colliders,
    decks: [
      {
        x: deckX,
        z: deckZ,
        halfW: 1.48,
        halfD: 5.25,
        rotY,
        topY: y + 0.62,
      },
    ],
  };
}

/**
 * Western Deep Forest Landmark: Giant fairy-forest red-capped mushrooms with solid stem collision.
 */
export function createForestMushroomGrove(x: number, z: number): LandmarkBuildResult {
  const y = getTerrainHeight(x, z);
  const group = new THREE.Group();
  group.position.set(x, y, z);

  const stemMat = new THREE.MeshStandardMaterial({ color: 0xf0e4cf, roughness: 0.85 });
  const capMat = new THREE.MeshStandardMaterial({ color: 0xc94238, roughness: 0.72 });
  const spotMat = new THREE.MeshStandardMaterial({ color: 0xfff6e5, roughness: 0.78 });

  const specs = [
    { ox: 0, oz: 0, h: 2.1, r: 1.25 },
    { ox: -1.25, oz: 0.8, h: 1.25, r: 0.78 },
    { ox: 1.15, oz: -0.65, h: 1.45, r: 0.9 },
  ];
  const colliders: StaticCollider[] = [];
  for (const s of specs) {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(s.r * 0.28, s.r * 0.38, s.h, 10), stemMat);
    stem.position.set(s.ox, s.h * 0.5, s.oz);
    group.add(stem);

    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(s.r, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
      capMat,
    );
    cap.position.set(s.ox, s.h * 0.92, s.oz);
    group.add(cap);

    for (let k = 0; k < 4; k++) {
      const ang = (k / 4) * Math.PI * 2 + s.ox;
      const spot = new THREE.Mesh(new THREE.SphereGeometry(s.r * 0.14, 7, 7), spotMat);
      spot.position.set(
        s.ox + Math.cos(ang) * s.r * 0.58,
        s.h * 0.92 + s.r * 0.62,
        s.oz + Math.sin(ang) * s.r * 0.58,
      );
      group.add(spot);
    }

    colliders.push({
      shape: 'circle',
      x: x + s.ox,
      z: z + s.oz,
      radius: s.r * 0.48,
    });
  }

  group.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });
  return { group, colliders };
}

/**
 * Northern Biome Landmark: Towering 10-Floor Trial Spire (시련의 탑)
 * Multi-tiered obsidian & rune-engraved spire with stepped plinth, flanking pillars,
 * glowing challenge portal arch, and floating animated rune crown rings.
 */
export function createTrialTowerLandmark(x: number, z: number): {
  landmark: WorldLandmark;
  colliders: StaticCollider[];
} {
  const y = getTerrainHeight(x, z);
  const group = new THREE.Group();
  group.position.set(x, y, z);

  const obsidianMat = new THREE.MeshStandardMaterial({
    color: 0x262d3b,
    roughness: 0.72,
    metalness: 0.28,
  });
  const trimStoneMat = new THREE.MeshStandardMaterial({
    color: 0x455168,
    roughness: 0.65,
    metalness: 0.32,
  });
  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xd9a74a,
    roughness: 0.34,
    metalness: 0.82,
  });
  const runeGlowMat = new THREE.MeshStandardMaterial({
    color: 0x7dd3fc,
    emissive: 0x38bdf8,
    emissiveIntensity: 1.4,
    roughness: 0.2,
  });
  const portalMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.56,
    side: THREE.DoubleSide,
  });

  // Stepped octagonal foundation plinth
  const plinth1 = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 6.2, 0.85, 8), trimStoneMat);
  plinth1.position.y = 0.42;
  group.add(plinth1);

  const plinth2 = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 5.1, 0.75, 8), obsidianMat);
  plinth2.position.y = 1.15;
  group.add(plinth2);

  // 3 stacked tapered spire tiers (evoking 10 ascending floors)
  const tier1 = new THREE.Mesh(new THREE.CylinderGeometry(3.45, 3.95, 6.2, 8), obsidianMat);
  tier1.position.y = 4.55;
  group.add(tier1);

  const cornice1 = new THREE.Mesh(new THREE.CylinderGeometry(3.9, 3.6, 0.48, 8), goldTrimMat);
  cornice1.position.y = 7.75;
  group.add(cornice1);

  const tier2 = new THREE.Mesh(new THREE.CylinderGeometry(2.65, 3.25, 5.4, 8), obsidianMat);
  tier2.position.y = 10.6;
  group.add(tier2);

  const cornice2 = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 2.75, 0.42, 8), goldTrimMat);
  cornice2.position.y = 13.45;
  group.add(cornice2);

  const tier3 = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 2.35, 4.6, 8), trimStoneMat);
  tier3.position.y = 15.9;
  group.add(tier3);

  const spireRoof = new THREE.Mesh(new THREE.ConeGeometry(2.2, 4.2, 8), obsidianMat);
  spireRoof.position.y = 20.2;
  group.add(spireRoof);

  // Glowing floor-level rune bands along the tower facade
  for (let i = 0; i < 4; i++) {
    const bandY = 3.2 + i * 3.5;
    const bandR = 3.72 - i * 0.42;
    const band = new THREE.Mesh(new THREE.TorusGeometry(bandR, 0.08, 6, 8), runeGlowMat);
    band.rotation.x = Math.PI / 2;
    band.position.y = bandY;
    group.add(band);
  }

  // 4 Flanking Rune Monolith Buttresses around plinth
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const px = Math.cos(ang) * 4.55;
    const pz = Math.sin(ang) * 4.55;
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.95, 5.6, 0.95), trimStoneMat);
    pillar.position.set(px, 3.3, pz);
    pillar.rotation.y = -ang;
    group.add(pillar);

    const brazier = new THREE.Mesh(new THREE.OctahedronGeometry(0.38, 0), runeGlowMat);
    brazier.position.set(px, 6.45, pz);
    group.add(brazier);
  }

  // Front Challenge Portal Arch facing South (+Z) toward the Trial Arena
  const archLeft = new THREE.Mesh(new THREE.BoxGeometry(0.62, 4.1, 0.72), goldTrimMat);
  archLeft.position.set(-1.55, 3.0, 3.85);
  group.add(archLeft);
  const archRight = new THREE.Mesh(new THREE.BoxGeometry(0.62, 4.1, 0.72), goldTrimMat);
  archRight.position.set(1.55, 3.0, 3.85);
  group.add(archRight);
  const archTop = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.68, 0.9), goldTrimMat);
  archTop.position.set(0, 5.18, 3.85);
  group.add(archTop);

  const portalCurtain = new THREE.Mesh(new THREE.PlaneGeometry(2.55, 3.85), portalMat);
  portalCurtain.position.set(0, 3.0, 3.82);
  group.add(portalCurtain);

  // Floating animated rune crown & summit crystal (rotated in engine loop via animatedPart)
  const animatedPart = new THREE.Group();
  animatedPart.position.set(0, 22.8, 0);

  const crownRing1 = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.11, 8, 24), runeGlowMat);
  crownRing1.rotation.x = Math.PI * 0.36;
  animatedPart.add(crownRing1);

  const crownRing2 = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.08, 8, 24), goldTrimMat);
  crownRing2.rotation.y = Math.PI * 0.4;
  crownRing2.rotation.x = -Math.PI * 0.32;
  animatedPart.add(crownRing2);

  const summitGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.75, 0), runeGlowMat);
  summitGem.scale.set(0.85, 1.5, 0.85);
  animatedPart.add(summitGem);
  group.add(animatedPart);

  // Subtle vertical sky beacon so the Northern Tower is recognizable from afar
  const beaconMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 1.15, 24, 10, 1, true), beaconMat);
  beacon.position.y = 33.5;
  beacon.raycast = () => {};
  group.add(beacon);

  const light = new THREE.PointLight(0x38bdf8, 2.2, 20, 1.5);
  light.position.set(0, 5.2, 5.2);
  group.add(light);

  group.traverse((c) => {
    if ((c as THREE.Mesh).isMesh && c !== beacon && c !== portalCurtain) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });

  const landmark: WorldLandmark = {
    id: 'landmark_trial_tower',
    kind: 'trial_tower',
    label: '시련의 탑 (1~30층)',
    actionLabel: '시련의 탑 입장',
    x,
    y,
    z,
    radius: 5.0,
    interactRadius: 8.8,
    group,
    animatedPart,
    light,
  };

  const colliders: StaticCollider[] = [
    { shape: 'circle', x, z, radius: 4.9 },
  ];

  return { landmark, colliders };
}

export const TRIAL_DUNGEON_X = 640;
export const TRIAL_DUNGEON_Y = 56;
export const TRIAL_DUNGEON_Z = -640;
export const TRIAL_DUNGEON_RADIUS = 18.5;

export interface TrialDungeonArenaRig {
  group: THREE.Group;
  sealRing: THREE.Mesh;
  portalRing: THREE.Mesh;
  setFloorTheme: (floor: number, accentHex: string) => void;
}

/**
 * Isolated elevated 3D Trial Tower Dungeon Chamber at (640, 56, -640).
 * Octagonal obsidian & gilded rune hall with 8 brazier columns, glowing floor seal,
 * ascending stone staircase & next-floor portal arch so climbing floors feels like
 * ascending inside a separate tower sanctuary.
 */
export function createTrialDungeonArena(): TrialDungeonArenaRig {
  const group = new THREE.Group();
  group.position.set(TRIAL_DUNGEON_X, TRIAL_DUNGEON_Y, TRIAL_DUNGEON_Z);

  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x1a1e28,
    roughness: 0.72,
    metalness: 0.25,
  });
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x252b3b,
    roughness: 0.78,
    metalness: 0.22,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xd9a74a,
    roughness: 0.34,
    metalness: 0.82,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x38bdf8,
    emissiveIntensity: 1.55,
    roughness: 0.2,
  });
  const sealMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.42,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  // Main octagonal dungeon floor slab + outer parapet ring
  const floorDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(TRIAL_DUNGEON_RADIUS + 0.8, TRIAL_DUNGEON_RADIUS + 1.4, 1.4, 8),
    floorMat,
  );
  floorDisc.position.y = -0.7;
  floorDisc.receiveShadow = true;
  group.add(floorDisc);

  const innerRing = new THREE.Mesh(
    new THREE.RingGeometry(6.8, 7.35, 32),
    sealMat,
  );
  innerRing.rotation.x = -Math.PI / 2;
  innerRing.position.y = 0.05;
  group.add(innerRing);

  const sealRing = new THREE.Mesh(
    new THREE.RingGeometry(11.4, 12.15, 8),
    sealMat,
  );
  sealRing.rotation.x = -Math.PI / 2;
  sealRing.position.y = 0.06;
  group.add(sealRing);

  // Enclosing vaulted dungeon wall panels & 8 lit rune pillars
  const lights: THREE.PointLight[] = [];
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const px = Math.cos(ang) * (TRIAL_DUNGEON_RADIUS - 0.6);
    const pz = Math.sin(ang) * (TRIAL_DUNGEON_RADIUS - 0.6);

    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.92, 13.5, 6), wallMat);
    pillar.position.set(px, 6.75, pz);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    group.add(pillar);

    const capital = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.55, 2.1), goldMat);
    capital.position.set(px, 13.5, pz);
    group.add(capital);

    // Floating elemental brazier flame on every pillar
    const brazier = new THREE.Mesh(new THREE.OctahedronGeometry(0.52, 0), glowMat);
    brazier.position.set(px * 0.9, 5.2, pz * 0.9);
    group.add(brazier);

    // Wall panel between pillars (tower chamber enclosure)
    const wallAng = (i / 8) * Math.PI * 2;
    const wx = Math.cos(wallAng) * (TRIAL_DUNGEON_RADIUS + 0.15);
    const wz = Math.sin(wallAng) * (TRIAL_DUNGEON_RADIUS + 0.15);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(15.2, 13.8, 0.8), wallMat);
    wall.position.set(wx, 6.9, wz);
    wall.rotation.y = -wallAng + Math.PI / 2;
    wall.receiveShadow = true;
    group.add(wall);

    // Luminous vertical rune strip along each wall
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.32, 9.4, 0.92), glowMat);
    strip.position.set(wx * 0.985, 6.8, wz * 0.985);
    strip.rotation.y = -wallAng + Math.PI / 2;
    group.add(strip);

    if (i % 2 === 0) {
      const pt = new THREE.PointLight(0x38bdf8, 3.2, 28, 1.4);
      pt.position.set(px * 0.78, 7.0, pz * 0.78);
      group.add(pt);
      lights.push(pt);
    }
  }

  // Upper vaulted ceiling rim (open central skylight oculus so tower feels massive)
  const ceilingRim = new THREE.Mesh(
    new THREE.TorusGeometry(TRIAL_DUNGEON_RADIUS - 1.2, 1.45, 8, 8),
    wallMat,
  );
  ceilingRim.rotation.x = Math.PI / 2;
  ceilingRim.position.y = 14.0;
  group.add(ceilingRim);

  // Northern Ascending Staircase & Next-Floor Portal Arch (-Z side of dungeon)
  for (let s = 0; s < 5; s++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(6.4 - s * 0.35, 0.45, 1.15), wallMat);
    step.position.set(0, 0.22 + s * 0.42, -13.2 - s * 0.92);
    step.receiveShadow = true;
    group.add(step);
  }
  const archLeft = new THREE.Mesh(new THREE.BoxGeometry(0.68, 5.4, 0.78), goldMat);
  archLeft.position.set(-2.2, 4.5, -16.8);
  group.add(archLeft);
  const archRight = new THREE.Mesh(new THREE.BoxGeometry(0.68, 5.4, 0.78), goldMat);
  archRight.position.set(2.2, 4.5, -16.8);
  group.add(archRight);
  const archTop = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.75, 0.95), goldMat);
  archTop.position.set(0, 7.3, -16.8);
  group.add(archTop);

  const portalRing = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.14, 10, 28), glowMat);
  portalRing.position.set(0, 4.4, -16.6);
  group.add(portalRing);

  const centerLight = new THREE.PointLight(0x38bdf8, 4.5, 36, 1.3);
  centerLight.position.set(0, 11.5, 0);
  group.add(centerLight);
  lights.push(centerLight);

  const setFloorTheme = (floor: number, accentHex: string) => {
    const col = new THREE.Color(accentHex);
    glowMat.color.copy(col);
    glowMat.emissive.copy(col);
    glowMat.emissiveIntensity = 1.45 + Math.min(1.1, floor * 0.035);
    sealMat.color.copy(col);
    sealMat.opacity = 0.36 + Math.min(0.28, floor * 0.008);
    for (const l of lights) {
      l.color.copy(col);
      l.intensity = l === centerLight ? 4.4 + floor * 0.05 : 3.2 + floor * 0.04;
    }
    // Deepen stone tone as player climbs higher floors
    const shade = Math.max(0.07, 0.14 - floor * 0.0022);
    floorMat.color.setHSL(0.62, 0.22, shade);
  };

  return { group, sealRing, portalRing, setFloorTheme };
}

export interface WaterfallEnvLight {
  sunDir: THREE.Vector3;
  sunColor: THREE.Color;
  skyHorizon: THREE.Color;
  skyZenith: THREE.Color;
  fogColor: THREE.Color;
  fogDensity: number;
  nightFactor: number;
}

export interface ScenicWaterfallRig {
  group: THREE.Group;
  focalX: number;
  focalY: number;
  focalZ: number;
  colliders: StaticCollider[];
  update: (
    dt: number,
    elapsed: number,
    reducedEffects?: boolean,
    envLight?: WaterfallEnvLight,
  ) => void;
}

/**
 * Generates a tileable vertical rushing-water & foam CanvasTexture for the waterfall curtains.
 */
function createWaterfallFlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Base cyan-azure translucent gradient with soft feathered side edges
  const hGrad = ctx.createLinearGradient(0, 0, 128, 0);
  hGrad.addColorStop(0.0, 'rgba(130, 224, 255, 0.0)');
  hGrad.addColorStop(0.14, 'rgba(116, 218, 252, 0.78)');
  hGrad.addColorStop(0.5, 'rgba(174, 240, 255, 0.92)');
  hGrad.addColorStop(0.86, 'rgba(116, 218, 252, 0.78)');
  hGrad.addColorStop(1.0, 'rgba(130, 224, 255, 0.0)');
  ctx.fillStyle = hGrad;
  ctx.fillRect(0, 0, 128, 256);

  // Flowing white-water aerated vertical streaks (tileable vertically)
  for (let i = 0; i < 42; i++) {
    const sx = 12 + ((i * 37) % 104);
    const sy = (i * 53) % 256;
    const sw = 2.5 + (i % 4) * 1.9;
    const sh = 38 + (i % 5) * 26;
    const alpha = 0.28 + (i % 3) * 0.18;
    const grad = ctx.createLinearGradient(sx, sy, sx, sy + sh);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.35, `rgba(244,252,255,${alpha.toFixed(2)})`);
    grad.addColorStop(0.7, `rgba(255,255,255,${(alpha * 0.9).toFixed(2)})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(sx, sy, sw, sh);
    if (sy + sh > 256) {
      ctx.fillRect(sx, sy - 256, sw, sh);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1.35);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Generates a delicate sunlit rainbow mist gradient texture for the waterfall spray arc.
 */
function createRainbowMistTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  const vGrad = ctx.createLinearGradient(0, 0, 0, 64);
  vGrad.addColorStop(0.0, 'rgba(255, 110, 110, 0.0)');
  vGrad.addColorStop(0.18, 'rgba(255, 132, 118, 0.42)');
  vGrad.addColorStop(0.34, 'rgba(255, 214, 112, 0.46)');
  vGrad.addColorStop(0.5, 'rgba(134, 245, 168, 0.44)');
  vGrad.addColorStop(0.68, 'rgba(108, 212, 255, 0.42)');
  vGrad.addColorStop(0.84, 'rgba(168, 134, 255, 0.32)');
  vGrad.addColorStop(1.0, 'rgba(168, 134, 255, 0.0)');
  ctx.fillStyle = vGrad;
  ctx.fillRect(0, 0, 128, 64);

  // Soft horizontal fade at both ends of the rainbow arc
  ctx.globalCompositeOperation = 'destination-in';
  const hGrad = ctx.createLinearGradient(0, 0, 128, 0);
  hGrad.addColorStop(0.0, 'rgba(0,0,0,0)');
  hGrad.addColorStop(0.22, 'rgba(0,0,0,1)');
  hGrad.addColorStop(0.78, 'rgba(0,0,0,1)');
  hGrad.addColorStop(1.0, 'rgba(0,0,0,0)');
  ctx.fillStyle = hGrad;
  ctx.fillRect(0, 0, 128, 64);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * High-craft procedural Scenic Waterfall Cliff & Plunge Pool Vista
 * overlooking the central emerald lake at (31.5, 13.5), showcased both
 * during the rotating main-menu camera pan and during live exploration.
 */
export function createScenicWaterfallLandmark(): ScenicWaterfallRig {
  const x = 31.5;
  const z = 13.5;
  const baseY = getTerrainHeight(x, z);

  const group = new THREE.Group();
  group.position.set(x, baseY, z);
  // Orient waterfall front toward the lake / village valley (-X, +Z)
  group.rotation.y = -Math.PI * 0.72;

  const cliffStoneMat = new THREE.MeshStandardMaterial({
    color: 0x5c6670,
    roughness: 0.9,
    metalness: 0.04,
    flatShading: true,
  });
  const darkSlateMat = new THREE.MeshStandardMaterial({
    color: 0x3a434e,
    roughness: 0.86,
    metalness: 0.07,
    flatShading: true,
  });
  // Wet glistening dark rock immediately behind the waterfall cascade
  const wetRockMat = new THREE.MeshStandardMaterial({
    color: 0x26313b,
    roughness: 0.26,
    metalness: 0.16,
    flatShading: true,
  });
  const mossCapMat = new THREE.MeshStandardMaterial({
    color: 0x4c8c42,
    roughness: 0.92,
    metalness: 0.0,
    flatShading: true,
  });
  const vineMat = new THREE.MeshStandardMaterial({
    color: 0x3b7a38,
    roughness: 0.88,
  });

  const flowTex = createWaterfallFlowTexture();
  const waterSheetMat = new THREE.MeshStandardMaterial({
    map: flowTex,
    color: 0xdff8ff,
    emissive: 0x1d6c88,
    emissiveIntensity: 0.34,
    roughness: 0.18,
    metalness: 0.08,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const foamMat = new THREE.MeshBasicMaterial({
    color: 0xf0fbff,
    transparent: true,
    opacity: 0.74,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const upperPoolMat = new THREE.MeshStandardMaterial({
    color: 0x38bdd8,
    emissive: 0x0f5a75,
    emissiveIntensity: 0.28,
    roughness: 0.14,
    metalness: 0.16,
    transparent: true,
    opacity: 0.88,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x7d5131,
    roughness: 0.84,
  });
  const lanternGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffe6a3,
    emissive: 0xffb74d,
    emissiveIntensity: 1.65,
    roughness: 0.28,
  });
  const blossomMat = new THREE.MeshStandardMaterial({
    color: 0xf9a8d4,
    emissive: 0x5c1d3d,
    emissiveIntensity: 0.14,
    roughness: 0.8,
    flatShading: true,
  });
  const pineMat = new THREE.MeshStandardMaterial({
    color: 0x2d6845,
    roughness: 0.88,
    flatShading: true,
  });

  // 1) Tiered cliff monoliths forming a natural sculpted horseshoe gorge
  const cliffSpecs: Array<[number, number, number, number, number, number, number, boolean]> = [
    [0, 5.2, -3.6, 5.8, 11.6, 4.5, 0, true],
    [-4.3, 4.5, -2.2, 4.1, 9.9, 3.9, 0.3, false],
    [4.4, 4.7, -2.0, 4.2, 10.1, 3.9, -0.28, false],
    [-6.2, 2.8, 0.9, 3.3, 6.4, 3.3, 0.52, false],
    [6.1, 3.0, 1.1, 3.4, 6.7, 3.2, -0.45, false],
    [0, 9.6, -4.7, 6.8, 3.4, 4.4, 0.08, false],
    [-2.5, 2.2, -2.0, 2.4, 4.8, 2.2, 0.2, true],
    [2.6, 2.3, -1.9, 2.3, 4.6, 2.2, -0.22, true],
  ];
  for (let i = 0; i < cliffSpecs.length; i++) {
    const [cx, cy, cz, sx, sy, sz, ry, isWet] = cliffSpecs[i];
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1, 1),
      isWet ? wetRockMat : i % 2 === 0 ? cliffStoneMat : darkSlateMat,
    );
    rock.scale.set(sx * 0.56, sy * 0.56, sz * 0.56);
    rock.position.set(cx, cy, cz);
    rock.rotation.set(0.08 * (i % 3), ry, 0.05 * ((i + 1) % 2));
    rock.receiveShadow = true;
    group.add(rock);

    // Lush mossy green terrace cap on upper ledges
    if (cy > 2.5) {
      const moss = new THREE.Mesh(new THREE.CylinderGeometry(sx * 0.43, sx * 0.49, 0.58, 7), mossCapMat);
      moss.position.set(cx, cy + sy * 0.46, cz + 0.15);
      moss.rotation.y = ry;
      moss.receiveShadow = true;
      group.add(moss);
    }
  }

  // Hanging cliff vines draping down the rock ledges
  const vinePositions: Array<[number, number, number, number]> = [
    [-3.1, 8.6, -0.8, 2.8],
    [-4.8, 7.6, -0.4, 2.4],
    [3.2, 8.8, -0.7, 3.1],
    [4.9, 7.8, -0.2, 2.2],
    [-1.7, 9.6, -1.3, 1.9],
    [1.8, 9.5, -1.2, 2.1],
  ];
  for (let i = 0; i < vinePositions.length; i++) {
    const [vx, vy, vz, len] = vinePositions[i];
    const vine = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.025, len, 5), vineMat);
    vine.position.set(vx, vy - len * 0.5, vz);
    vine.rotation.z = Math.sin(i * 1.9) * 0.1;
    group.add(vine);
  }

  // Upper spring basin feeding the main cascade
  const upperBasin = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.7, 0.35, 16), upperPoolMat);
  upperBasin.position.set(0, 9.9, -2.4);
  group.add(upperBasin);

  // 2) Multi-tier animated waterfall sheets with scrolling rushing-foam texture
  const cascadeStrips: Array<{ mesh: THREE.Mesh; baseY: number; phase: number; amp: number }> = [];
  const mainCurtain = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 10.3, 4, 8), waterSheetMat);
  mainCurtain.position.set(0, 4.95, -0.92);
  mainCurtain.rotation.x = -0.11;
  mainCurtain.renderOrder = 3;
  group.add(mainCurtain);
  cascadeStrips.push({ mesh: mainCurtain, baseY: 4.95, phase: 0, amp: 0.08 });

  const sideCurtainL = new THREE.Mesh(new THREE.PlaneGeometry(1.48, 7.7, 2, 6), waterSheetMat);
  sideCurtainL.position.set(-2.35, 3.72, -0.32);
  sideCurtainL.rotation.set(-0.14, 0.22, 0.04);
  sideCurtainL.renderOrder = 3;
  group.add(sideCurtainL);
  cascadeStrips.push({ mesh: sideCurtainL, baseY: 3.72, phase: 1.7, amp: 0.07 });

  const sideCurtainR = new THREE.Mesh(new THREE.PlaneGeometry(1.26, 6.9, 2, 6), waterSheetMat);
  sideCurtainR.position.set(2.3, 3.35, -0.22);
  sideCurtainR.rotation.set(-0.13, -0.24, -0.04);
  sideCurtainR.renderOrder = 3;
  group.add(sideCurtainR);
  cascadeStrips.push({ mesh: sideCurtainR, baseY: 3.35, phase: 3.1, amp: 0.07 });

  // Vertical foaming white-water streaks falling down the cascade
  const foamStreaks: Array<{ mesh: THREE.Mesh; speed: number; offset: number; x: number; z: number; maxH: number }> = [];
  const streakGeo = new THREE.PlaneGeometry(0.4, 1.95);
  for (let i = 0; i < 10; i++) {
    const isSide = i >= 7;
    const sx = isSide ? (i % 2 === 0 ? -2.3 : 2.25) : -1.4 + (i / 6) * 2.8;
    const sz = isSide ? -0.1 : -0.74 + Math.abs(sx) * 0.06;
    const streak = new THREE.Mesh(streakGeo, foamMat);
    streak.position.set(sx, 2 + (i % 5) * 1.6, sz);
    streak.rotation.x = -0.12;
    streak.renderOrder = 4;
    group.add(streak);
    foamStreaks.push({
      mesh: streak,
      speed: 4.9 + (i % 4) * 1.15,
      offset: i * 1.37,
      x: sx,
      z: sz,
      maxH: isSide ? 6.6 : 9.4,
    });
  }

  // 3) Soft Edge-Feathered & Sun-Glinting Plunge Pool (eliminates hard flat circle seam!)
  const plungeWater = createStylizedWaterMaterial({
    shallowHex: 0x5be8df,
    deepHex: 0x1078a6,
    foamHex: 0xf4feff,
    waveScale: 0.65,
    sunReflectStrength: 1.4,
  });

  const poolGeom = new THREE.PlaneGeometry(16.8, 15.2, 28, 28);
  poolGeom.rotateX(-Math.PI / 2);
  const pPos = poolGeom.attributes.position as THREE.BufferAttribute;
  const pDepths = new Float32Array(pPos.count);
  const pFades = new Float32Array(pPos.count);
  for (let i = 0; i < pPos.count; i++) {
    const lx = pPos.getX(i);
    const lz = pPos.getZ(i);
    // Organic elliptical basin radius with gentle shoreline undulation
    const angle = Math.atan2(lz, lx);
    const organicRim = 1 + Math.sin(angle * 3 + 0.6) * 0.08 + Math.cos(angle * 5 - 0.4) * 0.05;
    const normDist = Math.hypot(lx / (7.2 * organicRim), lz / (6.3 * organicRim));
    // Deepest right under the waterfall impact, shoaling cleanly to 0 at shoreline
    const basinDepth = Math.max(-0.18, (1 - normDist * normDist) * 2.15);
    pDepths[i] = basinDepth;
    pFades[i] = Math.max(0, Math.min(1, (1.02 - normDist) / 0.24));
  }
  poolGeom.setAttribute('aDepth', new THREE.BufferAttribute(pDepths, 1));
  poolGeom.setAttribute('aEdgeFade', new THREE.BufferAttribute(pFades, 1));

  const plungePool = new THREE.Mesh(poolGeom, plungeWater.material);
  plungePool.position.set(0, 0.14, 3.4);
  plungePool.renderOrder = 2;
  group.add(plungePool);

  // Expanding plunge ripple rings
  const rippleRings: Array<{ mesh: THREE.Mesh; phase: number; mat: THREE.MeshBasicMaterial }> = [];
  for (let i = 0; i < 3; i++) {
    const rMat = new THREE.MeshBasicMaterial({
      color: 0xe6faff,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.92, 1.28, 28), rMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0.19 + i * 0.01, 0.35);
    ring.renderOrder = 3;
    group.add(ring);
    rippleRings.push({ mesh: ring, phase: i / 3, mat: rMat });
  }

  // Soft sunlit waterfall rainbow mist arc suspended in the spray
  const rainbowTex = createRainbowMistTexture();
  const rainbowMat = new THREE.MeshBasicMaterial({
    map: rainbowTex,
    transparent: true,
    opacity: 0.48,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const rainbowGeo = new THREE.RingGeometry(2.6, 3.65, 28, 1, 0.18, Math.PI - 0.36);
  const rainbowMesh = new THREE.Mesh(rainbowGeo, rainbowMat);
  rainbowMesh.position.set(0.35, 1.35, 1.35);
  rainbowMesh.rotation.set(-0.12, 0.15, 0);
  rainbowMesh.renderOrder = 4;
  group.add(rainbowMesh);

  // Soft rising spray mist puffs
  const mistPuffs: Array<{ mesh: THREE.Mesh; baseX: number; baseZ: number; phase: number }> = [];
  const mistGeo = new THREE.DodecahedronGeometry(0.84, 1);
  const mistMat = new THREE.MeshBasicMaterial({
    color: 0xf0fbff,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
  });
  for (let i = 0; i < 9; i++) {
    const puff = new THREE.Mesh(mistGeo, mistMat);
    const bx = (i - 4) * 0.8;
    const bz = -0.15 + (i % 3) * 0.62;
    puff.position.set(bx, 0.6, bz);
    puff.renderOrder = 4;
    group.add(puff);
    mistPuffs.push({ mesh: puff, baseX: bx, baseZ: bz, phase: i * 0.78 });
  }

  // Floating water lily pads & lotus blossoms on the tranquil plunge pool
  const lilyPadMat = new THREE.MeshStandardMaterial({ color: 0x388e3c, roughness: 0.72 });
  const lotusPinkMat = new THREE.MeshStandardMaterial({
    color: 0xf9a8d4,
    emissive: 0x5c1d3d,
    emissiveIntensity: 0.22,
    roughness: 0.6,
  });
  const lotusWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xfff8f0,
    emissive: 0x5c4b32,
    emissiveIntensity: 0.18,
    roughness: 0.6,
  });
  const lilyCoords: Array<[number, number, number, boolean]> = [
    [-3.1, 3.8, 0.58, true],
    [-2.4, 4.7, 0.44, false],
    [3.2, 4.1, 0.56, true],
    [2.6, 5.1, 0.42, false],
    [-3.8, 2.2, 0.48, false],
    [3.9, 2.5, 0.5, true],
  ];
  const lilyPads: Array<{ group: THREE.Group; baseY: number; phase: number }> = [];
  const padGeo = new THREE.CylinderGeometry(1, 1, 0.04, 12, 1, false, 0.22, Math.PI * 1.88);
  for (let i = 0; i < lilyCoords.length; i++) {
    const [lx, lz, sc, hasFlower] = lilyCoords[i];
    const lg = new THREE.Group();
    lg.position.set(lx, 0.18, lz);
    lg.rotation.y = i * 1.35;
    const pad = new THREE.Mesh(padGeo, lilyPadMat);
    pad.scale.set(sc, 1, sc);
    lg.add(pad);
    if (hasFlower) {
      const fMat = i % 2 === 0 ? lotusPinkMat : lotusWhiteMat;
      const center = new THREE.Mesh(new THREE.SphereGeometry(0.11, 7, 6), lanternGlowMat);
      center.position.y = 0.08;
      lg.add(center);
      for (let p = 0; p < 5; p++) {
        const ang = (p / 5) * Math.PI * 2;
        const petal = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 5), fMat);
        petal.position.set(Math.cos(ang) * 0.14, 0.1, Math.sin(ang) * 0.14);
        petal.rotation.set(Math.sin(ang) * 0.65, 0, -Math.cos(ang) * 0.65);
        lg.add(petal);
      }
    }
    group.add(lg);
    lilyPads.push({ group: lg, baseY: 0.18, phase: i * 1.2 });
  }

  // 4) Scenic wooden arch bridge spanning the lower pool outlet + glowing stone lanterns
  const bridgeGroup = new THREE.Group();
  bridgeGroup.position.set(0, 0.42, 7.6);
  for (let p = -3; p <= 3; p++) {
    const archY = Math.cos((p / 3.4) * Math.PI * 0.5) * 0.58;
    const plank = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.14, 2.25), woodMat);
    plank.position.set(p * 1.05, archY, 0);
    plank.rotation.z = -p * 0.08;
    bridgeGroup.add(plank);
  }
  for (const side of [-1, 1]) {
    for (const px of [-3.1, 0, 3.1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.05, 0.16), woodMat);
      post.position.set(px, px === 0 ? 0.95 : 0.52, side * 1.02);
      bridgeGroup.add(post);
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.11, 0.11), woodMat);
    rail.position.set(0, 1.28, side * 1.02);
    bridgeGroup.add(rail);
  }
  group.add(bridgeGroup);

  // Pair of warm mossy stone lanterns flanking the bridge
  for (const side of [-1, 1]) {
    const lx = side * 4.4;
    const lz = 6.2;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 1.15, 6), darkSlateMat);
    base.position.set(lx, 0.6, lz);
    group.add(base);
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.42, 0.38), lanternGlowMat);
    bulb.position.set(lx, 1.35, lz);
    group.add(bulb);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.36, 6), darkSlateMat);
    cap.position.set(lx, 1.72, lz);
    group.add(cap);
  }

  // 5) Flanking cliff-top blossom & pine trees for rich silhouette framing
  const addCliffTree = (tx: number, ty: number, tz: number, blossom: boolean, scale = 1) => {
    const tree = new THREE.Group();
    tree.position.set(tx, ty, tz);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * scale, 0.28 * scale, 2.6 * scale, 6), woodMat);
    trunk.position.y = 1.3 * scale;
    tree.add(trunk);
    if (blossom) {
      const crown1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.55 * scale, 1), blossomMat);
      crown1.position.set(0, 2.9 * scale, 0);
      tree.add(crown1);
      const crown2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.05 * scale, 1), blossomMat);
      crown2.position.set(0.8 * scale, 2.5 * scale, 0.4 * scale);
      tree.add(crown2);
      const crown3 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.92 * scale, 1), blossomMat);
      crown3.position.set(-0.75 * scale, 2.4 * scale, -0.35 * scale);
      tree.add(crown3);
    } else {
      for (let c = 0; c < 3; c++) {
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry((1.5 - c * 0.32) * scale, (1.85 - c * 0.2) * scale, 7),
          pineMat,
        );
        cone.position.y = (2.1 + c * 1.1) * scale;
        tree.add(cone);
      }
    }
    group.add(tree);
  };

  addCliffTree(-4.3, 8.8, -2.4, true, 1.18);
  addCliffTree(4.6, 9.0, -2.1, false, 1.18);
  addCliffTree(-6.5, 5.1, 1.4, false, 1.0);
  addCliffTree(6.3, 5.4, 1.6, true, 1.08);
  addCliffTree(-2.2, 10.6, -4.5, false, 0.92);
  addCliffTree(2.4, 10.5, -4.4, true, 0.96);

  // 6) Natural mossy shoreline boulders & cattail reeds wrapping the plunge pool edge
  const reedStemMat = new THREE.MeshStandardMaterial({ color: 0x4c8a3d, roughness: 0.85 });
  const reedTipMat = new THREE.MeshStandardMaterial({ color: 0x6b4426, roughness: 0.9 });
  const reedClumps: Array<{ group: THREE.Group; phase: number }> = [];

  for (let i = 0; i < 12; i++) {
    const ang = -Math.PI * 0.16 + (i / 11) * Math.PI * 1.32;
    const r = 6.3 + (i % 2) * 0.95;
    const bx = Math.cos(ang) * r;
    const bz = 3.2 + Math.sin(ang) * r * 0.78;
    const b = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.62 + (i % 3) * 0.26, 0),
      i % 3 === 0 ? wetRockMat : i % 2 === 0 ? cliffStoneMat : darkSlateMat,
    );
    b.position.set(bx, 0.24, bz);
    b.scale.set(1.25, 0.62, 1.05);
    b.rotation.y = i * 0.7;
    group.add(b);

    // Tuck swaying lakeside reeds next to every other boulder
    if (i % 2 === 1) {
      const clump = new THREE.Group();
      clump.position.set(bx * 0.92, 0.1, bz * 0.94);
      for (let s = 0; s < 4; s++) {
        const h = 0.85 + (s % 3) * 0.28;
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.032, h, 4), reedStemMat);
        stem.position.set((s - 1.5) * 0.12, h * 0.5, (s % 2) * 0.1);
        stem.rotation.z = (s - 1.5) * 0.09;
        clump.add(stem);
        if (s % 2 === 0) {
          const tip = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.18, 3, 5), reedTipMat);
          tip.position.set((s - 1.5) * 0.13, h - 0.12, (s % 2) * 0.1);
          clump.add(tip);
        }
      }
      group.add(clump);
      reedClumps.push({ group: clump, phase: i * 0.9 });
    }
  }

  // 7) Drifting sunlit cherry blossom petals across the waterfall valley
  const petalMat = new THREE.MeshBasicMaterial({
    color: 0xffcce5,
    transparent: true,
    opacity: 0.82,
    side: THREE.DoubleSide,
  });
  const petalGeo = new THREE.PlaneGeometry(0.14, 0.09);
  const petals: Array<{
    mesh: THREE.Mesh;
    baseX: number;
    baseY: number;
    baseZ: number;
    speed: number;
    phase: number;
  }> = [];
  for (let i = 0; i < 16; i++) {
    const pm = new THREE.Mesh(petalGeo, petalMat);
    const bx = (Math.random() - 0.5) * 14;
    const by = 2.5 + Math.random() * 8.5;
    const bz = -1.5 + Math.random() * 10;
    pm.position.set(bx, by, bz);
    group.add(pm);
    petals.push({
      mesh: pm,
      baseX: bx,
      baseY: by,
      baseZ: bz,
      speed: 0.45 + Math.random() * 0.45,
      phase: Math.random() * Math.PI * 2,
    });
  }

  const update = (
    dt: number,
    elapsed: number,
    reducedEffects = false,
    envLight?: WaterfallEnvLight,
  ) => {
    // Scroll rushing foam texture down the waterfall sheets
    flowTex.offset.y = (elapsed * 0.95) % 1;

    // Sync plunge pool water shader with live sun reflection & fog
    const pu = plungeWater.uniforms;
    pu.uTime.value = elapsed;
    if (envLight) {
      pu.uSunDir.value.copy(envLight.sunDir);
      pu.uSunColor.value.copy(envLight.sunColor);
      pu.uSkyHorizon.value.copy(envLight.skyHorizon);
      pu.uSkyZenith.value.copy(envLight.skyZenith);
      pu.uFogColor.value.copy(envLight.fogColor);
      pu.uFogDensity.value = envLight.fogDensity;
      pu.uNightFactor.value = envLight.nightFactor;

      // Rainbow mist glows warmly during sunny daytime and fades gently at night
      const daySun = Math.max(0, 1 - envLight.nightFactor * 1.45) * Math.max(0, Math.min(1, envLight.sunDir.y * 2.6));
      rainbowMesh.visible = !reducedEffects && daySun > 0.08;
      rainbowMat.opacity = daySun * (0.42 + Math.sin(elapsed * 0.8) * 0.05);
    }

    for (let i = 0; i < cascadeStrips.length; i++) {
      const strip = cascadeStrips[i];
      strip.mesh.scale.x = 1 + Math.sin(elapsed * 4.2 + strip.phase) * 0.03;
      strip.mesh.position.y = strip.baseY + Math.sin(elapsed * 7.2 + strip.phase) * strip.amp;
    }

    for (let i = 0; i < foamStreaks.length; i++) {
      const st = foamStreaks[i];
      if (reducedEffects && i >= 5) {
        st.mesh.visible = false;
        continue;
      }
      st.mesh.visible = true;
      const cycle = ((elapsed * st.speed + st.offset) % st.maxH) / st.maxH;
      st.mesh.position.y = st.maxH * (1 - cycle) + 0.5;
      st.mesh.scale.y = 0.72 + cycle * 0.72;
    }

    for (let i = 0; i < rippleRings.length; i++) {
      const rr = rippleRings[i];
      const p = (elapsed * 0.54 + rr.phase) % 1;
      const scale = 0.65 + p * 3.8;
      rr.mesh.scale.set(scale, scale, 1);
      rr.mat.opacity = (1 - p) * 0.5;
    }

    for (let i = 0; i < mistPuffs.length; i++) {
      const mp = mistPuffs[i];
      if (reducedEffects && i >= 3) {
        mp.mesh.visible = false;
        continue;
      }
      mp.mesh.visible = true;
      const p = (elapsed * 0.48 + mp.phase) % 1;
      mp.mesh.position.set(
        mp.baseX + Math.sin(elapsed * 1.3 + mp.phase) * 0.48,
        0.35 + p * 2.5,
        mp.baseZ + p * 1.45,
      );
      const s = 0.55 + Math.sin(p * Math.PI) * 1.08;
      mp.mesh.scale.setScalar(s);
    }

    // Gentle bobbing lily pads & swaying lakeside reeds
    for (let i = 0; i < lilyPads.length; i++) {
      const lp = lilyPads[i];
      lp.group.position.y = lp.baseY + Math.sin(elapsed * 1.7 + lp.phase) * 0.025;
      lp.group.rotation.z = Math.sin(elapsed * 1.3 + lp.phase) * 0.03;
    }
    for (let i = 0; i < reedClumps.length; i++) {
      const rc = reedClumps[i];
      rc.group.rotation.z = Math.sin(elapsed * 1.85 + rc.phase) * 0.065;
      rc.group.rotation.x = Math.cos(elapsed * 1.35 + rc.phase) * 0.04;
    }

    // Drifting cherry blossom petals
    for (let i = 0; i < petals.length; i++) {
      const pt = petals[i];
      if (reducedEffects && i >= 6) {
        pt.mesh.visible = false;
        continue;
      }
      pt.mesh.visible = true;
      const fallCycle = ((elapsed * pt.speed + pt.phase) % 10) / 10;
      pt.mesh.position.set(
        pt.baseX + Math.sin(elapsed * 1.1 + pt.phase) * 1.6 - fallCycle * 2.2,
        10.5 - fallCycle * 9.8,
        pt.baseZ + Math.cos(elapsed * 0.9 + pt.phase) * 1.4 + fallCycle * 1.5,
      );
      pt.mesh.rotation.x += dt * 1.4;
      pt.mesh.rotation.y += dt * 1.1;
    }
  };

  const colliders: StaticCollider[] = [
    { shape: 'circle', x: x + 2.4, z: z - 2.6, radius: 4.8 },
    { shape: 'circle', x: x - 1.5, z: z - 4.2, radius: 3.4 },
    { shape: 'circle', x: x + 4.8, z: z + 0.4, radius: 3.2 },
  ];

  return {
    group,
    focalX: x - 1.5,
    focalY: baseY + 4.8,
    focalZ: z + 1.5,
    colliders,
    update,
  };
}




