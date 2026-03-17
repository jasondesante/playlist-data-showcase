/**
 * ChartPreviewTimeline Component
 *
 * A horizontal timeline visualization for the Chart Editor section that shows
 * the subdivided beat map with key assignments. This component provides:
 * - Horizontal scrolling timeline with "NOW" indicator
 * - Play/pause synced with audio player
 * - Drag-to-seek navigation
 * - Quick scrollbar for fast navigation
 * - Visual display of key assignments on beats
 *
 * Inspired by SubdivisionPreviewTimeline but adapted for chart preview.
 */
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Play, Pause } from 'lucide-react';
import './ChartPreviewTimeline.css';
import {
    useSubdividedBeatMap,
    useUnifiedBeatMap,
    useTimeSignature,
    useKeyMap,
} from '../../store/beatDetectionStore';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';
import { usePlaylistStore } from '../../store/playlistStore';
import { useTrackDuration } from '../../hooks/useTrackDuration';
import type { SubdivisionType, SupportedKey } from '@/types';
import { getKeySymbol } from '@/types';
import { formatTime } from '../../utils/formatters';

/**
 * Preview beat representation for rendering
 */
interface PreviewBeat {
    timestamp: number;
    beatIndex: number;
    subdivisionType: SubdivisionType;
    isDownbeat: boolean;
    isQuarterNote: boolean;
    requiredKey?: SupportedKey;
}

/**
 * Get the CSS color class for a key.
 */
function getKeyColorClass(key: string): string {
    const colorMap: Record<string, string> = {
        // DDR colors: left=blue, down=green, up=red, right=purple
        left: 'chart-preview-marker--blue',
        down: 'chart-preview-marker--green',
        up: 'chart-preview-marker--red',
        right: 'chart-preview-marker--purple',
        // Guitar Hero colors: 1=green, 2=red, 3=yellow, 4=blue, 5=orange
        '1': 'chart-preview-marker--green',
        '2': 'chart-preview-marker--red',
        '3': 'chart-preview-marker--yellow',
        '4': 'chart-preview-marker--blue',
        '5': 'chart-preview-marker--orange',
    };
    return colorMap[key] || '';
}

interface ChartPreviewTimelineProps {
    /** Whether the timeline is disabled */
    disabled?: boolean;
    /** Anticipation window in seconds for future beats */
    anticipationWindow?: number;
    /** Past window in seconds */
    pastWindow?: number;
}

export function ChartPreviewTimeline({
    disabled = false,
    anticipationWindow = 3.0,
    pastWindow = 3.0,
}: ChartPreviewTimelineProps) {
    // Store subscriptions
    const subdividedBeatMap = useSubdividedBeatMap();
    const beatsPerMeasure = useTimeSignature();
    const keyMap = useKeyMap();

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
     */
    useEffect(() => {
        if (!isPlaying) {
            setSmoothTime(currentTime);
        }
    }, [currentTime, isPlaying]);

    // Calculate preview beats from subdivided beat map
    const previewBeats = useMemo((): PreviewBeat[] => {
        if (!subdividedBeatMap) return [];

        const windowStart = smoothTime - pastWindow - 1;
        const windowEnd = smoothTime + anticipationWindow + 1;

        return subdividedBeatMap.beats
            .map((beat, index) => ({
                timestamp: beat.timestamp,
                beatIndex: index,
                subdivisionType: beat.subdivisionType,
                isDownbeat: beat.isDownbeat ?? false,
                isQuarterNote: beat.subdivisionType === 'quarter',
                requiredKey: keyMap.get(index) as SupportedKey | undefined,
            }))
            .filter(beat => beat.timestamp >= windowStart && beat.timestamp <= windowEnd);
    }, [subdividedBeatMap, keyMap, smoothTime, pastWindow, anticipationWindow]);

    // Get the original quarter note beats for vertical line boundaries
    // This ensures downbeats are always shown regardless of subdivision type
    const unifiedBeatMap = useUnifiedBeatMap();

    // Calculate quarter note boundaries for the visible window
    // Uses the original quarter note beats (not subdivided) so downbeats are always visible
    const quarterNoteBoundaries = useMemo(() => {
        if (!unifiedBeatMap) return [];

        const windowStart = smoothTime - pastWindow;
        const windowEnd = smoothTime + anticipationWindow;

        return unifiedBeatMap.beats
            .map((beat, index) => ({
                timestamp: beat.timestamp,
                isDownbeat: beat.isDownbeat ?? false,
                index,
            }))
            .filter(beat => beat.timestamp >= windowStart && beat.timestamp <= windowEnd);
    }, [unifiedBeatMap, smoothTime, pastWindow, anticipationWindow]);

    // Total visible time window
    const totalWindow = pastWindow + anticipationWindow;

    // Position of NOW line (as fraction from 0 to 1)
    const nowPosition = pastWindow / totalWindow;

    // Position calculation helper
    const calculatePosition = useCallback((timestamp: number): number => {
        const pastStartTime = smoothTime - pastWindow;
        const timeFromPastStart = timestamp - pastStartTime;
        return timeFromPastStart / totalWindow;
    }, [smoothTime, pastWindow, totalWindow]);

    // Drag-to-scrub and click-to-seek functionality
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

        if (Math.abs(deltaX) <= DRAG_THRESHOLD) {
            const clickX = event.clientX - rect.left;
            const trackWidth = rect.width;

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

    // Quick scroll handlers
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

    // Get downbeats for quick scroll markers
    const downbeats = useMemo(() => {
        if (!subdividedBeatMap) return [];
        return subdividedBeatMap.beats.filter(beat => beat.isDownbeat);
    }, [subdividedBeatMap]);

    // No beat map state
    if (!subdividedBeatMap || subdividedBeatMap.beats.length === 0) {
        return (
            <div className="chart-preview-timeline chart-preview-timeline--empty">
                <span className="chart-preview-timeline-empty-message">
                    Generate a subdivided beat map first to preview the chart
                </span>
            </div>
        );
    }

    return (
        <div className="chart-preview-timeline">
            {/* Controls */}
            <div className="chart-preview-timeline-controls">
                <button
                    className="chart-preview-timeline-play-btn"
                    onClick={handlePlayPause}
                    disabled={disabled}
                    title={isPlaying ? 'Pause' : 'Play'}
                >
                    {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <span className="chart-preview-timeline-time">
                    {formatTime(smoothTime)} / {formatTime(duration)}
                </span>
            </div>

            {/* Timeline track */}
            <div
                ref={trackRef}
                className={`chart-preview-timeline-track ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
                onMouseDown={handleMouseDown}
            >
                {/* Background layers */}
                <div className="chart-preview-timeline-background" />
                <div
                    className="chart-preview-timeline-past-region"
                    style={{ width: `${nowPosition * 100}%` }}
                />
                <div
                    className="chart-preview-timeline-future-region"
                    style={{ width: `${(1 - nowPosition) * 100}%` }}
                />

                {/* Quarter note boundaries */}
                {quarterNoteBoundaries.map((beat) => {
                    const position = calculatePosition(beat.timestamp);
                    if (position < 0 || position > 1) return null;

                    return (
                        <div
                            key={`quarter-${beat.index}`}
                            className={`chart-preview-timeline-quarter-boundary ${beat.isDownbeat ? 'downbeat' : ''}`}
                            style={{ left: `${position * 100}%` }}
                        >
                            {beat.isDownbeat && (
                                <span className="chart-preview-timeline-measure-label">
                                    M{Math.floor(beat.index / beatsPerMeasure) + 1}
                                </span>
                            )}
                        </div>
                    );
                })}

                {/* Beat markers with key assignments */}
                {previewBeats.map((beat) => {
                    const position = calculatePosition(beat.timestamp);
                    if (position < 0 || position > 1) return null;

                    const keyColorClass = beat.requiredKey ? getKeyColorClass(beat.requiredKey) : '';

                    return (
                        <div
                            key={`beat-${beat.beatIndex}`}
                            className={`chart-preview-timeline-marker
                                chart-preview-timeline-marker--${beat.subdivisionType}
                                ${keyColorClass}
                                ${beat.isDownbeat ? 'downbeat' : ''}
                                ${beat.isQuarterNote ? 'quarter-note' : ''}
                                ${beat.requiredKey ? 'has-key' : ''}
                                ${beat.timestamp < smoothTime ? 'past' : ''}
                            `}
                            style={{
                                left: `${position * 100}%`,
                            }}
                        >
                            <div className="chart-preview-timeline-marker-dot">
                                {beat.requiredKey && (
                                    <span className="chart-preview-timeline-marker-key">
                                        {getKeySymbol(beat.requiredKey)}
                                    </span>
                                )}
                            </div>
                            {beat.isQuarterNote && (
                                <span className="chart-preview-timeline-marker-number">
                                    {beat.beatIndex + 1}
                                </span>
                            )}
                        </div>
                    );
                })}

                {/* NOW line */}
                <div
                    className="chart-preview-timeline-now-line"
                    style={{ left: `${nowPosition * 100}%` }}
                >
                    <div className="chart-preview-timeline-now-line-inner" />
                    <span className="chart-preview-timeline-now-label">NOW</span>
                </div>
            </div>

            {/* Quick scrollbar for fast navigation */}
            {duration && duration > 0 && (
                <div className="chart-preview-timeline-quickscroll">
                    <div
                        ref={quickScrollRef}
                        className="chart-preview-timeline-quickscroll-track"
                        onClick={handleQuickScrollClick}
                        onMouseDown={handleQuickScrollDragStart}
                    >
                        {/* Downbeat markers in the quick scroll */}
                        {downbeats.map((beat, index) => {
                            const position = beat.timestamp / duration;
                            return (
                                <div
                                    key={`quickscroll-downbeat-${index}`}
                                    className="chart-preview-timeline-quickscroll-marker"
                                    style={{ left: `${position * 100}%` }}
                                />
                            );
                        })}

                        {/* Viewport indicator */}
                        <div
                            className="chart-preview-timeline-quickscroll-viewport"
                            style={{
                                left: `${Math.max(0, ((smoothTime - pastWindow) / duration) * 100)}%`,
                                width: `${Math.min(100, (totalWindow / duration) * 100)}%`,
                            }}
                        />

                        {/* Current position indicator */}
                        <div
                            className="chart-preview-timeline-quickscroll-position"
                            style={{ left: `${(smoothTime / duration) * 100}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default ChartPreviewTimeline;
