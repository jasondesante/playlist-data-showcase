/**
 * ArweaveImage Component
 *
 * An image component that handles Arweave URL resolution with gateway fallback.
 * When an Arweave URL fails to load, it automatically tries alternate gateways.
 *
 * Features:
 * - Automatic Arweave URL detection and resolution
 * - Gateway fallback when primary gateway fails
 * - Shimmer loading state during URL resolution
 * - Fallback UI (Music icon with gradient) for loading/error states
 * - Pass-through for non-Arweave URLs
 *
 * @see docs/plans/arweave-gateway-fallback-implementation.md - Phase 5
 */

import { useState, useEffect, useCallback, type ImgHTMLAttributes, type ReactNode } from 'react';
import { Music } from 'lucide-react';
import { arweaveGatewayManager, isArweaveUrl } from 'playlist-data-engine';
import { logger } from '../../utils/logger';
import './ArweaveImage.css';

/**
 * Props for ArweaveImage component
 */
export interface ArweaveImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  /** The image URL (can be Arweave or regular URL) */
  src: string;
  /** Fallback content to show during loading or on error */
  fallback?: ReactNode;
  /** Whether to show shimmer loading state */
  showShimmer?: boolean;
  /** Whether to skip Arweave resolution (use original URL as-is) */
  skipResolution?: boolean;
  /** Callback when image URL is resolved */
  onResolved?: (resolvedUrl: string) => void;
  /** Callback when all gateways fail */
  onResolveError?: (error: Error) => void;
}

/**
 * Default fallback component - Music icon with gradient background
 * Matches the TrackCard fallback style
 */
function DefaultFallback({ size }: { size?: number }) {
  return (
    <div className="arweave-image-fallback">
      <Music
        className="arweave-image-fallback-icon"
        style={size ? { width: size * 0.4, height: size * 0.4 } : undefined}
      />
    </div>
  );
}

/**
 * Shimmer loading placeholder
 */
function ShimmerLoader() {
  return <div className="arweave-image-shimmer" />;
}

/**
 * ArweaveImage Component
 *
 * Handles Arweave URL resolution with gateway fallback support.
 */
export function ArweaveImage({
  src,
  alt = '',
  fallback,
  showShimmer = true,
  skipResolution = false,
  onResolved,
  onResolveError,
  className = '',
  width,
  height,
  onError,
  onLoad,
  style,
  ...restProps
}: ArweaveImageProps) {
  // State for resolved URL and loading status
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<boolean>(false);
  const [imageLoadError, setImageLoadError] = useState<boolean>(false);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);

  // Determine if this is an Arweave URL
  const isArweave = isArweaveUrl(src);

  // Resolve Arweave URL on mount or when src changes
  useEffect(() => {
    // Reset state when src changes
    setResolveError(false);
    setImageLoadError(false);
    setImageLoaded(false);

    // Skip resolution for non-Arweave URLs or when explicitly skipped
    if (!isArweave || skipResolution) {
      setResolvedUrl(src);
      return;
    }

    // Resolve Arweave URL through gateway manager
    let isMounted = true;

    const resolveUrl = async () => {
      setIsResolving(true);

      try {
        const resolved = await arweaveGatewayManager.resolveUrl(src);

        if (!isMounted) return;

        setResolvedUrl(resolved);
        setIsResolving(false);

        // Log if we got a different URL (gateway fallback occurred)
        if (resolved !== src) {
          logger.debug('ArweaveGateway', 'URL resolved to alternate gateway', {
            original: src,
            resolved,
          });
        }

        onResolved?.(resolved);
      } catch (error) {
        if (!isMounted) return;

        logger.warn('ArweaveGateway', 'Failed to resolve Arweave URL', {
          url: src,
          error: error instanceof Error ? error.message : String(error),
        });

        setResolveError(true);
        setIsResolving(false);
        setResolvedUrl(src); // Fall back to original URL

        onResolveError?.(error instanceof Error ? error : new Error(String(error)));
      }
    };

    resolveUrl();

    return () => {
      isMounted = false;
    };
  }, [src, isArweave, skipResolution, onResolved, onResolveError]);

  // Handle image load success
  const handleLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      setImageLoaded(true);
      setImageLoadError(false);
      onLoad?.(e);
    },
    [onLoad]
  );

  // Handle image load error
  const handleError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      setImageLoadError(true);

      // Report gateway failure so the engine tries a different gateway next time
      if (isArweave && resolvedUrl) {
        arweaveGatewayManager.reportGatewayFailure(resolvedUrl).catch(() => {});
      }

      logger.warn('ArweaveGateway', 'Image failed to load', { src: resolvedUrl });
      onError?.(e);
    },
    [resolvedUrl, onError, isArweave]
  );

  // Determine what to render
  const showFallback = isResolving || resolveError || imageLoadError || !resolvedUrl;
  const showShimmerOverlay = showShimmer && isResolving;
  const showImage = resolvedUrl && !imageLoadError;

  // Calculate size for fallback
  const sizeValue = typeof width === 'number' ? width : undefined;

  // Use provided fallback or default
  const fallbackContent = fallback ?? <DefaultFallback size={sizeValue} />;

  return (
    <div
      className={`arweave-image-container ${className}`}
      style={{
        width: width ?? '100%',
        height: height ?? '100%',
        ...style,
      }}
    >
      {/* Loading shimmer overlay */}
      {showShimmerOverlay && <ShimmerLoader />}

      {/* Fallback content (loading state or error state) */}
      {showFallback && !showImage && fallbackContent}

      {/* Actual image */}
      {showImage && (
        <>
          {/* Show shimmer until image loads */}
          {!imageLoaded && showShimmer && <ShimmerLoader />}

          <img
            {...restProps}
            src={resolvedUrl}
            alt={alt}
            width={width}
            height={height}
            onLoad={handleLoad}
            onError={handleError}
            className={`arweave-image ${!imageLoaded ? 'arweave-image-loading' : ''}`}
          />
        </>
      )}
    </div>
  );
}

export default ArweaveImage;
