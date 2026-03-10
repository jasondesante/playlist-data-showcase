/**
 * Batch Image Persistence Utility
 *
 * Provides localStorage persistence for batch image updates applied through
 * the DataViewerTab's batch image tool. This ensures images persist across
 * page reloads without requiring manual export/import.
 *
 * Design Decision: Option A from Task 2.1 - Auto-save to localStorage with auto-restore
 *
 * @see docs/plans/BATCH_IMAGE_TOOL_BUG_RESEARCH.md for implementation details
 */

import { ExtensionManager, SpellQuery, SkillQuery, FeatureQuery } from 'playlist-data-engine';
import { logger } from '@/utils/logger';

/**
 * localStorage key for batch image updates
 */
export const BATCH_IMAGE_STORAGE_KEY = 'batch_image_updates';

/**
 * Supported categories for batch image operations
 */
export type BatchImageCategory = 'spells' | 'skills' | 'features' | 'equipment' | 'classes' | 'races';

/**
 * Single item update with icon/image fields
 */
export interface BatchImageItemUpdate {
    /** Item identifier (name for most categories, id for spells) */
    name: string;
    /** Icon URL (small image for lists/compact views) */
    icon?: string;
    /** Image URL (full-size image for detail views) */
    image?: string;
}

/**
 * Updates for a single category
 */
export interface BatchImageCategoryUpdates {
    updates: BatchImageItemUpdate[];
}

/**
 * Full storage structure for batch image updates
 */
export interface BatchImageStorage {
    /** Schema version for future migrations */
    version: string;
    /** Last update timestamp */
    updatedAt: number;
    /** Updates per category */
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
 * It stores the items that have icon/image updates for later restoration.
 *
 * @param category - The category that was updated
 * @param items - Array of items with their icon/image values (only items with images should be included)
 */
export function saveBatchImageUpdates(
    category: BatchImageCategory,
    items: BatchImageItemUpdate[]
): void {
    if (!items || items.length === 0) {
        logger.debug('BatchImagePersistence', 'No items to save, skipping');
        return;
    }

    const storage = getStorage();

    // Merge with existing updates for this category
    const existingUpdates = storage.categories[category]?.updates || [];
    const updateMap = new Map<string, BatchImageItemUpdate>();

    // Add existing updates to map
    for (const update of existingUpdates) {
        updateMap.set(update.name, update);
    }

    // Add/merge new updates
    for (const update of items) {
        const existing = updateMap.get(update.name);
        if (existing) {
            // Merge: new values override existing
            if (update.icon !== undefined) existing.icon = update.icon;
            if (update.image !== undefined) existing.image = update.image;
        } else {
            updateMap.set(update.name, { ...update });
        }
    }

    // Store merged updates
    storage.categories[category] = {
        updates: Array.from(updateMap.values())
    };

    saveStorage(storage);

    logger.info('BatchImagePersistence', `Saved ${items.length} image updates for ${category}`);
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
 * It re-applies all saved image updates to make them available in the current session.
 *
 * @returns Number of categories restored
 */
export function restoreBatchImageUpdates(): number {
    const storage = loadBatchImageUpdates();
    if (!storage || Object.keys(storage.categories).length === 0) {
        logger.debug('BatchImagePersistence', 'No saved updates to restore');
        return 0;
    }

    const manager = ExtensionManager.getInstance();
    let restoredCategories = 0;
    let totalItems = 0;

    for (const [category, data] of Object.entries(storage.categories)) {
        if (!data.updates || data.updates.length === 0) {
            continue;
        }

        try {
            // Get current items from ExtensionManager
            const currentItems = manager.get(category as any);
            if (!currentItems || currentItems.length === 0) {
                logger.debug('BatchImagePersistence', `No items in category ${category}, skipping restore`);
                continue;
            }

            // Build a map of item names to their saved image updates
            const updateMap = new Map<string, BatchImageItemUpdate>();
            for (const update of data.updates) {
                updateMap.set(update.name, update);
            }

            // Apply updates to matching items
            const updatedItems: any[] = [];
            let updatedCount = 0;

            for (const item of currentItems) {
                const itemKey = item.name || item.id;
                const savedUpdate = updateMap.get(itemKey);

                if (savedUpdate) {
                    // Apply saved icon/image to this item
                    const updatedItem = { ...item };
                    if (savedUpdate.icon !== undefined) {
                        updatedItem.icon = savedUpdate.icon;
                    }
                    if (savedUpdate.image !== undefined) {
                        updatedItem.image = savedUpdate.image;
                    }
                    updatedItems.push(updatedItem);
                    updatedCount++;
                } else {
                    // Keep item as-is
                    updatedItems.push(item);
                }
            }

            if (updatedCount > 0) {
                // Store updated items back in ExtensionManager
                manager.extensions.set(category as any, {
                    items: updatedItems,
                    options: { mode: 'replace' },
                    registeredAt: Date.now()
                });

                // Invalidate cache for this category
                manager.invalidateRegistryCache(category as any);

                restoredCategories++;
                totalItems += updatedCount;
                logger.info('BatchImagePersistence', `Restored ${updatedCount} image updates for ${category}`);
            }
        } catch (error) {
            logger.warn('BatchImagePersistence', `Failed to restore updates for ${category}`, { error: String(error) });
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

    if (totalItems > 0) {
        logger.info('BatchImagePersistence', `Restored ${totalItems} image updates across ${restoredCategories} categories`);
    }

    return restoredCategories;
}

/**
 * Get count of saved updates per category
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
        counts[category] = data.updates?.length || 0;
    }
    return counts;
}
