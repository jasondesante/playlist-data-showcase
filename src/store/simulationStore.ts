import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storage } from '@/utils/storage';
import { logger } from '@/utils/logger';
import type {
    CharacterSheet,
} from 'playlist-data-engine';
import type {
    SimulationConfig,
    SimulationResults,
    AIConfig,
} from 'playlist-data-engine';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum number of saved simulations (oldest evicted first) */
const MAX_SAVED_SIMULATIONS = 50;

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Serialized version of AIConfig safe for localStorage persistence.
 * Maps are converted to entries arrays for JSON serialization.
 */
export interface SerializedAIConfig {
    playerStyle: string;
    enemyStyle: string;
    overrides?: [string, string][];
    enableClassFeatures?: boolean;
}

/**
 * Serialized simulation config — everything needed to re-run a simulation.
 * Excludes runtime-only fields (onProgress, abortSignal).
 */
export interface SerializedSimulationConfig {
    runCount: number;
    baseSeed: string;
    aiConfig: SerializedAIConfig;
    combatConfig?: {
        maxTurnsBeforeDraw?: number;
        allowFleeing?: boolean;
    };
    collectDetailedLogs?: boolean;
}

/**
 * Lightweight party/encounter snapshot stored alongside results.
 * Avoids persisting full CharacterSheet objects (which are large and mutable).
 */
export interface PartySnapshot {
    /** Character seeds (used as IDs) */
    memberSeeds: string[];
    /** Display names */
    memberNames: string[];
    /** Character levels */
    memberLevels: number[];
    /** Character classes */
    memberClasses: string[];
}

export interface EncounterSnapshot {
    /** Enemy character sheets (needed to re-run simulations) */
    enemySheets: CharacterSheet[];
}

/**
 * A saved simulation record — config, results, and metadata.
 */
export interface SavedSimulation {
    /** Unique ID for this saved simulation */
    id: string;
    /** When the simulation was completed (ISO 8601 string) */
    timestamp: string;
    /** User-provided label (optional) */
    label?: string;
    /** Party configuration snapshot */
    party: PartySnapshot;
    /** Encounter configuration snapshot (includes enemy sheets for re-run) */
    encounter: EncounterSnapshot;
    /** Serialized simulation config */
    config: SerializedSimulationConfig;
    /** Simulation results summary and metrics */
    results: SimulationResults;
    /** Duration of the simulation in milliseconds */
    durationMs: number;
}

/**
 * Comparison slot — holds a reference to a saved simulation for side-by-side comparison.
 */
export interface ComparisonSlot {
    simulationId: string | null;
}

interface SimulationState {
    /** All saved simulations (most recent first) */
    savedSimulations: SavedSimulation[];

    /** Currently active simulation ID (results being viewed) */
    activeSimulationId: string | null;

    /** Comparison mode — two slots for side-by-side comparison */
    comparison: {
        slotA: ComparisonSlot;
        slotB: ComparisonSlot;
    };

    /** Save a completed simulation to the store */
    saveSimulation: (
        party: CharacterSheet[],
        enemies: CharacterSheet[],
        config: SimulationConfig,
        results: SimulationResults,
        durationMs: number,
        label?: string
    ) => string;

    /** Update the label of a saved simulation */
    updateSimulationLabel: (id: string, label: string) => void;

    /** Delete a saved simulation by ID */
    deleteSimulation: (id: string) => void;

    /** Get a saved simulation by ID */
    getSimulation: (id: string) => SavedSimulation | undefined;

    /** Set the currently active/viewing simulation */
    setActiveSimulation: (id: string | null) => void;

    /** Get the currently active simulation */
    getActiveSimulation: () => SavedSimulation | undefined;

    /** Clear all saved simulations */
    clearAllSimulations: () => void;

    /** Set a comparison slot */
    setComparisonSlot: (slot: 'A' | 'B', simulationId: string | null) => void;

    /** Clear both comparison slots */
    clearComparison: () => void;

    /** Get the two simulations currently selected for comparison */
    getComparisonPair: () => [SavedSimulation | undefined, SavedSimulation | undefined];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generate a unique simulation ID */
function generateId(): string {
    return `sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Serialize an AIConfig for persistence (Map → array entries) */
function serializeAIConfig(config: AIConfig): SerializedAIConfig {
    return {
        playerStyle: config.playerStyle,
        enemyStyle: config.enemyStyle,
        overrides: config.overrides && config.overrides.size > 0
            ? Array.from(config.overrides.entries())
            : undefined,
        enableClassFeatures: config.enableClassFeatures,
    };
}

/** Serialize a SimulationConfig for persistence */
function serializeSimulationConfig(config: SimulationConfig): SerializedSimulationConfig {
    return {
        runCount: config.runCount,
        baseSeed: config.baseSeed,
        aiConfig: serializeAIConfig(config.aiConfig),
        combatConfig: config.combatConfig ? {
            maxTurnsBeforeDraw: config.combatConfig.maxTurnsBeforeDraw,
            allowFleeing: config.combatConfig.allowFleeing,
        } : undefined,
        collectDetailedLogs: config.collectDetailedLogs,
    };
}

/** Deserialize an AIConfig back to engine format (array entries → Map) */
function deserializeAIConfig(serialized: SerializedAIConfig): AIConfig {
    return {
        playerStyle: serialized.playerStyle as AIConfig['playerStyle'],
        enemyStyle: serialized.enemyStyle as AIConfig['enemyStyle'],
        overrides: serialized.overrides
            ? new Map(serialized.overrides as [string, AIConfig['playerStyle']][])
            : undefined,
        enableClassFeatures: serialized.enableClassFeatures,
    };
}

/**
 * Reconstruct a SimulationConfig from serialized form.
 * Runtime fields (onProgress, abortSignal) are not restored.
 */
function deserializeSimulationConfig(serialized: SerializedSimulationConfig): SimulationConfig {
    return {
        runCount: serialized.runCount,
        baseSeed: serialized.baseSeed,
        aiConfig: deserializeAIConfig(serialized.aiConfig),
        combatConfig: serialized.combatConfig,
        collectDetailedLogs: serialized.collectDetailedLogs,
    };
}

/**
 * Build a PartySnapshot from CharacterSheet array.
 */
function buildPartySnapshot(party: CharacterSheet[]): PartySnapshot {
    return {
        memberSeeds: party.map(c => c.seed),
        memberNames: party.map(c => c.name),
        memberLevels: party.map(c => c.level),
        memberClasses: party.map(c => c.class),
    };
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSimulationStore = create<SimulationState>()(
    persist(
        (set, get) => ({
            savedSimulations: [],
            activeSimulationId: null,
            comparison: {
                slotA: { simulationId: null },
                slotB: { simulationId: null },
            },

            /**
             * Save a completed simulation to the store.
             * Enforces MAX_SAVED_SIMULATIONS by evicting the oldest entry.
             * Returns the new simulation's ID.
             */
            saveSimulation: (party, enemies, config, results, durationMs, label) => {
                const id = generateId();

                const saved: SavedSimulation = {
                    id,
                    timestamp: new Date().toISOString(),
                    label,
                    party: buildPartySnapshot(party),
                    encounter: {
                        enemySheets: enemies,
                    },
                    config: serializeSimulationConfig(config),
                    results,
                    durationMs,
                };

                set((state) => {
                    const updated = [saved, ...state.savedSimulations];
                    // Evict oldest if over limit
                    if (updated.length > MAX_SAVED_SIMULATIONS) {
                        const evictedCount = updated.length - MAX_SAVED_SIMULATIONS;
                        logger.info('SimulationStore', `Evicted ${evictedCount} oldest simulation(s) to stay within limit of ${MAX_SAVED_SIMULATIONS}`);
                        updated.length = MAX_SAVED_SIMULATIONS;
                    }

                    // If the evicted simulation was in a comparison slot, clear it
                    const evictedIds = state.savedSimulations
                        .slice(MAX_SAVED_SIMULATIONS - 1)
                        .map(s => s.id);
                    const comparisonA = evictedIds.includes(state.comparison.slotA.simulationId ?? '')
                        ? null
                        : state.comparison.slotA.simulationId;
                    const comparisonB = evictedIds.includes(state.comparison.slotB.simulationId ?? '')
                        ? null
                        : state.comparison.slotB.simulationId;

                    return {
                        savedSimulations: updated,
                        activeSimulationId: id,
                        comparison: {
                            slotA: { simulationId: comparisonA },
                            slotB: { simulationId: comparisonB },
                        },
                    };
                });

                logger.info('SimulationStore', 'Saved simulation', {
                    id,
                    label: label ?? 'unnamed',
                    runCount: config.runCount,
                    playerWinRate: `${(results.summary.playerWinRate * 100).toFixed(1)}%`,
                    totalSaved: get().savedSimulations.length,
                });

                return id;
            },

            /**
             * Update the user-provided label for a saved simulation.
             */
            updateSimulationLabel: (id, label) => {
                set((state) => ({
                    savedSimulations: state.savedSimulations.map((s) =>
                        s.id === id ? { ...s, label } : s
                    ),
                }));
                logger.debug('SimulationStore', 'Updated label', { id, label });
            },

            /**
             * Delete a saved simulation by ID.
             * Clears comparison slots and active ID if they reference this simulation.
             */
            deleteSimulation: (id) => {
                set((state) => ({
                    savedSimulations: state.savedSimulations.filter((s) => s.id !== id),
                    activeSimulationId: state.activeSimulationId === id
                        ? null
                        : state.activeSimulationId,
                    comparison: {
                        slotA: {
                            simulationId: state.comparison.slotA.simulationId === id
                                ? null
                                : state.comparison.slotA.simulationId,
                        },
                        slotB: {
                            simulationId: state.comparison.slotB.simulationId === id
                                ? null
                                : state.comparison.slotB.simulationId,
                        },
                    },
                }));
                logger.info('SimulationStore', 'Deleted simulation', { id });
            },

            /**
             * Get a saved simulation by ID.
             */
            getSimulation: (id) => {
                return get().savedSimulations.find((s) => s.id === id);
            },

            /**
             * Set the currently active/viewing simulation.
             */
            setActiveSimulation: (id) => {
                set({ activeSimulationId: id });
            },

            /**
             * Get the currently active simulation.
             */
            getActiveSimulation: () => {
                const { savedSimulations, activeSimulationId } = get();
                if (!activeSimulationId) return undefined;
                return savedSimulations.find((s) => s.id === activeSimulationId);
            },

            /**
             * Clear all saved simulations.
             */
            clearAllSimulations: () => {
                logger.warn('SimulationStore', 'Cleared all saved simulations', {
                    previousCount: get().savedSimulations.length,
                });
                set({
                    savedSimulations: [],
                    activeSimulationId: null,
                    comparison: {
                        slotA: { simulationId: null },
                        slotB: { simulationId: null },
                    },
                });
            },

            /**
             * Set a comparison slot to a saved simulation ID.
             */
            setComparisonSlot: (slot, simulationId) => {
                set((state) => ({
                    comparison: {
                        ...state.comparison,
                        [slot === 'A' ? 'slotA' : 'slotB']: { simulationId },
                    },
                }));
                logger.debug('SimulationStore', `Set comparison slot ${slot}`, { simulationId });
            },

            /**
             * Clear both comparison slots.
             */
            clearComparison: () => {
                set({
                    comparison: {
                        slotA: { simulationId: null },
                        slotB: { simulationId: null },
                    },
                });
                logger.debug('SimulationStore', 'Cleared comparison slots');
            },

            /**
             * Get the two simulations currently selected for comparison.
             * Returns [slotA simulation, slotB simulation].
             */
            getComparisonPair: () => {
                const { savedSimulations, comparison } = get();
                const simA = comparison.slotA.simulationId
                    ? savedSimulations.find((s) => s.id === comparison.slotA.simulationId)
                    : undefined;
                const simB = comparison.slotB.simulationId
                    ? savedSimulations.find((s) => s.id === comparison.slotB.simulationId)
                    : undefined;
                return [simA, simB];
            },
        }),
        {
            name: 'simulation-storage',
            storage: createJSONStorage(() => storage),
            onRehydrateStorage: () => {
                return (state) => {
                    if (state) {
                        logger.info('SimulationStore', 'Rehydrated from storage', {
                            savedCount: state.savedSimulations.length,
                            activeId: state.activeSimulationId,
                        });

                        // Validate comparison slots reference existing simulations
                        const validIds = new Set(state.savedSimulations.map(s => s.id));
                        let cleaned = false;

                        if (state.activeSimulationId && !validIds.has(state.activeSimulationId)) {
                            state.activeSimulationId = null;
                            cleaned = true;
                        }

                        if (state.comparison.slotA.simulationId && !validIds.has(state.comparison.slotA.simulationId)) {
                            state.comparison.slotA.simulationId = null;
                            cleaned = true;
                        }

                        if (state.comparison.slotB.simulationId && !validIds.has(state.comparison.slotB.simulationId)) {
                            state.comparison.slotB.simulationId = null;
                            cleaned = true;
                        }

                        // Initialize comparison if missing (backwards compatibility)
                        if (!state.comparison) {
                            state.comparison = {
                                slotA: { simulationId: null },
                                slotB: { simulationId: null },
                            };
                            cleaned = true;
                        }

                        if (cleaned) {
                            logger.info('SimulationStore', 'Cleaned up stale references on rehydration');
                        }
                    }
                };
            },
        }
    )
);

// ─── Deserialization helpers (for consumers that need engine types) ────────────

/**
 * Reconstruct an engine-compatible SimulationConfig from a saved simulation's
 * serialized config. Runtime fields (onProgress, abortSignal) are omitted —
 * the consumer must add these if re-running.
 */
export function toEngineConfig(serialized: SerializedSimulationConfig): SimulationConfig {
    return deserializeSimulationConfig(serialized);
}
