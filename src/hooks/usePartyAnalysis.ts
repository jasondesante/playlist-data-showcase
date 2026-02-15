import { useMemo } from 'react';
import { PartyAnalyzer, CharacterSheet, PartyAnalysis } from 'playlist-data-engine';
import { logger } from '@/utils/logger';

/**
 * React hook for analyzing party strength using the PartyAnalyzer engine module.
 *
 * This hook provides memoized party analysis based on selected characters,
 * calculating average stats, XP budgets for encounter difficulties, and
 * overall party strength using D&D 5e encounter building rules.
 *
 * @example
 * ```tsx
 * const { analysis, selectedCount } = usePartyAnalysis(characters, selectedSeeds);
 * if (analysis) {
 *   console.log(`Party Level: ${analysis.averageLevel}`);
 *   console.log(`Easy XP Budget: ${analysis.easyXP}`);
 * }
 * ```
 *
 * @param characters - Array of all available characters
 * @param selectedSeeds - Set of seeds for characters selected for analysis
 * @returns Analysis result with party stats and XP budgets, or null if no characters selected
 */
export function usePartyAnalysis(
    characters: CharacterSheet[],
    selectedSeeds: Set<string>
): PartyAnalysis | null {
    const analysis = useMemo(() => {
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

    return analysis;
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
