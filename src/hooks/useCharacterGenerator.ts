import { useState, useCallback } from 'react';
import { CharacterGenerator, AudioProfile, CharacterSheet } from 'playlist-data-engine';
import { useCharacterStore } from '@/store/characterStore';
import { logger } from '@/utils/logger';
import { handleError } from '@/utils/errorHandling';

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
 * const character = await generateCharacter(audioProfile, 'unique-seed-123');
 * console.log(character.name, character.race, character.class);
 * ```
 *
 * @returns {Object} Hook return object
 * @returns {Function} generateCharacter - Generates a character from audio profile and optional seed
 * @returns {boolean} isGenerating - Whether character generation is in progress
 */
export const useCharacterGenerator = () => {
    const { addOrUpdateCharacter } = useCharacterStore();
    const [isGenerating, setIsGenerating] = useState(false);

    const generateCharacter = useCallback(async (audioProfile: AudioProfile, seed?: string): Promise<CharacterSheet | null> => {
        logger.info('CharacterGenerator', 'Generating character', { seed });
        setIsGenerating(true);

        try {
            // Use static method directly
            const character = CharacterGenerator.generate(
                seed || `seed-${Date.now()}`,
                audioProfile,
                `Hero-${Date.now().toString().slice(-4)}`
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
