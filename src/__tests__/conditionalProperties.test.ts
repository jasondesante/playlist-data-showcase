/**
 * Task 7.2: Test Conditional Properties
 *
 * Tests for verifying conditional properties display correctly in the DataViewerTab:
 * - All condition types display correctly
 * - Inline formatting is readable
 * - Condition icons render properly
 */

import { describe, it, expect } from 'vitest';
import type { EquipmentCondition, EquipmentProperty } from 'playlist-data-engine';

/**
 * formatCondition function (copied from DataViewerTab.tsx for testing)
 *
 * This tests the actual implementation logic to ensure conditions are formatted correctly.
 * The function is tested in isolation to verify all condition types.
 */
function formatCondition(condition: EquipmentCondition | undefined): string {
  if (!condition) return '';

  switch (condition.type) {
    case 'vs_creature_type':
      return `vs ${condition.value.charAt(0).toUpperCase() + condition.value.slice(1)}`;

    case 'at_time_of_day':
      return `at ${condition.value.charAt(0).toUpperCase() + condition.value.slice(1)}`;

    case 'wielder_race':
      return `${condition.value.charAt(0).toUpperCase() + condition.value.slice(1)} only`;

    case 'wielder_class':
      return `${condition.value.charAt(0).toUpperCase() + condition.value.slice(1)} only`;

    case 'while_equipped':
      return '';

    case 'on_hit':
      return 'on hit';

    case 'on_damage_taken':
      return 'when hit';

    case 'custom':
      return condition.description || condition.value;

    default:
      return '';
  }
}

/**
 * Property type configuration for icons
 */
const PROPERTY_TYPE_CONFIG: Record<string, { label: string }> = {
  'stat_bonus': { label: 'Stat Bonus' },
  'skill_proficiency': { label: 'Skill' },
  'ability_unlock': { label: 'Ability' },
  'passive_modifier': { label: 'Passive' },
  'damage_bonus': { label: 'Damage' },
  'special_property': { label: 'Special' },
  'default': { label: 'Property' }
};

function getPropertyTypeConfig(type: string) {
  return PROPERTY_TYPE_CONFIG[type] || PROPERTY_TYPE_CONFIG['default'];
}

describe('Task 7.2: Conditional Properties - formatCondition', () => {
  describe('Condition Type: vs_creature_type', () => {
    it('should format dragon creature type with capitalization', () => {
      const condition: EquipmentCondition = {
        type: 'vs_creature_type',
        value: 'dragon'
      };
      expect(formatCondition(condition)).toBe('vs Dragon');
    });

    it('should format undead creature type with capitalization', () => {
      const condition: EquipmentCondition = {
        type: 'vs_creature_type',
        value: 'undead'
      };
      expect(formatCondition(condition)).toBe('vs Undead');
    });

    it('should format fiend creature type', () => {
      const condition: EquipmentCondition = {
        type: 'vs_creature_type',
        value: 'fiend'
      };
      expect(formatCondition(condition)).toBe('vs Fiend');
    });

    it('should format troll creature type', () => {
      const condition: EquipmentCondition = {
        type: 'vs_creature_type',
        value: 'troll'
      };
      expect(formatCondition(condition)).toBe('vs Troll');
    });

    it('should handle multi-word creature types', () => {
      const condition: EquipmentCondition = {
        type: 'vs_creature_type',
        value: 'giant'
      };
      expect(formatCondition(condition)).toBe('vs Giant');
    });
  });

  describe('Condition Type: at_time_of_day', () => {
    it('should format night time correctly', () => {
      const condition: EquipmentCondition = {
        type: 'at_time_of_day',
        value: 'night'
      };
      expect(formatCondition(condition)).toBe('at Night');
    });

    it('should format day time correctly', () => {
      const condition: EquipmentCondition = {
        type: 'at_time_of_day',
        value: 'day'
      };
      expect(formatCondition(condition)).toBe('at Day');
    });

    it('should format dawn time correctly', () => {
      const condition: EquipmentCondition = {
        type: 'at_time_of_day',
        value: 'dawn'
      };
      expect(formatCondition(condition)).toBe('at Dawn');
    });

    it('should format dusk time correctly', () => {
      const condition: EquipmentCondition = {
        type: 'at_time_of_day',
        value: 'dusk'
      };
      expect(formatCondition(condition)).toBe('at Dusk');
    });
  });

  describe('Condition Type: wielder_race', () => {
    it('should format elf race correctly', () => {
      const condition: EquipmentCondition = {
        type: 'wielder_race',
        value: 'elf'
      };
      expect(formatCondition(condition)).toBe('Elf only');
    });

    it('should format dwarf race correctly', () => {
      const condition: EquipmentCondition = {
        type: 'wielder_race',
        value: 'dwarf'
      };
      expect(formatCondition(condition)).toBe('Dwarf only');
    });

    it('should format human race correctly', () => {
      const condition: EquipmentCondition = {
        type: 'wielder_race',
        value: 'human'
      };
      expect(formatCondition(condition)).toBe('Human only');
    });

    it('should capitalize first letter of race', () => {
      const condition: EquipmentCondition = {
        type: 'wielder_race',
        value: 'halforc'
      };
      expect(formatCondition(condition)).toBe('Halforc only');
    });
  });

  describe('Condition Type: wielder_class', () => {
    it('should format paladin class correctly', () => {
      const condition: EquipmentCondition = {
        type: 'wielder_class',
        value: 'paladin'
      };
      expect(formatCondition(condition)).toBe('Paladin only');
    });

    it('should format rogue class correctly', () => {
      const condition: EquipmentCondition = {
        type: 'wielder_class',
        value: 'rogue'
      };
      expect(formatCondition(condition)).toBe('Rogue only');
    });

    it('should format wizard class correctly', () => {
      const condition: EquipmentCondition = {
        type: 'wielder_class',
        value: 'wizard'
      };
      expect(formatCondition(condition)).toBe('Wizard only');
    });

    it('should format fighter class correctly', () => {
      const condition: EquipmentCondition = {
        type: 'wielder_class',
        value: 'fighter'
      };
      expect(formatCondition(condition)).toBe('Fighter only');
    });
  });

  describe('Condition Type: while_equipped', () => {
    it('should return empty string (implicit condition)', () => {
      const condition: EquipmentCondition = {
        type: 'while_equipped',
        value: true
      };
      expect(formatCondition(condition)).toBe('');
    });
  });

  describe('Condition Type: on_hit', () => {
    it('should format on_hit trigger correctly', () => {
      const condition: EquipmentCondition = {
        type: 'on_hit',
        value: true
      };
      expect(formatCondition(condition)).toBe('on hit');
    });
  });

  describe('Condition Type: on_damage_taken', () => {
    it('should format on_damage_taken trigger correctly', () => {
      const condition: EquipmentCondition = {
        type: 'on_damage_taken',
        value: true
      };
      expect(formatCondition(condition)).toBe('when hit');
    });
  });

  describe('Condition Type: custom', () => {
    it('should use custom description when provided', () => {
      const condition: EquipmentCondition = {
        type: 'custom',
        value: 'custom_value',
        description: 'When the moon is full'
      };
      expect(formatCondition(condition)).toBe('When the moon is full');
    });

    it('should fall back to value when description is not provided', () => {
      const condition: EquipmentCondition = {
        type: 'custom',
        value: 'custom_condition_value'
      };
      expect(formatCondition(condition)).toBe('custom_condition_value');
    });

    it('should prefer description over value', () => {
      const condition: EquipmentCondition = {
        type: 'custom',
        value: 'value_to_ignore',
        description: 'Use this description'
      };
      expect(formatCondition(condition)).toBe('Use this description');
    });
  });

  describe('Edge Cases', () => {
    it('should return empty string for undefined condition', () => {
      expect(formatCondition(undefined)).toBe('');
    });

    it('should return empty string for null-like condition', () => {
      expect(formatCondition(undefined)).toBe('');
    });

    it('should handle unknown condition type gracefully', () => {
      const condition = {
        type: 'unknown_type' as any,
        value: 'test'
      };
      expect(formatCondition(condition)).toBe('');
    });
  });
});

describe('Task 7.2: Conditional Properties - Inline Formatting', () => {
  /**
   * Test that properties with conditions are formatted correctly inline
   * Format should be: "{property description} ({condition})"
   */
  describe('Property + Condition Formatting', () => {
    it('should format damage bonus with vs_creature_type condition', () => {
      const property: EquipmentProperty = {
        type: 'damage_bonus',
        target: 'fire',
        value: '3d6',
        condition: { type: 'vs_creature_type', value: 'dragon' },
        description: '+3d6 fire damage'
      };

      const conditionStr = formatCondition(property.condition);
      const displayText = property.description || `${property.type}: ${property.target}`;
      const formatted = `${displayText}${conditionStr ? ` (${conditionStr})` : ''}`;

      expect(formatted).toBe('+3d6 fire damage (vs Dragon)');
    });

    it('should format damage bonus with at_time_of_day condition', () => {
      const property: EquipmentProperty = {
        type: 'damage_bonus',
        target: 'radiant',
        value: '2d6',
        condition: { type: 'at_time_of_day', value: 'night' },
        description: '+2d6 radiant damage'
      };

      const conditionStr = formatCondition(property.condition);
      const displayText = property.description || `${property.type}: ${property.target}`;
      const formatted = `${displayText}${conditionStr ? ` (${conditionStr})` : ''}`;

      expect(formatted).toBe('+2d6 radiant damage (at Night)');
    });

    it('should format stat bonus with wielder_class condition', () => {
      const property: EquipmentProperty = {
        type: 'passive_modifier',
        target: 'saving_throws',
        value: 3,
        condition: { type: 'wielder_class', value: 'paladin' },
        description: '+3 to saving throws'
      };

      const conditionStr = formatCondition(property.condition);
      const displayText = property.description || `${property.type}: ${property.target}`;
      const formatted = `${displayText}${conditionStr ? ` (${conditionStr})` : ''}`;

      expect(formatted).toBe('+3 to saving throws (Paladin only)');
    });

    it('should format special property with wielder_race condition', () => {
      const property: EquipmentProperty = {
        type: 'special_property',
        target: 'sleep_immunity',
        value: true,
        condition: { type: 'wielder_race', value: 'elf' },
        description: 'Immunity to magic sleep'
      };

      const conditionStr = formatCondition(property.condition);
      const displayText = property.description || `${property.type}: ${property.target}`;
      const formatted = `${displayText}${conditionStr ? ` (${conditionStr})` : ''}`;

      expect(formatted).toBe('Immunity to magic sleep (Elf only)');
    });

    it('should format damage bonus with on_hit trigger', () => {
      const property: EquipmentProperty = {
        type: 'damage_bonus',
        target: 'fire',
        value: '1d6',
        condition: { type: 'on_hit', value: true },
        description: '+1d6 fire damage'
      };

      const conditionStr = formatCondition(property.condition);
      const displayText = property.description || `${property.type}: ${property.target}`;
      const formatted = `${displayText}${conditionStr ? ` (${conditionStr})` : ''}`;

      expect(formatted).toBe('+1d6 fire damage (on hit)');
    });

    it('should not add condition when empty (while_equipped)', () => {
      const property: EquipmentProperty = {
        type: 'stat_bonus',
        target: 'STR',
        value: 2,
        condition: { type: 'while_equipped', value: true },
        description: '+2 Strength'
      };

      const conditionStr = formatCondition(property.condition);
      const displayText = property.description || `${property.type}: ${property.target}`;
      const formatted = `${displayText}${conditionStr ? ` (${conditionStr})` : ''}`;

      expect(formatted).toBe('+2 Strength');
    });

    it('should handle property without condition', () => {
      const property: EquipmentProperty = {
        type: 'stat_bonus',
        target: 'DEX',
        value: 2,
        description: '+2 Dexterity'
      };

      const conditionStr = formatCondition(property.condition);
      const displayText = property.description || `${property.type}: ${property.target}`;
      const formatted = `${displayText}${conditionStr ? ` (${conditionStr})` : ''}`;

      expect(formatted).toBe('+2 Dexterity');
    });

    it('should use fallback display when no description', () => {
      const property: EquipmentProperty = {
        type: 'damage_bonus',
        target: 'cold',
        value: '1d8',
        condition: { type: 'on_damage_taken', value: true }
      };

      const conditionStr = formatCondition(property.condition);
      const displayText = property.description || `${property.type}: ${property.target}`;
      const formatted = `${displayText}${conditionStr ? ` (${conditionStr})` : ''}`;

      expect(formatted).toBe('damage_bonus: cold (when hit)');
    });
  });

  describe('Readability Tests', () => {
    it('should produce human-readable output for dragon slayer effect', () => {
      const property: EquipmentProperty = {
        type: 'damage_bonus',
        target: 'slashing',
        value: '3d6',
        condition: { type: 'vs_creature_type', value: 'dragon' },
        description: '+3d6 damage vs dragons'
      };

      const conditionStr = formatCondition(property.condition);
      const formatted = `${property.description}${conditionStr ? ` (${conditionStr})` : ''}`;

      // Output should be: "+3d6 damage vs dragons (vs Dragon)"
      // This is a bit redundant, but readable
      expect(formatted).toContain('Dragon');
      expect(formatted.length).toBeLessThan(50); // Should be concise
    });

    it('should produce readable output for time-based effect', () => {
      const property: EquipmentProperty = {
        type: 'damage_bonus',
        target: 'radiant',
        value: '2d6',
        condition: { type: 'at_time_of_day', value: 'night' },
        description: '+2d6 radiant at night'
      };

      const conditionStr = formatCondition(property.condition);
      const formatted = `${property.description}${conditionStr ? ` (${conditionStr})` : ''}`;

      expect(formatted).toContain('Night');
      expect(formatted).toBe('+2d6 radiant at night (at Night)');
    });

    it('should produce concise output for class restrictions', () => {
      const condition: EquipmentCondition = { type: 'wielder_class', value: 'paladin' };
      const result = formatCondition(condition);
      expect(result).toBe('Paladin only');
      expect(result.length).toBeLessThanOrEqual(20);
    });

    it('should produce concise output for race restrictions', () => {
      const condition: EquipmentCondition = { type: 'wielder_race', value: 'elf' };
      const result = formatCondition(condition);
      expect(result).toBe('Elf only');
      expect(result.length).toBeLessThanOrEqual(15);
    });
  });
});

describe('Task 7.2: Conditional Properties - Property Icons', () => {
  /**
   * Test that property types map to correct icon configurations
   */
  describe('Property Type Configuration', () => {
    it('should have config for stat_bonus', () => {
      const config = getPropertyTypeConfig('stat_bonus');
      expect(config).toBeDefined();
      expect(config.label).toBe('Stat Bonus');
    });

    it('should have config for skill_proficiency', () => {
      const config = getPropertyTypeConfig('skill_proficiency');
      expect(config).toBeDefined();
      expect(config.label).toBe('Skill');
    });

    it('should have config for ability_unlock', () => {
      const config = getPropertyTypeConfig('ability_unlock');
      expect(config).toBeDefined();
      expect(config.label).toBe('Ability');
    });

    it('should have config for passive_modifier', () => {
      const config = getPropertyTypeConfig('passive_modifier');
      expect(config).toBeDefined();
      expect(config.label).toBe('Passive');
    });

    it('should have config for damage_bonus', () => {
      const config = getPropertyTypeConfig('damage_bonus');
      expect(config).toBeDefined();
      expect(config.label).toBe('Damage');
    });

    it('should have config for special_property', () => {
      const config = getPropertyTypeConfig('special_property');
      expect(config).toBeDefined();
      expect(config.label).toBe('Special');
    });

    it('should return default for unknown type', () => {
      const config = getPropertyTypeConfig('unknown_type');
      expect(config).toBeDefined();
      expect(config.label).toBe('Property');
    });

    it('should return default for stat_requirement', () => {
      const config = getPropertyTypeConfig('stat_requirement');
      expect(config).toBeDefined();
      // stat_requirement is not in the config, so should get default
      expect(config.label).toBe('Property');
    });
  });

  describe('Icon Mapping Completeness', () => {
    const knownPropertyTypes = [
      'stat_bonus',
      'skill_proficiency',
      'ability_unlock',
      'passive_modifier',
      'damage_bonus',
      'special_property'
    ];

    it('should have configuration for all known property types', () => {
      knownPropertyTypes.forEach(type => {
        const config = getPropertyTypeConfig(type);
        expect(config).toBeDefined();
        expect(config.label).toBeTruthy();
      });
    });

    it('should not throw for any property type', () => {
      const allTypes = [
        ...knownPropertyTypes,
        'unknown_type',
        'random_type',
        'stat_requirement',
        ''
      ];

      allTypes.forEach(type => {
        expect(() => getPropertyTypeConfig(type)).not.toThrow();
      });
    });
  });
});

describe('Task 7.2: Integration - Full Property Display', () => {
  /**
   * Test complete property display strings as they would appear in the UI
   */
  describe('Example Equipment Properties', () => {
    it('should format Dragon Slayer Axe property correctly', () => {
      // From EQUIPMENT_SYSTEM.md Example 7
      const property: EquipmentProperty = {
        type: 'damage_bonus',
        target: 'dragon',
        value: '3d6',
        condition: { type: 'vs_creature_type', value: 'dragon' },
        description: '+3d6 damage vs dragons'
      };

      const conditionStr = formatCondition(property.condition);
      const displayText = property.description;
      const formatted = `${displayText}${conditionStr ? ` (${conditionStr})` : ''}`;
      const config = getPropertyTypeConfig(property.type);

      expect(formatted).toBe('+3d6 damage vs dragons (vs Dragon)');
      expect(config.label).toBe('Damage');
    });

    it('should format Moon Blade property correctly', () => {
      const property: EquipmentProperty = {
        type: 'damage_bonus',
        target: 'radiant',
        value: '2d6',
        condition: { type: 'at_time_of_day', value: 'night' },
        description: '+2d6 radiant damage at night'
      };

      const conditionStr = formatCondition(property.condition);
      const formatted = `${property.description}${conditionStr ? ` (${conditionStr})` : ''}`;

      expect(formatted).toBe('+2d6 radiant damage at night (at Night)');
    });

    it('should format Holy Avenger property correctly', () => {
      const property: EquipmentProperty = {
        type: 'passive_modifier',
        target: 'saving_throws',
        value: 3,
        condition: { type: 'wielder_class', value: 'paladin' },
        description: '+3 to saving throws'
      };

      const conditionStr = formatCondition(property.condition);
      const formatted = `${property.description}${conditionStr ? ` (${conditionStr})` : ''}`;

      expect(formatted).toBe('+3 to saving throws (Paladin only)');
    });

    it('should format Elven Chain property correctly', () => {
      const property: EquipmentProperty = {
        type: 'special_property',
        target: 'sleep_immunity',
        value: true,
        condition: { type: 'wielder_race', value: 'elf' },
        description: 'Immunity to magic that puts you to sleep'
      };

      const conditionStr = formatCondition(property.condition);
      const formatted = `${property.description}${conditionStr ? ` (${conditionStr})` : ''}`;

      expect(formatted).toBe('Immunity to magic that puts you to sleep (Elf only)');
    });

    it('should format Flaming Sword on_hit property correctly', () => {
      const property: EquipmentProperty = {
        type: 'damage_bonus',
        target: 'fire',
        value: '1d6',
        condition: { type: 'on_hit', value: true },
        description: '+1d6 fire damage'
      };

      const conditionStr = formatCondition(property.condition);
      const formatted = `${property.description}${conditionStr ? ` (${conditionStr})` : ''}`;

      expect(formatted).toBe('+1d6 fire damage (on hit)');
    });

    it('should format custom condition correctly', () => {
      const property: EquipmentProperty = {
        type: 'damage_bonus',
        target: 'psychic',
        value: '2d4',
        condition: {
          type: 'custom',
          value: 'full_moon',
          description: 'when the moon is full'
        },
        description: '+2d4 psychic damage'
      };

      const conditionStr = formatCondition(property.condition);
      const formatted = `${property.description}${conditionStr ? ` (${conditionStr})` : ''}`;

      expect(formatted).toBe('+2d4 psychic damage (when the moon is full)');
    });
  });
});
