import React, { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Clock,
  Copy,
  Globe,
  History,
  Play,
  Plus,
  RefreshCw,
  Server,
  Trash2,
  WifiOff,
  X,
  Zap,
} from 'lucide-react';
import {
  PlayHistoryEntry,
  SavedServerEntry,
  sanitizeRoomCode,
} from '../game/userConfig';

type MultiplayerTab = 'servers' | 'direct' | 'history';

interface ServerPingInfo {
  checking: boolean;
  reachable: boolean;
  playerCount: number;
}

interface MultiplayerModalProps {
  open: boolean;
  onClose: () => void;
  isOnline: boolean;
  currentRoomId: string;
  savedServers: SavedServerEntry[];
  playHistory: PlayHistoryEntry[];
  onAddServer: (name: string, code: string) => void;
  onDeleteServer: (serverId: string) => void;
  onJoinSavedServer: (server: SavedServerEntry) => void;
  onDirectConnect: (code: string) => void;
  onDeleteHistoryEntry: (entryId: string) => void;
}

export const MultiplayerModal: React.FC<MultiplayerModalProps> = ({
  open,
  onClose,
  isOnline,
  currentRoomId,
  savedServers,
  playHistory,
  onAddServer,
  onDeleteServer,
  onJoinSavedServer,
  onDirectConnect,
  onDeleteHistoryEntry,
}) => {
  const [tab, setTab] = useState<MultiplayerTab>('servers');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [newServerCode, setNewServerCode] = useState('');
  const [directCode, setDirectCode] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pingMap, setPingMap] = useState<Record<string, ServerPingInfo>>({});

  const refreshPings = useCallback(async () => {
    if (!isOnline || savedServers.length === 0) return;
    const nextInit: Record<string, ServerPingInfo> = {};
    for (const s of savedServers) {
      nextInit[s.id] = { checking: true, reachable: false, playerCount: 0 };
    }
    setPingMap(nextInit);

    await Promise.all(
      savedServers.map(async (srv) => {
        try {
          const res = await fetch(`/api/rooms/${encodeURIComponent(srv.code)}`);
          if (!res.ok) throw new Error('status');
          const data = (await res.json()) as { playerCount?: number };
          setPingMap((prev) => ({
            ...prev,
            [srv.id]: {
              checking: false,
              reachable: true,
              playerCount: typeof data.playerCount === 'number' ? data.playerCount : 0,
            },
          }));
        } catch {
          setPingMap((prev) => ({
            ...prev,
            [srv.id]: { checking: false, reachable: false, playerCount: 0 },
          }));
        }
      }),
    );
  }, [isOnline, savedServers]);

  useEffect(() => {
    if (open && tab === 'servers' && isOnline) {
      void refreshPings();
    }
  }, [open, tab, isOnline, refreshPings]);

  if (!open) return null;

  const handleSaveNewServer = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newServerName.trim().slice(0, 32);
    const code = sanitizeRoomCode(newServerCode);
    if (!name) {
      setFormError('서버 저장 이름을 입력해 주세요.');
      return;
    }
    if (!code) {
      setFormError('올바른 서버 코드(영문/숫자/-/_) 또는 공유 링크를 입력해 주세요.');
      return;
    }
    setFormError(null);
    onAddServer(name, code);
    setNewServerName('');
    setNewServerCode('');
    setShowAddForm(false);
  };

  const handleDirectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOnline) {
      setFormError('오프라인 상태에서는 멀티플레이 서버에 접속할 수 없습니다.');
      return;
    }
    const code = sanitizeRoomCode(directCode);
    if (!code) {
      setFormError('접속할 서버 코드(영문/숫자/-/_)를 입력해 주세요.');
      return;
    }
    setFormError(null);
    setDirectCode('');
    onDirectConnect(code);
    onClose();
  };

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopiedId(id);
    window.setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1600);
  };

  const formatTimeAgo = (ts: number) => {
    if (!ts) return '접속 기록 없음';
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(
      d.getMinutes(),
    ).padStart(2, '0')}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-5"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[660px] max-h-[88dvh] flex flex-col rounded-2xl bg-[#10161f]/98 border border-white/14 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-[#141c27]">
          <div className="flex items-center gap-2.5">
            <Globe className="w-5 h-5 text-[#38f2c8]" />
            <div>
              <h2 className="text-base font-bold text-[#f8f5ee] leading-tight">멀티플레이 서버</h2>
              <p className="text-[11px] text-[#94a3b8]">
                서버 목록 저장 · 코드 직접 연결 · 플레이 기록 관리
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="멀티플레이 닫기"
            className="w-8 h-8 rounded-lg bg-[#1c2635] hover:bg-[#273448] text-[#cbd5e1] flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Offline Notice */}
        {!isOnline && (
          <div className="px-4 py-2.5 bg-[#2a1f14] border-b border-[#f59e0b]/35 flex items-center gap-2 text-xs text-[#fde68a]">
            <WifiOff className="w-4 h-4 shrink-0 text-[#f59e0b]" />
            <span>
              현재 오프라인 상태입니다. 저장된 서버 목록과 기록은 편집할 수 있으며, 인터넷 연결 시 바로 접속 가능합니다.
            </span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 gap-1.5 px-3 py-2 bg-[#0d121a] border-b border-white/8">
          <button
            type="button"
            onClick={() => {
              setTab('servers');
              setFormError(null);
            }}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              tab === 'servers'
                ? 'bg-[#e6b43c] text-[#17120a]'
                : 'bg-[#151d28] hover:bg-[#1e2938] text-[#b8c4d4]'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>서버 목록 ({savedServers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTab('direct');
              setFormError(null);
            }}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              tab === 'direct'
                ? 'bg-[#38f2c8] text-[#0b1b17]'
                : 'bg-[#151d28] hover:bg-[#1e2938] text-[#b8c4d4]'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>직접 연결</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTab('history');
              setFormError(null);
            }}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              tab === 'history'
                ? 'bg-[#62e5ff] text-[#0c1a24]'
                : 'bg-[#151d28] hover:bg-[#1e2938] text-[#b8c4d4]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>플레이 기록 ({playHistory.length})</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {tab === 'servers' && (
            <>
              {/* Action bar */}
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm((v) => !v);
                    setFormError(null);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#e6b43c] hover:bg-[#f1c450] text-[#17120a] text-xs font-bold cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{showAddForm ? '서버 추가 닫기' : '서버 추가'}</span>
                </button>

                <button
                  type="button"
                  disabled={!isOnline}
                  onClick={() => void refreshPings()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#182230] hover:bg-[#223044] disabled:opacity-45 border border-white/10 text-xs text-[#cbd5e1] cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>새로고침</span>
                </button>
              </div>

              {/* Add Server Form (Minecraft-style: Name + Code) */}
              {showAddForm && (
                <form
                  onSubmit={handleSaveNewServer}
                  className="p-4 rounded-xl bg-[#151f2c] border border-[#e6b43c]/45 space-y-3"
                >
                  <div className="text-xs font-bold text-[#fde68a]">새 서버 추가 (목록에 영구 저장)</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="block text-[11px] text-[#94a3b8]">서버 저장 이름</label>
                      <input
                        type="text"
                        value={newServerName}
                        maxLength={32}
                        onChange={(e) => setNewServerName(e.target.value)}
                        placeholder="예: 우리 길드 마을"
                        className="w-full px-3 py-2 rounded-lg bg-[#0c121a] border border-white/12 text-xs text-[#f8f5ee] focus:outline-none focus:border-[#e6b43c]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] text-[#94a3b8]">서버 코드 (또는 공유 링크)</label>
                      <input
                        type="text"
                        value={newServerCode}
                        maxLength={120}
                        onChange={(e) => setNewServerCode(e.target.value)}
                        placeholder="예: guild-777"
                        className="w-full px-3 py-2 rounded-lg bg-[#0c121a] border border-white/12 text-xs font-mono-num text-[#7dd3fc] focus:outline-none focus:border-[#38f2c8]"
                      />
                    </div>
                  </div>
                  {formError && <p className="text-[11px] text-[#fca5a5]">{formError}</p>}
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-3 py-1.5 rounded-lg bg-[#202b3a] text-xs text-[#cbd5e1] cursor-pointer"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-[#38f2c8] hover:bg-[#5df7d4] text-[#0b1b17] text-xs font-bold cursor-pointer"
                    >
                      리스트에 저장
                    </button>
                  </div>
                </form>
              )}

              {/* Saved Servers List */}
              {savedServers.length === 0 ? (
                <div className="py-10 text-center rounded-xl bg-[#131a24] border border-white/8 text-xs text-[#94a3b8]">
                  저장된 서버가 없습니다. 상단의 <span className="text-[#fde68a] font-semibold">서버 추가</span> 버튼으로 서버를 등록하세요.
                </div>
              ) : (
                <div className="space-y-2">
                  {savedServers.map((srv) => {
                    const ping = pingMap[srv.id];
                    const isCurrent = currentRoomId === srv.code;
                    return (
                      <div
                        key={srv.id}
                        className={`p-3.5 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isCurrent
                            ? 'bg-[#162735] border-[#38f2c8]/55'
                            : 'bg-[#141c27] hover:bg-[#192331] border-white/10'
                        }`}
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-[#f8f5ee] truncate">
                              {srv.name}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] font-semibold text-[#5df7d4] whitespace-nowrap">
                                · 현재 방
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#94a3b8]">
                            <span className="font-mono-num text-[#7dd3fc]">코드: {srv.code}</span>
                            <span>
                              {!isOnline
                                ? '오프라인'
                                : ping?.checking
                                  ? '상태 확인 중...'
                                  : ping?.reachable
                                    ? `온라인 · 접속 ${ping.playerCount}명`
                                    : '대기 중'}
                            </span>
                            <span className="text-[#64748b]">{formatTimeAgo(srv.lastPlayedAt)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopyCode(srv.id, srv.code)}
                            title="서버 코드 복사"
                            className="p-2 rounded-lg bg-[#1d2736] hover:bg-[#273549] text-[#cbd5e1] cursor-pointer"
                          >
                            {copiedId === srv.id ? (
                              <Check className="w-3.5 h-3.5 text-[#5df7d4]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => onDeleteServer(srv.id)}
                            title="목록에서 삭제"
                            className="p-2 rounded-lg bg-[#2a1920] hover:bg-[#3b212b] text-[#fca5a5] cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            disabled={!isOnline}
                            onClick={() => {
                              onJoinSavedServer(srv);
                              onClose();
                            }}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#38f2c8] hover:bg-[#5df7d4] disabled:bg-[#273342] disabled:text-[#64748b] text-[#0b1b17] text-xs font-bold cursor-pointer whitespace-nowrap"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>접속</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {tab === 'direct' && (
            <form
              onSubmit={handleDirectSubmit}
              className="p-4 sm:p-5 rounded-xl bg-[#141c27] border border-white/10 space-y-4"
            >
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#f8f5ee]">서버 코드로 직접 연결</h3>
                <p className="text-xs text-[#94a3b8] leading-relaxed">
                  코드를 입력해 바로 서버에 입장합니다. <strong className="text-[#7dd3fc]">서버 목록에는 추가되지 않으며</strong>,{' '}
                  <strong className="text-[#fde68a]">플레이 기록에만</strong> 자동으로 저장됩니다.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#cbd5e1]">
                  접속 코드 또는 공유 링크
                </label>
                <input
                  type="text"
                  value={directCode}
                  maxLength={120}
                  onChange={(e) => setDirectCode(e.target.value)}
                  placeholder="예: party-2026 또는 초대 링크 붙여넣기"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b1017] border border-white/14 text-sm font-mono-num text-[#7dd3fc] focus:outline-none focus:border-[#38f2c8]"
                />
              </div>

              {formError && <p className="text-xs text-[#fca5a5]">{formError}</p>}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!isOnline}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#38f2c8] hover:bg-[#5df7d4] disabled:bg-[#273342] disabled:text-[#64748b] text-[#0b1b17] text-xs font-bold cursor-pointer"
                >
                  <Zap className="w-4 h-4" />
                  <span>직접 연결하여 입장</span>
                </button>
              </div>
            </form>
          )}

          {tab === 'history' && (
            <>
              {playHistory.length === 0 ? (
                <div className="py-10 text-center rounded-xl bg-[#131a24] border border-white/8 text-xs text-[#94a3b8]">
                  아직 멀티플레이 접속 기록이 없습니다.
                </div>
              ) : (
                <div className="space-y-2">
                  {playHistory.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-[#141c27] border border-white/10 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#f8f5ee] truncate">
                            {item.directConnect
                              ? `직접 연결 · ${item.code}`
                              : item.serverName || item.code}
                          </span>
                          <span className="text-[10px] text-[#7dd3fc] whitespace-nowrap">
                            {item.directConnect ? '(목록 미저장)' : '(저장 서버)'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5 text-[11px] text-[#94a3b8]">
                          <span className="font-mono-num">코드: {item.code}</span>
                          <span className="flex items-center gap-1 text-[#64748b]">
                            <Clock className="w-3 h-3" />
                            {formatTimeAgo(item.playedAt)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onDeleteHistoryEntry(item.id)}
                          title="기록 삭제"
                          className="p-2 rounded-lg bg-[#2a1920] hover:bg-[#3b212b] text-[#fca5a5] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={!isOnline}
                          onClick={() => {
                            onDirectConnect(item.code);
                            onClose();
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#1d3448] hover:bg-[#274660] disabled:opacity-45 text-[#bae6fd] text-xs font-semibold cursor-pointer whitespace-nowrap"
                        >
                          재접속
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
