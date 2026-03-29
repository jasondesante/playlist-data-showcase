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
 * - Performance: static SVG content is memoized separately from the playhead overlay
 *   so the heavy graph (hundreds of circles/paths/labels) never re-renders during playback
 *
 * Task 5.3: Create PitchContourGraph Component
 */

import { useEffect, useRef, useState, useCallback, useMemo, memo } from 'react';
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
    /** External smooth time from parent (when provided, skips internal RAF loop) */
    smoothTime?: number;
    /** External playing state from parent */
    isPlaying?: boolean;
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

/** Fixed SVG viewBox dimensions */
const GRAPH_WIDTH = 1000;
const PADDING_RIGHT = 15;
const PADDING_TOP = 20;
const PADDING_BOTTOM = 25;

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
// Memoized Sub-components for Performance
// ============================================================

/** Memoized path segment - never re-renders during playback */
const ContourPathSegment = memo(function ContourPathSegment({
    segment,
}: {
    segment: { points: ContourPoint[]; isVoiced: boolean; color: string };
}) {
    if (segment.points.length < 2) return null;
    const pathData = segment.points.reduce((path, point, index) => {
        if (index === 0) return `M ${point.x} ${point.y}`;
        return `${path} L ${point.x} ${point.y}`;
    }, '');
    return (
        <path
            className={cn('pitch-contour-line', !segment.isVoiced && 'pitch-contour-line--unvoiced')}
            d={pathData}
            stroke={segment.color}
            fill="none"
        />
    );
});

/** Memoized data point - uses CSS :hover instead of React state for hover visual */
const ContourPointMarker = memo(function ContourPointMarker({
    point,
    isSelected,
    onClick,
    onHover,
}: {
    point: ContourPoint;
    isSelected: boolean;
    onClick: (e: React.MouseEvent, point: ContourPoint) => void;
    onHover: (point: ContourPoint | null) => void;
}) {
    return (
        <circle
            className={cn('pitch-contour-point', isSelected && 'pitch-contour-point--selected')}
            cx={point.x}
            cy={point.y}
            r={isSelected ? 6 : 3}
            fill={DIRECTION_COLORS[point.direction]}
            onClick={(e) => onClick(e, point)}
            onMouseEnter={() => onHover(point)}
            onMouseLeave={() => onHover(null)}
        />
    );
});

/** Memoized key point label - never re-renders during playback */
const ContourKeyLabel = memo(function ContourKeyLabel({
    point,
}: {
    point: ContourPoint;
}) {
    return (
        <text
            className="pitch-contour-note-label"
            x={point.x}
            y={point.y - 10}
            textAnchor="middle"
            fill={DIRECTION_COLORS[point.direction]}
        >
            {midiToNoteName(point.midiNote)}
        </text>
    );
});

// ============================================================
// Memoized Static SVG — Never re-renders during playback
// ============================================================
//
// All heavy SVG content (contour lines, data points, labels, grid)
// lives here. It only re-renders when pitch data, duration, or
// display settings change — NOT on every RAF frame.
// ============================================================

interface ContourGraphStaticProps {
    pitchesByBeat: PitchAtBeat[];
    duration: number;
    height: number;
    showYAxisLabels: boolean;
    showNoteLabels: boolean;
    selectedBeatIndex?: number;
    disabled: boolean;
    onSvgClick: (e: React.MouseEvent<SVGSVGElement>) => void;
    onPointClick: (e: React.MouseEvent, point: ContourPoint) => void;
    onPointHover: (point: ContourPoint | null) => void;
    containerRef: React.RefObject<SVGSVGElement>;
}

const ContourGraphStatic = memo(function ContourGraphStatic({
    pitchesByBeat,
    duration,
    height,
    showYAxisLabels,
    showNoteLabels,
    selectedBeatIndex,
    disabled,
    onSvgClick,
    onPointClick,
    onPointHover,
    containerRef,
}: ContourGraphStaticProps) {
    const paddingLeft = showYAxisLabels ? 45 : 15;

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

        const usableWidth = GRAPH_WIDTH - paddingLeft - PADDING_RIGHT;

        return pitchesByBeat.map((beat) => {
            const midiNote = getMidiNote(beat);
            const isVoiced = midiNote !== null;

            const x = paddingLeft + (beat.timestamp / duration) * usableWidth;
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
    }, [pitchesByBeat, duration, midiRange, height, paddingLeft]);

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

    // Key points for labels
    const keyPoints = useMemo(() => {
        if (!showNoteLabels) return [];
        return contourPoints.filter((_, index) => isKeyPoint(contourPoints, index) && contourPoints[index].isVoiced);
    }, [contourPoints, showNoteLabels]);

    return (
        <svg
            ref={containerRef}
            className={cn(
                'pitch-contour-svg',
                disabled && 'pitch-contour-svg--disabled'
            )}
            viewBox={`0 0 ${GRAPH_WIDTH} ${height}`}
            preserveAspectRatio="xMidYMid meet"
            onClick={onSvgClick}
            role="img"
            aria-label="Pitch contour graph showing melody over time"
        >
            {/* Background */}
            <rect
                className="pitch-contour-background"
                x={paddingLeft}
                y={PADDING_TOP}
                width={GRAPH_WIDTH - paddingLeft - PADDING_RIGHT}
                height={height - PADDING_TOP - PADDING_BOTTOM}
            />

            {/* Horizontal grid lines */}
            {yAxisLabels.map((label, index) => (
                <line
                    key={`grid-h-${index}`}
                    className="pitch-contour-grid-line"
                    x1={paddingLeft}
                    y1={label.y}
                    x2={GRAPH_WIDTH - PADDING_RIGHT}
                    y2={label.y}
                />
            ))}

            {/* Y-axis labels */}
            {showYAxisLabels && yAxisLabels.map((label, index) => (
                <text
                    key={`y-label-${index}`}
                    className="pitch-contour-y-label"
                    x={paddingLeft - 8}
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
                const x = paddingLeft + timeRatio * (GRAPH_WIDTH - paddingLeft - PADDING_RIGHT);
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
            {pathSegments.map((segment, segIndex) => (
                <ContourPathSegment
                    key={`segment-${segIndex}`}
                    segment={segment}
                />
            ))}

            {/* Data points */}
            {contourPoints.filter(p => p.isVoiced).map((point) => (
                <ContourPointMarker
                    key={`point-${point.beat.beatIndex}`}
                    point={point}
                    isSelected={point.beat.beatIndex === selectedBeatIndex}
                    onClick={onPointClick}
                    onHover={onPointHover}
                />
            ))}

            {/* Note labels at key points */}
            {keyPoints.map((point, index) => (
                <ContourKeyLabel
                    key={`label-${index}`}
                    point={point}
                />
            ))}

            {/* Label for selected beat (always shown when a beat is selected) */}
            {selectedBeatIndex != null && (() => {
                const selected = contourPoints.find(p => p.beat.beatIndex === selectedBeatIndex);
                if (!selected || !selected.isVoiced) return null;
                return (
                    <ContourKeyLabel
                        key={`selected-label-${selectedBeatIndex}`}
                        point={selected}
                    />
                );
            })()}
        </svg>
    );
});

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
    smoothTime: externalSmoothTime,
    isPlaying: externalIsPlaying,
}: PitchContourGraphProps) {
    // Controlled mode: parent provides smoothTime/isPlaying, skip internal RAF
    const isControlled = externalSmoothTime !== undefined;
    const [internalSmoothTime, setSmoothTime] = useState(() => useAudioPlayerStore.getState().currentTime);
    const smoothTime = isControlled ? externalSmoothTime! : internalSmoothTime;

    const playbackState = useAudioPlayerStore((state) => state.playbackState);
    const storeSeek = useAudioPlayerStore((state) => state.seek);
    const resume = useAudioPlayerStore((state) => state.resume);
    const pause = useAudioPlayerStore((state) => state.pause);
    const play = useAudioPlayerStore((state) => state.play);
    const currentUrl = useAudioPlayerStore((state) => state.currentUrl);
    const { selectedTrack } = usePlaylistStore();
    const duration = useTrackDuration();

    const isPlaying = isControlled ? (externalIsPlaying ?? false) : (playbackState === 'playing');

    // Smart seek wrapper
    const seek = useCallback((time: number) => {
        storeSeek(time, currentUrl || selectedTrack?.audio_url);
    }, [storeSeek, currentUrl, selectedTrack?.audio_url]);

    // Animation state (only used in uncontrolled mode)
    const animationFrameRef = useRef<number | null>(null);
    const lastAudioTimeRef = useRef<{ time: number; timestamp: number }>({
        time: useAudioPlayerStore.getState().currentTime,
        timestamp: performance.now(),
    });
    const isPlayingRef = useRef(isPlaying);

    // Container ref for click handling (attached to static SVG via ref prop)
    const containerRef = useRef<SVGSVGElement>(null);

    // Hover state
    const [hoveredPoint, setHoveredPoint] = useState<ContourPoint | null>(null);

    // Padding for playhead positioning (must match ContourGraphStatic internals)
    const paddingLeft = showYAxisLabels ? 45 : 15;

    // === Uncontrolled mode only: internal RAF loop and store subscriptions ===
    const prevIsPlayingRef = useRef(isPlaying);
    useEffect(() => {
        if (isControlled) return;
        isPlayingRef.current = isPlaying;
        const playbackJustStarted = isPlaying && !prevIsPlayingRef.current;
        if (playbackJustStarted) {
            const storeTime = useAudioPlayerStore.getState().currentTime;
            lastAudioTimeRef.current = { time: storeTime, timestamp: performance.now() };
            setSmoothTime(storeTime);
        }
        prevIsPlayingRef.current = isPlaying;
    }, [isPlaying, isControlled]);

    useEffect(() => {
        if (isControlled) return;
        if (!isPlaying) return;
        const animate = () => {
            const storeTime = useAudioPlayerStore.getState().currentTime;
            if (Math.abs(storeTime - lastAudioTimeRef.current.time) > 0.001) {
                lastAudioTimeRef.current = { time: storeTime, timestamp: performance.now() };
            }
            const now = performance.now();
            const { time, timestamp } = lastAudioTimeRef.current;
            const interpolatedTime = Math.min(time + (now - timestamp) / 1000, duration || 9999);
            setSmoothTime(interpolatedTime);
            if (isPlayingRef.current && interpolatedTime < (duration || 9999)) {
                animationFrameRef.current = requestAnimationFrame(animate);
            }
        };
        animationFrameRef.current = requestAnimationFrame(animate);
        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [isPlaying, duration, isControlled]);

    useEffect(() => {
        if (isControlled) return;
        let lastSeenTime = useAudioPlayerStore.getState().currentTime;
        return useAudioPlayerStore.subscribe((state) => {
            if (!isPlayingRef.current && Math.abs(state.currentTime - lastSeenTime) > 0.01) {
                lastSeenTime = state.currentTime;
                setSmoothTime(state.currentTime);
                lastAudioTimeRef.current = { time: state.currentTime, timestamp: performance.now() };
            }
        });
    }, [isControlled]);

    // Playhead position — the ONLY thing that changes every frame during playback
    const playheadX = useMemo(() => {
        if (!duration) return paddingLeft;
        const usableWidth = GRAPH_WIDTH - paddingLeft - PADDING_RIGHT;
        return paddingLeft + (smoothTime / duration) * usableWidth;
    }, [smoothTime, duration, paddingLeft]);

    // Handle click to seek
    const handleSvgClick = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
        if (disabled || !containerRef.current || !duration) return;

        const rect = containerRef.current.getBoundingClientRect();
        const clickX = event.clientX - rect.left;

        // Scale click position to SVG coordinates
        const scaleX = GRAPH_WIDTH / rect.width;
        const svgX = clickX * scaleX;

        const usableWidth = GRAPH_WIDTH - paddingLeft - PADDING_RIGHT;
        const timeRatio = (svgX - paddingLeft) / usableWidth;
        const newTime = Math.max(0, Math.min(duration, timeRatio * duration));

        seek(newTime);
    }, [disabled, duration, seek, paddingLeft]);

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

    // MIDI range for display in controls (lightweight, depends only on pitchesByBeat)
    const midiRange = useMemo(() => {
        const voicedNotes = pitchesByBeat
            .map((b) => getMidiNote(b))
            .filter((n): n is number => n !== null);

        if (voicedNotes.length === 0) {
            return { min: DEFAULT_MIN_MIDI, max: DEFAULT_MAX_MIDI };
        }

        const minNote = Math.min(...voicedNotes);
        const maxNote = Math.max(...voicedNotes);

        return {
            min: Math.max(0, minNote - 2),
            max: Math.min(127, maxNote + 2),
        };
    }, [pitchesByBeat]);

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
            {/* Graph canvas: static SVG + playhead overlay */}
            <div className="pitch-contour-graph-canvas">
                {/* Static SVG — memoized, only re-renders when pitch data changes */}
                <ContourGraphStatic
                    pitchesByBeat={pitchesByBeat}
                    duration={duration || 0}
                    height={height}
                    showYAxisLabels={showYAxisLabels}
                    showNoteLabels={showNoteLabels}
                    selectedBeatIndex={selectedBeatIndex}
                    disabled={disabled}
                    onSvgClick={handleSvgClick}
                    onPointClick={handlePointClick}
                    onPointHover={handlePointHover}
                    containerRef={containerRef}
                />
                {/* Playhead overlay — separate SVG layer, only this updates during playback */}
                <svg
                    className="pitch-contour-playhead-overlay"
                    viewBox={`0 0 ${GRAPH_WIDTH} ${height}`}
                    preserveAspectRatio="xMidYMid meet"
                >
                    <line
                        className="pitch-contour-playhead"
                        x1={playheadX}
                        y1={PADDING_TOP}
                        x2={playheadX}
                        y2={height - PADDING_BOTTOM}
                    />
                </svg>
            </div>

            {/* Beat info bar - always visible, updates on hover */}
            <div className="pitch-contour-tooltip">
                {hoveredPoint ? (
                    <>
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
                    </>
                ) : (
                    <>
                        <div className="pitch-contour-tooltip-header">
                            <span className="pitch-contour-tooltip-note pitch-contour-tooltip-skeleton">--</span>
                            <span className="pitch-contour-tooltip-beat pitch-contour-tooltip-skeleton">Beat --</span>
                        </div>
                        <div className="pitch-contour-tooltip-details">
                            <span className="pitch-contour-tooltip-time pitch-contour-tooltip-skeleton">0.00s</span>
                            <span className="pitch-contour-tooltip-separator">•</span>
                            <span className="pitch-contour-tooltip-direction pitch-contour-tooltip-skeleton">--</span>
                        </div>
                    </>
                )}
            </div>

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
