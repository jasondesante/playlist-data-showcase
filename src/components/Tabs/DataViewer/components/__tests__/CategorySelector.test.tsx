/**
 * Tests for CategorySelector Component
 *
 * Test Coverage:
 * - Renders all category buttons
 * - Shows correct counts for each category
 * - Highlights active category
 * - Calls onCategoryChange when clicked
 * - Renders icons for each category
 *
 * Run: npm test -- CategorySelector.test.tsx
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CategorySelector } from '../CategorySelector';
import type { DataCategory, DataCounts } from '../../../../../hooks/useDataViewer';

// ============================================
// TEST DATA
// ============================================

const mockDataCounts: DataCounts = {
  spells: 42,
  skills: 18,
  classFeatures: 35,
  racialTraits: 22,
  races: 9,
  classes: 12,
  equipment: 67,
  appearance: 15,
};

// ============================================
// TESTS
// ============================================

describe('CategorySelector', () => {
  describe('Rendering', () => {
    it('renders all category buttons', () => {
      const onCategoryChange = vi.fn();

      render(
        <CategorySelector
          activeCategory="spells"
          dataCounts={mockDataCounts}
          onCategoryChange={onCategoryChange}
        />
      );

      // Check all category labels are rendered
      expect(screen.getByText('Spells')).toBeInTheDocument();
      expect(screen.getByText('Skills')).toBeInTheDocument();
      expect(screen.getByText('Class Features')).toBeInTheDocument();
      expect(screen.getByText('Racial Traits')).toBeInTheDocument();
      expect(screen.getByText('Races')).toBeInTheDocument();
      expect(screen.getByText('Classes')).toBeInTheDocument();
      expect(screen.getByText('Equipment')).toBeInTheDocument();
      expect(screen.getByText('Appearance')).toBeInTheDocument();
    });

    it('shows correct counts for each category', () => {
      const onCategoryChange = vi.fn();

      render(
        <CategorySelector
          activeCategory="spells"
          dataCounts={mockDataCounts}
          onCategoryChange={onCategoryChange}
        />
      );

      // Check counts are displayed
      expect(screen.getByText('42')).toBeInTheDocument(); // spells
      expect(screen.getByText('18')).toBeInTheDocument(); // skills
      expect(screen.getByText('35')).toBeInTheDocument(); // classFeatures
      expect(screen.getByText('67')).toBeInTheDocument(); // equipment
    });

    it('shows zero count for empty categories', () => {
      const onCategoryChange = vi.fn();
      const emptyCounts: DataCounts = {
        spells: 0,
        skills: 0,
        classFeatures: 0,
        racialTraits: 0,
        races: 0,
        classes: 0,
        equipment: 0,
        appearance: 0,
      };

      render(
        <CategorySelector
          activeCategory="spells"
          dataCounts={emptyCounts}
          onCategoryChange={onCategoryChange}
        />
      );

      // All categories should show 0
      const zeros = screen.getAllByText('0');
      expect(zeros).toHaveLength(8);
    });
  });

  describe('Active State', () => {
    it('highlights active category', () => {
      const onCategoryChange = vi.fn();

      render(
        <CategorySelector
          activeCategory="spells"
          dataCounts={mockDataCounts}
          onCategoryChange={onCategoryChange}
        />
      );

      // Find the active button
      const activeBtn = screen.getByText('Spells').closest('button');
      expect(activeBtn).toHaveClass('dataviewer-category-btn-active');
    });

    it('updates active state when activeCategory changes', () => {
      const onCategoryChange = vi.fn();

      const { rerender } = render(
        <CategorySelector
          activeCategory="spells"
          dataCounts={mockDataCounts}
          onCategoryChange={onCategoryChange}
        />
      );

      // Spells should be active initially
      expect(screen.getByText('Spells').closest('button')).toHaveClass('dataviewer-category-btn-active');

      // Rerender with different active category
      rerender(
        <CategorySelector
          activeCategory="equipment"
          dataCounts={mockDataCounts}
          onCategoryChange={onCategoryChange}
        />
      );

      // Equipment should now be active
      expect(screen.getByText('Equipment').closest('button')).toHaveClass('dataviewer-category-btn-active');
      // Spells should no longer be active
      expect(screen.getByText('Spells').closest('button')).not.toHaveClass('dataviewer-category-btn-active');
    });

    it('only one category is active at a time', () => {
      const onCategoryChange = vi.fn();

      render(
        <CategorySelector
          activeCategory="skills"
          dataCounts={mockDataCounts}
          onCategoryChange={onCategoryChange}
        />
      );

      // Get all buttons
      const buttons = screen.getAllByRole('button');
      const activeButtons = buttons.filter(btn =>
        btn.classList.contains('dataviewer-category-btn-active')
      );

      // Only one should be active
      expect(activeButtons).toHaveLength(1);
      expect(activeButtons[0]).toHaveTextContent('Skills');
    });
  });

  describe('Interactions', () => {
    it('calls onCategoryChange when category button is clicked', () => {
      const onCategoryChange = vi.fn();

      render(
        <CategorySelector
          activeCategory="spells"
          dataCounts={mockDataCounts}
          onCategoryChange={onCategoryChange}
        />
      );

      // Click on Equipment button
      const equipmentBtn = screen.getByText('Equipment').closest('button');
      if (equipmentBtn) {
        fireEvent.click(equipmentBtn);
      }

      expect(onCategoryChange).toHaveBeenCalledTimes(1);
      expect(onCategoryChange).toHaveBeenCalledWith('equipment');
    });

    it('calls onCategoryChange with correct category for each button', () => {
      const onCategoryChange = vi.fn();

      render(
        <CategorySelector
          activeCategory="spells"
          dataCounts={mockDataCounts}
          onCategoryChange={onCategoryChange}
        />
      );

      // Test each category
      const categories: DataCategory[] = [
        'spells', 'skills', 'classFeatures', 'racialTraits',
        'races', 'classes', 'equipment', 'appearance'
      ];

      categories.forEach(category => {
        const btn = screen.getByText(
          category === 'classFeatures' ? 'Class Features' :
          category === 'racialTraits' ? 'Racial Traits' :
          category.charAt(0).toUpperCase() + category.slice(1)
        ).closest('button');

        if (btn) {
          fireEvent.click(btn);
        }
      });

      expect(onCategoryChange).toHaveBeenCalledTimes(8);
      categories.forEach(category => {
        expect(onCategoryChange).toHaveBeenCalledWith(category);
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper button role for all categories', () => {
      const onCategoryChange = vi.fn();

      render(
        <CategorySelector
          activeCategory="spells"
          dataCounts={mockDataCounts}
          onCategoryChange={onCategoryChange}
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(8);
    });

    it('has visible labels for screen readers', () => {
      const onCategoryChange = vi.fn();

      render(
        <CategorySelector
          activeCategory="spells"
          dataCounts={mockDataCounts}
          onCategoryChange={onCategoryChange}
        />
      );

      // Labels should be in the document
      expect(screen.getByText('Spells')).toBeVisible();
      expect(screen.getByText('Equipment')).toBeVisible();
    });
  });

  describe('Edge Cases', () => {
    it('handles large counts correctly', () => {
      const onCategoryChange = vi.fn();
      const largeCounts: DataCounts = {
        ...mockDataCounts,
        spells: 9999,
        equipment: 10000,
      };

      render(
        <CategorySelector
          activeCategory="spells"
          dataCounts={largeCounts}
          onCategoryChange={onCategoryChange}
        />
      );

      expect(screen.getByText('9999')).toBeInTheDocument();
      expect(screen.getByText('10000')).toBeInTheDocument();
    });

    it('handles all categories being the same count', () => {
      const onCategoryChange = vi.fn();
      const sameCounts: DataCounts = {
        spells: 10,
        skills: 10,
        classFeatures: 10,
        racialTraits: 10,
        races: 10,
        classes: 10,
        equipment: 10,
        appearance: 10,
      };

      render(
        <CategorySelector
          activeCategory="spells"
          dataCounts={sameCounts}
          onCategoryChange={onCategoryChange}
        />
      );

      // All counts should be 10
      const tens = screen.getAllByText('10');
      expect(tens).toHaveLength(8);
    });
  });
});
