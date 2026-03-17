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
import { usePlaylistStore } from '../../store/playlistStore';
import { useTrackDuration } from '../../hooks/useTrackDuration';
import type { SubdivisionType } from '@/types';
import { formatTime } from '../../utils/formatters';

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
 * Get the triplet4 chain position (0 = first in pair, 1 = second in pair)
 * This determines how triplet4 beats are handled in consecutive chains
 */
function getTriplet4ChainPosition(
    beatIndex: number,
    subdivisionConfig: { beatSubdivisions: Map<number, SubdivisionType>; defaultSubdivision: SubdivisionType }
): number {
    let consecutiveCount = 0;
    for (let i = beatIndex - 1; i >= 0; i--) {
        const prevSubdivision = subdivisionConfig.beatSubdivisions.get(i) ?? subdivisionConfig.defaultSubdivision;
        if (prevSubdivision === 'triplet4') {
            consecutiveCount++;
        } else {
            break;
        }
    }
    // Position in chain: 0 = first in pair, 1 = second in pair
    return consecutiveCount % 2;
}

/**
 * Calculate preview subdivisions for beats in the visible window
 * This mirrors the logic in BeatSubdivider.ts from playlist-data-engine
 */
function calculatePreviewSubdivisions(
    quarterBeats: Array<{ timestamp: number; isDownbeat: boolean; beatInMeasure?: number }>,
    subdivisionConfig: { beatSubdivisions: Map<number, SubdivisionType>; defaultSubdivision: SubdivisionType },
    windowStart: number,
    windowEnd: number,
    _beatsPerMeasure: number
): PreviewBeat[] {
    const previewBeats: PreviewBeat[] = [];

    for (let i = 0; i < quarterBeats.length; i++) {
        const quarterBeat = quarterBeats[i];
        const nextQuarter = quarterBeats[i + 1];

        // Skip beats outside the visible window (with buffer for subdivisions)
        if (quarterBeat.timestamp < windowStart - 1) continue;
        if (quarterBeat.timestamp > windowEnd + 1) break;

        const quarterInterval = nextQuarter
            ? nextQuarter.timestamp - quarterBeat.timestamp
            : 0.5;

        // Get subdivision type for this quarter note
        const subdivisionType = subdivisionConfig.beatSubdivisions.get(i)
            ?? subdivisionConfig.defaultSubdivision;

        // Get beatInMeasure - default to i % 4 if not provided
        const beatInMeasure = quarterBeat.beatInMeasure ?? (i % 4);

        // For triplet4, check if this is the second beat in a consecutive chain
        // If so, we skip the original beat marker (it's part of the previous triplet)
        const triplet4ChainPosition = subdivisionType === 'triplet4'
            ? getTriplet4ChainPosition(i, subdivisionConfig)
            : 0;

        // Determine if we should skip the original beat
        // - offbeat8: always skip (rest on downbeat, hit on upbeat)
        // - triplet4 position 1: skip (part of previous triplet)
        // - half/dotted4 on odd beats: skip (2-beat structure, only hit on beats 0, 2, 4...)
        let skipOriginalBeat = false;

        if (subdivisionType === 'offbeat8') {
            skipOriginalBeat = true;
        } else if (subdivisionType === 'triplet4' && triplet4ChainPosition === 1) {
            skipOriginalBeat = true;
        } else if (subdivisionType === 'half' || subdivisionType === 'dotted4') {
            // 2-beat structure: only show original beat on even beat positions (0, 2, 4...)
            if (beatInMeasure % 2 !== 0) {
                skipOriginalBeat = true;
            }
        }

        // Add the quarter note marker (unless skipped)
        if (!skipOriginalBeat) {
            previewBeats.push({
                timestamp: quarterBeat.timestamp,
                quarterNoteIndex: i,
                positionInQuarter: 0,
                subdivisionType,
                isDownbeat: quarterBeat.isDownbeat,
                isQuarterNote: true,
            });
        }

        // Add subdivision markers based on type
        if (subdivisionType === 'eighth') {
            // Eighth note: divides quarter into 2 parts
            previewBeats.push({
                timestamp: quarterBeat.timestamp + (quarterInterval * 0.5),
                quarterNoteIndex: i,
                positionInQuarter: 0.5,
                subdivisionType,
                isDownbeat: false,
                isQuarterNote: false,
            });
        } else if (subdivisionType === 'swing') {
            // Swing feel: beat at 2/3 (2:1 long-short ratio)
            previewBeats.push({
                timestamp: quarterBeat.timestamp + (quarterInterval * 2 / 3),
                quarterNoteIndex: i,
                positionInQuarter: 2 / 3,
                subdivisionType,
                isDownbeat: false,
                isQuarterNote: false,
            });
        } else if (subdivisionType === 'offbeat8') {
            // Offbeat eighth: only the offbeat (no downbeat) - beat at 0.5
            previewBeats.push({
                timestamp: quarterBeat.timestamp + (quarterInterval * 0.5),
                quarterNoteIndex: i,
                positionInQuarter: 0.5,
                subdivisionType,
                isDownbeat: false,
                isQuarterNote: false,
            });
        } else if (subdivisionType === 'dotted8') {
            // Dotted eighth: beat at 3/4 (3:1 long-short ratio, 3 sixteenth notes)
            previewBeats.push({
                timestamp: quarterBeat.timestamp + (quarterInterval * 3 / 4),
                quarterNoteIndex: i,
                positionInQuarter: 3 / 4,
                subdivisionType,
                isDownbeat: false,
                isQuarterNote: false,
            });
        } else if (subdivisionType === 'dotted4') {
            // Dotted quarter: 2-beat structure
            // - Even beats (0, 2, 4...): Add original beat at 0 (the downbeat hit)
            // - Odd beats (1, 3, 5...): Skip original beat, add interpolated beat at 0.5 (the "and" of this 2nd beat)
            // The original beat on odd positions is already skipped above
            if (beatInMeasure % 2 === 1) {
                // This is the 2nd beat of the pair - add the "and" at 0.5
                previewBeats.push({
                    timestamp: quarterBeat.timestamp + (quarterInterval * 0.5),
                    quarterNoteIndex: i,
                    positionInQuarter: 0.5,
                    subdivisionType,
                    isDownbeat: false,
                    isQuarterNote: false,
                });
            }
        } else if (subdivisionType === 'sixteenth') {
            // Sixteenth note: divides quarter into 4 parts
            for (let j = 1; j <= 3; j++) {
                previewBeats.push({
                    timestamp: quarterBeat.timestamp + (quarterInterval * j / 4),
                    quarterNoteIndex: i,
                    positionInQuarter: j / 4,
                    subdivisionType,
                    isDownbeat: false,
                    isQuarterNote: false,
                });
            }
        } else if (subdivisionType === 'triplet8') {
            // Eighth triplet: 3 beats in the space of 1 quarter
            for (let j = 1; j <= 2; j++) {
                previewBeats.push({
                    timestamp: quarterBeat.timestamp + (quarterInterval * j / 3),
                    quarterNoteIndex: i,
                    positionInQuarter: j / 3,
                    subdivisionType,
                    isDownbeat: false,
                    isQuarterNote: false,
                });
            }
        } else if (subdivisionType === 'triplet4') {
            // Quarter triplet: 3 beats in the space of 2 quarters
            // This is a 2-beat structure:
            // - Position 0 (first beat): original beat at 0, interpolated at 2/3
            // - Position 1 (second beat): interpolated at 1/3 (relative to this beat)

            if (triplet4ChainPosition === 0) {
                // First beat in pair: add interpolated beat at 2/3
                previewBeats.push({
                    timestamp: quarterBeat.timestamp + (quarterInterval * 2 / 3),
                    quarterNoteIndex: i,
                    positionInQuarter: 2 / 3,
                    subdivisionType,
                    isDownbeat: false,
                    isQuarterNote: false,
                });
            } else {
                // Second beat in pair: add interpolated beat at 1/3
                // This connects to the previous triplet4 beat
                previewBeats.push({
                    timestamp: quarterBeat.timestamp + (quarterInterval * 1 / 3),
                    quarterNoteIndex: i,
                    positionInQuarter: 1 / 3,
                    subdivisionType,
                    isDownbeat: false,
                    isQuarterNote: false,
                });
            }
        }
        // half and quarter notes have no interpolated beats
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
}

export function SubdivisionPreviewTimeline({
    disabled = false,
    anticipationWindow = 3.0,
    pastWindow = 3.0,
}: SubdivisionPreviewTimelineProps) {
    // Store subscriptions
    const unifiedBeatMap = useUnifiedBeatMap();
    const subdivisionConfig = useSubdivisionConfig();
    const beatsPerMeasure = useTimeSignature();

    // Audio player state
    const currentTime = useAudioPlayerStore((state) => state.currentTime);
    const playbackState = useAudioPlayerStore((state) => state.playbackState);
    const currentUrl = useAudioPlayerStore((state) => state.currentUrl);
    const seek = useAudioPlayerStore((state) => state.seek);
    const resume = useAudioPlayerStore((state) => state.resume);
    const pause = useAudioPlayerStore((state) => state.pause);
    const play = useAudioPlayerStore((state) => state.play);
    const { selectedTrack } = usePlaylistStore();
    // Use shared hook for validated duration with metadata fallback
    const duration = useTrackDuration();

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

    // Track playback state transitions to handle play/pause start smoothly
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
            beatInMeasure: b.beatInMeasure,
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

    // Total visible time window
    const totalWindow = pastWindow + anticipationWindow;

    // Position of NOW line (as fraction from 0 to 1)
    const nowPosition = pastWindow / totalWindow;

    // Position calculation helper
    const calculatePosition = useCallback((timestamp: number): number => {
        // The full visible range spans from (smoothTime - pastWindow) to (smoothTime + anticipationWindow)
        // We map this to positions 0 to 1, where:
        // - Position 0 = pastWindow seconds ago
        // - Position (pastWindow / totalWindow) = NOW (smoothTime)
        // - Position 1 = anticipationWindow seconds in the future
        const pastStartTime = smoothTime - pastWindow;
        const timeFromPastStart = timestamp - pastStartTime;
        return timeFromPastStart / totalWindow;
    }, [smoothTime, pastWindow, totalWindow]);

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
            const totalWindow = pastWindow + anticipationWindow;
            const timePerPixel = totalWindow / trackWidth;
            const deltaTime = -deltaX * timePerPixel;
            const newTime = Math.max(0, Math.min(duration || 9999, dragStartTimeRef.current + deltaTime));
            seek(newTime);
        }
    }, [isDragging, pastWindow, anticipationWindow, duration, seek]);

    const handleMouseUp = useCallback((event: MouseEvent) => {
        if (!isDragging || !trackRef.current) return;

        const rect = trackRef.current.getBoundingClientRect();
        const deltaX = event.clientX - dragStartXRef.current;

        // If it was a click (not a drag), seek to clicked position
        if (Math.abs(deltaX) <= DRAG_THRESHOLD) {
            const clickX = event.clientX - rect.left;
            const trackWidth = rect.width;

            // Calculate time from click position
            // Position 0 = (smoothTime - pastWindow), 1 = (smoothTime + anticipationWindow)
            const totalWindow = pastWindow + anticipationWindow;
            const positionRatio = clickX / trackWidth;
            const timeFromPastStart = positionRatio * totalWindow;
            const newTime = Math.max(0, Math.min(duration || 9999, (smoothTime - pastWindow) + timeFromPastStart));

            seek(newTime);
        }

        setIsDragging(false);
    }, [isDragging, pastWindow, anticipationWindow, duration, seek, smoothTime]);

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

    // Quick scroll handlers - click to jump, drag to scrub
    const handleQuickScrollClick = useCallback((event: React.MouseEvent) => {
        if (disabled || !quickScrollRef.current || !duration) return;

        const rect = quickScrollRef.current.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const trackWidth = rect.width;
        const positionRatio = Math.max(0, Math.min(1, clickX / trackWidth));
        const newTime = positionRatio * duration;

        seek(newTime);
    }, [disabled, duration, seek]);

    const handleQuickScrollDragStart = useCallback((event: React.MouseEvent) => {
        if (disabled || !quickScrollRef.current || !duration) return;

        event.preventDefault();
        setIsQuickScrollDragging(true);

        // Immediately seek on mousedown
        const rect = quickScrollRef.current.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const trackWidth = rect.width;
        const positionRatio = Math.max(0, Math.min(1, clickX / trackWidth));
        const newTime = positionRatio * duration;
        seek(newTime);
    }, [disabled, duration, seek]);

    // Quick scroll drag handling
    useEffect(() => {
        if (!isQuickScrollDragging || !duration) return;

        const handleQuickScrollMove = (event: MouseEvent) => {
            if (!quickScrollRef.current) return;

            const rect = quickScrollRef.current.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            const trackWidth = rect.width;
            const positionRatio = Math.max(0, Math.min(1, clickX / trackWidth));
            const newTime = positionRatio * duration;
            seek(newTime);
        };

        const handleQuickScrollEnd = () => {
            setIsQuickScrollDragging(false);
        };

        window.addEventListener('mousemove', handleQuickScrollMove);
        window.addEventListener('mouseup', handleQuickScrollEnd);

        return () => {
            window.removeEventListener('mousemove', handleQuickScrollMove);
            window.removeEventListener('mouseup', handleQuickScrollEnd);
        };
    }, [isQuickScrollDragging, duration, seek]);

    // Play/pause toggle
    // Handles the case where audio hasn't been loaded yet (fresh page load)
    const handlePlayPause = useCallback(() => {
        if (isPlaying) {
            pause();
        } else {
            // CRITICAL FIX: If there's a selectedTrack but no currentUrl loaded, play the track
            // This handles the case where the page is refreshed and the track is restored
            // (selectedTrack is set) but the audio hasn't been loaded yet (currentUrl is null)
            if (selectedTrack && !currentUrl) {
                play(selectedTrack.audio_url);
            } else {
                resume();
            }
        }
    }, [isPlaying, pause, resume, play, selectedTrack, currentUrl]);

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
                    {formatTime(smoothTime)} / {formatTime(duration)}
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
                <div
                    className="subdivision-preview-timeline-past-region"
                    style={{ width: `${nowPosition * 100}%` }}
                />
                <div
                    className="subdivision-preview-timeline-future-region"
                    style={{ width: `${(1 - nowPosition) * 100}%` }}
                />

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

                    return (
                        <div
                            key={`beat-${beat.quarterNoteIndex}-${beat.positionInQuarter}-${index}`}
                            className={`subdivision-preview-timeline-marker
                                subdivision-preview-timeline-marker--${beat.subdivisionType}
                                ${beat.isDownbeat ? 'downbeat' : ''}
                                ${beat.isQuarterNote ? 'quarter-note' : ''}
                                ${beat.timestamp < smoothTime ? 'past' : ''}
                            `}
                            style={{
                                left: `${position * 100}%`,
                            }}
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

                {/* NOW line - positioned dynamically based on past/future window ratio */}
                <div
                    className="subdivision-preview-timeline-now-line"
                    style={{ left: `${nowPosition * 100}%` }}
                >
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
                            />
                            <span>{type}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Quick scrollbar for fast navigation */}
            {duration && duration > 0 && (
                <div className="subdivision-preview-timeline-quickscroll">
                    <div
                        ref={quickScrollRef}
                        className="subdivision-preview-timeline-quickscroll-track"
                        onClick={handleQuickScrollClick}
                        onMouseDown={handleQuickScrollDragStart}
                    >
                        {/* Downbeat markers in the quick scroll */}
                        {quarterBeats
                            .filter(beat => beat.isDownbeat)
                            .map((beat, index) => {
                                const position = beat.timestamp / duration;
                                return (
                                    <div
                                        key={`quickscroll-downbeat-${index}`}
                                        className="subdivision-preview-timeline-quickscroll-marker"
                                        style={{ left: `${position * 100}%` }}
                                    />
                                );
                            })}

                        {/* Viewport indicator - shows current visible window */}
                        <div
                            className="subdivision-preview-timeline-quickscroll-viewport"
                            style={{
                                left: `${Math.max(0, ((smoothTime - pastWindow) / duration) * 100)}%`,
                                width: `${Math.min(100, (totalWindow / duration) * 100)}%`,
                            }}
                        />

                        {/* Current position indicator */}
                        <div
                            className="subdivision-preview-timeline-quickscroll-position"
                            style={{ left: `${(smoothTime / duration) * 100}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
