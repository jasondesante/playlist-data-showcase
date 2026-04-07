import { useCallback } from 'react';
import {
    GitCompareArrows,
    X,
    ArrowUp,
    ArrowDown,
    Minus,
    Play,
    Loader2,
    AlertCircle,
    BarChart3,
    Users,
    Swords,
    Skull,
    Clock,
    Target,
    Info,
} from 'lucide-react';
import { useSimulationComparison } from '@/hooks/useSimulationComparison';
import { ComparisonOverlayChart } from '@/components/balance/charts';
import type { SavedSimulation } from '@/store/simulationStore';
import './ComparisonPanel.css';

export interface ComparisonPanelProps {
    className?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPercent(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
}

function formatNumber(value: number, decimals = 1): string {
    return value.toFixed(decimals);
}

function formatDelta(value: number, isPercent = false): string {
    const prefix = value > 0 ? '+' : '';
    return `${prefix}${isPercent ? formatPercent(value) : formatNumber(value)}`;
}

function getDeltaIcon(delta: number): typeof ArrowUp | typeof ArrowDown | typeof Minus {
    if (Math.abs(delta) < 0.001) return Minus;
    return delta > 0 ? ArrowUp : ArrowDown;
}

function getDeltaClass(delta: number): string {
    if (Math.abs(delta) < 0.001) return 'comparison-delta-neutral';
    return delta > 0 ? 'comparison-delta-positive' : 'comparison-delta-negative';
}

function getRelativeTime(timestamp: string): string {
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return diffDays === 1 ? 'Yesterday' : `${diffDays}d ago`;
    return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getWinRateColor(winRate: number): string {
    if (winRate >= 0.8) return 'comparison-win-rate-high';
    if (winRate >= 0.5) return 'comparison-win-rate-medium';
    if (winRate >= 0.3) return 'comparison-win-rate-low';
    return 'comparison-win-rate-critical';
}

// ─── Slot Display ─────────────────────────────────────────────────────────────

interface SlotDisplayProps {
    slot: 'A' | 'B';
    simulation: SavedSimulation | undefined;
    assignedId: string | null;
    onAssign: (slot: 'A' | 'B', id: string | null) => void;
    otherSlotAssigned: boolean;
}

function SlotDisplay({ slot, simulation, assignedId, onAssign, otherSlotAssigned }: SlotDisplayProps) {
    if (!simulation) {
        return (
            <div className={`comparison-slot comparison-slot-empty comparison-slot-${slot.toLowerCase()}`}>
                <div className="comparison-slot-label">
                    <span className="comparison-slot-letter">{slot}</span>
                    <span className="comparison-slot-hint">
                        {otherSlotAssigned ? 'Select a simulation' : 'Pick first simulation'}
                    </span>
                </div>
                {assignedId && (
                    <p className="comparison-slot-missing">Simulation no longer exists</p>
                )}
            </div>
        );
    }

    const { results, config, party, encounter, timestamp, label } = simulation;
    const summary = results.summary;

    const displayLabel = label ||
        `${party.memberNames.join(', ')} vs ${encounter.enemySheets.length} enem${encounter.enemySheets.length !== 1 ? 'ies' : 'y'}`;

    return (
        <div className={`comparison-slot comparison-slot-filled comparison-slot-${slot.toLowerCase()}`}>
            <div className="comparison-slot-header">
                <span className="comparison-slot-letter">{slot}</span>
                <span className="comparison-slot-title" title={displayLabel}>{displayLabel}</span>
                <button
                    className="comparison-slot-remove"
                    onClick={() => onAssign(slot, null)}
                    title={`Remove from slot ${slot}`}
                    type="button"
                >
                    <X size={14} />
                </button>
            </div>

            <div className="comparison-slot-stats">
                <div className="comparison-slot-stat">
                    <span className="comparison-slot-stat-label">Win Rate</span>
                    <span className={`comparison-slot-stat-value comparison-slot-win-rate ${getWinRateColor(summary.playerWinRate)}`}>
                        <Target size={12} />
                        {formatPercent(summary.playerWinRate)}
                    </span>
                </div>
                <div className="comparison-slot-stat">
                    <span className="comparison-slot-stat-label">Avg Rounds</span>
                    <span className="comparison-slot-stat-value">
                        {formatNumber(summary.averageRounds)}
                    </span>
                </div>
                <div className="comparison-slot-stat">
                    <span className="comparison-slot-stat-label">HP Remaining</span>
                    <span className="comparison-slot-stat-value">
                        {formatPercent(summary.averagePlayerHPPercentRemaining)}
                    </span>
                </div>
                <div className="comparison-slot-stat">
                    <span className="comparison-slot-stat-label">Player Deaths</span>
                    <span className="comparison-slot-stat-value comparison-slot-deaths">
                        <Skull size={12} />
                        {summary.totalPlayerDeaths}
                    </span>
                </div>
            </div>

            <div className="comparison-slot-meta">
                <span><Users size={10} /> {party.memberNames.length}v{encounter.enemySheets.length}</span>
                <span><Swords size={10} /> {config.runCount} runs</span>
                <span><Clock size={10} /> {getRelativeTime(timestamp)}</span>
            </div>
        </div>
    );
}

// ─── Delta Row ────────────────────────────────────────────────────────────────

interface DeltaRowProps {
    label: string;
    valueA: string;
    valueB: string;
    delta: number;
    isPercent?: boolean;
    invertColor?: boolean;
    /** If true, lower is better for players (e.g., deaths) */
    lowerIsBetter?: boolean;
}

function DeltaRow({ label, valueA, valueB, delta, isPercent = false, invertColor = false, lowerIsBetter = false }: DeltaRowProps) {
    const Icon = getDeltaIcon(delta);

    // For deaths: positive delta = more deaths in A = worse for A
    // We want to show "positive" (green) when A has fewer deaths
    const effectiveDelta = lowerIsBetter ? -delta : delta;
    const effectiveColor = invertColor ? getDeltaClass(-delta) : getDeltaClass(effectiveDelta);

    return (
        <div className="comparison-delta-row">
            <span className="comparison-delta-label">{label}</span>
            <span className="comparison-delta-value">{valueA}</span>
            <span className={`comparison-delta-arrow ${effectiveColor}`}>
                <Icon size={14} />
                <span className="comparison-delta-change">{formatDelta(delta, isPercent)}</span>
            </span>
            <span className="comparison-delta-value">{valueB}</span>
        </div>
    );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function ComparisonPanel({ className = '' }: ComparisonPanelProps) {
    const {
        status,
        comparisonResult,
        progress,
        error,
        slotAId,
        slotBId,
        slotA,
        slotB,
        quickDeltas,
        assignSlot,
        clearComparison,
        runAnalysis,
        cancelAnalysis,
    } = useSimulationComparison();

    const hasBothSlots = slotAId !== null && slotBId !== null;

    const handleRunAnalysis = useCallback(() => {
        runAnalysis();
    }, [runAnalysis]);

    const handleCancel = useCallback(() => {
        cancelAnalysis();
    }, [cancelAnalysis]);

    // Determine which deltas to show
    const deltas = comparisonResult
        ? comparisonResult.deltas
        : quickDeltas;

    const summaryA = slotA?.results.summary;
    const summaryB = slotB?.results.summary;

    return (
        <div className={`comparison-panel ${className}`}>
            {/* Header */}
            <div className="comparison-panel-header">
                <div className="comparison-panel-title-row">
                    <GitCompareArrows className="comparison-panel-icon" size={18} />
                    <h3 className="comparison-panel-title">Comparison</h3>
                    {hasBothSlots && (
                        <span className="comparison-panel-badge">2 selected</span>
                    )}
                </div>
                {(status !== 'idle') && (
                    <button
                        className="comparison-panel-clear-btn"
                        onClick={clearComparison}
                        title="Clear comparison"
                        type="button"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Slots */}
            <div className="comparison-slots">
                <SlotDisplay
                    slot="A"
                    simulation={slotA}
                    assignedId={slotAId}
                    onAssign={assignSlot}
                    otherSlotAssigned={slotBId !== null}
                />
                <div className="comparison-slots-divider">
                    <span>vs</span>
                </div>
                <SlotDisplay
                    slot="B"
                    simulation={slotB}
                    assignedId={slotBId}
                    onAssign={assignSlot}
                    otherSlotAssigned={slotAId !== null}
                />
            </div>

            {/* Delta Metrics (visible when both slots filled) */}
            {hasBothSlots && deltas && summaryA && summaryB && (
                <div className="comparison-deltas">
                    <div className="comparison-deltas-header">
                        <BarChart3 size={14} />
                        <span>Difference (A vs B)</span>
                        {comparisonResult && comparisonResult.winRateSignificance.isSignificant && (
                            <span className="comparison-significant-badge" title={`p = ${comparisonResult.winRateSignificance.pValue.toFixed(4)}`}>
                                Statistically significant
                            </span>
                        )}
                    </div>
                    <div className="comparison-deltas-body">
                        <DeltaRow
                            label="Win Rate"
                            valueA={formatPercent(summaryA.playerWinRate)}
                            valueB={formatPercent(summaryB.playerWinRate)}
                            delta={deltas.winRateDelta}
                            isPercent
                        />
                        <DeltaRow
                            label="Avg Rounds"
                            valueA={formatNumber(summaryA.averageRounds)}
                            valueB={formatNumber(summaryB.averageRounds)}
                            delta={deltas.averageRoundsDelta}
                        />
                        <DeltaRow
                            label="Median Rounds"
                            valueA={formatNumber(summaryA.medianRounds)}
                            valueB={formatNumber(summaryB.medianRounds)}
                            delta={deltas.medianRoundsDelta}
                        />
                        <DeltaRow
                            label="HP Remaining"
                            valueA={formatPercent(summaryA.averagePlayerHPPercentRemaining)}
                            valueB={formatPercent(summaryB.averagePlayerHPPercentRemaining)}
                            delta={deltas.averageHPRemainingDelta}
                            isPercent
                        />
                        <DeltaRow
                            label="Player Deaths"
                            valueA={String(summaryA.totalPlayerDeaths)}
                            valueB={String(summaryB.totalPlayerDeaths)}
                            delta={deltas.totalPlayerDeathsDelta}
                            lowerIsBetter
                        />
                        <DeltaRow
                            label="Enemy Deaths"
                            valueA={String(summaryA.totalEnemyDeaths)}
                            valueB={String(summaryB.totalEnemyDeaths)}
                            delta={deltas.totalEnemyDeathsDelta}
                        />
                    </div>

                    {/* Quick deltas disclaimer */}
                    {!comparisonResult && (
                        <div className="comparison-deltas-note">
                            <Info size={12} />
                            <span>Quick comparison from saved results. Different seeds may affect comparability.</span>
                        </div>
                    )}
                </div>
            )}

            {/* Run Analysis Button */}
            {hasBothSlots && !comparisonResult && status !== 'running' && (
                <div className="comparison-actions">
                    <button
                        className="comparison-run-btn"
                        onClick={handleRunAnalysis}
                        type="button"
                    >
                        <Play size={14} />
                        Run Statistical Analysis
                    </button>
                    <p className="comparison-run-hint">
                        Re-simulates both encounters with identical seeds for fair comparison
                    </p>
                </div>
            )}

            {/* Running State */}
            {status === 'running' && (
                <div className="comparison-running">
                    <Loader2 size={20} className="comparison-running-spinner" />
                    <span className="comparison-running-text">
                        Analyzing{progress.currentSide ? ` ${progress.currentSide}` : ''}...
                    </span>
                    {progress.total > 0 && (
                        <div className="comparison-progress-bar">
                            <div
                                className="comparison-progress-fill"
                                style={{ width: `${progress.fraction * 100}%` }}
                            />
                        </div>
                    )}
                    <button
                        className="comparison-cancel-btn"
                        onClick={handleCancel}
                        type="button"
                    >
                        Cancel
                    </button>
                </div>
            )}

            {/* Significance Result */}
            {comparisonResult && (
                <div className="comparison-significance">
                    <div className={`comparison-significance-card ${comparisonResult.winRateSignificance.isSignificant ? 'comparison-significance-yes' : 'comparison-significance-no'}`}>
                        <span className="comparison-significance-label">
                            {comparisonResult.winRateSignificance.isSignificant ? 'Significant Difference' : 'Not Significant'}
                        </span>
                        <span className="comparison-significance-p">
                            p = {comparisonResult.winRateSignificance.pValue.toFixed(4)}
                        </span>
                        <span className="comparison-significance-interpretation">
                            {comparisonResult.winRateSignificance.interpretation}
                        </span>
                    </div>
                </div>
            )}

            {/* Per-Combatant Overlay Chart — show when both slots have results */}
            {hasBothSlots && slotA && slotB && slotA.results.perCombatantMetrics.size > 0 && slotB.results.perCombatantMetrics.size > 0 && (
                <div className="comparison-chart-section">
                    <ComparisonOverlayChart
                        resultsA={slotA.results}
                        resultsB={slotB.results}
                        labelA={slotA.label ?? comparisonResult?.labelA ?? 'Config A'}
                        labelB={slotB.label ?? comparisonResult?.labelB ?? 'Config B'}
                    />
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="comparison-error">
                    <AlertCircle size={14} />
                    <span>{error.message}</span>
                </div>
            )}

            {/* Empty State */}
            {!hasBothSlots && (
                <div className="comparison-empty">
                    <GitCompareArrows size={24} className="comparison-empty-icon" />
                    <p className="comparison-empty-text">
                        Select two saved simulations to compare
                    </p>
                    <p className="comparison-empty-hint">
                        Use the compare button on saved simulation items below
                    </p>
                </div>
            )}
        </div>
    );
}

export default ComparisonPanel;
