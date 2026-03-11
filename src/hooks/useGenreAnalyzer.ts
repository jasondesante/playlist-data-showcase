import { useState, useCallback, useRef } from 'react';
import { GenreAnalyzer, GenreProfile, GenreAnalyzerOptions } from 'playlist-data-engine';
import { logger } from '@/utils/logger';
import { handleError } from '@/utils/errorHandling';
import { usePlaylistStore } from '@/store/playlistStore';

/**
 * Error categories for genre analysis
 */
export type GenreErrorType = 'network' | 'model_load' | 'audio_decode' | 'unknown';

/**
 * Structured error information for genre analysis
 */
export interface GenreError {
    type: GenreErrorType;
    message: string;
    technicalMessage?: string;
}

/**
 * Classify an error into a category and provide user-friendly message
 */
const classifyError = (error: unknown, context: 'model' | 'audio'): GenreError => {
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
            message: 'Failed to initialize the genre analysis model. Please try again.',
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
            ? 'Failed to initialize the genre analyzer. Please try again.'
            : 'Genre analysis failed. Please try again.',
        technicalMessage: errorMessage,
    };
};

/**
 * Default options for the GenreAnalyzer.
 * Uses MTG Jamendo CDN for the ML model.
 */
const DEFAULT_GENRE_OPTIONS: GenreAnalyzerOptions = {
    modelUrl: 'https://cdn.jsdelivr.net/gh/MTG/essentia.js/examples/models/mtg_jamendo_genre/model.json',
    topN: 10,
    threshold: 0.05,
};

/**
 * React hook for analyzing audio genres using the GenreAnalyzer engine module.
 *
 * Uses machine learning (essentia.js + TensorFlow.js with MTG Jamendo model)
 * to classify music into genres. The ML model is lazily loaded on first use
 * and cached for subsequent calls.
 *
 * @example
 * ```tsx
 * const { analyzeGenre, isAnalyzing, progress, options, setOptions } = useGenreAnalyzer();
 * const profile = await analyzeGenre('https://example.com/audio.mp3');
 * console.log(profile.primary_genre, profile.genres);
 * ```
 *
 * @returns {Object} Hook return object
 * @returns {Function} analyzeGenre - Analyzes audio from a URL and returns a GenreProfile
 * @returns {boolean} isAnalyzing - Whether analysis is currently in progress
 * @returns {number} progress - Analysis progress percentage (0-100)
 * @returns {GenreProfile | null} genreProfile - The last analyzed genre profile
 * @returns {GenreAnalyzerOptions} options - Current genre analyzer options
 * @returns {Function} setOptions - Update genre analyzer options
 */
export const useGenreAnalyzer = () => {
    // Lazy-initialized analyzer instance (created on first use, then cached)
    const analyzerRef = useRef<GenreAnalyzer | null>(null);
    // Track if model is currently loading (separate from analysis state)
    const [isModelLoading, setIsModelLoading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [genreProfile, setGenreProfile] = useState<GenreProfile | null>(null);
    const [error, setError] = useState<GenreError | null>(null);

    // Genre analyzer options for controlling analysis behavior
    const [options, setOptionsState] = useState<GenreAnalyzerOptions>(DEFAULT_GENRE_OPTIONS);

    // Get the store's setGenreProfile action
    const setStoreGenreProfile = usePlaylistStore((state) => state.setGenreProfile);

    // Store the last analyzed URL for retry functionality
    const lastAnalyzedUrlRef = useRef<string | null>(null);

    /**
     * Get or create the GenreAnalyzer instance.
     * Lazily initializes the analyzer on first call and caches it.
     */
    const getAnalyzer = useCallback(async (): Promise<GenreAnalyzer | null> => {
        // Return cached instance if available
        if (analyzerRef.current) {
            return analyzerRef.current;
        }

        // Create new analyzer with current options
        try {
            setIsModelLoading(true);
            setError(null);
            logger.info('GenreAnalyzer', 'Creating new GenreAnalyzer instance (lazy init)');

            const analyzer = new GenreAnalyzer(options);
            analyzerRef.current = analyzer;

            logger.info('GenreAnalyzer', 'GenreAnalyzer instance created and cached');
            return analyzer;
        } catch (err) {
            handleError(err, 'GenreAnalyzer');
            const classifiedError = classifyError(err, 'model');
            setError(classifiedError);
            return null;
        } finally {
            setIsModelLoading(false);
        }
    }, [options]);

    /**
     * Analyze the genre of an audio track.
     *
     * @param audioUrl - URL of the audio file to analyze
     * @returns GenreProfile with detected genres, or null if analysis failed
     */
    const analyzeGenre = useCallback(async (audioUrl: string): Promise<GenreProfile | null> => {
        // Clear previous error and store URL for potential retry
        setError(null);
        lastAnalyzedUrlRef.current = audioUrl;

        const startTime = performance.now();
        logger.info('GenreAnalyzer', 'Starting genre analysis', { url: audioUrl });
        setIsAnalyzing(true);
        setProgress(0);

        try {
            // Get or create analyzer (lazy initialization)
            setProgress(5); // Starting
            const analyzer = await getAnalyzer();

            if (!analyzer) {
                // Error was already set in getAnalyzer
                return null;
            }

            // Simulate progress updates (ML model loading + analysis can take time)
            const progressInterval = setInterval(() => {
                setProgress((p) => Math.min(p + 5, 90));
            }, 500);

            // Perform the genre analysis
            const profile = await analyzer.analyzeGenre(audioUrl);

            clearInterval(progressInterval);
            setProgress(100);

            // Calculate elapsed time
            const endTime = performance.now();
            const elapsedSeconds = ((endTime - startTime) / 1000).toFixed(2);

            logger.info('GenreAnalyzer', 'Genre analysis complete', {
                primaryGenre: profile.primary_genre,
                genreCount: profile.genres.length,
                analysisTimeSeconds: elapsedSeconds,
            });

            // Update local state
            setGenreProfile(profile);

            // Store results in playlist store
            setStoreGenreProfile(profile);

            return profile;
        } catch (err) {
            handleError(err, 'GenreAnalyzer');
            const classifiedError = classifyError(err, 'audio');
            setError(classifiedError);
            return null;
        } finally {
            setIsAnalyzing(false);
        }
    }, [getAnalyzer, setStoreGenreProfile]);

    /**
     * Update genre analyzer options.
     * Note: Changing options will create a new analyzer instance on next analysis.
     *
     * @param newOptions - Partial or complete options to merge with current options
     */
    const setOptions = useCallback((newOptions: GenreAnalyzerOptions) => {
        setOptionsState((prev) => {
            const merged = { ...prev, ...newOptions };
            logger.debug('GenreAnalyzer', 'Options updated', { old: prev, new: merged });
            // Reset cached analyzer so new options take effect
            analyzerRef.current = null;
            return merged;
        });
    }, []);

    /**
     * Clear the current genre profile and error state.
     */
    const clearProfile = useCallback(() => {
        setGenreProfile(null);
        setError(null);
        setProgress(0);
        lastAnalyzedUrlRef.current = null;
    }, []);

    /**
     * Retry the last analysis (if there was an error).
     * Useful for network errors where retrying might succeed.
     */
    const retry = useCallback(async (): Promise<GenreProfile | null> => {
        if (lastAnalyzedUrlRef.current) {
            return analyzeGenre(lastAnalyzedUrlRef.current);
        }
        return null;
    }, [analyzeGenre]);

    return {
        /** Analyze the genre of an audio track */
        analyzeGenre,
        /** Whether analysis is currently in progress */
        isAnalyzing,
        /** Whether the ML model is being loaded (first-time initialization) */
        isModelLoading,
        /** Analysis progress percentage (0-100) */
        progress,
        /** The last analyzed genre profile */
        genreProfile,
        /** Current genre analyzer options */
        options,
        /** Update genre analyzer options */
        setOptions,
        /** Clear the current genre profile and error state */
        clearProfile,
        /** Retry the last analysis (useful for network errors) */
        retry,
        /** Current error information, if any */
        error,
    };
};
