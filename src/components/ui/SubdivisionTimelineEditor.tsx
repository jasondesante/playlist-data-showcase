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
 * Colors are defined per Phase 8 Task 8.1 specifications
 */
const SUBDIVISION_TYPES: SubdivisionTypeConfig[] = [
    {
        id: 'quarter',
        label: 'Quarter',
        shortLabel: '1x',
        color: 'hsl(217, 91%, 60%)', // Primary blue
        backgroundColor: 'hsla(217, 91%, 60%, 0.2)',
    },
    {
        id: 'half',
        label: 'Half',
        shortLabel: '0.5x',
        color: 'hsl(142, 76%, 36%)', // Green
        backgroundColor: 'hsla(142, 76%, 36%, 0.2)',
    },
    {
        id: 'eighth',
        label: 'Eighth',
        shortLabel: '2x',
        color: 'hsl(38, 92%, 50%)', // Orange
        backgroundColor: 'hsla(38, 92%, 50%, 0.2)',
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
        color: 'hsl(271, 91%, 65%)', // Purple
        backgroundColor: 'hsla(271, 91%, 65%, 0.2)',
    },
    {
        id: 'triplet4',
        label: 'Triplet 4th',
        shortLabel: '3/H',
        color: 'hsl(326, 100%, 74%)', // Pink
        backgroundColor: 'hsla(326, 100%, 74%, 0.2)',
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

    // Beats per measure (assuming 4/4 time for now, could be derived from downbeat config)
    const beatsPerMeasure = 4;

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
     * Handle click on timeline to add segment
     */
    const handleTimelineClick = (e: React.MouseEvent) => {
        if (disabled || draggingSegment !== null) return;

        // Only handle clicks on the timeline track, not on segments or handles
        if ((e.target as HTMLElement).closest('.subdivision-timeline-segment') ||
            (e.target as HTMLElement).closest('.subdivision-timeline-handle')) {
            return;
        }

        const beat = getBeatFromX(e.clientX);

        // Check if beat is not already a segment start
        const existingSegment = subdivisionConfig.segments.findIndex(
            s => s.startBeat === beat
        );

        if (existingSegment === -1 && beat > 0) {
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
     * Handle scroll event to update visible markers
     */
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setScrollPosition(e.currentTarget.scrollLeft);
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
