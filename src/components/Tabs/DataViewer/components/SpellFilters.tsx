/**
 * SpellFilters Component
 *
 * Renders filter controls for spells (level and school filters).
 * Extracted from DataViewerTab as part of the refactoring effort.
 *
 * @see docs/plans/DATAVIEWERTAB_REFACTOR_PLAN.md - Task 2.9
 */

import { formatLevel } from '../utils';

/**
 * Props for the SpellFilters component
 */
export interface SpellFiltersProps {
  /** Current spell level filter value */
  spellLevelFilter: number | 'all';
  /** Handler called when level filter changes */
  onLevelFilterChange: (level: number | 'all') => void;
  /** Current spell school filter value */
  spellSchoolFilter: string | 'all';
  /** Handler called when school filter changes */
  onSchoolFilterChange: (school: string | 'all') => void;
  /** Function to get available spell schools */
  getSpellSchools: () => string[];
}

/**
 * SpellFilters - Renders filter controls for spell level and school
 */
export function SpellFilters({
  spellLevelFilter,
  onLevelFilterChange,
  spellSchoolFilter,
  onSchoolFilterChange,
  getSpellSchools
}: SpellFiltersProps) {
  return (
    <div className="dataviewer-filters">
      <div className="dataviewer-filter-group">
        <label className="dataviewer-filter-label">Level</label>
        <select
          value={spellLevelFilter}
          onChange={(e) => onLevelFilterChange(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
          className="dataviewer-filter-select"
        >
          <option value="all">All Levels</option>
          <option value={0}>Cantrip</option>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => (
            <option key={level} value={level}>{formatLevel(level)} Level</option>
          ))}
        </select>
      </div>
      <div className="dataviewer-filter-group">
        <label className="dataviewer-filter-label">School</label>
        <select
          value={spellSchoolFilter}
          onChange={(e) => onSchoolFilterChange(e.target.value)}
          className="dataviewer-filter-select"
        >
          <option value="all">All Schools</option>
          {getSpellSchools().map(school => (
            <option key={school} value={school}>{school}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
