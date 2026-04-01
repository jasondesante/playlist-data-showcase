/**
 * VariantComparisonView Component
 *
 * A stacked view of all three difficulty variants (Easy/Medium/Hard) showing:
 * - Three stacked timelines (3 rows)
 * - Visual density comparison at a glance
 * - Beat count labels for each difficulty
 * - Vertical alignment so beats line up by time across all three
 * - Centered playhead (now line in middle of timeline)
 * - Drag-to-scrub and quick scroll navigation
 *
 * Part of Phase 7: Difficulty Variants Visualization (Task 7.3)
 */

import { useRef, useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Trophy, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import './VariantComparisonView.css';
import { useAudioPlayerStore } from '../../../../store/audioPlayerStore';
import { usePlaylistStore } from '../../../../store/playlistStore';
import { useUnifiedBeatMap } from '../../../../store/beatDetectionStore';
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
 * Extended grid type including simplified subdivisions for Easy difficulty.
 * Re-exported from playlist-data-engine for convenience.
 */
type ExtendedGridType = import('playlist-data-engine').ExtendedGridType;

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
    natural: '#8b5cf6', // Purple (unedited composite)
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
const DIFFICULTY_ORDER: DifficultyLevel[] = ['natural', 'easy', 'medium', 'hard'];

// ============================================================
// Sub-components
// ============================================================

/**
 * Single timeline row for a difficulty variant
 * Uses centered playhead approach - playhead is always at 50% of timeline
 */
interface VariantRowProps {
    difficulty: DifficultyLevel;
    variant: DifficultyVariant;
    duration: number;
    color: string;
    pastWindow: number;
    anticipationWindow: number;
    /** Shared smooth time from parent - ensures all rows are synchronized */
    smoothTime: number;
    /** The unified beat map for grid lines */
    unifiedBeatMap: ReturnType<typeof useUnifiedBeatMap>;
}

/** Pixels of movement before treating as drag (vs click) */
const DRAG_THRESHOLD = 5;

const VariantRow = memo(function VariantRow({
    difficulty,
    variant,
    duration,
    color,
    pastWindow,
    anticipationWindow,
    smoothTime,
    unifiedBeatMap,
}: VariantRowProps) {
    const trackRef = useRef<HTMLDivElement>(null);

    // Direct store access for responsive seeking
    const storeSeek = useAudioPlayerStore((state) => state.seek);
    const currentAudioUrl = useAudioPlayerStore((state) => state.currentUrl);

    // Get selected track from playlist store (for initiating playback when audio not loaded)
    const selectedTrack = usePlaylistStore((state) => state.selectedTrack);

    // Smart seek wrapper: loads audio first if not loaded
    const seek = useCallback((time: number) => {
        storeSeek(time, currentAudioUrl || selectedTrack?.audio_url);
    }, [storeSeek, currentAudioUrl, selectedTrack?.audio_url]);

    const beats = variant.beats as VariantBeat[];

    // Ref for stable callback references (smoothTime is now a prop from parent)
    const smoothTimeRef = useRef(smoothTime);

    // Keep smoothTimeRef in sync with smoothTime prop
    useEffect(() => {
        smoothTimeRef.current = smoothTime;
    }, [smoothTime]);

    // ========================================
    // Drag-to-scrub and click-to-seek functionality
    // ========================================

    const [isDragging, setIsDragging] = useState(false);
    const dragStartXRef = useRef<number>(0);
    const dragStartTimeRef = useRef<number>(0);

    // Total visible time window
    const totalWindow = pastWindow + anticipationWindow;

    const handleMouseDown = useCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
            if (!trackRef.current || duration === 0) return;

            event.preventDefault();
            setIsDragging(true);
            dragStartXRef.current = event.clientX;
            dragStartTimeRef.current = smoothTimeRef.current;
        },
        [duration]
    );

    const handleMouseMove = useCallback(
        (event: MouseEvent) => {
            if (!isDragging || !trackRef.current || duration === 0) return;

            const rect = trackRef.current.getBoundingClientRect();
            const trackWidth = rect.width;
            const deltaX = event.clientX - dragStartXRef.current;

            if (Math.abs(deltaX) > DRAG_THRESHOLD) {
                const timePerPixel = totalWindow / trackWidth;
                const deltaTime = -deltaX * timePerPixel;
                const newTime = Math.max(0, Math.min(duration, dragStartTimeRef.current + deltaTime));
                seek(newTime);
            }
        },
        [isDragging, totalWindow, duration, seek]
    );

    const handleMouseUp = useCallback(
        (event: MouseEvent) => {
            if (!isDragging || !trackRef.current || duration === 0) return;

            const rect = trackRef.current.getBoundingClientRect();
            const deltaX = event.clientX - dragStartXRef.current;

            if (Math.abs(deltaX) <= DRAG_THRESHOLD) {
                const clickX = event.clientX - rect.left;
                const trackWidth = rect.width;
                const positionRatio = clickX / trackWidth;
                const timeFromPastStart = positionRatio * totalWindow;
                const newTime = Math.max(0, Math.min(duration, (smoothTimeRef.current - pastWindow) + timeFromPastStart));
                seek(newTime);
            }

            setIsDragging(false);
        },
        [isDragging, pastWindow, totalWindow, duration, seek]
    );

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
    // Beat Filtering and Positioning
    // ========================================

    // Calculate time window for visible beats
    const minTime = smoothTime - pastWindow;
    const maxTime = smoothTime + anticipationWindow;

    // Get visible beats with centered playhead positioning
    const visibleBeats = useMemo(() => {
        return beats
            .map((beat, index) => {
                const timeUntilBeat = beat.timestamp - smoothTime;
                // Position: 0.5 is center (now), beats in past are < 0.5, beats in future are > 0.5
                const position = 0.5 + (timeUntilBeat / anticipationWindow) * 0.5;
                return {
                    beat,
                    index,
                    position,
                    isPast: beat.timestamp < smoothTime - 0.05,
                };
            })
            .filter((item) => {
                const timeMatch = item.beat.timestamp >= minTime && item.beat.timestamp <= maxTime;
                const positionMatch = item.position >= 0 && item.position <= 1;
                return timeMatch && positionMatch;
            });
    }, [beats, smoothTime, minTime, maxTime, anticipationWindow]);

    // ========================================
    // Beat Grid Lines (same pattern as QuantizedBeatTimeline)
    // ========================================

    /**
     * Calculate visible beat grid lines using the unified beat map
     */
    const visibleGridLines = useMemo(() => {
        if (!unifiedBeatMap || unifiedBeatMap.beats.length === 0) return [];

        const lines: Array<{ timestamp: number; beatIndex: number; position: number }> = [];

        for (let i = 0; i < unifiedBeatMap.beats.length; i++) {
            const beat = unifiedBeatMap.beats[i];
            const timestamp = beat.timestamp;

            if (timestamp >= minTime && timestamp <= maxTime) {
                const timeUntilBeat = timestamp - smoothTime;
                const position = 0.5 + (timeUntilBeat / anticipationWindow) * 0.5;
                if (position >= 0 && position <= 1) {
                    lines.push({ timestamp, beatIndex: i, position });
                }
            }
        }

        return lines;
    }, [unifiedBeatMap, smoothTime, minTime, maxTime, anticipationWindow]);

    /**
     * Calculate visible subdivision lines within each beat (16th notes)
     */
    const visibleSubdivisionLines = useMemo(() => {
        if (!unifiedBeatMap || unifiedBeatMap.beats.length < 2) return [];

        const lines: Array<{ timestamp: number; beatIndex: number; subdivision: number; position: number }> = [];
        const beats = unifiedBeatMap.beats;
        const subdivisionsPerBeat = 4; // 16th notes

        for (let beatIdx = 0; beatIdx < beats.length - 1; beatIdx++) {
            const beatStart = beats[beatIdx].timestamp;
            const nextBeatStart = beats[beatIdx + 1].timestamp;
            const beatInterval = nextBeatStart - beatStart;

            if (beatStart + beatInterval >= minTime && beatStart <= maxTime) {
                for (let sub = 1; sub < subdivisionsPerBeat; sub++) {
                    const timestamp = beatStart + (sub / subdivisionsPerBeat) * beatInterval;
                    const timeUntilBeat = timestamp - smoothTime;
                    const position = 0.5 + (timeUntilBeat / anticipationWindow) * 0.5;

                    if (position >= 0 && position <= 1) {
                        lines.push({ timestamp, beatIndex: beatIdx, subdivision: sub, position });
                    }
                }
            }
        }

        // Handle the last beat - use the previous interval as an estimate
        const lastBeatIdx = beats.length - 1;
        const lastBeatStart = beats[lastBeatIdx].timestamp;
        if (lastBeatIdx > 0) {
            const prevBeatStart = beats[lastBeatIdx - 1].timestamp;
            const beatInterval = lastBeatStart - prevBeatStart;

            if (lastBeatStart + beatInterval >= minTime && lastBeatStart <= maxTime) {
                for (let sub = 1; sub < subdivisionsPerBeat; sub++) {
                    const timestamp = lastBeatStart + (sub / subdivisionsPerBeat) * beatInterval;
                    const timeUntilBeat = timestamp - smoothTime;
                    const position = 0.5 + (timeUntilBeat / anticipationWindow) * 0.5;

                    if (position >= 0 && position <= 1) {
                        lines.push({ timestamp, beatIndex: lastBeatIdx, subdivision: sub, position });
                    }
                }
            }
        }

        return lines;
    }, [unifiedBeatMap, smoothTime, minTime, maxTime, anticipationWindow]);

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
            className="variant-comparison-row"
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
            </div>

            {/* Timeline track */}
            <div
                ref={trackRef}
                className={`variant-comparison-track ${isDragging ? 'variant-comparison-track--dragging' : ''}`}
                onMouseDown={handleMouseDown}
                role="slider"
                tabIndex={0}
                aria-label={`${difficulty} difficulty timeline`}
                aria-valuemin={0}
                aria-valuemax={duration}
                aria-valuenow={smoothTime}
            >
                {/* Background */}
                <div className="variant-comparison-track-bg" />

                {/* Beat grid lines (quarter notes) */}
                {visibleGridLines.map(({ beatIndex, position }) => (
                    <div
                        key={`grid-line-${beatIndex}`}
                        className="variant-comparison-grid-line"
                        style={{ left: `${position * 100}%` }}
                    >
                        {/* Beat number label for every 4th beat (measure numbers) */}
                        {beatIndex % 4 === 0 && (
                            <span className="variant-comparison-grid-label">
                                {Math.floor(beatIndex / 4) + 1}
                            </span>
                        )}
                    </div>
                ))}

                {/* Subdivision grid lines (16th notes - fainter) */}
                {visibleSubdivisionLines.map(({ beatIndex, subdivision, position }) => (
                    <div
                        key={`subdivision-${beatIndex}-${subdivision}`}
                        className="variant-comparison-subdivision-line"
                        style={{ left: `${position * 100}%` }}
                    />
                ))}

                {/* Beat markers */}
                {visibleBeats.map(({ beat, index, position, isPast }) => {
                    const size = 6 + beat.intensity * 8;

                    return (
                        <div
                            key={`beat-${beat.timestamp.toFixed(3)}-${index}`}
                            className={`variant-comparison-beat ${isPast ? 'variant-comparison-beat--past' : ''}`}
                            style={{
                                left: `${position * 100}%`,
                                width: `${size}px`,
                                height: `${size}px`,
                                backgroundColor: getBeatColor(beat),
                                opacity: 0.6 + beat.intensity * 0.4,
                            }}
                            title={`${beat.timestamp.toFixed(3)}s - ${beat.sourceBand} band`}
                        />
                    );
                })}

                {/* Now line (playhead) - always centered */}
                <div className="variant-comparison-now-line">
                    <div className="variant-comparison-now-line-inner" style={{ backgroundColor: color }} />
                </div>
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
});

// ============================================================
// Main Component
// ============================================================

/**
 * VariantComparisonView
 *
 * Displays all three difficulty variants as stacked timelines with centered playhead.
 * Provides a visual density comparison at a glance.
 */
export function VariantComparisonView({
    rhythm,
    currentTime: _currentTime = 0,
    duration: propDuration,
    isPlaying: _isPlaying = false,
    onSeek: _onSeek,
    className,
}: VariantComparisonViewProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    // Quick scroll state
    const quickScrollRef = useRef<HTMLDivElement>(null);
    const [isQuickScrollDragging, setIsQuickScrollDragging] = useState(false);

    // Direct store access for responsive seeking
    const storeSeek = useAudioPlayerStore((state) => state.seek);
    const currentAudioUrl = useAudioPlayerStore((state) => state.currentUrl);

    // Get selected track from playlist store (for initiating playback when audio not loaded)
    const selectedTrack = usePlaylistStore((state) => state.selectedTrack);

    // Smart seek wrapper: loads audio first if not loaded
    const seek = useCallback((time: number) => {
        storeSeek(time, currentAudioUrl || selectedTrack?.audio_url);
    }, [storeSeek, currentAudioUrl, selectedTrack?.audio_url]);

    // Subscribe to current time for quick scrollbar
    const storeCurrentTime = useAudioPlayerStore((state) => state.currentTime);
    const playbackState = useAudioPlayerStore((state) => state.playbackState);
    const isPlaying = playbackState === 'playing';

    // Get the unified beat map for grid lines (shared across all rows)
    const unifiedBeatMap = useUnifiedBeatMap();

    const variants = rhythm.difficultyVariants;

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

    // Zoom state - controls the visible time window
    const [zoomLevel, setZoomLevel] = useState(1);
    // Base windows at zoom level 1
    const baseAnticipationWindow = 2.0;
    const basePastWindow = 4.0;
    // Calculate windows based on zoom (higher zoom = smaller windows = more detail)
    const anticipationWindow = baseAnticipationWindow / zoomLevel;
    const pastWindow = basePastWindow / zoomLevel;
    const totalWindow = pastWindow + anticipationWindow;

    // ========================================
    // Shared Smooth Time State (for all rows)
    // ========================================

    const animationFrameRef = useRef<number | null>(null);
    const [smoothTime, setSmoothTime] = useState(storeCurrentTime);
    const lastAudioTimeRef = useRef<{ time: number; timestamp: number }>({
        time: storeCurrentTime,
        timestamp: performance.now(),
    });
    const isPlayingRef = useRef(isPlaying);
    const smoothTimeRef = useRef(smoothTime);

    // Keep smoothTimeRef in sync
    useEffect(() => {
        smoothTimeRef.current = smoothTime;
    }, [smoothTime]);

    // Keep refs in sync with store
    useEffect(() => {
        lastAudioTimeRef.current = {
            time: storeCurrentTime,
            timestamp: performance.now(),
        };
    }, [storeCurrentTime]);

    // Track previous isPlaying state
    const prevIsPlayingRef = useRef(isPlaying);

    useEffect(() => {
        isPlayingRef.current = isPlaying;

        const playbackJustStarted = isPlaying && !prevIsPlayingRef.current;
        if (playbackJustStarted) {
            lastAudioTimeRef.current = {
                time: storeCurrentTime,
                timestamp: performance.now(),
            };
            setSmoothTime(storeCurrentTime);
        }

        prevIsPlayingRef.current = isPlaying;
    }, [isPlaying, storeCurrentTime]);

    // Animation loop for smooth scrolling (shared across all rows)
    useEffect(() => {
        if (!isPlaying) {
            setSmoothTime(storeCurrentTime);
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

    // Handle seek events
    useEffect(() => {
        if (!isPlaying) {
            setSmoothTime(storeCurrentTime);
        }
    }, [storeCurrentTime, isPlaying]);

    // Zoom controls
    const handleZoomIn = useCallback(() => {
        setZoomLevel(prev => Math.min(4, prev * 1.5));
    }, []);

    const handleZoomOut = useCallback(() => {
        setZoomLevel(prev => Math.max(0.5, prev / 1.5));
    }, []);

    const handleResetZoom = useCallback(() => {
        setZoomLevel(1);
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

    // Calculate comparison stats
    const comparisonStats = useMemo(() => {
        const counts: Record<DifficultyLevel, number> = {
            natural: variants.natural.beats.length,
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
                        {zoomLevel.toFixed(1)}x
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

            {/* Stacked timelines */}
            <div className="variant-comparison-rows" ref={containerRef}>
                {DIFFICULTY_ORDER.map((difficulty) => (
                    <VariantRow
                        key={difficulty}
                        difficulty={difficulty}
                        variant={variants[difficulty]}
                        duration={duration}
                        color={DIFFICULTY_COLORS[difficulty]}
                        pastWindow={pastWindow}
                        anticipationWindow={anticipationWindow}
                        smoothTime={smoothTime}
                        unifiedBeatMap={unifiedBeatMap}
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
                <span>Drag to scrub</span>
                <span>Click to seek</span>
                <span>Use zoom controls to adjust detail</span>
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
                                left: `${Math.max(0, ((storeCurrentTime - pastWindow) / duration) * 100)}%`,
                                width: `${Math.min(100, (totalWindow / duration) * 100)}%`,
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
