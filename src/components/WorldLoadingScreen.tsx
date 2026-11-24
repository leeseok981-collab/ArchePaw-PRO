import React from 'react';
import { WorldRecord } from '../game/types';

interface WorldLoadingScreenProps {
  world: WorldRecord;
  progress: number;
  stageLabel: string;
}

export const WorldLoadingScreen: React.FC<WorldLoadingScreenProps> = ({
  world,
  progress,
  stageLabel,
}) => {
  const clamped = Math.max(0, Math.min(100, Math.round(progress)));
  const isCreative = world.gameMode === 'creative';

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6 select-none"
      style={{
        background:
          'radial-gradient(ellipse at 50% 38%, #182334 0%, #0e141f 58%, #090d14 100%)',
      }}
      role="status"
      aria-live="polite"
      aria-label="월드 로딩 중"
    >
      {/* Positioned slightly above vertical center: Main Menu Golden Paw Emblem + Loading Bar directly underneath */}
      <div className="-mt-12 sm:-mt-16 flex flex-col items-center w-full max-w-[360px]">
        {/* Exact Main Menu Golden Paw Shield Icon */}
        <div className="relative flex items-center justify-center mb-5">
          <svg
            width="104"
            height="104"
            viewBox="0 0 64 64"
            fill="none"
            aria-label="ArchePaw Emblem"
            className="w-24 h-24 sm:w-[104px] sm:h-[104px] drop-shadow-[0_10px_28px_rgba(230,180,60,0.28)]"
          >
            <circle cx="32" cy="32" r="29" fill="#4f321c" stroke="#9aa6b2" strokeWidth="3.5" />
            <circle
              cx="32"
              cy="32"
              r="24"
              fill="#6b4426"
              stroke="#d4a238"
              strokeWidth="1.5"
              strokeOpacity="0.6"
            />
            <ellipse cx="32" cy="39" rx="9.5" ry="7.8" fill="#e6b43c" />
            <ellipse
              cx="20.5"
              cy="29.5"
              rx="3.8"
              ry="4.8"
              transform="rotate(-18 20.5 29.5)"
              fill="#e6b43c"
            />
            <ellipse
              cx="28"
              cy="23.2"
              rx="3.6"
              ry="5"
              transform="rotate(-6 28 23.2)"
              fill="#e6b43c"
            />
            <ellipse
              cx="36"
              cy="23.2"
              rx="3.6"
              ry="5"
              transform="rotate(6 36 23.2)"
              fill="#e6b43c"
            />
            <ellipse
              cx="43.5"
              cy="29.5"
              rx="3.8"
              ry="4.8"
              transform="rotate(18 43.5 29.5)"
              fill="#e6b43c"
            />
          </svg>
        </div>

        {/* Loading Bar directly below the Main Menu Icon */}
        <div className="w-full space-y-2.5">
          <div className="w-full h-3 rounded-full bg-[#1a2434] border border-white/12 overflow-hidden p-[2px] shadow-inner">
            <div
              className="h-full rounded-full transition-[width] duration-200 ease-out"
              style={{
                width: `${clamped}%`,
                background: isCreative
                  ? 'linear-gradient(90deg, #38bdf8 0%, #a855f7 52%, #facc15 100%)'
                  : 'linear-gradient(90deg, #d97706 0%, #facc15 65%, #fef08a 100%)',
              }}
            />
          </div>

          <div className="flex items-center justify-between text-xs px-0.5">
            <span className="text-[#cbd5e1] font-medium truncate pr-3">{stageLabel}</span>
            <span className="font-mono-num tabular-nums font-bold text-[#facc15] shrink-0">
              {clamped}%
            </span>
          </div>
        </div>

        {/* Quiet World Summary Below */}
        <div className="mt-6 text-center space-y-1">
          <div className="text-base font-bold text-[#f8fafc] tracking-tight truncate max-w-[320px]">
            {world.name}
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-[#94a3b8]">
            <span className={isCreative ? 'text-[#38bdf8] font-semibold' : 'text-[#86efac] font-semibold'}>
              {isCreative ? '크리에이티브' : '서바이벌'}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {world.isMultiplayer && world.roomCode
                ? `멀티플레이 (${world.roomCode})`
                : '싱글플레이'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
