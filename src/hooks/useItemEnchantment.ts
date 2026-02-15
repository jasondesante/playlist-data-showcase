import { useState, useCallback, useMemo } from 'react';
import {
    EquipmentModifier,
    EnchantmentLibrary,
    WEAPON_ENCHANTMENTS,
    ARMOR_ENCHANTMENTS,
    RESISTANCE_ENCHANTMENTS,
    CURSES,
    ALL_ENCHANTMENTS,
    createStrengthEnchantment,
    createDexterityEnchantment,
    createConstitutionEnchantment,
    createIntelligenceEnchantment,
    createWisdomEnchantment,
    createCharismaEnchantment,
    type CharacterEquipment,
    type EquipmentModification,
    type EnhancedInventoryItem,
    type EquipmentProperty
} from 'playlist-data-engine';
import { useCharacterStore } from '@/store/characterStore';
import { logger } from '@/utils/logger';
import type { CharacterSheet } from '@/types';

/**
 * Re-export enchantment types and functions for external use
 */
export {
    WEAPON_ENCHANTMENTS,
    ARMOR_ENCHANTMENTS,
    RESISTANCE_ENCHANTMENTS,
    CURSES,
    ALL_ENCHANTMENTS,
    createStrengthEnchantment,
    createDexterityEnchantment,
    createConstitutionEnchantment,
    createIntelligenceEnchantment,
    createWisdomEnchantment,
    createCharismaEnchantment,
    EnchantmentLibrary
};

/**
 * Result type for enchantment operations
 */
export interface EnchantmentOperationResult {
    success: boolean;
    message?: string;
    error?: string;
}

/**
 * Information about an item's modifications
 */
export interface ItemModificationInfo {
    /** Whether the item has any enchantments */
    isEnchanted: boolean;
    /** Whether the item has any curses */
    isCursed: boolean;
    /** Whether the item has the attunement curse (cannot be unequipped) */
    hasAttunementCurse: boolean;
    /** All active modifications on the item */
    modifications: EquipmentModification[];
    /** Combined effects from base item + modifications */
    combinedEffects: EquipmentProperty[];
}

/**
 * Interface for item enchantment hook
 */
export interface UseItemEnchantmentReturn {
    /** The currently active character, or undefined if none selected */
    activeCharacter: CharacterSheet | undefined;
    /** Whether an enchantment operation is in progress */
    isLoading: boolean;
    /** Enchant an item with a modification */
    enchantItem: (itemName: string, enchantment: EquipmentModification) => Promise<EnchantmentOperationResult>;
    /** Curse an item with a negative modification */
    curseItem: (itemName: string, curse: EquipmentModification) => Promise<EnchantmentOperationResult>;
    /** Remove all enchantments from an item (keeps curses) */
    disenchantItem: (itemName: string) => Promise<EnchantmentOperationResult>;
    /** Remove all curses from an item (keeps enchantments) */
    liftCurse: (itemName: string) => Promise<EnchantmentOperationResult>;
    /** Remove a specific modification by ID */
    removeModification: (itemName: string, modificationId: string) => Promise<EnchantmentOperationResult>;
    /** Get all modifications on an item */
    getItemModifications: (itemName: string) => EquipmentModification[];
    /** Get detailed modification info for an item */
    getItemModificationInfo: (itemName: string) => ItemModificationInfo | null;
    /** Check if an item is enchanted */
    isEnchanted: (itemName: string) => boolean;
    /** Check if an item is cursed */
    isCursed: (itemName: string) => boolean;
    /** Check if an item has the attunement curse */
    hasAttunementCurse: (itemName: string) => boolean;
}

/**
 * React hook for managing item enchantments and curses.
 *
 * This hook provides functionality to enchant, curse, disenchant, and lift curses
 * from items in the active character's inventory. It uses the EquipmentModifier
 * from playlist-data-engine to handle modification operations.
 *
 * @example
 * ```tsx
 * const {
 *   activeCharacter,
 *   enchantItem,
 *   curseItem,
 *   disenchantItem,
 *   liftCurse,
 *   getItemModificationInfo,
 *   isCursed,
 *   hasAttunementCurse
 * } = useItemEnchantment();
 *
 * // Enchant a weapon
 * const plusOne = EnchantmentLibrary.getEnchantment('plus_one');
 * if (plusOne) {
 *   await enchantItem('Longsword', plusOne);
 * }
 *
 * // Check if item is cursed
 * if (isCursed('Longsword')) {
 *   await liftCurse('Longsword');
 * }
 * ```
 *
 * @returns {UseItemEnchantmentReturn} Hook return object with enchantment management functions
 */
export const useItemEnchantment = (): UseItemEnchantmentReturn => {
    const { characters, activeCharacterId, updateCharacter } = useCharacterStore();
    const [isLoading, setIsLoading] = useState(false);

    /**
     * Get the active character from store state
     */
    const activeCharacter = useMemo(() => {
        return characters.find((c) => c.seed === activeCharacterId);
    }, [characters, activeCharacterId]);

    /**
     * Find an item in equipment by name across all categories
     */
    const findItemByName = useCallback((
        equipment: CharacterEquipment,
        itemName: string
    ): EnhancedInventoryItem | undefined => {
        return (
            equipment.weapons.find(i => i.name === itemName) ||
            equipment.armor.find(i => i.name === itemName) ||
            equipment.items.find(i => i.name === itemName)
        );
    }, []);

    /**
     * Update the character in the store after equipment changes
     */
    const updateCharacterEquipment = useCallback((updatedCharacter: CharacterSheet) => {
        updateCharacter(updatedCharacter);
    }, [updateCharacter]);

    /**
     * Enchant an item with a modification
     */
    const enchantItem = useCallback(async (
        itemName: string,
        enchantment: EquipmentModification
    ): Promise<EnchantmentOperationResult> => {
        if (!activeCharacter) {
            return { success: false, error: 'No active character selected' };
        }

        if (!activeCharacter.equipment) {
            return { success: false, error: 'Character has no equipment' };
        }

        setIsLoading(true);

        try {
            const item = findItemByName(activeCharacter.equipment, itemName);
            if (!item) {
                return { success: false, error: `Item "${itemName}" not found in equipment` };
            }

            // Use EquipmentModifier to enchant the item
            const updatedEquipment = EquipmentModifier.enchant(
                activeCharacter.equipment,
                itemName,
                enchantment,
                activeCharacter // Pass character to reapply effects if equipped
            );

            // Update character with new equipment state
            const updatedCharacter: CharacterSheet = {
                ...activeCharacter,
                equipment: updatedEquipment
            };

            updateCharacterEquipment(updatedCharacter);

            logger.info('ItemEnchantment', `Enchanted ${itemName}`, {
                enchantment: enchantment.name,
                enchantmentId: enchantment.id
            });

            return {
                success: true,
                message: `Applied ${enchantment.name} to ${itemName}`
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('ItemEnchantment', 'Failed to enchant item', { itemName, error: errorMessage });
            return { success: false, error: errorMessage };
        } finally {
            setIsLoading(false);
        }
    }, [activeCharacter, findItemByName, updateCharacterEquipment]);

    /**
     * Curse an item with a negative modification
     */
    const curseItem = useCallback(async (
        itemName: string,
        curse: EquipmentModification
    ): Promise<EnchantmentOperationResult> => {
        if (!activeCharacter) {
            return { success: false, error: 'No active character selected' };
        }

        if (!activeCharacter.equipment) {
            return { success: false, error: 'Character has no equipment' };
        }

        setIsLoading(true);

        try {
            const item = findItemByName(activeCharacter.equipment, itemName);
            if (!item) {
                return { success: false, error: `Item "${itemName}" not found in equipment` };
            }

            // Use EquipmentModifier to curse the item
            const updatedEquipment = EquipmentModifier.curse(
                activeCharacter.equipment,
                itemName,
                curse,
                activeCharacter // Pass character to reapply effects if equipped
            );

            // Update character with new equipment state
            const updatedCharacter: CharacterSheet = {
                ...activeCharacter,
                equipment: updatedEquipment
            };

            updateCharacterEquipment(updatedCharacter);

            logger.info('ItemEnchantment', `Cursed ${itemName}`, {
                curse: curse.name,
                curseId: curse.id
            });

            return {
                success: true,
                message: `Applied ${curse.name} curse to ${itemName}`
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('ItemEnchantment', 'Failed to curse item', { itemName, error: errorMessage });
            return { success: false, error: errorMessage };
        } finally {
            setIsLoading(false);
        }
    }, [activeCharacter, findItemByName, updateCharacterEquipment]);

    /**
     * Remove all enchantments from an item (keeps curses)
     */
    const disenchantItem = useCallback(async (
        itemName: string
    ): Promise<EnchantmentOperationResult> => {
        if (!activeCharacter) {
            return { success: false, error: 'No active character selected' };
        }

        if (!activeCharacter.equipment) {
            return { success: false, error: 'Character has no equipment' };
        }

        setIsLoading(true);

        try {
            const item = findItemByName(activeCharacter.equipment, itemName);
            if (!item) {
                return { success: false, error: `Item "${itemName}" not found in equipment` };
            }

            // Use EquipmentModifier to disenchant the item
            const updatedEquipment = EquipmentModifier.disenchant(
                activeCharacter.equipment,
                itemName,
                activeCharacter // Pass character to reapply effects if equipped
            );

            // Update character with new equipment state
            const updatedCharacter: CharacterSheet = {
                ...activeCharacter,
                equipment: updatedEquipment
            };

            updateCharacterEquipment(updatedCharacter);

            logger.info('ItemEnchantment', `Disenchanted ${itemName}`);

            return {
                success: true,
                message: `Removed all enchantments from ${itemName}`
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('ItemEnchantment', 'Failed to disenchant item', { itemName, error: errorMessage });
            return { success: false, error: errorMessage };
        } finally {
            setIsLoading(false);
        }
    }, [activeCharacter, findItemByName, updateCharacterEquipment]);

    /**
     * Remove all curses from an item (keeps enchantments)
     */
    const liftCurse = useCallback(async (
        itemName: string
    ): Promise<EnchantmentOperationResult> => {
        if (!activeCharacter) {
            return { success: false, error: 'No active character selected' };
        }

        if (!activeCharacter.equipment) {
            return { success: false, error: 'Character has no equipment' };
        }

        setIsLoading(true);

        try {
            const item = findItemByName(activeCharacter.equipment, itemName);
            if (!item) {
                return { success: false, error: `Item "${itemName}" not found in equipment` };
            }

            // Use EquipmentModifier to lift the curse
            const updatedEquipment = EquipmentModifier.liftCurse(
                activeCharacter.equipment,
                itemName,
                activeCharacter // Pass character to reapply effects if equipped
            );

            // Update character with new equipment state
            const updatedCharacter: CharacterSheet = {
                ...activeCharacter,
                equipment: updatedEquipment
            };

            updateCharacterEquipment(updatedCharacter);

            logger.info('ItemEnchantment', `Lifted curse from ${itemName}`);

            return {
                success: true,
                message: `Lifted all curses from ${itemName}`
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('ItemEnchantment', 'Failed to lift curse', { itemName, error: errorMessage });
            return { success: false, error: errorMessage };
        } finally {
            setIsLoading(false);
        }
    }, [activeCharacter, findItemByName, updateCharacterEquipment]);

    /**
     * Remove a specific modification by ID
     */
    const removeModification = useCallback(async (
        itemName: string,
        modificationId: string
    ): Promise<EnchantmentOperationResult> => {
        if (!activeCharacter) {
            return { success: false, error: 'No active character selected' };
        }

        if (!activeCharacter.equipment) {
            return { success: false, error: 'Character has no equipment' };
        }

        setIsLoading(true);

        try {
            const item = findItemByName(activeCharacter.equipment, itemName);
            if (!item) {
                return { success: false, error: `Item "${itemName}" not found in equipment` };
            }

            // Use EquipmentModifier to remove the specific modification
            const updatedEquipment = EquipmentModifier.removeModification(
                activeCharacter.equipment,
                itemName,
                modificationId,
                activeCharacter // Pass character to reapply effects if equipped
            );

            // Update character with new equipment state
            const updatedCharacter: CharacterSheet = {
                ...activeCharacter,
                equipment: updatedEquipment
            };

            updateCharacterEquipment(updatedCharacter);

            logger.info('ItemEnchantment', `Removed modification ${modificationId} from ${itemName}`);

            return {
                success: true,
                message: `Removed modification from ${itemName}`
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('ItemEnchantment', 'Failed to remove modification', { itemName, modificationId, error: errorMessage });
            return { success: false, error: errorMessage };
        } finally {
            setIsLoading(false);
        }
    }, [activeCharacter, findItemByName, updateCharacterEquipment]);

    /**
     * Get all modifications on an item
     */
    const getItemModifications = useCallback((itemName: string): EquipmentModification[] => {
        if (!activeCharacter?.equipment) {
            return [];
        }

        return EquipmentModifier.getModificationHistory(activeCharacter.equipment, itemName);
    }, [activeCharacter]);

    /**
     * Get detailed modification info for an item
     */
    const getItemModificationInfo = useCallback((itemName: string): ItemModificationInfo | null => {
        if (!activeCharacter?.equipment) {
            return null;
        }

        const summary = EquipmentModifier.getItemSummary(activeCharacter.equipment, itemName);
        if (!summary) {
            return null;
        }

        // Check for attunement curse specifically
        const modifications = summary.effects ? getItemModifications(itemName) : [];
        const hasAttunement = modifications.some(
            mod => mod.source === 'curse' && mod.id.includes('attunement')
        );

        return {
            isEnchanted: summary.isEnchanted,
            isCursed: summary.isCursed,
            hasAttunementCurse: hasAttunement,
            modifications,
            combinedEffects: summary.effects
        };
    }, [activeCharacter, getItemModifications]);

    /**
     * Check if an item is enchanted
     */
    const isEnchanted = useCallback((itemName: string): boolean => {
        if (!activeCharacter?.equipment) {
            return false;
        }

        return EquipmentModifier.isEnchanted(activeCharacter.equipment, itemName);
    }, [activeCharacter]);

    /**
     * Check if an item is cursed
     */
    const isCursed = useCallback((itemName: string): boolean => {
        if (!activeCharacter?.equipment) {
            return false;
        }

        return EquipmentModifier.isCursed(activeCharacter.equipment, itemName);
    }, [activeCharacter]);

    /**
     * Check if an item has the attunement curse (locks the item)
     */
    const hasAttunementCurse = useCallback((itemName: string): boolean => {
        const modifications = getItemModifications(itemName);
        return modifications.some(
            mod => mod.source === 'curse' && mod.id.includes('attunement')
        );
    }, [getItemModifications]);

    return {
        activeCharacter,
        isLoading,
        enchantItem,
        curseItem,
        disenchantItem,
        liftCurse,
        removeModification,
        getItemModifications,
        getItemModificationInfo,
        isEnchanted,
        isCursed,
        hasAttunementCurse
    };
};
