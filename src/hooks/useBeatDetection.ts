/**
 * useBeatDetection Hook
 *
 * React hook for generating beat maps from audio files using the engine's BeatMapGenerator.
 * Provides a convenient interface for beat map generation with progress tracking,
 * cancellation support, and integration with the beat detection store.
 *
 * @example
 * ```tsx
 * const { generateBeatMap, cancelGeneration, isGenerating, progress, beatMap, error } = useBeatDetection();
 *
 * // Generate a beat map
 * const map = await generateBeatMap('https://example.com/audio.mp3', 'track-001');
 *
 * // During generation, progress updates automatically
 * console.log(progress?.phase, progress?.progress);
 *
 * // Cancel if needed
 * cancelGeneration();
 * ```
 */

import { useCallback, useEffect, useRef } from 'react';
import type { BeatMap, BeatMapGeneratorOptions, BeatMapGenerationProgress } from 'playlist-data-engine';
import { logger } from '@/utils/logger';
import { handleError } from '@/utils/errorHandling';
import {
    useBeatDetectionStore,
    useBeatMap,
    useBeatMapGenerationState,
    useGeneratorOptions,
    useBeatDetectionActions,
} from '@/store/beatDetectionStore';

/**
 * Return type for the useBeatDetection hook.
 */
export interface UseBeatDetectionReturn {
    /** Generate a beat map from an audio URL */
    generateBeatMap: (audioUrl: string, audioId: string, options?: Partial<BeatMapGeneratorOptions>) => Promise<BeatMap | null>;
    /** Cancel an ongoing beat map generation */
    cancelGeneration: () => void;
    /** Whether beat map generation is currently in progress */
    isGenerating: boolean;
    /** Current generation progress (null when not generating) */
    progress: BeatMapGenerationProgress | null;
    /** The currently loaded beat map (or null if none) */
    beatMap: BeatMap | null;
    /** Error message if generation failed (or null if no error) */
    error: string | null;
    /** Current generator options */
    generatorOptions: BeatMapGeneratorOptions;
    /** Update generator options for future generations */
    setGeneratorOptions: (options: Partial<BeatMapGeneratorOptions>) => void;
    /** Clear the current beat map */
    clearBeatMap: () => void;
    /** Clear any error state */
    clearError: () => void;
}

/**
 * React hook for beat map generation using the engine's BeatMapGenerator.
 *
 * This hook provides a convenient interface for generating beat maps from audio files.
 * It wraps the BeatMapGenerator class and integrates with the beat detection store
 * for state management and caching.
 *
 * Features:
 * - Progress tracking during generation
 * - Cancellation support
 * - Automatic caching of generated beat maps
 * - Error handling
 *
 * @returns {UseBeatDetectionReturn} Hook return object with generation methods and state
 */
export const useBeatDetection = (): UseBeatDetectionReturn => {
    // Get state from selectors
    const beatMap = useBeatMap();
    const { isGenerating, progress, error } = useBeatMapGenerationState();
    const generatorOptions = useGeneratorOptions();
    const actions = useBeatDetectionActions();

    // Ref to track if we're mounted (for async cleanup)
    const isMountedRef = useRef(true);

    // Cleanup on unmount
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    /**
     * Generate a beat map from an audio URL.
     *
     * This method:
     * 1. Checks the cache for an existing beat map (unless forceRegenerate is true)
     * 2. Creates a BeatMapGenerator with the current options
     * 3. Generates the beat map with progress tracking
     * 4. Caches the result for future use
     *
     * @param audioUrl - URL of the audio file to analyze
     * @param audioId - Unique identifier for the audio (used for caching)
     * @param options - Optional override for generator options
     * @returns The generated BeatMap, or null if generation failed
     */
    const generateBeatMap = useCallback(async (
        audioUrl: string,
        audioId: string,
        options?: Partial<BeatMapGeneratorOptions>
    ): Promise<BeatMap | null> => {
        if (!isMountedRef.current) {
            logger.warn('BeatDetection', 'generateBeatMap called after unmount');
            return null;
        }

        logger.info('BeatDetection', 'Starting beat map generation via hook', {
            audioUrl,
            audioId,
            hasOptions: !!options,
        });

        try {
            // Use the store's generateBeatMap action which handles caching and progress
            const result = await actions.generateBeatMap(audioUrl, audioId, options);

            if (result && isMountedRef.current) {
                logger.info('BeatDetection', 'Beat map generation complete via hook', {
                    audioId,
                    beatCount: result.beats.length,
                    bpm: result.bpm,
                });
            }

            return result;
        } catch (err) {
            handleError(err, 'BeatDetection');
            return null;
        }
    }, [actions]);

    /**
     * Cancel an ongoing beat map generation.
     */
    const cancelGeneration = useCallback(() => {
        logger.info('BeatDetection', 'Cancelling beat map generation via hook');
        actions.cancelGeneration();
    }, [actions]);

    /**
     * Update generator options for future generations.
     */
    const setGeneratorOptions = useCallback((options: Partial<BeatMapGeneratorOptions>) => {
        actions.setGeneratorOptions(options);
    }, [actions]);

    /**
     * Clear the current beat map.
     */
    const clearBeatMap = useCallback(() => {
        actions.clearBeatMap();
    }, [actions]);

    /**
     * Clear any error state.
     */
    const clearError = useCallback(() => {
        actions.clearError();
    }, [actions]);

    return {
        generateBeatMap,
        cancelGeneration,
        isGenerating,
        progress,
        beatMap,
        error,
        generatorOptions,
        setGeneratorOptions,
        clearBeatMap,
        clearError,
    };
};

// ============================================================
// Additional Utility Hooks
// ============================================================

/**
 * Hook to check if a beat map is cached for a specific audio ID.
 *
 * @param audioId - The audio identifier to check
 * @returns Whether a cached beat map exists for this audio ID
 */
export const useHasCachedBeatMap = (audioId: string): boolean => {
    return useBeatDetectionStore((state) => audioId in state.cachedBeatMaps);
};

/**
 * Hook to get a cached beat map for a specific audio ID.
 *
 * @param audioId - The audio identifier to look up
 * @returns The cached BeatMap or undefined if not found
 */
export const useCachedBeatMap = (audioId: string): BeatMap | undefined => {
    return useBeatDetectionStore((state) => state.cachedBeatMaps[audioId]);
};

/**
 * Hook to get the number of cached beat maps.
 *
 * @returns The count of cached beat maps
 */
export const useCachedBeatMapCount = (): number => {
    return useBeatDetectionStore((state) => Object.keys(state.cachedBeatMaps).length);
};
