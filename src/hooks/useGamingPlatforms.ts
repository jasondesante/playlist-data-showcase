import { useState, useCallback, useEffect } from 'react';
import type { GamingContext } from 'playlist-data-engine';
import { useSensorStore } from '@/store/sensorStore';
import { logger } from '@/utils/logger';
import { handleError } from '@/utils/errorHandling';
import { config } from '@/utils/env';

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
    average: number;
    min: number;
    max: number;
    successRate: number;
    p95: number;
    p99: number;
    totalCalls: number;
}

/**
 * Gaming diagnostics for debugging and monitoring
 */
export interface GamingDiagnostics {
    timestamp: number;
    steam: {
        isAuthenticated: boolean;
        userId?: string;
        apiKey: boolean;
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
 * Typed fetch helper for the gaming server.
 */
async function serverFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${config.gamingServerUrl}${path}`;
    const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });

    if (!response.ok) {
        const body = await response.json().catch(() => ({ error: `Server returned ${response.status}` }));
        throw new Error(body.error || `Server error ${response.status}`);
    }

    return response.json();
}

/**
 * React hook for gaming platform integration via the playlist-data-server bridge.
 *
 * Steam operations are proxied through the Node.js server
 * (because Steam API has CORS restrictions).
 * The server runs the engine's GamingPlatformSensors and exposes REST endpoints.
 */
export const useGamingPlatforms = () => {
    const { updateGamingContext, gamingContext } = useSensorStore();

    const [isServerMode, setIsServerMode] = useState(false);

    const [gameSchema, setGameSchema] = useState<GameSchemaState>({
        data: null,
        isLoading: false,
        error: null
    });

    const [apiStatistics, setApiStatistics] = useState<ApiStatistics | null>(null);
    const [diagnostics, setDiagnostics] = useState<GamingDiagnostics | null>(null);
    const [gamingBonus, setGamingBonus] = useState(1.0);

    // Check server health on mount
    useEffect(() => {
        const checkServer = async () => {
            try {
                await serverFetch('/api/health');
                setIsServerMode(true);
            } catch {
                setIsServerMode(false);
            }
        };
        checkServer();
        const interval = setInterval(checkServer, 10000);
        return () => clearInterval(interval);
    }, []);

    // Poll diagnostics from the server every 2 seconds
    useEffect(() => {
        if (!isServerMode) return;

        const pollDiagnostics = async () => {
            try {
                const diag = await serverFetch<GamingDiagnostics>('/api/diagnostics');
                setDiagnostics(diag);

                if (diag.performance?.currentGameApi) {
                    setApiStatistics(diag.performance.currentGameApi);
                }

                if (diag.gamingContext) {
                    updateGamingContext(diag.gamingContext as GamingContext);
                }

                if (typeof (diag as any).gamingBonus === 'number') {
                    setGamingBonus((diag as any).gamingBonus);
                }
            } catch (err) {
                logger.warn('GamingPlatformSensors', 'Failed to poll diagnostics', err);
            }
        };

        pollDiagnostics();
        const interval = setInterval(pollDiagnostics, 2000);
        return () => clearInterval(interval);
    }, [isServerMode, updateGamingContext]);

    const connectSteam = useCallback(async (userId: string) => {
        logger.info('GamingPlatformSensors', 'Connecting Steam via server', { userId });
        try {
            await serverFetch('/api/steam/auth', {
                method: 'POST',
                body: JSON.stringify({ steamId: userId }),
            });
            logger.info('GamingPlatformSensors', 'Steam connected');
            return true;
        } catch (error) {
            handleError(error, 'GamingPlatformSensors');
            return false;
        }
    }, []);

    const checkActivity = useCallback(async () => {
        try {
            const context = await serverFetch<GamingContext>('/api/steam/game');
            updateGamingContext(context);
            return context;
        } catch (error) {
            handleError(error, 'GamingPlatformSensors');
            return null;
        }
    }, [updateGamingContext]);

    const calculateGamingBonus = useCallback(() => {
        return gamingBonus;
    }, [gamingBonus]);

    const fetchGameSchema = useCallback(async (appId: number) => {
        logger.info('GamingPlatformSensors', 'Fetching game schema via server', { appId });
        setGameSchema({ data: null, isLoading: true, error: null });

        try {
            const schema = await serverFetch<GameSchema>(`/api/steam/game-schema/${appId}`);
            logger.info('GamingPlatformSensors', 'Game schema fetched successfully', {
                gameName: schema?.gameName,
                achievementsCount: schema?.availableGameStats?.achievements?.length || 0,
                statsCount: schema?.availableGameStats?.stats?.length || 0
            });
            setGameSchema({ data: schema, isLoading: false, error: null });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch game schema';
            logger.error('GamingPlatformSensors', 'Failed to fetch game schema', { error });
            handleError(error, 'GamingPlatformSensors');
            setGameSchema({ data: null, isLoading: false, error: errorMessage });
        }
    }, []);

    return {
        connectSteam,
        checkActivity,
        calculateGamingBonus,
        gamingContext,
        isServerMode,
        gameSchema,
        fetchGameSchema,
        apiStatistics,
        diagnostics,
    };
};
