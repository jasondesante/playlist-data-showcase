import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CharacterSheet } from '@/types';
import { storage } from '@/utils/storage';
import { logger } from '@/utils/logger';

interface CharacterState {
    characters: CharacterSheet[];
    activeCharacterId: string | null;

    addCharacter: (character: CharacterSheet) => void;
    updateCharacter: (character: CharacterSheet) => void;
    setActiveCharacter: (id: string) => void;
    deleteCharacter: (id: string) => void;
    getActiveCharacter: () => CharacterSheet | undefined;
}

export const useCharacterStore = create<CharacterState>()(
    persist(
        (set, get) => ({
            characters: [],
            activeCharacterId: null,

            addCharacter: (character) => {
                logger.info('Store', 'Adding character', { name: character.name, class: character.class });
                set((state) => ({
                    characters: [...state.characters, character],
                    activeCharacterId: character.seed // Use seed as unique identifier
                }));
            },

            updateCharacter: (updatedCharacter) => {
                logger.info('Store', 'Updating character', {
                    seed: updatedCharacter.seed,
                    level: updatedCharacter.level,
                    currentXP: updatedCharacter.xp.current,
                    nextLevelXP: updatedCharacter.xp.next_level
                });
                set((state) => ({
                    characters: state.characters.map((c) =>
                        c.seed === updatedCharacter.seed ? updatedCharacter : c
                    )
                }));
            },

            setActiveCharacter: (id) => {
                logger.debug('Store', 'Set active character', id);
                set({ activeCharacterId: id });
            },

            deleteCharacter: (id) => {
                logger.info('Store', 'Deleting character', id);
                set((state) => ({
                    characters: state.characters.filter((c) => c.seed !== id),
                    activeCharacterId: state.activeCharacterId === id ? null : state.activeCharacterId
                }));
            },

            getActiveCharacter: () => {
                const { characters, activeCharacterId } = get();
                return characters.find((c) => c.seed === activeCharacterId);
            }
        }),
        {
            name: 'character-storage',
            storage: createJSONStorage(() => storage),
        }
    )
);
