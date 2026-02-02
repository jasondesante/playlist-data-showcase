import { useState, useCallback, useEffect, useRef } from 'react';
import {
    EnhancedEquipment,
    EnhancedInventoryItem,
    EquipmentProperty,
    EquipmentEffectApplier,
    ExtensionManager
} from 'playlist-data-engine';
import { useCharacterStore } from '@/store/characterStore';
import { useDataViewerStore } from '@/store/dataViewerStore';
import { logger } from '@/utils/logger';
import type { CharacterSheet } from '@/types';

/**
 * Local cache for custom equipment items.
 * This bypasses ExtensionManager which may not persist items correctly.
 *
 * IMPORTANT: This cache is also persisted to localStorage to survive page reloads.
 */
const CUSTOM_EQUIPMENT_CACHE = new Map<string, EnhancedEquipment>();
const CUSTOM_EQUIPMENT_STORAGE_KEY = 'custom_equipment_cache';

/**
 * Save custom equipment cache to localStorage
 */
function saveCustomEquipmentCache(): void {
    try {
        const cacheArray = Array.from(CUSTOM_EQUIPMENT_CACHE.entries());
        localStorage.setItem(CUSTOM_EQUIPMENT_STORAGE_KEY, JSON.stringify(cacheArray));
        logger.debug('ItemCreator', `Saved ${cacheArray.length} custom equipment items to localStorage`);
    } catch (error) {
        logger.warn('ItemCreator', 'Failed to save custom equipment cache to localStorage', { error: String(error) });
    }
}

/**
 * Load custom equipment cache from localStorage
 */
function loadCustomEquipmentCache(): void {
    try {
        const stored = localStorage.getItem(CUSTOM_EQUIPMENT_STORAGE_KEY);
        if (stored) {
            const cacheArray: Array<[string, EnhancedEquipment]> = JSON.parse(stored);
            CUSTOM_EQUIPMENT_CACHE.clear();
            for (const [name, equipment] of cacheArray) {
                CUSTOM_EQUIPMENT_CACHE.set(name, equipment);
            }
            logger.info('ItemCreator', `Loaded ${cacheArray.length} custom equipment items from localStorage`);
        }
    } catch (error) {
        logger.warn('ItemCreator', 'Failed to load custom equipment cache from localStorage', { error: String(error) });
    }
}

/**
 * Initialize the custom equipment cache from localStorage on module load
 * This ensures custom items are available even after page reload
 */
loadCustomEquipmentCache();

/**
 * Clear all custom equipment from localStorage cache
 * Use this to fix corrupted or invalid custom equipment data
 */
export function clearCustomEquipmentCache(): void {
    try {
        const count = CUSTOM_EQUIPMENT_CACHE.size;
        CUSTOM_EQUIPMENT_CACHE.clear();
        localStorage.removeItem(CUSTOM_EQUIPMENT_STORAGE_KEY);
        logger.info('ItemCreator', `Cleared ${count} custom equipment items from localStorage cache`);
    } catch (error) {
        logger.warn('ItemCreator', 'Failed to clear custom equipment cache', { error: String(error) });
    }
}

/**
 * Restore custom equipment from ExtensionManager
 * This is called after ExtensionManager defaults are initialized
 */
export function restoreCustomEquipmentFromExtensionManager(): void {
    try {
        const extensionManager = ExtensionManager.getInstance();
        const allEquipment = extensionManager.get('equipment') as EnhancedEquipment[];
        if (allEquipment) {
            let restoredCount = 0;
            for (const equipment of allEquipment) {
                if (equipment.source === 'custom' && !CUSTOM_EQUIPMENT_CACHE.has(equipment.name)) {
                    CUSTOM_EQUIPMENT_CACHE.set(equipment.name, equipment);
                    restoredCount++;
                }
            }
            if (restoredCount > 0) {
                saveCustomEquipmentCache(); // Update localStorage
                logger.info('ItemCreator', `Restored ${restoredCount} custom items from ExtensionManager`);
            }
        }
    } catch (error) {
        logger.warn('ItemCreator', 'Failed to restore custom equipment from ExtensionManager', { error: String(error) });
    }
}

/**
 * Initialize custom equipment by registering all items from localStorage cache
 * into ExtensionManager. This should be called on app startup.
 */
export function initializeCustomEquipment(): void {
    try {
        const extensionManager = ExtensionManager.getInstance();
        const customItems = getAllCustomEquipment();

        if (customItems.length === 0) {
            logger.debug('ItemCreator', 'No custom equipment to initialize');
            return;
        }

        // Check what's already in ExtensionManager to prevent duplicates
        const existingEquipment = extensionManager.getCustom('equipment') as EnhancedEquipment[];
        const existingNames = existingEquipment.map(e => e.name);

        // Only register items that aren't already in ExtensionManager
        const newItems = customItems.filter(item => !existingNames.includes(item.name));
        if (newItems.length === 0) {
            logger.debug('ItemCreator', 'All custom items already registered, skipping');
            return;
        }

        const duplicates = customItems.length - newItems.length;
        if (duplicates > 0) {
            logger.debug('ItemCreator', `Skipping ${duplicates} items already registered`);
        }

        // Register all custom items with ExtensionManager with validation enabled
        // Uses default 'relative' mode to preserve items registered by main.tsx (magic items)
        // The module-level flag in useCustomEquipmentInitializer prevents duplicate registration
        // Custom items created through the UI should always be valid
        extensionManager.register('equipment', newItems, { validate: true });

        logger.info('ItemCreator', `Successfully registered ${newItems.length} custom equipment items`);
    } catch (error) {
        const errorMessage = String(error);
        logger.error('ItemCreator', 'Failed to initialize custom equipment', { error: errorMessage });

        // Try to identify and remove only the invalid items, keeping valid ones
        // Parse error to find which items are problematic
        const invalidItemNames: string[] = [];

        // Error format from ExtensionManager typically includes item indices or names
        // Extract item numbers from error messages like "Item 2:", "Item 5:", etc.
        const itemMatches = errorMessage.match(/Item (\d+):/g);
        if (itemMatches) {
            const indices = itemMatches.map(m => parseInt(m.replace('Item ', '').replace(':', '')));
            const customItems = getAllCustomEquipment();
            indices.forEach(idx => {
                if (customItems[idx]) {
                    invalidItemNames.push(customItems[idx].name);
                }
            });
        }

        if (invalidItemNames.length > 0) {
            logger.warn('ItemCreator', `Removing ${invalidItemNames.length} invalid items: ${invalidItemNames.join(', ')}`);
            invalidItemNames.forEach(name => {
                CUSTOM_EQUIPMENT_CACHE.delete(name);
            });
            saveCustomEquipmentCache();
            logger.info('ItemCreator', `Cleared invalid items, ${CUSTOM_EQUIPMENT_CACHE.size} valid items remain`);
        } else {
            // If we can't parse the error, fall back to clearing everything
            logger.warn('ItemCreator', 'Could not identify invalid items, clearing entire cache');
            clearCustomEquipmentCache();
        }
    }
}

/**
 * React hook to initialize custom equipment on mount
 * Call this in your App component or a main initialization component
 * Uses module-level flag to ensure equipment is only registered once per session,
 * preventing duplicates from React StrictMode double-invocation or component re-renders.
 *
 * Note: Custom items persist in localStorage, so they survive page reloads.
 * The module-level flag resets on page reload, allowing fresh initialization.
 */
let _hasInitializedCustomEquipment = false;

export function useCustomEquipmentInitializer(): void {
    const hasInitializedRef = useRef(false);

    useEffect(() => {
        // Check both module-level flag and ref to prevent duplicate registration
        // Module flag prevents cross-component duplicates
        // Ref prevents React StrictMode double-invocation within same component
        if (!_hasInitializedCustomEquipment && !hasInitializedRef.current) {
            initializeCustomEquipment();
            _hasInitializedCustomEquipment = true;
            hasInitializedRef.current = true;
        }
    }, []);
}

/**
 * Register a custom equipment item in the local cache
 */
export function registerCustomEquipment(equipment: EnhancedEquipment): void {
    CUSTOM_EQUIPMENT_CACHE.set(equipment.name, equipment);
    saveCustomEquipmentCache(); // Persist to localStorage
    logger.info('ItemCreator', `Registered custom equipment in local cache: ${equipment.name}`);
}

/**
 * Get custom equipment by name from local cache
 */
export function getCustomEquipment(name: string): EnhancedEquipment | undefined {
    return CUSTOM_EQUIPMENT_CACHE.get(name);
}

/**
 * Get all custom equipment from local cache
 */
export function getAllCustomEquipment(): EnhancedEquipment[] {
    return Array.from(CUSTOM_EQUIPMENT_CACHE.values());
}

/**
 * Equipment type categories
 * (Re-defined here since not exported from playlist-data-engine main index)
 */
export type EquipmentType = 'weapon' | 'armor' | 'item';

/**
 * Equipment rarity levels
 * (Re-defined here since not exported from playlist-data-engine main index)
 */
export type EquipmentRarity = 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary';

/**
 * Form data interface for custom item creation
 */
export interface CustomItemFormData {
    /** Item name */
    name: string;
    /** Item type (weapon, armor, or item) */
    type: EquipmentType;
    /** Item rarity */
    rarity: EquipmentRarity;
    /** Item weight in pounds */
    weight: number;
    /** Item quantity (default 1) */
    quantity: number;
    /** Damage dice for weapons (e.g., "1d8", "2d6") */
    damageDice?: string;
    /** Damage type for weapons (e.g., "slashing", "piercing") */
    damageType?: string;
    /** Versatile damage dice for weapons */
    versatileDamage?: string;
    /** AC bonus for armor */
    acBonus?: number;
    /** Weapon properties (e.g., "finesse", "versatile", "two-handed") */
    weaponProperties?: string[];
    /** Equipment properties (stat bonuses, etc.) */
    properties?: EquipmentProperty[];
    /** Features granted when equipped */
    grantsFeatures?: string[];
    /** Skills granted when equipped */
    grantsSkills?: Array<{ skillId: string; level: 'proficient' | 'expertise' }>;
    /** Spells granted when equipped */
    grantsSpells?: Array<{ spellId: string; level?: number; uses?: number; recharge?: string }>;
    /** Tags for categorization */
    tags?: string[];
}

/**
 * Result type for item creation operations
 */
export interface ItemCreationResult {
    /** Whether the operation was successful */
    success: boolean;
    /** Success or error message */
    message?: string;
    /** Error details if failed */
    error?: string;
    /** The created equipment (if successful) */
    equipment?: EnhancedEquipment;
    /** The created inventory item (if successful) */
    inventoryItem?: EnhancedInventoryItem;
}

/**
 * Validation result for form data
 */
export interface ValidationResult {
    /** Whether the form data is valid */
    valid: boolean;
    /** Array of validation error messages */
    errors: string[];
}

/**
 * Interface for item creator hook
 */
export interface UseItemCreatorReturn {
    /** Whether an operation is in progress */
    isLoading: boolean;
    /** The last created item */
    lastCreatedItem: EnhancedEquipment | null;
    /** Validate form data for custom item creation */
    validateItemData: (data: CustomItemFormData) => ValidationResult;
    /** Create a custom equipment object from form data */
    createCustomItem: (data: CustomItemFormData) => ItemCreationResult;
    /** Add a custom item to the active character's inventory */
    addItemToCharacter: (
        equipment: EnhancedEquipment,
        quantity?: number,
        autoEquip?: boolean
    ) => Promise<ItemCreationResult>;
    /** Create and add an item in one operation */
    createAndAddItem: (
        data: CustomItemFormData,
        autoEquip?: boolean
    ) => Promise<ItemCreationResult>;
    /** Clear the last created item */
    clearLastCreated: () => void;
}

/**
 * React hook for creating custom items and adding them to characters.
 *
 * This hook provides functionality to create custom equipment items with
 * various properties and add them to the active character's inventory.
 * It validates item data and integrates with the EquipmentEffectApplier
 * for proper equipment effect handling.
 *
 * @example
 * ```tsx
 * const {
 *   isLoading,
 *   validateItemData,
 *   createCustomItem,
 *   addItemToCharacter,
 *   createAndAddItem
 * } = useItemCreator();
 *
 * // Validate form data
 * const validation = validateItemData(formData);
 * if (!validation.valid) {
 *   console.error(validation.errors);
 * }
 *
 * // Create and add item in one step
 * const result = await createAndAddItem({
 *   name: 'Sword of Testing',
 *   type: 'weapon',
 *   rarity: 'rare',
 *   weight: 3,
 *   quantity: 1,
 *   damageDice: '1d8',
 *   damageType: 'slashing'
 * }, true); // autoEquip = true
 * ```
 *
 * @returns {UseItemCreatorReturn} Hook return object with item creation functions
 */
export const useItemCreator = (): UseItemCreatorReturn => {
    const { getActiveCharacter, updateCharacter } = useCharacterStore();
    const { notifyDataChanged } = useDataViewerStore();
    const [isLoading, setIsLoading] = useState(false);
    const [lastCreatedItem, setLastCreatedItem] = useState<EnhancedEquipment | null>(null);

    /**
     * Validate form data for custom item creation
     */
    const validateItemData = useCallback((data: CustomItemFormData): ValidationResult => {
        const errors: string[] = [];

        // Validate name
        if (!data.name || data.name.trim().length === 0) {
            errors.push('Item name is required');
        } else if (data.name.trim().length < 2) {
            errors.push('Item name must be at least 2 characters');
        } else if (data.name.trim().length > 100) {
            errors.push('Item name must be less than 100 characters');
        }

        // Validate type
        const validTypes: EquipmentType[] = ['weapon', 'armor', 'item'];
        if (!validTypes.includes(data.type)) {
            errors.push('Invalid item type. Must be weapon, armor, or item');
        }

        // Validate rarity
        const validRarities: EquipmentRarity[] = ['common', 'uncommon', 'rare', 'very_rare', 'legendary'];
        if (!validRarities.includes(data.rarity)) {
            errors.push('Invalid rarity. Must be common, uncommon, rare, very_rare, or legendary');
        }

        // Validate weight
        if (data.weight < 0) {
            errors.push('Weight cannot be negative');
        } else if (data.weight > 1000) {
            errors.push('Weight seems excessive (max 1000 lbs)');
        }

        // Validate quantity
        if (data.quantity < 1) {
            errors.push('Quantity must be at least 1');
        } else if (data.quantity > 9999) {
            errors.push('Quantity seems excessive (max 9999)');
        }

        // Validate weapon-specific fields
        if (data.type === 'weapon') {
            if (data.damageDice && !/^\d+d\d+$/.test(data.damageDice)) {
                errors.push('Damage dice must be in format like "1d8" or "2d6"');
            }
            if (data.versatileDamage && !/^\d+d\d+$/.test(data.versatileDamage)) {
                errors.push('Versatile damage must be in format like "1d10"');
            }
        }

        // Validate armor-specific fields
        if (data.type === 'armor') {
            if (data.acBonus !== undefined && (data.acBonus < 0 || data.acBonus > 20)) {
                errors.push('AC bonus must be between 0 and 20');
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }, []);

    /**
     * Create a custom equipment object from form data
     */
    const createCustomItem = useCallback((data: CustomItemFormData): ItemCreationResult => {
        try {
            // Validate first
            const validation = validateItemData(data);
            if (!validation.valid) {
                return {
                    success: false,
                    error: `Validation failed: ${validation.errors.join(', ')}`
                };
            }

            // Build the equipment object
            const equipment: EnhancedEquipment = {
                name: data.name.trim(),
                type: data.type,
                rarity: data.rarity,
                weight: data.weight,
                source: 'custom',
                tags: data.tags || ['custom']
            };

            // Add weapon-specific properties
            if (data.type === 'weapon' && data.damageDice) {
                equipment.damage = {
                    dice: data.damageDice,
                    damageType: data.damageType || 'slashing'
                };
                if (data.versatileDamage) {
                    equipment.damage.versatile = data.versatileDamage;
                }
                if (data.weaponProperties && data.weaponProperties.length > 0) {
                    equipment.weaponProperties = data.weaponProperties;
                }
            }

            // Add armor-specific properties
            if (data.type === 'armor' && data.acBonus !== undefined) {
                equipment.acBonus = data.acBonus;
            }

            // Add optional properties
            if (data.properties && data.properties.length > 0) {
                equipment.properties = data.properties;
            }

            if (data.grantsFeatures && data.grantsFeatures.length > 0) {
                equipment.grantsFeatures = data.grantsFeatures;
            }

            if (data.grantsSkills && data.grantsSkills.length > 0) {
                equipment.grantsSkills = data.grantsSkills;
            }

            if (data.grantsSpells && data.grantsSpells.length > 0) {
                equipment.grantsSpells = data.grantsSpells;
            }

            // Set spawn weight to 0 (custom items don't spawn randomly)
            equipment.spawnWeight = 0;

            setLastCreatedItem(equipment);

            logger.info('ItemCreator', `Created custom item: ${equipment.name}`, {
                type: equipment.type,
                rarity: equipment.rarity,
                weight: equipment.weight
            });

            return {
                success: true,
                message: `Created ${equipment.name}`,
                equipment
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('ItemCreator', 'Failed to create custom item', { error: errorMessage });
            return {
                success: false,
                error: errorMessage
            };
        }
    }, [validateItemData]);

    /**
     * Add a custom item to the active character's inventory
     */
    const addItemToCharacter = useCallback(async (
        equipment: EnhancedEquipment,
        quantity: number = 1,
        autoEquip: boolean = false
    ): Promise<ItemCreationResult> => {
        const activeCharacter = getActiveCharacter();

        if (!activeCharacter) {
            return {
                success: false,
                error: 'No active character selected'
            };
        }

        setIsLoading(true);

        try {
            // Register custom equipment in BOTH local cache and ExtensionManager
            // Local cache is our primary fallback since ExtensionManager may not persist correctly
            if (equipment.source === 'custom') {
                // First, register in our local cache (reliable)
                registerCustomEquipment(equipment);
                logger.info('ItemCreator', `Registered ${equipment.name} in local cache`);

                // Also register with ExtensionManager for completeness
                try {
                    const extensionManager = ExtensionManager.getInstance();
                    const existingEquipment = extensionManager.get('equipment') as EnhancedEquipment[];
                    const alreadyRegistered = existingEquipment.find(e => e.name === equipment.name);
                    if (!alreadyRegistered) {
                        // Use validation - custom items created through the UI should be valid
                        extensionManager.register('equipment', [equipment], { validate: true });
                        logger.debug('ItemCreator', `Registered ${equipment.name} in ExtensionManager`);
                    }
                } catch (emErr) {
                    logger.warn('ItemCreator', `ExtensionManager registration failed (using local cache)`, { error: String(emErr) });
                }
            }

            // Create inventory item
            const inventoryItem: EnhancedInventoryItem = {
                name: equipment.name,
                quantity: quantity,
                equipped: autoEquip,
                instanceId: `${equipment.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
            };

            // Create a copy of the character to modify
            const updatedCharacter: CharacterSheet = { ...activeCharacter };

            // Initialize equipment if needed
            if (!updatedCharacter.equipment) {
                updatedCharacter.equipment = {
                    weapons: [],
                    armor: [],
                    items: [],
                    totalWeight: 0,
                    equippedWeight: 0
                };
            }

            // Determine category based on equipment type
            let category: 'weapons' | 'armor' | 'items';
            if (equipment.type === 'weapon') {
                category = 'weapons';
            } else if (equipment.type === 'armor') {
                category = 'armor';
            } else {
                category = 'items';
            }

            // Add the item to the appropriate category
            updatedCharacter.equipment[category].push(inventoryItem);

            // Update weight calculations
            const itemWeight = (equipment.weight || 0) * quantity;
            updatedCharacter.equipment.totalWeight = (updatedCharacter.equipment.totalWeight || 0) + itemWeight;

            // If auto-equipping, apply effects (no instanceId to match API behavior)
            if (autoEquip) {
                const result = EquipmentEffectApplier.equipItem(updatedCharacter, equipment, undefined);
                if (result.errors.length > 0) {
                    logger.warn('ItemCreator', 'Auto-equip had errors', result.errors);
                }
                updatedCharacter.equipment.equippedWeight = (updatedCharacter.equipment.equippedWeight || 0) + itemWeight;
            }

            // Update the character in the store
            updateCharacter(updatedCharacter);

            // Notify that data has changed (for Data Viewer live updates)
            notifyDataChanged();

            logger.info('ItemCreator', `Added ${equipment.name} to ${activeCharacter.name}'s inventory`, {
                itemId: inventoryItem.instanceId,
                autoEquip,
                category,
                quantity
            });

            // DEBUG: Write ExtensionManager state to file for diagnosis
            try {
                const extensionManager = ExtensionManager.getInstance();
                const allEquipment = extensionManager.get('equipment') as EnhancedEquipment[];
                const customEquipment = extensionManager.getCustom('equipment') as EnhancedEquipment[];
                const debugData = {
                    timestamp: new Date().toISOString(),
                    totalEquipmentCount: allEquipment?.length || 0,
                    customEquipmentCount: customEquipment?.length || 0,
                    allEquipmentNames: allEquipment?.map(e => e.name) || [],
                    customEquipmentNames: customEquipment?.map(e => e.name) || [],
                    lastRegisteredItem: equipment.name,
                    itemFoundInAll: allEquipment?.some(e => e.name === equipment.name) || false,
                    itemFoundInCustom: customEquipment?.some(e => e.name === equipment.name) || false
                };
                // Use a global variable to store last debug state instead of writing to file
                (window as unknown as Record<string, unknown>).__itemCreatorDebug = debugData;
                logger.info('ItemCreator', 'Debug state stored in window.__itemCreatorDebug', debugData);
            } catch (e) {
                logger.warn('ItemCreator', 'Failed to store debug state', { error: String(e) });
            }

            return {
                success: true,
                message: `Added ${equipment.name} to ${activeCharacter.name}'s inventory`,
                equipment,
                inventoryItem
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('ItemCreator', 'Failed to add item to character', {
                itemName: equipment.name,
                error: errorMessage
            });
            return {
                success: false,
                error: errorMessage
            };
        } finally {
            setIsLoading(false);
        }
    }, [getActiveCharacter, updateCharacter]);

    /**
     * Create and add an item in one operation
     */
    const createAndAddItem = useCallback(async (
        data: CustomItemFormData,
        autoEquip: boolean = false
    ): Promise<ItemCreationResult> => {
        // First create the item
        const createResult = createCustomItem(data);

        if (!createResult.success || !createResult.equipment) {
            return createResult;
        }

        // Then add it to the character
        const addResult = await addItemToCharacter(
            createResult.equipment,
            data.quantity,
            autoEquip
        );

        return addResult;
    }, [createCustomItem, addItemToCharacter]);

    /**
     * Clear the last created item
     */
    const clearLastCreated = useCallback(() => {
        setLastCreatedItem(null);
        logger.debug('ItemCreator', 'Cleared last created item');
    }, []);

    return {
        isLoading,
        lastCreatedItem,
        validateItemData,
        createCustomItem,
        addItemToCharacter,
        createAndAddItem,
        clearLastCreated
    };
};
