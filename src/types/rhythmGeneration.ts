/**
 * Rhythm Generation Types
 *
 * Re-exports types from playlist-data-engine and adds local state management types
 * for the automatic level generation feature.
 */

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
 * Settings for automatic level generation.
 * These are configured in Step 1 (Analyze) when auto mode is enabled.
 */
export interface AutoLevelSettings {
    /** Selected preset for rhythm generation */
    preset: import('playlist-data-engine').RhythmPresetName;
    /** Target difficulty level */
    difficulty: 'easy' | 'medium' | 'hard';
    /** Output mode - which band stream to use */
    outputMode: import('playlist-data-engine').OutputMode;
    /** Minimum intensity threshold for transients (0.0-1.0) */
    intensityThreshold: number;
}

/**
 * Default settings for automatic level generation.
 */
export const DEFAULT_AUTO_LEVEL_SETTINGS: AutoLevelSettings = {
    preset: 'standard',
    difficulty: 'medium',
    outputMode: 'composite',
    intensityThreshold: 0.2,
};
