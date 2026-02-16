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
    CustomThresholds
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
