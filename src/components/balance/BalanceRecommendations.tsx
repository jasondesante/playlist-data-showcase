/**
 * Balance Recommendations Component (Task 8.3.4)
 *
 * Displays actionable balance recommendations from BalanceValidator.
 * Each recommendation shows: what to change, expected impact, confidence level.
 * Actionable recommendations have an "Apply" button that updates encounter config.
 */

import { useMemo, memo, useCallback } from 'react';
import {
    Lightbulb,
    TrendingUp,
    TrendingDown,
    ArrowRight,
    ShieldCheck,
} from 'lucide-react';
import type { BalanceRecommendation, DifficultyVariance } from 'playlist-data-engine';
import type { EncounterConfigUI } from '@/types/simulation';
import './BalanceRecommendations.css';

// ─── Recommendation Action Parsing ────────────────────────────────────────────

interface ConfigChange {
    /** Human-readable label for the apply button */
    label: string;
    /** Partial encounter config to apply */
    changes: Partial<EncounterConfigUI>;
}

/**
 * Parse a recommendation description into an actionable config change.
 * Returns null if the recommendation is not actionable via config changes.
 */
function parseRecommendationAction(
    description: string,
    currentConfig: EncounterConfigUI,
): ConfigChange | null {
    const desc = description.toLowerCase();

    // ── CR reductions ──
    const crReduceMatch = desc.match(/reduce enemy cr by (\d+)(?:-(\d+))?\s*(?:level|cr)?s?/);
    if (crReduceMatch) {
        const minReduction = parseInt(crReduceMatch[1]);
        const newCR = Math.max(0.125, currentConfig.cr - minReduction);
        // Snap to nearest standard CR value
        const snappedCR = snapToStandardCR(newCR);
        return {
            label: `CR ${currentConfig.cr} → ${snappedCR < 1 ? snappedCR : 'CR ' + snappedCR}`,
            changes: { cr: snappedCR },
        };
    }

    // ── CR increases ──
    const crIncreaseMatch = desc.match(/increase enemy cr by (\d+)(?:-(\d+))?\s*(?:level|cr)?s?/);
    if (crIncreaseMatch) {
        const minIncrease = parseInt(crIncreaseMatch[1]);
        const newCR = Math.min(30, currentConfig.cr + minIncrease);
        const snappedCR = snapToStandardCR(newCR);
        return {
            label: `CR ${currentConfig.cr} → ${snappedCR < 1 ? snappedCR : 'CR ' + snappedCR}`,
            changes: { cr: snappedCR },
        };
    }

    // ── Enemy count reductions ──
    const countReduceMatch = desc.match(/reduce enemy count by (\d+)/);
    if (countReduceMatch) {
        const reduction = parseInt(countReduceMatch[1]);
        const newCount = Math.max(1, currentConfig.enemyCount - reduction);
        return {
            label: `Count ${currentConfig.enemyCount} → ${newCount}`,
            changes: { enemyCount: newCount },
        };
    }

    // ── Enemy count additions ──
    const countAddMatch = desc.match(/add (\d+)(?:-(\d+))?\s*additional?\s*enem/);
    if (countAddMatch) {
        const addition = parseInt(countAddMatch[1]);
        const newCount = Math.min(10, currentConfig.enemyCount + addition);
        return {
            label: `Count ${currentConfig.enemyCount} → ${newCount}`,
            changes: { enemyCount: newCount },
        };
    }

    // ── Difficulty multiplier changes ──
    const diffMultMatch = desc.match(/(?:reduce|lower|decrease) difficulty multiplier by ([\d.]+)/);
    if (diffMultMatch) {
        const reduction = parseFloat(diffMultMatch[1]);
        const newMult = Math.max(0.1, Math.round((currentConfig.difficultyMultiplier - reduction) * 10) / 10);
        return {
            label: `Diff mult ${currentConfig.difficultyMultiplier} → ${newMult}`,
            changes: { difficultyMultiplier: newMult },
        };
    }

    const diffMultIncreaseMatch = desc.match(/(?:increase|raise) difficulty multiplier by ([\d.]+)/);
    if (diffMultIncreaseMatch) {
        const increase = parseFloat(diffMultIncreaseMatch[1]);
        const newMult = Math.min(5, Math.round((currentConfig.difficultyMultiplier + increase) * 10) / 10);
        return {
            label: `Diff mult ${currentConfig.difficultyMultiplier} → ${newMult}`,
            changes: { difficultyMultiplier: newMult },
        };
    }

    // Not actionable
    return null;
}

/** Snap a CR value to the nearest standard D&D CR step */
function snapToStandardCR(cr: number): number {
    const standardCRs = [0.125, 0.25, 0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30];
    if (cr <= 0.125) return 0.125;
    if (cr <= 0.375) return 0.25;
    if (cr <= 0.75) return 0.5;

    const rounded = Math.round(cr);
    if (standardCRs.includes(rounded) && Math.abs(rounded - cr) < 0.5) {
        return rounded;
    }
    // Find nearest
    let nearest = standardCRs[0];
    let minDist = Math.abs(cr - nearest);
    for (const scr of standardCRs) {
        const dist = Math.abs(cr - scr);
        if (dist < minDist) {
            minDist = dist;
            nearest = scr;
        }
    }
    return nearest;
}

// ─── Confidence Display ───────────────────────────────────────────────────────

function getConfidenceLabel(confidence: number): string {
    if (confidence >= 0.98) return 'Very High';
    if (confidence >= 0.95) return 'High';
    if (confidence >= 0.90) return 'Moderate';
    return 'Low';
}

function getConfidenceClass(confidence: number): string {
    if (confidence >= 0.95) return 'br-confidence-high';
    if (confidence >= 0.90) return 'br-confidence-medium';
    return 'br-confidence-low';
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BalanceRecommendationsProps {
    /** Recommendations from the balance report */
    recommendations: BalanceRecommendation[];
    /** Current encounter configuration (for computing apply deltas) */
    encounterConfig: EncounterConfigUI;
    /** Difficulty variance classification */
    variance: DifficultyVariance;
    /** Callback when user applies a recommendation */
    onApplySuggestion?: (changes: Partial<EncounterConfigUI>) => void;
    className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

function BalanceRecommendationsComponent({
    recommendations,
    encounterConfig,
    variance,
    onApplySuggestion,
    className = '',
}: BalanceRecommendationsProps) {
    const parsedActions = useMemo(
        () => recommendations.map((rec) => ({
            rec,
            action: parseRecommendationAction(rec.description, encounterConfig),
        })),
        [recommendations, encounterConfig],
    );

    const handleApply = useCallback(
        (changes: Partial<EncounterConfigUI>) => {
            onApplySuggestion?.(changes);
        },
        [onApplySuggestion],
    );

    if (recommendations.length === 0) {
        return null;
    }

    const hasActionable = parsedActions.some((p) => p.action !== null);

    return (
        <div className={`br-recommendations ${className}`}>
            <div className="br-header">
                <Lightbulb size={14} className="br-header-icon" />
                <span className="br-header-title">Recommendations</span>
                {hasActionable && onApplySuggestion && (
                    <span className="br-header-hint">Click Apply to update encounter config</span>
                )}
            </div>

            <div className="br-list">
                {parsedActions.map(({ rec, action }, index) => (
                    <div
                        key={index}
                        className={`br-item ${action ? 'br-item-actionable' : 'br-item-info'}`}
                    >
                        <div className="br-item-content">
                            {/* Description */}
                            <div className="br-item-description">{rec.description}</div>

                            {/* Meta row: impact + confidence */}
                            <div className="br-item-meta">
                                <span className="br-item-impact">
                                    {rec.expectedImpact.startsWith('-') || rec.expectedImpact.startsWith('+') ? (
                                        rec.expectedImpact.startsWith('+') ? (
                                            <TrendingUp size={11} />
                                        ) : (
                                            <TrendingDown size={11} />
                                        )
                                    ) : (
                                        <ShieldCheck size={11} />
                                    )}
                                    {rec.expectedImpact}
                                </span>
                                <span className={`br-item-confidence ${getConfidenceClass(rec.confidence)}`}>
                                    {getConfidenceLabel(rec.confidence)} ({(rec.confidence * 100).toFixed(0)}%)
                                </span>
                            </div>
                        </div>

                        {/* Apply button */}
                        {action && onApplySuggestion && (
                            <button
                                type="button"
                                className="br-apply-btn"
                                onClick={() => handleApply(action.changes)}
                                title={`Apply: ${action.label}`}
                            >
                                <ArrowRight size={12} />
                                <span>{action.label}</span>
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Variance context */}
            {variance === 'balanced' && (
                <div className="br-balanced-note">
                    <ShieldCheck size={12} />
                    <span>Encounter is within the target difficulty range</span>
                </div>
            )}
        </div>
    );
}

export const BalanceRecommendations = memo(BalanceRecommendationsComponent);
export default BalanceRecommendations;
