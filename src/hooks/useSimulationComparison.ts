import { useState, useCallback, useMemo } from 'react';
import {
    ComparativeAnalyzer,
    type ComparisonResult,
    type ComparisonConfig,
    type ComparisonOptions,
} from 'playlist-data-engine';
import type { SavedSimulation } from '@/store/simulationStore';
import { useSimulationStore, toEngineConfig } from '@/store/simulationStore';
import { logger } from '@/utils/logger';

export type ComparisonStatus = 'idle' | 'selecting' | 'running' | 'completed' | 'error';

export interface ComparisonProgress {
    completed: number;
    total: number;
    fraction: number;
    currentSide: string;
}

export interface ComparisonError {
    message: string;
}

/**
 * Delta metrics computed from two saved simulation results.
 * Positive values favor slot A (A is better for players).
 */
export interface QuickDelta {
    winRateDelta: number;
    averageRoundsDelta: number;
    averageHPRemainingDelta: number;
    totalPlayerDeathsDelta: number;
    totalEnemyDeathsDelta: number;
    medianRoundsDelta: number;
}

export interface UseSimulationComparisonReturn {
    /** Current comparison status */
    status: ComparisonStatus;
    /** Comparison result from ComparativeAnalyzer (null until analysis runs) */
    comparisonResult: ComparisonResult | null;
    /** Live progress during comparison run */
    progress: ComparisonProgress;
    /** Error details if comparison failed */
    error: ComparisonError | null;

    /** IDs of simulations selected for comparison slots A and B */
    slotAId: string | null;
    slotBId: string | null;

    /** Saved simulation data for slots A and B */
    slotA: SavedSimulation | undefined;
    slotB: SavedSimulation | undefined;

    /** Quick deltas computed from saved results (available immediately when both slots filled) */
    quickDeltas: QuickDelta | null;

    /** Assign a saved simulation to a comparison slot */
    assignSlot: (slot: 'A' | 'B', simulationId: string | null) => void;

    /** Clear both comparison slots and reset */
    clearComparison: () => void;

    /**
     * Run a fresh ComparativeAnalyzer comparison using identical-seed simulation.
     * Requires both slots to have enemy sheets (used to re-simulate).
     * Returns the ComparisonResult or null on error.
     */
    runAnalysis: (options?: { runCount?: number; baseSeed?: string }) => ComparisonResult | null;

    /** Cancel a running analysis */
    cancelAnalysis: () => void;
}

/**
 * Hook for managing side-by-side comparison of two saved simulations.
 *
 * Provides two levels of comparison:
 * 1. **Quick deltas** — computed immediately from saved results (no re-simulation)
 * 2. **Full analysis** — uses engine's ComparativeAnalyzer for identical-seed re-simulation
 *    with statistical significance testing
 */
export function useSimulationComparison(): UseSimulationComparisonReturn {
    const [status, setStatus] = useState<ComparisonStatus>('idle');
    const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
    const [progress, setProgress] = useState<ComparisonProgress>({
        completed: 0,
        total: 0,
        fraction: 0,
        currentSide: '',
    });
    const [error, setError] = useState<ComparisonError | null>(null);

    const abortRef = { current: new AbortController() };

    const comparisonSlotA = useSimulationStore((s) => s.comparison.slotA.simulationId);
    const comparisonSlotB = useSimulationStore((s) => s.comparison.slotB.simulationId);
    const setComparisonSlot = useSimulationStore((s) => s.setComparisonSlot);
    const clearComparisonStore = useSimulationStore((s) => s.clearComparison);
    const getComparisonPair = useSimulationStore((s) => s.getComparisonPair);

    const [slotA, slotB] = useMemo(() => getComparisonPair(), [
        comparisonSlotA,
        comparisonSlotB,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        comparisonSlotA !== null || comparisonSlotB !== null, // recompute when IDs change
    ]);

    // Compute quick deltas from saved results (no re-simulation needed)
    const quickDeltas = useMemo<QuickDelta | null>(() => {
        if (!slotA || !slotB) return null;
        const sA = slotA.results.summary;
        const sB = slotB.results.summary;
        return {
            winRateDelta: sA.playerWinRate - sB.playerWinRate,
            averageRoundsDelta: sA.averageRounds - sB.averageRounds,
            averageHPRemainingDelta: sA.averagePlayerHPPercentRemaining - sB.averagePlayerHPPercentRemaining,
            totalPlayerDeathsDelta: sA.totalPlayerDeaths - sB.totalPlayerDeaths,
            totalEnemyDeathsDelta: sA.totalEnemyDeaths - sB.totalEnemyDeaths,
            medianRoundsDelta: sA.medianRounds - sB.medianRounds,
        };
    }, [slotA, slotB]);

    const assignSlot = useCallback(
        (slot: 'A' | 'B', simulationId: string | null) => {
            setComparisonSlot(slot, simulationId);
            // Clear analysis results when slots change (quick deltas update automatically)
            setComparisonResult(null);
            setError(null);

            const otherSlot = slot === 'A' ? comparisonSlotB : comparisonSlotA;
            setStatus(
                simulationId && otherSlot ? 'selecting' : simulationId ? 'selecting' : 'idle',
            );
        },
        [setComparisonSlot, comparisonSlotA, comparisonSlotB],
    );

    const clearComparison = useCallback(() => {
        clearComparisonStore();
        setComparisonResult(null);
        setError(null);
        setStatus('idle');
        setProgress({ completed: 0, total: 0, fraction: 0, currentSide: '' });
    }, [clearComparisonStore]);

    const cancelAnalysis = useCallback(() => {
        abortRef.current.abort();
        abortRef.current = new AbortController();
    }, []);

    const runAnalysis = useCallback(
        (options?: { runCount?: number; baseSeed?: string }): ComparisonResult | null => {
            if (!slotA || !slotB) {
                setError({ message: 'Both slots must have a simulation selected' });
                setStatus('error');
                return null;
            }

            setStatus('running');
            setError(null);
            setComparisonResult(null);

            abortRef.current.abort();
            abortRef.current = new AbortController();
            const signal = abortRef.current.signal;

            const runCount = options?.runCount ?? Math.min(slotA.config.runCount, slotB.config.runCount, 500);
            const baseSeed = options?.baseSeed ?? `compare-${Date.now()}`;

            try {
                const engineConfigA = toEngineConfig(slotA.config);
                const engineConfigB = toEngineConfig(slotB.config);

                const configA: ComparisonConfig = {
                    players: [],
                    enemies: slotA.encounter.enemySheets,
                    label: slotA.label ?? 'Config A',
                    combatConfig: engineConfigA.combatConfig,
                };

                const configB: ComparisonConfig = {
                    players: [],
                    enemies: slotB.encounter.enemySheets,
                    label: slotB.label ?? 'Config B',
                    combatConfig: engineConfigB.combatConfig,
                };

                const comparisonOptions: ComparisonOptions = {
                    runCount,
                    baseSeed,
                    aiConfig: engineConfigA.aiConfig,
                    combatConfig: engineConfigA.combatConfig,
                    onProgress: (completed, total, side) => {
                        if (signal.aborted) return;
                        setProgress({
                            completed,
                            total,
                            fraction: total > 0 ? completed / (total * 2) : 0,
                            currentSide: side,
                        });
                    },
                };

                const analyzer = new ComparativeAnalyzer();
                const result = analyzer.compare(configA, configB, comparisonOptions);

                if (signal.aborted) {
                    setStatus('selecting');
                    return null;
                }

                setComparisonResult(result);
                setStatus('completed');
                setProgress({ completed: runCount * 2, total: runCount * 2, fraction: 1, currentSide: '' });

                logger.info('SimulationComparison', 'Analysis completed', {
                    winRateDelta: result.deltas.winRateDelta,
                    isSignificant: result.winRateSignificance.isSignificant,
                    pValue: result.winRateSignificance.pValue.toFixed(4),
                });

                return result;
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Analysis failed';
                setError({ message });
                setStatus('error');
                logger.error('SimulationComparison', 'Analysis failed', { error: message });
                return null;
            }
        },
        [slotA, slotB],
    );

    return {
        status,
        comparisonResult,
        progress,
        error,
        slotAId: comparisonSlotA,
        slotBId: comparisonSlotB,
        slotA,
        slotB,
        quickDeltas,
        assignSlot,
        clearComparison,
        runAnalysis,
        cancelAnalysis,
    };
}
