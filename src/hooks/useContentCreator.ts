import { useState, useCallback, useMemo } from 'react';
import { ExtensionManager } from 'playlist-data-engine';
import { logger } from '@/utils/logger';
import { useDataViewerStore } from '@/store/dataViewerStore';
import type { SpawnMode } from './useSpawnMode';

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
 * Generic content item type - represents any content that can be registered.
 */
export type ContentItem = Record<string, unknown>;

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
export interface ContentCreationResult<T extends ContentItem = ContentItem> {
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
export interface ContentCreatorCallbacks<T extends ContentItem = ContentItem> {
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
     * @param item - The item to create
     * @param options - Registration options
     * @param callbacks - Optional callbacks for success/error
     * @returns Creation result
     */
    createContent: <T extends ContentItem>(
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
 * Returns validation result with any errors found.
 */
function validateContentForCategory(category: ContentType, item: ContentItem): ContentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Common validation for all categories
    if (!item || typeof item !== 'object') {
        errors.push('Item must be an object');
        return { valid: false, errors, warnings };
    }

    // Category-specific validation
    switch (category) {
        case 'equipment':
        case 'equipment.templates':
            // Equipment requires: name, type, rarity, weight
            if (!item.name || typeof item.name !== 'string') {
                errors.push('Equipment must have a valid "name" string');
            }
            if (!['weapon', 'armor', 'item'].includes(item.type as string)) {
                errors.push('Equipment "type" must be "weapon", "armor", or "item"');
            }
            if (!['common', 'uncommon', 'rare', 'very_rare', 'legendary'].includes(item.rarity as string)) {
                errors.push('Equipment "rarity" must be a valid rarity level');
            }
            if (typeof item.weight !== 'number' || item.weight < 0) {
                errors.push('Equipment "weight" must be a non-negative number');
            }
            // Weapon-specific validation
            if (item.type === 'weapon') {
                if (item.damage && typeof item.damage !== 'object') {
                    errors.push('Weapon "damage" must be an object with dice and damageType');
                }
            }
            // Armor-specific validation
            if (item.type === 'armor') {
                if (item.acBonus !== undefined && typeof item.acBonus !== 'number') {
                    errors.push('Armor "acBonus" must be a number');
                }
            }
            break;

        case 'appearance.bodyTypes':
        case 'appearance.hairStyles':
        case 'appearance.facialFeatures':
            // Simple string values
            if (typeof item !== 'string' && !item.value) {
                errors.push('Appearance option must be a string or have a "value" property');
            }
            break;

        case 'appearance.skinTones':
        case 'appearance.hairColors':
        case 'appearance.eyeColors':
            // Color values (hex format)
            const colorValue = typeof item === 'string' ? item : item.value;
            if (!colorValue || typeof colorValue !== 'string') {
                errors.push('Color option must be a string or have a "value" property');
            } else if (!/^#[0-9A-Fa-f]{6}$/.test(colorValue)) {
                warnings.push(`Color "${colorValue}" is not in standard hex format (#RRGGBB)`);
            }
            break;

        case 'spells':
            // Spells require: name, level, school
            if (!item.name || typeof item.name !== 'string') {
                errors.push('Spell must have a valid "name" string');
            }
            if (typeof item.level !== 'number' || item.level < 0 || item.level > 9) {
                errors.push('Spell "level" must be a number between 0 and 9');
            }
            const validSchools = ['Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy', 'Transmutation'];
            if (!validSchools.includes(item.school as string)) {
                errors.push(`Spell "school" must be one of: ${validSchools.join(', ')}`);
            }
            break;

        case 'classFeatures':
            // Class features require: id, name, description, type, class, level, source
            if (!item.id || typeof item.id !== 'string') {
                errors.push('Class feature must have a valid "id" string');
            } else if (!/^[a-z][a-z0-9_]*$/.test(item.id as string)) {
                errors.push('Class feature "id" must use lowercase_with_underscores format');
            }
            if (!item.name || typeof item.name !== 'string') {
                errors.push('Class feature must have a valid "name" string');
            }
            if (!item.description || typeof item.description !== 'string') {
                errors.push('Class feature must have a valid "description" string');
            }
            if (!['passive', 'active', 'reaction'].includes(item.type as string)) {
                errors.push('Class feature "type" must be "passive", "active", or "reaction"');
            }
            if (!item.class || typeof item.class !== 'string') {
                errors.push('Class feature must have a valid "class" string');
            }
            if (typeof item.level !== 'number' || item.level < 1 || item.level > 20) {
                errors.push('Class feature "level" must be a number between 1 and 20');
            }
            break;

        case 'racialTraits':
            // Racial traits require: id, name, description, race, source
            if (!item.id || typeof item.id !== 'string') {
                errors.push('Racial trait must have a valid "id" string');
            } else if (!/^[a-z][a-z0-9_]*$/.test(item.id as string)) {
                errors.push('Racial trait "id" must use lowercase_with_underscores format');
            }
            if (!item.name || typeof item.name !== 'string') {
                errors.push('Racial trait must have a valid "name" string');
            }
            if (!item.description || typeof item.description !== 'string') {
                errors.push('Racial trait must have a valid "description" string');
            }
            if (!item.race || typeof item.race !== 'string') {
                errors.push('Racial trait must have a valid "race" string');
            }
            break;

        case 'skills':
            // Skills require: id, name, ability, source
            if (!item.id || typeof item.id !== 'string') {
                errors.push('Skill must have a valid "id" string');
            } else if (!/^[a-z][a-z0-9_]*$/.test(item.id as string)) {
                errors.push('Skill "id" must use lowercase_with_underscores format');
            }
            if (!item.name || typeof item.name !== 'string') {
                errors.push('Skill must have a valid "name" string');
            }
            const validAbilities = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
            if (!validAbilities.includes(item.ability as string)) {
                errors.push(`Skill "ability" must be one of: ${validAbilities.join(', ')}`);
            }
            break;

        case 'skillLists':
            // Skill lists require: class, skillCount, availableSkills
            if (!item.class || typeof item.class !== 'string') {
                errors.push('Skill list must have a valid "class" string');
            }
            if (typeof item.skillCount !== 'number' || item.skillCount < 0) {
                errors.push('Skill list "skillCount" must be a non-negative number');
            }
            if (!Array.isArray(item.availableSkills)) {
                errors.push('Skill list must have an "availableSkills" array');
            }
            break;

        case 'classes':
        case 'classes.data':
            // Classes require: name, hit_die, primary_ability, saving_throws
            if (!item.name || typeof item.name !== 'string') {
                errors.push('Class must have a valid "name" string');
            }
            if (![6, 8, 10, 12].includes(item.hit_die as number)) {
                errors.push('Class "hit_die" must be 6, 8, 10, or 12');
            }
            const validPrimaryAbilities = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
            if (!validPrimaryAbilities.includes(item.primary_ability as string)) {
                errors.push(`Class "primary_ability" must be one of: ${validPrimaryAbilities.join(', ')}`);
            }
            if (!Array.isArray(item.saving_throws)) {
                errors.push('Class must have a "saving_throws" array');
            } else if (item.saving_throws.length !== 2) {
                warnings.push('Classes typically have exactly 2 saving throws');
            }
            break;

        case 'races':
        case 'races.data':
            // Races require: name, ability_bonuses, speed, traits
            if (!item.name || typeof item.name !== 'string') {
                errors.push('Race must have a valid "name" string');
            }
            if (typeof item.speed !== 'number' || item.speed < 0) {
                errors.push('Race "speed" must be a non-negative number');
            }
            break;

        case 'classSpellLists':
            // Spell lists require: class, cantrips, spells_by_level
            if (!item.class || typeof item.class !== 'string') {
                errors.push('Spell list must have a valid "class" string');
            }
            if (!Array.isArray(item.cantrips)) {
                warnings.push('Spell list should have a "cantrips" array');
            }
            break;

        case 'classSpellSlots':
            // Spell slots require: class, slots (by level)
            if (!item.class || typeof item.class !== 'string') {
                errors.push('Spell slot config must have a valid "class" string');
            }
            break;

        case 'classStartingEquipment':
            // Starting equipment requires: class, weapons/armor/items
            if (!item.class || typeof item.class !== 'string') {
                errors.push('Starting equipment must have a valid "class" string');
            }
            break;

        default:
            // Unknown category - just check for name
            if (!item.name && !item.id) {
                warnings.push('Items typically have a "name" or "id" property');
            }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Mark an item as custom by adding source: 'custom'.
 */
function markAsCustom<T extends ContentItem>(item: T): T {
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

    /**
     * Validate content before registration.
     */
    const validateContent = useCallback((category: ContentType, item: ContentItem): ContentValidationResult => {
        return validateContentForCategory(category, item);
    }, []);

    /**
     * Create and register content in one operation.
     */
    const createContent = useCallback(<T extends ContentItem>(
        category: ContentType,
        item: T,
        options: ContentRegistrationOptions = {},
        callbacks: ContentCreatorCallbacks<T> = {}
    ): ContentCreationResult<T> => {
        const {
            validate = true,
            markAsCustom: shouldMarkAsCustom = true,
            mode,
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
            // Validate if requested
            if (validate) {
                const validation = validateContentForCategory(category, item);
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

            // Mark as custom if requested
            const itemToRegister = shouldMarkAsCustom ? markAsCustom(item) : item;

            // Build registration options
            const registerOptions: { validate: boolean; mode?: SpawnMode; weights?: Record<string, number> } = {
                validate: false // We already validated above
            };
            if (mode) {
                registerOptions.mode = mode;
            }
            if (weights) {
                registerOptions.weights = weights;
            }

            // Register with ExtensionManager
            manager.register(category as any, [itemToRegister], registerOptions);

            // Update state
            setLastCreatedItem(itemToRegister);
            setLastCreatedCategory(category);

            // Log success
            const itemName = (itemToRegister.name || itemToRegister.id || 'unknown') as string;
            logger.info('ContentCreator', `Created ${category} item: ${itemName}`);

            // Notify data change
            notifyDataChanged();

            // Call success callback
            onSuccess?.(itemToRegister, category);

            return {
                success: true,
                message: `Created ${itemName} in ${category}`,
                item: itemToRegister,
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
            mode,
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
            const itemsToRegister = shouldMarkAsCustom
                ? items.map(markAsCustom)
                : items;

            // Build registration options
            const registerOptions: { validate: boolean; mode?: SpawnMode; weights?: Record<string, number> } = {
                validate: false
            };
            if (mode) {
                registerOptions.mode = mode;
            }
            if (weights) {
                registerOptions.weights = weights;
            }

            // Register with ExtensionManager
            manager.register(category as any, itemsToRegister, registerOptions);

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
                (item: any) => item.name === itemName || item.id === itemName
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
                (item: any) => item.name !== itemName && item.id !== itemName
            );
            newItems.push(updatedItem);

            // Re-register all custom items (this is how ExtensionManager works)
            // First reset, then re-register
            manager.reset(category as any);
            manager.register(category as any, newItems, { validate: false });

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

            // Re-register remaining items
            manager.reset(category as any);
            if (remainingItems.length > 0) {
                manager.register(category as any, remainingItems, { validate: false });
            }

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
     */
    const itemExists = useCallback((category: ContentType, itemName: string): boolean => {
        try {
            const items = manager.get(category as any) as ContentItem[];
            return items.some(
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
