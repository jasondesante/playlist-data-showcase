import { memo } from 'react';
import type { SimulationResults, BalanceReport } from 'playlist-data-engine';
import { ResultsSummary } from './ResultsSummary';
import { PerCombatantMetrics } from './PerCombatantMetrics';
import { BalanceRecommendations } from './BalanceRecommendations';
import { SimulationLogViewer } from './SimulationLogViewer';
import {
    WinRateChart,
    DPRComparisonChart,
    HPRemainingDistribution,
    TurnDistributionChart,
    SurvivalRateChart,
    DamageDistributionChart,
} from './charts';
import type { EncounterConfigUI } from '@/types/simulation';
import './BalanceDashboard.css';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BalanceDashboardProps {
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
    /** Current encounter configuration (for recommendation apply deltas) */
    encounterConfig: EncounterConfigUI;
    /** Callback when user applies a recommendation */
    onApplySuggestion?: (changes: Partial<EncounterConfigUI>) => void;
    /** Additional CSS class */
    className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * BalanceDashboard
 *
 * Main results view that assembles all charts and metrics into a polished grid layout.
 *
 * Layout:
 *   Top:            Win rate + balance score + key metrics (large, prominent)
 *   Full width:     Win rate chart with difficulty reference lines
 *   Middle-left:    DPR comparison, survival rates
 *   Middle-right:   HP remaining distribution, turn distribution
 *   Full width:     Damage distribution (per-combatant selector)
 *   Bottom:         Recommendations, per-combatant metrics table
 *   Footer:         Simulation log viewer (collapsible)
 *
 * Responsive: stacks vertically on mobile.
 */
function BalanceDashboardComponent({
    results,
    balanceReport,
    durationMs,
    isCancelled,
    isSaved,
    onSave,
    onReset,
    encounterConfig,
    onApplySuggestion,
    className = '',
}: BalanceDashboardProps) {
    const hasCombatantMetrics = results.perCombatantMetrics.size > 0;
    const hasRecommendations = balanceReport !== null && balanceReport.recommendations.length > 0;

    return (
        <div className={`bd-dashboard ${className}`}>
            {/* ─── Top: Win Rate + Balance Score + Key Metrics ─── */}
            <div className="bd-top-section">
                <ResultsSummary
                    results={results}
                    balanceReport={balanceReport}
                    durationMs={durationMs}
                    isCancelled={isCancelled}
                    isSaved={isSaved}
                    onSave={onSave}
                    onReset={onReset}
                />
            </div>

            {/* ─── Win Rate Chart (full width) ─── */}
            <WinRateChart results={results} className="bd-chart-full" />

            {/* ─── Middle: Two-Column Chart Grid ─── */}
            <div className="bd-charts-grid">
                {/* Left Column */}
                <div className="bd-chart-column">
                    {hasCombatantMetrics && (
                        <DPRComparisonChart metrics={results.perCombatantMetrics} />
                    )}
                    {hasCombatantMetrics && (
                        <SurvivalRateChart metrics={results.perCombatantMetrics} />
                    )}
                </div>

                {/* Right Column */}
                <div className="bd-chart-column">
                    {hasCombatantMetrics && (
                        <HPRemainingDistribution metrics={results.perCombatantMetrics} />
                    )}
                    <TurnDistributionChart results={results} />
                </div>
            </div>

            {/* ─── Damage Distribution (full width) ─── */}
            {hasCombatantMetrics && (
                <DamageDistributionChart metrics={results.perCombatantMetrics} className="bd-chart-full" />
            )}

            {/* ─── Recommendations ─── */}
            {hasRecommendations && (
                <BalanceRecommendations
                    recommendations={balanceReport!.recommendations}
                    encounterConfig={encounterConfig}
                    variance={balanceReport!.difficultyVariance}
                    onApplySuggestion={onApplySuggestion}
                />
            )}

            {/* ─── Per-Combatant Metrics Table ─── */}
            {hasCombatantMetrics && (
                <PerCombatantMetrics metrics={results.perCombatantMetrics} />
            )}

            {/* ─── Simulation Log Viewer ─── */}
            <SimulationLogViewer results={results} />
        </div>
    );
}

export const BalanceDashboard = memo(BalanceDashboardComponent);
export default BalanceDashboard;
