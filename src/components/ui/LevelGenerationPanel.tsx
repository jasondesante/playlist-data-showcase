/**
 * LevelGenerationPanel Component
 *
 * Container component for displaying the final generated level output.
 * This is the primary visualization panel in the Pitch & Level Generation feature (Phase 7).
 *
 * Features:
 * - Compact stats card with key numbers (difficulty, controller mode, total beats, processing time)
 * - Difficulty switcher (Natural | Easy | Medium | Hard) - shows selected by default
 * - Integration with PitchLevelTab as the default expanded panel
 *
 * Task 7.1: Create LevelGenerationPanel Component
 */

import { useMemo, useCallback } from 'react';
import { Gamepad2, Music, Layers } from 'lucide-react';
import './LevelGenerationPanel.css';
import { cn } from '../../utils/cn';
import {
    useAllDifficultyLevels,
    useBeatDetectionActions,
} from '../../store/beatDetectionStore';
import {
    useSelectedDifficulty,
} from '../../hooks/useLevelGeneration';
import type {
    AllDifficultiesWithNatural,
    DifficultyLevel,
} from '../../types/levelGeneration';
import type { GeneratedLevel, ControllerMode } from 'playlist-data-engine';

// ============================================================
// Types
// ============================================================

export interface LevelGenerationPanelProps {
    /** Additional CSS class names */
    className?: string;
}

/** Difficulty option for the switcher */
interface DifficultyOption {
    id: DifficultyLevel;
    label: string;
    colorClass: string;
}

// ============================================================
// Constants
// ============================================================

const DIFFICULTY_OPTIONS: DifficultyOption[] = [
    { id: 'natural', label: 'Natural', colorClass: 'difficulty-natural' },
    { id: 'easy', label: 'Easy', colorClass: 'difficulty-easy' },
    { id: 'medium', label: 'Medium', colorClass: 'difficulty-medium' },
    { id: 'hard', label: 'Hard', colorClass: 'difficulty-hard' },
];

// Difficulty colors from the plan
const DIFFICULTY_COLORS: Record<DifficultyLevel, string> = {
    natural: '#8b5cf6', // Purple
    easy: '#22c55e',    // Green
    medium: '#f59e0b',  // Amber
    hard: '#ef4444',    // Red
};

// ============================================================
// Helper Functions
// ============================================================

/**
 * Get level data for a specific difficulty.
 */
function getLevelForDifficulty(
    allDifficulties: AllDifficultiesWithNatural | null,
    difficulty: DifficultyLevel
): GeneratedLevel | undefined {
    if (!allDifficulties) return undefined;
    return allDifficulties[difficulty] as GeneratedLevel | undefined;
}

/**
 * Format controller mode for display.
 */
function formatControllerMode(mode: ControllerMode | undefined): string {
    if (!mode) return 'DDR';
    return mode === 'ddr' ? 'DDR' : 'Guitar Hero';
}

// ============================================================
// Sub-components
// ============================================================

interface DifficultySwitcherProps {
    selected: DifficultyLevel;
    onChange: (difficulty: DifficultyLevel) => void;
    beatCounts?: Record<DifficultyLevel, number>;
}

/**
 * Difficulty switcher component with 4 buttons.
 */
function DifficultySwitcher({ selected, onChange, beatCounts }: DifficultySwitcherProps) {
    return (
        <div className="level-difficulty-switcher" role="radiogroup" aria-label="Difficulty level">
            {DIFFICULTY_OPTIONS.map((option) => {
                const isSelected = selected === option.id;
                const beatCount = beatCounts?.[option.id];

                return (
                    <button
                        key={option.id}
                        type="button"
                        className={cn(
                            'level-difficulty-btn',
                            option.colorClass,
                            isSelected && 'level-difficulty-btn--active'
                        )}
                        onClick={() => onChange(option.id)}
                        role="radio"
                        aria-checked={isSelected}
                        style={{
                            '--difficulty-color': DIFFICULTY_COLORS[option.id],
                        } as React.CSSProperties}
                    >
                        <span className="level-difficulty-label">{option.label}</span>
                        {beatCount !== undefined && (
                            <span className="level-difficulty-count">{beatCount}</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

interface CompactStatsCardProps {
    difficulty: DifficultyLevel;
    controllerMode: ControllerMode | undefined;
    totalBeats: number;
    detectedBeats: number;
    generatedBeats: number;
}

/**
 * Compact stats card showing key numbers.
 */
function CompactStatsCard({
    difficulty,
    controllerMode,
    totalBeats,
    detectedBeats,
    generatedBeats,
}: CompactStatsCardProps) {
    return (
        <div className="level-compact-stats">
            <div className="level-stat-item">
                <span
                    className="level-stat-value level-stat-difficulty"
                    style={{ color: DIFFICULTY_COLORS[difficulty] }}
                >
                    {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                </span>
                <span className="level-stat-label">Difficulty</span>
            </div>
            <div className="level-stat-divider" />
            <div className="level-stat-item">
                <span className="level-stat-value level-stat-mode">
                    <Gamepad2 size={14} />
                    {formatControllerMode(controllerMode)}
                </span>
                <span className="level-stat-label">Mode</span>
            </div>
            <div className="level-stat-divider" />
            <div className="level-stat-item">
                <span className="level-stat-value level-stat-beats">
                    <Music size={14} />
                    {totalBeats.toLocaleString()}
                </span>
                <span className="level-stat-label">Beats</span>
            </div>
            <div className="level-stat-divider" />
            <div className="level-stat-item">
                <span className="level-stat-value level-stat-detected">
                    <Layers size={14} />
                    {detectedBeats}
                </span>
                <span className="level-stat-label">Detected</span>
            </div>
            <div className="level-stat-divider" />
            <div className="level-stat-item">
                <span className="level-stat-value level-stat-generated">
                    {generatedBeats}
                </span>
                <span className="level-stat-label">Generated</span>
            </div>
        </div>
    );
}

interface LevelPreviewPlaceholderProps {
    totalBeats: number;
    difficulty: DifficultyLevel;
}

/**
 * Placeholder for the ChartedBeatMapPreview (Task 7.2).
 * Shows a brief preview of the level data.
 */
function LevelPreviewPlaceholder({ totalBeats, difficulty }: LevelPreviewPlaceholderProps) {
    return (
        <div className="level-preview-placeholder">
            <div className="level-preview-header">
                <h4 className="level-preview-title">Charted Beat Map</h4>
                <span className="level-preview-badge">Task 7.2</span>
            </div>
            <div className="level-preview-content">
                <div className="level-preview-info">
                    <p className="level-preview-text">
                        <strong>{totalBeats.toLocaleString()}</strong> beats ready for{' '}
                        <span style={{ color: DIFFICULTY_COLORS[difficulty] }}>
                            {difficulty}
                        </span> difficulty.
                    </p>
                    <p className="level-preview-hint">
                        Full timeline visualization coming in Task 7.2 (ChartedBeatMapPreview)
                    </p>
                </div>
                <div className="level-preview-visual">
                    {/* Simple visual representation of beats */}
                    <div className="level-preview-beats">
                        {Array.from({ length: Math.min(20, totalBeats) }, (_, i) => (
                            <div
                                key={i}
                                className="level-preview-beat"
                                style={{
                                    backgroundColor: DIFFICULTY_COLORS[difficulty],
                                    opacity: 0.3 + (Math.random() * 0.7),
                                }}
                            />
                        ))}
                        {totalBeats > 20 && (
                            <span className="level-preview-more">+{totalBeats - 20} more</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================================
// Main Component
// ============================================================

export function LevelGenerationPanel({ className }: LevelGenerationPanelProps) {
    // Get data from store
    const allDifficulties = useAllDifficultyLevels() as AllDifficultiesWithNatural | null;
    const selectedDifficulty = useSelectedDifficulty();
    const actions = useBeatDetectionActions();

    // Calculate beat counts for each difficulty
    const beatCounts = useMemo((): Record<DifficultyLevel, number> => {
        return {
            natural: allDifficulties?.natural?.chart?.beats?.length ?? 0,
            easy: allDifficulties?.easy?.chart?.beats?.length ?? 0,
            medium: allDifficulties?.medium?.chart?.beats?.length ?? 0,
            hard: allDifficulties?.hard?.chart?.beats?.length ?? 0,
        };
    }, [allDifficulties]);

    // Get the currently selected level
    const currentLevel = useMemo(() => {
        return getLevelForDifficulty(allDifficulties, selectedDifficulty);
    }, [allDifficulties, selectedDifficulty]);

    // Handle difficulty change
    const handleDifficultyChange = useCallback((difficulty: DifficultyLevel) => {
        actions.setSelectedDifficulty(difficulty);
    }, [actions]);

    // Don't render if no levels generated
    if (!allDifficulties) {
        return (
            <div className={cn('level-generation-panel', 'level-generation-panel--empty', className)}>
                <div className="level-panel-empty-content">
                    <Gamepad2 size={32} className="level-panel-empty-icon" />
                    <h4 className="level-panel-empty-title">No Level Generated</h4>
                    <p className="level-panel-empty-text">
                        Complete rhythm generation to create a playable level.
                    </p>
                </div>
            </div>
        );
    }

    // Get metadata from current level
    const metadata = currentLevel?.metadata;
    const controllerMode = metadata?.controllerMode;
    const chartMetadata = metadata?.chartMetadata;
    const totalBeats = chartMetadata?.totalBeats ?? currentLevel?.chart?.beats?.length ?? 0;
    const detectedBeats = chartMetadata?.detectedBeats ?? 0;
    const generatedBeats = chartMetadata?.generatedBeats ?? 0;

    return (
        <div className={cn('level-generation-panel', className)}>
            {/* Header */}
            <div className="level-panel-header">
                <Gamepad2 size={20} className="level-panel-icon" />
                <h3 className="level-panel-title">Final Level</h3>
            </div>

            {/* Difficulty Switcher */}
            <DifficultySwitcher
                selected={selectedDifficulty}
                onChange={handleDifficultyChange}
                beatCounts={beatCounts}
            />

            {/* Compact Stats Card */}
            <CompactStatsCard
                difficulty={selectedDifficulty}
                controllerMode={controllerMode}
                totalBeats={totalBeats}
                detectedBeats={detectedBeats}
                generatedBeats={generatedBeats}
            />

            {/* Level Preview (Task 7.2 placeholder) */}
            <LevelPreviewPlaceholder
                totalBeats={totalBeats}
                difficulty={selectedDifficulty}
            />

            {/* Action Button */}
            <div className="level-panel-actions">
                <button className="level-practice-btn" type="button">
                    Go to Practice
                    <span className="level-practice-arrow">→</span>
                </button>
            </div>
        </div>
    );
}

export default LevelGenerationPanel;
