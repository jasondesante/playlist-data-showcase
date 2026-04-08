import { useState, useCallback, memo } from 'react';
import type { SimulationResults, BalanceReport, CharacterSheet } from 'playlist-data-engine';
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
import type { EncounterConfigUI, SimulationEstimateSnapshot, EstimateValidation } from '@/types/simulation';
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
    /** Pre-simulation estimate snapshot (for export) */
    estimateSnapshot?: SimulationEstimateSnapshot | null;
    /** Post-simulation validation (for export) */
    validation?: EstimateValidation | null;
    /** Actual enemies used in the simulation (null when regenerate per run is on) */
    simEnemies?: CharacterSheet[] | null;
    /** Additional CSS class */
    className?: string;
}

/** Round range filter for log viewer — set by clicking histogram buckets */
export interface RoundRangeFilter {
    min: number;
    max: number;
    label: string;
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
    estimateSnapshot,
    validation,
    simEnemies,
    className = '',
}: BalanceDashboardProps) {
    const hasCombatantMetrics = results.perCombatantMetrics.size > 0;
    const hasRecommendations = balanceReport !== null && balanceReport.recommendations.length > 0;

    // ─── Interactive state: combatant highlighting ────────────────────────
    const [highlightedCombatantId, setHighlightedCombatantId] = useState<string | null>(null);

    const handleCombatantClick = useCallback((combatantId: string | null) => {
        setHighlightedCombatantId(prev => prev === combatantId ? null : combatantId);
    }, []);

    // ─── Interactive state: round range filtering ─────────────────────────
    const [roundRangeFilter, setRoundRangeFilter] = useState<RoundRangeFilter | null>(null);

    const handleBucketClick = useCallback((rangeStart: number, rangeEnd: number, label: string) => {
        setRoundRangeFilter(prev => {
            if (prev && prev.min === rangeStart && prev.max === rangeEnd) {
                return null; // toggle off
            }
            return { min: rangeStart, max: rangeEnd, label };
        });
    }, []);

    const handleClearRoundFilter = useCallback(() => {
        setRoundRangeFilter(null);
    }, []);

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
                    encounterConfig={encounterConfig}
                    estimateSnapshot={estimateSnapshot}
                    validation={validation}
                />
            </div>

            {/* ─── Enemies Fought ── */}
            {simEnemies && simEnemies.length > 0 && (
                <div className="bd-enemies-section">
                    <div className="bd-enemies-header">Enemies Fought</div>
                    <div className="bd-enemies-list">
                        {simEnemies.map((enemy, i) => {
                            const weapons = enemy.equipment?.weapons?.filter(w => w.equipped) ?? [];
                            const mainWeapon = weapons[0];
                            const spells = enemy.combat_spells ?? [];
                            return (
                                <div key={i} className="bd-enemy-card">
                                    <div className="bd-enemy-name">
                                        {enemy.name}
                                        {enemy.cr != null && <span className="bd-enemy-cr">CR {enemy.cr}</span>}
                                        {enemy.level != null && <span className="bd-enemy-level">Lv {enemy.level}</span>}
                                    </div>
                                    <div className="bd-enemy-stats">
                                        <span>HP {enemy.hp.max}</span>
                                        <span>AC {enemy.armor_class}</span>
                                        {mainWeapon && <span>{mainWeapon.name ?? mainWeapon.damage?.dice ?? 'Weapon'}</span>}
                                    </div>
                                    {spells.length > 0 && (
                                        <div className="bd-enemy-spells">
                                            Spells: {spells.map(s => s.name).join(', ')}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ─── Win Rate Chart (full width) ─── */}
            <WinRateChart results={results} className="bd-chart-full" />

            {/* ─── Middle: Two-Column Chart Grid ─── */}
            <div className="bd-charts-grid">
                {/* Left Column */}
                <div className="bd-chart-column">
                    {hasCombatantMetrics && (
                        <DPRComparisonChart
                            metrics={results.perCombatantMetrics}
                            highlightedCombatantId={highlightedCombatantId}
                            onCombatantClick={handleCombatantClick}
                        />
                    )}
                    {hasCombatantMetrics && (
                        <SurvivalRateChart
                            metrics={results.perCombatantMetrics}
                            highlightedCombatantId={highlightedCombatantId}
                            onCombatantClick={handleCombatantClick}
                        />
                    )}
                </div>

                {/* Right Column */}
                <div className="bd-chart-column">
                    {hasCombatantMetrics && (
                        <HPRemainingDistribution metrics={results.perCombatantMetrics} />
                    )}
                    <TurnDistributionChart
                        results={results}
                        selectedRoundRange={roundRangeFilter}
                        onBucketClick={handleBucketClick}
                    />
                </div>
            </div>

            {/* ─── Damage Distribution (full width) ─── */}
            {hasCombatantMetrics && (
                <DamageDistributionChart
                    metrics={results.perCombatantMetrics}
                    highlightedCombatantId={highlightedCombatantId}
                    className="bd-chart-full"
                />
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
                <PerCombatantMetrics
                    metrics={results.perCombatantMetrics}
                    highlightedCombatantId={highlightedCombatantId}
                    onCombatantClick={handleCombatantClick}
                />
            )}

            {/* ─── Simulation Log Viewer ─── */}
            <SimulationLogViewer
                results={results}
                roundRangeFilter={roundRangeFilter}
                onClearRoundFilter={handleClearRoundFilter}
            />
        </div>
    );
}

export const BalanceDashboard = memo(BalanceDashboardComponent);
export default BalanceDashboard;
