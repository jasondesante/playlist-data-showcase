/**
 * Tests for beatDetectionStore migration logic
 *
 * These tests verify that the store correctly migrates old settings
 * (like intensityThreshold) to new settings (like filter) when loading
 * persisted state from localStorage.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

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

// Mock the engine
vi.mock('playlist-data-engine', () => ({
    BeatMapGenerator: vi.fn().mockImplementation(() => ({
        generateBeatMap: vi.fn().mockResolvedValue({
            beats: [],
            bpm: 120,
            audioId: 'test',
            metadata: {},
        }),
        cancel: vi.fn(),
    })),
    BeatInterpolator: vi.fn().mockImplementation(() => ({
        interpolate: vi.fn().mockReturnValue({
            beats: [],
            bpm: 120,
            audioId: 'test',
            metadata: {},
        }),
    })),
    DEFAULT_BEAT_INTERPOLATION_OPTIONS: {
        phaseLockStrength: 0.8,
        gridTolerance: 0.1,
        maxBpmDeviation: 30,
        minGridConfidence: 0.5,
    },
}));

/**
 * Helper to wrap state in zustand persist format
 * Zustand persist middleware stores data as: { state: {...}, version: 0 }
 */
function wrapPersistedState(state: object): string {
    return JSON.stringify({
        state,
        version: 0,
    });
}

describe('beatDetectionStore migration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset modules to get fresh store instances
        vi.resetModules();
    });

    describe('intensityThreshold to filter migration', () => {
        it('should migrate intensityThreshold to filter when filter is not set', async () => {
            // Setup: Create old persisted state with intensityThreshold
            const oldState = {
                generatorOptions: {
                    minBpm: 60,
                    maxBpm: 180,
                    intensityThreshold: 0.5, // Old parameter
                    // No filter set
                },
                cachedBeatMaps: {},
                cacheOrder: [],
            };

            // Mock storage to return the old state in zustand format
            const { storage } = await import('@/utils/storage');
            vi.mocked(storage.getItem).mockResolvedValueOnce(wrapPersistedState(oldState));

            // Import store after mocking
            const { useBeatDetectionStore } = await import('./beatDetectionStore');

            // Wait for async rehydration
            await new Promise(resolve => setTimeout(resolve, 100));

            // Get the migrated state
            const state = useBeatDetectionStore.getState();

            // Verify migration
            expect(state.generatorOptions.filter).toBe(0.5);
            expect(state.generatorOptions.intensityThreshold).toBeUndefined();
        });

        it('should not override existing filter value during migration', async () => {
            // Setup: Create old persisted state with both intensityThreshold and filter
            const oldState = {
                generatorOptions: {
                    minBpm: 60,
                    maxBpm: 180,
                    intensityThreshold: 0.3, // Old value
                    filter: 0.7, // New value already set
                },
                cachedBeatMaps: {},
                cacheOrder: [],
            };

            const { storage } = await import('@/utils/storage');
            vi.mocked(storage.getItem).mockResolvedValueOnce(wrapPersistedState(oldState));

            const { useBeatDetectionStore } = await import('./beatDetectionStore');

            await new Promise(resolve => setTimeout(resolve, 100));

            const state = useBeatDetectionStore.getState();

            // Filter should NOT be overwritten by intensityThreshold
            expect(state.generatorOptions.filter).toBe(0.7);
            // intensityThreshold should still be removed
            expect(state.generatorOptions.intensityThreshold).toBeUndefined();
        });

        it('should handle migration with intensityThreshold = 0 (most sensitive)', async () => {
            const oldState = {
                generatorOptions: {
                    intensityThreshold: 0, // Edge case: most sensitive
                },
                cachedBeatMaps: {},
                cacheOrder: [],
            };

            const { storage } = await import('@/utils/storage');
            vi.mocked(storage.getItem).mockResolvedValueOnce(wrapPersistedState(oldState));

            const { useBeatDetectionStore } = await import('./beatDetectionStore');

            await new Promise(resolve => setTimeout(resolve, 100));

            const state = useBeatDetectionStore.getState();

            expect(state.generatorOptions.filter).toBe(0);
            expect(state.generatorOptions.intensityThreshold).toBeUndefined();
        });

        it('should handle migration with intensityThreshold = 1 (least sensitive)', async () => {
            const oldState = {
                generatorOptions: {
                    intensityThreshold: 1, // Edge case: least sensitive
                },
                cachedBeatMaps: {},
                cacheOrder: [],
            };

            const { storage } = await import('@/utils/storage');
            vi.mocked(storage.getItem).mockResolvedValueOnce(wrapPersistedState(oldState));

            const { useBeatDetectionStore } = await import('./beatDetectionStore');

            await new Promise(resolve => setTimeout(resolve, 100));

            const state = useBeatDetectionStore.getState();

            expect(state.generatorOptions.filter).toBe(1);
            expect(state.generatorOptions.intensityThreshold).toBeUndefined();
        });

        it('should use default values when no persisted state exists', async () => {
            // No persisted data
            const { storage } = await import('@/utils/storage');
            vi.mocked(storage.getItem).mockResolvedValue(null);

            const { useBeatDetectionStore } = await import('./beatDetectionStore');

            await new Promise(resolve => setTimeout(resolve, 100));

            const state = useBeatDetectionStore.getState();

            // Should have default values
            expect(state.generatorOptions.sensitivity).toBe(1.0);
            expect(state.generatorOptions.filter).toBe(0.0);
            expect(state.generatorOptions.intensityThreshold).toBeUndefined();
        });

        it('should preserve other generator options during migration', async () => {
            const oldState = {
                generatorOptions: {
                    minBpm: 80,
                    maxBpm: 160,
                    intensityThreshold: 0.4,
                    tempoCenter: 0.7,
                    noiseFloorThreshold: 0.15,
                },
                cachedBeatMaps: {},
                cacheOrder: [],
            };

            const { storage } = await import('@/utils/storage');
            vi.mocked(storage.getItem).mockResolvedValueOnce(wrapPersistedState(oldState));

            const { useBeatDetectionStore } = await import('./beatDetectionStore');

            await new Promise(resolve => setTimeout(resolve, 100));

            const state = useBeatDetectionStore.getState();

            // Other options should be preserved
            expect(state.generatorOptions.minBpm).toBe(80);
            expect(state.generatorOptions.maxBpm).toBe(160);
            expect(state.generatorOptions.tempoCenter).toBe(0.7);
            expect(state.generatorOptions.noiseFloorThreshold).toBe(0.15);
            // Migration should have happened
            expect(state.generatorOptions.filter).toBe(0.4);
            expect(state.generatorOptions.intensityThreshold).toBeUndefined();
        });
    });

    describe('error handling on load', () => {
        it('should not throw errors when loading with corrupted persisted state', async () => {
            // Mock storage to return invalid JSON
            const { storage } = await import('@/utils/storage');
            vi.mocked(storage.getItem).mockResolvedValueOnce('invalid json {{{');

            // Import store should not throw
            let error: Error | null = null;
            try {
                const { useBeatDetectionStore } = await import('./beatDetectionStore');
                await new Promise(resolve => setTimeout(resolve, 100));

                // Store should still be usable with defaults
                const state = useBeatDetectionStore.getState();
                expect(state.generatorOptions.sensitivity).toBe(1.0);
                expect(state.generatorOptions.filter).toBe(0.0);
            } catch (e) {
                error = e as Error;
            }

            expect(error).toBeNull();
        });

        it('should not throw errors when loading with null persisted state', async () => {
            const { storage } = await import('@/utils/storage');
            vi.mocked(storage.getItem).mockResolvedValueOnce(null);

            let error: Error | null = null;
            try {
                const { useBeatDetectionStore } = await import('./beatDetectionStore');
                await new Promise(resolve => setTimeout(resolve, 100));

                const state = useBeatDetectionStore.getState();
                expect(state.generatorOptions.sensitivity).toBe(1.0);
                expect(state.generatorOptions.filter).toBe(0.0);
            } catch (e) {
                error = e as Error;
            }

            expect(error).toBeNull();
        });

        it('should not throw errors when loading with empty object persisted state', async () => {
            const { storage } = await import('@/utils/storage');
            vi.mocked(storage.getItem).mockResolvedValueOnce(wrapPersistedState({}));

            let error: Error | null = null;
            try {
                const { useBeatDetectionStore } = await import('./beatDetectionStore');
                await new Promise(resolve => setTimeout(resolve, 100));

                const state = useBeatDetectionStore.getState();
                // Should have defaults since nothing was persisted
                expect(state.generatorOptions.sensitivity).toBe(1.0);
                expect(state.generatorOptions.filter).toBe(0.0);
            } catch (e) {
                error = e as Error;
            }

            expect(error).toBeNull();
        });
    });
});
