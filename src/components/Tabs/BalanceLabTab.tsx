import { useState, useCallback, useId, useMemo } from 'react';
import {
    Scale,
    ChevronDown,
    ChevronUp,
    Swords,
    Save,
    RotateCcw,
    AlertCircle,
    Clock,
    Zap,
} from 'lucide-react';
import { useSimulationHistory } from '@/hooks/useSimulationHistory';
import { SimulationHistoryPanel } from '@/components/balance/SimulationHistoryPanel';
import {
    BalanceValidator,
    type EncounterDifficulty,
} from 'playlist-data-engine';
import { getWinRateDifficulty } from '@/types/simulation';
import { logger } from '@/utils/logger';
import './BalanceLabTab.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPercent(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
}

function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function getWinRateColorClass(winRate: number): string {
    if (winRate >= 0.8) return 'bl-win-rate-high';
    if (winRate >= 0.5) return 'bl-win-rate-medium';
    if (winRate >= 0.3) return 'bl-win-rate-low';
    return 'bl-win-rate-critical';
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

    // Simulation hook with persistence
    const {
        status,
        results,
        progress,
        error,
        durationMs,
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
                            <div className="bl-config-placeholder">
                                <Swords size={32} strokeWidth={1.5} className="bl-placeholder-icon" />
                                <p className="bl-placeholder-text">
                                    Simulation configuration will be available here.
                                </p>
                                <p className="bl-placeholder-hint">
                                    Configure party, encounter, AI strategies, and run settings.
                                </p>
                            </div>
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

                            {/* ─── Results Summary ──────────────────── */}
                            {hasResults && (
                                <div className="bl-results-summary">
                                    {/* Win Rate */}
                                    <div className={`bl-win-rate-card ${getWinRateColorClass(results.summary.playerWinRate)}`}>
                                        <span className="bl-win-rate-value">
                                            {formatPercent(results.summary.playerWinRate)}
                                        </span>
                                        <span className="bl-win-rate-label">Player Win Rate</span>
                                    </div>

                                    {/* Metrics Grid */}
                                    <div className="bl-metrics-grid">
                                        <div className="bl-metric">
                                            <span className="bl-metric-value">
                                                {results.summary.averageRounds.toFixed(1)}
                                            </span>
                                            <span className="bl-metric-label">Avg Rounds</span>
                                        </div>
                                        <div className="bl-metric">
                                            <span className="bl-metric-value">
                                                {results.summary.medianRounds.toFixed(1)}
                                            </span>
                                            <span className="bl-metric-label">Median Rounds</span>
                                        </div>
                                        <div className="bl-metric">
                                            <span className="bl-metric-value">
                                                {formatPercent(results.summary.averagePlayerHPPercentRemaining)}
                                            </span>
                                            <span className="bl-metric-label">HP Remaining</span>
                                        </div>
                                        <div className="bl-metric">
                                            <span className="bl-metric-value bl-metric-deaths">
                                                {results.summary.totalPlayerDeaths}
                                            </span>
                                            <span className="bl-metric-label">Player Deaths</span>
                                        </div>
                                        <div className="bl-metric">
                                            <span className="bl-metric-value">
                                                {results.summary.totalRuns.toLocaleString()}
                                            </span>
                                            <span className="bl-metric-label">Total Runs</span>
                                        </div>
                                        {durationMs !== null && (
                                            <div className="bl-metric">
                                                <span className="bl-metric-value">
                                                    {formatDuration(durationMs)}
                                                </span>
                                                <span className="bl-metric-label">Duration</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Balance Assessment */}
                                    {balanceReport && (
                                        <div className={`bl-balance-card bl-balance-${balanceReport.difficultyVariance}`}>
                                            <div className="bl-balance-header">
                                                <span className="bl-balance-difficulty">
                                                    {balanceReport.actualDifficulty}
                                                </span>
                                                <span className="bl-balance-score">
                                                    Score: {balanceReport.balanceScore}
                                                </span>
                                            </div>
                                            <div className="bl-balance-score-bar">
                                                <div
                                                    className="bl-balance-score-fill"
                                                    style={{ width: `${balanceReport.balanceScore}%` }}
                                                />
                                            </div>
                                            {balanceReport.recommendations.length > 0 && (
                                                <div className="bl-balance-recommendations">
                                                    <span className="bl-balance-rec-label">Suggestions</span>
                                                    <ul className="bl-balance-rec-list">
                                                        {balanceReport.recommendations.slice(0, 3).map((rec, i) => (
                                                            <li key={i} className="bl-balance-rec-item">
                                                                {rec.description}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Cancelled notice */}
                                    {isCancelled && (
                                        <div className="bl-cancelled-notice">
                                            Simulation cancelled — showing partial results ({results.summary.totalRuns} runs completed)
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="bl-results-actions">
                                        {!activeSavedId && isCompleted && (
                                            <button className="bl-action-btn bl-action-save" onClick={handleSave}>
                                                <Save size={14} />
                                                Save Results
                                            </button>
                                        )}
                                        {activeSavedId && (
                                            <span className="bl-saved-indicator">Saved</span>
                                        )}
                                        <button className="bl-action-btn bl-action-reset" onClick={handleReset}>
                                            <RotateCcw size={14} />
                                            Reset
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ─── Empty State ──────────────────────── */}
                            {!hasResults && !isRunning && !isError && (
                                <div className="bl-results-empty">
                                    <Zap size={32} strokeWidth={1.5} className="bl-placeholder-icon" />
                                    <p className="bl-placeholder-text">No simulation results yet</p>
                                    <p className="bl-placeholder-hint">
                                        Configure an encounter on the left and run a simulation to see balance analysis here.
                                    </p>
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
