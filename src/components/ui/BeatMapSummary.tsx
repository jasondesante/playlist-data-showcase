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
 * - Interpolation statistics (when available)
 *
 * Part of Task 2.4: Beat Map Summary (After Analysis)
 * Part of Task 7.2: Edge Cases - Very short tracks, no clear beat
 * Part of Task 4.1: Interpolation Statistics Display
 */
import { Play, Music2, AlertTriangle, Info, HelpCircle, Layers } from 'lucide-react';
import './BeatMapSummary.css';
import { Button } from './Button';
import type { BeatMap } from '@/types';
import {
    useInterpolationStatistics,
} from '../../store/beatDetectionStore';

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
  // Get interpolation statistics from store (Task 4.1)
  const interpolationStats = useInterpolationStatistics();

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
            Sensitivity: {(beatMap.metadata.sensitivity ?? 1.0).toFixed(1)}
          </span>
          <span className="beat-map-settings-value">
            Filter: {(beatMap.metadata.filter ?? 0.0).toFixed(2)}
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

      {/* Interpolation Statistics (Task 4.1) */}
      {interpolationStats && (
        <div className="beat-map-interpolation-stats">
          <div className="beat-map-interpolation-stats-header">
            <Layers className="beat-map-interpolation-stats-icon" />
            <span className="beat-map-interpolation-stats-title">
              Interpolation
            </span>
          </div>

          {/* Quarter Note BPM */}
          <div className="beat-map-interpolation-stat-row">
            <span className="beat-map-interpolation-stat-label">Quarter Note BPM:</span>
            <span className="beat-map-interpolation-stat-value">
              {formatBpm(interpolationStats.quarterNoteBpm)}
              <span className="beat-map-interpolation-stat-confidence">
                ({Math.round(interpolationStats.quarterNoteConfidence * 100)}% conf)
              </span>
            </span>
          </div>

          {/* Total Beats Breakdown */}
          <div className="beat-map-interpolation-stat-row">
            <span className="beat-map-interpolation-stat-label">Total Beats:</span>
            <span className="beat-map-interpolation-stat-value">
              {formatBeatCount(interpolationStats.totalBeatCount)}
            </span>
          </div>

          <div className="beat-map-interpolation-stats-breakdown">
            <div className="beat-map-interpolation-breakdown-item">
              <span className="beat-map-interpolation-breakdown-dot beat-map-interpolation-breakdown-dot--detected" />
              <span className="beat-map-interpolation-breakdown-label">Detected:</span>
              <span className="beat-map-interpolation-breakdown-value">
                {formatBeatCount(interpolationStats.detectedBeatCount)}
                ({Math.round((1 - interpolationStats.interpolationRatio) * 100)}%)
              </span>
            </div>
            <div className="beat-map-interpolation-breakdown-item">
              <span className="beat-map-interpolation-breakdown-dot beat-map-interpolation-breakdown-dot--interpolated" />
              <span className="beat-map-interpolation-breakdown-label">Interpolated:</span>
              <span className="beat-map-interpolation-breakdown-value">
                {formatBeatCount(interpolationStats.interpolatedBeatCount)}
                ({Math.round(interpolationStats.interpolationRatio * 100)}%)
              </span>
            </div>
          </div>

          {/* Additional Metrics */}
          <div className="beat-map-interpolation-metrics">
            <span className="beat-map-interpolation-metric">
              Avg Confidence: {Math.round(interpolationStats.avgInterpolatedConfidence * 100)}%
            </span>
            <span className="beat-map-interpolation-metric">
              Grid Align: {Math.round(interpolationStats.gridAlignmentScore * 100)}%
            </span>
            <span className="beat-map-interpolation-metric">
              Drift: {interpolationStats.tempoDriftRatio.toFixed(2)}
            </span>
          </div>

          {/* Quarter Note Detection Info (Task 4.3) */}
          <div className="beat-map-quarter-note-section">
            <div className="beat-map-quarter-note-header">
              <span className="beat-map-quarter-note-label">Quarter Note Detection</span>
              <span className={`beat-map-quarter-note-method beat-map-quarter-note-method--${interpolationStats.quarterNoteDetection.method}`}>
                {interpolationStats.quarterNoteDetection.method === 'histogram' && 'Histogram'}
                {interpolationStats.quarterNoteDetection.method === 'kde' && 'KDE'}
                {interpolationStats.quarterNoteDetection.method === 'tempo-detector-fallback' && 'Fallback'}
              </span>
            </div>
            <div className="beat-map-quarter-note-details">
              <div className="beat-map-quarter-note-detail">
                <span className="beat-map-quarter-note-detail-label">Dense Sections:</span>
                <span className="beat-map-quarter-note-detail-value">
                  {interpolationStats.quarterNoteDetection.denseSectionCount}
                  <span className="beat-map-quarter-note-detail-sub">
                    ({interpolationStats.quarterNoteDetection.denseSectionBeats} beats)
                  </span>
                </span>
              </div>
              {interpolationStats.quarterNoteDetection.secondaryPeaks.length > 0 && (
                <div className="beat-map-quarter-note-detail">
                  <span className="beat-map-quarter-note-detail-label">Secondary Peaks:</span>
                  <span className="beat-map-quarter-note-detail-value">
                    {interpolationStats.quarterNoteDetection.secondaryPeaks.map((bpm) => `${bpm} BPM`).join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Confidence Indicator (Task 4.2) */}
          <div className="beat-map-confidence-section">
            <div className="beat-map-confidence-header">
              <span className="beat-map-confidence-label">Confidence</span>
              <span className={`beat-map-confidence-badge beat-map-confidence-badge--${interpolationStats.confidenceLevel}`}>
                {interpolationStats.confidenceLevel === 'high' && 'High'}
                {interpolationStats.confidenceLevel === 'medium' && 'Medium'}
                {interpolationStats.confidenceLevel === 'low' && 'Low'}
              </span>
            </div>
            <div className="beat-map-confidence-bar">
              <div
                className={`beat-map-confidence-bar-fill beat-map-confidence-bar-fill--${interpolationStats.confidenceLevel}`}
                style={{ width: `${interpolationStats.avgInterpolatedConfidence * 100}%` }}
              />
            </div>

            {/* Confidence Breakdown */}
            <div className="beat-map-confidence-breakdown">
              <div className="beat-map-confidence-breakdown-item">
                <span className="beat-map-confidence-breakdown-label">Grid Alignment</span>
                <div className="beat-map-confidence-breakdown-bar">
                  <div
                    className="beat-map-confidence-breakdown-bar-fill beat-map-confidence-breakdown-bar-fill--grid"
                    style={{ width: `${interpolationStats.confidenceWeights.gridAlignment * 100}%` }}
                  />
                </div>
                <span className="beat-map-confidence-breakdown-percent">
                  {Math.round(interpolationStats.confidenceWeights.gridAlignment * 100)}%
                </span>
              </div>
              <div className="beat-map-confidence-breakdown-item">
                <span className="beat-map-confidence-breakdown-label">Anchor Confidence</span>
                <div className="beat-map-confidence-breakdown-bar">
                  <div
                    className="beat-map-confidence-breakdown-bar-fill beat-map-confidence-breakdown-bar-fill--anchor"
                    style={{ width: `${interpolationStats.confidenceWeights.anchorConfidence * 100}%` }}
                  />
                </div>
                <span className="beat-map-confidence-breakdown-percent">
                  {Math.round(interpolationStats.confidenceWeights.anchorConfidence * 100)}%
                </span>
              </div>
              <div className="beat-map-confidence-breakdown-item">
                <span className="beat-map-confidence-breakdown-label">Pace Confidence</span>
                <div className="beat-map-confidence-breakdown-bar">
                  <div
                    className="beat-map-confidence-breakdown-bar-fill beat-map-confidence-breakdown-bar-fill--pace"
                    style={{ width: `${interpolationStats.confidenceWeights.paceConfidence * 100}%` }}
                  />
                </div>
                <span className="beat-map-confidence-breakdown-percent">
                  {Math.round(interpolationStats.confidenceWeights.paceConfidence * 100)}%
                </span>
              </div>
            </div>
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