import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storage } from '@/utils/storage';
import { logger } from '@/utils/logger';

/**
 * Spawn mode types - mirrors useSpawnMode's SpawnMode
 */
export type SpawnMode = 'relative' | 'absolute' | 'default' | 'replace';

/**
 * Category stats for tracking custom content
 */
export interface CategoryStats {
    /** Number of custom items in this category */
    customCount: number;
    /** Total items in this category (default + custom) */
    totalCount: number;
    /** Whether this category has any custom content */
    hasCustomContent: boolean;
}

/**
 * State for tracking data viewer updates and spawn mode management
 */
interface DataViewerState {
    /** Timestamp of last data change (custom item added, etc.) */
    lastDataChange: number | null;
    /** Whether there are pending changes to show in Data Viewer */
    hasPendingChanges: boolean;
    /** Last known equipment count */
    lastEquipmentCount: number;

    // Spawn Mode State (per category)
    /** Spawn mode settings per category - persisted across sessions */
    spawnModes: Record<string, SpawnMode>;
    /** Spawn weights per category - persisted across sessions */
    spawnWeights: Record<string, Record<string, number>>;
    /** Category stats (custom counts, totals, has custom content) */
    categoryStats: Record<string, CategoryStats>;

    // Spawn Mode Actions
    /**
     * Get the spawn mode for a category
     * @param category - The category to get mode for
     * @returns The spawn mode, or 'relative' if not set (default)
     */
    getSpawnMode: (category: string) => SpawnMode;
    /**
     * Set the spawn mode for a category
     * @param category - The category to set mode for
     * @param mode - The spawn mode to set
     */
    setSpawnMode: (category: string, mode: SpawnMode) => void;
    /**
     * Get spawn weights for a category
     * @param category - The category to get weights for
     * @returns The spawn weights record, or empty object if not set
     */
    getSpawnWeights: (category: string) => Record<string, number>;
    /**
     * Set spawn weights for a category
     * @param category - The category to set weights for
     * @param weights - The weights to set
     */
    setSpawnWeights: (category: string, weights: Record<string, number>) => void;
    /**
     * Set spawn weight for a single item
     * @param category - The category containing the item
     * @param itemName - Name of the item
     * @param weight - The weight value
     */
    setSpawnWeight: (category: string, itemName: string, weight: number) => void;
    /**
     * Reset spawn mode for a category
     * @param category - The category to reset
     */
    resetSpawnMode: (category: string) => void;
    /**
     * Reset all spawn modes to defaults
     */
    resetAllSpawnModes: () => void;

    // Category Stats Actions
    /**
     * Get stats for a category
     * @param category - The category to get stats for
     * @returns Category stats, or default stats if not tracked
     */
    getCategoryStats: (category: string) => CategoryStats;
    /**
     * Update stats for a category
     * @param category - The category to update
     * @param stats - The new stats
     */
    updateCategoryStats: (category: string, stats: CategoryStats) => void;
    /**
     * Update stats for multiple categories at once
     * @param statsMap - Map of category to stats
     */
    updateAllCategoryStats: (statsMap: Record<string, CategoryStats>) => void;
    /**
     * Check if a category has custom content
     * @param category - The category to check
     * @returns true if category has custom items
     */
    hasCategoryCustomContent: (category: string) => boolean;
    /**
     * Get custom item count for a category
     * @param category - The category to get count for
     * @returns Number of custom items
     */
    getCategoryCustomCount: (category: string) => number;
    /**
     * Get all categories that have custom content
     * @returns Array of category names with custom content
     */
    getCategoriesWithCustomContent: () => string[];
    /**
     * Reset stats for a category
     * @param category - The category to reset
     */
    resetCategoryStats: (category: string) => void;
    /**
     * Reset all category stats
     */
    resetAllCategoryStats: () => void;

    // Data Change Notifications
    /**
     * Notify that data has changed (e.g., custom item added)
     * This will trigger the "New!" badge on the Data Viewer tab
     */
    notifyDataChanged: () => void;
    /**
     * Mark pending changes as viewed (clears the "New!" badge)
     * Call this when the user visits the Data Viewer tab
     */
    markChangesViewed: () => void;
    /**
     * Update the last known equipment count
     * @param count - The current equipment count
     */
    updateEquipmentCount: (count: number) => void;
    /**
     * Check if equipment count has increased
     * @param currentCount - The current equipment count to compare
     * @returns true if count has increased since last check
     */
    hasEquipmentCountIncreased: (currentCount: number) => boolean;
}

/**
 * Default category stats
 */
const DEFAULT_CATEGORY_STATS: CategoryStats = {
    customCount: 0,
    totalCount: 0,
    hasCustomContent: false
};

/**
 * Default spawn mode
 */
const DEFAULT_SPAWN_MODE: SpawnMode = 'relative';

export const useDataViewerStore = create<DataViewerState>()(
    persist(
        (set, get) => ({
            lastDataChange: null,
            hasPendingChanges: false,
            lastEquipmentCount: 0,
            spawnModes: {},
            spawnWeights: {},
            categoryStats: {},

            // ==========================================
            // Spawn Mode Actions
            // ==========================================

            getSpawnMode: (category: string): SpawnMode => {
                const state = get();
                return state.spawnModes[category] ?? DEFAULT_SPAWN_MODE;
            },

            setSpawnMode: (category: string, mode: SpawnMode): void => {
                logger.debug('DataViewer', `Setting spawn mode for ${category} to ${mode}`);
                set((state) => ({
                    spawnModes: {
                        ...state.spawnModes,
                        [category]: mode
                    },
                    lastDataChange: Date.now()
                }));
            },

            getSpawnWeights: (category: string): Record<string, number> => {
                const state = get();
                return state.spawnWeights[category] ?? {};
            },

            setSpawnWeights: (category: string, weights: Record<string, number>): void => {
                logger.debug('DataViewer', `Setting spawn weights for ${category}`, { weightCount: Object.keys(weights).length });
                set((state) => ({
                    spawnWeights: {
                        ...state.spawnWeights,
                        [category]: weights
                    },
                    lastDataChange: Date.now()
                }));
            },

            setSpawnWeight: (category: string, itemName: string, weight: number): void => {
                logger.debug('DataViewer', `Setting spawn weight for ${itemName} in ${category} to ${weight}`);
                set((state) => {
                    const categoryWeights = state.spawnWeights[category] ?? {};
                    return {
                        spawnWeights: {
                            ...state.spawnWeights,
                            [category]: {
                                ...categoryWeights,
                                [itemName]: weight
                            }
                        },
                        lastDataChange: Date.now()
                    };
                });
            },

            resetSpawnMode: (category: string): void => {
                logger.debug('DataViewer', `Resetting spawn mode for ${category}`);
                set((state) => {
                    const { [category]: _, ...remainingModes } = state.spawnModes;
                    const { [category]: __, ...remainingWeights } = state.spawnWeights;
                    return {
                        spawnModes: remainingModes,
                        spawnWeights: remainingWeights,
                        lastDataChange: Date.now()
                    };
                });
            },

            resetAllSpawnModes: (): void => {
                logger.debug('DataViewer', 'Resetting all spawn modes');
                set({
                    spawnModes: {},
                    spawnWeights: {},
                    lastDataChange: Date.now()
                });
            },

            // ==========================================
            // Category Stats Actions
            // ==========================================

            getCategoryStats: (category: string): CategoryStats => {
                const state = get();
                return state.categoryStats[category] ?? DEFAULT_CATEGORY_STATS;
            },

            updateCategoryStats: (category: string, stats: CategoryStats): void => {
                logger.debug('DataViewer', `Updating stats for ${category}`, stats);
                set((state) => ({
                    categoryStats: {
                        ...state.categoryStats,
                        [category]: stats
                    }
                }));
            },

            updateAllCategoryStats: (statsMap: Record<string, CategoryStats>): void => {
                logger.debug('DataViewer', `Updating stats for ${Object.keys(statsMap).length} categories`);
                set((state) => ({
                    categoryStats: {
                        ...state.categoryStats,
                        ...statsMap
                    }
                }));
            },

            hasCategoryCustomContent: (category: string): boolean => {
                const state = get();
                return state.categoryStats[category]?.hasCustomContent ?? false;
            },

            getCategoryCustomCount: (category: string): number => {
                const state = get();
                return state.categoryStats[category]?.customCount ?? 0;
            },

            getCategoriesWithCustomContent: (): string[] => {
                const state = get();
                return Object.entries(state.categoryStats)
                    .filter(([_, stats]) => stats.hasCustomContent)
                    .map(([category]) => category);
            },

            resetCategoryStats: (category: string): void => {
                logger.debug('DataViewer', `Resetting stats for ${category}`);
                set((state) => {
                    const { [category]: _, ...remainingStats } = state.categoryStats;
                    return {
                        categoryStats: remainingStats,
                        lastDataChange: Date.now()
                    };
                });
            },

            resetAllCategoryStats: (): void => {
                logger.debug('DataViewer', 'Resetting all category stats');
                set({
                    categoryStats: {},
                    lastDataChange: Date.now()
                });
            },

            // ==========================================
            // Data Change Notifications
            // ==========================================

            notifyDataChanged: () => {
                logger.debug('DataViewer', 'Data change notified');
                set({
                    lastDataChange: Date.now(),
                    hasPendingChanges: true
                });
            },

            markChangesViewed: () => {
                if (get().hasPendingChanges) {
                    logger.debug('DataViewer', 'Changes marked as viewed');
                    set({ hasPendingChanges: false });
                }
            },

            updateEquipmentCount: (count: number) => {
                set({ lastEquipmentCount: count });
            },

            hasEquipmentCountIncreased: (currentCount: number) => {
                return currentCount > get().lastEquipmentCount;
            }
        }),
        {
            name: 'dataviewer-storage',
            storage: createJSONStorage(() => storage),
            // Persist spawn modes, weights, and certain fields
            partialize: (state) => ({
                lastEquipmentCount: state.lastEquipmentCount,
                spawnModes: state.spawnModes,
                spawnWeights: state.spawnWeights
            })
        }
    )
);
