/**
 * PredictedDifficultyBar Component (Task 2.3)
 *
 * Visual difficulty prediction bar displayed below both estimate cards,
 * above the simulation settings in SimulationConfigPanel.
 *
 * Shows a segmented bar with Easy/Medium/Hard/Deadly zones, a marker
 * indicating where the encounter falls, and the XP ratio + estimated
 * win rate. Only renders when both party and enemy estimates are available.
 */

import type { SimulationEstimateSnapshot, EncounterDifficulty } from '@/types/simulation';
import { Target } from 'lucide-react';
import './PredictedDifficultyBar.css';

/** Difficulty tier metadata for the bar segments */
const DIFFICULTY_TIERS: Array<{
    key: EncounterDifficulty;
    label: string;
    color: string;
}> = [
    { key: 'easy', label: 'Easy', color: 'hsl(142 76% 46%)' },
    { key: 'medium', label: 'Medium', color: 'hsl(48 96% 53%)' },
    { key: 'hard', label: 'Hard', color: 'hsl(25 95% 53%)' },
    { key: 'deadly', label: 'Deadly', color: 'hsl(0 84% 60%)' },
];

/**
 * Compute the marker position (0–100%) along the bar.
 *
 * The bar spans from 0 (easy threshold) to the deadly threshold.
 * Position is interpolated based on where the encounter XP falls
 * relative to the easy and deadly thresholds.
 */
function computeMarkerPosition(
    totalAdjustedXP: number,
    easyXP: number,
    deadlyXP: number,
): number {
    if (deadlyXP <= easyXP) return 50;
    const ratio = (totalAdjustedXP - easyXP) / (deadlyXP - easyXP);
    // Clamp between 0% and 100%
    return Math.min(100, Math.max(0, ratio * 100));
}

/**
 * Determine the active difficulty color class.
 */
function difficultyColorClass(difficulty: EncounterDifficulty): string {
    switch (difficulty) {
        case 'easy': return 'pdb-diff-easy';
        case 'medium': return 'pdb-diff-medium';
        case 'hard': return 'pdb-diff-hard';
        case 'deadly': return 'pdb-diff-deadly';
    }
}

export interface PredictedDifficultyBarProps {
    /** Full estimate snapshot (null if party/enemy not ready) */
    snapshot: SimulationEstimateSnapshot | null;
}

/**
 * Visual difficulty prediction bar with segmented zones and a position marker.
 */
export function PredictedDifficultyBar({ snapshot }: PredictedDifficultyBarProps) {
    if (!snapshot) {
        return null;
    }

    const {
        prediction: { predictedDifficulty, xpRatio, predictedWinRate },
        enemy: { totalAdjustedXP },
        party: { xpBudgets },
    } = snapshot;

    const markerPercent = computeMarkerPosition(
        totalAdjustedXP,
        xpBudgets.easy,
        xpBudgets.deadly,
    );

    const difficultyLabel =
        DIFFICULTY_TIERS.find((t) => t.key === predictedDifficulty)?.label ??
        predictedDifficulty;

    return (
        <div className="pdb-card">
            {/* Header row */}
            <div className="pdb-header">
                <div className="pdb-header-left">
                    <Target size={13} className="pdb-icon" />
                    <span className="pdb-title">Predicted Difficulty</span>
                </div>
                <span className={`pdb-badge ${difficultyColorClass(predictedDifficulty)}`}>
                    {difficultyLabel}
                </span>
            </div>

            {/* Segmented bar */}
            <div className="pdb-bar-track" aria-label="Difficulty prediction bar">
                {DIFFICULTY_TIERS.map((tier) => (
                    <div
                        key={tier.key}
                        className={`pdb-bar-segment pdb-seg-${tier.key}`}
                        title={tier.label}
                    />
                ))}
                {/* Marker */}
                <div
                    className="pdb-bar-marker"
                    style={{ left: `${markerPercent}%` }}
                    title={`Encounter XP: ${totalAdjustedXP.toLocaleString()}`}
                />
            </div>

            {/* Tier labels under the bar */}
            <div className="pdb-tier-labels">
                {DIFFICULTY_TIERS.map((tier) => (
                    <span key={tier.key} className={`pdb-tier-label pdb-tl-${tier.key}`}>
                        {tier.label}
                    </span>
                ))}
            </div>

            {/* Stats row */}
            <div className="pdb-stats-row">
                <span className="pdb-stat" title="Encounter adjusted XP vs party medium budget">
                    <span className="pdb-stat-label">Encounter XP</span>
                    <span className="pdb-stat-value">{totalAdjustedXP.toLocaleString()}</span>
                    <span className="pdb-stat-sep">vs</span>
                    <span className="pdb-stat-label">Medium</span>
                    <span className="pdb-stat-value">{xpBudgets.medium.toLocaleString()}</span>
                </span>
                <span className="pdb-stat-divider" />
                <span className="pdb-stat" title="XP ratio (encounter XP / medium budget)">
                    <span className="pdb-stat-label">Ratio</span>
                    <span className={`pdb-stat-value ${difficultyColorClass(predictedDifficulty)}`}>
                        {xpRatio.toFixed(2)}&times;
                    </span>
                </span>
                <span className="pdb-stat-divider" />
                <span className="pdb-stat" title="Estimated player win rate based on difficulty tier">
                    <span className="pdb-stat-label">Est. Win Rate</span>
                    <span className={`pdb-stat-value ${difficultyColorClass(predictedDifficulty)}`}>
                        {(predictedWinRate * 100).toFixed(0)}%
                    </span>
                </span>
            </div>

            {/* Contextual hint */}
            {xpRatio < 1 && (
                <p className="pdb-hint">
                    {xpRatio.toFixed(1)}&times; under medium &rarr; estimated ~{(predictedWinRate * 100).toFixed(0)}% win rate
                </p>
            )}
            {xpRatio >= 1 && (
                <p className="pdb-hint">
                    {xpRatio.toFixed(1)}&times; over medium &rarr; estimated ~{(predictedWinRate * 100).toFixed(0)}% win rate
                </p>
            )}
        </div>
    );
}

export default PredictedDifficultyBar;
