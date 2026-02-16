// ============================================================
// INVENTORY MANAGEMENT
// ============================================================

class Inventory {
    constructor() {
        this.selectedSlot = -1;
        this.hoveredSlot = -1;
        this.hoveredEquipSlot = null;
        this.tooltipItem = null;
    }

    handleClick(player, slotIndex, skillTree, isShift = false) {
        if (slotIndex < 0 || slotIndex >= player.inventory.length) return null;

        const item = player.inventory[slotIndex];
        if (!item) return null;

        if (isShift) {
            // Drop item
            player.inventory[slotIndex] = null;
            return { action: 'drop', item };
        }

        if (item.type === ITEM_TYPES.POTION) {
            const result = player.usePotion(slotIndex);
            if (result) {
                player.recalculateStats(skillTree ? skillTree.getTotalBonuses() : {});
                return { action: 'use_potion', result };
            }
        } else if (item.slot) {
            // Equip the item
            const prevItem = player.equipment[item.slot];
            player.equip(item);
            player.recalculateStats(skillTree ? skillTree.getTotalBonuses() : {});
            return { action: 'equip', item, prevItem };
        }

        return null;
    }

    handleEquipClick(player, slot, skillTree) {
        if (player.equipment[slot]) {
            player.unequip(slot);
            player.recalculateStats(skillTree ? skillTree.getTotalBonuses() : {});
            return { action: 'unequip', slot };
        }
        return null;
    }
}
