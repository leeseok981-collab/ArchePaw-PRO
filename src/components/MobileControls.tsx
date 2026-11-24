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

interface MobileControlsProps {
  hud: HudSnapshot;
  onMoveInput: (right: number, forward: number, sprint: boolean) => void;
  onJump: () => void;
  onAction: () => void;
  onCastSkill: (skillId: WarriorSkillId) => void;
  onToggleHousing: () => void;
  onConfirmHousing: () => void;
  onRotateHousing: () => void;
  onExitHousing: () => void;
}

const PAD_RADIUS = 50;
const KNOB_MAX = 38;

export const MobileControls: React.FC<MobileControlsProps> = ({
  hud,
  onMoveInput,
  onJump,
  onAction,
  onCastSkill,
  onToggleHousing,
  onConfirmHousing,
  onRotateHousing,
  onExitHousing,
}) => {
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
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const dist = Math.hypot(dx, dy);
      const clamped = Math.min(dist, KNOB_MAX);
      const nx = dist > 0.001 ? (dx / dist) * (clamped / KNOB_MAX) : 0;
      const ny = dist > 0.001 ? (dy / dist) * (clamped / KNOB_MAX) : 0;
      const mag = Math.hypot(nx, ny);
      const deadzone = 0.12;
      const effRight = mag < deadzone ? 0 : nx;
      const effForward = mag < deadzone ? 0 : -ny;
      const sprinting = mag > 0.84;

      setKnobPos({
        x: (dx / Math.max(dist, 0.001)) * clamped,
        y: (dy / Math.max(dist, 0.001)) * clamped,
        sprinting,
        active: true,
      });
      onMoveInput(effRight, effForward, sprinting);
    },
    [onMoveInput],
  );

  const resetJoystick = useCallback(() => {
    joyPointerIdRef.current = null;
    setKnobPos({ x: 0, y: 0, sprinting: false, active: false });
    onMoveInput(0, 0, false);
  }, [onMoveInput]);

  const handleJoyPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (joyPointerIdRef.current !== null) return;
    joyPointerIdRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateJoystickFromClient(e.clientX, e.clientY);
  };

  const handleJoyPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joyPointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    updateJoystickFromClient(e.clientX, e.clientY);
  };

  const handleJoyPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joyPointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    resetJoystick();
  };

  const isHousing = hud.housing.mode !== 'off';
  const isPlacingOrMoving = hud.housing.mode === 'placing' || hud.housing.mode === 'moving';

  const classSkills = getClassSkillsCatalog(hud.playerClass);
  const renderMobileSkillIcon = (id: WarriorSkillId) => {
    if (hud.playerClass === 'archer') {
      if (id === 'whirlwind') return <Crosshair className="w-4 h-4" />;
      if (id === 'vanguard_dash') return <Zap className="w-4 h-4" />;
      if (id === 'earthbreaker') return <Sparkles className="w-4 h-4" />;
      return <Shield className="w-4 h-4" />;
    }
    if (hud.playerClass === 'healer') {
      if (id === 'whirlwind') return <Sparkles className="w-4 h-4" />;
      if (id === 'vanguard_dash') return <Heart className="w-4 h-4" />;
      if (id === 'earthbreaker') return <Wind className="w-4 h-4" />;
      return <Shield className="w-4 h-4" />;
    }
    if (hud.playerClass === 'mage') {
      if (id === 'whirlwind') return <Wand2 className="w-4 h-4" />;
      if (id === 'vanguard_dash') return <Wind className="w-4 h-4" />;
      if (id === 'earthbreaker') return <Sparkles className="w-4 h-4" />;
      return <Shield className="w-4 h-4" />;
    }
    if (hud.playerClass === 'rogue') {
      if (id === 'whirlwind') return <Swords className="w-4 h-4" />;
      if (id === 'vanguard_dash') return <Zap className="w-4 h-4" />;
      if (id === 'earthbreaker') return <Sparkles className="w-4 h-4" />;
      return <Shield className="w-4 h-4" />;
    }
    if (id === 'whirlwind') return <Wind className="w-4 h-4" />;
    if (id === 'vanguard_dash') return <Zap className="w-4 h-4" />;
    if (id === 'earthbreaker') return <Sparkles className="w-4 h-4" />;
    return <Shield className="w-4 h-4" />;
  };

  const skillMeta = classSkills.map((spec) => ({
    id: spec.id,
    label: spec.shortName.slice(0, 3),
    icon: renderMobileSkillIcon(spec.id),
    accentHex: spec.accentHex,
  }));

  const actionText = hud.nearbyHint
    ? hud.nearbyHint.kind === 'monster'
      ? '공격'
      : hud.nearbyHint.actionLabel.slice(0, 3)
    : '행동';

  return (
    <div className="pointer-events-none fixed inset-0 z-20 select-none">
      {/* Left Thumb Analog Virtual Joystick */}
      <div
        ref={padRef}
        onPointerDown={handleJoyPointerDown}
        onPointerMove={handleJoyPointerMove}
        onPointerUp={handleJoyPointerUp}
        onPointerCancel={handleJoyPointerUp}
        style={{
          width: PAD_RADIUS * 2 + 16,
          height: PAD_RADIUS * 2 + 16,
          touchAction: 'none',
        }}
        className={`pointer-events-auto fixed left-4 ${
          isHousing ? 'bottom-32' : 'bottom-5'
        } rounded-full border-2 flex items-center justify-center transition-colors ${
          knobPos.sprinting
            ? 'border-amber-400/80 bg-[#151b24]/70'
            : knobPos.active
              ? 'border-teal-300/75 bg-[#151b24]/65'
              : 'border-white/25 bg-[#121720]/50'
        }`}
        aria-label="이동 조이스틱"
      >
        <div className="w-20 h-20 rounded-full border border-dashed border-white/15 pointer-events-none" />
        <div
          style={{
            transform: `translate3d(${knobPos.x}px, ${knobPos.y}px, 0)`,
          }}
          className={`absolute w-12 h-12 rounded-full border-2 shadow-lg pointer-events-none flex items-center justify-center ${
            knobPos.sprinting
              ? 'bg-amber-400/90 border-amber-100 text-[#1a1308]'
              : 'bg-[#2a3647]/90 border-white/65 text-white'
          }`}
        >
          <span className="text-[10px] font-bold tracking-tight">
            {knobPos.sprinting ? '질주' : '이동'}
          </span>
        </div>
      </div>

      {/* Right Thumb Action Cluster */}
      <div
        className={`pointer-events-auto fixed right-4 ${
          isHousing ? 'bottom-32' : 'bottom-5'
        } flex flex-col items-end gap-2.5`}
        style={{ touchAction: 'none' }}
      >
        {isHousing ? (
          /* Housing Touch Quick Controls */
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onRotateHousing();
                }}
                className="w-12 h-12 rounded-full bg-[#1a2230]/90 border border-amber-300/50 text-amber-200 flex flex-col items-center justify-center shadow-lg active:scale-95"
              >
                <RotateCw className="w-4 h-4" />
                <span className="text-[9px] font-bold mt-0.5">회전</span>
              </button>
              <button
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onExitHousing();
                }}
                className="w-12 h-12 rounded-full bg-[#2a181c]/90 border border-rose-400/55 text-rose-200 flex flex-col items-center justify-center shadow-lg active:scale-95"
              >
                <X className="w-4 h-4" />
                <span className="text-[9px] font-bold mt-0.5">종료</span>
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onJump();
                }}
                className="w-12 h-12 rounded-full bg-[#1a2230]/90 border border-white/30 text-slate-100 flex flex-col items-center justify-center shadow-lg active:scale-95"
              >
                <ArrowUp className="w-4 h-4" />
                <span className="text-[9px] font-bold">점프</span>
              </button>
              {isPlacingOrMoving && (
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onConfirmHousing();
                  }}
                  className="w-16 h-16 rounded-full bg-emerald-600/95 border-2 border-emerald-200 text-white flex flex-col items-center justify-center shadow-xl active:scale-95"
                >
                  <Check className="w-6 h-6" />
                  <span className="text-[11px] font-bold">설치</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Combat, Gathering & Exploration Touch Cluster */
          <>
            {/* Warrior Skill Arc (44px+ buttons) */}
            <div className="flex items-center gap-1.5">
              {skillMeta.map((sk) => {
                const snap = hud.warriorSkills.find((s) => s.id === sk.id);
                const cd = snap?.cooldownRemaining ?? 0;
                const onCd = cd > 0.05;
                return (
                  <button
                    key={sk.id}
                    type="button"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      if (!onCd) onCastSkill(sk.id);
                    }}
                    className={`relative w-11 h-11 rounded-full bg-[#161d28]/90 border flex flex-col items-center justify-center shadow-md active:scale-95 ${
                      onCd ? 'border-white/15 text-slate-500' : 'text-[#f7f3ea]'
                    }`}
                    style={
                      !onCd
                        ? { borderColor: `${sk.accentHex}99`, color: sk.accentHex }
                        : undefined
                    }
                  >
                    {sk.icon}
                    <span className="text-[9px] font-bold leading-none mt-0.5">
                      {onCd ? `${Math.ceil(cd)}s` : sk.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Primary Thumb Buttons: Build, Jump, Attack/Gather */}
            <div className="flex items-end gap-2.5">
              <button
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onToggleHousing();
                }}
                className="w-12 h-12 rounded-full bg-[#1d2533]/90 border border-amber-400/55 text-amber-200 flex flex-col items-center justify-center shadow-lg active:scale-95"
              >
                <Hammer className="w-4 h-4" />
                <span className="text-[9px] font-bold mt-0.5">건축</span>
              </button>

              <button
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onJump();
                }}
                className="w-13 h-13 rounded-full bg-[#1a2433]/90 border border-sky-300/50 text-sky-100 flex flex-col items-center justify-center shadow-lg active:scale-95"
              >
                <ArrowUp className="w-5 h-5" />
                <span className="text-[10px] font-bold leading-none">점프</span>
              </button>

              <button
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onAction();
                }}
                className="w-16 h-16 rounded-full bg-amber-500/95 border-2 border-amber-100 text-[#1b1206] flex flex-col items-center justify-center shadow-xl active:scale-95"
              >
                <Swords className="w-6 h-6" />
                <span className="text-[11px] font-extrabold leading-tight">{actionText}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
