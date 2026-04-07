import { useCallback, useMemo } from 'react';
import {
    EnemyGenerator,
    CharacterSheet,
    EnemyTemplate,
    EnemyGenerationOptions,
    EncounterGenerationOptions,
    EnemyRarity,
    EnemyCategory,
    EnemyArchetype,
    EncounterDifficulty,
    EnemyMixMode,
    AudioProfile,
    PlaylistTrack,
    StatLevelOverrides,
} from 'playlist-data-engine';
import { logger } from '@/utils/logger';

/**
 * Options for generating a single enemy
 *
 * @example
 * ```tsx
 * const { generate } = useEnemyGenerator();
 * const enemy = generate({
 *   seed: 'my-encounter',
 *   templateId: 'orc',
 *   rarity: 'elite'
 * });
 * ```
 */
export interface UseEnemyGenerationOptions {
    /** Required - Seed for deterministic generation */
    seed: string;
    /** Optional - Challenge Rating for power scaling */
    cr?: number;
    /** Optional - Force specific template by ID */
    templateId?: string;
    /** Optional - Rarity tier (default: 'common') */
    rarity?: EnemyRarity;
    /** Optional - Difficulty multiplier (default: 1.0) */
    difficultyMultiplier?: number;
    /** Optional - Filter by category */
    category?: EnemyCategory;
    /** Optional - Filter by archetype */
    archetype?: EnemyArchetype;
    /** Optional - Audio profile for stat influence */
    audioProfile?: AudioProfile;
    /** Optional - Track data (required if audioProfile provided) */
    track?: PlaylistTrack;
    /** Optional - Override effective levels for HP, attack, and defense independently */
    statLevels?: StatLevelOverrides;
}

/**
 * Options for generating an encounter (group of enemies)
 *
 * @example
 * ```tsx
 * const { generateEncounter } = useEnemyGenerator();
 * const enemies = generateEncounter(party, {
 *   seed: 'dungeon-1',
 *   difficulty: 'medium',
 *   count: 5
 * });
 * ```
 */
export interface UseEncounterGenerationOptions {
    /** Required - Seed for deterministic generation */
    seed: string;
    /** Required - Number of enemies to generate */
    count: number;
    /** Optional - Difficulty for party-based encounters (default: 'medium') */
    difficulty?: EncounterDifficulty;
    /** Optional - Target CR for CR-based generation (no party needed) */
    targetCR?: number;
    /** Optional - Base rarity before leader promotion (default: 'common') */
    baseRarity?: EnemyRarity;
    /** Optional - Fine-tune difficulty multiplier (default: 1.0) */
    difficultyMultiplier?: number;
    /** Optional - Filter by category */
    category?: EnemyCategory;
    /** Optional - Filter by archetype */
    archetype?: EnemyArchetype;
    /** Optional - Force specific template for all enemies */
    templateId?: string;
    /** Optional - Enemy mix mode (default: 'uniform') */
    enemyMix?: EnemyMixMode;
    /** Optional - Template IDs for 'custom' mix mode */
    templates?: string[];
    /** Optional - Audio profile for template selection and stat influence */
    audioProfile?: AudioProfile;
    /** Optional - Track data (required if audioProfile provided) */
    track?: PlaylistTrack;
    /** Optional - Enable leader promotion for groups > 3 (default: true) */
    enableLeaderPromotion?: boolean;
    /** Optional - Override effective levels for HP, attack, and defense independently */
    statLevels?: StatLevelOverrides;
}

/**
 * React hook for generating enemies using the EnemyGenerator engine module.
 *
 * Provides functions to generate individual enemies or balanced encounters
 * for combat. All generation is deterministic based on the provided seed.
 *
 * Features:
 * - Generate single enemies by template, category, or archetype
 * - Generate party-balanced encounters with difficulty scaling
 * - Generate CR-based encounters without party analysis
 * - Audio-influenced generation for playlist integration
 * - Leader promotion for larger enemy groups
 *
 * @example
 * ```tsx
 * const { generate, generateEncounter, generateEncounterByCR, getTemplateById } = useEnemyGenerator();
 *
 * // Generate a specific elite orc
 * const orc = generate({ seed: 'orc-1', templateId: 'orc', rarity: 'elite' });
 *
 * // Generate a balanced encounter for a party
 * const enemies = generateEncounter(party, { seed: 'battle', difficulty: 'hard', count: 4 });
 *
 * // Generate enemies by target CR
 * const crEnemies = generateEncounterByCR({ seed: 'cr5', targetCR: 5, count: 3 });
 *
 * // Look up a template
 * const template = getTemplateById('orc');
 * ```
 */
export function useEnemyGenerator() {
    /**
     * Generate a single enemy character
     *
     * Creates a CharacterSheet representing an enemy with:
     * - Template-based stats scaled by rarity
     * - Audio-influenced stat adjustments (when audioProfile provided)
     * - Signature ability with scaled damage die
     * - Extra abilities from FeatureQuery (for higher rarities)
     * - Resistances for Elite+ tiers
     *
     * @param options - Generation options including seed, templateId, rarity, etc.
     * @returns Enemy character sheet, or null if generation failed
     */
    const generate = useCallback((options: UseEnemyGenerationOptions): CharacterSheet | null => {
        logger.info('EnemyGenerator', 'Generating single enemy', {
            seed: options.seed,
            templateId: options.templateId,
            cr: options.cr,
            rarity: options.rarity || 'common',
            category: options.category,
            archetype: options.archetype,
            statLevels: options.statLevels,
        });

        try {
            const enemy = EnemyGenerator.generate(options as EnemyGenerationOptions);

            logger.info('EnemyGenerator', 'Enemy generated successfully', {
                name: enemy.name,
                level: enemy.level,
                hp: enemy.hp.max
            });

            return enemy;
        } catch (error) {
            logger.error('EnemyGenerator', 'Failed to generate enemy', error);
            return null;
        }
    }, []);

    /**
     * Generate a balanced encounter for a party
     *
     * Uses PartyAnalyzer to determine appropriate enemy strength based on party level
     * and desired difficulty. Supports leader promotion for larger groups.
     *
     * @param party - Array of party members' character sheets
     * @param options - Encounter generation options including seed, difficulty, count, etc.
     * @returns Array of generated enemies, or empty array if generation failed
     */
    const generateEncounter = useCallback((
        party: CharacterSheet[],
        options: UseEncounterGenerationOptions
    ): CharacterSheet[] => {
        logger.info('EnemyGenerator', 'Generating party-balanced encounter', {
            partySize: party.length,
            seed: options.seed,
            difficulty: options.difficulty || 'medium',
            count: options.count
        });

        try {
            const enemies = EnemyGenerator.generateEncounter(party, options as EncounterGenerationOptions);

            logger.info('EnemyGenerator', 'Encounter generated successfully', {
                enemyCount: enemies.length,
                enemyNames: enemies.map(e => e.name).join(', ')
            });

            return enemies;
        } catch (error) {
            logger.error('EnemyGenerator', 'Failed to generate encounter', error);
            return [];
        }
    }, []);

    /**
     * Generate an encounter based on target CR (no party needed)
     *
     * Creates enemies at a specific Challenge Rating, independent of any party.
     * Useful for pre-planned encounters or when the party strength is unknown.
     *
     * @param options - Encounter generation options (must include targetCR)
     * @returns Array of generated enemies, or empty array if generation failed
     */
    const generateEncounterByCR = useCallback((
        options: UseEncounterGenerationOptions
    ): CharacterSheet[] => {
        logger.info('EnemyGenerator', 'Generating CR-based encounter', {
            seed: options.seed,
            targetCR: options.targetCR,
            count: options.count
        });

        try {
            const enemies = EnemyGenerator.generateEncounterByCR(options as EncounterGenerationOptions);

            logger.info('EnemyGenerator', 'CR-based encounter generated successfully', {
                enemyCount: enemies.length,
                enemyNames: enemies.map(e => e.name).join(', ')
            });

            return enemies;
        } catch (error) {
            logger.error('EnemyGenerator', 'Failed to generate CR-based encounter', error);
            return [];
        }
    }, []);

    /**
     * Get an enemy template by ID
     *
     * Searches the default enemy templates for a matching ID.
     *
     * @param id - Template ID (e.g., 'orc', 'goblin-archer')
     * @returns Template if found, undefined otherwise
     */
    const getTemplateById = useCallback((id: string): EnemyTemplate | undefined => {
        const template = EnemyGenerator.getTemplateById(id);

        if (template) {
            logger.debug('EnemyGenerator', 'Template found', { id, name: template.name });
        } else {
            logger.debug('EnemyGenerator', 'Template not found', { id });
        }

        return template;
    }, []);

    /**
     * Get all available template IDs
     *
     * Returns an array of all template IDs that can be used for enemy generation.
     *
     * @returns Array of template ID strings
     */
    const getAllTemplateIds = useMemo((): string[] => {
        // Common templates from the docs
        const templateIds = [
            // Humanoid - Brute
            'orc', 'bandit',
            // Humanoid - Archer
            'hunter', 'goblin-archer',
            // Humanoid - Support
            'shaman', 'cultist',
            // Beast - Brute
            'bear', 'boar',
            // Beast - Ranged
            'giant-spider', 'stirge',
            // Undead
            'skeleton', 'ghost', 'zombie', 'wight',
            // Fiend
            'imp', 'lemure', 'demon', 'quasit',
            // Elemental
            'fire-elemental', 'earth-elemental', 'air-elemental', 'water-elemental',
            // Construct
            'animated-armor', 'golem', 'flying-sword', 'shield-guardian',
            // Dragon
            'young-red-dragon', 'young-blue-dragon', 'dragon-wyrmling', 'drake',
            // Monstrosity
            'owlbear', 'mimic', 'griffin', 'basilisk'
        ];
        return templateIds;
    }, []);

    /**
     * Get templates filtered by category
     *
     * @param category - The enemy category to filter by
     * @returns Array of template IDs for the category
     */
    const getTemplatesByCategory = useCallback((category: EnemyCategory): string[] => {
        const categoryMap: Record<EnemyCategory, string[]> = {
            humanoid: ['orc', 'bandit', 'hunter', 'goblin-archer', 'shaman', 'cultist'],
            beast: ['bear', 'boar', 'giant-spider', 'stirge'],
            undead: ['skeleton', 'ghost', 'zombie', 'wight'],
            fiend: ['imp', 'lemure', 'demon', 'quasit'],
            elemental: ['fire-elemental', 'earth-elemental', 'air-elemental', 'water-elemental'],
            construct: ['animated-armor', 'golem', 'flying-sword', 'shield-guardian'],
            dragon: ['young-red-dragon', 'young-blue-dragon', 'dragon-wyrmling', 'drake'],
            monstrosity: ['owlbear', 'mimic', 'griffin', 'basilisk']
        };

        return categoryMap[category] || [];
    }, []);

    /**
     * Get templates filtered by archetype
     *
     * @param archetype - The combat archetype to filter by
     * @returns Array of template IDs for the archetype
     */
    const getTemplatesByArchetype = useCallback((archetype: EnemyArchetype): string[] => {
        const archetypeMap: Record<EnemyArchetype, string[]> = {
            brute: [
                'orc', 'bandit', 'bear', 'boar', 'zombie', 'wight',
                'lemure', 'demon', 'fire-elemental', 'earth-elemental',
                'animated-armor', 'golem', 'young-red-dragon', 'dragon-wyrmling',
                'drake', 'owlbear', 'mimic'
            ],
            archer: [
                'hunter', 'goblin-archer', 'giant-spider', 'stirge',
                'skeleton', 'imp', 'air-elemental', 'flying-sword',
                'young-blue-dragon', 'griffin'
            ],
            support: [
                'shaman', 'cultist', 'quasit', 'water-elemental',
                'shield-guardian', 'basilisk'
            ]
        };

        return archetypeMap[archetype] || [];
    }, []);

    /**
     * Check if a seed is valid for generation
     *
     * Seeds must be non-empty strings for deterministic generation.
     *
     * @param seed - The seed to validate
     * @returns True if the seed is valid
     */
    const isValidSeed = useCallback((seed: unknown): seed is string => {
        return typeof seed === 'string' && seed.trim().length > 0;
    }, []);

    return {
        /** Generate a single enemy */
        generate,
        /** Generate a party-balanced encounter */
        generateEncounter,
        /** Generate an encounter by target CR */
        generateEncounterByCR,
        /** Get a template by ID */
        getTemplateById,
        /** Get all available template IDs */
        getAllTemplateIds,
        /** Get templates filtered by category */
        getTemplatesByCategory,
        /** Get templates filtered by archetype */
        getTemplatesByArchetype,
        /** Check if a seed is valid */
        isValidSeed
    };
}

// Re-export types for convenience
export type {
    EnemyTemplate,
    EnemyRarity,
    EnemyCategory,
    EnemyArchetype,
    EncounterDifficulty,
    EnemyMixMode
};
