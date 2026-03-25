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
import { Gamepad2 } from 'lucide-react';
import './LevelGenerationPanel.css';
import { cn } from '../../utils/cn';
import {
    useAllDifficultyLevels,
    useBeatDetectionActions,
} from '../../store/beatDetectionStore';
import {
    useSelectedDifficulty,
} from '../../hooks/useLevelGeneration';
import { ChartedBeatMapPreview } from './ChartedBeatMapPreview';
import { LevelMetadataSummary } from './LevelMetadataSummary';
import { DifficultySwitcher } from './DifficultySwitcher';
import type {
    AllDifficultiesWithNatural,
    DifficultyLevel,
} from '../../types/levelGeneration';
import type { GeneratedLevel } from 'playlist-data-engine';

// ============================================================
// Types
// ============================================================

export interface LevelGenerationPanelProps {
    /** Additional CSS class names */
    className?: string;
}

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
    const chart = currentLevel?.chart;
    const totalBeats = chartMetadata?.totalBeats ?? chart?.beats?.length ?? 0;
    const bpm = chart?.bpm ?? 120;

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

            {/* Compact Metadata Summary (Task 7.3) */}
            <LevelMetadataSummary
                difficulty={selectedDifficulty}
                controllerMode={controllerMode}
                totalBeats={totalBeats}
                bpm={bpm}
            />

            {/* Chart Preview (Task 7.2) */}
            <ChartedBeatMapPreview
                chart={chart ?? null}
                controllerMode={controllerMode}
                height={120}
                showBeatIndices={true}
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
