/**
 * MultiBandVisualization Component
 *
 * Displays three stacked timelines for Low/Mid/High frequency bands.
 * Features:
 * - Three stacked timelines (Low/Mid/High)
 * - Band label with frequency range
 * - Detection method indicator
 * - Transients for each band only
 * - Vertical alignment so transients line up by time
 * - Sync with audio playback
 * - Drag-to-scrub functionality
 * - Quick scroll for fast navigation
 *
 * Part of Phase 5: Multi-Band Visualization (Task 5.1)
 */

import { useRef, useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Layers } from 'lucide-react';
import './MultiBandVisualization.css';
import { ZoomControls } from '../../ZoomControls';
import type { GeneratedRhythm, TransientResult, Band } from '../../../../types/rhythmGeneration';
import { useAudioPlayerStore } from '../../../../store/audioPlayerStore';

// ============================================================
// Types
// ============================================================

export interface MultiBandVisualizationProps {
    /** The generated rhythm containing transient analysis */
    rhythm: GeneratedRhythm;
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
    /** Intensity threshold filter (0-1) */
    intensityThreshold?: number;
    /** Anticipation window in seconds for future transients */
    anticipationWindow?: number;
    /** Past window in seconds for showing transients that have passed */
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
 * Frequency range labels for each band
 */
const BAND_RANGES: Record<Band, string> = {
    low: '20-500 Hz',
    mid: '500-2000 Hz',
    high: '2000-20000 Hz',
};

/**
 * Detection method display names
 */
const DETECTION_METHOD_LABELS: Record<string, string> = {
    energy: 'Energy',
    spectral_flux: 'Spectral Flux',
    hfc: 'HFC',
};

/** Pixels of movement before treating as drag (vs click) */
const DRAG_THRESHOLD = 5;

// ============================================================
// Memoized Marker Component for Performance
// ============================================================

interface BandMarkerProps {
    transient: TransientResult;
    index: number;
    position: number;
    isPast: boolean;
    color: string;
    onClick: (transient: TransientResult, index: number, event: React.MouseEvent) => void;
}

const BandMarker = memo(function BandMarker({
    transient,
    index,
    position,
    isPast,
    color,
    onClick,
}: BandMarkerProps) {
    // Prevent mousedown from bubbling to parent track to avoid triggering seek
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
    }, []);

    return (
        <div
            className={`multi-band-marker ${isPast ? 'multi-band-marker--past' : ''}`}
            style={{ left: `${position * 100}%` }}
            onClick={(e) => onClick(transient, index, e)}
            onMouseDown={handleMouseDown}
            title={`${transient.timestamp.toFixed(3)}s | ${(transient.intensity * 100).toFixed(0)}%`}
        >
            <div
                className="multi-band-marker-dot"
                style={{
                    width: `${6 + transient.intensity * 10}px`,
                    height: `${6 + transient.intensity * 10}px`,
                    backgroundColor: color,
                }}
            />
        </div>
    );
});

// ============================================================
// Sub-components
// ============================================================

/**
 * Single band timeline component
 */
interface BandTimelineProps {
    band: Band;
    transients: TransientResult[];
    color: string;
    frequencyRange: string;
    duration: number;
    onTransientClick?: (transient: TransientResult, index: number) => void;
    intensityThreshold: number;
    anticipationWindow: number;
    pastWindow: number;
}

function BandTimeline({
    band,
    transients,
    color,
    frequencyRange,
    duration,
    onTransientClick,
    intensityThreshold,
    anticipationWindow,
    pastWindow,
}: BandTimelineProps) {
    const trackRef = useRef<HTMLDivElement>(null);
    const quickScrollRef = useRef<HTMLDivElement>(null);

    // Direct store access for responsive seeking
    const seek = useAudioPlayerStore((state) => state.seek);
    const storeCurrentTime = useAudioPlayerStore((state) => state.currentTime);
    const playbackState = useAudioPlayerStore((state) => state.playbackState);
    const isPlaying = playbackState === 'playing';

    // ========================================
    // Smooth Animation with requestAnimationFrame
    // ========================================

    const animationFrameRef = useRef<number | null>(null);
    const [smoothTime, setSmoothTime] = useState(storeCurrentTime);
    const lastAudioTimeRef = useRef<{ time: number; timestamp: number }>({
        time: storeCurrentTime,
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
            time: storeCurrentTime,
            timestamp: performance.now(),
        };
    }, [storeCurrentTime]);

    // Track previous isPlaying state to detect transitions
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

    /**
     * Animation loop for smooth scrolling
     */
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

    /**
     * Handle seek events
     */
    useEffect(() => {
        if (!isPlaying) {
            setSmoothTime(storeCurrentTime);
        }
    }, [storeCurrentTime, isPlaying]);

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
    // Transient Filtering and Positioning
    // ========================================

    // Filter transients by intensity
    const filteredTransients = useMemo(() => {
        return transients.filter((t) => t.intensity >= intensityThreshold);
    }, [transients, intensityThreshold]);

    // Calculate statistics
    const stats = useMemo(() => {
        const count = filteredTransients.length;
        const avgIntensity = count > 0
            ? filteredTransients.reduce((sum, t) => sum + t.intensity, 0) / count
            : 0;

        const methodCounts = filteredTransients.reduce((acc, t) => {
            acc[t.detectionMethod] = (acc[t.detectionMethod] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const primaryMethod = Object.entries(methodCounts)
            .sort((a, b) => b[1] - a[1])[0];

        return { count, avgIntensity, primaryMethod };
    }, [filteredTransients]);

    // Calculate time window for visible transients
    const minTime = smoothTime - pastWindow;
    const maxTime = smoothTime + anticipationWindow;

    // Get visible transients
    const visibleTransients = useMemo(() => {
        return filteredTransients
            .map((transient, index) => {
                const timeUntilTransient = transient.timestamp - smoothTime;
                const position = 0.5 + (timeUntilTransient / anticipationWindow) * 0.5;
                return {
                    transient,
                    index,
                    position,
                    isPast: transient.timestamp < smoothTime - 0.05,
                };
            })
            .filter((item) => {
                const timeMatch = item.transient.timestamp >= minTime && item.transient.timestamp <= maxTime;
                const positionMatch = item.position >= 0 && item.position <= 1;
                return timeMatch && positionMatch;
            });
    }, [filteredTransients, smoothTime, minTime, maxTime, anticipationWindow]);

    // Handle click on transient
    const handleTransientClick = useCallback((transient: TransientResult, index: number, event: React.MouseEvent) => {
        event.stopPropagation();
        if (onTransientClick) {
            onTransientClick(transient, index);
        }
    }, [onTransientClick]);

    return (
        <div className="multi-band-timeline" data-band={band}>
            {/* Band header */}
            <div className="multi-band-timeline-header">
                <div className="multi-band-timeline-label" style={{ color }}>
                    {band.charAt(0).toUpperCase() + band.slice(1)}
                </div>
                <div className="multi-band-timeline-range">{frequencyRange}</div>
                <div className="multi-band-timeline-stats">
                    <span className="multi-band-timeline-count">{stats.count}</span>
                    <span className="multi-band-timeline-divider">|</span>
                    <span className="multi-band-timeline-method">
                        {stats.primaryMethod ? DETECTION_METHOD_LABELS[stats.primaryMethod[0]] : '-'}
                    </span>
                </div>
            </div>

            {/* Timeline track */}
            <div
                ref={trackRef}
                className={`multi-band-timeline-track multi-band-timeline-track--draggable ${isDragging ? 'multi-band-timeline-track--dragging' : ''}`}
                onMouseDown={handleMouseDown}
                role="slider"
                tabIndex={0}
                aria-label={`${band} band timeline`}
                aria-valuemin={0}
                aria-valuemax={duration}
                aria-valuenow={smoothTime}
            >
                {/* Background */}
                <div className="multi-band-timeline-background" style={{
                    background: `linear-gradient(90deg,
                        hsl(var(--surface-3)) 0%,
                        hsl(var(--surface-2)) 30%,
                        hsl(var(--surface-2)) 70%,
                        hsl(var(--surface-3)) 100%
                    )`
                }} />

                {/* Band color accent line */}
                <div className="multi-band-timeline-accent" style={{ backgroundColor: color }} />

                {/* Transient markers */}
                {visibleTransients.map(({ transient, index, position, isPast }) => (
                    <BandMarker
                        key={`transient-${transient.timestamp.toFixed(3)}-${index}`}
                        transient={transient}
                        index={index}
                        position={position}
                        isPast={isPast}
                        color={color}
                        onClick={handleTransientClick}
                    />
                ))}

                {/* Now line (playhead) */}
                <div className="multi-band-now-line">
                    <div className="multi-band-now-line-inner" style={{ backgroundColor: color }} />
                </div>
            </div>

            {/* Quick scrollbar for fast navigation */}
            {duration > 0 && (
                <div className="multi-band-quickscroll">
                    <div
                        ref={quickScrollRef}
                        className="multi-band-quickscroll-track"
                        onClick={handleQuickScrollClick}
                        onMouseDown={handleQuickScrollDragStart}
                    >
                        {/* Transient density markers (sampled for performance) */}
                        {filteredTransients
                            .filter((_, idx) => idx % Math.max(1, Math.floor(filteredTransients.length / 50)) === 0)
                            .map((transient, index) => {
                                const position = transient.timestamp / duration;
                                return (
                                    <div
                                        key={`quickscroll-${band}-${index}`}
                                        className="multi-band-quickscroll-marker"
                                        style={{
                                            left: `${position * 100}%`,
                                            backgroundColor: color,
                                        }}
                                    />
                                );
                            })}

                        {/* Viewport indicator */}
                        <div
                            className="multi-band-quickscroll-viewport"
                            style={{
                                left: `${Math.max(0, ((smoothTime - pastWindow) / duration) * 100)}%`,
                                width: `${Math.min(100, (totalWindow / duration) * 100)}%`,
                            }}
                        />

                        {/* Current position indicator */}
                        <div
                            className="multi-band-quickscroll-position"
                            style={{ left: `${(smoothTime / duration) * 100}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================
// Main Component
// ============================================================

/**
 * MultiBandVisualization
 *
 * Displays three stacked timelines for frequency band analysis.
 * Each timeline shows transients for that band only, vertically aligned.
 */
export function MultiBandVisualization({
    rhythm,
    currentTime: _currentTime,
    duration: propDuration,
    isPlaying: _isPlaying,
    onTransientClick,
    onSeek: _onSeek,
    intensityThreshold = 0,
    anticipationWindow: propAnticipationWindow,
    pastWindow: propPastWindow,
    className,
}: MultiBandVisualizationProps) {
    // Get transient analysis from the rhythm
    const transientAnalysis = rhythm.analysis.transientAnalysis;
    const allTransients = transientAnalysis.transients;

    // Get duration from metadata or estimate from last transient
    const duration = propDuration ?? rhythm.metadata.duration > 0
        ? rhythm.metadata.duration
        : Math.max(...allTransients.map(t => t.timestamp), 0) + 1;

    // Zoom state - controls the visible time window
    const [zoomLevel, setZoomLevel] = useState(1);
    // Base windows at zoom level 1
    const baseAnticipationWindow = 2.0;
    const basePastWindow = 4.0;
    // Calculate windows based on zoom (higher zoom = smaller windows = more detail)
    const anticipationWindow = propAnticipationWindow ?? baseAnticipationWindow / zoomLevel;
    const pastWindow = propPastWindow ?? basePastWindow / zoomLevel;

    // Group transients by band
    const transientsByBand = useMemo(() => {
        const groups: Record<Band, TransientResult[]> = {
            low: [],
            mid: [],
            high: [],
        };
        allTransients.forEach((t) => {
            groups[t.band].push(t);
        });
        return groups;
    }, [allTransients]);

    // Get bands in order (high to low for visual stacking)
    const bands: Band[] = ['low', 'mid', 'high'];

    // Calculate total transients per band for summary
    const bandCounts = useMemo(() => {
        return {
            low: transientsByBand.low.length,
            mid: transientsByBand.mid.length,
            high: transientsByBand.high.length,
        };
    }, [transientsByBand]);

    const totalTransients = bandCounts.low + bandCounts.mid + bandCounts.high;

    return (
        <div className={`multi-band-visualization ${className || ''}`}>
            {/* Header */}
            <div className="multi-band-header">
                <div className="multi-band-title">
                    <Layers size={18} />
                    <span>Multi-Band Analysis</span>
                </div>
                <div className="multi-band-summary">
                    <span className="multi-band-summary-total">{totalTransients}</span>
                    <span className="multi-band-summary-label">total transients</span>
                </div>
                {/* Zoom controls */}
                <ZoomControls
                    zoomLevel={zoomLevel}
                    onZoomChange={setZoomLevel}
                    minZoom={0.5}
                    maxZoom={4}
                    size="sm"
                />
            </div>

            {/* Stacked timelines */}
            <div className="multi-band-timelines">
                {bands.map((band) => (
                    <BandTimeline
                        key={band}
                        band={band}
                        transients={transientsByBand[band]}
                        color={BAND_COLORS[band]}
                        frequencyRange={BAND_RANGES[band]}
                        duration={duration}
                        onTransientClick={onTransientClick}
                        intensityThreshold={intensityThreshold}
                        anticipationWindow={anticipationWindow}
                        pastWindow={pastWindow}
                    />
                ))}
            </div>

            {/* Legend */}
            <div className="multi-band-legend">
                {bands.map((band) => (
                    <div key={band} className="multi-band-legend-item">
                        <div
                            className="multi-band-legend-marker"
                            style={{ backgroundColor: BAND_COLORS[band] }}
                        />
                        <span className="multi-band-legend-label">
                            {band.charAt(0).toUpperCase() + band.slice(1)} ({BAND_RANGES[band]})
                        </span>
                        <span className="multi-band-legend-count">
                            {bandCounts[band]}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default MultiBandVisualization;
