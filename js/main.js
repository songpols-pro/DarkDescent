// ============================================================
// MAIN GAME — Real-Time with Class Selection + Click-to-Attack
// ============================================================

class Game {
    constructor() {
        this.container = document.getElementById('game-container');
        this.skillTreeCanvas = document.getElementById('skilltree-canvas');
        this.skillTreeCanvas.width = window.innerWidth;
        this.skillTreeCanvas.height = window.innerHeight;

        // Systems
        this.renderer = new Renderer(this.container);
        this.combat = new Combat();
        this.ui = new GameUI();
        this.inventory = new Inventory();
        this.skillTree = new SkillTree();
        this.skillTreeUI = new SkillTreeUI(this.skillTreeCanvas);

        // Game state
        this.state = CONFIG.STATE.MENU;
        this.player = null;
        this.dungeon = null;
        this.enemies = [];
        this.groundItems = [];
        this.currentFloor = 1;
        this.visibleSet = new Set();

        // Input state (held keys)
        this.keysHeld = {};

        // Mouse state
        this.mouseWorldX = 0;
        this.mouseWorldY = 0;
        this.mouseScreenX = 0;
        this.mouseScreenY = 0;

        // FOV update throttle
        this.fovTimer = 0;

        // UI update throttle
        this.uiTimer = 0;

        this.setupInput();
        this.setupResize();

        this.ui.showScreen('menu-screen');

        // Start loop
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    setupInput() {
        console.log('Setting up input...');
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            this.keysHeld[key] = true;

            if (this.state === CONFIG.STATE.MENU) {
                return;
            }

            if (this.state === CONFIG.STATE.DEAD) {
                if (e.key === 'Enter' || e.key === ' ') this.startNewGame();
                return;
            }

            if (this.state === CONFIG.STATE.PLAYING) {
                if (key === 't') { this.openSkillTree(); return; }
                if (key === 'i' || key === 'b') { this.ui.toggleInventory(this.player, this.renderer); return; }
                if (key === 'q') { this.executeSkill(0); return; }
                if (key === 'e') { this.executeSkill(1); return; }
                if (key === 'f') { this.tryPickup(); return; }

                // Prevent arrow scrolling
                if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
                    e.preventDefault();
                }
            }

            if (this.state === CONFIG.STATE.SKILL_TREE) {
                if (key === 't' || e.key === 'Escape') this.closeSkillTree();
            }

            // Inventory toggle (works in playing or inventory state)
            if (this.state === CONFIG.STATE.INVENTORY) {
                if (key === 'i' || key === 'b' || e.key === 'Escape') this.ui.toggleInventory(this.player, this.renderer);
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keysHeld[e.key.toLowerCase()] = false;
        });

        // Mouse move — track aim direction
        window.addEventListener('mousemove', (e) => {
            this.mouseScreenX = e.clientX;
            this.mouseScreenY = e.clientY;
        });

        // Click to attack
        window.addEventListener('mousedown', (e) => {
            if (this.state !== CONFIG.STATE.PLAYING) return;
            if (e.button !== 0) return; // left click only

            // Don't attack if clicking on UI panels, skill bar, or modal
            if (e.target.closest('#side-panel') || e.target.closest('#hud') || e.target.closest('#skill-bar') || e.target.closest('.modal-overlay')) return;

            this.performAttack();
        });

        // Skill tree clicks
        this.skillTreeCanvas.addEventListener('click', () => {
            if (this.state === CONFIG.STATE.SKILL_TREE) {
                this.skillTreeUI.handleClick(this.skillTree, this.player, false);
                this.ui.update(this.player, this.currentFloor);
            }
        });

        this.skillTreeCanvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (this.state === CONFIG.STATE.SKILL_TREE) {
                this.skillTreeUI.handleClick(this.skillTree, this.player, true);
                this.ui.update(this.player, this.currentFloor);
            }
        });

        // Inventory clicks (Global handler for both sidebar and modal)
        document.addEventListener('click', (e) => {
            // Only handle inventory clicks if we are in playing or inventory state
            if (this.state !== CONFIG.STATE.PLAYING && this.state !== CONFIG.STATE.INVENTORY) return;

            // Handle Item interactions (Use/Equip/Drop)
            const invSlot = e.target.closest('.inv-slot, .bag-slot'); // Support both old and new classes
            if (invSlot && invSlot.dataset.index !== undefined) {
                const idx = parseInt(invSlot.dataset.index);
                const result = this.inventory.handleClick(this.player, idx, this.skillTree, e.shiftKey);
                if (result) {
                    if (result.action === 'use_potion') {
                        this.ui.addLog(`Used ${result.result.type === 'heal' ? 'Health' : 'Mana'} Potion (+${result.result.value})`, CONFIG.COLORS.HEAL);
                    } else if (result.action === 'equip') {
                        this.ui.addLog(`Equipped: ${result.item.name}`, result.item.rarity.color);
                    } else if (result.action === 'drop') {
                        this.ui.addLog(`Dropped: ${result.item.name}`, '#aaaaaa');
                        this.groundItems.push({ x: this.player.x, y: this.player.y, item: result.item });
                    }
                    // Update both UIs
                    this.ui.update(this.player, this.currentFloor);
                    if (this.state === CONFIG.STATE.INVENTORY) this.ui.updateInventoryModal(this.player);

                    // Trigger visual update if needed
                    if (result.action === 'equip') this.renderer.updatePlayerVisuals(this.player);
                }
            }

            // Handle Equipment interactions (Unequip)
            const equipSlot = e.target.closest('.equip-slot, .inv-equip-slot');
            if (equipSlot && equipSlot.dataset.slot) {
                const result = this.inventory.handleEquipClick(this.player, equipSlot.dataset.slot, this.skillTree);
                if (result) {
                    if (result.action === 'drop_unequip') {
                        this.ui.addLog(`Inventory full! Dropped ${result.item.name}`, '#aaaaaa');
                        this.groundItems.push({ x: this.player.x, y: this.player.y, item: result.item });
                    } else {
                        this.ui.addLog(`Unequipped from ${result.slot}`, '#aaaaaa');
                    }
                    // Update both UIs
                    this.ui.update(this.player, this.currentFloor);
                    if (this.state === CONFIG.STATE.INVENTORY) this.ui.updateInventoryModal(this.player);

                    // Trigger visual update
                    this.renderer.updatePlayerVisuals(this.player);
                }
            }
        });

        // Class selection buttons
        const classBtns = document.querySelectorAll('.class-btn');
        console.log(`Found ${classBtns.length} class buttons`);
        classBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                console.log('Class button clicked:', btn.dataset.class);
                const classKey = btn.dataset.class;
                try {
                    this.startNewGame(classKey);
                } catch (err) {
                    console.error('Error starting game:', err);
                }
            });
        });

        // Menu buttons
        document.getElementById('btn-restart')?.addEventListener('click', () => {
            this.state = CONFIG.STATE.MENU;
            this.ui.hideAllScreens();
            this.ui.showScreen('menu-screen');
        });
        document.getElementById('btn-restart-victory')?.addEventListener('click', () => {
            this.state = CONFIG.STATE.MENU;
            this.ui.hideAllScreens();
            this.ui.showScreen('menu-screen');
        });
    }

    setupResize() {
        window.addEventListener('resize', () => {
            this.skillTreeCanvas.width = window.innerWidth;
            this.skillTreeCanvas.height = window.innerHeight;
        });
    }

    startNewGame(classKey = 'warrior') {
        console.log('Starting new game with class:', classKey);
        try {
            // Reset game state
            this.enemies = [];
            this.groundItems = [];
            this.visibleSet = new Set();
            this.combat = new Combat(); // Re-init combat to clear floating texts
            this.keysHeld = {}; // Clear stuck keys

            this.player = new Player(classKey);
            this.skillTree = new SkillTree();
            this.currentFloor = 1;
            this.generateFloor();
            this.state = CONFIG.STATE.PLAYING;
            this.ui.hideAllScreens();
            this.ui.combatLog = [];

            const cls = CONFIG.CLASSES[classKey];
            this.ui.addLog(`${cls.icon} ${cls.name} enters the dungeon!`, cls.color);
            this.ui.addLog('WASD Move | Click Attack | Q/E Skills | F Pickup | T Skill Tree', '#888899');
            this.player.recalculateStats(this.skillTree.getTotalBonuses());
            this.ui.update(this.player, this.currentFloor);
            document.getElementById('hud').style.display = 'flex';
            document.getElementById('side-panel').style.display = 'flex';
            this.updateSkillBar();

            // Force rebuild player mesh for the new class
            this.renderer.playerMesh = null;

            // Only hide screens and show HUD if everything succeeded
            this.ui.hideAllScreens();
            document.getElementById('hud').style.display = 'flex';
            document.getElementById('side-panel').style.display = 'flex';

            console.log('Game started successfully');
        } catch (e) {
            console.error('Error in startNewGame:', e);
            alert('Failed to start game: ' + e.message);
            this.state = CONFIG.STATE.MENU;
            this.ui.showScreen('menu-screen');
        }
    }

    generateFloor() {
        this.dungeon = new Dungeon(this.currentFloor);
        // Player starts at center of start tile
        this.player.x = this.dungeon.playerStart.x + 0.5;
        this.player.y = this.dungeon.playerStart.y + 0.5;

        // Spawn enemies
        this.enemies = [];
        this.dungeon.enemySpawns.forEach(spawn => {
            this.enemies.push(new Enemy(spawn.type, spawn.x, spawn.y, this.currentFloor));
        });

        this.groundItems = [];

        // Initial FOV
        this.visibleSet = this.dungeon.revealArea(
            Math.floor(this.player.x), Math.floor(this.player.y), 7
        );

        this.ui.addLog(`--- Floor ${this.currentFloor} ---`, '#FFD700');
    }

    // ============================
    // CLICK TO ATTACK
    // ============================
    performAttack() {
        if (!this.player.canAttack()) return;

        const player = this.player;

        // Calculate aim direction from mouse
        const aimAngle = player.aimAngle;

        // Find enemies in range and within attack arc
        let bestTarget = null;
        let bestDist = Infinity;

        this.enemies.forEach(enemy => {
            if (enemy.isDead()) return;
            const dx = enemy.x - player.x;
            const dy = enemy.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > player.attackRange) return;

            // Check if enemy is within the attack arc
            const angleToEnemy = Math.atan2(dx, dy);
            let angleDiff = angleToEnemy - aimAngle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

            if (Math.abs(angleDiff) <= player.attackArc / 2) {
                if (dist < bestDist) {
                    bestDist = dist;
                    bestTarget = enemy;
                }
            }
        });

        // Always swing (even if miss)
        player.startAttackCooldown();

        // Animate swing direction
        player.animOffset = {
            x: Math.sin(aimAngle) * 6,
            y: Math.cos(aimAngle) * 6
        };

        // Visual slash effect
        this.renderer.showAttackSlash(player.x, player.y, aimAngle, player.attackRange, player.attackArc, player.classDef.color);

        if (bestTarget) {
            const result = this.combat.playerAttackEnemy(this.player, bestTarget);
            this.renderer.shake(2);

            // Poison damage on hit
            if (this.player.poisonHits > 0) {
                const poisonDmg = this.player.poisonDamage;
                bestTarget.takeDamage(poisonDmg);
                this.combat.addFloatingText(bestTarget.x, bestTarget.y, `☠${poisonDmg}`, '#88ff33', false);
                this.player.poisonHits--;
                if (this.player.poisonHits <= 0) {
                    this.ui.addLog('Poison faded.', '#88ff33');
                }
            }

            if (result.killed) {
                this.ui.addLog(`${bestTarget.name} defeated! +${result.xpGained} XP`, CONFIG.COLORS.XP_GAIN);
                this.handleEnemyDrop(bestTarget);

                result.levelUps.forEach(lvl => {
                    this.ui.showLevelUp(lvl, this.player.skillPoints);
                    this.player.recalculateStats(this.skillTree.getTotalBonuses());
                });
            }
        }
    }

    handleEnemyDrop(enemy) {
        if (Math.random() < CONFIG.DROP_CHANCE || enemy.isBoss) {
            const loot = ItemGenerator.generateItem(this.currentFloor);
            this.groundItems.push({ x: enemy.x, y: enemy.y, item: loot });
            this.ui.addLog(`Dropped: ${loot.name}`, loot.rarity.color);
        }
        if (Math.random() < CONFIG.POTION_DROP_CHANCE) {
            const potion = ItemGenerator.generatePotion(this.currentFloor);
            this.groundItems.push({ x: enemy.x, y: enemy.y, item: potion });
        }
    }

    // ============================
    // SKILL EXECUTION
    // ============================
    executeSkill(idx) {
        if (!this.player.canUseSkill(idx)) return;
        const skill = this.player.useSkill(idx);
        this.ui.addLog(`${skill.icon} ${skill.name}!`, skill.color);
        this.updateSkillBar();

        const player = this.player;
        const aimAngle = player.aimAngle;

        switch (skill.type) {
            case 'aoe_damage': {
                // Shield Bash — AoE in front arc
                this.renderer.showSkillEffect('shockwave', player.x, player.y, {
                    angle: aimAngle, range: skill.range, arc: skill.arc, color: skill.effectColor
                });
                this.renderer.shake(4);
                this.enemies.forEach(enemy => {
                    if (enemy.isDead()) return;
                    const dx = enemy.x - player.x;
                    const dy = enemy.y - player.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > skill.range) return;
                    const angleToEnemy = Math.atan2(dx, dy);
                    let angleDiff = angleToEnemy - aimAngle;
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                    if (Math.abs(angleDiff) <= skill.arc / 2) {
                        const dmg = skill.damage + Math.floor(player.stats.str / 3);
                        enemy.takeDamage(dmg);
                        player.stats.damageDealt += dmg; // Track damage
                        this.combat.addFloatingText(enemy.x, enemy.y, `${dmg}💥`, skill.color, true);
                        // Knockback
                        const kbDist = skill.knockback;
                        const kbX = (dx / dist) * kbDist;
                        const kbY = (dy / dist) * kbDist;
                        if (!enemy.collidesWall(enemy.x + kbX, enemy.y, this.dungeon)) enemy.x += kbX;
                        if (!enemy.collidesWall(enemy.x, enemy.y + kbY, this.dungeon)) enemy.y += kbY;
                        if (enemy.isDead()) {
                            const xpGained = enemy.xp;
                            player.gainXp(xpGained);
                            player.stats.enemiesKilled++;
                            player.stats.kills++;
                            this.combat.addFloatingText(enemy.x, enemy.y, `+${xpGained} XP`, CONFIG.COLORS.XP_GAIN, false);
                            this.handleEnemyDrop(enemy);
                        }
                    }
                });
                break;
            }
            case 'dash': {
                // Shadow Dash — teleport forward + damage enemies in path
                const dashX = Math.sin(aimAngle) * skill.dashDistance;
                const dashY = Math.cos(aimAngle) * skill.dashDistance;
                const targetX = player.x + dashX;
                const targetY = player.y + dashY;
                // Find valid dash landing
                let finalX = player.x, finalY = player.y;
                const steps = 20;
                for (let i = 1; i <= steps; i++) {
                    const testX = player.x + (dashX / steps) * i;
                    const testY = player.y + (dashY / steps) * i;
                    if (!player.collidesAt(testX, testY, this.dungeon)) {
                        finalX = testX;
                        finalY = testY;
                    } else break;
                }
                // Damage enemies along path
                this.enemies.forEach(enemy => {
                    if (enemy.isDead()) return;
                    const d = Utils.distanceToSegment(enemy.x, enemy.y, player.x, player.y, finalX, finalY);
                    if (d < skill.dashWidth) {
                        const dmg = skill.damage + Math.floor(player.stats.dex / 3);
                        enemy.takeDamage(dmg);
                        player.stats.damageDealt += dmg; // Track damage
                        this.combat.addFloatingText(enemy.x, enemy.y, `${dmg}💨`, skill.color, true);
                        if (enemy.isDead()) {
                            player.gainXp(enemy.xp);
                            player.stats.enemiesKilled++;
                            player.stats.kills++;
                            this.handleEnemyDrop(enemy);
                        }
                    }
                });
                const startX = player.x;
                const startY = player.y;
                player.x = finalX;
                player.y = finalY;
                this.renderer.showSkillEffect('dash_trail', player.x, player.y, {
                    fromX: startX, fromY: startY,
                    toX: finalX, toY: finalY, color: skill.effectColor
                });
                break;
            }
            case 'aoe_target': {
                // Fireball — AoE at aim target position
                const fbRange = skill.range;
                const fbX = player.x + Math.sin(aimAngle) * Math.min(fbRange, 4);
                const fbY = player.y + Math.cos(aimAngle) * Math.min(fbRange, 4);
                this.renderer.showSkillEffect('explosion', fbX, fbY, {
                    radius: skill.radius, color: skill.effectColor
                });
                this.renderer.shake(5);
                this.enemies.forEach(enemy => {
                    if (enemy.isDead()) return;
                    const d = Utils.distance(enemy.x, enemy.y, fbX, fbY);
                    if (d < skill.radius) {
                        const dmg = skill.damage + Math.floor(player.stats.int / 2);
                        enemy.takeDamage(dmg);
                        player.stats.damageDealt += dmg; // Track damage
                        this.combat.addFloatingText(enemy.x, enemy.y, `${dmg}🔥`, skill.color, true);
                        if (enemy.isDead()) {
                            player.gainXp(enemy.xp);
                            player.stats.enemiesKilled++;
                            player.stats.kills++;
                            this.handleEnemyDrop(enemy);
                        }
                    }
                });
                break;
            }
            case 'buff': {
                if (skill.buffStat === 'poisonHits') {
                    // Poison Blade
                    player.poisonHits = skill.buffValue;
                    player.poisonDamage = skill.poisonDamage;
                    this.ui.addLog(`Next ${skill.buffValue} attacks deal +${skill.poisonDamage} poison!`, skill.color);
                } else {
                    // War Cry — generic stat buff
                    player.addBuff(skill.buffStat, skill.buffValue, skill.duration);
                    player.recalculateStats(this.skillTree.getTotalBonuses());
                }
                this.renderer.showSkillEffect('aura', player.x, player.y, {
                    color: skill.effectColor, radius: 1.2
                });
                break;
            }
            case 'shield': {
                // Frost Shield — absorb damage + slow nearby
                player.shieldHp = skill.shieldAmount;
                this.ui.addLog(`Shield absorbs ${skill.shieldAmount} damage!`, skill.color);
                // Slow nearby enemies
                this.enemies.forEach(enemy => {
                    if (enemy.isDead()) return;
                    const d = Utils.distance(enemy.x, enemy.y, player.x, player.y);
                    if (d < skill.slowRadius) {
                        enemy.chaseSpeed *= skill.slowFactor;
                        enemy.patrolSpeed *= skill.slowFactor;
                        // Reset speed after duration
                        setTimeout(() => {
                            const def = CONFIG.ENEMIES[enemy.type];
                            enemy.chaseSpeed = CONFIG.ENEMY_SPEED_CHASE * (def.speed || 1);
                            enemy.patrolSpeed = CONFIG.ENEMY_SPEED_BASE * (def.speed || 1) * 0.5;
                        }, skill.duration * 1000);
                    }
                });
                this.renderer.showSkillEffect('frost_ring', player.x, player.y, {
                    radius: skill.slowRadius, color: skill.effectColor
                });
                break;
            }
        }
    }

    updateSkillBar() {
        if (!this.player) return;
        const skills = this.player.classDef.skills;
        const bar = document.getElementById('skill-bar');
        if (!bar) return;
        bar.innerHTML = skills.map((s, i) => {
            const cd = this.player.skillCooldowns[i];
            const key = i === 0 ? 'Q' : 'E';
            const onCd = cd > 0;
            const cdText = onCd ? Math.ceil(cd) + 's' : '';
            const canUse = !onCd && this.player.mp >= s.manaCost;
            return `<div class="skill-slot ${onCd ? 'on-cd' : ''} ${canUse ? 'ready' : ''}" style="--sk-color:${s.color}">
                <span class="skill-key">${key}</span>
                <span class="skill-icon">${s.icon}</span>
                <span class="skill-label">${s.name}</span>
                <span class="skill-cost">${s.manaCost} MP</span>
                ${onCd ? `<div class="skill-cd-overlay">${cdText}</div>` : ''}
            </div>`;
        }).join('');
    }

    handleEnemySkill(enemy, action) {
        const player = this.player;
        const tel = action.telegraph;
        let hit = false;

        if (tel.type === 'circle') {
            const dist = Utils.distance(player.x, player.y, tel.x, tel.y);
            if (dist < tel.radius + player.radius) {
                hit = true;
            }
        } else if (tel.type === 'line') {
            // Calculate line end point
            const endX = tel.x + Math.cos(tel.angle) * tel.length;
            const endY = tel.y + Math.sin(tel.angle) * tel.length;
            const dist = Utils.distanceToSegment(player.x, player.y, tel.x, tel.y, endX, endY);
            if (dist < tel.width / 2 + player.radius) {
                hit = true;
            }
        }

        if (hit) {
            // Apply damage
            // Check for shield? (Assuming takeDamage handles plain damage, but special mitigation logic is in Combat class usually)
            // But here we are bypassing Combat class for skill direct hit? 
            // Better to use Combat class if possible, or just raw damage.
            // Combat.enemyAttackPlayer handles dodge/shield.

            // Skill damage shouldn't be dodgeable by stats (you dodge by moving), but shield should work.
            let damage = action.damage;
            let shielded = false;

            if (player.shieldHp > 0) {
                const absorbed = Math.min(player.shieldHp, damage);
                player.shieldHp -= absorbed;
                damage -= absorbed;
                shielded = absorbed > 0;
                if (absorbed > 0) {
                    this.ui.addLog(`Shield absorbed ${absorbed} damage!`, '#44ccff');
                }
            }

            if (damage > 0) {
                player.takeDamage(damage);
                this.ui.addLog(`${enemy.name} used ${action.skillName} for ${damage} damage!`, CONFIG.COLORS.DAMAGE);
                this.renderer.shake(5);
                this.combat.addFloatingText(player.x, player.y, `-${damage}`, '#ff0000', true);
            } else if (shielded) {
                this.combat.addFloatingText(player.x, player.y, `Blocked`, '#44ccff', true);
            }

            // Knockback
            if (action.knockback) {
                const dx = player.x - enemy.x;
                const dy = player.y - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const kx = (dx / dist) * 1.5; // Fixed knockback distance for now
                const ky = (dy / dist) * 1.5;
                if (!player.collidesAt(player.x + kx, player.y, this.dungeon)) player.x += kx;
                if (!player.collidesAt(player.x, player.y + ky, this.dungeon)) player.y += ky;
            }

            if (player.isDead()) {
                this.handleDeath();
            }
        }
    }

    // ============================
    // ITEM PICKUP
    // ============================
    tryPickup() {
        // Find nearest item
        let bestItemIdx = -1;
        let bestDist = CONFIG.PICKUP_RANGE;

        for (let i = 0; i < this.groundItems.length; i++) {
            const gi = this.groundItems[i];
            const d = Utils.distance(this.player.x, this.player.y, gi.x, gi.y);
            if (d < bestDist) {
                bestDist = d;
                bestItemIdx = i;
            }
        }

        if (bestItemIdx !== -1) {
            const gi = this.groundItems[bestItemIdx];
            if (this.player.addToInventory(gi.item)) {
                this.ui.addLog(`Picked up: ${gi.item.name}`, gi.item.rarity ? gi.item.rarity.color : '#ccc');
                this.groundItems.splice(bestItemIdx, 1);
                // Play sound?
            } else {
                this.ui.addLog('Inventory full!', '#ff4444');
            }
        } else {
            // Check for chests? (Already automatic or interactive?)
            // If no item, maybe log "Nothing to pick up"
        }
    }

    // ============================
    // REAL-TIME GAME UPDATE
    // ============================
    updateGame(dt) {
        if (this.player.isDead()) return;

        // Clamp dt to avoid huge jumps
        dt = Math.min(dt, 0.05);

        // ---- Player movement from held keys ----
        let vx = 0, vy = 0;
        if (this.keysHeld['w'] || this.keysHeld['arrowup']) vy = -1;
        if (this.keysHeld['s'] || this.keysHeld['arrowdown']) vy = 1;
        if (this.keysHeld['a'] || this.keysHeld['arrowleft']) vx = -1;
        if (this.keysHeld['d'] || this.keysHeld['arrowright']) vx = 1;
        this.player.vx = vx;
        this.player.vy = vy;

        // Update player position
        this.player.update(dt, this.dungeon);

        // ---- Update aim angle from mouse ----
        this.updateAimAngle();

        // ---- Attack animation timer ----
        if (this.player.attackTimer > 0) {
            this.player.attackTimer -= dt;
            if (this.player.attackTimer <= 0) {
                this.player.isAttacking = false;
            }
        }

        // ---- Enemy updates (autonomous) ----
        this.enemies.forEach(enemy => {
            if (enemy.isDead()) return;
            const action = enemy.update(dt, this.dungeon, this.player.x, this.player.y, this.enemies);

            if (action) {
                if (action.type === 'attack') {
                    const result = this.combat.enemyAttackPlayer(enemy, this.player);
                    if (result.dodged) {
                        this.ui.addLog(`Dodged ${enemy.name}!`, CONFIG.COLORS.DODGE);
                    } else if (result.shielded) {
                        this.ui.addLog(`Shield absorbed ${enemy.name}'s attack!`, '#44ccff');
                    } else {
                        this.ui.addLog(`${enemy.name} hits for ${result.damage}`, CONFIG.COLORS.DAMAGE);
                        this.renderer.shake(3);
                    }

                    if (this.player.isDead()) {
                        this.handleDeath();
                        return;
                    }
                } else if (action.type === 'skill') {
                    this.handleEnemySkill(enemy, action);
                }
            }
        });

        // ---- Auto-pickup items nearby ----
        // (Removed auto-pickup, now manual via F)
        // Show pickup prompt? (Maybe later)

        // ---- Check stairs ----
        const ptx = Math.floor(this.player.x);
        const pty = Math.floor(this.player.y);
        if (this.dungeon.getTile(ptx, pty) === CONFIG.TILE.STAIRS_DOWN) {
            const cx = ptx + 0.5;
            const cy = pty + 0.5;
            if (Utils.distance(this.player.x, this.player.y, cx, cy) < 0.4) {
                this.descendFloor();
                return;
            }
        }

        // ---- Check chests ----
        const chestIdx = this.dungeon.chestPositions.findIndex(c =>
            !c.opened && Utils.distance(this.player.x, this.player.y, c.x + 0.5, c.y + 0.5) < 0.5
        );
        if (chestIdx !== -1) {
            this.openChest(chestIdx);
        }

        // ---- Update FOV (throttled) ----
        this.fovTimer += dt;
        if (this.fovTimer > 0.1) {
            this.fovTimer = 0;
            this.visibleSet = this.dungeon.revealArea(
                Math.floor(this.player.x), Math.floor(this.player.y), 7
            );
        }

        // ---- Update UI (throttled) ----
        this.uiTimer += dt;
        if (this.uiTimer > 0.15) {
            this.uiTimer = 0;
            this.ui.update(this.player, this.currentFloor);
            this.updateSkillBar();
        }

        // ---- Skill cooldowns ----
        this.player.tickSkillCooldowns(dt);

        // ---- Buff tick ----
        this.player.tickBuffs(dt);
        this.player.recalculateStats(this.skillTree.getTotalBonuses());

        // ---- Floating text ----
        this.combat.updateFloatingTexts(dt);
    }

    updateAimAngle() {
        if (!this.renderer || !this.renderer.camera || !this.player) return;

        // Convert screen mouse to normalized device coordinates
        const ndcX = (this.mouseScreenX / window.innerWidth) * 2 - 1;
        const ndcY = -(this.mouseScreenY / window.innerHeight) * 2 + 1;

        // Create ray from camera through mouse position
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.renderer.camera);

        // Intersect with ground plane (y=0)
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersection = new THREE.Vector3();
        raycaster.ray.intersectPlane(groundPlane, intersection);

        if (intersection) {
            const dx = intersection.x - this.player.x;
            const dz = intersection.z - this.player.y;
            this.player.aimAngle = Math.atan2(dx, dz);
        }
    }

    openChest(chestIdx) {
        const chest = this.dungeon.chestPositions[chestIdx];
        chest.opened = true;
        this.dungeon.map[chest.y][chest.x] = CONFIG.TILE.FLOOR;

        this.ui.addLog('Opened a chest!', '#DAA520');

        const numItems = Utils.randInt(1, 2);
        for (let i = 0; i < numItems; i++) {
            const item = Math.random() < 0.6 ?
                ItemGenerator.generateItem(this.currentFloor) :
                ItemGenerator.generatePotion(this.currentFloor);
            this.groundItems.push({ x: chest.x + 0.5, y: chest.y + 0.5, item });
            this.ui.addLog(`Found: ${item.name}`, item.rarity ? item.rarity.color : '#ccc');
        }
    }

    descendFloor() {
        this.player.stats.floorsCleared++;
        this.currentFloor++;

        if (this.currentFloor > CONFIG.MAX_FLOORS) {
            this.state = CONFIG.STATE.DEAD;
            this.ui.showVictory(this.player);
            return;
        }

        this.ui.addLog(`Descending to floor ${this.currentFloor}...`, '#FFD700');
        this.generateFloor();
        this.player.recalculateStats(this.skillTree.getTotalBonuses());
        this.ui.update(this.player, this.currentFloor);
    }

    handleDeath() {
        this.state = CONFIG.STATE.DEAD;
        this.ui.addLog('☠️ You have died!', '#ff0000');
        this.ui.showDeathScreen(this.player);
    }

    openSkillTree() {
        this.state = CONFIG.STATE.SKILL_TREE;
        this.skillTreeCanvas.style.display = 'block';
        this.skillTreeUI.centerView();
    }

    closeSkillTree() {
        this.state = CONFIG.STATE.PLAYING;
        this.skillTreeCanvas.style.display = 'none';
        this.player.recalculateStats(this.skillTree.getTotalBonuses());
        this.ui.update(this.player, this.currentFloor);
    }

    gameLoop(timestamp) {
        const dt = (timestamp - this.lastTime) / 1000; // seconds
        this.lastTime = timestamp;

        if (this.state === CONFIG.STATE.PLAYING) {
            try {
                this.updateGame(dt);
            } catch (e) {
                console.error('updateGame error:', e);
            }
            try {
                this.renderer.render(
                    this.dungeon, this.player, this.enemies,
                    this.groundItems, this.visibleSet, this.combat
                );
            } catch (e) {
                console.error('render error:', e);
            }
        }

        if (this.state === CONFIG.STATE.SKILL_TREE) {
            this.skillTreeUI.render(this.skillTree, this.player);
        }

        requestAnimationFrame((t) => this.gameLoop(t));
    }
}

// ============================================================
// BOOT
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
