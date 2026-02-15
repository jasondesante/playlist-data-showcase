import { useMemo, useState, useEffect, useRef } from 'react';
import { PartyAnalyzer, CharacterSheet, PartyAnalysis } from 'playlist-data-engine';
import { logger } from '@/utils/logger';

/**
 * Loading delay in milliseconds for UX purposes.
 * Since analysis is synchronous, we add a brief delay to show the loading state
 * and provide visual feedback to the user.
 */
const LOADING_DELAY_MS = 150;

/**
 * Minimum time to show loading skeleton (prevents flash)
 */
const MIN_LOADING_TIME_MS = 300;

/**
 * Type for timeout handles that works in both browser and Node environments
 */
type TimeoutHandle = ReturnType<typeof setTimeout>;

/**
 * React hook for analyzing party strength using the PartyAnalyzer engine module.
 *
 * This hook provides memoized party analysis based on selected characters,
 * calculating average stats, XP budgets for encounter difficulties, and
 * overall party strength using D&D 5e encounter building rules.
 *
 * Includes loading state management for UI feedback.
 *
 * @example
 * ```tsx
 * const { analysis, isLoading, selectedCount } = usePartyAnalysis(characters, selectedSeeds);
 * if (isLoading) {
 *   return <LoadingSkeleton />;
 * }
 * if (analysis) {
 *   console.log(`Party Level: ${analysis.averageLevel}`);
 *   console.log(`Easy XP Budget: ${analysis.easyXP}`);
 * }
 * ```
 *
 * @param characters - Array of all available characters
 * @param selectedSeeds - Set of seeds for characters selected for analysis
 * @returns Object containing analysis result, loading state, and selected count
 */
export function usePartyAnalysis(
    characters: CharacterSheet[],
    selectedSeeds: Set<string>
): { analysis: PartyAnalysis | null; isLoading: boolean } {
    const [isLoading, setIsLoading] = useState(false);
    const [displayedAnalysis, setDisplayedAnalysis] = useState<PartyAnalysis | null>(null);
    const loadingTimeoutRef = useRef<TimeoutHandle | null>(null);
    const minLoadingTimeoutRef = useRef<TimeoutHandle | null>(null);

    // Calculate the actual analysis (memoized)
    const calculatedAnalysis = useMemo(() => {
        // Filter characters by selection
        const selectedCharacters = characters.filter(c => selectedSeeds.has(c.seed));

        // Return null if no characters selected
        if (selectedCharacters.length === 0) {
            logger.debug('PartyAnalysis', 'No characters selected for analysis');
            return null;
        }

        logger.debug('PartyAnalysis', 'Analyzing party', {
            selectedCount: selectedCharacters.length,
            totalCount: characters.length
        });

        // Call PartyAnalyzer.analyzeParty() with selected characters
        try {
            const result = PartyAnalyzer.analyzeParty(selectedCharacters);

            logger.debug('PartyAnalysis', 'Analysis complete', {
                averageLevel: result.averageLevel,
                partySize: result.partySize,
                totalStrength: result.totalStrength
            });

            return result;
        } catch (error) {
            logger.error('PartyAnalysis', 'Failed to analyze party', error);
            return null;
        }
    }, [characters, selectedSeeds]);

    // Track the previous analysis to detect changes
    const prevAnalysisRef = useRef<PartyAnalysis | null>(null);

    useEffect(() => {
        // Clear any existing timeouts
        if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
        }
        if (minLoadingTimeoutRef.current) {
            clearTimeout(minLoadingTimeoutRef.current);
        }

        // Check if analysis has meaningfully changed
        const hasAnalysisChanged =
            (prevAnalysisRef.current === null && calculatedAnalysis !== null) ||
            (prevAnalysisRef.current !== null && calculatedAnalysis === null) ||
            (prevAnalysisRef.current !== null && calculatedAnalysis !== null &&
                (prevAnalysisRef.current.partySize !== calculatedAnalysis.partySize ||
                    prevAnalysisRef.current.averageLevel !== calculatedAnalysis.averageLevel));

        // If this is the first load or analysis has changed significantly, show loading
        if (hasAnalysisChanged && calculatedAnalysis !== null) {
            setIsLoading(true);
            const loadingStartTime = Date.now();

            // Set minimum loading time to prevent flash
            minLoadingTimeoutRef.current = setTimeout(() => {
                const elapsed = Date.now() - loadingStartTime;
                const remainingTime = Math.max(0, MIN_LOADING_TIME_MS - elapsed);

                loadingTimeoutRef.current = setTimeout(() => {
                    setDisplayedAnalysis(calculatedAnalysis);
                    setIsLoading(false);
                    prevAnalysisRef.current = calculatedAnalysis;
                }, remainingTime);
            }, LOADING_DELAY_MS);
        } else {
            // No significant change, just update immediately
            setDisplayedAnalysis(calculatedAnalysis);
            setIsLoading(false);
            prevAnalysisRef.current = calculatedAnalysis;
        }

        return () => {
            if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
            }
            if (minLoadingTimeoutRef.current) {
                clearTimeout(minLoadingTimeoutRef.current);
            }
        };
    }, [calculatedAnalysis]);

    return { analysis: displayedAnalysis, isLoading };
}

/**
 * Get the count of selected characters for display purposes.
 * This is a lightweight utility that doesn't require full analysis.
 */
export function useSelectedCount(
    characters: CharacterSheet[],
    selectedSeeds: Set<string>
): { selected: number; total: number } {
    return useMemo(() => ({
        selected: characters.filter(c => selectedSeeds.has(c.seed)).length,
        total: characters.length
    }), [characters, selectedSeeds]);
}

export type { PartyAnalysis };
