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
            connections: ['str_start', 'dex_start', 'int_start']
        },

        // ==============================================================================
        // STRENGTH PATH (Warrior)
        // Focus: Health, Armor, Melee Damage
        // Skills: Bash (AoE stun), Cleave (Wide arc), Enrage (Buff)
        // ==============================================================================
        str_start: {
            name: 'Vitality',
            description: '+10 Max HP',
            type: 'small',
            category: 'str',
            bonuses: { maxHp: 10 },
            x: 0, y: -60,
            connections: ['start', 'str_skill_bash']
        },
        str_skill_bash: {
            name: 'Skill: Shield Bash',
            description: 'Unlocks Shield Bash\nStun enemies in front\nReq: Level 2',
            type: 'skill_unlock',
            skillId: 'bash',
            category: 'str',
            requirements: { level: 2 },
            bonuses: { maxHp: 5 },
            x: 0, y: -120,
            connections: ['str_start', 'str_node_1', 'str_node_2']
        },
        str_node_1: {
            name: 'Iron Skin',
            description: '+3 Armor',
            type: 'small',
            category: 'str',
            bonuses: { armor: 3 },
            x: -40, y: -160,
            connections: ['str_skill_bash', 'str_notable_tank']
        },
        str_node_2: {
            name: 'Brute',
            description: '+3 STR',
            type: 'small',
            category: 'str',
            bonuses: { strFlat: 3 },
            x: 40, y: -160,
            connections: ['str_skill_bash', 'str_notable_dmg']
        },
        str_notable_tank: {
            name: 'Juggernaut',
            description: '20% Armor, +20 HP',
            type: 'notable',
            category: 'str',
            bonuses: { armor: 5, maxHp: 20 },
            x: -60, y: -220,
            connections: ['str_node_1', 'str_skill_cleave']
        },
        str_notable_dmg: {
            name: 'Warlord',
            description: '+15% Melee Dmg',
            type: 'notable',
            category: 'str',
            bonuses: { damagePercent: 15 },
            x: 60, y: -220,
            connections: ['str_node_2', 'str_skill_cleave']
        },
        str_skill_cleave: {
            name: 'Skill: Cleave',
            description: 'Unlocks Cleave\nWide arc attack\nReq: Level 5, STR 10',
            type: 'skill_unlock',
            skillId: 'cleave',
            category: 'str',
            requirements: { level: 5, strFlat: 5 }, // Cumulative stats checked in logic? Or base stats? Let's say logic checks total stats.
            bonuses: { damagePercent: 5 },
            x: 0, y: -280,
            connections: ['str_notable_tank', 'str_notable_dmg', 'str_keystone']
        },
        str_keystone: {
            name: 'Unstoppable',
            description: 'Cannot be knocked back\n+50% Armor, -10% Move Speed',
            type: 'keystone',
            category: 'str',
            bonuses: { armor: 20, moveSpeed: -0.1 },
            x: 0, y: -350,
            connections: ['str_skill_cleave']
        },

        // ==============================================================================
        // DEXTERITY PATH (Rogue)
        // Focus: Crit, Dodge, Speed
        // Skills: Dash (Movement), Pierce (Ignore Armor), Poison (DoT)
        // ==============================================================================
        dex_start: {
            name: 'Agility',
            description: '+3% Move Speed',
            type: 'small',
            category: 'dex',
            bonuses: { moveSpeed: 0.03 },
            x: -50, y: 50,
            connections: ['start', 'dex_skill_dash']
        },
        dex_skill_dash: {
            name: 'Skill: Shadow Dash',
            description: 'Unlocks Dash\nTeleport & Damge\nReq: Level 2',
            type: 'skill_unlock',
            skillId: 'dash',
            category: 'dex',
            requirements: { level: 2 },
            bonuses: { dexFlat: 2 },
            x: -100, y: 100,
            connections: ['dex_start', 'dex_node_1', 'dex_node_2']
        },
        dex_node_1: {
            name: 'Evasion',
            description: '+5% Dodge',
            type: 'small',
            category: 'dex',
            bonuses: { dodge: 5 },
            x: -150, y: 80,
            connections: ['dex_skill_dash', 'dex_notable_speed']
        },
        dex_node_2: {
            name: 'Precision',
            description: '+5% Crit Chance',
            type: 'small',
            category: 'dex',
            bonuses: { critChance: 5 },
            x: -140, y: 140,
            connections: ['dex_skill_dash', 'dex_notable_crit']
        },
        dex_notable_speed: {
            name: 'Windwalker',
            description: '+10% Move Speed, +5% Dodge',
            type: 'notable',
            category: 'dex',
            bonuses: { moveSpeed: 0.1, dodge: 5 },
            x: -200, y: 60,
            connections: ['dex_node_1', 'dex_skill_poison']
        },
        dex_notable_crit: {
            name: 'Assassin',
            description: '+20% Crit Multi',
            type: 'notable',
            category: 'dex',
            bonuses: { critMulti: 0.2 },
            x: -190, y: 180,
            connections: ['dex_node_2', 'dex_skill_poison']
        },
        dex_skill_poison: {
            name: 'Skill: Poison Blade',
            description: 'Unlocks Poison Blade\nCoat weapon in poison\nReq: Level 5',
            type: 'skill_unlock',
            skillId: 'poison',
            category: 'dex',
            requirements: { level: 5 },
            bonuses: { critChance: 2 },
            x: -260, y: 120,
            connections: ['dex_notable_speed', 'dex_notable_crit', 'dex_keystone']
        },
        dex_keystone: {
            name: 'Ghost',
            description: '100% Dodge for 2s after kill\n-20% Max HP',
            type: 'keystone',
            category: 'dex',
            bonuses: { maxHp: -20 }, // Logic for Ghost effect needs to be implemented in combat/player
            x: -330, y: 120,
            connections: ['dex_skill_poison']
        },

        // ==============================================================================
        // INTELLIGENCE PATH (Mage)
        // Focus: Mana, Spell Dmg, Cooldowns
        // Skills: Fireball (AoE), Frost Nova (Slow), Teleport (Utility)
        // ==============================================================================
        int_start: {
            name: 'Focus',
            description: '+20 Max MP',
            type: 'small',
            category: 'int',
            bonuses: { maxMp: 20 },
            x: 50, y: 50,
            connections: ['start', 'int_skill_fireball']
        },
        int_skill_fireball: {
            name: 'Skill: Fireball',
            description: 'Unlocks Fireball\nRanged AoE\nReq: Level 2',
            type: 'skill_unlock',
            skillId: 'fireball',
            category: 'int',
            requirements: { level: 2 },
            bonuses: { intFlat: 2 },
            x: 100, y: 100,
            connections: ['int_start', 'int_node_1', 'int_node_2']
        },
        int_node_1: {
            name: 'Scholar',
            description: '+1 Mana Regen/s',
            type: 'small',
            category: 'int',
            bonuses: { manaRegen: 1 },
            x: 140, y: 140,
            connections: ['int_skill_fireball', 'int_notable_mana']
        },
        int_node_2: {
            name: 'Elementalist',
            description: '+5% Spell Dmg',
            type: 'small',
            category: 'int',
            bonuses: { damagePercent: 5 },
            x: 150, y: 80,
            connections: ['int_skill_fireball', 'int_notable_spell']
        },
        int_notable_mana: {
            name: 'Arcane Flow',
            description: '+50 Max MP, +2 Regen',
            type: 'notable',
            category: 'int',
            bonuses: { maxMp: 50, manaRegen: 2 },
            x: 190, y: 180,
            connections: ['int_node_1', 'int_skill_frost']
        },
        int_notable_spell: {
            name: 'Destruction',
            description: '+20% Spell Dmg',
            type: 'notable',
            category: 'int',
            bonuses: { damagePercent: 20 },
            x: 200, y: 60,
            connections: ['int_node_2', 'int_skill_frost']
        },
        int_skill_frost: {
            name: 'Skill: Frost Nova',
            description: 'Unlocks Frost Nova\nFreeze enemies around you\nReq: Level 5',
            type: 'skill_unlock',
            skillId: 'frost_nova',
            category: 'int',
            requirements: { level: 5 },
            bonuses: { intFlat: 5 },
            x: 260, y: 120,
            connections: ['int_notable_mana', 'int_notable_spell', 'int_keystone']
        },
        int_keystone: {
            name: 'Blood Magic',
            description: 'Skills cost HP instead of MP\n+30% Spell Dmg',
            type: 'keystone',
            category: 'int',
            bonuses: { damagePercent: 30 }, // Logic implicitly handled or need flag?
            x: 330, y: 120,
            connections: ['int_skill_frost']
        }
    }
}
