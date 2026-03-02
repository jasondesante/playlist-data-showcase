/**
 * Tests for beatDetectionStore persistence
 *
 * Verification Checklist: Config persists after page reload (localStorage)
 *
 * Tests that downbeatConfig and showMeasureBoundaries are properly persisted
 * via the partialize function and will be saved to storage.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localforage before importing the store
const mockStorage: Record<string, string> = {};
let setItemCalls: Array<[string, string]> = [];

vi.mock('localforage', () => ({
    default: {
        config: vi.fn(),
        getItem: vi.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
        setItem: vi.fn((key: string, value: string) => {
            setItemCalls.push([key, value]);
            mockStorage[key] = value;
            return Promise.resolve(value);
        }),
        removeItem: vi.fn((key: string) => {
            delete mockStorage[key];
            return Promise.resolve();
        }),
        clear: vi.fn(() => {
            Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
            return Promise.resolve();
        }),
        keys: vi.fn(() => Promise.resolve(Object.keys(mockStorage))),
    },
}));

// Mock the logger
vi.mock('@/utils/logger', () => ({
    logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock the engine imports with all necessary exports
vi.mock('playlist-data-engine', () => ({
    BeatMapGenerator: vi.fn(),
    BeatInterpolator: vi.fn(),
    DEFAULT_BEAT_INTERPOLATION_OPTIONS: {
        targetBpm: 120,
        interpolationMode: 'subdivide',
        maxSubdivisions: 2,
        phaseLockedSettings: {
            toleranceMs: 50,
            maxPhaseAdaptation: 0.1,
        },
    },
}));

describe('beatDetectionStore persistence', () => {
    beforeEach(() => {
        // Clear mock storage and calls before each test
        Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
        setItemCalls = [];
    });

    describe('partialize configuration', () => {
        it('should include downbeatConfig in store state', async () => {
            // Import store after mocks are set up
            const { useBeatDetectionStore } = await import('./beatDetectionStore');

            // Get the store state
            const store = useBeatDetectionStore.getState();

            // The store should have the downbeatConfig property
            expect(store).toHaveProperty('downbeatConfig');
            expect(store).toHaveProperty('showMeasureBoundaries');
        });

        it('should persist showMeasureBoundaries when changed', async () => {
            const { useBeatDetectionStore } = await import('./beatDetectionStore');

            // Clear previous calls
            setItemCalls = [];

            // Set showMeasureBoundaries to true via setState to ensure it triggers persistence
            useBeatDetectionStore.setState({ showMeasureBoundaries: true });

            // Wait for the persist middleware to save
            await new Promise(resolve => setTimeout(resolve, 100));

            // Find the LAST call with the beat-detection-storage key (most recent state)
            const storageCalls = setItemCalls.filter(call => call[0] === 'beat-detection-storage');
            expect(storageCalls.length).toBeGreaterThan(0);

            const lastCall = storageCalls[storageCalls.length - 1];

            // Parse the stored value and check for showMeasureBoundaries
            const storedValue = JSON.parse(lastCall[1]);
            expect(storedValue.state.showMeasureBoundaries).toBe(true);
        });
    });

    describe('persistence verification', () => {
        it('should store downbeatConfig in partialize output (null by default)', async () => {
            const { useBeatDetectionStore } = await import('./beatDetectionStore');

            // Directly set downbeatConfig to verify it's persisted
            const testConfig = {
                segments: [{
                    startBeat: 0,
                    timeSignature: { beatsPerMeasure: 3 },
                    downbeatBeatIndex: 5,
                }],
            };

            useBeatDetectionStore.setState({ downbeatConfig: testConfig });

            // Wait for persistence
            await new Promise(resolve => setTimeout(resolve, 100));

            // Verify it was saved
            const storageCall = setItemCalls.find(call => call[0] === 'beat-detection-storage');
            expect(storageCall).toBeDefined();

            const storedValue = JSON.parse(storageCall![1]);
            expect(storedValue.state.downbeatConfig).toEqual(testConfig);
        });

        it('should include both downbeatConfig and showMeasureBoundaries in persisted state', async () => {
            const { useBeatDetectionStore } = await import('./beatDetectionStore');

            // Trigger a save by setting showMeasureBoundaries
            useBeatDetectionStore.setState({
                showMeasureBoundaries: true,
                downbeatConfig: {
                    segments: [{
                        startBeat: 0,
                        timeSignature: { beatsPerMeasure: 6 },
                        downbeatBeatIndex: 2,
                    }],
                },
            });

            // Wait for persistence
            await new Promise(resolve => setTimeout(resolve, 100));

            // Verify both are saved
            const storageCall = setItemCalls.find(call => call[0] === 'beat-detection-storage');
            expect(storageCall).toBeDefined();

            const storedValue = JSON.parse(storageCall![1]);
            expect(storedValue.state).toHaveProperty('downbeatConfig');
            expect(storedValue.state).toHaveProperty('showMeasureBoundaries');
            expect(storedValue.state.showMeasureBoundaries).toBe(true);
            expect(storedValue.state.downbeatConfig.segments[0].timeSignature.beatsPerMeasure).toBe(6);
        });
    });
});
