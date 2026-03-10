/**
 * Batch Image Persistence Utility
 *
 * Provides localStorage persistence for batch image updates applied through
 * the DataViewerTab's batch image tool. This ensures images persist across
 * page reloads without requiring manual export/import.
 *
 * Uses the ExtensionManager's imageOverrides system which stores patches
 * (icon/image changes) separately from item data, avoiding duplicates.
 *
 * @see docs/plans/BATCH_IMAGE_TOOL_BUG_RESEARCH.md for implementation details
 */

import { ExtensionManager, type ImageOverride, SpellQuery, SkillQuery, FeatureQuery } from 'playlist-data-engine';
import { logger } from '@/utils/logger';

/**
 * localStorage key for batch image updates
 */
export const BATCH_IMAGE_STORAGE_KEY = 'batch_image_overrides';

/**
 * Supported categories for batch image operations
 * Must match ImageSupportedCategory from ExtensionManager
 */
export type BatchImageCategory = 'spells' | 'skills' | 'classFeatures' | 'racialTraits' | 'equipment' | 'races.data' | 'classes.data';

/**
 * Updates for a single category (using ImageOverride from ExtensionManager)
 */
export interface BatchImageCategoryUpdates {
    overrides: ImageOverride[];
}

/**
 * Full storage structure for batch image overrides
 */
export interface BatchImageStorage {
    /** Schema version for future migrations */
    version: string;
    /** Last update timestamp */
    updatedAt: number;
    /** Overrides per category */
    categories: Record<string, BatchImageCategoryUpdates>;
}

/**
 * Get the current storage contents (or empty structure if none exists)
 */
function getStorage(): BatchImageStorage {
    try {
        const stored = localStorage.getItem(BATCH_IMAGE_STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored) as BatchImageStorage;
            // Validate version
            if (parsed.version && parsed.categories) {
                return parsed;
            }
        }
    } catch (error) {
        logger.warn('BatchImagePersistence', 'Failed to read from localStorage', { error: String(error) });
    }
    // Return empty structure
    return {
        version: '1.0',
        updatedAt: Date.now(),
        categories: {}
    };
}

/**
 * Save storage to localStorage
 */
function saveStorage(storage: BatchImageStorage): void {
    try {
        storage.updatedAt = Date.now();
        localStorage.setItem(BATCH_IMAGE_STORAGE_KEY, JSON.stringify(storage));
        logger.debug('BatchImagePersistence', `Saved updates for ${Object.keys(storage.categories).length} categories`);
    } catch (error) {
        logger.warn('BatchImagePersistence', 'Failed to save to localStorage', { error: String(error) });
    }
}

/**
 * Save batch image updates for a category
 *
 * This should be called after a successful batch image operation.
 * It pulls the current image overrides from ExtensionManager and saves them.
 *
 * @param category - The category that was updated
 */
export function saveBatchImageUpdates(category: BatchImageCategory): void {
    const manager = ExtensionManager.getInstance();
    const overrides = manager.getImageOverridesForCategory(category as any);

    if (!overrides || overrides.length === 0) {
        logger.debug('BatchImagePersistence', 'No overrides to save, skipping');
        return;
    }

    const storage = getStorage();

    // Store overrides for this category
    storage.categories[category] = {
        overrides: overrides
    };

    saveStorage(storage);

    logger.info('BatchImagePersistence', `Saved ${overrides.length} image overrides for ${category}`);
}

/**
 * Load all batch image updates from localStorage
 *
 * @returns The full storage object, or null if none exists
 */
export function loadBatchImageUpdates(): BatchImageStorage | null {
    try {
        const stored = localStorage.getItem(BATCH_IMAGE_STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored) as BatchImageStorage;
            if (parsed.version && parsed.categories) {
                logger.info('BatchImagePersistence', `Loaded updates for ${Object.keys(parsed.categories).length} categories`);
                return parsed;
            }
        }
    } catch (error) {
        logger.warn('BatchImagePersistence', 'Failed to load from localStorage', { error: String(error) });
    }
    return null;
}

/**
 * Clear all batch image updates from localStorage
 *
 * Use this to reset to default images or fix corrupted data.
 */
export function clearBatchImageUpdates(): void {
    try {
        const storage = getStorage();
        const categoryCount = Object.keys(storage.categories).length;
        localStorage.removeItem(BATCH_IMAGE_STORAGE_KEY);
        logger.info('BatchImagePersistence', `Cleared image updates for ${categoryCount} categories`);
    } catch (error) {
        logger.warn('BatchImagePersistence', 'Failed to clear localStorage', { error: String(error) });
    }
}

/**
 * Restore batch image updates to ExtensionManager
 *
 * This should be called on app startup after ExtensionManager is initialized.
 * It restores saved image overrides using the ExtensionManager's restoreImageOverrides API.
 *
 * @returns Number of categories restored
 */
export function restoreBatchImageUpdates(): number {
    const storage = loadBatchImageUpdates();
    if (!storage || Object.keys(storage.categories).length === 0) {
        logger.debug('BatchImagePersistence', 'No saved overrides to restore');
        return 0;
    }

    const manager = ExtensionManager.getInstance();
    let restoredCategories = 0;
    let totalOverrides = 0;

    for (const [category, data] of Object.entries(storage.categories)) {
        // Handle both old format (updates) and new format (overrides)
        const overrides = data.overrides || (data as any).updates;
        
        if (!overrides || overrides.length === 0) {
            continue;
        }

        try {
            // Convert old format if needed
            const imageOverrides: ImageOverride[] = overrides.map((o: any) => ({
                identifier: o.identifier || o.name,
                icon: o.icon,
                image: o.image,
                appliedAt: o.appliedAt || Date.now()
            }));

            // Restore using the new API
            manager.restoreImageOverrides(category as BatchImageCategory, imageOverrides);

            restoredCategories++;
            totalOverrides += imageOverrides.length;
            logger.info('BatchImagePersistence', `Restored ${imageOverrides.length} image overrides for ${category}`);
        } catch (error) {
            logger.warn('BatchImagePersistence', `Failed to restore overrides for ${category}`, { error: String(error) });
        }
    }

    // Invalidate query caches to ensure fresh data
    try {
        SpellQuery.getInstance().invalidateCache();
        SkillQuery.getInstance().invalidateCache();
        FeatureQuery.getInstance().invalidateCache();
    } catch (error) {
        // Queries may not be initialized yet, which is fine
        logger.debug('BatchImagePersistence', 'Some query caches not available for invalidation');
    }

    if (totalOverrides > 0) {
        logger.info('BatchImagePersistence', `Restored ${totalOverrides} image overrides across ${restoredCategories} categories`);
    }

    return restoredCategories;
}

/**
 * Get count of saved overrides per category
 *
 * Useful for debugging or displaying restore status.
 */
export function getBatchImageUpdateCounts(): Record<string, number> {
    const storage = loadBatchImageUpdates();
    if (!storage) {
        return {};
    }

    const counts: Record<string, number> = {};
    for (const [category, data] of Object.entries(storage.categories)) {
        // Handle both old format (updates) and new format (overrides)
        const overrides = data.overrides || (data as any).updates;
        counts[category] = overrides?.length || 0;
    }
    return counts;
}
