/**
 * MelodySegmentTimeline Component
 *
 * A horizontal timeline visualization showing melody segments grouped by direction.
 * Features:
 * - Consecutive same-direction beats displayed as colored regions
 * - Color-coded by direction:
 *   - Up (ascending) → green
 *   - Down (descending) → red
 *   - Stable → blue
 *   - None (no pitch) → gray
 * - Labels showing note span (start → end)
 * - Sync with audio playback (playhead)
 * - Click to seek, hover for segment details
 *
 * Task 5.5: Create MelodySegmentTimeline Component
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import './MelodySegmentTimeline.css';
import { cn } from '../../utils/cn';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';
import { usePlaylistStore } from '../../store/playlistStore';
import { useTrackDuration } from '../../hooks/useTrackDuration';
import type { MelodySegment, PitchAtBeat } from '../../types/levelGeneration';

// ============================================================
// Types
// ============================================================

export interface MelodySegmentTimelineProps {
    /** Array of melody segments to display */
    segments: MelodySegment[];
    /** Array of pitch data linked to beats (for timestamp calculation) */
    pitchesByBeat?: PitchAtBeat[];
    /** Callback when a segment is clicked */
    onSegmentClick?: (segment: MelodySegment) => void;
    /** The index of the currently selected segment */
    selectedSegmentIndex?: number;
    /** Whether the timeline is disabled */
    disabled?: boolean;
    /** Anticipation window in seconds for future segments */
    anticipationWindow?: number;
    /** Past window in seconds */
    pastWindow?: number;
    /** Show segment indices */
    showSegmentIndices?: boolean;
    /** Height of each segment row in pixels */
    segmentHeight?: number;
    /** Additional CSS class names */
    className?: string;
}

/** Internal representation of a visible segment */
interface VisibleSegment {
    segment: MelodySegment;
    segmentIndex: number;
    position: number; // 0-1 horizontal position (start)
    width: number; // 0-1 width
    isPast: boolean;
    isCurrent: boolean;
    startTime: number;
    endTime: number;
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
    none: { symbol: '○', color: '#6b7280', label: 'No pitch' },
};

// ============================================================
// Helper Functions
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

/**
 * Get timestamps for a segment from pitch data
 */
function getSegmentTimestamps(
    segment: MelodySegment,
    pitchesByBeat: PitchAtBeat[]
): { startTime: number; endTime: number } {
    // Find timestamps for start and end beats
    const startBeat = pitchesByBeat.find(p => p.beatIndex === segment.startBeat);
    const endBeat = pitchesByBeat.find(p => p.beatIndex === segment.endBeat);

    return {
        startTime: startBeat?.timestamp ?? 0,
        endTime: endBeat?.timestamp ?? (startBeat?.timestamp ?? 0) + 0.5,
    };
}

/**
 * Calculate semitone distance description
 */
function getSemitoneDescription(semitones: number): string {
    if (semitones === 0) return 'no change';
    const abs = Math.abs(semitones);
    const direction = semitones > 0 ? 'up' : 'down';
    return `${abs} semitone${abs !== 1 ? 's' : ''} ${direction}`;
}

// ============================================================
// Main Component
// ============================================================

export function MelodySegmentTimeline({
    segments,
    pitchesByBeat = [],
    onSegmentClick,
    selectedSegmentIndex,
    disabled = false,
    anticipationWindow = 6.0,
    pastWindow = 3.0,
    showSegmentIndices = false,
    segmentHeight = 36,
    className,
}: MelodySegmentTimelineProps) {
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

    // Smart seek wrapper
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

    // Container ref
    const trackRef = useRef<HTMLDivElement>(null);

    // Drag state
    const [isDragging, setIsDragging] = useState(false);
    const dragStartXRef = useRef(0);
    const dragStartTimeRef = useRef(0);

    // Hover state
    const [hoveredSegment, setHoveredSegment] = useState<VisibleSegment | null>(null);

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

    // Enrich segments with timestamp data
    const enrichedSegments = useMemo(() => {
        return segments.map((segment, index) => {
            const { startTime, endTime } = getSegmentTimestamps(segment, pitchesByBeat);
            return { segment, segmentIndex: index, startTime, endTime };
        });
    }, [segments, pitchesByBeat]);

    // Get visible segments within the time window
    const visibleSegments = useMemo((): VisibleSegment[] => {
        const windowStart = smoothTime - pastWindow;
        const windowEnd = smoothTime + anticipationWindow;

        return enrichedSegments
            .filter(({ startTime, endTime }) => endTime >= windowStart && startTime <= windowEnd)
            .map(({ segment, segmentIndex, startTime, endTime }) => {
                const position = calculatePosition(startTime);
                const endPosition = calculatePosition(endTime);
                const width = Math.max(0.01, endPosition - position);

                const isPast = endTime < smoothTime - 0.1;
                const isCurrent = !isPast && startTime <= smoothTime && endTime >= smoothTime;

                return {
                    segment,
                    segmentIndex,
                    position,
                    width,
                    isPast,
                    isCurrent,
                    startTime,
                    endTime,
                };
            })
            .filter((vs) => vs.position + vs.width >= 0 && vs.position <= 1);
    }, [enrichedSegments, smoothTime, pastWindow, anticipationWindow, calculatePosition]);

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

    // Handle segment click
    const handleSegmentClick = useCallback((event: React.MouseEvent, vs: VisibleSegment) => {
        event.stopPropagation();
        // Seek to the start of the segment
        seek(vs.startTime);
        onSegmentClick?.(vs.segment);
    }, [seek, onSegmentClick]);

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
    if (segments.length === 0) {
        return (
            <div className={cn('melody-segment-timeline', 'melody-segment-timeline--empty', className)}>
                <p className="melody-segment-timeline-empty-message">No melody segments available</p>
            </div>
        );
    }

    return (
        <div className={cn('melody-segment-timeline', className)}>
            {/* Timeline Track */}
            <div
                ref={trackRef}
                className={cn(
                    'melody-segment-track',
                    isDragging && 'dragging',
                    disabled && 'disabled'
                )}
                onMouseDown={handleMouseDown}
                role="slider"
                aria-label="Melody segment timeline"
                aria-valuemin={0}
                aria-valuemax={duration || 0}
                aria-valuenow={smoothTime}
                tabIndex={disabled ? -1 : 0}
            >
                {/* Background layers */}
                <div className="melody-segment-background" />
                <div
                    className="melody-segment-past-region"
                    style={{ width: `${nowPosition * 100}%` }}
                />
                <div
                    className="melody-segment-future-region"
                    style={{ width: `${(1 - nowPosition) * 100}%` }}
                />

                {/* Center line */}
                <div className="melody-segment-center-line" />

                {/* Segment regions */}
                {visibleSegments.map((vs) => {
                    const { segment, segmentIndex, position, width, isPast, isCurrent } = vs;
                    const direction = segment.direction as Direction;
                    const config = DIRECTION_CONFIG[direction] || DIRECTION_CONFIG.none;

                    const isSelected = segmentIndex === selectedSegmentIndex;
                    const isHovered = hoveredSegment?.segmentIndex === segmentIndex;

                    return (
                        <div
                            key={`segment-${segmentIndex}`}
                            className={cn(
                                'melody-segment-region',
                                `melody-segment-region--${direction}`,
                                isPast && 'melody-segment-region--past',
                                isCurrent && 'melody-segment-region--current',
                                isSelected && 'melody-segment-region--selected',
                                isHovered && 'melody-segment-region--hovered',
                                onSegmentClick && 'melody-segment-region--selectable'
                            )}
                            style={{
                                left: `${position * 100}%`,
                                width: `${width * 100}%`,
                                height: segmentHeight,
                                '--segment-color': config.color,
                            } as React.CSSProperties}
                            onClick={(e) => handleSegmentClick(e, vs)}
                            onMouseEnter={() => setHoveredSegment(vs)}
                            onMouseLeave={() => setHoveredSegment(null)}
                            role={onSegmentClick ? 'button' : undefined}
                            tabIndex={onSegmentClick ? 0 : undefined}
                            aria-label={`${config.label} segment, beats ${segment.startBeat}-${segment.endBeat}`}
                        >
                            {/* Segment content */}
                            <div className="melody-segment-content">
                                {/* Direction symbol */}
                                <span
                                    className="melody-segment-symbol"
                                    style={{ color: config.color }}
                                >
                                    {config.symbol}
                                </span>

                                {/* Note span (if available) */}
                                {segment.startNote && segment.endNote && (
                                    <span className="melody-segment-notes">
                                        {segment.startNote}
                                        {segment.startNote !== segment.endNote && (
                                            <>
                                                <span className="melody-segment-arrow">→</span>
                                                {segment.endNote}
                                            </>
                                        )}
                                    </span>
                                )}

                                {/* Beat range (shown on wider segments) */}
                                {width > 0.08 && (
                                    <span className="melody-segment-beats">
                                        {segment.endBeat - segment.startBeat + 1} beats
                                    </span>
                                )}

                                {/* Segment index (optional) */}
                                {showSegmentIndices && width > 0.05 && (
                                    <span className="melody-segment-index">
                                        #{segmentIndex + 1}
                                    </span>
                                )}
                            </div>

                            {/* Semitones indicator (for larger intervals) */}
                            {segment.semitonesSpanned !== 0 && width > 0.1 && (
                                <span
                                    className={cn(
                                        'melody-segment-semitones',
                                        segment.semitonesSpanned > 0 ? 'melody-segment-semitones--up' : 'melody-segment-semitones--down'
                                    )}
                                >
                                    {segment.semitonesSpanned > 0 ? '+' : ''}{segment.semitonesSpanned}st
                                </span>
                            )}
                        </div>
                    );
                })}

                {/* NOW line */}
                <div
                    className="melody-segment-now-line"
                    style={{ left: `${nowPosition * 100}%` }}
                >
                    <div className="melody-segment-now-line-inner" />
                    <span className="melody-segment-now-label">NOW</span>
                </div>
            </div>

            {/* Hover tooltip */}
            {hoveredSegment && (
                <div className="melody-segment-tooltip">
                    <div className="melody-segment-tooltip-header">
                        <span
                            className="melody-segment-tooltip-direction"
                            style={{ color: DIRECTION_CONFIG[hoveredSegment.segment.direction as Direction]?.color }}
                        >
                            {DIRECTION_CONFIG[hoveredSegment.segment.direction as Direction]?.symbol}{' '}
                            {DIRECTION_CONFIG[hoveredSegment.segment.direction as Direction]?.label}
                        </span>
                        {showSegmentIndices && (
                            <span className="melody-segment-tooltip-index">
                                Segment #{hoveredSegment.segmentIndex + 1}
                            </span>
                        )}
                    </div>
                    <div className="melody-segment-tooltip-details">
                        <div className="melody-segment-tooltip-row">
                            <span className="melody-segment-tooltip-label">Beats:</span>
                            <span className="melody-segment-tooltip-value">
                                {hoveredSegment.segment.startBeat} - {hoveredSegment.segment.endBeat}
                                <span className="melody-segment-tooltip-secondary">
                                    ({hoveredSegment.segment.endBeat - hoveredSegment.segment.startBeat + 1} total)
                                </span>
                            </span>
                        </div>
                        {hoveredSegment.segment.startNote && hoveredSegment.segment.endNote && (
                            <div className="melody-segment-tooltip-row">
                                <span className="melody-segment-tooltip-label">Notes:</span>
                                <span className="melody-segment-tooltip-value">
                                    {hoveredSegment.segment.startNote} → {hoveredSegment.segment.endNote}
                                </span>
                            </div>
                        )}
                        <div className="melody-segment-tooltip-row">
                            <span className="melody-segment-tooltip-label">Interval:</span>
                            <span className="melody-segment-tooltip-value">
                                {getSemitoneDescription(hoveredSegment.segment.semitonesSpanned)}
                            </span>
                        </div>
                        <div className="melody-segment-tooltip-row">
                            <span className="melody-segment-tooltip-label">Time:</span>
                            <span className="melody-segment-tooltip-value">
                                {formatTime(hoveredSegment.startTime)} - {formatTime(hoveredSegment.endTime)}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Controls */}
            <div className="melody-segment-controls">
                <button
                    className="melody-segment-play-btn"
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
                <span className="melody-segment-time">
                    {formatTime(smoothTime)} / {formatTime(duration)}
                </span>
                <span className="melody-segment-info">
                    {visibleSegments.length} of {segments.length} segments visible
                </span>
            </div>

            {/* Legend */}
            <div className="melody-segment-legend">
                {Object.entries(DIRECTION_CONFIG).map(([key, config]) => (
                    <div key={key} className="melody-segment-legend-item">
                        <span
                            className="melody-segment-legend-symbol"
                            style={{ color: config.color }}
                        >
                            {config.symbol}
                        </span>
                        <span className="melody-segment-legend-label">{config.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default MelodySegmentTimeline;
