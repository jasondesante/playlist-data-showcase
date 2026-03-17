/**
 * KeyLaneView Container Component
 *
 * A rhythm game visualization container that displays multiple KeyLane components
 * in either DDR style (4 lanes) or Guitar Hero style (5 lanes).
 *
 * Features:
 * - DDR mode: 4 lanes (left, down, up, right)
 * - Guitar Hero mode: 5 lanes (1, 2, 3, 4, 5)
 * - Filters beats by requiredKey to appropriate lanes
 * - Beats without required key show in ALL lanes (hittable with any key)
 * - Syncs with audio playback position
 * - Handles beat visibility window
 * - Responsive sizing for different screen widths
 *
 * Part of Phase 10: KeyLane Views (Core Rhythm Game Visualization) - Task 10.2
 *
 * @component
 */

import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { cn } from '@/utils/cn';
import { KeyLane, getLanesForStyle, type LaneBeat } from './KeyLane';
import { ComboFeedbackDisplay } from './ComboFeedbackDisplay';
import type {
    ChartStyle,
    SupportedKey,
    ExtendedBeatAccuracy,
    SubdividedBeatMap,
    Beat,
} from '@/types';
import { isDdrKey, isGuitarKey } from '@/types';
import './KeyLaneView.css';

/**
 * Beat hit state for tracking which beats have been hit/missed.
 * Key is the beat timestamp (rounded to avoid floating point issues).
 */
type BeatHitState = Map<number, { hit: boolean; missed: boolean; accuracy?: ExtendedBeatAccuracy }>;

/**
 * Props for the KeyLaneView container component
 */
export interface KeyLaneViewProps {
    /** The subdivided beat map with requiredKey assignments */
    beatMap: SubdividedBeatMap | null;
    /** Current playback time in seconds */
    currentTime: number;
    /** Chart style: DDR (4 lanes) or Guitar Hero (5 lanes) */
    chartStyle: ChartStyle;
    /** Whether the view is active (practice mode running) */
    isActive?: boolean;
    /** Whether playback is paused */
    isPaused?: boolean;
    /** Time window in seconds for visible beats (default: 2.0) */
    visibilityWindow?: number;
    /** Optional className for additional styling */
    className?: string;
    /** Last tap accuracy for visual feedback across all lanes */
    lastAccuracy?: ExtendedBeatAccuracy | null;
    /** The key that was pressed in the last tap */
    lastPressedKey?: string | null;
    /** Timestamp of the beat that was last hit (for marking beat as hit) */
    lastHitBeatTimestamp?: number | null;
    /** The timing offset in milliseconds (positive = late, negative = early) */
    lastTapOffsetMs?: number | null;
    /** Callback when user clicks/drags to seek in the lane area */
    onSeek?: (time: number) => void;
    /** Current session score for ComboFeedbackDisplay (Phase 3.5: Task 3.5.3) */
    score?: number;
    /** Current combo count for ComboFeedbackDisplay (Phase 3.5: Task 3.5.3) */
    combo?: number;
    /** Current XP multiplier for ComboFeedbackDisplay (Phase 3.5: Task 3.5.3) */
    multiplier?: number;
}

/**
 * Round timestamp to avoid floating point comparison issues.
 * Rounds to 3 decimal places (millisecond precision).
 */
function roundTimestamp(timestamp: number): number {
    return Math.round(timestamp * 1000) / 1000;
}


/**
 * Binary search to find the index of the first beat at or after the given time.
 * Returns the index of the first beat >= targetTime, or beats.length if none found.
 */
function findFirstBeatAtOrAfter(beats: Beat[], targetTime: number): number {
    let left = 0;
    let right = beats.length;

    while (left < right) {
        const mid = Math.floor((left + right) / 2);
        if (beats[mid].timestamp < targetTime) {
            left = mid + 1;
        } else {
            right = mid;
        }
    }

    return left;
}

/**
 * Beat without a required key - can be hit with any key.
 * Rendered as a single wide overlay spanning all lanes for performance.
 */
export interface AnyBeat {
    /** Unique identifier */
    id: string;
    /** Timestamp when this beat should be hit (in seconds) */
    timestamp: number;
    /** Whether this beat has been hit */
    hit?: boolean;
    /** Whether this beat was missed */
    missed?: boolean;
    /** Accuracy of the hit (if hit) */
    accuracy?: ExtendedBeatAccuracy;
}

/**
 * Result of distributing beats to lanes.
 * Contains lane-specific beats and separate "any" beats for overlay rendering.
 */
interface DistributeBeatsResult {
    /** Beats organized by lane key */
    beatsByLane: Map<SupportedKey, LaneBeat[]>;
    /** Beats without required key (rendered as overlay) */
    anyBeats: AnyBeat[];
}

/**
 * Distribute beats from the beat map to their respective lanes.
 * - Beats with requiredKey go to their specific lane
 * - Beats without requiredKey are returned separately as "any" beats
 *   (rendered as a single overlay spanning all lanes for performance)
 *
 * Optimized to use binary search for finding visible beats instead of
 * filtering the entire array on every frame.
 */
function distributeBeatsToLanes(
    beatMap: SubdividedBeatMap | null,
    chartStyle: ChartStyle,
    currentTime: number,
    visibilityWindow: number,
    hitState: BeatHitState
): DistributeBeatsResult {
    const laneMap = new Map<SupportedKey, LaneBeat[]>();
    const anyBeats: AnyBeat[] = [];
    const lanes = getLanesForStyle(chartStyle);

    // Initialize empty arrays for each lane
    for (const laneKey of lanes) {
        laneMap.set(laneKey, []);
    }

    if (!beatMap || !beatMap.beats || beatMap.beats.length === 0) {
        return { beatsByLane: laneMap, anyBeats };
    }

    // Calculate visibility bounds
    // Show 1.5 seconds into the past so hit effects linger longer
    const minTime = currentTime - 1.5;
    const maxTime = currentTime + visibilityWindow;

    // Use binary search to find the starting index
    const startIndex = findFirstBeatAtOrAfter(beatMap.beats, minTime);

    // Iterate only through visible beats
    for (let i = startIndex; i < beatMap.beats.length; i++) {
        const beat = beatMap.beats[i];

        // Stop if we've gone past the visibility window
        if (beat.timestamp > maxTime) {
            break;
        }

        if (beat.requiredKey) {
            // Beat has a required key - add to specific lane
            const laneBeats = laneMap.get(beat.requiredKey as SupportedKey);
            if (laneBeats) {
                laneBeats.push({
                    id: `beat-${beat.timestamp.toFixed(3)}`,
                    timestamp: beat.timestamp,
                    requiredKey: beat.requiredKey as SupportedKey,
                    ...getBeatHitState(beat.timestamp, hitState),
                });
            }
        } else {
            // Beat has no required key - add to "any" beats for overlay rendering
            // This is more performant than duplicating across all lanes
            const hitStateForBeat = getBeatHitState(beat.timestamp, hitState);
            anyBeats.push({
                id: `any-beat-${beat.timestamp.toFixed(3)}`,
                timestamp: beat.timestamp,
                ...hitStateForBeat,
            });
        }
    }

    return { beatsByLane: laneMap, anyBeats };
}

/**
 * Get hit state for a beat from the hit state map.
 */
function getBeatHitState(
    timestamp: number,
    hitState: BeatHitState
): { hit: boolean; missed: boolean; accuracy?: ExtendedBeatAccuracy } {
    const roundedTime = roundTimestamp(timestamp);
    const state = hitState.get(roundedTime);
    return {
        hit: state?.hit ?? false,
        missed: state?.missed ?? false,
        accuracy: state?.accuracy,
    };
}

/**
 * Detect the chart style based on the keys used in the beat map.
 * Returns 'ddr' if any DDR keys (arrows) are used, 'guitar-hero' if any Guitar Hero keys (numbers) are used.
 * Returns null if no keys are assigned or can't determine.
 */
function detectChartStyleFromKeys(beatMap: SubdividedBeatMap | null): ChartStyle | null {
    if (!beatMap || !beatMap.beats) return null;

    let hasDdrKeys = false;
    let hasGuitarKeys = false;

    for (const beat of beatMap.beats) {
        if (beat.requiredKey) {
            if (isDdrKey(beat.requiredKey)) {
                hasDdrKeys = true;
            } else if (isGuitarKey(beat.requiredKey)) {
                hasGuitarKeys = true;
            }
        }
    }

    // If both types exist, prefer DDR (default)
    if (hasDdrKeys && hasGuitarKeys) return 'ddr';
    if (hasDdrKeys) return 'ddr';
    if (hasGuitarKeys) return 'guitar-hero';
    return null;
}

/**
 * KeyLaneView Container Component
 *
 * Renders the appropriate number of lanes based on chart style.
 * DDR shows 4 lanes (left, down, up, right)
 * Guitar Hero shows 5 lanes (1, 2, 3, 4, 5)
 *
 * @example
 * ```tsx
 * <KeyLaneView
 *   beatMap={subdividedBeatMap}
 *   currentTime={audioTime}
 *   chartStyle="ddr"
 *   isActive={true}
 *   isPaused={false}
 * />
 * ```
 */
export function KeyLaneView({
    beatMap,
    currentTime,
    chartStyle,
    isActive = true,
    isPaused = false,
    visibilityWindow = 2.0,
    className,
    lastAccuracy,
    lastPressedKey,
    lastHitBeatTimestamp,
    lastTapOffsetMs,
    onSeek,
    score = 0,
    combo = 0,
    multiplier = 1.0,
}: KeyLaneViewProps) {
    // ========================================
    // Smooth Animation with requestAnimationFrame
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

    // Track playing state in ref for animation loop
    const isPlayingRef = useRef(!isPaused);

    // ========================================
    // Click/Drag Seeking (Vertical)
    // ========================================

    const lanesContainerRef = useRef<HTMLDivElement>(null);
    const laneEndRef = useRef<HTMLDivElement>(null);
    const [isDraggingToSeek, setIsDraggingToSeek] = useState(false);
    const [lanesWidth, setLanesWidth] = useState(0);

    // Refs to track drag state (refs don't trigger re-renders)
    const dragStartYRef = useRef<number>(0);
    const dragStartTimeRef = useRef<number>(0);

    /**
     * Handle mouse down on lanes container - start vertical dragging
     * Captures the initial click position and time
     */
    const handleMouseDown = useCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
            if (!onSeek || !lanesContainerRef.current) return;

            event.preventDefault();
            setIsDraggingToSeek(true);

            // Capture the initial position and time
            dragStartYRef.current = event.clientY;
            dragStartTimeRef.current = smoothTime;
        },
        [onSeek, smoothTime]
    );

    /**
     * Handle mouse move during vertical drag
     * Calculates delta from initial position and applies to initial time
     */
    const handleMouseMove = useCallback(
        (event: MouseEvent) => {
            if (!isDraggingToSeek || !onSeek || !lanesContainerRef.current) return;

            const rect = lanesContainerRef.current.getBoundingClientRect();
            const trackHeight = rect.height;

            // Calculate how far we've moved from the start position (in pixels)
            const deltaY = event.clientY - dragStartYRef.current;

            // Convert pixel delta to time delta
            // Full track height = visibilityWindow seconds
            // Guitar Hero: Drag up = go backward in time, Drag down = go forward in time
            // DDR: Inverted - Drag up = go forward in time, Drag down = go backward in time
            const timePerPixel = visibilityWindow / trackHeight;
            const directionMultiplier = chartStyle === 'ddr' ? -1 : 1;
            const deltaTime = deltaY * timePerPixel * directionMultiplier;

            // Apply delta to the initial time
            const duration = beatMap?.duration ?? 0;
            const newTime = Math.max(0, Math.min(duration, dragStartTimeRef.current + deltaTime));

            onSeek(newTime);
        },
        [isDraggingToSeek, onSeek, visibilityWindow, beatMap?.duration, chartStyle]
    );

    /**
     * Handle mouse up - end vertical drag
     */
    const handleMouseUp = useCallback(() => {
        setIsDraggingToSeek(false);
    }, []);

    /**
     * Handle touch start on lanes container - start vertical dragging
     */
    const handleTouchStart = useCallback(
        (event: React.TouchEvent<HTMLDivElement>) => {
            if (!onSeek || !lanesContainerRef.current) return;

            const touch = event.touches[0];
            setIsDraggingToSeek(true);

            // Capture the initial position and time
            dragStartYRef.current = touch.clientY;
            dragStartTimeRef.current = smoothTime;
        },
        [onSeek, smoothTime]
    );

    /**
     * Handle touch move during vertical drag
     */
    const handleTouchMove = useCallback(
        (event: React.TouchEvent<HTMLDivElement>) => {
            if (!isDraggingToSeek || !onSeek || !lanesContainerRef.current) return;

            const touch = event.touches[0];
            const rect = lanesContainerRef.current.getBoundingClientRect();
            const trackHeight = rect.height;

            // Calculate how far we've moved from the start position (in pixels)
            const deltaY = touch.clientY - dragStartYRef.current;

            // Convert pixel delta to time delta
            // Guitar Hero: Drag up = go backward in time, Drag down = go forward in time
            // DDR: Inverted - Drag up = go forward in time, Drag down = go backward in time
            const timePerPixel = visibilityWindow / trackHeight;
            const directionMultiplier = chartStyle === 'ddr' ? -1 : 1;
            const deltaTime = deltaY * timePerPixel * directionMultiplier;

            // Apply delta to the initial time
            const duration = beatMap?.duration ?? 0;
            const newTime = Math.max(0, Math.min(duration, dragStartTimeRef.current + deltaTime));

            onSeek(newTime);
        },
        [isDraggingToSeek, onSeek, visibilityWindow, beatMap?.duration, chartStyle]
    );

    /**
     * Handle touch end - end vertical drag
     */
    const handleTouchEnd = useCallback(() => {
        setIsDraggingToSeek(false);
    }, []);

    /**
     * Measure where the lanes actually end using a zero-width sentinel div.
     * The sentinel is placed as a flex child immediately after the last lane.
     * Its offsetLeft = exact total width of all rendered lane columns.
     * Re-measures when the container resizes (handles responsive breakpoints).
     */
    useEffect(() => {
        const sentinel = laneEndRef.current;
        const container = lanesContainerRef.current;
        if (!sentinel || !container) return;
        const update = () => setLanesWidth(sentinel.offsetLeft);
        update();
        const obs = new ResizeObserver(update);
        obs.observe(container);
        return () => obs.disconnect();
    }, [chartStyle]);

    /**
     * Add/remove global mouse event listeners when dragging
     */
    useEffect(() => {
        if (isDraggingToSeek) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDraggingToSeek, handleMouseMove, handleMouseUp]);

    // Keep refs in sync with props
    useEffect(() => {
        lastAudioTimeRef.current = {
            time: currentTime,
            timestamp: performance.now(),
        };
    }, [currentTime]);

    useEffect(() => {
        isPlayingRef.current = !isPaused;
    }, [isPaused]);

    /**
     * Animation loop for smooth scrolling.
     * Uses requestAnimationFrame for 60fps updates.
     * Interpolates time between audio player updates.
     */
    useEffect(() => {
        if (isPaused) {
            // When paused, update smoothTime whenever currentTime changes (e.g., from seeking)
            setSmoothTime(currentTime);
            return;
        }

        /**
         * Animation loop function
         */
        const animate = () => {
            const { time: lastAudioTime, timestamp: lastTimestamp } = lastAudioTimeRef.current;
            const now = performance.now();
            const elapsedMs = now - lastTimestamp;
            const elapsedSeconds = elapsedMs / 1000;

            // Calculate interpolated time
            const interpolatedTime = lastAudioTime + elapsedSeconds;

            // Clamp to beat map duration if available
            const maxDuration = beatMap?.duration ?? Infinity;
            const clampedTime = Math.min(interpolatedTime, maxDuration);

            // Update smooth time state
            setSmoothTime(clampedTime);

            // Continue animation if still playing
            if (isPlayingRef.current && clampedTime < maxDuration) {
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
    }, [isPaused, beatMap?.duration, currentTime]); // Include currentTime so paused seeking updates smoothTime

    // Track hit/miss state for beats (persists across renders)
    const beatHitStateRef = useRef<BeatHitState>(new Map());
    const lastProcessedHitRef = useRef<number | null>(null);

    // Track last time to detect seeking backwards (rewind)
    const lastSmoothTimeRef = useRef<number>(0);

    // State counter to force re-computation of beatsByLane when beats are cleared
    const [beatStateVersion, setBeatStateVersion] = useState(0);

    // Clear future beat states when seeking backwards (rewind detection)
    // Uses smoothTime since that's what's used for rendering
    useEffect(() => {
        // If time went backwards, this is a seek/rewind - clear future beat states
        if (smoothTime < lastSmoothTimeRef.current - 0.05) {
            // Clear all beat states that are in the future relative to new time
            const state = beatHitStateRef.current;
            let clearedAny = false;
            for (const [timestamp] of state) {
                if (timestamp > smoothTime) {
                    state.delete(timestamp);
                    clearedAny = true;
                }
            }
            // Also reset the last processed hit so beats can be hit again
            if (clearedAny) {
                lastProcessedHitRef.current = null;
                // Force re-render to update beatsByLane memo
                setBeatStateVersion((v) => v + 1);
            }
        }
        lastSmoothTimeRef.current = smoothTime;
    }, [smoothTime]);

    // Update beat hit state when a beat is hit
    useEffect(() => {
        if (
            lastHitBeatTimestamp !== null &&
            lastHitBeatTimestamp !== undefined &&
            lastAccuracy &&
            lastHitBeatTimestamp !== lastProcessedHitRef.current
        ) {
            const roundedTime = roundTimestamp(lastHitBeatTimestamp);
            const isHit = lastAccuracy !== 'miss' && lastAccuracy !== 'wrongKey';
            const isMiss = lastAccuracy === 'miss';

            beatHitStateRef.current.set(roundedTime, {
                hit: isHit,
                missed: isMiss,
                accuracy: lastAccuracy,
            });

            lastProcessedHitRef.current = lastHitBeatTimestamp;
        }
    }, [lastHitBeatTimestamp, lastAccuracy]);

    // Clean up old beat states (beats that have passed more than 2 seconds ago)
    // Throttled to run every ~500ms instead of every frame for performance
    const lastCleanupTimeRef = useRef<number>(0);
    useEffect(() => {
        // Only cleanup every 500ms to avoid performance overhead
        if (currentTime - lastCleanupTimeRef.current < 0.5) {
            return;
        }
        lastCleanupTimeRef.current = currentTime;

        const cleanupThreshold = currentTime - 2.0;
        const state = beatHitStateRef.current;

        for (const [timestamp] of state) {
            if (timestamp < cleanupThreshold) {
                state.delete(timestamp);
            }
        }
    }, [currentTime]);

    // Reset beat hit state when beat map changes (new song/seek)
    const beatMapIdRef = useRef<string | null>(null);
    useEffect(() => {
        // Use beatMap reference to detect changes
        const currentId = beatMap ? `map-${beatMap.beats.length}` : null;
        if (currentId !== beatMapIdRef.current) {
            beatHitStateRef.current.clear();
            lastProcessedHitRef.current = null;
            lastSmoothTimeRef.current = 0;
            beatMapIdRef.current = currentId;
        }
    }, [beatMap]);

    // Get the lanes for this chart style
    const lanes = useMemo(() => getLanesForStyle(chartStyle), [chartStyle]);

    // Distribute beats to lanes based on requiredKey
    // Include beatStateVersion to force re-computation when beats are cleared on rewind
    const { beatsByLane, anyBeats } = useMemo(
        () => distributeBeatsToLanes(beatMap, chartStyle, smoothTime, visibilityWindow, beatHitStateRef.current),
        [beatMap, chartStyle, smoothTime, visibilityWindow, beatStateVersion]
    );

    // Determine if we're showing an empty state
    // Optimized: derive from beatsByLane instead of iterating through all beats
    const hasBeats = useMemo(() => {
        if (!beatMap || !beatMap.beats) return false;
        // Check if any lane has beats OR if there are any "any" beats
        for (const [, laneBeats] of beatsByLane) {
            if (laneBeats.length > 0) return true;
        }
        if (anyBeats.length > 0) return true;
        return false;
    }, [beatMap, beatsByLane, anyBeats]);

    // Check if there are any beats with required keys (chart has notes)
    const hasChartNotes = useMemo(() => {
        if (!beatMap || !beatMap.beats) return false;
        return beatMap.beats.some((beat) => beat.requiredKey);
    }, [beatMap]);

    // Detect the actual chart style based on used keys
    const detectedChartStyle = useMemo(() => detectChartStyleFromKeys(beatMap), [beatMap]);

    // Check for style mismatch (viewing DDR lanes for Guitar Hero chart or vice versa)
    const styleMismatch = useMemo(() => {
        if (!hasChartNotes || !detectedChartStyle) return false;
        return detectedChartStyle !== chartStyle;
    }, [hasChartNotes, detectedChartStyle, chartStyle]);

    // Get hint message for style mismatch
    const styleMismatchHint = useMemo(() => {
        if (!styleMismatch) return null;
        if (chartStyle === 'ddr' && detectedChartStyle === 'guitar-hero') {
            return 'Chart uses number keys - switch to Guitar Lanes view';
        }
        if (chartStyle === 'guitar-hero' && detectedChartStyle === 'ddr') {
            return 'Chart uses arrow keys - switch to DDR Lanes view';
        }
        return null;
    }, [styleMismatch, chartStyle, detectedChartStyle]);

    return (
        <div
            className={cn(
                'key-lane-view',
                `key-lane-view--${chartStyle}`,
                isActive && 'key-lane-view--active',
                isPaused && 'key-lane-view--paused',
                !hasBeats && 'key-lane-view--empty',
                className
            )}
            role="region"
            aria-label={`${chartStyle === 'ddr' ? 'DDR' : 'Guitar Hero'} rhythm game view`}
        >
            {/* Empty state message */}
            {!hasBeats && (
                <div className="key-lane-view-empty">
                    <span className="key-lane-view-empty-text">
                        {beatMap ? 'Waiting for beats...' : 'No chart loaded'}
                    </span>
                </div>
            )}

            {/* Lanes container — contains lanes, any-overlay, AND feedback panel */}
            <div
                ref={lanesContainerRef}
                className={cn(
                    'key-lane-view-lanes',
                    onSeek && 'key-lane-view-lanes--draggable',
                    isDraggingToSeek && 'key-lane-view-lanes--dragging'
                )}
                data-lanes={lanes.length}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                role={onSeek ? 'slider' : undefined}
                aria-label="Timeline scrubber"
                aria-valuemin={0}
                aria-valuemax={beatMap?.duration ?? 0}
                aria-valuenow={smoothTime}
                tabIndex={onSeek ? 0 : undefined}
            >
                {/* Individual lane components */}
                {lanes.map((laneKey) => {
                    const laneBeats = beatsByLane.get(laneKey) || [];
                    const showFeedback = lastPressedKey === laneKey;

                    return (
                        <KeyLane
                            key={laneKey}
                            laneKey={laneKey}
                            beats={laneBeats}
                            currentTime={smoothTime}
                            visibilityWindow={visibilityWindow}
                            isActive={isActive}
                            isPaused={isPaused}
                            showHitZone={true}
                            chartStyle={chartStyle}
                            lastAccuracy={showFeedback ? lastAccuracy : null}
                        />
                    );
                })}

                {/* Sentinel: zero-width flex child placed right after the last lane.
                    offsetLeft of this element = exact total width of all lane columns. */}
                <div ref={laneEndRef} style={{ flex: 'none', width: 0, alignSelf: 'stretch', pointerEvents: 'none' }} />

                {/* "Any" notes overlay — width set to exact lanes area via sentinel measurement */}
                {anyBeats.length > 0 && (
                    <div
                        className="key-lane-view-any-notes-overlay"
                        style={{
                            '--lane-count': lanes.length,
                            width: lanesWidth > 0 ? `${lanesWidth}px` : undefined,
                        } as React.CSSProperties}
                    >
                        {anyBeats
                            .filter((beat) => {
                                const minTime = smoothTime - 1.5;
                                const maxTime = smoothTime + visibilityWindow;
                                return beat.timestamp >= minTime && beat.timestamp <= maxTime;
                            })
                            .map((beat) => {
                                const timeUntilBeat = beat.timestamp - smoothTime;
                                const invertDirection = chartStyle === 'ddr';
                                const hitZonePercent = 85;
                                let position = hitZonePercent - (timeUntilBeat / visibilityWindow) * hitZonePercent;
                                position = invertDirection ? 100 - position : position;
                                const clampedPosition = Math.max(0, Math.min(100, position));

                                return (
                                    <div
                                        key={beat.id}
                                        className={cn(
                                            'key-lane-view-any-note',
                                            beat.hit && 'key-lane-view-any-note--hit',
                                            beat.missed && 'key-lane-view-any-note--missed',
                                            beat.accuracy === 'perfect' && 'key-lane-view-any-note--perfect',
                                            beat.accuracy === 'great' && 'key-lane-view-any-note--great',
                                            beat.accuracy === 'good' && 'key-lane-view-any-note--good',
                                            beat.accuracy === 'ok' && 'key-lane-view-any-note--ok'
                                        )}
                                        style={{ top: `${clampedPosition}%` }}
                                    >
                                        <span className="key-lane-view-any-note-label">ANY</span>
                                    </div>
                                );
                            })}
                    </div>
                )}

                {/* Tap feedback panel */}
                <div className="key-lane-view-feedback">
                    {/* Combo feedback display (Phase 3.5: Task 3.5.3) - always visible */}
                    <ComboFeedbackDisplay
                        score={score}
                        combo={combo}
                        multiplier={multiplier}
                    />

                    {/* Accuracy feedback - shows accuracy rating and timing offset */}
                    {lastAccuracy && lastTapOffsetMs !== null && lastTapOffsetMs !== undefined ? (
                        <div
                            key={`${lastAccuracy}-${lastTapOffsetMs}-${lastHitBeatTimestamp}`}
                            className={cn('key-lane-view-feedback-result', `key-lane-view-feedback-result--${lastAccuracy}`)}
                        >
                            <span className="key-lane-view-feedback-accuracy">
                                {lastAccuracy.toUpperCase()}
                            </span>
                            <span className={cn('key-lane-view-feedback-offset', `key-lane-view-feedback-offset--${lastTapOffsetMs >= 0 ? 'late' : 'early'}`)}>
                                {lastTapOffsetMs >= 0 ? '+' : ''}{lastTapOffsetMs}ms
                            </span>
                        </div>
                    ) : (
                        <div className="key-lane-view-feedback-placeholder">
                            <span className="key-lane-view-feedback-hint">Hit the notes!</span>
                        </div>
                    )}
                </div> {/* closes key-lane-view-feedback */}
            </div> {/* closes key-lane-view-lanes */}

            {/* Chart info overlay */}
            {hasChartNotes && (
                <div className="key-lane-view-info">
                    <span className="key-lane-view-info-style">
                        {chartStyle === 'ddr' ? 'DDR Mode' : 'Guitar Hero Mode'}
                    </span>
                </div>
            )}

            {/* Style mismatch hint */}
            {!hasChartNotes && hasBeats && beatMap && (
                <div className="key-lane-view-hint">
                    <span className="key-lane-view-hint-text">
                        No key assignments - edit chart to add notes
                    </span>
                </div>
            )}

            {/* Style mismatch warning - viewing wrong lane type for chart */}
            {styleMismatch && styleMismatchHint && (
                <div className="key-lane-view-mismatch">
                    <span className="key-lane-view-mismatch-text">
                        {styleMismatchHint}
                    </span>
                </div>
            )}
        </div>
    );
}

/**
 * Get the default KeyLaneView mode based on chart style.
 * Returns 'ddr' for DDR charts, 'guitar-hero' for Guitar Hero charts.
 */
export function getDefaultViewModeForChart(chartStyle: ChartStyle): 'ddr' | 'guitar-hero' {
    return chartStyle === 'ddr' ? 'ddr' : 'guitar-hero';
}

export default KeyLaneView;
