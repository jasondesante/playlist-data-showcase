/**
 * ChartContainer
 *
 * Responsive wrapper for recharts components. Provides consistent card styling,
 * title area, and proper sizing. Uses CSS to constrain width while recharts
 * handles internal responsive behavior via its own ResponsiveContainer.
 */

import React from 'react';
import './ChartContainer.css';

interface ChartContainerProps {
  /** Chart title displayed in the header */
  title?: string;
  /** Optional subtitle for additional context */
  subtitle?: string;
  /** The chart content (recharts components) */
  children: React.ReactNode;
  /** Minimum height for the chart area */
  minHeight?: number;
  /** Maximum height for the chart area */
  maxHeight?: number;
  /** Additional CSS class */
  className?: string;
  /** Mouse event handler (passed to outer container for tooltip positioning) */
  onMouseMove?: React.MouseEventHandler<HTMLDivElement>;
}

const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  subtitle,
  children,
  minHeight = 280,
  maxHeight = 400,
  className = '',
  onMouseMove,
}) => {
  return (
    <div
      className={`chart-container ${className}`}
      style={{ '--chart-min-h': `${minHeight}px`, '--chart-max-h': `${maxHeight}px` } as React.CSSProperties}
      onMouseMove={onMouseMove}
    >
      {(title || subtitle) && (
        <div className="chart-container-header">
          {title && <h4 className="chart-container-title">{title}</h4>}
          {subtitle && <p className="chart-container-subtitle">{subtitle}</p>}
        </div>
      )}
      <div className="chart-container-body" style={{ height: `${minHeight}px` }}>
        {children}
      </div>
    </div>
  );
};

export default React.memo(ChartContainer);
