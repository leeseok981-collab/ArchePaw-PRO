import React from 'react';
import {
  X,
  Swords,
  Zap,
  Flame,
  Shield,
  Axe,
  Pickaxe,
  Hammer,
  ArrowUpCircle,
  Crosshair,
  Heart,
  Sparkles,
  Wand2,
} from 'lucide-react';
import {
  getClassSkillsCatalog,
  getClassSpec,
  HudSnapshot,
  PROFICIENCY_CATALOG,
  ProficiencyId,
  WarriorSkillId,
} from '../game/types';

interface MasteryModalProps {
  hud: HudSnapshot;
  onClose: () => void;
  onUpgradeSkill: (skillId: WarriorSkillId) => void;
}

export const MasteryModal: React.FC<MasteryModalProps> = ({ hud, onClose, onUpgradeSkill }) => {
  const classSpec = getClassSpec(hud.playerClass);
  const classSkills = getClassSkillsCatalog(hud.playerClass);

  const renderSkillIcon = (id: WarriorSkillId, accentHex: string) => {
    const cls = hud.playerClass;
    if (cls === 'archer') {
      if (id === 'whirlwind') return <Crosshair className="w-5 h-5" style={{ color: accentHex }} />;
      if (id === 'vanguard_dash') return <Zap className="w-5 h-5" style={{ color: accentHex }} />;
      if (id === 'earthbreaker') return <Sparkles className="w-5 h-5" style={{ color: accentHex }} />;
      return <Shield className="w-5 h-5" style={{ color: accentHex }} />;
    }
    if (cls === 'healer') {
      if (id === 'whirlwind') return <Sparkles className="w-5 h-5" style={{ color: accentHex }} />;
      if (id === 'vanguard_dash') return <Heart className="w-5 h-5" style={{ color: accentHex }} />;
      if (id === 'earthbreaker') return <Flame className="w-5 h-5" style={{ color: accentHex }} />;
      return <Shield className="w-5 h-5" style={{ color: accentHex }} />;
    }
    if (cls === 'mage') {
      if (id === 'whirlwind') return <Wand2 className="w-5 h-5" style={{ color: accentHex }} />;
      if (id === 'vanguard_dash') return <Sparkles className="w-5 h-5" style={{ color: accentHex }} />;
      if (id === 'earthbreaker') return <Flame className="w-5 h-5" style={{ color: accentHex }} />;
      return <Shield className="w-5 h-5" style={{ color: accentHex }} />;
    }
    if (cls === 'rogue') {
      if (id === 'whirlwind') return <Swords className="w-5 h-5" style={{ color: accentHex }} />;
      if (id === 'vanguard_dash') return <Zap className="w-5 h-5" style={{ color: accentHex }} />;
      if (id === 'earthbreaker') return <Sparkles className="w-5 h-5" style={{ color: accentHex }} />;
      return <Shield className="w-5 h-5" style={{ color: accentHex }} />;
    }
    switch (id) {
      case 'whirlwind':
        return <Swords className="w-5 h-5" style={{ color: accentHex }} />;
      case 'vanguard_dash':
        return <Zap className="w-5 h-5" style={{ color: accentHex }} />;
      case 'earthbreaker':
        return <Flame className="w-5 h-5" style={{ color: accentHex }} />;
      case 'warcry':
        return <Shield className="w-5 h-5" style={{ color: accentHex }} />;
    }
  };

  const renderProficiencyIcon = (id: ProficiencyId) => {
    switch (id) {
      case 'combat':
        return <Swords className="w-4 h-4 text-[#f87171]" />;
      case 'logging':
        return <Axe className="w-4 h-4 text-[#86efac]" />;
      case 'mining':
        return <Pickaxe className="w-4 h-4 text-[#7dd3fc]" />;
      case 'craft':
        return <Hammer className="w-4 h-4 text-[#e6b43c]" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-[#0b0f14]/78 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[820px] max-h-[88vh] flex flex-col rounded-2xl bg-[#141920] border border-white/14 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#10151c]">
          <div className="flex items-center gap-3">
            <div
              className="relative w-10 h-10 rounded-lg bg-[#f5efe4] border overflow-hidden shrink-0"
              style={{ borderColor: `${classSpec.accentHex}88` }}
            >
              <img
                src={classSpec.portraitUrl}
                alt={`${classSpec.name} 정면 초상화`}
                referrerPolicy="no-referrer"
                className="absolute max-w-none pointer-events-none"
                style={{
                  width: `${classSpec.portraitCrop.widthPct}%`,
                  height: 'auto',
                  left: `${classSpec.portraitCrop.leftPct}%`,
                  top: `${classSpec.portraitCrop.topPct}%`,
                }}
              />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#f7f3ea]">
                {classSpec.name} 스킬 마스터리 · 숙련도
              </h2>
              <p className="text-xs text-[#94a3b8]">
                단축키 K · {classSpec.roleLabel} · 전투·채집·건축으로 숙련도와 스킬을 강화하세요
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] text-[#94a3b8]">보유 마스터리 포인트</div>
              <div
                className={`text-sm font-bold font-mono-num ${
                  hud.skillMasteryPoints > 0 ? 'text-[#fde047]' : 'text-[#cbd5e1]'
                }`}
              >
                {hud.skillMasteryPoints} P
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="창 닫기"
              className="w-9 h-9 rounded-lg bg-[#1e2632] hover:bg-[#2a3444] border border-white/10 flex items-center justify-center text-[#dce3ec] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* SECTION 1: 4 ACTIVE CLASS SKILLS MASTERY */}
          <section>
            <div className="flex items-baseline justify-between mb-3">
              <h3
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: classSpec.accentHex }}
              >
                {classSpec.name} 고유 액티브 스킬 마스터리 (Q · E · R · T)
              </h3>
              <span className="text-[11px] text-[#94a3b8] font-mono-num">
                지역 보스 토벌 {hud.bossesDefeated}회 · 총 처치 {hud.monstersDefeated}회
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {classSkills.map((spec) => {
                const snap = hud.warriorSkills.find((s) => s.id === spec.id);
                const rank = snap?.rank ?? 1;
                const isMax = rank >= spec.maxRank;
                const canUpgrade = !isMax && hud.skillMasteryPoints > 0;
                const nextCd = Math.max(
                  2.4,
                  Number((spec.baseCooldown - rank * spec.cooldownPerRank).toFixed(2)),
                );
                const nextDmg =
                  spec.baseDamageMult > 0
                    ? Number((spec.baseDamageMult + rank * spec.damageMultPerRank).toFixed(2))
                    : 0;
                const baseHealForBuff =
                  hud.playerClass === 'healer'
                    ? 36
                    : hud.playerClass === 'warrior'
                      ? 22
                      : 16;
                const healStepForBuff = hud.playerClass === 'healer' ? 8 : 5;
                const nextBuffHeal = baseHealForBuff + rank * healStepForBuff;

                return (
                  <div
                    key={spec.id}
                    className="flex flex-col justify-between p-3.5 rounded-xl bg-[#19202a] border border-white/10"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-10 h-10 rounded-lg bg-[#11171f] border flex items-center justify-center shrink-0"
                            style={{ borderColor: `${spec.accentHex}55` }}
                          >
                            {renderSkillIcon(spec.id, spec.accentHex)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-[#273140] text-[11px] font-mono-num font-bold text-[#f7f3ea]">
                                {spec.hotkey}
                              </span>
                              <span className="text-sm font-bold text-[#f7f3ea]">{spec.name}</span>
                            </div>
                            <div className="text-[11px] text-[#94a3b8] mt-0.5 font-mono-num">
                              마스터리 Lv.{rank} / {spec.maxRank} · 기력 {spec.staminaCost}
                            </div>
                          </div>
                        </div>

                        {/* Rank Pips */}
                        <div className="flex items-center gap-1 pt-1">
                          {Array.from({ length: spec.maxRank }).map((_, idx) => (
                            <span
                              key={idx}
                              className="w-2.5 h-2.5 rounded-sm border"
                              style={{
                                backgroundColor: idx < rank ? spec.accentHex : '#141920',
                                borderColor: idx < rank ? spec.accentHex : 'rgba(255,255,255,0.16)',
                              }}
                            />
                          ))}
                        </div>
                      </div>

                      <p className="text-xs text-[#aeb7c4] mt-2.5 leading-relaxed">
                        {spec.description}
                      </p>

                      {/* Live Numeric Readout */}
                      <div className="mt-2.5 pt-2.5 border-t border-white/8 grid grid-cols-3 gap-2 text-[11px] font-mono-num">
                        {spec.baseDamageMult > 0 ? (
                          <div>
                            <div className="text-[#7c8798]">피해 배율</div>
                            <div className="font-bold text-[#f7f3ea]">
                              {Math.round((snap?.damageMult ?? spec.baseDamageMult) * 100)}%
                              {(snap?.healPct ?? 0) > 0 ? (
                                <span className="text-[#86efac] ml-1">+{snap?.healPct}%HP</span>
                              ) : null}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="text-[#7c8798]">즉시 치유</div>
                            <div className="font-bold text-[#86efac]">
                              +{snap?.healPct ?? baseHealForBuff}% HP
                            </div>
                          </div>
                        )}

                        <div>
                          <div className="text-[#7c8798]">재사용 대기</div>
                          <div className="font-bold text-[#cbd5e1]">
                            {(snap?.cooldownTotal ?? spec.baseCooldown).toFixed(1)}초
                          </div>
                        </div>

                        {spec.baseDamageMult > 0 ? (
                          <div>
                            <div className="text-[#7c8798]">적용 범위</div>
                            <div className="font-bold text-[#7dd3fc]">
                              {(snap?.radius ?? spec.baseRadius).toFixed(1)}m
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="text-[#7c8798]">강화 버프</div>
                            <div className="font-bold text-[#fde047]">
                              +{snap?.atkBonusPct ?? 28}% / {(snap?.buffDuration ?? 7.5).toFixed(1)}초
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Upgrade Action Footer */}
                    <div className="mt-3 pt-2.5 border-t border-white/8 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-[#94a3b8] font-mono-num">
                        {isMax
                          ? '최고 마스터리 달성'
                          : spec.baseDamageMult > 0
                            ? `다음: ${Math.round(nextDmg * 100)}% · ${nextCd.toFixed(1)}초`
                            : `다음: 치유 +${nextBuffHeal}% · ${nextCd.toFixed(1)}초`}
                      </span>
                      <button
                        type="button"
                        disabled={!canUpgrade}
                        onClick={() => onUpgradeSkill(spec.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                          isMax
                            ? 'bg-[#1f2936] text-[#86efac] cursor-default'
                            : canUpgrade
                              ? 'bg-[#e6b43c] hover:bg-[#f0c455] text-[#17130d] cursor-pointer'
                              : 'bg-[#202733] text-[#64748b] cursor-not-allowed'
                        }`}
                      >
                        {!isMax && <ArrowUpCircle className="w-3.5 h-3.5" />}
                        <span>{isMax ? 'MAX' : '마스터리 강화 (-1P)'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* SECTION 2: 4-BRANCH PROFICIENCY SYSTEM */}
          <section>
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#62e5ff]">
                분야별 숙련도 (패시브 성장)
              </h3>
              <span className="text-[11px] text-[#94a3b8]">
                등급: 입문 → 숙련(Lv.3) → 전문(Lv.6) → 장인(Lv.10) → 거장(Lv.15)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PROFICIENCY_CATALOG.map((spec) => {
                const snap = hud.proficiencies.find((p) => p.id === spec.id);
                const level = snap?.level ?? 1;
                const exp = snap?.exp ?? 0;
                const nextExp = snap?.nextExp ?? 60;
                const pct = Math.min(100, Math.round((exp / Math.max(nextExp, 1)) * 100));

                return (
                  <div
                    key={spec.id}
                    className="p-3.5 rounded-xl bg-[#19202a] border border-white/10 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {renderProficiencyIcon(spec.id)}
                        <span className="text-sm font-bold text-[#f7f3ea]">{spec.name}</span>
                        <span
                          className="text-[11px] font-semibold"
                          style={{ color: spec.accentHex }}
                        >
                          [{snap?.rankTitle ?? '입문'}]
                        </span>
                      </div>
                      <span className="text-xs font-bold font-mono-num text-[#f7f3ea]">
                        Lv.{level}
                      </span>
                    </div>

                    <div className="h-1.5 w-full rounded-full bg-[#242c37] overflow-hidden">
                      <div
                        className="h-full rounded-full origin-left transition-transform duration-150"
                        style={{
                          transform: `scaleX(${pct / 100})`,
                          backgroundColor: spec.accentHex,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono-num">
                      <span className="text-[#cbd5e1] font-medium">
                        {snap?.bonusSummary ?? spec.bonusPerLevelLabel}
                      </span>
                      <span className="text-[#94a3b8]">
                        {exp} / {nextExp}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#8a96a6]">{spec.description}</p>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Footer Tip */}
        <div className="px-5 py-3 border-t border-white/10 bg-[#10151c] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#94a3b8]">
          <span>
            마스터리 포인트 획득: 캐릭터 레벨 업 (+1P) · 지역 보스 토벌 (+1P) · 숙련도 짝수 레벨 달성 (+1P)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-[#232c38] hover:bg-[#313d4e] text-[#f7f3ea] font-semibold cursor-pointer"
          >
            닫기 (K / ESC)
          </button>
        </div>
      </div>
    </div>
  );
};
