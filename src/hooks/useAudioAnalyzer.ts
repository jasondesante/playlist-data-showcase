import { useState, useCallback, useEffect } from 'react';
import { AudioAnalyzer, AudioProfile } from 'playlist-data-engine';
import { logger } from '@/utils/logger';
import { handleError } from '@/utils/errorHandling';
import { useAppStore } from '@/store/appStore';

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

            logger.info('AudioAnalyzer', 'Analysis complete', {
                duration: profile.analysis_metadata.duration_analyzed,
                // Features not directly available in profile root
            });

            return profile;
        } catch (error) {
            handleError(error, 'AudioAnalyzer');
            return null;
        } finally {
            setIsAnalyzing(false);
        }
    }, [analyzer]);

    return { analyzeTrack, isAnalyzing, progress };
};
