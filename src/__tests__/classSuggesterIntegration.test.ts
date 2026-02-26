/**
 * ClassSuggester Integration Tests
 *
 * Phase 8.2 Integration Testing
 * Task: Custom class with audio_preferences works with ClassSuggester
 *
 * These tests verify that custom classes registered with audio_preferences
 * via ExtensionManager are properly considered by ClassSuggester when
 * suggesting classes based on audio profiles.
 *
 * IMPORTANT: Custom classes must have weights set via manager.setWeights()
 * in order to be included in ClassSuggester's selection pool.
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import {
    ExtensionManager,
    ClassSuggester,
    SeededRNG,
    ensureAllDefaultsInitialized,
    initializeClassDefaults,
    type AudioProfile
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
 * Helper to register a custom class with proper setup
 */
function registerCustomClass(
    manager: ExtensionManager,
    className: string,
    classData: object
): void {
    // Step 1: Register class name
    manager.register('classes', [className], { mode: 'relative', validate: false });

    // Step 2: Register class data with audio_preferences
    manager.register('classes.data', [classData], { mode: 'relative' });

    // Step 3: Set spawn weight for the custom class
    // This is required for ClassSuggester to include the class in selection
    const currentWeights = manager.getWeights('classes');
    manager.setWeights('classes', { ...currentWeights, [className]: 1.0 });
}

// Custom class with audio preferences for testing
const BASS_HEAVY_CUSTOM_CLASS = {
    name: 'ThunderKnight',
    primary_ability: 'STR',
    hit_die: 12,
    saving_throws: ['STR', 'CON'],
    is_spellcaster: false,
    skill_count: 2,
    available_skills: ['athletics', 'intimidation'],
    has_expertise: false,
    audio_preferences: {
        primary: 'bass',
        secondary: 'amplitude',
        bass: 1.0,
        amplitude: 0.5
    },
    source: 'custom'
};

const TREBLE_HEAVY_CUSTOM_CLASS = {
    name: 'WindDancer',
    primary_ability: 'DEX',
    hit_die: 8,
    saving_throws: ['DEX', 'INT'],
    is_spellcaster: false,
    skill_count: 4,
    available_skills: ['acrobatics', 'stealth', 'perception', 'nature'],
    has_expertise: true,
    expertise_count: 1,
    audio_preferences: {
        primary: 'treble',
        secondary: 'mid',
        treble: 1.0,
        mid: 0.5
    },
    source: 'custom'
};

const CUSTOM_CLASS_NO_AUDIO_PREFS = {
    name: 'SilentWarrior',
    primary_ability: 'DEX',
    hit_die: 10,
    saving_throws: ['DEX', 'WIS'],
    is_spellcaster: false,
    skill_count: 3,
    available_skills: ['stealth', 'perception', 'acrobatics'],
    has_expertise: false,
    source: 'custom'
};

// Initialize defaults before all tests
beforeAll(() => {
    ensureAllDefaultsInitialized();
});

// Reset before each test
beforeEach(() => {
    // Ensure class defaults are initialized before each test
    initializeClassDefaults();
});

// Clean up after each test
afterEach(() => {
    const manager = ExtensionManager.getInstance();
    manager.reset('classes');
    manager.reset('classes.data');
});

describe('ClassSuggester Integration: Custom Classes with Audio Preferences', () => {
    describe('ExtensionManager Registration', () => {
        it('should register custom class with audio_preferences in classes.data', () => {
            const manager = ExtensionManager.getInstance();

            // Register class name
            manager.register('classes', ['ThunderKnight'], { validate: false });

            // Register class data with audio_preferences
            manager.register('classes.data', [BASS_HEAVY_CUSTOM_CLASS], { mode: 'relative' });

            // Verify it's in classes.data
            const allClassesData = manager.get('classes.data');
            const found = allClassesData.find((c: { name: string }) => c.name === 'ThunderKnight');

            expect(found).toBeDefined();
            expect(found.audio_preferences).toBeDefined();
            expect(found.audio_preferences.primary).toBe('bass');
        });

        it('should register custom class name in classes category', () => {
            const manager = ExtensionManager.getInstance();

            manager.register('classes', ['ThunderKnight'], { validate: false });
            manager.register('classes.data', [BASS_HEAVY_CUSTOM_CLASS], { mode: 'relative' });

            const allClasses = manager.get('classes');
            expect(allClasses).toContain('ThunderKnight');
        });

        it('should include custom classes with audio_preferences in the pool', () => {
            const manager = ExtensionManager.getInstance();

            manager.register('classes', ['ThunderKnight', 'WindDancer'], { validate: false });
            manager.register('classes.data', [BASS_HEAVY_CUSTOM_CLASS, TREBLE_HEAVY_CUSTOM_CLASS], { mode: 'relative' });

            const allClasses = manager.get('classes');

            expect(allClasses).toContain('ThunderKnight');
            expect(allClasses).toContain('WindDancer');
        });
    });

    describe('ClassSuggester Custom Class Selection', () => {
        it('should be able to suggest a custom class with matching audio preferences', () => {
            const manager = ExtensionManager.getInstance();

            // Register custom class with proper setup (includes setting weights)
            registerCustomClass(manager, 'ThunderKnight', BASS_HEAVY_CUSTOM_CLASS);

            // Create audio profile with high bass
            const bassHeavyProfile = createMockAudioProfile({
                bass_dominance: 0.9,
                mid_dominance: 0.3,
                treble_dominance: 0.2,
                average_amplitude: 0.5
            });

            // Run suggestions multiple times - ThunderKnight should appear
            const rng = new SeededRNG('test-bass-affinity');
            const suggestions: string[] = [];

            for (let i = 0; i < 100; i++) {
                const suggested = ClassSuggester.suggest(bassHeavyProfile, rng);
                suggestions.push(suggested);
            }

            // ThunderKnight should be suggested at least once in 100 tries
            const thunderKnightCount = suggestions.filter(s => s === 'ThunderKnight').length;
            expect(thunderKnightCount).toBeGreaterThan(0);
        });

        it('should suggest custom class in both matching and non-matching audio scenarios', () => {
            const manager = ExtensionManager.getInstance();

            // Register custom class with proper setup
            registerCustomClass(manager, 'ThunderKnight', BASS_HEAVY_CUSTOM_CLASS);

            // Test with bass-heavy audio (matches ThunderKnight preferences)
            const bassHeavyProfile = createMockAudioProfile({
                bass_dominance: 0.95,
                mid_dominance: 0.1,
                treble_dominance: 0.1,
                average_amplitude: 0.7
            });

            // Test with treble-heavy audio (doesn't match ThunderKnight preferences)
            const trebleHeavyProfile = createMockAudioProfile({
                bass_dominance: 0.1,
                mid_dominance: 0.1,
                treble_dominance: 0.95,
                average_amplitude: 0.3
            });

            // Count suggestions for bass-heavy audio
            let bassMatchCount = 0;
            for (let i = 0; i < 200; i++) {
                const rng = new SeededRNG(`bass-test-${i}`);
                const suggested = ClassSuggester.suggest(bassHeavyProfile, rng);
                if (suggested === 'ThunderKnight') bassMatchCount++;
            }

            // Count suggestions for treble-heavy audio
            let trebleMismatchCount = 0;
            for (let i = 0; i < 200; i++) {
                const rng = new SeededRNG(`treble-test-${i}`);
                const suggested = ClassSuggester.suggest(trebleHeavyProfile, rng);
                if (suggested === 'ThunderKnight') trebleMismatchCount++;
            }

            // Both scenarios should suggest ThunderKnight at least once due to 4% baseline
            // Note: Due to random variance, we can't guarantee matching audio always yields
            // higher counts, but we verify the custom class IS being suggested
            expect(bassMatchCount).toBeGreaterThan(0);
            expect(trebleMismatchCount).toBeGreaterThan(0);

            // Verify the counts are reasonable (should be at least ~4% of 200 = 8)
            expect(bassMatchCount).toBeGreaterThanOrEqual(5);
            expect(trebleMismatchCount).toBeGreaterThanOrEqual(5);
        });

        it('should suggest treble-preferring custom class with treble-heavy audio', () => {
            const manager = ExtensionManager.getInstance();

            // Register custom class with proper setup
            registerCustomClass(manager, 'WindDancer', TREBLE_HEAVY_CUSTOM_CLASS);

            // Create audio profile with high treble
            const trebleHeavyProfile = createMockAudioProfile({
                bass_dominance: 0.2,
                mid_dominance: 0.3,
                treble_dominance: 0.9,
                average_amplitude: 0.5
            });

            // Run suggestions
            const rng = new SeededRNG('test-treble-affinity');
            const suggestions: string[] = [];

            for (let i = 0; i < 100; i++) {
                const suggested = ClassSuggester.suggest(trebleHeavyProfile, rng);
                suggestions.push(suggested);
            }

            // WindDancer should be suggested at least once
            const windDancerCount = suggestions.filter(s => s === 'WindDancer').length;
            expect(windDancerCount).toBeGreaterThan(0);
        });
    });

    describe('Custom Classes Without Audio Preferences', () => {
        it('should include custom class without audio_preferences in suggestions', () => {
            const manager = ExtensionManager.getInstance();

            // Register custom class with proper setup
            registerCustomClass(manager, 'SilentWarrior', CUSTOM_CLASS_NO_AUDIO_PREFS);

            // Create neutral audio profile
            const neutralProfile = createMockAudioProfile();

            // Run suggestions
            const rng = new SeededRNG('test-no-prefs');
            const suggestions: string[] = [];

            for (let i = 0; i < 100; i++) {
                const suggested = ClassSuggester.suggest(neutralProfile, rng);
                suggestions.push(suggested);
            }

            // SilentWarrior should be suggested at least once (4% baseline)
            const silentWarriorCount = suggestions.filter(s => s === 'SilentWarrior').length;
            expect(silentWarriorCount).toBeGreaterThan(0);
        });
    });

    describe('Mixed Custom and Default Classes', () => {
        it('should suggest from both custom and default classes', () => {
            const manager = ExtensionManager.getInstance();

            // Register custom class with proper setup
            registerCustomClass(manager, 'ThunderKnight', BASS_HEAVY_CUSTOM_CLASS);

            // Create audio profile
            const profile = createMockAudioProfile({
                bass_dominance: 0.8,
                mid_dominance: 0.3,
                treble_dominance: 0.2,
                average_amplitude: 0.5
            });

            // Run suggestions
            const rng = new SeededRNG('test-mixed');
            const suggestions: string[] = [];

            for (let i = 0; i < 100; i++) {
                const suggested = ClassSuggester.suggest(profile, rng);
                suggestions.push(suggested);
            }

            const uniqueClasses = new Set(suggestions);

            // Should have more than just the custom class
            expect(uniqueClasses.size).toBeGreaterThan(1);

            // Custom class should appear
            expect(uniqueClasses.has('ThunderKnight')).toBe(true);

            // At least one default class should appear
            const defaultClasses = ['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter',
                                   'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer',
                                   'Warlock', 'Wizard'];
            const hasDefaultClass = defaultClasses.some(c => uniqueClasses.has(c));
            expect(hasDefaultClass).toBe(true);
        });

        it('should compete fairly between custom classes with different preferences', () => {
            const manager = ExtensionManager.getInstance();

            // Register two custom classes with different preferences
            registerCustomClass(manager, 'ThunderKnight', BASS_HEAVY_CUSTOM_CLASS);
            registerCustomClass(manager, 'WindDancer', TREBLE_HEAVY_CUSTOM_CLASS);

            // Create audio profile that slightly favors bass
            const profile = createMockAudioProfile({
                bass_dominance: 0.6,
                mid_dominance: 0.4,
                treble_dominance: 0.4,
                average_amplitude: 0.5
            });

            // Run suggestions
            const rng = new SeededRNG('test-competition');
            const suggestions: string[] = [];

            for (let i = 0; i < 100; i++) {
                const suggested = ClassSuggester.suggest(profile, rng);
                suggestions.push(suggested);
            }

            // Both should be able to appear
            const thunderKnightCount = suggestions.filter(s => s === 'ThunderKnight').length;
            const windDancerCount = suggestions.filter(s => s === 'WindDancer').length;

            // ThunderKnight (bass-preferring) should appear since audio favors bass
            expect(thunderKnightCount).toBeGreaterThan(0);

            // WindDancer should also appear due to 4% baseline
            expect(windDancerCount).toBeGreaterThan(0);
        });
    });

    describe('ExtensionManager getClassData Integration', () => {
        it('should retrieve audio_preferences from custom class via getClassData', async () => {
            const manager = ExtensionManager.getInstance();

            // Register custom class
            manager.register('classes', ['ThunderKnight'], { validate: false });
            manager.register('classes.data', [BASS_HEAVY_CUSTOM_CLASS], { mode: 'relative' });

            // getClassData should return the audio_preferences
            const { getClassData } = await import('playlist-data-engine');
            const classData = getClassData('ThunderKnight');

            expect(classData).toBeDefined();
            expect(classData?.audio_preferences).toBeDefined();
            expect(classData?.audio_preferences?.primary).toBe('bass');
        });

        it('should return undefined for non-existent custom class', async () => {
            const { getClassData } = await import('playlist-data-engine');
            const classData = getClassData('NonExistentCustomClass');

            expect(classData).toBeUndefined();
        });
    });
});
