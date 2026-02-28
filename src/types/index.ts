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
 * difficulty curve. The engine only supports 'perfect' | 'great' | 'good' | 'miss'.
 */
export type ExtendedBeatAccuracy = 'perfect' | 'great' | 'good' | 'ok' | 'miss';

/**
 * Extended button press result that includes 'ok' accuracy level.
 *
 * Extends the engine's ButtonPressResult to use ExtendedBeatAccuracy.
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
