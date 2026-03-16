import { useState, useCallback, useMemo, useEffect } from 'react';
import { ExtensionManager } from 'playlist-data-engine';
import { logger } from '@/utils/logger';
import { useDataViewerStore } from '@/store/dataViewerStore';
import type { SpawnMode } from './useSpawnMode';
import {
    validateContent,
    type ContentCategory,
    type ContentItem as ValidatedContentItem
} from '@/utils/contentValidation';

/**
 * Storage key for persisting custom content to localStorage
 */
const CUSTOM_CONTENT_STORAGE_KEY = 'playlist-data-showcase:custom-content';

/**
 * Module-level custom content cache for persistence.
 * This ensures all hook instances share the same persisted state.
 * Note: Some categories (races, classes) store strings, others store objects.
 */
let customContentCache: Partial<Record<ContentType, (ContentItem | string)[]>> = {};
let isCacheLoaded = false;
let isContentRestored = false;

/**
 * Load custom content from localStorage (module-level)
 */
function loadCustomContentFromStorage(): Partial<Record<ContentType, ContentItem[]>> {
    try {
        const stored = localStorage.getItem(CUSTOM_CONTENT_STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && typeof parsed === 'object') {
                const categoryCounts = Object.entries(parsed).map(([cat, items]: [string, any]) => `${cat}:${Array.isArray(items) ? items.length : 0}`);
                logger.debug('ContentCreator', `Loaded from localStorage: ${categoryCounts.join(', ')}`);
                return parsed;
            }
        } else {
            logger.debug('ContentCreator', 'No custom content found in localStorage');
        }
    } catch (error) {
        logger.warn('ContentCreator', 'Failed to load custom content from localStorage', error);
    }
    return {};
}

/**
 * Save custom content to localStorage (module-level)
 */
function saveCustomContentToStorage(): void {
    try {
        const categoryCounts = Object.entries(customContentCache).map(([cat, items]) => `${cat}:${items?.length ?? 0}`);
        logger.debug('ContentCreator', `Saving to localStorage: ${categoryCounts.join(', ')}`);
        localStorage.setItem(CUSTOM_CONTENT_STORAGE_KEY, JSON.stringify(customContentCache));
    } catch (error) {
        logger.warn('ContentCreator', 'Failed to save custom content to localStorage', error);
    }
}

/**
 * Add an item to the custom content cache and persist
 * Only adds items that are marked as custom (source === 'custom') or strings (for string categories)
 */
function addToCustomContentCache(category: ContentType, item: ContentItem | string): void {
    // For string categories (races, classes), strings are valid
    if (typeof item === 'string') {
        if (!customContentCache[category]) {
            customContentCache[category] = [];
        }
        customContentCache[category]!.push(item);
        saveCustomContentToStorage();
        return;
    }

    // For object categories, only cache if marked as custom
    const itemObj = item as any;
    if (itemObj?.source === 'custom') {
        if (!customContentCache[category]) {
            customContentCache[category] = [];
        }
        customContentCache[category]!.push(item);
        saveCustomContentToStorage();
    } else {
        logger.warn('ContentCreator', `Refusing to cache non-custom item: ${itemObj?.name || 'unknown'}`);
    }
}

/**
 * Add multiple items to the custom content cache and persist
 * Only adds items that are marked as custom (source === 'custom') or strings (for string categories)
 */
function addMultipleToCustomContentCache(category: ContentType, items: (ContentItem | string)[]): void {
    // Filter to only custom items
    const customItems = items.filter(item => {
        if (typeof item === 'string') return true;
        return (item as any)?.source === 'custom';
    });

    if (customItems.length === 0) return;

    if (!customContentCache[category]) {
        customContentCache[category] = [];
    }
    customContentCache[category]!.push(...customItems);
    saveCustomContentToStorage();
}

/**
 * Update the custom content cache for a category and persist
 */
function updateCustomContentCache(category: ContentType, items: (ContentItem | string)[]): void {
    customContentCache[category] = items;
    saveCustomContentToStorage();
}

/**
 * Clear the custom content cache for a specific category and persist
 * This is called when a category is reset to remove custom items from localStorage
 */
function clearCustomContentForCategory(category: ContentType): void {
    if (customContentCache[category]) {
        delete customContentCache[category];
        saveCustomContentToStorage();
        logger.info('ContentCreator', `Cleared custom content cache for ${category}`);
    }
}

/**
 * Clear all custom content from the cache and persist
 * This is called when resetting all categories
 */
function clearAllCustomContent(): void {
    customContentCache = {};
    saveCustomContentToStorage();
    logger.info('ContentCreator', 'Cleared all custom content cache');
}

/**
 * Initialize the cache from localStorage (called once at module load)
 */
function initializeCache(): void {
    if (!isCacheLoaded) {
        customContentCache = loadCustomContentFromStorage();
        isCacheLoaded = true;
    }
}

// Initialize cache when module loads
initializeCache();

/**
 * Content types that can be created through the ExtensionManager.
 * Maps to the various extension categories.
 */
export type ContentType =
    | 'equipment'
    | 'equipment.templates'
    | 'appearance.bodyTypes'
    | 'appearance.skinTones'
    | 'appearance.hairColors'
    | 'appearance.hairStyles'
    | 'appearance.eyeColors'
    | 'appearance.facialFeatures'
    | 'spells'
    | 'races'
    | 'races.data'
    | 'classes'
    | 'classes.data'
    | 'classFeatures'
    | 'racialTraits'
    | 'skills'
    | 'skillLists'
    | 'classSpellLists'
    | 'classSpellSlots'
    | 'classStartingEquipment';

/**
 * Categories that store items as strings (not objects).
 * These categories don't have name/id properties - the item IS the string.
 */
const STRING_BASED_CATEGORIES: ContentType[] = [
    'races',
    'classes',
    'appearance.bodyTypes',
    'appearance.skinTones',
    'appearance.hairColors',
    'appearance.hairStyles',
    'appearance.eyeColors',
    'appearance.facialFeatures'
];

/**
 * Check if a category stores items as strings.
 */
function isStringBasedCategory(category: ContentType): boolean {
    return STRING_BASED_CATEGORIES.includes(category);
}

/**
 * Generic content item type - represents any content that can be registered.
 * Uses a permissive type to accept various structured objects (Equipment, Spell, etc.)
 * while still allowing generic type inference for return types.
 */
export type ContentItem = { [key: string]: any };

/**
 * Validation result for content items.
 */
export interface ContentValidationResult {
    /** Whether the content is valid */
    valid: boolean;
    /** Array of validation error messages */
    errors: string[];
    /** Array of validation warnings (non-blocking issues) */
    warnings?: string[];
}

/**
 * Result of a content creation operation.
 */
export interface ContentCreationResult<T extends ContentItem | string = ContentItem> {
    /** Whether the operation was successful */
    success: boolean;
    /** Success message */
    message?: string;
    /** Error message if failed */
    error?: string;
    /** The created content item (if successful) */
    item?: T;
    /** The category the item was registered to */
    category?: ContentType;
}

/**
 * Result of a batch content creation operation.
 */
export interface BatchContentCreationResult<T extends ContentItem = ContentItem> {
    /** Whether the operation was successful */
    success: boolean;
    /** Success message */
    message?: string;
    /** Error message if failed */
    error?: string;
    /** The created content items (if successful) */
    items?: T[];
    /** The category the items were registered to */
    category?: ContentType;
}

/**
 * Options for content registration.
 */
export interface ContentRegistrationOptions {
    /** Spawn mode for this content */
    mode?: SpawnMode;
    /** Custom spawn weights */
    weights?: Record<string, number>;
    /** Whether to validate before registering (default: true) */
    validate?: boolean;
    /** Whether to mark source as 'custom' (default: true) */
    markAsCustom?: boolean;
}

/**
 * Callback functions for content creation events.
 */
export interface ContentCreatorCallbacks<T extends ContentItem | string = ContentItem> {
    /** Called when content is successfully created and registered */
    onSuccess?: (item: T, category: ContentType) => void;
    /** Called when content creation fails */
    onError?: (error: string, category: ContentType) => void;
    /** Called when validation fails */
    onValidationFailed?: (errors: string[], warnings: string[]) => void;
}

/**
 * Interface for the useContentCreator hook return value.
 */
export interface UseContentCreatorReturn {
    /** Whether an operation is in progress */
    isLoading: boolean;
    /** Last error that occurred */
    lastError: string | null;
    /** Last created item */
    lastCreatedItem: ContentItem | null;
    /** Category of the last created item */
    lastCreatedCategory: ContentType | null;

    /**
     * Validate content before registration.
     * @param category - The category to validate for
     * @param item - The item to validate
     * @returns Validation result with any errors
     */
    validateContent: (category: ContentType, item: ContentItem) => ContentValidationResult;

    /**
     * Create and register content in one operation.
     * @param category - The category to register to
     * @param item - The item to create (object for most categories, string for appearance/races/classes)
     * @param options - Registration options
     * @param callbacks - Optional callbacks for success/error
     * @returns Creation result
     */
    createContent: <T extends ContentItem | string = ContentItem>(
        category: ContentType,
        item: T,
        options?: ContentRegistrationOptions,
        callbacks?: ContentCreatorCallbacks<T>
    ) => ContentCreationResult<T>;

    /**
     * Create and register multiple items at once.
     * @param category - The category to register to
     * @param items - The items to create
     * @param options - Registration options
     * @returns Creation result with count of created items
     */
    createMultiple: <T extends ContentItem>(
        category: ContentType,
        items: T[],
        options?: ContentRegistrationOptions
    ) => BatchContentCreationResult<T>;

    /**
     * Update an existing custom item.
     * @param category - The category the item belongs to
     * @param itemName - Name/ID of the item to update
     * @param updates - Partial updates to apply
     * @param options - Registration options
     * @returns Update result
     */
    updateContent: <T extends ContentItem>(
        category: ContentType,
        itemName: string,
        updates: Partial<T>,
        options?: ContentRegistrationOptions
    ) => ContentCreationResult<T>;

    /**
     * Delete a custom item from a category.
     * @param category - The category to delete from
     * @param itemName - Name/ID of the item to delete
     * @returns Deletion result
     */
    deleteContent: (category: ContentType, itemName: string) => ContentCreationResult;

    /**
     * Duplicate an existing item.
     * @param category - The category the item belongs to
     * @param itemName - Name/ID of the item to duplicate
     * @param newName - Name for the duplicated item
     * @returns Creation result with the duplicated item
     */
    duplicateContent: <T extends ContentItem>(
        category: ContentType,
        itemName: string,
        newName: string
    ) => ContentCreationResult<T>;

    /**
     * Check if an item with the given name exists in the category.
     * @param category - The category to check
     * @param itemName - Name/ID to check
     * @returns true if item exists
     */
    itemExists: (category: ContentType, itemName: string) => boolean;

    /**
     * Get all custom items from a category.
     * @param category - The category to get items from
     * @returns Array of custom items
     */
    getCustomItems: (category: ContentType) => ContentItem[];

    /**
     * Clear the last error.
     */
    clearError: () => void;

    /**
     * Clear the last created item.
     */
    clearLastCreated: () => void;
}

/**
 * Validate content structure for a specific category.
 * Delegates to the centralized contentValidation utility.
 * Returns validation result with any errors found.
 */
function validateContentForCategory(category: ContentType, item: ContentItem | string): ContentValidationResult {
    // For string-based categories (appearance, races, classes), strings are valid
    if (typeof item === 'string') {
        // Basic validation for strings
        if (item.trim().length === 0) {
            return {
                valid: false,
                errors: ['Value cannot be empty'],
                warnings: []
            };
        }
        return { valid: true, errors: [], warnings: [] };
    }

    // Use the centralized validation utility with reference and business rule validation enabled
    const result = validateContent(category as ContentCategory, item as ValidatedContentItem, {
        validateReferences: true,
        validateBusinessRules: true
    });

    return {
        valid: result.valid,
        errors: result.errors,
        warnings: result.warnings
    };
}

/**
 * Mark an item as custom by adding source: 'custom'.
 * For string items, returns the string as-is (strings don't need marking).
 */
function markAsCustom(item: ContentItem | string): ContentItem | string {
    // Strings don't need to be marked as custom - they're inherently custom
    if (typeof item === 'string') {
        return item;
    }
    // For objects, add source: 'custom'
    return {
        ...item,
        source: 'custom'
    };
}

/**
 * React hook for creating, editing, and managing custom content for all ExtensionManager categories.
 *
 * This hook provides a generic interface for content creation with:
 * - Automatic validation per category type
 * - Integration with ExtensionManager.register()
 * - Error handling and success callbacks
 * - Support for all category types
 *
 * @example
 * ```tsx
 * const {
 *   isLoading,
 *   createContent,
 *   validateContent,
 *   itemExists
 * } = useContentCreator();
 *
 * // Create a custom spell
 * const result = await createContent(
 *   'spells',
 *   {
 *     name: 'Fireball Plus',
 *     level: 4,
 *     school: 'Evocation',
 *     casting_time: '1 action',
 *     range: '150 feet',
 *     duration: 'Instantaneous',
 *     components: ['V', 'S', 'M'],
 *     description: 'A more powerful fireball...'
 *   },
 *   { mode: 'relative' },
 *   {
 *     onSuccess: (item) => console.log('Created:', item.name),
 *     onError: (error) => console.error('Failed:', error)
 *   }
 * );
 *
 * // Check if item exists
 * if (itemExists('spells', 'Fireball Plus')) {
 *   console.log('Spell already exists');
 * }
 * ```
 *
 * @returns {UseContentCreatorReturn} Hook return object with content creation functions
 */
export const useContentCreator = (): UseContentCreatorReturn => {
    const [isLoading, setIsLoading] = useState(false);
    const [lastError, setLastError] = useState<string | null>(null);
    const [lastCreatedItem, setLastCreatedItem] = useState<ContentItem | null>(null);
    const [lastCreatedCategory, setLastCreatedCategory] = useState<ContentType | null>(null);

    // Get store for notifications
    const { notifyDataChanged } = useDataViewerStore();

    // Get ExtensionManager instance
    const manager = useMemo(() => ExtensionManager.getInstance(), []);

    // Restore persisted custom content into ExtensionManager on first mount only
    useEffect(() => {
        if (isContentRestored) return;

        const categories = Object.keys(customContentCache) as ContentType[];
        logger.debug('ContentCreator', `Restoration check: ${categories.length} categories in cache`, { categories });

        let hasRestoredContent = false;

        categories.forEach(category => {
            const items = customContentCache[category];
            if (items && items.length > 0) {
                logger.debug('ContentCreator', `Attempting to restore ${items.length} items for category ${category}`);

                // Filter to only custom items (have source: 'custom') and don't already exist
                // This prevents restoring default/magic items that were incorrectly cached
                const existingItems = manager.get(category as any);

                // For string categories, build a Set of existing string values directly
                // For object categories, build Sets of name and id properties
                const isStringCategory = isStringBasedCategory(category);
                const existingStrings = isStringCategory
                    ? new Set(existingItems.filter((item: any) => typeof item === 'string'))
                    : new Set<string>();
                const existingNames = new Set(existingItems.map((item: any) => item?.name).filter(Boolean));
                const existingIds = new Set(existingItems.map((item: any) => item?.id).filter(Boolean));

                const itemsToRestore = items.filter(item => {
                    if (typeof item === 'string') {
                        // String categories (appearance, races, classes) - check if not already existing
                        // Use existingStrings for string categories, existingNames for object categories
                        return isStringCategory
                            ? !existingStrings.has(item)
                            : !existingNames.has(item);
                    }
                    const itemObj = item as any;
                    const name = itemObj?.name;
                    const id = itemObj?.id;
                    const source = itemObj?.source;

                    // For object categories, only restore if:
                    // 1. Item is marked as custom (source === 'custom')
                    // 2. AND doesn't already exist by name or id
                    const isCustom = source === 'custom';
                    const alreadyExists = existingNames.has(name) || existingIds.has(id);

                    if (!isCustom) {
                        logger.debug('ContentCreator', `Skipping non-custom item: ${name}`);
                    }

                    return isCustom && !alreadyExists;
                });

                if (itemsToRestore.length > 0) {
                    try {
                        manager.register(category as any, itemsToRestore, { validate: false });
                        logger.info('ContentCreator', `Restored ${itemsToRestore.length} persisted ${category} items from localStorage`);
                        hasRestoredContent = true;
                    } catch (error) {
                        logger.warn('ContentCreator', `Failed to restore ${category} items from localStorage`, error);
                    }
                } else {
                    logger.debug('ContentCreator', `No custom ${category} items to restore`);
                }

                // Clean up the cache to only include custom items that were restored
                // This removes any non-custom items that were incorrectly cached
                if (itemsToRestore.length !== items.length) {
                    logger.debug('ContentCreator', `Cleaning up ${category} cache: ${items.length} -> ${itemsToRestore.length} items`);
                    updateCustomContentCache(category, itemsToRestore);
                }
            }
        });

        isContentRestored = true;

        // Notify useDataViewer to refresh its data if we restored any content
        if (hasRestoredContent) {
            logger.debug('ContentCreator', 'Notifying data change after restoration');
            notifyDataChanged();
        }
    }, [manager, notifyDataChanged]);

    /**
     * Validate content before registration.
     */
    const validateContent = useCallback((category: ContentType, item: ContentItem): ContentValidationResult => {
        return validateContentForCategory(category, item);
    }, []);

    /**
     * Create and register content in one operation.
     */
    const createContent = useCallback(<T extends ContentItem | string = ContentItem>(
        category: ContentType,
        item: T,
        options: ContentRegistrationOptions = {},
        callbacks: ContentCreatorCallbacks<T> = {}
    ): ContentCreationResult<T> => {
        const {
            validate = true,
            markAsCustom: shouldMarkAsCustom = true,
            // mode is intentionally not used during registration - it's a display/generation setting
            // that should only affect filtering via getFilteredItems(), not data storage
            weights
        } = options;
        const {
            onSuccess,
            onError,
            onValidationFailed
        } = callbacks;

        setIsLoading(true);
        setLastError(null);

        try {
            // Validate if requested (skip for strings)
            if (validate && typeof item !== 'string') {
                const validation = validateContentForCategory(category, item as ContentItem);
                if (!validation.valid) {
                    const errorMsg = `Validation failed: ${validation.errors.join(', ')}`;
                    setLastError(errorMsg);
                    onValidationFailed?.(validation.errors, validation.warnings || []);
                    logger.warn('ContentCreator', `Validation failed for ${category}`, validation.errors);
                    return {
                        success: false,
                        error: errorMsg,
                        category
                    };
                }
                if (validation.warnings && validation.warnings.length > 0) {
                    logger.debug('ContentCreator', `Validation warnings for ${category}`, validation.warnings);
                }
            }

            // For string items, validate and check for duplicates
            if (typeof item === 'string') {
                // Basic string validation
                if (item.trim().length === 0) {
                    const errorMsg = 'Value cannot be empty';
                    setLastError(errorMsg);
                    onValidationFailed?.([errorMsg], []);
                    logger.warn('ContentCreator', `Empty string for ${category}`);
                    return {
                        success: false,
                        error: errorMsg,
                        category
                    };
                }

                // Check for duplicates directly using manager.get()
                const existingItems = manager.get(category as any);
                if (isStringBasedCategory(category)) {
                    // For string categories, check if string already exists
                    if (existingItems.some((existing: any) => existing === item)) {
                        const errorMsg = `Item "${item}" already exists in ${category}`;
                        setLastError(errorMsg);
                        onValidationFailed?.([errorMsg], []);
                        logger.warn('ContentCreator', `Duplicate item for ${category}: ${item}`);
                        return {
                            success: false,
                            error: errorMsg,
                            category
                        };
                    }
                }
            }

            // Mark as custom if requested (only for objects, strings are stored as-is)
            const itemToRegister = (shouldMarkAsCustom && typeof item !== 'string')
                ? markAsCustom(item as ContentItem)
                : item;

            // Build registration options
            // NOTE: We intentionally do NOT pass 'mode' during registration.
            // The mode is a display/generation setting stored separately via useSpawnMode,
            // and should only affect filtering (via getFilteredItems) and procedural generation weights.
            // Passing mode='absolute' during registration was causing the ExtensionManager to
            // incorrectly treat it like mode='replace' and clear all previous custom items.
            const registerOptions: { validate: boolean; weights?: Record<string, number> } = {
                validate: false // We already validated above
            };
            if (weights) {
                registerOptions.weights = weights;
            }

            // Register with ExtensionManager
            manager.register(category as any, [itemToRegister] as any[], registerOptions);

            // Update state
            if (typeof itemToRegister !== 'string') {
                setLastCreatedItem(itemToRegister as ContentItem);
            }
            setLastCreatedCategory(category);

            // Update custom content cache for localStorage persistence
            addToCustomContentCache(category, itemToRegister);

            // Log success
            const itemName = typeof itemToRegister === 'string'
                ? itemToRegister
                : ((itemToRegister as ContentItem).name || (itemToRegister as ContentItem).id || 'unknown');
            logger.info('ContentCreator', `Created ${category} item: ${itemName}`);

            // Notify data change
            notifyDataChanged();

            // Call success callback
            onSuccess?.(itemToRegister as T, category);

            return {
                success: true,
                message: `Created ${itemName} in ${category}`,
                item: itemToRegister as T,
                category
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            setLastError(errorMessage);
            logger.error('ContentCreator', `Failed to create ${category} item`, errorMessage);
            onError?.(errorMessage, category);

            return {
                success: false,
                error: errorMessage,
                category
            };
        } finally {
            setIsLoading(false);
        }
    }, [manager, notifyDataChanged]);

    /**
     * Create and register multiple items at once.
     */
    const createMultiple = useCallback(<T extends ContentItem>(
        category: ContentType,
        items: T[],
        options: ContentRegistrationOptions = {}
    ): BatchContentCreationResult<T> => {
        const {
            validate = true,
            markAsCustom: shouldMarkAsCustom = true,
            // mode is intentionally not used during registration - it's a display/generation setting
            weights
        } = options;

        setIsLoading(true);
        setLastError(null);

        try {
            // Validate all items if requested
            if (validate) {
                const allErrors: string[] = [];
                items.forEach((item, index) => {
                    const validation = validateContentForCategory(category, item);
                    if (!validation.valid) {
                        validation.errors.forEach(err => {
                            allErrors.push(`Item ${index + 1}: ${err}`);
                        });
                    }
                });

                if (allErrors.length > 0) {
                    const errorMsg = `Validation failed for ${allErrors.length} items`;
                    setLastError(errorMsg);
                    logger.warn('ContentCreator', errorMsg, allErrors);
                    return {
                        success: false,
                        error: errorMsg,
                        category
                    };
                }
            }

            // Mark all items as custom if requested
            const itemsToRegister = (shouldMarkAsCustom
                ? items.map(markAsCustom)
                : items) as T[];

            // Build registration options
            // NOTE: We intentionally do NOT pass 'mode' during registration.
            // The mode is a display/generation setting stored separately via useSpawnMode,
            // and should only affect filtering (via getFilteredItems) and procedural generation weights.
            const registerOptions: { validate: boolean; weights?: Record<string, number> } = {
                validate: false
            };
            if (weights) {
                registerOptions.weights = weights;
            }

            // Register with ExtensionManager
            manager.register(category as any, itemsToRegister, registerOptions);

            // Update custom content cache for localStorage persistence
            addMultipleToCustomContentCache(category, itemsToRegister);

            // Log success
            logger.info('ContentCreator', `Created ${itemsToRegister.length} items in ${category}`);

            // Notify data change
            notifyDataChanged();

            return {
                success: true,
                message: `Created ${itemsToRegister.length} items in ${category}`,
                items: itemsToRegister,
                category
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            setLastError(errorMessage);
            logger.error('ContentCreator', `Failed to create items in ${category}`, errorMessage);

            return {
                success: false,
                error: errorMessage,
                category
            };
        } finally {
            setIsLoading(false);
        }
    }, [manager, notifyDataChanged]);

    /**
     * Update an existing custom item.
     */
    const updateContent = useCallback(<T extends ContentItem>(
        category: ContentType,
        itemName: string,
        updates: Partial<T>,
        options: ContentRegistrationOptions = {}
    ): ContentCreationResult<T> => {
        setIsLoading(true);
        setLastError(null);

        try {
            // Get existing custom items
            const existingItems = manager.getCustom(category as any) as T[];
            const existingIndex = existingItems.findIndex(
                (item: any) => item.name === itemName || item.id === itemName || item.race === itemName
            );

            if (existingIndex === -1) {
                const errorMsg = `Item "${itemName}" not found in ${category}`;
                setLastError(errorMsg);
                logger.warn('ContentCreator', errorMsg);
                return {
                    success: false,
                    error: errorMsg,
                    category
                };
            }

            // Merge updates
            const updatedItem = {
                ...existingItems[existingIndex],
                ...updates,
                source: 'custom' // Ensure it remains marked as custom
            };

            // Validate if requested
            if (options.validate !== false) {
                const validation = validateContentForCategory(category, updatedItem);
                if (!validation.valid) {
                    const errorMsg = `Validation failed: ${validation.errors.join(', ')}`;
                    setLastError(errorMsg);
                    logger.warn('ContentCreator', errorMsg);
                    return {
                        success: false,
                        error: errorMsg,
                        category
                    };
                }
            }

            // Remove old item and add updated one
            const newItems = existingItems.filter(
                (item: any) => item.name !== itemName && item.id !== itemName && item.race !== itemName
            );
            newItems.push(updatedItem);

            // Preserve spawn mode before reset (manager.reset() clears spawn mode in ExtensionManager)
            const savedMode = manager.getMode(category as any);

            // Re-register all custom items (this is how ExtensionManager works)
            // First reset, then re-register
            manager.reset(category as any);
            manager.register(category as any, newItems, { validate: false });

            // Restore spawn mode after reset
            if (savedMode) {
                manager.setMode(category as any, savedMode as any);
            }

            // Update custom content cache for localStorage persistence
            updateCustomContentCache(category, newItems);

            logger.info('ContentCreator', `Updated ${category} item: ${itemName}`);
            notifyDataChanged();

            return {
                success: true,
                message: `Updated ${itemName} in ${category}`,
                item: updatedItem,
                category
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            setLastError(errorMessage);
            logger.error('ContentCreator', `Failed to update ${category} item`, errorMessage);

            return {
                success: false,
                error: errorMessage,
                category
            };
        } finally {
            setIsLoading(false);
        }
    }, [manager, notifyDataChanged]);

    /**
     * Delete a custom item from a category.
     */
    const deleteContent = useCallback((category: ContentType, itemName: string): ContentCreationResult => {
        setIsLoading(true);
        setLastError(null);

        try {
            // String categories store items as strings (race/class names AND appearance options)
            if (isStringBasedCategory(category)) {
                // For string categories, items are strings, not objects
                const existingItems = manager.getCustom(category as any) as string[];
                const itemExists = existingItems.includes(itemName);

                if (!itemExists) {
                    const errorMsg = `Item "${itemName}" not found in ${category}`;
                    setLastError(errorMsg);
                    logger.warn('ContentCreator', errorMsg);
                    return {
                        success: false,
                        error: errorMsg,
                        category
                    };
                }

                // Filter out the deleted item (string comparison)
                const remainingItems = existingItems.filter(item => item !== itemName);

                // Preserve spawn mode before reset (manager.reset() clears spawn mode in ExtensionManager)
                const savedMode = manager.getMode(category as any);

                // Re-register remaining items
                manager.reset(category as any);
                if (remainingItems.length > 0) {
                    manager.register(category as any, remainingItems, { validate: false });
                }

                // Restore spawn mode after reset
                if (savedMode) {
                    manager.setMode(category as any, savedMode as any);
                }

                // Also delete from the corresponding .data category
                const dataCategory = `${category}.data` as ContentType;
                const existingDataItems = manager.getCustom(dataCategory as any) as ContentItem[];
                const remainingDataItems = existingDataItems.filter(
                    (item: any) => item.race !== itemName && item.name !== itemName && item.id !== itemName
                );

                manager.reset(dataCategory as any);
                if (remainingDataItems.length > 0) {
                    manager.register(dataCategory as any, remainingDataItems, { validate: false });
                }

                // Update custom content cache for localStorage persistence
                updateCustomContentCache(category, remainingItems);
                updateCustomContentCache(dataCategory, remainingDataItems);

                logger.info('ContentCreator', `Deleted ${category} item: ${itemName}`);
                notifyDataChanged();

                return {
                    success: true,
                    message: `Deleted ${itemName} from ${category}`,
                    category
                };
            }

            // For object categories, use name/id comparison
            // Get existing custom items
            const existingItems = manager.getCustom(category as any) as ContentItem[];
            const itemToDelete = existingItems.find(
                (item: any) => item.name === itemName || item.id === itemName
            );

            if (!itemToDelete) {
                const errorMsg = `Item "${itemName}" not found in ${category}`;
                setLastError(errorMsg);
                logger.warn('ContentCreator', errorMsg);
                return {
                    success: false,
                    error: errorMsg,
                    category
                };
            }

            // Filter out the deleted item
            const remainingItems = existingItems.filter(
                (item: any) => item.name !== itemName && item.id !== itemName
            );

            // Preserve spawn mode before reset (manager.reset() clears spawn mode in ExtensionManager)
            const savedMode = manager.getMode(category as any);

            // Re-register remaining items
            manager.reset(category as any);
            if (remainingItems.length > 0) {
                manager.register(category as any, remainingItems, { validate: false });
            }

            // Restore spawn mode after reset
            if (savedMode) {
                manager.setMode(category as any, savedMode as any);
            }

            // Update custom content cache for localStorage persistence
            updateCustomContentCache(category, remainingItems);

            logger.info('ContentCreator', `Deleted ${category} item: ${itemName}`);
            notifyDataChanged();

            return {
                success: true,
                message: `Deleted ${itemName} from ${category}`,
                category
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            setLastError(errorMessage);
            logger.error('ContentCreator', `Failed to delete ${category} item`, errorMessage);

            return {
                success: false,
                error: errorMessage,
                category
            };
        } finally {
            setIsLoading(false);
        }
    }, [manager, notifyDataChanged]);

    /**
     * Duplicate an existing item.
     */
    const duplicateContent = useCallback(<T extends ContentItem>(
        category: ContentType,
        itemName: string,
        newName: string
    ): ContentCreationResult<T> => {
        setIsLoading(true);
        setLastError(null);

        try {
            // Get all items (including defaults)
            const allItems = manager.get(category as any) as T[];
            const originalItem = allItems.find(
                (item: any) => item.name === itemName || item.id === itemName
            );

            if (!originalItem) {
                const errorMsg = `Item "${itemName}" not found in ${category}`;
                setLastError(errorMsg);
                logger.warn('ContentCreator', errorMsg);
                return {
                    success: false,
                    error: errorMsg,
                    category
                };
            }

            // Check if new name already exists
            const nameExists = allItems.some(
                (item: any) => item.name === newName || item.id === newName
            );
            if (nameExists) {
                const errorMsg = `Item "${newName}" already exists in ${category}`;
                setLastError(errorMsg);
                logger.warn('ContentCreator', errorMsg);
                return {
                    success: false,
                    error: errorMsg,
                    category
                };
            }

            // Create duplicate with new name
            const duplicatedItem: T = {
                ...originalItem,
                name: (originalItem as any).name ? newName : (originalItem as any).name,
                id: (originalItem as any).id ? newName.toLowerCase().replace(/\s+/g, '_') : (originalItem as any).id,
                source: 'custom'
            };

            // Register the duplicate
            manager.register(category as any, [duplicatedItem], { validate: false });

            // Update custom content cache for localStorage persistence
            addToCustomContentCache(category, duplicatedItem);

            logger.info('ContentCreator', `Duplicated ${category} item: ${itemName} -> ${newName}`);
            notifyDataChanged();

            return {
                success: true,
                message: `Duplicated ${itemName} as ${newName}`,
                item: duplicatedItem,
                category
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            setLastError(errorMessage);
            logger.error('ContentCreator', `Failed to duplicate ${category} item`, errorMessage);

            return {
                success: false,
                error: errorMessage,
                category
            };
        } finally {
            setIsLoading(false);
        }
    }, [manager, notifyDataChanged]);

    /**
     * Check if an item with the given name exists in the category.
     * For string-based categories (appearance, races, classes), compares directly.
     * For object categories, checks name or id properties.
     */
    const itemExists = useCallback((category: ContentType, itemName: string): boolean => {
        try {
            const items = manager.get(category as any);

            // Handle string-based categories (appearance, races, classes)
            if (isStringBasedCategory(category)) {
                const stringItems = items as string[];
                return stringItems.some(item => item === itemName);
            }

            // Handle object categories - check name or id
            const objectItems = items as ContentItem[];
            return objectItems.some(
                (item: any) => item.name === itemName || item.id === itemName
            );
        } catch {
            return false;
        }
    }, [manager]);

    /**
     * Get all custom items from a category.
     */
    const getCustomItems = useCallback((category: ContentType): ContentItem[] => {
        try {
            return manager.getCustom(category as any) as ContentItem[];
        } catch {
            return [];
        }
    }, [manager]);

    /**
     * Clear the last error.
     */
    const clearError = useCallback(() => {
        setLastError(null);
    }, []);

    /**
     * Clear the last created item.
     */
    const clearLastCreated = useCallback(() => {
        setLastCreatedItem(null);
        setLastCreatedCategory(null);
    }, []);

    return {
        isLoading,
        lastError,
        lastCreatedItem,
        lastCreatedCategory,
        validateContent,
        createContent,
        createMultiple,
        updateContent,
        deleteContent,
        duplicateContent,
        itemExists,
        getCustomItems,
        clearError,
        clearLastCreated
    };
};

/**
 * Export the clear functions for use by other modules (e.g., useSpawnMode)
 * This allows external code to clear the custom content cache when resetting categories
 */
export { clearCustomContentForCategory, clearAllCustomContent };
