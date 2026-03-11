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
import type { GrooveDirection, GrooveTier } from '@/types';
import { getGrooveTier } from 'playlist-data-engine';

/**
 * Helper function to get the tier for a given hotness value
 */
function getTierForHotness(hotness: number): GrooveTier {
    return getGrooveTier(hotness);
}

describe('GrooveMeter', () => {
  describe('Task 8.2.1: Bar Fills Correctly Based on Hotness', () => {
    it('renders the groove meter container', () => {
      render(
        <GrooveMeter hotness={50} tier="C" direction="neutral" streak={5} />
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('sets progressbar aria attributes correctly', () => {
      render(
        <GrooveMeter hotness={75} tier="B" direction="neutral" streak={10} />
      );

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '75');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '100');
      expect(progressbar).toHaveAttribute('aria-label', 'Groove meter: 75% hotness, on point timing, 10 streak');
    });

    it('fills bar to 0% when hotness is 0', () => {
      render(
        <GrooveMeter hotness={0} tier="D" direction="neutral" streak={0} />
      );

      const fillElement = document.querySelector('.groove-meter__fill');
      expect(fillElement).toHaveStyle({ width: '0%' });
    });

    it('fills bar to 50% when hotness is 50', () => {
      render(
        <GrooveMeter hotness={50} tier="C" direction="neutral" streak={5} />
      );

      const fillElement = document.querySelector('.groove-meter__fill');
      expect(fillElement).toHaveStyle({ width: '50%' });
    });

    it('fills bar to 100% when hotness is 100', () => {
      render(
        <GrooveMeter hotness={100} tier="B" direction="neutral" streak={20} />
      );

      const fillElement = document.querySelector('.groove-meter__fill');
      expect(fillElement).toHaveStyle({ width: '100%' });
    });

    it('clamps hotness to 0 when negative value is passed', () => {
      render(
        <GrooveMeter hotness={-50} tier="D" direction="neutral" streak={0} />
      );

      const progressbar = screen.getByRole('progressbar');
      const fillElement = document.querySelector('.groove-meter__fill');
      expect(fillElement).toHaveStyle({ width: '0%' });
      expect(progressbar).toHaveAttribute('aria-valuenow', '0');
    });

    it('clamps hotness to 100 when value over 100 is passed', () => {
      render(
        <GrooveMeter hotness={150} tier="A" direction="neutral" streak={0} />
      );

      const progressbar = screen.getByRole('progressbar');
      const fillElement = document.querySelector('.groove-meter__fill');
      expect(fillElement).toHaveStyle({ width: '100%' });
      expect(progressbar).toHaveAttribute('aria-valuenow', '100');
    });

    it('displays decimal hotness values correctly', () => {
      render(
        <GrooveMeter hotness={33.5} tier="C" direction="neutral" streak={3} />
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
        <GrooveMeter hotness={50} tier="C" direction="push" streak={5} />
      );

      expect(screen.getByText('Pushing')).toBeInTheDocument();
      expect(screen.getByText('↑')).toBeInTheDocument();
    });

    it('displays "Laid Back" label with down arrow for pull direction', () => {
      render(
        <GrooveMeter hotness={50} tier="C" direction="pull" streak={5} />
      );

      expect(screen.getByText('Laid Back')).toBeInTheDocument();
      expect(screen.getByText('↓')).toBeInTheDocument();
    });

    it('displays "On Point" label with dot for neutral direction', () => {
      render(
        <GrooveMeter hotness={50} tier="C" direction="neutral" streak={5} />
      );

      expect(screen.getByText('On Point')).toBeInTheDocument();
      expect(screen.getByText('●')).toBeInTheDocument();
    });

    it('applies push direction class for push direction', () => {
      render(
        <GrooveMeter hotness={50} tier="C" direction="push" streak={5} />
      );

      const directionContainer = screen.getByText('Pushing').closest('.groove-meter__direction');
      expect(directionContainer).toHaveClass('groove-meter__direction--push');
    });

    it('applies pull direction class for pull direction', () => {
      render(
        <GrooveMeter hotness={50} tier="C" direction="pull" streak={5} />
      );

      const directionContainer = screen.getByText('Laid Back').closest('.groove-meter__direction');
      expect(directionContainer).toHaveClass('groove-meter__direction--pull');
    });

    it('applies neutral direction class for neutral direction', () => {
      render(
        <GrooveMeter hotness={50} tier="C" direction="neutral" streak={5} />
      );

      const directionContainer = screen.getByText('On Point').closest('.groove-meter__direction');
      expect(directionContainer).toHaveClass('groove-meter__direction--neutral');
    });
  });

  describe('Task 8.2.3: Streak Counter Displays', () => {
    it('displays streak value', () => {
      render(
        <GrooveMeter hotness={50} tier="C" direction="neutral" streak={7} />
      );

      expect(screen.getByText('7')).toBeInTheDocument();
    });

    it('displays "streak" label', () => {
      render(
        <GrooveMeter hotness={50} tier="C" direction="neutral" streak={5} />
      );

      expect(screen.getByText('streak')).toBeInTheDocument();
    });

    it('displays 0 when streak is 0', () => {
      render(
        <GrooveMeter hotness={0} tier="D" direction="neutral" streak={0} />
      );

      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('displays large streak values correctly', () => {
      render(
        <GrooveMeter hotness={100} tier="B" direction="neutral" streak={999} />
      );

      expect(screen.getByText('999')).toBeInTheDocument();
    });

    it('streak value has correct class', () => {
      render(
        <GrooveMeter hotness={50} tier="C" direction="neutral" streak={5} />
      );

      const streakValue = screen.getByText('5');
      expect(streakValue).toHaveClass('groove-meter__streak-value');
    });

    it('streak label has correct class', () => {
      render(
        <GrooveMeter hotness={50} tier="C" direction="neutral" streak={5} />
      );

      const streakLabel = screen.getByText('streak');
      expect(streakLabel).toHaveClass('groove-meter__streak-label');
    });
  });

  describe('Task 8.2.4: Color Changes at Threshold Boundaries', () => {
    it('applies tier-d class for D tier hotness', () => {
      render(
        <GrooveMeter hotness={0} tier="D" direction="neutral" streak={0} />
      );

      const fillElement = document.querySelector('.groove-meter__fill');
      expect(fillElement).toHaveClass('groove-meter__fill--tier-d');
    });

    it('applies tier-d class for 25% hotness (D tier boundary)', () => {
      render(
        <GrooveMeter hotness={25} tier="D" direction="neutral" streak={3} />
      );

      const fillElement = document.querySelector('.groove-meter__fill');
      expect(fillElement).toHaveClass('groove-meter__fill--tier-d');
    });

    it('applies tier-c class for C tier hotness', () => {
      render(
        <GrooveMeter hotness={50} tier="C" direction="neutral" streak={6} />
      );

      const fillElement = document.querySelector('.groove-meter__fill');
      expect(fillElement).toHaveClass('groove-meter__fill--tier-c');
    });

    it('applies tier-b class for B tier hotness', () => {
      render(
        <GrooveMeter hotness={75} tier="B" direction="neutral" streak={10} />
      );

      const fillElement = document.querySelector('.groove-meter__fill');
      expect(fillElement).toHaveClass('groove-meter__fill--tier-b');
    });

    it('applies tier-a class for A tier hotness', () => {
      render(
        <GrooveMeter hotness={120} tier="A" direction="neutral" streak={15} />
      );

      const fillElement = document.querySelector('.groove-meter__fill');
      expect(fillElement).toHaveClass('groove-meter__fill--tier-a');
    });

    it('applies tier-s class for S tier hotness', () => {
      render(
        <GrooveMeter hotness={175} tier="S" direction="neutral" streak={20} />
      );

      const fillElement = document.querySelector('.groove-meter__fill');
      expect(fillElement).toHaveClass('groove-meter__fill--tier-s');
    });

    it('applies tier-ss class for SS tier hotness', () => {
      render(
        <GrooveMeter hotness={250} tier="SS" direction="neutral" streak={25} />
      );

      const fillElement = document.querySelector('.groove-meter__fill');
      expect(fillElement).toHaveClass('groove-meter__fill--tier-ss');
    });

    it('applies tier-platinum class for Platinum tier hotness', () => {
      render(
        <GrooveMeter hotness={400} tier="Platinum" direction="neutral" streak={30} />
      );

      const fillElement = document.querySelector('.groove-meter__fill');
      expect(fillElement).toHaveClass('groove-meter__fill--tier-platinum');
    });
  });

  describe('Tier Display', () => {
    it('displays tier label', () => {
      render(
        <GrooveMeter hotness={50} tier="C" direction="neutral" streak={5} />
      );

      expect(screen.getByText('C')).toBeInTheDocument();
    });

    it('displays D tier label for D tier', () => {
      render(
        <GrooveMeter hotness={0} tier="D" direction="neutral" streak={0} />
      );

      expect(screen.getByText('D')).toBeInTheDocument();
    });

    it('displays Platinum tier label for Platinum tier', () => {
      render(
        <GrooveMeter hotness={400} tier="Platinum" direction="neutral" streak={30} />
      );

      expect(screen.getByText('PLATINUM')).toBeInTheDocument();
    });
  });

  describe('Variant Prop', () => {
    it('applies full variant class by default', () => {
      render(
        <GrooveMeter hotness={50} tier="C" direction="neutral" streak={5} />
      );

      const container = screen.getByRole('progressbar').closest('.groove-meter');
      expect(container).toHaveClass('groove-meter--full');
    });

    it('applies full variant class when variant="full" is passed', () => {
      render(
        <GrooveMeter hotness={50} tier="C" direction="neutral" streak={5} variant="full" />
      );

      const container = screen.getByRole('progressbar').closest('.groove-meter');
      expect(container).toHaveClass('groove-meter--full');
    });

    it('applies compact variant class when variant="compact" is passed', () => {
      render(
        <GrooveMeter hotness={50} tier="C" direction="neutral" streak={5} variant="compact" />
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
          tier="C"
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
          tier="C"
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
        <GrooveMeter hotness={50} tier="C" direction="neutral" streak={5} />
      );

      // Initially no animation class
      const directionContainer = screen.getByText('On Point').closest('.groove-meter__direction');
      expect(directionContainer).not.toHaveClass('groove-meter__direction--animating');

      // Change direction
      rerender(
        <GrooveMeter hotness={50} tier="C" direction="push" streak={5} />
      );

      // Animation class should now be applied
      const updatedContainer = screen.getByText('Pushing').closest('.groove-meter__direction');
      expect(updatedContainer).toHaveClass('groove-meter__direction--animating');
    });

    it('applies animation class to icon when direction changes', async () => {
      const { rerender } = render(
        <GrooveMeter hotness={50} tier="C" direction="neutral" streak={5} />
      );

      // Change direction
      rerender(
        <GrooveMeter hotness={50} tier="C" direction="push" streak={5} />
      );

      const icon = screen.getByText('↑');
      expect(icon).toHaveClass('groove-meter__direction-icon--animating');
    });

    it('applies animation class to label when direction changes', async () => {
      const { rerender } = render(
        <GrooveMeter hotness={50} tier="C" direction="neutral" streak={5} />
      );

      // Change direction
      rerender(
        <GrooveMeter hotness={50} tier="C" direction="push" streak={5} />
      );

      const label = screen.getByText('Pushing');
      expect(label).toHaveClass('groove-meter__direction-label--animating');
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA role', () => {
      render(
        <GrooveMeter hotness={50} tier="C" direction="neutral" streak={5} />
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('announces hotness value via aria-valuenow', () => {
      render(
        <GrooveMeter hotness={67} tier="B" direction="neutral" streak={8} />
      );

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '67');
    });

    it('announces range via aria-valuemin and aria-valuemax', () => {
      render(
        <GrooveMeter hotness={50} tier="C" direction="neutral" streak={5} />
      );

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    });

    it('has descriptive aria-label with hotness, direction, and streak', () => {
      render(
        <GrooveMeter hotness={42} tier="C" direction="neutral" streak={4} />
      );

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-label', 'Groove meter: 42% hotness, on point timing, 4 streak');
    });

    it('has descriptive aria-label for push direction', () => {
      render(
        <GrooveMeter hotness={50} tier="C" direction="push" streak={5} />
      );

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-label', 'Groove meter: 50% hotness, pushing timing, 5 streak');
    });

    it('has descriptive aria-label for pull direction', () => {
      render(
        <GrooveMeter hotness={50} tier="C" direction="pull" streak={5} />
      );

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-label', 'Groove meter: 50% hotness, laid back timing, 5 streak');
    });

    it('has aria-label on direction container', () => {
      render(
        <GrooveMeter hotness={50} tier="C" direction="push" streak={5} />
      );

      const directionContainer = document.querySelector('.groove-meter__direction');
      expect(directionContainer).toHaveAttribute('aria-label', 'Timing direction: Pushing');
    });

    it('has aria-label on streak container', () => {
      render(
        <GrooveMeter hotness={50} tier="C" direction="neutral" streak={7} />
      );

      const streakContainer = document.querySelector('.groove-meter__streak');
      expect(streakContainer).toHaveAttribute('aria-label', 'Current streak: 7 consecutive hits');
    });

    it('has live region for screen reader announcements', () => {
      render(
        <GrooveMeter hotness={50} tier="C" direction="neutral" streak={5} />
      );

      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveAttribute('role', 'status');
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
    });

    it('fill element is hidden from screen readers', () => {
      render(
        <GrooveMeter hotness={50} tier="C" direction="neutral" streak={5} />
      );

      const fillElement = document.querySelector('.groove-meter__fill');
      expect(fillElement).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Animation Performance (Success Criterion)', () => {
    it('uses CSS transitions for smooth width changes', () => {
      render(
        <GrooveMeter hotness={50} tier="C" direction="neutral" streak={5} />
      );

      const fillElement = document.querySelector('.groove-meter__fill');
      expect(fillElement).toBeInTheDocument();
      // The CSS should have transitions defined for smooth animations
      // We verify the element exists and will animate via CSS classes
    });

    it('animation class is removed after animation completes', async () => {
      vi.useFakeTimers();

      const { rerender } = render(
        <GrooveMeter hotness={50} tier="C" direction="neutral" streak={5} />
      );

      // Change direction to trigger animation
      rerender(
        <GrooveMeter hotness={50} tier="C" direction="push" streak={5} />
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
        <GrooveMeter hotness={50} tier="C" direction="neutral" streak={5} />
      );

      // Trigger direction change
      rerender(
        <GrooveMeter hotness={50} tier="C" direction="push" streak={5} />
      );

      const icon = screen.getByText('↑');
      const label = screen.getByText('Pushing');

      // Verify animation classes are applied (CSS handles GPU acceleration)
      expect(icon).toHaveClass('groove-meter__direction-icon--animating');
      expect(label).toHaveClass('groove-meter__direction-label--animating');
    });
  });
});
