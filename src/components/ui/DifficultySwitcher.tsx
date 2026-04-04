/**
 * DifficultySwitcher Component
 *
 * A standalone component for switching between difficulty levels (Natural, Easy, Medium, Hard).
 * Used in the LevelGenerationPanel and can be reused in other contexts like Practice mode.
 *
 * Features:
 * - Four buttons/tabs: Natural | Easy | Medium | Hard
 * - Shows selected difficulty from settings by default
 * - Clicking switches the displayed level
 * - Visual indicator for currently selected
 * - Optional beat counts display for each difficulty
 *
 * Task 7.4: DifficultySwitcher Component
 */

import { useMemo } from 'react';
import './DifficultySwitcher.css';
import { cn } from '../../utils/cn';
import type { DifficultyLevel } from '../../types/levelGeneration';

// ============================================================
// Types
// ============================================================

export interface DifficultySwitcherProps {
    /** Currently selected difficulty */
    selected: DifficultyLevel;
    /** Callback when difficulty is changed */
    onChange: (difficulty: DifficultyLevel) => void;
    /** Optional beat counts for each difficulty to display */
    beatCounts?: Record<DifficultyLevel, number>;
    /** Additional CSS class names */
    className?: string;
    /** Size variant */
    size?: 'default' | 'compact';
    /** Show beat counts inline */
    showCounts?: boolean;
    /** Disabled state */
    disabled?: boolean;
}

/** Difficulty option configuration */
interface DifficultyOption {
    id: DifficultyLevel;
    label: string;
    colorClass: string;
}

// ============================================================
// Constants
// ============================================================

/** Available difficulty options */
const DIFFICULTY_OPTIONS: DifficultyOption[] = [
    { id: 'natural', label: 'Natural', colorClass: 'difficulty-natural' },
    { id: 'easy', label: 'Easy', colorClass: 'difficulty-easy' },
    { id: 'medium', label: 'Medium', colorClass: 'difficulty-medium' },
    { id: 'hard', label: 'Hard', colorClass: 'difficulty-hard' },
];

/** Difficulty colors from the plan */
export const DIFFICULTY_COLORS: Record<DifficultyLevel, string> = {
    natural: '#8b5cf6', // Purple
    easy: '#22c55e',    // Green
    medium: '#f59e0b',  // Amber
    hard: '#ef4444',    // Red
    custom: '#06b6d4',  // Cyan (density-based)
};

/** Difficulty RGB colors for rgba usage */
export const DIFFICULTY_COLORS_RGB: Record<DifficultyLevel, string> = {
    natural: '139, 92, 246',
    easy: '34, 197, 94',
    medium: '245, 158, 11',
    hard: '239, 68, 68',
    custom: '6, 182, 212',
};

// ============================================================
// Helper Functions
// ============================================================

/**
 * Get the display color for a difficulty level
 */
export function getDifficultyColor(difficulty: DifficultyLevel): string {
    return DIFFICULTY_COLORS[difficulty] || DIFFICULTY_COLORS.medium;
}

/**
 * Get the label for a difficulty level
 */
export function getDifficultyLabel(difficulty: DifficultyLevel): string {
    const option = DIFFICULTY_OPTIONS.find(opt => opt.id === difficulty);
    return option?.label || difficulty;
}

// ============================================================
// Main Component
// ============================================================

export function DifficultySwitcher({
    selected,
    onChange,
    beatCounts,
    className,
    size = 'default',
    showCounts = true,
    disabled = false,
}: DifficultySwitcherProps) {
    // Calculate total beats if counts provided
    const hasBeatCounts = useMemo(() => {
        return beatCounts && Object.values(beatCounts).some(count => count > 0);
    }, [beatCounts]);

    return (
        <div
            className={cn(
                'difficulty-switcher',
                `difficulty-switcher--${size}`,
                disabled && 'difficulty-switcher--disabled',
                className
            )}
            role="radiogroup"
            aria-label="Difficulty level"
        >
            {DIFFICULTY_OPTIONS.map((option) => {
                const isSelected = selected === option.id;
                const beatCount = beatCounts?.[option.id];

                return (
                    <button
                        key={option.id}
                        type="button"
                        className={cn(
                            'difficulty-btn',
                            option.colorClass,
                            isSelected && 'difficulty-btn--active'
                        )}
                        onClick={() => onChange(option.id)}
                        role="radio"
                        aria-checked={isSelected}
                        disabled={disabled}
                        style={{
                            '--difficulty-color': DIFFICULTY_COLORS[option.id],
                            '--difficulty-color-rgb': DIFFICULTY_COLORS_RGB[option.id],
                        } as React.CSSProperties}
                    >
                        <span className="difficulty-btn-label">{option.label}</span>
                        {showCounts && hasBeatCounts && beatCount !== undefined && (
                            <span className="difficulty-btn-count">{beatCount}</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

export default DifficultySwitcher;
