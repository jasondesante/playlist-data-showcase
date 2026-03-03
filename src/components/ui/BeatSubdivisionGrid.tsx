/**
 * BeatSubdivisionGrid Component
 *
 * A piano-roll style grid for editing per-beat subdivisions.
 * Part of Phase 4: UI Component - BeatSubdivisionGrid (Task 4.1)
 *
 * Features:
 * - Horizontal scrolling beat grid
 * - Zoom support (0.5x - 8x)
 * - Beat cells grouped by measure
 * - Color-coded by subdivision type
 * - Selection support (click, shift+click, ctrl+click, drag)
 *
 * @component
 */
import { useState, useRef, useCallback, useMemo, useEffect, type RefObject } from 'react';
import { cn } from '@/utils/cn';
import './BeatSubdivisionGrid.css';
import {
    useBeatDetectionStore,
    useUnifiedBeatMap,
    useSubdivisionConfig,
} from '../../store/beatDetectionStore';
import type { SubdivisionType, BeatSubdivisionSelection } from '@/types';

/**
 * Virtualization configuration
 */
const VIRTUALIZATION_BUFFER = 10; // Extra cells to render on each side for smooth scrolling
const MIN_CELL_WIDTH = 20; // Minimum cell width for virtualization calculations

/**
 * Zoom level configuration
 */
type ZoomLevel = 0.5 | 1 | 2 | 4 | 8;

/**
 * Virtualization state - which beats are visible
 */
interface VirtualizationState {
    startIndex: number;
    endIndex: number;
    offsetX: number; // Offset to position the rendered cells correctly
}

/**
 * Custom hook for virtualization - calculates visible beat range
 */
function useVirtualization(
    containerRef: RefObject<HTMLDivElement | null>,
    totalBeats: number,
    cellWidth: number
): VirtualizationState {
    const [visibleRange, setVisibleRange] = useState<VirtualizationState>({
        startIndex: 0,
        endIndex: Math.min(totalBeats, 50), // Initial estimate
        offsetX: 0,
    });

    useEffect(() => {
        const container = containerRef.current;
        if (!container || totalBeats === 0 || cellWidth < MIN_CELL_WIDTH) {
            return;
        }

        const calculateVisibleRange = () => {
            const scrollLeft = container.scrollLeft;
            const containerWidth = container.clientWidth;

            // Calculate which beats are visible
            const firstVisibleIndex = Math.floor(scrollLeft / cellWidth);
            const lastVisibleIndex = Math.ceil((scrollLeft + containerWidth) / cellWidth);

            // Add buffer for smooth scrolling
            const startIndex = Math.max(0, firstVisibleIndex - VIRTUALIZATION_BUFFER);
            const endIndex = Math.min(totalBeats, lastVisibleIndex + VIRTUALIZATION_BUFFER);

            // Calculate offset to position cells correctly
            const offsetX = startIndex * cellWidth;

            setVisibleRange({
                startIndex,
                endIndex,
                offsetX,
            });
        };

        // Calculate initially
        calculateVisibleRange();

        // Update on scroll
        const handleScroll = () => {
            // Use requestAnimationFrame for smooth updates
            requestAnimationFrame(calculateVisibleRange);
        };

        container.addEventListener('scroll', handleScroll, { passive: true });

        // Recalculate on resize
        const resizeObserver = new ResizeObserver(() => {
            calculateVisibleRange();
        });
        resizeObserver.observe(container);

        return () => {
            container.removeEventListener('scroll', handleScroll);
            resizeObserver.disconnect();
        };
    }, [containerRef, totalBeats, cellWidth]);

    return visibleRange;
}

/**
 * Subdivision type configuration for display
 */
interface SubdivisionTypeConfig {
    id: SubdivisionType;
    label: string;
    shortLabel: string;
    color: string;
}

/**
 * All subdivision types with display properties
 */
const SUBDIVISION_TYPES: SubdivisionTypeConfig[] = [
    { id: 'quarter', label: 'Quarter', shortLabel: '1/4', color: 'quarter' },
    { id: 'half', label: 'Half', shortLabel: '1/2', color: 'half' },
    { id: 'eighth', label: 'Eighth', shortLabel: '1/8', color: 'eighth' },
    { id: 'sixteenth', label: 'Sixteenth', shortLabel: '1/16', color: 'sixteenth' },
    { id: 'triplet8', label: 'Triplet 8th', shortLabel: 'T8', color: 'triplet8' },
    { id: 'triplet4', label: 'Triplet 4th', shortLabel: 'T4', color: 'triplet4' },
    { id: 'dotted4', label: 'Dotted 4th', shortLabel: 'D4', color: 'dotted4' },
    { id: 'dotted8', label: 'Dotted 8th', shortLabel: 'D8', color: 'dotted8' },
    { id: 'rest', label: 'Rest', shortLabel: '-', color: 'rest' },
];

interface BeatSubdivisionGridProps {
    /** Whether the grid is disabled */
    disabled?: boolean;
    /** Initial zoom level */
    initialZoom?: ZoomLevel;
    /** Number of beats per measure (from downbeat config) */
    beatsPerMeasure?: number;
    /** Callback when selection changes */
    onSelectionChange?: (selection: BeatSubdivisionSelection) => void;
    /** Callback when a beat is clicked */
    onBeatClick?: (beatIndex: number) => void;
}

/**
 * BeatSubdivisionGrid Component
 *
 * Renders a piano-roll style grid where each beat can be assigned a subdivision type.
 * Supports selection for batch operations and zoom for detailed editing.
 *
 * @param props - Component props
 * @returns The rendered grid component
 */
export function BeatSubdivisionGrid({
    disabled = false,
    initialZoom = 1,
    beatsPerMeasure = 4,
    onSelectionChange,
    onBeatClick,
}: BeatSubdivisionGridProps) {
    const unifiedBeatMap = useUnifiedBeatMap();
    const subdivisionConfig = useSubdivisionConfig();

    // Store actions
    const setBeatSubdivision = useBeatDetectionStore((state) => state.actions.setBeatSubdivision);
    const setBeatSubdivisionRange = useBeatDetectionStore((state) => state.actions.setBeatSubdivisionRange);

    // Local state
    const [zoom, setZoom] = useState<ZoomLevel>(initialZoom);
    const [selection, setSelection] = useState<BeatSubdivisionSelection>({
        selectedBeats: new Set(),
        rangeStart: null,
        rangeEnd: null,
    });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartBeat, setDragStartBeat] = useState<number | null>(null);

    // Refs
    const gridRef = useRef<HTMLDivElement>(null);
    const lastSelectedBeatRef = useRef<number | null>(null);
    const justFinishedDragRef = useRef(false);

    // Calculate beats per measure from downbeat config or use default
    const actualBeatsPerMeasure = useMemo(() => {
        if (!unifiedBeatMap) return beatsPerMeasure;
        // Try to detect from the beat map
        const beats = unifiedBeatMap.beats;
        if (beats.length < 2) return beatsPerMeasure;

        // Count beats until first downbeat repeat
        const firstDownbeatIndex = beats.findIndex((b, i) => i > 0 && b.isDownbeat);
        return firstDownbeatIndex > 0 ? firstDownbeatIndex : beatsPerMeasure;
    }, [unifiedBeatMap, beatsPerMeasure]);

    // Total beats
    const totalBeats = unifiedBeatMap?.beats.length ?? 0;

    // Calculate grid dimensions based on zoom
    const cellWidth = useMemo(() => {
        const baseWidth = 40; // Base cell width in pixels
        return baseWidth * zoom;
    }, [zoom]);

    // Virtualization - calculate visible beat range
    const virtualization = useVirtualization(gridRef, totalBeats, cellWidth);

    // Group beats by measure (for virtualized rendering)
    const measures = useMemo(() => {
        if (!unifiedBeatMap) return [];

        const { startIndex, endIndex } = virtualization;
        const grouped: Array<Array<{ beatIndex: number; subdivision: SubdivisionType }>> = [];
        let currentMeasure: Array<{ beatIndex: number; subdivision: SubdivisionType }> = [];

        // Only iterate through visible beats
        for (let i = startIndex; i < endIndex && i < totalBeats; i++) {
            const beat = unifiedBeatMap.beats[i];
            const subdivision = subdivisionConfig.beatSubdivisions.get(i) ?? subdivisionConfig.defaultSubdivision;

            // Start new measure on downbeat (except for first visible beat)
            if (beat.isDownbeat && i > startIndex) {
                grouped.push(currentMeasure);
                currentMeasure = [];
            }

            currentMeasure.push({ beatIndex: i, subdivision });

            // Also start new measure when we hit the beats per measure count
            if (currentMeasure.length >= actualBeatsPerMeasure) {
                grouped.push(currentMeasure);
                currentMeasure = [];
            }
        }

        // Push any remaining beats
        if (currentMeasure.length > 0) {
            grouped.push(currentMeasure);
        }

        return grouped;
    }, [unifiedBeatMap, totalBeats, subdivisionConfig, actualBeatsPerMeasure, virtualization]);

    // Notify parent of selection changes
    useEffect(() => {
        onSelectionChange?.(selection);
    }, [selection, onSelectionChange]);

    // Handle beat click
    const handleBeatClick = useCallback(
        (beatIndex: number, event: React.MouseEvent) => {
            if (disabled) return;

            event.stopPropagation();

            // Skip if we just finished a drag operation - don't overwrite drag selection
            if (justFinishedDragRef.current) {
                justFinishedDragRef.current = false;
                return;
            }

            // Notify parent
            onBeatClick?.(beatIndex);

            // Handle different selection modes
            if (event.shiftKey && lastSelectedBeatRef.current !== null) {
                // Shift+click: range selection
                const start = Math.min(lastSelectedBeatRef.current, beatIndex);
                const end = Math.max(lastSelectedBeatRef.current, beatIndex);
                const newSelection = new Set<number>();
                for (let i = start; i <= end; i++) {
                    newSelection.add(i);
                }
                setSelection({
                    selectedBeats: newSelection,
                    rangeStart: start,
                    rangeEnd: end,
                });
            } else if (event.ctrlKey || event.metaKey) {
                // Ctrl/Cmd+click: toggle selection
                const newSelection = new Set(selection.selectedBeats);
                if (newSelection.has(beatIndex)) {
                    newSelection.delete(beatIndex);
                } else {
                    newSelection.add(beatIndex);
                }
                setSelection({
                    selectedBeats: newSelection,
                    rangeStart: null,
                    rangeEnd: null,
                });
                lastSelectedBeatRef.current = beatIndex;
            } else {
                // Normal click: single selection
                setSelection({
                    selectedBeats: new Set([beatIndex]),
                    rangeStart: beatIndex,
                    rangeEnd: beatIndex,
                });
                lastSelectedBeatRef.current = beatIndex;
            }
        },
        [disabled, selection.selectedBeats, onBeatClick]
    );

    // Handle drag start
    const handleMouseDown = useCallback(
        (beatIndex: number, event: React.MouseEvent) => {
            if (disabled) return;

            // Only start drag on left mouse button
            if (event.button !== 0) return;

            // Reset drag tracking
            justFinishedDragRef.current = false;
            setIsDragging(true);
            setDragStartBeat(beatIndex);

            // Clear selection and start fresh
            setSelection({
                selectedBeats: new Set([beatIndex]),
                rangeStart: beatIndex,
                rangeEnd: beatIndex,
            });
            lastSelectedBeatRef.current = beatIndex;
        },
        [disabled]
    );

    // Handle drag move
    const handleMouseEnter = useCallback(
        (beatIndex: number) => {
            if (!isDragging || disabled || dragStartBeat === null) return;

            // Mark that a drag operation is happening (more than just a click)
            if (beatIndex !== dragStartBeat) {
                justFinishedDragRef.current = true;
            }

            // Update selection range
            const start = Math.min(dragStartBeat, beatIndex);
            const end = Math.max(dragStartBeat, beatIndex);
            const newSelection = new Set<number>();
            for (let i = start; i <= end; i++) {
                newSelection.add(i);
            }
            setSelection({
                selectedBeats: newSelection,
                rangeStart: start,
                rangeEnd: end,
            });
        },
        [isDragging, disabled, dragStartBeat]
    );

    // Handle drag end
    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        setDragStartBeat(null);
        // Note: We don't reset justFinishedDragRef here because onClick fires after mouseUp
        // The onClick handler will reset it
    }, []);

    // Add global mouse up listener
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mouseup', handleMouseUp);
            return () => window.removeEventListener('mouseup', handleMouseUp);
        }
    }, [isDragging, handleMouseUp]);

    // Handle zoom change
    const handleZoomChange = useCallback((newZoom: ZoomLevel) => {
        setZoom(newZoom);
    }, []);

    // Clear selection
    const clearSelection = useCallback(() => {
        setSelection({
            selectedBeats: new Set(),
            rangeStart: null,
            rangeEnd: null,
        });
        lastSelectedBeatRef.current = null;
    }, []);

    // Select all beats
    const selectAll = useCallback(() => {
        const allBeats = new Set<number>();
        for (let i = 0; i < totalBeats; i++) {
            allBeats.add(i);
        }
        setSelection({
            selectedBeats: allBeats,
            rangeStart: 0,
            rangeEnd: totalBeats - 1,
        });
    }, [totalBeats]);

    // Apply subdivision to selected beats
    const applyToSelection = useCallback(
        (subdivision: SubdivisionType) => {
            if (selection.selectedBeats.size === 0) return;

            const beats = Array.from(selection.selectedBeats).sort((a, b) => a - b);

            // Check if beats are contiguous
            let isContiguous = true;
            for (let i = 1; i < beats.length; i++) {
                if (beats[i] !== beats[i - 1] + 1) {
                    isContiguous = false;
                    break;
                }
            }

            if (isContiguous && beats.length > 1) {
                // Use range action for contiguous selection
                setBeatSubdivisionRange(beats[0], beats[beats.length - 1], subdivision);
            } else {
                // Apply individually for non-contiguous selection
                beats.forEach((beatIndex) => {
                    setBeatSubdivision(beatIndex, subdivision);
                });
            }
        },
        [selection.selectedBeats, setBeatSubdivision, setBeatSubdivisionRange]
    );

    // Handle double-click to cycle subdivision
    const handleDoubleClick = useCallback(
        (beatIndex: number) => {
            if (disabled) return;

            const currentSubdivision =
                subdivisionConfig.beatSubdivisions.get(beatIndex) ?? subdivisionConfig.defaultSubdivision;
            const currentIndex = SUBDIVISION_TYPES.findIndex((t) => t.id === currentSubdivision);
            const nextIndex = (currentIndex + 1) % SUBDIVISION_TYPES.length;
            const nextSubdivision = SUBDIVISION_TYPES[nextIndex].id;

            setBeatSubdivision(beatIndex, nextSubdivision);
        },
        [disabled, subdivisionConfig, setBeatSubdivision]
    );

    // No beat map state
    if (!unifiedBeatMap || totalBeats === 0) {
        return (
            <div className="beat-subdivision-grid beat-subdivision-grid--empty">
                <p className="beat-subdivision-grid-empty-message">
                    Generate a beat map first to configure subdivisions
                </p>
            </div>
        );
    }

    return (
        <div className="beat-subdivision-grid">
            {/* Header with controls */}
            <div className="beat-subdivision-grid-header">
                <div className="beat-subdivision-grid-info">
                    <span className="beat-subdivision-grid-info-item">
                        {totalBeats} beats
                    </span>
                    <span className="beat-subdivision-grid-info-separator">|</span>
                    <span className="beat-subdivision-grid-info-item">
                        {measures.length} measures
                    </span>
                    <span className="beat-subdivision-grid-info-separator">|</span>
                    <span className="beat-subdivision-grid-info-item">
                        {selection.selectedBeats.size} selected
                    </span>
                </div>

                {/* Zoom controls */}
                <div className="beat-subdivision-grid-zoom">
                    <span className="beat-subdivision-grid-zoom-label">Zoom:</span>
                    {([0.5, 1, 2, 4, 8] as ZoomLevel[]).map((z) => (
                        <button
                            key={z}
                            className={cn(
                                'beat-subdivision-grid-zoom-btn',
                                zoom === z && 'beat-subdivision-grid-zoom-btn--active'
                            )}
                            onClick={() => handleZoomChange(z)}
                            disabled={disabled}
                        >
                            {z}x
                        </button>
                    ))}
                </div>

                {/* Selection actions */}
                <div className="beat-subdivision-grid-actions">
                    <button
                        className="beat-subdivision-grid-action-btn"
                        onClick={selectAll}
                        disabled={disabled || totalBeats === 0}
                    >
                        Select All
                    </button>
                    <button
                        className="beat-subdivision-grid-action-btn"
                        onClick={clearSelection}
                        disabled={disabled || selection.selectedBeats.size === 0}
                    >
                        Clear
                    </button>
                </div>
            </div>

            {/* Grid container with horizontal scroll */}
            <div className="beat-subdivision-grid-container" ref={gridRef}>
                <div
                    className="beat-subdivision-grid-track"
                    style={{ width: `${totalBeats * cellWidth}px` }}
                >
                    {/* Virtualized content container - positioned with offset */}
                    <div
                        className="beat-subdivision-grid-virtualized"
                        style={{
                            transform: `translateX(${virtualization.offsetX}px)`,
                            willChange: 'transform',
                        }}
                    >
                        {/* Measure groups */}
                        {measures.map((measure) => {
                            // Calculate actual measure number based on first beat in measure
                            const firstBeatIndex = measure[0]?.beatIndex ?? 0;
                            const actualMeasureNumber = Math.floor(firstBeatIndex / actualBeatsPerMeasure) + 1;

                            return (
                                <div
                                    key={`measure-${firstBeatIndex}`}
                                    className="beat-subdivision-grid-measure"
                                    style={{ width: `${measure.length * cellWidth}px` }}
                                >
                                    {/* Measure number label */}
                                    <div className="beat-subdivision-grid-measure-label">
                                        M{actualMeasureNumber}
                                    </div>

                                    {/* Beat cells */}
                                    {measure.map(({ beatIndex, subdivision }) => (
                                        <div
                                            key={beatIndex}
                                            className={cn(
                                                'beat-subdivision-grid-cell',
                                                `beat-subdivision-grid-cell--${subdivision}`,
                                                selection.selectedBeats.has(beatIndex) && 'beat-subdivision-grid-cell--selected',
                                                disabled && 'beat-subdivision-grid-cell--disabled'
                                            )}
                                            style={{ width: `${cellWidth}px` }}
                                            onClick={(e) => handleBeatClick(beatIndex, e)}
                                            onMouseDown={(e) => handleMouseDown(beatIndex, e)}
                                            onMouseEnter={() => handleMouseEnter(beatIndex)}
                                            onDoubleClick={() => handleDoubleClick(beatIndex)}
                                            role="button"
                                            tabIndex={disabled ? -1 : 0}
                                            aria-label={`Beat ${beatIndex + 1}, ${subdivision}`}
                                            aria-pressed={selection.selectedBeats.has(beatIndex)}
                                        >
                                            {/* Beat number */}
                                            <span className="beat-subdivision-grid-cell-number">
                                                {beatIndex + 1}
                                            </span>

                                            {/* Subdivision indicator */}
                                            <div
                                                className={cn(
                                                    'beat-subdivision-grid-cell-indicator',
                                                    `beat-subdivision-grid-cell-indicator--${subdivision}`
                                                )}
                                            />
                                        </div>
                                    ))}

                                    {/* Measure boundary line */}
                                    <div className="beat-subdivision-grid-measure-boundary" />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="beat-subdivision-grid-legend">
                {SUBDIVISION_TYPES.map((type) => (
                    <div key={type.id} className="beat-subdivision-grid-legend-item">
                        <div
                            className={cn(
                                'beat-subdivision-grid-legend-color',
                                `beat-subdivision-grid-legend-color--${type.color}`
                            )}
                        />
                        <span className="beat-subdivision-grid-legend-label">{type.shortLabel}</span>
                    </div>
                ))}
            </div>

            {/* Expose methods for parent components */}
            {/* Using a ref callback pattern would be cleaner, but for now we'll use a data attribute */}
            <div
                data-apply-selection={applyToSelection.toString()}
                data-clear-selection={clearSelection.toString()}
                data-select-all={selectAll.toString()}
                hidden
            />
        </div>
    );
}

/**
 * Export a typed interface for external control
 */
export interface BeatSubdivisionGridRef {
    applyToSelection: (subdivision: SubdivisionType) => void;
    clearSelection: () => void;
    selectAll: () => void;
}
