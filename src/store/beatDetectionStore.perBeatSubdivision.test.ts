/**
 * Tests for beatDetectionStore per-beat subdivision actions
 *
 * Phase 8, Task 8.2: Store Tests
 * - Test per-beat actions
 * - Test selection state management
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { UnifiedBeatMap, SubdivisionConfig, SubdivisionType } from '@/types';

// Mock the storage module before importing the store
vi.mock('@/utils/storage', () => ({
    storage: {
        getItem: vi.fn().mockResolvedValue(null),
        setItem: vi.fn().mockResolvedValue(undefined),
        removeItem: vi.fn().mockResolvedValue(undefined),
    },
}));

// Mock the logger
vi.mock('@/utils/logger', () => ({
    logger: {
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

/**
 * Helper to create a mock unified beat map with the specified number of beats.
 */
function createMockUnifiedBeatMap(beatCount: number, quarterNoteInterval: number = 0.5): UnifiedBeatMap {
    return {
        audioId: 'test-audio-id',
        duration: beatCount * quarterNoteInterval,
        beats: Array.from({ length: beatCount }, (_, i) => ({
            timestamp: i * quarterNoteInterval,
            beatInMeasure: i % 4,
            isDownbeat: i % 4 === 0,
            measureNumber: Math.floor(i / 4),
            confidence: 1.0,
            intensity: 0.8,
        })),
        detectedBeatIndices: Array.from({ length: beatCount }, (_, i) => i),
        quarterNoteInterval,
        quarterNoteBpm: 60 / quarterNoteInterval,
        downbeatConfig: {
            segments: [{
                startBeat: 0,
                downbeatBeatIndex: 0,
                timeSignature: { beatsPerMeasure: 4 },
            }],
        },
        originalMetadata: {
            generatedAt: Date.now(),
            algorithmVersion: '1.0.0',
        },
    };
}

/**
 * Create a mock for the playlist-data-engine module with per-beat support.
 */
function createEngineMock() {
    return {
        BeatMapGenerator: vi.fn().mockImplementation(() => ({
            generateBeatMap: vi.fn().mockResolvedValue({
                beats: [],
                bpm: 120,
                audioId: 'test-audio-id',
                duration: 100,
                metadata: { generatedAt: Date.now(), algorithmVersion: '1.0.0' },
            }),
            cancel: vi.fn(),
        })),
        BeatInterpolator: vi.fn().mockImplementation(() => ({
            interpolate: vi.fn().mockImplementation((beatMap) => ({
                ...beatMap,
                detectedBeats: beatMap.beats || [],
                mergedBeats: (beatMap.beats || []).map((b: { timestamp: number }) => ({
                    ...b,
                    source: 'detected' as const,
                })),
                quarterNoteInterval: 0.5,
                metadata: {},
            })),
        })),
        BeatSubdivider: vi.fn().mockImplementation(() => ({
            subdivide: vi.fn().mockImplementation((unifiedMap: UnifiedBeatMap, config: SubdivisionConfig) => {
                // Create a mock subdivided beat map based on the config
                const beats: Array<{
                    timestamp: number;
                    beatInMeasure: number;
                    isDownbeat: boolean;
                    measureNumber: number;
                    confidence: number;
                    intensity: number;
                    subdivisionType: SubdivisionType;
                    originalBeatIndex: number;
                }> = [];

                for (let i = 0; i < unifiedMap.beats.length; i++) {
                    const subdivision = config.beatSubdivisions.get(i) ?? config.defaultSubdivision;
                    beats.push({
                        timestamp: unifiedMap.beats[i].timestamp,
                        beatInMeasure: unifiedMap.beats[i].beatInMeasure,
                        isDownbeat: unifiedMap.beats[i].isDownbeat,
                        measureNumber: unifiedMap.beats[i].measureNumber,
                        confidence: 1.0,
                        intensity: 0.8,
                        subdivisionType: subdivision,
                        originalBeatIndex: i,
                    });
                }

                return {
                    audioId: unifiedMap.audioId,
                    duration: unifiedMap.duration,
                    beats,
                    detectedBeatIndices: unifiedMap.detectedBeatIndices,
                    subdivisionConfig: config,
                    downbeatConfig: unifiedMap.downbeatConfig,
                    subdivisionMetadata: {
                        totalBeats: beats.length,
                        subdivisionTypesUsed: [...new Set(beats.map(b => b.subdivisionType))],
                        averageDensity: 1,
                        averageDensityMultiplier: 1,
                        originalBeatCount: unifiedMap.beats.length,
                        subdividedBeatCount: beats.length,
                        explicitBeatCount: config.beatSubdivisions.size,
                        subdivisionsUsed: [...new Set(beats.map(b => b.subdivisionType))],
                        hasMultipleTempos: false,
                        maxDensity: 1,
                    },
                };
            }),
        })),
        unifyBeatMap: vi.fn().mockImplementation((interpolatedMap: { mergedBeats: unknown[]; quarterNoteInterval: number; bpm: number }) => ({
            beats: interpolatedMap.mergedBeats,
            quarterNoteInterval: interpolatedMap.quarterNoteInterval,
            bpm: interpolatedMap.bpm,
        })),
        DEFAULT_BEAT_INTERPOLATION_OPTIONS: {},
        DEFAULT_DOWNBEAT_CONFIG: {
            segments: [{
                startBeat: 0,
                downbeatBeatIndex: 0,
                timeSignature: { beatsPerMeasure: 4 },
            }],
        },
        DEFAULT_SUBDIVISION_CONFIG: {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'quarter' as const,
        },
        DEFAULT_SUBDIVISION_PLAYBACK_OPTIONS: {
            transitionMode: 'immediate' as const,
            lookaheadMs: 100,
        },
        MAX_SUBDIVISION_DENSITY: 4,
        VALID_SUBDIVISION_TYPES: ['quarter', 'half', 'eighth', 'sixteenth', 'triplet8', 'triplet4', 'dotted4', 'dotted8'],
        isValidSubdivisionType: vi.fn((type: string) => ['quarter', 'half', 'eighth', 'sixteenth', 'triplet8', 'triplet4', 'dotted4', 'dotted8'].includes(type)),
        getSubdivisionDensity: vi.fn((type: string) => {
            const densities: Record<string, number> = {
                quarter: 1, half: 0.5, eighth: 2, sixteenth: 4,
                triplet8: 1.5, triplet4: 0.75, dotted4: 1.5, dotted8: 0.75,
            };
            return densities[type] || 1;
        }),
        validateSubdivisionConfig: vi.fn(() => undefined),
        validateSubdivisionConfigAgainstBeats: vi.fn(() => undefined),
        validateSubdivisionDensity: vi.fn(() => ({ valid: true, errors: [] })),
        reapplyDownbeatConfig: vi.fn((beatMap) => beatMap),
        SubdivisionPlaybackController: vi.fn().mockImplementation(() => ({
            setSubdivision: vi.fn(),
            start: vi.fn(),
            stop: vi.fn(),
            dispose: vi.fn(),
        })),
    };
}

describe('beatDetectionStore per-beat subdivision actions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    describe('setBeatSubdivision', () => {
        it('should set subdivision for a specific beat index', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Set subdivision for beat 5
            useBeatDetectionStore.getState().actions.setBeatSubdivision(5, 'eighth');

            const state = useBeatDetectionStore.getState();
            expect(state.subdivisionConfig.beatSubdivisions.get(5)).toBe('eighth');
        });

        it('should preserve existing subdivisions when setting a new one', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Set subdivision for multiple beats
            useBeatDetectionStore.getState().actions.setBeatSubdivision(0, 'quarter');
            useBeatDetectionStore.getState().actions.setBeatSubdivision(5, 'eighth');
            useBeatDetectionStore.getState().actions.setBeatSubdivision(10, 'sixteenth');

            const state = useBeatDetectionStore.getState();
            expect(state.subdivisionConfig.beatSubdivisions.get(0)).toBe('quarter');
            expect(state.subdivisionConfig.beatSubdivisions.get(5)).toBe('eighth');
            expect(state.subdivisionConfig.beatSubdivisions.get(10)).toBe('sixteenth');
        });

        it('should overwrite existing subdivision for same beat index', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Set subdivision, then overwrite it
            useBeatDetectionStore.getState().actions.setBeatSubdivision(5, 'eighth');
            useBeatDetectionStore.getState().actions.setBeatSubdivision(5, 'sixteenth');

            const state = useBeatDetectionStore.getState();
            expect(state.subdivisionConfig.beatSubdivisions.get(5)).toBe('sixteenth');
        });

        it('should ignore invalid negative beat index', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const initialSize = useBeatDetectionStore.getState().subdivisionConfig.beatSubdivisions.size;

            // Try to set subdivision for negative beat index
            useBeatDetectionStore.getState().actions.setBeatSubdivision(-1, 'eighth');

            const state = useBeatDetectionStore.getState();
            // Size should not change
            expect(state.subdivisionConfig.beatSubdivisions.size).toBe(initialSize);
        });

        it('should work with all subdivision types', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const subdivisionTypes: SubdivisionType[] = [
                'quarter', 'half', 'eighth', 'sixteenth',
                'triplet8', 'triplet4', 'dotted4', 'dotted8',
            ];

            // Set each type for a different beat
            subdivisionTypes.forEach((type, index) => {
                useBeatDetectionStore.getState().actions.setBeatSubdivision(index, type);
            });

            const state = useBeatDetectionStore.getState();
            subdivisionTypes.forEach((type, index) => {
                expect(state.subdivisionConfig.beatSubdivisions.get(index)).toBe(type);
            });
        });
    });

    describe('setBeatSubdivisionRange', () => {
        it('should set subdivision for a range of beats', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Set subdivision for beats 0-9
            useBeatDetectionStore.getState().actions.setBeatSubdivisionRange(0, 9, 'eighth');

            const state = useBeatDetectionStore.getState();
            for (let i = 0; i <= 9; i++) {
                expect(state.subdivisionConfig.beatSubdivisions.get(i)).toBe('eighth');
            }
        });

        it('should preserve existing subdivisions outside the range', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Set subdivision for beat 0
            useBeatDetectionStore.getState().actions.setBeatSubdivision(0, 'quarter');
            // Set subdivision for range 5-10
            useBeatDetectionStore.getState().actions.setBeatSubdivisionRange(5, 10, 'eighth');

            const state = useBeatDetectionStore.getState();
            // Beat 0 should still be quarter
            expect(state.subdivisionConfig.beatSubdivisions.get(0)).toBe('quarter');
            // Beats 5-10 should be eighth
            for (let i = 5; i <= 10; i++) {
                expect(state.subdivisionConfig.beatSubdivisions.get(i)).toBe('eighth');
            }
        });

        it('should overwrite existing subdivisions in the range', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Set subdivision for beats 0-4
            useBeatDetectionStore.getState().actions.setBeatSubdivisionRange(0, 4, 'quarter');
            // Overwrite beats 2-3
            useBeatDetectionStore.getState().actions.setBeatSubdivisionRange(2, 3, 'eighth');

            const state = useBeatDetectionStore.getState();
            expect(state.subdivisionConfig.beatSubdivisions.get(0)).toBe('quarter');
            expect(state.subdivisionConfig.beatSubdivisions.get(1)).toBe('quarter');
            expect(state.subdivisionConfig.beatSubdivisions.get(2)).toBe('eighth');
            expect(state.subdivisionConfig.beatSubdivisions.get(3)).toBe('eighth');
            expect(state.subdivisionConfig.beatSubdivisions.get(4)).toBe('quarter');
        });

        it('should ignore invalid range (startBeat < 0)', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const initialSize = useBeatDetectionStore.getState().subdivisionConfig.beatSubdivisions.size;

            // Try to set subdivision with negative start beat
            useBeatDetectionStore.getState().actions.setBeatSubdivisionRange(-1, 5, 'eighth');

            const state = useBeatDetectionStore.getState();
            expect(state.subdivisionConfig.beatSubdivisions.size).toBe(initialSize);
        });

        it('should ignore invalid range (endBeat < startBeat)', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const initialSize = useBeatDetectionStore.getState().subdivisionConfig.beatSubdivisions.size;

            // Try to set subdivision with inverted range
            useBeatDetectionStore.getState().actions.setBeatSubdivisionRange(10, 5, 'eighth');

            const state = useBeatDetectionStore.getState();
            expect(state.subdivisionConfig.beatSubdivisions.size).toBe(initialSize);
        });

        it('should handle single-beat range (startBeat === endBeat)', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Set subdivision for a single beat using range
            useBeatDetectionStore.getState().actions.setBeatSubdivisionRange(5, 5, 'sixteenth');

            const state = useBeatDetectionStore.getState();
            expect(state.subdivisionConfig.beatSubdivisions.get(5)).toBe('sixteenth');
        });
    });

    describe('clearBeatSubdivision', () => {
        it('should clear subdivision for a specific beat', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Set subdivision for beat 5
            useBeatDetectionStore.getState().actions.setBeatSubdivision(5, 'eighth');
            expect(useBeatDetectionStore.getState().subdivisionConfig.beatSubdivisions.has(5)).toBe(true);

            // Clear it
            useBeatDetectionStore.getState().actions.clearBeatSubdivision(5);

            const state = useBeatDetectionStore.getState();
            expect(state.subdivisionConfig.beatSubdivisions.has(5)).toBe(false);
        });

        it('should preserve other subdivisions when clearing one', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Set subdivisions for multiple beats
            useBeatDetectionStore.getState().actions.setBeatSubdivision(0, 'quarter');
            useBeatDetectionStore.getState().actions.setBeatSubdivision(5, 'eighth');
            useBeatDetectionStore.getState().actions.setBeatSubdivision(10, 'sixteenth');

            // Clear beat 5
            useBeatDetectionStore.getState().actions.clearBeatSubdivision(5);

            const state = useBeatDetectionStore.getState();
            expect(state.subdivisionConfig.beatSubdivisions.get(0)).toBe('quarter');
            expect(state.subdivisionConfig.beatSubdivisions.has(5)).toBe(false);
            expect(state.subdivisionConfig.beatSubdivisions.get(10)).toBe('sixteenth');
        });

        it('should handle clearing beat with no custom subdivision (no-op)', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Set subdivision for beat 0
            useBeatDetectionStore.getState().actions.setBeatSubdivision(0, 'quarter');
            const sizeBefore = useBeatDetectionStore.getState().subdivisionConfig.beatSubdivisions.size;

            // Try to clear beat 5 which has no custom subdivision
            useBeatDetectionStore.getState().actions.clearBeatSubdivision(5);

            const state = useBeatDetectionStore.getState();
            // Size should be unchanged
            expect(state.subdivisionConfig.beatSubdivisions.size).toBe(sizeBefore);
        });

        it('should ignore invalid negative beat index', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Set subdivision for beat 0
            useBeatDetectionStore.getState().actions.setBeatSubdivision(0, 'quarter');
            const sizeBefore = useBeatDetectionStore.getState().subdivisionConfig.beatSubdivisions.size;

            // Try to clear with negative index
            useBeatDetectionStore.getState().actions.clearBeatSubdivision(-1);

            const state = useBeatDetectionStore.getState();
            expect(state.subdivisionConfig.beatSubdivisions.size).toBe(sizeBefore);
        });
    });

    describe('clearAllBeatSubdivisions', () => {
        it('should clear all beat subdivisions', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Set subdivisions for multiple beats
            useBeatDetectionStore.getState().actions.setBeatSubdivision(0, 'quarter');
            useBeatDetectionStore.getState().actions.setBeatSubdivision(5, 'eighth');
            useBeatDetectionStore.getState().actions.setBeatSubdivision(10, 'sixteenth');
            useBeatDetectionStore.getState().actions.setBeatSubdivisionRange(20, 30, 'triplet8');

            // Verify subdivisions exist
            expect(useBeatDetectionStore.getState().subdivisionConfig.beatSubdivisions.size).toBeGreaterThan(0);

            // Clear all
            useBeatDetectionStore.getState().actions.clearAllBeatSubdivisions();

            const state = useBeatDetectionStore.getState();
            expect(state.subdivisionConfig.beatSubdivisions.size).toBe(0);
        });

        it('should preserve defaultSubdivision after clearing', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Set subdivisions and change default
            useBeatDetectionStore.getState().actions.setBeatSubdivision(0, 'eighth');
            useBeatDetectionStore.getState().actions.setSubdivisionConfig({
                beatSubdivisions: new Map([[0, 'eighth']]),
                defaultSubdivision: 'sixteenth',
            });

            // Clear all
            useBeatDetectionStore.getState().actions.clearAllBeatSubdivisions();

            const state = useBeatDetectionStore.getState();
            // Default should still be 'sixteenth' (from the config that was set)
            // But clearAllBeatSubdivisions only clears the map, preserves the default
            expect(state.subdivisionConfig.defaultSubdivision).toBe('sixteenth');
        });
    });

    describe('setAllBeatSubdivisions', () => {
        it('should set all beats to a specific subdivision when unifiedBeatMap exists', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Create a mock unified beat map
            const mockUnifiedMap = createMockUnifiedBeatMap(10);
            useBeatDetectionStore.setState({ unifiedBeatMap: mockUnifiedMap });

            // Set all beats to eighth
            useBeatDetectionStore.getState().actions.setAllBeatSubdivisions('eighth');

            const state = useBeatDetectionStore.getState();
            // All 10 beats should be set to eighth
            expect(state.subdivisionConfig.beatSubdivisions.size).toBe(10);
            for (let i = 0; i < 10; i++) {
                expect(state.subdivisionConfig.beatSubdivisions.get(i)).toBe('eighth');
            }
            // Default should also be set
            expect(state.subdivisionConfig.defaultSubdivision).toBe('eighth');
        });

        it('should only change defaultSubdivision when no unifiedBeatMap exists', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Ensure no unified beat map
            useBeatDetectionStore.setState({ unifiedBeatMap: null });

            // Set all beats to eighth
            useBeatDetectionStore.getState().actions.setAllBeatSubdivisions('eighth');

            const state = useBeatDetectionStore.getState();
            // Only default should be changed, map should be empty
            expect(state.subdivisionConfig.defaultSubdivision).toBe('eighth');
            expect(state.subdivisionConfig.beatSubdivisions.size).toBe(0);
        });

        it('should overwrite existing subdivisions when setting all', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Create a mock unified beat map
            const mockUnifiedMap = createMockUnifiedBeatMap(5);
            useBeatDetectionStore.setState({ unifiedBeatMap: mockUnifiedMap });

            // Set some subdivisions first
            useBeatDetectionStore.getState().actions.setBeatSubdivision(0, 'quarter');
            useBeatDetectionStore.getState().actions.setBeatSubdivision(2, 'sixteenth');

            // Now set all to eighth
            useBeatDetectionStore.getState().actions.setAllBeatSubdivisions('eighth');

            const state = useBeatDetectionStore.getState();
            // All beats should now be eighth
            for (let i = 0; i < 5; i++) {
                expect(state.subdivisionConfig.beatSubdivisions.get(i)).toBe('eighth');
            }
        });

        it('should work with all subdivision types', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Create a mock unified beat map
            const mockUnifiedMap = createMockUnifiedBeatMap(5);
            useBeatDetectionStore.setState({ unifiedBeatMap: mockUnifiedMap });

            const subdivisionTypes: SubdivisionType[] = [
                'quarter', 'half', 'eighth', 'sixteenth',
                'triplet8', 'triplet4', 'dotted4', 'dotted8',
            ];

            for (const type of subdivisionTypes) {
                useBeatDetectionStore.getState().actions.setAllBeatSubdivisions(type);

                const state = useBeatDetectionStore.getState();
                expect(state.subdivisionConfig.defaultSubdivision).toBe(type);
                for (let i = 0; i < 5; i++) {
                    expect(state.subdivisionConfig.beatSubdivisions.get(i)).toBe(type);
                }
            }
        });
    });

    describe('subdivision config persistence', () => {
        it('should maintain subdivision config through multiple operations', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Create a mock unified beat map
            const mockUnifiedMap = createMockUnifiedBeatMap(20);
            useBeatDetectionStore.setState({ unifiedBeatMap: mockUnifiedMap });

            // Perform a series of operations
            useBeatDetectionStore.getState().actions.setBeatSubdivision(0, 'quarter');
            useBeatDetectionStore.getState().actions.setBeatSubdivisionRange(1, 4, 'eighth');
            useBeatDetectionStore.getState().actions.setBeatSubdivision(5, 'sixteenth');
            useBeatDetectionStore.getState().actions.setBeatSubdivisionRange(10, 15, 'triplet8');
            useBeatDetectionStore.getState().actions.clearBeatSubdivision(12);

            const state = useBeatDetectionStore.getState();

            // Verify expected state
            expect(state.subdivisionConfig.beatSubdivisions.get(0)).toBe('quarter');
            expect(state.subdivisionConfig.beatSubdivisions.get(1)).toBe('eighth');
            expect(state.subdivisionConfig.beatSubdivisions.get(2)).toBe('eighth');
            expect(state.subdivisionConfig.beatSubdivisions.get(3)).toBe('eighth');
            expect(state.subdivisionConfig.beatSubdivisions.get(4)).toBe('eighth');
            expect(state.subdivisionConfig.beatSubdivisions.get(5)).toBe('sixteenth');
            expect(state.subdivisionConfig.beatSubdivisions.get(10)).toBe('triplet8');
            expect(state.subdivisionConfig.beatSubdivisions.get(11)).toBe('triplet8');
            expect(state.subdivisionConfig.beatSubdivisions.has(12)).toBe(false); // Cleared
            expect(state.subdivisionConfig.beatSubdivisions.get(13)).toBe('triplet8');
            expect(state.subdivisionConfig.beatSubdivisions.get(14)).toBe('triplet8');
            expect(state.subdivisionConfig.beatSubdivisions.get(15)).toBe('triplet8');
        });

        it('should use defaultSubdivision for beats not in the map', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Set only a few beats
            useBeatDetectionStore.getState().actions.setBeatSubdivision(0, 'eighth');
            useBeatDetectionStore.getState().actions.setBeatSubdivision(10, 'sixteenth');

            const state = useBeatDetectionStore.getState();
            // Beats 0 and 10 have explicit subdivisions
            expect(state.subdivisionConfig.beatSubdivisions.get(0)).toBe('eighth');
            expect(state.subdivisionConfig.beatSubdivisions.get(10)).toBe('sixteenth');
            // Beat 5 has no explicit subdivision, should use default
            expect(state.subdivisionConfig.beatSubdivisions.has(5)).toBe(false);
            expect(state.subdivisionConfig.defaultSubdivision).toBe('quarter');
        });
    });

    describe('edge cases', () => {
        it('should handle large beat indices', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Set subdivision for a large beat index
            useBeatDetectionStore.getState().actions.setBeatSubdivision(1000, 'eighth');

            const state = useBeatDetectionStore.getState();
            expect(state.subdivisionConfig.beatSubdivisions.get(1000)).toBe('eighth');
        });

        it('should handle large beat ranges', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Set subdivision for a large range
            useBeatDetectionStore.getState().actions.setBeatSubdivisionRange(0, 499, 'eighth');

            const state = useBeatDetectionStore.getState();
            expect(state.subdivisionConfig.beatSubdivisions.size).toBe(500);
        });

        it('should handle empty state correctly', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Ensure empty state
            useBeatDetectionStore.getState().actions.clearAllBeatSubdivisions();

            const state = useBeatDetectionStore.getState();
            expect(state.subdivisionConfig.beatSubdivisions.size).toBe(0);
            // Default should still be quarter
            expect(state.subdivisionConfig.defaultSubdivision).toBe('quarter');
        });
    });
});
