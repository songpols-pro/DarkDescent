// ============================================================
// SKILL TREE LOGIC
// ============================================================

class SkillTree {
    constructor() {
        this.nodes = {};
        this.allocatedNodes = new Set();
        this.init();
    }

    init() {
        // Deep copy node data
        Object.entries(SKILL_TREE_DATA.nodes).forEach(([id, node]) => {
            this.nodes[id] = { ...node, id, allocated: false };
        });

        // Auto-allocate start node
        this.allocatedNodes.add('start');
        this.nodes['start'].allocated = true;
    }

    canAllocate(nodeId, availablePoints, player) {
        if (availablePoints <= 0) return false;
        if (this.allocatedNodes.has(nodeId)) return false;

        const node = this.nodes[nodeId];
        if (!node) return false;

        // Check requirements
        if (node.requirements) {
            if (node.requirements.level && player && player.level < node.requirements.level) return false;
            // Check other stats if needed (e.g. strFlat)
            // For now, simpler check:
            // if (node.requirements.strFlat && player.stats.str < node.requirements.strFlat) return false;
        }

        // Must be connected to at least one allocated node
        return node.connections.some(connId => this.allocatedNodes.has(connId));
    }

    allocate(nodeId, player) {
        if (this.allocatedNodes.has(nodeId)) return false;
        this.allocatedNodes.add(nodeId);
        this.nodes[nodeId].allocated = true;

        // Handle Skill Unlocks
        if (this.nodes[nodeId].skillUnlock) {
            player.learnSkill(this.nodes[nodeId].skillUnlock);
        }

        return true;
    }

    canDeallocate(nodeId) {
        if (nodeId === 'start') return false;
        if (!this.allocatedNodes.has(nodeId)) return false;

        // Check if removing this node would disconnect any other allocated nodes
        const testSet = new Set(this.allocatedNodes);
        testSet.delete(nodeId);

        // BFS from start to check connectivity
        const visited = new Set();
        const queue = ['start'];
        visited.add('start');

        while (queue.length > 0) {
            const current = queue.shift();
            const node = this.nodes[current];
            for (const conn of node.connections) {
                if (testSet.has(conn) && !visited.has(conn)) {
                    visited.add(conn);
                    queue.push(conn);
                }
            }
        }

        // If all allocated nodes (minus the removed one) are still reachable
        return visited.size === testSet.size;
    }

    deallocate(nodeId) {
        if (!this.canDeallocate(nodeId)) return false;
        this.allocatedNodes.delete(nodeId);
        this.nodes[nodeId].allocated = false;
        return true;
    }

    getTotalBonuses() {
        const totals = {};
        this.allocatedNodes.forEach(nodeId => {
            const node = this.nodes[nodeId];
            if (node && node.bonuses) {
                Object.entries(node.bonuses).forEach(([key, val]) => {
                    totals[key] = (totals[key] || 0) + val;
                });
            }
        });
        return totals;
    }

    getAllocatedCount() {
        return this.allocatedNodes.size - 1; // Exclude start
    }

    isAllocated(nodeId) {
        return this.allocatedNodes.has(nodeId);
    }

    isAvailable(nodeId, availablePoints, player) {
        return this.canAllocate(nodeId, availablePoints, player);
    }

    reset() {
        this.allocatedNodes.clear();
        this.allocatedNodes.add('start');
        Object.values(this.nodes).forEach(n => {
            n.allocated = n.id === 'start';
        });
    }
}
