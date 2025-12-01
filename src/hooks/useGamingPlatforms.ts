import { useState, useCallback } from 'react';
import { GamingPlatformSensors } from 'playlist-data-engine';
import { useSensorStore } from '@/store/sensorStore';
import { useAppStore } from '@/store/appStore';
import { logger } from '@/utils/logger';
import { handleError } from '@/utils/errorHandling';

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

    const connectDiscord = useCallback(async () => {
        logger.info('GamingPlatformSensors', 'Connecting Discord');
        try {
            await sensors.authenticate(undefined, 'discord-user-id');
            logger.info('GamingPlatformSensors', 'Discord connected');
            return true;
        } catch (error) {
            handleError(error, 'GamingPlatformSensors');
            return false;
        }
    }, [sensors]);

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

    return { connectSteam, connectDiscord, checkActivity, gamingContext };
};
