/**
 * XP Curve Chart Component
 *
 * SVG-based line chart that visualizes XP progression curves for uncapped mode.
 * Shows XP requirements for levels 1-30 with different presets highlighted.
 *
 * Features:
 * - Pure SVG implementation (no external charting libraries)
 * - Multiple preset lines with distinct colors
 * - Hover tooltips showing exact XP values
 * - Highlighted selected preset line
 * - Responsive sizing
 * - Dark theme styling
 * - Keyboard accessible with focus states
 */

import { useState, useMemo, useCallback } from 'react';
import type { XPFormulaPreset } from '../../types';
import '../../styles/components/XPCurveChart.css';

export interface XPCurveChartProps {
  /** All available XP formula presets */
  presets: XPFormulaPreset[];
  /** ID of the currently selected preset */
  selectedId: string;
  /** Maximum level to display on chart (default: 30) */
  maxLevel?: number;
  /** Optional className for additional styling */
  className?: string;
}

interface TooltipData {
  level: number;
  xp: number;
  presetId: string;
  presetName: string;
  color: string;
  x: number;
  y: number;
}

interface ChartPoint {
  x: number;
  y: number;
  level: number;
  xp: number;
}

interface ChartLine {
  presetId: string;
  presetName: string;
  color: string;
  points: ChartPoint[];
  pathD: string;
  isSelected: boolean;
}

// Chart dimensions and margins
const CHART_CONFIG = {
  width: 600,
  height: 300,
  margin: { top: 30, right: 60, bottom: 40, left: 70 },
  padding: 10,
  gridLines: 5,
  minLevel: 1,
} as const;

/**
 * Format large XP numbers for display
 */
function formatXPValue(xp: number): string {
  if (xp >= 1000000) {
    return `${(xp / 1000000).toFixed(1)}M`;
  }
  if (xp >= 1000) {
    return `${(xp / 1000).toFixed(0)}K`;
  }
  return xp.toString();
}

/**
 * Format XP for tooltip (full number with commas)
 */
function formatXPTooltip(xp: number): string {
  return xp.toLocaleString();
}

/**
 * Calculate nice tick values for the Y axis
 */
function calculateYTicks(maxValue: number, numTicks: number): number[] {
  // Use nice round numbers
  const magnitude = Math.pow(10, Math.floor(Math.log10(maxValue)));
  const normalizedMax = maxValue / magnitude;

  let tickStep: number;
  if (normalizedMax <= 2) tickStep = 0.5;
  else if (normalizedMax <= 5) tickStep = 1;
  else tickStep = 2;

  tickStep *= magnitude;

  const ticks: number[] = [];
  for (let i = 0; i <= numTicks; i++) {
    ticks.push(i * tickStep);
  }

  return ticks;
}

export function XPCurveChart({
  presets,
  selectedId,
  maxLevel = 30,
  className,
}: XPCurveChartProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [hoveredPresetId, setHoveredPresetId] = useState<string | null>(null);

  // Calculate chart dimensions
  const { width, height, margin } = CHART_CONFIG;
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Calculate XP values for all levels and presets
  const { chartLines, maxXP, yTicks } = useMemo(() => {
    // Generate XP values for each level
    const levels = Array.from(
      { length: maxLevel - CHART_CONFIG.minLevel + 1 },
      (_, i) => CHART_CONFIG.minLevel + i
    );

    // Calculate XP values for all presets
    const presetXPValues = presets.map((preset) =>
      levels.map((level) => preset.xpFormula(level))
    );

    // Find the maximum XP value across all presets
    const maxXPValue = Math.max(...presetXPValues.flat());

    // Calculate Y-axis ticks
    const ticks = calculateYTicks(maxXPValue, CHART_CONFIG.gridLines);
    const maxY = ticks[ticks.length - 1];

    // Generate chart lines
    const lines: ChartLine[] = presets.map((preset, presetIndex) => {
      const xpValues = presetXPValues[presetIndex];

      const points: ChartPoint[] = levels.map((level, levelIndex) => {
        const xp = xpValues[levelIndex];
        const x = margin.left + (levelIndex / (levels.length - 1)) * chartWidth;
        const y = margin.top + chartHeight - (xp / maxY) * chartHeight;

        return { x, y, level, xp };
      });

      // Generate SVG path
      const pathD = points
        .map((point, index) => {
          if (index === 0) {
            return `M ${point.x} ${point.y}`;
          }
          return `L ${point.x} ${point.y}`;
        })
        .join(' ');

      return {
        presetId: preset.id,
        presetName: preset.name,
        color: preset.chartColor,
        points,
        pathD,
        isSelected: preset.id === selectedId,
      };
    });

    return { chartLines: lines, maxXP: maxY, yTicks: ticks };
  }, [presets, selectedId, maxLevel, margin.left, margin.top, chartWidth, chartHeight]);

  // Generate X-axis tick values (levels)
  const xTicks = useMemo(() => {
    const tickLevels = [1, 5, 10, 15, 20, 25, 30].filter((l) => l <= maxLevel);
    return tickLevels.map((level) => ({
      level,
      x: margin.left + ((level - 1) / (maxLevel - 1)) * chartWidth,
    }));
  }, [maxLevel, margin.left, chartWidth]);

  // Handle mouse events for tooltips
  const handleMouseMove = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      const svg = event.currentTarget;
      const rect = svg.getBoundingClientRect();
      const scaleX = width / rect.width;
      const mouseX = (event.clientX - rect.left) * scaleX;

      // Find the closest level based on X position
      const levelIndex = Math.round(
        ((mouseX - margin.left) / chartWidth) * (maxLevel - CHART_CONFIG.minLevel)
      );
      const level = Math.max(
        CHART_CONFIG.minLevel,
        Math.min(maxLevel, CHART_CONFIG.minLevel + levelIndex)
      );

      // Get XP values for all presets at this level
      const hoveredLine = chartLines.find((line) => line.presetId === hoveredPresetId);
      if (hoveredLine) {
        const point = hoveredLine.points.find((p) => p.level === level);
        if (point) {
          setTooltip({
            level: point.level,
            xp: point.xp,
            presetId: hoveredLine.presetId,
            presetName: hoveredLine.presetName,
            color: hoveredLine.color,
            x: point.x,
            y: point.y,
          });
          return;
        }
      }

      // If not hovering a specific line, show selected preset
      const selectedLine = chartLines.find((line) => line.isSelected);
      if (selectedLine) {
        const point = selectedLine.points.find((p) => p.level === level);
        if (point) {
          setTooltip({
            level: point.level,
            xp: point.xp,
            presetId: selectedLine.presetId,
            presetName: selectedLine.presetName,
            color: selectedLine.color,
            x: point.x,
            y: point.y,
          });
        }
      }
    },
    [chartLines, hoveredPresetId, margin.left, chartWidth, maxLevel, width]
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  // Handle line hover
  const handleLineMouseEnter = useCallback((presetId: string) => {
    setHoveredPresetId(presetId);
  }, []);

  const handleLineMouseLeave = useCallback(() => {
    setHoveredPresetId(null);
  }, []);

  return (
    <div className={`xp-curve-chart-wrapper ${className || ''}`}>
      <svg
        className="xp-curve-chart"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        role="img"
        aria-label="XP Curve Chart showing XP requirements for levels 1-30"
      >
        {/* Background */}
        <rect
          className="xp-chart-background"
          x={margin.left}
          y={margin.top}
          width={chartWidth}
          height={chartHeight}
        />

        {/* Grid lines */}
        <g className="xp-chart-grid">
          {/* Horizontal grid lines */}
          {yTicks.map((tick, index) => {
            const y = margin.top + chartHeight - (tick / maxXP) * chartHeight;
            return (
              <line
                key={`h-grid-${index}`}
                className="xp-chart-grid-line"
                x1={margin.left}
                y1={y}
                x2={margin.left + chartWidth}
                y2={y}
              />
            );
          })}

          {/* Vertical grid lines */}
          {xTicks.map((tick, index) => (
            <line
              key={`v-grid-${index}`}
              className="xp-chart-grid-line"
              x1={tick.x}
              y1={margin.top}
              x2={tick.x}
              y2={margin.top + chartHeight}
            />
          ))}
        </g>

        {/* Axes */}
        <g className="xp-chart-axes">
          {/* X axis */}
          <line
            className="xp-chart-axis"
            x1={margin.left}
            y1={margin.top + chartHeight}
            x2={margin.left + chartWidth}
            y2={margin.top + chartHeight}
          />

          {/* Y axis */}
          <line
            className="xp-chart-axis"
            x1={margin.left}
            y1={margin.top}
            x2={margin.left}
            y2={margin.top + chartHeight}
          />
        </g>

        {/* Y axis labels */}
        <g className="xp-chart-labels">
          {yTicks.map((tick, index) => {
            const y = margin.top + chartHeight - (tick / maxXP) * chartHeight;
            return (
              <text
                key={`y-label-${index}`}
                className="xp-chart-label xp-chart-y-label"
                x={margin.left - 10}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
              >
                {formatXPValue(tick)}
              </text>
            );
          })}
        </g>

        {/* X axis labels */}
        <g className="xp-chart-labels">
          {xTicks.map((tick, index) => (
            <text
              key={`x-label-${index}`}
              className="xp-chart-label xp-chart-x-label"
              x={tick.x}
              y={margin.top + chartHeight + 20}
              textAnchor="middle"
            >
              Lv{tick.level}
            </text>
          ))}
        </g>

        {/* Axis titles */}
        <text
          className="xp-chart-title xp-chart-y-title"
          x={15}
          y={margin.top + chartHeight / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          transform={`rotate(-90, 15, ${margin.top + chartHeight / 2})`}
        >
          XP
        </text>
        <text
          className="xp-chart-title xp-chart-x-title"
          x={margin.left + chartWidth / 2}
          y={height - 5}
          textAnchor="middle"
        >
          Level
        </text>

        {/* XP Curves */}
        <g className="xp-chart-lines">
          {chartLines.map((line) => {
            const isHovered = hoveredPresetId === line.presetId;
            const showHighlight = line.isSelected || isHovered;

            return (
              <g
                key={line.presetId}
                className={`xp-chart-line-group ${
                  line.isSelected ? 'xp-chart-line-selected' : ''
                }`}
                onMouseEnter={() => handleLineMouseEnter(line.presetId)}
                onMouseLeave={handleLineMouseLeave}
              >
                {/* Glow effect for selected/hovered line */}
                {showHighlight && (
                  <path
                    className="xp-chart-line-glow"
                    d={line.pathD}
                    stroke={line.color}
                    style={{ stroke: line.color }}
                  />
                )}

                {/* Main line */}
                <path
                  className={`xp-chart-line ${showHighlight ? 'xp-chart-line-highlighted' : ''}`}
                  d={line.pathD}
                  stroke={line.color}
                  style={{ stroke: line.color }}
                />

                {/* Data points for selected/hovered line */}
                {showHighlight && (
                  <g className="xp-chart-points">
                    {line.points
                      .filter((_, idx) => idx % 5 === 0 || idx === line.points.length - 1)
                      .map((point) => (
                        <circle
                          key={`point-${line.presetId}-${point.level}`}
                          className="xp-chart-point"
                          cx={point.x}
                          cy={point.y}
                          r={4}
                          fill={line.color}
                          style={{ fill: line.color }}
                        />
                      ))}
                  </g>
                )}
              </g>
            );
          })}
        </g>

        {/* Tooltip cursor line */}
        {tooltip && (
          <line
            className="xp-chart-cursor"
            x1={tooltip.x}
            y1={margin.top}
            x2={tooltip.x}
            y2={margin.top + chartHeight}
          />
        )}
      </svg>

      {/* Tooltip (outside SVG for better positioning) */}
      {tooltip && (
        <div
          className="xp-chart-tooltip"
          style={{
            left: `${(tooltip.x / width) * 100}%`,
            top: `${(tooltip.y / height) * 100 - 10}%`,
          }}
        >
          <div className="xp-tooltip-header">
            <span
              className="xp-tooltip-color"
              style={{ backgroundColor: tooltip.color }}
            />
            <span className="xp-tooltip-preset">{tooltip.presetName}</span>
          </div>
          <div className="xp-tooltip-body">
            <div className="xp-tooltip-row">
              <span className="xp-tooltip-label">Level:</span>
              <span className="xp-tooltip-value">{tooltip.level}</span>
            </div>
            <div className="xp-tooltip-row">
              <span className="xp-tooltip-label">XP:</span>
              <span className="xp-tooltip-value">{formatXPTooltip(tooltip.xp)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="xp-chart-legend" role="group" aria-label="Chart legend - hover to highlight curves">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`xp-legend-item ${
              selectedId === preset.id ? 'xp-legend-item-selected' : ''
            }`}
            onMouseEnter={() => setHoveredPresetId(preset.id)}
            onMouseLeave={() => setHoveredPresetId(null)}
            onFocus={() => setHoveredPresetId(preset.id)}
            onBlur={() => setHoveredPresetId(null)}
            aria-pressed={selectedId === preset.id}
            aria-label={`${preset.name} curve${selectedId === preset.id ? ' (selected)' : ''}`}
          >
            <span
              className="xp-legend-color"
              style={{ backgroundColor: preset.chartColor }}
              aria-hidden="true"
            />
            <span className="xp-legend-label">{preset.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default XPCurveChart;
