/**
 * AutoReadyPanel Component
 *
 * The Ready step content for automatic mode when levels have been generated.
 * Shows a difficulty switcher, chart preview, and practice button.
 *
 * Features:
 * - Difficulty switcher (Natural | Easy | Medium | Hard)
 * - ChartedBeatMapPreview showing the selected difficulty's chart
 * - Level metadata summary
 * - Start Practice button
 *
 * Task 8.1: Update ReadyTab for Auto Mode
 */

import { useMemo, useCallback } from 'react';
import { Play, Gamepad2, Music, Activity } from 'lucide-react';
import './AutoReadyPanel.css';
import { Card } from './Card';
import { Button } from './Button';
import { DifficultySwitcher, getDifficultyColor, getDifficultyLabel } from './DifficultySwitcher';
import { ChartedBeatMapPreview } from './ChartedBeatMapPreview';
import {
    useAllDifficultyLevels,
    useSelectedDifficulty,
    useBeatDetectionActions,
} from '../../store/beatDetectionStore';
import type { DifficultyLevel } from '../../types/levelGeneration';
import type { GeneratedLevel, ControllerMode } from 'playlist-data-engine';
import { cn } from '../../utils/cn';
import { logger } from '../../utils/logger';

// ============================================================
// Types
// ============================================================

export interface AutoReadyPanelProps {
    /** Callback when user clicks Start Practice */
    onStartPractice: () => void;
    /** Additional CSS class names */
    className?: string;
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Get the controller mode from the generated level metadata
 */
function getControllerMode(level: GeneratedLevel | null): ControllerMode {
    return level?.metadata?.controllerMode || 'ddr';
}

/**
 * Get beat counts for all difficulties
 */
function getBeatCounts(
    allDifficulties: { easy?: GeneratedLevel; medium?: GeneratedLevel; hard?: GeneratedLevel; natural?: GeneratedLevel } | null
): Record<DifficultyLevel, number> {
    return {
        natural: allDifficulties?.natural?.chart?.beats?.length || 0,
        easy: allDifficulties?.easy?.chart?.beats?.length || 0,
        medium: allDifficulties?.medium?.chart?.beats?.length || 0,
        hard: allDifficulties?.hard?.chart?.beats?.length || 0,
    };
}

// ============================================================
// Sub-components
// ============================================================

/**
 * Level metadata summary card
 */
interface LevelSummaryCardProps {
    level: GeneratedLevel | null;
    difficulty: DifficultyLevel;
}

function LevelSummaryCard({ level, difficulty }: LevelSummaryCardProps) {
    const metadata = level?.metadata;
    const chart = level?.chart;

    const stats = useMemo(() => {
        if (!chart || !metadata) return null;

        return {
            totalBeats: chart.beats.length,
            controllerMode: metadata.controllerMode || 'ddr',
            bpm: chart.bpm || 120,
        };
    }, [chart, metadata]);

    if (!stats) {
        return (
            <div className="auto-ready-summary auto-ready-summary--empty">
                <p>No level data available</p>
            </div>
        );
    }

    return (
        <div className="auto-ready-summary">
            <div className="auto-ready-summary-header">
                <div
                    className="auto-ready-summary-difficulty"
                    style={{ backgroundColor: getDifficultyColor(difficulty) }}
                >
                    {getDifficultyLabel(difficulty)}
                </div>
                <div className="auto-ready-summary-mode">
                    <Gamepad2 size={14} />
                    {stats.controllerMode === 'ddr' ? 'DDR Mode' : 'Guitar Hero Mode'}
                </div>
            </div>
            <div className="auto-ready-summary-stats">
                <div className="auto-ready-stat">
                    <span className="auto-ready-stat-value">{stats.totalBeats}</span>
                    <span className="auto-ready-stat-label">Total Beats</span>
                </div>
                <div className="auto-ready-stat">
                    <span className="auto-ready-stat-value">{stats.bpm.toFixed(1)}</span>
                    <span className="auto-ready-stat-label">BPM</span>
                </div>
            </div>
        </div>
    );
}

// ============================================================
// Main Component
// ============================================================

export function AutoReadyPanel({ onStartPractice, className }: AutoReadyPanelProps) {
    const allDifficulties = useAllDifficultyLevels();
    const selectedDifficulty = useSelectedDifficulty();
    const actions = useBeatDetectionActions();

    // Get the currently selected level
    const selectedLevel = useMemo((): GeneratedLevel | null => {
        if (!allDifficulties) return null;
        return allDifficulties[selectedDifficulty] || null;
    }, [allDifficulties, selectedDifficulty]);

    // Get beat counts for the difficulty switcher
    const beatCounts = useMemo(() => getBeatCounts(allDifficulties), [allDifficulties]);

    // Get controller mode for the chart preview
    const controllerMode = useMemo(() => getControllerMode(selectedLevel), [selectedLevel]);

    // Handle difficulty change
    const handleDifficultyChange = useCallback((difficulty: DifficultyLevel) => {
        logger.info('BeatDetection', 'Changing difficulty', { difficulty });
        actions.setSelectedDifficulty(difficulty);
    }, [actions]);

    // Handle start practice
    const handleStartPractice = useCallback(() => {
        logger.info('BeatDetection', 'Starting practice mode', {
            difficulty: selectedDifficulty,
            totalBeats: selectedLevel?.chart?.beats?.length,
        });
        onStartPractice();
    }, [onStartPractice, selectedDifficulty, selectedLevel]);

    // Check if we have valid data
    const hasLevel = selectedLevel?.chart?.beats && selectedLevel.chart.beats.length > 0;

    if (!allDifficulties) {
        return (
            <Card variant="elevated" padding="lg" className={cn('auto-ready-panel', 'auto-ready-panel--empty', className)}>
                <div className="auto-ready-placeholder">
                    <div className="auto-ready-placeholder-icon">
                        <Activity size={32} />
                    </div>
                    <h4 className="auto-ready-placeholder-title">No Generated Level</h4>
                    <p className="auto-ready-placeholder-text">
                        Complete Steps 1-3 to generate levels before practicing.
                    </p>
                </div>
            </Card>
        );
    }

    return (
        <Card variant="elevated" padding="lg" className={cn('auto-ready-panel', className)}>
            {/* Header */}
            <div className="auto-ready-header">
                <h3 className="auto-ready-title">
                    <Music size={20} />
                    Ready to Practice
                </h3>
                <p className="auto-ready-subtitle">
                    Select a difficulty level and start practicing
                </p>
            </div>

            {/* Difficulty Switcher */}
            <div className="auto-ready-difficulty-section">
                <DifficultySwitcher
                    selected={selectedDifficulty}
                    onChange={handleDifficultyChange}
                    beatCounts={beatCounts}
                    showCounts={true}
                />
            </div>

            {/* Level Summary */}
            <LevelSummaryCard level={selectedLevel} difficulty={selectedDifficulty} />

            {/* Chart Preview */}
            <div className="auto-ready-chart-section">
                <h4 className="auto-ready-section-title">Chart Preview</h4>
                <ChartedBeatMapPreview
                    chart={selectedLevel?.chart || null}
                    controllerMode={controllerMode}
                    height={140}
                    showBeatIndices={true}
                />
            </div>

            {/* Start Practice Button */}
            <div className="auto-ready-actions">
                <Button
                    variant="primary"
                    size="lg"
                    onClick={handleStartPractice}
                    disabled={!hasLevel}
                    className="auto-ready-start-btn"
                >
                    <Play size={18} />
                    Start Practice
                </Button>
            </div>
        </Card>
    );
}

export default AutoReadyPanel;
