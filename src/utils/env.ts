import { z } from 'zod';
import { logger } from './logger';

/**
 * Environment Variable Utility
 *
 * Validates and exports environment variables.
 */

const envSchema = z.object({
    VITE_OPENWEATHER_API_KEY: z.string().optional(),
    VITE_STEAM_API_KEY: z.string().optional(),
    // Gaming server URL (playlist-data-server bridge for Steam API)
    VITE_GAMING_SERVER_URL: z.string().default('http://localhost:3001'),
    // Arweave gateway configuration
    VITE_ARWEAVE_GATEWAY: z.string().optional(),
    VITE_ARWEAVE_FALLBACK_GATEWAYS: z.string().optional(),
    VITE_ARWEAVE_GATEWAY_TIMEOUT: z.string().optional(),
    VITE_ARWEAVE_CACHE_TTL: z.string().optional(),
    MODE: z.string().default('development'),
    DEV: z.boolean().default(false),
    PROD: z.boolean().default(false),
});

const processEnv = {
    VITE_OPENWEATHER_API_KEY: import.meta.env.VITE_OPENWEATHER_API_KEY,
    VITE_STEAM_API_KEY: import.meta.env.VITE_STEAM_API_KEY,
    VITE_GAMING_SERVER_URL: import.meta.env.VITE_GAMING_SERVER_URL,
    // Arweave gateway configuration
    VITE_ARWEAVE_GATEWAY: import.meta.env.VITE_ARWEAVE_GATEWAY,
    VITE_ARWEAVE_FALLBACK_GATEWAYS: import.meta.env.VITE_ARWEAVE_FALLBACK_GATEWAYS,
    VITE_ARWEAVE_GATEWAY_TIMEOUT: import.meta.env.VITE_ARWEAVE_GATEWAY_TIMEOUT,
    VITE_ARWEAVE_CACHE_TTL: import.meta.env.VITE_ARWEAVE_CACHE_TTL,
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
        VITE_GAMING_SERVER_URL: 'http://localhost:3001',
    };
}

export const config = {
    openWeatherApiKey: env.VITE_OPENWEATHER_API_KEY || '',
    steamApiKey: env.VITE_STEAM_API_KEY || '',
    gamingServerUrl: env.VITE_GAMING_SERVER_URL || 'http://localhost:3001',
    isDev: env.DEV,
    isProd: env.PROD,
    // Arweave gateway configuration
    arweaveGateway: env.VITE_ARWEAVE_GATEWAY || 'arweave.net',
    arweaveFallbackGateways: env.VITE_ARWEAVE_FALLBACK_GATEWAYS
        ? env.VITE_ARWEAVE_FALLBACK_GATEWAYS.split(',').map((g) => g.trim())
        : ['ardrive.net', 'turbo-gateway.com'],
    arweaveGatewayTimeout: env.VITE_ARWEAVE_GATEWAY_TIMEOUT
        ? parseInt(env.VITE_ARWEAVE_GATEWAY_TIMEOUT, 10)
        : 5000,
    arweaveCacheTTL: env.VITE_ARWEAVE_CACHE_TTL
        ? parseInt(env.VITE_ARWEAVE_CACHE_TTL, 10)
        : 7200000, // 2 hours
};
