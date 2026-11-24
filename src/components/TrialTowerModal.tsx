import React, { useState } from 'react';
import { Crown, Lock, CheckCircle2, Swords, X, Sparkles, Flame, ShieldAlert } from 'lucide-react';
import { ELEMENT_META, HudSnapshot, TRIAL_TOWER_FLOORS } from '../game/types';

interface TrialTowerModalProps {
  hud: HudSnapshot;
  onClose: () => void;
  onStartFloor: (floor: number) => void;
  onExitTower: () => void;
}

const FLOOR_RANGES: Array<{ id: number; label: string; min: number; max: number }> = [
  { id: 0, label: '1~10층 · 입문 시련', min: 1, max: 10 },
  { id: 1, label: '11~20층 · 정령 군단', min: 11, max: 20 },
  { id: 2, label: '21~30층 · 정령왕·심연', min: 21, max: 30 },
];

export const TrialTowerModal: React.FC<TrialTowerModalProps> = ({
  hud,
  onClose,
  onStartFloor,
  onExitTower,
}) => {
  const highestCleared = hud.trialTower.highestClearedFloor;
  const activeFloor = hud.trialTower.activeFloor;
  const totalFloors = TRIAL_TOWER_FLOORS.length;
  const targetFloor = Math.min(totalFloors, highestCleared + 1);
  const initialRangeIdx = targetFloor <= 10 ? 0 : targetFloor <= 20 ? 1 : 2;
  const [rangeIdx, setRangeIdx] = useState<number>(initialRangeIdx);

  const currentRange = FLOOR_RANGES[rangeIdx] || FLOOR_RANGES[0];
  const visibleFloors = TRIAL_TOWER_FLOORS.filter(
    (spec) => spec.floor >= currentRange.min && spec.floor <= currentRange.max,
  );

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#090d14]/84 p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[88vh] flex flex-col rounded-2xl bg-[#131922] border border-[#62e5ff]/35 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#17202c] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#1b2d42] border border-[#62e5ff]/45 flex items-center justify-center shrink-0">
              <Crown className="w-5 h-5 text-[#62e5ff]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[#f7f3ea] truncate">
                  시련의 탑 전용 던전 (1층 ~ {totalFloors}층)
                </h2>
                <span className="text-[11px] font-mono-num font-semibold px-2 py-0.5 rounded bg-[#1d3448] text-[#7dd3fc] whitespace-nowrap">
                  최고 {highestCleared}/{totalFloors}층
                </span>
              </div>
              <p className="text-xs text-[#94a3b8] mt-0.5">
                입장 시 독립된 3D 탑 던전 공간으로 이동합니다. 보스의 약점 속성을 확인하고 30층 정상을 정복하세요.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {activeFloor !== null && (
              <button
                type="button"
                onClick={() => {
                  onExitTower();
                  onClose();
                }}
                className="px-3 py-1.5 rounded-lg bg-[#351b22] hover:bg-[#49232d] border border-[#f87171]/45 text-xs font-semibold text-[#fecaca] cursor-pointer whitespace-nowrap"
              >
                던전 퇴장
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#cbd5e1] hover:text-white cursor-pointer"
              aria-label="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 1~10F / 11~20F / 21~30F Range Tabs */}
        <div className="grid grid-cols-3 gap-1.5 px-4 sm:px-5 pt-3 pb-2 bg-[#111720] border-b border-white/8 shrink-0">
          {FLOOR_RANGES.map((r) => {
            const active = rangeIdx === r.id;
            const rangeCleared = Math.max(0, Math.min(r.max, highestCleared) - r.min + 1);
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setRangeIdx(r.id)}
                className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-[#1d3347] border-[#62e5ff]/70 text-[#e0f2fe]'
                    : 'bg-[#161e29] hover:bg-[#1c2635] border-white/8 text-[#94a3b8]'
                }`}
              >
                <span className="truncate">{r.label}</span>
                <span className="text-[10px] font-mono-num text-[#7dd3fc] shrink-0">
                  {rangeCleared}/10
                </span>
              </button>
            );
          })}
        </div>

        {/* Floor List */}
        <div className="p-4 sm:p-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
          {visibleFloors.map((spec) => {
            const cleared = spec.floor <= highestCleared;
            const unlocked = spec.floor <= highestCleared + 1;
            const isCurrent = activeFloor === spec.floor;
            const isNextTarget = spec.floor === highestCleared + 1;
            const weakMeta = ELEMENT_META[spec.weakness];

            return (
              <div
                key={spec.floor}
                className={`rounded-xl border p-3.5 flex flex-col justify-between gap-2.5 transition-colors ${
                  isCurrent
                    ? 'bg-[#1a2938] border-[#62e5ff]/75'
                    : isNextTarget
                      ? 'bg-[#1c2330] border-[#e6b43c]/60'
                      : cleared
                        ? 'bg-[#162028] border-[#34d399]/35'
                        : 'bg-[#12171f]/80 border-white/8 opacity-65'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-10 h-10 rounded-lg font-mono-num text-xs font-bold flex items-center justify-center shrink-0 border"
                      style={{
                        backgroundColor: unlocked ? `${spec.accentHex}24` : '#1b222c',
                        borderColor: unlocked ? `${spec.accentHex}88` : 'rgba(255,255,255,0.1)',
                        color: unlocked ? spec.accentHex : '#64748b',
                      }}
                    >
                      {spec.floor}F
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-[#f7f3ea] truncate">
                          {spec.bossName}
                        </span>
                        {spec.floor % 10 === 0 && (
                          <Flame className="w-3.5 h-3.5 text-[#f59e0b] shrink-0" />
                        )}
                      </div>
                      <div className="text-[11px] text-[#94a3b8] truncate">{spec.bossTitle}</div>
                    </div>
                  </div>

                  {cleared ? (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-[#4ade80] shrink-0 whitespace-nowrap">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>클리어</span>
                    </span>
                  ) : unlocked ? (
                    <span className="text-[10px] font-semibold text-[#fde047] shrink-0 whitespace-nowrap">
                      입장 가능
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] text-[#64748b] shrink-0 whitespace-nowrap">
                      <Lock className="w-3 h-3" />
                      <span>잠김</span>
                    </span>
                  )}
                </div>

                {/* Stats + Weakness Element Badge */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-num text-[#cbd5e1] bg-[#0f141c]/85 px-2.5 py-1.5 rounded-lg border border-white/6">
                  <div className="flex items-center gap-2">
                    <span>HP {spec.hp}</span>
                    <span className="text-white/20">·</span>
                    <span>공격 {spec.attackDamage}</span>
                    <span className="text-white/20">·</span>
                    <span className="text-[#93c5fd]">EXP +{spec.expReward}</span>
                  </div>
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap"
                    style={{
                      backgroundColor: weakMeta.bgHex,
                      borderColor: `${weakMeta.hex}75`,
                      color: weakMeta.hex,
                    }}
                  >
                    <ShieldAlert className="w-3 h-3 shrink-0" />
                    <span>약점: {weakMeta.label}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <div className="flex items-center gap-1 text-[10px] text-[#cbd5e1] truncate">
                    <Sparkles className="w-3 h-3 text-[#e6b43c] shrink-0" />
                    <span className="truncate">{spec.rewardText}</span>
                  </div>

                  <button
                    type="button"
                    disabled={!unlocked}
                    onClick={() => {
                      onStartFloor(spec.floor);
                      onClose();
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 whitespace-nowrap ${
                      !unlocked
                        ? 'bg-[#1c232e] text-[#64748b] cursor-not-allowed'
                        : isCurrent
                          ? 'bg-[#1e3d52] hover:bg-[#264d68] text-[#7dd3fc] border border-[#62e5ff]/55 cursor-pointer'
                          : isNextTarget
                            ? 'bg-[#e6b43c] hover:bg-[#f0c455] text-[#17130d] cursor-pointer'
                            : 'bg-[#223042] hover:bg-[#2c3f56] text-[#e2e8f0] border border-white/12 cursor-pointer'
                    }`}
                  >
                    <Swords className="w-3.5 h-3.5" />
                    <span>{isCurrent ? '재도전' : cleared ? '다시 도전' : '던전 입장'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
