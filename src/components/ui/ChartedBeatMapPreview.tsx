/**
 * ChartedBeatMapPreview Component
 *
 * Full timeline visualization showing all beats in a ChartedBeatMap.
 * Features:
 * - Full timeline with all beats
 * - Beat types (detected/interpolated/generated) with visual distinction
 * - Downbeat indicators
 * - Audio sync with playhead
 * - Button colors based on controller mode (DDR/Guitar Hero)
 *
 * Task 7.2: Create ChartedBeatMapPreview Component
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import './ChartedBeatMapPreview.css';
import { cn } from '../../utils/cn';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';
import { usePlaylistStore } from '../../store/playlistStore';
import { useTrackDuration } from '../../hooks/useTrackDuration';
import type { ChartedBeat, ChartedBeatMap, ControllerMode } from 'playlist-data-engine';

// ============================================================
// Types
// ============================================================

export interface ChartedBeatMapPreviewProps {
    /** The charted beat map to visualize */
    chart: ChartedBeatMap | null;
    /** Controller mode for button coloring (DDR or Guitar Hero) */
    controllerMode?: ControllerMode;
    /** Callback when a beat is clicked */
    onBeatClick?: (beat: ChartedBeat) => void;
    /** The index of the currently selected beat (for visual highlight) */
    selectedBeatIndex?: number;
    /** Whether the timeline is disabled */
    disabled?: boolean;
    /** Height of the timeline in pixels */
    height?: number;
    /** Show beat indices on hover */
    showBeatIndices?: boolean;
    /** Override downbeat config for measure line calculation (e.g. from live store) */
    downbeatConfigOverride?: import('playlist-data-engine').DownbeatConfig;
    /**
     * Actual quarter-note timestamps from UnifiedBeatMap.
     * quarterNoteTimestamps[i] = timestamp of quarter note i.
     * When provided, measure lines use real beat positions (no BPM drift).
     * Falls back to fixed-BPM calculation when omitted.
     */
    quarterNoteTimestamps?: number[];
    /** Additional CSS class names */
    className?: string;
}

/** Internal representation of a visible beat */
interface VisibleBeat {
    beat: ChartedBeat;
    position: number; // 0-1 horizontal position
    isPast: boolean;
    isCurrent: boolean;
}

// ============================================================
// Constants
// ============================================================

/** DDR button configuration for display */
const DDR_BUTTON_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    up: { icon: <ArrowUp size={12} />, color: '#eab308', label: 'Up' },
    down: { icon: <ArrowDown size={12} />, color: '#3b82f6', label: 'Down' },
    left: { icon: <ArrowLeft size={12} />, color: '#a855f7', label: 'Left' },
    right: { icon: <ArrowRight size={12} />, color: '#22c55e', label: 'Right' },
};

/** Guitar Hero button configuration for display */
const GUITAR_HERO_BUTTON_CONFIG: Record<string, { color: string; label: string }> = {
    '1': { color: '#ef4444', label: 'Fret 1' },
    '2': { color: '#f97316', label: 'Fret 2' },
    '3': { color: '#eab308', label: 'Fret 3' },
    '4': { color: '#22c55e', label: 'Fret 4' },
    '5': { color: '#3b82f6', label: 'Fret 5' },
};

// ============================================================
// Helper Functions
// ============================================================

/**
 * Get the button config based on controller mode
 */
function getButtonConfig(key: string | undefined, controllerMode: ControllerMode): { icon?: React.ReactNode; color: string; label: string } {
    if (!key) {
        return { color: '#6b7280', label: 'None' };
    }

    if (controllerMode === 'ddr') {
        const ddrConfig = DDR_BUTTON_CONFIG[key];
        if (ddrConfig) {
            return { icon: ddrConfig.icon, color: ddrConfig.color, label: ddrConfig.label };
        }
        return { color: '#6b7280', label: key };
    }

    const ghConfig = GUITAR_HERO_BUTTON_CONFIG[key];
    if (ghConfig) {
        return { color: ghConfig.color, label: ghConfig.label };
    }
    return { color: '#6b7280', label: key };
}

/**
 * Format time in MM:SS.ms format
 */
function formatTime(seconds: number): string {
    if (!Number.isFinite(seconds)) return '0:00.00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toFixed(2).padStart(5, '0')}`;
}

/**
 * Format time in MM:SS format
 */
function formatTimeShort(seconds: number): string {
    if (!Number.isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ============================================================
// Main Component
// ============================================================

export function ChartedBeatMapPreview({
    chart,
    controllerMode = 'ddr',
    onBeatClick,
    selectedBeatIndex,
    disabled = false,
    height = 120,
    showBeatIndices = true,
    downbeatConfigOverride,
    quarterNoteTimestamps,
    className,
}: ChartedBeatMapPreviewProps) {
    // Audio player state
    const currentTime = useAudioPlayerStore((state) => state.currentTime);
    const playbackState = useAudioPlayerStore((state) => state.playbackState);
    const storeSeek = useAudioPlayerStore((state) => state.seek);
    const resume = useAudioPlayerStore((state) => state.resume);
    const pause = useAudioPlayerStore((state) => state.pause);
    const play = useAudioPlayerStore((state) => state.play);
    const currentUrl = useAudioPlayerStore((state) => state.currentUrl);
    const { selectedTrack } = usePlaylistStore();
    const duration = useTrackDuration();

    const isPlaying = playbackState === 'playing';

    // Smart seek wrapper: loads audio first if not loaded
    const seek = useCallback((time: number) => {
        storeSeek(time, currentUrl || selectedTrack?.audio_url);
    }, [storeSeek, currentUrl, selectedTrack?.audio_url]);

    // Animation state for smooth scrolling
    const [smoothTime, setSmoothTime] = useState(currentTime);
    const animationFrameRef = useRef<number | null>(null);
    const smoothTimeRef = useRef(smoothTime);

    // Keep smoothTimeRef in sync with smoothTime state
    useEffect(() => {
        smoothTimeRef.current = smoothTime;
    }, [smoothTime]);
    const lastAudioTimeRef = useRef<{ time: number; timestamp: number }>({
        time: currentTime,
        timestamp: performance.now(),
    });
    const isPlayingRef = useRef(isPlaying);

    // Drag state
    const [isDragging, setIsDragging] = useState(false);
    const trackRef = useRef<HTMLDivElement>(null);
    const dragStartXRef = useRef(0);
    const dragStartTimeRef = useRef(0);

    // Quick scroll state
    const quickScrollRef = useRef<HTMLDivElement>(null);
    const [isQuickScrollDragging, setIsQuickScrollDragging] = useState(false);

    // Hover state
    const [hoveredBeat, setHoveredBeat] = useState<ChartedBeat | null>(null);

    // Zoom state - controls the visible time window around the playhead
    // Lower zoom = see more of the song; higher zoom = more detail
    const MAX_ZOOM = 10;
    const trackDuration = duration || chart?.duration || 0;
    // Base windows at zoom level 1 (seconds visible before/after playhead)
    const baseAnticipationWindow = 2.0;
    const basePastWindow = 4.0;

    const [zoomLevel, setZoomLevel] = useState(0.1);
    // Calculate windows based on zoom (higher zoom = smaller windows = more detail)
    const anticipationWindow = baseAnticipationWindow / zoomLevel;
    const pastWindow = basePastWindow / zoomLevel;
    const totalWindow = pastWindow + anticipationWindow;

    // Keep refs in sync
    useEffect(() => {
        lastAudioTimeRef.current = {
            time: currentTime,
            timestamp: performance.now(),
        };
    }, [currentTime]);

    // Track playback state transitions
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

    // Animation loop for smooth scrolling
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
            const interpolatedTime = Math.min(lastAudioTime + elapsedSeconds, duration || 9999);

            setSmoothTime(interpolatedTime);

            if (isPlayingRef.current && interpolatedTime < (duration || 9999)) {
                animationFrameRef.current = requestAnimationFrame(animate);
            }
        };

        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isPlaying, duration]);

    // Handle seek events
    useEffect(() => {
        if (!isPlaying) {
            setSmoothTime(currentTime);
        }
    }, [currentTime, isPlaying]);

    // Visible time range centered on playhead
    const visibleStartTime = smoothTime - pastWindow;
    const visibleEndTime = smoothTime + anticipationWindow;

    /**
     * Calculate position (0-1) for a timestamp within the visible window.
     * The playhead is always at 0.5 (center).
     */
    const calculatePosition = useCallback((timestamp: number): number => {
        const timeUntilEvent = timestamp - smoothTime;
        return 0.5 + (timeUntilEvent / anticipationWindow) * 0.5;
    }, [smoothTime, anticipationWindow]);

    // Use override if provided (live store value), otherwise fall back to chart's baked-in config
    const effectiveDownbeatConfig = downbeatConfigOverride ?? chart?.downbeatConfig;

    // Calculate measure line positions for the visible window
    const measureLines = useMemo(() => {
        if (!chart?.beats?.length) return [];

        // Get beats per measure from effective downbeat config
        const firstSegment = effectiveDownbeatConfig?.segments?.[0];
        const beatsPerMeasure = firstSegment?.timeSignature?.beatsPerMeasure ?? 4;
        const downbeatBeatIndex = firstSegment?.downbeatBeatIndex ?? 0;

        // When we have real quarter-note timestamps from the unified beat map,
        // use them directly — no BPM drift.
        if (quarterNoteTimestamps && quarterNoteTimestamps.length > 0) {
            const lines: number[] = [];
            for (let qi = downbeatBeatIndex; qi < quarterNoteTimestamps.length; qi += beatsPerMeasure) {
                const ts = quarterNoteTimestamps[qi];
                if (ts === undefined) break;
                if (ts > visibleEndTime) break;
                if (ts >= visibleStartTime) {
                    lines.push(ts);
                }
            }
            return lines;
        }

        // Fallback: fixed-BPM estimation from chart data (will drift on tempo changes)
        const qni = chart.quarterNoteInterval;
        if (!qni || qni <= 0) return [];

        const measureDuration = qni * beatsPerMeasure;

        let minQni = chart.beats[0].quarterNoteIndex ?? 0;
        let anchorBeatTs = chart.beats[0].timestamp;
        for (let i = 1; i < chart.beats.length; i++) {
            const qi = chart.beats[i].quarterNoteIndex ?? 0;
            if (qi < minQni) {
                minQni = qi;
                anchorBeatTs = chart.beats[i].timestamp;
            }
        }
        const gridStartTs = anchorBeatTs - minQni * qni;
        const firstDownbeatTs = gridStartTs + downbeatBeatIndex * qni;

        const lines: number[] = [];
        const measuresBeforeWindow = Math.ceil((visibleStartTime - firstDownbeatTs) / measureDuration);
        const startLine = firstDownbeatTs + measuresBeforeWindow * measureDuration;

        for (let t = startLine; t <= visibleEndTime; t += measureDuration) {
            if (t >= visibleStartTime) {
                lines.push(t);
            }
        }

        return lines;
    }, [chart?.beats, effectiveDownbeatConfig, chart?.quarterNoteInterval, quarterNoteTimestamps, visibleStartTime, visibleEndTime]);

    // Get visible beats
    const visibleBeats = useMemo((): VisibleBeat[] => {
        if (!chart?.beats) return [];

        return chart.beats
            .filter((beat) => beat.timestamp >= visibleStartTime && beat.timestamp <= visibleEndTime)
            .map((beat) => {
                const position = calculatePosition(beat.timestamp);
                const isPast = beat.timestamp < smoothTime - 0.05;
                const isCurrent = !isPast && beat.timestamp < smoothTime + 0.1;

                return {
                    beat,
                    position,
                    isPast,
                    isCurrent,
                };
            })
            .filter((vb) => vb.position >= 0 && vb.position <= 1);
    }, [chart?.beats, visibleStartTime, visibleEndTime, smoothTime, calculatePosition]);

    // Drag-to-scrub functionality
    const DRAG_THRESHOLD = 5;

    const handleMouseDown = useCallback((event: React.MouseEvent) => {
        if (disabled || !trackRef.current) return;

        event.preventDefault();
        setIsDragging(true);
        dragStartXRef.current = event.clientX;
        dragStartTimeRef.current = smoothTimeRef.current;
    }, [disabled]);

    const handleMouseMove = useCallback((event: MouseEvent) => {
        if (!isDragging || !trackRef.current) return;

        const rect = trackRef.current.getBoundingClientRect();
        const trackWidth = rect.width;
        const deltaX = event.clientX - dragStartXRef.current;

        if (Math.abs(deltaX) > DRAG_THRESHOLD) {
            const timePerPixel = totalWindow / trackWidth;
            const deltaTime = -deltaX * timePerPixel;
            const newTime = Math.max(0, Math.min(duration || 9999, dragStartTimeRef.current + deltaTime));
            seek(newTime);
        }
    }, [isDragging, totalWindow, duration, seek]);

    const handleMouseUp = useCallback((event: MouseEvent) => {
        if (!isDragging || !trackRef.current) return;

        const rect = trackRef.current.getBoundingClientRect();
        const deltaX = event.clientX - dragStartXRef.current;

        // If minimal movement, treat as click-to-seek
        if (Math.abs(deltaX) <= DRAG_THRESHOLD) {
            const clickX = event.clientX - rect.left;
            const trackWidth = rect.width;

            const positionRatio = clickX / trackWidth;
            const newTime = (smoothTimeRef.current - pastWindow) + positionRatio * totalWindow;
            const clampedTime = Math.max(0, Math.min(duration || 9999, newTime));

            seek(clampedTime);
        }

        setIsDragging(false);
    }, [isDragging, pastWindow, totalWindow, duration, seek]);

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

    // Quick scroll handlers
    const handleQuickScrollClick = useCallback(
        (event: React.MouseEvent) => {
            if (!quickScrollRef.current || trackDuration === 0) return;
            const rect = quickScrollRef.current.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            const positionRatio = Math.max(0, Math.min(1, clickX / rect.width));
            seek(positionRatio * trackDuration);
        },
        [trackDuration, seek]
    );

    const handleQuickScrollDragStart = useCallback(
        (event: React.MouseEvent) => {
            if (!quickScrollRef.current || trackDuration === 0) return;
            event.preventDefault();
            setIsQuickScrollDragging(true);
            const rect = quickScrollRef.current.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            const positionRatio = Math.max(0, Math.min(1, clickX / rect.width));
            seek(positionRatio * trackDuration);
        },
        [trackDuration, seek]
    );

    useEffect(() => {
        if (!isQuickScrollDragging || trackDuration === 0) return;

        let pendingSeek: number | null = null;
        let rafId: number | null = null;

        const handleQuickScrollMove = (event: MouseEvent) => {
            if (!quickScrollRef.current) return;
            const rect = quickScrollRef.current.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            const positionRatio = Math.max(0, Math.min(1, clickX / rect.width));
            pendingSeek = positionRatio * trackDuration;
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
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, [isQuickScrollDragging, trackDuration, seek]);

    // Handle beat click
    const handleBeatClick = useCallback((event: React.MouseEvent, beat: ChartedBeat) => {
        event.stopPropagation();
        onBeatClick?.(beat);
    }, [onBeatClick]);

    // Handle keyboard navigation
    const handleBeatKeyDown = useCallback((event: React.KeyboardEvent, beat: ChartedBeat) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onBeatClick?.(beat);
        }
    }, [onBeatClick]);

    // Play/pause toggle
    const handlePlayPause = useCallback(() => {
        if (isPlaying) {
            pause();
        } else {
            if (selectedTrack && !currentUrl) {
                play(selectedTrack.audio_url);
            } else {
                resume();
            }
        }
    }, [isPlaying, pause, resume, play, selectedTrack, currentUrl]);

    // Zoom controls
    const handleZoomIn = useCallback(() => {
        setZoomLevel((prev) => Math.min(prev * 1.5, MAX_ZOOM));
    }, []);

    const MIN_ZOOM = 0.03;
    const handleZoomOut = useCallback(() => {
        setZoomLevel((prev) => Math.max(prev / 1.5, MIN_ZOOM));
    }, []);

    const handleResetZoom = useCallback(() => {
        setZoomLevel(0.1);
    }, []);

    // Calculate statistics for display
    const stats = useMemo(() => {
        if (!chart?.beats) {
            return { total: 0, detected: 0, generated: 0, downbeats: 0 };
        }

        const total = chart.beats.length;
        const detected = chart.beats.filter((b) => b.isDetected).length;
        const generated = total - detected;
        const downbeats = chart.beats.filter((b) => b.isDownbeat).length;

        return { total, detected, generated, downbeats };
    }, [chart?.beats]);

    // Empty state
    if (!chart || !chart.beats || chart.beats.length === 0) {
        return (
            <div className={cn('charted-beat-map-preview', 'charted-beat-map-preview--empty', className)}>
                <p className="charted-beat-map-preview-empty-message">No chart data available</p>
            </div>
        );
    }

    const isDDR = controllerMode === 'ddr';

    return (
        <div className={cn('charted-beat-map-preview', className)}>
            {/* Timeline Track */}
            <div
                ref={trackRef}
                className={cn(
                    'charted-beat-map-track',
                    isDragging && 'dragging',
                    disabled && 'disabled'
                )}
                style={{ height: `${height}px` }}
                onMouseDown={handleMouseDown}
                role="slider"
                aria-label="Chart timeline"
                aria-valuemin={0}
                aria-valuemax={duration || 0}
                aria-valuenow={smoothTime}
                tabIndex={disabled ? -1 : 0}
            >
                {/* Background layers */}
                <div className="charted-beat-map-background" />

                {/* Grid lines for measures */}
                <div className="charted-beat-map-grid">
                    {measureLines.map((timestamp) => {
                        const position = calculatePosition(timestamp);
                        if (position < 0 || position > 1) return null;
                        return (
                            <div
                                key={`measure-${timestamp}`}
                                className="charted-beat-map-measure-line"
                                style={{ left: `${position * 100}%` }}
                            />
                        );
                    })}
                </div>

                {/* Beat markers */}
                {visibleBeats.map((vb, index) => {
                    const { beat, position, isPast, isCurrent } = vb;
                    const config = getButtonConfig(beat.requiredKey, controllerMode);
                    const isSelected = beat.beatInMeasure === selectedBeatIndex;

                    return (
                        <div
                            key={`beat-${beat.timestamp}-${index}`}
                            className={cn(
                                'charted-beat-map-marker',
                                isPast && 'charted-beat-map-marker--past',
                                isCurrent && 'charted-beat-map-marker--current',
                                isSelected && 'charted-beat-map-marker--selected',
                                onBeatClick && 'charted-beat-map-marker--selectable',
                                beat.isDownbeat && 'charted-beat-map-marker--downbeat',
                                !beat.isDetected && 'charted-beat-map-marker--generated',
                                beat.isDetected && 'charted-beat-map-marker--detected'
                            )}
                            style={{
                                left: `${position * 100}%`,
                                color: config.color,
                                borderColor: config.color,
                            }}
                            onClick={(e) => handleBeatClick(e, beat)}
                            onKeyDown={(e) => handleBeatKeyDown(e, beat)}
                            onMouseEnter={() => setHoveredBeat(beat)}
                            onMouseLeave={() => setHoveredBeat(null)}
                            role={onBeatClick ? 'button' : undefined}
                            tabIndex={onBeatClick ? 0 : undefined}
                            aria-label={`${config.label} at ${beat.timestamp.toFixed(2)}s${beat.isDownbeat ? ' (downbeat)' : ''}`}
                        >
                            {isDDR ? (
                                <span className="charted-beat-map-icon">{config.icon}</span>
                            ) : (
                                <span className="charted-beat-map-fret">{beat.requiredKey || '-'}</span>
                            )}
                        </div>
                    );
                })}

                {/* Playhead - always centered */}
                <div
                    className="charted-beat-map-playhead"
                    style={{ left: '50%' }}
                >
                    <div className="charted-beat-map-playhead-line" />
                    <div className="charted-beat-map-playhead-head" />
                </div>

                {/* Time markers - use same scale as beat positioning (anticipationWindow) */}
                <div className="charted-beat-map-time-markers">
                    {Array.from({ length: 5 }, (_, i) => {
                        const fraction = i / 4; // 0, 0.25, 0.5, 0.75, 1
                        const beatRange = anticipationWindow * 2;
                        const time = smoothTime - anticipationWindow + (fraction * beatRange);
                        const isFirst = i === 0;
                        const isLast = i === 4;
                        return (
                            <span
                                key={`time-${i}`}
                                className={cn(
                                    'charted-beat-map-time-marker',
                                    isFirst && 'charted-beat-map-time-marker--edge-left',
                                    isLast && 'charted-beat-map-time-marker--edge-right'
                                )}
                                style={{ left: `${fraction * 100}%` }}
                            >
                                {formatTimeShort(time)}
                            </span>
                        );
                    })}
                </div>
            </div>

            {/* Quick scroll bar */}
            {trackDuration > 0 && (
                <div className="charted-beat-map-quickscroll">
                    <div
                        ref={quickScrollRef}
                        className="charted-beat-map-quickscroll-track"
                        onClick={handleQuickScrollClick}
                        onMouseDown={handleQuickScrollDragStart}
                    >
                        {/* Beat density markers (sampled for performance) */}
                        {chart.beats
                            .filter((_, idx) => idx % Math.max(1, Math.floor(chart.beats.length / 80)) === 0)
                            .map((beat, index) => {
                                const position = beat.timestamp / trackDuration;
                                const config = getButtonConfig(beat.requiredKey, controllerMode);
                                return (
                                    <div
                                        key={`quickscroll-${beat.timestamp}-${index}`}
                                        className="charted-beat-map-quickscroll-marker"
                                        style={{
                                            left: `${position * 100}%`,
                                            backgroundColor: config.color,
                                        }}
                                    />
                                );
                            })}

                        {/* Viewport indicator */}
                        <div
                            className="charted-beat-map-quickscroll-viewport"
                            style={{
                                left: `${Math.max(0, ((smoothTime - pastWindow) / trackDuration) * 100)}%`,
                                width: `${Math.min(100, (totalWindow / trackDuration) * 100)}%`,
                            }}
                        />

                        {/* Current position indicator */}
                        <div
                            className="charted-beat-map-quickscroll-position"
                            style={{ left: `${(smoothTime / trackDuration) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Beat info bar - always visible, updates on hover */}
            <div className="charted-beat-map-tooltip">
                {hoveredBeat ? (
                    <>
                        <div className="charted-beat-map-tooltip-header">
                            <span
                                className="charted-beat-map-tooltip-button"
                                style={{ color: getButtonConfig(hoveredBeat.requiredKey, controllerMode).color }}
                            >
                                {getButtonConfig(hoveredBeat.requiredKey, controllerMode).label}
                            </span>
                            {showBeatIndices && (
                                <span className="charted-beat-map-tooltip-beat">
                                    Beat {hoveredBeat.beatInMeasure}
                                </span>
                            )}
                        </div>
                        <div className="charted-beat-map-tooltip-details">
                            <span className="charted-beat-map-tooltip-time">
                                {formatTime(hoveredBeat.timestamp)}s
                            </span>
                            <span className="charted-beat-map-tooltip-separator">•</span>
                            <span className="charted-beat-map-tooltip-source">
                                {hoveredBeat.isDetected ? '<10ms' : '>=10ms'}
                            </span>
                            {hoveredBeat.isDownbeat && (
                                <>
                                    <span className="charted-beat-map-tooltip-separator">•</span>
                                    <span className="charted-beat-map-tooltip-downbeat">
                                        Downbeat
                                    </span>
                                </>
                            )}
                            {hoveredBeat.sourceBand && (
                                <>
                                    <span className="charted-beat-map-tooltip-separator">•</span>
                                    <span className="charted-beat-map-tooltip-band">
                                        {hoveredBeat.sourceBand} band
                                    </span>
                                </>
                            )}
                        </div>
                        <div className="charted-beat-map-tooltip-extra">
                            Quantization error: {hoveredBeat.quantizationError !== undefined ? `${hoveredBeat.quantizationError.toFixed(1)}ms` : '0ms'}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="charted-beat-map-tooltip-header">
                            <span className="charted-beat-map-tooltip-button charted-beat-map-tooltip-skeleton">--</span>
                            {showBeatIndices && (
                                <span className="charted-beat-map-tooltip-beat charted-beat-map-tooltip-skeleton">Beat --</span>
                            )}
                        </div>
                        <div className="charted-beat-map-tooltip-details">
                            <span className="charted-beat-map-tooltip-time charted-beat-map-tooltip-skeleton">0:00.00s</span>
                            <span className="charted-beat-map-tooltip-separator">•</span>
                            <span className="charted-beat-map-tooltip-source charted-beat-map-tooltip-skeleton">--</span>
                        </div>
                        <div className="charted-beat-map-tooltip-extra charted-beat-map-tooltip-skeleton">--</div>
                    </>
                )}
            </div>

            {/* Controls */}
            <div className="charted-beat-map-controls">
                <div className="charted-beat-map-controls-left">
                    <button
                        className="charted-beat-map-play-btn"
                        onClick={handlePlayPause}
                        disabled={disabled}
                        title={isPlaying ? 'Pause' : 'Play'}
                    >
                        {isPlaying ? (
                            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                <rect x="6" y="4" width="4" height="16" />
                                <rect x="14" y="4" width="4" height="16" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                <polygon points="5,3 19,12 5,21" />
                            </svg>
                        )}
                    </button>
                    <span className="charted-beat-map-time">
                        {formatTime(smoothTime)} / {formatTime(duration || chart.duration)}
                    </span>
                </div>

                <div className="charted-beat-map-controls-center">
                    <span className="charted-beat-map-stats">
                        <span className="charted-beat-map-stat">
                            <span className="charted-beat-map-stat-value">{stats.total}</span>
                            <span className="charted-beat-map-stat-label">beats</span>
                        </span>
                        <span className="charted-beat-map-stat-separator">•</span>
                        <span className="charted-beat-map-stat">
                            <span className="charted-beat-map-stat-value charted-beat-map-stat--detected">{stats.detected}</span>
                            <span className="charted-beat-map-stat-label">detected</span>
                        </span>
                        <span className="charted-beat-map-stat-separator">•</span>
                        <span className="charted-beat-map-stat">
                            <span className="charted-beat-map-stat-value charted-beat-map-stat--generated">{stats.generated}</span>
                            <span className="charted-beat-map-stat-label">generated</span>
                        </span>
                    </span>
                </div>

                <div className="charted-beat-map-controls-right">
                    <button
                        className="charted-beat-map-zoom-btn"
                        onClick={handleZoomOut}
                        disabled={zoomLevel <= 0.03}
                        title="Zoom out"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            <line x1="8" y1="11" x2="14" y2="11" />
                        </svg>
                    </button>
                    <span
                        className="charted-beat-map-zoom-level charted-beat-map-zoom-reset-btn"
                        onClick={handleResetZoom}
                        title="Reset zoom"
                    >
                        {(zoomLevel * 100).toFixed(0)}%
                    </span>
                    <button
                        className="charted-beat-map-zoom-btn"
                        onClick={handleZoomIn}
                        disabled={zoomLevel >= MAX_ZOOM}
                        title="Zoom in"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            <line x1="11" y1="8" x2="11" y2="14" />
                            <line x1="8" y1="11" x2="14" y2="11" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Legend */}
            <div className="charted-beat-map-legend">
                {(() => {
                    // Derive unique keys actually used in the chart
                    const usedKeys = [...new Set(
                        chart.beats
                            .map((b) => b.requiredKey)
                            .filter((k): k is string => !!k && k !== 'tap')
                    )].sort();
                    if (usedKeys.length === 0) return null;

                    const buttonConfig = isDDR ? DDR_BUTTON_CONFIG : GUITAR_HERO_BUTTON_CONFIG;

                    return (
                        <div className="charted-beat-map-legend-group">
                            <span className="charted-beat-map-legend-title">Keys:</span>
                            {usedKeys.map((key) => {
                                const config = buttonConfig[key];
                                if (!config) return null;
                                return (
                                    <div key={key} className="charted-beat-map-legend-item">
                                        {'icon' in config && config.icon ? (
                                            <span
                                                className="charted-beat-map-legend-icon"
                                                style={{ color: config.color }}
                                            >
                                                {config.icon as React.ReactNode}
                                            </span>
                                        ) : (
                                            <span
                                                className="charted-beat-map-legend-fret"
                                                style={{ background: config.color }}
                                            >
                                                {key}
                                            </span>
                                        )}
                                        <span className="charted-beat-map-legend-label">{config.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })()}
                <div className="charted-beat-map-legend-group">
                    <span className="charted-beat-map-legend-title">Beat Types:</span>
                    <div className="charted-beat-map-legend-item">
                        <span className="charted-beat-map-legend-dot charted-beat-map-legend-dot--detected" />
                        <span className="charted-beat-map-legend-label">Detected</span>
                    </div>
                    <div className="charted-beat-map-legend-item">
                        <span className="charted-beat-map-legend-dot charted-beat-map-legend-dot--generated" />
                        <span className="charted-beat-map-legend-label">Generated</span>
                    </div>
                    <div className="charted-beat-map-legend-item">
                        <span className="charted-beat-map-legend-dot charted-beat-map-legend-dot--downbeat" />
                        <span className="charted-beat-map-legend-label">Downbeat</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ChartedBeatMapPreview;
