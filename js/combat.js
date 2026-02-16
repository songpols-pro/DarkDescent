// ============================================================
// COMBAT SYSTEM — Real-Time
// ============================================================

class Combat {
    constructor() {
        this.floatingTexts = [];
    }

    playerAttackEnemy(player, enemy) {
        const rawDamage = player.calculateDamage();
        const isCrit = Math.random() * 100 < player.stats.critChance;
        let damage = isCrit ? Math.round(rawDamage * player.stats.critMulti) : rawDamage;

        const actualDamage = enemy.takeDamage(damage);

        // Floating text
        this.addFloatingText(
            enemy.x, enemy.y,
            actualDamage.toString() + (isCrit ? '!' : ''),
            isCrit ? CONFIG.COLORS.CRIT : CONFIG.COLORS.DAMAGE,
            isCrit
        );

        // Life on hit
        if (player.stats.lifeOnHit > 0) {
            player.heal(player.stats.lifeOnHit);
        }
        if (player.stats.manaOnHit > 0) {
            player.restoreMana(player.stats.manaOnHit);
        }

        player.startAttackCooldown();

        const result = {
            damage: actualDamage,
            isCrit,
            killed: enemy.isDead(),
            xpGained: 0,
            levelUps: []
        };

        if (result.killed) {
            result.xpGained = enemy.xp;
            result.levelUps = player.gainXp(enemy.xp);
            player.stats.enemiesKilled++;

            this.addFloatingText(enemy.x, enemy.y, `+${enemy.xp} XP`, CONFIG.COLORS.XP_GAIN, false);
        }

        return result;
    }

    enemyAttackPlayer(enemy, player) {
        // Dodge check
        const dodgeRoll = Math.random() * 100;
        if (dodgeRoll < player.stats.dodge) {
            this.addFloatingText(player.x, player.y, 'DODGE', CONFIG.COLORS.DODGE, false);
            return { dodged: true, shielded: false, damage: 0 };
        }

        const rawDamage = enemy.calculateDamage();
        const damage = Math.max(1, rawDamage - player.stats.armor);

        // Shield check (Frost Shield)
        if (player.shieldHp > 0) {
            const actual = player.takeDamageWithShield(damage);
            if (actual <= 0) {
                this.addFloatingText(player.x, player.y, 'SHIELDED', '#44ccff', false);
                return { dodged: false, shielded: true, damage: 0 };
            }
            this.addFloatingText(player.x, player.y, actual.toString(), CONFIG.COLORS.DAMAGE, false);
            return { dodged: false, shielded: false, damage: actual };
        }

        player.hp -= damage;
        if (player.hp < 0) player.hp = 0;

        this.addFloatingText(player.x, player.y, damage.toString(), CONFIG.COLORS.DAMAGE, false);

        return { dodged: false, shielded: false, damage };
    }

    addFloatingText(x, y, text, color, large = false) {
        this.floatingTexts.push({
            x, y,
            text,
            color,
            large,
            life: 1.0
        });
    }

    updateFloatingTexts(dt) {
        this.floatingTexts = this.floatingTexts.filter(ft => {
            ft.life -= dt * 1.5;
            return ft.life > 0;
        });
    }
}
