import { useEffect, useState, useMemo, useRef } from 'react';
import type { MasteryLevel } from '@/hooks/useMastery';
import { MASTERY_THRESHOLDS } from '@/hooks/useMastery';
import './MasteryProgressBar.css';

/**
 * MasteryProgressBar Component
 *
 * Displays a progress bar showing progress toward the next mastery level.
 * Shows current listen count and how many more listens are needed.
 *
 * Features:
 * - Animated fill when progress changes
 * - Level-specific coloring
 * - Text showing "X/Y listens to [Next Level]"
 * - Special display when already mastered
 */

export interface MasteryProgressBarProps {
  /** Current mastery level name */
  level: MasteryLevel;
  /** Number of times the track has been listened to */
  listenCount: number;
  /** Optional additional CSS class name */
  className?: string;
  /** Whether to show compact mode */
  compact?: boolean;
}

/**
 * Get the label for a mastery level
 */
function getMasteryLabel(level: MasteryLevel): string {
  switch (level) {
    case 'mastered':
      return 'Mastered';
    case 'familiar':
      return 'Familiar';
    case 'basic':
      return 'Basic';
    case 'none':
    default:
      return 'Not Started';
  }
}

/**
 * Get the next level's threshold and name
 */
function getNextLevelInfo(currentLevel: MasteryLevel): { threshold: number; label: string } | null {
  switch (currentLevel) {
    case 'none':
      return { threshold: MASTERY_THRESHOLDS.BASIC, label: 'Basic' };
    case 'basic':
      return { threshold: MASTERY_THRESHOLDS.FAMILIAR, label: 'Familiar' };
    case 'familiar':
      return { threshold: MASTERY_THRESHOLDS.MASTERED, label: 'Mastered' };
    case 'mastered':
    default:
      return null; // Already at max level
  }
}

/**
 * Get the current level's threshold
 */
function getCurrentThreshold(level: MasteryLevel): number {
  switch (level) {
    case 'mastered':
      return MASTERY_THRESHOLDS.MASTERED;
    case 'familiar':
      return MASTERY_THRESHOLDS.FAMILIAR;
    case 'basic':
      return MASTERY_THRESHOLDS.BASIC;
    case 'none':
    default:
      return MASTERY_THRESHOLDS.NONE;
  }
}

/**
 * MasteryProgressBar component for displaying track mastery progress.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <MasteryProgressBar level="basic" listenCount={3} />
 *
 * // With all props
 * <MasteryProgressBar
 *   level="familiar"
 *   listenCount={7}
 *   className="my-custom-class"
 *   compact={true}
 * />
 * ```
 */
export function MasteryProgressBar({
  level,
  listenCount,
  className = '',
  compact = false
}: MasteryProgressBarProps) {
  // Animate the progress value
  const [displayProgress, setDisplayProgress] = useState(0);

  // Track previous level for announcements
  const prevLevelRef = useRef<MasteryLevel>(level);

  // Screen reader announcement state
  const [announcement, setAnnouncement] = useState<string | null>(null);

  const nextLevelInfo = getNextLevelInfo(level);
  const currentThreshold = getCurrentThreshold(level);
  const isMastered = level === 'mastered';

  // Calculate progress percentage
  const progressPercent = useMemo(() => {
    if (isMastered || !nextLevelInfo) {
      return 100;
    }

    const rangeSize = nextLevelInfo.threshold - currentThreshold;
    const progressInRange = listenCount - currentThreshold;
    return Math.min(100, Math.round((progressInRange / rangeSize) * 100));
  }, [isMastered, nextLevelInfo, currentThreshold, listenCount]);

  // Calculate listens needed
  const listensNeeded = useMemo(() => {
    if (isMastered || !nextLevelInfo) {
      return 0;
    }
    return nextLevelInfo.threshold - listenCount;
  }, [isMastered, nextLevelInfo, listenCount]);

  // Animate progress changes
  useEffect(() => {
    // Skip animation on initial mount
    if (displayProgress === 0 && progressPercent === 0) {
      return;
    }

    const animationFrame = requestAnimationFrame(() => {
      setDisplayProgress(progressPercent);
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [progressPercent]);

  // Announce mastery level changes to screen readers
  useEffect(() => {
    if (prevLevelRef.current !== level && prevLevelRef.current !== 'none') {
      // Level has changed, announce it
      const newLabel = getMasteryLabel(level);
      const message = level === 'mastered'
        ? `Congratulations! Track ${newLabel}!`
        : `Mastery level increased to ${newLabel}`;

      // Set announcement with a slight delay to ensure live region picks it up
      setAnnouncement(message);

      // Clear announcement after it's been read
      const timeout = setTimeout(() => {
        setAnnouncement(null);
      }, 1000);

      return () => clearTimeout(timeout);
    }
    prevLevelRef.current = level;
  }, [level]);

  // Don't render for 'none' level with 0 listens (no progress to show)
  if (level === 'none' && listenCount === 0) {
    return null;
  }

  return (
    <>
      {/* Screen reader announcements for mastery level changes */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: '0',
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: '0'
        }}
      >
        {announcement}
      </div>

      <div
        className={`mastery-progress-bar ${compact ? 'mastery-progress-compact' : ''} ${className}`.trim()}
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Mastery progress: ${progressPercent}% toward ${nextLevelInfo?.label || 'Mastered'}`}
      >
      {/* Header with level info */}
      <div className="mastery-progress-header">
        <span className={`mastery-progress-level-indicator mastery-level-${level}`}>
          {getMasteryLabel(level)}
        </span>
        {!isMastered && nextLevelInfo && (
          <span className="mastery-progress-target">
            {listenCount}/{nextLevelInfo.threshold} to {nextLevelInfo.label}
          </span>
        )}
        {isMastered && (
          <span className="mastery-progress-complete">
            {listenCount} listens
          </span>
        )}
      </div>

      {/* Progress bar track and fill */}
      <div className="mastery-progress-track">
        <div
          className={`mastery-progress-fill mastery-level-fill-${level}`}
          style={{ width: `${displayProgress}%` }}
        />
      </div>

      {/* Footer hint (non-compact only) */}
      {!compact && !isMastered && nextLevelInfo && (
        <div className="mastery-progress-hint">
          {listensNeeded} more listen{listensNeeded !== 1 ? 's' : ''} to {nextLevelInfo.label}
        </div>
      )}

      {/* Footer for mastered */}
      {!compact && isMastered && (
        <div className="mastery-progress-hint mastery-progress-mastered-hint">
          Track fully mastered!
        </div>
      )}
      </div>
    </>
  );
}

export default MasteryProgressBar;
