/**
 * ButtonMappingPanel Component
 *
 * Container component for displaying button mapping results as part of
 * the Pitch & Level Generation feature (Phase 6).
 *
 * Features:
 * - Controller mode display (DDR vs Guitar Hero)
 * - Summary stats: total beats mapped, pitch-influenced vs pattern-influenced counts
 * - Unique keys used display
 * - Primary visualization: ButtonTimeline (horizontal, synced with audio)
 *
 * Task 6.1: Create ButtonMappingPanel Component
 */

import { useMemo } from 'react';
import { Gamepad2 } from 'lucide-react';
import './ButtonMappingPanel.css';
import { cn } from '../../utils/cn';
import {
    useAllDifficultyLevels,
    useCustomDensityLevel,
    useAutoSubMode,
} from '../../store/beatDetectionStore';
import {
    useSelectedDifficulty,
} from '../../hooks/useLevelGeneration';
import type {
    AllDifficultiesWithNatural,
} from '../../types/levelGeneration';
import type { GeneratedLevel, ControllerMode } from 'playlist-data-engine';
import DDRModeVisualization, { type DDRVisualizationBeat } from './DDRModeVisualization';
import GuitarHeroModeVisualization, { type GuitarHeroVisualizationBeat } from './GuitarHeroModeVisualization';
import ButtonDistributionChart from './ButtonDistributionChart';
import MappingInfluenceBreakdown from './MappingInfluenceBreakdown';
import PatternLibraryUsage from './PatternLibraryUsage';

// ============================================================
// Types
// ============================================================

export interface ButtonMappingPanelProps {
    /** Additional CSS class names */
    className?: string;
    /** Pitch influence weight setting from Step 1 (0-1) */
    pitchInfluenceWeight?: number;
    /** Voicing threshold setting from Step 1 (0-1) */
    voicingThreshold?: number;
}

/** Internal beat type for visualization components */
interface InternalBeat {
    timestamp: number;
    beatIndex: number;
    key: string;
    isPitchInfluenced?: boolean;
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Get the button mapping data from the generated level.
 */
function getButtonMappingData(level: GeneratedLevel | undefined | null): {
    controllerMode: ControllerMode;
    keysUsed: string[];
    pitchInfluencedBeats: number;
    patternInfluencedBeats: number;
    patternsUsed: string[];
    totalBeats: number;
    buttonDistribution: Map<string, number>;
    buttonBeats: InternalBeat[];
    patternApplicationCounts: Map<string, number>;
    patternBeatCounts: Map<string, number>;
} | null {
    if (!level?.metadata?.buttonMetadata) {
        return null;
    }

    const buttonMeta = level.metadata.buttonMetadata;
    const chartMeta = level.metadata.chartMetadata;

    // Calculate pattern-influenced beats (total - pitch-influenced)
    const totalBeats = chartMeta?.totalBeats ?? level.chart?.beats?.length ?? 0;
    const pitchInfluencedBeats = buttonMeta.pitchInfluencedBeats ?? 0;
    const patternInfluencedBeats = totalBeats - pitchInfluencedBeats;

    // Calculate button distribution from chart beats
    const buttonDistribution = new Map<string, number>();
    const buttonBeats: InternalBeat[] = [];
    const patternApplicationCounts = new Map<string, number>();
    const patternBeatCounts = new Map<string, number>();

    if (level.chart?.beats) {
        const beats = level.chart.beats as any[];
        beats.forEach((beat: any, index: number) => {
            if (beat.requiredKey) {
                buttonDistribution.set(beat.requiredKey, (buttonDistribution.get(beat.requiredKey) ?? 0) + 1);

                // Count pattern applications: only count when this beat starts a new
                // pattern (i.e. previous beat has a different or no patternId)
                if (beat.patternId) {
                    // Count beats per pattern (every beat with a patternId)
                    patternBeatCounts.set(
                        beat.patternId,
                        (patternBeatCounts.get(beat.patternId) ?? 0) + 1
                    );

                    const prevBeat = index > 0 ? beats[index - 1] : null;
                    const prevPatternId = prevBeat?.patternId ?? null;
                    if (beat.patternId !== prevPatternId) {
                        patternApplicationCounts.set(
                            beat.patternId,
                            (patternApplicationCounts.get(beat.patternId) ?? 0) + 1
                        );
                    }
                }

                // Create InternalBeat for visualizations
                buttonBeats.push({
                    timestamp: beat.timestamp,
                    beatIndex: beat.beatIndex ?? index,
                    key: beat.requiredKey,
                    isPitchInfluenced: beat.isPitchInfluenced ?? undefined,
                });
            }
        });
    }

    return {
        controllerMode: level.metadata.controllerMode ?? 'ddr',
        keysUsed: buttonMeta.keysUsed ?? [],
        pitchInfluencedBeats,
        patternInfluencedBeats,
        patternsUsed: buttonMeta.patternsUsed ?? [],
        totalBeats,
        buttonDistribution,
        buttonBeats,
        patternApplicationCounts,
        patternBeatCounts,
    };
}

/**
 * Format controller mode for display.
 */
function formatControllerMode(mode: ControllerMode): string {
    return mode === 'ddr' ? 'DDR (4-Panel)' : mode === 'guitar_hero' ? 'Guitar Hero (5-Fret)' : 'Tap';
}

// ============================================================
// Sub-components
// ============================================================

interface SummaryStatsProps {
    controllerMode: ControllerMode;
    totalBeats: number;
    pitchInfluencedBeats: number;
    patternInfluencedBeats: number;
    keysUsed: string[];
}

function SummaryStats({
    controllerMode,
    totalBeats,
    pitchInfluencedBeats,
    patternInfluencedBeats,
    keysUsed,
}: SummaryStatsProps) {
    const pitchPercent = totalBeats > 0 ? Math.round((pitchInfluencedBeats / totalBeats) * 100) : 0;
    const patternPercent = totalBeats > 0 ? Math.round((patternInfluencedBeats / totalBeats) * 100) : 0;

    return (
        <div className="button-summary-stats">
            <div className="button-summary-item button-summary-mode">
                <span className="button-summary-value">
                    {controllerMode === 'ddr' ? 'DDR' : 'Guitar Hero'}
                </span>
                <span className="button-summary-label">Mode</span>
            </div>
            <div className="button-summary-item">
                <span className="button-summary-value">{totalBeats}</span>
                <span className="button-summary-label">Total Beats</span>
            </div>
            <div className="button-summary-item button-summary-pitch">
                <span className="button-summary-value">{pitchPercent}%</span>
                <span className="button-summary-label">Pitch ({pitchInfluencedBeats})</span>
            </div>
            <div className="button-summary-item button-summary-pattern">
                <span className="button-summary-value">{patternPercent}%</span>
                <span className="button-summary-label">Pattern ({patternInfluencedBeats})</span>
            </div>
            <div className="button-summary-item button-summary-keys">
                <span className="button-summary-value">{keysUsed.length}</span>
                <span className="button-summary-label">Keys Used</span>
            </div>
        </div>
    );
}

// ============================================================
// Main Component
// ============================================================

export function ButtonMappingPanel({ className, pitchInfluenceWeight, voicingThreshold }: ButtonMappingPanelProps) {
    // Get data from store
    const allDifficulties = useAllDifficultyLevels();
    const customDensityLevel = useCustomDensityLevel();
    const autoSubMode = useAutoSubMode();
    const selectedDifficulty = useSelectedDifficulty();
    const isDensityMode = autoSubMode === 'customDensity';

    // Get button mapping data from the active level (preset or density)
    const mappingData = useMemo(() => {
        if (isDensityMode) return getButtonMappingData(customDensityLevel);
        const levels = allDifficulties as AllDifficultiesWithNatural | null;
        const level = levels?.[selectedDifficulty as keyof AllDifficultiesWithNatural] as GeneratedLevel | undefined;
        return getButtonMappingData(level);
    }, [isDensityMode, customDensityLevel, allDifficulties, selectedDifficulty]);

    // Don't render if no button mapping data available
    if (!mappingData) {
        return (
            <div className={cn('button-mapping-panel', 'button-mapping-panel-empty', className)}>
                <div className="button-panel-header">
                    <Gamepad2 size={20} className="button-panel-icon" />
                    <h3 className="button-panel-title">Button Mapping</h3>
                </div>
                <div className="button-panel-empty-content">
                    <p>No button mapping data available.</p>
                    <p className="button-panel-empty-hint">
                        Button mapping runs automatically during level generation.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={cn('button-mapping-panel', className)}>
            {/* Header */}
            <div className="button-panel-header">
                <Gamepad2 size={20} className="button-panel-icon" />
                <h3 className="button-panel-title">Button Mapping</h3>
                <span className={cn(
                    'button-mode-badge',
                    mappingData.controllerMode === 'ddr' ? 'button-mode-ddr' : mappingData.controllerMode === 'guitar_hero' ? 'button-mode-guitar' : 'button-mode-tap'
                )}>
                    {formatControllerMode(mappingData.controllerMode)}
                </span>
            </div>

            {/* Summary Stats */}
            <SummaryStats
                controllerMode={mappingData.controllerMode}
                totalBeats={mappingData.totalBeats}
                pitchInfluencedBeats={mappingData.pitchInfluencedBeats}
                patternInfluencedBeats={mappingData.patternInfluencedBeats}
                keysUsed={mappingData.keysUsed}
            />

            {/* Influence Breakdown - Task 6.6 */}
            <MappingInfluenceBreakdown
                pitchInfluencedBeats={mappingData.pitchInfluencedBeats}
                patternInfluencedBeats={mappingData.patternInfluencedBeats}
                totalBeats={mappingData.totalBeats}
                pitchInfluenceWeight={pitchInfluenceWeight}
                voicingThreshold={voicingThreshold}
                size={150}
            />

            {/* Button Distribution - Task 6.5 */}
            <ButtonDistributionChart
                controllerMode={mappingData.controllerMode}
                distribution={mappingData.buttonDistribution}
                totalBeats={mappingData.totalBeats}
                showHeader={true}
                layout="horizontal"
            />

            {/* Pattern Library Usage - Task 6.7 */}
            {mappingData.patternsUsed.length > 0 && (
                <PatternLibraryUsage
                    patternsUsed={mappingData.patternsUsed}
                    controllerMode={mappingData.controllerMode}
                    maxVisible={6}
                    patternApplicationCounts={mappingData.patternApplicationCounts}
                    patternBeatCounts={mappingData.patternBeatCounts}
                />
            )}

            {/* Secondary Visualization - Task 6.3 & 6.4 */}
            <div className="button-secondary-section">
                {mappingData.controllerMode === 'ddr' ? (
                    <DDRModeVisualization
                        beats={mappingData.buttonBeats.map((beat): DDRVisualizationBeat => ({
                            timestamp: beat.timestamp,
                            beatIndex: beat.beatIndex,
                            key: beat.key as 'up' | 'down' | 'left' | 'right',
                            isPitchInfluenced: beat.isPitchInfluenced,
                        }))}
                    />
                ) : (
                    <GuitarHeroModeVisualization
                        beats={mappingData.buttonBeats.map((beat): GuitarHeroVisualizationBeat => ({
                            timestamp: beat.timestamp,
                            beatIndex: beat.beatIndex,
                            key: beat.key as '1' | '2' | '3' | '4' | '5',
                            isPitchInfluenced: beat.isPitchInfluenced,
                        }))}
                    />
                )}
            </div>
        </div>
    );
}

export default ButtonMappingPanel;
