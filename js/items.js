// ============================================================
// ITEM DEFINITIONS & LOOT TABLES
// ============================================================

const ITEM_TYPES = {
    WEAPON: 'weapon',
    HELMET: 'helmet',
    CHEST: 'chest',
    BOOTS: 'boots',
    RING: 'ring',
    POTION: 'potion'
};

const RARITY = {
    COMMON: { name: 'Common', color: CONFIG.COLORS.COMMON, weight: 60, statMulti: 1.0 },
    MAGIC: { name: 'Magic', color: CONFIG.COLORS.MAGIC, weight: 25, statMulti: 1.5 },
    RARE: { name: 'Rare', color: CONFIG.COLORS.RARE, weight: 12, statMulti: 2.2 },
    LEGENDARY: { name: 'Legendary', color: CONFIG.COLORS.LEGENDARY, weight: 3, statMulti: 3.5 }
};

const ITEM_BASES = {
    // Weapons (Swords - Balanced)
    rusty_sword: { type: ITEM_TYPES.WEAPON, name: 'Rusty Sword', symbol: '🗡️', baseDamage: [4, 8], slot: 'weapon', range: 1.2, cooldown: 0.5, arc: Math.PI / 2.5 },
    iron_sword: { type: ITEM_TYPES.WEAPON, name: 'Iron Sword', symbol: '⚔️', baseDamage: [7, 13], slot: 'weapon', range: 1.2, cooldown: 0.5, arc: Math.PI / 2.5 },
    dark_blade: { type: ITEM_TYPES.WEAPON, name: 'Dark Blade', symbol: '🔪', baseDamage: [10, 18], slot: 'weapon', range: 1.2, cooldown: 0.45, arc: Math.PI / 2.5 },
    flame_sword: { type: ITEM_TYPES.WEAPON, name: 'Flame Sword', symbol: '🔥', baseDamage: [14, 24], slot: 'weapon', range: 1.2, cooldown: 0.5, arc: Math.PI / 2.5 },

    // Axes - High Dmg, Slow, Wide Arc
    wood_axe: { type: ITEM_TYPES.WEAPON, name: 'Wood Axe', symbol: '🪓', baseDamage: [8, 14], slot: 'weapon', range: 1.0, cooldown: 0.8, arc: Math.PI / 1.5 },
    battle_axe: { type: ITEM_TYPES.WEAPON, name: 'Battle Axe', symbol: '🪓', baseDamage: [15, 25], slot: 'weapon', range: 1.1, cooldown: 0.9, arc: Math.PI / 1.2 },
    doom_axe: { type: ITEM_TYPES.WEAPON, name: 'Doom Axe', symbol: '💀', baseDamage: [25, 40], slot: 'weapon', range: 1.1, cooldown: 1.0, arc: Math.PI / 1.2 },

    // Daggers - Low Dmg, Fast, Narrow Arc, High Crit (implicit via attributes or speed)
    rusted_dagger: { type: ITEM_TYPES.WEAPON, name: 'Rusty Dagger', symbol: '🗡️', baseDamage: [3, 6], slot: 'weapon', range: 0.8, cooldown: 0.25, arc: Math.PI / 6 },
    assassin_dagger: { type: ITEM_TYPES.WEAPON, name: 'Assassin Dagger', symbol: '🗡️', baseDamage: [6, 10], slot: 'weapon', range: 0.8, cooldown: 0.2, arc: Math.PI / 6 },

    // Spears - Med Dmg, Long Range, Narrow Arc
    wooden_spear: { type: ITEM_TYPES.WEAPON, name: 'Wooden Spear', symbol: '🔱', baseDamage: [5, 9], slot: 'weapon', range: 2.5, cooldown: 0.6, arc: Math.PI / 8 },
    steel_lance: { type: ITEM_TYPES.WEAPON, name: 'Steel Lance', symbol: '🔱', baseDamage: [10, 16], slot: 'weapon', range: 2.8, cooldown: 0.6, arc: Math.PI / 8 },

    // Staffs - Low Melee Dmg, Boosts Magic
    apprentice_staff: { type: ITEM_TYPES.WEAPON, name: 'Apprentice Staff', symbol: '🦯', baseDamage: [3, 5], slot: 'weapon', range: 1.5, cooldown: 0.6, arc: Math.PI / 3, bonuses: { intFlat: 3 } },
    elder_staff: { type: ITEM_TYPES.WEAPON, name: 'Elder Staff', symbol: '🦯', baseDamage: [6, 10], slot: 'weapon', range: 1.5, cooldown: 0.6, arc: Math.PI / 3, bonuses: { intFlat: 6 } },

    // Helmets
    leather_cap: { type: ITEM_TYPES.HELMET, name: 'Leather Cap', symbol: '🎩', baseArmor: 2, slot: 'helmet' },
    iron_helm: { type: ITEM_TYPES.HELMET, name: 'Iron Helm', symbol: '⛑️', baseArmor: 5, slot: 'helmet' },
    dark_crown: { type: ITEM_TYPES.HELMET, name: 'Dark Crown', symbol: '👑', baseArmor: 8, slot: 'helmet' },

    // Chest armor
    cloth_robe: { type: ITEM_TYPES.CHEST, name: 'Cloth Robe', symbol: '👘', baseArmor: 3, slot: 'chest' },
    chain_mail: { type: ITEM_TYPES.CHEST, name: 'Chain Mail', symbol: '🦺', baseArmor: 7, slot: 'chest' },
    plate_armor: { type: ITEM_TYPES.CHEST, name: 'Plate Armor', symbol: '🛡️', baseArmor: 12, slot: 'chest' },

    // Boots
    sandals: { type: ITEM_TYPES.BOOTS, name: 'Sandals', symbol: '👡', baseArmor: 1, baseDodge: 2, slot: 'boots' },
    iron_boots: { type: ITEM_TYPES.BOOTS, name: 'Iron Boots', symbol: '🥾', baseArmor: 4, baseDodge: 0, slot: 'boots' },
    shadow_boots: { type: ITEM_TYPES.BOOTS, name: 'Shadow Boots', symbol: '👢', baseArmor: 2, baseDodge: 8, slot: 'boots' },

    // Rings
    copper_ring: { type: ITEM_TYPES.RING, name: 'Copper Ring', symbol: '💍', slot: 'ring' },
    gold_ring: { type: ITEM_TYPES.RING, name: 'Gold Ring', symbol: '💍', slot: 'ring' },
};

// ... PREFIXES/SUFFIXES ...

// Floor-based loot tables (item base keys available per floor)
const FLOOR_LOOT = [
    ['rusty_sword', 'wood_axe', 'rusted_dagger', 'leather_cap', 'cloth_robe', 'sandals', 'copper_ring', 'apprentice_staff'],
    ['iron_sword', 'wooden_spear', 'leather_cap', 'iron_helm', 'cloth_robe', 'chain_mail', 'sandals', 'iron_boots', 'copper_ring'],
    ['iron_sword', 'dark_blade', 'battle_axe', 'assassin_dagger', 'iron_helm', 'chain_mail', 'iron_boots', 'shadow_boots', 'gold_ring'],
    ['dark_blade', 'flame_sword', 'steel_lance', 'elder_staff', 'iron_helm', 'dark_crown', 'chain_mail', 'plate_armor', 'shadow_boots', 'gold_ring'],
    ['flame_sword', 'doom_axe', 'dark_crown', 'plate_armor', 'shadow_boots', 'gold_ring'],
];

class ItemGenerator {
    static generateItem(floor = 1) {
        // Pick rarity
        const rarities = Object.values(RARITY);
        const weights = rarities.map(r => r.weight);
        const rarity = Utils.weightedChoice(rarities, weights);

        // Pick item base from floor loot table
        const lootTable = FLOOR_LOOT[floor - 1] || FLOOR_LOOT[FLOOR_LOOT.length - 1];
        const baseKey = Utils.randChoice(lootTable);
        const base = ITEM_BASES[baseKey];

        const item = {
            id: Date.now() + Math.random(),
            baseKey,
            type: base.type,
            slot: base.slot,
            symbol: base.symbol,
            rarity: rarity,
            bonuses: base.bonuses ? { ...base.bonuses } : {},
            baseDamage: base.baseDamage ? [...base.baseDamage] : null,
            baseArmor: base.baseArmor || 0,
            baseDodge: base.baseDodge || 0,
            // Weapon stats
            range: base.range,
            cooldown: base.cooldown,
            arc: base.arc
        };

        // Apply rarity multiplier to base stats
        if (item.baseDamage) {
            item.baseDamage[0] = Math.round(item.baseDamage[0] * rarity.statMulti);
            item.baseDamage[1] = Math.round(item.baseDamage[1] * rarity.statMulti);
        }
        if (item.baseArmor) {
            item.baseArmor = Math.round(item.baseArmor * rarity.statMulti);
        }

        // Build name
        let name = base.name;

        // Add affixes for magic+ items
        if (rarity !== RARITY.COMMON) {
            const prefix = Utils.randChoice(PREFIXES);
            name = prefix.name + ' ' + name;
            Object.entries(prefix.bonus).forEach(([k, v]) => {
                item.bonuses[k] = (item.bonuses[k] || 0) + v;
            });
        }
        if (rarity === RARITY.RARE || rarity === RARITY.LEGENDARY) {
            const suffix = Utils.randChoice(SUFFIXES);
            name = name + ' ' + suffix.name;
            Object.entries(suffix.bonus).forEach(([k, v]) => {
                item.bonuses[k] = (item.bonuses[k] || 0) + v;
            });
        }
        if (rarity === RARITY.LEGENDARY) {
            // Extra bonus for legendary
            const extraPrefix = Utils.randChoice(PREFIXES);
            Object.entries(extraPrefix.bonus).forEach(([k, v]) => {
                item.bonuses[k] = (item.bonuses[k] || 0) + Math.round(v * 1.5);
            });
        }

        item.name = name;
        return item;
    }

    static generatePotion(floor = 1) {
        const availablePotions = floor >= 3 ? POTION_TYPES : POTION_TYPES.slice(0, 3);
        const potionBase = Utils.randChoice(availablePotions);
        return {
            id: Date.now() + Math.random(),
            type: ITEM_TYPES.POTION,
            name: potionBase.name,
            symbol: potionBase.symbol,
            effect: potionBase.effect,
            value: potionBase.value,
            duration: potionBase.duration || 0,
            color: potionBase.color,
            rarity: RARITY.COMMON
        };
    }

    static getItemDescription(item) {
        const lines = [];
        if (item.baseDamage) {
            lines.push(`Damage: ${item.baseDamage[0]}-${item.baseDamage[1]}`);
        }
        if (item.range) {
            lines.push(`Range: ${item.range.toFixed(1)} | Spd: ${item.cooldown}s`);
        }
        if (item.baseArmor) {
            lines.push(`Armor: +${item.baseArmor}`);
        }
        if (item.baseDodge) {
            lines.push(`Dodge: +${item.baseDodge}%`);
        }
        Object.entries(item.bonuses || {}).forEach(([key, val]) => {
            const labels = {
                strFlat: 'STR', dexFlat: 'DEX', intFlat: 'INT',
                strPercent: '% Damage', maxHp: 'Max HP', maxMp: 'Max MP',
                armor: 'Armor', critChance: '% Crit Chance', critMulti: 'x Crit Multi',
                dodge: '% Dodge'
            };
            const label = labels[key] || key;
            lines.push(`+${val} ${label}`);
        });
        return lines;
    }
}
