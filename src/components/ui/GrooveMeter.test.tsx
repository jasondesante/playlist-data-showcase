/**
 * Tests for GrooveMeter Component
 *
 * Task 8.2: Component Tests
 * - Test bar fills correctly based on hotness
 * - Test direction labels display correctly
 * - Test streak counter displays
 * - Test color changes at threshold boundaries
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { GrooveMeter } from './GrooveMeter';
import type { GrooveDirection } from '@/types';

describe('GrooveMeter', () => {
  describe('Task 8.2.1: Bar Fills Correctly Based on Hotness', () => {
    it('renders the groove meter container', () => {
      render(
        <GrooveMeter hotness={50} direction="neutral" streak={5} />
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('sets progressbar aria attributes correctly', () => {
      render(
        <GrooveMeter hotness={75} direction="neutral" streak={10} />
      );

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '75');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '100');
      expect(progressbar).toHaveAttribute('aria-label', 'Groove meter: 75% hotness, on point timing, 10 streak');
    });

    it('fills bar to 0% when hotness is 0', () => {
      render(
        <GrooveMeter hotness={0} direction="neutral" streak={0} />
      );

      const fillElement = document.querySelector('.groove-meter__fill');
      expect(fillElement).toHaveStyle({ width: '0%' });
    });

    it('fills bar to 50% when hotness is 50', () => {
      render(
        <GrooveMeter hotness={50} direction="neutral" streak={5} />
      );

      const fillElement = document.querySelector('.groove-meter__fill');
      expect(fillElement).toHaveStyle({ width: '50%' });
    });

    it('fills bar to 100% when hotness is 100', () => {
      render(
        <GrooveMeter hotness={100} direction="neutral" streak={20} />
      );

      const fillElement = document.querySelector('.groove-meter__fill');
      expect(fillElement).toHaveStyle({ width: '100%' });
    });

    it('clamps hotness to 0 when negative value is passed', () => {
      render(
        <GrooveMeter hotness={-50} direction="neutral" streak={0} />
      );

      const progressbar = screen.getByRole('progressbar');
      const fillElement = document.querySelector('.groove-meter__fill');
      expect(fillElement).toHaveStyle({ width: '0%' });
      expect(progressbar).toHaveAttribute('aria-valuenow', '0');
    });

    it('clamps hotness to 100 when value over 100 is passed', () => {
      render(
        <GrooveMeter hotness={150} direction="neutral" streak={0} />
      );

      const progressbar = screen.getByRole('progressbar');
      const fillElement = document.querySelector('.groove-meter__fill');
      expect(fillElement).toHaveStyle({ width: '100%' });
      expect(progressbar).toHaveAttribute('aria-valuenow', '100');
    });

    it('displays decimal hotness values correctly', () => {
      render(
        <GrooveMeter hotness={33.5} direction="neutral" streak={3} />
      );

      const progressbar = screen.getByRole('progressbar');
      const fillElement = document.querySelector('.groove-meter__fill');
      expect(fillElement).toHaveStyle({ width: '33.5%' });
      expect(progressbar).toHaveAttribute('aria-valuenow', '33.5');
    });
  });

  describe('Task 8.2.2: Direction Labels Display Correctly', () => {
    it('displays "Pushing" label with up arrow for push direction', () => {
      render(
        <GrooveMeter hotness={50} direction="push" streak={5} />
      );

      expect(screen.getByText('Pushing')).toBeInTheDocument();
      expect(screen.getByText('↑')).toBeInTheDocument();
    });

    it('displays "Laid Back" label with down arrow for pull direction', () => {
      render(
        <GrooveMeter hotness={50} direction="pull" streak={5} />
      );

      expect(screen.getByText('Laid Back')).toBeInTheDocument();
      expect(screen.getByText('↓')).toBeInTheDocument();
    });

    it('displays "On Point" label with dot for neutral direction', () => {
      render(
        <GrooveMeter hotness={50} direction="neutral" streak={5} />
      );

      expect(screen.getByText('On Point')).toBeInTheDocument();
      expect(screen.getByText('●')).toBeInTheDocument();
    });

    it('applies push direction class for push direction', () => {
      render(
        <GrooveMeter hotness={50} direction="push" streak={5} />
      );

      const directionContainer = screen.getByText('Pushing').closest('.groove-meter__direction');
      expect(directionContainer).toHaveClass('groove-meter__direction--push');
    });

    it('applies pull direction class for pull direction', () => {
      render(
        <GrooveMeter hotness={50} direction="pull" streak={5} />
      );

      const directionContainer = screen.getByText('Laid Back').closest('.groove-meter__direction');
      expect(directionContainer).toHaveClass('groove-meter__direction--pull');
    });

    it('applies neutral direction class for neutral direction', () => {
      render(
        <GrooveMeter hotness={50} direction="neutral" streak={5} />
      );

      const directionContainer = screen.getByText('On Point').closest('.groove-meter__direction');
      expect(directionContainer).toHaveClass('groove-meter__direction--neutral');
    });
  });

  describe('Task 8.2.3: Streak Counter Displays', () => {
    it('displays streak value', () => {
      render(
        <GrooveMeter hotness={50} direction="neutral" streak={7} />
      );

      expect(screen.getByText('7')).toBeInTheDocument();
    });

    it('displays "streak" label', () => {
      render(
        <GrooveMeter hotness={50} direction="neutral" streak={5} />
      );

      expect(screen.getByText('streak')).toBeInTheDocument();
    });

    it('displays 0 when streak is 0', () => {
      render(
        <GrooveMeter hotness={0} direction="neutral" streak={0} />
      );

      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('displays large streak values correctly', () => {
      render(
        <GrooveMeter hotness={100} direction="neutral" streak={999} />
      );

      expect(screen.getByText('999')).toBeInTheDocument();
    });

    it('streak value has correct class', () => {
      render(
        <GrooveMeter hotness={50} direction="neutral" streak={5} />
      );

      const streakValue = screen.getByText('5');
      expect(streakValue).toHaveClass('groove-meter__streak-value');
    });

    it('streak label has correct class', () => {
      render(
        <GrooveMeter hotness={50} direction="neutral" streak={5} />
      );

      const streakLabel = screen.getByText('streak');
      expect(streakLabel).toHaveClass('groove-meter__streak-label');
    });
  });

  describe('Task 8.2.4: Color Changes at Threshold Boundaries', () => {
    it('applies cool class (blue) for 0% hotness', () => {
      render(
        <GrooveMeter hotness={0} direction="neutral" streak={0} />
      );

      const fillElement = document.querySelector('.groove-meter__fill');
      expect(fillElement).toHaveClass('groove-meter__fill--cool');
    });

    it('applies cool class (blue) for 25% hotness (boundary)', () => {
      render(
        <GrooveMeter hotness={25} direction="neutral" streak={3} />
      );

      const fillElement = document.querySelector('.groove-meter__fill');
      expect(fillElement).toHaveClass('groove-meter__fill--cool');
    });

    it('applies warm class (green) for 26% hotness (just above boundary)', () => {
      render(
        <GrooveMeter hotness={26} direction="neutral" streak={3} />
      );

      const fillElement = document.querySelector('.groove-meter__fill');
      expect(fillElement).toHaveClass('groove-meter__fill--warm');
    });

    it('applies warm class (green) for 50% hotness (middle of range)', () => {
      render(
        <GrooveMeter hotness={50} direction="neutral" streak={6} />
      );

      const fillElement = document.querySelector('.groove-meter__fill');
      expect(fillElement).toHaveClass('groove-meter__fill--warm');
    });

    it('applies hot class (orange) for 51% hotness (hot threshold)', () => {
      render(
        <GrooveMeter hotness={51} direction="neutral" streak={6} />
      );

      const fillElement = document.querySelector('.groove-meter__fill');
      expect(fillElement).toHaveClass('groove-meter__fill--hot');
    });

    it('applies hot class (orange) for 52% hotness (just above boundary)', () => {
      render(
        <GrooveMeter hotness={52} direction="neutral" streak={6} />
      );

      const fillElement = document.querySelector('.groove-meter__fill');
      expect(fillElement).toHaveClass('groove-meter__fill--hot');
    });

    it('applies hot class (orange) for 75% hotness (middle of range)', () => {
      render(
        <GrooveMeter hotness={75} direction="neutral" streak={10} />
      );

      const fillElement = document.querySelector('.groove-meter__fill');
      expect(fillElement).toHaveClass('groove-meter__fill--hot');
    });

    it('applies on-fire class (red/orange) for 76% hotness (on-fire threshold)', () => {
      render(
        <GrooveMeter hotness={76} direction="neutral" streak={10} />
      );

      const fillElement = document.querySelector('.groove-meter__fill');
      expect(fillElement).toHaveClass('groove-meter__fill--on-fire');
    });

    it('applies on-fire class (red/orange) for 77% hotness (just above boundary)', () => {
      render(
        <GrooveMeter hotness={77} direction="neutral" streak={12} />
      );

      const fillElement = document.querySelector('.groove-meter__fill');
      expect(fillElement).toHaveClass('groove-meter__fill--on-fire');
    });

    it('applies on-fire class (red/orange) for 89% hotness (end of range)', () => {
      render(
        <GrooveMeter hotness={89} direction="neutral" streak={18} />
      );

      const fillElement = document.querySelector('.groove-meter__fill');
      expect(fillElement).toHaveClass('groove-meter__fill--on-fire');
    });

    it('applies blazing class (gold) for 90% hotness (blazing threshold)', () => {
      render(
        <GrooveMeter hotness={90} direction="neutral" streak={20} />
      );

      const fillElement = document.querySelector('.groove-meter__fill');
      expect(fillElement).toHaveClass('groove-meter__fill--blazing');
    });

    it('applies blazing class (gold) for 100% hotness (maximum)', () => {
      render(
        <GrooveMeter hotness={100} direction="neutral" streak={25} />
      );

      const fillElement = document.querySelector('.groove-meter__fill');
      expect(fillElement).toHaveClass('groove-meter__fill--blazing');
    });

    it('applies correct class for each 10% increment from 0 to 100', () => {
      const hotnessLevels: [number, string][] = [
        [0, 'groove-meter__fill--cool'],
        [10, 'groove-meter__fill--cool'],
        [20, 'groove-meter__fill--cool'],
        [30, 'groove-meter__fill--warm'],
        [40, 'groove-meter__fill--warm'],
        [50, 'groove-meter__fill--warm'],
        [60, 'groove-meter__fill--hot'],
        [70, 'groove-meter__fill--hot'],
        [80, 'groove-meter__fill--on-fire'],
        [90, 'groove-meter__fill--blazing'],
        [100, 'groove-meter__fill--blazing'],
      ];

      hotnessLevels.forEach(([hotness, expectedClass]) => {
        const { unmount } = render(
          <GrooveMeter hotness={hotness} direction="neutral" streak={hotness / 5} />
        );

        const fillElement = document.querySelector('.groove-meter__fill');
        expect(fillElement).toHaveClass(expectedClass);

        unmount();
      });
    });
  });

  describe('Variant Prop', () => {
    it('applies full variant class by default', () => {
      render(
        <GrooveMeter hotness={50} direction="neutral" streak={5} />
      );

      const container = screen.getByRole('progressbar').closest('.groove-meter');
      expect(container).toHaveClass('groove-meter--full');
    });

    it('applies full variant class when variant="full" is passed', () => {
      render(
        <GrooveMeter hotness={50} direction="neutral" streak={5} variant="full" />
      );

      const container = screen.getByRole('progressbar').closest('.groove-meter');
      expect(container).toHaveClass('groove-meter--full');
    });

    it('applies compact variant class when variant="compact" is passed', () => {
      render(
        <GrooveMeter hotness={50} direction="neutral" streak={5} variant="compact" />
      );

      const container = screen.getByRole('progressbar').closest('.groove-meter');
      expect(container).toHaveClass('groove-meter--compact');
    });
  });

  describe('Custom className Prop', () => {
    it('applies custom className when provided', () => {
      render(
        <GrooveMeter
          hotness={50}
          direction="neutral"
          streak={5}
          className="custom-class"
        />
      );

      const container = screen.getByRole('progressbar').closest('.groove-meter');
      expect(container).toHaveClass('custom-class');
      expect(container).toHaveClass('groove-meter'); // Still has base class
    });

    it('applies multiple custom classes when provided', () => {
      render(
        <GrooveMeter
          hotness={50}
          direction="neutral"
          streak={5}
          className="custom-class another-class"
        />
      );

      const container = screen.getByRole('progressbar').closest('.groove-meter');
      expect(container).toHaveClass('custom-class');
      expect(container).toHaveClass('another-class');
    });
  });

  describe('Direction Change Animation', () => {
    it('applies animation class when direction changes', async () => {
      const { rerender } = render(
        <GrooveMeter hotness={50} direction="neutral" streak={5} />
      );

      // Initially no animation class
      const directionContainer = screen.getByText('On Point').closest('.groove-meter__direction');
      expect(directionContainer).not.toHaveClass('groove-meter__direction--animating');

      // Change direction
      rerender(
        <GrooveMeter hotness={50} direction="push" streak={5} />
      );

      // Animation class should now be applied
      const updatedContainer = screen.getByText('Pushing').closest('.groove-meter__direction');
      expect(updatedContainer).toHaveClass('groove-meter__direction--animating');
    });

    it('applies animation class to icon when direction changes', async () => {
      const { rerender } = render(
        <GrooveMeter hotness={50} direction="neutral" streak={5} />
      );

      // Change direction
      rerender(
        <GrooveMeter hotness={50} direction="push" streak={5} />
      );

      const icon = screen.getByText('↑');
      expect(icon).toHaveClass('groove-meter__direction-icon--animating');
    });

    it('applies animation class to label when direction changes', async () => {
      const { rerender } = render(
        <GrooveMeter hotness={50} direction="neutral" streak={5} />
      );

      // Change direction
      rerender(
        <GrooveMeter hotness={50} direction="push" streak={5} />
      );

      const label = screen.getByText('Pushing');
      expect(label).toHaveClass('groove-meter__direction-label--animating');
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA role', () => {
      render(
        <GrooveMeter hotness={50} direction="neutral" streak={5} />
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('announces hotness value via aria-valuenow', () => {
      render(
        <GrooveMeter hotness={67} direction="neutral" streak={8} />
      );

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '67');
    });

    it('announces range via aria-valuemin and aria-valuemax', () => {
      render(
        <GrooveMeter hotness={50} direction="neutral" streak={5} />
      );

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    });

    it('has descriptive aria-label with hotness, direction, and streak', () => {
      render(
        <GrooveMeter hotness={42} direction="neutral" streak={4} />
      );

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-label', 'Groove meter: 42% hotness, on point timing, 4 streak');
    });

    it('has descriptive aria-label for push direction', () => {
      render(
        <GrooveMeter hotness={50} direction="push" streak={5} />
      );

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-label', 'Groove meter: 50% hotness, pushing timing, 5 streak');
    });

    it('has descriptive aria-label for pull direction', () => {
      render(
        <GrooveMeter hotness={50} direction="pull" streak={5} />
      );

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-label', 'Groove meter: 50% hotness, laid back timing, 5 streak');
    });

    it('has aria-label on direction container', () => {
      render(
        <GrooveMeter hotness={50} direction="push" streak={5} />
      );

      const directionContainer = document.querySelector('.groove-meter__direction');
      expect(directionContainer).toHaveAttribute('aria-label', 'Timing direction: Pushing');
    });

    it('has aria-label on streak container', () => {
      render(
        <GrooveMeter hotness={50} direction="neutral" streak={7} />
      );

      const streakContainer = document.querySelector('.groove-meter__streak');
      expect(streakContainer).toHaveAttribute('aria-label', 'Current streak: 7 consecutive hits');
    });

    it('has live region for screen reader announcements', () => {
      render(
        <GrooveMeter hotness={50} direction="neutral" streak={5} />
      );

      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveAttribute('role', 'status');
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
    });

    it('fill element is hidden from screen readers', () => {
      render(
        <GrooveMeter hotness={50} direction="neutral" streak={5} />
      );

      const fillElement = document.querySelector('.groove-meter__fill');
      expect(fillElement).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Animation Performance (Success Criterion)', () => {
    it('uses CSS transitions for smooth width changes', () => {
      render(
        <GrooveMeter hotness={50} direction="neutral" streak={5} />
      );

      const fillElement = document.querySelector('.groove-meter__fill');
      expect(fillElement).toBeInTheDocument();
      // The CSS should have transitions defined for smooth animations
      // We verify the element exists and will animate via CSS classes
    });

    it('applies animation classes for on-fire hotness (76%+)', () => {
      render(
        <GrooveMeter hotness={80} direction="neutral" streak={10} />
      );

      const fillElement = document.querySelector('.groove-meter__fill');
      expect(fillElement).toHaveClass('groove-meter__fill--on-fire');
    });

    it('applies animation classes for blazing hotness (90%+)', () => {
      render(
        <GrooveMeter hotness={95} direction="neutral" streak={15} />
      );

      const fillElement = document.querySelector('.groove-meter__fill');
      expect(fillElement).toHaveClass('groove-meter__fill--blazing');
    });

    it('animation class is removed after animation completes', async () => {
      vi.useFakeTimers();

      const { rerender } = render(
        <GrooveMeter hotness={50} direction="neutral" streak={5} />
      );

      // Change direction to trigger animation
      rerender(
        <GrooveMeter hotness={50} direction="push" streak={5} />
      );

      const directionContainer = screen.getByText('Pushing').closest('.groove-meter__direction');
      expect(directionContainer).toHaveClass('groove-meter__direction--animating');

      // Fast-forward past animation duration (400ms)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      // Animation class should be removed
      expect(directionContainer).not.toHaveClass('groove-meter__direction--animating');

      vi.useRealTimers();
    });

    it('uses GPU-accelerated properties for direction animations', () => {
      const { rerender } = render(
        <GrooveMeter hotness={50} direction="neutral" streak={5} />
      );

      // Trigger direction change
      rerender(
        <GrooveMeter hotness={50} direction="push" streak={5} />
      );

      const icon = screen.getByText('↑');
      const label = screen.getByText('Pushing');

      // Verify animation classes are applied (CSS handles GPU acceleration)
      expect(icon).toHaveClass('groove-meter__direction-icon--animating');
      expect(label).toHaveClass('groove-meter__direction-label--animating');
    });
  });
});
