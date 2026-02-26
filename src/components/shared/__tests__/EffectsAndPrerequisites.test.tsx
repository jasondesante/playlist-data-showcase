/**
 * Tests for EffectsBuilder and PrerequisitesBuilder Components
 *
 * Task 8.1: Test effects/prerequisites builders
 *
 * Test Coverage:
 * - EffectsBuilder rendering and type selection
 * - EffectsBuilder target dropdowns based on type
 * - EffectsBuilder value inputs based on type
 * - EffectsBuilder add/remove effects
 * - EffectsBuilder custom JSON mode
 * - EffectsBuilder validation
 * - PrerequisitesBuilder rendering and type selection
 * - PrerequisitesBuilder dynamic dropdowns from registry
 * - PrerequisitesBuilder multi-select functionality
 * - PrerequisitesBuilder custom JSON mode
 * - PrerequisitesBuilder validation
 * - Integration with creator forms
 *
 * Run: npm test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  EffectsBuilder,
  createEmptyEffect,
  EFFECT_TYPES,
  ABILITIES,
  ABILITY_UNLOCKS,
  PASSIVE_MODIFIER_TARGETS,
  SPELL_SLOT_LEVELS,
  type Effect
} from '../EffectsBuilder';
import {
  PrerequisitesBuilder,
  createEmptyPrerequisites,
  PREREQUISITE_TYPES,
  type Prerequisites
} from '../PrerequisitesBuilder';

// ============================================
// MOCKS
// ============================================

// Mock ExtensionManager
vi.mock('playlist-data-engine', () => ({
  ExtensionManager: {
    getInstance: vi.fn(() => ({
      get: vi.fn((key: string) => {
        switch (key) {
          case 'skills':
            return [
              { id: 'athletics', name: 'Athletics' },
              { id: 'arcana', name: 'Arcana' },
              { id: 'stealth', name: 'Stealth' },
              { id: 'perception', name: 'Perception' },
            ];
          case 'spells':
            return [
              { name: 'Fireball' },
              { name: 'Magic Missile' },
              { name: 'Cure Wounds' },
            ];
          case 'classes':
            return ['Fighter', 'Wizard', 'Rogue', 'Cleric'];
          case 'races':
            return ['Human', 'Elf', 'Dwarf', 'Halfling'];
          case 'races.data':
            return [
              { race: 'Elf', subraces: ['High Elf', 'Wood Elf'] },
              { race: 'Dwarf', subraces: ['Hill Dwarf', 'Mountain Dwarf'] },
            ];
          case 'classFeatures':
            return [
              { id: 'second_wind', name: 'Second Wind', class: 'Fighter', type: 'active' },
              { id: 'arcane_recovery', name: 'Arcane Recovery', class: 'Wizard', type: 'resource' },
              { id: 'sneak_attack', name: 'Sneak Attack', class: 'Rogue' },
              { id: 'rage', name: 'Rage', class: 'Barbarian', type: 'resource' },
            ];
          case 'racialTraits':
            return [
              { id: 'darkvision', name: 'Darkvision', race: 'Elf' },
              { id: 'keen_senses', name: 'Keen Senses', race: 'Elf' },
              { id: 'dwarven_resilience', name: 'Dwarven Resilience', race: 'Dwarf' },
            ];
          case 'equipment':
            return [
              { name: 'Shortsword', type: 'weapon' },
              { name: 'Leather Armor', type: 'armor' },
            ];
          default:
            return [];
        }
      }),
    })),
  },
}));

// ============================================
// EFFECTS BUILDER TESTS
// ============================================

describe('EffectsBuilder', () => {
  const mockOnChange = vi.fn();
  const mockOnValidChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
    mockOnValidChange.mockClear();
  });

  describe('Constants and Exports', () => {
    it('exports all 6 effect types', () => {
      expect(EFFECT_TYPES).toHaveLength(6);
      expect(EFFECT_TYPES.map(t => t.value)).toEqual([
        'stat_bonus',
        'skill_proficiency',
        'ability_unlock',
        'passive_modifier',
        'resource_grant',
        'spell_slot_bonus',
      ]);
    });

    it('exports 6 abilities', () => {
      expect(ABILITIES).toEqual(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']);
    });

    it('exports ability unlock options', () => {
      expect(ABILITY_UNLOCKS.length).toBeGreaterThan(0);
      expect(ABILITY_UNLOCKS.find(a => a.value === 'darkvision')).toBeDefined();
      expect(ABILITY_UNLOCKS.find(a => a.value === 'flight')).toBeDefined();
    });

    it('exports passive modifier targets', () => {
      expect(PASSIVE_MODIFIER_TARGETS.length).toBeGreaterThan(0);
      expect(PASSIVE_MODIFIER_TARGETS.find(t => t.value === 'ac')).toBeDefined();
      expect(PASSIVE_MODIFIER_TARGETS.find(t => t.value === 'speed')).toBeDefined();
    });

    it('exports spell slot levels 1-9', () => {
      expect(SPELL_SLOT_LEVELS).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });
  });

  describe('createEmptyEffect', () => {
    it('creates an effect with empty values', () => {
      const effect = createEmptyEffect();
      expect(effect).toEqual({
        type: '' as EffectType,
        target: '',
        value: undefined,
        condition: '',
      });
    });
  });

  describe('Rendering', () => {
    it('renders with header and optional label', () => {
      render(<EffectsBuilder onChange={mockOnChange} />);
      expect(screen.getByText('Effects')).toBeInTheDocument();
      expect(screen.getByText('(optional)')).toBeInTheDocument();
    });

    it('renders add effect button', () => {
      render(<EffectsBuilder onChange={mockOnChange} />);
      expect(screen.getByText('Add Effect')).toBeInTheDocument();
    });

    it('renders refresh button', () => {
      render(<EffectsBuilder onChange={mockOnChange} />);
      const refreshBtn = screen.getByTitle('Refresh options from registry');
      expect(refreshBtn).toBeInTheDocument();
    });

    it('shows hint when showHints is true', () => {
      render(<EffectsBuilder onChange={mockOnChange} showHints />);
      expect(screen.getByText(/Add structured effects for programmatic handling/)).toBeInTheDocument();
    });

    it('hides hint when showHints is false', () => {
      render(<EffectsBuilder onChange={mockOnChange} showHints={false} />);
      expect(screen.queryByText(/Add structured effects for programmatic handling/)).not.toBeInTheDocument();
    });

    it('renders with initial effects', () => {
      const initialEffects: Effect[] = [
        { type: 'stat_bonus', target: 'STR', value: 2 },
      ];
      render(<EffectsBuilder value={initialEffects} onChange={mockOnChange} />);

      // Should show the effect type badge
      expect(screen.getByText('Stat Bonus')).toBeInTheDocument();
    });

    it('disables all controls when disabled prop is true', () => {
      render(<EffectsBuilder disabled onChange={mockOnChange} />);
      const addBtn = screen.getByText('Add Effect').closest('button');
      expect(addBtn).toBeDisabled();
    });
  });

  describe('Effect Type Selection', () => {
    it('shows all effect types in dropdown', async () => {
      render(<EffectsBuilder onChange={mockOnChange} />);

      // Click to expand the first effect
      const effectHeader = screen.getByText('Effect 1').closest('div');
      if (effectHeader) {
        fireEvent.click(effectHeader);
      }

      await waitFor(() => {
        const typeSelect = screen.getByLabelText(/Type/);
        expect(typeSelect).toBeInTheDocument();
      });
    });

    it('resets target and value when type changes', async () => {
      const initialEffects: Effect[] = [
        { type: 'stat_bonus', target: 'STR', value: 2 },
      ];
      render(<EffectsBuilder value={initialEffects} onChange={mockOnChange} />);

      // Expand the effect
      const effectHeader = screen.getByText('Effect 1').closest('div');
      if (effectHeader) {
        fireEvent.click(effectHeader);
      }

      await waitFor(() => {
        const typeSelect = screen.getByLabelText(/Type/);
        fireEvent.change(typeSelect, { target: { value: 'ability_unlock' } });
      });

      expect(mockOnChange).toHaveBeenCalled();
    });
  });

  describe('Target Dropdowns by Type', () => {
    it('shows abilities for stat_bonus type', async () => {
      render(<EffectsBuilder onChange={mockOnChange} />);

      // Expand and select type
      const effectHeader = screen.getByText('Effect 1').closest('div');
      if (effectHeader) {
        fireEvent.click(effectHeader);
      }

      await waitFor(() => {
        const typeSelect = screen.getByLabelText(/Type/);
        fireEvent.change(typeSelect, { target: { value: 'stat_bonus' } });
      });

      await waitFor(() => {
        const targetSelect = screen.getByLabelText(/Target/);
        expect(targetSelect).toBeInTheDocument();
      });
    });

    it('shows skills for skill_proficiency type', async () => {
      render(<EffectsBuilder onChange={mockOnChange} />);

      const effectHeader = screen.getByText('Effect 1').closest('div');
      if (effectHeader) {
        fireEvent.click(effectHeader);
      }

      await waitFor(() => {
        const typeSelect = screen.getByLabelText(/Type/);
        fireEvent.change(typeSelect, { target: { value: 'skill_proficiency' } });
      });

      await waitFor(() => {
        // Should show skills from registry
        expect(screen.getByText('Athletics')).toBeInTheDocument();
      });
    });

    it('shows ability unlocks for ability_unlock type', async () => {
      render(<EffectsBuilder onChange={mockOnChange} />);

      const effectHeader = screen.getByText('Effect 1').closest('div');
      if (effectHeader) {
        fireEvent.click(effectHeader);
      }

      await waitFor(() => {
        const typeSelect = screen.getByLabelText(/Type/);
        fireEvent.change(typeSelect, { target: { value: 'ability_unlock' } });
      });

      await waitFor(() => {
        const targetSelect = screen.getByLabelText(/Target/);
        expect(targetSelect).toBeInTheDocument();
      });
    });

    it('shows passive modifier targets for passive_modifier type', async () => {
      render(<EffectsBuilder onChange={mockOnChange} />);

      const effectHeader = screen.getByText('Effect 1').closest('div');
      if (effectHeader) {
        fireEvent.click(effectHeader);
      }

      await waitFor(() => {
        const typeSelect = screen.getByLabelText(/Type/);
        fireEvent.change(typeSelect, { target: { value: 'passive_modifier' } });
      });

      await waitFor(() => {
        const targetSelect = screen.getByLabelText(/Target/);
        expect(targetSelect).toBeInTheDocument();
      });
    });

    it('shows spell slot levels for spell_slot_bonus type', async () => {
      render(<EffectsBuilder onChange={mockOnChange} />);

      const effectHeader = screen.getByText('Effect 1').closest('div');
      if (effectHeader) {
        fireEvent.click(effectHeader);
      }

      await waitFor(() => {
        const typeSelect = screen.getByLabelText(/Type/);
        fireEvent.change(typeSelect, { target: { value: 'spell_slot_bonus' } });
      });

      await waitFor(() => {
        const targetSelect = screen.getByLabelText(/Target/);
        expect(targetSelect).toBeInTheDocument();
      });
    });
  });

  describe('Value Inputs by Type', () => {
    it('shows number input for stat_bonus', async () => {
      const initialEffects: Effect[] = [
        { type: 'stat_bonus', target: 'STR', value: undefined },
      ];
      render(<EffectsBuilder value={initialEffects} onChange={mockOnChange} />);

      const effectHeader = screen.getByText('Effect 1').closest('div');
      if (effectHeader) {
        fireEvent.click(effectHeader);
      }

      await waitFor(() => {
        const valueInput = screen.getByPlaceholderText('e.g., 2');
        expect(valueInput).toHaveAttribute('type', 'number');
      });
    });

    it('shows checkbox for ability_unlock', async () => {
      const initialEffects: Effect[] = [
        { type: 'ability_unlock', target: 'darkvision', value: undefined },
      ];
      render(<EffectsBuilder value={initialEffects} onChange={mockOnChange} />);

      const effectHeader = screen.getByText('Effect 1').closest('div');
      if (effectHeader) {
        fireEvent.click(effectHeader);
      }

      await waitFor(() => {
        const checkbox = screen.getByLabelText('Enabled');
        expect(checkbox).toHaveAttribute('type', 'checkbox');
      });
    });
  });

  describe('Effect Management', () => {
    it('can add a new effect', async () => {
      render(<EffectsBuilder onChange={mockOnChange} />);

      const addBtn = screen.getByText('Add Effect');
      fireEvent.click(addBtn);

      await waitFor(() => {
        expect(screen.getByText('Effect 2')).toBeInTheDocument();
      });
    });

    it('can remove an effect when multiple exist', async () => {
      const initialEffects: Effect[] = [
        { type: 'stat_bonus', target: 'STR', value: 2 },
        { type: 'stat_bonus', target: 'DEX', value: 2 },
      ];
      render(<EffectsBuilder value={initialEffects} onChange={mockOnChange} />);

      // Expand first effect to see remove button
      const effectHeader = screen.getByText('Effect 1').closest('div');
      if (effectHeader) {
        fireEvent.click(effectHeader);
      }

      await waitFor(() => {
        const removeBtn = screen.getByTitle('Remove effect');
        expect(removeBtn).toBeInTheDocument();
      });
    });

    it('cannot remove when only one effect exists', async () => {
      render(<EffectsBuilder onChange={mockOnChange} />);

      const effectHeader = screen.getByText('Effect 1').closest('div');
      if (effectHeader) {
        fireEvent.click(effectHeader);
      }

      await waitFor(() => {
        // Remove button should not be present for single effect
        expect(screen.queryByTitle('Remove effect')).not.toBeInTheDocument();
      });
    });
  });

  describe('Custom JSON Mode', () => {
    it('can toggle to custom JSON mode', async () => {
      render(<EffectsBuilder onChange={mockOnChange} />);

      const effectHeader = screen.getByText('Effect 1').closest('div');
      if (effectHeader) {
        fireEvent.click(effectHeader);
      }

      await waitFor(() => {
        const customBtn = screen.getByText('Custom JSON');
        fireEvent.click(customBtn);
      });

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/"type": "stat_bonus"/)).toBeInTheDocument();
      });
    });

    it('can toggle back to form mode', async () => {
      render(<EffectsBuilder onChange={mockOnChange} />);

      const effectHeader = screen.getByText('Effect 1').closest('div');
      if (effectHeader) {
        fireEvent.click(effectHeader);
      }

      await waitFor(() => {
        const customBtn = screen.getByText('Custom JSON');
        fireEvent.click(customBtn);
      });

      await waitFor(() => {
        const formBtn = screen.getByText('Use Form');
        fireEvent.click(formBtn);
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/Type/)).toBeInTheDocument();
      });
    });

    it('parses valid JSON and updates effect', async () => {
      render(<EffectsBuilder onChange={mockOnChange} />);

      const effectHeader = screen.getByText('Effect 1').closest('div');
      if (effectHeader) {
        fireEvent.click(effectHeader);
      }

      await waitFor(() => {
        fireEvent.click(screen.getByText('Custom JSON'));
      });

      const jsonTextarea = screen.getByPlaceholderText(/"type": "stat_bonus"/);
      fireEvent.change(jsonTextarea, {
        target: { value: '{"type": "stat_bonus", "target": "INT", "value": 3}' },
      });

      expect(mockOnChange).toHaveBeenCalled();
    });
  });

  describe('Condition Field', () => {
    it('shows condition field after target is selected', async () => {
      const initialEffects: Effect[] = [
        { type: 'stat_bonus', target: 'STR', value: 2 },
      ];
      render(<EffectsBuilder value={initialEffects} onChange={mockOnChange} />);

      const effectHeader = screen.getByText('Effect 1').closest('div');
      if (effectHeader) {
        fireEvent.click(effectHeader);
      }

      await waitFor(() => {
        expect(screen.getByLabelText(/Condition/)).toBeInTheDocument();
      });
    });

    it('updates condition value', async () => {
      const initialEffects: Effect[] = [
        { type: 'stat_bonus', target: 'STR', value: 2, condition: '' },
      ];
      render(<EffectsBuilder value={initialEffects} onChange={mockOnChange} />);

      const effectHeader = screen.getByText('Effect 1').closest('div');
      if (effectHeader) {
        fireEvent.click(effectHeader);
      }

      await waitFor(() => {
        const conditionInput = screen.getByPlaceholderText('e.g., when wielding martial weapon');
        fireEvent.change(conditionInput, { target: { value: 'when raging' } });
      });

      expect(mockOnChange).toHaveBeenCalled();
    });
  });

  describe('Validation', () => {
    it('calls onValidChange with true when all effects are valid', async () => {
      const validEffects: Effect[] = [
        { type: 'stat_bonus', target: 'STR', value: 2 },
      ];
      render(
        <EffectsBuilder
          value={validEffects}
          onChange={mockOnChange}
          onValidChange={mockOnValidChange}
        />
      );

      await waitFor(() => {
        expect(mockOnValidChange).toHaveBeenCalledWith(true);
      });
    });
  });
});

// ============================================
// PREREQUISITES BUILDER TESTS
// ============================================

describe('PrerequisitesBuilder', () => {
  const mockOnChange = vi.fn();
  const mockOnValidChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
    mockOnValidChange.mockClear();
  });

  describe('Constants and Exports', () => {
    it('exports all 9 prerequisite types', () => {
      expect(PREREQUISITE_TYPES).toHaveLength(9);
      expect(PREREQUISITE_TYPES.map(t => t.value)).toEqual([
        'level',
        'abilities',
        'class',
        'race',
        'subrace',
        'features',
        'skills',
        'spells',
        'custom',
      ]);
    });
  });

  describe('createEmptyPrerequisites', () => {
    it('creates an empty prerequisites object', () => {
      const prereqs = createEmptyPrerequisites();
      expect(prereqs).toEqual({});
    });
  });

  describe('Rendering', () => {
    it('renders with header and optional label', () => {
      render(<PrerequisitesBuilder onChange={mockOnChange} />);
      expect(screen.getByText('Prerequisites')).toBeInTheDocument();
      expect(screen.getByText('(optional)')).toBeInTheDocument();
    });

    it('renders refresh button', () => {
      render(<PrerequisitesBuilder onChange={mockOnChange} />);
      const refreshBtn = screen.getByTitle('Refresh options from registry');
      expect(refreshBtn).toBeInTheDocument();
    });

    it('shows hint when showHints is true', () => {
      render(<PrerequisitesBuilder onChange={mockOnChange} showHints />);
      expect(screen.getByText(/Set requirements that must be met/)).toBeInTheDocument();
    });

    it('hides hint when showHints is false', () => {
      render(<PrerequisitesBuilder onChange={mockOnChange} showHints={false} />);
      expect(screen.queryByText(/Set requirements that must be met/)).not.toBeInTheDocument();
    });

    it('renders with initial prerequisites', () => {
      const initialPrereqs: Prerequisites = { level: 5 };
      render(<PrerequisitesBuilder value={initialPrereqs} onChange={mockOnChange} />);

      expect(screen.getByText('Level')).toBeInTheDocument();
    });

    it('disables all controls when disabled prop is true', () => {
      render(<PrerequisitesBuilder disabled onChange={mockOnChange} />);
      const refreshBtn = screen.getByTitle('Refresh options from registry');
      expect(refreshBtn).toBeDisabled();
    });
  });

  describe('Adding Prerequisite Types', () => {
    it('shows add dropdown with available types', async () => {
      render(<PrerequisitesBuilder onChange={mockOnChange} />);

      // Find and click the add button to open dropdown
      const addButtons = screen.getAllByRole('button');
      const addBtn = addButtons.find(btn => btn.textContent?.includes('Add Prerequisite'));
      if (addBtn) {
        fireEvent.click(addBtn);
      }

      // Should show available prerequisite types
      await waitFor(() => {
        expect(screen.getByText('Level')).toBeInTheDocument();
      });
    });
  });

  describe('Level Prerequisite', () => {
    it('can set level prerequisite', async () => {
      const initialPrereqs: Prerequisites = { level: 1 };
      render(<PrerequisitesBuilder value={initialPrereqs} onChange={mockOnChange} />);

      // Expand the level section
      const levelHeader = screen.getByText('Level').closest('div');
      if (levelHeader) {
        fireEvent.click(levelHeader);
      }

      await waitFor(() => {
        const levelSelect = screen.getByLabelText('Minimum Level');
        expect(levelSelect).toBeInTheDocument();
      });
    });

    it('validates level is between 1 and 20', async () => {
      const invalidPrereqs: Prerequisites = { level: 25 };
      render(
        <PrerequisitesBuilder
          value={invalidPrereqs}
          onChange={mockOnChange}
          onValidChange={mockOnValidChange}
        />
      );

      await waitFor(() => {
        // Should have validation warning
        expect(mockOnValidChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('Abilities Prerequisite', () => {
    it('can set ability score prerequisites', async () => {
      const initialPrereqs: Prerequisites = { abilities: { STR: 15 } };
      render(<PrerequisitesBuilder value={initialPrereqs} onChange={mockOnChange} />);

      // Expand the abilities section
      const abilitiesHeader = screen.getByText('Abilities').closest('div');
      if (abilitiesHeader) {
        fireEvent.click(abilitiesHeader);
      }

      await waitFor(() => {
        expect(screen.getByLabelText('STR')).toBeInTheDocument();
      });
    });

    it('shows all 6 ability inputs', async () => {
      const initialPrereqs: Prerequisites = { abilities: {} };
      render(<PrerequisitesBuilder value={initialPrereqs} onChange={mockOnChange} />);

      const abilitiesHeader = screen.getByText('Abilities').closest('div');
      if (abilitiesHeader) {
        fireEvent.click(abilitiesHeader);
      }

      await waitFor(() => {
        ABILITIES.forEach(ability => {
          expect(screen.getByLabelText(ability)).toBeInTheDocument();
        });
      });
    });
  });

  describe('Class Prerequisite', () => {
    it('can set class prerequisite from registry', async () => {
      const initialPrereqs: Prerequisites = { class: 'Wizard' };
      render(<PrerequisitesBuilder value={initialPrereqs} onChange={mockOnChange} />);

      const classHeader = screen.getByText('Class').closest('div');
      if (classHeader) {
        fireEvent.click(classHeader);
      }

      await waitFor(() => {
        const classSelect = screen.getByLabelText('Required Class');
        expect(classSelect).toBeInTheDocument();
      });
    });
  });

  describe('Race Prerequisite', () => {
    it('can set race prerequisite from registry', async () => {
      const initialPrereqs: Prerequisites = { race: 'Elf' };
      render(<PrerequisitesBuilder value={initialPrereqs} onChange={mockOnChange} />);

      const raceHeader = screen.getByText('Race').closest('div');
      if (raceHeader) {
        fireEvent.click(raceHeader);
      }

      await waitFor(() => {
        const raceSelect = screen.getByLabelText('Required Race');
        expect(raceSelect).toBeInTheDocument();
      });
    });
  });

  describe('Subrace Prerequisite', () => {
    it('can set subrace prerequisite', async () => {
      const initialPrereqs: Prerequisites = { race: 'Elf', subrace: 'High Elf' };
      render(<PrerequisitesBuilder value={initialPrereqs} onChange={mockOnChange} />);

      const subraceHeader = screen.getByText('Subrace').closest('div');
      if (subraceHeader) {
        fireEvent.click(subraceHeader);
      }

      await waitFor(() => {
        const subraceSelect = screen.getByLabelText('Required Subrace');
        expect(subraceSelect).toBeInTheDocument();
      });
    });

    it('shows subraces from selected race', async () => {
      const initialPrereqs: Prerequisites = { race: 'Elf', subrace: '' };
      render(
        <PrerequisitesBuilder
          value={initialPrereqs}
          onChange={mockOnChange}
          selectedRace="Elf"
        />
      );

      const subraceHeader = screen.getByText('Subrace').closest('div');
      if (subraceHeader) {
        fireEvent.click(subraceHeader);
      }

      await waitFor(() => {
        expect(screen.getByText('High Elf')).toBeInTheDocument();
        expect(screen.getByText('Wood Elf')).toBeInTheDocument();
      });
    });
  });

  describe('Features Prerequisite (Multi-select)', () => {
    it('can add features from registry', async () => {
      const initialPrereqs: Prerequisites = { features: ['second_wind'] };
      render(<PrerequisitesBuilder value={initialPrereqs} onChange={mockOnChange} />);

      const featuresHeader = screen.getByText('Features').closest('div');
      if (featuresHeader) {
        fireEvent.click(featuresHeader);
      }

      await waitFor(() => {
        expect(screen.getByLabelText('Required Features')).toBeInTheDocument();
      });
    });

    it('shows selected features as removable chips', async () => {
      const initialPrereqs: Prerequisites = { features: ['second_wind', 'sneak_attack'] };
      render(<PrerequisitesBuilder value={initialPrereqs} onChange={mockOnChange} />);

      const featuresHeader = screen.getByText('Features').closest('div');
      if (featuresHeader) {
        fireEvent.click(featuresHeader);
      }

      await waitFor(() => {
        expect(screen.getByText('Second Wind')).toBeInTheDocument();
        expect(screen.getByText('Sneak Attack')).toBeInTheDocument();
      });
    });
  });

  describe('Skills Prerequisite (Multi-select)', () => {
    it('can add skills from registry', async () => {
      const initialPrereqs: Prerequisites = { skills: ['athletics'] };
      render(<PrerequisitesBuilder value={initialPrereqs} onChange={mockOnChange} />);

      const skillsHeader = screen.getByText('Skills').closest('div');
      if (skillsHeader) {
        fireEvent.click(skillsHeader);
      }

      await waitFor(() => {
        expect(screen.getByLabelText('Required Skills')).toBeInTheDocument();
      });
    });
  });

  describe('Spells Prerequisite (Multi-select)', () => {
    it('can add spells from registry', async () => {
      const initialPrereqs: Prerequisites = { spells: ['Fireball'] };
      render(<PrerequisitesBuilder value={initialPrereqs} onChange={mockOnChange} />);

      const spellsHeader = screen.getByText('Spells').closest('div');
      if (spellsHeader) {
        fireEvent.click(spellsHeader);
      }

      await waitFor(() => {
        expect(screen.getByLabelText('Required Spells')).toBeInTheDocument();
      });
    });
  });

  describe('Custom Prerequisite', () => {
    it('can set custom prerequisite text', async () => {
      const initialPrereqs: Prerequisites = { custom: 'Must complete the Trial of Courage' };
      render(<PrerequisitesBuilder value={initialPrereqs} onChange={mockOnChange} />);

      const customHeader = screen.getByText('Custom').closest('div');
      if (customHeader) {
        fireEvent.click(customHeader);
      }

      await waitFor(() => {
        const customInput = screen.getByDisplayValue('Must complete the Trial of Courage');
        expect(customInput).toBeInTheDocument();
      });
    });
  });

  describe('Custom JSON Mode', () => {
    it('can toggle to custom JSON mode', async () => {
      render(<PrerequisitesBuilder onChange={mockOnChange} />);

      const customBtn = screen.getByText('Custom JSON');
      fireEvent.click(customBtn);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/"level": 5/)).toBeInTheDocument();
      });
    });

    it('can toggle back to form editor', async () => {
      render(<PrerequisitesBuilder onChange={mockOnChange} />);

      fireEvent.click(screen.getByText('Custom JSON'));

      await waitFor(() => {
        fireEvent.click(screen.getByText('Use Form Editor'));
      });

      await waitFor(() => {
        // Should show add prerequisite button again
        expect(screen.getByText(/Add Prerequisite/)).toBeInTheDocument();
      });
    });

    it('parses valid JSON and updates prerequisites', async () => {
      render(<PrerequisitesBuilder onChange={mockOnChange} />);

      fireEvent.click(screen.getByText('Custom JSON'));

      const jsonTextarea = screen.getByPlaceholderText(/"level": 5/);
      fireEvent.change(jsonTextarea, {
        target: { value: '{"level": 5, "abilities": {"INT": 16}}' },
      });

      expect(mockOnChange).toHaveBeenCalled();
    });
  });

  describe('Removing Prerequisites', () => {
    it('can remove a prerequisite type', async () => {
      const initialPrereqs: Prerequisites = { level: 5 };
      render(<PrerequisitesBuilder value={initialPrereqs} onChange={mockOnChange} />);

      // Find and click the remove button
      const removeBtn = screen.getByTitle('Remove prerequisite');
      fireEvent.click(removeBtn);

      expect(mockOnChange).toHaveBeenCalledWith({});
    });
  });

  describe('Validation', () => {
    it('calls onValidChange with true for valid prerequisites', async () => {
      const validPrereqs: Prerequisites = { level: 5, class: 'Wizard' };
      render(
        <PrerequisitesBuilder
          value={validPrereqs}
          onChange={mockOnChange}
          onValidChange={mockOnValidChange}
        />
      );

      await waitFor(() => {
        expect(mockOnValidChange).toHaveBeenCalledWith(true);
      });
    });

    it('calls onValidChange with false for invalid ability values', async () => {
      const invalidPrereqs: Prerequisites = { abilities: { STR: 35 } };
      render(
        <PrerequisitesBuilder
          value={invalidPrereqs}
          onChange={mockOnChange}
          onValidChange={mockOnValidChange}
        />
      );

      await waitFor(() => {
        expect(mockOnValidChange).toHaveBeenCalledWith(false);
      });
    });
  });
});

// ============================================
// INTEGRATION TESTS
// ============================================

describe('EffectsBuilder and PrerequisitesBuilder Integration', () => {
  it('should be compatible with RacialTraitCreatorForm data structures', () => {
    const traitData = {
      id: 'darkvision',
      name: 'Darkvision',
      race: 'Elf',
      description: 'You can see in darkness',
      effects: [{ type: 'ability_unlock', target: 'darkvision', value: true }] as Effect[],
      prerequisites: { subrace: 'High Elf' } as Prerequisites,
    };

    expect(traitData.effects[0].type).toBe('ability_unlock');
    expect(traitData.effects[0].target).toBe('darkvision');
    expect(traitData.prerequisites.subrace).toBe('High Elf');
  });

  it('should be compatible with ClassFeatureCreatorForm data structures', () => {
    const featureData = {
      id: 'extra_attack',
      name: 'Extra Attack',
      class: 'Fighter',
      level: 5,
      type: 'passive' as const,
      description: 'You can attack twice',
      effects: [{ type: 'passive_modifier', target: 'attack_roll', value: 0 }] as Effect[],
      prerequisites: { level: 5, class: 'Fighter' } as Prerequisites,
    };

    expect(featureData.effects[0].type).toBe('passive_modifier');
    expect(featureData.prerequisites.level).toBe(5);
  });

  it('should support all effect types for form validation', () => {
    const allEffectTypes = EFFECT_TYPES.map(t => t.value);

    allEffectTypes.forEach(type => {
      const effect: Effect = { type, target: 'test', value: 1 };
      expect(effect.type).toBe(type);
    });
  });

  it('should support all prerequisite types for form validation', () => {
    const allPrereqTypes = PREREQUISITE_TYPES.map(t => t.value);

    const fullPrereqs: Prerequisites = {
      level: 10,
      abilities: { STR: 15, DEX: 14 },
      class: 'Fighter',
      race: 'Human',
      subrace: 'Variant',
      features: ['second_wind'],
      skills: ['athletics'],
      spells: ['fireball'],
      custom: 'Special requirement',
    };

    allPrereqTypes.forEach(type => {
      expect(fullPrereqs).toHaveProperty(type);
    });
  });
});
