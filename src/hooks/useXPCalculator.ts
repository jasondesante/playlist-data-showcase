import { useState, useCallback } from 'react';
import { XPCalculator, EnvironmentalContext, GamingContext, ListeningSession } from 'playlist-data-engine';
import { logger } from '@/utils/logger';
import { handleError } from '@/utils/errorHandling';
import { useAppStore } from '@/store/appStore';

export const useXPCalculator = () => {
    const { settings } = useAppStore();
    const [calculator] = useState(() => new XPCalculator({
        xp_per_second: settings.baseXpRate
    }));

    const calculateXP = useCallback((
        durationSeconds: number,
        envContext?: EnvironmentalContext,
        gamingContext?: GamingContext,
        isMastered: boolean = false
    ) => {
        logger.info('XPCalculator', 'Calculating XP', { durationSeconds, isMastered });

        try {
            // Create a mock session for calculation
            const mockSession: ListeningSession = {
                track_uuid: 'temp',
                start_time: Date.now(),
                end_time: Date.now() + (durationSeconds * 1000),
                duration_seconds: durationSeconds,
                base_xp_earned: 0,
                bonus_xp: 0,
                total_xp_earned: 0,
                environmental_context: envContext,
                gaming_context: gamingContext
            };

            const totalXp = calculator.calculateSessionXP(mockSession);

            logger.info('XPCalculator', 'Calculation result', { totalXp });
            return { totalXp, baseXp: mockSession.base_xp_earned, bonusXp: totalXp - mockSession.base_xp_earned };
        } catch (error) {
            handleError(error, 'XPCalculator');
            return null;
        }
    }, [calculator]);

    return { calculateXP };
};
