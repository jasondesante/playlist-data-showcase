/**
 * CategorySelector Component
 *
 * Renders category tabs for switching between different data types in the DataViewer.
 * Extracted from DataViewerTab as part of the refactoring effort.
 *
 * @see docs/plans/DATAVIEWERTAB_REFACTOR_PLAN.md - Task 2.9
 */

import { type DataCategory, type DataCounts } from '../../../../hooks/useDataViewer';
import { CATEGORY_CONFIG } from '../constants';

/**
 * Props for the CategorySelector component
 */
export interface CategorySelectorProps {
  /** Currently active category */
  activeCategory: DataCategory;
  /** Counts for each data category */
  dataCounts: DataCounts;
  /** Handler called when category changes */
  onCategoryChange: (category: DataCategory) => void;
}

/**
 * CategorySelector - Renders category tabs for data navigation
 */
export function CategorySelector({
  activeCategory,
  dataCounts,
  onCategoryChange
}: CategorySelectorProps) {
  return (
    <div className="dataviewer-category-selector">
      {(Object.keys(CATEGORY_CONFIG) as DataCategory[]).map((category) => {
        const config = CATEGORY_CONFIG[category];
        const Icon = config.icon;
        const isActive = activeCategory === category;
        const count = dataCounts[config.countKey];

        return (
          <button
            key={category}
            className={`dataviewer-category-btn ${isActive ? 'dataviewer-category-btn-active' : ''}`}
            onClick={() => onCategoryChange(category)}
          >
            <Icon size={18} />
            <span className="dataviewer-category-label">{config.label}</span>
            <span className="dataviewer-category-count">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
