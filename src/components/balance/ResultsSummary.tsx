import { useMemo, memo } from 'react';
import {
    Target,
    Timer,
    Heart,
    Skull,
    Swords,
    Clock,
    ShieldAlert,
} from 'lucide-react';
import type { SimulationResults, BalanceReport } from 'playlist-data-engine';
import type { EncounterConfigUI, SimulationEstimateSnapshot, EstimateValidation } from '@/types/simulation';
import { BalanceScoreIndicator } from './BalanceScoreIndicator';
import { SimulationExportButton } from './SimulationExportButton';
import './ResultsSummary.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPercent(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
}

function getWinRateColorClass(winRate: number): string {
    if (winRate >= 0.8) return 'rs-win-rate-high';
    if (winRate >= 0.5) return 'rs-win-rate-medium';
    if (winRate >= 0.3) return 'rs-win-rate-low';
    return 'rs-win-rate-critical';
}

function getDifficultyIcon(variance: string): React.ReactNode {
    switch (variance) {
        case 'balanced':
            return <ShieldAlert size={14} />;
        case 'underpowered':
            return <Target size={14} />;
        case 'overpowered':
            return <Skull size={14} />;
        default:
            return null;
    }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ResultsSummaryProps {
    /** Simulation results to display */
    results: SimulationResults;
    /** Balance analysis report (may be null if analysis failed) */
    balanceReport: BalanceReport | null;
    /** How long the simulation took in milliseconds */
    durationMs: number | null;
    /** Whether the simulation was cancelled */
    isCancelled: boolean;
    /** Whether the simulation is saved */
    isSaved: boolean;
    /** Callback to save results */
    onSave?: () => void;
    /** Callback to reset results */
    onReset?: () => void;
    /** Encounter configuration (for export) */
    encounterConfig?: EncounterConfigUI | null;
    /** Pre-simulation estimate snapshot (for export) */
    estimateSnapshot?: SimulationEstimateSnapshot | null;
    /** Post-simulation validation (for export) */
    validation?: EstimateValidation | null;
    className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

function ResultsSummaryComponent({
    results,
    balanceReport,
    durationMs,
    isCancelled,
    isSaved,
    onSave,
    onReset,
    encounterConfig,
    estimateSnapshot,
    validation,
    className = '',
}: ResultsSummaryProps) {
    const { summary } = results;

    const winRatePercent = useMemo(
        () => formatPercent(summary.playerWinRate),
        [summary.playerWinRate],
    );

    const winRateTooltip = useMemo(() => {
        const pct = summary.playerWinRate * 100;
        if (pct >= 90) return 'Easy encounter — players win almost every time. Consider increasing enemy CR or count.';
        if (pct >= 70) return 'Medium encounter — challenging but survivable. Good for standard gameplay.';
        if (pct >= 50) return 'Hard encounter — risky fight with significant casualties expected.';
        if (pct >= 30) return 'Deadly encounter — players are likely to lose. High risk of total party wipe.';
        return 'Extremely deadly — players almost never win. Far beyond intended difficulty.';
    }, [summary.playerWinRate]);

    const winRateColorClass = useMemo(
        () => getWinRateColorClass(summary.playerWinRate),
        [summary.playerWinRate],
    );

    const formattedDuration = useMemo(
        () => {
            if (durationMs === null) return null;
            if (durationMs < 1000) return `${durationMs}ms`;
            if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)}s`;
            return `${Math.floor(durationMs / 60000)}m ${Math.round((durationMs % 60000) / 1000)}s`;
        },
        [durationMs],
    );

    const metrics = useMemo(() => [
        {
            icon: <Timer size={14} />,
            label: 'Avg Rounds',
            value: summary.averageRounds.toFixed(1),
            tooltip: 'Average number of combat rounds until the encounter resolves (win, loss, or draw)',
        },
        {
            icon: <Heart size={14} />,
            label: 'HP Remaining',
            value: `${summary.averagePlayerHPPercentRemaining.toFixed(1)}%`,
            tooltip: 'Average HP percentage remaining on surviving players at combat end',
        },
        {
            icon: <Skull size={14} />,
            label: 'Player Deaths',
            value: summary.totalPlayerDeaths.toLocaleString(),
            valueClass: summary.totalPlayerDeaths > 0 ? 'rs-metric-danger' : '',
            tooltip: 'Total number of player deaths across all simulation runs',
        },
        {
            icon: <Swords size={14} />,
            label: 'Enemy Deaths',
            value: summary.totalEnemyDeaths.toLocaleString(),
            valueClass: summary.totalEnemyDeaths > 0 ? 'rs-metric-success' : '',
            tooltip: 'Total number of enemy deaths across all simulation runs',
        },
        {
            icon: <Target size={14} />,
            label: 'Total Runs',
            value: summary.totalRuns.toLocaleString(),
            tooltip: 'Total number of combat simulations run. More runs = more reliable statistics',
        },
        ...(formattedDuration !== null ? [{
            icon: <Clock size={14} />,
            label: 'Duration',
            value: formattedDuration,
            tooltip: 'Wall-clock time the simulation took to complete',
        }] : []),
    ], [summary, formattedDuration]);

    return (
        <div className={`rs-results-summary ${className}`}>
            {/* Win Rate Card */}
            <div className={`rs-win-rate-card ${winRateColorClass}`} title={winRateTooltip}>
                <span className="rs-win-rate-value">{winRatePercent}</span>
                <span className="rs-win-rate-label">Player Win Rate</span>
            </div>

            {/* Key Metrics Grid */}
            <div className="rs-metrics-grid">
                {metrics.map((m) => (
                    <div key={m.label} className="rs-metric" title={m.tooltip}>
                        <span className="rs-metric-icon">{m.icon}</span>
                        <span className={`rs-metric-value ${m.valueClass ?? ''}`}>
                            {m.value}
                        </span>
                        <span className="rs-metric-label">{m.label}</span>
                    </div>
                ))}
            </div>

            {/* Difficulty Assessment */}
            {balanceReport && (
                <div className={`rs-balance-card rs-balance-${balanceReport.difficultyVariance}`} title={`Balance Score: ${balanceReport.balanceScore}/100 — ${balanceReport.confidence >= 0.95 ? 'High' : balanceReport.confidence >= 0.90 ? 'Moderate' : 'Low'} confidence based on ${balanceReport.totalRuns} runs`}>
                    <div className="rs-balance-header">
                        <div className="rs-balance-difficulty-row">
                            <span className="rs-balance-difficulty">
                                {getDifficultyIcon(balanceReport.difficultyVariance)}
                                {balanceReport.actualDifficulty}
                            </span>
                            <span className="rs-balance-intended">
                                intended: {balanceReport.intendedDifficulty}
                            </span>
                        </div>
                    </div>
                    <BalanceScoreIndicator report={balanceReport} />
                </div>
            )}

            {/* Cancelled Notice */}
            {isCancelled && (
                <div className="rs-cancelled-notice">
                    Simulation cancelled — showing partial results ({summary.totalRuns} runs completed)
                </div>
            )}

            {/* Action Buttons */}
            {(onSave || onReset) && (
                <div className="rs-results-actions">
                    {onSave && !isSaved && (
                        <button className="rs-action-btn rs-action-save" onClick={onSave} type="button">
                            Save Results
                        </button>
                    )}
                    {isSaved && (
                        <span className="rs-saved-indicator">Saved</span>
                    )}
                    {onReset && (
                        <button className="rs-action-btn rs-action-reset" onClick={onReset} type="button">
                            Reset
                        </button>
                    )}
                    <div className="rs-action-spacer" />
                    <SimulationExportButton
                        results={results}
                        balanceReport={balanceReport}
                        encounterConfig={encounterConfig}
                        estimateSnapshot={estimateSnapshot}
                        validation={validation}
                    />
                </div>
            )}
        </div>
    );
}

export const ResultsSummary = memo(ResultsSummaryComponent);
export default ResultsSummary;
