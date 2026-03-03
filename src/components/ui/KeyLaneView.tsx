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

import { useMemo } from 'react';
import { cn } from '@/utils/cn';
import { KeyLane, getLanesForStyle, type LaneBeat } from './KeyLane';
import type {
    ChartStyle,
    SupportedKey,
    ExtendedBeatAccuracy,
    SubdividedBeatMap,
    Beat,
} from '@/types';
import './KeyLaneView.css';

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
}

/**
 * Convert a Beat from the beat map to a LaneBeat for the lane.
 */
function beatToLaneBeat(beat: Beat, requiredKey: SupportedKey): LaneBeat {
    return {
        id: `beat-${beat.timestamp.toFixed(3)}-${requiredKey}`,
        timestamp: beat.timestamp,
        requiredKey,
        hit: false,
        missed: false,
    };
}

/**
 * Distribute beats from the beat map to their respective lanes.
 * - Beats with requiredKey go to their specific lane
 * - Beats without requiredKey go to ALL lanes (hittable with any key)
 */
function distributeBeatsToLanes(
    beatMap: SubdividedBeatMap | null,
    chartStyle: ChartStyle,
    currentTime: number,
    visibilityWindow: number
): Map<SupportedKey, LaneBeat[]> {
    const laneMap = new Map<SupportedKey, LaneBeat[]>();
    const lanes = getLanesForStyle(chartStyle);

    // Initialize empty arrays for each lane
    for (const laneKey of lanes) {
        laneMap.set(laneKey, []);
    }

    if (!beatMap || !beatMap.beats) {
        return laneMap;
    }

    // Calculate visibility bounds
    const minTime = currentTime - 0.2; // Show slightly past for fade-out
    const maxTime = currentTime + visibilityWindow;

    // Filter beats within visibility window and distribute to lanes
    const visibleBeats = beatMap.beats.filter(
        (beat) => beat.timestamp >= minTime && beat.timestamp <= maxTime
    );

    for (const beat of visibleBeats) {
        if (beat.requiredKey) {
            // Beat has a required key - add to specific lane
            const laneBeats = laneMap.get(beat.requiredKey as SupportedKey);
            if (laneBeats) {
                laneBeats.push({
                    id: `beat-${beat.timestamp.toFixed(3)}`,
                    timestamp: beat.timestamp,
                    requiredKey: beat.requiredKey as SupportedKey,
                    hit: false,
                    missed: false,
                });
            }
        } else {
            // Beat has no required key - add to ALL lanes (hittable with any key)
            for (const laneKey of lanes) {
                const laneBeats = laneMap.get(laneKey);
                if (laneBeats) {
                    laneBeats.push(beatToLaneBeat(beat, laneKey));
                }
            }
        }
    }

    return laneMap;
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
}: KeyLaneViewProps) {
    // Get the lanes for this chart style
    const lanes = useMemo(() => getLanesForStyle(chartStyle), [chartStyle]);

    // Distribute beats to lanes based on requiredKey
    const beatsByLane = useMemo(
        () => distributeBeatsToLanes(beatMap, chartStyle, currentTime, visibilityWindow),
        [beatMap, chartStyle, currentTime, visibilityWindow]
    );

    // Determine if we're showing an empty state
    const hasBeats = useMemo(() => {
        if (!beatMap || !beatMap.beats) return false;
        return beatMap.beats.some(
            (beat) =>
                beat.timestamp >= currentTime - 0.2 &&
                beat.timestamp <= currentTime + visibilityWindow
        );
    }, [beatMap, currentTime, visibilityWindow]);

    // Check if there are any beats with required keys (chart has notes)
    const hasChartNotes = useMemo(() => {
        if (!beatMap || !beatMap.beats) return false;
        return beatMap.beats.some((beat) => beat.requiredKey);
    }, [beatMap]);

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
