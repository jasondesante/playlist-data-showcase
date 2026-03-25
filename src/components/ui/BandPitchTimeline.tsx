/**
 * BandPitchTimeline Component (Task 4.2)
 *
 * A standalone reusable component that displays a single band's pitch timeline.
 * This component is used 3 times in the MultiBandPitchVisualization (Low/Mid/High bands).
 *
 * Features:
 * - Single band's pitch timeline (reused 3 times)
 * - Props: band, pitches, currentTime, isPlaying, isDominant
 * - Band color coding
 * - Note names on hover
 * - Unvoiced markers as gray dots
 * - Enhanced styling for dominant band
 * - Sync with audio playback
 */

import { useRef, useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Star } from 'lucide-react';
import './BandPitchTimeline.css';
import type { PitchAtBeat, PitchResult } from '../../types/levelGeneration';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';
import { usePlaylistStore } from '../../store/playlistStore';
import { useTrackDuration } from '../../hooks/useTrackDuration';
import { cn } from '../../utils/cn';

// ============================================================
// Types
// ============================================================

/** Band type */
export type Band = 'low' | 'mid' | 'high';

/**
 * Props for the BandPitchTimeline component
 */
export interface BandPitchTimelineProps {
    /** Which frequency band this timeline represents */
    band: Band;
    /** Array of pitch data for this band */
    pitches: PitchAtBeat[];
    /** Current audio playback time in seconds (optional - uses store if not provided) */
    currentTime?: number;
    /** Whether audio is currently playing (optional - uses store if not provided) */
    isPlaying?: boolean;
    /** Total audio duration in seconds (optional - uses store if not provided) */
    duration?: number;
    /** Whether this band is the dominant band (gets enhanced styling) */
    isDominant?: boolean;
    /** Callback when user clicks on a pitch */
    onPitchClick?: (pitch: PitchAtBeat) => void;
    /** Callback when user seeks to a time position */
    onSeek?: (time: number) => void;
    /** Anticipation window in seconds for future pitches */
    anticipationWindow?: number;
    /** Past window in seconds for showing pitches that have passed */
    pastWindow?: number;
    /** The index of the currently selected pitch (for visual highlight) */
    selectedPitchIndex?: number;
    /** Additional CSS class names */
    className?: string;
}

/**
 * Band color scheme (as defined in the plan)
 */
export const BAND_COLORS: Record<Band, string> = {
    low: '#3b82f6',    // Blue
    mid: '#22c55e',    // Green
    high: '#f97316',   // Orange
};

/**
 * Frequency range labels for each band
 */
export const BAND_RANGES: Record<Band, string> = {
    low: '20-500 Hz',
    mid: '500-2000 Hz',
    high: '2000-20000 Hz',
};

/** Pixels of movement before treating as drag (vs click) */
const DRAG_THRESHOLD = 5;

/** MIDI note range to display (C2 to C6 covers most musical content) */
const MIN_MIDI_NOTE = 36; // C2
const MAX_MIDI_NOTE = 84; // C6
const MIDI_RANGE = MAX_MIDI_NOTE - MIN_MIDI_NOTE;

// ============================================================
// Helper Functions
// ============================================================

/**
 * Calculate Y position (0-1) from MIDI note number
 * Returns 0.5 for notes outside range
 */
export function calculateYPosition(midiNote: number | null): number {
    if (midiNote === null) return 0.5;
    const clampedNote = Math.max(MIN_MIDI_NOTE, Math.min(MAX_MIDI_NOTE, midiNote));
    return (clampedNote - MIN_MIDI_NOTE) / MIDI_RANGE;
}

/**
 * Get probability-based opacity value
 */
export function getProbabilityOpacity(probability: number): number {
    if (probability > 0.8) return 1;
    if (probability > 0.5) return 0.7;
    return 0.4;
}

// ============================================================
// Memoized Marker Component for Performance
// ============================================================

interface PitchMarkerProps {
    pitch: PitchAtBeat;
    position: number;
    yPosition: number;
    isPast: boolean;
    color: string;
    isSelected: boolean;
    onClick: (pitch: PitchAtBeat, event: React.MouseEvent) => void;
}

const PitchMarker = memo(function PitchMarker({
    pitch,
    position,
    yPosition,
    isPast,
    color,
    isSelected,
    onClick,
}: PitchMarkerProps) {
    const pitchData: PitchResult | null = pitch.pitch;
    const isVoiced = pitchData?.isVoiced ?? false;
    const probability = pitchData?.probability ?? 0;

    // Prevent mousedown from bubbling to parent track to avoid triggering seek
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
    }, []);

    return (
        <div
            className={cn(
                'band-pitch-marker',
                isVoiced ? 'band-pitch-marker--voiced' : 'band-pitch-marker--unvoiced',
                isPast && 'band-pitch-marker--past',
                isSelected && 'band-pitch-marker--selected'
            )}
            style={{
                left: `${position * 100}%`,
                bottom: `${yPosition * 100}%`,
            }}
            onClick={(e) => onClick(pitch, e)}
            onMouseDown={handleMouseDown}
            title={
                isVoiced
                    ? `${pitchData?.noteName || 'Note'} at ${pitch.timestamp.toFixed(2)}s, probability ${Math.round(probability * 100)}%`
                    : `Unvoiced beat at ${pitch.timestamp.toFixed(2)}s`
            }
        >
            <div
                className="band-pitch-marker-dot"
                style={{
                    width: `${6 + probability * 8}px`,
                    height: `${6 + probability * 8}px`,
                    backgroundColor: isVoiced ? color : '#6b7280',
                    opacity: isVoiced ? getProbabilityOpacity(probability) : 0.3,
                }}
            />
            {isVoiced && pitchData?.noteName && (
                <span className="band-pitch-marker-label">
                    {pitchData.noteName}
                </span>
            )}
        </div>
    );
});

// ============================================================
// Main Component
// ============================================================

/**
 * BandPitchTimeline
 *
 * Displays a single band's pitch timeline. This is a reusable component
 * that can be used independently or as part of MultiBandPitchVisualization.
 */
export function BandPitchTimeline({
    band,
    pitches,
    currentTime: propCurrentTime,
    isPlaying: propIsPlaying,
    duration: propDuration,
    isDominant = false,
    onPitchClick,
    onSeek: propOnSeek,
    anticipationWindow: propAnticipationWindow,
    pastWindow: propPastWindow,
    selectedPitchIndex,
    className,
}: BandPitchTimelineProps) {
    const trackRef = useRef<HTMLDivElement>(null);
    const quickScrollRef = useRef<HTMLDivElement>(null);

    // Audio player state from store (used if props not provided)
    const storeSeek = useAudioPlayerStore((state) => state.seek);
    const currentAudioUrl = useAudioPlayerStore((state) => state.currentUrl);
    const storeCurrentTime = useAudioPlayerStore((state) => state.currentTime);
    const playbackState = useAudioPlayerStore((state) => state.playbackState);
    const storeIsPlaying = playbackState === 'playing';

    // Get selected track from playlist store
    const selectedTrack = usePlaylistStore((state) => state.selectedTrack);

    // Get duration from hook if not provided
    const storeDuration = useTrackDuration();

    // Resolve values from props or store
    const currentTime = propCurrentTime ?? storeCurrentTime;
    const isPlaying = propIsPlaying ?? storeIsPlaying;
    const duration = propDuration ?? storeDuration ?? 0;

    // Default window values
    const anticipationWindow = propAnticipationWindow ?? 2.0;
    const pastWindow = propPastWindow ?? 4.0;

    // Get band color and range
    const color = BAND_COLORS[band];
    const frequencyRange = BAND_RANGES[band];

    // Smart seek wrapper
    const seek = useCallback((time: number) => {
        if (propOnSeek) {
            propOnSeek(time);
        } else {
            storeSeek(time, currentAudioUrl || selectedTrack?.audio_url);
        }
    }, [propOnSeek, storeSeek, currentAudioUrl, selectedTrack?.audio_url]);

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
    const smoothTimeRef = useRef(smoothTime);

    // Keep smoothTimeRef in sync
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

    // Track previous isPlaying state
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

    // Animation loop
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

    // Handle seek events
    useEffect(() => {
        if (!isPlaying) {
            setSmoothTime(currentTime);
        }
    }, [currentTime, isPlaying]);

    // ========================================
    // Drag-to-scrub and click-to-seek
    // ========================================

    const [isDragging, setIsDragging] = useState(false);
    const dragStartXRef = useRef<number>(0);
    const dragStartTimeRef = useRef<number>(0);

    // Quick scroll state
    const [isQuickScrollDragging, setIsQuickScrollDragging] = useState(false);

    // Total visible time window
    const totalWindow = pastWindow + anticipationWindow;

    // NOW position (center of visible window)
    const nowPosition = 0.5;

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

    // Quick scroll drag handling
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
    // Pitch Filtering and Positioning
    // ========================================

    // Calculate time window for visible pitches
    const minTime = smoothTime - pastWindow;
    const maxTime = smoothTime + anticipationWindow;

    // Calculate position for a timestamp
    const calculatePosition = useCallback((timestamp: number): number => {
        const timeUntilEvent = timestamp - smoothTime;
        return 0.5 + (timeUntilEvent / anticipationWindow) * 0.5;
    }, [smoothTime, anticipationWindow]);

    // Get visible pitches
    const visiblePitches = useMemo(() => {
        return pitches
            .map((pitch) => {
                const position = calculatePosition(pitch.timestamp);
                const midiNote = pitch.pitch?.midiNote ?? null;
                const yPosition = calculateYPosition(midiNote);
                const isPast = pitch.timestamp < smoothTime - 0.05;

                return {
                    pitch,
                    position,
                    yPosition,
                    isPast,
                };
            })
            .filter((item) => {
                const timeMatch = item.pitch.timestamp >= minTime && item.pitch.timestamp <= maxTime;
                const positionMatch = item.position >= 0 && item.position <= 1;
                return timeMatch && positionMatch;
            });
    }, [pitches, smoothTime, minTime, maxTime, calculatePosition]);

    // Calculate statistics
    const stats = useMemo(() => {
        const count = pitches.length;
        const voicedCount = pitches.filter(p => p.pitch?.isVoiced).length;
        const avgProbability = count > 0
            ? pitches.reduce((sum, p) => sum + (p.pitch?.probability ?? 0), 0) / count
            : 0;

        return { count, voicedCount, avgProbability };
    }, [pitches]);

    // Handle click on pitch
    const handlePitchClick = useCallback((pitch: PitchAtBeat, event: React.MouseEvent) => {
        event.stopPropagation();
        onPitchClick?.(pitch);
    }, [onPitchClick]);

    // Y-axis labels (showing note names)
    const yAxisLabels = useMemo(() => {
        const labels: { y: number; label: string }[] = [];
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

        for (let midi = MIN_MIDI_NOTE; midi <= MAX_MIDI_NOTE; midi += 12) {
            const y = calculateYPosition(midi);
            const octave = Math.floor(midi / 12) - 1;
            const noteIndex = midi % 12;
            labels.push({
                y,
                label: `${noteNames[noteIndex]}${octave}`,
            });
        }
        return labels;
    }, []);

    // Empty state
    if (pitches.length === 0) {
        return (
            <div className={cn('band-pitch-timeline', 'band-pitch-timeline--empty', className)}>
                <div className="band-pitch-timeline-header">
                    <div className="band-pitch-timeline-label" style={{ color }}>
                        {band.charAt(0).toUpperCase() + band.slice(1)}
                    </div>
                    <div className="band-pitch-timeline-range">{frequencyRange}</div>
                </div>
                <div className="band-pitch-empty-content">
                    <p>No pitch data for this band</p>
                </div>
            </div>
        );
    }

    return (
        <div
            className={cn(
                'band-pitch-timeline',
                isDominant && 'band-pitch-timeline--dominant',
                className
            )}
            data-band={band}
        >
            {/* Band header */}
            <div className="band-pitch-timeline-header">
                <div className="band-pitch-timeline-label" style={{ color }}>
                    {band.charAt(0).toUpperCase() + band.slice(1)}
                    {isDominant && (
                        <span className="band-pitch-dominant-badge" title="Dominant band">
                            <Star size={10} />
                        </span>
                    )}
                </div>
                <div className="band-pitch-timeline-range">{frequencyRange}</div>
                <div className="band-pitch-timeline-stats">
                    <span className="band-pitch-timeline-count">
                        {stats.voicedCount}/{stats.count}
                    </span>
                    <span className="band-pitch-timeline-divider">|</span>
                    <span className="band-pitch-timeline-prob">
                        {Math.round(stats.avgProbability * 100)}%
                    </span>
                </div>
            </div>

            {/* Timeline container with Y-axis */}
            <div className="band-pitch-timeline-container">
                {/* Y-Axis */}
                <div className="band-pitch-y-axis">
                    {yAxisLabels.map((label, i) => (
                        <span
                            key={i}
                            className="band-pitch-y-label"
                            style={{ bottom: `${label.y * 100}%` }}
                        >
                            {label.label}
                        </span>
                    ))}
                </div>

                {/* Timeline track */}
                <div
                    ref={trackRef}
                    className={cn(
                        'band-pitch-timeline-track',
                        'band-pitch-timeline-track--draggable',
                        isDragging && 'band-pitch-timeline-track--dragging'
                    )}
                    onMouseDown={handleMouseDown}
                    role="slider"
                    tabIndex={0}
                    aria-label={`${band} band pitch timeline`}
                    aria-valuemin={0}
                    aria-valuemax={duration}
                    aria-valuenow={smoothTime}
                >
                    {/* Background */}
                    <div className="band-pitch-timeline-background" style={{
                        background: `linear-gradient(90deg,
                            hsl(var(--surface-3)) 0%,
                            hsl(var(--surface-2)) 30%,
                            hsl(var(--surface-2)) 70%,
                            hsl(var(--surface-3)) 100%
                        )`
                    }} />

                    {/* Band color accent line */}
                    <div className="band-pitch-timeline-accent" style={{ backgroundColor: color }} />

                    {/* Horizontal grid lines (pitch reference) */}
                    {yAxisLabels.map((label, i) => (
                        <div
                            key={`grid-${i}`}
                            className="band-pitch-grid-line"
                            style={{ bottom: `${label.y * 100}%` }}
                        />
                    ))}

                    {/* Pitch markers */}
                    {visiblePitches.map(({ pitch, position, yPosition, isPast }) => (
                        <PitchMarker
                            key={`pitch-${pitch.beatIndex}`}
                            pitch={pitch}
                            position={position}
                            yPosition={yPosition}
                            isPast={isPast}
                            color={color}
                            isSelected={pitch.beatIndex === selectedPitchIndex}
                            onClick={handlePitchClick}
                        />
                    ))}

                    {/* Now line (playhead) */}
                    <div
                        className="band-pitch-now-line"
                        style={{ left: `${nowPosition * 100}%` }}
                    >
                        <div className="band-pitch-now-line-inner" style={{ backgroundColor: color }} />
                        <span className="band-pitch-now-label">NOW</span>
                    </div>
                </div>
            </div>

            {/* Quick scrollbar */}
            {duration > 0 && (
                <div className="band-pitch-quickscroll">
                    <div
                        ref={quickScrollRef}
                        className="band-pitch-quickscroll-track"
                        onClick={handleQuickScrollClick}
                        onMouseDown={handleQuickScrollDragStart}
                    >
                        {/* Pitch density markers */}
                        {pitches
                            .filter((_, idx) => idx % Math.max(1, Math.floor(pitches.length / 50)) === 0)
                            .map((pitch, index) => {
                                const position = pitch.timestamp / duration;
                                const isVoiced = pitch.pitch?.isVoiced ?? false;
                                return (
                                    <div
                                        key={`quickscroll-${band}-${index}`}
                                        className={cn(
                                            'band-pitch-quickscroll-marker',
                                            !isVoiced && 'band-pitch-quickscroll-marker--unvoiced'
                                        )}
                                        style={{
                                            left: `${position * 100}%`,
                                            backgroundColor: isVoiced ? color : '#6b7280',
                                        }}
                                    />
                                );
                            })}

                        {/* Viewport indicator */}
                        <div
                            className="band-pitch-quickscroll-viewport"
                            style={{
                                left: `${Math.max(0, ((smoothTime - pastWindow) / duration) * 100)}%`,
                                width: `${Math.min(100, (totalWindow / duration) * 100)}%`,
                            }}
                        />

                        {/* Current position indicator */}
                        <div
                            className="band-pitch-quickscroll-position"
                            style={{ left: `${(smoothTime / duration) * 100}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default BandPitchTimeline;
