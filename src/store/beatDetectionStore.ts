/**
 * Beat Detection Store
 *
 * Manages state for the beat detection feature including:
 * - Beat map generation and caching
 * - Practice mode state
 * - Tap accuracy history
 *
 * Uses zustand with persist middleware for localStorage caching of beat maps.
 */

import { useMemo } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage, type PersistStorage, type StorageValue } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { storage } from '@/utils/storage';
import { logger } from '@/utils/logger';
import { useRhythmXPConfigStore } from './rhythmXPConfigStore';
import {
    BeatMap,
    BeatMapGeneratorOptions,
    BeatMapGenerationProgress,
    DifficultyPreset,
    AccuracyThresholds,
    getAccuracyThresholdsForPreset,
    ExtendedButtonPressResult,
    HopSizeConfig,
    MelBandsConfig,
    GaussianSmoothConfig,
    HOP_SIZE_PRESETS,
    MEL_BANDS_PRESETS,
    GAUSSIAN_SMOOTH_PRESETS,
    getHopSizeMs,
    getMelBands,
    getGaussianSmoothMs,
    // Interpolation types
    BeatInterpolationOptions,
    InterpolatedBeatMap,
    // InterpolationAlgorithm - REMOVED: Engine now uses only adaptive-phase-locked
    BeatStreamMode,
    DEFAULT_BEAT_INTERPOLATION_OPTIONS,
    InterpolationVisualizationData,
    // Downbeat configuration types
    DownbeatConfig,
    DownbeatSegment,
    DEFAULT_DOWNBEAT_CONFIG,
    reapplyDownbeatConfig,
    // Multi-tempo types
    TempoSection,
    // Subdivision types (Phase 3: Task 3.1 - Per-beat format)
    SubdivisionType,
    SubdivisionConfig,
    UnifiedBeatMap,
    SubdividedBeatMap,
    SubdivisionPlaybackOptions,
    DEFAULT_SUBDIVISION_CONFIG,
    DEFAULT_SUBDIVISION_PLAYBACK_OPTIONS,
    // Chart Editor types (Phase 2: Task 2.1 - Required Keys)
    ChartStyle,
    ChartEditorMode,
    SupportedKey,
    KeyLaneViewMode,
    DEFAULT_CHART_EDITOR_STATE,
    KeyAssignment,
// Level Import/Export types (Phase 2: Task 2.5)
LevelExportData,
    LevelExportBeat,
    LevelImportValidationResult,
    validateLevelExportData,
    // Full Beat Map Export types (Complete State Export)
    FullBeatMapExportData,
    validateFullBeatMapExportData,
    getKeyCount,
    getUsedKeys,
    // Groove Analyzer types (Phase 2: Task 2.1 - Groove State)
    GrooveState,
    GrooveResult,
    ExtendedBeatAccuracy,
    // Rhythm XP types (Phase 1: Task 1.2 - Runtime State)
    RhythmXPResult,
    RhythmSessionTotals,
    ComboEndBonusResult,
    GrooveEndBonusResult,
    GrooveStats,  // For groove end bonus parameter (Phase 1: Task 1.3)
    // Groove Penalty types
    GroovePenaltyConfig,
    getGroovePenaltiesForPreset,
    // Accuracy Threshold constants
    HARD_ACCURACY_THRESHOLDS,
    // Combo breaking helper
    shouldAccuracyBreakCombo,
} from '@/types';
import {
    BeatMapGenerator,
    BeatInterpolator,
    BeatSubdivider,
    SubdivisionPlaybackController,
    unifyBeatMap,
    GrooveAnalyzer,
    RhythmXPCalculator,
    // Rhythm Generation types (Task 1.1)
    type GeneratedRhythm,
    // Level Generation types (Task 0.1)
    type GeneratedLevel,
    type AllDifficultiesResult,
    // Pitch types (Task 0.1)
    type PitchAtBeat,
} from 'playlist-data-engine';
import type { MelodyContour } from '@/types/levelGeneration';

/**
 * TapResult extends ExtendedButtonPressResult with additional metadata for history tracking.
 */
export interface TapResult extends ExtendedButtonPressResult {
    /** Timestamp when the tap occurred (audio context time) */
    tappedAt: number;
    /** Index of the tap in the session */
    tapIndex: number;
}

/**
 * Direction statistics for melody contour metadata.
 * (Task 0.1 - Local definition since not exported from main package)
 */
export interface DirectionStats {
    up: number;
    down: number;
    stable: number;
    none: number;
}

/**
 * Interval statistics for melody contour metadata.
 * (Task 0.1 - Local definition since not exported from main package)
 */
export interface IntervalStats {
    unison: number;
    small: number;
    medium: number;
    large: number;
    very_large: number;
}

/**
 * Result of melody contour analysis.
 * (Task 0.1 - Local definition since not exported from main package)
 *
 * This interface matches the engine's MelodyContourAnalysisResult type
 * and will be populated from the GeneratedLevel.pitchAnalysis field.
 */
export interface MelodyContourAnalysisResult {
    /** Pitch data linked to beats (variant pitches for gameplay) */
    pitchByBeat: PitchAtBeat[];
    /** Melody contour from composite pitches */
    melodyContour: MelodyContour;
    /** Direction statistics */
    directionStats: DirectionStats;
    /** Interval statistics */
    intervalStats: IntervalStats;
    /** Analysis metadata */
    metadata: {
        totalBeats: number;
        voicedBeats: number;
        directionCalculatedBeats: number;
    };
}

/**
 * Progress information during level generation.
 * (Task 0.1 - Local definition since not exported from main package)
 *
 * This matches the engine's LevelGenerationProgress interface.
 */
export interface LevelGenerationProgress {
    /** Current stage of generation */
    stage: 'rhythm' | 'pitch' | 'buttons' | 'conversion' | 'finalizing';
    /** Progress within current stage (0-1) */
    progress: number;
    /** Human-readable status message */
    message: string;
}

/**
 * All difficulty variants of the generated level.
 * Extends the engine's AllDifficultiesResult to include the 'natural' variant.
 * (Task 0.1)
 */
export interface AllDifficultiesWithNatural extends AllDifficultiesResult {
    natural?: GeneratedLevel;
}

/**
 * Maximum number of taps to keep in history.
 * Limits memory usage and prevents O(n) slowdown in statistics calculations.
 * Increased to 1000 since the debug display is now virtualized.
 */
const MAX_TAP_HISTORY_SIZE = 1000;

/**
 * Default OSE mode configurations.
 * These track the user's selected mode for each OSE parameter.
 */
const DEFAULT_HOP_SIZE_CONFIG: HopSizeConfig = {
    mode: 'standard',
};

const DEFAULT_MEL_BANDS_CONFIG: MelBandsConfig = {
    mode: 'standard',
};

const DEFAULT_GAUSSIAN_SMOOTH_CONFIG: GaussianSmoothConfig = {
    mode: 'standard',
};

/**
 * Default options for beat map generation.
 * Matches the engine's defaults.
 *
 * Note: The raw numeric values (hopSizeMs, melBands, gaussianSmoothMs) are
 * resolved from the OSE config modes by the helper functions before being
 * passed to the engine. The OSE config objects track the user's selected modes.
 */
const DEFAULT_GENERATOR_OPTIONS: BeatMapGeneratorOptions = {
    minBpm: 60,
    maxBpm: 180,
    sensitivity: 1.0,  // Pre-processing sensitivity (0.1-10.0)
    filter: 0.0,       // Post-processing grid-alignment filter (0.0-1.0)
    noiseFloorThreshold: 0,  // Changed from 0.1 - was filtering out too many valid beats
    hopSizeMs: HOP_SIZE_PRESETS.standard.value,  // 4ms - resolved from 'standard' mode
    fftSize: 2048,
    rollingBpmWindowSize: 8,
    dpAlpha: 680,
    melBands: MEL_BANDS_PRESETS.standard.value,  // 40 bands - resolved from 'standard' mode
    highPassCutoff: 0.4,
    gaussianSmoothMs: GAUSSIAN_SMOOTH_PRESETS.standard.value,  // 20ms - resolved from 'standard' mode
    tempoCenter: 0.5,
    tempoWidth: 1.4,
    useOctaveResolution: false,  // Opt-in - uses TPS2 to prevent half-tempo/double-tempo errors
    useTripleMeter: false,  // Opt-in - uses TPS3 for triple meter detection (waltzes, 6/8 shuffles)
};

/**
 * Maximum number of beat maps to cache before automatic eviction.
 * This prevents unbounded memory/storage growth for users who analyze many tracks.
 */
const MAX_CACHED_BEAT_MAPS = 20;

/**
 * Number of old caches to remove when the limit is reached.
 */
const EVICTION_COUNT = 5;

// ============================================================
// TASK 3.5: OSE Config Tracking for "Re-Analyze Needed" Indicator
// ============================================================

/**
 * Snapshot of OSE configs used to generate a beat map.
 * Used to detect when settings have changed and re-analysis is needed.
 */
export interface OSEConfigSnapshot {
    /** Hop size configuration at generation time */
    hopSizeConfig: HopSizeConfig;
    /** Mel bands configuration at generation time */
    melBandsConfig: MelBandsConfig;
    /** Gaussian smooth configuration at generation time */
    gaussianSmoothConfig: GaussianSmoothConfig;
}

/**
 * Compare two OSE config snapshots to detect if settings have changed.
 *
 * @param a - First OSE config snapshot
 * @param b - Second OSE config snapshot
 * @returns true if configs are different (re-analysis needed)
 */
export const oseConfigsDiffer = (a: OSEConfigSnapshot | null, b: OSEConfigSnapshot | null): boolean => {
    // If both are null, no difference
    if (a === null && b === null) return false;
    // If one is null and other isn't, they differ
    if (a === null || b === null) return true;

    // Compare hop size configs
    if (a.hopSizeConfig.mode !== b.hopSizeConfig.mode) return true;
    if (a.hopSizeConfig.mode === 'custom' && a.hopSizeConfig.customValue !== b.hopSizeConfig.customValue) return true;

    // Compare mel bands configs
    if (a.melBandsConfig.mode !== b.melBandsConfig.mode) return true;

    // Compare gaussian smooth configs
    if (a.gaussianSmoothConfig.mode !== b.gaussianSmoothConfig.mode) return true;

    return false;
};

/**
 * Create an OSE config snapshot from the current store state.
 *
 * @param hopSizeConfig - Current hop size config
 * @param melBandsConfig - Current mel bands config
 * @param gaussianSmoothConfig - Current gaussian smooth config
 * @returns An OSE config snapshot
 */
export const createOSEConfigSnapshot = (
    hopSizeConfig: HopSizeConfig,
    melBandsConfig: MelBandsConfig,
    gaussianSmoothConfig: GaussianSmoothConfig
): OSEConfigSnapshot => ({
    hopSizeConfig: { ...hopSizeConfig },
    melBandsConfig: { ...melBandsConfig },
    gaussianSmoothConfig: { ...gaussianSmoothConfig },
});

/**
 * Snapshot of interpolation config for comparing settings changes.
 */
export interface InterpolationConfigSnapshot {
    interpolationOptions: BeatInterpolationOptions;
    /** Whether automatic multi-tempo analysis was enabled when this config was created */
    autoMultiTempo: boolean;
    // selectedAlgorithm removed - engine uses only adaptive-phase-locked
}

/**
 * Check if two interpolation config snapshots differ.
 *
 * @param a - First snapshot
 * @param b - Second snapshot
 * @returns True if the configs differ
 */
export const interpolationConfigsDiffer = (
    a: InterpolationConfigSnapshot | null,
    b: InterpolationConfigSnapshot | null
): boolean => {
    // If both are null, no difference
    if (a === null && b === null) return false;
    // If one is null and other isn't, they differ
    if (a === null || b === null) return true;

    // Compare all interpolation options
    const optsA = a.interpolationOptions;
    const optsB = b.interpolationOptions;

    if (optsA.minAnchorConfidence !== optsB.minAnchorConfidence) return true;
    if (optsA.gridSnapTolerance !== optsB.gridSnapTolerance) return true;
    if (optsA.tempoAdaptationRate !== optsB.tempoAdaptationRate) return true;
    if (optsA.extrapolateStart !== optsB.extrapolateStart) return true;
    if (optsA.extrapolateEnd !== optsB.extrapolateEnd) return true;
    if (optsA.anomalyThreshold !== optsB.anomalyThreshold) return true;
    if (optsA.denseSectionMinBeats !== optsB.denseSectionMinBeats) return true;
    if (optsA.gridAlignmentWeight !== optsB.gridAlignmentWeight) return true;
    if (optsA.anchorConfidenceWeight !== optsB.anchorConfidenceWeight) return true;
    if (optsA.paceConfidenceWeight !== optsB.paceConfidenceWeight) return true;

    // Compare autoMultiTempo setting
    if (a.autoMultiTempo !== b.autoMultiTempo) return true;

    return false;
};

/**
 * Create an interpolation config snapshot from the current store state.
 *
 * @param interpolationOptions - Current interpolation options
 * @param autoMultiTempo - Whether automatic multi-tempo analysis is enabled
 * @returns An interpolation config snapshot
 */
export const createInterpolationConfigSnapshot = (
    interpolationOptions: BeatInterpolationOptions,
    autoMultiTempo: boolean
): InterpolationConfigSnapshot => ({
    interpolationOptions: { ...interpolationOptions },
    autoMultiTempo,
});

/**
 * Difficulty settings for beat tap evaluation.
 *
 * Controls the timing thresholds used to rate tap accuracy.
 * Also controls groove meter penalties for miss/wrongKey and breaking pocket.
 */
export interface DifficultySettings {
    /** Current difficulty preset */
    preset: DifficultyPreset;
    /** Custom thresholds (used when preset is 'custom') */
    customThresholds: Partial<AccuracyThresholds>;
    /** Custom groove penalties (used when preset is 'custom') */
    customGroovePenalties: Partial<GroovePenaltyConfig>;
    /** Ignore required key assignments on beats (easy mode - timing-only evaluation) */
    ignoreKeyRequirements: boolean;
}

/**
 * Default difficulty settings.
 * Starts with 'medium' as a reasonable default for most players.
 */
const DEFAULT_DIFFICULTY_SETTINGS: DifficultySettings = {
    preset: 'medium',
    customThresholds: {},
    customGroovePenalties: {},
    ignoreKeyRequirements: false,
};

interface BeatDetectionState {
    /** The currently loaded beat map (or null if none) */
    beatMap: BeatMap | null;
    /** Whether beat map generation is in progress */
    isGenerating: boolean;
    /** Current generation progress (null when not generating) */
    generationProgress: BeatMapGenerationProgress | null;
    /** Options for beat map generation (raw numeric values passed to engine) */
    generatorOptions: BeatMapGeneratorOptions;
    /** OSE Hop Size configuration (mode-based selection) */
    hopSizeConfig: HopSizeConfig;
    /** OSE Mel Bands configuration (mode-based selection) */
    melBandsConfig: MelBandsConfig;
    /** OSE Gaussian Smoothing configuration (mode-based selection) */
    gaussianSmoothConfig: GaussianSmoothConfig;
    /** OSE config snapshot used to generate the current beat map (for re-analyze indicator) */
    lastGeneratedOSEConfig: OSEConfigSnapshot | null;
    /** Cached beat maps indexed by audio ID for localStorage persistence */
    cachedBeatMaps: Record<string, BeatMap>;
    /** Order of cache insertion (for LRU eviction) - stores audio IDs */
    cacheOrder: string[];
    /** Whether practice mode is currently active */
    practiceModeActive: boolean;
    /** Running history of tap accuracy results */
    tapHistory: TapResult[];
    /** Error message if generation failed */
    error: string | null;
    /** Storage error message (e.g., quota exceeded) */
    storageError: string | null;
    /** Difficulty settings for beat tap evaluation */
    difficultySettings: DifficultySettings;
    // Interpolation state
    /** Options for beat interpolation */
    interpolationOptions: BeatInterpolationOptions;
    /** The interpolated beat map (generated from beatMap) */
    interpolatedBeatMap: InterpolatedBeatMap | null;
    // selectedAlgorithm removed - engine uses only adaptive-phase-locked
    /** Current beat stream mode for practice/playback */
    beatStreamMode: BeatStreamMode;
    /** Whether to show interpolation visualization in timeline */
    showInterpolationVisualization: boolean;
    /** Whether to show the quarter note grid overlay in timeline (Task 5.3) */
    showGridOverlay: boolean;
    /** Whether to show the tempo drift visualization in timeline (Task 5.4) */
    showTempoDriftVisualization: boolean;
    /** Interpolation config snapshot used to generate the current interpolated beat map (for re-analyze indicator) */
    lastGeneratedInterpolationConfig: InterpolationConfigSnapshot | null;
    /** Cached interpolated beat maps indexed by audio ID for localStorage persistence */
    cachedInterpolatedBeatMaps: Record<string, InterpolatedBeatMap>;
    // Downbeat configuration state
    /** Current downbeat configuration (null = using default: beat 0 is downbeat, 4/4 time) */
    downbeatConfig: DownbeatConfig | null;
    /** Whether to show measure boundary lines and numbers in timeline (Phase 4: Measure Visualization) */
    showMeasureBoundaries: boolean;
    /** Whether downbeat selection mode is active (Phase 5: BeatMapSummary Integration - Task 5.3) */
    isDownbeatSelectionMode: boolean;
    /** Whether automatic multi-tempo analysis is enabled (default: true) */
    autoMultiTempo: boolean;

    // ============================================================
    // Subdivision State (Phase 2: Task 2.1)
    // ============================================================

    /**
     * Unified beat map - a flattened grid of quarter notes derived from InterpolatedBeatMap.
     * This serves as the foundation for both pre-calculated and real-time subdivision.
     */
    unifiedBeatMap: UnifiedBeatMap | null;

    /**
     * Pre-calculated subdivided beat map with custom subdivision patterns.
     * Generated by BeatSubdivider using subdivisionConfig.
     * Used in AudioAnalysisTab for level creation and export.
     */
    subdividedBeatMap: SubdividedBeatMap | null;

    /**
     * Current subdivision configuration.
     * Per-beat subdivision format: each beat can have its own subdivision type.
     * Beats not in the beatSubdivisions map use the defaultSubdivision.
     * Persisted to localStorage.
     */
    subdivisionConfig: SubdivisionConfig;

    /**
     * Current subdivision type for real-time mode.
     * Used in BeatPracticeView for the subdivision playground.
     * Defaults to 'quarter' (no subdivision).
     */
    currentSubdivision: SubdivisionType;

    /**
     * Pending subdivision change that will be applied at the next transition point.
     * Set when transitionMode is 'next-downbeat' or 'next-measure'.
     * Null when there's no pending change or transition mode is 'immediate'.
     */
    pendingSubdivision: SubdivisionType | null;

    /**
     * Transition mode for subdivision changes in real-time mode.
     * Controls how subdivision changes are applied during playback.
     * - 'immediate': Switch instantly (default, more playful)
     * - 'next-downbeat': Wait for beat 1 of next measure
     * - 'next-measure': Wait for start of next measure
     * Persisted to localStorage.
     */
    subdivisionTransitionMode: 'immediate' | 'next-downbeat' | 'next-measure';

    /**
     * Cached unified beat maps indexed by audio ID for localStorage persistence.
     */
    cachedUnifiedBeatMaps: Record<string, UnifiedBeatMap>;

    /**
     * Cached subdivided beat maps indexed by audio ID for localStorage persistence.
     */
    cachedSubdividedBeatMaps: Record<string, SubdividedBeatMap>;

    // ============================================================
    // Chart Editor State (Phase 2: Task 2.1 - Required Keys)
    // ============================================================

    /**
     * Whether the chart editor panel is open/active.
     * Chart editor is only available when subdividedBeatMap exists.
     */
    chartEditorActive: boolean;

    /**
     * Current chart style - determines which keys are available.
     * 'ddr' shows arrow keys (up/down/left/right)
     * 'guitar-hero' shows number keys (1-5)
     * Default is 'ddr'.
     */
    chartStyle: ChartStyle;

    /**
     * Currently selected key for painting beats.
     * Null when no key is selected (view mode or no painting).
     */
    selectedKey: SupportedKey | null;

    /**
     * Current chart editor mode.
     * - 'view': View-only mode, no editing
     * - 'paint': Click/drag to assign selected key to beats
     * - 'erase': Click to remove key from beats
     */
    editorMode: ChartEditorMode;

    /**
     * KeyLane visualization mode for practice/playback.
     * - 'off': Use default TapArea view
     * - 'ddr': Show DDR 4-lane view
     * - 'guitar-hero': Show Guitar Hero 5-lane view
     */
    keyLaneViewMode: KeyLaneViewMode;

    // ============================================================
    // Groove Analyzer State (Phase 2: Task 2.1 - Groove State)
    // ============================================================

    /**
     * The GrooveAnalyzer instance for tracking timing consistency.
     * Created when practice mode starts, reset on seek/track change.
     */
    grooveAnalyzer: GrooveAnalyzer | null;

    /**
     * Current groove state snapshot from the analyzer.
     * Updated after each recordHit() or recordMiss() call.
     */
    grooveState: GrooveState | null;

    /**
     * Highest hotness achieved in the current session (0-100).
     * Persisted across groove resets to show best achievement.
     */
    bestGrooveHotness: number;

    /**
     * Highest streak achieved in the current session.
     * Persisted across groove resets to show best achievement.
     */
    bestGrooveStreak: number;

    // ============================================================
    // Rhythm XP Runtime State (Phase 1: Task 1.2)
    // NOTE: Config is stored separately in rhythmXPConfigStore
    // ============================================================

    /**
     * The RhythmXPCalculator instance for tracking XP during practice.
     * Created when practice mode starts with config from rhythmXPConfigStore.
     */
    rhythmXPCalculator: RhythmXPCalculator | null;

    /**
     * Current session totals from the RhythmXPCalculator.
     * Updated after each hit for real-time UI display.
     */
    rhythmSessionTotals: RhythmSessionTotals | null;

    /**
     * Last XP result from a button press.
     * Used for real-time XP feedback display.
     */
    lastRhythmXPResult: RhythmXPResult | null;

    /**
     * Current combo count (consecutive hits without miss/wrongKey).
     * IMPORTANT: This is DIFFERENT from groove streak!
     * - Combo resets on: miss, wrongKey
     * - Groove streak resets on: hotness=0, direction change
     * Passed to RhythmXPCalculator.recordHit() as comboLength.
     */
    currentCombo: number;

    /**
     * Maximum combo achieved in current session.
     * Updated when currentCombo exceeds previous max.
     */
    maxCombo: number;

    /**
     * Previous combo length (before current hit).
     * Used to detect combo breaks for end bonus calculation.
     */
    previousComboLength: number;

    /**
     * Pending combo end bonus (displayed when combo breaks).
     * Cleared after being shown in UI.
     */
    pendingComboEndBonus: ComboEndBonusResult | null;

    /**
     * Pending groove end bonus (displayed when groove ends).
     * Cleared after being shown in UI.
     */
    pendingGrooveEndBonus: GrooveEndBonusResult | null;

    // ============================================================
    // Step Navigation State (Phase 1: Task 1.1)
    // ============================================================

    /**
     * Current step in the beat detection wizard UI.
     * - 1: Analyze (song info + settings + analyze button)
     * - 2: Subdivide (subdivision settings)
     * - 3: Chart (chart editor)
     * - 4: Ready (practice/export)
     */
    currentStep: 1 | 2 | 3 | 4;

    /**
     * Previous step number for determining slide animation direction.
     * Null when no navigation has occurred yet.
     * Used to determine if we're navigating forward (slide left) or backward (slide right).
     */
    previousStep: number | null;

    // ============================================================
    // Rhythm Generation State (Task 1.1)
    // ============================================================

    /**
     * Generation mode for the beat detection wizard.
     * - 'manual': 4-step wizard (Analyze → Subdivide → Chart → Ready)
     * - 'automatic': 3-step wizard (Analyze → Rhythm Generation → Ready)
     * Default: 'manual' (NOT persisted - always start in manual mode)
     */
    generationMode: 'manual' | 'automatic';

    /**
     * Generated rhythm data from the RhythmGenerator.
     * This is session-only state (NOT persisted to localStorage).
     * Cleared when track changes or when switching from auto to manual mode.
     */
    generatedRhythm: GeneratedRhythm | null;

    /**
     * Progress state for rhythm generation pipeline.
     * Tracks the current phase and progress percentage.
     * Phases: multiBand → transients → quantize → phrases → composite → balancing → variants
     */
    rhythmGenerationProgress: {
        phase: 'multiBand' | 'transients' | 'quantize' | 'phrases' | 'composite' | 'balancing' | 'variants';
        progress: number;
        message: string;
    } | null;

    // ============================================================
    // Level Generation State (Task 0.1)
    // ============================================================

    /**
     * Generated level for the currently selected difficulty.
     * This is session-only state (NOT persisted to localStorage).
     * Cleared when track changes or when switching from auto to manual mode.
     */
    generatedLevel: GeneratedLevel | null;

    /**
     * All difficulty variants of the generated level.
     * Contains easy, medium, hard, and natural variants.
     * This is session-only state (NOT persisted to localStorage).
     */
    allDifficultyLevels: AllDifficultiesWithNatural | null;

    /**
     * Progress state for level generation pipeline.
     * Tracks the current stage and progress percentage.
     * Stages: rhythm → pitch → buttons → conversion → finalizing
     */
    levelGenerationProgress: LevelGenerationProgress | null;

    /**
     * Pitch analysis results from melody contour analysis.
     * Contains direction stats, interval stats, and pitch-by-beat data.
     * This is session-only state (NOT persisted to localStorage).
     */
    pitchAnalysis: MelodyContourAnalysisResult | null;

    /**
     * Currently selected difficulty level for display.
     * Determines which variant from allDifficultyLevels is shown in the UI.
     * Default: 'medium'
     */
    selectedDifficulty: 'natural' | 'easy' | 'medium' | 'hard';

    // ============================================================
    // Rhythm Validation State (Task 0.7)
    // ============================================================

    /**
     * Validation result for the generated rhythm.
     * Used to verify the data contract before level generation.
     * This is session-only state (NOT persisted to localStorage).
     */
    rhythmValidation: {
        isValid: boolean;
        errors: string[];
        summary: string;
    } | null;
}

interface BeatDetectionActions {
    /**
     * Generate a beat map from an audio URL.
     * Uses cached beat map if available (unless forceRegenerate is true).
     * @param audioUrl - URL of the audio file
     * @param audioId - Unique identifier for the audio (used for caching)
     * @param options - Optional override for generator options
     * @param forceRegenerate - If true, regenerate even if cached version exists
     */
    generateBeatMap: (
        audioUrl: string,
        audioId: string,
        options?: Partial<BeatMapGeneratorOptions>,
        forceRegenerate?: boolean
    ) => Promise<BeatMap | null>;

    /**
     * Cancel an ongoing beat map generation.
     */
    cancelGeneration: () => void;

    /**
     * Update the generator options.
     * These will be used for subsequent beat map generations.
     * @param options - Partial options to merge with existing options
     */
    setGeneratorOptions: (options: Partial<BeatMapGeneratorOptions>) => void;

    /**
     * Set the hop size configuration.
     * Updates both the config mode and resolves the numeric value in generatorOptions.
     * @param config - The hop size configuration
     */
    setHopSizeConfig: (config: HopSizeConfig) => void;

    /**
     * Set the mel bands configuration.
     * Updates both the config mode and resolves the numeric value in generatorOptions.
     * @param config - The mel bands configuration
     */
    setMelBandsConfig: (config: MelBandsConfig) => void;

    /**
     * Set the gaussian smoothing configuration.
     * Updates both the config mode and resolves the numeric value in generatorOptions.
     * @param config - The gaussian smoothing configuration
     */
    setGaussianSmoothConfig: (config: GaussianSmoothConfig) => void;

    /**
     * Clear the current beat map and reset related state.
     */
    clearBeatMap: () => void;

    /**
     * Start practice mode.
     * This activates tap tracking and beat visualization.
     */
    startPracticeMode: () => void;

    /**
     * Stop practice mode.
     * This deactivates tap tracking and returns to summary view.
     */
    stopPracticeMode: () => void;

    /**
     * Record a tap result in the history.
     * @param result - The button press result from BeatStream.checkButtonPress()
     */
    recordTap: (result: ExtendedButtonPressResult) => void;

    /**
     * Clear the tap history.
     * Useful for starting a fresh practice session.
     */
    clearTapHistory: () => void;

    /**
     * Load a cached beat map by audio ID.
     * Returns null if not found in cache.
     * @param audioId - The audio identifier
     */
    loadCachedBeatMap: (audioId: string) => BeatMap | null;

    /**
     * Cache a beat map for an audio ID.
     * @param audioId - The audio identifier
     * @param beatMap - The beat map to cache
     */
    cacheBeatMap: (audioId: string, beatMap: BeatMap) => void;

    /**
     * Remove a cached beat map.
     * @param audioId - The audio identifier
     */
    removeCachedBeatMap: (audioId: string) => void;

    /**
     * Clear all cached beat maps.
     */
    clearAllCachedBeatMaps: () => void;

    /**
     * Get the current beat map.
     */
    getBeatMap: () => BeatMap | null;

    /**
     * Check if a beat map is currently cached for the given audio ID.
     * @param audioId - The audio identifier
     */
    hasCachedBeatMap: (audioId: string) => boolean;

    /**
     * Clear any error state.
     */
    clearError: () => void;

    /**
     * Clear storage error state.
     */
    clearStorageError: () => void;

    /**
     * Clear old cached beat maps to free up storage space.
     * Removes the oldest cached beat maps.
     * @param count - Number of old caches to remove (default: 1)
     */
    clearOldestCachedBeatMaps: (count?: number) => void;

    /**
     * Set the difficulty preset for beat tap evaluation.
     * @param preset - The difficulty preset to use
     */
    setDifficultyPreset: (preset: DifficultyPreset) => void;

    /**
     * Set a custom threshold value for a specific accuracy level.
     * Only used when preset is 'custom'.
     * @param key - The accuracy level to set (perfect, great, good, ok)
     * @param value - The threshold value in seconds
     */
    setCustomThreshold: (key: keyof AccuracyThresholds, value: number) => void;

    /**
     * Set a custom groove penalty value.
     * Only used when preset is 'custom'.
     * @param key - The penalty type to set (hotnessLossOnMiss, hotnessLossOnBreak)
     * @param value - The penalty value (0-100)
     */
    setCustomGroovePenalty: (key: keyof GroovePenaltyConfig, value: number) => void;

    /**
     * Reset difficulty settings to defaults.
     */
    resetDifficultySettings: () => void;

    /**
     * Set whether to ignore required key assignments on beats.
     * When true, beats with requiredKey use timing-only evaluation (easy mode).
     * @param ignore - Whether to ignore key requirements
     */
    setIgnoreKeyRequirements: (ignore: boolean) => void;

    /**
     * Get the current effective accuracy thresholds.
     * Returns the thresholds for the current preset, or custom thresholds if preset is 'custom'.
     */
    getAccuracyThresholds: () => AccuracyThresholds;

    // ============================================================
    // Interpolation Actions (Task 2.2)
    // ============================================================

    /**
     * Update interpolation options.
     * These will be used for subsequent interpolated beat map generations.
     * @param options - Partial options to merge with existing options
     */
    setInterpolationOptions: (options: Partial<BeatInterpolationOptions>) => void;

    /**
     * Set the beat stream mode for practice/playback.
     * @param mode - 'detected' for original beats, 'merged' for interpolated + detected
     */
    setBeatStreamMode: (mode: BeatStreamMode) => void;

    /**
     * Toggle the interpolation visualization visibility.
     */
    toggleInterpolationVisualization: () => void;

    /**
     * Toggle the quarter note grid overlay visibility. (Task 5.3)
     */
    toggleGridOverlay: () => void;

    /**
     * Toggle the tempo drift visualization visibility. (Task 5.4)
     */
    toggleTempoDriftVisualization: () => void;

    /**
     * Generate an interpolated beat map from the current beat map.
     * Uses the BeatInterpolator from the engine with current interpolation options.
     * @returns The generated InterpolatedBeatMap, or null if no beat map is loaded
     */
    generateInterpolatedBeatMap: () => InterpolatedBeatMap | null;

    /**
     * Clear the interpolated beat map and reset interpolation state.
     */
    clearInterpolation: () => void;

    // ============================================================
    // Downbeat Configuration Actions (Task 1.3)
    // ============================================================

    /**
     * Apply a new downbeat configuration to the current beat map.
     * This recalculates beatInMeasure, isDownbeat, and measureNumber for all beats.
     * Also updates the interpolated beat map if one exists.
     * @param config - The new downbeat configuration to apply
     */
    applyDownbeatConfig: (config: DownbeatConfig) => void;

    /**
     * Reset downbeat configuration to default (beat 0 = downbeat, 4/4 time).
     * This sets downbeatConfig to null, indicating default behavior.
     */
    resetDownbeatConfig: () => void;

    /**
     * Convenience method to set the downbeat position for a single-segment config.
     * Creates or updates a single segment with the given downbeat position.
     * @param beatIndex - The beat index that should be the downbeat (0-indexed)
     * @param beatsPerMeasure - Number of beats per measure (default: 4)
     */
    setDownbeatPosition: (beatIndex: number, beatsPerMeasure?: number) => void;

    /**
     * Add a new downbeat segment for time signature changes.
     * Segments are automatically sorted by startBeat after insertion.
     * @param segment - The segment to add
     */
    addDownbeatSegment: (segment: DownbeatSegment) => void;

    /**
     * Remove a downbeat segment by index.
     * Cannot remove the first segment (index 0).
     * @param segmentIndex - The index of the segment to remove
     */
    removeDownbeatSegment: (segmentIndex: number) => void;

    /**
     * Update a downbeat segment by index.
     * @param segmentIndex - The index of the segment to update
     * @param updates - Partial segment properties to update
     */
    updateDownbeatSegment: (segmentIndex: number, updates: Partial<DownbeatSegment>) => void;

    /**
     * Set whether measure boundary lines and numbers should be shown in the timeline.
     * @param show - Whether to show measure boundaries
     */
    setShowMeasureBoundaries: (show: boolean) => void;
    /**
     * Set whether downbeat selection mode is active.
     * When active, beat markers in the timeline become clickable for setting downbeat position.
     * Part of Phase 5: BeatMapSummary Integration (Task 5.3)
     * @param enabled - Whether selection mode is enabled
     */
    setDownbeatSelectionMode: (enabled: boolean) => void;

    /**
     * Set whether automatic multi-tempo analysis is enabled.
     * When enabled (default), tracks with multiple tempo sections are automatically re-analyzed.
     * @param enabled - Whether auto multi-tempo is enabled
     */
    setAutoMultiTempo: (enabled: boolean) => void;

    // ============================================================
    // Subdivision Actions (Phase 2: Task 2.2)
    // ============================================================

    /**
     * Generate a UnifiedBeatMap from the current InterpolatedBeatMap.
     * The UnifiedBeatMap is a flattened grid of quarter notes that serves
     * as the foundation for both pre-calculated and real-time subdivision.
     * @returns The generated UnifiedBeatMap, or null if no interpolated beat map exists
     */
    generateUnifiedBeatMap: () => UnifiedBeatMap | null;

    /**
     * Generate a SubdividedBeatMap from the current UnifiedBeatMap using BeatSubdivider.
     * Uses the current subdivisionConfig for segment-based subdivision patterns.
     * Used in AudioAnalysisTab for pre-calculated level creation and export.
     * @returns The generated SubdividedBeatMap, or null if no unified beat map exists
     */
    generateSubdividedBeatMap: () => SubdividedBeatMap | null;

    /**
     * Update the subdivision configuration.
     * This triggers regeneration of the SubdividedBeatMap if one exists.
     * @param config - The new subdivision configuration
     */
    setSubdivisionConfig: (config: SubdivisionConfig) => void;

    /**
     * Set subdivision for a specific beat index.
     * @param beatIndex - The beat index to set subdivision for
     * @param subdivision - The subdivision type to apply
     */
    setBeatSubdivision: (beatIndex: number, subdivision: SubdivisionType) => void;

    /**
     * Set subdivision for a range of beats.
     * @param startBeat - The starting beat index (inclusive)
     * @param endBeat - The ending beat index (inclusive)
     * @param subdivision - The subdivision type to apply
     */
    setBeatSubdivisionRange: (startBeat: number, endBeat: number, subdivision: SubdivisionType) => void;

    /**
     * Clear subdivision for a specific beat (reset to default).
     * @param beatIndex - The beat index to clear
     */
    clearBeatSubdivision: (beatIndex: number) => void;

    /**
     * Clear all beat subdivisions (reset all to default).
     */
    clearAllBeatSubdivisions: () => void;

    /**
     * Set all beats to a specific subdivision.
     * @param subdivision - The subdivision type to apply to all beats
     */
    setAllBeatSubdivisions: (subdivision: SubdivisionType) => void;

    /**
     * Set the current subdivision type for real-time mode.
     * Used in BeatPracticeView for the subdivision playground.
     * @param subdivision - The subdivision type to use
     */
    setCurrentSubdivision: (subdivision: SubdivisionType) => void;

    /**
     * Set the transition mode for subdivision changes.
     * Controls how subdivision changes are applied during playback.
     * @param mode - The transition mode ('immediate', 'next-downbeat', 'next-measure')
     */
    setSubdivisionTransitionMode: (mode: 'immediate' | 'next-downbeat' | 'next-measure') => void;

    /**
     * Initialize the SubdivisionPlaybackController for real-time mode.
     * Creates a new controller using the current UnifiedBeatMap.
     * Used in BeatPracticeView when entering practice mode.
     * @param audioContext - The Web Audio API AudioContext for timing
     * @param options - Optional playback options (defaults to DEFAULT_SUBDIVISION_PLAYBACK_OPTIONS)
     * @returns The created controller, or null if no unified beat map exists
     */
    initializeSubdivisionPlayback: (
        audioContext: AudioContext,
        options?: Partial<SubdivisionPlaybackOptions>
    ) => SubdivisionPlaybackController | null;

    /**
     * Clean up the SubdivisionPlaybackController.
     * Should be called when exiting practice mode or when the controller is no longer needed.
     */
    cleanupSubdivisionPlayback: () => void;

    // ============================================================
    // Chart Editor Actions (Phase 2: Task 2.3 - Required Keys)
    // ============================================================

    /**
     * Start the chart editor.
     * Only available when a subdivided beat map exists.
     * Required keys only work with subdivided mode.
     */
    startChartEditor: () => void;

    /**
     * Stop the chart editor.
     */
    stopChartEditor: () => void;

    /**
     * Set the chart style.
     * This determines which keys are available for assignment.
     * @param style - The chart style ('ddr' or 'guitar-hero')
     */
    setChartStyle: (style: ChartStyle) => void;

    /**
     * Set the currently selected key for painting.
     * @param key - The key to select, or null to deselect
     */
    setSelectedKey: (key: SupportedKey | null) => void;

    /**
     * Set the chart editor mode.
     * @param mode - The editor mode ('view', 'paint', or 'erase')
     */
    setEditorMode: (mode: ChartEditorMode) => void;

    /**
     * Helper to update subdivided beat map and cache together.
     * Ensures key assignments are persisted across page refreshes.
     * @param updatedMap - The updated SubdividedBeatMap
     */
    updateSubdividedBeatMapWithCache: (updatedMap: SubdividedBeatMap) => void;

    /**
     * Assign a key to a specific beat in the subdivided beat map.
     * @param beatIndex - The index of the beat in the subdivided beat map
     * @param key - The key to assign, or null to clear
     */
    assignKeyToBeat: (beatIndex: number, key: string | null) => void;

    /**
     * Assign keys to multiple beats at once.
     * Used for drag painting in the chart editor.
     * @param assignments - Array of beat index and key pairs
     */
    assignKeysToBeats: (assignments: KeyAssignment[]) => void;

    /**
     * Clear all key assignments from the subdivided beat map.
     */
    clearAllKeys: () => void;

    /**
     * Set the KeyLane visualization mode.
     * @param mode - The view mode ('off', 'ddr', or 'guitar-hero')
     */
    setKeyLaneViewMode: (mode: KeyLaneViewMode) => void;

    // ============================================================
    // Level Import/Export Actions (Phase 2: Task 2.5)
    // ============================================================

    /**
     * Export the current level (beat map + chart) as LevelExportData.
     * Returns null if no subdivided beat map exists.
     * Includes all beat data with key assignments and subdivision config.
     * @param audioTitle - Optional title for display purposes
     * @returns The LevelExportData object, or null if no subdivided beat map
     */
    exportLevel: (audioTitle?: string) => LevelExportData | null;

    /**
     * Import a level (beat map + chart) from LevelExportData.
     * Validates audioId match (required) and beat count match (required).
     * Applies key assignments to the current subdivided beat map.
     * @param data - The level data to import
     * @returns Validation result with errors if import failed
     */
    importLevel: (data: LevelExportData) => LevelImportValidationResult;

    // ============================================================
    // Full Beat Map Export/Import Actions
    // ============================================================

    /**
     * Export the complete beat map state including detected beats,
     * interpolated beats, subdivided beats, and chart with required keys.
     * This is the comprehensive export for saving the full work state.
     * @param audioTitle - Optional title for display purposes
     * @returns The FullBeatMapExportData object, or null if no beat map exists
     */
    exportFullBeatMap: (audioTitle?: string) => FullBeatMapExportData | null;

    /**
     * Import a complete beat map state from FullBeatMapExportData.
     * Restores all beat data: detected, interpolated, subdivided, and chart keys.
     * @param data - The full beat map data to import
     * @returns Validation result with success/errors/warnings
     */
    importFullBeatMap: (data: FullBeatMapExportData) => {
        success: boolean;
        errors: string[];
        warnings: string[];
    };

    // ============================================================
    // Groove Analyzer Actions (Phase 2: Task 2.2 - Groove Actions)
    // ============================================================

    /**
     * Initialize the GrooveAnalyzer instance.
     * Creates a new analyzer with default options.
     * Called when practice mode starts.
     */
    initGrooveAnalyzer: () => void;

    /**
     * Record a hit in the groove analyzer.
     * Called after each button press during practice mode.
     * @param offset - Timing offset in seconds (negative = early/push, positive = late/pull)
     * @param bpm - Current BPM of the song
     * @param currentTime - Audio time from the beat map (matchedBeat.time)
     * @param accuracy - Accuracy level of the hit (miss/wrongKey will decrease hotness)
     * @returns GrooveResult with current groove state and hit analysis
     */
    recordGrooveHit: (offset: number, bpm: number, currentTime: number, accuracy: ExtendedBeatAccuracy) => GrooveResult;

    /**
     * Record a missed beat in the groove analyzer.
     * Called when user doesn't press on a beat.
     * @returns GrooveResult with current groove state after miss
     */
    recordGrooveMiss: () => GrooveResult;

    /**
     * Reset the groove analyzer state.
     * Called on seek, track change, or when practice mode restarts.
     * Clears current groove state but preserves best stats.
     */
    resetGrooveAnalyzer: () => void;

    /**
     * Update the current groove state snapshot.
     * Called after recordHit/recordMiss to sync the state for UI.
     * @param state - The new groove state
     */
    updateGrooveState: (state: GrooveState) => void;

    /**
     * Update the best groove achievements.
     * Called when a new best hotness or streak is achieved.
     * @param hotness - The hotness value to compare
     * @param streak - The streak value to compare
     */
    updateBestGroove: (hotness: number, streak: number) => void;

    // ============================================================
    // Rhythm XP Actions (Phase 1: Task 1.3)
    // NOTE: Config actions are in rhythmXPConfigStore, not here
    // ============================================================

    /**
     * Initialize the RhythmXPCalculator for a practice session.
     * Creates a new calculator with config from rhythmXPConfigStore
     * and calls startSession().
     */
    initRhythmXP: () => void;

    /**
     * Record a hit in the XP calculator.
     * Called after each button press during practice mode.
     * Updates currentCombo and lastRhythmXPResult.
     * @param accuracy - The accuracy rating from the button press
     * @param grooveHotness - Current groove hotness (0-100)
     * @returns RhythmXPResult with score/XP breakdown
     */
    recordRhythmHit: (
        accuracy: ExtendedBeatAccuracy,
        grooveHotness: number
    ) => RhythmXPResult | null;

    /**
     * Break the current combo due to missed beats detected via lookback.
     * Processes combo end bonus and resets combo to 0.
     * Called when missed beats are detected between the last hit and current hit.
     * @param missedCount - Number of beats that were missed (for logging)
     */
    breakCombo: (missedCount: number) => void;

    /**
     * Process combo end bonus.
     * Called when combo breaks (miss or wrongKey).
     * Uses previousComboLength to calculate bonus.
     * @returns ComboEndBonusResult for display
     */
    processComboEndBonus: () => ComboEndBonusResult | null;

    /**
     * Process groove end bonus.
     * Called when grooveResult.endedGrooveStats is present.
     * @param grooveStats - The ended groove stats from GrooveResult
     * @returns GrooveEndBonusResult for display
     */
    processGrooveEndBonus: (grooveStats: GrooveStats) => GrooveEndBonusResult | null;

    /**
     * Get current session totals for UI display.
     * @returns Current RhythmSessionTotals snapshot
     */
    getRhythmSessionTotals: () => RhythmSessionTotals | null;

    /**
     * Check if there is unclaimed XP in the current session.
     * Used to prompt user on exit.
     * @returns true if totalXP > 0
     */
    hasUnclaimedXP: () => boolean;

    /**
     * End the rhythm XP session and get final totals.
     * Called when user confirms they want to claim XP.
     * @returns Final RhythmSessionTotals
     */
    endRhythmXPSession: () => RhythmSessionTotals | null;

    /**
     * Clear pending bonus notifications.
     * Called after UI displays the bonus.
     */
    clearPendingBonuses: () => void;

    /**
     * Reset rhythm XP state (session only, not config).
     * Called on track change, practice mode restart, or after claiming XP.
     */
    resetRhythmXP: () => void;

    // ============================================================
    // Step Navigation Actions (Phase 1: Task 1.1)
    // ============================================================

    /**
     * Set the current step in the beat detection wizard UI.
     * Updates both currentStep and previousStep for animation direction tracking.
     * @param step - The step number to navigate to (1-4)
     */
    setCurrentStep: (step: 1 | 2 | 3 | 4) => void;

    // ============================================================
    // Rhythm Generation Actions (Task 1.1)
    // ============================================================

    /**
     * Set the generation mode for the beat detection wizard.
     * When switching from 'automatic' to 'manual':
     * - Keeps beatMap (if any)
     * - Clears generatedRhythm
     * - Navigates to Step 2 (Subdivide)
     * @param mode - The generation mode ('manual' or 'automatic')
     */
    setGenerationMode: (mode: 'manual' | 'automatic') => void;

    /**
     * Set the generated rhythm data.
     * This is session-only state (not persisted to localStorage).
     * @param rhythm - The generated rhythm data from RhythmGenerator, or null to clear
     */
    setGeneratedRhythm: (rhythm: GeneratedRhythm | null) => void;

    /**
     * Set the rhythm generation progress state.
     * @param progress - The current progress of the rhythm generation pipeline
     */
    setRhythmGenerationProgress: (progress: {
        phase: 'multiBand' | 'transients' | 'quantize' | 'phrases' | 'composite' | 'balancing' | 'variants';
        progress: number;
        message: string;
    } | null) => void;

    /**
     * Clear the generated rhythm state.
     * Called when:
     * - Track changes
     * - Switching from 'automatic' to 'manual' mode
     * - User manually clears the rhythm
     */
    clearGeneratedRhythm: () => void;

    // ============================================================
    // Level Generation Actions (Task 0.1)
    // ============================================================

    /**
     * Set the generated level data for the currently selected difficulty.
     * This is session-only state (not persisted to localStorage).
     * @param level - The generated level data from LevelGenerator, or null to clear
     */
    setGeneratedLevel: (level: GeneratedLevel | null) => void;

    /**
     * Set all difficulty variants of the generated level.
     * @param levels - The generated levels for all difficulties, or null to clear
     */
    setAllDifficultyLevels: (levels: AllDifficultiesWithNatural | null) => void;

    /**
     * Clear the generated level and all related state.
     * Called when:
     * - Track changes
     * - Switching from 'automatic' to 'manual' mode
     * - User manually clears the level
     */
    clearGeneratedLevel: () => void;

    /**
     * Set the level generation progress state.
     * @param progress - The current progress of the level generation pipeline
     */
    setLevelGenerationProgress: (progress: LevelGenerationProgress | null) => void;

    /**
     * Set the rhythm validation result.
     * Used to verify the data contract before level generation.
     * @param validation - The validation result, or null to clear
     */
    setRhythmValidation: (validation: {
        isValid: boolean;
        errors: string[];
        summary: string;
    } | null) => void;

    /**
     * Set the pitch analysis results.
     * @param analysis - The melody contour analysis result, or null to clear
     */
    setPitchAnalysis: (analysis: MelodyContourAnalysisResult | null) => void;

    /**
     * Set the selected difficulty level for display.
     * @param difficulty - The difficulty to select ('natural', 'easy', 'medium', or 'hard')
     */
    setSelectedDifficulty: (difficulty: 'natural' | 'easy' | 'medium' | 'hard') => void;
}

interface BeatDetectionStoreState extends BeatDetectionState {
    actions: BeatDetectionActions;
}

/**
 * Serialized format for subdivision config in localStorage.
 * Maps are serialized as arrays for JSON compatibility.
 */
interface PersistedSubdivisionConfig {
    beatSubdivisions: [number, SubdivisionType][];
    defaultSubdivision: SubdivisionType;
}

/**
 * Subset of BeatDetectionStoreState that is persisted to localStorage.
 * This type represents the exact shape of data stored in localStorage,
 * which may differ from runtime types (e.g., Maps are serialized as arrays).
 *
 * Used by the Zustand persist middleware's partialize function to ensure
 * type safety without needing `as unknown as` casts.
 */
interface PersistedBeatDetectionState {
    // Beat map cache
    cachedBeatMaps: Record<string, BeatMap>;
    cacheOrder: string[];

    // Generator options (OSE parameters)
    generatorOptions: BeatMapGeneratorOptions;
    hopSizeConfig: HopSizeConfig;
    melBandsConfig: MelBandsConfig;
    gaussianSmoothConfig: GaussianSmoothConfig;

    // Difficulty and gameplay settings
    difficultySettings: DifficultySettings;
    autoMultiTempo: boolean;

    // Interpolation state
    interpolationOptions: BeatInterpolationOptions;
    beatStreamMode: BeatStreamMode;
    cachedInterpolatedBeatMaps: Record<string, InterpolatedBeatMap>;

    // Downbeat configuration
    downbeatConfig: DownbeatConfig | null;
    showMeasureBoundaries: boolean;

    // Subdivision state (serialized format - Maps become arrays)
    // Note: currentSubdivision, pendingSubdivision, and subdivisionTransitionMode are NOT persisted
    // so the subdivision playground resets to defaults on page refresh
    subdivisionConfig: PersistedSubdivisionConfig;
    cachedUnifiedBeatMaps: Record<string, UnifiedBeatMap>;
    cachedSubdividedBeatMaps: Record<string, SubdividedBeatMap>;

    // Chart Editor state (user preferences only)
    chartStyle: ChartStyle;
    editorMode: ChartEditorMode;
    keyLaneViewMode: KeyLaneViewMode;
}

/**
 * Active generator instance for cancellation support.
 * This is set during generation and cleared when complete.
 */
let activeGenerator: BeatMapGenerator | null = null;

/**
 * Active subdivision playback controller for real-time mode.
 * This is stored outside of Zustand state because it's not serializable.
 * Managed via module-level variable similar to activeGenerator.
 *
 * Used in BeatPracticeView for the real-time subdivision playground.
 *
 * NOTE: This will be used in Phase 6 (Real-Time Subdivision Playground).
 * The variable is prefixed with underscore to suppress unused warnings until then.
 */
let _activeSubdivisionPlaybackController: SubdivisionPlaybackController | null = null;

/**
 * Get the active subdivision playback controller.
 * Used by useSubdivisionPlayback hook in Phase 6.
 */
export function getActiveSubdivisionPlaybackController(): SubdivisionPlaybackController | null {
    return _activeSubdivisionPlaybackController;
}

/**
 * Set the active subdivision playback controller.
 * Used by useSubdivisionPlayback hook in Phase 6.
 */
export function setActiveSubdivisionPlaybackController(controller: SubdivisionPlaybackController | null): void {
    _activeSubdivisionPlaybackController = controller;
}

/**
 * Create a BeatMapGenerator instance with the given options.
 *
 * Note: We create a new instance each time rather than using a singleton
 * because the generator stores options in its constructor. If we used a
 * singleton, changes to sensitivity/filter wouldn't take effect until
 * the page was refreshed.
 *
 * Creating a new generator is cheap - it doesn't hold expensive state
 * between generations, so this is safe for performance.
 */
const getGenerator = (options: BeatMapGeneratorOptions): BeatMapGenerator => {
    const generator = new BeatMapGenerator(options);
    // Track as active for cancellation support
    activeGenerator = generator;
    return generator;
};

/**
 * Create the initial state.
 */
const createInitialState = (): BeatDetectionState => ({
    beatMap: null,
    isGenerating: false,
    generationProgress: null,
    generatorOptions: { ...DEFAULT_GENERATOR_OPTIONS },
    hopSizeConfig: { ...DEFAULT_HOP_SIZE_CONFIG },
    melBandsConfig: { ...DEFAULT_MEL_BANDS_CONFIG },
    gaussianSmoothConfig: { ...DEFAULT_GAUSSIAN_SMOOTH_CONFIG },
    lastGeneratedOSEConfig: null,
    cachedBeatMaps: {},
    cacheOrder: [],
    practiceModeActive: false,
    tapHistory: [],
    error: null,
    storageError: null,
    difficultySettings: { ...DEFAULT_DIFFICULTY_SETTINGS },
    // Interpolation state
    interpolationOptions: { ...DEFAULT_BEAT_INTERPOLATION_OPTIONS },
    interpolatedBeatMap: null,
    // selectedAlgorithm removed - engine uses only adaptive-phase-locked
    beatStreamMode: 'merged', // Use interpolated beats by default
    showInterpolationVisualization: false,
    showGridOverlay: false, // Task 5.3: Quarter note grid overlay
    showTempoDriftVisualization: false, // Task 5.4: Tempo drift visualization
    lastGeneratedInterpolationConfig: null,
    cachedInterpolatedBeatMaps: {},
    // Downbeat configuration state
    downbeatConfig: null, // null = using default config
    // Measure visualization toggle (Phase 4: Measure Visualization)
    showMeasureBoundaries: true, // On by default, show measure boundaries
    // Downbeat selection mode (Phase 5: BeatMapSummary Integration - Task 5.3)
    isDownbeatSelectionMode: false, // Off by default
    // Multi-tempo analysis (default: enabled)
    autoMultiTempo: true,
    // Subdivision state (Phase 2: Task 2.1)
    unifiedBeatMap: null,
    subdividedBeatMap: null,
    subdivisionConfig: { ...DEFAULT_SUBDIVISION_CONFIG },
    currentSubdivision: 'quarter',
    pendingSubdivision: null,
    subdivisionTransitionMode: 'immediate',
    cachedUnifiedBeatMaps: {},
    cachedSubdividedBeatMaps: {},
    // Chart Editor state (Phase 2: Task 2.1 - Required Keys)
    chartEditorActive: false,
    chartStyle: DEFAULT_CHART_EDITOR_STATE.chartStyle,
    selectedKey: null,
    editorMode: DEFAULT_CHART_EDITOR_STATE.editorMode,
    keyLaneViewMode: DEFAULT_CHART_EDITOR_STATE.keyLaneViewMode,
    // Groove Analyzer state (Phase 2: Task 2.1 - Groove State)
    grooveAnalyzer: null,
    grooveState: null,
    bestGrooveHotness: 0,
    bestGrooveStreak: 0,
    // Rhythm XP Runtime State (Phase 1: Task 1.2)
    rhythmXPCalculator: null,
    rhythmSessionTotals: null,
    lastRhythmXPResult: null,
    currentCombo: 0,
    maxCombo: 0,
    previousComboLength: 0,
    pendingComboEndBonus: null,
    pendingGrooveEndBonus: null,
    // Step Navigation state (Phase 1: Task 1.1)
    currentStep: 1, // Start on the Analyze step
    previousStep: null, // No navigation has occurred yet

    // Rhythm Generation state (Task 1.1)
    generationMode: 'manual', // Always start in manual mode
    generatedRhythm: null, // Session-only
    rhythmGenerationProgress: null, // Session-only

    // Level Generation state (Task 0.1)
    generatedLevel: null, // Session-only
    allDifficultyLevels: null, // Session-only
    levelGenerationProgress: null, // Session-only
    pitchAnalysis: null, // Session-only
    selectedDifficulty: 'medium', // Default to medium difficulty

    // Rhythm Validation state (Task 0.7)
    rhythmValidation: null, // Session-only
});

/**
 * Check if an error is a quota-related error.
 */
const isQuotaError = (error: unknown): boolean => {
    if (!(error instanceof Error)) return false;
    const message = error.message.toLowerCase();
    return (
        message.includes('quota') ||
        message.includes('exceeded') ||
        message.includes('space') ||
        message.includes('full')
    );
};

/**
 * Helper to perform automatic cache eviction if needed.
 * Returns the new cachedBeatMaps and cacheOrder after potential eviction.
 */
const performAutoEvictionIfNeeded = (
    cachedBeatMaps: Record<string, BeatMap>,
    cacheOrder: string[]
): { cachedBeatMaps: Record<string, BeatMap>; cacheOrder: string[]; evictedCount: number } => {
    if (cacheOrder.length < MAX_CACHED_BEAT_MAPS) {
        return { cachedBeatMaps, cacheOrder, evictedCount: 0 };
    }

    // Remove the oldest entries
    const keysToRemove = cacheOrder.slice(0, EVICTION_COUNT);
    const newCachedBeatMaps = { ...cachedBeatMaps };
    keysToRemove.forEach((key) => {
        delete newCachedBeatMaps[key];
    });
    const newCacheOrder = cacheOrder.slice(EVICTION_COUNT);

    logger.info('BeatDetection', 'Auto-evicted old cached beat maps', {
        evictedCount: keysToRemove.length,
        remainingCount: newCacheOrder.length,
    });

    return { cachedBeatMaps: newCachedBeatMaps, cacheOrder: newCacheOrder, evictedCount: keysToRemove.length };
};

/**
 * Custom PersistStorage implementation that wraps createJSONStorage with error handling.
 */
const createErrorHandlingStorage = <S>(
    onError: (error: string) => void
): PersistStorage<S> | undefined => {
    // Create the base storage using createJSONStorage
    const baseStorage = createJSONStorage<S>(() => ({
        getItem: async (name: string): Promise<string | null> => {
            try {
                const value = await storage.getItem<string>(name);
                return value ?? null;
            } catch (error) {
                logger.error('BeatDetection', 'Storage getItem error', { error });
                return null;
            }
        },
        setItem: async (name: string, value: string): Promise<void> => {
            try {
                await storage.setItem(name, value);
            } catch (error) {
                logger.error('BeatDetection', 'Storage setItem error', { error });
                if (isQuotaError(error)) {
                    onError('Storage quota exceeded. Some beat maps may not be saved. Try clearing old cached beat maps.');
                } else {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown storage error';
                    onError(`Storage error: ${errorMessage}`);
                }
            }
        },
        removeItem: async (name: string): Promise<void> => {
            try {
                await storage.removeItem(name);
            } catch (error) {
                logger.error('BeatDetection', 'Storage removeItem error', { error });
            }
        },
    }));

    if (!baseStorage) return undefined;

    // Wrap the setItem to handle errors
    return {
        getItem: baseStorage.getItem,
        setItem: (name: string, value: StorageValue<S>) => {
            try {
                return baseStorage.setItem(name, value);
            } catch (error) {
                logger.error('BeatDetection', 'Storage setItem error', { error });
                if (isQuotaError(error)) {
                    onError('Storage quota exceeded. Some beat maps may not be saved. Try clearing old cached beat maps.');
                } else {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown storage error';
                    onError(`Storage error: ${errorMessage}`);
                }
                return undefined;
            }
        },
        removeItem: baseStorage.removeItem,
    };
};

// Variable to hold the setStorageError function (set during store creation)
let setStorageErrorFn: ((error: string | null) => void) | null = null;

export const useBeatDetectionStore = create<BeatDetectionStoreState>()(
    persist(
        (set, get) => {
            // Store the set function for error handling
            setStorageErrorFn = (error) => set({ storageError: error });

            return {
                ...createInitialState(),

                actions: {
                    generateBeatMap: async (audioUrl, audioId, options, forceRegenerate = false) => {
                        const state = get();

                        // Check cache first (unless force regenerating)
                        if (!forceRegenerate && state.cachedBeatMaps[audioId]) {
                            logger.info('BeatDetection', 'Using cached beat map', { audioId });
                            let cachedMap = state.cachedBeatMaps[audioId];

                            // ============================================================
                            // Task 6.1: Re-apply downbeat config when loading from cache
                            // ============================================================
                            // If a custom downbeat config exists, apply it to the cached beat map.
                            // The cache stores the original beat map (with default downbeat),
                            // so we need to re-apply the user's custom config on load.
                            if (state.downbeatConfig) {
                                logger.info('BeatDetection', 'Re-applying downbeat config to cached beat map');
                                cachedMap = reapplyDownbeatConfig(cachedMap, state.downbeatConfig);
                            }

                            // When loading from cache, update the lastGeneratedOSEConfig to current settings
                            // This prevents showing "re-analyze needed" immediately after loading cached map
                            set({
                                beatMap: cachedMap,
                                isGenerating: false,
                                generationProgress: null,
                                error: null,
                                lastGeneratedOSEConfig: createOSEConfigSnapshot(
                                    state.hopSizeConfig,
                                    state.melBandsConfig,
                                    state.gaussianSmoothConfig
                                ),
                            });

                            // Check if we have a cached interpolated beat map and if options match
                            const currentInterpolationConfig = createInterpolationConfigSnapshot(
                                state.interpolationOptions,
                                state.autoMultiTempo
                            );
                            const cachedInterpolated = state.cachedInterpolatedBeatMaps[audioId];

                            // Task 6.2: If we have a custom downbeat config, we must regenerate
                            // the interpolated beat map because the cached one was generated
                            // from the original beat map (without downbeat config applied)
                            const mustRegenerateInterpolation = !!state.downbeatConfig;

                            if (!mustRegenerateInterpolation && cachedInterpolated && !interpolationConfigsDiffer(currentInterpolationConfig, state.lastGeneratedInterpolationConfig)) {
                                // Use cached interpolated beat map
                                logger.info('BeatDetection', 'Using cached interpolated beat map', { audioId });

                                // Task 2.4: Auto-generate UnifiedBeatMap from cached interpolation
                                const unifiedMap = unifyBeatMap(cachedInterpolated);
                                set({
                                    interpolatedBeatMap: cachedInterpolated,
                                    lastGeneratedInterpolationConfig: currentInterpolationConfig,
                                    unifiedBeatMap: unifiedMap,
                                    subdividedBeatMap: null, // Clear subdivision when unified changes
                                    // Cache the unified beat map for persistence
                                    cachedUnifiedBeatMaps: {
                                        ...get().cachedUnifiedBeatMaps,
                                        [unifiedMap.audioId]: unifiedMap,
                                    },
                                });
                                logger.info('BeatDetection', 'UnifiedBeatMap auto-generated from cached interpolation', {
                                    beatCount: unifiedMap.beats.length,
                                });
                            } else {
                                // Generate interpolation (options changed, not cached, or downbeat config applied)
                                logger.info('BeatDetection', 'Generating interpolated beat map after cache load', {
                                    reason: mustRegenerateInterpolation
                                        ? 'downbeat config applied'
                                        : cachedInterpolated
                                            ? 'options changed'
                                            : 'not cached',
                                });
                                // Need to get fresh state after the set above
                                const freshState = get();
                                // Merge interpolation options with enableMultiTempo based on autoMultiTempo state
                                const interpolator = new BeatInterpolator({
                                    ...freshState.interpolationOptions,
                                    enableMultiTempo: freshState.autoMultiTempo,
                                });
                                try {
                                    const interpolatedBeatMap = interpolator.interpolate(cachedMap);

                                    // Task 2.4: Auto-generate UnifiedBeatMap after interpolation
                                    const unifiedMap = unifyBeatMap(interpolatedBeatMap);

                                    set({
                                        interpolatedBeatMap,
                                        lastGeneratedInterpolationConfig: currentInterpolationConfig,
                                        unifiedBeatMap: unifiedMap,
                                        subdividedBeatMap: null, // Clear subdivision when unified changes
                                        // Only update cache if no custom downbeat config
                                        // (otherwise we'd cache the modified beat map)
                                        ...(mustRegenerateInterpolation ? {} : {
                                            cachedInterpolatedBeatMaps: {
                                                ...freshState.cachedInterpolatedBeatMaps,
                                                [audioId]: interpolatedBeatMap,
                                            },
                                            // Also cache the unified beat map for persistence
                                            cachedUnifiedBeatMaps: {
                                                ...freshState.cachedUnifiedBeatMaps,
                                                [unifiedMap.audioId]: unifiedMap,
                                            },
                                        }),
                                    });
                                    logger.info('BeatDetection', 'Interpolated beat map generated successfully', {
                                        detectedBeats: interpolatedBeatMap.detectedBeats.length,
                                        mergedBeats: interpolatedBeatMap.mergedBeats.length,
                                    });
                                    logger.info('BeatDetection', 'UnifiedBeatMap auto-generated from interpolation', {
                                        beatCount: unifiedMap.beats.length,
                                    });
                                } catch (interpError) {
                                    const errorMsg = interpError instanceof Error ? interpError.message : 'Unknown interpolation error';
                                    logger.error('BeatDetection', 'Failed to generate interpolated beat map', { error: errorMsg });
                                }
                            }

                            return cachedMap;
                        }

                        // Start generation
                        logger.info('BeatDetection', 'Starting beat map generation', { audioUrl, audioId });
                        set({
                            isGenerating: true,
                            generationProgress: null,
                            error: null,
                        });

                        try {
                            // Resolve OSE configs to numeric values before passing to engine
                            // This ensures OSE configs always take precedence over any passed options
                            const resolvedHopSizeMs = getHopSizeMs(state.hopSizeConfig);
                            const resolvedMelBands = getMelBands(state.melBandsConfig);
                            const resolvedGaussianSmoothMs = getGaussianSmoothMs(state.gaussianSmoothConfig);

                            // Merge provided options with defaults, with resolved OSE values taking precedence
                            const mergedOptions: BeatMapGeneratorOptions = {
                                ...state.generatorOptions,
                                ...options,
                                // OSE configs always override - these are the source of truth
                                hopSizeMs: resolvedHopSizeMs,
                                melBands: resolvedMelBands,
                                gaussianSmoothMs: resolvedGaussianSmoothMs,
                            };

                            const generator = getGenerator(mergedOptions);

                            // Generate with progress callback
                            // Note: downbeatConfig is undefined (use default), progress callback is 4th arg
                            const beatMap = await generator.generateBeatMap(
                                audioUrl,
                                audioId,
                                undefined, // downbeatConfig - use default (beat 0 = downbeat, 4/4 time)
                                (progress) => {
                                    set({ generationProgress: progress });
                                    logger.debug('BeatDetection', 'Generation progress', {
                                        phase: progress.phase,
                                        progress: progress.progress,
                                    });
                                }
                            );

                            logger.info('BeatDetection', 'Beat map generated successfully', {
                                audioId,
                                beatCount: beatMap.beats.length,
                                bpm: beatMap.bpm,
                            });

                            // Cache the result with automatic eviction
                            const currentState = get();
                            let { cachedBeatMaps, cacheOrder } = currentState;

                            // If this audioId already exists, remove it from order (will be re-added at end)
                            if (cachedBeatMaps[audioId]) {
                                cacheOrder = cacheOrder.filter((id) => id !== audioId);
                            }

                            // Perform auto-eviction if needed
                            const evicted = performAutoEvictionIfNeeded(cachedBeatMaps, cacheOrder);
                            cachedBeatMaps = evicted.cachedBeatMaps;
                            cacheOrder = evicted.cacheOrder;

                            // Add the new beat map
                            cachedBeatMaps = { ...cachedBeatMaps, [audioId]: beatMap };
                            cacheOrder = [...cacheOrder, audioId];

                            // Store the OSE config snapshot used to generate this beat map
                            const oseConfigSnapshot = createOSEConfigSnapshot(
                                currentState.hopSizeConfig,
                                currentState.melBandsConfig,
                                currentState.gaussianSmoothConfig
                            );

                            // Automatically generate interpolated beat map
                            const interpolationConfigSnapshot = createInterpolationConfigSnapshot(
                                currentState.interpolationOptions,
                                currentState.autoMultiTempo
                            );

                            let interpolatedBeatMap: InterpolatedBeatMap | null = null;
                            let unifiedBeatMap: UnifiedBeatMap | null = null;
                            let cachedInterpolatedBeatMaps = currentState.cachedInterpolatedBeatMaps;
                            let cachedUnifiedBeatMaps = currentState.cachedUnifiedBeatMaps;

                            try {
                                // Merge interpolation options with enableMultiTempo based on autoMultiTempo state
                                const interpolator = new BeatInterpolator({
                                    ...currentState.interpolationOptions,
                                    enableMultiTempo: currentState.autoMultiTempo,
                                });
                                interpolatedBeatMap = interpolator.interpolate(beatMap);

                                // Cache the interpolated beat map
                                cachedInterpolatedBeatMaps = {
                                    ...cachedInterpolatedBeatMaps,
                                    [audioId]: interpolatedBeatMap,
                                };

                                logger.info('BeatDetection', 'Interpolated beat map generated automatically', {
                                    detectedBeats: interpolatedBeatMap.detectedBeats.length,
                                    mergedBeats: interpolatedBeatMap.mergedBeats.length,
                                    interpolatedCount: interpolatedBeatMap.interpolationMetadata.interpolatedBeatCount,
                                    quarterNoteBpm: interpolatedBeatMap.quarterNoteBpm,
                                });

                                // Task 2.4: Auto-generate UnifiedBeatMap after interpolation
                                unifiedBeatMap = unifyBeatMap(interpolatedBeatMap);

                                // Cache the unified beat map for persistence
                                cachedUnifiedBeatMaps = {
                                    ...cachedUnifiedBeatMaps,
                                    [unifiedBeatMap.audioId]: unifiedBeatMap,
                                };

                                logger.info('BeatDetection', 'UnifiedBeatMap auto-generated from interpolation', {
                                    beatCount: unifiedBeatMap.beats.length,
                                });
                            } catch (interpError) {
                                const errorMsg = interpError instanceof Error ? interpError.message : 'Unknown interpolation error';
                                logger.error('BeatDetection', 'Failed to generate interpolated beat map', { error: errorMsg });
                                // Continue without interpolation - don't fail the whole generation
                            }

                            set({
                                beatMap,
                                isGenerating: false,
                                generationProgress: null,
                                cachedBeatMaps,
                                cacheOrder,
                                error: null,
                                lastGeneratedOSEConfig: oseConfigSnapshot,
                                interpolatedBeatMap,
                                lastGeneratedInterpolationConfig: interpolationConfigSnapshot,
                                cachedInterpolatedBeatMaps,
                                cachedUnifiedBeatMaps,
                                unifiedBeatMap,
                                subdividedBeatMap: null, // Clear subdivision when unified changes
                                // Task 6.1: Reset downbeat config when generating a new beat map
                                // Each beat map should start with default downbeat configuration
                                downbeatConfig: null,
                            });

                            // Clear active generator reference
                            activeGenerator = null;

                            return beatMap;
                        } catch (error) {
                            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                            logger.error('BeatDetection', 'Beat map generation failed', { error: errorMessage });
                            set({
                                isGenerating: false,
                                generationProgress: null,
                                error: errorMessage,
                            });
                            // Clear active generator reference
                            activeGenerator = null;
                            return null;
                        }
                    },

                    cancelGeneration: () => {
                        if (activeGenerator) {
                            activeGenerator.cancel();
                            activeGenerator = null;
                            logger.info('BeatDetection', 'Beat map generation cancelled');
                        }
                        set({
                            isGenerating: false,
                            generationProgress: null,
                        });
                    },

                    setGeneratorOptions: (options) => {
                        logger.debug('BeatDetection', 'Updating generator options', options);
                        set((state) => ({
                            generatorOptions: {
                                ...state.generatorOptions,
                                ...options,
                            },
                        }));
                    },

                    setHopSizeConfig: (config) => {
                        logger.debug('BeatDetection', 'Updating hop size config', config);
                        // Resolve the numeric value from config using helper function
                        const hopSizeMs = getHopSizeMs(config);
                        set((state) => ({
                            hopSizeConfig: config,
                            generatorOptions: {
                                ...state.generatorOptions,
                                hopSizeMs,
                            },
                        }));
                    },

                    setMelBandsConfig: (config) => {
                        logger.debug('BeatDetection', 'Updating mel bands config', config);
                        // Resolve the numeric value from config using helper function
                        const melBands = getMelBands(config);
                        set((state) => ({
                            melBandsConfig: config,
                            generatorOptions: {
                                ...state.generatorOptions,
                                melBands,
                            },
                        }));
                    },

                    setGaussianSmoothConfig: (config) => {
                        logger.debug('BeatDetection', 'Updating gaussian smooth config', config);
                        // Resolve the numeric value from config using helper function
                        const gaussianSmoothMs = getGaussianSmoothMs(config);
                        set((state) => ({
                            gaussianSmoothConfig: config,
                            generatorOptions: {
                                ...state.generatorOptions,
                                gaussianSmoothMs,
                            },
                        }));
                    },

                    clearBeatMap: () => {
                        logger.info('BeatDetection', 'Clearing current beat map');
                        set({
                            beatMap: null,
                            practiceModeActive: false,
                            tapHistory: [],
                            error: null,
                            lastGeneratedOSEConfig: null,
                            // Also clear interpolation state
                            interpolatedBeatMap: null,
                            showInterpolationVisualization: false,
                            lastGeneratedInterpolationConfig: null,
                            // Reset step navigation to initial state
                            currentStep: 1,
                            previousStep: null,
                            // Reset rhythm generation state (Task 1.1)
                            // Note: generationMode stays as-is (not reset to manual)
                            generatedRhythm: null,
                            rhythmGenerationProgress: null,
                            // Reset level generation state (Task 0.1)
                            generatedLevel: null,
                            allDifficultyLevels: null,
                            levelGenerationProgress: null,
                            pitchAnalysis: null,
                            selectedDifficulty: 'medium',
                        });
                    },

                    startPracticeMode: () => {
                        logger.info('BeatDetection', 'Starting practice mode');
                        set({
                            practiceModeActive: true,
                            tapHistory: [], // Clear history when starting practice
                        });
                    },

                    stopPracticeMode: () => {
                        logger.info('BeatDetection', 'Stopping practice mode');
                        set({ practiceModeActive: false });
                    },

                    recordTap: (result) => {
                        const state = get();
                        const tapResult: TapResult = {
                            ...result,
                            tappedAt: result.matchedBeat.timestamp,
                            tapIndex: state.tapHistory.length,
                        };
                        logger.debug('BeatDetection', 'Recording tap', {
                            accuracy: result.accuracy,
                            offset: result.offset,
                            tapIndex: tapResult.tapIndex,
                        });
                        set((state) => {
                            const newHistory = [...state.tapHistory, tapResult];
                            // Limit history size to prevent memory/performance issues
                            return {
                                tapHistory: newHistory.slice(-MAX_TAP_HISTORY_SIZE),
                            };
                        });
                    },

                    clearTapHistory: () => {
                        logger.info('BeatDetection', 'Clearing tap history');
                        set({ tapHistory: [] });
                    },

                    loadCachedBeatMap: (audioId) => {
                        const state = get();
                        const cached = state.cachedBeatMaps[audioId];
                        if (cached) {
                            logger.info('BeatDetection', 'Loading cached beat map', { audioId });

                            // Also restore related cached beat maps (interpolated, unified, subdivided)
                            const cachedInterpolated = state.cachedInterpolatedBeatMaps[audioId];
                            const cachedUnified = state.cachedUnifiedBeatMaps[audioId];
                            const cachedSubdivided = state.cachedSubdividedBeatMaps[audioId];

                            logger.info('BeatDetection', 'Restoring cached beat maps', {
                                audioId,
                                hasInterpolated: !!cachedInterpolated,
                                hasUnified: !!cachedUnified,
                                hasSubdivided: !!cachedSubdivided,
                            });

                            // Check if the subdivided beat map has required keys
                            let keyCount = 0;
                            if (cachedSubdivided) {
                                keyCount = cachedSubdivided.beats.filter(b => b.requiredKey !== undefined).length;
                            }

                            logger.info('BeatDetection', 'Restoring cached beat maps - key assignment details', {
                                audioId,
                                hasInterpolated: !!cachedInterpolated,
                                hasUnified: !!cachedUnified,
                                hasSubdivided: !!cachedSubdivided,
                                subdividedKeyCount: keyCount,
                            });

                            set({
                                beatMap: cached,
                                error: null,
                                interpolatedBeatMap: cachedInterpolated || null,
                                unifiedBeatMap: cachedUnified || null,
                                subdividedBeatMap: cachedSubdivided || null,
                            });
                            return cached;
                        }
                        return null;
                    },

                    cacheBeatMap: (audioId, beatMap) => {
                        logger.info('BeatDetection', 'Caching beat map', { audioId });
                        set((state) => {
                            let { cachedBeatMaps, cacheOrder } = state;

                            // If this audioId already exists, remove it from order (will be re-added at end)
                            if (cachedBeatMaps[audioId]) {
                                cacheOrder = cacheOrder.filter((id) => id !== audioId);
                            }

                            // Perform auto-eviction if needed
                            const evicted = performAutoEvictionIfNeeded(cachedBeatMaps, cacheOrder);
                            cachedBeatMaps = evicted.cachedBeatMaps;
                            cacheOrder = evicted.cacheOrder;

                            // Add the new beat map
                            return {
                                cachedBeatMaps: { ...cachedBeatMaps, [audioId]: beatMap },
                                cacheOrder: [...cacheOrder, audioId],
                            };
                        });
                    },

                    removeCachedBeatMap: (audioId) => {
                        logger.info('BeatDetection', 'Removing cached beat map', { audioId });
                        set((state) => {
                            const { [audioId]: removed, ...rest } = state.cachedBeatMaps;
                            return {
                                cachedBeatMaps: rest,
                                cacheOrder: state.cacheOrder.filter((id) => id !== audioId),
                            };
                        });
                    },

                    clearAllCachedBeatMaps: () => {
                        logger.warn('BeatDetection', 'Clearing all cached beat maps');
                        set({ cachedBeatMaps: {}, cacheOrder: [] });
                    },

                    getBeatMap: () => {
                        return get().beatMap;
                    },

                    hasCachedBeatMap: (audioId) => {
                        return audioId in get().cachedBeatMaps;
                    },

                    clearError: () => {
                        set({ error: null });
                    },

                    clearStorageError: () => {
                        set({ storageError: null });
                    },

                    clearOldestCachedBeatMaps: (count = 1) => {
                        const state = get();
                        if (state.cacheOrder.length === 0) return;

                        // Remove the oldest entries (first N in cacheOrder)
                        const keysToRemove = state.cacheOrder.slice(0, Math.min(count, state.cacheOrder.length));
                        logger.info('BeatDetection', 'Clearing oldest cached beat maps', {
                            count: keysToRemove.length,
                            keys: keysToRemove,
                        });

                        const newCachedBeatMaps = { ...state.cachedBeatMaps };
                        keysToRemove.forEach((key) => {
                            delete newCachedBeatMaps[key];
                        });

                        set({
                            cachedBeatMaps: newCachedBeatMaps,
                            cacheOrder: state.cacheOrder.slice(keysToRemove.length),
                        });
                    },

                    setDifficultyPreset: (preset) => {
                        logger.info('BeatDetection', 'Setting difficulty preset', { preset });
                        set((state) => ({
                            difficultySettings: {
                                ...state.difficultySettings,
                                preset,
                            },
                        }));
                        // Also update groove analyzer if it exists
                        const state = get();
                        if (state.grooveAnalyzer) {
                            state.grooveAnalyzer.setDifficulty({ preset });
                            logger.info('BeatDetection', 'GrooveAnalyzer difficulty updated', { preset });
                        }
                    },

                    setCustomThreshold: (key, value) => {
                        logger.debug('BeatDetection', 'Setting custom threshold', { key, value });
                        set((state) => ({
                            difficultySettings: {
                                ...state.difficultySettings,
                                preset: 'custom',
                                customThresholds: {
                                    ...state.difficultySettings.customThresholds,
                                    [key]: value,
                                },
                            },
                        }));
                    },

                    resetDifficultySettings: () => {
                        logger.info('BeatDetection', 'Resetting difficulty settings');
                        set({ difficultySettings: { ...DEFAULT_DIFFICULTY_SETTINGS } });
                        // Also update groove analyzer if it exists
                        const state = get();
                        if (state.grooveAnalyzer) {
                            state.grooveAnalyzer.setDifficulty({ preset: 'medium' });
                            logger.info('BeatDetection', 'GrooveAnalyzer difficulty reset to medium');
                        }
                    },

                    setCustomGroovePenalty: (key, value) => {
                        logger.debug('BeatDetection', 'Setting custom groove penalty', { key, value });
                        set((state) => ({
                            difficultySettings: {
                                ...state.difficultySettings,
                                preset: 'custom',
                                customGroovePenalties: {
                                    ...state.difficultySettings.customGroovePenalties,
                                    [key]: value,
                                },
                            },
                        }));
                        // Update groove analyzer if it exists
                        const state = get();
                        if (state.grooveAnalyzer) {
                            const penalties = getGroovePenaltiesForPreset('custom', get().difficultySettings.customGroovePenalties);
                            state.grooveAnalyzer.setDifficulty({
                                preset: 'custom',
                                customPenalties: penalties
                            });
                            logger.debug('BeatDetection', 'GrooveAnalyzer custom penalties applied', penalties);
                        }
                    },

                    setIgnoreKeyRequirements: (ignore) => {
                        logger.info('BeatDetection', 'Setting ignore key requirements', { ignore });
                        set((state) => ({
                            difficultySettings: {
                                ...state.difficultySettings,
                                ignoreKeyRequirements: ignore,
                            },
                        }));
                    },

                    getAccuracyThresholds: () => {
                        const { difficultySettings } = get();
                        if (difficultySettings.preset === 'custom') {
                            // Merge custom thresholds with hard preset as base
                            return {
                                ...HARD_ACCURACY_THRESHOLDS,
                                ...difficultySettings.customThresholds,
                            };
                        }
                        return getAccuracyThresholdsForPreset(difficultySettings.preset);
                    },

                    // ============================================================
                    // Interpolation Actions (Task 2.2)
                    // ============================================================

                    /**
                     * Update interpolation options.
                     * These will be used for subsequent interpolated beat map generations.
                     * @param options - Partial options to merge with existing options
                     */
                    setInterpolationOptions: (options) => {
                        logger.debug('BeatDetection', 'Updating interpolation options', options);
                        set((state) => ({
                            interpolationOptions: {
                                ...state.interpolationOptions,
                                ...options,
                            },
                        }));
                    },

                    /**
                     * Set the beat stream mode for practice/playback.
                     * @param mode - 'detected' for original beats, 'merged' for interpolated + detected
                     */
                    setBeatStreamMode: (mode) => {
                        logger.info('BeatDetection', 'Setting beat stream mode', { mode });
                        set({ beatStreamMode: mode });
                    },

                    /**
                     * Toggle the interpolation visualization visibility.
                     */
                    toggleInterpolationVisualization: () => {
                        const current = get().showInterpolationVisualization;
                        logger.info('BeatDetection', 'Toggling interpolation visualization', { enabled: !current });
                        set({ showInterpolationVisualization: !current });
                    },

                    /**
                     * Toggle the quarter note grid overlay visibility. (Task 5.3)
                     */
                    toggleGridOverlay: () => {
                        const current = get().showGridOverlay;
                        logger.info('BeatDetection', 'Toggling grid overlay', { enabled: !current });
                        set({ showGridOverlay: !current });
                    },

                    /**
                     * Toggle the tempo drift visualization visibility. (Task 5.4)
                     */
                    toggleTempoDriftVisualization: () => {
                        const current = get().showTempoDriftVisualization;
                        logger.info('BeatDetection', 'Toggling tempo drift visualization', { enabled: !current });
                        set({ showTempoDriftVisualization: !current });
                    },

                    /**
                     * Generate an interpolated beat map from the current beat map.
                     * Uses the BeatInterpolator from the engine with current interpolation options.
                     * @returns The generated InterpolatedBeatMap, or null if no beat map is loaded
                     */
                    generateInterpolatedBeatMap: () => {
                        const state = get();
                        const { beatMap, interpolationOptions, autoMultiTempo } = state;

                        if (!beatMap) {
                            logger.warn('BeatDetection', 'No beat map loaded, cannot generate interpolation');
                            return null;
                        }

                        logger.info('BeatDetection', 'Generating interpolated beat map', {
                            beatCount: beatMap.beats.length,
                            enableMultiTempo: autoMultiTempo,
                        });

                        try {
                            // Create interpolator with current options, including enableMultiTempo from state
                            const interpolator = new BeatInterpolator({
                                ...interpolationOptions,
                                enableMultiTempo: autoMultiTempo,
                            });

                            // Generate the interpolated beat map
                            const interpolatedBeatMap = interpolator.interpolate(beatMap);

                            logger.info('BeatDetection', 'Interpolated beat map generated successfully', {
                                detectedBeats: interpolatedBeatMap.detectedBeats.length,
                                mergedBeats: interpolatedBeatMap.mergedBeats.length,
                                interpolatedCount: interpolatedBeatMap.interpolationMetadata.interpolatedBeatCount,
                                quarterNoteBpm: interpolatedBeatMap.quarterNoteBpm,
                            });

                            // Task 2.4: Auto-generate UnifiedBeatMap after interpolation
                            const unifiedMap = unifyBeatMap(interpolatedBeatMap);
                            const currentState = get();
                            set({
                                interpolatedBeatMap,
                                unifiedBeatMap: unifiedMap,
                                subdividedBeatMap: null, // Clear subdivision when unified changes
                                // Cache the unified beat map for persistence
                                cachedUnifiedBeatMaps: {
                                    ...currentState.cachedUnifiedBeatMaps,
                                    [unifiedMap.audioId]: unifiedMap,
                                },
                            });
                            logger.info('BeatDetection', 'UnifiedBeatMap auto-generated from interpolation', {
                                beatCount: unifiedMap.beats.length,
                            });
                            return interpolatedBeatMap;
                        } catch (error) {
                            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                            logger.error('BeatDetection', 'Failed to generate interpolated beat map', { error: errorMessage });
                            set({ error: errorMessage });
                            return null;
                        }
                    },

                    /**
                     * Clear the interpolated beat map and reset interpolation state.
                     */
                    clearInterpolation: () => {
                        logger.info('BeatDetection', 'Clearing interpolation state');
                        set({
                            interpolatedBeatMap: null,
                            showInterpolationVisualization: false,
                            // Task 2.4: Also clear subdivision state since it depends on interpolation
                            unifiedBeatMap: null,
                            subdividedBeatMap: null,
                        });
                    },

                    // ============================================================
                    // Downbeat Configuration Actions (Task 1.3)
                    // ============================================================

                    /**
                     * Apply a new downbeat configuration to the current beat map.
                     * This recalculates beatInMeasure, isDownbeat, and measureNumber for all beats.
                     * Also updates the interpolated beat map if one exists.
                     * Preserves subdivision and key assignments by regenerating the subdivided beat map.
                     */
                    applyDownbeatConfig: (config: DownbeatConfig) => {
                        const state = get();
                        const { beatMap, interpolatedBeatMap, subdividedBeatMap, subdivisionConfig } = state;

                        if (!beatMap) {
                            logger.warn('BeatDetection', 'No beat map loaded, cannot apply downbeat config');
                            return;
                        }

                        logger.info('BeatDetection', 'Applying downbeat config', {
                            segmentCount: config.segments.length,
                            firstSegmentBeatsPerMeasure: config.segments[0]?.timeSignature.beatsPerMeasure,
                            firstSegmentDownbeatIndex: config.segments[0]?.downbeatBeatIndex,
                        });

                        // Preserve key assignments from existing subdivided beat map
                        const savedKeyAssignments = new Map<number, string>();
                        if (subdividedBeatMap) {
                            subdividedBeatMap.beats.forEach((beat, index) => {
                                if (beat.requiredKey !== undefined) {
                                    savedKeyAssignments.set(index, beat.requiredKey);
                                }
                            });
                            logger.info('BeatDetection', 'Preserving key assignments before downbeat change', {
                                keyCount: savedKeyAssignments.size,
                            });
                        }

                        try {
                            // Apply config to the original beat map
                            const updatedBeatMap = reapplyDownbeatConfig(beatMap, config);

                            // Update interpolated beat map if it exists
                            let updatedInterpolatedBeatMap: InterpolatedBeatMap | null = null;
                            let updatedUnifiedBeatMap: UnifiedBeatMap | null = null;
                            if (interpolatedBeatMap) {
                                // Re-interpolate with the updated beat map, including enableMultiTempo from state
                                const interpolator = new BeatInterpolator({
                                    ...state.interpolationOptions,
                                    enableMultiTempo: state.autoMultiTempo,
                                });
                                updatedInterpolatedBeatMap = interpolator.interpolate(updatedBeatMap);
                                logger.info('BeatDetection', 'Re-interpolated beat map with new downbeat config');

                                // Task 2.4: Also regenerate UnifiedBeatMap
                                updatedUnifiedBeatMap = unifyBeatMap(updatedInterpolatedBeatMap);
                                logger.info('BeatDetection', 'UnifiedBeatMap regenerated after downbeat config change');
                            }

                            // Regenerate subdivided beat map if we had one before
                            let updatedSubdividedBeatMap: SubdividedBeatMap | null = null;
                            if (updatedUnifiedBeatMap && subdividedBeatMap) {
                                const subdivider = new BeatSubdivider();
                                updatedSubdividedBeatMap = subdivider.subdivide(updatedUnifiedBeatMap, subdivisionConfig);
                                logger.info('BeatDetection', 'SubdividedBeatMap regenerated with preserved subdivision config', {
                                    beatCount: updatedSubdividedBeatMap.beats.length,
                                });

                                // Restore key assignments
                                if (savedKeyAssignments.size > 0) {
                                    let restoredCount = 0;
                                    updatedSubdividedBeatMap.beats.forEach((beat, index) => {
                                        const savedKey = savedKeyAssignments.get(index);
                                        if (savedKey !== undefined) {
                                            beat.requiredKey = savedKey;
                                            restoredCount++;
                                        }
                                    });
                                    logger.info('BeatDetection', 'Restored key assignments after downbeat change', {
                                        restoredCount,
                                    });
                                }
                            }

                            // Update cache for the regenerated maps
                            const audioId = beatMap.audioId;
                            const cacheUpdates: Partial<BeatDetectionState> = {};
                            if (updatedUnifiedBeatMap) {
                                cacheUpdates.cachedUnifiedBeatMaps = {
                                    ...state.cachedUnifiedBeatMaps,
                                    [audioId]: updatedUnifiedBeatMap,
                                };
                            }
                            if (updatedSubdividedBeatMap) {
                                cacheUpdates.cachedSubdividedBeatMaps = {
                                    ...state.cachedSubdividedBeatMaps,
                                    [audioId]: updatedSubdividedBeatMap,
                                };
                            }

                            set({
                                beatMap: updatedBeatMap,
                                interpolatedBeatMap: updatedInterpolatedBeatMap,
                                unifiedBeatMap: updatedUnifiedBeatMap,
                                subdividedBeatMap: updatedSubdividedBeatMap,
                                downbeatConfig: config,
                                ...cacheUpdates,
                            });

                            logger.info('BeatDetection', 'Downbeat config applied successfully');
                        } catch (error) {
                            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                            logger.error('BeatDetection', 'Failed to apply downbeat config', { error: errorMessage });
                            set({ error: errorMessage });
                        }
                    },

                    /**
                     * Reset downbeat configuration to default (beat 0 = downbeat, 4/4 time).
                     * This sets downbeatConfig to null, indicating default behavior.
                     * Preserves subdivision and key assignments by regenerating the subdivided beat map.
                     */
                    resetDownbeatConfig: () => {
                        const state = get();
                        const { beatMap, interpolatedBeatMap, subdividedBeatMap, subdivisionConfig } = state;

                        if (!beatMap) {
                            logger.warn('BeatDetection', 'No beat map loaded, cannot reset downbeat config');
                            return;
                        }

                        logger.info('BeatDetection', 'Resetting downbeat config to default');

                        // Preserve key assignments from existing subdivided beat map
                        const savedKeyAssignments = new Map<number, string>();
                        if (subdividedBeatMap) {
                            subdividedBeatMap.beats.forEach((beat, index) => {
                                if (beat.requiredKey !== undefined) {
                                    savedKeyAssignments.set(index, beat.requiredKey);
                                }
                            });
                            logger.info('BeatDetection', 'Preserving key assignments before downbeat reset', {
                                keyCount: savedKeyAssignments.size,
                            });
                        }

                        try {
                            // Apply default config to the original beat map
                            const updatedBeatMap = reapplyDownbeatConfig(beatMap, DEFAULT_DOWNBEAT_CONFIG);

                            // Update interpolated beat map if it exists
                            let updatedInterpolatedBeatMap: InterpolatedBeatMap | null = null;
                            let updatedUnifiedBeatMap: UnifiedBeatMap | null = null;
                            if (interpolatedBeatMap) {
                                // Include enableMultiTempo from state
                                const interpolator = new BeatInterpolator({
                                    ...state.interpolationOptions,
                                    enableMultiTempo: state.autoMultiTempo,
                                });
                                updatedInterpolatedBeatMap = interpolator.interpolate(updatedBeatMap);

                                // Task 2.4: Also regenerate UnifiedBeatMap
                                updatedUnifiedBeatMap = unifyBeatMap(updatedInterpolatedBeatMap);
                            }

                            // Regenerate subdivided beat map if we had one before
                            let updatedSubdividedBeatMap: SubdividedBeatMap | null = null;
                            if (updatedUnifiedBeatMap && subdividedBeatMap) {
                                const subdivider = new BeatSubdivider();
                                updatedSubdividedBeatMap = subdivider.subdivide(updatedUnifiedBeatMap, subdivisionConfig);
                                logger.info('BeatDetection', 'SubdividedBeatMap regenerated with preserved subdivision config', {
                                    beatCount: updatedSubdividedBeatMap.beats.length,
                                });

                                // Restore key assignments
                                if (savedKeyAssignments.size > 0) {
                                    let restoredCount = 0;
                                    updatedSubdividedBeatMap.beats.forEach((beat, index) => {
                                        const savedKey = savedKeyAssignments.get(index);
                                        if (savedKey !== undefined) {
                                            beat.requiredKey = savedKey;
                                            restoredCount++;
                                        }
                                    });
                                    logger.info('BeatDetection', 'Restored key assignments after downbeat reset', {
                                        restoredCount,
                                    });
                                }
                            }

                            // Update cache for the regenerated maps
                            const audioId = beatMap.audioId;
                            const cacheUpdates: Partial<BeatDetectionState> = {};
                            if (updatedUnifiedBeatMap) {
                                cacheUpdates.cachedUnifiedBeatMaps = {
                                    ...state.cachedUnifiedBeatMaps,
                                    [audioId]: updatedUnifiedBeatMap,
                                };
                            }
                            if (updatedSubdividedBeatMap) {
                                cacheUpdates.cachedSubdividedBeatMaps = {
                                    ...state.cachedSubdividedBeatMaps,
                                    [audioId]: updatedSubdividedBeatMap,
                                };
                            }

                            set({
                                beatMap: updatedBeatMap,
                                interpolatedBeatMap: updatedInterpolatedBeatMap,
                                unifiedBeatMap: updatedUnifiedBeatMap,
                                subdividedBeatMap: updatedSubdividedBeatMap,
                                downbeatConfig: null, // null = using default
                                ...cacheUpdates,
                            });

                            logger.info('BeatDetection', 'Downbeat config reset to default');
                        } catch (error) {
                            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                            logger.error('BeatDetection', 'Failed to reset downbeat config', { error: errorMessage });
                            set({ error: errorMessage });
                        }
                    },

                    /**
                     * Convenience method to set the downbeat position for a single-segment config.
                     * Creates or updates a single segment with the given downbeat position.
                     */
                    setDownbeatPosition: (beatIndex: number, beatsPerMeasure: number = 4) => {
                        const state = get();
                        const { beatMap } = state;

                        if (!beatMap) {
                            logger.warn('BeatDetection', 'No beat map loaded, cannot set downbeat position');
                            return;
                        }

                        // Clamp beatIndex to valid range
                        const maxBeatIndex = beatMap.beats.length - 1;
                        const clampedBeatIndex = Math.max(0, Math.min(beatIndex, maxBeatIndex));

                        logger.info('BeatDetection', 'Setting downbeat position', {
                            beatIndex: clampedBeatIndex,
                            beatsPerMeasure,
                        });

                        // Create a single-segment config
                        const config: DownbeatConfig = {
                            segments: [{
                                startBeat: 0,
                                downbeatBeatIndex: clampedBeatIndex,
                                timeSignature: { beatsPerMeasure },
                            }],
                        };

                        // Use applyDownbeatConfig to apply the new config
                        state.actions.applyDownbeatConfig(config);
                    },

                    /**
                     * Add a new downbeat segment for time signature changes.
                     * Segments are automatically sorted by startBeat after insertion.
                     */
                    addDownbeatSegment: (segment: DownbeatSegment) => {
                        const state = get();
                        const { downbeatConfig, beatMap } = state;

                        if (!beatMap) {
                            logger.warn('BeatDetection', 'No beat map loaded, cannot add segment');
                            return;
                        }

                        // Get current segments or start with default
                        const currentSegments = downbeatConfig?.segments ?? [...DEFAULT_DOWNBEAT_CONFIG.segments];

                        // Add new segment and sort by startBeat
                        const newSegments = [...currentSegments, segment].sort((a, b) => a.startBeat - b.startBeat);

                        logger.info('BeatDetection', 'Adding downbeat segment', {
                            startBeat: segment.startBeat,
                            beatsPerMeasure: segment.timeSignature.beatsPerMeasure,
                            newSegmentCount: newSegments.length,
                        });

                        // Apply the updated config
                        state.actions.applyDownbeatConfig({ segments: newSegments });
                    },

                    /**
                     * Remove a downbeat segment by index.
                     * Cannot remove the first segment (index 0).
                     */
                    removeDownbeatSegment: (segmentIndex: number) => {
                        const state = get();
                        const { downbeatConfig } = state;

                        // Can't remove if no config or trying to remove first segment
                        if (!downbeatConfig) {
                            logger.warn('BeatDetection', 'No downbeat config to remove segment from');
                            return;
                        }

                        if (segmentIndex === 0) {
                            logger.warn('BeatDetection', 'Cannot remove the first downbeat segment');
                            return;
                        }

                        if (segmentIndex < 0 || segmentIndex >= downbeatConfig.segments.length) {
                            logger.warn('BeatDetection', 'Invalid segment index', { segmentIndex });
                            return;
                        }

                        const newSegments = downbeatConfig.segments.filter((_: DownbeatSegment, index: number) => index !== segmentIndex);

                        logger.info('BeatDetection', 'Removing downbeat segment', {
                            removedIndex: segmentIndex,
                            remainingSegments: newSegments.length,
                        });

                        state.actions.applyDownbeatConfig({ segments: newSegments });
                    },

                    /**
                     * Update a downbeat segment by index.
                     */
                    updateDownbeatSegment: (segmentIndex: number, updates: Partial<DownbeatSegment>) => {
                        const state = get();
                        const { downbeatConfig } = state;

                        if (!downbeatConfig) {
                            logger.warn('BeatDetection', 'No downbeat config to update');
                            return;
                        }

                        if (segmentIndex < 0 || segmentIndex >= downbeatConfig.segments.length) {
                            logger.warn('BeatDetection', 'Invalid segment index', { segmentIndex });
                            return;
                        }

                        const newSegments = downbeatConfig.segments.map((segment: DownbeatSegment, index: number) =>
                            index === segmentIndex
                                ? { ...segment, ...updates }
                                : segment
                        );

                        // Re-sort if startBeat changed
                        if (updates.startBeat !== undefined) {
                            newSegments.sort((a: DownbeatSegment, b: DownbeatSegment) => a.startBeat - b.startBeat);
                        }

                        logger.info('BeatDetection', 'Updating downbeat segment', {
                            segmentIndex,
                            updates,
                        });

                        state.actions.applyDownbeatConfig({ segments: newSegments });
                    },

                    /**
                     * Set whether measure boundary lines and numbers should be shown in the timeline.
                     */
                    setShowMeasureBoundaries: (show: boolean) => {
                        set({ showMeasureBoundaries: show });
                        logger.info('BeatDetection', 'Measure boundaries visibility changed', { show });
                    },

                    /**
                     * Set whether downbeat selection mode is active.
                     * When active, beat markers in the timeline become clickable for setting downbeat position.
                     * Part of Phase 5: BeatMapSummary Integration (Task 5.3)
                     */
                    setDownbeatSelectionMode: (enabled: boolean) => {
                        set({ isDownbeatSelectionMode: enabled });
                        logger.info('BeatDetection', 'Downbeat selection mode changed', { enabled });
                    },

                    setAutoMultiTempo: (enabled: boolean) => {
                        set({ autoMultiTempo: enabled });
                        logger.info('BeatDetection', 'Auto multi-tempo setting changed', { enabled });
                    },

                    // ============================================================
                    // Subdivision Actions (Phase 2: Task 2.2)
                    // ============================================================

                    /**
                     * Generate a UnifiedBeatMap from the current InterpolatedBeatMap.
                     */
                    generateUnifiedBeatMap: () => {
                        const state = get();
                        const { interpolatedBeatMap } = state;

                        if (!interpolatedBeatMap) {
                            logger.warn('BeatDetection', 'No interpolated beat map available, cannot generate UnifiedBeatMap');
                            return null;
                        }

                        try {
                            logger.info('BeatDetection', 'Generating UnifiedBeatMap from InterpolatedBeatMap', {
                                beatCount: interpolatedBeatMap.mergedBeats.length,
                            });

                            const unifiedMap = unifyBeatMap(interpolatedBeatMap);

                            // Clear the subdivided beat map since the unified map changed
                            // Also cache the unified beat map for persistence
                            set({
                                unifiedBeatMap: unifiedMap,
                                subdividedBeatMap: null, // Clear subdivision when unified changes
                                cachedUnifiedBeatMaps: {
                                    ...state.cachedUnifiedBeatMaps,
                                    [unifiedMap.audioId]: unifiedMap,
                                },
                            });

                            logger.info('BeatDetection', 'UnifiedBeatMap generated successfully', {
                                beatCount: unifiedMap.beats.length,
                                quarterNoteInterval: unifiedMap.quarterNoteInterval,
                            });

                            return unifiedMap;
                        } catch (error) {
                            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                            logger.error('BeatDetection', 'Failed to generate UnifiedBeatMap', { error: errorMessage });
                            set({ error: errorMessage });
                            return null;
                        }
                    },

                    /**
                     * Generate a SubdividedBeatMap from the current UnifiedBeatMap.
                     */
                    generateSubdividedBeatMap: () => {
                        const state = get();
                        let { unifiedBeatMap } = state;

                        // Generate unified map if it doesn't exist but we have an interpolated map
                        if (!unifiedBeatMap && state.interpolatedBeatMap) {
                            logger.info('BeatDetection', 'UnifiedBeatMap not found, generating it first');
                            unifiedBeatMap = state.actions.generateUnifiedBeatMap();
                        }

                        if (!unifiedBeatMap) {
                            logger.warn('BeatDetection', 'No UnifiedBeatMap available, cannot generate SubdividedBeatMap');
                            return null;
                        }

                        const { subdivisionConfig } = state;

                        try {
                            logger.info('BeatDetection', 'Generating SubdividedBeatMap', {
                                unifiedBeatCount: unifiedBeatMap.beats.length,
                                customSubdivisionsCount: subdivisionConfig.beatSubdivisions.size,
                                defaultSubdivision: subdivisionConfig.defaultSubdivision,
                            });

                            const subdivider = new BeatSubdivider();
                            const subdividedMap = subdivider.subdivide(unifiedBeatMap, subdivisionConfig);

                            // Update both current state and cache
                            const audioId = subdividedMap.audioId;
                            set((state) => ({
                                subdividedBeatMap: subdividedMap,
                                cachedSubdividedBeatMaps: {
                                    ...state.cachedSubdividedBeatMaps,
                                    [audioId]: subdividedMap,
                                },
                            }));

                            logger.info('BeatDetection', 'SubdividedBeatMap generated successfully', {
                                beatCount: subdividedMap.beats.length,
                                metadata: subdividedMap.subdivisionMetadata,
                            });

                            return subdividedMap;
                        } catch (error) {
                            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                            logger.error('BeatDetection', 'Failed to generate SubdividedBeatMap', { error: errorMessage });
                            set({ error: errorMessage });
                            return null;
                        }
                    },

                    /**
                     * Update the subdivision configuration.
                     */
                    setSubdivisionConfig: (config: SubdivisionConfig) => {
                        const state = get();

                        logger.info('BeatDetection', 'Updating subdivision config', {
                            beatSubdivisionsCount: config.beatSubdivisions.size,
                            defaultSubdivision: config.defaultSubdivision,
                        });

                        set({ subdivisionConfig: config });

                        // Regenerate subdivided beat map if one exists
                        if (state.subdividedBeatMap) {
                            logger.info('BeatDetection', 'Regenerating SubdividedBeatMap due to config change');
                            state.actions.generateSubdividedBeatMap();
                        }
                    },

                    /**
                     * Set subdivision for a specific beat index.
                     */
                    setBeatSubdivision: (beatIndex: number, subdivision: SubdivisionType) => {
                        const state = get();
                        const { subdivisionConfig } = state;

                        if (beatIndex < 0) {
                            logger.warn('BeatDetection', 'Invalid beat index', { beatIndex });
                            return;
                        }

                        const newBeatSubdivisions = new Map(subdivisionConfig.beatSubdivisions);
                        newBeatSubdivisions.set(beatIndex, subdivision);

                        logger.info('BeatDetection', 'Setting beat subdivision', {
                            beatIndex,
                            subdivision,
                        });

                        state.actions.setSubdivisionConfig({
                            ...subdivisionConfig,
                            beatSubdivisions: newBeatSubdivisions,
                        });
                    },

                    /**
                     * Set subdivision for a range of beats.
                     */
                    setBeatSubdivisionRange: (startBeat: number, endBeat: number, subdivision: SubdivisionType) => {
                        const state = get();
                        const { subdivisionConfig } = state;

                        if (startBeat < 0 || endBeat < startBeat) {
                            logger.warn('BeatDetection', 'Invalid beat range', { startBeat, endBeat });
                            return;
                        }

                        const newBeatSubdivisions = new Map(subdivisionConfig.beatSubdivisions);
                        for (let i = startBeat; i <= endBeat; i++) {
                            newBeatSubdivisions.set(i, subdivision);
                        }

                        logger.info('BeatDetection', 'Setting beat subdivision range', {
                            startBeat,
                            endBeat,
                            subdivision,
                            beatsAffected: endBeat - startBeat + 1,
                        });

                        state.actions.setSubdivisionConfig({
                            ...subdivisionConfig,
                            beatSubdivisions: newBeatSubdivisions,
                        });
                    },

                    /**
                     * Clear subdivision for a specific beat (reset to default).
                     */
                    clearBeatSubdivision: (beatIndex: number) => {
                        const state = get();
                        const { subdivisionConfig } = state;

                        if (beatIndex < 0) {
                            logger.warn('BeatDetection', 'Invalid beat index', { beatIndex });
                            return;
                        }

                        const newBeatSubdivisions = new Map(subdivisionConfig.beatSubdivisions);
                        const hadSubdivision = newBeatSubdivisions.delete(beatIndex);

                        if (hadSubdivision) {
                            logger.info('BeatDetection', 'Cleared beat subdivision', { beatIndex });

                            state.actions.setSubdivisionConfig({
                                ...subdivisionConfig,
                                beatSubdivisions: newBeatSubdivisions,
                            });
                        } else {
                            logger.debug('BeatDetection', 'Beat had no custom subdivision', { beatIndex });
                        }
                    },

                    /**
                     * Clear all beat subdivisions (reset all to default).
                     */
                    clearAllBeatSubdivisions: () => {
                        const state = get();
                        const { subdivisionConfig } = state;

                        logger.info('BeatDetection', 'Clearing all beat subdivisions');

                        state.actions.setSubdivisionConfig({
                            ...subdivisionConfig,
                            beatSubdivisions: new Map(),
                        });
                    },

                    /**
                     * Set all beats to a specific subdivision.
                     */
                    setAllBeatSubdivisions: (subdivision: SubdivisionType) => {
                        const state = get();
                        const { subdivisionConfig, unifiedBeatMap } = state;

                        logger.info('BeatDetection', 'Setting all beats to subdivision', { subdivision });

                        // If we have a unified beat map, we know how many beats there are
                        // Otherwise, we just change the default
                        if (unifiedBeatMap && unifiedBeatMap.beats.length > 0) {
                            const newBeatSubdivisions = new Map<number, SubdivisionType>();
                            for (let i = 0; i < unifiedBeatMap.beats.length; i++) {
                                newBeatSubdivisions.set(i, subdivision);
                            }
                            state.actions.setSubdivisionConfig({
                                beatSubdivisions: newBeatSubdivisions,
                                defaultSubdivision: subdivision,
                            });
                        } else {
                            // Just change the default
                            state.actions.setSubdivisionConfig({
                                ...subdivisionConfig,
                                defaultSubdivision: subdivision,
                            });
                        }
                    },

                    /**
                     * Set the current subdivision type for real-time mode.
                     * When transition mode is deferred ('next-downbeat' or 'next-measure'),
                     * the subdivision is stored as pending and only applied when the transition
                     * point is reached. This allows the UI to show a preview of the upcoming
                     * change while keeping the current measure's rhythm intact.
                     */
                    setCurrentSubdivision: (subdivision: SubdivisionType) => {
                        const state = get();

                        logger.info('BeatDetection', 'Setting current subdivision', {
                            subdivision,
                            previousSubdivision: state.currentSubdivision,
                            transitionMode: state.subdivisionTransitionMode,
                        });

                        // If transition mode is immediate, update currentSubdivision right away
                        // Otherwise, store as pending subdivision for deferred application
                        if (state.subdivisionTransitionMode === 'immediate') {
                            set({ currentSubdivision: subdivision, pendingSubdivision: null });
                        } else {
                            // Store as pending - the controller will notify when transition happens
                            set({ pendingSubdivision: subdivision });
                        }

                        // Always update the playback controller - it handles the deferred logic internally
                        const controller = getActiveSubdivisionPlaybackController();
                        if (controller) {
                            controller.setSubdivision(subdivision);
                            logger.info('BeatDetection', 'Updated playback controller subdivision');
                        }
                    },

                    /**
                     * Set the transition mode for subdivision changes.
                     * Updates both store state and active playback controller.
                     */
                    setSubdivisionTransitionMode: (mode: 'immediate' | 'next-downbeat' | 'next-measure') => {
                        logger.info('BeatDetection', 'Setting subdivision transition mode', {
                            mode,
                            previousMode: get().subdivisionTransitionMode,
                        });

                        set({ subdivisionTransitionMode: mode });

                        // Also update the playback controller if it exists
                        const controller = getActiveSubdivisionPlaybackController();
                        if (controller) {
                            controller.setTransitionMode(mode);
                            logger.info('BeatDetection', 'Updated playback controller transition mode');
                        }
                    },

                    /**
                     * Initialize the SubdivisionPlaybackController for real-time mode.
                     */
                    initializeSubdivisionPlayback: (
                        audioContext: AudioContext,
                        options?: Partial<SubdivisionPlaybackOptions>
                    ) => {
                        const state = get();

                        // Clean up any existing controller first
                        const existingController = getActiveSubdivisionPlaybackController();
                        if (existingController) {
                            logger.info('BeatDetection', 'Cleaning up existing SubdivisionPlaybackController');
                            existingController.dispose();
                            setActiveSubdivisionPlaybackController(null);
                        }

                        // Ensure we have a UnifiedBeatMap
                        let { unifiedBeatMap } = state;
                        if (!unifiedBeatMap && state.interpolatedBeatMap) {
                            logger.info('BeatDetection', 'Generating UnifiedBeatMap for playback controller');
                            unifiedBeatMap = state.actions.generateUnifiedBeatMap();
                        }

                        if (!unifiedBeatMap) {
                            logger.warn('BeatDetection', 'No UnifiedBeatMap available, cannot initialize SubdivisionPlaybackController');
                            return null;
                        }

                        // Merge provided options with defaults and persisted state
                        const playbackOptions: SubdivisionPlaybackOptions = {
                            ...DEFAULT_SUBDIVISION_PLAYBACK_OPTIONS,
                            initialSubdivision: state.currentSubdivision,
                            transitionMode: state.subdivisionTransitionMode,
                            ...options,
                            // Add callback to notify store when subdivision actually changes
                            onSubdivisionChange: (_oldType: SubdivisionType, newType: SubdivisionType) => {
                                const currentState = get();
                                // Only update if there's a pending subdivision
                                // This ensures the store's currentSubdivision stays in sync with the controller
                                if (currentState.pendingSubdivision === newType) {
                                    logger.info('BeatDetection', 'Subdivision transition completed', {
                                        newSubdivision: newType,
                                    });
                                    set({ currentSubdivision: newType, pendingSubdivision: null });
                                }
                            },
                        };

                        try {
                            logger.info('BeatDetection', 'Initializing SubdivisionPlaybackController', {
                                beatCount: unifiedBeatMap.beats.length,
                                initialSubdivision: playbackOptions.initialSubdivision,
                                transitionMode: playbackOptions.transitionMode,
                            });

                            const controller = new SubdivisionPlaybackController(
                                unifiedBeatMap,
                                audioContext,
                                playbackOptions
                            );

                            setActiveSubdivisionPlaybackController(controller);

                            logger.info('BeatDetection', 'SubdivisionPlaybackController initialized successfully');

                            return controller;
                        } catch (error) {
                            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                            logger.error('BeatDetection', 'Failed to initialize SubdivisionPlaybackController', {
                                error: errorMessage,
                            });
                            set({ error: errorMessage });
                            return null;
                        }
                    },

                    /**
                     * Clean up the SubdivisionPlaybackController.
                     */
                    cleanupSubdivisionPlayback: () => {
                        const controller = getActiveSubdivisionPlaybackController();

                        if (controller) {
                            logger.info('BeatDetection', 'Cleaning up SubdivisionPlaybackController');
                            controller.dispose();
                            setActiveSubdivisionPlaybackController(null);
                        } else {
                            logger.debug('BeatDetection', 'No SubdivisionPlaybackController to clean up');
                        }
                    },

                    // ============================================================
                    // Chart Editor Actions (Phase 2: Task 2.3 - Required Keys)
                    // ============================================================

                    startChartEditor: () => {
                        const state = get();

                        // Chart editor only works with subdivided beat maps
                        if (!state.subdividedBeatMap) {
                            logger.warn('BeatDetection', 'Cannot start chart editor: no subdivided beat map');
                            return;
                        }

                        logger.info('BeatDetection', 'Starting chart editor');
                        set({
                            chartEditorActive: true,
                            editorMode: 'view',
                            selectedKey: null,
                        });
                    },

                    stopChartEditor: () => {
                        logger.info('BeatDetection', 'Stopping chart editor');
                        set({
                            chartEditorActive: false,
                            editorMode: 'view',
                            selectedKey: null,
                        });
                    },

                    setChartStyle: (style: ChartStyle) => {
                        const state = get();
                        logger.info('BeatDetection', 'Setting chart style', { style });

                        // If switching styles, clear the selected key if it's not valid for the new style
                        let newSelectedKey = state.selectedKey;
                        if (state.selectedKey) {
                            const validKeys = style === 'ddr'
                                ? ['up', 'down', 'left', 'right']
                                : ['1', '2', '3', '4', '5'];
                            if (!validKeys.includes(state.selectedKey)) {
                                newSelectedKey = null;
                            }
                        }

                        set({
                            chartStyle: style,
                            selectedKey: newSelectedKey,
                        });
                    },

                    setSelectedKey: (key: SupportedKey | null) => {
                        logger.debug('BeatDetection', 'Setting selected key', { key });
                        set({ selectedKey: key });
                    },

                    setEditorMode: (mode: ChartEditorMode) => {
                        logger.debug('BeatDetection', 'Setting editor mode', { mode });
                        set({ editorMode: mode });
                    },

                    /**
                     * Helper to update subdivided beat map and cache together.
                     * This ensures key assignments are persisted across page refreshes.
                     */
                    updateSubdividedBeatMapWithCache: (updatedMap: SubdividedBeatMap) => {
                        const audioId = updatedMap.audioId;
                        set((state) => ({
                            subdividedBeatMap: updatedMap,
                            cachedSubdividedBeatMaps: {
                                ...state.cachedSubdividedBeatMaps,
                                [audioId]: updatedMap,
                            },
                        }));
                    },

                    assignKeyToBeat: (beatIndex: number, key: string | null) => {
                        const state = get();

                        if (!state.subdividedBeatMap) {
                            logger.warn('BeatDetection', 'Cannot assign key: no subdivided beat map');
                            return;
                        }

                        if (beatIndex < 0 || beatIndex >= state.subdividedBeatMap.beats.length) {
                            logger.warn('BeatDetection', 'Invalid beat index', { beatIndex, beatCount: state.subdividedBeatMap.beats.length });
                            return;
                        }

                        logger.info('BeatDetection', 'Assigning key to beat', { beatIndex, key });

                        // Create a new beats array with the updated beat
                        const updatedBeats = [...state.subdividedBeatMap.beats];
                        const beat = { ...updatedBeats[beatIndex] };

                        if (key === null) {
                            // Remove the requiredKey
                            delete beat.requiredKey;
                        } else {
                            // Set the requiredKey
                            beat.requiredKey = key;
                        }

                        updatedBeats[beatIndex] = beat;

                        // Update the subdivided beat map and cache
                        const updatedMap = {
                            ...state.subdividedBeatMap,
                            beats: updatedBeats,
                        };
                        state.actions.updateSubdividedBeatMapWithCache(updatedMap);
                    },

                    assignKeysToBeats: (assignments: KeyAssignment[]) => {
                        const state = get();

                        if (!state.subdividedBeatMap) {
                            logger.warn('BeatDetection', 'Cannot assign keys: no subdivided beat map');
                            return;
                        }

                        if (assignments.length === 0) {
                            return;
                        }

                        logger.info('BeatDetection', 'Assigning keys to multiple beats', { count: assignments.length });

                        // Create a map of beat index to key for efficient lookup
                        const assignmentMap = new Map<number, string | null>();
                        for (const assignment of assignments) {
                            assignmentMap.set(assignment.beatIndex, assignment.key);
                        }

                        // Create a new beats array with updated beats
                        const updatedBeats = state.subdividedBeatMap.beats.map((beat, index) => {
                            const newKey = assignmentMap.get(index);
                            if (newKey === undefined) {
                                // No assignment for this beat
                                return beat;
                            }

                            const updatedBeat = { ...beat };
                            if (newKey === null) {
                                // Remove the requiredKey
                                delete updatedBeat.requiredKey;
                            } else {
                                // Set the requiredKey
                                updatedBeat.requiredKey = newKey;
                            }
                            return updatedBeat;
                        });

                        // Update the subdivided beat map and cache
                        const updatedMap = {
                            ...state.subdividedBeatMap,
                            beats: updatedBeats,
                        };
                        state.actions.updateSubdividedBeatMapWithCache(updatedMap);
                    },

                    clearAllKeys: () => {
                        const state = get();

                        if (!state.subdividedBeatMap) {
                            logger.warn('BeatDetection', 'Cannot clear keys: no subdivided beat map');
                            return;
                        }

                        logger.info('BeatDetection', 'Clearing all key assignments');

                        // Create a new beats array with all requiredKey fields removed
                        const updatedBeats = state.subdividedBeatMap.beats.map((beat) => {
                            const updatedBeat = { ...beat };
                            delete updatedBeat.requiredKey;
                            return updatedBeat;
                        });

                        // Update the subdivided beat map and cache
                        const updatedMap = {
                            ...state.subdividedBeatMap,
                            beats: updatedBeats,
                        };
                        state.actions.updateSubdividedBeatMapWithCache(updatedMap);
                    },

                    setKeyLaneViewMode: (mode: KeyLaneViewMode) => {
                        logger.info('BeatDetection', 'Setting KeyLane view mode', { mode });
                        set({ keyLaneViewMode: mode });
                    },

                    // ============================================================
                    // Level Import/Export Actions (Phase 2: Task 2.5)
                    // ============================================================

                    exportLevel: (audioTitle?: string) => {
                        const state = get();

                        if (!state.subdividedBeatMap) {
                            logger.warn('BeatDetection', 'Cannot export level: no subdivided beat map');
                            return null;
                        }

                        const beatMap = state.subdividedBeatMap;

                        // Convert beats to LevelExportBeat format
                        const exportBeats: LevelExportBeat[] = beatMap.beats.map((beat) => ({
                            timestamp: beat.timestamp,
                            beatInMeasure: beat.beatInMeasure,
                            isDownbeat: beat.isDownbeat,
                            measureNumber: beat.measureNumber,
                            intensity: beat.intensity,
                            confidence: beat.confidence,
                            ...(beat.requiredKey !== undefined && { requiredKey: beat.requiredKey }),
                        }));

                        // Get chart metadata
                        const keyCount = getKeyCount(beatMap);
                        const usedKeys = getUsedKeys(beatMap);

                        const levelData: LevelExportData = {
                            version: 1,
                            audioId: beatMap.audioId,
                            audioTitle,
                            exportedAt: Date.now(),
                            beatCount: beatMap.beats.length,
                            beats: exportBeats,
                            subdivisionConfig: state.subdivisionConfig,
                            chartStyle: state.chartStyle,
                            metadata: {
                                keyCount,
                                usedKeys,
                            },
                        };

                        logger.info('BeatDetection', 'Exported level', {
                            audioId: levelData.audioId,
                            beatCount: levelData.beatCount,
                            keyCount: levelData.metadata.keyCount,
                            chartStyle: levelData.chartStyle,
                        });

                        return levelData;
                    },

                    importLevel: (data: LevelExportData) => {
                        const state = get();

                        // First validate the structure
                        const structureValidation = validateLevelExportData(data);
                        if (!structureValidation.valid) {
                            logger.warn('BeatDetection', 'Level import failed: invalid structure', {
                                errors: structureValidation.errors,
                            });
                            return structureValidation;
                        }

                        // Check if we have a subdivided beat map
                        if (!state.subdividedBeatMap) {
                            const error: LevelImportValidationResult = {
                                valid: false,
                                errors: ['No subdivided beat map loaded. Generate a beat map first.'],
                                warnings: [],
                            };
                            logger.warn('BeatDetection', 'Level import failed: no subdivided beat map');
                            return error;
                        }

                        // Validate audioId match (exact match required)
                        if (state.subdividedBeatMap.audioId !== data.audioId) {
                            const error: LevelImportValidationResult = {
                                valid: false,
                                errors: [
                                    `Audio ID mismatch. Current: "${state.subdividedBeatMap.audioId}", Import: "${data.audioId}". Level must be imported for the same audio.`,
                                ],
                                warnings: [],
                            };
                            logger.warn('BeatDetection', 'Level import failed: audioId mismatch', {
                                currentAudioId: state.subdividedBeatMap.audioId,
                                importAudioId: data.audioId,
                            });
                            return error;
                        }

                        // Validate beat count match
                        if (state.subdividedBeatMap.beats.length !== data.beatCount) {
                            const error: LevelImportValidationResult = {
                                valid: false,
                                errors: [
                                    `Beat count mismatch. Current: ${state.subdividedBeatMap.beats.length}, Import: ${data.beatCount}. Beat map must be regenerated with the same subdivision settings.`,
                                ],
                                warnings: [],
                            };
                            logger.warn('BeatDetection', 'Level import failed: beat count mismatch', {
                                currentBeatCount: state.subdividedBeatMap.beats.length,
                                importBeatCount: data.beatCount,
                            });
                            return error;
                        }

                        // All validations passed - apply the key assignments
                        logger.info('BeatDetection', 'Importing level', {
                            audioId: data.audioId,
                            beatCount: data.beatCount,
                            keyCount: data.metadata.keyCount,
                            chartStyle: data.chartStyle,
                        });

                        // Create a map of beat index to requiredKey from the import data
                        const keyMap = new Map<number, string>();
                        for (let i = 0; i < data.beats.length; i++) {
                            const beat = data.beats[i];
                            if (beat.requiredKey !== undefined) {
                                keyMap.set(i, beat.requiredKey);
                            }
                        }

                        // Apply key assignments to the subdivided beat map
                        const updatedBeats = state.subdividedBeatMap.beats.map((beat, index) => {
                            const updatedBeat = { ...beat };
                            const requiredKey = keyMap.get(index);

                            if (requiredKey !== undefined) {
                                updatedBeat.requiredKey = requiredKey;
                            } else {
                                // Remove any existing requiredKey if the import doesn't have one
                                delete updatedBeat.requiredKey;
                            }

                            return updatedBeat;
                        });

                        // Update the state AND cache (fix for import persistence)
                        const audioId = state.subdividedBeatMap.audioId;
                        const updatedSubdividedMap = {
                            ...state.subdividedBeatMap,
                            beats: updatedBeats,
                        };
                        set((state) => ({
                            subdividedBeatMap: updatedSubdividedMap,
                            chartStyle: data.chartStyle,
                            cachedSubdividedBeatMaps: {
                                ...state.cachedSubdividedBeatMaps,
                                [audioId]: updatedSubdividedMap,
                            },
                        }));

                        const successResult: LevelImportValidationResult = {
                            valid: true,
                            errors: [],
                            warnings: [],
                        };

                        logger.info('BeatDetection', 'Level import successful', {
                            keysAssigned: keyMap.size,
                            chartStyle: data.chartStyle,
                        });

                        return successResult;
                    },

                    // ============================================================
                    // Full Beat Map Export/Import Actions (Complete State Export)
                    // ============================================================

                    exportFullBeatMap: (audioTitle?: string) => {
                        const state = get();

                        // Need at least an interpolated beat map to export
                        if (!state.interpolatedBeatMap || !state.beatMap) {
                            logger.warn('BeatDetection', 'Cannot export full beat map: no beat map loaded');
                            return null;
                        }

                        const interpolatedMap = state.interpolatedBeatMap;
                        const originalBeatMap = state.beatMap;

                        // Build the export data
                        const exportData: FullBeatMapExportData = {
                            version: 1,
                            format: 'full-beatmap',
                            audioId: interpolatedMap.audioId,
                            audioTitle,
                            exportedAt: Date.now(),
                            duration: originalBeatMap.duration,
                            quarterNoteBpm: interpolatedMap.quarterNoteBpm,
                            quarterNoteConfidence: interpolatedMap.quarterNoteConfidence,
                            detectedBeats: interpolatedMap.detectedBeats.map(b => ({
                                timestamp: b.timestamp,
                                isDownbeat: b.isDownbeat,
                                confidence: b.confidence,
                                beatInMeasure: b.beatInMeasure,
                                measureNumber: b.measureNumber,
                                intensity: b.intensity,
                            })),
                            mergedBeats: interpolatedMap.mergedBeats.map(b => ({
                                timestamp: b.timestamp,
                                isDownbeat: b.isDownbeat,
                                confidence: b.confidence,
                                beatInMeasure: b.beatInMeasure,
                                measureNumber: b.measureNumber,
                                intensity: b.intensity,
                                source: b.source,
                                distanceToAnchor: b.distanceToAnchor,
                                nearestAnchorTimestamp: b.nearestAnchorTimestamp,
                            })),
                            interpolatedMetadata: {
                                interpolatedBeatCount: interpolatedMap.interpolationMetadata.interpolatedBeatCount,
                                detectedBeatCount: interpolatedMap.interpolationMetadata.detectedBeatCount,
                                totalBeatCount: interpolatedMap.interpolationMetadata.totalBeatCount,
                                interpolationRatio: interpolatedMap.interpolationMetadata.interpolationRatio,
                                avgInterpolatedConfidence: interpolatedMap.interpolationMetadata.avgInterpolatedConfidence,
                                tempoDriftRatio: interpolatedMap.interpolationMetadata.tempoDriftRatio,
                                hasMultipleTempos: interpolatedMap.interpolationMetadata.hasMultipleTempos,
                                quarterNoteDetection: {
                                    intervalSeconds: interpolatedMap.interpolationMetadata.quarterNoteDetection.intervalSeconds,
                                    bpm: interpolatedMap.interpolationMetadata.quarterNoteDetection.bpm,
                                    confidence: interpolatedMap.interpolationMetadata.quarterNoteDetection.confidence,
                                    histogramPeak: interpolatedMap.interpolationMetadata.quarterNoteDetection.histogramPeak,
                                    secondaryPeaks: interpolatedMap.interpolationMetadata.quarterNoteDetection.secondaryPeaks,
                                    method: interpolatedMap.interpolationMetadata.quarterNoteDetection.method,
                                    denseSectionCount: interpolatedMap.interpolationMetadata.quarterNoteDetection.denseSectionCount,
                                    denseSectionBeats: interpolatedMap.interpolationMetadata.quarterNoteDetection.denseSectionBeats,
                                },
                                gapAnalysis: {
                                    totalGaps: interpolatedMap.interpolationMetadata.gapAnalysis.totalGaps,
                                    halfNoteGaps: interpolatedMap.interpolationMetadata.gapAnalysis.halfNoteGaps,
                                    anomalies: interpolatedMap.interpolationMetadata.gapAnalysis.anomalies,
                                    avgGapSize: interpolatedMap.interpolationMetadata.gapAnalysis.avgGapSize,
                                    gridAlignmentScore: interpolatedMap.interpolationMetadata.gapAnalysis.gridAlignmentScore,
                                },
                            },
                            subdivision: state.subdividedBeatMap ? {
                                config: {
                                    beatSubdivisions: Array.from(state.subdivisionConfig.beatSubdivisions.entries()),
                                    defaultSubdivision: state.subdivisionConfig.defaultSubdivision,
                                },
                                beats: state.subdividedBeatMap.beats.map(b => ({
                                    timestamp: b.timestamp,
                                    beatInMeasure: b.beatInMeasure,
                                    isDownbeat: b.isDownbeat,
                                    measureNumber: b.measureNumber,
                                    intensity: b.intensity,
                                    confidence: b.confidence,
                                    isDetected: b.isDetected,
                                    originalBeatIndex: b.originalBeatIndex ?? null,
                                    subdivisionType: b.subdivisionType,
                                    ...(b.requiredKey !== undefined && { requiredKey: b.requiredKey }),
                                })),
                                metadata: {
                                    originalBeatCount: state.subdividedBeatMap.subdivisionMetadata.originalBeatCount,
                                    subdividedBeatCount: state.subdividedBeatMap.subdivisionMetadata.subdividedBeatCount,
                                    averageDensityMultiplier: state.subdividedBeatMap.subdivisionMetadata.averageDensityMultiplier,
                                    explicitBeatCount: state.subdividedBeatMap.subdivisionMetadata.explicitBeatCount,
                                    subdivisionsUsed: state.subdividedBeatMap.subdivisionMetadata.subdivisionsUsed as SubdivisionType[],
                                    hasMultipleTempos: state.subdividedBeatMap.subdivisionMetadata.hasMultipleTempos,
                                    maxDensity: state.subdividedBeatMap.subdivisionMetadata.maxDensity,
                                },
                            } : null,
                            chart: state.subdividedBeatMap && getKeyCount(state.subdividedBeatMap) > 0 ? {
                                style: state.chartStyle,
                                keyCount: getKeyCount(state.subdividedBeatMap),
                                usedKeys: getUsedKeys(state.subdividedBeatMap),
                            } : null,
                        };

                        logger.info('BeatDetection', 'Exported full beat map', {
                            audioId: exportData.audioId,
                            detectedBeatCount: exportData.detectedBeats.length,
                            mergedBeatCount: exportData.mergedBeats.length,
                            hasSubdivision: !!exportData.subdivision,
                            hasChart: !!exportData.chart,
                        });

                        return exportData;
                    },

                    importFullBeatMap: (data: FullBeatMapExportData) => {
                        // First validate the structure
                        const validation = validateFullBeatMapExportData(data);
                        if (!validation.success) {
                            logger.warn('BeatDetection', 'Full beat map import failed: invalid structure', {
                                errors: validation.errors,
                            });
                            return validation;
                        }

                        logger.info('BeatDetection', 'Importing full beat map', {
                            audioId: data.audioId,
                            detectedBeatCount: data.detectedBeats.length,
                            mergedBeatCount: data.mergedBeats.length,
                            hasSubdivision: !!data.subdivision,
                            hasChart: !!data.chart,
                        });

                        // Reconstruct the interpolated beat map
                        const interpolatedBeatMap: InterpolatedBeatMap = {
                            audioId: data.audioId,
                            duration: data.duration,
                            quarterNoteBpm: data.quarterNoteBpm,
                            quarterNoteConfidence: data.quarterNoteConfidence,
                            quarterNoteInterval: data.quarterNoteBpm > 0 ? 60 / data.quarterNoteBpm : 0.5,
                            originalMetadata: {
                                algorithm: 'imported',
                                version: '1.0',
                                generatedAt: new Date().toISOString(),
                                minBpm: 60,
                                maxBpm: 180,
                                sensitivity: 1.0,
                                filter: 0.0,
                                noiseFloorThreshold: 0,
                                hopSizeMs: 4,
                                fftSize: 2048,
                                dpAlpha: 680,
                                melBands: 40,
                                highPassCutoff: 0.4,
                                gaussianSmoothMs: 20,
                                tempoCenter: 0.5,
                                tempoWidth: 1.4,
                                useOctaveResolution: false,
                                useTripleMeter: false,
                            },
                            detectedBeats: data.detectedBeats.map(b => ({
                                timestamp: b.timestamp,
                                isDownbeat: b.isDownbeat,
                                confidence: b.confidence,
                                beatInMeasure: b.beatInMeasure,
                                measureNumber: b.measureNumber,
                                intensity: b.intensity,
                            })),
                            mergedBeats: data.mergedBeats.map(b => ({
                                timestamp: b.timestamp,
                                isDownbeat: b.isDownbeat,
                                confidence: b.confidence,
                                beatInMeasure: b.beatInMeasure,
                                measureNumber: b.measureNumber,
                                intensity: b.intensity,
                                source: b.source,
                                distanceToAnchor: b.distanceToAnchor,
                                nearestAnchorTimestamp: b.nearestAnchorTimestamp,
                            })),
                            interpolationMetadata: {
                                interpolatedBeatCount: data.interpolatedMetadata.interpolatedBeatCount,
                                detectedBeatCount: data.interpolatedMetadata.detectedBeatCount,
                                totalBeatCount: data.interpolatedMetadata.totalBeatCount,
                                interpolationRatio: data.interpolatedMetadata.interpolationRatio,
                                avgInterpolatedConfidence: data.interpolatedMetadata.avgInterpolatedConfidence,
                                tempoDriftRatio: data.interpolatedMetadata.tempoDriftRatio,
                                hasMultipleTempos: data.interpolatedMetadata.hasMultipleTempos,
                                quarterNoteDetection: {
                                    intervalSeconds: data.interpolatedMetadata.quarterNoteDetection.intervalSeconds,
                                    bpm: data.interpolatedMetadata.quarterNoteDetection.bpm,
                                    confidence: data.interpolatedMetadata.quarterNoteDetection.confidence,
                                    histogramPeak: data.interpolatedMetadata.quarterNoteDetection.histogramPeak,
                                    secondaryPeaks: data.interpolatedMetadata.quarterNoteDetection.secondaryPeaks,
                                    method: data.interpolatedMetadata.quarterNoteDetection.method,
                                    denseSectionCount: data.interpolatedMetadata.quarterNoteDetection.denseSectionCount,
                                    denseSectionBeats: data.interpolatedMetadata.quarterNoteDetection.denseSectionBeats,
                                },
                                gapAnalysis: {
                                    totalGaps: data.interpolatedMetadata.gapAnalysis.totalGaps,
                                    halfNoteGaps: data.interpolatedMetadata.gapAnalysis.halfNoteGaps,
                                    anomalies: data.interpolatedMetadata.gapAnalysis.anomalies,
                                    avgGapSize: data.interpolatedMetadata.gapAnalysis.avgGapSize,
                                    gridAlignmentScore: data.interpolatedMetadata.gapAnalysis.gridAlignmentScore,
                                },
                            },
                        };

                        // Reconstruct the original beat map (minimal version for reference)
                        const beatMap: BeatMap = {
                            audioId: data.audioId,
                            duration: data.duration,
                            beats: data.detectedBeats.map(b => ({
                                timestamp: b.timestamp,
                                isDownbeat: b.isDownbeat,
                                confidence: b.confidence,
                                beatInMeasure: b.beatInMeasure,
                                measureNumber: b.measureNumber,
                                intensity: b.intensity,
                            })),
                            bpm: data.quarterNoteBpm,
                            metadata: {
                                algorithm: 'imported',
                                version: '1.0',
                                generatedAt: new Date().toISOString(),
                                minBpm: 60,
                                maxBpm: 180,
                                sensitivity: 1.0,
                                filter: 0.0,
                                noiseFloorThreshold: 0,
                                hopSizeMs: 4,
                                fftSize: 2048,
                                dpAlpha: 680,
                                melBands: 40,
                                highPassCutoff: 0.4,
                                gaussianSmoothMs: 20,
                                tempoCenter: 0.5,
                                tempoWidth: 1.4,
                                useOctaveResolution: false,
                                useTripleMeter: false,
                            },
                        };

                        // Build the update state
                        const updateState: Partial<BeatDetectionState> = {
                            beatMap,
                            interpolatedBeatMap,
                            // Clear any previous error
                            storageError: null,
                        };

                        // Restore subdivision data if present
                        if (data.subdivision) {
                            // Convert JSON config back to proper SubdivisionConfig with Map
                            const subdivisionConfig: SubdivisionConfig = {
                                beatSubdivisions: new Map(data.subdivision.config.beatSubdivisions.map(
                                    ([idx, type]) => [idx, type as SubdivisionType]
                                )),
                                defaultSubdivision: data.subdivision.config.defaultSubdivision as SubdivisionType,
                            };

                            const subdividedBeatMap: SubdividedBeatMap = {
                                audioId: data.audioId,
                                duration: data.duration,
                                beats: data.subdivision.beats.map(b => ({
                                    timestamp: b.timestamp,
                                    beatInMeasure: b.beatInMeasure,
                                    isDownbeat: b.isDownbeat,
                                    measureNumber: b.measureNumber,
                                    intensity: b.intensity,
                                    confidence: b.confidence,
                                    isDetected: b.isDetected,
                                    originalBeatIndex: b.originalBeatIndex ?? undefined,
                                    subdivisionType: b.subdivisionType as SubdivisionType,
                                    ...(b.requiredKey !== undefined && { requiredKey: b.requiredKey }),
                                })),
                                detectedBeatIndices: [],  // We don't store this in export, but it's not critical
                                subdivisionConfig: subdivisionConfig,
                                downbeatConfig: DEFAULT_DOWNBEAT_CONFIG,
                                subdivisionMetadata: {
                                    originalBeatCount: data.subdivision.metadata.originalBeatCount,
                                    subdividedBeatCount: data.subdivision.metadata.subdividedBeatCount,
                                    averageDensityMultiplier: data.subdivision.metadata.averageDensityMultiplier,
                                    explicitBeatCount: data.subdivision.metadata.explicitBeatCount,
                                    subdivisionsUsed: data.subdivision.metadata.subdivisionsUsed,
                                    hasMultipleTempos: data.subdivision.metadata.hasMultipleTempos,
                                    maxDensity: data.subdivision.metadata.maxDensity,
                                },
                            };

                            (updateState as Record<string, unknown>).subdividedBeatMap = subdividedBeatMap;
                            (updateState as Record<string, unknown>).subdivisionConfig = subdivisionConfig;

                            // Cache the subdivided beat map
                            const currentCache = get().cachedSubdividedBeatMaps;
                            (updateState as Record<string, unknown>).cachedSubdividedBeatMaps = {
                                ...currentCache,
                                [data.audioId]: subdividedBeatMap,
                            };
                        }

                        // Restore chart data if present
                        if (data.chart) {
                            (updateState as Record<string, unknown>).chartStyle = data.chart.style;
                        }

                        // Apply the update
                        set(updateState);

                        logger.info('BeatDetection', 'Full beat map import successful', {
                            audioId: data.audioId,
                            hasSubdivision: !!data.subdivision,
                            hasChart: !!data.chart,
                            chartKeyCount: data.chart?.keyCount ?? 0,
                        });

                        return {
                            success: true,
                            errors: [],
                            warnings: validation.warnings,
                        };
                    },

                    // ============================================================
                    // Groove Analyzer Actions (Phase 2: Task 2.2 - Groove Actions)
                    // ============================================================

                    initGrooveAnalyzer: () => {
                        const state = get();
                        const analyzer = new GrooveAnalyzer();
                        // Apply current difficulty preset
                        const { difficultySettings } = state;
                        if (difficultySettings.preset !== 'custom') {
                            analyzer.setDifficulty({ preset: difficultySettings.preset });
                            logger.info('BeatDetection', 'GrooveAnalyzer initialized with preset', { preset: difficultySettings.preset });
                        } else {
                            // Custom mode - apply custom groove penalties if provided
                            const customPenalties = getGroovePenaltiesForPreset(
                                difficultySettings.preset,
                                difficultySettings.customGroovePenalties
                            );
                            analyzer.setDifficulty({
                                preset: 'custom',
                                customPenalties
                            });
                            logger.info('BeatDetection', 'GrooveAnalyzer initialized with custom penalties', customPenalties);
                        }

                        set({
                            grooveAnalyzer: analyzer,
                            grooveState: analyzer.getState(),
                        });
                        logger.info('BeatDetection', 'GrooveAnalyzer initialized');
                    },

                    recordGrooveHit: (offset: number, bpm: number, currentTime: number, accuracy: ExtendedBeatAccuracy): GrooveResult => {
                        const state = get();
                        if (!state.grooveAnalyzer) {
                            logger.warn('BeatDetection', 'recordGrooveHit called but grooveAnalyzer is null');
                            // Return a default result
                            return {
                                pocketDirection: 'neutral',
                                establishedOffset: 0,
                                consistency: 0,
                                hotness: 0,
                                tier: 'D',
                                streakLength: 0,
                                inPocket: false,
                                pocketWindow: 0,
                            };
                        }

                        const result = state.grooveAnalyzer.recordHit(offset, bpm, currentTime, accuracy);

                        // Update groove state and track best achievements
                        const newBestHotness = Math.max(state.bestGrooveHotness, result.hotness);
                        const newBestStreak = Math.max(state.bestGrooveStreak, result.streakLength);

                        set({
                            grooveState: state.grooveAnalyzer.getState(),
                            bestGrooveHotness: newBestHotness,
                            bestGrooveStreak: newBestStreak,
                        });

                        logger.debug('BeatDetection', 'Groove hit recorded', {
                            offset,
                            bpm,
                            currentTime,
                            accuracy,
                            hotness: result.hotness,
                            streak: result.streakLength,
                            direction: result.pocketDirection,
                        });

                        return result;
                    },

                    recordGrooveMiss: (): GrooveResult => {
                        const state = get();
                        if (!state.grooveAnalyzer) {
                            logger.warn('BeatDetection', 'recordGrooveMiss called but grooveAnalyzer is null');
                            // Return a default result
                            return {
                                pocketDirection: 'neutral',
                                establishedOffset: 0,
                                consistency: 0,
                                hotness: 0,
                                tier: 'D',
                                streakLength: 0,
                                inPocket: false,
                                pocketWindow: 0,
                            };
                        }

                        const result = state.grooveAnalyzer.recordMiss();

                        // Update groove state (hotness decreased, streak reset)
                        set({
                            grooveState: state.grooveAnalyzer.getState(),
                        });

                        logger.debug('BeatDetection', 'Groove miss recorded', {
                            hotness: result.hotness,
                        });

                        return result;
                    },

                    resetGrooveAnalyzer: () => {
                        const state = get();
                        
                        // BUGFIX: If grooveAnalyzer doesn't exist, create a new one
                        // This can happen if there was a race condition during initialization
                        if (!state.grooveAnalyzer) {
                            const analyzer = new GrooveAnalyzer();
                            const { difficultySettings } = state;
                            if (difficultySettings.preset !== 'custom') {
                                analyzer.setDifficulty({ preset: difficultySettings.preset });
                            } else {
                                const customPenalties = getGroovePenaltiesForPreset(
                                    difficultySettings.preset,
                                    difficultySettings.customGroovePenalties
                                );
                                analyzer.setDifficulty({
                                    preset: 'custom',
                                    customPenalties
                                });
                            }
                            set({
                                grooveAnalyzer: analyzer,
                                grooveState: analyzer.getState(),
                            });
                            logger.info('BeatDetection', 'GrooveAnalyzer created during reset');
                            return;
                        }
                        
                        state.grooveAnalyzer.reset();
                        set({
                            grooveState: state.grooveAnalyzer.getState(),
                        });
                        logger.info('BeatDetection', 'GrooveAnalyzer reset');
                    },

                    updateGrooveState: (newState: GrooveState) => {
                        set({ grooveState: newState });
                    },

                    updateBestGroove: (hotness: number, streak: number) => {
                        const state = get();
                        const newBestHotness = Math.max(state.bestGrooveHotness, hotness);
                        const newBestStreak = Math.max(state.bestGrooveStreak, streak);

                        if (newBestHotness !== state.bestGrooveHotness || newBestStreak !== state.bestGrooveStreak) {
                            set({
                                bestGrooveHotness: newBestHotness,
                                bestGrooveStreak: newBestStreak,
                            });
                            logger.debug('BeatDetection', 'Best groove updated', {
                                bestHotness: newBestHotness,
                                bestStreak: newBestStreak,
                            });
                        }
                    },

                    // ============================================================
                    // Rhythm XP Actions (Phase 1: Task 1.4 - Full implementations)
                    // NOTE: Config is stored separately in rhythmXPConfigStore
                    // ============================================================

                    initRhythmXP: () => {
                        // Get config from rhythmXPConfigStore
                        const config = useRhythmXPConfigStore.getState().config;

                        // Create a new RhythmXPCalculator with config from store
                        const calculator = new RhythmXPCalculator(config);

                        // Start the session to initialize tracking
                        calculator.startSession();

                        // Reset combo counters and store the calculator
                        set({
                            rhythmXPCalculator: calculator,
                            rhythmSessionTotals: null,
                            lastRhythmXPResult: null,
                            currentCombo: 0,
                            maxCombo: 0,
                            previousComboLength: 0,
                            pendingComboEndBonus: null,
                            pendingGrooveEndBonus: null,
                        });

                        logger.info('BeatDetection', 'Rhythm XP session initialized');
                    },

                    recordRhythmHit: (
                        accuracy: ExtendedBeatAccuracy,
                        grooveHotness: number
                    ): RhythmXPResult | null => {
                        const state = get();
                        const calculator = state.rhythmXPCalculator;

                        if (!calculator) {
                            logger.warn('BeatDetection', 'recordRhythmHit called but calculator not initialized');
                            return null;
                        }

                        // Store previous combo length for bonus calculation
                        const previousComboLength = state.currentCombo;

                        // Check if this accuracy breaks the combo
                        // Uses the okBreaksCombo config to determine if 'ok' accuracy breaks combo
                        const okBreaksCombo = useRhythmXPConfigStore.getState().config.combo.okBreaksCombo;
                        const isComboBreaker = shouldAccuracyBreakCombo(accuracy, okBreaksCombo);

                        // Process combo end bonus BEFORE resetting combo
                        if (isComboBreaker && previousComboLength > 0) {
                            const comboBonus = calculator.calculateComboEndBonus(previousComboLength);
                            set({ pendingComboEndBonus: comboBonus });
                            logger.debug('BeatDetection', 'Combo ended', {
                                comboLength: previousComboLength,
                                bonusXP: comboBonus.bonusXP
                            });
                        }

                        // Update combo count
                        let newCombo: number;
                        if (isComboBreaker) {
                            newCombo = 0;
                        } else {
                            newCombo = state.currentCombo + 1;
                        }

                        // Update max combo if current exceeded
                        const newMaxCombo = Math.max(state.maxCombo, newCombo);

                        // Record the hit in the calculator
                        const xpResult = calculator.recordHit(accuracy, {
                            comboLength: newCombo,
                            grooveHotness: grooveHotness
                        });

                        // Get updated session totals
                        const sessionTotals = calculator.getSessionTotals();

                        // Update state
                        set({
                            currentCombo: newCombo,
                            maxCombo: newMaxCombo,
                            previousComboLength: previousComboLength,
                            lastRhythmXPResult: xpResult,
                            rhythmSessionTotals: sessionTotals,
                        });

                        logger.debug('BeatDetection', 'Recorded rhythm hit', {
                            accuracy,
                            combo: newCombo,
                            score: xpResult.finalScore,
                            xp: xpResult.finalXP,
                            multiplier: xpResult.totalMultiplier
                        });

                        return xpResult;
                    },

                    breakCombo: (missedCount: number): void => {
                        const state = get();
                        const calculator = state.rhythmXPCalculator;

                        // Only process if there's an active combo to break
                        if (state.currentCombo <= 0) {
                            return;
                        }

                        // Process combo end bonus before resetting
                        if (calculator && state.currentCombo > 0) {
                            const comboBonus = calculator.calculateComboEndBonus(state.currentCombo);
                            set({
                                pendingComboEndBonus: comboBonus,
                                currentCombo: 0,
                                previousComboLength: state.currentCombo,
                            });
                            logger.debug('BeatDetection', 'Combo broken due to missed beats', {
                                missedCount,
                                previousCombo: state.currentCombo,
                                bonusXP: comboBonus.bonusXP
                            });
                        } else {
                            // No calculator, just reset combo
                            set({
                                currentCombo: 0,
                                previousComboLength: state.currentCombo,
                            });
                            logger.debug('BeatDetection', 'Combo broken due to missed beats (no calculator)', {
                                missedCount,
                                previousCombo: state.currentCombo,
                            });
                        }
                    },

                    processComboEndBonus: (): ComboEndBonusResult | null => {
                        const state = get();
                        const calculator = state.rhythmXPCalculator;

                        if (!calculator) {
                            return null;
                        }

                        // Use previousComboLength for bonus calculation
                        if (state.previousComboLength > 0) {
                            const bonus = calculator.calculateComboEndBonus(state.previousComboLength);
                            set({ pendingComboEndBonus: bonus });
                            return bonus;
                        }

                        return null;
                    },

                    processGrooveEndBonus: (grooveStats: GrooveStats): GrooveEndBonusResult | null => {
                        const state = get();
                        const calculator = state.rhythmXPCalculator;

                        if (!calculator) {
                            return null;
                        }

                        const bonus = calculator.calculateGrooveEndBonus(grooveStats);
                        set({ pendingGrooveEndBonus: bonus });

                        logger.debug('BeatDetection', 'Groove end bonus calculated', {
                            bonusScore: bonus.bonusScore,
                            bonusXP: bonus.bonusXP,
                            grooveStats
                        });

                        return bonus;
                    },

                    getRhythmSessionTotals: (): RhythmSessionTotals | null => {
                        return get().rhythmSessionTotals;
                    },

                    hasUnclaimedXP: (): boolean => {
                        const totals = get().rhythmSessionTotals;
                        return totals !== null && totals.totalXP > 0;
                    },

                    endRhythmXPSession: (): RhythmSessionTotals | null => {
                        const state = get();
                        const calculator = state.rhythmXPCalculator;

                        if (!calculator) {
                            return null;
                        }

                        const finalTotals = calculator.endSession();

                        logger.info('BeatDetection', 'Rhythm XP session ended', {
                            totalScore: finalTotals?.totalScore,
                            totalXP: finalTotals?.totalXP,
                            maxCombo: finalTotals?.maxCombo,
                            accuracy: finalTotals?.accuracyPercentage
                        });

                        return finalTotals;
                    },

                    clearPendingBonuses: () => {
                        set({
                            pendingComboEndBonus: null,
                            pendingGrooveEndBonus: null,
                        });
                    },

                    resetRhythmXP: () => {
                        // BUGFIX: Instead of setting calculator to null (which breaks score tracking after seek),
                        // create a new calculator and start a fresh session. This ensures the calculator
                        // is always ready to record hits after a seek.
                        const config = useRhythmXPConfigStore.getState().config;
                        const calculator = new RhythmXPCalculator(config);
                        calculator.startSession();

                        set({
                            rhythmXPCalculator: calculator,
                            rhythmSessionTotals: null,
                            lastRhythmXPResult: null,
                            currentCombo: 0,
                            maxCombo: 0,
                            previousComboLength: 0,
                            pendingComboEndBonus: null,
                            pendingGrooveEndBonus: null,
                        });
                        logger.debug('BeatDetection', 'Rhythm XP state reset and re-initialized');
                    },

                    // ============================================================
                    // Step Navigation Actions (Phase 1: Task 1.1)
                    // ============================================================

                    setCurrentStep: (step) => {
                        const state = get();
                        const currentStep = state.currentStep;

                        // Only update if actually changing steps
                        if (currentStep !== step) {
                            logger.debug('BeatDetection', 'Navigating to step', { from: currentStep, to: step });
                            set({
                                previousStep: currentStep,
                                currentStep: step,
                            });
                        }
                    },

                    // ============================================================
                    // Rhythm Generation Actions (Task 1.1)
                    // ============================================================

                    /**
                     * Set the generation mode for the beat detection wizard.
                     * When switching from 'automatic' to 'manual':
                     * - Keeps beatMap (if any)
                     * - Clears generatedRhythm
                     * - Navigates to Step 2 (Subdivide)
                     */
                    setGenerationMode: (mode: 'manual' | 'automatic') => {
                        const state = get();
                        const previousMode = state.generationMode;

                        if (previousMode === mode) {
                            return; // No change needed
                        }

                        logger.info('BeatDetection', 'Changing generation mode', {
                            from: previousMode,
                            to: mode,
                        });

                        // When switching from auto to manual:
                        // - Keep beatMap
                        // - Clear generated rhythm and level
                        // - Navigate to Step 2 (Subdivide)
                        if (previousMode === 'automatic' && mode === 'manual') {
                            set({
                                generationMode: mode,
                                generatedRhythm: null,
                                rhythmGenerationProgress: null,
                                // Clear level generation state (Task 0.1)
                                generatedLevel: null,
                                allDifficultyLevels: null,
                                levelGenerationProgress: null,
                                pitchAnalysis: null,
                                selectedDifficulty: 'medium',
                            });
                            // Navigate to Step 2 (Subdivide) if we have a beat map
                            if (state.beatMap) {
                                state.actions.setCurrentStep(2);
                            }
                        } else {
                            // Switching from manual to auto: just update mode
                            // Clear any previously generated rhythm and level
                            set({
                                generationMode: mode,
                                generatedRhythm: null,
                                rhythmGenerationProgress: null,
                                // Clear level generation state (Task 0.1)
                                generatedLevel: null,
                                allDifficultyLevels: null,
                                levelGenerationProgress: null,
                                pitchAnalysis: null,
                                selectedDifficulty: 'medium',
                            });
                        }
                    },

                    /**
                     * Set the generated rhythm data.
                     * This is session-only state (not persisted to localStorage).
                     */
                    setGeneratedRhythm: (rhythm: GeneratedRhythm | null) => {
                        if (rhythm) {
                            logger.info('BeatDetection', 'Setting generated rhythm', {
                                bandStreams: Object.keys(rhythm.bandStreams),
                                hasComposite: !!rhythm.composite,
                                hasVariants: !!rhythm.difficultyVariants,
                                phrasesDetected: rhythm.analysis?.phraseAnalysis?.phrases?.length ?? 0,
                                naturalDifficulty: rhythm.metadata?.naturalDifficulty,
                            });
                        } else {
                            logger.info('BeatDetection', 'Clearing generated rhythm');
                        }
                        set({ generatedRhythm: rhythm });
                    },

                    /**
                     * Set the rhythm generation progress state.
                     */
                    setRhythmGenerationProgress: (progress: {
                        phase: 'multiBand' | 'transients' | 'quantize' | 'phrases' | 'composite' | 'balancing' | 'variants';
                        progress: number;
                        message: string;
                    } | null) => {
                        if (progress) {
                            logger.debug('BeatDetection', 'Rhythm generation progress', {
                                phase: progress.phase,
                                progress: progress.progress,
                                message: progress.message,
                            });
                        }
                        set({ rhythmGenerationProgress: progress });
                    },

                    /**
                     * Clear the generated rhythm data and progress.
                     * Called when track changes or when switching modes.
                     */
                    clearGeneratedRhythm: () => {
                        const state = get();
                        if (state.generatedRhythm || state.rhythmGenerationProgress) {
                            logger.info('BeatDetection', 'Clearing generated rhythm state');
                            set({
                                generatedRhythm: null,
                                rhythmGenerationProgress: null,
                                rhythmValidation: null, // Task 0.7: Clear validation when rhythm is cleared
                            });
                        }
                        // Also clear level generation state since it depends on rhythm
                        if (
                            state.generatedLevel ||
                            state.allDifficultyLevels ||
                            state.levelGenerationProgress ||
                            state.pitchAnalysis
                        ) {
                            logger.info('BeatDetection', 'Clearing level generation state (dependent on rhythm)');
                            set({
                                generatedLevel: null,
                                allDifficultyLevels: null,
                                levelGenerationProgress: null,
                                pitchAnalysis: null,
                                selectedDifficulty: 'medium',
                            });
                        }
                    },

                    // ============================================================
                    // Level Generation Actions (Task 0.1)
                    // ============================================================

                    /**
                     * Set the generated level data for the currently selected difficulty.
                     * This is session-only state (not persisted to localStorage).
                     */
                    setGeneratedLevel: (level) => {
                        logger.info('BeatDetection', 'Setting generated level', {
                            hasLevel: !!level,
                            totalBeats: level?.chart.beats.length,
                            difficulty: level?.metadata.difficulty,
                        });
                        set({ generatedLevel: level });
                    },

                    /**
                     * Set all difficulty variants of the generated level.
                     */
                    setAllDifficultyLevels: (levels) => {
                        logger.info('BeatDetection', 'Setting all difficulty levels', {
                            hasEasy: !!levels?.easy,
                            hasMedium: !!levels?.medium,
                            hasHard: !!levels?.hard,
                            hasNatural: !!levels?.natural,
                        });
                        set({ allDifficultyLevels: levels });
                    },

                    /**
                     * Clear the generated level and all related state.
                     * Called when track changes or when switching modes.
                     */
                    clearGeneratedLevel: () => {
                        const state = get();
                        if (
                            state.generatedLevel ||
                            state.allDifficultyLevels ||
                            state.levelGenerationProgress ||
                            state.pitchAnalysis
                        ) {
                            logger.info('BeatDetection', 'Clearing generated level state');
                            set({
                                generatedLevel: null,
                                allDifficultyLevels: null,
                                levelGenerationProgress: null,
                                pitchAnalysis: null,
                            });
                        }
                    },

                    /**
                     * Set the level generation progress state.
                     */
                    setLevelGenerationProgress: (progress) => {
                        if (progress) {
                            logger.debug('BeatDetection', 'Level generation progress', {
                                stage: progress.stage,
                                progress: progress.progress,
                                message: progress.message,
                            });
                        }
                        set({ levelGenerationProgress: progress });
                    },

                    /**
                     * Set the pitch analysis results.
                     */
                    setPitchAnalysis: (analysis) => {
                        logger.info('BeatDetection', 'Setting pitch analysis', {
                            hasAnalysis: !!analysis,
                            totalBeats: analysis?.pitchByBeat?.length,
                            directionStats: analysis?.directionStats,
                        });
                        set({ pitchAnalysis: analysis });
                    },

                    /**
                     * Set the selected difficulty level for display.
                     */
                    setSelectedDifficulty: (difficulty) => {
                        logger.info('BeatDetection', 'Setting selected difficulty', { difficulty });
                        set({ selectedDifficulty: difficulty });
                    },

                    /**
                     * Set the rhythm validation result.
                     * Task 0.7: Used to verify data contract before level generation.
                     */
                    setRhythmValidation: (validation) => {
                        if (validation) {
                            logger.info('BeatDetection', 'Setting rhythm validation', {
                                isValid: validation.isValid,
                                errorCount: validation.errors.length,
                                summary: validation.summary,
                            });
                        } else {
                            logger.debug('BeatDetection', 'Clearing rhythm validation');
                        }
                        set({ rhythmValidation: validation });
                    },
                },
            };
        },
        {
            name: 'beat-detection-storage',
            // Use custom storage that wraps the base storage with error handling
            storage: createErrorHandlingStorage((error) => {
                if (setStorageErrorFn) {
                    setStorageErrorFn(error);
                }
            }),
            // Only persist cached beat maps, cache order, generator options, and difficulty settings
            partialize: (state): PersistedBeatDetectionState => ({
                cachedBeatMaps: state.cachedBeatMaps,
                cacheOrder: state.cacheOrder,
                generatorOptions: state.generatorOptions,
                hopSizeConfig: state.hopSizeConfig,
                melBandsConfig: state.melBandsConfig,
                gaussianSmoothConfig: state.gaussianSmoothConfig,
                difficultySettings: state.difficultySettings,
                autoMultiTempo: state.autoMultiTempo,
                // Interpolation state
                interpolationOptions: state.interpolationOptions,
                // selectedAlgorithm removed - engine uses only adaptive-phase-locked
                beatStreamMode: state.beatStreamMode,
                cachedInterpolatedBeatMaps: state.cachedInterpolatedBeatMaps,
                // Downbeat configuration state
                downbeatConfig: state.downbeatConfig,
                // Measure visualization toggle (Phase 4)
                showMeasureBoundaries: state.showMeasureBoundaries,
                // Subdivision state (Phase 2: Task 2.1)
                // Convert Map to array for JSON serialization (Maps serialize to {} otherwise)
                // Note: currentSubdivision, pendingSubdivision, and subdivisionTransitionMode are NOT persisted
                // so the subdivision playground resets to defaults on page refresh
                subdivisionConfig: {
                    beatSubdivisions: Array.from(state.subdivisionConfig.beatSubdivisions.entries()),
                    defaultSubdivision: state.subdivisionConfig.defaultSubdivision,
                },
                cachedUnifiedBeatMaps: state.cachedUnifiedBeatMaps,
                cachedSubdividedBeatMaps: state.cachedSubdividedBeatMaps,
                // Chart Editor state (Phase 2: Task 2.1 - Required Keys)
                // Only persist user preferences, not temporary editing state
                chartStyle: state.chartStyle,
                editorMode: state.editorMode,
                keyLaneViewMode: state.keyLaneViewMode,
            }),
            // Merge persisted state with initial state
            merge: (persistedState, currentState) => {
                const persisted = persistedState as any;
                // If cacheOrder doesn't exist in persisted state, derive it from cachedBeatMaps keys
                // This handles migration from older versions that didn't have cacheOrder
                let cacheOrder = persisted?.cacheOrder;
                if (!cacheOrder && persisted?.cachedBeatMaps) {
                    cacheOrder = Object.keys(persisted.cachedBeatMaps);
                }

                // Migrate generator options
                let generatorOptions = persisted?.generatorOptions ?? currentState.generatorOptions;

                // Handle migration from old intensityThreshold to new filter parameter
                // Old intensityThreshold: 0 = most sensitive (most beats), 1 = least sensitive (fewest beats)
                // New filter: 0 = keep all beats, 1 = only strongest beats
                // Migration: filter = intensityThreshold (same semantics)
                if (generatorOptions && generatorOptions.intensityThreshold !== undefined) {
                    const oldThreshold = generatorOptions.intensityThreshold;
                    // Only migrate if filter isn't already set (don't override user's new setting)
                    if (generatorOptions.filter === undefined) {
                        generatorOptions = {
                            ...generatorOptions,
                            filter: oldThreshold, // Map old threshold directly to filter
                        };
                    }
                    // Remove the deprecated property
                    delete generatorOptions.intensityThreshold;
                    logger.info('BeatDetection', 'Migrated intensityThreshold to filter', {
                        oldValue: oldThreshold,
                        newValue: generatorOptions.filter,
                    });
                }

                // Handle difficulty settings migration
                let difficultySettings = persisted?.difficultySettings ?? currentState.difficultySettings;
                // If difficultySettings exists but is missing fields, merge with defaults
                if (persisted?.difficultySettings) {
                    difficultySettings = {
                        ...DEFAULT_DIFFICULTY_SETTINGS,
                        ...persisted.difficultySettings,
                    };
                }

                // Handle OSE config migration
                // If OSE configs exist in persisted state, use them
                // Otherwise, infer from raw numeric values in generatorOptions
                let hopSizeConfig = persisted?.hopSizeConfig;
                if (!hopSizeConfig && generatorOptions?.hopSizeMs !== undefined) {
                    // Infer mode from raw value
                    const rawValue = generatorOptions.hopSizeMs;
                    if (rawValue === HOP_SIZE_PRESETS.efficient.value) {
                        hopSizeConfig = { mode: 'efficient' };
                    } else if (rawValue === HOP_SIZE_PRESETS.standard.value) {
                        hopSizeConfig = { mode: 'standard' };
                    } else if (rawValue === HOP_SIZE_PRESETS.hq.value) {
                        hopSizeConfig = { mode: 'hq' };
                    } else {
                        // Non-preset value = custom mode
                        hopSizeConfig = { mode: 'custom', customValue: rawValue };
                    }
                    logger.info('BeatDetection', 'Migrated hopSizeMs to hopSizeConfig', {
                        rawValue,
                        mode: hopSizeConfig.mode,
                    });
                }
                hopSizeConfig = hopSizeConfig ?? currentState.hopSizeConfig;

                let melBandsConfig = persisted?.melBandsConfig;
                if (!melBandsConfig && generatorOptions?.melBands !== undefined) {
                    // Infer mode from raw value
                    const rawValue = generatorOptions.melBands;
                    if (rawValue === MEL_BANDS_PRESETS.standard.value) {
                        melBandsConfig = { mode: 'standard' };
                    } else if (rawValue === MEL_BANDS_PRESETS.detailed.value) {
                        melBandsConfig = { mode: 'detailed' };
                    } else if (rawValue === MEL_BANDS_PRESETS.maximum.value) {
                        melBandsConfig = { mode: 'maximum' };
                    } else {
                        // Non-preset value = default to standard
                        melBandsConfig = { mode: 'standard' };
                    }
                    logger.info('BeatDetection', 'Migrated melBands to melBandsConfig', {
                        rawValue,
                        mode: melBandsConfig.mode,
                    });
                }
                melBandsConfig = melBandsConfig ?? currentState.melBandsConfig;

                let gaussianSmoothConfig = persisted?.gaussianSmoothConfig;
                if (!gaussianSmoothConfig && generatorOptions?.gaussianSmoothMs !== undefined) {
                    // Infer mode from raw value
                    const rawValue = generatorOptions.gaussianSmoothMs;
                    if (rawValue === GAUSSIAN_SMOOTH_PRESETS.minimal.value) {
                        gaussianSmoothConfig = { mode: 'minimal' };
                    } else if (rawValue === GAUSSIAN_SMOOTH_PRESETS.standard.value) {
                        gaussianSmoothConfig = { mode: 'standard' };
                    } else if (rawValue === GAUSSIAN_SMOOTH_PRESETS.smooth.value) {
                        gaussianSmoothConfig = { mode: 'smooth' };
                    } else {
                        // Non-preset value = default to standard
                        gaussianSmoothConfig = { mode: 'standard' };
                    }
                    logger.info('BeatDetection', 'Migrated gaussianSmoothMs to gaussianSmoothConfig', {
                        rawValue,
                        mode: gaussianSmoothConfig.mode,
                    });
                }
                gaussianSmoothConfig = gaussianSmoothConfig ?? currentState.gaussianSmoothConfig;

                // Handle subdivision config deserialization (Phase 3: Task 3.1)
                // The beatSubdivisions Map is serialized as an array of entries
                let subdivisionConfig = currentState.subdivisionConfig;
                if (persisted?.subdivisionConfig) {
                    const persistedSubdivision = persisted.subdivisionConfig;
                    // Check if beatSubdivisions is an array (serialized) or already a Map
                    if (Array.isArray(persistedSubdivision.beatSubdivisions)) {
                        subdivisionConfig = {
                            beatSubdivisions: new Map(persistedSubdivision.beatSubdivisions),
                            defaultSubdivision: persistedSubdivision.defaultSubdivision ?? 'quarter',
                        };
                        logger.info('BeatDetection', 'Deserialized subdivisionConfig from array', {
                            beatSubdivisionsCount: subdivisionConfig.beatSubdivisions.size,
                            defaultSubdivision: subdivisionConfig.defaultSubdivision,
                        });
                    } else if (persistedSubdivision.beatSubdivisions instanceof Map) {
                        // Already a Map (shouldn't happen, but handle it)
                        subdivisionConfig = persistedSubdivision;
                    }
                    // If beatSubdivisions is empty object {} (old broken serialization), use default
                }

                return {
                    ...currentState,
                    cachedBeatMaps: persisted?.cachedBeatMaps ?? currentState.cachedBeatMaps,
                    cacheOrder: cacheOrder ?? currentState.cacheOrder,
                    generatorOptions,
                    hopSizeConfig,
                    melBandsConfig,
                    gaussianSmoothConfig,
                    difficultySettings,
                    autoMultiTempo: persisted?.autoMultiTempo ?? currentState.autoMultiTempo,
                    // Interpolation state (Phase 1: Task 1.1)
                    interpolationOptions: persisted?.interpolationOptions ?? currentState.interpolationOptions,
                    beatStreamMode: persisted?.beatStreamMode ?? currentState.beatStreamMode,
                    cachedInterpolatedBeatMaps: persisted?.cachedInterpolatedBeatMaps ?? currentState.cachedInterpolatedBeatMaps,
                    // Downbeat configuration state (Phase 1: Task 1.1)
                    downbeatConfig: persisted?.downbeatConfig ?? currentState.downbeatConfig,
                    showMeasureBoundaries: persisted?.showMeasureBoundaries ?? currentState.showMeasureBoundaries,
                    // Subdivision state (Phase 3: Task 3.1)
                    // Note: currentSubdivision, pendingSubdivision, and subdivisionTransitionMode use defaults
                    // so the subdivision playground resets on page refresh
                    subdivisionConfig,
                    cachedUnifiedBeatMaps: persisted?.cachedUnifiedBeatMaps ?? currentState.cachedUnifiedBeatMaps,
                    cachedSubdividedBeatMaps: persisted?.cachedSubdividedBeatMaps ?? currentState.cachedSubdividedBeatMaps,
                    // Chart Editor state (Phase 2: Task 2.1 - Required Keys)
                    chartStyle: persisted?.chartStyle ?? currentState.chartStyle,
                    editorMode: persisted?.editorMode ?? currentState.editorMode,
                    keyLaneViewMode: persisted?.keyLaneViewMode ?? currentState.keyLaneViewMode,
                };
            },
            // Callback after rehydration
            onRehydrateStorage: () => {
                return (state) => {
                    if (state) {
                        logger.info('BeatDetection', 'Store rehydrated from storage', {
                            cachedBeatMapsCount: Object.keys(state.cachedBeatMaps).length,
                            cacheOrderLength: state.cacheOrder.length,
                            // Phase 1 & 2: Newly restored fields
                            cachedInterpolatedBeatMapsCount: Object.keys(state.cachedInterpolatedBeatMaps).length,
                            cachedUnifiedBeatMapsCount: Object.keys(state.cachedUnifiedBeatMaps).length,
                            hasDownbeatConfig: !!state.downbeatConfig,
                            showMeasureBoundaries: state.showMeasureBoundaries,
                            autoMultiTempo: state.autoMultiTempo,
                            // Phase 3: Subdivided beat maps
                            cachedSubdividedBeatMapsCount: Object.keys(state.cachedSubdividedBeatMaps).length,
                        });
                    }
                };
            },
        }
    )
);

// ============================================================
// Selectors
// ============================================================

/**
 * Selector to get the current beat map directly.
 */
export const useBeatMap = () => useBeatDetectionStore((state) => state.beatMap);

/**
 * Selector to get generation state.
 * Uses useShallow to prevent infinite loops from new object references.
 */
export const useBeatMapGenerationState = () =>
    useBeatDetectionStore(useShallow((state) => ({
        isGenerating: state.isGenerating,
        progress: state.generationProgress,
        error: state.error,
    })));

/**
 * Selector to get generator options.
 */
export const useGeneratorOptions = () =>
    useBeatDetectionStore((state) => state.generatorOptions);

/**
 * Selector to get practice mode state.
 * Uses useShallow to prevent infinite loops from new object references.
 */
export const usePracticeModeState = () =>
    useBeatDetectionStore(useShallow((state) => ({
        isActive: state.practiceModeActive,
        tapHistory: state.tapHistory,
    })));

/**
 * Selector to get tap history.
 */
export const useTapHistory = () => useBeatDetectionStore((state) => state.tapHistory);

/**
 * Selector to get cached beat maps.
 */
export const useCachedBeatMaps = () =>
    useBeatDetectionStore((state) => state.cachedBeatMaps);

/**
 * Selector to get storage error state.
 */
export const useStorageError = () =>
    useBeatDetectionStore((state) => state.storageError);

/**
 * Selector to check if OSE settings have changed since last beat map generation.
 * Returns true if a beat map exists and current OSE settings differ from the
 * settings used to generate it.
 *
 * Used for the "Re-Analyze Needed" indicator.
 */
export const useOseSettingsChanged = () =>
    useBeatDetectionStore(useShallow((state) => {
        // No beat map means nothing to re-analyze
        if (!state.beatMap) return false;

        // Create a snapshot of current settings
        const currentSnapshot = createOSEConfigSnapshot(
            state.hopSizeConfig,
            state.melBandsConfig,
            state.gaussianSmoothConfig
        );

        // Compare with stored snapshot
        return oseConfigsDiffer(state.lastGeneratedOSEConfig, currentSnapshot);
    }));

/**
 * Selector to get actions directly.
 */
export const useBeatDetectionActions = () =>
    useBeatDetectionStore((state) => state.actions);

/**
 * Selector to compute tap statistics.
 * Uses useShallow to prevent infinite loops from new object references.
 *
 * Includes breakdown by beat source (detected vs interpolated) for Task 6.4.
 */
export const useTapStatistics = () =>
    useBeatDetectionStore(useShallow((state) => {
        const history = state.tapHistory;
        if (history.length === 0) {
            return {
                totalTaps: 0,
                perfect: 0,
                great: 0,
                good: 0,
                ok: 0,
                miss: 0,
                wrongKey: 0, // Task 6.3: Wrong key count
                averageOffset: 0,
                totalDeviation: 0,
                standardDeviation: 0,
                currentStreak: 0,
                bestStreak: 0,
                accuracyPercentage: 0,
                // Source breakdown (Task 6.4)
                detectedBeatsTotal: 0,
                detectedBeatsHit: 0,
                interpolatedBeatsTotal: 0,
                interpolatedBeatsHit: 0,
            };
        }

        // Count by accuracy (including 'ok' and 'wrongKey')
        const counts: Record<string, number> = {
            perfect: 0,
            great: 0,
            good: 0,
            ok: 0,
            miss: 0,
            wrongKey: 0, // Task 6.3: Wrong key count
        };

        let totalOffset = 0;
        let currentStreak = 0;
        let bestStreak = 0;

        // Source breakdown counts (Task 6.4)
        let detectedBeatsTotal = 0;
        let detectedBeatsHit = 0;
        let interpolatedBeatsTotal = 0;
        let interpolatedBeatsHit = 0;

        history.forEach((tap) => {
            counts[tap.accuracy]++;

            // Offset is in seconds, convert to ms for display
            totalOffset += Math.abs(tap.offset) * 1000;

            // Track streak (non-miss and non-wrongKey taps)
            // Task 6.3: wrongKey counts as miss for scoring/streak purposes
            if (tap.accuracy !== 'miss' && tap.accuracy !== 'wrongKey') {
                currentStreak++;
                if (currentStreak > bestStreak) {
                    bestStreak = currentStreak;
                }
            } else {
                currentStreak = 0;
            }

            // Track source breakdown (Task 6.4)
            // Taps without source info (e.g., using BeatMap without interpolation)
            // are not counted in the source breakdown
            // Task 6.3: wrongKey counts as miss, so not counted as hit
            if (tap.source === 'detected') {
                detectedBeatsTotal++;
                if (tap.accuracy !== 'miss' && tap.accuracy !== 'wrongKey') {
                    detectedBeatsHit++;
                }
            } else if (tap.source === 'interpolated') {
                interpolatedBeatsTotal++;
                if (tap.accuracy !== 'miss' && tap.accuracy !== 'wrongKey') {
                    interpolatedBeatsHit++;
                }
            }
        });

        // Calculate standard deviation of offsets
        const avgOffset = totalOffset / history.length;
        let squaredDiffs = 0;
        history.forEach((tap) => {
            const offsetMs = Math.abs(tap.offset) * 1000;
            squaredDiffs += Math.pow(offsetMs - avgOffset, 2);
        });
        const standardDeviation = Math.sqrt(squaredDiffs / history.length);

        // Calculate accuracy percentage (non-miss and non-wrongKey taps / total taps)
        // Task 6.3: wrongKey counts as miss for scoring purposes
        const missCount = counts.miss + counts.wrongKey;
        const accuracyPercentage = history.length > 0
            ? Math.round(((history.length - missCount) / history.length) * 100 * 10) / 10 // Round to 1 decimal
            : 0;

        return {
            totalTaps: history.length,
            perfect: counts.perfect,
            great: counts.great,
            good: counts.good,
            ok: counts.ok,
            miss: counts.miss,
            wrongKey: counts.wrongKey, // Task 6.3: Wrong key count
            averageOffset: Math.round(avgOffset * 10) / 10, // Round to 1 decimal
            totalDeviation: Math.round(totalOffset * 10) / 10, // Sum of all absolute offsets in ms
            standardDeviation: Math.round(standardDeviation * 10) / 10,
            currentStreak,
            bestStreak,
            accuracyPercentage, // Percentage of non-miss taps
            // Source breakdown (Task 6.4)
            detectedBeatsTotal,
            detectedBeatsHit,
            interpolatedBeatsTotal,
            interpolatedBeatsHit,
        };
    }));

/**
 * Selector to get difficulty settings.
 * Uses useShallow to prevent infinite loops from new object references.
 */
export const useDifficultySettings = () =>
    useBeatDetectionStore(useShallow((state) => state.difficultySettings));

/**
 * Selector to get the current difficulty preset.
 */
export const useDifficultyPreset = () =>
    useBeatDetectionStore((state) => state.difficultySettings.preset);

/**
 * Selector to get whether key requirements are ignored (easy mode).
 */
export const useIgnoreKeyRequirements = () =>
    useBeatDetectionStore((state) => state.difficultySettings.ignoreKeyRequirements);

/**
 * Selector to get the current effective accuracy thresholds.
 * Returns computed thresholds based on preset and custom settings.
 */
export const useAccuracyThresholds = () =>
    useBeatDetectionStore(useShallow((state) => {
        const { difficultySettings } = state;
        if (difficultySettings.preset === 'custom') {
            // Merge custom thresholds with hard preset as base
            return {
                ...HARD_ACCURACY_THRESHOLDS,
                ...difficultySettings.customThresholds,
            };
        }
        return getAccuracyThresholdsForPreset(difficultySettings.preset);
    }));

// ============================================================
// Groove Analyzer Selectors (Phase 2: Task 2.3 - Groove Selectors)
// ============================================================

/**
 * Selector to get the groove analyzer instance.
 * Returns null if no analyzer has been initialized.
 */
export const useGrooveAnalyzer = () =>
    useBeatDetectionStore((state) => state.grooveAnalyzer);

/**
 * Selector to get the current groove state.
 * Returns null if no groove analyzer has been initialized.
 * Use this for full state access including direction and establishedOffset.
 */
export const useGrooveState = () =>
    useBeatDetectionStore((state) => state.grooveState);

/**
 * Selector to get the current groove hotness value.
 * Convenience selector for re-render optimization when only hotness is needed.
 * Returns 0 if no groove state exists.
 */
export const useGrooveHotness = () =>
    useBeatDetectionStore((state) => state.grooveState?.hotness ?? 0);

/**
 * Selector to get the best groove hotness achieved in the session.
 * Persisted across groove resets to show best achievement.
 */
export const useBestGrooveHotness = () =>
    useBeatDetectionStore((state) => state.bestGrooveHotness);

/**
 * Selector to get the best groove streak achieved in the session.
 * Persisted across groove resets to show best achievement.
 */
export const useBestGrooveStreak = () =>
    useBeatDetectionStore((state) => state.bestGrooveStreak);

// ============================================================
// OSE Config Selectors
// ============================================================

/**
 * Selector to get the hop size configuration.
 */
export const useHopSizeConfig = () =>
    useBeatDetectionStore((state) => state.hopSizeConfig);

/**
 * Selector to get the mel bands configuration.
 */
export const useMelBandsConfig = () =>
    useBeatDetectionStore((state) => state.melBandsConfig);

/**
 * Selector to get the gaussian smoothing configuration.
 */
export const useGaussianSmoothConfig = () =>
    useBeatDetectionStore((state) => state.gaussianSmoothConfig);

/**
 * Selector to get all OSE configurations.
 * Uses useShallow to prevent infinite loops from new object references.
 */
export const useOseConfigs = () =>
    useBeatDetectionStore(useShallow((state) => ({
        hopSizeConfig: state.hopSizeConfig,
        melBandsConfig: state.melBandsConfig,
        gaussianSmoothConfig: state.gaussianSmoothConfig,
    })));

// ============================================================
// Beat Interpolation Selectors
// ============================================================

/**
 * Selector to get the interpolated beat map.
 * Returns null if no interpolation has been generated.
 */
export const useInterpolatedBeatMap = () =>
    useBeatDetectionStore((state) => state.interpolatedBeatMap);

/**
 * Selector to get the current interpolation options.
 */
export const useInterpolationOptions = () =>
    useBeatDetectionStore((state) => state.interpolationOptions);

/**
 * Selector to get the beat stream mode.
 * Returns 'detected' for original beats or 'merged' for interpolated + detected.
 */
export const useBeatStreamMode = () =>
    useBeatDetectionStore((state) => state.beatStreamMode);

/**
 * Selector to get the interpolation visualization visibility.
 */
export const useShowInterpolationVisualization = () =>
    useBeatDetectionStore((state) => state.showInterpolationVisualization);

/**
 * Selector to get the grid overlay visibility. (Task 5.3)
 */
export const useShowGridOverlay = () =>
    useBeatDetectionStore((state) => state.showGridOverlay);

/**
 * Selector to get the tempo drift visualization visibility. (Task 5.4)
 */
export const useShowTempoDriftVisualization = () =>
    useBeatDetectionStore((state) => state.showTempoDriftVisualization);

/**
 * Confidence level for visual indicator.
 * - 'high': > 0.8 confidence (green)
 * - 'medium': 0.5 - 0.8 confidence (yellow)
 * - 'low': < 0.5 confidence (red)
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * Interface for interpolation statistics display.
 */
export interface InterpolationStatistics {
    /** Number of originally detected beats */
    detectedBeatCount: number;
    /** Number of beats added by interpolation */
    interpolatedBeatCount: number;
    /** Total beats in the merged stream */
    totalBeatCount: number;
    /** Ratio of interpolated beats to total beats (0-1) */
    interpolationRatio: number;
    /** Average confidence of interpolated beats (0-1) */
    avgInterpolatedConfidence: number;
    /** Confidence level for visual indicator */
    confidenceLevel: ConfidenceLevel;
    /** Detected quarter note BPM */
    quarterNoteBpm: number;
    /** Confidence in quarter note detection (0-1) */
    quarterNoteConfidence: number;
    /** Ratio of max local tempo to min local tempo (drift indicator) */
    tempoDriftRatio: number;
    /** How well detected beats align to grid (0-1, higher is better) */
    gridAlignmentScore: number;
    /** Confidence model weights for breakdown display */
    confidenceWeights: {
        /** Weight for grid alignment in confidence calculation (0-1) */
        gridAlignment: number;
        /** Weight for anchor confidence in confidence calculation (0-1) */
        anchorConfidence: number;
        /** Weight for pace confidence in confidence calculation (0-1) */
        paceConfidence: number;
    };
    /** Quarter note detection details (Task 4.3) */
    quarterNoteDetection: {
        /** Method used for detection: 'histogram' | 'kde' | 'tempo-detector-fallback' */
        method: 'histogram' | 'kde' | 'tempo-detector-fallback';
        /** Number of dense sections that contributed to the detection */
        denseSectionCount: number;
        /** Total beats from dense sections used in the detection */
        denseSectionBeats: number;
        /** Other significant peaks (e.g., half-note = 2× quarter note), as BPM values */
        secondaryPeaks: number[];
    };
    // Multi-tempo fields (Phase 1: Task 1.2)
    /** Whether multiple distinct tempos were detected */
    hasMultipleTempos: boolean;
    /** Array of detected tempo values in BPM (e.g., [128, 140]) */
    detectedClusterTempos: number[];
    /** Tempo sections with boundaries (only after multi-tempo analysis) */
    tempoSections: TempoSection[] | null;
    /** Whether multi-tempo re-analysis has been applied */
    hasMultiTempoApplied: boolean;
}

/**
 * Determine confidence level from average confidence value.
 */
const getConfidenceLevel = (confidence: number): ConfidenceLevel => {
    if (confidence > 0.8) return 'high';
    if (confidence >= 0.5) return 'medium';
    return 'low';
};

/**
 * Selector to get interpolation statistics for display.
 * Returns null if no interpolation has been generated.
 *
 * Note: This uses a two-step approach to prevent infinite loops:
 * 1. First, select raw data with useShallow to get stable primitive values
 * 2. Then, memoize the computed result based on those stable values
 */
export const useInterpolationStatistics = (): InterpolationStatistics | null => {
    // Step 1: Select raw data with useShallow for stable references
    const rawData = useBeatDetectionStore(
        useShallow((state) => ({
            interpolatedBeatMap: state.interpolatedBeatMap,
            gridAlignmentWeight: state.interpolationOptions.gridAlignmentWeight,
            anchorConfidenceWeight: state.interpolationOptions.anchorConfidenceWeight,
            paceConfidenceWeight: state.interpolationOptions.paceConfidenceWeight,
        }))
    );

    // Step 2: Memoize the computed result based on stable raw data
    return useMemo(() => {
        const { interpolatedBeatMap, gridAlignmentWeight, anchorConfidenceWeight, paceConfidenceWeight } = rawData;

        if (!interpolatedBeatMap) {
            return null;
        }

        const { interpolationMetadata, quarterNoteBpm, quarterNoteConfidence } = interpolatedBeatMap;
        const { gapAnalysis, quarterNoteDetection } = interpolationMetadata;
        const avgConfidence = interpolationMetadata.avgInterpolatedConfidence;

        // Convert secondary peaks from interval seconds to BPM
        const secondaryPeaksBpm = quarterNoteDetection.secondaryPeaks
            .map((interval) => (interval > 0 ? Math.round(60 / interval) : 0))
            .filter((bpm) => bpm > 0);

        return {
            detectedBeatCount: interpolationMetadata.detectedBeatCount,
            interpolatedBeatCount: interpolationMetadata.interpolatedBeatCount,
            totalBeatCount: interpolationMetadata.totalBeatCount,
            interpolationRatio: interpolationMetadata.interpolationRatio,
            avgInterpolatedConfidence: avgConfidence,
            confidenceLevel: getConfidenceLevel(avgConfidence),
            quarterNoteBpm,
            quarterNoteConfidence,
            tempoDriftRatio: interpolationMetadata.tempoDriftRatio,
            gridAlignmentScore: gapAnalysis.gridAlignmentScore,
            confidenceWeights: {
                gridAlignment: gridAlignmentWeight ?? DEFAULT_BEAT_INTERPOLATION_OPTIONS.gridAlignmentWeight,
                anchorConfidence: anchorConfidenceWeight ?? DEFAULT_BEAT_INTERPOLATION_OPTIONS.anchorConfidenceWeight,
                paceConfidence: paceConfidenceWeight ?? DEFAULT_BEAT_INTERPOLATION_OPTIONS.paceConfidenceWeight,
            },
            quarterNoteDetection: {
                method: quarterNoteDetection.method,
                denseSectionCount: quarterNoteDetection.denseSectionCount,
                denseSectionBeats: quarterNoteDetection.denseSectionBeats,
                secondaryPeaks: secondaryPeaksBpm,
            },
            // Multi-tempo fields (Phase 1: Task 1.2)
            hasMultipleTempos: interpolationMetadata.hasMultipleTempos ?? false,
            detectedClusterTempos: interpolationMetadata.detectedClusterTempos ?? [],
            tempoSections: interpolationMetadata.tempoSections ?? null,
            hasMultiTempoApplied: interpolationMetadata.hasMultiTempoApplied ?? false,
        };
    }, [rawData]);
};

/**
 * Calculate tempo drift data for visualization.
 *
 * Samples local tempo at regular intervals throughout the track by analyzing
 * the intervals between adjacent beats. This creates a tempo curve that shows
 * how tempo changes over time.
 *
 * Part of Task 5.4: Tempo Drift Visualization
 *
 * @param beats - Array of beats with timestamps
 * @param duration - Total duration of the track in seconds
 * @param quarterNoteInterval - The detected quarter note interval in seconds
 * @param sampleInterval - How often to sample tempo (default: 0.5 seconds)
 * @returns Array of { time, bpm } points for visualization
 */
function calculateTempoDriftData(
    beats: Array<{ timestamp: number }>,
    duration: number,
    quarterNoteInterval: number,
    sampleInterval: number = 0.5
): Array<{ time: number; bpm: number }> {
    if (beats.length < 2 || quarterNoteInterval <= 0) {
        return [];
    }

    const driftPoints: Array<{ time: number; bpm: number }> = [];
    const baseBpm = 60 / quarterNoteInterval;

    // Sort beats by timestamp (should already be sorted, but ensure it)
    const sortedBeats = [...beats].sort((a, b) => a.timestamp - b.timestamp);

    // Calculate local tempo using a sliding window of beat intervals
    // We look at a window of ~2 beats worth of time to smooth out variations
    const windowSize = quarterNoteInterval * 2;

    for (let time = 0; time <= duration; time += sampleInterval) {
        // Find beats within the window around this time
        const windowStart = Math.max(0, time - windowSize);
        const windowEnd = Math.min(duration, time + windowSize);

        const windowBeats = sortedBeats.filter(
            (beat) => beat.timestamp >= windowStart && beat.timestamp <= windowEnd
        );

        if (windowBeats.length >= 2) {
            // Calculate average interval between consecutive beats in the window
            let totalInterval = 0;
            let intervalCount = 0;

            for (let i = 1; i < windowBeats.length; i++) {
                const interval = windowBeats[i].timestamp - windowBeats[i - 1].timestamp;
                // Filter out anomalous intervals (too short or too long)
                if (interval > quarterNoteInterval * 0.25 && interval < quarterNoteInterval * 4) {
                    totalInterval += interval;
                    intervalCount++;
                }
            }

            if (intervalCount > 0) {
                const avgInterval = totalInterval / intervalCount;
                const localBpm = 60 / avgInterval;

                // Clamp to reasonable BPM range (40-240 BPM)
                const clampedBpm = Math.max(40, Math.min(240, localBpm));
                driftPoints.push({ time, bpm: clampedBpm });
            } else {
                // Fall back to base BPM if no valid intervals
                driftPoints.push({ time, bpm: baseBpm });
            }
        } else if (windowBeats.length === 1) {
            // Not enough beats for interval calculation, use base BPM
            driftPoints.push({ time, bpm: baseBpm });
        }
        // If no beats in window, skip this point (will be interpolated in visualization)
    }

    // Ensure we have at least start and end points
    if (driftPoints.length === 0) {
        driftPoints.push(
            { time: 0, bpm: baseBpm },
            { time: duration, bpm: baseBpm }
        );
    } else if (driftPoints[0].time > 0) {
        driftPoints.unshift({ time: 0, bpm: driftPoints[0].bpm });
    }

    const lastPoint = driftPoints[driftPoints.length - 1];
    if (lastPoint.time < duration) {
        driftPoints.push({ time: duration, bpm: lastPoint.bpm });
    }

    return driftPoints;
}

/**
 * Internal hook to get raw interpolation data from the store.
 * Returns stable references to avoid unnecessary re-renders.
 * Uses useShallow to prevent infinite loops from new object references.
 */
function useRawInterpolationData() {
    return useBeatDetectionStore(useShallow((state) => ({
        interpolatedBeatMap: state.interpolatedBeatMap,
        beatStreamMode: state.beatStreamMode,
    })));
}

/**
 * Selector to get formatted visualization data for the beat timeline.
 * Returns null if no interpolation has been generated.
 * Respects beatStreamMode: 'detected' shows only detected beats, 'merged' shows all beats.
 * Uses useMemo to prevent infinite loops from new array references.
 */
export const useInterpolationVisualizationData = (): InterpolationVisualizationData | null => {
    const { interpolatedBeatMap, beatStreamMode } = useRawInterpolationData();

    return useMemo(() => {
        // Only return visualization data if we have an interpolated beat map
        if (!interpolatedBeatMap) {
            return null;
        }

        const { mergedBeats, detectedBeats, quarterNoteInterval } = interpolatedBeatMap;

        // Select which beats to show based on stream mode
        // - 'detected': Show only originally detected beats (all marked as 'detected' source)
        // - 'merged': Show all beats (detected + interpolated, with actual source)
        const beats = beatStreamMode === 'detected'
            ? detectedBeats.map((beat) => ({
                timestamp: beat.timestamp,
                source: 'detected' as const, // All detected beats have 'detected' source
                confidence: beat.confidence,
                isDownbeat: beat.isDownbeat,
            }))
            : mergedBeats.map((beat) => ({
                timestamp: beat.timestamp,
                source: beat.source, // Preserves actual source (detected or interpolated)
                confidence: beat.confidence,
                isDownbeat: beat.isDownbeat,
            }));

        // Calculate tempo drift data for visualization (Task 5.4)
        // Always provide drift data when we have beats - the visualization will show
        // even small tempo variations which is useful for understanding the track
        // Note: Always use mergedBeats for drift calculation to show full tempo picture
        const tempoDrift = calculateTempoDriftData(
            mergedBeats,
            interpolatedBeatMap.duration,
            quarterNoteInterval
        );

        return {
            beats,
            quarterNoteInterval,
            tempoDrift,
        };
    }, [interpolatedBeatMap, beatStreamMode]);
};

/**
 * Selector to get all interpolation-related state in one call.
 * Uses useShallow to prevent infinite loops from new object references.
 */
export const useInterpolationState = () =>
    useBeatDetectionStore(useShallow((state) => ({
        interpolatedBeatMap: state.interpolatedBeatMap,
        interpolationOptions: state.interpolationOptions,
        beatStreamMode: state.beatStreamMode,
        showInterpolationVisualization: state.showInterpolationVisualization,
    })));

/**
 * Selector to check if interpolation settings have changed since last generation.
 * Used for the "Re-Analyze Needed" indicator for interpolation.
 */
export const useInterpolationSettingsChanged = () =>
    useBeatDetectionStore(useShallow((state) => {
        // No beat map means nothing to re-analyze
        if (!state.beatMap) return false;

        // Create a snapshot of current settings (including autoMultiTempo)
        const currentSnapshot = createInterpolationConfigSnapshot(
            state.interpolationOptions,
            state.autoMultiTempo
        );

        // Compare with stored snapshot
        return interpolationConfigsDiffer(state.lastGeneratedInterpolationConfig, currentSnapshot);
    }));

/**
 * Selector to check if either OSE or interpolation settings have changed.
 * Combined check for the overall "Re-Analyze Needed" indicator.
 */
export const useNeedsReanalysis = () => {
    const oseChanged = useOseSettingsChanged();
    const interpolationChanged = useInterpolationSettingsChanged();
    return oseChanged || interpolationChanged;
};

// ============================================================
// Downbeat Configuration Selectors (Task 1.4)
// ============================================================

/**
 * Selector to get the current downbeat configuration.
 * Returns the stored config or DEFAULT_DOWNBEAT_CONFIG if null (using default).
 */
export const useDownbeatConfig = () =>
    useBeatDetectionStore((state) =>
        state.downbeatConfig ?? DEFAULT_DOWNBEAT_CONFIG
    );

/**
 * Selector to get the current time signature (beats per measure).
 * Returns the beatsPerMeasure from the first segment, which is the primary
 * time signature for the track. Defaults to 4 if no config exists.
 */
export const useTimeSignature = () =>
    useBeatDetectionStore((state) => {
        const config = state.downbeatConfig;
        // Get beatsPerMeasure from first segment, or default to 4
        return config?.segments[0]?.timeSignature.beatsPerMeasure
            ?? DEFAULT_DOWNBEAT_CONFIG.segments[0].timeSignature.beatsPerMeasure;
    });

/**
 * Selector to get the number of downbeat segments.
 * Returns 1 if using default config (single segment), otherwise returns
 * the actual segment count from the stored config.
 */
export const useDownbeatSegmentCount = () =>
    useBeatDetectionStore((state) => {
        const config = state.downbeatConfig;
        // Default config has 1 segment
        return config?.segments.length ?? 1;
    });

/**
 * Selector to check if a custom (non-default) downbeat config is applied.
 * Returns true if downbeatConfig is not null, indicating the user has
 * modified the default downbeat configuration.
 */
export const useHasCustomDownbeatConfig = () =>
    useBeatDetectionStore((state) => state.downbeatConfig !== null);

// ============================================================
// Measure Visualization Selectors (Phase 4: Task 4.1)
// ============================================================

/**
 * Selector to get whether measure boundaries should be shown in the timeline.
 * Returns the showMeasureBoundaries state value (default: false).
 */
export const useShowMeasureBoundaries = () =>
    useBeatDetectionStore((state) => state.showMeasureBoundaries);

// ============================================================
// Multi-Tempo Selectors (Phase 1: Task 1.2)
// ============================================================

/**
 * Selector hook for auto multi-tempo setting.
 * Returns the autoMultiTempo state value (default: true).
 */
export const useAutoMultiTempo = () =>
    useBeatDetectionStore((state) => state.autoMultiTempo);

/**
 * Selector hook for setAutoMultiTempo action.
 * Returns the setter function for updating autoMultiTempo state.
 */
export const useSetAutoMultiTempo = () =>
    useBeatDetectionStore((state) => state.actions.setAutoMultiTempo);

// ============================================================
// Downbeat Selection Mode Selectors (Phase 5: Task 5.3)
// ============================================================

/**
 * Selector to get whether downbeat selection mode is active.
 * When active, beat markers in the timeline become clickable for setting downbeat position.
 * Returns the isDownbeatSelectionMode state value (default: false).
 */
export const useIsDownbeatSelectionMode = () =>
    useBeatDetectionStore((state) => state.isDownbeatSelectionMode);

// ============================================================
// Subdivision Selectors (Phase 2: Task 2.3)
// ============================================================

/**
 * Selector to get the UnifiedBeatMap.
 * A unified beat map is a flattened grid of quarter notes derived from InterpolatedBeatMap.
 * This serves as the foundation for both pre-calculated and real-time subdivision.
 * Returns null if no unified beat map has been generated.
 */
export const useUnifiedBeatMap = () =>
    useBeatDetectionStore((state) => state.unifiedBeatMap);

/**
 * Selector to get the SubdividedBeatMap.
 * A pre-calculated subdivided beat map with custom subdivision patterns.
 * Generated by BeatSubdivider using subdivisionConfig.
 * Returns null if no subdivided beat map has been generated.
 */
export const useSubdividedBeatMap = () =>
    useBeatDetectionStore((state) => state.subdividedBeatMap);

/**
 * Selector to get the current SubdivisionConfig.
 * Defines subdivision segments with different patterns per beat range.
 * Persisted to localStorage.
 */
export const useSubdivisionConfig = () =>
    useBeatDetectionStore((state) => state.subdivisionConfig);

/**
 * Selector to get the subdivision type for a specific beat.
 * Returns the custom subdivision if defined for this beat index,
 * otherwise returns the default subdivision.
 * @param beatIndex - The 0-based beat index
 */
export const useBeatSubdivision = (beatIndex: number): SubdivisionType =>
    useBeatDetectionStore((state) => {
        const config = state.subdivisionConfig;
        return config.beatSubdivisions.get(beatIndex) ?? config.defaultSubdivision;
    });

/**
 * Selector to get subdivision types for a range of beats.
 * Returns an array of objects with beat index and subdivision type.
 * Useful for rendering beat grids where you need multiple subdivisions at once.
 * @param startBeat - Start beat index (inclusive)
 * @param endBeat - End beat index (exclusive)
 */
export const useBeatSubdivisionsInRange = (
    startBeat: number,
    endBeat: number,
): Array<{ beatIndex: number; subdivision: SubdivisionType }> =>
    useBeatDetectionStore((state) => {
        const config = state.subdivisionConfig;
        const result: Array<{ beatIndex: number; subdivision: SubdivisionType }> = [];

        for (let i = startBeat; i < endBeat; i++) {
            result.push({
                beatIndex: i,
                subdivision: config.beatSubdivisions.get(i) ?? config.defaultSubdivision,
            });
        }

        return result;
    });

/**
 * Selector to get the current subdivision type for real-time mode.
 * Used in BeatPracticeView for the subdivision playground.
 * Defaults to 'quarter' (no subdivision).
 */
export const useCurrentSubdivision = () =>
    useBeatDetectionStore((state) => state.currentSubdivision);

/**
 * Selector to get the pending subdivision change.
 * Set when transitionMode is 'next-downbeat' or 'next-measure'.
 * Null when there's no pending change.
 * Used to show a preview of the upcoming subdivision change in the UI.
 */
export const usePendingSubdivision = () =>
    useBeatDetectionStore((state) => state.pendingSubdivision);

/**
 * Selector to get the subdivision transition mode.
 * Controls how subdivision changes are applied during playback:
 * - 'immediate': Switch instantly (default, more playful)
 * - 'next-downbeat': Wait for beat 1 of next measure
 * - 'next-measure': Wait for start of next measure
 */
export const useSubdivisionTransitionMode = () =>
    useBeatDetectionStore((state) => state.subdivisionTransitionMode);

/**
 * Selector to get the subdivision metadata from the SubdividedBeatMap.
 * Returns metadata about the subdivision process including:
 * - originalBeatCount: Number of beats in the original unified map
 * - subdividedBeatCount: Number of beats after subdivision
 * - averageDensityMultiplier: Overall density multiplier
 * - segmentCount: Number of subdivision segments
 * - subdivisionsUsed: Array of subdivision types used
 * - hasMultipleTempos: Whether the track has tempo changes
 * - maxDensity: Maximum density multiplier
 * Returns null if no SubdividedBeatMap exists.
 */
export const useSubdivisionMetadata = () =>
    useBeatDetectionStore((state) => state.subdividedBeatMap?.subdivisionMetadata ?? null);

// ============================================================
// Chart Editor Selectors (Phase 2: Task 2.4 - Required Keys)
// ============================================================

/**
 * Selector to check if the chart editor is active.
 * Returns true if the chart editor panel is open.
 */
export const useChartEditorActive = () =>
    useBeatDetectionStore((state) => state.chartEditorActive);

/**
 * Selector to get the current chart style.
 * Returns 'ddr' or 'guitar-hero'.
 */
export const useChartStyle = () =>
    useBeatDetectionStore((state) => state.chartStyle);

/**
 * Selector to get the currently selected key for painting.
 * Returns null if no key is selected.
 */
export const useSelectedKey = () =>
    useBeatDetectionStore((state) => state.selectedKey);

/**
 * Selector to get the current chart editor mode.
 * Returns 'view', 'paint', or 'erase'.
 */
export const useEditorMode = () =>
    useBeatDetectionStore((state) => state.editorMode);

/**
 * Selector to get the KeyLane visualization mode.
 * Returns 'off', 'ddr', or 'guitar-hero'.
 */
export const useKeyLaneViewMode = () =>
    useBeatDetectionStore((state) => state.keyLaneViewMode);

/**
 * Selector to check if a subdivided beat map exists (required for chart editor).
 * The chart editor only works with subdivided beat maps.
 */
export const useCanStartChartEditor = () =>
    useBeatDetectionStore((state) => state.subdividedBeatMap !== null);

/**
 * Selector to get chart statistics.
 * Returns key count and array of used keys from the subdivided beat map.
 *
 * Note: This uses a two-step approach to prevent infinite loops:
 * 1. First, select raw data with useShallow to get stable references
 * 2. Then, memoize the computed result based on those stable values
 */
export const useChartStatistics = () => {
    // Step 1: Select raw data with useShallow for stable references
    const subdividedBeatMap = useBeatDetectionStore(
        useShallow((state) => state.subdividedBeatMap)
    );

    // Step 2: Memoize the computed result based on stable raw data
    return useMemo(() => {
        if (!subdividedBeatMap) {
            return { keyCount: 0, usedKeys: [] };
        }

        const usedKeys = new Set<string>();
        let keyCount = 0;

        for (const beat of subdividedBeatMap.beats) {
            if (beat.requiredKey) {
                usedKeys.add(beat.requiredKey);
                keyCount++;
            }
        }

        return {
            keyCount,
            usedKeys: Array.from(usedKeys).sort(),
        };
    }, [subdividedBeatMap]);
};

/**
 * Selector to get the key map from the subdivided beat map.
 * Returns a Map of beat index to required key.
 *
 * Note: This uses a two-step approach to prevent infinite loops:
 * 1. First, select raw data with useShallow to get stable references
 * 2. Then, memoize the computed result based on those stable values
 */
export const useKeyMap = () => {
    // Step 1: Select raw data with useShallow for stable references
    const subdividedBeatMap = useBeatDetectionStore(
        useShallow((state) => state.subdividedBeatMap)
    );

    // Step 2: Memoize the computed Map based on stable raw data
    return useMemo(() => {
        if (!subdividedBeatMap) {
            return new Map<number, string>();
        }

        const keyMap = new Map<number, string>();
        for (let i = 0; i < subdividedBeatMap.beats.length; i++) {
            const beat = subdividedBeatMap.beats[i];
            if (beat.requiredKey) {
                keyMap.set(i, beat.requiredKey);
            }
        }

        return keyMap;
    }, [subdividedBeatMap]);
};

/**
 * Selector to check if the subdivided beat map has any required keys.
 */
export const useHasRequiredKeys = () =>
    useBeatDetectionStore((state) => {
        const beatMap = state.subdividedBeatMap;
        if (!beatMap) return false;

        return beatMap.beats.some((beat) => beat.requiredKey !== undefined);
    });

// ============================================================
// TASK 1.2: Step Navigation Hooks
// ============================================================

/**
 * Hook to get the current step number in the beat detection wizard UI.
 * @returns The current step number (1-4)
 */
export const useCurrentStep = (): 1 | 2 | 3 | 4 =>
    useBeatDetectionStore((state) => state.currentStep);

/**
 * Step completion status for the beat detection wizard.
 * Task 1.2: Updated to support 4 steps in both manual and automatic modes.
 */
export interface StepCompletionStatus {
    /** Step 1 (Analyze) is complete when beatMap exists */
    step1: boolean;
    /** Step 2 is complete when:
     *   - Manual: subdividedBeatMap exists
     *   - Automatic: generatedRhythm exists
     */
    step2: boolean;
    /** Step 3 is complete when:
     *   - Manual: chartStatistics.keyCount > 0
     *   - Automatic: allDifficultyLevels exists (level generation complete)
     */
    step3: boolean;
    /** Step 4 (Ready) - final step, no completion status */
    step4: boolean;
}

/**
 * Hook to get the completion status of each step in the beat detection wizard.
 *
 * Manual Mode (4 steps):
 * - step1 (Analyze): complete when beatMap exists
 * - step2 (Subdivide): complete when subdividedBeatMap exists
 * - step3 (Chart): complete when keys are assigned
 * - step4 (Ready): not applicable (final step, no completion)
 *
 * Automatic Mode (4 steps - Task 1.2):
 * - step1 (Analyze): complete when beatMap exists
 * - step2 (Rhythm Generation): complete when generatedRhythm exists
 * - step3 (Pitch & Level): complete when allDifficultyLevels exists
 * - step4 (Ready): not applicable (final step, no completion)
 *
 * Uses a two-step approach to prevent infinite loops:
 * 1. First, select raw data with useShallow for stable references
 * 2. Then, memoize the computed result based on those stable values
 * @returns Object with step completion booleans
 */
export const useStepCompletion = (): StepCompletionStatus => {
    // Step 1: Select raw data with useShallow for stable references
    const beatMap = useBeatDetectionStore(useShallow((state) => state.beatMap));
    const subdividedBeatMap = useBeatDetectionStore(useShallow((state) => state.subdividedBeatMap));
    const generatedRhythm = useBeatDetectionStore(useShallow((state) => state.generatedRhythm));
    const allDifficultyLevels = useBeatDetectionStore(useShallow((state) => state.allDifficultyLevels));
    const generationMode = useBeatDetectionStore(useShallow((state) => state.generationMode));

    // Step 2: Memoize the computed result based on stable raw data
    return useMemo(() => {
        if (generationMode === 'automatic') {
            // Task 1.2: Automatic mode now has 4 steps
            return {
                step1: beatMap !== null,
                step2: generatedRhythm !== null,
                step3: allDifficultyLevels !== null, // Pitch & Level complete when levels are generated
                step4: false, // Ready step has no completion status
            };
        }

        // Manual mode: 4 steps
        // Count keys in subdivided beat map for step 3 completion
        let keyCount = 0;
        if (subdividedBeatMap) {
            for (const beat of subdividedBeatMap.beats) {
                if (beat.requiredKey !== undefined) {
                    keyCount++;
                }
            }
        }

        return {
            step1: beatMap !== null,
            step2: subdividedBeatMap !== null,
            step3: keyCount > 0,
            step4: false, // Ready step has no completion status
        };
    }, [beatMap, subdividedBeatMap, generatedRhythm, allDifficultyLevels, generationMode]);
};

/**
 * Hook to get which steps are clickable/available in the beat detection wizard.
 *
 * Manual Mode Step availability rules:
 * - step1: always available (assumes track is selected)
 * - step2: available when step1 is complete (beatMap exists)
 * - step3: available when step2 is complete (subdividedBeatMap exists)
 * - step4: available when step1 is complete (beatMap exists)
 *
 * Automatic Mode Step availability rules (Task 1.2: 4 steps):
 * - step1: always available (assumes track is selected)
 * - step2 (Rhythm Generation): available when step1 is complete (beatMap exists)
 * - step3 (Pitch & Level): available when step2 is complete (generatedRhythm exists)
 * - step4 (Ready): available when step1 is complete (beatMap exists)
 *
 * Uses a two-step approach to prevent infinite loops.
 * @returns Set of available step numbers
 */
export const useStepAvailability = (): Set<number> => {
    // Step 1: Select raw data with useShallow for stable references
    const beatMap = useBeatDetectionStore(useShallow((state) => state.beatMap));
    const subdividedBeatMap = useBeatDetectionStore(useShallow((state) => state.subdividedBeatMap));
    const generatedRhythm = useBeatDetectionStore(useShallow((state) => state.generatedRhythm));
    const generationMode = useBeatDetectionStore(useShallow((state) => state.generationMode));

    // Step 2: Memoize the computed Set based on stable raw data
    return useMemo(() => {
        const available = new Set<number>();

        // Step 1 is always available
        available.add(1);

        if (generationMode === 'automatic') {
            // Task 1.2: Automatic mode now has 4 steps (Analyze → Rhythm Generation → Pitch & Level → Ready)
            // Step 2 (Rhythm Generation) available when step 1 complete
            if (beatMap !== null) {
                available.add(2);
                // Step 4 (Ready) available when step 1 complete (allows skipping to practice)
                available.add(4);
            }

            // Step 3 (Pitch & Level) available when step 2 complete (rhythm generated)
            if (generatedRhythm !== null) {
                available.add(3);
            }
        } else {
            // Manual mode: 4 steps (Analyze → Subdivide → Chart → Ready)
            // Step 2 is available when step1 is complete (beatMap exists)
            if (beatMap !== null) {
                available.add(2);
                // Step 4 is available when step1 is complete (beatMap exists)
                available.add(4);
            }

            // Step 3 is available when step2 is complete (subdividedBeatMap exists)
            if (subdividedBeatMap !== null) {
                available.add(3);
            }
        }

        return available;
    }, [beatMap, subdividedBeatMap, generatedRhythm, generationMode]);
};

/**
 * Step configuration for a single step in the beat detection wizard.
 * Matches the Step interface from StepNav component.
 */
export interface StepConfig {
    /** Step identifier */
    id: number;
    /** Base label for the step */
    label: string;
    /** Optional dynamic label - overrides label when step becomes available */
    dynamicLabel?: {
        /** Label when step is available */
        available: string;
        /** Label when step is disabled */
        disabled: string;
    };
}

/**
 * Manual mode step configuration (4 steps).
 */
const MANUAL_STEPS: StepConfig[] = [
    { id: 1, label: 'Analyze' },
    { id: 2, label: 'Subdivide' },
    { id: 3, label: 'Chart' },
    { id: 4, label: 'Ready', dynamicLabel: { available: 'Ready', disabled: 'Not Ready' } },
];

/**
 * Automatic mode step configuration (4 steps).
 * Task 1.2: Updated from 3 to 4 steps with Pitch & Level as Step 3.
 */
const AUTOMATIC_STEPS: StepConfig[] = [
    { id: 1, label: 'Analyze' },
    { id: 2, label: 'Rhythm Generation' },
    { id: 3, label: 'Pitch & Level', dynamicLabel: { available: 'Pitch & Level', disabled: 'Not Ready' } },
    { id: 4, label: 'Ready', dynamicLabel: { available: 'Ready', disabled: 'Not Ready' } },
];

/**
 * Hook to get step configuration based on current generation mode.
 *
 * Manual Mode: 4 steps (Analyze → Subdivide → Chart → Ready)
 * Automatic Mode: 4 steps (Analyze → Rhythm Generation → Pitch & Level → Ready)
 *
 * Task 1.2: Automatic mode now has 4 steps with Pitch & Level as Step 3.
 *
 * @returns Array of step configurations
 */
export const useStepsForMode = (): StepConfig[] => {
    const generationMode = useBeatDetectionStore((state) => state.generationMode);

    return useMemo(() => {
        return generationMode === 'automatic' ? AUTOMATIC_STEPS : MANUAL_STEPS;
    }, [generationMode]);
};

/**
 * Hook to get the current generation mode.
 * @returns 'manual' or 'automatic'
 */
export const useGenerationMode = (): 'manual' | 'automatic' =>
    useBeatDetectionStore((state) => state.generationMode);

/**
 * Selector to get the generated rhythm data.
 * Returns the GeneratedRhythm from the RhythmGenerator, or null if not generated yet.
 * This is session-only state (not persisted to localStorage).
 */
export const useGeneratedRhythm = () =>
    useBeatDetectionStore((state) => state.generatedRhythm);

/**
 * Selector to get the rhythm generation progress.
 * Returns progress information during rhythm generation, or null if not generating.
 * Tracks phases: multiBand → transients → quantize → phrases → composite → variants
 */
export const useRhythmGenerationProgress = () =>
    useBeatDetectionStore((state) => state.rhythmGenerationProgress);

/**
 * Selector to get the rhythm validation result.
 * Returns validation information for the generated rhythm, or null if not validated.
 * Task 0.7: Used to verify data contract before level generation.
 */
export const useRhythmValidation = () =>
    useBeatDetectionStore((state) => state.rhythmValidation);

/**
 * Selector to get all difficulty levels of the generated level.
 * Returns the AllDifficultiesResult containing easy, medium, hard, and natural variants.
 * This is session-only state (not persisted to localStorage).
 */
export const useAllDifficultyLevels = () =>
    useBeatDetectionStore((state) => state.allDifficultyLevels);

/**
 * Selector to get the generated level for the selected difficulty.
 * Returns the GeneratedLevel or null if none generated.
 */
export const useGeneratedLevel = () =>
    useBeatDetectionStore((state) => state.generatedLevel);

/**
 * Selector to get the pitch analysis result.
 * Returns the MelodyContourAnalysisResult containing direction stats, interval stats, etc.
 */
export const usePitchAnalysis = () =>
    useBeatDetectionStore((state) => state.pitchAnalysis);

/**
 * Selector to get the level generation progress.
 * Returns progress information during level generation, or null if not generating.
 * Tracks stages: rhythm → pitch → buttons → conversion → finalizing
 */
export const useLevelGenerationProgress = () =>
    useBeatDetectionStore((state) => state.levelGenerationProgress);

/**
 * Selector to get the selected difficulty level.
 * Returns the current selected difficulty (default: 'medium').
 * Task 8.1: Used in Ready step for difficulty switcher.
 */
export const useSelectedDifficulty = () =>
    useBeatDetectionStore((state) => state.selectedDifficulty);

/**
 * Navigation direction for step content animations.
 * - 'forward': Navigating to a higher step number (slide left animation)
 * - 'backward': Navigating to a lower step number (slide right animation)
 * - 'none': Initial state, no navigation has occurred yet
 */
export type StepNavigationDirection = 'forward' | 'backward' | 'none';

/**
 * Hook to get the navigation direction for step content animations.
 * Compares previousStep with currentStep to determine direction.
 *
 * @returns Navigation direction for animations
 */
export const useStepNavigationDirection = (): StepNavigationDirection => {
    const currentStep = useBeatDetectionStore((state) => state.currentStep);
    const previousStep = useBeatDetectionStore((state) => state.previousStep);

    return useMemo(() => {
        if (previousStep === null) {
            return 'none';
        }
        return currentStep > previousStep ? 'forward' : 'backward';
    }, [currentStep, previousStep]);
};
