import { useState, useCallback } from 'react';
import { CharacterGenerator, AudioProfile, CharacterSheet, GameMode, CharacterGeneratorOptions } from 'playlist-data-engine';
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
 * const character = await generateCharacter(audioProfile, 'unique-seed-123', 'uncapped');
 * console.log(character.name, character.race, character.class);
 * ```
 *
 * @returns {Object} Hook return object
 * @returns {Function} generateCharacter - Generates a character from audio profile, optional seed, and optional game mode
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
     * @returns The generated character sheet or null if generation failed
     */
    const generateCharacter = useCallback(async (
        audioProfile: AudioProfile | null | undefined,
        seed?: string,
        gameMode?: GameMode
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

            // Use static method directly with options
            const character = CharacterGenerator.generate(
                seed || `seed-${Date.now()}`,
                audioProfile,
                `Hero-${Date.now().toString().slice(-4)}`,
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
