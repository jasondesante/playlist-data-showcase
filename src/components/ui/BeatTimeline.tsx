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
 * - Interpolation visualization: detected vs interpolated beats (Task 5.1)
 *
 * Part of Task 4.1: BeatTimeline Component
 * Part of Task 4.3: Timeline Synchronization
 * Part of Task 5.1: Dual-Source Rendering for Interpolation
 */
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import './BeatTimeline.css';
import type { Beat, BeatMap, ExtendedBeatEvent, InterpolationVisualizationData } from '@/types';

interface BeatTimelineProps {
  /** The generated beat map */
  beatMap: BeatMap;
  /** Current playback time in seconds (from audio player - used as reference) */
  currentTime: number;
  /** The last beat event (for pulse animation trigger) - includes source info when available */
  lastBeatEvent?: ExtendedBeatEvent | null;
  /** Timestamp of the last tap (for tap visual feedback) */
  lastTapTime?: number;
  /** The accuracy rating of the last tap (for color-coded feedback) */
  lastTapAccuracy?: 'perfect' | 'great' | 'good' | 'ok' | 'miss' | null;
  /** Callback when user clicks on timeline to seek (optional) */
  onSeek?: (time: number) => void;
  /** Anticipation window in seconds for future beats (default: 2.0) */
  anticipationWindow?: number;
  /** Past window in seconds for showing beats that have passed (default: 4.0) */
  pastWindow?: number;
  /** Whether the audio is currently playing (enables smooth animation) */
  isPlaying?: boolean;
  /** Optional AudioContext for precise timing (if available) */
  audioContext?: AudioContext | null;
  /**
   * Interpolation visualization data for rendering detected vs interpolated beats.
   * When provided, takes precedence over beatMap for beat rendering.
   * Set to null to use original beatMap beats only.
   * Part of Task 5.1: Dual-Source Rendering
   */
  interpolationData?: InterpolationVisualizationData | null;
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
  lastBeatEvent,
  lastTapTime,
  lastTapAccuracy,
  onSeek,
  anticipationWindow = 2.0,
  pastWindow = 4.0,
  isPlaying = false,
  audioContext: _audioContext,
  interpolationData = null,
}: BeatTimelineProps) {
  // _audioContext is available for future precise timing enhancements
  void _audioContext; // Suppress unused variable warning
  const trackRef = useRef<HTMLDivElement>(null);
  const [pulseKey, setPulseKey] = useState(0);
  const lastPulseTimeRef = useRef<number>(0);

  // ========================================
  // Tap Visual Feedback State
  // ========================================
  const [tapPulseKey, setTapPulseKey] = useState(0);
  const lastTapPulseRef = useRef<number>(0);

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
   * Only pulses when audio is actually playing
   */
  useEffect(() => {
    if (isPlaying && lastBeatEvent?.type === 'exact') {
      // Debounce rapid pulses
      const now = Date.now();
      if (now - lastPulseTimeRef.current > 100) {
        lastPulseTimeRef.current = now;
        setPulseKey((prev) => prev + 1);
      }
    }
  }, [lastBeatEvent, isPlaying]);

  /**
   * Trigger tap pulse animation when user taps
   * Shows a visual indicator at the NOW line to help user
   * see exactly when their tap was registered relative to beats.
   */
  useEffect(() => {
    if (lastTapTime !== undefined && lastTapTime > 0) {
      // Debounce rapid taps
      const now = Date.now();
      if (now - lastTapPulseRef.current > 50) {
        lastTapPulseRef.current = now;
        setTapPulseKey((prev) => prev + 1);
      }
    }
  }, [lastTapTime]);

  // ========================================
  // Drag-to-scrub functionality
  // ========================================

  // State for tracking drag
  const [isDragging, setIsDragging] = useState(false);

  // Refs to track drag state (refs don't trigger re-renders)
  const dragStartXRef = useRef<number>(0);
  const dragStartTimeRef = useRef<number>(0);

  /**
   * Handle mouse down on track - start dragging
   * Captures the initial click position and time
   */
  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!onSeek || !trackRef.current) return;

      event.preventDefault();
      setIsDragging(true);

      // Capture the initial position and time
      dragStartXRef.current = event.clientX;
      dragStartTimeRef.current = smoothTime;
    },
    [onSeek, smoothTime]
  );

  /**
   * Handle mouse move during drag
   * Calculates delta from initial position and applies to initial time
   */
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!isDragging || !onSeek || !trackRef.current) return;

      const rect = trackRef.current.getBoundingClientRect();
      const trackWidth = rect.width;

      // Calculate how far we've moved from the start position (in pixels)
      const deltaX = event.clientX - dragStartXRef.current;

      // Convert pixel delta to time delta (negated for intuitive drag direction)
      // Full track width = anticipationWindow * 2 seconds
      // Drag right = pull content from future = go backward in time
      const timePerPixel = (anticipationWindow * 2) / trackWidth;
      const deltaTime = -deltaX * timePerPixel;

      // Apply delta to the initial time
      const newTime = Math.max(0, Math.min(beatMap.duration, dragStartTimeRef.current + deltaTime));

      onSeek(newTime);
    },
    [isDragging, onSeek, anticipationWindow, beatMap.duration]
  );

  /**
   * Handle mouse up - end drag
   */
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  /**
   * Add/remove global mouse event listeners when dragging
   */
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  /**
   * Calculate beat position on the timeline
   * Uses consistent scaling (anticipationWindow) for both past and future beats
   * to maintain consistent visual speed across the timeline.
   * Position 0 = left edge (smoothTime - anticipationWindow)
   * Position 0.5 = center/now line (smoothTime)
   * Position 1 = right edge (smoothTime + anticipationWindow)
   *
   * Note: pastWindow only affects visibility filtering, not position calculation,
   * so beats maintain consistent speed as they scroll past center.
   */
  const calculateBeatPosition = useCallback(
    (timestamp: number): number => {
      const timeUntilBeat = timestamp - smoothTime;
      // Use the same scale for both sides to maintain consistent speed
      const position = 0.5 + (timeUntilBeat / anticipationWindow) * 0.5;
      return position;
    },
    [smoothTime, anticipationWindow]
  );

  // ========================================
  // Task 5.1: Unified Beat Type for Dual-Source Rendering
  // ========================================

  /**
   * Unified beat representation for rendering.
   * Works with both original BeatMap beats and interpolation visualization beats.
   */
  type UnifiedBeat = {
    timestamp: number;
    isDownbeat: boolean;
    confidence: number;
    /** Source of the beat - 'detected' from BeatTracker or 'interpolated' from grid */
    source: 'detected' | 'interpolated';
    /** Unique key for React rendering */
    key: string;
  };

  /**
   * Convert BeatMap beats to unified format.
   */
  const convertBeatMapBeats = useCallback((beats: Beat[]): UnifiedBeat[] => {
    return beats.map((beat, index) => ({
      timestamp: beat.timestamp,
      isDownbeat: beat.isDownbeat,
      confidence: beat.confidence ?? 1,
      source: 'detected' as const,
      key: `beat-${beat.timestamp.toFixed(3)}-${beat.measureNumber ?? index}`,
    }));
  }, []);

  /**
   * Convert interpolation visualization beats to unified format.
   */
  const convertInterpolationBeats = useCallback((beats: InterpolationVisualizationData['beats']): UnifiedBeat[] => {
    return beats.map((beat, index) => ({
      timestamp: beat.timestamp,
      isDownbeat: beat.isDownbeat,
      confidence: beat.confidence,
      source: beat.source,
      key: `interp-${beat.timestamp.toFixed(3)}-${beat.source}-${index}`,
    }));
  }, []);

  /**
   * Get the beats to render based on whether interpolation data is provided.
   * When interpolationData is available, use it; otherwise fall back to beatMap.
   */
  const unifiedBeats = useMemo((): UnifiedBeat[] => {
    if (interpolationData && interpolationData.beats.length > 0) {
      return convertInterpolationBeats(interpolationData.beats);
    }
    return convertBeatMapBeats(beatMap.beats);
  }, [interpolationData, beatMap.beats, convertInterpolationBeats, convertBeatMapBeats]);

  /**
   * Get beats visible in the current window
   * Uses unified beat format for dual-source rendering.
   * Uses asymmetric windows: pastWindow for past beats, anticipationWindow for future
   */
  const getVisibleBeats = useCallback((): Array<{
    beat: UnifiedBeat;
    position: number;
    isPast: boolean;
    isUpcoming: boolean;
  }> => {
    // Use asymmetric windows: more time for past beats to scroll off screen
    const minTime = smoothTime - pastWindow;
    const maxTime = smoothTime + anticipationWindow;

    return unifiedBeats
      .filter((beat) => beat.timestamp >= minTime && beat.timestamp <= maxTime)
      .map((beat) => {
        const position = calculateBeatPosition(beat.timestamp);
        const isPast = beat.timestamp < smoothTime - 0.05; // 50ms tolerance
        const isUpcoming = beat.timestamp > smoothTime + 0.05;
        return { beat, position, isPast, isUpcoming };
      })
      .filter((item) => item.position >= 0 && item.position <= 1);
  }, [unifiedBeats, smoothTime, anticipationWindow, pastWindow, calculateBeatPosition]);

  const visibleBeats = getVisibleBeats();

  return (
    <div className="beat-timeline">
      {/* Timeline track */}
      <div
        ref={trackRef}
        className={`beat-timeline-track ${onSeek ? 'beat-timeline-track--draggable' : ''} ${isDragging ? 'beat-timeline-track--dragging' : ''}`}
        onMouseDown={handleMouseDown}
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
            key={beat.key}
            className={`beat-timeline-marker ${
              beat.isDownbeat ? 'beat-timeline-marker--downbeat' : ''
            } ${isPast ? 'beat-timeline-marker--past' : ''} ${
              isUpcoming ? 'beat-timeline-marker--upcoming' : ''
            } ${beat.source === 'interpolated' ? 'beat-timeline-marker--interpolated' : ''}`}
            style={{
              left: `${position * 100}%`,
              // For detected beats, use confidence if available; for interpolated beats, always use confidence
              opacity: beat.source === 'detected' ? (beat.confidence ?? 1) : beat.confidence,
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

        {/* Tap indicator - appears when user taps */}
        {lastTapTime !== undefined && lastTapTime > 0 && (
          <div
            className={`beat-timeline-tap-indicator beat-timeline-tap-indicator--${lastTapAccuracy || 'miss'}`}
            key={`tap-${tapPulseKey}`}
          >
            <div className="beat-timeline-tap-ring" />
            <div className="beat-timeline-tap-core" />
          </div>
        )}

        {/* Beat impact zone indicator */}
        <div className="beat-timeline-impact-zone" />
      </div>

      {/* Task 5.2: Visual Legend for interpolation beat types */}
      {interpolationData && (
        <div className="beat-timeline-legend">
          <div className="beat-timeline-legend-item">
            <div className="beat-timeline-legend-marker beat-timeline-legend-marker--detected" />
            <span className="beat-timeline-legend-label">Detected beat</span>
          </div>
          <div className="beat-timeline-legend-item">
            <div className="beat-timeline-legend-marker beat-timeline-legend-marker--interpolated" />
            <span className="beat-timeline-legend-label">Interpolated beat</span>
          </div>
          <div className="beat-timeline-legend-item">
            <div className="beat-timeline-legend-opacity">
              <div className="beat-timeline-legend-opacity-bar" />
            </div>
            <span className="beat-timeline-legend-label">Confidence level</span>
          </div>
        </div>
      )}

      {/* Timeline info bar */}
      <div className="beat-timeline-info">
        <div className="beat-timeline-info-item">
          <span className="beat-timeline-info-label">Beats Visible</span>
          <span className="beat-timeline-info-value">{visibleBeats.length}</span>
        </div>
        <div className="beat-timeline-info-item">
          <span className="beat-timeline-info-label">Window</span>
          <span className="beat-timeline-info-value">{pastWindow.toFixed(1)}s / {anticipationWindow.toFixed(1)}s</span>
        </div>
        {lastBeatEvent && (
          <div className="beat-timeline-info-item">
            <span className="beat-timeline-info-label">Last Beat</span>
            <span className="beat-timeline-info-value">
              {lastBeatEvent.beat.isDownbeat ? 'DOWN' : 'BEAT'}
              {lastBeatEvent.source && (
                <span className="beat-timeline-info-source">
                  {lastBeatEvent.source === 'detected' ? ' ●' : ' ○'}
                </span>
              )}
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
