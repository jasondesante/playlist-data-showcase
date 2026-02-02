import { useState, useCallback } from 'react';
import { EquipmentSpawnHelper, EnhancedEquipment, SeededRNG } from 'playlist-data-engine';
import { logger } from '@/utils/logger';

/**
 * Result interface for treasure hoard spawning
 */
export interface LootBoxResult {
    /** Array of spawned equipment items */
    items: EnhancedEquipment[];
    /** Total value of the hoard in gold pieces */
    totalValue?: number;
    /** Challenge rating used for the hoard */
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
    spawnByRarity: (rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary', count: number, seed?: string) => Promise<LootBoxResult>;
    /** Spawn a treasure hoard based on challenge rating */
    spawnTreasureHoard: (cr: number, seed?: string) => Promise<LootBoxResult>;
    /** Spawn specific items by name */
    spawnFromList: (itemNames: string[], seed?: string) => Promise<LootBoxResult>;
    /** Clear the spawned items */
    clearSpawnedItems: () => void;
}

/**
 * React hook for loot box style equipment spawning.
 *
 * This hook provides functionality to spawn equipment items using various methods
 * from the playlist-data-engine's EquipmentSpawnHelper. It supports random spawning,
 * rarity-based spawning, treasure hoards, and spawning specific items by name.
 *
 * @example
 * ```tsx
 * const {
 *   isLoading,
 *   spawnedItems,
 *   spawnRandomItems,
 *   spawnTreasureHoard,
 *   spawnByRarity
 * } = useLootBox();
 *
 * // Spawn 5 random items
 * const result = await spawnRandomItems(5, 'my_seed');
 *
 * // Spawn a treasure hoard for CR 10
 * const hoard = await spawnTreasureHoard(10);
 *
 * // Spawn 3 rare items
 * const rareItems = await spawnByRarity('rare', 3);
 * ```
 *
 * @returns {UseLootBoxReturn} Hook return object with spawn functions and state
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

            const result: LootBoxResult = { items };

            setSpawnedItems(items);
            setLastHoardResult(result);

            logger.info('LootBox', `Spawned ${items.length} random items`, {
                count,
                seed: seed || 'random',
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
        rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary',
        count: number,
        seed?: string
    ): Promise<LootBoxResult> => {
        setIsLoading(true);

        try {
            const rng = createRNG(seed);
            const items = EquipmentSpawnHelper.spawnByRarity(rarity, count, rng);

            const result: LootBoxResult = { items };

            setSpawnedItems(items);
            setLastHoardResult(result);

            logger.info('LootBox', `Spawned ${items.length} ${rarity} items`, {
                rarity,
                count,
                seed: seed || 'random',
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

            const result: LootBoxResult = { items };

            setSpawnedItems(items);
            setLastHoardResult(result);

            logger.info('LootBox', `Spawned ${items.length} items from list`, {
                requested: itemNames,
                spawned: items.map(i => i.name),
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
        spawnTreasureHoard,
        spawnFromList,
        clearSpawnedItems
    };
};
