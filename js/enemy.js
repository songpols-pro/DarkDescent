// ============================================================
// ENEMY — Real-Time Autonomous AI
// ============================================================

class Enemy {
    static _nextId = 0;

    constructor(type, x, y, floor = 1) {
        this.id = Enemy._nextId++;
        const def = CONFIG.ENEMIES[type];
        this.type = type;
        this.name = def.name;
        this.symbol = def.symbol;
        this.color = def.color;
        this.x = x + 0.5; // center in tile
        this.y = y + 0.5;
        this.radius = CONFIG.ENEMY_RADIUS;
        this.isBoss = def.isBoss || false;

        // Scale stats by floor
        const scale = 1 + (floor - 1) * 0.25;
        this.maxHp = Math.round(def.hp * scale);
        this.hp = this.maxHp;
        this.damage = [Math.round(def.damage[0] * scale), Math.round(def.damage[1] * scale)];
        this.armor = Math.round(def.armor * scale);
        this.xp = Math.round(def.xp * scale);
        this.sightRange = def.sightRange;

        // Speeds
        this.patrolSpeed = CONFIG.ENEMY_SPEED_BASE * (def.speed || 1) * 0.5;
        this.chaseSpeed = CONFIG.ENEMY_SPEED_CHASE * (def.speed || 1);

        // AI state
        this.state = 'idle'; // idle, chase, return
        this.idleTimer = Math.random() * 3; // random start offset
        this.patrolDir = this.randomDir();
        this.patrolWalkTime = 0;
        this.alertTimer = 0;

        // Combat
        this.attackCooldown = 0;

        // Visual
        this.animOffset = { x: 0, y: 0 };
        this.hitFlash = 0;

        // Skills
        this.level = floor;
        this.skills = def.skills || [];
        this.skillCooldowns = {}; // { skillKey: timeRemaining }
        this.castTimer = 0;
        this.currentSkill = null;
        this.telegraph = null; // { type, x, y, radius/length, ... }

        // Home position (for returning)
        this.homeX = this.x;
        this.homeY = this.y;
    }

    randomDir() {
        const angle = Math.random() * Math.PI * 2;
        return { x: Math.cos(angle), y: Math.sin(angle) };
    }

    takeDamage(amount) {
        const reduced = Math.max(1, amount - this.armor);
        this.hp -= reduced;
        this.hitFlash = 0.15; // seconds
        if (this.hp < 0) this.hp = 0;
        // Getting hit always triggers chase
        if (this.state !== 'cast') {
            this.state = 'chase';
        }
        return reduced;
    }

    isDead() {
        return this.hp <= 0;
    }

    calculateDamage() {
        return Utils.randInt(this.damage[0], this.damage[1]);
    }

    // Real-time update
    update(dt, dungeon, playerX, playerY, enemies) {
        if (this.isDead()) return null;

        // Timers
        if (this.hitFlash > 0) this.hitFlash -= dt;
        if (this.attackCooldown > 0) this.attackCooldown -= dt;

        // Skill Cooldowns
        for (const key in this.skillCooldowns) {
            if (this.skillCooldowns[key] > 0) {
                this.skillCooldowns[key] -= dt;
            }
        }

        // Handle Casting State
        if (this.state === 'cast') {
            this.castTimer -= dt;
            if (this.castTimer <= 0) {
                return this.executeSkill(playerX, playerY);
            }
            return null; // Casting... do nothing else
        }

        const dist = Utils.distance(this.x, this.y, playerX, playerY);
        const canSeePlayer = dist <= this.sightRange &&
            Utils.hasLineOfSight(dungeon.map,
                Math.floor(this.x), Math.floor(this.y),
                Math.floor(playerX), Math.floor(playerY));

        // State transitions
        if (canSeePlayer) {
            this.state = 'chase';
            this.alertTimer = 0;
        } else if (this.state === 'chase') {
            this.alertTimer += dt;
            if (this.alertTimer > 3) {
                this.state = 'idle';
                this.idleTimer = 0;
            }
        }

        // Act based on state
        if (this.state === 'chase') {
            return this.chaseUpdate(dt, dungeon, playerX, playerY, enemies, dist);
        } else {
            this.patrolUpdate(dt, dungeon, enemies);
            return null;
        }
    }

    chaseUpdate(dt, dungeon, px, py, enemies, dist) {
        // 1. Check for Skills
        for (const skillKey of this.skills) {
            if ((this.skillCooldowns[skillKey] || 0) > 0) continue;

            const skill = CONFIG.MONSTER_SKILLS[skillKey];
            if (!skill) continue;

            // Check range
            if (dist <= skill.range || skill.range === 0) {
                // Start casting
                this.startCasting(skill, px, py);
                return null;
            }
        }

        // 2. Default Attack
        if (dist < CONFIG.ATTACK_RANGE) {
            if (this.attackCooldown <= 0) {
                this.attackCooldown = CONFIG.ENEMY_ATTACK_COOLDOWN;
                return { type: 'attack', damage: this.calculateDamage() };
            }
            return null;
        }

        // 3. Move toward player
        const dx = px - this.x;
        const dy = py - this.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0.01) {
            const speed = this.chaseSpeed * dt;
            const mx = (dx / len) * speed;
            const my = (dy / len) * speed;
            this.tryMove(mx, my, dungeon, enemies);
        }

        return null;
    }

    startCasting(skill, px, py) {
        this.state = 'cast';
        this.currentSkill = skill;
        this.castTimer = skill.castTime;
        this.skillCooldowns[skill.name.toLowerCase().replace(' ', '_')] = skill.cooldown; // naive key usage, better to use the key from config... but I don't have it here easily unless I passed it.
        // Actually I should store the key or pass it.
        // Fix: I will set cooldown properly in executeSkill or loop.

        // Setup telegraph
        this.telegraph = {
            type: skill.type,
            x: this.x,
            y: this.y,
            castTime: skill.castTime,
            maxTime: skill.castTime,
            color: skill.color
        };

        if (skill.type === 'circle') {
            this.telegraph.radius = skill.radius;
            // specific target logic? if range=0 it's self. if range>0 it's target?
            if (skill.range > 0) {
                this.telegraph.x = px; // Aim at player's current position
                this.telegraph.y = py;
            }
        } else if (skill.type === 'line') {
            const angle = Math.atan2(py - this.y, px - this.x);
            this.telegraph.angle = angle;
            this.telegraph.length = skill.length;
            this.telegraph.width = skill.width;
        }
    }

    executeSkill(px, py) {
        const skill = this.currentSkill;
        const damage = Math.round(this.calculateDamage() * skill.damageScale);

        // Set cooldown using the key found in Config (reverse lookup or just store key)
        // I'll fix the cooldown setting in the loop above or here.
        // Let's iterate skills to find the key
        for (const key in CONFIG.MONSTER_SKILLS) {
            if (CONFIG.MONSTER_SKILLS[key] === skill) {
                this.skillCooldowns[key] = skill.cooldown;
                break;
            }
        }

        this.state = 'chase'; // Go back to chasing
        this.currentSkill = null;
        const telegraph = this.telegraph;
        this.telegraph = null;

        return {
            type: 'skill',
            skillName: skill.name,
            damage: damage,
            telegraph: telegraph, // Pass telegraph info for hit check in Main/Combat
            knockback: skill.knockback
        };
    }

    patrolUpdate(dt, dungeon, enemies) {
        this.idleTimer += dt;

        // Pause between patrols
        if (this.idleTimer < 1.5) return;

        // Walk in patrol direction
        this.patrolWalkTime += dt;
        if (this.patrolWalkTime > 2 + Math.random() * 2) {
            // Change direction
            this.patrolDir = this.randomDir();
            this.patrolWalkTime = 0;
            this.idleTimer = 0;
            return;
        }

        const speed = this.patrolSpeed * dt;
        const mx = this.patrolDir.x * speed;
        const my = this.patrolDir.y * speed;

        if (!this.tryMove(mx, my, dungeon, enemies)) {
            // Hit wall, reverse direction
            this.patrolDir.x *= -1;
            this.patrolDir.y *= -1;
            this.patrolWalkTime = 0;
        }
    }

    tryMove(mx, my, dungeon, enemies) {
        let moved = false;

        // Move X
        const newX = this.x + mx;
        if (!this.collidesWall(newX, this.y, dungeon) &&
            !this.collidesEnemies(newX, this.y, enemies)) {
            this.x = newX;
            moved = true;
        }

        // Move Y
        const newY = this.y + my;
        if (!this.collidesWall(this.x, newY, dungeon) &&
            !this.collidesEnemies(this.x, newY, enemies)) {
            this.y = newY;
            moved = true;
        }

        return moved;
    }

    collidesWall(px, py, dungeon) {
        const r = this.radius;
        const minTX = Math.floor(px - r);
        const maxTX = Math.floor(px + r);
        const minTY = Math.floor(py - r);
        const maxTY = Math.floor(py + r);

        for (let ty = minTY; ty <= maxTY; ty++) {
            for (let tx = minTX; tx <= maxTX; tx++) {
                if (tx < 0 || ty < 0 || tx >= dungeon.width || ty >= dungeon.height) return true;
                if (dungeon.map[ty][tx] === CONFIG.TILE.WALL) {
                    const closestX = Math.max(tx, Math.min(px, tx + 1));
                    const closestY = Math.max(ty, Math.min(py, ty + 1));
                    const distSq = (px - closestX) ** 2 + (py - closestY) ** 2;
                    if (distSq < r * r) return true;
                }
            }
        }
        return false;
    }

    collidesEnemies(px, py, enemies) {
        const r = this.radius;
        for (const e of enemies) {
            if (e === this || e.isDead()) continue;
            const dx = px - e.x;
            const dy = py - e.y;
            const minDist = r + e.radius;
            if (dx * dx + dy * dy < minDist * minDist) return true;
        }
        return false;
    }
}
