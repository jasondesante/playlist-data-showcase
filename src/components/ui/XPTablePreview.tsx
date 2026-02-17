/**
 * XP Table Preview Component
 *
 * Displays a comparison table of XP requirements for key levels (1, 5, 10, 20, 30)
 * between the currently selected preset and the applied (current) preset.
 *
 * Features:
 * - Shows XP requirements for key milestone levels
 * - Compares selected preset vs currently applied preset (when different)
 * - Highlights differences with color coding
 * - Responsive design for mobile screens
 * - Screen reader accessible
 */

import { useMemo } from 'react';
import type { XPFormulaPreset } from '../../types';
import '../../styles/components/XPTablePreview.css';

export interface XPTablePreviewProps {
  /** All available XP formula presets */
  presets: XPFormulaPreset[];
  /** ID of the currently selected preset */
  selectedId: string;
  /** ID of the currently applied preset (may differ from selected) */
  currentAppliedId: string;
  /** Optional className for additional styling */
  className?: string;
}

/**
 * Format XP number with commas for readability
 */
function formatXPWithCommas(xp: number): string {
  return xp.toLocaleString();
}

/**
 * Calculate percentage difference between two XP values
 */
function calculatePercentDifference(base: number, compare: number): number {
  if (base === 0) return compare === 0 ? 0 : 100;
  return ((compare - base) / base) * 100;
}

/**
 * XPTablePreview
 *
 * A compact table showing XP requirements for key levels, with optional
 * comparison between selected and currently applied presets.
 */
export function XPTablePreview({
  presets,
  selectedId,
  currentAppliedId,
  className,
}: XPTablePreviewProps) {
  // Key milestone levels to display
  const keyLevels = [1, 5, 10, 20, 30];

  // Get the preset objects
  const selectedPreset = useMemo(
    () => presets.find((p) => p.id === selectedId) || presets[0],
    [presets, selectedId]
  );

  const appliedPreset = useMemo(
    () => presets.find((p) => p.id === currentAppliedId),
    [presets, currentAppliedId]
  );

  // Check if we're showing a comparison (selected differs from applied)
  const showComparison = selectedId !== currentAppliedId && appliedPreset;

  // Calculate XP values for each level
  const tableData = useMemo(() => {
    return keyLevels.map((level) => {
      const selectedXP = selectedPreset.xpFormula(level);
      const appliedXP = appliedPreset?.xpFormula(level);
      const difference = appliedXP !== undefined
        ? calculatePercentDifference(appliedXP, selectedXP)
        : 0;

      return {
        level,
        selectedXP,
        appliedXP,
        difference,
      };
    });
  }, [selectedPreset, appliedPreset]);

  // Calculate total XP to max level for each preset
  const totalXPData = useMemo(() => {
    const selectedTotal = keyLevels.reduce((sum, level) => sum + selectedPreset.xpFormula(level), 0);
    const appliedTotal = appliedPreset
      ? keyLevels.reduce((sum, level) => sum + appliedPreset.xpFormula(level), 0)
      : null;

    return {
      selectedTotal,
      appliedTotal,
      difference: appliedTotal !== null
        ? calculatePercentDifference(appliedTotal, selectedTotal)
        : 0,
    };
  }, [selectedPreset, appliedPreset]);

  return (
    <div className={`xp-table-preview ${className || ''}`}>
      <h5 className="xp-table-title">Level XP Requirements</h5>

      <div className="xp-table-container" role="region" aria-label="XP requirements comparison table">
        <table className="xp-table" aria-label="XP requirements by level">
          <thead>
            <tr>
              <th scope="col" className="xp-table-header-level">Level</th>
              <th scope="col" className="xp-table-header-xp">
                {showComparison ? (
                  <span className="xp-table-header-selected">
                    <span
                      className="xp-table-color-dot"
                      style={{ backgroundColor: selectedPreset.chartColor }}
                      aria-hidden="true"
                    />
                    {selectedPreset.name}
                  </span>
                ) : (
                  'XP Required'
                )}
              </th>
              {showComparison && (
                <th scope="col" className="xp-table-header-compare">
                  <span className="xp-table-header-applied">
                    <span
                      className="xp-table-color-dot"
                      style={{ backgroundColor: appliedPreset!.chartColor }}
                      aria-hidden="true"
                    />
                    {appliedPreset!.name}
                  </span>
                </th>
              )}
              {showComparison && (
                <th scope="col" className="xp-table-header-diff">Change</th>
              )}
            </tr>
          </thead>
          <tbody>
            {tableData.map(({ level, selectedXP, appliedXP, difference }) => (
              <tr key={level} className="xp-table-row">
                <td className="xp-table-cell-level">
                  <span className="xp-table-level-badge">Lv{level}</span>
                </td>
                <td className="xp-table-cell-xp xp-table-cell-selected">
                  {formatXPWithCommas(selectedXP)}
                </td>
                {showComparison && (
                  <td className="xp-table-cell-xp xp-table-cell-applied">
                    {formatXPWithCommas(appliedXP!)}
                  </td>
                )}
                {showComparison && (
                  <td className="xp-table-cell-diff">
                    <span
                      className={`xp-table-diff-badge ${
                        difference > 0 ? 'xp-table-diff-increase' :
                        difference < 0 ? 'xp-table-diff-decrease' :
                        'xp-table-diff-same'
                      }`}
                      aria-label={`${difference > 0 ? 'Increases by' : difference < 0 ? 'Decreases by' : 'No change'} ${Math.abs(difference).toFixed(1)} percent`}
                    >
                      {difference > 0 && '+'}
                      {difference.toFixed(1)}%
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          {showComparison && (
            <tfoot>
              <tr className="xp-table-footer">
                <td className="xp-table-cell-level">
                  <span className="xp-table-total-label">Total</span>
                </td>
                <td className="xp-table-cell-xp xp-table-cell-selected">
                  {formatXPWithCommas(totalXPData.selectedTotal)}
                </td>
                <td className="xp-table-cell-xp xp-table-cell-applied">
                  {formatXPWithCommas(totalXPData.appliedTotal!)}
                </td>
                <td className="xp-table-cell-diff">
                  <span
                    className={`xp-table-diff-badge ${
                      totalXPData.difference > 0 ? 'xp-table-diff-increase' :
                      totalXPData.difference < 0 ? 'xp-table-diff-decrease' :
                      'xp-table-diff-same'
                    }`}
                  >
                    {totalXPData.difference > 0 && '+'}
                    {totalXPData.difference.toFixed(1)}%
                  </span>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {showComparison && (
        <p className="xp-table-comparison-note">
          Comparing selected preset with currently applied preset.
          <br />
          <span className="xp-table-comparison-hint">
            Positive values mean more XP required; negative means less.
          </span>
        </p>
      )}
    </div>
  );
}

export default XPTablePreview;
