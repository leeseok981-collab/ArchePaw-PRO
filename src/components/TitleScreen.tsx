import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Crosshair,
  Globe,
  Heart,
  Infinity as InfinityIcon,
  LogIn,
  Play,
  Plus,
  RefreshCw,
  Settings,
  Shield,
  Sparkles,
  Swords,
  Trash2,
  User,
  UserCog,
  Users,
  Wand2,
  Zap,
} from 'lucide-react';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  CLASS_CATALOG,
  GameMode,
  getClassSpec,
  PlayerClassId,
  WorldRecord,
} from '../game/types';
import { formatSavedDateTime, generateRandomRoomCode } from '../game/saveSystem';
import { UserProfile } from '../game/userConfig';

export interface CreateWorldInput {
  name: string;
  gameMode: GameMode;
  isMultiplayer: boolean;
  roomCode: string;
  playerClass: PlayerClassId;
  nickname: string;
}

interface TitleScreenProps {
  worlds: WorldRecord[];
  selectedClass: PlayerClassId;
  isOnline: boolean;
  firebaseUser: FirebaseUser | null;
  authBusy: boolean;
  profile: UserProfile;
  onPreviewClass: (classId: PlayerClassId) => void;
  onTitleCameraMode: (mode: 'scenic' | 'character') => void;
  onCreateWorld: (input: CreateWorldInput) => void;
  onEnterWorld: (world: WorldRecord) => void;
  onDeleteWorld: (worldId: string) => void;
  onOpenMultiplayer: () => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  onSignInGoogle: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  worlds,
  selectedClass,
  isOnline,
  firebaseUser,
  authBusy,
  profile,
  onPreviewClass,
  onTitleCameraMode,
  onCreateWorld,
  onEnterWorld,
  onDeleteWorld,
  onOpenMultiplayer,
  onOpenSettings,
  onOpenProfile,
  onSignInGoogle,
}) => {
  const [step, setStep] = useState<'main' | 'worlds' | 'create'>('main');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Create World Form State
  const [worldName, setWorldName] = useState<string>('새로운 아키포우 월드');
  const [gameMode, setGameMode] = useState<GameMode>('survival');
  const [isMultiplayer, setIsMultiplayer] = useState<boolean>(false);
  const [roomCode, setRoomCode] = useState<string>(() => generateRandomRoomCode());
  const activeClass = getClassSpec(selectedClass);
  const [nickname, setNickname] = useState<string>(profile.nickname || activeClass.defaultNickname);

  useEffect(() => {
    if (profile.nickname) {
      setNickname(profile.nickname);
    }
  }, [profile.nickname]);

  useEffect(() => {
    onTitleCameraMode(step === 'create' ? 'character' : 'scenic');
  }, [step, onTitleCameraMode]);

  const openCreateScreen = () => {
    setConfirmDeleteId(null);
    setWorldName(`아키포우 월드 ${worlds.length + 1}`);
    setGameMode('survival');
    setIsMultiplayer(false);
    setRoomCode(generateRandomRoomCode());
    setStep('create');
  };

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

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedNick = nickname.trim() || profile.nickname || activeClass.defaultNickname;
    const cleanedName = worldName.trim() || `아키포우 월드 ${worlds.length + 1}`;
    const cleanedCode = isMultiplayer
      ? roomCode.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || generateRandomRoomCode()
      : '';
    onCreateWorld({
      name: cleanedName,
      gameMode,
      isMultiplayer,
      roomCode: cleanedCode,
      playerClass: selectedClass,
      nickname: cleanedNick,
    });
  };

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col overflow-hidden">
      {/* Atmospheric vignette keeping the live rotating waterfall & valley crystal clear */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            step === 'main'
              ? 'radial-gradient(ellipse at center, rgba(10, 15, 22, 0.44) 0%, rgba(10, 15, 22, 0.16) 52%, rgba(9, 13, 20, 0.56) 100%)'
              : step === 'worlds'
                ? 'radial-gradient(ellipse at center, rgba(10, 15, 22, 0.72) 0%, rgba(9, 13, 20, 0.84) 100%)'
                : 'linear-gradient(96deg, rgba(11, 15, 21, 0.95) 0%, rgba(11, 15, 21, 0.86) 46%, rgba(11, 15, 21, 0.34) 70%, rgba(11, 15, 21, 0.04) 100%)',
        }}
      />

      {step === 'main' && (
        /* ==================== STEP 1: MAIN MENU ==================== */
        <div
          className="relative z-10 flex-1 w-full flex flex-col justify-between p-4 sm:p-6 pointer-events-none"
          style={{
            paddingTop: 'max(14px, env(safe-area-inset-top))',
            paddingBottom: 'max(14px, env(safe-area-inset-bottom))',
          }}
        >
          {/* TOP BAR: Left = Google Auth + Profile Settings | Top-Center = Offline Translucent Notice */}
          <div className="relative flex items-start justify-between gap-2 w-full">
            <div className="pointer-events-auto flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onOpenProfile}
                className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-xl bg-[#0f151f]/88 hover:bg-[#172130]/94 border border-white/14 transition-colors cursor-pointer shadow-lg"
                title="프로필 사진 및 닉네임 설정"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden border border-[#e6b43c]/80 bg-[#1a2433] shrink-0">
                  <img
                    src={profile.avatarData}
                    alt={profile.nickname}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-left min-w-0 max-w-[130px] sm:max-w-[170px]">
                  <div className="text-xs font-bold text-[#f7f3ea] truncate leading-tight">
                    {profile.nickname}
                  </div>
                  <div className="text-[10px] text-[#94a3b8] truncate leading-tight">
                    {firebaseUser ? 'Google 연동 · 프로필' : '프로필 설정'}
                  </div>
                </div>
                <UserCog className="w-3.5 h-3.5 text-[#facc15] shrink-0" />
              </button>

              {!firebaseUser && isOnline && (
                <button
                  type="button"
                  disabled={authBusy}
                  onClick={onSignInGoogle}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#f8f5ee]/95 hover:bg-white text-[#111827] text-xs font-bold shadow-lg transition-colors cursor-pointer whitespace-nowrap"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{authBusy ? '로그인 중...' : 'Google 로그인'}</span>
                </button>
              )}
            </div>

            {!isOnline && (
              <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-1 sm:top-1.5 text-center">
                <span className="text-xs sm:text-sm font-medium tracking-[0.22em] text-white/55 drop-shadow-[0_1px_6px_rgba(0,0,0,0.65)] whitespace-nowrap">
                  오프라인 플레이
                </span>
              </div>
            )}

            <div className="w-2 shrink-0" />
          </div>

          {/* CENTER HERO: High-Craft Geometric Ornament + Centered Yellow English & Korean Title + Menu Stack */}
          <div className="my-auto flex flex-col items-center justify-center text-center pointer-events-none px-2">
            <div className="relative flex flex-col items-center justify-center px-8 sm:px-14 py-7 sm:py-9 mb-6 sm:mb-7">
              <svg
                viewBox="0 0 460 210"
                fill="none"
                aria-hidden="true"
                className="absolute inset-0 w-full h-full pointer-events-none drop-shadow-[0_6px_22px_rgba(0,0,0,0.62)]"
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  <linearGradient id="apGoldStroke" x1="0" y1="0" x2="460" y2="210" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#fef08a" stopOpacity="0.92" />
                    <stop offset="48%" stopColor="#facc15" stopOpacity="0.98" />
                    <stop offset="100%" stopColor="#d97706" stopOpacity="0.82" />
                  </linearGradient>
                  <linearGradient id="apDiamondFill" x1="230" y1="12" x2="230" y2="198" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#0f1722" stopOpacity="0.58" />
                    <stop offset="50%" stopColor="#0b111a" stopOpacity="0.72" />
                    <stop offset="100%" stopColor="#0f1722" stopOpacity="0.54" />
                  </linearGradient>
                </defs>

                <polygon
                  points="230,10 342,38 432,105 342,172 230,200 118,172 28,105 118,38"
                  fill="url(#apDiamondFill)"
                  stroke="url(#apGoldStroke)"
                  strokeWidth="1.4"
                  strokeOpacity="0.72"
                />
                <polygon
                  points="230,22 330,46 410,105 330,164 230,188 130,164 50,105 130,46"
                  fill="none"
                  stroke="#fde047"
                  strokeWidth="0.75"
                  strokeOpacity="0.45"
                />
                <circle
                  cx="230"
                  cy="105"
                  r="82"
                  stroke="#facc15"
                  strokeWidth="0.9"
                  strokeOpacity="0.32"
                  strokeDasharray="6 6"
                />
                <circle
                  cx="230"
                  cy="105"
                  r="64"
                  stroke="#7dd3fc"
                  strokeWidth="0.7"
                  strokeOpacity="0.26"
                />
                <polygon points="230,2 238,10 230,18 222,10" fill="#facc15" />
                <polygon points="230,192 238,200 230,208 222,200" fill="#facc15" />
                <path d="M12 105 L28 95 L38 105 L28 115 Z" fill="#facc15" fillOpacity="0.92" />
                <path d="M448 105 L432 95 L422 105 L432 115 Z" fill="#facc15" fillOpacity="0.92" />
                <line x1="42" y1="105" x2="86" y2="105" stroke="#fde047" strokeWidth="1.2" strokeOpacity="0.7" />
                <line x1="374" y1="105" x2="418" y2="105" stroke="#fde047" strokeWidth="1.2" strokeOpacity="0.7" />
                <path d="M110 34 L126 30 L122 44" stroke="#fef08a" strokeWidth="1.3" strokeOpacity="0.75" />
                <path d="M350 34 L334 30 L338 44" stroke="#fef08a" strokeWidth="1.3" strokeOpacity="0.75" />
                <path d="M110 176 L126 180 L122 166" stroke="#fef08a" strokeWidth="1.3" strokeOpacity="0.75" />
                <path d="M350 176 L334 180 L338 166" stroke="#fef08a" strokeWidth="1.3" strokeOpacity="0.75" />
              </svg>

              <div className="relative z-10 flex flex-col items-center">
                <span className="font-display text-xs sm:text-sm tracking-[0.34em] text-[#facc15] font-bold drop-shadow-[0_2px_10px_rgba(250,204,21,0.35)]">
                  ARCHEPAW SANDBOX
                </span>
                <div className="my-2 flex items-center gap-2.5">
                  <span className="h-[1px] w-10 sm:w-14 bg-gradient-to-r from-transparent to-[#facc15]/80" />
                  <span className="w-2 h-2 rotate-45 bg-[#facc15]" />
                  <span className="h-[1px] w-10 sm:w-14 bg-gradient-to-l from-transparent to-[#facc15]/80" />
                </div>
                <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-[#fbf8f1] leading-none drop-shadow-[0_4px_18px_rgba(0,0,0,0.72)]">
                  아키포우
                </h1>
              </div>
            </div>

            {/* Vertical Centered Button Stack: 플레이 -> 멀티플레이 -> 설정 */}
            <div className="pointer-events-auto flex flex-col items-stretch w-full max-w-[248px] sm:max-w-[272px] gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setConfirmDeleteId(null);
                  setStep('worlds');
                }}
                className="min-h-[48px] px-6 py-3 rounded-xl bg-[#e6b43c] hover:bg-[#f2c652] active:scale-[0.98] text-[#17120a] font-extrabold text-base tracking-wide transition-all cursor-pointer shadow-[0_8px_24px_rgba(0,0,0,0.45)] flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>플레이</span>
              </button>

              <button
                type="button"
                onClick={onOpenMultiplayer}
                className="min-h-[45px] px-6 py-2.5 rounded-xl bg-[#111924]/92 hover:bg-[#1a2636]/96 active:scale-[0.98] border border-white/18 hover:border-[#38f2c8]/60 text-[#f3efe6] font-bold text-sm tracking-wide transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Globe className="w-4 h-4 text-[#38f2c8]" />
                <span>멀티플레이</span>
              </button>

              <button
                type="button"
                onClick={onOpenSettings}
                className="min-h-[45px] px-6 py-2.5 rounded-xl bg-[#111924]/88 hover:bg-[#1a2636]/95 active:scale-[0.98] border border-white/16 hover:border-[#facc15]/55 text-[#e2e8f0] font-bold text-sm tracking-wide transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Settings className="w-4 h-4 text-[#facc15]" />
                <span>설정</span>
              </button>
            </div>
          </div>

          {/* BOTTOM BAR: Left = Small Translucent Copyright | Right = Original Golden Paw Shield Logo */}
          <div className="flex items-end justify-between gap-4 w-full">
            <div className="pointer-events-none select-none text-[11px] font-medium text-white/45 tracking-wide drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">
              v1.0 @Monejo-studio 재 배포 금지
            </div>

            <div className="pointer-events-none flex items-center gap-2 opacity-92">
              <svg
                width="48"
                height="48"
                viewBox="0 0 64 64"
                fill="none"
                aria-label="ArchePaw Emblem"
                className="shrink-0 drop-shadow-[0_4px_12px_rgba(0,0,0,0.65)]"
              >
                <circle cx="32" cy="32" r="29" fill="#4f321c" stroke="#9aa6b2" strokeWidth="3.5" />
                <circle
                  cx="32"
                  cy="32"
                  r="24"
                  fill="#6b4426"
                  stroke="#d4a238"
                  strokeWidth="1.5"
                  strokeOpacity="0.55"
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
          </div>
        </div>
      )}

      {step === 'worlds' && (
        /* ==================== STEP 2: WORLD LIST SCREEN + BOTTOM "맵 만들기" BUTTON ==================== */
        <div
          className="relative z-10 flex-1 w-full flex flex-col items-center justify-center p-4 sm:p-6 pointer-events-auto"
          style={{
            paddingTop: 'max(16px, env(safe-area-inset-top))',
            paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
          }}
        >
          <div className="w-full max-w-[680px] max-h-[86dvh] flex flex-col rounded-2xl bg-[#101620]/95 border border-white/14 shadow-2xl overflow-hidden">
            {/* Top Header */}
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setStep('main')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#192332] hover:bg-[#223044] border border-white/12 text-xs font-semibold text-[#cbd5e1] transition-colors cursor-pointer whitespace-nowrap"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>메인 메뉴</span>
                </button>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold text-[#f8fafc] tracking-tight truncate">
                    월드 선택
                  </h2>
                </div>
              </div>
              <span className="text-xs font-mono-num tabular-nums text-[#94a3b8] whitespace-nowrap">
                {worlds.length}개의 월드
              </span>
            </div>

            {/* Scrollable World List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
              {worlds.length === 0 ? (
                <div className="py-12 px-4 text-center space-y-2">
                  <div className="text-base font-bold text-[#f1f5f9]">
                    아직 생성된 월드가 없습니다
                  </div>
                  <p className="text-xs text-[#94a3b8] leading-relaxed">
                    하단의 <strong className="text-[#facc15]">맵 만들기</strong> 버튼을 눌러 서바이벌 또는 크리에이티브 월드를 만들어보세요.
                  </p>
                </div>
              ) : (
                worlds.map((w) => {
                  const clsSpec = getClassSpec(w.playerClass || 'warrior');
                  const isCreative = w.gameMode === 'creative';
                  const confirming = confirmDeleteId === w.id;
                  return (
                    <div
                      key={w.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 rounded-xl bg-[#161e2b] hover:bg-[#1b2535] border border-white/10 transition-colors"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm sm:text-base font-bold text-[#f8fafc] truncate">
                            {w.name}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#94a3b8]">
                          <span
                            className={
                              isCreative
                                ? 'font-semibold text-[#38bdf8]'
                                : 'font-semibold text-[#86efac]'
                            }
                          >
                            {isCreative ? '크리에이티브' : '서바이벌'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className={w.isMultiplayer ? 'text-[#5df7d4]' : 'text-[#94a3b8]'}>
                            {w.isMultiplayer && w.roomCode
                              ? `멀티 (${w.roomCode})`
                              : '싱글플레이'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span style={{ color: clsSpec.accentHex }} className="font-medium">
                            {clsSpec.name}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-num tabular-nums">
                            Lv.{w.level} / Tier {w.worldTier}
                          </span>
                          {w.lastPlayedAt > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono-num tabular-nums">
                                {formatSavedDateTime(w.lastPlayedAt)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 justify-end">
                        {confirming ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteWorld(w.id);
                                setConfirmDeleteId(null);
                              }}
                              className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#ef4444] hover:bg-[#f87171] text-white text-xs font-bold cursor-pointer whitespace-nowrap"
                            >
                              삭제 확인
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#243044] hover:bg-[#2f3e57] text-[#cbd5e1] text-xs font-semibold cursor-pointer whitespace-nowrap"
                            >
                              취소
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(w.id)}
                              title="월드 삭제"
                              className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-[#1d2635] hover:bg-[#3a1f24] text-[#94a3b8] hover:text-[#fca5a5] border border-white/10 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onEnterWorld(w)}
                              className="min-h-[38px] px-4 py-1.5 rounded-lg bg-[#e6b43c] hover:bg-[#f2c652] text-[#17120a] text-xs font-extrabold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>입장</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Fixed Footer with Prominent "맵 만들기" Button */}
            <div className="px-5 py-4 border-t border-white/10 bg-[#0d131d] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep('main')}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#182130] hover:bg-[#223044] border border-white/12 text-xs font-semibold text-[#cbd5e1] cursor-pointer whitespace-nowrap"
              >
                뒤로
              </button>
              <button
                type="button"
                onClick={openCreateScreen}
                className="flex-1 sm:flex-none min-h-[46px] px-7 py-2.5 rounded-xl bg-[#e6b43c] hover:bg-[#f2c652] active:scale-[0.98] text-[#17120a] text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4 stroke-[2.6]" />
                <span>맵 만들기</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'create' && (
        /* ==================== STEP 3: CREATE NEW WORLD (MODE + MULTIPLAYER CODE + CLASS) ==================== */
        <div
          className="relative z-10 w-full h-full overflow-y-auto flex items-start sm:items-center pointer-events-auto"
          style={{
            paddingTop: 'max(14px, env(safe-area-inset-top))',
            paddingBottom: 'max(14px, env(safe-area-inset-bottom))',
          }}
        >
          <form
            onSubmit={handleCreateSubmit}
            className="w-full max-w-[610px] pl-4 sm:pl-10 pr-4 py-4 my-auto flex flex-col gap-3.5"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setStep('worlds')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161e29]/92 hover:bg-[#202c3d] border border-white/12 text-xs font-semibold text-[#cbd5e1] transition-colors cursor-pointer whitespace-nowrap"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>월드 리스트로</span>
              </button>
              <span className="text-xs font-semibold text-[#e6b43c] whitespace-nowrap">
                새 맵 설정
              </span>
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#f7f3ea] tracking-tight">
                맵 만들기
              </h2>
              <p className="text-xs text-[#94a3b8] mt-0.5">
                게임 모드, 멀티플레이 코드, 시작 직업을 정하고 월드를 생성하세요
              </p>
            </div>

            {/* 1. World Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#cbd5e1]">월드 이름</label>
              <input
                type="text"
                value={worldName}
                maxLength={28}
                onChange={(e) => setWorldName(e.target.value)}
                placeholder="월드 이름을 입력하세요"
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-[#121923]/94 border border-white/15 text-sm font-semibold text-[#f7f3ea] placeholder:text-[#64748b] focus:outline-none focus:border-[#e6b43c]"
              />
            </div>

            {/* 2. Game Mode Selection: Survival vs Creative */}
            <div className="space-y-1.5">
              <span className="block text-xs font-semibold text-[#cbd5e1]">게임 모드</span>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setGameMode('survival')}
                  className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer space-y-1 ${
                    gameMode === 'survival'
                      ? 'bg-[#172821] border-[#4ade80] shadow-md'
                      : 'bg-[#121923]/90 hover:bg-[#192230] border-white/12'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Swords
                      className={`w-4 h-4 shrink-0 ${
                        gameMode === 'survival' ? 'text-[#4ade80]' : 'text-[#94a3b8]'
                      }`}
                    />
                    <span
                      className={`text-sm font-bold whitespace-nowrap ${
                        gameMode === 'survival' ? 'text-[#86efac]' : 'text-[#e2e8f0]'
                      }`}
                    >
                      서바이벌
                    </span>
                  </div>
                  <p className="text-[11px] text-[#94a3b8] leading-snug">
                    기존과 동일한 생존 탐험 · 체력/배고픔/기력 관리 및 몬스터 전투
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setGameMode('creative')}
                  className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer space-y-1 ${
                    gameMode === 'creative'
                      ? 'bg-[#162335] border-[#38bdf8] shadow-md'
                      : 'bg-[#121923]/90 hover:bg-[#192230] border-white/12'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <InfinityIcon
                      className={`w-4 h-4 shrink-0 ${
                        gameMode === 'creative' ? 'text-[#38bdf8]' : 'text-[#94a3b8]'
                      }`}
                    />
                    <span
                      className={`text-sm font-bold whitespace-nowrap ${
                        gameMode === 'creative' ? 'text-[#7dd3fc]' : 'text-[#e2e8f0]'
                      }`}
                    >
                      크리에이티브
                    </span>
                  </div>
                  <p className="text-[11px] text-[#94a3b8] leading-snug">
                    몹 비선공 · 체력/배고픔/달리기 무한 · 모든 아이템 &amp; 몹 생성알 9칸 바
                  </p>
                </button>
              </div>
            </div>

            {/* 3. Multiplayer Toggle + Room Code */}
            <div className="rounded-xl bg-[#121923]/92 border border-white/12 p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#cbd5e1]">멀티플레이 설정</span>
                {!isOnline && (
                  <span className="text-[11px] text-[#fbbf24]">현재 오프라인 상태</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsMultiplayer(false)}
                  className={`min-h-[40px] px-3 py-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    !isMultiplayer
                      ? 'bg-[#222d3e] border-[#facc15] text-[#fef08a]'
                      : 'bg-[#161e2a] hover:bg-[#1d2736] border-white/10 text-[#94a3b8]'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>싱글플레이 (혼자)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMultiplayer(true);
                    if (!roomCode.trim()) setRoomCode(generateRandomRoomCode());
                  }}
                  className={`min-h-[40px] px-3 py-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    isMultiplayer
                      ? 'bg-[#132c2a] border-[#38f2c8] text-[#5df7d4]'
                      : 'bg-[#161e2a] hover:bg-[#1d2736] border-white/10 text-[#94a3b8]'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>멀티플레이 (함께)</span>
                </button>
              </div>

              {isMultiplayer && (
                <div className="space-y-1.5 pt-1">
                  <label className="block text-[11px] font-medium text-[#94a3b8]">
                    멀티플레이 방 코드 (친구에게 이 코드를 공유하세요)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={roomCode}
                      maxLength={24}
                      onChange={(e) =>
                        setRoomCode(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))
                      }
                      placeholder="예: PAW-1234"
                      className="flex-1 min-h-[40px] px-3 py-1.5 rounded-lg bg-[#0d131c] border border-[#38f2c8]/40 text-sm font-mono-num font-bold tracking-wider text-[#5df7d4] placeholder:text-[#64748b] focus:outline-none focus:border-[#38f2c8]"
                    />
                    <button
                      type="button"
                      onClick={() => setRoomCode(generateRandomRoomCode())}
                      className="min-h-[40px] px-3 py-1.5 rounded-lg bg-[#1c2736] hover:bg-[#263447] border border-white/12 text-xs font-semibold text-[#e2e8f0] flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      title="새 코드 자동 생성"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>랜덤</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Class Selection (5 Classes with live 3D preview on the right) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#cbd5e1]">시작 직업</span>
                <span style={{ color: activeClass.accentHex }} className="font-bold">
                  {activeClass.name} · {activeClass.catTitle}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {CLASS_CATALOG.map((cls) => {
                  const isSelected = cls.id === selectedClass;
                  return (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => onPreviewClass(cls.id)}
                      className={`group relative rounded-xl overflow-hidden border transition-all cursor-pointer flex flex-col text-left ${
                        isSelected
                          ? 'bg-[#1a2433]/96 shadow-lg'
                          : 'bg-[#131a24]/86 hover:bg-[#192230]/94 border-white/10 opacity-80 hover:opacity-100'
                      }`}
                      style={
                        isSelected
                          ? {
                              borderColor: cls.accentHex,
                              boxShadow: `0 0 0 1px ${cls.accentHex}70`,
                            }
                          : undefined
                      }
                    >
                      <div className="relative w-full aspect-[4/4.4] bg-[#0e141d] overflow-hidden">
                        <img
                          src={cls.portraitUrl}
                          alt={`${cls.name} 초상화`}
                          className="absolute max-w-none transition-transform duration-200 group-hover:scale-105"
                          style={{
                            width: `${cls.portraitCrop.widthPct}%`,
                            height: 'auto',
                            left: `${cls.portraitCrop.leftPct}%`,
                            top: `${cls.portraitCrop.topPct}%`,
                          }}
                        />
                        <span
                          className="absolute top-1 right-1 w-5 h-5 rounded-md bg-[#0e141d]/85 border border-white/15 flex items-center justify-center"
                          aria-hidden="true"
                        >
                          {renderClassIcon(cls.id, cls.accentHex)}
                        </span>
                      </div>
                      <div className="px-1 py-1 text-center">
                        <span
                          className="text-[11px] font-bold whitespace-nowrap"
                          style={{ color: isSelected ? cls.accentHex : '#f3efe6' }}
                        >
                          {cls.name}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Nickname & Submit ("만들기") */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <label className="relative flex-1 flex items-center">
                <User className="w-4 h-4 text-[#94a3b8] absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={nickname}
                  maxLength={20}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="모험가 닉네임 입력"
                  className="w-full min-h-[44px] pl-9 pr-3 py-2 rounded-xl bg-[#121923]/94 border border-white/15 text-sm font-semibold text-[#f7f3ea] placeholder:text-[#64748b] focus:outline-none focus:border-[#e6b43c]"
                />
              </label>

              <button
                type="submit"
                className="min-h-[46px] px-7 py-2.5 rounded-xl bg-[#e6b43c] hover:bg-[#f2c652] active:scale-[0.98] text-[#17120a] font-extrabold text-sm tracking-wide transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Sparkles className="w-4 h-4" />
                <span>만들기</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
