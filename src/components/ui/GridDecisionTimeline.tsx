/**
 * GridDecisionTimeline Component
 *
 * A horizontal timeline visualization showing per-beat grid choices.
 * Features:
 * - Color-coded markers: Blue for straight_16th, Purple for triplet_8th
 * - Opacity based on confidence
 * - Hover shows confidence score and offset values
 * - Sync with audio playback (currentTime prop)
 * - Drag-to-scrub timeline
 * - Show playhead position synced with audio
 *
 * Part of Phase 6: Quantization Visualization (Task 6.2)
 */

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Info } from 'lucide-react';
import './GridDecisionTimeline.css';
import type { GridDecision, GridType } from '../../types/rhythmGeneration';

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
    currentTime = 0,
    duration = 0,
    isPlaying = false,
    onSeek,
    anticipationWindow = 2.0,
    pastWindow = 4.0,
    className,
}: GridDecisionTimelineProps) {
    const trackRef = useRef<HTMLDivElement>(null);

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
    // Grid Decision Positioning
    // ========================================

    /**
     * Calculate grid decision position on the timeline.
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
     * Get visible grid decisions within the window
     */
    const getVisibleDecisions = useCallback((): Array<{
        decision: GridDecision;
        timestamp: number;
        position: number;
        isPast: boolean;
    }> => {
        const minTime = smoothTime - pastWindow;
        const maxTime = smoothTime + anticipationWindow;

        return gridDecisions
            .map((decision) => {
                const timestamp = beatTimestamps[decision.beatIndex];
                if (timestamp === undefined) return null;
                const position = calculatePosition(timestamp);
                const isPast = timestamp < smoothTime - 0.05;
                return { decision, timestamp, position, isPast };
            })
            .filter((item): item is NonNullable<typeof item> => item !== null)
            .filter((item) => {
                const timeMatch = item.timestamp >= minTime && item.timestamp <= maxTime;
                const positionMatch = item.position >= 0 && item.position <= 1;
                return timeMatch && positionMatch;
            });
    }, [gridDecisions, beatTimestamps, smoothTime, pastWindow, anticipationWindow, calculatePosition]);

    const visibleDecisions = getVisibleDecisions();

    // ========================================
    // Statistics for info bar
    // ========================================

    const stats = useMemo(() => {
        const straightCount = gridDecisions.filter(d => d.selectedGrid === 'straight_16th').length;
        const tripletCount = gridDecisions.filter(d => d.selectedGrid === 'triplet_8th').length;
        const avgConfidence = gridDecisions.length > 0
            ? gridDecisions.reduce((sum, d) => sum + d.confidence, 0) / gridDecisions.length
            : 0;

        return {
            total: gridDecisions.length,
            straightCount,
            tripletCount,
            avgConfidence,
        };
    }, [gridDecisions]);

    // ========================================
    // Event Handlers
    // ========================================

    /**
     * Handle hover on grid decision marker
     */
    const handleMouseEnter = useCallback(
        (decision: GridDecision, event: React.MouseEvent) => {
            setHoveredDecision(decision);
            const rect = (event.target as HTMLElement).getBoundingClientRect();
            setTooltipPosition({
                x: rect.left + rect.width / 2,
                y: rect.top,
            });
        },
        []
    );

    const handleMouseLeave = useCallback(() => {
        setHoveredDecision(null);
    }, []);

    return (
        <div className={`grid-decision-timeline ${className || ''}`}>
            {/* Timeline track */}
            <div
                ref={trackRef}
                className={`grid-decision-timeline-track ${onSeek ? 'grid-decision-timeline-track--draggable' : ''} ${isDragging ? 'grid-decision-timeline-track--dragging' : ''}`}
                onMouseDown={handleMouseDown}
                role={onSeek ? 'slider' : undefined}
                aria-label="Grid decision timeline"
                aria-valuemin={0}
                aria-valuemax={duration}
                aria-valuenow={smoothTime}
                tabIndex={onSeek ? 0 : undefined}
            >
                {/* Background gradient */}
                <div className="grid-decision-timeline-background" />

                {/* Past region indicator */}
                <div className="grid-decision-timeline-past-region" />

                {/* Future region indicator */}
                <div className="grid-decision-timeline-future-region" />

                {/* Grid decision markers */}
                {visibleDecisions.map(({ decision, position, isPast }) => (
                    <div
                        key={`grid-decision-${decision.beatIndex}`}
                        className={`grid-decision-timeline-marker ${
                            isPast ? 'grid-decision-timeline-marker--past' : ''
                        } ${
                            hoveredDecision?.beatIndex === decision.beatIndex
                                ? 'grid-decision-timeline-marker--hovered'
                                : ''
                        }`}
                        style={{
                            left: `${position * 100}%`,
                            '--grid-color': GRID_COLORS[decision.selectedGrid],
                            opacity: 0.3 + (decision.confidence * 0.7),
                        } as React.CSSProperties}
                        onMouseEnter={(e) => handleMouseEnter(decision, e)}
                        onMouseLeave={handleMouseLeave}
                        role="button"
                        tabIndex={0}
                        aria-label={`Beat ${decision.beatIndex + 1}: ${GRID_LABELS[decision.selectedGrid]}, confidence ${Math.round(decision.confidence * 100)}%`}
                    >
                        {/* Marker dot */}
                        <div className="grid-decision-timeline-marker-dot">
                            {/* Grid type indicator */}
                            <span className="grid-decision-timeline-marker-label">
                                {decision.selectedGrid === 'triplet_8th' ? 'T' : 'S'}
                            </span>
                        </div>
                    </div>
                ))}

                {/* "Now" line - fixed in center */}
                <div className="grid-decision-timeline-now-line">
                    <div className="grid-decision-timeline-now-line-inner" />
                    <span className="grid-decision-timeline-now-label">NOW</span>
                </div>
            </div>

            {/* Tooltip for hovered decision */}
            {hoveredDecision && (
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
                            <span className="grid-decision-tooltip-stat-label">Confidence</span>
                            <span className="grid-decision-tooltip-stat-value">
                                {(hoveredDecision.confidence * 100).toFixed(0)}%
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
                </div>
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
                        {(stats.avgConfidence * 100).toFixed(0)}%
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
                    <span className="grid-decision-timeline-legend-label">Confidence</span>
                </div>
                <div className="grid-decision-timeline-legend-item">
                    <Info size={14} />
                    <span className="grid-decision-timeline-legend-label">Hover for details</span>
                </div>
            </div>
        </div>
    );
}

export default GridDecisionTimeline;
