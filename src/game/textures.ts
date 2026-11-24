import * as THREE from 'three';

export interface ProceduralTexturePack {
  tabbyFur: THREE.CanvasTexture;
  tabbyBump: THREE.CanvasTexture;
  denimFabric: THREE.CanvasTexture;
  denimBump: THREE.CanvasTexture;
  quiltedLeather: THREE.CanvasTexture;
  quiltedBump: THREE.CanvasTexture;
  shieldWood: THREE.CanvasTexture;
  shieldBump: THREE.CanvasTexture;
  treeBark: THREE.CanvasTexture;
  birchBark: THREE.CanvasTexture;
  graniteRock: THREE.CanvasTexture;
  grassGround: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  // High-craft architectural PBR texture maps for modular housing
  housingTimber: THREE.CanvasTexture;
  housingTimberBump: THREE.CanvasTexture;
  housingTimberRough: THREE.CanvasTexture;
  housingBeam: THREE.CanvasTexture;
  housingBeamBump: THREE.CanvasTexture;
  housingStone: THREE.CanvasTexture;
  housingStoneBump: THREE.CanvasTexture;
  housingStoneRough: THREE.CanvasTexture;
  housingPlaster: THREE.CanvasTexture;
  housingPlasterBump: THREE.CanvasTexture;
  housingRoofTile: THREE.CanvasTexture;
  housingRoofTileBump: THREE.CanvasTexture;
  housingCitadel: THREE.CanvasTexture;
  housingCitadelBump: THREE.CanvasTexture;
  housingCitadelRough: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  maxAniso: number,
  repeatX = 1,
  repeatY = 1,
  isColor = true,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = Math.min(8, maxAniso);
  tex.needsUpdate = true;
  return tex;
}

export function createProceduralTextures(maxAniso: number): ProceduralTexturePack {
  // 1. High-Detail Orange Tabby Fur Albedo + Plush Fur Bump Map (256x256 optimized)
  const [furC, furCtx] = makeCanvas(256);
  const [furBC, furBCtx] = makeCanvas(256);

  const furGrad = furCtx.createLinearGradient(0, 0, 0, 256);
  furGrad.addColorStop(0, '#e37722');
  furGrad.addColorStop(0.35, '#f49539');
  furGrad.addColorStop(0.7, '#ec842c');
  furGrad.addColorStop(1, '#d4691b');
  furCtx.fillStyle = furGrad;
  furCtx.fillRect(0, 0, 256, 256);

  furBCtx.fillStyle = '#808080';
  furBCtx.fillRect(0, 0, 256, 256);

  // Soft wavy tabby coat stripes
  for (let y = 13; y < 248; y += 29) {
    furCtx.fillStyle = 'rgba(158, 58, 10, 0.56)';
    furCtx.beginPath();
    furCtx.moveTo(0, y);
    furCtx.bezierCurveTo(64, y + 9, 192, y - 9, 256, y);
    furCtx.lineTo(256, y + 11);
    furCtx.bezierCurveTo(192, y + 2, 64, y + 20, 0, y + 11);
    furCtx.closePath();
    furCtx.fill();
  }

  // Fine directional plush fur strokes for both albedo & bump
  for (let i = 0; i < 1100; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const len = 5 + Math.random() * 9;
    const dx = (Math.random() - 0.5) * 3.0;
    const bright = Math.random() > 0.45;
    furCtx.strokeStyle = bright ? 'rgba(255, 220, 165, 0.28)' : 'rgba(138, 48, 8, 0.22)';
    furCtx.lineWidth = 1.0;
    furCtx.beginPath();
    furCtx.moveTo(x, y);
    furCtx.lineTo(x + dx, y + len);
    furCtx.stroke();

    furBCtx.strokeStyle = bright ? 'rgba(225, 225, 225, 0.35)' : 'rgba(40, 40, 40, 0.32)';
    furBCtx.lineWidth = 1.1;
    furBCtx.beginPath();
    furBCtx.moveTo(x, y);
    furBCtx.lineTo(x + dx, y + len);
    furBCtx.stroke();
  }
  const tabbyFur = finalizeTexture(furC, maxAniso, 1, 1, true);
  const tabbyBump = finalizeTexture(furBC, maxAniso, 1, 1, false);

  // 2. Crisp Indigo Twill Denim + Contrast Gold Double-Stitching + Bump (256x256 optimized)
  const [denC, denCtx] = makeCanvas(256);
  const [denBC, denBCtx] = makeCanvas(256);

  denCtx.fillStyle = '#2b5384';
  denCtx.fillRect(0, 0, 256, 256);
  denBCtx.fillStyle = '#7c7c7c';
  denBCtx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 16; i++) {
    const gx = Math.random() * 256;
    const gy = Math.random() * 256;
    const grad = denCtx.createRadialGradient(gx, gy, 3, gx, gy, 38);
    grad.addColorStop(0, 'rgba(105, 152, 206, 0.1)');
    grad.addColorStop(1, 'rgba(105, 152, 206, 0)');
    denCtx.fillStyle = grad;
    denCtx.fillRect(0, 0, 256, 256);
  }

  for (let i = -256; i < 512; i += 4) {
    const isLight = i % 8 === 0;
    denCtx.strokeStyle = isLight ? 'rgba(150, 192, 236, 0.18)' : 'rgba(14, 28, 48, 0.26)';
    denCtx.lineWidth = 1.2;
    denCtx.beginPath();
    denCtx.moveTo(i, 0);
    denCtx.lineTo(i + 256, 256);
    denCtx.stroke();

    denBCtx.strokeStyle = isLight ? 'rgba(205, 205, 205, 0.25)' : 'rgba(55, 55, 55, 0.25)';
    denBCtx.lineWidth = 1.2;
    denBCtx.beginPath();
    denBCtx.moveTo(i, 0);
    denBCtx.lineTo(i + 256, 256);
    denBCtx.stroke();
  }

  for (let y = 0; y < 256; y += 5) {
    denCtx.fillStyle = 'rgba(18, 36, 62, 0.1)';
    denCtx.fillRect(0, y, 256, 1.2);
  }

  denCtx.strokeStyle = 'rgba(226, 174, 84, 0.78)';
  denCtx.setLineDash([4, 3]);
  denCtx.lineWidth = 1.6;
  denCtx.strokeRect(7, 7, 242, 242);
  denCtx.strokeRect(12, 12, 232, 232);

  const denimFabric = finalizeTexture(denC, maxAniso, 1, 1, true);
  const denimBump = finalizeTexture(denBC, maxAniso, 1, 1, false);

  // 3. Padded Diamond-Quilted Leather Tunic + Embossed Diamond Bump (256x256 optimized)
  const [leaC, leaCtx] = makeCanvas(256);
  const [leaBC, leaBCtx] = makeCanvas(256);

  leaCtx.fillStyle = '#6c422a';
  leaCtx.fillRect(0, 0, 256, 256);
  leaBCtx.fillStyle = '#909090';
  leaBCtx.fillRect(0, 0, 256, 256);

  const step = 32;
  for (let x = -step; x <= 256 + step; x += step) {
    for (let y = -step; y <= 256 + step; y += step) {
      const cx = x + step * 0.5;
      const cy = y + step * 0.5;
      const pGrad = leaCtx.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, step * 0.45);
      pGrad.addColorStop(0, 'rgba(176, 118, 76, 0.45)');
      pGrad.addColorStop(0.7, 'rgba(110, 68, 42, 0.12)');
      pGrad.addColorStop(1, 'rgba(38, 18, 8, 0.35)');
      leaCtx.fillStyle = pGrad;
      leaCtx.beginPath();
      leaCtx.arc(cx, cy, step * 0.44, 0, Math.PI * 2);
      leaCtx.fill();

      const bGrad = leaBCtx.createRadialGradient(cx, cy, 1.5, cx, cy, step * 0.46);
      bGrad.addColorStop(0, '#f2f2f2');
      bGrad.addColorStop(0.75, '#a8a8a8');
      bGrad.addColorStop(1, '#303030');
      leaBCtx.fillStyle = bGrad;
      leaBCtx.beginPath();
      leaBCtx.arc(cx, cy, step * 0.46, 0, Math.PI * 2);
      leaBCtx.fill();
    }
  }

  leaCtx.strokeStyle = '#2d160b';
  leaCtx.lineWidth = 2.4;
  leaBCtx.strokeStyle = '#181818';
  leaBCtx.lineWidth = 2.8;
  for (let i = -256; i <= 512; i += step) {
    leaCtx.beginPath();
    leaCtx.moveTo(i, 0);
    leaCtx.lineTo(i + 256, 256);
    leaCtx.stroke();
    leaCtx.beginPath();
    leaCtx.moveTo(i + 256, 0);
    leaCtx.lineTo(i, 256);
    leaCtx.stroke();

    leaBCtx.beginPath();
    leaBCtx.moveTo(i, 0);
    leaBCtx.lineTo(i + 256, 256);
    leaBCtx.stroke();
    leaBCtx.beginPath();
    leaBCtx.moveTo(i + 256, 0);
    leaBCtx.lineTo(i, 256);
    leaBCtx.stroke();
  }
  const quiltedLeather = finalizeTexture(leaC, maxAniso, 1, 1, true);
  const quiltedBump = finalizeTexture(leaBC, maxAniso, 1, 1, false);

  // 4. Round Wooden Shield Planks + Groove Bump (256x256 optimized)
  const [shC, shCtx] = makeCanvas(256);
  const [shBC, shBCtx] = makeCanvas(256);

  shCtx.fillStyle = '#6c4223';
  shCtx.fillRect(0, 0, 256, 256);
  shBCtx.fillStyle = '#b4b4b4';
  shBCtx.fillRect(0, 0, 256, 256);

  const plankCount = 6;
  const plankW = 256 / plankCount;
  for (let p = 0; p < plankCount; p++) {
    const shade = p % 2 === 0 ? '#784a28' : '#643c1e';
    shCtx.fillStyle = shade;
    shCtx.fillRect(p * plankW, 0, plankW, 256);

    for (let g = 0; g < 16; g++) {
      const gx = p * plankW + Math.random() * plankW;
      shCtx.strokeStyle = Math.random() > 0.35 ? 'rgba(38, 19, 8, 0.25)' : 'rgba(176, 120, 72, 0.16)';
      shCtx.lineWidth = 1.1;
      shCtx.beginPath();
      shCtx.moveTo(gx, 0);
      shCtx.bezierCurveTo(gx + 3, 85, gx - 3, 170, gx, 256);
      shCtx.stroke();

      shBCtx.strokeStyle = 'rgba(72, 72, 72, 0.24)';
      shBCtx.lineWidth = 1.1;
      shBCtx.beginPath();
      shBCtx.moveTo(gx, 0);
      shBCtx.bezierCurveTo(gx + 3, 85, gx - 3, 170, gx, 256);
      shBCtx.stroke();
    }
    shCtx.fillStyle = '#271408';
    shCtx.fillRect(p * plankW, 0, 3, 256);
    shBCtx.fillStyle = '#181818';
    shBCtx.fillRect(p * plankW, 0, 3.5, 256);
  }
  const shieldWood = finalizeTexture(shC, maxAniso, 1, 1, true);
  const shieldBump = finalizeTexture(shBC, maxAniso, 1, 1, false);

  // 5. Tree Bark
  const [barkC, barkCtx] = makeCanvas(256);
  barkCtx.fillStyle = '#5c402c';
  barkCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const h = 24 + Math.random() * 64;
    barkCtx.fillStyle =
      Math.random() > 0.5 ? 'rgba(38, 24, 15, 0.45)' : 'rgba(116, 86, 60, 0.35)';
    barkCtx.fillRect(x, y, 3 + Math.random() * 5, h);
  }
  const treeBark = finalizeTexture(barkC, maxAniso, 2, 2, true);

  // 6. Silver Birch Bark
  const [birchC, birchCtx] = makeCanvas(256);
  birchCtx.fillStyle = '#dfd8cc';
  birchCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 110; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    birchCtx.fillStyle =
      Math.random() > 0.3 ? 'rgba(54, 48, 44, 0.6)' : 'rgba(155, 138, 120, 0.4)';
    birchCtx.fillRect(x, y, 10 + Math.random() * 28, 2 + Math.random() * 4);
  }
  const birchBark = finalizeTexture(birchC, maxAniso, 1, 2, true);

  // 7. Weathered Granite Stone
  const [rockC, rockCtx] = makeCanvas(256);
  rockCtx.fillStyle = '#7e8387';
  rockCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 1 + Math.random() * 4;
    rockCtx.fillStyle =
      Math.random() > 0.5 ? 'rgba(218, 224, 226, 0.22)' : 'rgba(42, 47, 52, 0.28)';
    rockCtx.fillRect(x, y, r, r);
  }
  rockCtx.strokeStyle = 'rgba(36, 40, 46, 0.38)';
  rockCtx.lineWidth = 1.5;
  for (let c = 0; c < 14; c++) {
    const sx = Math.random() * 256;
    const sy = Math.random() * 256;
    rockCtx.beginPath();
    rockCtx.moveTo(sx, sy);
    rockCtx.lineTo(sx + (Math.random() - 0.5) * 45, sy + (Math.random() - 0.5) * 45);
    rockCtx.stroke();
  }
  const graniteRock = finalizeTexture(rockC, maxAniso, 1, 1, true);

  // 8. Meadow Grass Ground (256x256 tiled)
  const [grC, grCtx] = makeCanvas(256);
  grCtx.fillStyle = '#c8d4be';
  grCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1100; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    grCtx.fillStyle =
      Math.random() > 0.45 ? 'rgba(255, 255, 240, 0.15)' : 'rgba(40, 58, 32, 0.14)';
    grCtx.fillRect(x, y, 1.5, 3 + Math.random() * 4);
  }
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    grCtx.fillStyle = 'rgba(72, 92, 54, 0.1)';
    grCtx.beginPath();
    grCtx.arc(x, y, 3 + Math.random() * 8, 0, Math.PI * 2);
    grCtx.fill();
  }
  const grassGround = finalizeTexture(grC, maxAniso, 28, 28, true);

  // 9. Soft Radial Contact Shadow
  const [shdC, shdCtx] = makeCanvas(128);
  const rad = shdCtx.createRadialGradient(64, 64, 6, 64, 64, 60);
  rad.addColorStop(0, 'rgba(10, 14, 18, 0.65)');
  rad.addColorStop(0.55, 'rgba(10, 14, 18, 0.28)');
  rad.addColorStop(1, 'rgba(10, 14, 18, 0.0)');
  shdCtx.fillStyle = rad;
  shdCtx.fillRect(0, 0, 128, 128);
  const contactShadow = finalizeTexture(shdC, maxAniso, 1, 1, false);
  contactShadow.wrapS = THREE.ClampToEdgeWrapping;
  contactShadow.wrapT = THREE.ClampToEdgeWrapping;

  // 10. Architectural Tongue-and-Groove European Oak Timber Planks (512x512 Albedo + Bump + Roughness)
  // Deterministic PRNG helper for crisp, repeatable artisan architectural textures
  let seed = 42197;
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const [timC, timCtx] = makeCanvas(512);
  const [timBC, timBCtx] = makeCanvas(512);
  const [timRC, timRCtx] = makeCanvas(512);

  timCtx.fillStyle = '#c89b6e';
  timCtx.fillRect(0, 0, 512, 512);
  timBCtx.fillStyle = '#a8a8a8';
  timBCtx.fillRect(0, 0, 512, 512);
  timRCtx.fillStyle = '#c2c2c2';
  timRCtx.fillRect(0, 0, 512, 512);

  const plankRows = 8;
  const rowH = 512 / plankRows;
  for (let r = 0; r < plankRows; r++) {
    const y0 = r * rowH;
    const stagger = (r % 2) * 210 + ((r * 73) % 90);
    const cuts = [0, stagger % 512, (stagger + 260) % 512, 512].sort((a, b) => a - b);

    for (let s = 0; s < cuts.length - 1; s++) {
      const x0 = cuts[s];
      const w = cuts[s + 1] - x0;
      if (w < 4) continue;

      // Subtle warm oak tonal variation per board
      const toneShift = (rng() - 0.5) * 24;
      const rr = Math.round(196 + toneShift);
      const gg = Math.round(148 + toneShift * 0.8);
      const bb = Math.round(102 + toneShift * 0.58);
      const grad = timCtx.createLinearGradient(x0, y0, x0, y0 + rowH);
      grad.addColorStop(0, `rgb(${Math.min(240, rr + 12)},${Math.min(220, gg + 10)},${Math.min(180, bb + 8)})`);
      grad.addColorStop(0.5, `rgb(${rr},${gg},${bb})`);
      grad.addColorStop(1, `rgb(${Math.max(80, rr - 18)},${Math.max(60, gg - 15)},${Math.max(40, bb - 12)})`);
      timCtx.fillStyle = grad;
      timCtx.fillRect(x0, y0, w, rowH);

      // Roughness per plank (satin oiled wood with subtle sheen differences)
      const roughVal = Math.round(170 + (rng() - 0.5) * 32);
      timRCtx.fillStyle = `rgb(${roughVal},${roughVal},${roughVal})`;
      timRCtx.fillRect(x0, y0, w, rowH);

      // Fine wavy woodgrain fibers along plank length
      const grainLines = Math.max(8, Math.round(w * 0.08));
      for (let g = 0; g < grainLines; g++) {
        const gy = y0 + 3 + rng() * (rowH - 6);
        const dark = rng() > 0.35;
        const wave = (rng() - 0.5) * 6;
        timCtx.strokeStyle = dark ? 'rgba(72, 42, 20, 0.22)' : 'rgba(244, 212, 168, 0.16)';
        timCtx.lineWidth = 0.8 + rng() * 1.1;
        timCtx.beginPath();
        timCtx.moveTo(x0, gy);
        timCtx.bezierCurveTo(x0 + w * 0.33, gy + wave, x0 + w * 0.66, gy - wave, x0 + w, gy + wave * 0.4);
        timCtx.stroke();

        timBCtx.strokeStyle = dark ? 'rgba(92, 92, 92, 0.26)' : 'rgba(195, 195, 195, 0.2)';
        timBCtx.lineWidth = 1.0;
        timBCtx.beginPath();
        timBCtx.moveTo(x0, gy);
        timBCtx.bezierCurveTo(x0 + w * 0.33, gy + wave, x0 + w * 0.66, gy - wave, x0 + w, gy + wave * 0.4);
        timBCtx.stroke();
      }

      // Occasional subtle natural wood knot
      if (w > 110 && rng() > 0.68) {
        const kx = x0 + 28 + rng() * (w - 56);
        const ky = y0 + 14 + rng() * (rowH - 28);
        const knotGrad = timCtx.createRadialGradient(kx, ky, 1, kx, ky, 10);
        knotGrad.addColorStop(0, 'rgba(64, 34, 15, 0.55)');
        knotGrad.addColorStop(0.55, 'rgba(104, 62, 30, 0.28)');
        knotGrad.addColorStop(1, 'rgba(104, 62, 30, 0)');
        timCtx.fillStyle = knotGrad;
        timCtx.beginPath();
        timCtx.ellipse(kx, ky, 12, 6, 0, 0, Math.PI * 2);
        timCtx.fill();
      }
    }

    // Crisp horizontal bevel shadow & subtle highlight below seam
    timCtx.fillStyle = 'rgba(42, 22, 10, 0.58)';
    timCtx.fillRect(0, y0, 512, 2.5);
    timCtx.fillStyle = 'rgba(248, 222, 184, 0.16)';
    timCtx.fillRect(0, y0 + 2.5, 512, 1.5);

    timBCtx.fillStyle = '#202020';
    timBCtx.fillRect(0, y0, 512, 3.2);
    timBCtx.fillStyle = '#d4d4d4';
    timBCtx.fillRect(0, y0 + 3.2, 512, 2);

    timRCtx.fillStyle = '#ececec';
    timRCtx.fillRect(0, y0, 512, 3.5);

    // Subtle butt-joint end seams + tiny pegged dowel dots
    for (let s = 1; s < cuts.length - 1; s++) {
      const cx = cuts[s];
      timCtx.fillStyle = 'rgba(42, 22, 10, 0.52)';
      timCtx.fillRect(cx - 1, y0, 2, rowH);
      timBCtx.fillStyle = '#262626';
      timBCtx.fillRect(cx - 1.5, y0, 3, rowH);

      timCtx.fillStyle = 'rgba(54, 30, 14, 0.45)';
      timCtx.beginPath();
      timCtx.arc(cx - 7, y0 + rowH * 0.28, 2.2, 0, Math.PI * 2);
      timCtx.arc(cx - 7, y0 + rowH * 0.72, 2.2, 0, Math.PI * 2);
      timCtx.arc(cx + 7, y0 + rowH * 0.28, 2.2, 0, Math.PI * 2);
      timCtx.arc(cx + 7, y0 + rowH * 0.72, 2.2, 0, Math.PI * 2);
      timCtx.fill();
    }
  }
  const housingTimber = finalizeTexture(timC, maxAniso, 1, 1, true);
  const housingTimberBump = finalizeTexture(timBC, maxAniso, 1, 1, false);
  const housingTimberRough = finalizeTexture(timRC, maxAniso, 1, 1, false);

  // 11. Hand-Hewn Aged Walnut Structural Beam Texture (512x512 Albedo + Bump)
  const [bmC, bmCtx] = makeCanvas(512);
  const [bmBC, bmBCtx] = makeCanvas(512);
  bmCtx.fillStyle = '#6f4b2e';
  bmCtx.fillRect(0, 0, 512, 512);
  bmBCtx.fillStyle = '#909090';
  bmBCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 240; i++) {
    const x = rng() * 512;
    const dark = rng() > 0.42;
    bmCtx.strokeStyle = dark ? 'rgba(32, 18, 9, 0.32)' : 'rgba(154, 114, 76, 0.2)';
    bmCtx.lineWidth = 1.2 + rng() * 2.4;
    bmCtx.beginPath();
    bmCtx.moveTo(x, 0);
    bmCtx.bezierCurveTo(x + (rng() - 0.5) * 14, 170, x + (rng() - 0.5) * 14, 340, x, 512);
    bmCtx.stroke();

    bmBCtx.strokeStyle = dark ? 'rgba(42, 42, 42, 0.35)' : 'rgba(182, 182, 182, 0.25)';
    bmBCtx.lineWidth = 1.6;
    bmBCtx.beginPath();
    bmBCtx.moveTo(x, 0);
    bmBCtx.bezierCurveTo(x + (rng() - 0.5) * 10, 170, x + (rng() - 0.5) * 10, 340, x, 512);
    bmBCtx.stroke();
  }
  // Subtle adze / chisel facets
  for (let i = 0; i < 60; i++) {
    const x = rng() * 512;
    const y = rng() * 512;
    bmCtx.fillStyle = rng() > 0.5 ? 'rgba(165, 126, 86, 0.08)' : 'rgba(26, 14, 6, 0.1)';
    bmCtx.fillRect(x, y, 16 + rng() * 26, 28 + rng() * 48);
  }
  const housingBeam = finalizeTexture(bmC, maxAniso, 1, 1, true);
  const housingBeamBump = finalizeTexture(bmBC, maxAniso, 1, 1, false);

  // 12. Dressed Medieval Ashlar Stone Masonry (512x512 Albedo + Bump + Roughness)
  const [stC, stCtx] = makeCanvas(512);
  const [stBC, stBCtx] = makeCanvas(512);
  const [stRC, stRCtx] = makeCanvas(512);

  // Warm lime mortar bed
  stCtx.fillStyle = '#6f6c66';
  stCtx.fillRect(0, 0, 512, 512);
  stBCtx.fillStyle = '#222222';
  stBCtx.fillRect(0, 0, 512, 512);
  stRCtx.fillStyle = '#f2f2f2'; // matte mortar
  stRCtx.fillRect(0, 0, 512, 512);

  const stoneRows = 6;
  const stoneRowH = 512 / stoneRows;
  const mortar = 5;
  for (let r = 0; r < stoneRows; r++) {
    const y0 = r * stoneRowH;
    const blockCount = r % 2 === 0 ? 4 : 5;
    const offset = (r % 2) * 48;
    let curX = -offset;
    for (let b = 0; b <= blockCount + 1; b++) {
      const bw = Math.round((512 / blockCount) * (0.86 + rng() * 0.28));
      const bx = curX + mortar * 0.5;
      const by = y0 + mortar * 0.5;
      const drawW = bw - mortar;
      const drawH = stoneRowH - mortar;
      curX += bw;
      if (bx + drawW < 0 || bx > 512) continue;

      // Natural warm/cool limestone & granite tint per ashlar block
      const baseLum = 158 + (rng() - 0.5) * 32;
      const warm = (rng() - 0.45) * 14;
      const sr = Math.round(baseLum + warm);
      const sg = Math.round(baseLum + warm * 0.35);
      const sb = Math.round(baseLum - warm * 0.45);

      const sGrad = stCtx.createLinearGradient(bx, by, bx, by + drawH);
      sGrad.addColorStop(0, `rgb(${Math.min(230, sr + 16)},${Math.min(228, sg + 16)},${Math.min(226, sb + 15)})`);
      sGrad.addColorStop(0.25, `rgb(${sr},${sg},${sb})`);
      sGrad.addColorStop(1, `rgb(${Math.max(80, sr - 20)},${Math.max(80, sg - 20)},${Math.max(78, sb - 18)})`);
      stCtx.fillStyle = sGrad;
      stCtx.fillRect(bx, by, drawW, drawH);

      // Dressed stone raised bump & beveled highlight
      const bGrad = stBCtx.createLinearGradient(bx, by, bx, by + drawH);
      bGrad.addColorStop(0, '#dedede');
      bGrad.addColorStop(0.15, '#b8b8b8');
      bGrad.addColorStop(0.85, '#a4a4a4');
      bGrad.addColorStop(1, '#5c5c5c');
      stBCtx.fillStyle = bGrad;
      stBCtx.fillRect(bx, by, drawW, drawH);

      // Subtle beveled top-left catchlight
      stCtx.fillStyle = 'rgba(248, 246, 238, 0.22)';
      stCtx.fillRect(bx, by, drawW, 3);
      stCtx.fillStyle = 'rgba(32, 34, 38, 0.24)';
      stCtx.fillRect(bx, by + drawH - 3, drawW, 3);

      // Roughness per dressed stone block (more satin than raw mortar)
      const rVal = Math.round(188 + (rng() - 0.5) * 36);
      stRCtx.fillStyle = `rgb(${rVal},${rVal},${rVal})`;
      stRCtx.fillRect(bx, by, drawW, drawH);

      // Fine mineral speckle & chisel texture inside each stone
      const specks = Math.round((drawW * drawH) / 420);
      for (let k = 0; k < specks; k++) {
        const px = bx + rng() * drawW;
        const py = by + rng() * drawH;
        const sz = 1.4 + rng() * 2.5;
        stCtx.fillStyle = rng() > 0.5 ? 'rgba(240, 238, 230, 0.14)' : 'rgba(42, 44, 48, 0.16)';
        stCtx.fillRect(px, py, sz, sz);
        stBCtx.fillStyle = rng() > 0.5 ? 'rgba(220, 220, 220, 0.18)' : 'rgba(70, 70, 70, 0.22)';
        stBCtx.fillRect(px, py, sz, sz);
      }
    }
  }
  const housingStone = finalizeTexture(stC, maxAniso, 1, 1, true);
  const housingStoneBump = finalizeTexture(stBC, maxAniso, 1, 1, false);
  const housingStoneRough = finalizeTexture(stRC, maxAniso, 1, 1, false);

  // 13. Artisanal Troweled Lime Stucco Plaster (256x256 optimized)
  const [plC, plCtx] = makeCanvas(256);
  const [plBC, plBCtx] = makeCanvas(256);
  plCtx.fillStyle = '#efe5d3';
  plCtx.fillRect(0, 0, 256, 256);
  plBCtx.fillStyle = '#848484';
  plBCtx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 26; i++) {
    const cx = rng() * 256;
    const cy = rng() * 256;
    const radP = 18 + rng() * 40;
    const warmCloud = rng() > 0.48;
    const g = plCtx.createRadialGradient(cx, cy, 2, cx, cy, radP);
    g.addColorStop(0, warmCloud ? 'rgba(255, 250, 238, 0.18)' : 'rgba(182, 162, 134, 0.16)');
    g.addColorStop(1, 'rgba(235, 224, 206, 0)');
    plCtx.fillStyle = g;
    plCtx.fillRect(0, 0, 256, 256);
  }
  for (let i = 0; i < 56; i++) {
    const cx = rng() * 256;
    const cy = rng() * 256;
    const radArc = 10 + rng() * 24;
    const a0 = rng() * Math.PI * 2;
    const a1 = a0 + 0.7 + rng() * 1.1;
    plCtx.strokeStyle = rng() > 0.5 ? 'rgba(255, 252, 245, 0.2)' : 'rgba(164, 144, 118, 0.15)';
    plCtx.lineWidth = 1.5 + rng() * 2.5;
    plCtx.beginPath();
    plCtx.arc(cx, cy, radArc, a0, a1);
    plCtx.stroke();

    plBCtx.strokeStyle = rng() > 0.5 ? 'rgba(192, 192, 192, 0.24)' : 'rgba(84, 84, 84, 0.22)';
    plBCtx.lineWidth = 1.6 + rng() * 2.2;
    plBCtx.beginPath();
    plBCtx.arc(cx, cy, radArc, a0, a1);
    plBCtx.stroke();
  }
  for (let i = 0; i < 520; i++) {
    const x = rng() * 256;
    const y = rng() * 256;
    plCtx.fillStyle = rng() > 0.5 ? 'rgba(255, 252, 244, 0.15)' : 'rgba(148, 130, 108, 0.13)';
    plCtx.fillRect(x, y, 1.4, 1.4);
    plBCtx.fillStyle = rng() > 0.5 ? 'rgba(170, 170, 170, 0.18)' : 'rgba(98, 98, 98, 0.18)';
    plBCtx.fillRect(x, y, 1.4, 1.4);
  }
  const housingPlaster = finalizeTexture(plC, maxAniso, 1, 1, true);
  const housingPlasterBump = finalizeTexture(plBC, maxAniso, 1, 1, false);

  // 14. Overlapping Architectural Roof Shingles / Clay & Slate Tiles (512x512 Albedo + Bump)
  const [rfC, rfCtx] = makeCanvas(512);
  const [rfBC, rfBCtx] = makeCanvas(512);
  rfCtx.fillStyle = '#a89b90';
  rfCtx.fillRect(0, 0, 512, 512);
  rfBCtx.fillStyle = '#383838';
  rfBCtx.fillRect(0, 0, 512, 512);

  const shingleRows = 8;
  const shingleCols = 8;
  const shH = 512 / shingleRows;
  const shW = 512 / shingleCols;
  for (let r = 0; r < shingleRows; r++) {
    const y0 = r * shH;
    const xOff = (r % 2) * (shW * 0.5);
    for (let c = -1; c <= shingleCols; c++) {
      const x0 = c * shW + xOff;
      const lum = 198 + (rng() - 0.5) * 34;
      const tileGrad = rfCtx.createLinearGradient(x0, y0, x0, y0 + shH);
      tileGrad.addColorStop(0, `rgb(${Math.round(lum * 0.82)},${Math.round(lum * 0.8)},${Math.round(lum * 0.78)})`);
      tileGrad.addColorStop(0.55, `rgb(${Math.round(lum)},${Math.round(lum * 0.98)},${Math.round(lum * 0.96)})`);
      tileGrad.addColorStop(1, `rgb(${Math.round(lum * 1.08)},${Math.round(lum * 1.06)},${Math.round(lum * 1.04)})`);

      // Scalloped rounded-bottom architectural roof tile path
      const drawShingle = (ctx: CanvasRenderingContext2D) => {
        ctx.beginPath();
        ctx.moveTo(x0 + 2, y0);
        ctx.lineTo(x0 + shW - 2, y0);
        ctx.lineTo(x0 + shW - 2, y0 + shH * 0.72);
        ctx.quadraticCurveTo(x0 + shW * 0.5, y0 + shH * 1.06, x0 + 2, y0 + shH * 0.72);
        ctx.closePath();
      };

      // Deep drop shadow under lower lip
      rfCtx.fillStyle = 'rgba(20, 18, 16, 0.42)';
      rfCtx.beginPath();
      rfCtx.moveTo(x0 + 2, y0 + shH * 0.74);
      rfCtx.quadraticCurveTo(x0 + shW * 0.5, y0 + shH * 1.12, x0 + shW - 2, y0 + shH * 0.74);
      rfCtx.lineTo(x0 + shW - 2, y0 + shH * 0.88);
      rfCtx.quadraticCurveTo(x0 + shW * 0.5, y0 + shH * 1.22, x0 + 2, y0 + shH * 0.88);
      rfCtx.closePath();
      rfCtx.fill();

      rfCtx.fillStyle = tileGrad;
      drawShingle(rfCtx);
      rfCtx.fill();

      // Subtle vertical tile ridge highlight
      rfCtx.strokeStyle = 'rgba(255, 250, 240, 0.16)';
      rfCtx.lineWidth = 2;
      rfCtx.beginPath();
      rfCtx.moveTo(x0 + shW * 0.5, y0 + 6);
      rfCtx.lineTo(x0 + shW * 0.5, y0 + shH * 0.86);
      rfCtx.stroke();

      // Side joint outline
      rfCtx.strokeStyle = 'rgba(26, 22, 18, 0.34)';
      rfCtx.lineWidth = 1.6;
      drawShingle(rfCtx);
      rfCtx.stroke();

      // Bump gradient (rises from tucked top edge to proud bottom lip)
      const bTileGrad = rfBCtx.createLinearGradient(x0, y0, x0, y0 + shH);
      bTileGrad.addColorStop(0, '#505050');
      bTileGrad.addColorStop(0.7, '#d4d4d4');
      bTileGrad.addColorStop(1, '#f2f2f2');
      rfBCtx.fillStyle = bTileGrad;
      drawShingle(rfBCtx);
      rfBCtx.fill();
      rfBCtx.strokeStyle = '#181818';
      rfBCtx.lineWidth = 2.5;
      drawShingle(rfBCtx);
      rfBCtx.stroke();
    }
  }
  const housingRoofTile = finalizeTexture(rfC, maxAniso, 1, 1, true);
  const housingRoofTileBump = finalizeTexture(rfBC, maxAniso, 1, 1, false);

  // 15. Forged Citadel Ashlar & Brushed Steel Masonry (512x512 Albedo + Bump + Roughness)
  const [ctC, ctCtx] = makeCanvas(512);
  const [ctBC, ctBCtx] = makeCanvas(512);
  const [ctRC, ctRCtx] = makeCanvas(512);
  ctCtx.fillStyle = '#36404d';
  ctCtx.fillRect(0, 0, 512, 512);
  ctBCtx.fillStyle = '#1e1e1e';
  ctBCtx.fillRect(0, 0, 512, 512);
  ctRCtx.fillStyle = '#c8c8c8';
  ctRCtx.fillRect(0, 0, 512, 512);

  const citRows = 4;
  const citRowH = 512 / citRows;
  for (let r = 0; r < citRows; r++) {
    const y0 = r * citRowH;
    const cols = 3;
    const cw = 512 / cols;
    const offset = (r % 2) * (cw * 0.5);
    for (let c = -1; c <= cols; c++) {
      const bx = c * cw + offset + 3;
      const by = y0 + 3;
      const w = cw - 6;
      const h = citRowH - 6;
      const v = 104 + (rng() - 0.5) * 18;
      const grad = ctCtx.createLinearGradient(bx, by, bx, by + h);
      grad.addColorStop(0, `rgb(${Math.round(v + 16)},${Math.round(v + 24)},${Math.round(v + 36)})`);
      grad.addColorStop(0.5, `rgb(${Math.round(v)},${Math.round(v + 10)},${Math.round(v + 22)})`);
      grad.addColorStop(1, `rgb(${Math.round(v - 14)},${Math.round(v - 8)},${Math.round(v + 2)})`);
      ctCtx.fillStyle = grad;
      ctCtx.fillRect(bx, by, w, h);

      // Subtle brushed metallic horizontal streaks
      for (let s = 0; s < 16; s++) {
        const sy = by + rng() * h;
        ctCtx.fillStyle = rng() > 0.5 ? 'rgba(205, 224, 245, 0.08)' : 'rgba(20, 28, 38, 0.1)';
        ctCtx.fillRect(bx, sy, w, 1.4);
      }

      // Corner forged rivets
      ctCtx.fillStyle = 'rgba(218, 232, 248, 0.35)';
      ctBCtx.fillStyle = '#c8c8c8';
      ctBCtx.fillRect(bx, by, w, h);
      ctBCtx.fillStyle = '#f5f5f5';
      for (const rx of [bx + 10, bx + w - 10]) {
        for (const ry of [by + 10, by + h - 10]) {
          ctCtx.beginPath();
          ctCtx.arc(rx, ry, 2.8, 0, Math.PI * 2);
          ctCtx.fill();
          ctBCtx.beginPath();
          ctBCtx.arc(rx, ry, 3.2, 0, Math.PI * 2);
          ctBCtx.fill();
        }
      }

      const rv = Math.round(132 + (rng() - 0.5) * 28);
      ctRCtx.fillStyle = `rgb(${rv},${rv},${rv})`;
      ctRCtx.fillRect(bx, by, w, h);
    }
  }
  const housingCitadel = finalizeTexture(ctC, maxAniso, 1, 1, true);
  const housingCitadelBump = finalizeTexture(ctBC, maxAniso, 1, 1, false);
  const housingCitadelRough = finalizeTexture(ctRC, maxAniso, 1, 1, false);

  return {
    tabbyFur,
    tabbyBump,
    denimFabric,
    denimBump,
    quiltedLeather,
    quiltedBump,
    shieldWood,
    shieldBump,
    treeBark,
    birchBark,
    graniteRock,
    grassGround,
    contactShadow,
    housingTimber,
    housingTimberBump,
    housingTimberRough,
    housingBeam,
    housingBeamBump,
    housingStone,
    housingStoneBump,
    housingStoneRough,
    housingPlaster,
    housingPlasterBump,
    housingRoofTile,
    housingRoofTileBump,
    housingCitadel,
    housingCitadelBump,
    housingCitadelRough,
    dispose: () => {
      tabbyFur.dispose();
      tabbyBump.dispose();
      denimFabric.dispose();
      denimBump.dispose();
      quiltedLeather.dispose();
      quiltedBump.dispose();
      shieldWood.dispose();
      shieldBump.dispose();
      treeBark.dispose();
      birchBark.dispose();
      graniteRock.dispose();
      grassGround.dispose();
      contactShadow.dispose();
      housingTimber.dispose();
      housingTimberBump.dispose();
      housingTimberRough.dispose();
      housingBeam.dispose();
      housingBeamBump.dispose();
      housingStone.dispose();
      housingStoneBump.dispose();
      housingStoneRough.dispose();
      housingPlaster.dispose();
      housingPlasterBump.dispose();
      housingRoofTile.dispose();
      housingRoofTileBump.dispose();
      housingCitadel.dispose();
      housingCitadelBump.dispose();
      housingCitadelRough.dispose();
    },
  };
}
