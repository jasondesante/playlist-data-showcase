import { useState, useCallback, useEffect, useId, useMemo, useRef } from 'react';
import {
    Scale,
    ChevronDown,
    ChevronUp,
    Swords,
    AlertCircle,
    Clock,
    Zap,
    Database,
} from 'lucide-react';
import { useSimulationHistory } from '@/hooks/useSimulationHistory';
import { SimulationHistoryPanel } from '@/components/balance/SimulationHistoryPanel';
import { SimulationConfigPanel } from '@/components/balance/SimulationConfigPanel';
import { BalanceDashboard } from '@/components/balance/BalanceDashboard';
import { ResultsDashboardSkeleton } from '@/components/balance/BalanceLabSkeleton';
import {
    BalanceValidator,
    type EncounterDifficulty,
    type SimulationConfig,
    type CharacterSheet,
} from 'playlist-data-engine';
import { getWinRateDifficulty, type EncounterConfigUI, DEFAULT_ENCOUNTER_CONFIG } from '@/types/simulation';
import { onBalanceConfigTransfer, type BalanceConfigTransferPayload } from '@/utils/balanceConfigTransfer';
import { logger } from '@/utils/logger';
import './BalanceLabTab.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * BalanceLabTab Component
 *
 * Main container for combat balance simulation and analysis tools.
 * Two-panel layout: configuration (left) and results (right).
 * Collapsible panels for space management.
 * Responsive layout for mobile.
 */
export function BalanceLabTab() {
    const [configCollapsed, setConfigCollapsed] = useState(false);
    const [resultsCollapsed, setResultsCollapsed] = useState(false);
    const [historyCollapsed, setHistoryCollapsed] = useState(false);

    // Track encounter config for recommendation "apply" integration
    const [encounterConfig, setEncounterConfig] = useState<EncounterConfigUI>(DEFAULT_ENCOUNTER_CONFIG);
    const [configOverride, setConfigOverride] = useState<EncounterConfigUI | null>(null);
    const configOverrideConsumedRef = useRef(false);

    // Track incoming config transfer from CombatSimulatorTab
    const [partySeedsOverride, setPartySeedsOverride] = useState<string[] | null>(null);
    const pendingTransferRef = useRef<BalanceConfigTransferPayload | null>(null);

    // Listen for config transfers from CombatSimulatorTab
    useEffect(() => {
        const unsubscribe = onBalanceConfigTransfer((payload) => {
            logger.info('BalanceLab', 'Received config transfer from Combat tab', {
                partySize: payload.party.length,
                enemyCount: payload.enemies.length,
            });
            // Set encounter config override for the form
            setEncounterConfig(payload.encounterConfig);
            setConfigOverride(payload.encounterConfig);
            configOverrideConsumedRef.current = false;
            // Set party seeds for pre-selection
            setPartySeedsOverride(payload.partySeeds);
            // Store the transfer for auto-running simulation
            pendingTransferRef.current = payload;
            // Expand config panel so user sees the pre-filled form
            setConfigCollapsed(false);
        });
        return unsubscribe;
    }, []);

    // Simulation hook with persistence
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
        saveCurrentResults,
        loadSimulation,
        activeSavedId,
        savedSimulations,
    } = useSimulationHistory();

    // Unique IDs for collapsible panels
    const configId = useId();
    const resultsId = useId();
    const historyId = useId();
    const configContentId = `bl-config-content-${configId}`;
    const resultsContentId = `bl-results-content-${resultsId}`;
    const historyContentId = `bl-history-content-${historyId}`;

    // Balance analysis from results — uses win-rate-derived difficulty as intended
    const balanceReport = useMemo(() => {
        if (!results || results.summary.totalRuns === 0) return null;
        try {
            const validator = new BalanceValidator();
            const { difficulty } = getWinRateDifficulty(results.summary.playerWinRate);
            return validator.analyze(results, difficulty as EncounterDifficulty);
        } catch (err) {
            logger.warn('BalanceLab', 'Failed to generate balance report', {
                error: err instanceof Error ? err.message : 'Unknown error',
            });
            return null;
        }
    }, [results]);

    // Handle save
    const handleSave = useCallback(() => {
        const id = saveCurrentResults();
        if (id) {
            logger.info('BalanceLab', 'Results saved', { id });
        }
    }, [saveCurrentResults]);

    // Handle reset
    const handleReset = useCallback(() => {
        resetSimulation();
        logger.info('BalanceLab', 'Simulation reset');
    }, [resetSimulation]);

    // Handle load from history
    const handleLoadSimulation = useCallback(
        (id: string) => {
            loadSimulation(id);
        },
        [loadSimulation],
    );

    // Handle run simulation from config panel
    const handleRunSimulation = useCallback(
        (party: CharacterSheet[], enemies: CharacterSheet[], config: SimulationConfig) => {
            startSimulation(party, enemies, config);
        },
        [startSimulation],
    );

    // Track encounter config changes from SimulationConfigPanel
    const handleEncounterConfigChange = useCallback((config: EncounterConfigUI) => {
        setEncounterConfig(config);
        // Clear override after it's been consumed by the config panel
        if (configOverrideConsumedRef.current) {
            setConfigOverride(null);
            configOverrideConsumedRef.current = false;
        }
    }, []);

    // Handle applying a recommendation — updates encounter config in config panel
    const handleApplyRecommendation = useCallback(
        (changes: Partial<EncounterConfigUI>) => {
            const newConfig = { ...encounterConfig, ...changes };
            setEncounterConfig(newConfig);
            setConfigOverride(newConfig);
            configOverrideConsumedRef.current = false;
            // Expand config panel so user sees the change
            setConfigCollapsed(false);
            logger.info('BalanceLab', 'Applied recommendation', { changes });
        },
        [encounterConfig],
    );

    // ─── Render ────────────────────────────────────────────────────────────

    const hasResults = results !== null && results.summary.totalRuns > 0;
    const isRunning = status === 'running';
    const isCompleted = status === 'completed';
    const isCancelled = status === 'cancelled';
    const isError = status === 'error';

    return (
        <div className="balance-lab-tab">
            {/* ─── Header ──────────────────────────────────────────────── */}
            <div className="bl-header">
                <div className="bl-header-title-row">
                    <Scale size={20} className="bl-header-icon" />
                    <h1 className="bl-header-title">Balance Lab</h1>
                </div>
                <p className="bl-header-subtitle">
                    Monte Carlo combat simulation — configure encounters, run simulations, and analyze balance
                </p>
            </div>

            {/* ─── Main Layout ─────────────────────────────────────────── */}
            <div className="bl-layout">
                {/* ─── Left Panel: Configuration ─────────────────────── */}
                <section className="bl-panel bl-config-panel">
                    <button
                        className="bl-panel-header"
                        onClick={() => setConfigCollapsed(!configCollapsed)}
                        aria-expanded={!configCollapsed}
                        aria-controls={configContentId}
                    >
                        <div className="bl-panel-title-row">
                            <Swords size={16} className="bl-panel-icon" />
                            <h2 className="bl-panel-title">Configuration</h2>
                        </div>
                        <span className="bl-panel-toggle">
                            {configCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </span>
                    </button>

                    {!configCollapsed && (
                        <div id={configContentId} className="bl-panel-content">
                            <SimulationConfigPanel
                                status={status}
                                progress={progress}
                                error={error}
                                isRunning={isRunning}
                                encounterConfigOverride={configOverride}
                                partySeedsOverride={partySeedsOverride}
                                onEncounterConfigChange={handleEncounterConfigChange}
                                onRunSimulation={handleRunSimulation}
                                onCancel={cancelSimulation}
                                onReset={resetSimulation}
                            />
                        </div>
                    )}
                </section>

                {/* ─── Right Panel: Results ───────────────────────────── */}
                <section className="bl-panel bl-results-panel">
                    <button
                        className="bl-panel-header"
                        onClick={() => setResultsCollapsed(!resultsCollapsed)}
                        aria-expanded={!resultsCollapsed}
                        aria-controls={resultsContentId}
                    >
                        <div className="bl-panel-title-row">
                            <Zap size={16} className="bl-panel-icon" />
                            <h2 className="bl-panel-title">Results</h2>
                            {isRunning && (
                                <span className="bl-status-badge bl-status-running">Running</span>
                            )}
                            {isCompleted && hasResults && (
                                <span className="bl-status-badge bl-status-completed">Done</span>
                            )}
                            {isCancelled && (
                                <span className="bl-status-badge bl-status-cancelled">Cancelled</span>
                            )}
                            {isError && (
                                <span className="bl-status-badge bl-status-error">Error</span>
                            )}
                        </div>
                        <span className="bl-panel-toggle">
                            {resultsCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </span>
                    </button>

                    {!resultsCollapsed && (
                        <div id={resultsContentId} className="bl-panel-content">
                            {/* ─── Progress Bar ─────────────────────── */}
                            {isRunning && (
                                <div className="bl-progress-section">
                                    <div className="bl-progress-bar">
                                        <div
                                            className="bl-progress-fill"
                                            style={{ width: `${progress.fraction * 100}%` }}
                                        />
                                    </div>
                                    <div className="bl-progress-info">
                                        <span className="bl-progress-label">
                                            {progress.completed.toLocaleString()} / {progress.total.toLocaleString()} runs
                                        </span>
                                        {progress.estimatedMsRemaining !== null && (
                                            <span className="bl-progress-eta">
                                                <Clock size={12} />
                                                {formatDuration(progress.estimatedMsRemaining)} remaining
                                            </span>
                                        )}
                                        <button
                                            className="bl-progress-cancel"
                                            onClick={cancelSimulation}
                                            title="Cancel simulation"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ─── Error ───────────────────────────── */}
                            {isError && error && (
                                <div className="bl-error">
                                    <AlertCircle size={16} className="bl-error-icon" />
                                    <span className="bl-error-text">{error.message}</span>
                                </div>
                            )}

                            {/* ─── Dashboard Skeleton (while running) ──── */}
                            {isRunning && (
                                <ResultsDashboardSkeleton />
                            )}

                            {/* ─── Balance Dashboard ────────────────── */}
                            {hasResults && (
                                <>
                                    {fromCache && (
                                        <div className="bl-cache-indicator">
                                            <Database size={14} className="bl-cache-icon" />
                                            <span className="bl-cache-text">Results loaded from cache</span>
                                        </div>
                                    )}
                                    <BalanceDashboard
                                        results={results}
                                        balanceReport={balanceReport}
                                        durationMs={durationMs}
                                        isCancelled={isCancelled}
                                        isSaved={!!activeSavedId}
                                        onSave={isCompleted ? handleSave : undefined}
                                        onReset={handleReset}
                                        encounterConfig={encounterConfig}
                                        onApplySuggestion={handleApplyRecommendation}
                                    />
                                </>
                            )}

                            {/* ─── Empty State / First-Time Guidance ──── */}
                            {!hasResults && !isRunning && !isError && (
                                <div className="bl-results-empty">
                                    <Scale size={32} strokeWidth={1.5} className="bl-placeholder-icon" />
                                    <p className="bl-placeholder-text">No simulation results yet</p>
                                    <p className="bl-placeholder-hint">
                                        Configure a party and encounter on the left, then run a simulation to analyze balance.
                                    </p>

                                    <div className="bl-guide-steps">
                                        <h3 className="bl-guide-heading">How to use Balance Lab</h3>
                                        <ol className="bl-guide-list">
                                            <li className="bl-guide-step">
                                                <strong>Select a party</strong> — pick up to 4 characters from the Hero tab. Generate characters there first if needed.
                                            </li>
                                            <li className="bl-guide-step">
                                                <strong>Configure the encounter</strong> — set enemy CR, count, rarity, and archetype. Use presets (Tank, Glass Cannon, Brute) to test specialized enemies.
                                            </li>
                                            <li className="bl-guide-step">
                                                <strong>Choose AI strategies</strong> — Normal AI simulates balanced play; Aggressive AI simulates maximum threat. Both sides can be set independently.
                                            </li>
                                            <li className="bl-guide-step">
                                                <strong>Run the simulation</strong> — 500 runs gives good confidence. Results show win rate, balance score, per-combatant stats, and actionable recommendations.
                                            </li>
                                        </ol>
                                    </div>

                                    <div className="bl-guide-presets">
                                        <h3 className="bl-guide-heading">Suggested starting configurations</h3>
                                        <div className="bl-guide-preset-grid">
                                            <div className="bl-guide-preset">
                                                <span className="bl-guide-preset-label">Quick Test</span>
                                                <span className="bl-guide-preset-desc">1 player vs 1 CR-matched enemy, 100 runs</span>
                                            </div>
                                            <div className="bl-guide-preset">
                                                <span className="bl-guide-preset-label">Party Balance</span>
                                                <span className="bl-guide-preset-desc">4 players vs CR-appropriate encounter, 500 runs</span>
                                            </div>
                                            <div className="bl-guide-preset">
                                                <span className="bl-guide-preset-label">Boss Fight</span>
                                                <span className="bl-guide-preset-desc">4 players vs 1 boss enemy, 500 runs</span>
                                            </div>
                                            <div className="bl-guide-preset">
                                                <span className="bl-guide-preset-label">Stress Test</span>
                                                <span className="bl-guide-preset-desc">4 players vs 6+ enemies, aggressive AI on both sides</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </section>
            </div>

            {/* ─── History Panel ───────────────────────────────────────── */}
            <section className="bl-panel bl-history-panel">
                <button
                    className="bl-panel-header"
                    onClick={() => setHistoryCollapsed(!historyCollapsed)}
                    aria-expanded={!historyCollapsed}
                    aria-controls={historyContentId}
                >
                    <div className="bl-panel-title-row">
                        <Clock size={16} className="bl-panel-icon" />
                        <h2 className="bl-panel-title">History</h2>
                        {savedSimulations.length > 0 && (
                            <span className="bl-count-badge">{savedSimulations.length}</span>
                        )}
                    </div>
                    <span className="bl-panel-toggle">
                        {historyCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                    </span>
                </button>

                {!historyCollapsed && (
                    <div id={historyContentId} className="bl-panel-content bl-history-content">
                        <SimulationHistoryPanel
                            activeSimulationId={activeSavedId}
                            onSelectSimulation={handleLoadSimulation}
                        />
                    </div>
                )}
            </section>
        </div>
    );
}
