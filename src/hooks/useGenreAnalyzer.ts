import { useState, useCallback, useRef } from 'react';
import { GenreAnalyzer, GenreProfile, GenreAnalyzerOptions } from 'playlist-data-engine';
import { logger } from '@/utils/logger';
import { handleError } from '@/utils/errorHandling';
import { usePlaylistStore } from '@/store/playlistStore';

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
    const [error, setError] = useState<string | null>(null);

    // Genre analyzer options for controlling analysis behavior
    const [options, setOptionsState] = useState<GenreAnalyzerOptions>(DEFAULT_GENRE_OPTIONS);

    // Get the store's setGenreProfile action
    const setStoreGenreProfile = usePlaylistStore((state) => state.setGenreProfile);

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
            logger.info('GenreAnalyzer', 'Creating new GenreAnalyzer instance (lazy init)');

            const analyzer = new GenreAnalyzer(options);
            analyzerRef.current = analyzer;

            logger.info('GenreAnalyzer', 'GenreAnalyzer instance created and cached');
            return analyzer;
        } catch (err) {
            handleError(err, 'GenreAnalyzer');
            setError('Failed to initialize genre analyzer');
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
        // Clear previous error
        setError(null);

        const startTime = performance.now();
        logger.info('GenreAnalyzer', 'Starting genre analysis', { url: audioUrl });
        setIsAnalyzing(true);
        setProgress(0);

        try {
            // Get or create analyzer (lazy initialization)
            setProgress(5); // Starting
            const analyzer = await getAnalyzer();

            if (!analyzer) {
                setError('Failed to initialize genre analyzer');
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
            const errorMessage = err instanceof Error ? err.message : 'Genre analysis failed';
            setError(errorMessage);
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
    }, []);

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
        /** Current error message, if any */
        error,
    };
};
