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
    // Subdivision types (Phase 2: Task 2.1)
    SubdivisionType,
    SubdivisionSegment,
    SubdivisionConfig,
    UnifiedBeatMap,
    SubdividedBeatMap,
    SubdivisionPlaybackOptions,
    DEFAULT_SUBDIVISION_CONFIG,
    DEFAULT_SUBDIVISION_PLAYBACK_OPTIONS,
} from '@/types';
import {
    BeatMapGenerator,
    BeatInterpolator,
    BeatSubdivider,
    SubdivisionPlaybackController,
    unifyBeatMap,
} from 'playlist-data-engine';

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
    noiseFloorThreshold: 0.1,
    hopSizeMs: HOP_SIZE_PRESETS.standard.value,  // 4ms - resolved from 'standard' mode
    fftSize: 2048,
    rollingBpmWindowSize: 8,
    dpAlpha: 680,
    melBands: MEL_BANDS_PRESETS.standard.value,  // 40 bands - resolved from 'standard' mode
    highPassCutoff: 0.4,
    gaussianSmoothMs: GAUSSIAN_SMOOTH_PRESETS.standard.value,  // 20ms - resolved from 'standard' mode
    tempoCenter: 0.5,
    tempoWidth: 1.4,
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
 */
export interface DifficultySettings {
    /** Current difficulty preset */
    preset: DifficultyPreset;
    /** Custom thresholds (used when preset is 'custom') */
    customThresholds: Partial<AccuracyThresholds>;
}

/**
 * Default difficulty settings.
 * Starts with 'medium' as a reasonable default for most players.
 */
const DEFAULT_DIFFICULTY_SETTINGS: DifficultySettings = {
    preset: 'medium',
    customThresholds: {},
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
     * Defines subdivision segments with different patterns per beat range.
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
     * Reset difficulty settings to defaults.
     */
    resetDifficultySettings: () => void;

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
     * Add a new subdivision segment.
     * Segments are automatically sorted by startBeat after insertion.
     * @param segment - The segment to add
     */
    addSubdivisionSegment: (segment: SubdivisionSegment) => void;

    /**
     * Remove a subdivision segment by index.
     * Cannot remove the first segment (index 0).
     * @param segmentIndex - The index of the segment to remove
     */
    removeSubdivisionSegment: (segmentIndex: number) => void;

    /**
     * Update a subdivision segment by index.
     * @param segmentIndex - The index of the segment to update
     * @param updates - Partial segment properties to update
     */
    updateSubdivisionSegment: (segmentIndex: number, updates: Partial<SubdivisionSegment>) => void;

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
}

interface BeatDetectionStoreState extends BeatDetectionState {
    actions: BeatDetectionActions;
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
    showMeasureBoundaries: false, // Off by default, user opt-in
    // Downbeat selection mode (Phase 5: BeatMapSummary Integration - Task 5.3)
    isDownbeatSelectionMode: false, // Off by default
    // Multi-tempo analysis (default: enabled)
    autoMultiTempo: true,
    // Subdivision state (Phase 2: Task 2.1)
    unifiedBeatMap: null,
    subdividedBeatMap: null,
    subdivisionConfig: { ...DEFAULT_SUBDIVISION_CONFIG },
    currentSubdivision: 'quarter',
    subdivisionTransitionMode: 'immediate',
    cachedUnifiedBeatMaps: {},
    cachedSubdividedBeatMaps: {},
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
                        set((state) => ({
                            tapHistory: [...state.tapHistory, tapResult],
                        }));
                    },

                    clearTapHistory: () => {
                        logger.info('BeatDetection', 'Clearing tap history');
                        set({ tapHistory: [] });
                    },

                    loadCachedBeatMap: (audioId) => {
                        const cached = get().cachedBeatMaps[audioId];
                        if (cached) {
                            logger.info('BeatDetection', 'Loading cached beat map', { audioId });
                            set({ beatMap: cached, error: null });
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
                    },

                    getAccuracyThresholds: () => {
                        const { difficultySettings } = get();
                        return getAccuracyThresholdsForPreset(
                            difficultySettings.preset,
                            difficultySettings.customThresholds
                        );
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
                            set({
                                interpolatedBeatMap,
                                unifiedBeatMap: unifiedMap,
                                subdividedBeatMap: null, // Clear subdivision when unified changes
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
                     */
                    applyDownbeatConfig: (config: DownbeatConfig) => {
                        const state = get();
                        const { beatMap, interpolatedBeatMap } = state;

                        if (!beatMap) {
                            logger.warn('BeatDetection', 'No beat map loaded, cannot apply downbeat config');
                            return;
                        }

                        logger.info('BeatDetection', 'Applying downbeat config', {
                            segmentCount: config.segments.length,
                            firstSegmentBeatsPerMeasure: config.segments[0]?.timeSignature.beatsPerMeasure,
                            firstSegmentDownbeatIndex: config.segments[0]?.downbeatBeatIndex,
                        });

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

                            set({
                                beatMap: updatedBeatMap,
                                interpolatedBeatMap: updatedInterpolatedBeatMap,
                                unifiedBeatMap: updatedUnifiedBeatMap,
                                subdividedBeatMap: null, // Clear subdivision when unified changes
                                downbeatConfig: config,
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
                     */
                    resetDownbeatConfig: () => {
                        const state = get();
                        const { beatMap, interpolatedBeatMap } = state;

                        if (!beatMap) {
                            logger.warn('BeatDetection', 'No beat map loaded, cannot reset downbeat config');
                            return;
                        }

                        logger.info('BeatDetection', 'Resetting downbeat config to default');

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

                            set({
                                beatMap: updatedBeatMap,
                                interpolatedBeatMap: updatedInterpolatedBeatMap,
                                unifiedBeatMap: updatedUnifiedBeatMap,
                                subdividedBeatMap: null, // Clear subdivision when unified changes
                                downbeatConfig: null, // null = using default
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
                            set({
                                unifiedBeatMap: unifiedMap,
                                subdividedBeatMap: null, // Clear subdivision when unified changes
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
                                segmentCount: subdivisionConfig.segments.length,
                            });

                            const subdivider = new BeatSubdivider();
                            const subdividedMap = subdivider.subdivide(unifiedBeatMap, subdivisionConfig);

                            set({ subdividedBeatMap: subdividedMap });

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
                            segmentCount: config.segments.length,
                        });

                        set({ subdivisionConfig: config });

                        // Regenerate subdivided beat map if one exists
                        if (state.subdividedBeatMap) {
                            logger.info('BeatDetection', 'Regenerating SubdividedBeatMap due to config change');
                            state.actions.generateSubdividedBeatMap();
                        }
                    },

                    /**
                     * Add a new subdivision segment.
                     */
                    addSubdivisionSegment: (segment: SubdivisionSegment) => {
                        const state = get();
                        const { subdivisionConfig } = state;

                        // Add new segment and sort by startBeat
                        const newSegments = [...subdivisionConfig.segments, segment].sort(
                            (a, b) => a.startBeat - b.startBeat
                        );

                        logger.info('BeatDetection', 'Adding subdivision segment', {
                            startBeat: segment.startBeat,
                            subdivision: segment.subdivision,
                            newSegmentCount: newSegments.length,
                        });

                        state.actions.setSubdivisionConfig({ segments: newSegments });
                    },

                    /**
                     * Remove a subdivision segment by index.
                     */
                    removeSubdivisionSegment: (segmentIndex: number) => {
                        const state = get();
                        const { subdivisionConfig } = state;

                        // Can't remove the first segment
                        if (segmentIndex === 0) {
                            logger.warn('BeatDetection', 'Cannot remove the first subdivision segment');
                            return;
                        }

                        if (segmentIndex < 0 || segmentIndex >= subdivisionConfig.segments.length) {
                            logger.warn('BeatDetection', 'Invalid segment index', { segmentIndex });
                            return;
                        }

                        const newSegments = subdivisionConfig.segments.filter(
                            (_: SubdivisionSegment, index: number) => index !== segmentIndex
                        );

                        logger.info('BeatDetection', 'Removing subdivision segment', {
                            removedIndex: segmentIndex,
                            newSegmentCount: newSegments.length,
                        });

                        state.actions.setSubdivisionConfig({ segments: newSegments });
                    },

                    /**
                     * Update a subdivision segment by index.
                     */
                    updateSubdivisionSegment: (segmentIndex: number, updates: Partial<SubdivisionSegment>) => {
                        const state = get();
                        const { subdivisionConfig } = state;

                        if (segmentIndex < 0 || segmentIndex >= subdivisionConfig.segments.length) {
                            logger.warn('BeatDetection', 'Invalid segment index', { segmentIndex });
                            return;
                        }

                        const newSegments = subdivisionConfig.segments.map(
                            (segment: SubdivisionSegment, index: number) =>
                                index === segmentIndex ? { ...segment, ...updates } : segment
                        );

                        // Re-sort if startBeat changed
                        if (updates.startBeat !== undefined) {
                            newSegments.sort((a: SubdivisionSegment, b: SubdivisionSegment) => a.startBeat - b.startBeat);
                        }

                        logger.info('BeatDetection', 'Updating subdivision segment', {
                            segmentIndex,
                            updates,
                        });

                        state.actions.setSubdivisionConfig({ segments: newSegments });
                    },

                    /**
                     * Set the current subdivision type for real-time mode.
                     */
                    setCurrentSubdivision: (subdivision: SubdivisionType) => {
                        const state = get();

                        logger.info('BeatDetection', 'Setting current subdivision', {
                            subdivision,
                            previousSubdivision: state.currentSubdivision,
                        });

                        set({ currentSubdivision: subdivision });

                        // Also update the playback controller if it exists
                        const controller = getActiveSubdivisionPlaybackController();
                        if (controller) {
                            controller.setSubdivision(subdivision);
                            logger.info('BeatDetection', 'Updated playback controller subdivision');
                        }
                    },

                    /**
                     * Set the transition mode for subdivision changes.
                     * Note: The transition mode is applied when the controller is initialized.
                     * To change mid-playback, the controller needs to be re-initialized.
                     */
                    setSubdivisionTransitionMode: (mode: 'immediate' | 'next-downbeat' | 'next-measure') => {
                        logger.info('BeatDetection', 'Setting subdivision transition mode', {
                            mode,
                            previousMode: get().subdivisionTransitionMode,
                        });

                        set({ subdivisionTransitionMode: mode });
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
            partialize: (state) => ({
                cachedBeatMaps: state.cachedBeatMaps,
                cacheOrder: state.cacheOrder,
                generatorOptions: state.generatorOptions,
                hopSizeConfig: state.hopSizeConfig,
                melBandsConfig: state.melBandsConfig,
                gaussianSmoothConfig: state.gaussianSmoothConfig,
                difficultySettings: state.difficultySettings,
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
                subdivisionConfig: state.subdivisionConfig,
                currentSubdivision: state.currentSubdivision,
                subdivisionTransitionMode: state.subdivisionTransitionMode,
                cachedUnifiedBeatMaps: state.cachedUnifiedBeatMaps,
                cachedSubdividedBeatMaps: state.cachedSubdividedBeatMaps,
            }) as BeatDetectionStoreState,
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

                return {
                    ...currentState,
                    cachedBeatMaps: persisted?.cachedBeatMaps ?? currentState.cachedBeatMaps,
                    cacheOrder: cacheOrder ?? currentState.cacheOrder,
                    generatorOptions,
                    hopSizeConfig,
                    melBandsConfig,
                    gaussianSmoothConfig,
                    difficultySettings,
                };
            },
            // Callback after rehydration
            onRehydrateStorage: () => {
                return (state) => {
                    if (state) {
                        logger.info('BeatDetection', 'Store rehydrated from storage', {
                            cachedBeatMapsCount: Object.keys(state.cachedBeatMaps).length,
                            cacheOrderLength: state.cacheOrder.length,
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

        // Count by accuracy (including 'ok')
        const counts: Record<string, number> = {
            perfect: 0,
            great: 0,
            good: 0,
            ok: 0,
            miss: 0,
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

            // Track streak (non-miss taps)
            if (tap.accuracy !== 'miss') {
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
            if (tap.source === 'detected') {
                detectedBeatsTotal++;
                if (tap.accuracy !== 'miss') {
                    detectedBeatsHit++;
                }
            } else if (tap.source === 'interpolated') {
                interpolatedBeatsTotal++;
                if (tap.accuracy !== 'miss') {
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

        // Calculate accuracy percentage (non-miss taps / total taps)
        const accuracyPercentage = history.length > 0
            ? Math.round(((history.length - counts.miss) / history.length) * 100 * 10) / 10 // Round to 1 decimal
            : 0;

        return {
            totalTaps: history.length,
            perfect: counts.perfect,
            great: counts.great,
            good: counts.good,
            ok: counts.ok,
            miss: counts.miss,
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
 * Selector to get the current effective accuracy thresholds.
 * Returns computed thresholds based on preset and custom settings.
 */
export const useAccuracyThresholds = () =>
    useBeatDetectionStore(useShallow((state) => {
        const { difficultySettings } = state;
        return getAccuracyThresholdsForPreset(
            difficultySettings.preset,
            difficultySettings.customThresholds
        );
    }));

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
 * Selector to get the current subdivision type for real-time mode.
 * Used in BeatPracticeView for the subdivision playground.
 * Defaults to 'quarter' (no subdivision).
 */
export const useCurrentSubdivision = () =>
    useBeatDetectionStore((state) => state.currentSubdivision);

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
