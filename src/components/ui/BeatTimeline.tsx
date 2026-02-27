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
 * - Smooth 60fps animation using requestAnimationFrame
 *
 * Part of Task 4.1: BeatTimeline Component
 * Part of Task 4.3: Timeline Synchronization
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import './BeatTimeline.css';
import type { Beat, BeatMap, BeatEvent } from '@/types';

interface BeatTimelineProps {
  /** The generated beat map */
  beatMap: BeatMap;
  /** Current playback time in seconds (from audio player - used as reference) */
  currentTime: number;
  /** Array of upcoming beats for visualization */
  upcomingBeats: Beat[];
  /** The last beat event (for pulse animation trigger) */
  lastBeatEvent?: BeatEvent | null;
  /** Callback when user clicks on timeline to seek (optional) */
  onSeek?: (time: number) => void;
  /** Anticipation window in seconds (default: 2.0) */
  anticipationWindow?: number;
  /** Whether the audio is currently playing (enables smooth animation) */
  isPlaying?: boolean;
  /** Optional AudioContext for precise timing (if available) */
  audioContext?: AudioContext | null;
}

/**
 * BeatTimeline Component
 *
 * Renders a horizontal timeline where beats scroll from right to left.
 * The "Now" line is fixed in the center, representing the current playback position.
 *
 * Uses requestAnimationFrame for smooth 60fps scrolling animation.
 */
export function BeatTimeline({
  beatMap,
  currentTime,
  upcomingBeats,
  lastBeatEvent,
  onSeek,
  anticipationWindow = 2.0,
  isPlaying = false,
  audioContext: _audioContext,
}: BeatTimelineProps) {
  // _audioContext is available for future precise timing enhancements
  void _audioContext; // Suppress unused variable warning
  const trackRef = useRef<HTMLDivElement>(null);
  const [pulseKey, setPulseKey] = useState(0);
  const lastPulseTimeRef = useRef<number>(0);

  // ========================================
  // Task 4.3: Smooth Animation with requestAnimationFrame
  // ========================================

  // Refs for smooth animation
  const animationFrameRef = useRef<number | null>(null);

  // Smooth time state - updated at 60fps during playback
  const [smoothTime, setSmoothTime] = useState(currentTime);

  // Track audio time and when it was last updated (for interpolation)
  const lastAudioTimeRef = useRef<{ time: number; timestamp: number }>({
    time: currentTime,
    timestamp: performance.now(),
  });
  const isPlayingRef = useRef(isPlaying);

  // Keep refs in sync with props
  useEffect(() => {
    // Update the reference point whenever currentTime changes from the audio player
    lastAudioTimeRef.current = {
      time: currentTime,
      timestamp: performance.now(),
    };
  }, [currentTime]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  /**
   * Animation loop for smooth scrolling.
   * Uses requestAnimationFrame for 60fps updates.
   * Interpolates time between audio player updates.
   */
  useEffect(() => {
    if (!isPlaying) {
      // When paused, just use the current time directly (no animation)
      setSmoothTime(currentTime);
      return;
    }

    /**
     * The animation loop - runs at ~60fps
     * Calculates interpolated time based on last known audio time
     */
    const animate = () => {
      const now = performance.now();
      const { time: lastAudioTime, timestamp: lastUpdateTimestamp } = lastAudioTimeRef.current;

      // Calculate elapsed time since the last audio time update
      const elapsedMs = now - lastUpdateTimestamp;
      const elapsedSeconds = elapsedMs / 1000;

      // Interpolate the current playback time
      const interpolatedTime = lastAudioTime + elapsedSeconds;

      // Clamp to beat map duration
      const clampedTime = Math.min(interpolatedTime, beatMap.duration);

      // Update smooth time state
      setSmoothTime(clampedTime);

      // Continue animation if still playing
      if (isPlayingRef.current && clampedTime < beatMap.duration) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    // Start the animation loop
    animationFrameRef.current = requestAnimationFrame(animate);

    // Cleanup on unmount or when playback stops
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying, beatMap.duration]);

  /**
   * Handle seek events - immediately jump to new position.
   * This ensures smooth transition when user seeks to a different position.
   */
  useEffect(() => {
    // When not playing, update smooth time directly
    if (!isPlaying) {
      setSmoothTime(currentTime);
    }
    // When playing, the animation loop will pick up the new time
    // because lastAudioTimeRef is updated via the other effect
  }, [currentTime, isPlaying]);

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
      // Center is smoothTime, left is smoothTime - anticipationWindow, right is smoothTime + anticipationWindow
      const positionRatio = clickX / trackWidth;
      const timeOffset = (positionRatio - 0.5) * anticipationWindow * 2;
      const seekTime = Math.max(0, Math.min(beatMap.duration, smoothTime + timeOffset));

      onSeek(seekTime);
    },
    [onSeek, smoothTime, anticipationWindow, beatMap.duration]
  );

  /**
   * Calculate beat position on the timeline
   * Position 0 = left edge (smoothTime - anticipationWindow)
   * Position 0.5 = center/now line (smoothTime)
   * Position 1 = right edge (smoothTime + anticipationWindow)
   */
  const calculateBeatPosition = useCallback(
    (beat: Beat): number => {
      const timeUntilBeat = beat.timestamp - smoothTime;
      // Map from [-anticipationWindow, +anticipationWindow] to [0, 1]
      // At timeUntilBeat = -anticipationWindow, position = 0 (left)
      // At timeUntilBeat = 0, position = 0.5 (center/now)
      // At timeUntilBeat = +anticipationWindow, position = 1 (right)
      const position = 0.5 + (timeUntilBeat / anticipationWindow) * 0.5;
      return position;
    },
    [smoothTime, anticipationWindow]
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

    const minTime = smoothTime - anticipationWindow;
    const maxTime = smoothTime + anticipationWindow;

    return beatsToUse
      .filter((beat) => beat.timestamp >= minTime && beat.timestamp <= maxTime)
      .map((beat) => {
        const position = calculateBeatPosition(beat);
        const isPast = beat.timestamp < smoothTime - 0.05; // 50ms tolerance
        const isUpcoming = beat.timestamp > smoothTime + 0.05;
        return { beat, position, isPast, isUpcoming };
      })
      .filter((item) => item.position >= 0 && item.position <= 1);
  }, [upcomingBeats, beatMap.beats, smoothTime, anticipationWindow, calculateBeatPosition]);

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
        aria-valuenow={smoothTime}
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
