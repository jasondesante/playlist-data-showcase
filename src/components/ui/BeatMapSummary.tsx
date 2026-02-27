/**
 * BeatMapSummary Component
 *
 * Displays a summary of the generated beat map after successful analysis.
 * Shows:
 * - Detected BPM (initial estimate)
 * - Total beats found
 * - Track duration
 * - "Start Practice Mode" button
 *
 * Part of Task 2.4: Beat Map Summary (After Analysis)
 */
import { Play, Music2 } from 'lucide-react';
import './BeatMapSummary.css';
import { Button } from './Button';
import type { BeatMap } from '@/types';

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
  return (
    <div className="beat-map-summary">
      {/* Header */}
      <div className="beat-map-summary-header">
        <Music2 className="beat-map-summary-icon" />
        <span className="beat-map-summary-title">Beat Map Ready</span>
      </div>

      {/* Stats Grid */}
      <div className="beat-map-summary-stats">
        {/* BPM */}
        <div className="beat-map-stat">
          <span className="beat-map-stat-value">{formatBpm(beatMap.bpm)}</span>
          <span className="beat-map-stat-label">BPM</span>
        </div>

        {/* Total Beats */}
        <div className="beat-map-stat">
          <span className="beat-map-stat-value">{formatBeatCount(beatMap.beats.length)}</span>
          <span className="beat-map-stat-label">Beats</span>
        </div>

        {/* Duration */}
        <div className="beat-map-stat">
          <span className="beat-map-stat-value">{formatDuration(beatMap.duration)}</span>
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
          leftIcon={Play}
        >
          Start Practice Mode
        </Button>
        <p className="beat-map-summary-note">
          Tap along to the beat and see your timing accuracy
        </p>
      </div>
    </div>
  );
}
