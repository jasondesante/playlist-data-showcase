/**
 * SubdivisionToolbar Component
 *
 * A horizontal toolbar for selecting a subdivision "brush" and applying it
 * to selected beats in the BeatSubdivisionGrid.
 *
 * Part of Phase 5: UI Component - SubdivisionToolbar (Task 5.1)
 *
 * Features:
 * - Horizontal bar with subdivision type buttons
 * - Shows current "brush" subdivision
 * - Apply to selection button
 * - Keyboard shortcuts (1-8 for types)
 *
 * @component
 */
import { useCallback, useEffect } from 'react';
import { cn } from '@/utils/cn';
import './SubdivisionToolbar.css';
import type { SubdivisionType } from '@/types';

/**
 * Subdivision type configuration for the toolbar.
 */
interface SubdivisionTypeConfig {
    /** The subdivision type ID */
    id: SubdivisionType;
    /** Display label for the button */
    label: string;
    /** Short label for compact displays */
    shortLabel: string;
    /** Keyboard shortcut (1-8) */
    shortcut: string;
    /** Description for tooltip/accessibility */
    description: string;
    /** Visual density indicator */
    density: number;
    /** Color theme key */
    color: string;
}

/**
 * All subdivision types available in the toolbar.
 * Ordered by keyboard shortcut (1-8).
 */
const SUBDIVISION_TYPES: SubdivisionTypeConfig[] = [
    {
        id: 'quarter',
        label: 'Quarter',
        shortLabel: '1/4',
        shortcut: '1',
        description: 'Quarter notes (default)',
        density: 1,
        color: 'quarter',
    },
    {
        id: 'half',
        label: 'Half',
        shortLabel: '1/2',
        shortcut: '2',
        description: 'Half notes (beats on 1 and 3)',
        density: 0.5,
        color: 'half',
    },
    {
        id: 'eighth',
        label: 'Eighth',
        shortLabel: '1/8',
        shortcut: '3',
        description: 'Eighth notes (double density)',
        density: 2,
        color: 'eighth',
    },
    {
        id: 'sixteenth',
        label: '16th',
        shortLabel: '1/16',
        shortcut: '4',
        description: 'Sixteenth notes (maximum density)',
        density: 4,
        color: 'sixteenth',
    },
    {
        id: 'triplet8',
        label: 'Triplet 8',
        shortLabel: 'T8',
        shortcut: '5',
        description: 'Eighth triplets (3 per quarter)',
        density: 3,
        color: 'triplet8',
    },
    {
        id: 'triplet4',
        label: 'Triplet 4',
        shortLabel: 'T4',
        shortcut: '6',
        description: 'Quarter triplets',
        density: 1.5,
        color: 'triplet4',
    },
    {
        id: 'dotted4',
        label: 'Dotted 4',
        shortLabel: 'D4',
        shortcut: '7',
        description: 'Dotted quarter notes',
        density: 1.5,
        color: 'dotted4',
    },
    {
        id: 'dotted8',
        label: 'Dotted 8',
        shortLabel: 'D8',
        shortcut: '8',
        description: 'Dotted eighth (swing pattern)',
        density: 3,
        color: 'dotted8',
    },
];

interface SubdivisionToolbarProps {
    /** Currently selected brush subdivision */
    currentBrush: SubdivisionType;
    /** Callback when brush subdivision changes */
    onBrushChange: (subdivision: SubdivisionType) => void;
    /** Callback to apply current brush to selection */
    onApplyToSelection: () => void;
    /** Callback to clear selection */
    onClearSelection?: () => void;
    /** Callback to select all */
    onSelectAll?: () => void;
    /** Callback to reset all beats to default */
    onResetAll?: () => void;
    /** Number of beats currently selected */
    selectionCount?: number;
    /** Whether the toolbar is disabled */
    disabled?: boolean;
    /** Whether to show compact layout */
    compact?: boolean;
}

/**
 * SubdivisionToolbar Component
 *
 * Renders a horizontal toolbar with subdivision type buttons and action buttons.
 * Used in conjunction with BeatSubdivisionGrid for per-beat subdivision editing.
 *
 * @example
 * ```tsx
 * <SubdivisionToolbar
 *   currentBrush={brushSubdivision}
 *   onBrushChange={setBrushSubdivision}
 *   onApplyToSelection={handleApply}
 *   selectionCount={selectedBeats.size}
 *   disabled={!hasBeatMap}
 * />
 * ```
 */
export function SubdivisionToolbar({
    currentBrush,
    onBrushChange,
    onApplyToSelection,
    onClearSelection,
    onSelectAll,
    onResetAll,
    selectionCount = 0,
    disabled = false,
    compact = false,
}: SubdivisionToolbarProps) {
    /**
     * Handle subdivision button click
     */
    const handleSubdivisionClick = useCallback(
        (type: SubdivisionType) => {
            if (!disabled) {
                onBrushChange(type);
            }
        },
        [disabled, onBrushChange]
    );

    /**
     * Handle keyboard shortcuts (1-8 for subdivision types)
     */
    useEffect(() => {
        if (disabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in an input field
            if (
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement
            ) {
                return;
            }

            // Number keys 1-8 for subdivision types
            const num = parseInt(e.key, 10);
            if (num >= 1 && num <= 8) {
                e.preventDefault();
                const type = SUBDIVISION_TYPES[num - 1];
                if (type) {
                    onBrushChange(type.id);
                }
            }

            // Enter to apply to selection
            if (e.key === 'Enter' && selectionCount > 0) {
                e.preventDefault();
                onApplyToSelection();
            }

            // Escape to clear selection
            if (e.key === 'Escape' && selectionCount > 0 && onClearSelection) {
                e.preventDefault();
                onClearSelection();
            }

            // Ctrl/Cmd + A to select all
            if ((e.ctrlKey || e.metaKey) && e.key === 'a' && onSelectAll) {
                e.preventDefault();
                onSelectAll();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [disabled, onBrushChange, onApplyToSelection, onClearSelection, onSelectAll, selectionCount]);

    /**
     * Handle keyboard navigation within the button group
     */
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent, currentIndex: number) => {
            let newIndex = currentIndex;

            switch (e.key) {
                case 'ArrowLeft':
                case 'ArrowUp':
                    e.preventDefault();
                    newIndex = currentIndex > 0 ? currentIndex - 1 : SUBDIVISION_TYPES.length - 1;
                    break;
                case 'ArrowRight':
                case 'ArrowDown':
                    e.preventDefault();
                    newIndex = currentIndex < SUBDIVISION_TYPES.length - 1 ? currentIndex + 1 : 0;
                    break;
                case 'Home':
                    e.preventDefault();
                    newIndex = 0;
                    break;
                case 'End':
                    e.preventDefault();
                    newIndex = SUBDIVISION_TYPES.length - 1;
                    break;
                case ' ':
                case 'Enter':
                    e.preventDefault();
                    onApplyToSelection();
                    return;
                default:
                    return;
            }

            onBrushChange(SUBDIVISION_TYPES[newIndex].id);

            // Focus the new button
            const container = e.currentTarget.parentElement;
            if (container) {
                const buttons = container.querySelectorAll('[data-subdivision-index]');
                const targetButton = buttons[newIndex] as HTMLElement;
                if (targetButton) {
                    targetButton.focus();
                }
            }
        },
        [onBrushChange, onApplyToSelection]
    );

    return (
        <div
            className={cn(
                'subdivision-toolbar',
                compact && 'subdivision-toolbar--compact',
                disabled && 'subdivision-toolbar--disabled'
            )}
            role="toolbar"
            aria-label="Subdivision brush toolbar"
        >
            {/* Label */}
            <span className="subdivision-toolbar-label">
                Brush
            </span>

            {/* Subdivision type buttons */}
            <div
                className="subdivision-toolbar-types"
                role="radiogroup"
                aria-label="Subdivision type"
            >
                {SUBDIVISION_TYPES.map((type, index) => {
                    const isSelected = currentBrush === type.id;

                    return (
                        <button
                            key={type.id}
                            type="button"
                            data-subdivision-index={index}
                            className={cn(
                                'subdivision-toolbar-btn',
                                `subdivision-toolbar-btn--${type.color}`,
                                isSelected && 'subdivision-toolbar-btn--active'
                            )}
                            onClick={() => handleSubdivisionClick(type.id)}
                            onKeyDown={(e) => handleKeyDown(e, index)}
                            disabled={disabled}
                            role="radio"
                            aria-checked={isSelected}
                            aria-label={`${type.label}: ${type.description}`}
                            title={`${type.description} (press ${type.shortcut})`}
                            tabIndex={isSelected ? 0 : -1}
                        >
                            {/* Density indicator */}
                            <span className="subdivision-toolbar-btn-indicator" aria-hidden="true">
                                {type.density === 0.5 && (
                                    <span className="subdivision-toolbar-btn-dot subdivision-toolbar-btn-dot--half" />
                                )}
                                {(type.density === 1 || type.density === 1.5) && (
                                    <span className="subdivision-toolbar-btn-dot" />
                                )}
                                {type.density === 2 && (
                                    <>
                                        <span className="subdivision-toolbar-btn-dot" />
                                        <span className="subdivision-toolbar-btn-dot" />
                                    </>
                                )}
                                {type.density === 3 && (
                                    <>
                                        <span className="subdivision-toolbar-btn-dot" />
                                        <span className="subdivision-toolbar-btn-dot" />
                                        <span className="subdivision-toolbar-btn-dot" />
                                    </>
                                )}
                                {type.density === 4 && (
                                    <>
                                        <span className="subdivision-toolbar-btn-dot" />
                                        <span className="subdivision-toolbar-btn-dot" />
                                        <span className="subdivision-toolbar-btn-dot" />
                                        <span className="subdivision-toolbar-btn-dot" />
                                    </>
                                )}
                            </span>

                            {/* Label */}
                            <span className="subdivision-toolbar-btn-label">
                                {compact ? type.shortLabel : type.label}
                            </span>

                            {/* Shortcut hint */}
                            <span className="subdivision-toolbar-btn-shortcut" aria-hidden="true">
                                {type.shortcut}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Separator */}
            <div className="subdivision-toolbar-separator" role="separator" />

            {/* Selection actions */}
            <div className="subdivision-toolbar-actions">
                {/* Apply to selection */}
                <button
                    type="button"
                    className={cn(
                        'subdivision-toolbar-action',
                        'subdivision-toolbar-action--primary'
                    )}
                    onClick={onApplyToSelection}
                    disabled={disabled || selectionCount === 0}
                    title={`Apply ${currentBrush} to ${selectionCount} selected beats (Enter)`}
                >
                    <span className="subdivision-toolbar-action-label">Apply</span>
                    {selectionCount > 0 && (
                        <span className="subdivision-toolbar-action-count">{selectionCount}</span>
                    )}
                </button>

                {/* Clear selection */}
                {onClearSelection && (
                    <button
                        type="button"
                        className="subdivision-toolbar-action"
                        onClick={onClearSelection}
                        disabled={disabled || selectionCount === 0}
                        title="Clear selection (Escape)"
                    >
                        Clear
                    </button>
                )}

                {/* Select all */}
                {onSelectAll && (
                    <button
                        type="button"
                        className="subdivision-toolbar-action"
                        onClick={onSelectAll}
                        disabled={disabled}
                        title="Select all (Ctrl+A)"
                    >
                        All
                    </button>
                )}

                {/* Reset all */}
                {onResetAll && (
                    <button
                        type="button"
                        className={cn(
                            'subdivision-toolbar-action',
                            'subdivision-toolbar-action--danger'
                        )}
                        onClick={onResetAll}
                        disabled={disabled}
                        title="Reset all beats to default"
                    >
                        Reset
                    </button>
                )}
            </div>
        </div>
    );
}

/**
 * Get the subdivision type config by ID.
 */
export function getSubdivisionTypeConfig(type: SubdivisionType): SubdivisionTypeConfig | undefined {
    return SUBDIVISION_TYPES.find((t) => t.id === type);
}

/**
 * All subdivision type configs for external use.
 */
export { SUBDIVISION_TYPES };

export default SubdivisionToolbar;
