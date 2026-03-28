/**
 * DifficultyComparisonForLevel Component
 *
 * An optional expandable panel showing side-by-side comparison of all 4 difficulty levels.
 * Displays beat count, density, and button assignment differences between difficulties.
 *
 * Features:
 * - Side-by-side Natural/Easy/Medium/Hard comparison
 * - Beat count per difficulty
 * - Beat density calculation
 * - Button assignment differences (unique buttons per difficulty)
 * - Collapsible/expandable section
 *
 * Task 7.5: DifficultyComparisonForLevel Component (Optional Expandable)
 */

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import './DifficultyComparisonForLevel.css';
import { cn } from '../../utils/cn';
import {
    useAllDifficultyLevels,
} from '../../store/beatDetectionStore';
import {
    DIFFICULTY_COLORS,
    getDifficultyLabel,
} from './DifficultySwitcher';
import type {
    AllDifficultiesWithNatural,
    DifficultyLevel,
} from '../../types/levelGeneration';
import type { GeneratedLevel } from 'playlist-data-engine';

// ============================================================
// Types
// ============================================================

export interface DifficultyComparisonForLevelProps {
    /** Whether the panel is initially expanded */
    defaultExpanded?: boolean;
    /** Additional CSS class names */
    className?: string;
}

interface DifficultyStats {
    difficulty: DifficultyLevel;
    beatCount: number;
    density: number; // beats per second
    uniqueButtons: string[];
    downbeatCount: number;
}

// ============================================================
// Constants
// ============================================================

const DIFFICULTY_ORDER: DifficultyLevel[] = ['natural', 'easy', 'medium', 'hard'];

// ============================================================
// Helper Functions
// ============================================================

/**
 * Calculate statistics for a single difficulty level
 */
function calculateDifficultyStats(
    level: GeneratedLevel | undefined,
    duration: number
): DifficultyStats | null {
    if (!level?.chart?.beats) {
        return null;
    }

    const beats = level.chart.beats;
    const beatCount = beats.length;
    const density = duration > 0 ? beatCount / duration : 0;
    const downbeatCount = beats.filter(b => b.isDownbeat).length;

    // Get unique buttons used
    const uniqueButtons = [...new Set(
        beats
            .map(b => b.requiredKey)
            .filter((key): key is string => key !== undefined && key !== null)
    )];

    return {
        difficulty: level.variant?.difficulty || 'medium',
        beatCount,
        density,
        uniqueButtons,
        downbeatCount,
    };
}

/**
 * Format density for display
 */
function formatDensity(density: number): string {
    return density.toFixed(2);
}

/**
 * Get the maximum beat count for bar scaling
 */
function getMaxBeatCount(stats: (DifficultyStats | null)[]): number {
    return Math.max(
        ...stats
            .filter((s): s is DifficultyStats => s !== null)
            .map(s => s.beatCount),
        1 // Avoid division by zero
    );
}

// ============================================================
// Sub-components
// ============================================================

interface DifficultyBarProps {
    stats: DifficultyStats;
    maxBeatCount: number;
}

function DifficultyBar({ stats, maxBeatCount }: DifficultyBarProps) {
    const width = (stats.beatCount / maxBeatCount) * 100;
    const color = DIFFICULTY_COLORS[stats.difficulty] || DIFFICULTY_COLORS.medium;
    const label = getDifficultyLabel(stats.difficulty);

    return (
        <div className="difficulty-comparison-row">
            <div className="difficulty-comparison-label" style={{ color }}>
                {label}
            </div>
            <div className="difficulty-comparison-bar-container">
                <div
                    className="difficulty-comparison-bar"
                    style={{
                        width: `${width}%`,
                        backgroundColor: color,
                    }}
                />
                <div className="difficulty-comparison-count">
                    {stats.beatCount} beats
                </div>
            </div>
            <div className="difficulty-comparison-density">
                {formatDensity(stats.density)} b/s
            </div>
            <div className="difficulty-comparison-buttons">
                {stats.uniqueButtons.length > 0 ? (
                    <span className="difficulty-comparison-button-count">
                        {stats.uniqueButtons.length} unique keys
                    </span>
                ) : (
                    <span className="difficulty-comparison-button-count difficulty-comparison-button-count--empty">
                        No keys
                    </span>
                )}
            </div>
        </div>
    );
}

interface ComparisonHeaderProps {
    onToggle: () => void;
    isExpanded: boolean;
}

function ComparisonHeader({ onToggle, isExpanded }: ComparisonHeaderProps) {
    return (
        <button
            className="difficulty-comparison-header"
            onClick={onToggle}
            type="button"
            aria-expanded={isExpanded}
        >
            <BarChart3 size={16} className="difficulty-comparison-header-icon" />
            <span className="difficulty-comparison-header-title">
                Difficulty Comparison
            </span>
            <span className="difficulty-comparison-header-subtitle">
                Side-by-side comparison
            </span>
            {isExpanded ? (
                <ChevronUp size={16} className="difficulty-comparison-header-chevron" />
            ) : (
                <ChevronDown size={16} className="difficulty-comparison-header-chevron" />
            )}
        </button>
    );
}

// ============================================================
// Main Component
// ============================================================

export function DifficultyComparisonForLevel({
    defaultExpanded = false,
    className,
}: DifficultyComparisonForLevelProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    // Get all difficulty levels from store
    const allDifficulties = useAllDifficultyLevels() as AllDifficultiesWithNatural | null;

    // Calculate stats for each difficulty
    const { stats, maxBeatCount, duration, controllerMode } = useMemo(() => {
        if (!allDifficulties) {
            return { stats: [], maxBeatCount: 1, duration: 0, controllerMode: undefined };
        }

        // Get duration from any available level
        const anyLevel = allDifficulties.medium || allDifficulties.easy || allDifficulties.hard || allDifficulties.natural;
        const levelDuration = anyLevel?.chart?.duration || 0;
        const mode = anyLevel?.metadata?.controllerMode;

        const calculatedStats = DIFFICULTY_ORDER.map(difficulty => {
            const level = allDifficulties[difficulty];
            return calculateDifficultyStats(level, levelDuration);
        });

        return {
            stats: calculatedStats,
            maxBeatCount: getMaxBeatCount(calculatedStats),
            duration: levelDuration,
            controllerMode: mode,
        };
    }, [allDifficulties]);

    // Toggle expand/collapse
    const handleToggle = () => {
        setIsExpanded(prev => !prev);
    };

    // Don't render if no data
    if (!allDifficulties || stats.every(s => s === null)) {
        return null;
    }

    return (
        <div className={cn('difficulty-comparison', className)}>
            <ComparisonHeader
                onToggle={handleToggle}
                isExpanded={isExpanded}
            />

            {isExpanded && (
                <div className="difficulty-comparison-content">
                    {/* Column headers */}
                    <div className="difficulty-comparison-headers">
                        <div className="difficulty-comparison-header-cell difficulty-comparison-header-level">
                            Level
                        </div>
                        <div className="difficulty-comparison-header-cell difficulty-comparison-header-beats">
                            Beats
                        </div>
                        <div className="difficulty-comparison-header-cell difficulty-comparison-header-density">
                            Density
                        </div>
                        <div className="difficulty-comparison-header-cell difficulty-comparison-header-buttons">
                            Keys
                        </div>
                    </div>

                    {/* Difficulty rows */}
                    <div className="difficulty-comparison-rows">
                        {stats.map((stat, index) => {
                            if (!stat) {
                                return (
                                    <div
                                        key={DIFFICULTY_ORDER[index]}
                                        className="difficulty-comparison-row difficulty-comparison-row--empty"
                                    >
                                        <div
                                            className="difficulty-comparison-label"
                                            style={{ color: DIFFICULTY_COLORS[DIFFICULTY_ORDER[index]] }}
                                        >
                                            {getDifficultyLabel(DIFFICULTY_ORDER[index])}
                                        </div>
                                        <div className="difficulty-comparison-empty-message">
                                            Not generated
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <DifficultyBar
                                    key={stat.difficulty}
                                    stats={stat}
                                    maxBeatCount={maxBeatCount}
                                />
                            );
                        })}
                    </div>

                    {/* Summary */}
                    <div className="difficulty-comparison-summary">
                        <span className="difficulty-comparison-summary-item">
                            Duration: <strong>{duration.toFixed(1)}s</strong>
                        </span>
                        <span className="difficulty-comparison-summary-separator">•</span>
                        <span className="difficulty-comparison-summary-item">
                            Mode: <strong>{controllerMode === 'ddr' ? 'DDR' : 'Guitar Hero'}</strong>
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DifficultyComparisonForLevel;
