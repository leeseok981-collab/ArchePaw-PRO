import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  Crosshair,
  Heart,
  KeyRound,
  Link2,
  LogIn,
  Play,
  RotateCcw,
  Shield,
  Sparkles,
  Swords,
  User,
  Users,
  Wand2,
  X,
  Zap,
} from 'lucide-react';
import {
  ARMORS_CATALOG,
  CLASS_CATALOG,
  getClassSkillsCatalog,
  getClassSpec,
  PlayerClassId,
  SaveMetaSummary,
  WEAPONS_CATALOG,
} from '../game/types';
import { formatSavedDateTime } from '../game/saveSystem';

interface TitleScreenProps {
  saveSummary: SaveMetaSummary | null;
  sharedRoomId?: string | null;
  currentRoomId: string;
  mpConnected: boolean;
  selectedClass: PlayerClassId;
  onPreviewClass: (classId: PlayerClassId) => void;
  onStartNew: (classId: PlayerClassId, nickname: string) => void;
  onContinue: () => void;
  onJoinRoom: (roomId: string) => void;
  onGetShareUrl: () => string;
}

const STAT_ROWS: Array<{ key: 'hp' | 'atk' | 'spd' | 'crit' | 'util'; label: string; color: string }> = [
  { key: 'hp', label: '체력', color: '#f87171' },
  { key: 'atk', label: '공격', color: '#f59e0b' },
  { key: 'spd', label: '기동', color: '#38bdf8' },
  { key: 'crit', label: '치명', color: '#c084fc' },
  { key: 'util', label: '지원', color: '#34d399' },
];

export function extractRoomCodeInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  try {
    if (trimmed.includes('://') || trimmed.includes('?room=') || trimmed.includes('#room=')) {
      const normalized = trimmed.startsWith('http') ? trimmed : `https://local.invalid/${trimmed.replace(/^\/+/, '')}`;
      const u = new URL(normalized);
      const fromQuery = u.searchParams.get('room');
      if (fromQuery) {
        return fromQuery.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 28);
      }
      const hashMatch = u.hash.match(/room=([a-zA-Z0-9_-]{1,28})/);
      if (hashMatch?.[1]) return hashMatch[1];
    }
  } catch {
    // Fallback to regex parsing below
  }
  const queryMatch = trimmed.match(/[?&#]room=([a-zA-Z0-9_-]{1,28})/);
  if (queryMatch?.[1]) return queryMatch[1];
  return trimmed.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 28);
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  saveSummary,
  sharedRoomId,
  currentRoomId,
  mpConnected,
  selectedClass,
  onPreviewClass,
  onStartNew,
  onContinue,
  onJoinRoom,
  onGetShareUrl,
}) => {
  const [step, setStep] = useState<'login' | 'select'>('login');
  const [joinMenuOpen, setJoinMenuOpen] = useState<boolean>(() => Boolean(sharedRoomId));
  const [codeInput, setCodeInput] = useState<string>(sharedRoomId || currentRoomId || 'main');
  const [codeNotice, setCodeNotice] = useState<string | null>(
    sharedRoomId ? `초대 링크에서 접속 코드 "${sharedRoomId}"가 감지되었습니다. 등록 확인 후 입장하세요.` : null,
  );
  const [copiedLink, setCopiedLink] = useState(false);

  const activeClass = getClassSpec(selectedClass);
  const classSkills = getClassSkillsCatalog(selectedClass);
  const starterWeapon =
    WEAPONS_CATALOG.find((w) => w.id === activeClass.starterWeapon) || WEAPONS_CATALOG[0];
  const starterArmor =
    ARMORS_CATALOG.find((a) => a.id === activeClass.starterArmor) || ARMORS_CATALOG[0];

  const [nickname, setNickname] = useState<string>(activeClass.defaultNickname);
  const [nicknameTouched, setNicknameTouched] = useState(false);

  useEffect(() => {
    if (!nicknameTouched) {
      setNickname(activeClass.defaultNickname);
    }
  }, [activeClass.defaultNickname, nicknameTouched]);

  useEffect(() => {
    if (sharedRoomId && !codeInput) {
      setCodeInput(sharedRoomId);
    }
  }, [sharedRoomId, codeInput]);

  const savedClassSpec = saveSummary
    ? getClassSpec(saveSummary.playerClass || 'warrior')
    : null;

  const renderClassIcon = (id: PlayerClassId, accentHex: string) => {
    switch (id) {
      case 'warrior':
        return <Shield className="w-3.5 h-3.5 shrink-0" style={{ color: accentHex }} />;
      case 'archer':
        return <Crosshair className="w-3.5 h-3.5 shrink-0" style={{ color: accentHex }} />;
      case 'healer':
        return <Heart className="w-3.5 h-3.5 shrink-0" style={{ color: accentHex }} />;
      case 'mage':
        return <Wand2 className="w-3.5 h-3.5 shrink-0" style={{ color: accentHex }} />;
      case 'rogue':
        return <Zap className="w-3.5 h-3.5 shrink-0" style={{ color: accentHex }} />;
    }
  };

  const handleRegisterRoomCode = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = extractRoomCodeInput(codeInput);
    if (!parsed) {
      setCodeNotice('영문·숫자·하이픈(-)으로 된 접속 코드나 공유 링크를 입력해주세요.');
      return;
    }
    setCodeInput(parsed);
    onJoinRoom(parsed);
    setCodeNotice(`접속 코드 "${parsed}" 등록 완료! 이제 로그인하거나 이어서 플레이하면 같은 월드에 입장합니다.`);
  };

  const handleCopyInviteLink = () => {
    const shareUrl = onGetShareUrl();
    const mark = () => {
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2000);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(shareUrl).then(mark).catch(() => {});
    }
  };

  const handleStartSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = nickname.trim() || activeClass.defaultNickname;
    onStartNew(selectedClass, cleaned);
  };

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex items-stretch sm:items-center overflow-y-auto">
      {/* Subtle left-side contrast gradient preserving clear right-side live 3D showcase */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            step === 'login'
              ? 'linear-gradient(95deg, rgba(14, 18, 24, 0.84) 0%, rgba(14, 18, 24, 0.56) 38%, rgba(14, 18, 24, 0.08) 68%, rgba(14, 18, 24, 0) 100%)'
              : 'linear-gradient(96deg, rgba(11, 15, 21, 0.94) 0%, rgba(11, 15, 21, 0.84) 44%, rgba(11, 15, 21, 0.34) 68%, rgba(11, 15, 21, 0.04) 100%)',
        }}
      />

      {step === 'login' ? (
        /* ==================== STEP 1: ORIGINAL ATMOSPHERIC LOGIN SCREEN ==================== */
        <div className="relative z-10 w-full max-w-xl pl-6 sm:pl-14 pr-6 py-8 my-auto flex flex-col items-start pointer-events-auto">
          {/* Bespoke inline SVG Emblem Lockup (Golden Paw Shield Crest) */}
          <div className="mb-5 flex items-center gap-3.5">
            <svg
              width="54"
              height="54"
              viewBox="0 0 64 64"
              fill="none"
              aria-hidden="true"
              className="shrink-0 drop-shadow-md"
            >
              <circle cx="32" cy="32" r="29" fill="#4f321c" stroke="#9aa6b2" strokeWidth="3.5" />
              <circle cx="32" cy="32" r="24" fill="#6b4426" stroke="#d4a238" strokeWidth="1.5" strokeOpacity="0.55" />
              <ellipse cx="32" cy="39" rx="9.5" ry="7.8" fill="#e6b43c" />
              <ellipse cx="20.5" cy="29.5" rx="3.8" ry="4.8" transform="rotate(-18 20.5 29.5)" fill="#e6b43c" />
              <ellipse cx="28" cy="23.2" rx="3.6" ry="5" transform="rotate(-6 28 23.2)" fill="#e6b43c" />
              <ellipse cx="36" cy="23.2" rx="3.6" ry="5" transform="rotate(6 36 23.2)" fill="#e6b43c" />
              <ellipse cx="43.5" cy="29.5" rx="3.8" ry="4.8" transform="rotate(18 43.5 29.5)" fill="#e6b43c" />
            </svg>

            <div className="flex flex-col">
              <span className="font-display text-xs tracking-[0.26em] text-[#e6b43c] font-semibold">
                ARCHEPAW SANDBOX
              </span>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#f7f3ea] leading-tight">
                아키포우
              </h1>
            </div>
          </div>

          {/* Active Multiplayer Room Code Bar */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-[#142330]/92 border border-[#62e5ff]/40 text-xs font-semibold text-[#bae6fd] flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-[#62e5ff] shrink-0" />
              <span>
                동시 접속 방{' '}
                <span className="font-mono-num text-[#62e5ff]">{currentRoomId || 'main'}</span>
              </span>
              <span className="text-white/25">·</span>
              <span className={mpConnected ? 'text-[#5df7d4]' : 'text-[#fde68a]'}>
                {mpConnected ? '서버 연결됨' : '연결 준비 중'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setCodeInput(sharedRoomId || currentRoomId || 'main');
                setJoinMenuOpen(true);
              }}
              className="min-h-[34px] px-3 py-1.5 rounded-lg bg-[#1b2736]/92 hover:bg-[#243447] border border-[#e6b43c]/45 text-xs font-semibold text-[#fde68a] flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <KeyRound className="w-3.5 h-3.5 text-[#e6b43c]" />
              <span>접속 코드 등록</span>
            </button>
          </div>

          <p className="text-base sm:text-lg text-[#d8d3c8] leading-relaxed max-w-md mb-7 [text-wrap:balance]">
            자유롭게 달리고 도약하며 원목·석재를 채집하고, 바닥·벽·천장 타일을 연결해 나만의 집을
            직접 설계·편집·저장할 수 있습니다.
          </p>

          {/* Primary Login & Continue Actions */}
          <div className="flex flex-col items-start gap-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setStep('select')}
                className="min-h-[48px] px-7 py-3 rounded-lg bg-[#e6b43c] hover:bg-[#f0c455] active:scale-[0.98] text-[#17130d] font-bold text-base tracking-tight transition-all duration-150 cursor-pointer shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#62e5ff] flex items-center gap-2 whitespace-nowrap"
              >
                <LogIn className="w-4 h-4" />
                <span>로그인 · 캐릭터 선택</span>
              </button>

              {saveSummary && (
                <button
                  type="button"
                  onClick={onContinue}
                  className="min-h-[48px] px-5 py-3 rounded-lg bg-[#1c2836]/92 hover:bg-[#263649] border border-[#62e5ff]/40 text-[#e2f2ff] font-semibold text-sm tracking-tight transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                >
                  <RotateCcw className="w-4 h-4 text-[#62e5ff]" />
                  <span>이어서 플레이</span>
                </button>
              )}
            </div>

            {saveSummary && savedClassSpec && (
              <p className="text-xs text-[#aeb7c4] font-mono-num">
                저장됨 {formatSavedDateTime(saveSummary.savedAt)} ·{' '}
                <span style={{ color: savedClassSpec.accentHex }} className="font-semibold">
                  {savedClassSpec.name}
                </span>{' '}
                Lv.{saveSummary.level} · 월드 {saveSummary.worldTier}단계 · 건축 타일{' '}
                {saveSummary.housingCount}개
              </p>
            )}
          </div>

          {/* Single flat control-hint line */}
          <p className="mt-7 text-xs sm:text-sm text-[#b9c1cc] tracking-tight">
            WASD 이동 · Space 점프 · F 채집/공격 · H 모듈 하우징 · K 스킬 마스터리 · Ctrl+S 저장
          </p>
        </div>
      ) : (
        /* ==================== STEP 2: 5-CLASS CHARACTER SELECTION SCREEN ==================== */
        <>
          {/* Right-side live 3D badge hint (desktop only) */}
          <div className="hidden lg:flex fixed right-7 bottom-7 z-10 flex-col items-end gap-1 pointer-events-none">
            <div className="px-3.5 py-2 rounded-xl bg-[#111720]/88 border border-white/12 text-right shadow-lg">
              <div className="text-[11px] font-semibold" style={{ color: activeClass.accentHex }}>
                3D 실시간 미리보기 · {activeClass.catTitle}
              </div>
              <div className="text-xs text-[#cbd5e1] mt-0.5">
                {starterWeapon.name} · {starterArmor.name}
              </div>
            </div>
          </div>

          <div className="relative z-10 w-full max-w-[600px] px-4 py-5 sm:pl-10 sm:pr-6 sm:py-6 my-auto pointer-events-auto">
            {/* Header Lockup + Back to Login + Room Code Button */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setStep('login')}
                  className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-[#161e2a]/92 hover:bg-[#222d3e] border border-white/12 text-xs font-semibold text-[#cbd5e1] flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>로그인</span>
                </button>
                <div>
                  <div className="text-[10px] font-display tracking-[0.22em] text-[#e6b43c] font-semibold">
                    ARCHEPAW CHARACTER SELECT
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#f7f3ea] leading-tight">
                    캐릭터 및 직업 선택
                  </h1>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCodeInput(currentRoomId || 'main');
                  setJoinMenuOpen(true);
                }}
                className="min-h-[36px] px-2.5 py-1.5 rounded-lg bg-[#142533]/94 hover:bg-[#1c3345] border border-[#62e5ff]/45 text-[11px] font-semibold text-[#bae6fd] flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <KeyRound className="w-3.5 h-3.5 text-[#62e5ff]" />
                <span>
                  방 <span className="font-mono-num text-[#62e5ff]">{currentRoomId || 'main'}</span>
                </span>
              </button>
            </div>

            {/* 5-Class Selector Grid (Exact Front-View Portraits) */}
            <div className="grid grid-cols-5 gap-2 mb-3.5" role="radiogroup" aria-label="기본 직업 선택">
              {CLASS_CATALOG.map((cls) => {
                const active = cls.id === selectedClass;
                const crop = cls.portraitCrop;
                return (
                  <button
                    key={cls.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onPreviewClass(cls.id)}
                    className={`group flex flex-col items-center p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer min-h-[44px] ${
                      active
                        ? 'bg-[#1c2533] shadow-lg'
                        : 'bg-[#131922]/92 border-white/10 hover:bg-[#1a2230] hover:border-white/20'
                    }`}
                    style={
                      active
                        ? {
                            borderColor: cls.accentHex,
                            boxShadow: `0 0 0 1px ${cls.accentHex}55, 0 8px 20px rgba(0,0,0,0.45)`,
                          }
                        : undefined
                    }
                  >
                    <div
                      className="relative w-full aspect-square rounded-lg overflow-hidden bg-[#f5efe4] border mb-1.5"
                      style={{ borderColor: active ? `${cls.accentHex}aa` : 'rgba(255,255,255,0.12)' }}
                    >
                      <img
                        src={cls.portraitUrl}
                        alt={`${cls.name} 정면 초상화`}
                        loading={active ? 'eager' : 'lazy'}
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="absolute max-w-none pointer-events-none"
                        style={{
                          width: `${crop.widthPct}%`,
                          height: 'auto',
                          left: `${crop.leftPct}%`,
                          top: `${crop.topPct}%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      {renderClassIcon(cls.id, cls.accentHex)}
                      <span
                        className={`text-xs sm:text-[13px] font-bold whitespace-nowrap ${
                          active ? 'text-[#f7f3ea]' : 'text-[#cbd5e1]'
                        }`}
                      >
                        {cls.name}
                      </span>
                    </div>
                    <span className="hidden sm:block text-[10px] text-[#94a3b8] truncate max-w-full mt-0.5">
                      {cls.catTitle}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected Class Detail Card */}
            <div className="rounded-2xl bg-[#131922]/95 border border-white/12 p-4 space-y-3.5 shadow-2xl">
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-lg sm:text-xl font-bold tracking-tight"
                        style={{ color: activeClass.accentHex }}
                      >
                        {activeClass.name}
                      </span>
                      <span className="text-xs text-[#94a3b8]">·</span>
                      <span className="text-xs sm:text-sm font-semibold text-[#f7f3ea]">
                        {activeClass.catTitle}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-[#cbd5e1] mt-0.5">
                      {activeClass.roleLabel}
                    </div>
                  </div>
                  <div className="text-right font-mono-num text-[11px] text-[#aeb7c4] shrink-0">
                    <div>기본 HP {activeClass.baseHp}</div>
                    <div>사거리 {activeClass.attackRange.toFixed(1)}m</div>
                  </div>
                </div>

                {/* Uploaded Character Turnaround Sheet Preview */}
                <div className="w-full rounded-xl overflow-hidden border border-white/12 bg-[#f5efe4] aspect-[16/7.2] flex items-center justify-center">
                  <img
                    src={activeClass.portraitUrl}
                    alt={`${activeClass.name} 모델 시트`}
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                  />
                </div>

                <p className="text-xs sm:text-[13px] text-[#d5dce6] leading-relaxed">
                  {activeClass.description}
                </p>
              </div>

              {/* 5-Axis Stat Bars + Starter Gear */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2.5 border-t border-white/10">
                <div className="space-y-1.5">
                  {STAT_ROWS.map((row) => {
                    const val = activeClass.statBars[row.key];
                    return (
                      <div key={row.key} className="flex items-center gap-2 text-[11px]">
                        <span className="w-8 text-[#94a3b8] font-medium shrink-0">{row.label}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-[#242d3a] overflow-hidden">
                          <div
                            className="h-full rounded-full origin-left transition-transform duration-200"
                            style={{
                              transform: `scaleX(${val / 100})`,
                              backgroundColor: row.color,
                            }}
                          />
                        </div>
                        <span className="w-6 text-right font-mono-num text-[#cbd5e1]">{val}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col justify-between gap-2 p-2.5 rounded-xl bg-[#19212d] border border-white/8 text-xs">
                  <div>
                    <div className="text-[10px] text-[#94a3b8] mb-1">직업 기본 장비</div>
                    <div className="flex items-center gap-1.5 text-[#f7f3ea] font-semibold">
                      <Swords className="w-3.5 h-3.5 shrink-0" style={{ color: activeClass.accentHex }} />
                      <span className="truncate">{starterWeapon.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#cbd5e1] mt-1">
                      <span
                        className="w-2.5 h-2.5 rounded-sm border border-white/30 shrink-0"
                        style={{ backgroundColor: starterArmor.accentHex }}
                      />
                      <span className="truncate">{starterArmor.name}</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-[#94a3b8] font-mono-num pt-1.5 border-t border-white/8">
                    치명타 {Math.round(activeClass.baseCritChance * 100)}% · 기력 {activeClass.baseStamina}
                  </div>
                </div>
              </div>

              {/* 4 Unique Class Skills Preview (Q / E / R / T) */}
              <div className="pt-2.5 border-t border-white/10">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-[#cbd5e1] flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" style={{ color: activeClass.accentHex }} />
                    <span>{activeClass.name} 고유 마스터리 스킬</span>
                  </span>
                  <span className="text-[10px] text-[#94a3b8]">게임 내 K키로 5단계 강화</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {classSkills.map((sk) => (
                    <div
                      key={sk.id}
                      title={sk.description}
                      className="px-2 py-1.5 rounded-lg bg-[#19212d] border border-white/8 flex items-center gap-1.5 min-w-0"
                    >
                      <span
                        className="w-5 h-5 rounded text-[10px] font-mono-num font-bold flex items-center justify-center shrink-0 text-[#0f141c]"
                        style={{ backgroundColor: sk.accentHex }}
                      >
                        {sk.hotkey}
                      </span>
                      <span className="text-[11px] font-semibold text-[#f7f3ea] truncate">
                        {sk.shortName}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Nickname + Start Action */}
              <form onSubmit={handleStartSubmit} className="pt-2.5 border-t border-white/10 space-y-2.5">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <label className="relative flex-1 flex items-center">
                    <User className="w-4 h-4 text-[#94a3b8] absolute left-3 pointer-events-none" />
                    <input
                      type="text"
                      value={nickname}
                      maxLength={16}
                      onChange={(e) => {
                        setNickname(e.target.value);
                        setNicknameTouched(true);
                      }}
                      placeholder={activeClass.defaultNickname}
                      aria-label="캐릭터 닉네임"
                      className="w-full h-11 pl-9 pr-3 rounded-lg bg-[#0f141c] border border-white/15 focus:border-[#e6b43c] focus:outline-none text-sm text-[#f7f3ea] placeholder:text-[#64748b]"
                    />
                  </label>

                  <button
                    type="submit"
                    className="h-11 px-5 rounded-lg bg-[#e6b43c] hover:bg-[#f0c455] active:scale-[0.98] text-[#17130d] font-bold text-sm tracking-tight transition-all cursor-pointer shadow-lg flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>{activeClass.name}로 모험 시작</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* ==================== MULTIPLAYER JOIN CODE REGISTRATION MODAL ==================== */}
      {joinMenuOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-[#080c12]/80 p-4 pointer-events-auto"
          onClick={() => setJoinMenuOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[#141b24] border border-[#62e5ff]/35 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#10161e]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#162938] border border-[#62e5ff]/45 flex items-center justify-center">
                  <KeyRound className="w-4 h-4 text-[#62e5ff]" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-[#f7f3ea]">
                    동시 접속 코드 등록
                  </h2>
                  <p className="text-[11px] text-[#94a3b8]">
                    복사한 접속 링크 또는 방 코드를 입력해 같은 월드에 합류하세요
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setJoinMenuOpen(false)}
                aria-label="메뉴 닫기"
                className="w-8 h-8 rounded-lg bg-[#1d2532] hover:bg-[#283446] flex items-center justify-center text-[#cbd5e1] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Current Registered Room Status */}
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#192330] border border-white/10 text-xs">
                <div>
                  <div className="text-[10px] text-[#94a3b8]">현재 등록된 동시 접속 코드</div>
                  <div className="text-sm font-bold font-mono-num text-[#62e5ff] mt-0.5">
                    {currentRoomId || 'main'}
                  </div>
                </div>
                <span
                  className={`text-[11px] font-semibold ${
                    mpConnected ? 'text-[#5df7d4]' : 'text-[#fde68a]'
                  }`}
                >
                  {mpConnected ? '통합 서버 연결됨' : '연결 대기 중'}
                </span>
              </div>

              {/* Join Code or Full Share URL Input Form */}
              <form onSubmit={handleRegisterRoomCode} className="space-y-2.5">
                <label className="block text-xs font-semibold text-[#dbe3ec]">
                  접속 코드 또는 복사한 공유 링크 붙여넣기
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={codeInput}
                    onChange={(e) => {
                      setCodeInput(e.target.value);
                      setCodeNotice(null);
                    }}
                    placeholder="예: party-01 또는 https://.../?room=party-01"
                    className="flex-1 min-w-0 h-11 px-3 rounded-lg bg-[#0d121a] border border-white/15 focus:border-[#62e5ff] focus:outline-none text-xs sm:text-sm font-mono-num text-[#f7f3ea] placeholder:text-[#64748b]"
                  />
                  <button
                    type="submit"
                    className="h-11 px-4 rounded-lg bg-[#38f2c8] hover:bg-[#5df7d4] text-[#0c1d1a] font-bold text-xs sm:text-sm cursor-pointer whitespace-nowrap"
                  >
                    코드 등록
                  </button>
                </div>

                {codeNotice && (
                  <p className="text-[11px] text-[#86efac] leading-relaxed bg-[#142922] border border-[#34d399]/30 rounded-lg px-3 py-2">
                    {codeNotice}
                  </p>
                )}
              </form>

              {/* Quick Invite Share & Main Room Reset */}
              <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleCopyInviteLink}
                  className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#1d2a38] hover:bg-[#26384a] border border-white/10 text-xs font-semibold text-[#dbe3ec] flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-[#5df7d4]" /> : <Link2 className="w-3.5 h-3.5 text-[#62e5ff]" />}
                  <span>{copiedLink ? '초대 링크 복사됨' : '현재 방 링크 복사'}</span>
                </button>

                <div className="flex items-center gap-1.5">
                  {currentRoomId !== 'main' && (
                    <button
                      type="button"
                      onClick={() => {
                        setCodeInput('main');
                        onJoinRoom('main');
                        setCodeNotice('기본 통합 방 "main"으로 변경되었습니다.');
                      }}
                      className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#222a36] hover:bg-[#2c3747] text-xs font-medium text-[#cbd5e1] cursor-pointer"
                    >
                      기본 방(main)
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const parsed = extractRoomCodeInput(codeInput);
                      if (parsed && parsed !== currentRoomId) {
                        onJoinRoom(parsed);
                      }
                      setJoinMenuOpen(false);
                      setStep('select');
                    }}
                    className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-[#e6b43c] hover:bg-[#f0c455] text-[#17130d] text-xs font-bold cursor-pointer flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5 hidden" />
                    <span>캐릭터 선택으로</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
