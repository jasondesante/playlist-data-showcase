import { useEffect, useRef, useState } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { useCharacterStore } from '@/store/characterStore';
import { useCharacterUpdater } from '@/hooks/useCharacterUpdater';
import { showToast } from '@/components/ui/Toast';
import { logger } from '@/utils/logger';
import type { LevelUpDetail } from 'playlist-data-engine';

/**
 * Hook that processes completed sessions and applies XP to characters.
 *
 * Watches for new sessions being added to session history and automatically:
 * 1. Gets the active character
 * 2. Processes the session to apply XP
 * 3. Shows toasts for XP earned and level-ups
 * 4. Returns level-up details for modal display
 *
 * This ensures XP is applied whether the session ends via:
 * - Manual stop button click
 * - Auto-end on pause/track end
 * - Any other session termination
 */
export const useSessionCompletion = () => {
    const { sessionHistory } = useSessionStore();
    const { getActiveCharacter } = useCharacterStore();
    const { processSession } = useCharacterUpdater();

    // Track which sessions we've already processed
    const processedSessionsRef = useRef<Set<string>>(new Set());

    // Track if we've done the initial load (to skip processing persisted sessions)
    const hasInitializedRef = useRef(false);

    // State for level-up modal
    const [showLevelUpModal, setShowLevelUpModal] = useState(false);
    const [levelUpDetails, setLevelUpDetails] = useState<LevelUpDetail[]>([]);

    useEffect(() => {
        if (sessionHistory.length === 0) return;

        // On first encounter with sessionHistory data (after Zustand rehydration),
        // mark all existing sessions as processed and skip processing.
        // This prevents re-processing old persisted sessions on page load.
        if (!hasInitializedRef.current) {
            logger.info('SessionCompletion', 'Initial load - marking existing sessions as processed', {
                count: sessionHistory.length
            });
            for (const session of sessionHistory) {
                const sessionKey = `${session.track_uuid}-${session.start_time}-${session.end_time}`;
                processedSessionsRef.current.add(sessionKey);
            }
            hasInitializedRef.current = true;
            return; // Skip processing on initial load
        }

        // Get the most recent session
        const latestSession = sessionHistory[0];

        // Create a unique ID for this session
        const sessionKey = `${latestSession.track_uuid}-${latestSession.start_time}-${latestSession.end_time}`;

        // Skip if we've already processed this session
        if (processedSessionsRef.current.has(sessionKey)) {
            return;
        }

        // Mark as processed
        processedSessionsRef.current.add(sessionKey);

        // Get the active character
        const activeChar = getActiveCharacter();

        if (!activeChar) {
            logger.info('SessionCompletion', 'Session ended but no active character - XP not saved', {
                sessionKey,
                xp: latestSession.total_xp_earned
            });
            showToast('⚠️ No active character selected - XP not saved', 'warning');
            showToast(`Session ended: ${latestSession.duration_seconds}s tracked`, 'info');
            return;
        }

        // Process the session for XP
        logger.info('SessionCompletion', 'Processing completed session', {
            sessionKey,
            characterName: activeChar.name,
            xp: latestSession.total_xp_earned
        });

        const result = processSession(activeChar, latestSession);

        if (result) {
            // Show success toast when XP applied
            showToast(`⭐ +${latestSession.total_xp_earned} XP earned!`, 'success');

            // Handle level-up
            if (result.leveledUp) {
                // For uncapped mode, show auto-apply notification if stats were increased
                if (activeChar.gameMode === 'uncapped' && result.levelUpDetails && result.levelUpDetails.length > 0) {
                    const allStatIncreases: Array<{ ability: string; delta: number; oldValue: number; newValue: number }> = [];
                    for (const detail of result.levelUpDetails) {
                        if (detail.statIncreases) {
                            for (const stat of detail.statIncreases) {
                                allStatIncreases.push({
                                    ability: stat.ability,
                                    delta: stat.delta,
                                    oldValue: stat.oldValue,
                                    newValue: stat.newValue
                                });
                            }
                        }
                    }
                    if (allStatIncreases.length > 0) {
                        const statChangeText = allStatIncreases
                            .map((inc) => `${inc.ability} +${inc.delta} (${inc.oldValue} → ${inc.newValue})`)
                            .join(', ');
                        showToast(`📊 Stats auto-increased: ${statChangeText}`, 'info');
                    }
                }

                // Show level-up modal with details
                if (result.levelUpDetails && result.levelUpDetails.length > 0) {
                    setLevelUpDetails(result.levelUpDetails);
                    setShowLevelUpModal(true);
                }
            }
        }

        // Clean up old processed sessions to prevent memory leak
        // Keep only the last 100 session keys
        if (processedSessionsRef.current.size > 100) {
            const entries = Array.from(processedSessionsRef.current);
            entries.slice(0, entries.length - 100).forEach(key => {
                processedSessionsRef.current.delete(key);
            });
        }

    }, [sessionHistory, getActiveCharacter, processSession]);

    // Handler for closing level-up modal
    const closeLevelUpModal = () => {
        setShowLevelUpModal(false);
        setLevelUpDetails([]);
    };

    return {
        showLevelUpModal,
        levelUpDetails,
        closeLevelUpModal
    };
};
