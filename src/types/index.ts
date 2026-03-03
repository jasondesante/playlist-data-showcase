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
    ISessionTracker
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
 * Extended button press result that includes 'ok' accuracy level and beat source.
 *
 * Extends the engine's ButtonPressResult to use ExtendedBeatAccuracy and
 * includes source information to distinguish detected vs interpolated beats.
 */
export interface ExtendedButtonPressResult {
    /** Accuracy level of the press (includes 'ok') */
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
 * Perfect window: ±75ms
 */
export const EASY_ACCURACY_THRESHOLDS: AccuracyThresholds = {
    perfect: 0.075,  // ±75ms
    great: 0.125,    // ±125ms
    good: 0.175,     // ±175ms
    ok: 0.250,       // ±250ms
};

/**
 * Medium difficulty thresholds - balanced timing.
 * Perfect window: ±45ms
 */
export const MEDIUM_ACCURACY_THRESHOLDS: AccuracyThresholds = {
    perfect: 0.045,  // ±45ms
    great: 0.090,    // ±90ms
    good: 0.135,     // ±135ms
    ok: 0.200,       // ±200ms
};

/**
 * Hard difficulty thresholds - strict timing for veterans.
 * Perfect window: ±10ms
 */
export const HARD_ACCURACY_THRESHOLDS: AccuracyThresholds = {
    perfect: 0.010,  // ±10ms
    great: 0.025,    // ±25ms
    good: 0.050,     // ±50ms
    ok: 0.100,       // ±100ms
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
