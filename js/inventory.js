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
            player.inventory[slotIndex] = null; // Remove from inventory first
            const prevItem = player.equip(item);

            if (prevItem) {
                // Swap: Put old item in the same slot
                player.inventory[slotIndex] = prevItem;
            }

            player.recalculateStats(skillTree ? skillTree.getTotalBonuses() : {});
            return { action: 'equip', item, prevItem };
        }

        return null;
    }

    handleEquipClick(player, slot, skillTree) {
        const item = player.equipment[slot];
        if (item) {
            player.unequip(slot);
            player.recalculateStats(skillTree ? skillTree.getTotalBonuses() : {});

            // Try to add back to inventory
            if (!player.addToInventory(item)) {
                return { action: 'drop_unequip', item, slot };
            }

            return { action: 'unequip', slot, item };
        }
        return null;
    }
}
