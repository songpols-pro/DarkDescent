// ============================================================
// PLAYER CHARACTER — Real-Time Free Movement
// ============================================================

class Player {
    constructor(classKey = 'warrior') {
        // Class info
        this.classKey = classKey;
        this.classDef = CONFIG.CLASSES[classKey];

        // Position (float, world units = tile units)
        this.x = 0;
        this.y = 0;
        this.radius = CONFIG.PLAYER_RADIUS;

        // Movement
        this.speed = this.classDef.speed;
        this.vx = 0;
        this.vy = 0;
        this.facingAngle = 0; // radians

        // Mouse aim angle
        this.aimAngle = 0;

        // Visual
        this.lastMoveDir = { x: 0, y: 0 };
        this.animOffset = { x: 0, y: 0 };
        this.isMoving = false;
        this.isAttacking = false;
        this.attackTimer = 0; // visual timer for swing animation

        // Stats
        this.level = 1;
        this.xp = 0;
        this.xpToNextLevel = CONFIG.XP_PER_LEVEL; // Renamed from xpToNext
        this.skillPoints = 0;

        // Base stats from class definition
        this.baseStats = { ...this.classDef.stats };

        // Initialize stats with base stats
        this.stats = { ...this.baseStats };
        this.hp = this.stats.maxHp;
        this.mp = this.stats.maxMp;

        // Combat — class-specific
        this.attackCooldown = 0;
        this.attackRange = this.classDef.attackRange;
        this.attackCooldownTime = this.classDef.attackCooldown;
        this.attackArc = this.classDef.attackArc;

        // Equipment (slots)
        this.equipment = {
            weapon: null,
            helmet: null,
            chest: null,
            boots: null,
            ring: null
        };

        // Inventory
        this.inventory = new Array(15).fill(null);

        // Buffs
        this.buffs = [];

        // Skills
        this.skillCooldowns = [0, 0];
        this.shieldHp = 0;       // active frost shield HP
        this.poisonHits = 0;     // remaining poison-coated attacks
        this.poisonDamage = 0;   // damage per poison tick

        // Game stats
        this.stats.turnsPlayed = 0;
        this.stats.enemiesKilled = 0;
        this.stats.floorsCleared = 0;
    }

    // Real-time movement update
    update(dt, dungeon) {
        if (this.attackCooldown > 0) {
            this.attackCooldown -= dt;
        }

        // Apply velocity with collision
        if (this.vx !== 0 || this.vy !== 0) {
            this.isMoving = true;

            // Normalize diagonal speed
            const len = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            const nx = (this.vx / len) * this.speed * dt;
            const ny = (this.vy / len) * this.speed * dt;

            // Move X then Y separately for slide-along-wall
            const newX = this.x + nx;
            if (!this.collidesAt(newX, this.y, dungeon)) {
                this.x = newX;
            }

            const newY = this.y + ny;
            if (!this.collidesAt(this.x, newY, dungeon)) {
                this.y = newY;
            }

            // Update facing
            this.facingAngle = Math.atan2(this.vx, this.vy);
            this.lastMoveDir = { x: this.vx, y: this.vy };
        } else {
            this.isMoving = false;
        }
    }

    // Circle vs tile grid collision
    collidesAt(px, py, dungeon) {
        const r = this.radius;
        // Check tiles that overlap the player's bounding box
        const minTX = Math.floor(px - r);
        const maxTX = Math.floor(px + r);
        const minTY = Math.floor(py - r);
        const maxTY = Math.floor(py + r);

        for (let ty = minTY; ty <= maxTY; ty++) {
            for (let tx = minTX; tx <= maxTX; tx++) {
                if (tx < 0 || ty < 0 || tx >= dungeon.width || ty >= dungeon.height) return true;
                if (dungeon.map[ty][tx] === CONFIG.TILE.WALL) {
                    // AABB circle vs tile collision
                    const closestX = Math.max(tx, Math.min(px, tx + 1));
                    const closestY = Math.max(ty, Math.min(py, ty + 1));
                    const distSq = (px - closestX) ** 2 + (py - closestY) ** 2;
                    if (distSq < r * r) return true;
                }
            }
        }
        return false;
    }

    canAttack() {
        return this.attackCooldown <= 0;
    }

    startAttackCooldown() {
        this.attackCooldown = this.attackCooldownTime;
        this.isAttacking = true;
        this.attackTimer = 0.15; // attack swing visual duration
    }

    recalculateStats(treeBonus = {}) {
        const s = { ...this.baseStats };
        const turnsPlayed = this.stats.turnsPlayed || 0;
        const enemiesKilled = this.stats.enemiesKilled || 0;
        const floorsCleared = this.stats.floorsCleared || 0;

        // Add equipment bonuses
        Object.values(this.equipment).forEach(item => {
            if (!item) return;
            Object.entries(item.bonuses || {}).forEach(([k, v]) => {
                s[k] = (s[k] || 0) + v;
            });
        });

        // Weapon Override
        if (this.equipment.weapon) {
            this.attackRange = this.equipment.weapon.range || this.classDef.attackRange;
            this.attackCooldownTime = this.equipment.weapon.cooldown || this.classDef.attackCooldown;
            this.attackArc = this.equipment.weapon.arc || this.classDef.attackArc;
        } else {
            this.attackRange = this.classDef.attackRange;
            this.attackCooldownTime = this.classDef.attackCooldown;
            this.attackArc = this.classDef.attackArc;
        }

        // Add skill tree bonuses
        Object.entries(treeBonus).forEach(([k, v]) => {
            s[k] = (s[k] || 0) + v;
        });

        // Add buff bonuses
        this.buffs.forEach(b => {
            if (b.stat) s[b.stat] = (s[b.stat] || 0) + b.value;
        });

        // Per-level scaling is now handled in baseStats (cumulative growth)
        // s.str += (this.level - 1) * 2;
        // s.dex += (this.level - 1) * 1;
        // s.int += (this.level - 1) * 1;

        // Apply percentage bonuses
        s.str = Math.round(s.str * (1 + (s.strPercent || 0) / 100));
        s.dex = Math.round(s.dex * (1 + (s.dexPercent || 0) / 100));
        s.int = Math.round(s.int * (1 + (s.intPercent || 0) / 100));
        s.maxHp = Math.round(s.maxHp * (1 + (s.hpPercent || 0) / 100));
        s.maxMp = Math.round(s.maxMp * (1 + (s.mpPercent || 0) / 100));
        s.armor = Math.round(s.armor * (1 + (s.armorPercent || 0) / 100));

        // Carry over game stats
        s.turnsPlayed = turnsPlayed;
        s.enemiesKilled = enemiesKilled;
        s.floorsCleared = floorsCleared;

        this.stats = s;

        // Clamp HP/MP
        if (this.hp > s.maxHp) this.hp = s.maxHp;
        if (this.mp > s.maxMp) this.mp = s.maxMp;

        // Speed bonus from dex
        this.speed = this.classDef.speed * (1 + (s.dex - 10) * 0.01);
    }

    gainXp(amount) {
        this.xp += amount;
        const levelUps = [];
        while (this.xp >= this.xpToNextLevel) {
            this.xp -= this.xpToNextLevel;
            this.level++;
            this.skillPoints += CONFIG.SKILL_POINTS_PER_LEVEL;
            this.xpToNextLevel = Math.round(CONFIG.XP_PER_LEVEL * Math.pow(CONFIG.XP_GROWTH, this.level - 1));
            this.hp = this.stats.maxHp;
            this.mp = this.stats.maxMp;
            levelUps.push(this.level);
        }
        return levelUps;
    }

    calculateDamage() {
        const weapon = this.equipment.weapon;
        let min = 3, max = 6;
        if (weapon && weapon.baseDamage) {
            min = weapon.baseDamage[0];
            max = weapon.baseDamage[1];
        }
        // Mage scales from INT, others from STR
        const statBonus = this.classKey === 'mage'
            ? Math.floor(this.stats.int / 4)
            : Math.floor(this.stats.str / 5);
        const base = Utils.randInt(min, max) + statBonus;
        const dmgMulti = 1 + (this.stats.damagePercent || 0) / 100;
        return Math.round(base * dmgMulti);
    }

    isDead() {
        return this.hp <= 0;
    }

    heal(amount) {
        this.hp = Math.min(this.hp + amount, this.stats.maxHp);
    }

    restoreMana(amount) {
        this.mp = Math.min(this.mp + amount, this.stats.maxMp);
    }

    addBuff(stat, value, duration) {
        this.buffs.push({ stat, value, remaining: duration });
    }

    tickBuffs(dt) {
        this.buffs = this.buffs.filter(b => {
            b.remaining -= dt;
            return b.remaining > 0;
        });
    }

    // ===========================
    // Skill System
    // ===========================
    canUseSkill(idx) {
        const skill = this.classDef.skills[idx];
        if (!skill) return false;
        if (this.skillCooldowns[idx] > 0) return false;
        if (this.mp < skill.manaCost) return false;
        return true;
    }

    useSkill(idx) {
        const skill = this.classDef.skills[idx];
        this.mp -= skill.manaCost;
        this.skillCooldowns[idx] = skill.cooldown;
        return skill;
    }

    tickSkillCooldowns(dt) {
        for (let i = 0; i < this.skillCooldowns.length; i++) {
            if (this.skillCooldowns[i] > 0) {
                this.skillCooldowns[i] = Math.max(0, this.skillCooldowns[i] - dt);
            }
        }
    }

    takeDamageWithShield(damage) {
        if (this.shieldHp > 0) {
            const absorbed = Math.min(this.shieldHp, damage);
            this.shieldHp -= absorbed;
            damage -= absorbed;
        }
        if (damage > 0) {
            this.hp -= damage;
            if (this.hp < 0) this.hp = 0;
        }
        return damage;
    }

    addToInventory(item) {
        const idx = this.inventory.findIndex(slot => slot === null);
        if (idx === -1) return false;
        this.inventory[idx] = item;
        return true;
    }

    removeFromInventory(index) {
        const item = this.inventory[index];
        this.inventory[index] = null;
        return item;
    }

    equip(item) {
        const slot = item.slot;
        const oldItem = this.equipment[slot];
        this.equipment[slot] = item;
        return oldItem;
    }

    unequip(slot) {
        const item = this.equipment[slot];
        if (!item) return null;
        this.equipment[slot] = null;
        return item;
    }

    usePotion(slotIndex) {
        const item = this.inventory[slotIndex];
        if (!item || item.type !== ITEM_TYPES.POTION) return null;
        this.inventory[slotIndex] = null;

        if (item.effect === 'heal') {
            this.heal(item.value);
            return { type: 'heal', value: item.value };
        } else if (item.effect === 'mana') {
            this.restoreMana(item.value);
            return { type: 'mana', value: item.value };
        } else if (item.effect === 'buff_str') {
            this.addBuff('str', item.value, item.duration);
            return { type: 'buff', value: item.value };
        }
        return null;
    }

    // ===========================
    // Getter aliases for UI compatibility
    // ===========================
    get maxHp() { return this.stats.maxHp; }
    get maxMp() { return this.stats.maxMp; }
    get str() { return this.stats.str; }
    get dex() { return this.stats.dex; }
    get int() { return this.stats.int; }
    get armor() { return this.stats.armor; }
    get critChance() { return this.stats.critChance; }
    get critMulti() { return this.stats.critMulti; }
    get dodge() { return this.stats.dodge; }
    get damagePercent() { return this.stats.damagePercent || 0; }
    get baseStr() { return this.baseStats.str; }
    get baseDex() { return this.baseStats.dex; }
    get baseInt() { return this.baseStats.int; }
    get xpToLevel() { return this.xpToNextLevel; }
    get maxInventory() { return this.inventory.length; }
}

