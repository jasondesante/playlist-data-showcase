import { useState, useCallback } from 'react';
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
            // Register custom equipment with ExtensionManager so it can be looked up later
            // This is necessary for equip/unequip to work with custom items
            if (equipment.source === 'custom') {
                const extensionManager = ExtensionManager.getInstance();
                // Only register if not already registered
                const existingEquipment = extensionManager.get('equipment') as EnhancedEquipment[];
                logger.debug('ItemCreator', `ExtensionManager has ${existingEquipment.length} equipment items`);
                const alreadyRegistered = existingEquipment.find(e => e.name === equipment.name);
                if (!alreadyRegistered) {
                    logger.info('ItemCreator', `Registering custom equipment with ExtensionManager: ${equipment.name}`);
                    extensionManager.register('equipment', [equipment]);
                    // Verify registration
                    const afterRegistration = extensionManager.get('equipment') as EnhancedEquipment[];
                    const found = afterRegistration.find(e => e.name === equipment.name);
                    logger.info('ItemCreator', `Verification - equipment ${equipment.name} ${found ? 'found' : 'NOT found'} after registration`);
                } else {
                    logger.debug('ItemCreator', `Equipment ${equipment.name} already registered, skipping`);
                }
            }

            // Create inventory item
            const inventoryItem: EnhancedInventoryItem = {
                name: equipment.name,
                quantity: quantity,
                equipped: autoEquip,
                instanceId: `${equipment.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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

            // If auto-equipping, apply effects
            if (autoEquip) {
                const result = EquipmentEffectApplier.equipItem(updatedCharacter, equipment, inventoryItem.instanceId);
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
