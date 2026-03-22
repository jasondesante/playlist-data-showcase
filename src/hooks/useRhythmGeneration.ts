/**
 * useRhythmGeneration Hook
 *
 * React hook for generating procedural rhythm patterns from audio using the engine's RhythmGenerator.
 * Provides a convenient interface for rhythm generation with progress tracking,
 * cancellation support, and integration with the beat detection store.
 *
 * @example
 * ```tsx
 * const { generate, isGenerating, progress, error, rhythm } = useRhythmGeneration();
 *
 * // Generate rhythm patterns
 * await generate('https://example.com/audio.mp3');
 *
 * // During generation, progress updates automatically
 * console.log(progress?.phase, progress?.progress);
 * ```
 */

import { useCallback, useEffect, useRef } from 'react';
import {
    RhythmGenerator,
    type GeneratedRhythm,
    type RhythmGenerationOptions,
} from 'playlist-data-engine';
import { logger } from '@/utils/logger';
import { handleError } from '@/utils/errorHandling';
import {
    useBeatDetectionStore,
    useGeneratedRhythm,
    useRhythmGenerationProgress,
    useBeatDetectionActions,
} from '@/store/beatDetectionStore';
import type { RhythmGenerationProgress, RhythmGenerationPhase } from '@/types/rhythmGeneration';

/**
 * Return type for the useRhythmGeneration hook.
 */
export interface UseRhythmGenerationReturn {
    /** Generate rhythm patterns from an audio URL */
    generate: (audioUrl: string, options?: Partial<RhythmGenerationOptions>) => Promise<GeneratedRhythm | null>;
    /** Cancel an ongoing rhythm generation */
    cancel: () => void;
    /** Whether rhythm generation is currently in progress */
    isGenerating: boolean;
    /** Current generation progress (null when not generating) */
    progress: RhythmGenerationProgress | null;
    /** The generated rhythm data (or null if none) */
    rhythm: GeneratedRhythm | null;
    /** Error message if generation failed (or null if no error) */
    error: string | null;
    /** Clear the generated rhythm */
    clearRhythm: () => void;
    /** Clear any error state */
    clearError: () => void;
    /** Retry the last generation */
    retry: () => Promise<GeneratedRhythm | null>;
}

/**
 * Map RhythmGenerator phase strings to our RhythmGenerationPhase type.
 * The RhythmGenerator reports phases as 'Phase 1', 'Phase 2', 'Phase 3' and sub-stages.
 * We map these to the more descriptive phase names used in our UI.
 */
const mapPhaseToRhythmGenerationPhase = (
    phase: string,
    progress: number
): { phase: RhythmGenerationPhase; adjustedProgress: number } => {
    // Phase 1: Multi-band Analysis, Transient Detection, Quantization (0% - 33%)
    // Phase 2: Phrase Analysis, Density Analysis (33% - 66%)
    // Phase 3: Scoring, Composite Generation, Difficulty Variants (66% - 100%)

    if (phase.includes('Phase 1') || phase === 'multiBand' || phase === 'transients' || phase === 'quantize') {
        // Within Phase 1, subdivide into our phases
        if (phase.includes('multi-band') || phase === 'multiBand') {
            return { phase: 'multiBand', adjustedProgress: progress * 0.11 }; // 0-11%
        }
        if (phase.includes('transient') || phase === 'transients') {
            return { phase: 'transients', adjustedProgress: 11 + progress * 0.11 }; // 11-22%
        }
        if (phase.includes('quantiz') || phase === 'quantize') {
            return { phase: 'quantize', adjustedProgress: 22 + progress * 0.11 }; // 22-33%
        }
        // Default Phase 1 mapping
        return { phase: 'multiBand', adjustedProgress: progress * 0.33 };
    }

    if (phase.includes('Phase 2') || phase === 'phrases') {
        // Within Phase 2
        if (phase.includes('phrase') || phase === 'phrases') {
            return { phase: 'phrases', adjustedProgress: 33 + progress * 0.33 }; // 33-66%
        }
        return { phase: 'phrases', adjustedProgress: 33 + progress * 0.33 };
    }

    if (phase.includes('Phase 3') || phase === 'composite' || phase === 'variants') {
        // Within Phase 3
        if (phase.includes('composite') || phase === 'composite') {
            return { phase: 'composite', adjustedProgress: 66 + progress * 0.17 }; // 66-83%
        }
        if (phase.includes('variant') || phase === 'variants') {
            return { phase: 'variants', adjustedProgress: 83 + progress * 0.17 }; // 83-100%
        }
        return { phase: 'composite', adjustedProgress: 66 + progress * 0.34 };
    }

    // Handle 'Cache' phase (immediate return)
    if (phase === 'Cache') {
        return { phase: 'variants', adjustedProgress: 100 };
    }

    // Default to multiBand for unknown phases
    return { phase: 'multiBand', adjustedProgress: progress };
};

/**
 * Active generator instance for cancellation support.
 */
let activeRhythmGenerator: RhythmGenerator | null = null;

/**
 * React hook for rhythm generation using the engine's RhythmGenerator.
 *
 * This hook provides a convenient interface for generating rhythm patterns from audio.
 * It wraps the RhythmGenerator class and integrates with the beat detection store
 * for state management.
 *
 * Features:
 * - Progress tracking during generation
 * - Cancellation support
 * - Error handling with retry support
 * - Automatic integration with beat detection store
 *
 * @returns {UseRhythmGenerationReturn} Hook return object with generation methods and state
 */
export const useRhythmGeneration = (): UseRhythmGenerationReturn => {
    // Get state from selectors
    const rhythm = useGeneratedRhythm();
    const progress = useRhythmGenerationProgress();
    const actions = useBeatDetectionActions();

    // Track if we're generating
    const isGeneratingRef = useRef(false);
    const lastAudioUrlRef = useRef<string | null>(null);
    const lastOptionsRef = useRef<Partial<RhythmGenerationOptions> | undefined>(undefined);

    // Track if we're mounted (for async cleanup)
    const isMountedRef = useRef(true);

    // Get isGenerating from progress state
    const isGenerating = progress !== null;

    // Cleanup on unmount
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            // Cancel any ongoing generation
            if (activeRhythmGenerator) {
                activeRhythmGenerator = null;
            }
        };
    }, []);

    /**
     * Fetch and decode audio from a URL to get an AudioBuffer.
     */
    const fetchAndDecodeAudio = useCallback(async (audioUrl: string): Promise<AudioBuffer> => {
        logger.info('RhythmGeneration', 'Fetching audio for rhythm generation', { audioUrl });

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
     * Generate rhythm patterns from an audio URL.
     *
     * This method:
     * 1. Gets the UnifiedBeatMap from the store
     * 2. Fetches and decodes the audio
     * 3. Creates a RhythmGenerator with the provided options
     * 4. Generates the rhythm with progress tracking
     * 5. Stores the result in the beat detection store
     *
     * @param audioUrl - URL of the audio file to analyze
     * @param options - Optional override for rhythm generation options
     * @returns The generated rhythm, or null if generation failed
     */
    const generate = useCallback(async (
        audioUrl: string,
        options?: Partial<RhythmGenerationOptions>
    ): Promise<GeneratedRhythm | null> => {
        if (!isMountedRef.current) {
            logger.warn('RhythmGeneration', 'generate called after unmount');
            return null;
        }

        // Store for retry
        lastAudioUrlRef.current = audioUrl;
        lastOptionsRef.current = options;

        logger.info('RhythmGeneration', 'Starting rhythm generation', {
            audioUrl,
            hasOptions: !!options,
        });

        // Check if we have a unified beat map
        const currentUnifiedBeatMap = useBeatDetectionStore.getState().unifiedBeatMap;
        if (!currentUnifiedBeatMap) {
            const error = 'No beat map available. Run beat detection first.';
            logger.error('RhythmGeneration', error);
            actions.setRhythmGenerationProgress({
                phase: 'multiBand',
                progress: 0,
                message: error,
            });
            return null;
        }

        isGeneratingRef.current = true;

        // Set initial progress
        actions.setRhythmGenerationProgress({
            phase: 'multiBand',
            progress: 0,
            message: 'Starting rhythm generation...',
        });

        try {
            // Fetch and decode audio
            actions.setRhythmGenerationProgress({
                phase: 'multiBand',
                progress: 5,
                message: 'Loading audio...',
            });

            const audioBuffer = await fetchAndDecodeAudio(audioUrl);

            if (!isMountedRef.current) {
                logger.warn('RhythmGeneration', 'Generation cancelled during audio fetch');
                return null;
            }

            // Create the rhythm generator
            const generatorOptions: RhythmGenerationOptions = {
                difficulty: options?.difficulty ?? 'medium',
                outputMode: options?.outputMode ?? 'composite',
                minimumTransientIntensity: options?.minimumTransientIntensity ?? 0.2,
                transientConfig: options?.transientConfig,
                densityValidation: options?.densityValidation,
                verbose: options?.verbose ?? false,
            };

            const generator = new RhythmGenerator(generatorOptions);
            activeRhythmGenerator = generator;

            // Progress callback to map phases and update store
            const onProgress = (phase: string, progressFraction: number, message: string) => {
                if (!isMountedRef.current) return;

                const { phase: mappedPhase, adjustedProgress } = mapPhaseToRhythmGenerationPhase(
                    phase,
                    progressFraction * 100
                );

                actions.setRhythmGenerationProgress({
                    phase: mappedPhase,
                    progress: Math.round(adjustedProgress),
                    message,
                });
            };

            // Generate the rhythm
            const result = await generator.generate(
                audioBuffer,
                currentUnifiedBeatMap,
                undefined, // No abort signal for now
                onProgress
            );

            if (!isMountedRef.current) {
                logger.warn('RhythmGeneration', 'Generation completed but component unmounted');
                return null;
            }

            // Store the result
            actions.setGeneratedRhythm(result);
            actions.setRhythmGenerationProgress({
                phase: 'variants',
                progress: 100,
                message: 'Rhythm generation complete!',
            });

            logger.info('RhythmGeneration', 'Rhythm generation complete', {
                transientsDetected: result.metadata.transientsDetected,
                phrasesDetected: result.metadata.phrasesDetected,
                naturalDifficulty: result.metadata.naturalDifficulty,
            });

            isGeneratingRef.current = false;
            activeRhythmGenerator = null;

            return result;
        } catch (err) {
            if (!isMountedRef.current) {
                return null;
            }

            const errorMessage = err instanceof Error ? err.message : 'Unknown error during rhythm generation';
            logger.error('RhythmGeneration', 'Rhythm generation failed', { error: errorMessage });
            handleError(err, 'RhythmGeneration');

            actions.setRhythmGenerationProgress({
                phase: 'multiBand',
                progress: 0,
                message: `Error: ${errorMessage}`,
            });

            isGeneratingRef.current = false;
            activeRhythmGenerator = null;

            return null;
        }
    }, [actions, fetchAndDecodeAudio]);

    /**
     * Cancel an ongoing rhythm generation.
     */
    const cancel = useCallback(() => {
        logger.info('RhythmGeneration', 'Cancelling rhythm generation');
        activeRhythmGenerator = null;
        isGeneratingRef.current = false;
        actions.setRhythmGenerationProgress({
            phase: 'multiBand',
            progress: 0,
            message: 'Cancelled',
        });
        // Clear progress after a short delay
        setTimeout(() => {
            if (!isGeneratingRef.current) {
                actions.clearGeneratedRhythm();
            }
        }, 100);
    }, [actions]);

    /**
     * Clear the generated rhythm.
     */
    const clearRhythm = useCallback(() => {
        actions.clearGeneratedRhythm();
    }, [actions]);

    /**
     * Clear any error state.
     */
    const clearError = useCallback(() => {
        // Clear error by resetting progress if it shows an error
        const currentProgress = useBeatDetectionStore.getState().rhythmGenerationProgress;
        if (currentProgress?.message.startsWith('Error:')) {
            actions.setRhythmGenerationProgress(null);
        }
    }, [actions]);

    /**
     * Retry the last generation.
     */
    const retry = useCallback(async (): Promise<GeneratedRhythm | null> => {
        if (lastAudioUrlRef.current) {
            logger.info('RhythmGeneration', 'Retrying rhythm generation');
            // Clear previous error state
            actions.setRhythmGenerationProgress(null);
            return generate(lastAudioUrlRef.current, lastOptionsRef.current);
        }
        return null;
    }, [actions, generate]);

    return {
        generate,
        cancel,
        isGenerating,
        progress,
        rhythm,
        error: progress?.message.startsWith('Error:') ? progress.message : null,
        clearRhythm,
        clearError,
        retry,
    };
};

// ============================================================
// Additional Utility Hooks
// ============================================================

/**
 * Hook to get the generated rhythm directly.
 *
 * @returns The generated rhythm or null
 */
export const useRhythm = (): GeneratedRhythm | null =>
    useBeatDetectionStore((state) => state.generatedRhythm);

/**
 * Hook to get the rhythm generation progress directly.
 *
 * @returns The generation progress or null
 */
export const useRhythmProgress = (): RhythmGenerationProgress | null =>
    useBeatDetectionStore((state) => state.rhythmGenerationProgress);

/**
 * Hook to check if rhythm generation is in progress.
 *
 * @returns Whether generation is in progress
 */
export const useIsRhythmGenerating = (): boolean =>
    useBeatDetectionStore((state) => state.rhythmGenerationProgress !== null);
