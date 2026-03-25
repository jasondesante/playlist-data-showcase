/**
 * Level Generation Types
 *
 * Re-exports types from playlist-data-engine for the pitch detection and level generation feature.
 * Also defines local types for data structures that aren't exported from the engine's main index.
 *
 * (Task 0.5)
 */

// Import types needed for local interface definitions
import type {
    GeneratedLevel as GeneratedLevelType,
    PitchAtBeat,
    BandPitchAtBeat,
} from 'playlist-data-engine';

// ============================================================================
// PITCH DETECTION TYPES (from playlist-data-engine)
// ============================================================================

export type {
    /** Result of pitch detection at a single timestamp */
    PitchResult,
    /** Configuration for the pitch detector */
    PitchDetectorConfig,
} from 'playlist-data-engine';

// ============================================================================
// PITCH-BEAT LINKER TYPES (from playlist-data-engine)
// ============================================================================

export type {
    /** Pitch information linked to a beat timestamp */
    PitchAtBeat,
    /** Pitch information for a specific frequency band at a beat */
    BandPitchAtBeat,
    /** Complete linked pitch analysis result */
    LinkedPitchAnalysis,
    /** Direction of pitch movement between beats */
    PitchDirection,
    /** Category of interval size between consecutive pitches */
    IntervalCategory,
} from 'playlist-data-engine';

// ============================================================================
// BUTTON MAPPING TYPES (from playlist-data-engine)
// ============================================================================

export type {
    /** Controller mode selection (DDR or Guitar Hero) */
    ControllerMode,
    /** DDR button types */
    DDRButton,
    /** Guitar Hero button types */
    GuitarHeroButton,
    /** Generic button type (DDR or Guitar Hero) */
    Button,
    /** Configuration for button mapping */
    ButtonMappingConfig,
    /** Result of mapping beats to buttons */
    MappedLevelResult,
    /** Metadata about the button mapping process */
    ButtonMappingMetadata,
} from 'playlist-data-engine';

// ============================================================================
// LEVEL GENERATION TYPES (from playlist-data-engine)
// ============================================================================

export type {
    /** Options for level generation */
    LevelGenerationOptions,
    /** Metadata about the generated level */
    LevelMetadata,
    /** Complete generated level with chart, rhythm, and pitch analysis */
    GeneratedLevel,
    /** Progress information during level generation */
    LevelGenerationProgress,
    /** Result of generating all difficulty variants */
    AllDifficultiesResult,
} from 'playlist-data-engine';

// Re-export the LevelGenerator class and utilities
export {
    LevelGenerator,
    type LevelProgressCallback,
} from 'playlist-data-engine';

// ============================================================================
// CHARTED BEAT MAP TYPES (from playlist-data-engine)
// ============================================================================

export type {
    /** A beat with button assignment for gameplay */
    ChartedBeat,
    /** Complete playable chart with beats and metadata */
    ChartedBeatMap,
    /** Metadata specific to the charted beat map */
    ChartMetadata,
} from 'playlist-data-engine';

// ============================================================================
// MELODY CONTOUR TYPES (local definitions)
// These types exist in the engine but are not exported from the main index.
// ============================================================================

/**
 * Direction statistics for melody contour analysis.
 * Counts of beats with each pitch direction category.
 */
export interface DirectionStats {
    /** Number of beats with ascending pitch */
    up: number;
    /** Number of beats with descending pitch */
    down: number;
    /** Number of beats with stable pitch */
    stable: number;
    /** Number of beats with no pitch detected */
    none: number;
}

/**
 * Interval statistics for melody contour analysis.
 * Counts of intervals by size category.
 */
export interface IntervalStats {
    /** Unison intervals (0 semitones) */
    unison: number;
    /** Small intervals (1-2 semitones) */
    small: number;
    /** Medium intervals (3-4 semitones) */
    medium: number;
    /** Large intervals (5-7 semitones) */
    large: number;
    /** Very large intervals (8+ semitones) */
    very_large: number;
}

/**
 * A segment of consecutive beats with the same pitch direction.
 */
export interface MelodySegment {
    /** Start beat index */
    startBeat: number;
    /** End beat index (inclusive) */
    endBeat: number;
    /** Direction of the segment */
    direction: 'up' | 'down' | 'stable' | 'none';
    /** Starting note */
    startNote: string | null;
    /** Ending note */
    endNote: string | null;
    /** Total semitones spanned */
    semitonesSpanned: number;
}

/**
 * Melody contour data structure.
 * Contains the segments and pitch contour information.
 */
export interface MelodyContour {
    /** Segments of consecutive same-direction beats */
    segments: MelodySegment[];
    /** Overall contour shape description */
    shape: 'ascending' | 'descending' | 'arch' | 'valley' | 'mixed' | 'flat';
}

/**
 * Result of melody contour analysis.
 * Contains pitch analysis results and statistics.
 */
export interface MelodyContourAnalysisResult {
    /** Direction statistics */
    directionStats: DirectionStats;
    /** Interval statistics */
    intervalStats: IntervalStats;
    /** Dominant frequency band used for analysis */
    dominantBand: string;
    /** Total beats analyzed */
    totalBeats: number;
    /** Beats with voiced pitch detected */
    voicedBeats: number;
    /** Overall melody direction */
    overallDirection: 'ascending' | 'descending' | 'stable' | 'mixed';
    /** Pitch range information */
    pitchRange: {
        minNote: string;
        maxNote: string;
        semitones: number;
    } | null;
    /** Melody contour segments and shape */
    contour?: MelodyContour;
    /** Pitch data linked to beats (from engine) */
    pitchByBeat?: PitchAtBeat[];
    /** Band-specific pitch data (from engine) */
    bandPitches?: Map<string, BandPitchAtBeat> | Record<string, BandPitchAtBeat>;
}

// ============================================================================
// DIFFICULTY TYPES
// ============================================================================

/**
 * Available difficulty levels for generated levels.
 */
export type DifficultyLevel = 'natural' | 'easy' | 'medium' | 'hard';

/**
 * All difficulty variants including the natural (unedited) variant.
 * Extends the engine's AllDifficultiesResult.
 */
export interface AllDifficultiesWithNatural {
    /** Easy difficulty - simplified for beginners */
    easy: GeneratedLevelType;
    /** Medium difficulty - default balance */
    medium: GeneratedLevelType;
    /** Hard difficulty - maximum density */
    hard: GeneratedLevelType;
    /** Natural difficulty - unedited composite stream (optional) */
    natural?: GeneratedLevelType;
}
