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
    StreamScorerConfig,
    ControllerMode,
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
    ControllerMode,
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
    CompositeSection,
    CompositeBeat,
    DensityAnalysisResult,
    NaturalDifficulty,
    // Transient detection configuration types
    TransientDetectorConfig,
    BandTransientConfig,
    BandTransientConfigOverrides,
    DensityValidationResult,
    BandDensityValidationResult,
    // Stream scoring configuration types
    StreamScorerConfig,
    BandBiasWeights,
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
 *
 * NOTE: adaptiveThresholding is disabled by default (matches engine defaults).
 * When enabled, it can only INCREASE the threshold based on track dynamics,
 * never decrease it. This makes behavior more predictable.
 */
export const DEFAULT_BAND_TRANSIENT_CONFIG: Record<Band, BandTransientConfig> = {
    low: {
        threshold: 0.5,       // Higher threshold - bass transients are typically stronger
        minInterval: 0.1,     // 100ms - bass events are more sparse, longer buffer
        adaptiveThresholding: false,  // Disabled by default - threshold used exactly as-is
    },
    mid: {
        threshold: 0.3,       // Medium threshold - balanced detection
        minInterval: 0.08,    // 80ms - moderate interval
        adaptiveThresholding: false,  // Disabled by default - threshold used exactly as-is
    },
    high: {
        threshold: 0.25,      // Lower threshold - hi-hats can be subtle
        minInterval: 0.06,    // 60ms - rapid fire percussion
        adaptiveThresholding: false,  // Disabled by default - threshold used exactly as-is
    },
};

/**
 * Essentia.js pitch detection algorithm.
 * These match the engine's EssentiaPitchAlgorithm type.
 */
export type EssentiaPitchAlgorithm =
    | 'predominant_melodia'
    | 'pitch_melodia'
    | 'pitch_yin_probabilistic'
    | 'multipitch_melodia'
    | 'multipitch_klapuri'
    | 'pitch_crepe';

/**
 * Unified pitch detection algorithm selection.
 * Includes built-in pYIN ('pyin_legacy') alongside all Essentia.js WASM algorithms.
 * Matches the engine's PitchAlgorithm type.
 */
export type PitchAlgorithm = 'pyin_legacy' | EssentiaPitchAlgorithm;

/**
 * Settings for automatic level generation.
 * These are configured in Step 1 (Analyze) when auto mode is enabled.
 */
export interface AutoLevelSettings {
    /** Selected preset for rhythm generation */
    preset: RhythmPresetName;
    /** Target difficulty level */
    difficulty: 'natural' | 'easy' | 'medium' | 'hard';
    /** Output mode - which band stream to use */
    outputMode: OutputMode;
    /** Minimum intensity threshold for transients (0.0-1.0) - deprecated, use transientConfig instead */
    intensityThreshold: number;
    /** Per-band transient detection configuration overrides */
    transientConfig?: BandTransientConfigOverrides;
    /** Whether to use per-band defaults (when true, transientConfig is used) */
    usePerBandDefaults: boolean;
    /** Enable density validation with automatic retry on too-dense transients */
    enableDensityValidation: boolean;
    /** Maximum retries per band when density validation fails (0-5) */
    densityMaxRetries: number;
    /**
     * Stream scoring configuration - controls how bands are selected for composite stream.
     * Includes factor weights (ioiVariance, syncopation, phraseSignificance, density)
     * and band bias weights (manual preference multipliers per frequency band).
     * When undefined, engine defaults are used.
     */
    scoringConfig?: Partial<StreamScorerConfig>;

    // ============================================================
    // Level Settings (Task 1.5)
    // ============================================================

    /**
     * Controller mode for button mapping.
     * 'ddr' = 4 directional buttons (up, down, left, right)
     * 'guitar_hero' = 5 fret buttons
     */
    controllerMode: ControllerMode;

    /**
     * How strongly pitch analysis influences button mapping.
     * 0.0 = purely pattern-based mapping
     * 1.0 = strong pitch influence
     * Default: 0.8
     */
    pitchInfluenceWeight: number;

    /**
     * Probability threshold for voiced/unvoiced decision in pitch detection.
     * Higher values require stronger pitch signal to be considered "voiced".
     * Default: 0.5
     */
    voicingThreshold: number;

    // ============================================================
    // Pitch Detection
    // ============================================================

    /**
     * Which pitch detection algorithm to use.
     * 'pyin_legacy' uses the built-in pYIN detector; all others use Essentia.js.
     * Pitch detection is skipped entirely when pitchInfluenceWeight is 0.
     * Default: 'pitch_melodia'
     */
    pitchAlgorithm: PitchAlgorithm;

    /**
     * URL to the CREPE TFJS model.
     * Only required when pitchAlgorithm is 'pitch_crepe'.
     * Default: 'https://arweave.net/PLACEHOLDER_CREPE_TINY'
     */
    crepeModelUrl: string;
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
    enableDensityValidation: false,  // Density validation disabled by default (opt-in)
    densityMaxRetries: 0,       // No retries by default
    scoringConfig: undefined,   // Uses engine defaults when undefined
    // Level Settings (Task 1.5)
    controllerMode: 'ddr',      // DDR mode by default
    pitchInfluenceWeight: 0.8,  // Strong pitch influence
    voicingThreshold: 0.5,      // Default voicing threshold
    // Pitch Detection
    pitchAlgorithm: 'pitch_melodia',            // Essentia pitch_melodia by default
    crepeModelUrl: 'https://arweave.net/PLACEHOLDER_CREPE_TINY', // CREPE tiny model placeholder
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
