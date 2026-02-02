import { useState, useCallback } from 'react';
import { CharacterGenerator, AudioProfile, CharacterSheet, GameMode, CharacterGeneratorOptions, NamingEngine, PlaylistTrack } from 'playlist-data-engine';
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
    const { addOrUpdateCharacter } = useCharacterStore();
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

            // Generate custom name using NamingEngine if track is provided
            let characterName: string;
            if (track) {
                const namingEngine = new NamingEngine();
                characterName = namingEngine.generateName(track, audioProfile);
                logger.info('CharacterGenerator', 'Generated custom name using NamingEngine', { characterName });
            } else {
                // Fallback to simple Hero-{seed} format if no track provided
                const nameSuffix = (seed || `seed-${Date.now()}`).slice(-4);
                characterName = `Hero-${nameSuffix}`;
            }

            const character = CharacterGenerator.generate(
                seed || `seed-${Date.now()}`,
                audioProfile,
                characterName,
                options
            );

            logger.info('CharacterGenerator', 'Character generated', {
                name: character.name,
                race: character.race,
                class: character.class
            });

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
