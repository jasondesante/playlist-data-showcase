import { useEffect, useRef, useCallback } from 'react';
import type { AudioProfile } from '../../types';
import './RadarChart.css';

/**
 * Data point for the radar chart
 */
interface RadarDataPoint {
  bass: number;
  mid: number;
  treble: number;
  energy: number;
}

/**
 * Props for the RadarChart component
 */
interface RadarChartProps {
  /** Audio profile data to display */
  data: AudioProfile | RadarDataPoint | null;
  /** Size of the chart in pixels */
  size?: number;
  /** Whether to show animation when data changes */
  animated?: boolean;
  /** Animation duration in milliseconds */
  animationDuration?: number;
  /** Optional className for custom styling */
  className?: string;
}

/**
 * Axis configuration for the radar chart
 */
interface AxisConfig {
  label: string;
  color: string;
  key: keyof RadarDataPoint;
}

const AXES: AxisConfig[] = [
  { label: 'Bass', color: 'hsl(221, 83%, 53%)', key: 'bass' },
  { label: 'Mid', color: 'hsl(142, 76%, 50%)', key: 'mid' },
  { label: 'Treble', color: 'hsl(24, 95%, 53%)', key: 'treble' },
  { label: 'Energy', color: 'hsl(280, 75%, 60%)', key: 'energy' },
];

const NUM_AXES = AXES.length;
const TWO_PI = Math.PI * 2;
const HALF_PI = Math.PI / 2;

/**
 * Extract radar data from AudioProfile or use raw RadarDataPoint
 */
function extractData(data: AudioProfile | RadarDataPoint | null): RadarDataPoint | null {
  if (!data) return null;

  // Check if it's an AudioProfile with the expected fields
  if ('bass_dominance' in data) {
    return {
      bass: data.bass_dominance ?? 0,
      mid: data.mid_dominance ?? 0,
      treble: data.treble_dominance ?? 0,
      energy: data.rms_energy ?? data.average_amplitude ?? 0,
    };
  }

  // It's already a RadarDataPoint
  return data;
}

/**
 * Linear interpolation between two values
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Ease out cubic for smooth animations
 */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * RadarChart Component
 *
 * Renders a Canvas-based radar/spider chart for audio analysis visualization.
 * Displays 4 axes: Bass, Mid, Treble, and Energy.
 *
 * Features:
 * - Background grid circles and axis lines
 * - Data polygon with gradient fill
 * - Colored data points at each axis
 * - Smooth morphing animation between data points
 * - Empty state handling
 *
 * @example
 * ```tsx
 * <RadarChart
 *   data={audioProfile}
 *   size={200}
 *   animated={true}
 * />
 * ```
 */
export function RadarChart({
  data,
  size = 200,
  animated = true,
  animationDuration = 500,
  className,
}: RadarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const currentDataRef = useRef<RadarDataPoint>({ bass: 0, mid: 0, treble: 0, energy: 0 });
  const targetDataRef = useRef<RadarDataPoint | null>(null);
  const animationStartRef = useRef<number>(0);

  /**
   * Calculate point position for a given axis and value
   */
  const getPointPosition = useCallback(
    (centerX: number, centerY: number, radius: number, axisIndex: number, value: number) => {
      // Start from top (negative Y) and go clockwise
      const angle = (TWO_PI / NUM_AXES) * axisIndex - HALF_PI;
      const x = centerX + Math.cos(angle) * radius * value;
      const y = centerY + Math.sin(angle) * radius * value;
      return { x, y, angle };
    },
    []
  );

  /**
   * Draw the radar chart
   */
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, dataPoint: RadarDataPoint | null, width: number, height: number) => {
      const centerX = width / 2;
      const centerY = height / 2;
      const maxRadius = Math.min(width, height) / 2 - 30; // Padding for labels

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Draw background grid
      drawGrid(ctx, centerX, centerY, maxRadius);

      // Draw axes
      drawAxes(ctx, centerX, centerY, maxRadius);

      if (dataPoint) {
        // Draw data polygon
        drawDataPolygon(ctx, centerX, centerY, maxRadius, dataPoint);

        // Draw data points
        drawDataPoints(ctx, centerX, centerY, maxRadius, dataPoint);
      }

      // Draw labels (always visible)
      drawLabels(ctx, centerX, centerY, maxRadius);
    },
    []
  );

  /**
   * Draw the background grid circles
   */
  const drawGrid = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number) => {
    const levels = 4;

    // Use hardcoded color since Canvas API doesn't support CSS variables
    ctx.strokeStyle = 'hsla(220, 10%, 40%, 0.3)'; // Border color approximation
    ctx.lineWidth = 1;

    for (let i = 1; i <= levels; i++) {
      const levelRadius = (radius / levels) * i;
      ctx.beginPath();

      // Draw polygon for each level
      for (let j = 0; j <= NUM_AXES; j++) {
        const { x, y } = getPointPosition(centerX, centerY, levelRadius, j % NUM_AXES, 1);
        if (j === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.closePath();
      ctx.stroke();
    }
  };

  /**
   * Draw the axis lines
   */
  const drawAxes = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number) => {
    // Use hardcoded color since Canvas API doesn't support CSS variables
    ctx.strokeStyle = 'hsla(220, 10%, 40%, 0.4)'; // Border color approximation
    ctx.lineWidth = 1;

    for (let i = 0; i < NUM_AXES; i++) {
      const { x, y } = getPointPosition(centerX, centerY, radius, i, 1);
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  /**
   * Draw the data polygon with gradient fill
   */
  const drawDataPolygon = (
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radius: number,
    dataPoint: RadarDataPoint
  ) => {
    // Create gradient - use hardcoded color since Canvas API doesn't support CSS variables
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, 'hsla(221, 83%, 53%, 0.4)'); // Primary blue with opacity
    gradient.addColorStop(1, 'hsla(221, 83%, 53%, 0.1)');

    // Draw filled polygon
    ctx.beginPath();
    for (let i = 0; i <= NUM_AXES; i++) {
      const axisIndex = i % NUM_AXES;
      const value = dataPoint[AXES[axisIndex].key];
      const { x, y } = getPointPosition(centerX, centerY, radius, axisIndex, value);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();

    // Fill with gradient
    ctx.fillStyle = gradient;
    ctx.fill();

    // Stroke outline - use hardcoded color since Canvas API doesn't support CSS variables
    ctx.strokeStyle = 'hsla(221, 83%, 53%, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  /**
   * Draw colored data points at each axis
   */
  const drawDataPoints = (
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radius: number,
    dataPoint: RadarDataPoint
  ) => {
    for (let i = 0; i < NUM_AXES; i++) {
      const value = dataPoint[AXES[i].key];
      const { x, y } = getPointPosition(centerX, centerY, radius, i, value);
      const axisColor = AXES[i].color;

      // Draw glow
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, TWO_PI);
      ctx.fillStyle = axisColor.replace(')', ' / 0.3)').replace('hsl', 'hsla');
      ctx.fill();

      // Draw point
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, TWO_PI);
      ctx.fillStyle = axisColor;
      ctx.fill();

      // Draw white center - use hardcoded color since Canvas API doesn't support CSS variables
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, TWO_PI);
      ctx.fillStyle = 'hsl(0, 0%, 8%)'; // Background dark approximation
      ctx.fill();
    }
  };

  /**
   * Draw axis labels
   */
  const drawLabels = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number) => {
    ctx.font = '600 11px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < NUM_AXES; i++) {
      const { x, y } = getPointPosition(centerX, centerY, radius + 18, i, 1);
      const axis = AXES[i];

      // Draw label background - use hardcoded color since Canvas API doesn't support CSS variables
      const metrics = ctx.measureText(axis.label);
      const padding = 4;
      ctx.fillStyle = 'hsla(220, 10%, 15%, 0.9)'; // Surface-2 approximation
      ctx.beginPath();
      ctx.roundRect(
        x - metrics.width / 2 - padding,
        y - 8 - padding / 2,
        metrics.width + padding * 2,
        16 + padding,
        4
      );
      ctx.fill();

      // Draw label text
      ctx.fillStyle = axis.color;
      ctx.fillText(axis.label, x, y);
    }
  };

  /**
   * Animation loop for morphing between data points
   */
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const now = performance.now();
    const elapsed = now - animationStartRef.current;
    const progress = Math.min(elapsed / animationDuration, 1);
    const easedProgress = easeOutCubic(progress);

    // Interpolate current values toward target
    if (targetDataRef.current) {
      currentDataRef.current = {
        bass: lerp(currentDataRef.current.bass, targetDataRef.current.bass, easedProgress),
        mid: lerp(currentDataRef.current.mid, targetDataRef.current.mid, easedProgress),
        treble: lerp(currentDataRef.current.treble, targetDataRef.current.treble, easedProgress),
        energy: lerp(currentDataRef.current.energy, targetDataRef.current.energy, easedProgress),
      };
    }

    // Draw the current state
    draw(ctx, currentDataRef.current, canvas.width, canvas.height);

    // Continue animation if not complete
    if (progress < 1) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      animationRef.current = null;
    }
  }, [animationDuration, draw]);

  /**
   * Start animation when data changes
   */
  useEffect(() => {
    const extractedData = extractData(data);
    targetDataRef.current = extractedData;

    if (animated && extractedData) {
      // Start animation
      animationStartRef.current = performance.now();

      if (animationRef.current === null) {
        animationRef.current = requestAnimationFrame(animate);
      }
    } else {
      // Immediate update (no animation)
      if (extractedData) {
        currentDataRef.current = extractedData;
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          draw(ctx, currentDataRef.current, canvas.width, canvas.height);
        }
      }
    }

    // Cleanup animation on unmount
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [data, animated, animate, draw]);

  /**
   * Initial draw and resize handling
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initial draw
    draw(ctx, currentDataRef.current, canvas.width, canvas.height);
  }, [size, draw]);

  // Render empty state if no data
  const isEmpty = !extractData(data);

  return (
    <div className={`radar-chart-container ${className || ''}`}>
      {isEmpty && (
        <div className="radar-chart-empty">
          <span className="radar-chart-empty-text">No data</span>
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="radar-chart-canvas"
        style={{ opacity: isEmpty ? 0.3 : 1 }}
      />
    </div>
  );
}

export default RadarChart;
