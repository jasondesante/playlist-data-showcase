/**
 * PitchContourGraph Component
 *
 * SVG line graph visualization showing pitch contour over time.
 * Features:
 * - X-axis = time (seconds)
 * - Y-axis = MIDI note number
 * - Line connects consecutive voiced pitches
 * - Gaps for unvoiced sections
 * - Color gradient by direction (green=up, red=down, blue=stable)
 * - Sync with audio playback (playhead)
 * - Show note labels at key points
 *
 * Task 5.3: Create PitchContourGraph Component
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import './PitchContourGraph.css';
import { cn } from '../../utils/cn';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';
import { usePlaylistStore } from '../../store/playlistStore';
import { useTrackDuration } from '../../hooks/useTrackDuration';
import type { PitchAtBeat } from '../../types/levelGeneration';

// ============================================================
// Types
// ============================================================

export interface PitchContourGraphProps {
    /** Array of pitch data linked to beats */
    pitchesByBeat: PitchAtBeat[];
    /** Callback when a beat is clicked */
    onBeatClick?: (beat: PitchAtBeat) => void;
    /** The index of the currently selected beat */
    selectedBeatIndex?: number;
    /** Whether the graph is disabled */
    disabled?: boolean;
    /** Show note labels at key points */
    showNoteLabels?: boolean;
    /** Height of the graph in pixels */
    height?: number;
    /** Show Y-axis labels (note names) */
    showYAxisLabels?: boolean;
    /** Additional CSS class names */
    className?: string;
}

/** Internal representation of a contour point */
interface ContourPoint {
    beat: PitchAtBeat;
    x: number;
    y: number;
    midiNote: number;
    direction: 'up' | 'down' | 'stable' | 'none';
    isVoiced: boolean;
}

/** Direction type */
type Direction = 'up' | 'down' | 'stable' | 'none';

// ============================================================
// Constants
// ============================================================

/** Direction colors */
const DIRECTION_COLORS: Record<Direction, string> = {
    up: '#22c55e',     // Green for ascending
    down: '#ef4444',   // Red for descending
    stable: '#3b82f6', // Blue for stable
    none: '#6b7280',   // Gray for no pitch
};

/** MIDI note names for labels */
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** MIDI note range to display (can be adjusted based on data) */
const DEFAULT_MIN_MIDI = 36;  // C2
const DEFAULT_MAX_MIDI = 84;  // C6

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
 * Get the MIDI note from a pitch result
 */
function getMidiNote(beat: PitchAtBeat): number | null {
    if (!beat.pitch?.isVoiced) return null;
    return beat.pitch.midiNote ?? null;
}

/**
 * Calculate the Y position for a MIDI note within the graph
 */
function calculateYPosition(
    midiNote: number,
    minMidi: number,
    maxMidi: number,
    height: number,
    paddingTop: number,
    paddingBottom: number
): number {
    const range = maxMidi - minMidi;
    if (range <= 0) return height / 2;

    const usableHeight = height - paddingTop - paddingBottom;
    const normalizedPosition = (midiNote - minMidi) / range;
    // Invert because Y increases downward in SVG
    return paddingTop + usableHeight * (1 - normalizedPosition);
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

/**
 * Determine if a point is a "key point" for label display
 * Key points are: local minima, local maxima, or direction changes
 */
function isKeyPoint(points: ContourPoint[], index: number): boolean {
    if (index === 0 || index === points.length - 1) return true;

    const current = points[index];
    const prev = points[index - 1];
    const next = points[index + 1];

    // Direction change
    if (current.direction !== prev.direction) return true;

    // Local extremum (within voiced section)
    if (current.isVoiced && prev.isVoiced && next.isVoiced) {
        const isLocalMax = current.midiNote > prev.midiNote && current.midiNote > next.midiNote;
        const isLocalMin = current.midiNote < prev.midiNote && current.midiNote < next.midiNote;
        if (isLocalMax || isLocalMin) return true;
    }

    return false;
}

// ============================================================
// Main Component
// ============================================================

export function PitchContourGraph({
    pitchesByBeat,
    onBeatClick,
    selectedBeatIndex,
    disabled = false,
    showNoteLabels = true,
    height = 200,
    showYAxisLabels = true,
    className,
}: PitchContourGraphProps) {
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

    // Container ref for click handling
    const containerRef = useRef<SVGSVGElement>(null);

    // Hover state
    const [hoveredPoint, setHoveredPoint] = useState<ContourPoint | null>(null);

    // Graph dimensions
    const PADDING_LEFT = showYAxisLabels ? 45 : 15;
    const PADDING_RIGHT = 15;
    const PADDING_TOP = 20;
    const PADDING_BOTTOM = 25;
    const graphWidth = 1000; // Will be scaled responsively

    // Keep refs in sync
    useEffect(() => {
        lastAudioTimeRef.current = {
            time: currentTime,
            timestamp: performance.now(),
        };
    }, [currentTime]);

    // Track playback state
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

    // Animation loop for smooth playhead
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

    // Calculate MIDI range from data
    const midiRange = useMemo(() => {
        const voicedNotes = pitchesByBeat
            .map((b) => getMidiNote(b))
            .filter((n): n is number => n !== null);

        if (voicedNotes.length === 0) {
            return { min: DEFAULT_MIN_MIDI, max: DEFAULT_MAX_MIDI };
        }

        const minNote = Math.min(...voicedNotes);
        const maxNote = Math.max(...voicedNotes);

        // Add padding to the range
        return {
            min: Math.max(0, minNote - 2),
            max: Math.min(127, maxNote + 2),
        };
    }, [pitchesByBeat]);

    // Convert pitch data to contour points
    const contourPoints = useMemo((): ContourPoint[] => {
        if (pitchesByBeat.length === 0 || !duration) return [];

        const usableWidth = graphWidth - PADDING_LEFT - PADDING_RIGHT;

        return pitchesByBeat.map((beat) => {
            const midiNote = getMidiNote(beat);
            const isVoiced = midiNote !== null;

            const x = PADDING_LEFT + (beat.timestamp / duration) * usableWidth;
            const y = isVoiced
                ? calculateYPosition(midiNote!, midiRange.min, midiRange.max, height, PADDING_TOP, PADDING_BOTTOM)
                : height / 2;

            return {
                beat,
                x,
                y,
                midiNote: midiNote ?? 0,
                direction: beat.direction as Direction,
                isVoiced,
            };
        });
    }, [pitchesByBeat, duration, midiRange, height, PADDING_LEFT, PADDING_RIGHT]);

    // Generate SVG path segments (grouped by voiced/unvoiced sections)
    const pathSegments = useMemo(() => {
        if (contourPoints.length === 0) return [];

        const segments: Array<{
            points: ContourPoint[];
            isVoiced: boolean;
            color: string;
        }> = [];

        let currentSegment: ContourPoint[] = [];
        let currentIsVoiced = contourPoints[0]?.isVoiced ?? false;

        contourPoints.forEach((point) => {
            // Check if we need to start a new segment
            if (point.isVoiced !== currentIsVoiced && currentSegment.length > 0) {
                segments.push({
                    points: [...currentSegment],
                    isVoiced: currentIsVoiced,
                    color: currentIsVoiced ? DIRECTION_COLORS[currentSegment[currentSegment.length - 1].direction] : DIRECTION_COLORS.none,
                });
                currentSegment = [];
                currentIsVoiced = point.isVoiced;
            }

            currentSegment.push(point);
        });

        // Add the last segment
        if (currentSegment.length > 0) {
            segments.push({
                points: currentSegment,
                isVoiced: currentIsVoiced,
                color: currentIsVoiced ? DIRECTION_COLORS[currentSegment[currentSegment.length - 1].direction] : DIRECTION_COLORS.none,
            });
        }

        return segments;
    }, [contourPoints]);

    // Generate Y-axis labels
    const yAxisLabels = useMemo(() => {
        const labels: Array<{ note: string; y: number; midi: number }> = [];
        const step = 12; // Octave steps

        for (let midi = midiRange.min; midi <= midiRange.max; midi += step) {
            const y = calculateYPosition(midi, midiRange.min, midiRange.max, height, PADDING_TOP, PADDING_BOTTOM);
            labels.push({
                note: midiToNoteName(midi),
                y,
                midi,
            });
        }

        return labels;
    }, [midiRange, height]);

    // Playhead X position
    const playheadX = useMemo(() => {
        if (!duration) return PADDING_LEFT;
        const usableWidth = graphWidth - PADDING_LEFT - PADDING_RIGHT;
        return PADDING_LEFT + (smoothTime / duration) * usableWidth;
    }, [smoothTime, duration]);

    // Handle click to seek
    const handleSvgClick = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
        if (disabled || !containerRef.current || !duration) return;

        const rect = containerRef.current.getBoundingClientRect();
        const clickX = event.clientX - rect.left;

        // Scale click position to SVG coordinates
        const scaleX = graphWidth / rect.width;
        const svgX = clickX * scaleX;

        const usableWidth = graphWidth - PADDING_LEFT - PADDING_RIGHT;
        const timeRatio = (svgX - PADDING_LEFT) / usableWidth;
        const newTime = Math.max(0, Math.min(duration, timeRatio * duration));

        seek(newTime);
    }, [disabled, duration, seek, graphWidth]);

    // Handle point click
    const handlePointClick = useCallback((event: React.MouseEvent, point: ContourPoint) => {
        event.stopPropagation();
        onBeatClick?.(point.beat);
    }, [onBeatClick]);

    // Handle point hover
    const handlePointHover = useCallback((point: ContourPoint | null) => {
        setHoveredPoint(point);
    }, []);

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

    // Key points for labels
    const keyPoints = useMemo(() => {
        if (!showNoteLabels) return [];
        return contourPoints.filter((_, index) => isKeyPoint(contourPoints, index) && contourPoints[index].isVoiced);
    }, [contourPoints, showNoteLabels]);

    // Empty state
    if (pitchesByBeat.length === 0) {
        return (
            <div className={cn('pitch-contour-graph', 'pitch-contour-graph--empty', className)}>
                <p className="pitch-contour-graph-empty-message">No pitch contour data available</p>
            </div>
        );
    }

    return (
        <div className={cn('pitch-contour-graph', className)}>
            {/* SVG Graph */}
            <svg
                ref={containerRef}
                className={cn(
                    'pitch-contour-svg',
                    disabled && 'pitch-contour-svg--disabled'
                )}
                viewBox={`0 0 ${graphWidth} ${height}`}
                preserveAspectRatio="xMidYMid meet"
                onClick={handleSvgClick}
                role="img"
                aria-label="Pitch contour graph showing melody over time"
            >
                {/* Background */}
                <rect
                    className="pitch-contour-background"
                    x={PADDING_LEFT}
                    y={PADDING_TOP}
                    width={graphWidth - PADDING_LEFT - PADDING_RIGHT}
                    height={height - PADDING_TOP - PADDING_BOTTOM}
                />

                {/* Horizontal grid lines */}
                {yAxisLabels.map((label, index) => (
                    <line
                        key={`grid-h-${index}`}
                        className="pitch-contour-grid-line"
                        x1={PADDING_LEFT}
                        y1={label.y}
                        x2={graphWidth - PADDING_RIGHT}
                        y2={label.y}
                    />
                ))}

                {/* Y-axis labels */}
                {showYAxisLabels && yAxisLabels.map((label, index) => (
                    <text
                        key={`y-label-${index}`}
                        className="pitch-contour-y-label"
                        x={PADDING_LEFT - 8}
                        y={label.y}
                        textAnchor="end"
                        dominantBaseline="middle"
                    >
                        {label.note}
                    </text>
                ))}

                {/* X-axis time markers */}
                {duration > 0 && Array.from({ length: 5 }).map((_, index) => {
                    const timeRatio = index / 4;
                    const x = PADDING_LEFT + timeRatio * (graphWidth - PADDING_LEFT - PADDING_RIGHT);
                    const time = timeRatio * duration;

                    return (
                        <g key={`time-marker-${index}`}>
                            <line
                                className="pitch-contour-time-marker"
                                x1={x}
                                y1={height - PADDING_BOTTOM}
                                x2={x}
                                y2={height - PADDING_BOTTOM + 4}
                            />
                            <text
                                className="pitch-contour-x-label"
                                x={x}
                                y={height - PADDING_BOTTOM + 16}
                                textAnchor="middle"
                            >
                                {formatTime(time)}
                            </text>
                        </g>
                    );
                })}

                {/* Pitch contour path segments */}
                {pathSegments.map((segment, segIndex) => {
                    if (segment.points.length < 2) return null;

                    const pathData = segment.points.reduce((path, point, index) => {
                        if (index === 0) {
                            return `M ${point.x} ${point.y}`;
                        }
                        return `${path} L ${point.x} ${point.y}`;
                    }, '');

                    return (
                        <path
                            key={`segment-${segIndex}`}
                            className={cn(
                                'pitch-contour-line',
                                !segment.isVoiced && 'pitch-contour-line--unvoiced'
                            )}
                            d={pathData}
                            stroke={segment.color}
                            fill="none"
                        />
                    );
                })}

                {/* Data points */}
                {contourPoints.filter(p => p.isVoiced).map((point) => {
                    const isSelected = point.beat.beatIndex === selectedBeatIndex;
                    const isHovered = hoveredPoint?.beat.beatIndex === point.beat.beatIndex;

                    return (
                        <circle
                            key={`point-${point.beat.beatIndex}`}
                            className={cn(
                                'pitch-contour-point',
                                isSelected && 'pitch-contour-point--selected',
                                isHovered && 'pitch-contour-point--hovered'
                            )}
                            cx={point.x}
                            cy={point.y}
                            r={isSelected ? 6 : isHovered ? 5 : 3}
                            fill={DIRECTION_COLORS[point.direction]}
                            onClick={(e) => handlePointClick(e, point)}
                            onMouseEnter={() => handlePointHover(point)}
                            onMouseLeave={() => handlePointHover(null)}
                        />
                    );
                })}

                {/* Note labels at key points */}
                {keyPoints.map((point, index) => (
                    <text
                        key={`label-${index}`}
                        className="pitch-contour-note-label"
                        x={point.x}
                        y={point.y - 10}
                        textAnchor="middle"
                        fill={DIRECTION_COLORS[point.direction]}
                    >
                        {midiToNoteName(point.midiNote)}
                    </text>
                ))}

                {/* Playhead */}
                <line
                    className="pitch-contour-playhead"
                    x1={playheadX}
                    y1={PADDING_TOP}
                    x2={playheadX}
                    y2={height - PADDING_BOTTOM}
                />
            </svg>

            {/* Tooltip */}
            {hoveredPoint && (
                <div className="pitch-contour-tooltip">
                    <div className="pitch-contour-tooltip-header">
                        <span
                            className="pitch-contour-tooltip-note"
                            style={{ color: DIRECTION_COLORS[hoveredPoint.direction] }}
                        >
                            {midiToNoteName(hoveredPoint.midiNote)}
                        </span>
                        <span className="pitch-contour-tooltip-beat">
                            Beat {hoveredPoint.beat.beatIndex}
                        </span>
                    </div>
                    <div className="pitch-contour-tooltip-details">
                        <span className="pitch-contour-tooltip-time">
                            {hoveredPoint.beat.timestamp.toFixed(2)}s
                        </span>
                        <span className="pitch-contour-tooltip-separator">•</span>
                        <span
                            className="pitch-contour-tooltip-direction"
                            style={{ color: DIRECTION_COLORS[hoveredPoint.direction] }}
                        >
                            {hoveredPoint.direction === 'up' && 'Ascending'}
                            {hoveredPoint.direction === 'down' && 'Descending'}
                            {hoveredPoint.direction === 'stable' && 'Stable'}
                            {hoveredPoint.direction === 'none' && 'No pitch'}
                        </span>
                    </div>
                </div>
            )}

            {/* Controls */}
            <div className="pitch-contour-controls">
                <button
                    className="pitch-contour-play-btn"
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
                <span className="pitch-contour-time">
                    {formatTime(smoothTime)} / {formatTime(duration)}
                </span>
                <span className="pitch-contour-range">
                    {midiToNoteName(midiRange.min)} - {midiToNoteName(midiRange.max)}
                </span>
            </div>

            {/* Legend */}
            <div className="pitch-contour-legend">
                {Object.entries(DIRECTION_COLORS).map(([key, color]) => (
                    <div key={key} className="pitch-contour-legend-item">
                        <span
                            className="pitch-contour-legend-color"
                            style={{ backgroundColor: color }}
                        />
                        <span className="pitch-contour-legend-label">
                            {key === 'up' && 'Ascending'}
                            {key === 'down' && 'Descending'}
                            {key === 'stable' && 'Stable'}
                            {key === 'none' && 'No pitch'}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default PitchContourGraph;
