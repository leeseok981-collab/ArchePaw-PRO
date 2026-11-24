import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Check,
  LogIn,
  LogOut,
  Upload,
  User as UserIcon,
  WifiOff,
  X,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  PRESET_AVATARS,
  UserProfile,
  compressAvatarImageFile,
} from '../game/userConfig';

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  isOnline: boolean;
  firebaseUser: User | null;
  authBusy: boolean;
  profile: UserProfile;
  onSaveProfile: (next: UserProfile) => void;
  onSignInGoogle: () => void;
  onSignOutGoogle: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  open,
  onClose,
  isOnline,
  firebaseUser,
  authBusy,
  profile,
  onSaveProfile,
  onSignInGoogle,
  onSignOutGoogle,
}) => {
  const [nickname, setNickname] = useState(profile.nickname);
  const [avatarData, setAvatarData] = useState(profile.avatarData);
  const [avatarKind, setAvatarKind] = useState(profile.avatarKind);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setNickname(profile.nickname);
      setAvatarData(profile.avatarData);
      setAvatarKind(profile.avatarKind);
      setUploadError(null);
      setSavedNotice(false);
    }
  }, [open, profile]);

  if (!open) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setUploadError(null);
      const compressed = await compressAvatarImageFile(file);
      setAvatarData(compressed);
      setAvatarKind('upload');
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : '이미지 처리 중 오류가 발생했습니다.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = nickname.replace(/[\u0000-\u001F\u007F<>]/g, '').trim().slice(0, 20);
    if (!cleanName) {
      setUploadError('닉네임을 1자 이상 입력해 주세요.');
      return;
    }
    onSaveProfile({
      nickname: cleanName,
      avatarData: avatarData || PRESET_AVATARS[0].src,
      avatarKind,
    });
    setSavedNotice(true);
    window.setTimeout(() => {
      setSavedNotice(false);
      onClose();
    }, 550);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-5"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[520px] max-h-[88dvh] flex flex-col rounded-2xl bg-[#10161f]/98 border border-white/14 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-[#141c27]">
          <div className="flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-[#facc15]" />
            <h2 className="text-base font-bold text-[#f8f5ee]">프로필 · 계정 설정</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="프로필 창 닫기"
            className="w-8 h-8 rounded-lg bg-[#1c2635] hover:bg-[#273448] text-[#cbd5e1] flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Google Account Sync Section */}
          <div className="p-3.5 rounded-xl bg-[#141c27] border border-white/10 flex flex-wrap items-center justify-between gap-3">
            {firebaseUser ? (
              <>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#5df7d4]">Google 계정 연동됨</div>
                  <div className="text-[11px] text-[#94a3b8] truncate">
                    {firebaseUser.email || firebaseUser.displayName}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={authBusy}
                  onClick={onSignOutGoogle}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#281b21] hover:bg-[#38232d] border border-[#f87171]/35 text-xs font-semibold text-[#fca5a5] cursor-pointer whitespace-nowrap"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>로그아웃</span>
                </button>
              </>
            ) : (
              <>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#f8f5ee]">Google 계정 로그인</div>
                  <div className="text-[11px] text-[#94a3b8]">
                    {isOnline
                      ? '로그인 시 프로필·서버 목록·기록이 클라우드에 동기화됩니다'
                      : '오프라인 상태입니다. 프로필은 기기에 로컬 저장됩니다'}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!isOnline || authBusy}
                  onClick={onSignInGoogle}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#f8f5ee] hover:bg-white disabled:bg-[#26303d] disabled:text-[#64748b] text-[#111827] text-xs font-bold cursor-pointer whitespace-nowrap"
                >
                  {isOnline ? <LogIn className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                  <span>{authBusy ? '연결 중...' : 'Google 로그인'}</span>
                </button>
              </>
            )}
          </div>

          {/* Avatar Preview & File Upload */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-[#e6b43c] bg-[#182230] shrink-0 shadow-lg">
              {avatarData ? (
                <img
                  src={avatarData}
                  alt="프로필 사진 미리보기"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#64748b]">
                  <Camera className="w-8 h-8" />
                </div>
              )}
            </div>

            <div className="flex-1 w-full space-y-2.5 text-center sm:text-left">
              <div className="text-xs font-semibold text-[#e2e8f0]">프로필 사진 지정</div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#e6b43c] hover:bg-[#f2c652] text-[#17120a] text-xs font-bold cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>파일에서 이미지 넣기</span>
                </button>

                {firebaseUser?.photoURL && (
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarData(firebaseUser.photoURL || PRESET_AVATARS[0].src);
                      setAvatarKind('google');
                    }}
                    className="px-3 py-2 rounded-lg bg-[#1c2838] hover:bg-[#26354a] border border-white/12 text-xs text-[#dbe3ec] cursor-pointer"
                  >
                    Google 프사 사용
                  </button>
                )}
              </div>
              <p className="text-[11px] text-[#94a3b8]">
                JPG, PNG, WEBP 이미지를 자동으로 정사각형 최적화하여 저장합니다
              </p>
            </div>
          </div>

          {/* Preset Avatars */}
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-[#94a3b8]">기본 캐릭터 초상화 선택</div>
            <div className="grid grid-cols-5 gap-2">
              {PRESET_AVATARS.map((preset) => {
                const selected = avatarData === preset.src;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setAvatarData(preset.src);
                      setAvatarKind('preset');
                    }}
                    title={preset.label}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                      selected
                        ? 'border-[#facc15] scale-[1.03]'
                        : 'border-white/12 hover:border-white/35 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img src={preset.src} alt={preset.label} className="w-full h-full object-cover" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nickname Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#e2e8f0]">닉네임 (최대 20자)</label>
            <input
              type="text"
              value={nickname}
              maxLength={20}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="모험가 닉네임을 입력하세요"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b1017] border border-white/14 text-sm font-semibold text-[#f8f5ee] focus:outline-none focus:border-[#e6b43c]"
            />
          </div>

          {uploadError && <p className="text-xs text-[#fca5a5]">{uploadError}</p>}

          {/* Save Button */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#1c2533] hover:bg-[#253244] text-xs font-semibold text-[#cbd5e1] cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#38f2c8] hover:bg-[#5df7d4] text-[#0b1b17] text-xs font-bold cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{savedNotice ? '저장됨!' : '프로필 저장'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
