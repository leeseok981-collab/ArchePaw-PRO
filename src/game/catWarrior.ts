import * as THREE from 'three';
import { ProceduralTexturePack } from './textures';
import { ArmorId, EmoteId, PlayerClassId, WarriorSkillId, WeaponCategory, WeaponId } from './types';

export interface CatWarriorRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  headGroup: THREE.Group;
  leftEar: THREE.Group;
  rightEar: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  swordGlowMat: THREE.MeshStandardMaterial;
  swordLight: THREE.PointLight;
  slashArc: THREE.Mesh;
  contactShadow: THREE.Mesh;
  setClass: (classId: PlayerClassId) => void;
  setEquippedWeapon: (weaponId: WeaponId) => void;
  setEquippedArmor: (armorId: ArmorId) => void;
  updateAnimation: (params: {
    dt: number;
    time: number;
    speed: number;
    maxSpeed: number;
    turnRate: number;
    isSprinting: boolean;
    isGrounded: boolean;
    isSwimming?: boolean;
    verticalVel: number;
    swingTimer: number;
    swingCategory: WeaponCategory;
    landSquash: number;
    heightAboveGround: number;
    nightFactor: number;
    activeEmote?: EmoteId | null;
    emoteTime?: number;
    activeSkill?: WarriorSkillId | null;
    skillAnimProgress?: number; // 0 -> 1
    warcryActive?: boolean;
  }) => void;
  dispose: () => void;
}

/**
 * High-craft articulated 3D Orange Tabby Cat Warrior with:
 * - Seamless anatomical joint connections (plush neck collar bridge, rounded pelvis hip bridge,
 *   rounded shoulder/elbow/wrist joints, and a continuous 7-joint overlapping S-curved tabby tail with zero gaps!)
 * - Fluid procedural locomotion (torso counter-twist, turn-leading head tilt, natural traveling-wave tail physics,
 *   weapon-specific chop / mine / slash swing arcs)
 * - 6 switchable composite 3D forged weapons & tools held directly in the right paw
 */
export function createCatWarrior(textures: ProceduralTexturePack): CatWarriorRig {
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  // ---------------- CALIBRATED PBR MATERIALS ----------------
  const furMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      map: textures.tabbyFur,
      bumpMap: textures.tabbyBump,
      bumpScale: 0.022,
      color: 0xffb162,
      roughness: 0.88,
      metalness: 0.0,
      sheen: 0.42,
      sheenRoughness: 0.78,
      sheenColor: new THREE.Color(0xffdcb2),
    }),
  );
  const darkStripeMat = trackMat(
    new THREE.MeshStandardMaterial({
      bumpMap: textures.tabbyBump,
      bumpScale: 0.015,
      color: 0xb34712,
      roughness: 0.9,
      metalness: 0.0,
    }),
  );
  const creamFurMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      bumpMap: textures.tabbyBump,
      bumpScale: 0.012,
      color: 0xfff3e0,
      roughness: 0.85,
      metalness: 0.0,
      sheen: 0.35,
      sheenRoughness: 0.82,
      sheenColor: new THREE.Color(0xffffff),
    }),
  );
  const innerEarMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xec9294,
      roughness: 0.76,
      metalness: 0.0,
    }),
  );
  const noseMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf48c98,
      roughness: 0.34,
      metalness: 0.04,
    }),
  );
  const mouthMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x5c301c,
      roughness: 0.75,
      metalness: 0.0,
    }),
  );
  const whiskerMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfff5e6,
      roughness: 0.6,
      metalness: 0.0,
    }),
  );
  const irisMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x4d2812,
      roughness: 0.08,
      metalness: 0.08,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
    }),
  );
  const pupilMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x120905,
      roughness: 0.05,
      metalness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
    }),
  );
  const eyeSpecMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xffffff }));
  const denimMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.denimFabric,
      bumpMap: textures.denimBump,
      bumpScale: 0.018,
      color: 0x3b6aa3,
      roughness: 0.84,
      metalness: 0.04,
    }),
  );
  const denimTrimMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.denimFabric,
      color: 0x2f588a,
      roughness: 0.88,
      metalness: 0.04,
    }),
  );
  const quiltedMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.quiltedLeather,
      bumpMap: textures.quiltedBump,
      bumpScale: 0.032,
      color: 0x8b5636,
      roughness: 0.62,
      metalness: 0.06,
    }),
  );
  const leatherDarkMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x492c1c,
      roughness: 0.54,
      metalness: 0.08,
    }),
  );
  const bootMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x5d3823,
      roughness: 0.42,
      metalness: 0.1,
    }),
  );
  const bootSoleMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x2d1b12,
      roughness: 0.78,
      metalness: 0.05,
    }),
  );
  const steelMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xb2beca,
      roughness: 0.2,
      metalness: 0.92,
    }),
  );
  const darkIronMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x485360,
      roughness: 0.28,
      metalness: 0.86,
    }),
  );
  const forgedStoneMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.graniteRock,
      color: 0x8c949c,
      roughness: 0.78,
      metalness: 0.08,
      flatShading: true,
    }),
  );
  const toolHandleMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.shieldWood,
      color: 0x8e5c34,
      roughness: 0.76,
      metalness: 0.04,
    }),
  );
  const goldMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xebb83d,
      roughness: 0.2,
      metalness: 0.88,
    }),
  );
  const shieldWoodMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.shieldWood,
      bumpMap: textures.shieldBump,
      bumpScale: 0.024,
      color: 0x8c5933,
      roughness: 0.72,
      metalness: 0.04,
    }),
  );
  const swordGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x76ecff,
      emissive: 0x26c8f8,
      emissiveIntensity: 1.2,
      roughness: 0.12,
      metalness: 0.22,
    }),
  );
  const swordCoreMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xe6fbff }));

  // ---------------- DEDICATED ARMOR SET MATERIALS ----------------
  const hunterLeatherMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.quiltedLeather,
      bumpMap: textures.quiltedBump,
      bumpScale: 0.028,
      color: 0x7a4827,
      roughness: 0.64,
      metalness: 0.08,
    }),
  );
  const bronzeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xc98b44,
      roughness: 0.3,
      metalness: 0.84,
    }),
  );
  const fangIvoryMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf6ebd6,
      roughness: 0.28,
      metalness: 0.06,
    }),
  );
  const plateSteelMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xc0ccd8,
      roughness: 0.2,
      metalness: 0.92,
    }),
  );
  const crimsonCapeMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x991b22,
      roughness: 0.82,
      metalness: 0.04,
      sheen: 0.55,
      sheenRoughness: 0.72,
      sheenColor: new THREE.Color(0xf87171),
      side: THREE.DoubleSide,
    }),
  );
  const wolfFurMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      bumpMap: textures.tabbyBump,
      bumpScale: 0.026,
      color: 0xeaf2fa,
      roughness: 0.86,
      metalness: 0.02,
      sheen: 0.65,
      sheenRoughness: 0.65,
      sheenColor: new THREE.Color(0xffffff),
    }),
  );
  const arcticCapeMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x3b536b,
      roughness: 0.82,
      metalness: 0.05,
      sheen: 0.45,
      sheenRoughness: 0.75,
      sheenColor: new THREE.Color(0xbae6fd),
      side: THREE.DoubleSide,
    }),
  );
  const frostGemMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.95,
      roughness: 0.14,
      metalness: 0.24,
    }),
  );
  const paladinPlateMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x2c4b78,
      roughness: 0.22,
      metalness: 0.88,
    }),
  );
  const royalCapeMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x1d4ed8,
      roughness: 0.76,
      metalness: 0.06,
      sheen: 0.6,
      sheenRoughness: 0.68,
      sheenColor: new THREE.Color(0x93c5fd),
      side: THREE.DoubleSide,
    }),
  );
  const paladinRuneMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x7ef3ff,
      emissive: 0x22d3ee,
      emissiveIntensity: 1.35,
      roughness: 0.12,
      metalness: 0.2,
    }),
  );

  const root = new THREE.Group();
  root.name = 'cat_warrior_root';

  // Grounding contact shadow disc
  const shadowGeo = trackGeo(new THREE.PlaneGeometry(1.5, 1.5));
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      depthWrite: false,
      opacity: 0.56,
    }),
  );
  const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
  contactShadow.position.y = 0.025;
  contactShadow.renderOrder = 1;
  root.add(contactShadow);

  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  // ---------------- SEAMLESS PELVIS BRIDGE + ARTICULATED LEGS ----------------
  const pelvisBridge = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.265, 18, 14)), leatherDarkMat);
  pelvisBridge.scale.set(1.12, 0.72, 0.94);
  pelvisBridge.position.set(0, 0.48, 0);
  bodyGroup.add(pelvisBridge);

  const makeLeg = (side: -1 | 1): { hip: THREE.Group; knee: THREE.Group } => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.155, 0.47, 0);

    // Rounded hip ball joint tucked seamlessly into pelvisBridge
    const hipCap = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.118, 14, 12)), leatherDarkMat);
    hip.add(hipCap);

    // Upper trouser thigh
    const thigh = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.116, 0.106, 0.2, 16)), leatherDarkMat);
    thigh.position.y = -0.1;
    hip.add(thigh);

    // Articulated knee pivot for softer stride lift
    const knee = new THREE.Group();
    knee.position.set(0, -0.2, 0);
    hip.add(knee);

    const kneeBall = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.106, 12, 10)), leatherDarkMat);
    knee.add(kneeBall);

    const kneeFold = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.106, 0.018, 8, 16)), leatherDarkMat);
    kneeFold.rotation.x = Math.PI / 2;
    knee.add(kneeFold);

    // Rolled leather boot cuff
    const cuff = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.125, 0.116, 0.082, 16)), bootMat);
    cuff.position.y = -0.05;
    knee.add(cuff);

    const shaft = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.104, 0.112, 0.145, 16)), bootMat);
    shaft.position.y = -0.135;
    knee.add(shaft);

    const tongue = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.068, 0.12, 0.028)), leatherDarkMat);
    tongue.position.set(0, -0.125, 0.102);
    knee.add(tongue);

    for (let l = 0; l < 3; l++) {
      const ly = -0.09 - l * 0.032;
      const lace = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.072, 0.012, 0.016)), goldMat);
      lace.position.set(0, ly, 0.114);
      knee.add(lace);

      for (const ex of [-0.036, 0.036]) {
        const eyelet = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.008, 6, 6)), goldMat);
        eyelet.position.set(ex, ly, 0.112);
        knee.add(eyelet);
      }
    }

    const foot = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.112, 16, 12)), bootMat);
    foot.scale.set(1.02, 0.62, 1.42);
    foot.position.set(0, -0.192, 0.056);
    knee.add(foot);

    const toeCap = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.095, 14, 10)), leatherDarkMat);
    toeCap.scale.set(1.0, 0.56, 0.78);
    toeCap.position.set(0, -0.198, 0.135);
    knee.add(toeCap);

    const sole = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.114, 0.118, 0.038, 16)), bootSoleMat);
    sole.scale.set(1.02, 1.0, 1.38);
    sole.position.set(0, -0.234, 0.048);
    knee.add(sole);

    return { hip, knee };
  };

  const leftLegRig = makeLeg(-1);
  const rightLegRig = makeLeg(1);
  const leftLeg = leftLegRig.hip;
  const rightLeg = rightLegRig.hip;
  bodyGroup.add(leftLeg, rightLeg);

  // ---------------- UPPER BODY PIVOT (TORSO + ARMS + NECK + HEAD) ----------------
  const torso = new THREE.Group();
  torso.position.y = 0.73;
  bodyGroup.add(torso);

  const chestCore = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.242, 0.274, 0.54, 22)), quiltedMat);
  chestCore.scale.set(1.06, 1.0, 0.91);
  torso.add(chestCore);

  // Plush orange fur neck connector seamlessly bridging torso collar and head
  const neckBridge = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.165, 0.19, 0.22, 16)), furMat);
  neckBridge.position.set(0, 0.31, 0.01);
  torso.add(neckBridge);

  const innerNeck = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.172, 0.032, 8, 18)), leatherDarkMat);
  innerNeck.rotation.x = Math.PI / 2;
  innerNeck.position.set(0, 0.255, 0.025);
  torso.add(innerNeck);

  const jacketShell = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.272, 0.3, 0.54, 24, 1, false, Math.PI * 0.22, Math.PI * 1.56)),
    denimMat,
  );
  jacketShell.rotation.y = Math.PI * 0.5;
  jacketShell.scale.set(1.07, 1.0, 0.95);
  torso.add(jacketShell);

  const jacketHem = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.285, 0.026, 8, 24, Math.PI * 1.55)),
    denimTrimMat,
  );
  jacketHem.rotation.x = Math.PI / 2;
  jacketHem.rotation.z = -Math.PI * 0.27;
  jacketHem.scale.set(1.06, 0.94, 1.0);
  jacketHem.position.y = -0.255;
  torso.add(jacketHem);

  for (const side of [-1, 1] as const) {
    const panel = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.135, 0.49, 0.075)), denimMat);
    panel.position.set(side * 0.168, 0.005, 0.2);
    panel.rotation.y = -side * 0.28;
    torso.add(panel);

    const collarFlap = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.145, 0.12, 0.048)), denimTrimMat);
    collarFlap.position.set(side * 0.165, 0.235, 0.215);
    collarFlap.rotation.set(0.32, -side * 0.34, side * 0.26);
    torso.add(collarFlap);

    const pocket = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.095, 0.095, 0.028)), denimTrimMat);
    pocket.position.set(side * 0.178, 0.065, 0.238);
    pocket.rotation.y = -side * 0.28;
    torso.add(pocket);

    const pocketFlap = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.1, 0.036, 0.032)), denimMat);
    pocketFlap.position.set(side * 0.178, 0.112, 0.242);
    pocketFlap.rotation.y = -side * 0.28;
    torso.add(pocketFlap);

    const pocketBtn = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.012, 0.012, 0.014, 10)), goldMat);
    pocketBtn.rotation.x = Math.PI / 2;
    pocketBtn.position.set(side * 0.178, 0.105, 0.258);
    torso.add(pocketBtn);

    for (let b = 0; b < 3; b++) {
      const btn = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.015, 0.015, 0.016, 10)), goldMat);
      btn.rotation.x = Math.PI / 2;
      btn.position.set(side * 0.114, 0.11 - b * 0.125, 0.242);
      torso.add(btn);
    }
  }

  const collarBack = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.245, 0.052, 10, 24, Math.PI * 1.45)),
    denimMat,
  );
  collarBack.rotation.x = Math.PI / 2;
  collarBack.rotation.z = -Math.PI * 0.22;
  collarBack.position.y = 0.265;
  torso.add(collarBack);

  const belt = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.286, 0.29, 0.078, 22)), leatherDarkMat);
  belt.scale.set(1.06, 1.0, 0.93);
  belt.position.y = -0.22;
  torso.add(belt);

  const buckleFrame = new THREE.Group();
  buckleFrame.position.set(0, -0.22, 0.27);
  const bfTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.102, 0.018, 0.026)), steelMat);
  bfTop.position.y = 0.036;
  const bfBot = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.102, 0.018, 0.026)), steelMat);
  bfBot.position.y = -0.036;
  const bfL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.018, 0.088, 0.026)), steelMat);
  bfL.position.x = -0.042;
  const bfR = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.018, 0.088, 0.026)), steelMat);
  bfR.position.x = 0.042;
  const bfProng = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.045, 0.012, 0.022)), steelMat);
  bfProng.position.x = 0.015;
  buckleFrame.add(bfTop, bfBot, bfL, bfR, bfProng);
  torso.add(buckleFrame);

  const backHarness = new THREE.Group();
  backHarness.position.set(0, 0.02, -0.275);
  torso.add(backHarness);

  for (const side of [-1, 1] as const) {
    const diagStrap = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.052, 0.36, 0.028)), leatherDarkMat);
    diagStrap.position.set(side * 0.11, 0.08, 0);
    diagStrap.rotation.z = side * 0.44;
    backHarness.add(diagStrap);

    const hBuckle = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.058, 0.048, 0.036)), goldMat);
    hBuckle.position.set(side * 0.135, -0.065, -0.008);
    backHarness.add(hBuckle);

    const lowerTab = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.048, 0.14, 0.026)), leatherDarkMat);
    lowerTab.position.set(side * 0.165, -0.14, 0.012);
    lowerTab.rotation.z = -side * 0.22;
    backHarness.add(lowerTab);
  }
  const backCrossBar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.42, 0.048, 0.03)), leatherDarkMat);
  backCrossBar.position.set(0, -0.065, -0.002);
  backHarness.add(backCrossBar);

  // ---------------- FIGURINE-GRADE ORANGE TABBY CAT HEAD (parented to torso so torso twist flows!) ----------------
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.6, 0.015);
  torso.add(headGroup);

  const headMesh = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.395, 32, 26)), furMat);
  headMesh.scale.set(1.11, 0.96, 1.01);
  headGroup.add(headMesh);

  const tabbyStripesGroup = new THREE.Group();
  headGroup.add(tabbyStripesGroup);

  for (const side of [-1, 1] as const) {
    const plushCheek = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.185, 16, 14)), furMat);
    plushCheek.scale.set(1.08, 0.85, 0.92);
    plushCheek.position.set(side * 0.25, -0.095, 0.16);
    headGroup.add(plushCheek);

    const tuft1 = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.055, 0.12, 8)), furMat);
    tuft1.rotation.z = -side * 1.48;
    tuft1.position.set(side * 0.435, -0.055, 0.05);
    headGroup.add(tuft1);

    const tuft2 = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.045, 0.1, 8)), darkStripeMat);
    tuft2.rotation.z = -side * 1.65;
    tuft2.position.set(side * 0.42, -0.115, 0.08);
    tabbyStripesGroup.add(tuft2);

    for (let s = 0; s < 2; s++) {
      const cStripe = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.017, 0.105, 4, 8)), darkStripeMat);
      cStripe.position.set(side * 0.345, -0.01 - s * 0.068, 0.205 - s * 0.012);
      cStripe.rotation.z = Math.PI / 2 - side * 0.18;
      cStripe.rotation.y = side * 0.72;
      tabbyStripesGroup.add(cStripe);
    }
  }

  const foreheadSpecs: Array<[number, number, number, number]> = [
    [0, 0.255, 0.315, 0],
    [-0.085, 0.235, 0.305, 0.22],
    [0.085, 0.235, 0.305, -0.22],
    [-0.155, 0.2, 0.275, 0.42],
    [0.155, 0.2, 0.275, -0.42],
  ];
  for (const [fx, fy, fz, rotZ] of foreheadSpecs) {
    const stripe = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.016, 0.115, 4, 8)), darkStripeMat);
    stripe.position.set(fx, fy, fz);
    stripe.rotation.x = -0.36;
    stripe.rotation.z = rotZ;
    tabbyStripesGroup.add(stripe);
  }

  const muzzleBase = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.155, 18, 14)), creamFurMat);
  muzzleBase.scale.set(1.32, 0.84, 0.76);
  muzzleBase.position.set(0, -0.1, 0.325);
  headGroup.add(muzzleBase);

  const chin = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.088, 14, 10)), creamFurMat);
  chin.scale.set(1.15, 0.72, 0.85);
  chin.position.set(0, -0.175, 0.33);
  headGroup.add(chin);

  for (const side of [-1, 1] as const) {
    const cheekPad = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.088, 16, 12)), creamFurMat);
    cheekPad.scale.set(1.08, 0.92, 0.86);
    cheekPad.position.set(side * 0.072, -0.105, 0.365);
    headGroup.add(cheekPad);

    const smileCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.095, 0.432),
      new THREE.Vector3(side * 0.036, -0.132, 0.432),
      new THREE.Vector3(side * 0.082, -0.116, 0.42),
    ]);
    const smileMesh = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(smileCurve, 10, 0.0085, 6, false)), mouthMat);
    headGroup.add(smileMesh);

    for (let w = 0; w < 2; w++) {
      const wCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.13, -0.095 - w * 0.025, 0.385),
        new THREE.Vector3(side * 0.25, -0.09 - w * 0.038, 0.37),
        new THREE.Vector3(side * 0.35, -0.105 - w * 0.055, 0.335),
      ]);
      const whisker = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(wCurve, 6, 0.0045, 5, false)), whiskerMat);
      headGroup.add(whisker);
    }

    const brow = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.024, 0.06, 4, 8)), creamFurMat);
    brow.rotation.z = Math.PI / 2 - side * 0.24;
    brow.position.set(side * 0.158, 0.145, 0.362);
    headGroup.add(brow);
  }

  const nose = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.034, 12, 10)), noseMat);
  nose.scale.set(1.22, 0.85, 0.72);
  nose.position.set(0, -0.058, 0.434);
  headGroup.add(nose);

  const philtrum = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.006, 0.006, 0.034, 6)), mouthMat);
  philtrum.position.set(0, -0.082, 0.432);
  headGroup.add(philtrum);

  const eyeGroups: THREE.Group[] = [];
  for (const side of [-1, 1] as const) {
    const eyeGroup = new THREE.Group();
    eyeGroup.position.set(side * 0.16, 0.022, 0.348);

    const lashRim = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.075, 0.011, 8, 16, Math.PI * 0.95)),
      mouthMat,
    );
    lashRim.position.set(0, 0.005, 0.015);
    lashRim.rotation.z = 0.08 * side;
    eyeGroup.add(lashRim);

    const iris = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.074, 18, 16)), irisMat);
    iris.scale.set(1.0, 1.06, 0.74);
    eyeGroup.add(iris);

    const pupil = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.054, 16, 14)), pupilMat);
    pupil.scale.set(1.0, 1.06, 0.65);
    pupil.position.z = 0.022;
    eyeGroup.add(pupil);

    const specLarge = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.021, 8, 8)), eyeSpecMat);
    specLarge.position.set(-0.022, 0.028, 0.054);
    eyeGroup.add(specLarge);

    const specSmall = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.01, 6, 6)), eyeSpecMat);
    specSmall.position.set(0.024, -0.018, 0.052);
    eyeGroup.add(specSmall);

    headGroup.add(eyeGroup);
    eyeGroups.push(eyeGroup);
  }

  const makeEar = (side: -1 | 1): THREE.Group => {
    const ear = new THREE.Group();
    ear.position.set(side * 0.258, 0.285, 0.01);
    ear.rotation.z = -side * 0.28;
    ear.rotation.y = side * 0.18;

    const outer = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.15, 0.295, 14)), furMat);
    outer.scale.set(1.04, 1.0, 0.68);
    outer.position.y = 0.115;
    ear.add(outer);

    const inner = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.098, 0.215, 12)), innerEarMat);
    inner.scale.set(1.0, 1.0, 0.42);
    inner.position.set(0, 0.1, 0.044);
    ear.add(inner);

    const earTuft = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.036, 0.095, 8)), creamFurMat);
    earTuft.position.set(-side * 0.042, 0.045, 0.068);
    earTuft.rotation.z = side * 0.55;
    ear.add(earTuft);

    return ear;
  };
  const leftEar = makeEar(-1);
  const rightEar = makeEar(1);
  headGroup.add(leftEar, rightEar);

  // ---------------- CLASS-SPECIFIC HEADGEAR & BACK GEAR ----------------
  const calicoOrangeMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xe6a14c,
      roughness: 0.86,
      sheen: 0.35,
      sheenColor: new THREE.Color(0xffe7c2),
    }),
  );
  const calicoBrownMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x6b4732,
      roughness: 0.88,
      sheen: 0.28,
      sheenColor: new THREE.Color(0xc49c7c),
    }),
  );

  // (1) Healer Calico Head/Ear Patches & Floating Golden Halo
  const calicoPatchesGroup = new THREE.Group();
  calicoPatchesGroup.visible = false;
  headGroup.add(calicoPatchesGroup);
  {
    const leftPatch = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.28, 18, 14, 0, Math.PI, 0, Math.PI * 0.65)),
      calicoOrangeMat,
    );
    leftPatch.scale.set(1.05, 0.92, 0.98);
    leftPatch.position.set(-0.18, 0.15, 0.04);
    leftPatch.rotation.set(0.15, -0.35, 0.42);
    calicoPatchesGroup.add(leftPatch);

    const rightPatch = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.275, 18, 14, 0, Math.PI, 0, Math.PI * 0.65)),
      calicoBrownMat,
    );
    rightPatch.scale.set(1.05, 0.92, 0.98);
    rightPatch.position.set(0.18, 0.15, 0.03);
    rightPatch.rotation.set(0.12, 0.35, -0.45);
    calicoPatchesGroup.add(rightPatch);
  }

  const healerHaloMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfde047,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.15,
      roughness: 0.18,
      metalness: 0.78,
    }),
  );
  const healerHaloGroup = new THREE.Group();
  healerHaloGroup.position.set(0, 0.54, 0.01);
  healerHaloGroup.visible = false;
  headGroup.add(healerHaloGroup);
  {
    const haloRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.185, 0.024, 12, 28)), healerHaloMat);
    haloRing.rotation.x = Math.PI / 2;
    healerHaloGroup.add(haloRing);
  }

  // (2) Mage Pointed Purple Witch/Wizard Hat with Golden 5-Point Star
  const mageHatGroup = new THREE.Group();
  mageHatGroup.position.set(0, 0.25, 0.0);
  mageHatGroup.visible = false;
  headGroup.add(mageHatGroup);
  {
    const hatPurpleMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x805ad5,
        roughness: 0.78,
        sheen: 0.48,
        sheenColor: new THREE.Color(0xd8b4fe),
      }),
    );
    const hatBandMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xa855f7,
        roughness: 0.62,
        metalness: 0.08,
      }),
    );
    const hatStarMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xfde047,
        emissive: 0xfacc15,
        emissiveIntensity: 0.45,
        roughness: 0.24,
        metalness: 0.4,
      }),
    );

    const brim = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.42, 0.62, 0.055, 28)), hatPurpleMat);
    brim.position.set(0, 0.02, 0.01);
    brim.rotation.x = -0.06;
    mageHatGroup.add(brim);

    const lowerCone = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.32, 0.44, 22)), hatPurpleMat);
    lowerCone.position.set(0, 0.23, -0.01);
    lowerCone.rotation.x = -0.14;
    mageHatGroup.add(lowerCone);

    const tipCone = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.135, 0.28, 16)), hatPurpleMat);
    tipCone.position.set(0.02, 0.42, -0.11);
    tipCone.rotation.x = -0.78;
    tipCone.rotation.z = -0.16;
    mageHatGroup.add(tipCone);

    const band = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.285, 0.036, 10, 26)), hatBandMat);
    band.rotation.x = Math.PI / 2 - 0.08;
    band.position.set(0, 0.1, 0.01);
    mageHatGroup.add(band);

    // 5-point star emblem on hat front
    const starShape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 0.085 : 0.038;
      const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
      if (i === 0) starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    starShape.closePath();
    const starGeo = trackGeo(
      new THREE.ExtrudeGeometry(starShape, {
        depth: 0.024,
        bevelEnabled: true,
        bevelThickness: 0.008,
        bevelSize: 0.006,
        bevelSegments: 2,
      }),
    );
    const starMesh = new THREE.Mesh(starGeo, hatStarMat);
    starMesh.position.set(0, 0.145, 0.295);
    starMesh.rotation.x = -0.24;
    mageHatGroup.add(starMesh);
  }

  // (3) Rogue Forehead Tactical Goggles & Strap
  const rogueGogglesGroup = new THREE.Group();
  rogueGogglesGroup.position.set(0, 0.2, 0.01);
  rogueGogglesGroup.visible = false;
  headGroup.add(rogueGogglesGroup);
  {
    const goggleStrapMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x262930, roughness: 0.65, metalness: 0.12 }),
    );
    const goggleFrameMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x3b4049, roughness: 0.36, metalness: 0.62 }),
    );
    const goggleLensMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x161920,
        roughness: 0.08,
        metalness: 0.22,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
      }),
    );

    const strap = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.405, 0.026, 8, 28)), goggleStrapMat);
    strap.rotation.x = Math.PI / 2 + 0.22;
    strap.scale.set(1.06, 0.98, 1.0);
    rogueGogglesGroup.add(strap);

    for (const side of [-1, 1] as const) {
      const frame = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.095, 0.024, 10, 20)), goggleFrameMat);
      frame.scale.set(1.22, 0.88, 1.0);
      frame.position.set(side * 0.132, 0.04, 0.355);
      frame.rotation.set(-0.28, side * 0.25, 0);
      rogueGogglesGroup.add(frame);

      const lens = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.088, 14, 12)), goggleLensMat);
      lens.scale.set(1.18, 0.84, 0.42);
      lens.position.set(side * 0.132, 0.04, 0.355);
      lens.rotation.set(-0.28, side * 0.25, 0);
      rogueGogglesGroup.add(lens);
    }
    const bridge = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.08, 0.032, 0.035)), goggleFrameMat);
    bridge.position.set(0, 0.055, 0.375);
    rogueGogglesGroup.add(bridge);
  }

  // (4) Archer Back Leather Quiver with Feathered Arrows + Cross-Chest Strap
  const archerQuiverGroup = new THREE.Group();
  archerQuiverGroup.visible = false;
  torso.add(archerQuiverGroup);
  {
    const quiverLeatherMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: textures.quiltedLeather,
        color: 0x7b4c2d,
        roughness: 0.64,
        metalness: 0.08,
      }),
    );
    const fletchMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xe7dfd1, roughness: 0.72, metalness: 0.02 }),
    );
    const quiverHolder = new THREE.Group();
    quiverHolder.position.set(-0.08, 0.06, -0.32);
    quiverHolder.rotation.z = -0.52;
    quiverHolder.rotation.x = 0.12;
    archerQuiverGroup.add(quiverHolder);

    const tube = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.092, 0.072, 0.46, 14)), quiverLeatherMat);
    quiverHolder.add(tube);

    const rim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.094, 0.018, 8, 16)), leatherDarkMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.225;
    quiverHolder.add(rim);

    // 5 feathered arrows poking out of quiver
    const arrowOffsets: Array<[number, number, number]> = [
      [0, 0, 0],
      [-0.038, 0.02, 0.08],
      [0.038, 0.02, -0.09],
      [-0.02, -0.035, 0.05],
      [0.024, -0.03, -0.06],
    ];
    for (const [ax, az, tilt] of arrowOffsets) {
      const shaft = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.008, 0.008, 0.26, 6)), toolHandleMat);
      shaft.position.set(ax, 0.31, az);
      shaft.rotation.z = tilt;
      quiverHolder.add(shaft);

      const fletch = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.048, 0.095, 0.008)), fletchMat);
      fletch.position.set(ax, 0.39, az);
      fletch.rotation.y = ax * 18;
      fletch.rotation.z = tilt;
      quiverHolder.add(fletch);
    }

    // Diagonal leather cross-chest strap
    const chestStrap = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.054, 0.64, 0.026)), quiverLeatherMat);
    chestStrap.position.set(0.01, 0.01, 0.285);
    chestStrap.rotation.z = 0.62;
    archerQuiverGroup.add(chestStrap);

    const strapBuckle = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.068, 0.052, 0.036)), goldMat);
    strapBuckle.position.set(-0.11, -0.1, 0.29);
    strapBuckle.rotation.z = 0.62;
    archerQuiverGroup.add(strapBuckle);
  }

  // ---------------- LEFT ARM (parented to torso with seamless shoulder & elbow) ----------------
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.31, 0.18, 0.02);
  torso.add(leftArm);

  const lShoulder = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.112, 14, 12)), denimMat);
  leftArm.add(lShoulder);

  const lUpper = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.088, 0.15, 6, 12)), denimMat);
  lUpper.position.y = -0.12;
  leftArm.add(lUpper);

  const lForearm = new THREE.Group();
  lForearm.position.set(0, -0.21, 0);
  leftArm.add(lForearm);

  const lLower = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.086, 0.082, 0.12, 12)), denimMat);
  lLower.position.y = -0.05;
  lForearm.add(lLower);

  const lCuff = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.092, 0.09, 0.055, 14)), denimTrimMat);
  lCuff.position.y = -0.095;
  lForearm.add(lCuff);

  const lPaw = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.078, 14, 12)), furMat);
  lPaw.position.y = -0.155;
  lForearm.add(lPaw);

  // Round Wooden Shield with Steel Riveted Rim, Gold Trim & Raised 3D Paw Emblem
  const shieldGroup = new THREE.Group();
  shieldGroup.position.set(-0.14, -0.02, 0.06);
  shieldGroup.rotation.y = -Math.PI / 2 + 0.16;
  lForearm.add(shieldGroup);

  const shieldDisc = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.33, 0.33, 0.046, 28)), shieldWoodMat);
  shieldDisc.rotation.x = Math.PI / 2;
  shieldGroup.add(shieldDisc);

  const shieldRim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.33, 0.034, 12, 32)), steelMat);
  shieldGroup.add(shieldRim);

  const shieldGoldTrim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.282, 0.011, 8, 28)), goldMat);
  shieldGoldTrim.position.z = 0.024;
  shieldGroup.add(shieldGoldTrim);

  for (let r = 0; r < 12; r++) {
    const angle = (r / 12) * Math.PI * 2;
    const rivet = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.014, 8, 8)), steelMat);
    rivet.position.set(Math.cos(angle) * 0.33, Math.sin(angle) * 0.33, 0.03);
    shieldGroup.add(rivet);
  }

  for (const sy of [-0.08, 0.08]) {
    const strap = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.24, 0.04, 0.022)), leatherDarkMat);
    strap.position.set(0, sy, -0.03);
    shieldGroup.add(strap);
  }

  const mainPad = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.092, 16, 12)), goldMat);
  mainPad.scale.set(1.16, 0.94, 0.38);
  mainPad.position.set(0, -0.052, 0.03);
  shieldGroup.add(mainPad);

  const toeSpecs: Array<[number, number, number]> = [
    [-0.112, 0.055, 0.28],
    [-0.04, 0.122, 0.1],
    [0.04, 0.122, -0.1],
    [0.112, 0.055, -0.28],
  ];
  for (const [tx, ty, rz] of toeSpecs) {
    const toe = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.038, 12, 10)), goldMat);
    toe.scale.set(0.86, 1.18, 0.44);
    toe.rotation.z = rz;
    toe.position.set(tx, ty, 0.032);
    shieldGroup.add(toe);
  }

  // ---------------- RIGHT ARM + 6 SWITCHABLE FORGED 3D WEAPONS & TOOLS ----------------
  const rightArm = new THREE.Group();
  rightArm.position.set(0.31, 0.18, 0.02);
  torso.add(rightArm);

  const rShoulder = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.112, 14, 12)), denimMat);
  rightArm.add(rShoulder);

  const rUpper = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.088, 0.15, 6, 12)), denimMat);
  rUpper.position.y = -0.12;
  rightArm.add(rUpper);

  const rForearm = new THREE.Group();
  rForearm.position.set(0, -0.21, 0);
  rightArm.add(rForearm);

  const rLower = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.086, 0.082, 0.12, 12)), denimMat);
  rLower.position.y = -0.05;
  rForearm.add(rLower);

  const rCuff = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.092, 0.09, 0.055, 14)), denimTrimMat);
  rCuff.position.y = -0.095;
  rForearm.add(rCuff);

  const rPaw = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.078, 14, 12)), furMat);
  rPaw.position.y = -0.155;
  rForearm.add(rPaw);

  // Weapon mount socket inside right paw
  const weaponSocket = new THREE.Group();
  weaponSocket.position.set(0.02, -0.155, 0.07);
  weaponSocket.rotation.x = Math.PI * 0.38;
  rForearm.add(weaponSocket);

  const swordLight = new THREE.PointLight(0x4be3ff, 0.6, 7.5, 1.8);
  swordLight.position.set(0, 0.42, 0.08);
  weaponSocket.add(swordLight);

  const weaponMeshes: Record<WeaponId, THREE.Group> = {
    crystal_sword: new THREE.Group(),
    stone_axe: new THREE.Group(),
    stone_pickaxe: new THREE.Group(),
    iron_axe: new THREE.Group(),
    iron_pickaxe: new THREE.Group(),
    hunter_blade: new THREE.Group(),
    essence_battleaxe: new THREE.Group(),
    rune_greatsword: new THREE.Group(),
    // Archer Bows
    recurve_bow: new THREE.Group(),
    windstrider_bow: new THREE.Group(),
    azure_star_bow: new THREE.Group(),
    // Healer Staves
    emerald_wing_staff: new THREE.Group(),
    sanctuary_staff: new THREE.Group(),
    seraphic_staff: new THREE.Group(),
    // Mage Wands & Staves
    crystal_wand: new THREE.Group(),
    amethyst_wand: new THREE.Group(),
    astral_nova_staff: new THREE.Group(),
    // Rogue Daggers
    tactical_dagger: new THREE.Group(),
    viper_dagger: new THREE.Group(),
    eclipse_dagger: new THREE.Group(),
  };

  // (1) Default Crystal Short Sword
  {
    const g = weaponMeshes.crystal_sword;
    g.add(new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.025, 0.028, 0.165, 12)), leatherDarkMat));
    const pommel = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.042, 0)), goldMat);
    pommel.position.y = -0.1;
    g.add(pommel);
    const guardCenter = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.11, 0.062, 0.065)), darkIronMat);
    guardCenter.position.y = 0.092;
    g.add(guardCenter);
    for (const side of [-1, 1] as const) {
      const wing = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.095, 0.042, 0.05)), steelMat);
      wing.position.set(side * 0.085, 0.102, 0);
      wing.rotation.z = side * 0.32;
      g.add(wing);
    }
    const guardGem = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.032, 0)), swordGlowMat);
    guardGem.position.set(0, 0.094, 0.035);
    g.add(guardGem);

    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(-0.058, 0);
    bladeShape.lineTo(0.058, 0);
    bladeShape.lineTo(0.048, 0.46);
    bladeShape.lineTo(0, 0.66);
    bladeShape.lineTo(-0.048, 0.46);
    bladeShape.closePath();
    const bladeGeo = trackGeo(
      new THREE.ExtrudeGeometry(bladeShape, {
        depth: 0.022,
        bevelEnabled: true,
        bevelThickness: 0.016,
        bevelSize: 0.013,
        bevelSegments: 2,
      }),
    );
    bladeGeo.translate(0, 0, -0.011);
    const blade = new THREE.Mesh(bladeGeo, swordGlowMat);
    blade.position.y = 0.115;
    g.add(blade);
    const core = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.024, 0.48, 0.056)), swordCoreMat);
    core.position.y = 0.37;
    g.add(core);
  }

  // Helper for Stone & Iron Axes (blade oriented along local +Z so cutting edge faces DOWNWARD when held/swung)
  const buildAxe = (g: THREE.Group, isIron: boolean) => {
    const handle = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.024, 0.028, 0.82, 10)), toolHandleMat);
    handle.position.y = 0.28;
    g.add(handle);

    const gripWrap = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.031, 0.031, 0.2, 10)), leatherDarkMat);
    gripWrap.position.y = -0.02;
    g.add(gripWrap);

    const pom = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.036, 10, 8)), isIron ? goldMat : leatherDarkMat);
    pom.position.y = -0.14;
    g.add(pom);

    const collar = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.095, 0.13, 0.095)),
      isIron ? darkIronMat : leatherDarkMat,
    );
    collar.position.set(0, 0.56, 0);
    g.add(collar);

    const axeShape = new THREE.Shape();
    axeShape.moveTo(0, -0.065);
    axeShape.lineTo(0.25, -0.175);
    axeShape.quadraticCurveTo(0.33, -0.01, 0.24, 0.155);
    axeShape.lineTo(0, 0.075);
    axeShape.closePath();
    const headGeo = trackGeo(
      new THREE.ExtrudeGeometry(axeShape, {
        depth: isIron ? 0.024 : 0.042,
        bevelEnabled: true,
        bevelThickness: 0.012,
        bevelSize: 0.01,
        bevelSegments: 2,
      }),
    );
    headGeo.translate(0, 0, isIron ? -0.012 : -0.021);
    const blade = new THREE.Mesh(headGeo, isIron ? steelMat : forgedStoneMat);
    blade.position.set(0, 0.56, 0.02);
    // -PI/2 maps +X (cutting edge) onto local +Z, which points DOWNWARD under weaponSocket.rotation.x = +0.38*PI
    blade.rotation.y = -Math.PI / 2;
    g.add(blade);

    if (isIron) {
      // Back spike counterweight strictly opposite the downward cutting edge (local -Z)
      const spike = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.04, 0.13, 6)), darkIronMat);
      spike.rotation.x = -Math.PI / 2;
      spike.position.set(0, 0.56, -0.1);
      g.add(spike);
    }
  };
  buildAxe(weaponMeshes.stone_axe, false);
  buildAxe(weaponMeshes.iron_axe, true);

  // Helper for Stone & Iron Pickaxes
  const buildPickaxe = (g: THREE.Group, isIron: boolean) => {
    const handle = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.024, 0.028, 0.84, 10)), toolHandleMat);
    handle.position.y = 0.29;
    g.add(handle);

    const wrap = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.031, 0.031, 0.2, 10)), leatherDarkMat);
    wrap.position.y = -0.02;
    g.add(wrap);

    const hub = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.09, 0.1, 0.12)),
      isIron ? darkIronMat : leatherDarkMat,
    );
    hub.position.set(0, 0.62, 0);
    g.add(hub);

    const headMat = isIron ? steelMat : forgedStoneMat;
    // Front curved mining prong + back chisel prong
    for (const dir of [-1, 1] as const) {
      const arm = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.048, 0.34, 6)), headMat);
      arm.rotation.x = dir * (Math.PI * 0.5 + 0.22);
      arm.position.set(0, 0.59, dir * 0.19);
      g.add(arm);
    }
    if (isIron) {
      const band = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.045, 0.01, 6, 12)), goldMat);
      band.rotation.x = Math.PI / 2;
      band.position.y = 0.54;
      g.add(band);
    }
  };
  buildPickaxe(weaponMeshes.stone_pickaxe, false);
  buildPickaxe(weaponMeshes.iron_pickaxe, true);

  // (6) Monster-Loot Hunter Fang Longsword (야수 송곳니 장검)
  {
    const g = weaponMeshes.hunter_blade;
    const boneMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xf4ead3, roughness: 0.42, metalness: 0.08 }),
    );
    const grip = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.026, 0.03, 0.2, 10)), leatherDarkMat);
    g.add(grip);

    const pom = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.04, 0.09, 8)), boneMat);
    pom.rotation.x = Math.PI;
    pom.position.y = -0.13;
    g.add(pom);

    // Curved twin-fang crossguard
    for (const side of [-1, 1] as const) {
      const fangGuard = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.026, 0.16, 7)), boneMat);
      fangGuard.position.set(side * 0.09, 0.11, 0);
      fangGuard.rotation.z = -side * 1.15;
      g.add(fangGuard);
    }

    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(-0.055, 0);
    bladeShape.lineTo(0.055, 0);
    bladeShape.lineTo(0.072, 0.26);
    bladeShape.lineTo(0.044, 0.56);
    bladeShape.lineTo(0, 0.78);
    bladeShape.lineTo(-0.048, 0.54);
    bladeShape.closePath();
    const hbGeo = trackGeo(
      new THREE.ExtrudeGeometry(bladeShape, {
        depth: 0.022,
        bevelEnabled: true,
        bevelThickness: 0.012,
        bevelSize: 0.01,
        bevelSegments: 2,
      }),
    );
    hbGeo.translate(0, 0, -0.011);
    const blade = new THREE.Mesh(hbGeo, steelMat);
    blade.position.y = 0.12;
    g.add(blade);

    const fangSpine = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.024, 0.52, 0.048)), boneMat);
    fangSpine.position.y = 0.42;
    g.add(fangSpine);
  }

  // (7) Monster-Loot Magic Essence Battleaxe (마력 정수 전투도끼 — downward-facing twin rune edge!)
  {
    const g = weaponMeshes.essence_battleaxe;
    const essenceEdgeMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x6ee7b7,
        emissive: 0x10b981,
        emissiveIntensity: 1.25,
        roughness: 0.2,
        metalness: 0.35,
      }),
    );

    const handle = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.025, 0.03, 0.9, 10)), toolHandleMat);
    handle.position.y = 0.31;
    g.add(handle);

    const leatherWrap = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.033, 0.033, 0.24, 10)), leatherDarkMat);
    leatherWrap.position.y = 0.02;
    g.add(leatherWrap);

    const collar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.11, 0.15, 0.11)), darkIronMat);
    collar.position.set(0, 0.62, 0);
    g.add(collar);

    const axeShape = new THREE.Shape();
    axeShape.moveTo(0, -0.08);
    axeShape.lineTo(0.3, -0.22);
    axeShape.quadraticCurveTo(0.39, 0, 0.29, 0.2);
    axeShape.lineTo(0, 0.09);
    axeShape.closePath();
    const headGeo = trackGeo(
      new THREE.ExtrudeGeometry(axeShape, {
        depth: 0.026,
        bevelEnabled: true,
        bevelThickness: 0.012,
        bevelSize: 0.01,
        bevelSegments: 2,
      }),
    );
    headGeo.translate(0, 0, -0.013);
    const blade = new THREE.Mesh(headGeo, darkIronMat);
    blade.position.set(0, 0.62, 0.02);
    // Cutting edge faces DOWNWARD (+Z in weaponSocket space)
    blade.rotation.y = -Math.PI / 2;
    g.add(blade);

    const glowEdge = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.24, 0.018, 6, 16, Math.PI * 0.72)), essenceEdgeMat);
    glowEdge.position.set(0, 0.62, 0.14);
    glowEdge.rotation.y = Math.PI / 2;
    glowEdge.rotation.z = -Math.PI * 0.36;
    g.add(glowEdge);

    const orb = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.068, 0)), essenceEdgeMat);
    orb.position.set(0, 0.62, -0.1);
    g.add(orb);
  }

  // (8) Forged Rune Crystal Greatsword
  {
    const g = weaponMeshes.rune_greatsword;
    const grip = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.027, 0.03, 0.22, 12)), leatherDarkMat);
    grip.position.y = 0.02;
    g.add(grip);

    const pom = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.052, 0)), goldMat);
    pom.position.y = -0.12;
    g.add(pom);

    const guard = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.32, 0.068, 0.07)), goldMat);
    guard.position.y = 0.14;
    g.add(guard);

    const gem = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.045, 0)), swordGlowMat);
    gem.position.set(0, 0.14, 0.042);
    g.add(gem);

    const gsShape = new THREE.Shape();
    gsShape.moveTo(-0.075, 0);
    gsShape.lineTo(0.075, 0);
    gsShape.lineTo(0.068, 0.64);
    gsShape.lineTo(0, 0.88);
    gsShape.lineTo(-0.068, 0.64);
    gsShape.closePath();
    const gsGeo = trackGeo(
      new THREE.ExtrudeGeometry(gsShape, {
        depth: 0.026,
        bevelEnabled: true,
        bevelThickness: 0.018,
        bevelSize: 0.014,
        bevelSegments: 2,
      }),
    );
    gsGeo.translate(0, 0, -0.013);
    const steelBlade = new THREE.Mesh(gsGeo, steelMat);
    steelBlade.position.y = 0.17;
    g.add(steelBlade);

    // Glowing cyan rune channel down center of greatsword
    const runeBlade = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.042, 0.66, 0.064)), swordGlowMat);
    runeBlade.position.y = 0.52;
    g.add(runeBlade);
  }

  // ---------------- CLASS WEAPONS (BOWS, STAVES, WANDS, DAGGERS) ----------------
  const emeraldGemMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x10b981,
      emissiveIntensity: 1.35,
      roughness: 0.12,
      metalness: 0.24,
    }),
  );
  const amethystGemMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xc084fc,
      emissive: 0x9333ea,
      emissiveIntensity: 1.3,
      roughness: 0.14,
      metalness: 0.25,
    }),
  );
  const ivoryWingMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.34,
      metalness: 0.08,
    }),
  );
  const bowStringMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xe2e8f0 }),
  );

  // Archer Bows (3 Tiers)
  const buildBow = (g: THREE.Group, tier: 1 | 2 | 3) => {
    const limbMat =
      tier === 1
        ? darkIronMat
        : tier === 2
          ? trackMat(new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.42, metalness: 0.32 }))
          : paladinPlateMat;
    const accentMat = tier === 1 ? leatherDarkMat : tier === 2 ? emeraldGemMat : swordGlowMat;

    const bowCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.48, -0.14),
      new THREE.Vector3(0, -0.32, 0.06),
      new THREE.Vector3(0, -0.1, 0.12),
      new THREE.Vector3(0, 0.1, 0.12),
      new THREE.Vector3(0, 0.32, 0.06),
      new THREE.Vector3(0, 0.48, -0.14),
    ]);
    const bowArc = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(bowCurve, 20, 0.022 + tier * 0.003, 8, false)), limbMat);
    bowArc.position.set(0, 0.22, 0);
    g.add(bowArc);

    const grip = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.03, 0.03, 0.18, 10)), leatherDarkMat);
    grip.position.set(0, 0.22, 0.12);
    g.add(grip);

    const stringGeo = trackGeo(new THREE.CylinderGeometry(0.0045, 0.0045, 0.94, 6));
    const stringMesh = new THREE.Mesh(stringGeo, bowStringMat);
    stringMesh.position.set(0, 0.22, -0.14);
    g.add(stringMesh);

    // Notched glowing/wooden arrow
    const arrowShaft = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.008, 0.008, 0.62, 6)), toolHandleMat);
    arrowShaft.rotation.x = Math.PI / 2;
    arrowShaft.position.set(0, 0.22, 0.14);
    g.add(arrowShaft);

    const arrowHead = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.022, 0.085, 6)), tier >= 2 ? accentMat : steelMat);
    arrowHead.rotation.x = Math.PI / 2;
    arrowHead.position.set(0, 0.22, 0.47);
    g.add(arrowHead);

    if (tier >= 2) {
      for (const s of [-1, 1] as const) {
        const tipGem = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.026, 0)), accentMat);
        tipGem.position.set(0, 0.22 + s * 0.45, -0.11);
        g.add(tipGem);
      }
    }
  };
  buildBow(weaponMeshes.recurve_bow, 1);
  buildBow(weaponMeshes.windstrider_bow, 2);
  buildBow(weaponMeshes.azure_star_bow, 3);

  // Healer Winged Emerald Staves (3 Tiers)
  const buildHealerStaff = (g: THREE.Group, tier: 1 | 2 | 3) => {
    const shaftMat = tier === 3 ? goldMat : toolHandleMat;
    const shaft = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.022, 0.026, 1.05, 10)), shaftMat);
    shaft.position.y = 0.34;
    g.add(shaft);

    const collar = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.032, 0.028, 0.24, 10)), ivoryWingMat);
    collar.position.y = 0.7;
    g.add(collar);

    const tipSpike = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.025, 0.08, 8)), steelMat);
    tipSpike.rotation.x = Math.PI;
    tipSpike.position.y = -0.22;
    g.add(tipSpike);

    // Emerald gemstone centerpiece
    const gem = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.068 + tier * 0.008, 1)), emeraldGemMat);
    gem.scale.set(0.82, 1.25, 0.65);
    gem.position.set(0, 0.89, 0);
    g.add(gem);

    const bezel = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.078, 0.014, 8, 18)), tier >= 2 ? goldMat : ivoryWingMat);
    bezel.scale.set(0.85, 1.25, 1.0);
    bezel.position.set(0, 0.89, 0);
    g.add(bezel);

    // Twin sculpted angelic wings around crystal
    for (const side of [-1, 1] as const) {
      const wingCount = tier === 1 ? 2 : 3;
      for (let w = 0; w < wingCount; w++) {
        const feather = new THREE.Mesh(
          trackGeo(new THREE.ConeGeometry(0.032 - w * 0.004, 0.22 - w * 0.025, 6)),
          tier === 3 && w === 0 ? goldMat : ivoryWingMat,
        );
        feather.scale.set(0.42, 1.0, 1.2);
        feather.position.set(side * (0.115 + w * 0.035), 0.92 - w * 0.045, 0);
        feather.rotation.z = -side * (0.72 + w * 0.28);
        g.add(feather);
      }
    }

    if (tier === 3) {
      const topHalo = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.11, 0.012, 8, 22)), goldMat);
      topHalo.position.set(0, 1.04, 0);
      topHalo.rotation.x = Math.PI / 2;
      g.add(topHalo);
    }
  };
  buildHealerStaff(weaponMeshes.emerald_wing_staff, 1);
  buildHealerStaff(weaponMeshes.sanctuary_staff, 2);
  buildHealerStaff(weaponMeshes.seraphic_staff, 3);

  // Mage Crystal Wands & Astral Staff (3 Tiers)
  const buildMageWand = (g: THREE.Group, tier: 1 | 2 | 3) => {
    const len = tier === 1 ? 0.72 : tier === 2 ? 0.84 : 1.02;
    const shaftMat = tier === 1 ? toolHandleMat : tier === 2 ? darkIronMat : paladinPlateMat;
    const gemMat = tier === 1 ? swordGlowMat : tier === 2 ? amethystGemMat : swordGlowMat;

    const shaft = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.018, 0.028, len, 10)), shaftMat);
    shaft.position.y = len * 0.35;
    g.add(shaft);

    const crystalY = len * 0.85 + 0.05;
    const crystal = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.056 + tier * 0.012, 0)), gemMat);
    crystal.scale.set(0.76, 1.55, 0.76);
    crystal.position.y = crystalY;
    g.add(crystal);

    const coreGlow = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.034, 0)), swordCoreMat);
    coreGlow.scale.set(0.7, 1.4, 0.7);
    coreGlow.position.y = crystalY;
    g.add(coreGlow);

    if (tier >= 2) {
      const ring = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.095, 0.012, 8, 20)), goldMat);
      ring.position.y = crystalY;
      ring.rotation.x = Math.PI * 0.35;
      g.add(ring);
    }
    if (tier === 3) {
      const ring2 = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.135, 0.01, 8, 22)), amethystGemMat);
      ring2.position.y = crystalY;
      ring2.rotation.y = Math.PI * 0.5;
      ring2.rotation.x = -Math.PI * 0.25;
      g.add(ring2);
    }
  };
  buildMageWand(weaponMeshes.crystal_wand, 1);
  buildMageWand(weaponMeshes.amethyst_wand, 2);
  buildMageWand(weaponMeshes.astral_nova_staff, 3);

  // Rogue Tactical & Shadow Daggers (3 Tiers)
  const buildDagger = (g: THREE.Group, tier: 1 | 2 | 3) => {
    const grip = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.022, 0.025, 0.16, 10)), leatherDarkMat);
    g.add(grip);

    const guard = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.14, 0.028, 0.044)), darkIronMat);
    guard.position.y = 0.085;
    g.add(guard);

    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(-0.042, 0);
    bladeShape.lineTo(0.042, 0);
    bladeShape.lineTo(0.032, 0.28 + tier * 0.04);
    bladeShape.lineTo(0, 0.42 + tier * 0.05);
    bladeShape.lineTo(-0.032, 0.28 + tier * 0.04);
    bladeShape.closePath();

    const dGeo = trackGeo(
      new THREE.ExtrudeGeometry(bladeShape, {
        depth: 0.016,
        bevelEnabled: true,
        bevelThickness: 0.008,
        bevelSize: 0.008,
        bevelSegments: 2,
      }),
    );
    dGeo.translate(0, 0, -0.008);
    const bladeMat = tier === 1 ? darkIronMat : tier === 2 ? darkIronMat : paladinPlateMat;
    const blade = new THREE.Mesh(dGeo, bladeMat);
    blade.position.y = 0.095;
    g.add(blade);

    if (tier >= 2) {
      const edgeMat = tier === 2 ? emeraldGemMat : amethystGemMat;
      const edgeGlow = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.016, 0.34, 0.036)), edgeMat);
      edgeGlow.position.y = 0.29;
      g.add(edgeGlow);
    }
  };
  buildDagger(weaponMeshes.tactical_dagger, 1);
  buildDagger(weaponMeshes.viper_dagger, 2);
  buildDagger(weaponMeshes.eclipse_dagger, 3);

  (Object.keys(weaponMeshes) as WeaponId[]).forEach((id) => {
    weaponMeshes[id].visible = id === 'crystal_sword';
    weaponSocket.add(weaponMeshes[id]);
  });

  // Sword / Tool Swing Arc VFX
  const arcGeo = trackGeo(new THREE.RingGeometry(0.55, 1.15, 24, 1, -Math.PI * 0.38, Math.PI * 0.76));
  arcGeo.rotateX(-Math.PI / 2);
  const arcMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x72ebff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const slashArc = new THREE.Mesh(arcGeo, arcMat);
  slashArc.position.set(0, 0.86, 0.36);
  slashArc.visible = false;
  root.add(slashArc);

  // ---------------- SEAMLESS 7-JOINT CONTINUOUS OVERLAPPING TABBY TAIL ----------------
  // Attached cleanly to pelvisBridge back with soft fur base cuff and overlapping spherical capsules!
  const tailJoints: THREE.Group[] = [];
  const tailRestPitch = [-0.48, -0.24, -0.06, 0.14, 0.28, 0.36, 0.26];
  const tailRadii = [0.072, 0.068, 0.064, 0.06, 0.056, 0.052, 0.048];
  const tailSegLen = 0.115;

  const tailRoot = new THREE.Group();
  tailRoot.position.set(0, 0.54, -0.22);
  bodyGroup.add(tailRoot);

  // Plush root fur cuff tucking seamlessly into jacket/pelvis back
  const tailBaseFluff = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.088, 12, 10)), furMat);
  tailBaseFluff.scale.set(1.05, 0.95, 1.1);
  tailRoot.add(tailBaseFluff);

  const tailSegMeshes: THREE.Mesh[] = [];
  let tailTipMesh: THREE.Mesh | null = null;
  let parentTailNode: THREE.Object3D = tailRoot;
  for (let i = 0; i < tailRestPitch.length; i++) {
    const joint = new THREE.Group();
    joint.position.set(0, 0, i === 0 ? -0.02 : -tailSegLen);
    joint.rotation.x = tailRestPitch[i];
    parentTailNode.add(joint);
    tailJoints.push(joint);

    const mat = i % 2 === 0 ? furMat : darkStripeMat;
    // Overlapping capsule rotated along -Z so adjacent joints blend like a real plush tail!
    const seg = new THREE.Mesh(
      trackGeo(new THREE.CapsuleGeometry(tailRadii[i], tailSegLen * 0.92, 6, 12)),
      mat,
    );
    seg.rotation.x = Math.PI / 2;
    seg.position.set(0, 0, -tailSegLen * 0.5);
    joint.add(seg);
    tailSegMeshes.push(seg);

    // Extra plush rounded tip at the end
    if (i === tailRestPitch.length - 1) {
      const tip = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.056, 12, 10)), darkStripeMat);
      tip.position.set(0, 0, -tailSegLen * 0.95);
      joint.add(tip);
      tailTipMesh = tip;
    }

    parentTailNode = joint;
  }

  // ---------------- DYNAMIC 3D ARMOR SETS & FLOWING CAPE RIG ----------------
  const armorGroups: Record<ArmorId, THREE.Object3D[]> = {
    pioneer_denim: [],
    wild_leather: [],
    iron_plate: [],
    frost_wolf_cloak: [],
    rune_paladin: [],
    // Archer Armors
    olive_puffer: [],
    forest_stalker: [],
    gale_hawk_garb: [],
    // Healer Armors
    cream_cardigan: [],
    ivory_acolyte: [],
    seraph_vestment: [],
    // Mage Armors
    violet_hoodie: [],
    amethyst_robe: [],
    astral_archmage: [],
    // Rogue Armors
    stealth_cargo: [],
    nightshade_gear: [],
    eclipse_shroud: [],
  };

  const registerArmorPart = (id: ArmorId, parent: THREE.Object3D): THREE.Group => {
    const g = new THREE.Group();
    g.visible = false;
    parent.add(g);
    armorGroups[id].push(g);
    return g;
  };

  // Shared flowing cape pivot mounted on upper back, angled clear of the 7-joint tabby tail
  const capePivot = new THREE.Group();
  capePivot.position.set(0, 0.22, -0.275);
  torso.add(capePivot);

  const buildCapeGeometry = (topW: number, botW: number, length: number): THREE.BufferGeometry => {
    const safeLen = Math.max(0.001, length);
    const geo = new THREE.PlaneGeometry(1, safeLen, 5, 7);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i); // -0.5..0.5
      const y = pos.getY(i); // -safeLen/2..safeLen/2
      // Clamp to [0, 1] because Float32Array rounding (e.g. 0.74 / 2 -> 0.3700000048)
      // can otherwise make (0.5 - y / safeLen) slightly negative and turn Math.pow(t, 1.35) into NaN.
      const t = THREE.MathUtils.clamp(0.5 - y / safeLen, 0, 1);
      const w = THREE.MathUtils.lerp(topW, botW, t);
      const curveZ = -Math.pow(t, 1.35) * 0.24 - Math.abs(x) * 0.08 * t;
      pos.setXYZ(i, x * w, -t * safeLen, curveZ);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    return trackGeo(geo);
  };

  // (A) Wild Leather Hunter Armor — Stitched leather pauldrons, 5-fang beast trophy necklace & forearm bracers
  {
    const chestGroup = registerArmorPart('wild_leather', torso);
    const collarStrap = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.24, 0.022, 8, 22, Math.PI * 1.15)),
      leatherDarkMat,
    );
    collarStrap.rotation.x = Math.PI / 2 + 0.22;
    collarStrap.rotation.z = Math.PI * 0.92;
    collarStrap.position.set(0, 0.2, 0.055);
    chestGroup.add(collarStrap);

    for (let f = -2; f <= 2; f++) {
      const angle = f * 0.28;
      const fangLen = f === 0 ? 0.095 : Math.abs(f) === 1 ? 0.078 : 0.062;
      const fang = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.017, fangLen, 7)), fangIvoryMat);
      fang.position.set(Math.sin(angle) * 0.21, 0.155 - Math.abs(f) * 0.008, Math.cos(angle) * 0.22 + 0.055);
      fang.rotation.x = Math.PI + 0.24;
      fang.rotation.z = -angle * 0.65;
      chestGroup.add(fang);
    }

    const sash = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.075, 0.52, 0.04)), hunterLeatherMat);
    sash.position.set(0, 0.01, 0.258);
    sash.rotation.z = 0.54;
    chestGroup.add(sash);

    for (const side of [-1, 1] as const) {
      const armParent = side === -1 ? leftArm : rightArm;
      const pauldronGroup = registerArmorPart('wild_leather', armParent);
      const pad = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.142, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58)),
        hunterLeatherMat,
      );
      pad.scale.set(1.1, 0.9, 1.05);
      pad.position.set(side * 0.025, 0.035, 0);
      pad.rotation.z = -side * 0.28;
      pauldronGroup.add(pad);

      for (let st = -1; st <= 1; st++) {
        const stud = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.016, 8, 8)), bronzeMat);
        stud.position.set(side * 0.135, 0.025, st * 0.055);
        pauldronGroup.add(stud);
      }

      const foreParent = side === -1 ? lForearm : rForearm;
      const bracerGroup = registerArmorPart('wild_leather', foreParent);
      const bracer = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.098, 0.094, 0.115, 14)), hunterLeatherMat);
      bracer.position.y = -0.068;
      bracerGroup.add(bracer);
      const bBand = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.096, 0.01, 6, 14)), bronzeMat);
      bBand.rotation.x = Math.PI / 2;
      bBand.position.y = -0.025;
      bracerGroup.add(bBand);
    }
  }

  // (B) Iron Guardian Plate Armor — Fluted steel cuirass, waist tassets, knight pauldrons, shin greaves & crimson cape
  {
    const torsoPlate = registerArmorPart('iron_plate', torso);
    const cuirass = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.285, 0.295, 0.48, 22)), plateSteelMat);
    cuirass.scale.set(1.09, 1.0, 0.98);
    cuirass.position.y = 0.025;
    torsoPlate.add(cuirass);

    const chestRidge = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.042, 0.42, 0.05)), goldMat);
    chestRidge.position.set(0, 0.035, 0.278);
    torsoPlate.add(chestRidge);

    for (const s of [-1, 1] as const) {
      const filigree = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.024, 0.36, 0.035)), goldMat);
      filigree.position.set(0, 0.04, 0.282);
      filigree.rotation.z = s * 0.62;
      torsoPlate.add(filigree);

      // Hip plate tassets
      const tasset = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.18, 0.16, 0.05)), plateSteelMat);
      tasset.position.set(s * 0.22, -0.3, 0.14);
      tasset.rotation.set(-0.22, s * 0.55, s * 0.14);
      torsoPlate.add(tasset);

      const tassetRim = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.19, 0.02, 0.056)), goldMat);
      tassetRim.position.set(s * 0.22, -0.37, 0.155);
      tassetRim.rotation.set(-0.22, s * 0.55, s * 0.14);
      torsoPlate.add(tassetRim);
    }

    const gorget = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.245, 0.038, 10, 22)), plateSteelMat);
    gorget.rotation.x = Math.PI / 2;
    gorget.position.set(0, 0.245, 0.01);
    torsoPlate.add(gorget);

    const crimsonCapeGroup = registerArmorPart('iron_plate', capePivot);
    const capeMesh = new THREE.Mesh(buildCapeGeometry(0.46, 0.68, 0.72), crimsonCapeMat);
    crimsonCapeGroup.add(capeMesh);
    for (const s of [-1, 1] as const) {
      const clasp = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.032, 0.032, 0.022, 12)), goldMat);
      clasp.rotation.x = Math.PI / 2;
      clasp.position.set(s * 0.2, 0.01, 0.03);
      crimsonCapeGroup.add(clasp);
    }

    for (const side of [-1, 1] as const) {
      const armParent = side === -1 ? leftArm : rightArm;
      const pauldronGroup = registerArmorPart('iron_plate', armParent);
      const dome = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.156, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62)),
        plateSteelMat,
      );
      dome.scale.set(1.12, 0.96, 1.08);
      dome.position.set(side * 0.025, 0.04, 0);
      dome.rotation.z = -side * 0.25;
      pauldronGroup.add(dome);
      const rim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.15, 0.014, 8, 18)), goldMat);
      rim.rotation.x = Math.PI / 2;
      rim.rotation.y = side * 0.25;
      rim.position.set(side * 0.04, -0.02, 0);
      pauldronGroup.add(rim);

      const foreParent = side === -1 ? lForearm : rForearm;
      const vambrace = registerArmorPart('iron_plate', foreParent);
      const vMesh = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.1, 0.094, 0.13, 14)), plateSteelMat);
      vMesh.position.y = -0.065;
      vambrace.add(vMesh);

      const kneeParent = side === -1 ? leftLegRig.knee : rightLegRig.knee;
      const greaveGroup = registerArmorPart('iron_plate', kneeParent);
      const kneeCop = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.088, 12, 10)), plateSteelMat);
      kneeCop.scale.set(1.0, 0.9, 0.65);
      kneeCop.position.set(0, 0.01, 0.095);
      greaveGroup.add(kneeCop);
      const shinPlate = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.108, 0.114, 0.15, 14)), plateSteelMat);
      shinPlate.position.set(0, -0.09, 0.012);
      greaveGroup.add(shinPlate);
    }
  }

  // (C) Frost Wolf Fur Cloak Armor — Plush silver-white wolf mantle across shoulders, frost clasps, fur cuffs & arctic cape
  {
    const mantleGroup = registerArmorPart('frost_wolf_cloak', torso);
    // 9 overlapping plush wolf-fur clusters forming an organic collar & mantle
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI * 0.78 + (i / 8) * Math.PI * 1.56;
      const puff = new THREE.Mesh(trackGeo(new THREE.DodecahedronGeometry(0.128, 1)), wolfFurMat);
      puff.scale.set(1.18, 0.86, 1.05);
      puff.position.set(Math.sin(a) * 0.285, 0.225 + Math.cos(a) * 0.025, -Math.cos(a) * 0.245);
      mantleGroup.add(puff);
    }

    // Twin frost-crystal clasp brooches on chest
    for (const s of [-1, 1] as const) {
      const brooch = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.036, 0)), frostGemMat);
      brooch.position.set(s * 0.13, 0.175, 0.265);
      mantleGroup.add(brooch);
    }
    const frostChain = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.125, 0.01, 6, 16, Math.PI)), steelMat);
    frostChain.rotation.z = Math.PI;
    frostChain.position.set(0, 0.175, 0.265);
    mantleGroup.add(frostChain);

    const frostCapeGroup = registerArmorPart('frost_wolf_cloak', capePivot);
    const fCape = new THREE.Mesh(buildCapeGeometry(0.5, 0.74, 0.74), arcticCapeMat);
    frostCapeGroup.add(fCape);
    const capeTrim = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.042, 0.042, 0.72, 10)), wolfFurMat);
    capeTrim.rotation.z = Math.PI / 2;
    capeTrim.position.set(0, -0.72, -0.24);
    frostCapeGroup.add(capeTrim);

    for (const side of [-1, 1] as const) {
      const foreParent = side === -1 ? lForearm : rForearm;
      const furCuff = registerArmorPart('frost_wolf_cloak', foreParent);
      const cuffRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.096, 0.032, 8, 14)), wolfFurMat);
      cuffRing.rotation.x = Math.PI / 2;
      cuffRing.position.y = -0.095;
      furCuff.add(cuffRing);

      const kneeParent = side === -1 ? leftLegRig.knee : rightLegRig.knee;
      const bootFur = registerArmorPart('frost_wolf_cloak', kneeParent);
      const bRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.112, 0.034, 8, 16)), wolfFurMat);
      bRing.rotation.x = Math.PI / 2;
      bRing.position.y = -0.02;
      bootFur.add(bRing);
    }
  }

  // (D) Rune Crystal Paladin Armor — Gilded cobalt cuirass, glowing cyan rune core, winged gold pauldrons, royal cape & circlet between ears
  {
    const paladinTorso = registerArmorPart('rune_paladin', torso);
    const pCuirass = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.292, 0.302, 0.49, 24)), paladinPlateMat);
    pCuirass.scale.set(1.1, 1.0, 0.99);
    pCuirass.position.y = 0.025;
    paladinTorso.add(pCuirass);

    const goldRimTop = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.258, 0.026, 10, 24)), goldMat);
    goldRimTop.rotation.x = Math.PI / 2;
    goldRimTop.position.y = 0.255;
    paladinTorso.add(goldRimTop);

    const runeHousing = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.072, 0)), goldMat);
    runeHousing.scale.set(1.1, 1.25, 0.45);
    runeHousing.position.set(0, 0.075, 0.285);
    paladinTorso.add(runeHousing);

    const runeCore = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.052, 0)), paladinRuneMat);
    runeCore.scale.set(1.0, 1.25, 0.55);
    runeCore.position.set(0, 0.075, 0.305);
    paladinTorso.add(runeCore);

    for (const s of [-1, 1] as const) {
      const rib = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.14, 0.024, 0.035)), goldMat);
      rib.position.set(s * 0.135, 0.08, 0.268);
      rib.rotation.y = -s * 0.45;
      rib.rotation.z = s * 0.24;
      paladinTorso.add(rib);

      const tasset = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.19, 0.18, 0.052)), paladinPlateMat);
      tasset.position.set(s * 0.225, -0.31, 0.145);
      tasset.rotation.set(-0.22, s * 0.55, s * 0.14);
      paladinTorso.add(tasset);

      const tGold = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.2, 0.025, 0.06)), goldMat);
      tGold.position.set(s * 0.225, -0.39, 0.16);
      tGold.rotation.set(-0.22, s * 0.55, s * 0.14);
      paladinTorso.add(tGold);
    }

    // Royal azure & gold-hemmed cape
    const royalCapeGroup = registerArmorPart('rune_paladin', capePivot);
    const rCape = new THREE.Mesh(buildCapeGeometry(0.5, 0.76, 0.78), royalCapeMat);
    royalCapeGroup.add(rCape);
    const goldHem = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.75, 0.04, 0.018)), goldMat);
    goldHem.position.set(0, -0.76, -0.24);
    royalCapeGroup.add(goldHem);

    // Delicate golden knight circlet resting cleanly BETWEEN the cat ears (keeps ears 100% visible)
    const crownGroup = registerArmorPart('rune_paladin', headGroup);
    const circletBand = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.355, 0.018, 8, 28, Math.PI * 0.72)),
      goldMat,
    );
    circletBand.rotation.x = Math.PI / 2 - 0.16;
    circletBand.rotation.z = Math.PI * 0.14;
    circletBand.position.set(0, 0.255, 0.085);
    crownGroup.add(circletBand);

    const centerCrest = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.048, 0.125, 4)), goldMat);
    centerCrest.position.set(0, 0.345, 0.325);
    centerCrest.rotation.x = -0.32;
    crownGroup.add(centerCrest);

    const crownGem = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.032, 0)), paladinRuneMat);
    crownGem.position.set(0, 0.31, 0.355);
    crownGroup.add(crownGem);

    for (const side of [-1, 1] as const) {
      const armParent = side === -1 ? leftArm : rightArm;
      const pauldronGroup = registerArmorPart('rune_paladin', armParent);
      const dome = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.164, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.64)),
        paladinPlateMat,
      );
      dome.scale.set(1.15, 0.98, 1.1);
      dome.position.set(side * 0.025, 0.045, 0);
      dome.rotation.z = -side * 0.26;
      pauldronGroup.add(dome);

      const goldRim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.158, 0.018, 8, 18)), goldMat);
      goldRim.rotation.x = Math.PI / 2;
      goldRim.rotation.y = side * 0.26;
      goldRim.position.set(side * 0.04, -0.02, 0);
      pauldronGroup.add(goldRim);

      // Swept golden wing fin on pauldron
      const wing = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.042, 0.19, 4)), goldMat);
      wing.scale.set(0.45, 1.0, 1.25);
      wing.position.set(side * 0.14, 0.12, -0.04);
      wing.rotation.set(-0.35, 0, -side * 0.65);
      pauldronGroup.add(wing);

      const foreParent = side === -1 ? lForearm : rForearm;
      const vambrace = registerArmorPart('rune_paladin', foreParent);
      const vMesh = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.102, 0.096, 0.135, 14)), paladinPlateMat);
      vMesh.position.y = -0.065;
      vambrace.add(vMesh);
      const vTrim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.1, 0.012, 6, 14)), goldMat);
      vTrim.rotation.x = Math.PI / 2;
      vTrim.position.y = -0.01;
      vambrace.add(vTrim);

      const kneeParent = side === -1 ? leftLegRig.knee : rightLegRig.knee;
      const greave = registerArmorPart('rune_paladin', kneeParent);
      const kCop = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.092, 12, 10)), goldMat);
      kCop.scale.set(1.0, 0.92, 0.68);
      kCop.position.set(0, 0.01, 0.098);
      greave.add(kCop);
      const sPlate = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.11, 0.116, 0.155, 14)), paladinPlateMat);
      sPlate.position.set(0, -0.09, 0.014);
      greave.add(sPlate);
    }
  }

  // ---------------- CLASS ARMOR 3D ACCENTS ----------------
  // Archer: Quilted puffer ridges + Ranger hood/cape tiers
  {
    const pufferMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x6f7a43, roughness: 0.78, metalness: 0.04 }));
    const forestCapeMat = trackMat(
      new THREE.MeshPhysicalMaterial({ color: 0x2e4a2b, roughness: 0.82, sheen: 0.35, side: THREE.DoubleSide }),
    );
    const galeCapeMat = trackMat(
      new THREE.MeshPhysicalMaterial({ color: 0x0f766e, roughness: 0.72, sheen: 0.5, side: THREE.DoubleSide }),
    );
    for (const id of ['olive_puffer', 'forest_stalker', 'gale_hawk_garb'] as const) {
      const g = registerArmorPart(id, torso);
      const col = id === 'olive_puffer' ? pufferMat : id === 'forest_stalker' ? hunterLeatherMat : paladinPlateMat;
      for (let r = 0; r < 3; r++) {
        const ring = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.285 + r * 0.008, 0.036, 8, 22)), col);
        ring.rotation.x = Math.PI / 2;
        ring.scale.set(1.06, 0.95, 1.0);
        ring.position.y = 0.14 - r * 0.15;
        g.add(ring);
      }
      if (id !== 'olive_puffer') {
        const cGroup = registerArmorPart(id, capePivot);
        cGroup.add(new THREE.Mesh(buildCapeGeometry(0.42, 0.64, 0.66), id === 'forest_stalker' ? forestCapeMat : galeCapeMat));
      }
    }
  }

  // Healer: Cream cardigan gold collar trim + Seraph wing mantle tiers
  {
    const creamCapeMat = trackMat(
      new THREE.MeshPhysicalMaterial({ color: 0xf6ebd4, roughness: 0.78, sheen: 0.45, side: THREE.DoubleSide }),
    );
    for (const id of ['cream_cardigan', 'ivory_acolyte', 'seraph_vestment'] as const) {
      const g = registerArmorPart(id, torso);
      const collarTrim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.22, 0.018, 8, 20, Math.PI * 1.1)), goldMat);
      collarTrim.rotation.x = Math.PI / 2 + 0.18;
      collarTrim.rotation.z = Math.PI * 0.95;
      collarTrim.position.set(0, 0.19, 0.06);
      g.add(collarTrim);

      const pendant = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.036, 0)), id === 'cream_cardigan' ? goldMat : emeraldGemMat);
      pendant.position.set(0, 0.12, 0.275);
      g.add(pendant);

      if (id !== 'cream_cardigan') {
        const cGroup = registerArmorPart(id, capePivot);
        cGroup.add(new THREE.Mesh(buildCapeGeometry(0.48, 0.72, 0.72), creamCapeMat));
      }
      if (id === 'seraph_vestment') {
        for (const s of [-1, 1] as const) {
          const wing = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.048, 0.28, 6)), ivoryWingMat);
          wing.scale.set(0.35, 1.0, 1.3);
          wing.position.set(s * 0.24, 0.14, -0.22);
          wing.rotation.set(-0.3, 0, -s * 0.55);
          g.add(wing);
        }
      }
    }
  }

  // Mage: Purple hoodie front pocket & drawstrings + Archmage star mantle tiers
  {
    const hoodiePocketMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x7c53b8, roughness: 0.84 }));
    const astralCapeMat = trackMat(
      new THREE.MeshPhysicalMaterial({ color: 0x4c1d95, roughness: 0.72, sheen: 0.65, side: THREE.DoubleSide }),
    );
    for (const id of ['violet_hoodie', 'amethyst_robe', 'astral_archmage'] as const) {
      const g = registerArmorPart(id, torso);
      const kPocket = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.24, 0.14, 0.05)), id === 'violet_hoodie' ? hoodiePocketMat : amethystGemMat);
      kPocket.position.set(0, -0.1, 0.268);
      g.add(kPocket);

      for (const s of [-1, 1] as const) {
        const stringDraw = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 6)), ivoryWingMat);
        stringDraw.position.set(s * 0.045, 0.14, 0.27);
        g.add(stringDraw);
      }

      if (id !== 'violet_hoodie') {
        const cGroup = registerArmorPart(id, capePivot);
        cGroup.add(new THREE.Mesh(buildCapeGeometry(0.48, 0.76, 0.75), astralCapeMat));
      }
    }
  }

  // Rogue: Stealth hoodie collar/cargo pockets + Shadow scarf & eclipse shroud
  {
    const stealthMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x2f333b, roughness: 0.76 }));
    const shadowCapeMat = trackMat(
      new THREE.MeshPhysicalMaterial({ color: 0x18181b, roughness: 0.85, sheen: 0.25, side: THREE.DoubleSide }),
    );
    for (const id of ['stealth_cargo', 'nightshade_gear', 'eclipse_shroud'] as const) {
      const g = registerArmorPart(id, torso);
      const scarf = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.23, 0.048, 8, 20)), stealthMat);
      scarf.rotation.x = Math.PI / 2;
      scarf.position.y = 0.24;
      g.add(scarf);

      const frontPocket = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.22, 0.13, 0.045)), stealthMat);
      frontPocket.position.set(0, -0.1, 0.268);
      g.add(frontPocket);

      if (id !== 'stealth_cargo') {
        const cGroup = registerArmorPart(id, capePivot);
        cGroup.add(new THREE.Mesh(buildCapeGeometry(0.42, 0.68, 0.7), shadowCapeMat));
      }
    }
  }

  bodyGroup.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  contactShadow.castShadow = false;
  contactShadow.receiveShadow = false;
  slashArc.castShadow = false;

  // Animation state
  let currentClass: PlayerClassId = 'warrior';
  let currentWeapon: WeaponId = 'crystal_sword';
  let currentArmor: ArmorId = 'pioneer_denim';
  let walkPhase = 0;
  let blinkCooldown = 2.6;
  let blinkProgress = 0;
  let smoothTurn = 0;

  const whiteTipMat = trackMat(
    new THREE.MeshPhysicalMaterial({ color: 0xf8f8fa, roughness: 0.85, sheen: 0.3 }),
  );

  const setClass = (classId: PlayerClassId) => {
    currentClass = classId;
    shieldGroup.visible = classId === 'warrior';
    tabbyStripesGroup.visible = classId === 'warrior' || classId === 'archer';
    calicoPatchesGroup.visible = classId === 'healer';
    healerHaloGroup.visible = classId === 'healer';
    mageHatGroup.visible = classId === 'mage';
    rogueGogglesGroup.visible = classId === 'rogue';
    archerQuiverGroup.visible = classId === 'archer';

    if (classId === 'warrior') {
      furMat.map = textures.tabbyFur;
      furMat.color.setHex(0xffb162);
      furMat.sheenColor.setHex(0xffdcb2);
      darkStripeMat.color.setHex(0xb34712);
      creamFurMat.color.setHex(0xfff3e0);
      whiskerMat.color.setHex(0xfff5e6);
      noseMat.color.setHex(0xf48c98);
      tailSegMeshes.forEach((m, idx) => {
        m.material = idx % 2 === 0 ? furMat : darkStripeMat;
      });
      if (tailTipMesh) tailTipMesh.material = darkStripeMat;
    } else if (classId === 'archer') {
      furMat.map = textures.tabbyFur;
      furMat.color.setHex(0xf5973b);
      furMat.sheenColor.setHex(0xffdfb8);
      darkStripeMat.color.setHex(0xb44c14);
      creamFurMat.color.setHex(0xfff6e8);
      whiskerMat.color.setHex(0xfff5e6);
      noseMat.color.setHex(0xf48c98);
      tailSegMeshes.forEach((m, idx) => {
        m.material = idx % 2 === 0 ? furMat : darkStripeMat;
      });
      if (tailTipMesh) tailTipMesh.material = whiteTipMat;
    } else if (classId === 'healer') {
      furMat.map = null;
      furMat.color.setHex(0xfbf4e8);
      furMat.sheenColor.setHex(0xffffff);
      darkStripeMat.color.setHex(0x6b4732);
      creamFurMat.color.setHex(0xfffaf0);
      whiskerMat.color.setHex(0xfef3c7);
      noseMat.color.setHex(0xf497a4);
      tailSegMeshes.forEach((m, idx) => {
        m.material = idx < 2 ? calicoBrownMat : idx < 5 ? calicoOrangeMat : calicoBrownMat;
      });
      if (tailTipMesh) tailTipMesh.material = whiteTipMat;
    } else if (classId === 'mage') {
      furMat.map = null;
      furMat.color.setHex(0xf8f5ef);
      furMat.sheenColor.setHex(0xffffff);
      darkStripeMat.color.setHex(0xf0ebe2);
      creamFurMat.color.setHex(0xffffff);
      whiskerMat.color.setHex(0xffffff);
      noseMat.color.setHex(0xf5a3b0);
      tailSegMeshes.forEach((m) => {
        m.material = furMat;
      });
      if (tailTipMesh) tailTipMesh.material = whiteTipMat;
    } else if (classId === 'rogue') {
      furMat.map = null;
      furMat.color.setHex(0x23252a);
      furMat.sheenColor.setHex(0x525763);
      darkStripeMat.color.setHex(0x181a1f);
      creamFurMat.color.setHex(0x2c2f36);
      whiskerMat.color.setHex(0x4b5563);
      noseMat.color.setHex(0xd48b92);
      tailSegMeshes.forEach((m) => {
        m.material = furMat;
      });
      if (tailTipMesh) tailTipMesh.material = whiteTipMat;
    }
    furMat.needsUpdate = true;
  };

  const setEquippedArmor = (armorId: ArmorId) => {
    currentArmor = armorId;
    (Object.keys(armorGroups) as ArmorId[]).forEach((id) => {
      const show = id === armorId;
      for (const obj of armorGroups[id]) {
        obj.visible = show;
      }
    });

    // Harmonize base jacket/trousers/boots PBR palette with each equipped armor set
    if (armorId === 'pioneer_denim') {
      denimMat.color.setHex(0x3b6aa3);
      denimMat.roughness = 0.84;
      denimMat.metalness = 0.04;
      denimTrimMat.color.setHex(0x2f588a);
      quiltedMat.color.setHex(0x8b5636);
      leatherDarkMat.color.setHex(0x492c1c);
      bootMat.color.setHex(0x5d3823);
      bootMat.metalness = 0.1;
    } else if (armorId === 'wild_leather') {
      denimMat.color.setHex(0x6e472b);
      denimMat.roughness = 0.72;
      denimMat.metalness = 0.08;
      denimTrimMat.color.setHex(0x4b2f1c);
      quiltedMat.color.setHex(0x563925);
      leatherDarkMat.color.setHex(0x382114);
      bootMat.color.setHex(0x4c2d1b);
      bootMat.metalness = 0.12;
    } else if (armorId === 'iron_plate') {
      denimMat.color.setHex(0x566270);
      denimMat.roughness = 0.36;
      denimMat.metalness = 0.72;
      denimTrimMat.color.setHex(0x3f4954);
      quiltedMat.color.setHex(0x3c434d);
      leatherDarkMat.color.setHex(0x322520);
      bootMat.color.setHex(0x707c8a);
      bootMat.metalness = 0.76;
    } else if (armorId === 'frost_wolf_cloak') {
      denimMat.color.setHex(0x3e556b);
      denimMat.roughness = 0.76;
      denimMat.metalness = 0.12;
      denimTrimMat.color.setHex(0x2c3f52);
      quiltedMat.color.setHex(0x4a6278);
      leatherDarkMat.color.setHex(0x2d3a48);
      bootMat.color.setHex(0x4c5f72);
      bootMat.metalness = 0.16;
    } else if (armorId === 'rune_paladin') {
      denimMat.color.setHex(0x27426d);
      denimMat.roughness = 0.28;
      denimMat.metalness = 0.82;
      denimTrimMat.color.setHex(0x1b3054);
      quiltedMat.color.setHex(0x22385c);
      leatherDarkMat.color.setHex(0x27344a);
      bootMat.color.setHex(0x2d4b7a);
      bootMat.metalness = 0.82;
    } else if (armorId === 'olive_puffer') {
      denimMat.color.setHex(0x748048);
      denimMat.roughness = 0.82;
      denimMat.metalness = 0.04;
      denimTrimMat.color.setHex(0x5b6637);
      quiltedMat.color.setHex(0x6d7843);
      leatherDarkMat.color.setHex(0x443b35);
      bootMat.color.setHex(0x593d2d);
      bootMat.metalness = 0.08;
    } else if (armorId === 'forest_stalker') {
      denimMat.color.setHex(0x3a5f36);
      denimMat.roughness = 0.76;
      denimMat.metalness = 0.08;
      denimTrimMat.color.setHex(0x274325);
      quiltedMat.color.setHex(0x4d3a27);
      leatherDarkMat.color.setHex(0x33281d);
      bootMat.color.setHex(0x473020);
      bootMat.metalness = 0.12;
    } else if (armorId === 'gale_hawk_garb') {
      denimMat.color.setHex(0x155e75);
      denimMat.roughness = 0.56;
      denimMat.metalness = 0.28;
      denimTrimMat.color.setHex(0x0e4456);
      quiltedMat.color.setHex(0x1e4e5c);
      leatherDarkMat.color.setHex(0x263544);
      bootMat.color.setHex(0x334155);
      bootMat.metalness = 0.3;
    } else if (armorId === 'cream_cardigan') {
      denimMat.color.setHex(0xdfd3bc);
      denimMat.roughness = 0.88;
      denimMat.metalness = 0.02;
      denimTrimMat.color.setHex(0xcabaa0);
      quiltedMat.color.setHex(0xf3ebd9);
      leatherDarkMat.color.setHex(0x9a7b58);
      bootMat.color.setHex(0xc8b598);
      bootMat.metalness = 0.04;
    } else if (armorId === 'ivory_acolyte') {
      denimMat.color.setHex(0xf1eadb);
      denimMat.roughness = 0.78;
      denimMat.metalness = 0.08;
      denimTrimMat.color.setHex(0xd9c28c);
      quiltedMat.color.setHex(0xfcf8ee);
      leatherDarkMat.color.setHex(0xb48c44);
      bootMat.color.setHex(0xdcc8a0);
      bootMat.metalness = 0.12;
    } else if (armorId === 'seraph_vestment') {
      denimMat.color.setHex(0xfaf7ee);
      denimMat.roughness = 0.58;
      denimMat.metalness = 0.24;
      denimTrimMat.color.setHex(0xeab308);
      quiltedMat.color.setHex(0xecfdf5);
      leatherDarkMat.color.setHex(0xca8a04);
      bootMat.color.setHex(0xfef08a);
      bootMat.metalness = 0.42;
    } else if (armorId === 'violet_hoodie') {
      denimMat.color.setHex(0x8861c4);
      denimMat.roughness = 0.86;
      denimMat.metalness = 0.03;
      denimTrimMat.color.setHex(0x6d47a8);
      quiltedMat.color.setHex(0x7c54b8);
      leatherDarkMat.color.setHex(0x523980);
      bootMat.color.setHex(0x6d47a8);
      bootMat.metalness = 0.05;
    } else if (armorId === 'amethyst_robe') {
      denimMat.color.setHex(0x6b21a8);
      denimMat.roughness = 0.74;
      denimMat.metalness = 0.14;
      denimTrimMat.color.setHex(0x4c1d95);
      quiltedMat.color.setHex(0x581c87);
      leatherDarkMat.color.setHex(0x3b0764);
      bootMat.color.setHex(0x4c1d95);
      bootMat.metalness = 0.18;
    } else if (armorId === 'astral_archmage') {
      denimMat.color.setHex(0x312e81);
      denimMat.roughness = 0.48;
      denimMat.metalness = 0.42;
      denimTrimMat.color.setHex(0x1e1b4b);
      quiltedMat.color.setHex(0x3730a3);
      leatherDarkMat.color.setHex(0x1e1b4b);
      bootMat.color.setHex(0x312e81);
      bootMat.metalness = 0.46;
    } else if (armorId === 'stealth_cargo') {
      denimMat.color.setHex(0x343840);
      denimMat.roughness = 0.82;
      denimMat.metalness = 0.06;
      denimTrimMat.color.setHex(0x25282e);
      quiltedMat.color.setHex(0x2c2f36);
      leatherDarkMat.color.setHex(0x23262b);
      bootMat.color.setHex(0x292c32);
      bootMat.metalness = 0.12;
    } else if (armorId === 'nightshade_gear') {
      denimMat.color.setHex(0x1e252e);
      denimMat.roughness = 0.68;
      denimMat.metalness = 0.18;
      denimTrimMat.color.setHex(0x111827);
      quiltedMat.color.setHex(0x1f2937);
      leatherDarkMat.color.setHex(0x0f172a);
      bootMat.color.setHex(0x1e293b);
      bootMat.metalness = 0.22;
    } else if (armorId === 'eclipse_shroud') {
      denimMat.color.setHex(0x181326);
      denimMat.roughness = 0.52;
      denimMat.metalness = 0.38;
      denimTrimMat.color.setHex(0x0f0b1a);
      quiltedMat.color.setHex(0x24193b);
      leatherDarkMat.color.setHex(0x120d20);
      bootMat.color.setHex(0x1c1530);
      bootMat.metalness = 0.44;
    }
  };

  const setEquippedWeapon = (weaponId: WeaponId) => {
    currentWeapon = weaponId;
    (Object.keys(weaponMeshes) as WeaponId[]).forEach((id) => {
      weaponMeshes[id].visible = id === weaponId;
    });
    const isGlowing =
      weaponId === 'crystal_sword' ||
      weaponId === 'rune_greatsword' ||
      weaponId === 'essence_battleaxe' ||
      weaponId === 'emerald_wing_staff' ||
      weaponId === 'sanctuary_staff' ||
      weaponId === 'seraphic_staff' ||
      weaponId === 'crystal_wand' ||
      weaponId === 'amethyst_wand' ||
      weaponId === 'astral_nova_staff' ||
      weaponId === 'azure_star_bow' ||
      weaponId === 'eclipse_dagger';
    swordLight.visible = isGlowing;
    swordLight.color.setHex(
      weaponId === 'essence_battleaxe' ||
        weaponId === 'emerald_wing_staff' ||
        weaponId === 'sanctuary_staff' ||
        weaponId === 'seraphic_staff' ||
        weaponId === 'viper_dagger'
        ? 0x34d399
        : weaponId === 'amethyst_wand' || weaponId === 'eclipse_dagger'
          ? 0xc084fc
          : 0x4be3ff,
    );
    arcMat.color.setHex(
      weaponId === 'rune_greatsword' || weaponId === 'astral_nova_staff' || weaponId === 'azure_star_bow'
        ? 0x80f3ff
        : weaponId === 'essence_battleaxe' ||
            weaponId === 'emerald_wing_staff' ||
            weaponId === 'sanctuary_staff' ||
            weaponId === 'seraphic_staff' ||
            weaponId === 'windstrider_bow' ||
            weaponId === 'viper_dagger'
          ? 0x6ee7b7
          : weaponId === 'amethyst_wand' || weaponId === 'eclipse_dagger'
            ? 0xd8b4fe
            : weaponId === 'hunter_blade'
              ? 0xfef08a
              : weaponId === 'crystal_sword' || weaponId === 'crystal_wand'
                ? 0x72ebff
                : weaponId === 'iron_axe' || weaponId === 'iron_pickaxe'
                  ? 0xfef08a
                  : 0xe2e8f0,
    );
  };

  // Golden Ironclad Warcry Aura Ring around warrior feet (fog: false safe)
  const warcryRingGeo = trackGeo(new THREE.RingGeometry(0.68, 0.92, 32));
  warcryRingGeo.rotateX(-Math.PI / 2);
  const warcryRingMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    }),
  );
  const warcryRing = new THREE.Mesh(warcryRingGeo, warcryRingMat);
  warcryRing.position.y = 0.07;
  warcryRing.visible = false;
  warcryRing.renderOrder = 4;
  root.add(warcryRing);

  const updateAnimation: CatWarriorRig['updateAnimation'] = ({
    dt,
    time,
    speed,
    maxSpeed,
    turnRate,
    isSprinting,
    isGrounded,
    isSwimming = false,
    verticalVel,
    swingTimer,
    swingCategory,
    landSquash,
    heightAboveGround,
    nightFactor,
    activeEmote = null,
    emoteTime = 0,
    activeSkill = null,
    skillAnimProgress = 0,
    warcryActive = false,
  }) => {
    const moveRatio = THREE.MathUtils.clamp(speed / Math.max(maxSpeed, 0.1), 0, 1.35);
    smoothTurn = THREE.MathUtils.damp(smoothTurn, THREE.MathUtils.clamp(turnRate, -4, 4), 10, dt);

    const shadowScale = THREE.MathUtils.clamp(1 - heightAboveGround * 0.14, 0.42, 1.0);
    contactShadow.scale.setScalar(shadowScale);
    (contactShadow.material as THREE.MeshBasicMaterial).opacity =
      0.52 * shadowScale * (1 - nightFactor * 0.35);

    // Eye blinking
    blinkCooldown -= dt;
    if (blinkCooldown <= 0) {
      blinkProgress = 1.0;
      blinkCooldown = 2.8 + Math.random() * 2.8;
    }
    if (blinkProgress > 0) {
      blinkProgress = Math.max(0, blinkProgress - dt * 7.5);
      const blinkScaleY = 1 - Math.sin(blinkProgress * Math.PI) * 0.88;
      for (const eg of eyeGroups) eg.scale.y = blinkScaleY;
    } else {
      for (const eg of eyeGroups) eg.scale.y = 1;
    }

    // Squash & stretch
    let sy = 1.0;
    let sxz = 1.0;
    if (!isGrounded) {
      const stretch = THREE.MathUtils.clamp(verticalVel * 0.024, -0.11, 0.13);
      sy = 1 + stretch;
      sxz = 1 - stretch * 0.42;
    } else if (landSquash > 0.001) {
      sy = 1 - landSquash * 0.17;
      sxz = 1 + landSquash * 0.11;
    }
    bodyGroup.scale.set(
      THREE.MathUtils.damp(bodyGroup.scale.x, sxz, 18, dt),
      THREE.MathUtils.damp(bodyGroup.scale.y, sy, 18, dt),
      THREE.MathUtils.damp(bodyGroup.scale.z, sxz, 18, dt),
    );

    if (isSwimming) {
      // Prone freestyle/dog-paddle cat swimming animation!
      walkPhase += dt * (moveRatio > 0.08 ? (isSprinting ? 13.5 : 9.2) : 4.2);
      const stroke = Math.sin(walkPhase);
      const cosStroke = Math.cos(walkPhase);
      const activeSwim = moveRatio > 0.08 ? 1 : 0.35;

      bodyGroup.position.y = THREE.MathUtils.damp(
        bodyGroup.position.y,
        0.18 + Math.sin(time * 3.4) * 0.045,
        10,
        dt,
      );
      bodyGroup.rotation.z = THREE.MathUtils.damp(
        bodyGroup.rotation.z,
        -smoothTurn * 0.08 + stroke * 0.08 * activeSwim,
        10,
        dt,
      );

      // Lean body forward into swimming posture while keeping cute cat head above water
      torso.rotation.x = THREE.MathUtils.damp(torso.rotation.x, moveRatio > 0.08 ? 0.96 : 0.56, 10, dt);
      torso.rotation.z = stroke * 0.08 * activeSwim;
      if (swingTimer <= 0) {
        torso.rotation.y = THREE.MathUtils.damp(torso.rotation.y, -stroke * 0.18 * activeSwim, 10, dt);
      }

      // Alternating swim arm paddles
      leftArm.rotation.x = -1.65 + stroke * 0.88 * activeSwim;
      leftArm.rotation.z = 0.42 + cosStroke * 0.25 * activeSwim;
      lForearm.rotation.x = -0.35 - Math.max(0, stroke) * 0.4;
      if (swingTimer <= 0) {
        rightArm.rotation.x = -1.65 - stroke * 0.88 * activeSwim;
        rightArm.rotation.z = -0.42 - cosStroke * 0.25 * activeSwim;
        rForearm.rotation.x = -0.35 - Math.max(0, -stroke) * 0.4;
      }

      // Flutter-kick legs behind
      const kick = Math.sin(walkPhase * 1.45);
      leftLeg.rotation.x = 0.72 + kick * 0.46 * activeSwim;
      rightLeg.rotation.x = 0.72 - kick * 0.46 * activeSwim;
      leftLegRig.knee.rotation.x = 0.22 + Math.max(0, -kick) * 0.35 * activeSwim;
      rightLegRig.knee.rotation.x = 0.22 + Math.max(0, kick) * 0.35 * activeSwim;

      // Tilt head upward above the water surface
      headGroup.position.y = 0.62;
      headGroup.rotation.x = THREE.MathUtils.damp(headGroup.rotation.x, moveRatio > 0.08 ? -0.78 : -0.42, 10, dt);
      headGroup.rotation.y = THREE.MathUtils.damp(headGroup.rotation.y, smoothTurn * 0.16, 10, dt);
      headGroup.rotation.z = THREE.MathUtils.damp(headGroup.rotation.z, 0, 10, dt);
    } else if (isGrounded && moveRatio > 0.05) {
      walkPhase += dt * (isSprinting ? 14.2 : 10.0) * Math.max(0.55, moveRatio);
      const stride = Math.sin(walkPhase);
      const cosStride = Math.cos(walkPhase);
      const bounce = Math.abs(cosStride);

      bodyGroup.position.y = bounce * (isSprinting ? 0.1 : 0.06) * Math.min(moveRatio, 1);
      // Slight lateral lean into turns
      bodyGroup.rotation.z = THREE.MathUtils.damp(bodyGroup.rotation.z, -smoothTurn * 0.065, 10, dt);

      // Torso forward lean & natural counter-twist opposite legs!
      torso.rotation.x = THREE.MathUtils.damp(torso.rotation.x, isSprinting ? 0.22 : 0.1, 12, dt);
      torso.rotation.z = stride * 0.045;
      if (swingTimer <= 0) {
        torso.rotation.y = THREE.MathUtils.damp(torso.rotation.y, -stride * (isSprinting ? 0.16 : 0.09), 12, dt);
      }

      // Natural hip stride + knee bend on leg lift
      leftLeg.rotation.x = stride * (isSprinting ? 0.82 : 0.56);
      rightLeg.rotation.x = -stride * (isSprinting ? 0.82 : 0.56);
      leftLegRig.knee.rotation.x = Math.max(0, -cosStride) * (isSprinting ? 0.52 : 0.3);
      rightLegRig.knee.rotation.x = Math.max(0, cosStride) * (isSprinting ? 0.52 : 0.3);

      // Arms counter-swing with natural elbow bend
      leftArm.rotation.x = -stride * 0.44 - 0.16;
      leftArm.rotation.z = 0.1;
      lForearm.rotation.x = -0.26 - Math.max(0, stride) * 0.22;

      if (swingTimer <= 0) {
        rightArm.rotation.x = stride * 0.48 - 0.14;
        rightArm.rotation.z = -0.1;
        rForearm.rotation.x = -0.24 - Math.max(0, -stride) * 0.24;
      }

      // Head subtly leads into turns and stabilizes against torso twist
      headGroup.position.y = 0.6 + bounce * 0.022;
      headGroup.rotation.y = THREE.MathUtils.damp(
        headGroup.rotation.y,
        smoothTurn * 0.12 - torso.rotation.y * 0.55,
        10,
        dt,
      );
      headGroup.rotation.z = -stride * 0.035;
      headGroup.rotation.x = THREE.MathUtils.damp(headGroup.rotation.x, isSprinting ? -0.1 : -0.03, 10, dt);
    } else if (!isGrounded) {
      bodyGroup.position.y = THREE.MathUtils.damp(bodyGroup.position.y, 0.04, 10, dt);
      bodyGroup.rotation.z = THREE.MathUtils.damp(bodyGroup.rotation.z, 0, 10, dt);
      torso.rotation.x = THREE.MathUtils.damp(torso.rotation.x, 0.12, 10, dt);
      leftLeg.rotation.x = THREE.MathUtils.damp(leftLeg.rotation.x, 0.46, 12, dt);
      rightLeg.rotation.x = THREE.MathUtils.damp(rightLeg.rotation.x, -0.34, 12, dt);
      leftLegRig.knee.rotation.x = THREE.MathUtils.damp(leftLegRig.knee.rotation.x, 0.42, 12, dt);
      rightLegRig.knee.rotation.x = THREE.MathUtils.damp(rightLegRig.knee.rotation.x, 0.35, 12, dt);

      leftArm.rotation.x = THREE.MathUtils.damp(leftArm.rotation.x, -0.45, 12, dt);
      leftArm.rotation.z = THREE.MathUtils.damp(leftArm.rotation.z, 0.34, 12, dt);
      lForearm.rotation.x = THREE.MathUtils.damp(lForearm.rotation.x, -0.32, 12, dt);
      if (swingTimer <= 0) {
        rightArm.rotation.x = THREE.MathUtils.damp(rightArm.rotation.x, -0.52, 12, dt);
        rightArm.rotation.z = THREE.MathUtils.damp(rightArm.rotation.z, -0.32, 12, dt);
        rForearm.rotation.x = THREE.MathUtils.damp(rForearm.rotation.x, -0.28, 12, dt);
      }
      headGroup.rotation.x = THREE.MathUtils.damp(headGroup.rotation.x, -0.06, 10, dt);
    } else {
      const breath = Math.sin(time * 2.2);
      bodyGroup.position.y = THREE.MathUtils.damp(bodyGroup.position.y, breath * 0.016, 10, dt);
      bodyGroup.rotation.z = THREE.MathUtils.damp(bodyGroup.rotation.z, 0, 10, dt);
      torso.rotation.x = THREE.MathUtils.damp(torso.rotation.x, breath * 0.02, 10, dt);
      torso.rotation.z = THREE.MathUtils.damp(torso.rotation.z, Math.sin(time * 0.9) * 0.018, 10, dt);
      if (swingTimer <= 0) {
        torso.rotation.y = THREE.MathUtils.damp(torso.rotation.y, 0, 10, dt);
      }

      leftLeg.rotation.x = THREE.MathUtils.damp(leftLeg.rotation.x, 0, 12, dt);
      rightLeg.rotation.x = THREE.MathUtils.damp(rightLeg.rotation.x, 0, 12, dt);
      leftLegRig.knee.rotation.x = THREE.MathUtils.damp(leftLegRig.knee.rotation.x, 0, 12, dt);
      rightLegRig.knee.rotation.x = THREE.MathUtils.damp(rightLegRig.knee.rotation.x, 0, 12, dt);

      leftArm.rotation.x = THREE.MathUtils.damp(leftArm.rotation.x, -0.1 + breath * 0.035, 10, dt);
      leftArm.rotation.z = THREE.MathUtils.damp(leftArm.rotation.z, 0.07, 10, dt);
      lForearm.rotation.x = THREE.MathUtils.damp(lForearm.rotation.x, -0.18, 10, dt);
      if (swingTimer <= 0) {
        rightArm.rotation.x = THREE.MathUtils.damp(rightArm.rotation.x, -0.08 - breath * 0.035, 10, dt);
        rightArm.rotation.z = THREE.MathUtils.damp(rightArm.rotation.z, -0.08, 10, dt);
        rForearm.rotation.x = THREE.MathUtils.damp(rForearm.rotation.x, -0.18, 10, dt);
      }

      // Gentle curious idle head glance
      headGroup.position.y = 0.6 + breath * 0.012;
      headGroup.rotation.y = THREE.MathUtils.damp(headGroup.rotation.y, Math.sin(time * 0.65) * 0.14, 6, dt);
      headGroup.rotation.z = Math.sin(time * 1.1) * 0.035;
      headGroup.rotation.x = THREE.MathUtils.damp(headGroup.rotation.x, Math.sin(time * 0.8) * 0.03, 8, dt);
    }

    // Fluid Traveling-Wave Organic Cat Tail Physics (7 overlapping joints, zero kinks!)
    const tailFreq = moveRatio > 0.08 ? (isSprinting ? 7.2 : 5.2) : 2.3;
    const tailYawAmp = moveRatio > 0.08 ? (isSprinting ? 0.11 : 0.14) : 0.13;
    const sprintFlatten = isSprinting && isGrounded ? 0.42 : 0;
    const airLift = !isGrounded ? -0.14 : 0;

    for (let i = 0; i < tailJoints.length; i++) {
      const joint = tailJoints[i];
      const phaseLag = i * 0.52;
      const tipFlex = 0.72 + i * 0.12;
      const targetYaw =
        Math.sin(time * tailFreq - phaseLag) * tailYawAmp * tipFlex - smoothTurn * 0.05;
      const targetPitch =
        tailRestPitch[i] * (1 - sprintFlatten) +
        airLift * (i === 0 ? 1.4 : 0.3) +
        Math.cos(time * tailFreq * 0.5 - phaseLag) * 0.035;

      joint.rotation.y = THREE.MathUtils.damp(joint.rotation.y, targetYaw, 14, dt);
      joint.rotation.x = THREE.MathUtils.damp(joint.rotation.x, targetPitch, 12, dt);
    }

    // Subtle ear twitch
    const twitch = Math.sin(time * 7.5) > 0.96 ? 0.14 : 0;
    leftEar.rotation.z = 0.28 + (isGrounded ? 0 : -0.1) + twitch;
    rightEar.rotation.z = -0.28 - (isGrounded ? 0 : -0.1);

    // Social Emote Choreography Override (when grounded, stationary, and not swinging)
    if (activeEmote && isGrounded && moveRatio <= 0.08 && swingTimer <= 0) {
      const et = emoteTime;
      if (activeEmote === 'wave') {
        rightArm.rotation.x = THREE.MathUtils.damp(rightArm.rotation.x, -2.55, 14, dt);
        rightArm.rotation.z = THREE.MathUtils.damp(rightArm.rotation.z, -0.55 + Math.sin(et * 10.5) * 0.42, 16, dt);
        rForearm.rotation.x = THREE.MathUtils.damp(rForearm.rotation.x, -0.35 + Math.sin(et * 10.5) * 0.25, 16, dt);
        leftArm.rotation.z = THREE.MathUtils.damp(leftArm.rotation.z, 0.2, 10, dt);
        headGroup.rotation.z = THREE.MathUtils.damp(headGroup.rotation.z, 0.16 + Math.sin(et * 5) * 0.05, 10, dt);
        headGroup.rotation.y = THREE.MathUtils.damp(headGroup.rotation.y, 0.1, 10, dt);
      } else if (activeEmote === 'sit') {
        bodyGroup.position.y = THREE.MathUtils.damp(bodyGroup.position.y, -0.27, 10, dt);
        torso.rotation.x = THREE.MathUtils.damp(torso.rotation.x, -0.06 + Math.sin(et * 2.0) * 0.025, 10, dt);
        leftLeg.rotation.x = THREE.MathUtils.damp(leftLeg.rotation.x, -1.38, 12, dt);
        rightLeg.rotation.x = THREE.MathUtils.damp(rightLeg.rotation.x, -1.32, 12, dt);
        leftLegRig.knee.rotation.x = THREE.MathUtils.damp(leftLegRig.knee.rotation.x, 0.85, 12, dt);
        rightLegRig.knee.rotation.x = THREE.MathUtils.damp(rightLegRig.knee.rotation.x, 0.85, 12, dt);
        leftArm.rotation.x = THREE.MathUtils.damp(leftArm.rotation.x, -0.32, 10, dt);
        leftArm.rotation.z = THREE.MathUtils.damp(leftArm.rotation.z, 0.22, 10, dt);
        rightArm.rotation.x = THREE.MathUtils.damp(rightArm.rotation.x, -0.28, 10, dt);
        rightArm.rotation.z = THREE.MathUtils.damp(rightArm.rotation.z, -0.22, 10, dt);
        for (let i = 0; i < tailJoints.length; i++) {
          tailJoints[i].rotation.y = THREE.MathUtils.damp(
            tailJoints[i].rotation.y,
            0.22 + Math.sin(et * 1.6 - i * 0.45) * 0.08,
            8,
            dt,
          );
          tailJoints[i].rotation.x = THREE.MathUtils.damp(tailJoints[i].rotation.x, 0.04, 8, dt);
        }
      } else if (activeEmote === 'cheer') {
        const hop = Math.abs(Math.sin(et * 7.2));
        bodyGroup.position.y = THREE.MathUtils.damp(bodyGroup.position.y, hop * 0.16, 16, dt);
        leftArm.rotation.x = THREE.MathUtils.damp(leftArm.rotation.x, -2.75 + Math.sin(et * 14) * 0.2, 16, dt);
        leftArm.rotation.z = THREE.MathUtils.damp(leftArm.rotation.z, 0.38, 14, dt);
        rightArm.rotation.x = THREE.MathUtils.damp(rightArm.rotation.x, -2.75 - Math.sin(et * 14) * 0.2, 16, dt);
        rightArm.rotation.z = THREE.MathUtils.damp(rightArm.rotation.z, -0.38, 14, dt);
        headGroup.rotation.x = THREE.MathUtils.damp(headGroup.rotation.x, -0.18, 12, dt);
        leftEar.rotation.z = 0.14;
        rightEar.rotation.z = -0.14;
      } else if (activeEmote === 'dance') {
        const beat = et * 6.4;
        const sway = Math.sin(beat);
        const bounce = Math.abs(Math.cos(beat));
        bodyGroup.position.y = bounce * 0.1;
        bodyGroup.rotation.z = sway * 0.13;
        torso.rotation.y = sway * 0.34;
        torso.rotation.x = 0.06;
        leftLeg.rotation.x = sway * 0.32;
        rightLeg.rotation.x = -sway * 0.32;
        leftLegRig.knee.rotation.x = bounce * 0.35;
        rightLegRig.knee.rotation.x = bounce * 0.35;
        leftArm.rotation.x = -1.1 + sway * 0.75;
        leftArm.rotation.z = 0.45 + Math.cos(beat) * 0.25;
        rightArm.rotation.x = -1.1 - sway * 0.75;
        rightArm.rotation.z = -0.45 - Math.cos(beat) * 0.25;
        headGroup.rotation.z = -sway * 0.22;
        headGroup.rotation.y = sway * 0.25;
      } else if (activeEmote === 'bow') {
        torso.rotation.x = THREE.MathUtils.damp(torso.rotation.x, 0.62, 10, dt);
        headGroup.rotation.x = THREE.MathUtils.damp(headGroup.rotation.x, 0.22, 10, dt);
        leftArm.rotation.x = THREE.MathUtils.damp(leftArm.rotation.x, -0.55, 10, dt);
        leftArm.rotation.z = THREE.MathUtils.damp(leftArm.rotation.z, -0.25, 10, dt);
        rightArm.rotation.x = THREE.MathUtils.damp(rightArm.rotation.x, 0.55, 10, dt);
        rightArm.rotation.z = THREE.MathUtils.damp(rightArm.rotation.z, -0.35, 10, dt);
      } else if (activeEmote === 'victory') {
        torso.rotation.y = THREE.MathUtils.damp(torso.rotation.y, -0.26, 10, dt);
        torso.rotation.x = THREE.MathUtils.damp(torso.rotation.x, -0.1, 10, dt);
        rightArm.rotation.x = THREE.MathUtils.damp(rightArm.rotation.x, -2.95, 14, dt);
        rightArm.rotation.z = THREE.MathUtils.damp(rightArm.rotation.z, -0.18, 12, dt);
        rForearm.rotation.x = THREE.MathUtils.damp(rForearm.rotation.x, -0.05, 12, dt);
        leftArm.rotation.x = THREE.MathUtils.damp(leftArm.rotation.x, -0.4, 12, dt);
        leftArm.rotation.z = THREE.MathUtils.damp(leftArm.rotation.z, 0.26, 12, dt);
        headGroup.rotation.x = THREE.MathUtils.damp(headGroup.rotation.x, -0.16, 10, dt);
      }
    }

    // Weapon-Specific Gathering / Combat Swing Choreography
    const nightBoost = nightFactor * 1.4;
    const isGlowWeapon =
      currentWeapon === 'crystal_sword' ||
      currentWeapon === 'rune_greatsword' ||
      currentWeapon === 'essence_battleaxe' ||
      currentWeapon === 'emerald_wing_staff' ||
      currentWeapon === 'sanctuary_staff' ||
      currentWeapon === 'seraphic_staff' ||
      currentWeapon === 'crystal_wand' ||
      currentWeapon === 'amethyst_wand' ||
      currentWeapon === 'astral_nova_staff' ||
      currentWeapon === 'azure_star_bow' ||
      currentWeapon === 'eclipse_dagger';
    if (swingTimer > 0) {
      const p = 1 - swingTimer; // 0 -> 1
      if (swingCategory === 'pickaxe') {
        // High overhead downward mining strike!
        const lift = p < 0.34 ? -p / 0.34 : -1 + ((p - 0.34) / 0.66) * 2.25;
        rightArm.rotation.x = -1.65 + lift * 1.35;
        rightArm.rotation.z = -0.12;
        rForearm.rotation.x = -0.35 + Math.sin(p * Math.PI) * 0.3;
        torso.rotation.x = Math.sin(p * Math.PI) * 0.28;
        torso.rotation.y = Math.sin(p * Math.PI) * -0.22;
      } else if (swingCategory === 'axe') {
        // Powerful diagonal woodcutter chop!
        const chop = p < 0.32 ? -p / 0.32 : -1 + ((p - 0.32) / 0.68) * 2.35;
        rightArm.rotation.x = -1.42 + chop * 1.2;
        rightArm.rotation.z = -0.58 + Math.sin(p * Math.PI) * 0.95;
        rForearm.rotation.x = -0.28;
        torso.rotation.y = Math.sin(p * Math.PI) * -0.45;
      } else if (swingCategory === 'bow') {
        // Archer bow raise & draw-release
        const draw = Math.sin(p * Math.PI);
        rightArm.rotation.x = -1.55 - draw * 0.15;
        rightArm.rotation.z = -0.18;
        leftArm.rotation.x = -1.35;
        leftArm.rotation.z = 0.45 + draw * 0.35;
        torso.rotation.y = 0.36 * draw;
      } else if (swingCategory === 'staff' || swingCategory === 'wand') {
        // Forward arcane / healing cast thrust
        const cast = Math.sin(p * Math.PI);
        rightArm.rotation.x = -1.85 + cast * 0.68;
        rightArm.rotation.z = -0.14 - cast * 0.18;
        rForearm.rotation.x = -0.18;
        torso.rotation.x = cast * 0.14;
      } else if (swingCategory === 'dagger') {
        // Ultra-snappy cross-dagger slash
        const snap = p < 0.22 ? -p / 0.22 : -1 + ((p - 0.22) / 0.78) * 2.65;
        rightArm.rotation.x = -1.15 + snap * 0.95;
        rightArm.rotation.z = -0.55 + Math.sin(p * Math.PI) * 1.15;
        torso.rotation.y = Math.sin(p * Math.PI) * -0.52;
      } else {
        // Wide heroic horizontal sword slash!
        const windup = p < 0.28 ? -p / 0.28 : -1 + ((p - 0.28) / 0.72) * 2.4;
        rightArm.rotation.x = -1.3 + windup * 1.1;
        rightArm.rotation.z = -0.42 + Math.sin(p * Math.PI) * 0.85;
        rForearm.rotation.x = -0.22;
        torso.rotation.y = Math.sin(p * Math.PI) * -0.42;
      }

      if (isGlowWeapon) {
        swordGlowMat.emissiveIntensity = 1.4 + nightBoost * 0.6 + Math.sin(p * Math.PI) * 1.5;
        swordLight.intensity = 1.4 + nightBoost + Math.sin(p * Math.PI) * 1.9;
      }

      if (swingCategory !== 'bow' && p > 0.22 && p < 0.82) {
        slashArc.visible = true;
        const arcP = (p - 0.22) / 0.6;
        slashArc.rotation.y = -0.85 + arcP * 2.0;
        const scaleMult = currentWeapon === 'rune_greatsword' ? 1.32 : swingCategory === 'dagger' ? 0.82 : 1.0;
        slashArc.scale.setScalar((0.85 + arcP * 0.35) * scaleMult);
        (slashArc.material as THREE.MeshBasicMaterial).opacity = Math.sin(arcP * Math.PI) * 0.74;
      } else {
        slashArc.visible = false;
      }
    } else {
      if (isGlowWeapon) {
        const baseGlow = currentWeapon === 'rune_greatsword' ? 1.45 : 1.15;
        swordGlowMat.emissiveIntensity = baseGlow + nightBoost * 0.55 + Math.sin(time * 3.0) * 0.2;
        swordLight.intensity = 0.6 + nightBoost * 1.5 + Math.sin(time * 3.0) * 0.16;
      }
      slashArc.visible = false;
    }

    // Healer floating golden halo hover
    if (currentClass === 'healer' && healerHaloGroup.visible) {
      healerHaloGroup.position.y = 0.54 + Math.sin(time * 3.2) * 0.028;
      healerHaloGroup.rotation.y = time * 0.85;
      healerHaloMat.emissiveIntensity = 1.05 + nightFactor * 0.8 + Math.sin(time * 3.2) * 0.22;
    }

    // Unique Class Skill Choreography Overlay (Q / E / R / T)
    if (activeSkill && skillAnimProgress > 0 && skillAnimProgress < 1) {
      const sp = skillAnimProgress;
      if (activeSkill === 'whirlwind') {
        if (currentClass === 'warrior' || currentClass === 'rogue') {
          bodyGroup.rotation.y = sp * Math.PI * 4;
          rightArm.rotation.x = -1.25;
          rightArm.rotation.z = -1.15;
          leftArm.rotation.x = -0.8;
          leftArm.rotation.z = 0.85;
          slashArc.visible = true;
          slashArc.rotation.y = sp * Math.PI * 6;
          slashArc.scale.setScalar(1.65 + Math.sin(sp * Math.PI) * 0.45);
          (slashArc.material as THREE.MeshBasicMaterial).opacity = Math.sin(sp * Math.PI) * 0.92;
        } else {
          // Ranged burst cast pose for Archer / Healer / Mage
          const burst = Math.sin(sp * Math.PI);
          rightArm.rotation.x = -1.9 + burst * 0.5;
          leftArm.rotation.x = -1.45;
          torso.rotation.x = -0.12 * burst;
        }
      } else if (activeSkill === 'vanguard_dash') {
        bodyGroup.rotation.y = 0;
        torso.rotation.x = 0.42 * Math.sin(sp * Math.PI);
        rightArm.rotation.x = -1.65 + sp * 0.45;
        rightArm.rotation.z = -0.18;
        leftArm.rotation.x = 0.65;
        slashArc.visible = sp > 0.2 && (currentClass === 'warrior' || currentClass === 'rogue');
        slashArc.rotation.y = 0.1;
        slashArc.scale.setScalar(1.45);
        (slashArc.material as THREE.MeshBasicMaterial).opacity = Math.sin(sp * Math.PI) * 0.85;
      } else if (activeSkill === 'earthbreaker') {
        bodyGroup.rotation.y = 0;
        const leap = Math.sin(sp * Math.PI);
        bodyGroup.position.y += leap * (currentClass === 'warrior' ? 0.68 : 0.36);
        const slamSwing = sp < 0.45 ? -sp / 0.45 : -1 + ((sp - 0.45) / 0.55) * 2.55;
        rightArm.rotation.x = -1.75 + slamSwing * 1.45;
        leftArm.rotation.x = -1.55 + slamSwing * 1.25;
        torso.rotation.x = sp > 0.45 ? 0.36 * Math.sin(((sp - 0.45) / 0.55) * Math.PI) : -0.18;
        slashArc.visible = sp > 0.42 && sp < 0.86;
        slashArc.scale.setScalar(1.7);
        (slashArc.material as THREE.MeshBasicMaterial).opacity = 0.82;
      } else if (activeSkill === 'warcry') {
        bodyGroup.rotation.y = 0;
        const roar = Math.sin(sp * Math.PI);
        torso.rotation.x = -0.22 * roar;
        headGroup.rotation.x = -0.28 * roar;
        rightArm.rotation.x = -2.45 * roar;
        rightArm.rotation.z = -0.45 * roar;
        leftArm.rotation.x = -2.25 * roar;
        leftArm.rotation.z = 0.45 * roar;
      }
    } else {
      bodyGroup.rotation.y = THREE.MathUtils.damp(bodyGroup.rotation.y, 0, 14, dt);
    }

    // Active Class T-Buff glowing ground aura ring
    if (warcryActive) {
      warcryRing.visible = true;
      warcryRing.rotation.z = time * 1.6;
      const pulse = 1.0 + Math.sin(time * 6.5) * 0.09;
      warcryRing.scale.setScalar(pulse);
      warcryRingMat.opacity = 0.42 + Math.sin(time * 6.5) * 0.16;
      warcryRingMat.color.setHex(
        currentClass === 'archer'
          ? 0x84cc16
          : currentClass === 'healer'
            ? 0x34d399
            : currentClass === 'mage'
              ? 0xa855f7
              : currentClass === 'rogue'
                ? 0x94a3b8
                : 0xfde047,
      );
    } else {
      warcryRing.visible = false;
    }

    // Flowing armor cape & glowing chest rune pulse
    const hasCape =
      currentArmor === 'iron_plate' ||
      currentArmor === 'frost_wolf_cloak' ||
      currentArmor === 'rune_paladin' ||
      currentArmor === 'forest_stalker' ||
      currentArmor === 'gale_hawk_garb' ||
      currentArmor === 'ivory_acolyte' ||
      currentArmor === 'seraph_vestment' ||
      currentArmor === 'amethyst_robe' ||
      currentArmor === 'astral_archmage' ||
      currentArmor === 'nightshade_gear' ||
      currentArmor === 'eclipse_shroud';
    if (hasCape) {
      const capeLift =
        0.12 +
        moveRatio * (isSprinting ? 0.56 : 0.34) +
        (!isGrounded ? THREE.MathUtils.clamp(-verticalVel * 0.04, -0.1, 0.36) : 0) +
        Math.sin(time * (isSprinting ? 10.5 : 4.2)) * (0.045 + moveRatio * 0.05);
      capePivot.rotation.x = THREE.MathUtils.damp(capePivot.rotation.x, capeLift, 11, dt);
      capePivot.rotation.z = THREE.MathUtils.damp(
        capePivot.rotation.z,
        -smoothTurn * 0.08 + Math.cos(time * 3.1) * 0.03,
        9,
        dt,
      );
    }
    if (currentArmor === 'rune_paladin') {
      paladinRuneMat.emissiveIntensity = 1.2 + nightFactor * 1.1 + Math.sin(time * 3.4) * 0.25;
    } else if (currentArmor === 'frost_wolf_cloak') {
      frostGemMat.emissiveIntensity = 0.85 + nightFactor * 0.9 + Math.sin(time * 2.6) * 0.18;
    }
  };

  return {
    root,
    bodyGroup,
    headGroup,
    leftEar,
    rightEar,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    swordGlowMat,
    swordLight,
    slashArc,
    contactShadow,
    setClass,
    setEquippedWeapon,
    setEquippedArmor,
    updateAnimation,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
