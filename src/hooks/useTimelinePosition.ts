/**
 * useTimelinePosition Hook
 *
 * Provides position calculation utilities for timeline components.
 * This hook handles:
 * - Converting timestamps to screen positions
 * - Filtering visible items within the timeline window
 * - Calculating if items are past/present/future
 *
 * Part of Task 9.2: Create shared timeline utilities
 *
 * @example
 * ```tsx
 * const { calculatePosition, getVisibleItems } = useTimelinePosition({
 *   smoothTime,
 *   anticipationWindow: 2.0,
 *   pastWindow: 4.0,
 * });
 *
 * const position = calculatePosition(beat.timestamp); // 0-1
 * const visibleBeats = getVisibleItems(beats, (beat) => beat.timestamp);
 * ```
 */

import { useCallback } from 'react';

export interface UseTimelinePositionOptions {
  /** Current interpolated time for display */
  smoothTime: number;
  /** Anticipation window in seconds (how far into the future to show) */
  anticipationWindow: number;
  /** Past window in seconds (how far into the past to show) */
  pastWindow?: number;
}

export interface TimelineItemPosition<T> {
  /** The original item */
  item: T;
  /** Position on timeline (0 = left edge, 0.5 = center/now, 1 = right edge) */
  position: number;
  /** Whether the item has passed the "now" line */
  isPast: boolean;
  /** Whether the item is upcoming (in the future) */
  isUpcoming: boolean;
  /** Timestamp of the item (for reference) */
  timestamp: number;
}

export interface UseTimelinePositionResult {
  /** Calculate position on timeline (0-1) for a given timestamp */
  calculatePosition: (timestamp: number) => number;
  /** Get items visible in the current window with their positions */
  getVisibleItems: <T>(
    items: T[],
    getTimestamp: (item: T) => number
  ) => TimelineItemPosition<T>[];
  /** Get the minimum time visible in the window */
  minVisibleTime: number;
  /** Get the maximum time visible in the window */
  maxVisibleTime: number;
}

/** Tolerance in seconds for determining if an item is "at" the now line */
const NOW_TOLERANCE = 0.05; // 50ms

/**
 * Hook for timeline position calculations.
 * Provides utilities for converting timestamps to positions and filtering visible items.
 */
export function useTimelinePosition({
  smoothTime,
  anticipationWindow,
  pastWindow = anticipationWindow,
}: UseTimelinePositionOptions): UseTimelinePositionResult {
  /**
   * Calculate item position on the timeline.
   * Uses consistent scaling (anticipationWindow) for both past and future items
   * to maintain consistent visual speed across the timeline.
   *
   * Position 0 = left edge (smoothTime - anticipationWindow)
   * Position 0.5 = center/now line (smoothTime)
   * Position 1 = right edge (smoothTime + anticipationWindow)
   *
   * Note: pastWindow only affects visibility filtering, not position calculation,
   * so items maintain consistent speed as they scroll past center.
   */
  const calculatePosition = useCallback(
    (timestamp: number): number => {
      const timeUntilItem = timestamp - smoothTime;
      // Use the anticipation window scale for both sides to maintain consistent speed
      const position = 0.5 + (timeUntilItem / anticipationWindow) * 0.5;
      return position;
    },
    [smoothTime, anticipationWindow]
  );

  /**
   * Get the visible time range.
   */
  const minVisibleTime = smoothTime - pastWindow;
  const maxVisibleTime = smoothTime + anticipationWindow;

  /**
   * Get items visible in the current window with their positions.
   * Filters items to those within the visible time range and calculates their positions.
   */
  const getVisibleItems = useCallback(
    <T,>(items: T[], getTimestamp: (item: T) => number): TimelineItemPosition<T>[] => {
      const minTime = smoothTime - pastWindow;
      const maxTime = smoothTime + anticipationWindow;

      return items
        .filter((item) => {
          const timestamp = getTimestamp(item);
          return timestamp >= minTime && timestamp <= maxTime;
        })
        .map((item) => {
          const timestamp = getTimestamp(item);
          const position = calculatePosition(timestamp);
          const isPast = timestamp < smoothTime - NOW_TOLERANCE;
          const isUpcoming = timestamp > smoothTime + NOW_TOLERANCE;
          return { item, position, isPast, isUpcoming, timestamp };
        })
        .filter((result) => result.position >= 0 && result.position <= 1);
    },
    [smoothTime, pastWindow, anticipationWindow, calculatePosition]
  );

  return {
    calculatePosition,
    getVisibleItems,
    minVisibleTime,
    maxVisibleTime,
  };
}

export default useTimelinePosition;
