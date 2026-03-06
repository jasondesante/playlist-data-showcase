/**
 * RhythmXPSessionStats Component
 *
 * Displays session statistics for the rhythm XP system including:
 * - Total Score and XP summary
 * - Accuracy distribution breakdown
 * - Max combo achieved
 * - Bonus notifications (combo end / groove end)
 * - Claim XP button
 *
 * Phase 4: Task 4.1 - XP Session Stats (Bottom Section)
 */

import { useEffect, useState, useCallback } from 'react';
import { Zap, Trophy, Target, TrendingUp, Star } from 'lucide-react';
import type { RhythmSessionTotals, ComboEndBonusResult, GrooveEndBonusResult } from '../../types';
import { cn } from '../../utils/cn';
import { Button } from './Button';
import './RhythmXPSessionStats.css';

interface RhythmXPSessionStatsProps {
    /** Current session totals */
    sessionTotals: RhythmSessionTotals | null;
    /** Pending combo end bonus to display */
    pendingComboBonus: ComboEndBonusResult | null;
    /** Pending groove end bonus to display */
    pendingGrooveBonus: GrooveEndBonusResult | null;
    /** Callback to clear pending bonuses after display */
    onClearBonuses: () => void;
    /** Callback to claim XP and add to character */
    onClaimXP: (xp: number) => void;
    /** Whether a character is associated with this track */
    hasCharacter: boolean;
    /** Optional className for styling */
    className?: string;
}

/**
 * Format a number with commas for display
 */
function formatScore(num: number): string {
    return Math.round(num).toLocaleString();
}

/**
 * Format XP to 1 decimal place
 */
function formatXP(xp: number): string {
    return xp.toFixed(1);
}

/**
 * Get accuracy level color class
 */
function getAccuracyClass(accuracy: string): string {
    switch (accuracy) {
        case 'perfect':
            return 'rhythm-xp-session__accuracy--perfect';
        case 'great':
            return 'rhythm-xp-session__accuracy--great';
        case 'good':
            return 'rhythm-xp-session__accuracy--good';
        case 'ok':
            return 'rhythm-xp-session__accuracy--ok';
        case 'miss':
            return 'rhythm-xp-session__accuracy--miss';
        case 'wrongKey':
            return 'rhythm-xp-session__accuracy--wrong-key';
        default:
            return '';
    }
}

/**
 * RhythmXPSessionStats Component
 *
 * Renders session statistics for the rhythm XP system with bonus
 * notifications and a claim XP button.
 */
export function RhythmXPSessionStats({
    sessionTotals,
    pendingComboBonus,
    pendingGrooveBonus,
    onClearBonuses,
    onClaimXP,
    hasCharacter,
    className,
}: RhythmXPSessionStatsProps) {
    // Track recently shown bonuses for animation
    const [recentComboBonus, setRecentComboBonus] = useState<ComboEndBonusResult | null>(null);
    const [recentGrooveBonus, setRecentGrooveBonus] = useState<GrooveEndBonusResult | null>(null);

    // Handle pending combo bonus - show and auto-dismiss
    useEffect(() => {
        if (pendingComboBonus) {
            setRecentComboBonus(pendingComboBonus);
            onClearBonuses();

            // Auto-dismiss after 2 seconds
            const timeout = setTimeout(() => {
                setRecentComboBonus(null);
            }, 2000);

            return () => clearTimeout(timeout);
        }
    }, [pendingComboBonus, onClearBonuses]);

    // Handle pending groove bonus - show and auto-dismiss
    useEffect(() => {
        if (pendingGrooveBonus) {
            setRecentGrooveBonus(pendingGrooveBonus);
            onClearBonuses();

            // Auto-dismiss after 2 seconds
            const timeout = setTimeout(() => {
                setRecentGrooveBonus(null);
            }, 2000);

            return () => clearTimeout(timeout);
        }
    }, [pendingGrooveBonus, onClearBonuses]);

    // Handle claim XP button click
    const handleClaimXP = useCallback(() => {
        if (sessionTotals) {
            onClaimXP(sessionTotals.totalXP);
        }
    }, [sessionTotals, onClaimXP]);

    // Extract values from session totals
    const totalScore = sessionTotals?.totalScore ?? 0;
    const totalXP = sessionTotals?.totalXP ?? 0;
    const maxCombo = sessionTotals?.maxCombo ?? 0;
    const accuracyDist = sessionTotals?.accuracyDistribution ?? {
        perfect: 0,
        great: 0,
        good: 0,
        ok: 0,
        miss: 0,
        wrongKey: 0,
    };
    const accuracyPercentage = sessionTotals?.accuracyPercentage ?? 0;

    // Check if there's any activity
    const hasActivity = totalScore > 0;

    return (
        <div
            className={cn('rhythm-xp-session', className)}
            role="region"
            aria-label="Rhythm XP Session Statistics"
        >
            {/* Header */}
            <div className="rhythm-xp-session__header">
                <span className="rhythm-xp-session__title">
                    <Zap className="rhythm-xp-session__title-icon" size={16} />
                    Session Summary
                </span>
            </div>

            {/* Main Score/XP Summary Row */}
            <div className="rhythm-xp-session__summary">
                <div className="rhythm-xp-session__summary-item rhythm-xp-session__summary-item--score">
                    <Target className="rhythm-xp-session__summary-icon" size={20} />
                    <div className="rhythm-xp-session__summary-content">
                        <span className="rhythm-xp-session__summary-value">
                            {formatScore(totalScore)}
                        </span>
                        <span className="rhythm-xp-session__summary-label">Score</span>
                    </div>
                </div>
                <div className="rhythm-xp-session__summary-divider" />
                <div className="rhythm-xp-session__summary-item rhythm-xp-session__summary-item--xp">
                    <Star className="rhythm-xp-session__summary-icon" size={20} />
                    <div className="rhythm-xp-session__summary-content">
                        <span className="rhythm-xp-session__summary-value">
                            {formatXP(totalXP)}
                        </span>
                        <span className="rhythm-xp-session__summary-label">XP</span>
                    </div>
                </div>
            </div>

            {/* Accuracy Distribution */}
            {hasActivity && (
                <div className="rhythm-xp-session__accuracy">
                    <div className="rhythm-xp-session__accuracy-header">
                        <TrendingUp size={14} />
                        <span>Accuracy Distribution</span>
                        <span className="rhythm-xp-session__accuracy-percentage">
                            {accuracyPercentage.toFixed(1)}%
                        </span>
                    </div>
                    <div className="rhythm-xp-session__accuracy-grid">
                        <div className={cn('rhythm-xp-session__accuracy-item', getAccuracyClass('perfect'))}>
                            <span className="rhythm-xp-session__accuracy-value">{accuracyDist.perfect}</span>
                            <span className="rhythm-xp-session__accuracy-label">Perfect</span>
                        </div>
                        <div className={cn('rhythm-xp-session__accuracy-item', getAccuracyClass('great'))}>
                            <span className="rhythm-xp-session__accuracy-value">{accuracyDist.great}</span>
                            <span className="rhythm-xp-session__accuracy-label">Great</span>
                        </div>
                        <div className={cn('rhythm-xp-session__accuracy-item', getAccuracyClass('good'))}>
                            <span className="rhythm-xp-session__accuracy-value">{accuracyDist.good}</span>
                            <span className="rhythm-xp-session__accuracy-label">Good</span>
                        </div>
                        <div className={cn('rhythm-xp-session__accuracy-item', getAccuracyClass('ok'))}>
                            <span className="rhythm-xp-session__accuracy-value">{accuracyDist.ok}</span>
                            <span className="rhythm-xp-session__accuracy-label">OK</span>
                        </div>
                        <div className={cn('rhythm-xp-session__accuracy-item', getAccuracyClass('miss'))}>
                            <span className="rhythm-xp-session__accuracy-value">{accuracyDist.miss}</span>
                            <span className="rhythm-xp-session__accuracy-label">Miss</span>
                        </div>
                        <div className={cn('rhythm-xp-session__accuracy-item', getAccuracyClass('wrongKey'))}>
                            <span className="rhythm-xp-session__accuracy-value">{accuracyDist.wrongKey}</span>
                            <span className="rhythm-xp-session__accuracy-label">Wrong</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Max Combo */}
            {hasActivity && maxCombo > 0 && (
                <div className="rhythm-xp-session__max-combo">
                    <Trophy className="rhythm-xp-session__max-combo-icon" size={16} />
                    <span className="rhythm-xp-session__max-combo-label">Max Combo</span>
                    <span className="rhythm-xp-session__max-combo-value">{maxCombo}</span>
                </div>
            )}

            {/* Bonus Notifications */}
            <div className="rhythm-xp-session__bonuses">
                {/* Combo End Bonus Notification */}
                {recentComboBonus && (
                    <div
                        className="rhythm-xp-session__bonus rhythm-xp-session__bonus--combo"
                        role="status"
                        aria-live="polite"
                    >
                        <span className="rhythm-xp-session__bonus-icon">🔥</span>
                        <div className="rhythm-xp-session__bonus-content">
                            <span className="rhythm-xp-session__bonus-xp">
                                +{formatXP(recentComboBonus.bonusXP)} XP
                            </span>
                            <span className="rhythm-xp-session__bonus-detail">
                                Combo: {recentComboBonus.comboLength} hits
                            </span>
                        </div>
                    </div>
                )}

                {/* Groove End Bonus Notification */}
                {recentGrooveBonus && (
                    <div
                        className="rhythm-xp-session__bonus rhythm-xp-session__bonus--groove"
                        role="status"
                        aria-live="polite"
                    >
                        <span className="rhythm-xp-session__bonus-icon">🎵</span>
                        <div className="rhythm-xp-session__bonus-content">
                            <span className="rhythm-xp-session__bonus-xp">
                                +{formatXP(recentGrooveBonus.bonusXP)} XP
                            </span>
                            <span className="rhythm-xp-session__bonus-detail">
                                Groove Bonus
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Claim XP Button */}
            {hasActivity && (
                <div className="rhythm-xp-session__claim">
                    <Button
                        variant="primary"
                        size="lg"
                        onClick={handleClaimXP}
                        disabled={!hasCharacter || totalXP <= 0}
                        leftIcon={Zap}
                        className="rhythm-xp-session__claim-btn"
                    >
                        {hasCharacter ? (
                            totalXP > 0 ? (
                                `Claim ${formatXP(totalXP)} XP`
                            ) : (
                                'No XP to Claim'
                            )
                        ) : (
                            'No Character Selected'
                        )}
                    </Button>
                    {!hasCharacter && (
                        <span className="rhythm-xp-session__claim-hint">
                            XP requires a character association
                        </span>
                    )}
                </div>
            )}

            {/* Empty State */}
            {!hasActivity && (
                <div className="rhythm-xp-session__empty">
                    <span className="rhythm-xp-session__empty-text">
                        Start tapping to earn XP!
                    </span>
                </div>
            )}

            {/* Screen reader summary */}
            <div className="sr-only" role="status" aria-live="polite">
                Session Summary: Score {formatScore(totalScore)}, XP {formatXP(totalXP)}.
                {maxCombo > 0 && `Max Combo: ${maxCombo} hits.`}
                {accuracyPercentage > 0 && `Accuracy: ${accuracyPercentage.toFixed(1)} percent.`}
            </div>
        </div>
    );
}
