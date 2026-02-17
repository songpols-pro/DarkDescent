// ============================================================
// SKILL TREE UI (Canvas Rendering, Pan & Zoom)
// ============================================================

class SkillTreeUI {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // View transform
        this.offsetX = 0;
        this.offsetY = 0;
        this.zoom = 1.2;
        this.minZoom = 0.5;
        this.maxZoom = 2.5;

        // Interaction
        this.isDragging = false;
        this.lastMouse = { x: 0, y: 0 };
        this.hoveredNode = null;
        this.mousePos = { x: 0, y: 0 };

        // Animation
        this.pulsePhase = 0;
        this.particles = [];

        this.setupEvents();
    }

    setupEvents() {
        this.canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.lastMouse = { x: e.clientX, y: e.clientY };
        });

        this.canvas.addEventListener('mousemove', (e) => {
            this.mousePos = { x: e.clientX, y: e.clientY };

            if (this.isDragging) {
                this.offsetX += e.clientX - this.lastMouse.x;
                this.offsetY += e.clientY - this.lastMouse.y;
                this.lastMouse = { x: e.clientX, y: e.clientY };
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
            const newZoom = Utils.clamp(this.zoom * zoomFactor, this.minZoom, this.maxZoom);

            // Zoom towards mouse position
            const wx = (this.mousePos.x - this.canvas.width / 2 - this.offsetX) / this.zoom;
            const wy = (this.mousePos.y - this.canvas.height / 2 - this.offsetY) / this.zoom;

            this.zoom = newZoom;

            this.offsetX = this.mousePos.x - this.canvas.width / 2 - wx * this.zoom;
            this.offsetY = this.mousePos.y - this.canvas.height / 2 - wy * this.zoom;
        });
    }

    worldToScreen(wx, wy) {
        return {
            x: wx * this.zoom + this.canvas.width / 2 + this.offsetX,
            y: wy * this.zoom + this.canvas.height / 2 + this.offsetY
        };
    }

    screenToWorld(sx, sy) {
        return {
            x: (sx - this.canvas.width / 2 - this.offsetX) / this.zoom,
            y: (sy - this.canvas.height / 2 - this.offsetY) / this.zoom
        };
    }

    getNodeAtMouse(skillTree) {
        const world = this.screenToWorld(this.mousePos.x, this.mousePos.y);
        let closest = null;
        let closestDist = Infinity;

        Object.entries(skillTree.nodes).forEach(([id, node]) => {
            const dist = Utils.distance(world.x, world.y, node.x, node.y);
            const radius = this.getNodeRadius(node);
            if (dist < radius && dist < closestDist) {
                closest = id;
                closestDist = dist;
            }
        });

        return closest;
    }

    getNodeRadius(node) {
        switch (node.type) {
            case 'keystone': return 24;
            case 'skill_unlock': return 22;
            case 'notable': return 18;
            case 'start': return 20;
            default: return 12;
        }
    }

    handleClick(skillTree, player, isRightClick = false) {
        const nodeId = this.getNodeAtMouse(skillTree);
        if (!nodeId) return null;

        if (isRightClick) {
            // Refund
            if (skillTree.canDeallocate(nodeId)) {
                skillTree.deallocate(nodeId);
                player.skillPoints++;
                player.recalculateStats(skillTree.getTotalBonuses());
                this.addParticlesAt(skillTree.nodes[nodeId], '#ff4444');
                return { action: 'deallocate', nodeId };
            }
        } else {
            // Allocate
            if (skillTree.canAllocate(nodeId, player.skillPoints)) {
                skillTree.allocate(nodeId);
                player.skillPoints--;
                player.recalculateStats(skillTree.getTotalBonuses());
                this.addParticlesAt(skillTree.nodes[nodeId], '#FFD700');
                return { action: 'allocate', nodeId };
            }
        }
        return null;
    }

    addParticlesAt(node, color) {
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 * i) / 12;
            this.particles.push({
                x: node.x,
                y: node.y,
                vx: Math.cos(angle) * Utils.randFloat(1, 3),
                vy: Math.sin(angle) * Utils.randFloat(1, 3),
                life: 1.0,
                color
            });
        }
    }

    render(skillTree, player) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        this.pulsePhase += 0.02;

        // Background
        ctx.fillStyle = CONFIG.COLORS.SKILLTREE_BG;
        ctx.fillRect(0, 0, w, h);

        // Draw grid dots for visual depth
        this.drawBackgroundGrid(ctx, w, h);

        // Find hovered node
        this.hoveredNode = this.getNodeAtMouse(skillTree);

        // Draw connections
        Object.entries(skillTree.nodes).forEach(([id, node]) => {
            node.connections.forEach(connId => {
                if (connId > id) return; // Draw each connection once
                const other = skillTree.nodes[connId];
                if (!other) return;
                this.drawConnection(ctx, node, other, skillTree);
            });
        });

        // Draw nodes
        Object.entries(skillTree.nodes).forEach(([id, node]) => {
            this.drawNode(ctx, id, node, skillTree, player);
        });

        // Update and draw particles
        this.updateParticles(ctx);

        // Draw tooltip
        if (this.hoveredNode) {
            this.drawTooltip(ctx, skillTree.nodes[this.hoveredNode], skillTree, player);
        }

        // Draw UI overlay
        this.drawOverlay(ctx, skillTree, player, w, h);
    }

    drawBackgroundGrid(ctx, w, h) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        const gridSize = 40 * this.zoom;
        const ox = (this.offsetX + w / 2) % gridSize;
        const oy = (this.offsetY + h / 2) % gridSize;

        for (let x = ox; x < w; x += gridSize) {
            for (let y = oy; y < h; y += gridSize) {
                ctx.beginPath();
                ctx.arc(x, y, 1, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    drawConnection(ctx, nodeA, nodeB, skillTree) {
        const a = this.worldToScreen(nodeA.x, nodeA.y);
        const b = this.worldToScreen(nodeB.x, nodeB.y);

        const bothAllocated = nodeA.allocated && nodeB.allocated;
        const oneAllocated = nodeA.allocated || nodeB.allocated;

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.lineWidth = bothAllocated ? 3 : 2;

        if (bothAllocated) {
            ctx.strokeStyle = CONFIG.COLORS.CONNECTION_ALLOCATED;
            ctx.shadowColor = CONFIG.COLORS.CONNECTION_ALLOCATED;
            ctx.shadowBlur = 8;
        } else if (oneAllocated) {
            ctx.strokeStyle = 'rgba(100, 100, 130, 0.6)';
            ctx.shadowBlur = 0;
        } else {
            ctx.strokeStyle = CONFIG.COLORS.CONNECTION_DEFAULT;
            ctx.shadowBlur = 0;
        }

        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    drawNode(ctx, id, node, skillTree, player) {
        const pos = this.worldToScreen(node.x, node.y);
        const radius = this.getNodeRadius(node) * this.zoom;
        const isHovered = this.hoveredNode === id;
        const isAllocated = node.allocated;
        const isAvailable = skillTree.canAllocate(id, player.skillPoints);

        // Category color
        let categoryColor;
        switch (node.category) {
            case 'str': categoryColor = CONFIG.COLORS.STR_COLOR; break;
            case 'dex': categoryColor = CONFIG.COLORS.DEX_COLOR; break;
            case 'int': categoryColor = CONFIG.COLORS.INT_COLOR; break;
            default: categoryColor = '#aaaacc';
        }

        // Node shape based on type
        ctx.save();

        if (node.type === 'keystone') {
            // Diamond shape for keystones
            this.drawDiamond(ctx, pos.x, pos.y, radius);
        } else if (node.type === 'skill_unlock') {
            // Hexagon for active skills
            this.drawHexagon(ctx, pos.x, pos.y, radius);
        } else {
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        }

        // Fill
        if (isAllocated) {
            ctx.fillStyle = categoryColor;
            ctx.shadowColor = categoryColor;
            ctx.shadowBlur = 15;
        } else if (isAvailable) {
            const pulse = 0.3 + Math.sin(this.pulsePhase * 3) * 0.15;
            ctx.fillStyle = CONFIG.COLORS.NODE_AVAILABLE;
            ctx.shadowColor = categoryColor;
            ctx.shadowBlur = 10 * pulse + 5;
        } else {
            // Locked
            ctx.fillStyle = '#222233';
            ctx.shadowBlur = 0;
        }

        ctx.fill();
        ctx.shadowBlur = 0;

        // Border
        if (isHovered) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
        } else if (isAllocated) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 2;
        } else if (isAvailable) {
            ctx.strokeStyle = categoryColor;
            ctx.lineWidth = 2;
        } else {
            ctx.strokeStyle = 'rgba(50, 50, 60, 0.5)';
            ctx.lineWidth = 1;
        }
        ctx.stroke();

        // Inner glow for notables and keystones
        if (node.type !== 'small' && isAllocated) {
            const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            if (node.type === 'keystone') {
                this.drawDiamond(ctx, pos.x, pos.y, radius);
            } else if (node.type === 'skill_unlock') {
                this.drawHexagon(ctx, pos.x, pos.y, radius);
            } else {
                ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
            }
            ctx.fill();
        }

        // Node name for notable+ nodes
        if ((node.type === 'notable' || node.type === 'keystone') && this.zoom >= 0.8) {
            ctx.fillStyle = isAllocated ? '#ffffff' : 'rgba(200, 200, 220, 0.7)';
            ctx.font = `${Math.round(10 * this.zoom)}px 'Press Start 2P', monospace`;
            ctx.textAlign = 'center';
            ctx.fillText(node.name, pos.x, pos.y + radius + 14 * this.zoom);
        }

        ctx.restore();
    }

    drawDiamond(ctx, x, y, r) {
        ctx.beginPath();
        ctx.moveTo(x, y - r);
        ctx.lineTo(x + r, y);
        ctx.lineTo(x, y + r);
        ctx.lineTo(x - r, y);
        ctx.closePath();
    }

    drawHexagon(ctx, x, y, r) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const px = x + Math.cos(angle) * r;
            const py = y + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
    }

    drawTooltip(ctx, node, skillTree, player) {
        if (!node) return;

        const mx = this.mousePos.x;
        const my = this.mousePos.y;

        const lines = [node.name];
        const descLines = node.description.split('\n');
        lines.push(...descLines);

        if (node.type !== 'start') {
            lines.push('');
            if (node.allocated) {
                lines.push('[Right-click to refund]');
            } else {
                const can = skillTree.canAllocate(node.id, player.skillPoints, player);
                if (can) {
                    lines.push('[Click to allocate]');
                } else {
                    if (player.skillPoints <= 0) lines.push('[No skill points]');

                    // Show missing requirements
                    const connected = node.connections.some(connId => skillTree.allocatedNodes.has(connId));
                    if (!connected) lines.push('[Not connected]');

                    if (node.requirements) {
                        if (node.requirements.level && player.level < node.requirements.level) {
                            lines.push(`[Req: Level ${node.requirements.level}]`);
                        }
                    }
                }
            }
        }

        const fontSize = 12;
        ctx.font = `${fontSize}px 'Press Start 2P', monospace`;
        const padding = 12;
        const lineHeight = fontSize + 6;
        const maxWidth = Math.max(...lines.map(l => ctx.measureText(l).width)) + padding * 2;
        const totalHeight = lines.length * lineHeight + padding * 2;

        let tx = mx + 15;
        let ty = my + 15;
        if (tx + maxWidth > this.canvas.width) tx = mx - maxWidth - 15;
        if (ty + totalHeight > this.canvas.height) ty = my - totalHeight - 15;

        // Background
        ctx.fillStyle = 'rgba(10, 10, 20, 0.95)';
        ctx.strokeStyle = this.getNodeCategoryColor(node);
        ctx.lineWidth = 2;

        // Rounded rect
        const r = 6;
        ctx.beginPath();
        ctx.roundRect(tx, ty, maxWidth, totalHeight, r);
        ctx.fill();
        ctx.stroke();

        // Text
        lines.forEach((line, i) => {
            const ly = ty + padding + (i + 1) * lineHeight - 4;
            if (i === 0) {
                ctx.fillStyle = this.getNodeCategoryColor(node);
                ctx.font = `bold ${fontSize + 2}px 'Press Start 2P', monospace`;
            } else if (line.startsWith('[')) {
                ctx.fillStyle = '#888899';
                ctx.font = `${fontSize - 2}px 'Press Start 2P', monospace`;
            } else if (line.startsWith('⚠️')) {
                ctx.fillStyle = '#ffaa00';
                ctx.font = `bold ${fontSize}px 'Press Start 2P', monospace`;
            } else {
                ctx.fillStyle = '#ccccdd';
                ctx.font = `${fontSize}px 'Press Start 2P', monospace`;
            }
            ctx.textAlign = 'left';
            ctx.fillText(line, tx + padding, ly);
        });
    }

    getNodeCategoryColor(node) {
        switch (node.category) {
            case 'str': return CONFIG.COLORS.STR_COLOR;
            case 'dex': return CONFIG.COLORS.DEX_COLOR;
            case 'int': return CONFIG.COLORS.INT_COLOR;
            default: return '#aaaacc';
        }
    }

    drawOverlay(ctx, skillTree, player, w, h) {
        // Title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px "MedievalSharp", serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ PASSIVE SKILL TREE ⚡', w / 2, 40);

        // Skill points
        const spText = `Skill Points: ${player.skillPoints}`;
        ctx.font = '16px "Press Start 2P", monospace';
        ctx.fillStyle = player.skillPoints > 0 ? '#FFD700' : '#888899';
        ctx.fillText(spText, w / 2, 70);

        // Allocated count
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.fillStyle = '#888899';
        ctx.fillText(`Allocated: ${skillTree.getAllocatedCount()} nodes`, w / 2, 92);

        // Controls hint
        ctx.fillStyle = 'rgba(200, 200, 220, 0.5)';
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.textAlign = 'left';
        ctx.fillText('Scroll: Zoom | Drag: Pan | Click: Allocate | Right-click: Refund', 15, h - 15);

        // Close hint
        ctx.textAlign = 'right';
        ctx.fillText('Press [T] or [ESC] to close', w - 15, h - 15);

        // Bonus summary on right side
        const bonuses = skillTree.getTotalBonuses();
        const bonusEntries = Object.entries(bonuses).filter(([_, v]) => v !== 0);
        if (bonusEntries.length > 0) {
            const bx = w - 220;
            let by = 110;

            ctx.fillStyle = 'rgba(10, 10, 20, 0.8)';
            ctx.beginPath();
            ctx.roundRect(bx - 10, by - 20, 220, bonusEntries.length * 20 + 40, 8);
            ctx.fill();

            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 12px "Press Start 2P", monospace';
            ctx.textAlign = 'left';
            ctx.fillText('Total Bonuses', bx, by);
            by += 20;

            const labels = {
                strFlat: 'STR', dexFlat: 'DEX', intFlat: 'INT',
                maxHp: 'Max HP', maxMp: 'Max MP', armor: 'Armor',
                critChance: 'Crit %', critMulti: 'Crit Multi',
                dodge: 'Dodge %', damagePercent: 'Dmg %'
            };

            ctx.font = '10px "Press Start 2P", monospace';
            bonusEntries.forEach(([key, val]) => {
                const label = labels[key] || key;
                ctx.fillStyle = val > 0 ? '#44ff44' : '#ff4444';
                ctx.fillText(`${val > 0 ? '+' : ''}${val} ${label}`, bx, by);
                by += 18;
            });
        }
    }

    updateParticles(ctx) {
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.03;

            if (p.life <= 0) return false;

            const pos = this.worldToScreen(p.x, p.y);
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 3 * this.zoom * p.life, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;

            return true;
        });
    }

    centerView() {
        this.offsetX = 0;
        this.offsetY = 0;
        this.zoom = 1.2;
    }
}
