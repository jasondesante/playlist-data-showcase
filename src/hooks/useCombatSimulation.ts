import { useState, useCallback, useRef, useEffect } from 'react';
import {
    CombatSimulator,
    type SimulationConfig,
    type SimulationResults,
    type CharacterSheet,
} from 'playlist-data-engine';
import { logger } from '@/utils/logger';
import { handleError } from '@/utils/errorHandling';

// ─── Hook State Types ────────────────────────────────────────────────────────

export type SimulationStatus = 'idle' | 'running' | 'completed' | 'cancelled' | 'error';

export interface SimulationProgress {
    /** Number of runs completed */
    completed: number;
    /** Total runs requested */
    total: number;
    /** Fractional progress 0.0–1.0 */
    fraction: number;
    /** Estimated milliseconds remaining (null if too early to estimate) */
    estimatedMsRemaining: number | null;
}

export interface SimulationError {
    message: string;
    category: string;
}

export interface UseCombatSimulationReturn {
    /** Current simulation status */
    status: SimulationStatus;
    /** Simulation results (null until completed) */
    results: SimulationResults | null;
    /** Live progress updates while running */
    progress: SimulationProgress;
    /** Error details if simulation failed */
    error: SimulationError | null;
    /** Duration of the last simulation in milliseconds */
    durationMs: number | null;

    /**
     * Start a Monte Carlo combat simulation.
     *
     * @param party - Player character sheets
     * @param enemies - Enemy character sheets
     * @param config - Simulation configuration (run count, AI styles, seed, etc.)
     * @returns The simulation results (also available via `results` state)
     */
    startSimulation: (
        party: CharacterSheet[],
        enemies: CharacterSheet[],
        config: SimulationConfig
    ) => SimulationResults | null;

    /**
     * Cancel the currently running simulation.
     * Returns partial results if any runs completed.
     */
    cancelSimulation: () => void;

    /** Clear results and reset to idle state */
    resetSimulation: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Minimum completed runs before ETA estimation is reliable */
const ETA_MIN_RUNS = 5;

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * React hook for Monte Carlo combat simulation via the CombatSimulator engine.
 *
 * Manages simulation lifecycle (idle → running → completed/cancelled/error),
 * progress tracking with ETA estimation, and cancellation via AbortController.
 *
 * @example
 * ```tsx
 * const { status, results, progress, startSimulation, cancelSimulation } = useCombatSimulation();
 *
 * const handleClick = () => {
 *   startSimulation(party, enemies, {
 *     runCount: 1000,
 *     baseSeed: 'test-seed',
 *     aiConfig: { playerStyle: 'normal', enemyStyle: 'aggressive' },
 *   });
 * };
 * ```
 */
export const useCombatSimulation = (): UseCombatSimulationReturn => {
    // State
    const [status, setStatus] = useState<SimulationStatus>('idle');
    const [results, setResults] = useState<SimulationResults | null>(null);
    const [progress, setProgress] = useState<SimulationProgress>({
        completed: 0,
        total: 0,
        fraction: 0,
        estimatedMsRemaining: null,
    });
    const [error, setError] = useState<SimulationError | null>(null);
    const [durationMs, setDurationMs] = useState<number | null>(null);

    // Refs for values that must survive across renders without triggering re-renders
    const abortControllerRef = useRef<AbortController | null>(null);
    const startTimeRef = useRef<number>(0);
    const lastCompletedRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);

    // Cleanup on unmount — cancel any running simulation
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
        };
    }, []);

    const resetSimulation = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setStatus('idle');
        setResults(null);
        setProgress({ completed: 0, total: 0, fraction: 0, estimatedMsRemaining: null });
        setError(null);
        setDurationMs(null);
        lastCompletedRef.current = 0;
    }, []);

    const startSimulation = useCallback(
        (party: CharacterSheet[], enemies: CharacterSheet[], config: SimulationConfig): SimulationResults | null => {
            // Validate inputs
            if (!party.length) {
                const err = { message: 'Party must have at least one character', category: 'CombatSimulator' };
                setError(err);
                setStatus('error');
                logger.warn('CombatSimulator', err.message);
                return null;
            }

            if (!enemies.length) {
                const err = { message: 'Encounter must have at least one enemy', category: 'CombatSimulator' };
                setError(err);
                setStatus('error');
                logger.warn('CombatSimulator', err.message);
                return null;
            }

            if (config.runCount < 1) {
                const err = { message: 'Run count must be at least 1', category: 'CombatSimulator' };
                setError(err);
                setStatus('error');
                logger.warn('CombatSimulator', err.message);
                return null;
            }

            // Cancel any existing simulation
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            // Reset state
            setStatus('running');
            setResults(null);
            setError(null);
            setDurationMs(null);
            lastCompletedRef.current = 0;

            // Create new AbortController for this simulation
            const abortController = new AbortController();
            abortControllerRef.current = abortController;

            // Record start time for ETA calculation
            startTimeRef.current = performance.now();
            lastTimeRef.current = startTimeRef.current;

            logger.info('CombatSimulator', 'Starting simulation', {
                partySize: party.length,
                partyLevels: party.map(p => p.level),
                enemyCount: enemies.length,
                runCount: config.runCount,
                baseSeed: config.baseSeed,
                playerStyle: config.aiConfig.playerStyle,
                enemyStyle: config.aiConfig.enemyStyle,
            });

            try {
                // Build the config with our AbortSignal and progress callback
                const simConfig: SimulationConfig = {
                    ...config,
                    abortSignal: abortController.signal,
                    onProgress: (completed: number, total: number) => {
                        const now = performance.now();
                        const fraction = total > 0 ? completed / total : 0;

                        // ETA estimation: use recent throughput
                        let estimatedMsRemaining: number | null = null;
                        if (completed >= ETA_MIN_RUNS) {
                            const deltaCompleted = completed - lastCompletedRef.current;
                            const deltaTime = now - lastTimeRef.current;
                            if (deltaCompleted > 0 && deltaTime > 0) {
                                const msPerRun = deltaTime / deltaCompleted;
                                const remaining = total - completed;
                                estimatedMsRemaining = Math.round(msPerRun * remaining);
                            }
                            // Update sliding window refs every 10 runs
                            if (completed % 10 === 0) {
                                lastCompletedRef.current = completed;
                                lastTimeRef.current = now;
                            }
                        }

                        setProgress({
                            completed,
                            total,
                            fraction,
                            estimatedMsRemaining,
                        });
                    },
                };

                // Run the simulation synchronously — CombatSimulator.run() is synchronous
                // and blocks the main thread. For large run counts, consider Web Worker
                // offloading (task 7.1.2).
                const simResults = new CombatSimulator().run(party, enemies, simConfig);

                const elapsed = performance.now() - startTimeRef.current;

                // Check if simulation was cancelled
                if (abortController.signal.aborted) {
                    setStatus('cancelled');
                    setResults(simResults);
                    setDurationMs(Math.round(elapsed));
                    logger.info('CombatSimulator', 'Simulation cancelled', {
                        completedRuns: simResults.summary.totalRuns,
                        requestedRuns: config.runCount,
                        elapsedMs: Math.round(elapsed),
                    });
                } else {
                    setStatus('completed');
                    setResults(simResults);
                    setDurationMs(Math.round(elapsed));
                    setProgress({
                        completed: config.runCount,
                        total: config.runCount,
                        fraction: 1,
                        estimatedMsRemaining: 0,
                    });

                    logger.info('CombatSimulator', 'Simulation completed', {
                        totalRuns: simResults.summary.totalRuns,
                        playerWinRate: (simResults.summary.playerWinRate * 100).toFixed(1) + '%',
                        averageRounds: simResults.summary.averageRounds.toFixed(1),
                        elapsedMs: Math.round(elapsed),
                        runsPerSecond: Math.round(config.runCount / (elapsed / 1000)),
                    });
                }

                return simResults;
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Unknown simulation error';
                handleError(err, 'CombatSimulator');
                setStatus('error');
                setError({ message, category: 'CombatSimulator' });
                logger.error('CombatSimulator', 'Simulation failed', { error: message });
                return null;
            } finally {
                abortControllerRef.current = null;
            }
        },
        []
    );

    const cancelSimulation = useCallback(() => {
        if (abortControllerRef.current) {
            logger.info('CombatSimulator', 'Cancelling simulation...');
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    }, []);

    return {
        status,
        results,
        progress,
        error,
        durationMs,
        startSimulation,
        cancelSimulation,
        resetSimulation,
    };
};
