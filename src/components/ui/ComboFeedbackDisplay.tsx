/**
 * ComboFeedbackDisplay Component
 *
 * Displays real-time combo and multiplier feedback in the DDR/Guitar lane feedback panel.
 * Shows Score, Combo count, and XP Multiplier - always visible during practice.
 *
 * Phase 3.5: Task 3.5.1 - Combo UI in Lane Feedback Panel
 * Phase 3.5: Task 3.5.5 - Handle Combo Reset with animations
 */

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/utils/cn';
import type { ComboEndBonusResult } from '@/types';
import { BonusNotification } from './BonusNotification';
import './ComboFeedbackDisplay.css';

interface ComboFeedbackDisplayProps {
    /** Current session score (for gameplay achievement) */
    score: number;
    /** Current combo count (consecutive hits) */
    combo: number;
    /** Current XP multiplier from RhythmXPResult */
    multiplier: number;
    /** Optional className for styling */
    className?: string;
    /** Pending combo end bonus to display */
    comboBonus?: ComboEndBonusResult | null;
    /** Callback when bonus has been displayed (for clearing state) */
    onBonusDisplayed?: () => void;
}

/**
 * Multiplier milestone thresholds for accessibility announcements
 * Announced when multiplier crosses these thresholds going UP
 */
const MULTIPLIER_MILESTONES = [2, 3, 4, 5] as const;

/**
 * Format a number with commas for display
 */
function formatScore(num: number): string {
    return Math.round(num).toLocaleString();
}

/**
 * Format multiplier to 1 decimal place with "x" suffix
 */
function formatMultiplier(mult: number): string {
    return `${mult.toFixed(1)}x`;
}

/**
 * Get the CSS class for multiplier based on value
 * Color gradient: 1.0x = default, 2.0x+ = yellow, 3.0x+ = orange, 4.0x+ = red, 5.0x = gold
 */
function getMultiplierClass(multiplier: number): string {
    if (multiplier >= 5.0) return 'combo-feedback-multiplier--gold';
    if (multiplier >= 4.0) return 'combo-feedback-multiplier--red';
    if (multiplier >= 3.0) return 'combo-feedback-multiplier--orange';
    if (multiplier >= 2.0) return 'combo-feedback-multiplier--yellow';
    return '';
}

/**
 * Get the CSS class for combo based on size
 */
function getComboClass(combo: number): string {
    if (combo >= 50) return 'combo-feedback-combo--epic';
    if (combo >= 25) return 'combo-feedback-combo--great';
    if (combo >= 10) return 'combo-feedback-combo--good';
    return '';
}

export function ComboFeedbackDisplay({
    score,
    combo,
    multiplier,
    className,
    comboBonus,
    onBonusDisplayed,
}: ComboFeedbackDisplayProps) {
    // Track previous combo for reset animation (Phase 3.5: Task 3.5.5)
    const [showResetAnimation, setShowResetAnimation] = useState(false);
    const previousComboRef = useRef(combo);

    // Track multiplier milestone announcements (Phase 3.5: Task 3.5.6)
    const [milestoneAnnouncement, setMilestoneAnnouncement] = useState<string>('');
    const lastAnnouncedMilestoneRef = useRef<number>(0);

    useEffect(() => {
        // Detect combo reset: previous combo was > 0, now it's 0
        if (previousComboRef.current > 0 && combo === 0) {
            setShowResetAnimation(true);
            // Clear animation after it plays
            const timer = setTimeout(() => {
                setShowResetAnimation(false);
            }, 300); // Match animation duration in CSS
            return () => clearTimeout(timer);
        }
        previousComboRef.current = combo;
    }, [combo]);

    // Detect multiplier milestone achievements (Phase 3.5: Task 3.5.6)
    useEffect(() => {
        // Find the highest milestone we've reached
        const reachedMilestone = [...MULTIPLIER_MILESTONES]
            .reverse()
            .find(milestone => multiplier >= milestone);

        if (reachedMilestone && reachedMilestone > lastAnnouncedMilestoneRef.current) {
            // New milestone reached - announce it
            lastAnnouncedMilestoneRef.current = reachedMilestone;
            setMilestoneAnnouncement(`${reachedMilestone}x multiplier reached!`);

            // Clear announcement after screen reader has had time to process
            const timer = setTimeout(() => {
                setMilestoneAnnouncement('');
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [multiplier]);

    const multiplierClass = getMultiplierClass(multiplier);
    const comboClass = getComboClass(combo);

    // Add reset animation class when combo breaks
    const resetClass = showResetAnimation ? 'combo-feedback--reset' : '';

    return (
        <div className={cn('combo-feedback-display', resetClass, className)}>
            {/* Score - for gameplay achievement */}
            <div className="combo-feedback-score">
                <span className="combo-feedback-score-label">Score</span>
                <span className="combo-feedback-score-value">
                    {formatScore(score)}
                </span>
            </div>

            {/* Combo and Multiplier row */}
            <div className="combo-feedback-stats">
                <div className="combo-feedback-combo">
                    <span className={cn('combo-feedback-combo-value', comboClass)}>
                        {combo}
                    </span>
                    <span className="combo-feedback-combo-label">hits</span>
                </div>
                <span className="combo-feedback-divider">|</span>
                <div className="combo-feedback-multiplier">
                    <span className={cn('combo-feedback-multiplier-value', multiplierClass)}>
                        {formatMultiplier(multiplier)}
                    </span>
                </div>
            </div>

            {/* Combo End Bonus Notification */}
            <BonusNotification
                comboBonus={comboBonus ?? null}
                onBonusDisplayed={onBonusDisplayed}
            />

            {/* Accessibility: Screen reader summary */}
            <div role="status" aria-live="polite" className="sr-only">
                Score: {formatScore(score)}, Combo: {combo} hits, Multiplier: {formatMultiplier(multiplier)}
            </div>

            {/* Accessibility: Milestone announcements (Phase 3.5: Task 3.5.6) */}
            {/* aria-atomic ensures the entire content is announced, not just changes */}
            {milestoneAnnouncement && (
                <div
                    role="alert"
                    aria-live="assertive"
                    aria-atomic="true"
                    className="sr-only"
                >
                    {milestoneAnnouncement}
                </div>
            )}
        </div>
    );
}
