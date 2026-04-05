import type { PitchAlgorithm } from '../types/rhythmGeneration';

/**
 * Human-readable label for each pitch algorithm value.
 * Covers all algorithms in the PitchAlgorithm union type.
 */
export const PITCH_ALGORITHM_LABELS: Record<PitchAlgorithm, string> = {
    pyin_legacy: 'pYIN (Legacy)',
    pitch_melodia: 'Pitch Melodia',
    predominant_melodia: 'Predominant Melodia',
    pitch_yin_probabilistic: 'Pitch YIN (Probabilistic)',
    multipitch_melodia: 'MultiPitch Melodia',
    multipitch_klapuri: 'MultiPitch Klapuri',
    pitch_crepe: 'CREPE (Neural Net)',
};

/**
 * Algorithms excluded from the standalone pitch analysis UI.
 * Multi-pitch algorithms are not appropriate for monophonic standalone analysis.
 */
export const STANDALONE_PITCH_EXCLUDED: readonly PitchAlgorithm[] = [
    'multipitch_klapuri',
] as const;

/**
 * Default max frequency per algorithm for standalone pitch analysis.
 * pYIN has a lower default since it's designed for monophonic vocal/instrument detection.
 */
export const PITCH_ALGORITHM_DEFAULT_MAX_FREQ: Partial<Record<PitchAlgorithm, number>> = {
    pyin_legacy: 1000,
    pitch_melodia: 20000,
    predominant_melodia: 20000,
    pitch_yin_probabilistic: 20000,
    multipitch_melodia: 20000,
    pitch_crepe: 20000,
};
