/**
 * PracticeStatsBar Component
 *
 * Displays real-time practice statistics including BPM, position, Duration,
 * Rhythm XP stats, and current subdivision information.
 *
 * Part of the BeatPracticeView refactoring.
 */

import { RhythmXPStats } from '../RhythmXPStats';
import type { RhythmSessionTotals, RhythmXPResult, TempoSection } from '../../../types';

interface PracticeStatsBarProps {
  /** Current rolling BPM from beat stream */
  currentBpm: number;
  /** Base BPM from the beat map */
  beatMapBpm: number;
  /** Interpolation statistics for multi-tempo display */
  interpolationStats: {
    hasMultiTempoApplied: boolean;
    tempoSections: TempoSection[] | null;
  } | null;
  /** Current playback position in seconds */
  currentTime: number;
  /** Total track duration in seconds */
  duration: number;
  /** Rhythm XP session totals for display */
  rhythmSessionTotals: RhythmSessionTotals | null;
  /** Last rhythm XP result for display */
  lastRhythmXPResult: RhythmXPResult | null;
  /** Current combo count */
  currentCombo: number;
  /** Whether subdivision playback is available */
  subdivisionPlaybackAvailable: boolean;
  /** Current subdivision type */
  currentSubdivision: string;
  /** Whether subdivision playback is currently active */
  subdivisionIsActive: boolean;
}

/**
 * Format time in seconds to MM:SS format
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function PracticeStatsBar({
  currentBpm,
  beatMapBpm,
  interpolationStats,
  currentTime,
  duration,
  rhythmSessionTotals,
  lastRhythmXPResult,
  currentCombo,
  subdivisionPlaybackAvailable,
  currentSubdivision,
  subdivisionIsActive,
}: PracticeStatsBarProps) {
  return (
    <div className="beat-practice-stats">
      <div className="beat-practice-stat">
        <span className={`beat-practice-stat-value ${currentBpm > 0 ? 'beat-practice-stat-value--live' : ''}`}>
          {Math.round(currentBpm) || Math.round(beatMapBpm)}
        </span>
        <span className="beat-practice-stat-label">
          BPM
          {currentBpm > 0 && <span className="beat-practice-bpm-indicator">rolling</span>}
        </span>
        {/* Multi-tempo indicator (Phase 4: Task 4.1) */}
        {interpolationStats?.hasMultiTempoApplied && interpolationStats.tempoSections && interpolationStats.tempoSections.length > 1 && (
          <span className="beat-practice-multi-tempo-indicator">
            {Math.round(Math.min(...interpolationStats.tempoSections.map(s => s.bpm)))}-{Math.round(Math.max(...interpolationStats.tempoSections.map(s => s.bpm)))} BPM ({interpolationStats.tempoSections.length} sections)
          </span>
        )}
      </div>
      <div className="beat-practice-stat">
        <span className="beat-practice-stat-value">{formatTime(currentTime)}</span>
        <span className="beat-practice-stat-label">Position</span>
      </div>
      <div className="beat-practice-stat">
        <span className="beat-practice-stat-value">{formatTime(duration)}</span>
        <span className="beat-practice-stat-label">Duration</span>
      </div>
      {/* Rhythm XP Stats (Phase 3: Task 3.3 - Real-Time XP Display) */}
      <RhythmXPStats
        sessionTotals={rhythmSessionTotals}
        lastResult={lastRhythmXPResult}
        currentCombo={currentCombo}
      />
      {/* Current Subdivision Display (Phase 6: Task 6.5, Phase 8: Task 8.3) */}
      {subdivisionPlaybackAvailable && (
        <div
          className="beat-practice-stat beat-practice-stat--subdivision"
          data-subdivision={currentSubdivision}
        >
          <span className={`beat-practice-stat-value beat-practice-stat-value--subdivision ${subdivisionIsActive ? 'beat-practice-stat-value--subdivision-active' : ''}`}>
            {currentSubdivision}
          </span>
          <span className="beat-practice-stat-label">
            Subdivision
            {subdivisionIsActive && currentSubdivision !== 'quarter' && <span className="beat-practice-subdivision-indicator">live</span>}
          </span>
        </div>
      )}
    </div>
  );
}
