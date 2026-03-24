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

import { useRef, useState, useEffect, useCallback, useMemo, memo } from 'react';
import './TransientTimeline.css';
import type { TransientResult, Band } from '../../types/rhythmGeneration';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';
import { usePlaylistStore } from '../../store/playlistStore';

// ============================================================
// Constants
// ============================================================

/** Pixels of movement before treating as drag (vs click) */
const DRAG_THRESHOLD = 5;

// ============================================================
// Binary Search Utilities for O(log n) filtering
// ============================================================

/**
 * Find the index of the first transient at or after the given timestamp.
 * Assumes transients array is sorted by timestamp.
 * Returns 0 if all transients are after the timestamp.
 */
function findFirstIndexAfter(
    transients: TransientResult[],
    timestamp: number
): number {
    let left = 0;
    let right = transients.length;

    while (left < right) {
        const mid = Math.floor((left + right) / 2);
        if (transients[mid].timestamp < timestamp) {
            left = mid + 1;
        } else {
            right = mid;
        }
    }
    return left;
}

/**
 * Find the index of the last transient at or before the given timestamp.
 * Assumes transients array is sorted by timestamp.
 * Returns transients.length - 1 if all transients are before the timestamp.
 */
function findLastIndexBefore(
    transients: TransientResult[],
    timestamp: number
): number {
    let left = -1;
    let right = transients.length - 1;

    while (left < right) {
        const mid = Math.floor((left + right + 1) / 2);
        if (transients[mid].timestamp > timestamp) {
            right = mid - 1;
        } else {
            left = mid;
        }
    }
    return left;
}

// ============================================================
// Types
// ============================================================

export interface TransientTimelineProps {
    /** Array of transient results to visualize */
    transients: TransientResult[];
    /** Total audio duration in seconds */
    duration?: number;
    /** Callback when user clicks on a transient */
    onTransientClick?: (transient: TransientResult, index: number) => void;
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

// ============================================================
// Memoized Marker Component for Performance
// ============================================================

interface TransientMarkerProps {
    transient: TransientResult;
    index: number;
    position: number;
    isPast: boolean;
    isSelected: boolean;
    onClick: (transient: TransientResult, index: number, event: React.MouseEvent) => void;
    onKeyDown: (transient: TransientResult, index: number, event: React.KeyboardEvent) => void;
}

/**
 * Memoized transient marker to prevent unnecessary re-renders.
 * Only re-renders when its specific props change.
 */
const TransientMarker = memo(function TransientMarker({
    transient,
    index,
    position,
    isPast,
    isSelected,
    onClick,
    onKeyDown,
}: TransientMarkerProps) {
    // Prevent mousedown from bubbling to parent track to avoid triggering seek
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
    }, []);

    return (
        <div
            className={`transient-timeline-marker ${
                isPast ? 'transient-timeline-marker--past' : ''
            } ${isSelected ? 'transient-timeline-marker--selected' : ''}`}
            style={{
                left: `${position * 100}%`,
                '--band-color': BAND_COLORS[transient.band],
            } as React.CSSProperties}
            onClick={(e) => onClick(transient, index, e)}
            onMouseDown={handleMouseDown}
            onKeyDown={(e) => onKeyDown(transient, index, e)}
            role="button"
            tabIndex={0}
            aria-label={`Transient at ${formatTime(transient.timestamp)}, ${transient.band} band, intensity ${Math.round(transient.intensity * 100)}%`}
            title={`${formatTime(transient.timestamp)} | ${transient.band.toUpperCase()} | ${(transient.intensity * 100).toFixed(0)}% | ${DETECTION_METHOD_LABELS[transient.detectionMethod] || transient.detectionMethod}`}
        >
            <div
                className="transient-timeline-marker-dot"
                style={{
                    width: `${8 + transient.intensity * 12}px`,
                    height: `${8 + transient.intensity * 12}px`,
                    backgroundColor: BAND_COLORS[transient.band],
                }}
            />
        </div>
    );
});

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
    duration = 0,
    onTransientClick,
    selectedTransientIndex = null,
    filterBand = 'all',
    intensityThreshold = 0,
    anticipationWindow = 2.0,
    pastWindow = 4.0,
    className,
}: TransientTimelineProps) {
    const trackRef = useRef<HTMLDivElement>(null);

    // Direct store access for responsive seeking (same pattern as SubdivisionPreviewTimeline)
    const storeSeek = useAudioPlayerStore((state) => state.seek);
    const currentAudioUrl = useAudioPlayerStore((state) => state.currentUrl);
    // Subscribe directly to currentTime and playbackState for immediate updates
    const currentTime = useAudioPlayerStore((state) => state.currentTime);
    const playbackState = useAudioPlayerStore((state) => state.playbackState);
    const isPlaying = playbackState === 'playing';

    // Get selected track from playlist store (for initiating playback when audio not loaded)
    const selectedTrack = usePlaylistStore((state) => state.selectedTrack);

    // Smart seek wrapper: loads audio first if not loaded
    const seek = useCallback((time: number) => {
        storeSeek(time, currentAudioUrl || selectedTrack?.audio_url);
    }, [storeSeek, currentAudioUrl, selectedTrack?.audio_url]);

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

    // CRITICAL: Use a ref to track smoothTime for stable callback references.
    // This prevents handleMouseDown from being recreated every frame during animation,
    // which was causing the initial drag stutter.
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

        // CRITICAL: When playback STARTS (transitions from false to true),
        // reset the timestamp reference to prevent visual stutter.
        // Without this, the animation loop calculates elapsed time using
        // a stale timestamp from when the audio was last paused.
        const playbackJustStarted = isPlaying && !prevIsPlayingRef.current;
        if (playbackJustStarted) {
            lastAudioTimeRef.current = {
                time: currentTime,
                timestamp: performance.now(),
            };
            // Sync smoothTime to currentTime immediately for smooth start
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
    const quickScrollRef = useRef<HTMLDivElement>(null);

    // Total visible time window
    const totalWindow = pastWindow + anticipationWindow;

    const handleMouseDown = useCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
            if (!trackRef.current || duration === 0) return;

            event.preventDefault();
            setIsDragging(true);
            dragStartXRef.current = event.clientX;
            // Use ref value to get current smoothTime without causing callback recreation
            dragStartTimeRef.current = smoothTimeRef.current;
        },
        [duration]  // Removed smoothTime dependency - now uses ref for stable callback
    );

    const handleMouseMove = useCallback(
        (event: MouseEvent) => {
            if (!isDragging || !trackRef.current || duration === 0) return;

            const rect = trackRef.current.getBoundingClientRect();
            const trackWidth = rect.width;
            const deltaX = event.clientX - dragStartXRef.current;

            // If moved beyond threshold, treat as drag (scrub)
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

                // Calculate time from click position
                // Position 0 = (smoothTime - pastWindow), 1 = (smoothTime + anticipationWindow)
                const positionRatio = clickX / trackWidth;
                const timeFromPastStart = positionRatio * totalWindow;
                // Use ref value to get current smoothTime without causing callback recreation
                const newTime = Math.max(0, Math.min(duration, (smoothTimeRef.current - pastWindow) + timeFromPastStart));

                seek(newTime);
            }

            setIsDragging(false);
        },
        [isDragging, pastWindow, totalWindow, duration, seek]  // Removed smoothTime dependency
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

            // Immediately seek on mousedown
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
     * Get visible transients within the window using binary search for O(log n) performance.
     * Position calculation is inlined to avoid unnecessary function recreation.
     */
    const visibleTransients = useMemo(() => {
        if (filteredTransients.length === 0) return [];

        const minTime = smoothTime - pastWindow;
        const maxTime = smoothTime + anticipationWindow;

        // Binary search to find the range of visible transients
        const startIndex = findFirstIndexAfter(filteredTransients, minTime);
        const endIndex = findLastIndexBefore(filteredTransients, maxTime);

        // If no transients in range, return empty
        if (startIndex > endIndex || startIndex >= filteredTransients.length) {
            return [];
        }

        // Only process transients in the visible range
        const result: Array<{
            transient: TransientResult;
            index: number;
            position: number;
            isPast: boolean;
        }> = [];

        for (let i = startIndex; i <= endIndex; i++) {
            const transient = filteredTransients[i];

            // Inline position calculation (avoids function recreation)
            // NOW line is at 50% (center), with symmetric visible windows
            const timeUntilTransient = transient.timestamp - smoothTime;
            const position = 0.5 + (timeUntilTransient / anticipationWindow) * 0.5;

            // Skip if position is out of bounds
            if (position < 0 || position > 1) continue;

            const isPast = transient.timestamp < smoothTime - 0.05;
            result.push({ transient, index: i, position, isPast });
        }

        return result;
    }, [filteredTransients, smoothTime, pastWindow, anticipationWindow]);

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
                className={`transient-timeline-track transient-timeline-track--draggable ${isDragging ? 'transient-timeline-track--dragging' : ''}`}
                onMouseDown={handleMouseDown}
                role="slider"
                aria-label="Transient timeline"
                aria-valuemin={0}
                aria-valuemax={duration}
                aria-valuenow={smoothTime}
                tabIndex={0}
            >
                {/* Background gradient */}
                <div className="transient-timeline-background" />

                {/* Past region indicator */}
                <div className="transient-timeline-past-region" />

                {/* Future region indicator */}
                <div className="transient-timeline-future-region" />

                {/* Transient markers - using memoized component for performance */}
                {visibleTransients.map(({ transient, index, position, isPast }) => (
                    <TransientMarker
                        key={`transient-${transient.timestamp.toFixed(3)}-${transient.band}-${index}`}
                        transient={transient}
                        index={index}
                        position={position}
                        isPast={isPast}
                        isSelected={selectedTransientIndex === index}
                        onClick={handleTransientClick}
                        onKeyDown={handleTransientKeyDown}
                    />
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

            {/* Quick scrollbar for fast navigation */}
            {duration && duration > 0 && (
                <div className="transient-timeline-quickscroll">
                    <div
                        ref={quickScrollRef}
                        className="transient-timeline-quickscroll-track"
                        onClick={handleQuickScrollClick}
                        onMouseDown={handleQuickScrollDragStart}
                    >
                        {/* Transient density markers in quick scroll (sample every Nth for performance) */}
                    {filteredTransients
                        .filter((_, idx) => idx % Math.max(1, Math.floor(filteredTransients.length / 100)) === 0)
                        .map((transient, index) => {
                            const position = transient.timestamp / duration;
                            return (
                                <div
                                    key={`quickscroll-transient-${index}`}
                                    className="transient-timeline-quickscroll-marker"
                                    style={{
                                        left: `${position * 100}%`,
                                        backgroundColor: BAND_COLORS[transient.band],
                                    }}
                                />
                            );
                        })}

                        {/* Viewport indicator - shows current visible window */}
                        <div
                            className="transient-timeline-quickscroll-viewport"
                            style={{
                                left: `${Math.max(0, ((smoothTime - pastWindow) / duration) * 100)}%`,
                                width: `${Math.min(100, (totalWindow / duration) * 100)}%`,
                            }}
                        />

                        {/* Current position indicator */}
                        <div
                            className="transient-timeline-quickscroll-position"
                            style={{ left: `${(smoothTime / duration) * 100}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default TransientTimeline;
