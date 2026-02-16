// ============================================================
// POE-STYLE SKILL TREE DATA
// ~50 nodes organized in 3 clusters: STR (top), DEX (bot-left), INT (bot-right)
// ============================================================

const SKILL_TREE_DATA = {
    startNode: 'start',
    nodes: {
        // ===== CENTER START =====
        start: {
            name: 'Origin',
            description: 'Starting point',
            type: 'start',
            category: 'neutral',
            bonuses: {},
            x: 0, y: 0,
            connections: ['str_path_1', 'dex_path_1', 'int_path_1']
        },

        // ===== STRENGTH PATH (Top) — Red =====
        str_path_1: {
            name: 'Toughness',
            description: '+10 Max HP',
            type: 'small',
            category: 'str',
            bonuses: { maxHp: 10 },
            x: 0, y: -80,
            connections: ['start', 'str_path_2', 'str_path_1a']
        },
        str_path_1a: {
            name: 'Thick Skin',
            description: '+2 Armor',
            type: 'small',
            category: 'str',
            bonuses: { armor: 2 },
            x: 70, y: -60,
            connections: ['str_path_1', 'str_path_3']
        },
        str_path_2: {
            name: 'Brute Force',
            description: '+2 STR',
            type: 'small',
            category: 'str',
            bonuses: { strFlat: 2 },
            x: -50, y: -140,
            connections: ['str_path_1', 'str_notable_1']
        },
        str_path_3: {
            name: 'Resilience',
            description: '+15 Max HP',
            type: 'small',
            category: 'str',
            bonuses: { maxHp: 15 },
            x: 80, y: -140,
            connections: ['str_path_1a', 'str_notable_1']
        },
        str_notable_1: {
            name: 'Warrior\'s Resolve',
            description: '+25 Max HP, +3 Armor',
            type: 'notable',
            category: 'str',
            bonuses: { maxHp: 25, armor: 3 },
            x: 0, y: -200,
            connections: ['str_path_2', 'str_path_3', 'str_path_4', 'str_path_5']
        },
        str_path_4: {
            name: 'Iron Fist',
            description: '+3 STR',
            type: 'small',
            category: 'str',
            bonuses: { strFlat: 3 },
            x: -80, y: -260,
            connections: ['str_notable_1', 'str_path_6']
        },
        str_path_5: {
            name: 'Fortify',
            description: '+4 Armor',
            type: 'small',
            category: 'str',
            bonuses: { armor: 4 },
            x: 80, y: -260,
            connections: ['str_notable_1', 'str_path_7']
        },
        str_path_6: {
            name: 'Savage Blows',
            description: '+10% Damage',
            type: 'small',
            category: 'str',
            bonuses: { damagePercent: 10 },
            x: -120, y: -330,
            connections: ['str_path_4', 'str_notable_2']
        },
        str_path_7: {
            name: 'Bulwark',
            description: '+20 Max HP, +2 Armor',
            type: 'small',
            category: 'str',
            bonuses: { maxHp: 20, armor: 2 },
            x: 120, y: -330,
            connections: ['str_path_5', 'str_notable_2']
        },
        str_notable_2: {
            name: 'Berserker Rage',
            description: '+15% Damage, +4 STR\n(Unstoppable fury)',
            type: 'notable',
            category: 'str',
            bonuses: { damagePercent: 15, strFlat: 4 },
            x: 0, y: -390,
            connections: ['str_path_6', 'str_path_7', 'str_keystone']
        },
        str_path_8: {
            name: 'Endless Vitality',
            description: '+30 Max HP',
            type: 'small',
            category: 'str',
            bonuses: { maxHp: 30 },
            x: 60, y: -450,
            connections: ['str_notable_2', 'str_keystone']
        },
        str_keystone: {
            name: 'Glass Cannon',
            description: '2x All Damage\nBut -50% Max HP\n⚠️ KEYSTONE',
            type: 'keystone',
            category: 'str',
            bonuses: { damagePercent: 100, maxHp: -50 },
            x: -60, y: -470,
            connections: ['str_notable_2', 'str_path_8']
        },

        // ===== DEXTERITY PATH (Bottom-Left) — Green =====
        dex_path_1: {
            name: 'Precision',
            description: '+2% Crit Chance',
            type: 'small',
            category: 'dex',
            bonuses: { critChance: 2 },
            x: -70, y: 60,
            connections: ['start', 'dex_path_2', 'dex_path_1a']
        },
        dex_path_1a: {
            name: 'Nimbleness',
            description: '+3% Dodge',
            type: 'small',
            category: 'dex',
            bonuses: { dodge: 3 },
            x: -40, y: 120,
            connections: ['dex_path_1', 'dex_path_3']
        },
        dex_path_2: {
            name: 'Quick Reflexes',
            description: '+2 DEX',
            type: 'small',
            category: 'dex',
            bonuses: { dexFlat: 2 },
            x: -140, y: 100,
            connections: ['dex_path_1', 'dex_notable_1']
        },
        dex_path_3: {
            name: 'Agility',
            description: '+3% Dodge, +1% Crit',
            type: 'small',
            category: 'dex',
            bonuses: { dodge: 3, critChance: 1 },
            x: -100, y: 180,
            connections: ['dex_path_1a', 'dex_notable_1']
        },
        dex_notable_1: {
            name: 'Shadow Step',
            description: '+5% Crit Chance, +5% Dodge',
            type: 'notable',
            category: 'dex',
            bonuses: { critChance: 5, dodge: 5 },
            x: -180, y: 180,
            connections: ['dex_path_2', 'dex_path_3', 'dex_path_4', 'dex_path_5']
        },
        dex_path_4: {
            name: 'Lethal Strikes',
            description: '+0.2x Crit Multiplier',
            type: 'small',
            category: 'dex',
            bonuses: { critMulti: 0.2 },
            x: -250, y: 140,
            connections: ['dex_notable_1', 'dex_path_6']
        },
        dex_path_5: {
            name: 'Evasion Mastery',
            description: '+5% Dodge',
            type: 'small',
            category: 'dex',
            bonuses: { dodge: 5 },
            x: -220, y: 250,
            connections: ['dex_notable_1', 'dex_path_7']
        },
        dex_path_6: {
            name: 'Assassin\'s Mark',
            description: '+4% Crit, +3 DEX',
            type: 'small',
            category: 'dex',
            bonuses: { critChance: 4, dexFlat: 3 },
            x: -310, y: 200,
            connections: ['dex_path_4', 'dex_notable_2']
        },
        dex_path_7: {
            name: 'Wind Walker',
            description: '+4% Dodge, +2 DEX',
            type: 'small',
            category: 'dex',
            bonuses: { dodge: 4, dexFlat: 2 },
            x: -280, y: 310,
            connections: ['dex_path_5', 'dex_notable_2']
        },
        dex_notable_2: {
            name: 'Perfect Strikes',
            description: '+0.3x Crit Multi, +5% Crit',
            type: 'notable',
            category: 'dex',
            bonuses: { critMulti: 0.3, critChance: 5 },
            x: -340, y: 280,
            connections: ['dex_path_6', 'dex_path_7', 'dex_keystone']
        },
        dex_path_8: {
            name: 'Phantom',
            description: '+8% Dodge',
            type: 'small',
            category: 'dex',
            bonuses: { dodge: 8 },
            x: -380, y: 350,
            connections: ['dex_notable_2', 'dex_keystone']
        },
        dex_keystone: {
            name: 'Acrobatics',
            description: '+30% Dodge\nBut Armor set to 0\n⚠️ KEYSTONE',
            type: 'keystone',
            category: 'dex',
            bonuses: { dodge: 30, armor: -100 },
            x: -420, y: 280,
            connections: ['dex_notable_2', 'dex_path_8']
        },

        // ===== INTELLIGENCE PATH (Bottom-Right) — Blue =====
        int_path_1: {
            name: 'Focus',
            description: '+10 Max MP',
            type: 'small',
            category: 'int',
            bonuses: { maxMp: 10 },
            x: 70, y: 60,
            connections: ['start', 'int_path_2', 'int_path_1a']
        },
        int_path_1a: {
            name: 'Insight',
            description: '+2 INT',
            type: 'small',
            category: 'int',
            bonuses: { intFlat: 2 },
            x: 40, y: 120,
            connections: ['int_path_1', 'int_path_3']
        },
        int_path_2: {
            name: 'Mana Well',
            description: '+15 Max MP',
            type: 'small',
            category: 'int',
            bonuses: { maxMp: 15 },
            x: 140, y: 100,
            connections: ['int_path_1', 'int_notable_1']
        },
        int_path_3: {
            name: 'Wisdom',
            description: '+3 INT, +5 Max HP',
            type: 'small',
            category: 'int',
            bonuses: { intFlat: 3, maxHp: 5 },
            x: 100, y: 180,
            connections: ['int_path_1a', 'int_notable_1']
        },
        int_notable_1: {
            name: 'Arcane Shield',
            description: '+30 Max MP, +10 Max HP',
            type: 'notable',
            category: 'int',
            bonuses: { maxMp: 30, maxHp: 10 },
            x: 180, y: 180,
            connections: ['int_path_2', 'int_path_3', 'int_path_4', 'int_path_5']
        },
        int_path_4: {
            name: 'Spell Power',
            description: '+10% Damage',
            type: 'small',
            category: 'int',
            bonuses: { damagePercent: 10 },
            x: 250, y: 140,
            connections: ['int_notable_1', 'int_path_6']
        },
        int_path_5: {
            name: 'Mystic Ward',
            description: '+3 Armor, +10 Max MP',
            type: 'small',
            category: 'int',
            bonuses: { armor: 3, maxMp: 10 },
            x: 220, y: 250,
            connections: ['int_notable_1', 'int_path_7']
        },
        int_path_6: {
            name: 'Sorcery',
            description: '+5 INT, +5% Damage',
            type: 'small',
            category: 'int',
            bonuses: { intFlat: 5, damagePercent: 5 },
            x: 310, y: 200,
            connections: ['int_path_4', 'int_notable_2']
        },
        int_path_7: {
            name: 'Barrier',
            description: '+20 Max HP, +15 Max MP',
            type: 'small',
            category: 'int',
            bonuses: { maxHp: 20, maxMp: 15 },
            x: 280, y: 310,
            connections: ['int_path_5', 'int_notable_2']
        },
        int_notable_2: {
            name: 'Elemental Mastery',
            description: '+20% Damage, +5 INT',
            type: 'notable',
            category: 'int',
            bonuses: { damagePercent: 20, intFlat: 5 },
            x: 340, y: 280,
            connections: ['int_path_6', 'int_path_7', 'int_keystone']
        },
        int_path_8: {
            name: 'Mana Surge',
            description: '+40 Max MP',
            type: 'small',
            category: 'int',
            bonuses: { maxMp: 40 },
            x: 380, y: 350,
            connections: ['int_notable_2', 'int_keystone']
        },
        int_keystone: {
            name: 'Mind Over Matter',
            description: '30% Damage from Mana\n+50 Max MP, -20 Max HP\n⚠️ KEYSTONE',
            type: 'keystone',
            category: 'int',
            bonuses: { maxMp: 50, maxHp: -20 },
            x: 420, y: 280,
            connections: ['int_notable_2', 'int_path_8']
        },

        // ===== CROSS-PATH CONNECTORS =====
        hybrid_str_dex: {
            name: 'Combat Training',
            description: '+2 STR, +2 DEX, +5% Damage',
            type: 'small',
            category: 'neutral',
            bonuses: { strFlat: 2, dexFlat: 2, damagePercent: 5 },
            x: -80, y: -20,
            connections: ['str_path_1', 'dex_path_1']
        },
        hybrid_str_int: {
            name: 'Battle Mage',
            description: '+2 STR, +2 INT, +10 HP',
            type: 'small',
            category: 'neutral',
            bonuses: { strFlat: 2, intFlat: 2, maxHp: 10 },
            x: 80, y: -20,
            connections: ['str_path_1', 'int_path_1']
        },
        hybrid_dex_int: {
            name: 'Shadow Arts',
            description: '+2 DEX, +2 INT, +3% Crit',
            type: 'small',
            category: 'neutral',
            bonuses: { dexFlat: 2, intFlat: 2, critChance: 3 },
            x: 0, y: 130,
            connections: ['dex_path_1a', 'int_path_1a']
        },
    }
};
