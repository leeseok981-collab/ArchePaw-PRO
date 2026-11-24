import React, { useCallback, useRef, useState } from 'react';
import {
  ArrowUp,
  Check,
  Hammer,
  RotateCw,
  Shield,
  Sparkles,
  Swords,
  Wind,
  X,
  Zap,
  Crosshair,
  Heart,
  Wand2,
} from 'lucide-react';
import { getClassSkillsCatalog, HudSnapshot, WarriorSkillId } from '../game/types';
import { MobileUiScale } from '../game/userConfig';

interface MobileControlsProps {
  hud: HudSnapshot;
  uiScale?: MobileUiScale;
  onMoveInput: (right: number, forward: number, sprint: boolean) => void;
  onJump: () => void;
  onAction: () => void;
  onCastSkill: (skillId: WarriorSkillId) => void;
  onToggleHousing: () => void;
  onConfirmHousing: () => void;
  onRotateHousing: () => void;
  onExitHousing: () => void;
}

/**
 * Clean, ergonomic mobile touch overlay:
 * - Left: Minimalist translucent virtual joystick with outer-ring auto-sprint lock.
 * - Right: Curved thumb-arc skill buttons wrapping smoothly around primary Attack/Action & Jump.
 * - Respects safe-area-insets and keeps the center viewport completely unobstructed.
 */
export const MobileControls: React.FC<MobileControlsProps> = ({
  hud,
  uiScale = 'compact',
  onMoveInput,
  onJump,
  onAction,
  onCastSkill,
  onToggleHousing,
  onConfirmHousing,
  onRotateHousing,
  onExitHousing,
}) => {
  const isCompact = uiScale === 'compact';
  const padSize = isCompact ? 96 : 112;
  const knobSize = isCompact ? 38 : 44;
  const padRadius = padSize * 0.5;
  const knobMax = isCompact ? 31 : 37;

  const padRef = useRef<HTMLDivElement | null>(null);
  const joyPointerIdRef = useRef<number | null>(null);
  const [knobPos, setKnobPos] = useState<{ x: number; y: number; sprinting: boolean; active: boolean }>({
    x: 0,
    y: 0,
    sprinting: false,
    active: false,
  });

  const updateJoystickFromClient = useCallback(
    (clientX: number, clientY: number) => {
      const el = padRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width * 0.5;
      const cy = rect.top + rect.height * 0.5;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const dist = Math.hypot(dx, dy);
      const clamped = Math.min(dist, knobMax);
      const angle = Math.atan2(dy, dx);
      const kx = dist > 0.001 ? Math.cos(angle) * clamped : 0;
      const ky = dist > 0.001 ? Math.sin(angle) * clamped : 0;

      const norm = clamped / knobMax;
      const deadzone = 0.14;
      if (norm < deadzone) {
        setKnobPos({ x: kx, y: ky, sprinting: false, active: true });
        onMoveInput(0, 0, false);
        return;
      }

      const scaled = (norm - deadzone) / (1 - deadzone);
      const right = Math.cos(angle) * scaled;
      const forward = -Math.sin(angle) * scaled;
      const sprinting = norm > 0.84;
      setKnobPos({ x: kx, y: ky, sprinting, active: true });
      onMoveInput(right, forward, sprinting);
    },
    [knobMax, onMoveInput],
  );

  const handleJoyDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (joyPointerIdRef.current !== null) return;
    joyPointerIdRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateJoystickFromClient(e.clientX, e.clientY);
  };

  const handleJoyMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joyPointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    updateJoystickFromClient(e.clientX, e.clientY);
  };

  const handleJoyUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joyPointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    joyPointerIdRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setKnobPos({ x: 0, y: 0, sprinting: false, active: false });
    onMoveInput(0, 0, false);
  };

  const housingActive = hud.housing.mode !== 'off';
  const classSkills = getClassSkillsCatalog(hud.playerClass);
  const actionLabel = hud.nearbyHint ? '채집' : '공격';

  const renderSkillIcon = (id: WarriorSkillId) => {
    const iconCls = isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4';
    if (hud.playerClass === 'archer') {
      switch (id) {
        case 'whirlwind':
          return <Crosshair className={iconCls} />;
        case 'vanguard_dash':
          return <Wind className={iconCls} />;
        case 'earthbreaker':
          return <Zap className={iconCls} />;
        case 'warcry':
          return <Sparkles className={iconCls} />;
      }
    }
    if (hud.playerClass === 'mage') {
      switch (id) {
        case 'whirlwind':
          return <Wand2 className={iconCls} />;
        case 'vanguard_dash':
          return <Sparkles className={iconCls} />;
        case 'earthbreaker':
          return <Zap className={iconCls} />;
        case 'warcry':
          return <Shield className={iconCls} />;
      }
    }
    if (hud.playerClass === 'healer') {
      switch (id) {
        case 'whirlwind':
          return <Heart className={iconCls} />;
        case 'vanguard_dash':
          return <Wind className={iconCls} />;
        case 'earthbreaker':
          return <Zap className={iconCls} />;
        case 'warcry':
          return <Sparkles className={iconCls} />;
      }
    }
    switch (id) {
      case 'whirlwind':
        return <Wind className={iconCls} />;
      case 'vanguard_dash':
        return <Zap className={iconCls} />;
      case 'earthbreaker':
        return <Swords className={iconCls} />;
      case 'warcry':
        return <Shield className={iconCls} />;
    }
  };

  // Curved ergonomic skill arc positions anchored around the bottom-right primary Attack button
  const primarySize = isCompact ? 58 : 66;
  const jumpSize = isCompact ? 46 : 52;
  const skillSize = isCompact ? 40 : 44;
  const housingBtnSize = isCompact ? 36 : 40;
  const arcRadius = isCompact ? 76 : 88;
  // 4 skills spread evenly along a graceful 105°..185° quarter-arc above-left of the primary button
  const arcAnglesDeg = [190, 160, 130, 100];

  const bottomOffset = isCompact
    ? 'calc(44px + env(safe-area-inset-bottom, 0px))'
    : 'calc(52px + env(safe-area-inset-bottom, 0px))';

  return (
    <div className="fixed inset-0 z-15 pointer-events-none select-none">
      {/* LEFT THUMB ZONE: Minimalist Virtual Joystick */}
      <div
        className="absolute pointer-events-auto flex flex-col items-center gap-1.5"
        style={{
          left: 'max(14px, env(safe-area-inset-left, 0px))',
          bottom: bottomOffset,
        }}
      >
        {/* Subtle sprint state indicator only while sprinting */}
        <div
          className={`h-4 px-2 rounded-full text-[9px] font-bold tracking-wider transition-opacity duration-150 ${
            knobPos.sprinting
              ? 'opacity-100 bg-[#0d1824]/85 border border-[#62e5ff]/55 text-[#7dd3fc]'
              : 'opacity-0 pointer-events-none'
          }`}
        >
          질주
        </div>

        <div
          ref={padRef}
          onPointerDown={handleJoyDown}
          onPointerMove={handleJoyMove}
          onPointerUp={handleJoyUp}
          onPointerCancel={handleJoyUp}
          aria-label="이동 조이스틱"
          style={{
            width: padSize,
            height: padSize,
            touchAction: 'none',
          }}
          className={`relative rounded-full transition-colors ${
            knobPos.sprinting
              ? 'bg-[#0e1b28]/62 border border-[#62e5ff]/60'
              : knobPos.active
                ? 'bg-[#0d131c]/58 border border-white/28'
                : 'bg-[#0c1118]/44 border border-white/16'
          }`}
        >
          {/* Minimal 4-way directional ticks */}
          <span className="absolute top-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/30" />
          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/30" />
          <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-white/30" />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-white/30" />

          {/* Smooth responsive thumb knob */}
          <div
            style={{
              width: knobSize,
              height: knobSize,
              left: padRadius - knobSize * 0.5,
              top: padRadius - knobSize * 0.5,
              transform: `translate3d(${knobPos.x}px, ${knobPos.y}px, 0)`,
            }}
            className={`absolute rounded-full border transition-colors ${
              knobPos.sprinting
                ? 'bg-[#62e5ff]/90 border-white shadow-[0_0_12px_rgba(98,229,255,0.55)]'
                : knobPos.active
                  ? 'bg-white/88 border-white shadow-md'
                  : 'bg-white/35 border-white/45'
            }`}
          />
        </div>
      </div>

      {/* RIGHT THUMB ZONE: Curved Action & Skill Cluster */}
      {!housingActive ? (
        <div
          className="absolute pointer-events-none"
          style={{
            right: 'max(14px, env(safe-area-inset-right, 0px))',
            bottom: bottomOffset,
            width: arcRadius + primarySize + 24,
            height: arcRadius + primarySize + 28,
          }}
        >
          {/* 4 Class Skills arranged along a clean curved thumb-arc */}
          {classSkills.map((meta, idx) => {
            const st = hud.warriorSkills.find((s) => s.id === meta.id);
            const onCd = Boolean(st && st.cooldownRemaining > 0.05);
            const lowStam = hud.stamina < meta.staminaCost;
            const disabled = onCd || lowStam;
            const deg = arcAnglesDeg[idx] ?? 140;
            const rad = (deg * Math.PI) / 180;
            // Anchor center around primary attack button (bottom-right)
            const centerRight = primarySize * 0.5;
            const centerBottom = primarySize * 0.5;
            const offsetRight = centerRight - Math.cos(rad) * arcRadius - skillSize * 0.5;
            const offsetBottom = centerBottom + Math.sin(rad) * arcRadius - skillSize * 0.5;

            return (
              <button
                key={meta.id}
                type="button"
                disabled={disabled}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (!disabled) onCastSkill(meta.id);
                }}
                aria-label={meta.name}
                style={{
                  width: skillSize,
                  height: skillSize,
                  right: offsetRight,
                  bottom: offsetBottom,
                  borderColor: disabled ? 'rgba(255,255,255,0.12)' : `${meta.accentHex}88`,
                  color: disabled ? '#64748b' : meta.accentHex,
                  touchAction: 'none',
                }}
                className={`pointer-events-auto absolute rounded-full border flex flex-col items-center justify-center transition-transform active:scale-90 ${
                  disabled
                    ? 'bg-[#0d121a]/62 opacity-65'
                    : 'bg-[#0e1520]/80 shadow-md cursor-pointer'
                }`}
              >
                {onCd && st ? (
                  <span className="text-[11px] font-mono-num font-bold text-[#e2e8f0]">
                    {st.cooldownRemaining.toFixed(0)}
                  </span>
                ) : (
                  renderSkillIcon(meta.id)
                )}
              </button>
            );
          })}

          {/* Compact Housing Toggle tucked neatly at the top-right edge */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onToggleHousing();
            }}
            aria-label="건축 모드"
            style={{
              width: housingBtnSize,
              height: housingBtnSize,
              right: 2,
              bottom: primarySize + jumpSize + 18,
              touchAction: 'none',
            }}
            className="pointer-events-auto absolute rounded-full bg-[#0e1520]/76 border border-white/18 text-[#5df7d4] flex items-center justify-center shadow-md active:scale-90 cursor-pointer"
          >
            <Hammer className="w-3.5 h-3.5" />
          </button>

          {/* Jump Button tucked right above primary Attack */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onJump();
            }}
            aria-label="점프"
            style={{
              width: jumpSize,
              height: jumpSize,
              right: 0,
              bottom: primarySize + 10,
              touchAction: 'none',
            }}
            className="pointer-events-auto absolute rounded-full bg-[#0e1520]/80 border border-white/22 text-[#e2f2ff] flex items-center justify-center shadow-md active:scale-90 cursor-pointer"
          >
            <ArrowUp className={isCompact ? 'w-4 h-4' : 'w-5 h-5'} />
          </button>

          {/* Primary Attack / Gather Button in natural right-thumb resting corner */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onAction();
            }}
            aria-label={actionLabel}
            style={{
              width: primarySize,
              height: primarySize,
              right: 0,
              bottom: 0,
              touchAction: 'none',
            }}
            className={`pointer-events-auto absolute rounded-full border-2 flex flex-col items-center justify-center shadow-lg active:scale-92 transition-transform cursor-pointer ${
              hud.nearbyHint
                ? 'bg-[#12332a]/90 border-[#38f2c8]/80 text-[#7cf7dc]'
                : 'bg-[#1f1910]/88 border-[#f0c048]/80 text-[#fde68a]'
            }`}
          >
            {hud.nearbyHint ? (
              <Sparkles className={isCompact ? 'w-5 h-5' : 'w-6 h-6'} />
            ) : (
              <Swords className={isCompact ? 'w-5 h-5' : 'w-6 h-6'} />
            )}
            <span className="text-[9px] font-bold leading-none mt-0.5 tracking-tight">
              {actionLabel}
            </span>
          </button>
        </div>
      ) : (
        /* CLEAN HOUSING BUILDER TOUCH CLUSTER */
        <div
          className="absolute pointer-events-auto flex flex-col items-end gap-2"
          style={{
            right: 'max(14px, env(safe-area-inset-right, 0px))',
            bottom: bottomOffset,
          }}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onRotateHousing();
              }}
              aria-label="90도 회전"
              style={{ width: 44, height: 44, touchAction: 'none' }}
              className="rounded-full bg-[#0e1520]/84 border border-white/22 text-[#e2e8f0] flex items-center justify-center shadow-md active:scale-90 cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onExitHousing();
              }}
              aria-label="건축 종료"
              style={{ width: 44, height: 44, touchAction: 'none' }}
              className="rounded-full bg-[#2a1519]/88 border border-[#f87171]/60 text-[#fca5a5] flex items-center justify-center shadow-md active:scale-90 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onConfirmHousing();
            }}
            aria-label="배치 확정"
            style={{ width: 58, height: 58, touchAction: 'none' }}
            className="rounded-full bg-[#0f382e]/92 border-2 border-[#38f2c8]/85 text-[#7cf7dc] flex flex-col items-center justify-center shadow-lg active:scale-92 cursor-pointer"
          >
            <Check className="w-5 h-5" />
            <span className="text-[9px] font-bold leading-none mt-0.5">배치</span>
          </button>
        </div>
      )}
    </div>
  );
};
