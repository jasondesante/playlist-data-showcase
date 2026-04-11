import { useState, useCallback, useRef } from 'react';
import {
    EnemyGenerator,
    CharacterSheet,
    EnemyGenerationOptions,
    EncounterGenerationOptions,
    EnemyRarity,
    EnemyCategory,
    EnemyArchetype,
    EncounterDifficulty,
    EnemyMixMode,
    AudioProfile,
    StatLevelOverrides
} from 'playlist-data-engine';
import { useAudioAnalyzer } from './useAudioAnalyzer';
import { logger } from '@/utils/logger';
import type { PlaylistTrack } from '@/types';

/**
 * Result of audio-influenced enemy generation
 */
export interface AudioEnemyGenerationResult {
    /** Generated enemy character sheets */
    enemies: CharacterSheet[];
    /** Audio profile used for each enemy (indexed by enemy position) */
    audioProfiles: (AudioProfile | null)[];
    /** Tracks that were analyzed and used */
    tracks: PlaylistTrack[];
    /** Template selection reasoning for each enemy */
    templateReasoning: TemplateReasoning[];
}

/**
 * Explains why a template was selected based on audio profile
 */
export interface TemplateReasoning {
    /** Selected template ID */
    templateId: string;
    /** Template display name */
    templateName: string;
    /** Track that influenced this selection */
    trackTitle: string;
    /** Audio profile summary */
    audioSummary: {
        bass: number;
        mid: number;
        treble: number;
        dominantBand: 'bass' | 'mid' | 'treble' | 'balanced';
    };
    /** Why this template was chosen */
    reason: string;
}

/**
 * Options for audio-influenced enemy generation
 */
export interface AudioEnemyGenerationOptions {
    /** Required - Seed for deterministic generation */
    seed: string;
    /** Required - Number of enemies to generate */
    count: number;
    /** Optional - Base rarity before leader promotion (default: 'common') */
    baseRarity?: EnemyRarity;
    /** Optional - Fine-tune difficulty multiplier (default: 1.0) */
    difficultyMultiplier?: number;
    /** Optional - Filter by category */
    category?: EnemyCategory;
    /** Optional - Filter by archetype */
    archetype?: EnemyArchetype;
    /** Optional - Force specific template for all enemies */
    templateId?: string;
    /** Optional - Enemy mix mode (default: 'uniform') */
    enemyMix?: EnemyMixMode;
    /** Optional - Template IDs for 'custom' mix mode */
    templates?: string[];
    /** Optional - Enable leader promotion for groups > 3 (default: true) */
    enableLeaderPromotion?: boolean;
    /** Optional - Override effective levels for HP, attack, and defense independently */
    statLevels?: StatLevelOverrides;
    /** Optional - Skip audio analysis if profiles already cached */
    skipAnalysis?: boolean;
}

/**
 * Cached audio profile with metadata
 */
interface CachedAudioProfile {
    profile: AudioProfile;
    track: PlaylistTrack;
    timestamp: number;
}

/**
 * React hook for generating enemies influenced by audio analysis.
 *
 * This hook combines audio analysis with enemy generation to create
 * enemies whose templates and stats are influenced by the sonic
 * characteristics of selected tracks.
 *
 * Features:
 * - Analyzes audio for each selected track (or uses cached profiles)
 * - Maps audio characteristics to enemy template weights
 * - Generates enemies with audio-influenced stat distribution
 * - Provides reasoning for template selection decisions
 *
 * Audio -> Template Mapping:
 * - High bass dominance -> Brute templates (Orc, Bear, Demon)
 * - High treble dominance -> Archer templates (Hunter, Goblin Archer, Imp)
 * - High mid dominance -> Support templates (Shaman, Cultist, Quasit)
 * - Balanced audio -> Random selection from all archetypes
 *
 * @example
 * ```tsx
 * const { generateWithAudio, isGenerating, result } = useAudioEnemyGeneration();
 *
 * // Generate 3 enemies influenced by selected tracks
 * const result = await generateWithAudio(
 *   [track1, track2, track3],
 *   { seed: 'audio-encounter', count: 3, baseRarity: 'uncommon' }
 * );
 *
 * console.log(result.enemies); // Generated enemies
 * console.log(result.templateReasoning); // Why each template was chosen
 * ```
 */
export function useAudioEnemyGeneration() {
    const { analyzeTrack } = useAudioAnalyzer();

    // State: Generation loading state
    const [isGenerating, setIsGenerating] = useState(false);

    // State: Last generation result
    const [result, setResult] = useState<AudioEnemyGenerationResult | null>(null);

    // State: Error message if generation failed
    const [error, setError] = useState<string | null>(null);

    // Ref: Cache for analyzed audio profiles
    const profileCacheRef = useRef<Map<string, CachedAudioProfile>>(new Map());

    /**
     * Determine the dominant frequency band from an audio profile
     */
    const getDominantBand = useCallback((profile: AudioProfile): 'bass' | 'mid' | 'treble' | 'balanced' => {
        const { bass_dominance, mid_dominance, treble_dominance } = profile;

        // Calculate average for balanced threshold
        const avg = (bass_dominance + mid_dominance + treble_dominance) / 3;

        // If all bands are within 10% of average, consider it balanced
        const threshold = 0.1;
        if (
            Math.abs(bass_dominance - avg) < threshold &&
            Math.abs(mid_dominance - avg) < threshold &&
            Math.abs(treble_dominance - avg) < threshold
        ) {
            return 'balanced';
        }

        // Find the dominant band
        if (bass_dominance >= mid_dominance && bass_dominance >= treble_dominance) {
            return 'bass';
        } else if (treble_dominance >= mid_dominance && treble_dominance >= bass_dominance) {
            return 'treble';
        } else {
            return 'mid';
        }
    }, []);

    /**
     * Get archetype preference based on audio profile
     * Useful for pre-filtering templates before generation
     * @internal Exported for potential future use
     */
    const _getArchetypePreference = useCallback((profile: AudioProfile): EnemyArchetype => {
        const dominant = getDominantBand(profile);

        switch (dominant) {
            case 'bass':
                return 'brute';
            case 'treble':
                return 'archer';
            case 'mid':
            case 'balanced':
                return 'support';
        }
    }, [getDominantBand]);

    // Public helper for getting archetype preference
    const getArchetypePreference = _getArchetypePreference;

    /**
     * Generate a human-readable reason for template selection
     */
    const generateReasoning = useCallback((
        templateId: string,
        profile: AudioProfile,
        track: PlaylistTrack
    ): TemplateReasoning => {
        const template = EnemyGenerator.getTemplateById(templateId);
        const templateName = template?.name || templateId;
        const dominant = getDominantBand(profile);

        const audioSummary: TemplateReasoning['audioSummary'] = {
            bass: Math.round(profile.bass_dominance * 100) / 100,
            mid: Math.round(profile.mid_dominance * 100) / 100,
            treble: Math.round(profile.treble_dominance * 100) / 100,
            dominantBand: dominant
        };

        // Generate explanation
        let reason: string;
        const archetype = template?.archetype || 'brute';

        if (dominant === 'balanced') {
            reason = `Balanced audio profile (${audioSummary.bass}/${audioSummary.mid}/${audioSummary.treble}) - selected ${templateName} for variety`;
        } else if (dominant === 'bass' && archetype === 'brute') {
            reason = `Bass-heavy track (${audioSummary.bass} bass dominance) favors brute archetype -> ${templateName}`;
        } else if (dominant === 'treble' && archetype === 'archer') {
            reason = `Treble-heavy track (${audioSummary.treble} treble dominance) favors archer archetype -> ${templateName}`;
        } else if (dominant === 'mid' && archetype === 'support') {
            reason = `Mid-range track (${audioSummary.mid} mid dominance) favors support archetype -> ${templateName}`;
        } else {
            reason = `Selected ${templateName} (${archetype}) for ${dominant}-dominant audio (${audioSummary[dominant]})`;
        }

        return {
            templateId,
            templateName,
            trackTitle: track.title,
            audioSummary,
            reason
        };
    }, [getDominantBand]);

    /**
     * Analyze a track's audio and cache the result
     */
    const analyzeAndCacheTrack = useCallback(async (
        track: PlaylistTrack
    ): Promise<AudioProfile | null> => {
        // Check cache first
        const cacheKey = `${track.title}-${track.artist}`;
        const cached = profileCacheRef.current.get(cacheKey);

        // Use cached profile if less than 5 minutes old
        if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
            logger.debug('EnemyGenerator', 'Using cached audio profile', { track: track.title });
            return cached.profile;
        }

        // Check if track has audio URL
        if (!track.audio_url) {
            logger.warn('EnemyGenerator', 'Track has no audio URL', { track: track.title });
            return null;
        }

        const audioUrl = track.audio_url;

        // Analyze the track
        logger.info('EnemyGenerator', 'Analyzing track', { track: track.title });
        const profile = await analyzeTrack(audioUrl);

        if (profile) {
            // Cache the result
            profileCacheRef.current.set(cacheKey, {
                profile,
                track,
                timestamp: Date.now()
            });
        }

        return profile;
    }, [analyzeTrack]);

    /**
     * Generate enemies influenced by audio profiles from selected tracks
     *
     * @param tracks - Array of tracks to use for audio influence
     * @param options - Generation options (seed, count, rarity, etc.)
     * @returns Generation result with enemies and reasoning
     */
    const generateWithAudio = useCallback(async (
        tracks: PlaylistTrack[],
        options: AudioEnemyGenerationOptions
    ): Promise<AudioEnemyGenerationResult> => {
        const {
            seed,
            count,
            baseRarity = 'common',
            difficultyMultiplier = 1.0,
            templateId,
            skipAnalysis = false,
            statLevels
        } = options;

        setIsGenerating(true);
        setError(null);

        logger.info('EnemyGenerator', 'Starting audio-influenced generation', {
            trackCount: tracks.length,
            enemyCount: count,
            seed,
            baseRarity
        });

        try {
            // Step 1: Analyze audio for each track (or use cached)
            const audioProfiles: (AudioProfile | null)[] = [];
            const analyzedTracks: PlaylistTrack[] = [];

            for (let i = 0; i < Math.min(tracks.length, count); i++) {
                const track = tracks[i];
                analyzedTracks.push(track);

                if (skipAnalysis) {
                    // Create a synthetic balanced profile if skipping analysis
                    audioProfiles.push({
                        bass_dominance: 0.33,
                        mid_dominance: 0.33,
                        treble_dominance: 0.33,
                        average_amplitude: 0.5,
                        rms_energy: 0.5,
                        dynamic_range: 0.5,
                        analysis_metadata: {
                            duration_analyzed: 0,
                            sample_positions: [],
                            full_buffer_analyzed: false,
                            analyzed_at: new Date().toISOString()
                        }
                    });
                } else {
                    const profile = await analyzeAndCacheTrack(track);
                    audioProfiles.push(profile);
                }
            }

            // Step 2: Generate enemies with audio influence
            const enemies: CharacterSheet[] = [];
            const templateReasoning: TemplateReasoning[] = [];

            for (let i = 0; i < count; i++) {
                // Get the audio profile for this enemy (cycle through available profiles)
                const profileIndex = i % audioProfiles.length;
                const profile = audioProfiles[profileIndex];
                const track = analyzedTracks[profileIndex];

                // Build generation options with audio influence
                // Note: EnemyGenerationOptions doesn't have category/archetype directly
                // We use audioProfile to influence template selection internally
                const enemyOptions: EnemyGenerationOptions = {
                    seed: `${seed}-${i}`,
                    templateId,
                    rarity: baseRarity,
                    difficultyMultiplier,
                    audioProfile: profile || undefined,
                    track: track,
                    statLevels
                };

                // Generate the enemy
                const enemy = EnemyGenerator.generate(enemyOptions);

                if (enemy) {
                    enemies.push(enemy);

                    // Generate reasoning for this selection
                    if (profile && track) {
                        const reasoning = generateReasoning(
                            enemy.name.toLowerCase().replace(/[^a-z]/g, '-'),
                            profile,
                            track
                        );
                        templateReasoning.push(reasoning);
                    }
                }
            }

            // Note: Leader promotion is handled when using generateEncounter
            // For single enemy generation loop, we don't apply promotion

            const generationResult: AudioEnemyGenerationResult = {
                enemies,
                audioProfiles,
                tracks: analyzedTracks,
                templateReasoning
            };

            logger.info('EnemyGenerator', 'Generation complete', {
                enemyCount: enemies.length,
                tracksUsed: analyzedTracks.length,
                reasoningCount: templateReasoning.length
            });

            setResult(generationResult);
            return generationResult;

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            logger.error('EnemyGenerator', 'Generation failed', err);
            setError(errorMessage);

            // Return empty result on error
            const emptyResult: AudioEnemyGenerationResult = {
                enemies: [],
                audioProfiles: [],
                tracks: [],
                templateReasoning: []
            };
            setResult(emptyResult);
            return emptyResult;

        } finally {
            setIsGenerating(false);
        }
    }, [analyzeAndCacheTrack, generateReasoning]);

    /**
     * Generate a party-balanced encounter with audio influence
     *
     * This generates an encounter balanced for a party, where the selected
     * tracks influence the template selection for each enemy.
     */
    const generateEncounterWithAudio = useCallback(async (
        party: CharacterSheet[],
        tracks: PlaylistTrack[],
        options: Omit<AudioEnemyGenerationOptions, 'count'>
    ): Promise<AudioEnemyGenerationResult> => {
        const {
            seed,
            baseRarity = 'common',
            difficultyMultiplier = 1.0,
            category,
            archetype,
            templateId,
            enemyMix = 'uniform',
            templates,
            enableLeaderPromotion = true,
            skipAnalysis = false,
            statLevels
        } = options;

        setIsGenerating(true);
        setError(null);

        logger.info('EnemyGenerator', 'Starting party-balanced audio encounter', {
            partySize: party.length,
            trackCount: tracks.length,
            seed
        });

        try {
            // Step 1: Analyze audio for each track
            const audioProfiles: (AudioProfile | null)[] = [];
            const analyzedTracks: PlaylistTrack[] = [];

            for (const track of tracks) {
                analyzedTracks.push(track);

                if (skipAnalysis) {
                    audioProfiles.push({
                        bass_dominance: 0.33,
                        mid_dominance: 0.33,
                        treble_dominance: 0.33,
                        average_amplitude: 0.5,
                        rms_energy: 0.5,
                        dynamic_range: 0.5,
                        analysis_metadata: {
                            duration_analyzed: 0,
                            sample_positions: [],
                            full_buffer_analyzed: false,
                            analyzed_at: new Date().toISOString()
                        }
                    });
                } else {
                    const profile = await analyzeAndCacheTrack(track);
                    audioProfiles.push(profile);
                }
            }

            // Step 2: Use the first track's audio profile for the encounter
            // The engine will use this to weight template selection
            const primaryProfile = audioProfiles[0] || undefined;
            const primaryTrack = analyzedTracks[0];

            // Step 3: Build encounter options
            const encounterOptions: EncounterGenerationOptions = {
                seed,
                count: tracks.length,
                baseRarity,
                difficultyMultiplier,
                category,
                archetype,
                templateId,
                enemyMix,
                templates,
                audioProfile: primaryProfile,
                track: primaryTrack,
                enableLeaderPromotion,
                statLevels
            };

            // Step 4: Generate the encounter
            const enemies = EnemyGenerator.generateEncounter(party, encounterOptions);

            // Step 5: Generate reasoning for each enemy
            const templateReasoning: TemplateReasoning[] = enemies.map((enemy, index) => {
                const profileIndex = index % audioProfiles.length;
                const profile = audioProfiles[profileIndex];
                const track = analyzedTracks[profileIndex];

                if (profile && track) {
                    return generateReasoning(
                        enemy.name.toLowerCase().replace(/[^a-z]/g, '-'),
                        profile,
                        track
                    );
                }

                // Fallback reasoning
                return {
                    templateId: enemy.name.toLowerCase(),
                    templateName: enemy.name,
                    trackTitle: track?.title || 'Unknown',
                    audioSummary: {
                        bass: 0.33,
                        mid: 0.33,
                        treble: 0.33,
                        dominantBand: 'balanced' as const
                    },
                    reason: `Generated ${enemy.name} for party-balanced encounter`
                };
            });

            const generationResult: AudioEnemyGenerationResult = {
                enemies,
                audioProfiles,
                tracks: analyzedTracks,
                templateReasoning
            };

            logger.info('EnemyGenerator', 'Party encounter generation complete', {
                enemyCount: enemies.length
            });

            setResult(generationResult);
            return generationResult;

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            logger.error('EnemyGenerator', 'Party encounter generation failed', err);
            setError(errorMessage);

            const emptyResult: AudioEnemyGenerationResult = {
                enemies: [],
                audioProfiles: [],
                tracks: [],
                templateReasoning: []
            };
            setResult(emptyResult);
            return emptyResult;

        } finally {
            setIsGenerating(false);
        }
    }, [analyzeAndCacheTrack, generateReasoning]);

    /**
     * Clear the audio profile cache
     */
    const clearCache = useCallback(() => {
        profileCacheRef.current.clear();
        logger.info('EnemyGenerator', 'Cache cleared');
    }, []);

    /**
     * Reset the hook state
     */
    const reset = useCallback(() => {
        setResult(null);
        setError(null);
        setIsGenerating(false);
    }, []);

    return {
        /** Generate enemies with audio influence */
        generateWithAudio,
        /** Generate party-balanced encounter with audio influence */
        generateEncounterWithAudio,
        /** Whether generation is in progress */
        isGenerating,
        /** Last generation result */
        result,
        /** Error message if generation failed */
        error,
        /** Clear the audio profile cache */
        clearCache,
        /** Reset hook state */
        reset,
        /** Get archetype preference from audio profile (helper) */
        getArchetypePreference
    };
}

// Re-export types for convenience
export type {
    EnemyRarity,
    EnemyCategory,
    EnemyArchetype,
    EncounterDifficulty,
    EnemyMixMode
};
