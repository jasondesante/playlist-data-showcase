/**
 * MultiBandPitchVisualization Component
 *
 * Displays three stacked timelines (Low/Mid/High) for pitch detection results.
 * Features:
 * - Three stacked timelines (Low/Mid/High) - similar to rhythm multi-band
 * - Each shows pitches for that band only
 * - Probability shown as opacity
 * - Voiced/unvoiced status visible
 * - Vertical time alignment
 * - Highlight dominant band with border/glow effect
 * - Sync with audio playback
 *
 * Task 4.1: MultiBandPitchVisualization Component
 */

import { useRef, useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Layers, Star } from 'lucide-react';
import './MultiBandPitchVisualization.css';
import { ZoomControls } from './ZoomControls';
import type { PitchAtBeat, BandPitchAtBeat, PitchResult } from '../../types/levelGeneration';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';
import { usePlaylistStore } from '../../store/playlistStore';
import { useTrackDuration } from '../../hooks/useTrackDuration';
import { cn } from '../../utils/cn';

// ============================================================
// Types
// ============================================================

export interface MultiBandPitchVisualizationProps {
    /** Band pitch data from the pitch analysis */
    bandPitches: Map<string, BandPitchAtBeat> | Record<string, BandPitchAtBeat> | null;
    /** The dominant band (highlighted) */
    dominantBand?: 'low' | 'mid' | 'high' | null;
    /** Current audio playback time in seconds (optional - uses store if not provided) */
    currentTime?: number;
    /** Total audio duration in seconds (optional - uses store if not provided) */
    duration?: number;
    /** Whether audio is currently playing (optional - uses store if not provided) */
    isPlaying?: boolean;
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

/** Band type */
type Band = 'low' | 'mid' | 'high';

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
function calculateYPosition(midiNote: number | null): number {
    if (midiNote === null) return 0.5;
    const clampedNote = Math.max(MIN_MIDI_NOTE, Math.min(MAX_MIDI_NOTE, midiNote));
    return (clampedNote - MIN_MIDI_NOTE) / MIDI_RANGE;
}

/**
 * Get probability-based opacity value
 */
function getProbabilityOpacity(probability: number): number {
    if (probability > 0.8) return 1;
    if (probability > 0.5) return 0.7;
    return 0.4;
}

/**
 * Convert bandPitches from potential object to Map
 */
function normalizeBandPitches(
    bandPitches: Map<string, BandPitchAtBeat> | Record<string, BandPitchAtBeat> | null
): Map<Band, BandPitchAtBeat> {
    const map = new Map<Band, BandPitchAtBeat>();

    if (!bandPitches) return map;

    if (bandPitches instanceof Map) {
        bandPitches.forEach((value, key) => {
            map.set(key as Band, value);
        });
    } else {
        Object.entries(bandPitches).forEach(([key, value]) => {
            map.set(key as Band, value);
        });
    }

    return map;
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
                'multi-pitch-marker',
                isVoiced ? 'multi-pitch-marker--voiced' : 'multi-pitch-marker--unvoiced',
                isPast && 'multi-pitch-marker--past',
                isSelected && 'multi-pitch-marker--selected'
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
                className="multi-pitch-marker-dot"
                style={{
                    width: `${6 + probability * 8}px`,
                    height: `${6 + probability * 8}px`,
                    backgroundColor: isVoiced ? color : '#6b7280',
                    opacity: isVoiced ? getProbabilityOpacity(probability) : 0.3,
                }}
            />
            {isVoiced && pitchData?.noteName && (
                <span className="multi-pitch-marker-label">
                    {pitchData.noteName}
                </span>
            )}
        </div>
    );
});

// ============================================================
// Single Band Timeline Component
// ============================================================

interface BandPitchTimelineProps {
    band: Band;
    pitches: PitchAtBeat[];
    color: string;
    frequencyRange: string;
    duration: number;
    isDominant: boolean;
    onPitchClick?: (pitch: PitchAtBeat) => void;
    anticipationWindow: number;
    pastWindow: number;
    selectedPitchIndex?: number;
}

function BandPitchTimeline({
    band,
    pitches,
    color,
    frequencyRange,
    duration,
    isDominant,
    onPitchClick,
    anticipationWindow,
    pastWindow,
    selectedPitchIndex,
}: BandPitchTimelineProps) {
    const trackRef = useRef<HTMLDivElement>(null);
    const quickScrollRef = useRef<HTMLDivElement>(null);

    // Audio player state
    const storeSeek = useAudioPlayerStore((state) => state.seek);
    const currentAudioUrl = useAudioPlayerStore((state) => state.currentUrl);
    const storeCurrentTime = useAudioPlayerStore((state) => state.currentTime);
    const playbackState = useAudioPlayerStore((state) => state.playbackState);
    const isPlaying = playbackState === 'playing';

    // Get selected track from playlist store
    const selectedTrack = usePlaylistStore((state) => state.selectedTrack);

    // Smart seek wrapper
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
    const smoothTimeRef = useRef(smoothTime);

    // Keep smoothTimeRef in sync
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

    // Track previous isPlaying state
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

    // Animation loop
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

    // Handle seek events
    useEffect(() => {
        if (!isPlaying) {
            setSmoothTime(storeCurrentTime);
        }
    }, [storeCurrentTime, isPlaying]);

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

    return (
        <div
            className={cn(
                'multi-pitch-timeline',
                isDominant && 'multi-pitch-timeline--dominant'
            )}
            data-band={band}
        >
            {/* Band header */}
            <div className="multi-pitch-timeline-header">
                <div className="multi-pitch-timeline-label" style={{ color }}>
                    {band.charAt(0).toUpperCase() + band.slice(1)}
                    {isDominant && (
                        <span className="multi-pitch-dominant-badge" title="Dominant band">
                            <Star size={10} />
                        </span>
                    )}
                </div>
                <div className="multi-pitch-timeline-range">{frequencyRange}</div>
                <div className="multi-pitch-timeline-stats">
                    <span className="multi-pitch-timeline-count">
                        {stats.voicedCount}/{stats.count}
                    </span>
                    <span className="multi-pitch-timeline-divider">|</span>
                    <span className="multi-pitch-timeline-prob">
                        {Math.round(stats.avgProbability * 100)}%
                    </span>
                </div>
            </div>

            {/* Timeline container with Y-axis */}
            <div className="multi-pitch-timeline-container">
                {/* Y-Axis */}
                <div className="multi-pitch-y-axis">
                    {yAxisLabels.map((label, i) => (
                        <span
                            key={i}
                            className="multi-pitch-y-label"
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
                        'multi-pitch-timeline-track',
                        'multi-pitch-timeline-track--draggable',
                        isDragging && 'multi-pitch-timeline-track--dragging'
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
                    <div className="multi-pitch-timeline-background" style={{
                        background: `linear-gradient(90deg,
                            hsl(var(--surface-3)) 0%,
                            hsl(var(--surface-2)) 30%,
                            hsl(var(--surface-2)) 70%,
                            hsl(var(--surface-3)) 100%
                        )`
                    }} />

                    {/* Band color accent line */}
                    <div className="multi-pitch-timeline-accent" style={{ backgroundColor: color }} />

                    {/* Horizontal grid lines (pitch reference) */}
                    {yAxisLabels.map((label, i) => (
                        <div
                            key={`grid-${i}`}
                            className="multi-pitch-grid-line"
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
                        className="multi-pitch-now-line"
                        style={{ left: `${nowPosition * 100}%` }}
                    >
                        <div className="multi-pitch-now-line-inner" style={{ backgroundColor: color }} />
                        <span className="multi-pitch-now-label">NOW</span>
                    </div>
                </div>
            </div>

            {/* Quick scrollbar */}
            {duration > 0 && (
                <div className="multi-pitch-quickscroll">
                    <div
                        ref={quickScrollRef}
                        className="multi-pitch-quickscroll-track"
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
                                            'multi-pitch-quickscroll-marker',
                                            !isVoiced && 'multi-pitch-quickscroll-marker--unvoiced'
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
                            className="multi-pitch-quickscroll-viewport"
                            style={{
                                left: `${Math.max(0, ((smoothTime - pastWindow) / duration) * 100)}%`,
                                width: `${Math.min(100, (totalWindow / duration) * 100)}%`,
                            }}
                        />

                        {/* Current position indicator */}
                        <div
                            className="multi-pitch-quickscroll-position"
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
 * MultiBandPitchVisualization
 *
 * Displays three stacked timelines for pitch detection by frequency band.
 */
export function MultiBandPitchVisualization({
    bandPitches: bandPitchesProp,
    dominantBand,
    currentTime: _currentTime,
    duration: propDuration,
    isPlaying: _isPlaying,
    onPitchClick,
    onSeek: _onSeek,
    anticipationWindow: propAnticipationWindow,
    pastWindow: propPastWindow,
    selectedPitchIndex,
    className,
}: MultiBandPitchVisualizationProps) {
    // Normalize band pitches to Map
    const bandPitchesMap = useMemo(
        () => normalizeBandPitches(bandPitchesProp),
        [bandPitchesProp]
    );

    // Get duration from store if not provided
    const storeDuration = useTrackDuration();
    const duration = propDuration ?? storeDuration ?? 0;

    // Zoom state
    const [zoomLevel, setZoomLevel] = useState(1);
    const baseAnticipationWindow = 2.0;
    const basePastWindow = 4.0;
    const anticipationWindow = propAnticipationWindow ?? baseAnticipationWindow / zoomLevel;
    const pastWindow = propPastWindow ?? basePastWindow / zoomLevel;

    // Get bands in order
    const bands: Band[] = ['low', 'mid', 'high'];

    // Calculate total pitches per band for summary
    const bandCounts = useMemo(() => {
        return {
            low: bandPitchesMap.get('low')?.pitches.length ?? 0,
            mid: bandPitchesMap.get('mid')?.pitches.length ?? 0,
            high: bandPitchesMap.get('high')?.pitches.length ?? 0,
        };
    }, [bandPitchesMap]);

    const totalPitches = bandCounts.low + bandCounts.mid + bandCounts.high;
    const totalVoiced = useMemo(() => {
        let count = 0;
        bandPitchesMap.forEach((bandData) => {
            count += bandData.voicedBeatCount;
        });
        return count;
    }, [bandPitchesMap]);

    // Empty state
    if (totalPitches === 0) {
        return (
            <div className={cn('multi-pitch-visualization', 'multi-pitch-visualization--empty', className)}>
                <div className="multi-pitch-header">
                    <div className="multi-pitch-title">
                        <Layers size={18} />
                        <span>Multi-Band Pitch Analysis</span>
                    </div>
                </div>
                <div className="multi-pitch-empty-content">
                    <p>No pitch data available</p>
                </div>
            </div>
        );
    }

    return (
        <div className={cn('multi-pitch-visualization', className)}>
            {/* Header */}
            <div className="multi-pitch-header">
                <div className="multi-pitch-title">
                    <Layers size={18} />
                    <span>Multi-Band Pitch Analysis</span>
                </div>
                <div className="multi-pitch-summary">
                    <span className="multi-pitch-summary-voiced">{totalVoiced}</span>
                    <span className="multi-pitch-summary-divider">/</span>
                    <span className="multi-pitch-summary-total">{totalPitches}</span>
                    <span className="multi-pitch-summary-label">voiced beats</span>
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
            <div className="multi-pitch-timelines">
                {bands.map((band) => {
                    const bandData = bandPitchesMap.get(band);
                    return (
                        <BandPitchTimeline
                            key={band}
                            band={band}
                            pitches={bandData?.pitches ?? []}
                            color={BAND_COLORS[band]}
                            frequencyRange={BAND_RANGES[band]}
                            duration={duration}
                            isDominant={dominantBand === band}
                            onPitchClick={onPitchClick}
                            anticipationWindow={anticipationWindow}
                            pastWindow={pastWindow}
                            selectedPitchIndex={selectedPitchIndex}
                        />
                    );
                })}
            </div>

            {/* Legend */}
            <div className="multi-pitch-legend">
                {bands.map((band) => {
                    const isDominant = dominantBand === band;
                    return (
                        <div
                            key={band}
                            className={cn(
                                'multi-pitch-legend-item',
                                isDominant && 'multi-pitch-legend-item--dominant'
                            )}
                        >
                            <div
                                className="multi-pitch-legend-marker"
                                style={{ backgroundColor: BAND_COLORS[band] }}
                            />
                            <span className="multi-pitch-legend-label">
                                {band.charAt(0).toUpperCase() + band.slice(1)} ({BAND_RANGES[band]})
                            </span>
                            {isDominant && (
                                <span className="multi-pitch-legend-dominant">
                                    <Star size={10} />
                                </span>
                            )}
                            <span className="multi-pitch-legend-count">
                                {bandCounts[band]}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default MultiBandPitchVisualization;
