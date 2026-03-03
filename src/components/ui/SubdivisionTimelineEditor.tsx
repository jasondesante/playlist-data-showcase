/**
 * SubdivisionTimelineEditor Component
 *
 * A visual timeline editor for configuring subdivision segments.
 * Part of Phase 4: SubdivisionTimelineEditor Component
 *
 * Features:
 * - Visual timeline showing beat positions
 * - Colored regions for each subdivision segment
 * - Drag handles to adjust segment boundaries
 * - Click to add new segment at position
 * - Zoom and scroll for long tracks
 *
 * @component
 */
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { ZoomIn, ZoomOut, Plus, MoveHorizontal } from 'lucide-react';
import './SubdivisionTimelineEditor.css';
import {
    useBeatDetectionStore,
    useSubdivisionConfig,
    useUnifiedBeatMap,
} from '../../store/beatDetectionStore';
import type { SubdivisionType } from '@/types';

/**
 * Subdivision type configuration for display and coloring
 */
interface SubdivisionTypeConfig {
    id: SubdivisionType;
    label: string;
    shortLabel: string;
    color: string;
    backgroundColor: string;
}

/**
 * All subdivision types with their display properties and colors
 * Colors match the CSS variables defined in base.css (Phase 8, Task 8.1)
 *
 * CSS Variables Reference:
 * --subdivision-quarter: 210 100% 50% (Primary blue)
 * --subdivision-half: 142 76% 46% (Green)
 * --subdivision-eighth: 30 100% 50% (Orange)
 * --subdivision-sixteenth: 0 84% 60% (Red)
 * --subdivision-triplet8: 280 80% 55% (Purple)
 * --subdivision-triplet4: 330 80% 55% (Pink)
 * --subdivision-dotted4: 180 70% 45% (Teal)
 * --subdivision-dotted8: 48 96% 53% (Yellow/Gold)
 */
const SUBDIVISION_TYPES: SubdivisionTypeConfig[] = [
    {
        id: 'quarter',
        label: 'Quarter',
        shortLabel: '1x',
        color: 'hsl(210, 100%, 50%)', // Primary blue
        backgroundColor: 'hsla(210, 100%, 50%, 0.2)',
    },
    {
        id: 'half',
        label: 'Half',
        shortLabel: '0.5x',
        color: 'hsl(142, 76%, 46%)', // Green
        backgroundColor: 'hsla(142, 76%, 46%, 0.2)',
    },
    {
        id: 'eighth',
        label: 'Eighth',
        shortLabel: '2x',
        color: 'hsl(30, 100%, 50%)', // Orange
        backgroundColor: 'hsla(30, 100%, 50%, 0.2)',
    },
    {
        id: 'sixteenth',
        label: 'Sixteenth',
        shortLabel: '4x',
        color: 'hsl(0, 84%, 60%)', // Red
        backgroundColor: 'hsla(0, 84%, 60%, 0.2)',
    },
    {
        id: 'triplet8',
        label: 'Triplet 8th',
        shortLabel: '3/Q',
        color: 'hsl(280, 80%, 55%)', // Purple
        backgroundColor: 'hsla(280, 80%, 55%, 0.2)',
    },
    {
        id: 'triplet4',
        label: 'Triplet 4th',
        shortLabel: '3/H',
        color: 'hsl(330, 80%, 55%)', // Pink
        backgroundColor: 'hsla(330, 80%, 55%, 0.2)',
    },
    {
        id: 'dotted4',
        label: 'Dotted Q',
        shortLabel: '1.5x',
        color: 'hsl(180, 70%, 45%)', // Teal
        backgroundColor: 'hsla(180, 70%, 45%, 0.2)',
    },
    {
        id: 'dotted8',
        label: 'Dotted 8th',
        shortLabel: 'Swing',
        color: 'hsl(48, 96%, 53%)', // Yellow/Gold
        backgroundColor: 'hsla(48, 96%, 53%, 0.2)',
    },
];

/**
 * Get subdivision type config by id
 */
const getTypeConfig = (type: SubdivisionType): SubdivisionTypeConfig => {
    return SUBDIVISION_TYPES.find(t => t.id === type) ?? SUBDIVISION_TYPES[0];
};

/**
 * Props for the SubdivisionTimelineEditor component.
 */
interface SubdivisionTimelineEditorProps {
    /**
     * Whether the editor controls should be disabled.
     * When true, all controls are non-interactive.
     * @default false
     */
    disabled?: boolean;
}

/**
 * SubdivisionTimelineEditor Component
 *
 * Renders a visual timeline for editing subdivision segments with
 * drag-and-drop boundary adjustment and click-to-add functionality.
 */
export function SubdivisionTimelineEditor({ disabled = false }: SubdivisionTimelineEditorProps) {
    const subdivisionConfig = useSubdivisionConfig();
    const unifiedBeatMap = useUnifiedBeatMap();

    const addSubdivisionSegment = useBeatDetectionStore((state) => state.actions.addSubdivisionSegment);
    const updateSubdivisionSegment = useBeatDetectionStore((state) => state.actions.updateSubdivisionSegment);

    // Timeline container ref
    const timelineRef = useRef<HTMLDivElement>(null);
    const timeRulerRef = useRef<HTMLDivElement>(null);
    const beatRulerRef = useRef<HTMLDivElement>(null);

    // Zoom state (1 = 100%, 2 = 200%, etc.)
    const [zoom, setZoom] = useState(1);

    // Scroll position
    const [scrollPosition, setScrollPosition] = useState(0);

    // Dragging state
    const [draggingSegment, setDraggingSegment] = useState<number | null>(null);
    const [dragStartX, setDragStartX] = useState(0);
    const [dragStartBeat, setDragStartBeat] = useState(0);

    // Adding segment state
    const [showTypePicker, setShowTypePicker] = useState(false);
    const [pendingSegmentBeat, setPendingSegmentBeat] = useState(0);

    // Hover state for segment info tooltip
    const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);

    // Check if we have a UnifiedBeatMap to work with
    const hasUnifiedBeatMap = unifiedBeatMap !== null;
    const totalBeats = unifiedBeatMap?.beats.length ?? 0;

    // Calculate timeline dimensions
    const basePixelsPerBeat = 8; // Base width per beat at 1x zoom
    const pixelsPerBeat = basePixelsPerBeat * zoom;
    const timelineWidth = totalBeats * pixelsPerBeat;

    // Beats per measure from downbeat config (from first segment's time signature)
    const beatsPerMeasure = unifiedBeatMap?.downbeatConfig?.segments?.[0]?.timeSignature?.beatsPerMeasure ?? 4;

    // Duration in seconds from UnifiedBeatMap
    const duration = unifiedBeatMap?.duration ?? 0;

    /**
     * Calculate beat position from mouse X coordinate
     */
    const getBeatFromX = useCallback((x: number): number => {
        if (!timelineRef.current) return 0;

        const rect = timelineRef.current.getBoundingClientRect();
        const scrollLeft = timelineRef.current.scrollLeft;
        const relativeX = x - rect.left + scrollLeft;
        const beat = Math.round(relativeX / pixelsPerBeat);

        return Math.max(0, Math.min(beat, totalBeats - 1));
    }, [pixelsPerBeat, totalBeats]);

    /**
     * Calculate X position from beat index
     */
    const getXFromBeat = useCallback((beat: number): number => {
        return beat * pixelsPerBeat;
    }, [pixelsPerBeat]);

    /**
     * Handle zoom in
     */
    const handleZoomIn = () => {
        setZoom(prev => Math.min(prev * 1.5, 8));
    };

    /**
     * Handle zoom out
     */
    const handleZoomOut = () => {
        setZoom(prev => Math.max(prev / 1.5, 0.5));
    };

    /**
     * Check if a beat position falls within any existing segment's range
     * (Phase 4, Task 4.4: Validate - can't overlap existing segments)
     */
    const isBeatWithinSegmentRange = useCallback((beat: number): boolean => {
        for (let i = 0; i < subdivisionConfig.segments.length; i++) {
            const segment = subdivisionConfig.segments[i];
            const nextSegment = subdivisionConfig.segments[i + 1];
            const endBeat = nextSegment ? nextSegment.startBeat : totalBeats;

            // Check if beat falls within this segment's range [startBeat, endBeat)
            if (beat >= segment.startBeat && beat < endBeat) {
                return true;
            }
        }
        return false;
    }, [subdivisionConfig.segments, totalBeats]);

    /**
     * Handle click on timeline to add segment
     * (Phase 4, Task 4.4: Click to Add Segment)
     */
    const handleTimelineClick = (e: React.MouseEvent) => {
        if (disabled || draggingSegment !== null) return;

        // Only handle clicks on the timeline track, not on segments or handles
        if ((e.target as HTMLElement).closest('.subdivision-timeline-editor-segment') ||
            (e.target as HTMLElement).closest('.subdivision-timeline-editor-handle')) {
            return;
        }

        const beat = getBeatFromX(e.clientX);

        // Validate: can't add at beat 0 (first segment's domain)
        // and can't overlap existing segments
        if (beat > 0 && !isBeatWithinSegmentRange(beat)) {
            // Show type picker
            setPendingSegmentBeat(beat);
            setShowTypePicker(true);
        }
    };

    /**
     * Handle adding segment with selected type
     */
    const handleAddSegmentWithType = (type: SubdivisionType) => {
        addSubdivisionSegment({
            startBeat: pendingSegmentBeat,
            subdivision: type,
        });
        setShowTypePicker(false);
    };

    /**
     * Handle mouse down on segment boundary (start drag)
     */
    const handleHandleMouseDown = (e: React.MouseEvent, segmentIndex: number) => {
        if (disabled) return;
        e.stopPropagation();

        const segment = subdivisionConfig.segments[segmentIndex];
        setDraggingSegment(segmentIndex);
        setDragStartX(e.clientX);
        setDragStartBeat(segment.startBeat);
    };

    /**
     * Handle mouse move during drag
     */
    useEffect(() => {
        if (draggingSegment === null) return;

        const handleMouseMove = (e: MouseEvent) => {
            const deltaX = e.clientX - dragStartX;
            const deltaBeats = Math.round(deltaX / pixelsPerBeat);
            const newStartBeat = Math.max(
                draggingSegment === 0 ? 0 : (subdivisionConfig.segments[draggingSegment - 1]?.startBeat ?? 0) + 1,
                Math.min(dragStartBeat + deltaBeats, totalBeats - 1)
            );

            // Don't allow overlapping segments
            const nextSegment = subdivisionConfig.segments[draggingSegment + 1];
            if (nextSegment && newStartBeat >= nextSegment.startBeat) {
                return;
            }

            if (newStartBeat !== subdivisionConfig.segments[draggingSegment].startBeat) {
                updateSubdivisionSegment(draggingSegment, {
                    ...subdivisionConfig.segments[draggingSegment],
                    startBeat: newStartBeat,
                });
            }
        };

        const handleMouseUp = () => {
            setDraggingSegment(null);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [draggingSegment, dragStartX, dragStartBeat, pixelsPerBeat, subdivisionConfig.segments, totalBeats, updateSubdivisionSegment]);

    /**
     * Handle keyboard navigation for segment boundaries
     */
    const handleHandleKeyDown = (e: React.KeyboardEvent, segmentIndex: number) => {
        if (disabled) return;

        const segment = subdivisionConfig.segments[segmentIndex];
        let newStartBeat = segment.startBeat;

        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                newStartBeat = Math.max(
                    segmentIndex === 0 ? 0 : (subdivisionConfig.segments[segmentIndex - 1]?.startBeat ?? 0) + 1,
                    segment.startBeat - 1
                );
                break;
            case 'ArrowRight':
                e.preventDefault();
                const maxBeat = subdivisionConfig.segments[segmentIndex + 1]
                    ? subdivisionConfig.segments[segmentIndex + 1].startBeat - 1
                    : totalBeats - 1;
                newStartBeat = Math.min(maxBeat, segment.startBeat + 1);
                break;
            default:
                return;
        }

        if (newStartBeat !== segment.startBeat) {
            updateSubdivisionSegment(segmentIndex, {
                ...segment,
                startBeat: newStartBeat,
            });
        }
    };

    /**
     * Generate beat markers for the timeline
     */
    const beatMarkers = useMemo(() => {
        if (!hasUnifiedBeatMap || totalBeats === 0) return [];

        const markers = [];
        const visibleStartBeat = Math.floor(scrollPosition / pixelsPerBeat);
        const visibleEndBeat = Math.ceil((scrollPosition + (timelineRef.current?.clientWidth ?? 800)) / pixelsPerBeat);

        // Only render visible beat markers for performance
        for (let i = Math.max(0, visibleStartBeat); i <= Math.min(totalBeats - 1, visibleEndBeat + 50); i++) {
            const isDownbeat = i % beatsPerMeasure === 0;
            markers.push({
                beat: i,
                position: getXFromBeat(i),
                isDownbeat,
            });
        }

        return markers;
    }, [hasUnifiedBeatMap, totalBeats, scrollPosition, pixelsPerBeat, beatsPerMeasure, getXFromBeat]);

    /**
     * Generate time ruler markers (Task 4.2)
     * Shows seconds and minutes on a ruler above the timeline
     */
    const timeMarkers = useMemo(() => {
        if (!hasUnifiedBeatMap || duration === 0) return [];

        const markers = [];
        const timelineContainerWidth = timelineRef.current?.clientWidth ?? 800;

        // Calculate visible time range
        const visibleStartTime = (scrollPosition / timelineWidth) * duration;
        const visibleEndTime = ((scrollPosition + timelineContainerWidth) / timelineWidth) * duration;

        // Determine appropriate interval based on zoom and duration
        let interval: number;
        const visibleDuration = visibleEndTime - visibleStartTime;
        if (visibleDuration > 600) {
            interval = 60; // 1 minute intervals
        } else if (visibleDuration > 120) {
            interval = 30; // 30 second intervals
        } else if (visibleDuration > 60) {
            interval = 15; // 15 second intervals
        } else if (visibleDuration > 30) {
            interval = 10; // 10 second intervals
        } else if (visibleDuration > 10) {
            interval = 5; // 5 second intervals
        } else {
            interval = 1; // 1 second intervals
        }

        // Generate markers
        const startInterval = Math.floor(visibleStartTime / interval) * interval;
        const endInterval = Math.ceil(visibleEndTime / interval) * interval;

        for (let time = startInterval; time <= endInterval; time += interval) {
            if (time < 0 || time > duration) continue;

            const position = (time / duration) * timelineWidth;
            const minutes = Math.floor(time / 60);
            const seconds = Math.floor(time % 60);
            const isMinute = time % 60 === 0;

            markers.push({
                time,
                position,
                label: minutes > 0
                    ? `${minutes}:${seconds.toString().padStart(2, '0')}`
                    : `${seconds}s`,
                isMinute,
            });
        }

        return markers;
    }, [hasUnifiedBeatMap, duration, scrollPosition, timelineWidth]);

    /**
     * Generate beat ruler markers (Task 4.2)
     * Shows beat numbers on a ruler below the timeline
     */
    const beatRulerMarkers = useMemo(() => {
        if (!hasUnifiedBeatMap || totalBeats === 0) return [];

        const markers: Array<{
            beat: number;
            position: number;
            label: string;
            isMajor: boolean;
        }> = [];
        const timelineContainerWidth = timelineRef.current?.clientWidth ?? 800;

        // Calculate visible beat range
        const visibleStartBeat = Math.floor(scrollPosition / pixelsPerBeat);
        const visibleEndBeat = Math.ceil((scrollPosition + timelineContainerWidth) / pixelsPerBeat);

        // Determine appropriate interval based on zoom
        let interval: number;
        if (pixelsPerBeat >= 32) {
            interval = 1; // Show every beat
        } else if (pixelsPerBeat >= 16) {
            interval = 2; // Show every 2 beats
        } else if (pixelsPerBeat >= 8) {
            interval = 4; // Show every 4 beats (one measure in 4/4)
        } else if (pixelsPerBeat >= 4) {
            interval = 8; // Show every 8 beats
        } else {
            interval = 16; // Show every 16 beats
        }

        // Generate markers
        const startBeat = Math.floor(visibleStartBeat / interval) * interval;
        const endBeat = Math.ceil(visibleEndBeat / interval) * interval;

        for (let beat = startBeat; beat <= endBeat; beat += interval) {
            if (beat < 0 || beat > totalBeats) continue;

            const position = getXFromBeat(beat);
            const isMeasure = beat % beatsPerMeasure === 0;

            markers.push({
                beat,
                position,
                label: isMeasure ? `M${Math.floor(beat / beatsPerMeasure) + 1}` : `${beat}`,
                isMajor: isMeasure,
            });
        }

        return markers;
    }, [hasUnifiedBeatMap, totalBeats, scrollPosition, pixelsPerBeat, beatsPerMeasure, getXFromBeat]);

    /**
     * Calculate segment positions for rendering
     */
    const segmentRegions = useMemo(() => {
        return subdivisionConfig.segments.map((segment, index) => {
            const typeConfig = getTypeConfig(segment.subdivision);
            const nextSegment = subdivisionConfig.segments[index + 1];
            const endBeat = nextSegment ? nextSegment.startBeat : totalBeats;

            return {
                index,
                segment,
                typeConfig,
                startX: getXFromBeat(segment.startBeat),
                width: getXFromBeat(endBeat) - getXFromBeat(segment.startBeat),
                endBeat,
            };
        });
    }, [subdivisionConfig.segments, totalBeats, getXFromBeat]);

    /**
     * Handle scroll event to update visible markers and sync rulers
     */
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollLeft = e.currentTarget.scrollLeft;
        setScrollPosition(scrollLeft);

        // Sync time ruler and beat ruler scroll
        if (timeRulerRef.current && timeRulerRef.current !== e.currentTarget) {
            timeRulerRef.current.scrollLeft = scrollLeft;
        }
        if (beatRulerRef.current && beatRulerRef.current !== e.currentTarget) {
            beatRulerRef.current.scrollLeft = scrollLeft;
        }
    };

    // Don't render if no beat map
    if (!hasUnifiedBeatMap) {
        return null;
    }

    return (
        <div className="subdivision-timeline-editor">
            {/* ============================================================
             * HEADER SECTION
             * ============================================================ */}
            <div className="subdivision-timeline-editor-header">
                <div className="subdivision-timeline-editor-title-row">
                    <span className="subdivision-timeline-editor-title">Timeline Editor</span>
                    <span className="subdivision-timeline-editor-summary">
                        {totalBeats} beats • {subdivisionConfig.segments.length} segment{subdivisionConfig.segments.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {/* Zoom controls */}
                <div className="subdivision-timeline-editor-zoom">
                    <button
                        type="button"
                        className="subdivision-timeline-editor-zoom-btn"
                        onClick={handleZoomOut}
                        disabled={disabled || zoom <= 0.5}
                        aria-label="Zoom out"
                        title="Zoom out"
                    >
                        <ZoomOut className="subdivision-timeline-editor-zoom-icon" />
                    </button>
                    <span className="subdivision-timeline-editor-zoom-level">
                        {Math.round(zoom * 100)}%
                    </span>
                    <button
                        type="button"
                        className="subdivision-timeline-editor-zoom-btn"
                        onClick={handleZoomIn}
                        disabled={disabled || zoom >= 8}
                        aria-label="Zoom in"
                        title="Zoom in"
                    >
                        <ZoomIn className="subdivision-timeline-editor-zoom-icon" />
                    </button>
                </div>
            </div>

            {/* ============================================================
             * TIMELINE TRACK CONTAINER
             * ============================================================ */}
            <div className="subdivision-timeline-editor-timeline-container">
                {/* ============================================================
                 * TIME RULER (Task 4.2)
                 * ============================================================ */}
                <div
                    ref={timeRulerRef}
                    className="subdivision-timeline-editor-time-ruler"
                    onScroll={handleScroll}
                >
                    <div
                        className="subdivision-timeline-editor-time-ruler-inner"
                        style={{ width: `${timelineWidth}px` }}
                    >
                        {timeMarkers.map(({ time, position, label, isMinute }) => (
                            <div
                                key={`time-${time}`}
                                className={`subdivision-timeline-editor-time-marker ${
                                    isMinute ? 'subdivision-timeline-editor-time-marker--minute' : ''
                                }`}
                                style={{ left: `${position}px` }}
                            >
                                <div className="subdivision-timeline-editor-time-marker-tick" />
                                <span className="subdivision-timeline-editor-time-marker-label">
                                    {label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ============================================================
                 * TIMELINE TRACK
                 * ============================================================ */}
                <div
                    ref={timelineRef}
                    className="subdivision-timeline-editor-track"
                    onScroll={handleScroll}
                    onClick={handleTimelineClick}
                >
                    {/* Timeline inner container with proper width */}
                    <div
                        className="subdivision-timeline-editor-track-inner"
                        style={{ width: `${timelineWidth}px` }}
                    >
                        {/* Beat grid lines */}
                        {beatMarkers.map(({ beat, position, isDownbeat }) => (
                            <div
                                key={`beat-${beat}`}
                                className={`subdivision-timeline-editor-grid-line ${
                                    isDownbeat ? 'subdivision-timeline-editor-grid-line--measure' : ''
                                }`}
                                style={{ left: `${position}px` }}
                            >
                                {isDownbeat && (
                                    <span className="subdivision-timeline-editor-measure-number">
                                        M{Math.floor(beat / beatsPerMeasure) + 1}
                                    </span>
                                )}
                            </div>
                        ))}

                        {/* Segment regions */}
                        {segmentRegions.map(({ index, segment, typeConfig, startX, width, endBeat }) => (
                            <div
                                key={`segment-${index}`}
                                className={`subdivision-timeline-editor-segment ${
                                    hoveredSegment === index ? 'subdivision-timeline-editor-segment--hovered' : ''
                                }`}
                                style={{
                                    left: `${startX}px`,
                                    width: `${Math.max(2, width)}px`,
                                    backgroundColor: typeConfig.backgroundColor,
                                    borderColor: typeConfig.color,
                                }}
                                onMouseEnter={() => setHoveredSegment(index)}
                                onMouseLeave={() => setHoveredSegment(null)}
                            >
                                {/* Segment label */}
                                <div
                                    className="subdivision-timeline-editor-segment-label"
                                    style={{ color: typeConfig.color }}
                                >
                                    {typeConfig.shortLabel}
                                </div>

                                {/* Segment info tooltip on hover */}
                                {hoveredSegment === index && (
                                    <div className="subdivision-timeline-editor-segment-tooltip">
                                        <div className="subdivision-timeline-editor-segment-tooltip-title">
                                            {typeConfig.label}
                                        </div>
                                        <div className="subdivision-timeline-editor-segment-tooltip-detail">
                                            Beat {segment.startBeat} - {endBeat - 1}
                                        </div>
                                        <div className="subdivision-timeline-editor-segment-tooltip-hint">
                                            Drag edge to adjust
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Segment boundary handles */}
                        {subdivisionConfig.segments.map((segment, index) => {
                            // Skip first segment handle (can't drag beat 0)
                            if (index === 0) return null;

                            const typeConfig = getTypeConfig(segment.subdivision);
                            return (
                                <div
                                    key={`handle-${index}`}
                                    className={`subdivision-timeline-editor-handle ${
                                        draggingSegment === index ? 'subdivision-timeline-editor-handle--dragging' : ''
                                    }`}
                                    style={{
                                        left: `${getXFromBeat(segment.startBeat)}px`,
                                        backgroundColor: typeConfig.color,
                                    }}
                                    onMouseDown={(e) => handleHandleMouseDown(e, index)}
                                    onKeyDown={(e) => handleHandleKeyDown(e, index)}
                                    tabIndex={disabled ? -1 : 0}
                                    role="slider"
                                    aria-label={`Segment ${index + 1} boundary at beat ${segment.startBeat}`}
                                    aria-valuemin={(subdivisionConfig.segments[index - 1]?.startBeat ?? -1) + 1}
                                    aria-valuemax={(subdivisionConfig.segments[index + 1]?.startBeat ?? totalBeats) - 1}
                                    aria-valuenow={segment.startBeat}
                                >
                                    <div className="subdivision-timeline-editor-handle-grip">
                                        <MoveHorizontal className="subdivision-timeline-editor-handle-icon" />
                                    </div>
                                    <div className="subdivision-timeline-editor-handle-label">
                                        {segment.startBeat}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ============================================================
                 * BEAT RULER (Task 4.2)
                 * ============================================================ */}
                <div
                    ref={beatRulerRef}
                    className="subdivision-timeline-editor-beat-ruler"
                    onScroll={handleScroll}
                >
                    <div
                        className="subdivision-timeline-editor-beat-ruler-inner"
                        style={{ width: `${timelineWidth}px` }}
                    >
                        {beatRulerMarkers.map(({ beat, position, label, isMajor }) => (
                            <div
                                key={`beat-ruler-${beat}`}
                                className={`subdivision-timeline-editor-beat-marker ${
                                    isMajor ? 'subdivision-timeline-editor-beat-marker--major' : ''
                                }`}
                                style={{ left: `${position}px` }}
                            >
                                <div className="subdivision-timeline-editor-beat-marker-tick" />
                                <span className="subdivision-timeline-editor-beat-marker-label">
                                    {label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ============================================================
             * TYPE PICKER POPUP
             * ============================================================ */}
            {showTypePicker && (
                <div className="subdivision-timeline-editor-type-picker-overlay">
                    <div className="subdivision-timeline-editor-type-picker">
                        <div className="subdivision-timeline-editor-type-picker-header">
                            <span>Add Segment at Beat {pendingSegmentBeat}</span>
                            <button
                                type="button"
                                className="subdivision-timeline-editor-type-picker-close"
                                onClick={() => setShowTypePicker(false)}
                            >
                                &times;
                            </button>
                        </div>
                        <div className="subdivision-timeline-editor-type-picker-options">
                            {SUBDIVISION_TYPES.map((type) => (
                                <button
                                    key={type.id}
                                    type="button"
                                    className="subdivision-timeline-editor-type-picker-option"
                                    style={{
                                        borderColor: type.color,
                                        '--type-color': type.color,
                                    } as React.CSSProperties}
                                    onClick={() => handleAddSegmentWithType(type.id)}
                                >
                                    <span
                                        className="subdivision-timeline-editor-type-picker-color"
                                        style={{ backgroundColor: type.color }}
                                    />
                                    <span className="subdivision-timeline-editor-type-picker-label">
                                        {type.label}
                                    </span>
                                    <span className="subdivision-timeline-editor-type-picker-short">
                                        {type.shortLabel}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================
             * LEGEND
             * ============================================================ */}
            <div className="subdivision-timeline-editor-legend">
                {SUBDIVISION_TYPES.map((type) => (
                    <div key={type.id} className="subdivision-timeline-editor-legend-item">
                        <div
                            className="subdivision-timeline-editor-legend-color"
                            style={{ backgroundColor: type.color }}
                        />
                        <span className="subdivision-timeline-editor-legend-label">
                            {type.shortLabel}
                        </span>
                    </div>
                ))}
            </div>

            {/* ============================================================
             * HINT
             * ============================================================ */}
            <div className="subdivision-timeline-editor-hint">
                <Plus className="subdivision-timeline-editor-hint-icon" />
                <span className="subdivision-timeline-editor-hint-text">
                    Click on timeline to add segment • Drag handles to adjust boundaries
                </span>
            </div>
        </div>
    );
}

export default SubdivisionTimelineEditor;
