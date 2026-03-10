/**
 * Tests for beatDetectionStore Rhythm XP Functionality
 *
 * Phase 10: Task 10.1 - Unit Tests
 * - Test XP calculation accuracy with various configs
 * - Test combo multiplier behavior (separate from groove streak)
 * - Test groove end bonus calculation
 * - Test session totals tracking
 * - Test config persistence (tested in rhythmXPConfigStore tests)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useBeatDetectionStore } from './beatDetectionStore';
import type { RhythmXPResult, RhythmSessionTotals, ComboEndBonusResult, GrooveEndBonusResult } from '@/types';

// Mock the RhythmXPCalculator from the engine
vi.mock(import('playlist-data-engine'), async (importOriginal) => {
    const actual = await importOriginal() as Record<string, unknown>;

    // Create mock functions
    const mockStartSession = vi.fn();
    const mockEndSession = vi.fn((): RhythmSessionTotals => ({
        totalScore: 1000,
        totalXP: 100,
        maxCombo: 50,
        accuracyDistribution: {
            perfect: 10,
            great: 5,
            good: 3,
            ok: 2,
            miss: 1,
            wrongKey: 0,
        },
        accuracyPercentage: 95.2,
        duration: 60,
    }));

    const mockRecordHit = vi.fn((accuracy: string, comboLength: number, grooveHotness: number): RhythmXPResult => {
        // Simulate XP calculation
        const baseScore = accuracy === 'perfect' ? 10 : accuracy === 'great' ? 7 : accuracy === 'good' ? 5 : accuracy === 'ok' ? 2 : 0;
        const comboMultiplier = Math.min(1 + (comboLength / 50), 5.0);
        const grooveMultiplier = grooveHotness > 0 ? 1 + (grooveHotness / 200) : 1;
        const totalMultiplier = Math.min(comboMultiplier * grooveMultiplier, 5.0);
        const finalScore = baseScore * totalMultiplier;
        const finalXP = finalScore * 0.1;

        return {
            scorePoints: baseScore,
            baseXP: baseScore * 0.1,
            comboMultiplier,
            grooveMultiplier,
            totalMultiplier,
            finalScore,
            finalXP,
            breakdown: {
                accuracy: accuracy as 'perfect' | 'great' | 'good' | 'ok' | 'miss' | 'wrongKey',
                comboLength,
                grooveHotness,
            },
        };
    });

    const mockCalculateComboEndBonus = vi.fn((comboLength: number): ComboEndBonusResult => ({
        comboLength,
        bonusScore: comboLength * 2,
        bonusXP: comboLength * 2 * 0.1,
    }));

    const mockCalculateGrooveEndBonus = vi.fn((): GrooveEndBonusResult => ({
        bonusScore: 100,
        bonusXP: 10,
    }));

    const mockGetSessionTotals = vi.fn((): RhythmSessionTotals => ({
        totalScore: 1000,
        totalXP: 100,
        maxCombo: 50,
        accuracyDistribution: {
            perfect: 10,
            great: 5,
            good: 3,
            ok: 2,
            miss: 1,
            wrongKey: 0,
        },
        accuracyPercentage: 95.2,
        duration: 60,
    }));

    // Mock class using class syntax (required for vitest to recognize as constructor)
    class MockRhythmXPCalculator {
        startSession = mockStartSession;
        endSession = mockEndSession;
        recordHit = mockRecordHit;
        calculateComboEndBonus = mockCalculateComboEndBonus;
        calculateGrooveEndBonus = mockCalculateGrooveEndBonus;
        getSessionTotals = mockGetSessionTotals;
    }

    return {
        ...actual,
        RhythmXPCalculator: MockRhythmXPCalculator,
    };
});

describe('beatDetectionStore - Rhythm XP Functionality', () => {
    // Get fresh store and reset before each test
    beforeEach(() => {
        // Reset the store to initial state
        useBeatDetectionStore.setState({
            rhythmXPCalculator: null,
            rhythmSessionTotals: null,
            lastRhythmXPResult: null,
            currentCombo: 0,
            maxCombo: 0,
            previousComboLength: 0,
            pendingComboEndBonus: null,
            pendingGrooveEndBonus: null,
        });

        // Clear all mocks
        vi.clearAllMocks();
    });

    describe('initRhythmXP', () => {
        it('should initialize the RhythmXPCalculator', () => {
            const { actions } = useBeatDetectionStore.getState();

            actions.initRhythmXP();

            const state = useBeatDetectionStore.getState();
            expect(state.rhythmXPCalculator).not.toBeNull();
            expect(state.currentCombo).toBe(0);
            expect(state.maxCombo).toBe(0);
        });
    });

    describe('recordRhythmHit', () => {
        it('should increment combo on successful hit', () => {
            const { actions } = useBeatDetectionStore.getState();
            actions.initRhythmXP();

            const result = actions.recordRhythmHit('perfect', 50);

            const state = useBeatDetectionStore.getState();
            expect(state.currentCombo).toBe(1);
            expect(state.maxCombo).toBe(1);
            expect(state.lastRhythmXPResult).not.toBeNull();
            expect(result).not.toBeNull();
        });

        it('should update max combo when current combo exceeds it', () => {
            const { actions } = useBeatDetectionStore.getState();
            actions.initRhythmXP();

            // Record several hits
            for (let i = 0; i < 10; i++) {
                actions.recordRhythmHit('perfect', 50);
            }

            const state = useBeatDetectionStore.getState();
            expect(state.currentCombo).toBe(10);
            expect(state.maxCombo).toBe(10);
        });

        it('should reset combo on miss', () => {
            const { actions } = useBeatDetectionStore.getState();
            actions.initRhythmXP();

            // Build up combo
            for (let i = 0; i < 5; i++) {
                actions.recordRhythmHit('perfect', 50);
            }

            expect(useBeatDetectionStore.getState().currentCombo).toBe(5);

            // Miss should reset combo
            actions.recordRhythmHit('miss', 50);

            const state = useBeatDetectionStore.getState();
            expect(state.currentCombo).toBe(0);
        });

        it('should reset combo on wrongKey', () => {
            const { actions } = useBeatDetectionStore.getState();
            actions.initRhythmXP();

            // Build up combo
            for (let i = 0; i < 5; i++) {
                actions.recordRhythmHit('perfect', 50);
            }

            expect(useBeatDetectionStore.getState().currentCombo).toBe(5);

            // Wrong key should reset combo
            actions.recordRhythmHit('wrongKey', 50);

            const state = useBeatDetectionStore.getState();
            expect(state.currentCombo).toBe(0);
        });

        it('should not reset combo on ok/good/great/perfect', () => {
            const { actions } = useBeatDetectionStore.getState();
            actions.initRhythmXP();

            actions.recordRhythmHit('perfect', 50);
            actions.recordRhythmHit('great', 50);
            actions.recordRhythmHit('good', 50);
            actions.recordRhythmHit('ok', 50);

            const state = useBeatDetectionStore.getState();
            expect(state.currentCombo).toBe(4);
        });
    });

    describe('processComboEndBonus', () => {
        it('should calculate combo end bonus when combo breaks', () => {
            const { actions } = useBeatDetectionStore.getState();
            actions.initRhythmXP();

            // Build up combo
            for (let i = 0; i < 10; i++) {
                actions.recordRhythmHit('perfect', 50);
            }

            // Miss should process combo end bonus
            actions.recordRhythmHit('miss', 50);

            const state = useBeatDetectionStore.getState();
            expect(state.pendingComboEndBonus).not.toBeNull();
            expect(state.pendingComboEndBonus?.comboLength).toBe(10);
        });

        it('should not give bonus for 0 combo', () => {
            const { actions } = useBeatDetectionStore.getState();
            actions.initRhythmXP();

            // Miss with no combo
            actions.recordRhythmHit('miss', 50);

            const state = useBeatDetectionStore.getState();
            expect(state.pendingComboEndBonus).toBeNull();
        });
    });

    describe('processGrooveEndBonus', () => {
        it('should calculate groove end bonus', () => {
            const { actions } = useBeatDetectionStore.getState();
            actions.initRhythmXP();

            const grooveStats = {
                maxStreak: 50,
                maxHotness: 100,
                avgHotness: 75,
                duration: 30,
                totalHits: 100,
                startTime: 0,
                endTime: 30,
            };

            actions.processGrooveEndBonus(grooveStats);

            const state = useBeatDetectionStore.getState();
            expect(state.pendingGrooveEndBonus).not.toBeNull();
            expect(state.pendingGrooveEndBonus?.bonusXP).toBe(10);
        });
    });

    describe('session management', () => {
        it('should return session totals after recording hits', () => {
            const { actions } = useBeatDetectionStore.getState();
            actions.initRhythmXP();

            // Record at least one hit to have session totals
            actions.recordRhythmHit('perfect', 50);

            const totals = actions.getRhythmSessionTotals();

            expect(totals).not.toBeNull();
            expect(totals?.totalScore).toBe(1000);
            expect(totals?.totalXP).toBe(100);
        });

        it('should return null session totals before any hits', () => {
            const { actions } = useBeatDetectionStore.getState();
            actions.initRhythmXP();

            // Before recording hits, session totals should be null
            const totals = actions.getRhythmSessionTotals();
            expect(totals).toBeNull();
        });

        it('should detect unclaimed XP after recording hits', () => {
            const { actions } = useBeatDetectionStore.getState();
            actions.initRhythmXP();

            // Record a hit to have XP
            actions.recordRhythmHit('perfect', 50);

            // After recording hits, should have unclaimed XP
            expect(actions.hasUnclaimedXP()).toBe(true);
        });

        it('should not detect unclaimed XP before any hits', () => {
            const { actions } = useBeatDetectionStore.getState();
            actions.initRhythmXP();

            // Before recording hits, should not have unclaimed XP
            expect(actions.hasUnclaimedXP()).toBe(false);
        });

        it('should end session and return final totals', () => {
            const { actions } = useBeatDetectionStore.getState();
            actions.initRhythmXP();

            const finalTotals = actions.endRhythmXPSession();

            expect(finalTotals).not.toBeNull();
            expect(finalTotals?.totalScore).toBe(1000);
        });
    });

    describe('clearPendingBonuses', () => {
        it('should clear pending combo bonus', () => {
            const { actions } = useBeatDetectionStore.getState();
            actions.initRhythmXP();

            // Build up combo then break it
            for (let i = 0; i < 5; i++) {
                actions.recordRhythmHit('perfect', 50);
            }
            actions.recordRhythmHit('miss', 50);

            expect(useBeatDetectionStore.getState().pendingComboEndBonus).not.toBeNull();

            actions.clearPendingBonuses();

            expect(useBeatDetectionStore.getState().pendingComboEndBonus).toBeNull();
        });

        it('should clear pending groove bonus', () => {
            const { actions } = useBeatDetectionStore.getState();
            actions.initRhythmXP();

            actions.processGrooveEndBonus({
                maxStreak: 50,
                maxHotness: 100,
                avgHotness: 75,
                duration: 30,
                totalHits: 100,
                startTime: 0,
                endTime: 30,
            });

            expect(useBeatDetectionStore.getState().pendingGrooveEndBonus).not.toBeNull();

            actions.clearPendingBonuses();

            expect(useBeatDetectionStore.getState().pendingGrooveEndBonus).toBeNull();
        });
    });

    describe('resetRhythmXP', () => {
        it('should clear all XP state', () => {
            const { actions } = useBeatDetectionStore.getState();
            actions.initRhythmXP();

            // Build up some state
            for (let i = 0; i < 5; i++) {
                actions.recordRhythmHit('perfect', 50);
            }

            actions.resetRhythmXP();

            const state = useBeatDetectionStore.getState();
            // BUGFIX: resetRhythmXP now re-initializes the calculator instead of setting to null
            // This ensures the calculator is always ready to record hits after a seek
            expect(state.rhythmXPCalculator).not.toBeNull(); // Changed: was toBeNull()
            expect(state.rhythmSessionTotals).toBeNull();
            expect(state.lastRhythmXPResult).toBeNull();
            expect(state.currentCombo).toBe(0);
            expect(state.maxCombo).toBe(0);
            expect(state.pendingComboEndBonus).toBeNull();
            expect(state.pendingGrooveEndBonus).toBeNull();
        });
    });
});
