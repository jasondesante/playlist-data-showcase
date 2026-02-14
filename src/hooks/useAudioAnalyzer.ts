import { useState, useCallback, useEffect } from 'react';
import { AudioAnalyzer, AudioProfile, ColorExtractor, AudioAnalyzerOptions, AudioTimelineEvent, SamplingStrategy } from 'playlist-data-engine';
import { logger } from '@/utils/logger';
import { handleError } from '@/utils/errorHandling';
import { useAppStore } from '@/store/appStore';

/**
 * React hook for analyzing audio tracks using the AudioAnalyzer engine module.
 *
 * Analyzes audio files to extract sonic fingerprints including frequency bands,
 * spectral characteristics, and advanced metrics. The FFT size and frequency
 * multipliers are configurable via audio analyzer options.
 *
 * @example
 * ```tsx
 * const { analyzeTrack, isAnalyzing, progress, audioAnalyzerOptions, setAudioAnalyzerOptions } = useAudioAnalyzer();
 * const profile = await analyzeTrack('https://example.com/audio.mp3');
 * console.log(profile.bass_dominance, profile.mid_dominance, profile.treble_dominance);
 * ```
 *
 * @returns {Object} Hook return object
 * @returns {Function} analyzeTrack - Analyzes audio from a URL and returns an AudioProfile
 * @returns {Function} analyzeTrackWithPalette - Analyzes audio and extracts color palette
 * @returns {boolean} isAnalyzing - Whether analysis is currently in progress
 * @returns {number} progress - Analysis progress percentage (0-100)
 * @returns {AudioAnalyzerOptions} audioAnalyzerOptions - Current audio analyzer options
 * @returns {Function} setAudioAnalyzerOptions - Update audio analyzer options and re-create analyzer
 * @returns {Function} analyzeTimeline - Perform detailed timeline analysis of the entire song
 * @returns {AudioTimelineEvent[]} timelineData - Array of timeline events from last analysis
 * @returns {boolean} isTimelineAnalyzing - Whether timeline analysis is in progress
 */
export const useAudioAnalyzer = () => {
    const { settings } = useAppStore();
    const [analyzer, setAnalyzer] = useState<AudioAnalyzer | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [timelineData, setTimelineData] = useState<AudioTimelineEvent[]>([]);
    const [isTimelineAnalyzing, setIsTimelineAnalyzing] = useState(false);

    // Audio analyzer options for controlling analysis behavior
    const [audioAnalyzerOptions, setAudioAnalyzerOptionsState] = useState<AudioAnalyzerOptions>({
        includeAdvancedMetrics: true,
        trebleBoost: 1.0,
        bassBoost: 1.0,
        midBoost: 1.0,
    });

    // Re-create analyzer when settings or audio analyzer options change
    useEffect(() => {
        try {
            const newAnalyzer = new AudioAnalyzer({
                fftSize: settings.audioFftSize,
                includeAdvancedMetrics: audioAnalyzerOptions.includeAdvancedMetrics,
                trebleBoost: audioAnalyzerOptions.trebleBoost,
                bassBoost: audioAnalyzerOptions.bassBoost,
                midBoost: audioAnalyzerOptions.midBoost,
            });
            setAnalyzer(newAnalyzer);
        } catch (error) {
            handleError(error, 'AudioAnalyzer');
        }
    }, [settings.audioFftSize, audioAnalyzerOptions]);

    // Wrapper to update options and trigger analyzer re-creation
    const setAudioAnalyzerOptions = useCallback((options: AudioAnalyzerOptions) => {
        setAudioAnalyzerOptionsState(options);
    }, []);

    const analyzeTrack = useCallback(async (audioUrl: string): Promise<AudioProfile | null> => {
        if (!analyzer) return null;

        // Performance timing: Start timer
        const startTime = performance.now();
        logger.info('AudioAnalyzer', 'Starting analysis', { url: audioUrl });
        setIsAnalyzing(true);
        setProgress(0);

        try {
            // In a real app, we might need to handle CORS proxying here
            // For now, assume direct access or configured CORS

            // Simulate progress updates (since engine might not expose progress callback directly yet)
            const progressInterval = setInterval(() => {
                setProgress(p => Math.min(p + 10, 90));
            }, 500);

            const profile = await analyzer.extractSonicFingerprint(audioUrl);

            clearInterval(progressInterval);
            setProgress(100);

            // Performance timing: Calculate elapsed time
            const endTime = performance.now();
            const elapsedSeconds = ((endTime - startTime) / 1000).toFixed(2);

            logger.info('AudioAnalyzer', 'Analysis complete', {
                duration: profile.analysis_metadata.duration_analyzed,
                analysisTimeSeconds: elapsedSeconds,
                // Performance target: <10 seconds for 3-minute track
                performanceTarget: elapsedSeconds < '10.00' ? 'PASS' : 'FAIL',
            });

            return profile;
        } catch (error) {
            handleError(error, 'AudioAnalyzer');
            return null;
        } finally {
            setIsAnalyzing(false);
        }
    }, [analyzer]);

    /**
     * Analyze audio track and extract color palette from artwork.
     * Combines audio analysis with color extraction for a complete track profile.
     *
     * @param audioUrl - URL of the audio file to analyze
     * @param imageUrl - URL of the artwork image to extract colors from (optional)
     * @param overrideOptions - Optional AudioAnalyzerOptions to override current settings for this analysis
     * @returns Combined AudioProfile with color_palette included, or null if failed
     */
    const analyzeTrackWithPalette = useCallback(async (
        audioUrl: string,
        imageUrl?: string,
        overrideOptions?: AudioAnalyzerOptions
    ): Promise<AudioProfile | null> => {
        // Use override options if provided, otherwise use existing analyzer
        let analyzerToUse = analyzer;
        if (overrideOptions && !analyzer) {
            // Create a temporary analyzer with override options
            try {
                analyzerToUse = new AudioAnalyzer({
                    fftSize: settings.audioFftSize,
                    includeAdvancedMetrics: overrideOptions.includeAdvancedMetrics,
                    trebleBoost: overrideOptions.trebleBoost,
                    bassBoost: overrideOptions.bassBoost,
                    midBoost: overrideOptions.midBoost,
                });
            } catch (error) {
                handleError(error, 'AudioAnalyzer');
                return null;
            }
        } else if (overrideOptions && analyzer) {
            // Recreate analyzer with new options
            try {
                analyzerToUse = new AudioAnalyzer({
                    fftSize: settings.audioFftSize,
                    includeAdvancedMetrics: overrideOptions.includeAdvancedMetrics,
                    trebleBoost: overrideOptions.trebleBoost,
                    bassBoost: overrideOptions.bassBoost,
                    midBoost: overrideOptions.midBoost,
                });
            } catch (error) {
                handleError(error, 'AudioAnalyzer');
                return null;
            }
        }

        if (!analyzerToUse) return null;

        // Performance timing: Start timer
        const startTime = performance.now();
        logger.info('AudioAnalyzer', 'Starting analysis with color extraction', { url: audioUrl, imageUrl, overrideOptions });
        setIsAnalyzing(true);
        setProgress(0);

        try {
            // Simulate progress updates
            const progressInterval = setInterval(() => {
                setProgress(p => Math.min(p + 10, 90));
            }, 500);

            // Run audio analysis and color extraction in parallel for better performance
            const [audioProfileResult, colorPaletteResult] = await Promise.allSettled([
                analyzerToUse.extractSonicFingerprint(audioUrl),
                imageUrl ? new ColorExtractor().extractPalette(imageUrl) : Promise.resolve(undefined)
            ]);

            clearInterval(progressInterval);
            setProgress(100);

            // Process audio profile result
            let profile: AudioProfile | null = null;
            if (audioProfileResult.status === 'fulfilled') {
                profile = audioProfileResult.value;
            } else {
                logger.error('AudioAnalyzer', 'Audio analysis failed', audioProfileResult.reason);
                handleError(audioProfileResult.reason, 'AudioAnalyzer');
                return null;
            }

            // Process color palette result
            if (profile) {
                if (colorPaletteResult.status === 'fulfilled' && colorPaletteResult.value) {
                    profile.color_palette = colorPaletteResult.value;
                    logger.info('AudioAnalyzer', 'Color palette extracted successfully');
                } else if (colorPaletteResult.status === 'rejected') {
                    logger.warn('AudioAnalyzer', 'Color extraction failed, continuing without palette', colorPaletteResult.reason);
                    // Don't fail the entire operation if color extraction fails
                }
            }

            // Performance timing: Calculate elapsed time
            const endTime = performance.now();
            const elapsedSeconds = ((endTime - startTime) / 1000).toFixed(2);

            if (profile) {
                logger.info('AudioAnalyzer', 'Analysis complete', {
                    duration: profile.analysis_metadata.duration_analyzed,
                    hasColorPalette: !!profile.color_palette,
                    analysisTimeSeconds: elapsedSeconds,
                    performanceTarget: elapsedSeconds < '10.00' ? 'PASS' : 'FAIL',
                });
            }

            return profile;
        } catch (error) {
            handleError(error, 'AudioAnalyzer');
            return null;
        } finally {
            setIsAnalyzing(false);
        }
    }, [analyzer, settings.audioFftSize]);

    /**
     * Perform detailed timeline analysis of the entire song.
     * Returns an array of frequency and amplitude data points over time.
     *
     * @param audioUrl - URL of the audio file to analyze
     * @param strategy - Sampling strategy (interval-based or count-based)
     * @returns Array of AudioTimelineEvent objects, or empty array if failed
     */
    const analyzeTimeline = useCallback(async (
        audioUrl: string,
        strategy: SamplingStrategy
    ): Promise<AudioTimelineEvent[]> => {
        if (!analyzer) return [];

        const startTime = performance.now();
        logger.info('AudioAnalyzer', 'Starting timeline analysis', { url: audioUrl, strategy });
        setIsTimelineAnalyzing(true);
        setTimelineData([]);

        try {
            const events = await analyzer.analyzeTimeline(audioUrl, strategy);

            const endTime = performance.now();
            const elapsedSeconds = ((endTime - startTime) / 1000).toFixed(2);

            logger.info('AudioAnalyzer', 'Timeline analysis complete', {
                eventCount: events.length,
                analysisTimeSeconds: elapsedSeconds,
                strategy,
            });

            setTimelineData(events);
            return events;
        } catch (error) {
            handleError(error, 'AudioAnalyzer');
            return [];
        } finally {
            setIsTimelineAnalyzing(false);
        }
    }, [analyzer]);

    return {
        analyzeTrack,
        analyzeTrackWithPalette,
        isAnalyzing,
        progress,
        audioAnalyzerOptions,
        setAudioAnalyzerOptions,
        analyzeTimeline,
        timelineData,
        isTimelineAnalyzing,
    };
};
