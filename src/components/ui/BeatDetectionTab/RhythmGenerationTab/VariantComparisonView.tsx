/**
 * VariantComparisonView Component
 *
 * A stacked view of all three difficulty variants (Easy/Medium/Hard) showing:
 * - Three stacked timelines (3 rows)
 * - Visual density comparison at a glance
 * - Beat count labels for each difficulty
 * - Vertical alignment so beats line up by time across all three
 * - Shared zoom/scroll across all three timelines
 *
 * Part of Phase 7: Difficulty Variants Visualization (Task 7.3)
 */

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Trophy, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import './VariantComparisonView.css';
import { useAudioPlayerStore } from '../../../../store/audioPlayerStore';
import type {
    GeneratedRhythm,
    DifficultyLevel,
    DifficultyVariant,
    Band,
    EditType,
} from '../../../../types/rhythmGeneration';

// ============================================================
// Types
// ============================================================

/**
 * Extended grid type including simplified subdivisions for Easy difficulty
 */
type ExtendedGridType = import('../../../../types/rhythmGeneration').GridType | 'straight_8th' | 'quarter_triplet';

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

export interface VariantComparisonViewProps {
    /** The generated rhythm containing difficulty variants */
    rhythm: GeneratedRhythm;
    /** Current audio playback time in seconds (for timeline sync) */
    currentTime?: number;
    /** Total audio duration in seconds */
    duration?: number;
    /** Whether audio is currently playing */
    isPlaying?: boolean;
    /** Callback when user seeks to a time position */
    onSeek?: (time: number) => void;
    /** Additional CSS class names */
    className?: string;
}

// ============================================================
// Constants
// ============================================================

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
    none: 'var(--variant-color)',
    simplified: '#f59e0b',
    interpolated: '#8b5cf6',
    pattern_inserted: '#ec4899',
};

/**
 * Difficulty display order
 */
const DIFFICULTY_ORDER: DifficultyLevel[] = ['easy', 'medium', 'hard'];

// ============================================================
// Sub-components
// ============================================================

/**
 * Single timeline row for a difficulty variant
 */
interface VariantRowProps {
    difficulty: DifficultyLevel;
    variant: DifficultyVariant;
    duration: number;
    color: string;
    isNatural: boolean;
    currentTime: number;
    zoom: number;
    scrollOffset: number;
    onScroll: (offset: number) => void;
    onSeek?: (time: number) => void;
    containerWidth: number;
}

function VariantRow({
    difficulty,
    variant,
    duration,
    color,
    isNatural,
    currentTime,
    zoom,
    scrollOffset,
    onScroll,
    onSeek,
    containerWidth,
}: VariantRowProps) {
    const trackRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartXRef = useRef(0);
    const dragStartOffsetRef = useRef(0);

    const beats = variant.beats as VariantBeat[];

    // Calculate visible time range based on zoom and scroll
    const visibleDuration = duration / zoom;
    const startTime = scrollOffset;
    const endTime = Math.min(duration, startTime + visibleDuration);

    // Get visible beats
    const visibleBeats = useMemo(() => {
        return beats.filter(beat =>
            beat.timestamp >= startTime - 0.1 &&
            beat.timestamp <= endTime + 0.1
        );
    }, [beats, startTime, endTime]);

    // Calculate beat position as percentage
    const getBeatPosition = useCallback((timestamp: number): number => {
        if (visibleDuration <= 0) return 0;
        return ((timestamp - startTime) / visibleDuration) * 100;
    }, [startTime, visibleDuration]);

    // Calculate playhead position as percentage
    const playheadPercent = useMemo(() => {
        if (currentTime < startTime || currentTime > endTime) return -1;
        return ((currentTime - startTime) / visibleDuration) * 100;
    }, [currentTime, startTime, endTime, visibleDuration]);

    // Handle drag-to-scroll
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!trackRef.current || duration <= 0) return;
        e.preventDefault();
        setIsDragging(true);
        dragStartXRef.current = e.clientX;
        dragStartOffsetRef.current = scrollOffset;
    }, [scrollOffset, duration]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !trackRef.current || duration <= 0) return;

        const deltaX = e.clientX - dragStartXRef.current;
        const timePerPixel = visibleDuration / containerWidth;
        const deltaTime = -deltaX * timePerPixel;
        const newOffset = Math.max(0, Math.min(duration - visibleDuration, dragStartOffsetRef.current + deltaTime));
        onScroll(newOffset);
    }, [isDragging, visibleDuration, containerWidth, duration, onScroll]);

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

    // Handle click-to-seek
    const handleClick = useCallback((e: React.MouseEvent) => {
        if (!onSeek || !trackRef.current || duration <= 0) return;

        const rect = trackRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickPercent = clickX / rect.width;
        const clickTime = startTime + clickPercent * visibleDuration;
        onSeek(Math.max(0, Math.min(duration, clickTime)));
    }, [onSeek, startTime, visibleDuration, duration]);

    // Get beat color
    const getBeatColor = useCallback((beat: VariantBeat): string => {
        if (variant.editType === 'pattern_inserted') {
            return EDIT_TYPE_COLORS.pattern_inserted;
        }
        if (variant.editType === 'interpolated') {
            return EDIT_TYPE_COLORS.interpolated;
        }
        return BAND_COLORS[beat.sourceBand];
    }, [variant.editType]);

    return (
        <div
            className={`variant-comparison-row ${isNatural ? 'variant-comparison-row--natural' : ''}`}
            style={{ '--variant-color': color } as React.CSSProperties}
        >
            {/* Row label */}
            <div className="variant-comparison-row-label">
                <span className="variant-comparison-row-name">
                    {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                </span>
                <span className="variant-comparison-row-count">
                    {beats.length} beats
                </span>
                {isNatural && (
                    <span className="variant-comparison-row-natural">
                        Natural
                    </span>
                )}
            </div>

            {/* Timeline track */}
            <div
                ref={trackRef}
                className={`variant-comparison-track ${isDragging ? 'variant-comparison-track--dragging' : ''}`}
                onMouseDown={handleMouseDown}
                onClick={handleClick}
            >
                {/* Background */}
                <div className="variant-comparison-track-bg" />

                {/* Beat markers */}
                {visibleBeats.map((beat, index) => {
                    const position = getBeatPosition(beat.timestamp);
                    const size = 6 + beat.intensity * 8;

                    return (
                        <div
                            key={`beat-${beat.timestamp.toFixed(3)}-${index}`}
                            className="variant-comparison-beat"
                            style={{
                                left: `${position}%`,
                                width: `${size}px`,
                                height: `${size}px`,
                                backgroundColor: getBeatColor(beat),
                                opacity: 0.6 + beat.intensity * 0.4,
                            }}
                            title={`${beat.timestamp.toFixed(3)}s - ${beat.sourceBand} band`}
                        />
                    );
                })}

                {/* Playhead */}
                {playheadPercent >= 0 && playheadPercent <= 100 && (
                    <div
                        className="variant-comparison-playhead"
                        style={{ left: `${playheadPercent}%` }}
                    />
                )}
            </div>

            {/* Density bar */}
            <div className="variant-comparison-density">
                <div
                    className="variant-comparison-density-fill"
                    style={{
                        width: `${Math.min(100, (beats.length / (duration * 5)) * 100)}%`,
                        backgroundColor: color,
                    }}
                />
            </div>
        </div>
    );
}

// ============================================================
// Main Component
// ============================================================

/**
 * VariantComparisonView
 *
 * Displays all three difficulty variants as stacked timelines with synchronized
 * zoom and scroll. Provides a visual density comparison at a glance.
 */
export function VariantComparisonView({
    rhythm,
    currentTime = 0,
    duration: propDuration,
    isPlaying: _isPlaying = false,
    onSeek,
    className,
}: VariantComparisonViewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(800);
    const [zoom, setZoom] = useState(1);
    const [scrollOffset, setScrollOffset] = useState(0);

    // Quick scroll state
    const quickScrollRef = useRef<HTMLDivElement>(null);
    const [isQuickScrollDragging, setIsQuickScrollDragging] = useState(false);

    // Direct store access for responsive seeking
    const seek = useAudioPlayerStore((state) => state.seek);

    // Subscribe to current time for quick scrollbar
    const storeCurrentTime = useAudioPlayerStore((state) => state.currentTime);

    const variants = rhythm.difficultyVariants;
    const naturalDifficulty = rhythm.metadata.naturalDifficulty;

    // Calculate duration from beat timestamps
    const duration = useMemo(() => {
        if (propDuration && propDuration > 0) return propDuration;

        const allBeats = [
            ...variants.easy.beats,
            ...variants.medium.beats,
            ...variants.hard.beats,
        ];
        if (allBeats.length === 0) return 0;
        const maxTime = Math.max(...allBeats.map(b => b.timestamp));
        return maxTime + 1;
    }, [propDuration, variants]);

    // Track container width for scroll calculations
    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.offsetWidth);
            }
        };

        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    // Auto-scroll to follow playback
    useEffect(() => {
        if (duration <= 0) return;

        const visibleDuration = duration / zoom;
        const margin = visibleDuration * 0.1; // 10% margin

        // If playhead is outside visible range, scroll to it
        if (currentTime < scrollOffset + margin || currentTime > scrollOffset + visibleDuration - margin) {
            // Center on current time
            const newOffset = Math.max(0, Math.min(duration - visibleDuration, currentTime - visibleDuration / 2));
            setScrollOffset(newOffset);
        }
    }, [currentTime, zoom, duration, scrollOffset]);

    // Zoom controls
    const handleZoomIn = useCallback(() => {
        setZoom(prev => Math.min(10, prev * 1.5));
    }, []);

    const handleZoomOut = useCallback(() => {
        setZoom(prev => Math.max(0.5, prev / 1.5));
    }, []);

    const handleResetZoom = useCallback(() => {
        setZoom(1);
        setScrollOffset(0);
    }, []);

    // Shared scroll handler
    const handleScroll = useCallback((offset: number) => {
        setScrollOffset(offset);
    }, []);

    // ========================================
    // Quick scroll handlers - click to jump, drag to scrub
    // ========================================

    const handleQuickScrollClick = useCallback((event: React.MouseEvent) => {
        if (!quickScrollRef.current || duration <= 0) return;

        const rect = quickScrollRef.current.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const trackWidth = rect.width;
        const positionRatio = Math.max(0, Math.min(1, clickX / trackWidth));
        const newTime = positionRatio * duration;

        seek(newTime);
    }, [duration, seek]);

    const handleQuickScrollDragStart = useCallback((event: React.MouseEvent) => {
        if (!quickScrollRef.current || duration <= 0) return;

        event.preventDefault();
        setIsQuickScrollDragging(true);

        // Immediately seek on mousedown
        const rect = quickScrollRef.current.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const trackWidth = rect.width;
        const positionRatio = Math.max(0, Math.min(1, clickX / trackWidth));
        const newTime = positionRatio * duration;

        seek(newTime);
    }, [duration, seek]);

    // Quick scroll drag handling with RAF throttling (same pattern as TransientTimeline)
    useEffect(() => {
        if (!isQuickScrollDragging || duration <= 0) return;

        let pendingSeek: number | null = null;
        let rafId: number | null = null;

        const handleQuickScrollMove = (event: MouseEvent) => {
            if (!quickScrollRef.current) return;

            const rect = quickScrollRef.current.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            const trackWidth = rect.width;
            const positionRatio = Math.max(0, Math.min(1, clickX / trackWidth));
            const newTime = positionRatio * duration;

            // Throttle to animation frames
            pendingSeek = newTime;

            if (!rafId) {
                rafId = requestAnimationFrame(() => {
                    if (pendingSeek !== null) {
                        seek(pendingSeek);
                        pendingSeek = null;
                    }
                    rafId = null;
                });
            }
        };

        const handleQuickScrollEnd = () => {
            setIsQuickScrollDragging(false);
            // Cancel any pending RAF
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
        };

        window.addEventListener('mousemove', handleQuickScrollMove);
        window.addEventListener('mouseup', handleQuickScrollEnd);

        return () => {
            window.removeEventListener('mousemove', handleQuickScrollMove);
            window.removeEventListener('mouseup', handleQuickScrollEnd);
            if (rafId) {
                cancelAnimationFrame(rafId);
            }
        };
    }, [isQuickScrollDragging, duration, seek]);

    // Get all beats for quick scroll markers (sampled for performance)
    const quickScrollBeats = useMemo(() => {
        const allBeats: Array<{ timestamp: number; band: Band }> = [];
        DIFFICULTY_ORDER.forEach((diff) => {
            variants[diff].beats.forEach((beat) => {
                allBeats.push({
                    timestamp: beat.timestamp,
                    band: beat.sourceBand,
                });
            });
        });

        // Sort by timestamp
        allBeats.sort((a, b) => a.timestamp - b.timestamp);

        // Sample every Nth beat for performance (max ~100 markers)
        const sampleRate = Math.max(1, Math.floor(allBeats.length / 100));
        return allBeats.filter((_, idx) => idx % sampleRate === 0);
    }, [variants]);

    // Calculate visible duration for viewport indicator
    const visibleDuration = duration / zoom;

    // Calculate comparison stats
    const comparisonStats = useMemo(() => {
        const counts = {
            easy: variants.easy.beats.length,
            medium: variants.medium.beats.length,
            hard: variants.hard.beats.length,
        };

        const maxCount = Math.max(counts.easy, counts.medium, counts.hard);

        return {
            counts,
            maxCount,
            total: counts.easy + counts.medium + counts.hard,
        };
    }, [variants]);

    // Format time for display
    const formatTime = useCallback((seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }, []);

    // Guard against invalid duration - this can happen if audioPlayerStore hasn't loaded yet
    // or if the duration prop is NaN/undefined
    if (!duration || !isFinite(duration) || duration <= 0) {
        return (
            <div className={`variant-comparison-view ${className || ''}`}>
                <div className="variant-comparison-loading">
                    Loading timeline...
                </div>
            </div>
        );
    }

    return (
        <div className={`variant-comparison-view ${className || ''}`}>
            {/* Header */}
            <div className="variant-comparison-header">
                <div className="variant-comparison-title">
                    <Trophy size={18} />
                    <span>Difficulty Comparison</span>
                </div>

                {/* Zoom controls */}
                <div className="variant-comparison-controls">
                    <button
                        className="variant-comparison-control"
                        onClick={handleZoomOut}
                        title="Zoom out"
                    >
                        <ZoomOut size={16} />
                    </button>
                    <span className="variant-comparison-zoom-level">
                        {zoom.toFixed(1)}x
                    </span>
                    <button
                        className="variant-comparison-control"
                        onClick={handleZoomIn}
                        title="Zoom in"
                    >
                        <ZoomIn size={16} />
                    </button>
                    <button
                        className="variant-comparison-control"
                        onClick={handleResetZoom}
                        title="Reset zoom"
                    >
                        <RotateCcw size={16} />
                    </button>
                </div>

                {/* Beat counts summary */}
                <div className="variant-comparison-summary">
                    {DIFFICULTY_ORDER.map((diff) => (
                        <div
                            key={diff}
                            className="variant-comparison-summary-item"
                            style={{ color: DIFFICULTY_COLORS[diff] }}
                        >
                            <span className="variant-comparison-summary-label">
                                {diff.charAt(0).toUpperCase() + diff.slice(1)}:
                            </span>
                            <span className="variant-comparison-summary-value">
                                {comparisonStats.counts[diff]}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Time ruler */}
            <div className="variant-comparison-ruler">
                <div className="variant-comparison-ruler-label">Time</div>
                <div className="variant-comparison-ruler-track">
                    {Array.from({ length: Math.ceil(duration / 10) + 1 }, (_, i) => {
                        const time = i * 10;
                        if (time > duration) return null;
                        const position = ((time - scrollOffset) / (duration / zoom)) * 100;
                        if (position < -5 || position > 105) return null;
                        return (
                            <div
                                key={time}
                                className="variant-comparison-ruler-tick"
                                style={{ left: `${position}%` }}
                            >
                                <span className="variant-comparison-ruler-time">
                                    {formatTime(time)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Stacked timelines */}
            <div className="variant-comparison-rows" ref={containerRef}>
                {DIFFICULTY_ORDER.map((difficulty) => (
                    <VariantRow
                        key={difficulty}
                        difficulty={difficulty}
                        variant={variants[difficulty]}
                        duration={duration}
                        color={DIFFICULTY_COLORS[difficulty]}
                        isNatural={difficulty === naturalDifficulty}
                        currentTime={currentTime}
                        zoom={zoom}
                        scrollOffset={scrollOffset}
                        onScroll={handleScroll}
                        onSeek={onSeek}
                        containerWidth={containerWidth}
                    />
                ))}
            </div>

            {/* Legend */}
            <div className="variant-comparison-legend">
                <div className="variant-comparison-legend-section">
                    <span className="variant-comparison-legend-title">Difficulties:</span>
                    {DIFFICULTY_ORDER.map((diff) => (
                        <div key={diff} className="variant-comparison-legend-item">
                            <div
                                className="variant-comparison-legend-marker"
                                style={{ backgroundColor: DIFFICULTY_COLORS[diff] }}
                            />
                            <span>{diff.charAt(0).toUpperCase() + diff.slice(1)}</span>
                        </div>
                    ))}
                </div>
                <div className="variant-comparison-legend-section">
                    <span className="variant-comparison-legend-title">Bands:</span>
                    {(['low', 'mid', 'high'] as Band[]).map((band) => (
                        <div key={band} className="variant-comparison-legend-item">
                            <div
                                className="variant-comparison-legend-marker"
                                style={{ backgroundColor: BAND_COLORS[band] }}
                            />
                            <span>{band.charAt(0).toUpperCase() + band.slice(1)}</span>
                        </div>
                    ))}
                </div>
                <div className="variant-comparison-legend-section">
                    <div className="variant-comparison-legend-item">
                        <div className="variant-comparison-legend-size">
                            <div className="variant-comparison-legend-size-small" />
                            <div className="variant-comparison-legend-size-large" />
                        </div>
                        <span>Intensity</span>
                    </div>
                </div>
            </div>

            {/* Instructions */}
            <div className="variant-comparison-instructions">
                <span>Drag to scroll</span>
                <span>Click to seek</span>
                <span>Use zoom controls to adjust view</span>
            </div>

            {/* Quick scrollbar for fast navigation */}
            {duration && duration > 0 && (
                <div className="variant-comparison-quickscroll">
                    <div
                        ref={quickScrollRef}
                        className={`variant-comparison-quickscroll-track ${isQuickScrollDragging ? 'dragging' : ''}`}
                        onClick={handleQuickScrollClick}
                        onMouseDown={handleQuickScrollDragStart}
                    >
                        {/* Beat density markers in quick scroll (sampled for performance) */}
                        {quickScrollBeats.map((beat, index) => {
                            const position = beat.timestamp / duration;
                            return (
                                <div
                                    key={`quickscroll-beat-${index}`}
                                    className="variant-comparison-quickscroll-marker"
                                    style={{
                                        left: `${position * 100}%`,
                                        backgroundColor: BAND_COLORS[beat.band],
                                    }}
                                />
                            );
                        })}

                        {/* Viewport indicator - shows current visible window */}
                        <div
                            className="variant-comparison-quickscroll-viewport"
                            style={{
                                left: `${Math.max(0, (scrollOffset / duration) * 100)}%`,
                                width: `${Math.min(100, (visibleDuration / duration) * 100)}%`,
                            }}
                        />

                        {/* Current position indicator (playhead) */}
                        <div
                            className="variant-comparison-quickscroll-position"
                            style={{ left: `${(storeCurrentTime / duration) * 100}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default VariantComparisonView;
