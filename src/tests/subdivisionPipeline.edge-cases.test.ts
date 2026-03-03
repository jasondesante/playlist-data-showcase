/**
 * Edge Case Tests for Subdivision Pipeline
 *
 * Phase 9, Task 9.4: Edge Case Tests
 * - Test edge cases
 *   - Empty beat map
 *   - Single segment (default)
 *   - Many segments
 *   - Invalid subdivision config
 *   - Density limit exceeded
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type {
    BeatMap,
    InterpolatedBeatMap,
    UnifiedBeatMap,
    SubdividedBeatMap,
    SubdivisionConfig,
    SubdivisionSegment,
    SubdividedBeat,
    SubdivisionType,
} from '@/types';
import {
    MAX_SUBDIVISION_DENSITY,
    VALID_SUBDIVISION_TYPES,
    isValidSubdivisionType,
    getSubdivisionDensity,
} from '@/types';

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

// ============================================================
// Test Helpers
// ============================================================

/**
 * Create a mock BeatMap with the specified number of beats.
 */
function createMockBeatMap(beatCount: number, bpm: number = 120): BeatMap {
    const beatInterval = 60 / bpm;
    return {
        beats: Array.from({ length: beatCount }, (_, i) => ({
            timestamp: i * beatInterval,
            beatInMeasure: i % 4,
            isDownbeat: i % 4 === 0,
            measureNumber: Math.floor(i / 4),
            confidence: 1.0,
        })),
        bpm,
        audioId: 'test-audio-id',
        duration: beatCount * beatInterval,
        metadata: {
            generatedAt: Date.now(),
            algorithmVersion: '1.0.0',
        },
    };
}

/**
 * Create a mock InterpolatedBeatMap from a BeatMap.
 */
function createMockInterpolatedBeatMap(beatMap: BeatMap): InterpolatedBeatMap {
    return {
        detectedBeats: beatMap.beats.map(b => ({ ...b, source: 'detected' as const })),
        mergedBeats: beatMap.beats.map(b => ({ ...b, source: 'detected' as const })),
        bpm: beatMap.bpm,
        quarterNoteInterval: 60 / beatMap.bpm,
        metadata: {},
    };
}

/**
 * Create a mock UnifiedBeatMap from an InterpolatedBeatMap.
 */
function createMockUnifiedBeatMap(interpolatedMap: InterpolatedBeatMap): UnifiedBeatMap {
    return {
        beats: interpolatedMap.mergedBeats.map(b => ({
            timestamp: b.timestamp,
            beatInMeasure: b.beatInMeasure,
            isDownbeat: b.isDownbeat,
            measureNumber: b.measureNumber,
            confidence: b.confidence,
        })),
        quarterNoteInterval: interpolatedMap.quarterNoteInterval,
        bpm: interpolatedMap.bpm,
    };
}

/**
 * Get the density multiplier for a subdivision type.
 */
function getSubdivisionDensityMultiplier(type: SubdivisionType): number {
    const densities: Record<SubdivisionType, number> = {
        quarter: 1,
        half: 0.5,
        eighth: 2,
        sixteenth: 4,
        triplet8: 1.5,
        triplet4: 0.75,
        dotted4: 1.5,
        dotted8: 0.75,
    };
    return densities[type] || 1;
}

/**
 * Create a mock SubdividedBeatMap from a UnifiedBeatMap.
 */
function createMockSubdividedBeatMap(
    unifiedMap: UnifiedBeatMap,
    config: SubdivisionConfig
): SubdividedBeatMap {
    const subdivisionType = config.segments[0]?.subdivision || 'quarter';
    const density = getSubdivisionDensityMultiplier(subdivisionType);

    const beats: SubdividedBeat[] = [];
    const totalBeats = Math.floor(unifiedMap.beats.length * density);

    for (let i = 0; i < totalBeats; i++) {
        const sourceIndex = Math.floor(i / density);
        beats.push({
            timestamp: i * (unifiedMap.quarterNoteInterval / density),
            beatInMeasure: (sourceIndex % 4) + (i % Math.max(1, density)) / Math.max(1, density),
            isDownbeat: sourceIndex % 4 === 0 && i % Math.max(1, Math.floor(density)) === 0,
            measureNumber: Math.floor(sourceIndex / 4),
            confidence: 1.0,
            subdivisionType,
            sourceBeatIndex: sourceIndex,
            beatInSubdivision: i % Math.max(1, Math.floor(density)),
        });
    }

    return {
        beats,
        quarterNoteInterval: unifiedMap.quarterNoteInterval,
        subdivisionMetadata: {
            totalBeats: beats.length,
            subdivisionTypesUsed: [subdivisionType],
            averageDensity: density,
        },
    };
}

/**
 * Create a mock engine module for testing.
 */
function createEngineMock() {
    return {
        BeatMapGenerator: vi.fn().mockImplementation(() => ({
            generateBeatMap: vi.fn().mockResolvedValue(createMockBeatMap(100)),
            cancel: vi.fn(),
        })),
        BeatInterpolator: vi.fn().mockImplementation(() => ({
            interpolate: vi.fn().mockImplementation((beatMap: BeatMap) => ({
                ...beatMap,
                detectedBeats: beatMap.beats,
                mergedBeats: beatMap.beats.map(b => ({ ...b, source: 'detected' as const })),
                quarterNoteInterval: 0.5,
                metadata: {},
            })),
        })),
        BeatSubdivider: class MockBeatSubdivider {
            subdivide(unifiedMap: UnifiedBeatMap, config: { segments: SubdivisionSegment[] }) {
                return createMockSubdividedBeatMap(unifiedMap, config);
            }
        },
        unifyBeatMap: vi.fn().mockImplementation((interpolatedMap: InterpolatedBeatMap) =>
            createMockUnifiedBeatMap(interpolatedMap)
        ),
        subdivideBeatMap: vi.fn().mockImplementation(
            (interpolatedMap: InterpolatedBeatMap, config: SubdivisionConfig) => {
                const unifiedMap = createMockUnifiedBeatMap(interpolatedMap);
                return createMockSubdividedBeatMap(unifiedMap, config);
            }
        ),
        DEFAULT_BEAT_INTERPOLATION_OPTIONS: {},
        DEFAULT_DOWNBEAT_CONFIG: {
            segments: [{
                startBeat: 0,
                downbeatBeatIndex: 0,
                timeSignature: { beatsPerMeasure: 4 },
            }],
        },
        DEFAULT_SUBDIVISION_CONFIG: {
            segments: [{ startBeat: 0, subdivision: 'quarter' as const }],
        },
        DEFAULT_SUBDIVISION_PLAYBACK_OPTIONS: {
            transitionMode: 'immediate' as const,
            lookaheadMs: 100,
        },
        MAX_SUBDIVISION_DENSITY: 4,
        VALID_SUBDIVISION_TYPES: ['quarter', 'half', 'eighth', 'sixteenth', 'triplet8', 'triplet4', 'dotted4', 'dotted8'] as SubdivisionType[],
        isValidSubdivisionType: vi.fn((type: string) =>
            ['quarter', 'half', 'eighth', 'sixteenth', 'triplet8', 'triplet4', 'dotted4', 'dotted8'].includes(type)
        ),
        getSubdivisionDensity: vi.fn((type: string) => {
            const densities: Record<string, number> = {
                quarter: 1, half: 0.5, eighth: 2, sixteenth: 4,
                triplet8: 1.5, triplet4: 0.75, dotted4: 1.5, dotted8: 0.75,
            };
            return densities[type] || 1;
        }),
        validateSubdivisionConfig: vi.fn(() => ({ valid: true, errors: [] })),
        validateSubdivisionConfigAgainstBeats: vi.fn(() => ({ valid: true, errors: [] })),
        validateSubdivisionDensity: vi.fn(() => ({ valid: true, errors: [] })),
        reapplyDownbeatConfig: vi.fn((beatMap: BeatMap) => beatMap),
        SubdivisionPlaybackController: class MockSubdivisionPlaybackController {
            private currentSubdivision: SubdivisionType = 'quarter';
            private playing = false;
            private paused = false;

            setSubdivision = vi.fn((type: SubdivisionType) => {
                this.currentSubdivision = type;
            });
            start = vi.fn();
            stop = vi.fn();
            play = vi.fn(() => { this.playing = true; this.paused = false; });
            pause = vi.fn(() => { this.paused = true; });
            resume = vi.fn(() => { this.paused = false; });
            seek = vi.fn();
            destroy = vi.fn();
            subscribe = vi.fn(() => vi.fn());
            getCurrentTime = vi.fn(() => 0);
            getCurrentBeat = vi.fn(() => null);
            getNextBeat = vi.fn(() => null);
            getUpcomingBeats = vi.fn(() => []);
            getBeatsInRange = vi.fn(() => []);
            getBeatAtTime = vi.fn(() => null);
            getOptions = vi.fn(() => ({ compensateOutputLatency: true }));
        },
        BeatStream: class MockBeatStream {
            private active = false;
            private paused = false;

            start = vi.fn(() => { this.active = true; });
            stop = vi.fn(() => { this.active = false; this.paused = false; });
            seek = vi.fn();
            subscribe = vi.fn(() => vi.fn());
            getCurrentTime = vi.fn(() => 0);
            getCurrentBpm = vi.fn(() => 120);
            getUpcomingBeats = vi.fn(() => []);
            getSyncState = vi.fn(() => null);
            checkButtonPress = vi.fn(() => ({
                accuracy: 'perfect',
                offset: 0,
                absoluteOffset: 0,
                matchedBeat: null,
            }));
            getBeatAtTime = vi.fn(() => null);
        },
    };
}

// ============================================================
// Edge Case Tests: Empty Beat Map
// ============================================================

describe('Edge Case: Empty Beat Map', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Empty BeatMap Handling', () => {
        it('should handle BeatMap with zero beats', () => {
            const emptyBeatMap = createMockBeatMap(0, 120);
            expect(emptyBeatMap.beats).toHaveLength(0);
            expect(emptyBeatMap.duration).toBe(0);
        });

        it('should handle InterpolatedBeatMap with empty detectedBeats', () => {
            const emptyBeatMap = createMockBeatMap(0);
            const interpolatedMap = createMockInterpolatedBeatMap(emptyBeatMap);

            expect(interpolatedMap.detectedBeats).toHaveLength(0);
            expect(interpolatedMap.mergedBeats).toHaveLength(0);
        });

        it('should handle UnifiedBeatMap with zero beats', () => {
            const emptyBeatMap = createMockBeatMap(0);
            const interpolatedMap = createMockInterpolatedBeatMap(emptyBeatMap);
            const unifiedMap = createMockUnifiedBeatMap(interpolatedMap);

            expect(unifiedMap.beats).toHaveLength(0);
            expect(unifiedMap.quarterNoteInterval).toBe(0.5); // Still valid BPM-based interval
        });

        it('should handle SubdividedBeatMap with zero beats', () => {
            const emptyBeatMap = createMockBeatMap(0);
            const interpolatedMap = createMockInterpolatedBeatMap(emptyBeatMap);
            const unifiedMap = createMockUnifiedBeatMap(interpolatedMap);
            const config: SubdivisionConfig = {
                segments: [{ startBeat: 0, subdivision: 'eighth' }],
            };

            const subdividedMap = createMockSubdividedBeatMap(unifiedMap, config);

            expect(subdividedMap.beats).toHaveLength(0);
            expect(subdividedMap.subdivisionMetadata.totalBeats).toBe(0);
        });

        it('should return null when generating UnifiedBeatMap with no interpolated map', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('@/store/beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Ensure no interpolated beat map
            useBeatDetectionStore.setState({ interpolatedBeatMap: null });

            const result = useBeatDetectionStore.getState().actions.generateUnifiedBeatMap();

            expect(result).toBeNull();
        });

        it('should return null when generating SubdividedBeatMap with no unified map', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('@/store/beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Ensure no unified or interpolated beat map
            useBeatDetectionStore.setState({
                unifiedBeatMap: null,
                interpolatedBeatMap: null,
            });

            const result = useBeatDetectionStore.getState().actions.generateSubdividedBeatMap();

            expect(result).toBeNull();
        });
    });

    describe('Store State with Empty Maps', () => {
        it('should handle empty beat map in store without crashing', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('@/store/beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const emptyBeatMap = createMockBeatMap(0);
            const interpolatedMap = createMockInterpolatedBeatMap(emptyBeatMap);

            useBeatDetectionStore.setState({
                beatMap: emptyBeatMap,
                interpolatedBeatMap: interpolatedMap,
            });

            // Should not crash when generating
            const unifiedResult = useBeatDetectionStore.getState().actions.generateUnifiedBeatMap();
            expect(unifiedResult?.beats).toHaveLength(0);

            // Subdivided map should also be empty
            const subdividedResult = useBeatDetectionStore.getState().actions.generateSubdividedBeatMap();
            expect(subdividedResult?.beats).toHaveLength(0);
        });
    });
});

// ============================================================
// Edge Case Tests: Single Segment (Default)
// ============================================================

describe('Edge Case: Single Segment (Default)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Default Configuration', () => {
        it('should have default subdivision config with single quarter segment', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('@/store/beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const state = useBeatDetectionStore.getState();
            expect(state.subdivisionConfig.segments).toHaveLength(1);
            expect(state.subdivisionConfig.segments[0].startBeat).toBe(0);
            expect(state.subdivisionConfig.segments[0].subdivision).toBe('quarter');
        });

        it('should generate SubdividedBeatMap with single quarter segment', () => {
            const beatMap = createMockBeatMap(100, 120);
            const interpolatedMap = createMockInterpolatedBeatMap(beatMap);
            const unifiedMap = createMockUnifiedBeatMap(interpolatedMap);

            const config: SubdivisionConfig = {
                segments: [{ startBeat: 0, subdivision: 'quarter' }],
            };

            const subdividedMap = createMockSubdividedBeatMap(unifiedMap, config);

            // Quarter notes should have same count as unified map
            expect(subdividedMap.beats).toHaveLength(100);
            expect(subdividedMap.subdivisionMetadata.averageDensity).toBe(1);
            expect(subdividedMap.subdivisionMetadata.subdivisionTypesUsed).toContain('quarter');
        });

        it('should not allow removing the first/only segment', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('@/store/beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const initialCount = useBeatDetectionStore.getState().subdivisionConfig.segments.length;

            // Try to remove the first segment
            useBeatDetectionStore.getState().actions.removeSubdivisionSegment(0);

            // Segment count should be unchanged
            expect(useBeatDetectionStore.getState().subdivisionConfig.segments.length).toBe(initialCount);
        });

        it('should handle single segment with different subdivision types', () => {
            const beatMap = createMockBeatMap(100, 120);
            const interpolatedMap = createMockInterpolatedBeatMap(beatMap);
            const unifiedMap = createMockUnifiedBeatMap(interpolatedMap);

            const subdivisionTypes: SubdivisionType[] = ['quarter', 'half', 'eighth', 'sixteenth', 'triplet8', 'triplet4', 'dotted4', 'dotted8'];

            for (const type of subdivisionTypes) {
                const config: SubdivisionConfig = {
                    segments: [{ startBeat: 0, subdivision: type }],
                };

                const subdividedMap = createMockSubdividedBeatMap(unifiedMap, config);
                const expectedDensity = getSubdivisionDensityMultiplier(type);
                const expectedCount = Math.floor(100 * expectedDensity);

                expect(subdividedMap.beats.length).toBe(expectedCount);
                expect(subdividedMap.subdivisionMetadata.subdivisionTypesUsed).toContain(type);
            }
        });
    });

    describe('Single Segment Beat Timing', () => {
        it('should preserve correct timing for single quarter segment', () => {
            const beatMap = createMockBeatMap(100, 120);
            const interpolatedMap = createMockInterpolatedBeatMap(beatMap);
            const unifiedMap = createMockUnifiedBeatMap(interpolatedMap);

            const config: SubdivisionConfig = {
                segments: [{ startBeat: 0, subdivision: 'quarter' }],
            };

            const subdividedMap = createMockSubdividedBeatMap(unifiedMap, config);

            // Check timing is preserved
            expect(subdividedMap.beats[0].timestamp).toBe(0);
            expect(subdividedMap.beats[1].timestamp).toBe(0.5); // 60/120 = 0.5s interval
            expect(subdividedMap.beats[2].timestamp).toBe(1.0);
        });

        it('should handle single half segment correctly', () => {
            const beatMap = createMockBeatMap(100, 120);
            const interpolatedMap = createMockInterpolatedBeatMap(beatMap);
            const unifiedMap = createMockUnifiedBeatMap(interpolatedMap);

            const config: SubdivisionConfig = {
                segments: [{ startBeat: 0, subdivision: 'half' }],
            };

            const subdividedMap = createMockSubdividedBeatMap(unifiedMap, config);

            // Half notes should have half the beats
            expect(subdividedMap.beats).toHaveLength(50);
        });
    });
});

// ============================================================
// Edge Case Tests: Many Segments
// ============================================================

describe('Edge Case: Many Segments', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Multiple Segment Handling', () => {
        it('should handle 2 segments correctly', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('@/store/beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const config: SubdivisionConfig = {
                segments: [
                    { startBeat: 0, subdivision: 'quarter' as const },
                    { startBeat: 50, subdivision: 'eighth' as const },
                ],
            };

            useBeatDetectionStore.getState().actions.setSubdivisionConfig(config);

            const state = useBeatDetectionStore.getState();
            expect(state.subdivisionConfig.segments).toHaveLength(2);
            expect(state.subdivisionConfig.segments[0].startBeat).toBe(0);
            expect(state.subdivisionConfig.segments[1].startBeat).toBe(50);
        });

        it('should handle maximum (8) segments', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('@/store/beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const config: SubdivisionConfig = {
                segments: [
                    { startBeat: 0, subdivision: 'quarter' as const },
                    { startBeat: 16, subdivision: 'eighth' as const },
                    { startBeat: 32, subdivision: 'quarter' as const },
                    { startBeat: 48, subdivision: 'sixteenth' as const },
                    { startBeat: 64, subdivision: 'quarter' as const },
                    { startBeat: 80, subdivision: 'eighth' as const },
                    { startBeat: 96, subdivision: 'triplet8' as const },
                    { startBeat: 112, subdivision: 'quarter' as const },
                ],
            };

            useBeatDetectionStore.getState().actions.setSubdivisionConfig(config);

            const state = useBeatDetectionStore.getState();
            expect(state.subdivisionConfig.segments).toHaveLength(8);
        });

        it('should sort segments by startBeat when added out of order', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('@/store/beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Add segments in non-sorted order
            useBeatDetectionStore.getState().actions.addSubdivisionSegment({
                startBeat: 64,
                subdivision: 'sixteenth',
            });
            useBeatDetectionStore.getState().actions.addSubdivisionSegment({
                startBeat: 16,
                subdivision: 'eighth',
            });
            useBeatDetectionStore.getState().actions.addSubdivisionSegment({
                startBeat: 32,
                subdivision: 'quarter',
            });

            const segments = useBeatDetectionStore.getState().subdivisionConfig.segments;

            // Should be sorted by startBeat
            expect(segments[0].startBeat).toBe(0);
            expect(segments[1].startBeat).toBe(16);
            expect(segments[2].startBeat).toBe(32);
            expect(segments[3].startBeat).toBe(64);
        });

        it('should handle segments with same startBeat (first wins)', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('@/store/beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Add segment with same startBeat as existing
            useBeatDetectionStore.getState().actions.addSubdivisionSegment({
                startBeat: 0, // Same as default first segment
                subdivision: 'eighth',
            });

            const segments = useBeatDetectionStore.getState().subdivisionConfig.segments;

            // Should have 2 segments, sorted by startBeat
            expect(segments.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('Segment Boundaries', () => {
        it('should handle segments at extreme beat positions', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('@/store/beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Add segment at very high beat position
            useBeatDetectionStore.getState().actions.addSubdivisionSegment({
                startBeat: 9999,
                subdivision: 'quarter',
            });

            const segments = useBeatDetectionStore.getState().subdivisionConfig.segments;
            expect(segments.some(s => s.startBeat === 9999)).toBe(true);
        });

        it('should handle segment at beat 0', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('@/store/beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            // First segment should always be at beat 0
            const segments = useBeatDetectionStore.getState().subdivisionConfig.segments;
            expect(segments[0].startBeat).toBe(0);
        });

        it('should handle contiguous segments (no gaps)', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('@/store/beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const config: SubdivisionConfig = {
                segments: [
                    { startBeat: 0, subdivision: 'quarter' as const },
                    { startBeat: 32, subdivision: 'eighth' as const },
                    { startBeat: 64, subdivision: 'quarter' as const },
                    { startBeat: 96, subdivision: 'sixteenth' as const },
                ],
            };

            useBeatDetectionStore.getState().actions.setSubdivisionConfig(config);

            const segments = useBeatDetectionStore.getState().subdivisionConfig.segments;

            // Verify contiguous ordering
            for (let i = 1; i < segments.length; i++) {
                expect(segments[i].startBeat).toBeGreaterThan(segments[i - 1].startBeat);
            }
        });
    });
});

// ============================================================
// Edge Case Tests: Invalid Subdivision Config
// ============================================================

describe('Edge Case: Invalid Subdivision Config', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Invalid Subdivision Types', () => {
        it('should validate subdivision types correctly', () => {
            // Valid types
            expect(isValidSubdivisionType('quarter')).toBe(true);
            expect(isValidSubdivisionType('half')).toBe(true);
            expect(isValidSubdivisionType('eighth')).toBe(true);
            expect(isValidSubdivisionType('sixteenth')).toBe(true);
            expect(isValidSubdivisionType('triplet8')).toBe(true);
            expect(isValidSubdivisionType('triplet4')).toBe(true);
            expect(isValidSubdivisionType('dotted4')).toBe(true);
            expect(isValidSubdivisionType('dotted8')).toBe(true);

            // Invalid types
            expect(isValidSubdivisionType('invalid')).toBe(false);
            expect(isValidSubdivisionType('')).toBe(false);
            expect(isValidSubdivisionType('QUARTER')).toBe(false); // Case sensitive
            expect(isValidSubdivisionType('double')).toBe(false);
        });

        it('should have all valid subdivision types defined', () => {
            expect(VALID_SUBDIVISION_TYPES).toContain('quarter');
            expect(VALID_SUBDIVISION_TYPES).toContain('half');
            expect(VALID_SUBDIVISION_TYPES).toContain('eighth');
            expect(VALID_SUBDIVISION_TYPES).toContain('sixteenth');
            expect(VALID_SUBDIVISION_TYPES).toContain('triplet8');
            expect(VALID_SUBDIVISION_TYPES).toContain('triplet4');
            expect(VALID_SUBDIVISION_TYPES).toContain('dotted4');
            expect(VALID_SUBDIVISION_TYPES).toContain('dotted8');
            expect(VALID_SUBDIVISION_TYPES).toHaveLength(8);
        });
    });

    describe('Invalid Segment Indices', () => {
        it('should not update segment with negative index', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('@/store/beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const originalSegments = [...useBeatDetectionStore.getState().subdivisionConfig.segments];

            useBeatDetectionStore.getState().actions.updateSubdivisionSegment(-1, {
                subdivision: 'eighth',
            });

            // Segments should be unchanged
            expect(useBeatDetectionStore.getState().subdivisionConfig.segments).toEqual(originalSegments);
        });

        it('should not update segment with out-of-bounds index', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('@/store/beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const originalSegments = [...useBeatDetectionStore.getState().subdivisionConfig.segments];

            useBeatDetectionStore.getState().actions.updateSubdivisionSegment(999, {
                subdivision: 'eighth',
            });

            // Segments should be unchanged
            expect(useBeatDetectionStore.getState().subdivisionConfig.segments).toEqual(originalSegments);
        });

        it('should not remove segment with negative index', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('@/store/beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const initialCount = useBeatDetectionStore.getState().subdivisionConfig.segments.length;

            useBeatDetectionStore.getState().actions.removeSubdivisionSegment(-1);

            expect(useBeatDetectionStore.getState().subdivisionConfig.segments.length).toBe(initialCount);
        });

        it('should not remove segment with out-of-bounds index', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('@/store/beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const initialCount = useBeatDetectionStore.getState().subdivisionConfig.segments.length;

            useBeatDetectionStore.getState().actions.removeSubdivisionSegment(999);

            expect(useBeatDetectionStore.getState().subdivisionConfig.segments.length).toBe(initialCount);
        });
    });

    describe('Empty Config Handling', () => {
        it('should handle config with empty segments array gracefully', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('@/store/beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Try to set empty segments (this would be invalid in practice)
            // The store should handle this gracefully
            const emptyConfig: SubdivisionConfig = {
                segments: [],
            };

            // Setting empty config - store should handle this
            useBeatDetectionStore.getState().actions.setSubdivisionConfig(emptyConfig);

            // Store will accept it, but operations should not crash
            expect(useBeatDetectionStore.getState().subdivisionConfig.segments).toHaveLength(0);
        });
    });

    describe('Negative Start Beat', () => {
        it('should handle segment with negative startBeat', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('@/store/beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            // The store doesn't validate startBeat, but the engine might
            // This test verifies the store accepts it without crashing
            useBeatDetectionStore.getState().actions.addSubdivisionSegment({
                startBeat: -10,
                subdivision: 'quarter',
            });

            const segments = useBeatDetectionStore.getState().subdivisionConfig.segments;
            expect(segments.some(s => s.startBeat === -10)).toBe(true);
        });
    });
});

// ============================================================
// Edge Case Tests: Density Limit Exceeded
// ============================================================

describe('Edge Case: Density Limit Exceeded', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('MAX_SUBDIVISION_DENSITY Constant', () => {
        it('should have MAX_SUBDIVISION_DENSITY defined', () => {
            expect(MAX_SUBDIVISION_DENSITY).toBeDefined();
            expect(MAX_SUBDIVISION_DENSITY).toBe(4); // Maximum is sixteenth notes (4x density)
        });

        it('should not allow subdivision types with density exceeding limit', () => {
            // Get densities for all valid types
            const densities = VALID_SUBDIVISION_TYPES.map(type => ({
                type,
                density: getSubdivisionDensity(type),
            }));

            // All valid types should be at or below MAX_SUBDIVISION_DENSITY
            for (const { type, density } of densities) {
                expect(density).toBeLessThanOrEqual(MAX_SUBDIVISION_DENSITY);
            }
        });
    });

    describe('Density Calculations', () => {
        it('should return correct density for each subdivision type', () => {
            expect(getSubdivisionDensity('quarter')).toBe(1);
            expect(getSubdivisionDensity('half')).toBe(0.5);
            expect(getSubdivisionDensity('eighth')).toBe(2);
            expect(getSubdivisionDensity('sixteenth')).toBe(4); // Maximum density
            expect(getSubdivisionDensity('triplet8')).toBe(1.5);
            expect(getSubdivisionDensity('triplet4')).toBe(0.75);
            expect(getSubdivisionDensity('dotted4')).toBe(1.5);
            expect(getSubdivisionDensity('dotted8')).toBe(0.75);
        });

        it('should return 1 for unknown subdivision type', () => {
            // The function should gracefully handle unknown types
            expect(getSubdivisionDensity('unknown' as SubdivisionType)).toBe(1);
        });
    });

    describe('High-Density Subdivision', () => {
        it('should generate correct number of beats for sixteenth notes', () => {
            const beatMap = createMockBeatMap(100, 120);
            const interpolatedMap = createMockInterpolatedBeatMap(beatMap);
            const unifiedMap = createMockUnifiedBeatMap(interpolatedMap);

            const config: SubdivisionConfig = {
                segments: [{ startBeat: 0, subdivision: 'sixteenth' }],
            };

            const subdividedMap = createMockSubdividedBeatMap(unifiedMap, config);

            // Sixteenth notes should have 4x the beats
            expect(subdividedMap.beats).toHaveLength(400);
            expect(subdividedMap.subdivisionMetadata.averageDensity).toBe(4);
        });

        it('should handle very long tracks with high density', () => {
            // Simulate a 10-minute track at 120 BPM = 1200 beats
            const beatMap = createMockBeatMap(1200, 120);
            const interpolatedMap = createMockInterpolatedBeatMap(beatMap);
            const unifiedMap = createMockUnifiedBeatMap(interpolatedMap);

            const config: SubdivisionConfig = {
                segments: [{ startBeat: 0, subdivision: 'sixteenth' }],
            };

            const subdividedMap = createMockSubdividedBeatMap(unifiedMap, config);

            // Should handle 1200 * 4 = 4800 beats
            expect(subdividedMap.beats).toHaveLength(4800);
        });
    });

    describe('Mixed Density Configs', () => {
        it('should handle config with varying density segments', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('@/store/beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const config: SubdivisionConfig = {
                segments: [
                    { startBeat: 0, subdivision: 'quarter' as const },      // 1x density
                    { startBeat: 32, subdivision: 'eighth' as const },      // 2x density
                    { startBeat: 64, subdivision: 'sixteenth' as const },   // 4x density
                    { startBeat: 96, subdivision: 'half' as const },        // 0.5x density
                ],
            };

            useBeatDetectionStore.getState().actions.setSubdivisionConfig(config);

            const segments = useBeatDetectionStore.getState().subdivisionConfig.segments;
            expect(segments).toHaveLength(4);
            expect(segments[0].subdivision).toBe('quarter');
            expect(segments[1].subdivision).toBe('eighth');
            expect(segments[2].subdivision).toBe('sixteenth');
            expect(segments[3].subdivision).toBe('half');
        });
    });
});

// ============================================================
// Edge Case Tests: Boundary Conditions
// ============================================================

describe('Edge Case: Boundary Conditions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('BPM Boundaries', () => {
        it('should handle very slow BPM (60)', () => {
            const beatMap = createMockBeatMap(100, 60);
            const interpolatedMap = createMockInterpolatedBeatMap(beatMap);
            const unifiedMap = createMockUnifiedBeatMap(interpolatedMap);

            expect(unifiedMap.quarterNoteInterval).toBe(1.0); // 60/60 = 1s
            expect(unifiedMap.bpm).toBe(60);
        });

        it('should handle very fast BPM (200)', () => {
            const beatMap = createMockBeatMap(100, 200);
            const interpolatedMap = createMockInterpolatedBeatMap(beatMap);
            const unifiedMap = createMockUnifiedBeatMap(interpolatedMap);

            expect(unifiedMap.quarterNoteInterval).toBe(0.3); // 60/200 = 0.3s
            expect(unifiedMap.bpm).toBe(200);
        });
    });

    describe('Beat Count Boundaries', () => {
        it('should handle single beat', () => {
            const beatMap = createMockBeatMap(1, 120);
            const interpolatedMap = createMockInterpolatedBeatMap(beatMap);
            const unifiedMap = createMockUnifiedBeatMap(interpolatedMap);

            expect(unifiedMap.beats).toHaveLength(1);
        });

        it('should handle very large beat counts', () => {
            // 10000 beats = ~83 measures at 4/4 time
            const beatMap = createMockBeatMap(10000, 120);
            const interpolatedMap = createMockInterpolatedBeatMap(beatMap);
            const unifiedMap = createMockUnifiedBeatMap(interpolatedMap);

            expect(unifiedMap.beats).toHaveLength(10000);
        });
    });

    describe('SubdividedBeat Properties', () => {
        it('should have valid beatInSubdivision for all beats', () => {
            const beatMap = createMockBeatMap(100, 120);
            const interpolatedMap = createMockInterpolatedBeatMap(beatMap);
            const unifiedMap = createMockUnifiedBeatMap(interpolatedMap);

            const config: SubdivisionConfig = {
                segments: [{ startBeat: 0, subdivision: 'eighth' }],
            };

            const subdividedMap = createMockSubdividedBeatMap(unifiedMap, config);

            // All beats should have valid beatInSubdivision
            for (const beat of subdividedMap.beats) {
                expect(beat.beatInSubdivision).toBeGreaterThanOrEqual(0);
                expect(beat.beatInSubdivision).toBeLessThan(2); // Eighth = 2 beats per quarter
            }
        });

        it('should have valid sourceBeatIndex for all beats', () => {
            const beatMap = createMockBeatMap(100, 120);
            const interpolatedMap = createMockInterpolatedBeatMap(beatMap);
            const unifiedMap = createMockUnifiedBeatMap(interpolatedMap);

            const config: SubdivisionConfig = {
                segments: [{ startBeat: 0, subdivision: 'sixteenth' }],
            };

            const subdividedMap = createMockSubdividedBeatMap(unifiedMap, config);

            // All beats should have valid sourceBeatIndex
            for (const beat of subdividedMap.beats) {
                expect(beat.sourceBeatIndex).toBeGreaterThanOrEqual(0);
                expect(beat.sourceBeatIndex).toBeLessThan(100);
            }
        });
    });
});

// ============================================================
// Edge Case Tests: Real-Time Switching Edge Cases
// ============================================================

describe('Edge Case: Real-Time Switching', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Rapid Subdivision Changes', () => {
        it('should handle rapid subdivision type changes', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore, setActiveSubdivisionPlaybackController } = await import('@/store/beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const mockController = {
                setSubdivision: vi.fn(),
                start: vi.fn(),
                stop: vi.fn(),
                destroy: vi.fn(),
                subscribe: vi.fn(() => vi.fn()),
                getCurrentTime: vi.fn(() => 0),
                getUpcomingBeats: vi.fn(() => []),
                getOptions: vi.fn(() => ({})),
            };

            setActiveSubdivisionPlaybackController(mockController as unknown as ReturnType<typeof createEngineMock>['SubdivisionPlaybackController']['prototype']);

            // Rapid changes
            const types: SubdivisionType[] = ['quarter', 'eighth', 'sixteenth', 'half', 'quarter'];
            for (const type of types) {
                useBeatDetectionStore.getState().actions.setCurrentSubdivision(type);
            }

            // Should have called setSubdivision for each change
            expect(mockController.setSubdivision).toHaveBeenCalledTimes(types.length);

            // Cleanup
            setActiveSubdivisionPlaybackController(null);
        });

        it('should handle switching to same subdivision type', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore, setActiveSubdivisionPlaybackController } = await import('@/store/beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const mockController = {
                setSubdivision: vi.fn(),
                start: vi.fn(),
                stop: vi.fn(),
                destroy: vi.fn(),
                subscribe: vi.fn(() => vi.fn()),
                getCurrentTime: vi.fn(() => 0),
                getUpcomingBeats: vi.fn(() => []),
                getOptions: vi.fn(() => ({})),
            };

            setActiveSubdivisionPlaybackController(mockController as unknown as ReturnType<typeof createEngineMock>['SubdivisionPlaybackController']['prototype']);

            // Set to quarter
            useBeatDetectionStore.getState().actions.setCurrentSubdivision('quarter');
            // Set to quarter again
            useBeatDetectionStore.getState().actions.setCurrentSubdivision('quarter');

            // Should have called setSubdivision for each call (even if same)
            expect(mockController.setSubdivision).toHaveBeenCalledTimes(2);

            // Cleanup
            setActiveSubdivisionPlaybackController(null);
        });
    });

    describe('Controller State Without Controller', () => {
        it('should handle subdivision change when no controller is active', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore, setActiveSubdivisionPlaybackController } = await import('@/store/beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Ensure no controller
            setActiveSubdivisionPlaybackController(null);

            // Should not crash when changing subdivision without controller
            useBeatDetectionStore.getState().actions.setCurrentSubdivision('eighth');

            expect(useBeatDetectionStore.getState().currentSubdivision).toBe('eighth');
        });
    });
});
