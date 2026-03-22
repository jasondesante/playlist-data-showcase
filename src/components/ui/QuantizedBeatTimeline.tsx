/**
 * QuantizedBeatTimeline Component
 *
 * A horizontal timeline visualization showing final quantized output.
 * Features:
 * - Beat grid lines (subtle vertical lines)
 * - Quantized beats as markers
 * - Color-coded by band (Low=Blue, Mid=Green, High=Orange)
 * - Size based on intensity
 * - Hover shows quantization error
 * - Sync with audio playback (currentTime prop)
 * - Drag-to-scrub timeline with click-to-seek
 * - Quick scroll bar for fast navigation
 * - Show playhead position synced with audio
 *
 * Part of Phase 6: Quantization Visualization (Task 6.3)
 */

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Info } from 'lucide-react';
import './QuantizedBeatTimeline.css';
import type { GeneratedBeat, Band, GridType, HighlightedRegion } from '../../types/rhythmGeneration';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';

// ============================================================
// Types
// ============================================================

export interface QuantizedBeatTimelineProps {
    /** Array of quantized beats to visualize */
    beats: GeneratedBeat[];
    /** Quarter note interval in seconds (for beat grid lines) */
    quarterNoteInterval?: number;
    /** Current audio playback time in seconds */
    currentTime?: number;
    /** Total audio duration in seconds */
    duration?: number;
    /** Whether audio is currently playing */
    isPlaying?: boolean;
    /** Callback when user seeks to a time position */
    onSeek?: (time: number) => void;
    /** Callback when user clicks on a beat */
    onBeatClick?: (beat: GeneratedBeat, index: number) => void;
    /** Optional filter to show only specific band */
    filterBand?: Band | 'all';
    /** Index of the currently selected beat (for highlighting) */
    selectedBeatIndex?: number | null;
    /** Anticipation window in seconds for future beats (default: 2.0) */
    anticipationWindow?: number;
    /** Past window in seconds for showing beats that have passed (default: 4.0) */
    pastWindow?: number;
    /** Highlighted regions to show on the timeline (for phrase occurrences) */
    highlightedRegions?: HighlightedRegion[];
    /** Additional CSS class names */
    className?: string;
}

/**
 * Band color scheme (as defined in the plan)
 */
const BAND_COLORS: Record<Band, string> = {
    low: '#3b82f6',    // Blue
    mid: '#22c55e',    // Green
    high: '#f97316',   // Orange
};

/**
 * Grid type display labels
 */
const GRID_TYPE_LABELS: Record<GridType, string> = {
    straight_16th: '16th',
    triplet_8th: 'Triplet',
};

/** Pixels of movement before treating as drag (vs click) */
const DRAG_THRESHOLD = 5;

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
 * QuantizedBeatTimeline Component
 *
 * Renders a horizontal timeline where quantized beats are displayed as colored markers.
 * The timeline syncs with audio playback and shows a playhead indicator.
 */
export function QuantizedBeatTimeline({
    beats,
    quarterNoteInterval = 0.5,
    currentTime: propCurrentTime = 0,
    duration = 0,
    isPlaying: propIsPlaying = false,
    onSeek: propOnSeek,
    onBeatClick,
    filterBand = 'all',
    selectedBeatIndex = null,
    anticipationWindow = 2.0,
    pastWindow = 4.0,
    highlightedRegions = [],
    className,
}: QuantizedBeatTimelineProps) {
    // Debug: Log the beats prop on initial render
    useEffect(() => {
        console.log('[QuantizedBeatTimeline] Received beats prop:', {
            count: beats.length,
        });
        if (beats.length > 0) {
            console.log('  First beat:', beats[0]);
            console.log('  Last beat:', beats[beats.length - 1]);
        }
    }, [beats]);
    const trackRef = useRef<HTMLDivElement>(null);
    const quickScrollRef = useRef<HTMLDivElement>(null);

    // Direct store access for responsive seeking
    const storeSeek = useAudioPlayerStore((state) => state.seek);
    const storeCurrentTime = useAudioPlayerStore((state) => state.currentTime);
    const playbackState = useAudioPlayerStore((state) => state.playbackState);
    const storeIsPlaying = playbackState === 'playing';

    // Use store values if no prop override
    const seek = propOnSeek || storeSeek;
    const currentTime = propCurrentTime !== undefined || !storeCurrentTime ? propCurrentTime : storeCurrentTime;
    const isPlaying = propIsPlaying !== undefined ? propIsPlaying : storeIsPlaying;

    // ========================================
    // Hover State for Tooltip
    // ========================================

    const [hoveredBeat, setHoveredBeat] = useState<GeneratedBeat | null>(null);
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

    // CRITICAL: Use a ref to track smoothTime for stable callback references
    const smoothTimeRef = useRef(smoothTime);

    // Keep smoothTimeRef in sync with smoothTime state
    useEffect(() => {
        smoothTimeRef.current = smoothTime;
    }, [smoothTime]);

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

    useEffect(() => {
        const playbackJustStarted = isPlaying && !prevIsPlayingRef.current;
        if (playbackJustStarted) {
            lastAudioTimeRef.current = {
                time: currentTime,
                timestamp: performance.now(),
            };
            setSmoothTime(currentTime);
        }

        prevIsPlayingRef.current = isPlaying;
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
    // Drag-to-scrub and click-to-seek functionality
    // ========================================

    const [isDragging, setIsDragging] = useState(false);
    const dragStartXRef = useRef<number>(0);
    const dragStartTimeRef = useRef<number>(0);

    // Quick scroll state
    const [isQuickScrollDragging, setIsQuickScrollDragging] = useState(false);

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
    // Quick scroll handlers
    // ========================================

    const handleQuickScrollClick = useCallback(
        (event: React.MouseEvent) => {
            if (!quickScrollRef.current || duration === 0) return;

            const rect = quickScrollRef.current.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            const trackWidth = rect.width;
            const positionRatio = Math.max(0, Math.min(1, clickX / trackWidth));
            const newTime = positionRatio * duration;
            seek(newTime);
        },
        [duration, seek]
    );

    const handleQuickScrollDragStart = useCallback(
        (event: React.MouseEvent) => {
            if (!quickScrollRef.current || duration === 0) return;

            event.preventDefault();
            setIsQuickScrollDragging(true);

            const rect = quickScrollRef.current.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            const trackWidth = rect.width;
            const positionRatio = Math.max(0, Math.min(1, clickX / trackWidth));
            const newTime = positionRatio * duration;
            seek(newTime);
        },
        [duration, seek]
    );

    // Quick scroll drag handling with RAF throttling
    useEffect(() => {
        if (!isQuickScrollDragging || duration === 0) return;

        let pendingSeek: number | null = null;
        let rafId: number | null = null;

        const handleQuickScrollMove = (event: MouseEvent) => {
            if (!quickScrollRef.current) return;

            const rect = quickScrollRef.current.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            const trackWidth = rect.width;
            const positionRatio = Math.max(0, Math.min(1, clickX / trackWidth));
            const newTime = positionRatio * duration;

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

    // ========================================
    // Beat Filtering and Positioning
    // ========================================

    /**
     * Filter beats based on band
     */
    const filteredBeats = useMemo(() => {
        if (filterBand === 'all') return beats;
        return beats.filter((b) => b.band === filterBand);
    }, [beats, filterBand]);

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
        beat: GeneratedBeat;
        index: number;
        position: number;
        isPast: boolean;
    }> => {
        const minTime = smoothTime - pastWindow;
        const maxTime = smoothTime + anticipationWindow;

        return filteredBeats
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
    }, [filteredBeats, smoothTime, pastWindow, anticipationWindow, calculatePosition]);

    const visibleBeats = getVisibleBeats();

    // Debug: Log visible beats count
    useEffect(() => {
        console.log('[QuantizedBeatTimeline] visibleBeats.length:', visibleBeats.length);
    }, [visibleBeats.length]);

    // ========================================
    // Beat Grid Lines
    // ========================================

    /**
     * Calculate visible beat grid lines
     */
    const getVisibleGridLines = useCallback((): Array<{
        timestamp: number;
        beatIndex: number;
        position: number;
    }> => {
        const minTime = smoothTime - pastWindow;
        const maxTime = smoothTime + anticipationWindow;

        // Calculate which beat indices are visible
        const startBeatIndex = Math.floor(minTime / quarterNoteInterval);
        const endBeatIndex = Math.ceil(maxTime / quarterNoteInterval);

        const lines: Array<{ timestamp: number; beatIndex: number; position: number }> = [];

        for (let i = startBeatIndex; i <= endBeatIndex; i++) {
            const timestamp = i * quarterNoteInterval;
            const position = calculatePosition(timestamp);
            if (position >= 0 && position <= 1) {
                lines.push({ timestamp, beatIndex: i, position });
            }
        }

        return lines;
    }, [smoothTime, pastWindow, anticipationWindow, quarterNoteInterval, calculatePosition]);

    const visibleGridLines = getVisibleGridLines();

    // ========================================
    // Highlighted Regions for Phrase Occurrences
    // ========================================

    /**
     * Calculate visible highlighted regions
     */
    const getVisibleHighlightedRegions = useCallback((): Array<{
        region: HighlightedRegion;
        startPosition: number;
        endPosition: number;
    }> => {
        const minTime = smoothTime - pastWindow;
        const maxTime = smoothTime + anticipationWindow;

        return highlightedRegions
            .filter((region) => {
                // Region is visible if it overlaps with the visible time window
                return region.endTimestamp >= minTime && region.startTimestamp <= maxTime;
            })
            .map((region) => {
                const startPosition = calculatePosition(region.startTimestamp);
                const endPosition = calculatePosition(region.endTimestamp);
                return { region, startPosition, endPosition };
            })
            .filter((item) => {
                // At least partially visible
                return item.endPosition >= 0 && item.startPosition <= 1;
            });
    }, [highlightedRegions, smoothTime, pastWindow, anticipationWindow, calculatePosition]);

    const visibleHighlightedRegions = getVisibleHighlightedRegions();

    // ========================================
    // Statistics for info bar
    // ========================================

    const stats = useMemo(() => {
        const beatsWithError = beats.filter(b => b.quantizationError !== undefined);
        const avgError = beatsWithError.length > 0
            ? beatsWithError.reduce((sum, b) => sum + (b.quantizationError || 0), 0) / beatsWithError.length
            : 0;
        const maxError = beatsWithError.length > 0
            ? Math.max(...beatsWithError.map(b => b.quantizationError || 0))
            : 0;
        const avgIntensity = beats.length > 0
            ? beats.reduce((sum, b) => sum + b.intensity, 0) / beats.length
            : 0;

        return {
            total: beats.length,
            avgError,
            maxError,
            avgIntensity,
        };
    }, [beats]);

    // ========================================
    // Event Handlers
    // ========================================

    /**
     * Handle click on beat
     */
    const handleBeatClick = useCallback(
        (beat: GeneratedBeat, index: number, event: React.MouseEvent) => {
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
        (beat: GeneratedBeat, index: number, event: React.MouseEvent) => {
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
        (beat: GeneratedBeat, index: number, event: React.KeyboardEvent) => {
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
        <div className={`quantized-beat-timeline ${className || ''}`}>
            {/* Timeline track */}
            <div
                ref={trackRef}
                className={`quantized-beat-timeline-track quantized-beat-timeline-track--draggable ${isDragging ? 'quantized-beat-timeline-track--dragging' : ''}`}
                onMouseDown={handleMouseDown}
                role="slider"
                aria-label="Quantized beat timeline"
                aria-valuemin={0}
                aria-valuemax={duration}
                aria-valuenow={smoothTime}
                tabIndex={0}
            >
                {/* Background gradient */}
                <div className="quantized-beat-timeline-background" />

                {/* Past region indicator */}
                <div className="quantized-beat-timeline-past-region" />

                {/* Future region indicator */}
                <div className="quantized-beat-timeline-future-region" />

                {/* Beat grid lines */}
                {visibleGridLines.map(({ beatIndex, position }) => (
                    <div
                        key={`grid-line-${beatIndex}`}
                        className="quantized-beat-timeline-grid-line"
                        style={{ left: `${position * 100}%` }}
                    >
                        {/* Beat number label for every 4th beat */}
                        {beatIndex % 4 === 0 && (
                            <span className="quantized-beat-timeline-grid-label">
                                {Math.floor(beatIndex / 4) + 1}
                            </span>
                        )}
                    </div>
                ))}

                {/* Highlighted regions (for phrase occurrences) */}
                {visibleHighlightedRegions.map(({ region, startPosition, endPosition }) => (
                    <div
                        key={`highlight-${region.id}`}
                        className="quantized-beat-timeline-highlight"
                        style={{
                            left: `${Math.max(0, startPosition) * 100}%`,
                            width: `${(Math.min(1, endPosition) - Math.max(0, startPosition)) * 100}%`,
                            backgroundColor: region.color,
                        }}
                        title={region.label}
                    />
                ))}

                {/* Quantized beat markers */}
                {visibleBeats.map(({ beat, index, position, isPast }) => (
                    <div
                        key={`beat-${beat.timestamp.toFixed(3)}-${beat.band}-${beat.beatIndex}-${beat.gridPosition}`}
                        className={`quantized-beat-timeline-marker ${
                            isPast ? 'quantized-beat-timeline-marker--past' : ''
                        } ${
                            selectedBeatIndex !== null && index === selectedBeatIndex
                                ? 'quantized-beat-timeline-marker--selected'
                                : ''
                        } ${
                            hoveredIndex === index ? 'quantized-beat-timeline-marker--hovered' : ''
                        }`}
                        style={{
                            left: `${position * 100}%`,
                            '--band-color': BAND_COLORS[beat.band],
                        } as React.CSSProperties}
                        onClick={(e) => handleBeatClick(beat, index, e)}
                        onMouseEnter={(e) => handleMouseEnter(beat, index, e)}
                        onMouseLeave={handleMouseLeave}
                        onKeyDown={(e) => handleBeatKeyDown(beat, index, e)}
                        role="button"
                        tabIndex={0}
                        aria-label={`Beat at ${formatTime(beat.timestamp)}, ${beat.band} band, intensity ${Math.round(beat.intensity * 100)}%`}
                    >
                        {/* Beat dot */}
                        <div
                            className="quantized-beat-timeline-marker-dot"
                            style={{
                                width: `${10 + beat.intensity * 14}px`,
                                height: `${10 + beat.intensity * 14}px`,
                                backgroundColor: BAND_COLORS[beat.band],
                            }}
                        >
                            {/* Show quantization error indicator if significant */}
                            {beat.quantizationError !== undefined && beat.quantizationError > 30 && (
                                <div className="quantized-beat-timeline-error-indicator">
                                    !
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {/* "Now" line - fixed in center */}
                <div className="quantized-beat-timeline-now-line">
                    <div className="quantized-beat-timeline-now-line-inner" />
                    <span className="quantized-beat-timeline-now-label">NOW</span>
                </div>
            </div>

            {/* Tooltip for hovered beat */}
            {hoveredBeat && (
                <div
                    className="quantized-beat-timeline-tooltip"
                    style={{
                        left: tooltipPosition.x,
                        top: tooltipPosition.y,
                    }}
                >
                    <div className="quantized-beat-tooltip-header">
                        <span className="quantized-beat-tooltip-time">
                            {formatTime(hoveredBeat.timestamp)}
                        </span>
                        <span
                            className="quantized-beat-tooltip-band"
                            style={{ backgroundColor: BAND_COLORS[hoveredBeat.band] }}
                        >
                            {hoveredBeat.band.charAt(0).toUpperCase() + hoveredBeat.band.slice(1)}
                        </span>
                    </div>
                    <div className="quantized-beat-tooltip-stats">
                        <div className="quantized-beat-tooltip-stat">
                            <span className="quantized-beat-tooltip-stat-label">Beat Index</span>
                            <span className="quantized-beat-tooltip-stat-value">
                                {hoveredBeat.beatIndex + 1}
                            </span>
                        </div>
                        <div className="quantized-beat-tooltip-stat">
                            <span className="quantized-beat-tooltip-stat-label">Grid Position</span>
                            <span className="quantized-beat-tooltip-stat-value">
                                {hoveredBeat.gridPosition} ({GRID_TYPE_LABELS[hoveredBeat.gridType]})
                            </span>
                        </div>
                        <div className="quantized-beat-tooltip-stat">
                            <span className="quantized-beat-tooltip-stat-label">Intensity</span>
                            <span className="quantized-beat-tooltip-stat-value">
                                {(hoveredBeat.intensity * 100).toFixed(0)}%
                            </span>
                        </div>
                        {hoveredBeat.quantizationError !== undefined && (
                            <div className="quantized-beat-tooltip-stat">
                                <span className="quantized-beat-tooltip-stat-label">Quant Error</span>
                                <span className={`quantized-beat-tooltip-stat-value ${
                                    hoveredBeat.quantizationError > 50 ? 'quantized-beat-tooltip-stat-value--warning' : ''
                                }`}>
                                    {formatMs(hoveredBeat.quantizationError)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Timeline info bar */}
            <div className="quantized-beat-timeline-info">
                <div className="quantized-beat-timeline-info-item">
                    <span className="quantized-beat-timeline-info-label">Visible</span>
                    <span className="quantized-beat-timeline-info-value">{visibleBeats.length}</span>
                </div>
                <div className="quantized-beat-timeline-info-item">
                    <span className="quantized-beat-timeline-info-label">Total</span>
                    <span className="quantized-beat-timeline-info-value">{beats.length}</span>
                </div>
                <div className="quantized-beat-timeline-info-item">
                    <span className="quantized-beat-timeline-info-label">Time</span>
                    <span className="quantized-beat-timeline-info-value">{formatTime(smoothTime)}</span>
                </div>
                <div className="quantized-beat-timeline-info-item">
                    <span className="quantized-beat-timeline-info-label">Avg Error</span>
                    <span className={`quantized-beat-timeline-info-value ${
                        stats.avgError > 30 ? 'quantized-beat-timeline-info-value--warning' : ''
                    }`}>
                        {formatMs(stats.avgError)}
                    </span>
                </div>
            </div>

            {/* Legend */}
            <div className="quantized-beat-timeline-legend">
                {(Object.keys(BAND_COLORS) as Band[]).map((band) => (
                    <div key={band} className="quantized-beat-timeline-legend-item">
                        <div
                            className="quantized-beat-timeline-legend-marker"
                            style={{ backgroundColor: BAND_COLORS[band] }}
                        />
                        <span className="quantized-beat-timeline-legend-label">
                            {band.charAt(0).toUpperCase() + band.slice(1)}
                        </span>
                    </div>
                ))}
                <div className="quantized-beat-timeline-legend-item">
                    <div className="quantized-beat-timeline-legend-size">
                        <div className="quantized-beat-timeline-legend-size-small" />
                        <div className="quantized-beat-timeline-legend-size-large" />
                    </div>
                    <span className="quantized-beat-timeline-legend-label">Intensity</span>
                </div>
                <div className="quantized-beat-timeline-legend-item">
                    <div className="quantized-beat-timeline-legend-error">
                        !
                    </div>
                    <span className="quantized-beat-timeline-legend-label">High Error</span>
                </div>
                <div className="quantized-beat-timeline-legend-item">
                    <Info size={14} />
                    <span className="quantized-beat-timeline-legend-label">Hover for details</span>
                </div>
            </div>

            {/* Quick scrollbar for fast navigation */}
            {duration > 0 && (
                <div className="quantized-beat-timeline-quickscroll">
                    <div
                        ref={quickScrollRef}
                        className="quantized-beat-timeline-quickscroll-track"
                        onClick={handleQuickScrollClick}
                        onMouseDown={handleQuickScrollDragStart}
                    >
                        {/* Beat markers (sampled for performance) */}
                        {filteredBeats
                            .filter((_, idx) => idx % Math.max(1, Math.floor(filteredBeats.length / 100)) === 0)
                            .map((beat, index) => {
                                const position = beat.timestamp / duration;
                                return (
                                    <div
                                        key={`quickscroll-${index}`}
                                        className="quantized-beat-timeline-quickscroll-marker"
                                        style={{
                                            left: `${position * 100}%`,
                                            backgroundColor: BAND_COLORS[beat.band],
                                        }}
                                    />
                                );
                            })}

                        {/* Viewport indicator */}
                        <div
                            className="quantized-beat-timeline-quickscroll-viewport"
                            style={{
                                left: `${Math.max(0, ((smoothTime - pastWindow) / duration) * 100)}%`,
                                width: `${Math.min(100, (totalWindow / duration) * 100)}%`,
                            }}
                        />

                        {/* Current position indicator */}
                        <div
                            className="quantized-beat-timeline-quickscroll-position"
                            style={{ left: `${(smoothTime / duration) * 100}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default QuantizedBeatTimeline;
