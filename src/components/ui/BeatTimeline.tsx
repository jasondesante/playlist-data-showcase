/**
 * BeatTimeline Component
 *
 * A horizontal scrolling beat visualization for rhythm game practice mode.
 * Features:
 * - Beats scroll from right to left across the track
 * - Fixed "Now" line in the center (where beats "hit")
 * - Regular beats vs downbeats (larger, different color)
 * - Intensity visualization (opacity based on confidence)
 * - Visual pulse/flash when a beat crosses the "now" line
 * - Anticipation window showing upcoming beats
 *
 * Part of Task 4.1: BeatTimeline Component
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import './BeatTimeline.css';
import type { Beat, BeatMap, BeatEvent } from '@/types';

interface BeatTimelineProps {
  /** The generated beat map */
  beatMap: BeatMap;
  /** Current playback time in seconds */
  currentTime: number;
  /** Array of upcoming beats for visualization */
  upcomingBeats: Beat[];
  /** The last beat event (for pulse animation trigger) */
  lastBeatEvent?: BeatEvent | null;
  /** Callback when user clicks on timeline to seek (optional) */
  onSeek?: (time: number) => void;
  /** Anticipation window in seconds (default: 2.0) */
  anticipationWindow?: number;
}

/**
 * BeatTimeline Component
 *
 * Renders a horizontal timeline where beats scroll from right to left.
 * The "Now" line is fixed in the center, representing the current playback position.
 */
export function BeatTimeline({
  beatMap,
  currentTime,
  upcomingBeats,
  lastBeatEvent,
  onSeek,
  anticipationWindow = 2.0,
}: BeatTimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [pulseKey, setPulseKey] = useState(0);
  const lastPulseTimeRef = useRef<number>(0);

  /**
   * Trigger pulse animation when a beat crosses the "now" line
   */
  useEffect(() => {
    if (lastBeatEvent?.type === 'exact') {
      // Debounce rapid pulses
      const now = Date.now();
      if (now - lastPulseTimeRef.current > 100) {
        lastPulseTimeRef.current = now;
        setPulseKey((prev) => prev + 1);
      }
    }
  }, [lastBeatEvent]);

  /**
   * Handle click on timeline to seek
   */
  const handleTrackClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!onSeek || !trackRef.current) return;

      const rect = trackRef.current.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const trackWidth = rect.width;

      // Calculate the time relative to the center (now line)
      // Center is currentTime, left is currentTime - anticipationWindow, right is currentTime + anticipationWindow
      const positionRatio = clickX / trackWidth;
      const timeOffset = (positionRatio - 0.5) * anticipationWindow * 2;
      const seekTime = Math.max(0, Math.min(beatMap.duration, currentTime + timeOffset));

      onSeek(seekTime);
    },
    [onSeek, currentTime, anticipationWindow, beatMap.duration]
  );

  /**
   * Calculate beat position on the timeline
   * Position 0 = left edge (currentTime - anticipationWindow)
   * Position 0.5 = center/now line (currentTime)
   * Position 1 = right edge (currentTime + anticipationWindow)
   */
  const calculateBeatPosition = useCallback(
    (beat: Beat): number => {
      const timeUntilBeat = beat.timestamp - currentTime;
      // Map from [-anticipationWindow, +anticipationWindow] to [0, 1]
      // At timeUntilBeat = -anticipationWindow, position = 0 (left)
      // At timeUntilBeat = 0, position = 0.5 (center/now)
      // At timeUntilBeat = +anticipationWindow, position = 1 (right)
      const position = 0.5 + (timeUntilBeat / anticipationWindow) * 0.5;
      return position;
    },
    [currentTime, anticipationWindow]
  );

  /**
   * Get beats visible in the current window
   * Uses upcomingBeats prop if provided, otherwise falls back to filtering beatMap
   */
  const getVisibleBeats = useCallback((): Array<{
    beat: Beat;
    position: number;
    isPast: boolean;
    isUpcoming: boolean;
  }> => {
    // Use the beats array - prefer upcomingBeats if available, otherwise filter from beatMap
    const beatsToUse = upcomingBeats.length > 0 ? upcomingBeats : beatMap.beats;

    const minTime = currentTime - anticipationWindow;
    const maxTime = currentTime + anticipationWindow;

    return beatsToUse
      .filter((beat) => beat.timestamp >= minTime && beat.timestamp <= maxTime)
      .map((beat) => {
        const position = calculateBeatPosition(beat);
        const isPast = beat.timestamp < currentTime - 0.05; // 50ms tolerance
        const isUpcoming = beat.timestamp > currentTime + 0.05;
        return { beat, position, isPast, isUpcoming };
      })
      .filter((item) => item.position >= 0 && item.position <= 1);
  }, [upcomingBeats, beatMap.beats, currentTime, anticipationWindow, calculateBeatPosition]);

  const visibleBeats = getVisibleBeats();

  return (
    <div className="beat-timeline">
      {/* Timeline track */}
      <div
        ref={trackRef}
        className={`beat-timeline-track ${onSeek ? 'beat-timeline-track--clickable' : ''}`}
        onClick={handleTrackClick}
        role={onSeek ? 'slider' : undefined}
        aria-label="Beat timeline"
        aria-valuemin={0}
        aria-valuemax={beatMap.duration}
        aria-valuenow={currentTime}
        tabIndex={onSeek ? 0 : undefined}
      >
        {/* Background gradient */}
        <div className="beat-timeline-background" />

        {/* Past region indicator (left side) */}
        <div className="beat-timeline-past-region" />

        {/* Future region indicator (right side) */}
        <div className="beat-timeline-future-region" />

        {/* Beat markers */}
        {visibleBeats.map(({ beat, position, isPast, isUpcoming }) => (
          <div
            key={`beat-${beat.timestamp.toFixed(3)}-${beat.measureNumber}`}
            className={`beat-timeline-marker ${
              beat.isDownbeat ? 'beat-timeline-marker--downbeat' : ''
            } ${isPast ? 'beat-timeline-marker--past' : ''} ${
              isUpcoming ? 'beat-timeline-marker--upcoming' : ''
            }`}
            style={{
              left: `${position * 100}%`,
              opacity: beat.confidence ?? 1,
            }}
          >
            {/* Beat inner dot */}
            <div className="beat-timeline-marker-dot" />
            {/* Downbeat accent ring */}
            {beat.isDownbeat && <div className="beat-timeline-marker-ring" />}
          </div>
        ))}

        {/* "Now" line - fixed in center */}
        <div className="beat-timeline-now-line" key={`pulse-${pulseKey}`}>
          <div className="beat-timeline-now-line-inner" />
          <div className="beat-timeline-now-pulse" />
          <span className="beat-timeline-now-label">NOW</span>
        </div>

        {/* Beat impact zone indicator */}
        <div className="beat-timeline-impact-zone" />
      </div>

      {/* Timeline info bar */}
      <div className="beat-timeline-info">
        <div className="beat-timeline-info-item">
          <span className="beat-timeline-info-label">Beats Visible</span>
          <span className="beat-timeline-info-value">{visibleBeats.length}</span>
        </div>
        <div className="beat-timeline-info-item">
          <span className="beat-timeline-info-label">Window</span>
          <span className="beat-timeline-info-value">±{anticipationWindow.toFixed(1)}s</span>
        </div>
        {lastBeatEvent && (
          <div className="beat-timeline-info-item">
            <span className="beat-timeline-info-label">Last Beat</span>
            <span className="beat-timeline-info-value">
              {lastBeatEvent.beat.isDownbeat ? 'DOWN' : 'BEAT'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Memoized version for performance
 */
export const MemoizedBeatTimeline = BeatTimeline;
