/**
 * Audio Player Store
 *
 * Manages audio playback state using HTML5 Audio API.
 * Provides a global audio player instance that can be controlled from any component.
 *
 * Includes Arweave gateway fallback support - when playing Arweave URLs,
 * automatically tries alternate gateways if the primary gateway fails.
 */

import { create } from 'zustand';
import { isArweaveUrl, arweaveGatewayManager } from 'playlist-data-engine';
import { logger } from '@/utils/logger';

export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';

interface AudioPlayerState {
    /** The URL of the currently loaded audio */
    currentUrl: string | null;
    /** Current playback state */
    playbackState: PlaybackState;
    /** Current playback position in seconds */
    currentTime: number;
    /** Total duration in seconds */
    duration: number;
    /** Volume level (0-1) */
    volume: number;
    /** Whether audio is muted */
    isMuted: boolean;
    /** Error message if playback failed */
    error: string | null;
    /** Human-readable loading phase detail (null when not loading) */
    loadingDetail: string | null;

    /** Actions */
    play: (url: string) => Promise<void>;
    pause: () => void;
    resume: () => void;
    togglePlay: (url: string) => Promise<void>;  // Toggle play/pause for given URL
    stop: () => void;
    seek: (time: number, url?: string) => void;
    setVolume: (volume: number) => void;
    toggleMute: () => void;
    updateTime: (time: number) => void;
    updateDuration: (duration: number) => void;
    setPlaybackState: (state: PlaybackState) => void;
    setError: (error: string | null) => void;
    /** Load a track URL without starting playback (preloads the audio) */
    load: (url: string) => Promise<void>;
}

// Global HTML5 Audio instance
let audioElement: HTMLAudioElement | null = null;

// Track pending seek to prevent timeupdate from overwriting target position
let pendingSeekTarget: number | null = null;

// Gateway retry tracking — prevents infinite retry loops on load failures
let gatewayRetryCount = 0;
const MAX_GATEWAY_RETRIES = 2;

const setupAudioEventListeners = (audio: HTMLAudioElement) => {
    audio.addEventListener('loadstart', () => {
        useAudioPlayerStore.getState().setPlaybackState('loading');
    });

    audio.addEventListener('canplay', () => {
        const store = useAudioPlayerStore.getState();

        // If we have a pending seek, let the seek handler deal with it
        if (pendingSeekTarget !== null) {
            return;
        }

        // Only handle the preload case: audio loaded but play() not called yet.
        // The transition to 'playing' is handled exclusively by the 'playing' event,
        // which fires only when audio is actually producing output (not just buffered).
        if (store.playbackState === 'loading' && audio.paused) {
            useAudioPlayerStore.getState().setPlaybackState('paused');
        }
    });

    audio.addEventListener('playing', () => {
        const store = useAudioPlayerStore.getState();
        store.setPlaybackState('playing');
        useAudioPlayerStore.setState({ loadingDetail: null });
        gatewayRetryCount = 0;
    });

    audio.addEventListener('pause', () => {
        const store = useAudioPlayerStore.getState();
        if (store.playbackState === 'playing') {
            store.setPlaybackState('paused');
            useAudioPlayerStore.setState({ loadingDetail: null });
        }
    });

    audio.addEventListener('ended', () => {
        // Reset currentTime to 0 so the song can be replayed from the beginning.
        // This must happen here (not in play/resume/togglePlay) to avoid breaking
        // the seekable range on subsequent plays.
        audio.currentTime = 0;
        const store = useAudioPlayerStore.getState();
        store.setPlaybackState('ended');
        store.updateTime(0);
        useAudioPlayerStore.setState({ loadingDetail: null });
    });

    audio.addEventListener('error', async () => {
        const store = useAudioPlayerStore.getState();
        const currentUrl = store.currentUrl;

        // For Arweave URLs, report gateway failure and auto-retry with a new gateway
        if (currentUrl && isArweaveUrl(currentUrl) && gatewayRetryCount < MAX_GATEWAY_RETRIES) {
            gatewayRetryCount++;
            logger.info('Store', `Gateway load failed, retrying with new gateway (attempt ${gatewayRetryCount}/${MAX_GATEWAY_RETRIES})`, {
                url: currentUrl,
                audioError: audio.error?.message,
                audioSrc: audio.src,
            });

            useAudioPlayerStore.setState({
                loadingDetail: `Gateway failed, trying another... (${gatewayRetryCount}/${MAX_GATEWAY_RETRIES})`,
            });

            try {
                const newUrl = await arweaveGatewayManager.reportGatewayFailure(currentUrl);
                if (newUrl !== audio.src) {
                    logger.info('Store', 'Retrying with new gateway', { newUrl, oldSrc: audio.src });
                    audio.src = newUrl;
                    audio.play().catch(() => {
                        // If play itself rejects after gateway switch, let the next error event handle it
                    });
                    return; // Don't set error state — wait for play to succeed or fail
                }
            } catch (err) {
                logger.error('Store', 'Gateway retry failed', { error: err });
            }
        }

        // Exhausted retries or non-Arweave URL — show error
        gatewayRetryCount = 0;
        store.setError('Failed to load audio');
        store.setPlaybackState('error');
        useAudioPlayerStore.setState({ loadingDetail: null });
    });

    audio.addEventListener('timeupdate', () => {
        // Don't override currentTime if we have a pending seek
        if (pendingSeekTarget !== null) {
            return;
        }
        useAudioPlayerStore.getState().updateTime(audio.currentTime);
    });

    audio.addEventListener('loadedmetadata', () => {
        useAudioPlayerStore.getState().updateDuration(audio.duration);
    });
};

const getAudioElement = (): HTMLAudioElement => {
    if (!audioElement) {
        audioElement = new Audio();
        audioElement.preload = 'auto'; // Force buffering to ensure seekable range
        setupAudioEventListeners(audioElement);
    }
    return audioElement;
};

export const useAudioPlayerStore = create<AudioPlayerState>((set, get) => ({
    currentUrl: null,
    playbackState: 'idle',
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    isMuted: false,
    error: null,
    loadingDetail: null,

    play: async (url: string) => {
        const audio = getAudioElement();
        const currentUrl = get().currentUrl;
        gatewayRetryCount = 0;

        // Resolve Arweave URLs through gateway manager (handles non-Arweave URLs too)
        let resolvedUrl = url;
        if (isArweaveUrl(url)) {
            set({ playbackState: 'loading', loadingDetail: 'Resolving gateway...' });
            try {
                resolvedUrl = await arweaveGatewayManager.resolveUrl(url);
                if (resolvedUrl !== url) {
                    logger.info('Store', 'Arweave URL resolved to alternate gateway', {
                        originalUrl: url,
                        resolvedUrl,
                    });
                }
            } catch (err) {
                logger.error('Store', 'Arweave gateway resolution failed', { url, error: err });
                // Fall back to original URL
                resolvedUrl = url;
            }
        }

        if (currentUrl !== url) {
            // New track - load and play
            audio.src = resolvedUrl;
            set({ currentUrl: url, currentTime: 0, error: null, playbackState: 'loading', loadingDetail: 'Loading audio...' });
            audio.play().catch((err) => {
                console.error('Playback failed:', err);
                set({ error: err.message, playbackState: 'error', loadingDetail: null });
            });
        } else {
            // Same track
            const state = get().playbackState;
            if (state === 'paused') {
                audio.play().catch((err) => {
                    console.error('Playback failed:', err);
                    set({ error: err.message, playbackState: 'error' });
                });
            } else if (state === 'ended') {
                // currentTime was already reset in the 'ended' event handler
                audio.play().catch((err) => {
                    console.error('Playback failed:', err);
                    set({ error: err.message, playbackState: 'error' });
                });
            }
        }
    },

    pause: () => {
        const audio = getAudioElement();
        if (get().playbackState === 'playing') {
            audio.pause();
        }
    },

    resume: () => {
        const audio = getAudioElement();
        const state = get().playbackState;

        if (state === 'paused' && get().currentUrl) {
            audio.play().catch((err) => {
                console.error('Playback failed:', err);
                set({ error: err.message, playbackState: 'error' });
            });
        } else if (state === 'ended' && get().currentUrl) {
            // currentTime was already reset in the 'ended' event handler
            audio.play().catch((err) => {
                console.error('Playback failed:', err);
                set({ error: err.message, playbackState: 'error' });
            });
        }
    },

    togglePlay: async (url: string) => {
        const audio = getAudioElement();
        const currentUrl = get().currentUrl;
        const playbackState = get().playbackState;

        // Check if it's the same track by comparing URLs
        const isSameTrack = currentUrl === url;
        // Also check the actual audio element state in case store state is out of sync
        const isActuallyPlaying = !audio.paused && audio.readyState >= 2; // HAVE_CURRENT_DATA

        if (isSameTrack) {
            // Same track - toggle play/pause based on actual audio state
            if (playbackState === 'playing' || isActuallyPlaying) {
                audio.pause();
                // Immediately update state to ensure sync
                set({ playbackState: 'paused' });
            } else if (playbackState === 'paused') {
                audio.play().catch((err) => {
                    console.error('Playback failed:', err);
                    set({ error: err.message, playbackState: 'error' });
                });
            } else if (playbackState === 'ended') {
                // currentTime was already reset in the 'ended' event handler
                audio.play().catch((err) => {
                    console.error('Playback failed:', err);
                    set({ error: err.message, playbackState: 'error' });
                });
            }
        } else {
            // Different track - resolve URL and play
            let resolvedUrl = url;
            if (isArweaveUrl(url)) {
                set({ playbackState: 'loading', loadingDetail: 'Resolving gateway...' });
                try {
                    resolvedUrl = await arweaveGatewayManager.resolveUrl(url);
                    if (resolvedUrl !== url) {
                        logger.info('Store', 'Arweave URL resolved to alternate gateway', {
                            originalUrl: url,
                            resolvedUrl,
                        });
                    }
                } catch (err) {
                    logger.error('Store', 'Arweave gateway resolution failed', { url, error: err });
                    // Fall back to original URL
                    resolvedUrl = url;
                }
            }

            audio.src = resolvedUrl;
            set({ currentUrl: url, currentTime: 0, error: null, playbackState: 'loading', loadingDetail: 'Loading audio...' });
            audio.play().catch((err) => {
                console.error('Playback failed:', err);
                set({ error: err.message, playbackState: 'error', loadingDetail: null });
            });
        }
    },

    stop: () => {
        const audio = getAudioElement();
        audio.pause();
        audio.currentTime = 0;
        gatewayRetryCount = 0;
        set({ currentUrl: null, playbackState: 'idle', currentTime: 0, duration: 0, error: null, loadingDetail: null });
    },

    load: async (url: string) => {
        const audio = getAudioElement();
        const currentUrl = get().currentUrl;

        // Only load if it's a different URL
        if (currentUrl !== url) {
            // Resolve Arweave URLs through gateway manager
            let resolvedUrl = url;
            if (isArweaveUrl(url)) {
                set({ playbackState: 'loading', loadingDetail: 'Resolving gateway...' });
                try {
                    resolvedUrl = await arweaveGatewayManager.resolveUrl(url);
                    if (resolvedUrl !== url) {
                        logger.info('Store', 'Arweave URL resolved to alternate gateway', {
                            originalUrl: url,
                            resolvedUrl,
                        });
                    }
                } catch (err) {
                    logger.error('Store', 'Arweave gateway resolution failed', { url, error: err });
                    // Fall back to original URL
                    resolvedUrl = url;
                }
            }

            audio.src = resolvedUrl;
            // Set to paused state (ready to play) rather than loading
            // The canplay event will transition to 'paused' when ready
            set({ currentUrl: url, currentTime: 0, error: null, playbackState: 'loading', loadingDetail: 'Loading audio...' });
        }
    },

    seek: (time: number, url?: string) => {
        const audio = getAudioElement();
        const currentUrl = get().currentUrl;
        const duration = get().duration;
        const maxTime = Number.isFinite(duration) && duration > 0 ? duration : Infinity;
        const targetTime = Math.max(0, Math.min(time, maxTime));

        // Update store immediately for responsive UI
        set({ currentTime: targetTime });

        // If no audio is loaded but a URL is provided, load it first
        if (!currentUrl && url) {
            // Set pending seek flag ONLY for initial load case
            pendingSeekTarget = targetTime;

            // Load the audio without starting playback
            audio.src = url;
            set({ currentUrl: url, error: null, playbackState: 'loading' });

            // Wait for seekable range to be established before seeking
            const trySeek = () => {
                // Use current pendingSeekTarget in case user dragged to new position
                const currentTarget = pendingSeekTarget;
                if (currentTarget === null) return;

                const canSeek = audio.seekable.length > 0 &&
                    (audio.seekable.end(audio.seekable.length - 1) === Infinity ||
                        audio.seekable.end(audio.seekable.length - 1) >= currentTarget);

                if (canSeek) {
                    audio.currentTime = currentTarget;
                    set({ currentTime: currentTarget, playbackState: 'paused' });
                    // Clear pending flag only if target hasn't changed
                    if (pendingSeekTarget === currentTarget) {
                        pendingSeekTarget = null;
                    }
                    audio.removeEventListener('canplay', trySeek);
                    audio.removeEventListener('progress', trySeek);
                }
            };

            audio.addEventListener('canplay', trySeek);
            audio.addEventListener('progress', trySeek);
            return;
        }

        // Normal seek when audio is already loaded - no pending flag needed
        if (currentUrl) {
            const hasValidSeekable = audio.seekable.length > 0 &&
                (audio.seekable.end(audio.seekable.length - 1) === Infinity ||
                    audio.seekable.end(audio.seekable.length - 1) >= targetTime);

            if (!hasValidSeekable) {
                // Seekable range not ready - reload audio to fix it
                console.log('[seek] seekable range broken, reloading audio');
                const wasPlaying = !audio.paused;
                const currentSrc = audio.src;
                audio.src = '';
                audio.src = currentSrc;

                // Wait for reload to complete before seeking
                const seekOnCanPlay = () => {
                    audio.currentTime = targetTime;
                    // If audio was playing, resume playback
                    if (wasPlaying) {
                        audio.play().catch((err) => {
                            console.error('Resume after seek reload failed:', err);
                        });
                    }
                    audio.removeEventListener('canplay', seekOnCanPlay);
                };
                audio.addEventListener('canplay', seekOnCanPlay);
                return;
            }

            audio.currentTime = targetTime;
        }
    },

    setVolume: (volume: number) => {
        const audio = getAudioElement();
        const clampedVolume = Math.max(0, Math.min(1, volume));
        audio.volume = clampedVolume;
        // If user drags volume above 0, unmute the audio
        // (they expect sound to come back when dragging up from muted state)
        if (clampedVolume > 0 && audio.muted) {
            audio.muted = false;
        }
        set({ volume: clampedVolume, isMuted: clampedVolume === 0 });
    },

    toggleMute: () => {
        const audio = getAudioElement();
        const newMutedState = !get().isMuted;
        audio.muted = newMutedState;
        set({ isMuted: newMutedState });
    },

    updateTime: (time: number) => set({ currentTime: time }),
    updateDuration: (duration: number) => set({ duration }),
    setPlaybackState: (state: PlaybackState) => set({ playbackState: state }),
    setError: (error: string | null) => set({ error }),
}));
