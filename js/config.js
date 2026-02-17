// ============================================================
// GAME CONFIGURATION
// ============================================================

const CONFIG = {
    // Character Classes
    CLASSES: {
        warrior: {
            name: 'Warrior',
            icon: '⚔️',
            desc: 'ถึก ทนทาน โจมตีแรง',
            color: '#e74c3c',
            bodyColor: 0xcc3333,
            headColor: 0xdd4444,
            weaponColor: 0xaaaaaa,
            stats: { maxHp: 140, maxMp: 30, str: 16, dex: 8, int: 6, armor: 4, critChance: 5, critMulti: 1.5, dodge: 2 },
            speed: 3.8,
            attackRange: 1.2,
            attackCooldown: 0.5,
            attackArc: Math.PI / 2,  // 90 degree swing
            skills: [
                {
                    name: 'Shield Bash', icon: '🛡️', desc: 'AoE stun + damage',
                    cooldown: 8, manaCost: 10, type: 'aoe_damage',
                    damage: 25, range: 1.5, arc: Math.PI * 0.8, knockback: 1.5,
                    color: '#ff6644', effectColor: 0xff6644
                },
                {
                    name: 'War Cry', icon: '📯', desc: 'ATK +50% (5s)',
                    cooldown: 15, manaCost: 8, type: 'buff',
                    buffStat: 'damagePercent', buffValue: 50, duration: 5,
                    color: '#ffcc00', effectColor: 0xffcc00
                }
            ],
            promotions: ['knight', 'berserker']
        },
        rogue: {
            name: 'Rogue',
            icon: '🗡️',
            desc: 'เร็ว คริติคอลสูง หลบเก่ง',
            color: '#2ecc71',
            bodyColor: 0x228844,
            headColor: 0x33aa55,
            weaponColor: 0x888888,
            stats: { maxHp: 85, maxMp: 40, str: 10, dex: 16, int: 8, armor: 1, critChance: 15, critMulti: 2.0, dodge: 12 },
            speed: 5.5,
            attackRange: 1.4,
            attackCooldown: 0.35,
            attackArc: Math.PI / 3,
            skills: [
                { id: 'dash', name: 'Dash', manaCost: 10, cooldown: 3, color: '#88ff88', icon: '💨', type: 'dash', dashDistance: 4, dashWidth: 1, damage: 15, effectColor: '#00ff00' },
                { id: 'poison', name: 'Poison', manaCost: 15, cooldown: 10, color: '#aaff00', icon: '☠️', type: 'buff', buffStat: 'poisonHits', buffValue: 3, poisonDamage: 5, effectColor: '#00ff00' }
            ],
            promotions: ['assassin', 'duelist']
        },
        mage: {
            name: 'Mage',
            icon: '🔮',
            desc: 'จอมเวทย์ผู้ใช้พลังธาตุโจมตีระยะไกล',
            color: '#4444ff',
            bodyColor: 0x3333aa,
            headColor: 0x4444ff,
            weaponColor: 0x88ffff,
            stats: { maxHp: 70, maxMp: 80, str: 1, dex: 3, int: 8, armor: 0, critChance: 5, critMulti: 1.5, dodge: 5 },
            speed: 3.5,
            attackRange: 2.0,
            attackCooldown: 0.6,
            attackArc: Math.PI / 3,
            skills: [
                { id: 'fireball', name: 'Fireball', manaCost: 20, cooldown: 4, color: '#8888ff', icon: '🔥', type: 'aoe_target', damage: 25, range: 5, radius: 1.5, effectColor: '#ffaa00' },
                { id: 'frost', name: 'Frost', manaCost: 25, cooldown: 12, color: '#00ffff', icon: '❄️', type: 'shield', shieldAmount: 30, slowRadius: 3, slowFactor: 0.5, duration: 5, effectColor: '#00ffff' }
            ],
            promotions: ['archmage', 'warlock']
        }
    },

    ADVANCED_CLASSES: {
        knight: {
            name: 'Knight',
            reqLevel: 10,
            baseStatsAdd: { maxHp: 50, armor: 5 },
            growth: { maxHp: 20, maxMp: 3, str: 2, dex: 0.5, int: 1 },
            color: '#dddddd',
            icon: '🛡️'
        },
        berserker: {
            name: 'Berserker',
            reqLevel: 10,
            baseStatsAdd: { maxHp: 20, str: 5, damagePercent: 10 },
            growth: { maxHp: 18, maxMp: 0, str: 3, dex: 1, int: 0 },
            color: '#aa0000',
            icon: '🩸'
        },
        assassin: {
            name: 'Assassin',
            reqLevel: 10,
            baseStatsAdd: { dex: 5, critChance: 10 },
            growth: { maxHp: 9, maxMp: 5, str: 1, dex: 3, int: 1 },
            color: '#222222',
            icon: '🌑'
        },
        duelist: {
            name: 'Duelist',
            reqLevel: 10,
            baseStatsAdd: { dex: 3, str: 3, dodge: 10 },
            growth: { maxHp: 12, maxMp: 4, str: 2, dex: 2, int: 0 },
            color: '#aaaaff',
            icon: '⚔️'
        },
        archmage: {
            name: 'Archmage',
            reqLevel: 10,
            baseStatsAdd: { maxMp: 60, int: 6 },
            growth: { maxHp: 6, maxMp: 15, str: 0, dex: 0, int: 3 },
            color: '#0000aa',
            icon: '🧙‍♂️'
        },
        warlock: {
            name: 'Warlock',
            reqLevel: 10,
            baseStatsAdd: { maxHp: 40, int: 4, damagePercent: 5 },
            growth: { maxHp: 10, maxMp: 8, str: 1, dex: 1, int: 2 },
            color: '#880088',
            icon: '💀'
        }
    },

    // Display
    TILE_SIZE: 32,
    MAP_WIDTH: 50,
    MAP_HEIGHT: 40,
    VIEWPORT_TILES_X: 25,
    VIEWPORT_TILES_Y: 19,

    // Dungeon Generation
    MIN_ROOM_SIZE: 5,
    MAX_ROOM_SIZE: 12,
    MIN_ROOMS: 6,
    MAX_ROOMS: 10,
    MAX_FLOORS: 5,

    // Player
    PLAYER_BASE_HP: 100,
    PLAYER_BASE_MP: 50,
    PLAYER_BASE_STR: 10,
    PLAYER_BASE_DEX: 10,
    PLAYER_BASE_INT: 10,
    PLAYER_BASE_ARMOR: 0,
    PLAYER_BASE_CRIT_CHANCE: 5,
    PLAYER_BASE_CRIT_MULTI: 1.5,
    PLAYER_BASE_DODGE: 3,
    XP_PER_LEVEL: 50,
    XP_GROWTH: 1.5,
    SKILL_POINTS_PER_LEVEL: 1,

    // Real-Time Movement
    PLAYER_SPEED: 4.5,         // tiles per second
    PLAYER_RADIUS: 0.3,        // collision radius
    ENEMY_SPEED_BASE: 1.5,     // base tiles/sec
    ENEMY_SPEED_CHASE: 2.8,    // chase tiles/sec
    ENEMY_RADIUS: 0.28,        // collision radius
    ATTACK_RANGE: 0.8,         // distance to auto-attack
    ATTACK_COOLDOWN: 0.4,      // seconds between attacks
    ENEMY_ATTACK_COOLDOWN: 1.0,// seconds between enemy attacks
    PICKUP_RANGE: 0.6,         // distance to auto-pickup

    // Combat
    BASE_HIT_CHANCE: 90,

    // Items
    DROP_CHANCE: 0.35,
    POTION_DROP_CHANCE: 0.25,

    // Game States
    STATE: {
        MENU: 'MENU',
        PLAYING: 'PLAYING',
        SKILL_TREE: 'SKILL_TREE',
        INVENTORY: 'INVENTORY',
        DEAD: 'DEAD',
        LEVEL_UP: 'LEVEL_UP'
    },

    // Tile Types
    TILE: {
        WALL: 0,
        FLOOR: 1,
        CORRIDOR: 2,
        DOOR: 3,
        STAIRS_DOWN: 4,
        CHEST: 5
    },

    // Colors
    COLORS: {
        BG: '#0a0a12',
        WALL: '#2a1f3d',
        WALL_TOP: '#3d2d5c',
        FLOOR: '#1a1425',
        FLOOR_ALT: '#1e1830',
        CORRIDOR: '#151020',
        DOOR: '#8B6914',
        STAIRS: '#FFD700',
        CHEST: '#DAA520',
        FOG: '#050510',
        EXPLORED: 'rgba(10, 10, 18, 0.6)',

        // UI
        HP_BAR: '#e74c3c',
        HP_BAR_BG: '#3d1515',
        MP_BAR: '#3498db',
        MP_BAR_BG: '#152a3d',
        XP_BAR: '#f1c40f',
        XP_BAR_BG: '#3d3515',

        // Rarity
        COMMON: '#9d9d9d',
        MAGIC: '#4169E1',
        RARE: '#FFD700',
        LEGENDARY: '#FF6600',

        // Combat
        DAMAGE: '#ff4444',
        HEAL: '#44ff44',
        CRIT: '#ffaa00',
        DODGE: '#aaaaaa',
        XP_GAIN: '#f1c40f',
        LEVEL_UP: '#ff66ff',

        // Skill Tree
        STR_COLOR: '#e74c3c',
        DEX_COLOR: '#2ecc71',
        INT_COLOR: '#3498db',
        NODE_UNALLOCATED: '#333344',
        NODE_AVAILABLE: '#555577',
        NODE_ALLOCATED: '#FFD700',
        CONNECTION_DEFAULT: '#222233',
        CONNECTION_ALLOCATED: '#aa8833',
        SKILLTREE_BG: '#08080f'
    },

    // Monster Skills
    MONSTER_SKILLS: {
        // AoE Circle (Self or Target)
        smash: {
            name: 'Smash',
            type: 'circle',
            radius: 1.5,
            damageScale: 1.5, // x damage
            castTime: 1.5, // seconds warning
            cooldown: 8,
            color: 'rgba(255, 0, 0, 0.3)',
            range: 1.2
        },
        poison_nova: {
            name: 'Poison Nova',
            type: 'circle',
            radius: 2.0,
            damageScale: 0.8,
            castTime: 1.2,
            cooldown: 10,
            color: 'rgba(100, 255, 0, 0.3)',
            range: 0 // self
        },
        fire_zone: {
            name: 'Fire Zone',
            type: 'circle',
            radius: 1.5,
            damageScale: 1.2,
            castTime: 1.5,
            cooldown: 12,
            color: 'rgba(255, 100, 0, 0.3)',
            range: 5
        },
        // Line Attack
        charge: {
            name: 'Charge',
            type: 'line',
            length: 5,
            width: 1,
            damageScale: 1.2,
            castTime: 1.0,
            cooldown: 8,
            color: 'rgba(255, 255, 255, 0.3)',
            range: 4
        }
    },

    // Enemy definitions
    ENEMIES: {
        skeleton: {
            name: 'Skeleton',
            symbol: '💀',
            hp: 25,
            damage: [5, 10],
            armor: 2,
            xp: 15,
            color: '#ccccaa',
            speed: 1,
            sightRange: 6,
            skills: ['charge']
        },
        slime: {
            name: 'Slime',
            symbol: '🟢',
            hp: 15,
            damage: [3, 7],
            armor: 0,
            xp: 10,
            color: '#44dd44',
            speed: 0.5,
            sightRange: 4,
            skills: ['poison_nova']
        },
        goblin: {
            name: 'Goblin',
            symbol: '👺',
            hp: 30,
            damage: [7, 13],
            armor: 3,
            xp: 20,
            color: '#88aa44',
            speed: 1,
            sightRange: 7,
            skills: ['charge']
        },
        dark_mage: {
            name: 'Dark Mage',
            symbol: '🧙',
            hp: 20,
            damage: [10, 18],
            armor: 1,
            xp: 30,
            color: '#9944cc',
            speed: 1,
            sightRange: 8,
            skills: ['fire_zone']
        },
        boss: {
            name: 'Floor Guardian',
            symbol: '👹',
            hp: 80,
            damage: [12, 25],
            armor: 8,
            xp: 100,
            color: '#ff4444',
            speed: 1,
            sightRange: 10,
            isBoss: true,
            skills: ['smash', 'charge']
        }
    },

    // Floor enemy spawn tables
    FLOOR_ENEMIES: [
        ['skeleton', 'slime'],
        ['skeleton', 'slime', 'goblin'],
        ['skeleton', 'goblin', 'dark_mage'],
        ['goblin', 'dark_mage'],
        ['goblin', 'dark_mage']
    ],
    FLOOR_ENEMY_COUNT: [5, 7, 9, 11, 13],

    // Sounds (placeholder)
    SOUNDS_ENABLED: false
};
