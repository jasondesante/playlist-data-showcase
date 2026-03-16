/**
 * ChartEditor Component
 *
 * A timeline-based editor for assigning required keys to beats in rhythm game charts.
 * Part of Phase 4: Chart Editor UI - Task 4.2.
 *
 * Features:
 * - Timeline view with beat markers (horizontal scroll for navigation)
 * - Required key indicators on beats using arrow symbols (↑↓←→) and numbers (1-5)
 * - Click to assign the currently selected key to a beat
 * - Click in erase mode to remove key assignments
 * - Drag to paint multiple beats with the same key
 * - Clear All button to remove all key assignments
 * - Works only with subdivided beat maps (required keys only work with subdivided mode)
 *
 * @component
 */

import { useState, useRef, useCallback, useMemo, useEffect, type RefObject } from 'react';
import { cn } from '@/utils/cn';
import './ChartEditor.css';
import {
    useBeatDetectionStore,
    useSubdividedBeatMap,
    useUnifiedBeatMap,
    useTimeSignature,
    useChartStyle,
    useSelectedKey,
    useEditorMode,
    useKeyMap,
} from '../../store/beatDetectionStore';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';

/**
 * Minimal event interface for beat click handling.
 * Both React.MouseEvent and React.KeyboardEvent satisfy this interface.
 */
interface BeatClickEvent {
    stopPropagation: () => void;
}
import type { SupportedKey } from '@/types';
import { getKeySymbol } from '@/types';

/**
 * Virtualization configuration
 */
const VIRTUALIZATION_BUFFER = 10; // Extra cells to render on each side for smooth scrolling
const MIN_CELL_WIDTH = 20; // Minimum cell width for virtualization calculations

/**
 * Virtualization state - which beats are visible in the viewport.
 */
interface VirtualizationState {
    startIndex: number;
    endIndex: number;
    offsetX: number;
}

/**
 * Custom hook for virtualization - calculates which beats are visible in the viewport.
 */
function useVirtualization(
    containerRef: RefObject<HTMLDivElement | null>,
    totalBeats: number,
    cellWidth: number
): VirtualizationState {
    const [visibleRange, setVisibleRange] = useState<VirtualizationState>({
        startIndex: 0,
        endIndex: Math.min(totalBeats, 50),
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

            const firstVisibleIndex = Math.floor(scrollLeft / cellWidth);
            const lastVisibleIndex = Math.ceil((scrollLeft + containerWidth) / cellWidth);

            const startIndex = Math.max(0, firstVisibleIndex - VIRTUALIZATION_BUFFER);
            const endIndex = Math.min(totalBeats, lastVisibleIndex + VIRTUALIZATION_BUFFER);

            const offsetX = startIndex * cellWidth;

            setVisibleRange({
                startIndex,
                endIndex,
                offsetX,
            });
        };

        calculateVisibleRange();

        const handleScroll = () => {
            requestAnimationFrame(calculateVisibleRange);
        };

        container.addEventListener('scroll', handleScroll, { passive: true });

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
 * Props for the ChartEditor component.
 */
export interface ChartEditorProps {
    /** Whether the editor is disabled (prevents all interactions) */
    disabled?: boolean;
    /** Number of beats per measure (optional override) */
    beatsPerMeasure?: number;
    /** Cell width in pixels (default: 48) */
    cellWidth?: number;
    /** Optional additional CSS classes */
    className?: string;
}

/**
 * Get the CSS color class for a key.
 */
function getKeyColorClass(key: string): string {
    const colorMap: Record<string, string> = {
        // DDR colors: left=blue, down=green, up=red, right=purple
        left: 'chart-editor-cell--blue',
        down: 'chart-editor-cell--green',
        up: 'chart-editor-cell--red',
        right: 'chart-editor-cell--purple',
        // Guitar Hero colors: 1=green, 2=red, 3=yellow, 4=blue, 5=orange
        '1': 'chart-editor-cell--green',
        '2': 'chart-editor-cell--red',
        '3': 'chart-editor-cell--yellow',
        '4': 'chart-editor-cell--blue',
        '5': 'chart-editor-cell--orange',
    };
    return colorMap[key] || '';
}

/**
 * ChartEditor Component
 *
 * Renders a horizontal timeline where beats can have required keys assigned.
 * Supports paint mode (click/drag to assign keys) and erase mode (click to remove keys).
 *
 * @example
 * ```tsx
 * <ChartEditor disabled={!hasSubdividedBeatMap} />
 * ```
 */
export function ChartEditor({
    disabled = false,
    beatsPerMeasure,
    cellWidth = 48,
    className,
}: ChartEditorProps) {
    const subdividedBeatMap = useSubdividedBeatMap();
    const unifiedBeatMap = useUnifiedBeatMap();
    const storeBeatsPerMeasure = useTimeSignature();
    const chartStyle = useChartStyle();
    const selectedKey = useSelectedKey();
    const editorMode = useEditorMode();
    const keyMap = useKeyMap();

    // Store actions
    const assignKeyToBeat = useBeatDetectionStore((state) => state.actions.assignKeyToBeat);
    const clearAllKeys = useBeatDetectionStore((state) => state.actions.clearAllKeys);
    const setEditorModeAction = useBeatDetectionStore((state) => state.actions.setEditorMode);

    // Use beats per measure from store if not provided
    const actualBeatsPerMeasure = beatsPerMeasure ?? storeBeatsPerMeasure;

    // Total beats
    const totalBeats = subdividedBeatMap?.beats.length ?? 0;

    // Audio player state for playback follow and playhead
    const currentTime = useAudioPlayerStore((state) => state.currentTime);
    const playbackState = useAudioPlayerStore((state) => state.playbackState);
    const isPlaying = playbackState === 'playing';

    // Refs
    const gridRef = useRef<HTMLDivElement>(null);
    const isDraggingRef = useRef(false);
    const dragStartBeatRef = useRef<number | null>(null);
    const lastPaintedBeatRef = useRef<number | null>(null);

    // Local state for drag selection preview
    const [dragPreview, setDragPreview] = useState<Set<number>>(new Set());

    // Drag-to-pan state
    const [isPanning, setIsPanning] = useState(false);
    const [isPanPending, setIsPanPending] = useState(false); // Mouse down, waiting for movement
    const panStartRef = useRef<{ x: number; scrollLeft: number }>({ x: 0, scrollLeft: 0 });
    const PAN_THRESHOLD = 5; // pixels - movement beyond this triggers pan mode

    // Virtualization
    const virtualization = useVirtualization(gridRef, totalBeats, cellWidth);

    // Group beats by measure (for virtualized rendering)
    // Uses unifiedBeatMap to correctly identify measure boundaries based on quarter notes
    const measures = useMemo(() => {
        if (!subdividedBeatMap || !unifiedBeatMap) return [];

        const { startIndex, endIndex } = virtualization;
        const grouped: Array<Array<{
            beatIndex: number;
            requiredKey?: string;
            isQuarterNote: boolean;
            quarterNoteIndex: number;
            measureNumber: number;
        }>> = [];
        let currentMeasure: Array<{
            beatIndex: number;
            requiredKey?: string;
            isQuarterNote: boolean;
            quarterNoteIndex: number;
            measureNumber: number;
        }> = [];


        for (let i = startIndex; i < endIndex && i < totalBeats; i++) {
            const beat = subdividedBeatMap.beats[i];
            const requiredKey = keyMap.get(i);

            // Get the quarter note index this beat belongs to
            const quarterNoteIndex = beat.originalBeatIndex ?? Math.floor(i / 2);

            // A beat is a quarter note if:
            // 1. Its subdivisionType is 'quarter', OR
            // 2. Its timestamp matches a beat in the unified beat map (fallback)
            let isQuarterNote = beat.subdivisionType === 'quarter';

            // Fallback: check if this beat's timestamp matches a unified beat
            if (!isQuarterNote && unifiedBeatMap) {
                const unifiedBeat = unifiedBeatMap.beats[quarterNoteIndex];
                if (unifiedBeat) {
                    // Allow small tolerance for floating point comparison
                    const timeDiff = Math.abs(beat.timestamp - unifiedBeat.timestamp);
                    isQuarterNote = timeDiff < 0.001;
                }
            }

            // Calculate measure number from the quarter note index
            const measureNumber = Math.floor(quarterNoteIndex / actualBeatsPerMeasure) + 1;

            // Start new measure when we encounter a downbeat (except first visible beat)
            if (beat.isDownbeat && i > startIndex && currentMeasure.length > 0) {
                grouped.push(currentMeasure);
                currentMeasure = [];
            }

            currentMeasure.push({
                beatIndex: i,
                requiredKey,
                isQuarterNote,
                quarterNoteIndex,
                measureNumber
            });
        }

        // Push any remaining beats
        if (currentMeasure.length > 0) {
            grouped.push(currentMeasure);
        }

        return grouped;
    }, [subdividedBeatMap, unifiedBeatMap, totalBeats, keyMap, actualBeatsPerMeasure, virtualization]);

    // Handle beat click
    const handleBeatClick = useCallback(
        (beatIndex: number, event: BeatClickEvent) => {
            if (disabled) return;
            event.stopPropagation();

            if (editorMode === 'erase') {
                // Remove key assignment
                assignKeyToBeat(beatIndex, null);
            } else if (editorMode === 'paint' && selectedKey) {
                // Assign selected key
                assignKeyToBeat(beatIndex, selectedKey);
            }
        },
        [disabled, editorMode, selectedKey, assignKeyToBeat]
    );

    // Handle mouse down on beat (start drag)
    const handleMouseDown = useCallback(
        (beatIndex: number, event: React.MouseEvent) => {
            if (disabled) return;
            if (event.button !== 0) return; // Only left click

            // Only start drag in paint mode with a selected key
            if (editorMode !== 'paint' || !selectedKey) return;

            isDraggingRef.current = true;
            dragStartBeatRef.current = beatIndex;
            lastPaintedBeatRef.current = beatIndex;

            // Immediately assign key to the starting beat
            assignKeyToBeat(beatIndex, selectedKey);

            // Initialize drag preview
            setDragPreview(new Set([beatIndex]));
        },
        [disabled, editorMode, selectedKey, assignKeyToBeat]
    );

    // Handle mouse enter during drag (real-time paint)
    const handleMouseEnter = useCallback(
        (beatIndex: number) => {
            if (!isDraggingRef.current || disabled || !selectedKey) return;

            // Paint this beat as cursor passes over
            if (lastPaintedBeatRef.current !== beatIndex) {
                assignKeyToBeat(beatIndex, selectedKey);
                lastPaintedBeatRef.current = beatIndex;

                // Update drag preview
                setDragPreview((prev) => new Set(prev).add(beatIndex));
            }
        },
        [disabled, selectedKey, assignKeyToBeat]
    );

    // Handle mouse up (end drag)
    const handleMouseUp = useCallback(() => {
        isDraggingRef.current = false;
        dragStartBeatRef.current = null;
        lastPaintedBeatRef.current = null;
        setDragPreview(new Set());
    }, []);

    // Add global mouse up listener
    useEffect(() => {
        window.addEventListener('mouseup', handleMouseUp);
        return () => window.removeEventListener('mouseup', handleMouseUp);
    }, [handleMouseUp]);

    // ========================================
    // Drag-to-Pan Functionality
    // ========================================

    /**
     * Handle mouse down on grid container - potentially start panning
     * Pan works when clicking on:
     * - The measure label area (above cells)
     * - Empty areas of the grid
     * - Cells (but only if mouse moves significantly before cell selection starts)
     */
    const handleGridMouseDown = useCallback((e: MouseEvent) => {
        // Only handle left click
        if (e.button !== 0) return;

        // Check if clicking on a cell - we'll handle this differently
        const cell = (e.target as HTMLElement).closest('.chart-editor-cell');
        if (cell) {
            // For cells, we don't start pan immediately - let cell selection happen first
            // But store the start position in case the user drags horizontally
            panStartRef.current = {
                x: e.clientX,
                scrollLeft: gridRef.current?.scrollLeft ?? 0,
            };
            // Don't set isPanPending for cells - cell selection takes priority
            return;
        }

        // Clicking on measure label or empty area - start pan ready state
        panStartRef.current = {
            x: e.clientX,
            scrollLeft: gridRef.current?.scrollLeft ?? 0,
        };
        setIsPanPending(true);
    }, []);

    /**
     * Handle mouse move - start panning if movement exceeds threshold
     */
    const handleGridMouseMove = useCallback((e: MouseEvent) => {
        if (!gridRef.current || panStartRef.current.x === 0) return;

        // Don't pan if we're in cell selection mode
        if (isDraggingRef.current) return;

        const dx = e.clientX - panStartRef.current.x;

        // Check if we should start panning (movement beyond threshold)
        if (!isPanning && (isPanPending || Math.abs(dx) > PAN_THRESHOLD)) {
            setIsPanning(true);
            setIsPanPending(false);
        }

        if (isPanning) {
            gridRef.current.scrollLeft = panStartRef.current.scrollLeft - dx;
        }
    }, [isPanning, isPanPending]);

    /**
     * Handle mouse up - end panning
     */
    const handleGridMouseUp = useCallback(() => {
        setIsPanning(false);
        setIsPanPending(false);
        panStartRef.current = { x: 0, scrollLeft: 0 };
    }, []);

    /**
     * Add/remove pan event listeners
     */
    useEffect(() => {
        const container = gridRef.current;
        if (!container) return;

        container.addEventListener('mousedown', handleGridMouseDown);

        // Listen for mousemove/mouseup when panning OR when mouse is down waiting for movement
        if (isPanning || isPanPending) {
            window.addEventListener('mousemove', handleGridMouseMove);
            window.addEventListener('mouseup', handleGridMouseUp);
        }

        return () => {
            container.removeEventListener('mousedown', handleGridMouseDown);
            window.removeEventListener('mousemove', handleGridMouseMove);
            window.removeEventListener('mouseup', handleGridMouseUp);
        };
    }, [isPanning, isPanPending, handleGridMouseDown, handleGridMouseMove, handleGridMouseUp]);

    // ========================================
    // Playhead Indicator
    // ========================================

    // Smooth playhead animation using requestAnimationFrame
    // The audio timeupdate event only fires ~every 250ms, so we interpolate
    // for smooth 60fps movement
    const [playheadPosition, setPlayheadPosition] = useState<number | null>(null);
    const lastUpdateTimeRef = useRef<{ time: number; timestamp: number } | null>(null);
    const rafRef = useRef<number | null>(null);

    // Calculate playhead position from a given time value
    const calculatePlayheadPosition = useCallback((time: number): number | null => {
        if (!subdividedBeatMap) return null;

        const beats = subdividedBeatMap.beats;

        // Find the closest beat to current time
        let closestBeatIndex = 0;
        let closestDiff = Infinity;

        for (let i = 0; i < beats.length; i++) {
            const diff = Math.abs(beats[i].timestamp - time);
            if (diff < closestDiff) {
                closestDiff = diff;
                closestBeatIndex = i;
            }
        }

        // Calculate exact position based on interpolation between beats
        const currentBeat = beats[closestBeatIndex];
        const nextBeat = beats[closestBeatIndex + 1];

        let exactPosition: number;
        if (nextBeat) {
            // Interpolate between current and next beat
            const beatDuration = nextBeat.timestamp - currentBeat.timestamp;
            const timeSinceBeat = time - currentBeat.timestamp;
            const interpolationRatio = Math.max(0, Math.min(1, timeSinceBeat / beatDuration));
            exactPosition = (closestBeatIndex + interpolationRatio) * cellWidth;
        } else {
            // Last beat - use position directly
            exactPosition = closestBeatIndex * cellWidth;
        }

        return exactPosition;
    }, [subdividedBeatMap, cellWidth]);

    // Smooth animation loop for playhead (when playing)
    // When paused, show playhead at current position without animation
    useEffect(() => {
        if (!subdividedBeatMap) {
            setPlayheadPosition(null);
            lastUpdateTimeRef.current = null;
            return;
        }

        // When paused, just show the playhead at the current position
        if (!isPlaying) {
            const position = calculatePlayheadPosition(currentTime);
            setPlayheadPosition(position);
            lastUpdateTimeRef.current = null;
            return;
        }

        // Store the current time when we get an update
        lastUpdateTimeRef.current = {
            time: currentTime,
            timestamp: performance.now(),
        };

        // Initial position
        const initialPos = calculatePlayheadPosition(currentTime);
        setPlayheadPosition(initialPos);

        // Animation loop
        const animate = () => {
            const updateInfo = lastUpdateTimeRef.current;
            if (!updateInfo) {
                rafRef.current = requestAnimationFrame(animate);
                return;
            }

            // Calculate interpolated time
            const elapsed = (performance.now() - updateInfo.timestamp) / 1000;
            const interpolatedTime = updateInfo.time + elapsed;

            // Clamp to duration
            const duration = subdividedBeatMap.beats[subdividedBeatMap.beats.length - 1]?.timestamp ?? 0;
            const clampedTime = Math.min(interpolatedTime, duration);

            const position = calculatePlayheadPosition(clampedTime);
            setPlayheadPosition(position);

            if (clampedTime < duration) {
                rafRef.current = requestAnimationFrame(animate);
            }
        };

        rafRef.current = requestAnimationFrame(animate);

        return () => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, [isPlaying, subdividedBeatMap, currentTime, calculatePlayheadPosition]);

    // ========================================
    // Playback Follow - Auto-scroll to current beat
    // ========================================

    /**
     * Auto-scroll the grid to follow the current playback position
     * Only scrolls when playing and not currently panning/selection-dragging
     */
    useEffect(() => {
        if (!isPlaying || !gridRef.current || !subdividedBeatMap || isPanning || isDraggingRef.current) return;

        // Find the beat closest to current time
        const beats = subdividedBeatMap.beats;
        let closestBeatIndex = 0;
        let closestDiff = Infinity;

        for (let i = 0; i < beats.length; i++) {
            const diff = Math.abs(beats[i].timestamp - currentTime);
            if (diff < closestDiff) {
                closestDiff = diff;
                closestBeatIndex = i;
            }
        }

        // Calculate the scroll position to center the current beat
        const container = gridRef.current;
        const containerWidth = container.clientWidth;
        const beatPosition = closestBeatIndex * cellWidth;
        const targetScrollLeft = beatPosition - (containerWidth / 2);

        // Smoothly scroll to keep the current beat in view
        // Only auto-scroll if the beat is getting close to the edge
        const currentScrollLeft = container.scrollLeft;
        const visibleStart = currentScrollLeft;
        const visibleEnd = currentScrollLeft + containerWidth;
        const beatVisible = beatPosition >= visibleStart && beatPosition <= visibleEnd;

        if (!beatVisible) {
            // Beat is out of view, scroll to it
            container.scrollTo({
                left: Math.max(0, targetScrollLeft),
                behavior: 'smooth',
            });
        }
    }, [currentTime, isPlaying, subdividedBeatMap, cellWidth, isPanning]);

    // Handle clear all keys
    const handleClearAll = useCallback(() => {
        if (disabled) return;
        clearAllKeys();
    }, [disabled, clearAllKeys]);

    // Calculate statistics
    const statistics = useMemo(() => {
        let keyCount = 0;
        const usedKeys = new Set<string>();

        keyMap.forEach((key) => {
            if (key) {
                keyCount++;
                usedKeys.add(key);
            }
        });

        return { keyCount, usedKeys: Array.from(usedKeys) };
    }, [keyMap]);

    // No beat map state
    if (!subdividedBeatMap || totalBeats === 0) {
        return (
            <div className="chart-editor chart-editor--empty">
                <p className="chart-editor-empty-message">
                    Generate a subdivided beat map first to edit the chart
                </p>
            </div>
        );
    }

    return (
        <div className={cn('chart-editor', className)}>
            {/* Header with controls and stats */}
            <div className="chart-editor-header">
                {/* Mode selector */}
                <div className="chart-editor-modes">
                    <button
                        className={cn(
                            'chart-editor-mode-btn',
                            editorMode === 'paint' && 'chart-editor-mode-btn--active'
                        )}
                        onClick={() => setEditorModeAction('paint')}
                        disabled={disabled}
                        title="Paint mode: Click or drag to assign keys"
                    >
                        Paint
                    </button>
                    <button
                        className={cn(
                            'chart-editor-mode-btn',
                            editorMode === 'erase' && 'chart-editor-mode-btn--active'
                        )}
                        onClick={() => setEditorModeAction('erase')}
                        disabled={disabled}
                        title="Erase mode: Click to remove key assignments"
                    >
                        Erase
                    </button>
                </div>

                {/* Statistics */}
                <div className="chart-editor-stats">
                    <span className="chart-editor-stat">
                        {statistics.keyCount}/{totalBeats} keys
                    </span>
                    {statistics.usedKeys.length > 0 && (
                        <span className="chart-editor-stat chart-editor-stat--keys">
                            {statistics.usedKeys.map((k) => getKeySymbol(k as SupportedKey)).join(' ')}
                        </span>
                    )}
                </div>

                {/* Clear all button */}
                <button
                    className="chart-editor-clear-btn"
                    onClick={handleClearAll}
                    disabled={disabled || statistics.keyCount === 0}
                    title="Remove all key assignments"
                >
                    Clear All
                </button>
            </div>

            {/* Instructions */}
            <div className="chart-editor-instructions">
                {editorMode === 'paint' ? (
                    selectedKey ? (
                        <span>
                            Click or drag on beats to assign <strong>{getKeySymbol(selectedKey)}</strong>
                        </span>
                    ) : (
                        <span className="chart-editor-instructions--warning">
                            Select a key from the palette above to start painting
                        </span>
                    )
                ) : (
                    <span>Click on beats to remove key assignments</span>
                )}
            </div>

            {/* Grid container with horizontal scroll and drag-to-pan */}
            <div
                className={cn(
                    'chart-editor-container',
                    isPanning && 'chart-editor-container--panning'
                )}
                ref={gridRef}
            >
                <div
                    className="chart-editor-track"
                    style={{ width: `${totalBeats * cellWidth}px` }}
                >
                    {/* Playhead indicator - shows current playback position */}
                    {playheadPosition !== null && (
                        <div
                            className="chart-editor-playhead"
                            style={{ left: `${playheadPosition}px` }}
                        />
                    )}
                    {/* Virtualized content container */}
                    <div
                        className="chart-editor-virtualized"
                        style={{
                            transform: `translateX(${virtualization.offsetX}px)`,
                            willChange: 'transform',
                        }}
                    >
                        {/* Measure groups */}
                        {measures.map((measure, measureIndex) => {
                            const firstBeat = measure[0];
                            const firstBeatIndex = firstBeat?.beatIndex ?? 0;
                            const lastBeatIndex = measure[measure.length - 1]?.beatIndex ?? firstBeatIndex;
                            // Use the measure number from the beat data (calculated from quarter note index)
                            const displayMeasureNumber = firstBeat?.measureNumber ?? 1;
                            const measureKey = `measure-${firstBeatIndex}-${lastBeatIndex}-${measureIndex}`;

                            return (
                                <div
                                    key={measureKey}
                                    className="chart-editor-measure"
                                    style={{ width: `${measure.length * cellWidth}px` }}
                                >
                                    {/* Measure number label */}
                                    <div className="chart-editor-measure-label">
                                        M{displayMeasureNumber}
                                    </div>

                                    {/* Beat cells */}
                                    {measure.map(({ beatIndex, requiredKey, isQuarterNote, quarterNoteIndex }) => {
                                        const hasKey = !!requiredKey;
                                        const isPainting = dragPreview.has(beatIndex);
                                        const keyColorClass = requiredKey ? getKeyColorClass(requiredKey) : '';

                                        return (
                                            <div
                                                key={beatIndex}
                                                className={cn(
                                                    'chart-editor-cell',
                                                    isQuarterNote && 'chart-editor-cell--quarter',
                                                    hasKey && 'chart-editor-cell--has-key',
                                                    hasKey && keyColorClass,
                                                    isPainting && 'chart-editor-cell--painting',
                                                    disabled && 'chart-editor-cell--disabled',
                                                    editorMode === 'erase' && hasKey && 'chart-editor-cell--erasable'
                                                )}
                                                style={{ width: `${cellWidth}px` }}
                                                onClick={(e) => handleBeatClick(beatIndex, e)}
                                                onMouseDown={(e) => handleMouseDown(beatIndex, e)}
                                                onMouseEnter={() => handleMouseEnter(beatIndex)}
                                                role="button"
                                                tabIndex={disabled ? -1 : 0}
                                                aria-label={`Beat ${quarterNoteIndex + 1}${requiredKey ? `, key: ${requiredKey}` : ', no key'}`}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        handleBeatClick(beatIndex, e);
                                                    }
                                                }}
                                            >
                                                {/* Beat number - only show on quarter notes */}
                                                {isQuarterNote && (
                                                    <span className="chart-editor-cell-number">
                                                        {quarterNoteIndex + 1}
                                                    </span>
                                                )}

                                                {/* Key indicator */}
                                                {requiredKey && (
                                                    <span className="chart-editor-cell-key">
                                                        {getKeySymbol(requiredKey as SupportedKey)}
                                                    </span>
                                                )}

                                                {/* Empty indicator for beats without keys */}
                                                {!requiredKey && (
                                                    <span className="chart-editor-cell-empty" />
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* Measure boundary line */}
                                    <div className="chart-editor-measure-boundary" />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Chart style indicator */}
            <div className="chart-editor-footer">
                <span className="chart-editor-style-indicator">
                    {chartStyle === 'ddr' ? 'DDR Mode (Arrow Keys)' : 'Guitar Hero Mode (Number Keys 1-5)'}
                </span>
            </div>
        </div>
    );
}

export default ChartEditor;
