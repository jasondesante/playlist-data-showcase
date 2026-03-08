import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CharacterSheet, AudioProfile, PlaylistTrack } from '@/types';
import type { PrestigeInfo, PrestigeResult } from '@/types';
import { storage } from '@/utils/storage';
import { logger } from '@/utils/logger';
import type { StatIncreaseStrategyType } from '@/components/ui/StatStrategySelector';
import { CharacterUpdater, PrestigeSystem, StatManager, type ISessionTracker, type CharacterUpdateResult } from 'playlist-data-engine';
import { DEFAULT_XP_FORMULA_PRESET_ID } from '@/constants/xpFormulaPresets';

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
 * Interface for cleanup handles used by playlist listener.
 * Stores references to both the polling interval and the event subscription
 * so they can be properly cleaned up together.
 */
interface PlaylistListenerHandles {
    interval: ReturnType<typeof setInterval> | null;
    unsubscribe: (() => void) | null;
}

/**
 * Setup a listener for playlist loading events.
 * Uses a callback-based approach that will be notified when the playlist is loaded
 * (either via setPlaylist or via zustand rehydration from localStorage).
 */
function setupPlaylistListener(activeCharacterId: string, characters: CharacterSheet[]) {
    // Handles for cleanup - stores both the interval and unsubscribe function
    const handles: PlaylistListenerHandles = {
        interval: null,
        unsubscribe: null
    };

    /**
     * Clean up all resources (interval and subscription).
     * Safe to call multiple times.
     */
    const cleanup = (): void => {
        if (handles.interval !== null) {
            clearInterval(handles.interval);
            handles.interval = null;
        }
        if (handles.unsubscribe !== null) {
            handles.unsubscribe();
            handles.unsubscribe = null;
        }
        // Reset restoration state
        restorationState = { needsRetry: false, attemptTime: 0, retryCount: 0 };
    };

    // Use a polling fallback approach to check for playlist availability
    // This is a safety net in case the callback doesn't fire
    handles.interval = setInterval(async () => {
        // Check timeout
        const elapsed = Date.now() - restorationState.attemptTime;
        if (elapsed > RESTORATION_TIMEOUT_MS) {
            logger.warn('Store', 'Track restoration timeout - playlist not loaded within timeout period');
            cleanup();
            return;
        }

        // Check max retries
        if (restorationState.retryCount >= MAX_RETRIES) {
            logger.warn('Store', 'Track restoration max retries reached');
            cleanup();
            return;
        }

        restorationState.retryCount++;

        // Try to restore asynchronously (handles dynamic imports properly)
        const result = await attemptTrackRestorationAsync(activeCharacterId, characters);
        if (result.stopRetrying) {
            cleanup();
        }
    }, RESTORATION_RETRY_INTERVAL_MS);

    // Also subscribe to playlist load events for immediate response
    // This handles the case where playlist is set or rehydrated after we start listening
    import('@/store/playlistStore').then(({ onPlaylistLoad }) => {
        handles.unsubscribe = onPlaylistLoad(async (playlist) => {
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
                cleanup();
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
                    cleanup();
                }
            }
        });
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
    /** Map of character seed to uncapped progression preset ID */
    uncappedConfig: Record<string, string>;

    /** Add a new character to the store and set as active */
    addCharacter: (character: CharacterSheet) => void;
    /** Update an existing character's data (finds by seed) */
    updateCharacter: (character: CharacterSheet) => void;
    /** Add a new character or update existing one (finds by seed) */
    addOrUpdateCharacter: (character: CharacterSheet) => void;
    /** Set the active character by seed ID, or pass null to clear the active character */
    setActiveCharacter: (id: string | null) => void;
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
     * Uses the engine's CharacterUpdater.resetCharacterForPrestige() via ISessionTracker adapter.
     * @param characterId - The seed of the character to prestige
     * @param audioProfile - Audio profile for character regeneration
     * @param track - Track metadata for character regeneration
     * @param sessionTracker - ISessionTracker adapter (from sessionStore)
     * @returns PrestigeResult indicating success/failure (includes regenerated character)
     */
    prestigeCharacter: (
        characterId: string,
        audioProfile: AudioProfile,
        track: PlaylistTrack,
        sessionTracker: ISessionTracker
    ) => PrestigeResult;
    /**
     * Check if a character can prestige.
     * @param characterId - The seed of the character to check
     * @param sessionTracker - ISessionTracker adapter (from sessionStore)
     * @returns True if the character can prestige
     */
    canPrestige: (
        characterId: string,
        sessionTracker: ISessionTracker
    ) => boolean;
    /**
     * Get prestige info for a character.
     * @param characterId - The seed of the character
     * @param sessionTracker - ISessionTracker adapter (from sessionStore)
     * @returns PrestigeInfo object with current progress
     */
    getPrestigeInfo: (
        characterId: string,
        sessionTracker: ISessionTracker
    ) => PrestigeInfo | null;
    /**
     * Set the uncapped progression preset for a character by seed.
     * Persists to localStorage via zustand persist middleware.
     *
     * @param seed - The seed (unique ID) of the character
     * @param presetId - The XP formula preset ID (e.g., 'dnd5e', 'linear')
     * @example
     * ```ts
     * setCharacterUncappedConfig('seed-123', 'osrs');
     * ```
     */
    setCharacterUncappedConfig: (seed: string, presetId: string) => void;
    /**
     * Get the uncapped progression preset for a character by seed.
     * Returns the default preset ('dnd5e') if not set.
     *
     * @param seed - The seed (unique ID) of the character
     * @returns The preset ID (defaults to 'dnd5e' if not set)
     * @example
     * ```ts
     * const presetId = getCharacterUncappedConfig('seed-123'); // 'dnd5e' | 'linear' | etc.
     * ```
     */
    getCharacterUncappedConfig: (seed: string) => string;
    /**
     * Reset a character's prestige level back to 0 (cheat/debug helper).
     * Useful for testing prestige progression without losing character data.
     * Does NOT clear session history - use sessionStore.clearTrackSessions() separately if needed.
     *
     * @param characterId - The seed of the character to reset
     * @returns True if reset was successful, false if character not found
     * @example
     * ```ts
     * resetPrestigeLevel('character-seed-123');
     * ```
     */
    resetPrestigeLevel: (characterId: string) => boolean;
    /**
     * Directly set a character's prestige level (cheat/debug helper).
     * Bypasses all prestige requirements and session tracking.
     * Useful for testing different prestige levels.
     *
     * @param characterId - The seed of the character
     * @param prestigeLevel - The new prestige level (0-10)
     * @returns True if successful, false if character not found or invalid level
     */
    setPrestigeLevel: (characterId: string, prestigeLevel: number) => boolean;
    /**
     * Add Rhythm XP to a character.
     * Called when user claims XP from a rhythm practice session.
     * Uses the engine's CharacterUpdater.addXP() with source 'rhythm_game'.
     *
     * @param characterSeed - The seed (track ID) of the character to add XP to
     * @param totalXP - Total XP to add from the rhythm session
     * @returns Result with updated character and level-up details, or null if character not found
     */
    addRhythmXP: (characterSeed: string, totalXP: number) => Omit<CharacterUpdateResult, 'masteredTrack' | 'masteryBonusXP'> | null;
}

export const useCharacterStore = create<CharacterState>()(
    persist(
        (set, get) => ({
            characters: [],
            activeCharacterId: null,
            characterStrategies: {},
            selectedHeroSeeds: [],
            uncappedConfig: {},

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
             * Also cleans up the character's stat strategy preference and uncapped config
             * @param id - The seed of the character to delete
             */
            deleteCharacter: (id) => {
                logger.info('Store', 'Deleting character', id);
                set((state) => {
                    // Clean up the strategy for the deleted character
                    const { [id]: _removedStrategy, ...remainingStrategies } = state.characterStrategies;
                    // Clean up the uncapped config for the deleted character
                    const { [id]: _removedConfig, ...remainingConfig } = state.uncappedConfig;
                    return {
                        characters: state.characters.filter((c) => c.seed !== id),
                        activeCharacterId: state.activeCharacterId === id ? null : state.activeCharacterId,
                        characterStrategies: remainingStrategies,
                        uncappedConfig: remainingConfig,
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

                    // Clean up uncapped configs for all affected seeds
                    const remainingConfig = { ...state.uncappedConfig };
                    affectedSeeds.forEach(seed => {
                        delete remainingConfig[seed];
                    });

                    return {
                        characters: state.characters.filter(c => !affectedSeeds.includes(c.seed)),
                        activeCharacterId: affectedSeeds.includes(state.activeCharacterId || '')
                            ? null
                            : state.activeCharacterId,
                        characterStrategies: remainingStrategies,
                        uncappedConfig: remainingConfig,
                        selectedHeroSeeds: state.selectedHeroSeeds.filter(s => !affectedSeeds.includes(s)) // Remove from selection
                    };
                });
            },

            /**
             * Clear all characters and reset state
             * Useful for resetting the app or clearing all data
             * Also clears all saved stat strategy preferences and uncapped configs
             */
            resetCharacters: () => {
                logger.warn('Store', 'Resetting all characters');
                set({
                    characters: [],
                    activeCharacterId: null,
                    characterStrategies: {},
                    uncappedConfig: {},
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
             * Uses the engine's CharacterUpdater.resetCharacterForPrestige() for consistency.
             *
             * @param characterId - The seed of the character to prestige
             * @param audioProfile - Audio profile for character regeneration
             * @param track - Track metadata for character regeneration
             * @param sessionTracker - ISessionTracker adapter (from sessionStore)
             * @returns PrestigeResult indicating success/failure (includes regenerated character)
             *
             * @example
             * ```ts
             * // Create ISessionTracker adapter from sessionStore
             * const sessionTracker: ISessionTracker = {
             *   getTrackListenCount: (id) => useSessionStore.getState().getTrackListenCount(id),
             *   getTrackXPTotal: (id) => useSessionStore.getState().getTrackXPTotal(id),
             *   clearTrackSessions: (id) => useSessionStore.getState().clearTrackSessions(id),
             * };
             *
             * const result = prestigeCharacter(character.seed, audioProfile, track, sessionTracker);
             * if (result.success) {
             *   console.log(`Prestiged to level ${PrestigeSystem.toRomanNumeral(result.newPrestigeLevel)}!`);
             * }
             * ```
             */
            prestigeCharacter: (
                characterId: string,
                audioProfile: AudioProfile,
                track: PlaylistTrack,
                sessionTracker: ISessionTracker
            ): PrestigeResult => {
                const character = get().characters.find((c) => c.seed === characterId);
                if (!character) {
                    return PrestigeSystem.createFailureResult(
                        'Character not found',
                        0
                    );
                }

                // Use engine's CharacterUpdater for prestige logic
                const updater = new CharacterUpdater();
                const result = updater.resetCharacterForPrestige(
                    character,
                    sessionTracker,
                    characterId, // trackUuid is the character's seed
                    audioProfile,
                    track
                );

                if (result.success) {
                    // Extract regenerated character from result
                    const regeneratedCharacter = (result as PrestigeResult & { character: CharacterSheet }).character;

                    // Update the store with the regenerated character
                    set((state) => ({
                        characters: state.characters.map((c) =>
                            c.seed === characterId ? regeneratedCharacter : c
                        )
                    }));

                    logger.info('Store', 'Character prestiged', {
                        characterName: character.name,
                        previousLevel: result.previousPrestigeLevel,
                        newLevel: result.newPrestigeLevel,
                        romanNumeral: PrestigeSystem.toRomanNumeral(result.newPrestigeLevel)
                    });
                } else {
                    logger.warn('Store', 'Prestige failed', {
                        characterName: character.name,
                        reason: result.message
                    });
                }

                return result;
            },

            /**
             * Check if a character can prestige.
             *
             * @param characterId - The seed of the character to check
             * @param sessionTracker - ISessionTracker adapter (from sessionStore)
             * @returns True if the character can prestige
             */
            canPrestige: (
                characterId: string,
                sessionTracker: ISessionTracker
            ): boolean => {
                const character = get().characters.find((c) => c.seed === characterId);
                if (!character) return false;

                const updater = new CharacterUpdater();
                return updater.canPrestige(character, sessionTracker, characterId);
            },

            /**
             * Get prestige info for a character.
             *
             * @param characterId - The seed of the character
             * @param sessionTracker - ISessionTracker adapter (from sessionStore)
             * @returns PrestigeInfo object with current progress, or null if character not found
             */
            getPrestigeInfo: (
                characterId: string,
                sessionTracker: ISessionTracker
            ): PrestigeInfo | null => {
                const character = get().characters.find((c) => c.seed === characterId);
                if (!character) return null;

                const updater = new CharacterUpdater();
                return updater.getPrestigeInfo(character, sessionTracker, characterId);
            },

            /**
             * Set the uncapped progression preset for a character by seed.
             * Persists to localStorage via zustand persist middleware.
             *
             * @param seed - The seed (unique ID) of the character
             * @param presetId - The XP formula preset ID (e.g., 'dnd5e', 'linear')
             * @example
             * ```ts
             * setCharacterUncappedConfig('seed-123', 'osrs');
             * ```
             */
            setCharacterUncappedConfig: (seed: string, presetId: string) => {
                logger.debug('Store', 'Setting character uncapped config', { seed, presetId });
                set((state) => ({
                    uncappedConfig: {
                        ...state.uncappedConfig,
                        [seed]: presetId
                    }
                }));
            },

            /**
             * Get the uncapped progression preset for a character by seed.
             * Returns the default preset ('dnd5e') if not set.
             *
             * @param seed - The seed (unique ID) of the character
             * @returns The preset ID (defaults to 'dnd5e' if not set)
             * @example
             * ```ts
             * const presetId = getCharacterUncappedConfig('seed-123'); // 'dnd5e' | 'linear' | etc.
             * ```
             */
            getCharacterUncappedConfig: (seed: string): string => {
                const { uncappedConfig } = get();
                return uncappedConfig[seed] ?? DEFAULT_XP_FORMULA_PRESET_ID;
            },

            /**
             * Reset a character's prestige level back to 0 (cheat/debug helper).
             * Useful for testing prestige progression without losing character data.
             * Does NOT clear session history - use sessionStore.clearTrackSessions() separately if needed.
             *
             * @param characterId - The seed of the character to reset
             * @returns True if reset was successful, false if character not found
             */
            resetPrestigeLevel: (characterId: string): boolean => {
                const character = get().characters.find((c) => c.seed === characterId);
                if (!character) {
                    logger.warn('Store', 'Character not found for prestige reset', { characterId });
                    return false;
                }

                const oldLevel = character.prestige_level ?? 0;
                if (oldLevel === 0) {
                    logger.info('Store', 'Character already at prestige 0, no change needed', { characterId });
                    return true;
                }

                set((state) => ({
                    characters: state.characters.map((c) =>
                        c.seed === characterId ? { ...c, prestige_level: 0 as 0 } : c
                    )
                }));

                logger.info('Store', 'Reset character prestige to 0', {
                    characterId,
                    characterName: character.name,
                    previousLevel: oldLevel
                });
                return true;
            },

            /**
             * Directly set a character's prestige level (cheat/debug helper).
             * Bypasses all prestige requirements and session tracking.
             * Useful for testing different prestige levels.
             *
             * @param characterId - The seed of the character
             * @param prestigeLevel - The new prestige level (0-10)
             * @returns True if successful, false if character not found or invalid level
             */
            setPrestigeLevel: (characterId: string, prestigeLevel: number): boolean => {
                if (prestigeLevel < 0 || prestigeLevel > 10) {
                    logger.warn('Store', 'Invalid prestige level', { characterId, prestigeLevel });
                    return false;
                }

                const character = get().characters.find((c) => c.seed === characterId);
                if (!character) {
                    logger.warn('Store', 'Character not found for prestige level set', { characterId });
                    return false;
                }

                const oldLevel = character.prestige_level ?? 0;
                // Cast to PrestigeLevel type (0-10 union type)
                const validPrestigeLevel = prestigeLevel as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
                set((state) => ({
                    characters: state.characters.map((c) =>
                        c.seed === characterId ? { ...c, prestige_level: validPrestigeLevel } : c
                    )
                }));

                logger.info('Store', 'Set character prestige level', {
                    characterId,
                    characterName: character.name,
                    previousLevel: oldLevel,
                    newLevel: prestigeLevel
                });
                return true;
            },

            addRhythmXP: (characterSeed: string, totalXP: number) => {
                const character = get().characters.find((c) => c.seed === characterSeed);
                if (!character) {
                    logger.warn('Store', 'Character not found for rhythm XP', { characterSeed });
                    return null;
                }

                logger.info('Store', 'Adding rhythm XP to character', {
                    characterSeed,
                    characterName: character.name,
                    totalXP
                });

                try {
                    // Use StatManager with smart strategy for rhythm game XP
                    const statManager = new StatManager({ strategy: 'dnD5e_smart' });
                    const updater = new CharacterUpdater(statManager);

                    // Add XP with 'rhythm_game' source
                    const result = updater.addXP(character, totalXP, 'rhythm_game');

                    // Update character in store
                    set((state) => ({
                        characters: state.characters.map((c) =>
                            c.seed === characterSeed ? result.character : c
                        )
                    }));

                    if (result.leveledUp) {
                        logger.info('Store', 'Character leveled up from rhythm XP!', {
                            characterSeed,
                            characterName: result.character.name,
                            newLevel: result.newLevel,
                            xpEarned: result.xpEarned
                        });
                    }

                    return {
                        character: result.character,
                        xpEarned: result.xpEarned,
                        leveledUp: result.leveledUp,
                        newLevel: result.newLevel,
                        levelUpDetails: result.levelUpDetails
                    };
                } catch (error) {
                    logger.error('Store', 'Failed to add rhythm XP', { characterSeed, error });
                    return null;
                }
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
                    // Initialize selectedHeroSeeds and uncappedConfig if missing (backwards compatibility)
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

                        // Initialize uncappedConfig if missing (backwards compatibility)
                        if (!state.uncappedConfig || typeof state.uncappedConfig !== 'object') {
                            state.uncappedConfig = {};
                            logger.info('Store', 'Initialized uncappedConfig for backwards compatibility');
                        } else {
                            // Clean up stale config entries (seeds that no longer exist in characters)
                            const validConfigEntries = Object.keys(state.uncappedConfig).filter(s => characterSeeds.has(s));
                            if (validConfigEntries.length !== Object.keys(state.uncappedConfig).length) {
                                const removed = Object.keys(state.uncappedConfig).length - validConfigEntries.length;
                                const cleanedConfig: Record<string, string> = {};
                                validConfigEntries.forEach(seed => {
                                    cleanedConfig[seed] = state.uncappedConfig![seed];
                                });
                                state.uncappedConfig = cleanedConfig;
                                logger.info('Store', 'Cleaned up stale uncapped config entries', { removed });
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
