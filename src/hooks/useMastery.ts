import { useMemo, useCallback, useRef } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { PrestigeSystem, type PrestigeLevel, type PrestigeInfo } from '@/types';

/**
 * Information about a track's mastery status.
 * Uses dual requirements (plays AND XP) for mastery determination.
 */
export interface MasteryInfo {
    /** Number of times the track has been listened to */
    listenCount: number;
    /** Current prestige level (0-10) */
    prestigeLevel: PrestigeLevel;
    /** Total XP earned for this track */
    totalXP: number;
    /** Plays threshold for current prestige level */
    playsThreshold: number;
    /** XP threshold for current prestige level */
    xpThreshold: number;
    /** Progress toward plays threshold (0-1) */
    playsProgress: number;
    /** Progress toward XP threshold (0-1) */
    xpProgress: number;
    /** Whether BOTH thresholds are met (true mastery status) */
    isMastered: boolean;
    /** Whether character can prestige (mastered + not at max) */
    canPrestige: boolean;
    /** Roman numeral for prestige level */
    prestigeRoman: string;
    /** Whether at max prestige level */
    isMaxPrestige: boolean;
}

/**
 * Build a map of track UUID to listen count from session history.
 */
function buildListenCountMap(
    sessions: Array<{ track_uuid: string }>
): Map<string, number> {
    const countMap = new Map<string, number>();
    for (const session of sessions) {
        const currentCount = countMap.get(session.track_uuid) ?? 0;
        countMap.set(session.track_uuid, currentCount + 1);
    }
    return countMap;
}

/**
 * Build a map of track UUID to total XP from session history.
 */
function buildXPMap(
    sessions: Array<{ track_uuid: string; total_xp_earned: number }>
): Map<string, number> {
    const xpMap = new Map<string, number>();
    for (const session of sessions) {
        const currentXP = xpMap.get(session.track_uuid) ?? 0;
        xpMap.set(session.track_uuid, currentXP + (session.total_xp_earned || 0));
    }
    return xpMap;
}

/**
 * Build mastery info.
 * Uses dual requirements (plays AND XP) for mastery determination.
 */
function buildMasteryInfo(
    listenCount: number,
    totalXP: number,
    prestigeLevel: PrestigeLevel
): MasteryInfo {
    const playsThreshold = PrestigeSystem.getPlaysThreshold(prestigeLevel);
    const xpThreshold = PrestigeSystem.getXPThreshold(prestigeLevel);
    const isMastered = PrestigeSystem.isMastered(listenCount, totalXP, prestigeLevel);
    const canPrestige = PrestigeSystem.canPrestige(prestigeLevel, listenCount, totalXP);
    const isMaxPrestige = prestigeLevel >= 10;
    const prestigeRoman = PrestigeSystem.toRomanNumeral(prestigeLevel);

    // Calculate progress (0-1) toward each threshold
    const playsProgress = Math.min(1, listenCount / playsThreshold);
    const xpProgress = Math.min(1, totalXP / xpThreshold);

    return {
        listenCount,
        prestigeLevel,
        totalXP,
        playsThreshold,
        xpThreshold,
        playsProgress,
        xpProgress,
        isMastered,
        canPrestige,
        prestigeRoman,
        isMaxPrestige
    };
}

/**
 * React hook for accessing track mastery information.
 *
 * Provides mastery level calculations based on dual requirements (plays AND XP)
 * from the session store. True mastery requires meeting BOTH thresholds.
 *
 * Performance optimizations:
 * - Memoized listen count map for O(1) lookups instead of O(n) filtering
 * - Cached mastery info per track to avoid recalculation
 * - Stable callback references to prevent unnecessary re-renders
 *
 * @example
 * ```tsx
 * const { getMasteryInfo, getTrackListenCount } = useMastery();
 *
 * // Get mastery info for a character with prestige level 2
 * const masteryInfo = getMasteryInfo('track-uuid-123', 2);
 * console.log(`Plays: ${masteryInfo.listenCount}, Mastered: ${masteryInfo.isMastered}`);
 * if (masteryInfo.canPrestige) {
 *   console.log(`Can prestige! Roman numeral: ${masteryInfo.prestigeRoman}`);
 * }
 * ```
 */
export const useMastery = () => {
    const sessionHistory = useSessionStore((state) => state.sessionHistory);

    /**
     * Memoized map of track UUID -> listen count.
     */
    const listenCountMap = useMemo(
        () => buildListenCountMap(sessionHistory),
        [sessionHistory]
    );

    /**
     * Memoized map of track UUID -> total XP.
     */
    const xpMap = useMemo(
        () => buildXPMap(sessionHistory),
        [sessionHistory]
    );

    /**
     * Cache for mastery info (keyed by trackId + prestigeLevel).
     */
    const masteryInfoCacheRef = useRef<Map<string, MasteryInfo>>(new Map());
    const prevListenCountMapRef = useRef<Map<string, number> | null>(null);
    const prevXPMapRef = useRef<Map<string, number> | null>(null);

    /**
     * Clear cache when maps change.
     */
    if (listenCountMap !== prevListenCountMapRef.current || xpMap !== prevXPMapRef.current) {
        masteryInfoCacheRef.current.clear();
        prevListenCountMapRef.current = listenCountMap;
        prevXPMapRef.current = xpMap;
    }

    /**
     * Get the number of times a track has been listened to.
     */
    const getTrackListenCount = useCallback((trackId: string): number => {
        return listenCountMap.get(trackId) ?? 0;
    }, [listenCountMap]);

    /**
     * Get total XP earned for a track.
     */
    const getTrackXP = useCallback((trackId: string): number => {
        return xpMap.get(trackId) ?? 0;
    }, [xpMap]);

    /**
     * Check if a track is mastered (dual requirements: plays AND XP).
     */
    const isTrackMastered = useCallback(
        (trackId: string, prestigeLevel: PrestigeLevel = 0): boolean => {
            const listenCount = listenCountMap.get(trackId) ?? 0;
            const totalXP = xpMap.get(trackId) ?? 0;
            return PrestigeSystem.isMastered(listenCount, totalXP, prestigeLevel);
        },
        [listenCountMap, xpMap]
    );

    /**
     * Get complete mastery information for a track.
     * Uses dual requirements (plays AND XP) for mastery determination.
     *
     * @param trackId - The track UUID
     * @param prestigeLevel - Current prestige level (0-10), defaults to 0
     * @returns MasteryInfo with complete mastery and prestige data
     */
    const getMasteryInfo = useCallback(
        (trackId: string, prestigeLevel: PrestigeLevel = 0): MasteryInfo => {
            const cacheKey = `${trackId}-${prestigeLevel}`;

            const cached = masteryInfoCacheRef.current.get(cacheKey);
            if (cached) {
                return cached;
            }

            const listenCount = listenCountMap.get(trackId) ?? 0;
            const totalXP = xpMap.get(trackId) ?? 0;
            const info = buildMasteryInfo(listenCount, totalXP, prestigeLevel);
            masteryInfoCacheRef.current.set(cacheKey, info);

            return info;
        },
        [listenCountMap, xpMap]
    );

    /**
     * Get engine's PrestigeInfo for a track.
     */
    const getEnginePrestigeInfo = useCallback(
        (trackId: string, prestigeLevel: PrestigeLevel = 0): PrestigeInfo => {
            const listenCount = listenCountMap.get(trackId) ?? 0;
            const totalXP = xpMap.get(trackId) ?? 0;
            return PrestigeSystem.getPrestigeInfo(prestigeLevel, listenCount, totalXP);
        },
        [listenCountMap, xpMap]
    );

    return useMemo(
        () => ({
            getMasteryInfo,
            getTrackListenCount,
            getTrackXP,
            isTrackMastered,
            getEnginePrestigeInfo
        }),
        [
            getMasteryInfo,
            getTrackListenCount,
            getTrackXP,
            isTrackMastered,
            getEnginePrestigeInfo
        ]
    );
};
