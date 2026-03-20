/**
 * TransientTimeline Component
 *
 * A horizontal scrolling transient visualization for rhythm generation.
 * Features:
 * - Transients displayed as colored dots (by band)
 * - Size based on intensity
 * - Sync with audio playback (currentTime prop)
 * - Zoomable/scrollable timeline
 * - Click to inspect individual transient details
 * - Show playhead position synced with audio
 *
 * Part of Phase 4: Transient Detection Visualization (Task 4.2)
 */

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import './TransientTimeline.css';
import type { TransientResult, Band } from '../../types/rhythmGeneration';

// ============================================================
// Types
// ============================================================

export interface TransientTimelineProps {
    /** Array of transient results to visualize */
    transients: TransientResult[];
    /** Current audio playback time in seconds */
    currentTime?: number;
    /** Total audio duration in seconds */
    duration?: number;
    /** Whether audio is currently playing */
    isPlaying?: boolean;
    /** Callback when user clicks on a transient */
    onTransientClick?: (transient: TransientResult, index: number) => void;
    /** Callback when user seeks to a time position */
    onSeek?: (time: number) => void;
    /** Index of the currently selected transient (for highlighting) */
    selectedTransientIndex?: number | null;
    /** Optional filter to show only specific band */
    filterBand?: Band | 'all';
    /** Optional intensity threshold filter */
    intensityThreshold?: number;
    /** Anticipation window in seconds for future transients (default: 2.0) */
    anticipationWindow?: number;
    /** Past window in seconds for showing transients that have passed (default: 4.0) */
    pastWindow?: number;
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
 * Detection method display names
 */
const DETECTION_METHOD_LABELS: Record<string, string> = {
    energy: 'Energy',
    spectral_flux: 'Spectral Flux',
    hfc: 'HFC',
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
 * TransientTimeline Component
 *
 * Renders a horizontal timeline where transients are displayed as colored dots.
 * The timeline syncs with audio playback and shows a playhead indicator.
 */
export function TransientTimeline({
    transients,
    currentTime = 0,
    duration = 0,
    isPlaying = false,
    onTransientClick,
    onSeek,
    selectedTransientIndex = null,
    filterBand = 'all',
    intensityThreshold = 0,
    anticipationWindow = 2.0,
    pastWindow = 4.0,
    className,
}: TransientTimelineProps) {
    const trackRef = useRef<HTMLDivElement>(null);

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
    // Transient Filtering and Positioning
    // ========================================

    /**
     * Filter transients based on band and intensity threshold
     */
    const filteredTransients = useMemo(() => {
        return transients.filter((t) => {
            if (t.intensity < intensityThreshold) return false;
            if (filterBand !== 'all' && t.band !== filterBand) return false;
            return true;
        });
    }, [transients, intensityThreshold, filterBand]);

    /**
     * Calculate transient position on the timeline.
     */
    const calculatePosition = useCallback(
        (timestamp: number): number => {
            const timeUntilTransient = timestamp - smoothTime;
            const position = 0.5 + (timeUntilTransient / anticipationWindow) * 0.5;
            return position;
        },
        [smoothTime, anticipationWindow]
    );

    /**
     * Get visible transients within the window
     */
    const getVisibleTransients = useCallback((): Array<{
        transient: TransientResult;
        index: number;
        position: number;
        isPast: boolean;
    }> => {
        const minTime = smoothTime - pastWindow;
        const maxTime = smoothTime + anticipationWindow;

        return filteredTransients
            .map((transient, index) => {
                const position = calculatePosition(transient.timestamp);
                const isPast = transient.timestamp < smoothTime - 0.05;
                return { transient, index, position, isPast };
            })
            .filter((item) => {
                const timeMatch = item.transient.timestamp >= minTime && item.transient.timestamp <= maxTime;
                const positionMatch = item.position >= 0 && item.position <= 1;
                return timeMatch && positionMatch;
            });
    }, [filteredTransients, smoothTime, pastWindow, anticipationWindow, calculatePosition]);

    const visibleTransients = getVisibleTransients();

    // ========================================
    // Event Handlers
    // ========================================

    /**
     * Handle click on transient
     */
    const handleTransientClick = useCallback(
        (transient: TransientResult, index: number, event: React.MouseEvent) => {
            event.stopPropagation();
            if (onTransientClick) {
                onTransientClick(transient, index);
            }
        },
        [onTransientClick]
    );

    /**
     * Handle keyboard interaction on transient
     */
    const handleTransientKeyDown = useCallback(
        (transient: TransientResult, index: number, event: React.KeyboardEvent) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                if (onTransientClick) {
                    onTransientClick(transient, index);
                }
            }
        },
        [onTransientClick]
    );

    return (
        <div className={`transient-timeline ${className || ''}`}>
            {/* Timeline track */}
            <div
                ref={trackRef}
                className={`transient-timeline-track ${onSeek ? 'transient-timeline-track--draggable' : ''} ${isDragging ? 'transient-timeline-track--dragging' : ''}`}
                onMouseDown={handleMouseDown}
                role={onSeek ? 'slider' : undefined}
                aria-label="Transient timeline"
                aria-valuemin={0}
                aria-valuemax={duration}
                aria-valuenow={smoothTime}
                tabIndex={onSeek ? 0 : undefined}
            >
                {/* Background gradient */}
                <div className="transient-timeline-background" />

                {/* Past region indicator */}
                <div className="transient-timeline-past-region" />

                {/* Future region indicator */}
                <div className="transient-timeline-future-region" />

                {/* Transient markers */}
                {visibleTransients.map(({ transient, index, position, isPast }) => (
                    <div
                        key={`transient-${transient.timestamp.toFixed(3)}-${transient.band}-${index}`}
                        className={`transient-timeline-marker ${
                            isPast ? 'transient-timeline-marker--past' : ''
                        } ${
                            selectedTransientIndex !== null && transients.indexOf(transient) === selectedTransientIndex
                                ? 'transient-timeline-marker--selected'
                                : ''
                        }`}
                        style={{
                            left: `${position * 100}%`,
                            '--band-color': BAND_COLORS[transient.band],
                        } as React.CSSProperties}
                        onClick={(e) => handleTransientClick(transient, index, e)}
                        onKeyDown={(e) => handleTransientKeyDown(transient, index, e)}
                        role="button"
                        tabIndex={0}
                        aria-label={`Transient at ${formatTime(transient.timestamp)}, ${transient.band} band, intensity ${Math.round(transient.intensity * 100)}%`}
                        title={`${formatTime(transient.timestamp)} | ${transient.band.toUpperCase()} | ${(transient.intensity * 100).toFixed(0)}% | ${DETECTION_METHOD_LABELS[transient.detectionMethod] || transient.detectionMethod}`}
                    >
                        {/* Transient dot */}
                        <div
                            className="transient-timeline-marker-dot"
                            style={{
                                width: `${8 + transient.intensity * 12}px`,
                                height: `${8 + transient.intensity * 12}px`,
                                backgroundColor: BAND_COLORS[transient.band],
                            }}
                        />
                    </div>
                ))}

                {/* "Now" line - fixed in center */}
                <div className="transient-timeline-now-line">
                    <div className="transient-timeline-now-line-inner" />
                    <span className="transient-timeline-now-label">NOW</span>
                </div>
            </div>

            {/* Timeline info bar */}
            <div className="transient-timeline-info">
                <div className="transient-timeline-info-item">
                    <span className="transient-timeline-info-label">Visible</span>
                    <span className="transient-timeline-info-value">{visibleTransients.length}</span>
                </div>
                <div className="transient-timeline-info-item">
                    <span className="transient-timeline-info-label">Total</span>
                    <span className="transient-timeline-info-value">{transients.length}</span>
                </div>
                <div className="transient-timeline-info-item">
                    <span className="transient-timeline-info-label">Time</span>
                    <span className="transient-timeline-info-value">{formatTime(smoothTime)}</span>
                </div>
                <div className="transient-timeline-info-item">
                    <span className="transient-timeline-info-label">Window</span>
                    <span className="transient-timeline-info-value">{pastWindow.toFixed(1)}s / {anticipationWindow.toFixed(1)}s</span>
                </div>
            </div>

            {/* Legend */}
            <div className="transient-timeline-legend">
                {(Object.keys(BAND_COLORS) as Band[]).map((band) => (
                    <div key={band} className="transient-timeline-legend-item">
                        <div
                            className="transient-timeline-legend-marker"
                            style={{ backgroundColor: BAND_COLORS[band] }}
                        />
                        <span className="transient-timeline-legend-label">
                            {band.charAt(0).toUpperCase() + band.slice(1)}
                        </span>
                    </div>
                ))}
                <div className="transient-timeline-legend-item">
                    <div className="transient-timeline-legend-size">
                        <div className="transient-timeline-legend-size-small" />
                        <div className="transient-timeline-legend-size-large" />
                    </div>
                    <span className="transient-timeline-legend-label">Intensity</span>
                </div>
            </div>
        </div>
    );
}

export default TransientTimeline;
