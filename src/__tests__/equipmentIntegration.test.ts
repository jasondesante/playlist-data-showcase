/**
 * Equipment Integration Tests
 *
 * Phase 8.2 Integration Testing
 * Task 8.2.1: Equipment creation in DataViewerTab appears in ItemsTab
 *
 * These tests verify that equipment created via useContentCreator
 * (as used by DataViewerTab) is properly registered with ExtensionManager
 * and can be spawned/looked up as expected by ItemsTab.
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
const TEST_CUSTOM_EQUIPMENT_NAME = 'Test Integration Sword';
const TEST_CUSTOM_EQUIPMENT: EnhancedEquipment = {
    name: TEST_CUSTOM_EQUIPMENT_NAME,
    type: 'weapon',
    rarity: 'rare',
    weight: 3,
    damage: { dice: '1d8', damageType: 'slashing' },
    spawnWeight: 1.0,
    source: 'custom',
    tags: ['test', 'integration']
};

// Initialize defaults before all tests
beforeAll(() => {
    ensureAllDefaultsInitialized();
    ensureEquipmentDefaultsInitialized();
});

// Clean up after each test
afterEach(() => {
    // Reset equipment to defaults and remove custom test items
    const manager = ExtensionManager.getInstance();
    manager.reset('equipment');
    // Re-initialize defaults
    ensureEquipmentDefaultsInitialized();
});

describe('Equipment Integration: DataViewerTab to ItemsTab', () => {
    describe('ExtensionManager Registration', () => {
        it('should register custom equipment and make it available via get()', () => {
            // This simulates what useContentCreator.createContent() does
            const manager = ExtensionManager.getInstance();

            // Register custom equipment (like DataViewerTab does)
            manager.register('equipment', [TEST_CUSTOM_EQUIPMENT], {
                mode: 'relative',
                validate: false
            });

            // Verify it's in the equipment list (like useDataViewer/useLootBox would see)
            const allEquipment = manager.get('equipment') as EnhancedEquipment[];
            const found = allEquipment.find(e => e.name === TEST_CUSTOM_EQUIPMENT_NAME);

            expect(found).toBeDefined();
            expect(found?.type).toBe('weapon');
            expect(found?.rarity).toBe('rare');
            expect(found?.source).toBe('custom');
        });

        it('should mark custom equipment with source="custom"', () => {
            const manager = ExtensionManager.getInstance();

            const customItem: EnhancedEquipment = {
                ...TEST_CUSTOM_EQUIPMENT,
                name: 'Custom Marked Item'
            };

            manager.register('equipment', [customItem], { mode: 'relative' });

            const allEquipment = manager.get('equipment') as EnhancedEquipment[];
            const found = allEquipment.find(e => e.name === 'Custom Marked Item');

            expect(found).toBeDefined();
            expect(found?.source).toBe('custom');
        });

        it('should get custom equipment via getCustom()', () => {
            const manager = ExtensionManager.getInstance();

            manager.register('equipment', [TEST_CUSTOM_EQUIPMENT], { mode: 'relative' });

            const customEquipment = manager.getCustom('equipment') as EnhancedEquipment[];
            const found = customEquipment.find(e => e.name === TEST_CUSTOM_EQUIPMENT_NAME);

            expect(found).toBeDefined();
        });
    });

    describe('EquipmentSpawnHelper Integration', () => {
        it('should be able to spawn custom equipment by name', () => {
            const manager = ExtensionManager.getInstance();

            // Register custom equipment with spawnWeight > 0
            const customItem: EnhancedEquipment = {
                ...TEST_CUSTOM_EQUIPMENT,
                name: 'Spawnable Custom Sword',
                spawnWeight: 1.0
            };
            manager.register('equipment', [customItem], { mode: 'relative' });

            // Spawn by name (like ItemsTab does via spawnFromList)
            const spawned = EquipmentSpawnHelper.spawnFromList(['Spawnable Custom Sword']);
            const filtered = spawned.filter((item): item is EnhancedEquipment => item !== undefined);

            expect(filtered.length).toBeGreaterThan(0);
            expect(filtered[0]?.name).toBe('Spawnable Custom Sword');
        });

        it('should include custom equipment in spawnRandom pool', () => {
            const manager = ExtensionManager.getInstance();

            // Register a unique custom item with high spawn weight
            const uniqueName = `Unique Test Item ${Date.now()}`;
            const customItem: EnhancedEquipment = {
                name: uniqueName,
                type: 'item',
                rarity: 'legendary',
                weight: 0,
                spawnWeight: 100.0, // Very high weight to ensure it spawns
                source: 'custom'
            };
            manager.register('equipment', [customItem], { mode: 'relative' });

            // Try spawning many items, looking for our custom item
            const rng = new SeededRNG(`test_${Date.now()}`);
            let found = false;

            // Spawn multiple batches to increase chances
            for (let i = 0; i < 10 && !found; i++) {
                const items = EquipmentSpawnHelper.spawnRandom(20, rng, { excludeZeroWeight: true });
                found = items.some(item => item?.name === uniqueName);
            }

            // With spawnWeight of 100, it should definitely be found
            expect(found).toBe(true);
        });

        it('should spawn custom equipment by rarity', () => {
            const manager = ExtensionManager.getInstance();

            // Register a rare custom item
            const customItem: EnhancedEquipment = {
                ...TEST_CUSTOM_EQUIPMENT,
                name: 'Rare Custom Test Item',
                rarity: 'rare',
                spawnWeight: 1.0
            };
            manager.register('equipment', [customItem], { mode: 'relative' });

            // Spawn rare items
            const rng = new SeededRNG('rarity_test');
            const rareItems = EquipmentSpawnHelper.spawnByRarity('rare', 50, rng);

            // Check if our custom item is in the results
            const found = rareItems.some(item => item?.name === 'Rare Custom Test Item');
            expect(found).toBe(true);
        });
    });

    describe('Equipment Lookup (useHeroEquipment pattern)', () => {
        it('should find custom equipment when looking up by name', () => {
            const manager = ExtensionManager.getInstance();

            // Register custom equipment
            manager.register('equipment', [TEST_CUSTOM_EQUIPMENT], { mode: 'relative' });

            // Simulate useHeroEquipment.getEquipmentData() lookup
            const allEquipment = manager.get('equipment') as EnhancedEquipment[];
            const found = allEquipment.find(e => e.name === TEST_CUSTOM_EQUIPMENT_NAME);

            expect(found).toBeDefined();
            expect(found?.damage?.dice).toBe('1d8');
        });

        it('should return correct equipment properties', () => {
            const manager = ExtensionManager.getInstance();

            // Register custom equipment with properties
            const customItem: EnhancedEquipment = {
                name: 'Property Test Item',
                type: 'weapon',
                rarity: 'very_rare',
                weight: 5,
                damage: { dice: '2d6', damageType: 'fire' },
                spawnWeight: 0.5,
                source: 'custom',
                properties: [
                    {
                        type: 'damage_bonus',
                        target: 'fire',
                        value: '1d6',
                        description: '+1d6 fire damage'
                    }
                ],
                tags: ['magic', 'fire']
            };
            manager.register('equipment', [customItem], { mode: 'relative' });

            // Look up the equipment
            const allEquipment = manager.get('equipment') as EnhancedEquipment[];
            const found = allEquipment.find(e => e.name === 'Property Test Item');

            expect(found).toBeDefined();
            expect(found?.properties).toBeDefined();
            expect(found?.properties?.length).toBe(1);
            expect(found?.tags).toContain('magic');
            expect(found?.tags).toContain('fire');
        });
    });

    describe('Spawn Mode Filtering', () => {
        it('should identify custom items with source="custom"', () => {
            const manager = ExtensionManager.getInstance();

            // Register custom equipment
            manager.register('equipment', [TEST_CUSTOM_EQUIPMENT], { mode: 'relative' });

            const allEquipment = manager.get('equipment') as EnhancedEquipment[];
            const customEquipment = manager.getCustom('equipment') as EnhancedEquipment[];

            // Verify we can filter to only custom items (for 'absolute' spawn mode)
            const customNames = new Set(customEquipment.map(e => e.name));
            const fromAllCustom = allEquipment.filter(e => e.source === 'custom');

            expect(customNames.has(TEST_CUSTOM_EQUIPMENT_NAME)).toBe(true);
            expect(fromAllCustom.some(e => e.name === TEST_CUSTOM_EQUIPMENT_NAME)).toBe(true);
        });

        it('should distinguish default from custom items', () => {
            const manager = ExtensionManager.getInstance();

            // Register custom equipment
            manager.register('equipment', [TEST_CUSTOM_EQUIPMENT], { mode: 'relative' });

            const allEquipment = manager.get('equipment') as EnhancedEquipment[];

            // Default items should have source='default' or undefined
            const longsword = allEquipment.find(e => e.name === 'Longsword');
            const customItem = allEquipment.find(e => e.name === TEST_CUSTOM_EQUIPMENT_NAME);

            // Default items exist
            expect(longsword).toBeDefined();
            // Custom items exist and are marked
            expect(customItem).toBeDefined();
            expect(customItem?.source).toBe('custom');
        });
    });

    describe('Cross-Component Integration Simulation', () => {
        it('should simulate full flow: create -> register -> spawn -> lookup', () => {
            const manager = ExtensionManager.getInstance();

            // Step 1: Create equipment (like DataViewerTab does via EquipmentCreatorForm)
            const newEquipment: EnhancedEquipment = {
                name: 'Full Flow Test Sword',
                type: 'weapon',
                rarity: 'legendary',
                weight: 4,
                damage: { dice: '1d10', damageType: 'slashing' },
                spawnWeight: 1.0,
                source: 'custom',
                tags: ['legendary', 'test']
            };

            // Step 2: Register with ExtensionManager (like useContentCreator.createContent)
            manager.register('equipment', [newEquipment], { mode: 'relative' });

            // Step 3: Verify it's available in the pool (like useDataViewer would see)
            const allEquipment = manager.get('equipment') as EnhancedEquipment[];
            const registered = allEquipment.find(e => e.name === 'Full Flow Test Sword');
            expect(registered).toBeDefined();

            // Step 4: Spawn it (like ItemsTab useLootBox would do)
            const spawned = EquipmentSpawnHelper.spawnFromList(['Full Flow Test Sword']);
            const filtered = spawned.filter((item): item is EnhancedEquipment => item !== undefined);
            expect(filtered.length).toBeGreaterThan(0);
            expect(filtered[0]?.name).toBe('Full Flow Test Sword');

            // Step 5: Look it up (like useHeroEquipment.getEquipmentData would do)
            const found = allEquipment.find(e => e.name === 'Full Flow Test Sword');
            expect(found).toBeDefined();
            expect(found?.damage?.dice).toBe('1d10');
        });
    });
});
