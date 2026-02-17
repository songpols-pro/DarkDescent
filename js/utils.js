// ============================================================
// UTILITY FUNCTIONS
// ============================================================

const Utils = {
    // Random integer between min and max (inclusive)
    randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    // Random float between min and max
    randFloat(min, max) {
        return Math.random() * (max - min) + min;
    },

    // Random element from array
    randChoice(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    },

    // Weighted random choice
    weightedChoice(items, weights) {
        const total = weights.reduce((a, b) => a + b, 0);
        let r = Math.random() * total;
        for (let i = 0; i < items.length; i++) {
            r -= weights[i];
            if (r <= 0) return items[i];
        }
        return items[items.length - 1];
    },

    // Distance between two points
    distance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    },

    // Manhattan distance
    manhattan(x1, y1, x2, y2) {
        return Math.abs(x2 - x1) + Math.abs(y2 - y1);
    },

    // Clamp value between min and max
    clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    },

    // Linear interpolation
    lerp(a, b, t) {
        return a + (b - a) * t;
    },

    // Deep clone
    clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    // Shuffle array in place
    shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    },

    // Format number with commas
    formatNumber(n) {
        if (n === undefined || n === null || isNaN(n)) return '0';
        return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },

    // Bresenham line algorithm for line of sight
    getLine(x0, y0, x1, y1) {
        const points = [];
        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;

        while (true) {
            points.push({ x: x0, y: y0 });
            if (x0 === x1 && y0 === y1) break;
            const e2 = 2 * err;
            if (e2 > -dy) { err -= dy; x0 += sx; }
            if (e2 < dx) { err += dx; y0 += sy; }
        }
        return points;
    },

    // Check if point is in field of view
    hasLineOfSight(map, x0, y0, x1, y1) {
        const line = this.getLine(x0, y0, x1, y1);
        for (let i = 1; i < line.length - 1; i++) {
            const p = line[i];
            if (map[p.y] && map[p.y][p.x] === CONFIG.TILE.WALL) {
                return false;
            }
        }
        return true;
    },

    // Compute field of view using shadowcasting
    computeFOV(map, cx, cy, radius) {
        const visible = new Set();
        visible.add(`${cx},${cy}`);

        for (let angle = 0; angle < 360; angle += 1) {
            const rad = angle * Math.PI / 180;
            const dx = Math.cos(rad);
            const dy = Math.sin(rad);

            for (let r = 1; r <= radius; r++) {
                const x = Math.round(cx + dx * r);
                const y = Math.round(cy + dy * r);

                if (x < 0 || x >= CONFIG.MAP_WIDTH || y < 0 || y >= CONFIG.MAP_HEIGHT) break;

                visible.add(`${x},${y}`);

                if (map[y][x] === CONFIG.TILE.WALL) break;
            }
        }
        return visible;
    },

    // Easing functions for animations
    easeOutQuad(t) {
        return t * (2 - t);
    },

    easeOutCubic(t) {
        return (--t) * t * t + 1;
    },

    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    },

    // Distance from point to line segment
    distanceToSegment(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return this.distance(px, py, x1, y1);
        let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        const projX = x1 + t * dx;
        const projY = y1 + t * dy;
        return this.distance(px, py, projX, projY);
    }
};
