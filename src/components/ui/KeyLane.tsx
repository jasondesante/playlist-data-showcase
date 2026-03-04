/**
 * KeyLane Component
 *
 * A single lane component for rhythm game visualization (KeyLaneView).
 * Shows beat markers scrolling down toward a hit zone at the bottom.
 *
 * Features:
 * - Beat markers that scroll toward the hit zone
 * - Color-coded by key type (DDR: left=blue, down=green, up=red, right=purple)
 * - Guitar Hero colors: 1=green, 2=red, 3=yellow, 4=blue, 5=orange
 * - Hit zone indicator at the bottom
 * - Visual feedback on hit/miss (flash, particle effects)
 * - CSS animations for smooth scrolling
 *
 * Part of Phase 10: KeyLane Views (Core Rhythm Game Visualization) - Task 10.1
 *
 * @component
 */

import { useMemo, useEffect, useRef, useState } from 'react';
import { cn } from '@/utils/cn';
import type { SupportedKey, DdrKey, GuitarKey, ExtendedBeatAccuracy } from '@/types';
import { getKeySymbol, isDdrKey, isGuitarKey, DDR_KEYS, GUITAR_KEYS } from '@/types';
import './KeyLane.css';

/**
 * A beat that appears in a lane
 */
export interface LaneBeat {
    /** Unique identifier for this beat */
    id: string;
    /** Timestamp when this beat should be hit (in seconds) */
    timestamp: number;
    /** The required key for this beat */
    requiredKey: SupportedKey;
    /** Whether this beat has been hit */
    hit?: boolean;
    /** Whether this beat was missed */
    missed?: boolean;
    /** Accuracy of the hit (if hit) */
    accuracy?: ExtendedBeatAccuracy;
}

/**
 * Props for the KeyLane component
 */
export interface KeyLaneProps {
    /** Which key this lane represents */
    laneKey: SupportedKey;
    /** Beats assigned to this lane (already filtered by key) */
    beats: LaneBeat[];
    /** Current playback time in seconds */
    currentTime: number;
    /** Time window in seconds for visible beats (default: 2.0) */
    visibilityWindow?: number;
    /** Whether the lane is active (practice mode running) */
    isActive?: boolean;
    /** Whether playback is paused */
    isPaused?: boolean;
    /** Whether to show the hit zone */
    showHitZone?: boolean;
    /** Optional className for additional styling */
    className?: string;
    /** Callback when a beat is hit (for visual feedback) */
    onBeatHit?: (beatId: string, accuracy: ExtendedBeatAccuracy) => void;
    /** Last accuracy result for visual feedback */
    lastAccuracy?: ExtendedBeatAccuracy | null;
    /** Chart style for lane-specific styling */
    chartStyle?: 'ddr' | 'guitar-hero';
}

/**
 * Get the CSS color class for a key.
 * DDR colors: left=blue, down=green, up=red, right=purple
 * Guitar Hero colors: 1=green, 2=red, 3=yellow, 4=blue, 5=orange
 */
export function getKeyLaneColorClass(key: SupportedKey): string {
    if (isDdrKey(key)) {
        const ddrColors: Record<DdrKey, string> = {
            left: 'key-lane--blue',
            down: 'key-lane--green',
            up: 'key-lane--red',
            right: 'key-lane--purple',
        };
        return ddrColors[key] || '';
    } else if (isGuitarKey(key)) {
        const guitarColors: Record<GuitarKey, string> = {
            '1': 'key-lane--green',
            '2': 'key-lane--red',
            '3': 'key-lane--yellow',
            '4': 'key-lane--blue',
            '5': 'key-lane--orange',
        };
        return guitarColors[key] || '';
    }
    return '';
}

/**
 * Get the HSL color value for a key (for inline styles).
 */
export function getKeyLaneColor(key: SupportedKey): string {
    if (isDdrKey(key)) {
        const ddrColors: Record<DdrKey, string> = {
            left: 'hsl(210, 80%, 55%)',    // Blue
            down: 'hsl(140, 70%, 45%)',    // Green
            up: 'hsl(0, 75%, 55%)',        // Red
            right: 'hsl(280, 65%, 55%)',   // Purple
        };
        return ddrColors[key] || 'hsl(var(--primary))';
    } else if (isGuitarKey(key)) {
        const guitarColors: Record<GuitarKey, string> = {
            '1': 'hsl(140, 70%, 40%)',     // Green
            '2': 'hsl(0, 80%, 50%)',       // Red
            '3': 'hsl(45, 90%, 50%)',      // Yellow
            '4': 'hsl(210, 80%, 55%)',     // Blue
            '5': 'hsl(25, 90%, 50%)',      // Orange
        };
        return guitarColors[key] || 'hsl(var(--primary))';
    }
    return 'hsl(var(--primary))';
}

/**
 * Calculate beat position as a percentage from top (0% = top, 100% = hit zone).
 * For Guitar Hero: beats scroll top to bottom, hit zone at bottom
 * For DDR: beats scroll bottom to top, hit zone at top (position inverted)
 */
function calculateBeatPosition(
    beatTime: number,
    currentTime: number,
    visibilityWindow: number,
    invertDirection: boolean = false
): number {
    const timeUntilBeat = beatTime - currentTime;
    // Map from [+visibilityWindow, 0] to [0, 100]
    // +visibilityWindow seconds in future = 0% (far from hit zone)
    // 0 seconds (now) = 100% (at hit zone)
    const position = 100 - (timeUntilBeat / visibilityWindow) * 100;
    
    // For DDR, invert so hit zone is at top (0%) and notes come from bottom
    return invertDirection ? 100 - position : position;
}

/**
 * KeyLane Component
 *
 * Renders a single lane with beat markers scrolling toward the hit zone.
 * Used in KeyLaneView for DDR (4 lanes) or Guitar Hero (5 lanes) visualizations.
 *
 * @example
 * ```tsx
 * <KeyLane
 *   laneKey="left"
 *   beats={[{ id: '1', timestamp: 1.5, requiredKey: 'left' }]}
 *   currentTime={1.0}
 *   visibilityWindow={2.0}
 *   isActive={true}
 * />
 * ```
 */
export function KeyLane({
    laneKey,
    beats,
    currentTime,
    visibilityWindow = 2.0,
    isActive = true,
    isPaused = false,
    showHitZone = true,
    className,
    lastAccuracy,
    chartStyle = 'ddr',
}: KeyLaneProps) {
    const laneRef = useRef<HTMLDivElement>(null);
    const colorClass = getKeyLaneColorClass(laneKey);
    const keySymbol = getKeySymbol(laneKey);
    const laneColor = getKeyLaneColor(laneKey);

    // Use chartStyle to determine lane styling (DDR uses arrows, Guitar Hero uses numbers)
    const isDdrLane = chartStyle === 'ddr' ? isDdrKey(laneKey) : false;

    // State for hit feedback animation
    const [showHitFeedback, setShowHitFeedback] = useState(false);
    const [feedbackAccuracy, setFeedbackAccuracy] = useState<ExtendedBeatAccuracy | null>(null);
    const feedbackTimeoutRef = useRef<number | null>(null);

    // Track last accuracy to trigger feedback animation on change
    const prevAccuracyRef = useRef<ExtendedBeatAccuracy | null | undefined>(undefined);

    useEffect(() => {
        // Trigger feedback when accuracy changes
        if (lastAccuracy && lastAccuracy !== prevAccuracyRef.current) {
            setFeedbackAccuracy(lastAccuracy);
            setShowHitFeedback(true);

            // Clear any existing timeout
            if (feedbackTimeoutRef.current) {
                clearTimeout(feedbackTimeoutRef.current);
            }

            // Hide feedback after animation
            feedbackTimeoutRef.current = window.setTimeout(() => {
                setShowHitFeedback(false);
            }, 300);
        }
        prevAccuracyRef.current = lastAccuracy;
    }, [lastAccuracy]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (feedbackTimeoutRef.current) {
                clearTimeout(feedbackTimeoutRef.current);
            }
        };
    }, []);

    // Calculate visible beats and their positions
    const visibleBeats = useMemo(() => {
        const minTime = currentTime - 0.2; // Show beats slightly in the past for fade-out
        const maxTime = currentTime + visibilityWindow;
        
        // DDR uses inverted direction (bottom-to-top), Guitar Hero uses normal (top-to-bottom)
        const invertDirection = chartStyle === 'ddr';

        return beats
            .filter((beat) => beat.timestamp >= minTime && beat.timestamp <= maxTime)
            .map((beat) => {
                const position = calculateBeatPosition(beat.timestamp, currentTime, visibilityWindow, invertDirection);
                const isPast = beat.timestamp < currentTime - 0.05;
                const isUpcoming = beat.timestamp > currentTime + 0.05;
                const isAtHitZone = !isPast && !isUpcoming;

                return {
                    ...beat,
                    position,
                    isPast,
                    isUpcoming,
                    isAtHitZone,
                };
            })
            .filter((beat) => beat.position >= -10 && beat.position <= 110); // Allow some overflow for smooth transitions
    }, [beats, currentTime, visibilityWindow, chartStyle]);

    return (
        <div
            ref={laneRef}
            className={cn(
                'key-lane',
                colorClass,
                isActive && 'key-lane--active',
                isPaused && 'key-lane--paused',
                isDdrLane ? 'key-lane--ddr' : 'key-lane--guitar',
                className
            )}
            style={{ '--lane-color': laneColor } as React.CSSProperties}
            role="region"
            aria-label={`${keySymbol} lane`}
        >
            {/* Lane background */}
            <div className="key-lane-background">
                {/* Lane divider lines */}
                <div className="key-lane-divider key-lane-divider--left" />
                <div className="key-lane-divider key-lane-divider--right" />
            </div>

            {/* Beat markers */}
            <div className="key-lane-beats-container">
                {visibleBeats.map((beat) => (
                    <div
                        key={beat.id}
                        className={cn(
                            'key-lane-beat',
                            beat.isPast && 'key-lane-beat--past',
                            beat.isUpcoming && 'key-lane-beat--upcoming',
                            beat.isAtHitZone && 'key-lane-beat--hit-zone',
                            beat.hit && 'key-lane-beat--hit',
                            beat.missed && 'key-lane-beat--missed',
                            beat.accuracy === 'perfect' && 'key-lane-beat--perfect',
                            beat.accuracy === 'great' && 'key-lane-beat--great',
                            beat.accuracy === 'good' && 'key-lane-beat--good',
                            beat.accuracy === 'ok' && 'key-lane-beat--ok',
                            beat.accuracy === 'wrongKey' && 'key-lane-beat--wrong-key',
                            beat.accuracy === 'miss' && 'key-lane-beat--miss'
                        )}
                        style={{
                            top: `${Math.max(0, Math.min(100, beat.position))}%`,
                        }}
                    >
                        {/* Beat marker inner */}
                        <div className="key-lane-beat-inner">
                            {/* Key symbol for Guitar Hero style */}
                            {!isDdrLane && (
                                <span className="key-lane-beat-symbol">{keySymbol}</span>
                            )}
                            {/* Arrow shape for DDR style */}
                            {isDdrLane && (
                                <div className={cn('key-lane-beat-arrow', `key-lane-beat-arrow--${laneKey}`)} />
                            )}
                        </div>
                        {/* Hit effect ring */}
                        {beat.hit && (
                            <div className="key-lane-beat-hit-ring" />
                        )}
                    </div>
                ))}
            </div>

            {/* Hit zone at bottom */}
            {showHitZone && (
                <div className={cn('key-lane-hit-zone', showHitFeedback && 'key-lane-hit-zone--feedback')}>
                    {/* Hit zone glow */}
                    <div className="key-lane-hit-zone-glow" />

                    {/* Hit zone line */}
                    <div className="key-lane-hit-zone-line" />

                    {/* Key label */}
                    <div className="key-lane-hit-zone-label">
                        {isDdrLane ? (
                            <div className={cn('key-lane-arrow-indicator', `key-lane-arrow-indicator--${laneKey}`)} />
                        ) : (
                            <span className="key-lane-key-number">{keySymbol}</span>
                        )}
                    </div>

                    {/* Feedback flash */}
                    {showHitFeedback && feedbackAccuracy && (
                        <div
                            className={cn(
                                'key-lane-feedback-flash',
                                `key-lane-feedback-flash--${feedbackAccuracy}`
                            )}
                        />
                    )}
                </div>
            )}

            {/* Lane label at top */}
            <div className="key-lane-label">
                {isDdrLane ? keySymbol : `K${keySymbol}`}
            </div>
        </div>
    );
}

/**
 * Get the lanes configuration for a chart style.
 * DDR: 4 lanes (left, down, up, right)
 * Guitar Hero: 5 lanes (1, 2, 3, 4, 5)
 */
export function getLanesForStyle(style: 'ddr' | 'guitar-hero'): SupportedKey[] {
    return style === 'ddr' ? [...DDR_KEYS] : [...GUITAR_KEYS];
}

export default KeyLane;
