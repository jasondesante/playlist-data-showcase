/**
 * SubdivisionSettings Component
 *
 * A settings panel for configuring beat subdivision patterns.
 * Part of Phase 3: Store Updates (Task 3.1)
 *
 * This component is being redesigned for the per-beat subdivision format.
 * The segment-based UI has been replaced with a simplified interface.
 *
 * Phase 6 will introduce:
 * - Piano-roll style grid for selecting beats
 * - Click/drag to select beat ranges
 * - Apply subdivision to selected beats
 *
 * @component
 * @example
 * ```tsx
 * // Basic usage in AudioAnalysisTab
 * <SubdivisionSettings disabled={isGenerating} />
 * ```
 */
import { useState, useEffect } from 'react';
import { Info, RefreshCw, Clock } from 'lucide-react';
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
        shortLabel: '3x',
        description: 'Eighth note triplets',
        density: 3,
    },
    {
        id: 'triplet4',
        label: 'Triplet 4th',
        shortLabel: '1.5x',
        description: 'Quarter note triplets',
        density: 1.5,
    },
    {
        id: 'dotted4',
        label: 'Dotted 4th',
        shortLabel: '1.5x',
        description: 'Dotted quarter notes',
        density: 1.5,
    },
    {
        id: 'dotted8',
        label: 'Dotted 8th',
        shortLabel: '3x',
        description: 'Dotted eighth notes',
        density: 3,
    },
    {
        id: 'rest',
        label: 'Rest',
        shortLabel: '-',
        description: 'No beat (rest)',
        density: 0,
    },
];

interface SubdivisionSettingsProps {
    /** Whether controls should be disabled */
    disabled?: boolean;
    /** Whether to show the timeline editor */
    showTimeline?: boolean;
    /** Callback to toggle timeline visibility */
    onToggleTimeline?: () => void;
}

/**
 * SubdivisionSettings component for configuring subdivision patterns.
 *
 * @param props - Component props
 * @param props.disabled - Whether controls should be disabled (default: false)
 * @returns The rendered settings panel
 */
export function SubdivisionSettings({ disabled = false }: SubdivisionSettingsProps) {
    const subdivisionConfig = useSubdivisionConfig();
    const unifiedBeatMap = useUnifiedBeatMap();
    const subdividedBeatMap = useSubdividedBeatMap();
    const subdivisionMetadata = useSubdivisionMetadata();

    const generateSubdividedBeatMap = useBeatDetectionStore((state) => state.actions.generateSubdividedBeatMap);
    const setAllBeatSubdivisions = useBeatDetectionStore((state) => state.actions.setAllBeatSubdivisions);

    // Task 5.1: Generation loading state
    const [isGenerating, setIsGenerating] = useState(false);

    // Check if we have a UnifiedBeatMap to work with
    const hasUnifiedBeatMap = unifiedBeatMap !== null;
    const totalBeats = unifiedBeatMap?.beats.length ?? 0;

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

    // Handle setting all beats to a specific subdivision
    const handleSetAllSubdivisions = (subdivision: SubdivisionType) => {
        setAllBeatSubdivisions(subdivision);
    };

    // Keyboard shortcut for subdivision types
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (disabled || !hasUnifiedBeatMap) return;

            // Number keys 1-9 for quick subdivision selection
            const typeIndex = parseInt(e.key) - 1;
            if (typeIndex >= 0 && typeIndex < SUBDIVISION_TYPES.length) {
                handleSetAllSubdivisions(SUBDIVISION_TYPES[typeIndex].id);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [disabled, hasUnifiedBeatMap]);

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
                    <div className="subdivision-settings-info">
                        <span>{totalBeats} beats available</span>
                        <span className="subdivision-settings-separator">|</span>
                        <span>Default: {subdivisionConfig.defaultSubdivision}</span>
                        <span className="subdivision-settings-separator">|</span>
                        <span>{subdivisionConfig.beatSubdivisions.size} custom</span>
                    </div>
                )}
            </div>

            {/* Quick Actions - Set All to Subdivision */}
            <div className="subdivision-settings-section">
                <div className="subdivision-settings-section-header">
                    <h4>Set All Beats</h4>
                    <Tooltip content="Set all beats to the same subdivision type" />
                </div>
                <div className="subdivision-settings-type-grid">
                    {SUBDIVISION_TYPES.map((type) => (
                        <button
                            key={type.id}
                            className={`subdivision-settings-type-btn ${
                                subdivisionConfig.defaultSubdivision === type.id ? 'active' : ''
                            }`}
                            onClick={() => handleSetAllSubdivisions(type.id)}
                            disabled={disabled || !hasUnifiedBeatMap}
                            title={type.description}
                        >
                            <span className="subdivision-settings-type-label">{type.label}</span>
                            <span className="subdivision-settings-type-density">{type.shortLabel}</span>
                        </button>
                    ))}
                </div>
            </div>

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

            {/* Phase 6 Preview */}
            <div className="subdivision-settings-phase6-preview">
                <p>
                    <Info size={12} />
                    Per-beat subdivision editing coming in Phase 6
                </p>
            </div>
        </div>
    );
}
