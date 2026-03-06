/**
 * RhythmXPStats Component
 *
 * Displays real-time XP and score statistics in the practice mode header bar.
 * Shows Score, XP, Combo, and Multiplier - always visible during practice.
 *
 * Phase 3: Task 3.1 - Real-Time XP Display (Header Bar)
 */

import type { RhythmSessionTotals, RhythmXPResult } from '../../types';
import './RhythmXPStats.css';

interface RhythmXPStatsProps {
    /** Current session totals */
    sessionTotals: RhythmSessionTotals | null;
    /** Last XP result for hit feedback */
    lastResult: RhythmXPResult | null;
    /** Current combo count */
    currentCombo: number;
}

/**
 * Format a number with commas for display
 */
function formatNumber(num: number): string {
    return Math.round(num).toLocaleString();
}

/**
 * Format multiplier to 1 decimal place with "x" suffix
 */
function formatMultiplier(mult: number): string {
    return `${mult.toFixed(1)}x`;
}

/**
 * Format XP to 1 decimal place
 */
function formatXP(xp: number): string {
    return xp.toFixed(1);
}

export function RhythmXPStats({
    sessionTotals,
    lastResult,
    currentCombo,
}: RhythmXPStatsProps) {
    // Extract values from session totals (use defaults if null)
    const totalScore = sessionTotals?.totalScore ?? 0;
    const totalXP = sessionTotals?.totalXP ?? 0;

    // Get current multiplier from last result (or default to 1.0)
    const currentMultiplier = lastResult?.totalMultiplier ?? 1.0;

    return (
        <div className="rhythm-xp-stats">
            {/* Score - for gameplay achievement */}
            <div className="beat-practice-stat rhythm-xp-stat rhythm-xp-stat--score">
                <span className="beat-practice-stat-value rhythm-xp-stat-value rhythm-xp-stat-value--score">
                    {formatNumber(totalScore)}
                </span>
                <span className="beat-practice-stat-label">Score</span>
            </div>

            {/* XP - for character progression */}
            <div className="beat-practice-stat rhythm-xp-stat rhythm-xp-stat--xp">
                <span className="beat-practice-stat-value rhythm-xp-stat-value rhythm-xp-stat-value--xp">
                    {formatXP(totalXP)}
                </span>
                <span className="beat-practice-stat-label">XP</span>
            </div>

            {/* Combo - consecutive hits without miss/wrongKey */}
            <div className="beat-practice-stat rhythm-xp-stat rhythm-xp-stat--combo">
                <span className={`beat-practice-stat-value rhythm-xp-stat-value rhythm-xp-stat-value--combo ${currentCombo >= 10 ? 'rhythm-xp-stat-value--combo-active' : ''}`}>
                    {currentCombo}
                </span>
                <span className="beat-practice-stat-label">Combo</span>
            </div>

            {/* Multiplier - current XP multiplier */}
            <div className="beat-practice-stat rhythm-xp-stat rhythm-xp-stat--multiplier">
                <span className={`beat-practice-stat-value rhythm-xp-stat-value rhythm-xp-stat-value--multiplier ${currentMultiplier > 1.0 ? 'rhythm-xp-stat-value--multiplier-active' : ''}`}>
                    {formatMultiplier(currentMultiplier)}
                </span>
                <span className="beat-practice-stat-label">Mult</span>
            </div>
        </div>
    );
}
