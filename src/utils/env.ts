import { z } from 'zod';
import { logger } from './logger';

/**
 * Environment Variable Utility
 *
 * Validates and exports environment variables.
 */

/**
 * Detect if running in server mode (Node.js/Electron) vs client mode (browser)
 * Discord RPC requires server mode to communicate with Discord's IPC
 *
 * @returns true if running in Node.js or Electron, false if running in browser
 */
export const isServerMode = (): boolean => {
    // Check if we're in a Node.js/Electron environment
    // In browser: window exists but process.versions.electron doesn't
    // In Electron: both window and process.versions.electron exist
    // In pure Node.js: window doesn't exist
    if (typeof window === 'undefined') {
        // Pure Node.js environment - server mode
        return true;
    }
    // Check for Electron environment - use globalThis to avoid TypeScript errors
    // @ts-ignore - process may not exist in browser
    const processObj = typeof globalThis !== 'undefined' ? (globalThis as any).process : undefined;
    if (processObj && processObj.versions?.electron) {
        return true;
    }
    // Browser environment - client mode (Discord RPC won't work)
    return false;
};

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
