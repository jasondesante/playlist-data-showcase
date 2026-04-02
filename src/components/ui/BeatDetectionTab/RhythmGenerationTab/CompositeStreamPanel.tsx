/**
 * CompositeStreamPanel Component
 *
 * Container for composite stream visualization in the rhythm generation feature.
 * Displays:
 * - Header with composite beat count
* - Summary statistics (beats per band, sections per band)
* - 3 Stacked band stream timelines (quantized beats)
* - Composite timeline with section boundaries and color-coded by sourceBand
* - Quick scroll bar for navigation
* - Zoom controls
*
 * Part of Phase 1: CompositeStreamPanel (Task 1.1)
 */

import { useRef, useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Combine, PieChart, Layers, Info } from 'lucide-react';
import './CompositeStreamPanel.css';
import { ZoomControls } from '../../ZoomControls';
import { useAudioPlayerStore } from '../../../../store/audioPlayerStore';
import { usePlaylistStore } from '../../../../store/playlistStore';
import { useUnifiedBeatMap } from '../../../../store/beatDetectionStore';
import type {
    GeneratedRhythm,
    GeneratedBeat,
    Band,
    HighlightedRegion,
    CompositeBeat,
    CompositeSection,
    StreamScorerConfig,
    BalanceStats,
} from '../../../../types/rhythmGeneration';

// ============================================================
// Types
// ============================================================

export interface CompositeStreamPanelProps {
    /** The generated rhythm containing composite stream data */
    rhythm: GeneratedRhythm;
    /** Current audio playback time in seconds (for timeline sync) */
    currentTime?: number;
    /** Total audio duration in seconds */
    duration?: number;
    /** Whether audio is currently playing */
    isPlaying?: boolean;
    /** Callback when user seeks to a time position */
    onSeek?: (time: number) => void;
    /** Highlighted regions to show on timelines (for phrase occurrences) */
    highlightedRegions?: HighlightedRegion[];
    /** Stream scoring configuration (factor weights and band bias) that was used during generation */
    scoringConfig?: Partial<StreamScorerConfig>;
    /** Additional CSS class names */
    className?: string;
}

/**
 * Band color scheme (consistent across components)
 */
const BAND_COLORS: Record<Band, string> = {
    low: '#3b82f6',    // Blue
    mid: '#22c55e',    // Green
    high: '#f97316',   // Orange
};

/** Band list for iteration */
const BANDS: Band[] = ['low', 'mid', 'high'];

// ============================================================
// Sub-components
// ============================================================

/**
 * Summary stat card component
 */
interface StatCardProps {
    label: string;
    value: string | number;
    icon?: React.ReactNode;
    color?: string;
}

function StatCard({ label, value, icon, color }: StatCardProps) {
    return (
        <div className="composite-stat-card">
            {icon && <div className="composite-stat-icon">{icon}</div>}
            <div className="composite-stat-content">
                <span className="composite-stat-label">{label}</span>
                <span className="composite-stat-value" style={{ color }}>{value}</span>
            </div>
        </div>
    );
}

/**
 * Band beats distribution bar component
 */
interface BandDistributionBarProps {
    low: number;
    mid: number;
    high: number;
}

function BandDistributionBar({ low, mid, high }: BandDistributionBarProps) {
    const total = low + mid + high;
    const percentages = {
        low: total > 0 ? (low / total) * 100 : 0,
        mid: total > 0 ? (mid / total) * 100 : 0,
        high: total > 0 ? (high / total) * 100 : 0,
    };

    return (
        <div className="composite-distribution-bar">
            <div className="composite-distribution-bar-track">
                <div
                    className="composite-distribution-segment composite-distribution-segment--low"
                    style={{ width: `${percentages.low}%` }}
                    title={`Low: ${low} (${percentages.low.toFixed(1)}%)`}
                />
                <div
                    className="composite-distribution-segment composite-distribution-segment--mid"
                    style={{ width: `${percentages.mid}%` }}
                    title={`Mid: ${mid} (${percentages.mid.toFixed(1)}%)`}
                />
                <div
                    className="composite-distribution-segment composite-distribution-segment--high"
                    style={{ width: `${percentages.high}%` }}
                    title={`High: ${high} (${percentages.high.toFixed(1)}%)`}
                />
            </div>
            <div className="composite-distribution-legend">
                {BANDS.map((band, index) => (
                    <div key={band} className="composite-distribution-legend-item">
                        <span
                            className="composite-distribution-marker"
                            style={{ backgroundColor: BAND_COLORS[band] }}
                        />
                        <span className="composite-distribution-label">
                            {band.charAt(0).toUpperCase() + band.slice(1)}
                        </span>
                        <span className="composite-distribution-count">
                            {[low, mid, high][index]}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ============================================================
// BandStreamTimeline Inline Component (Task 1.2)
// ============================================================

/** Pixels of movement before treating as drag (vs click) */
const DRAG_THRESHOLD = 5;

/**
 * Props for BandStreamTimeline
 */
interface BandStreamTimelineProps {
    /** Band identifier */
    band: Band;
    /** Quantized beats for this band */
    beats: GeneratedBeat[];
    /** Band color */
    color: string;
    /** Total audio duration in seconds */
    duration: number;
    /** Current zoom level */
    zoomLevel: number;
}

/**
 * Memoized beat marker component for performance
 */
interface BandBeatMarkerProps {
    beat: GeneratedBeat;
    index: number;
    position: number;
    isPast: boolean;
    color: string;
}

const BandBeatMarker = memo(function BandBeatMarker({
    beat,
    position,
    isPast,
    color,
}: Omit<BandBeatMarkerProps, 'index'>) {
    // Prevent mousedown from bubbling to parent track
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
    }, []);

    return (
        <div
            className={`composite-band-marker ${isPast ? 'composite-band-marker--past' : ''}`}
            style={{ left: `${position * 100}%` }}
            onMouseDown={handleMouseDown}
            title={`${beat.timestamp.toFixed(3)}s | ${(beat.intensity * 100).toFixed(0)}% | ${beat.gridType}`}
        >
            <div
                className="composite-band-marker-dot"
                style={{
                    width: `${6 + beat.intensity * 8}px`,
                    height: `${6 + beat.intensity * 8}px`,
                    backgroundColor: color,
                }}
            />
        </div>
    );
});

/**
 * BandStreamTimeline
 *
 * A single band timeline showing quantized beats with:
 * - Drag-to-scrub functionality
 * - Quick scroll navigation
 * - Audio sync with playhead
 * - Color-coded by band
 */
function BandStreamTimeline({
    band,
    beats,
    color,
    duration,
    zoomLevel,
}: BandStreamTimelineProps) {
    const trackRef = useRef<HTMLDivElement>(null);

    // CRITICAL: Get the actual detected beat map from the store
    // This is the unified beat map of quarter notes that was used to quantize the We use this for grid lines.
    const unifiedBeatMap = useUnifiedBeatMap();    const quickScrollRef = useRef<HTMLDivElement>(null);

    // Direct store access for responsive seeking
    const storeSeek = useAudioPlayerStore((state) => state.seek);
    const currentAudioUrl = useAudioPlayerStore((state) => state.currentUrl);
    const storeCurrentTime = useAudioPlayerStore((state) => state.currentTime);
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

    // Base windows at zoom level 1
    const baseAnticipationWindow = 2.0;
    const basePastWindow = 4.0;

    // Calculate windows based on zoom (higher zoom = smaller windows = more detail)
    const anticipationWindow = baseAnticipationWindow / zoomLevel;
    const pastWindow = basePastWindow / zoomLevel;
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

    // Calculate time window for visible beats
    const minTime = smoothTime - pastWindow;
    const maxTime = smoothTime + anticipationWindow;

    // Get visible beats
    const visibleBeats = useMemo(() => {
        return beats
            .map((beat, index) => {
                const timeUntilBeat = beat.timestamp - smoothTime;
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
    // Beat Grid Lines (from unified beat map)
    // ========================================

    /**
     * Calculate visible beat grid lines using the unified beat map
     * (same source as QuantizedBeatTimeline uses).
     */
    const visibleGridLines = useMemo(() => {
        if (!unifiedBeatMap || unifiedBeatMap.beats.length === 0) return [];

        const lines: Array<{
            timestamp: number;
            beatIndex: number;
            position: number;
            isDownbeat: boolean;
            measureNumber: number;
        }> = [];

        for (let i = 0; i < unifiedBeatMap.beats.length; i++) {
            const beat = unifiedBeatMap.beats[i];
            const timestamp = beat.timestamp;

            if (timestamp >= minTime && timestamp <= maxTime) {
                const timeUntilBeat = timestamp - smoothTime;
                const position = 0.5 + (timeUntilBeat / anticipationWindow) * 0.5;
                if (position >= 0 && position <= 1) {
                    lines.push({
                        timestamp,
                        beatIndex: i,
                        position,
                        isDownbeat: beat.isDownbeat ?? false,
                        measureNumber: beat.measureNumber ?? 0,
                    });
                }
            }
        }

        return lines;
    }, [smoothTime, minTime, maxTime, anticipationWindow, unifiedBeatMap]);

    /**
     * Calculate visible subdivision lines within each beat.
     * Uses the unified beat map (same source as QuantizedBeatTimeline).
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
                    const timeUntilSub = timestamp - smoothTime;
                    const position = 0.5 + (timeUntilSub / anticipationWindow) * 0.5;

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
                    const timeUntilSub = timestamp - smoothTime;
                    const position = 0.5 + (timeUntilSub / anticipationWindow) * 0.5;

                    if (position >= 0 && position <= 1) {
                        lines.push({ timestamp, beatIndex: lastBeatIdx, subdivision: sub, position });
                    }
                }
            }
        }

        return lines;
    }, [smoothTime, minTime, maxTime, anticipationWindow, unifiedBeatMap]);

    // Beat count for header
    const beatCount = beats.length;

    return (
        <div className="composite-band-timeline" data-band={band}>
            {/* Band header */}
            <div className="composite-band-timeline-header">
                <span
                    className="composite-band-timeline-label"
                    style={{ color }}
                >
                    {band.charAt(0).toUpperCase() + band.slice(1)} Band
                </span>
                <span className="composite-band-timeline-count">
                    {beatCount} beats
                </span>
            </div>

            {/* Timeline track */}
            <div
                ref={trackRef}
                className={`composite-band-timeline-track composite-band-timeline-track--draggable ${isDragging ? 'composite-band-timeline-track--dragging' : ''}`}
                onMouseDown={handleMouseDown}
                role="slider"
                tabIndex={0}
                aria-label={`${band} band timeline`}
                aria-valuemin={0}
                aria-valuemax={duration}
                aria-valuenow={smoothTime}
            >
                {/* Background */}
                <div className="composite-band-timeline-background" style={{
                    background: `linear-gradient(90deg,
                        hsl(var(--surface-3)) 0%,
                        hsl(var(--surface-2)) 30%,
                        hsl(var(--surface-2)) 70%,
                        hsl(var(--surface-3)) 100%
                    )`
                }} />

                {/* Band color accent line */}
                <div className="composite-band-timeline-accent" style={{ backgroundColor: color }} />

                {/* Beat grid lines (quarter notes from unified beat map) */}
                {visibleGridLines.map(({ beatIndex, position, isDownbeat, measureNumber }) => (
                    <div
                        key={`grid-line-${beatIndex}`}
                        className={`composite-band-grid-line ${isDownbeat ? 'composite-band-grid-line--measure' : ''}`}
                        style={{ left: `${position * 100}%` }}
                    >
                        {/* Measure number label on downbeats */}
                        {isDownbeat && (
                            <span className="composite-band-grid-label">
                                {measureNumber + 1}
                            </span>
                        )}
                    </div>
                ))}

                {/* Subdivision grid lines (16th notes - fainter than beat lines) */}
                {visibleSubdivisionLines.map(({ beatIndex, subdivision, position }) => (
                    <div
                        key={`subdivision-${beatIndex}-${subdivision}`}
                        className="composite-band-subdivision-line"
                        style={{ left: `${position * 100}%` }}
                    />
                ))}

                {/* Beat markers */}
                {visibleBeats.map(({ beat, index, position, isPast }) => (
                    <BandBeatMarker
                        key={`beat-${beat.timestamp.toFixed(3)}-${index}`}
                        beat={beat}
                        position={position}
                        isPast={isPast}
                        color={color}
                    />
                ))}

                {/* Now line (playhead) */}
                <div className="composite-band-now-line">
                    <div className="composite-band-now-line-inner" style={{ backgroundColor: color }} />
                </div>
            </div>

            {/* Quick scrollbar for fast navigation */}
            {duration > 0 && (
                <div className="composite-band-quickscroll">
                    <div
                        ref={quickScrollRef}
                        className="composite-band-quickscroll-track"
                        onClick={handleQuickScrollClick}
                        onMouseDown={handleQuickScrollDragStart}
                    >
                        {/* Beat density markers (sampled for performance) */}
                        {beats
                            .filter((_, idx) => idx % Math.max(1, Math.floor(beats.length / 50)) === 0)
                            .map((beat, index) => {
                                const position = beat.timestamp / duration;
                                return (
                                    <div
                                        key={`quickscroll-${band}-${index}`}
                                        className="composite-band-quickscroll-marker"
                                        style={{
                                            left: `${position * 100}%`,
                                            backgroundColor: color,
                                        }}
                                    />
                                );
                            })}

                        {/* Viewport indicator */}
                        <div
                            className="composite-band-quickscroll-viewport"
                            style={{
                                left: `${Math.max(0, ((smoothTime - pastWindow) / duration) * 100)}%`,
                                width: `${Math.min(100, (totalWindow / duration) * 100)}%`,
                            }}
                        />

                        {/* Current position indicator */}
                        <div
                            className="composite-band-quickscroll-position"
                            style={{ left: `${(smoothTime / duration) * 100}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================
// CompositeTimeline Inline Component (Task 1.3)
// ============================================================

/**
 * Props for CompositeTimeline
 */
interface CompositeTimelineProps {
    /** Composite beats with sourceBand property */
    beats: CompositeBeat[];
    /** Section boundaries with winning band info */
    sections: CompositeSection[];
    /** Total audio duration in seconds */
    duration: number;
    /** Current zoom level */
    zoomLevel: number;
}

/**
 * Memoized composite beat marker component for performance
 */
interface CompositeBeatMarkerProps {
    beat: CompositeBeat;
    position: number;
    isPast: boolean;
    color: string;
}

const BALANCER_ACTION_LABELS: Record<string, string> = {
    shifted_to_downbeat: 'Shifted to downbeat',
    empty_measure_fill: 'Filled empty measure',
    proximity_shift: 'Shifted for downbeat proximity',
};

function hasBalancerActivity(stats: BalanceStats): boolean {
    return stats.beatsAdded > 0 || stats.beatsShifted > 0;
}

const CompositeBeatMarker = memo(function CompositeBeatMarker({
    beat,
    position,
    isPast,
    color,
}: CompositeBeatMarkerProps) {
    // Prevent mousedown from bubbling to parent track
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
    }, []);

    const balancerClass = beat.balancerAction
        ? `composite-timeline-marker--balancer-${beat.balancerAction}`
        : '';

    const balancerLabel = beat.balancerAction
        ? ` | ${BALANCER_ACTION_LABELS[beat.balancerAction]}`
        : '';

    return (
        <div
            className={`composite-timeline-marker ${isPast ? 'composite-timeline-marker--past' : ''} ${balancerClass}`}
            style={{ left: `${position * 100}%` }}
            onMouseDown={handleMouseDown}
            title={`${beat.timestamp.toFixed(3)}s | ${(beat.intensity * 100).toFixed(0)}% | ${beat.sourceBand}${balancerLabel}`}
        >
            <div
                className="composite-timeline-marker-dot"
                style={{
                    width: `${6 + beat.intensity * 8}px`,
                    height: `${6 + beat.intensity * 8}px`,
                    backgroundColor: color,
                }}
            />
        </div>
    );
});

/**
 * Section boundary indicator component
 */
interface SectionBoundaryProps {
    section: CompositeSection;
    position: number;
    onHover: (section: CompositeSection | null) => void;
    isHovered: boolean;
}

const SectionBoundary = memo(function SectionBoundary({
    section,
    position,
    onHover,
    isHovered,
}: SectionBoundaryProps) {
    return (
        <div
            className={`composite-section-boundary ${isHovered ? 'composite-section-boundary--hovered' : ''}`}
            style={{ left: `${position * 100}%` }}
            onMouseEnter={() => onHover(section)}
            onMouseLeave={() => onHover(null)}
        >
            <div
                className="composite-section-boundary-line"
                style={{ backgroundColor: BAND_COLORS[section.sourceBand] }}
            />
        </div>
    );
});

/**
 * Section region overlay component (shows section as colored region)
 */
interface SectionRegionProps {
    section: CompositeSection;
    startPosition: number;
    endPosition: number;
    onHover: (section: CompositeSection | null) => void;
    isHovered: boolean;
}

const SectionRegion = memo(function SectionRegion({
    section,
    startPosition,
    endPosition,
    onHover,
    isHovered,
}: SectionRegionProps) {
    const width = endPosition - startPosition;
    return (
        <div
            className={`composite-section-region ${isHovered ? 'composite-section-region--hovered' : ''}`}
            style={{
                left: `${startPosition * 100}%`,
                width: `${width * 100}%`,
                backgroundColor: BAND_COLORS[section.sourceBand],
            }}
            onMouseEnter={() => onHover(section)}
            onMouseLeave={() => onHover(null)}
        />
    );
});

/**
 * Hover tooltip for section info
 */
interface SectionTooltipProps {
    section: CompositeSection;
    duration: number;
}

function SectionTooltip({ section }: SectionTooltipProps) {
    return (
        <div className="composite-section-tooltip">
            <div className="composite-section-tooltip-header">
                <span
                    className="composite-section-tooltip-band"
                    style={{ color: BAND_COLORS[section.sourceBand] }}
                >
                    {section.sourceBand.charAt(0).toUpperCase() + section.sourceBand.slice(1)} Band
                </span>
            </div>
            <div className="composite-section-tooltip-details">
                <div className="composite-section-tooltip-row">
                    <span className="composite-section-tooltip-label">Beats:</span>
                    <span className="composite-section-tooltip-value">
                        {section.beatRange.start} - {section.beatRange.end}
                    </span>
                </div>
                <div className="composite-section-tooltip-row">
                    <span className="composite-section-tooltip-label">Score:</span>
                    <span className="composite-section-tooltip-value">
                        {section.score.toFixed(2)}
                    </span>
                </div>
                <div className="composite-section-tooltip-row">
                    <span className="composite-section-tooltip-label">Margin:</span>
                    <span className="composite-section-tooltip-value">
                        {section.margin.toFixed(2)}
                    </span>
                </div>
            </div>
        </div>
    );
}

/**
 * CompositeTimeline
 *
 * Shows composite beats with:
 * - Color coding by sourceBand
 * - Section boundary indicators
 * - Hover tooltips showing section info
 * - Drag-to-scrub functionality
 * - Quick scroll navigation
 * - Audio sync with playhead
 */
function CompositeTimeline({
    beats,
    sections,
    duration,
    zoomLevel,
}: CompositeTimelineProps) {
    const trackRef = useRef<HTMLDivElement>(null);
    const quickScrollRef = useRef<HTMLDivElement>(null);

    // Direct store access for responsive seeking
    const storeSeek = useAudioPlayerStore((state) => state.seek);
    const currentAudioUrl = useAudioPlayerStore((state) => state.currentUrl);
    const storeCurrentTime = useAudioPlayerStore((state) => state.currentTime);
    const playbackState = useAudioPlayerStore((state) => state.playbackState);
    const isPlaying = playbackState === 'playing';

    // Get selected track from playlist store (for initiating playback when audio not loaded)
    const selectedTrack = usePlaylistStore((state) => state.selectedTrack);

    // CRITICAL: Get the actual detected beat map from the store
    // This is the unified beat map of quarter notes that was used to quantize
    // We MUST use this for the grid lines, just like QuantizedBeatTimeline does
    const unifiedBeatMap = useUnifiedBeatMap();

    // Smart seek wrapper: loads audio first if not loaded
    const seek = useCallback((time: number) => {
        storeSeek(time, currentAudioUrl || selectedTrack?.audio_url);
    }, [storeSeek, currentAudioUrl, selectedTrack?.audio_url]);

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

    // Section hover state
    const [hoveredSection, setHoveredSection] = useState<CompositeSection | null>(null);

    // Base windows at zoom level 1
    const baseAnticipationWindow = 2.0;
    const basePastWindow = 4.0;

    // Calculate windows based on zoom (higher zoom = smaller windows = more detail)
    const anticipationWindow = baseAnticipationWindow / zoomLevel;
    const pastWindow = basePastWindow / zoomLevel;
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

    // Calculate time window for visible beats
    const minTime = smoothTime - pastWindow;
    const maxTime = smoothTime + anticipationWindow;

    // Get visible beats
    const visibleBeats = useMemo(() => {
        return beats
            .map((beat, index) => {
                const timeUntilBeat = beat.timestamp - smoothTime;
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
    // Beat Grid Lines (from unified beat map)
    // ========================================

    /**
     * Calculate visible beat grid lines using the unified beat map
     * (same source as QuantizedBeatTimeline uses).
     */
    const visibleGridLines = useMemo(() => {
        if (!unifiedBeatMap || unifiedBeatMap.beats.length === 0) return [];

        const lines: Array<{
            timestamp: number;
            beatIndex: number;
            position: number;
            isDownbeat: boolean;
            measureNumber: number;
        }> = [];

        for (let i = 0; i < unifiedBeatMap.beats.length; i++) {
            const beat = unifiedBeatMap.beats[i];
            const timestamp = beat.timestamp;

            if (timestamp >= minTime && timestamp <= maxTime) {
                const timeUntilBeat = timestamp - smoothTime;
                const position = 0.5 + (timeUntilBeat / anticipationWindow) * 0.5;
                if (position >= 0 && position <= 1) {
                    lines.push({
                        timestamp,
                        beatIndex: i,
                        position,
                        isDownbeat: beat.isDownbeat ?? false,
                        measureNumber: beat.measureNumber ?? 0,
                    });
                }
            }
        }

        return lines;
    }, [smoothTime, minTime, maxTime, anticipationWindow, unifiedBeatMap]);

    /**
     * Calculate visible subdivision lines within each beat.
     * Uses the unified beat map (same source as QuantizedBeatTimeline).
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
                    const timeUntilSub = timestamp - smoothTime;
                    const position = 0.5 + (timeUntilSub / anticipationWindow) * 0.5;

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
                    const timeUntilSub = timestamp - smoothTime;
                    const position = 0.5 + (timeUntilSub / anticipationWindow) * 0.5;

                    if (position >= 0 && position <= 1) {
                        lines.push({ timestamp, beatIndex: lastBeatIdx, subdivision: sub, position });
                    }
                }
            }
        }

        return lines;
    }, [smoothTime, minTime, maxTime, anticipationWindow, unifiedBeatMap]);

    // ========================================
    // Section Processing
    // ========================================

    // Calculate section positions for visible window
    // We need to estimate timestamps from beat indices
    const sectionMarkers = useMemo(() => {
        if (beats.length === 0 || sections.length === 0) return { boundaries: [], regions: [] };

        // Estimate timestamp from beat index using average beat interval
        const avgBeatInterval = beats.length > 1
            ? (beats[beats.length - 1].timestamp - beats[0].timestamp) / (beats.length - 1)
            : 0.5;

        // Filter sections in visible range and calculate positions
        const visibleSections = sections
            .map((section) => {
                // Estimate timestamps from beat indices
                const startTimestamp = section.beatRange.start * avgBeatInterval;
                const endTimestamp = section.beatRange.end * avgBeatInterval;

                // Calculate position in visible window
                const timeUntilStart = startTimestamp - smoothTime;
                const startPosition = 0.5 + (timeUntilStart / anticipationWindow) * 0.5;

                const timeUntilEnd = endTimestamp - smoothTime;
                const endPosition = 0.5 + (timeUntilEnd / anticipationWindow) * 0.5;

                return {
                    section,
                    startTimestamp,
                    endTimestamp,
                    startPosition,
                    endPosition,
                };
            })
            .filter((item) => {
                // Include if any part is visible
                return item.endPosition >= -0.1 && item.startPosition <= 1.1;
            });

        // Extract boundaries (start of each section)
        const boundaries = visibleSections.map((item) => ({
            section: item.section,
            position: item.startPosition,
        }));

        // Create regions (colored spans for each section)
        const regions = visibleSections.map((item) => ({
            section: item.section,
            startPosition: Math.max(0, item.startPosition),
            endPosition: Math.min(1, item.endPosition),
        }));

        return { boundaries, regions };
    }, [sections, beats, smoothTime, anticipationWindow]);

    // Beat count for header
    const beatCount = beats.length;

    return (
        <div className="composite-timeline">
            {/* Timeline header */}
            <div className="composite-timeline-header">
                <span className="composite-timeline-label">
                    Composite
                </span>
                <span className="composite-timeline-count">
                    {beatCount} beats
                </span>
            </div>

            {/* Timeline track */}
            <div
                ref={trackRef}
                className={`composite-timeline-track composite-timeline-track--draggable ${isDragging ? 'composite-timeline-track--dragging' : ''}`}
                onMouseDown={handleMouseDown}
                role="slider"
                tabIndex={0}
                aria-label="Composite timeline"
                aria-valuemin={0}
                aria-valuemax={duration}
                aria-valuenow={smoothTime}
            >
                {/* Background */}
                <div className="composite-timeline-background" style={{
                    background: `linear-gradient(90deg,
                        hsl(var(--surface-3)) 0%,
                        hsl(var(--surface-2)) 30%,
                        hsl(var(--surface-2)) 70%,
                        hsl(var(--surface-3)) 100%
                    )`
                }} />

                {/* Beat grid lines */}
                {visibleGridLines.map(({ beatIndex, position, isDownbeat, measureNumber }) => (
                    <div
                        key={`grid-line-${beatIndex}`}
                        className={`composite-timeline-grid-line ${isDownbeat ? 'composite-timeline-grid-line--measure' : ''}`}
                        style={{ left: `${position * 100}%` }}
                    >
                        {/* Measure number label on downbeats */}
                        {isDownbeat && (
                            <span className="composite-timeline-grid-label">
                                {measureNumber + 1}
                            </span>
                        )}
                    </div>
                ))}

                {/* Subdivision grid lines (16th notes - fainter than beat lines) */}
                {visibleSubdivisionLines.map(({ beatIndex, subdivision, position }) => (
                    <div
                        key={`subdivision-${beatIndex}-${subdivision}`}
                        className="composite-timeline-subdivision-line"
                        style={{ left: `${position * 100}%` }}
                    />
                ))}

                {/* Section regions (colored backgrounds) */}
                {sectionMarkers.regions.map((region, index) => (
                    <SectionRegion
                        key={`region-${region.section.beatRange.start}-${index}`}
                        section={region.section}
                        startPosition={region.startPosition}
                        endPosition={region.endPosition}
                        onHover={setHoveredSection}
                        isHovered={hoveredSection === region.section}
                    />
                ))}

                {/* Section boundary lines */}
                {sectionMarkers.boundaries.map((boundary, index) => (
                    <SectionBoundary
                        key={`boundary-${boundary.section.beatRange.start}-${index}`}
                        section={boundary.section}
                        position={boundary.position}
                        onHover={setHoveredSection}
                        isHovered={hoveredSection === boundary.section}
                    />
                ))}

                {/* Beat markers */}
                {visibleBeats.map(({ beat, position, isPast }) => (
                    <CompositeBeatMarker
                        key={`composite-beat-${beat.timestamp.toFixed(3)}`}
                        beat={beat}
                        position={position}
                        isPast={isPast}
                        color={BAND_COLORS[beat.sourceBand]}
                    />
                ))}

                {/* Now line (playhead) */}
                <div className="composite-timeline-now-line">
                    <div className="composite-timeline-now-line-inner" />
                </div>

                {/* Section tooltip */}
                {hoveredSection && (
                    <SectionTooltip section={hoveredSection} duration={duration} />
                )}
            </div>

            {/* Quick scrollbar for fast navigation */}
            {duration > 0 && (
                <div className="composite-timeline-quickscroll">
                    <div
                        ref={quickScrollRef}
                        className="composite-timeline-quickscroll-track"
                        onClick={handleQuickScrollClick}
                        onMouseDown={handleQuickScrollDragStart}
                    >
                        {/* Beat density markers (sampled for performance) - color-coded by band */}
                        {beats
                            .filter((_, idx) => idx % Math.max(1, Math.floor(beats.length / 50)) === 0)
                            .map((beat, index) => {
                                const position = beat.timestamp / duration;
                                return (
                                    <div
                                        key={`quickscroll-composite-${index}`}
                                        className="composite-timeline-quickscroll-marker"
                                        style={{
                                            left: `${position * 100}%`,
                                            backgroundColor: BAND_COLORS[beat.sourceBand],
                                        }}
                                    />
                                );
                            })}

                        {/* Viewport indicator */}
                        <div
                            className="composite-timeline-quickscroll-viewport"
                            style={{
                                left: `${Math.max(0, ((smoothTime - pastWindow) / duration) * 100)}%`,
                                width: `${Math.min(100, (totalWindow / duration) * 100)}%`,
                            }}
                        />

                        {/* Current position indicator */}
                        <div
                            className="composite-timeline-quickscroll-position"
                            style={{ left: `${(smoothTime / duration) * 100}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================
// SharedQuickScroll Component (Task 1.6)
// ============================================================

/**
 * Props for SharedQuickScroll
 */
interface SharedQuickScrollProps {
    /** Composite beats to show as density markers */
    compositeBeats: CompositeBeat[];
    /** Total audio duration in seconds */
    duration: number;
    /** Current zoom level */
    zoomLevel: number;
}

/**
 * SharedQuickScroll
 *
 * A shared quick scroll bar that provides synchronized navigation
 * across all timelines in the CompositeStreamPanel.
 *
 * Features:
 * - Shows combined beat density from all bands
 * - Displays current viewport position
 * - Click/drag to seek
 * - Real-time sync with audio playback
 */
function SharedQuickScroll({
    compositeBeats,
    duration,
    zoomLevel,
}: SharedQuickScrollProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Direct store access for responsive seeking
    const storeSeek = useAudioPlayerStore((state) => state.seek);
    const currentAudioUrl = useAudioPlayerStore((state) => state.currentUrl);
    const storeCurrentTime = useAudioPlayerStore((state) => state.currentTime);
    const playbackState = useAudioPlayerStore((state) => state.playbackState);
    const isPlaying = playbackState === 'playing';

    // Get selected track from playlist store (for initiating playback when audio not loaded)
    const selectedTrack = usePlaylistStore((state) => state.selectedTrack);

    // Smart seek wrapper: loads audio first if not loaded
    const seek = useCallback((time: number) => {
        storeSeek(time, currentAudioUrl || selectedTrack?.audio_url);
    }, [storeSeek, currentAudioUrl, selectedTrack?.audio_url]);

    // Smooth animation state
    const animationFrameRef = useRef<number | null>(null);
    const [smoothTime, setSmoothTime] = useState(storeCurrentTime);
    const lastAudioTimeRef = useRef<{ time: number; timestamp: number }>({
        time: storeCurrentTime,
        timestamp: performance.now(),
    });
    const isPlayingRef = useRef(isPlaying);
    const smoothTimeRef = useRef(smoothTime);

    // Keep refs in sync
    useEffect(() => {
        smoothTimeRef.current = smoothTime;
    }, [smoothTime]);

    useEffect(() => {
        lastAudioTimeRef.current = {
            time: storeCurrentTime,
            timestamp: performance.now(),
        };
    }, [storeCurrentTime]);

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

    // Animation loop for smooth playhead
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

    useEffect(() => {
        if (!isPlaying) {
            setSmoothTime(storeCurrentTime);
        }
    }, [storeCurrentTime, isPlaying]);

    // ========================================
    // Drag handling
    // ========================================

    const [isDragging, setIsDragging] = useState(false);

    // Calculate viewport window based on zoom
    const baseAnticipationWindow = 2.0;
    const basePastWindow = 4.0;
    const anticipationWindow = baseAnticipationWindow / zoomLevel;
    const pastWindow = basePastWindow / zoomLevel;
    const totalWindow = pastWindow + anticipationWindow;

    const handleClick = useCallback(
        (event: React.MouseEvent) => {
            if (!scrollRef.current || duration === 0) return;

            const rect = scrollRef.current.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            const trackWidth = rect.width;
            const positionRatio = Math.max(0, Math.min(1, clickX / trackWidth));
            const newTime = positionRatio * duration;
            seek(newTime);
        },
        [duration, seek]
    );

    const handleDragStart = useCallback(
        (event: React.MouseEvent) => {
            if (!scrollRef.current || duration === 0) return;

            event.preventDefault();
            setIsDragging(true);

            const rect = scrollRef.current.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            const trackWidth = rect.width;
            const positionRatio = Math.max(0, Math.min(1, clickX / trackWidth));
            const newTime = positionRatio * duration;
            seek(newTime);
        },
        [duration, seek]
    );

    // Drag handling with RAF throttling
    useEffect(() => {
        if (!isDragging || duration === 0) return;

        let pendingSeek: number | null = null;
        let rafId: number | null = null;

        const handleMouseMove = (event: MouseEvent) => {
            if (!scrollRef.current) return;

            const rect = scrollRef.current.getBoundingClientRect();
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

        const handleMouseUp = () => {
            setIsDragging(false);
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            if (rafId) {
                cancelAnimationFrame(rafId);
            }
        };
    }, [isDragging, duration, seek]);

    // ========================================
    // Sample beats for density display
    // ========================================

    const sampledBeats = useMemo(() => {
        if (compositeBeats.length === 0) return [];
        // Sample at most 100 beats for performance
        const sampleRate = Math.max(1, Math.floor(compositeBeats.length / 100));
        return compositeBeats
            .filter((_, idx) => idx % sampleRate === 0)
            .map((beat) => ({
                position: duration > 0 ? beat.timestamp / duration : 0,
                color: BAND_COLORS[beat.sourceBand],
            }));
    }, [compositeBeats, duration]);

    if (duration === 0) return null;

    return (
        <div className="composite-shared-quickscroll">
            <div className="composite-shared-quickscroll-label">
                Navigation
            </div>
            <div
                ref={scrollRef}
                className={`composite-shared-quickscroll-track ${isDragging ? 'composite-shared-quickscroll-track--dragging' : ''}`}
                onClick={handleClick}
                onMouseDown={handleDragStart}
                role="slider"
                tabIndex={0}
                aria-label="Timeline navigation"
                aria-valuemin={0}
                aria-valuemax={duration}
                aria-valuenow={smoothTime}
            >
                {/* Beat density markers */}
                {sampledBeats.map((beat, index) => (
                    <div
                        key={`shared-scroll-beat-${index}`}
                        className="composite-shared-quickscroll-marker"
                        style={{
                            left: `${beat.position * 100}%`,
                            backgroundColor: beat.color,
                        }}
                    />
                ))}

                {/* Viewport indicator */}
                <div
                    className="composite-shared-quickscroll-viewport"
                    style={{
                        left: `${Math.max(0, ((smoothTime - pastWindow) / duration) * 100)}%`,
                        width: `${Math.min(100, (totalWindow / duration) * 100)}%`,
                    }}
                />

                {/* Current position indicator */}
                <div
                    className="composite-shared-quickscroll-position"
                    style={{ left: `${(smoothTime / duration) * 100}%` }}
                />
            </div>
        </div>
    );
}

// ============================================================
// Main Component
// ============================================================

/**
 * CompositeStreamPanel
 *
 * Main container for composite stream visualization.
 * Displays summary statistics and stacked timelines.
 */
export function CompositeStreamPanel({
    rhythm,
    currentTime: _currentTime = 0,
    duration: _duration,
    isPlaying: _isPlaying = false,
    onSeek: _onSeek,
    highlightedRegions: _highlightedRegions = [],
    scoringConfig,
    className,
}: CompositeStreamPanelProps) {
    // Get composite data from the rhythm
    const composite = rhythm.composite;
    const bandStreams = rhythm.bandStreams;

    // Zoom state
    const [zoomLevel, setZoomLevel] = useState(1);

    // Calculate overall statistics
    const stats = useMemo(() => {
        const beatsPerBand = composite.metadata.beatsPerBand;
        const sectionsPerBand = composite.metadata.sectionsPerBand;
        const totalSections = composite.sections.length;

        return {
            totalBeats: composite.beats.length,
            totalSections,
            beatsPerBand,
            sectionsPerBand,
        };
    }, [composite]);

    // Get bands in order
    const bands: Band[] = ['low', 'mid', 'high'];

    return (
        <div className={`composite-stream-panel ${className || ''}`}>
            {/* Header with total count */}
            <div className="composite-header">
                <div className="composite-title">
                    <Combine size={18} />
                    <span>Composite Stream Generation</span>
                </div>
                <div className="composite-count">
                    <span className="composite-count-value">{stats.totalBeats}</span>
                    <span className="composite-count-label">composite beats</span>
                </div>
            </div>

            {/* Summary statistics */}
            <div className="composite-summary">
                <StatCard
                    label="Total Beats"
                    value={stats.totalBeats}
                    icon={<Combine size={16} />}
                    color="var(--text-primary)"
                />
                <StatCard
                    label="Total Sections"
                    value={stats.totalSections}
                    icon={<Layers size={16} />}
                />
                <StatCard
                    label="Beats per Band"
                    value={`${stats.beatsPerBand.low} / ${stats.beatsPerBand.mid} / ${stats.beatsPerBand.high}`}
                    icon={<PieChart size={16} />}
                />
            </div>

            {/* Scoring Config Info (Task 4.1) */}
            {scoringConfig && (
                <div className="composite-scoring-config-info">
                    <Info size={14} />
                    <span>
                        Custom scoring applied
                        {scoringConfig.bandBiasWeights && (
                            <>
                                {' | '}
                                <span className="scoring-config-label">Bias:</span>
                                {' '}
                                <span style={{ color: BAND_COLORS.low }}>Low {scoringConfig.bandBiasWeights.low.toFixed(1)}x</span>
                                {', '}
                                <span style={{ color: BAND_COLORS.mid }}>Mid {scoringConfig.bandBiasWeights.mid.toFixed(1)}x</span>
                                {', '}
                                <span style={{ color: BAND_COLORS.high }}>High {scoringConfig.bandBiasWeights.high.toFixed(1)}x</span>
                            </>
                        )}
                        {(scoringConfig.ioiVarianceWeight !== undefined ||
                          scoringConfig.syncopationWeight !== undefined ||
                          scoringConfig.phraseSignificanceWeight !== undefined ||
                          scoringConfig.densityWeight !== undefined) && (
                            <>
                                {' | '}
                                <span className="scoring-config-label">Factors:</span>
                                {' IOI '}
                                <span className="scoring-config-value">{(scoringConfig.ioiVarianceWeight ?? 0.30).toFixed(2)}</span>
                                {', Sync '}
                                <span className="scoring-config-value">{(scoringConfig.syncopationWeight ?? 0.30).toFixed(2)}</span>
                                {', Phrase '}
                                <span className="scoring-config-value">{(scoringConfig.phraseSignificanceWeight ?? 0.25).toFixed(2)}</span>
                                {', Density '}
                                <span className="scoring-config-value">{(scoringConfig.densityWeight ?? 0.15).toFixed(2)}</span>
                            </>
                        )}
                    </span>
                </div>
            )}

            {/* Rhythmic balancing stats */}
            {rhythm.metadata.balanceStats && hasBalancerActivity(rhythm.metadata.balanceStats) && (
                <div className="composite-balance-stats">
                    <div className="composite-balance-stats-header">
                        <Info size={14} />
                        <span className="composite-balance-stats-title">Rhythmic Balancing</span>
                    </div>
                    <div className="composite-balance-stats-grid">
                        {rhythm.metadata.balanceStats.beatsAdded > 0 && (
                            <div className="composite-balance-stat-card">
                                <span className="composite-balance-stat-value">{rhythm.metadata.balanceStats.beatsAdded}</span>
                                <span className="composite-balance-stat-label">Beats Added</span>
                            </div>
                        )}
                        {rhythm.metadata.balanceStats.beatsShifted > 0 && (
                            <div className="composite-balance-stat-card">
                                <span className="composite-balance-stat-value">{rhythm.metadata.balanceStats.beatsShifted}</span>
                                <span className="composite-balance-stat-label">Beats Shifted</span>
                            </div>
                        )}
                        {rhythm.metadata.balanceStats.emptyMeasuresFilled > 0 && (
                            <div className="composite-balance-stat-card">
                                <span className="composite-balance-stat-value">{rhythm.metadata.balanceStats.emptyMeasuresFilled}</span>
                                <span className="composite-balance-stat-label">Measures Filled</span>
                            </div>
                        )}
                        {rhythm.metadata.balanceStats.shiftedToDownbeat > 0 && (
                            <div className="composite-balance-stat-card">
                                <span className="composite-balance-stat-value">{rhythm.metadata.balanceStats.shiftedToDownbeat}</span>
                                <span className="composite-balance-stat-label">Lone Notes Moved</span>
                            </div>
                        )}
                        {rhythm.metadata.balanceStats.proximityShifts > 0 && (
                            <div className="composite-balance-stat-card">
                                <span className="composite-balance-stat-value">{rhythm.metadata.balanceStats.proximityShifts}</span>
                                <span className="composite-balance-stat-label">Proximity Shifts</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Beats per band distribution bar */}
            <div className="composite-distribution-section">
                <h4 className="composite-section-title">Beats Distribution by Band</h4>
                <BandDistributionBar
                    low={stats.beatsPerBand.low}
                    mid={stats.beatsPerBand.mid}
                    high={stats.beatsPerBand.high}
                />
            </div>

            {/* Sections per band distribution bar */}
            <div className="composite-distribution-section">
                <h4 className="composite-section-title">Sections Distribution by Band</h4>
                <BandDistributionBar
                    low={stats.sectionsPerBand.low}
                    mid={stats.sectionsPerBand.mid}
                    high={stats.sectionsPerBand.high}
                />
            </div>

            {/* Placeholder for timelines (Tasks 1.2 and 1.3) */}
            <div className="composite-timelines-section">
                <div className="composite-timelines-header">
                    <h4 className="composite-section-title">Band Stream Timelines</h4>
                    <div className="composite-timelines-controls">
                        <ZoomControls
                            zoomLevel={zoomLevel}
                            onZoomChange={setZoomLevel}
                            minZoom={0.5}
                            maxZoom={4}
                            size="sm"
                        />
                    </div>
                </div>

                {/* Band stream timelines (Task 1.2) */}
                <div className="composite-band-timelines">
                    {bands.map((band) => (
                        <BandStreamTimeline
                            key={band}
                            band={band}
                            beats={bandStreams[band].beats}
                            color={BAND_COLORS[band]}
                            duration={_duration || 0}
                            zoomLevel={zoomLevel}
                        />
                    ))}
                </div>

                {/* Composite timeline (Task 1.3) */}
                <div className="composite-timeline-section">
                    <h4 className="composite-section-title">Composite Timeline</h4>
                    <CompositeTimeline
                        beats={composite.beats}
                        sections={composite.sections}
                        duration={_duration || 0}
                        zoomLevel={zoomLevel}
                    />
                </div>

                {/* Shared Quick Scroll Bar (Task 1.6) */}
                <SharedQuickScroll
                    compositeBeats={composite.beats}
                    duration={_duration || 0}
                    zoomLevel={zoomLevel}
                />
            </div>

            {/* Legend */}
            <div className="composite-legend">
                {bands.map((band) => (
                    <div key={band} className="composite-legend-item">
                        <div
                            className="composite-legend-marker"
                            style={{ backgroundColor: BAND_COLORS[band] }}
                        />
                        <span className="composite-legend-label">
                            {band.charAt(0).toUpperCase() + band.slice(1)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

