import { useState, useCallback, memo } from 'react';
import type { SimulationResults, BalanceReport, CharacterSheet } from 'playlist-data-engine';
import { AttackResolver } from 'playlist-data-engine';
import { Lock, Unlock, Shuffle } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { ResultsSummary } from './ResultsSummary';
import { PerCombatantMetrics } from './PerCombatantMetrics';
import { BalanceRecommendations } from './BalanceRecommendations';
import {
    WinRateChart,
    DPRComparisonChart,
    HPRemainingDistribution,
    TurnDistributionChart,
    SurvivalRateChart,
    DamageDistributionChart,
    HitMissChart,
} from './charts';
import type { EncounterConfigUI, SimulationEstimateSnapshot, EstimateValidation } from '@/types/simulation';
import { DamageSpreadCalculator } from './DamageSpreadCalculator';
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
    /** Whether enemies were regenerated each run (changes enemy display) */
    enemyRegenPerRun?: boolean;
    /** Enemies the user has locked for reuse across simulations */
    lockedEnemies?: CharacterSheet[];
    /** Callback to toggle lock on an enemy by index in simEnemies */
    onToggleLockEnemy?: (index: number) => void;
    /** Player party characters (for damage spread calculator) */
    party?: CharacterSheet[] | null;
    /** Round range filter (shared with log viewer panel) */
    roundRangeFilter?: RoundRangeFilter | null;
    /** Callback when user clicks a turn distribution bucket */
    onBucketClick?: (rangeStart: number, rangeEnd: number, label: string) => void;
    /** Additional CSS class */
    className?: string;
}

/** Round range filter for log viewer — set by clicking histogram buckets */
export interface RoundRangeFilter {
    min: number;
    max: number;
    label: string;
}

// ─── Enemy Spectrum (regenerate per run) ──────────────────────────────────────

interface EnemySpectrumProps {
    enemyStats: Array<{ name: string; count: number; hpRange: { min: number; max: number; avg: number }; acRange: { min: number; max: number; avg: number }; crRange: { min: number; max: number; avg: number } }>;
    totalRuns: number;
}

function EnemySpectrum({ enemyStats, totalRuns }: EnemySpectrumProps) {
    const uniqueNames = enemyStats.length;
    const totalEncounters = enemyStats.reduce((sum, e) => sum + e.count, 0);

    return (
        <div className="bd-enemies-section bd-enemies-spectrum">
            <div className="bd-enemies-header">
                <Shuffle size={12} />
                Enemy Spectrum (regenerated each run)
            </div>
            <div className="bd-spectrum-summary">
                <span>{uniqueNames} unique enemy{uniqueNames !== 1 ? ' types' : ' type'}</span>
                <span className="bd-spectrum-sep">|</span>
                <span>{totalRuns.toLocaleString()} runs</span>
                <span className="bd-spectrum-sep">|</span>
                <span>{totalEncounters.toLocaleString()} total encounters</span>
            </div>
            <div className="bd-spectrum-slots">
                {enemyStats.map((e) => (
                    <div key={e.name} className="bd-spectrum-slot">
                        <div className="bd-spectrum-slot-header">
                            <span className="bd-spectrum-slot-name">{e.name}</span>
                            <span className="bd-spectrum-slot-count">×{e.count} runs ({(e.count / totalRuns * 100).toFixed(0)}%)</span>
                        </div>
                        <div className="bd-spectrum-slot-stats">
                            <div className="bd-spectrum-row">
                                <span className="bd-spectrum-label">HP</span>
                                <span className="bd-spectrum-value">{e.hpRange.min} – {e.hpRange.avg.toFixed(0)} – {e.hpRange.max}</span>
                            </div>
                            <div className="bd-spectrum-row">
                                <span className="bd-spectrum-label">AC</span>
                                <span className="bd-spectrum-value">{e.acRange.min} – {e.acRange.avg.toFixed(0)} – {e.acRange.max}</span>
                            </div>
                            <div className="bd-spectrum-row">
                                <span className="bd-spectrum-label">CR</span>
                                <span className="bd-spectrum-value">{e.crRange.min} – {e.crRange.avg.toFixed(1)} – {e.crRange.max}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
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
    enemyRegenPerRun = false,
    lockedEnemies = [],
    onToggleLockEnemy,
    party = null,
    roundRangeFilter,
    onBucketClick,
    className = '',
}: BalanceDashboardProps) {
    const { settings: appSettings } = useAppStore();
    const hasCombatantMetrics = results.perCombatantMetrics.size > 0;
    const hasRecommendations = balanceReport !== null && balanceReport.recommendations.length > 0;

    // ─── Interactive state: combatant highlighting ────────────────────────
    const [highlightedCombatantId, setHighlightedCombatantId] = useState<string | null>(null);

    const handleCombatantClick = useCallback((combatantId: string | null) => {
        setHighlightedCombatantId(prev => prev === combatantId ? null : combatantId);
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
                    simEnemies={simEnemies}
                    party={party}
                />
            </div>

            {/* ─── Enemies Fought ── */}
            {enemyRegenPerRun && hasCombatantMetrics ? (
                <EnemySpectrum
                    enemyStats={(results as any).enemyGenerationStats ?? []}
                    totalRuns={results.summary.totalRuns}
                />
            ) : simEnemies && simEnemies.length > 0 ? (
                <div className="bd-enemies-section">
                    <div className="bd-enemies-header">Enemies Fought</div>
                    <div className="bd-enemies-list">
                        {simEnemies.map((enemy, i) => {
                            const weapons = enemy.equipment?.weapons?.filter(w => w.equipped) ?? [];
                            const mainWeapon = weapons[0];
                            const spells = enemy.combat_spells ?? [];
                            const isLocked = lockedEnemies.some(e => e === enemy);
                            return (
                                <div key={i} className={`bd-enemy-card ${isLocked ? 'bd-enemy-card-locked' : ''}`}>
                                    <div className="bd-enemy-name">
                                        {enemy.name}
                                        {enemy.cr != null && <span className="bd-enemy-cr">CR {enemy.cr}</span>}
                                        {enemy.level != null && <span className="bd-enemy-level">Lv {enemy.level}</span>}
                                        {onToggleLockEnemy && (
                                            <button
                                                className={`bd-enemy-lock-btn ${isLocked ? 'bd-enemy-lock-btn-active' : ''}`}
                                                onClick={() => onToggleLockEnemy(i)}
                                                title={isLocked ? 'Unlock this enemy' : 'Lock this enemy for next simulation'}
                                                type="button"
                                            >
                                                {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                                            </button>
                                        )}
                                    </div>
                                    <div className="bd-enemy-stats">
                                        <span>HP {enemy.hp.max}</span>
                                        <span>AC {enemy.armor_class}</span>
                                        {mainWeapon && (
                                            <span>
                                                {mainWeapon.name}
                                                {mainWeapon.damage?.dice && (
                                                    <> ({mainWeapon.damage.damageType ? AttackResolver.formatWeaponDamage(mainWeapon.damage.dice, mainWeapon.damage.damageType, appSettings.damageDisplay) : mainWeapon.damage.dice})</>
                                                )}
                                            </span>
                                        )}
                                    </div>
                                    {spells.length > 0 && (
                                        <div className="bd-enemy-spells">
                                            Spells: {spells.map(s => s.name).join(', ')}
                                        </div>
                                    )}
                                    {party && (
                                        <DamageSpreadCalculator enemy={enemy} party={party} hitMode={appSettings.damageDisplay} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : null}

            {/* ─── Win Rate Chart (full width) ─── */}
            <WinRateChart results={results} className="bd-chart-full" />

            {/* ─── HP Remaining Distribution (full width) ─── */}
            {hasCombatantMetrics && (
                <HPRemainingDistribution metrics={results.perCombatantMetrics} className="bd-chart-full" />
            )}

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
                        <HitMissChart
                            metrics={results.perCombatantMetrics}
                            highlightedCombatantId={highlightedCombatantId}
                            onCombatantClick={handleCombatantClick}
                        />
                    )}
                    <TurnDistributionChart
                        results={results}
                        selectedRoundRange={roundRangeFilter}
                        onBucketClick={onBucketClick}
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
        </div>
    );
}

export const BalanceDashboard = memo(BalanceDashboardComponent);
export default BalanceDashboard;
