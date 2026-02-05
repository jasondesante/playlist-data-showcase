import { z } from 'zod';
import type { CharacterSheet } from 'playlist-data-engine';

/**
 * Zod schema for validating CharacterSheet imports
 *
 * This schema provides runtime validation for character data imported from JSON files.
 * It ensures the imported data matches the expected CharacterSheet structure from playlist-data-engine.
 */

// Basic enums (re-declared for validation - these should match playlist-data-engine types)
const RaceEnum = z.enum([
  'Human', 'Elf', 'Dwarf', 'Halfling', 'Gnome', 'Half-Elf', 'Half-Orc', 'Tiefling', 'Dragonborn'
]);

const ClassEnum = z.enum([
  'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard'
]);

const GameModeEnum = z.enum(['standard', 'uncapped']);

// HP Schema
const HPSchema = z.object({
  current: z.number().int().min(0),
  max: z.number().int().positive(),
  temp: z.number().int().min(0)
});

// XP Schema
const XPSchema = z.object({
  current: z.number().int().min(0),
  next_level: z.number().int().positive()
});

// Ability Scores Schema
const AbilityScoresSchema = z.object({
  STR: z.number().int().min(1).max(30),
  DEX: z.number().int().min(1).max(30),
  CON: z.number().int().min(1).max(30),
  INT: z.number().int().min(1).max(30),
  WIS: z.number().int().min(1).max(30),
  CHA: z.number().int().min(1).max(30)
});

// Skills Schema
const SkillsSchema = z.record(
  z.enum(['athletics', 'acrobatics', 'sleight_of_hand', 'stealth', 'arcana', 'history',
         'investigation', 'nature', 'religion', 'animal_handling', 'insight', 'medicine',
         'perception', 'survival', 'deception', 'intimidation', 'performance', 'persuasion']),
  z.enum(['none', 'proficient', 'expertise'])
);

// Saving Throws Schema
const SavingThrowsSchema = z.record(
  z.enum(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']),
  z.boolean()
);

// Equipment Schema (with full structure)
const EquipmentItemSchema = z.object({
  name: z.string(),
  quantity: z.number().int().positive(),
  equipped: z.boolean()
});

const EquipmentSchema = z.object({
  weapons: z.array(EquipmentItemSchema),
  armor: z.array(EquipmentItemSchema),
  items: z.array(EquipmentItemSchema),
  totalWeight: z.number(),
  equippedWeight: z.number()
}).optional();

// Spells Schema (with full structure)
const SpellSlotSchema = z.object({
  total: z.number().int().min(0),
  used: z.number().int().min(0)
});

const SpellsSchema = z.object({
  cantrips: z.array(z.string()),
  known_spells: z.array(z.string()),
  spell_slots: z.record(z.string(), SpellSlotSchema)
}).optional();

// Appearance Schema
const AppearanceSchema = z.object({
  body_type: z.string(),
  skin_tone: z.string(),
  hair_style: z.string(),
  hair_color: z.string(),
  eye_color: z.string(),
  facial_features: z.array(z.string()),
  // Optional dynamic features
  primary_color: z.string().optional(),
  secondary_color: z.string().optional(),
  accent_color: z.string().optional(),
  aura_color: z.string().optional()
}).optional();

// Feature Effect Schema (permissive - allows engine's FeatureEffect structure)
const FeatureEffectSchema = z.object({
  type: z.string(),
  value: z.any().optional(),
  target: z.string().optional(),
  duration: z.string().optional()
}).passthrough();

// Equipment Property Schema
const EquipmentPropertySchema = z.object({
  type: z.string(),
  value: z.any().optional()
}).passthrough();

// Equipment Feature Schema
const EquipmentFeatureSchema = z.object({
  name: z.string(),
  description: z.string().optional()
}).passthrough();

// Equipment Skill Schema
const EquipmentSkillSchema = z.object({
  name: z.string(),
  proficiency: z.string().optional()
}).passthrough();

// Equipment Spell Schema
const EquipmentSpellSchema = z.object({
  name: z.string(),
  uses: z.number().optional()
}).passthrough();

// Equipment Effects Schema
const EquipmentEffectsSchema = z.object({
  source: z.string(),
  instanceId: z.string().optional(),
  effects: z.array(EquipmentPropertySchema),
  features: z.array(EquipmentFeatureSchema),
  skills: z.array(EquipmentSkillSchema),
  spells: z.array(EquipmentSpellSchema).optional()
}).passthrough();

// Main CharacterSheet Schema - use passthrough for flexible objects
export const CharacterSheetSchema = z.object({
  // Core identifiers
  seed: z.string().min(1),
  name: z.string().min(1),

  // Basic info
  level: z.number().int().min(1).max(20),
  race: RaceEnum,
  subrace: z.string().optional(),
  class: ClassEnum,

  // Combat stats
  hp: HPSchema,
  armor_class: z.number().int().min(1),
  initiative: z.number().int(),
  speed: z.number().int().positive(),

  // Abilities
  ability_scores: AbilityScoresSchema,
  ability_modifiers: AbilityScoresSchema,
  proficiency_bonus: z.number().int().min(2).max(6),

  // Skills & Saving Throws
  skills: SkillsSchema,
  saving_throws: SavingThrowsSchema,

  // Features
  racial_traits: z.array(z.string()),
  class_features: z.array(z.string()),

  // Optional advanced features
  equipment: EquipmentSchema,
  spells: SpellsSchema,
  appearance: AppearanceSchema,

  // XP
  xp: XPSchema,

  // Timestamps
  generated_at: z.string().datetime(),

  // Game mode and progression
  gameMode: GameModeEnum.optional(),
  pendingStatIncreases: z.number().int().min(0).optional(),

  // Effects
  feature_effects: z.array(FeatureEffectSchema).optional(),
  equipment_effects: z.array(EquipmentEffectsSchema).optional()
});

/**
 * Validates a character sheet from JSON data
 * @param data - Unknown data (typically from JSON.parse)
 * @returns Validation result with success flag and data or error
 */
export function validateCharacterSheet(data: unknown): {
  success: boolean;
  data?: CharacterSheet;
  error?: string;
} {
  try {
    const result = CharacterSheetSchema.safeParse(data);

    if (result.success) {
      // Cast to CharacterSheet - we've done our best to validate structure
      return {
        success: true,
        data: result.data as CharacterSheet
      };
    }

    // Format error messages nicely
    const errorMessages = result.error.errors.map((err) => {
      const path = err.path.join('.');
      return `${path}: ${err.message}`;
    }).join(', ');

    return {
      success: false,
      error: `Validation failed: ${errorMessages}`
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown validation error'
    };
  }
}
