/**
 * ButtonTimeline Component
 *
 * A horizontal timeline visualization showing button assignments at each beat position.
 * Features:
 * - Color-coded buttons for DDR (up=yellow, down=blue, left=purple, right=green)
 * - Color-coded buttons for Guitar Hero (1-5 gradient red→blue)
 * - Sync with audio playback (playhead)
 * - Hover shows mapping decision (pitch vs pattern influenced)
 * - Click to see beat details
 *
 * Task 6.2: Create ButtonTimeline Component (Primary View)
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import './ButtonTimeline.css';
import { cn } from '../../utils/cn';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';
import { usePlaylistStore } from '../../store/playlistStore';
import { useTrackDuration } from '../../hooks/useTrackDuration';
import type { ControllerMode } from 'playlist-data-engine';

// ============================================================
// Types
// ============================================================

/** A beat with button information for the timeline */
export interface ButtonBeat {
    /** Beat timestamp in seconds */
    timestamp: number;
    /** Beat index in the chart */
    beatIndex: number;
    /** Assigned button/key (e.g., 'up', 'down', 'left', 'right' for DDR) */
    key: string;
    /** Whether this beat was detected from audio or generated */
    isDetected: boolean;
    /** Whether this is a downbeat */
    isDownbeat: boolean;
    /** Beat intensity (0-1) */
    intensity: number;
    /** Whether this beat's key was influenced by pitch (vs pattern) */
    isPitchInfluenced?: boolean;
}

export interface ButtonTimelineProps {
    /** Array of beats with button assignments */
    beats: ButtonBeat[];
    /** Controller mode (DDR or Guitar Hero) */
    controllerMode: ControllerMode;
    /** Callback when a beat is clicked */
    onBeatClick?: (beat: ButtonBeat) => void;
    /** The index of the currently selected beat (for visual highlight) */
    selectedBeatIndex?: number;
    /** Whether the timeline is disabled */
    disabled?: boolean;
    /** Anticipation window in seconds for future beats */
    anticipationWindow?: number;
    /** Past window in seconds */
    pastWindow?: number;
    /** Show beat indices on hover */
    showBeatIndices?: boolean;
    /** Additional CSS class names */
    className?: string;
}

/** Internal representation of a visible button */
interface VisibleButton {
    beat: ButtonBeat;
    position: number; // 0-1 horizontal position
    isPast: boolean;
    isCurrent: boolean;
}

// ============================================================
// Constants
// ============================================================

/** DDR button configuration for display */
const DDR_BUTTON_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    up: { icon: <ArrowUp size={14} />, color: '#eab308', label: 'Up' },
    down: { icon: <ArrowDown size={14} />, color: '#3b82f6', label: 'Down' },
    left: { icon: <ArrowLeft size={14} />, color: '#a855f7', label: 'Left' },
    right: { icon: <ArrowRight size={14} />, color: '#22c55e', label: 'Right' },
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
function getButtonConfig(key: string, controllerMode: ControllerMode): { icon?: React.ReactNode; color: string; label: string } {
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
 * Format time in MM:SS format
 */
function formatTime(seconds: number): string {
    if (!Number.isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ============================================================
// Main Component
// ============================================================

export function ButtonTimeline({
    beats,
    controllerMode,
    onBeatClick,
    selectedBeatIndex,
    disabled = false,
    anticipationWindow = 4.0,
    pastWindow = 2.0,
    showBeatIndices = true,
    className,
}: ButtonTimelineProps) {
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

    // Hover state
    const [hoveredBeat, setHoveredBeat] = useState<ButtonBeat | null>(null);

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

    // Total visible time window
    const totalWindow = pastWindow + anticipationWindow;

    // Position of NOW line (as fraction from 0 to 1)
    const nowPosition = pastWindow / totalWindow;

    // Calculate horizontal position for a timestamp
    const calculatePosition = useCallback((timestamp: number): number => {
        const pastStartTime = smoothTime - pastWindow;
        const timeFromPastStart = timestamp - pastStartTime;
        return timeFromPastStart / totalWindow;
    }, [smoothTime, pastWindow, totalWindow]);

    // Get visible buttons within the time window
    const visibleButtons = useMemo((): VisibleButton[] => {
        const windowStart = smoothTime - pastWindow;
        const windowEnd = smoothTime + anticipationWindow;

        return beats
            .filter((b) => b.timestamp >= windowStart && b.timestamp <= windowEnd)
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
    }, [beats, smoothTime, pastWindow, anticipationWindow, calculatePosition]);

    // Drag-to-scrub functionality
    const DRAG_THRESHOLD = 5;

    const handleMouseDown = useCallback((event: React.MouseEvent) => {
        if (disabled || !trackRef.current) return;

        event.preventDefault();
        setIsDragging(true);
        dragStartXRef.current = event.clientX;
        dragStartTimeRef.current = smoothTime;
    }, [disabled, smoothTime]);

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
            const timeFromPastStart = positionRatio * totalWindow;
            const newTime = Math.max(0, Math.min(duration || 9999, (smoothTime - pastWindow) + timeFromPastStart));

            seek(newTime);
        }

        setIsDragging(false);
    }, [isDragging, totalWindow, duration, seek, smoothTime, pastWindow]);

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

    // Handle beat click
    const handleBeatClick = useCallback((event: React.MouseEvent, beat: ButtonBeat) => {
        event.stopPropagation();
        onBeatClick?.(beat);
    }, [onBeatClick]);

    // Handle keyboard navigation
    const handleBeatKeyDown = useCallback((event: React.KeyboardEvent, beat: ButtonBeat) => {
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

    // Empty state
    if (beats.length === 0) {
        return (
            <div className={cn('button-timeline', 'button-timeline--empty', className)}>
                <p className="button-timeline-empty-message">No button mapping data available</p>
            </div>
        );
    }

    const isDDR = controllerMode === 'ddr';

    return (
        <div className={cn('button-timeline', className)}>
            {/* Timeline Track */}
            <div
                ref={trackRef}
                className={cn(
                    'button-timeline-track',
                    isDragging && 'dragging',
                    disabled && 'disabled'
                )}
                onMouseDown={handleMouseDown}
                role="slider"
                aria-label="Button timeline"
                aria-valuemin={0}
                aria-valuemax={duration || 0}
                aria-valuenow={smoothTime}
                tabIndex={disabled ? -1 : 0}
            >
                {/* Background layers */}
                <div className="button-timeline-background" />
                <div
                    className="button-timeline-past-region"
                    style={{ width: `${nowPosition * 100}%` }}
                />
                <div
                    className="button-timeline-future-region"
                    style={{ width: `${(1 - nowPosition) * 100}%` }}
                />

                {/* Center lane line */}
                <div className="button-timeline-center-line" />

                {/* Button markers */}
                {visibleButtons.map((vb, index) => {
                    const { beat, position, isPast, isCurrent } = vb;
                    const config = getButtonConfig(beat.key, controllerMode);

                    const isSelected = beat.beatIndex === selectedBeatIndex;
                    const intensityScale = 0.8 + (beat.intensity * 0.4);

                    return (
                        <div
                            key={`button-${beat.beatIndex}-${index}`}
                            className={cn(
                                'button-timeline-marker',
                                isPast && 'button-timeline-marker--past',
                                isCurrent && 'button-timeline-marker--current',
                                isSelected && 'button-timeline-marker--selected',
                                onBeatClick && 'button-timeline-marker--selectable',
                                beat.isDownbeat && 'button-timeline-marker--downbeat',
                                !beat.isDetected && 'button-timeline-marker--generated'
                            )}
                            style={{
                                left: `${position * 100}%`,
                                color: config.color,
                                transform: `translate(-50%, -50%) scale(${intensityScale})`,
                            }}
                            onClick={(e) => handleBeatClick(e, beat)}
                            onKeyDown={(e) => handleBeatKeyDown(e, beat)}
                            onMouseEnter={() => setHoveredBeat(beat)}
                            onMouseLeave={() => setHoveredBeat(null)}
                            role={onBeatClick ? 'button' : undefined}
                            tabIndex={onBeatClick ? 0 : undefined}
                            aria-label={`${config.label} at ${beat.timestamp.toFixed(2)}s`}
                        >
                            {isDDR ? (
                                <span className="button-timeline-icon">{config.icon}</span>
                            ) : (
                                <span className="button-timeline-fret">{beat.key}</span>
                            )}
                        </div>
                    );
                })}

                {/* NOW line */}
                <div
                    className="button-timeline-now-line"
                    style={{ left: `${nowPosition * 100}%` }}
                >
                    <div className="button-timeline-now-line-inner" />
                    <span className="button-timeline-now-label">NOW</span>
                </div>
            </div>

            {/* Beat info bar - always visible, updates on hover */}
            <div className="button-timeline-tooltip">
                {hoveredBeat ? (
                    <>
                        <div className="button-timeline-tooltip-header">
                            <span
                                className="button-timeline-tooltip-button"
                                style={{ color: getButtonConfig(hoveredBeat.key, controllerMode).color }}
                            >
                                {getButtonConfig(hoveredBeat.key, controllerMode).label}
                            </span>
                            {showBeatIndices && (
                                <span className="button-timeline-tooltip-beat">
                                    Beat {hoveredBeat.beatIndex}
                                </span>
                            )}
                        </div>
                        <div className="button-timeline-tooltip-details">
                            <span className="button-timeline-tooltip-time">
                                {hoveredBeat.timestamp.toFixed(2)}s
                            </span>
                            <span className="button-timeline-tooltip-separator">•</span>
                            <span className="button-timeline-tooltip-source">
                                {hoveredBeat.isDetected ? 'Detected' : 'Generated'}
                            </span>
                            {hoveredBeat.isPitchInfluenced !== undefined && (
                                <>
                                    <span className="button-timeline-tooltip-separator">•</span>
                                    <span className={cn(
                                        'button-timeline-tooltip-influence',
                                        hoveredBeat.isPitchInfluenced ? 'pitch' : 'pattern'
                                    )}>
                                        {hoveredBeat.isPitchInfluenced ? 'Pitch' : 'Pattern'}
                                    </span>
                                </>
                            )}
                            {hoveredBeat.isDownbeat && (
                                <>
                                    <span className="button-timeline-tooltip-separator">•</span>
                                    <span className="button-timeline-tooltip-downbeat">
                                        Downbeat
                                    </span>
                                </>
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="button-timeline-tooltip-header">
                            <span className="button-timeline-tooltip-button button-timeline-tooltip-skeleton">--</span>
                            {showBeatIndices && (
                                <span className="button-timeline-tooltip-beat button-timeline-tooltip-skeleton">Beat --</span>
                            )}
                        </div>
                        <div className="button-timeline-tooltip-details">
                            <span className="button-timeline-tooltip-time button-timeline-tooltip-skeleton">0.00s</span>
                            <span className="button-timeline-tooltip-separator">•</span>
                            <span className="button-timeline-tooltip-source button-timeline-tooltip-skeleton">--</span>
                            <span className="button-timeline-tooltip-separator">•</span>
                            <span className="button-timeline-tooltip-influence button-timeline-tooltip-skeleton">--</span>
                        </div>
                    </>
                )}
            </div>

            {/* Controls */}
            <div className="button-timeline-controls">
                <button
                    className="button-timeline-play-btn"
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
                <span className="button-timeline-time">
                    {formatTime(smoothTime)} / {formatTime(duration)}
                </span>
                <span className="button-timeline-info">
                    {visibleButtons.length} beats visible
                </span>
            </div>

            {/* Legend */}
            <div className="button-timeline-legend">
                {isDDR ? (
                    Object.entries(DDR_BUTTON_CONFIG).map(([key, config]) => (
                        <div key={key} className="button-timeline-legend-item">
                            <span
                                className="button-timeline-legend-icon"
                                style={{ color: config.color }}
                            >
                                {config.icon}
                            </span>
                            <span className="button-timeline-legend-label">{config.label}</span>
                        </div>
                    ))
                ) : (
                    Object.entries(GUITAR_HERO_BUTTON_CONFIG).map(([key, config]) => (
                        <div key={key} className="button-timeline-legend-item">
                            <span
                                className="button-timeline-legend-fret"
                                style={{ background: config.color }}
                            >
                                {key}
                            </span>
                            <span className="button-timeline-legend-label">{config.label}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default ButtonTimeline;
