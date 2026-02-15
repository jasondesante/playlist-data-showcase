import { useMemo, useCallback } from 'react';
import { useSessionStore } from '@/store/sessionStore';

/**
 * Mastery level thresholds
 * Based on listen counts, determines the mastery badge displayed
 */
export const MASTERY_THRESHOLDS = {
    NONE: 0,       // 0 listens - no badge
    BASIC: 1,      // 1 listen
    FAMILIAR: 5,   // 5 listens
    MASTERED: 10   // 10 listens - engine default
} as const;

/**
 * Mastery level names matching the thresholds
 */
export type MasteryLevel = 'none' | 'basic' | 'familiar' | 'mastered';

/**
 * Information about a track's mastery status
 */
export interface MasteryInfo {
    /** Current mastery level name */
    level: MasteryLevel;
    /** Number of times the track has been listened to */
    listenCount: number;
    /** Whether the track has reached mastered status (10+ listens) */
    isMastered: boolean;
    /** Progress toward the next mastery level (0-100) */
    progressPercent: number;
    /** Number of listens needed to reach the next level */
    listensToNextLevel: number;
    /** The next mastery level name, or null if already mastered */
    nextLevel: MasteryLevel | null;
}

/**
 * Determine mastery level name from listen count
 */
function getMasteryLevelFromCount(listenCount: number): MasteryLevel {
    if (listenCount >= MASTERY_THRESHOLDS.MASTERED) {
        return 'mastered';
    } else if (listenCount >= MASTERY_THRESHOLDS.FAMILIAR) {
        return 'familiar';
    } else if (listenCount >= MASTERY_THRESHOLDS.BASIC) {
        return 'basic';
    }
    return 'none';
}

/**
 * Calculate progress percentage toward the next mastery level
 */
function calculateProgressPercent(listenCount: number): number {
    if (listenCount >= MASTERY_THRESHOLDS.MASTERED) {
        return 100; // Already mastered
    }

    let currentThreshold: number;
    let nextThreshold: number;

    if (listenCount >= MASTERY_THRESHOLDS.FAMILIAR) {
        // Progress from FAMILIAR (5) to MASTERED (10)
        currentThreshold = MASTERY_THRESHOLDS.FAMILIAR;
        nextThreshold = MASTERY_THRESHOLDS.MASTERED;
    } else if (listenCount >= MASTERY_THRESHOLDS.BASIC) {
        // Progress from BASIC (1) to FAMILIAR (5)
        currentThreshold = MASTERY_THRESHOLDS.BASIC;
        nextThreshold = MASTERY_THRESHOLDS.FAMILIAR;
    } else {
        // Progress from NONE (0) to BASIC (1)
        currentThreshold = MASTERY_THRESHOLDS.NONE;
        nextThreshold = MASTERY_THRESHOLDS.BASIC;
    }

    const rangeSize = nextThreshold - currentThreshold;
    const progressInRange = listenCount - currentThreshold;
    return Math.min(100, Math.round((progressInRange / rangeSize) * 100));
}

/**
 * Get the next mastery level name
 */
function getNextLevel(currentLevel: MasteryLevel): MasteryLevel | null {
    switch (currentLevel) {
        case 'none':
            return 'basic';
        case 'basic':
            return 'familiar';
        case 'familiar':
            return 'mastered';
        case 'mastered':
        default:
            return null; // Already at max level
    }
}

/**
 * React hook for accessing track mastery information.
 *
 * Provides mastery level calculations based on listen counts from the
 * session store. This hook uses the session history to determine how
 * many times a track has been listened to.
 *
 * @example
 * ```tsx
 * const { getMasteryInfo, getTrackListenCount, getTrackMasteryLevel } = useMastery();
 *
 * const masteryInfo = getMasteryInfo('track-uuid-123');
 * console.log(`Level: ${masteryInfo.level}, Progress: ${masteryInfo.progressPercent}%`);
 * ```
 *
 * @returns {Object} Hook return object
 * @returns {Function} getMasteryInfo - Get complete mastery info for a track
 * @returns {Function} getTrackListenCount - Get listen count for a track
 * @returns {Function} getTrackMasteryLevel - Get mastery level name from listen count
 * @returns {Function} isTrackMastered - Check if a track is mastered (10+ listens)
 */
export const useMastery = () => {
    const sessionHistory = useSessionStore((state) => state.sessionHistory);

    /**
     * Get the number of times a track has been listened to
     * by counting sessions in the history for that track UUID
     */
    const getTrackListenCount = useCallback((trackId: string): number => {
        return sessionHistory.filter(session => session.track_uuid === trackId).length;
    }, [sessionHistory]);

    /**
     * Get mastery level name from a listen count
     */
    const getTrackMasteryLevel = useCallback((listenCount: number): MasteryLevel => {
        return getMasteryLevelFromCount(listenCount);
    }, []);

    /**
     * Check if a track is mastered (10+ listens by default)
     */
    const isTrackMastered = useCallback((trackId: string, threshold: number = MASTERY_THRESHOLDS.MASTERED): boolean => {
        const listenCount = getTrackListenCount(trackId);
        return listenCount >= threshold;
    }, [getTrackListenCount]);

    /**
     * Get complete mastery information for a track
     */
    const getMasteryInfo = useCallback((trackId: string): MasteryInfo => {
        const listenCount = getTrackListenCount(trackId);
        const level = getMasteryLevelFromCount(listenCount);
        const isMastered = listenCount >= MASTERY_THRESHOLDS.MASTERED;
        const progressPercent = calculateProgressPercent(listenCount);
        const nextLevel = getNextLevel(level);

        // Calculate listens needed to reach next level
        let listensToNextLevel = 0;
        if (nextLevel === 'basic') {
            listensToNextLevel = MASTERY_THRESHOLDS.BASIC - listenCount;
        } else if (nextLevel === 'familiar') {
            listensToNextLevel = MASTERY_THRESHOLDS.FAMILIAR - listenCount;
        } else if (nextLevel === 'mastered') {
            listensToNextLevel = MASTERY_THRESHOLDS.MASTERED - listenCount;
        }

        return {
            level,
            listenCount,
            isMastered,
            progressPercent,
            listensToNextLevel,
            nextLevel
        };
    }, [getTrackListenCount]);

    // Memoize the return object to prevent unnecessary re-renders
    return useMemo(() => ({
        getMasteryInfo,
        getTrackListenCount,
        getTrackMasteryLevel,
        isTrackMastered,
        MASTERY_THRESHOLDS
    }), [getMasteryInfo, getTrackListenCount, getTrackMasteryLevel, isTrackMastered]);
};
