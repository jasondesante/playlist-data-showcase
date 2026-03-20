/**
 * VariantTimeline Component
 *
 * A horizontal timeline visualization showing beats for a single difficulty variant.
 * Features:
 * - Color-coded markers based on edit type (base vs inserted/interpolated)
 * - Edit type indicator badges (simplified/interpolated/pattern_inserted)
 * - Sync with audio playback (currentTime prop)
 * - Drag-to-scrub timeline
 * - Show playhead position synced with audio
 * - Hover tooltip with beat details
 *
 * Part of Phase 7: Difficulty Variants Visualization (Task 7.2)
 */

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Info } from 'lucide-react';
import './VariantTimeline.css';
import type {
    DifficultyLevel,
    EditType,
    Band,
    GridType,
    DifficultyVariant,
} from '../../types/rhythmGeneration';

// ============================================================
// Local Types
// ============================================================

/**
 * Extended grid type including simplified subdivisions for Easy difficulty
 * Includes all values from GridType plus 'straight_8th' and 'quarter_triplet'
 */
type ExtendedGridType = import('../../types/rhythmGeneration').GridType | | 'straight_8th' | 'quarter_triplet';

/**
 * A beat in a difficulty variant with extended grid type
 */
interface VariantBeat {
    timestamp: number;
    beatIndex: number;
    gridPosition: number;
    gridType: ExtendedGridType;
    intensity: number;
    band: Band;
    sourceBand: Band;
    quantizationError?: number;
}

export interface VariantTimelineProps {
    /** The difficulty variant to visualize */
    variant: DifficultyVariant;
    /** The difficulty level for this timeline */
    difficulty: DifficultyLevel;
    /** Current audio playback time in seconds */
    currentTime?: number;
    /** Total audio duration in seconds */
    duration?: number;
    /** Whether audio is currently playing */
    isPlaying?: boolean;
    /** Callback when user seeks to a time position */
    onSeek?: (time: number) => void;
    /** Callback when user clicks on a beat */
    onBeatClick?: (beat: VariantBeat, index: number) => void;
    /** Whether this is the natural difficulty */
    isNatural?: boolean;
    /** Anticipation window in seconds for future beats (default: 2.0) */
    anticipationWindow?: number;
    /** Past window in seconds for showing beats that have passed (default: 4.0) */
    pastWindow?: number;
    /** Additional CSS class names */
    className?: string;
}

/**
 * Difficulty color scheme
 */
const DIFFICULTY_COLORS: Record<DifficultyLevel, string> = {
    easy: '#22c55e',    // Green
    medium: '#f59e0b',  // Amber
    hard: '#ef4444',    // Red
};

/**
 * Band color scheme
 */
const BAND_COLORS: Record<Band, string> = {
    low: '#3b82f6',    // Blue
    mid: '#22c55e',    // Green
    high: '#f97316',   // Orange
};

/**
 * Edit type colors for markers
 */
const EDIT_TYPE_COLORS: Record<EditType, string> = {
    none: 'var(--variant-color)',           // Uses difficulty color
    simplified: '#f59e0b',                   // Amber (removed/simplified beats)
    interpolated: '#8b5cf6',                 // Purple (interpolated beats)
    pattern_inserted: '#ec4899',             // Pink (inserted pattern beats)
};

/**
 * Grid type display labels
 */
const GRID_TYPE_LABELS: Record<ExtendedGridType, string> = {
    straight_16th: '16th',
    triplet_8th: 'Triplet',
    straight_8th: '8th',
    quarter_triplet: 'Q-Triplet',
};

/**
 * Format time in seconds to MM:SS.ms display format
 */
function formatTime(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) {
        return '--:--';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

/**
 * Format milliseconds for display
 */
function formatMs(ms: number): string {
    return `${ms.toFixed(1)}ms`;
}

// ============================================================
// Main Component
// ============================================================

/**
 * VariantTimeline Component
 *
 * Renders a horizontal timeline where variant beats are displayed as colored markers.
 * The timeline syncs with audio playback and shows a playhead indicator.
 */
export function VariantTimeline({
    variant,
    difficulty,
    currentTime = 0,
    duration = 0,
    isPlaying = false,
    onSeek,
    onBeatClick,
    isNatural = false,
    anticipationWindow = 2.0,
    pastWindow = 4.0,
    className,
}: VariantTimelineProps) {
    const trackRef = useRef<HTMLDivElement>(null);
    const difficultyColor = DIFFICULTY_COLORS[difficulty];

    // Cast beats to our local VariantBeat type
    const beats = variant.beats as VariantBeat[];

    // ========================================
    // Hover State for Tooltip
    // ========================================

    const [hoveredBeat, setHoveredBeat] = useState<VariantBeat | null>(null);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

    // ========================================
    // Smooth Animation with requestAnimationFrame
    // ========================================

    const animationFrameRef = useRef<number | null>(null);
    const [smoothTime, setSmoothTime] = useState(currentTime);
    const lastAudioTimeRef = useRef<{ time: number; timestamp: number }>({
        time: currentTime,
        timestamp: performance.now(),
    });
    const isPlayingRef = useRef(isPlaying);

    // Keep refs in sync with props
    useEffect(() => {
        lastAudioTimeRef.current = {
            time: currentTime,
            timestamp: performance.now(),
        };
    }, [currentTime]);

    useEffect(() => {
        isPlayingRef.current = isPlaying;
    }, [isPlaying]);

    // Track previous isPlaying state to detect transitions
    const prevIsPlayingRef = useRef(isPlaying);

    // Reset animation reference when playback transitions from paused to playing
    useEffect(() => {
        const wasPlaying = prevIsPlayingRef.current;
        prevIsPlayingRef.current = isPlaying;

        if (isPlaying && !wasPlaying) {
            lastAudioTimeRef.current = {
                time: currentTime,
                timestamp: performance.now(),
            };
        }
    }, [isPlaying, currentTime]);

    /**
     * Animation loop for smooth scrolling.
     * Uses requestAnimationFrame for 60fps updates.
     */
    useEffect(() => {
        if (!isPlaying) {
            setSmoothTime(currentTime);
            return;
        }

        const animate = () => {
            const now = performance.now();
            const { time: lastAudioTime, timestamp: lastUpdateTimestamp } = lastAudioTimeRef.current;
            const elapsedMs = now - lastUpdateTimestamp;
            const elapsedSeconds = elapsedMs / 1000;
            const interpolatedTime = lastAudioTime + elapsedSeconds;
            const clampedTime = duration > 0 ? Math.min(interpolatedTime, duration) : interpolatedTime;
            setSmoothTime(clampedTime);

            if (isPlayingRef.current && (duration <= 0 || clampedTime < duration)) {
                animationFrameRef.current = requestAnimationFrame(animate);
            }
        };

        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        };
    }, [isPlaying, duration]);

    /**
     * Handle seek events
     */
    useEffect(() => {
        if (!isPlaying) {
            setSmoothTime(currentTime);
        }
    }, [currentTime, isPlaying]);

    // ========================================
    // Drag-to-scrub functionality
    // ========================================

    const [isDragging, setIsDragging] = useState(false);
    const dragStartXRef = useRef<number>(0);
    const dragStartTimeRef = useRef<number>(0);

    const handleMouseDown = useCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
            if (!onSeek || !trackRef.current || duration === 0) return;

            event.preventDefault();
            setIsDragging(true);
            dragStartXRef.current = event.clientX;
            dragStartTimeRef.current = smoothTime;
        },
        [onSeek, smoothTime, duration]
    );

    const handleMouseMove = useCallback(
        (event: MouseEvent) => {
            if (!isDragging || !onSeek || !trackRef.current || duration === 0) return;

            const rect = trackRef.current.getBoundingClientRect();
            const trackWidth = rect.width;
            const deltaX = event.clientX - dragStartXRef.current;
            const timePerPixel = (anticipationWindow * 2) / trackWidth;
            const deltaTime = -deltaX * timePerPixel;
            const newTime = Math.max(0, Math.min(duration, dragStartTimeRef.current + deltaTime));

            onSeek(newTime);
        },
        [isDragging, onSeek, anticipationWindow, duration]
    );

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

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

    // ========================================
    // Beat Positioning
    // ========================================

    /**
     * Calculate beat position on the timeline.
     */
    const calculatePosition = useCallback(
        (timestamp: number): number => {
            const timeUntilBeat = timestamp - smoothTime;
            const position = 0.5 + (timeUntilBeat / anticipationWindow) * 0.5;
            return position;
        },
        [smoothTime, anticipationWindow]
    );

    /**
     * Get visible beats within the window
     */
    const getVisibleBeats = useCallback((): Array<{
        beat: VariantBeat;
        index: number;
        position: number;
        isPast: boolean;
    }> => {
        const minTime = smoothTime - pastWindow;
        const maxTime = smoothTime + anticipationWindow;

        return beats
            .map((beat, index) => {
                const position = calculatePosition(beat.timestamp);
                const isPast = beat.timestamp < smoothTime - 0.05;
                return { beat, index, position, isPast };
            })
            .filter((item) => {
                const timeMatch = item.beat.timestamp >= minTime && item.beat.timestamp <= maxTime;
                const positionMatch = item.position >= 0 && item.position <= 1;
                return timeMatch && positionMatch;
            });
    }, [beats, smoothTime, pastWindow, anticipationWindow, calculatePosition]);

    const visibleBeats = getVisibleBeats();

    // ========================================
    // Statistics for info bar
    // ========================================

    const stats = useMemo(() => {
        const avgIntensity = beats.length > 0
            ? beats.reduce((sum, b) => sum + b.intensity, 0) / beats.length
            : 0;

        // Calculate grid type distribution
        const gridDistribution: Record<string, number> = {};
        beats.forEach(beat => {
            gridDistribution[beat.gridType] = (gridDistribution[beat.gridType] || 0) + 1;
        });

        // Get primary grid type
        const primaryGridType = Object.entries(gridDistribution)
            .sort((a, b) => b[1] - a[1])[0];

        return {
            total: beats.length,
            avgIntensity,
            primaryGridType: primaryGridType ? primaryGridType[0] as ExtendedGridType : null,
            editType: variant.editType,
            editAmount: variant.editAmount,
        };
    }, [beats, variant.editType, variant.editAmount]);

    // ========================================
    // Determine beat color based on edit type
    // ========================================

    /**
     * Get the color for a beat marker based on its properties
     */
    const getBeatColor = useCallback((beat: VariantBeat): string => {
        // If this variant has been edited, check for specific indicators
        if (variant.editType === 'pattern_inserted' && variant.enhancementMetadata) {
            // Check if this beat might be an inserted pattern beat
            // Inserted patterns would have specific pattern IDs
            if (variant.patternsInserted && variant.patternsInserted.length > 0) {
                // Use a distinct color for pattern-inserted beats
                return EDIT_TYPE_COLORS.pattern_inserted;
            }
        }

        if (variant.editType === 'interpolated') {
            return EDIT_TYPE_COLORS.interpolated;
        }

        // Default: use the source band color
        return BAND_COLORS[beat.sourceBand];
    }, [variant.editType, variant.enhancementMetadata, variant.patternsInserted]);

    /**
     * Get edit type indicator for a beat
     */
    const getEditIndicator = useCallback((_beat: VariantBeat): EditType | null => {
        if (variant.editType === 'none') return null;

        // For simplified variants, all remaining beats are "base" but the variant itself is simplified
        if (variant.editType === 'simplified') {
            return 'simplified';
        }

        // For interpolated variants
        if (variant.editType === 'interpolated') {
            return 'interpolated';
        }

        // For pattern_inserted variants
        if (variant.editType === 'pattern_inserted') {
            return 'pattern_inserted';
        }

        return null;
    }, [variant.editType]);

    // ========================================
    // Event Handlers
    // ========================================

    /**
     * Handle click on beat
     */
    const handleBeatClick = useCallback(
        (beat: VariantBeat, index: number, event: React.MouseEvent) => {
            event.stopPropagation();
            if (onBeatClick) {
                onBeatClick(beat, index);
            }
        },
        [onBeatClick]
    );

    /**
     * Handle hover on beat marker
     */
    const handleMouseEnter = useCallback(
        (beat: VariantBeat, index: number, event: React.MouseEvent) => {
            setHoveredBeat(beat);
            setHoveredIndex(index);
            const rect = (event.target as HTMLElement).getBoundingClientRect();
            setTooltipPosition({
                x: rect.left + rect.width / 2,
                y: rect.top,
            });
        },
        []
    );

    const handleMouseLeave = useCallback(() => {
        setHoveredBeat(null);
        setHoveredIndex(null);
    }, []);

    /**
     * Handle keyboard interaction on beat
     */
    const handleBeatKeyDown = useCallback(
        (beat: VariantBeat, index: number, event: React.KeyboardEvent) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                if (onBeatClick) {
                    onBeatClick(beat, index);
                }
            }
        },
        [onBeatClick]
    );

    return (
        <div
            className={`variant-timeline ${className || ''}`}
            style={{ '--variant-color': difficultyColor } as React.CSSProperties}
        >
            {/* Timeline track */}
            <div
                ref={trackRef}
                className={`variant-timeline-track ${onSeek ? 'variant-timeline-track--draggable' : ''} ${isDragging ? 'variant-timeline-track--dragging' : ''}`}
                onMouseDown={handleMouseDown}
                role={onSeek ? 'slider' : undefined}
                aria-label={`${difficulty} difficulty timeline`}
                aria-valuemin={0}
                aria-valuemax={duration}
                aria-valuenow={smoothTime}
                tabIndex={onSeek ? 0 : undefined}
            >
                {/* Background gradient */}
                <div className="variant-timeline-background" />

                {/* Past region indicator */}
                <div className="variant-timeline-past-region" />

                {/* Future region indicator */}
                <div className="variant-timeline-future-region" />

                {/* Variant beat markers */}
                {visibleBeats.map(({ beat, index, position, isPast }) => {
                    const editIndicator = getEditIndicator(beat);
                    const beatColor = getBeatColor(beat);

                    return (
                        <div
                            key={`variant-beat-${beat.timestamp.toFixed(3)}-${beat.beatIndex}-${beat.gridPosition}`}
                            className={`variant-timeline-marker ${
                                isPast ? 'variant-timeline-marker--past' : ''
                            } ${
                                hoveredIndex === index ? 'variant-timeline-marker--hovered' : ''
                            } ${isNatural ? 'variant-timeline-marker--natural' : ''}`}
                            style={{
                                left: `${position * 100}%`,
                            }}
                            onClick={(e) => handleBeatClick(beat, index, e)}
                            onMouseEnter={(e) => handleMouseEnter(beat, index, e)}
                            onMouseLeave={handleMouseLeave}
                            onKeyDown={(e) => handleBeatKeyDown(beat, index, e)}
                            role="button"
                            tabIndex={0}
                            aria-label={`Beat at ${formatTime(beat.timestamp)}, ${beat.sourceBand} band, intensity ${Math.round(beat.intensity * 100)}%`}
                        >
                            {/* Beat dot */}
                            <div
                                className="variant-timeline-marker-dot"
                                style={{
                                    width: `${10 + beat.intensity * 14}px`,
                                    height: `${10 + beat.intensity * 14}px`,
                                    backgroundColor: beatColor,
                                }}
                            >
                                {/* Show edit type indicator if edited */}
                                {editIndicator && editIndicator !== 'none' && (
                                    <div className={`variant-timeline-edit-indicator variant-timeline-edit-indicator--${editIndicator}`}>
                                        {editIndicator === 'simplified' && 'S'}
                                        {editIndicator === 'interpolated' && 'I'}
                                        {editIndicator === 'pattern_inserted' && '+'}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* "Now" line - fixed in center */}
                <div className="variant-timeline-now-line">
                    <div className="variant-timeline-now-line-inner" />
                    <span className="variant-timeline-now-label">NOW</span>
                </div>
            </div>

            {/* Tooltip for hovered beat */}
            {hoveredBeat && (
                <div
                    className="variant-timeline-tooltip"
                    style={{
                        left: tooltipPosition.x,
                        top: tooltipPosition.y,
                    }}
                >
                    <div className="variant-tooltip-header">
                        <span className="variant-tooltip-time">
                            {formatTime(hoveredBeat.timestamp)}
                        </span>
                        <span
                            className="variant-tooltip-band"
                            style={{ backgroundColor: BAND_COLORS[hoveredBeat.sourceBand] }}
                        >
                            {hoveredBeat.sourceBand.charAt(0).toUpperCase() + hoveredBeat.sourceBand.slice(1)}
                        </span>
                    </div>
                    <div className="variant-tooltip-stats">
                        <div className="variant-tooltip-stat">
                            <span className="variant-tooltip-stat-label">Beat Index</span>
                            <span className="variant-tooltip-stat-value">
                                {hoveredBeat.beatIndex + 1}
                            </span>
                        </div>
                        <div className="variant-tooltip-stat">
                            <span className="variant-tooltip-stat-label">Grid Position</span>
                            <span className="variant-tooltip-stat-value">
                                {hoveredBeat.gridPosition} ({GRID_TYPE_LABELS[hoveredBeat.gridType]})
                            </span>
                        </div>
                        <div className="variant-tooltip-stat">
                            <span className="variant-tooltip-stat-label">Intensity</span>
                            <span className="variant-tooltip-stat-value">
                                {(hoveredBeat.intensity * 100).toFixed(0)}%
                            </span>
                        </div>
                        <div className="variant-tooltip-stat">
                            <span className="variant-tooltip-stat-label">Source Band</span>
                            <span className="variant-tooltip-stat-value">
                                {hoveredBeat.sourceBand.charAt(0).toUpperCase() + hoveredBeat.sourceBand.slice(1)}
                            </span>
                        </div>
                        {hoveredBeat.quantizationError !== undefined && (
                            <div className="variant-tooltip-stat">
                                <span className="variant-tooltip-stat-label">Quant Error</span>
                                <span className={`variant-tooltip-stat-value ${
                                    hoveredBeat.quantizationError > 50 ? 'variant-tooltip-stat-value--warning' : ''
                                }`}>
                                    {formatMs(hoveredBeat.quantizationError)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Timeline info bar */}
            <div className="variant-timeline-info">
                <div className="variant-timeline-info-item">
                    <span className="variant-timeline-info-label">Visible</span>
                    <span className="variant-timeline-info-value">{visibleBeats.length}</span>
                </div>
                <div className="variant-timeline-info-item">
                    <span className="variant-timeline-info-label">Total</span>
                    <span className="variant-timeline-info-value">{stats.total}</span>
                </div>
                <div className="variant-timeline-info-item">
                    <span className="variant-timeline-info-label">Time</span>
                    <span className="variant-timeline-info-value">{formatTime(smoothTime)}</span>
                </div>
                <div className="variant-timeline-info-item">
                    <span className="variant-timeline-info-label">Avg Intensity</span>
                    <span className="variant-timeline-info-value">
                        {(stats.avgIntensity * 100).toFixed(0)}%
                    </span>
                </div>
                {stats.editType !== 'none' && (
                    <div className="variant-timeline-info-item">
                        <span className="variant-timeline-info-label">Edit</span>
                        <span className={`variant-timeline-info-value variant-timeline-info-value--${stats.editType}`}>
                            {(stats.editAmount * 100).toFixed(0)}%
                        </span>
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="variant-timeline-legend">
                <div className="variant-timeline-legend-item">
                    <div
                        className="variant-timeline-legend-marker"
                        style={{ backgroundColor: difficultyColor }}
                    />
                    <span className="variant-timeline-legend-label">
                        {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                    </span>
                </div>
                {(['low', 'mid', 'high'] as Band[]).map((band) => (
                    <div key={band} className="variant-timeline-legend-item">
                        <div
                            className="variant-timeline-legend-marker"
                            style={{ backgroundColor: BAND_COLORS[band] }}
                        />
                        <span className="variant-timeline-legend-label">
                            {band.charAt(0).toUpperCase() + band.slice(1)}
                        </span>
                    </div>
                ))}
                {stats.editType !== 'none' && (
                    <div className="variant-timeline-legend-item">
                        <div
                            className="variant-timeline-legend-marker variant-timeline-legend-marker--edited"
                            style={{ backgroundColor: EDIT_TYPE_COLORS[stats.editType] }}
                        />
                        <span className="variant-timeline-legend-label">
                            {stats.editType === 'simplified' && 'Simplified'}
                            {stats.editType === 'interpolated' && 'Interpolated'}
                            {stats.editType === 'pattern_inserted' && 'Pattern Added'}
                        </span>
                    </div>
                )}
                <div className="variant-timeline-legend-item">
                    <div className="variant-timeline-legend-size">
                        <div className="variant-timeline-legend-size-small" />
                        <div className="variant-timeline-legend-size-large" />
                    </div>
                    <span className="variant-timeline-legend-label">Intensity</span>
                </div>
                <div className="variant-timeline-legend-item">
                    <Info size={14} />
                    <span className="variant-timeline-legend-label">Hover for details</span>
                </div>
            </div>
        </div>
    );
}

export default VariantTimeline;
