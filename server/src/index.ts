/**
 * Playlist Data Server
 *
 * Bridge server for Steam API.
 * The browser can't call Steam API (CORS) directly,
 * so this server runs the engine's GamingPlatformSensors in Node.js
 * and exposes REST endpoints for the frontend.
 *
 * Usage:
 *   cp .env.example .env   # fill in your API keys (optional — can also set via /api/config)
 *   npm install
 *   npm run dev
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GamingPlatformSensors } from '../../../playlist-data-engine/src/index.ts';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.PORT || '3001', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

/**
 * Mutable runtime config. Can be updated via POST /api/config from the frontend.
 * Falls back to .env values if not set via API.
 */
const runtimeConfig = {
    steamApiKey: process.env.STEAM_API_KEY || '',
    steamUserId: process.env.STEAM_USER_ID || undefined,
};

// ---------------------------------------------------------------------------
// Engine instance — recreated when config changes
// ---------------------------------------------------------------------------

function createSensors() {
    return new GamingPlatformSensors({
        steam: {
            apiKey: runtimeConfig.steamApiKey,
            steamId: runtimeConfig.steamUserId,
        },
    });
}

let sensors = createSensors();

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        steam: { apiKeyConfigured: !!runtimeConfig.steamApiKey, userIdConfigured: !!runtimeConfig.steamUserId },
    });
});

// ---------------------------------------------------------------------------
// Config — allows frontend to push API keys at runtime
// ---------------------------------------------------------------------------

/**
 * Update runtime config (API keys) from the frontend.
 * Recreates the engine instance with new config.
 * POST /api/config  { steamApiKey? }
 */
app.post('/api/config', (req, res) => {
    const { steamApiKey } = req.body as {
        steamApiKey?: string;
    };

    if (steamApiKey !== undefined) {
        runtimeConfig.steamApiKey = String(steamApiKey);
    }

    // Stop monitoring on old instance
    sensors.stopMonitoring();

    // Recreate with new config
    sensors = createSensors();

    console.log('  Config updated:', {
        steamApiKey: runtimeConfig.steamApiKey ? '***' + runtimeConfig.steamApiKey.slice(-4) : 'not set',
    });

    res.json({
        success: true,
        steam: { apiKeyConfigured: !!runtimeConfig.steamApiKey },
    });
});

/**
 * Get current config state (without exposing secrets).
 * GET /api/config
 */
app.get('/api/config', (_req, res) => {
    res.json({
        steam: {
            apiKeyConfigured: !!runtimeConfig.steamApiKey,
            userIdConfigured: !!runtimeConfig.steamUserId,
        },
    });
});

// ---------------------------------------------------------------------------
// Steam routes
// ---------------------------------------------------------------------------

/**
 * Validate a Steam API key by making a test call to Steam.
 * POST /api/steam/validate-key  { apiKey: string }
 */
app.post('/api/steam/validate-key', async (req, res) => {
    const { apiKey } = req.body as { apiKey?: string };

    if (!apiKey || typeof apiKey !== 'string') {
        res.status(400).json({ valid: false, error: 'apiKey is required' });
        return;
    }

    try {
        const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=76561197960287930`;
        const response = await fetch(url);
        const data = await response.json();

        if (response.status === 403 || (data.error && data.error === 'Forbidden')) {
            res.json({ valid: false, error: 'Invalid API key. Please check your Steam API key and try again.' });
            return;
        }

        if (data.error) {
            res.json({ valid: false, error: `Steam API error: ${data.error}` });
            return;
        }

        if (data.response && data.response.players) {
            res.json({ valid: true });
            return;
        }

        res.json({ valid: false, error: 'Unexpected response from Steam API.' });
    } catch (err) {
        res.json({ valid: false, error: `Failed to reach Steam API: ${String(err)}` });
    }
});

/**
 * Authenticate with a Steam user ID.
 * POST /api/steam/auth  { steamId: string }
 */
app.post('/api/steam/auth', async (req, res) => {
    const { steamId } = req.body as { steamId?: string };

    if (!steamId || typeof steamId !== 'string') {
        res.status(400).json({ error: 'steamId is required' });
        return;
    }

    try {
        const success = await sensors.authenticate(steamId);
        // Start polling Steam in the background (no-op if already monitoring)
        sensors.startMonitoring();
        res.json({ success });
    } catch (err) {
        res.status(500).json({ error: String(err) });
    }
});

/**
 * Get the currently playing game on Steam.
 * GET /api/steam/game
 */
app.get('/api/steam/game', async (_req, res) => {
    try {
        const context = sensors.getContext();
        res.json(context);
    } catch (err) {
        res.status(500).json({ error: String(err) });
    }
});

/**
 * Trigger a gaming status update (polls Steam API now).
 * POST /api/steam/check-activity
 */
app.post('/api/steam/check-activity', async (_req, res) => {
    try {
        const success = await sensors.authenticate();
        const context = sensors.getContext();
        res.json({ success, context });
    } catch (err) {
        res.status(500).json({ error: String(err) });
    }
});

/**
 * Get the gaming XP bonus multiplier.
 * GET /api/steam/gaming-bonus
 */
app.get('/api/steam/gaming-bonus', (_req, res) => {
    const bonus = sensors.calculateGamingBonus();
    res.json({ bonus });
});

/**
 * Fetch game schema (achievements, stats) for a Steam app.
 * GET /api/steam/game-schema/:appId
 */
app.get('/api/steam/game-schema/:appId', async (req, res) => {
    const appId = parseInt(req.params.appId, 10);
    if (isNaN(appId)) {
        res.status(400).json({ error: 'appId must be a number' });
        return;
    }

    try {
        const schema = await sensors.fetchGameSchema(appId);
        res.json(schema);
    } catch (err) {
        res.status(500).json({ error: String(err) });
    }
});

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

/**
 * Full gaming diagnostics (Steam state, cache, API performance).
 * GET /api/diagnostics
 */
app.get('/api/diagnostics', (_req, res) => {
    const diag = sensors.getDiagnostics();
    res.json({
        ...diag,
        gamingBonus: sensors.calculateGamingBonus(),
    });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
    console.log(`\n  Playlist Data Server`);
    console.log(`  -------------------`);
    console.log(`  Steam API key:     ${runtimeConfig.steamApiKey ? 'configured' : 'NOT SET (set via frontend or .env)'}`);
    console.log(`  Steam user ID:     ${runtimeConfig.steamUserId || 'NOT SET (enter in frontend)'}`);
    console.log(`  Listening on:      http://localhost:${PORT}\n`);
});
