/**
 * SubdivisionToolbar Component
 *
 * A horizontal toolbar for selecting a subdivision "brush" and applying it
 * to selected beats in the BeatSubdivisionGrid. This component works in
 * conjunction with the grid to provide a complete per-beat subdivision
 * editing experience.
 *
 * Part of Phase 5: UI Component - SubdivisionToolbar (Task 5.1)
 *
 * Features:
 * - Horizontal bar with subdivision type buttons (9 types)
 * - Visual density indicators on each button (dots showing note density)
 * - Shows current "brush" subdivision with active state
 * - Apply to selection button with selection count badge
 * - Selection actions: Clear, Select All, Reset All
 * - Full keyboard navigation support
 * - Keyboard shortcuts (1-9 for types, Enter to apply, Escape to clear)
 * - Compact mode for smaller displays
 * - Accessibility support with ARIA attributes
 *
 * @module SubdivisionToolbar
 * @see BeatSubdivisionGrid - The grid component this toolbar controls
 * @see SubdivisionType - The subdivision type enum
 */
import { useCallback, useEffect } from 'react';
import { cn } from '@/utils/cn';
import './SubdivisionToolbar.css';
import type { SubdivisionType } from '@/types';

/**
 * Configuration for a single subdivision type button in the toolbar.
 *
 * Defines the visual representation, keyboard shortcut, and metadata
 * for each of the 9 available subdivision types.
 *
 * @property id - The subdivision type identifier (e.g., 'quarter', 'eighth')
 * @property label - Full display label shown on the button (e.g., "Quarter")
 * @property shortLabel - Compact label for compact mode (e.g., "1/4", "T8")
 * @property shortcut - Keyboard shortcut key (1-9)
 * @property description - Human-readable description for tooltips and accessibility
 * @property density - Visual density value used to render indicator dots:
 *   - 0 = Rest (no dots)
 *   - 0.5 = Half (half dot)
 *   - 1 = Quarter (1 dot)
 *   - 1.5 = Dotted/Triplet quarter (1 dot)
 *   - 2 = Eighth (2 dots)
 *   - 3 = Triplet 8th/Dotted 8th (3 dots)
 *   - 4 = Sixteenth (4 dots)
 * @property color - CSS color theme key for styling (matches SubdivisionType values)
 */
interface SubdivisionTypeConfig {
    id: SubdivisionType;
    label: string;
    shortLabel: string;
    shortcut: string;
    description: string;
    density: number;
    color: string;
}

/**
 * All subdivision types available in the toolbar.
 *
 * This array defines the complete set of subdivision options available for
 * per-beat editing. Each type includes display properties and metadata.
 *
 * Order is significant: the array index + 1 corresponds to the keyboard shortcut
 * (index 0 = shortcut "1", index 8 = shortcut "9").
 *
 * Available types:
 * 1. Quarter - Standard quarter notes (default)
 * 2. Half - Half notes (beats on 1 and 3 in 4/4 time)
 * 3. Eighth - Eighth notes (double density)
 * 4. Sixteenth - Sixteenth notes (maximum density)
 * 5. Triplet 8 - Eighth note triplets (3 per quarter)
 * 6. Triplet 4 - Quarter note triplets
 * 7. Dotted 4 - Dotted quarter notes
 * 8. Dotted 8 - Dotted eighth notes (swing pattern)
 * 9. Rest - No beats (silence)
 *
 * @constant
 * @see SubdivisionTypeConfig - Configuration interface for each type
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
    {
        id: 'rest',
        label: 'Rest',
        shortLabel: '-',
        shortcut: '9',
        description: 'Rest (no beats)',
        density: 0,
        color: 'rest',
    },
];

/**
 * Props for the SubdivisionToolbar component.
 *
 * @property currentBrush - The currently selected subdivision "brush" type.
 *   This is the subdivision that will be applied when the user clicks "Apply".
 * @property onBrushChange - Callback fired when the user selects a different
 *   subdivision type. Receives the new SubdivisionType as argument.
 * @property onApplyToSelection - Callback fired when the user clicks the "Apply"
 *   button or presses Enter. Should apply the currentBrush to all selected beats.
 * @property onClearSelection - Optional callback to clear the current selection.
 *   If provided, a "Clear" button is shown. Triggered by button click or Escape key.
 * @property onSelectAll - Optional callback to select all beats.
 *   If provided, an "All" button is shown. Triggered by button click or Ctrl/Cmd+A.
 * @property onResetAll - Optional callback to reset all beats to the default subdivision.
 *   If provided, a "Reset" button (danger styled) is shown.
 * @property selectionCount - Number of beats currently selected.
 *   Used to enable/disable the Apply button and show a count badge. Default: 0.
 * @property disabled - Whether the entire toolbar is disabled.
 *   When true, all buttons are disabled and keyboard shortcuts are ignored. Default: false.
 * @property compact - Whether to use compact layout (short labels).
 *   Useful for smaller screens or embedded contexts. Default: false.
 */
interface SubdivisionToolbarProps {
    currentBrush: SubdivisionType;
    onBrushChange: (subdivision: SubdivisionType) => void;
    onApplyToSelection: () => void;
    onClearSelection?: () => void;
    onSelectAll?: () => void;
    onResetAll?: () => void;
    selectionCount?: number;
    disabled?: boolean;
    compact?: boolean;
}

/**
 * SubdivisionToolbar Component
 *
 * Renders a horizontal toolbar with subdivision type buttons and action buttons.
 * Used in conjunction with BeatSubdivisionGrid for per-beat subdivision editing.
 *
 * The toolbar provides:
 * - A "brush" selection interface where users pick a subdivision type
 * - Action buttons to apply the brush to selected beats
 * - Selection management (clear, select all, reset all)
 * - Full keyboard accessibility with shortcuts
 *
 * Keyboard Shortcuts:
 * - 1-9: Select subdivision type (corresponds to position in toolbar)
 * - Enter: Apply current brush to selection
 * - Escape: Clear selection
 * - Ctrl/Cmd+A: Select all
 * - Arrow keys: Navigate between subdivision buttons (when focused)
 *
 * @param props - Component props
 * @param props.currentBrush - The currently active subdivision brush
 * @param props.onBrushChange - Callback when brush changes
 * @param props.onApplyToSelection - Callback to apply brush to selection
 * @param props.onClearSelection - Optional callback to clear selection
 * @param props.onSelectAll - Optional callback to select all beats
 * @param props.onResetAll - Optional callback to reset all to default
 * @param props.selectionCount - Number of selected beats (default: 0)
 * @param props.disabled - Whether toolbar is disabled (default: false)
 * @param props.compact - Whether to use compact layout (default: false)
 * @returns The rendered toolbar component
 *
 * @example
 * ```tsx
 * // Basic usage in SubdivisionSettings
 * <SubdivisionToolbar
 *   currentBrush={brushSubdivision}
 *   onBrushChange={setBrushSubdivision}
 *   onApplyToSelection={handleApply}
 *   selectionCount={selectedBeats.size}
 *   disabled={!hasBeatMap}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // With all optional callbacks
 * <SubdivisionToolbar
 *   currentBrush={brush}
 *   onBrushChange={setBrush}
 *   onApplyToSelection={applyToSelection}
 *   onClearSelection={clearSelection}
 *   onSelectAll={selectAll}
 *   onResetAll={resetAll}
 *   selectionCount={selection.size}
 *   compact={isMobile}
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

            // Number keys 1-9 for subdivision types
            const num = parseInt(e.key, 10);
            if (num >= 1 && num <= 9) {
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
 * Get the subdivision type configuration by ID.
 *
 * Looks up the display configuration for a given subdivision type,
 * including label, shortcut, description, and visual properties.
 *
 * @param type - The subdivision type to look up
 * @returns The configuration object, or undefined if not found
 *
 * @example
 * ```tsx
 * const config = getSubdivisionTypeConfig('eighth');
 * console.log(config?.label); // "Eighth"
 * console.log(config?.shortcut); // "3"
 * ```
 */
export function getSubdivisionTypeConfig(type: SubdivisionType): SubdivisionTypeConfig | undefined {
    return SUBDIVISION_TYPES.find((t) => t.id === type);
}

/**
 * All subdivision type configurations for external use.
 *
 * Exported for components that need direct access to the full list of
 * subdivision types, such as for rendering legends or custom selectors.
 *
 * Note: This array is ordered by keyboard shortcut (1-9). Index 0 corresponds
 * to shortcut "1" (Quarter), index 8 corresponds to shortcut "9" (Rest).
 *
 * @see SubdivisionTypeConfig - Configuration interface
 * @see getSubdivisionTypeConfig - Lookup function for single type
 */
export { SUBDIVISION_TYPES };

export default SubdivisionToolbar;
