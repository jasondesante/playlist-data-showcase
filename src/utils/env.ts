import { z } from 'zod';
import { logger } from './logger';

/**
 * Environment Variable Utility
 * 
 * Validates and exports environment variables.
 */

const envSchema = z.object({
    VITE_OPENWEATHER_API_KEY: z.string().optional(),
    VITE_STEAM_API_KEY: z.string().optional(), // Note: Steam API usually requires backend proxy, but for demo we might simulate or use if CORS allows (unlikely)
    VITE_DISCORD_CLIENT_ID: z.string().optional(),
    MODE: z.string().default('development'),
    DEV: z.boolean().default(false),
    PROD: z.boolean().default(false),
});

const processEnv = {
    VITE_OPENWEATHER_API_KEY: import.meta.env.VITE_OPENWEATHER_API_KEY,
    VITE_STEAM_API_KEY: import.meta.env.VITE_STEAM_API_KEY,
    VITE_DISCORD_CLIENT_ID: import.meta.env.VITE_DISCORD_CLIENT_ID,
    MODE: import.meta.env.MODE,
    DEV: import.meta.env.DEV,
    PROD: import.meta.env.PROD,
};

let env: z.infer<typeof envSchema>;

try {
    env = envSchema.parse(processEnv);
    logger.info('System', 'Environment variables loaded', { mode: env.MODE });
} catch (error) {
    logger.error('System', 'Invalid environment variables', error);
    // Fallback to default values to prevent crash
    env = {
        MODE: 'development',
        DEV: true,
        PROD: false,
    };
}

export const config = {
    openWeatherApiKey: env.VITE_OPENWEATHER_API_KEY || '',
    steamApiKey: env.VITE_STEAM_API_KEY || '',
    discordClientId: env.VITE_DISCORD_CLIENT_ID || '',
    isDev: env.DEV,
    isProd: env.PROD,
};
