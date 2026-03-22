/**
 * Rhythm Generation Types
 *
 * Re-exports types from playlist-data-engine and adds local state management types
 * for the automatic level generation feature.
 */

// Import types for local use
import type {
    Band,
    BandTransientConfig,
    BandTransientConfigOverrides,
    RhythmPresetName,
    OutputMode,
} from 'playlist-data-engine';

// Re-export types from playlist-data-engine
export type {
    GeneratedRhythm,
    RhythmMetadata,
    OutputMode,
    Band,
    CachePhase,
    RhythmPresetName,
    RhythmPresetConfig,
} from 'playlist-data-engine';

// Re-export the RhythmGenerator class and utilities
export {
    RhythmGenerator,
    RHYTHM_PRESETS,
    getRhythmPreset,
    getRhythmPresetNames,
    type RhythmGenerationOptions,
} from 'playlist-data-engine';

// Re-export related types needed for rhythm generation visualization
export type {
    TransientResult,
    TransientAnalysis,
    MultiBandResult,
    BandAnalysis,
    QuantizedBandStreams,
    GeneratedBeat,
    GridType,
    GridDecision,
    RhythmicPhrase,
    PhraseOccurrence,
    PhraseAnalysisResult,
    DifficultyVariant,
    DifficultyLevel,
    EditType,
    CompositeStream,
    CompositeBeat,
    DensityAnalysisResult,
    NaturalDifficulty,
    // Transient detection configuration types
    TransientDetectorConfig,
    BandTransientConfig,
    BandTransientConfigOverrides,
    DensityValidationResult,
    BandDensityValidationResult,
} from 'playlist-data-engine';

/**
 * Generation mode for the beat detection wizard.
 * - 'manual': 4-step wizard (Analyze → Subdivide → Chart → Ready)
 * - 'automatic': 3-step wizard (Analyze → Rhythm Generation → Ready)
 */
export type GenerationMode = 'manual' | 'automatic';

/**
 * Phases of the rhythm generation pipeline.
 * Each phase represents a stage in the rhythm generation process.
 */
export type RhythmGenerationPhase =
    | 'multiBand'      // Multi-band frequency analysis
    | 'transients'     // Transient detection
    | 'quantize'       // Beat quantization
    | 'phrases'        // Phrase detection
    | 'composite'      // Composite stream generation
    | 'variants';      // Difficulty variant generation

/**
 * Progress state for the rhythm generation pipeline.
 * Tracks the current phase and progress percentage for UI display.
 */
export interface RhythmGenerationProgress {
    /** Current phase of the pipeline */
    phase: RhythmGenerationPhase;
    /** Progress within current phase (0-100) */
    progress: number;
    /** Human-readable status message */
    message: string;
    /** Timestamp when this progress update occurred */
    timestamp?: number;
}

/**
 * Per-band transient detection defaults.
 * Each frequency band has different optimal settings.
 */
export const DEFAULT_BAND_TRANSIENT_CONFIG: Record<Band, BandTransientConfig> = {
    low: {
        threshold: 0.4,       // Higher threshold - bass transients are typically stronger
        minInterval: 0.05,    // 50ms - bass events are more sparse
        adaptiveThresholding: true,
    },
    mid: {
        threshold: 0.3,       // Medium threshold - balanced detection
        minInterval: 0.03,    // 30ms - moderate interval
        adaptiveThresholding: true,
    },
    high: {
        threshold: 0.25,      // Lower threshold - hi-hats can be subtle
        minInterval: 0.02,    // 20ms - rapid fire percussion
        adaptiveThresholding: true,
    },
};

/**
 * Settings for automatic level generation.
 * These are configured in Step 1 (Analyze) when auto mode is enabled.
 */
export interface AutoLevelSettings {
    /** Selected preset for rhythm generation */
    preset: RhythmPresetName;
    /** Target difficulty level */
    difficulty: 'easy' | 'medium' | 'hard';
    /** Output mode - which band stream to use */
    outputMode: OutputMode;
    /** Minimum intensity threshold for transients (0.0-1.0) - deprecated, use transientConfig instead */
    intensityThreshold: number;
    /** Per-band transient detection configuration overrides */
    transientConfig?: BandTransientConfigOverrides;
    /** Whether to use per-band defaults (when true, transientConfig is used) */
    usePerBandDefaults: boolean;
}

/**
 * Default settings for automatic level generation.
 */
export const DEFAULT_AUTO_LEVEL_SETTINGS: AutoLevelSettings = {
    preset: 'standard',
    difficulty: 'medium',
    outputMode: 'composite',
    intensityThreshold: 0,
    usePerBandDefaults: true,  // Use per-band transient detection defaults by default
    transientConfig: undefined, // When usePerBandDefaults is true, engine uses its defaults
};

/**
 * A highlighted region on a timeline.
 * Used for phrase occurrence highlighting.
 */
export interface HighlightedRegion {
    /** Unique identifier for this region */
    id: string;
    /** Start timestamp in seconds */
    startTimestamp: number;
    /** End timestamp in seconds */
    endTimestamp: number;
    /** Background color for the region (CSS color) */
    color: string;
    /** Optional label for the region */
    label?: string;
}

/**
 * Generate a color for a phrase pattern based on its index.
 * Returns a consistent color from a predefined palette.
 */
export function getPhraseHighlightColor(index: number): string {
    const colors = [
        'rgba(59, 130, 246, 0.3)',   // Blue
        'rgba(34, 197, 94, 0.3)',    // Green
        'rgba(249, 115, 22, 0.3)',   // Orange
        'rgba(168, 85, 247, 0.3)',   // Purple
        'rgba(236, 72, 153, 0.3)',   // Pink
        'rgba(20, 184, 166, 0.3)',   // Teal
        'rgba(245, 158, 11, 0.3)',   // Amber
        'rgba(239, 68, 68, 0.3)',    // Red
    ];
    return colors[index % colors.length];
}
