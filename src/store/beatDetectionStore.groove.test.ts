/**
 * Tests for beatDetectionStore Groove Functionality
 *
 * Task 8.1: Unit Tests for Store
 * - Test groove analyzer initialization
 * - Test `recordGrooveHit` updates state correctly
 * - Test `recordGrooveMiss` reduces hotness
 * - Test best groove tracking
 * - Test reset clears all groove state
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useBeatDetectionStore } from './beatDetectionStore';
import type { GrooveResult, GrooveState } from '@/types';

// Partially mock the GrooveAnalyzer from the engine
// Note: All variables used inside the mock must be defined inside the mock function
// because vi.mock is hoisted to the top of the file
vi.mock(import('playlist-data-engine'), async (importOriginal) => {
    const actual = await importOriginal() as Record<string, unknown>;

    // Create mock functions
    const mockGetState = vi.fn(() => ({
        hotness: 0,
        streakLength: 0,
        pocketDirection: 'neutral',
        establishedOffset: 0,
        consistency: 0,
        inPocket: false,
        pocketWindow: 0.03,
    }));

    const mockRecordHit = vi.fn((offset: number, bpm: number): GrooveResult => ({
        pocketDirection: offset < -0.01 ? 'push' : offset > 0.01 ? 'pull' : 'neutral',
        establishedOffset: offset,
        consistency: 0.8,
        hotness: 8,
        streakLength: 1,
        inPocket: true,
        pocketWindow: 0.03,
    }));

    const mockRecordMiss = vi.fn((): GrooveResult => ({
        pocketDirection: 'neutral',
        establishedOffset: 0,
        consistency: 0,
        hotness: 0,
        streakLength: 0,
        inPocket: false,
        pocketWindow: 0.03,
    }));

    const mockReset = vi.fn();

    // Mock class using class syntax (required for vitest to recognize as constructor)
    class MockGrooveAnalyzer {
        getState = mockGetState;
        recordHit = mockRecordHit;
        recordMiss = mockRecordMiss;
        reset = mockReset;
        setDifficulty = vi.fn(); // Added for initGrooveAnalyzer and resetGrooveAnalyzer
    }

    return {
        ...actual,
        GrooveAnalyzer: MockGrooveAnalyzer,
    };
});

describe('beatDetectionStore - Groove Functionality', () => {
    // Get fresh store and reset before each test
    beforeEach(() => {
        // Reset the store to initial state
        useBeatDetectionStore.setState({
            grooveAnalyzer: null,
            grooveState: null,
            bestGrooveHotness: 0,
            bestGrooveStreak: 0,
        });

        // Clear all mocks
        vi.clearAllMocks();
    });

    describe('Task 8.1.1: Groove Analyzer Initialization', () => {
        it('should initialize groove analyzer with null by default', () => {
            const state = useBeatDetectionStore.getState();
            expect(state.grooveAnalyzer).toBeNull();
            expect(state.grooveState).toBeNull();
        });

        it('should have zero best groove values by default', () => {
            const state = useBeatDetectionStore.getState();
            expect(state.bestGrooveHotness).toBe(0);
            expect(state.bestGrooveStreak).toBe(0);
        });

        it('should create GrooveAnalyzer instance when initGrooveAnalyzer is called', async () => {
            const { GrooveAnalyzer } = await import('playlist-data-engine');
            const store = useBeatDetectionStore.getState();
            store.actions.initGrooveAnalyzer();

            const newState = useBeatDetectionStore.getState();
            expect(newState.grooveAnalyzer).not.toBeNull();
            expect(newState.grooveAnalyzer).toBeInstanceOf(GrooveAnalyzer);
        });

        it('should set grooveState after initialization', () => {
            const store = useBeatDetectionStore.getState();
            store.actions.initGrooveAnalyzer();

            const newState = useBeatDetectionStore.getState();
            expect(newState.grooveState).not.toBeNull();
            expect(newState.grooveState?.hotness).toBe(0);
        });
    });

    describe('Task 8.1.2: recordGrooveHit Updates State Correctly', () => {
        it('should return default result when grooveAnalyzer is null', () => {
            const store = useBeatDetectionStore.getState();
            // Don't initialize the analyzer
            const result = store.actions.recordGrooveHit(0.01, 120);

            expect(result).toEqual({
                pocketDirection: 'neutral',
                establishedOffset: 0,
                consistency: 0,
                hotness: 0,
                streakLength: 0,
                inPocket: false,
                pocketWindow: 0,
            });
        });

        it('should call recordHit on the analyzer with correct params', async () => {
            const store = useBeatDetectionStore.getState();
            store.actions.initGrooveAnalyzer();

            const analyzer = useBeatDetectionStore.getState().grooveAnalyzer;
            expect(analyzer).not.toBeNull();

            store.actions.recordGrooveHit(0.02, 120, 1.0, 'perfect');

            expect(analyzer?.recordHit).toHaveBeenCalledWith(0.02, 120, 1.0, 'perfect');
        });

        it('should update grooveState after recording hit', async () => {
            const store = useBeatDetectionStore.getState();
            store.actions.initGrooveAnalyzer();

            // Mock the analyzer to return specific values
            const mockResult: GrooveResult = {
                pocketDirection: 'pull',
                establishedOffset: 0.02,
                consistency: 0.9,
                hotness: 15,
                streakLength: 3,
                inPocket: true,
                pocketWindow: 0.03,
            };

            const analyzer = useBeatDetectionStore.getState().grooveAnalyzer;
            (analyzer?.recordHit as ReturnType<typeof vi.fn>).mockReturnValueOnce(mockResult);
            (analyzer?.getState as ReturnType<typeof vi.fn>).mockReturnValueOnce({
                hotness: 15,
                streakLength: 3,
                pocketDirection: 'pull',
                establishedOffset: 0.02,
                consistency: 0.9,
                inPocket: true,
                pocketWindow: 0.03,
            });

            store.actions.recordGrooveHit(0.02, 120, 1.0, 'perfect');

            const newState = useBeatDetectionStore.getState();
            expect(newState.grooveState?.hotness).toBe(15);
            expect(newState.grooveState?.streakLength).toBe(3);
        });

        it('should update bestGrooveHotness when hit results in higher hotness', async () => {
            const store = useBeatDetectionStore.getState();
            store.actions.initGrooveAnalyzer();

            // Set up mock to return high hotness
            const mockResult: GrooveResult = {
                pocketDirection: 'neutral',
                establishedOffset: 0,
                consistency: 1,
                hotness: 50,
                streakLength: 10,
                inPocket: true,
                pocketWindow: 0.03,
            };

            const analyzer = useBeatDetectionStore.getState().grooveAnalyzer;
            (analyzer?.recordHit as ReturnType<typeof vi.fn>).mockReturnValueOnce(mockResult);
            (analyzer?.getState as ReturnType<typeof vi.fn>).mockReturnValueOnce({
                hotness: 50,
                streakLength: 10,
                pocketDirection: 'neutral',
                establishedOffset: 0,
                consistency: 1,
                inPocket: true,
                pocketWindow: 0.03,
            });

            store.actions.recordGrooveHit(0, 120, 1.0, 'perfect');

            const newState = useBeatDetectionStore.getState();
            expect(newState.bestGrooveHotness).toBe(50);
        });

        it('should not decrease bestGrooveHotness when hit results in lower hotness', async () => {
            const store = useBeatDetectionStore.getState();
            store.actions.initGrooveAnalyzer();

            // First, set best to a high value
            useBeatDetectionStore.setState({ bestGrooveHotness: 80 });

            // Mock a result with lower hotness
            const mockResult: GrooveResult = {
                pocketDirection: 'neutral',
                establishedOffset: 0,
                consistency: 0.5,
                hotness: 30,
                streakLength: 5,
                inPocket: true,
                pocketWindow: 0.03,
            };

            const analyzer = useBeatDetectionStore.getState().grooveAnalyzer;
            (analyzer?.recordHit as ReturnType<typeof vi.fn>).mockReturnValueOnce(mockResult);
            (analyzer?.getState as ReturnType<typeof vi.fn>).mockReturnValueOnce({
                hotness: 30,
                streakLength: 5,
                pocketDirection: 'neutral',
                establishedOffset: 0,
                consistency: 0.5,
                inPocket: true,
                pocketWindow: 0.03,
            });

            store.actions.recordGrooveHit(0, 120, 1.0, 'perfect');

            const newState = useBeatDetectionStore.getState();
            // Best should remain at 80
            expect(newState.bestGrooveHotness).toBe(80);
        });
    });

    describe('Task 8.1.3: recordGrooveMiss Reduces Hotness', () => {
        it('should return default result when grooveAnalyzer is null', () => {
            const store = useBeatDetectionStore.getState();
            // Don't initialize the analyzer
            const result = store.actions.recordGrooveMiss();

            expect(result).toEqual({
                pocketDirection: 'neutral',
                establishedOffset: 0,
                consistency: 0,
                hotness: 0,
                streakLength: 0,
                inPocket: false,
                pocketWindow: 0,
            });
        });

        it('should call recordMiss on the analyzer', async () => {
            const store = useBeatDetectionStore.getState();
            store.actions.initGrooveAnalyzer();

            const analyzer = useBeatDetectionStore.getState().grooveAnalyzer;
            expect(analyzer).not.toBeNull();

            store.actions.recordGrooveMiss();

            expect(analyzer?.recordMiss).toHaveBeenCalled();
        });

        it('should update grooveState after recording miss', async () => {
            const store = useBeatDetectionStore.getState();
            store.actions.initGrooveAnalyzer();

            // First set some state
            useBeatDetectionStore.setState({
                grooveState: {
                    hotness: 50,
                    streakLength: 10,
                    pocketDirection: 'neutral',
                    establishedOffset: 0,
                    consistency: 1,
                    inPocket: true,
                    pocketWindow: 0.03,
                },
            });

            // Mock the miss result
            const mockResult: GrooveResult = {
                pocketDirection: 'neutral',
                establishedOffset: 0,
                consistency: 0,
                hotness: 40, // Hotness reduced
                streakLength: 0, // Streak reset
                inPocket: false,
                pocketWindow: 0.03,
            };

            const analyzer = useBeatDetectionStore.getState().grooveAnalyzer;
            (analyzer?.recordMiss as ReturnType<typeof vi.fn>).mockReturnValueOnce(mockResult);
            (analyzer?.getState as ReturnType<typeof vi.fn>).mockReturnValueOnce({
                hotness: 40,
                streakLength: 0,
                pocketDirection: 'neutral',
                establishedOffset: 0,
                consistency: 0,
                inPocket: false,
                pocketWindow: 0.03,
            });

            store.actions.recordGrooveMiss();

            const newState = useBeatDetectionStore.getState();
            expect(newState.grooveState?.hotness).toBe(40);
            expect(newState.grooveState?.streakLength).toBe(0);
        });

        it('should not affect bestGrooveHotness on miss', async () => {
            const store = useBeatDetectionStore.getState();
            store.actions.initGrooveAnalyzer();

            // Set best to a high value
            useBeatDetectionStore.setState({ bestGrooveHotness: 75 });

            // Mock the miss result
            const mockResult: GrooveResult = {
                pocketDirection: 'neutral',
                establishedOffset: 0,
                consistency: 0,
                hotness: 65, // Reduced but still high
                streakLength: 0,
                inPocket: false,
                pocketWindow: 0.03,
            };

            const analyzer = useBeatDetectionStore.getState().grooveAnalyzer;
            (analyzer?.recordMiss as ReturnType<typeof vi.fn>).mockReturnValueOnce(mockResult);
            (analyzer?.getState as ReturnType<typeof vi.fn>).mockReturnValueOnce({
                hotness: 65,
                streakLength: 0,
                pocketDirection: 'neutral',
                establishedOffset: 0,
                consistency: 0,
                inPocket: false,
                pocketWindow: 0.03,
            });

            store.actions.recordGrooveMiss();

            const newState = useBeatDetectionStore.getState();
            // Best should remain unchanged
            expect(newState.bestGrooveHotness).toBe(75);
        });
    });

    describe('Task 8.1.4: Best Groove Tracking', () => {
        it('should track best hotness across multiple hits', async () => {
            const store = useBeatDetectionStore.getState();
            store.actions.initGrooveAnalyzer();

            const analyzer = useBeatDetectionStore.getState().grooveAnalyzer;

            // Record hit with hotness 20
            (analyzer?.recordHit as ReturnType<typeof vi.fn>).mockReturnValueOnce({
                pocketDirection: 'neutral', establishedOffset: 0, consistency: 0.8, hotness: 20, streakLength: 2, inPocket: true, pocketWindow: 0.03,
            });
            (analyzer?.getState as ReturnType<typeof vi.fn>).mockReturnValueOnce({
                hotness: 20, streakLength: 2, pocketDirection: 'neutral', establishedOffset: 0, consistency: 0.8, inPocket: true, pocketWindow: 0.03,
            });
            store.actions.recordGrooveHit(0, 120, 1.0, 'perfect');

            expect(useBeatDetectionStore.getState().bestGrooveHotness).toBe(20);

            // Record hit with higher hotness 45
            (analyzer?.recordHit as ReturnType<typeof vi.fn>).mockReturnValueOnce({
                pocketDirection: 'neutral', establishedOffset: 0, consistency: 0.9, hotness: 45, streakLength: 5, inPocket: true, pocketWindow: 0.03,
            });
            (analyzer?.getState as ReturnType<typeof vi.fn>).mockReturnValueOnce({
                hotness: 45, streakLength: 5, pocketDirection: 'neutral', establishedOffset: 0, consistency: 0.9, inPocket: true, pocketWindow: 0.03,
            });
            store.actions.recordGrooveHit(0, 120, 1.0, 'perfect');

            expect(useBeatDetectionStore.getState().bestGrooveHotness).toBe(45);

            // Record hit with lower hotness 30
            (analyzer?.recordHit as ReturnType<typeof vi.fn>).mockReturnValueOnce({
                pocketDirection: 'neutral', establishedOffset: 0, consistency: 0.7, hotness: 30, streakLength: 3, inPocket: true, pocketWindow: 0.03,
            });
            (analyzer?.getState as ReturnType<typeof vi.fn>).mockReturnValueOnce({
                hotness: 30, streakLength: 3, pocketDirection: 'neutral', establishedOffset: 0, consistency: 0.7, inPocket: true, pocketWindow: 0.03,
            });
            store.actions.recordGrooveHit(0, 120, 1.0, 'perfect');

            // Best should still be 45
            expect(useBeatDetectionStore.getState().bestGrooveHotness).toBe(45);
        });

        it('should track best streak across multiple hits', async () => {
            const store = useBeatDetectionStore.getState();
            store.actions.initGrooveAnalyzer();

            const analyzer = useBeatDetectionStore.getState().grooveAnalyzer;

            // Record hit with streak 5
            (analyzer?.recordHit as ReturnType<typeof vi.fn>).mockReturnValueOnce({
                pocketDirection: 'neutral', establishedOffset: 0, consistency: 0.9, hotness: 30, streakLength: 5, inPocket: true, pocketWindow: 0.03,
            });
            (analyzer?.getState as ReturnType<typeof vi.fn>).mockReturnValueOnce({
                hotness: 30, streakLength: 5, pocketDirection: 'neutral', establishedOffset: 0, consistency: 0.9, inPocket: true, pocketWindow: 0.03,
            });
            store.actions.recordGrooveHit(0, 120, 1.0, 'perfect');

            expect(useBeatDetectionStore.getState().bestGrooveStreak).toBe(5);

            // Record hit with higher streak 10
            (analyzer?.recordHit as ReturnType<typeof vi.fn>).mockReturnValueOnce({
                pocketDirection: 'neutral', establishedOffset: 0, consistency: 1, hotness: 60, streakLength: 10, inPocket: true, pocketWindow: 0.03,
            });
            (analyzer?.getState as ReturnType<typeof vi.fn>).mockReturnValueOnce({
                hotness: 60, streakLength: 10, pocketDirection: 'neutral', establishedOffset: 0, consistency: 1, inPocket: true, pocketWindow: 0.03,
            });
            store.actions.recordGrooveHit(0, 120, 1.0, 'perfect');

            expect(useBeatDetectionStore.getState().bestGrooveStreak).toBe(10);

            // Record miss (streak resets)
            (analyzer?.recordMiss as ReturnType<typeof vi.fn>).mockReturnValueOnce({
                pocketDirection: 'neutral', establishedOffset: 0, consistency: 0, hotness: 50, streakLength: 0, inPocket: false, pocketWindow: 0.03,
            });
            (analyzer?.getState as ReturnType<typeof vi.fn>).mockReturnValueOnce({
                hotness: 50, streakLength: 0, pocketDirection: 'neutral', establishedOffset: 0, consistency: 0, inPocket: false, pocketWindow: 0.03,
            });
            store.actions.recordGrooveMiss();

            // Best streak should remain 10
            expect(useBeatDetectionStore.getState().bestGrooveStreak).toBe(10);
        });

        it('should update best groove via updateBestGroove action', async () => {
            const store = useBeatDetectionStore.getState();

            // Update with higher values
            store.actions.updateBestGroove(50, 8);

            const state1 = useBeatDetectionStore.getState();
            expect(state1.bestGrooveHotness).toBe(50);
            expect(state1.bestGrooveStreak).toBe(8);

            // Update with lower values (should not change)
            store.actions.updateBestGroove(30, 5);

            const state2 = useBeatDetectionStore.getState();
            expect(state2.bestGrooveHotness).toBe(50);
            expect(state2.bestGrooveStreak).toBe(8);

            // Update with higher hotness only
            store.actions.updateBestGroove(75, 6);

            const state3 = useBeatDetectionStore.getState();
            expect(state3.bestGrooveHotness).toBe(75);
            expect(state3.bestGrooveStreak).toBe(8); // Keeps higher streak

            // Update with higher streak only
            store.actions.updateBestGroove(60, 12);

            const state4 = useBeatDetectionStore.getState();
            expect(state4.bestGrooveHotness).toBe(75); // Keeps higher hotness
            expect(state4.bestGrooveStreak).toBe(12);
        });
    });

    describe('Task 8.1.5: Reset Clears All Groove State', () => {
        it('should reset groove state when resetGrooveAnalyzer is called', async () => {
            const store = useBeatDetectionStore.getState();
            store.actions.initGrooveAnalyzer();

            // Set some groove state
            useBeatDetectionStore.setState({
                grooveState: {
                    hotness: 80,
                    streakLength: 15,
                    pocketDirection: 'pull',
                    establishedOffset: 0.02,
                    consistency: 0.95,
                    inPocket: true,
                    pocketWindow: 0.03,
                },
            });

            // Reset
            store.actions.resetGrooveAnalyzer();

            // Check that analyzer's reset was called
            const analyzer = useBeatDetectionStore.getState().grooveAnalyzer;
            expect(analyzer?.reset).toHaveBeenCalled();

            // Check that grooveState was updated
            const newState = useBeatDetectionStore.getState();
            expect(newState.grooveState?.hotness).toBe(0);
            expect(newState.grooveState?.streakLength).toBe(0);
        });

        it('should preserve best groove values on reset', async () => {
            const store = useBeatDetectionStore.getState();
            store.actions.initGrooveAnalyzer();

            // Set best values
            useBeatDetectionStore.setState({
                bestGrooveHotness: 95,
                bestGrooveStreak: 20,
                grooveState: {
                    hotness: 85,
                    streakLength: 18,
                    pocketDirection: 'neutral',
                    establishedOffset: 0,
                    consistency: 0.9,
                    inPocket: true,
                    pocketWindow: 0.03,
                },
            });

            // Reset
            store.actions.resetGrooveAnalyzer();

            const newState = useBeatDetectionStore.getState();
            // Current groove should be reset
            expect(newState.grooveState?.hotness).toBe(0);
            expect(newState.grooveState?.streakLength).toBe(0);
            // Best values should be preserved
            expect(newState.bestGrooveHotness).toBe(95);
            expect(newState.bestGrooveStreak).toBe(20);
        });

        it('should handle reset when grooveAnalyzer is null by creating a new one', async () => {
            const store = useBeatDetectionStore.getState();
            // Don't initialize the analyzer
            expect(store.grooveAnalyzer).toBeNull();

            // BUGFIX: resetGrooveAnalyzer now creates a new analyzer if null
            // This ensures the analyzer is always available after a seek
            store.actions.resetGrooveAnalyzer();

            // Should have created a new analyzer
            const newState = useBeatDetectionStore.getState();
            expect(newState.grooveAnalyzer).not.toBeNull();
            expect(newState.grooveState).not.toBeNull();
        });

        it('should allow re-initialization after reset', async () => {
            const store = useBeatDetectionStore.getState();

            // Initialize
            store.actions.initGrooveAnalyzer();
            expect(useBeatDetectionStore.getState().grooveAnalyzer).not.toBeNull();

            // Reset
            store.actions.resetGrooveAnalyzer();

            // Re-initialize
            store.actions.initGrooveAnalyzer();

            // Should have a new analyzer instance
            expect(useBeatDetectionStore.getState().grooveAnalyzer).not.toBeNull();
        });
    });

    describe('updateGrooveState action', () => {
        it('should update grooveState with new state', async () => {
            const store = useBeatDetectionStore.getState();

            const newState: GrooveState = {
                hotness: 42,
                streakLength: 7,
                pocketDirection: 'push',
                establishedOffset: -0.015,
                consistency: 0.85,
                inPocket: true,
                pocketWindow: 0.025,
            };

            store.actions.updateGrooveState(newState);

            const state = useBeatDetectionStore.getState();
            expect(state.grooveState).toEqual(newState);
        });
    });
});
