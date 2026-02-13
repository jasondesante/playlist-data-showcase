import { useState, useCallback } from 'react';
import { CharacterGenerator, AudioProfile, CharacterSheet, GameMode, CharacterGeneratorOptions, PlaylistTrack } from 'playlist-data-engine';
import { useCharacterStore } from '@/store/characterStore';
import { logger } from '@/utils/logger';
import { handleError, AppError } from '@/utils/errorHandling';

/**
 * React hook for generating D&D 5e characters from audio profiles.
 *
 * This hook uses the CharacterGenerator engine module to create deterministic
 * character sheets based on audio characteristics. The same seed and audio profile
 * always produces the same character.
 *
 * @example
 * ```tsx
 * const { generateCharacter, isGenerating } = useCharacterGenerator();
 * const character = await generateCharacter(audioProfile, 'unique-seed-123', 'uncapped', track);
 * console.log(character.name, character.race, character.class);
 * ```
 *
 * @returns {Object} Hook return object
 * @returns {Function} generateCharacter - Generates a character from audio profile, optional seed, optional game mode, and optional track
 * @returns {boolean} isGenerating - Whether character generation is in progress
 */
export const useCharacterGenerator = () => {
    const { addOrUpdateCharacter, clearTrackCharacters } = useCharacterStore();
    const [isGenerating, setIsGenerating] = useState(false);

    /**
     * Generate a character from audio profile
     *
     * @param audioProfile - Audio frequency analysis results
     * @param seed - Optional deterministic seed (defaults to timestamp-based)
     * @param gameMode - Game mode: 'standard' (stats cap at 20) or 'uncapped' (unlimited stats, defaults to 'uncapped')
     * @param track - Optional track for custom name generation via NamingEngine
     * @returns The generated character sheet or null if generation failed
     */
    const generateCharacter = useCallback(async (
        audioProfile: AudioProfile | null | undefined,
        seed?: string,
        gameMode?: GameMode,
        track?: PlaylistTrack
    ): Promise<CharacterSheet | null> => {
        // Validate audio profile before proceeding
        if (!audioProfile) {
            const errorMsg = 'Cannot generate character: Audio profile is required. Please analyze audio first.';
            logger.error('CharacterGenerator', errorMsg);
            handleError(new AppError(errorMsg, 'CharacterGenerator'), 'CharacterGenerator');
            return null;
        }

        // Validate audio profile has required properties
        if (typeof audioProfile.bass_dominance !== 'number' ||
            typeof audioProfile.treble_dominance !== 'number' ||
            typeof audioProfile.mid_dominance !== 'number' ||
            typeof audioProfile.average_amplitude !== 'number') {
            const errorMsg = 'Cannot generate character: Invalid audio profile. Missing required audio analysis data.';
            logger.error('CharacterGenerator', errorMsg, { audioProfile });
            handleError(new AppError(errorMsg, 'CharacterGenerator'), 'CharacterGenerator');
            return null;
        }

        logger.info('CharacterGenerator', 'Generating character', { seed });
        setIsGenerating(true);

        try {
            // Build options object for character generation
            const options: CharacterGeneratorOptions = {
                gameMode: gameMode || 'uncapped'
            };

            // CharacterGenerator now handles name generation internally when track is provided
            // Create a fallback track if none provided (with all required PlaylistTrack properties)
            const trackForGeneration: PlaylistTrack = track || {
                id: seed || `seed-${Date.now()}`,
                uuid: seed || `seed-${Date.now()}`,
                playlist_index: 0,
                chain_name: 'unknown',
                platform: 'unknown',
                title: 'Generated Character',
                artist: 'Unknown',
                image_url: '',
                audio_url: '',
                duration: 0,
                genre: 'unknown',
                tags: []
            };

            const character = CharacterGenerator.generate(
                seed || `seed-${Date.now()}`,
                audioProfile,
                trackForGeneration,
                options
            );

            logger.info('CharacterGenerator', 'Character generated', {
                name: character.name,
                race: character.race,
                class: character.class
            });

            // Enforce "one character per track" by clearing existing characters for this track ID
            if (track) {
                clearTrackCharacters(track.id);
            }

            addOrUpdateCharacter(character);
            return character;
        } catch (error) {
            handleError(error, 'CharacterGenerator');
            return null;
        } finally {
            setIsGenerating(false);
        }
    }, [addOrUpdateCharacter]);

    return { generateCharacter, isGenerating };
};
