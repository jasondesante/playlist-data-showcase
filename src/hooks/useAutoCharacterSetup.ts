import { useEffect, useRef } from 'react';
import { useAudioPlayerStore } from '@/store/audioPlayerStore';
import { usePlaylistStore } from '@/store/playlistStore';
import { useCharacterStore } from '@/store/characterStore';
import { useAudioAnalyzer } from '@/hooks/useAudioAnalyzer';
import { useCharacterGenerator } from '@/hooks/useCharacterGenerator';
import { logger } from '@/utils/logger';

/**
 * Hook that automatically analyzes audio and generates characters on first listen.
 *
 * When playback starts on a track that doesn't have a character yet:
 * 1. Analyzes the audio to get an AudioProfile
 * 2. Generates a character with default settings (uncapped mode)
 *
 * This ensures every track can earn XP from its very first listen.
 * The analysis/generation happens in background while the session runs.
 */
export const useAutoCharacterSetup = () => {
    const { playbackState } = useAudioPlayerStore();
    const { selectedTrack, setAudioProfile } = usePlaylistStore();
    const { characters } = useCharacterStore();
    const { analyzeTrack, isAnalyzing } = useAudioAnalyzer();
    const { generateCharacter, isGenerating } = useCharacterGenerator();

    // Track which tracks we've already started processing to avoid duplicate runs
    const processingTracksRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        // Only run when playback starts and we have a selected track
        if (playbackState !== 'playing' || !selectedTrack) {
            return;
        }

        const trackId = selectedTrack.id;

        // Check if character already exists for this track
        const characterExists = characters.some(c => c.seed === trackId);

        if (characterExists) {
            // Character exists, nothing to do
            return;
        }

        // Check if we're already processing this track
        if (processingTracksRef.current.has(trackId)) {
            return;
        }

        // Check if already analyzing or generating (from another source)
        if (isAnalyzing || isGenerating) {
            return;
        }

        // Mark this track as being processed
        processingTracksRef.current.add(trackId);

        logger.info('AutoCharacterSetup', 'Starting auto-setup for first listen', {
            trackId,
            trackTitle: selectedTrack.title
        });

        // Run analysis and generation in background
        const setupCharacter = async () => {
            try {
                // Step 1: Analyze audio
                logger.info('AutoCharacterSetup', 'Analyzing audio...', { trackId });
                const profile = await analyzeTrack(selectedTrack.audio_url);

                if (!profile) {
                    logger.warn('AutoCharacterSetup', 'Audio analysis failed', { trackId });
                    return;
                }

                // Store the audio profile for UI display
                setAudioProfile(profile);

                // Step 2: Generate character with default settings (uncapped mode)
                logger.info('AutoCharacterSetup', 'Generating character...', { trackId });
                const character = await generateCharacter(profile, trackId, 'uncapped');

                if (character) {
                    logger.info('AutoCharacterSetup', 'Character created successfully', {
                        trackId,
                        name: character.name,
                        class: character.class,
                        race: character.race
                    });
                } else {
                    logger.warn('AutoCharacterSetup', 'Character generation failed', { trackId });
                }
            } catch (error) {
                logger.error('AutoCharacterSetup', 'Auto-setup failed', { trackId, error });
            } finally {
                // Remove from processing set after completion
                processingTracksRef.current.delete(trackId);
            }
        };

        // Don't await - let it run in background while session continues
        setupCharacter();

    }, [playbackState, selectedTrack, characters, analyzeTrack, generateCharacter, isAnalyzing, isGenerating, setAudioProfile]);

    return {
        isSettingUp: isAnalyzing || isGenerating
    };
};
