import React, { useEffect, useRef } from 'react';
import { WeatherKind } from '../game/types';

interface WeatherScreenOverlayProps {
  weather: WeatherKind;
  windStrength: number;
}

interface EdgeRaindrop {
  x: number;
  y: number;
  r: number;
  vy: number;
  slideTimer: number;
  alpha: number;
  side: 'left' | 'right' | 'top';
  trail: number;
}

interface RainStreak {
  x: number;
  y: number;
  len: number;
  speed: number;
  alpha: number;
  side: 'left' | 'right';
}

interface ScreenSnowflake {
  x: number;
  y: number;
  r: number;
  vy: number;
  vx: number;
  phase: number;
  freq: number;
  alpha: number;
  crystalline: boolean;
}

interface DustMote {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  phase: number;
  alpha: number;
}

interface MistWisp {
  x: number;
  y: number;
  rx: number;
  ry: number;
  vx: number;
  alpha: number;
  side: 'left' | 'right';
}

export const WeatherScreenOverlay: React.FC<WeatherScreenOverlayProps> = ({
  weather,
  windStrength,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const weatherRef = useRef<WeatherKind>(weather);
  const windRef = useRef<number>(windStrength);

  weatherRef.current = weather;
  windRef.current = windStrength;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reducedMotion) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // Pre-seed screen-edge raindrop beads (hugging left/right/top borders so center stays crisp)
    const edgeBand = () => Math.max(64, Math.min(180, width * 0.14));
    const spawnDrop = (init = false): EdgeRaindrop => {
      const band = edgeBand();
      const roll = Math.random();
      const side: 'left' | 'right' | 'top' =
        roll < 0.44 ? 'left' : roll < 0.88 ? 'right' : 'top';
      let x = 0;
      let y = 0;
      if (side === 'left') {
        x = Math.pow(Math.random(), 1.65) * band;
        y = init ? Math.random() * height : Math.random() * height * 0.85;
      } else if (side === 'right') {
        x = width - Math.pow(Math.random(), 1.65) * band;
        y = init ? Math.random() * height : Math.random() * height * 0.85;
      } else {
        x = Math.random() * width;
        y = Math.pow(Math.random(), 1.8) * Math.min(105, height * 0.12);
      }
      const r = 1.6 + Math.random() * 2.9;
      return {
        x,
        y,
        r,
        vy: 0,
        slideTimer: 0.4 + Math.random() * 2.2,
        alpha: 0.16 + Math.random() * 0.3,
        side,
        trail: 0,
      };
    };

    const drops: EdgeRaindrop[] = Array.from({ length: 48 }, () => spawnDrop(true));
    const streaks: RainStreak[] = Array.from({ length: 34 }, (_, i) => {
      const side = i % 2 === 0 ? 'left' : 'right';
      const band = edgeBand() * 1.25;
      return {
        x: side === 'left' ? Math.random() * band : width - Math.random() * band,
        y: Math.random() * height,
        len: 14 + Math.random() * 22,
        speed: 420 + Math.random() * 260,
        alpha: 0.08 + Math.random() * 0.14,
        side,
      };
    });

    const snowflakes: ScreenSnowflake[] = Array.from({ length: 78 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 1.4 + Math.random() * 3.1,
      vy: 24 + Math.random() * 44,
      vx: (Math.random() - 0.5) * 14,
      phase: Math.random() * Math.PI * 2,
      freq: 0.9 + Math.random() * 1.5,
      alpha: 0.25 + Math.random() * 0.5,
      crystalline: Math.random() < 0.32,
    }));

    const dustMotes: DustMote[] = Array.from({ length: 24 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 1.1 + Math.random() * 2.0,
      vx: 4 + Math.random() * 8,
      vy: -3 - Math.random() * 7,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.12 + Math.random() * 0.22,
    }));

    const mistWisps: MistWisp[] = Array.from({ length: 14 }, (_, i) => ({
      x: i % 2 === 0 ? Math.random() * width * 0.22 : width - Math.random() * width * 0.22,
      y: Math.random() * height,
      rx: 95 + Math.random() * 130,
      ry: 42 + Math.random() * 58,
      vx: (i % 2 === 0 ? 1 : -1) * (5 + Math.random() * 8),
      alpha: 0.04 + Math.random() * 0.055,
      side: i % 2 === 0 ? 'left' : 'right',
    }));

    let rafId = 0;
    let lastTs = performance.now();
    let elapsed = 0;

    const drawSnowCrystal = (x: number, y: number, r: number, alpha: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.strokeStyle = `rgba(236, 248, 255, ${alpha.toFixed(3)})`;
      ctx.lineWidth = 0.85;
      for (let i = 0; i < 3; i++) {
        const ang = (i * Math.PI) / 3;
        const dx = Math.cos(ang) * r * 1.35;
        const dy = Math.sin(ang) * r * 1.35;
        ctx.beginPath();
        ctx.moveTo(-dx, -dy);
        ctx.lineTo(dx, dy);
        ctx.stroke();
      }
      ctx.restore();
    };

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);
      const dt = Math.min((now - lastTs) / 1000, 0.06);
      lastTs = now;
      elapsed += dt;

      ctx.clearRect(0, 0, width, height);

      const curWeather = weatherRef.current;
      const wind = windRef.current;
      const band = edgeBand();

      if (curWeather === 'rain' || curWeather === 'storm') {
        const isStorm = curWeather === 'storm';
        const intensity = isStorm ? 1.0 : 0.72;
        const activeDrops = isStorm ? drops.length : Math.floor(drops.length * 0.72);
        const activeStreaks = isStorm ? streaks.length : Math.floor(streaks.length * 0.65);

        // Subtle wet edge vignette along left/right borders
        const leftGrad = ctx.createLinearGradient(0, 0, band * 0.85, 0);
        leftGrad.addColorStop(0, `rgba(148, 197, 235, ${(0.08 * intensity).toFixed(3)})`);
        leftGrad.addColorStop(1, 'rgba(148, 197, 235, 0)');
        ctx.fillStyle = leftGrad;
        ctx.fillRect(0, 0, band * 0.85, height);

        const rightGrad = ctx.createLinearGradient(width, 0, width - band * 0.85, 0);
        rightGrad.addColorStop(0, `rgba(148, 197, 235, ${(0.08 * intensity).toFixed(3)})`);
        rightGrad.addColorStop(1, 'rgba(148, 197, 235, 0)');
        ctx.fillStyle = rightGrad;
        ctx.fillRect(width - band * 0.85, 0, band * 0.85, height);

        // Fast wind-slanted rain streaks near edges
        const slant = (isStorm ? 120 : 62) * (0.5 + wind);
        ctx.lineCap = 'round';
        for (let i = 0; i < activeStreaks; i++) {
          const s = streaks[i];
          s.y += s.speed * (isStorm ? 1.28 : 1.0) * dt;
          s.x += slant * dt * (s.side === 'left' ? 0.35 : -0.2);
          if (s.y > height + 30) {
            s.y = -25 - Math.random() * 60;
            s.x =
              s.side === 'left'
                ? Math.random() * band * 1.2
                : width - Math.random() * band * 1.2;
          }
          ctx.strokeStyle = `rgba(196, 228, 252, ${(s.alpha * intensity).toFixed(3)})`;
          ctx.lineWidth = isStorm ? 1.15 : 0.9;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.x - slant * 0.032, s.y - s.len);
          ctx.stroke();
        }

        // Clinging & trickling screen-edge raindrop beads
        for (let i = 0; i < activeDrops; i++) {
          const d = drops[i];
          d.slideTimer -= dt;
          if (d.slideTimer <= 0) {
            d.vy = Math.min(d.vy + (72 + d.r * 22) * dt, isStorm ? 210 : 145);
            d.y += d.vy * dt;
            d.x += Math.sin(elapsed * 5 + i) * 6 * dt;
            d.trail = Math.min(d.trail + d.vy * dt * 0.55, 28 + d.r * 5);
          } else {
            // Subtle micro-shiver before breaking surface tension
            d.y += 2.2 * dt;
          }

          if (d.y > height + 18 || d.alpha <= 0.02) {
            drops[i] = spawnDrop(false);
            continue;
          }

          // Water trail behind sliding bead
          if (d.trail > 2) {
            const tGrad = ctx.createLinearGradient(d.x, d.y, d.x, d.y - d.trail);
            tGrad.addColorStop(0, `rgba(210, 236, 255, ${(d.alpha * 0.55).toFixed(3)})`);
            tGrad.addColorStop(1, 'rgba(210, 236, 255, 0)');
            ctx.strokeStyle = tGrad;
            ctx.lineWidth = Math.max(0.8, d.r * 0.58);
            ctx.beginPath();
            ctx.moveTo(d.x, d.y);
            ctx.lineTo(d.x, d.y - d.trail);
            ctx.stroke();
          }

          // Translucent droplet body with lower rim & upper specular highlight
          ctx.save();
          ctx.translate(d.x, d.y);
          ctx.scale(0.86, 1.16);
          ctx.fillStyle = `rgba(182, 220, 248, ${(d.alpha * 0.52).toFixed(3)})`;
          ctx.strokeStyle = `rgba(232, 246, 255, ${(d.alpha * 0.95).toFixed(3)})`;
          ctx.lineWidth = 0.75;
          ctx.beginPath();
          ctx.arc(0, 0, d.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Tiny crisp specular highlight
          ctx.fillStyle = `rgba(255, 255, 255, ${(d.alpha * 1.15).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(-d.r * 0.3, -d.r * 0.32, Math.max(0.55, d.r * 0.28), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      } else if (curWeather === 'snow') {
        // Soft icy frost edge glow
        const frostLeft = ctx.createLinearGradient(0, 0, band * 0.9, 0);
        frostLeft.addColorStop(0, 'rgba(219, 240, 255, 0.1)');
        frostLeft.addColorStop(1, 'rgba(219, 240, 255, 0)');
        ctx.fillStyle = frostLeft;
        ctx.fillRect(0, 0, band * 0.9, height);

        const frostRight = ctx.createLinearGradient(width, 0, width - band * 0.9, 0);
        frostRight.addColorStop(0, 'rgba(219, 240, 255, 0.1)');
        frostRight.addColorStop(1, 'rgba(219, 240, 255, 0)');
        ctx.fillStyle = frostRight;
        ctx.fillRect(width - band * 0.9, 0, band * 0.9, height);

        const windDrift = (10 + wind * 38);
        for (let i = 0; i < snowflakes.length; i++) {
          const f = snowflakes[i];
          f.y += f.vy * dt;
          f.x += (f.vx + windDrift + Math.sin(elapsed * f.freq + f.phase) * 18) * dt;
          if (f.y > height + 10) {
            f.y = -10;
            f.x = Math.random() * width;
          }
          if (f.x > width + 12) f.x = -10;
          if (f.x < -12) f.x = width + 10;

          // Keep center sightline gentler than viewport edges
          const edgeDist = Math.min(f.x, width - f.x) / (width * 0.5);
          const alpha = f.alpha * (0.58 + (1 - Math.min(1, edgeDist)) * 0.42);

          if (f.crystalline && f.r >= 2.2) {
            drawSnowCrystal(f.x, f.y, f.r, alpha * 0.92);
          } else {
            const radGrad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 1.45);
            radGrad.addColorStop(0, `rgba(248, 252, 255, ${alpha.toFixed(3)})`);
            radGrad.addColorStop(0.55, `rgba(224, 242, 254, ${(alpha * 0.55).toFixed(3)})`);
            radGrad.addColorStop(1, 'rgba(224, 242, 254, 0)');
            ctx.fillStyle = radGrad;
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.r * 1.45, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (curWeather === 'fog') {
        for (let i = 0; i < mistWisps.length; i++) {
          const w = mistWisps[i];
          w.x += w.vx * dt;
          if (w.side === 'left' && w.x - w.rx > width * 0.28) w.x = -w.rx * 0.6;
          if (w.side === 'right' && w.x + w.rx < width * 0.72) w.x = width + w.rx * 0.6;

          const grad = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, w.rx);
          grad.addColorStop(0, `rgba(214, 226, 238, ${w.alpha.toFixed(3)})`);
          grad.addColorStop(1, 'rgba(214, 226, 238, 0)');
          ctx.save();
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.ellipse(w.x, w.y, w.rx, w.ry, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      } else {
        // Clear weather: subtle sunlit pollen / dust motes
        for (let i = 0; i < dustMotes.length; i++) {
          const m = dustMotes[i];
          m.x += (m.vx + Math.sin(elapsed * 0.8 + m.phase) * 5) * dt;
          m.y += (m.vy + Math.cos(elapsed * 0.7 + m.phase) * 4) * dt;
          if (m.x > width + 10) m.x = -8;
          if (m.y < -10) {
            m.y = height + 8;
            m.x = Math.random() * width;
          }
          const twinkle = 0.55 + 0.45 * Math.sin(elapsed * 1.9 + m.phase);
          const a = m.alpha * twinkle;
          ctx.fillStyle = `rgba(255, 241, 194, ${a.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 z-[9] pointer-events-none select-none w-full h-full"
    />
  );
};
