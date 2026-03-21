/**
 * ZoomControls Component
 *
 * A standalone zoom control component that can be embedded in timeline sections.
 * Provides zoom in/out buttons with a zoom level display.
 */

import { useCallback } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from './Button';
import './ZoomControls.css';

// ============================================================
// Types
// ============================================================

export interface ZoomControlsProps {
    /** Current zoom level */
    zoomLevel: number;
    /** Minimum zoom level */
    minZoom?: number;
    /** Maximum zoom level */
    maxZoom?: number;
    /** Callback when zoom level changes */
    onZoomChange: (level: number) => void;
    /** Whether to show the zoom level label */
    showLabel?: boolean;
    /** Size variant */
    size?: 'sm' | 'md';
    /** Additional CSS class names */
    className?: string;
}

// ============================================================
// Main Component
// ============================================================

/**
 * ZoomControls
 *
 * Standalone zoom controls for timeline visualizations.
 */
export function ZoomControls({
    zoomLevel,
    minZoom = 0.5,
    maxZoom = 4,
    onZoomChange,
    showLabel = true,
    size = 'sm',
    className,
}: ZoomControlsProps) {
    // Handle zoom in
    const handleZoomIn = useCallback(() => {
        const newLevel = Math.min(maxZoom, zoomLevel * 1.5);
        onZoomChange(newLevel);
    }, [onZoomChange, zoomLevel, maxZoom]);

    // Handle zoom out
    const handleZoomOut = useCallback(() => {
        const newLevel = Math.max(minZoom, zoomLevel / 1.5);
        onZoomChange(newLevel);
    }, [onZoomChange, zoomLevel, minZoom]);

    // Handle reset to 1.0x
    const handleReset = useCallback(() => {
        onZoomChange(1);
    }, [onZoomChange]);

    return (
        <div className={`zoom-controls zoom-controls--${size} ${className || ''}`}>
            <Button
                variant="ghost"
                size={size}
                onClick={handleZoomOut}
                disabled={zoomLevel <= minZoom}
                aria-label="Zoom out"
                className="zoom-controls-btn"
            >
                <ZoomOut size={size === 'sm' ? 14 : 16} />
            </Button>
            {showLabel && (
                <button
                    className="zoom-controls-level"
                    onClick={handleReset}
                    disabled={zoomLevel === 1}
                    title="Reset to 1.0x"
                    aria-label="Reset zoom to 1.0x"
                >
                    {zoomLevel.toFixed(1)}x
                </button>
            )}
            <Button
                variant="ghost"
                size={size}
                onClick={handleZoomIn}
                disabled={zoomLevel >= maxZoom}
                aria-label="Zoom in"
                className="zoom-controls-btn"
            >
                <ZoomIn size={size === 'sm' ? 14 : 16} />
            </Button>
        </div>
    );
}

export default ZoomControls;
