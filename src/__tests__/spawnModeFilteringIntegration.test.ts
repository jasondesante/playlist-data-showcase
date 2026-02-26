/**
 * Spawn Mode Filtering Integration Tests
 *
 * Phase 8.2 Integration Testing
 * Task: Spawn mode "absolute" filters to custom only
 *
 * These tests verify that spawn mode filtering correctly filters items
 * based on the current spawn mode setting, particularly that "absolute"
 * mode shows only custom items.
 *
 * Implementation Notes:
 * - ExtensionManager's get() method only handles 'replace' mode specially
 * - 'absolute' mode filtering is implemented at the React hook level (useDataViewer)
 * - These tests verify the ExtensionManager API supports the filtering pattern
 *   that useDataViewer uses (getCustom(), getDefaults(), setMode(), getMode())
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import {
    ExtensionManager,
    EquipmentSpawnHelper,
    SeededRNG,
    ensureAllDefaultsInitialized,
    ensureEquipmentDefaultsInitialized,
    type EnhancedEquipment
} from 'playlist-data-engine';

// Test constants
const TEST_CUSTOM_EQUIPMENT_NAME = 'Spawn Mode Test Custom Sword';
const TEST_CUSTOM_EQUIPMENT: EnhancedEquipment = {
    name: TEST_CUSTOM_EQUIPMENT_NAME,
    type: 'weapon',
    rarity: 'rare',
    weight: 3,
    damage: { dice: '1d8', damageType: 'slashing' },
    spawnWeight: 1.0,
    source: 'custom',
    tags: ['test', 'spawn-mode']
};

// Initialize defaults before all tests
beforeAll(() => {
    ensureAllDefaultsInitialized();
    ensureEquipmentDefaultsInitialized();
});

// Clean up after each test
afterEach(() => {
    const manager = ExtensionManager.getInstance();
    manager.reset('equipment');
    manager.setMode('equipment', 'relative');
    ensureEquipmentDefaultsInitialized();
});

// Reset before each test
beforeEach(() => {
    const manager = ExtensionManager.getInstance();
    // Ensure we start with defaults
    ensureEquipmentDefaultsInitialized();
});

describe('Spawn Mode Filtering: Absolute Mode Shows Only Custom Items', () => {
    describe('ExtensionManager Mode Setting', () => {
        it('should default to relative mode when no mode is set', () => {
            const manager = ExtensionManager.getInstance();

            // Reset to clear any previous mode
            manager.reset('equipment');

            // Get mode - should be undefined or 'relative' by default
            const mode = manager.getMode('equipment');

            // Mode can be undefined (not set) or 'relative' (default)
            expect(mode === undefined || mode === 'relative').toBe(true);
        });

        it('should be able to set spawn mode to absolute', () => {
            const manager = ExtensionManager.getInstance();

            // Set mode to absolute
            manager.setMode('equipment', 'absolute');

            // Verify mode is set
            const mode = manager.getMode('equipment');
            expect(mode).toBe('absolute');
        });

        it('should be able to switch between spawn modes', () => {
            const manager = ExtensionManager.getInstance();

            // Set to absolute
            manager.setMode('equipment', 'absolute');
            expect(manager.getMode('equipment')).toBe('absolute');

            // Change to relative
            manager.setMode('equipment', 'relative');
            expect(manager.getMode('equipment')).toBe('relative');

            // Change to default
            manager.setMode('equipment', 'default');
            expect(manager.getMode('equipment')).toBe('default');

            // Change to replace
            manager.setMode('equipment', 'replace');
            expect(manager.getMode('equipment')).toBe('replace');
        });
    });

    describe('Custom vs Default Item Identification', () => {
        it('should distinguish custom items from default items via source field', () => {
            const manager = ExtensionManager.getInstance();

            // Register custom equipment
            manager.register('equipment', [TEST_CUSTOM_EQUIPMENT], { mode: 'relative' });

            const allEquipment = manager.get('equipment') as EnhancedEquipment[];

            // Find custom and default items
            const customItem = allEquipment.find(e => e.name === TEST_CUSTOM_EQUIPMENT_NAME);
            const defaultItem = allEquipment.find(e => e.name === 'Longsword');

            // Custom item should have source='custom'
            expect(customItem).toBeDefined();
            expect(customItem?.source).toBe('custom');

            // Default items should have source='default' or undefined
            expect(defaultItem).toBeDefined();
            expect(defaultItem?.source === 'default' || defaultItem?.source === undefined).toBe(true);
        });

        it('should get only custom items via getCustom()', () => {
            const manager = ExtensionManager.getInstance();

            // Register custom equipment
            manager.register('equipment', [TEST_CUSTOM_EQUIPMENT], { mode: 'relative' });

            // Get custom items only
            const customEquipment = manager.getCustom('equipment') as EnhancedEquipment[];

            // Should contain our custom item
            expect(customEquipment.some(e => e.name === TEST_CUSTOM_EQUIPMENT_NAME)).toBe(true);

            // Should NOT contain default items like Longsword
            expect(customEquipment.some(e => e.name === 'Longsword')).toBe(false);
        });

        it('should get only default items via getDefaults()', () => {
            const manager = ExtensionManager.getInstance();

            // Register custom equipment
            manager.register('equipment', [TEST_CUSTOM_EQUIPMENT], { mode: 'relative' });

            // Get default items only
            const defaultEquipment = manager.getDefaults('equipment') as EnhancedEquipment[];

            // Should contain default items like Longsword
            expect(defaultEquipment.some(e => e.name === 'Longsword')).toBe(true);

            // Should NOT contain our custom item
            expect(defaultEquipment.some(e => e.name === TEST_CUSTOM_EQUIPMENT_NAME)).toBe(false);
        });
    });

    describe('Absolute Mode Filtering Pattern (useDataViewer pattern)', () => {
        /**
         * These tests verify the filtering pattern used by useDataViewer.getFilteredItems():
         *
         * const mode = getMode(category);
         * if (mode === 'absolute' || mode === 'replace') {
         *     return getCustomItems(category);
         * }
         * return getDataByCategory(category);
         *
         * ExtensionManager.getCustom() is the key method for absolute mode filtering.
         */

        it('should support filtering to custom items via getCustom() for absolute mode', () => {
            const manager = ExtensionManager.getInstance();

            // Register custom equipment
            manager.register('equipment', [TEST_CUSTOM_EQUIPMENT], { mode: 'relative' });

            // Set mode to absolute (application uses this to decide filtering)
            manager.setMode('equipment', 'absolute');

            // Application pattern: when mode is absolute, use getCustom() instead of get()
            const mode = manager.getMode('equipment');
            expect(mode).toBe('absolute');

            // When mode is absolute, application should use getCustom() to get filtered items
            const filteredItems = manager.getCustom('equipment') as EnhancedEquipment[];

            // Should contain custom items
            expect(filteredItems.some(e => e.name === TEST_CUSTOM_EQUIPMENT_NAME)).toBe(true);

            // Should NOT contain default items
            expect(filteredItems.some(e => e.name === 'Longsword')).toBe(false);
        });

        it('should return empty array from getCustom() when no custom items exist', () => {
            const manager = ExtensionManager.getInstance();

            // Don't register any custom items
            // Reset to ensure clean state
            manager.reset('equipment');
            ensureEquipmentDefaultsInitialized();

            // Set mode to absolute
            manager.setMode('equipment', 'absolute');

            // getCustom() should return empty array (no custom items)
            const customItems = manager.getCustom('equipment') as EnhancedEquipment[];

            expect(customItems.length).toBe(0);
        });

        it('should return all items from get() in relative mode', () => {
            const manager = ExtensionManager.getInstance();

            // Register custom equipment
            manager.register('equipment', [TEST_CUSTOM_EQUIPMENT], { mode: 'relative' });

            // Set mode to relative
            manager.setMode('equipment', 'relative');

            // In relative mode, application uses get() which returns all items
            const allItems = manager.get('equipment') as EnhancedEquipment[];

            // Should contain both custom and default items
            expect(allItems.some(e => e.name === TEST_CUSTOM_EQUIPMENT_NAME)).toBe(true);
            expect(allItems.some(e => e.name === 'Longsword')).toBe(true);
        });

        it('should support switching between modes and filtering accordingly', () => {
            const manager = ExtensionManager.getInstance();

            // Register custom equipment
            manager.register('equipment', [TEST_CUSTOM_EQUIPMENT], { mode: 'relative' });

            // === Test Absolute Mode ===
            manager.setMode('equipment', 'absolute');
            const absoluteMode = manager.getMode('equipment');
            expect(absoluteMode).toBe('absolute');

            // In absolute mode, filter to custom items
            const absoluteItems = manager.getCustom('equipment') as EnhancedEquipment[];
            expect(absoluteItems.some(e => e.name === TEST_CUSTOM_EQUIPMENT_NAME)).toBe(true);
            expect(absoluteItems.some(e => e.name === 'Longsword')).toBe(false);

            // === Test Relative Mode ===
            manager.setMode('equipment', 'relative');
            const relativeMode = manager.getMode('equipment');
            expect(relativeMode).toBe('relative');

            // In relative mode, show all items
            const relativeItems = manager.get('equipment') as EnhancedEquipment[];
            expect(relativeItems.some(e => e.name === TEST_CUSTOM_EQUIPMENT_NAME)).toBe(true);
            expect(relativeItems.some(e => e.name === 'Longsword')).toBe(true);

            // === Test Replace Mode ===
            manager.setMode('equipment', 'replace');
            const replaceMode = manager.getMode('equipment');
            expect(replaceMode).toBe('replace');

            // In replace mode, ExtensionManager.get() returns only custom items
            const replaceItems = manager.get('equipment') as EnhancedEquipment[];
            expect(replaceItems.some(e => e.name === TEST_CUSTOM_EQUIPMENT_NAME)).toBe(true);
            expect(replaceItems.some(e => e.name === 'Longsword')).toBe(false);
        });

        it('should handle multiple custom items in absolute mode filtering', () => {
            const manager = ExtensionManager.getInstance();

            // Register multiple custom items
            const customItems: EnhancedEquipment[] = [
                { ...TEST_CUSTOM_EQUIPMENT, name: 'Custom Weapon Alpha' },
                { ...TEST_CUSTOM_EQUIPMENT, name: 'Custom Weapon Beta', type: 'item' },
                { ...TEST_CUSTOM_EQUIPMENT, name: 'Custom Armor Gamma', type: 'armor' }
            ];

            manager.register('equipment', customItems, { mode: 'relative' });

            // Set mode to absolute
            manager.setMode('equipment', 'absolute');

            // Get filtered items via getCustom()
            const filteredItems = manager.getCustom('equipment') as EnhancedEquipment[];

            // All custom items should be present
            expect(filteredItems.some(e => e.name === 'Custom Weapon Alpha')).toBe(true);
            expect(filteredItems.some(e => e.name === 'Custom Weapon Beta')).toBe(true);
            expect(filteredItems.some(e => e.name === 'Custom Armor Gamma')).toBe(true);

            // Default items should NOT be present
            expect(filteredItems.some(e => e.name === 'Longsword')).toBe(false);
            expect(filteredItems.some(e => e.name === 'Leather Armor')).toBe(false);

            // Count should match number of custom items
            expect(filteredItems.length).toBe(3);
        });
    });

    describe('Spawn Mode Reset Behavior', () => {
        it('should clear mode and custom items after reset', () => {
            const manager = ExtensionManager.getInstance();

            // Register custom equipment
            manager.register('equipment', [TEST_CUSTOM_EQUIPMENT], { mode: 'relative' });

            // Set mode to absolute
            manager.setMode('equipment', 'absolute');

            // Verify custom items exist
            const customBeforeReset = manager.getCustom('equipment') as EnhancedEquipment[];
            expect(customBeforeReset.length).toBeGreaterThan(0);

            // Reset the category
            manager.reset('equipment');

            // Re-initialize defaults
            ensureEquipmentDefaultsInitialized();

            // Mode should be cleared
            const mode = manager.getMode('equipment');
            expect(mode === undefined || mode === 'relative').toBe(true);

            // Custom items should be cleared
            const customAfterReset = manager.getCustom('equipment') as EnhancedEquipment[];
            expect(customAfterReset.length).toBe(0);

            // Default items should be restored
            const defaults = manager.getDefaults('equipment') as EnhancedEquipment[];
            expect(defaults.some(e => e.name === 'Longsword')).toBe(true);
        });

        it('should return all default items after reset without re-initialization', () => {
            /**
             * Phase 8.2 Integration Testing
             * Task: Spawn mode reset returns all default items
             *
             * This test verifies that reset() preserves the default data.
             * The defaultData map is NOT cleared by reset() - only custom items are removed.
             * Therefore, getDefaults() should return all original defaults immediately after reset.
             */
            const manager = ExtensionManager.getInstance();

            // Get original default count before any modifications
            const originalDefaults = manager.getDefaults('equipment') as EnhancedEquipment[];
            const originalDefaultCount = originalDefaults.length;
            const originalDefaultNames = originalDefaults.map(e => e.name);

            // Register multiple custom items
            const customItems: EnhancedEquipment[] = [
                { ...TEST_CUSTOM_EQUIPMENT, name: 'Reset Test Item 1' },
                { ...TEST_CUSTOM_EQUIPMENT, name: 'Reset Test Item 2', type: 'armor' },
                { ...TEST_CUSTOM_EQUIPMENT, name: 'Reset Test Item 3', type: 'item' }
            ];
            manager.register('equipment', customItems, { mode: 'relative' });

            // Set mode to absolute
            manager.setMode('equipment', 'absolute');

            // Verify custom items exist
            const customBeforeReset = manager.getCustom('equipment') as EnhancedEquipment[];
            expect(customBeforeReset.length).toBe(3);

            // Verify combined list has defaults + custom
            const combinedBeforeReset = manager.get('equipment') as EnhancedEquipment[];
            expect(combinedBeforeReset.length).toBe(originalDefaultCount + 3);

            // === ACT: Reset the category ===
            manager.reset('equipment');

            // === ASSERTIONS: Defaults should be immediately available ===

            // 1. getDefaults() should return ALL original default items
            //    (no re-initialization needed - defaults persist through reset)
            const defaultsAfterReset = manager.getDefaults('equipment') as EnhancedEquipment[];
            expect(defaultsAfterReset.length).toBe(originalDefaultCount);

            // 2. All original default names should still be present
            for (const name of originalDefaultNames) {
                expect(defaultsAfterReset.some(e => e.name === name)).toBe(true);
            }

            // 3. Known default items should be present
            expect(defaultsAfterReset.some(e => e.name === 'Longsword')).toBe(true);
            expect(defaultsAfterReset.some(e => e.name === 'Leather Armor')).toBe(true);
            expect(defaultsAfterReset.some(e => e.name === 'Shield')).toBe(true);

            // 4. get() should now return only defaults (since custom items were cleared)
            const combinedAfterReset = manager.get('equipment') as EnhancedEquipment[];
            expect(combinedAfterReset.length).toBe(originalDefaultCount);

            // 5. Custom items should be completely removed
            const customAfterReset = manager.getCustom('equipment') as EnhancedEquipment[];
            expect(customAfterReset.length).toBe(0);

            // 6. Custom item names should NOT be in the combined list
            expect(combinedAfterReset.some(e => e.name === 'Reset Test Item 1')).toBe(false);
            expect(combinedAfterReset.some(e => e.name === 'Reset Test Item 2')).toBe(false);
            expect(combinedAfterReset.some(e => e.name === 'Reset Test Item 3')).toBe(false);

            // 7. Mode should be cleared
            const mode = manager.getMode('equipment');
            expect(mode === undefined || mode === 'relative').toBe(true);
        });

        it('should preserve defaults across multiple reset cycles', () => {
            /**
             * Additional test to ensure reset is idempotent and defaults persist
             * through multiple register/reset cycles.
             */
            const manager = ExtensionManager.getInstance();

            // Get original defaults
            const originalDefaults = manager.getDefaults('equipment') as EnhancedEquipment[];
            const originalDefaultCount = originalDefaults.length;

            // Perform multiple register/reset cycles
            for (let cycle = 0; cycle < 3; cycle++) {
                // Register custom items
                manager.register('equipment', [
                    { ...TEST_CUSTOM_EQUIPMENT, name: `Cycle ${cycle} Item` }
                ], { mode: 'relative' });

                // Set mode
                manager.setMode('equipment', 'absolute');

                // Verify custom exists
                expect(manager.getCustom('equipment').length).toBeGreaterThan(0);

                // Reset
                manager.reset('equipment');

                // Defaults should still be present with same count
                const defaults = manager.getDefaults('equipment') as EnhancedEquipment[];
                expect(defaults.length).toBe(originalDefaultCount);
                expect(defaults.some(e => e.name === 'Longsword')).toBe(true);
            }
        });
    });

    describe('Integration with EquipmentSpawnHelper', () => {
        it('should allow spawning custom items by name regardless of mode', () => {
            const manager = ExtensionManager.getInstance();

            // Register custom equipment
            const customItem: EnhancedEquipment = {
                name: 'Spawnable Absolute Mode Sword',
                type: 'weapon',
                rarity: 'legendary',
                weight: 5,
                damage: { dice: '2d10', damageType: 'slashing' },
                spawnWeight: 100.0,
                source: 'custom'
            };
            manager.register('equipment', [customItem], { mode: 'relative' });

            // Set mode to absolute
            manager.setMode('equipment', 'absolute');

            // Spawn by name should still work (spawnFromList uses name lookup)
            const spawned = EquipmentSpawnHelper.spawnFromList(['Spawnable Absolute Mode Sword']);
            const filtered = spawned.filter((item): item is EnhancedEquipment => item !== undefined);
            expect(filtered.length).toBeGreaterThan(0);
            expect(filtered[0]?.name).toBe('Spawnable Absolute Mode Sword');
            expect(filtered[0]?.source).toBe('custom');
        });

        it('should include custom items in random spawn pool', () => {
            const manager = ExtensionManager.getInstance();

            // Register a unique custom item with high spawn weight
            const uniqueName = `Unique Custom Item ${Date.now()}`;
            const customItem: EnhancedEquipment = {
                name: uniqueName,
                type: 'item',
                rarity: 'legendary',
                weight: 0,
                spawnWeight: 100.0, // Very high weight
                source: 'custom'
            };
            manager.register('equipment', [customItem], { mode: 'relative' });

            // Spawn multiple items, looking for our custom item
            const rng = new SeededRNG(`test_${Date.now()}`);
            let found = false;

            for (let i = 0; i < 10 && !found; i++) {
                const items = EquipmentSpawnHelper.spawnRandom(20, rng, { excludeZeroWeight: true });
                found = items.some(item => item?.name === uniqueName);
            }

            // With spawnWeight of 100, it should definitely be found
            expect(found).toBe(true);
        });
    });
});

describe('Spawn Mode Filtering: Cross-Category Behavior', () => {
    describe('Mode Independence Between Categories', () => {
        it('should maintain separate spawn modes for different categories', () => {
            const manager = ExtensionManager.getInstance();

            // Set different modes for different categories
            manager.setMode('equipment', 'absolute');
            manager.setMode('appearance.bodyTypes', 'relative');

            // Verify each category has its own mode
            expect(manager.getMode('equipment')).toBe('absolute');
            expect(manager.getMode('appearance.bodyTypes')).toBe('relative');
        });

        it('should filter equipment independently from other categories', () => {
            const manager = ExtensionManager.getInstance();

            // Register custom equipment
            manager.register('equipment', [TEST_CUSTOM_EQUIPMENT], { mode: 'relative' });

            // Set equipment to absolute mode
            manager.setMode('equipment', 'absolute');

            // Equipment custom items should be filterable
            const customEquipment = manager.getCustom('equipment') as EnhancedEquipment[];
            expect(customEquipment.some(e => e.name === 'Longsword')).toBe(false);

            // Other categories should have their own mode (not affected)
            const bodyTypesMode = manager.getMode('appearance.bodyTypes');
            // Body types mode should be whatever it was set to (or undefined)
            expect(bodyTypesMode === undefined || typeof bodyTypesMode === 'string').toBe(true);
        });
    });
});

describe('Spawn Mode Filtering: Edge Cases', () => {
    it('should handle rapid mode switching correctly', () => {
        const manager = ExtensionManager.getInstance();

        // Register custom equipment
        manager.register('equipment', [TEST_CUSTOM_EQUIPMENT], { mode: 'relative' });

        // Rapidly switch modes
        for (let i = 0; i < 10; i++) {
            manager.setMode('equipment', i % 2 === 0 ? 'absolute' : 'relative');
        }

        // Final mode should be relative (i=9, 9%2=1, so 'relative')
        manager.setMode('equipment', 'relative');
        const mode = manager.getMode('equipment');
        expect(mode).toBe('relative');

        // Items should still be accessible
        const items = manager.get('equipment') as EnhancedEquipment[];
        expect(items.some(e => e.name === TEST_CUSTOM_EQUIPMENT_NAME)).toBe(true);
        expect(items.some(e => e.name === 'Longsword')).toBe(true);
    });

    it('should handle registering additional custom items in absolute mode', () => {
        const manager = ExtensionManager.getInstance();

        // Register first custom item and set to absolute
        manager.register('equipment', [TEST_CUSTOM_EQUIPMENT], { mode: 'relative' });
        manager.setMode('equipment', 'absolute');

        // Register another custom item
        const secondItem: EnhancedEquipment = {
            name: 'Second Custom Item',
            type: 'item',
            rarity: 'common',
            weight: 1,
            spawnWeight: 1.0,
            source: 'custom'
        };
        manager.register('equipment', [secondItem], { mode: 'relative' });

        // getCustom() should show both custom items
        const customItems = manager.getCustom('equipment') as EnhancedEquipment[];
        expect(customItems.some(e => e.name === TEST_CUSTOM_EQUIPMENT_NAME)).toBe(true);
        expect(customItems.some(e => e.name === 'Second Custom Item')).toBe(true);

        // get() should still show defaults since ExtensionManager.get() doesn't filter for 'absolute'
        // (filtering is done at the hook level via getCustom())
        const allItems = manager.get('equipment') as EnhancedEquipment[];
        // This is expected behavior - application level filtering uses getCustom()
        expect(allItems.some(e => e.name === 'Longsword')).toBe(true);
    });
});

describe('Spawn Mode Filtering: Filtering Logic Validation', () => {
    /**
     * These tests validate the core filtering logic that useDataViewer.getFilteredItems() uses.
     * The pattern is:
     *   if (mode === 'absolute' || mode === 'replace') {
     *       return getCustomItems(category);
     *   }
     *   return getDataByCategory(category); // Returns all items
     */
    it('should validate the absolute mode filtering pattern', () => {
        const manager = ExtensionManager.getInstance();

        // Register custom equipment
        manager.register('equipment', [TEST_CUSTOM_EQUIPMENT], { mode: 'relative' });

        // === Simulate useDataViewer.getFilteredItems() logic ===

        // Test 1: Absolute mode
        manager.setMode('equipment', 'absolute');
        const mode1 = manager.getMode('equipment');
        let filteredItems1: EnhancedEquipment[];

        if (mode1 === 'absolute' || mode1 === 'replace') {
            // Filter to custom items only
            filteredItems1 = manager.getCustom('equipment') as EnhancedEquipment[];
        } else {
            filteredItems1 = manager.get('equipment') as EnhancedEquipment[];
        }

        // Verify: custom items present, default items NOT present
        expect(filteredItems1.some(e => e.name === TEST_CUSTOM_EQUIPMENT_NAME)).toBe(true);
        expect(filteredItems1.some(e => e.name === 'Longsword')).toBe(false);

        // Test 2: Relative mode
        manager.setMode('equipment', 'relative');
        const mode2 = manager.getMode('equipment');
        let filteredItems2: EnhancedEquipment[];

        if (mode2 === 'absolute' || mode2 === 'replace') {
            filteredItems2 = manager.getCustom('equipment') as EnhancedEquipment[];
        } else {
            filteredItems2 = manager.get('equipment') as EnhancedEquipment[];
        }

        // Verify: both custom and default items present
        expect(filteredItems2.some(e => e.name === TEST_CUSTOM_EQUIPMENT_NAME)).toBe(true);
        expect(filteredItems2.some(e => e.name === 'Longsword')).toBe(true);

        // Test 3: Replace mode
        manager.setMode('equipment', 'replace');
        const mode3 = manager.getMode('equipment');
        let filteredItems3: EnhancedEquipment[];

        if (mode3 === 'absolute' || mode3 === 'replace') {
            filteredItems3 = manager.getCustom('equipment') as EnhancedEquipment[];
        } else {
            filteredItems3 = manager.get('equipment') as EnhancedEquipment[];
        }

        // Verify: custom items present, default items NOT present
        expect(filteredItems3.some(e => e.name === TEST_CUSTOM_EQUIPMENT_NAME)).toBe(true);
        expect(filteredItems3.some(e => e.name === 'Longsword')).toBe(false);
    });
});
