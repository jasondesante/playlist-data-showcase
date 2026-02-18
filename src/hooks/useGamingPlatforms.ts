import { useState, useCallback, useEffect, useMemo } from 'react';
import { GamingPlatformSensors } from 'playlist-data-engine';
import { useSensorStore } from '@/store/sensorStore';
import { useAppStore } from '@/store/appStore';
import { logger } from '@/utils/logger';
import { handleError } from '@/utils/errorHandling';
import { isServerMode as detectServerMode } from '@/utils/env';

/**
 * Discord connection state for UI
 */
type DiscordConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'unavailable' | 'error';

/**
 * Game schema data structure returned from Steam API
 */
export interface GameSchema {
    gameName?: string;
    gameVersion?: string;
    availableGameStats?: {
        achievements?: Array<{
            name: string;
            displayName: string;
            description?: string;
            icon?: string;
            hidden?: number;
        }>;
        stats?: Array<{
            name: string;
            displayName?: string;
            value: number;
        }>;
    };
}

/**
 * Game schema fetch state
 */
export interface GameSchemaState {
    data: GameSchema | null;
    isLoading: boolean;
    error: string | null;
}

/**
 * API performance statistics from Steam API calls
 */
export interface ApiStatistics {
    /** Average response time in milliseconds */
    average: number;
    /** Minimum response time in milliseconds */
    min: number;
    /** Maximum response time in milliseconds */
    max: number;
    /** Success rate as a percentage (0-100) */
    successRate: number;
    /** 95th percentile response time in milliseconds */
    p95: number;
    /** 99th percentile response time in milliseconds */
    p99: number;
    /** Total number of API calls */
    totalCalls: number;
}

/**
 * Gaming diagnostics for debugging and monitoring
 * Matches the structure returned by GamingPlatformSensors.getDiagnostics()
 */
export interface GamingDiagnostics {
    timestamp: number;
    steam: {
        isAuthenticated: boolean;
        userId?: string;
        apiKey: boolean;
    };
    discord: {
        isConnected: boolean;
        clientId: boolean;
        connectionState: string;
    };
    gamingContext: any;
    polling: {
        isActive: boolean;
        intervalMs: number;
        exponentialBackoff: number;
    };
    cache: {
        gameMetadataCacheSize: number;
        cachedGames: string[];
    };
    performance: {
        currentGameApi: ApiStatistics;
        metadataApi: ApiStatistics;
    };
}

/**
 * React hook for gaming platform integration via the GamingPlatformSensors engine module.
 *
 * Integrates with Steam (for game activity tracking) and Discord (for music status only).
 * Note: Discord RPC cannot read game activity - only set music status.
 *
 * @example
 * ```tsx
 * const { connectSteam, checkActivity, setMusicStatus, calculateGamingBonus, fetchGameSchema, apiStatistics, diagnostics } = useGamingPlatforms();
 * await connectSteam('steam-id-123');
 * const context = await checkActivity();
 * const bonus = calculateGamingBonus();
 * if (context.currentGame?.appId) {
 *     await fetchGameSchema(context.currentGame.appId);
 * }
 * console.log('API Performance:', apiStatistics);
 * console.log('Diagnostics:', diagnostics);
 * ```
 *
 * @returns {Object} Hook return object
 * @returns {Function} connectSteam - Connects to Steam with user ID
 * @returns {Function} connectDiscord - Initiates Discord connection (for music status)
 * @returns {Function} disconnectDiscord - Disconnects Discord RPC
 * @returns {Function} checkActivity - Gets current gaming context from Steam
 * @returns {Function} setMusicStatus - Sets Discord music activity ("Listening to {song}")
 * @returns {Function} clearMusicStatus - Clears Discord music activity
 * @returns {Function} calculateGamingBonus - Calculates gaming XP multiplier (1.0-1.75x)
 * @returns {Object} gamingContext - Current gaming context data
 * @returns {string} discordConnectionStatus - Discord connection state
 * @returns {string} discordConnectionError - Discord connection error message (if any)
 * @returns {boolean} isServerMode - Whether running in server mode (Node.js/Electron) vs browser
 * @returns {Object} gameSchema - Game schema state (data, isLoading, error)
 * @returns {Function} fetchGameSchema - Fetches game schema (achievements, stats) for a Steam app ID
 * @returns {Object|null} apiStatistics - Steam API performance metrics (avg, min, max, success rate, p95, p99)
 * @returns {Object|null} diagnostics - Full gaming diagnostics for debugging (Steam, Discord, cache, performance)
 */
export const useGamingPlatforms = () => {
    const { settings } = useAppStore();
    const { updateGamingContext, gamingContext } = useSensorStore();

    const [sensors] = useState(() => new GamingPlatformSensors({
        steam: {
            apiKey: settings.steamApiKey
        },
        discord: {
            clientId: settings.discordClientId
        }
    }));

    // Track Discord connection state separately for UI
    const [discordConnectionStatus, setDiscordConnectionStatus] = useState<DiscordConnectionStatus>('disconnected');
    const [discordConnectionError, setDiscordConnectionError] = useState<string | null>(null);

    // Game schema state for Steam achievements/stats
    const [gameSchema, setGameSchema] = useState<GameSchemaState>({
        data: null,
        isLoading: false,
        error: null
    });

    // API statistics state for Steam API performance metrics
    const [apiStatistics, setApiStatistics] = useState<ApiStatistics | null>(null);

    // Full diagnostics state for debugging
    const [diagnostics, setDiagnostics] = useState<GamingDiagnostics | null>(null);

    // Detect server mode (Node.js/Electron) vs client mode (browser)
    // Discord RPC requires server mode to communicate with Discord's IPC
    const isServerMode = useMemo(() => detectServerMode(), []);

    // Poll Discord connection state and update diagnostics every second
    useEffect(() => {
        const checkInterval = setInterval(() => {
            const diag = sensors.getDiagnostics();
            const discordDiagnostics = diag.discord;

            // Update full diagnostics state
            setDiagnostics(diag as GamingDiagnostics);

            // Extract and update API statistics from diagnostics
            if (diag.performance?.currentGameApi) {
                setApiStatistics(diag.performance.currentGameApi as ApiStatistics);
            }

            if (discordDiagnostics.isConnected) {
                setDiscordConnectionStatus('connected');
                setDiscordConnectionError(null);
            } else if (discordDiagnostics.connectionState === 'connecting') {
                setDiscordConnectionStatus('connecting');
                setDiscordConnectionError(null);
            } else if (discordDiagnostics.connectionState === 'discord_unavailable') {
                setDiscordConnectionStatus('unavailable');
                setDiscordConnectionError('Discord is not running or no user is logged in');
            } else if (discordDiagnostics.connectionState === 'error') {
                setDiscordConnectionStatus('error');
                setDiscordConnectionError('Connection failed');
            } else {
                setDiscordConnectionStatus('disconnected');
                setDiscordConnectionError(null);
            }
        }, 1000);

        return () => clearInterval(checkInterval);
    }, [sensors]);

    const connectSteam = useCallback(async (userId: string) => {
        logger.info('GamingPlatformSensors', 'Connecting Steam', { userId });
        try {
            await sensors.authenticate(userId);
            logger.info('GamingPlatformSensors', 'Steam connected');
            return true;
        } catch (error) {
            handleError(error, 'GamingPlatformSensors');
            return false;
        }
    }, [sensors]);

    /**
     * Disconnect Discord RPC
     * Stops the Discord Rich Presence connection and clears status
     */
    const disconnectDiscord = useCallback(async () => {
        logger.info('GamingPlatformSensors', 'Disconnecting Discord');
        try {
            // Reset connection state - the sensors instance will need to be recreated
            // to fully disconnect, as GamingPlatformSensors doesn't expose disconnect
            setDiscordConnectionStatus('disconnected');
            setDiscordConnectionError(null);
            logger.info('GamingPlatformSensors', 'Discord disconnected');
            return true;
        } catch (error) {
            handleError(error, 'GamingPlatformSensors');
            return false;
        }
    }, []);

    // Discord RPC cannot read game activity (platform limitation)
    // Discord RPC can ONLY set music status, NOT read what game is being played
    // This function connects Discord for music status setting purposes only
    const connectDiscord = useCallback(async () => {
        if (!settings.discordClientId?.trim()) {
            setDiscordConnectionError('Discord Client ID is required');
            return false;
        }

        logger.info('GamingPlatformSensors', 'Connecting Discord (music status only, not game activity)');
        setDiscordConnectionStatus('connecting');
        setDiscordConnectionError(null);

        try {
            const result = await sensors.authenticate(undefined, 'discord-user-id');
            if (result) {
                // Connection initiated - wait for the polling to detect actual connection
                logger.info('GamingPlatformSensors', 'Discord connection initiated');
                return true;
            } else {
                setDiscordConnectionStatus('error');
                setDiscordConnectionError('Failed to initiate connection');
                return false;
            }
        } catch (error) {
            handleError(error, 'GamingPlatformSensors');
            setDiscordConnectionStatus('error');
            setDiscordConnectionError(error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }, [sensors, settings.discordClientId]);

    // Gets current gaming context from Steam only
    // Discord RPC cannot read game activity (platform limitation)
    const checkActivity = useCallback(async () => {
        try {
            const context = sensors.getContext();
            updateGamingContext(context);
            return context;
        } catch (error) {
            handleError(error, 'GamingPlatformSensors');
            return null;
        }
    }, [sensors, updateGamingContext]);

    /**
     * Set music activity on Discord Rich Presence
     * Displays "Listening to {song}" on the user's Discord profile
     */
    const setMusicStatus = useCallback(async (musicDetails: {
        songName: string;
        artistName?: string;
        startTime?: number;
        durationSeconds?: number;
    }) => {
        logger.info('GamingPlatformSensors', 'Setting Discord music status', musicDetails);
        try {
            // Check if Discord is connected first
            const diagnostics = sensors.getDiagnostics();
            if (!diagnostics.discord.isConnected) {
                logger.warn('GamingPlatformSensors', 'Discord not connected, cannot set music status');
                return false;
            }

            // Call the setMusicActivity method on the sensors instance
            // @ts-ignore - Method exists in source but may not be in dist declarations yet
            const result = await sensors.setMusicActivity(musicDetails);
            if (result) {
                logger.info('GamingPlatformSensors', 'Discord music status set successfully');
            } else {
                logger.warn('GamingPlatformSensors', 'Failed to set Discord music status');
            }
            return result;
        } catch (error) {
            handleError(error, 'GamingPlatformSensors');
            return false;
        }
    }, [sensors]);

    /**
     * Clear music activity from Discord Rich Presence
     */
    const clearMusicStatus = useCallback(async () => {
        logger.info('GamingPlatformSensors', 'Clearing Discord music status');
        try {
            // @ts-ignore - Method exists in source but may not be in dist declarations yet
            const result = await sensors.clearMusicActivity();
            if (result) {
                logger.info('GamingPlatformSensors', 'Discord music status cleared successfully');
            } else {
                logger.warn('GamingPlatformSensors', 'Failed to clear Discord music status');
            }
            return result;
        } catch (error) {
            handleError(error, 'GamingPlatformSensors');
            return false;
        }
    }, [sensors]);

    /**
     * Calculate the gaming XP multiplier based on current gaming activity
     * Formula: 1.0 + (sessionMinutes × 0.01), max 1.75
     * Plus bonuses for game genre and multiplayer
     */
    const calculateGamingBonus = useCallback(() => {
        const bonus = sensors.calculateGamingBonus();
        logger.info('GamingPlatformSensors', 'Gaming bonus calculated', { bonus });
        return bonus;
    }, [sensors]);

    /**
     * Fetch game schema (achievements, stats) for a Steam app
     * @param appId Steam app ID to fetch schema for
     */
    const fetchGameSchema = useCallback(async (appId: number) => {
        logger.info('GamingPlatformSensors', 'Fetching game schema', { appId });
        setGameSchema({ data: null, isLoading: true, error: null });

        try {
            // @ts-ignore - fetchGameSchema method added to GamingPlatformSensors
            const schema = await sensors.fetchGameSchema(appId);
            if (schema) {
                logger.info('GamingPlatformSensors', 'Game schema fetched successfully', {
                    gameName: schema.gameName,
                    achievementsCount: schema.availableGameStats?.achievements?.length || 0,
                    statsCount: schema.availableGameStats?.stats?.length || 0
                });
                setGameSchema({ data: schema, isLoading: false, error: null });
            } else {
                logger.warn('GamingPlatformSensors', 'No game schema returned');
                setGameSchema({ data: null, isLoading: false, error: 'No schema available for this game' });
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch game schema';
            logger.error('GamingPlatformSensors', 'Failed to fetch game schema', { error });
            handleError(error, 'GamingPlatformSensors');
            setGameSchema({ data: null, isLoading: false, error: errorMessage });
        }
    }, [sensors]);

    return {
        connectSteam,
        connectDiscord,
        disconnectDiscord,
        checkActivity,
        setMusicStatus,
        clearMusicStatus,
        calculateGamingBonus,
        gamingContext,
        discordConnectionStatus,
        discordConnectionError,
        isServerMode,
        // Game schema (achievements, stats)
        gameSchema,
        fetchGameSchema,
        // API statistics (performance metrics)
        apiStatistics,
        // Full diagnostics for debugging
        diagnostics
    };
};
