import { useState, useCallback } from 'react';
import { PlaylistParser } from 'playlist-data-engine';
import { usePlaylistStore } from '@/store/playlistStore';
import { logger } from '@/utils/logger';
import { handleError } from '@/utils/errorHandling';

/**
 * React hook for parsing playlists from the Playlist Data Engine.
 *
 * This hook integrates the PlaylistParser engine module to parse playlists from:
 * - JSON strings (direct input)
 * - Arweave transaction IDs (fetched from arweave.net gateway)
 *
 * @example
 * ```tsx
 * const { parsePlaylist } = usePlaylistParser();
 * await parsePlaylist('arweave-tx-id');
 * ```
 *
 * @returns {Object} Hook return object
 * @returns {Function} parsePlaylist - Function to parse playlist from JSON string or Arweave TX ID
 */
export const usePlaylistParser = () => {
    const { setPlaylist, setLoading, setError } = usePlaylistStore();
    const [parser] = useState(() => new PlaylistParser());

    const parsePlaylist = useCallback(async (input: string) => {
        logger.info('PlaylistParser', 'Parsing playlist', { inputLength: input.length });
        setLoading(true);
        setError(null);

        try {
            // Determine if input is JSON or ID (simple heuristic)
            const isJson = input.trim().startsWith('{');

            let playlist;
            let rawData: unknown;

            if (isJson) {
                try {
                    const json = JSON.parse(input);
                    rawData = json; // Store raw JSON input
                    playlist = await parser.parse(json);
                } catch (jsonError) {
                    if (jsonError instanceof SyntaxError) {
                        throw new Error('Invalid JSON format. Please check your playlist data and try again.');
                    }
                    throw jsonError;
                }
            } else {
                // Validate Arweave ID format before fetching
                const trimmedInput = input.trim();
                if (trimmedInput.length === 0) {
                    throw new Error('Please enter an Arweave transaction ID or playlist JSON.');
                }
                if (trimmedInput.length < 10) {
                    throw new Error('Invalid Arweave ID format. Arweave IDs are typically 43 characters long.');
                }

                logger.info('PlaylistParser', 'Fetching from Arweave', trimmedInput);
                let response: Response;
                try {
                    response = await fetch(`https://arweave.net/${trimmedInput}`);
                } catch (fetchError) {
                    // Handle network errors (CORS, offline, etc.)
                    if (fetchError instanceof TypeError) {
                        throw new Error('Network error: Unable to connect to Arweave. This could be due to CORS restrictions or network connectivity issues. Please try again or check your connection.');
                    }
                    throw fetchError;
                }

                if (!response.ok) {
                    // Provide specific error messages based on HTTP status
                    if (response.status === 404) {
                        throw new Error(`Playlist not found on Arweave (404). The transaction ID "${trimmedInput}" may not exist or the data hasn\'t been confirmed yet.`);
                    } else if (response.status === 403) {
                        throw new Error(`Access denied (403). You may not have permission to access this playlist.`);
                    } else if (response.status >= 500) {
                        throw new Error(`Arweave server error (${response.status}). Please try again later.`);
                    } else {
                        throw new Error(`Failed to fetch playlist: ${response.statusText} (${response.status})`);
                    }
                }

                let json: unknown;
                try {
                    json = await response.json();
                } catch (jsonError) {
                    throw new Error('The response from Arweave is not valid JSON. This transaction may not contain playlist data.');
                }

                rawData = json; // Store raw Arweave response
                playlist = await parser.parse(json as Parameters<typeof parser.parse>[0]);
            }

            logger.info('PlaylistParser', 'Playlist parsed successfully', {
                name: playlist.name,
                tracks: playlist.tracks.length
            });

            setPlaylist(playlist, rawData);
            return playlist;
        } catch (error) {
            handleError(error, 'PlaylistParser');
            // Already have user-friendly messages from above, just use them
            const errorMessage = error instanceof Error ? error.message : 'Failed to parse playlist. Please check your input and try again.';
            setError(errorMessage);
            return null;
        } finally {
            setLoading(false);
        }
    }, [parser, setPlaylist, setLoading, setError]);

    return { parsePlaylist };
};
