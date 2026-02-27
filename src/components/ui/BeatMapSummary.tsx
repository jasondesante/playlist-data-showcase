/**
 * BeatMapSummary Component
 *
 * Displays a summary of the generated beat map after successful analysis.
 * Shows:
 * - Detected BPM (initial estimate)
 * - Total beats found
 * - Track duration
 * - "Start Practice Mode" button
 * - Warnings for very short tracks or insufficient beats
 *
 * Part of Task 2.4: Beat Map Summary (After Analysis)
 * Part of Task 7.2: Edge Cases - Very short tracks (< 10 seconds)
 */
import { Play, Music2, AlertTriangle } from 'lucide-react';
import './BeatMapSummary.css';
import { Button } from './Button';
import type { BeatMap } from '@/types';

/** Minimum track duration for reliable beat detection (seconds) */
const MIN_TRACK_DURATION = 5;

/** Minimum beats required for a meaningful practice session */
const MIN_BEATS_FOR_PRACTICE = 4;

interface BeatMapSummaryProps {
  /** The generated beat map */
  beatMap: BeatMap;
  /** Callback when "Start Practice Mode" is clicked */
  onStartPractice: () => void;
  /** Whether practice mode is currently being initialized */
  isLoading?: boolean;
}

/**
 * Format duration in seconds to a human-readable string (MM:SS)
 */
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Format BPM to a display-friendly string
 */
function formatBpm(bpm: number): string {
  return Math.round(bpm).toString();
}

/**
 * Format beat count with comma separators for large numbers
 */
function formatBeatCount(count: number): string {
  return count.toLocaleString();
}

export function BeatMapSummary({
  beatMap,
  onStartPractice,
  isLoading = false,
}: BeatMapSummaryProps) {
  // Check for edge cases with short tracks
  const isShortTrack = beatMap.duration < MIN_TRACK_DURATION;
  const hasInsufficientBeats = beatMap.beats.length < MIN_BEATS_FOR_PRACTICE;
  const canStartPractice = beatMap.beats.length >= MIN_BEATS_FOR_PRACTICE;

  // Determine warning message
  let warningMessage: string | null = null;
  if (beatMap.beats.length === 0) {
    warningMessage = 'No beats detected. This track may be too short or lack rhythmic content.';
  } else if (isShortTrack && hasInsufficientBeats) {
    warningMessage = `Track is very short (${formatDuration(beatMap.duration)}). Beat detection works best with tracks longer than ${MIN_TRACK_DURATION} seconds.`;
  } else if (hasInsufficientBeats) {
    warningMessage = `Only ${beatMap.beats.length} beat${beatMap.beats.length === 1 ? '' : 's'} detected. Practice mode requires at least ${MIN_BEATS_FOR_PRACTICE} beats.`;
  }

  return (
    <div className="beat-map-summary">
      {/* Header */}
      <div className="beat-map-summary-header">
        <Music2 className="beat-map-summary-icon" />
        <span className="beat-map-summary-title">
          {beatMap.beats.length === 0 ? 'Beat Map Generated' : 'Beat Map Ready'}
        </span>
      </div>

      {/* Warning for short tracks / insufficient beats */}
      {warningMessage && (
        <div className="beat-map-summary-warning">
          <AlertTriangle className="beat-map-summary-warning-icon" />
          <span className="beat-map-summary-warning-text">{warningMessage}</span>
        </div>
      )}

      {/* Stats Grid */}
      <div className="beat-map-summary-stats">
        {/* BPM */}
        <div className="beat-map-stat">
          <span className="beat-map-stat-value">{formatBpm(beatMap.bpm)}</span>
          <span className="beat-map-stat-label">BPM</span>
        </div>

        {/* Total Beats */}
        <div className="beat-map-stat">
          <span className={`beat-map-stat-value ${hasInsufficientBeats ? 'beat-map-stat-value--warning' : ''}`}>
            {formatBeatCount(beatMap.beats.length)}
          </span>
          <span className="beat-map-stat-label">Beats</span>
        </div>

        {/* Duration */}
        <div className="beat-map-stat">
          <span className={`beat-map-stat-value ${isShortTrack ? 'beat-map-stat-value--warning' : ''}`}>
            {formatDuration(beatMap.duration)}
          </span>
          <span className="beat-map-stat-label">Duration</span>
        </div>
      </div>

      {/* Actions */}
      <div className="beat-map-summary-actions">
        <Button
          variant="primary"
          size="lg"
          className="beat-map-summary-button"
          onClick={onStartPractice}
          isLoading={isLoading}
          disabled={!canStartPractice}
          leftIcon={Play}
        >
          Start Practice Mode
        </Button>
        {!canStartPractice ? (
          <p className="beat-map-summary-note beat-map-summary-note--disabled">
            Practice mode requires at least {MIN_BEATS_FOR_PRACTICE} beats
          </p>
        ) : (
          <p className="beat-map-summary-note">
            Tap along to the beat and see your timing accuracy
          </p>
        )}
      </div>
    </div>
  );
}
