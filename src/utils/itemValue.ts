/**
 * Item Value Utility
 *
 * Provides functions to estimate the gold piece (GP) value of equipment items
 * based on rarity, type, and weight. Used by the loot box system to display
 * total values for spawned items across all spawn modes.
 */

import { type EnhancedEquipment } from 'playlist-data-engine';

/**
 * Base GP values by item rarity
 */
const RARITY_BASE_VALUES: Record<string, number> = {
    common: 50,
    uncommon: 400,
    rare: 4000,
    very_rare: 40000,
    legendary: 200000
};

/**
 * Type multipliers for equipment categories
 */
const TYPE_MULTIPLIERS: Record<string, number> = {
    weapon: 1.2,
    armor: 1.5
};

/**
 * Weight threshold for "heavy" items (in pounds)
 */
const HEAVY_WEIGHT_THRESHOLD = 20;

/**
 * Multiplier applied to heavy items
 */
const HEAVY_MULTIPLIER = 1.1;

/**
 * Estimate the gold piece value of a single equipment item.
 *
 * The value is calculated based on:
 * - Base value determined by rarity tier
 * - Type modifier (weapons get 1.2x, armor gets 1.5x)
 * - Weight modifier (items > 20 lb get 1.1x)
 *
 * @param item - The equipment item to value
 * @returns The estimated GP value as a rounded integer
 *
 * @example
 * ```typescript
 * const sword: EnhancedEquipment = {
 *   name: 'Longsword',
 *   type: 'weapon',
 *   rarity: 'rare',
 *   weight: 3
 * };
 * const value = estimateItemValue(sword); // 4800 (4000 * 1.2)
 * ```
 */
export function estimateItemValue(item: EnhancedEquipment): number {
    // Get base value from rarity (default to common if not found)
    const baseValue = RARITY_BASE_VALUES[item.rarity] ?? RARITY_BASE_VALUES.common;

    let multiplier = 1;

    // Apply type multiplier
    const typeMultiplier = TYPE_MULTIPLIERS[item.type];
    if (typeMultiplier) {
        multiplier *= typeMultiplier;
    }

    // Apply heavy item multiplier
    if (item.weight !== undefined && item.weight > HEAVY_WEIGHT_THRESHOLD) {
        multiplier *= HEAVY_MULTIPLIER;
    }

    // Calculate and round to integer
    return Math.round(baseValue * multiplier);
}

/**
 * Calculate the total gold piece value of multiple equipment items.
 *
 * Sums the estimated values of all items using estimateItemValue().
 * Returns 0 for an empty array.
 *
 * @param items - Array of equipment items to value
 * @returns The total estimated GP value as a rounded integer
 *
 * @example
 * ```typescript
 * const items: EnhancedEquipment[] = [
 *   { name: 'Sword', type: 'weapon', rarity: 'rare', weight: 3 },
 *   { name: 'Shield', type: 'armor', rarity: 'uncommon', weight: 6 }
 * ];
 * const total = calculateTotalValue(items); // 5600 (4800 + 600)
 * ```
 */
export function calculateTotalValue(items: EnhancedEquipment[]): number {
    if (!items || items.length === 0) {
        return 0;
    }

    return items.reduce((total, item) => total + estimateItemValue(item), 0);
}
