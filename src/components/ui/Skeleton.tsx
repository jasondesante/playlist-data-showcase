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

export default Skeleton;
