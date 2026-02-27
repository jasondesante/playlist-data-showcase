/**
 * Content Validation Utilities
 *
 * Comprehensive validation for all ExtensionManager content types.
 * Provides structure validation, reference validation, and business rule validation.
 *
 * @module contentValidation
 */

import { ExtensionManager } from 'playlist-data-engine';
import { logger } from './logger';

// ============================================
// Types
// ============================================

/**
 * Content types that can be validated.
 * Maps to the various ExtensionManager extension categories.
 */
export type ContentCategory =
    | 'equipment'
    | 'equipment.templates'
    | 'appearance.bodyTypes'
    | 'appearance.skinTones'
    | 'appearance.hairColors'
    | 'appearance.hairStyles'
    | 'appearance.eyeColors'
    | 'appearance.facialFeatures'
    | 'spells'
    | `spells.${string}`
    | 'races'
    | 'races.data'
    | 'classes'
    | 'classes.data'
    | 'classFeatures'
    | `classFeatures.${string}`
    | 'racialTraits'
    | `racialTraits.${string}`
    | 'skills'
    | `skills.${string}`
    | 'skillLists'
    | `skillLists.${string}`
    | 'classSpellLists'
    | `classSpellLists.${string}`
    | 'classSpellSlots'
    | 'classStartingEquipment'
    | `classStartingEquipment.${string}`;

/**
 * Generic content item type
 */
export type ContentItem = Record<string, unknown>;

/**
 * Validation result with detailed error and warning messages
 */
export interface ValidationResult {
    /** Whether the content is valid */
    valid: boolean;
    /** Array of validation error messages (blocking issues) */
    errors: string[];
    /** Array of validation warnings (non-blocking issues) */
    warnings: string[];
}

/**
 * Validation options for customizing validation behavior
 */
export interface ValidationOptions {
    /** Whether to perform reference validation (check if IDs/names exist) */
    validateReferences?: boolean;
    /** Whether to perform business rule validation */
    validateBusinessRules?: boolean;
    /** Existing ExtensionManager instance (optional, will create if not provided) */
    manager?: ExtensionManager;
}

/**
 * Default validation options
 */
const DEFAULT_OPTIONS: ValidationOptions = {
    validateReferences: true,
    validateBusinessRules: true
};

// ============================================
// Constants
// ============================================

/** Valid D&D 5e ability scores */
export const VALID_ABILITIES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const;
export type Ability = typeof VALID_ABILITIES[number];

/** Valid equipment types */
export const VALID_EQUIPMENT_TYPES = ['weapon', 'armor', 'item', 'box'] as const;
export type EquipmentType = typeof VALID_EQUIPMENT_TYPES[number];

/** Valid equipment rarities */
export const VALID_RARITIES = ['common', 'uncommon', 'rare', 'very_rare', 'legendary'] as const;
export type EquipmentRarity = typeof VALID_RARITIES[number];

/** Valid D&D 5e schools of magic */
export const VALID_SCHOOLS = [
    'Abjuration',
    'Conjuration',
    'Divination',
    'Enchantment',
    'Evocation',
    'Illusion',
    'Necromancy',
    'Transmutation'
] as const;
export type SpellSchool = typeof VALID_SCHOOLS[number];

/** Valid feature types */
export const VALID_FEATURE_TYPES = ['passive', 'active', 'reaction'] as const;
export type FeatureType = typeof VALID_FEATURE_TYPES[number];

/** Valid hit die values */
export const VALID_HIT_DICE = [6, 8, 10, 12] as const;

/** Valid audio preference traits */
export const VALID_AUDIO_TRAITS = ['bass', 'treble', 'mid', 'amplitude', 'chaos'] as const;
export type AudioTrait = typeof VALID_AUDIO_TRAITS[number];

/** ID format regex: lowercase_with_underscores */
const ID_FORMAT_REGEX = /^[a-z][a-z0-9_]*$/;

/** Dice format regex: 1d8, 2d6, etc. */
const DICE_FORMAT_REGEX = /^\d+d\d+$/;

/** Hex color format regex: #RRGGBB */
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

// ============================================
// Validation Helper Functions
// ============================================

/**
 * Validate that a value is a non-empty string
 */
function isValidString(value: unknown, fieldName: string, errors: string[]): value is string {
    if (typeof value !== 'string' || value.trim().length === 0) {
        errors.push(`"${fieldName}" must be a non-empty string`);
        return false;
    }
    return true;
}

/**
 * Validate that a value is a valid ID format (lowercase_with_underscores)
 */
function isValidId(value: unknown, fieldName: string, errors: string[]): boolean {
    if (!isValidString(value, fieldName, errors)) {
        return false;
    }
    if (!ID_FORMAT_REGEX.test(value as string)) {
        errors.push(`"${fieldName}" must use lowercase_with_underscores format (e.g., "fire_breath")`);
        return false;
    }
    return true;
}

/**
 * Validate that a value is a valid ability score
 */
function isValidAbility(value: unknown, fieldName: string, errors: string[]): boolean {
    if (!VALID_ABILITIES.includes(value as Ability)) {
        errors.push(`"${fieldName}" must be one of: ${VALID_ABILITIES.join(', ')}`);
        return false;
    }
    return true;
}

/**
 * Validate that a value is a number within a range
 */
function isValidNumber(
    value: unknown,
    fieldName: string,
    min: number,
    max: number,
    errors: string[],
    allowUndefined = false
): boolean {
    if (value === undefined) {
        if (allowUndefined) return true;
        errors.push(`"${fieldName}" is required`);
        return false;
    }
    if (typeof value !== 'number' || isNaN(value)) {
        errors.push(`"${fieldName}" must be a number`);
        return false;
    }
    if (value < min || value > max) {
        errors.push(`"${fieldName}" must be between ${min} and ${max}`);
        return false;
    }
    return true;
}

/**
 * Validate that a value is an array
 */
function isArray(value: unknown, fieldName: string, errors: string[]): value is unknown[] {
    if (!Array.isArray(value)) {
        errors.push(`"${fieldName}" must be an array`);
        return false;
    }
    return true;
}

/**
 * Validate dice notation format
 */
function isValidDiceNotation(value: unknown, fieldName: string, errors: string[]): boolean {
    if (value === undefined) return true;
    if (typeof value !== 'string' || !DICE_FORMAT_REGEX.test(value)) {
        errors.push(`"${fieldName}" must be in dice format (e.g., "1d8", "2d6")`);
        return false;
    }
    return true;
}

/**
 * Validate hex color format
 */
function isValidHexColor(value: unknown, warnings: string[]): boolean {
    if (typeof value !== 'string') return false;
    if (!HEX_COLOR_REGEX.test(value)) {
        warnings.push(`Color "${value}" is not in standard hex format (#RRGGBB)`);
        return false;
    }
    return true;
}

// ============================================
// Reference Validation Helpers
// ============================================

/**
 * Get the ExtensionManager instance
 */
function getManager(options: ValidationOptions): ExtensionManager {
    return options.manager ?? ExtensionManager.getInstance();
}

/**
 * Check if a class exists (default or custom)
 */
function classExists(className: string, manager: ExtensionManager): boolean {
    try {
        // Check default classes
        const defaultClasses = ['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard'];
        if (defaultClasses.includes(className)) return true;

        // Check if registered as custom class
        const customClasses = manager.getCustom('classes') as string[];
        if (customClasses?.includes(className)) return true;

        // Check class data
        const classData = manager.get('classes.data') as Array<{ name: string }>;
        if (classData?.some((c) => c.name === className)) return true;

        return false;
    } catch {
        return false;
    }
}

/**
 * Check if a race exists (default or custom)
 */
function raceExists(raceName: string, manager: ExtensionManager): boolean {
    try {
        // Check default races
        const defaultRaces = ['Human', 'Elf', 'Dwarf', 'Halfling', 'Dragonborn', 'Gnome', 'Half-Elf', 'Half-Orc', 'Tiefling'];
        if (defaultRaces.includes(raceName)) return true;

        // Check if registered as custom race
        const customRaces = manager.getCustom('races') as string[];
        if (customRaces?.includes(raceName)) return true;

        // Check race data
        const raceData = manager.get('races.data') as Array<{ race: string }>;
        if (raceData?.some((r) => r.race === raceName)) return true;

        return false;
    } catch {
        return false;
    }
}

/**
 * Check if a skill exists
 */
function skillExists(skillId: string, manager: ExtensionManager): boolean {
    try {
        const skills = manager.get('skills') as Array<{ id: string }>;
        return skills?.some((s) => s.id === skillId) ?? false;
    } catch {
        return false;
    }
}

/**
 * Check if a spell exists
 */
function spellExists(spellName: string, manager: ExtensionManager): boolean {
    try {
        const spells = manager.get('spells') as Array<{ name: string }>;
        return spells?.some((s) => s.name === spellName) ?? false;
    } catch {
        return false;
    }
}

/**
 * Check if a racial trait exists
 */
function racialTraitExists(traitId: string, manager: ExtensionManager): boolean {
    try {
        const traits = manager.get('racialTraits') as Array<{ id: string }>;
        return traits?.some((t) => t.id === traitId) ?? false;
    } catch {
        return false;
    }
}

/**
 * Check if a class feature exists
 */
function classFeatureExists(featureId: string, manager: ExtensionManager): boolean {
    try {
        const features = manager.get('classFeatures') as Array<{ id: string }>;
        return features?.some((f) => f.id === featureId) ?? false;
    } catch {
        return false;
    }
}

// ============================================
// Category-Specific Validators
// ============================================

/**
 * Validate equipment content
 */
function validateEquipment(item: ContentItem, options: ValidationOptions): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    isValidString(item.name, 'name', errors);

    if (!VALID_EQUIPMENT_TYPES.includes(item.type as EquipmentType)) {
        errors.push(`"type" must be one of: ${VALID_EQUIPMENT_TYPES.join(', ')}`);
    }

    if (!VALID_RARITIES.includes(item.rarity as EquipmentRarity)) {
        errors.push(`"rarity" must be one of: ${VALID_RARITIES.join(', ')}`);
    }

    isValidNumber(item.weight, 'weight', 0, 10000, errors);

    // Weapon-specific validation
    if (item.type === 'weapon') {
        if (item.damage) {
            if (typeof item.damage !== 'object') {
                errors.push('"damage" must be an object with dice and damageType');
            } else {
                const dmg = item.damage as Record<string, unknown>;
                isValidDiceNotation(dmg.dice, 'damage.dice', errors);
                isValidString(dmg.damageType, 'damage.damageType', errors);
                isValidDiceNotation(dmg.versatile, 'damage.versatile', errors);
            }
        }
    }

    // Armor-specific validation
    if (item.type === 'armor') {
        isValidNumber(item.acBonus, 'acBonus', 0, 30, errors, true);
    }

    // Optional arrays
    if (item.properties !== undefined && !isArray(item.properties, 'properties', errors)) {
        // Error already added
    }

    if (item.grantsFeatures !== undefined) {
        if (isArray(item.grantsFeatures, 'grantsFeatures', errors)) {
            if (options.validateReferences) {
                const manager = getManager(options);
                for (const featureId of item.grantsFeatures as string[]) {
                    if (!classFeatureExists(featureId, manager)) {
                        warnings.push(`grantsFeatures references unknown feature: "${featureId}"`);
                    }
                }
            }
        }
    }

    if (item.grantsSpells !== undefined) {
        if (isArray(item.grantsSpells, 'grantsSpells', errors)) {
            if (options.validateReferences) {
                const manager = getManager(options);
                for (const spellGrant of item.grantsSpells as Array<{ spellId?: string }>) {
                    if (spellGrant.spellId && !spellExists(spellGrant.spellId, manager)) {
                        warnings.push(`grantsSpells references unknown spell: "${spellGrant.spellId}"`);
                    }
                }
            }
        }
    }

    return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate appearance content (body types, hair styles, facial features)
 */
function validateAppearanceOption(item: ContentItem): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Simple string values
    if (typeof item === 'string') {
        return { valid: true, errors, warnings };
    }

    // Object with value property
    if (!isValidString(item.value, 'value', errors)) {
        // Error already added
    }

    return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate appearance color content (skin tones, hair colors, eye colors)
 */
function validateAppearanceColor(item: ContentItem): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const colorValue = typeof item === 'string' ? item : item.value;

    if (!colorValue || typeof colorValue !== 'string') {
        errors.push('Color option must be a string or have a "value" property');
    } else {
        isValidHexColor(colorValue, warnings);
    }

    return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate spell content
 */
function validateSpell(item: ContentItem, options: ValidationOptions): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    isValidString(item.name, 'name', errors);

    isValidNumber(item.level, 'level', 0, 9, errors);

    if (!VALID_SCHOOLS.includes(item.school as SpellSchool)) {
        errors.push(`"school" must be one of: ${VALID_SCHOOLS.join(', ')}`);
    }

    // Optional fields with defaults
    if (item.casting_time !== undefined) {
        isValidString(item.casting_time, 'casting_time', errors);
    }
    if (item.range !== undefined) {
        isValidString(item.range, 'range', errors);
    }
    if (item.duration !== undefined) {
        isValidString(item.duration, 'duration', errors);
    }
    if (item.components !== undefined) {
        if (isArray(item.components, 'components', errors)) {
            const validComponents = ['V', 'S', 'M'];
            for (const comp of item.components as string[]) {
                if (!validComponents.includes(comp)) {
                    warnings.push(`Unknown component type: "${comp}" (expected V, S, or M)`);
                }
            }
        }
    }
    if (item.description !== undefined) {
        isValidString(item.description, 'description', errors);
    }

    // Prerequisites validation
    if (item.prerequisites && options.validateBusinessRules) {
        const prereqs = item.prerequisites as Record<string, unknown>;
        if (prereqs.level !== undefined) {
            isValidNumber(prereqs.level, 'prerequisites.level', 1, 20, errors);
        }
    }

    return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate class feature content
 */
function validateClassFeature(item: ContentItem, options: ValidationOptions): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    isValidId(item.id, 'id', errors);
    isValidString(item.name, 'name', errors);
    isValidString(item.description, 'description', errors);

    if (!VALID_FEATURE_TYPES.includes(item.type as FeatureType)) {
        errors.push(`"type" must be one of: ${VALID_FEATURE_TYPES.join(', ')}`);
    }

    isValidString(item.class, 'class', errors);
    isValidNumber(item.level, 'level', 1, 20, errors);

    // Reference validation
    if (options.validateReferences && typeof item.class === 'string') {
        const manager = getManager(options);
        if (!classExists(item.class, manager)) {
            warnings.push(`Class "${item.class}" does not exist (may need to register class first)`);
        }
    }

    // Effects validation
    if (item.effects !== undefined && isArray(item.effects, 'effects', errors)) {
        for (const effect of item.effects as Array<Record<string, unknown>>) {
            if (!effect.type) {
                warnings.push('Effect missing "type" property');
            }
            if (!effect.target) {
                warnings.push('Effect missing "target" property');
            }
        }
    }

    // Prerequisites validation
    if (item.prerequisites && options.validateBusinessRules) {
        const prereqs = item.prerequisites as Record<string, unknown>;
        if (prereqs.level !== undefined) {
            isValidNumber(prereqs.level, 'prerequisites.level', 1, 20, errors);
        }
        if (prereqs.abilities !== undefined) {
            const abilities = prereqs.abilities as Record<string, unknown>;
            for (const [ability, value] of Object.entries(abilities)) {
                if (!VALID_ABILITIES.includes(ability as Ability)) {
                    errors.push(`Invalid ability in prerequisites: "${ability}"`);
                } else if (typeof value !== 'number' || value < 1 || value > 30) {
                    errors.push(`Prerequisite ${ability} must be a number between 1 and 30`);
                }
            }
        }
    }

    return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate racial trait content
 */
function validateRacialTrait(item: ContentItem, options: ValidationOptions): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    isValidId(item.id, 'id', errors);
    isValidString(item.name, 'name', errors);
    isValidString(item.description, 'description', errors);
    isValidString(item.race, 'race', errors);

    // Reference validation
    if (options.validateReferences && typeof item.race === 'string') {
        const manager = getManager(options);
        if (!raceExists(item.race, manager)) {
            warnings.push(`Race "${item.race}" does not exist (may need to register race first)`);
        }
    }

    // Optional subrace
    if (item.subrace !== undefined) {
        isValidString(item.subrace, 'subrace', errors);
    }

    // Effects validation
    if (item.effects !== undefined && isArray(item.effects, 'effects', errors)) {
        for (const effect of item.effects as Array<Record<string, unknown>>) {
            if (!effect.type) {
                warnings.push('Effect missing "type" property');
            }
            if (!effect.target) {
                warnings.push('Effect missing "target" property');
            }
        }
    }

    // Prerequisites validation
    if (item.prerequisites && options.validateBusinessRules) {
        const prereqs = item.prerequisites as Record<string, unknown>;
        if (prereqs.level !== undefined) {
            isValidNumber(prereqs.level, 'prerequisites.level', 1, 20, errors);
        }
        if (prereqs.subrace !== undefined) {
            isValidString(prereqs.subrace, 'prerequisites.subrace', errors);
        }
    }

    return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate skill content
 */
function validateSkill(item: ContentItem, _options: ValidationOptions): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    isValidId(item.id, 'id', errors);
    isValidString(item.name, 'name', errors);
    isValidAbility(item.ability, 'ability', errors);

    // Optional fields
    if (item.description !== undefined) {
        isValidString(item.description, 'description', errors);
    }
    if (item.armorPenalty !== undefined && typeof item.armorPenalty !== 'boolean') {
        errors.push('"armorPenalty" must be a boolean');
    }
    if (item.categories !== undefined) {
        isArray(item.categories, 'categories', errors);
    }

    return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate skill list content
 */
function validateSkillList(item: ContentItem, options: ValidationOptions): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    isValidString(item.class, 'class', errors);
    isValidNumber(item.skillCount, 'skillCount', 0, 20, errors);

    if (isArray(item.availableSkills, 'availableSkills', errors)) {
        // Reference validation
        if (options.validateReferences) {
            const manager = getManager(options);
            for (const skillId of item.availableSkills as string[]) {
                if (!skillExists(skillId, manager)) {
                    warnings.push(`Skill "${skillId}" does not exist`);
                }
            }
        }
    }

    // Optional fields
    if (item.hasExpertise !== undefined && typeof item.hasExpertise !== 'boolean') {
        errors.push('"hasExpertise" must be a boolean');
    }
    if (item.expertiseCount !== undefined) {
        isValidNumber(item.expertiseCount, 'expertiseCount', 0, 10, errors);
    }

    // Reference validation for class
    if (options.validateReferences && typeof item.class === 'string') {
        const manager = getManager(options);
        if (!classExists(item.class, manager)) {
            warnings.push(`Class "${item.class}" does not exist`);
        }
    }

    return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate class content (classes.data)
 */
function validateClassData(item: ContentItem, options: ValidationOptions): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields (unless baseClass is specified)
    isValidString(item.name, 'name', errors);

    const hasBaseClass = typeof item.baseClass === 'string';

    // If no baseClass, all fields are required
    if (!hasBaseClass) {
        if (!VALID_ABILITIES.includes(item.primary_ability as Ability)) {
            errors.push(`"primary_ability" must be one of: ${VALID_ABILITIES.join(', ')}`);
        }

        if (!VALID_HIT_DICE.includes(item.hit_die as typeof VALID_HIT_DICE[number])) {
            errors.push(`"hit_die" must be one of: ${VALID_HIT_DICE.join(', ')}`);
        }

        if (isArray(item.saving_throws, 'saving_throws', errors)) {
            // Business rule: exactly 2 saving throws
            if (options.validateBusinessRules && (item.saving_throws as string[]).length !== 2) {
                errors.push('Class must have exactly 2 saving throws');
            }
            for (const save of item.saving_throws as string[]) {
                if (!VALID_ABILITIES.includes(save as Ability)) {
                    errors.push(`Invalid saving throw ability: "${save}"`);
                }
            }
        }

        if (typeof item.is_spellcaster !== 'boolean') {
            errors.push('"is_spellcaster" must be a boolean');
        }

        isValidNumber(item.skill_count, 'skill_count', 0, 10, errors);

        if (isArray(item.available_skills, 'available_skills', errors)) {
            // Reference validation
            if (options.validateReferences) {
                const manager = getManager(options);
                for (const skillId of item.available_skills as string[]) {
                    if (!skillExists(skillId, manager)) {
                        warnings.push(`Skill "${skillId}" does not exist`);
                    }
                }
            }
        }

        if (typeof item.has_expertise !== 'boolean') {
            errors.push('"has_expertise" must be a boolean');
        }
    } else {
        // Reference validation for baseClass
        if (options.validateReferences) {
            const manager = getManager(options);
            if (!classExists(item.baseClass as string, manager)) {
                errors.push(`Base class "${item.baseClass}" does not exist`);
            }
        }
    }

    // Optional audio preferences
    if (item.audio_preferences !== undefined) {
        const audioPrefs = item.audio_preferences as Record<string, unknown>;

        if (audioPrefs.primary !== undefined && !VALID_AUDIO_TRAITS.includes(audioPrefs.primary as AudioTrait)) {
            errors.push(`audio_preferences.primary must be one of: ${VALID_AUDIO_TRAITS.join(', ')}`);
        }
        if (audioPrefs.secondary !== undefined && !VALID_AUDIO_TRAITS.includes(audioPrefs.secondary as AudioTrait)) {
            errors.push(`audio_preferences.secondary must be one of: ${VALID_AUDIO_TRAITS.join(', ')}`);
        }
        if (audioPrefs.tertiary !== undefined && !VALID_AUDIO_TRAITS.includes(audioPrefs.tertiary as AudioTrait)) {
            errors.push(`audio_preferences.tertiary must be one of: ${VALID_AUDIO_TRAITS.join(', ')}`);
        }

        // Validate weight sliders
        for (const trait of ['bass', 'treble', 'mid', 'amplitude'] as const) {
            if (audioPrefs[trait] !== undefined) {
                isValidNumber(audioPrefs[trait], `audio_preferences.${trait}`, 0, 10, errors);
            }
        }
    }

    return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate race data content (races.data)
 */
function validateRaceData(item: ContentItem, options: ValidationOptions): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    isValidString(item.race ?? item.name, 'race', errors);
    isValidNumber(item.speed, 'speed', 0, 120, errors);

    // Ability bonuses
    if (item.ability_bonuses !== undefined) {
        const bonuses = item.ability_bonuses as Record<string, unknown>;
        for (const [ability, value] of Object.entries(bonuses)) {
            if (!VALID_ABILITIES.includes(ability as Ability)) {
                errors.push(`Invalid ability in ability_bonuses: "${ability}"`);
            } else if (typeof value !== 'number' || value < -5 || value > 10) {
                errors.push(`ability_bonuses.${ability} must be a number between -5 and 10`);
            }
        }
    }

    // Traits validation
    if (item.traits !== undefined && isArray(item.traits, 'traits', errors)) {
        if (options.validateReferences) {
            const manager = getManager(options);
            for (const traitId of item.traits as string[]) {
                if (!racialTraitExists(traitId, manager)) {
                    warnings.push(`Racial trait "${traitId}" does not exist`);
                }
            }
        }
    }

    // Subraces
    if (item.subraces !== undefined) {
        if (isArray(item.subraces, 'subraces', errors)) {
            for (const subrace of item.subraces as string[]) {
                if (typeof subrace !== 'string' || subrace.trim().length === 0) {
                    errors.push('Subrace names must be non-empty strings');
                }
            }
        }
    }

    return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate spell list content
 */
function validateSpellList(item: ContentItem, options: ValidationOptions): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    isValidString(item.class, 'class', errors);

    // Reference validation for class
    if (options.validateReferences && typeof item.class === 'string') {
        const manager = getManager(options);
        if (!classExists(item.class, manager)) {
            warnings.push(`Class "${item.class}" does not exist`);
        }
    }

    // Cantrips
    if (item.cantrips !== undefined && isArray(item.cantrips, 'cantrips', errors)) {
        if (options.validateReferences) {
            const manager = getManager(options);
            for (const spellName of item.cantrips as string[]) {
                if (!spellExists(spellName, manager)) {
                    warnings.push(`Cantrip "${spellName}" does not exist`);
                }
            }
        }
    }

    // Spells by level
    if (item.spells_by_level !== undefined) {
        const byLevel = item.spells_by_level as Record<string, unknown>;
        for (const [level, spells] of Object.entries(byLevel)) {
            const levelNum = parseInt(level, 10);
            if (isNaN(levelNum) || levelNum < 1 || levelNum > 9) {
                errors.push(`Invalid spell level: "${level}"`);
            }
            if (isArray(spells, `spells_by_level.${level}`, errors)) {
                if (options.validateReferences) {
                    const manager = getManager(options);
                    for (const spellName of spells as string[]) {
                        if (!spellExists(spellName, manager)) {
                            warnings.push(`Spell "${spellName}" (level ${level}) does not exist`);
                        }
                    }
                }
            }
        }
    }

    return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate spell slots content
 */
function validateSpellSlots(item: ContentItem, options: ValidationOptions): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    isValidString(item.class, 'class', errors);

    // Reference validation for class
    if (options.validateReferences && typeof item.class === 'string') {
        const manager = getManager(options);
        if (!classExists(item.class, manager)) {
            warnings.push(`Class "${item.class}" does not exist`);
        }
    }

    // Slots by level
    if (item.slots !== undefined) {
        const slots = item.slots as Record<string, unknown>;
        for (const [charLevel, levelSlots] of Object.entries(slots)) {
            const charLevelNum = parseInt(charLevel, 10);
            if (isNaN(charLevelNum) || charLevelNum < 1 || charLevelNum > 20) {
                errors.push(`Invalid character level: "${charLevel}"`);
            }
            if (typeof levelSlots !== 'object' || levelSlots === null) {
                errors.push(`slots.${charLevel} must be an object`);
            }
        }
    }

    return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate starting equipment content
 */
function validateStartingEquipment(item: ContentItem, options: ValidationOptions): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    isValidString(item.class, 'class', errors);

    // Reference validation for class
    if (options.validateReferences && typeof item.class === 'string') {
        const manager = getManager(options);
        if (!classExists(item.class, manager)) {
            warnings.push(`Class "${item.class}" does not exist`);
        }
    }

    // Optional arrays
    if (item.weapons !== undefined) {
        isArray(item.weapons, 'weapons', errors);
    }
    if (item.armor !== undefined) {
        isArray(item.armor, 'armor', errors);
    }
    if (item.items !== undefined) {
        isArray(item.items, 'items', errors);
    }

    return { valid: errors.length === 0, errors, warnings };
}

// ============================================
// Main Validation Functions
// ============================================

/**
 * Validate content for a specific category.
 *
 * @param category - The content category to validate for
 * @param item - The item to validate
 * @param options - Optional validation options
 * @returns Validation result with errors and warnings
 *
 * @example
 * ```typescript
 * const result = validateContent('spells', {
 *   name: 'Fireball',
 *   level: 3,
 *   school: 'Evocation'
 * });
 *
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * }
 * ```
 */
export function validateContent(
    category: ContentCategory,
    item: ContentItem,
    options: ValidationOptions = {}
): ValidationResult {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const errors: string[] = [];
    const warnings: string[] = [];

    // Common validation for all categories
    if (!item || typeof item !== 'object') {
        errors.push('Item must be an object');
        return { valid: false, errors, warnings };
    }

    // Extract base category (e.g., 'spells.Wizard' -> 'spells')
    const baseCategory = category.includes('.')
        ? category.split('.')[0] + '.' + category.split('.')[1]
        : category;

    // Route to category-specific validator
    switch (baseCategory) {
        case 'equipment':
        case 'equipment.templates':
            return validateEquipment(item, opts);

        case 'appearance.bodyTypes':
        case 'appearance.hairStyles':
        case 'appearance.facialFeatures':
            return validateAppearanceOption(item);

        case 'appearance.skinTones':
        case 'appearance.hairColors':
        case 'appearance.eyeColors':
            return validateAppearanceColor(item);

        case 'spells':
            return validateSpell(item, opts);

        case 'classFeatures':
            return validateClassFeature(item, opts);

        case 'racialTraits':
            return validateRacialTrait(item, opts);

        case 'skills':
            return validateSkill(item, opts);

        case 'skillLists':
            return validateSkillList(item, opts);

        case 'classes':
            // Class names - check for name property
            if (typeof item.name === 'string' && item.name.length > 0) {
                return { valid: true, errors: [], warnings };
            }
            return {
                valid: false,
                errors: ['Class must have a valid "name" property'],
                warnings
            };

        case 'classes.data':
            return validateClassData(item, opts);

        case 'races':
            // Race names - check for name property
            if (typeof item.name === 'string' && item.name.length > 0) {
                return { valid: true, errors: [], warnings };
            }
            return {
                valid: false,
                errors: ['Race must have a valid "name" property'],
                warnings
            };

        case 'races.data':
            return validateRaceData(item, opts);

        case 'classSpellLists':
            return validateSpellList(item, opts);

        case 'classSpellSlots':
            return validateSpellSlots(item, opts);

        case 'classStartingEquipment':
            return validateStartingEquipment(item, opts);

        default:
            // Unknown category - just check for name or id
            if (!item.name && !item.id) {
                warnings.push('Items typically have a "name" or "id" property');
            }
            return { valid: true, errors, warnings };
    }
}

/**
 * Validate multiple items for a category.
 *
 * @param category - The content category to validate for
 * @param items - Array of items to validate
 * @param options - Optional validation options
 * @returns Array of validation results, one per item
 *
 * @example
 * ```typescript
 * const results = validateMultiple('spells', [
 *   { name: 'Fireball', level: 3, school: 'Evocation' },
 *   { name: 'Magic Missile', level: 1, school: 'Evocation' }
 * ]);
 *
 * const invalidItems = results.filter(r => !r.valid);
 * ```
 */
export function validateMultiple(
    category: ContentCategory,
    items: ContentItem[],
    options: ValidationOptions = {}
): ValidationResult[] {
    return items.map((item, index) => {
        const result = validateContent(category, item, options);
        // Prefix errors with item index for clarity
        if (result.errors.length > 0 || result.warnings.length > 0) {
            result.errors = result.errors.map(e => `Item ${index + 1}: ${e}`);
            result.warnings = result.warnings.map(w => `Item ${index + 1}: ${w}`);
        }
        return result;
    });
}

/**
 * Validate content and log results.
 *
 * @param category - The content category to validate for
 * @param item - The item to validate
 * @param options - Optional validation options
 * @returns Validation result with errors and warnings
 */
export function validateAndLog(
    category: ContentCategory,
    item: ContentItem,
    options: ValidationOptions = {}
): ValidationResult {
    const result = validateContent(category, item, options);

    if (!result.valid) {
        logger.warn('ContentValidation', `Validation failed for ${category}`, result.errors);
    }
    if (result.warnings.length > 0) {
        logger.debug('ContentValidation', `Validation warnings for ${category}`, result.warnings);
    }

    return result;
}

/**
 * Check if content is valid without returning detailed errors.
 *
 * @param category - The content category to validate for
 * @param item - The item to validate
 * @param options - Optional validation options
 * @returns true if valid, false otherwise
 */
export function isValidContent(
    category: ContentCategory,
    item: ContentItem,
    options: ValidationOptions = {}
): boolean {
    return validateContent(category, item, options).valid;
}

/**
 * Get all errors from a validation result as a single string.
 *
 * @param result - Validation result
 * @returns Formatted error string
 */
export function formatErrors(result: ValidationResult): string {
    if (result.errors.length === 0) return '';
    return result.errors.join('; ');
}

/**
 * Get all warnings from a validation result as a single string.
 *
 * @param result - Validation result
 * @returns Formatted warning string
 */
export function formatWarnings(result: ValidationResult): string {
    if (result.warnings.length === 0) return '';
    return result.warnings.join('; ');
}
