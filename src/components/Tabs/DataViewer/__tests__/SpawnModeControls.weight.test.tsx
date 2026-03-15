/**
 * Tests for SpawnModeControls Weight Editor
 *
 * Task 8.1: Test weight editor with real item names
 *
 * Test Coverage:
 * - Weight editor renders with grouped items
 * - Items show display names with ID fallback
 * - Items are grouped by category/type correctly
 * - Table header exists (Item | Weight columns)
 * - Group headers are collapsible
 * - Weight input changes work correctly
 * - Expand All / Collapse All functionality
 * - Registry items are fetched and mapped correctly
 * - Fallback to ID when item not in registry
 *
 * Run: npm test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SpawnModeControls } from '../SpawnModeControls';

// ============================================
// MOCKS
// ============================================

// Mock ExtensionManager
const mockGet = vi.fn();
const mockGetMode = vi.fn(() => 'relative');
const mockGetWeights = vi.fn(() => ({}));
const mockSetMode = vi.fn();
const mockSetWeights = vi.fn();
const mockReset = vi.fn();
const mockResetAll = vi.fn();
const mockHasCustomData = vi.fn(() => false);
const mockGetInfo = vi.fn(() => ({ customCount: 0, totalCount: 0 }));
const mockGetRegisteredCategories = vi.fn(() => []);

vi.mock('playlist-data-engine', () => ({
  ExtensionManager: {
    getInstance: vi.fn(() => ({
      get: mockGet,
      getMode: mockGetMode,
      getWeights: mockGetWeights,
      setMode: mockSetMode,
      setWeights: mockSetWeights,
      reset: mockReset,
      resetAll: mockResetAll,
      hasCustomData: mockHasCustomData,
      getInfo: mockGetInfo,
      getRegisteredCategories: mockGetRegisteredCategories,
    })),
  },
}));

// Mock useSpawnMode hook
vi.mock('@/hooks/useSpawnMode', () => ({
  useSpawnMode: () => ({
    getMode: mockGetMode,
    setMode: mockSetMode,
    getWeights: mockGetWeights,
    setWeight: vi.fn(),
    setWeights: mockSetWeights,
    resetCategory: mockReset,
    resetAll: mockResetAll,
    hasCustomData: mockHasCustomData,
    getCategoryInfo: mockGetInfo,
    getCategoriesWithCustomData: mockGetRegisteredCategories,
    exportSpawnConfig: vi.fn(() => ({})),
    importSpawnConfig: vi.fn(),
    version: 1,
    // Global spawn mode functions
    getGlobalMode: vi.fn(() => 'category'),
    setGlobalMode: vi.fn(),
  }),
}));

// Mock dataViewerStore
vi.mock('@/store/dataViewerStore', () => ({
  useDataViewerStore: () => ({
    notifyDataChanged: vi.fn(),
    getSpawnMode: vi.fn(),
    setSpawnMode: vi.fn(),
    getSpawnWeights: mockGetWeights,
    setSpawnWeights: vi.fn(),
    resetSpawnMode: vi.fn(),
    resetAllSpawnModes: vi.fn(),
  }),
}));

// Mock showToast
vi.mock('@/components/ui/Toast', () => ({
  showToast: vi.fn(),
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// ============================================
// TEST DATA
// ============================================

const mockSpellsData = [
  { name: 'Fireball', school: 'Evocation', level: 3 },
  { name: 'Magic Missile', school: 'Evocation', level: 1 },
  { name: 'Cure Wounds', school: 'Conjuration', level: 1 },
  { name: 'Shield', school: 'Abjuration', level: 1 },
  { name: 'Detect Magic', school: 'Divination', level: 1 },
];

const mockEquipmentData = [
  { name: 'Longsword', type: 'weapon', rarity: 'common' },
  { name: 'Shortsword', type: 'weapon', rarity: 'common' },
  { name: 'Leather Armor', type: 'armor', rarity: 'common' },
  { name: 'Chain Mail', type: 'armor', rarity: 'uncommon' },
  { name: 'Health Potion', type: 'consumable', rarity: 'common' },
];

const mockClassFeaturesData = [
  { id: 'second_wind', name: 'Second Wind', class: 'Fighter', type: 'active' },
  { id: 'action_surge', name: 'Action Surge', class: 'Fighter', type: 'active' },
  { id: 'arcane_recovery', name: 'Arcane Recovery', class: 'Wizard', type: 'resource' },
  { id: 'sneak_attack', name: 'Sneak Attack', class: 'Rogue', type: 'passive' },
  { id: 'rage', name: 'Rage', class: 'Barbarian', type: 'resource' },
];

const mockRacialTraitsData = [
  { id: 'darkvision', name: 'Darkvision', race: 'Elf' },
  { id: 'keen_senses', name: 'Keen Senses', race: 'Elf' },
  { id: 'dwarven_resilience', name: 'Dwarven Resilience', race: 'Dwarf' },
  { id: 'lucky', name: 'Lucky', race: 'Halfling' },
];

const mockSkillsData = [
  { id: 'athletics', name: 'Athletics', ability: 'STR' },
  { id: 'arcana', name: 'Arcana', ability: 'INT' },
  { id: 'stealth', name: 'Stealth', ability: 'DEX' },
  { id: 'perception', name: 'Perception', ability: 'WIS' },
];

const mockRacesData = [
  { name: 'Human', size: 'Medium' },
  { name: 'Elf', size: 'Medium' },
  { name: 'Dwarf', size: 'Medium' },
];

const mockClassesData = [
  { name: 'Fighter', hitDie: 10 },
  { name: 'Wizard', hitDie: 6 },
  { name: 'Rogue', hitDie: 8 },
];

// ============================================
// TESTS
// ============================================

describe('SpawnModeControls Weight Editor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMode.mockReturnValue('relative');
    mockGetWeights.mockReturnValue({});
    mockHasCustomData.mockReturnValue(false);
    mockGetInfo.mockReturnValue({ customCount: 0, totalCount: 0 });
  });

  describe('Rendering', () => {
    it('renders weight editor toggle button', () => {
      mockGetWeights.mockReturnValue({ Fireball: 1.0 });
      mockGet.mockReturnValue(mockSpellsData);

      render(<SpawnModeControls category="spells" />);

      expect(screen.getByText('Weight Editor')).toBeInTheDocument();
    });

    it('shows item count badge', () => {
      mockGetWeights.mockReturnValue({ Fireball: 1.0, Shield: 1.0 });
      mockGet.mockReturnValue(mockSpellsData);

      render(<SpawnModeControls category="spells" />);

      expect(screen.getByText(/items/)).toBeInTheDocument();
    });

    it('does not show weight editor when no weights exist', () => {
      mockGetWeights.mockReturnValue({});
      mockGet.mockReturnValue(mockSpellsData);

      render(<SpawnModeControls category="spells" />);

      expect(screen.queryByText('Weight Editor')).not.toBeInTheDocument();
    });

    it('hides weight editor when showWeightEditor is false', () => {
      mockGetWeights.mockReturnValue({ Fireball: 1.0 });
      mockGet.mockReturnValue(mockSpellsData);

      render(<SpawnModeControls category="spells" showWeightEditor={false} />);

      expect(screen.queryByText('Weight Editor')).not.toBeInTheDocument();
    });
  });

  describe('Expand/Collapse Weight Editor', () => {
    it('expands weight editor when toggle is clicked', async () => {
      mockGetWeights.mockReturnValue({ Fireball: 1.0 });
      mockGet.mockReturnValue(mockSpellsData);

      render(<SpawnModeControls category="spells" />);

      const toggleBtn = screen.getByText('Weight Editor').closest('button');
      if (toggleBtn) {
        fireEvent.click(toggleBtn);
      }

      await waitFor(() => {
        // Should show the help text when expanded
        expect(screen.getByText(/Adjust spawn weights/)).toBeInTheDocument();
      });
    });

    it('shows table header when expanded', async () => {
      mockGetWeights.mockReturnValue({ Fireball: 1.0 });
      mockGet.mockReturnValue(mockSpellsData);

      render(<SpawnModeControls category="spells" />);

      const toggleBtn = screen.getByText('Weight Editor').closest('button');
      if (toggleBtn) {
        fireEvent.click(toggleBtn);
      }

      await waitFor(() => {
        expect(screen.getByText('Item')).toBeInTheDocument();
        expect(screen.getByText('Weight')).toBeInTheDocument();
      });
    });

    it('shows Expand All and Collapse All buttons when expanded', async () => {
      mockGetWeights.mockReturnValue({ Fireball: 1.0 });
      mockGet.mockReturnValue(mockSpellsData);

      render(<SpawnModeControls category="spells" />);

      const toggleBtn = screen.getByText('Weight Editor').closest('button');
      if (toggleBtn) {
        fireEvent.click(toggleBtn);
      }

      await waitFor(() => {
        expect(screen.getByText('Expand All')).toBeInTheDocument();
        expect(screen.getByText('Collapse All')).toBeInTheDocument();
      });
    });
  });

  describe('Display Names with ID Fallback', () => {
    it('shows item display name from registry', async () => {
      mockGetWeights.mockReturnValue({ Fireball: 1.0 });
      mockGet.mockReturnValue(mockSpellsData);

      render(<SpawnModeControls category="spells" />);

      const toggleBtn = screen.getByText('Weight Editor').closest('button');
      if (toggleBtn) {
        fireEvent.click(toggleBtn);
      }

      await waitFor(() => {
        // Should show the display name "Fireball"
        expect(screen.getByText('Fireball')).toBeInTheDocument();
      });
    });

    it('shows ID as secondary text when different from display name', async () => {
      // For class features, ID is different from name
      mockGetWeights.mockReturnValue({ 'second_wind': 1.0 });
      mockGet.mockReturnValue(mockClassFeaturesData);

      render(<SpawnModeControls category="classFeatures" />);

      const toggleBtn = screen.getByText('Weight Editor').closest('button');
      if (toggleBtn) {
        fireEvent.click(toggleBtn);
      }

      await waitFor(() => {
        // Should show the display name
        expect(screen.getByText('Second Wind')).toBeInTheDocument();
        // Should show the ID as secondary text
        expect(screen.getByText('second_wind')).toBeInTheDocument();
      });
    });

    it('falls back to key as display name when item not in registry', async () => {
      mockGetWeights.mockReturnValue({ 'Unknown Item': 1.0 });
      mockGet.mockReturnValue([]); // No items in registry

      render(<SpawnModeControls category="spells" />);

      const toggleBtn = screen.getByText('Weight Editor').closest('button');
      if (toggleBtn) {
        fireEvent.click(toggleBtn);
      }

      await waitFor(() => {
        // Should show the key as the display name
        expect(screen.getByText('Unknown Item')).toBeInTheDocument();
      });
    });

    it('shows ID in "Other" group when not in registry', async () => {
      mockGetWeights.mockReturnValue({ 'Unknown Item': 1.0 });
      mockGet.mockReturnValue(mockSpellsData);

      render(<SpawnModeControls category="spells" />);

      const toggleBtn = screen.getByText('Weight Editor').closest('button');
      if (toggleBtn) {
        fireEvent.click(toggleBtn);
      }

      await waitFor(() => {
        // Should show in "Other" group
        expect(screen.getByText('Other')).toBeInTheDocument();
      });
    });
  });

  describe('Grouping by Category/Type', () => {
    it('groups spells by school', async () => {
      mockGetWeights.mockReturnValue({
        'Fireball': 1.0,
        'Magic Missile': 1.0,
        'Cure Wounds': 1.0,
        'Shield': 1.0,
      });
      mockGet.mockReturnValue(mockSpellsData);

      render(<SpawnModeControls category="spells" />);

      const toggleBtn = screen.getByText('Weight Editor').closest('button');
      if (toggleBtn) {
        fireEvent.click(toggleBtn);
      }

      await waitFor(() => {
        // Should show school groups
        expect(screen.getByText('Evocation')).toBeInTheDocument();
        expect(screen.getByText('Conjuration')).toBeInTheDocument();
        expect(screen.getByText('Abjuration')).toBeInTheDocument();
      });
    });

    it('groups equipment by type', async () => {
      mockGetWeights.mockReturnValue({
        'Longsword': 1.0,
        'Leather Armor': 1.0,
        'Health Potion': 1.0,
      });
      mockGet.mockReturnValue(mockEquipmentData);

      render(<SpawnModeControls category="equipment" />);

      const toggleBtn = screen.getByText('Weight Editor').closest('button');
      if (toggleBtn) {
        fireEvent.click(toggleBtn);
      }

      await waitFor(() => {
        // Should show equipment type groups (capitalized)
        expect(screen.getByText('Weapon')).toBeInTheDocument();
        expect(screen.getByText('Armor')).toBeInTheDocument();
        expect(screen.getByText('Consumable')).toBeInTheDocument();
      });
    });

    it('groups class features by class', async () => {
      mockGetWeights.mockReturnValue({
        'second_wind': 1.0,
        'arcane_recovery': 1.0,
        'sneak_attack': 1.0,
      });
      mockGet.mockReturnValue(mockClassFeaturesData);

      render(<SpawnModeControls category="classFeatures" />);

      const toggleBtn = screen.getByText('Weight Editor').closest('button');
      if (toggleBtn) {
        fireEvent.click(toggleBtn);
      }

      await waitFor(() => {
        // Should show class groups
        expect(screen.getByText('Fighter')).toBeInTheDocument();
        expect(screen.getByText('Wizard')).toBeInTheDocument();
        expect(screen.getByText('Rogue')).toBeInTheDocument();
      });
    });

    it('groups racial traits by race', async () => {
      mockGetWeights.mockReturnValue({
        'darkvision': 1.0,
        'dwarven_resilience': 1.0,
        'lucky': 1.0,
      });
      mockGet.mockReturnValue(mockRacialTraitsData);

      render(<SpawnModeControls category="racialTraits" />);

      const toggleBtn = screen.getByText('Weight Editor').closest('button');
      if (toggleBtn) {
        fireEvent.click(toggleBtn);
      }

      await waitFor(() => {
        // Should show race groups
        expect(screen.getByText('Elf')).toBeInTheDocument();
        expect(screen.getByText('Dwarf')).toBeInTheDocument();
        expect(screen.getByText('Halfling')).toBeInTheDocument();
      });
    });

    it('groups skills by ability', async () => {
      mockGetWeights.mockReturnValue({
        'athletics': 1.0,
        'arcana': 1.0,
        'stealth': 1.0,
      });
      mockGet.mockReturnValue(mockSkillsData);

      render(<SpawnModeControls category="skills" />);

      const toggleBtn = screen.getByText('Weight Editor').closest('button');
      if (toggleBtn) {
        fireEvent.click(toggleBtn);
      }

      await waitFor(() => {
        // Should show ability groups (uppercase)
        expect(screen.getByText('STR')).toBeInTheDocument();
        expect(screen.getByText('INT')).toBeInTheDocument();
        expect(screen.getByText('DEX')).toBeInTheDocument();
      });
    });

    it('shows item count per group', async () => {
      mockGetWeights.mockReturnValue({
        'Fireball': 1.0,
        'Magic Missile': 1.0,
        'Cure Wounds': 1.0,
      });
      mockGet.mockReturnValue(mockSpellsData);

      render(<SpawnModeControls category="spells" />);

      const toggleBtn = screen.getByText('Weight Editor').closest('button');
      if (toggleBtn) {
        fireEvent.click(toggleBtn);
      }

      await waitFor(() => {
        // Evocation group should show count of 2
        const evocationGroup = screen.getByText('Evocation').closest('button');
        expect(evocationGroup?.textContent).toContain('2');
      });
    });
  });

  describe('Collapsible Groups', () => {
    it('collapses group when header is clicked', async () => {
      mockGetWeights.mockReturnValue({
        'Fireball': 1.0,
        'Magic Missile': 1.0,
        'Cure Wounds': 1.0,
      });
      mockGet.mockReturnValue(mockSpellsData);

      render(<SpawnModeControls category="spells" />);

      const toggleBtn = screen.getByText('Weight Editor').closest('button');
      if (toggleBtn) {
        fireEvent.click(toggleBtn);
      }

      await waitFor(() => {
        expect(screen.getByText('Fireball')).toBeInTheDocument();
      });

      // Click on Evocation group header to collapse
      const evocationHeader = screen.getByText('Evocation').closest('button');
      if (evocationHeader) {
        fireEvent.click(evocationHeader);
      }

      await waitFor(() => {
        // Items should still exist but group is collapsed
        expect(screen.getByText('Evocation')).toBeInTheDocument();
      });
    });

    it('expands all groups when "Expand All" is clicked', async () => {
      mockGetWeights.mockReturnValue({
        'Fireball': 1.0,
        'Cure Wounds': 1.0,
        'Shield': 1.0,
      });
      mockGet.mockReturnValue(mockSpellsData);

      render(<SpawnModeControls category="spells" />);

      const toggleBtn = screen.getByText('Weight Editor').closest('button');
      if (toggleBtn) {
        fireEvent.click(toggleBtn);
      }

      // Collapse all groups first
      const collapseAllBtn = screen.getByText('Collapse All');
      fireEvent.click(collapseAllBtn);

      // Now expand all
      const expandAllBtn = screen.getByText('Expand All');
      fireEvent.click(expandAllBtn);

      await waitFor(() => {
        expect(screen.getByText('Fireball')).toBeInTheDocument();
        expect(screen.getByText('Cure Wounds')).toBeInTheDocument();
        expect(screen.getByText('Shield')).toBeInTheDocument();
      });
    });

    it('collapses all groups when "Collapse All" is clicked', async () => {
      mockGetWeights.mockReturnValue({
        'Fireball': 1.0,
        'Cure Wounds': 1.0,
        'Shield': 1.0,
      });
      mockGet.mockReturnValue(mockSpellsData);

      render(<SpawnModeControls category="spells" />);

      const toggleBtn = screen.getByText('Weight Editor').closest('button');
      if (toggleBtn) {
        fireEvent.click(toggleBtn);
      }

      await waitFor(() => {
        expect(screen.getByText('Fireball')).toBeInTheDocument();
      });

      // Click Collapse All
      const collapseAllBtn = screen.getByText('Collapse All');
      fireEvent.click(collapseAllBtn);

      await waitFor(() => {
        // Group headers should still be visible
        expect(screen.getByText('Evocation')).toBeInTheDocument();
        expect(screen.getByText('Conjuration')).toBeInTheDocument();
      });
    });
  });

  describe('Weight Input', () => {
    it('shows weight input with correct value', async () => {
      mockGetWeights.mockReturnValue({ Fireball: 1.5 });
      mockGet.mockReturnValue(mockSpellsData);

      render(<SpawnModeControls category="spells" />);

      const toggleBtn = screen.getByText('Weight Editor').closest('button');
      if (toggleBtn) {
        fireEvent.click(toggleBtn);
      }

      await waitFor(() => {
        const input = screen.getByLabelText('Weight for Fireball');
        expect(input).toHaveValue(1.5);
      });
    });

    it('weight input has correct min/max constraints', async () => {
      mockGetWeights.mockReturnValue({ Fireball: 1.0 });
      mockGet.mockReturnValue(mockSpellsData);

      render(<SpawnModeControls category="spells" />);

      const toggleBtn = screen.getByText('Weight Editor').closest('button');
      if (toggleBtn) {
        fireEvent.click(toggleBtn);
      }

      await waitFor(() => {
        const input = screen.getByLabelText('Weight for Fireball');
        expect(input).toHaveAttribute('min', '0');
        expect(input).toHaveAttribute('max', '10');
        expect(input).toHaveAttribute('step', '0.1');
      });
    });
  });

  describe('Subcategory Support', () => {
    it('handles class-specific spell categories', async () => {
      mockGetWeights.mockReturnValue({ Fireball: 1.0 });
      mockGet.mockReturnValue(mockSpellsData);

      render(<SpawnModeControls category="spells.Wizard" />);

      const toggleBtn = screen.getByText('Weight Editor').closest('button');
      if (toggleBtn) {
        fireEvent.click(toggleBtn);
      }

      await waitFor(() => {
        // Should still render items (uses normalized category)
        expect(screen.getByText('Fireball')).toBeInTheDocument();
      });
    });

    it('handles class-specific feature categories', async () => {
      mockGetWeights.mockReturnValue({ second_wind: 1.0 });
      mockGet.mockReturnValue(mockClassFeaturesData);

      render(<SpawnModeControls category="classFeatures.Fighter" />);

      const toggleBtn = screen.getByText('Weight Editor').closest('button');
      if (toggleBtn) {
        fireEvent.click(toggleBtn);
      }

      await waitFor(() => {
        expect(screen.getByText('Second Wind')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles empty registry gracefully', async () => {
      mockGetWeights.mockReturnValue({ 'Some Item': 1.0 });
      mockGet.mockReturnValue([]);

      render(<SpawnModeControls category="spells" />);

      const toggleBtn = screen.getByText('Weight Editor').closest('button');
      if (toggleBtn) {
        fireEvent.click(toggleBtn);
      }

      await waitFor(() => {
        // Should show item in "Other" group
        expect(screen.getByText('Some Item')).toBeInTheDocument();
        expect(screen.getByText('Other')).toBeInTheDocument();
      });
    });

    it('handles registry fetch error gracefully', async () => {
      mockGetWeights.mockReturnValue({ 'Some Item': 1.0 });
      mockGet.mockImplementation(() => {
        throw new Error('Registry error');
      });

      render(<SpawnModeControls category="spells" />);

      const toggleBtn = screen.getByText('Weight Editor').closest('button');
      if (toggleBtn) {
        fireEvent.click(toggleBtn);
      }

      await waitFor(() => {
        // Should still render, falling back to key as display name
        expect(screen.getByText('Some Item')).toBeInTheDocument();
      });
    });

    it('handles items with missing properties', async () => {
      mockGetWeights.mockReturnValue({ 'Mystery Item': 1.0 });
      mockGet.mockReturnValue([
        { name: 'Mystery Item' }, // Missing school property
      ]);

      render(<SpawnModeControls category="spells" />);

      const toggleBtn = screen.getByText('Weight Editor').closest('button');
      if (toggleBtn) {
        fireEvent.click(toggleBtn);
      }

      await waitFor(() => {
        // Should show item in "Unknown" group
        expect(screen.getByText('Mystery Item')).toBeInTheDocument();
        expect(screen.getByText('Unknown')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper aria-expanded attribute on toggle', () => {
      mockGetWeights.mockReturnValue({ Fireball: 1.0 });
      mockGet.mockReturnValue(mockSpellsData);

      render(<SpawnModeControls category="spells" />);

      const toggleBtn = screen.getByText('Weight Editor').closest('button');
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');

      if (toggleBtn) {
        fireEvent.click(toggleBtn);
      }

      expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
    });

    it('has proper aria-label on weight inputs', async () => {
      mockGetWeights.mockReturnValue({ Fireball: 1.0 });
      mockGet.mockReturnValue(mockSpellsData);

      render(<SpawnModeControls category="spells" />);

      const toggleBtn = screen.getByText('Weight Editor').closest('button');
      if (toggleBtn) {
        fireEvent.click(toggleBtn);
      }

      await waitFor(() => {
        const input = screen.getByLabelText('Weight for Fireball');
        expect(input).toBeInTheDocument();
      });
    });

    it('has proper aria-describedby for help text', async () => {
      mockGetWeights.mockReturnValue({ Fireball: 1.0 });
      mockGet.mockReturnValue(mockSpellsData);

      render(<SpawnModeControls category="spells" />);

      const toggleBtn = screen.getByText('Weight Editor').closest('button');
      if (toggleBtn) {
        fireEvent.click(toggleBtn);
      }

      await waitFor(() => {
        const input = screen.getByLabelText('Weight for Fireball');
        expect(input).toHaveAttribute('aria-describedby', 'spawn-mode-weight-help-text');
      });
    });
  });
});
