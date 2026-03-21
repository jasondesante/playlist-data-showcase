/**
 * DifficultyVariantsPanel Component
 *
 * Container for side-by-side comparison of difficulty variants in the rhythm generation feature.
 * Displays:
 * - Three columns: Easy | Medium | Hard
 * - Highlighted "natural" difficulty with badge
 * - Stats for each variant (beat count, density, edit type)
 * - Visual beat timeline for each difficulty
 *
 * Part of Phase 7: Difficulty Variants Visualization (Task 7.1)
 */

import { useMemo, useState } from 'react';
import { Trophy, BarChart3, Edit3, CheckCircle } from 'lucide-react';
import './DifficultyVariantsPanel.css';
import { ZoomControls } from '../../ZoomControls';
import type {
    GeneratedRhythm,
    DifficultyVariant,
    DifficultyLevel,
    EditType,
} from '../../../../types/rhythmGeneration';

// Type alias for beats that can have extended grid types
type VariantBeat = GeneratedRhythm['difficultyVariants']['easy']['beats'][number];

// ============================================================
// Types
// ============================================================

export interface DifficultyVariantsPanelProps {
    /** The generated rhythm containing difficulty variants */
    rhythm: GeneratedRhythm;
    /** Current audio playback time in seconds (for timeline sync) */
    currentTime?: number;
    /** Total audio duration in seconds */
    duration?: number;
    /** Whether audio is currently playing */
    isPlaying?: boolean;
    /** Callback when user seeks to a time position */
    onSeek?: (time: number) => void;
    /** Additional CSS class names */
    className?: string;
}

/**
 * Difficulty color scheme
 */
const DIFFICULTY_COLORS: Record<DifficultyLevel, string> = {
    easy: '#22c55e',    // Green
    medium: '#f59e0b',  // Amber
    hard: '#ef4444',    // Red
};

/**
 * Edit type display labels
 */
const EDIT_TYPE_LABELS: Record<EditType, string> = {
    none: 'Unedited',
    simplified: 'Simplified',
    interpolated: 'Interpolated',
    pattern_inserted: 'Pattern Added',
};

/**
 * Grid type display names
 */
const GRID_TYPE_LABELS: Record<string, string> = {
    straight_16th: '16th',
    triplet_8th: 'Triplet',
    straight_8th: '8th',
    quarter_triplet: 'Q-Triplet',
};

// ============================================================
// Sub-components
// ============================================================

/**
 * Difficulty column header component
 */
interface DifficultyHeaderProps {
    difficulty: DifficultyLevel;
    isNatural: boolean;
    color: string;
}

function DifficultyHeader({ difficulty, isNatural, color }: DifficultyHeaderProps) {
    return (
        <div className="difficulty-variant-header" style={{ '--variant-color': color } as React.CSSProperties}>
            <div className="difficulty-variant-title-row">
                <span className="difficulty-variant-title">
                    {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                </span>
                {isNatural && (
                    <span className="difficulty-variant-natural-badge">
                        <CheckCircle size={12} />
                        <span>Natural</span>
                    </span>
                )}
            </div>
            <div className="difficulty-variant-indicator" style={{ backgroundColor: color }} />
        </div>
    );
}

/**
 * Stats card for a single difficulty variant
 */
interface VariantStatsProps {
    variant: DifficultyVariant;
    color: string;
}

function VariantStats({ variant, color }: VariantStatsProps) {
    // Calculate density (beats per second approximation from first and last beat)
    const density = useMemo(() => {
        if (variant.beats.length < 2) return 0;
        const timestamps = variant.beats.map(b => b.timestamp);
        const duration = Math.max(...timestamps) - Math.min(...timestamps);
        if (duration <= 0) return variant.beats.length;
        return variant.beats.length / duration;
    }, [variant.beats]);

    // Calculate grid type distribution
    const gridDistribution = useMemo(() => {
        const counts: Record<string, number> = {};
        variant.beats.forEach(beat => {
            const gridType = beat.gridType || 'straight_16th';
            counts[gridType] = (counts[gridType] || 0) + 1;
        });
        return counts;
    }, [variant.beats]);

    // Get primary grid type
    const primaryGridType = Object.entries(gridDistribution)
        .sort((a, b) => b[1] - a[1])[0];

    return (
        <div className="difficulty-variant-stats">
            <div className="difficulty-variant-stat">
                <span className="difficulty-variant-stat-label">Beats</span>
                <span className="difficulty-variant-stat-value" style={{ color }}>
                    {variant.beats.length}
                </span>
            </div>
            <div className="difficulty-variant-stat">
                <span className="difficulty-variant-stat-label">Density</span>
                <span className="difficulty-variant-stat-value">
                    {density.toFixed(2)}/s
                </span>
            </div>
            <div className="difficulty-variant-stat">
                <span className="difficulty-variant-stat-label">Edit Type</span>
                <span className={`difficulty-variant-stat-badge difficulty-variant-stat-badge--${variant.editType}`}>
                    {EDIT_TYPE_LABELS[variant.editType]}
                </span>
            </div>
            {primaryGridType && (
                <div className="difficulty-variant-stat">
                    <span className="difficulty-variant-stat-label">Primary Grid</span>
                    <span className="difficulty-variant-stat-value">
                        {GRID_TYPE_LABELS[primaryGridType[0]] || primaryGridType[0]}
                    </span>
                </div>
            )}
            {variant.editAmount !== undefined && variant.editAmount > 0 && (
                <div className="difficulty-variant-stat">
                    <span className="difficulty-variant-stat-label">Edit Amount</span>
                    <span className="difficulty-variant-stat-value">
                        {(variant.editAmount * 100).toFixed(0)}%
                    </span>
                </div>
            )}
        </div>
    );
}

/**
 * Mini timeline showing beats for a difficulty variant
 */
interface VariantMiniTimelineProps {
    beats: VariantBeat[];
    duration: number;
    color: string;
    currentTime?: number;
    zoomLevel?: number;
}

function VariantMiniTimeline({ beats, duration, color, currentTime = 0, zoomLevel = 1 }: VariantMiniTimelineProps) {
    // Calculate visible time range based on zoom
    // At zoom 1x, we see the full duration. At zoom 2x, we see half, etc.
    const visibleDuration = duration / zoomLevel;

    // Calculate scroll offset to center on current time when zoomed
    const scrollOffset = useMemo(() => {
        if (zoomLevel <= 1) return 0;
        // Center on current time, but clamp to valid range
        const halfVisible = visibleDuration / 2;
        const offset = Math.max(0, Math.min(duration - visibleDuration, currentTime - halfVisible));
        return offset;
    }, [currentTime, duration, visibleDuration, zoomLevel]);

    const startTime = scrollOffset;
    const endTime = scrollOffset + visibleDuration;

    // Filter beats to only those in visible range
    const displayBeats = useMemo(() => {
        const visible = beats.filter(beat =>
            beat.timestamp >= startTime - 0.1 &&
            beat.timestamp <= endTime + 0.1
        );

        // Limit for performance if still too many
        if (visible.length <= 150) return visible;
        const step = visible.length / 150;
        const sampled: VariantBeat[] = [];
        for (let i = 0; i < visible.length; i += step) {
            sampled.push(visible[Math.floor(i)]);
        }
        return sampled;
    }, [beats, startTime, endTime]);

    // Playhead position as percentage within visible range
    const playheadPercent = useMemo(() => {
        if (currentTime < startTime || currentTime > endTime) return -1; // Hidden
        return ((currentTime - startTime) / visibleDuration) * 100;
    }, [currentTime, startTime, endTime, visibleDuration]);

    return (
        <div className="difficulty-variant-timeline">
            <div className="difficulty-variant-timeline-track">
                {displayBeats.map((beat, index) => {
                    // Position as percentage within visible range
                    const leftPercent = ((beat.timestamp - startTime) / visibleDuration) * 100;
                    const size = 4 + (beat.intensity || 0.5) * 6;

                    return (
                        <div
                            key={index}
                            className="difficulty-variant-beat-marker"
                            style={{
                                left: `${leftPercent}%`,
                                width: `${size}px`,
                                height: `${size}px`,
                                backgroundColor: color,
                                opacity: 0.5 + (beat.intensity || 0.5) * 0.5,
                            }}
                            title={`${beat.timestamp.toFixed(3)}s - Intensity: ${((beat.intensity || 0) * 100).toFixed(0)}%`}
                        />
                    );
                })}
                {/* Playhead - only show if in visible range */}
                {playheadPercent >= 0 && playheadPercent <= 100 && (
                    <div
                        className="difficulty-variant-playhead"
                        style={{ left: `${playheadPercent}%` }}
                    />
                )}
            </div>
        </div>
    );
}

/**
 * Conversion metadata display for simplified variants
 */
interface ConversionInfoProps {
    variant: DifficultyVariant;
}

function ConversionInfo({ variant }: ConversionInfoProps) {
    if (!variant.conversionMetadata || variant.editType === 'none') {
        return null;
    }

    const { conversionMetadata } = variant;
    const reductionPercent = conversionMetadata.totalBeatsBefore > 0
        ? ((conversionMetadata.totalBeatsBefore - conversionMetadata.totalBeatsAfter) / conversionMetadata.totalBeatsBefore) * 100
        : 0;

    return (
        <div className="difficulty-variant-conversion-info">
            <div className="difficulty-variant-conversion-stat">
                <span className="difficulty-variant-conversion-label">16th → 8th</span>
                <span className="difficulty-variant-conversion-value">
                    {conversionMetadata.sixteenthToEighth}
                </span>
            </div>
            <div className="difficulty-variant-conversion-stat">
                <span className="difficulty-variant-conversion-label">Removed</span>
                <span className="difficulty-variant-conversion-value">
                    {conversionMetadata.beatsRemoved}
                </span>
            </div>
            <div className="difficulty-variant-conversion-stat">
                <span className="difficulty-variant-conversion-label">Reduction</span>
                <span className="difficulty-variant-conversion-value">
                    {reductionPercent.toFixed(0)}%
                </span>
            </div>
        </div>
    );
}

/**
 * Enhancement metadata display for enhanced variants
 */
interface EnhancementInfoProps {
    variant: DifficultyVariant;
}

function EnhancementInfo({ variant }: EnhancementInfoProps) {
    if (!variant.enhancementMetadata || variant.editType !== 'pattern_inserted') {
        return null;
    }

    const { enhancementMetadata } = variant;
    const increasePercent = enhancementMetadata.totalBeatsBefore > 0
        ? ((enhancementMetadata.totalBeatsAfter - enhancementMetadata.totalBeatsBefore) / enhancementMetadata.totalBeatsBefore) * 100
        : 0;

    return (
        <div className="difficulty-variant-enhancement-info">
            <div className="difficulty-variant-enhancement-stat">
                <span className="difficulty-variant-enhancement-label">Patterns Added</span>
                <span className="difficulty-variant-enhancement-value">
                    {enhancementMetadata.patternsInserted}
                </span>
            </div>
            <div className="difficulty-variant-enhancement-stat">
                <span className="difficulty-variant-enhancement-label">Interpolated</span>
                <span className="difficulty-variant-enhancement-value">
                    {enhancementMetadata.interpolatedBeats}
                </span>
            </div>
            <div className="difficulty-variant-enhancement-stat">
                <span className="difficulty-variant-enhancement-label">Increase</span>
                <span className="difficulty-variant-enhancement-value">
                    +{increasePercent.toFixed(0)}%
                </span>
            </div>
        </div>
    );
}

/**
 * Single difficulty variant column
 */
interface DifficultyColumnProps {
    difficulty: DifficultyLevel;
    variant: DifficultyVariant;
    isNatural: boolean;
    duration: number;
    color: string;
    currentTime?: number;
    zoomLevel?: number;
}

function DifficultyColumn({ difficulty, variant, isNatural, duration, color, currentTime, zoomLevel = 1 }: DifficultyColumnProps) {
    return (
        <div
            className={`difficulty-variant-column ${isNatural ? 'difficulty-variant-column--natural' : ''}`}
            style={{ '--variant-color': color } as React.CSSProperties}
        >
            <DifficultyHeader
                difficulty={difficulty}
                isNatural={isNatural}
                color={color}
            />
            <VariantStats variant={variant} color={color} />
            <VariantMiniTimeline
                beats={variant.beats}
                duration={duration}
                color={color}
                currentTime={currentTime}
                zoomLevel={zoomLevel}
            />
            <ConversionInfo variant={variant} />
            <EnhancementInfo variant={variant} />
        </div>
    );
}

// ============================================================
// Main Component
// ============================================================

/**
 * DifficultyVariantsPanel
 *
 * Main container for difficulty variants visualization.
 * Displays side-by-side comparison of Easy/Medium/Hard variants.
 */
export function DifficultyVariantsPanel({
    rhythm,
    currentTime = 0,
    duration: propDuration,
    isPlaying: _isPlaying = false,
    onSeek: _onSeek,
    className,
}: DifficultyVariantsPanelProps) {
    // Get variants from rhythm
    const variants = rhythm.difficultyVariants;
    const naturalDifficulty = rhythm.metadata.naturalDifficulty;

    // Zoom state for all timelines
    const [zoomLevel, setZoomLevel] = useState(1);

    // Get duration from metadata or estimate from beats
    const duration = useMemo(() => {
        if (propDuration && propDuration > 0) return propDuration;
        if (rhythm.metadata.duration > 0) return rhythm.metadata.duration;

        // Estimate from all variants
        const allBeats = [
            ...variants.easy.beats,
            ...variants.medium.beats,
            ...variants.hard.beats,
        ];
        if (allBeats.length === 0) return 0;
        const maxTime = Math.max(...allBeats.map(b => b.timestamp));
        return maxTime + 1;
    }, [propDuration, rhythm.metadata.duration, variants]);

    // Difficulty levels in display order
    const difficulties: DifficultyLevel[] = ['easy', 'medium', 'hard'];

    // Calculate comparison stats
    const comparisonStats = useMemo(() => {
        const counts = {
            easy: variants.easy.beats.length,
            medium: variants.medium.beats.length,
            hard: variants.hard.beats.length,
        };

        const uneditedCount = Object.values(variants).filter(v => v.isUnedited).length;

        return {
            totalBeats: counts.easy + counts.medium + counts.hard,
            counts,
            uneditedCount,
        };
    }, [variants]);

    return (
        <div className={`difficulty-variants-panel ${className || ''}`}>
            {/* Header */}
            <div className="difficulty-variants-header">
                <div className="difficulty-variants-title">
                    <Trophy size={18} />
                    <span>Difficulty Variants</span>
                </div>
                <div className="difficulty-variants-summary">
                    <div className="difficulty-variants-summary-item">
                        <BarChart3 size={14} />
                        <span>{comparisonStats.counts.easy} / {comparisonStats.counts.medium} / {comparisonStats.counts.hard}</span>
                        <span className="difficulty-variants-summary-label">beats</span>
                    </div>
                    <div className="difficulty-variants-summary-item">
                        <Edit3 size={14} />
                        <span>{comparisonStats.uneditedCount} unedited</span>
                    </div>
                </div>
                {/* Zoom controls for all timelines */}
                <ZoomControls
                    zoomLevel={zoomLevel}
                    onZoomChange={setZoomLevel}
                    minZoom={0.5}
                    maxZoom={4}
                    size="sm"
                />
            </div>

            {/* Natural difficulty indicator */}
            <div className="difficulty-variants-natural-info">
                <span className="difficulty-variants-natural-label">Natural Difficulty:</span>
                <span
                    className="difficulty-variants-natural-value"
                    style={{ color: DIFFICULTY_COLORS[naturalDifficulty] }}
                >
                    {naturalDifficulty.charAt(0).toUpperCase() + naturalDifficulty.slice(1)}
                </span>
                <span className="difficulty-variants-natural-hint">
                    (The unedited variant closest to the detected rhythm density)
                </span>
            </div>

            {/* Side-by-side columns */}
            <div className="difficulty-variants-columns">
                {difficulties.map((difficulty) => (
                    <DifficultyColumn
                        key={difficulty}
                        difficulty={difficulty}
                        variant={variants[difficulty]}
                        isNatural={difficulty === naturalDifficulty}
                        duration={duration}
                        color={DIFFICULTY_COLORS[difficulty]}
                        currentTime={currentTime}
                        zoomLevel={zoomLevel}
                    />
                ))}
            </div>

            {/* Legend */}
            <div className="difficulty-variants-legend">
                <div className="difficulty-variants-legend-title">Edit Types:</div>
                <div className="difficulty-variants-legend-items">
                    {Object.entries(EDIT_TYPE_LABELS).map(([type, label]) => (
                        <div
                            key={type}
                            className={`difficulty-variants-legend-item difficulty-variants-legend-item--${type}`}
                        >
                            <span className="difficulty-variants-legend-marker" />
                            <span>{label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default DifficultyVariantsPanel;
