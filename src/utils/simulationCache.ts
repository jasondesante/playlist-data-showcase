/**
 * Simulation Cache (Task 10.3.1)
 *
 * In-memory LRU cache for Monte Carlo combat simulation results.
 * Avoids re-running identical simulations by caching results keyed on
 * a deterministic hash of party, enemies, and simulation config.
 *
 * Cache is per-session (in-memory) — naturally invalidated on page reload.
 * Max 20 entries with LRU eviction.
 */

import type { CharacterSheet, SimulationConfig, SimulationResults } from 'playlist-data-engine';
import { logger } from '@/utils/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SimulationCacheEntry {
    results: SimulationResults;
    durationMs: number;
    timestamp: number;
    /** How many total runs the cached result contains */
    totalRuns: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum cached simulations (LRU eviction when exceeded) */
const MAX_CACHE_SIZE = 20;

// ─── Hashing ──────────────────────────────────────────────────────────────────

/**
 * Simple djb2-like string hash. Returns a base-36 string suitable for Map keys.
 * Not cryptographically secure — just needs to be fast and have low collision rate.
 */
function djb2Hash(str: string): string {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
    }
    return Math.abs(hash).toString(36);
}

/**
 * Extract combat-affecting fields from a CharacterSheet for fingerprinting.
 * Captures enough to detect when combat outcomes would differ.
 */
function combatantFingerprint(c: CharacterSheet): string {
    const scores = c.ability_scores;
    const equippedWeapons = c.equipment
        ? c.equipment.weapons
            .filter((e: any) => e.equipped)
            .map((e: any) => `${e.name}:${e.damage?.dice ?? ''}:${e.damage?.modifier ?? ''}`)
            .sort()
            .join(';')
        : '';

    return [
        c.seed,
        c.level,
        c.hp?.max ?? 0,
        c.armor_class ?? 0,
        scores?.STR ?? 10,
        scores?.DEX ?? 10,
        scores?.CON ?? 10,
        scores?.INT ?? 10,
        scores?.WIS ?? 10,
        scores?.CHA ?? 10,
        c.cr ?? '',
        equippedWeapons,
    ].join('|');
}

/**
 * Compute a deterministic cache key from the simulation inputs.
 * Two simulations with identical party, enemies, and config produce the same key.
 */
export function computeCacheKey(
    party: CharacterSheet[],
    enemies: CharacterSheet[],
    config: SimulationConfig,
): string {
    const partyKey = party.map(combatantFingerprint).sort().join('\n');
    const enemyKey = enemies.map(combatantFingerprint).sort().join('\n');

    const overrides = config.aiConfig.overrides && config.aiConfig.overrides.size > 0
        ? Array.from(config.aiConfig.overrides.entries()).sort((a, b) => a[0].localeCompare(b[0]))
        : null;

    const configKey = [
        config.baseSeed,
        config.runCount,
        config.aiConfig.playerStyle,
        config.aiConfig.enemyStyle,
        overrides ? JSON.stringify(overrides) : '',
        config.aiConfig.enableClassFeatures ? '1' : '0',
        config.combatConfig?.maxTurnsBeforeDraw ?? '',
        config.combatConfig?.allowFleeing ? '1' : '0',
        config.collectDetailedLogs ? '1' : '0',
    ].join('|');

    return djb2Hash(`${partyKey}\n${enemyKey}\n${configKey}`);
}

// ─── Cache Implementation ─────────────────────────────────────────────────────

class SimulationCache {
    private cache = new Map<string, SimulationCacheEntry>();
    private accessOrder: string[] = [];

    /**
     * Look up cached results for the given inputs.
     * Returns the cached entry if found (and moves it to most-recently-used).
     */
    get(
        party: CharacterSheet[],
        enemies: CharacterSheet[],
        config: SimulationConfig,
    ): SimulationCacheEntry | null {
        const key = computeCacheKey(party, enemies, config);
        const entry = this.cache.get(key);

        if (!entry) {
            logger.debug('SimulationCache', 'Cache miss', { key });
            return null;
        }

        // Move to most-recently-used
        this.touch(key);

        logger.info('SimulationCache', 'Cache hit', {
            key,
            totalRuns: entry.totalRuns,
            ageMs: Date.now() - entry.timestamp,
            durationMs: entry.durationMs,
        });

        return entry;
    }

    /**
     * Store simulation results in the cache.
     * Evicts the least-recently-used entry if the cache is full.
     */
    set(
        party: CharacterSheet[],
        enemies: CharacterSheet[],
        config: SimulationConfig,
        results: SimulationResults,
        durationMs: number,
    ): void {
        const key = computeCacheKey(party, enemies, config);

        // If already cached, update and touch
        if (this.cache.has(key)) {
            this.cache.set(key, {
                results,
                durationMs,
                timestamp: Date.now(),
                totalRuns: results.summary.totalRuns,
            });
            this.touch(key);
            logger.debug('SimulationCache', 'Updated existing cache entry', { key });
            return;
        }

        // Evict LRU if at capacity
        if (this.accessOrder.length >= MAX_CACHE_SIZE) {
            const lruKey = this.accessOrder.shift();
            if (lruKey) {
                this.cache.delete(lruKey);
                logger.debug('SimulationCache', 'Evicted LRU entry', { evictedKey: lruKey, remaining: this.cache.size });
            }
        }

        this.cache.set(key, {
            results,
            durationMs,
            timestamp: Date.now(),
            totalRuns: results.summary.totalRuns,
        });
        this.accessOrder.push(key);

        logger.info('SimulationCache', 'Cached simulation results', {
            key,
            totalRuns: results.summary.totalRuns,
            cacheSize: this.cache.size,
        });
    }

    /** Check if a cache entry exists without retrieving it */
    has(
        party: CharacterSheet[],
        enemies: CharacterSheet[],
        config: SimulationConfig,
    ): boolean {
        return this.cache.has(computeCacheKey(party, enemies, config));
    }

    /** Clear the entire cache */
    clear(): void {
        const count = this.cache.size;
        this.cache.clear();
        this.accessOrder = [];
        if (count > 0) {
            logger.info('SimulationCache', `Cleared ${count} cached simulation(s)`);
        }
    }

    /** Get the number of cached entries */
    get size(): number {
        return this.cache.size;
    }

    /** Move a key to the end of the access order (most recently used) */
    private touch(key: string): void {
        const idx = this.accessOrder.indexOf(key);
        if (idx !== -1) {
            this.accessOrder.splice(idx, 1);
        }
        this.accessOrder.push(key);
    }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

/** Global simulation cache instance */
export const simulationCache = new SimulationCache();
