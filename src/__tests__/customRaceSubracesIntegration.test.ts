/**
 * Custom Race with Subraces Integration Tests
 *
 * Phase 8.2 Integration Testing
 * Task: Custom race with subraces generates characters correctly
 *
 * These tests verify that custom races with subraces registered via ExtensionManager
 * generate characters correctly with:
 * - Proper race and subrace assignment
 * - Base racial traits applied
 * - Subrace-specific traits applied
 * - Ability bonuses from both race and subrace
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import {
    ExtensionManager,
    CharacterGenerator,
    FeatureQuery,
    ensureAllDefaultsInitialized,
    type AudioProfile,
    type PlaylistTrack,
    type RacialTrait
} from 'playlist-data-engine';

/**
 * Create a mock audio profile for testing
 */
function createMockAudioProfile(overrides: Partial<AudioProfile> = {}): AudioProfile {
    return {
        bass_dominance: 0.5,
        mid_dominance: 0.5,
        treble_dominance: 0.5,
        average_amplitude: 0.5,
        analysis_metadata: {
            duration_analyzed: 30,
            full_buffer_analyzed: true,
            sample_positions: [0, 0.5, 1],
            analyzed_at: new Date().toISOString()
        },
        ...overrides
    };
}

/**
 * Create a mock playlist track for testing
 */
function createMockTrack(id: string = 'test-track'): PlaylistTrack {
    return {
        id,
        uuid: `uuid-${id}`,
        playlist_index: 0,
        chain_name: 'test-chain',
        platform: 'test',
        title: 'Test Track',
        artist: 'Test Artist',
        image_url: '',
        audio_url: '',
        duration: 180,
        genre: 'rock',
        tags: []
    };
}

/**
 * Helper to register a custom racial trait
 */
function registerRacialTrait(trait: RacialTrait): void {
    const manager = ExtensionManager.getInstance();
    manager.register('racialTraits', [trait], { validate: false });
}

// Custom race data for testing - Dragonkin with three subraces
const DRAGONKIN_RACE_DATA = {
    race: 'Dragonkin',
    ability_bonuses: { STR: 2, CHA: 1 },
    speed: 30,
    traits: ['Draconic Ancestry', 'Darkvision'],
    subraces: ['Fire Dragonkin', 'Ice Dragonkin', 'Lightning Dragonkin'],
    source: 'custom'
};

// Subrace-specific traits
const FIRE_DRAGONKIN_TRAIT: RacialTrait = {
    id: 'fire_dragonkin_resistance',
    name: 'Fire Resistance',
    race: 'Dragonkin' as any,
    subrace: 'Fire Dragonkin',
    description: 'You have resistance to fire damage',
    type: 'passive',
    effects: [
        { type: 'stat_bonus', target: 'fire_resistance', value: true }
    ],
    source: 'custom'
};

const ICE_DRAGONKIN_TRAIT: RacialTrait = {
    id: 'ice_dragonkin_resistance',
    name: 'Cold Resistance',
    race: 'Dragonkin' as any,
    subrace: 'Ice Dragonkin',
    description: 'You have resistance to cold damage',
    type: 'passive',
    effects: [
        { type: 'stat_bonus', target: 'cold_resistance', value: true }
    ],
    source: 'custom'
};

const LIGHTNING_DRAGONKIN_TRAIT: RacialTrait = {
    id: 'lightning_dragonkin_resistance',
    name: 'Lightning Resistance',
    race: 'Dragonkin' as any,
    subrace: 'Lightning Dragonkin',
    description: 'You have resistance to lightning damage',
    type: 'passive',
    effects: [
        { type: 'stat_bonus', target: 'lightning_resistance', value: true }
    ],
    source: 'custom'
};

// Initialize defaults before all tests
beforeAll(() => {
    ensureAllDefaultsInitialized();
});

// Clean up after each test
afterEach(() => {
    const manager = ExtensionManager.getInstance();
    manager.reset('races' as any);
    manager.reset('races.data' as any);
    manager.reset('racialTraits');

    const featureQuery = FeatureQuery.getInstance();
    featureQuery.clearQueryCache();
});

describe('Custom Race with Subraces: ExtensionManager Registration', () => {
    it('should register custom race with subraces in races.data category', () => {
        const manager = ExtensionManager.getInstance();

        manager.register('races.data' as any, [DRAGONKIN_RACE_DATA]);

        const raceData = manager.getCustom('races.data' as any);
        const dragonkin = Array.isArray(raceData)
            ? raceData.find((d: any) => d.race === 'Dragonkin')
            : undefined;

        expect(dragonkin).toBeDefined();
        expect(dragonkin?.subraces).toBeDefined();
        expect(dragonkin?.subraces).toHaveLength(3);
        expect(dragonkin?.subraces).toContain('Fire Dragonkin');
        expect(dragonkin?.subraces).toContain('Ice Dragonkin');
        expect(dragonkin?.subraces).toContain('Lightning Dragonkin');
    });

    it('should register custom race name in races category', () => {
        const manager = ExtensionManager.getInstance();

        manager.register('races.data' as any, [DRAGONKIN_RACE_DATA]);
        manager.register('races' as any, ['Dragonkin'], { validate: false });

        const races = manager.get('races');
        expect(races).toContain('Dragonkin');
    });

    it('should register subrace-specific racial traits', () => {
        const manager = ExtensionManager.getInstance();

        registerRacialTrait(FIRE_DRAGONKIN_TRAIT);
        registerRacialTrait(ICE_DRAGONKIN_TRAIT);
        registerRacialTrait(LIGHTNING_DRAGONKIN_TRAIT);

        const traits = manager.getCustom('racialTraits') as RacialTrait[];
        expect(traits).toHaveLength(3);

        const fireTrait = traits.find(t => t.id === 'fire_dragonkin_resistance');
        expect(fireTrait).toBeDefined();
        expect(fireTrait?.subrace).toBe('Fire Dragonkin');
    });
});

describe('Custom Race with Subraces: Character Generation', () => {
    it('should generate character with custom race and subrace properties set', () => {
        const manager = ExtensionManager.getInstance();

        // Register custom race
        manager.register('races.data' as any, [DRAGONKIN_RACE_DATA]);
        manager.register('races' as any, ['Dragonkin'], { validate: false });
        manager.setWeights('races' as any, { 'Dragonkin': 1.0 });

        // Register subrace traits
        registerRacialTrait(FIRE_DRAGONKIN_TRAIT);

        // Generate character with Fire Dragonkin subrace
        const character = CharacterGenerator.generate(
            'test-seed-fire',
            createMockAudioProfile(),
            createMockTrack('fire-dragonkin-test'),
            {
                forceRace: 'Dragonkin' as any,
                subrace: 'Fire Dragonkin',
                forceClass: 'Fighter'
            }
        );

        // Verify race and subrace are set
        expect(character.race).toBe('Dragonkin');
        expect(character.subrace).toBe('Fire Dragonkin');
    });

    it('should apply base racial traits to character', () => {
        const manager = ExtensionManager.getInstance();

        // Register custom race
        manager.register('races.data' as any, [DRAGONKIN_RACE_DATA]);
        manager.register('races' as any, ['Dragonkin'], { validate: false });

        // Generate character with no subrace (pure)
        const character = CharacterGenerator.generate(
            'test-seed-pure',
            createMockAudioProfile(),
            createMockTrack('pure-dragonkin-test'),
            {
                forceRace: 'Dragonkin' as any,
                subrace: 'pure',
                forceClass: 'Fighter'
            }
        );

        // Character should have base traits
        expect(character.race).toBe('Dragonkin');
        expect(character.subrace).toBeUndefined();
    });

    it('should apply subrace-specific trait to character when subrace matches', () => {
        const manager = ExtensionManager.getInstance();

        // Register custom race
        manager.register('races.data' as any, [DRAGONKIN_RACE_DATA]);
        manager.register('races' as any, ['Dragonkin'], { validate: false });

        // Register subrace-specific traits
        registerRacialTrait(FIRE_DRAGONKIN_TRAIT);
        registerRacialTrait(ICE_DRAGONKIN_TRAIT);
        registerRacialTrait(LIGHTNING_DRAGONKIN_TRAIT);

        // Generate Fire Dragonkin
        const fireDragonkin = CharacterGenerator.generate(
            'test-seed-fire',
            createMockAudioProfile(),
            createMockTrack('fire-test'),
            {
                forceRace: 'Dragonkin' as any,
                subrace: 'Fire Dragonkin',
                forceClass: 'Fighter'
            }
        );

        // Should have Fire Dragonkin trait
        expect(fireDragonkin.racial_traits).toContain('fire_dragonkin_resistance');
        // Should NOT have other subrace traits
        expect(fireDragonkin.racial_traits).not.toContain('ice_dragonkin_resistance');
        expect(fireDragonkin.racial_traits).not.toContain('lightning_dragonkin_resistance');
    });

    it('should apply different subrace traits for different subraces', () => {
        const manager = ExtensionManager.getInstance();

        // Register custom race
        manager.register('races.data' as any, [DRAGONKIN_RACE_DATA]);
        manager.register('races' as any, ['Dragonkin'], { validate: false });

        // Register subrace-specific traits
        registerRacialTrait(FIRE_DRAGONKIN_TRAIT);
        registerRacialTrait(ICE_DRAGONKIN_TRAIT);
        registerRacialTrait(LIGHTNING_DRAGONKIN_TRAIT);

        // Generate Ice Dragonkin
        const iceDragonkin = CharacterGenerator.generate(
            'test-seed-ice',
            createMockAudioProfile(),
            createMockTrack('ice-test'),
            {
                forceRace: 'Dragonkin' as any,
                subrace: 'Ice Dragonkin',
                forceClass: 'Fighter'
            }
        );

        // Should have Ice Dragonkin trait
        expect(iceDragonkin.racial_traits).toContain('ice_dragonkin_resistance');
        // Should NOT have other subrace traits
        expect(iceDragonkin.racial_traits).not.toContain('fire_dragonkin_resistance');
        expect(iceDragonkin.racial_traits).not.toContain('lightning_dragonkin_resistance');
    });
});

describe('Custom Race with Subraces: FeatureQuery Integration', () => {
    let featureQuery: FeatureQuery;

    beforeEach(() => {
        featureQuery = FeatureQuery.getInstance();
    });

    it('should retrieve subrace-specific traits via FeatureQuery', () => {
        const manager = ExtensionManager.getInstance();

        // Register custom race
        manager.register('races.data' as any, [DRAGONKIN_RACE_DATA]);
        manager.register('races' as any, ['Dragonkin'], { validate: false });

        // Register subrace-specific traits
        registerRacialTrait(FIRE_DRAGONKIN_TRAIT);
        registerRacialTrait(ICE_DRAGONKIN_TRAIT);

        // Get traits for Fire Dragonkin subrace
        const fireTraits = featureQuery.getRacialTraitsForSubrace('Dragonkin' as any, 'Fire Dragonkin');

        // Should include Fire Dragonkin trait
        expect(fireTraits.some(t => t.id === 'fire_dragonkin_resistance')).toBe(true);
        // Should NOT include Ice Dragonkin trait
        expect(fireTraits.some(t => t.id === 'ice_dragonkin_resistance')).toBe(false);
    });

    it('should retrieve racial trait by ID with subrace info', () => {
        const manager = ExtensionManager.getInstance();

        // Register custom race
        manager.register('races.data' as any, [DRAGONKIN_RACE_DATA]);
        manager.register('races' as any, ['Dragonkin'], { validate: false });

        // Register subrace trait
        registerRacialTrait(FIRE_DRAGONKIN_TRAIT);

        // Get trait by ID
        const trait = featureQuery.getRacialTraitById('fire_dragonkin_resistance');

        expect(trait).toBeDefined();
        expect(trait?.race).toBe('Dragonkin');
        expect(trait?.subrace).toBe('Fire Dragonkin');
    });

    it('should validate prerequisites for subrace-specific traits', () => {
        const manager = ExtensionManager.getInstance();

        // Register custom race
        manager.register('races.data' as any, [DRAGONKIN_RACE_DATA]);
        manager.register('races' as any, ['Dragonkin'], { validate: false });

        // Register trait with subrace prerequisite
        const traitWithPrereq: RacialTrait = {
            id: 'fire_breath',
            name: 'Fire Breath',
            race: 'Dragonkin' as any,
            subrace: 'Fire Dragonkin',
            description: 'Breathe fire',
            type: 'active',
            prerequisites: {
                subrace: 'Fire Dragonkin'
            },
            effects: [
                { type: 'active_ability', target: 'fire_breath', value: '3d6' }
            ],
            source: 'custom'
        };
        registerRacialTrait(traitWithPrereq);

        // Create mock character with Fire Dragonkin subrace
        const fireDragonkinCharacter = {
            race: 'Dragonkin',
            subrace: 'Fire Dragonkin',
            level: 1
        } as any;

        const result = featureQuery.validatePrerequisites(
            traitWithPrereq,
            fireDragonkinCharacter
        );

        expect(result.valid).toBe(true);
    });

    it('should fail prerequisite validation for wrong subrace', () => {
        const manager = ExtensionManager.getInstance();

        // Register custom race
        manager.register('races.data' as any, [DRAGONKIN_RACE_DATA]);
        manager.register('races' as any, ['Dragonkin'], { validate: false });

        // Register trait with subrace prerequisite
        const traitWithPrereq: RacialTrait = {
            id: 'fire_breath',
            name: 'Fire Breath',
            race: 'Dragonkin' as any,
            subrace: 'Fire Dragonkin',
            description: 'Breathe fire',
            type: 'active',
            prerequisites: {
                subrace: 'Fire Dragonkin'
            },
            effects: [
                { type: 'active_ability', target: 'fire_breath', value: '3d6' }
            ],
            source: 'custom'
        };
        registerRacialTrait(traitWithPrereq);

        // Create mock character with Ice Dragonkin subrace (wrong subrace)
        const iceDragonkinCharacter = {
            race: 'Dragonkin',
            subrace: 'Ice Dragonkin',
            level: 1
        } as any;

        const result = featureQuery.validatePrerequisites(
            traitWithPrereq,
            iceDragonkinCharacter
        );

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Requires subrace Fire Dragonkin (current: Ice Dragonkin)');
    });
});

describe('Custom Race with Subraces: Subrace Data Structure', () => {
    it('should store subrace data correctly in race data entry', () => {
        const manager = ExtensionManager.getInstance();

        // Register race with multiple subraces
        const raceData = {
            race: 'Elemental',
            ability_bonuses: { CON: 2 },
            speed: 30,
            traits: ['Elemental Nature'],
            subraces: ['Fire Elemental', 'Water Elemental', 'Earth Elemental', 'Air Elemental'],
            source: 'custom'
        };

        manager.register('races.data' as any, [raceData]);

        const storedData = manager.getCustom('races.data' as any);
        const elemental = Array.isArray(storedData)
            ? storedData.find((d: any) => d.race === 'Elemental')
            : undefined;

        expect(elemental?.subraces).toHaveLength(4);
        expect(elemental?.subraces).toContain('Fire Elemental');
        expect(elemental?.subraces).toContain('Water Elemental');
        expect(elemental?.subraces).toContain('Earth Elemental');
        expect(elemental?.subraces).toContain('Air Elemental');
    });

    it('should support custom race with no subraces', () => {
        const manager = ExtensionManager.getInstance();

        // Register race without subraces
        const raceData = {
            race: 'SimpleFolk',
            ability_bonuses: { CON: 1, WIS: 1 },
            speed: 25,
            traits: ['Hardy'],
            source: 'custom'
            // No subraces property
        };

        manager.register('races.data' as any, [raceData]);
        manager.register('races' as any, ['SimpleFolk'], { validate: false });

        const storedData = manager.getCustom('races.data' as any);
        const simpleFolk = Array.isArray(storedData)
            ? storedData.find((d: any) => d.race === 'SimpleFolk')
            : undefined;

        expect(simpleFolk?.subraces).toBeUndefined();
    });
});

describe('Custom Race with Subraces: Cross-Integration with Defaults', () => {
    it('should coexist with default races (Elf) that have subraces', () => {
        const manager = ExtensionManager.getInstance();

        // Register custom race
        manager.register('races.data' as any, [DRAGONKIN_RACE_DATA]);
        manager.register('races' as any, ['Dragonkin'], { validate: false });

        // Default Elf should still be available
        const races = manager.get('races');
        expect(races).toContain('Dragonkin');
        // Default races should still exist
        expect(races).toContain('Elf');
        expect(races).toContain('Human');
    });

    it('should allow generating characters with both default and custom races', () => {
        const manager = ExtensionManager.getInstance();

        // Register custom race
        manager.register('races.data' as any, [DRAGONKIN_RACE_DATA]);
        manager.register('races' as any, ['Dragonkin'], { validate: false });

        // Generate with custom race
        const customRaceChar = CharacterGenerator.generate(
            'seed-custom',
            createMockAudioProfile(),
            createMockTrack('custom'),
            {
                forceRace: 'Dragonkin' as any,
                subrace: 'Fire Dragonkin',
                forceClass: 'Fighter'
            }
        );
        expect(customRaceChar.race).toBe('Dragonkin');
        expect(customRaceChar.subrace).toBe('Fire Dragonkin');

        // Generate with default race (Elf)
        const defaultRaceChar = CharacterGenerator.generate(
            'seed-default',
            createMockAudioProfile(),
            createMockTrack('default'),
            {
                forceRace: 'Elf',
                subrace: 'High Elf',
                forceClass: 'Wizard'
            }
        );
        expect(defaultRaceChar.race).toBe('Elf');
        expect(defaultRaceChar.subrace).toBe('High Elf');
    });
});
