import { useState, useCallback, useRef } from 'react';
import { MusicClassifier } from 'playlist-data-engine';
import type { MusicClassifierOptions, MusicClassificationProfile } from '@/types';
import { logger } from '@/utils/logger';
import { handleError } from '@/utils/errorHandling';
import { usePlaylistStore } from '@/store/playlistStore';

/**
 * Error categories for music classification
 */
export type ClassificationErrorType = 'network' | 'model_load' | 'audio_decode' | 'unknown';

/**
 * Structured error information for music classification
 */
export interface ClassificationError {
    type: ClassificationErrorType;
    message: string;
    technicalMessage?: string;
}

/**
 * Model configuration for two-step architecture
 */
export interface TwoStepModelConfig {
    embedding: string;
    classifier: string;
}

/**
 * Extended options for the MusicClassifier hook
 */
export interface UseMusicClassifierOptions extends Partial<MusicClassifierOptions> {
    /** Model paths - can be single-step (string) or two-step (object) */
    models?: {
        genre?: string | TwoStepModelConfig;
        mood?: string | TwoStepModelConfig;
        danceability?: string | TwoStepModelConfig;
        voice?: string | TwoStepModelConfig;
        acoustic?: string | TwoStepModelConfig;
    };
}

/**
 * Default options for the MusicClassifier.
 * Uses two-step architecture with Discogs-EffNet embeddings.
 */
const DEFAULT_CLASSIFIER_OPTIONS: UseMusicClassifierOptions = {
    topN: 10,
    threshold: 0.05,
    // cacheEmbeddings: true,
    models: {
        // Two-step architecture: embedding + classifier
        // Note: In Vite, files in public/ are served at root URL, not at /public/
        // The browser-compatible frozen model was converted from SavedModel to remove PartitionedCall ops
        genre: {
            embedding: '/models/discogs-effnet-bs64-1-tfjs-browser-frozen/model.json',
            // classifier: '/models/mtg_jamendo_genre/tfjs/model.json'
            classifier: '/models/genre_discogs400/tfjs/model.json'
        },
        // genre: '/models/genre_tzanetakis-musicnn-msd/model.json',
        // genre: '/models/mtt_musicnn/model.json',
        mood: {
            embedding: '/models/discogs-effnet-bs64-1-tfjs-browser-frozen/model.json',  // Shared embedding!
            classifier: '/models/mtg_jamendo_moodtheme/tfjs/model.json'
        },
        // mood: '/models/mood_happy-musicnn-msd-2/model.json',
        // danceability: '/models/danceability-musicnn-msd-2/model.json',
        danceability: 'https://turbo-gateway.com/nX9KX1OVhEaT1dStNcsRiZKCQTWuHjAMl4MWprIFyZU/model.json',
        // voice: '/models/voice_instrumental-vggish-1.json',
        // acoustic: '/models/acoustic-brnn-1.json'
    }
};

/**
 * Classify an error into a category and provide user-friendly message
 */
const classifyError = (error: unknown, context: 'model' | 'audio'): ClassificationError => {
    // Handle numeric error codes (common from WASM/TensorFlow.js)
    if (typeof error === 'number') {
        return {
            type: 'model_load',
            message: 'Failed to load the ML model. The model files may be missing or corrupted.',
            technicalMessage: `TensorFlow.js/WASM error code: ${error}`,
        };
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    const lowerMessage = errorMessage.toLowerCase();

    // Network-related errors
    if (
        lowerMessage.includes('fetch') ||
        lowerMessage.includes('network') ||
        lowerMessage.includes('failed to fetch') ||
        lowerMessage.includes('networkerror') ||
        lowerMessage.includes('cors') ||
        lowerMessage.includes('404') ||
        lowerMessage.includes('enotfound') ||
        lowerMessage.includes('timeout')
    ) {
        if (context === 'model') {
            return {
                type: 'model_load',
                message: 'Failed to load the ML model. Please check your internet connection and try again.',
                technicalMessage: errorMessage,
            };
        }
        return {
            type: 'network',
            message: 'Failed to fetch the audio file. Please check the URL and your internet connection.',
            technicalMessage: errorMessage,
        };
    }

    // Model loading errors
    if (
        lowerMessage.includes('model') ||
        lowerMessage.includes('tensorflow') ||
        lowerMessage.includes('tfjs') ||
        lowerMessage.includes('essentia') ||
        lowerMessage.includes('initialize')
    ) {
        return {
            type: 'model_load',
            message: 'Failed to initialize the music classification model. Please try again.',
            technicalMessage: errorMessage,
        };
    }

    // Audio decoding errors
    if (
        lowerMessage.includes('decode') ||
        lowerMessage.includes('audio') ||
        lowerMessage.includes('format') ||
        lowerMessage.includes('invalid') ||
        lowerMessage.includes('unsupported')
    ) {
        return {
            type: 'audio_decode',
            message: 'Failed to process the audio file. The format may not be supported.',
            technicalMessage: errorMessage,
        };
    }

    // Unknown error
    return {
        type: 'unknown',
        message: context === 'model'
            ? 'Failed to initialize the music classifier. Please try again.'
            : 'Music classification failed. Please try again.',
        technicalMessage: errorMessage,
    };
};

/**
 * React hook for analyzing music using the MusicClassifier engine module.
 *
 * Uses machine learning (essentia.js + TensorFlow.js with Discogs-EffNet models)
 * to classify music into genres, moods, and calculate vibe metrics like danceability.
 *
 * The ML models are lazily loaded on first use and cached for subsequent calls.
 * Uses two-step architecture with shared embedding model for efficiency.
 *
 * @example
 * ```tsx
 * const { analyze, isAnalyzing, profile, error } = useMusicClassifier();
 * const result = await analyze('https://example.com/audio.mp3');
 * console.log(result.primary_genre, result.mood_tags, result.vibe_metrics.danceability);
 * ```
 *
 * @returns {Object} Hook return object
 * @returns {Function} analyze - Analyzes audio from a URL and returns a MusicClassificationProfile
 * @returns {Function} analyzeGenre - Alias for analyze (backward compatibility)
 * @returns {boolean} isAnalyzing - Whether analysis is currently in progress
 * @returns {boolean} isModelLoading - Whether the ML model is being loaded
 * @returns {number} progress - Analysis progress percentage (0-100)
 * @returns {MusicClassificationProfile | null} profile - The last analyzed classification profile
 * @returns {MusicClassificationProfile | null} genreProfile - Alias for profile (backward compatibility)
 * @returns {UseMusicClassifierOptions} options - Current classifier options
 * @returns {Function} setOptions - Update classifier options
 * @returns {Function} clearProfile - Clear the current profile and error state
 * @returns {Function} retry - Retry the last analysis
 * @returns {ClassificationError | null} error - Current error information
 * @returns {Function} clearCaches - Clear all cached models
 */
export const useMusicClassifier = () => {
    // Lazy-initialized classifier instance (created on first use, then cached)
    const classifierRef = useRef<MusicClassifier | null>(null);
    // Track if model is currently loading (separate from analysis state)
    const [isModelLoading, setIsModelLoading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [profile, setProfile] = useState<MusicClassificationProfile | null>(null);
    const [error, setError] = useState<ClassificationError | null>(null);

    // Classifier options for controlling analysis behavior
    const [options, setOptionsState] = useState<UseMusicClassifierOptions>(DEFAULT_CLASSIFIER_OPTIONS);

    // Get the store's setMusicClassification action
    const setStoreMusicClassification = usePlaylistStore((state) => state.setMusicClassification);

    // Store the last analyzed URL for retry functionality
    const lastAnalyzedUrlRef = useRef<string | null>(null);

    /**
     * Get or create the MusicClassifier instance.
     * Lazily initializes the classifier on first call and caches it.
     */
    const getClassifier = useCallback(async (): Promise<MusicClassifier | null> => {
        // Return cached instance if available
        if (classifierRef.current) {
            return classifierRef.current;
        }

        // Create new classifier with current options
        try {
            setIsModelLoading(true);
            setError(null);
            logger.info('MusicClassifier', 'Creating new MusicClassifier instance (lazy init)');

            const classifier = new MusicClassifier(options as MusicClassifierOptions);
            classifierRef.current = classifier;

            logger.info('MusicClassifier', 'MusicClassifier instance created and cached');
            return classifier;
        } catch (err) {
            handleError(err, 'MusicClassifier');
            const classifiedError = classifyError(err, 'model');
            setError(classifiedError);
            return null;
        } finally {
            setIsModelLoading(false);
        }
    }, [options]);

    /**
     * Analyze the music of an audio track.
     *
     * @param audioUrl - URL of the audio file to analyze
     * @returns MusicClassificationProfile with genres, moods, and vibe metrics, or null if analysis failed
     */
    const analyze = useCallback(async (audioUrl: string): Promise<MusicClassificationProfile | null> => {
        // Clear previous error and store URL for potential retry
        setError(null);
        lastAnalyzedUrlRef.current = audioUrl;

        const startTime = performance.now();
        logger.info('MusicClassifier', 'Starting music classification', { url: audioUrl });
        setIsAnalyzing(true);
        setProgress(0);

        try {
            // Get or create classifier (lazy initialization)
            setProgress(5); // Starting
            const classifier = await getClassifier();

            if (!classifier) {
                // Error was already set in getClassifier
                return null;
            }

            // Simulate progress updates (ML model loading + analysis can take time)
            const progressInterval = setInterval(() => {
                setProgress((p) => Math.min(p + 5, 90));
            }, 500);

            // Perform the music classification
            const result = await classifier.analyze(audioUrl);

            clearInterval(progressInterval);
            setProgress(100);

            // Calculate elapsed time
            const endTime = performance.now();
            const elapsedSeconds = ((endTime - startTime) / 1000).toFixed(2);

            logger.info('MusicClassifier', 'Music classification complete', {
                primaryGenre: result.primary_genre,
                genreCount: result.genres.length,
                moodCount: result.moods.length,
                danceability: result.vibe_metrics?.danceability,
                analysisTimeSeconds: elapsedSeconds,
            });

            // Update local state
            setProfile(result);

            // Store results in playlist store
            setStoreMusicClassification(result);

            return result;
        } catch (err) {
            handleError(err, 'MusicClassifier');
            const classifiedError = classifyError(err, 'audio');
            setError(classifiedError);
            return null;
        } finally {
            setIsAnalyzing(false);
        }
    }, [getClassifier, setStoreMusicClassification]);

    /**
     * Update classifier options.
     * Note: Changing options will create a new classifier instance on next analysis.
     *
     * @param newOptions - Partial or complete options to merge with current options
     */
    const setOptions = useCallback((newOptions: Partial<UseMusicClassifierOptions>) => {
        setOptionsState((prev) => {
            const merged = { ...prev, ...newOptions };
            logger.debug('MusicClassifier', 'Options updated', { old: prev, new: merged });
            // Reset cached classifier so new options take effect
            classifierRef.current = null;
            return merged;
        });
    }, []);

    /**
     * Clear the current profile and error state.
     */
    const clearProfile = useCallback(() => {
        setProfile(null);
        setError(null);
        setProgress(0);
        lastAnalyzedUrlRef.current = null;
    }, []);

    /**
     * Retry the last analysis (if there was an error).
     * Useful for network errors where retrying might succeed.
     */
    const retry = useCallback(async (): Promise<MusicClassificationProfile | null> => {
        if (lastAnalyzedUrlRef.current) {
            return analyze(lastAnalyzedUrlRef.current);
        }
        return null;
    }, [analyze]);

    /**
     * Clear all cached models to free memory.
     */
    const clearCaches = useCallback(() => {
        if (classifierRef.current) {
            classifierRef.current.clearAllCaches();
            logger.info('MusicClassifier', 'Cleared all model caches');
        }
    }, []);

    return {
        /** Analyze the music of an audio track (genres, moods, vibe metrics) */
        analyze,
        /** Alias for analyze - for backward compatibility with useGenreAnalyzer */
        analyzeGenre: analyze,
        /** Whether analysis is currently in progress */
        isAnalyzing,
        /** Whether the ML model is being loaded (first-time initialization) */
        isModelLoading,
        /** Analysis progress percentage (0-100) */
        progress,
        /** The last analyzed classification profile */
        profile,
        /** Alias for profile - provides genre data for backward compatibility */
        genreProfile: profile,
        /** Current classifier options */
        options,
        /** Update classifier options */
        setOptions,
        /** Clear the current profile and error state */
        clearProfile,
        /** Retry the last analysis (useful for network errors) */
        retry,
        /** Current error information, if any */
        error,
        /** Clear all cached models */
        clearCaches,
    };
};

// ============================================================
// Backward Compatibility Exports
// ============================================================

/**
 * @deprecated Use useMusicClassifier instead. Kept for backward compatibility.
 *
 * This hook is now an alias for useMusicClassifier.
 * The return type is compatible with the old useGenreAnalyzer interface.
 */
export const useGenreAnalyzer = useMusicClassifier;

/** @deprecated Use ClassificationErrorType instead */
export type GenreErrorType = ClassificationErrorType;

/** @deprecated Use ClassificationError instead */
export type GenreError = ClassificationError;
