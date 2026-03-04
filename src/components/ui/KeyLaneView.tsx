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

import { useMemo, useRef, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { KeyLane, getLanesForStyle, type LaneBeat } from './KeyLane';
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
}

/**
 * Round timestamp to avoid floating point comparison issues.
 * Rounds to 3 decimal places (millisecond precision).
 */
function roundTimestamp(timestamp: number): number {
    return Math.round(timestamp * 1000) / 1000;
}

/**
 * Convert a Beat from the beat map to a LaneBeat for the lane.
 */
function beatToLaneBeat(
    beat: Beat,
    requiredKey: SupportedKey,
    hitState?: BeatHitState
): LaneBeat {
    const roundedTime = roundTimestamp(beat.timestamp);
    const state = hitState?.get(roundedTime);
    return {
        id: `beat-${beat.timestamp.toFixed(3)}-${requiredKey}`,
        timestamp: beat.timestamp,
        requiredKey,
        hit: state?.hit ?? false,
        missed: state?.missed ?? false,
        accuracy: state?.accuracy,
    };
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
 * Distribute beats from the beat map to their respective lanes.
 * - Beats with requiredKey go to their specific lane
 * - Beats without requiredKey go to ALL lanes (hittable with any key)
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
): Map<SupportedKey, LaneBeat[]> {
    const laneMap = new Map<SupportedKey, LaneBeat[]>();
    const lanes = getLanesForStyle(chartStyle);

    // Initialize empty arrays for each lane
    for (const laneKey of lanes) {
        laneMap.set(laneKey, []);
    }

    if (!beatMap || !beatMap.beats || beatMap.beats.length === 0) {
        return laneMap;
    }

    // Calculate visibility bounds
    const minTime = currentTime - 0.2; // Show slightly past for fade-out
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
            // Beat has no required key - add to ALL lanes (hittable with any key)
            for (const laneKey of lanes) {
                const laneBeats = laneMap.get(laneKey);
                if (laneBeats) {
                    laneBeats.push(beatToLaneBeat(beat, laneKey, hitState));
                }
            }
        }
    }

    return laneMap;
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
}: KeyLaneViewProps) {
    // Track hit/miss state for beats (persists across renders)
    const beatHitStateRef = useRef<BeatHitState>(new Map());
    const lastProcessedHitRef = useRef<number | null>(null);

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

    // Clean up old beat states (beats that have passed more than 1 second ago)
    // Throttled to run every ~500ms instead of every frame for performance
    const lastCleanupTimeRef = useRef<number>(0);
    useEffect(() => {
        // Only cleanup every 500ms to avoid performance overhead
        if (currentTime - lastCleanupTimeRef.current < 0.5) {
            return;
        }
        lastCleanupTimeRef.current = currentTime;

        const cleanupThreshold = currentTime - 1.0;
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
            beatMapIdRef.current = currentId;
        }
    }, [beatMap]);

    // Get the lanes for this chart style
    const lanes = useMemo(() => getLanesForStyle(chartStyle), [chartStyle]);

    // Distribute beats to lanes based on requiredKey
    const beatsByLane = useMemo(
        () => distributeBeatsToLanes(beatMap, chartStyle, currentTime, visibilityWindow, beatHitStateRef.current),
        [beatMap, chartStyle, currentTime, visibilityWindow]
    );

    // Determine if we're showing an empty state
    // Optimized: derive from beatsByLane instead of iterating through all beats
    const hasBeats = useMemo(() => {
        if (!beatMap || !beatMap.beats) return false;
        // Check if any lane has beats
        for (const [, laneBeats] of beatsByLane) {
            if (laneBeats.length > 0) return true;
        }
        return false;
    }, [beatMap, beatsByLane]);

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

            {/* Lanes container */}
            <div className="key-lane-view-lanes">
                {lanes.map((laneKey) => {
                    const laneBeats = beatsByLane.get(laneKey) || [];
                    // Only show feedback on the lane that was pressed
                    const showFeedback = lastPressedKey === laneKey;

                    return (
                        <KeyLane
                            key={laneKey}
                            laneKey={laneKey}
                            beats={laneBeats}
                            currentTime={currentTime}
                            visibilityWindow={visibilityWindow}
                            isActive={isActive}
                            isPaused={isPaused}
                            showHitZone={true}
                            chartStyle={chartStyle}
                            lastAccuracy={showFeedback ? lastAccuracy : null}
                        />
                    );
                })}
            </div>

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
