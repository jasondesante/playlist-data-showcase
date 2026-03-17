/**
 * BonusNotification Component
 *
 * Displays floating bonus notifications (combo end, groove end) with
 * slide-in animations. Positioned near the GrooveMeter area.
 *
 * Phase 9: Task 9.2 - Bonus Celebration Animations
 */

import { useEffect, useRef, useState } from 'react';
import type { ComboEndBonusResult } from '../../types';
import { cn } from '../../utils/cn';
import './BonusNotification.css';

export interface BonusNotificationProps {
    /** Pending combo end bonus to display */
    comboBonus: ComboEndBonusResult | null;
    /** Callback when bonus has been displayed (for clearing state) */
    onBonusDisplayed?: () => void;
    /** Optional className for additional styling */
    className?: string;
}

/**
 * Format XP to 1 decimal place
 */
function formatXP(xp: number): string {
    return xp.toFixed(1);
}

/**
 * BonusNotification Component
 *
 * Renders a floating notification for combo end bonuses with
 * slide-in animation and auto-dismiss.
 */
export function BonusNotification({
    comboBonus,
    onBonusDisplayed,
    className,
}: BonusNotificationProps) {
    // Track displayed bonus for animation
    const [displayedBonus, setDisplayedBonus] = useState<ComboEndBonusResult | null>(null);
    const [isExiting, setIsExiting] = useState(false);
    const bonusKeyRef = useRef(0);

    // Handle pending bonus - show and auto-dismiss
    useEffect(() => {
        if (comboBonus) {
            setDisplayedBonus(comboBonus);
            setIsExiting(false);
            bonusKeyRef.current += 1;

            // Start exit animation after 3 seconds, then dismiss
            const exitTimeout = setTimeout(() => {
                setIsExiting(true);
            }, 3000);

            const dismissTimeout = setTimeout(() => {
                setDisplayedBonus(null);
                onBonusDisplayed?.();
            }, 3400);

            return () => {
                clearTimeout(exitTimeout);
                clearTimeout(dismissTimeout);
            };
        }
    }, [comboBonus, onBonusDisplayed]);

    if (!displayedBonus) {
        return null;
    }

    return (
        <div
            className={cn(
                'bonus-notification',
                isExiting && 'bonus-notification--exiting',
                className
            )}
            key={`combo-bonus-${bonusKeyRef.current}`}
            role="status"
            aria-live="polite"
        >
            <span className="bonus-notification__icon" aria-hidden="true">
                🔥
            </span>
            <div className="bonus-notification__content">
                <span className="bonus-notification__xp">
                    +{formatXP(displayedBonus.bonusXP)} XP
                </span>
                <span className="bonus-notification__detail">
                    Combo: {displayedBonus.comboLength} hits
                </span>
            </div>
        </div>
    );
}

export default BonusNotification;
