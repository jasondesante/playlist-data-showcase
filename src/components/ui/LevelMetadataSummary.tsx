/**
 * LevelMetadataSummary Component
 *
 * A compact stats card showing key numbers from the generated level.
 * This is a standalone, reusable component for displaying essential level metadata.
 *
 * Features:
 * - Difficulty with color coding
 * - Controller mode (DDR/Guitar Hero)
 * - Total beats count
 * - BPM from the chart
 * - Compact horizontal layout
 *
 * Task 7.3: LevelMetadataSummary Component (Compact)
 */

import { Gamepad2, Music, Activity } from 'lucide-react';
import './LevelMetadataSummary.css';
import { cn } from '../../utils/cn';
import type { DifficultyLevel } from '../../types/levelGeneration';
import type { ControllerMode } from 'playlist-data-engine';

// ============================================================
// Types
// ============================================================

export interface LevelMetadataSummaryProps {
    /** Difficulty level of the chart */
    difficulty: DifficultyLevel;
    /** Controller mode (DDR or Guitar Hero) */
    controllerMode: ControllerMode | undefined;
    /** Total number of beats in the chart */
    totalBeats: number;
    /** BPM of the audio/chart */
    bpm: number;
    /** Additional CSS class names */
    className?: string;
    /** Whether to show inline (no card background) */
    inline?: boolean;
}

// ============================================================
// Constants
// ============================================================

const DIFFICULTY_COLORS: Record<DifficultyLevel, string> = {
    natural: '#8b5cf6', // Purple
    easy: '#22c55e',    // Green
    medium: '#f59e0b',  // Amber
    hard: '#ef4444',    // Red
};

const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
    natural: 'Natural',
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
};

// ============================================================
// Helper Functions
// ============================================================

/**
 * Format controller mode for display.
 */
function formatControllerMode(mode: ControllerMode | undefined): string {
    if (!mode) return 'DDR';
    return mode === 'ddr' ? 'DDR' : 'Guitar Hero';
}

/**
 * Format BPM for display.
 */
function formatBPM(bpm: number): string {
    return Math.round(bpm).toString();
}

// ============================================================
// Main Component
// ============================================================

export function LevelMetadataSummary({
    difficulty,
    controllerMode,
    totalBeats,
    bpm,
    className,
    inline = false,
}: LevelMetadataSummaryProps) {
    const difficultyColor = DIFFICULTY_COLORS[difficulty];
    const difficultyLabel = DIFFICULTY_LABELS[difficulty];

    return (
        <div
            className={cn(
                'level-metadata-summary',
                inline && 'level-metadata-summary--inline',
                className
            )}
        >
            {/* Difficulty */}
            <div className="level-meta-stat">
                <span
                    className="level-meta-value level-meta-difficulty"
                    style={{ color: difficultyColor }}
                >
                    {difficultyLabel}
                </span>
                <span className="level-meta-label">Difficulty</span>
            </div>

            <div className="level-meta-divider" />

            {/* Controller Mode */}
            <div className="level-meta-stat">
                <span className="level-meta-value level-meta-mode">
                    <Gamepad2 size={14} className="level-meta-icon" />
                    {formatControllerMode(controllerMode)}
                </span>
                <span className="level-meta-label">Mode</span>
            </div>

            <div className="level-meta-divider" />

            {/* Total Beats */}
            <div className="level-meta-stat">
                <span className="level-meta-value level-meta-beats">
                    <Music size={14} className="level-meta-icon" />
                    {totalBeats.toLocaleString()}
                </span>
                <span className="level-meta-label">Beats</span>
            </div>

            <div className="level-meta-divider" />

            {/* BPM */}
            <div className="level-meta-stat">
                <span className="level-meta-value level-meta-bpm">
                    <Activity size={14} className="level-meta-icon" />
                    {formatBPM(bpm)}
                </span>
                <span className="level-meta-label">BPM</span>
            </div>
        </div>
    );
}

export default LevelMetadataSummary;
