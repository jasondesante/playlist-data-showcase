/**
 * GrooveStats Component
 *
 * Displays session statistics for the groove meter - best hotness and streak
 * achieved during the current practice session.
 *
 * Features:
 * - Display best hotness achieved in session
 * - Display best streak achieved in session
 * - Optional current vs best comparison
 * - Trophy/badge icon for best achievements
 * - Color coding for achievement levels
 *
 * Part of Phase 4: Task 4.1 - Create GrooveStats Component
 */

import { cn } from '../../utils/cn';
import './GrooveStats.css';

export interface GrooveStatsProps {
  /** Best hotness value achieved in session (0-100) */
  bestHotness: number;
  /** Best streak achieved in session */
  bestStreak: number;
  /** Current hotness value (optional, for comparison) */
  currentHotness?: number;
  /** Current streak (optional, for comparison) */
  currentStreak?: number;
  /** Show current vs best comparison */
  showComparison?: boolean;
  /** Optional className for additional styling */
  className?: string;
}

/**
 * Get the achievement level based on hotness value
 */
function getHotnessLevel(hotness: number): {
  label: string;
  className: string;
} {
  if (hotness >= 90) return { label: 'On Fire!', className: 'groove-stats__stat--on-fire' };
  if (hotness >= 75) return { label: 'Hot', className: 'groove-stats__stat--hot' };
  if (hotness >= 50) return { label: 'Warm', className: 'groove-stats__stat--warm' };
  if (hotness >= 25) return { label: 'Building', className: 'groove-stats__stat--cool' };
  return { label: 'Starting', className: 'groove-stats__stat--cold' };
}

/**
 * GrooveStats Component
 *
 * Renders session statistics for groove performance with trophy icons
 * and color-coded achievement levels.
 */
export function GrooveStats({
  bestHotness,
  bestStreak,
  currentHotness,
  currentStreak,
  showComparison = false,
  className,
}: GrooveStatsProps) {
  const hotnessLevel = getHotnessLevel(bestHotness);

  // Calculate progress to next milestone (25, 50, 75, 90, 100)
  const milestones = [25, 50, 75, 90, 100];
  const nextMilestone = milestones.find((m) => m > bestHotness) || 100;
  const prevMilestone = milestones.filter((m) => m <= bestHotness).pop() || 0;
  const progressToNext =
    nextMilestone > prevMilestone
      ? ((bestHotness - prevMilestone) / (nextMilestone - prevMilestone)) * 100
      : 100;

  return (
    <div className={cn('groove-stats', className)}>
      <div className="groove-stats__header">
        <span className="groove-stats__title">Session Best</span>
      </div>

      <div className="groove-stats__stats">
        {/* Best Hotness */}
        <div className={cn('groove-stats__stat', hotnessLevel.className)}>
          <div className="groove-stats__stat-icon">
            <span className="groove-stats__trophy">🏆</span>
          </div>
          <div className="groove-stats__stat-content">
            <div className="groove-stats__stat-label">Best Hotness</div>
            <div className="groove-stats__stat-value">
              {Math.round(bestHotness)}
              <span className="groove-stats__stat-unit">%</span>
            </div>
            <div className="groove-stats__stat-badge">{hotnessLevel.label}</div>
          </div>
          {/* Progress to next milestone */}
          {bestHotness < 100 && (
            <div className="groove-stats__milestone-track">
              <div
                className="groove-stats__milestone-fill"
                style={{ width: `${progressToNext}%` }}
              />
            </div>
          )}
        </div>

        {/* Best Streak */}
        <div className="groove-stats__stat groove-stats__stat--streak">
          <div className="groove-stats__stat-icon">
            <span className="groove-stats__fire">🔥</span>
          </div>
          <div className="groove-stats__stat-content">
            <div className="groove-stats__stat-label">Best Streak</div>
            <div className="groove-stats__stat-value">
              {bestStreak}
              <span className="groove-stats__stat-unit">hits</span>
            </div>
          </div>
        </div>

        {/* Current vs Best Comparison */}
        {showComparison && (
          <div className="groove-stats__comparison">
            <div className="groove-stats__comparison-row">
              <span className="groove-stats__comparison-label">Current</span>
              <span className="groove-stats__comparison-current">
                {Math.round(currentHotness ?? 0)}% / {currentStreak ?? 0}
              </span>
            </div>
            <div className="groove-stats__comparison-bar">
              <div
                className="groove-stats__comparison-fill groove-stats__comparison-fill--current"
                style={{ width: `${Math.min(100, currentHotness ?? 0)}%` }}
              />
              <div
                className="groove-stats__comparison-fill groove-stats__comparison-fill--best"
                style={{ width: `${Math.min(100, bestHotness)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GrooveStats;
