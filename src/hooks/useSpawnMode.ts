import { useState, useCallback, useMemo, useEffect } from 'react';
import { ExtensionManager } from 'playlist-data-engine';
import { logger } from '@/utils/logger';
import { useDataViewerStore, type SpawnMode as StoreSpawnMode, type GlobalSpawnMode as StoreGlobalSpawnMode } from '@/store/dataViewerStore';
import { clearCustomContentForCategory, clearAllCustomContent } from './useContentCreator';

/**
 * Spawn mode types for ExtensionManager content registration.
 *
 * Controls how custom content is mixed with default content during procedural generation.
 *
 * - `relative`: Custom items added to default pool with custom weights (default)
 * - `absolute`: Only custom items can spawn (defaults excluded)
 * - `default`: All items have equal weight (1.0)
 * - `replace`: Clear previous custom data before registering
 */
export type SpawnMode = 'relative' | 'absolute' | 'default' | 'replace';

/**
 * Category types supported by the spawn mode system.
 * These map to ExtensionManager's ExtensionCategory type.
 */
export type SpawnCategory =
    | 'equipment'
    | 'equipment.templates'
    | 'appearance'  // Aggregate category for all appearance sub-categories
    | 'appearance.bodyTypes'
    | 'appearance.skinTones'
    | 'appearance.hairColors'
    | 'appearance.hairStyles'
    | 'appearance.eyeColors'
    | 'appearance.facialFeatures'
    | 'spells'
    | `spells.${string}`  // Class-specific spells like 'spells.Wizard'
    | 'races'
    | 'races.data'
    | 'classes'
    | 'classes.data'
    | 'classFeatures'
    | `classFeatures.${string}` // Class-specific features
    | 'racialTraits'
    | `racialTraits.${string}` // Race-specific traits
    | 'skills'
    | `skills.${string}` // Ability-specific skills
    | 'skillLists'
    | `skillLists.${string}` // Class skill lists
    | 'classSpellLists'
    | `classSpellLists.${string}` // Class spell lists
    | 'classSpellSlots'
    | 'classStartingEquipment'
    | `classStartingEquipment.${string}`;

/**
 * Weight map for spawn weights per item.
 * Key is the item name/identifier, value is the spawn weight.
 */
export type SpawnWeights = Record<string, number>;

/**
 * Appearance sub-categories that make up the aggregate 'appearance' category.
 * When checking or resetting 'appearance', we operate on all these sub-categories.
 */
const APPEARANCE_SUBCATEGORIES: SpawnCategory[] = [
    'appearance.bodyTypes',
    'appearance.skinTones',
    'appearance.hairColors',
    'appearance.hairStyles',
    'appearance.eyeColors',
    'appearance.facialFeatures'
];

/**
 * Global spawn mode - can be a specific mode or 'category' to use per-category settings
 */
export type GlobalSpawnMode = 'category' | SpawnMode;

/**
 * Check if a category is the aggregate 'appearance' category.
 * Note: 'appearance' itself is not a valid ExtensionManager category,
 * but it's used in the UI to represent all appearance sub-categories.
 */
function isAggregateAppearanceCategory(category: SpawnCategory): boolean {
    return category === 'appearance' as SpawnCategory;
}

/**
 * Category info returned by getCategoryInfo
 */
export interface CategorySpawnInfo {
    /** Current spawn mode */
    mode: SpawnMode | undefined;
    /** Whether category has custom data */
    hasCustomData: boolean;
    /** Current spawn weights */
    weights: SpawnWeights;
    /** Custom item count */
    customCount: number;
    /** Total item count (default + custom) */
    totalCount: number;
}

/**
 * Interface for the useSpawnMode hook return value
 */
export interface UseSpawnModeReturn {
    /**
     * Get the current spawn mode for a category
     * @param category - The category to get mode for
     * @returns The current spawn mode, or undefined if not set
     */
    getMode: (category: SpawnCategory) => SpawnMode | undefined;

    /**
     * Set the spawn mode for a category
     * @param category - The category to set mode for
     * @param mode - The spawn mode to set
     */
    setMode: (category: SpawnCategory, mode: SpawnMode) => void;

    /**
     * Get spawn weights for a category
     * @param category - The category to get weights for
     * @returns Object mapping item names to weights
     */
    getWeights: (category: SpawnCategory) => SpawnWeights;

    /**
     * Set spawn weight for a specific item in a category
     * @param category - The category containing the item
     * @param itemName - Name/ID of the item
     * @param weight - Weight value (0 = never spawns, 1.0 = default, higher = more common)
     */
    setWeight: (category: SpawnCategory, itemName: string, weight: number) => void;

    /**
     * Set multiple spawn weights for a category at once
     * @param category - The category to set weights for
     * @param weights - Object mapping item names to weights
     */
    setWeights: (category: SpawnCategory, weights: SpawnWeights) => void;

    /**
     * Reset a category to its default state
     * Removes all custom data and resets mode to default
     * @param category - The category to reset
     */
    resetCategory: (category: SpawnCategory) => void;

    /**
     * Reset all categories to their default state
     * Removes all custom data from all categories
     */
    resetAll: () => void;

    /**
     * Check if a category has any custom data
     * @param category - The category to check
     * @returns true if category has custom items registered
     */
    hasCustomData: (category: SpawnCategory) => boolean;

    /**
     * Get detailed info about a category's spawn configuration
     * @param category - The category to get info for
     * @returns Detailed spawn info object
     */
    getCategoryInfo: (category: SpawnCategory) => CategorySpawnInfo;

    /**
     * Get all categories that have custom data registered
     * @returns Array of category names with custom data
     */
    getCategoriesWithCustomData: () => SpawnCategory[];

    /**
     * Export all custom spawn configuration for persistence
     * @returns Object with mode and weights for each category
     */
    exportSpawnConfig: () => Record<string, { mode: SpawnMode | undefined; weights: SpawnWeights }>;

    /**
     * Import spawn configuration from a previously exported config
     * @param config - The configuration to import
     */
    importSpawnConfig: (config: Record<string, { mode: SpawnMode | undefined; weights: SpawnWeights }>) => void;

    // Global Spawn Mode
    /**
     * Get the global spawn mode
     * @returns The global spawn mode, or 'category' if using per-category settings
     */
    getGlobalMode: () => GlobalSpawnMode;

    /**
     * Set the global spawn mode (applies to all categories)
     * @param mode - The global spawn mode ('category' to use per-category settings)
     */
    setGlobalMode: (mode: GlobalSpawnMode) => void;

    /**
     * Get the effective spawn mode for a category (global override or category-specific)
     * @param category - The category to get mode for
     * @returns The effective spawn mode to use
     */
    getEffectiveMode: (category: SpawnCategory) => SpawnMode;

    /**
     * Version counter that increments on any change
     * Useful for triggering re-renders in components
     */
    version: number;
}

/**
 * React hook for managing spawn modes and weights for ExtensionManager categories.
 *
 * This hook provides a React-friendly interface to the ExtensionManager's spawn
 * mode and weight system, with automatic re-render triggering when modes change.
 *
 * @example
 * ```tsx
 * const {
 *   getMode,
 *   setMode,
 *   getWeights,
 *   setWeight,
 *   resetCategory,
 *   hasCustomData
 * } = useSpawnMode();
 *
 * // Set absolute mode for equipment (only custom items spawn)
 * setMode('equipment', 'absolute');
 *
 * // Set spawn weight for a specific item
 * setWeight('equipment', 'Dragon Sword', 0.5);
 *
 * // Reset a category
 * resetCategory('equipment');
 * ```
 *
 * @returns {UseSpawnModeReturn} Hook return object with spawn mode management functions
 */
export const useSpawnMode = (): UseSpawnModeReturn => {
    // Version counter for triggering re-renders
    const [version, setVersion] = useState(0);

    // Get the data viewer store for notifications and persistence
    const {
        notifyDataChanged,
        getSpawnMode: getStoreSpawnMode,
        setSpawnMode: setStoreSpawnMode,
        getSpawnWeights: getStoreSpawnWeights,
        setSpawnWeights: setStoreSpawnWeights,
        // Note: resetSpawnMode is intentionally not used - we preserve spawn mode when resetting categories
        resetAllSpawnModes: resetAllStoreSpawnModes,
        getGlobalSpawnMode: getStoreGlobalSpawnMode,
        setGlobalSpawnMode: setStoreGlobalSpawnMode
    } = useDataViewerStore();

    /**
     * Get the ExtensionManager singleton instance
     */
    const manager = useMemo(() => ExtensionManager.getInstance(), []);

    /**
     * Sync persisted spawn modes from store to ExtensionManager on mount
     * This ensures the ExtensionManager has the correct modes after page refresh
     */
    useEffect(() => {
        const syncPersistedModes = () => {
            try {
                // Get all persisted spawn modes from the store
                const storeState = useDataViewerStore.getState();
                const persistedModes = storeState.spawnModes;
                const persistedWeights = storeState.spawnWeights;
                const globalMode = storeState.globalSpawnMode;

                // Sync each persisted mode to the ExtensionManager
                for (const [category, mode] of Object.entries(persistedModes)) {
                    try {
                        manager.setMode(category as any, mode as SpawnMode);
                        logger.debug('SpawnMode', `Restored mode for ${category} to ${mode}`);
                    } catch (e) {
                        logger.warn('SpawnMode', `Failed to restore mode for ${category}`, { error: String(e) });
                    }
                }

                // Sync persisted weights to the ExtensionManager
                for (const [category, weights] of Object.entries(persistedWeights)) {
                    if (weights && Object.keys(weights).length > 0) {
                        try {
                            manager.setWeights(category as any, weights as Record<string, number>);
                            logger.debug('SpawnMode', `Restored weights for ${category}`);
                        } catch (e) {
                            logger.warn('SpawnMode', `Failed to restore weights for ${category}`, { error: String(e) });
                        }
                    }
                }

                // If global mode is set to a specific mode (not 'category'), apply it
                if (globalMode && globalMode !== 'category') {
                    const categories = manager.getRegisteredCategories();
                    for (const category of categories) {
                        try {
                            manager.setMode(category as any, globalMode as SpawnMode);
                        } catch (e) {
                            logger.warn('SpawnMode', `Failed to apply global mode to ${category}`, { error: String(e) });
                        }
                    }
                    logger.info('SpawnMode', `Applied global mode ${globalMode} to all categories on init`);
                }

                logger.info('SpawnMode', 'Synced persisted spawn modes from store to ExtensionManager');
            } catch (error) {
                logger.error('SpawnMode', 'Failed to sync persisted modes', { error: String(error) });
            }
        };

        syncPersistedModes();
    }, [manager]);

    /**
     * Increment version to trigger re-renders
     */
    const bumpVersion = useCallback(() => {
        setVersion(v => v + 1);
    }, []);

    /**
     * Get the current spawn mode for a category
     * Priority: ExtensionManager runtime > Store persisted value
     */
    const getMode = useCallback((category: SpawnCategory): SpawnMode | undefined => {
        try {
            // Handle 'appearance' as aggregate - return mode of first sub-category
            // (all sub-categories should have the same mode after setMode)
            if (isAggregateAppearanceCategory(category)) {
                const firstSubCat = APPEARANCE_SUBCATEGORIES[0];
                const managerMode = manager.getMode(firstSubCat as any) as SpawnMode | undefined;
                if (managerMode) return managerMode;
                return getStoreSpawnMode(firstSubCat) as SpawnMode | undefined;
            }
            const managerMode = manager.getMode(category as any) as SpawnMode | undefined;
            if (managerMode) return managerMode;
            // Fallback to store for persisted value
            return getStoreSpawnMode(category) as SpawnMode | undefined;
        } catch (error) {
            logger.warn('SpawnMode', `Failed to get mode for ${category}`, { error: String(error) });
            // Try store as fallback
            return getStoreSpawnMode(category) as SpawnMode | undefined;
        }
    }, [manager, getStoreSpawnMode]);

    /**
     * Set the spawn mode for a category
     * Updates both ExtensionManager and store for persistence
     */
    const setMode = useCallback((category: SpawnCategory, mode: SpawnMode): void => {
        try {
            // Handle 'appearance' as aggregate of all appearance sub-categories
            if (isAggregateAppearanceCategory(category)) {
                // Set mode for all appearance sub-categories
                for (const subCat of APPEARANCE_SUBCATEGORIES) {
                    manager.setMode(subCat as any, mode);
                    setStoreSpawnMode(subCat, mode as StoreSpawnMode);
                }
                logger.info('SpawnMode', `Set mode for all appearance sub-categories to ${mode}`);
            } else {
                // Update ExtensionManager
                manager.setMode(category as any, mode);
                // Update store for persistence
                setStoreSpawnMode(category, mode as StoreSpawnMode);
                logger.info('SpawnMode', `Set mode for ${category} to ${mode}`);
            }
            bumpVersion();
            notifyDataChanged();
        } catch (error) {
            logger.error('SpawnMode', `Failed to set mode for ${category}`, { error: String(error) });
            throw error;
        }
    }, [manager, setStoreSpawnMode, bumpVersion, notifyDataChanged]);

    /**
     * Get spawn weights for a category
     * Priority: ExtensionManager runtime > Store persisted value
     */
    const getWeights = useCallback((category: SpawnCategory): SpawnWeights => {
        try {
            const managerWeights = manager.getWeights(category as any);
            if (managerWeights && Object.keys(managerWeights).length > 0) {
                return managerWeights;
            }
            // Fallback to store for persisted weights
            return getStoreSpawnWeights(category);
        } catch (error) {
            logger.warn('SpawnMode', `Failed to get weights for ${category}`, { error: String(error) });
            return getStoreSpawnWeights(category);
        }
    }, [manager, getStoreSpawnWeights]);

    /**
     * Set spawn weight for a specific item in a category
     * Updates both ExtensionManager and store for persistence
     */
    const setWeight = useCallback((category: SpawnCategory, itemName: string, weight: number): void => {
        try {
            const currentWeights = getWeights(category);
            const newWeights = { ...currentWeights, [itemName]: weight };
            // Update ExtensionManager
            manager.setWeights(category as any, newWeights);
            // Update store for persistence
            setStoreSpawnWeights(category, newWeights);
            logger.debug('SpawnMode', `Set weight for ${itemName} in ${category} to ${weight}`);
            bumpVersion();
            notifyDataChanged();
        } catch (error) {
            logger.error('SpawnMode', `Failed to set weight for ${itemName} in ${category}`, { error: String(error) });
            throw error;
        }
    }, [manager, getWeights, setStoreSpawnWeights, bumpVersion, notifyDataChanged]);

    /**
     * Set multiple spawn weights for a category at once
     * Updates both ExtensionManager and store for persistence
     */
    const setWeights = useCallback((category: SpawnCategory, weights: SpawnWeights): void => {
        try {
            // Update ExtensionManager
            manager.setWeights(category as any, weights);
            // Update store for persistence
            setStoreSpawnWeights(category, weights);
            logger.debug('SpawnMode', `Set weights for ${category}`, { weightCount: Object.keys(weights).length });
            bumpVersion();
            notifyDataChanged();
        } catch (error) {
            logger.error('SpawnMode', `Failed to set weights for ${category}`, { error: String(error) });
            throw error;
        }
    }, [manager, setStoreSpawnWeights, bumpVersion, notifyDataChanged]);

    /**
     * Reset a category to its default state
     * Clears custom content and weights, but preserves the spawn mode setting
     */
    const resetCategory = useCallback((category: SpawnCategory): void => {
        try {
            // Handle 'appearance' as aggregate of all appearance sub-categories
            if (isAggregateAppearanceCategory(category)) {
                // Reset all appearance sub-categories
                for (const subCat of APPEARANCE_SUBCATEGORIES) {
                    manager.reset(subCat as any);
                    clearCustomContentForCategory(subCat as any);
                    // Note: We intentionally do NOT reset the spawn mode - user's mode preference is preserved
                }
                logger.info('SpawnMode', `Reset all appearance sub-categories to defaults (spawn mode preserved)`);
            } else {
                // Reset ExtensionManager
                manager.reset(category as any);
                // Clear custom content cache (localStorage persistence)
                clearCustomContentForCategory(category as any);
                // Note: We intentionally do NOT reset the spawn mode - user's mode preference is preserved
                logger.info('SpawnMode', `Reset category ${category} to defaults (spawn mode preserved)`);
            }
            bumpVersion();
            notifyDataChanged();
        } catch (error) {
            logger.error('SpawnMode', `Failed to reset category ${category}`, { error: String(error) });
            throw error;
        }
    }, [manager, bumpVersion, notifyDataChanged]);

    /**
     * Reset all categories to their default state
     * Clears both ExtensionManager and store
     */
    const resetAll = useCallback((): void => {
        try {
            // Reset ExtensionManager
            manager.resetAll();
            // Clear all custom content cache (localStorage persistence)
            clearAllCustomContent();
            // Clear all from store
            resetAllStoreSpawnModes();
            logger.info('SpawnMode', 'Reset all categories to defaults');
            bumpVersion();
            notifyDataChanged();
        } catch (error) {
            logger.error('SpawnMode', 'Failed to reset all categories', { error: String(error) });
            throw error;
        }
    }, [manager, resetAllStoreSpawnModes, bumpVersion, notifyDataChanged]);

    /**
     * Check if a category has any custom data
     */
    const hasCustomData = useCallback((category: SpawnCategory): boolean => {
        try {
            // Handle 'appearance' as aggregate of all appearance sub-categories
            if (isAggregateAppearanceCategory(category)) {
                return APPEARANCE_SUBCATEGORIES.some(subCat => manager.hasCustomData(subCat as any));
            }
            return manager.hasCustomData(category as any);
        } catch (error) {
            logger.warn('SpawnMode', `Failed to check custom data for ${category}`, { error: String(error) });
            return false;
        }
    }, [manager]);

    /**
     * Get detailed info about a category's spawn configuration
     */
    const getCategoryInfo = useCallback((category: SpawnCategory): CategorySpawnInfo => {
        try {
            // Handle 'appearance' as aggregate of all appearance sub-categories
            if (isAggregateAppearanceCategory(category)) {
                let totalCustomCount = 0;
                let totalTotalCount = 0;
                const allWeights: SpawnWeights = {};

                for (const subCat of APPEARANCE_SUBCATEGORIES) {
                    const subInfo = manager.getInfo(subCat as any);
                    totalCustomCount += subInfo?.customCount ?? 0;
                    totalTotalCount += subInfo?.totalCount ?? 0;
                    // Merge weights from all sub-categories
                    const subWeights = manager.getWeights(subCat as any);
                    if (subWeights) {
                        Object.assign(allWeights, subWeights);
                    }
                }

                return {
                    mode: getMode(category),
                    hasCustomData: hasCustomData(category),
                    weights: allWeights,
                    customCount: totalCustomCount,
                    totalCount: totalTotalCount
                };
            }

            const info = manager.getInfo(category as any);
            return {
                mode: getMode(category),
                hasCustomData: hasCustomData(category),
                weights: getWeights(category),
                customCount: info?.customCount ?? 0,
                totalCount: info?.totalCount ?? 0
            };
        } catch (error) {
            logger.warn('SpawnMode', `Failed to get info for ${category}`, { error: String(error) });
            return {
                mode: undefined,
                hasCustomData: false,
                weights: {},
                customCount: 0,
                totalCount: 0
            };
        }
    }, [manager, getMode, hasCustomData, getWeights]);

    /**
     * Get all categories that have custom data registered
     */
    const getCategoriesWithCustomData = useCallback((): SpawnCategory[] => {
        try {
            const categories = manager.getRegisteredCategories();
            return categories.filter(cat => hasCustomData(cat as SpawnCategory)) as SpawnCategory[];
        } catch (error) {
            logger.warn('SpawnMode', 'Failed to get categories with custom data', { error: String(error) });
            return [];
        }
    }, [manager, hasCustomData]);

    /**
     * Export all custom spawn configuration for persistence
     */
    const exportSpawnConfig = useCallback((): Record<string, { mode: SpawnMode | undefined; weights: SpawnWeights }> => {
        try {
            const categories = manager.getRegisteredCategories();
            const config: Record<string, { mode: SpawnMode | undefined; weights: SpawnWeights }> = {};

            for (const category of categories) {
                if (hasCustomData(category as SpawnCategory)) {
                    config[category] = {
                        mode: getMode(category as SpawnCategory),
                        weights: getWeights(category as SpawnCategory)
                    };
                }
            }

            logger.info('SpawnMode', `Exported spawn config for ${Object.keys(config).length} categories`);
            return config;
        } catch (error) {
            logger.error('SpawnMode', 'Failed to export spawn config', { error: String(error) });
            return {};
        }
    }, [manager, hasCustomData, getMode, getWeights]);

    /**
     * Import spawn configuration from a previously exported config
     */
    const importSpawnConfig = useCallback((config: Record<string, { mode: SpawnMode | undefined; weights: SpawnWeights }>): void => {
        try {
            let importedCount = 0;

            for (const [category, settings] of Object.entries(config)) {
                try {
                    if (settings.mode) {
                        manager.setMode(category as any, settings.mode);
                    }
                    if (settings.weights && Object.keys(settings.weights).length > 0) {
                        manager.setWeights(category as any, settings.weights);
                    }
                    importedCount++;
                } catch (catError) {
                    logger.warn('SpawnMode', `Failed to import config for ${category}`, { error: String(catError) });
                }
            }

            logger.info('SpawnMode', `Imported spawn config for ${importedCount} categories`);
            bumpVersion();
            notifyDataChanged();
        } catch (error) {
            logger.error('SpawnMode', 'Failed to import spawn config', { error: String(error) });
            throw error;
        }
    }, [manager, bumpVersion, notifyDataChanged]);

    // ==========================================
    // Global Spawn Mode Functions
    // ==========================================

    /**
     * Get the global spawn mode
     */
    const getGlobalMode = useCallback((): GlobalSpawnMode => {
        return getStoreGlobalSpawnMode() as GlobalSpawnMode;
    }, [getStoreGlobalSpawnMode]);

    /**
     * Set the global spawn mode (applies to all categories)
     */
    const setGlobalMode = useCallback((mode: GlobalSpawnMode): void => {
        try {
            // Update store for persistence
            setStoreGlobalSpawnMode(mode as StoreGlobalSpawnMode);

            // If mode is not 'category', apply it to all registered categories
            if (mode !== 'category') {
                const categories = manager.getRegisteredCategories();
                for (const category of categories) {
                    try {
                        manager.setMode(category as any, mode);
                        setStoreSpawnMode(category, mode as StoreSpawnMode);
                    } catch (catError) {
                        logger.warn('SpawnMode', `Failed to set global mode for ${category}`, { error: String(catError) });
                    }
                }
                logger.info('SpawnMode', `Applied global mode ${mode} to all ${categories.length} categories`);
            }

            bumpVersion();
            notifyDataChanged();
        } catch (error) {
            logger.error('SpawnMode', 'Failed to set global spawn mode', { error: String(error) });
            throw error;
        }
    }, [manager, setStoreGlobalSpawnMode, setStoreSpawnMode, bumpVersion, notifyDataChanged]);

    /**
     * Get the effective spawn mode for a category (global override or category-specific)
     */
    const getEffectiveMode = useCallback((category: SpawnCategory): SpawnMode => {
        const globalMode = getStoreGlobalSpawnMode();
        // If global mode is set to a specific mode (not 'category'), use it
        if (globalMode && globalMode !== 'category') {
            return globalMode as SpawnMode;
        }
        // Otherwise, use the category-specific mode
        return getMode(category) || 'relative';
    }, [getStoreGlobalSpawnMode, getMode]);

    return {
        getMode,
        setMode,
        getWeights,
        setWeight,
        setWeights,
        resetCategory,
        resetAll,
        hasCustomData,
        getCategoryInfo,
        getCategoriesWithCustomData,
        exportSpawnConfig,
        importSpawnConfig,
        // Global spawn mode functions
        getGlobalMode,
        setGlobalMode,
        getEffectiveMode,
        version
    };
};
