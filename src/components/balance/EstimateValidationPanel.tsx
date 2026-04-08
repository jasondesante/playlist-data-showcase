/**
 * EstimateValidationPanel Component (Task 3.2)
 *
 * Collapsible panel displayed below BalanceDashboard in the Balance Lab results area.
 * Compares pre-simulation estimates against actual simulation results and displays
 * actionable code suggestions for significant discrepancies.
 *
 * Features:
 * - Comparison table with color-coded delta cells
 * - Difficulty tier comparison row
 * - Code suggestions for significant discrepancies (|delta%| > 10% or tierDelta >= 1)
 * - Collapsible to avoid cluttering the results view
 * - Code references rendered as plain text (developer tool, not clickable)
 */

import { useState, memo, useMemo } from 'react';
import {
    GitCompareArrows,
    ChevronDown,
    ChevronRight,
    AlertTriangle,
    Info,
    XCircle,
    FileCode,
    Wrench,
    ArrowUp,
    ArrowDown,
    Minus,
} from 'lucide-react';
import type { BalanceReport } from 'playlist-data-engine';
import type { EstimateValidation } from '@/types/simulation';
import { BalanceScoreIndicator } from './BalanceScoreIndicator';
import './EstimateValidationPanel.css';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface EstimateValidationPanelProps {
    /** Validation data comparing estimates vs actuals. Null if not yet computed. */
    validation: EstimateValidation | null;
    /** Balance report containing the score gauge. Null if analysis failed. */
    balanceReport?: BalanceReport | null;
    /** True when results exist but no pre-simulation estimate snapshot is available
     *  (e.g., simulation loaded from history). Shows a notice instead of hiding. */
    hasResultsWithoutEstimate?: boolean;
    /** Additional CSS class */
    className?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

/** Get the color tier for a delta percentage */
function getDeltaTier(deltaPercent: number): 'good' | 'warning' | 'error' {
    const abs = Math.abs(deltaPercent);
    if (abs < 5) return 'good';
    if (abs <= 15) return 'warning';
    return 'error';
}

/** Format delta as signed string with percentage */
function formatDelta(delta: number, deltaPercent: number): string {
    const sign = delta >= 0 ? '+' : '';
    return `${sign}${delta.toFixed(1)} (${sign}${deltaPercent.toFixed(0)}%)`;
}

/** Format win rate delta as percentage points */
function formatWinRateDelta(delta: number, deltaPercent: number): string {
    const sign = delta >= 0 ? '+' : '';
    return `${sign}${deltaPercent.toFixed(0)}pp`;
}

/** Format difficulty delta as tier offset */
function formatTierDelta(tierDelta: number): string {
    if (tierDelta === 0) return 'Exact';
    const sign = tierDelta > 0 ? '+' : '';
    return `${sign}${tierDelta} tier${tierDelta !== 1 ? 's' : ''}`;
}

/** Get status label and direction */
function getStatus(deltaPercent: number): { label: string; direction: 'over' | 'under' | 'ok' } {
    const abs = Math.abs(deltaPercent);
    if (abs < 5) return { label: 'OK', direction: 'ok' };
    if (deltaPercent < 0) return { label: 'Over', direction: 'over' };
    return { label: 'Under', direction: 'under' };
}

/** Capitalize difficulty string */
function capitalizeDifficulty(d: string): string {
    return d.charAt(0).toUpperCase() + d.slice(1);
}

/** Get severity icon for suggestions */
function SeverityIcon({ severity }: { severity: 'info' | 'warning' | 'error' }) {
    switch (severity) {
        case 'info':
            return <Info size={13} className="evp-suggestion-icon evp-suggestion-icon-info" />;
        case 'warning':
            return <AlertTriangle size={13} className="evp-suggestion-icon evp-suggestion-icon-warning" />;
        case 'error':
            return <XCircle size={13} className="evp-suggestion-icon evp-suggestion-icon-error" />;
    }
}

// ─── Component ──────────────────────────────────────────────────────────────────

function EstimateValidationPanelComponent({
    validation,
    balanceReport,
    hasResultsWithoutEstimate = false,
    className = '',
}: EstimateValidationPanelProps) {
    const [collapsed, setCollapsed] = useState(false);

    // Count significant discrepancies for the badge
    const significantCount = useMemo(() => {
        if (!validation) return 0;
        const comparisonSignificant = validation.comparisons.filter((c) => c.isSignificant).length;
        const difficultySignificant = validation.difficultyComparison.tierDelta >= 1 ? 1 : 0;
        return comparisonSignificant + difficultySignificant;
    }, [validation]);

    // Don't render if nothing to show at all
    if (!validation && !hasResultsWithoutEstimate) return null;

    // When results exist but no estimate snapshot (e.g., loaded from history)
    if (hasResultsWithoutEstimate && !validation) {
        return (
            <div className={`evp-container ${className}`}>
                <button
                    className="evp-panel-header"
                    onClick={() => setCollapsed(!collapsed)}
                    aria-expanded={!collapsed}
                >
                    <div className="evp-panel-title-row">
                        <GitCompareArrows size={16} className="evp-panel-icon" />
                        <span className="evp-panel-title">Estimate Validation</span>
                        <span className="evp-badge evp-badge-warning">No estimate</span>
                    </div>
                    <span className="evp-panel-toggle">
                        {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    </span>
                </button>

                {!collapsed && (
                    <div className="evp-content">
                        <div className="evp-no-estimate">
                            <Info size={14} className="evp-no-estimate-icon" />
                            <span className="evp-no-estimate-text">
                                No pre-simulation estimate available for comparison.
                            </span>
                            <span className="evp-no-estimate-hint">
                                Estimates are captured when a simulation is run. Historical simulations loaded from storage do not include estimate snapshots.
                            </span>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    const { comparisons, difficultyComparison, suggestions } = validation!;

    return (
        <div className={`evp-container ${className}`}>
            {/* ─── Collapsible Header ─── */}
            <button
                className="evp-panel-header"
                onClick={() => setCollapsed(!collapsed)}
                aria-expanded={!collapsed}
            >
                <div className="evp-panel-title-row">
                    <GitCompareArrows size={16} className="evp-panel-icon" />
                    <span className="evp-panel-title">Estimate Validation</span>
                    {significantCount > 0 && (
                        <span className="evp-badge evp-badge-warning">
                            {significantCount} discrepancy{significantCount !== 1 ? 'ies' : 'y'}
                        </span>
                    )}
                    {significantCount === 0 && (
                        <span className="evp-badge evp-badge-ok">All OK</span>
                    )}
                </div>
                <span className="evp-panel-toggle">
                    {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                </span>
            </button>

            {!collapsed && (
                <div className="evp-content">
                    {/* ─── Prediction Accuracy Gauge ─── */}
                    {balanceReport && (
                        <div className="evp-gauge-section">
                            <BalanceScoreIndicator report={balanceReport} />
                            <div className="evp-difficulty-text">
                                <span className="evp-difficulty-actual">{balanceReport.actualDifficulty}</span>
                                <span className="evp-difficulty-intended">intended: {balanceReport.intendedDifficulty}</span>
                            </div>
                        </div>
                    )}

                    {/* ─── Comparison Table ─── */}
                    <div className="evp-table-wrapper">
                        <table className="evp-table">
                            <thead>
                                <tr>
                                    <th className="evp-th-metric">Metric</th>
                                    <th className="evp-th-value">Est.</th>
                                    <th className="evp-th-value">Actual</th>
                                    <th className="evp-th-delta">Delta</th>
                                    <th className="evp-th-status">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {comparisons.map((comp) => {
                                    const tier = getDeltaTier(comp.deltaPercent);
                                    const status = getStatus(comp.deltaPercent);
                                    const isWinRate = comp.label === 'Win Rate';
                                    const deltaStr = isWinRate
                                        ? formatWinRateDelta(comp.delta, comp.deltaPercent)
                                        : formatDelta(comp.delta, comp.deltaPercent);

                                    return (
                                        <tr key={comp.label} className={`evp-row evp-row-${tier}`}>
                                            <td className="evp-td-metric">{comp.label}</td>
                                            <td className="evp-td-value">
                                                {isWinRate ? `${comp.estimated.toFixed(0)}%` : comp.estimated.toFixed(1)}
                                            </td>
                                            <td className="evp-td-value">
                                                {isWinRate ? `${comp.actual.toFixed(0)}%` : comp.actual.toFixed(1)}
                                            </td>
                                            <td className={`evp-td-delta evp-delta-${tier}`}>
                                                <span className="evp-delta-icon">
                                                    {comp.delta > 0 ? (
                                                        <ArrowUp size={11} />
                                                    ) : comp.delta < 0 ? (
                                                        <ArrowDown size={11} />
                                                    ) : (
                                                        <Minus size={11} />
                                                    )}
                                                </span>
                                                {deltaStr}
                                            </td>
                                            <td className={`evp-td-status evp-status-${status.direction}`}>
                                                {status.direction === 'ok' ? (
                                                    <span className="evp-status-badge evp-status-ok">OK</span>
                                                ) : (
                                                    <span className="evp-status-badge evp-status-warn">
                                                        <AlertTriangle size={10} />
                                                        {status.label}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}

                                {/* Difficulty row */}
                                <tr className={`evp-row evp-row-${difficultyComparison.tierDelta >= 1 ? 'error' : 'good'}`}>
                                    <td className="evp-td-metric">Difficulty</td>
                                    <td className="evp-td-value">{capitalizeDifficulty(difficultyComparison.predicted)}</td>
                                    <td className="evp-td-value">{capitalizeDifficulty(difficultyComparison.actual)}</td>
                                    <td className={`evp-td-delta evp-delta-${difficultyComparison.tierDelta >= 1 ? 'error' : 'good'}`}>
                                        {formatTierDelta(difficultyComparison.tierDelta)}
                                    </td>
                                    <td className={`evp-td-status evp-status-${difficultyComparison.tierDelta === 0 ? 'ok' : 'warn'}`}>
                                        {difficultyComparison.tierDelta === 0 ? (
                                            <span className="evp-status-badge evp-status-ok">OK</span>
                                        ) : (
                                            <span className="evp-status-badge evp-status-warn">
                                                <AlertTriangle size={10} />
                                                {difficultyComparison.tierDelta > 0 ? 'Harder' : 'Easier'}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* ─── Suggestions ─── */}
                    {suggestions.length > 0 && (
                        <div className="evp-suggestions">
                            <div className="evp-suggestions-header">
                                <Wrench size={13} className="evp-suggestions-header-icon" />
                                <span className="evp-suggestions-title">Suggestions</span>
                                <span className="evp-suggestions-count">{suggestions.length}</span>
                            </div>

                            <div className="evp-suggestion-list">
                                {suggestions.map((suggestion, index) => (
                                    <div
                                        key={`${suggestion.metric}-${index}`}
                                        className={`evp-suggestion evp-suggestion-${suggestion.severity}`}
                                    >
                                        <div className="evp-suggestion-top">
                                            <SeverityIcon severity={suggestion.severity} />
                                            <span className="evp-suggestion-message">{suggestion.message}</span>
                                        </div>

                                        <div className="evp-suggestion-details">
                                            <div className="evp-suggestion-ref">
                                                <FileCode size={12} className="evp-suggestion-ref-icon" />
                                                <span className="evp-suggestion-ref-text">
                                                    {suggestion.codeReference.file}
                                                </span>
                                                <span className="evp-suggestion-func">
                                                    {suggestion.codeReference.function}
                                                    {suggestion.codeReference.line != null &&
                                                        ` (line ${suggestion.codeReference.line})`}
                                                </span>
                                            </div>
                                            <div className="evp-suggestion-fix">
                                                <span className="evp-suggestion-fix-label">Fix:</span>{' '}
                                                <span className="evp-suggestion-fix-text">
                                                    {suggestion.suggestedFix}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ─── No suggestions note ─── */}
                    {suggestions.length === 0 && significantCount === 0 && (
                        <div className="evp-all-good-note">
                            All estimates are within acceptable range. No code adjustments needed.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export const EstimateValidationPanel = memo(EstimateValidationPanelComponent);
export default EstimateValidationPanel;
