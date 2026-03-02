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
 * - Quarter note grid overlay (Task 5.3)
 * - Tempo drift visualization (Task 5.4)
 *
 * Part of Task 4.1: BeatTimeline Component
 * Part of Task 4.3: Timeline Synchronization
 * Part of Task 5.1: Dual-Source Rendering for Interpolation
 * Part of Task 5.4: Tempo Drift Visualization
 */
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import './BeatTimeline.css';
import type { Beat, BeatMap, ExtendedBeatEvent, InterpolationVisualizationData, SubdividedBeatMap, SubdivisionType } from '@/types';

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
  /**
   * Whether to show the quarter note grid overlay.
   * Part of Task 5.3: Quarter Note Grid Overlay
   */
  showGridOverlay?: boolean;
  /**
   * Whether to show the tempo drift visualization.
   * Part of Task 5.4: Tempo Drift Visualization
   */
  showTempoDriftVisualization?: boolean;
  /**
   * Callback when user clicks on a beat marker.
   * Part of Task 3.1: Beat Selection Props
   * @param beatIndex - The index of the clicked beat in the beatMap.beats array
   */
  onBeatClick?: (beatIndex: number) => void;
  /**
   * Whether beat selection mode is enabled.
   * When true, beat markers become clickable and show pointer cursor.
   * Part of Task 3.1: Beat Selection Props
   */
  enableBeatSelection?: boolean;
  /**
   * The index of the currently selected beat (for visual highlight).
   * Part of Task 3.1: Beat Selection Props
   */
  selectedBeatIndex?: number;
  /**
   * Whether to show measure boundary lines and measure numbers.
   * Part of Phase 4: Measure Visualization (Task 4.1)
   */
  showMeasureBoundaries?: boolean;
  /**
   * Pre-calculated subdivided beat map with custom subdivision patterns.
   * When provided, takes precedence over interpolationData and beatMap for beat rendering.
   * Beats are color-coded by subdivision type and segment boundaries are shown.
   * Part of Phase 5: SubdividedBeatMap Visualization (Task 5.4)
   */
  subdividedBeatMap?: SubdividedBeatMap | null;
  /**
   * Whether to show subdivision visualization (segment boundaries, type colors).
   * Only applies when subdividedBeatMap is provided.
   * Part of Phase 5: SubdividedBeatMap Visualization (Task 5.4)
   */
  showSubdivisionVisualization?: boolean;
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
  showGridOverlay = false,
  showTempoDriftVisualization = false,
  onBeatClick,
  enableBeatSelection = false,
  selectedBeatIndex,
  showMeasureBoundaries = false,
  subdividedBeatMap = null,
  showSubdivisionVisualization = true,
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

  // Reset animation reference when playback starts to prevent initial jitter
  // This ensures the animation loop has a fresh timestamp when starting
  useEffect(() => {
    if (isPlaying) {
      lastAudioTimeRef.current = {
        time: currentTime,
        timestamp: performance.now(),
      };
    }
  }, [isPlaying, currentTime]);

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
  // Task 5.4: Added subdivision type for SubdividedBeatMap visualization
  // ========================================

  /**
   * Unified beat representation for rendering.
   * Works with original BeatMap beats, interpolation visualization beats,
   * and SubdividedBeatMap beats.
   */
  type UnifiedBeat = {
    timestamp: number;
    isDownbeat: boolean;
    confidence: number;
    /** Source of the beat - 'detected' from BeatTracker, 'interpolated' from grid, or 'subdivided' */
    source: 'detected' | 'interpolated' | 'subdivided';
    /** Unique key for React rendering */
    key: string;
    /**
     * The index of this beat in the original beatMap.beats array.
     * Used for beat selection callback.
     * Part of Task 3.1: Beat Selection Props
     */
    beatIndex: number;
    /**
     * The measure number (0-indexed) for this beat.
     * Part of Phase 4: Measure Visualization (Task 4.2)
     */
    measureNumber: number;
    /**
     * The subdivision type for this beat (from SubdividedBeatMap).
     * Part of Phase 5: SubdividedBeatMap Visualization (Task 5.4)
     */
    subdivisionType?: SubdivisionType;
    /**
     * Decimal position within the measure (from SubdividedBeatMap).
     * E.g., 0, 0.5, 1, 1.5 for eighth notes
     * Part of Phase 5: SubdividedBeatMap Visualization (Task 5.4)
     */
    beatInMeasure?: number;
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
      beatIndex: index,
      measureNumber: beat.measureNumber ?? 0,
    }));
  }, []);

  /**
   * Convert interpolation visualization beats to unified format.
   * Calculates measure numbers based on downbeat positions.
   */
  const convertInterpolationBeats = useCallback((beats: InterpolationVisualizationData['beats']): UnifiedBeat[] => {
    // First pass: identify downbeat positions to calculate measure numbers
    let currentMeasure = 0;
    return beats.map((beat, index) => {
      const unifiedBeat = {
        timestamp: beat.timestamp,
        isDownbeat: beat.isDownbeat,
        confidence: beat.confidence,
        source: beat.source,
        key: `interp-${beat.timestamp.toFixed(3)}-${beat.source}-${index}`,
        beatIndex: index,
        measureNumber: currentMeasure,
      };
      // Increment measure counter after each downbeat
      if (beat.isDownbeat && index > 0) {
        currentMeasure++;
      }
      return unifiedBeat;
    });
  }, []);

  /**
   * Convert SubdividedBeatMap beats to unified format.
   * Includes subdivision type and decimal beatInMeasure for visualization.
   * Part of Phase 5: SubdividedBeatMap Visualization (Task 5.4)
   */
  const convertSubdividedBeats = useCallback((map: SubdividedBeatMap): UnifiedBeat[] => {
    return map.beats.map((beat, index) => ({
      timestamp: beat.timestamp,
      isDownbeat: beat.isDownbeat,
      confidence: beat.confidence ?? 1,
      source: 'subdivided' as const,
      key: `subdiv-${beat.timestamp.toFixed(3)}-${beat.subdivisionType}-${index}`,
      beatIndex: index,
      measureNumber: beat.measureNumber ?? 0,
      subdivisionType: beat.subdivisionType,
      beatInMeasure: beat.beatInMeasure,
    }));
  }, []);

  /**
   * Get the beats to render based on priority:
   * 1. SubdividedBeatMap (if provided and has beats) - Task 5.4
   * 2. Interpolation visualization data (if provided) - Task 5.1
   * 3. Original BeatMap beats - Default
   */
  const unifiedBeats = useMemo((): UnifiedBeat[] => {
    // Priority 1: SubdividedBeatMap (Task 5.4)
    if (subdividedBeatMap && subdividedBeatMap.beats.length > 0) {
      return convertSubdividedBeats(subdividedBeatMap);
    }
    // Priority 2: Interpolation data (Task 5.1)
    if (interpolationData && interpolationData.beats.length > 0) {
      return convertInterpolationBeats(interpolationData.beats);
    }
    // Priority 3: Original BeatMap
    return convertBeatMapBeats(beatMap.beats);
  }, [subdividedBeatMap, interpolationData, beatMap.beats, convertSubdividedBeats, convertInterpolationBeats, convertBeatMapBeats]);

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

  // ========================================
  // Task 4.2: Measure Boundaries Calculation
  // ========================================

  /**
   * Calculate visible measure boundaries.
   * Finds beats where isDownbeat=true and calculates their positions.
   * Returns measure boundary data for rendering.
   *
   * Part of Phase 4: Measure Visualization (Task 4.2)
   */
  const getVisibleMeasureBoundaries = useCallback((): Array<{
    /** Position on timeline (0-1) */
    position: number;
    /** Measure number (1-indexed for display) */
    measureNumber: number;
    /** Timestamp of the downbeat */
    timestamp: number;
  }> => {
    // Only calculate if measure visualization is enabled
    if (!showMeasureBoundaries) {
      return [];
    }

    // Filter to find downbeats within the visible window
    const minTime = smoothTime - pastWindow;
    const maxTime = smoothTime + anticipationWindow;

    return unifiedBeats
      .filter((beat) => beat.isDownbeat && beat.timestamp >= minTime && beat.timestamp <= maxTime)
      .map((beat) => {
        const position = calculateBeatPosition(beat.timestamp);
        return {
          position,
          measureNumber: beat.measureNumber + 1, // Convert to 1-indexed for display
          timestamp: beat.timestamp,
        };
      })
      .filter((boundary) => boundary.position >= 0 && boundary.position <= 1);
  }, [showMeasureBoundaries, unifiedBeats, smoothTime, pastWindow, anticipationWindow, calculateBeatPosition]);

  const visibleMeasureBoundaries = getVisibleMeasureBoundaries();

  // ========================================
  // Phase 5: SubdividedBeatMap Segment Boundary Visualization (Task 5.4)
  // ========================================

  /**
   * Calculate visible subdivision segment boundaries.
   * Shows vertical lines at segment start positions with subdivision type labels.
   */
  const getVisibleSubdivisionSegmentBoundaries = useCallback((): Array<{
    /** Position on timeline (0-1) */
    position: number;
    /** Subdivision type for this segment */
    subdivisionType: SubdivisionType;
    /** Beat index where segment starts */
    startBeat: number;
    /** Timestamp of the segment start (approximate, based on beat position) */
    timestamp: number;
  }> => {
    // Only show if subdivision visualization is enabled and we have a subdivided beat map
    if (!showSubdivisionVisualization || !subdividedBeatMap || !subdividedBeatMap.subdivisionConfig.segments.length) {
      return [];
    }

    const segments = subdividedBeatMap.subdivisionConfig.segments;
    const minTime = smoothTime - pastWindow;
    const maxTime = smoothTime + anticipationWindow;

    // Find segment boundaries by looking at the subdivided beats
    // Each segment boundary is where the subdivision type changes
    const boundaries: Array<{
      position: number;
      subdivisionType: SubdivisionType;
      startBeat: number;
      timestamp: number;
    }> = [];

    for (const segment of segments) {
      // Find the beat at this segment's start position
      const segmentStartBeat = subdividedBeatMap.beats.find(
        (b) => b.subdivisionType === segment.subdivision &&
               b.originalBeatIndex === segment.startBeat
      );

      // Or find any beat that marks the segment start (for generated beats)
      const beatAtSegmentStart = segmentStartBeat || subdividedBeatMap.beats[segment.startBeat];

      if (beatAtSegmentStart) {
        const timestamp = beatAtSegmentStart.timestamp;

        // Check if this boundary is within the visible window
        if (timestamp >= minTime && timestamp <= maxTime) {
          const position = calculateBeatPosition(timestamp);
          if (position >= 0 && position <= 1) {
            boundaries.push({
              position,
              subdivisionType: segment.subdivision,
              startBeat: segment.startBeat,
              timestamp,
            });
          }
        }
      }
    }

    return boundaries;
  }, [showSubdivisionVisualization, subdividedBeatMap, smoothTime, pastWindow, anticipationWindow, calculateBeatPosition]);

  const visibleSubdivisionSegmentBoundaries = getVisibleSubdivisionSegmentBoundaries();

  // ========================================
  // Task 5.3: Quarter Note Grid Overlay
  // ========================================

  /**
   * Calculate visible grid lines at quarter note intervals.
   * Grid lines are drawn at each quarter note boundary within the visible window.
   */
  const getVisibleGridLines = useCallback((): Array<{
    position: number;
    isMeasure: boolean; // True if this is a measure boundary (every 4th quarter note)
  }> => {
    // Only show grid if interpolation data is available and has quarter note interval
    if (!showGridOverlay || !interpolationData || interpolationData.quarterNoteInterval <= 0) {
      return [];
    }

    const { quarterNoteInterval } = interpolationData;
    const minTime = smoothTime - pastWindow;
    const maxTime = smoothTime + anticipationWindow;

    // Calculate the first grid line within or before the visible window
    const firstGridTime = Math.floor(minTime / quarterNoteInterval) * quarterNoteInterval;

    // Calculate the last grid line within the visible window
    const lastGridTime = Math.ceil(maxTime / quarterNoteInterval) * quarterNoteInterval;

    // Count how many quarter notes from time 0 to first grid (for measure detection)
    const gridLines: Array<{ position: number; isMeasure: boolean }> = [];

    for (let time = firstGridTime; time <= lastGridTime; time += quarterNoteInterval) {
      const position = calculateBeatPosition(time);

      // Only include if within visible bounds
      if (position >= 0 && position <= 1) {
        // Determine if this is a measure boundary (every 4th quarter note in 4/4 time)
        const quarterNoteIndex = Math.round(time / quarterNoteInterval);
        const isMeasure = quarterNoteIndex % 4 === 0;

        gridLines.push({ position, isMeasure });
      }
    }

    return gridLines;
  }, [showGridOverlay, interpolationData, smoothTime, pastWindow, anticipationWindow, calculateBeatPosition]);

  const visibleGridLines = getVisibleGridLines();

  // ========================================
  // Task 5.4: Tempo Drift Visualization
  // ========================================

  /**
   * Calculate visible tempo drift curve and drift sections.
   * Returns an SVG path string and sections where tempo drifts significantly.
   */
  const getTempoDriftVisualization = useCallback((): {
    pathPoints: Array<{ position: number; normalizedBpm: number }>;
    driftSections: Array<{ startPosition: number; endPosition: number; driftType: 'speedup' | 'slowdown' }>;
    avgBpm: number;
  } | null => {
    // Only show if enabled and we have drift data
    if (!showTempoDriftVisualization || !interpolationData?.tempoDrift || interpolationData.tempoDrift.length < 2) {
      return null;
    }

    const { tempoDrift, quarterNoteInterval } = interpolationData;
    const minTime = smoothTime - pastWindow;
    const maxTime = smoothTime + anticipationWindow;

    // Calculate average BPM from quarter note interval
    const avgBpm = quarterNoteInterval > 0 ? 60 / quarterNoteInterval : 120;

    // Filter drift points to visible window
    const visiblePoints = tempoDrift
      .filter((point) => point.time >= minTime && point.time <= maxTime)
      .map((point) => ({
        position: calculateBeatPosition(point.time),
        bpm: point.bpm,
      }))
      .filter((point) => point.position >= 0 && point.position <= 1);

    // Ensure we have at least start and end points
    if (visiblePoints.length < 2) {
      return null;
    }

    // Calculate min/max BPM for normalization
    const bpmValues = visiblePoints.map((p) => p.bpm);
    const minBpm = Math.min(...bpmValues);
    const maxBpm = Math.max(...bpmValues);
    const bpmRange = Math.max(maxBpm - minBpm, 10); // At least 10 BPM range

    // Normalize BPM to 0-1 range for visualization
    const pathPoints = visiblePoints.map((p) => ({
      position: p.position,
      normalizedBpm: (p.bpm - minBpm) / bpmRange,
    }));

    // Detect drift sections (where BPM deviates significantly from average)
    const driftThreshold = 0.03; // 3% deviation threshold
    const driftSections: Array<{ startPosition: number; endPosition: number; driftType: 'speedup' | 'slowdown' }> = [];

    let inDriftSection = false;
    let driftStart = 0;
    let currentDriftType: 'speedup' | 'slowdown' | null = null;

    for (let i = 0; i < visiblePoints.length; i++) {
      const point = visiblePoints[i];
      const deviation = (point.bpm - avgBpm) / avgBpm;
      const isDrifting = Math.abs(deviation) > driftThreshold;
      const driftType = deviation > 0 ? 'speedup' : 'slowdown';

      if (isDrifting && !inDriftSection) {
        // Start new drift section
        inDriftSection = true;
        driftStart = point.position;
        currentDriftType = driftType;
      } else if (isDrifting && inDriftSection && driftType !== currentDriftType) {
        // Drift type changed, close previous and start new
        driftSections.push({
          startPosition: driftStart,
          endPosition: visiblePoints[i - 1].position,
          driftType: currentDriftType!,
        });
        driftStart = point.position;
        currentDriftType = driftType;
      } else if (!isDrifting && inDriftSection) {
        // End drift section
        driftSections.push({
          startPosition: driftStart,
          endPosition: point.position,
          driftType: currentDriftType!,
        });
        inDriftSection = false;
        currentDriftType = null;
      }
    }

    // Close any remaining drift section
    if (inDriftSection && currentDriftType) {
      driftSections.push({
        startPosition: driftStart,
        endPosition: visiblePoints[visiblePoints.length - 1].position,
        driftType: currentDriftType,
      });
    }

    return { pathPoints, driftSections, avgBpm };
  }, [showTempoDriftVisualization, interpolationData, smoothTime, pastWindow, anticipationWindow, calculateBeatPosition]);

  const tempoDriftViz = getTempoDriftVisualization();

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

        {/* Task 5.3: Quarter Note Grid Overlay */}
        {showGridOverlay && visibleGridLines.map((gridLine, index) => (
          <div
            key={`grid-${index}`}
            className={`beat-timeline-grid-line ${gridLine.isMeasure ? 'beat-timeline-grid-line--measure' : ''}`}
            style={{ left: `${gridLine.position * 100}%` }}
          />
        ))}

        {/* Task 4.3: Measure Boundary Lines */}
        {/* Task 4.4: Measure Number Labels */}
        {showMeasureBoundaries && visibleMeasureBoundaries.map((boundary, index) => (
          <div
            key={`measure-boundary-${index}`}
            className="beat-timeline-measure-boundary"
            style={{ left: `${boundary.position * 100}%` }}
          >
            <div className="beat-timeline-measure-line" />
            <span className="beat-timeline-measure-number">M{boundary.measureNumber}</span>
          </div>
        ))}

        {/* Phase 5: SubdividedBeatMap Segment Boundaries (Task 5.4) */}
        {showSubdivisionVisualization && visibleSubdivisionSegmentBoundaries.map((boundary, index) => (
          <div
            key={`subdivision-segment-${index}`}
            className={`beat-timeline-subdivision-boundary beat-timeline-subdivision-boundary--${boundary.subdivisionType}`}
            style={{ left: `${boundary.position * 100}%` }}
          >
            <div className="beat-timeline-subdivision-line" />
            <span className="beat-timeline-subdivision-label">{boundary.subdivisionType}</span>
          </div>
        ))}

        {/* Task 5.4: Tempo Drift Visualization */}
        {tempoDriftViz && (
          <>
            {/* Drift section highlights */}
            {tempoDriftViz.driftSections.map((section, index) => (
              <div
                key={`drift-section-${index}`}
                className={`beat-timeline-drift-section beat-timeline-drift-section--${section.driftType}`}
                style={{
                  left: `${section.startPosition * 100}%`,
                  width: `${(section.endPosition - section.startPosition) * 100}%`,
                }}
              />
            ))}
            {/* Tempo curve SVG */}
            <svg
              className="beat-timeline-tempo-curve"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="tempo-curve-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="hsl(var(--primary) / 0.4)" />
                  <stop offset="50%" stopColor="hsl(var(--primary) / 0.2)" />
                  <stop offset="100%" stopColor="hsl(var(--primary) / 0.1)" />
                </linearGradient>
              </defs>
              {/* Area fill under the curve */}
              <path
                d={`M ${tempoDriftViz.pathPoints[0].position * 100} ${100 - tempoDriftViz.pathPoints[0].normalizedBpm * 80 - 10} ` +
                  tempoDriftViz.pathPoints.slice(1).map((p) => `L ${p.position * 100} ${100 - p.normalizedBpm * 80 - 10}`).join(' ') +
                  ` L ${tempoDriftViz.pathPoints[tempoDriftViz.pathPoints.length - 1].position * 100} 100 L ${tempoDriftViz.pathPoints[0].position * 100} 100 Z`}
                className="beat-timeline-tempo-curve-area"
                fill="url(#tempo-curve-gradient)"
              />
              {/* Main curve line */}
              <path
                d={`M ${tempoDriftViz.pathPoints[0].position * 100} ${100 - tempoDriftViz.pathPoints[0].normalizedBpm * 80 - 10} ` +
                  tempoDriftViz.pathPoints.slice(1).map((p) => `L ${p.position * 100} ${100 - p.normalizedBpm * 80 - 10}`).join(' ')}
                className="beat-timeline-tempo-curve-line"
                fill="none"
                stroke="hsl(var(--primary) / 0.6)"
                strokeWidth="0.5"
              />
            </svg>
          </>
        )}

        {/* Beat markers */}
        {visibleBeats.map(({ beat, position, isPast, isUpcoming }) => (
          <div
            key={beat.key}
            className={`beat-timeline-marker ${
              beat.isDownbeat ? 'beat-timeline-marker--downbeat' : ''
            } ${isPast ? 'beat-timeline-marker--past' : ''} ${
              isUpcoming ? 'beat-timeline-marker--upcoming' : ''
            } ${beat.source === 'interpolated' ? 'beat-timeline-marker--interpolated' : ''} ${
              beat.source === 'subdivided' ? 'beat-timeline-marker--subdivided' : ''
            } ${
              beat.subdivisionType ? `beat-timeline-marker--subdivision-${beat.subdivisionType}` : ''
            } ${
              enableBeatSelection ? 'beat-timeline-marker--selectable' : ''
            } ${
              selectedBeatIndex !== undefined && beat.beatIndex === selectedBeatIndex
                ? 'beat-timeline-marker--selected'
                : ''
            }`}
            style={{
              left: `${position * 100}%`,
              // For detected beats, use confidence if available; for interpolated/subdivided beats, always use confidence
              opacity: beat.source === 'detected' ? (beat.confidence ?? 1) : beat.confidence,
            }}
            onClick={
              enableBeatSelection && onBeatClick
                ? (e) => {
                    e.stopPropagation(); // Prevent timeline seek
                    onBeatClick(beat.beatIndex);
                  }
                : undefined
            }
            role={enableBeatSelection ? 'button' : undefined}
            tabIndex={enableBeatSelection ? 0 : undefined}
            aria-label={
              enableBeatSelection
                ? `Beat ${beat.beatIndex + 1}${beat.isDownbeat ? ' (downbeat)' : ''}${beat.subdivisionType ? ` (${beat.subdivisionType})` : ''}`
                : undefined
            }
            onKeyDown={
              enableBeatSelection && onBeatClick
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onBeatClick(beat.beatIndex);
                    }
                  }
                : undefined
            }
          >
            {/* Beat inner dot */}
            <div className="beat-timeline-marker-dot" />
            {/* Downbeat accent ring */}
            {beat.isDownbeat && <div className="beat-timeline-marker-ring" />}
            {/* Task 3.4: Beat number label - shown when selection mode is enabled */}
            {enableBeatSelection && (
              <span className="beat-timeline-marker-number">
                {beat.beatIndex + 1}
              </span>
            )}
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
      {/* Task 5.3: Added grid overlay indicator */}
      {/* Task 5.4: Added tempo drift indicator */}
      {/* Phase 5 Task 5.4: Added subdivision legend */}
      {subdividedBeatMap && showSubdivisionVisualization ? (
        <div className="beat-timeline-legend">
          {/* Show subdivision types used in this beat map */}
          {subdividedBeatMap.subdivisionMetadata.subdivisionsUsed.map((subType) => (
            <div key={subType} className="beat-timeline-legend-item">
              <div className={`beat-timeline-legend-marker beat-timeline-legend-marker--subdivision-${subType}`} />
              <span className="beat-timeline-legend-label">{subType}</span>
            </div>
          ))}
          <div className="beat-timeline-legend-item">
            <div className="beat-timeline-legend-subdivision-boundary" />
            <span className="beat-timeline-legend-label">Segment boundary</span>
          </div>
        </div>
      ) : interpolationData ? (
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
          {showGridOverlay && (
            <div className="beat-timeline-legend-item">
              <div className="beat-timeline-legend-grid" />
              <span className="beat-timeline-legend-label">Quarter note grid</span>
            </div>
          )}
          {showTempoDriftVisualization && (
            <div className="beat-timeline-legend-item">
              <div className="beat-timeline-legend-tempo" />
              <span className="beat-timeline-legend-label">Tempo curve</span>
            </div>
          )}
        </div>
      ) : null}

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
