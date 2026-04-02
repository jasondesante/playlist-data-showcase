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
 * - Downbeat configuration with timeline for beat selection
 * - Regenerate Levels button when downbeat/time signature changes
 * - Start Practice button
 *
 * Task 8.1: Update ReadyTab for Auto Mode
 */

import { useMemo, useCallback, useEffect, useState } from 'react';
import { Play, Gamepad2, Music, Activity, RefreshCw, Pause } from 'lucide-react';
import './AutoReadyPanel.css';
import { Card } from './Card';
import { Button } from './Button';
import { DifficultySwitcher, getDifficultyColor, getDifficultyLabel } from './DifficultySwitcher';
import { ChartedBeatMapPreview } from './ChartedBeatMapPreview';
import { DownbeatConfigPanel } from './DownbeatConfigPanel';
import { BeatTimeline } from './BeatTimeline';
import {
    useAllDifficultyLevels,
    useSelectedDifficulty,
    useBeatDetectionActions,
    useBeatDetectionStore,
    useIsDownbeatSelectionMode,
    useTimeSignature,
    useShowMeasureBoundaries,
    useInterpolationVisualizationData,
    useShowGridOverlay,
    useShowTempoDriftVisualization,
    useBeatMap,
    useDownbeatConfig,
    useUnifiedBeatMap,
} from '../../store/beatDetectionStore';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';
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
    /** Callback to regenerate levels after downbeat/time signature change */
    onRegenerate?: () => void;
    /** Whether level regeneration is in progress */
    isRegenerating?: boolean;
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

export function AutoReadyPanel({ onStartPractice, onRegenerate, isRegenerating, className }: AutoReadyPanelProps) {
    const allDifficulties = useAllDifficultyLevels();
    const selectedDifficulty = useSelectedDifficulty();
    const actions = useBeatDetectionActions();
    const beatMap = useBeatMap();
    const downbeatConfig = useDownbeatConfig();
    const unifiedBeatMap = useUnifiedBeatMap();
    const quarterNoteTimestamps = useMemo(
        () => unifiedBeatMap?.beats.map((b) => b.timestamp) ?? undefined,
        [unifiedBeatMap]
    );
    const isDownbeatSelectionMode = useIsDownbeatSelectionMode();
    const timeSignature = useTimeSignature();
    const showMeasureBoundaries = useShowMeasureBoundaries();
    const interpolationData = useInterpolationVisualizationData();
    const showGridOverlay = useShowGridOverlay();
    const showTempoDriftVisualization = useShowTempoDriftVisualization();

    // Audio player state for preview timeline sync
    const { playbackState, currentTime: audioTime, pause, resume, seek } = useAudioPlayerStore();
    const isAudioPlaying = playbackState === 'playing';

    // Preview timeline state
    const [manualPreviewTime, setManualPreviewTime] = useState(0);
    const previewTime = isAudioPlaying ? audioTime : manualPreviewTime;

    // Track whether downbeat config has changed since levels were last generated
    const [isStale, setIsStale] = useState(false);

    // Use a zustand subscription to reliably detect downbeatConfig changes,
    // regardless of how applyDownbeatConfig updates the store.
    useEffect(() => {
        const unsubscribe = useBeatDetectionStore.subscribe(
            (state, prevState) => {
                if (state.downbeatConfig !== prevState.downbeatConfig) {
                    setIsStale(true);
                }
            }
        );
        return unsubscribe;
    }, []);

    // Sync manual preview time to audio position when playback pauses
    useEffect(() => {
        if (!isAudioPlaying && audioTime > 0) {
            setManualPreviewTime(audioTime);
        }
    }, [isAudioPlaying, audioTime]);

    // Reset manual preview time when exiting selection mode
    useEffect(() => {
        if (!isDownbeatSelectionMode) {
            setManualPreviewTime(0);
        }
    }, [isDownbeatSelectionMode]);

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

    // Handle regenerate click — mark as no longer stale once regeneration starts
    const handleRegenerate = useCallback(() => {
        setIsStale(false);
        onRegenerate?.();
    }, [onRegenerate]);

    // Handle seek in preview timeline
    const handlePreviewSeek = useCallback((time: number) => {
        setManualPreviewTime(time);
        seek(time);
    }, [seek]);

    // Handle play/pause for the preview timeline
    const handlePlayPause = useCallback(() => {
        if (isAudioPlaying) {
            pause();
        } else {
            resume();
        }
    }, [isAudioPlaying, pause, resume]);

    // Handle beat click for downbeat selection
    const handleBeatClick = useCallback((beatIndex: number) => {
        if (!isDownbeatSelectionMode) return;
        useBeatDetectionStore.getState().actions.setDownbeatPosition(beatIndex, timeSignature);
    }, [isDownbeatSelectionMode, timeSignature]);

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

            {/* Downbeat Configuration */}
            <DownbeatConfigPanel disabled={!hasLevel} />

            {/* Regenerate Levels prompt when downbeat/time signature changed */}
            {isStale && onRegenerate && (
                <div className="auto-ready-regenerate">
                    <Button
                        variant="outline"
                        size="sm"
                        leftIcon={RefreshCw}
                        onClick={handleRegenerate}
                        disabled={isRegenerating}
                        isLoading={isRegenerating}
                        className="auto-ready-regenerate-btn"
                    >
                        Regenerate Levels
                    </Button>
                    <span className="auto-ready-regenerate-hint">
                        Downbeat or time signature changed — regenerate to update levels
                    </span>
                </div>
            )}

            {/* Beat Timeline for downbeat selection (matches manual mode behavior) */}
            {isDownbeatSelectionMode && beatMap && (
                <div className="auto-ready-timeline">
                    <div className="auto-ready-timeline-header">
                        <span className="auto-ready-timeline-label">
                            Drag to navigate, click a beat marker to set as downbeat:
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePlayPause}
                            leftIcon={isAudioPlaying ? Pause : Play}
                            className="auto-ready-timeline-play-btn"
                        >
                            {isAudioPlaying ? 'Pause' : 'Play'}
                        </Button>
                    </div>
                    <BeatTimeline
                        beatMap={beatMap}
                        currentTime={previewTime}
                        anticipationWindow={5}
                        pastWindow={10}
                        isPlaying={isAudioPlaying}
                        interpolationData={interpolationData}
                        showGridOverlay={showGridOverlay}
                        showTempoDriftVisualization={showTempoDriftVisualization}
                        enableBeatSelection={isDownbeatSelectionMode}
                        onBeatClick={handleBeatClick}
                        onSeek={handlePreviewSeek}
                        showMeasureBoundaries={showMeasureBoundaries}
                    />
                </div>
            )}

            {/* Chart Preview */}
            <div className="auto-ready-chart-section">
                <h4 className="auto-ready-section-title">Chart Preview</h4>
                <ChartedBeatMapPreview
                    chart={selectedLevel?.chart || null}
                    controllerMode={controllerMode}
                    height={140}
                    showBeatIndices={true}
                    downbeatConfigOverride={downbeatConfig}
                    quarterNoteTimestamps={quarterNoteTimestamps}
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
