/**
 * Tests for beatDetectionStore subdivision state management
 *
 * Phase 9, Task 9.1: Unit Tests for Store
 * - Test generateUnifiedBeatMap
 * - Test generateSubdividedBeatMap
 * - Test subdivision config updates
 * - Test setSubdivisionTransitionMode
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { BeatMap, InterpolatedBeatMap, UnifiedBeatMap, SubdividedBeatMap, SubdivisionType } from '@/types';

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
 * Helper to create a mock subdivided beat map.
 */
function createMockSubdividedBeatMap(beats: SubdividedBeatMap['beats']): SubdividedBeatMap {
    return {
        audioId: 'test-audio-id',
        duration: 100,
        beats,
        detectedBeatIndices: [],
        subdivisionConfig: {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'quarter',
        },
        downbeatConfig: {
            segments: [{
                startBeat: 0,
                downbeatBeatIndex: 0,
                timeSignature: { beatsPerMeasure: 4 },
            }],
        },
        subdivisionMetadata: {
            totalBeats: beats.length,
            subdivisionTypesUsed: [...new Set(beats.map(b => b.subdivisionType))],
            averageDensity: 1,
            averageDensityMultiplier: 1,
            originalBeatCount: beats.length,
            subdividedBeatCount: beats.length,
            explicitBeatCount: 0,
            subdivisionsUsed: [...new Set(beats.map(b => b.subdivisionType))],
            hasMultipleTempos: false,
            maxDensity: 1,
        },
    };
}

/**
 * Create a fresh mock for the playlist-data-engine module.
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
            subdivide(unifiedMap: UnifiedBeatMap, config: { beatSubdivisions: Map<number, SubdivisionType>; defaultSubdivision: SubdivisionType }) {
                // Create subdivided beats based on the config
                const beats: SubdividedBeatMap['beats'] = [];
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

                return createMockSubdividedBeatMap(beats);
            }
        },
        unifyBeatMap: vi.fn().mockImplementation((interpolatedMap: InterpolatedBeatMap) => ({
            audioId: 'test-audio-id',
            duration: 100,
            beats: interpolatedMap.mergedBeats.map(b => ({
                timestamp: b.timestamp,
                beatInMeasure: b.beatInMeasure,
                isDownbeat: b.isDownbeat,
                measureNumber: b.measureNumber,
                confidence: b.confidence,
                intensity: 0.8,
            })),
            detectedBeatIndices: interpolatedMap.mergedBeats.map((_, i) => i),
            quarterNoteInterval: interpolatedMap.quarterNoteInterval,
            quarterNoteBpm: interpolatedMap.bpm,
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
        reapplyDownbeatConfig: vi.fn((beatMap: BeatMap) => beatMap),
        SubdivisionPlaybackController: vi.fn().mockImplementation(() => ({
            setSubdivision: vi.fn(),
            setTransitionMode: vi.fn(),
            start: vi.fn(),
            stop: vi.fn(),
            dispose: vi.fn(),
        })),
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
                beatSubdivisions: new Map([[0, 'eighth'], [1, 'sixteenth']]),
                defaultSubdivision: 'quarter' as const,
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
                beatSubdivisions: new Map([[0, 'eighth']]),
                defaultSubdivision: 'quarter' as const,
            };

            useBeatDetectionStore.getState().actions.setSubdivisionConfig(newConfig);

            const state = useBeatDetectionStore.getState();
            expect(state.subdivisionConfig.beatSubdivisions.get(0)).toBe('eighth');
            expect(state.subdivisionConfig.defaultSubdivision).toBe('quarter');
        });

        it('should regenerate SubdividedBeatMap if one exists', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const mockUnified = createMockUnifiedBeatMap(100);

            useBeatDetectionStore.setState({
                unifiedBeatMap: mockUnified,
            });

            // First generate a subdivided beat map
            useBeatDetectionStore.getState().actions.generateSubdividedBeatMap();
            expect(useBeatDetectionStore.getState().subdividedBeatMap).not.toBeNull();

            // Now update the config
            const newConfig = {
                beatSubdivisions: new Map(),
                defaultSubdivision: 'eighth' as const,
            };

            useBeatDetectionStore.getState().actions.setSubdivisionConfig(newConfig);

            // subdividedBeatMap should still exist (regenerated)
            const state = useBeatDetectionStore.getState();
            expect(state.subdividedBeatMap).not.toBeNull();
        });

        it('should not regenerate SubdividedBeatMap if none exists', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            useBeatDetectionStore.setState({ subdividedBeatMap: null });

            const newConfig = {
                beatSubdivisions: new Map(),
                defaultSubdivision: 'eighth' as const,
            };

            useBeatDetectionStore.getState().actions.setSubdivisionConfig(newConfig);

            // subdividedBeatMap should still be null (no regeneration)
            const state = useBeatDetectionStore.getState();
            expect(state.subdividedBeatMap).toBeNull();
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
                setTransitionMode: vi.fn(),
                start: vi.fn(),
                stop: vi.fn(),
                dispose: vi.fn(),
            };
            setActiveSubdivisionPlaybackController(mockController as unknown as ReturnType<typeof engineMock.SubdivisionPlaybackController>);

            useBeatDetectionStore.getState().actions.setCurrentSubdivision('triplet8');

            expect(mockController.setSubdivision).toHaveBeenCalledWith('triplet8');

            // Cleanup
            setActiveSubdivisionPlaybackController(null);
        });
    });

    describe('setSubdivisionTransitionMode', () => {
        it('should update subdivisionTransitionMode in state', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            useBeatDetectionStore.getState().actions.setSubdivisionTransitionMode('next-downbeat');

            const state = useBeatDetectionStore.getState();
            expect(state.subdivisionTransitionMode).toBe('next-downbeat');
        });

        it('should update playback controller transition mode if controller exists', async () => {
            const engineMock = createEngineMock();
            vi.mock('playlist-data-engine', () => engineMock);

            const { useBeatDetectionStore, setActiveSubdivisionPlaybackController } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Create and set a mock controller
            const mockController = {
                setSubdivision: vi.fn(),
                setTransitionMode: vi.fn(),
                start: vi.fn(),
                stop: vi.fn(),
                dispose: vi.fn(),
            };
            setActiveSubdivisionPlaybackController(mockController as unknown as ReturnType<typeof engineMock.SubdivisionPlaybackController>);

            useBeatDetectionStore.getState().actions.setSubdivisionTransitionMode('next-measure');

            expect(mockController.setTransitionMode).toHaveBeenCalledWith('next-measure');

            // Cleanup
            setActiveSubdivisionPlaybackController(null);
        });

        it('should not throw if no playback controller exists', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore, setActiveSubdivisionPlaybackController } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Ensure no active controller
            setActiveSubdivisionPlaybackController(null);

            // Should not throw
            expect(() => {
                useBeatDetectionStore.getState().actions.setSubdivisionTransitionMode('immediate');
            }).not.toThrow();

            const state = useBeatDetectionStore.getState();
            expect(state.subdivisionTransitionMode).toBe('immediate');
        });

        it('should support all transition modes', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const modes: Array<'immediate' | 'next-downbeat' | 'next-measure'> = ['immediate', 'next-downbeat', 'next-measure'];

            for (const mode of modes) {
                useBeatDetectionStore.getState().actions.setSubdivisionTransitionMode(mode);
                expect(useBeatDetectionStore.getState().subdivisionTransitionMode).toBe(mode);
            }
        });
    });

    describe('subdivision state initialization', () => {
        it('should have default subdivision config on initialization', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const state = useBeatDetectionStore.getState();

            expect(state.subdivisionConfig).toBeDefined();
            expect(state.subdivisionConfig.beatSubdivisions).toBeInstanceOf(Map);
            expect(state.subdivisionConfig.defaultSubdivision).toBe('quarter');
        });

        it('should have default currentSubdivision on initialization', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const state = useBeatDetectionStore.getState();
            expect(state.currentSubdivision).toBe('quarter');
        });

        it('should have default subdivisionTransitionMode on initialization', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const state = useBeatDetectionStore.getState();
            expect(state.subdivisionTransitionMode).toBe('immediate');
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
