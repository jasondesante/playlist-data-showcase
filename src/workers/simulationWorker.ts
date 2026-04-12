/**
 * Web Worker for running combat simulations off the main thread.
 *
 * Receives simulation requests via `postMessage`, runs them using the
 * CombatSimulator engine, and posts back progress updates and results.
 * Supports cancellation via message-based abort.
 *
 * Message protocol:
 *   → { type: 'start', id: string, party, enemies, config }
 *   ← { type: 'progress', id: string, completed: number, total: number }
 *   ← { type: 'complete', id: string, results: SimulationResults }
 *   ← { type: 'error', id: string, message: string }
 *   → { type: 'cancel', id: string }
 */

import {
    CombatSimulator,
    type SimulationConfig,
    type SimulationResults,
    type CharacterSheet,
} from 'playlist-data-engine';

// ─── Worker Message Types ────────────────────────────────────────────────────

export interface SimulationWorkerStartMessage {
    type: 'start';
    /** Unique ID for this simulation request */
    id: string;
    party: CharacterSheet[];
    enemies: CharacterSheet[];
    /** Config with non-function fields (onProgress/abortSignal handled internally) */
    config: Omit<SimulationConfig, 'onProgress' | 'abortSignal'> & {
        /** Map entries serialized as [key, value][] for structured clone */
        aiConfigOverrides?: [string, string][];
    };
}

export interface SimulationWorkerCancelMessage {
    type: 'cancel';
    id: string;
}

export interface SimulationWorkerProgressMessage {
    type: 'progress';
    id: string;
    completed: number;
    total: number;
}

export interface SimulationWorkerCompleteMessage {
    type: 'complete';
    id: string;
    results: SimulationResults;
    /** Duration in milliseconds */
    durationMs: number;
}

export interface SimulationWorkerErrorMessage {
    type: 'error';
    id: string;
    message: string;
}

export type SimulationWorkerIncomingMessage =
    | SimulationWorkerStartMessage
    | SimulationWorkerCancelMessage;

export type SimulationWorkerOutgoingMessage =
    | SimulationWorkerProgressMessage
    | SimulationWorkerCompleteMessage
    | SimulationWorkerErrorMessage;

// ─── Abort Tracking ─────────────────────────────────────────────────────────

/** Tracks the AbortController for the currently running simulation, keyed by ID */
const activeControllers = new Map<string, AbortController>();

// ─── Message Handler ────────────────────────────────────────────────────────

self.onmessage = (event: MessageEvent<SimulationWorkerIncomingMessage>) => {
    const msg = event.data;

    switch (msg.type) {
        case 'start':
            handleStart(msg);
            break;
        case 'cancel':
            handleCancel(msg);
            break;
    }
};

function handleStart(msg: SimulationWorkerStartMessage): void {
    const { id, party, enemies, config } = msg;

    // Cancel any previous simulation with the same ID
    const existing = activeControllers.get(id);
    if (existing) {
        existing.abort();
    }

    // Create AbortController for this simulation
    const abortController = new AbortController();
    activeControllers.set(id, abortController);

    // Reconstruct the AIConfig with Map from serialized entries
    const aiConfig = {
        playerStyle: config.aiConfig.playerStyle,
        enemyStyle: config.aiConfig.enemyStyle,
        enableClassFeatures: config.aiConfig.enableClassFeatures,
    };

    // Reconstruct overrides Map from serialized entries
    if (config.aiConfigOverrides && config.aiConfigOverrides.length > 0) {
        (aiConfig as { overrides?: Map<string, string> }).overrides = new Map(
            config.aiConfigOverrides as [string, string][]
        );
    }

    const simConfig: SimulationConfig = {
        runCount: config.runCount,
        baseSeed: config.baseSeed,
        aiConfig: aiConfig as SimulationConfig['aiConfig'],
        combatConfig: config.combatConfig,
        collectDetailedLogs: config.collectDetailedLogs,
        enemyRegeneration: config.enemyRegeneration as SimulationConfig['enemyRegeneration'],
        abortSignal: abortController.signal,
        onProgress: (completed: number, total: number) => {
            const response: SimulationWorkerProgressMessage = {
                type: 'progress',
                id,
                completed,
                total,
            };
            self.postMessage(response);
        },
    };

    const startTime = performance.now();

    // Run asynchronously to allow cancel messages to be processed
    // Use setTimeout(0) to yield between progress callbacks
    setTimeout(() => {
        try {
            const simulator = new CombatSimulator();
            const results = simulator.run(party, enemies, simConfig);
            const durationMs = performance.now() - startTime;

            // Clean up
            activeControllers.delete(id);

            // Strip non-cloneable fields from config before posting results
            const { abortSignal: _as, onProgress: _op, ...cloneableConfig } = results.config as SimulationConfig & {
                abortSignal?: AbortSignal;
                onProgress?: (completed: number, total: number) => void;
            };
            const cloneableResults = {
                ...results,
                config: cloneableConfig,
                // Maps are cloneable in modern browsers, but convert to plain
                // object to be safe across all structured clone contexts
                perCombatantMetrics: results.perCombatantMetrics
                    ? Object.fromEntries(results.perCombatantMetrics)
                    : results.perCombatantMetrics,
            };

            const response: SimulationWorkerCompleteMessage = {
                type: 'complete',
                id,
                results: cloneableResults as unknown as SimulationResults,
                durationMs: Math.round(durationMs),
            };
            self.postMessage(response);
        } catch (err) {
            // Clean up
            activeControllers.delete(id);

            const message = err instanceof Error ? err.message : 'Unknown simulation error';
            const response: SimulationWorkerErrorMessage = {
                type: 'error',
                id,
                message,
            };
            self.postMessage(response);
        }
    }, 0);
}

function handleCancel(msg: SimulationWorkerCancelMessage): void {
    const controller = activeControllers.get(msg.id);
    if (controller) {
        controller.abort();
        activeControllers.delete(msg.id);
    }
}
