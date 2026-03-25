/**
 * MelodyDirectionTimeline Component
 *
 * A horizontal timeline visualization showing pitch direction at each beat.
 * Features:
 * - Color-coded arrows:
 *   - Up (ascending) → green ↑
 *   - Down (descending) → red ↓
 *   - Stable → blue →
 *   - None (no pitch) → gray ●
 * - Size based on interval magnitude
 * - Hover shows semitones
 * - Sync with audio playback (playhead)
 *
 * Task 5.2: Create MelodyDirectionTimeline Component
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import './MelodyDirectionTimeline.css';
import { cn } from '../../utils/cn';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';
import { usePlaylistStore } from '../../store/playlistStore';
import { useTrackDuration } from '../../hooks/useTrackDuration';
import type { PitchAtBeat, IntervalCategory } from '../../types/levelGeneration';

// ============================================================
// Types
// ============================================================

export interface MelodyDirectionTimelineProps {
    /** Array of pitch data linked to beats with direction info */
    pitchesByBeat: PitchAtBeat[];
    /** Callback when a beat is clicked */
    onBeatClick?: (beat: PitchAtBeat) => void;
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

/** Internal representation of a visible direction arrow */
interface VisibleArrow {
    beat: PitchAtBeat;
    position: number; // 0-1 horizontal position
    isPast: boolean;
    isCurrent: boolean;
}

/** Direction type */
type Direction = 'up' | 'down' | 'stable' | 'none';

// ============================================================
// Constants
// ============================================================

/** Direction configuration for display */
const DIRECTION_CONFIG: Record<Direction, { symbol: string; color: string; label: string }> = {
    up: { symbol: '↑', color: '#22c55e', label: 'Ascending' },
    down: { symbol: '↓', color: '#ef4444', label: 'Descending' },
    stable: { symbol: '→', color: '#3b82f6', label: 'Stable' },
    none: { symbol: '●', color: '#6b7280', label: 'No pitch' },
};

/** Interval magnitude multipliers for size scaling */
const INTERVAL_SIZE_MAP: Record<IntervalCategory, number> = {
    unison: 0.6,
    small: 0.8,
    medium: 1.0,
    large: 1.2,
    very_large: 1.4,
};

// ============================================================
// Helper Functions
// ============================================================

/**
 * Get the display size multiplier based on interval category
 */
function getSizeMultiplier(intervalCategory: IntervalCategory | undefined): number {
    if (!intervalCategory) return 0.6;
    return INTERVAL_SIZE_MAP[intervalCategory] || 0.6;
}

/**
 * Format interval for display
 */
function formatInterval(semitones: number): string {
    if (semitones === 0) return 'unison';
    const absSemitones = Math.abs(semitones);

    // Musical interval names
    if (absSemitones === 1) return 'minor 2nd';
    if (absSemitones === 2) return 'major 2nd';
    if (absSemitones === 3) return 'minor 3rd';
    if (absSemitones === 4) return 'major 3rd';
    if (absSemitones === 5) return 'perfect 4th';
    if (absSemitones === 6) return 'tritone';
    if (absSemitones === 7) return 'perfect 5th';
    if (absSemitones === 8) return 'minor 6th';
    if (absSemitones === 9) return 'major 6th';
    if (absSemitones === 10) return 'minor 7th';
    if (absSemitones === 11) return 'major 7th';
    if (absSemitones === 12) return 'octave';
    return `${absSemitones} semitones`;
}

/**
 * Get interval category from semitones
 */
function getIntervalCategory(semitones: number): IntervalCategory {
    const abs = Math.abs(semitones);
    if (abs === 0) return 'unison';
    if (abs <= 2) return 'small';
    if (abs <= 4) return 'medium';
    if (abs <= 7) return 'large';
    return 'very_large';
}

// ============================================================
// Main Component
// ============================================================

export function MelodyDirectionTimeline({
    pitchesByBeat,
    onBeatClick,
    selectedBeatIndex,
    disabled = false,
    anticipationWindow = 4.0,
    pastWindow = 2.0,
    showBeatIndices = true,
    className,
}: MelodyDirectionTimelineProps) {
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
    const [hoveredBeat, setHoveredBeat] = useState<PitchAtBeat | null>(null);

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

    // Get visible arrows within the time window
    const visibleArrows = useMemo((): VisibleArrow[] => {
        const windowStart = smoothTime - pastWindow;
        const windowEnd = smoothTime + anticipationWindow;

        return pitchesByBeat
            .filter((p) => p.timestamp >= windowStart && p.timestamp <= windowEnd)
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
            .filter((va) => va.position >= 0 && va.position <= 1);
    }, [pitchesByBeat, smoothTime, pastWindow, anticipationWindow, calculatePosition]);

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
    const handleBeatClick = useCallback((event: React.MouseEvent, beat: PitchAtBeat) => {
        event.stopPropagation();
        onBeatClick?.(beat);
    }, [onBeatClick]);

    // Handle keyboard navigation
    const handleBeatKeyDown = useCallback((event: React.KeyboardEvent, beat: PitchAtBeat) => {
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
    if (pitchesByBeat.length === 0) {
        return (
            <div className={cn('melody-direction-timeline', 'melody-direction-timeline--empty', className)}>
                <p className="melody-direction-timeline-empty-message">No melody direction data available</p>
            </div>
        );
    }

    return (
        <div className={cn('melody-direction-timeline', className)}>
            {/* Timeline Track */}
            <div
                ref={trackRef}
                className={cn(
                    'melody-direction-track',
                    isDragging && 'dragging',
                    disabled && 'disabled'
                )}
                onMouseDown={handleMouseDown}
                role="slider"
                aria-label="Melody direction timeline"
                aria-valuemin={0}
                aria-valuemax={duration || 0}
                aria-valuenow={smoothTime}
                tabIndex={disabled ? -1 : 0}
            >
                {/* Background layers */}
                <div className="melody-direction-background" />
                <div
                    className="melody-direction-past-region"
                    style={{ width: `${nowPosition * 100}%` }}
                />
                <div
                    className="melody-direction-future-region"
                    style={{ width: `${(1 - nowPosition) * 100}%` }}
                />

                {/* Center line */}
                <div className="melody-direction-center-line" />

                {/* Direction arrows */}
                {visibleArrows.map((va, index) => {
                    const { beat, position, isPast, isCurrent } = va;
                    const direction = beat.direction as Direction;
                    const config = DIRECTION_CONFIG[direction] || DIRECTION_CONFIG.none;

                    // Get interval category and size
                    const intervalCategory = beat.intervalCategory || getIntervalCategory(beat.intervalFromPrevious || 0);
                    const sizeMultiplier = getSizeMultiplier(intervalCategory);

                    const isSelected = beat.beatIndex === selectedBeatIndex;

                    return (
                        <div
                            key={`arrow-${beat.beatIndex}-${index}`}
                            className={cn(
                                'melody-direction-arrow',
                                `melody-direction-arrow--${direction}`,
                                isPast && 'melody-direction-arrow--past',
                                isCurrent && 'melody-direction-arrow--current',
                                isSelected && 'melody-direction-arrow--selected',
                                onBeatClick && 'melody-direction-arrow--selectable'
                            )}
                            style={{
                                left: `${position * 100}%`,
                                color: config.color,
                                fontSize: `${16 * sizeMultiplier}px`,
                            }}
                            onClick={(e) => handleBeatClick(e, beat)}
                            onKeyDown={(e) => handleBeatKeyDown(e, beat)}
                            onMouseEnter={() => setHoveredBeat(beat)}
                            onMouseLeave={() => setHoveredBeat(null)}
                            role={onBeatClick ? 'button' : undefined}
                            tabIndex={onBeatClick ? 0 : undefined}
                            aria-label={`${config.label} at ${beat.timestamp.toFixed(2)}s`}
                        >
                            <span className="melody-direction-symbol">{config.symbol}</span>
                        </div>
                    );
                })}

                {/* NOW line */}
                <div
                    className="melody-direction-now-line"
                    style={{ left: `${nowPosition * 100}%` }}
                >
                    <div className="melody-direction-now-line-inner" />
                    <span className="melody-direction-now-label">NOW</span>
                </div>
            </div>

            {/* Hover tooltip */}
            {hoveredBeat && (
                <div className="melody-direction-tooltip">
                    <div className="melody-direction-tooltip-header">
                        <span
                            className="melody-direction-tooltip-direction"
                            style={{ color: DIRECTION_CONFIG[hoveredBeat.direction as Direction]?.color }}
                        >
                            {DIRECTION_CONFIG[hoveredBeat.direction as Direction]?.label}
                        </span>
                        {showBeatIndices && (
                            <span className="melody-direction-tooltip-beat">
                                Beat {hoveredBeat.beatIndex}
                            </span>
                        )}
                    </div>
                    <div className="melody-direction-tooltip-details">
                        <span className="melody-direction-tooltip-time">
                            {hoveredBeat.timestamp.toFixed(2)}s
                        </span>
                        {hoveredBeat.direction !== 'none' && (
                            <>
                                <span className="melody-direction-tooltip-separator">•</span>
                                <span className="melody-direction-tooltip-interval">
                                    {formatInterval(hoveredBeat.intervalFromPrevious || 0)}
                                    {hoveredBeat.intervalFromPrevious !== 0 && (
                                        <span className="melody-direction-tooltip-semitones">
                                            {' '}({hoveredBeat.intervalFromPrevious > 0 ? '+' : ''}{hoveredBeat.intervalFromPrevious} st)
                                        </span>
                                    )}
                                </span>
                            </>
                        )}
                        {hoveredBeat.pitch?.noteName && (
                            <>
                                <span className="melody-direction-tooltip-separator">•</span>
                                <span className="melody-direction-tooltip-note">
                                    {hoveredBeat.pitch.noteName}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Controls */}
            <div className="melody-direction-controls">
                <button
                    className="melody-direction-play-btn"
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
                <span className="melody-direction-time">
                    {formatTime(smoothTime)} / {formatTime(duration)}
                </span>
                <span className="melody-direction-info">
                    {visibleArrows.length} beats visible
                </span>
            </div>

            {/* Legend */}
            <div className="melody-direction-legend">
                {Object.entries(DIRECTION_CONFIG).map(([key, config]) => (
                    <div key={key} className="melody-direction-legend-item">
                        <span
                            className="melody-direction-legend-symbol"
                            style={{ color: config.color }}
                        >
                            {config.symbol}
                        </span>
                        <span className="melody-direction-legend-label">{config.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Format time in MM:SS format
 */
function formatTime(seconds: number): string {
    if (!Number.isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default MelodyDirectionTimeline;
