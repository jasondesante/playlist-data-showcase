/**
 * Global type declarations for the application.
 *
 * This file extends the Window interface to support debug utilities that are
 * attached to the window object for runtime inspection in the browser console.
 */

/**
 * Debug data stored when items are created via useItemCreator hook.
 * Useful for diagnosing equipment lookup issues in the ExtensionManager.
 *
 * Access via browser console: window.__itemCreatorDebug
 */
interface ItemCreatorDebugData {
    /** ISO timestamp when the debug data was captured */
    timestamp: string;
    /** Total number of equipment items in ExtensionManager */
    totalEquipmentCount: number;
    /** Number of custom equipment items in ExtensionManager */
    customEquipmentCount: number;
    /** Names of all equipment items (from base data) */
    allEquipmentNames: string[];
    /** Names of custom equipment items */
    customEquipmentNames: string[];
    /** Name of the last item that was registered */
    lastRegisteredItem: string;
    /** Whether the last registered item was found in base equipment data */
    itemFoundInAll: boolean;
    /** Whether the last registered item was found in custom equipment data */
    itemFoundInCustom: boolean;
}

declare global {
    interface Window {
        /**
         * Debug state for item creation diagnostics.
         * Updated whenever an item is added to a character's inventory.
         * Inspect in browser console: window.__itemCreatorDebug
         */
        __itemCreatorDebug?: ItemCreatorDebugData;
    }
}

export {};
