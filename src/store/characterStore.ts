import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CharacterSheet, AudioProfile, PlaylistTrack } from '@/types';
import type { PrestigeLevel, PrestigeInfo, PrestigeResult } from '@/types';
import { storage } from '@/utils/storage';
import { logger } from '@/utils/logger';
import type { StatIncreaseStrategyType } from '@/components/ui/StatStrategySelector';
import { CharacterGenerator, PrestigeSystem } from 'playlist-data-engine';

// Internal state for track restoration retry logic (module-scoped, not persisted)
let restorationState: RestorationState = {
    needsRetry: false,
    attemptTime: 0,
    retryCount: 0
};

// Constants for retry logic
const RESTORATION_TIMEOUT_MS = 10000; // 10 seconds max to wait for playlist
const RESTORATION_RETRY_INTERVAL_MS = 500; // Check every 500ms
const MAX_RETRIES = RESTORATION_TIMEOUT_MS / RESTORATION_RETRY_INTERVAL_MS;

/**
 * Asynchronously attempt to restore the selected track from the active character.
 * This uses dynamic import to properly handle module loading.
 */
async function attemptTrackRestorationAsync(activeCharacterId: string, characters: CharacterSheet[]): Promise<{ success: boolean; stopRetrying: boolean }> {
    // Find the active character
    const activeCharacter = characters.find((c) => c.seed === activeCharacterId);
    if (!activeCharacter) {
        logger.warn('Store', 'Active character not found in characters list', { activeCharacterId });
        return { success: false, stopRetrying: true };
    }

    try {
        const { usePlaylistStore } = await import('@/store/playlistStore');
        const playlist = usePlaylistStore.getState().currentPlaylist;

        if (!playlist) {
            logger.debug('Store', 'No playlist loaded yet, restoration will retry');
            return { success: false, stopRetrying: false };
        }

        // Find track matching character seed (track.id === character.seed)
        const matchingTrack = playlist.tracks.find((t) => t.id === activeCharacter.seed);

        if (matchingTrack) {
            logger.info('Store', 'Successfully restored selectedTrack from activeCharacterId', {
                characterSeed: activeCharacter.seed,
                characterName: activeCharacter.name,
                trackId: matchingTrack.id,
                trackTitle: matchingTrack.title,
                trackUrl: matchingTrack.audio_url,
                retryCount: restorationState.retryCount
            });
            usePlaylistStore.getState().selectTrack(matchingTrack);

            // Verify selectedTrack was set correctly
            const verifyTrack = usePlaylistStore.getState().selectedTrack;
            logger.info('Store', 'Verification: selectedTrack after restoration', {
                isSelectedTrackSet: !!verifyTrack,
                selectedTrackId: verifyTrack?.id,
                selectedTrackTitle: verifyTrack?.title,
                matchesRestored: verifyTrack?.id === matchingTrack.id
            });

            // Clear restoration state on success
            restorationState = { needsRetry: false, attemptTime: 0, retryCount: 0 };
            return { success: true, stopRetrying: true };
        } else {
            logger.warn('Store', 'Track not found in current playlist for active character', {
                characterSeed: activeCharacter.seed,
                characterName: activeCharacter.name,
                playlistName: playlist.name
            });
            // Track not found - no point retrying
            restorationState = { needsRetry: false, attemptTime: 0, retryCount: 0 };
            return { success: false, stopRetrying: true };
        }
    } catch (error) {
        logger.error('Store', 'Error during track restoration', error);
        return { success: false, stopRetrying: false };
    }
}

/**
 * Setup a listener for playlist loading events.
 * Uses a callback-based approach that will be notified when the playlist is loaded
 * (either via setPlaylist or via zustand rehydration from localStorage).
 */
function setupPlaylistListener(activeCharacterId: string, characters: CharacterSheet[]) {
    // Use a polling fallback approach to check for playlist availability
    // This is a safety net in case the callback doesn't fire
    const checkInterval = setInterval(async () => {
        // Check timeout
        const elapsed = Date.now() - restorationState.attemptTime;
        if (elapsed > RESTORATION_TIMEOUT_MS) {
            logger.warn('Store', 'Track restoration timeout - playlist not loaded within timeout period');
            clearInterval(checkInterval);
            restorationState = { needsRetry: false, attemptTime: 0, retryCount: 0 };
            return;
        }

        // Check max retries
        if (restorationState.retryCount >= MAX_RETRIES) {
            logger.warn('Store', 'Track restoration max retries reached');
            clearInterval(checkInterval);
            restorationState = { needsRetry: false, attemptTime: 0, retryCount: 0 };
            return;
        }

        restorationState.retryCount++;

        // Try to restore asynchronously (handles dynamic imports properly)
        const result = await attemptTrackRestorationAsync(activeCharacterId, characters);
        if (result.stopRetrying) {
            clearInterval(checkInterval);
        }
    }, RESTORATION_RETRY_INTERVAL_MS);

    // Also subscribe to playlist load events for immediate response
    // This handles the case where playlist is set or rehydrated after we start listening
    import('@/store/playlistStore').then(({ onPlaylistLoad }) => {
        const unsubscribe = onPlaylistLoad(async (playlist) => {
            logger.info('Store', 'Playlist load callback triggered', {
                hasRestorationState: restorationState.needsRetry,
                hasPlaylist: !!playlist,
                playlistName: playlist?.name,
                trackCount: playlist?.tracks.length,
                activeCharacterId
            });

            if (!restorationState.needsRetry) {
                // Restoration already completed or abandoned, unsubscribe
                logger.info('Store', 'Playlist load callback: No restoration needed, unsubscribing');
                unsubscribe();
                clearInterval(checkInterval);
                return;
            }

            if (playlist) {
                logger.info('Store', 'Playlist load event received, attempting track restoration', {
                    activeCharacterId,
                    playlistName: playlist.name
                });
                // Try to restore with the newly loaded playlist
                const result = await attemptTrackRestorationAsync(activeCharacterId, characters);
                logger.info('Store', 'Playlist load event: Restoration result', {
                    success: result.success,
                    stopRetrying: result.stopRetrying
                });
                if (result.stopRetrying) {
                    // Success or permanent failure - clean up
                    unsubscribe();
                    clearInterval(checkInterval);
                }
            }
        });

        // Store unsubscribe function on the interval for cleanup
        (checkInterval as unknown as { _unsubscribe?: () => void })._unsubscribe = unsubscribe;
    }).catch((error) => {
        logger.error('Store', 'Failed to subscribe to playlist load events', error);
        // Continue with polling as fallback
    });
}

// Internal state for track restoration retry logic
interface RestorationState {
    /** Whether restoration has been attempted but failed due to missing playlist */
    needsRetry: boolean;
    /** Timestamp when restoration was first attempted */
    attemptTime: number;
    /** Number of retry attempts made */
    retryCount: number;
}

interface CharacterState {
    /** All generated characters */
    characters: CharacterSheet[];
    /** Seed of the currently active character (uses seed as unique ID) */
    activeCharacterId: string | null;
    /** Map of character seed to stat strategy selection */
    characterStrategies: Record<string, StatIncreaseStrategyType>;
    /** Seeds of heroes selected for party analysis (subset of characters) */
    selectedHeroSeeds: string[];

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
    /** Delete all characters associated with a track ID (exact match or spiced variations) */
    clearTrackCharacters: (trackId: string) => void;
    /** Clear all characters and reset state */
    resetCharacters: () => void;
    /** Get count of pending stat increases for a character by ID (seed) */
    getPendingStatIncreaseCount: (id: string) => number;
    /** Check if character has pending stat increases by ID (seed) */
    hasPendingStatIncreases: (id: string) => boolean;
    /** Set the stat strategy for a character by seed */
    setCharacterStrategy: (seed: string, strategy: StatIncreaseStrategyType) => void;
    /** Get the stat strategy for a character by seed */
    getCharacterStrategy: (seed: string) => StatIncreaseStrategyType | undefined;
    /**
     * Restore selectedTrack from activeCharacterId
     * Called on app mount to ensure hero-track synchronization after page reload
     * Finds the track in the current playlist that matches the active character's seed
     * Includes retry logic for cases where playlist hasn't loaded yet
     */
    restoreSelectedTrackFromActiveCharacter: () => void;
    /**
     * Clear the restoration retry state
     * Call this after successful restoration or when giving up
     */
    clearRestorationState: () => void;
    /** Toggle selection for a single hero by seed */
    toggleHeroSelection: (seed: string) => void;
    /** Select all heroes (all characters become selected) */
    selectAllHeroes: () => void;
    /** Deselect all heroes (no characters selected) */
    deselectAllHeroes: () => void;
    /** Check if a hero is selected */
    isHeroSelected: (seed: string) => boolean;
    /** Get count of selected heroes */
    getSelectedHeroCount: () => number;
    /**
     * Prestige a character after mastering a track.
     * Resets character to level 1 while preserving equipment and incrementing prestige level.
     * @param characterId - The seed of the character to prestige
     * @param audioProfile - Audio profile for character regeneration
     * @param track - Track metadata for character regeneration
     * @param clearTrackSessions - Callback to clear track sessions (from sessionStore)
     * @returns PrestigeResult indicating success/failure
     */
    prestigeCharacter: (
        characterId: string,
        audioProfile: AudioProfile,
        track: PlaylistTrack,
        clearTrackSessions: (trackUuid: string) => number
    ) => PrestigeResult;
    /**
     * Check if a character can prestige.
     * @param characterId - The seed of the character to check
     * @param getTrackListenCount - Callback to get track listen count
     * @param getTrackXPTotal - Callback to get track XP total
     * @returns True if the character can prestige
     */
    canPrestige: (
        characterId: string,
        getTrackListenCount: (trackUuid: string) => number,
        getTrackXPTotal: (trackUuid: string) => number
    ) => boolean;
    /**
     * Get prestige info for a character.
     * @param characterId - The seed of the character
     * @param getTrackListenCount - Callback to get track listen count
     * @param getTrackXPTotal - Callback to get track XP total
     * @returns PrestigeInfo object with current progress
     */
    getPrestigeInfo: (
        characterId: string,
        getTrackListenCount: (trackUuid: string) => number,
        getTrackXPTotal: (trackUuid: string) => number
    ) => PrestigeInfo | null;
}

export const useCharacterStore = create<CharacterState>()(
    persist(
        (set, get) => ({
            characters: [],
            activeCharacterId: null,
            characterStrategies: {},
            selectedHeroSeeds: [],

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
                    activeCharacterId: character.seed, // Use seed as unique identifier
                    selectedHeroSeeds: [...state.selectedHeroSeeds, character.seed] // Auto-select new character
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
                logger.debug('Store', 'Updating character', {
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
             * Also clears the stat strategy for this character (resets to default on generation)
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
                    logger.info('Store', 'Updating existing character (resetting strategy)', { name: character.name, class: character.class, seed: character.seed });
                    set((state) => {
                        // Clear the strategy for this character on regeneration
                        const { [character.seed]: _removed, ...remainingStrategies } = state.characterStrategies;
                        return {
                            characters: state.characters.map((c) =>
                                c.seed === character.seed ? character : c
                            ),
                            activeCharacterId: character.seed,
                            characterStrategies: remainingStrategies
                            // Don't change selectedHeroSeeds - character already exists and keeps its selection state
                        };
                    });
                } else {
                    logger.info('Store', 'Adding new character', { name: character.name, class: character.class, seed: character.seed });
                    set((state) => {
                        // Clear any stale strategy for this seed (shouldn't exist, but just in case)
                        const { [character.seed]: _removed, ...remainingStrategies } = state.characterStrategies;
                        return {
                            characters: [...state.characters, character],
                            activeCharacterId: character.seed,
                            characterStrategies: remainingStrategies,
                            selectedHeroSeeds: [...state.selectedHeroSeeds, character.seed] // Auto-select new character
                        };
                    });
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
             * Also cleans up the character's stat strategy preference
             * @param id - The seed of the character to delete
             */
            deleteCharacter: (id) => {
                logger.info('Store', 'Deleting character', id);
                set((state) => {
                    // Clean up the strategy for the deleted character
                    const { [id]: _removed, ...remainingStrategies } = state.characterStrategies;
                    return {
                        characters: state.characters.filter((c) => c.seed !== id),
                        activeCharacterId: state.activeCharacterId === id ? null : state.activeCharacterId,
                        characterStrategies: remainingStrategies,
                        selectedHeroSeeds: state.selectedHeroSeeds.filter(s => s !== id) // Remove from selection
                    };
                });
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
             * Delete all characters associated with a track ID (exact match or spiced variations)
             * This ensures that "one character per song" is enforced atomically.
             */
            clearTrackCharacters: (trackId) => {
                if (!trackId) return;
                logger.info('Store', 'Clearing all characters for track', trackId);
                set((state) => {
                    const affectedSeeds = state.characters
                        .filter(c => c.seed === trackId || c.seed.startsWith(`${trackId}-`))
                        .map(c => c.seed);

                    if (affectedSeeds.length === 0) return state;

                    // Clean up strategies for all affected seeds
                    const remainingStrategies = { ...state.characterStrategies };
                    affectedSeeds.forEach(seed => {
                        delete remainingStrategies[seed];
                    });

                    return {
                        characters: state.characters.filter(c => !affectedSeeds.includes(c.seed)),
                        activeCharacterId: affectedSeeds.includes(state.activeCharacterId || '')
                            ? null
                            : state.activeCharacterId,
                        characterStrategies: remainingStrategies,
                        selectedHeroSeeds: state.selectedHeroSeeds.filter(s => !affectedSeeds.includes(s)) // Remove from selection
                    };
                });
            },

            /**
             * Clear all characters and reset state
             * Useful for resetting the app or clearing all data
             * Also clears all saved stat strategy preferences
             */
            resetCharacters: () => {
                logger.warn('Store', 'Resetting all characters');
                set({
                    characters: [],
                    activeCharacterId: null,
                    characterStrategies: {},
                    selectedHeroSeeds: [] // Clear selection when characters are cleared
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
            },

            /**
             * Set the stat strategy for a character by seed.
             * Persists to localStorage via zustand persist middleware.
             *
             * @param seed - The seed (unique ID) of the character
             * @param strategy - The stat increase strategy to set
             * @example
             * ```ts
             * setCharacterStrategy('seed-123', 'dnD5e');
             * ```
             */
            setCharacterStrategy: (seed: string, strategy: StatIncreaseStrategyType) => {
                logger.debug('Store', 'Setting character strategy', { seed, strategy });
                set((state) => ({
                    characterStrategies: {
                        ...state.characterStrategies,
                        [seed]: strategy
                    }
                }));
            },

            /**
             * Get the stat strategy for a character by seed.
             *
             * @param seed - The seed (unique ID) of the character
             * @returns The stat strategy or undefined if not set
             * @example
             * ```ts
             * const strategy = getCharacterStrategy('seed-123') ?? 'dnD5e_smart';
             * ```
             */
            getCharacterStrategy: (seed: string) => {
                return get().characterStrategies[seed];
            },

            /**
             * Restore selectedTrack from activeCharacterId
             * Called on app mount to ensure hero-track synchronization after page reload
             * Finds the track in the current playlist that matches the active character's seed
             *
             * This avoids persisting selectedTrack (which causes race conditions with session tracking)
             * while still maintaining user experience across page reloads.
             *
             * Includes retry logic to handle cases where the playlist hasn't loaded yet.
             * If the playlist is not available, it will poll for up to 10 seconds with 500ms intervals.
             *
             * @example
             * ```ts
             * // In App.tsx on mount
             * useCharacterStore.getState().restoreSelectedTrackFromActiveCharacter();
             * ```
             */
            restoreSelectedTrackFromActiveCharacter: () => {
                const { activeCharacterId, characters } = get();

                if (!activeCharacterId) {
                    logger.debug('Store', 'No active character to restore track from');
                    return;
                }

                // Find the active character
                const activeCharacter = characters.find((c) => c.seed === activeCharacterId);
                if (!activeCharacter) {
                    logger.warn('Store', 'Active character not found in characters list', { activeCharacterId });
                    return;
                }

                // Check if we already have a restoration in progress
                if (restorationState.needsRetry) {
                    logger.debug('Store', 'Restoration already in progress, skipping duplicate call');
                    return;
                }

                // Initialize restoration state
                restorationState = {
                    needsRetry: true,
                    attemptTime: Date.now(),
                    retryCount: 0
                };

                // Try immediate restoration first (async)
                attemptTrackRestorationAsync(activeCharacterId, characters).then((result) => {
                    // If immediate restoration failed (likely playlist not loaded), setup retry listener
                    if (!result.stopRetrying) {
                        logger.info('Store', 'Playlist not loaded yet, setting up retry listener for track restoration');
                        setupPlaylistListener(activeCharacterId, characters);
                    }
                }).catch((error) => {
                    logger.error('Store', 'Error during immediate track restoration attempt', error);
                    // Setup retry listener even on error
                    setupPlaylistListener(activeCharacterId, characters);
                });
            },

            /**
             * Clear the restoration retry state.
             * This can be called manually if needed to cancel pending restoration attempts.
             *
             * @example
             * ```ts
             * // Cancel any pending restoration attempts
             * useCharacterStore.getState().clearRestorationState();
             * ```
             */
            clearRestorationState: () => {
                restorationState = { needsRetry: false, attemptTime: 0, retryCount: 0 };
                logger.debug('Store', 'Restoration state cleared');
            },

            /**
             * Toggle selection for a single hero by seed.
             * Part of party analysis feature - allows selecting which heroes to include in analysis.
             *
             * @param seed - The seed (unique ID) of the character to toggle
             * @example
             * ```ts
             * toggleHeroSelection('seed-123'); // Toggles selection state
             * ```
             */
            toggleHeroSelection: (seed) => {
                set((state) => {
                    const isSelected = state.selectedHeroSeeds.includes(seed);
                    return {
                        selectedHeroSeeds: isSelected
                            ? state.selectedHeroSeeds.filter(s => s !== seed)
                            : [...state.selectedHeroSeeds, seed]
                    };
                });
            },

            /**
             * Select all heroes for party analysis.
             * Sets selectedHeroSeeds to include all character seeds.
             */
            selectAllHeroes: () => {
                set((state) => ({
                    selectedHeroSeeds: state.characters.map(c => c.seed)
                }));
            },

            /**
             * Deselect all heroes for party analysis.
             * Clears selectedHeroSeeds to an empty array.
             */
            deselectAllHeroes: () => {
                set({ selectedHeroSeeds: [] });
            },

            /**
             * Check if a hero is selected for party analysis.
             *
             * @param seed - The seed (unique ID) of the character
             * @returns true if the hero is selected
             */
            isHeroSelected: (seed) => {
                return get().selectedHeroSeeds.includes(seed);
            },

            /**
             * Get the count of selected heroes for party analysis.
             *
             * @returns Number of selected heroes
             */
            getSelectedHeroCount: () => {
                return get().selectedHeroSeeds.length;
            },

            /**
             * Prestige a character after mastering a track.
             * Resets character to level 1 while preserving equipment and incrementing prestige level.
             *
             * @param characterId - The seed of the character to prestige
             * @param audioProfile - Audio profile for character regeneration
             * @param track - Track metadata for character regeneration
             * @param clearTrackSessions - Callback to clear track sessions (from sessionStore)
             * @returns PrestigeResult indicating success/failure
             *
             * @example
             * ```ts
             * const result = prestigeCharacter(
             *   character.seed,
             *   audioProfile,
             *   track,
             *   useSessionStore.getState().clearTrackSessions
             * );
             * if (result.success) {
             *   console.log(`Prestiged to level ${PrestigeSystem.toRomanNumeral(result.newPrestigeLevel)}!`);
             * }
             * ```
             */
            prestigeCharacter: (
                characterId: string,
                audioProfile: AudioProfile,
                track: PlaylistTrack,
                clearTrackSessions: (trackUuid: string) => number
            ): PrestigeResult => {
                const character = get().characters.find((c) => c.seed === characterId);
                if (!character) {
                    return PrestigeSystem.createFailureResult(
                        'Character not found',
                        0
                    );
                }

                const currentPrestigeLevel: PrestigeLevel = character.prestige_level ?? 0;

                // Check if already at max prestige
                if (currentPrestigeLevel >= 10) {
                    return PrestigeSystem.createFailureResult(
                        'Already at maximum prestige level',
                        currentPrestigeLevel
                    );
                }

                // Get next prestige level
                const newPrestigeLevel = PrestigeSystem.getNextPrestigeLevel(currentPrestigeLevel);
                if (newPrestigeLevel === null) {
                    return PrestigeSystem.createFailureResult(
                        'Cannot prestige beyond maximum level',
                        currentPrestigeLevel
                    );
                }

                // Preserve equipment
                const preservedEquipment = character.equipment ? {
                    weapons: [...character.equipment.weapons],
                    armor: [...character.equipment.armor],
                    items: [...character.equipment.items],
                    totalWeight: character.equipment.totalWeight,
                    equippedWeight: character.equipment.equippedWeight,
                } : null;

                // Clear track sessions
                clearTrackSessions(character.seed);

                // Regenerate character using original seed
                const regeneratedCharacter = CharacterGenerator.generate(
                    character.seed,
                    audioProfile,
                    track,
                    {
                        level: 1,
                        gameMode: character.gameMode,
                        forceName: character.name, // Keep the same name
                    }
                );

                // Restore equipment
                if (preservedEquipment) {
                    regeneratedCharacter.equipment = preservedEquipment;
                }

                // Set new prestige level
                regeneratedCharacter.prestige_level = newPrestigeLevel;

                // Update the store
                set((state) => ({
                    characters: state.characters.map((c) =>
                        c.seed === characterId ? regeneratedCharacter : c
                    )
                }));

                logger.info('Store', 'Character prestiged', {
                    characterName: character.name,
                    previousLevel: currentPrestigeLevel,
                    newLevel: newPrestigeLevel,
                    romanNumeral: PrestigeSystem.toRomanNumeral(newPrestigeLevel)
                });

                return PrestigeSystem.createSuccessResult(currentPrestigeLevel, newPrestigeLevel);
            },

            /**
             * Check if a character can prestige.
             *
             * @param characterId - The seed of the character to check
             * @param getTrackListenCount - Callback to get track listen count
             * @param getTrackXPTotal - Callback to get track XP total
             * @returns True if the character can prestige
             */
            canPrestige: (
                characterId: string,
                getTrackListenCount: (trackUuid: string) => number,
                getTrackXPTotal: (trackUuid: string) => number
            ): boolean => {
                const character = get().characters.find((c) => c.seed === characterId);
                if (!character) return false;

                const prestigeLevel: PrestigeLevel = character.prestige_level ?? 0;
                const listenCount = getTrackListenCount(characterId);
                const totalXP = getTrackXPTotal(characterId);

                return PrestigeSystem.canPrestige(prestigeLevel, listenCount, totalXP);
            },

            /**
             * Get prestige info for a character.
             *
             * @param characterId - The seed of the character
             * @param getTrackListenCount - Callback to get track listen count
             * @param getTrackXPTotal - Callback to get track XP total
             * @returns PrestigeInfo object with current progress, or null if character not found
             */
            getPrestigeInfo: (
                characterId: string,
                getTrackListenCount: (trackUuid: string) => number,
                getTrackXPTotal: (trackUuid: string) => number
            ): PrestigeInfo | null => {
                const character = get().characters.find((c) => c.seed === characterId);
                if (!character) return null;

                const prestigeLevel: PrestigeLevel = character.prestige_level ?? 0;
                const listenCount = getTrackListenCount(characterId);
                const totalXP = getTrackXPTotal(characterId);

                return PrestigeSystem.getPrestigeInfo(prestigeLevel, listenCount, totalXP);
            }
        }),
        {
            name: 'character-storage',
            storage: createJSONStorage(() => storage),
            // Callback after zustand finishes hydrating from localStorage
            // This is critical because we need the characters array to be loaded before we can restore
            // the selected track from the active character
            onRehydrateStorage: () => {
                return (state) => {
                    // Initialize selectedHeroSeeds if missing (backwards compatibility)
                    // and clean up any stale seeds
                    if (state) {
                        const characterSeeds = new Set(state.characters.map(c => c.seed));

                        // If selectedHeroSeeds is undefined or not an array, initialize with all characters
                        if (!state.selectedHeroSeeds || !Array.isArray(state.selectedHeroSeeds)) {
                            state.selectedHeroSeeds = state.characters.map(c => c.seed);
                            logger.info('Store', 'Initialized selectedHeroSeeds with all characters', {
                                count: state.selectedHeroSeeds.length
                            });
                        } else {
                            // Clean up stale seeds (seeds that no longer exist in characters)
                            const validSeeds = state.selectedHeroSeeds.filter(s => characterSeeds.has(s));
                            if (validSeeds.length !== state.selectedHeroSeeds.length) {
                                logger.info('Store', 'Cleaned up stale hero seeds from selection', {
                                    removed: state.selectedHeroSeeds.length - validSeeds.length
                                });
                                state.selectedHeroSeeds = validSeeds;
                            }
                        }
                    }

                    if (state?.activeCharacterId && state.characters.length > 0) {
                        logger.info('Store', 'Character store rehydrated from storage, triggering track restoration', {
                            activeCharacterId: state.activeCharacterId,
                            characterCount: state.characters.length,
                            characterNames: state.characters.map(c => ({ name: c.name, seed: c.seed }))
                        });

                        // Small delay to ensure playlist store has also hydrated
                        // This is because restoration needs both character AND playlist data
                        setTimeout(() => {
                            const activeChar = state.characters.find(c => c.seed === state.activeCharacterId);
                            if (activeChar && state.activeCharacterId) {
                                logger.info('Store', 'Post-rehydration: Starting track restoration for active character', {
                                    characterName: activeChar.name,
                                    characterSeed: activeChar.seed
                                });

                                // Call the restoration logic directly
                                // We need to manually trigger the restoration since we're in a callback
                                // Non-null assertion is safe here because we checked above
                                attemptTrackRestorationAsync(state.activeCharacterId!, state.characters).then((result) => {
                                    if (!result.stopRetrying) {
                                        logger.info('Store', 'Post-rehydration: Playlist not loaded yet, setting up retry listener');
                                        setupPlaylistListener(state.activeCharacterId!, state.characters);
                                    }
                                }).catch((error) => {
                                    logger.error('Store', 'Post-rehydration: Error during track restoration', error);
                                    if (state.activeCharacterId) {
                                        setupPlaylistListener(state.activeCharacterId, state.characters);
                                    }
                                });
                            }
                        }, 100); // 100ms delay to allow playlist store to hydrate
                    } else {
                        logger.info('Store', 'Character store rehydrated but no active character or characters found', {
                            activeCharacterId: state?.activeCharacterId,
                            characterCount: state?.characters?.length ?? 0
                        });
                    }
                };
            },
        }
    )
);
