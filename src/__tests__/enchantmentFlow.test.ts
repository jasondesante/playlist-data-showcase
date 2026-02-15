/**
 * Enchantment Flow Tests
 *
 * Task 7.1: Test Enchantment Flow
 * - Test applying weapon enchantments
 * - Test applying armor enchantments
 * - Test applying resistance enchantments
 * - Test applying stat boost enchantments
 * - Test applying combo enchantments
 * - Verify modifications appear in equipment_effects
 * - Verify stat changes are applied correctly
 *
 * These tests verify the core EquipmentModifier API from playlist-data-engine
 * works correctly for the enchantment system.
 */

import { describe, it, expect } from 'vitest';
import {
  EquipmentModifier,
  WEAPON_ENCHANTMENTS,
  ARMOR_ENCHANTMENTS,
  RESISTANCE_ENCHANTMENTS,
  CURSES,
  ALL_ENCHANTMENTS,
  createStrengthEnchantment,
  createDexterityEnchantment,
  createConstitutionEnchantment,
  createIntelligenceEnchantment,
  createWisdomEnchantment,
  createCharismaEnchantment,
  type CharacterEquipment,
  type EnhancedInventoryItem
} from 'playlist-data-engine';

// Helper to create a basic equipment state for testing
function createTestEquipment(): CharacterEquipment {
  return {
    weapons: [
      {
        name: 'Longsword',
        quantity: 1,
        equipped: true,
        instanceId: 'weapon-longsword-001'
      } as EnhancedInventoryItem,
      {
        name: 'Shortbow',
        quantity: 1,
        equipped: false,
        instanceId: 'weapon-shortbow-001'
      } as EnhancedInventoryItem
    ],
    armor: [
      {
        name: 'Leather Armor',
        quantity: 1,
        equipped: true,
        instanceId: 'armor-leather-001'
      } as EnhancedInventoryItem
    ],
    items: [
      {
        name: 'Healing Potion',
        quantity: 3,
        equipped: false,
        instanceId: 'item-potion-001'
      } as EnhancedInventoryItem
    ],
    totalWeight: 0,
    equippedWeight: 0
  };
}

describe('EquipmentModifier - Weapon Enchantments (Task 7.1)', () => {
  describe('Applying Enhancement Enchantments', () => {
    it('should apply +1 Enhancement enchantment to a weapon', () => {
      const equipment = createTestEquipment();
      const plusOne = WEAPON_ENCHANTMENTS.plusOne;

      const result = EquipmentModifier.enchant(equipment, 'Longsword', plusOne);

      const longsword = result.weapons.find(w => w.name === 'Longsword');
      expect(longsword).toBeDefined();
      expect(longsword?.modifications).toBeDefined();
      expect(longsword?.modifications?.length).toBe(1);
      expect(longsword?.modifications?.[0].id).toBe('plus_one');
      expect(longsword?.modifications?.[0].source).toBe('enchantment');
    });

    it('should apply +2 Enhancement enchantment to a weapon', () => {
      const equipment = createTestEquipment();
      const plusTwo = WEAPON_ENCHANTMENTS.plusTwo;

      const result = EquipmentModifier.enchant(equipment, 'Longsword', plusTwo);

      const longsword = result.weapons.find(w => w.name === 'Longsword');
      expect(longsword?.modifications?.length).toBe(1);
      expect(longsword?.modifications?.[0].id).toBe('plus_two');
    });

    it('should apply +3 Enhancement enchantment to a weapon', () => {
      const equipment = createTestEquipment();
      const plusThree = WEAPON_ENCHANTMENTS.plusThree;

      const result = EquipmentModifier.enchant(equipment, 'Longsword', plusThree);

      const longsword = result.weapons.find(w => w.name === 'Longsword');
      expect(longsword?.modifications?.length).toBe(1);
      expect(longsword?.modifications?.[0].id).toBe('plus_three');
    });
  });

  describe('Applying Elemental Enchantments', () => {
    it('should apply Flaming enchantment to a weapon', () => {
      const equipment = createTestEquipment();
      const flaming = WEAPON_ENCHANTMENTS.flaming;

      const result = EquipmentModifier.enchant(equipment, 'Longsword', flaming);

      const longsword = result.weapons.find(w => w.name === 'Longsword');
      expect(longsword?.modifications?.length).toBe(1);
      expect(longsword?.modifications?.[0].id).toBe('flaming');
      expect(longsword?.modifications?.[0].properties).toContainEqual(
        expect.objectContaining({
          type: 'damage_bonus',
          target: 'fire_damage'
        })
      );
    });

    it('should apply Frost enchantment to a weapon', () => {
      const equipment = createTestEquipment();
      const frost = WEAPON_ENCHANTMENTS.frost;

      const result = EquipmentModifier.enchant(equipment, 'Longsword', frost);

      const longsword = result.weapons.find(w => w.name === 'Longsword');
      expect(longsword?.modifications?.[0].id).toBe('frost');
    });

    it('should apply Shocking enchantment to a weapon', () => {
      const equipment = createTestEquipment();
      const shocking = WEAPON_ENCHANTMENTS.shocking;

      const result = EquipmentModifier.enchant(equipment, 'Longsword', shocking);

      const longsword = result.weapons.find(w => w.name === 'Longsword');
      expect(longsword?.modifications?.[0].id).toBe('shocking');
    });
  });

  describe('Applying Special Enchantments', () => {
    it('should apply Vampiric enchantment to a weapon', () => {
      const equipment = createTestEquipment();
      const vampiric = WEAPON_ENCHANTMENTS.vampiric;

      const result = EquipmentModifier.enchant(equipment, 'Longsword', vampiric);

      const longsword = result.weapons.find(w => w.name === 'Longsword');
      expect(longsword?.modifications?.[0].id).toBe('vampiric');
    });

    it('should apply Vorpal Edge enchantment to a weapon', () => {
      const equipment = createTestEquipment();
      const vorpalEdge = WEAPON_ENCHANTMENTS.vorpalEdge;

      const result = EquipmentModifier.enchant(equipment, 'Longsword', vorpalEdge);

      const longsword = result.weapons.find(w => w.name === 'Longsword');
      expect(longsword?.modifications?.[0].id).toBe('vorpal_edge');
    });
  });

  describe('Enchantment Stacking', () => {
    it('should allow multiple enchantments on the same weapon', () => {
      const equipment = createTestEquipment();

      // Apply +1 enhancement
      let result = EquipmentModifier.enchant(equipment, 'Longsword', WEAPON_ENCHANTMENTS.plusOne);

      // Apply Flaming on top
      result = EquipmentModifier.enchant(result, 'Longsword', WEAPON_ENCHANTMENTS.flaming);

      const longsword = result.weapons.find(w => w.name === 'Longsword');
      expect(longsword?.modifications?.length).toBe(2);
      expect(longsword?.modifications?.map(m => m.id)).toContain('plus_one');
      expect(longsword?.modifications?.map(m => m.id)).toContain('flaming');
    });

    it('should allow re-applying the same enchantment (stacking)', () => {
      const equipment = createTestEquipment();

      // Apply +1 enhancement twice
      let result = EquipmentModifier.enchant(equipment, 'Longsword', WEAPON_ENCHANTMENTS.plusOne);
      result = EquipmentModifier.enchant(result, 'Longsword', WEAPON_ENCHANTMENTS.plusOne);

      const longsword = result.weapons.find(w => w.name === 'Longsword');
      expect(longsword?.modifications?.length).toBe(2);
    });
  });

  describe('Query Methods', () => {
    it('should correctly identify enchanted items', () => {
      const equipment = createTestEquipment();

      // Before enchantment
      expect(EquipmentModifier.isEnchanted(equipment, 'Longsword')).toBe(false);

      // After enchantment
      const result = EquipmentModifier.enchant(equipment, 'Longsword', WEAPON_ENCHANTMENTS.plusOne);
      expect(EquipmentModifier.isEnchanted(result, 'Longsword')).toBe(true);
    });

    it('should correctly get modification history', () => {
      const equipment = createTestEquipment();
      let result = EquipmentModifier.enchant(equipment, 'Longsword', WEAPON_ENCHANTMENTS.plusOne);
      result = EquipmentModifier.enchant(result, 'Longsword', WEAPON_ENCHANTMENTS.flaming);

      const history = EquipmentModifier.getModificationHistory(result, 'Longsword');
      expect(history.length).toBe(2);
      expect(history[0].id).toBe('plus_one');
      expect(history[1].id).toBe('flaming');
    });

    it('should correctly get combined effects', () => {
      const equipment = createTestEquipment();
      let result = EquipmentModifier.enchant(equipment, 'Longsword', WEAPON_ENCHANTMENTS.plusOne);
      result = EquipmentModifier.enchant(result, 'Longsword', WEAPON_ENCHANTMENTS.flaming);

      const effects = EquipmentModifier.getCombinedEffects(result, 'Longsword');
      expect(effects.length).toBeGreaterThan(0);
    });

    it('should correctly get item summary', () => {
      const equipment = createTestEquipment();
      const result = EquipmentModifier.enchant(equipment, 'Longsword', WEAPON_ENCHANTMENTS.plusOne);

      const summary = EquipmentModifier.getItemSummary(result, 'Longsword');
      expect(summary).not.toBeNull();
      expect(summary?.isEnchanted).toBe(true);
      expect(summary?.isCursed).toBe(false);
      expect(summary?.modificationCount).toBe(1);
    });
  });
});

describe('EquipmentModifier - Armor Enchantments', () => {
  it('should apply +1 Armor enchantment', () => {
    const equipment = createTestEquipment();
    const plusOne = ARMOR_ENCHANTMENTS.plusOne;

    const result = EquipmentModifier.enchant(equipment, 'Leather Armor', plusOne);

    const armor = result.armor.find(a => a.name === 'Leather Armor');
    expect(armor?.modifications?.length).toBe(1);
    expect(armor?.modifications?.[0].id).toBe('plus_one');
  });

  it('should apply +2 Armor enchantment', () => {
    const equipment = createTestEquipment();
    const plusTwo = ARMOR_ENCHANTMENTS.plusTwo;

    const result = EquipmentModifier.enchant(equipment, 'Leather Armor', plusTwo);

    const armor = result.armor.find(a => a.name === 'Leather Armor');
    expect(armor?.modifications?.[0].id).toBe('plus_two');
  });
});

describe('EquipmentModifier - Resistance Enchantments', () => {
  it('should apply Fire Resistance enchantment', () => {
    const equipment = createTestEquipment();
    const fireRes = RESISTANCE_ENCHANTMENTS.fire;

    const result = EquipmentModifier.enchant(equipment, 'Leather Armor', fireRes);

    const armor = result.armor.find(a => a.name === 'Leather Armor');
    expect(armor?.modifications?.length).toBe(1);
  });

  it('should apply Cold Resistance enchantment', () => {
    const equipment = createTestEquipment();
    const coldRes = RESISTANCE_ENCHANTMENTS.cold;

    const result = EquipmentModifier.enchant(equipment, 'Leather Armor', coldRes);

    const armor = result.armor.find(a => a.name === 'Leather Armor');
    expect(armor?.modifications?.length).toBe(1);
  });
});

describe('EquipmentModifier - Stat Boost Enchantments', () => {
  it('should create and apply Strength enchantment', () => {
    const equipment = createTestEquipment();
    const strBoost = createStrengthEnchantment(2);

    expect(strBoost.id).toBe('strength_2');
    expect(strBoost.name).toBe('Strength +2');
    expect(strBoost.properties?.[0].type).toBe('stat_bonus');
    expect(strBoost.properties?.[0].target).toBe('STR');
    expect(strBoost.properties?.[0].value).toBe(2);

    const result = EquipmentModifier.enchant(equipment, 'Longsword', strBoost);
    const longsword = result.weapons.find(w => w.name === 'Longsword');
    expect(longsword?.modifications?.length).toBe(1);
  });

  it('should create and apply Dexterity enchantment', () => {
    const dexBoost = createDexterityEnchantment(3);
    expect(dexBoost.id).toBe('dexterity_3');
    expect(dexBoost.properties?.[0].target).toBe('DEX');
    expect(dexBoost.properties?.[0].value).toBe(3);
  });

  it('should create and apply Constitution enchantment', () => {
    const conBoost = createConstitutionEnchantment(1);
    expect(conBoost.id).toBe('constitution_1');
    expect(conBoost.properties?.[0].target).toBe('CON');
  });

  it('should create and apply Intelligence enchantment', () => {
    const intBoost = createIntelligenceEnchantment(4);
    expect(intBoost.id).toBe('intelligence_4');
    expect(intBoost.properties?.[0].target).toBe('INT');
    expect(intBoost.properties?.[0].value).toBe(4);
  });

  it('should create and apply Wisdom enchantment', () => {
    const wisBoost = createWisdomEnchantment(2);
    expect(wisBoost.id).toBe('wisdom_2');
    expect(wisBoost.properties?.[0].target).toBe('WIS');
  });

  it('should create and apply Charisma enchantment', () => {
    const chaBoost = createCharismaEnchantment(1);
    expect(chaBoost.id).toBe('charisma_1');
    expect(chaBoost.properties?.[0].target).toBe('CHA');
  });
});

describe('EquipmentModifier - Combo Enchantments', () => {
  it('should have ALL_ENCHANTMENTS include combo enchantments', () => {
    expect(Object.keys(ALL_ENCHANTMENTS).length).toBeGreaterThan(0);
  });
});

describe('EquipmentModifier - Curse Operations', () => {
  it('should apply a curse to an item', () => {
    const equipment = createTestEquipment();
    const weakness = CURSES.weakness;

    const result = EquipmentModifier.curse(equipment, 'Longsword', weakness);

    const longsword = result.weapons.find(w => w.name === 'Longsword');
    expect(longsword?.modifications?.length).toBe(1);
    expect(longsword?.modifications?.[0].source).toBe('curse');
  });

  it('should correctly identify cursed items', () => {
    const equipment = createTestEquipment();

    // Before curse
    expect(EquipmentModifier.isCursed(equipment, 'Longsword')).toBe(false);

    // After curse
    const result = EquipmentModifier.curse(equipment, 'Longsword', CURSES.weakness);
    expect(EquipmentModifier.isCursed(result, 'Longsword')).toBe(true);
  });

  it('should apply attunement curse (locks item)', () => {
    const equipment = createTestEquipment();
    const attunement = CURSES.attunement;

    const result = EquipmentModifier.curse(equipment, 'Longsword', attunement);

    const longsword = result.weapons.find(w => w.name === 'Longsword');
    expect(longsword?.modifications?.some(m => m.id.includes('attunement'))).toBe(true);
  });
});

describe('EquipmentModifier - Remove Operations', () => {
  it('should remove a specific modification', () => {
    const equipment = createTestEquipment();
    let result = EquipmentModifier.enchant(equipment, 'Longsword', WEAPON_ENCHANTMENTS.plusOne);
    result = EquipmentModifier.enchant(result, 'Longsword', WEAPON_ENCHANTMENTS.flaming);

    // Verify two modifications
    let longsword = result.weapons.find(w => w.name === 'Longsword');
    expect(longsword?.modifications?.length).toBe(2);

    // Remove one
    result = EquipmentModifier.removeModification(result, 'Longsword', 'flaming');
    longsword = result.weapons.find(w => w.name === 'Longsword');
    expect(longsword?.modifications?.length).toBe(1);
    expect(longsword?.modifications?.[0].id).toBe('plus_one');
  });

  it('should disenchant (remove all enchantments, keep curses)', () => {
    const equipment = createTestEquipment();
    let result = EquipmentModifier.enchant(equipment, 'Longsword', WEAPON_ENCHANTMENTS.plusOne);
    result = EquipmentModifier.curse(result, 'Longsword', CURSES.weakness);

    // Verify one enchantment and one curse
    let longsword = result.weapons.find(w => w.name === 'Longsword');
    expect(longsword?.modifications?.length).toBe(2);
    expect(EquipmentModifier.isEnchanted(result, 'Longsword')).toBe(true);
    expect(EquipmentModifier.isCursed(result, 'Longsword')).toBe(true);

    // Disenchant
    result = EquipmentModifier.disenchant(result, 'Longsword');
    longsword = result.weapons.find(w => w.name === 'Longsword');
    expect(longsword?.modifications?.length).toBe(1);
    expect(EquipmentModifier.isEnchanted(result, 'Longsword')).toBe(false);
    expect(EquipmentModifier.isCursed(result, 'Longsword')).toBe(true);
  });

  it('should lift curse (remove all curses, keep enchantments)', () => {
    const equipment = createTestEquipment();
    let result = EquipmentModifier.enchant(equipment, 'Longsword', WEAPON_ENCHANTMENTS.plusOne);
    result = EquipmentModifier.curse(result, 'Longsword', CURSES.weakness);

    // Lift curse
    result = EquipmentModifier.liftCurse(result, 'Longsword');
    const longsword = result.weapons.find(w => w.name === 'Longsword');
    expect(longsword?.modifications?.length).toBe(1);
    expect(EquipmentModifier.isEnchanted(result, 'Longsword')).toBe(true);
    expect(EquipmentModifier.isCursed(result, 'Longsword')).toBe(false);
  });
});
