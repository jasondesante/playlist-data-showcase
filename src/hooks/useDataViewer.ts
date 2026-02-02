import { useState, useCallback, useMemo } from 'react';
import {
    SpellRegistry,
    SkillRegistry,
    FeatureRegistry,
    SPELL_DATABASE,
    EQUIPMENT_DATABASE,
    RACE_DATA,
    CLASS_DATA,
    type RegisteredSpell,
    type CustomSkill,
    type ClassFeature,
    type RacialTrait,
    type Equipment
} from 'playlist-data-engine';
import { logger } from '@/utils/logger';

/**
 * Data category types for the data viewer
 */
export type DataCategory = 'spells' | 'skills' | 'classFeatures' | 'racialTraits' | 'races' | 'classes' | 'equipment';

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
}

/**
 * Interface for race data with additional computed fields
 */
export interface RaceDataEntry {
    name: string;
    ability_bonuses: Partial<Record<'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA', number>>;
    speed: number;
    traits: string[];
    subraces?: string[];
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
    /** Count of items in each category */
    dataCounts: DataCounts;
    /** Get all data for a specific category */
    getDataByCategory: (category: DataCategory) => RegisteredSpell[] | CustomSkill[] | ClassFeature[] | RacialTrait[] | RaceDataEntry[] | ClassDataEntry[] | Equipment[];
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

    // Get registry instances
    const spellRegistry = useMemo(() => SpellRegistry.getInstance(), []);
    const skillRegistry = useMemo(() => SkillRegistry.getInstance(), []);
    const featureRegistry = useMemo(() => FeatureRegistry.getInstance(), []);

    /**
     * Load all spells from SpellRegistry
     */
    const spells = useMemo(() => {
        try {
            // Ensure registry is initialized
            if (!spellRegistry.isInitialized()) {
                spellRegistry.initializeDefaults(SPELL_DATABASE);
            }
            return spellRegistry.getSpells();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            logger.error('DataViewer', 'Failed to load spells', errorMessage);
            return [];
        }
    }, [spellRegistry]);

    /**
     * Load all skills from SkillRegistry
     */
    const skills = useMemo(() => {
        try {
            // Ensure registry is initialized
            if (!skillRegistry.isInitialized()) {
                skillRegistry.initializeDefaults();
            }
            return skillRegistry.getAllSkills();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            logger.error('DataViewer', 'Failed to load skills', errorMessage);
            return [];
        }
    }, [skillRegistry]);

    /**
     * Load all class features from FeatureRegistry
     */
    const classFeatures = useMemo(() => {
        try {
            // Ensure registry is initialized
            if (!featureRegistry.isInitialized()) {
                featureRegistry.initializeDefaults();
            }
            const featuresMap = featureRegistry.getAllClassFeatures();
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
    }, [featureRegistry]);

    /**
     * Load all racial traits from FeatureRegistry
     */
    const racialTraits = useMemo(() => {
        try {
            // Ensure registry is initialized
            if (!featureRegistry.isInitialized()) {
                featureRegistry.initializeDefaults();
            }
            const traitsMap = featureRegistry.getAllRacialTraits();
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
    }, [featureRegistry]);

    /**
     * Load all races from RACE_DATA
     */
    const races = useMemo(() => {
        try {
            const raceEntries: RaceDataEntry[] = [];
            Object.entries(RACE_DATA).forEach(([name, data]) => {
                raceEntries.push({
                    name,
                    ability_bonuses: data.ability_bonuses || {},
                    speed: data.speed || 30,
                    traits: data.traits || [],
                    subraces: data.subraces
                });
            });
            return raceEntries;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            logger.error('DataViewer', 'Failed to load races', errorMessage);
            return [];
        }
    }, []);

    /**
     * Load all classes from CLASS_DATA
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
                    skill_count: data.skill_count || 2
                });
            });
            return classEntries;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            logger.error('DataViewer', 'Failed to load classes', errorMessage);
            return [];
        }
    }, []);

    /**
     * Load all equipment from EQUIPMENT_DATABASE
     */
    const equipment = useMemo(() => {
        try {
            return Object.values(EQUIPMENT_DATABASE);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            logger.error('DataViewer', 'Failed to load equipment', errorMessage);
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
        equipment: equipment.length
    }), [spells.length, skills.length, classFeatures.length, racialTraits.length, races.length, classes.length, equipment.length]);

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
            default:
                return [];
        }
    }, [spells, skills, classFeatures, racialTraits, races, classes, equipment]);

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
     * Refresh all data from registries (force re-initialization)
     */
    const refreshData = useCallback(() => {
        setIsLoading(true);
        setError(null);

        try {
            // Re-initialize registries to pick up any new custom content
            spellRegistry.initializeDefaults(SPELL_DATABASE);
            skillRegistry.initializeDefaults();
            featureRegistry.initializeDefaults();

            logger.info('DataViewer', 'Refreshed all data from registries');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            logger.error('DataViewer', 'Failed to refresh data', errorMessage);
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [spellRegistry, skillRegistry, featureRegistry]);

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
        dataCounts,
        getDataByCategory,
        filterByName,
        filterSpellsByLevel,
        filterSpellsBySchool,
        filterEquipmentByType,
        filterEquipmentByRarity,
        groupSkillsByAbility,
        groupClassFeaturesByClass,
        groupRacialTraitsByRace,
        refreshData,
        getSpellSchools,
        getEquipmentTypes,
        getEquipmentRarities
    };
};
