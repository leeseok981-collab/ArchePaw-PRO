import * as THREE from 'three';

export const CENTRAL_LAKE_X = 20.0;
export const CENTRAL_LAKE_Z = 20.0;
export const CENTRAL_LAKE_RADIUS = 10.5;
export const WATER_LEVEL_LAKE = -0.34;
export const WATER_LEVEL_COAST = -0.44;
export const WATER_LEVEL_OASIS = 1.65;
export const WATER_LEVEL_VALLEY_POND = 0.65;

// Desert Oasis Pool (North -Z) & Wind Valley Pond (West -X)
export const NORTH_OASIS_X = -28.0;
export const NORTH_OASIS_Z = -68.0;
export const NORTH_OASIS_RADIUS = 11.5;

export const WEST_POND_X = -62.0;
export const WEST_POND_Z = 24.0;
export const WEST_POND_RADIUS = 10.0;

// Eastern Sea Pier (East +X shoreline)
export const COAST_PIER_X = 88.0;
export const COAST_PIER_Z = 14.0;

/**
 * Returns true if (x, z) lies on the wooden eastern coastal fishing pier deck.
 */
export function isOnCoastalPier(x: number, z: number): boolean {
  const dx = x - COAST_PIER_X;
  const dz = z - COAST_PIER_Z;
  return dx >= -1.2 && dx <= 11.2 && Math.abs(dz) <= 1.65;
}

/**
 * Returns the water surface Y level at (x, z) if inside a swimmable/wadeable body of water, else null.
 * Covers: Central Lake, Eastern Ocean (+X), North Desert Oasis, and West Wind Valley Pond.
 */
export function getWaterSurfaceAt(x: number, z: number): number | null {
  if (isOnCoastalPier(x, z)) return null;
  if (Math.hypot(x - CENTRAL_LAKE_X, z - CENTRAL_LAKE_Z) < CENTRAL_LAKE_RADIUS + 0.6) {
    return WATER_LEVEL_LAKE;
  }
  if (Math.hypot(x - NORTH_OASIS_X, z - NORTH_OASIS_Z) < NORTH_OASIS_RADIUS + 0.4) {
    return WATER_LEVEL_OASIS;
  }
  if (Math.hypot(x - WEST_POND_X, z - WEST_POND_Z) < WEST_POND_RADIUS + 0.4) {
    return WATER_LEVEL_VALLEY_POND;
  }
  // Eastern Sea (+X) coastline & open ocean with coastal islands
  const eastShore = 86 + Math.sin(z * 0.028) * 11.0 + Math.abs(z) * 0.16;
  if (x > eastShore - 2.0 && Math.abs(z) < x * 1.15) {
    return WATER_LEVEL_COAST;
  }
  return null;
}

/**
 * Returns positive water depth (waterSurfaceY - terrainY) at (x, z), or 0 if dry land.
 * Depth 0.05..0.68m = shallow wadeable water/puddle; Depth > 0.68m = deep swimmable water!
 */
export function getWaterDepthAt(x: number, z: number): number {
  const surf = getWaterSurfaceAt(x, z);
  if (surf === null) return 0;
  const ground = getTerrainHeight(x, z);
  return Math.max(0, surf - ground);
}

/**
 * Returns true if (x, z) lies inside deep water (used to keep buildings/trees/land monsters off deep water).
 * Players can still wade through puddles and swim freely through deep water!
 */
export function isWaterAt(x: number, z: number): boolean {
  return getWaterDepthAt(x, z) > 0.42;
}

/**
 * Deterministic 10-tier open-world heightfield (playable radius up to 455m) centered on the Meadow Village (0,0)
 * with 5 distinct themed elemental regions:
 *  - Center: Rolling Green Meadow & Central Lake
 *  - East (+X): Coastal Beach, Turquoise Shallows, Swimmable Ocean & Coral Islands (Water)
 *  - West (-X): Wind Valley with smooth rolling ridges, breeze canyons & pond (Wind)
 *  - South (+Z): Volcanic Highlands, Obsidian Slopes & Glowing Caldera Basins (Fire)
 *  - North (-Z): Golden Desert Sand Dunes, Sandstone Mesas & Oasis Pool (Earth)
 */
export function getTerrainHeight(x: number, z: number): number {
  const dist = Math.hypot(x, z);

  // Gentle rolling base hills (smooth slopes for natural movement!)
  const w1 = Math.sin(x * 0.013 + 0.4) * Math.cos(z * 0.012 - 0.3) * 1.75;
  const w2 = Math.sin((x + z) * 0.029) * 0.48;
  const w3 = Math.cos(x * 0.052 - z * 0.044) * 0.18;

  // Flat welcoming starting village plaza (radius ~30m)
  const centerBlend = THREE.MathUtils.smoothstep(dist, 14, 36);
  let h = (w1 + w2 + w3) * centerBlend;

  // NORTH (-Z): Golden Desert Dunes & Sandstone Mesas (Earth)
  if (z < -26) {
    const northMask =
      THREE.MathUtils.smoothstep(-z, 30, 120) *
      (1 - THREE.MathUtils.smoothstep(Math.abs(x), 75, 290));
    const dunes =
      Math.sin(z * 0.042 + Math.sin(x * 0.022) * 1.8) * 1.9 +
      Math.cos(x * 0.032 - z * 0.018) * 0.9;
    const mesa = THREE.MathUtils.smoothstep(-z, 190, 340) * 3.2;
    h += northMask * (1.85 + dunes * 0.65 + mesa);
  }

  // SOUTH (+Z): Volcanic Slopes, Basalt Ridges & Caldera Rim (Fire)
  if (z > 28) {
    const southMask =
      THREE.MathUtils.smoothstep(z, 32, 130) *
      (1 - THREE.MathUtils.smoothstep(Math.abs(x), 72, 290));
    const ridge = Math.sin(x * 0.034) * Math.cos(z * 0.028) * 2.1;
    const volcanoSlope = THREE.MathUtils.smoothstep(z, 90, 310) * 5.2;
    h += southMask * (1.4 + ridge * 0.7 + volcanoSlope);
    // Gentle volcanic crater basin around (12, 215)
    const calderaDist = Math.hypot(x - 12, z - 215);
    if (calderaDist < 42) {
      const dip = 1 - THREE.MathUtils.smoothstep(calderaDist, 14, 42);
      h -= dip * 3.4;
    }
  }

  // WEST (-X): Wind Valley — sculpted smooth emerald ridges & sweeping wind corridor (Wind)
  if (x < -28) {
    const westMask =
      THREE.MathUtils.smoothstep(-x, 32, 125) *
      (1 - THREE.MathUtils.smoothstep(Math.abs(z), 75, 290));
    // Smooth central canyon corridor along z ≈ sin(x * 0.02) * 22 with rising flanking hills
    const valleyCenterZ = Math.sin(x * 0.02) * 22;
    const wallRise = THREE.MathUtils.smoothstep(Math.abs(z - valleyCenterZ), 18, 72) * 3.8;
    const waveHills = Math.sin(x * 0.038 + z * 0.025) * 1.1;
    h += westMask * (0.9 + wallRise + waveHills);
  }

  // EAST (+X): Coastal Beach sloping smoothly into Swimmable Ocean + Coral Islands (Water)
  if (x > 34) {
    const eastMask =
      THREE.MathUtils.smoothstep(x, 36, 92) *
      (1 - THREE.MathUtils.smoothstep(Math.abs(z), 80, 310));
    const eastShore = 86 + Math.sin(z * 0.028) * 11.0 + Math.abs(z) * 0.16;
    const seaDrop = THREE.MathUtils.smoothstep(x, eastShore - 10, eastShore + 24);
    h -= eastMask * seaDrop * 2.65;

    // Scenic offshore coral/sandbar islands across the Eastern Sea so tiers 3-10 have walkable islands!
    const islands: Array<[number, number, number, number]> = [
      [148, -18, 28, 3.2],
      [182, 42, 32, 3.6],
      [246, -24, 38, 4.1],
      [310, 26, 44, 4.6],
      [388, -12, 52, 5.2],
    ];
    for (const [ix, iz, ir, ih] of islands) {
      const idist = Math.hypot(x - ix, z - iz);
      if (idist < ir + 12) {
        const lift = 1 - THREE.MathUtils.smoothstep(idist, ir * 0.35, ir + 10);
        h += lift * ih;
      }
    }
  }

  // Central village lake depression near (20, 20)
  const lakeDist = Math.hypot(x - CENTRAL_LAKE_X, z - CENTRAL_LAKE_Z);
  if (lakeDist < CENTRAL_LAKE_RADIUS + 4.8) {
    const lakeCup =
      1 -
      THREE.MathUtils.smoothstep(
        lakeDist,
        CENTRAL_LAKE_RADIUS * 0.42,
        CENTRAL_LAKE_RADIUS + 4.2,
      );
    h = THREE.MathUtils.lerp(h, -1.65, lakeCup);
  }

  // North Desert Oasis shallow-to-swimmable depression near (-28, -68)
  const oasisDist = Math.hypot(x - NORTH_OASIS_X, z - NORTH_OASIS_Z);
  if (oasisDist < NORTH_OASIS_RADIUS + 5.0) {
    const cup =
      1 -
      THREE.MathUtils.smoothstep(
        oasisDist,
        NORTH_OASIS_RADIUS * 0.4,
        NORTH_OASIS_RADIUS + 4.5,
      );
    h = THREE.MathUtils.lerp(h, WATER_LEVEL_OASIS - 1.35, cup);
  }

  // West Wind Valley Pond depression near (-62, 24)
  const pondDist = Math.hypot(x - WEST_POND_X, z - WEST_POND_Z);
  if (pondDist < WEST_POND_RADIUS + 4.5) {
    const cup =
      1 -
      THREE.MathUtils.smoothstep(
        pondDist,
        WEST_POND_RADIUS * 0.4,
        WEST_POND_RADIUS + 4.0,
      );
    h = THREE.MathUtils.lerp(h, WATER_LEVEL_VALLEY_POND - 1.3, cup);
  }

  // Outer perimeter mountain rim outside Tier 10 boundary (radius > 466m), open ocean on East (+X)
  if (dist > 466) {
    const rimT = THREE.MathUtils.clamp((dist - 466) / 72, 0, 1);
    const angle = Math.atan2(z, x);
    if (x > 200 && Math.abs(z) < x * 0.92) {
      // Eastern open ocean drops gently
      h -= rimT * 2.5;
    } else {
      const crag = 24 + Math.sin(angle * 8.0) * 8.0 + Math.cos(angle * 15.0 + 0.5) * 5.0;
      h += rimT * rimT * crag;
    }
  }

  return h;
}

export function getTerrainSlope(x: number, z: number): number {
  const eps = 0.8;
  const hx = (getTerrainHeight(x + eps, z) - getTerrainHeight(x - eps, z)) / (2 * eps);
  const hz = (getTerrainHeight(x, z + eps) - getTerrainHeight(x, z - eps)) / (2 * eps);
  return Math.hypot(hx, hz);
}

/**
 * Builds the 10-tier continuous open-world terrain mesh with 5 cardinal elemental biome vertex colors.
 */
export function buildTerrainMesh(grassTexture: THREE.CanvasTexture): THREE.Mesh {
  const size = 1080;
  const segments = 160;
  const geom = new THREE.PlaneGeometry(size, size, segments, segments);
  geom.rotateX(-Math.PI / 2);

  grassTexture.repeat.set(148, 148);

  const pos = geom.attributes.position;
  const colors = new Float32Array(pos.count * 3);

  const cMeadow = new THREE.Color('#77a852');
  const cMeadowLight = new THREE.Color('#97c15b');
  const cWindValley = new THREE.Color('#4d9468');
  const cWindCliff = new THREE.Color('#5a867c');
  const cDesertSand = new THREE.Color('#e3c17f');
  const cDesertDune = new THREE.Color('#cfa15a');
  const cVolcanoBasalt = new THREE.Color('#4a4344');
  const cVolcanoAsh = new THREE.Color('#6a4c42');
  const cVolcanoLava = new THREE.Color('#e85d24');
  const cCoastSand = new THREE.Color('#e4cb94');
  const cWetSand = new THREE.Color('#7a9394');
  const cDirt = new THREE.Color('#b69265');
  const cMountain = new THREE.Color('#646d76');
  const tmp = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = getTerrainHeight(x, z);
    pos.setY(i, y);

    const dist = Math.hypot(x, z);
    const noise = Math.sin(x * 0.036) * Math.cos(z * 0.036) * 0.5 + 0.5;
    const detail = Math.sin(x * 0.095 + z * 0.085) * 0.5 + 0.5;

    // Center: sunlit emerald meadow
    tmp.copy(cMeadow).lerp(cMeadowLight, noise * 0.48);

    // WEST (-X): Wind Valley — windswept jade-emerald valleys & sage canyon ridges
    if (x < -24) {
      const wT =
        THREE.MathUtils.smoothstep(-x, 28, 105) *
        (1 - THREE.MathUtils.smoothstep(Math.abs(z), 90, 310));
      tmp.lerp(cWindValley, wT * (0.65 + detail * 0.25));
      if (y > 3.2) {
        tmp.lerp(cWindCliff, wT * THREE.MathUtils.smoothstep(y, 3.2, 6.2) * 0.55);
      }
    }

    // NORTH (-Z): Golden Desert Dunes & Sandstone
    if (z < -24) {
      const nT =
        THREE.MathUtils.smoothstep(-z, 28, 105) *
        (1 - THREE.MathUtils.smoothstep(Math.abs(x), 85, 310));
      tmp.lerp(cDesertSand, nT * 0.88);
      tmp.lerp(cDesertDune, nT * detail * 0.42);
    }

    // SOUTH (+Z): Volcanic Basalt, Ash & Glowing Lava Cracks
    if (z > 24) {
      const sT =
        THREE.MathUtils.smoothstep(z, 28, 108) *
        (1 - THREE.MathUtils.smoothstep(Math.abs(x), 85, 310));
      tmp.lerp(cVolcanoBasalt, sT * 0.84);
      tmp.lerp(cVolcanoAsh, sT * noise * 0.45);
      // Glowing magma fissures deeper into the southern volcano
      if (z > 105) {
        const fissure = Math.abs(Math.sin(x * 0.065 + Math.cos(z * 0.05) * 2.2));
        if (fissure < 0.09) {
          tmp.lerp(cVolcanoLava, sT * (1 - fissure / 0.09) * 0.92);
        }
        const calderaDist = Math.hypot(x - 12, z - 215);
        if (calderaDist < 22) {
          tmp.lerp(cVolcanoLava, (1 - calderaDist / 22) * 0.9);
        }
      }
    }

    // EAST (+X): Golden Coastal Beach transitioning to wet sand & ocean seabed
    if (x > 36) {
      const eastShore = 86 + Math.sin(z * 0.028) * 11.0 + Math.abs(z) * 0.16;
      const eT =
        THREE.MathUtils.smoothstep(x, eastShore - 28, eastShore + 6) *
        (1 - THREE.MathUtils.smoothstep(Math.abs(z), 95, 340));
      tmp.lerp(cCoastSand, eT * 0.92);
      if (y < WATER_LEVEL_COAST + 0.25) {
        const wetT = THREE.MathUtils.clamp((WATER_LEVEL_COAST + 0.25 - y) * 1.15, 0, 1);
        tmp.lerp(cWetSand, eT * wetT * 0.72);
      }
    }

    // Oasis, Pond & Central Lake sandy rims
    const lakeDist = Math.hypot(x - CENTRAL_LAKE_X, z - CENTRAL_LAKE_Z);
    if (lakeDist < CENTRAL_LAKE_RADIUS + 4.4) {
      const shoreT =
        1 - THREE.MathUtils.smoothstep(lakeDist, CENTRAL_LAKE_RADIUS - 0.8, CENTRAL_LAKE_RADIUS + 4.0);
      tmp.lerp(cCoastSand, shoreT * 0.78);
    }
    const oasisDist = Math.hypot(x - NORTH_OASIS_X, z - NORTH_OASIS_Z);
    if (oasisDist < NORTH_OASIS_RADIUS + 6.0) {
      const lushRim =
        1 - THREE.MathUtils.smoothstep(oasisDist, NORTH_OASIS_RADIUS - 0.6, NORTH_OASIS_RADIUS + 5.5);
      tmp.lerp(cMeadow, lushRim * 0.68);
    }
    const pondDist = Math.hypot(x - WEST_POND_X, z - WEST_POND_Z);
    if (pondDist < WEST_POND_RADIUS + 4.0) {
      const rim = 1 - THREE.MathUtils.smoothstep(pondDist, WEST_POND_RADIUS - 0.8, WEST_POND_RADIUS + 3.8);
      tmp.lerp(cWetSand, rim * 0.55);
    }

    // Starting village plaza dirt
    const campClearing = 1 - THREE.MathUtils.smoothstep(dist, 4.5, 11.5);
    tmp.lerp(cDirt, campClearing * 0.72);

    // Cardinal dirt crossroads
    if (z < 2 && z > -240) {
      const roadX = Math.sin(z * 0.032) * 5.2;
      const f = 1 - THREE.MathUtils.smoothstep(Math.abs(x - roadX), 1.6, 3.8);
      tmp.lerp(cDirt, f * 0.58);
    }
    if (z > 2 && z < 210) {
      const roadX = -3.0 + Math.sin(z * 0.038) * 3.5;
      const f = 1 - THREE.MathUtils.smoothstep(Math.abs(x - roadX), 1.5, 3.5);
      tmp.lerp(cDirt, f * 0.52);
    }
    if (x < -2 && x > -240) {
      const roadZ = Math.sin(x * 0.032) * 5.0;
      const f = 1 - THREE.MathUtils.smoothstep(Math.abs(z - roadZ), 1.5, 3.6);
      tmp.lerp(cDirt, f * 0.56);
    }
    if (x > 2 && x < 86) {
      const roadZ = -3.4 + Math.cos(x * 0.038) * 4.4;
      const f = 1 - THREE.MathUtils.smoothstep(Math.abs(z - roadZ), 1.5, 3.6);
      tmp.lerp(cDirt, f * 0.62);
    }

    // Outer mountain rim
    if (dist > 460 && !(x > 200 && Math.abs(z) < x * 0.92)) {
      const mT = THREE.MathUtils.smoothstep(dist, 460, 520);
      tmp.lerp(cMountain, mT * 0.9);
    }

    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }

  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geom.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    map: grassTexture,
    vertexColors: true,
    roughness: 0.92,
    metalness: 0.02,
  });

  const mesh = new THREE.Mesh(geom, mat);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.name = 'world_terrain';
  return mesh;
}

export interface WorldWaterBundle {
  group: THREE.Group;
  lakeMesh: THREE.Mesh;
  coastMesh: THREE.Mesh;
  lakeFoam: THREE.Mesh;
  oasisMesh: THREE.Mesh;
  pondMesh: THREE.Mesh;
}

/**
 * Builds sparkling water planes for Central Lake, Eastern Ocean (+X), North Desert Oasis, and West Wind Pond.
 */
export function buildWaterMeshes(): WorldWaterBundle {
  const group = new THREE.Group();
  group.name = 'world_water';

  const lakeMat = new THREE.MeshStandardMaterial({
    color: 0x35b4c9,
    emissive: 0x0b3a4a,
    emissiveIntensity: 0.22,
    roughness: 0.14,
    metalness: 0.18,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
  });
  const lakeMesh = new THREE.Mesh(
    new THREE.CircleGeometry(CENTRAL_LAKE_RADIUS + 1.4, 36),
    lakeMat,
  );
  lakeMesh.rotation.x = -Math.PI / 2;
  lakeMesh.position.set(CENTRAL_LAKE_X, WATER_LEVEL_LAKE, CENTRAL_LAKE_Z);
  lakeMesh.receiveShadow = true;
  group.add(lakeMesh);

  const foamMat = new THREE.MeshBasicMaterial({
    color: 0xdff8ff,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    fog: false,
  });
  const lakeFoam = new THREE.Mesh(
    new THREE.RingGeometry(CENTRAL_LAKE_RADIUS - 0.75, CENTRAL_LAKE_RADIUS + 0.25, 36),
    foamMat,
  );
  lakeFoam.rotation.x = -Math.PI / 2;
  lakeFoam.position.set(CENTRAL_LAKE_X, WATER_LEVEL_LAKE + 0.02, CENTRAL_LAKE_Z);
  group.add(lakeFoam);

  // North Desert Oasis sparkling turquoise pool
  const oasisMesh = new THREE.Mesh(
    new THREE.CircleGeometry(NORTH_OASIS_RADIUS + 1.2, 32),
    lakeMat,
  );
  oasisMesh.rotation.x = -Math.PI / 2;
  oasisMesh.position.set(NORTH_OASIS_X, WATER_LEVEL_OASIS, NORTH_OASIS_Z);
  group.add(oasisMesh);

  // West Wind Valley clear emerald pond
  const pondMesh = new THREE.Mesh(
    new THREE.CircleGeometry(WEST_POND_RADIUS + 1.2, 32),
    lakeMat,
  );
  pondMesh.rotation.x = -Math.PI / 2;
  pondMesh.position.set(WEST_POND_X, WATER_LEVEL_VALLEY_POND, WEST_POND_Z);
  group.add(pondMesh);

  // Sweeping Eastern Ocean plane (+X coastal sea)
  const coastMat = new THREE.MeshStandardMaterial({
    color: 0x1a94c4,
    emissive: 0x072d44,
    emissiveIntensity: 0.22,
    roughness: 0.16,
    metalness: 0.22,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  const coastMesh = new THREE.Mesh(new THREE.PlaneGeometry(480, 920, 20, 24), coastMat);
  coastMesh.rotation.x = -Math.PI / 2;
  coastMesh.position.set(324, WATER_LEVEL_COAST, 0);
  coastMesh.receiveShadow = true;
  group.add(coastMesh);

  return { group, lakeMesh, coastMesh, lakeFoam, oasisMesh, pondMesh };
}
