/**
 * PitchTimeline Component
 *
 * A horizontal timeline visualization showing pitch detection results at beat timestamps.
 * Features:
 * - Y-axis = pitch (frequency or MIDI note number)
 * - Color by band (low=blue, mid=green, high=orange)
 * - Size/opacity based on probability
 * - Unvoiced beats shown as gray gaps
 * - Sync with audio playback (playhead)
 * - Click to select pitch for inspector
 *
 * Task 3.2: Create PitchTimeline Component
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import './PitchTimeline.css';
import { cn } from '../../utils/cn';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';
import { usePlaylistStore } from '../../store/playlistStore';
import { useTrackDuration } from '../../hooks/useTrackDuration';
import type { PitchAtBeat, PitchResult } from '../../types/levelGeneration';

// ============================================================
// Types
// ============================================================

export interface PitchTimelineProps {
    /** Array of pitch data linked to beats */
    pitches: PitchAtBeat[];
    /** The band being displayed (affects color). Deprecated: pitch detection is now full-spectrum. */
    band?: 'low' | 'mid' | 'high';
    /** Callback when a pitch is clicked for inspection */
    onPitchClick?: (pitch: PitchAtBeat) => void;
    /** The index of the currently selected pitch (for visual highlight) */
    selectedPitchIndex?: number;
    /** Whether the timeline is disabled */
    disabled?: boolean;
    /** Anticipation window in seconds for future beats */
    anticipationWindow?: number;
    /** Past window in seconds */
    pastWindow?: number;
    /** Whether to show MIDI note numbers on Y-axis (default: false, shows note names) */
    showMidiNumbers?: boolean;
    /** Additional CSS class names */
    className?: string;
}

/** Internal representation of a visible pitch point */
interface VisiblePitch {
    pitch: PitchAtBeat;
    position: number; // 0-1 horizontal position
    yPosition: number; // 0-1 vertical position (0 = bottom, 1 = top)
    isPast: boolean;
    isUpcoming: boolean;
}

// ============================================================
// Constants
// ============================================================

/** MIDI note range to display (C2 to C7 covers most musical content) */
const MIN_MIDI_NOTE = 36; // C2
const MAX_MIDI_NOTE = 84; // C6
const MIDI_RANGE = MAX_MIDI_NOTE - MIN_MIDI_NOTE;

/** Band colors */
const BAND_COLORS: Record<string, string> = {
    low: '#3b82f6',
    mid: '#22c55e',
    high: '#f97316',
};

/** Note names for display */
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// ============================================================
// Helper Functions
// ============================================================

/**
 * Convert MIDI note number to note name (e.g., 60 -> "C4")
 */
function midiToNoteName(midi: number): string {
    const octave = Math.floor(midi / 12) - 1;
    const noteIndex = midi % 12;
    return `${NOTE_NAMES[noteIndex]}${octave}`;
}

/**
 * Calculate Y position (0-1) from MIDI note number
 * Returns 0.5 for notes outside range
 */
function calculateYPosition(midiNote: number | null): number {
    if (midiNote === null) return 0.5;
    const clampedNote = Math.max(MIN_MIDI_NOTE, Math.min(MAX_MIDI_NOTE, midiNote));
    return (clampedNote - MIN_MIDI_NOTE) / MIDI_RANGE;
}

/**
 * Get probability-based opacity class
 */
function getProbabilityClass(probability: number): string {
    if (probability > 0.8) return 'pitch-timeline-point--prob-high';
    if (probability > 0.5) return 'pitch-timeline-point--prob-medium';
    return 'pitch-timeline-point--prob-low';
}

/**
 * Get probability-based opacity value
 */
function getProbabilityOpacity(probability: number): number {
    if (probability > 0.8) return 1;
    if (probability > 0.5) return 0.7;
    return 0.4;
}

// ============================================================
// Main Component
// ============================================================

export function PitchTimeline({
    pitches,
    band,
    onPitchClick,
    selectedPitchIndex,
    disabled = false,
    anticipationWindow = 3.0,
    pastWindow = 3.0,
    showMidiNumbers = false,
    className,
}: PitchTimelineProps) {
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

    // Quick scroll state
    const [isQuickScrollDragging, setIsQuickScrollDragging] = useState(false);
    const quickScrollRef = useRef<HTMLDivElement>(null);

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

    // Get visible pitches within the time window
    const visiblePitches = useMemo((): VisiblePitch[] => {
        const windowStart = smoothTime - pastWindow;
        const windowEnd = smoothTime + anticipationWindow;

        return pitches
            .filter((p) => p.timestamp >= windowStart && p.timestamp <= windowEnd)
            .map((pitch) => {
                const position = calculatePosition(pitch.timestamp);
                const midiNote = pitch.pitch?.midiNote ?? null;
                const yPosition = calculateYPosition(midiNote);
                const isPast = pitch.timestamp < smoothTime - 0.05;
                const isUpcoming = pitch.timestamp > smoothTime + 0.05;

                return {
                    pitch,
                    position,
                    yPosition,
                    isPast,
                    isUpcoming,
                };
            })
            .filter((vp) => vp.position >= 0 && vp.position <= 1);
    }, [pitches, smoothTime, pastWindow, anticipationWindow, calculatePosition]);

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

    // Handle pitch mousedown to prevent track's drag/seek behavior
    const handlePitchMouseDown = useCallback((event: React.MouseEvent) => {
        event.stopPropagation();
    }, []);

    // Handle pitch click for inspector
    const handlePitchClick = useCallback((event: React.MouseEvent, pitch: PitchAtBeat) => {
        event.stopPropagation();
        onPitchClick?.(pitch);
    }, [onPitchClick]);

    // ========================================
    // Quick Scroll
    // ========================================

    const handleQuickScrollClick = useCallback(
        (event: React.MouseEvent) => {
            if (!quickScrollRef.current || !duration) return;

            const rect = quickScrollRef.current.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            const trackWidth = rect.width;
            const positionRatio = Math.max(0, Math.min(1, clickX / trackWidth));
            seek(positionRatio * duration);
        },
        [duration, seek]
    );

    const handleQuickScrollDragStart = useCallback(
        (event: React.MouseEvent) => {
            if (!quickScrollRef.current || !duration) return;

            event.preventDefault();
            setIsQuickScrollDragging(true);

            const rect = quickScrollRef.current.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            const trackWidth = rect.width;
            const positionRatio = Math.max(0, Math.min(1, clickX / trackWidth));
            seek(positionRatio * duration);
        },
        [duration, seek]
    );

    // Quick scroll drag handling
    useEffect(() => {
        if (!isQuickScrollDragging || !duration) return;

        let pendingSeek: number | null = null;
        let rafId: number | null = null;

        const handleQuickScrollMove = (event: MouseEvent) => {
            if (!quickScrollRef.current) return;

            const rect = quickScrollRef.current.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            const trackWidth = rect.width;
            const positionRatio = Math.max(0, Math.min(1, clickX / trackWidth));
            pendingSeek = positionRatio * duration;

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

    // Handle keyboard navigation for pitch selection
    const handlePitchKeyDown = useCallback((event: React.KeyboardEvent, pitch: PitchAtBeat) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onPitchClick?.(pitch);
        }
    }, [onPitchClick]);

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

    // Generate Y-axis labels
    const yAxisLabels = useMemo(() => {
        const labels: { y: number; label: string }[] = [];
        // Show labels at octave intervals (every 12 MIDI notes)
        for (let midi = MIN_MIDI_NOTE; midi <= MAX_MIDI_NOTE; midi += 12) {
            const y = calculateYPosition(midi);
            labels.push({
                y: y,
                label: showMidiNumbers ? `${midi}` : midiToNoteName(midi),
            });
        }
        return labels;
    }, [showMidiNumbers]);

    // Band color
    const bandColor = band ? BAND_COLORS[band] : BAND_COLORS.mid;

    // Empty state
    if (pitches.length === 0) {
        return (
            <div className={cn('pitch-timeline', 'pitch-timeline--empty', className)}>
                <p className="pitch-timeline-empty-message">No pitch data available</p>
            </div>
        );
    }

    return (
        <div className={cn('pitch-timeline', className)}>
            {/* Y-Axis + Track row */}
            <div className="pitch-timeline-body">
                {/* Y-Axis Labels */}
                <div className="pitch-timeline-y-axis">
                    {yAxisLabels.map((label, i) => {
                        const isFirst = i === 0;
                        const isLast = i === yAxisLabels.length - 1;
                        return (
                            <span
                                key={i}
                                className={cn(
                                    'pitch-timeline-y-label',
                                    isFirst && 'pitch-timeline-y-label--edge-bottom',
                                    isLast && 'pitch-timeline-y-label--edge-top'
                                )}
                                style={{ bottom: `${label.y * 100}%` }}
                            >
                                {label.label}
                            </span>
                        );
                    })}
                </div>

                {/* Timeline Track */}
                <div
                ref={trackRef}
                className={cn(
                    'pitch-timeline-track',
                    isDragging && 'dragging',
                    disabled && 'disabled'
                )}
                onMouseDown={handleMouseDown}
                role="slider"
                aria-label="Pitch timeline"
                aria-valuemin={0}
                aria-valuemax={duration || 0}
                aria-valuenow={smoothTime}
                tabIndex={disabled ? -1 : 0}
            >
                {/* Background layers */}
                <div className="pitch-timeline-background" />
                <div
                    className="pitch-timeline-past-region"
                    style={{ width: `${nowPosition * 100}%` }}
                />
                <div
                    className="pitch-timeline-future-region"
                    style={{ width: `${(1 - nowPosition) * 100}%` }}
                />

                {/* Horizontal grid lines (pitch reference) */}
                {yAxisLabels.map((label, i) => (
                    <div
                        key={`grid-${i}`}
                        className="pitch-timeline-grid-line"
                        style={{ bottom: `${label.y * 100}%` }}
                    />
                ))}

                {/* Pitch points */}
                {visiblePitches.map((vp, index) => {
                    const { pitch, position, yPosition, isPast } = vp;
                    const pitchData: PitchResult | null = pitch.pitch;
                    const isVoiced = pitchData?.isVoiced ?? false;
                    const probability = pitchData?.probability ?? 0;
                    const isSelected = pitch.beatIndex === selectedPitchIndex;

                    return (
                        <div
                            key={`pitch-${pitch.beatIndex}-${index}`}
                            className={cn(
                                'pitch-timeline-point',
                                isVoiced ? 'pitch-timeline-point--voiced' : 'pitch-timeline-point--unvoiced',
                                isPast && 'pitch-timeline-point--past',
                                isSelected && 'pitch-timeline-point--selected',
                                onPitchClick && 'pitch-timeline-point--selectable',
                                getProbabilityClass(probability)
                            )}
                            style={{
                                left: `${position * 100}%`,
                                bottom: `${yPosition * 100}%`,
                                // Use band color for voiced pitches, gray for unvoiced
                                backgroundColor: isVoiced ? bandColor : '#6b7280',
                                opacity: isVoiced ? getProbabilityOpacity(probability) : 0.3,
                                // Size based on probability
                                transform: `translate(-50%, 50%) scale(${isVoiced ? 0.6 + probability * 0.6 : 0.4})`,
                            }}
                            onMouseDown={handlePitchMouseDown}
                            onClick={(e) => handlePitchClick(e, pitch)}
                            onKeyDown={(e) => handlePitchKeyDown(e, pitch)}
                            role={onPitchClick ? 'button' : undefined}
                            tabIndex={onPitchClick ? 0 : undefined}
                            aria-label={
                                isVoiced
                                    ? `${pitchData?.noteName || 'Note'} at ${pitch.timestamp.toFixed(2)}s, probability ${Math.round(probability * 100)}%`
                                    : `Unvoiced beat at ${pitch.timestamp.toFixed(2)}s`
                            }
                        >
                            {/* Note label on hover */}
                            {isVoiced && pitchData?.noteName && (
                                <span className="pitch-timeline-point-label">
                                    {pitchData.noteName}
                                </span>
                            )}
                        </div>
                    );
                })}

                {/* NOW line */}
                <div
                    className="pitch-timeline-now-line"
                    style={{ left: `${nowPosition * 100}%` }}
                >
                    <div className="pitch-timeline-now-line-inner" />
                    <span className="pitch-timeline-now-label">NOW</span>
                </div>
            </div>
            </div>

            {/* Controls */}
            <div className="pitch-timeline-controls">
                <button
                    className="pitch-timeline-play-btn"
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
                <span className="pitch-timeline-time">
                    {formatTime(smoothTime)} / {formatTime(duration)}
                </span>
                <span className="pitch-timeline-info">
                    {visiblePitches.length} pitches visible
                </span>
            </div>

            {/* Quick Scroll */}
            {duration > 0 && (
                <div className="pitch-timeline-quickscroll">
                    <div
                        ref={quickScrollRef}
                        className="pitch-timeline-quickscroll-track"
                        onClick={handleQuickScrollClick}
                        onMouseDown={handleQuickScrollDragStart}
                    >
                        {/* Pitch density markers */}
                        {pitches
                            .filter((_, idx) => idx % Math.max(1, Math.floor(pitches.length / 80)) === 0)
                            .map((pitch, index) => {
                                const position = pitch.timestamp / duration;
                                const isVoiced = pitch.pitch?.isVoiced ?? false;
                                return (
                                    <div
                                        key={`quickscroll-${pitch.beatIndex}-${index}`}
                                        className={cn(
                                            'pitch-timeline-quickscroll-marker',
                                            !isVoiced && 'pitch-timeline-quickscroll-marker--unvoiced'
                                        )}
                                        style={{
                                            left: `${position * 100}%`,
                                            backgroundColor: isVoiced ? bandColor : '#6b7280',
                                        }}
                                    />
                                );
                            })}

                        {/* Viewport indicator */}
                        <div
                            className="pitch-timeline-quickscroll-viewport"
                            style={{
                                left: `${Math.max(0, ((smoothTime - pastWindow) / duration) * 100)}%`,
                                width: `${Math.min(100, (totalWindow / duration) * 100)}%`,
                            }}
                        />

                        {/* Current position indicator */}
                        <div
                            className="pitch-timeline-quickscroll-position"
                            style={{ left: `${(smoothTime / duration) * 100}%` }}
                        />
                    </div>
                </div>
            )}
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

export default PitchTimeline;
