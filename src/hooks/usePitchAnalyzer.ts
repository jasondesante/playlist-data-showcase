import { useState, useCallback, useRef } from 'react';
import { PitchAnalyzer } from 'playlist-data-engine';
import type { PitchAnalyzerConfig, PitchAnalysisProfile } from '@/types';
import type { PitchAlgorithm } from '@/types/rhythmGeneration';
import { logger } from '@/utils/logger';
import { handleError } from '@/utils/errorHandling';
import { usePlaylistStore } from '@/store/playlistStore';

/**
 * Error categories for pitch analysis
 */
export type PitchAnalysisErrorType = 'network' | 'audio_decode' | 'model_load' | 'analysis' | 'unknown';

/**
 * Structured error information for pitch analysis
 */
export interface PitchAnalysisError {
    type: PitchAnalysisErrorType;
    message: string;
    technicalMessage?: string;
}

/**
 * Options for the usePitchAnalyzer hook.
 */
export interface UsePitchAnalyzerOptions {
    /** Pitch detection algorithm to use */
    algorithm?: PitchAlgorithm;
    /** Minimum frequency to detect in Hz */
    minFrequency?: number;
    /** Maximum frequency to detect in Hz */
    maxFrequency?: number;
    /** Whether to include melody contour analysis */
    includeContour?: boolean;
}

/**
 * Default options for pitch analysis.
 */
const DEFAULT_PITCH_OPTIONS: UsePitchAnalyzerOptions = {
    algorithm: 'pitch_melodia',
    minFrequency: 80,
    maxFrequency: 20000,
    includeContour: true,
};

/**
 * Classify an error into a category and provide a user-friendly message.
 */
const classifyPitchError = (error: unknown): PitchAnalysisError => {
    // Handle numeric error codes (common from WASM/Essentia)
    if (typeof error === 'number') {
        return {
            type: 'model_load',
            message: 'Failed to load the pitch detection engine. The WASM module may be missing or corrupted.',
            technicalMessage: `Essentia WASM error code: ${error}`,
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
        return {
            type: 'network',
            message: 'Failed to fetch the audio file. Please check the URL and your internet connection.',
            technicalMessage: errorMessage,
        };
    }

    // Audio decoding errors
    if (
        lowerMessage.includes('decode') ||
        lowerMessage.includes('audio') ||
        lowerMessage.includes('format') ||
        lowerMessage.includes('invalid') ||
        lowerMessage.includes('unsupported') ||
        lowerMessage.includes('codec')
    ) {
        return {
            type: 'audio_decode',
            message: 'Failed to decode the audio file. The format may not be supported.',
            technicalMessage: errorMessage,
        };
    }

    // Model/WASM loading errors
    if (
        lowerMessage.includes('essentia') ||
        lowerMessage.includes('wasm') ||
        lowerMessage.includes('initialize') ||
        lowerMessage.includes('crepe') ||
        lowerMessage.includes('model')
    ) {
        return {
            type: 'model_load',
            message: 'Failed to initialize the pitch detection engine. Please try again.',
            technicalMessage: errorMessage,
        };
    }

    // Analysis-specific errors
    if (
        lowerMessage.includes('pitch') ||
        lowerMessage.includes('analysis') ||
        lowerMessage.includes('detection')
    ) {
        return {
            type: 'analysis',
            message: 'Pitch analysis failed during processing. Please try again.',
            technicalMessage: errorMessage,
        };
    }

    // Unknown error
    return {
        type: 'unknown',
        message: 'Pitch analysis failed. Please try again.',
        technicalMessage: errorMessage,
    };
};

/**
 * Map engine progress phases to UI-friendly percentages.
 *
 * The engine reports (phase, 0-1) where phases are strings like
 * "fetching", "decoding", "detecting", "computing_contour", etc.
 */
const PHASE_WEIGHTS: Record<string, { start: number; end: number }> = {
    fetching:           { start: 0,   end: 20  },
    decoding:           { start: 20,  end: 30  },
    detecting:          { start: 30,  end: 80  },
    computing_contour:  { start: 80,  end: 95  },
    computing_summary:  { start: 95,  end: 100 },
};

function mapProgress(phase: string, progress: number): number {
    const range = PHASE_WEIGHTS[phase];
    if (range) {
        return Math.round(range.start + progress * (range.end - range.start));
    }
    // Unknown phase — interpolate in the 30-80 range (likely detection)
    return Math.round(30 + progress * 50);
}

/**
 * React hook for performing standalone pitch analysis on audio.
 *
 * Uses the PitchAnalyzer engine module (Essentia.js WASM) to detect
 * per-frame pitch and optionally compute melody contour analysis.
 * No beat map is required — works directly on raw audio.
 *
 * @example
 * ```tsx
 * const { analyze, isAnalyzing, progress, error, retry, options, setOptions } = usePitchAnalyzer();
 * const profile = await analyze('https://example.com/audio.mp3');
 * console.log(`Voicing: ${(profile.voicingRatio * 100).toFixed(1)}%`);
 * ```
 *
 * @returns {Object} Hook return object
 * @returns {Function} analyze - Analyze audio from a URL and return a PitchAnalysisProfile
 * @returns {boolean} isAnalyzing - Whether analysis is currently in progress
 * @returns {number} progress - Analysis progress percentage (0-100)
 * @returns {PitchAnalysisError | null} error - Current error information
 * @returns {Function} retry - Retry the last analysis
 * @returns {UsePitchAnalyzerOptions} options - Current analyzer options
 * @returns {Function} setOptions - Update analyzer options
 * @returns {Function} clearProfile - Clear the current error state
 */
export const usePitchAnalyzer = () => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<PitchAnalysisError | null>(null);
    const [options, setOptionsState] = useState<UsePitchAnalyzerOptions>(DEFAULT_PITCH_OPTIONS);

    // Get the store's setPitchAnalysisProfile action
    const setStoreProfile = usePlaylistStore((state) => state.setPitchAnalysisProfile);

    // Store the last analyzed URL and options for retry functionality
    const lastAnalyzedUrlRef = useRef<string | null>(null);
    const lastAnalyzedOptionsRef = useRef<UsePitchAnalyzerOptions | undefined>(undefined);

    /**
     * Analyze the pitch of an audio track.
     *
     * @param audioUrl - URL of the audio file to analyze
     * @param overrideOptions - Optional options to use for this analysis only
     * @returns PitchAnalysisProfile with frame-level pitch data and contour, or null if analysis failed
     */
    const analyze = useCallback(async (audioUrl: string, overrideOptions?: UsePitchAnalyzerOptions): Promise<PitchAnalysisProfile | null> => {
        setError(null);
        lastAnalyzedUrlRef.current = audioUrl;
        lastAnalyzedOptionsRef.current = overrideOptions;

        const startTime = performance.now();
        const optionsToUse = overrideOptions ?? options;

        logger.info('PitchAnalyzer', 'Starting pitch analysis', {
            url: audioUrl,
            algorithm: optionsToUse.algorithm ?? DEFAULT_PITCH_OPTIONS.algorithm,
            includeContour: optionsToUse.includeContour,
        });
        setIsAnalyzing(true);
        setProgress(0);

        try {
            // Build the engine config with progress callback
            const engineConfig: PitchAnalyzerConfig = {
                algorithm: optionsToUse.algorithm,
                minFrequency: optionsToUse.minFrequency,
                maxFrequency: optionsToUse.maxFrequency,
                includeContour: optionsToUse.includeContour,
                onProgress: (phase, phaseProgress) => {
                    setProgress(mapProgress(phase, phaseProgress));
                },
            };

            // Create a fresh PitchAnalyzer for each analysis run
            const analyzer = new PitchAnalyzer(engineConfig);

            // Run the analysis
            const result = await analyzer.analyze(audioUrl);

            setProgress(100);

            const endTime = performance.now();
            const elapsedSeconds = ((endTime - startTime) / 1000).toFixed(2);

            logger.info('PitchAnalyzer', 'Pitch analysis complete', {
                voicingRatio: result.voicingRatio,
                totalFrames: result.totalFrames,
                voicedFrames: result.voicedFrames,
                pitchRange: `${result.lowestNote} - ${result.highestNote}`,
                algorithm: result.analysis_metadata.algorithm_used,
                duration: result.analysis_metadata.duration_analyzed,
                analysisTimeSeconds: elapsedSeconds,
            });

            // Store results in playlist store
            setStoreProfile(result);

            return result;
        } catch (err) {
            handleError(err, 'PitchAnalyzer');
            const classifiedError = classifyPitchError(err);
            setError(classifiedError);
            return null;
        } finally {
            setIsAnalyzing(false);
        }
    }, [options, setStoreProfile]);

    /**
     * Update analyzer options.
     *
     * @param newOptions - Partial or complete options to merge with current options
     */
    const setOptions = useCallback((newOptions: Partial<UsePitchAnalyzerOptions>) => {
        setOptionsState((prev) => {
            const merged = { ...prev, ...newOptions };
            logger.debug('PitchAnalyzer', 'Options updated', { old: prev, new: merged });
            return merged;
        });
    }, []);

    /**
     * Clear the current error state.
     */
    const clearProfile = useCallback(() => {
        setError(null);
        setProgress(0);
        lastAnalyzedUrlRef.current = null;
        lastAnalyzedOptionsRef.current = undefined;
    }, []);

    /**
     * Retry the last analysis (if there was an error).
     */
    const retry = useCallback(async (): Promise<PitchAnalysisProfile | null> => {
        if (lastAnalyzedUrlRef.current) {
            return analyze(lastAnalyzedUrlRef.current, lastAnalyzedOptionsRef.current);
        }
        return null;
    }, [analyze]);

    return {
        /** Analyze the pitch of an audio track */
        analyze,
        /** Whether analysis is currently in progress */
        isAnalyzing,
        /** Analysis progress percentage (0-100) */
        progress,
        /** Current error information, if any */
        error,
        /** Retry the last analysis */
        retry,
        /** Current analyzer options */
        options,
        /** Update analyzer options */
        setOptions,
        /** Clear the current error state */
        clearProfile,
    };
};
