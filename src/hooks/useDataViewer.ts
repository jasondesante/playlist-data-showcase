import { useState, useCallback, useMemo } from 'react';
import {
    SpellQuery,
    SkillQuery,
    FeatureQuery,
    DEFAULT_EQUIPMENT,
    RACE_DATA,
    CLASS_DATA,
    ExtensionManager,
    type RegisteredSpell,
    type CustomSkill,
    type ClassFeature,
    type RacialTrait,
    type Equipment,
    type EnhancedEquipment,
    type Race,
    ensureAppearanceDefaultsInitialized
} from 'playlist-data-engine';
import { useSpawnMode, type SpawnMode, type SpawnCategory } from './useSpawnMode';

/**
 * Type guard to check if an equipment item has enhanced properties.
 *
 * Enhanced properties include:
 * - grantsFeatures: Features granted when equipped
 * - grantsSkills: Skills granted when equipped
 * - grantsSpells: Spells granted when equipped
 * - tags: Equipment tags for filtering
 * - spawnWeight: Spawn probability for random generation
 * - properties: Advanced equipment properties (stat bonuses, abilities, etc.)
 *
 * @param item - The equipment item to check
 * @returns True if the item has any enhanced properties defined
 *
 * @example
 * ```tsx
 * const item = equipment[0];
 * if (isEnhancedEquipment(item)) {
 *   // Safe to access item.grantsSkills, item.grantsSpells, etc.
 *   console.log('Tags:', item.tags);
 * }
 * ```
 */
export function isEnhancedEquipment(item: Equipment | EnhancedEquipment): item is EnhancedEquipment & {
    grantsFeatures?: NonNullable<Equipment['grantsFeatures']>;
    grantsSkills?: NonNullable<Equipment['grantsSkills']>;
    grantsSpells?: NonNullable<Equipment['grantsSpells']>;
    tags?: NonNullable<Equipment['tags']>;
    spawnWeight?: NonNullable<Equipment['spawnWeight']>;
    properties?: NonNullable<Equipment['properties']>;
} {
    return (
        item.grantsFeatures !== undefined ||
        item.grantsSkills !== undefined ||
        item.grantsSpells !== undefined ||
        item.tags !== undefined ||
        item.spawnWeight !== undefined ||
        (item.properties !== undefined && item.properties.length > 0)
    );
}
import { logger } from '@/utils/logger';
import { useDataViewerStore } from '@/store/dataViewerStore';

/**
 * Data category types for the data viewer
 */
export type DataCategory = 'spells' | 'skills' | 'classFeatures' | 'racialTraits' | 'races' | 'classes' | 'equipment' | 'appearance';

/**
 * Appearance category data for display
 */
export interface AppearanceCategoryData {
    /** Category key (e.g., 'appearance.bodyTypes') */
    key: string;
    /** Display name (e.g., 'Body Types') */
    name: string;
    /** Description of what this category represents */
    description: string;
    /** Available options in this category */
    options: string[];
    /** Icon to display for this category */
    icon: 'body' | 'color' | 'style' | 'feature';
}

/**
 * Interface for class data with additional computed fields
 */
export interface ClassDataEntry {
    name: string;
    hit_die: number;
    primary_ability: string;
    saving_throws: string[];
    is_spellcaster: boolean;
    available_skills: string[];
    skill_count: number;
    /** User-facing description of this class */
    description?: string;
    /** Optional icon URL for small UI display */
    icon?: string;
    /** Optional image URL for larger display */
    image?: string;
}

/**
 * Subrace-specific data structure
 *
 * Task 4.1: Enhanced Subrace Display - SubraceDataEntry interface
 *
 * Contains data specific to a subrace variant of a race:
 * - ability_bonuses: Additional/substituted ability score bonuses for this subrace
 * - traits: Trait IDs/names specific to this subrace
 * - requirements: Optional prerequisites (e.g., ability score minimums)
 */
export interface SubraceDataEntry {
    ability_bonuses?: Partial<Record<'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA', number>>;
    traits?: string[];
    requirements?: {
        abilities?: Partial<Record<'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA', number>>;
    };
}

/**
 * Interface for race data with additional computed fields
 *
 * Task 4.1: Enhanced Subrace Display - Added subraceData field
 *
 * @property subraceData - Map of subrace name to its specific data
 *                         (ability bonuses, traits, requirements)
 */
export interface RaceDataEntry {
    name: string;
    ability_bonuses: Partial<Record<'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA', number>>;
    speed: number;
    traits: string[];
    subraces?: string[];
    /** Subrace-specific data indexed by subrace name */
    subraceData?: Record<string, SubraceDataEntry>;
    /** User-facing description of this race */
    description?: string;
    /** Optional icon URL for small UI display */
    icon?: string;
    /** Optional image URL for larger display */
    image?: string;
}

/**
 * Data counts for each category
 */
export interface DataCounts {
    spells: number;
    skills: number;
    classFeatures: number;
    racialTraits: number;
    races: number;
    classes: number;
    equipment: number;
    appearance: number;
}

/**
 * Interface for data viewer operations hook
 */
export interface UseDataViewerReturn {
    /** Whether data is being loaded */
    isLoading: boolean;
    /** Error message if loading failed */
    error: string | null;
    /** All spells from SpellRegistry */
    spells: RegisteredSpell[];
    /** All skills from SkillRegistry */
    skills: CustomSkill[];
    /** All class features from FeatureRegistry */
    classFeatures: ClassFeature[];
    /** All racial traits from FeatureRegistry */
    racialTraits: RacialTrait[];
    /** All races from RACE_DATA */
    races: RaceDataEntry[];
    /** All classes from CLASS_DATA */
    classes: ClassDataEntry[];
    /** All equipment from EQUIPMENT_DATABASE */
    equipment: Equipment[];
    /** All appearance categories */
    appearance: AppearanceCategoryData[];
    /** Count of items in each category */
    dataCounts: DataCounts;
    /** Get all data for a specific category */
    getDataByCategory: (category: DataCategory) => RegisteredSpell[] | CustomSkill[] | ClassFeature[] | RacialTrait[] | RaceDataEntry[] | ClassDataEntry[] | Equipment[] | AppearanceCategoryData[];
    /** Filter data by search term */
    filterByName: <T extends { name: string }>(data: T[], searchTerm: string) => T[];
    /** Filter spells by level */
    filterSpellsByLevel: (spells: RegisteredSpell[], level: number | 'all') => RegisteredSpell[];
    /** Filter spells by school */
    filterSpellsBySchool: (spells: RegisteredSpell[], school: string | 'all') => RegisteredSpell[];
    /** Filter equipment by type */
    filterEquipmentByType: (equipment: Equipment[], type: 'weapon' | 'armor' | 'item' | 'all') => Equipment[];
    /** Filter equipment by rarity */
    filterEquipmentByRarity: (equipment: Equipment[], rarity: string | 'all') => Equipment[];
    /** Filter equipment by tag */
    filterEquipmentByTag: (equipment: Equipment[], tag: string | 'all') => Equipment[];
    /** Group skills by ability score */
    groupSkillsByAbility: (skills: CustomSkill[]) => Record<string, CustomSkill[]>;
    /** Group class features by class */
    groupClassFeaturesByClass: (features: ClassFeature[]) => Record<string, ClassFeature[]>;
    /** Group racial traits by race */
    groupRacialTraitsByRace: (traits: RacialTrait[]) => Record<string, RacialTrait[]>;
    /** Refresh all data from registries */
    refreshData: () => void;
    /** Get spell schools for filtering */
    getSpellSchools: () => string[];
    /** Get equipment types for filtering */
    getEquipmentTypes: () => string[];
    /** Get equipment rarities for filtering */
    getEquipmentRarities: () => string[];
    /** Get all unique equipment tags for filtering */
    getEquipmentTags: () => string[];
    /** Get only custom items for a category */
    getCustomItems: (category: DataCategory) => RegisteredSpell[] | CustomSkill[] | ClassFeature[] | RacialTrait[] | RaceDataEntry[] | ClassDataEntry[] | Equipment[] | AppearanceCategoryData[];
    /** Get only default items for a category */
    getDefaultItems: (category: DataCategory) => RegisteredSpell[] | CustomSkill[] | ClassFeature[] | RacialTrait[] | RaceDataEntry[] | ClassDataEntry[] | Equipment[] | AppearanceCategoryData[];
    /** Get filtered items based on spawn mode (absolute mode shows only custom items) */
    getFilteredItems: (category: DataCategory) => RegisteredSpell[] | CustomSkill[] | ClassFeature[] | RacialTrait[] | RaceDataEntry[] | ClassDataEntry[] | Equipment[] | AppearanceCategoryData[];
    /** Get spawn mode for a category */
    getSpawnModeForCategory: (category: DataCategory) => SpawnMode;
    /** Check if an item is custom (vs default) */
    isCustomItem: (category: DataCategory, itemName: string) => boolean;
}

/**
 * React hook for accessing and filtering game data from the playlist-data-engine.
 *
 * This hook provides access to all game data including spells, skills, class features,
 * racial traits, races, classes, and equipment. It includes filtering and grouping
 * functions for the Data Viewer tab.
 *
 * @example
 * ```tsx
 * const {
 *   spells,
 *   skills,
 *   equipment,
 *   dataCounts,
 *   filterByName,
 *   filterSpellsByLevel,
 *   groupSkillsByAbility
 * } = useDataViewer();
 *
 * // Get all cantrips
 * const cantrips = filterSpellsByLevel(spells, 0);
 *
 * // Search for items
 * const searchResults = filterByName(equipment, 'sword');
 *
 * // Group skills by ability
 * const skillsByAbility = groupSkillsByAbility(skills);
 * ```
 *
 * @returns {UseDataViewerReturn} Hook return object with data and filtering functions
 */
export const useDataViewer = (): UseDataViewerReturn => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Get query instances (read from ExtensionManager, no initialization needed)
    const spellQuery = useMemo(() => SpellQuery.getInstance(), []);
    const skillQuery = useMemo(() => SkillQuery.getInstance(), []);
    const featureQuery = useMemo(() => FeatureQuery.getInstance(), []);

    // Subscribe to data viewer store to detect when custom items are added
    const lastDataChange = useDataViewerStore(state => state.lastDataChange);
    const notifyDataChanged = useDataViewerStore(state => state.notifyDataChanged);

    /**
     * Load all spells from SpellQuery
     *
     * Recomputes when lastDataChange changes (custom items added or refresh triggered)
     */
    const spells = useMemo(() => {
        try {
            return spellQuery.getSpells();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            logger.error('DataViewer', 'Failed to load spells', errorMessage);
            return [];
        }
        // Include lastDataChange as dependency to trigger re-computation on refresh
    }, [spellQuery, lastDataChange]);

    /**
     * Load all skills from SkillQuery
     *
     * Recomputes when lastDataChange changes (custom items added or refresh triggered)
     */
    const skills = useMemo(() => {
        try {
            return skillQuery.getAllSkills();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            logger.error('DataViewer', 'Failed to load skills', errorMessage);
            return [];
        }
        // Include lastDataChange as dependency to trigger re-computation on refresh
    }, [skillQuery, lastDataChange]);

    /**
     * Load all class features from FeatureQuery
     *
     * Recomputes when lastDataChange changes (custom items added or refresh triggered)
     */
    const classFeatures = useMemo(() => {
        try {
            const featuresMap = featureQuery.getAllClassFeatures();
            // Flatten the Map into an array
            const allFeatures: ClassFeature[] = [];
            featuresMap.forEach((features) => {
                allFeatures.push(...features);
            });
            return allFeatures;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            logger.error('DataViewer', 'Failed to load class features', errorMessage);
            return [];
        }
        // Include lastDataChange as dependency to trigger re-computation on refresh
    }, [featureQuery, lastDataChange]);

    /**
     * Load all racial traits from FeatureQuery
     *
     * Recomputes when lastDataChange changes (custom items added via Trait Creator)
     * This ensures the RaceCreatorForm gets the latest available traits.
     */
    const racialTraits = useMemo(() => {
        try {
            const traitsMap = featureQuery.getAllRacialTraits();
            // Flatten the Map into an array
            const allTraits: RacialTrait[] = [];
            traitsMap.forEach((traits) => {
                allTraits.push(...traits);
            });
            return allTraits;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            logger.error('DataViewer', 'Failed to load racial traits', errorMessage);
            return [];
        }
        // Include lastDataChange as dependency to trigger re-computation when custom items are added
    }, [featureQuery, lastDataChange]);

    /**
     * Load all races from RACE_DATA
     *
     * Task 4.1/4.2: Enhanced Subrace Display
     * Also loads subrace-specific data by querying FeatureQuery for each subrace's traits.
     */
    const races = useMemo(() => {
        try {
            const raceEntries: RaceDataEntry[] = [];
            Object.entries(RACE_DATA).forEach(([name, data]) => {
                const entry: RaceDataEntry = {
                    name,
                    ability_bonuses: data.ability_bonuses || {},
                    speed: data.speed || 30,
                    traits: data.traits || [],
                    subraces: data.subraces,
                    description: (data as any).description
                };

                // Task 4.2: Load subrace-specific data
                if (data.subraces && data.subraces.length > 0) {
                    const subraceData: Record<string, SubraceDataEntry> = {};

                    data.subraces.forEach(subraceName => {
                        try {
                            // Get subrace-specific traits from FeatureQuery
                            const subraceTraits = featureQuery.getSubraceTraits(name as Race, subraceName);

                            // Extract trait names for display
                            const traitNames = subraceTraits.map(trait => trait.name);

                            // Look for ability bonuses from trait effects
                            const abilityBonuses: Partial<Record<'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA', number>> = {};
                            subraceTraits.forEach(trait => {
                                if (trait.effects) {
                                    trait.effects.forEach(effect => {
                                        if (effect.type === 'stat_bonus' && effect.target) {
                                            const ability = effect.target.toUpperCase() as 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';
                                            if (typeof effect.value === 'number') {
                                                abilityBonuses[ability] = effect.value;
                                            }
                                        }
                                    });
                                }
                            });

                            subraceData[subraceName] = {
                                ability_bonuses: Object.keys(abilityBonuses).length > 0 ? abilityBonuses : undefined,
                                traits: traitNames.length > 0 ? traitNames : undefined
                            };
                        } catch {
                            // If we can't load subrace traits, create empty entry
                            subraceData[subraceName] = {};
                        }
                    });

                    entry.subraceData = subraceData;
                }

                raceEntries.push(entry);
            });
            return raceEntries;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            logger.error('DataViewer', 'Failed to load races', errorMessage);
            return [];
        }
        // Include lastDataChange as dependency to trigger re-computation on refresh
    }, [featureQuery, lastDataChange]);

    /**
     * Load all classes from CLASS_DATA
     *
     * Recomputes when lastDataChange changes (refresh triggered)
     */
    const classes = useMemo(() => {
        try {
            const classEntries: ClassDataEntry[] = [];
            Object.entries(CLASS_DATA).forEach(([name, data]) => {
                classEntries.push({
                    name,
                    hit_die: data.hit_die || 8,
                    primary_ability: data.primary_ability || '',
                    saving_throws: data.saving_throws || [],
                    is_spellcaster: data.is_spellcaster || false,
                    available_skills: data.available_skills || [],
                    skill_count: data.skill_count || 2,
                    description: (data as any).description
                });
            });
            return classEntries;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            logger.error('DataViewer', 'Failed to load classes', errorMessage);
            return [];
        }
        // Include lastDataChange as dependency to trigger re-computation on refresh
    }, [lastDataChange]);

    /**
     * Load all equipment from ExtensionManager (includes default + custom items)
     * Falls back to EQUIPMENT_DATABASE if ExtensionManager is not available
     *
     * Recomputes when lastDataChange changes (custom items added via Item Creator)
     */
    const equipment = useMemo(() => {
        try {
            const extensionManager = ExtensionManager.getInstance();
            const allEquipment = extensionManager.get('equipment') as (Equipment | EnhancedEquipment)[];

            if (allEquipment && allEquipment.length > 0) {
                // ExtensionManager has equipment data (default + custom)
                logger.debug('DataViewer', `Loaded ${allEquipment.length} items from ExtensionManager`);
                return allEquipment;
            }

            // Fallback to DEFAULT_EQUIPMENT if ExtensionManager is empty
            logger.debug('DataViewer', 'ExtensionManager empty, falling back to DEFAULT_EQUIPMENT');
            return Object.values(DEFAULT_EQUIPMENT);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            logger.error('DataViewer', 'Failed to load equipment', errorMessage);
            // Fallback to DEFAULT_EQUIPMENT on error
            try {
                return Object.values(DEFAULT_EQUIPMENT);
            } catch {
                return [];
            }
        }
        // Include lastDataChange as dependency to trigger re-computation when custom items are added
    }, [lastDataChange]);

    /**
     * Load all appearance categories from ExtensionManager
     *
     * Loads appearance options for character generation:
     * - Body types (slender, athletic, muscular, stocky)
     * - Skin tones (hex color values)
     * - Hair colors (hex color values)
     * - Hair styles (short, long, braided, etc.)
     * - Eye colors (hex color values)
     * - Facial features (scars, tattoos, piercings, etc.)
     */
    const appearance = useMemo((): AppearanceCategoryData[] => {
        try {
            // Ensure defaults are initialized
            ensureAppearanceDefaultsInitialized();

            const manager = ExtensionManager.getInstance();
            const categories: AppearanceCategoryData[] = [];

            // Define the appearance categories to load
            const categoryConfig = [
                {
                    key: 'appearance.bodyTypes',
                    name: 'Body Types',
                    description: 'Physical body builds available for characters',
                    icon: 'body' as const
                },
                {
                    key: 'appearance.skinTones',
                    name: 'Skin Tones',
                    description: 'Skin tone color options for character appearance',
                    icon: 'color' as const
                },
                {
                    key: 'appearance.hairColors',
                    name: 'Hair Colors',
                    description: 'Hair color options for character appearance',
                    icon: 'color' as const
                },
                {
                    key: 'appearance.hairStyles',
                    name: 'Hair Styles',
                    description: 'Hair style options for character appearance',
                    icon: 'style' as const
                },
                {
                    key: 'appearance.eyeColors',
                    name: 'Eye Colors',
                    description: 'Eye color options for character appearance',
                    icon: 'color' as const
                },
                {
                    key: 'appearance.facialFeatures',
                    name: 'Facial Features',
                    description: 'Distinctive facial features like scars, tattoos, and piercings',
                    icon: 'feature' as const
                }
            ];

            for (const config of categoryConfig) {
                try {
                    const options = manager.get(config.key as any) as string[];
                    if (options && options.length > 0) {
                        categories.push({
                            key: config.key,
                            name: config.name,
                            description: config.description,
                            options: options,
                            icon: config.icon
                        });
                    }
                } catch {
                    // Skip categories that fail to load
                }
            }

            return categories;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            logger.error('DataViewer', 'Failed to load appearance data', errorMessage);
            return [];
        }
    }, []);

    /**
     * Calculate data counts
     */
    const dataCounts = useMemo(() => ({
        spells: spells.length,
        skills: skills.length,
        classFeatures: classFeatures.length,
        racialTraits: racialTraits.length,
        races: races.length,
        classes: classes.length,
        equipment: equipment.length,
        appearance: appearance.length
    }), [spells.length, skills.length, classFeatures.length, racialTraits.length, races.length, classes.length, equipment.length, appearance.length]);

    /**
     * Get all data for a specific category
     */
    const getDataByCategory = useCallback((category: DataCategory) => {
        switch (category) {
            case 'spells':
                return spells;
            case 'skills':
                return skills;
            case 'classFeatures':
                return classFeatures;
            case 'racialTraits':
                return racialTraits;
            case 'races':
                return races;
            case 'classes':
                return classes;
            case 'equipment':
                return equipment;
            case 'appearance':
                return appearance;
            default:
                return [];
        }
    }, [spells, skills, classFeatures, racialTraits, races, classes, equipment, appearance]);

    /**
     * Filter data by search term (case-insensitive name search)
     */
    const filterByName = useCallback(<T extends { name: string }>(data: T[], searchTerm: string): T[] => {
        if (!searchTerm.trim()) return data;
        const lowerTerm = searchTerm.toLowerCase();
        return data.filter(item => item.name.toLowerCase().includes(lowerTerm));
    }, []);

    /**
     * Filter spells by level (0-9, or 'all')
     */
    const filterSpellsByLevel = useCallback((spells: RegisteredSpell[], level: number | 'all'): RegisteredSpell[] => {
        if (level === 'all') return spells;
        return spells.filter(spell => spell.level === level);
    }, []);

    /**
     * Filter spells by school
     */
    const filterSpellsBySchool = useCallback((spells: RegisteredSpell[], school: string | 'all'): RegisteredSpell[] => {
        if (school === 'all') return spells;
        return spells.filter(spell => spell.school === school);
    }, []);

    /**
     * Filter equipment by type
     */
    const filterEquipmentByType = useCallback((equipment: Equipment[], type: 'weapon' | 'armor' | 'item' | 'all'): Equipment[] => {
        if (type === 'all') return equipment;
        return equipment.filter(item => item.type === type);
    }, []);

    /**
     * Filter equipment by rarity
     */
    const filterEquipmentByRarity = useCallback((equipment: Equipment[], rarity: string | 'all'): Equipment[] => {
        if (rarity === 'all') return equipment;
        return equipment.filter(item => item.rarity === rarity);
    }, []);

    /**
     * Filter equipment by tag
     *
     * Filters equipment items that have the specified tag in their tags array.
     * Only returns items that are enhanced equipment with the tag.
     *
     * Task 3.4: Tag Filtering Logic
     *
     * @param equipment - Array of equipment items to filter
     * @param tag - Tag to filter by, or 'all' to return all items
     * @returns Filtered array of equipment items
     */
    const filterEquipmentByTag = useCallback((equipment: Equipment[], tag: string | 'all'): Equipment[] => {
        if (tag === 'all') return equipment;
        return equipment.filter(item => {
            // Check if item has enhanced properties with tags
            if (isEnhancedEquipment(item) && item.tags) {
                return item.tags.includes(tag);
            }
            return false;
        });
    }, []);

    /**
     * Group skills by ability score
     */
    const groupSkillsByAbility = useCallback((skills: CustomSkill[]): Record<string, CustomSkill[]> => {
        const grouped: Record<string, CustomSkill[]> = {};
        skills.forEach(skill => {
            const ability = skill.ability;
            if (!grouped[ability]) {
                grouped[ability] = [];
            }
            grouped[ability].push(skill);
        });
        return grouped;
    }, []);

    /**
     * Group class features by class
     */
    const groupClassFeaturesByClass = useCallback((features: ClassFeature[]): Record<string, ClassFeature[]> => {
        const grouped: Record<string, ClassFeature[]> = {};
        features.forEach(feature => {
            const className = feature.class;
            if (!grouped[className]) {
                grouped[className] = [];
            }
            grouped[className].push(feature);
        });
        return grouped;
    }, []);

    /**
     * Group racial traits by race
     */
    const groupRacialTraitsByRace = useCallback((traits: RacialTrait[]): Record<string, RacialTrait[]> => {
        const grouped: Record<string, RacialTrait[]> = {};
        traits.forEach(trait => {
            const race = trait.race;
            if (!grouped[race]) {
                grouped[race] = [];
            }
            grouped[race].push(trait);
        });
        return grouped;
    }, []);

    /**
     * Get all spell schools for filtering
     */
    const getSpellSchools = useCallback((): string[] => {
        const schools = new Set<string>();
        spells.forEach(spell => {
            if (spell.school) {
                schools.add(spell.school);
            }
        });
        return Array.from(schools).sort();
    }, [spells]);

    /**
     * Get all equipment types for filtering
     */
    const getEquipmentTypes = useCallback((): string[] => {
        const types = new Set<string>();
        equipment.forEach(item => {
            if (item.type) {
                types.add(item.type);
            }
        });
        return Array.from(types).sort();
    }, [equipment]);

    /**
     * Get all equipment rarities for filtering
     */
    const getEquipmentRarities = useCallback((): string[] => {
        const rarities = new Set<string>();
        equipment.forEach(item => {
            if (item.rarity) {
                rarities.add(item.rarity);
            }
        });
        return Array.from(rarities).sort();
    }, [equipment]);

    /**
     * Get all unique equipment tags for filtering
     *
     * Collects all tags from enhanced equipment items and returns
     * a sorted array of unique tag strings.
     *
     * Task 3.2: Equipment Tags Helper
     *
     * @returns Sorted array of unique tag strings
     */
    const getEquipmentTags = useCallback((): string[] => {
        const tags = new Set<string>();
        equipment.forEach(item => {
            // Check if item has tags (from EnhancedEquipment)
            if (isEnhancedEquipment(item) && item.tags) {
                item.tags.forEach(tag => {
                    tags.add(tag);
                });
            }
        });
        return Array.from(tags).sort();
    }, [equipment]);

    /**
     * Refresh all data from queries (invalidate caches)
     *
     * Note: Equipment data is automatically refreshed when custom items are added
     * via the lastDataChange dependency in the equipment useMemo. This function
     * invalidates query caches to pick up any new custom content.
     */
    const refreshData = useCallback(() => {
        setIsLoading(true);
        setError(null);

        try {
            // Invalidate query caches to pick up any new custom content
            spellQuery.invalidateCache();
            skillQuery.invalidateCache();
            featureQuery.invalidateCache();

            // Trigger lastDataChange update to force useMemo hooks to re-compute
            // This ensures all category data is refreshed with the invalidated caches
            notifyDataChanged();

            logger.info('DataViewer', 'Refreshed all data from queries');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            logger.error('DataViewer', 'Failed to refresh data', errorMessage);
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [spellQuery, skillQuery, featureQuery, notifyDataChanged]);

    // ==========================================
    // Spawn Mode Integration
    // ==========================================

    /**
     * Get the spawn mode hook for filtering
     */
    const { getMode } = useSpawnMode();

    /**
     * Map DataCategory to SpawnCategory for use with spawn mode functions
     */
    const getSpawnCategory = useCallback((category: DataCategory): SpawnCategory => {
        // Most categories map directly, appearance is special
        if (category === 'appearance') {
            return 'appearance.bodyTypes'; // Default to body types for appearance mode
        }
        return category as SpawnCategory;
    }, []);

    /**
     * Get spawn mode for a category
     */
    const getSpawnModeForCategory = useCallback((category: DataCategory): SpawnMode => {
        const spawnCategory = getSpawnCategory(category);
        return getMode(spawnCategory) ?? 'relative';
    }, [getSpawnCategory, getMode]);

    /**
     * Get only custom items for a category
     *
     * Returns items that were registered as custom content via ExtensionManager.
     * Uses getCustom() to retrieve only user-added items.
     *
     * @param category - The data category to get custom items for
     * @returns Array of custom items (empty if no custom items)
     */
    const getCustomItems = useCallback((category: DataCategory): RegisteredSpell[] | CustomSkill[] | ClassFeature[] | RacialTrait[] | RaceDataEntry[] | ClassDataEntry[] | Equipment[] | AppearanceCategoryData[] => {
        try {
            const manager = ExtensionManager.getInstance();

            switch (category) {
                case 'equipment':
                    return manager.getCustom('equipment') as Equipment[] ?? [];

                case 'spells':
                    // Spells are managed through SpellQuery, check for custom via source field
                    return spells.filter(spell => spell.source === 'custom');

                case 'skills':
                    // Skills are managed through SkillQuery, check for custom via source field
                    return skills.filter(skill => skill.source === 'custom');

                case 'classFeatures':
                    // Class features are managed through FeatureQuery, check for custom via source field
                    return classFeatures.filter(feature => feature.source === 'custom');

                case 'racialTraits':
                    // Racial traits are managed through FeatureQuery, check for custom via source field
                    return racialTraits.filter(trait => trait.source === 'custom');

                case 'races':
                    // Races: custom races are registered in ExtensionManager
                    const customRaceNames = manager.getCustom('races') as string[] ?? [];
                    return races.filter(race => customRaceNames.includes(race.name));

                case 'classes':
                    // Classes: custom classes are registered in ExtensionManager
                    const customClassNames = manager.getCustom('classes') as string[] ?? [];
                    return classes.filter(cls => customClassNames.includes(cls.name));

                case 'appearance':
                    // Appearance: for simplicity, return all custom appearance options
                    // This is a simplified approach; in practice you might want per-category tracking
                    const customBodyTypes = manager.getCustom('appearance.bodyTypes') as string[] ?? [];
                    const customSkinTones = manager.getCustom('appearance.skinTones') as string[] ?? [];
                    const customHairColors = manager.getCustom('appearance.hairColors') as string[] ?? [];
                    const customHairStyles = manager.getCustom('appearance.hairStyles') as string[] ?? [];
                    const customEyeColors = manager.getCustom('appearance.eyeColors') as string[] ?? [];
                    const customFacialFeatures = manager.getCustom('appearance.facialFeatures') as string[] ?? [];

                    // Return categories that have custom items
                    return appearance.filter(cat => {
                        switch (cat.key) {
                            case 'appearance.bodyTypes':
                                return customBodyTypes.length > 0;
                            case 'appearance.skinTones':
                                return customSkinTones.length > 0;
                            case 'appearance.hairColors':
                                return customHairColors.length > 0;
                            case 'appearance.hairStyles':
                                return customHairStyles.length > 0;
                            case 'appearance.eyeColors':
                                return customEyeColors.length > 0;
                            case 'appearance.facialFeatures':
                                return customFacialFeatures.length > 0;
                            default:
                                return false;
                        }
                    });

                default:
                    return [];
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            logger.error('DataViewer', `Failed to get custom items for ${category}`, errorMessage);
            return [];
        }
    }, [spells, skills, classFeatures, racialTraits, races, classes, equipment, appearance]);

    /**
     * Get only default items for a category
     *
     * Returns items that are part of the default data set (not user-added).
     * Uses getDefaults() from ExtensionManager where available.
     *
     * @param category - The data category to get default items for
     * @returns Array of default items
     */
    const getDefaultItems = useCallback((category: DataCategory): RegisteredSpell[] | CustomSkill[] | ClassFeature[] | RacialTrait[] | RaceDataEntry[] | ClassDataEntry[] | Equipment[] | AppearanceCategoryData[] => {
        try {
            const manager = ExtensionManager.getInstance();

            switch (category) {
                case 'equipment':
                    return manager.getDefaults('equipment') as Equipment[] ?? Object.values(DEFAULT_EQUIPMENT);

                case 'spells':
                    // Spells with source !== 'custom' are defaults
                    return spells.filter(spell => spell.source !== 'custom');

                case 'skills':
                    // Skills with source !== 'custom' are defaults
                    return skills.filter(skill => skill.source !== 'custom');

                case 'classFeatures':
                    // Class features with source !== 'custom' are defaults
                    return classFeatures.filter(feature => feature.source !== 'custom');

                case 'racialTraits':
                    // Racial traits with source !== 'custom' are defaults
                    return racialTraits.filter(trait => trait.source !== 'custom');

                case 'races':
                    // Default races (not in custom list)
                    const customRaceNames = manager.getCustom('races') as string[] ?? [];
                    return races.filter(race => !customRaceNames.includes(race.name));

                case 'classes':
                    // Default classes (not in custom list)
                    const customClassNames = manager.getCustom('classes') as string[] ?? [];
                    return classes.filter(cls => !customClassNames.includes(cls.name));

                case 'appearance':
                    // Appearance: return all appearance data since defaults are always present
                    return appearance;

                default:
                    return [];
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            logger.error('DataViewer', `Failed to get default items for ${category}`, errorMessage);
            // Fallback to returning all items
            return getDataByCategory(category);
        }
    }, [spells, skills, classFeatures, racialTraits, races, classes, equipment, appearance, getDataByCategory]);

    /**
     * Get filtered items based on spawn mode
     *
     * Returns items filtered according to the current spawn mode:
     * - `relative`: All items (default + custom) - no filtering
     * - `absolute`: Only custom items (defaults excluded)
     * - `default`: All items with equal weight - no filtering
     * - `replace`: Only custom items (after clear)
     *
     * @param category - The data category to get filtered items for
     * @returns Filtered array based on spawn mode
     */
    const getFilteredItems = useCallback((category: DataCategory): RegisteredSpell[] | CustomSkill[] | ClassFeature[] | RacialTrait[] | RaceDataEntry[] | ClassDataEntry[] | Equipment[] | AppearanceCategoryData[] => {
        const mode = getSpawnModeForCategory(category);

        // Absolute and replace modes: only show custom items
        if (mode === 'absolute' || mode === 'replace') {
            const customItems = getCustomItems(category);
            // If no custom items exist, return empty (not defaults)
            if (customItems.length === 0) {
                logger.debug('DataViewer', `${category} in ${mode} mode has no custom items, returning empty`);
                return [];
            }
            logger.debug('DataViewer', `${category} in ${mode} mode: showing ${customItems.length} custom items`);
            return customItems;
        }

        // Relative and default modes: show all items
        return getDataByCategory(category);
    }, [getSpawnModeForCategory, getCustomItems, getDataByCategory]);

    /**
     * Check if an item is custom (vs default)
     *
     * Determines whether a specific item was added as custom content
     * or is part of the default data set.
     *
     * @param category - The data category the item belongs to
     * @param itemName - The name/ID of the item to check
     * @returns true if the item is custom, false if default
     */
    const isCustomItem = useCallback((category: DataCategory, itemName: string): boolean => {
        try {
            const manager = ExtensionManager.getInstance();

            switch (category) {
                case 'equipment': {
                    const customEquipment = manager.getCustom('equipment') as Equipment[] ?? [];
                    return customEquipment.some(item => item.name === itemName);
                }

                case 'spells':
                    return spells.some(spell => spell.name === itemName && spell.source === 'custom');

                case 'skills':
                    return skills.some(skill => (skill.name === itemName || skill.id === itemName) && skill.source === 'custom');

                case 'classFeatures':
                    return classFeatures.some(feature => (feature.name === itemName || feature.id === itemName) && feature.source === 'custom');

                case 'racialTraits':
                    return racialTraits.some(trait => (trait.name === itemName || trait.id === itemName) && trait.source === 'custom');

                case 'races': {
                    const customRaceNames = manager.getCustom('races') as string[] ?? [];
                    return customRaceNames.includes(itemName);
                }

                case 'classes': {
                    const customClassNames = manager.getCustom('classes') as string[] ?? [];
                    return customClassNames.includes(itemName);
                }

                case 'appearance': {
                    // Check all appearance categories
                    const appearanceCategories = [
                        'appearance.bodyTypes',
                        'appearance.skinTones',
                        'appearance.hairColors',
                        'appearance.hairStyles',
                        'appearance.eyeColors',
                        'appearance.facialFeatures'
                    ] as const;

                    for (const cat of appearanceCategories) {
                        const customItems = manager.getCustom(cat as any) as string[] ?? [];
                        if (customItems.includes(itemName)) {
                            return true;
                        }
                    }
                    return false;
                }

                default:
                    return false;
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            logger.error('DataViewer', `Failed to check if ${itemName} is custom in ${category}`, errorMessage);
            return false;
        }
    }, [spells, skills, classFeatures, racialTraits]);

    return {
        isLoading,
        error,
        spells,
        skills,
        classFeatures,
        racialTraits,
        races,
        classes,
        equipment,
        appearance,
        dataCounts,
        getDataByCategory,
        filterByName,
        filterSpellsByLevel,
        filterSpellsBySchool,
        filterEquipmentByType,
        filterEquipmentByRarity,
        filterEquipmentByTag,
        groupSkillsByAbility,
        groupClassFeaturesByClass,
        groupRacialTraitsByRace,
        refreshData,
        getSpellSchools,
        getEquipmentTypes,
        getEquipmentRarities,
        getEquipmentTags,
        getCustomItems,
        getDefaultItems,
        getFilteredItems,
        getSpawnModeForCategory,
        isCustomItem
    };
};
