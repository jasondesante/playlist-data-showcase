import { useState, useCallback, useRef, useEffect } from 'react';
import {
    CombatSimulator,
    type SimulationConfig,
    type SimulationResults,
    type CharacterSheet,
} from 'playlist-data-engine';
import { logger } from '@/utils/logger';
import { handleError } from '@/utils/errorHandling';
import type {
    SimulationWorkerOutgoingMessage,
} from '@/workers/simulationWorker';

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

/** Minimum run count to justify worker overhead (small sims finish faster synchronously) */
const WORKER_MIN_RUNS = 50;

// ─── Worker Management ───────────────────────────────────────────────────────

/**
 * Lazily creates a simulation Web Worker.
 * Returns null if Workers are not supported or creation fails.
 */
let workerInstance: Worker | null = null;
let workerCreationAttempted = false;
let workerSupported: boolean | null = null;

function getWorker(): Worker | null {
    if (workerCreationAttempted && !workerSupported) {
        return null;
    }

    if (workerInstance) {
        return workerInstance;
    }

    try {
        if (typeof Worker === 'undefined') {
            workerCreationAttempted = true;
            workerSupported = false;
            logger.warn('CombatSimulator', 'Web Workers not supported, using main thread fallback');
            return null;
        }

        workerInstance = new Worker(
            new URL('@/workers/simulationWorker.ts', import.meta.url),
            { type: 'module' }
        );

        workerInstance.onerror = (err) => {
            logger.error('CombatSimulator', 'Worker error', {
                message: err.message,
                filename: err.filename,
            });
            // Don't destroy the worker on error — it might recover
        };

        workerCreationAttempted = true;
        workerSupported = true;
        logger.info('CombatSimulator', 'Web Worker created for simulation offloading');
        return workerInstance;
    } catch (err) {
        workerCreationAttempted = true;
        workerSupported = false;
        const message = err instanceof Error ? err.message : 'Unknown worker creation error';
        logger.warn('CombatSimulator', `Web Worker creation failed, using main thread fallback: ${message}`);
        return null;
    }
}

/** Terminate the worker (for cleanup / testing) */
export function terminateSimulationWorker(): void {
    if (workerInstance) {
        workerInstance.terminate();
        workerInstance = null;
    }
    workerCreationAttempted = false;
    workerSupported = null;
}

// ─── ETA Helper ──────────────────────────────────────────────────────────────

function updateProgressWithETA(
    completed: number,
    total: number,
    setProgress: (p: SimulationProgress) => void,
    lastCompletedRef: React.MutableRefObject<number>,
    lastTimeRef: React.MutableRefObject<number>,
    useWorkerTime: boolean
): void {
    const now = useWorkerTime ? Date.now() : performance.now();
    const fraction = total > 0 ? completed / total : 0;

    let estimatedMsRemaining: number | null = null;
    if (completed >= ETA_MIN_RUNS) {
        const deltaCompleted = completed - lastCompletedRef.current;
        const deltaTime = now - lastTimeRef.current;
        if (deltaCompleted > 0 && deltaTime > 0) {
            const msPerRun = deltaTime / deltaCompleted;
            const remaining = total - completed;
            estimatedMsRemaining = Math.round(msPerRun * remaining);
        }
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
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * React hook for Monte Carlo combat simulation via the CombatSimulator engine.
 *
 * Runs simulations in a Web Worker when possible (avoiding main thread blocking),
 * with automatic fallback to synchronous main-thread execution when Workers
 * are unavailable or for small simulation counts.
 *
 * Manages simulation lifecycle (idle → running → completed/cancelled/error),
 * progress tracking with ETA estimation, and cancellation.
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
    const workerMessageHandlerRef = useRef<((msg: MessageEvent<SimulationWorkerOutgoingMessage>) => void) | null>(null);
    /** Tracks the current worker run ID so cancel can target the right simulation */
    const currentRunIdRef = useRef<string | null>(null);

    // Cleanup on unmount — cancel any running simulation
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
            currentRunIdRef.current = null;
        };
    }, []);

    const resetSimulation = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        // Remove worker message handler
        const worker = getWorker();
        if (worker && workerMessageHandlerRef.current) {
            worker.removeEventListener('message', workerMessageHandlerRef.current);
            workerMessageHandlerRef.current = null;
        }

        currentRunIdRef.current = null;
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

            const runId = `sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            currentRunIdRef.current = runId;
            abortControllerRef.current = new AbortController();

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

            // Try Web Worker for larger simulations
            const worker = getWorker();
            if (worker && config.runCount >= WORKER_MIN_RUNS) {
                return startWorkerSimulation(worker, runId, party, enemies, config);
            }

            // Fallback: synchronous main-thread execution
            return startSyncSimulation(runId, party, enemies, config);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    // ─── Worker-based simulation ─────────────────────────────────────────

    const startWorkerSimulation = useCallback(
        (
            worker: Worker,
            runId: string,
            party: CharacterSheet[],
            enemies: CharacterSheet[],
            config: SimulationConfig
        ): SimulationResults | null => {
            // Serialize AIConfig overrides Map to array for structured clone
            let aiConfigOverrides: [string, string][] | undefined;
            if (config.aiConfig.overrides && config.aiConfig.overrides.size > 0) {
                aiConfigOverrides = Array.from(config.aiConfig.overrides.entries());
            }

            // Set up message handler
            const handler = (event: MessageEvent<SimulationWorkerOutgoingMessage>) => {
                const msg = event.data;
                if (msg.id !== runId) return;

                switch (msg.type) {
                    case 'progress':
                        updateProgressWithETA(
                            msg.completed,
                            msg.total,
                            setProgress,
                            lastCompletedRef,
                            lastTimeRef,
                            true // use Date.now() since performance.now() differs across threads
                        );
                        break;

                    case 'complete':
                        handleWorkerComplete(msg.results, msg.durationMs, config.runCount);
                        // Clean up handler
                        worker.removeEventListener('message', handler);
                        workerMessageHandlerRef.current = null;
                        break;

                    case 'error':
                        handleError(new Error(msg.message), 'CombatSimulator');
                        setStatus('error');
                        setError({ message: msg.message, category: 'CombatSimulator' });
                        logger.error('CombatSimulator', 'Simulation failed', { error: msg.message });
                        abortControllerRef.current = null;
                        // Clean up handler
                        worker.removeEventListener('message', handler);
                        workerMessageHandlerRef.current = null;
                        break;
                }
            };

            worker.addEventListener('message', handler);
            workerMessageHandlerRef.current = handler as unknown as (msg: MessageEvent<SimulationWorkerOutgoingMessage>) => void;

            // Send start message to worker
            worker.postMessage({
                type: 'start',
                id: runId,
                party,
                enemies,
                config: {
                    runCount: config.runCount,
                    baseSeed: config.baseSeed,
                    aiConfig: {
                        playerStyle: config.aiConfig.playerStyle,
                        enemyStyle: config.aiConfig.enemyStyle,
                        enableClassFeatures: config.aiConfig.enableClassFeatures,
                    },
                    combatConfig: config.combatConfig,
                    collectDetailedLogs: config.collectDetailedLogs,
                    aiConfigOverrides,
                },
            });

            // Worker is async — return null (results come via state)
            return null;
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    const handleWorkerComplete = useCallback(
        (simResults: SimulationResults, workerDurationMs: number, requestedRuns: number) => {
            abortControllerRef.current = null;

            if (simResults.wasCancelled) {
                setStatus('cancelled');
                setResults(simResults);
                setDurationMs(workerDurationMs);
                logger.info('CombatSimulator', 'Simulation cancelled', {
                    completedRuns: simResults.summary.totalRuns,
                    requestedRuns,
                    elapsedMs: workerDurationMs,
                });
            } else {
                setStatus('completed');
                setResults(simResults);
                setDurationMs(workerDurationMs);
                setProgress({
                    completed: requestedRuns,
                    total: requestedRuns,
                    fraction: 1,
                    estimatedMsRemaining: 0,
                });

                logger.info('CombatSimulator', 'Simulation completed', {
                    totalRuns: simResults.summary.totalRuns,
                    playerWinRate: (simResults.summary.playerWinRate * 100).toFixed(1) + '%',
                    averageRounds: simResults.summary.averageRounds.toFixed(1),
                    elapsedMs: workerDurationMs,
                    runsPerSecond: workerDurationMs > 0
                        ? Math.round(requestedRuns / (workerDurationMs / 1000))
                        : 0,
                    mode: 'worker',
                });
            }
        },
        []
    );

    // ─── Synchronous fallback simulation ─────────────────────────────────

    const startSyncSimulation = useCallback(
        (
            _runId: string,
            party: CharacterSheet[],
            enemies: CharacterSheet[],
            config: SimulationConfig
        ): SimulationResults | null => {
            const abortController = abortControllerRef.current!;
            startTimeRef.current = performance.now();
            lastTimeRef.current = startTimeRef.current;

            try {
                const simConfig: SimulationConfig = {
                    ...config,
                    abortSignal: abortController.signal,
                    onProgress: (completed: number, total: number) => {
                        updateProgressWithETA(
                            completed,
                            total,
                            setProgress,
                            lastCompletedRef,
                            lastTimeRef,
                            false
                        );
                    },
                };

                const simResults = new CombatSimulator().run(party, enemies, simConfig);
                const elapsed = performance.now() - startTimeRef.current;

                if (abortController.signal.aborted) {
                    setStatus('cancelled');
                    setResults(simResults);
                    setDurationMs(Math.round(elapsed));
                    logger.info('CombatSimulator', 'Simulation cancelled', {
                        completedRuns: simResults.summary.totalRuns,
                        requestedRuns: config.runCount,
                        elapsedMs: Math.round(elapsed),
                        mode: 'sync',
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
                        mode: 'sync',
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

        // Send cancel message to worker with the active run ID
        const worker = getWorker();
        if (worker && currentRunIdRef.current) {
            worker.postMessage({ type: 'cancel', id: currentRunIdRef.current });
            currentRunIdRef.current = null;
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
