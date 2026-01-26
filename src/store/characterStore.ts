import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CharacterSheet } from '@/types';
import { storage } from '@/utils/storage';
import { logger } from '@/utils/logger';
import type { StatIncreaseStrategyType } from '@/components/ui/StatStrategySelector';

interface CharacterState {
    /** All generated characters */
    characters: CharacterSheet[];
    /** Seed of the currently active character (uses seed as unique ID) */
    activeCharacterId: string | null;
    /** Map of character seed to stat strategy selection */
    characterStrategies: Record<string, StatIncreaseStrategyType>;

    /** Add a new character to the store and set as active */
    addCharacter: (character: CharacterSheet) => void;
    /** Update an existing character's data (finds by seed) */
    updateCharacter: (character: CharacterSheet) => void;
    /** Add a new character or update existing one (finds by seed) */
    addOrUpdateCharacter: (character: CharacterSheet) => void;
    /** Set the active character by seed ID */
    setActiveCharacter: (id: string) => void;
    /** Delete a character by seed ID */
    deleteCharacter: (id: string) => void;
    /** Get the currently active character object */
    getActiveCharacter: () => CharacterSheet | undefined;
    /** Clear all characters and reset state */
    resetCharacters: () => void;
    /** Get count of pending stat increases for a character by ID (seed) */
    getPendingStatIncreaseCount: (id: string) => number;
    /** Check if character has pending stat increases by ID (seed) */
    hasPendingStatIncreases: (id: string) => boolean;
}

export const useCharacterStore = create<CharacterState>()(
    persist(
        (set, get) => ({
            characters: [],
            activeCharacterId: null,
            characterStrategies: {},

            /**
             * Add a new character to the store and set as active
             * The character's seed is used as the unique identifier
             * @param character - The CharacterSheet to add
             * @example
             * ```ts
             * const character = CharacterGenerator.generate(seed, audioProfile, name);
             * addCharacter(character);
             * ```
             */
            addCharacter: (character) => {
                logger.info('Store', 'Adding character', { name: character.name, class: character.class });
                set((state) => ({
                    characters: [...state.characters, character],
                    activeCharacterId: character.seed // Use seed as unique identifier
                }));
            },

            /**
             * Update an existing character's data (finds by seed)
             * Useful for applying level-ups, XP gains, or stat changes
             * @param updatedCharacter - The CharacterSheet with updated data
             * @example
             * ```ts
             * const result = await updater.updateCharacterFromSession(character, session, track, listenCount);
             * updateCharacter(result.character);
             * ```
             */
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

            /**
             * Add a new character or update existing one (finds by seed)
             * Replaces any existing character with the same seed, or adds as new if seed doesn't exist
             * @param character - The CharacterSheet to add or update
             * @example
             * ```ts
             * const character = CharacterGenerator.generate(seed, audioProfile, name);
             * addOrUpdateCharacter(character); // Adds new or updates existing
             * ```
             */
            addOrUpdateCharacter: (character) => {
                const existing = get().characters.find((c) => c.seed === character.seed);
                if (existing) {
                    logger.info('Store', 'Updating existing character', { name: character.name, class: character.class, seed: character.seed });
                    set((state) => ({
                        characters: state.characters.map((c) =>
                            c.seed === character.seed ? character : c
                        ),
                        activeCharacterId: character.seed
                    }));
                } else {
                    logger.info('Store', 'Adding new character', { name: character.name, class: character.class, seed: character.seed });
                    set((state) => ({
                        characters: [...state.characters, character],
                        activeCharacterId: character.seed
                    }));
                }
            },

            /**
             * Set the active character by seed ID
             * @param id - The seed of the character to set as active
             */
            setActiveCharacter: (id) => {
                logger.debug('Store', 'Set active character', id);
                set({ activeCharacterId: id });
            },

            /**
             * Delete a character by seed ID
             * If the deleted character was active, clears activeCharacterId
             * @param id - The seed of the character to delete
             */
            deleteCharacter: (id) => {
                logger.info('Store', 'Deleting character', id);
                set((state) => ({
                    characters: state.characters.filter((c) => c.seed !== id),
                    activeCharacterId: state.activeCharacterId === id ? null : state.activeCharacterId
                }));
            },

            /**
             * Get the currently active character object
             * @returns The active CharacterSheet or undefined if none set
             * @example
             * ```ts
             * const active = getActiveCharacter();
             * if (active) console.log(active.name);
             * ```
             */
            getActiveCharacter: () => {
                const { characters, activeCharacterId } = get();
                return characters.find((c) => c.seed === activeCharacterId);
            },

            /**
             * Clear all characters and reset state
             * Useful for resetting the app or clearing all data
             */
            resetCharacters: () => {
                logger.warn('Store', 'Resetting all characters');
                set({
                    characters: [],
                    activeCharacterId: null
                });
            },

            /**
             * Get the count of pending stat increases for a character by ID (seed).
             * Pending stat increases are awarded at levels 4, 8, 12, 16, 19 in standard game mode.
             *
             * @param id - The seed (unique ID) of the character
             * @returns Number of pending stat increases (0 if none or character not found)
             * @example
             * ```ts
             * const pendingCount = getPendingStatIncreaseCount('seed-123');
             * if (pendingCount > 0) console.log(`Apply ${pendingCount} stat increases!`);
             * ```
             */
            getPendingStatIncreaseCount: (id: string) => {
                const character = get().characters.find((c) => c.seed === id);
                return character?.pendingStatIncreases ?? 0;
            },

            /**
             * Check if a character has pending stat increases by ID (seed).
             *
             * @param id - The seed (unique ID) of the character
             * @returns true if character exists and has pending stat increases > 0
             * @example
             * ```ts
             * if (hasPendingStatIncreases('seed-123')) {
             *     showStatSelectionModal();
             * }
             * ```
             */
            hasPendingStatIncreases: (id: string) => {
                const character = get().characters.find((c) => c.seed === id);
                return (character?.pendingStatIncreases ?? 0) > 0;
            }
        }),
        {
            name: 'character-storage',
            storage: createJSONStorage(() => storage),
        }
    )
);
