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
    }

    update(player, floor) {
        // HP
        const hpPercent = (player.hp / player.maxHp * 100);
        this.hpBar.style.width = hpPercent + '%';
        this.hpText.textContent = `${player.hp} / ${player.maxHp}`;
        this.hpBar.className = 'bar-fill hp-fill' + (hpPercent < 25 ? ' low' : '');

        // MP
        this.mpBar.style.width = (player.mp / player.maxMp * 100) + '%';
        this.mpText.textContent = `${player.mp} / ${player.maxMp}`;

        // XP
        this.xpBar.style.width = (player.xp / player.xpToLevel * 100) + '%';
        this.xpText.textContent = `${player.xp} / ${player.xpToLevel}`;

        // Level & Floor
        this.levelText.textContent = `LV ${player.level}`;
        this.floorText.textContent = `Floor ${floor} / ${CONFIG.MAX_FLOORS}`;

        // Skill points
        if (this.skillPointsText) {
            this.skillPointsText.textContent = player.skillPoints > 0 ?
                `⚡ ${player.skillPoints} Skill Points` : '';
            this.skillPointsText.className = player.skillPoints > 0 ? 'skill-points glow' : 'skill-points';
        }

        // Stats
        if (this.statsPanel) {
            this.statsPanel.innerHTML = `
                <div class="stat"><span>STR</span><span class="stat-val">${player.str || player.baseStr}</span></div>
                <div class="stat"><span>DEX</span><span class="stat-val">${player.dex || player.baseDex}</span></div>
                <div class="stat"><span>INT</span><span class="stat-val">${player.int || player.baseInt}</span></div>
                <div class="stat"><span>Armor</span><span class="stat-val">${player.armor}</span></div>
                <div class="stat"><span>Crit</span><span class="stat-val">${player.critChance.toFixed(1)}%</span></div>
                <div class="stat"><span>CritX</span><span class="stat-val">${player.critMulti.toFixed(1)}x</span></div>
                <div class="stat"><span>Dodge</span><span class="stat-val">${player.dodge.toFixed(1)}%</span></div>
                <div class="stat"><span>Dmg%</span><span class="stat-val">+${player.damagePercent || 0}%</span></div>
            `;
        }

        // Equipment
        if (this.equipmentPanel) {
            this.equipmentPanel.innerHTML = '';
            const slots = ['weapon', 'helmet', 'chest', 'boots', 'ring'];
            const slotIcons = { weapon: '⚔️', helmet: '🪖', chest: '🛡️', boots: '👢', ring: '💍' };

            slots.forEach(slot => {
                const item = player.equipment[slot];
                const div = document.createElement('div');
                div.className = 'equip-slot' + (item ? ' equipped' : '');
                div.dataset.slot = slot;

                if (item) {
                    div.style.borderColor = item.rarity.color;
                    div.innerHTML = `<span class="equip-icon">${item.symbol}</span><span class="equip-name" style="color:${item.rarity.color}">${item.name}</span>`;
                    div.title = ItemGenerator.getItemDescription(item).join('\n');
                } else {
                    div.innerHTML = `<span class="equip-icon">${slotIcons[slot]}</span><span class="equip-name empty">${slot}</span>`;
                }
                this.equipmentPanel.appendChild(div);
            });
        }

        // Inventory
        if (this.inventoryPanel) {
            this.inventoryPanel.innerHTML = '';
            for (let i = 0; i < player.maxInventory; i++) {
                const item = player.inventory[i];
                const div = document.createElement('div');
                div.className = 'inv-slot' + (item ? ' has-item' : '');
                div.dataset.index = i;

                if (item) {
                    div.style.borderColor = item.rarity ? item.rarity.color : '#666';
                    div.innerHTML = `<span class="inv-icon">${item.symbol}</span>`;
                    const desc = item.type === ITEM_TYPES.POTION ?
                        `${item.name}\n${item.effect}: ${item.value}` :
                        `${item.name}\n${ItemGenerator.getItemDescription(item).join('\n')}`;
                    div.title = desc;
                }
                this.inventoryPanel.appendChild(div);
            }
        }
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
