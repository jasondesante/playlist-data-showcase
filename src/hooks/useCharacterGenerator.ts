import { useState, useCallback } from 'react';
import { CharacterGenerator, AudioProfile, CharacterSheet } from 'playlist-data-engine';
import { useCharacterStore } from '@/store/characterStore';
import { logger } from '@/utils/logger';
import { handleError } from '@/utils/errorHandling';

export const useCharacterGenerator = () => {
    const { addCharacter } = useCharacterStore();
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

            addCharacter(character);
            return character;
        } catch (error) {
            handleError(error, 'CharacterGenerator');
            return null;
        } finally {
            setIsGenerating(false);
        }
    }, [addCharacter]);

    return { generateCharacter, isGenerating };
};
