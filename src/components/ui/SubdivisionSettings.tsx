/**
 * SubdivisionSettings Component
 *
 * A settings panel for configuring beat subdivision patterns.
 * Part of Phase 3: SubdivisionSettings Component
 *
 * Features:
 * - Display current subdivision configuration
 * - Show list of segments with subdivision types
 * - Add/remove segment buttons
 * - Subdivision type selector per segment
 * - Start beat input for each segment
 * - Generate SubdividedBeatMap button
 * - Integrated timeline editor for visual segment editing
 *
 * This component is used in the AudioAnalysisTab to configure
 * pre-calculated subdivision patterns for level creation and export.
 *
 * @component
 * @example
 * ```tsx
 * // Basic usage in AudioAnalysisTab
 * <SubdivisionSettings disabled={isGenerating} />
 *
 * // With explicit disabled state
 * <SubdivisionSettings disabled={true} />
 * ```
 *
 * @see SubdivisionTimelineEditor - Visual timeline for segment editing
 * @see useSubdivisionConfig - Store hook for accessing subdivision config
 * @see useSubdividedBeatMap - Store hook for accessing generated beat map
 */
import { useState } from 'react';
import { Info, Plus, Trash2, RefreshCw, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { Tooltip } from './Tooltip';
import './SubdivisionSettings.css';
import {
    useBeatDetectionStore,
    useSubdivisionConfig,
    useUnifiedBeatMap,
    useSubdividedBeatMap,
    useSubdivisionMetadata,
} from '../../store/beatDetectionStore';
import type { SubdivisionType } from '@/types';

/**
 * Subdivision type configuration for display.
 *
 * Each subdivision type has display properties for the UI including
 * labels, descriptions, and density multipliers.
 *
 * @property id - The subdivision type identifier
 * @property label - Full display label (e.g., "Eighth")
 * @property shortLabel - Compact label for buttons (e.g., "2x")
 * @property description - User-friendly description of the subdivision
 * @property density - Relative beat density multiplier (1 = quarter, 2 = eighth, etc.)
 */
interface SubdivisionTypeConfig {
    id: SubdivisionType;
    label: string;
    shortLabel: string;
    description: string;
    density: number;
}

/**
 * All subdivision types with their display properties
 */
const SUBDIVISION_TYPES: SubdivisionTypeConfig[] = [
    {
        id: 'quarter',
        label: 'Quarter',
        shortLabel: '1x',
        description: 'Quarter notes (default, no subdivision)',
        density: 1,
    },
    {
        id: 'half',
        label: 'Half',
        shortLabel: '0.5x',
        description: 'Half notes (beats on 1 and 3)',
        density: 0.5,
    },
    {
        id: 'eighth',
        label: 'Eighth',
        shortLabel: '2x',
        description: 'Eighth notes (double density)',
        density: 2,
    },
    {
        id: 'sixteenth',
        label: 'Sixteenth',
        shortLabel: '4x',
        description: 'Sixteenth notes (maximum density)',
        density: 4,
    },
    {
        id: 'triplet8',
        label: 'Triplet 8th',
        shortLabel: '3/Q',
        description: 'Eighth triplets (3 beats per quarter)',
        density: 3,
    },
    {
        id: 'triplet4',
        label: 'Triplet 4th',
        shortLabel: '3/H',
        description: 'Quarter triplets (3 beats per half)',
        density: 1.5,
    },
    {
        id: 'dotted4',
        label: 'Dotted Q',
        shortLabel: '1.5x',
        description: 'Dotted quarter (every 1.5 quarters)',
        density: 2 / 3,
    },
    {
        id: 'dotted8',
        label: 'Dotted 8th',
        shortLabel: 'Swing',
        description: 'Dotted eighth (swing pattern)',
        density: 1,
    },
];

/**
 * Props for the SubdivisionSettings component.
 */
interface SubdivisionSettingsProps {
    /**
     * Whether the settings controls should be disabled.
     * When true, all controls are non-interactive.
     * @default false
     */
    disabled?: boolean;
    /**
     * Whether the timeline editor is currently visible.
     * This state is managed by the parent component.
     * @default false
     */
    showTimeline?: boolean;
    /**
     * Callback when the timeline editor visibility should be toggled.
     * @param show - Whether to show the timeline editor
     */
    onToggleTimeline?: (show: boolean) => void;
}

/**
 * SubdivisionSettings Component
 *
 * Renders settings for beat subdivision including segment management,
 * subdivision type selection, and SubdividedBeatMap generation.
 *
 * The component integrates with the beatDetectionStore for state management
 * and includes an expandable SubdivisionTimelineEditor for visual editing.
 *
 * @param props - Component props
 * @param props.disabled - Whether controls should be disabled (default: false)
 * @returns The rendered settings panel
 */
export function SubdivisionSettings({ disabled = false, showTimeline = false, onToggleTimeline }: SubdivisionSettingsProps) {
    const subdivisionConfig = useSubdivisionConfig();
    const unifiedBeatMap = useUnifiedBeatMap();
    const subdividedBeatMap = useSubdividedBeatMap();
    const subdivisionMetadata = useSubdivisionMetadata();

    const addSubdivisionSegment = useBeatDetectionStore((state) => state.actions.addSubdivisionSegment);
    const removeSubdivisionSegment = useBeatDetectionStore((state) => state.actions.removeSubdivisionSegment);
    const updateSubdivisionSegment = useBeatDetectionStore((state) => state.actions.updateSubdivisionSegment);
    const generateSubdividedBeatMap = useBeatDetectionStore((state) => state.actions.generateSubdividedBeatMap);

    // Task 4.6: Timeline editor state (selectedSegmentIndex only, showTimeline lifted to parent)
    const [selectedSegmentIndex, setSelectedSegmentIndex] = useState<number | null>(null);

    // Task 5.1: Generation loading state
    const [isGenerating, setIsGenerating] = useState(false);

    // Check if we have a UnifiedBeatMap to work with
    const hasUnifiedBeatMap = unifiedBeatMap !== null;
    const totalBeats = unifiedBeatMap?.beats.length ?? 0;

    // Task 4.6: Auto-show timeline when segments > 1
    const hasMultipleSegments = subdivisionConfig.segments.length > 1;

    // Handle adding a new segment
    const handleAddSegment = () => {
        if (!hasUnifiedBeatMap) return;

        // Find the last beat of the last segment to suggest a start beat
        const lastSegment = subdivisionConfig.segments[subdivisionConfig.segments.length - 1];
        const suggestedStartBeat = lastSegment ? lastSegment.startBeat + 32 : 0;

        // Clamp to total beats
        const startBeat = Math.min(suggestedStartBeat, totalBeats - 1);

        addSubdivisionSegment({
            startBeat,
            subdivision: 'quarter',
        });
    };

    // Handle removing a segment
    const handleRemoveSegment = (index: number) => {
        // Don't allow removing the first segment
        if (index === 0) return;
        removeSubdivisionSegment(index);
    };

    // Handle updating a segment's start beat
    const handleStartBeatChange = (index: number, value: string) => {
        const newStartBeat = parseInt(value, 10);
        if (isNaN(newStartBeat) || newStartBeat < 0) return;

        // Clamp to total beats
        const clampedStartBeat = Math.min(newStartBeat, totalBeats - 1);

        updateSubdivisionSegment(index, {
            ...subdivisionConfig.segments[index],
            startBeat: clampedStartBeat,
        });
    };

    // Handle updating a segment's subdivision type
    const handleSubdivisionChange = (index: number, subdivision: SubdivisionType) => {
        updateSubdivisionSegment(index, {
            ...subdivisionConfig.segments[index],
            subdivision,
        });
    };

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

    // Handle keyboard navigation for subdivision type toggles
    const createKeyboardNavHandler = (
        currentIndex: number
    ) => (e: React.KeyboardEvent) => {
        const types = SUBDIVISION_TYPES.map(t => t.id);
        const currentType = subdivisionConfig.segments[currentIndex]?.subdivision;
        const typeIndex = types.indexOf(currentType);
        let newIndex = typeIndex;

        switch (e.key) {
            case 'ArrowLeft':
            case 'ArrowUp':
                e.preventDefault();
                newIndex = typeIndex > 0 ? typeIndex - 1 : types.length - 1;
                break;
            case 'ArrowRight':
            case 'ArrowDown':
                e.preventDefault();
                newIndex = typeIndex < types.length - 1 ? typeIndex + 1 : 0;
                break;
            case 'Home':
                e.preventDefault();
                newIndex = 0;
                break;
            case 'End':
                e.preventDefault();
                newIndex = types.length - 1;
                break;
            default:
                return;
        }

        handleSubdivisionChange(currentIndex, types[newIndex]);

        // Focus the button for the new type
        const container = e.currentTarget;
        const buttons = container.querySelectorAll('[data-type-index]');
        const targetButton = buttons[newIndex] as HTMLElement;
        if (targetButton) {
            targetButton.focus();
        }
    };

    // Get subdivision type config by id
    const getTypeConfig = (type: SubdivisionType): SubdivisionTypeConfig => {
        return SUBDIVISION_TYPES.find(t => t.id === type) ?? SUBDIVISION_TYPES[0];
    };

    // Get tabIndex for toggle button
    const getToggleTabIndex = (type: SubdivisionType, currentType: SubdivisionType): number => {
        return type === currentType ? 0 : -1;
    };

    return (
        <div className="subdivision-settings">
            {/* ============================================================
             * HEADER SECTION
             * ============================================================ */}
            <div className="subdivision-settings-header">
                <div className="subdivision-settings-title-row">
                    <span className="subdivision-settings-title">Beat Subdivision</span>
                    <Tooltip content="Configure subdivision patterns to create rhythm variations. Each segment can have a different subdivision type." />
                </div>
                {subdivisionMetadata && (
                    <div className="subdivision-settings-summary">
                        {subdivisionMetadata.subdividedBeatCount} beats ({subdivisionMetadata.segmentCount} segment{subdivisionMetadata.segmentCount !== 1 ? 's' : ''})
                    </div>
                )}
            </div>

            {/* ============================================================
             * UNIFIED BEAT MAP STATUS
             * ============================================================ */}
            {!hasUnifiedBeatMap && (
                <div className="subdivision-settings-notice">
                    <Info className="subdivision-settings-notice-icon" />
                    <span className="subdivision-settings-notice-text">
                        Generate a beat map first to configure subdivisions.
                    </span>
                </div>
            )}

            {/* ============================================================
             * SEGMENTS LIST
             * ============================================================ */}
            {hasUnifiedBeatMap && (
                <div className="subdivision-settings-segments">
                    <div className="subdivision-settings-segments-header">
                        <span className="subdivision-settings-label">Segments</span>
                        <span className="subdivision-settings-beat-count">
                            {totalBeats} quarter notes available
                        </span>
                    </div>

                    <div className="subdivision-settings-segments-list">
                        {subdivisionConfig.segments.map((segment, index) => {
                            const typeConfig = getTypeConfig(segment.subdivision);
                            const isSelected = selectedSegmentIndex === index;

                            return (
                                <div
                                    key={index}
                                    className={`subdivision-settings-segment ${isSelected ? 'subdivision-settings-segment--selected' : ''}`}
                                    onClick={() => setSelectedSegmentIndex(isSelected ? null : index)}
                                >
                                    {/* Segment number and controls */}
                                    <div className="subdivision-settings-segment-header">
                                        <span className="subdivision-settings-segment-number">
                                            #{index + 1}
                                        </span>
                                        {index > 0 && (
                                            <button
                                                type="button"
                                                className="subdivision-settings-segment-remove"
                                                onClick={() => handleRemoveSegment(index)}
                                                disabled={disabled}
                                                aria-label={`Remove segment ${index + 1}`}
                                                title="Remove segment"
                                            >
                                                <Trash2 className="subdivision-settings-segment-remove-icon" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Start beat input */}
                                    <div className="subdivision-settings-segment-field">
                                        <label
                                            htmlFor={`start-beat-${index}`}
                                            className="subdivision-settings-segment-label"
                                        >
                                            Start Beat
                                        </label>
                                        <input
                                            id={`start-beat-${index}`}
                                            type="number"
                                            min={0}
                                            max={totalBeats - 1}
                                            value={segment.startBeat}
                                            onChange={(e) => handleStartBeatChange(index, e.target.value)}
                                            disabled={disabled}
                                            className="subdivision-settings-segment-input"
                                            aria-label={`Start beat for segment ${index + 1}`}
                                        />
                                    </div>

                                    {/* Subdivision type selector */}
                                    <div className="subdivision-settings-segment-field">
                                        <span className="subdivision-settings-segment-label">
                                            Subdivision
                                        </span>
                                        <div
                                            className="subdivision-settings-type-toggles"
                                            role="radiogroup"
                                            aria-label={`Subdivision type for segment ${index + 1}`}
                                            onKeyDown={createKeyboardNavHandler(index)}
                                        >
                                            {SUBDIVISION_TYPES.map((type, typeIndex) => {
                                                const isSelected = segment.subdivision === type.id;
                                                return (
                                                    <button
                                                        key={type.id}
                                                        type="button"
                                                        data-type-index={typeIndex}
                                                        className={`subdivision-settings-type-toggle ${isSelected ? 'subdivision-settings-type-toggle--active' : ''}`}
                                                        onClick={() => handleSubdivisionChange(index, type.id)}
                                                        disabled={disabled}
                                                        tabIndex={getToggleTabIndex(type.id, segment.subdivision)}
                                                        role="radio"
                                                        aria-checked={isSelected}
                                                        aria-label={`${type.label}: ${type.description}`}
                                                        title={type.description}
                                                    >
                                                        <span className="subdivision-settings-type-toggle-label">
                                                            {type.shortLabel}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <div className="subdivision-settings-type-description">
                                            {typeConfig.label} - {typeConfig.description}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Add segment button */}
                    <button
                        type="button"
                        className="subdivision-settings-add-segment"
                        onClick={handleAddSegment}
                        disabled={disabled || subdivisionConfig.segments.length >= 8}
                        aria-label="Add subdivision segment"
                    >
                        <Plus className="subdivision-settings-add-segment-icon" />
                        <span>Add Segment</span>
                    </button>
                    {subdivisionConfig.segments.length >= 8 && (
                        <div className="subdivision-settings-segment-limit">
                            Maximum 8 segments allowed
                        </div>
                    )}
                </div>
            )}

            {/* ============================================================
             * TIMELINE EDITOR TOGGLE (Timeline editor is rendered in parent for full-width)
             * ============================================================ */}
            {hasUnifiedBeatMap && (
                <div className="subdivision-settings-timeline-section">
                    <button
                        type="button"
                        className={`subdivision-settings-timeline-toggle ${showTimeline || hasMultipleSegments ? 'subdivision-settings-timeline-toggle--active' : ''}`}
                        onClick={() => onToggleTimeline?.(!showTimeline)}
                        aria-expanded={showTimeline || hasMultipleSegments}
                        aria-controls="subdivision-timeline-editor"
                    >
                        <Clock className="subdivision-settings-timeline-toggle-icon" />
                        <span className="subdivision-settings-timeline-toggle-label">
                            Timeline Editor
                        </span>
                        {(showTimeline || hasMultipleSegments) ? (
                            <ChevronUp className="subdivision-settings-timeline-toggle-chevron" />
                        ) : (
                            <ChevronDown className="subdivision-settings-timeline-toggle-chevron" />
                        )}
                    </button>
                </div>
            )}

            {/* ============================================================
             * GENERATE BUTTON
             * ============================================================ */}
            {hasUnifiedBeatMap && (
                <div className="subdivision-settings-generate">
                    <button
                        type="button"
                        className={`subdivision-settings-generate-btn ${isGenerating ? 'subdivision-settings-generate-btn--loading' : ''}`}
                        onClick={handleGenerate}
                        disabled={disabled || isGenerating}
                        aria-label={isGenerating ? 'Generating subdivided beat map...' : 'Generate subdivided beat map'}
                        aria-busy={isGenerating}
                    >
                        <RefreshCw className={`subdivision-settings-generate-btn-icon ${isGenerating ? 'subdivision-settings-generate-btn-icon--spinning' : ''}`} />
                        <span>{isGenerating ? 'Generating...' : 'Generate Subdivided Beat Map'}</span>
                    </button>
                    {subdividedBeatMap && !isGenerating && (
                        <div className="subdivision-settings-generated-info">
                            <span className="subdivision-settings-generated-badge">
                                Generated
                            </span>
                            <span className="subdivision-settings-generated-stats">
                                {subdivisionMetadata?.subdividedBeatCount ?? 0} beats
                                {' • '}
                                {subdivisionMetadata?.subdivisionsUsed.join(' → ') ?? 'none'}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* ============================================================
             * NOTE SECTION
             * ============================================================ */}
            <div className="subdivision-settings-note">
                <Info className="subdivision-settings-note-icon" />
                <span className="subdivision-settings-note-text">
                    Subdivision creates rhythm patterns from the quarter note grid.
                    Use segments to vary the pattern throughout the track.
                </span>
            </div>
        </div>
    );
}

export default SubdivisionSettings;
