/**
 * Tests for beatDetectionStore multi-segment downbeat support
 *
 * These tests verify that the store correctly handles multiple downbeat segments
 * for time signature changes mid-track.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { BeatMap, DownbeatSegment } from '@/types';

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
 * Create a fresh mock for the playlist-data-engine module.
 * This needs to be called before each test to ensure clean state.
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
        DEFAULT_BEAT_INTERPOLATION_OPTIONS: {},
        DEFAULT_DOWNBEAT_CONFIG: {
            segments: [{
                startBeat: 0,
                downbeatBeatIndex: 0,
                timeSignature: { beatsPerMeasure: 4 },
            }],
        },
        // Mock reapplyDownbeatConfig to update beats based on segments
        reapplyDownbeatConfig: vi.fn((beatMap: BeatMap, config: { segments: DownbeatSegment[] }) => {
            const beats = beatMap.beats.map((beat, index) => {
                // Find the active segment for this beat
                let activeSegment = config.segments[0];
                for (let i = config.segments.length - 1; i >= 0; i--) {
                    if (index >= config.segments[i].startBeat) {
                        activeSegment = config.segments[i];
                        break;
                    }
                }

                const beatsPerMeasure = activeSegment.timeSignature.beatsPerMeasure;
                const downbeatIndex = activeSegment.downbeatBeatIndex;

                // Calculate beat position relative to downbeat
                const beatsFromDownbeat = (index - downbeatIndex + beatsPerMeasure * 1000) % beatsPerMeasure;
                const isDownbeat = beatsFromDownbeat === 0;

                return {
                    ...beat,
                    beatInMeasure: beatsFromDownbeat,
                    isDownbeat,
                    measureNumber: Math.floor((index - downbeatIndex) / beatsPerMeasure),
                };
            });

            return { ...beatMap, beats, downbeatConfig: config };
        }),
    };
}

describe('beatDetectionStore multi-segment downbeat support', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    describe('addDownbeatSegment', () => {
        it('should add a new segment and sort by startBeat', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');

            // Wait for async rehydration
            await new Promise(resolve => setTimeout(resolve, 100));

            // First, simulate having a beat map loaded
            const mockBeatMap = createMockBeatMap(100);
            useBeatDetectionStore.setState({ beatMap: mockBeatMap });

            // Add a segment at beat 32 with 3/4 time
            const newSegment: DownbeatSegment = {
                startBeat: 32,
                downbeatBeatIndex: 32,
                timeSignature: { beatsPerMeasure: 3 },
            };

            useBeatDetectionStore.getState().actions.addDownbeatSegment(newSegment);

            // Verify the downbeat config was updated with the new segment
            const state = useBeatDetectionStore.getState();
            expect(state.downbeatConfig).not.toBeNull();
            expect(state.downbeatConfig?.segments).toHaveLength(2);
            expect(state.downbeatConfig?.segments[0].startBeat).toBe(0);
            expect(state.downbeatConfig?.segments[1].startBeat).toBe(32);
            expect(state.downbeatConfig?.segments[1].timeSignature.beatsPerMeasure).toBe(3);
        });

        it('should sort segments by startBeat when adding out of order', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const mockBeatMap = createMockBeatMap(100);
            useBeatDetectionStore.setState({ beatMap: mockBeatMap });

            // Add segments out of order
            const segment64: DownbeatSegment = {
                startBeat: 64,
                downbeatBeatIndex: 64,
                timeSignature: { beatsPerMeasure: 6 },
            };
            const segment32: DownbeatSegment = {
                startBeat: 32,
                downbeatBeatIndex: 32,
                timeSignature: { beatsPerMeasure: 3 },
            };

            useBeatDetectionStore.getState().actions.addDownbeatSegment(segment64);
            useBeatDetectionStore.getState().actions.addDownbeatSegment(segment32);

            // Verify segments are sorted by startBeat
            const state = useBeatDetectionStore.getState();
            expect(state.downbeatConfig?.segments).toHaveLength(3);
            expect(state.downbeatConfig?.segments[0].startBeat).toBe(0);
            expect(state.downbeatConfig?.segments[1].startBeat).toBe(32);
            expect(state.downbeatConfig?.segments[2].startBeat).toBe(64);
        });
    });

    describe('removeDownbeatSegment', () => {
        it('should not allow removing the first segment (index 0)', async () => {
            vi.mock('playlist-data-engine', () => ({
                BeatMapGenerator: vi.fn().mockImplementation(() => ({
                    generateBeatMap: vi.fn().mockResolvedValue(createMockBeatMap(100)),
                    cancel: vi.fn(),
                })),
                BeatInterpolator: vi.fn().mockImplementation(() => ({
                    interpolate: vi.fn().mockReturnValue(createMockBeatMap(100)),
                })),
                DEFAULT_BEAT_INTERPOLATION_OPTIONS: {},
                DEFAULT_DOWNBEAT_CONFIG: {
                    segments: [{
                        startBeat: 0,
                        downbeatBeatIndex: 0,
                        timeSignature: { beatsPerMeasure: 4 },
                    }],
                },
                reapplyDownbeatConfig: vi.fn((bm) => bm),
            }));

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const store = useBeatDetectionStore.getState();
            const mockBeatMap = createMockBeatMap(100);
            useBeatDetectionStore.setState({ beatMap: mockBeatMap });

            // Try to remove the first segment
            store.actions.removeDownbeatSegment(0);

            // The config should still have at least one segment
            const state = useBeatDetectionStore.getState();
            expect(state.downbeatConfig?.segments.length ?? 1).toBeGreaterThanOrEqual(1);
        });

        it('should remove segment at specified index', async () => {
            vi.mock('playlist-data-engine', () => ({
                BeatMapGenerator: vi.fn().mockImplementation(() => ({
                    generateBeatMap: vi.fn().mockResolvedValue(createMockBeatMap(100)),
                    cancel: vi.fn(),
                })),
                BeatInterpolator: vi.fn().mockImplementation(() => ({
                    interpolate: vi.fn().mockReturnValue(createMockBeatMap(100)),
                })),
                DEFAULT_BEAT_INTERPOLATION_OPTIONS: {},
                DEFAULT_DOWNBEAT_CONFIG: {
                    segments: [{
                        startBeat: 0,
                        downbeatBeatIndex: 0,
                        timeSignature: { beatsPerMeasure: 4 },
                    }],
                },
                reapplyDownbeatConfig: vi.fn((bm, config) => {
                    return { ...bm, downbeatConfig: config };
                }),
            }));

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const store = useBeatDetectionStore.getState();
            const mockBeatMap = createMockBeatMap(100);
            useBeatDetectionStore.setState({ beatMap: mockBeatMap });

            // Add two segments
            store.actions.addDownbeatSegment({
                startBeat: 32,
                downbeatBeatIndex: 32,
                timeSignature: { beatsPerMeasure: 3 },
            });
            store.actions.addDownbeatSegment({
                startBeat: 64,
                downbeatBeatIndex: 64,
                timeSignature: { beatsPerMeasure: 6 },
            });

            // Remove the middle segment (index 1)
            store.actions.removeDownbeatSegment(1);

            const state = useBeatDetectionStore.getState();
            expect(state.downbeatConfig?.segments).toHaveLength(2);
            expect(state.downbeatConfig?.segments[0].startBeat).toBe(0);
            expect(state.downbeatConfig?.segments[1].startBeat).toBe(64);
        });
    });

    describe('updateDownbeatSegment', () => {
        it('should update segment properties', async () => {
            vi.mock('playlist-data-engine', () => ({
                BeatMapGenerator: vi.fn().mockImplementation(() => ({
                    generateBeatMap: vi.fn().mockResolvedValue(createMockBeatMap(100)),
                    cancel: vi.fn(),
                })),
                BeatInterpolator: vi.fn().mockImplementation(() => ({
                    interpolate: vi.fn().mockReturnValue(createMockBeatMap(100)),
                })),
                DEFAULT_BEAT_INTERPOLATION_OPTIONS: {},
                DEFAULT_DOWNBEAT_CONFIG: {
                    segments: [{
                        startBeat: 0,
                        downbeatBeatIndex: 0,
                        timeSignature: { beatsPerMeasure: 4 },
                    }],
                },
                reapplyDownbeatConfig: vi.fn((bm, config) => {
                    return { ...bm, downbeatConfig: config };
                }),
            }));

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const store = useBeatDetectionStore.getState();
            const mockBeatMap = createMockBeatMap(100);
            useBeatDetectionStore.setState({ beatMap: mockBeatMap });

            // Add a segment
            store.actions.addDownbeatSegment({
                startBeat: 32,
                downbeatBeatIndex: 32,
                timeSignature: { beatsPerMeasure: 3 },
            });

            // Update the time signature
            store.actions.updateDownbeatSegment(1, {
                timeSignature: { beatsPerMeasure: 5 },
            });

            const state = useBeatDetectionStore.getState();
            expect(state.downbeatConfig?.segments[1].timeSignature.beatsPerMeasure).toBe(5);
        });
    });

    describe('resetDownbeatConfig', () => {
        it('should reset downbeatConfig to null (default)', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const mockBeatMap = createMockBeatMap(100);
            useBeatDetectionStore.setState({ beatMap: mockBeatMap });

            // First, set a custom downbeat position
            useBeatDetectionStore.getState().actions.setDownbeatPosition(5, 4);

            // Verify custom config is set
            let state = useBeatDetectionStore.getState();
            expect(state.downbeatConfig).not.toBeNull();
            expect(state.downbeatConfig?.segments[0].downbeatBeatIndex).toBe(5);

            // Now reset
            useBeatDetectionStore.getState().actions.resetDownbeatConfig();

            // Verify config is reset to null (default)
            state = useBeatDetectionStore.getState();
            expect(state.downbeatConfig).toBeNull();
        });

        it('should reapply default config to beatMap beats', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            const mockBeatMap = createMockBeatMap(100);
            useBeatDetectionStore.setState({ beatMap: mockBeatMap });

            // Set a custom downbeat position (beat 5 is downbeat)
            useBeatDetectionStore.getState().actions.setDownbeatPosition(5, 4);

            // Verify beats are updated with custom config
            let state = useBeatDetectionStore.getState();
            expect(state.beatMap?.beats[5].isDownbeat).toBe(true);
            expect(state.beatMap?.beats[0].isDownbeat).toBe(false);

            // Reset to default
            useBeatDetectionStore.getState().actions.resetDownbeatConfig();

            // Verify beats are reset to default (beat 0 is downbeat)
            state = useBeatDetectionStore.getState();
            expect(state.beatMap?.beats[0].isDownbeat).toBe(true);
            expect(state.beatMap?.beats[5].isDownbeat).toBe(false);
        });

        it('should handle reset when no beat map is loaded', async () => {
            vi.mock('playlist-data-engine', () => createEngineMock());

            const { useBeatDetectionStore } = await import('./beatDetectionStore');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Ensure no beat map is loaded
            useBeatDetectionStore.setState({ beatMap: null });

            // Reset should not throw and should not change state
            expect(() => {
                useBeatDetectionStore.getState().actions.resetDownbeatConfig();
            }).not.toThrow();

            const state = useBeatDetectionStore.getState();
            expect(state.beatMap).toBeNull();
        });
    });
});
