export type GamePhase = 'title' | 'playing' | 'paused';

export type ResourceKind = 'wood' | 'stone' | 'iron' | 'crystal';

export type WeatherKind = 'clear' | 'rain' | 'storm' | 'fog' | 'snow';

export type TimePreset = 'dawn' | 'noon' | 'sunset' | 'night';

export type EmoteId = 'wave' | 'sit' | 'cheer' | 'dance' | 'bow' | 'victory';

export interface EmoteOption {
  id: EmoteId;
  label: string;
  subtitle: string;
  looping: boolean;
}

export const EMOTES_CATALOG: EmoteOption[] = [
  { id: 'wave', label: '손 흔들기', subtitle: '반갑게 인사', looping: false },
  { id: 'sit', label: '앉아서 휴식', subtitle: 'HP·스태미나 회복', looping: true },
  { id: 'cheer', label: '환호하기', subtitle: '기쁨의 만세', looping: false },
  { id: 'dance', label: '흥겨운 춤', subtitle: '리듬 댄스', looping: true },
  { id: 'bow', label: '기사 예절', subtitle: '정중한 인사', looping: false },
  { id: 'victory', label: '승리 포즈', subtitle: '무기 치켜들기', looping: false },
];

export type PlayerClassId = 'warrior' | 'archer' | 'healer' | 'mage' | 'rogue';

export type WeaponId =
  | 'crystal_sword'
  | 'stone_axe'
  | 'stone_pickaxe'
  | 'iron_axe'
  | 'iron_pickaxe'
  | 'hunter_blade'
  | 'essence_battleaxe'
  | 'rune_greatsword'
  // Archer weapons
  | 'recurve_bow'
  | 'windstrider_bow'
  | 'azure_star_bow'
  // Healer weapons
  | 'emerald_wing_staff'
  | 'sanctuary_staff'
  | 'seraphic_staff'
  // Mage weapons
  | 'crystal_wand'
  | 'amethyst_wand'
  | 'astral_nova_staff'
  // Rogue weapons
  | 'tactical_dagger'
  | 'viper_dagger'
  | 'eclipse_dagger';

export type WeaponCategory = 'sword' | 'axe' | 'pickaxe' | 'bow' | 'staff' | 'wand' | 'dagger';

export type ArmorId =
  // Warrior armors
  | 'pioneer_denim'
  | 'wild_leather'
  | 'iron_plate'
  | 'frost_wolf_cloak'
  | 'rune_paladin'
  // Archer armors
  | 'olive_puffer'
  | 'forest_stalker'
  | 'gale_hawk_garb'
  // Healer armors
  | 'cream_cardigan'
  | 'ivory_acolyte'
  | 'seraph_vestment'
  // Mage armors
  | 'violet_hoodie'
  | 'amethyst_robe'
  | 'astral_archmage'
  // Rogue armors
  | 'stealth_cargo'
  | 'nightshade_gear'
  | 'eclipse_shroud';

export interface PlayerClassSpec {
  id: PlayerClassId;
  name: string;
  catTitle: string;
  roleLabel: string;
  tagline: string;
  description: string;
  accentHex: string;
  portraitUrl: string;
  portraitPos: string;
  portraitScale: number;
  /** Exact front-view crop (column 1 of 4-view sheet) for square portrait boxes */
  portraitCrop: {
    widthPct: number;
    leftPct: number;
    topPct: number;
  };
  baseHp: number;
  baseStamina: number;
  baseAttackMult: number;
  moveSpeedMult: number;
  baseCritChance: number;
  attackRange: number;
  starterWeapon: WeaponId;
  starterArmor: ArmorId;
  defaultNickname: string;
  statBars: {
    hp: number; // 1..100
    atk: number;
    spd: number;
    crit: number;
    util: number;
  };
}

export const CLASS_CATALOG: PlayerClassSpec[] = [
  {
    id: 'warrior',
    name: '전사',
    catTitle: '냥기사',
    roleLabel: '근접 탱커 · 광역 강타',
    tagline: '견고한 방패와 수정 검으로 전선을 돌파하는 용맹한 냥기사',
    description: '높은 체력과 방어력으로 근접전에서 압도적인 안정감을 발휘하며, 회전 베기와 대지 분쇄로 다수의 몬스터를 제압합니다.',
    accentHex: '#f59e0b',
    portraitUrl: '/assets/aistudio/_______f69aabfe.png',
    portraitPos: '14% 28%',
    portraitScale: 2.55,
    portraitCrop: { widthPct: 440, leftPct: -26.1, topPct: -31.5 },
    baseHp: 120,
    baseStamina: 105,
    baseAttackMult: 1.05,
    moveSpeedMult: 1.0,
    baseCritChance: 0.08,
    attackRange: 3.4,
    starterWeapon: 'crystal_sword',
    starterArmor: 'pioneer_denim',
    defaultNickname: '냥기사',
    statBars: { hp: 92, atk: 78, spd: 68, crit: 52, util: 66 },
  },
  {
    id: 'archer',
    name: '궁수',
    catTitle: '궁수 냥이',
    roleLabel: '원거리 사수 · 치명타 연사',
    tagline: '리커브 활과 날렵한 회피 사격으로 원거리에서 적을 꿰뚫는 명사수',
    description: '긴 사거리에서 화살을 퍼붓고, 회피 도약과 화살 비로 몬스터의 접근을 허용하지 않는 기동형 원거리 딜러입니다.',
    accentHex: '#84cc16',
    portraitUrl: '/assets/aistudio/1795244111640_0b5d11e6.jpg',
    portraitPos: '13% 34%',
    portraitScale: 2.6,
    portraitCrop: { widthPct: 435, leftPct: -24.8, topPct: -30.7 },
    baseHp: 95,
    baseStamina: 120,
    baseAttackMult: 1.08,
    moveSpeedMult: 1.09,
    baseCritChance: 0.16,
    attackRange: 11.5,
    starterWeapon: 'recurve_bow',
    starterArmor: 'olive_puffer',
    defaultNickname: '궁수냥이',
    statBars: { hp: 66, atk: 84, spd: 88, crit: 86, util: 72 },
  },
  {
    id: 'healer',
    name: '힐러',
    catTitle: '힐러 냥이',
    roleLabel: '신성 치유 · 성광 수호',
    tagline: '황금 헤일로와 에메랄드 날개 지팡이로 생명을 수호하는 치유사',
    description: '공격과 동시에 체력을 회복하고 치유의 물결·성역의 폭발로 끈질긴 생존력을 자랑하는 신성 원거리 서포터입니다.',
    accentHex: '#34d399',
    portraitUrl: '/assets/aistudio/1795244109200_82c50c75.jpg',
    portraitPos: '13% 34%',
    portraitScale: 2.6,
    portraitCrop: { widthPct: 430, leftPct: -24.0, topPct: -28.6 },
    baseHp: 110,
    baseStamina: 115,
    baseAttackMult: 0.96,
    moveSpeedMult: 1.02,
    baseCritChance: 0.08,
    attackRange: 10.5,
    starterWeapon: 'emerald_wing_staff',
    starterArmor: 'cream_cardigan',
    defaultNickname: '힐러냥이',
    statBars: { hp: 82, atk: 68, spd: 72, crit: 54, util: 98 },
  },
  {
    id: 'mage',
    name: '마법사',
    catTitle: '마법사 냥이',
    roleLabel: '원거리 원소 · 초광역 폭딜',
    tagline: '별빛 고깔모자와 푸른 수정봉으로 원소 마법을 다루는 아케인 술사',
    description: '비전 수정탄, 서리 회오리, 유성 폭발 등 폭발적인 원거리 마법으로 보스와 몬스터 무리를 순식간에 제압합니다.',
    accentHex: '#a78bfa',
    portraitUrl: '/assets/aistudio/1795244105794_7ddd76d2.jpg',
    portraitPos: '13% 34%',
    portraitScale: 2.6,
    portraitCrop: { widthPct: 415, leftPct: -21.4, topPct: -25.8 },
    baseHp: 88,
    baseStamina: 125,
    baseAttackMult: 1.18,
    moveSpeedMult: 1.01,
    baseCritChance: 0.14,
    attackRange: 11.8,
    starterWeapon: 'crystal_wand',
    starterArmor: 'violet_hoodie',
    defaultNickname: '마법냥이',
    statBars: { hp: 58, atk: 96, spd: 70, crit: 78, util: 84 },
  },
  {
    id: 'rogue',
    name: '도둑',
    catTitle: '도둑 냥이',
    roleLabel: '초고속 암살 · 극치명타',
    tagline: '전술 고글과 강철 단검으로 그림자처럼 급습하는 민첩한 암살자',
    description: '가장 빠른 이동 속도와 연타 공격, 압도적인 치명타 확률로 단시간에 폭발적인 피해를 꽂아 넣는 근접 암살자입니다.',
    accentHex: '#38bdf8',
    portraitUrl: '/assets/aistudio/1795244107419_4b23728d.jpg',
    portraitPos: '13% 34%',
    portraitScale: 2.6,
    portraitCrop: { widthPct: 435, leftPct: -24.8, topPct: -30.7 },
    baseHp: 96,
    baseStamina: 130,
    baseAttackMult: 1.12,
    moveSpeedMult: 1.16,
    baseCritChance: 0.24,
    attackRange: 3.4,
    starterWeapon: 'tactical_dagger',
    starterArmor: 'stealth_cargo',
    defaultNickname: '도둑냥이',
    statBars: { hp: 64, atk: 90, spd: 98, crit: 96, util: 70 },
  },
];

export function getClassSpec(classId: PlayerClassId): PlayerClassSpec {
  return CLASS_CATALOG.find((c) => c.id === classId) || CLASS_CATALOG[0];
}

export interface Inventory {
  wood: number;
  stone: number;
  iron: number;
  crystal: number;
  leather: number;
  fang: number;
  essence: number;
  potion: number;
}

export interface ArmorSpec {
  id: ArmorId;
  name: string;
  tierLabel: string;
  description: string;
  bonusHp: number;
  damageReduction: number; // 0..0.55
  bonusStamina: number;
  accentHex: string;
  classId?: PlayerClassId;
  cost: Partial<Inventory>;
}

export const ARMORS_CATALOG: ArmorSpec[] = [
  // ---- WARRIOR ARMORS ----
  {
    id: 'pioneer_denim',
    name: '개척자 데님 재킷',
    tierLabel: '전사 기본 복장',
    description: '활동성이 뛰어난 기본 청재킷과 누빔 가죽 조끼입니다.',
    bonusHp: 0,
    damageReduction: 0.05,
    bonusStamina: 0,
    accentHex: '#60a5fa',
    classId: 'warrior',
    cost: {},
  },
  {
    id: 'wild_leather',
    name: '야수 가죽 사냥복',
    tierLabel: '전사 가죽 갑옷',
    description: '질긴 몬스터 가죽 견갑과 야수 송곳니 목걸이로 완성한 사냥꾼 갑옷입니다. 최대 HP +45 · 피해 감소 18%.',
    bonusHp: 45,
    damageReduction: 0.18,
    bonusStamina: 10,
    accentHex: '#fdba74',
    classId: 'warrior',
    cost: { leather: 3, fang: 1 },
  },
  {
    id: 'iron_plate',
    name: '강철 수호자 판금갑주',
    tierLabel: '전사 판금 갑주',
    description: '단조 강철 흉갑, 견갑, 정강이 보호대와 붉은 기사 망토를 갖춘 중갑입니다. 최대 HP +90 · 피해 감소 32%.',
    bonusHp: 90,
    damageReduction: 0.32,
    bonusStamina: 15,
    accentHex: '#cbd5e1',
    classId: 'warrior',
    cost: { iron: 4, leather: 3, stone: 2 },
  },
  {
    id: 'frost_wolf_cloak',
    name: '서리 늑대 모피 갑주',
    tierLabel: '전사 고원 갑주',
    description: '서리 늑대의 풍성한 은백 모피 어깨 망토와 빙결 버클로 감싼 고급 갑주입니다. 최대 HP +125 · 피해 감소 40% · 기력 +25.',
    bonusHp: 125,
    damageReduction: 0.4,
    bonusStamina: 25,
    accentHex: '#7dd3fc',
    classId: 'warrior',
    cost: { leather: 5, fang: 4, essence: 2 },
  },
  {
    id: 'rune_paladin',
    name: '룬 수정 성기사 갑주',
    tierLabel: '전사 전설 갑주',
    description: '푸른 룬 수정 코어, 황금 날개 견갑, 왕관 서클릿과 성기사 망토를 갖춘 최상급 갑주입니다. 최대 HP +175 · 피해 감소 50% · 기력 +40.',
    bonusHp: 175,
    damageReduction: 0.5,
    bonusStamina: 40,
    accentHex: '#fde047',
    classId: 'warrior',
    cost: { iron: 5, crystal: 3, essence: 3, leather: 4 },
  },

  // ---- ARCHER ARMORS ----
  {
    id: 'olive_puffer',
    name: '올리브 퀼팅 레인저 파카',
    tierLabel: '궁수 기본 복장',
    description: '보온성과 기동성을 겸비한 올리브 퀼팅 패딩과 가죽 화살통 세트입니다.',
    bonusHp: 0,
    damageReduction: 0.04,
    bonusStamina: 12,
    accentHex: '#84cc16',
    classId: 'archer',
    cost: {},
  },
  {
    id: 'forest_stalker',
    name: '숲추적자 가죽 코트',
    tierLabel: '궁수 고급 복장',
    description: '야수 가죽 견갑과 방풍 코트로 사격 안정성과 기력을 크게 높였습니다. 최대 HP +65 · 피해 감소 22% · 기력 +28.',
    bonusHp: 65,
    damageReduction: 0.22,
    bonusStamina: 28,
    accentHex: '#4ade80',
    classId: 'archer',
    cost: { leather: 3, fang: 2, wood: 3 },
  },
  {
    id: 'gale_hawk_garb',
    name: '질풍 매의 사냥 갑주',
    tierLabel: '궁수 전설 복장',
    description: '백호의 질풍 정수를 깃들인 은빛 모피 망토와 경량 룬 갑주입니다. 최대 HP +130 · 피해 감소 38% · 기력 +48.',
    bonusHp: 130,
    damageReduction: 0.38,
    bonusStamina: 48,
    accentHex: '#bef264',
    classId: 'archer',
    cost: { leather: 5, fang: 3, essence: 3, crystal: 2 },
  },

  // ---- HEALER ARMORS ----
  {
    id: 'cream_cardigan',
    name: '크림 니트 치유사 가디건',
    tierLabel: '힐러 기본 복장',
    description: '포근한 크림 니트 가디건과 금빛 문양 아이보리 튜닉, 가죽 벨트 조합입니다.',
    bonusHp: 10,
    damageReduction: 0.06,
    bonusStamina: 10,
    accentHex: '#fde68a',
    classId: 'healer',
    cost: {},
  },
  {
    id: 'ivory_acolyte',
    name: '성녀 아이보리 로브',
    tierLabel: '힐러 고급 예복',
    description: '마력 정수로 축복을 깃들인 순백의 치유 로브입니다. 최대 HP +80 · 피해 감소 26% · 기력 +25.',
    bonusHp: 80,
    damageReduction: 0.26,
    bonusStamina: 25,
    accentHex: '#6ee7b7',
    classId: 'healer',
    cost: { leather: 3, essence: 2, stone: 2 },
  },
  {
    id: 'seraph_vestment',
    name: '세라핌 성광 예복',
    tierLabel: '힐러 전설 예복',
    description: '황금 날개 견갑과 에메랄드 성광 망토로 보호받는 최상위 치유 예복입니다. 최대 HP +155 · 피해 감소 44% · 기력 +45.',
    bonusHp: 155,
    damageReduction: 0.44,
    bonusStamina: 45,
    accentHex: '#34d399',
    classId: 'healer',
    cost: { iron: 3, crystal: 3, essence: 4, leather: 3 },
  },

  // ---- MAGE ARMORS ----
  {
    id: 'violet_hoodie',
    name: '보라 별빛 마법사 후드',
    tierLabel: '마법사 기본 복장',
    description: '황금 별 고깔모자와 부드러운 보라빛 마법 후드티 세트입니다.',
    bonusHp: 0,
    damageReduction: 0.04,
    bonusStamina: 15,
    accentHex: '#a78bfa',
    classId: 'mage',
    cost: {},
  },
  {
    id: 'amethyst_robe',
    name: '자수정 학자 로브',
    tierLabel: '마법사 고급 로브',
    description: '마력 흐름을 증폭시키는 자수정 룬 망토와 마법사 의복입니다. 최대 HP +60 · 피해 감소 22% · 기력 +35.',
    bonusHp: 60,
    damageReduction: 0.22,
    bonusStamina: 35,
    accentHex: '#c084fc',
    classId: 'mage',
    cost: { leather: 3, essence: 2, iron: 2 },
  },
  {
    id: 'astral_archmage',
    name: '별빛 대마도사 예복',
    tierLabel: '마법사 전설 예복',
    description: '푸른 수정 코어와 성좌 망토를 두른 최상급 아케인 예복입니다. 최대 HP +125 · 피해 감소 40% · 기력 +55.',
    bonusHp: 125,
    damageReduction: 0.4,
    bonusStamina: 55,
    accentHex: '#818cf8',
    classId: 'mage',
    cost: { crystal: 4, essence: 4, iron: 3, leather: 3 },
  },

  // ---- ROGUE ARMORS ----
  {
    id: 'stealth_cargo',
    name: '차콜 스텔스 택티컬 수트',
    tierLabel: '도둑 기본 복장',
    description: '전술 고글과 은신용 차콜 후드, 카고 팬츠로 구성된 경량 암살 복장입니다.',
    bonusHp: 0,
    damageReduction: 0.05,
    bonusStamina: 18,
    accentHex: '#38bdf8',
    classId: 'rogue',
    cost: {},
  },
  {
    id: 'nightshade_gear',
    name: '밤그림자 정찰복',
    tierLabel: '도둑 고급 복장',
    description: '야수 가죽과 흑철 버클로 소음을 완전히 차단한 기습 전용 전투복입니다. 최대 HP +70 · 피해 감소 24% · 기력 +32.',
    bonusHp: 70,
    damageReduction: 0.24,
    bonusStamina: 32,
    accentHex: '#60a5fa',
    classId: 'rogue',
    cost: { leather: 4, fang: 2, iron: 2 },
  },
  {
    id: 'eclipse_shroud',
    name: '월식 암살자 예복',
    tierLabel: '도둑 전설 복장',
    description: '그림자 망토와 룬 강철 보호대를 결합한 최상급 암살자 갑주입니다. 최대 HP +140 · 피해 감소 42% · 기력 +50.',
    bonusHp: 140,
    damageReduction: 0.42,
    bonusStamina: 50,
    accentHex: '#22d3ee',
    classId: 'rogue',
    cost: { leather: 5, fang: 4, crystal: 3, essence: 3 },
  },
];

export const HOUSING_TILE_SIZE = 3.0;
export const HOUSING_WALL_HEIGHT = 2.7;

export type HousingKind =
  | 'floor'
  | 'wall'
  | 'half_wall'
  | 'fence'
  | 'pillar'
  | 'doorway'
  | 'door'
  | 'window_wall'
  | 'ceiling'
  | 'flat_roof'
  | 'roof'
  | 'stairs'
  | 'wall_torch'
  | 'ceiling_light'
  | 'bed'
  | 'chair'
  | 'table'
  | 'cabinet';

export type HousingSlotType =
  | 'cell'
  | 'edge'
  | 'corner'
  | 'wall_fixture'
  | 'ceiling_fixture'
  | 'furniture';

export type HousingStageId = 1 | 2 | 3 | 4 | 5 | 6;

export interface HousingStageSpec {
  id: HousingStageId;
  shortLabel: string;
  title: string;
  description: string;
}

export const HOUSING_STAGES: HousingStageSpec[] = [
  {
    id: 1,
    shortLabel: '1.토지확보',
    title: '1단계 · 토지 확보',
    description: '건축 가능 구역에 내 부지를 확보합니다. 부지 안의 나무·바위를 채집한 뒤 건축하면 자원이 다시 자라지 않습니다.',
  },
  {
    id: 2,
    shortLabel: '2.기초',
    title: '2단계 · 기초 설치',
    description: '바닥 타일과 지지 기둥으로 단단한 건축 기초를 다집니다.',
  },
  {
    id: 3,
    shortLabel: '3.골조',
    title: '3단계 · 골조 제작',
    description: '벽체, 천장, 경사 지붕, 연결 계단을 조립해 입체 골조를 세웁니다.',
  },
  {
    id: 4,
    shortLabel: '4.외부마감',
    title: '4단계 · 외부 마감',
    description: '창문 벽, 개방 출입구, 여닫이 문을 설치하고 자재와 색상을 마감합니다.',
  },
  {
    id: 5,
    shortLabel: '5.인테리어',
    title: '5단계 · 내부 인테리어',
    description: '침대, 의자, 테이블, 수납장, 벽횃불, 천장 조명을 자유롭게 배치합니다.',
  },
  {
    id: 6,
    shortLabel: '6.확장·개조',
    title: '6단계 · 확장 및 업그레이드',
    description: '설치된 부품을 선택해 복사, 이동, 자재 업그레이드 및 색상 일괄 변경으로 집을 증축합니다.',
  },
];

export type HousingEdge = 'n' | 'e' | 's' | 'w';

export type HousingMaterial = 'wood' | 'stone' | 'half_timber' | 'iron_fort';

export type HousingColorId =
  | 'natural'
  | 'ivory'
  | 'terracotta'
  | 'cedar'
  | 'sage'
  | 'cobalt'
  | 'charcoal'
  | 'ochre';

export interface HousingColorSpec {
  id: HousingColorId;
  label: string;
  swatchHex: string;
  tintHex: number; // ignored when id === 'natural'
  roofHex: number;
}

export const HOUSING_COLORS: HousingColorSpec[] = [
  { id: 'natural', label: '자재 원색', swatchHex: '#d6c7b2', tintHex: 0xffffff, roofHex: 0xffffff },
  { id: 'ivory', label: '크림 아이보리', swatchHex: '#f3ebd8', tintHex: 0xf4ecd9, roofHex: 0xd4be9a },
  { id: 'terracotta', label: '테라코타 적토', swatchHex: '#c96348', tintHex: 0xd47157, roofHex: 0xb54830 },
  { id: 'cedar', label: '체스넛 브라운', swatchHex: '#8d5734', tintHex: 0x99613d, roofHex: 0x6f4124 },
  { id: 'sage', label: '세이지 그린', swatchHex: '#6f997a', tintHex: 0x7ba685, roofHex: 0x4d7357 },
  { id: 'cobalt', label: '로열 코발트', swatchHex: '#4a73a8', tintHex: 0x5c85ba, roofHex: 0x385a8a },
  { id: 'charcoal', label: '슬레이트 차콜', swatchHex: '#525e6e', tintHex: 0x5b6778, roofHex: 0x3b4554 },
  { id: 'ochre', label: '선셋 골드', swatchHex: '#d4a23e', tintHex: 0xdeb04e, roofHex: 0xb38228 },
];

export interface HousingMaterialSpec {
  id: HousingMaterial;
  label: string;
  shortLabel: string;
  swatchHex: string;
  accentHex: string;
  baseDurability: number;
  description: string;
}

export const HOUSING_MATERIALS: HousingMaterialSpec[] = [
  {
    id: 'wood',
    label: '원목 목조',
    shortLabel: '원목',
    swatchHex: '#9f6e3f',
    accentHex: '#634124',
    baseDurability: 120,
    description: '채집한 원목으로 빠르게 연결하는 따뜻한 목조 건축 자재 (내구도 120)',
  },
  {
    id: 'stone',
    label: '화강암 석조',
    shortLabel: '석재',
    swatchHex: '#8d949c',
    accentHex: '#5c646d',
    baseDurability: 260,
    description: '단단한 석재 블록을 쌓아 올리는 중후한 석조 자재 (내구도 260)',
  },
  {
    id: 'half_timber',
    label: '목석 하프팀버',
    shortLabel: '목석',
    swatchHex: '#e6d9c2',
    accentHex: '#b85239',
    baseDurability: 360,
    description: '원목 뼈대와 회반죽·기와가 어우러진 전통 양식 (내구도 360)',
  },
  {
    id: 'iron_fort',
    label: '강철 요새석',
    shortLabel: '강철',
    swatchHex: '#4b5d75',
    accentHex: '#2f3d52',
    baseDurability: 540,
    description: '석재와 철광석을 보강한 견고한 성채 건축 자재 (내구도 540)',
  },
];

export function getHousingPieceMaxDurability(
  kind: HousingKind,
  material: HousingMaterial,
): number {
  const matSpec = HOUSING_MATERIALS.find((m) => m.id === material) ?? HOUSING_MATERIALS[0];
  let mult = 1.0;
  if (kind === 'fence') mult = 1.65;
  else if (kind === 'pillar' || kind === 'wall') mult = 1.15;
  else if (kind === 'half_wall') mult = 0.85;
  else if (kind === 'door' || kind === 'doorway' || kind === 'window_wall') mult = 1.0;
  else if (kind === 'floor' || kind === 'ceiling' || kind === 'flat_roof' || kind === 'roof' || kind === 'stairs') mult = 0.95;
  else mult = 0.6;
  return Math.round(matSpec.baseDurability * mult);
}

export function getHousingRepairCost(material: HousingMaterial): Partial<Inventory> {
  if (material === 'iron_fort') return { iron: 1 };
  if (material === 'stone' || material === 'half_timber') return { stone: 1 };
  return { wood: 1 };
}

export interface HousingBlueprintSpec {
  kind: HousingKind;
  name: string;
  shortName: string;
  slotType: HousingSlotType;
  stage: HousingStageId;
  categoryLabel: string;
  description: string;
  baseWeight: number;
}

export const HOUSING_CATALOG: HousingBlueprintSpec[] = [
  {
    kind: 'floor',
    name: '바닥 타일',
    shortName: '바닥',
    slotType: 'cell',
    stage: 2,
    categoryLabel: '기초 · 바닥',
    description: '지면 경사에 맞춰 기둥이 자동 조절되는 3×3m 연결 바닥 타일입니다.',
    baseWeight: 1,
  },
  {
    kind: 'pillar',
    name: '기둥',
    shortName: '기둥',
    slotType: 'corner',
    stage: 2,
    categoryLabel: '기초 · 지지 기둥',
    description: '타일 모서리에 세우는 지지 기둥입니다. 기둥 위에도 기둥·천장·지붕을 자유롭게 올릴 수 있습니다.',
    baseWeight: 1,
  },
  {
    kind: 'fence',
    name: '방어 울타리',
    shortName: '울타리',
    slotType: 'edge',
    stage: 2,
    categoryLabel: '기초 · 고내구 방어벽',
    description: '몬스터의 침입을 차단하는 강화 울타리입니다. 일반 벽체보다 훨씬 높은 내구도(1.65배)를 지닙니다.',
    baseWeight: 1,
  },
  {
    kind: 'wall',
    name: '벽 타일',
    shortName: '벽',
    slotType: 'edge',
    stage: 3,
    categoryLabel: '골조 · 벽체',
    description: '타일 테두리에 스냅되며, 기존 벽 위에 조준하면 별도 층 설정 없이 바로 위로 증설됩니다.',
    baseWeight: 1,
  },
  {
    kind: 'half_wall',
    name: '반벽 (1/2 벽면)',
    shortName: '반벽',
    slotType: 'edge',
    stage: 3,
    categoryLabel: '골조 · 낮은 반벽',
    description: '일반 벽면의 절반 높이(1.35m) 작은 벽체입니다. 테라스 난간, 옥상 흉벽, 실내 칸막이·카운터로 활용하세요.',
    baseWeight: 1,
  },
  {
    kind: 'ceiling',
    name: '서까래 천장',
    shortName: '천장',
    slotType: 'cell',
    stage: 3,
    categoryLabel: '골조 · 실내 천장',
    description: '벽이나 기둥 위에 자동 연결되며 위층 바닥으로 걸어 다닐 수 있는 타일입니다.',
    baseWeight: 1,
  },
  {
    kind: 'flat_roof',
    name: '평면 천장 지붕',
    shortName: '평지붕',
    slotType: 'cell',
    stage: 3,
    categoryLabel: '골조 · 광폭 평지붕',
    description: '삼각 박공 없이 넓고 반듯하게 연결되는 평면 천장/옥상 구조물입니다. 대형 실내 천장 제작에 최적화되어 있습니다.',
    baseWeight: 1,
  },
  {
    kind: 'roof',
    name: '경사 지붕',
    shortName: '경사지붕',
    slotType: 'cell',
    stage: 3,
    categoryLabel: '골조 · 경사 지붕',
    description: '90° 또는 자유 회전해 이어 붙일 수 있는 아키에이지 스타일 경사 지붕 타일입니다.',
    baseWeight: 1,
  },
  {
    kind: 'stairs',
    name: '연결 계단',
    shortName: '계단',
    slotType: 'cell',
    stage: 3,
    categoryLabel: '골조 · 계단',
    description: '바닥에서 위층 천장·테라스로 직접 걸어 올라갈 수 있는 계단입니다.',
    baseWeight: 2,
  },
  {
    kind: 'doorway',
    name: '출입구 벽',
    shortName: '출입구',
    slotType: 'edge',
    stage: 4,
    categoryLabel: '외부마감 · 출입구',
    description: '문짝 없이 자유롭게 드나들 수 있는 아치 문틀형 개방 벽체입니다.',
    baseWeight: 1,
  },
  {
    kind: 'door',
    name: '여닫이 문',
    shortName: '문',
    slotType: 'edge',
    stage: 4,
    categoryLabel: '외부마감 · 문',
    description: 'F 키나 클릭으로 직접 열고 닫을 수 있는 경첩 여닫이 문과 문틀 세트입니다.',
    baseWeight: 1,
  },
  {
    kind: 'window_wall',
    name: '투명 유리창 벽',
    shortName: '투명창',
    slotType: 'edge',
    stage: 4,
    categoryLabel: '외부마감 · 투명 창문',
    description: '바깥 풍경과 몬스터의 접근이 훤히 보이는 투명 강화 유리창 벽체입니다.',
    baseWeight: 1,
  },
  {
    kind: 'bed',
    name: '원목 침대',
    shortName: '침대',
    slotType: 'furniture',
    stage: 5,
    categoryLabel: '인테리어 · 침구',
    description: '포근한 이불과 베개가 놓인 수제 원목 침대입니다. 색상을 바꿔 이불 톤을 꾸밀 수 있습니다.',
    baseWeight: 1,
  },
  {
    kind: 'chair',
    name: '원목 의자',
    shortName: '의자',
    slotType: 'furniture',
    stage: 5,
    categoryLabel: '인테리어 · 좌석',
    description: '쿠션 좌석이 올라간 등받이 원목 의자입니다. 테이블 주변에 자유 배치하세요.',
    baseWeight: 1,
  },
  {
    kind: 'table',
    name: '식탁 테이블',
    shortName: '테이블',
    slotType: 'furniture',
    stage: 5,
    categoryLabel: '인테리어 · 테이블',
    description: '테이블 러너와 촛대·머그컵이 올려진 아늑한 실내 원목 테이블입니다.',
    baseWeight: 1,
  },
  {
    kind: 'cabinet',
    name: '원목 수납장',
    shortName: '수납장',
    slotType: 'furniture',
    stage: 5,
    categoryLabel: '인테리어 · 수납',
    description: '황동 손잡이와 몰딩 장식이 들어간 2단 실내 수납장입니다.',
    baseWeight: 1,
  },
  {
    kind: 'wall_torch',
    name: '벽걸이 횃불',
    shortName: '벽횃불',
    slotType: 'wall_fixture',
    stage: 5,
    categoryLabel: '인테리어 · 벽조명',
    description: '벽면에 부착하는 단조 횃불입니다. 밤이 되면 자동으로 불꽃이 켜지고 낮에는 꺼집니다.',
    baseWeight: 1,
  },
  {
    kind: 'ceiling_light',
    name: '천장 조명',
    shortName: '천장등',
    slotType: 'ceiling_fixture',
    stage: 5,
    categoryLabel: '인테리어 · 천장등',
    description: '천장이나 지붕 아래 매다는 샹들리에 조명입니다. 야간 실내를 넓고 따뜻하게 밝혀줍니다.',
    baseWeight: 1,
  },
];

export function getHousingPieceCost(
  kind: HousingKind,
  material: HousingMaterial,
): Partial<Inventory> {
  if (kind === 'half_wall') {
    if (material === 'iron_fort') return { stone: 1, iron: 1 };
    if (material === 'half_timber') return { wood: 1, stone: 1 };
    if (material === 'stone') return { stone: 1 };
    return { wood: 1 };
  }
  if (kind === 'wall_torch') {
    if (material === 'iron_fort') return { wood: 1, iron: 1 };
    return { wood: 1 };
  }
  if (kind === 'ceiling_light') {
    if (material === 'iron_fort') return { iron: 1 };
    if (material === 'stone') return { stone: 1, wood: 1 };
    return { wood: 1, stone: 1 };
  }
  if (kind === 'bed') {
    return material === 'iron_fort' ? { wood: 1, iron: 1 } : { wood: 2 };
  }
  if (kind === 'chair') {
    return { wood: 1 };
  }
  if (kind === 'table') {
    return material === 'stone' ? { stone: 1, wood: 1 } : { wood: 2 };
  }
  if (kind === 'cabinet') {
    return material === 'iron_fort' ? { wood: 1, iron: 1 } : { wood: 2 };
  }
  const isHeavy = kind === 'stairs';
  switch (material) {
    case 'wood':
      return { wood: isHeavy ? 2 : 1 };
    case 'stone':
      return isHeavy ? { stone: 2, wood: 1 } : { stone: 1 };
    case 'half_timber':
      return isHeavy ? { wood: 2, stone: 2 } : { wood: 1, stone: 1 };
    case 'iron_fort':
      return isHeavy ? { stone: 2, iron: 2 } : { stone: 1, iron: 1 };
  }
}

export type HousingMode = 'off' | 'placing' | 'edit' | 'moving';

export interface PlacedHousingSnapshot {
  id: string;
  kind: HousingKind;
  name: string;
  material: HousingMaterial;
  color: HousingColorId;
  gx: number;
  gz: number;
  level: number;
  edge: HousingEdge | null;
  rotationStep: number; // 0..3 (90 deg increments)
  rotationY: number; // actual radians (supports free rotation)
  gridSnapped: boolean;
  heightOffset: number;
  baseY: number;
  x: number;
  z: number;
  isDoorOpen?: boolean;
  durability: number;
  maxDurability: number;
  ownerId?: string;
}

export interface HousingHudState {
  mode: HousingMode;
  activeStage: HousingStageId;
  selectedBlueprint: HousingKind;
  selectedMaterial: HousingMaterial;
  selectedColor: HousingColorId;
  gridSnap: boolean;
  freeRotate: boolean;
  heightOffset: number;
  previewValid: boolean;
  previewReason: string | null;
  previewSnapped: boolean;
  previewRotationDeg: number;
  previewLevel: number;
  selectedHouse: PlacedHousingSnapshot | null;
  placedCount: number;
  claimedPlotsCount: number;
  inClaimedPlot: boolean;
  canClaimPlotHere: boolean;
  claimPlotReason: string | null;
  inCompletedHouse: boolean;
  completedHouseRoomCount: number;
  damagedPieceCount: number;
}

export interface SaveMetaSummary {
  savedAt: number;
  worldTier: number;
  level: number;
  housingCount: number;
  playerClass?: PlayerClassId;
}

export interface WeaponSpec {
  id: WeaponId;
  name: string;
  category: WeaponCategory;
  specialtyLabel: string;
  description: string;
  treeDamage: number;
  rockDamage: number;
  monsterDamage: number;
  woodBonus: number;
  mineralBonus: number;
  swingSpeedMult: number;
  classId?: PlayerClassId; // undefined = universal gathering tool
  attackRange?: number;
  critBonus?: number;
  healOnHit?: number;
  cost: Partial<Inventory>;
}

export const WEAPONS_CATALOG: WeaponSpec[] = [
  // ---- UNIVERSAL GATHERING TOOLS ----
  {
    id: 'stone_axe',
    name: '석재 벌목 도끼',
    category: 'axe',
    specialtyLabel: '공용 벌목 특화',
    description: '화강암 날을 원목 자루에 묶은 도끼입니다. 나무 피해 2배 · 원목 +1 추가 획득.',
    treeDamage: 2,
    rockDamage: 1,
    monsterDamage: 16,
    woodBonus: 1,
    mineralBonus: 0,
    swingSpeedMult: 1.06,
    cost: { wood: 3, stone: 2 },
  },
  {
    id: 'stone_pickaxe',
    name: '석재 채광 곡괭이',
    category: 'pickaxe',
    specialtyLabel: '공용 채광 특화',
    description: '양날 석재 곡괭이입니다. 바위·광맥 피해 2배 · 석재/광석 +1 추가 획득.',
    treeDamage: 1,
    rockDamage: 2,
    monsterDamage: 15,
    woodBonus: 0,
    mineralBonus: 1,
    swingSpeedMult: 1.06,
    cost: { wood: 2, stone: 4 },
  },
  {
    id: 'iron_axe',
    name: '제련 강철 도끼',
    category: 'axe',
    specialtyLabel: '공용 고급 벌목',
    description: '철광석을 제련해 만든 날카로운 도끼입니다. 나무 피해 3배 · 원목 +2 추가 획득.',
    treeDamage: 3,
    rockDamage: 1,
    monsterDamage: 24,
    woodBonus: 2,
    mineralBonus: 0,
    swingSpeedMult: 1.18,
    cost: { wood: 4, stone: 2, iron: 3 },
  },
  {
    id: 'iron_pickaxe',
    name: '제련 강철 곡괭이',
    category: 'pickaxe',
    specialtyLabel: '공용 고급 채광',
    description: '강철로 단조한 전문 채광 곡괭이입니다. 바위·광맥 피해 3배 · 광물 +2 추가 획득.',
    treeDamage: 1,
    rockDamage: 3,
    monsterDamage: 22,
    woodBonus: 0,
    mineralBonus: 2,
    swingSpeedMult: 1.18,
    cost: { wood: 3, stone: 3, iron: 4 },
  },

  // ---- WARRIOR WEAPONS ----
  {
    id: 'crystal_sword',
    name: '수정 단검',
    category: 'sword',
    specialtyLabel: '전사 기본 무장',
    description: '가볍고 균형 잡힌 전사 기본 수정 검입니다. 야간에 은은한 청록 빛을 냅니다.',
    treeDamage: 1,
    rockDamage: 1,
    monsterDamage: 16,
    woodBonus: 0,
    mineralBonus: 0,
    swingSpeedMult: 1.04,
    classId: 'warrior',
    cost: {},
  },
  {
    id: 'hunter_blade',
    name: '야수 송곳니 장검',
    category: 'sword',
    specialtyLabel: '전사 사냥 특화',
    description: '몬스터 가죽으로 손잡이를 감싸고 송곳니를 단조한 사냥검입니다. 몬스터 피해 34.',
    treeDamage: 1,
    rockDamage: 1,
    monsterDamage: 34,
    woodBonus: 0,
    mineralBonus: 0,
    swingSpeedMult: 1.16,
    classId: 'warrior',
    cost: { wood: 2, stone: 2, leather: 3, fang: 2 },
  },
  {
    id: 'essence_battleaxe',
    name: '마력 정수 전투도끼',
    category: 'axe',
    specialtyLabel: '전사 사냥·벌목',
    description: '가죽과 마력 정수를 주입해 제련한 중형 전투도끼입니다. 몬스터 피해 44 · 나무 피해 3배.',
    treeDamage: 3,
    rockDamage: 2,
    monsterDamage: 44,
    woodBonus: 2,
    mineralBonus: 0,
    swingSpeedMult: 1.15,
    classId: 'warrior',
    cost: { wood: 3, iron: 2, leather: 4, essence: 3 },
  },
  {
    id: 'rune_greatsword',
    name: '룬 수정 대검',
    category: 'sword',
    specialtyLabel: '전사 전설 무장',
    description: '철·마력 수정·정수를 결합한 대검입니다. 몬스터 피해 58 · 모든 자원 +2 추가 획득.',
    treeDamage: 3,
    rockDamage: 3,
    monsterDamage: 58,
    woodBonus: 2,
    mineralBonus: 2,
    swingSpeedMult: 1.24,
    classId: 'warrior',
    cost: { wood: 5, stone: 4, iron: 4, crystal: 2, essence: 2 },
  },

  // ---- ARCHER WEAPONS ----
  {
    id: 'recurve_bow',
    name: '사냥꾼 리커브 활',
    category: 'bow',
    specialtyLabel: '궁수 기본 활',
    description: '탄성이 뛰어난 흑단 리커브 활입니다. 원거리(11.5m) 화살 사격 · 치명타 +8%.',
    treeDamage: 1,
    rockDamage: 1,
    monsterDamage: 17,
    woodBonus: 0,
    mineralBonus: 0,
    swingSpeedMult: 1.12,
    classId: 'archer',
    attackRange: 11.5,
    critBonus: 0.08,
    cost: {},
  },
  {
    id: 'windstrider_bow',
    name: '질풍 장궁',
    category: 'bow',
    specialtyLabel: '궁수 고급 활',
    description: '송곳니 화살촉과 질풍 현을 엮은 명궁입니다. 원거리 피해 36 · 치명타 +14%.',
    treeDamage: 1,
    rockDamage: 1,
    monsterDamage: 36,
    woodBonus: 0,
    mineralBonus: 0,
    swingSpeedMult: 1.24,
    classId: 'archer',
    attackRange: 13.0,
    critBonus: 0.14,
    cost: { wood: 4, leather: 3, fang: 2 },
  },
  {
    id: 'azure_star_bow',
    name: '청룡 성궁',
    category: 'bow',
    specialtyLabel: '궁수 전설 활',
    description: '마력 수정으로 빚은 전설의 활입니다. 원거리 피해 56 · 초고속 연사 · 치명타 +22%.',
    treeDamage: 2,
    rockDamage: 2,
    monsterDamage: 56,
    woodBonus: 1,
    mineralBonus: 1,
    swingSpeedMult: 1.34,
    classId: 'archer',
    attackRange: 14.5,
    critBonus: 0.22,
    cost: { wood: 5, iron: 3, crystal: 3, essence: 3 },
  },

  // ---- HEALER WEAPONS ----
  {
    id: 'emerald_wing_staff',
    name: '에메랄드 날개 지팡이',
    category: 'staff',
    specialtyLabel: '힐러 기본 지팡이',
    description: '순백 날개와 에메랄드 보석이 빛나는 치유사의 지팡이입니다. 원거리 성광 공격 · 적중 시 HP +3 회복.',
    treeDamage: 1,
    rockDamage: 1,
    monsterDamage: 15,
    woodBonus: 0,
    mineralBonus: 0,
    swingSpeedMult: 1.08,
    classId: 'healer',
    attackRange: 10.5,
    healOnHit: 3,
    cost: {},
  },
  {
    id: 'sanctuary_staff',
    name: '성역의 치유 지팡이',
    category: 'staff',
    specialtyLabel: '힐러 고급 지팡이',
    description: '성스러운 마력 정수를 담은 지팡이입니다. 원거리 피해 32 · 적중 시 HP +6 회복.',
    treeDamage: 1,
    rockDamage: 1,
    monsterDamage: 32,
    woodBonus: 0,
    mineralBonus: 0,
    swingSpeedMult: 1.18,
    classId: 'healer',
    attackRange: 11.8,
    healOnHit: 6,
    cost: { wood: 3, stone: 2, essence: 3, leather: 2 },
  },
  {
    id: 'seraphic_staff',
    name: '세라핌 성광 지팡이',
    category: 'staff',
    specialtyLabel: '힐러 전설 지팡이',
    description: '천사의 축복이 깃든 성광 지팡이입니다. 원거리 피해 50 · 적중 시 HP +10 회복.',
    treeDamage: 2,
    rockDamage: 2,
    monsterDamage: 50,
    woodBonus: 1,
    mineralBonus: 1,
    swingSpeedMult: 1.26,
    classId: 'healer',
    attackRange: 13.0,
    healOnHit: 10,
    cost: { wood: 4, iron: 3, crystal: 3, essence: 4 },
  },

  // ---- MAGE WEAPONS ----
  {
    id: 'crystal_wand',
    name: '푸른 수정 마법봉',
    category: 'wand',
    specialtyLabel: '마법사 기본 마법봉',
    description: '푸른 수정 결정이 박힌 원목 마법봉입니다. 원거리(11.8m) 비전 구체 발사.',
    treeDamage: 1,
    rockDamage: 1,
    monsterDamage: 19,
    woodBonus: 0,
    mineralBonus: 0,
    swingSpeedMult: 1.1,
    classId: 'mage',
    attackRange: 11.8,
    critBonus: 0.06,
    cost: {},
  },
  {
    id: 'amethyst_wand',
    name: '자수정 비전 지팡이',
    category: 'wand',
    specialtyLabel: '마법사 고급 마법봉',
    description: '자수정 코어로 주문 위력을 증폭시킨 지팡이입니다. 원거리 피해 40 · 치명타 +12%.',
    treeDamage: 1,
    rockDamage: 2,
    monsterDamage: 40,
    woodBonus: 0,
    mineralBonus: 1,
    swingSpeedMult: 1.2,
    classId: 'mage',
    attackRange: 13.2,
    critBonus: 0.12,
    cost: { wood: 3, iron: 2, essence: 3, fang: 2 },
  },
  {
    id: 'astral_nova_staff',
    name: '별빛 대마도사 지팡이',
    category: 'wand',
    specialtyLabel: '마법사 전설 지팡이',
    description: '성좌의 마력이 응집된 대마도사의 지팡이입니다. 원거리 피해 62 · 치명타 +18%.',
    treeDamage: 2,
    rockDamage: 3,
    monsterDamage: 62,
    woodBonus: 1,
    mineralBonus: 2,
    swingSpeedMult: 1.28,
    classId: 'mage',
    attackRange: 14.8,
    critBonus: 0.18,
    cost: { wood: 4, crystal: 4, essence: 4, iron: 3 },
  },

  // ---- ROGUE WEAPONS ----
  {
    id: 'tactical_dagger',
    name: '전술 강철 단검',
    category: 'dagger',
    specialtyLabel: '도둑 기본 단검',
    description: '가볍고 예리한 무광 흑철 전술 단검입니다. 초고속 공격 속도 · 치명타 +15%.',
    treeDamage: 1,
    rockDamage: 1,
    monsterDamage: 16,
    woodBonus: 0,
    mineralBonus: 0,
    swingSpeedMult: 1.32,
    classId: 'rogue',
    critBonus: 0.15,
    cost: {},
  },
  {
    id: 'viper_dagger',
    name: '맹독 쌍아 단검',
    category: 'dagger',
    specialtyLabel: '도둑 고급 단검',
    description: '야수 송곳니와 독 정수를 결합한 암살 단검입니다. 초고속 연타 피해 34 · 치명타 +22%.',
    treeDamage: 1,
    rockDamage: 1,
    monsterDamage: 34,
    woodBonus: 0,
    mineralBonus: 0,
    swingSpeedMult: 1.44,
    classId: 'rogue',
    critBonus: 0.22,
    cost: { iron: 2, leather: 3, fang: 3, essence: 1 },
  },
  {
    id: 'eclipse_dagger',
    name: '월식 그림자 단검',
    category: 'dagger',
    specialtyLabel: '도둑 전설 단검',
    description: '푸른 룬 기운이 흐르는 암살자의 비검입니다. 극속 피해 54 · 치명타 +30%.',
    treeDamage: 2,
    rockDamage: 2,
    monsterDamage: 54,
    woodBonus: 1,
    mineralBonus: 1,
    swingSpeedMult: 1.56,
    classId: 'rogue',
    critBonus: 0.3,
    cost: { iron: 4, crystal: 3, fang: 4, essence: 3 },
  },
];

export type NodeKind =
  | 'oak_tree'
  | 'pine_tree'
  | 'birch_tree'
  | 'granite_rock'
  | 'iron_vein'
  | 'crystal_cluster'
  | 'workbench'
  | 'frontier_stone'
  | 'signpost'
  | 'trial_tower'
  | 'monster'
  | 'housing';

export type ElementKind = 'water' | 'fire' | 'wind' | 'earth' | 'holy';

export interface ElementMeta {
  id: ElementKind;
  label: string;
  shortLabel: string;
  hex: string;
  bgHex: string;
}

export const ELEMENT_META: Record<ElementKind, ElementMeta> = {
  water: { id: 'water', label: '수(물)', shortLabel: '물', hex: '#38bdf8', bgHex: '#0c2c3d' },
  fire: { id: 'fire', label: '화(불)', shortLabel: '불', hex: '#fb7185', bgHex: '#3b151e' },
  wind: { id: 'wind', label: '풍(바람)', shortLabel: '바람', hex: '#34d399', bgHex: '#0e2f24' },
  earth: { id: 'earth', label: '토(대지)', shortLabel: '대지', hex: '#fbbf24', bgHex: '#35260c' },
  holy: { id: 'holy', label: '성(빛)', shortLabel: '빛', hex: '#fde047', bgHex: '#362f0f' },
};

export type SpiritRank = 'baby' | 'lesser' | 'mid' | 'high' | 'grand' | 'king';

export interface SpiritRankSpec {
  rank: SpiritRank;
  prefix: string;
  scale: number;
  hpMult: number;
  atkMult: number;
  isBoss: boolean;
  expMult: number;
}

export const SPIRIT_RANK_META: Record<SpiritRank, SpiritRankSpec> = {
  baby: { rank: 'baby', prefix: '최하급 아기', scale: 0.72, hpMult: 0.72, atkMult: 0.75, isBoss: false, expMult: 0.85 },
  lesser: { rank: 'lesser', prefix: '하급', scale: 0.94, hpMult: 1.0, atkMult: 1.0, isBoss: false, expMult: 1.15 },
  mid: { rank: 'mid', prefix: '중급', scale: 1.18, hpMult: 1.55, atkMult: 1.32, isBoss: false, expMult: 1.65 },
  high: { rank: 'high', prefix: '상급', scale: 1.42, hpMult: 2.35, atkMult: 1.72, isBoss: false, expMult: 2.4 },
  grand: { rank: 'grand', prefix: '최상급', scale: 1.72, hpMult: 3.6, atkMult: 2.25, isBoss: false, expMult: 3.6 },
  king: { rank: 'king', prefix: '정령왕', scale: 2.35, hpMult: 9.5, atkMult: 3.2, isBoss: true, expMult: 9.0 },
};

export type MonsterSpecies =
  | 'meadow_boar'
  | 'forest_slime'
  | 'water_slime'
  | 'fire_slime'
  | 'wind_slime'
  | 'earth_slime'
  | 'water_spirit'
  | 'wind_spirit'
  | 'fire_spirit'
  | 'earth_spirit'
  | 'ember_wolf'
  | 'frost_wolf'
  | 'night_skeleton'
  | 'night_wraith'
  | 'azure_dragon_boss'
  | 'white_tiger_boss'
  | 'vermilion_phoenix_boss'
  | 'black_tortoise_boss'
  | 'elder_tusk_boss'
  | 'alpha_frost_boss'
  | 'rune_golem_boss'
  | 'coastal_titan_boss';

export function getMonsterElementProfile(species: MonsterSpecies): {
  element: ElementKind;
  weakness: ElementKind;
} {
  switch (species) {
    case 'water_slime':
    case 'water_spirit':
    case 'azure_dragon_boss':
    case 'coastal_titan_boss':
    case 'frost_wolf':
    case 'alpha_frost_boss':
      return { element: 'water', weakness: 'earth' };
    case 'fire_slime':
    case 'fire_spirit':
    case 'ember_wolf':
    case 'vermilion_phoenix_boss':
      return { element: 'fire', weakness: 'water' };
    case 'wind_slime':
    case 'wind_spirit':
    case 'white_tiger_boss':
    case 'forest_slime':
      return { element: 'wind', weakness: 'fire' };
    case 'earth_slime':
    case 'earth_spirit':
    case 'meadow_boar':
    case 'elder_tusk_boss':
    case 'black_tortoise_boss':
    case 'rune_golem_boss':
      return { element: 'earth', weakness: 'wind' };
    case 'night_skeleton':
    case 'night_wraith':
      return { element: 'earth', weakness: 'holy' };
    default:
      return { element: 'earth', weakness: 'fire' };
  }
}

export type WarriorSkillId = 'whirlwind' | 'vanguard_dash' | 'earthbreaker' | 'warcry';

export interface WarriorSkillSpec {
  id: WarriorSkillId;
  name: string;
  shortName: string;
  hotkey: string;
  description: string;
  staminaCost: number;
  baseCooldown: number;
  cooldownPerRank: number;
  baseDamageMult: number; // 0 for buff skills
  damageMultPerRank: number;
  baseRadius: number;
  radiusPerRank: number;
  maxRank: number;
  accentHex: string;
}

export const CLASS_SKILLS_BY_CLASS: Record<PlayerClassId, WarriorSkillSpec[]> = {
  warrior: [
    {
      id: 'whirlwind',
      name: '회전 베기',
      shortName: '회전베기',
      hotkey: 'Q',
      description: '검기를 휘감고 360° 회전하며 주변 모든 적을 베어 넘깁니다.',
      staminaCost: 22,
      baseCooldown: 6.0,
      cooldownPerRank: 0.45,
      baseDamageMult: 1.75,
      damageMultPerRank: 0.3,
      baseRadius: 4.1,
      radiusPerRank: 0.3,
      maxRank: 5,
      accentHex: '#38bdf8',
    },
    {
      id: 'vanguard_dash',
      name: '전사의 돌진',
      shortName: '돌진찌르기',
      hotkey: 'E',
      description: '전방으로 빠르게 쇄도해 강력한 일격을 가하고 보스의 강타 시전을 차단합니다.',
      staminaCost: 20,
      baseCooldown: 7.5,
      cooldownPerRank: 0.55,
      baseDamageMult: 2.1,
      damageMultPerRank: 0.35,
      baseRadius: 3.4,
      radiusPerRank: 0.22,
      maxRank: 5,
      accentHex: '#f59e0b',
    },
    {
      id: 'earthbreaker',
      name: '대지 분쇄',
      shortName: '대지분쇄',
      hotkey: 'R',
      description: '도약 후 지면을 강타해 충격파로 광역 피해를 주고 적을 밀쳐냅니다.',
      staminaCost: 28,
      baseCooldown: 10.0,
      cooldownPerRank: 0.75,
      baseDamageMult: 2.45,
      damageMultPerRank: 0.4,
      baseRadius: 4.8,
      radiusPerRank: 0.35,
      maxRank: 5,
      accentHex: '#fb7185',
    },
    {
      id: 'warcry',
      name: '불굴의 포효',
      shortName: '불굴포효',
      hotkey: 'T',
      description: '체력과 기력을 즉시 회복하고 일정 시간 공격력과 피해 감소를 크게 높입니다.',
      staminaCost: 15,
      baseCooldown: 16.0,
      cooldownPerRank: 1.1,
      baseDamageMult: 0,
      damageMultPerRank: 0,
      baseRadius: 5.0,
      radiusPerRank: 0.4,
      maxRank: 5,
      accentHex: '#fde047',
    },
  ],
  archer: [
    {
      id: 'whirlwind',
      name: '다중 화살 사격',
      shortName: '다중사격',
      hotkey: 'Q',
      description: '전방 부채꼴로 관통 화살 3발을 동시 발사해 원거리 적 무리를 꿰뚫습니다.',
      staminaCost: 18,
      baseCooldown: 5.2,
      cooldownPerRank: 0.4,
      baseDamageMult: 1.85,
      damageMultPerRank: 0.32,
      baseRadius: 12.0,
      radiusPerRank: 0.7,
      maxRank: 5,
      accentHex: '#84cc16',
    },
    {
      id: 'vanguard_dash',
      name: '회피 도약 사격',
      shortName: '도약사격',
      hotkey: 'E',
      description: '후방으로 날렵하게 도약하며 충격 화살을 쏴 보스 강타 시전을 차단하고 둔화시킵니다.',
      staminaCost: 18,
      baseCooldown: 6.8,
      cooldownPerRank: 0.5,
      baseDamageMult: 2.05,
      damageMultPerRank: 0.34,
      baseRadius: 12.5,
      radiusPerRank: 0.6,
      maxRank: 5,
      accentHex: '#f59e0b',
    },
    {
      id: 'earthbreaker',
      name: '화살 비',
      shortName: '화살비',
      hotkey: 'R',
      description: '목표 지점 하늘에서 수많은 화살을 쏟아부어 광역 피해와 이동 둔화를 입힙니다.',
      staminaCost: 26,
      baseCooldown: 9.5,
      cooldownPerRank: 0.7,
      baseDamageMult: 2.5,
      damageMultPerRank: 0.42,
      baseRadius: 5.6,
      radiusPerRank: 0.4,
      maxRank: 5,
      accentHex: '#38bdf8',
    },
    {
      id: 'warcry',
      name: '매의 눈',
      shortName: '매의눈',
      hotkey: 'T',
      description: '기력을 대폭 회복하고 일정 시간 공격력, 치명타 확률, 이동 속도를 극대화합니다.',
      staminaCost: 12,
      baseCooldown: 15.0,
      cooldownPerRank: 1.0,
      baseDamageMult: 0,
      damageMultPerRank: 0,
      baseRadius: 5.0,
      radiusPerRank: 0.3,
      maxRank: 5,
      accentHex: '#bef264',
    },
  ],
  healer: [
    {
      id: 'whirlwind',
      name: '빛의 심판',
      shortName: '빛의심판',
      hotkey: 'Q',
      description: '에메랄드 성광 구체를 발사해 원거리 적과 주변 대상에게 신성 피해를 입힙니다.',
      staminaCost: 18,
      baseCooldown: 5.5,
      cooldownPerRank: 0.42,
      baseDamageMult: 1.7,
      damageMultPerRank: 0.3,
      baseRadius: 11.0,
      radiusPerRank: 0.6,
      maxRank: 5,
      accentHex: '#34d399',
    },
    {
      id: 'vanguard_dash',
      name: '치유의 물결',
      shortName: '치유물결',
      hotkey: 'E',
      description: '즉시 체력을 크게 회복하고 성광 파동으로 주변 적을 밀쳐내며 보스 시전을 차단합니다.',
      staminaCost: 22,
      baseCooldown: 7.5,
      cooldownPerRank: 0.55,
      baseDamageMult: 1.35,
      damageMultPerRank: 0.25,
      baseRadius: 5.2,
      radiusPerRank: 0.35,
      maxRank: 5,
      accentHex: '#6ee7b7',
    },
    {
      id: 'earthbreaker',
      name: '성역의 폭발',
      shortName: '성역폭발',
      hotkey: 'R',
      description: '황금 성역을 전개해 범위 내 모든 적에게 강력한 신성 피해를 주고 체력을 회복합니다.',
      staminaCost: 26,
      baseCooldown: 10.0,
      cooldownPerRank: 0.72,
      baseDamageMult: 2.3,
      damageMultPerRank: 0.38,
      baseRadius: 5.8,
      radiusPerRank: 0.4,
      maxRank: 5,
      accentHex: '#fde047',
    },
    {
      id: 'warcry',
      name: '천사의 축복',
      shortName: '천사축복',
      hotkey: 'T',
      description: '체력과 기력을 대량 회복하고 일정 시간 높은 방어력과 지속 보호막을 부여합니다.',
      staminaCost: 16,
      baseCooldown: 15.5,
      cooldownPerRank: 1.05,
      baseDamageMult: 0,
      damageMultPerRank: 0,
      baseRadius: 6.0,
      radiusPerRank: 0.4,
      maxRank: 5,
      accentHex: '#fef08a',
    },
  ],
  mage: [
    {
      id: 'whirlwind',
      name: '비전 수정탄',
      shortName: '수정탄',
      hotkey: 'Q',
      description: '추적 성질의 푸른 비전 수정탄을 연사해 원거리 적에게 폭발 피해를 입힙니다.',
      staminaCost: 20,
      baseCooldown: 5.0,
      cooldownPerRank: 0.38,
      baseDamageMult: 1.95,
      damageMultPerRank: 0.34,
      baseRadius: 12.5,
      radiusPerRank: 0.7,
      maxRank: 5,
      accentHex: '#38bdf8',
    },
    {
      id: 'vanguard_dash',
      name: '서리 회오리',
      shortName: '서리회오리',
      hotkey: 'E',
      description: '주변에 혹한의 서리 고리를 터뜨려 적을 얼려 둔화시키고 보스 강타 시전을 차단합니다.',
      staminaCost: 22,
      baseCooldown: 7.2,
      cooldownPerRank: 0.52,
      baseDamageMult: 1.9,
      damageMultPerRank: 0.32,
      baseRadius: 5.5,
      radiusPerRank: 0.38,
      maxRank: 5,
      accentHex: '#7dd3fc',
    },
    {
      id: 'earthbreaker',
      name: '유성 폭발',
      shortName: '유성폭발',
      hotkey: 'R',
      description: '목표 지점에 별빛 유성을 낙하시켜 압도적인 초광역 마법 폭발을 일으킵니다.',
      staminaCost: 30,
      baseCooldown: 10.5,
      cooldownPerRank: 0.8,
      baseDamageMult: 2.85,
      damageMultPerRank: 0.48,
      baseRadius: 5.8,
      radiusPerRank: 0.42,
      maxRank: 5,
      accentHex: '#c084fc',
    },
    {
      id: 'warcry',
      name: '마력 방벽',
      shortName: '마력방벽',
      hotkey: 'T',
      description: '비전 마력 보호막을 펼쳐 피해 감소와 주문 공격력을 크게 높이고 기력을 회복합니다.',
      staminaCost: 14,
      baseCooldown: 15.5,
      cooldownPerRank: 1.05,
      baseDamageMult: 0,
      damageMultPerRank: 0,
      baseRadius: 5.0,
      radiusPerRank: 0.35,
      maxRank: 5,
      accentHex: '#a78bfa',
    },
  ],
  rogue: [
    {
      id: 'whirlwind',
      name: '그림자 연격',
      shortName: '그림자연격',
      hotkey: 'Q',
      description: '눈에 보이지 않는 속도로 단검을 연속 난무해 주변 적에게 치명적인 피해를 입힙니다.',
      staminaCost: 18,
      baseCooldown: 4.8,
      cooldownPerRank: 0.38,
      baseDamageMult: 1.95,
      damageMultPerRank: 0.34,
      baseRadius: 3.9,
      radiusPerRank: 0.28,
      maxRank: 5,
      accentHex: '#38bdf8',
    },
    {
      id: 'vanguard_dash',
      name: '환영 습격',
      shortName: '환영습격',
      hotkey: 'E',
      description: '적의 배후로 순간 도약해 급소를 찌르고 보스의 강타 시전을 즉시 차단합니다.',
      staminaCost: 18,
      baseCooldown: 6.5,
      cooldownPerRank: 0.48,
      baseDamageMult: 2.35,
      damageMultPerRank: 0.4,
      baseRadius: 3.8,
      radiusPerRank: 0.25,
      maxRank: 5,
      accentHex: '#818cf8',
    },
    {
      id: 'earthbreaker',
      name: '독침 부채꼴',
      shortName: '독침투척',
      hotkey: 'R',
      description: '전방위로 맹독 단검을 흩뿌려 넓은 범위의 적에게 강한 피해와 둔화를 겁니다.',
      staminaCost: 24,
      baseCooldown: 8.8,
      cooldownPerRank: 0.65,
      baseDamageMult: 2.4,
      damageMultPerRank: 0.4,
      baseRadius: 6.2,
      radiusPerRank: 0.42,
      maxRank: 5,
      accentHex: '#4ade80',
    },
    {
      id: 'warcry',
      name: '은신 가속',
      shortName: '은신가속',
      hotkey: 'T',
      description: '그림자 장막을 둘러 체력과 기력을 회복하고 이동 속도·치명타·공격력을 극대화합니다.',
      staminaCost: 12,
      baseCooldown: 14.5,
      cooldownPerRank: 1.0,
      baseDamageMult: 0,
      damageMultPerRank: 0,
      baseRadius: 4.5,
      radiusPerRank: 0.3,
      maxRank: 5,
      accentHex: '#22d3ee',
    },
  ],
};

export function getClassSkillsCatalog(classId: PlayerClassId): WarriorSkillSpec[] {
  return CLASS_SKILLS_BY_CLASS[classId] || CLASS_SKILLS_BY_CLASS.warrior;
}

export const WARRIOR_SKILLS_CATALOG: WarriorSkillSpec[] = CLASS_SKILLS_BY_CLASS.warrior;

export interface WarriorSkillSnapshot {
  id: WarriorSkillId;
  rank: number;
  maxRank: number;
  cooldownRemaining: number;
  cooldownTotal: number;
  staminaCost: number;
  damageMult: number;
  radius: number;
  buffDuration: number;
  healPct: number;
  atkBonusPct: number;
  defBonusPct: number;
}

export type ProficiencyId = 'combat' | 'logging' | 'mining' | 'craft';

export interface ProficiencySpec {
  id: ProficiencyId;
  name: string;
  shortName: string;
  description: string;
  bonusPerLevelLabel: string;
  accentHex: string;
}

export const PROFICIENCY_CATALOG: ProficiencySpec[] = [
  {
    id: 'combat',
    name: '전투 숙련',
    shortName: '전투',
    description: '몬스터 사냥, 전사 스킬 사용, 중간 보스 토벌로 성장합니다.',
    bonusPerLevelLabel: '레벨당 공격력 +6% · 치명타 확률 +2.5%',
    accentHex: '#f87171',
  },
  {
    id: 'logging',
    name: '벌목 숙련',
    shortName: '벌목',
    description: '나무 채집과 묘목 심기를 통해 성장합니다.',
    bonusPerLevelLabel: '레벨당 벌목 위력 +10% · 원목 추가 획득 확률 +12%',
    accentHex: '#86efac',
  },
  {
    id: 'mining',
    name: '채광 숙련',
    shortName: '채광',
    description: '화강암, 철광석, 마력 수정 채광으로 성장합니다.',
    bonusPerLevelLabel: '레벨당 채광 위력 +10% · 광물 추가 획득 확률 +12%',
    accentHex: '#7dd3fc',
  },
  {
    id: 'craft',
    name: '건축 · 제작 숙련',
    shortName: '건축·제작',
    description: '하우징 타일 건축 및 제작 작업대 장비 제작으로 성장합니다.',
    bonusPerLevelLabel: '레벨당 최대 HP +6 · 최대 기력 +5 · 기력 회복 가속',
    accentHex: '#e6b43c',
  },
];

export interface ProficiencyState {
  level: number;
  exp: number;
  nextExp: number;
}

export interface ProficiencySnapshot extends ProficiencyState {
  id: ProficiencyId;
  rankTitle: string;
  bonusSummary: string;
}

export function getProficiencyRankTitle(level: number): string {
  if (level >= 15) return '거장';
  if (level >= 10) return '장인';
  if (level >= 6) return '전문';
  if (level >= 3) return '숙련';
  return '입문';
}

export interface BossHudSnapshot {
  id: string;
  name: string;
  title: string;
  tier: number;
  hp: number;
  maxHp: number;
  enraged: boolean;
  telegraphLabel: string | null;
  telegraphProgress: number; // 0..1
  distance: number;
  element: ElementKind;
  weakness: ElementKind;
}

export interface PlayerUpgrades {
  toolLevel: number;
  bootsLevel: number;
  armorLevel: number;
}

export interface WorldTierConfig {
  tier: number;
  name: string;
  subtitle: string;
  radius: number;
  unlockCost: { wood: number; stone: number; iron: number; crystal: number };
}

export const WORLD_TIERS: WorldTierConfig[] = [
  {
    tier: 1,
    name: '1단계 · 여명의 초원 정착지',
    subtitle: '반경 96m · 중앙 초원·호수 + 4방위 최하급 아기 정령 (수/풍/화/토)',
    radius: 96,
    unlockCost: { wood: 0, stone: 0, iron: 0, crystal: 0 },
  },
  {
    tier: 2,
    name: '2단계 · 산호 해안과 바람의 초입',
    subtitle: '반경 132m · 동쪽 해안·서쪽 바람 계곡·남쪽 화산 기슭·북쪽 사막 입구 · 하급 정령 출현',
    radius: 132,
    unlockCost: { wood: 6, stone: 5, iron: 0, crystal: 0 },
  },
  {
    tier: 3,
    name: '3단계 · 오아시스와 용암 협곡',
    subtitle: '반경 168m · 사막 오아시스·화산 지열지대 개방 · 하급 정령 군락 & 지역 보스',
    radius: 168,
    unlockCost: { wood: 10, stone: 8, iron: 4, crystal: 0 },
  },
  {
    tier: 4,
    name: '4단계 · 중급 정령의 영역',
    subtitle: '반경 204m · 깊은 해안 산호초·돌풍 계곡·화산 암석지·황금 사구 · 중급 정령 출현',
    radius: 204,
    unlockCost: { wood: 14, stone: 12, iron: 6, crystal: 2 },
  },
  {
    tier: 5,
    name: '5단계 · 폭풍 해협과 불꽃 능선',
    subtitle: '반경 242m · 대양 암초섬·고원 협곡·화산 분화구 외곽 · 중급 정령 & 마력 수정',
    radius: 242,
    unlockCost: { wood: 18, stone: 15, iron: 10, crystal: 4 },
  },
  {
    tier: 6,
    name: '6단계 · 상급 정령의 성역',
    subtitle: '반경 280m · 4대 원소 심층 바이옴 개방 · 상급 정령 (수/풍/화/토) 출현',
    radius: 280,
    unlockCost: { wood: 22, stone: 18, iron: 14, crystal: 6 },
  },
  {
    tier: 7,
    name: '7단계 · 고대 사막 유적과 열화 화구',
    subtitle: '반경 320m · 모래폭풍 협곡·심해 해류·화산 심층부 · 상급 정령 정예 & 룬 거신',
    radius: 320,
    unlockCost: { wood: 26, stone: 22, iron: 18, crystal: 9 },
  },
  {
    tier: 8,
    name: '8단계 · 최상급 정령의 전당',
    subtitle: '반경 362m · 극한 4원소 지대 개방 · 최상급 정령 (수/풍/화/토) 출현',
    radius: 362,
    unlockCost: { wood: 32, stone: 26, iron: 22, crystal: 12 },
  },
  {
    tier: 9,
    name: '9단계 · 원소 경계의 끝자락',
    subtitle: '반경 406m · 대양 외해·대폭풍 계곡·대용암 분지·대사막 성채 · 최상급 정령 수호대',
    radius: 406,
    unlockCost: { wood: 38, stone: 32, iron: 26, crystal: 16 },
  },
  {
    tier: 10,
    name: '10단계 · 4대 정령왕의 신역',
    subtitle: '반경 455m 최종 대륙 · 동·서·남·북 4대 정령왕 강림 (물의·바람의·불의·대지의 정령왕)',
    radius: 455,
    unlockCost: { wood: 45, stone: 38, iron: 32, crystal: 22 },
  },
];

export interface InteractableHint {
  id: string;
  kind: NodeKind;
  label: string;
  actionLabel: string;
  hp: number;
  maxHp: number;
  isDepleted: boolean;
  regrowProgress: number;
  canAfford?: boolean;
  detailText?: string;
}

export type WorldRegionId =
  | 'village'
  | 'lake'
  | 'forest'
  | 'mine'
  | 'meadow'
  | 'ruins'
  | 'coast';

export interface WorldRegionInfo {
  id: WorldRegionId;
  name: string;
  cardinalLabel: string;
  activityHint: string;
  resourceHint: string;
  accentHex: string;
}

export function getRegionInfoAt(x: number, z: number): WorldRegionInfo {
  // Trial Tower Dungeon Interior
  if (Math.hypot(x - 640, z - -640) < 42) {
    return {
      id: 'ruins',
      name: '시련의 탑 · 심층 던전',
      cardinalLabel: '시련의 탑 내부',
      activityHint: '보스 약점 속성을 공략해 상위 층 돌파',
      resourceHint: '층별 클리어 전리품 · 스킬 포인트',
      accentHex: '#62e5ff',
    };
  }
  // Central lake pocket
  if (Math.hypot(x - 20, z - 20) < 15.5) {
    return {
      id: 'lake',
      name: '중앙 반짝 호수',
      cardinalLabel: '중앙 · 호수 (수영 가능)',
      activityHint: '수영 · 수변 채집 · 아기 물 정령',
      resourceHint: '맑은 수변 · 기본 재료',
      accentHex: '#38bdf8',
    };
  }
  const dist = Math.hypot(x, z);
  if (dist < 38) {
    return {
      id: 'village',
      name: '중앙 여명 초원 · 시작 마을',
      cardinalLabel: '중앙 · 초원',
      activityHint: '제작 · 집 건설 · 부지 확보',
      resourceHint: '원목 · 석재 · 안전 초원',
      accentHex: '#86efac',
    };
  }
  // 4 Cardinal Elemental Biomes: East=Sea(水), West=Wind Valley(風), South=Volcano(火), North=Desert(土)
  const absX = Math.abs(x);
  const absZ = Math.abs(z);
  if (z < 0 && absZ >= absX * 0.88) {
    return {
      id: 'mine',
      name: dist > 230 ? '북부 황금 대사막 · 정령왕 사구 (土)' : dist > 125 ? '북부 황금 사막 협곡 (土)' : '북부 사막 오아시스 (土)',
      cardinalLabel: '북쪽 (N) · 사막 · 토(土)',
      activityHint: '대지 정령 · 시련의 탑 · 사막 채광',
      resourceHint: '사암 석재 · 철광석 · 마력 수정',
      accentHex: '#fbbf24',
    };
  }
  if (z > 0 && absZ >= absX * 0.88) {
    return {
      id: 'coast',
      name: dist > 230 ? '남부 대용암 칼데라 · 화염 신역 (火)' : dist > 125 ? '남부 화산 용암 지대 (火)' : '남부 화산 암석 기슭 (火)',
      cardinalLabel: '남쪽 (S) · 화산 · 화(火)',
      activityHint: '화염 정령 · 화염 늑대 · 남방 주작',
      resourceHint: '현무암 · 화염 정수 · 철광석',
      accentHex: '#fb7185',
    };
  }
  if (x < 0) {
    return {
      id: 'forest',
      name: dist > 230 ? '서부 대폭풍 계곡 · 질풍 신역 (風)' : dist > 125 ? '서부 바람의 계곡 심층 (風)' : '서부 바람의 계곡 (風)',
      cardinalLabel: '서쪽 (W) · 바람의 계곡 · 풍(風)',
      activityHint: '바람 정령 · 벌목 · 서방 백호',
      resourceHint: '원목 · 소나무 · 자작나무',
      accentHex: '#34d399',
    };
  }
  // East (+x): Ocean & Coastal Sea Theme (Water)
  if (dist > 230) {
    return {
      id: 'ruins',
      name: '동부 청룡 심해 대양 · 산호 신역 (水)',
      cardinalLabel: '동쪽 (E) · 바다 · 수(水)',
      activityHint: '심해 수영 · 물 정령 · 동방 청룡',
      resourceHint: '해안 수정 · 청류 정수 · 산호석',
      accentHex: '#38bdf8',
    };
  }
  return {
    id: 'meadow',
    name: dist > 92 ? '동부 청룡 푸른 바다 해안 (水)' : '동부 산호 해변 · 수변 초원 (水)',
    cardinalLabel: '동쪽 (E) · 해안·바다 · 수(水)',
    activityHint: '수영 · 물 정령 · 해안 탐험',
    resourceHint: '청류 정수 · 해안 석재 · 수정',
    accentHex: '#38bdf8',
  };
}

export interface MinimapEntity {
  id: string;
  x: number;
  z: number;
  kind:
    | 'tree'
    | 'sapling'
    | 'rock'
    | 'iron'
    | 'crystal'
    | 'landmark'
    | 'frontier'
    | 'trial_tower'
    | 'lantern'
    | 'monster'
    | 'undead'
    | 'boss'
    | 'housing'
    | 'other_housing'
    | 'plot'
    | 'remote_player';
  active: boolean;
  regrowProgress?: number;
  radius?: number;
  label?: string;
}

export interface NearbyMonsterOverlay {
  id: string;
  label: string;
  hp: number;
  maxHp: number;
  isBoss: boolean;
  isAggressive: boolean;
  isTrialBoss?: boolean;
  trialFloor?: number;
  element: ElementKind;
  weakness: ElementKind;
  screenX: number;
  screenY: number;
  distance: number;
}

export interface TrialTowerFloorSpec {
  floor: number;
  bossName: string;
  bossTitle: string;
  species: MonsterSpecies;
  spiritRank?: SpiritRank;
  hp: number;
  attackDamage: number;
  scale: number;
  accentHex: string;
  weakness: ElementKind;
  expReward: number;
  rewardText: string;
  drops: {
    leather: number;
    fang: number;
    essence: number;
    iron: number;
    crystal: number;
    potion: number;
  };
}

interface FloorSeed {
  bossName: string;
  bossTitle: string;
  species: MonsterSpecies;
  spiritRank?: SpiritRank;
  scale: number;
  accentHex: string;
}

const TRIAL_FLOOR_SEEDS: FloorSeed[] = [
  { bossName: '숲의 군주 슬라임', bossTitle: '초원 수문장', species: 'forest_slime', scale: 1.5, accentHex: '#34d399' },
  { bossName: '최하급 물 정령 대장', bossTitle: '해안 아기 정령', species: 'water_spirit', spiritRank: 'baby', scale: 1.35, accentHex: '#38bdf8' },
  { bossName: '강철 송곳니 멧돼지', bossTitle: '돌진의 야수', species: 'meadow_boar', scale: 1.45, accentHex: '#d97706' },
  { bossName: '최하급 바람 정령 대장', bossTitle: '계곡 아기 정령', species: 'wind_spirit', spiritRank: 'baby', scale: 1.38, accentHex: '#6ee7b7' },
  { bossName: '설원 서리 늑대왕', bossTitle: '5층 관문 수호자', species: 'frost_wolf', scale: 1.46, accentHex: '#7dd3fc' },
  { bossName: '최하급 불 정령 대장', bossTitle: '화산 아기 정령', species: 'fire_spirit', spiritRank: 'baby', scale: 1.4, accentHex: '#fb7185' },
  { bossName: '파도왕 물 슬라임', bossTitle: '심해 점액군주', species: 'water_slime', scale: 1.65, accentHex: '#0ea5e9' },
  { bossName: '최하급 대지 정령 대장', bossTitle: '사막 아기 정령', species: 'earth_spirit', spiritRank: 'baby', scale: 1.42, accentHex: '#fbbf24' },
  { bossName: '흑요석 해골 기사', bossTitle: '망자의 선봉장', species: 'night_skeleton', scale: 1.4, accentHex: '#cbd5e1' },
  { bossName: '하급 물 정령 수호자', bossTitle: '10층 관문 보스', species: 'water_spirit', spiritRank: 'lesser', scale: 1.52, accentHex: '#38bdf8' },
  { bossName: '폭풍 질주 슬라임', bossTitle: '돌풍의 화신', species: 'wind_slime', scale: 1.72, accentHex: '#34d399' },
  { bossName: '하급 바람 정령 수호자', bossTitle: '협곡의 감시자', species: 'wind_spirit', spiritRank: 'lesser', scale: 1.54, accentHex: '#2dd4bf' },
  { bossName: '업화의 화염 늑대제왕', bossTitle: '용암 포식자', species: 'ember_wolf', scale: 1.52, accentHex: '#f97316' },
  { bossName: '하급 불 정령 수호자', bossTitle: '열화의 문지기', species: 'fire_spirit', spiritRank: 'lesser', scale: 1.56, accentHex: '#ef4444' },
  { bossName: '대지 거석 멧돼지 장군', bossTitle: '15층 관문 보스', species: 'elder_tusk_boss', scale: 1.12, accentHex: '#f59e0b' },
  { bossName: '하급 대지 정령 수호자', bossTitle: '모래폭풍의 핵', species: 'earth_spirit', spiritRank: 'lesser', scale: 1.58, accentHex: '#eab308' },
  { bossName: '심연의 사신 망령군주', bossTitle: '어둠의 수확자', species: 'night_wraith', scale: 1.52, accentHex: '#a855f7' },
  { bossName: '중급 물 정령 대사제', bossTitle: '해일의 지배자', species: 'water_spirit', spiritRank: 'mid', scale: 1.66, accentHex: '#0284c7' },
  { bossName: '중급 바람 정령 검성', bossTitle: '폭풍 칼날', species: 'wind_spirit', spiritRank: 'mid', scale: 1.68, accentHex: '#10b981' },
  { bossName: '해안 심해 거갑 타이탄', bossTitle: '20층 관문 보스', species: 'coastal_titan_boss', scale: 1.15, accentHex: '#14b8a6' },
  { bossName: '중급 불 정령 화염군주', bossTitle: '분화구의 분노', species: 'fire_spirit', spiritRank: 'mid', scale: 1.72, accentHex: '#f43f5e' },
  { bossName: '중급 대지 정령 사막거인', bossTitle: '황금 사구의 주인', species: 'earth_spirit', spiritRank: 'mid', scale: 1.74, accentHex: '#d97706' },
  { bossName: '혹한의 알파 서리늑대', bossTitle: '빙결의 제왕', species: 'alpha_frost_boss', scale: 1.18, accentHex: '#60a5fa' },
  { bossName: '상급 룬 수호 거신', bossTitle: '고대 석상의 심장', species: 'rune_golem_boss', scale: 1.16, accentHex: '#38bdf8' },
  { bossName: '최상급 4방위 수호 청룡', bossTitle: '25층 관문 수호신', species: 'azure_dragon_boss', scale: 1.18, accentHex: '#06b6d4' },
  { bossName: '물의 정령왕 · 아쿠아리온', bossTitle: '26층 동해 정령왕', species: 'water_spirit', spiritRank: 'king', scale: 1.12, accentHex: '#38bdf8' },
  { bossName: '바람의 정령왕 · 제피로스', bossTitle: '27층 계곡 정령왕', species: 'wind_spirit', spiritRank: 'king', scale: 1.12, accentHex: '#34d399' },
  { bossName: '불의 정령왕 · 이그니스', bossTitle: '28층 화산 정령왕', species: 'fire_spirit', spiritRank: 'king', scale: 1.14, accentHex: '#fb7185' },
  { bossName: '대지의 정령왕 · 테라노스', bossTitle: '29층 사막 정령왕', species: 'earth_spirit', spiritRank: 'king', scale: 1.14, accentHex: '#fbbf24' },
  { bossName: '시련의 정점 · 태초 현무패왕', bossTitle: '30층 최상층 최종 보스', species: 'black_tortoise_boss', scale: 1.32, accentHex: '#f59e0b' },
];

export const TRIAL_TOWER_FLOORS: TrialTowerFloorSpec[] = TRIAL_FLOOR_SEEDS.map((s, idx) => {
  const floor = idx + 1;
  const isMilestone = floor % 5 === 0;
  const hp = Math.round(180 + floor * 72 + floor * floor * 4.2 + (isMilestone ? 120 : 0));
  const attackDamage = Math.round(12 + floor * 2.15 + (isMilestone ? 5 : 0));
  const expReward = Math.round(115 + floor * 48 + floor * floor * 2.4);
  const essence = Math.max(2, Math.round(1 + floor * 0.65));
  const crystal = Math.max(0, Math.floor(floor * 0.45));
  const iron = Math.max(1, Math.floor(floor * 0.4));
  const potion = floor >= 20 ? 3 : floor >= 10 ? 2 : 1;
  const profile = getMonsterElementProfile(s.species);
  const rewardParts = [`정수 +${essence}`];
  if (crystal > 0) rewardParts.push(`수정 +${crystal}`);
  rewardParts.push(`물약 +${potion}`);
  if (isMilestone) rewardParts.push('마스터리 +1P');

  return {
    floor,
    bossName: `${floor}층 · ${s.bossName}`,
    bossTitle: s.bossTitle,
    species: s.species,
    spiritRank: s.spiritRank,
    hp,
    attackDamage,
    scale: s.scale,
    accentHex: s.accentHex,
    weakness: profile.weakness,
    expReward,
    rewardText: rewardParts.join(' · '),
    drops: {
      leather: Math.max(2, Math.floor(2 + floor * 0.28)),
      fang: Math.max(1, Math.floor(1 + floor * 0.3)),
      essence,
      iron,
      crystal,
      potion,
    },
  };
});

export interface TrialTowerHudState {
  activeFloor: number | null;
  highestClearedFloor: number;
  lastClearedFloor: number | null;
  nearTower: boolean;
  inDungeon: boolean;
  activeFilterHex: string | null;
  activeBossTitle: string | null;
}

export interface MultiplayerHudState {
  connected: boolean;
  transport?: 'ws' | 'http' | 'offline';
  serverHost?: string;
  roomId: string;
  playerId: string | null;
  playerName: string;
  onlineCount: number;
  remotePlayers: Array<{ id: string; name: string; x: number; z: number }>;
}

export interface FloatingFeedback {
  id: number;
  text: string;
  color: string;
  screenX: number;
  screenY: number;
}

export type HotbarItemId =
  | `weapon:${WeaponId}`
  | 'action:gather'
  | 'action:sapling'
  | 'action:lantern'
  | 'action:potion'
  | 'action:forge'
  | 'action:housing'
  | 'action:inventory'
  | 'action:expand';

export function getDefaultHotbarForClass(classId: PlayerClassId): HotbarItemId[] {
  const starter = getClassSpec(classId).starterWeapon;
  return [
    `weapon:${starter}`,
    'weapon:stone_axe',
    'weapon:stone_pickaxe',
    'action:sapling',
    'action:potion',
    'action:forge',
  ];
}

export const DEFAULT_HOTBAR_SLOTS: HotbarItemId[] = getDefaultHotbarForClass('warrior');

export interface HotbarOptionMeta {
  id: HotbarItemId;
  shortLabel: string;
  label: string;
  kind: 'weapon' | 'action';
  weaponId?: WeaponId;
  hint: string;
}

export const HOTBAR_PICKER_OPTIONS: HotbarOptionMeta[] = [
  // Universal tools & class weapons
  { id: 'weapon:crystal_sword', shortLabel: '수정검', label: '수정 단검', kind: 'weapon', weaponId: 'crystal_sword', hint: '전사 기본 검' },
  { id: 'weapon:hunter_blade', shortLabel: '송곳니검', label: '야수 송곳니 장검', kind: 'weapon', weaponId: 'hunter_blade', hint: '전사 사냥검' },
  { id: 'weapon:essence_battleaxe', shortLabel: '정수도끼', label: '마력 정수 전투도끼', kind: 'weapon', weaponId: 'essence_battleaxe', hint: '전사 전투도끼' },
  { id: 'weapon:rune_greatsword', shortLabel: '룬대검', label: '룬 수정 대검', kind: 'weapon', weaponId: 'rune_greatsword', hint: '전사 전설 대검' },
  { id: 'weapon:recurve_bow', shortLabel: '리커브활', label: '사냥꾼 리커브 활', kind: 'weapon', weaponId: 'recurve_bow', hint: '궁수 기본 활' },
  { id: 'weapon:windstrider_bow', shortLabel: '질풍장궁', label: '질풍 장궁', kind: 'weapon', weaponId: 'windstrider_bow', hint: '궁수 고급 활' },
  { id: 'weapon:azure_star_bow', shortLabel: '청룡성궁', label: '청룡 성궁', kind: 'weapon', weaponId: 'azure_star_bow', hint: '궁수 전설 활' },
  { id: 'weapon:emerald_wing_staff', shortLabel: '날개지팡이', label: '에메랄드 날개 지팡이', kind: 'weapon', weaponId: 'emerald_wing_staff', hint: '힐러 기본 지팡이' },
  { id: 'weapon:sanctuary_staff', shortLabel: '성역지팡이', label: '성역의 치유 지팡이', kind: 'weapon', weaponId: 'sanctuary_staff', hint: '힐러 고급 지팡이' },
  { id: 'weapon:seraphic_staff', shortLabel: '세라핌봉', label: '세라핌 성광 지팡이', kind: 'weapon', weaponId: 'seraphic_staff', hint: '힐러 전설 지팡이' },
  { id: 'weapon:crystal_wand', shortLabel: '수정마법봉', label: '푸른 수정 마법봉', kind: 'weapon', weaponId: 'crystal_wand', hint: '마법사 기본 봉' },
  { id: 'weapon:amethyst_wand', shortLabel: '자수정봉', label: '자수정 비전 지팡이', kind: 'weapon', weaponId: 'amethyst_wand', hint: '마법사 고급 봉' },
  { id: 'weapon:astral_nova_staff', shortLabel: '별빛지팡이', label: '별빛 대마도사 지팡이', kind: 'weapon', weaponId: 'astral_nova_staff', hint: '마법사 전설 봉' },
  { id: 'weapon:tactical_dagger', shortLabel: '전술단검', label: '전술 강철 단검', kind: 'weapon', weaponId: 'tactical_dagger', hint: '도둑 기본 단검' },
  { id: 'weapon:viper_dagger', shortLabel: '맹독단검', label: '맹독 쌍아 단검', kind: 'weapon', weaponId: 'viper_dagger', hint: '도둑 고급 단검' },
  { id: 'weapon:eclipse_dagger', shortLabel: '월식단검', label: '월식 그림자 단검', kind: 'weapon', weaponId: 'eclipse_dagger', hint: '도둑 전설 단검' },
  { id: 'weapon:stone_axe', shortLabel: '석재도끼', label: '석재 벌목 도끼', kind: 'weapon', weaponId: 'stone_axe', hint: '공용 벌목 도끼' },
  { id: 'weapon:stone_pickaxe', shortLabel: '석재곡괭이', label: '석재 채광 곡괭이', kind: 'weapon', weaponId: 'stone_pickaxe', hint: '공용 채광 곡괭이' },
  { id: 'weapon:iron_axe', shortLabel: '강철도끼', label: '제련 강철 도끼', kind: 'weapon', weaponId: 'iron_axe', hint: '공용 고급 도끼' },
  { id: 'weapon:iron_pickaxe', shortLabel: '강철곡괭이', label: '제련 강철 곡괭이', kind: 'weapon', weaponId: 'iron_pickaxe', hint: '공용 고급 곡괭이' },
  { id: 'action:sapling', shortLabel: '묘목', label: '묘목 심기', kind: 'action', hint: '원목 1개 소모' },
  { id: 'action:lantern', shortLabel: '횃불', label: '개척지 횃불', kind: 'action', hint: '원목 2 · 석재 1 소모' },
  { id: 'action:potion', shortLabel: '치유물약', label: '치유 물약 사용', kind: 'action', hint: 'HP +50 · 스태미나 +40' },
  { id: 'action:gather', shortLabel: '채집/공격', label: '채집 · 전투 공격', kind: 'action', hint: '가장 가까운 대상 상호작용' },
  { id: 'action:forge', shortLabel: '제작', label: '제작 작업대', kind: 'action', hint: '도구·무기·방어구·물품 제작' },
  { id: 'action:housing', shortLabel: '하우징', label: '하우징 건축 모드', kind: 'action', hint: '집·텃밭 설치 및 수정 (H)' },
  { id: 'action:inventory', shortLabel: '가방', label: '인벤토리 · 장비', kind: 'action', hint: '보유 자원·전리품 관리' },
  { id: 'action:expand', shortLabel: '확장', label: '월드 확장', kind: 'action', hint: '프론티어 구역 개방' },
];

export type QuestId =
  | 'gather_wood_10'
  | 'mine_stone_8'
  | 'hunt_leather_4'
  | 'defeat_mid_boss'
  | 'forge_first_tool'
  | 'plant_saplings_2'
  | 'expand_tier_2'
  | 'mine_iron_6'
  | 'night_lantern_watch'
  | 'expand_tier_3';

export interface QuestSnapshot {
  id: QuestId;
  title: string;
  description: string;
  current: number;
  target: number;
  completed: boolean;
  claimed: boolean;
  rewardText: string;
}

export interface HudSnapshot {
  phase: GamePhase;
  playerClass: PlayerClassId;
  worldTier: number;
  zoneName: string;
  worldRadius: number;
  playerX: number;
  playerZ: number;
  playerYaw: number;
  cameraYaw: number;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  isSprinting: boolean;
  isGrounded: boolean;
  isSwimming: boolean;
  breath: number;
  maxBreath: number;
  level: number;
  exp: number;
  nextExp: number;
  inventory: Inventory;
  upgrades: PlayerUpgrades;
  ownedWeapons: WeaponId[];
  equippedWeapon: WeaponId;
  ownedArmors: ArmorId[];
  equippedArmor: ArmorId;
  autoEquipTool: boolean;
  hotbarSlots: HotbarItemId[];
  quests: QuestSnapshot[];
  activeEmote: EmoteId | null;
  nearbyHint: InteractableHint | null;
  gatherProgress: number;
  isGathering: boolean;
  placedLanterns: number;
  plantedSaplings: number;
  harvestedTotal: number;
  monstersDefeated: number;
  bossesDefeated: number;
  activeBoss: BossHudSnapshot | null;
  // Warrior Skill Mastery & Proficiency System
  warriorSkills: WarriorSkillSnapshot[];
  skillMasteryPoints: number;
  warcryBuffRemaining: number;
  warcryBuffDuration: number;
  proficiencies: ProficiencySnapshot[];
  minimapEntities: MinimapEntity[];
  bannerMessage: string | null;
  webglError: string | null;
  // Time of Day & Weather
  timeOfDay: number;
  timeClockText: string;
  timePhaseLabel: string;
  timePaused: boolean;
  weather: WeatherKind;
  weatherLabel: string;
  autoWeather: boolean;
  rainGrowthBoost: boolean;
  windStrength: number;
  // Night-specific wildlife (20:00 - 04:00)
  nightCreaturesActive: boolean;
  // Adaptive Day/Night BGM
  bgmEnabled: boolean;
  bgmThemeLabel: string;
  // ArcheAge Housing & World Save State
  housing: HousingHudState;
  multiplayer: MultiplayerHudState;
  trialTower: TrialTowerHudState;
  nearbyMonsters: NearbyMonsterOverlay[];
  lastSavedAt: number | null;
  hasSavedGame: boolean;
  saveSummary: SaveMetaSummary | null;
}
