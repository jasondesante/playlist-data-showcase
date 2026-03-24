/**
 * GridDecisionTimeline Component
 *
 * A horizontal timeline visualization showing per-beat grid choices.
 * Features:
 * - Color-coded markers: Blue for straight_16th, Purple for triplet_8th
 * - Opacity based on confidence
 * - Hover shows confidence score and offset values
 * - Sync with audio playback (currentTime prop)
 * - Drag-to-scrub timeline with click-to-seek
 * - Quick scroll bar for fast navigation
 * - Show playhead position synced with audio
 *
 * Part of Phase 6: Quantization Visualization (Task 6.2)
 */

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import './GridDecisionTimeline.css';
import type { GridDecision, GridType } from '../../types/rhythmGeneration';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';
import { usePlaylistStore } from '../../store/playlistStore';

// ============================================================
// Types
// ============================================================

export interface GridDecisionTimelineProps {
    /** Array of grid decisions to visualize */
    gridDecisions: GridDecision[];
    /** Beat timestamps array (index corresponds to beatIndex) */
    beatTimestamps: number[];
    /** Current audio playback time in seconds */
    currentTime?: number;
    /** Total audio duration in seconds */
    duration?: number;
    /** Whether audio is currently playing */
    isPlaying?: boolean;
    /** Callback when user seeks to a time position */
    onSeek?: (time: number) => void;
    /** Anticipation window in seconds for future beats (default: 2.0) */
    anticipationWindow?: number;
    /** Past window in seconds for showing beats that have passed (default: 4.0) */
    pastWindow?: number;
    /** Additional CSS class names */
    className?: string;
}

/**
 * Grid type colors
 * Blue for straight_16th, Purple for triplet_8th
 */
const GRID_COLORS: Record<GridType, string> = {
    straight_16th: '#3b82f6',  // Blue
    triplet_8th: '#a855f7',     // Purple
};

/**
 * Grid type labels for display
 */
const GRID_LABELS: Record<GridType, string> = {
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
 * GridDecisionTimeline Component
 *
 * Renders a horizontal timeline where grid decisions are displayed as colored markers.
 * The timeline syncs with audio playback and shows a playhead indicator.
 */
export function GridDecisionTimeline({
    gridDecisions,
    beatTimestamps,
    currentTime: propCurrentTime = 0,
    duration = 0,
    isPlaying: propIsPlaying = false,
    onSeek: propOnSeek,
    anticipationWindow = 2.0,
    pastWindow = 4.0,
    className,
}: GridDecisionTimelineProps) {
    const trackRef = useRef<HTMLDivElement>(null);
    const quickScrollRef = useRef<HTMLDivElement>(null);

    // Direct store access for responsive seeking
    const storeSeek = useAudioPlayerStore((state) => state.seek);
    const storeCurrentTime = useAudioPlayerStore((state) => state.currentTime);
    const playbackState = useAudioPlayerStore((state) => state.playbackState);
    const storeIsPlaying = playbackState === 'playing';
    const currentAudioUrl = useAudioPlayerStore((state) => state.currentUrl);

    // Get selected track from playlist store (for initiating playback when audio not loaded)
    const selectedTrack = usePlaylistStore((state) => state.selectedTrack);

    // Smart seek wrapper: loads audio first if not loaded
    const smartSeek = useCallback((time: number) => {
        storeSeek(time, currentAudioUrl || selectedTrack?.audio_url);
    }, [storeSeek, currentAudioUrl, selectedTrack?.audio_url]);

    // Use prop callback if provided, otherwise use smart seek
    const seek = propOnSeek || smartSeek;
    const currentTime = propCurrentTime !== undefined || !storeCurrentTime ? propCurrentTime : storeCurrentTime;
    const isPlaying = propIsPlaying !== undefined ? propIsPlaying : storeIsPlaying;

    // ========================================
    // Hover State for Tooltip
    // ========================================

    const [hoveredDecision, setHoveredDecision] = useState<GridDecision | null>(null);
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

    // Track previous isPlaying state to detect transitions
    const prevIsPlayingRef = useRef(isPlaying);

    useEffect(() => {
        isPlayingRef.current = isPlaying;

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

            // If it was a click (not a drag), seek to clicked position
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
    // Grid Decision Positioning
    // ========================================

    /**
     * Get visible grid decisions within the window
     */
    const visibleDecisions = useMemo(() => {
        const minTime = smoothTime - pastWindow;
        const maxTime = smoothTime + anticipationWindow;

        return gridDecisions
            .map((decision) => {
                const timestamp = beatTimestamps[decision.beatIndex];
                if (timestamp === undefined) return null;
                const timeUntilBeat = timestamp - smoothTime;
                const position = 0.5 + (timeUntilBeat / anticipationWindow) * 0.5;
                const isPast = timestamp < smoothTime - 0.05;
                return { decision, timestamp, position, isPast };
            })
            .filter((item): item is NonNullable<typeof item> => item !== null)
            .filter((item) => {
                const timeMatch = item.timestamp >= minTime && item.timestamp <= maxTime;
                const positionMatch = item.position >= 0 && item.position <= 1;
                return timeMatch && positionMatch;
            });
    }, [gridDecisions, beatTimestamps, smoothTime, pastWindow, anticipationWindow]);

    // ========================================
    // Statistics for info bar
    // ========================================

    const stats = useMemo(() => {
        const straightCount = gridDecisions.filter(d => d.selectedGrid === 'straight_16th').length;
        const tripletCount = gridDecisions.filter(d => d.selectedGrid === 'triplet_8th').length;
        const avgConfidence = gridDecisions.length > 0
            ? gridDecisions.reduce((sum, d) => sum + d.confidence, 0) / gridDecisions.length
            : 0;

        // Determine dominant grid type for the song
        const dominantGrid: GridType = straightCount >= tripletCount ? 'straight_16th' : 'triplet_8th';

        return {
            total: gridDecisions.length,
            straightCount,
            tripletCount,
            avgConfidence,
            dominantGrid,
        };
    }, [gridDecisions]);

    // ========================================
    // Overlap Detection for Hover Priority
    // ========================================

    /**
     * Build a map of beatIndex -> decisions at that index
     * Used to detect overlapping markers from different bands
     */
    const decisionsByBeatIndex = useMemo(() => {
        const map = new Map<number, GridDecision[]>();
        for (const decision of gridDecisions) {
            const existing = map.get(decision.beatIndex) || [];
            existing.push(decision);
            map.set(decision.beatIndex, existing);
        }
        return map;
    }, [gridDecisions]);

    /**
     * Check if a marker should respond to hover based on dominant grid priority.
     * When multiple markers overlap at the same beatIndex, only the dominant grid type responds to hover.
     */
    const shouldAllowHover = useCallback(
        (decision: GridDecision): boolean => {
            const decisionsAtBeat = decisionsByBeatIndex.get(decision.beatIndex);
            if (!decisionsAtBeat || decisionsAtBeat.length <= 1) {
                // No overlap, always allow hover
                return true;
            }

            // Multiple markers at this position - only allow if this is the dominant type
            return decision.selectedGrid === stats.dominantGrid;
        },
        [decisionsByBeatIndex, stats.dominantGrid]
    );

    // ========================================
    // Event Handlers
    // ========================================

    /**
     * Handle hover on grid decision marker
     */
    const handleMouseEnter = useCallback(
        (decision: GridDecision, event: React.MouseEvent) => {
            event.stopPropagation();

            // Only allow hover if this marker should respond (dominant grid priority for overlaps)
            if (!shouldAllowHover(decision)) {
                return;
            }

            setHoveredDecision(decision);
            // Use currentTarget to always get the marker element, not child elements
            const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
            setTooltipPosition({
                x: rect.left + rect.width / 2,
                y: rect.top,
            });
        },
        [shouldAllowHover]
    );

    /**
     * Handle click on grid decision marker (for touch devices)
     */
    const handleMarkerClick = useCallback(
        (decision: GridDecision, event: React.MouseEvent) => {
            event.stopPropagation();
            event.preventDefault();

            // Only allow click if this marker should respond (dominant grid priority for overlaps)
            if (!shouldAllowHover(decision)) {
                return;
            }

            // Toggle tooltip on click
            if (hoveredDecision?.beatIndex === decision.beatIndex) {
                setHoveredDecision(null);
            } else {
                setHoveredDecision(decision);
                const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
                setTooltipPosition({
                    x: rect.left + rect.width / 2,
                    y: rect.top,
                });
            }
        },
        [hoveredDecision, shouldAllowHover]
    );

    const handleMouseLeave = useCallback(() => {
        setHoveredDecision(null);
    }, []);

    /**
     * Prevent marker mouse down from triggering track drag
     */
    const handleMarkerMouseDown = useCallback((event: React.MouseEvent) => {
        event.stopPropagation();
        event.preventDefault();
    }, []);

    return (
        <div className={`grid-decision-timeline ${className || ''}`}>
            {/* Timeline track */}
            <div
                ref={trackRef}
                className={`grid-decision-timeline-track grid-decision-timeline-track--draggable ${isDragging ? 'grid-decision-timeline-track--dragging' : ''}`}
                onMouseDown={handleMouseDown}
                role="slider"
                aria-label="Grid decision timeline"
                aria-valuemin={0}
                aria-valuemax={duration}
                aria-valuenow={smoothTime}
                tabIndex={0}
            >
                {/* Background gradient */}
                <div className="grid-decision-timeline-background" />

                {/* Past region indicator */}
                <div className="grid-decision-timeline-past-region" />

                {/* Future region indicator */}
                <div className="grid-decision-timeline-future-region" />

                {/* Grid decision markers */}
                {visibleDecisions.map(({ decision, position, isPast }, idx) => {
                    const canHover = shouldAllowHover(decision);
                    const isHovered = hoveredDecision?.beatIndex === decision.beatIndex &&
                                      hoveredDecision?.selectedGrid === decision.selectedGrid;
                    return (
                        <div
                            key={`grid-decision-${decision.beatIndex}-${decision.selectedGrid}-${idx}`}
                            className={`grid-decision-timeline-marker ${isPast ? 'grid-decision-timeline-marker--past' : ''
                                } ${isHovered ? 'grid-decision-timeline-marker--hovered' : ''
                                } ${!canHover ? 'grid-decision-timeline-marker--suppressed' : ''}`}
                            style={{
                                left: `${position * 100}%`,
                                '--grid-color': GRID_COLORS[decision.selectedGrid],
                                // confidence is in ms (difference between grid offsets), normalize to 0-1 with 50ms = max
                                opacity: canHover
                                    ? 0.3 + (Math.min(decision.confidence / 50, 1) * 0.7)
                                    : 0.15, // Dim suppressed markers
                                zIndex: canHover ? 10 : 5, // Dominant markers on top
                            } as React.CSSProperties}
                            onMouseEnter={canHover ? (e) => handleMouseEnter(decision, e) : undefined}
                            onMouseLeave={canHover ? handleMouseLeave : undefined}
                            onMouseDown={handleMarkerMouseDown}
                            onClick={canHover ? (e) => handleMarkerClick(decision, e) : undefined}
                            role="button"
                            tabIndex={canHover ? 0 : -1}
                            aria-label={`Beat ${decision.beatIndex + 1}: ${GRID_LABELS[decision.selectedGrid]}, grid diff ${decision.confidence.toFixed(1)}ms${!canHover ? ' (overlapped)' : ''}`}
                        >
                            {/* Marker dot */}
                            <div className="grid-decision-timeline-marker-dot">
                                {/* Grid type indicator */}
                                <span className="grid-decision-timeline-marker-label">
                                    {decision.selectedGrid === 'triplet_8th' ? 'T' : 'S'}
                                </span>
                            </div>
                        </div>
                    );
                })}

                {/* "Now" line - fixed in center */}
                <div className="grid-decision-timeline-now-line">
                    <div className="grid-decision-timeline-now-line-inner" />
                    <span className="grid-decision-timeline-now-label">NOW</span>
                </div>
            </div>

            {/* Tooltip for hovered decision - rendered via portal to escape container clipping */}
            {hoveredDecision && createPortal(
                <div
                    className="grid-decision-timeline-tooltip"
                    style={{
                        left: tooltipPosition.x,
                        top: tooltipPosition.y,
                    }}
                >
                    <div className="grid-decision-tooltip-header">
                        <span className="grid-decision-tooltip-beat">
                            Beat {hoveredDecision.beatIndex + 1}
                        </span>
                        <span
                            className="grid-decision-tooltip-type"
                            style={{ backgroundColor: GRID_COLORS[hoveredDecision.selectedGrid] }}
                        >
                            {GRID_LABELS[hoveredDecision.selectedGrid]}
                        </span>
                    </div>
                    <div className="grid-decision-tooltip-stats">
                        <div className="grid-decision-tooltip-stat">
                            <span className="grid-decision-tooltip-stat-label">Grid Diff</span>
                            <span className="grid-decision-tooltip-stat-value">
                                {formatMs(hoveredDecision.confidence)}
                            </span>
                        </div>
                        <div className="grid-decision-tooltip-stat">
                            <span className="grid-decision-tooltip-stat-label">Transients</span>
                            <span className="grid-decision-tooltip-stat-value">
                                {hoveredDecision.transientCount}
                            </span>
                        </div>
                        <div className="grid-decision-tooltip-stat">
                            <span className="grid-decision-tooltip-stat-label">16th Offset</span>
                            <span className="grid-decision-tooltip-stat-value">
                                {formatMs(hoveredDecision.straightAvgOffset)}
                            </span>
                        </div>
                        <div className="grid-decision-tooltip-stat">
                            <span className="grid-decision-tooltip-stat-label">Triplet Offset</span>
                            <span className="grid-decision-tooltip-stat-value">
                                {formatMs(hoveredDecision.tripletAvgOffset)}
                            </span>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Timeline info bar */}
            <div className="grid-decision-timeline-info">
                <div className="grid-decision-timeline-info-item">
                    <span className="grid-decision-timeline-info-label">Visible</span>
                    <span className="grid-decision-timeline-info-value">{visibleDecisions.length}</span>
                </div>
                <div className="grid-decision-timeline-info-item">
                    <span className="grid-decision-timeline-info-label">Total</span>
                    <span className="grid-decision-timeline-info-value">{stats.total}</span>
                </div>
                <div className="grid-decision-timeline-info-item">
                    <span className="grid-decision-timeline-info-label">Time</span>
                    <span className="grid-decision-timeline-info-value">{formatTime(smoothTime)}</span>
                </div>
                <div className="grid-decision-timeline-info-item">
                    <span className="grid-decision-timeline-info-label">Avg Conf</span>
                    <span className="grid-decision-timeline-info-value">
                        {formatMs(stats.avgConfidence)}
                    </span>
                </div>
            </div>

            {/* Legend */}
            <div className="grid-decision-timeline-legend">
                <div className="grid-decision-timeline-legend-item">
                    <div
                        className="grid-decision-timeline-legend-marker grid-decision-timeline-legend-marker--straight"
                    />
                    <span className="grid-decision-timeline-legend-label">Straight 16th ({stats.straightCount})</span>
                </div>
                <div className="grid-decision-timeline-legend-item">
                    <div
                        className="grid-decision-timeline-legend-marker grid-decision-timeline-legend-marker--triplet"
                    />
                    <span className="grid-decision-timeline-legend-label">Triplet 8th ({stats.tripletCount})</span>
                </div>
                <div className="grid-decision-timeline-legend-item">
                    <div className="grid-decision-timeline-legend-opacity">
                        <div className="grid-decision-timeline-legend-opacity-low" />
                        <div className="grid-decision-timeline-legend-opacity-high" />
                    </div>
                    <span className="grid-decision-timeline-legend-label">Grid Fit</span>
                </div>
                <div className="grid-decision-timeline-legend-item">
                    <Info size={14} />
                    <span className="grid-decision-timeline-legend-label">Hover for details</span>
                </div>
            </div>

            {/* Quick scrollbar for fast navigation */}
            {duration > 0 && (
                <div className="grid-decision-timeline-quickscroll">
                    <div
                        ref={quickScrollRef}
                        className="grid-decision-timeline-quickscroll-track"
                        onClick={handleQuickScrollClick}
                        onMouseDown={handleQuickScrollDragStart}
                    >
                        {/* Grid decision markers (sampled for performance) */}
                        {gridDecisions
                            .filter((_, idx) => idx % Math.max(1, Math.floor(gridDecisions.length / 50)) === 0)
                            .map((decision, index) => {
                                const timestamp = beatTimestamps[decision.beatIndex];
                                if (timestamp === undefined) return null;
                                const position = timestamp / duration;
                                return (
                                    <div
                                        key={`quickscroll-${index}`}
                                        className="grid-decision-timeline-quickscroll-marker"
                                        style={{
                                            left: `${position * 100}%`,
                                            backgroundColor: GRID_COLORS[decision.selectedGrid],
                                        }}
                                    />
                                );
                            })}

                        {/* Viewport indicator */}
                        <div
                            className="grid-decision-timeline-quickscroll-viewport"
                            style={{
                                left: `${Math.max(0, ((smoothTime - pastWindow) / duration) * 100)}%`,
                                width: `${Math.min(100, (totalWindow / duration) * 100)}%`,
                            }}
                        />

                        {/* Current position indicator */}
                        <div
                            className="grid-decision-timeline-quickscroll-position"
                            style={{ left: `${(smoothTime / duration) * 100}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default GridDecisionTimeline;
