import { useEffect, useState, useMemo, useRef } from 'react';
import type { PrestigeLevel } from '@/types';
import './MasteryProgressBar.css';

/**
 * MasteryProgressBar Component
 *
 * Displays a dual progress bar showing progress toward mastery.
 * Shows progress for both plays AND XP requirements.
 *
 * Features:
 * - Dual progress bars (plays and XP)
 * - Animated fill when progress changes
 * - Prestige-aware thresholds
 * - Special display when mastered
 */

export interface MasteryProgressBarProps {
  /** Number of times the track has been listened to */
  listenCount: number;
  /** Total XP earned for this track */
  totalXP: number;
  /** Plays threshold for current prestige level */
  playsThreshold: number;
  /** XP threshold for current prestige level */
  xpThreshold: number;
  /** Progress toward plays threshold (0-1) */
  playsProgress?: number;
  /** Progress toward XP threshold (0-1) */
  xpProgress?: number;
  /** Whether the track is mastered */
  isMastered: boolean;
  /** Current prestige level */
  prestigeLevel?: PrestigeLevel;
  /** Roman numeral for prestige level */
  prestigeRoman?: string;
  /** Whether at max prestige level */
  isMaxPrestige?: boolean;
  /** Optional additional CSS class name */
  className?: string;
  /** Whether to show compact mode */
  compact?: boolean;
}

/**
 * MasteryProgressBar component for displaying track mastery progress.
 *
 * @example
 * ```tsx
 * <MasteryProgressBar
 *   listenCount={5}
 *   totalXP={500}
 *   playsThreshold={10}
 *   xpThreshold={1000}
 *   isMastered={false}
 * />
 * ```
 */
export function MasteryProgressBar({
  listenCount,
  totalXP,
  playsThreshold,
  xpThreshold,
  isMastered,
  prestigeRoman = '',
  isMaxPrestige = false,
  className = '',
  compact = false
}: MasteryProgressBarProps) {
  // Animate the progress values
  const [displayPlaysProgress, setDisplayPlaysProgress] = useState(0);
  const [displayXPProgress, setDisplayXPProgress] = useState(0);

  // Screen reader announcement state
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const prevMasteredRef = useRef(isMastered);

  // Calculate progress percentages
  const playsProgressPercent = useMemo(() => {
    return Math.min(100, Math.round((listenCount / playsThreshold) * 100));
  }, [listenCount, playsThreshold]);

  const xpProgressPercent = useMemo(() => {
    return Math.min(100, Math.round((totalXP / xpThreshold) * 100));
  }, [totalXP, xpThreshold]);

  // Calculate remaining needs
  const playsNeeded = Math.max(0, playsThreshold - listenCount);
  const xpNeeded = Math.max(0, xpThreshold - totalXP);

  // Animate progress changes
  useEffect(() => {
    const animationFrame = requestAnimationFrame(() => {
      setDisplayPlaysProgress(playsProgressPercent);
      setDisplayXPProgress(xpProgressPercent);
    });
    return () => cancelAnimationFrame(animationFrame);
  }, [playsProgressPercent, xpProgressPercent]);

  // Announce mastery changes to screen readers
  useEffect(() => {
    if (!prevMasteredRef.current && isMastered) {
      const message = isMaxPrestige
        ? 'Congratulations! Track fully mastered at max prestige!'
        : prestigeRoman
          ? `Congratulations! Track mastered at Prestige ${prestigeRoman}!`
          : 'Congratulations! Track mastered!';

      setAnnouncement(message);
      const timeout = setTimeout(() => setAnnouncement(null), 1000);
      return () => clearTimeout(timeout);
    }
    prevMasteredRef.current = isMastered;
  }, [isMastered, isMaxPrestige, prestigeRoman]);

  // Get status label
  const getStatusLabel = () => {
    if (isMaxPrestige) return 'MAX PRESTIGE';
    if (isMastered) return prestigeRoman ? `Mastered (${prestigeRoman})` : 'Mastered';
    return 'In Progress';
  };

  return (
    <>
      {/* Screen reader announcements */}
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
        className={`mastery-progress-bar ${compact ? 'mastery-progress-compact' : ''} ${isMastered ? 'mastery-progress-mastered' : ''} ${className}`.trim()}
        role="progressbar"
        aria-valuenow={Math.min(playsProgressPercent, xpProgressPercent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Mastery progress: ${playsProgressPercent}% plays, ${xpProgressPercent}% XP`}
      >
        {/* Header with status */}
        <div className="mastery-progress-header">
          <span className={`mastery-progress-level-indicator ${isMastered ? 'mastered' : ''}`}>
            {getStatusLabel()}
          </span>
        </div>

        {/* Plays Progress */}
        <div className="mastery-progress-section">
          <div className="mastery-progress-label">
            <span>Plays</span>
            <span className="mastery-progress-count">
              {listenCount}/{playsThreshold}
            </span>
          </div>
          <div className="mastery-progress-track">
            <div
              className={`mastery-progress-fill ${isMastered ? 'mastered' : ''}`}
              style={{ width: `${displayPlaysProgress}%` }}
            />
          </div>
        </div>

        {/* XP Progress */}
        <div className="mastery-progress-section">
          <div className="mastery-progress-label">
            <span>XP</span>
            <span className="mastery-progress-count">
              {totalXP.toLocaleString()}/{xpThreshold.toLocaleString()}
            </span>
          </div>
          <div className="mastery-progress-track">
            <div
              className={`mastery-progress-fill xp ${isMastered ? 'mastered' : ''}`}
              style={{ width: `${displayXPProgress}%` }}
            />
          </div>
        </div>

        {/* Footer hint */}
        {!compact && !isMastered && (
          <div className="mastery-progress-hint">
            Need {playsNeeded} more play{playsNeeded !== 1 ? 's' : ''} and {xpNeeded.toLocaleString()} more XP
          </div>
        )}

        {!compact && isMastered && (
          <div className="mastery-progress-hint mastery-progress-mastered-hint">
            {isMaxPrestige ? 'Maximum prestige achieved!' : 'Track mastered - ready to prestige!'}
          </div>
        )}
      </div>
    </>
  );
}

export default MasteryProgressBar;
