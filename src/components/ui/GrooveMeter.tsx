/**
 * GrooveMeter Component
 *
 * A Devil May Cry style horizontal bar that displays the current groove "hotness"
 * based on timing consistency. Rewards maintaining a pocket feel rather than
 * hitting perfectly on beat.
 *
 * Features:
 * - Horizontal bar that fills based on hotness (0-100%)
 * - Direction icon + label display (Pushing, Laid Back, On Point)
 * - Streak counter display
 * - Compact variant for inline display next to timeline
 * - Accessible with screen reader announcements for state changes
 *
 * Part of Phase 3: Task 3.1 - Create GrooveMeter Component
 * Part of Phase 7: Task 7.2 - Add Direction Change Animations
 * Success Criterion: UI is responsive and accessible
 */

import { useEffect, useRef, useState } from 'react';
import { cn } from '../../utils/cn';
import type { GrooveDirection } from '@/types';
import './GrooveMeter.css';

export interface GrooveMeterProps {
  /** Current hotness value (0-100) */
  hotness: number;
  /** Current groove direction */
  direction: GrooveDirection;
  /** Current streak length */
  streak: number;
  /** Visual variant - full for KeyLane mode, compact for TapArea mode */
  variant?: 'full' | 'compact';
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
 * Get the hotness level for color gradient purposes
 */
function getHotnessLevel(hotness: number): string {
  if (hotness >= 90) return 'groove-meter__fill--blazing';
  if (hotness >= 76) return 'groove-meter__fill--on-fire';
  if (hotness >= 51) return 'groove-meter__fill--hot';
  if (hotness >= 26) return 'groove-meter__fill--warm';
  return 'groove-meter__fill--cool';
}

/**
 * GrooveMeter Component
 *
 * Renders a horizontal groove meter bar with direction indicator and streak counter.
 */
export function GrooveMeter({
  hotness,
  direction,
  streak,
  variant = 'full',
  className,
}: GrooveMeterProps) {
  const directionInfo = getDirectionInfo(direction);
  const hotnessLevel = getHotnessLevel(hotness);

  // Track direction changes for animation
  const prevDirectionRef = useRef<GrooveDirection>(direction);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationKeyRef = useRef(0);

  // Track hotness milestones for screen reader announcements
  const prevHotnessRef = useRef(hotness);
  const [announcement, setAnnouncement] = useState<string | null>(null);

  // Detect direction changes and trigger animation
  useEffect(() => {
    if (prevDirectionRef.current !== direction) {
      // Direction changed - trigger animation
      setIsAnimating(true);
      animationKeyRef.current += 1;

      // Remove animation class after animation completes
      const timer = setTimeout(() => {
        setIsAnimating(false);
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

  // Clamp hotness to valid range
  const clampedHotness = Math.max(0, Math.min(100, hotness));

  const containerClasses = cn(
    'groove-meter',
    `groove-meter--${variant}`,
    className
  );

  // Build accessible label with all info
  const accessibleLabel = `Groove meter: ${clampedHotness}% hotness, ${directionInfo.label.toLowerCase()} timing, ${streak} streak`;

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
        aria-valuenow={clampedHotness}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={accessibleLabel}
      >
        {/* Main bar section */}
        <div className="groove-meter__bar-container">
          <div
            className={cn('groove-meter__fill', hotnessLevel)}
            style={{ width: `${clampedHotness}%` }}
            aria-hidden="true"
          />
        </div>

        {/* Info row: direction + streak */}
        <div className="groove-meter__info">
          <div
            className={cn(
              'groove-meter__direction',
              directionInfo.className,
              isAnimating && 'groove-meter__direction--animating'
            )}
            key={`direction-${animationKeyRef.current}`}
            aria-label={`Timing direction: ${directionInfo.label}`}
          >
            <span
              className={cn(
                'groove-meter__direction-icon',
                isAnimating && 'groove-meter__direction-icon--animating'
              )}
              aria-hidden="true"
            >
              {directionInfo.icon}
            </span>
            <span
              className={cn(
                'groove-meter__direction-label',
                isAnimating && 'groove-meter__direction-label--animating'
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
      </div>
    </>
  );
}

export default GrooveMeter;
