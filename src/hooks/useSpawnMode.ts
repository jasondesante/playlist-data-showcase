import { useState, useCallback, useMemo } from 'react';
import { ExtensionManager } from 'playlist-data-engine';
import { logger } from '@/utils/logger';
import { useDataViewerStore, type SpawnMode as StoreSpawnMode } from '@/store/dataViewerStore';
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
        resetSpawnMode: resetStoreSpawnMode,
        resetAllSpawnModes: resetAllStoreSpawnModes
    } = useDataViewerStore();

    /**
     * Get the ExtensionManager singleton instance
     */
    const manager = useMemo(() => ExtensionManager.getInstance(), []);

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
     * Clears both ExtensionManager and store
     */
    const resetCategory = useCallback((category: SpawnCategory): void => {
        try {
            // Handle 'appearance' as aggregate of all appearance sub-categories
            if (isAggregateAppearanceCategory(category)) {
                // Reset all appearance sub-categories
                for (const subCat of APPEARANCE_SUBCATEGORIES) {
                    manager.reset(subCat as any);
                    clearCustomContentForCategory(subCat as any);
                    resetStoreSpawnMode(subCat);
                }
                logger.info('SpawnMode', `Reset all appearance sub-categories to defaults`);
            } else {
                // Reset ExtensionManager
                manager.reset(category as any);
                // Clear custom content cache (localStorage persistence)
                clearCustomContentForCategory(category as any);
                // Clear from store
                resetStoreSpawnMode(category);
                logger.info('SpawnMode', `Reset category ${category} to defaults`);
            }
            bumpVersion();
            notifyDataChanged();
        } catch (error) {
            logger.error('SpawnMode', `Failed to reset category ${category}`, { error: String(error) });
            throw error;
        }
    }, [manager, resetStoreSpawnMode, bumpVersion, notifyDataChanged]);

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
        version
    };
};
