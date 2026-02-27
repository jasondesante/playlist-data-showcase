import { useState, useCallback } from 'react';
import {
    EquipmentSpawnHelper,
    EnhancedEquipment,
    SeededRNG,
    MAGIC_ITEMS,
    getMagicItemsByRarity
} from 'playlist-data-engine';
import { logger } from '@/utils/logger';
import { calculateTotalValue } from '@/utils/itemValue';

/**
 * Rarity options for equipment spawning
 */
export type RarityOption = 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary';

/**
 * Result interface for all loot box spawning methods
 */
export interface LootBoxResult {
    /** Array of spawned equipment items */
    items: EnhancedEquipment[];
    /** Total estimated value of all items in gold pieces (populated for all spawn modes) */
    totalValue?: number;
    /** Challenge rating used for the hoard (only for treasure hoard mode) */
    cr?: number;
}

/**
 * Interface for loot box operations hook
 */
export interface UseLootBoxReturn {
    /** Whether a spawn operation is in progress */
    isLoading: boolean;
    /** The most recently spawned items */
    spawnedItems: EnhancedEquipment[];
    /** The most recent treasure hoard result */
    lastHoardResult: LootBoxResult | null;
    /** Spawn random items using weighted selection */
    spawnRandomItems: (count: number, seed?: string) => Promise<LootBoxResult>;
    /** Spawn items of a specific rarity */
    spawnByRarity: (rarity: RarityOption, count: number, seed?: string) => Promise<LootBoxResult>;
    /** Spawn items from multiple rarities, distributing count evenly */
    spawnByMultipleRarities: (rarities: RarityOption[], count: number, seed?: string) => Promise<LootBoxResult>;
    /** Spawn a treasure hoard based on challenge rating */
    spawnTreasureHoard: (cr: number, seed?: string) => Promise<LootBoxResult>;
    /** Spawn specific items by name */
    spawnFromList: (itemNames: string[], seed?: string) => Promise<LootBoxResult>;
    /** Spawn magic items, optionally filtered by rarity */
    spawnMagicItems: (count: number, rarity?: RarityOption, seed?: string) => Promise<LootBoxResult>;
    /** Get total count of magic items available */
    getMagicItemCount: () => number;
    /** Clear the spawned items */
    clearSpawnedItems: () => void;
}

/**
 * React hook for loot box style equipment spawning.
 *
 * This hook provides functionality to spawn equipment items using various methods
 * from the playlist-data-engine's EquipmentSpawnHelper. It supports random spawning,
 * rarity-based spawning, treasure hoards, spawning specific items by name, and
 * spawning magic items from the predefined MAGIC_ITEMS collection.
 *
 * ## Spawn Methods
 *
 * - **Random**: Weighted random selection from all equipment
 * - **By Rarity**: Filter by rarity level (common, uncommon, rare, very_rare, legendary)
 * - **Treasure Hoard**: Generate a complete hoard based on challenge rating
 * - **From List**: Spawn specific items by name
 * - **Magic Items**: Spawn from predefined magic items with special properties
 *
 * ## Seeded RNG
 *
 * All spawn methods support an optional seed parameter for deterministic results.
 * Using the same seed will always produce the same items, which is useful for:
 * - Reproducible loot generation
 * - Sharing loot configurations
 * - Testing
 *
 * ## Magic Items
 *
 * The `spawnMagicItems()` function spawns from a curated collection of magic items
 * that include legendary weapons, armor with special properties, and items that
 * grant features, skills, or spells. Use `getMagicItemCount()` to see how many
 * magic items are available.
 *
 * @example
 * ```tsx
 * const {
 *   isLoading,
 *   spawnedItems,
 *   lastHoardResult,
 *   spawnRandomItems,
 *   spawnTreasureHoard,
 *   spawnByRarity,
 *   spawnByMultipleRarities,
 *   spawnFromList,
 *   spawnMagicItems,
 *   getMagicItemCount,
 *   clearSpawnedItems
 * } = useLootBox();
 *
 * // Spawn 5 random items
 * const result = await spawnRandomItems(5, 'my_seed');
 * console.log(result.items); // Array of EnhancedEquipment
 *
 * // Spawn a treasure hoard for CR 10
 * const hoard = await spawnTreasureHoard(10);
 * console.log(hoard.totalValue); // Gold piece value
 * console.log(hoard.cr); // Challenge rating used
 *
 * // Spawn 3 rare items
 * const rareItems = await spawnByRarity('rare', 3);
 *
 * // Spawn 5 items from a mix of rarities
 * const mixedItems = await spawnByMultipleRarities(['uncommon', 'rare'], 5);
 *
 * // Spawn specific items by name
 * const specificItems = await spawnFromList(['Longsword', 'Plate Armor']);
 *
 * // Spawn magic items
 * const magicCount = getMagicItemCount(); // Check available count
 * const magicItems = await spawnMagicItems(3); // Spawn 3 random magic items
 *
 * // Spawn only legendary magic items
 * const legendaryItems = await spawnMagicItems(2, 'legendary');
 *
 * // Clear spawned items to reset state
 * clearSpawnedItems();
 * ```
 *
 * @returns {UseLootBoxReturn} Hook return object with spawn functions and state
 * @see {@link https://github.com/playlist-data-engine/docs/EQUIPMENT_SYSTEM.md Equipment System Documentation}
 */
export const useLootBox = (): UseLootBoxReturn => {
    const [isLoading, setIsLoading] = useState(false);
    const [spawnedItems, setSpawnedItems] = useState<EnhancedEquipment[]>([]);
    const [lastHoardResult, setLastHoardResult] = useState<LootBoxResult | null>(null);

    /**
     * Create a SeededRNG instance from an optional seed string
     */
    const createRNG = useCallback((seed?: string): SeededRNG => {
        const rngSeed = seed || `loot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        return new SeededRNG(rngSeed);
    }, []);

    /**
     * Spawn random items using weighted selection
     */
    const spawnRandomItems = useCallback(async (
        count: number,
        seed?: string
    ): Promise<LootBoxResult> => {
        setIsLoading(true);

        try {
            const rng = createRNG(seed);
            const items = EquipmentSpawnHelper.spawnRandom(count, rng, { excludeZeroWeight: true });
            const totalValue = calculateTotalValue(items);

            const result: LootBoxResult = { items, totalValue };

            setSpawnedItems(items);
            setLastHoardResult(result);

            logger.info('LootBox', `Spawned ${items.length} random items`, {
                count,
                seed: seed || 'random',
                totalValue,
                items: items.map(i => ({ name: i.name, rarity: i.rarity }))
            });

            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('LootBox', 'Failed to spawn random items', { count, error: errorMessage });
            return { items: [], totalValue: 0 };
        } finally {
            setIsLoading(false);
        }
    }, [createRNG]);

    /**
     * Spawn items of a specific rarity
     */
    const spawnByRarity = useCallback(async (
        rarity: RarityOption,
        count: number,
        seed?: string
    ): Promise<LootBoxResult> => {
        setIsLoading(true);

        try {
            const rng = createRNG(seed);
            const items = EquipmentSpawnHelper.spawnByRarity(rarity, count, rng);
            const totalValue = calculateTotalValue(items);

            const result: LootBoxResult = { items, totalValue };

            setSpawnedItems(items);
            setLastHoardResult(result);

            logger.info('LootBox', `Spawned ${items.length} ${rarity} items`, {
                rarity,
                count,
                seed: seed || 'random',
                totalValue,
                items: items.map(i => i.name)
            });

            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('LootBox', 'Failed to spawn items by rarity', { rarity, count, error: errorMessage });
            return { items: [], totalValue: 0 };
        } finally {
            setIsLoading(false);
        }
    }, [createRNG]);

    /**
     * Spawn items from multiple rarities, distributing count evenly across selected rarities
     *
     * @param rarities - Array of rarity options to spawn from
     * @param count - Total number of items to spawn
     * @param seed - Optional seed for deterministic results
     * @returns LootBoxResult with items and total value
     */
    const spawnByMultipleRarities = useCallback(async (
        rarities: RarityOption[],
        count: number,
        seed?: string
    ): Promise<LootBoxResult> => {
        // Validate at least one rarity selected
        if (rarities.length === 0) {
            logger.warn('LootBox', 'No rarities selected for multi-rarity spawn');
            return { items: [], totalValue: 0 };
        }

        // If only one rarity, delegate to spawnByRarity
        if (rarities.length === 1) {
            return spawnByRarity(rarities[0], count, seed);
        }

        setIsLoading(true);

        try {
            const rng = createRNG(seed);
            const allItems: EnhancedEquipment[] = [];

            // Distribute count evenly across selected rarities
            const baseCountPerRarity = Math.floor(count / rarities.length);
            const remainder = count % rarities.length;

            // Create a distribution array with counts for each rarity
            const distribution = rarities.map((rarity, index) => ({
                rarity,
                count: baseCountPerRarity + (index < remainder ? 1 : 0)
            }));

            // Spawn items for each rarity
            for (const { rarity, count: rarityCount } of distribution) {
                if (rarityCount > 0) {
                    // Create a unique seed for each rarity to ensure variety
                    const raritySeed = seed ? `${seed}_${rarity}` : undefined;
                    const rarityRng = createRNG(raritySeed);
                    const items = EquipmentSpawnHelper.spawnByRarity(rarity, rarityCount, rarityRng);
                    allItems.push(...items);
                }
            }

            // Shuffle the combined items using the main RNG
            const shuffledItems = allItems.sort(() => rng.random() - 0.5);
            const totalValue = calculateTotalValue(shuffledItems);

            const result: LootBoxResult = { items: shuffledItems, totalValue };

            setSpawnedItems(shuffledItems);
            setLastHoardResult(result);

            logger.info('LootBox', `Spawned ${shuffledItems.length} items from multiple rarities`, {
                rarities,
                count,
                distribution: distribution.map(d => `${d.rarity}:${d.count}`).join(', '),
                seed: seed || 'random',
                totalValue,
                items: shuffledItems.map(i => ({ name: i.name, rarity: i.rarity }))
            });

            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('LootBox', 'Failed to spawn items by multiple rarities', { rarities, count, error: errorMessage });
            return { items: [], totalValue: 0 };
        } finally {
            setIsLoading(false);
        }
    }, [createRNG, spawnByRarity]);

    /**
     * Spawn a treasure hoard based on challenge rating
     */
    const spawnTreasureHoard = useCallback(async (
        cr: number,
        seed?: string
    ): Promise<LootBoxResult> => {
        setIsLoading(true);

        try {
            const rng = createRNG(seed);
            const hoard = EquipmentSpawnHelper.spawnTreasureHoard(cr, rng);

            const result: LootBoxResult = {
                items: hoard.items,
                totalValue: hoard.totalValue,
                cr: hoard.cr
            };

            setSpawnedItems(hoard.items);
            setLastHoardResult(result);

            logger.info('LootBox', `Spawned treasure hoard for CR ${cr}`, {
                cr,
                itemCount: hoard.items.length,
                totalValue: hoard.totalValue,
                seed: seed || 'random',
                items: hoard.items.map(i => ({ name: i.name, rarity: i.rarity }))
            });

            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('LootBox', 'Failed to spawn treasure hoard', { cr, error: errorMessage });
            return { items: [], totalValue: 0, cr };
        } finally {
            setIsLoading(false);
        }
    }, [createRNG]);

    /**
     * Spawn specific items by name
     */
    const spawnFromList = useCallback(async (
        itemNames: string[],
        seed?: string
    ): Promise<LootBoxResult> => {
        setIsLoading(true);

        try {
            const rng = createRNG(seed);
            const spawned = EquipmentSpawnHelper.spawnFromList(itemNames, rng);
            // Filter out undefined values (items not found in database)
            const items = spawned.filter((item): item is EnhancedEquipment => item !== undefined);
            const totalValue = calculateTotalValue(items);

            const result: LootBoxResult = { items, totalValue };

            setSpawnedItems(items);
            setLastHoardResult(result);

            logger.info('LootBox', `Spawned ${items.length} items from list`, {
                requested: itemNames,
                spawned: items.map(i => i.name),
                totalValue,
                seed: seed || 'random'
            });

            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('LootBox', 'Failed to spawn items from list', { itemNames, error: errorMessage });
            return { items: [], totalValue: 0 };
        } finally {
            setIsLoading(false);
        }
    }, [createRNG]);

    /**
     * Spawn magic items, optionally filtered by rarity
     *
     * Uses the MAGIC_ITEMS collection from playlist-data-engine.
     * If rarity is specified, only items of that rarity are considered.
     * Uses SeededRNG for deterministic random selection.
     */
    const spawnMagicItems = useCallback(async (
        count: number,
        rarity?: RarityOption,
        seed?: string
    ): Promise<LootBoxResult> => {
        setIsLoading(true);

        try {
            const rng = createRNG(seed);

            // Get items filtered by rarity if specified
            const availableItems = rarity
                ? getMagicItemsByRarity(rarity)
                : [...MAGIC_ITEMS];

            if (availableItems.length === 0) {
                logger.warn('LootBox', 'No magic items available', { rarity, count });
                return { items: [], totalValue: 0 };
            }

            // Shuffle and select items using seeded RNG
            const shuffled = [...availableItems].sort(() => rng.random() - 0.5);
            const selectedItems = shuffled.slice(0, Math.min(count, shuffled.length));
            const totalValue = calculateTotalValue(selectedItems);

            const result: LootBoxResult = { items: selectedItems, totalValue };

            setSpawnedItems(selectedItems);
            setLastHoardResult(result);

            logger.info('LootBox', `Spawned ${selectedItems.length} magic items`, {
                count,
                rarity: rarity || 'any',
                seed: seed || 'random',
                totalValue,
                items: selectedItems.map(i => ({ name: i.name, rarity: i.rarity }))
            });

            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('LootBox', 'Failed to spawn magic items', { count, rarity, error: errorMessage });
            return { items: [], totalValue: 0 };
        } finally {
            setIsLoading(false);
        }
    }, [createRNG]);

    /**
     * Get the total count of magic items available
     */
    const getMagicItemCount = useCallback((): number => {
        return MAGIC_ITEMS.length;
    }, []);

    /**
     * Clear the spawned items
     */
    const clearSpawnedItems = useCallback(() => {
        setSpawnedItems([]);
        setLastHoardResult(null);
        logger.debug('LootBox', 'Cleared spawned items');
    }, []);

    return {
        isLoading,
        spawnedItems,
        lastHoardResult,
        spawnRandomItems,
        spawnByRarity,
        spawnByMultipleRarities,
        spawnTreasureHoard,
        spawnFromList,
        spawnMagicItems,
        getMagicItemCount,
        clearSpawnedItems
    };
};
