import { useState, useCallback, useEffect } from 'react';
import { AudioAnalyzer, AudioProfile, ColorExtractor } from 'playlist-data-engine';
import { logger } from '@/utils/logger';
import { handleError } from '@/utils/errorHandling';
import { useAppStore } from '@/store/appStore';

/**
 * React hook for analyzing audio tracks using the AudioAnalyzer engine module.
 *
 * Analyzes audio files to extract sonic fingerprints including frequency bands,
 * spectral characteristics, and advanced metrics. The FFT size is configurable
 * via app settings.
 *
 * @example
 * ```tsx
 * const { analyzeTrack, isAnalyzing, progress } = useAudioAnalyzer();
 * const profile = await analyzeTrack('https://example.com/audio.mp3');
 * console.log(profile.bass_dominance, profile.mid_dominance, profile.treble_dominance);
 * ```
 *
 * @returns {Object} Hook return object
 * @returns {Function} analyzeTrack - Analyzes audio from a URL and returns an AudioProfile
 * @returns {boolean} isAnalyzing - Whether analysis is currently in progress
 * @returns {number} progress - Analysis progress percentage (0-100)
 */
export const useAudioAnalyzer = () => {
    const { settings } = useAppStore();
    const [analyzer, setAnalyzer] = useState<AudioAnalyzer | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [progress, setProgress] = useState(0);

    // Re-create analyzer when settings change
    useEffect(() => {
        try {
            const newAnalyzer = new AudioAnalyzer({
                fftSize: settings.audioFftSize,
                // smoothingTimeConstant not supported in options
            });
            setAnalyzer(newAnalyzer);
        } catch (error) {
            handleError(error, 'AudioAnalyzer');
        }
    }, [settings.audioFftSize]);

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
     * @returns Combined AudioProfile with color_palette included, or null if failed
     */
    const analyzeTrackWithPalette = useCallback(async (
        audioUrl: string,
        imageUrl?: string
    ): Promise<AudioProfile | null> => {
        if (!analyzer) return null;

        // Performance timing: Start timer
        const startTime = performance.now();
        logger.info('AudioAnalyzer', 'Starting analysis with color extraction', { url: audioUrl, imageUrl });
        setIsAnalyzing(true);
        setProgress(0);

        try {
            // Simulate progress updates
            const progressInterval = setInterval(() => {
                setProgress(p => Math.min(p + 10, 90));
            }, 500);

            // Run audio analysis and color extraction in parallel for better performance
            const [audioProfileResult, colorPaletteResult] = await Promise.allSettled([
                analyzer.extractSonicFingerprint(audioUrl),
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
    }, [analyzer]);

    return { analyzeTrack, analyzeTrackWithPalette, isAnalyzing, progress };
};
