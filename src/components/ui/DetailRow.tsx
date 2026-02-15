/**
 * DetailRow Component
 *
 * A reusable collapsible detail panel for displaying selected item details.
 * Used by CharacterGenTab for traits, features, equipment, and spells.
 *
 * Phase 1: DetailRow Component (Foundation) - Task 1.1
 */

import { type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';
import { InlineEffectIndicators, type FeatureEffect } from './EffectDisplay';
import './DetailRow.css';

// ===========================================
// Types
// ===========================================

export interface DetailRowProperty {
  /** Label for the property */
  label: string;
  /** Value of the property */
  value: string | number;
  /** Optional icon for the property */
  icon?: LucideIcon;
  /** Optional color for the value */
  valueColor?: string;
}

export interface DetailRowProps {
  /** Whether the detail row is visible */
  isVisible: boolean;
  /** Title of the selected item */
  title: string;
  /** Optional icon to display next to title */
  icon?: LucideIcon;
  /** Optional color for the icon */
  iconColor?: string;
  /** Main description text */
  description?: string;
  /** Additional properties to display as key-value pairs */
  properties?: DetailRowProperty[];
  /** Optional effects to display */
  effects?: FeatureEffect[];
  /** Optional children for custom content */
  children?: ReactNode;
  /** CSS class name */
  className?: string;
  /** Optional subtitle (e.g., "Level 3 Feature") */
  subtitle?: string;
  /** Optional tag/badge text (e.g., "Cantrip") */
  tag?: string;
  /** Optional tag color */
  tagColor?: string;
}

// ===========================================
// DetailRow Component
// ===========================================

export function DetailRow({
  isVisible,
  title,
  icon: Icon,
  iconColor,
  description,
  properties,
  effects,
  children,
  className,
  subtitle,
  tag,
  tagColor,
}: DetailRowProps) {
  return (
    <div
      className={cn(
        'detail-row',
        isVisible && 'detail-row-visible',
        className
      )}
      role="region"
      aria-label={`${title} details`}
      aria-hidden={!isVisible}
    >
      <div className="detail-row-inner">
        {/* Header with icon, title, subtitle, and tag */}
        <div className="detail-row-header">
          <div className="detail-row-header-left">
            {Icon && (
              <Icon
                size={18}
                className="detail-row-icon"
                style={iconColor ? { color: iconColor } : undefined}
                aria-hidden="true"
              />
            )}
            <div className="detail-row-title-group">
              <h5 className="detail-row-title">{title}</h5>
              {subtitle && (
                <span className="detail-row-subtitle">{subtitle}</span>
              )}
            </div>
          </div>
          {tag && (
            <span
              className="detail-row-tag"
              style={tagColor ? { backgroundColor: tagColor } : undefined}
            >
              {tag}
            </span>
          )}
        </div>

        {/* Main description */}
        {description && (
          <p className="detail-row-description">{description}</p>
        )}

        {/* Properties list */}
        {properties && properties.length > 0 && (
          <div className="detail-row-properties">
            {properties.map((prop, idx) => {
              const PropIcon = prop.icon;
              return (
                <div key={idx} className="detail-row-property">
                  {PropIcon && (
                    <PropIcon
                      size={14}
                      className="detail-row-property-icon"
                      aria-hidden="true"
                    />
                  )}
                  <span className="detail-row-property-label">{prop.label}:</span>
                  <span
                    className="detail-row-property-value"
                    style={prop.valueColor ? { color: prop.valueColor } : undefined}
                  >
                    {prop.value}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Effects display */}
        {effects && effects.length > 0 && (
          <div className="detail-row-effects">
            <span className="detail-row-effects-label">Effects:</span>
            <InlineEffectIndicators effects={effects} />
          </div>
        )}

        {/* Custom content */}
        {children && (
          <div className="detail-row-content">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

export default DetailRow;
