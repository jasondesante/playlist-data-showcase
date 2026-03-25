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
import { Gamepad2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Music } from 'lucide-react';
import './ButtonMappingPanel.css';
import { cn } from '../../utils/cn';
import {
    useAllDifficultyLevels,
} from '../../store/beatDetectionStore';
import {
    useSelectedDifficulty,
} from '../../hooks/useLevelGeneration';
import type {
    AllDifficultiesWithNatural,
} from '../../types/levelGeneration';
import type { GeneratedLevel, ControllerMode } from 'playlist-data-engine';

// ============================================================
// Types
// ============================================================

export interface ButtonMappingPanelProps {
    /** Additional CSS class names */
    className?: string;
}

/** DDR button configuration for display */
interface DDRButtonConfig {
    name: string;
    label: string;
    icon: React.ReactNode;
    color: string;
}

/** Guitar Hero button configuration for display */
interface GuitarHeroButtonConfig {
    name: string;
    label: string;
    color: string;
}

// ============================================================
// Constants
// ============================================================

const DDR_BUTTON_CONFIGS: DDRButtonConfig[] = [
    { name: 'up', label: 'Up', icon: <ArrowUp size={14} />, color: 'yellow' },
    { name: 'down', label: 'Down', icon: <ArrowDown size={14} />, color: 'blue' },
    { name: 'left', label: 'Left', icon: <ArrowLeft size={14} />, color: 'purple' },
    { name: 'right', label: 'Right', icon: <ArrowRight size={14} />, color: 'green' },
];

const GUITAR_HERO_BUTTON_CONFIGS: GuitarHeroButtonConfig[] = [
    { name: '1', label: 'Fret 1', color: 'red' },
    { name: '2', label: 'Fret 2', color: 'orange' },
    { name: '3', label: 'Fret 3', color: 'yellow' },
    { name: '4', label: 'Fret 4', color: 'green' },
    { name: '5', label: 'Fret 5', color: 'blue' },
];

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
    if (level.chart?.beats) {
        level.chart.beats.forEach((beat: any) => {
            if (beat.key) {
                buttonDistribution.set(beat.key, (buttonDistribution.get(beat.key) ?? 0) + 1);
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
    };
}

/**
 * Format controller mode for display.
 */
function formatControllerMode(mode: ControllerMode): string {
    return mode === 'ddr' ? 'DDR (4-Panel)' : 'Guitar Hero (5-Fret)';
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

interface ButtonDistributionProps {
    controllerMode: ControllerMode;
    buttonDistribution: Map<string, number>;
    totalBeats: number;
}

function ButtonDistribution({ controllerMode, buttonDistribution, totalBeats }: ButtonDistributionProps) {
    const isDDR = controllerMode === 'ddr';
    const configs = isDDR ? DDR_BUTTON_CONFIGS : GUITAR_HERO_BUTTON_CONFIGS;

    return (
        <div className="button-distribution">
            <h4 className="button-distribution-title">Button Distribution</h4>
            <div className="button-distribution-bars">
                {configs.map((config) => {
                    const count = buttonDistribution.get(config.name) ?? 0;
                    const percent = totalBeats > 0 ? Math.round((count / totalBeats) * 100) : 0;

                    return (
                        <div
                            key={config.name}
                            className={cn(
                                'button-distribution-bar',
                                `button-distribution-${config.color}`
                            )}
                        >
                            <div className="button-distribution-header">
                                {isDDR ? (
                                    <span className="button-distribution-icon">{(config as DDRButtonConfig).icon}</span>
                                ) : (
                                    <span className="button-distribution-fret">{config.name}</span>
                                )}
                                <span className="button-distribution-label">{config.label}</span>
                            </div>
                            <div className="button-distribution-track">
                                <div
                                    className="button-distribution-fill"
                                    style={{ width: `${percent}%` }}
                                />
                            </div>
                            <div className="button-distribution-stats">
                                <span className="button-distribution-count">{count}</span>
                                <span className="button-distribution-percent">{percent}%</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

interface InfluenceBreakdownProps {
    pitchInfluencedBeats: number;
    patternInfluencedBeats: number;
    totalBeats: number;
}

function InfluenceBreakdown({ pitchInfluencedBeats, patternInfluencedBeats, totalBeats }: InfluenceBreakdownProps) {
    const pitchPercent = totalBeats > 0 ? (pitchInfluencedBeats / totalBeats) * 100 : 0;
    const patternPercent = totalBeats > 0 ? (patternInfluencedBeats / totalBeats) * 100 : 0;

    return (
        <div className="button-influence-breakdown">
            <h4 className="button-influence-title">Mapping Influence</h4>
            <div className="button-influence-bar">
                <div
                    className="button-influence-pitch"
                    style={{ width: `${pitchPercent}%` }}
                    title={`Pitch influenced: ${pitchInfluencedBeats} beats`}
                />
                <div
                    className="button-influence-pattern"
                    style={{ width: `${patternPercent}%` }}
                    title={`Pattern influenced: ${patternInfluencedBeats} beats`}
                />
            </div>
            <div className="button-influence-legend">
                <div className="button-influence-legend-item">
                    <span className="button-influence-legend-color button-influence-legend-pitch" />
                    <span className="button-influence-legend-label">
                        Pitch ({pitchInfluencedBeats})
                    </span>
                </div>
                <div className="button-influence-legend-item">
                    <span className="button-influence-legend-color button-influence-legend-pattern" />
                    <span className="button-influence-legend-label">
                        Pattern ({patternInfluencedBeats})
                    </span>
                </div>
            </div>
        </div>
    );
}

interface PatternsUsedProps {
    patternsUsed: string[];
}

function PatternsUsed({ patternsUsed }: PatternsUsedProps) {
    if (patternsUsed.length === 0) {
        return null;
    }

    return (
        <div className="button-patterns-used">
            <h4 className="button-patterns-title">Patterns Used</h4>
            <div className="button-patterns-list">
                {patternsUsed.slice(0, 10).map((pattern) => (
                    <span key={pattern} className="button-pattern-tag">
                        {pattern}
                    </span>
                ))}
                {patternsUsed.length > 10 && (
                    <span className="button-pattern-more">
                        +{patternsUsed.length - 10} more
                    </span>
                )}
            </div>
        </div>
    );
}

// ============================================================
// Main Component
// ============================================================

export function ButtonMappingPanel({ className }: ButtonMappingPanelProps) {
    // Get data from store
    const allDifficulties = useAllDifficultyLevels();
    const selectedDifficulty = useSelectedDifficulty();

    // Get button mapping data from the selected difficulty level
    const mappingData = useMemo(() => {
        const levels = allDifficulties as AllDifficultiesWithNatural | null;
        const level = levels?.[selectedDifficulty as keyof AllDifficultiesWithNatural] as GeneratedLevel | undefined;
        return getButtonMappingData(level);
    }, [allDifficulties, selectedDifficulty]);

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
                    mappingData.controllerMode === 'ddr' ? 'button-mode-ddr' : 'button-mode-guitar'
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

            {/* Influence Breakdown */}
            <InfluenceBreakdown
                pitchInfluencedBeats={mappingData.pitchInfluencedBeats}
                patternInfluencedBeats={mappingData.patternInfluencedBeats}
                totalBeats={mappingData.totalBeats}
            />

            {/* Button Distribution */}
            <ButtonDistribution
                controllerMode={mappingData.controllerMode}
                buttonDistribution={mappingData.buttonDistribution}
                totalBeats={mappingData.totalBeats}
            />

            {/* Patterns Used */}
            {mappingData.patternsUsed.length > 0 && (
                <PatternsUsed patternsUsed={mappingData.patternsUsed} />
            )}

            {/* Button Timeline - Task 6.2 (placeholder) */}
            <div className="button-timeline-section">
                <h4 className="button-timeline-title">Button Timeline</h4>
                <p className="button-timeline-description">
                    Horizontal timeline showing button assignments at each beat position.
                    Synced with audio playback.
                </p>
                <div className="button-timeline-placeholder">
                    <div className="button-timeline-placeholder-content">
                        <Music size={24} className="button-timeline-placeholder-icon" />
                        <p>ButtonTimeline visualization coming soon</p>
                        <span className="button-timeline-placeholder-task">Task 6.2</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ButtonMappingPanel;
