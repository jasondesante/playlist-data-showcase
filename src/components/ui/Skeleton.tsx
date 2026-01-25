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
  text: 'rounded-sm h-4',
  circular: 'rounded-full',
  rectangular: 'rounded-none',
  rounded: 'rounded-md',
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
      'shimmer',
      'bg-muted',
      'animate-pulse',
      variantStyles[variant],
      width,
      height,
      className
    );

    if (count > 1) {
      return (
        <div ref={ref} className="space-y-2" {...props}>
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
    const imageSize = size === 'compact' ? 'w-16 h-16' : size === 'large' ? 'w-24 h-24' : 'w-20 h-20';

    return (
      <div
        ref={ref}
        className={cn(
          'flex gap-4 p-4 border border-border rounded-lg bg-card',
          className
        )}
        {...props}
      >
        {/* Album art placeholder */}
        <Skeleton variant="rounded" width={imageSize} height={imageSize} />

        {/* Track info placeholder */}
        <div className="flex-1 space-y-2 py-1">
          <Skeleton variant="text" width="w-3/4" />
          <Skeleton variant="text" width="w-1/2" />
          <Skeleton variant="text" width="w-1/4" />
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
        className="p-6 rounded-lg bg-gradient-to-br from-primary/10 via-surface-2 to-accent/10 border border-border"
        {...props}
      >
        <div className="flex gap-6 items-center">
          {/* Large album art placeholder */}
          <Skeleton variant="rounded" width="w-48 h-48" />

          {/* Playlist info placeholder */}
          <div className="flex-1 space-y-4">
            <Skeleton variant="text" width="w-32 h-6" /> {/* Badge */}
            <Skeleton variant="text" width="w-2/3 h-10" /> {/* Title */}
            <Skeleton variant="text" width="w-1/2" /> {/* Description */}
            <Skeleton variant="text" width="w-1/3" /> {/* Stats */}
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
        className={cn('p-6 border border-border rounded-lg bg-card', className)}
        {...props}
      >
        {showHeader && (
          <div className="space-y-2 mb-4">
            <Skeleton variant="text" width="w-1/3" />
            <Skeleton variant="text" width="w-2/3" />
          </div>
        )}

        <div className="space-y-2">
          <Skeleton count={contentLines} />
        </div>

        {showFooter && (
          <div className="flex gap-3 mt-6 pt-4 border-t border-border">
            <Skeleton variant="rectangular" width="w-20 h-8" />
            <Skeleton variant="rectangular" width="w-20 h-8" />
          </div>
        )}
      </div>
    );
  }
);

CardSkeleton.displayName = 'CardSkeleton';

export default Skeleton;
