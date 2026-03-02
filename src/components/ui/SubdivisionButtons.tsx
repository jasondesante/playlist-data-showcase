/**
 * SubdivisionButtons Component
 *
 * A row of quick subdivision buttons for real-time subdivision switching
 * during practice mode. Part of Phase 6: Real-Time Subdivision Playground.
 *
 * Features:
 * - Row of quick subdivision buttons
 * - Buttons: Quarter, Half, Eighth, Sixteenth, Triplet, Swing
 * - Active state for current subdivision
 * - Disabled states when playback is inactive
 * - Touch-friendly sizing
 * - Keyboard navigation support
 *
 * @component
 */
import { useCallback } from 'react';
import './SubdivisionButtons.css';
import type { SubdivisionType } from '@/types';

/**
 * Quick subdivision button configuration for practice mode.
 *
 * These are the most commonly used subdivision types for real-time
 * experimentation during practice. Each button maps to a SubdivisionType.
 */
interface QuickSubdivisionConfig {
    /** The subdivision type ID */
    id: SubdivisionType;
    /** Display label for the button */
    label: string;
    /** Short label for mobile displays */
    shortLabel: string;
    /** Keyboard shortcut hint (shown in tooltip) */
    shortcut: string;
    /** Description for accessibility */
    description: string;
    /** Visual density indicator (1 = normal, 2 = double, etc.) */
    density: number;
}

/**
 * Quick subdivision options for practice mode.
 *
 * Note: Triplet uses triplet8 (eighth triplets) as it's the most common
 * triplet feel. Swing uses dotted8 for the classic swing pattern.
 */
const QUICK_SUBDIVISIONS: QuickSubdivisionConfig[] = [
    {
        id: 'quarter',
        label: 'Quarter',
        shortLabel: '1x',
        shortcut: '1',
        description: 'Quarter notes (default)',
        density: 1,
    },
    {
        id: 'half',
        label: 'Half',
        shortLabel: '0.5x',
        shortcut: '2',
        description: 'Half notes (beats on 1 and 3)',
        density: 0.5,
    },
    {
        id: 'eighth',
        label: 'Eighth',
        shortLabel: '2x',
        shortcut: '3',
        description: 'Eighth notes (double density)',
        density: 2,
    },
    {
        id: 'sixteenth',
        label: '16th',
        shortLabel: '4x',
        shortcut: '4',
        description: 'Sixteenth notes (maximum density)',
        density: 4,
    },
    {
        id: 'triplet8',
        label: 'Triplet',
        shortLabel: '3x',
        shortcut: '5',
        description: 'Eighth triplets (3 beats per quarter)',
        density: 3,
    },
    {
        id: 'dotted8',
        label: 'Swing',
        shortLabel: 'Swing',
        shortcut: '6',
        description: 'Dotted eighth (swing pattern)',
        density: 1,
    },
];

/**
 * Props for the SubdivisionButtons component.
 */
interface SubdivisionButtonsProps {
    /** Currently active subdivision type */
    currentSubdivision: SubdivisionType;
    /** Callback when a subdivision button is clicked */
    onSubdivisionChange: (type: SubdivisionType) => void;
    /** Whether the buttons should be disabled */
    disabled?: boolean;
    /** Whether playback is active (affects visual state) */
    isActive?: boolean;
    /** Whether to show compact layout for mobile */
    compact?: boolean;
}

/**
 * SubdivisionButtons Component
 *
 * Renders a horizontal row of quick subdivision buttons for practice mode.
 * Provides visual feedback for the current subdivision and supports both
 * mouse/touch interaction and keyboard shortcuts.
 *
 * @example
 * ```tsx
 * <SubdivisionButtons
 *   currentSubdivision={currentSubdivision}
 *   onSubdivisionChange={setSubdivision}
 *   disabled={!isPlaying}
 *   isActive={isPlaying}
 * />
 * ```
 */
export function SubdivisionButtons({
    currentSubdivision,
    onSubdivisionChange,
    disabled = false,
    isActive = false,
    compact = false,
}: SubdivisionButtonsProps) {
    /**
     * Handle button click
     */
    const handleClick = useCallback(
        (type: SubdivisionType) => {
            if (!disabled) {
                onSubdivisionChange(type);
            }
        },
        [disabled, onSubdivisionChange]
    );

    /**
     * Handle keyboard navigation
     */
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent, currentIndex: number) => {
            let newIndex = currentIndex;

            switch (e.key) {
                case 'ArrowLeft':
                case 'ArrowUp':
                    e.preventDefault();
                    newIndex = currentIndex > 0 ? currentIndex - 1 : QUICK_SUBDIVISIONS.length - 1;
                    break;
                case 'ArrowRight':
                case 'ArrowDown':
                    e.preventDefault();
                    newIndex = currentIndex < QUICK_SUBDIVISIONS.length - 1 ? currentIndex + 1 : 0;
                    break;
                case 'Home':
                    e.preventDefault();
                    newIndex = 0;
                    break;
                case 'End':
                    e.preventDefault();
                    newIndex = QUICK_SUBDIVISIONS.length - 1;
                    break;
                default:
                    // Number keys 1-6 for quick access
                    const num = parseInt(e.key, 10);
                    if (num >= 1 && num <= 6) {
                        e.preventDefault();
                        newIndex = num - 1;
                    }
                    return;
            }

            onSubdivisionChange(QUICK_SUBDIVISIONS[newIndex].id);

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
        [onSubdivisionChange]
    );

    return (
        <div
            className={`subdivision-buttons ${compact ? 'subdivision-buttons--compact' : ''} ${isActive ? 'subdivision-buttons--active' : ''}`}
            role="radiogroup"
            aria-label="Subdivision type"
        >
            {/* Label */}
            <span className="subdivision-buttons-label">
                Subdivision
            </span>

            {/* Button group */}
            <div className="subdivision-buttons-group">
                {QUICK_SUBDIVISIONS.map((subdivision, index) => {
                    const isSelected = currentSubdivision === subdivision.id;
                    const isDisabled = disabled && !isSelected;

                    return (
                        <button
                            key={subdivision.id}
                            type="button"
                            data-subdivision-index={index}
                            className={`subdivision-buttons-btn ${isSelected ? 'subdivision-buttons-btn--active' : ''} ${isDisabled ? 'subdivision-buttons-btn--disabled' : ''}`}
                            onClick={() => handleClick(subdivision.id)}
                            onKeyDown={(e) => handleKeyDown(e, index)}
                            disabled={isDisabled}
                            role="radio"
                            aria-checked={isSelected}
                            aria-label={`${subdivision.label}: ${subdivision.description}`}
                            title={`${subdivision.description} (press ${subdivision.shortcut})`}
                            tabIndex={isSelected ? 0 : -1}
                        >
                            {/* Density indicator dots */}
                            <span className="subdivision-buttons-btn-dots" aria-hidden="true">
                                {subdivision.density >= 0.5 && subdivision.density < 1 && (
                                    <>
                                        <span className="subdivision-buttons-btn-dot" />
                                    </>
                                )}
                                {subdivision.density === 1 && (
                                    <>
                                        <span className="subdivision-buttons-btn-dot" />
                                    </>
                                )}
                                {subdivision.density === 2 && (
                                    <>
                                        <span className="subdivision-buttons-btn-dot" />
                                        <span className="subdivision-buttons-btn-dot" />
                                    </>
                                )}
                                {subdivision.density === 3 && (
                                    <>
                                        <span className="subdivision-buttons-btn-dot" />
                                        <span className="subdivision-buttons-btn-dot" />
                                        <span className="subdivision-buttons-btn-dot" />
                                    </>
                                )}
                                {subdivision.density === 4 && (
                                    <>
                                        <span className="subdivision-buttons-btn-dot" />
                                        <span className="subdivision-buttons-btn-dot" />
                                        <span className="subdivision-buttons-btn-dot" />
                                        <span className="subdivision-buttons-btn-dot" />
                                    </>
                                )}
                            </span>

                            {/* Label */}
                            <span className="subdivision-buttons-btn-label">
                                {compact ? subdivision.shortLabel : subdivision.label}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Current subdivision indicator (shown when active) */}
            {isActive && (
                <span className="subdivision-buttons-indicator" aria-live="polite">
                    {QUICK_SUBDIVISIONS.find((s) => s.id === currentSubdivision)?.description}
                </span>
            )}
        </div>
    );
}

/**
 * Get the quick subdivision config by type.
 * Useful for displaying the current subdivision in other components.
 */
export function getQuickSubdivisionConfig(type: SubdivisionType): QuickSubdivisionConfig | undefined {
    return QUICK_SUBDIVISIONS.find((s) => s.id === type);
}

/**
 * All quick subdivision configs for external use.
 */
export { QUICK_SUBDIVISIONS };

export default SubdivisionButtons;
