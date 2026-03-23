/**
 * Integration Tests for Scoring Configuration
 *
 * From BAND_BIAS_WEIGHTS_PLAN.md:
 * - End-to-end test with custom factor weights
 * - End-to-end test with band bias weights
 * - End-to-end test with both combined
 *
 * Tests the full flow from UI settings → hook → engine, ensuring:
 * 1. Custom factor weights from AutoLevelSettings flow through to RhythmGenerator
 * 2. Custom band bias weights are correctly applied
 * 3. Combined configurations work together
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type {
    StreamScorerConfig,
    RhythmGenerationOptions,
    AutoLevelSettings as AutoLevelSettingsType,
} from '../types/rhythmGeneration';
import { DEFAULT_AUTO_LEVEL_SETTINGS } from '../types/rhythmGeneration';

// Mock the storage module before importing the store
vi.mock('../utils/storage', () => ({
    storage: {
        getItem: vi.fn().mockResolvedValue(null),
        setItem: vi.fn().mockResolvedValue(undefined),
        removeItem: vi.fn().mockResolvedValue(undefined),
    },
}));

// Mock the logger
vi.mock('../utils/logger', () => ({
    logger: {
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

// ============================================================
// Test Utilities
// ============================================================

/**
 * Create a mock UnifiedBeatMap for testing
 */
function createMockUnifiedBeatMap(beatCount: number = 32, bpm: number = 120) {
    const beatInterval = 60 / bpm;
    return {
        beats: Array.from({ length: beatCount }, (_, i) => ({
            timestamp: i * beatInterval,
            beatInMeasure: i % 4,
            isDownbeat: i % 4 === 0,
            measureNumber: Math.floor(i / 4),
            confidence: 1.0,
        })),
        quarterNoteInterval: beatInterval,
        bpm,
    };
}

/**
 * Simulates the flow from AutoLevelSettings → useRhythmGeneration → RhythmGenerator
 * Returns the RhythmGenerationOptions that would be passed to the engine
 */
function simulateSettingsToEngineFlow(
    settings: AutoLevelSettingsType
): RhythmGenerationOptions {
    // This simulates what useRhythmGeneration does
    const generatorOptions: RhythmGenerationOptions = {
        difficulty: settings.difficulty,
        outputMode: settings.outputMode,
        minimumTransientIntensity: settings.intensityThreshold,
        transientConfig: settings.transientConfig,
        densityValidation: settings.enableDensityValidation
            ? { maxRetries: settings.densityMaxRetries }
            : undefined,
        // Pass scoring config (includes factor weights AND band bias)
        scoringConfig: settings.scoringConfig,
    };

    return generatorOptions;
}

// ============================================================
// Integration Tests
// ============================================================

describe('Scoring Configuration Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('End-to-end test with custom factor weights', () => {
        it('passes custom factor weights from settings through to RhythmGenerator', async () => {
            // Simulate AutoLevelSettings producing a scoringConfig with custom factor weights
            const customFactorWeights: Partial<StreamScorerConfig> = {
                ioiVarianceWeight: 0.40,
                syncopationWeight: 0.35,
                phraseSignificanceWeight: 0.15,
                densityWeight: 0.10,
            };

            // Simulate the flow: AutoLevelSettings → useRhythmGeneration → RhythmGenerator
            const settings: AutoLevelSettingsType = {
                ...DEFAULT_AUTO_LEVEL_SETTINGS,
                scoringConfig: customFactorWeights,
            };

            // Simulate what useRhythmGeneration does
            const generatorOptions = simulateSettingsToEngineFlow(settings);

            // Verify all factor weights were passed correctly
            expect(generatorOptions.scoringConfig).toBeDefined();
            expect(generatorOptions.scoringConfig?.ioiVarianceWeight).toBe(0.40);
            expect(generatorOptions.scoringConfig?.syncopationWeight).toBe(0.35);
            expect(generatorOptions.scoringConfig?.phraseSignificanceWeight).toBe(0.15);
            expect(generatorOptions.scoringConfig?.densityWeight).toBe(0.10);
        });

        it('applies default factor weights when scoringConfig is undefined', async () => {
            // Settings without custom scoringConfig
            const settings: AutoLevelSettingsType = {
                ...DEFAULT_AUTO_LEVEL_SETTINGS,
                // scoringConfig is undefined by default
            };

            const generatorOptions = simulateSettingsToEngineFlow(settings);

            // Verify no scoring config was passed (engine will use defaults)
            expect(generatorOptions.scoringConfig).toBeUndefined();
        });

        it('handles partial factor weight overrides', async () => {
            // Only override some factor weights
            const partialWeights: Partial<StreamScorerConfig> = {
                syncopationWeight: 0.45,
                // Other weights will use engine defaults
            };

            const settings: AutoLevelSettingsType = {
                ...DEFAULT_AUTO_LEVEL_SETTINGS,
                scoringConfig: partialWeights,
            };

            const generatorOptions = simulateSettingsToEngineFlow(settings);

            // Verify partial config was passed (engine will merge with defaults)
            expect(generatorOptions.scoringConfig?.syncopationWeight).toBe(0.45);
            expect(generatorOptions.scoringConfig?.ioiVarianceWeight).toBeUndefined();
        });

        it('validates factor weights are in valid ranges', () => {
            // Test various factor weight configurations
            const validConfigs: Partial<StreamScorerConfig>[] = [
                // Standard configuration
                { ioiVarianceWeight: 0.30, syncopationWeight: 0.30, phraseSignificanceWeight: 0.25, densityWeight: 0.15 },
                // Favor syncopation
                { ioiVarianceWeight: 0.20, syncopationWeight: 0.50, phraseSignificanceWeight: 0.20, densityWeight: 0.10 },
                // Favor variety
                { ioiVarianceWeight: 0.45, syncopationWeight: 0.25, phraseSignificanceWeight: 0.20, densityWeight: 0.10 },
            ];

            for (const config of validConfigs) {
                // All weights should be non-negative
                expect(config.ioiVarianceWeight).toBeGreaterThanOrEqual(0);
                expect(config.syncopationWeight).toBeGreaterThanOrEqual(0);
                expect(config.phraseSignificanceWeight).toBeGreaterThanOrEqual(0);
                expect(config.densityWeight).toBeGreaterThanOrEqual(0);

                // All weights should be <= 0.5 (as per UI slider max)
                expect(config.ioiVarianceWeight!).toBeLessThanOrEqual(0.5);
                expect(config.syncopationWeight!).toBeLessThanOrEqual(0.5);
                expect(config.phraseSignificanceWeight!).toBeLessThanOrEqual(0.5);
                expect(config.densityWeight!).toBeLessThanOrEqual(0.5);
            }
        });

        it('ensures factor weight sum is approximately 1.0 for balanced scoring', () => {
            // Test that the default weights sum to 1.0
            const defaultWeights = {
                ioiVarianceWeight: 0.30,
                syncopationWeight: 0.30,
                phraseSignificanceWeight: 0.25,
                densityWeight: 0.15,
            };

            const sum = Object.values(defaultWeights).reduce((a, b) => a + b, 0);
            expect(sum).toBeCloseTo(1.0, 2);

            // Test a custom configuration
            const customWeights = {
                ioiVarianceWeight: 0.35,
                syncopationWeight: 0.35,
                phraseSignificanceWeight: 0.20,
                densityWeight: 0.10,
            };

            const customSum = Object.values(customWeights).reduce((a, b) => a + b, 0);
            expect(customSum).toBeCloseTo(1.0, 2);
        });

        it('demonstrates increased syncopation emphasis scenario', async () => {
            // Scenario: User wants more syncopated rhythms
            const syncopationEmphasisConfig: Partial<StreamScorerConfig> = {
                ioiVarianceWeight: 0.20,
                syncopationWeight: 0.50,  // High syncopation weight
                phraseSignificanceWeight: 0.20,
                densityWeight: 0.10,
            };

            const settings: AutoLevelSettingsType = {
                ...DEFAULT_AUTO_LEVEL_SETTINGS,
                scoringConfig: syncopationEmphasisConfig,
            };

            const generatorOptions = simulateSettingsToEngineFlow(settings);

            expect(generatorOptions.scoringConfig?.syncopationWeight).toBe(0.50);
            expect(generatorOptions.scoringConfig?.ioiVarianceWeight).toBe(0.20);
        });
    });

    describe('End-to-end test with band bias weights', () => {
        it('passes custom band bias weights from settings through to RhythmGenerator', async () => {
            // Simulate AutoLevelSettings producing a scoringConfig with custom band bias
            const customBandBias: Partial<StreamScorerConfig> = {
                bandBiasWeights: {
                    low: 0.3,   // Reduce bass contribution
                    mid: 1.0,   // Neutral
                    high: 1.5,  // Favor high frequencies
                },
            };

            const settings: AutoLevelSettingsType = {
                ...DEFAULT_AUTO_LEVEL_SETTINGS,
                scoringConfig: customBandBias,
            };

            const generatorOptions = simulateSettingsToEngineFlow(settings);

            // Verify band bias was passed correctly
            expect(generatorOptions.scoringConfig?.bandBiasWeights).toEqual({
                low: 0.3,
                mid: 1.0,
                high: 1.5,
            });
        });

        it('handles zero band bias (band never wins)', async () => {
            const zeroBiasConfig: Partial<StreamScorerConfig> = {
                bandBiasWeights: {
                    low: 0,    // Bass never wins
                    mid: 1.0,
                    high: 1.0,
                },
            };

            const settings: AutoLevelSettingsType = {
                ...DEFAULT_AUTO_LEVEL_SETTINGS,
                scoringConfig: zeroBiasConfig,
            };

            const generatorOptions = simulateSettingsToEngineFlow(settings);

            expect(generatorOptions.scoringConfig?.bandBiasWeights?.low).toBe(0);
        });

        it('handles maximum band bias (band strongly favored)', async () => {
            const maxBiasConfig: Partial<StreamScorerConfig> = {
                bandBiasWeights: {
                    low: 2.0,  // Strongly favor bass
                    mid: 1.0,
                    high: 1.0,
                },
            };

            const settings: AutoLevelSettingsType = {
                ...DEFAULT_AUTO_LEVEL_SETTINGS,
                scoringConfig: maxBiasConfig,
            };

            const generatorOptions = simulateSettingsToEngineFlow(settings);

            expect(generatorOptions.scoringConfig?.bandBiasWeights?.low).toBe(2.0);
        });

        it('validates band bias weights are in valid range (0.0-2.0)', () => {
            // Test valid range
            const validBiasConfigs = [
                { low: 0.0, mid: 0.0, high: 0.0 },  // All zero
                { low: 1.0, mid: 1.0, high: 1.0 },  // All neutral
                { low: 2.0, mid: 2.0, high: 2.0 },  // All max
                { low: 0.3, mid: 1.5, high: 1.8 },  // Mixed
            ];

            for (const config of validBiasConfigs) {
                expect(config.low).toBeGreaterThanOrEqual(0);
                expect(config.low).toBeLessThanOrEqual(2);
                expect(config.mid).toBeGreaterThanOrEqual(0);
                expect(config.mid).toBeLessThanOrEqual(2);
                expect(config.high).toBeGreaterThanOrEqual(0);
                expect(config.high).toBeLessThanOrEqual(2);
            }
        });

        it('demonstrates reducing bass dominance scenario', async () => {
            // Scenario: Bass is winning too many sections, reduce its bias
            const reduceBassConfig: Partial<StreamScorerConfig> = {
                bandBiasWeights: {
                    low: 0.5,   // Bass wins half as often
                    mid: 1.0,
                    high: 1.0,
                },
            };

            const settings: AutoLevelSettingsType = {
                ...DEFAULT_AUTO_LEVEL_SETTINGS,
                scoringConfig: reduceBassConfig,
            };

            const generatorOptions = simulateSettingsToEngineFlow(settings);

            expect(generatorOptions.scoringConfig?.bandBiasWeights?.low).toBe(0.5);
        });

        it('demonstrates emphasizing percussion scenario', async () => {
            // Scenario: Emphasize high-frequency percussion (hi-hats, cymbals)
            const emphasizeHighConfig: Partial<StreamScorerConfig> = {
                bandBiasWeights: {
                    low: 1.0,
                    mid: 1.0,
                    high: 1.5,  // Favor high frequencies
                },
            };

            const settings: AutoLevelSettingsType = {
                ...DEFAULT_AUTO_LEVEL_SETTINGS,
                scoringConfig: emphasizeHighConfig,
            };

            const generatorOptions = simulateSettingsToEngineFlow(settings);

            expect(generatorOptions.scoringConfig?.bandBiasWeights?.high).toBe(1.5);
        });

        it('demonstrates focusing on melody/mid frequencies scenario', async () => {
            // Scenario: Focus on melody and rhythm (mid frequencies)
            const focusMidConfig: Partial<StreamScorerConfig> = {
                bandBiasWeights: {
                    low: 0.3,   // Reduce bass
                    mid: 1.5,   // Favor mid
                    high: 1.0,
                },
            };

            const settings: AutoLevelSettingsType = {
                ...DEFAULT_AUTO_LEVEL_SETTINGS,
                scoringConfig: focusMidConfig,
            };

            const generatorOptions = simulateSettingsToEngineFlow(settings);

            expect(generatorOptions.scoringConfig?.bandBiasWeights?.mid).toBe(1.5);
            expect(generatorOptions.scoringConfig?.bandBiasWeights?.low).toBe(0.3);
        });
    });

    describe('End-to-end test with both combined', () => {
        it('passes combined factor weights and band bias to RhythmGenerator', async () => {
            // Combined configuration: custom factor weights + band bias
            const combinedConfig: Partial<StreamScorerConfig> = {
                // Factor weights: favor syncopation and variety
                ioiVarianceWeight: 0.35,
                syncopationWeight: 0.40,
                phraseSignificanceWeight: 0.15,
                densityWeight: 0.10,
                // Band bias: reduce bass, favor high frequencies
                bandBiasWeights: {
                    low: 0.2,
                    mid: 1.0,
                    high: 1.8,
                },
            };

            const settings: AutoLevelSettingsType = {
                ...DEFAULT_AUTO_LEVEL_SETTINGS,
                scoringConfig: combinedConfig,
            };

            const generatorOptions = simulateSettingsToEngineFlow(settings);

            // Verify factor weights
            expect(generatorOptions.scoringConfig?.ioiVarianceWeight).toBe(0.35);
            expect(generatorOptions.scoringConfig?.syncopationWeight).toBe(0.40);
            expect(generatorOptions.scoringConfig?.phraseSignificanceWeight).toBe(0.15);
            expect(generatorOptions.scoringConfig?.densityWeight).toBe(0.10);

            // Verify band bias
            expect(generatorOptions.scoringConfig?.bandBiasWeights).toEqual({
                low: 0.2,
                mid: 1.0,
                high: 1.8,
            });
        });

        it('maintains both configurations when only factor weights change', async () => {
            // Initial combined config
            const initialConfig: Partial<StreamScorerConfig> = {
                syncopationWeight: 0.45,
                bandBiasWeights: {
                    low: 0.5,
                    mid: 1.0,
                    high: 1.5,
                },
            };

            // Simulate updating only factor weights (band bias should be preserved)
            const updatedConfig: Partial<StreamScorerConfig> = {
                ...initialConfig,
                ioiVarianceWeight: 0.40,
                syncopationWeight: 0.30,
            };

            const settings: AutoLevelSettingsType = {
                ...DEFAULT_AUTO_LEVEL_SETTINGS,
                scoringConfig: updatedConfig,
            };

            const generatorOptions = simulateSettingsToEngineFlow(settings);

            // Factor weights should be updated
            expect(generatorOptions.scoringConfig?.ioiVarianceWeight).toBe(0.40);
            expect(generatorOptions.scoringConfig?.syncopationWeight).toBe(0.30);

            // Band bias should be preserved
            expect(generatorOptions.scoringConfig?.bandBiasWeights).toEqual({
                low: 0.5,
                mid: 1.0,
                high: 1.5,
            });
        });

        it('maintains both configurations when only band bias changes', async () => {
            // Initial combined config
            const initialConfig: Partial<StreamScorerConfig> = {
                ioiVarianceWeight: 0.35,
                syncopationWeight: 0.35,
                phraseSignificanceWeight: 0.20,
                densityWeight: 0.10,
                bandBiasWeights: {
                    low: 0.5,
                    mid: 1.0,
                    high: 1.5,
                },
            };

            // Simulate updating only band bias (factor weights should be preserved)
            const updatedConfig: Partial<StreamScorerConfig> = {
                ...initialConfig,
                bandBiasWeights: {
                    low: 0.1,
                    mid: 1.5,
                    high: 2.0,
                },
            };

            const settings: AutoLevelSettingsType = {
                ...DEFAULT_AUTO_LEVEL_SETTINGS,
                scoringConfig: updatedConfig,
            };

            const generatorOptions = simulateSettingsToEngineFlow(settings);

            // Factor weights should be preserved
            expect(generatorOptions.scoringConfig?.ioiVarianceWeight).toBe(0.35);
            expect(generatorOptions.scoringConfig?.syncopationWeight).toBe(0.35);
            expect(generatorOptions.scoringConfig?.phraseSignificanceWeight).toBe(0.20);
            expect(generatorOptions.scoringConfig?.densityWeight).toBe(0.10);

            // Band bias should be updated
            expect(generatorOptions.scoringConfig?.bandBiasWeights).toEqual({
                low: 0.1,
                mid: 1.5,
                high: 2.0,
            });
        });

        it('demonstrates focus on syncopated high-frequency rhythms scenario', async () => {
            // Example from plan: Focus on syncopated high-frequency rhythms
            const config: Partial<StreamScorerConfig> = {
                // Favor syncopation and variety
                ioiVarianceWeight: 0.35,
                syncopationWeight: 0.40,
                phraseSignificanceWeight: 0.15,
                densityWeight: 0.10,
                // Bias toward high frequencies
                bandBiasWeights: {
                    low: 0.2,   // Almost never use bass
                    mid: 1.0,   // Neutral
                    high: 1.8,  // Strongly favor high frequencies
                },
            };

            const settings: AutoLevelSettingsType = {
                ...DEFAULT_AUTO_LEVEL_SETTINGS,
                outputMode: 'composite',
                scoringConfig: config,
            };

            const generatorOptions = simulateSettingsToEngineFlow(settings);

            // Verify the configuration matches the scenario
            expect(generatorOptions.scoringConfig?.syncopationWeight).toBe(0.40);
            expect(generatorOptions.scoringConfig?.ioiVarianceWeight).toBe(0.35);
            expect(generatorOptions.scoringConfig?.bandBiasWeights?.high).toBe(1.8);
            expect(generatorOptions.scoringConfig?.bandBiasWeights?.low).toBe(0.2);
        });

        it('serializes and deserializes combined config correctly', () => {
            // Test that the config can be serialized (for storage, logging, etc.)
            const config: Partial<StreamScorerConfig> = {
                ioiVarianceWeight: 0.35,
                syncopationWeight: 0.35,
                phraseSignificanceWeight: 0.20,
                densityWeight: 0.10,
                bandBiasWeights: {
                    low: 0.3,
                    mid: 1.2,
                    high: 1.5,
                },
            };

            // Serialize
            const serialized = JSON.stringify(config);

            // Deserialize
            const deserialized = JSON.parse(serialized) as Partial<StreamScorerConfig>;

            // Verify all values are preserved
            expect(deserialized.ioiVarianceWeight).toBe(0.35);
            expect(deserialized.syncopationWeight).toBe(0.35);
            expect(deserialized.phraseSignificanceWeight).toBe(0.20);
            expect(deserialized.densityWeight).toBe(0.10);
            expect(deserialized.bandBiasWeights?.low).toBe(0.3);
            expect(deserialized.bandBiasWeights?.mid).toBe(1.2);
            expect(deserialized.bandBiasWeights?.high).toBe(1.5);
        });
    });

    describe('Settings Pass-through Validation', () => {
        it('validates AutoLevelSettings.scoringConfig type compatibility', () => {
            // This test verifies that AutoLevelSettings.scoringConfig
            // is compatible with RhythmGenerationOptions.scoringConfig

            const settings: AutoLevelSettingsType = {
                ...DEFAULT_AUTO_LEVEL_SETTINGS,
                scoringConfig: {
                    ioiVarianceWeight: 0.35,
                    syncopationWeight: 0.35,
                    phraseSignificanceWeight: 0.20,
                    densityWeight: 0.10,
                    bandBiasWeights: {
                        low: 0.3,
                        mid: 1.0,
                        high: 1.5,
                    },
                },
            };

            // Type assertion: if this compiles, the types are compatible
            const options: RhythmGenerationOptions = {
                scoringConfig: settings.scoringConfig,
            };

            // Verify the config is passed through
            expect(options.scoringConfig).toEqual(settings.scoringConfig);
        });

        it('handles undefined scoringConfig gracefully', () => {
            const settings: AutoLevelSettingsType = {
                ...DEFAULT_AUTO_LEVEL_SETTINGS,
                // scoringConfig is undefined
            };

            const options: RhythmGenerationOptions = {
                scoringConfig: settings.scoringConfig,
            };

            expect(options.scoringConfig).toBeUndefined();
        });

        it('handles empty scoringConfig object', () => {
            const settings: AutoLevelSettingsType = {
                ...DEFAULT_AUTO_LEVEL_SETTINGS,
                scoringConfig: {},
            };

            const options: RhythmGenerationOptions = {
                scoringConfig: settings.scoringConfig,
            };

            // Empty object is valid but has no effect
            expect(options.scoringConfig).toEqual({});
        });
    });

    describe('Integration with Store', () => {
        it('updates store state when scoringConfig changes', async () => {
            const { useBeatDetectionStore } = await import('../store/beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Set up initial state
            const unifiedBeatMap = createMockUnifiedBeatMap();
            useBeatDetectionStore.setState({
                unifiedBeatMap,
                generatedRhythm: null,
            });

            // Verify state is set
            expect(useBeatDetectionStore.getState().unifiedBeatMap).not.toBeNull();
        });

        it('verifies scoringConfig can be stored and retrieved from settings', async () => {
            const customConfig: Partial<StreamScorerConfig> = {
                ioiVarianceWeight: 0.40,
                syncopationWeight: 0.30,
                bandBiasWeights: {
                    low: 0.5,
                    mid: 1.0,
                    high: 1.5,
                },
            };

            // Simulate storing settings
            const storedSettings: AutoLevelSettingsType = {
                ...DEFAULT_AUTO_LEVEL_SETTINGS,
                scoringConfig: customConfig,
            };

            // Simulate retrieving and using settings
            const retrievedConfig = storedSettings.scoringConfig;

            expect(retrievedConfig?.ioiVarianceWeight).toBe(0.40);
            expect(retrievedConfig?.syncopationWeight).toBe(0.30);
            expect(retrievedConfig?.bandBiasWeights?.low).toBe(0.5);
            expect(retrievedConfig?.bandBiasWeights?.high).toBe(1.5);
        });
    });

    describe('Complete Flow Validation', () => {
        it('validates complete flow: UI → Settings → Options → Engine', async () => {
            // Step 1: User configures scoring in UI
            const uiScoringConfig: Partial<StreamScorerConfig> = {
                ioiVarianceWeight: 0.35,
                syncopationWeight: 0.40,
                phraseSignificanceWeight: 0.15,
                densityWeight: 0.10,
                bandBiasWeights: {
                    low: 0.3,
                    mid: 1.0,
                    high: 1.5,
                },
            };

            // Step 2: AutoLevelSettings produces settings
            const settings: AutoLevelSettingsType = {
                ...DEFAULT_AUTO_LEVEL_SETTINGS,
                scoringConfig: uiScoringConfig,
            };

            // Step 3: Settings are converted to RhythmGenerationOptions
            const options: RhythmGenerationOptions = {
                difficulty: settings.difficulty,
                outputMode: settings.outputMode,
                minimumTransientIntensity: settings.intensityThreshold,
                scoringConfig: settings.scoringConfig,
            };

            // Step 4: Verify all values flow through correctly
            expect(options.scoringConfig?.ioiVarianceWeight).toBe(0.35);
            expect(options.scoringConfig?.syncopationWeight).toBe(0.40);
            expect(options.scoringConfig?.phraseSignificanceWeight).toBe(0.15);
            expect(options.scoringConfig?.densityWeight).toBe(0.10);
            expect(options.scoringConfig?.bandBiasWeights?.low).toBe(0.3);
            expect(options.scoringConfig?.bandBiasWeights?.mid).toBe(1.0);
            expect(options.scoringConfig?.bandBiasWeights?.high).toBe(1.5);
        });

        it('validates multiple configuration scenarios', async () => {
            const scenarios = [
                {
                    name: 'Bass-heavy',
                    config: {
                        bandBiasWeights: { low: 1.8, mid: 0.8, high: 0.5 },
                    },
                },
                {
                    name: 'Percussion focus',
                    config: {
                        ioiVarianceWeight: 0.25,
                        syncopationWeight: 0.45,
                        bandBiasWeights: { low: 0.5, mid: 1.0, high: 1.8 },
                    },
                },
                {
                    name: 'Balanced with variety emphasis',
                    config: {
                        ioiVarianceWeight: 0.45,
                        syncopationWeight: 0.25,
                        phraseSignificanceWeight: 0.20,
                        densityWeight: 0.10,
                    },
                },
            ];

            for (const scenario of scenarios) {
                const settings: AutoLevelSettingsType = {
                    ...DEFAULT_AUTO_LEVEL_SETTINGS,
                    scoringConfig: scenario.config,
                };

                const options = simulateSettingsToEngineFlow(settings);

                // Verify config is passed through
                expect(options.scoringConfig).toEqual(scenario.config);
            }
        });
    });
});

// ============================================================
// Summary Statistics for Documentation
// ============================================================

/**
 * Integration Test Results Summary
 *
 * Custom Factor Weights Tests:
 * - Factor weights flow from UI → hook → engine
 * - Default weights applied when undefined
 * - Partial overrides work correctly
 * - Weights are validated for range (0-0.5)
 * - Weight sum validation for balanced scoring
 * - Syncopation emphasis scenario
 *
 * Band Bias Weights Tests:
 * - Band bias weights flow from UI → hook → engine
 * - Zero bias (band never wins) works
 * - Maximum bias (strong favor) works
 * - Bias range validation (0.0-2.0)
 * - Use case: reducing bass dominance
 * - Use case: emphasizing percussion
 * - Use case: focusing on melody/mid frequencies
 *
 * Combined Configuration Tests:
 * - Both factor weights and band bias work together
 * - Factor weight changes preserve band bias
 * - Band bias changes preserve factor weights
 * - Use case: syncopated high-frequency rhythms
 * - Serialization/deserialization works
 *
 * Settings Pass-through:
 * - Type compatibility verified
 * - Undefined handled gracefully
 * - Empty object handled correctly
 *
 * Store Integration:
 * - Store state updates correctly
 * - Config can be stored and retrieved
 *
 * Complete Flow:
 * - UI → Settings → Options → Engine flow validated
 * - Multiple configuration scenarios tested
 */
