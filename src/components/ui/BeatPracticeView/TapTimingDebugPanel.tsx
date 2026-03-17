/**
 * TapTimingDebugPanel Component
 *
 * Debug panel for analyzing tap timing and accuracy during practice.
 * Shows tap history with visual offset comparison against thresholds.
 *
 * Extracted from BeatPracticeView.tsx
 */
import { List } from 'react-window';
import { Clock, Target } from 'lucide-react';
import type { AccuracyThresholds, DifficultyPreset, ExtendedBeatAccuracy, TapStatistics, RhythmSessionTotals } from '../../../types';
import './TapTimingDebugPanel.css';

/**
 * Debug info for a single tap - helps track input latency
 */
export interface TapDebugInfo {
  /** When the tap was registered (performance.now()) */
  registeredAt: number;
  /** Audio time at the moment of tap */
  audioTime: number;
  /** The beat that was matched */
  beatTime: number;
  /** Calculated offset in ms */
  offsetMs: number;
  /** Accuracy rating (includes 'ok') */
  accuracy: ExtendedBeatAccuracy;
  /** Raw score from hit (10 for perfect, 7 for great, etc.) - Phase 6: Task 6.1 */
  scorePoints?: number;
  /** XP earned (after ratio applied) - Phase 6: Task 6.1 */
  characterXP?: number;
  /** Total multiplier applied - Phase 6: Task 6.1 */
  multiplier?: number;
}

/**
 * Props for the virtualized tap row (passed via rowProps)
 */
export interface TapRowProps {
  taps: TapDebugInfo[];
  accuracyThresholds: AccuracyThresholds;
}

/**
 * Format threshold value for display (convert seconds to ms)
 */
function formatThresholdMs(seconds: number): string {
  return `${Math.round(seconds * 1000)}ms`;
}

/**
 * Get display info for a difficulty preset
 */
function getDifficultyDisplayInfo(preset: DifficultyPreset): { label: string; className: string } {
  switch (preset) {
    case 'easy':
      return { label: 'Easy', className: 'beat-practice-difficulty--easy' };
    case 'medium':
      return { label: 'Medium', className: 'beat-practice-difficulty--medium' };
    case 'hard':
      return { label: 'Hard', className: 'beat-practice-difficulty--hard' };
    case 'custom':
      return { label: 'Custom', className: 'beat-practice-difficulty--custom' };
    default:
      return { label: 'Medium', className: 'beat-practice-difficulty--medium' };
  }
}

/**
 * Row renderer for react-window virtualized tap history list
 */
function TapRow({
  index,
  style,
  taps,
  accuracyThresholds,
}: {
  index: number;
  style: React.CSSProperties;
  taps: TapDebugInfo[];
  accuracyThresholds: AccuracyThresholds;
}) {
  const tap = taps[index];

  if (!tap) return null;

  // Calculate position percentage for visual comparison
  const maxOffsetMs = Math.round(accuracyThresholds.ok * 1000);
  const clampedOffset = Math.max(-maxOffsetMs, Math.min(maxOffsetMs, tap.offsetMs));
  const positionPercent = ((clampedOffset + maxOffsetMs) / (maxOffsetMs * 2)) * 100;

  // Calculate threshold boundaries for visualization
  const perfectMs = Math.round(accuracyThresholds.perfect * 1000);
  const greatMs = Math.round(accuracyThresholds.great * 1000);
  const goodMs = Math.round(accuracyThresholds.good * 1000);
  const okMs = Math.round(accuracyThresholds.ok * 1000);

  // Calculate zone widths (each side from center)
  const perfectWidth = (perfectMs / okMs) * 50;
  const greatWidth = (greatMs / okMs) * 50;
  const goodWidth = (goodMs / okMs) * 50;

  return (
    <div style={style}>
      <div className={`beat-practice-debug-tap beat-practice-debug-tap--${tap.accuracy}`}>
        <div className="beat-practice-debug-tap-main">
          <span className="beat-practice-debug-accuracy">{tap.accuracy.toUpperCase()}</span>
          <span className="beat-practice-debug-offset">
            {tap.offsetMs >= 0 ? '+' : ''}{tap.offsetMs}ms
          </span>
        </div>

        {/* Phase 6: Task 6.1 - XP Stats Display */}
        {(tap.scorePoints !== undefined || tap.characterXP !== undefined) && (
          <div className="beat-practice-debug-tap-xp">
            <span className={`beat-practice-debug-score beat-practice-debug-score--${tap.accuracy}`}>
              {tap.scorePoints ?? 0}pts
            </span>
            <span className="beat-practice-debug-xp">
              +{(tap.characterXP ?? 0).toFixed(1)} XP
            </span>
            <span className={`beat-practice-debug-multiplier ${(tap.multiplier ?? 1) > 1 ? 'beat-practice-debug-multiplier--active' : ''}`}>
              {(tap.multiplier ?? 1) > 1 ? `${(tap.multiplier ?? 1).toFixed(1)}x` : '-'}
            </span>
          </div>
        )}

        {/* Visual threshold comparison bar */}
        <div className="beat-practice-debug-tap-visual">
          <div className="beat-practice-debug-threshold-bar">
            <div className="beat-practice-debug-zone beat-practice-debug-zone--miss-left" />
            <div
              className="beat-practice-debug-zone beat-practice-debug-zone--ok"
              style={{ left: `${50 - goodWidth}%`, right: `${50 - goodWidth}%` }}
            />
            <div
              className="beat-practice-debug-zone beat-practice-debug-zone--good"
              style={{ left: `${50 - greatWidth}%`, right: `${50 - greatWidth}%` }}
            />
            <div
              className="beat-practice-debug-zone beat-practice-debug-zone--great"
              style={{ left: `${50 - perfectWidth}%`, right: `${50 - perfectWidth}%` }}
            />
            <div
              className="beat-practice-debug-zone beat-practice-debug-zone--perfect"
              style={{ left: `${50 - perfectWidth}%`, right: `${50 - perfectWidth}%` }}
            />
            <div className="beat-practice-debug-center-line" />
            <div
              className="beat-practice-debug-tap-marker"
              style={{ left: `${positionPercent}%` }}
            />
          </div>
          <div className="beat-practice-debug-scale">
            <span>-{okMs}ms</span>
            <span>0</span>
            <span>+{okMs}ms</span>
          </div>
        </div>

        <div className="beat-practice-debug-tap-details">
          <span>Audio: {tap.audioTime.toFixed(3)}s</span>
          <span>Beat: {tap.beatTime.toFixed(3)}s</span>
        </div>
      </div>
    </div>
  );
}

interface TapTimingDebugPanelProps {
  /** Array of tap debug info for history display */
  tapHistory: TapDebugInfo[];
  /** Session tap statistics */
  tapStats: TapStatistics;
  /** Current accuracy thresholds */
  accuracyThresholds: AccuracyThresholds;
  /** Current difficulty preset */
  difficultyPreset: DifficultyPreset;
  /** Rhythm XP session totals */
  rhythmSessionTotals: RhythmSessionTotals | null;
}

// Virtualization constants for react-window
const TAP_ITEM_HEIGHT = 80; // Height of each tap item in pixels
const TAP_LIST_HEIGHT = 300; // Max height of the visible container

export function TapTimingDebugPanel({
  tapHistory,
  tapStats,
  accuracyThresholds,
  difficultyPreset,
  rhythmSessionTotals,
}: TapTimingDebugPanelProps) {
  const difficultyInfo = getDifficultyDisplayInfo(difficultyPreset);

  return (
    <div className="beat-practice-debug-panel">
      <div className="beat-practice-debug-header">
        <Clock className="beat-practice-debug-icon" />
        <span>TAP TIMING DEBUG</span>
        <span className="beat-practice-debug-hint">({tapHistory.length} taps this session)</span>
      </div>

      {/* Session Stats Summary */}
      {tapHistory.length > 0 && (
        <div className="beat-practice-debug-session-stats">
          <div className="beat-practice-debug-session-stat">
            <span className="beat-practice-debug-session-value">{tapStats.accuracyPercentage}%</span>
            <span className="beat-practice-debug-session-label">Accuracy</span>
          </div>
          <div className="beat-practice-debug-session-stat">
            <span className="beat-practice-debug-session-value">{tapStats.averageOffset}ms</span>
            <span className="beat-practice-debug-session-label">Avg Deviation</span>
          </div>
          <div className="beat-practice-debug-session-stat">
            <span className="beat-practice-debug-session-value">{tapStats.totalDeviation}ms</span>
            <span className="beat-practice-debug-session-label">Total Deviation</span>
          </div>
          <div className="beat-practice-debug-session-stat">
            <span className="beat-practice-debug-session-value">{tapStats.totalTaps}</span>
            <span className="beat-practice-debug-session-label">Total Taps</span>
          </div>
          <div className="beat-practice-debug-session-stat">
            <span className="beat-practice-debug-session-value">{tapStats.miss}</span>
            <span className="beat-practice-debug-session-label">Missed Taps</span>
          </div>
          {/* Phase 6: Task 6.3 - Total XP in debug panel session stats */}
          <div className="beat-practice-debug-session-stat beat-practice-debug-session-stat--xp">
            <span className="beat-practice-debug-session-value beat-practice-debug-session-value--xp">
              {(rhythmSessionTotals?.totalXP ?? 0).toFixed(1)}
            </span>
            <span className="beat-practice-debug-session-label">Total XP</span>
          </div>
        </div>
      )}

      {/* Active Thresholds Display */}
      <div className="beat-practice-debug-thresholds">
        <div className="beat-practice-debug-thresholds-header">
          <Target className="beat-practice-debug-thresholds-icon" />
          <span>Active Thresholds</span>
          <span className={`beat-practice-debug-thresholds-preset ${difficultyInfo.className}`}>
            {difficultyInfo.label}
          </span>
        </div>
        <div className="beat-practice-debug-thresholds-values">
          <div className="beat-practice-debug-threshold beat-practice-debug-threshold--perfect">
            <span className="beat-practice-debug-threshold-label">Perfect</span>
            <span className="beat-practice-debug-threshold-value">±{formatThresholdMs(accuracyThresholds.perfect)}</span>
          </div>
          <div className="beat-practice-debug-threshold beat-practice-debug-threshold--great">
            <span className="beat-practice-debug-threshold-label">Great</span>
            <span className="beat-practice-debug-threshold-value">±{formatThresholdMs(accuracyThresholds.great)}</span>
          </div>
          <div className="beat-practice-debug-threshold beat-practice-debug-threshold--good">
            <span className="beat-practice-debug-threshold-label">Good</span>
            <span className="beat-practice-debug-threshold-value">±{formatThresholdMs(accuracyThresholds.good)}</span>
          </div>
          <div className="beat-practice-debug-threshold beat-practice-debug-threshold--ok">
            <span className="beat-practice-debug-threshold-label">OK</span>
            <span className="beat-practice-debug-threshold-value">±{formatThresholdMs(accuracyThresholds.ok)}</span>
          </div>
        </div>
      </div>

      {tapHistory.length === 0 ? (
        <div className="beat-practice-debug-empty">Tap to see timing details...</div>
      ) : (
        <List<TapRowProps>
          className="beat-practice-debug-taps beat-practice-debug-taps--virtualized"
          style={{ height: TAP_LIST_HEIGHT }}
          rowCount={tapHistory.length}
          rowHeight={TAP_ITEM_HEIGHT}
          rowComponent={TapRow}
          rowProps={{
            taps: tapHistory,
            accuracyThresholds,
          }}
        />
      )}
    </div>
  );
}

// Export helper functions for potential reuse
export { formatThresholdMs, getDifficultyDisplayInfo };
