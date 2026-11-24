import React, { useRef, useState } from 'react';
import {
  Cpu,
  Database,
  Download,
  Gamepad2,
  Gauge,
  LogOut,
  Music,
  RotateCcw,
  Save,
  Sliders,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  GameSettings,
  OptimizationPreset,
  ParticleDensityLevel,
  ShadowQuality,
  ViewDistanceLevel,
  detectCompactMobile,
  getPresetSettings,
} from '../game/userConfig';
import { SaveMetaSummary } from '../game/types';

export type SettingsTab = 'performance' | 'audio' | 'controls' | 'data';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (next: GameSettings) => void;
  muted: boolean;
  bgmEnabled: boolean;
  onToggleMute: () => void;
  onToggleBgm: () => void;
  mobileTouchEnabled: boolean;
  onToggleMobileTouch: () => void;
  autoEquipTool?: boolean;
  onToggleAutoEquip?: () => void;
  isInGame: boolean;
  saveSummary: SaveMetaSummary | null;
  onSaveGame?: () => void;
  onExportSave?: () => string;
  onImportSave?: (raw: string) => boolean;
  onResetSave?: () => void;
  onReturnToTitle?: () => void;
  currentFps?: number;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  onClose,
  settings,
  onUpdateSettings,
  muted,
  bgmEnabled,
  onToggleMute,
  onToggleBgm,
  mobileTouchEnabled,
  onToggleMobileTouch,
  autoEquipTool,
  onToggleAutoEquip,
  isInGame,
  saveSummary,
  onSaveGame,
  onExportSave,
  onImportSave,
  onResetSave,
  onReturnToTitle,
  currentFps,
}) => {
  const [tab, setTab] = useState<SettingsTab>('performance');
  const [confirmReset, setConfirmReset] = useState(false);
  const [dataNotice, setDataNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!open) return null;

  const patch = (partial: Partial<GameSettings>) => {
    onUpdateSettings({ ...settings, ...partial });
  };

  const applyPreset = (preset: OptimizationPreset) => {
    const base = getPresetSettings(preset, detectCompactMobile());
    onUpdateSettings({
      ...base,
      cameraSensitivity: settings.cameraSensitivity,
      masterVolume: settings.masterVolume,
      bgmVolume: settings.bgmVolume,
      sfxVolume: settings.sfxVolume,
      showFps: settings.showFps,
      mobileUiScale: settings.mobileUiScale,
    });
  };

  const handleExport = () => {
    if (!onExportSave) return;
    const raw = onExportSave();
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `archepaw-save-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setDataNotice('월드 백업 파일(.json)을 다운로드했습니다.');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImportSave) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ok = onImportSave(String(reader.result || ''));
      setDataNotice(ok ? '백업 데이터를 성공적으로 복원했습니다.' : '유효하지 않은 백업 파일입니다.');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-5"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[680px] max-h-[88dvh] flex flex-col rounded-2xl bg-[#10161f]/98 border border-white/14 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-[#141c27]">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-[#facc15]" />
            <div>
              <h2 className="text-base font-bold text-[#f8f5ee] leading-tight">환경 설정 · 최적화</h2>
              <p className="text-[11px] text-[#94a3b8]">
                그래픽·성능 최적화, 사운드, 조작 및 저장 데이터를 세부 조정합니다
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {typeof currentFps === 'number' && (
              <span className="px-2 py-0.5 rounded bg-[#182230] border border-white/10 text-[11px] font-mono-num text-[#7dd3fc]">
                {currentFps} FPS
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="설정 닫기"
              className="w-8 h-8 rounded-lg bg-[#1c2635] hover:bg-[#273448] text-[#cbd5e1] flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="grid grid-cols-4 gap-1 px-3 py-2 bg-[#0d121a] border-b border-white/8">
          {(
            [
              { id: 'performance', label: '최적화', icon: Gauge },
              { id: 'audio', label: '오디오', icon: Music },
              { id: 'controls', label: '조작·UI', icon: Gamepad2 },
              { id: 'data', label: '데이터', icon: Database },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-[#e6b43c] text-[#17120a]'
                    : 'bg-[#151d28] hover:bg-[#1e2938] text-[#b8c4d4]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {tab === 'performance' && (
            <>
              {/* Quick Optimization Presets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#e2e8f0] flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-[#38f2c8]" />
                    원클릭 최적화 프리셋
                  </span>
                  <span className="text-[11px] text-[#94a3b8]">렉이 심하면 초경량 추천</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      {
                        id: 'ultra_low',
                        title: '초경량 (최대 FPS)',
                        desc: '그림자·입자 OFF · 해상도 65~75%',
                      },
                      {
                        id: 'balanced',
                        title: '쾌적 균형 (추천)',
                        desc: '적정 시야·가벼운 효과 · 안정 60FPS',
                      },
                      {
                        id: 'high',
                        title: '고화질',
                        desc: '선명한 그림자·풍부한 식생·원거리',
                      },
                    ] as Array<{ id: OptimizationPreset; title: string; desc: string }>
                  ).map((p) => {
                    const active = settings.preset === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => applyPreset(p.id)}
                        className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#1c2b3a] border-[#facc15] text-[#fef08a]'
                            : 'bg-[#151d28] hover:bg-[#1b2534] border-white/10 text-[#cbd5e1]'
                        }`}
                      >
                        <div className="text-xs font-bold leading-snug">{p.title}</div>
                        <div className="text-[10px] text-[#94a3b8] mt-0.5 leading-snug">{p.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Resolution Scale */}
              <div className="p-3.5 rounded-xl bg-[#141c27] border border-white/8 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#e2e8f0]">렌더 해상도 배율 (GPU 부하 감소)</span>
                  <span className="font-mono-num font-bold text-[#7dd3fc]">
                    {Math.round(settings.resolutionScale * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.55}
                  max={1.5}
                  step={0.05}
                  value={settings.resolutionScale}
                  onChange={(e) => patch({ resolutionScale: parseFloat(e.target.value) })}
                  className="w-full accent-[#e6b43c] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#64748b]">
                  <span>55% (초경량)</span>
                  <span>100% (표준)</span>
                  <span>150% (선명)</span>
                </div>
              </div>

              {/* Shadows & View Distance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-[#141c27] border border-white/8 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#e2e8f0]">실시간 그림자</span>
                    <button
                      type="button"
                      onClick={() => patch({ shadowsEnabled: !settings.shadowsEnabled })}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer ${
                        settings.shadowsEnabled
                          ? 'bg-[#183834] text-[#5df7d4] border border-[#38f2c8]/50'
                          : 'bg-[#222a36] text-[#94a3b8]'
                      }`}
                    >
                      {settings.shadowsEnabled ? '켜짐' : '꺼짐 (빠름)'}
                    </button>
                  </div>
                  {settings.shadowsEnabled && (
                    <div className="grid grid-cols-3 gap-1">
                      {(
                        [
                          { id: 'low', label: '낮음' },
                          { id: 'medium', label: '중간' },
                          { id: 'high', label: '높음' },
                        ] as Array<{ id: ShadowQuality; label: string }>
                      ).map((q) => (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => patch({ shadowQuality: q.id })}
                          className={`py-1 rounded text-[11px] font-semibold cursor-pointer ${
                            settings.shadowQuality === q.id
                              ? 'bg-[#e6b43c] text-[#17120a]'
                              : 'bg-[#1e2736] text-[#cbd5e1] hover:bg-[#283447]'
                          }`}
                        >
                          {q.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-[#141c27] border border-white/8 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#e2e8f0]">시야 · 렌더 거리</span>
                    <span className="text-[10px] text-[#94a3b8]">원거리 자동 컬링</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {(
                      [
                        { id: 'near', label: '근거리' },
                        { id: 'medium', label: '중거리' },
                        { id: 'far', label: '원거리' },
                      ] as Array<{ id: ViewDistanceLevel; label: string }>
                    ).map((vd) => (
                      <button
                        key={vd.id}
                        type="button"
                        onClick={() => patch({ viewDistance: vd.id })}
                        className={`py-1.5 rounded text-[11px] font-semibold cursor-pointer ${
                          settings.viewDistance === vd.id
                            ? 'bg-[#e6b43c] text-[#17120a]'
                            : 'bg-[#1e2736] text-[#cbd5e1] hover:bg-[#283447]'
                        }`}
                      >
                        {vd.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Grass & Particles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-[#141c27] border border-white/8 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#e2e8f0]">초원 풀 · 식생 밀도</span>
                    <span className="font-mono-num text-[#86efac]">
                      {Math.round(settings.grassDensity * 100)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { v: 0, label: '끄기' },
                      { v: 0.25, label: '낮음' },
                      { v: 0.6, label: '보통' },
                      { v: 1, label: '풍부' },
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => patch({ grassDensity: opt.v })}
                        className={`py-1 rounded text-[11px] font-semibold cursor-pointer ${
                          Math.abs(settings.grassDensity - opt.v) < 0.12
                            ? 'bg-[#e6b43c] text-[#17120a]'
                            : 'bg-[#1e2736] text-[#cbd5e1] hover:bg-[#283447]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#141c27] border border-white/8 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#e2e8f0]">날씨 · 입자 밀도</span>
                    <span className="text-[10px] text-[#94a3b8]">비·눈·낙엽·안개</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {(
                      [
                        { id: 'off', label: '끄기' },
                        { id: 'low', label: '낮음' },
                        { id: 'medium', label: '보통' },
                        { id: 'high', label: '높음' },
                      ] as Array<{ id: ParticleDensityLevel; label: string }>
                    ).map((lv) => (
                      <button
                        key={lv.id}
                        type="button"
                        onClick={() => patch({ particlesLevel: lv.id })}
                        className={`py-1 rounded text-[11px] font-semibold cursor-pointer ${
                          settings.particlesLevel === lv.id
                            ? 'bg-[#e6b43c] text-[#17120a]'
                            : 'bg-[#1e2736] text-[#cbd5e1] hover:bg-[#283447]'
                        }`}
                      >
                        {lv.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* FPS Limit & Toggles */}
              <div className="p-3.5 rounded-xl bg-[#141c27] border border-white/8 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#e2e8f0]">목표 프레임 제한 (발열·렉 방지)</span>
                  <div className="flex items-center gap-1">
                    {([30, 60, 0] as const).map((cap) => (
                      <button
                        key={cap}
                        type="button"
                        onClick={() => patch({ fpsLimit: cap })}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer whitespace-nowrap ${
                          settings.fpsLimit === cap
                            ? 'bg-[#e6b43c] text-[#17120a]'
                            : 'bg-[#1e2736] text-[#cbd5e1] hover:bg-[#283447]'
                        }`}
                      >
                        {cap === 0 ? '무제한' : `${cap} FPS`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-white/8">
                  <button
                    type="button"
                    onClick={() => patch({ distanceLod: !settings.distanceLod })}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs cursor-pointer ${
                      settings.distanceLod
                        ? 'bg-[#152d2a] border-[#38f2c8]/45 text-[#5df7d4]'
                        : 'bg-[#1a222d] border-white/10 text-[#94a3b8]'
                    }`}
                  >
                    <span>원거리 AI 절전</span>
                    <span className="font-bold">{settings.distanceLod ? 'ON' : 'OFF'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => patch({ weatherEffects: !settings.weatherEffects })}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs cursor-pointer ${
                      settings.weatherEffects
                        ? 'bg-[#152d2a] border-[#38f2c8]/45 text-[#5df7d4]'
                        : 'bg-[#1a222d] border-white/10 text-[#94a3b8]'
                    }`}
                  >
                    <span>바람·날씨 효과</span>
                    <span className="font-bold">{settings.weatherEffects ? 'ON' : 'OFF'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => patch({ showFps: !settings.showFps })}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs cursor-pointer ${
                      settings.showFps
                        ? 'bg-[#1a2c3c] border-[#62e5ff]/45 text-[#7dd3fc]'
                        : 'bg-[#1a222d] border-white/10 text-[#94a3b8]'
                    }`}
                  >
                    <span>FPS 표시</span>
                    <span className="font-bold">{settings.showFps ? 'ON' : 'OFF'}</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {tab === 'audio' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={onToggleMute}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-semibold cursor-pointer ${
                    muted
                      ? 'bg-[#2c191e] border-[#f87171]/45 text-[#fca5a5]'
                      : 'bg-[#142a28] border-[#38f2c8]/40 text-[#5df7d4]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    <span>전체 사운드</span>
                  </span>
                  <span>{muted ? '음소거됨' : '켜짐'}</span>
                </button>

                <button
                  type="button"
                  onClick={onToggleBgm}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-semibold cursor-pointer ${
                    bgmEnabled && !muted
                      ? 'bg-[#172838] border-[#62e5ff]/45 text-[#7dd3fc]'
                      : 'bg-[#1a222d] border-white/10 text-[#94a3b8]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Music className="w-4 h-4" />
                    <span>배경음악 (BGM)</span>
                  </span>
                  <span>{bgmEnabled ? '켜짐' : '꺼짐'}</span>
                </button>
              </div>

              {(
                [
                  { key: 'masterVolume', label: '마스터 볼륨', value: settings.masterVolume },
                  { key: 'bgmVolume', label: '배경음악 (BGM) 크기', value: settings.bgmVolume },
                  { key: 'sfxVolume', label: '효과음 · 환경음 크기', value: settings.sfxVolume },
                ] as const
              ).map((row) => (
                <div
                  key={row.key}
                  className="p-3.5 rounded-xl bg-[#141c27] border border-white/8 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#e2e8f0]">{row.label}</span>
                    <span className="font-mono-num font-bold text-[#fde68a]">
                      {Math.round(row.value * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={row.value}
                    onChange={(e) => patch({ [row.key]: parseFloat(e.target.value) })}
                    className="w-full accent-[#e6b43c] cursor-pointer"
                  />
                </div>
              ))}
            </div>
          )}

          {tab === 'controls' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-[#141c27] border border-white/8 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#e2e8f0]">카메라 회전 감도</span>
                  <span className="font-mono-num font-bold text-[#7dd3fc]">
                    {settings.cameraSensitivity.toFixed(2)}×
                  </span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={2.0}
                  step={0.05}
                  value={settings.cameraSensitivity}
                  onChange={(e) => patch({ cameraSensitivity: parseFloat(e.target.value) })}
                  className="w-full accent-[#e6b43c] cursor-pointer"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-[#141c27] border border-white/8 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-[#e2e8f0]">모바일 터치 조작 패드</div>
                  <div className="text-[11px] text-[#94a3b8]">
                    가상 조이스틱과 우측 스킬·액션 버튼을 표시합니다
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onToggleMobileTouch}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap ${
                    mobileTouchEnabled
                      ? 'bg-[#173634] border border-[#38f2c8]/50 text-[#5df7d4]'
                      : 'bg-[#1e2736] text-[#94a3b8]'
                  }`}
                >
                  {mobileTouchEnabled ? '켜짐' : '꺼짐'}
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-[#141c27] border border-white/8 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-[#e2e8f0]">모바일 HUD 크기 · 여백 최적화</div>
                  <div className="text-[11px] text-[#94a3b8]">
                    작은 화면에서 하단 잘림과 버튼 겹침을 방지합니다
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {(
                    [
                      { id: 'compact', label: '컴팩트' },
                      { id: 'normal', label: '표준' },
                    ] as const
                  ).map((sz) => (
                    <button
                      key={sz.id}
                      type="button"
                      onClick={() => patch({ mobileUiScale: sz.id })}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap ${
                        settings.mobileUiScale === sz.id
                          ? 'bg-[#e6b43c] text-[#17120a]'
                          : 'bg-[#1e2736] text-[#cbd5e1]'
                      }`}
                    >
                      {sz.label}
                    </button>
                  ))}
                </div>
              </div>

              {typeof autoEquipTool === 'boolean' && onToggleAutoEquip && (
                <div className="p-3.5 rounded-xl bg-[#141c27] border border-white/8 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-[#e2e8f0]">상황별 최적 도구 자동 장착</div>
                    <div className="text-[11px] text-[#94a3b8]">
                      나무·바위·몬스터 접근 시 보유한 알맞은 무기로 자동 전환합니다
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onToggleAutoEquip}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap ${
                      autoEquipTool
                        ? 'bg-[#1a3342] border border-[#62e5ff]/50 text-[#7dd3fc]'
                        : 'bg-[#1e2736] text-[#94a3b8]'
                    }`}
                  >
                    {autoEquipTool ? '켜짐' : '꺼짐'}
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === 'data' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-[#141c27] border border-white/8 space-y-1.5">
                <div className="text-xs font-semibold text-[#e2e8f0]">로컬 월드 저장 상태 (오프라인 지원)</div>
                {saveSummary ? (
                  <p className="text-xs text-[#94a3b8]">
                    Lv.{saveSummary.level} · Tier {saveSummary.worldTier} · 건축 타일{' '}
                    {saveSummary.housingCount}개 · 최근 저장{' '}
                    {new Date(saveSummary.savedAt).toLocaleString('ko-KR')}
                  </p>
                ) : (
                  <p className="text-xs text-[#64748b]">저장된 월드 기록이 아직 없습니다.</p>
                )}
              </div>

              {dataNotice && (
                <div className="px-3 py-2 rounded-lg bg-[#152d2a] border border-[#38f2c8]/40 text-xs text-[#5df7d4]">
                  {dataNotice}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {isInGame && onSaveGame && (
                  <button
                    type="button"
                    onClick={() => {
                      onSaveGame();
                      setDataNotice('현재 월드와 하우징 상태를 로컬에 저장했습니다.');
                    }}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#183834] hover:bg-[#1f4944] border border-[#38f2c8]/45 text-xs font-bold text-[#5df7d4] cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>지금 월드 저장하기</span>
                  </button>
                )}

                {onExportSave && (
                  <button
                    type="button"
                    onClick={handleExport}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#1a2433] hover:bg-[#233145] border border-white/12 text-xs font-semibold text-[#e2e8f0] cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-[#7dd3fc]" />
                    <span>백업 내보내기 (.json)</span>
                  </button>
                )}

                {onImportSave && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,application/json"
                      className="hidden"
                      onChange={handleImport}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#1a2433] hover:bg-[#233145] border border-white/12 text-xs font-semibold text-[#e2e8f0] cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-[#fde68a]" />
                      <span>백업 불러오기 (.json)</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => applyPreset(detectCompactMobile() ? 'ultra_low' : 'balanced')}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#1a2433] hover:bg-[#233145] border border-white/12 text-xs font-semibold text-[#cbd5e1] cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>설정 기본값 복원</span>
                </button>
              </div>

              {onResetSave && (
                <div className="pt-2 border-t border-white/10">
                  {!confirmReset ? (
                    <button
                      type="button"
                      onClick={() => setConfirmReset(true)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#2a171c] hover:bg-[#3a1f26] border border-[#f87171]/35 text-xs font-semibold text-[#fca5a5] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>저장된 월드 초기화</span>
                    </button>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[#2a171c] border border-[#f87171]/45">
                      <span className="text-xs text-[#fecaca]">
                        정말 저장된 월드 데이터를 모두 초기화할까요?
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onResetSave();
                            setConfirmReset(false);
                            setDataNotice('월드 데이터를 초기화했습니다.');
                          }}
                          className="px-3 py-1 rounded bg-[#ef4444] text-white text-xs font-bold cursor-pointer"
                        >
                          초기화 확인
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmReset(false)}
                          className="px-3 py-1 rounded bg-[#1f2937] text-[#cbd5e1] text-xs cursor-pointer"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3 border-t border-white/10 bg-[#0d121a] flex items-center justify-between gap-2">
          {isInGame && onReturnToTitle ? (
            <button
              type="button"
              onClick={onReturnToTitle}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2a1d24] hover:bg-[#3b2630] border border-[#f87171]/40 text-[#fecaca] text-xs font-bold cursor-pointer whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5 text-[#f87171]" />
              <span>메인 메뉴로 나가기</span>
            </button>
          ) : (
            <span className="text-[11px] text-[#64748b]">모든 설정은 즉시 적용 및 자동 저장됩니다</span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#e6b43c] hover:bg-[#f0c451] text-[#17120a] text-xs font-bold cursor-pointer"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};
