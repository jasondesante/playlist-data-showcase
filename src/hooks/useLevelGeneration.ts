/**
 * useLevelGeneration Hook
 *
 * React hook for generating rhythm game levels using the engine's LevelGenerator.
 * Provides a convenient interface for level generation with progress tracking,
 * cancellation support, and integration with the beat detection store.
 *
 * This hook accepts a cached GeneratedRhythm from the store to avoid re-generating
 * rhythm patterns when they've already been computed in the pipeline.
 *
 * @example
 * ```tsx
 * const { generate, isGenerating, progress, error, allDifficulties } = useLevelGeneration();
 *
 * // Generate all difficulty levels
 * await generate('https://example.com/audio.mp3');
 *
 * // During generation, progress updates automatically
 * console.log(progress?.stage, progress?.progress);
 * ```
 */

import { useCallback, useEffect, useRef } from 'react';
import {
    LevelGenerator,
    type GeneratedLevel,
    type AllDifficultiesResult,
    type LevelGenerationProgress,
    type LevelGenerationOptions,
} from 'playlist-data-engine';
import { logger } from '@/utils/logger';
import { handleError } from '@/utils/errorHandling';
import {
    useBeatDetectionStore,
    useLevelGenerationProgress as useStoredProgress,
    useBeatDetectionActions,
    useAllDifficultyLevels as useStoredAllDifficulties,
} from '@/store/beatDetectionStore';
import type { LevelGenerationProgress as UILevelGenerationProgress } from '@/store/beatDetectionStore';

/**
 * Return type for the useLevelGeneration hook.
 */
export interface UseLevelGenerationReturn {
    /** Generate levels for all difficulties from an audio URL */
    generate: (audioUrl: string, options?: Partial<LevelGenerationOptions>) => Promise<AllDifficultiesResult | null>;
    /** Cancel an ongoing level generation */
    cancel: () => void;
    /** Whether level generation is currently in progress */
    isGenerating: boolean;
    /** Current generation progress (null when not generating) */
    progress: UILevelGenerationProgress | null;
    /** The generated level for the selected difficulty (or null if none) */
    level: GeneratedLevel | null;
    /** All difficulty variants (or null if none) */
    allDifficulties: AllDifficultiesResult | null;
    /** Error message if generation failed (or null if no error) */
    error: string | null;
    /** Clear the generated levels */
    clearLevel: () => void;
    /** Clear any error state */
    clearError: () => void;
    /** Retry the last generation */
    retry: () => Promise<AllDifficultiesResult | null>;
}

/**
 * Map LevelGenerator stage strings to our UI progress phase descriptions.
 * The LevelGenerator reports stages: rhythm, pitch, buttons, conversion, finalizing
 */
const mapStageToProgress = (
    engineProgress: LevelGenerationProgress
): UILevelGenerationProgress => {
    const { stage, progress, message } = engineProgress;

    // Map engine stages to UI progress
    // Engine stages: rhythm → pitch → buttons → conversion → finalizing
    // We display them as-is since they're already user-friendly
    return {
        stage,
        progress: Math.round(progress * 100),
        message,
    };
};

/**
 * Active generator instance for cancellation support.
 */
let activeLevelGenerator: LevelGenerator | null = null;

/**
 * React hook for level generation using the engine's LevelGenerator.
 *
 * This hook provides a convenient interface for generating rhythm game levels.
 * It wraps the LevelGenerator class and integrates with the beat detection store
 * for state management.
 *
 * Features:
 * - Accepts cached rhythm from store to avoid re-generation
 * - Generates all 4 difficulties at once (Natural/Easy/Medium/Hard)
 * - Progress tracking during generation
 * - Cancellation support
 * - Error handling with retry support
 * - Automatic integration with beat detection store
 *
 * @returns {UseLevelGenerationReturn} Hook return object with generation methods and state
 */
export const useLevelGeneration = (): UseLevelGenerationReturn => {
    // Get state from selectors
    const progress = useStoredProgress();
    const allDifficulties = useStoredAllDifficulties();
    const actions = useBeatDetectionActions();

    // Track if we're generating
    const isGeneratingRef = useRef(false);
    const lastAudioUrlRef = useRef<string | null>(null);
    const lastOptionsRef = useRef<Partial<LevelGenerationOptions> | undefined>(undefined);

    // Track if we're mounted (for async cleanup)
    const isMountedRef = useRef(true);

    // Get isGenerating from progress state
    const isGenerating = progress !== null;

    // Get the currently selected difficulty level from store
    const selectedDifficulty = useBeatDetectionStore((state) => state.selectedDifficulty);

    // Get the generated level for the selected difficulty
    const level = allDifficulties?.[selectedDifficulty] ?? null;

    // Cleanup on unmount
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            // Cancel any ongoing generation
            if (activeLevelGenerator) {
                activeLevelGenerator = null;
            }
        };
    }, []);

    /**
     * Fetch and decode audio from a URL to get an AudioBuffer.
     */
    const fetchAndDecodeAudio = useCallback(async (audioUrl: string): Promise<AudioBuffer> => {
        logger.info('LevelGeneration', 'Fetching audio for level generation', { audioUrl });

        const response = await fetch(audioUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch audio: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const AudioContextClass = (globalThis as any).AudioContext || (window as any)?.AudioContext;

        if (!AudioContextClass) {
            throw new Error('AudioContext not available in this environment');
        }

        const audioContext = new AudioContextClass();
        return await new Promise<AudioBuffer>((resolve, reject) => {
            audioContext.decodeAudioData(arrayBuffer, resolve, reject);
        });
    }, []);

    /**
     * Generate levels for all difficulties from an audio URL.
     *
     * This method:
     * 1. Gets the cached GeneratedRhythm from the store (if available)
     * 2. Fetches and decodes the audio
     * 3. Creates a LevelGenerator with the provided options and cached rhythm
     * 4. Generates all 4 difficulty levels with progress tracking
     * 5. Stores the results in the beat detection store
     *
     * @param audioUrl - URL of the audio file to analyze
     * @param options - Optional override for level generation options
     * @returns The generated levels for all difficulties, or null if generation failed
     */
    const generate = useCallback(async (
        audioUrl: string,
        options?: Partial<LevelGenerationOptions>
    ): Promise<AllDifficultiesResult | null> => {
        if (!isMountedRef.current) {
            logger.warn('LevelGeneration', 'generate called after unmount');
            return null;
        }

        // Store for retry
        lastAudioUrlRef.current = audioUrl;
        lastOptionsRef.current = options;

        logger.info('LevelGeneration', 'Starting level generation', {
            audioUrl,
            hasOptions: !!options,
            hasCachedRhythm: !!useBeatDetectionStore.getState().generatedRhythm,
        });

        // Check if we have a unified beat map
        const currentUnifiedBeatMap = useBeatDetectionStore.getState().unifiedBeatMap;
        if (!currentUnifiedBeatMap) {
            const error = 'No unified beat map available. Run beat detection and rhythm generation first.';
            logger.error('LevelGeneration', error);
            actions.setLevelGenerationProgress({
                stage: 'rhythm',
                progress: 0,
                message: error,
            });
            return null;
        }

        isGeneratingRef.current = true;

        // Set initial progress
        actions.setLevelGenerationProgress({
            stage: 'rhythm',
            progress: 0,
            message: useBeatDetectionStore.getState().generatedRhythm
                ? 'Starting level generation with cached rhythm...'
                : 'Starting level generation...',
        });

        try {
            // Fetch and decode audio
            actions.setLevelGenerationProgress({
                stage: 'rhythm',
                progress: 5,
                message: 'Loading audio...',
            });

            const audioBuffer = await fetchAndDecodeAudio(audioUrl);

            if (!isMountedRef.current) {
                logger.warn('LevelGeneration', 'Generation cancelled during audio fetch');
                return null;
            }

            // Create the level generator options
            // Read cached rhythm from store at call time (not from closure) so that
            // callers can clear it (e.g. clearGeneratedRhythm) before invoking generate
            // and the engine will see the cleared value and regenerate rhythm from scratch.
            const currentCachedRhythm = useBeatDetectionStore.getState().generatedRhythm;

            const generatorOptions: Partial<LevelGenerationOptions> = {
                difficulty: options?.difficulty ?? 'medium',
                controllerMode: options?.controllerMode ?? 'ddr',
                rhythm: options?.rhythm,
                buttons: options?.buttons,
                seed: options?.seed,
                // Pass the cached rhythm from the store to avoid re-generation
                cachedRhythm: currentCachedRhythm ?? undefined,
                // Pitch detection settings
                pitchAlgorithm: options?.pitchAlgorithm,
                crepeModelUrl: options?.crepeModelUrl,
                voicingThreshold: options?.voicingThreshold,
            };

            const generator = new LevelGenerator(generatorOptions);
            activeLevelGenerator = generator;

            // Progress callback to map phases and update store
            const onProgress = (engineProgress: LevelGenerationProgress) => {
                if (!isMountedRef.current) return;

                const uiProgress = mapStageToProgress(engineProgress);
                actions.setLevelGenerationProgress(uiProgress);
            };

            // Generate all difficulties
            const result = await generator.generateAllDifficulties(
                audioBuffer,
                currentUnifiedBeatMap,
                onProgress,
                undefined // No abort signal for now
            );

            if (!isMountedRef.current) {
                logger.warn('LevelGeneration', 'Generation completed but component unmounted');
                return null;
            }

            // Check if the result has a natural variant
            // The engine generates all difficulties including natural
            const fullResult = result as AllDifficultiesResult & { natural?: GeneratedLevel };

            actions.setAllDifficultyLevels(fullResult);

            // Set the generated level for the currently selected difficulty
            const selectedLevel = fullResult[selectedDifficulty] ?? fullResult.medium;
            if (selectedLevel) {
                actions.setGeneratedLevel(selectedLevel);
            }

            // Set pitch analysis if available
            if (selectedLevel?.pitchAnalysis) {
                actions.setPitchAnalysis(selectedLevel.pitchAnalysis);
            }

            // Restore generated rhythm from the level result.
            // This is needed when regenerate was triggered after a downbeat change
            // (which cleared the rhythm so the engine would regenerate it from scratch).
            if (selectedLevel?.rhythm) {
                actions.setGeneratedRhythm(selectedLevel.rhythm);
            }

            actions.setLevelGenerationProgress({
                stage: 'finalizing',
                progress: 100,
                message: 'Level generation complete!',
            });

            // Clear progress after a brief delay so isGenerating returns to false,
            // allowing downstream effects (e.g. auto-advance to Step 4) to detect completion.
            setTimeout(() => {
                actions.setLevelGenerationProgress(null);
            }, 500);

            logger.info('LevelGeneration', 'Level generation complete', {
                easyBeats: result.easy?.chart.beats.length,
                mediumBeats: result.medium?.chart.beats.length,
                hardBeats: result.hard?.chart.beats.length,
                hasNatural: !!fullResult.natural,
            });

            isGeneratingRef.current = false;
            activeLevelGenerator = null;

            return result;
        } catch (err) {
            if (!isMountedRef.current) {
                return null;
            }

            const errorMessage = err instanceof Error ? err.message : 'Unknown error during level generation';
            logger.error('LevelGeneration', 'Level generation failed', { error: errorMessage });
            handleError(err, 'LevelGeneration');

            actions.setLevelGenerationProgress({
                stage: 'rhythm',
                progress: 0,
                message: `Error: ${errorMessage}`,
            });

            isGeneratingRef.current = false;
            activeLevelGenerator = null;

            return null;
        }
    }, [actions, fetchAndDecodeAudio, selectedDifficulty]);

    /**
     * Cancel an ongoing level generation.
     */
    const cancel = useCallback(() => {
        logger.info('LevelGeneration', 'Cancelling level generation');
        activeLevelGenerator = null;
        isGeneratingRef.current = false;
        actions.setLevelGenerationProgress({
            stage: 'rhythm',
            progress: 0,
            message: 'Cancelled',
        });
        // Clear progress after a short delay
        setTimeout(() => {
            if (!isGeneratingRef.current) {
                actions.clearGeneratedLevel();
            }
        }, 100);
    }, [actions]);

    /**
     * Clear the generated level.
     */
    const clearLevel = useCallback(() => {
        actions.clearGeneratedLevel();
    }, [actions]);

    /**
     * Clear any error state.
     */
    const clearError = useCallback(() => {
        // Clear error by resetting progress if it shows an error
        const currentProgress = useBeatDetectionStore.getState().levelGenerationProgress;
        if (currentProgress?.message.startsWith('Error:')) {
            actions.setLevelGenerationProgress(null);
        }
    }, [actions]);

    /**
     * Retry the last generation.
     */
    const retry = useCallback(async (): Promise<AllDifficultiesResult | null> => {
        if (lastAudioUrlRef.current) {
            logger.info('LevelGeneration', 'Retrying level generation');
            // Clear previous error state
            actions.setLevelGenerationProgress(null);
            return generate(lastAudioUrlRef.current, lastOptionsRef.current);
        }
        return null;
    }, [actions, generate]);

    return {
        generate,
        cancel,
        isGenerating,
        progress,
        level,
        allDifficulties,
        error: progress?.message.startsWith('Error:') ? progress.message : null,
        clearLevel,
        clearError,
        retry,
    };
};

// ============================================================
// Additional Utility Hooks
// ============================================================

/**
 * Hook to get all difficulty levels directly.
 *
 * @returns The generated levels for all difficulties or null
 */
export const useAllDifficultyLevels = (): AllDifficultiesResult | null =>
    useBeatDetectionStore((state) => state.allDifficultyLevels);

/**
 * Hook to get the level generation progress directly.
 *
 * @returns The generation progress or null
 */
export const useLevelGenerationProgressState = (): UILevelGenerationProgress | null =>
    useBeatDetectionStore((state) => state.levelGenerationProgress);

/**
 * Hook to check if level generation is in progress.
 *
 * @returns Whether generation is in progress
 */
export const useIsLevelGenerating = (): boolean =>
    useBeatDetectionStore((state) => state.levelGenerationProgress !== null);

/**
 * Hook to get the selected difficulty.
 *
 * @returns The currently selected difficulty
 */
export const useSelectedDifficulty = (): 'natural' | 'easy' | 'medium' | 'hard' =>
    useBeatDetectionStore((state) => state.selectedDifficulty);
