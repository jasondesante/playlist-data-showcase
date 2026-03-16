/**
 * SubdivisionPreviewTimeline Component
 *
 * A horizontal timeline visualization showing a real-time preview of subdivisions
 * as they are applied to beats. This component provides:
 * - Horizontal scrolling timeline with "NOW" indicator
 * - Real-time subdivision preview (calculates on-the-fly)
 * - Play/pause synced with audio player
 * - Drag-to-seek navigation
 * - Click beats to select in grid
 * - Visual differentiation by subdivision type
 *
 * Inspired by the downbeat configuration UI (BeatTimeline) in BeatMapSummary.
 */
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Play, Pause } from 'lucide-react';
import './SubdivisionPreviewTimeline.css';
import {
    useUnifiedBeatMap,
    useSubdivisionConfig,
    useTimeSignature,
} from '../../store/beatDetectionStore';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';
import type { SubdivisionType } from '@/types';

/**
 * Subdivision density multipliers - how many beats per quarter note
 */
const SUBDIVISION_DENSITY: Record<SubdivisionType, number> = {
    quarter: 1,
    half: 0.5,
    eighth: 2,
    sixteenth: 4,
    triplet8: 3,
    triplet4: 1.5,
    dotted4: 0.67, // 2/3
    dotted8: 1.33, // 4/3
    rest: 0,
    swing: 2,
    offbeat8: 1,
};

/**
 * Color mapping for subdivision types
 */
const SUBDIVISION_COLORS: Record<SubdivisionType, string> = {
    quarter: 'var(--cute-yellow)',
    half: 'var(--cute-green)',
    eighth: 'var(--cute-orange)',
    sixteenth: 'var(--cute-red)',
    triplet8: 'var(--cute-purple)',
    triplet4: 'var(--cute-blue)',
    dotted4: 'var(--cute-teal)',
    dotted8: 'var(--cute-pink)',
    rest: 'var(--muted)',
    swing: 'var(--cute-amber)',
    offbeat8: 'var(--cute-lime)',
};

/**
 * Preview beat representation for rendering
 */
interface PreviewBeat {
    timestamp: number;
    quarterNoteIndex: number;
    positionInQuarter: number;
    subdivisionType: SubdivisionType;
    isDownbeat: boolean;
    isQuarterNote: boolean;
}

/**
 * Format time as MM:SS
 */
function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Calculate preview subdivisions for a time window
 */
function calculatePreviewSubdivisions(
    quarterBeats: Array<{ timestamp: number; isDownbeat: boolean }>,
    subdivisionConfig: { beatSubdivisions: Map<number, SubdivisionType>; defaultSubdivision: SubdivisionType },
    windowStart: number,
    windowEnd: number,
    _beatsPerMeasure: number // Used for future measure boundary calculations
): PreviewBeat[] {
    const previewBeats: PreviewBeat[] = [];

    for (let i = 0; i < quarterBeats.length; i++) {
        const quarterBeat = quarterBeats[i];

        // Skip if outside window (with buffer)
        if (quarterBeat.timestamp > windowEnd + 2) break;

        const nextQuarter = quarterBeats[i + 1];
        const quarterInterval = nextQuarter
            ? nextQuarter.timestamp - quarterBeat.timestamp
            : 0.5; // Default fallback

        // Get subdivision type for this quarter note
        const subdivisionType = subdivisionConfig.beatSubdivisions.get(i)
            ?? subdivisionConfig.defaultSubdivision;

        const density = SUBDIVISION_DENSITY[subdivisionType] ?? 1;

        // Skip rest subdivisions
        if (density === 0) continue;

        // For half notes, only show on downbeats
        if (subdivisionType === 'half' && !quarterBeat.isDownbeat) continue;

        // For offbeat8, skip the quarter note position
        if (subdivisionType === 'offbeat8') {
            const timestamp = quarterBeat.timestamp + (quarterInterval * 0.5);
            if (timestamp >= windowStart && timestamp <= windowEnd) {
                previewBeats.push({
                    timestamp,
                    quarterNoteIndex: i,
                    positionInQuarter: 0.5,
                    subdivisionType,
                    isDownbeat: false,
                    isQuarterNote: false,
                });
            }
            continue;
        }

        // Generate subdivided beats
        for (let j = 0; j < density; j++) {
            const positionInQuarter = j / density;
            const timestamp = quarterBeat.timestamp + (quarterInterval * positionInQuarter);

            if (timestamp >= windowStart && timestamp <= windowEnd) {
                previewBeats.push({
                    timestamp,
                    quarterNoteIndex: i,
                    positionInQuarter,
                    subdivisionType,
                    isDownbeat: quarterBeat.isDownbeat && j === 0,
                    isQuarterNote: j === 0,
                });
            }
        }
    }

    return previewBeats.sort((a, b) => a.timestamp - b.timestamp);
}

interface SubdivisionPreviewTimelineProps {
    /** Whether the timeline is disabled */
    disabled?: boolean;
    /** Anticipation window in seconds for future beats */
    anticipationWindow?: number;
    /** Past window in seconds */
    pastWindow?: number;
    /** Callback when a beat is clicked */
    onBeatClick?: (quarterNoteIndex: number) => void;
    /** Currently selected beat index */
    selectedBeatIndex?: number | null;
}

export function SubdivisionPreviewTimeline({
    disabled = false,
    anticipationWindow = 2.0,
    pastWindow = 4.0,
    onBeatClick,
    selectedBeatIndex,
}: SubdivisionPreviewTimelineProps) {
    // Store subscriptions
    const unifiedBeatMap = useUnifiedBeatMap();
    const subdivisionConfig = useSubdivisionConfig();
    const beatsPerMeasure = useTimeSignature();

    // Audio player state
    const currentTime = useAudioPlayerStore((state) => state.currentTime);
    const playbackState = useAudioPlayerStore((state) => state.playbackState);
    const seek = useAudioPlayerStore((state) => state.seek);
    const resume = useAudioPlayerStore((state) => state.resume);
    const pause = useAudioPlayerStore((state) => state.pause);
    const duration = useAudioPlayerStore((state) => state.duration);

    const isPlaying = playbackState === 'playing';

    // Animation state
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

    // Keep refs in sync
    useEffect(() => {
        lastAudioTimeRef.current = {
            time: currentTime,
            timestamp: performance.now(),
        };
    }, [currentTime]);

    useEffect(() => {
        isPlayingRef.current = isPlaying;
    }, [isPlaying]);

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

    /**
     * Handle seek events - immediately update smoothTime when currentTime changes.
     * This ensures smooth transition when user seeks to a different position while paused.
     */
    useEffect(() => {
        // When not playing, update smooth time directly
        if (!isPlaying) {
            setSmoothTime(currentTime);
        }
        // When playing, the animation loop will pick up the new time
        // because lastAudioTimeRef is updated via the other effect
    }, [currentTime, isPlaying]);

    // Calculate preview beats
    const quarterBeats = useMemo(() => {
        if (!unifiedBeatMap) return [];
        return unifiedBeatMap.beats.map(b => ({
            timestamp: b.timestamp,
            isDownbeat: b.isDownbeat ?? false,
        }));
    }, [unifiedBeatMap]);

    const previewBeats = useMemo(() => {
        if (!unifiedBeatMap || quarterBeats.length === 0) return [];

        const windowStart = smoothTime - pastWindow - 1;
        const windowEnd = smoothTime + anticipationWindow + 1;

        return calculatePreviewSubdivisions(
            quarterBeats,
            subdivisionConfig,
            windowStart,
            windowEnd,
            beatsPerMeasure
        );
    }, [unifiedBeatMap, quarterBeats, subdivisionConfig, smoothTime, pastWindow, anticipationWindow, beatsPerMeasure]);

    // Calculate quarter note boundaries for the visible window
    const quarterNoteBoundaries = useMemo(() => {
        const windowStart = smoothTime - pastWindow;
        const windowEnd = smoothTime + anticipationWindow;

        return quarterBeats
            .map((beat, index) => ({ ...beat, index }))
            .filter(beat => beat.timestamp >= windowStart && beat.timestamp <= windowEnd);
    }, [quarterBeats, smoothTime, pastWindow, anticipationWindow]);

    // Position calculation helper
    const calculatePosition = useCallback((timestamp: number): number => {
        const timeUntilBeat = timestamp - smoothTime;
        // Position 0.5 = NOW, 0 = pastWindow ago, 1 = anticipationWindow ahead
        return 0.5 + (timeUntilBeat / anticipationWindow) * 0.5;
    }, [smoothTime, anticipationWindow]);

    // Drag-to-scrub and click-to-seek functionality
    const DRAG_THRESHOLD = 5; // pixels - movement beyond this is considered a drag

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

        // If moved beyond threshold, treat as drag (scrub)
        if (Math.abs(deltaX) > DRAG_THRESHOLD) {
            const timePerPixel = (anticipationWindow * 2) / trackWidth;
            const deltaTime = -deltaX * timePerPixel;
            const newTime = Math.max(0, Math.min(duration || 9999, dragStartTimeRef.current + deltaTime));
            seek(newTime);
        }
    }, [isDragging, anticipationWindow, duration, seek]);

    const handleMouseUp = useCallback((event: MouseEvent) => {
        if (!isDragging || !trackRef.current) return;

        const rect = trackRef.current.getBoundingClientRect();
        const deltaX = event.clientX - dragStartXRef.current;

        // If it was a click (not a drag), seek to clicked position
        if (Math.abs(deltaX) <= DRAG_THRESHOLD) {
            const clickX = event.clientX - rect.left;
            const trackWidth = rect.width;

            // Calculate time from click position
            // Position 0 = pastWindow ago, 0.5 = now, 1 = anticipationWindow ahead
            const positionRatio = clickX / trackWidth;
            const timeOffset = (positionRatio - 0.5) * anticipationWindow * 2;
            const newTime = Math.max(0, Math.min(duration || 9999, smoothTime + timeOffset));

            seek(newTime);
        }

        setIsDragging(false);
    }, [isDragging, anticipationWindow, duration, seek, smoothTime]);

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

    // Play/pause toggle
    const handlePlayPause = useCallback(() => {
        if (isPlaying) {
            pause();
        } else {
            resume();
        }
    }, [isPlaying, pause, resume]);

    // Beat click handler
    const handleBeatClick = useCallback((beat: PreviewBeat, event: React.MouseEvent) => {
        event.stopPropagation();
        onBeatClick?.(beat.quarterNoteIndex);
    }, [onBeatClick]);

    // Get unique subdivision types for legend
    const usedSubdivisions = useMemo(() => {
        const types = new Set<SubdivisionType>();
        previewBeats.forEach(b => types.add(b.subdivisionType));
        return Array.from(types);
    }, [previewBeats]);

    // No beat map state
    if (!unifiedBeatMap || quarterBeats.length === 0) {
        return (
            <div className="subdivision-preview-timeline subdivision-preview-timeline--empty">
                <span className="subdivision-preview-timeline-empty-message">
                    Generate a beat map first to preview subdivisions
                </span>
            </div>
        );
    }

    return (
        <div className="subdivision-preview-timeline">
            {/* Controls */}
            <div className="subdivision-preview-timeline-controls">
                <button
                    className="subdivision-preview-timeline-play-btn"
                    onClick={handlePlayPause}
                    disabled={disabled}
                    title={isPlaying ? 'Pause' : 'Play'}
                >
                    {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <span className="subdivision-preview-timeline-time">
                    {formatTime(smoothTime)} / {formatTime(duration || 0)}
                </span>
            </div>

            {/* Timeline track */}
            <div
                ref={trackRef}
                className={`subdivision-preview-timeline-track ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
                onMouseDown={handleMouseDown}
            >
                {/* Background layers */}
                <div className="subdivision-preview-timeline-background" />
                <div className="subdivision-preview-timeline-past-region" />
                <div className="subdivision-preview-timeline-future-region" />

                {/* Quarter note boundaries */}
                {quarterNoteBoundaries.map((beat) => {
                    const position = calculatePosition(beat.timestamp);
                    if (position < 0 || position > 1) return null;

                    return (
                        <div
                            key={`quarter-${beat.index}`}
                            className={`subdivision-preview-timeline-quarter-boundary ${beat.isDownbeat ? 'downbeat' : ''}`}
                            style={{ left: `${position * 100}%` }}
                        >
                            {beat.isDownbeat && (
                                <span className="subdivision-preview-timeline-measure-label">
                                    M{Math.floor(beat.index / beatsPerMeasure) + 1}
                                </span>
                            )}
                        </div>
                    );
                })}

                {/* Subdivided beat markers */}
                {previewBeats.map((beat, index) => {
                    const position = calculatePosition(beat.timestamp);
                    if (position < 0 || position > 1) return null;

                    const isSelected = selectedBeatIndex === beat.quarterNoteIndex;
                    const color = SUBDIVISION_COLORS[beat.subdivisionType];

                    return (
                        <div
                            key={`beat-${beat.quarterNoteIndex}-${beat.positionInQuarter}-${index}`}
                            className={`subdivision-preview-timeline-marker
                                subdivision-preview-timeline-marker--${beat.subdivisionType}
                                ${beat.isDownbeat ? 'downbeat' : ''}
                                ${beat.isQuarterNote ? 'quarter-note' : ''}
                                ${isSelected ? 'selected' : ''}
                                ${beat.timestamp < smoothTime ? 'past' : ''}
                            `}
                            style={{
                                left: `${position * 100}%`,
                                '--beat-color': color,
                            } as React.CSSProperties}
                            onClick={(e) => handleBeatClick(beat, e)}
                        >
                            <div className="subdivision-preview-timeline-marker-dot" />
                            {beat.isQuarterNote && (
                                <span className="subdivision-preview-timeline-marker-number">
                                    {beat.quarterNoteIndex + 1}
                                </span>
                            )}
                        </div>
                    );
                })}

                {/* NOW line */}
                <div className="subdivision-preview-timeline-now-line">
                    <div className="subdivision-preview-timeline-now-line-inner" />
                    <span className="subdivision-preview-timeline-now-label">NOW</span>
                </div>
            </div>

            {/* Legend */}
            {usedSubdivisions.length > 0 && (
                <div className="subdivision-preview-timeline-legend">
                    {usedSubdivisions.map(type => (
                        <div key={type} className="subdivision-preview-timeline-legend-item">
                            <div
                                className={`subdivision-preview-timeline-legend-marker subdivision-preview-timeline-legend-marker--${type}`}
                                style={{ '--beat-color': SUBDIVISION_COLORS[type] } as React.CSSProperties}
                            />
                            <span>{type}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
