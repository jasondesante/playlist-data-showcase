/**
 * SubdivisionSettings Component
 *
 * The main settings panel for configuring per-beat subdivision patterns.
 * This component orchestrates the subdivision editing workflow by combining
 * the BeatSubdivisionGrid (visual beat selection) and SubdivisionToolbar
 * (subdivision type selection) into a cohesive editing experience.
 *
 * Part of Phase 6: Update SubdivisionSettings (Task 6.1)
 *
 * ## Architecture
 *
 * SubdivisionSettings serves as the coordinator between:
 * - **BeatSubdivisionGrid**: Piano-roll style grid for beat selection
 * - **SubdivisionToolbar**: Subdivision type selection and actions
 * - **Zustand Store**: Persistence and state management
 *
 * ## Features
 *
 * - Piano-roll style BeatSubdivisionGrid for selecting beats
 * - SubdivisionToolbar for selecting subdivision brush and applying to selection
 * - Real-time subdivision distribution statistics
 * - Generate button for creating SubdividedBeatMap
 * - Summary display showing total beats, default subdivision, and distribution
 * - Loading state during generation
 *
 * ## State Management
 *
 * The component maintains local state for:
 * - `isGenerating`: Loading state during SubdividedBeatMap generation
 * - `brushSubdivision`: Currently selected subdivision type in toolbar
 * - `selection`: Current beat selection from the grid
 *
 * Global state (from beatDetectionStore):
 * - `subdivisionConfig`: Per-beat subdivision configuration
 * - `unifiedBeatMap`: Source beat map for subdivision
 * - `subdividedBeatMap`: Generated result
 * - `subdivisionMetadata`: Statistics about generated beat map
 *
 * ## Workflow
 *
 * 1. User views beat grid with current subdivision assignments
 * 2. User selects beats in the grid (click, shift+click, drag)
 * 3. User selects a subdivision type in the toolbar
 * 4. User clicks "Apply to Selection" to assign subdivision
 * 5. User clicks "Generate" to create the SubdividedBeatMap
 *
 * @module SubdivisionSettings
 * @see BeatSubdivisionGrid - The grid component for beat selection
 * @see SubdivisionToolbar - The toolbar for subdivision selection
 * @see useBeatDetectionStore - Zustand store for subdivision state
 * @see PerBeatSubdivisionConfig - The configuration type used
 *
 * @component
 * @example
 * ```tsx
 * // Basic usage in AudioAnalysisTab
 * <SubdivisionSettings disabled={isGenerating} />
 * ```
 *
 * @example
 * ```tsx
 * // With disabled state during other operations
 * <SubdivisionSettings disabled={isLoading || isAnalyzing} />
 * ```
 */
import { useState, useCallback, useMemo } from 'react';
import { RefreshCw, Clock, PieChart } from 'lucide-react';
import { Tooltip } from './Tooltip';
import { BeatSubdivisionGrid } from './BeatSubdivisionGrid';
import { SubdivisionToolbar, SUBDIVISION_TYPES } from './SubdivisionToolbar';
import './SubdivisionSettings.css';
import {
    useBeatDetectionStore,
    useSubdivisionConfig,
    useUnifiedBeatMap,
    useSubdividedBeatMap,
    useSubdivisionMetadata,
} from '../../store/beatDetectionStore';
import type { SubdivisionType, BeatSubdivisionSelection } from '@/types';

/**
 * Props for the SubdivisionSettings component.
 *
 * @property disabled - Whether all controls should be disabled.
 *   When true, the grid, toolbar, and generate button are non-interactive.
 *   Use this when other operations (e.g., beat detection) are in progress.
 * @default false
 */
interface SubdivisionSettingsProps {
    disabled?: boolean;
}

/**
 * SubdivisionSettings component for configuring per-beat subdivision patterns.
 *
 * This is the main entry point for the subdivision editing feature. It combines
 * the BeatSubdivisionGrid and SubdivisionToolbar components and manages the
 * workflow for selecting beats and applying subdivision types.
 *
 * ## Rendering Structure
 *
 * ```
 * <div class="subdivision-settings">
 *   ├── Header with title and tooltip
 *   ├── Status section (warnings or summary stats)
 *   ├── SubdivisionToolbar (if UnifiedBeatMap exists)
 *   ├── BeatSubdivisionGrid
 *   ├── Actions section with Generate button
 *   └── Result section (after generation)
 * ```
 *
 * @param props - Component props
 * @returns The rendered settings panel
 *
 * @see BeatSubdivisionGrid
 * @see SubdivisionToolbar
 */
export function SubdivisionSettings({ disabled = false }: SubdivisionSettingsProps) {
    const subdivisionConfig = useSubdivisionConfig();
    const unifiedBeatMap = useUnifiedBeatMap();
    const subdividedBeatMap = useSubdividedBeatMap();
    const subdivisionMetadata = useSubdivisionMetadata();

    const generateSubdividedBeatMap = useBeatDetectionStore((state) => state.actions.generateSubdividedBeatMap);
    const setBeatSubdivision = useBeatDetectionStore((state) => state.actions.setBeatSubdivision);
    const setBeatSubdivisionRange = useBeatDetectionStore((state) => state.actions.setBeatSubdivisionRange);
    const clearAllBeatSubdivisions = useBeatDetectionStore((state) => state.actions.clearAllBeatSubdivisions);

    // Task 5.1: Generation loading state
    const [isGenerating, setIsGenerating] = useState(false);

    // Task 6.1: Brush subdivision state for toolbar
    const [brushSubdivision, setBrushSubdivision] = useState<SubdivisionType>('quarter');

    // Task 6.1: Selection state from BeatSubdivisionGrid
    const [selection, setSelection] = useState<BeatSubdivisionSelection>({
        selectedBeats: new Set(),
        rangeStart: null,
        rangeEnd: null,
    });

    // Check if we have a UnifiedBeatMap to work with
    const hasUnifiedBeatMap = unifiedBeatMap !== null;
    const totalBeats = unifiedBeatMap?.beats.length ?? 0;

    // Task 6.2: Calculate subdivision distribution
    const subdivisionDistribution = useMemo(() => {
        if (!hasUnifiedBeatMap || totalBeats === 0) {
            return { counts: new Map<SubdivisionType, number>(), uniqueCount: 0 };
        }

        const counts = new Map<SubdivisionType, number>();

        // Initialize all counts to 0
        for (const type of SUBDIVISION_TYPES) {
            counts.set(type.id, 0);
        }

        // Count beats with explicit subdivisions
        for (const [beatIndex, subdivision] of subdivisionConfig.beatSubdivisions) {
            if (beatIndex < totalBeats) {
                counts.set(subdivision, (counts.get(subdivision) ?? 0) + 1);
            }
        }

        // Count beats using default subdivision
        const explicitCount = subdivisionConfig.beatSubdivisions.size;
        const defaultCount = Math.max(0, totalBeats - explicitCount);
        const currentDefault = counts.get(subdivisionConfig.defaultSubdivision) ?? 0;
        counts.set(subdivisionConfig.defaultSubdivision, currentDefault + defaultCount);

        // Count unique subdivisions (those with count > 0)
        let uniqueCount = 0;
        for (const count of counts.values()) {
            if (count > 0) uniqueCount++;
        }

        return { counts, uniqueCount };
    }, [hasUnifiedBeatMap, totalBeats, subdivisionConfig]);

    // Task 6.2: Format distribution for display
    const distributionText = useMemo(() => {
        const { counts } = subdivisionDistribution;
        if (counts.size === 0) return '';

        const parts: string[] = [];
        for (const typeConfig of SUBDIVISION_TYPES) {
            const count = counts.get(typeConfig.id) ?? 0;
            if (count > 0) {
                parts.push(`${count} ${typeConfig.label.toLowerCase()}`);
            }
        }

        return parts.join(', ');
    }, [subdivisionDistribution]);

    // Handle generating the SubdividedBeatMap
    const handleGenerate = () => {
        // Task 5.1: Show loading state during generation
        setIsGenerating(true);

        // Use requestAnimationFrame to ensure the loading state is rendered
        // before the synchronous subdivision work begins
        requestAnimationFrame(() => {
            try {
                generateSubdividedBeatMap();
            } finally {
                setIsGenerating(false);
            }
        });
    };

    // Task 6.1: Apply brush subdivision to selected beats
    const handleApplyToSelection = useCallback(() => {
        if (selection.selectedBeats.size === 0) return;

        const beats = Array.from(selection.selectedBeats).sort((a, b) => a - b);

        // Check if beats are contiguous
        let isContiguous = true;
        for (let i = 1; i < beats.length; i++) {
            if (beats[i] !== beats[i - 1] + 1) {
                isContiguous = false;
                break;
            }
        }

        if (isContiguous && beats.length > 1) {
            // Use range action for contiguous selection
            setBeatSubdivisionRange(beats[0], beats[beats.length - 1], brushSubdivision);
        } else {
            // Apply individually for non-contiguous selection
            beats.forEach((beatIndex) => {
                setBeatSubdivision(beatIndex, brushSubdivision);
            });
        }
    }, [selection.selectedBeats, brushSubdivision, setBeatSubdivision, setBeatSubdivisionRange]);

    // Task 6.1: Clear selection
    const handleClearSelection = useCallback(() => {
        setSelection({
            selectedBeats: new Set(),
            rangeStart: null,
            rangeEnd: null,
        });
    }, []);

    // Task 6.1: Select all beats
    const handleSelectAll = useCallback(() => {
        const allBeats = new Set<number>();
        for (let i = 0; i < totalBeats; i++) {
            allBeats.add(i);
        }
        setSelection({
            selectedBeats: allBeats,
            rangeStart: 0,
            rangeEnd: totalBeats - 1,
        });
    }, [totalBeats]);

    // Task 6.1: Reset all beats to default
    const handleResetAll = useCallback(() => {
        clearAllBeatSubdivisions();
        handleClearSelection();
    }, [clearAllBeatSubdivisions, handleClearSelection]);

    // Task 6.1: Handle selection change from BeatSubdivisionGrid
    const handleSelectionChange = useCallback((newSelection: BeatSubdivisionSelection) => {
        setSelection(newSelection);
    }, []);

    return (
        <div className="subdivision-settings">
            {/* Header */}
            <div className="subdivision-settings-header">
                <div className="subdivision-settings-title">
                    <h3>Subdivision Settings</h3>
                    <Tooltip content="Configure rhythmic subdivision patterns for each beat" />
                </div>
            </div>

            {/* Status Info */}
            <div className="subdivision-settings-status">
                {!hasUnifiedBeatMap && (
                    <div className="subdivision-settings-warning">
                        <Clock size={14} />
                        <span>Generate a beat map first to configure subdivisions</span>
                    </div>
                )}
                {hasUnifiedBeatMap && (
                    <>
                        {/* Task 6.2: Summary stats */}
                        <div className="subdivision-settings-summary-row">
                            <div className="subdivision-settings-summary-stat">
                                <span className="subdivision-settings-summary-label">Total Beats</span>
                                <span className="subdivision-settings-summary-value">{totalBeats}</span>
                            </div>
                            <div className="subdivision-settings-summary-stat">
                                <span className="subdivision-settings-summary-label">Default</span>
                                <span className="subdivision-settings-summary-value">
                                    {SUBDIVISION_TYPES.find(t => t.id === subdivisionConfig.defaultSubdivision)?.label ?? subdivisionConfig.defaultSubdivision}
                                </span>
                            </div>
                            <div className="subdivision-settings-summary-stat">
                                <span className="subdivision-settings-summary-label">Custom</span>
                                <span className="subdivision-settings-summary-value">{subdivisionConfig.beatSubdivisions.size}</span>
                            </div>
                            <div className="subdivision-settings-summary-stat">
                                <span className="subdivision-settings-summary-label">Unique</span>
                                <span className="subdivision-settings-summary-value">{subdivisionDistribution.uniqueCount}</span>
                            </div>
                        </div>

                        {/* Task 6.2: Distribution breakdown */}
                        {distributionText && (
                            <div className="subdivision-settings-distribution">
                                <PieChart size={12} />
                                <span className="subdivision-settings-distribution-label">Distribution:</span>
                                <span className="subdivision-settings-distribution-text">{distributionText}</span>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Task 6.1: SubdivisionToolbar */}
            {hasUnifiedBeatMap && (
                <SubdivisionToolbar
                    currentBrush={brushSubdivision}
                    onBrushChange={setBrushSubdivision}
                    onApplyToSelection={handleApplyToSelection}
                    onClearSelection={handleClearSelection}
                    onSelectAll={handleSelectAll}
                    onResetAll={handleResetAll}
                    selectionCount={selection.selectedBeats.size}
                    disabled={disabled}
                    compact={false}
                />
            )}

            {/* Task 6.1: BeatSubdivisionGrid */}
            <BeatSubdivisionGrid
                disabled={disabled}
                onSelectionChange={handleSelectionChange}
            />

            {/* Generate Button */}
            <div className="subdivision-settings-actions">
                <button
                    className="subdivision-settings-generate-btn"
                    onClick={handleGenerate}
                    disabled={disabled || !hasUnifiedBeatMap || isGenerating}
                >
                    {isGenerating ? (
                        <>
                            <RefreshCw size={14} className="spinning" />
                            <span>Generating...</span>
                        </>
                    ) : (
                        <>
                            <RefreshCw size={14} />
                            <span>Generate Subdivided Beat Map</span>
                        </>
                    )}
                </button>
            </div>

            {/* Generated Beat Map Info */}
            {subdividedBeatMap && subdivisionMetadata && (
                <div className="subdivision-settings-result">
                    <div className="subdivision-settings-result-header">
                        <h4>Generated Beat Map</h4>
                    </div>
                    <div className="subdivision-settings-result-stats">
                        <div className="subdivision-settings-stat">
                            <span className="subdivision-settings-stat-label">Original Beats</span>
                            <span className="subdivision-settings-stat-value">
                                {subdivisionMetadata.originalBeatCount}
                            </span>
                        </div>
                        <div className="subdivision-settings-stat">
                            <span className="subdivision-settings-stat-label">Subdivided Beats</span>
                            <span className="subdivision-settings-stat-value">
                                {subdivisionMetadata.subdividedBeatCount}
                            </span>
                        </div>
                        <div className="subdivision-settings-stat">
                            <span className="subdivision-settings-stat-label">Avg Density</span>
                            <span className="subdivision-settings-stat-value">
                                {subdivisionMetadata.averageDensityMultiplier.toFixed(1)}x
                            </span>
                        </div>
                        {subdivisionMetadata.hasMultipleTempos && (
                            <div className="subdivision-settings-stat subdivision-settings-stat--multi-tempo">
                                <span className="subdivision-settings-stat-label">Tempo Sections</span>
                                <span className="subdivision-settings-stat-value">
                                    Multi-tempo
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
