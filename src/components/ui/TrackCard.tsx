/**
 * TrackCard Component
 *
 * Spotify-style track card component with large album art and full animation suite.
 * Part of UI/UX Improvement Plan - Sprint 2: Track Card Component.
 *
 * Features:
 * - Large album art (64px on mobile, 80px on desktop)
 * - Track number display
 * - Play button overlay on hover
 * - Selection state with animated ring
 * - Hover scale and brightness effects
 * - Gradient + icon fallback for missing artwork
 * - Shimmer loading state during image load
 * - Left accent bar for selected state
 * - Responsive size variants
 */

import { forwardRef, type HTMLAttributes, type MouseEvent, useState, useCallback } from 'react';
import { cn } from '../../utils/cn';
import type { PlaylistTrack } from 'playlist-data-engine';
import { Music, Play } from 'lucide-react';

export type TrackCardSize = 'compact' | 'default' | 'large';

export interface TrackCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onPlay'> {
  /** The track data to display */
  track: PlaylistTrack;
  /** Whether this track is currently selected */
  isSelected?: boolean;
  /** Callback when the card is clicked */
  onClick?: () => void;
  /** Callback when the play button is clicked (separate from card click) */
  onPlay?: (e: MouseEvent<HTMLButtonElement>) => void;
  /** Track number for display */
  index?: number;
  /** Size variant of the card */
  size?: TrackCardSize;
  /** Whether the image is currently loading */
  isLoading?: boolean;
}

/**
 * Format duration in seconds to MM:SS format
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

const sizeStyles = {
  compact: {
    container: 'p-2 gap-2',
    image: 'w-12 h-12',
    trackNumber: 'text-sm w-6',
    title: 'text-sm',
    meta: 'text-xs',
    playButton: 'w-6 h-6',
    playIcon: 'w-3 h-3',
  },
  default: {
    container: 'p-3 gap-3',
    image: 'w-14 h-14',
    trackNumber: 'text-base w-8',
    title: 'text-base',
    meta: 'text-xs',
    playButton: 'w-8 h-8',
    playIcon: 'w-3.5 h-3.5',
  },
  large: {
    container: 'p-4 gap-4',
    image: 'w-16 h-16',
    trackNumber: 'text-lg w-10',
    title: 'text-lg',
    meta: 'text-sm',
    playButton: 'w-10 h-10',
    playIcon: 'w-4 h-4',
  },
};

export const TrackCard = forwardRef<HTMLDivElement, TrackCardProps>(
  (
    {
      track,
      isSelected = false,
      onClick,
      onPlay,
      index,
      size = 'default',
      isLoading = false,
      className,
      ...props
    },
    ref
  ) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const styles = sizeStyles[size];

    const handleImageLoad = useCallback(() => {
      setImageLoaded(true);
    }, []);

    const handleImageError = useCallback(() => {
      setImageError(true);
      setImageLoaded(true);
    }, []);

    const handlePlayClick = useCallback(
      (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        onPlay?.(e);
      },
      [onPlay]
    );

    const hasImage = !imageError && track.image_url;

    return (
      <div
        ref={ref}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          // Base layout
          'relative flex items-center rounded-lg border transition-all duration-[var(--duration-normal)] ease-[var(--ease-out-cubic)] cursor-pointer',
          // Selection states
          isSelected
            ? [
                'bg-primary/20 border-2 border-primary shadow-lg shadow-primary/20 selection-ring',
                // Left accent bar for selected state
                'before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:bottom-4 before:w-1 before:bg-primary before:rounded-r-full',
              ]
            : 'bg-card border-border hover:bg-surface-3 hover:shadow-md hover:border-primary/50',
          // Hover scale effect
          'hover:scale-[1.01] active:scale-[0.99]',
          // Spring animation on mount
          'spring-in',
          styles.container,
          className
        )}
        {...props}
      >
        {/* Track number (left side) */}
        {index !== undefined && (
          <div className={cn(
            'flex-shrink-0 text-center font-medium text-muted-foreground tabular-nums',
            styles.trackNumber
          )}>
            {isHovered && onPlay ? (
              <button
                onClick={handlePlayClick}
                className={cn(
                  'flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors',
                  styles.playButton
                )}
                aria-label={`Play ${track.title}`}
              >
                <Play className={styles.playIcon} fill="currentColor" />
              </button>
            ) : (
              index
            )}
          </div>
        )}

        {/* Album art */}
        <div
          className={cn(
            'relative flex-shrink-0 rounded-md overflow-hidden bg-muted',
            styles.image
          )}
        >
          {isLoading && !imageLoaded ? (
            <div className="absolute inset-0 shimmer" />
          ) : hasImage ? (
            <>
              {!imageLoaded && <div className="absolute inset-0 shimmer" />}
              <img
                src={track.image_url}
                alt={`${track.title} album art`}
                className={cn(
                  'w-full h-full object-cover transition-transform duration-[var(--duration-slow)]',
                  isHovered && 'scale-105'
                )}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            </>
          ) : (
            /* Fallback: gradient background with music icon */
            <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent flex items-center justify-center">
              <Music className="w-1/2 h-1/2 text-primary/50" />
            </div>
          )}

          {/* Play button overlay on hover */}
          {hasImage && isHovered && onPlay && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-[var(--duration-fast)]">
              <button
                onClick={handlePlayClick}
                className={cn(
                  'flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-110 transition-all shadow-lg',
                  styles.playButton
                )}
                aria-label={`Play ${track.title}`}
              >
                <Play className={styles.playIcon} fill="currentColor" />
              </button>
            </div>
          )}
        </div>

        {/* Track info */}
        <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
          {/* Title */}
          <p
            className={cn(
              'font-semibold text-foreground truncate',
              isSelected && 'text-primary',
              styles.title
            )}
          >
            {track.title}
          </p>

          {/* Artist */}
          <p className={cn('text-muted-foreground truncate', styles.meta)}>
            {track.artist}
          </p>

          {/* Album (if available) */}
          {track.album && size !== 'compact' && (
            <p className={cn('text-muted-foreground/70 truncate', styles.meta)}>
              {track.album}
            </p>
          )}

          {/* Duration */}
          {track.duration > 0 && (
            <p className={cn('text-muted-foreground/50 tabular-nums', styles.meta)}>
              {formatDuration(track.duration)}
            </p>
          )}
        </div>
      </div>
    );
  }
);

TrackCard.displayName = 'TrackCard';

export default TrackCard;
