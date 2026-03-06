/**
 * Type Definitions
 *
 * Re-exports types from playlist-data-engine to ensure parity.
 */

export type {
    // Playlist
    ServerlessPlaylist,
    PlaylistTrack,
    RawArweavePlaylist,

    // Audio
    AudioProfile,
    AudioTimelineEvent,
    SamplingStrategy,
    ColorPalette,
    FrequencyBands,

    // Beat Detection
    Beat,
    BeatMap,
    BeatMapMetadata,
    BeatEvent,
    BeatEventType,
    BeatStreamCallback,
    AudioSyncState,
    BeatMapGeneratorOptions,
    BeatStreamOptions,
    BeatMapJSON,
    BeatAccuracy,
    ButtonPressResult,
    BeatMapGenerationProgress,

    // Groove Analyzer
    GrooveDirection,
    GrooveResult,
    GrooveState,
    GrooveAnalyzerOptions,

    // Required Keys (Chart Mode)
    KeyAssignableBeatMap,
    KeyAssignment,

    // Character
    CharacterSheet,
    AbilityScores,
    Race,
    Class,
    Ability,
    Skill,
    ProficiencyLevel,
    Spell,
    Equipment,

    // Combat
    PartyAnalysis,

    // Progression & Sensors
    GeolocationData,
    MotionData,
    WeatherData,
    LightData,
    EnvironmentalContext,
    GamingContext,
    ListeningSession,
    ExperienceSystem,
    LevelUpBenefits,
    CharacterUpdateResult,

    // Prestige System
    PrestigeLevel,
    PrestigeInfo,
    PrestigeResult,
    CustomThresholds,
    ISessionTracker,

    // Rhythm XP System
    RhythmXPConfig,
    RhythmXPResult,
    RhythmSessionTotals,
    ComboEndBonusResult,
    GrooveEndBonusResult,
    GrooveStats
} from 'playlist-data-engine';

// Re-export prestige system class, constants and helper functions
export {
    PrestigeSystem,
    PRESTIGE_ROMAN_NUMERALS,
    MAX_PRESTIGE_LEVEL,
    BASE_PLAYS_THRESHOLD,
    BASE_XP_THRESHOLD,
    PRESTIGE_SCALING_FACTOR,
    isPrestigeLevel,
    toPrestigeLevel
} from 'playlist-data-engine';

// Re-export groove analyzer class and default options
export {
    GrooveAnalyzer,
    DEFAULT_GROOVE_OPTIONS
} from 'playlist-data-engine';

// Re-export Rhythm XP calculator and helpers
export {
    RhythmXPCalculator,
    DEFAULT_RHYTHM_XP_CONFIG,
    mergeRhythmXPConfig
} from 'playlist-data-engine';

import type { ListeningSession } from 'playlist-data-engine';

/**
 * ListeningSessionWithTrack - Extended session with track metadata
 *
 * Used to store track info alongside session data for display in session history.
 * The track metadata is captured at session end time to ensure accurate display
 * even if the track is later removed from the playlist.
 */
export interface ListeningSessionWithTrack extends ListeningSession {
    track_title?: string;
    track_artist?: string;
    track_image_url?: string;
}

// ============================================================
// Progression Config Types
// ============================================================

/**
 * Activity bonuses for XP multipliers.
 *
 * These values match the engine's ProgressionConfig.xp.activity_bonuses structure,
 * with an additional app-specific `altitude` bonus.
 *
 * @see playlist-data-engine ProgressionConfig.xp.activity_bonuses
 */
export interface ActivityBonuses {
    /** Running multiplier (default: 1.5) - applied when user is running */
    running: number;
    /** Walking multiplier (default: 1.2) - applied when user is walking */
    walking: number;
    /** Night time bonus (default: 1.25) - applied at night */
    night_time: number;
    /** Rain bonus (default: 1.2) - applied when raining */
    rain: number;
    /** Snow bonus (default: 1.3) - applied when snowing */
    snow: number;
    /** Storm bonus (default: 1.4) - applied during storms */
    storm: number;
    /** Base gaming bonus (default: 1.25) - base multiplier when gaming */
    gaming_base: number;
    /** RPG game bonus additive (default: 0.20) - added to gaming_base for RPGs */
    rpg_game: number;
    /** Action/FPS game bonus additive (default: 0.15) - added to gaming_base for action/FPS games */
    action_fps: number;
    /** Multiplayer bonus additive (default: 0.15) - added to gaming_base for multiplayer games */
    multiplayer: number;
    /** Max multiplier cap (default: 3.0) - total XP multiplier cannot exceed this value */
    max_multiplier: number;
    /**
     * Altitude bonus (default: 1.3) - APP-SPECIFIC, not in engine.
     * Applied when user is at high altitude (≥2000m).
     * This value is NOT passed to mergeProgressionConfig().
     */
    altitude: number;
}

/**
 * Progression configuration settings for XP calculations.
 *
 * This interface defines the structure for customizing XP multiplier values
 * used in all calculations. Values are persisted to LocalStorage and synced
 * with the engine's mergeProgressionConfig() API (except altitude which is app-specific).
 *
 * @see mergeProgressionConfig from playlist-data-engine
 * @see DEFAULT_PROGRESSION_CONFIG from playlist-data-engine
 */
export interface ProgressionConfigSettings {
    /** Base XP rate (default: 1.0) - XP earned per second of listening */
    xp_per_second: number;
    /** Activity bonus multipliers for environmental and gaming contexts */
    activity_bonuses: ActivityBonuses;
}

/**
 * Metadata for progression config state.
 * Used for versioning and tracking modifications.
 */
export interface ProgressionConfigMetadata {
    /** Schema version for future migrations */
    version: number;
    /** Unix timestamp of last modification */
    lastModified: number;
}

/**
 * Full progression config state including settings and metadata.
 * This is what gets persisted to LocalStorage.
 */
export interface ProgressionConfigState {
    /** The progression configuration settings */
    settings: ProgressionConfigSettings;
    /** Metadata for versioning and tracking */
    metadata: ProgressionConfigMetadata;
}

/**
 * Default values for progression configuration.
 * Matches engine's DEFAULT_PROGRESSION_CONFIG where applicable.
 */
export const DEFAULT_PROGRESSION_CONFIG_SETTINGS: ProgressionConfigSettings = {
    xp_per_second: 1.0,
    activity_bonuses: {
        running: 1.5,
        walking: 1.2,
        night_time: 1.25,
        rain: 1.2,
        snow: 1.3,
        storm: 1.4,
        gaming_base: 1.25,
        rpg_game: 0.20,
        action_fps: 0.15,
        multiplayer: 0.15,
        max_multiplier: 3.0,
        altitude: 1.3, // App-specific
    },
};

/**
 * Current schema version for progression config.
 * Increment when making breaking changes to the config structure.
 */
export const PROGRESSION_CONFIG_VERSION = 3;

// ============================================================
// XP Formula Preset Types (for Uncapped Progression)
// ============================================================

// Re-export the engine's UncappedProgressionConfig type
export type { UncappedProgressionConfig } from 'playlist-data-engine';

/**
 * XP Formula Preset - A predefined XP progression curve
 *
 * Used to allow users to select different XP scaling formulas for
 * uncapped mode characters. Each preset defines how XP requirements
 * grow as characters level up beyond level 20.
 *
 * @see LevelUpProcessor.setUncappedConfig from playlist-data-engine
 */
export interface XPFormulaPreset {
    /** Unique identifier for the preset (e.g., 'dnd5e', 'linear') */
    id: string;
    /** Display name shown in the UI */
    name: string;
    /** Short description of the progression style */
    description: string;
    /** Formula that calculates total XP required to reach a given level */
    xpFormula: (level: number) => number;
    /** Formula that calculates proficiency bonus for a given level */
    proficiencyFormula: (level: number) => number;
    /** Color used for this preset in the chart (CSS color value) */
    chartColor: string;
}

// ============================================================
// Beat Detection Difficulty Types
// ============================================================

/**
 * Extended accuracy levels for button press detection.
 *
 * Extends the engine's BeatAccuracy with an 'ok' level for a more forgiving
 * difficulty curve, and 'wrongKey' for rhythm game chart mode where specific
 * keys must be pressed. The engine only supports 'perfect' | 'great' | 'good' | 'miss'.
 */
export type ExtendedBeatAccuracy = 'perfect' | 'great' | 'good' | 'ok' | 'miss' | 'wrongKey';

/**
 * Extended button press result that includes 'ok' accuracy level, beat source,
 * and key matching information for rhythm game chart mode.
 *
 * Extends the engine's ButtonPressResult to use ExtendedBeatAccuracy and
 * includes source information to distinguish detected vs interpolated beats.
 */
export interface ExtendedButtonPressResult {
    /** Accuracy level of the press (includes 'ok' and 'wrongKey') */
    accuracy: ExtendedBeatAccuracy;

    /** Time difference from nearest beat in seconds (negative = early, positive = late) */
    offset: number;

    /** The beat that was matched (nearest beat to the press) */
    matchedBeat: import('playlist-data-engine').Beat;

    /** Absolute value of offset for easier comparison */
    absoluteOffset: number;

    /**
     * Whether the matched beat was detected or interpolated.
     * - 'detected': Originally detected beat from BeatTracker
     * - 'interpolated': Generated by interpolation algorithm to fill gaps
     * - undefined: Source information not available (e.g., using BeatMap without interpolation)
     */
    source?: BeatSourceType;

    /**
     * Whether the pressed key matched the required key (if any).
     * True if: no key required, or pressedKey matches requiredKey.
     * False if: key required but wrong key pressed (accuracy will be 'wrongKey').
     */
    keyMatch: boolean;

    /**
     * The key that was pressed (passed to checkButtonPress).
     * Undefined if no key was provided (e.g., spacebar or generic tap).
     */
    pressedKey?: string;

    /**
     * The required key from the matched beat (convenience copy).
     * Undefined if the beat has no required key.
     */
    requiredKey?: string;
}

/**
 * Accuracy thresholds for beat tap evaluation (in seconds).
 *
 * These thresholds define the time windows for each accuracy level.
 * A tap within `perfect` seconds of a beat is rated "perfect", etc.
 *
 * Values must be in ascending order: perfect < great < good < ok
 */
export interface AccuracyThresholds {
    /** Perfect timing window (seconds) - typically ±10-75ms depending on difficulty */
    perfect: number;
    /** Great timing window (seconds) - typically ±25-125ms depending on difficulty */
    great: number;
    /** Good timing window (seconds) - typically ±50-175ms depending on difficulty */
    good: number;
    /** OK timing window (seconds) - typically ±100-250ms depending on difficulty */
    ok: number;
}

/**
 * Difficulty preset identifiers for beat tap evaluation.
 *
 * - 'easy': Forgiving timing for casual players (±75ms perfect)
 * - 'medium': Balanced difficulty (±45ms perfect)
 * - 'hard': Strict timing for rhythm game veterans (±10ms perfect)
 * - 'custom': User-defined custom thresholds
 */
export type DifficultyPreset = 'easy' | 'medium' | 'hard' | 'custom';

/**
 * Easy difficulty thresholds - forgiving timing for casual players.
 * Perfect window: ±35ms
 */
export const EASY_ACCURACY_THRESHOLDS: AccuracyThresholds = {
    perfect: 0.035,  // ±35ms
    great: 0.070,    // ±70ms
    good: 0.110,     // ±110ms
    ok: 0.150,       // ±150ms
};

/**
 * Medium difficulty thresholds - balanced timing.
 * Perfect window: ±10ms
 */
export const MEDIUM_ACCURACY_THRESHOLDS: AccuracyThresholds = {
    perfect: 0.010,  // ±10ms
    great: 0.025,    // ±25ms
    good: 0.050,     // ±50ms
    ok: 0.100,       // ±100ms
};

/**
 * Hard difficulty thresholds - strict timing for veterans.
 * Perfect window: ±8ms
 */
export const HARD_ACCURACY_THRESHOLDS: AccuracyThresholds = {
    perfect: 0.008,  // ±8ms
    great: 0.020,    // ±20ms
    good: 0.040,     // ±40ms
    ok: 0.075,       // ±75ms
};

/**
 * Map of preset names to their threshold values.
 */
export const DIFFICULTY_PRESETS: Record<Exclude<DifficultyPreset, 'custom'>, AccuracyThresholds> = {
    easy: EASY_ACCURACY_THRESHOLDS,
    medium: MEDIUM_ACCURACY_THRESHOLDS,
    hard: HARD_ACCURACY_THRESHOLDS,
};

/**
 * Get accuracy thresholds for a given difficulty preset.
 *
 * @param preset - The difficulty preset ('easy', 'medium', 'hard', or 'custom')
 * @param customThresholds - Custom thresholds to use when preset is 'custom'
 * @returns The accuracy thresholds for the given preset
 */
export function getAccuracyThresholdsForPreset(
    preset: DifficultyPreset,
    customThresholds?: Partial<AccuracyThresholds>
): AccuracyThresholds {
    if (preset === 'custom') {
        // Merge custom thresholds with hard preset as base
        return {
            ...HARD_ACCURACY_THRESHOLDS,
            ...customThresholds,
        };
    }
    return DIFFICULTY_PRESETS[preset];
}

/**
 * Validate accuracy thresholds.
 *
 * @param thresholds - Partial thresholds to validate
 * @returns Object with valid flag and array of error messages
 */
export function validateThresholds(thresholds: Partial<AccuracyThresholds>): {
    valid: boolean;
    errors: string[];
} {
    const errors: string[] = [];
    const keys: (keyof AccuracyThresholds)[] = ['perfect', 'great', 'good', 'ok'];

    // Check that all provided values are positive
    for (const key of keys) {
        if (thresholds[key] !== undefined && thresholds[key]! < 0) {
            errors.push(`${key} must be positive, got ${thresholds[key]}`);
        }
    }

    // Check ascending order for provided values
    const providedKeys = keys.filter(k => thresholds[k] !== undefined);
    for (let i = 0; i < providedKeys.length - 1; i++) {
        const current = providedKeys[i];
        const next = providedKeys[i + 1];
        if (thresholds[current]! >= thresholds[next]!) {
            errors.push(
                `${next} (${thresholds[next]}) must be greater than ${current} (${thresholds[current]})`
            );
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

// ============================================================
// OSE (Onset Strength Envelope) Parameter Types
// ============================================================

// Re-export OSE types from the engine
export type {
    HopSizeMode,
    HopSizeConfig,
    MelBandsMode,
    MelBandsConfig,
    GaussianSmoothMode,
    GaussianSmoothConfig,
} from 'playlist-data-engine';

// Re-export engine helper functions for resolving mode configs to numeric values
export {
    getHopSizeMs,
    getMelBands,
    getGaussianSmoothMs,
} from 'playlist-data-engine';

/**
 * Preset values for Hop Size modes.
 *
 * Each preset includes the actual millisecond value, a display label,
 * and a short description for UI tooltips.
 */
export const HOP_SIZE_PRESETS = {
    efficient: { value: 10, label: 'Efficient', description: 'Fast, reduced precision' },
    standard: { value: 4, label: 'Standard', description: 'Paper spec (default)' },
    hq: { value: 2, label: 'HQ', description: 'Maximum precision' },
} as const;

/**
 * Preset values for Mel Bands modes.
 *
 * Higher band counts provide more frequency resolution but require more computation.
 */
export const MEL_BANDS_PRESETS = {
    standard: { value: 40, label: 'Standard', description: '40 bands' },
    detailed: { value: 64, label: 'Detailed', description: '64 bands' },
    maximum: { value: 80, label: 'Maximum', description: '80 bands' },
} as const;

/**
 * Preset values for Gaussian Smoothing modes.
 *
 * Higher values produce cleaner peaks but may miss fast transients.
 */
export const GAUSSIAN_SMOOTH_PRESETS = {
    minimal: { value: 10, label: 'Minimal', description: 'Fast transients' },
    standard: { value: 20, label: 'Standard', description: 'Balanced (default)' },
    smooth: { value: 40, label: 'Smooth', description: 'Cleaner peaks' },
} as const;

// ============================================================
// Beat Interpolation Types
// ============================================================

// Re-export beat interpolation types from the engine
export type {
    BeatSource,
    BeatWithSource,
    // InterpolationAlgorithm - REMOVED: Engine now uses only adaptive-phase-locked
    BeatInterpolationOptions,
    InterpolatedBeatMap,
    QuarterNoteDetection,
    GapAnalysis,
    InterpolationMetadata,
    // Tempo Section types (multi-tempo support)
    TempoSection,
    TempoSectionJSON,

    // Beat Subdivision types
    SubdivisionType,
    SubdivisionConfig,
    UnifiedBeatMap,
    SubdividedBeat,
    SubdividedBeatMap,
    SubdivisionMetadata,
    SubdivisionTransitionMode,
    SubdivisionPlaybackOptions,
    SubdivisionBeatEvent,
    SubdivisionCallback,
} from 'playlist-data-engine';

// Re-export beat interpolation constants
export { DEFAULT_BEAT_INTERPOLATION_OPTIONS } from 'playlist-data-engine';

// Re-export the BeatInterpolator class
export { BeatInterpolator } from 'playlist-data-engine';

// ============================================================
// Downbeat Configuration Types
// ============================================================

// Re-export downbeat configuration types from the engine
export type {
    TimeSignatureConfig,
    DownbeatSegment,
    DownbeatConfig,
} from 'playlist-data-engine';

// Re-export downbeat configuration constants and functions
export {
    DEFAULT_DOWNBEAT_CONFIG,
    reapplyDownbeatConfig,
} from 'playlist-data-engine';

// ============================================================
// Beat Subdivision Types
// ============================================================

/**
 * Selection state for beat subdivision UI.
 *
 * Used by BeatSubdivisionGrid to track which beats are selected
 * for applying subdivision changes. Supports single selection,
 * multi-selection, and range selection.
 *
 * @example
 * ```typescript
 * const selection: BeatSubdivisionSelection = {
 *   selectedBeats: new Set([0, 1, 2, 3]),
 *   rangeStart: 0,
 *   rangeEnd: 3,
 * };
 * ```
 */
export interface BeatSubdivisionSelection {
    /** Set of currently selected beat indices */
    selectedBeats: Set<number>;
    /** Start index of current range selection (null if no active range) */
    rangeStart: number | null;
    /** End index of current range selection (null if no active range) */
    rangeEnd: number | null;
}

// Re-export beat subdivision constants and validation functions
export {
    DEFAULT_SUBDIVISION_CONFIG,
    DEFAULT_SUBDIVISION_PLAYBACK_OPTIONS,
    MAX_SUBDIVISION_DENSITY,
    VALID_SUBDIVISION_TYPES,
    isValidSubdivisionType,
    getSubdivisionDensity,
    validateSubdivisionConfig,
    validateSubdivisionConfigAgainstBeats,
    validateSubdivisionDensity,
} from 'playlist-data-engine';

// Re-export the BeatSubdivider class and utility functions
export {
    BeatSubdivider,
    unifyBeatMap,
    subdivideBeatMap,
    SubdivisionPlaybackController,
} from 'playlist-data-engine';

// Re-export Required Keys helper functions for chart mode
export {
    assignKeyToBeat,
    assignKeysToBeats,
    extractKeyMap,
    clearAllKeys,
    hasRequiredKeys,
    getKeyCount,
    getUsedKeys,
} from 'playlist-data-engine';

// Import types needed for extending (Task 6.3)
// These are imported with aliases so we can extend them in this file
// Note: BeatEvent and BeatEventType are already re-exported from the main export block above
import type {
    BeatEvent as EngineBeatEvent,
    BeatSource as BeatSourceType,
    BeatInterpolationOptions as EngineBeatInterpolationOptions,
} from 'playlist-data-engine';

// Import defaults needed for preset functions (Task 8.2)
import { DEFAULT_BEAT_INTERPOLATION_OPTIONS as ENGINE_DEFAULTS } from 'playlist-data-engine';

// Local alias for use in preset functions
type BeatInterpolationOptions = EngineBeatInterpolationOptions;
const DEFAULT_BEAT_INTERPOLATION_OPTIONS = ENGINE_DEFAULTS;

// ============================================================
// Frontend-Specific Beat Interpolation Types
// ============================================================

/**
 * Beat stream mode for selecting which beat source to use.
 *
 * - 'detected': Use only originally detected beats (original behavior)
 * - 'merged': Use interpolated beats with detected beats as anchors (fills gaps)
 * - 'subdivided': Use pre-calculated subdivided beats (e.g., eighth notes, triplets)
 */
export type BeatStreamMode = 'detected' | 'merged' | 'subdivided';

/**
 * Visualization data for rendering detected vs interpolated beats in BeatTimeline.
 *
 * This type formats the InterpolatedBeatMap data for efficient timeline rendering,
 * flattening the beat arrays and including all necessary visualization properties.
 */
export interface InterpolationVisualizationData {
    /** All beats (detected + interpolated) formatted for visualization */
    beats: Array<{
        /** Timestamp in seconds from the start of the audio */
        timestamp: number;
        /** Whether this beat was detected or interpolated */
        source: 'detected' | 'interpolated';
        /** Confidence score for this beat (0.0 - 1.0) */
        confidence: number;
        /** Whether this beat is a downbeat (first beat of a measure) */
        isDownbeat: boolean;
    }>;
    /** Detected quarter note interval in seconds */
    quarterNoteInterval: number;
    /** Optional tempo drift data for visualization */
    tempoDrift?: Array<{
        /** Timestamp in seconds */
        time: number;
        /** BPM at this point */
        bpm: number;
    }>;
}

// ============================================================
// Extended Beat Event Types (Task 6.3)
// ============================================================

/**
 * Extended beat event that includes source information.
 *
 * The engine's BeatEvent doesn't include source information because
 * the beat field is typed as Beat, not BeatWithSource. However, at
 * runtime, when using InterpolatedBeatMap with mergedBeats, the beat
 * object actually contains the source field.
 *
 * This extended type allows the frontend to access the source information
 * when available, enabling UI components to distinguish between detected
 * and interpolated beats in practice feedback.
 *
 * @example
 * ```typescript
 * const event: ExtendedBeatEvent = {
 *   ...beatEvent,
 *   source: 'interpolated', // Added by frontend when available
 * };
 *
 * // In practice feedback
 * if (event.source === 'interpolated') {
 *   showInterpolatedBeatIndicator();
 * }
 * ```
 */
export interface ExtendedBeatEvent extends EngineBeatEvent {
    /**
     * Whether the beat was detected by the algorithm or interpolated.
     *
     * - 'detected': Originally detected beat from BeatTracker
     * - 'interpolated': Generated by interpolation algorithm to fill gaps
     *
     * This field is extracted from BeatWithSource.source when the beat
     * comes from an InterpolatedBeatMap's mergedBeats array.
     */
    source?: BeatSourceType;
}

// ============================================================
// Interpolation Option Presets (Task 8.2)
// ============================================================

/**
 * Interpolation preset identifier.
 *
 * Each preset is optimized for a specific use case:
 * - 'default': Balanced settings for most tracks
 * - 'stable-tempo': Fixed grid for tracks with very stable tempo
 * - 'variable-tempo': High adaptation for tracks with tempo drift
 * - 'sparse-detection': Lower thresholds for tracks with few detected beats
 * - 'research': Defaults with all options exposed (handled in UI)
 */
export type InterpolationPresetId =
    | 'default'
    | 'stable-tempo'
    | 'variable-tempo'
    | 'sparse-detection'
    | 'research';

/**
 * Configuration for an interpolation preset.
 */
export interface InterpolationPreset {
    /** Unique identifier for the preset */
    id: InterpolationPresetId;
    /** Display name shown in the UI */
    name: string;
    /** Short description of when to use this preset */
    description: string;
    /** The interpolation options for this preset */
    options: Partial<BeatInterpolationOptions>;
}

/**
 * Interpolation presets for common use cases.
 *
 * Each preset is designed for a specific scenario:
 * - **Default**: Balanced settings that work well for most tracks
 * - **Stable Tempo**: Fixed grid with low adaptation for tracks with very consistent tempo
 * - **Variable Tempo**: High adaptation rate for tracks with tempo drift (live recordings, etc.)
 * - **Sparse Detection**: Lower thresholds to accept more anchors when few beats are detected
 * - **Research**: Defaults with advanced options exposed for experimentation
 */
export const INTERPOLATION_PRESETS: InterpolationPreset[] = [
    {
        id: 'default',
        name: 'Default',
        description: 'Balanced settings for most tracks',
        options: {}, // Empty = use all engine defaults
    },
    {
        id: 'stable-tempo',
        name: 'Stable Tempo',
        description: 'Fixed grid for tracks with very stable tempo (electronic, studio recordings)',
        options: {
            tempoAdaptationRate: 0.1,        // Low - don't adapt much
            gridSnapTolerance: 0.03,         // Tighter snapping (30ms)
            anomalyThreshold: 0.3,           // More sensitive to anomalies
            minAnchorConfidence: 0.4,        // Higher threshold for anchors
        },
    },
    {
        id: 'variable-tempo',
        name: 'Variable Tempo',
        description: 'High adaptation for tracks with tempo drift (live recordings, classical)',
        options: {
            tempoAdaptationRate: 0.7,        // High - adapt to tempo changes
            gridSnapTolerance: 0.08,         // More tolerance (80ms)
            anomalyThreshold: 0.5,           // Less sensitive to anomalies
            minAnchorConfidence: 0.25,       // Slightly lower threshold
        },
    },
    {
        id: 'sparse-detection',
        name: 'Sparse Detection',
        description: 'Lower thresholds for tracks with few detected beats',
        options: {
            minAnchorConfidence: 0.15,       // Low - accept more anchors
            denseSectionMinBeats: 2,         // Smaller sections count
            gridSnapTolerance: 0.07,         // More tolerance
            extrapolateStart: true,          // Always extrapolate
            extrapolateEnd: true,
        },
    },
    {
        id: 'research',
        name: 'Research',
        description: 'Default settings for experimentation (expand Advanced Options)',
        options: {}, // Use defaults, but UI shows all options
    },
];

/**
 * Get an interpolation preset by its ID.
 *
 * @param id - The preset identifier
 * @returns The preset configuration, or undefined if not found
 */
export function getInterpolationPreset(id: InterpolationPresetId): InterpolationPreset | undefined {
    return INTERPOLATION_PRESETS.find(preset => preset.id === id);
}

/**
 * Detect which preset (if any) matches the given options.
 * Returns 'default' if no preset matches.
 *
 * @param options - The current interpolation options
 * @returns The matching preset ID
 */
export function detectInterpolationPreset(options: BeatInterpolationOptions): InterpolationPresetId {
    // Import defaults lazily to avoid circular dependency
    const defaults = DEFAULT_BEAT_INTERPOLATION_OPTIONS;

    // Check each preset (except 'default' and 'research')
    for (const preset of INTERPOLATION_PRESETS) {
        if (preset.id === 'default' || preset.id === 'research') continue;

        const presetOpts = preset.options;
        const keys = Object.keys(presetOpts) as (keyof BeatInterpolationOptions)[];

        // Check if all preset options match current options
        const matches = keys.every(key => {
            const presetValue = presetOpts[key];
            const currentValue = options[key] ?? defaults[key];
            return presetValue === currentValue;
        });

        // Also check that non-specified options are at defaults
        if (matches) {
            const allKeys: (keyof BeatInterpolationOptions)[] = [
                'minAnchorConfidence', 'gridSnapTolerance', 'tempoAdaptationRate',
                'anomalyThreshold', 'denseSectionMinBeats', 'extrapolateStart',
                'extrapolateEnd', 'gridAlignmentWeight', 'anchorConfidenceWeight',
                'paceConfidenceWeight',
            ];

            const nonPresetKeys = allKeys.filter(k => !(k in presetOpts));
            const nonDefaultsMatch = nonPresetKeys.every(key => {
                return (options[key] ?? defaults[key]) === defaults[key];
            });

            if (nonDefaultsMatch) {
                return preset.id;
            }
        }
    }

    // Check if everything is at defaults
    const allKeys: (keyof BeatInterpolationOptions)[] = [
        'minAnchorConfidence', 'gridSnapTolerance', 'tempoAdaptationRate',
        'anomalyThreshold', 'denseSectionMinBeats', 'extrapolateStart',
        'extrapolateEnd', 'gridAlignmentWeight', 'anchorConfidenceWeight',
        'paceConfidenceWeight',
    ];

    const allDefaults = allKeys.every(key => {
        return (options[key] ?? defaults[key]) === defaults[key];
    });

    if (allDefaults) {
        return 'default';
    }

    // Custom configuration
    return 'research';
}

// ============================================================
// Chart Editor Types (Required Keys Feature)
// ============================================================

/**
 * Chart style determines the visual theme and available keys.
 *
 * - 'ddr': Dance Dance Revolution style with 4 arrow keys (up, down, left, right)
 * - 'guitar-hero': Guitar Hero style with 5 number keys (1-5)
 *
 * Charts are authored for one style, and the KeyPalette filters available
 * keys based on the selected style.
 */
export type ChartStyle = 'ddr' | 'guitar-hero';

/**
 * Chart editor mode for the current editing state.
 *
 * - 'view': Read-only view of the chart
 * - 'paint': Assign the selected key to clicked/dragged beats
 * - 'erase': Remove key assignments from clicked beats
 */
export type ChartEditorMode = 'view' | 'paint' | 'erase';

/**
 * Chart editor tool selection.
 *
 * - 'paint': Assign the selected key to beats
 * - 'erase': Remove key assignments from beats
 * - 'clear-all': Clear all key assignments (action, not a persistent mode)
 */
export type ChartEditorTool = 'paint' | 'erase' | 'clear-all';

/**
 * All supported keys for chart mode.
 *
 * Combines DDR arrow keys and Guitar Hero number keys.
 * Both input modes are always active during practice - the chart style
 * only affects which keys are shown in the palette and KeyLane view.
 */
export type SupportedKey = 'up' | 'down' | 'left' | 'right' | '1' | '2' | '3' | '4' | '5';

/**
 * DDR-style arrow keys.
 *
 * Used for Dance Dance Revolution style charts with 4 lanes.
 * Classic colors: left=blue, down=green, up=red, right=purple
 */
export type DdrKey = 'up' | 'down' | 'left' | 'right';

/**
 * Guitar Hero-style number keys.
 *
 * Used for Guitar Hero style charts with 5 lanes.
 * Classic colors: 1=green, 2=red, 3=yellow, 4=blue, 5=orange
 */
export type GuitarKey = '1' | '2' | '3' | '4' | '5';

/**
 * KeyLane view mode for rhythm game visualizations.
 *
 * - 'off': Use default TapArea view
 * - 'ddr': Show 4-lane DDR visualization (left, down, up, right)
 * - 'guitar-hero': Show 5-lane Guitar Hero visualization (1-5)
 */
export type KeyLaneViewMode = 'off' | 'ddr' | 'guitar-hero';

/**
 * Chart editor state for managing the editor UI.
 *
 * Tracks the current editing mode, selected key, chart style,
 * and KeyLane visualization preferences.
 */
export interface ChartEditorState {
    /** Whether the chart editor panel is open */
    editorActive: boolean;
    /** Current chart style (DDR or Guitar Hero) */
    chartStyle: ChartStyle;
    /** Currently selected key for painting (null when not painting) */
    selectedKey: SupportedKey | null;
    /** Current editor mode (view, paint, or erase) */
    editorMode: ChartEditorMode;
    /** KeyLane visualization mode preference */
    keyLaneViewMode: KeyLaneViewMode;
}

/**
 * Default chart editor state.
 *
 * Charts default to DDR style as per design decision.
 */
export const DEFAULT_CHART_EDITOR_STATE: ChartEditorState = {
    editorActive: false,
    chartStyle: 'ddr',
    selectedKey: null,
    editorMode: 'view',
    keyLaneViewMode: 'off',
};

/**
 * Array of all DDR keys for iteration.
 */
export const DDR_KEYS: readonly DdrKey[] = ['left', 'down', 'up', 'right'] as const;

/**
 * Array of all Guitar Hero keys for iteration.
 */
export const GUITAR_KEYS: readonly GuitarKey[] = ['1', '2', '3', '4', '5'] as const;

/**
 * Check if a key is a DDR arrow key.
 *
 * @param key - The key to check
 * @returns True if the key is a DDR arrow key
 */
export function isDdrKey(key: string): key is DdrKey {
    return DDR_KEYS.includes(key as DdrKey);
}

/**
 * Check if a key is a Guitar Hero number key.
 *
 * @param key - The key to check
 * @returns True if the key is a Guitar Hero number key
 */
export function isGuitarKey(key: string): key is GuitarKey {
    return GUITAR_KEYS.includes(key as GuitarKey);
}

/**
 * Get the keys available for a given chart style.
 *
 * @param style - The chart style
 * @returns Array of keys available for that style
 */
export function getKeysForStyle(style: ChartStyle): readonly SupportedKey[] {
    return style === 'ddr' ? DDR_KEYS : GUITAR_KEYS;
}

/**
 * Display symbol for a supported key.
 *
 * Returns arrow symbols (↑↓←→) for DDR keys and numbers (1-5) for Guitar keys.
 *
 * @param key - The key to get the symbol for
 * @returns The display symbol
 */
export function getKeySymbol(key: SupportedKey): string {
    const symbols: Record<SupportedKey, string> = {
        up: '↑',
        down: '↓',
        left: '←',
        right: '→',
        '1': '1',
        '2': '2',
        '3': '3',
        '4': '4',
        '5': '5',
    };
    return symbols[key];
}

// ============================================================
// Level Import/Export Types (Task 1.5)
// ============================================================

// Import SubdivisionConfig for use in LevelExportData
import type { SubdivisionConfig } from 'playlist-data-engine';

/**
 * Beat data structure for level export.
 *
 * Contains the essential beat properties needed to reconstruct a beat map
 * with key assignments. Used in LevelExportData.beats array.
 */
export interface LevelExportBeat {
    /** Timestamp in seconds from the start of the audio */
    timestamp: number;
    /** Position of this beat within its measure (0-based) */
    beatInMeasure: number;
    /** Whether this beat is a downbeat (first beat of a measure) */
    isDownbeat: boolean;
    /** The measure number this beat belongs to (0-based) */
    measureNumber: number;
    /** Intensity value for this beat (0.0 - 1.0) */
    intensity: number;
    /** Detection confidence for this beat (0.0 - 1.0) */
    confidence: number;
    /** Required key for this beat (undefined if no key assigned) */
    requiredKey?: string;
}

/**
 * Complete level export data for saving and loading rhythm game levels.
 *
 * A "level" combines a beat map with a chart (key assignments). This structure
 * contains everything needed to reconstruct a playable rhythm game level:
 * - Beat timing data with key assignments
 * - Subdivision configuration (required keys only work with subdivided mode)
 * - Chart metadata for UI display
 *
 * @example
 * ```typescript
 * const levelData: LevelExportData = {
 *   version: 1,
 *   audioId: 'spotify-track-123',
 *   audioTitle: 'Song Name',
 *   exportedAt: Date.now(),
 *   beatCount: 100,
 *   beats: [...], // Array of LevelExportBeat
 *   subdivisionConfig: { subdivisionType: 'eighth', ... },
 *   chartStyle: 'ddr',
 *   metadata: {
 *     keyCount: 45,
 *     usedKeys: ['up', 'down', 'left', 'right'],
 *   },
 * };
 * ```
 */
export interface LevelExportData {
    /** Schema version for future migrations (currently always 1) */
    version: 1;
    /** Audio identifier - must match exactly when importing */
    audioId: string;
    /** Optional audio title for display purposes */
    audioTitle?: string;
    /** Unix timestamp when this level was exported */
    exportedAt: number;

    // Beat map data
    /** Total number of beats in the level */
    beatCount: number;
    /** Array of beat data with key assignments */
    beats: LevelExportBeat[];

    // Subdivision config (required keys only work with subdivided mode)
    /** The subdivision configuration used for this level */
    subdivisionConfig: SubdivisionConfig;

    // Chart metadata
    /** The chart style this level was authored for */
    chartStyle: ChartStyle;
    /** Metadata about key assignments in this level */
    metadata: {
        /** Number of beats that have a required key assigned */
        keyCount: number;
        /** Array of unique keys used in this level */
        usedKeys: string[];
    };
}

/**
 * Result of validating a level import.
 *
 * Used to provide detailed error messages when import validation fails.
 */
export interface LevelImportValidationResult {
    /** Whether the level data is valid for import */
    valid: boolean;
    /** Array of error messages if validation failed */
    errors: string[];
    /** Array of warning messages (non-blocking issues) */
    warnings: string[];
}

/**
 * Validates a LevelExportData structure.
 *
 * Checks that all required fields are present and correctly typed.
 * Does NOT validate audioId match or beat count - those are validated
 * separately during the import process.
 *
 * @param data - The data to validate
 * @returns Validation result with errors/warnings if invalid
 */
export function validateLevelExportData(data: unknown): LevelImportValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Type guard for basic object
    if (typeof data !== 'object' || data === null) {
        return { valid: false, errors: ['Data must be a non-null object'], warnings: [] };
    }

    const level = data as Record<string, unknown>;

    // Check required fields
    if (level.version !== 1) {
        errors.push(`version must be 1, got ${level.version}`);
    }

    if (typeof level.audioId !== 'string' || level.audioId.length === 0) {
        errors.push('audioId must be a non-empty string');
    }

    if (typeof level.exportedAt !== 'number' || level.exportedAt <= 0) {
        errors.push('exportedAt must be a positive number (unix timestamp)');
    }

    if (typeof level.beatCount !== 'number' || level.beatCount < 0) {
        errors.push('beatCount must be a non-negative number');
    }

    if (!Array.isArray(level.beats)) {
        errors.push('beats must be an array');
    } else {
        // Validate beat count matches array length
        if (level.beats.length !== level.beatCount) {
            errors.push(`beatCount (${level.beatCount}) does not match beats array length (${level.beats.length})`);
        }

        // Validate each beat has required fields
        for (let i = 0; i < level.beats.length; i++) {
            const beat = level.beats[i] as Record<string, unknown>;
            if (typeof beat !== 'object' || beat === null) {
                errors.push(`beats[${i}] must be an object`);
                continue;
            }
            if (typeof beat.timestamp !== 'number') {
                errors.push(`beats[${i}].timestamp must be a number`);
            }
            if (typeof beat.beatInMeasure !== 'number') {
                errors.push(`beats[${i}].beatInMeasure must be a number`);
            }
            if (typeof beat.isDownbeat !== 'boolean') {
                errors.push(`beats[${i}].isDownbeat must be a boolean`);
            }
            if (typeof beat.measureNumber !== 'number') {
                errors.push(`beats[${i}].measureNumber must be a number`);
            }
            if (typeof beat.intensity !== 'number') {
                errors.push(`beats[${i}].intensity must be a number`);
            }
            if (typeof beat.confidence !== 'number') {
                errors.push(`beats[${i}].confidence must be a number`);
            }
            if (beat.requiredKey !== undefined && typeof beat.requiredKey !== 'string') {
                errors.push(`beats[${i}].requiredKey must be a string if present`);
            }
        }
    }

    if (typeof level.subdivisionConfig !== 'object' || level.subdivisionConfig === null) {
        errors.push('subdivisionConfig must be an object');
    }

    if (level.chartStyle !== 'ddr' && level.chartStyle !== 'guitar-hero') {
        errors.push(`chartStyle must be 'ddr' or 'guitar-hero', got '${level.chartStyle}'`);
    }

    if (typeof level.metadata !== 'object' || level.metadata === null) {
        errors.push('metadata must be an object');
    } else {
        const metadata = level.metadata as Record<string, unknown>;
        if (typeof metadata.keyCount !== 'number') {
            errors.push('metadata.keyCount must be a number');
        }
        if (!Array.isArray(metadata.usedKeys)) {
            errors.push('metadata.usedKeys must be an array');
        }
    }

    // Add warnings for optional fields
    if (!level.audioTitle) {
        warnings.push('audioTitle is missing - this is optional but recommended');
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}
