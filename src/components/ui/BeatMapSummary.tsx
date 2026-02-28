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
 * - Warnings for tracks with no clear beat (ambient, classical)
 *
 * Part of Task 2.4: Beat Map Summary (After Analysis)
 * Part of Task 7.2: Edge Cases - Very short tracks, no clear beat
 */
import { Play, Music2, AlertTriangle, Info, HelpCircle } from 'lucide-react';
import './BeatMapSummary.css';
import { Button } from './Button';
import type { BeatMap } from '@/types';

/** Minimum track duration for reliable beat detection (seconds) */
const MIN_TRACK_DURATION = 5;

/** Minimum beats required for a meaningful practice session */
const MIN_BEATS_FOR_PRACTICE = 4;

/** Maximum track duration for optimal performance (10 minutes in seconds) */
const LONG_TRACK_WARNING_THRESHOLD = 600;

/** Very long track threshold (30 minutes in seconds) - may cause performance issues */
const VERY_LONG_TRACK_THRESHOLD = 1800;

/** Minimum average beat confidence for reliable beat detection */
const MIN_AVERAGE_CONFIDENCE = 0.3;

/** Maximum allowed coefficient of variation in beat intervals (for consistent rhythm) */
const MAX_INTERVAL_VARIATION = 0.35;

/** Minimum beat density (beats per second) for a rhythmic track */
const MIN_BEAT_DENSITY = 0.5;

/**
 * Assess the quality of beat detection.
 * Returns quality level and issues found.
 */
function assessBeatQuality(beatMap: BeatMap): {
  quality: 'good' | 'low' | 'unreliable';
  issues: string[];
  averageConfidence: number;
  intervalVariation: number;
  beatDensity: number;
} {
  const beats = beatMap.beats;
  const issues: string[] = [];

  if (beats.length < 2) {
    return {
      quality: 'unreliable',
      issues: ['Not enough beats detected'],
      averageConfidence: 0,
      intervalVariation: 0,
      beatDensity: 0,
    };
  }

  // Calculate average confidence
  const avgConfidence = beats.reduce((sum, beat) => sum + (beat.confidence ?? 1), 0) / beats.length;

  // Calculate beat intervals and their variance
  const intervals: number[] = [];
  for (let i = 1; i < beats.length; i++) {
    intervals.push(beats[i].timestamp - beats[i - 1].timestamp);
  }

  const avgInterval = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;
  const intervalVariance = intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length;
  const intervalStdDev = Math.sqrt(intervalVariance);
  const coefficientOfVariation = avgInterval > 0 ? intervalStdDev / avgInterval : 1;

  // Calculate beat density (beats per second)
  const beatDensity = beats.length / beatMap.duration;

  // Determine quality issues
  if (avgConfidence < MIN_AVERAGE_CONFIDENCE) {
    issues.push('Low beat detection confidence');
  }

  if (coefficientOfVariation > MAX_INTERVAL_VARIATION) {
    issues.push('Irregular beat intervals');
  }

  if (beatDensity < MIN_BEAT_DENSITY) {
    issues.push('Sparse beat distribution');
  }

  // Determine overall quality
  let quality: 'good' | 'low' | 'unreliable';
  if (issues.length === 0) {
    quality = 'good';
  } else if (issues.length === 1 && avgConfidence >= MIN_AVERAGE_CONFIDENCE * 0.5) {
    quality = 'low';
  } else {
    quality = 'unreliable';
  }

  return {
    quality,
    issues,
    averageConfidence: avgConfidence,
    intervalVariation: coefficientOfVariation,
    beatDensity,
  };
}

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

  // Check for long track edge cases
  const isLongTrack = beatMap.duration > LONG_TRACK_WARNING_THRESHOLD;
  const isVeryLongTrack = beatMap.duration > VERY_LONG_TRACK_THRESHOLD;

  // Assess beat quality (Task 7.2: No clear beat handling)
  const beatQuality = assessBeatQuality(beatMap);
  const isLowQualityBeat = beatQuality.quality === 'low';
  const isUnreliableBeat = beatQuality.quality === 'unreliable';

  // Practice mode is disabled for unreliable beats (ambient, classical, etc.)
  // Low quality beats can still be practiced but with a warning
  const canStartPractice = beatMap.beats.length >= MIN_BEATS_FOR_PRACTICE && !isUnreliableBeat;

  // Determine warning message
  let warningMessage: string | null = null;
  if (beatMap.beats.length === 0) {
    warningMessage = 'No beats detected. This track may be too short or lack rhythmic content.';
  } else if (isUnreliableBeat) {
    // Unreliable beat detection - likely ambient, classical, or non-rhythmic
    warningMessage = 'No clear beat detected. This track appears to lack a steady rhythm (e.g., ambient or classical music). Practice mode is not available.';
  } else if (isShortTrack && hasInsufficientBeats) {
    warningMessage = `Track is very short (${formatDuration(beatMap.duration)}). Beat detection works best with tracks longer than ${MIN_TRACK_DURATION} seconds.`;
  } else if (hasInsufficientBeats) {
    warningMessage = `Only ${beatMap.beats.length} beat${beatMap.beats.length === 1 ? '' : 's'} detected. Practice mode requires at least ${MIN_BEATS_FOR_PRACTICE} beats.`;
  }

  // Low quality beat warning (can still practice but accuracy may be affected)
  let lowQualityWarning: string | null = null;
  if (!warningMessage && isLowQualityBeat) {
    lowQualityWarning = `Beat detection quality is reduced: ${beatQuality.issues.join(', ')}. Timing accuracy may be affected.`;
  }

  // Info message for long tracks (not a blocking warning)
  let infoMessage: string | null = null;
  if (isVeryLongTrack && !warningMessage && !lowQualityWarning) {
    infoMessage = `This is a very long track (${formatDuration(beatMap.duration)}). Performance may be reduced. Consider practicing with shorter sections.`;
  } else if (isLongTrack && !warningMessage && !lowQualityWarning) {
    infoMessage = `Long track detected (${formatDuration(beatMap.duration)} with ${formatBeatCount(beatMap.beats.length)} beats). Practice mode will work but may use more memory.`;
  }

  return (
    <div className="beat-map-summary">
      {/* Header */}
      <div className="beat-map-summary-header">
        <Music2 className="beat-map-summary-icon" />
        <span className="beat-map-summary-title">
          {beatMap.beats.length === 0 ? 'Beat Map Generated' : isUnreliableBeat ? 'Beat Detection Unreliable' : 'Beat Map Ready'}
        </span>
        {isLowQualityBeat && (
          <span className="beat-map-summary-quality-badge beat-map-summary-quality-badge--low">
            Low Quality
          </span>
        )}
        {isUnreliableBeat && (
          <span className="beat-map-summary-quality-badge beat-map-summary-quality-badge--unreliable">
            Unreliable
          </span>
        )}
      </div>

      {/* Warning for short tracks / insufficient beats / unreliable beats */}
      {warningMessage && (
        <div className="beat-map-summary-warning">
          <AlertTriangle className="beat-map-summary-warning-icon" />
          <span className="beat-map-summary-warning-text">{warningMessage}</span>
        </div>
      )}

      {/* Low quality beat warning (not blocking) */}
      {lowQualityWarning && (
        <div className="beat-map-summary-warning beat-map-summary-warning--low-quality">
          <HelpCircle className="beat-map-summary-warning-icon" />
          <span className="beat-map-summary-warning-text">{lowQualityWarning}</span>
        </div>
      )}

      {/* Info message for long tracks */}
      {infoMessage && !warningMessage && !lowQualityWarning && (
        <div className="beat-map-summary-info">
          <Info className="beat-map-summary-info-icon" />
          <span className="beat-map-summary-info-text">{infoMessage}</span>
        </div>
      )}

      {/* Stats Grid */}
      <div className="beat-map-summary-stats">
        {/* BPM */}
        <div className="beat-map-stat">
          <span className={`beat-map-stat-value ${isUnreliableBeat ? 'beat-map-stat-value--warning' : ''}`}>
            {formatBpm(beatMap.bpm)}
          </span>
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

      {/* Detection Settings (from metadata) - Task 6.2 */}
      <div className="beat-map-summary-settings">
        <span className="beat-map-settings-label">Settings used:</span>
        <div className="beat-map-settings-values">
          <span className="beat-map-settings-value">
            Sensitivity: {beatMap.metadata.sensitivity.toFixed(1)}
          </span>
          <span className="beat-map-settings-value">
            Filter: {beatMap.metadata.filter.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Beat Quality Indicators (for non-good quality) */}
      {beatQuality.quality !== 'good' && beatMap.beats.length >= 2 && (
        <div className="beat-map-quality-details">
          <span className="beat-map-quality-label">Detection Metrics:</span>
          <div className="beat-map-quality-metrics">
            <span className="beat-map-quality-metric">
              Confidence: {Math.round(beatQuality.averageConfidence * 100)}%
            </span>
            <span className="beat-map-quality-metric">
              Regularity: {Math.round((1 - beatQuality.intervalVariation) * 100)}%
            </span>
            <span className="beat-map-quality-metric">
              Density: {beatQuality.beatDensity.toFixed(2)}/s
            </span>
          </div>
        </div>
      )}

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
            {isUnreliableBeat
              ? 'Practice mode unavailable - no clear beat detected'
              : `Practice mode requires at least ${MIN_BEATS_FOR_PRACTICE} beats`}
          </p>
        ) : isLowQualityBeat ? (
          <p className="beat-map-summary-note beat-map-summary-note--warning">
            Practice mode available, but timing accuracy may be reduced
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
