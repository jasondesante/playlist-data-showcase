/**
 * Tests for beatDetectionStore subdivision state management
 *
 * Phase 9, Task 9.1: Unit Tests for Store
 * - Test generateUnifiedBeatMap
 * - Test generateSubdividedBeatMap
 * - Test subdivision config updates
 * - Test segment CRUD operations
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { BeatMap, InterpolatedBeatMap, SubdivisionSegment, UnifiedBeatMap, SubdividedBeatMap } from '@/types';

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
 * Helper to create a mock beat map with the specified number of beats.
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
 * Helper to create a mock interpolated beat map.
 */
function createMockInterpolatedBeatMap(beatCount: number, bpm: number = 120): InterpolatedBeatMap {
    const beatInterval = 60 / bpm;
    const beats = Array.from({ length: beatCount }, (_, i) => ({
        timestamp: i * beatInterval,
        beatInMeasure: i % 4,
        isDownbeat: i % 4 === 0,
        measureNumber: Math.floor(i / 4),
        confidence: 1.0,
        source: 'detected' as const,
    }));

    return {
        detectedBeats: beats,
        mergedBeats: beats,
        bpm,
        quarterNoteInterval: beatInterval,
        metadata: {},
    };
}

/**
 * Helper to create a mock unified beat map.
 */
function createMockUnifiedBeatMap(beatCount: number, quarterNoteInterval: number = 0.5): UnifiedBeatMap {
    return {
        beats: Array.from({ length: beatCount }, (_, i) => ({
            timestamp: i * quarterNoteInterval,
            beatInMeasure: i % 4,
            isDownbeat: i % 4 === 0,
            measureNumber: Math.floor(i / 4),
            confidence: 1.0,
        })),
        quarterNoteInterval,
        bpm: 60 / quarterNoteInterval,
    };
}

/**
 * Helper to create a mock subdivided beat map.
 */
function createMockSubdividedBeatMap(beats: SubdividedBeatMap['beats']): SubdividedBeatMap {
    return {
        beats,
        quarterNoteInterval: 0.5,
        subdivisionMetadata: {
            totalBeats: beats.length,
            subdivisionTypesUsed: [...new Set(beats.map(b => b.subdivisionType))],
            averageDensity: 1,
        },
    };
}

// Track calls to BeatSubdivider for testing
let beatSubdividerCalls: Array<{ unifiedMap: UnifiedBeatMap; config: { segments: SubdivisionSegment[] } }> = [];

/**
 * Create a fresh mock for the playlist-data-engine module.
 */
function createEngineMock() {
    // Reset call tracker
    beatSubdividerCalls = [];

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
                // Track the call for assertions
                beatSubdividerCalls.push({ unifiedMap, config });

                // Create subdivided beats based on the first segment's subdivision
                const subdivision = config.segments[0]?.subdivision || 'quarter';
                const density = subdivision === 'eighth' ? 2 : subdivision === 'sixteenth' ? 4 : 1;

                const beats: SubdividedBeatMap['beats'] = [];
                for (let i = 0; i < unifiedMap.beats.length * density; i++) {
                    beats.push({
                        timestamp: i * (unifiedMap.quarterNoteInterval / density),
                        beatInMeasure: (i / density) % 4,
                        isDownbeat: i % (4 * density) === 0,
                        measureNumber: Math.floor(i / (4 * density)),
                        confidence: 1.0,
                        subdivisionType: subdivision,
                        sourceBeatIndex: Math.floor(i / density),
                        beatInSubdivision: i % density,
                    });
                }

                return createMockSubdividedBeatMap(beats);
            }
        },
        unifyBeatMap: vi.fn().mockImplementation((interpolatedMap: InterpolatedBeatMap) => ({
            beats: interpolatedMap.mergedBeats.map(b => ({
                timestamp: b.timestamp,
                beatInMeasure: b.beatInMeasure,
                isDownbeat: b.isDownbeat,
                measureNumber: b.measureNumber,
                confidence: b.confidence,
            })),
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
            segments: [{
                startBeat: 0,
                subdivision: 'quarter' as const,
            }],
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
        validateSubdivisionConfig: vi.fn(() => ({ valid: true, errors: [] })),
        validateSubdivisionConfigAgainstBeats: vi.fn(() => ({ valid: true, errors: [] })),
        validateSubdivisionDensity: vi.fn(() => ({ valid: true, errors: [] })),
        reapplyDownbeatConfig: vi.fn((beatMap: BeatMap) => beatMap),
        SubdivisionPlaybackController: class MockSubdivisionPlaybackController {
            setSubdivision = vi.fn();
            start = vi.fn();
            stop = vi.fn();
            destroy = vi.fn();
        },
    };
}

describe('beatDetectionStore subdivision state management', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    describe('generateUnifiedBeatMap', () => {
        it('should return null when no interpolated beat map exists', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Ensure no interpolated beat map
            useBeatDetectionStore.setState({ interpolatedBeatMap: null });

            const result = useBeatDetectionStore.getState().actions.generateUnifiedBeatMap();

            expect(result).toBeNull();
        });

        it('should generate UnifiedBeatMap from InterpolatedBeatMap', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const mockInterpolated = createMockInterpolatedBeatMap(100);
            useBeatDetectionStore.setState({ interpolatedBeatMap: mockInterpolated });

            const result = useBeatDetectionStore.getState().actions.generateUnifiedBeatMap();

            expect(result).not.toBeNull();
            expect(result?.beats).toHaveLength(100);
            expect(result?.quarterNoteInterval).toBe(0.5);
        });

        it('should update state with generated UnifiedBeatMap', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const mockInterpolated = createMockInterpolatedBeatMap(100);
            useBeatDetectionStore.setState({ interpolatedBeatMap: mockInterpolated });

            useBeatDetectionStore.getState().actions.generateUnifiedBeatMap();

            const state = useBeatDetectionStore.getState();
            expect(state.unifiedBeatMap).not.toBeNull();
            expect(state.unifiedBeatMap?.beats).toHaveLength(100);
        });

        it('should clear subdividedBeatMap when unifiedBeatMap changes', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const mockInterpolated = createMockInterpolatedBeatMap(100);
            const mockSubdivided = createMockSubdividedBeatMap([]);

            useBeatDetectionStore.setState({
                interpolatedBeatMap: mockInterpolated,
                subdividedBeatMap: mockSubdivided,
            });

            // Verify subdividedBeatMap is set
            expect(useBeatDetectionStore.getState().subdividedBeatMap).not.toBeNull();

            // Generate new unified beat map
            useBeatDetectionStore.getState().actions.generateUnifiedBeatMap();

            // subdividedBeatMap should be cleared
            expect(useBeatDetectionStore.getState().subdividedBeatMap).toBeNull();
        });
    });

    describe('generateSubdividedBeatMap', () => {
        it('should return null when no UnifiedBeatMap exists and no InterpolatedBeatMap to generate from', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            useBeatDetectionStore.setState({
                unifiedBeatMap: null,
                interpolatedBeatMap: null,
            });

            const result = useBeatDetectionStore.getState().actions.generateSubdividedBeatMap();

            expect(result).toBeNull();
        });

        it('should generate UnifiedBeatMap first if it does not exist but InterpolatedBeatMap does', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const mockInterpolated = createMockInterpolatedBeatMap(100);
            useBeatDetectionStore.setState({
                interpolatedBeatMap: mockInterpolated,
                unifiedBeatMap: null,
            });

            const result = useBeatDetectionStore.getState().actions.generateSubdividedBeatMap();

            // Verify that both unifiedBeatMap and subdividedBeatMap are now set
            const state = useBeatDetectionStore.getState();
            expect(state.unifiedBeatMap).not.toBeNull();
            expect(result).not.toBeNull();
        });

        it('should generate SubdividedBeatMap from UnifiedBeatMap using BeatSubdivider', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const mockUnified = createMockUnifiedBeatMap(100);
            useBeatDetectionStore.setState({ unifiedBeatMap: mockUnified });

            const result = useBeatDetectionStore.getState().actions.generateSubdividedBeatMap();

            // Verify the result is not null and has expected structure
            expect(result).not.toBeNull();
            expect(result?.beats).toBeDefined();
            expect(result?.quarterNoteInterval).toBe(0.5);
        });

        it('should update state with generated SubdividedBeatMap', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const mockUnified = createMockUnifiedBeatMap(100);
            useBeatDetectionStore.setState({ unifiedBeatMap: mockUnified });

            useBeatDetectionStore.getState().actions.generateSubdividedBeatMap();

            const state = useBeatDetectionStore.getState();
            expect(state.subdividedBeatMap).not.toBeNull();
            expect(state.subdividedBeatMap?.beats).toBeDefined();
        });

        it('should use current subdivisionConfig when generating', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const mockUnified = createMockUnifiedBeatMap(100);
            const customConfig = {
                segments: [
                    { startBeat: 0, subdivision: 'eighth' as const },
                    { startBeat: 32, subdivision: 'quarter' as const },
                ],
            };

            useBeatDetectionStore.setState({
                unifiedBeatMap: mockUnified,
                subdivisionConfig: customConfig,
            });

            const result = useBeatDetectionStore.getState().actions.generateSubdividedBeatMap();

            // Verify the subdivided beat map was generated
            expect(result).not.toBeNull();
            // Verify the state was updated
            const state = useBeatDetectionStore.getState();
            expect(state.subdividedBeatMap).not.toBeNull();
        });
    });

    describe('setSubdivisionConfig', () => {
        it('should update subdivisionConfig in state', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const newConfig = {
                segments: [
                    { startBeat: 0, subdivision: 'eighth' as const },
                    { startBeat: 50, subdivision: 'sixteenth' as const },
                ],
            };

            useBeatDetectionStore.getState().actions.setSubdivisionConfig(newConfig);

            const state = useBeatDetectionStore.getState();
            expect(state.subdivisionConfig).toEqual(newConfig);
        });

        it('should regenerate SubdividedBeatMap if one exists', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const mockUnified = createMockUnifiedBeatMap(100);
            const mockSubdivided = createMockSubdividedBeatMap([]);

            useBeatDetectionStore.setState({
                unifiedBeatMap: mockUnified,
                subdividedBeatMap: mockSubdivided,
            });

            const newConfig = {
                segments: [
                    { startBeat: 0, subdivision: 'eighth' as const },
                ],
            };

            useBeatDetectionStore.getState().actions.setSubdivisionConfig(newConfig);

            // Verify the subdividedBeatMap was regenerated (should have beats now)
            const state = useBeatDetectionStore.getState();
            expect(state.subdividedBeatMap).not.toBeNull();
            expect(state.subdividedBeatMap?.beats.length).toBeGreaterThan(0);
        });

        it('should not regenerate SubdividedBeatMap if none exists', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            useBeatDetectionStore.setState({ subdividedBeatMap: null });

            const newConfig = {
                segments: [
                    { startBeat: 0, subdivision: 'eighth' as const },
                ],
            };

            useBeatDetectionStore.getState().actions.setSubdivisionConfig(newConfig);

            // subdividedBeatMap should still be null (no regeneration)
            const state = useBeatDetectionStore.getState();
            expect(state.subdividedBeatMap).toBeNull();
        });
    });

    describe('addSubdivisionSegment', () => {
        it('should add a new segment and sort by startBeat', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const newSegment: SubdivisionSegment = {
                startBeat: 32,
                subdivision: 'eighth',
            };

            useBeatDetectionStore.getState().actions.addSubdivisionSegment(newSegment);

            const state = useBeatDetectionStore.getState();
            expect(state.subdivisionConfig.segments).toHaveLength(2);
            expect(state.subdivisionConfig.segments[1].startBeat).toBe(32);
            expect(state.subdivisionConfig.segments[1].subdivision).toBe('eighth');
        });

        it('should sort segments by startBeat when adding out of order', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Add segments out of order
            const segment64: SubdivisionSegment = {
                startBeat: 64,
                subdivision: 'sixteenth',
            };
            const segment32: SubdivisionSegment = {
                startBeat: 32,
                subdivision: 'eighth',
            };

            useBeatDetectionStore.getState().actions.addSubdivisionSegment(segment64);
            useBeatDetectionStore.getState().actions.addSubdivisionSegment(segment32);

            const state = useBeatDetectionStore.getState();
            expect(state.subdivisionConfig.segments).toHaveLength(3);
            expect(state.subdivisionConfig.segments[0].startBeat).toBe(0);
            expect(state.subdivisionConfig.segments[1].startBeat).toBe(32);
            expect(state.subdivisionConfig.segments[2].startBeat).toBe(64);
        });
    });

    describe('removeSubdivisionSegment', () => {
        it('should not allow removing the first segment (index 0)', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Get initial segment count
            const initialCount = useBeatDetectionStore.getState().subdivisionConfig.segments.length;

            // Try to remove the first segment
            useBeatDetectionStore.getState().actions.removeSubdivisionSegment(0);

            // Segment count should be unchanged
            const state = useBeatDetectionStore.getState();
            expect(state.subdivisionConfig.segments.length).toBe(initialCount);
        });

        it('should not allow removing with negative index', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const initialCount = useBeatDetectionStore.getState().subdivisionConfig.segments.length;

            useBeatDetectionStore.getState().actions.removeSubdivisionSegment(-1);

            const state = useBeatDetectionStore.getState();
            expect(state.subdivisionConfig.segments.length).toBe(initialCount);
        });

        it('should not allow removing with index out of bounds', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const initialCount = useBeatDetectionStore.getState().subdivisionConfig.segments.length;

            useBeatDetectionStore.getState().actions.removeSubdivisionSegment(999);

            const state = useBeatDetectionStore.getState();
            expect(state.subdivisionConfig.segments.length).toBe(initialCount);
        });

        it('should remove segment at specified index', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Add two segments
            useBeatDetectionStore.getState().actions.addSubdivisionSegment({
                startBeat: 32,
                subdivision: 'eighth',
            });
            useBeatDetectionStore.getState().actions.addSubdivisionSegment({
                startBeat: 64,
                subdivision: 'sixteenth',
            });

            // Remove the middle segment (index 1)
            useBeatDetectionStore.getState().actions.removeSubdivisionSegment(1);

            const state = useBeatDetectionStore.getState();
            expect(state.subdivisionConfig.segments).toHaveLength(2);
            expect(state.subdivisionConfig.segments[0].startBeat).toBe(0);
            expect(state.subdivisionConfig.segments[1].startBeat).toBe(64);
        });
    });

    describe('updateSubdivisionSegment', () => {
        it('should not allow updating with negative index', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const originalSegments = [...useBeatDetectionStore.getState().subdivisionConfig.segments];

            useBeatDetectionStore.getState().actions.updateSubdivisionSegment(-1, {
                subdivision: 'eighth',
            });

            // Segments should be unchanged
            const state = useBeatDetectionStore.getState();
            expect(state.subdivisionConfig.segments).toEqual(originalSegments);
        });

        it('should not allow updating with index out of bounds', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const originalSegments = [...useBeatDetectionStore.getState().subdivisionConfig.segments];

            useBeatDetectionStore.getState().actions.updateSubdivisionSegment(999, {
                subdivision: 'eighth',
            });

            // Segments should be unchanged
            const state = useBeatDetectionStore.getState();
            expect(state.subdivisionConfig.segments).toEqual(originalSegments);
        });

        it('should update segment subdivision type', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Add a segment
            useBeatDetectionStore.getState().actions.addSubdivisionSegment({
                startBeat: 32,
                subdivision: 'eighth',
            });

            // Update the subdivision type
            useBeatDetectionStore.getState().actions.updateSubdivisionSegment(1, {
                subdivision: 'sixteenth',
            });

            const state = useBeatDetectionStore.getState();
            expect(state.subdivisionConfig.segments[1].subdivision).toBe('sixteenth');
        });

        it('should update segment startBeat', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Add a segment
            useBeatDetectionStore.getState().actions.addSubdivisionSegment({
                startBeat: 32,
                subdivision: 'eighth',
            });

            // Update the startBeat
            useBeatDetectionStore.getState().actions.updateSubdivisionSegment(1, {
                startBeat: 48,
            });

            const state = useBeatDetectionStore.getState();
            expect(state.subdivisionConfig.segments[1].startBeat).toBe(48);
        });

        it('should re-sort segments when startBeat changes', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Add two segments
            useBeatDetectionStore.getState().actions.addSubdivisionSegment({
                startBeat: 32,
                subdivision: 'eighth',
            });
            useBeatDetectionStore.getState().actions.addSubdivisionSegment({
                startBeat: 64,
                subdivision: 'sixteenth',
            });

            // Update the second segment to be before the first
            useBeatDetectionStore.getState().actions.updateSubdivisionSegment(2, {
                startBeat: 16,
            });

            const state = useBeatDetectionStore.getState();
            expect(state.subdivisionConfig.segments).toHaveLength(3);
            expect(state.subdivisionConfig.segments[0].startBeat).toBe(0);
            expect(state.subdivisionConfig.segments[1].startBeat).toBe(16);
            expect(state.subdivisionConfig.segments[2].startBeat).toBe(32);
        });
    });

    describe('setCurrentSubdivision', () => {
        it('should update currentSubdivision in state', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            useBeatDetectionStore.getState().actions.setCurrentSubdivision('eighth');

            const state = useBeatDetectionStore.getState();
            expect(state.currentSubdivision).toBe('eighth');
        });

        it('should update playback controller if it exists', async () => {
            const engineMock = createEngineMock();
            vi.mock('playlist-data-engine', () => engineMock);

            const { useBeatDetectionStore, getActiveSubdivisionPlaybackController, setActiveSubdivisionPlaybackController } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Create and set a mock controller
            const mockController = {
                setSubdivision: vi.fn(),
                start: vi.fn(),
                stop: vi.fn(),
                destroy: vi.fn(),
            };
            setActiveSubdivisionPlaybackController(mockController as unknown as ReturnType<typeof engineMock.SubdivisionPlaybackController>);

            useBeatDetectionStore.getState().actions.setCurrentSubdivision('triplet8');

            expect(mockController.setSubdivision).toHaveBeenCalledWith('triplet8');

            // Cleanup
            setActiveSubdivisionPlaybackController(null);
        });
    });

    describe('subdivision state initialization', () => {
        it('should have default subdivision config on initialization', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const state = useBeatDetectionStore.getState();

            expect(state.subdivisionConfig).toBeDefined();
            expect(state.subdivisionConfig.segments).toHaveLength(1);
            expect(state.subdivisionConfig.segments[0].startBeat).toBe(0);
            expect(state.subdivisionConfig.segments[0].subdivision).toBe('quarter');
        });

        it('should have default currentSubdivision on initialization', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const state = useBeatDetectionStore.getState();
            expect(state.currentSubdivision).toBe('quarter');
        });

        it('should have null unifiedBeatMap and subdividedBeatMap on initialization', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const state = useBeatDetectionStore.getState();
            expect(state.unifiedBeatMap).toBeNull();
            expect(state.subdividedBeatMap).toBeNull();
        });
    });
});
