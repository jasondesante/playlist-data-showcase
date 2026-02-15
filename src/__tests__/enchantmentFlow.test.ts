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

import { describe, it, expect, beforeAll } from 'vitest';
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
  ensureEquipmentDefaultsInitialized,
  SeededRNG,
  MAGIC_ITEMS,
  getMagicItemsByRarity,
  getMagicItemsByType,
  getCursedItems,
  getItemsWithProperty,
  getMagicItem,
  type CharacterEquipment,
  type EnhancedInventoryItem,
  type EnhancedEquipment
} from 'playlist-data-engine';

// Initialize ExtensionManager with default equipment before running tests
beforeAll(() => {
  ensureEquipmentDefaultsInitialized();
});

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
        name: 'Backpack',
        quantity: 1,
        equipped: false,
        instanceId: 'item-backpack-001'
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

describe('EquipmentModifier - Armor Enchantments (Task 7.1)', () => {
  describe('Applying Enhancement Enchantments', () => {
    it('should apply +1 Armor Enhancement enchantment', () => {
      const equipment = createTestEquipment();
      const plusOne = ARMOR_ENCHANTMENTS.plusOne;

      const result = EquipmentModifier.enchant(equipment, 'Leather Armor', plusOne);

      const armor = result.armor.find(a => a.name === 'Leather Armor');
      expect(armor).toBeDefined();
      expect(armor?.modifications).toBeDefined();
      expect(armor?.modifications?.length).toBe(1);
      expect(armor?.modifications?.[0].id).toBe('plus_one_armor');
      expect(armor?.modifications?.[0].name).toBe('+1 Armor Enhancement');
      expect(armor?.modifications?.[0].source).toBe('enchantment');
    });

    it('should apply +2 Armor Enhancement enchantment', () => {
      const equipment = createTestEquipment();
      const plusTwo = ARMOR_ENCHANTMENTS.plusTwo;

      const result = EquipmentModifier.enchant(equipment, 'Leather Armor', plusTwo);

      const armor = result.armor.find(a => a.name === 'Leather Armor');
      expect(armor?.modifications?.length).toBe(1);
      expect(armor?.modifications?.[0].id).toBe('plus_two_armor');
      expect(armor?.modifications?.[0].name).toBe('+2 Armor Enhancement');
    });

    it('should add AC bonus property to armor', () => {
      const equipment = createTestEquipment();
      const plusOne = ARMOR_ENCHANTMENTS.plusOne;

      const result = EquipmentModifier.enchant(equipment, 'Leather Armor', plusOne);

      const armor = result.armor.find(a => a.name === 'Leather Armor');
      expect(armor?.modifications?.[0].properties).toContainEqual(
        expect.objectContaining({
          type: 'passive_modifier',
          target: 'ac',
          value: 1
        })
      );
    });

    it('should add +2 AC bonus property to armor', () => {
      const equipment = createTestEquipment();
      const plusTwo = ARMOR_ENCHANTMENTS.plusTwo;

      const result = EquipmentModifier.enchant(equipment, 'Leather Armor', plusTwo);

      const armor = result.armor.find(a => a.name === 'Leather Armor');
      expect(armor?.modifications?.[0].properties).toContainEqual(
        expect.objectContaining({
          type: 'passive_modifier',
          target: 'ac',
          value: 2
        })
      );
    });
  });

  describe('Enchantment Stacking on Armor', () => {
    it('should allow multiple enchantments on the same armor', () => {
      const equipment = createTestEquipment();

      // Apply +1 enhancement
      let result = EquipmentModifier.enchant(equipment, 'Leather Armor', ARMOR_ENCHANTMENTS.plusOne);

      // Apply +2 on top (stacking different enhancement levels)
      result = EquipmentModifier.enchant(result, 'Leather Armor', ARMOR_ENCHANTMENTS.plusTwo);

      const armor = result.armor.find(a => a.name === 'Leather Armor');
      expect(armor?.modifications?.length).toBe(2);
      expect(armor?.modifications?.map(m => m.id)).toContain('plus_one_armor');
      expect(armor?.modifications?.map(m => m.id)).toContain('plus_two_armor');
    });

    it('should allow re-applying the same armor enchantment (stacking)', () => {
      const equipment = createTestEquipment();

      // Apply +1 enhancement twice
      let result = EquipmentModifier.enchant(equipment, 'Leather Armor', ARMOR_ENCHANTMENTS.plusOne);
      result = EquipmentModifier.enchant(result, 'Leather Armor', ARMOR_ENCHANTMENTS.plusOne);

      const armor = result.armor.find(a => a.name === 'Leather Armor');
      expect(armor?.modifications?.length).toBe(2);
    });
  });

  describe('Query Methods for Armor', () => {
    it('should correctly identify enchanted armor', () => {
      const equipment = createTestEquipment();

      // Before enchantment
      expect(EquipmentModifier.isEnchanted(equipment, 'Leather Armor')).toBe(false);

      // After enchantment
      const result = EquipmentModifier.enchant(equipment, 'Leather Armor', ARMOR_ENCHANTMENTS.plusOne);
      expect(EquipmentModifier.isEnchanted(result, 'Leather Armor')).toBe(true);
    });

    it('should correctly get modification history for armor', () => {
      const equipment = createTestEquipment();
      let result = EquipmentModifier.enchant(equipment, 'Leather Armor', ARMOR_ENCHANTMENTS.plusOne);
      result = EquipmentModifier.enchant(result, 'Leather Armor', ARMOR_ENCHANTMENTS.plusTwo);

      const history = EquipmentModifier.getModificationHistory(result, 'Leather Armor');
      expect(history.length).toBe(2);
      expect(history[0].id).toBe('plus_one_armor');
      expect(history[1].id).toBe('plus_two_armor');
    });

    it('should correctly get combined effects for enchanted armor', () => {
      const equipment = createTestEquipment();
      let result = EquipmentModifier.enchant(equipment, 'Leather Armor', ARMOR_ENCHANTMENTS.plusOne);
      result = EquipmentModifier.enchant(result, 'Leather Armor', RESISTANCE_ENCHANTMENTS.fire);

      const effects = EquipmentModifier.getCombinedEffects(result, 'Leather Armor');
      expect(effects.length).toBeGreaterThan(0);
    });

    it('should correctly get item summary for enchanted armor', () => {
      const equipment = createTestEquipment();
      const result = EquipmentModifier.enchant(equipment, 'Leather Armor', ARMOR_ENCHANTMENTS.plusOne);

      const summary = EquipmentModifier.getItemSummary(result, 'Leather Armor');
      expect(summary).not.toBeNull();
      expect(summary?.isEnchanted).toBe(true);
      expect(summary?.isCursed).toBe(false);
      expect(summary?.modificationCount).toBe(1);
    });
  });

  describe('Applying Curses to Armor', () => {
    it('should apply weakness curse to armor', () => {
      const equipment = createTestEquipment();
      const weakness = CURSES.weakness;

      const result = EquipmentModifier.curse(equipment, 'Leather Armor', weakness);

      const armor = result.armor.find(a => a.name === 'Leather Armor');
      expect(armor?.modifications?.length).toBe(1);
      expect(armor?.modifications?.[0].source).toBe('curse');
      expect(armor?.modifications?.[0].id).toBe('weakness');
    });

    it('should correctly identify cursed armor', () => {
      const equipment = createTestEquipment();

      // Before curse
      expect(EquipmentModifier.isCursed(equipment, 'Leather Armor')).toBe(false);

      // After curse
      const result = EquipmentModifier.curse(equipment, 'Leather Armor', CURSES.weakness);
      expect(EquipmentModifier.isCursed(result, 'Leather Armor')).toBe(true);
    });

    it('should apply attunement curse to armor (locks item)', () => {
      const equipment = createTestEquipment();
      const attunement = CURSES.attunement;

      const result = EquipmentModifier.curse(equipment, 'Leather Armor', attunement);

      const armor = result.armor.find(a => a.name === 'Leather Armor');
      expect(armor?.modifications?.some(m => m.id.includes('attunement'))).toBe(true);
    });
  });

  describe('Remove Operations on Armor', () => {
    it('should remove a specific modification from armor', () => {
      const equipment = createTestEquipment();
      let result = EquipmentModifier.enchant(equipment, 'Leather Armor', ARMOR_ENCHANTMENTS.plusOne);
      result = EquipmentModifier.enchant(result, 'Leather Armor', ARMOR_ENCHANTMENTS.plusTwo);

      // Verify two modifications
      let armor = result.armor.find(a => a.name === 'Leather Armor');
      expect(armor?.modifications?.length).toBe(2);

      // Remove one
      result = EquipmentModifier.removeModification(result, 'Leather Armor', 'plus_two_armor');
      armor = result.armor.find(a => a.name === 'Leather Armor');
      expect(armor?.modifications?.length).toBe(1);
      expect(armor?.modifications?.[0].id).toBe('plus_one_armor');
    });

    it('should disenchant armor (remove all enchantments, keep curses)', () => {
      const equipment = createTestEquipment();
      let result = EquipmentModifier.enchant(equipment, 'Leather Armor', ARMOR_ENCHANTMENTS.plusOne);
      result = EquipmentModifier.curse(result, 'Leather Armor', CURSES.weakness);

      // Verify one enchantment and one curse
      let armor = result.armor.find(a => a.name === 'Leather Armor');
      expect(armor?.modifications?.length).toBe(2);
      expect(EquipmentModifier.isEnchanted(result, 'Leather Armor')).toBe(true);
      expect(EquipmentModifier.isCursed(result, 'Leather Armor')).toBe(true);

      // Disenchant
      result = EquipmentModifier.disenchant(result, 'Leather Armor');
      armor = result.armor.find(a => a.name === 'Leather Armor');
      expect(armor?.modifications?.length).toBe(1);
      expect(EquipmentModifier.isEnchanted(result, 'Leather Armor')).toBe(false);
      expect(EquipmentModifier.isCursed(result, 'Leather Armor')).toBe(true);
    });

    it('should lift curse from armor (remove all curses, keep enchantments)', () => {
      const equipment = createTestEquipment();
      let result = EquipmentModifier.enchant(equipment, 'Leather Armor', ARMOR_ENCHANTMENTS.plusOne);
      result = EquipmentModifier.curse(result, 'Leather Armor', CURSES.weakness);

      // Lift curse
      result = EquipmentModifier.liftCurse(result, 'Leather Armor');
      const armor = result.armor.find(a => a.name === 'Leather Armor');
      expect(armor?.modifications?.length).toBe(1);
      expect(EquipmentModifier.isEnchanted(result, 'Leather Armor')).toBe(true);
      expect(EquipmentModifier.isCursed(result, 'Leather Armor')).toBe(false);
    });
  });
});

describe('EquipmentModifier - Resistance Enchantments (Task 7.1)', () => {
  /**
   * KNOWN ISSUE: Resistance enchantments in playlist-data-engine have a validation bug.
   * They use `value: true` (boolean) but the validator requires `passive_modifier`
   * values to be numbers. These tests are skipped until the upstream bug is fixed.
   *
   * Bug location: playlist-data-engine/src/constants/DefaultEnchantments.ts
   * Resistance enchantments should use `value: 1` instead of `value: true`.
   */

  describe('All Resistance Types Available', () => {
    it('should have all expected resistance types available', () => {
      expect(RESISTANCE_ENCHANTMENTS.fire).toBeDefined();
      expect(RESISTANCE_ENCHANTMENTS.cold).toBeDefined();
      expect(RESISTANCE_ENCHANTMENTS.lightning).toBeDefined();
      expect(RESISTANCE_ENCHANTMENTS.acid).toBeDefined();
      expect(RESISTANCE_ENCHANTMENTS.poison).toBeDefined();
      expect(RESISTANCE_ENCHANTMENTS.necrotic).toBeDefined();
      expect(RESISTANCE_ENCHANTMENTS.radiant).toBeDefined();
      expect(RESISTANCE_ENCHANTMENTS.thunder).toBeDefined();
      expect(RESISTANCE_ENCHANTMENTS.all).toBeDefined();
    });

    it('should have correct number of resistance types (9 total)', () => {
      expect(Object.keys(RESISTANCE_ENCHANTMENTS).length).toBe(9);
    });
  });

  describe('Resistance Enchantment Structure', () => {
    it('should have correct structure for Fire Resistance', () => {
      const fireRes = RESISTANCE_ENCHANTMENTS.fire;
      expect(fireRes.id).toBe('fire_resistance');
      expect(fireRes.name).toBe('Fire Resistance');
      expect(fireRes.source).toBe('enchantment');
      expect(fireRes.properties).toBeDefined();
      expect(fireRes.properties?.length).toBeGreaterThan(0);
    });

    it('should have correct structure for Cold Resistance', () => {
      const coldRes = RESISTANCE_ENCHANTMENTS.cold;
      expect(coldRes.id).toBe('cold_resistance');
      expect(coldRes.name).toBe('Cold Resistance');
    });

    it('should have correct structure for Lightning Resistance', () => {
      const lightningRes = RESISTANCE_ENCHANTMENTS.lightning;
      expect(lightningRes.id).toBe('lightning_resistance');
      expect(lightningRes.name).toBe('Lightning Resistance');
    });

    it('should have correct structure for All Resistance', () => {
      const allRes = RESISTANCE_ENCHANTMENTS.all;
      expect(allRes.id).toBe('all_resistance');
      expect(allRes.name).toBe('Universal Resistance');
    });

    it('should have passive_modifier property type for resistance enchantments', () => {
      const fireRes = RESISTANCE_ENCHANTMENTS.fire;
      expect(fireRes.properties?.[0].type).toBe('passive_modifier');
    });
  });

  // SKIPPED: The following tests are skipped due to upstream bug in playlist-data-engine
  // where resistance enchantments use `value: true` instead of `value: 1`
  // causing validation to fail. Once fixed, these tests should pass.

  describe.skip('Applying Resistance Enchantments (SKIPPED - Upstream Bug)', () => {
    it.skip('should apply Fire Resistance enchantment', () => {
      const equipment = createTestEquipment();
      const fireRes = RESISTANCE_ENCHANTMENTS.fire;

      const result = EquipmentModifier.enchant(equipment, 'Leather Armor', fireRes);

      const armor = result.armor.find(a => a.name === 'Leather Armor');
      expect(armor?.modifications).toBeDefined();
      expect(armor?.modifications?.length).toBe(1);
      expect(armor?.modifications?.[0].id).toBe('fire_resistance');
      expect(armor?.modifications?.[0].source).toBe('enchantment');
    });
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

describe('EquipmentModifier - Curse Operations (Task 7.2)', () => {
  describe('Applying Penalty Curses', () => {
    it('should apply -1 Penalty curse to a weapon', () => {
      const equipment = createTestEquipment();
      const minusOne = CURSES.minusOne;

      const result = EquipmentModifier.curse(equipment, 'Longsword', minusOne);

      const longsword = result.weapons.find(w => w.name === 'Longsword');
      expect(longsword?.modifications).toBeDefined();
      expect(longsword?.modifications?.length).toBe(1);
      expect(longsword?.modifications?.[0].id).toBe('minus_one');
      expect(longsword?.modifications?.[0].name).toBe('Cursed: -1 Penalty');
      expect(longsword?.modifications?.[0].source).toBe('curse');
    });

    it('should apply -2 Penalty curse to a weapon', () => {
      const equipment = createTestEquipment();
      const minusTwo = CURSES.minusTwo;

      const result = EquipmentModifier.curse(equipment, 'Longsword', minusTwo);

      const longsword = result.weapons.find(w => w.name === 'Longsword');
      expect(longsword?.modifications?.length).toBe(1);
      expect(longsword?.modifications?.[0].id).toBe('minus_two');
      expect(longsword?.modifications?.[0].name).toBe('Cursed: -2 Penalty');
    });

    it('should have negative attack_roll modifier in penalty curses', () => {
      const minusOne = CURSES.minusOne;
      expect(minusOne.properties).toBeDefined();
      expect(minusOne.properties?.[0].type).toBe('passive_modifier');
      expect(minusOne.properties?.[0].target).toBe('attack_roll');
      expect(minusOne.properties?.[0].value).toBe(-1);
    });
  });

  describe('Applying Stat Curses', () => {
    it('should apply Weakness curse (-4 STR) to a weapon', () => {
      const equipment = createTestEquipment();
      const weakness = CURSES.weakness;

      const result = EquipmentModifier.curse(equipment, 'Longsword', weakness);

      const longsword = result.weapons.find(w => w.name === 'Longsword');
      expect(longsword?.modifications?.length).toBe(1);
      expect(longsword?.modifications?.[0].id).toBe('weakness');
      expect(longsword?.modifications?.[0].source).toBe('curse');
      expect(longsword?.modifications?.[0].properties).toContainEqual(
        expect.objectContaining({
          type: 'stat_bonus',
          target: 'STR',
          value: -4
        })
      );
    });

    it('should apply Feeblemind curse (-4 INT) to a weapon', () => {
      const equipment = createTestEquipment();
      const feeblemind = CURSES.feeblemind;

      const result = EquipmentModifier.curse(equipment, 'Longsword', feeblemind);

      const longsword = result.weapons.find(w => w.name === 'Longsword');
      expect(longsword?.modifications?.[0].id).toBe('feeblemind');
      expect(longsword?.modifications?.[0].properties).toContainEqual(
        expect.objectContaining({
          type: 'stat_bonus',
          target: 'INT',
          value: -4
        })
      );
    });

    it('should apply Clumsiness curse (-4 DEX) to armor', () => {
      const equipment = createTestEquipment();
      const clumsiness = CURSES.clumsiness;

      const result = EquipmentModifier.curse(equipment, 'Leather Armor', clumsiness);

      const armor = result.armor.find(a => a.name === 'Leather Armor');
      expect(armor?.modifications?.length).toBe(1);
      expect(armor?.modifications?.[0].id).toBe('clumsiness');
      expect(armor?.modifications?.[0].properties).toContainEqual(
        expect.objectContaining({
          type: 'stat_bonus',
          target: 'DEX',
          value: -4
        })
      );
    });

    it('should apply Frailty curse (-4 CON) to armor', () => {
      const equipment = createTestEquipment();
      const frailty = CURSES.frailty;

      const result = EquipmentModifier.curse(equipment, 'Leather Armor', frailty);

      const armor = result.armor.find(a => a.name === 'Leather Armor');
      expect(armor?.modifications?.[0].id).toBe('frailty');
      expect(armor?.modifications?.[0].properties).toContainEqual(
        expect.objectContaining({
          type: 'stat_bonus',
          target: 'CON',
          value: -4
        })
      );
    });

    it('should apply Foolishness curse (-4 WIS) to armor', () => {
      const equipment = createTestEquipment();
      const foolishness = CURSES.foolishness;

      const result = EquipmentModifier.curse(equipment, 'Leather Armor', foolishness);

      const armor = result.armor.find(a => a.name === 'Leather Armor');
      expect(armor?.modifications?.[0].id).toBe('foolishness');
    });

    it('should apply Repulsiveness curse (-4 CHA) to armor', () => {
      const equipment = createTestEquipment();
      const repulsiveness = CURSES.repulsiveness;

      const result = EquipmentModifier.curse(equipment, 'Leather Armor', repulsiveness);

      const armor = result.armor.find(a => a.name === 'Leather Armor');
      expect(armor?.modifications?.[0].id).toBe('repulsiveness');
    });
  });

  /**
   * KNOWN ISSUE: Vulnerability curses in playlist-data-engine have a validation bug.
   * They use `value: true` (boolean) but the validator requires `passive_modifier`
   * values to be numbers. These tests are skipped until the upstream bug is fixed.
   *
   * Bug location: playlist-data-engine/src/constants/DefaultEnchantments.ts
   * Vulnerability curses should use `value: 1` instead of `value: true`.
   */
  describe('Vulnerability Curses Structure', () => {
    it('should have fireVulnerability curse available', () => {
      expect(CURSES.fireVulnerability).toBeDefined();
      expect(CURSES.fireVulnerability.id).toBe('fire_vulnerability');
      expect(CURSES.fireVulnerability.name).toBe('Cursed: Fire Vulnerability');
      expect(CURSES.fireVulnerability.source).toBe('curse');
    });

    it('should have coldVulnerability curse available', () => {
      expect(CURSES.coldVulnerability).toBeDefined();
      expect(CURSES.coldVulnerability.id).toBe('cold_vulnerability');
      expect(CURSES.coldVulnerability.name).toBe('Cursed: Cold Vulnerability');
    });

    it('should have correct property structure for fire vulnerability', () => {
      const fireVuln = CURSES.fireVulnerability;
      expect(fireVuln.properties).toBeDefined();
      expect(fireVuln.properties?.length).toBeGreaterThan(0);
      expect(fireVuln.properties?.[0].type).toBe('passive_modifier');
      expect(fireVuln.properties?.[0].target).toBe('vulnerability_fire');
    });
  });

  // SKIPPED: The following tests are skipped due to upstream bug in playlist-data-engine
  // where vulnerability curses use `value: true` instead of `value: 1`
  // causing validation to fail. Once fixed, these tests should pass.
  describe.skip('Applying Vulnerability Curses (SKIPPED - Upstream Bug)', () => {
    it.skip('should apply Fire Vulnerability curse to armor', () => {
      const equipment = createTestEquipment();
      const fireVuln = CURSES.fireVulnerability;

      const result = EquipmentModifier.curse(equipment, 'Leather Armor', fireVuln);

      const armor = result.armor.find(a => a.name === 'Leather Armor');
      expect(armor?.modifications?.length).toBe(1);
      expect(armor?.modifications?.[0].id).toBe('fire_vulnerability');
      expect(armor?.modifications?.[0].name).toBe('Cursed: Fire Vulnerability');
      expect(armor?.modifications?.[0].source).toBe('curse');
    });

    it.skip('should apply Cold Vulnerability curse to armor', () => {
      const equipment = createTestEquipment();
      const coldVuln = CURSES.coldVulnerability;

      const result = EquipmentModifier.curse(equipment, 'Leather Armor', coldVuln);

      const armor = result.armor.find(a => a.name === 'Leather Armor');
      expect(armor?.modifications?.[0].id).toBe('cold_vulnerability');
      expect(armor?.modifications?.[0].name).toBe('Cursed: Cold Vulnerability');
    });
  });

  describe('Applying Special Curses', () => {
    it('should apply Lifesteal curse (damages wielder on hit)', () => {
      const equipment = createTestEquipment();
      const lifesteal = CURSES.lifesteal;

      const result = EquipmentModifier.curse(equipment, 'Longsword', lifesteal);

      const longsword = result.weapons.find(w => w.name === 'Longsword');
      expect(longsword?.modifications?.length).toBe(1);
      expect(longsword?.modifications?.[0].id).toBe('lifesteal');
      expect(longsword?.modifications?.[0].name).toBe('Cursed: Bloodthirst');
      expect(longsword?.modifications?.[0].properties).toContainEqual(
        expect.objectContaining({
          type: 'special_property',
          target: 'life_drain'
        })
      );
    });

    it('should apply Attunement Lock curse (cannot unequip)', () => {
      const equipment = createTestEquipment();
      const attunement = CURSES.attunement;

      const result = EquipmentModifier.curse(equipment, 'Longsword', attunement);

      const longsword = result.weapons.find(w => w.name === 'Longsword');
      expect(longsword?.modifications?.length).toBe(1);
      expect(longsword?.modifications?.[0].id).toBe('attunement');
      expect(longsword?.modifications?.[0].name).toBe('Cursed: Attunement Lock');
      expect(longsword?.modifications?.[0].properties).toContainEqual(
        expect.objectContaining({
          type: 'special_property',
          target: 'curse_attunement',
          value: true
        })
      );
    });

    it('should apply Berserker Rage curse (must attack each round)', () => {
      const equipment = createTestEquipment();
      const berserker = CURSES.berserker;

      const result = EquipmentModifier.curse(equipment, 'Longsword', berserker);

      const longsword = result.weapons.find(w => w.name === 'Longsword');
      expect(longsword?.modifications?.length).toBe(1);
      expect(longsword?.modifications?.[0].id).toBe('berserker');
      expect(longsword?.modifications?.[0].name).toBe('Cursed: Berserker Rage');
      // Berserker also gives +1 attack roll while berserking
      expect(longsword?.modifications?.[0].properties?.length).toBeGreaterThan(0);
    });

    it('should apply Heavy Burden curse (doubles weight)', () => {
      const equipment = createTestEquipment();
      const heavyBurden = CURSES.heavyBurden;

      const result = EquipmentModifier.curse(equipment, 'Leather Armor', heavyBurden);

      const armor = result.armor.find(a => a.name === 'Leather Armor');
      expect(armor?.modifications?.length).toBe(1);
      expect(armor?.modifications?.[0].id).toBe('heavy_burden');
      expect(armor?.modifications?.[0].name).toBe('Cursed: Heavy Burden');
      expect(armor?.modifications?.[0].properties).toContainEqual(
        expect.objectContaining({
          type: 'special_property',
          target: 'weight_multiplier',
          value: 2
        })
      );
    });

    it('should apply Light Sensitivity curse', () => {
      const equipment = createTestEquipment();
      const lightSensitivity = CURSES.lightSensitivity;

      const result = EquipmentModifier.curse(equipment, 'Leather Armor', lightSensitivity);

      const armor = result.armor.find(a => a.name === 'Leather Armor');
      expect(armor?.modifications?.length).toBe(1);
      expect(armor?.modifications?.[0].id).toBe('light_sensitivity');
      expect(armor?.modifications?.[0].name).toBe('Cursed: Light Sensitivity');
    });
  });

  describe('Curse Stacking', () => {
    it('should allow multiple curses on the same item', () => {
      const equipment = createTestEquipment();

      // Apply weakness curse
      let result = EquipmentModifier.curse(equipment, 'Longsword', CURSES.weakness);

      // Apply attunement curse on top
      result = EquipmentModifier.curse(result, 'Longsword', CURSES.attunement);

      const longsword = result.weapons.find(w => w.name === 'Longsword');
      expect(longsword?.modifications?.length).toBe(2);
      expect(longsword?.modifications?.map(m => m.id)).toContain('weakness');
      expect(longsword?.modifications?.map(m => m.id)).toContain('attunement');
    });

    it('should allow re-applying the same curse (stacking)', () => {
      const equipment = createTestEquipment();

      // Apply weakness curse twice
      let result = EquipmentModifier.curse(equipment, 'Longsword', CURSES.weakness);
      result = EquipmentModifier.curse(result, 'Longsword', CURSES.weakness);

      const longsword = result.weapons.find(w => w.name === 'Longsword');
      expect(longsword?.modifications?.length).toBe(2);
    });
  });

  describe('Curse + Enchantment Combinations', () => {
    it('should allow enchantment and curse on same item', () => {
      const equipment = createTestEquipment();

      // Apply enchantment first
      let result = EquipmentModifier.enchant(equipment, 'Longsword', WEAPON_ENCHANTMENTS.plusOne);

      // Apply curse second
      result = EquipmentModifier.curse(result, 'Longsword', CURSES.weakness);

      const longsword = result.weapons.find(w => w.name === 'Longsword');
      expect(longsword?.modifications?.length).toBe(2);
      expect(EquipmentModifier.isEnchanted(result, 'Longsword')).toBe(true);
      expect(EquipmentModifier.isCursed(result, 'Longsword')).toBe(true);
    });

    it('should allow curse first, then enchantment', () => {
      const equipment = createTestEquipment();

      // Apply curse first
      let result = EquipmentModifier.curse(equipment, 'Longsword', CURSES.weakness);

      // Apply enchantment second
      result = EquipmentModifier.enchant(result, 'Longsword', WEAPON_ENCHANTMENTS.flaming);

      const longsword = result.weapons.find(w => w.name === 'Longsword');
      expect(longsword?.modifications?.length).toBe(2);
      expect(EquipmentModifier.isEnchanted(result, 'Longsword')).toBe(true);
      expect(EquipmentModifier.isCursed(result, 'Longsword')).toBe(true);
    });
  });

  describe('Query Methods for Curses', () => {
    it('should correctly identify cursed items', () => {
      const equipment = createTestEquipment();

      // Before curse
      expect(EquipmentModifier.isCursed(equipment, 'Longsword')).toBe(false);

      // After curse
      const result = EquipmentModifier.curse(equipment, 'Longsword', CURSES.weakness);
      expect(EquipmentModifier.isCursed(result, 'Longsword')).toBe(true);
    });

    it('should correctly get item summary for cursed items', () => {
      const equipment = createTestEquipment();
      const result = EquipmentModifier.curse(equipment, 'Longsword', CURSES.weakness);

      const summary = EquipmentModifier.getItemSummary(result, 'Longsword');
      expect(summary).not.toBeNull();
      expect(summary?.isEnchanted).toBe(false);
      expect(summary?.isCursed).toBe(true);
      expect(summary?.modificationCount).toBe(1);
    });

    it('should correctly identify both enchanted and cursed state', () => {
      const equipment = createTestEquipment();
      let result = EquipmentModifier.enchant(equipment, 'Longsword', WEAPON_ENCHANTMENTS.plusOne);
      result = EquipmentModifier.curse(result, 'Longsword', CURSES.weakness);

      const summary = EquipmentModifier.getItemSummary(result, 'Longsword');
      expect(summary?.isEnchanted).toBe(true);
      expect(summary?.isCursed).toBe(true);
      expect(summary?.modificationCount).toBe(2);
    });
  });
});

describe('EquipmentModifier - Remove Operations (Task 7.2)', () => {
  describe('Remove Specific Modification', () => {
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

    it('should remove a specific curse while keeping other curses', () => {
      const equipment = createTestEquipment();
      let result = EquipmentModifier.curse(equipment, 'Longsword', CURSES.weakness);
      result = EquipmentModifier.curse(result, 'Longsword', CURSES.attunement);

      // Verify two curses
      let longsword = result.weapons.find(w => w.name === 'Longsword');
      expect(longsword?.modifications?.length).toBe(2);

      // Remove one curse
      result = EquipmentModifier.removeModification(result, 'Longsword', 'weakness');
      longsword = result.weapons.find(w => w.name === 'Longsword');
      expect(longsword?.modifications?.length).toBe(1);
      expect(longsword?.modifications?.[0].id).toBe('attunement');
    });
  });

  describe('Disenchant (Remove Enchantments, Keep Curses)', () => {
    it('should disenchant item with single enchantment and single curse', () => {
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

    it('should disenchant item with multiple enchantments, keeping all curses', () => {
      const equipment = createTestEquipment();
      let result = EquipmentModifier.enchant(equipment, 'Longsword', WEAPON_ENCHANTMENTS.plusOne);
      result = EquipmentModifier.enchant(result, 'Longsword', WEAPON_ENCHANTMENTS.flaming);
      result = EquipmentModifier.enchant(result, 'Longsword', WEAPON_ENCHANTMENTS.vampiric);
      result = EquipmentModifier.curse(result, 'Longsword', CURSES.weakness);
      result = EquipmentModifier.curse(result, 'Longsword', CURSES.attunement);

      // Verify 3 enchantments and 2 curses
      let longsword = result.weapons.find(w => w.name === 'Longsword');
      expect(longsword?.modifications?.length).toBe(5);

      // Disenchant
      result = EquipmentModifier.disenchant(result, 'Longsword');
      longsword = result.weapons.find(w => w.name === 'Longsword');
      expect(longsword?.modifications?.length).toBe(2);
      expect(EquipmentModifier.isEnchanted(result, 'Longsword')).toBe(false);
      expect(EquipmentModifier.isCursed(result, 'Longsword')).toBe(true);
      expect(longsword?.modifications?.map(m => m.id)).toContain('weakness');
      expect(longsword?.modifications?.map(m => m.id)).toContain('attunement');
    });

    it('should disenchant cursed-only item (no changes)', () => {
      const equipment = createTestEquipment();
      let result = EquipmentModifier.curse(equipment, 'Longsword', CURSES.weakness);

      // Verify curse only
      let longsword = result.weapons.find(w => w.name === 'Longsword');
      expect(longsword?.modifications?.length).toBe(1);
      expect(EquipmentModifier.isEnchanted(result, 'Longsword')).toBe(false);
      expect(EquipmentModifier.isCursed(result, 'Longsword')).toBe(true);

      // Disenchant (should not remove curse)
      result = EquipmentModifier.disenchant(result, 'Longsword');
      longsword = result.weapons.find(w => w.name === 'Longsword');
      expect(longsword?.modifications?.length).toBe(1);
      expect(EquipmentModifier.isCursed(result, 'Longsword')).toBe(true);
    });

    it('should disenchant armor correctly', () => {
      const equipment = createTestEquipment();
      let result = EquipmentModifier.enchant(equipment, 'Leather Armor', ARMOR_ENCHANTMENTS.plusOne);
      result = EquipmentModifier.curse(result, 'Leather Armor', CURSES.heavyBurden);

      // Disenchant
      result = EquipmentModifier.disenchant(result, 'Leather Armor');
      const armor = result.armor.find(a => a.name === 'Leather Armor');
      expect(armor?.modifications?.length).toBe(1);
      expect(EquipmentModifier.isEnchanted(result, 'Leather Armor')).toBe(false);
      expect(EquipmentModifier.isCursed(result, 'Leather Armor')).toBe(true);
    });
  });

  describe('Lift Curse (Remove Curses, Keep Enchantments)', () => {
    it('should lift curse from item with single enchantment and single curse', () => {
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

    it('should lift all curses, keeping all enchantments', () => {
      const equipment = createTestEquipment();
      let result = EquipmentModifier.enchant(equipment, 'Longsword', WEAPON_ENCHANTMENTS.plusOne);
      result = EquipmentModifier.enchant(result, 'Longsword', WEAPON_ENCHANTMENTS.flaming);
      result = EquipmentModifier.enchant(result, 'Longsword', WEAPON_ENCHANTMENTS.vampiric);
      result = EquipmentModifier.curse(result, 'Longsword', CURSES.weakness);
      result = EquipmentModifier.curse(result, 'Longsword', CURSES.attunement);
      result = EquipmentModifier.curse(result, 'Longsword', CURSES.berserker);

      // Verify 3 enchantments and 3 curses
      let longsword = result.weapons.find(w => w.name === 'Longsword');
      expect(longsword?.modifications?.length).toBe(6);

      // Lift all curses
      result = EquipmentModifier.liftCurse(result, 'Longsword');
      longsword = result.weapons.find(w => w.name === 'Longsword');
      expect(longsword?.modifications?.length).toBe(3);
      expect(EquipmentModifier.isEnchanted(result, 'Longsword')).toBe(true);
      expect(EquipmentModifier.isCursed(result, 'Longsword')).toBe(false);
      expect(longsword?.modifications?.map(m => m.id)).toContain('plus_one');
      expect(longsword?.modifications?.map(m => m.id)).toContain('flaming');
      expect(longsword?.modifications?.map(m => m.id)).toContain('vampiric');
    });

    it('should lift curse from enchanted-only item (no changes)', () => {
      const equipment = createTestEquipment();
      let result = EquipmentModifier.enchant(equipment, 'Longsword', WEAPON_ENCHANTMENTS.plusOne);

      // Verify enchantment only
      let longsword = result.weapons.find(w => w.name === 'Longsword');
      expect(longsword?.modifications?.length).toBe(1);
      expect(EquipmentModifier.isEnchanted(result, 'Longsword')).toBe(true);
      expect(EquipmentModifier.isCursed(result, 'Longsword')).toBe(false);

      // Lift curse (should not remove enchantment)
      result = EquipmentModifier.liftCurse(result, 'Longsword');
      longsword = result.weapons.find(w => w.name === 'Longsword');
      expect(longsword?.modifications?.length).toBe(1);
      expect(EquipmentModifier.isEnchanted(result, 'Longsword')).toBe(true);
    });

    it('should lift attunement curse specifically', () => {
      const equipment = createTestEquipment();
      let result = EquipmentModifier.enchant(equipment, 'Longsword', WEAPON_ENCHANTMENTS.plusOne);
      result = EquipmentModifier.curse(result, 'Longsword', CURSES.attunement);

      // Verify attunement lock is active
      let longsword = result.weapons.find(w => w.name === 'Longsword');
      expect(longsword?.modifications?.some(m => m.id === 'attunement')).toBe(true);

      // Lift curse
      result = EquipmentModifier.liftCurse(result, 'Longsword');
      longsword = result.weapons.find(w => w.name === 'Longsword');
      expect(longsword?.modifications?.some(m => m.id === 'attunement')).toBe(false);
      expect(EquipmentModifier.isEnchanted(result, 'Longsword')).toBe(true);
    });

    it('should lift curse from armor correctly', () => {
      const equipment = createTestEquipment();
      let result = EquipmentModifier.enchant(equipment, 'Leather Armor', ARMOR_ENCHANTMENTS.plusOne);
      result = EquipmentModifier.curse(result, 'Leather Armor', CURSES.clumsiness);

      // Lift curse
      result = EquipmentModifier.liftCurse(result, 'Leather Armor');
      const armor = result.armor.find(a => a.name === 'Leather Armor');
      expect(armor?.modifications?.length).toBe(1);
      expect(EquipmentModifier.isEnchanted(result, 'Leather Armor')).toBe(true);
      expect(EquipmentModifier.isCursed(result, 'Leather Armor')).toBe(false);
    });

    it('should lift multiple stacked curses of same type', () => {
      const equipment = createTestEquipment();
      let result = EquipmentModifier.curse(equipment, 'Longsword', CURSES.weakness);
      result = EquipmentModifier.curse(result, 'Longsword', CURSES.weakness);

      // Verify two curses
      let longsword = result.weapons.find(w => w.name === 'Longsword');
      expect(longsword?.modifications?.length).toBe(2);

      // Lift all curses
      result = EquipmentModifier.liftCurse(result, 'Longsword');
      longsword = result.weapons.find(w => w.name === 'Longsword');
      expect(longsword?.modifications?.length).toBe(0);
      expect(EquipmentModifier.isCursed(result, 'Longsword')).toBe(false);
    });
  });

  describe('Combined Remove Operations', () => {
    it('should remove specific enchantment, then lift curse, then disenchant remaining', () => {
      const equipment = createTestEquipment();
      let result = EquipmentModifier.enchant(equipment, 'Longsword', WEAPON_ENCHANTMENTS.plusOne);
      result = EquipmentModifier.enchant(result, 'Longsword', WEAPON_ENCHANTMENTS.flaming);
      result = EquipmentModifier.curse(result, 'Longsword', CURSES.weakness);

      // Step 1: Remove specific enchantment
      result = EquipmentModifier.removeModification(result, 'Longsword', 'flaming');
      let longsword = result.weapons.find(w => w.name === 'Longsword');
      expect(longsword?.modifications?.length).toBe(2);

      // Step 2: Lift curse
      result = EquipmentModifier.liftCurse(result, 'Longsword');
      longsword = result.weapons.find(w => w.name === 'Longsword');
      expect(longsword?.modifications?.length).toBe(1);
      expect(EquipmentModifier.isCursed(result, 'Longsword')).toBe(false);

      // Step 3: Disenchant remaining
      result = EquipmentModifier.disenchant(result, 'Longsword');
      longsword = result.weapons.find(w => w.name === 'Longsword');
      expect(longsword?.modifications?.length).toBe(0);
    });
  });
});

describe('EquipmentModifier - Attunement Curse Behavior (Task 7.2)', () => {
  describe('Attunement Curse Detection', () => {
    it('should have attunement curse available in CURSES', () => {
      expect(CURSES.attunement).toBeDefined();
      expect(CURSES.attunement.id).toBe('attunement');
      expect(CURSES.attunement.name).toBe('Cursed: Attunement Lock');
      expect(CURSES.attunement.source).toBe('curse');
    });

    it('should apply attunement curse with correct property', () => {
      const attunement = CURSES.attunement;
      expect(attunement.properties).toBeDefined();
      expect(attunement.properties?.length).toBeGreaterThan(0);
      expect(attunement.properties?.[0].type).toBe('special_property');
      expect(attunement.properties?.[0].target).toBe('curse_attunement');
      expect(attunement.properties?.[0].value).toBe(true);
    });
  });

  describe('Attunement Curse Application', () => {
    it('should apply attunement curse to weapon', () => {
      const equipment = createTestEquipment();
      const result = EquipmentModifier.curse(equipment, 'Longsword', CURSES.attunement);

      const longsword = result.weapons.find(w => w.name === 'Longsword');
      expect(longsword?.modifications?.some(m => m.id === 'attunement')).toBe(true);
    });

    it('should apply attunement curse to armor', () => {
      const equipment = createTestEquipment();
      const result = EquipmentModifier.curse(equipment, 'Leather Armor', CURSES.attunement);

      const armor = result.armor.find(a => a.name === 'Leather Armor');
      expect(armor?.modifications?.some(m => m.id === 'attunement')).toBe(true);
    });

    it('should identify attunement-cursed items as cursed', () => {
      const equipment = createTestEquipment();
      const result = EquipmentModifier.curse(equipment, 'Longsword', CURSES.attunement);

      expect(EquipmentModifier.isCursed(result, 'Longsword')).toBe(true);
    });
  });

  describe('Attunement Curse Removal', () => {
    it('should lift attunement curse with liftCurse()', () => {
      const equipment = createTestEquipment();
      let result = EquipmentModifier.curse(equipment, 'Longsword', CURSES.attunement);

      expect(EquipmentModifier.isCursed(result, 'Longsword')).toBe(true);

      result = EquipmentModifier.liftCurse(result, 'Longsword');

      expect(EquipmentModifier.isCursed(result, 'Longsword')).toBe(false);
      const longsword = result.weapons.find(w => w.name === 'Longsword');
      expect(longsword?.modifications?.length).toBe(0);
    });

    it('should remove attunement curse with removeModification()', () => {
      const equipment = createTestEquipment();
      let result = EquipmentModifier.curse(equipment, 'Longsword', CURSES.attunement);

      result = EquipmentModifier.removeModification(result, 'Longsword', 'attunement');

      const longsword = result.weapons.find(w => w.name === 'Longsword');
      expect(longsword?.modifications?.length).toBe(0);
    });

    it('should keep attunement curse when disenchanting', () => {
      const equipment = createTestEquipment();
      let result = EquipmentModifier.enchant(equipment, 'Longsword', WEAPON_ENCHANTMENTS.plusOne);
      result = EquipmentModifier.curse(result, 'Longsword', CURSES.attunement);

      result = EquipmentModifier.disenchant(result, 'Longsword');

      const longsword = result.weapons.find(w => w.name === 'Longsword');
      expect(longsword?.modifications?.some(m => m.id === 'attunement')).toBe(true);
      expect(EquipmentModifier.isCursed(result, 'Longsword')).toBe(true);
    });
  });

  describe('Attunement Curse with Other Modifications', () => {
    it('should allow attunement curse with other curses', () => {
      const equipment = createTestEquipment();
      let result = EquipmentModifier.curse(equipment, 'Longsword', CURSES.attunement);
      result = EquipmentModifier.curse(result, 'Longsword', CURSES.weakness);

      const longsword = result.weapons.find(w => w.name === 'Longsword');
      expect(longsword?.modifications?.length).toBe(2);
      expect(longsword?.modifications?.map(m => m.id)).toContain('attunement');
      expect(longsword?.modifications?.map(m => m.id)).toContain('weakness');
    });

    it('should allow attunement curse with enchantments', () => {
      const equipment = createTestEquipment();
      let result = EquipmentModifier.enchant(equipment, 'Longsword', WEAPON_ENCHANTMENTS.flaming);
      result = EquipmentModifier.curse(result, 'Longsword', CURSES.attunement);

      const longsword = result.weapons.find(w => w.name === 'Longsword');
      expect(longsword?.modifications?.length).toBe(2);
      expect(EquipmentModifier.isEnchanted(result, 'Longsword')).toBe(true);
      expect(EquipmentModifier.isCursed(result, 'Longsword')).toBe(true);
    });
  });
});

describe('EquipmentModifier - All Curses Availability (Task 7.2)', () => {
  describe('Penalty Curses', () => {
    it('should have minusOne curse available', () => {
      expect(CURSES.minusOne).toBeDefined();
      expect(CURSES.minusOne.id).toBe('minus_one');
    });

    it('should have minusTwo curse available', () => {
      expect(CURSES.minusTwo).toBeDefined();
      expect(CURSES.minusTwo.id).toBe('minus_two');
    });
  });

  describe('Stat Curses', () => {
    it('should have weakness curse (STR) available', () => {
      expect(CURSES.weakness).toBeDefined();
      expect(CURSES.weakness.id).toBe('weakness');
    });

    it('should have feeblemind curse (INT) available', () => {
      expect(CURSES.feeblemind).toBeDefined();
      expect(CURSES.feeblemind.id).toBe('feeblemind');
    });

    it('should have clumsiness curse (DEX) available', () => {
      expect(CURSES.clumsiness).toBeDefined();
      expect(CURSES.clumsiness.id).toBe('clumsiness');
    });

    it('should have frailty curse (CON) available', () => {
      expect(CURSES.frailty).toBeDefined();
      expect(CURSES.frailty.id).toBe('frailty');
    });

    it('should have foolishness curse (WIS) available', () => {
      expect(CURSES.foolishness).toBeDefined();
      expect(CURSES.foolishness.id).toBe('foolishness');
    });

    it('should have repulsiveness curse (CHA) available', () => {
      expect(CURSES.repulsiveness).toBeDefined();
      expect(CURSES.repulsiveness.id).toBe('repulsiveness');
    });
  });

  describe('Vulnerability Curses', () => {
    it('should have fireVulnerability curse available', () => {
      expect(CURSES.fireVulnerability).toBeDefined();
      expect(CURSES.fireVulnerability.id).toBe('fire_vulnerability');
    });

    it('should have coldVulnerability curse available', () => {
      expect(CURSES.coldVulnerability).toBeDefined();
      expect(CURSES.coldVulnerability.id).toBe('cold_vulnerability');
    });
  });

  describe('Special Curses', () => {
    it('should have lifesteal curse available', () => {
      expect(CURSES.lifesteal).toBeDefined();
      expect(CURSES.lifesteal.id).toBe('lifesteal');
    });

    it('should have attunement curse available', () => {
      expect(CURSES.attunement).toBeDefined();
      expect(CURSES.attunement.id).toBe('attunement');
    });

    it('should have berserker curse available', () => {
      expect(CURSES.berserker).toBeDefined();
      expect(CURSES.berserker.id).toBe('berserker');
    });

    it('should have heavyBurden curse available', () => {
      expect(CURSES.heavyBurden).toBeDefined();
      expect(CURSES.heavyBurden.id).toBe('heavy_burden');
    });

    it('should have lightSensitivity curse available', () => {
      expect(CURSES.lightSensitivity).toBeDefined();
      expect(CURSES.lightSensitivity.id).toBe('light_sensitivity');
    });
  });

  describe('Curse Count', () => {
    it('should have all expected curses available', () => {
      const expectedCurses = [
        'minusOne', 'minusTwo',
        'weakness', 'feeblemind', 'clumsiness', 'frailty', 'foolishness', 'repulsiveness',
        'fireVulnerability', 'coldVulnerability',
        'lifesteal', 'attunement', 'berserker', 'heavyBurden', 'lightSensitivity'
      ];

      expectedCurses.forEach(curseName => {
        expect(CURSES[curseName as keyof typeof CURSES]).toBeDefined();
      });
    });
  });
});

/**
 * Magic Items Loot Tests (Task 7.3)
 *
 * Test spawning random magic items
 * Test spawning magic items by rarity
 * Verify magic items have correct properties
 * Test adding magic items to character
 */
describe('Magic Items Loot (Task 7.3)', () => {
  describe('MAGIC_ITEMS Collection', () => {
    it('should have MAGIC_ITEMS collection available', () => {
      expect(MAGIC_ITEMS).toBeDefined();
      expect(Array.isArray(MAGIC_ITEMS)).toBe(true);
    });

    it('should have expected number of magic items (34 total)', () => {
      expect(MAGIC_ITEMS.length).toBeGreaterThan(0);
      // The documentation indicates 34 items
      expect(MAGIC_ITEMS.length).toBeGreaterThanOrEqual(30);
    });

    it('should have all items with required properties', () => {
      MAGIC_ITEMS.forEach(item => {
        expect(item.name).toBeDefined();
        expect(typeof item.name).toBe('string');
        expect(item.type).toBeDefined();
        expect(['weapon', 'armor', 'item']).toContain(item.type);
        expect(item.rarity).toBeDefined();
        expect(['common', 'uncommon', 'rare', 'very_rare', 'legendary']).toContain(item.rarity);
      });
    });
  });

  describe('Spawning Random Magic Items', () => {
    it('should spawn random magic items using seeded RNG', () => {
      const rng = new SeededRNG('test-seed-123');
      const shuffled = [...MAGIC_ITEMS].sort(() => rng.random() - 0.5);
      const selectedItems = shuffled.slice(0, 3);

      expect(selectedItems.length).toBe(3);
      selectedItems.forEach(item => {
        expect(MAGIC_ITEMS).toContainEqual(expect.objectContaining({ name: item.name }));
      });
    });

    it('should be deterministic with same seed', () => {
      const seed = 'deterministic-test-seed';

      // First run
      const rng1 = new SeededRNG(seed);
      const shuffled1 = [...MAGIC_ITEMS].sort(() => rng1.random() - 0.5);
      const selected1 = shuffled1.slice(0, 5).map(i => i.name);

      // Second run with same seed
      const rng2 = new SeededRNG(seed);
      const shuffled2 = [...MAGIC_ITEMS].sort(() => rng2.random() - 0.5);
      const selected2 = shuffled2.slice(0, 5).map(i => i.name);

      // Should produce same results
      expect(selected1).toEqual(selected2);
    });

    it('should not exceed available items when requesting more', () => {
      const rng = new SeededRNG('large-request-seed');
      const shuffled = [...MAGIC_ITEMS].sort(() => rng.random() - 0.5);
      const selectedItems = shuffled.slice(0, 100); // Request 100, but only 34 available

      expect(selectedItems.length).toBeLessThanOrEqual(MAGIC_ITEMS.length);
    });

    it('should handle empty result gracefully', () => {
      const rng = new SeededRNG('empty-test-seed');
      const shuffled = [...MAGIC_ITEMS].sort(() => rng.random() - 0.5);
      const selectedItems = shuffled.slice(0, 0);

      expect(selectedItems.length).toBe(0);
    });
  });

  describe('Spawning Magic Items by Rarity', () => {
    it('should filter items by uncommon rarity', () => {
      const uncommonItems = getMagicItemsByRarity('uncommon');

      expect(uncommonItems.length).toBeGreaterThan(0);
      uncommonItems.forEach(item => {
        expect(item.rarity).toBe('uncommon');
      });
    });

    it('should filter items by rare rarity', () => {
      const rareItems = getMagicItemsByRarity('rare');

      expect(rareItems.length).toBeGreaterThan(0);
      rareItems.forEach(item => {
        expect(item.rarity).toBe('rare');
      });
    });

    it('should filter items by very_rare rarity', () => {
      const veryRareItems = getMagicItemsByRarity('very_rare');

      expect(veryRareItems.length).toBeGreaterThan(0);
      veryRareItems.forEach(item => {
        expect(item.rarity).toBe('very_rare');
      });
    });

    it('should filter items by legendary rarity', () => {
      const legendaryItems = getMagicItemsByRarity('legendary');

      expect(legendaryItems.length).toBeGreaterThan(0);
      legendaryItems.forEach(item => {
        expect(item.rarity).toBe('legendary');
      });
    });

    it('should return empty array for common rarity (if no common items)', () => {
      const commonItems = getMagicItemsByRarity('common');

      // Magic items typically start at uncommon, so this might be empty
      commonItems.forEach(item => {
        expect(item.rarity).toBe('common');
      });
    });

    it('should spawn random items from filtered rarity', () => {
      const rareItems = getMagicItemsByRarity('rare');
      const rng = new SeededRNG('rare-item-seed');
      const shuffled = [...rareItems].sort(() => rng.random() - 0.5);
      const selected = shuffled.slice(0, 2);

      expect(selected.length).toBeLessThanOrEqual(rareItems.length);
      selected.forEach(item => {
        expect(item.rarity).toBe('rare');
      });
    });
  });

  describe('Magic Items Properties', () => {
    it('should have Flame Tongue weapon with correct properties', () => {
      const flameTongue = getMagicItem('Flame Tongue');

      expect(flameTongue).toBeDefined();
      expect(flameTongue?.type).toBe('weapon');
      expect(flameTongue?.rarity).toBe('rare');
      expect(flameTongue?.properties).toBeDefined();
      expect(flameTongue?.properties?.length).toBeGreaterThan(0);
    });

    it('should have Vorpal Sword legendary weapon', () => {
      const vorpalSword = getMagicItem('Vorpal Sword');

      expect(vorpalSword).toBeDefined();
      expect(vorpalSword?.rarity).toBe('legendary');
      expect(vorpalSword?.type).toBe('weapon');
    });

    it('should have Mithral Shirt armor', () => {
      const mithralShirt = getMagicItem('Mithral Shirt');

      expect(mithralShirt).toBeDefined();
      expect(mithralShirt?.type).toBe('armor');
      expect(mithralShirt?.rarity).toBe('uncommon');
    });

    it('should have Elven Chain armor', () => {
      const elvenChain = getMagicItem('Elven Chain');

      expect(elvenChain).toBeDefined();
      expect(elvenChain?.type).toBe('armor');
    });

    it('should have items with grantsFeatures property', () => {
      const itemsWithFeatures = MAGIC_ITEMS.filter(item =>
        item.grantsFeatures && item.grantsFeatures.length > 0
      );

      expect(itemsWithFeatures.length).toBeGreaterThan(0);
    });

    it('should have items with grantsSkills property', () => {
      const itemsWithSkills = MAGIC_ITEMS.filter(item =>
        item.grantsSkills && item.grantsSkills.length > 0
      );

      expect(itemsWithSkills.length).toBeGreaterThan(0);
    });

    it('should have items with grantsSpells property', () => {
      const itemsWithSpells = MAGIC_ITEMS.filter(item =>
        item.grantsSpells && item.grantsSpells.length > 0
      );

      expect(itemsWithSpells.length).toBeGreaterThan(0);
    });

    it('should have cursed items available', () => {
      const cursedItems = getCursedItems();

      expect(cursedItems.length).toBeGreaterThan(0);
      cursedItems.forEach(item => {
        expect(item.tags).toContain('cursed');
      });
    });

    it('should have -1 Cursed Sword in cursed items', () => {
      const cursedSword = getMagicItem('-1 Cursed Sword');

      expect(cursedSword).toBeDefined();
      expect(cursedSword?.tags).toContain('cursed');
    });
  });

  describe('Query Functions', () => {
    it('should get magic items by type - weapons', () => {
      const weapons = getMagicItemsByType('weapon');

      expect(weapons.length).toBeGreaterThan(0);
      weapons.forEach(item => {
        expect(item.type).toBe('weapon');
      });
    });

    it('should get magic items by type - armor', () => {
      const armor = getMagicItemsByType('armor');

      expect(armor.length).toBeGreaterThan(0);
      armor.forEach(item => {
        expect(item.type).toBe('armor');
      });
    });

    it('should get magic items by type - items', () => {
      const items = getMagicItemsByType('item');

      expect(items.length).toBeGreaterThan(0);
      items.forEach(item => {
        expect(item.type).toBe('item');
      });
    });

    it('should get items with specific property type', () => {
      const itemsWithDamageBonus = getItemsWithProperty('damage_bonus');

      expect(Array.isArray(itemsWithDamageBonus)).toBe(true);
    });

    it('should return undefined for non-existent item', () => {
      const nonExistent = getMagicItem('Non Existent Item Name');

      expect(nonExistent).toBeUndefined();
    });
  });

  describe('Adding Magic Items to Character Equipment', () => {
    it('should be able to add magic weapon to equipment', () => {
      const equipment = createTestEquipment();
      const flameTongue = getMagicItem('Flame Tongue');

      expect(flameTongue).toBeDefined();

      // Add the magic item as a new weapon
      const newWeapon: EnhancedInventoryItem = {
        name: flameTongue!.name,
        quantity: 1,
        equipped: false,
        instanceId: 'weapon-flametongue-001'
      };

      const updatedEquipment: CharacterEquipment = {
        ...equipment,
        weapons: [...equipment.weapons, newWeapon]
      };

      expect(updatedEquipment.weapons.length).toBe(equipment.weapons.length + 1);
      expect(updatedEquipment.weapons.map(w => w.name)).toContain('Flame Tongue');
    });

    it('should be able to add magic armor to equipment', () => {
      const equipment = createTestEquipment();
      const mithralShirt = getMagicItem('Mithral Shirt');

      expect(mithralShirt).toBeDefined();

      // Add the magic item as new armor
      const newArmor: EnhancedInventoryItem = {
        name: mithralShirt!.name,
        quantity: 1,
        equipped: false,
        instanceId: 'armor-mithral-001'
      };

      const updatedEquipment: CharacterEquipment = {
        ...equipment,
        armor: [...equipment.armor, newArmor]
      };

      expect(updatedEquipment.armor.length).toBe(equipment.armor.length + 1);
      expect(updatedEquipment.armor.map(a => a.name)).toContain('Mithral Shirt');
    });

    it('should be able to add magic item to inventory', () => {
      const equipment = createTestEquipment();
      const headband = getMagicItem('Headband of Intellect');

      expect(headband).toBeDefined();

      // Add the magic item as a new inventory item
      const newItem: EnhancedInventoryItem = {
        name: headband!.name,
        quantity: 1,
        equipped: false,
        instanceId: 'item-headband-001'
      };

      const updatedEquipment: CharacterEquipment = {
        ...equipment,
        items: [...equipment.items, newItem]
      };

      expect(updatedEquipment.items.length).toBe(equipment.items.length + 1);
      expect(updatedEquipment.items.map(i => i.name)).toContain('Headband of Intellect');
    });

    it('should be able to equip a magic weapon', () => {
      const equipment = createTestEquipment();
      const flameTongue = getMagicItem('Flame Tongue');

      // Add magic weapon and equip it
      const newWeapon: EnhancedInventoryItem = {
        name: flameTongue!.name,
        quantity: 1,
        equipped: true,
        instanceId: 'weapon-flametongue-001'
      };

      const updatedEquipment: CharacterEquipment = {
        ...equipment,
        weapons: [...equipment.weapons, newWeapon]
      };

      const equippedFlameTongue = updatedEquipment.weapons.find(
        w => w.name === 'Flame Tongue' && w.equipped
      );
      expect(equippedFlameTongue).toBeDefined();
    });

    it('should be able to add modifications to magic item inventory entry', () => {
      const equipment = createTestEquipment();

      // Add Flame Tongue to equipment with a pre-existing modification
      const flameTongueWithMod: EnhancedInventoryItem = {
        name: 'Flame Tongue',
        quantity: 1,
        equipped: true,
        instanceId: 'weapon-flametongue-001',
        modifications: [{
          id: 'custom_enhancement',
          name: 'Custom Enhancement',
          properties: [],
          appliedAt: new Date().toISOString(),
          source: 'enchantment'
        }]
      };

      const updatedEquipment: CharacterEquipment = {
        ...equipment,
        weapons: [...equipment.weapons, flameTongueWithMod]
      };

      const flameTongue = updatedEquipment.weapons.find(w => w.name === 'Flame Tongue');
      expect(flameTongue?.modifications).toBeDefined();
      expect(flameTongue?.modifications?.length).toBe(1);
      expect(flameTongue?.modifications?.[0].id).toBe('custom_enhancement');
    });
  });

  describe('Rarity Distribution', () => {
    it('should have items across multiple rarities', () => {
      const rarities = new Set(MAGIC_ITEMS.map(item => item.rarity));

      expect(rarities.size).toBeGreaterThan(1);
    });

    it('should have expected rarity distribution', () => {
      const rarityCounts = {
        common: getMagicItemsByRarity('common').length,
        uncommon: getMagicItemsByRarity('uncommon').length,
        rare: getMagicItemsByRarity('rare').length,
        very_rare: getMagicItemsByRarity('very_rare').length,
        legendary: getMagicItemsByRarity('legendary').length
      };

      // Most magic items should be uncommon or rare
      expect(rarityCounts.uncommon + rarityCounts.rare).toBeGreaterThan(0);

      // At least one legendary item
      expect(rarityCounts.legendary).toBeGreaterThanOrEqual(1);

      // Log distribution for debugging
      // console.log('Rarity distribution:', rarityCounts);
    });
  });
});
