/**
 * TapStats Component
 *
 * Displays running statistics for the beat detection practice mode.
 * Features:
 * - Total taps count
 * - Hit distribution (Perfect, Great, Good, Ok, Miss, Wrong Key)
 * - Average offset in milliseconds
 * - Standard deviation (timing consistency)
 * - Current streak
 * - Best streak
 * - Source breakdown (detected vs interpolated beats) - Task 6.4
 * - Reset Stats button
 *
 * Part of Task 5.3: TapStats Component
 * Updated Task 6.4: Source breakdown for detected vs interpolated beats
 * Updated Task 6.3: Wrong key count display
 */
import { useCallback } from 'react';
import { RotateCcw } from 'lucide-react';
import './TapStats.css';
import { useTapStatistics, useBeatDetectionStore } from '../../store/beatDetectionStore';
import { Button } from './Button';

interface TapStatsProps {
  /** Optional className for additional styling */
  className?: string;
  /** Whether to show the reset button (default: true) */
  showResetButton?: boolean;
  /** Compact mode for smaller displays */
  compact?: boolean;
}

/**
 * Format a number to a fixed decimal places, but return '0' for 0
 */
function formatNumber(value: number, decimals: number = 1): string {
  if (value === 0) return '0';
  return value.toFixed(decimals);
}

/**
 * TapStats Component
 *
 * Renders a statistics panel showing tap accuracy metrics
 * for the rhythm game practice mode.
 */
export function TapStats({
  className = '',
  showResetButton = true,
  compact = false,
}: TapStatsProps) {
  const stats = useTapStatistics();
  const clearTapHistory = useBeatDetectionStore((state) => state.actions.clearTapHistory);

  /**
   * Handle reset button click
   */
  const handleReset = useCallback(() => {
    clearTapHistory();
  }, [clearTapHistory]);

  // Check if we have source breakdown data (Task 6.4)
  // Only show the breakdown section if there's at least one tap with source info
  const hasSourceData = stats.detectedBeatsTotal > 0 || stats.interpolatedBeatsTotal > 0;

  const containerClasses = [
    'tap-stats',
    compact ? 'tap-stats--compact' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      {/* Header with title and reset button */}
      <div className="tap-stats__header">
        <span className="tap-stats__title">Tap Statistics</span>
        {showResetButton && stats.totalTaps > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            leftIcon={RotateCcw}
            aria-label="Reset statistics"
            className="tap-stats__reset-btn"
          >
            Reset
          </Button>
        )}
      </div>

      {/* Main stats grid */}
      <div className="tap-stats__grid">
        {/* Hit distribution row */}
        <div className="tap-stats__row tap-stats__row--hits">
          <div className="tap-stats__item">
            <span className="tap-stats__value">{stats.totalTaps}</span>
            <span className="tap-stats__label">Total</span>
          </div>
          <div className="tap-stats__item tap-stats__item--perfect">
            <span className="tap-stats__value">{stats.perfect}</span>
            <span className="tap-stats__label">Perfect</span>
          </div>
          <div className="tap-stats__item tap-stats__item--great">
            <span className="tap-stats__value">{stats.great}</span>
            <span className="tap-stats__label">Great</span>
          </div>
          <div className="tap-stats__item tap-stats__item--good">
            <span className="tap-stats__value">{stats.good}</span>
            <span className="tap-stats__label">Good</span>
          </div>
          <div className="tap-stats__item tap-stats__item--ok">
            <span className="tap-stats__value">{stats.ok}</span>
            <span className="tap-stats__label">Ok</span>
          </div>
          <div className="tap-stats__item tap-stats__item--miss">
            <span className="tap-stats__value">{stats.miss}</span>
            <span className="tap-stats__label">Miss</span>
          </div>
          <div className="tap-stats__item tap-stats__item--wrong-key">
            <span className="tap-stats__value">{stats.wrongKey}</span>
            <span className="tap-stats__label">Wrong</span>
          </div>
        </div>

        {/* Timing stats row */}
        <div className="tap-stats__row">
          <div className="tap-stats__item">
            <span className="tap-stats__value">{formatNumber(stats.averageOffset)}ms</span>
            <span className="tap-stats__label">Avg Offset</span>
          </div>
          <div className="tap-stats__item">
            <span className="tap-stats__value">{formatNumber(stats.standardDeviation)}ms</span>
            <span className="tap-stats__label">Std Dev</span>
          </div>
          <div className="tap-stats__item">
            <span className="tap-stats__value">{stats.currentStreak}</span>
            <span className="tap-stats__label">Streak</span>
          </div>
          <div className="tap-stats__item">
            <span className="tap-stats__value">{stats.bestStreak}</span>
            <span className="tap-stats__label">Best</span>
          </div>
        </div>

        {/* Source breakdown row (Task 6.4) - only shown when using interpolated beat map */}
        {hasSourceData && (
          <div className="tap-stats__row tap-stats__row--source">
            <div className="tap-stats__item tap-stats__item--detected">
              <span className="tap-stats__value">
                {stats.detectedBeatsHit}/{stats.detectedBeatsTotal}
              </span>
              <span className="tap-stats__label">Detected</span>
            </div>
            <div className="tap-stats__item tap-stats__item--interpolated">
              <span className="tap-stats__value">
                {stats.interpolatedBeatsHit}/{stats.interpolatedBeatsTotal}
              </span>
              <span className="tap-stats__label">Interpolated</span>
            </div>
          </div>
        )}
      </div>

      {/* Empty state */}
      {stats.totalTaps === 0 && (
        <div className="tap-stats__empty">
          <span className="tap-stats__empty-text">No taps yet. Start tapping to see your stats!</span>
        </div>
      )}
    </div>
  );
}
