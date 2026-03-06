/**
 * ComboFeedbackDisplay Component
 *
 * Displays real-time combo and multiplier feedback in the DDR/Guitar lane feedback panel.
 * Shows Score, Combo count, and XP Multiplier - always visible during practice.
 *
 * Phase 3.5: Task 3.5.1 - Combo UI in Lane Feedback Panel
 */

import { cn } from '@/utils/cn';
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
}

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
}: ComboFeedbackDisplayProps) {
    const multiplierClass = getMultiplierClass(multiplier);
    const comboClass = getComboClass(combo);

    return (
        <div className={cn('combo-feedback-display', className)}>
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

            {/* Accessibility: Screen reader summary */}
            <div role="status" aria-live="polite" className="sr-only">
                Score: {formatScore(score)}, Combo: {combo} hits, Multiplier: {formatMultiplier(multiplier)}
            </div>
        </div>
    );
}
