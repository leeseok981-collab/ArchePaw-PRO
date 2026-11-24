import React, { useMemo, useRef, useState } from 'react';
import {
  X,
  Check,
  Search,
  Save,
  FolderOpen,
  Download,
  Upload,
  RotateCcw,
  Sparkles,
  Compass,
  Hammer,
  AlertCircle,
} from 'lucide-react';
import {
  ArmorId,
  ARMORS_CATALOG,
  getClassSpec,
  HudSnapshot,
  Inventory,
  WeaponId,
  WEAPONS_CATALOG,
  WORLD_TIERS,
} from '../game/types';
import { formatSavedDateTime } from '../game/saveSystem';
import { CraftItemArt } from './CraftItemArt';

export type WorkshopTab = 'forge' | 'armor' | 'inventory' | 'expand';
type TopSection = 'inventory' | 'craft' | 'expand' | 'guide';
type CraftCategoryFilter = 'all' | 'tool' | 'weapon' | 'armor' | 'consumable' | 'upgrade';

interface WorkshopModalProps {
  mode: 'workshop' | 'pause';
  initialTab: WorkshopTab;
  hud: HudSnapshot;
  onClose: () => void;
  onSwitchTab: (tab: WorkshopTab) => void;
  onForgeWeapon: (id: WeaponId) => void;
  onEquipWeapon: (id: WeaponId) => void;
  onCraftArmor: (id: ArmorId) => void;
  onEquipArmor: (id: ArmorId) => void;
  onCraftPotion: () => void;
  onUsePotion: () => void;
  onUpgradeBoots: () => void;
  onExpandWorld: () => void;
  onSaveGame: () => void;
  onLoadGame: () => void;
  onResetWorld: () => void;
  onExportSave: () => void;
  onImportSave: (jsonText: string) => void;
}

type MaterialKey = 'wood' | 'stone' | 'iron' | 'crystal' | 'leather' | 'fang' | 'essence';

const MATERIAL_META: Record<MaterialKey, { label: string; color: string }> = {
  wood: { label: '원목', color: '#f3c37a' },
  stone: { label: '석재', color: '#e2e8f0' },
  iron: { label: '철광석', color: '#93c5fd' },
  crystal: { label: '마력 수정', color: '#67e8f9' },
  leather: { label: '가죽', color: '#fdba74' },
  fang: { label: '야수 송곳니', color: '#fef3c7' },
  essence: { label: '마력 정수', color: '#6ee7b7' },
};

const MATERIAL_ORDER: MaterialKey[] = ['wood', 'stone', 'iron', 'crystal', 'leather', 'fang', 'essence'];

interface CraftEntry {
  key: string;
  artKey: string;
  accentHex?: string;
  category: Exclude<CraftCategoryFilter, 'all'>;
  categoryLabel: string;
  name: string;
  subtitle: string;
  description: string;
  statLine: string;
  craftAmountText: string;
  cost: Partial<Record<MaterialKey, number>>;
  owned: boolean;
  equipped: boolean;
  maxed?: boolean;
  countBadge?: string;
  canCraft: boolean;
  actionType: 'weapon' | 'armor' | 'potion' | 'boots';
  weaponId?: WeaponId;
  armorId?: ArmorId;
}

function canAffordCost(inv: Inventory, c: Partial<Inventory>): boolean {
  return (
    inv.wood >= (c.wood ?? 0) &&
    inv.stone >= (c.stone ?? 0) &&
    inv.iron >= (c.iron ?? 0) &&
    inv.crystal >= (c.crystal ?? 0) &&
    inv.leather >= (c.leather ?? 0) &&
    inv.fang >= (c.fang ?? 0) &&
    inv.essence >= (c.essence ?? 0)
  );
}

function getMissingMaterials(inv: Inventory, cost: Partial<Record<MaterialKey, number>>): MaterialKey[] {
  return MATERIAL_ORDER.filter((k) => {
    const need = cost[k] ?? 0;
    return need > 0 && inv[k] < need;
  });
}

export const WorkshopModal: React.FC<WorkshopModalProps> = ({
  mode,
  initialTab,
  hud,
  onClose,
  onSwitchTab,
  onForgeWeapon,
  onEquipWeapon,
  onCraftArmor,
  onEquipArmor,
  onCraftPotion,
  onUsePotion,
  onUpgradeBoots,
  onExpandWorld,
  onSaveGame,
  onLoadGame,
  onResetWorld,
  onExportSave,
  onImportSave,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);
  const [guideOverride, setGuideOverride] = useState<boolean>(mode === 'pause');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CraftCategoryFilter>(
    initialTab === 'armor' ? 'armor' : 'all',
  );
  const [craftableOnly, setCraftableOnly] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeSection: TopSection = guideOverride
    ? 'guide'
    : initialTab === 'inventory'
      ? 'inventory'
      : initialTab === 'expand'
        ? 'expand'
        : 'craft';

  const selectTopSection = (sec: TopSection) => {
    if (sec === 'guide') {
      setGuideOverride(true);
      return;
    }
    setGuideOverride(false);
    if (sec === 'inventory') onSwitchTab('inventory');
    else if (sec === 'expand') onSwitchTab('expand');
    else onSwitchTab('forge');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onImportSave(reader.result);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const classSpec = getClassSpec(hud.playerClass);

  const bootsCost: Partial<Record<MaterialKey, number>> =
    hud.upgrades.bootsLevel === 1
      ? { wood: 3, stone: 3 }
      : { wood: 6, stone: 4, iron: 3 };
  const canUpgradeBoots =
    hud.upgrades.bootsLevel < 3 && canAffordCost(hud.inventory, bootsCost);
  const potionCost: Partial<Record<MaterialKey, number>> = { essence: 1, wood: 1 };
  const canCraftPotion = canAffordCost(hud.inventory, potionCost);

  const nextTier = hud.worldTier < WORLD_TIERS.length ? WORLD_TIERS[hud.worldTier] : null;
  const canExpand =
    !!nextTier &&
    hud.inventory.wood >= nextTier.unlockCost.wood &&
    hud.inventory.stone >= nextTier.unlockCost.stone &&
    hud.inventory.iron >= nextTier.unlockCost.iron &&
    hud.inventory.crystal >= nextTier.unlockCost.crystal;

  // Build unified crafting catalog (Tools, Weapons, Class Armors, Consumables, Upgrades)
  const craftEntries = useMemo<CraftEntry[]>(() => {
    const list: CraftEntry[] = [];

    const visibleWeapons = WEAPONS_CATALOG.filter(
      (w) => !w.classId || w.classId === hud.playerClass || hud.ownedWeapons.includes(w.id),
    );

    for (const w of visibleWeapons) {
      const isTool = w.category === 'axe' || w.category === 'pickaxe';
      const owned = hud.ownedWeapons.includes(w.id);
      const equipped = hud.equippedWeapon === w.id;
      const canCraft = !owned && canAffordCost(hud.inventory, w.cost);
      list.push({
        key: `weapon:${w.id}`,
        artKey: w.id,
        accentHex: classSpec.accentHex,
        category: isTool ? 'tool' : 'weapon',
        categoryLabel: isTool ? '도구' : '무기',
        name: w.name,
        subtitle: w.specialtyLabel,
        description: w.description,
        statLine: `공격력 ${w.monsterDamage} · 벌목 ${w.treeDamage} · 채광 ${w.rockDamage}${w.attackRange ? ` · 사거리 ${w.attackRange.toFixed(1)}m` : ''}${w.critBonus ? ` · 치명 +${Math.round(w.critBonus * 100)}%` : ''}`,
        craftAmountText: '×1 제작',
        cost: w.cost as Partial<Record<MaterialKey, number>>,
        owned,
        equipped,
        countBadge: equipped ? '장착' : owned ? '보유' : undefined,
        canCraft,
        actionType: 'weapon',
        weaponId: w.id,
      });
    }

    const visibleArmors = ARMORS_CATALOG.filter(
      (a) => !a.classId || a.classId === hud.playerClass || hud.ownedArmors.includes(a.id),
    );
    for (const a of visibleArmors) {
      const owned = hud.ownedArmors.includes(a.id);
      const equipped = hud.equippedArmor === a.id;
      const canCraft = !owned && canAffordCost(hud.inventory, a.cost);
      const drPct = Math.round(a.damageReduction * 100);
      list.push({
        key: `armor:${a.id}`,
        artKey: `armor:${a.id}`,
        accentHex: a.accentHex,
        category: 'armor',
        categoryLabel: '방어구',
        name: a.name,
        subtitle: `${a.tierLabel} · 3D 외형 즉시 반영`,
        description: a.description,
        statLine: `최대 HP +${a.bonusHp} · 피해 감소 ${drPct}%${a.bonusStamina > 0 ? ` · 기력 +${a.bonusStamina}` : ''}`,
        craftAmountText: '×1 제작',
        cost: a.cost as Partial<Record<MaterialKey, number>>,
        owned,
        equipped,
        countBadge: equipped ? '착용' : owned ? '보유' : undefined,
        canCraft,
        actionType: 'armor',
        armorId: a.id,
      });
    }

    list.push({
      key: 'consumable:potion',
      artKey: 'potion',
      accentHex: '#4ade80',
      category: 'consumable',
      categoryLabel: '물품',
      name: '치유 물약',
      subtitle: '전투·탐험용 즉시 회복 물품',
      description: '마시면 체력(HP)과 기력을 즉시 크게 회복합니다. 시련의 탑 보스전에 필수입니다.',
      statLine: `HP +50 · 기력 +40 회복 · 보유 ×${hud.inventory.potion}`,
      craftAmountText: '×2 제작',
      cost: potionCost,
      owned: false,
      equipped: false,
      countBadge: hud.inventory.potion > 0 ? `×${hud.inventory.potion}` : undefined,
      canCraft: canCraftPotion,
      actionType: 'potion',
    });

    list.push({
      key: 'upgrade:boots',
      artKey: 'boots',
      accentHex: '#f59e0b',
      category: 'upgrade',
      categoryLabel: '강화',
      name: `개척자 장화 (Lv.${hud.upgrades.bootsLevel}/3)`,
      subtitle: '기동력 · 수영 · 점프 강화',
      description: '이동 속도와 달리기 속도를 높이고 점프 도약력과 최대 기력을 영구히 상승시킵니다.',
      statLine:
        hud.upgrades.bootsLevel >= 3
          ? '최대 강화 완료 · 이동·도약·기력 보너스 활성'
          : `다음 단계 Lv.${hud.upgrades.bootsLevel + 1} · 기동력 + 최대 기력 증가`,
      craftAmountText: '×1 강화',
      cost: hud.upgrades.bootsLevel >= 3 ? {} : bootsCost,
      owned: hud.upgrades.bootsLevel >= 3,
      equipped: false,
      maxed: hud.upgrades.bootsLevel >= 3,
      countBadge: `Lv.${hud.upgrades.bootsLevel}`,
      canCraft: canUpgradeBoots,
      actionType: 'boots',
    });

    return list;
  }, [hud, classSpec.accentHex, canCraftPotion, canUpgradeBoots]);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return craftEntries.filter((entry) => {
      if (categoryFilter !== 'all' && entry.category !== categoryFilter) return false;
      if (craftableOnly && !entry.canCraft) return false;
      if (q && !entry.name.toLowerCase().includes(q) && !entry.description.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [craftEntries, categoryFilter, craftableOnly, searchQuery]);

  const readyCount = useMemo(
    () => craftEntries.filter((e) => e.canCraft).length,
    [craftEntries],
  );

  const selectedEntry = useMemo(() => {
    const found =
      filteredEntries.find((e) => e.key === selectedKey) ||
      craftEntries.find((e) => e.key === selectedKey);
    return found || filteredEntries[0] || craftEntries[0];
  }, [filteredEntries, craftEntries, selectedKey]);

  const groupedSections: Array<{
    id: Exclude<CraftCategoryFilter, 'all'>;
    label: string;
    items: CraftEntry[];
  }> = useMemo(() => {
    const order: Array<{ id: Exclude<CraftCategoryFilter, 'all'>; label: string }> = [
      { id: 'tool', label: '도구' },
      { id: 'weapon', label: '무기' },
      { id: 'armor', label: '방어구' },
      { id: 'consumable', label: '물품' },
      { id: 'upgrade', label: '강화' },
    ];
    return order
      .map((sec) => ({
        ...sec,
        items: filteredEntries.filter((e) => e.category === sec.id),
      }))
      .filter((sec) => sec.items.length > 0);
  }, [filteredEntries]);

  const handlePrimaryCraftAction = (entry: CraftEntry) => {
    if (entry.actionType === 'weapon' && entry.weaponId) {
      if (entry.owned) {
        if (!entry.equipped) onEquipWeapon(entry.weaponId);
      } else if (entry.canCraft) {
        onForgeWeapon(entry.weaponId);
      }
    } else if (entry.actionType === 'armor' && entry.armorId) {
      if (entry.owned) {
        if (!entry.equipped) onEquipArmor(entry.armorId);
      } else if (entry.canCraft) {
        onCraftArmor(entry.armorId);
      }
    } else if (entry.actionType === 'potion') {
      if (entry.canCraft) onCraftPotion();
    } else if (entry.actionType === 'boots') {
      if (entry.canCraft) onUpgradeBoots();
    }
  };

  const selectedCostEntries = selectedEntry
    ? MATERIAL_ORDER.filter((k) => (selectedEntry.cost[k] ?? 0) > 0).map((k) => ({
        key: k,
        need: selectedEntry.cost[k] ?? 0,
        have: hud.inventory[k],
      }))
    : [];
  const selectedMissing = selectedEntry
    ? getMissingMaterials(hud.inventory, selectedEntry.cost)
    : [];

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-[#090a0c]/84 p-2.5 sm:p-5"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[1040px] max-h-[90vh] flex flex-col rounded-lg bg-[#141517] border border-[#2a2d33] border-t-[3px] border-t-[#f97316] shadow-2xl overflow-hidden text-[#f1f5f9]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP NAVIGATION BAR (Reference Survival Crafting Layout) */}
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2 px-3 sm:px-4 pt-3 pb-2.5 bg-[#121315] border-b border-[#25282e] shrink-0">
          <button
            type="button"
            onClick={() => selectTopSection('inventory')}
            className={`h-11 sm:h-12 rounded font-bold text-xs sm:text-sm tracking-tight transition-colors cursor-pointer whitespace-nowrap border ${
              activeSection === 'inventory'
                ? 'bg-gradient-to-b from-[#f97316] to-[#ea580c] border-[#fb923c] text-[#110c08] shadow'
                : 'bg-[#25282e] hover:bg-[#2f333b] border-[#353942] text-[#e2e8f0]'
            }`}
          >
            인벤토리
          </button>

          <button
            type="button"
            onClick={() => selectTopSection('craft')}
            className={`h-11 sm:h-12 rounded font-bold text-xs sm:text-sm tracking-tight transition-colors cursor-pointer whitespace-nowrap border ${
              activeSection === 'craft'
                ? 'bg-gradient-to-b from-[#f97316] to-[#ea580c] border-[#fb923c] text-[#110c08] shadow'
                : 'bg-[#25282e] hover:bg-[#2f333b] border-[#353942] text-[#e2e8f0]'
            }`}
          >
            제작
          </button>

          <button
            type="button"
            onClick={() => selectTopSection('expand')}
            className={`relative h-11 sm:h-12 rounded font-bold text-xs sm:text-sm tracking-tight transition-colors cursor-pointer whitespace-nowrap border ${
              activeSection === 'expand'
                ? 'bg-gradient-to-b from-[#f97316] to-[#ea580c] border-[#fb923c] text-[#110c08] shadow'
                : 'bg-[#25282e] hover:bg-[#2f333b] border-[#353942] text-[#e2e8f0]'
            }`}
          >
            <span>월드 확장 ({hud.worldTier}/10)</span>
            {canExpand && activeSection !== 'expand' && (
              <span className="absolute -top-1.5 right-1.5 px-1.5 py-0.2 rounded bg-[#22c55e] text-[#052e16] text-[9px] font-extrabold">
                가능
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => selectTopSection('guide')}
            className={`h-11 sm:h-12 rounded font-bold text-xs sm:text-sm tracking-tight transition-colors cursor-pointer whitespace-nowrap border ${
              activeSection === 'guide'
                ? 'bg-gradient-to-b from-[#f97316] to-[#ea580c] border-[#fb923c] text-[#110c08] shadow'
                : 'bg-[#25282e] hover:bg-[#2f333b] border-[#353942] text-[#e2e8f0]'
            }`}
          >
            가이드 · 저장
          </button>

          <button
            type="button"
            onClick={onClose}
            className="h-11 sm:h-12 rounded bg-[#25282e] hover:bg-[#352326] border border-[#353942] hover:border-[#f87171]/50 font-bold text-xs sm:text-sm text-[#e2e8f0] hover:text-[#fecaca] transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-1"
          >
            <X className="w-4 h-4 hidden sm:block" />
            <span>닫기</span>
          </button>
        </div>

        {/* ==================== SECTION 1: CRAFTING WORKBENCH ("제작") ==================== */}
        {activeSection === 'craft' && (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Search & Category Filter Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2.5 bg-[#16181c] border-b border-[#25282e] shrink-0">
              <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
                <label className="relative flex items-center w-full sm:w-48 shrink-0">
                  <Search className="w-3.5 h-3.5 text-[#9ca3af] absolute left-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="검색"
                    aria-label="제작 아이템 검색"
                    className="w-full h-9 pl-8 pr-2.5 rounded bg-[#0f1012] border border-[#2d3139] focus:border-[#f97316] focus:outline-none text-xs text-[#f8fafc] placeholder:text-[#6b7280]"
                  />
                </label>

                {(
                  [
                    { id: 'all', label: '전체' },
                    { id: 'tool', label: '도구' },
                    { id: 'weapon', label: '무기' },
                    { id: 'armor', label: '방어구' },
                    { id: 'consumable', label: '물품' },
                    { id: 'upgrade', label: '강화' },
                  ] as Array<{ id: CraftCategoryFilter; label: string }>
                ).map((cat) => {
                  const active = categoryFilter === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryFilter(cat.id)}
                      className={`h-9 px-3 rounded text-xs font-bold transition-colors cursor-pointer whitespace-nowrap border ${
                        active
                          ? 'bg-[#f97316] border-[#fb923c] text-[#110c08]'
                          : 'bg-[#22252b] hover:bg-[#2b2f37] border-[#323640] text-[#d1d5db]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setCraftableOnly((v) => !v)}
                className={`h-9 px-3.5 rounded text-xs font-bold transition-colors cursor-pointer whitespace-nowrap border ${
                  craftableOnly
                    ? 'bg-[#153121] border-[#22c55e] text-[#4ade80]'
                    : 'bg-[#22252b] hover:bg-[#2b2f37] border-[#323640] text-[#cbd5e1]'
                }`}
              >
                제작 가능 ({readyCount})
              </button>
            </div>

            {/* Split Main Body: Left Workbench Grid + Right Inspector Panel */}
            <div className="grid grid-cols-1 md:grid-cols-12 flex-1 min-h-0 overflow-hidden">
              {/* LEFT PANE: Categorized Square Item Grid */}
              <div className="md:col-span-7 flex flex-col min-h-0 border-b md:border-b-0 md:border-r border-[#25282e] bg-[#141517]">
                <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-[3px] h-7 bg-[#f97316] rounded-full shrink-0" />
                    <div>
                      <div className="text-sm font-bold text-[#f8fafc] leading-tight">
                        작업대 I · {classSpec.name} 제작소
                      </div>
                      <div className="text-[11px] text-[#8b949e]">
                        채집 도구, 직업 무기, 3D 방어구, 회복 물약 및 장비 강화
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold font-mono-num text-[#4ade80] whitespace-nowrap">
                    {readyCount} 준비 완료
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
                  {groupedSections.length === 0 ? (
                    <div className="py-12 text-center text-xs text-[#8b949e]">
                      조건에 맞는 제작 항목이 없습니다.
                    </div>
                  ) : (
                    groupedSections.map((group) => (
                      <div key={group.id} className="space-y-1.5">
                        <div className="text-[11px] font-semibold text-[#9ca3af]">{group.label}</div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                          {group.items.map((item) => {
                            const isSelected = selectedEntry?.key === item.key;
                            const showGreenEdge = item.canCraft || item.equipped;
                            return (
                              <button
                                key={item.key}
                                type="button"
                                onClick={() => setSelectedKey(item.key)}
                                className={`relative flex flex-col items-center justify-between p-2 pt-2.5 rounded bg-[#1d1f24] hover:bg-[#25282f] border transition-all cursor-pointer overflow-hidden min-h-[96px] ${
                                  isSelected
                                    ? 'border-[#f97316] ring-1 ring-[#f97316]/60 bg-[#23262d]'
                                    : 'border-[#2c3038]'
                                }`}
                              >
                                {item.countBadge && (
                                  <span
                                    className={`absolute top-1 right-1.5 text-[10px] font-bold font-mono-num ${
                                      item.equipped
                                        ? 'text-[#38bdf8]'
                                        : item.owned
                                          ? 'text-[#4ade80]'
                                          : 'text-[#86efac]'
                                    }`}
                                  >
                                    {item.countBadge}
                                  </span>
                                )}
                                <div className="my-auto flex items-center justify-center">
                                  <CraftItemArt
                                    itemKey={item.artKey}
                                    accentHex={item.accentHex}
                                    size={44}
                                  />
                                </div>
                                <span className="mt-1 w-full text-center text-[10px] font-semibold text-[#d1d5db] truncate">
                                  {item.name}
                                </span>
                                {/* Bottom status bar (green when craftable or equipped, subtle dark otherwise) */}
                                <div
                                  className="absolute bottom-0 left-0 right-0 h-[3px]"
                                  style={{
                                    backgroundColor: showGreenEdge
                                      ? '#22c55e'
                                      : item.owned
                                        ? '#38bdf8'
                                        : 'transparent',
                                  }}
                                />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Bottom Material Source Footer */}
                <div className="px-4 py-2 bg-[#111214] border-t border-[#24272d] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-num text-[#9ca3af] shrink-0">
                  <span>제작 대상: 내 인벤토리</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[#f3c37a]">원목 {hud.inventory.wood}</span>
                    <span className="text-[#e2e8f0]">석재 {hud.inventory.stone}</span>
                    <span className="text-[#93c5fd]">철 {hud.inventory.iron}</span>
                    <span className="text-[#67e8f9]">수정 {hud.inventory.crystal}</span>
                    <span className="text-[#fdba74]">가죽 {hud.inventory.leather}</span>
                    <span className="text-[#fef3c7]">송곳니 {hud.inventory.fang}</span>
                    <span className="text-[#6ee7b7]">정수 {hud.inventory.essence}</span>
                  </div>
                </div>
              </div>

              {/* RIGHT PANE: Selected Item Inspector + Required Materials ("필요 사항") + CRAFT CTA */}
              <div className="md:col-span-5 flex flex-col justify-between p-4 sm:p-5 bg-[#121316] overflow-y-auto">
                {selectedEntry ? (
                  <>
                    <div className="space-y-4">
                      {/* Item Preview Card + Title */}
                      <div className="flex items-start gap-3.5">
                        <div className="w-[74px] h-[74px] rounded bg-[#1d2026] border border-[#323640] flex items-center justify-center shrink-0">
                          <CraftItemArt
                            itemKey={selectedEntry.artKey}
                            accentHex={selectedEntry.accentHex}
                            size={58}
                          />
                        </div>
                        <div className="min-w-0 pt-0.5">
                          <h3 className="text-lg font-extrabold text-[#f8fafc] leading-snug truncate">
                            {selectedEntry.name}
                          </h3>
                          <div className="text-xs font-bold text-[#f97316] mt-0.5 font-mono-num">
                            {selectedEntry.craftAmountText}
                          </div>
                          <div className="text-[11px] text-[#9ca3af] mt-0.5">
                            {selectedEntry.subtitle}
                          </div>
                        </div>
                      </div>

                      {/* Item Description + Green Stat Readout */}
                      <div className="space-y-1.5">
                        <p className="text-xs sm:text-[13px] text-[#e5e7eb] leading-relaxed">
                          {selectedEntry.description}
                        </p>
                        <div className="text-xs font-bold text-[#4ade80] font-mono-num">
                          {selectedEntry.statLine}
                        </div>
                      </div>

                      {/* Required Materials ("필요 사항") */}
                      <div className="pt-2 border-t border-[#25282e] space-y-2">
                        <div className="text-[11px] font-semibold text-[#9ca3af]">필요 사항</div>

                        {selectedEntry.owned && selectedEntry.actionType !== 'potion' ? (
                          <div className="flex items-center gap-2 px-3 py-2.5 rounded bg-[#15251e] border border-[#22c55e]/35 text-xs text-[#86efac]">
                            <Check className="w-4 h-4 shrink-0" />
                            <span>
                              {selectedEntry.maxed
                                ? '최대 강화 단계에 도달했습니다.'
                                : '이미 제작 완료된 장비입니다. 바로 장착할 수 있습니다.'}
                            </span>
                          </div>
                        ) : selectedCostEntries.length === 0 ? (
                          <div className="text-xs text-[#86efac]">기본 지급 장비입니다.</div>
                        ) : (
                          <div className="space-y-1.5">
                            {selectedCostEntries.map((row) => {
                              const enough = row.have >= row.need;
                              const meta = MATERIAL_META[row.key];
                              return (
                                <div
                                  key={row.key}
                                  className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded bg-[#181a1f] border border-[#262a32]"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-7 h-7 rounded bg-[#121418] border border-[#2c3038] flex items-center justify-center shrink-0">
                                      <CraftItemArt itemKey={`mat:${row.key}`} size={22} />
                                    </div>
                                    <span className="text-xs font-semibold text-[#f1f5f9] truncate">
                                      {meta.label}
                                    </span>
                                  </div>
                                  <span
                                    className={`text-xs font-bold font-mono-num whitespace-nowrap ${
                                      enough ? 'text-[#4ade80]' : 'text-[#f87171]'
                                    }`}
                                  >
                                    {row.have}/{row.need}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {!selectedEntry.owned && selectedMissing.length > 0 && (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-[#f87171] pt-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              누락된 아이템 ({selectedMissing.map((k) => MATERIAL_META[k].label).join(', ')})
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Full-Width CRAFT / EQUIP Button */}
                    <div className="pt-4 mt-4 border-t border-[#25282e] flex items-center gap-2">
                      {selectedEntry.equipped ? (
                        <div className="flex-1 h-12 rounded bg-[#162731] border border-[#38bdf8]/55 flex items-center justify-center gap-1.5 text-sm font-bold text-[#7dd3fc]">
                          <Check className="w-4 h-4" />
                          <span>현재 장착 중</span>
                        </div>
                      ) : selectedEntry.owned && !selectedEntry.maxed ? (
                        <button
                          type="button"
                          onClick={() => handlePrimaryCraftAction(selectedEntry)}
                          className="flex-1 h-12 rounded bg-[#2563eb] hover:bg-[#3b82f6] text-white font-extrabold text-sm tracking-wide transition-colors cursor-pointer"
                        >
                          장착하기
                        </button>
                      ) : selectedEntry.maxed ? (
                        <div className="flex-1 h-12 rounded bg-[#16261d] border border-[#22c55e]/40 flex items-center justify-center text-sm font-bold text-[#4ade80]">
                          최대 강화 완료
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={!selectedEntry.canCraft}
                          onClick={() => handlePrimaryCraftAction(selectedEntry)}
                          className={`flex-1 h-12 rounded font-extrabold text-sm tracking-wider transition-colors flex items-center justify-center gap-2 ${
                            selectedEntry.canCraft
                              ? 'bg-gradient-to-b from-[#f97316] to-[#ea580c] hover:from-[#fb923c] hover:to-[#f97316] text-[#110c08] cursor-pointer shadow-lg'
                              : 'bg-[#1c1e23] border border-[#2e323a] text-[#6b7280] cursor-not-allowed'
                          }`}
                        >
                          <Hammer className="w-4 h-4" />
                          <span>
                            {selectedEntry.canCraft
                              ? selectedEntry.actionType === 'boots'
                                ? 'CRAFT · 강화하기'
                                : 'CRAFT · 제작하기'
                              : 'CRAFT'}
                          </span>
                        </button>
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* ==================== SECTION 2: INVENTORY ("인벤토리") ==================== */}
        {activeSection === 'inventory' && (
          <div className="p-4 sm:p-5 space-y-5 overflow-y-auto flex-1 bg-[#141517]">
            {/* Raw Material & Loot Bag */}
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-[3px] h-4 bg-[#f97316] rounded-full" />
                <span className="text-xs font-bold text-[#e2e8f0]">채집 재료 · 몬스터 전리품 가방</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {MATERIAL_ORDER.map((k) => (
                  <div
                    key={k}
                    className="flex items-center justify-between gap-2.5 px-3 py-2.5 rounded bg-[#1c1e23] border border-[#2c3038]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CraftItemArt itemKey={`mat:${k}`} size={28} />
                      <span className="text-xs font-semibold text-[#d1d5db] truncate">
                        {MATERIAL_META[k].label}
                      </span>
                    </div>
                    <span
                      className="text-sm font-extrabold font-mono-num"
                      style={{ color: MATERIAL_META[k].color }}
                    >
                      {hud.inventory[k]}
                    </span>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={onUsePotion}
                  disabled={hud.inventory.potion <= 0}
                  className={`flex items-center justify-between gap-2.5 px-3 py-2.5 rounded border transition-colors ${
                    hud.inventory.potion > 0
                      ? 'bg-[#15281e] hover:bg-[#1b3628] border-[#22c55e]/50 cursor-pointer'
                      : 'bg-[#1c1e23] border-[#2c3038] opacity-55 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <CraftItemArt itemKey="potion" size={28} />
                    <span className="text-xs font-semibold text-[#86efac] truncate">물약 사용</span>
                  </div>
                  <span className="text-sm font-extrabold font-mono-num text-[#4ade80]">
                    {hud.inventory.potion}
                  </span>
                </button>
              </div>
            </div>

            {/* Owned Weapons & Tools */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-[3px] h-4 bg-[#f97316] rounded-full" />
                  <span className="text-xs font-bold text-[#e2e8f0]">
                    보유 도구 · 무기 ({hud.ownedWeapons.length}종)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCategoryFilter('weapon');
                    selectTopSection('craft');
                  }}
                  className="text-xs font-semibold text-[#f97316] hover:underline cursor-pointer"
                >
                  제작소에서 더 만들기 →
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {WEAPONS_CATALOG.filter((w) => hud.ownedWeapons.includes(w.id)).map((w) => {
                  const active = hud.equippedWeapon === w.id;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => onEquipWeapon(w.id)}
                      className={`flex items-center justify-between gap-2.5 p-2.5 rounded border text-left transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#1a2730] border-[#38bdf8]'
                          : 'bg-[#1c1e23] hover:bg-[#24272e] border-[#2c3038]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CraftItemArt itemKey={w.id} size={36} />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#f8fafc] truncate">{w.name}</div>
                          <div className="text-[10px] text-[#9ca3af] truncate">{w.specialtyLabel}</div>
                        </div>
                      </div>
                      <span
                        className={`text-[11px] font-bold whitespace-nowrap ${
                          active ? 'text-[#38bdf8]' : 'text-[#9ca3af]'
                        }`}
                      >
                        {active ? '장착 중' : '장착'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Owned Armors */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-[3px] h-4 bg-[#f97316] rounded-full" />
                  <span className="text-xs font-bold text-[#e2e8f0]">
                    보유 방어구 ({hud.ownedArmors.length}종 · 클릭해 3D 외형 즉시 변경)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCategoryFilter('armor');
                    selectTopSection('craft');
                  }}
                  className="text-xs font-semibold text-[#f97316] hover:underline cursor-pointer"
                >
                  방어구 제작 →
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {ARMORS_CATALOG.filter((a) => hud.ownedArmors.includes(a.id)).map((a) => {
                  const active = hud.equippedArmor === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => onEquipArmor(a.id)}
                      className={`flex items-center justify-between gap-2.5 p-2.5 rounded border text-left transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#1a2730] border-[#38bdf8]'
                          : 'bg-[#1c1e23] hover:bg-[#24272e] border-[#2c3038]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CraftItemArt itemKey={`armor:${a.id}`} accentHex={a.accentHex} size={36} />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#f8fafc] truncate">{a.name}</div>
                          <div className="text-[10px] text-[#4ade80] font-mono-num">
                            HP +{a.bonusHp} · 감소 {Math.round(a.damageReduction * 100)}%
                          </div>
                        </div>
                      </div>
                      <span
                        className={`text-[11px] font-bold whitespace-nowrap ${
                          active ? 'text-[#38bdf8]' : 'text-[#9ca3af]'
                        }`}
                      >
                        {active ? '착용 중' : '착용'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ==================== SECTION 3: 10-TIER WORLD EXPANSION ("월드 확장") ==================== */}
        {activeSection === 'expand' && (
          <div className="p-4 sm:p-5 space-y-3 overflow-y-auto flex-1 bg-[#141517]">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#25282e]">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#f97316]" />
                <span className="text-sm font-bold text-[#f8fafc]">
                  10단계 월드 개척 확장 (현재 {hud.worldTier} / {WORLD_TIERS.length}단계 · 반경 {hud.worldRadius}m)
                </span>
              </div>
              <span className="text-xs text-[#9ca3af]">
                확장할수록 동(해안)·서(바람계곡)·남(화산)·북(사막)의 상위 등급 정령들이 출현합니다
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {WORLD_TIERS.map((tier) => {
                const unlocked = hud.worldTier >= tier.tier;
                const isNext = hud.worldTier + 1 === tier.tier;
                const rawTierCosts: Array<{ key: MaterialKey; need: number }> = [
                  { key: 'wood', need: tier.unlockCost.wood },
                  { key: 'stone', need: tier.unlockCost.stone },
                  { key: 'iron', need: tier.unlockCost.iron },
                  { key: 'crystal', need: tier.unlockCost.crystal },
                ];
                const tierCostRows = rawTierCosts.filter((r) => r.need > 0);

                return (
                  <div
                    key={tier.tier}
                    className={`flex flex-col justify-between gap-2.5 p-3.5 rounded border ${
                      unlocked
                        ? 'bg-[#14231b] border-[#22c55e]/40'
                        : isNext
                          ? 'bg-[#1d2027] border-[#f97316]/75'
                          : 'bg-[#17191d] border-[#262a31] opacity-65'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-bold text-[#f8fafc]">
                          {tier.tier}단계 · {tier.name}
                        </div>
                        <span className="text-[11px] font-mono-num text-[#9ca3af] shrink-0">
                          반경 {tier.radius}m
                        </span>
                      </div>
                      <p className="text-xs text-[#aeb7c4] mt-1">{tier.subtitle}</p>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/6">
                      {unlocked ? (
                        <span className="flex items-center gap-1 text-xs font-bold text-[#4ade80]">
                          <Check className="w-3.5 h-3.5" />
                          <span>개방 완료</span>
                        </span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono-num">
                          {tierCostRows.map((r) => {
                            const ok = hud.inventory[r.key] >= r.need;
                            return (
                              <span
                                key={r.key}
                                className={ok ? 'text-[#4ade80]' : 'text-[#f87171]'}
                              >
                                {MATERIAL_META[r.key].label} {hud.inventory[r.key]}/{r.need}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {isNext && (
                        <button
                          type="button"
                          disabled={!canExpand}
                          onClick={() => {
                            onExpandWorld();
                            onClose();
                          }}
                          className={`px-3.5 py-1.5 rounded text-xs font-extrabold whitespace-nowrap shrink-0 transition-colors ${
                            canExpand
                              ? 'bg-[#f97316] hover:bg-[#fb923c] text-[#110c08] cursor-pointer'
                              : 'bg-[#262930] text-[#6b7280] cursor-not-allowed'
                          }`}
                        >
                          확장 실행
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================== SECTION 4: GUIDE & SAVE MANAGEMENT ("가이드 · 저장") ==================== */}
        {activeSection === 'guide' && (
          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 bg-[#141517]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm">
              <div className="p-3.5 rounded bg-[#1b1d22] border border-[#2a2e36]">
                <div className="text-[11px] text-[#f97316] font-bold mb-1">이동 · 수영 · 숨 게이지</div>
                <div className="text-xs text-[#e5e7eb] leading-relaxed">
                  WASD 이동 · Shift 달리기 · Space 점프. 얕은 물웅덩이는 자연스럽게 걸어 지나가며, 깊은 호수·동부 바다에서는 자동으로 수영하며 숨 게이지가 표시됩니다.
                </div>
              </div>
              <div className="p-3.5 rounded bg-[#1b1d22] border border-[#2a2e36]">
                <div className="text-[11px] text-[#f97316] font-bold mb-1">5대 테마 지형 · 6단계 원소 정령</div>
                <div className="text-xs text-[#e5e7eb] leading-relaxed">
                  중앙 초원 · 동쪽 해안/바다(수) · 서쪽 바람계곡(풍) · 남쪽 화산(화) · 북쪽 사막(토). 월드를 확장할수록 최하급 아기 정령부터 정령왕까지 단계별로 등장합니다.
                </div>
              </div>
              <div className="p-3.5 rounded bg-[#1b1d22] border border-[#2a2e36]">
                <div className="text-[11px] text-[#f97316] font-bold mb-1">시련의 탑 30층 전용 던전 & 약점 속성</div>
                <div className="text-xs text-[#e5e7eb] leading-relaxed">
                  북부 시련의 탑 입장 시 별도 3D 던전 공간으로 이동합니다. 전투 중 화면 속성 필터와 몬스터 약점 속성을 확인해 공략하세요.
                </div>
              </div>
              <div className="p-3.5 rounded bg-[#1b1d22] border border-[#2a2e36]">
                <div className="text-[11px] text-[#f97316] font-bold mb-1">모듈 하우징 건축 · 저장</div>
                <div className="text-xs text-[#e5e7eb] leading-relaxed">
                  H 모듈 하우징 · 반벽/천장/바닥 자동 스냅 · R 90° 회전 · F 채집/공격/문 여닫기 · K 스킬 마스터리 · Ctrl+S 즉시 저장.
                </div>
              </div>
            </div>

            {/* World & Housing Save Management */}
            <div className="p-4 rounded bg-[#191c22] border border-[#2d323b] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-[#f8fafc] flex items-center gap-1.5">
                    <Save className="w-4 h-4 text-[#f97316]" />
                    <span>월드 · 하우징 저장 관리</span>
                  </div>
                  <div className="text-xs text-[#9ca3af] font-mono-num mt-0.5">
                    {hud.lastSavedAt
                      ? `최근 저장: ${formatSavedDateTime(hud.lastSavedAt)}`
                      : '아직 저장된 기록이 없습니다'}
                    {' · '}건축 타일 {hud.housing.placedCount}개 · 월드 {hud.worldTier}/10단계 · 시련의 탑 최고 {hud.trialTower.highestClearedFloor}/30층
                  </div>
                </div>
                <span className="text-[11px] text-[#4ade80] font-mono-num flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>건축·확장 시 자동 저장</span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onSaveGame}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded bg-[#f97316] hover:bg-[#fb923c] text-[#110c08] text-xs font-extrabold transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>지금 저장 (Ctrl+S)</span>
                </button>

                <button
                  type="button"
                  disabled={!hud.hasSavedGame}
                  onClick={() => {
                    onLoadGame();
                    onClose();
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded text-xs font-bold transition-colors whitespace-nowrap ${
                    hud.hasSavedGame
                      ? 'bg-[#252932] hover:bg-[#313744] text-[#f8fafc] cursor-pointer border border-[#363c48]'
                      : 'bg-[#1c1f25] text-[#6b7280] cursor-not-allowed'
                  }`}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>저장 불러오기</span>
                </button>

                <button
                  type="button"
                  onClick={onExportSave}
                  className="flex items-center gap-1.5 px-3 py-2 rounded bg-[#22262e] hover:bg-[#2d323c] border border-[#343944] text-[#e2e8f0] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>백업 내보내기</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded bg-[#22262e] hover:bg-[#2d323c] border border-[#343944] text-[#e2e8f0] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>백업 불러오기</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {!confirmReset ? (
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    className="ml-auto flex items-center gap-1 px-3 py-2 rounded bg-[#2b1a1d] hover:bg-[#3a2226] border border-[#f87171]/35 text-[#fca5a5] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>월드 초기화</span>
                  </button>
                ) : (
                  <div className="ml-auto flex items-center gap-1.5">
                    <span className="text-[11px] text-[#fca5a5]">저장 삭제 후 초기화?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmReset(false);
                        onResetWorld();
                        onClose();
                      }}
                      className="px-2.5 py-1.5 rounded bg-[#ef4444] hover:bg-[#f87171] text-white text-xs font-bold cursor-pointer whitespace-nowrap"
                    >
                      초기화 확정
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="px-2.5 py-1.5 rounded bg-[#262a33] hover:bg-[#323845] text-[#cbd5e1] text-xs cursor-pointer whitespace-nowrap"
                    >
                      취소
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#25282e] text-xs text-[#9ca3af]">
              <span>
                채집 {hud.harvestedTotal}회 · 몬스터 처치 {hud.monstersDefeated}마리 · 건축 {hud.housing.placedCount}개 · 보유 방어구 {hud.ownedArmors.length}종
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded bg-[#f97316] hover:bg-[#fb923c] text-[#110c08] font-extrabold text-xs sm:text-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                계속 플레이하기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
