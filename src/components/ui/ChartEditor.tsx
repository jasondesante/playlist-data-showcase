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
    useTimeSignature,
    useChartStyle,
    useSelectedKey,
    useEditorMode,
    useKeyMap,
} from '../../store/beatDetectionStore';

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

    // Refs
    const gridRef = useRef<HTMLDivElement>(null);
    const isDraggingRef = useRef(false);
    const dragStartBeatRef = useRef<number | null>(null);
    const lastPaintedBeatRef = useRef<number | null>(null);

    // Local state for drag selection preview
    const [dragPreview, setDragPreview] = useState<Set<number>>(new Set());

    // Virtualization
    const virtualization = useVirtualization(gridRef, totalBeats, cellWidth);

    // Group beats by measure (for virtualized rendering)
    const measures = useMemo(() => {
        if (!subdividedBeatMap) return [];

        const { startIndex, endIndex } = virtualization;
        const grouped: Array<Array<{ beatIndex: number; requiredKey?: string }>> = [];
        let currentMeasure: Array<{ beatIndex: number; requiredKey?: string }> = [];

        for (let i = startIndex; i < endIndex && i < totalBeats; i++) {
            const beat = subdividedBeatMap.beats[i];
            const requiredKey = keyMap.get(i);

            // Start new measure on downbeat (except for first visible beat)
            if (beat.isDownbeat && i > startIndex) {
                grouped.push(currentMeasure);
                currentMeasure = [];
            }

            currentMeasure.push({ beatIndex: i, requiredKey });

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
    }, [subdividedBeatMap, totalBeats, keyMap, actualBeatsPerMeasure, virtualization]);

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

            {/* Grid container with horizontal scroll */}
            <div className="chart-editor-container" ref={gridRef}>
                <div
                    className="chart-editor-track"
                    style={{ width: `${totalBeats * cellWidth}px` }}
                >
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
                            const firstBeatIndex = measure[0]?.beatIndex ?? 0;
                            const lastBeatIndex = measure[measure.length - 1]?.beatIndex ?? firstBeatIndex;
                            const actualMeasureNumber = Math.floor(firstBeatIndex / actualBeatsPerMeasure) + 1;
                            const measureKey = `measure-${firstBeatIndex}-${lastBeatIndex}-${measureIndex}`;

                            return (
                                <div
                                    key={measureKey}
                                    className="chart-editor-measure"
                                    style={{ width: `${measure.length * cellWidth}px` }}
                                >
                                    {/* Measure number label */}
                                    <div className="chart-editor-measure-label">
                                        M{actualMeasureNumber}
                                    </div>

                                    {/* Beat cells */}
                                    {measure.map(({ beatIndex, requiredKey }) => {
                                        const hasKey = !!requiredKey;
                                        const isPainting = dragPreview.has(beatIndex);
                                        const keyColorClass = requiredKey ? getKeyColorClass(requiredKey) : '';

                                        return (
                                            <div
                                                key={beatIndex}
                                                className={cn(
                                                    'chart-editor-cell',
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
                                                aria-label={`Beat ${beatIndex + 1}${requiredKey ? `, key: ${requiredKey}` : ', no key'}`}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        handleBeatClick(beatIndex, e);
                                                    }
                                                }}
                                            >
                                                {/* Beat number */}
                                                <span className="chart-editor-cell-number">
                                                    {beatIndex + 1}
                                                </span>

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
