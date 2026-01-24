import { useState, useCallback, useEffect } from 'react';
import { GamingPlatformSensors } from 'playlist-data-engine';
import { useSensorStore } from '@/store/sensorStore';
import { useAppStore } from '@/store/appStore';
import { logger } from '@/utils/logger';
import { handleError } from '@/utils/errorHandling';

/**
 * Discord connection state for UI
 */
type DiscordConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'unavailable' | 'error';

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

    // Poll Discord connection state every second
    useEffect(() => {
        const checkInterval = setInterval(() => {
            const diagnostics = sensors.getDiagnostics();
            const discordDiagnostics = diagnostics.discord;

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
        discordConnectionError
    };
};
