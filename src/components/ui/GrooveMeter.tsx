/**
 * GrooveMeter Component
 *
 * A Devil May Cry style horizontal bar that displays the current groove "hotness"
 * based on timing consistency. Rewards maintaining a pocket feel rather than
 * hitting perfectly on beat.
 *
 * Features:
 * - Tiered bar that fills within current tier, then "expands" to next tier (DMC style)
 * - Tier label display (D, C, B, A, S, SS, Platinum)
 * - Direction icon + label display (Pushing, Laid Back, On Point)
 * - Streak counter display
 * - Tier-up animation when advancing to next tier
 * - Compact variant for inline display next to timeline
 * - Accessible with screen reader announcements for state changes
 * - Groove end bonus display with sparkle animation
 *
 * Part of Phase 3: Task 3.1 - Create GrooveMeter Component
 * Part of Phase 7: Task 7.2 - Add Direction Change Animations
 * Part of Phase 5: Task 5.1 - Add Bonus Display Next to GrooveMeter
 * Success Criterion: UI is responsive and accessible
 */

import { useEffect, useRef, useState } from 'react';
import { cn } from '../../utils/cn';
import type { GrooveDirection, GrooveEndBonusResult, GrooveTier } from '@/types';
import { GROOVE_TIERS } from 'playlist-data-engine';
import './GrooveMeter.css';

export interface GrooveMeterProps {
  /** Current hotness value (0+, can exceed 100 for higher tiers) */
  hotness: number;
  /** Current groove tier (D, C, B, A, S, SS, Platinum) */
  tier: GrooveTier;
  /** Current groove direction */
  direction: GrooveDirection;
  /** Current streak length */
  streak: number;
  /** Visual variant - full for KeyLane mode, compact for TapArea mode */
  variant?: 'full' | 'compact';
  /** Pending groove end bonus to display (Phase 5: Task 5.1) */
  pendingBonus?: GrooveEndBonusResult | null;
  /** Callback when bonus has been displayed (for clearing state) */
  onBonusDisplayed?: () => void;
  /** Optional className for additional styling */
  className?: string;
}

/**
 * Get the display info for a groove direction
 */
function getDirectionInfo(direction: GrooveDirection): {
  icon: string;
  label: string;
  className: string;
} {
  switch (direction) {
    case 'push':
      return { icon: '↑', label: 'Pushing', className: 'groove-meter__direction--push' };
    case 'pull':
      return { icon: '↓', label: 'Laid Back', className: 'groove-meter__direction--pull' };
    case 'neutral':
    default:
      return { icon: '●', label: 'On Point', className: 'groove-meter__direction--neutral' };
  }
}

/**
 * Get the display info for a groove tier
 */
function getTierDisplayInfo(tier: GrooveTier): { label: string; rank: number } {
  switch (tier) {
    case 'Platinum':
      return { label: 'PLATINUM', rank: 7 };
    case 'SS':
      return { label: 'SS', rank: 6 };
    case 'S':
      return { label: 'S', rank: 5 };
    case 'A':
      return { label: 'A', rank: 4 };
    case 'B':
      return { label: 'B', rank: 3 };
    case 'C':
      return { label: 'C', rank: 2 };
    case 'D':
    default:
      return { label: 'D', rank: 1 };
  }
}

/**
 * Calculate the fill percentage within the current tier (0-100%)
 * This creates the DMC-style "fill and expand" effect
 */
function calculateTierFill(hotness: number, tier: GrooveTier): number {
  // Find the current tier config
  const tierConfig = GROOVE_TIERS.find((t) => t.tier === tier);
  if (!tierConfig) return 0;

  const { minHotness, maxHotness } = tierConfig;
  const tierRange = maxHotness === Infinity ? 50 : maxHotness - minHotness;

  // Calculate progress within this tier (0-100%)
  const progress = Math.max(0, hotness - minHotness);
  const fillPercent = Math.min(100, (progress / tierRange) * 100);

  return fillPercent;
}

/**
 * Get the CSS class for tier-specific styling
 */
function getTierClass(tier: GrooveTier): string {
  return `groove-meter__fill--tier-${tier.toLowerCase()}`;
}

/**
 * GrooveMeter Component
 *
 * Renders a tiered horizontal groove meter bar with direction indicator, tier display, and streak counter.
 */
export function GrooveMeter({
  hotness,
  tier,
  direction,
  streak,
  variant = 'full',
  pendingBonus,
  onBonusDisplayed,
  className,
}: GrooveMeterProps) {
  const directionInfo = getDirectionInfo(direction);
  const tierInfo = getTierDisplayInfo(tier);
  const tierFillPercent = calculateTierFill(hotness, tier);
  const tierClass = getTierClass(tier);

  // Track direction changes for animation
  const prevDirectionRef = useRef<GrooveDirection>(direction);
  const [isDirectionAnimating, setIsDirectionAnimating] = useState(false);
  const directionAnimationKeyRef = useRef(0);

  // Track tier changes for DMC-style tier-up animation
  const prevTierRef = useRef<GrooveTier>(tier);
  const [isTierUpAnimating, setIsTierUpAnimating] = useState(false);
  const tierAnimationKeyRef = useRef(0);

  // Track hotness milestones for screen reader announcements
  const prevHotnessRef = useRef(hotness);
  const [announcement, setAnnouncement] = useState<string | null>(null);

  // Track displayed bonus for animation (Phase 5: Task 5.1)
  const [displayedBonus, setDisplayedBonus] = useState<GrooveEndBonusResult | null>(null);
  const bonusKeyRef = useRef(0);

  // Handle pending bonus - show and auto-dismiss (Phase 5: Task 5.1)
  useEffect(() => {
    if (pendingBonus) {
      setDisplayedBonus(pendingBonus);
      bonusKeyRef.current += 1;

      // Auto-dismiss after 2 seconds
      const timeout = setTimeout(() => {
        setDisplayedBonus(null);
        onBonusDisplayed?.();
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [pendingBonus, onBonusDisplayed]);

  // Detect tier changes and trigger tier-up animation (DMC style)
  useEffect(() => {
    const prevRank = getTierDisplayInfo(prevTierRef.current).rank;
    const currentRank = tierInfo.rank;

    // Only animate when tier increases (tier-up)
    if (currentRank > prevRank) {
      setIsTierUpAnimating(true);
      tierAnimationKeyRef.current += 1;

      // Remove animation class after animation completes
      const timer = setTimeout(() => {
        setIsTierUpAnimating(false);
      }, 600); // Match CSS animation duration

      prevTierRef.current = tier;
      return () => clearTimeout(timer);
    }

    // Update ref even if no animation (for tier drops)
    prevTierRef.current = tier;
  }, [tier, tierInfo.rank]);

  // Detect direction changes and trigger animation
  useEffect(() => {
    if (prevDirectionRef.current !== direction) {
      // Direction changed - trigger animation
      setIsDirectionAnimating(true);
      directionAnimationKeyRef.current += 1;

      // Remove animation class after animation completes
      const timer = setTimeout(() => {
        setIsDirectionAnimating(false);
      }, 400); // Match CSS animation duration

      prevDirectionRef.current = direction;
      return () => clearTimeout(timer);
    }
  }, [direction]);

  // Announce hotness milestone changes to screen readers
  useEffect(() => {
    const milestones = [25, 50, 75, 90, 100];
    const prevMilestone = milestones.find((m) => prevHotnessRef.current < m);
    const currentMilestone = milestones.find((m) => hotness < m);

    // Check if we crossed a milestone upward
    if (prevMilestone !== currentMilestone && hotness > prevHotnessRef.current) {
      const crossedMilestone = milestones.find(
        (m) => m > prevHotnessRef.current && m <= hotness
      );
      if (crossedMilestone) {
        let message = '';
        if (crossedMilestone === 100) {
          message = 'Perfect groove! Maximum hotness!';
        } else if (crossedMilestone >= 90) {
          message = 'Blazing! 90% hotness!';
        } else if (crossedMilestone >= 75) {
          message = 'On fire! 75% hotness!';
        } else if (crossedMilestone >= 50) {
          message = 'Hot groove! 50% hotness!';
        } else if (crossedMilestone >= 25) {
          message = 'Building groove! 25% hotness!';
        }
        if (message) {
          setAnnouncement(message);
          const timeout = setTimeout(() => setAnnouncement(null), 1000);
          prevHotnessRef.current = hotness;
          return () => clearTimeout(timeout);
        }
      }
    }
    prevHotnessRef.current = hotness;
  }, [hotness]);

  // Clamp tier fill to valid range
  const clampedFill = Math.max(0, Math.min(100, tierFillPercent));

  const containerClasses = cn(
    'groove-meter',
    `groove-meter--${variant}`,
    isTierUpAnimating && 'groove-meter--tier-up',
    className
  );

  // Build accessible label with all info
  const accessibleLabel = `Groove meter: Tier ${tierInfo.label}, ${clampedFill}% within tier, ${directionInfo.label.toLowerCase()} timing, ${streak} streak`;

  return (
    <>
      {/* Screen reader announcements for milestone changes */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="groove-meter__sr-only"
      >
        {announcement}
      </div>

      <div
        className={containerClasses}
        role="progressbar"
        aria-valuenow={clampedFill}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={accessibleLabel}
      >
        {/* Tier label display with bonus placeholder for full variant */}
        <div className="groove-meter__tier-row">
          {/* Left spacer to balance the layout */}
          {variant === 'full' && (
            <div className="groove-meter__bonus-placeholder groove-meter__bonus-placeholder--left" />
          )}
          
          <div
            className={cn(
              'groove-meter__tier-label',
              `groove-meter__tier-label--${tier.toLowerCase()}`,
              isTierUpAnimating && 'groove-meter__tier-label--animating'
            )}
            key={`tier-${tierAnimationKeyRef.current}`}
            aria-label={`Current tier: ${tierInfo.label}`}
          >
            <span className="groove-meter__tier-label-text">{tierInfo.label}</span>
          </div>
          
          {/* Bonus placeholder for full variant - right side */}
          {variant === 'full' && (
            <div className="groove-meter__bonus-placeholder groove-meter__bonus-placeholder--right">
              {displayedBonus ? (
                <div
                  className="groove-meter__bonus groove-meter__bonus--inline"
                  key={`bonus-${bonusKeyRef.current}`}
                  role="status"
                  aria-live="polite"
                >
                  <span className="groove-meter__bonus-icon" aria-hidden="true">✨</span>
                  <span className="groove-meter__bonus-xp">
                    +{displayedBonus.bonusXP.toFixed(1)} XP
                  </span>
                </div>
              ) : (
                <div className="groove-meter__bonus-placeholder-content">
                  <span className="groove-meter__bonus-placeholder-text">groove bonus</span>
                  <span className="groove-meter__bonus-placeholder-value">---</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Main bar section */}
        <div className="groove-meter__bar-container">
          <div
            className={cn('groove-meter__fill', tierClass)}
            style={{ width: `${clampedFill}%` }}
            aria-hidden="true"
          />
          {/* Tier-up flash effect */}
          {isTierUpAnimating && (
            <div
              className="groove-meter__tier-flash"
              key={`flash-${tierAnimationKeyRef.current}`}
            />
          )}
        </div>

        {/* Info row: direction + streak */}
        <div className="groove-meter__info">
          <div
            className={cn(
              'groove-meter__direction',
              directionInfo.className,
              isDirectionAnimating && 'groove-meter__direction--animating'
            )}
            key={`direction-${directionAnimationKeyRef.current}`}
            aria-label={`Timing direction: ${directionInfo.label}`}
          >
            <span
              className={cn(
                'groove-meter__direction-icon',
                isDirectionAnimating && 'groove-meter__direction-icon--animating'
              )}
              aria-hidden="true"
            >
              {directionInfo.icon}
            </span>
            <span
              className={cn(
                'groove-meter__direction-label',
                isDirectionAnimating && 'groove-meter__direction-label--animating'
              )}
            >
              {directionInfo.label}
            </span>
          </div>

          <div
            className="groove-meter__streak"
            aria-label={`Current streak: ${streak} consecutive hits`}
          >
            <span className="groove-meter__streak-value" aria-hidden="true">{streak}</span>
            <span className="groove-meter__streak-label" aria-hidden="true">streak</span>
          </div>
        </div>

        {/* Groove End Bonus Display (Phase 5: Task 5.1) */}
        {/* For compact variant: show bonus placeholder inline at bottom */}
        {variant === 'compact' && (
          <div
            className={cn(
              'groove-meter__bonus',
              !displayedBonus && 'groove-meter__bonus--placeholder'
            )}
            key={`bonus-${bonusKeyRef.current}`}
            role="status"
            aria-live="polite"
          >
            <span className="groove-meter__bonus-icon" aria-hidden="true">✨</span>
            <div className="groove-meter__bonus-content">
              {displayedBonus ? (
                <>
                  <span className="groove-meter__bonus-xp">
                    +{displayedBonus.bonusXP.toFixed(1)} XP
                  </span>
                  <span className="groove-meter__bonus-detail">
                    Groove Complete!
                  </span>
                </>
              ) : (
                <>
                  <span className="groove-meter__bonus-xp groove-meter__bonus-xp--placeholder">
                    groove bonus
                  </span>
                  <span className="groove-meter__bonus-detail">
                    soon
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default GrooveMeter;
