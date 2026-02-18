// ============================================================
// UI SYSTEM (HUD, Menus, Overlays)
// ============================================================

class GameUI {
    constructor() {
        this.combatLog = [];
        this.maxLogLines = 50;
        this.logScrollPos = 0;

        // DOM references
        this.hpBar = document.getElementById('hp-bar');
        this.hpText = document.getElementById('hp-text');
        this.mpBar = document.getElementById('mp-bar');
        this.mpText = document.getElementById('mp-text');
        this.xpBar = document.getElementById('xp-bar');
        this.xpText = document.getElementById('xp-text');
        this.levelText = document.getElementById('level-text');
        this.floorText = document.getElementById('floor-text');
        this.logContainer = document.getElementById('combat-log');
        this.statsPanel = document.getElementById('stats-panel');
        this.inventoryPanel = document.getElementById('inventory-panel');
        this.equipmentPanel = document.getElementById('equipment-panel');
        this.skillPointsText = document.getElementById('skill-points-text');

        // New Inventory Modal Elements
        this.invModal = document.getElementById('inventory-modal');
        this.btnCloseInv = document.getElementById('btn-close-inv');
        this.modalEquipment = document.getElementById('modal-equipment');
        this.modalInventory = document.getElementById('modal-inventory');
        this.modalStats = document.getElementById('modal-stats');
        this.previewCanvas = document.getElementById('char-preview-canvas');

        if (this.btnCloseInv) {
            this.btnCloseInv.addEventListener('click', () => {
                this.invModal.style.display = 'none';
                if (window.game) window.game.state = CONFIG.STATE.PLAYING;
                // We need reference to game state to switch back. 
                // But UI doesn't have game ref usually. 
                // We'll rely on toggleInventory handling it or event listener in main.
                // Actually, let's dispatch a custom event or let main handle it via key 'I' / ESC.
                // For click button, we can just hide it and assume main loop handles state check or we force it.
                // Better: The toggle method handles the state change.
                // We will add a callback or event dispatch here.
                document.dispatchEvent(new CustomEvent('close-inventory'));
            });
        }

        // Listen for close event from Main
        document.addEventListener('close-inventory', () => {
            this.invModal.style.display = 'none';
        });
    }

    toggleInventory(player, renderer) {
        const isHidden = this.invModal.style.display === 'none';
        if (isHidden) {
            this.invModal.style.display = 'flex';
            if (window.game) window.game.state = CONFIG.STATE.INVENTORY;
            // Update modal content
            this.updateInventoryModal(player);
            // Render character preview
            if (renderer) renderer.renderPreview(player, this.previewCanvas);
            return true; // Opened
        } else {
            this.invModal.style.display = 'none';
            if (window.game) window.game.state = CONFIG.STATE.PLAYING;
            return false; // Closed
        }
    }

    updateInventoryModal(player) {
        if (!player) return;

        // 1. Equipment Slots
        this.modalEquipment.innerHTML = '';
        const slots = ['weapon', 'helmet', 'chest', 'boots', 'ring'];
        const slotIcons = { weapon: '⚔️', helmet: '🪖', chest: '🛡️', boots: '👢', ring: '💍' };

        slots.forEach(slot => {
            const item = player.equipment[slot];
            const div = document.createElement('div');
            div.className = 'inv-equip-slot' + (item ? ' equipped' : '');
            div.dataset.slot = slot;

            const icon = item ? item.symbol : slotIcons[slot];
            const name = item ? item.name : 'Empty Slot';
            const type = item ? 'LV ' + (item.level || 1) + ' ' + item.type : slot.toUpperCase();
            const color = item ? item.rarity.color : '#666';

            div.innerHTML = `
                <div class="slot-icon" style="color: ${color}; border-color: ${color}">${icon}</div>
                <div class="slot-info">
                    <div class="slot-name" style="color: ${color}">${name}</div>
                    <div class="slot-type">${type}</div>
                </div>
            `;
            if (item) {
                div.title = ItemGenerator.getItemDescription(item).join('\n');
            }
            this.modalEquipment.appendChild(div);
        });

        // 2. Inventory Grid
        this.modalInventory.innerHTML = '';
        for (let i = 0; i < player.maxInventory; i++) {
            const item = player.inventory[i];
            const div = document.createElement('div');
            div.className = 'bag-slot' + (item ? ' has-item' : ' empty');
            div.dataset.index = i;

            if (item) {
                div.style.borderColor = item.rarity.color;
                div.innerHTML = `<span class="inv-icon">${item.symbol}</span>`;
                const desc = item.type === ITEM_TYPES.POTION ?
                    `${item.name}\n${item.effect}: ${item.value}` :
                    `${item.name}\n${ItemGenerator.getItemDescription(item).join('\n')}`;
                div.title = desc;
            }
            this.modalInventory.appendChild(div);
        }

        // 3. Detailed Stats
        const s = player.stats;
        const dps = player.calculateDamage(); // Est. Damage per hit
        // Approx DPS = Dmg * (1/Cooldown) * (1 - Crit% + Crit%*CritMulti) * HitChance... simplified:
        const dpsEst = Math.round(dps * (1 / player.attackCooldownTime) * (1 + (s.critChance / 100) * (s.critMulti - 1)));

        const statList = [
            { label: 'Level', val: player.level },
            { label: 'HP', val: `${Math.ceil(player.hp)}/${s.maxHp}` },
            { label: 'MP', val: `${Math.ceil(player.mp)}/${s.maxMp}` },
            { label: 'STR', val: s.str, highlight: true },
            { label: 'DEX', val: s.dex, highlight: true },
            { label: 'INT', val: s.int, highlight: true },
            { label: 'Armor', val: s.armor },
            { label: 'Damage', val: dps + ' (' + dpsEst + '/s)' },
            { label: 'Crit %', val: s.critChance.toFixed(1) + '%' },
            { label: 'Crit X', val: s.critMulti.toFixed(1) + 'x' },
            { label: 'Dodge', val: s.dodge.toFixed(1) + '%' },
            { label: 'Speed', val: player.speed.toFixed(1) }
        ];

        this.modalStats.innerHTML = statList.map(st => `
            <div class="stat-box">
                <span class="stat-label">${st.label}</span>
                <span class="stat-value ${st.highlight ? 'highlight' : ''}">${st.val}</span>
            </div>
        `).join('');
    }

    update(player, floor) {
        if (!player || !player.stats) return;

        const stats = player.stats;

        // HP
        const maxHp = stats.maxHp || 100;
        let hpPercent = (player.hp / maxHp * 100) || 0;
        hpPercent = Math.max(0, Math.min(100, hpPercent));
        this.hpBar.style.width = hpPercent + '%';
        this.hpText.textContent = `${Math.ceil(player.hp || 0)} / ${maxHp}`;
        this.hpBar.className = 'bar-fill hp-fill' + (hpPercent < 25 ? ' low' : '');

        // MP
        const maxMp = stats.maxMp || 50;
        let mpPercent = (player.mp / maxMp * 100) || 0;
        mpPercent = Math.max(0, Math.min(100, mpPercent));
        this.mpBar.style.width = mpPercent + '%';
        this.mpText.textContent = `${Math.ceil(player.mp || 0)} / ${maxMp}`;

        // XP
        const xpNext = player.xpToNextLevel || 100;
        let xpPercent = (player.xp / xpNext * 100) || 0;
        xpPercent = Math.max(0, Math.min(100, xpPercent));
        this.xpBar.style.width = xpPercent + '%';
        const xpRemaining = xpNext - player.xp;
        this.xpText.textContent = `XP: ${player.xp} / ${xpNext} (Need ${xpRemaining})`;

        // Level & Floor
        this.levelText.textContent = player.advancedClass
            ? `${CONFIG.ADVANCED_CLASSES[player.advancedClass].name} (LV ${player.level})`
            : `${player.classDef.name} (LV ${player.level})`;
        this.floorText.textContent = `Floor ${floor} / ${CONFIG.MAX_FLOORS}`;

        // Skill points
        if (this.skillPointsText) {
            this.skillPointsText.textContent = player.skillPoints > 0 ?
                `⚡ ${player.skillPoints} Skill Points` : '';
            this.skillPointsText.className = player.skillPoints > 0 ? 'skill-points glow' : 'skill-points';
        }

        // Stats (Side Panel - Simplified or removed if we prefer modal only? Keeping for now)
        if (this.statsPanel) {
            this.statsPanel.innerHTML = `
                <div class="stat"><span>STR</span><span class="stat-val">${stats.str}</span></div>
                <div class="stat"><span>DEX</span><span class="stat-val">${stats.dex}</span></div>
                <div class="stat"><span>INT</span><span class="stat-val">${stats.int}</span></div>
                <div class="stat"><span>Armor</span><span class="stat-val">${stats.armor}</span></div>
                <div class="stat"><span>Crit</span><span class="stat-val">${stats.critChance.toFixed(1)}%</span></div>
            `;
        }

        // Promotion Check
        const promoteBtn = document.getElementById('btn-promote');
        if (promoteBtn) {
            if (player.level >= 10 && !player.advancedClass && player.classDef.promotions) {
                promoteBtn.style.display = 'block';
                promoteBtn.onclick = () => this.showPromotionModal(player);
            } else {
                promoteBtn.style.display = 'none';
            }
        }
    }

    showPromotionModal(player) {
        let modal = document.getElementById('promotion-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'promotion-modal';
            modal.className = 'modal-overlay';
            document.body.appendChild(modal);
        }

        const promotions = player.classDef.promotions || [];
        const optionsHtml = promotions.map(key => {
            const cls = CONFIG.ADVANCED_CLASSES[key];
            if (!cls) return '';
            const statsBonus = Object.entries(cls.baseStatsAdd || {}).map(([k, v]) => `+${v} ${k}`).join(', ');
            return `
                <div class="class-card class-btn" onclick="UI.promotePlayer('${key}')">
                    <div class="class-icon" style="background:${cls.color}">${cls.icon}</div>
                    <h3>${cls.name}</h3>
                    <p class="cls-stats">${statsBonus}</p>
                    <p class="cls-desc">Specialized ${player.classDef.name}</p>
                </div>
            `;
        }).join('');

        modal.innerHTML = `
            <div class="modal-content">
                <h2>Class Promotion</h2>
                <div class="class-selection">
                    ${optionsHtml}
                </div>
                <button onclick="document.getElementById('promotion-modal').remove()" class="close-btn">Cancel</button>
            </div>
        `;

        modal.style.display = 'flex';

        // Helper
        window.UI = window.UI || {};
        window.UI.promotePlayer = (key) => {
            if (player.promote(key)) {
                this.addLog(`⭐ Promoted to ${CONFIG.ADVANCED_CLASSES[key].name}!`, '#ffd700');
                if (this.renderer && this.renderer.shake) this.renderer.shake(10); // Check if renderer exists on UI or global
                document.getElementById('promotion-modal').remove();
            }
        };
    }

    addLog(message, color = '#cccccc') {
        this.combatLog.push({ message, color, time: Date.now() });
        if (this.combatLog.length > this.maxLogLines) {
            this.combatLog.shift();
        }
        this.renderLog();
    }

    renderLog() {
        if (!this.logContainer) return;
        this.logContainer.innerHTML = '';
        const visible = this.combatLog.slice(-8);
        visible.forEach((entry, i) => {
            const div = document.createElement('div');
            div.className = 'log-entry';
            div.style.color = entry.color;
            div.style.opacity = 0.5 + (i / visible.length) * 0.5;
            div.textContent = entry.message;
            this.logContainer.appendChild(div);
        });
        this.logContainer.scrollTop = this.logContainer.scrollHeight;
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const screen = document.getElementById(screenId);
        if (screen) screen.classList.add('active');
    }

    hideAllScreens() {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    }

    showDeathScreen(player) {
        const deathScreen = document.getElementById('death-screen');
        if (deathScreen) {
            document.getElementById('death-stats').innerHTML = `
                <div class="death-stat">Level Reached: <span>${player.level}</span></div>
                <div class="death-stat">Floors Cleared: <span>${player.stats.floorsCleared}</span></div>
                <div class="death-stat">Kills: <span>${player.stats.kills}</span></div>
                <div class="death-stat">Damage Dealt: <span>${Utils.formatNumber(player.stats.damageDealt)}</span></div>
                <div class="death-stat">Damage Taken: <span>${Utils.formatNumber(player.stats.damageTaken)}</span></div>
                <div class="death-stat">Items Found: <span>${player.stats.itemsFound}</span></div>
                <div class="death-stat">Potions Used: <span>${player.stats.potionsUsed}</span></div>
                <div class="death-stat">Turns Played: <span>${Utils.formatNumber(player.stats.turnsPlayed)}</span></div>
            `;
            deathScreen.classList.add('active');
        }
    }

    showLevelUp(level, skillPoints) {
        this.addLog(`🎉 LEVEL UP! You are now level ${level}!`, CONFIG.COLORS.LEVEL_UP);
        this.addLog(`⚡ You gained a skill point! (${skillPoints} available)`, CONFIG.COLORS.XP_GAIN);
    }

    showVictory(player) {
        const victoryScreen = document.getElementById('victory-screen');
        if (victoryScreen) {
            document.getElementById('victory-stats').innerHTML = `
                <div class="death-stat">Final Level: <span>${player.level}</span></div>
                <div class="death-stat">Total Kills: <span>${player.stats.kills}</span></div>
                <div class="death-stat">Damage Dealt: <span>${Utils.formatNumber(player.stats.damageDealt)}</span></div>
                <div class="death-stat">Items Found: <span>${player.stats.itemsFound}</span></div>
                <div class="death-stat">Turns Played: <span>${Utils.formatNumber(player.stats.turnsPlayed)}</span></div>
            `;
            victoryScreen.classList.add('active');
        }
    }
}
