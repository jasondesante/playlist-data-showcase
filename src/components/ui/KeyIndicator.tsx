/**
 * KeyIndicator Component
 *
 * Displays required key indicators on timeline beat markers for rhythm game charts.
 * Shows arrow symbols (↑↓←→) for DDR mode and numbers (1-5) for Guitar Hero mode.
 *
 * Features:
 * - Color-coded by key type (DDR: left=blue, down=green, up=red, right=purple)
 * - Guitar Hero colors: 1=green, 2=red, 3=yellow, 4=blue, 5=orange
 * - Animated feedback when the correct key is pressed
 * - Shows upcoming beat keys in sequence on timeline
 *
 * Part of Phase 5: Practice Mode Key Support - Task 5.2
 *
 * @component
 */

import { cn } from '@/utils/cn';
import type { SupportedKey } from '@/types';
import { getKeySymbol, isDdrKey, isGuitarKey } from '@/types';
import './KeyIndicator.css';

/**
 * Props for the KeyIndicator component.
 */
export interface KeyIndicatorProps {
    /** The required key to display (e.g., 'up', 'down', 'left', 'right', '1'-'5') */
    requiredKey: SupportedKey;
    /** Whether this beat is upcoming (not yet hit) */
    isUpcoming?: boolean;
    /** Whether this beat is in the past (already passed) */
    isPast?: boolean;
    /** Whether the correct key was just pressed (for feedback animation) */
    keyPressed?: boolean;
    /** Whether the wrong key was pressed (for error feedback) */
    wrongKeyPressed?: boolean;
    /** Size variant */
    size?: 'sm' | 'md' | 'lg';
    /** Optional additional CSS classes */
    className?: string;
}

/**
 * Get the CSS color class for a key.
 * DDR colors: left=blue, down=green, up=red, right=purple
 * Guitar Hero colors: 1=green, 2=red, 3=yellow, 4=blue, 5=orange
 */
function getKeyColorClass(key: SupportedKey): string {
    if (isDdrKey(key)) {
        const ddrColors: Record<string, string> = {
            left: 'key-indicator--blue',
            down: 'key-indicator--green',
            up: 'key-indicator--red',
            right: 'key-indicator--purple',
        };
        return ddrColors[key] || '';
    } else if (isGuitarKey(key)) {
        const guitarColors: Record<string, string> = {
            '1': 'key-indicator--green',
            '2': 'key-indicator--red',
            '3': 'key-indicator--yellow',
            '4': 'key-indicator--blue',
            '5': 'key-indicator--orange',
        };
        return guitarColors[key] || '';
    }
    return '';
}

/**
 * Get the HSL color value for a key (for inline styles if needed).
 */
export function getKeyColor(key: SupportedKey): string {
    if (isDdrKey(key)) {
        const ddrColors: Record<string, string> = {
            left: 'hsl(210, 80%, 55%)',    // Blue
            down: 'hsl(140, 70%, 45%)',    // Green
            up: 'hsl(0, 75%, 55%)',        // Red
            right: 'hsl(280, 65%, 55%)',   // Purple
        };
        return ddrColors[key] || 'hsl(var(--primary))';
    } else if (isGuitarKey(key)) {
        const guitarColors: Record<string, string> = {
            '1': 'hsl(140, 70%, 40%)',     // Green
            '2': 'hsl(0, 80%, 50%)',       // Red
            '3': 'hsl(45, 90%, 50%)',      // Yellow
            '4': 'hsl(210, 80%, 55%)',     // Blue
            '5': 'hsl(25, 90%, 50%)',      // Orange
        };
        return guitarColors[key] || 'hsl(var(--primary))';
    }
    return 'hsl(var(--primary))';
}

/**
 * KeyIndicator Component
 *
 * Renders a visual indicator showing which key should be pressed for a beat.
 * Used in the BeatTimeline to show required keys on beat markers.
 *
 * @example
 * ```tsx
 * <KeyIndicator
 *   requiredKey="up"
 *   isUpcoming={true}
 *   keyPressed={false}
 * />
 * ```
 */
export function KeyIndicator({
    requiredKey,
    isUpcoming = false,
    isPast = false,
    keyPressed = false,
    wrongKeyPressed = false,
    size = 'md',
    className,
}: KeyIndicatorProps) {
    const symbol = getKeySymbol(requiredKey);
    const colorClass = getKeyColorClass(requiredKey);

    return (
        <div
            className={cn(
                'key-indicator',
                colorClass,
                isUpcoming && 'key-indicator--upcoming',
                isPast && 'key-indicator--past',
                keyPressed && 'key-indicator--pressed',
                wrongKeyPressed && 'key-indicator--wrong',
                `key-indicator--${size}`,
                className
            )}
            aria-label={`Required key: ${requiredKey}`}
            role="img"
        >
            <span className="key-indicator-symbol">{symbol}</span>
            {keyPressed && (
                <div className="key-indicator-feedback">
                    <div className="key-indicator-feedback-ring" />
                </div>
            )}
            {wrongKeyPressed && (
                <div className="key-indicator-wrong-feedback">
                    <span className="key-indicator-wrong-text">X</span>
                </div>
            )}
        </div>
    );
}

/**
 * KeyIndicatorMini Component
 *
 * A compact version of KeyIndicator for use in tight spaces like beat markers.
 * Shows just the key symbol without the extra visual feedback layers.
 */
export interface KeyIndicatorMiniProps {
    /** The required key to display */
    requiredKey: SupportedKey;
    /** Whether this beat is upcoming */
    isUpcoming?: boolean;
    /** Whether this beat is in the past */
    isPast?: boolean;
    /** Optional additional CSS classes */
    className?: string;
}

export function KeyIndicatorMini({
    requiredKey,
    isUpcoming = false,
    isPast = false,
    className,
}: KeyIndicatorMiniProps) {
    const symbol = getKeySymbol(requiredKey);
    const colorClass = getKeyColorClass(requiredKey);

    return (
        <span
            className={cn(
                'key-indicator-mini',
                colorClass,
                isUpcoming && 'key-indicator-mini--upcoming',
                isPast && 'key-indicator-mini--past',
                className
            )}
            aria-label={`Key: ${requiredKey}`}
        >
            {symbol}
        </span>
    );
}

/**
 * KeySequenceIndicator Component
 *
 * Displays a sequence of upcoming keys in order.
 * Useful for showing the next few required keys at a glance.
 */
export interface KeySequenceIndicatorProps {
    /** Array of required keys in order (first = next to hit) */
    keys: SupportedKey[];
    /** Maximum number of keys to display */
    maxVisible?: number;
    /** Index of the currently active key (0-based) */
    activeIndex?: number;
    /** Optional additional CSS classes */
    className?: string;
}

export function KeySequenceIndicator({
    keys,
    maxVisible = 5,
    activeIndex = 0,
    className,
}: KeySequenceIndicatorProps) {
    const visibleKeys = keys.slice(0, maxVisible);

    if (visibleKeys.length === 0) {
        return null;
    }

    return (
        <div className={cn('key-sequence-indicator', className)}>
            {visibleKeys.map((key, index) => (
                <KeyIndicatorMini
                    key={`${key}-${index}`}
                    requiredKey={key}
                    isUpcoming={index >= activeIndex}
                    isPast={index < activeIndex}
                    className={cn(
                        index === activeIndex && 'key-indicator-mini--active'
                    )}
                />
            ))}
            {keys.length > maxVisible && (
                <span className="key-sequence-more">+{keys.length - maxVisible}</span>
            )}
        </div>
    );
}

export default KeyIndicator;
