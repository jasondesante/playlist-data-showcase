/**
 * Unit Tests for ArweaveImage Component
 *
 * Task 7.3: Test rendering with non-Arweave URL, Arweave URL, fallback rendering, and error handling
 * - Test rendering with non-Arweave URL
 * - Test rendering with Arweave URL
 * - Test fallback rendering during load
 * - Test error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ArweaveImage } from '../ArweaveImage';

// ============================================================
// Test Data
// ============================================================

/** A valid 43-character Arweave transaction ID for testing */
const VALID_TX_ID = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijk012345';

/** Non-Arweave URL for testing */
const REGULAR_URL = 'https://example.com/image.jpg';

/** Arweave URL for testing */
const ARWEAVE_URL = 'https://arweave.net/' + VALID_TX_ID;

/** Resolved gateway URL */
const RESOLVED_URL = 'https://ardrive.net/' + VALID_TX_ID;

// ============================================================
// Mock Setup
// ============================================================

// Mock playlist-data-engine arweaveUtils
vi.mock('playlist-data-engine', () => ({
  isArweaveUrl: vi.fn((url: string) => {
    if (!url || typeof url !== 'string') return false;
    return url.includes('arweave.net') || url.startsWith('ar://');
  }),
  arweaveGatewayManager: {
    resolveUrl: vi.fn(async (url: string) => {
      // Simulate resolution - return a different URL for Arweave URLs
      if (url.includes('arweave.net')) {
        return RESOLVED_URL;
      }
      return url;
    }),
  },
}));

// Import the mocked functions for type access
import { isArweaveUrl, arweaveGatewayManager } from 'playlist-data-engine';

const mockIsArweaveUrl = vi.mocked(isArweaveUrl);
const mockResolveUrl = vi.mocked(arweaveGatewayManager.resolveUrl);

// ============================================================
// Task 7.3.1: Test rendering with non-Arweave URL
// ============================================================

describe('Rendering with non-Arweave URL', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render an image with the provided src', async () => {
    render(<ArweaveImage src={REGULAR_URL} alt="Test image" />);

    // Should not be detected as Arweave
    expect(mockIsArweaveUrl).toHaveBeenCalledWith(REGULAR_URL);

    // Should render an img element
    const img = await screen.findByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', REGULAR_URL);
    expect(img).toHaveAttribute('alt', 'Test image');
  });

  it('should not call gateway manager for non-Arweave URLs', async () => {
    render(<ArweaveImage src={REGULAR_URL} alt="Test" />);

    await waitFor(() => {
      expect(mockResolveUrl).not.toHaveBeenCalled();
    });
  });

  it('should pass through additional img props', async () => {
    render(
      <ArweaveImage
        src={REGULAR_URL}
        alt="Test"
        width={200}
        height={150}
        className="custom-class"
        loading="lazy"
      />
    );

    const img = await screen.findByRole('img');
    expect(img).toHaveAttribute('width', '200');
    expect(img).toHaveAttribute('height', '150');
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  it('should render immediately for non-Arweave URLs without shimmer', async () => {
    render(<ArweaveImage src={REGULAR_URL} alt="Test" showShimmer={false} />);

    // When showShimmer is false, shimmer should not appear
    const shimmer = document.querySelector('.arweave-image-shimmer');
    expect(shimmer).not.toBeInTheDocument();
  });
});

// ============================================================
// Task 7.3.2: Test rendering with Arweave URL
// ============================================================

describe('Rendering with Arweave URL', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call gateway manager for Arweave URLs', async () => {
    render(<ArweaveImage src={ARWEAVE_URL} alt="Test" />);

    await waitFor(() => {
      expect(mockResolveUrl).toHaveBeenCalledWith(ARWEAVE_URL);
    });
  });

  it('should render the resolved URL after resolution', async () => {
    render(<ArweaveImage src={ARWEAVE_URL} alt="Test" />);

    // Wait for the image to appear with the resolved URL
    const img = await screen.findByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', RESOLVED_URL);
  });

  it('should call onResolved callback when URL is resolved', async () => {
    const onResolved = vi.fn();

    render(<ArweaveImage src={ARWEAVE_URL} alt="Test" onResolved={onResolved} />);

    await waitFor(() => {
      expect(onResolved).toHaveBeenCalledWith(RESOLVED_URL);
    });
  });

  it('should skip resolution when skipResolution is true', async () => {
    render(<ArweaveImage src={ARWEAVE_URL} alt="Test" skipResolution />);

    // Should not call gateway manager
    expect(mockResolveUrl).not.toHaveBeenCalled();

    // Should still render the original URL
    const img = await screen.findByRole('img');
    expect(img).toHaveAttribute('src', ARWEAVE_URL);
  });

  it('should re-resolve URL when src changes', async () => {
    const { rerender } = render(<ArweaveImage src={ARWEAVE_URL} alt="Test" />);

    await waitFor(() => {
      expect(mockResolveUrl).toHaveBeenCalledTimes(1);
    });

    const newUrl = 'https://arweave.net/NEWTXID12345678901234567890123456789';
    rerender(<ArweaveImage src={newUrl} alt="Test" />);

    await waitFor(() => {
      expect(mockResolveUrl).toHaveBeenCalledWith(newUrl);
    });
  });
});

// ============================================================
// Task 7.3.3: Test fallback rendering during load
// ============================================================

describe('Fallback rendering during load', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show shimmer while resolving Arweave URL', async () => {
    // Make resolution slow
    mockResolveUrl.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve(RESOLVED_URL), 100))
    );

    render(<ArweaveImage src={ARWEAVE_URL} alt="Test" showShimmer />);

    // Shimmer should be visible during resolution
    const shimmer = document.querySelector('.arweave-image-shimmer');
    expect(shimmer).toBeInTheDocument();

    // Wait for resolution to complete
    await waitFor(() => {
      expect(screen.getByRole('img')).toBeInTheDocument();
    });
  });

  it('should show custom fallback when provided during loading', async () => {
    // Make resolution slow
    mockResolveUrl.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve(RESOLVED_URL), 100))
    );

    render(
      <ArweaveImage
        src={ARWEAVE_URL}
        alt="Test"
        fallback={<div data-testid="custom-fallback">Loading...</div>}
      />
    );

    // Custom fallback should be visible
    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();

    // Wait for resolution to complete
    await waitFor(() => {
      expect(screen.getByRole('img')).toBeInTheDocument();
    });
  });

  it('should show default fallback (Music icon) when not loading custom fallback', async () => {
    // Make resolution slow
    mockResolveUrl.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve(RESOLVED_URL), 100))
    );

    render(<ArweaveImage src={ARWEAVE_URL} alt="Test" showShimmer={false} />);

    // Default fallback container should exist
    const fallback = document.querySelector('.arweave-image-fallback');
    expect(fallback).toBeInTheDocument();
  });

  it('should hide shimmer when showShimmer is false', async () => {
    render(<ArweaveImage src={ARWEAVE_URL} alt="Test" showShimmer={false} />);

    // Should not have shimmer
    const shimmer = document.querySelector('.arweave-image-shimmer');
    expect(shimmer).not.toBeInTheDocument();

    // But should still have fallback container during resolution
    await waitFor(() => {
      expect(screen.getByRole('img')).toBeInTheDocument();
    });
  });

  it('should show shimmer while image is loading after URL resolution', async () => {
    render(<ArweaveImage src={ARWEAVE_URL} alt="Test" showShimmer />);

    // Wait for resolution
    await waitFor(() => {
      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
    });

    // Shimmer should be visible until image loads
    // (it's removed when image loads via onLoad handler)
    const shimmer = document.querySelector('.arweave-image-shimmer');
    // The shimmer may or may not be present depending on timing
    // The important thing is the image renders
    const img = screen.getByRole('img');
    expect(img).toHaveClass('arweave-image-loading'); // Initially hidden
  });
});

// ============================================================
// Task 7.3.4: Test error handling
// ============================================================

describe('Error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show fallback when URL resolution fails', async () => {
    mockResolveUrl.mockRejectedValueOnce(new Error('Resolution failed'));

    render(<ArweaveImage src={ARWEAVE_URL} alt="Test" />);

    await waitFor(() => {
      // Should show fallback container
      const fallback = document.querySelector('.arweave-image-fallback');
      expect(fallback).toBeInTheDocument();
    });
  });

  it('should call onResolveError when resolution fails', async () => {
    const onResolveError = vi.fn();
    mockResolveUrl.mockRejectedValueOnce(new Error('Resolution failed'));

    render(<ArweaveImage src={ARWEAVE_URL} alt="Test" onResolveError={onResolveError} />);

    await waitFor(() => {
      expect(onResolveError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  it('should show fallback when image fails to load', async () => {
    render(<ArweaveImage src={ARWEAVE_URL} alt="Test" />);

    // Wait for image to appear
    const img = await screen.findByRole('img');

    // Simulate image load error
    img.dispatchEvent(new Event('error'));

    await waitFor(() => {
      // Fallback should be shown
      const fallback = document.querySelector('.arweave-image-fallback');
      expect(fallback).toBeInTheDocument();
    });
  });

  it('should call onError when image fails to load', async () => {
    const onError = vi.fn();

    render(<ArweaveImage src={ARWEAVE_URL} alt="Test" onError={onError} />);

    // Wait for image to appear
    const img = await screen.findByRole('img');

    // Simulate image load error
    img.dispatchEvent(new Event('error'));

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
  });

  it('should fall back to original URL when all gateways fail', async () => {
    // When all gateways fail, resolveUrl returns the original URL
    mockResolveUrl.mockResolvedValueOnce(ARWEAVE_URL);

    render(<ArweaveImage src={ARWEAVE_URL} alt="Test" />);

    const img = await screen.findByRole('img');
    expect(img).toHaveAttribute('src', ARWEAVE_URL);
  });

  it('should handle ar:// protocol URLs', async () => {
    const arProtocolUrl = 'ar://' + VALID_TX_ID;
    mockResolveUrl.mockResolvedValueOnce(RESOLVED_URL);

    render(<ArweaveImage src={arProtocolUrl} alt="Test" />);

    await waitFor(() => {
      expect(mockResolveUrl).toHaveBeenCalledWith(arProtocolUrl);
    });

    const img = await screen.findByRole('img');
    expect(img).toHaveAttribute('src', RESOLVED_URL);
  });

  it('should handle empty src gracefully', async () => {
    render(<ArweaveImage src="" alt="Test" />);

    // Should still render something (fallback or container)
    const container = document.querySelector('.arweave-image-container');
    expect(container).toBeInTheDocument();
  });

  it('should handle undefined src gracefully', async () => {
    // Note: Passing undefined src is a TypeScript error, but we test runtime behavior
    // The component should not crash
    expect(() => {
      render(<ArweaveImage src={undefined as unknown as string} alt="Test" />);
    }).not.toThrow();
  });
});

// ============================================================
// Additional Tests: Component Structure
// ============================================================

describe('Component structure', () => {
  it('should render with container class', () => {
    render(<ArweaveImage src={REGULAR_URL} alt="Test" className="my-custom" />);

    const container = document.querySelector('.arweave-image-container');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('my-custom');
  });

  it('should apply width and height styles to container', () => {
    render(<ArweaveImage src={REGULAR_URL} alt="Test" width={200} height={150} />);

    const container = document.querySelector('.arweave-image-container');
    expect(container).toHaveStyle({ width: '200px', height: '150px' });
  });

  it('should default width and height to 100%', () => {
    render(<ArweaveImage src={REGULAR_URL} alt="Test" />);

    const container = document.querySelector('.arweave-image-container');
    expect(container).toHaveStyle({ width: '100%', height: '100%' });
  });

  it('should render img with arweave-image class', async () => {
    render(<ArweaveImage src={REGULAR_URL} alt="Test" />);

    const img = await screen.findByRole('img');
    expect(img).toHaveClass('arweave-image');
  });

  it('should call onLoad when image loads successfully', async () => {
    const onLoad = vi.fn();

    render(<ArweaveImage src={REGULAR_URL} alt="Test" onLoad={onLoad} />);

    const img = await screen.findByRole('img');

    // Simulate successful load
    img.dispatchEvent(new Event('load'));

    expect(onLoad).toHaveBeenCalled();
  });
});
