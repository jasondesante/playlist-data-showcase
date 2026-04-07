import { useState, useCallback, useRef, useEffect } from 'react';
import {
    type CharacterSheet,
    type SimulationConfig,
    type SimulationResults,
} from 'playlist-data-engine';
import { useSimulationStore } from '@/store/simulationStore';
import { useCombatSimulation } from '@/hooks/useCombatSimulation';
import type { SimulationStatus, SimulationProgress, SimulationError } from '@/hooks/useCombatSimulation';
import { logger } from '@/utils/logger';
import type { SimulationEstimateSnapshot } from '@/types/simulation';

export interface UseSimulationHistoryReturn {
    // From useCombatSimulation — pass through
    status: SimulationStatus;
    results: SimulationResults | null;
    progress: SimulationProgress;
    error: SimulationError | null;
    durationMs: number | null;
    fromCache: boolean;
    startSimulation: (
        party: CharacterSheet[],
        enemies: CharacterSheet[],
        config: SimulationConfig,
    ) => SimulationResults | null;
    cancelSimulation: () => void;
    resetSimulation: () => void;
    /** Restore results from a saved simulation (e.g. loading from history) */
    loadResults: (results: SimulationResults, durationMs: number) => void;

    // History additions
    activeSavedId: string | null;
    savedSimulations: ReturnType<typeof useSimulationStore.getState>['savedSimulations'];
    /** Save the current simulation results to the store. Returns the saved ID or null. */
    saveCurrentResults: (label?: string) => string | null;
    /** Select a saved simulation to view its results. Returns the estimate snapshot if available. */
    loadSimulation: (id: string) => SimulationResults | null;
    /** Get the estimate snapshot from the most recently loaded simulation */
    getLoadedEstimateSnapshot: () => SimulationEstimateSnapshot | null;
    /** Set the estimate snapshot to persist alongside the next save */
    setEstimateSnapshot: (snapshot: SimulationEstimateSnapshot | null) => void;
    /** Delete a saved simulation by ID */
    deleteSimulation: (id: string) => void;
    /** Whether the current results have been saved */
    isCurrentSaved: boolean;
    /** Mark current results as saved (used after auto-save) */
    markCurrentSaved: () => void;
}

/**
 * Hook that combines useCombatSimulation with simulation store persistence.
 *
 * Wraps useCombatSimulation and adds:
 * - Auto-save on completion (optional)
 * - Manual save with label
 * - Load saved simulations to view results
 * - Delete saved simulations
 * - Track whether current results have been saved
 */
export function useSimulationHistory(): UseSimulationHistoryReturn {
    const simulation = useCombatSimulation();
    const {
        status,
        results,
        progress,
        error,
        durationMs,
        fromCache,
        startSimulation,
        cancelSimulation,
        resetSimulation,
        loadResults,
    } = simulation;

    const savedSimulations = useSimulationStore((s) => s.savedSimulations);
    const activeSavedId = useSimulationStore((s) => s.activeSimulationId);
    const saveSimulation = useSimulationStore((s) => s.saveSimulation);
    const getSimulation = useSimulationStore((s) => s.getSimulation);
    const setActiveSimulation = useSimulationStore((s) => s.setActiveSimulation);
    const deleteSimulationStore = useSimulationStore((s) => s.deleteSimulation);

    // Track the party/enemies/config used for the current simulation (for saving)
    const lastRunRef = useRef<{
        party: CharacterSheet[];
        enemies: CharacterSheet[];
        config: SimulationConfig;
    } | null>(null);

    // Track the estimate snapshot for the current simulation (for saving)
    const lastEstimateSnapshotRef = useRef<SimulationEstimateSnapshot | null>(null);

    // Track the estimate snapshot from the most recently loaded simulation (ref for sync access)
    const loadedEstimateSnapshotRef = useRef<SimulationEstimateSnapshot | null>(null);

    // Track whether current results have been saved
    const [isCurrentSaved, setIsCurrentSaved] = useState(false);

    // Reset saved flag when simulation starts or resets
    useEffect(() => {
        setIsCurrentSaved(false);
    }, [status]);

    const wrappedStartSimulation = useCallback(
        (
            party: CharacterSheet[],
            enemies: CharacterSheet[],
            config: SimulationConfig,
        ): SimulationResults | null => {
            lastRunRef.current = { party, enemies, config };
            setIsCurrentSaved(false);
            return startSimulation(party, enemies, config);
        },
        [startSimulation],
    );

    /**
     * Set the estimate snapshot to persist alongside the next save.
     * Called from BalanceLabTab when a simulation is started.
     */
    const setEstimateSnapshot = useCallback((snapshot: SimulationEstimateSnapshot | null) => {
        lastEstimateSnapshotRef.current = snapshot;
    }, []);

    const saveCurrentResults = useCallback(
        (label?: string): string | null => {
            if (!results || !lastRunRef.current) {
                logger.warn('SimulationHistory', 'Cannot save: no results or no run data');
                return null;
            }

            const { party, enemies, config } = lastRunRef.current;
            const id = saveSimulation(party, enemies, config, results, durationMs ?? 0, label, lastEstimateSnapshotRef.current ?? undefined);
            setIsCurrentSaved(true);
            logger.info('SimulationHistory', 'Saved simulation results', { id, label });
            return id;
        },
        [results, durationMs, saveSimulation],
    );

    const getLoadedEstimateSnapshot = useCallback(() => {
        return loadedEstimateSnapshotRef.current;
    }, []);

    const loadSimulation = useCallback(
        (id: string): SimulationResults | null => {
            const saved = getSimulation(id);
            if (!saved) {
                logger.warn('SimulationHistory', 'Cannot load: simulation not found', { id });
                return null;
            }
            setActiveSimulation(id);
            // Restore results into combat simulation state so dashboard renders
            loadResults(saved.results, saved.durationMs);
            // Restore estimate snapshot for validation panel (ref for sync access)
            loadedEstimateSnapshotRef.current = saved.estimateSnapshot ?? null;
            logger.info('SimulationHistory', 'Loaded simulation from history', {
                id,
                hasEstimateSnapshot: !!saved.estimateSnapshot,
            });
            return saved.results;
        },
        [getSimulation, setActiveSimulation, loadResults],
    );

    const deleteSimulation = useCallback(
        (id: string) => {
            deleteSimulationStore(id);
            logger.info('SimulationHistory', 'Deleted simulation', { id });
        },
        [deleteSimulationStore],
    );

    const markCurrentSaved = useCallback(() => {
        setIsCurrentSaved(true);
    }, []);

    return {
        status,
        results,
        progress,
        error,
        durationMs,
        fromCache,
        startSimulation: wrappedStartSimulation,
        cancelSimulation,
        resetSimulation,
        loadResults,
        activeSavedId,
        savedSimulations,
        saveCurrentResults,
        loadSimulation,
        getLoadedEstimateSnapshot,
        setEstimateSnapshot,
        deleteSimulation,
        isCurrentSaved,
        markCurrentSaved,
    };
}
