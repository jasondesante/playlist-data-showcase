/**
 * RhythmXPStats Component
 *
 * Displays real-time XP and score statistics in the practice mode header bar.
 * Shows Score, XP, Combo, and Multiplier - always visible during practice.
 *
 * Phase 3: Task 3.1 - Real-Time XP Display (Header Bar)
 * Phase 9: Task 9.1 - Hit Feedback Animations
 */

import { useEffect, useState, useRef } from 'react';
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
    // Track previous XP value to detect changes (Phase 9: Task 9.1)
    const prevXPRef = useRef(0);
    const [showPulse, setShowPulse] = useState(false);
    const [lastAccuracy, setLastAccuracy] = useState<string | null>(null);

    // Extract values from session totals (use defaults if null)
    const totalScore = sessionTotals?.totalScore ?? 0;
    const totalXP = sessionTotals?.totalXP ?? 0;

    // Get current multiplier from last result (or default to 1.0)
    const currentMultiplier = lastResult?.totalMultiplier ?? 1.0;

    // Detect XP changes and trigger animation (Phase 9: Task 9.1)
    useEffect(() => {
        if (totalXP !== prevXPRef.current && totalXP > prevXPRef.current) {
            // XP increased - trigger pulse animation
            setShowPulse(true);
            if (lastResult?.breakdown?.accuracy) {
                setLastAccuracy(lastResult.breakdown.accuracy);
            }
            // Reset animation after it plays
            const timer = setTimeout(() => {
                setShowPulse(false);
            }, 300);
            prevXPRef.current = totalXP;
            return () => clearTimeout(timer);
        }
        prevXPRef.current = totalXP;
    }, [totalXP, lastResult]);

    // Get accuracy class for color flash (Phase 9: Task 9.1)
    const getAccuracyClass = (accuracy: string | null): string => {
        if (!accuracy || !showPulse) return '';
        switch (accuracy) {
            case 'perfect':
                return 'rhythm-xp-flash--perfect';
            case 'great':
                return 'rhythm-xp-flash--great';
            case 'good':
                return 'rhythm-xp-flash--good';
            case 'ok':
                return 'rhythm-xp-flash--ok';
            case 'miss':
            case 'wrongKey':
                return 'rhythm-xp-flash--miss';
            default:
                return '';
        }
    };

    return (
        <div className="rhythm-xp-stats">
            {/* Score - for gameplay achievement */}
            <div className="beat-practice-stat rhythm-xp-stat rhythm-xp-stat--score">
                <span className={`beat-practice-stat-value rhythm-xp-stat-value rhythm-xp-stat-value--score ${showPulse ? 'rhythm-xp-pulse' : ''} ${getAccuracyClass(lastAccuracy)}`}>
                    {formatNumber(totalScore)}
                </span>
                <span className="beat-practice-stat-label">Score</span>
            </div>

            {/* XP - for character progression */}
            <div className="beat-practice-stat rhythm-xp-stat rhythm-xp-stat--xp">
                <span className={`beat-practice-stat-value rhythm-xp-stat-value rhythm-xp-stat-value--xp ${showPulse ? 'rhythm-xp-pulse' : ''} ${getAccuracyClass(lastAccuracy)}`}>
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
