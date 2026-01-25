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

import { forwardRef, type HTMLAttributes, type MouseEvent, useState, useCallback, useEffect } from 'react';
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
    container: 'track-card-compact',
    image: 'track-card-art-compact',
    trackNumber: 'track-number-compact',
    title: 'track-title-compact',
    meta: 'track-meta-compact',
    playButton: 'play-button-compact',
    playIcon: 'play-icon-compact',
  },
  default: {
    container: 'track-card-default',
    image: 'track-card-art-default',
    trackNumber: 'track-number-default',
    title: 'track-title-default',
    meta: 'track-meta-default',
    playButton: 'play-button-default',
    playIcon: 'play-icon-default',
  },
  large: {
    container: 'track-card-large',
    image: 'track-card-art-large',
    trackNumber: 'track-number-large',
    title: 'track-title-large',
    meta: 'track-meta-large',
    playButton: 'play-button-large',
    playIcon: 'play-icon-large',
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
    const [shouldAnimateSelection, setShouldAnimateSelection] = useState(false);

    const styles = sizeStyles[size];

    // Trigger selection animation when isSelected changes to true
    useEffect(() => {
      if (isSelected) {
        setShouldAnimateSelection(true);
        // Reset animation flag after animation completes
        const timer = setTimeout(() => {
          setShouldAnimateSelection(false);
        }, 600); // Match --duration-slower
        return () => clearTimeout(timer);
      }
    }, [isSelected]);

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
          'track-card',
          styles.container,
          // Selection state
          isSelected && 'track-card-selected',
          // Selection ring animation (only when actively animating)
          shouldAnimateSelection && 'selection-ring',
          // Additional className
          className
        )}
        {...props}
      >
        {/* Track number (left side) */}
        {index !== undefined && (
          <div className={cn('track-number', styles.trackNumber)}>
            {index}
          </div>
        )}

        {/* Album art */}
        <div className={cn('track-card-art', styles.image)}>
          {isLoading && !imageLoaded ? (
            <div className="track-art-shimmer" />
          ) : hasImage ? (
            <>
              {!imageLoaded && <div className="track-art-shimmer" />}
              <img
                src={track.image_url}
                alt={`${track.title} album art`}
                className="track-art-image"
                onLoad={handleImageLoad}
                onError={handleImageError}
                loading="lazy"
              />
            </>
          ) : (
            /* Fallback: gradient background with music icon */
            <div className="track-art-fallback">
              <Music className="track-art-icon" />
            </div>
          )}

          {/* Play button overlay on hover - with smooth fade in/out animation */}
          {hasImage && onPlay && (
            <div className={cn('track-art-overlay', isHovered && 'track-art-overlay-visible')}>
              <button
                onClick={handlePlayClick}
                className={cn('track-art-overlay-button', styles.playButton)}
                aria-label={`Play ${track.title}`}
              >
                <Play className={cn('track-play-icon', styles.playIcon)} fill="currentColor" />
              </button>
            </div>
          )}
        </div>

        {/* Track info */}
        <div className="track-info">
          {/* Title */}
          <p className={cn('track-title', styles.title, isSelected && 'track-title-selected')}>
            {track.title}
          </p>

          {/* Artist */}
          <p className={cn('track-meta', styles.meta)}>
            {track.artist}
          </p>

          {/* Album (if available) */}
          {track.album && size !== 'compact' && (
            <p className={cn('track-meta track-meta-album', styles.meta)}>
              {track.album}
            </p>
          )}

          {/* Duration */}
          {track.duration > 0 && (
            <p className={cn('track-meta track-meta-duration', styles.meta)}>
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
