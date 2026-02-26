/**
 * BoxContentsBuilder Component
 *
 * A component for configuring box contents (loot boxes, containers, packs).
 * Part of DataViewerTab Improvements Plan - Phase 3.1.
 *
 * Features:
 * - Drops array editor (add/remove drops)
 * - Per-drop pool editor with weighted entries
 * - Item name autocomplete from equipment registry
 * - Gold option toggle (mutually exclusive with itemName)
 * - Weights sum indicator (should sum to 100)
 * - Probability preview (show % for each pool entry)
 * - Opening requirements section
 * - consumeOnOpen toggle
 *
 * @see docs/plans/DATAVIEWER_IMPROVEMENTS_PLAN.md for implementation details
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  Trash2,
  Coins,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Check,
  RefreshCw
} from 'lucide-react';
import type {
  BoxContents,
  BoxDrop,
  BoxDropPool,
  BoxOpenRequirement
} from 'playlist-data-engine';
import { ExtensionManager } from 'playlist-data-engine';
import './BoxContentsBuilder.css';

/**
 * Equipment item from registry for autocomplete
 */
interface EquipmentItem {
  name: string;
  type: string;
  rarity: string;
}

/**
 * Props for BoxContentsBuilder component
 */
export interface BoxContentsBuilderProps {
  /** Current box contents value */
  value?: BoxContents;
  /** Callback when box contents changes */
  onChange?: (contents: BoxContents) => void;
  /** Callback when validation state changes */
  onValidChange?: (isValid: boolean) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Whether to show the opening requirements section */
  showRequirements?: boolean;
  /** Additional CSS class names */
  className?: string;
}

/**
 * Create an empty drop pool entry
 */
function createEmptyPoolEntry(): BoxDropPool {
  return { weight: 100, itemName: '' };
}

/**
 * Create an empty drop
 */
function createEmptyDrop(): BoxDrop {
  return { pool: [createEmptyPoolEntry()] };
}

/**
 * Create empty box contents
 */
function createEmptyContents(): BoxContents {
  return {
    drops: [createEmptyDrop()],
    consumeOnOpen: true
  };
}

/**
 * Calculate the total weight of a pool
 */
function calculatePoolTotalWeight(pool: BoxDropPool[]): number {
  return pool.reduce((sum, entry) => sum + (entry.weight || 0), 0);
}

/**
 * Calculate probability percentage for each pool entry
 */
function calculateProbabilities(pool: BoxDropPool[]): Array<{ entry: BoxDropPool; percentage: number }> {
  const totalWeight = calculatePoolTotalWeight(pool);
  if (totalWeight === 0) return pool.map(entry => ({ entry, percentage: 0 }));

  return pool.map(entry => ({
    entry,
    percentage: Math.round((entry.weight / totalWeight) * 100)
  }));
}

/**
 * Validate box contents
 */
function validateBoxContents(contents: BoxContents): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Must have at least one drop
  if (!contents.drops || contents.drops.length === 0) {
    errors.push('At least one drop is required');
    return { valid: false, errors };
  }

  // Validate each drop
  contents.drops.forEach((drop, dropIndex) => {
    if (!drop.pool || drop.pool.length === 0) {
      errors.push(`Drop ${dropIndex + 1} must have at least one pool entry`);
      return;
    }

    // Validate each pool entry
    drop.pool.forEach((entry, poolIndex) => {
      // Weight must be > 0
      if (!entry.weight || entry.weight <= 0) {
        errors.push(`Drop ${dropIndex + 1}, Entry ${poolIndex + 1}: Weight must be greater than 0`);
      }

      // Must have either itemName or gold, not both, not neither
      const hasItemName = entry.itemName && entry.itemName.trim().length > 0;
      const hasGold = entry.gold !== undefined && entry.gold > 0;

      if (!hasItemName && !hasGold) {
        errors.push(`Drop ${dropIndex + 1}, Entry ${poolIndex + 1}: Must have either item name or gold`);
      }

      if (hasItemName && hasGold) {
        errors.push(`Drop ${dropIndex + 1}, Entry ${poolIndex + 1}: Cannot have both item name and gold`);
      }
    });
  });

  return { valid: errors.length === 0, errors };
}

/**
 * BoxContentsBuilder Component
 *
 * A comprehensive editor for box contents configuration.
 */
export function BoxContentsBuilder({
  value,
  onChange,
  onValidChange,
  disabled = false,
  showRequirements = true,
  className = ''
}: BoxContentsBuilderProps) {
  // Initialize contents
  const [contents, setContents] = useState<BoxContents>(value || createEmptyContents());
  const [expandedDrops, setExpandedDrops] = useState<Set<number>>(new Set([0]));
  const [equipmentItems, setEquipmentItems] = useState<EquipmentItem[]>([]);
  const [itemSearchTerms, setItemSearchTerms] = useState<Record<string, string>>({});
  const [showItemSuggestions, setShowItemSuggestions] = useState<Record<string, boolean>>({});

  // Load equipment items from registry
  useEffect(() => {
    try {
      const manager = ExtensionManager.getInstance();
      const equipment = manager.get('equipment') as EquipmentItem[] || [];
      setEquipmentItems(equipment);
    } catch (error) {
      console.warn('Failed to load equipment items:', error);
      setEquipmentItems([]);
    }
  }, []);

  // Sync with external value
  useEffect(() => {
    if (value) {
      setContents(value);
    }
  }, [value]);

  // Notify parent of validation state
  useEffect(() => {
    const validation = validateBoxContents(contents);
    onValidChange?.(validation.valid);
  }, [contents, onValidChange]);

  // Handle contents change
  const handleContentsChange = useCallback((newContents: BoxContents) => {
    setContents(newContents);
    onChange?.(newContents);
  }, [onChange]);

  // Toggle drop expansion
  const toggleDropExpanded = useCallback((dropIndex: number) => {
    setExpandedDrops(prev => {
      const next = new Set(prev);
      if (next.has(dropIndex)) {
        next.delete(dropIndex);
      } else {
        next.add(dropIndex);
      }
      return next;
    });
  }, []);

  // Add a new drop
  const addDrop = useCallback(() => {
    const newContents: BoxContents = {
      ...contents,
      drops: [...contents.drops, createEmptyDrop()]
    };
    handleContentsChange(newContents);
    // Expand the new drop
    setExpandedDrops(prev => new Set([...prev, contents.drops.length]));
  }, [contents, handleContentsChange]);

  // Remove a drop
  const removeDrop = useCallback((dropIndex: number) => {
    if (contents.drops.length <= 1) return; // Keep at least one drop
    const newDrops = contents.drops.filter((_, i) => i !== dropIndex);
    handleContentsChange({ ...contents, drops: newDrops });
    // Update expanded state
    setExpandedDrops(prev => {
      const next = new Set<number>();
      prev.forEach(i => {
        if (i < dropIndex) next.add(i);
        else if (i > dropIndex) next.add(i - 1);
      });
      return next;
    });
  }, [contents, handleContentsChange]);

  // Add pool entry to a drop
  const addPoolEntry = useCallback((dropIndex: number) => {
    const newDrops = [...contents.drops];
    newDrops[dropIndex] = {
      ...newDrops[dropIndex],
      pool: [...newDrops[dropIndex].pool, createEmptyPoolEntry()]
    };
    handleContentsChange({ ...contents, drops: newDrops });
  }, [contents, handleContentsChange]);

  // Remove pool entry from a drop
  const removePoolEntry = useCallback((dropIndex: number, poolIndex: number) => {
    const drop = contents.drops[dropIndex];
    if (drop.pool.length <= 1) return; // Keep at least one pool entry

    const newPool = drop.pool.filter((_, i) => i !== poolIndex);
    const newDrops = [...contents.drops];
    newDrops[dropIndex] = { ...drop, pool: newPool };
    handleContentsChange({ ...contents, drops: newDrops });
  }, [contents, handleContentsChange]);

  // Update pool entry
  const updatePoolEntry = useCallback((dropIndex: number, poolIndex: number, updates: Partial<BoxDropPool>) => {
    const newDrops = [...contents.drops];
    const newPool = [...newDrops[dropIndex].pool];
    newPool[poolIndex] = { ...newPool[poolIndex], ...updates };
    newDrops[dropIndex] = { ...newDrops[dropIndex], pool: newPool };
    handleContentsChange({ ...contents, drops: newDrops });
  }, [contents, handleContentsChange]);

  // Toggle between item and gold for a pool entry
  const togglePoolEntryType = useCallback((dropIndex: number, poolIndex: number, useGold: boolean) => {
    const updates: Partial<BoxDropPool> = useGold
      ? { gold: 10, itemName: undefined, quantity: undefined }
      : { itemName: '', gold: undefined, quantity: undefined };
    updatePoolEntry(dropIndex, poolIndex, updates);
  }, [updatePoolEntry]);

  // Update consumeOnOpen
  const updateConsumeOnOpen = useCallback((value: boolean) => {
    handleContentsChange({ ...contents, consumeOnOpen: value });
  }, [contents, handleContentsChange]);

  // Add opening requirement
  const addRequirement = useCallback(() => {
    const newRequirements: BoxOpenRequirement[] = [
      ...(contents.openRequirements || []),
      { itemName: '', quantity: 1 }
    ];
    handleContentsChange({ ...contents, openRequirements: newRequirements });
  }, [contents, handleContentsChange]);

  // Remove opening requirement
  const removeRequirement = useCallback((index: number) => {
    const newRequirements = (contents.openRequirements || []).filter((_, i) => i !== index);
    handleContentsChange({
      ...contents,
      openRequirements: newRequirements.length > 0 ? newRequirements : undefined
    });
  }, [contents, handleContentsChange]);

  // Update opening requirement
  const updateRequirement = useCallback((index: number, updates: Partial<BoxOpenRequirement>) => {
    const newRequirements = [...(contents.openRequirements || [])];
    newRequirements[index] = { ...newRequirements[index], ...updates };
    handleContentsChange({ ...contents, openRequirements: newRequirements });
  }, [contents, handleContentsChange]);

  // Handle item search
  const handleItemSearch = useCallback((key: string, searchTerm: string) => {
    setItemSearchTerms(prev => ({ ...prev, [key]: searchTerm }));
    setShowItemSuggestions(prev => ({ ...prev, [key]: searchTerm.length > 0 }));
  }, []);

  // Select item from suggestions
  const selectItem = useCallback((dropIndex: number, poolIndex: number, itemName: string) => {
    const key = `${dropIndex}-${poolIndex}`;
    updatePoolEntry(dropIndex, poolIndex, { itemName, gold: undefined });
    setItemSearchTerms(prev => ({ ...prev, [key]: itemName }));
    setShowItemSuggestions(prev => ({ ...prev, [key]: false }));
  }, [updatePoolEntry]);

  // Filter equipment items for autocomplete
  const getFilteredItems = useCallback((searchTerm: string): EquipmentItem[] => {
    if (!searchTerm) return equipmentItems.slice(0, 10);
    const lower = searchTerm.toLowerCase();
    return equipmentItems
      .filter(item => item.name.toLowerCase().includes(lower))
      .slice(0, 10);
  }, [equipmentItems]);

  // Refresh equipment items from registry
  const refreshEquipmentItems = useCallback(() => {
    try {
      const manager = ExtensionManager.getInstance();
      const equipment = manager.get('equipment') as EquipmentItem[] || [];
      setEquipmentItems(equipment);
    } catch (error) {
      console.warn('Failed to refresh equipment items:', error);
    }
  }, []);

  // Validation
  const validation = useMemo(() => validateBoxContents(contents), [contents]);

  return (
    <div className={`box-contents-builder ${className}`}>
      {/* Header */}
      <div className="box-contents-header">
        <h4 className="box-contents-title">
          <Package size={16} aria-hidden="true" />
          Box Contents
        </h4>
        <button
          type="button"
          className="box-contents-refresh-btn"
          onClick={refreshEquipmentItems}
          disabled={disabled}
          title="Refresh item list from registry"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Drops Section */}
      <div className="box-contents-drops">
        {contents.drops.map((drop, dropIndex) => {
          const isExpanded = expandedDrops.has(dropIndex);
          const totalWeight = calculatePoolTotalWeight(drop.pool);
          const probabilities = calculateProbabilities(drop.pool);

          return (
            <div key={dropIndex} className="box-drop">
              {/* Drop Header */}
              <div
                className="box-drop-header"
                onClick={() => toggleDropExpanded(dropIndex)}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
              >
                <div className="box-drop-header-info">
                  <span className="box-drop-number">Drop {dropIndex + 1}</span>
                  <span className="box-drop-summary">
                    {drop.pool.length} {drop.pool.length === 1 ? 'option' : 'options'}
                    {totalWeight !== 100 && (
                      <span className="box-drop-weight-warning" title="Weights should sum to 100">
                        <AlertCircle size={12} />
                        Sum: {totalWeight}
                      </span>
                    )}
                  </span>
                </div>
                <div className="box-drop-header-actions">
                  {contents.drops.length > 1 && (
                    <button
                      type="button"
                      className="box-drop-remove-btn"
                      onClick={(e) => { e.stopPropagation(); removeDrop(dropIndex); }}
                      disabled={disabled}
                      title="Remove drop"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {/* Drop Content (Pool) */}
              {isExpanded && (
                <div className="box-drop-content">
                  {/* Pool Entries */}
                  <div className="box-pool-entries">
                    {drop.pool.map((entry, poolIndex) => {
                      const key = `${dropIndex}-${poolIndex}`;
                      const searchTerm = itemSearchTerms[key] ?? entry.itemName ?? '';
                      const showSuggestions = showItemSuggestions[key] ?? false;
                      const probability = probabilities[poolIndex]?.percentage ?? 0;
                      const isGold = entry.gold !== undefined && entry.gold > 0;

                      return (
                        <div key={poolIndex} className="box-pool-entry">
                          {/* Weight Input */}
                          <div className="box-pool-field box-pool-weight">
                            <label className="box-pool-label">Weight</label>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={entry.weight || ''}
                              onChange={(e) => updatePoolEntry(dropIndex, poolIndex, { weight: parseInt(e.target.value) || 0 })}
                              className="box-pool-input"
                              disabled={disabled}
                            />
                            <span className="box-pool-percentage">{probability}%</span>
                          </div>

                          {/* Type Toggle */}
                          <div className="box-pool-field box-pool-type">
                            <label className="box-pool-label">Type</label>
                            <div className="box-pool-type-toggle">
                              <button
                                type="button"
                                className={`box-pool-type-btn ${!isGold ? 'active' : ''}`}
                                onClick={() => togglePoolEntryType(dropIndex, poolIndex, false)}
                                disabled={disabled}
                              >
                                <Package size={12} />
                                Item
                              </button>
                              <button
                                type="button"
                                className={`box-pool-type-btn ${isGold ? 'active' : ''}`}
                                onClick={() => togglePoolEntryType(dropIndex, poolIndex, true)}
                                disabled={disabled}
                              >
                                <Coins size={12} />
                                Gold
                              </button>
                            </div>
                          </div>

                          {/* Item Name or Gold */}
                          {isGold ? (
                            <div className="box-pool-field box-pool-gold">
                              <label className="box-pool-label">Gold Amount</label>
                              <input
                                type="number"
                                min="1"
                                value={entry.gold || ''}
                                onChange={(e) => updatePoolEntry(dropIndex, poolIndex, { gold: parseInt(e.target.value) || 0 })}
                                className="box-pool-input"
                                disabled={disabled}
                                placeholder="e.g., 50"
                              />
                            </div>
                          ) : (
                            <div className="box-pool-field box-pool-item">
                              <label className="box-pool-label">Item Name</label>
                              <div className="box-pool-item-autocomplete">
                                <input
                                  type="text"
                                  value={searchTerm}
                                  onChange={(e) => {
                                    handleItemSearch(key, e.target.value);
                                    updatePoolEntry(dropIndex, poolIndex, { itemName: e.target.value });
                                  }}
                                  onFocus={() => setShowItemSuggestions(prev => ({ ...prev, [key]: true }))}
                                  onBlur={() => setTimeout(() => setShowItemSuggestions(prev => ({ ...prev, [key]: false })), 200)}
                                  className="box-pool-input"
                                  disabled={disabled}
                                  placeholder="Type to search items..."
                                  autoComplete="off"
                                />
                                {showSuggestions && (
                                  <div className="box-pool-suggestions">
                                    {getFilteredItems(searchTerm).map((item) => (
                                      <button
                                        key={item.name}
                                        type="button"
                                        className="box-pool-suggestion"
                                        onMouseDown={() => selectItem(dropIndex, poolIndex, item.name)}
                                      >
                                        <span className="box-pool-suggestion-name">{item.name}</span>
                                        <span className="box-pool-suggestion-meta">
                                          {item.type} • {item.rarity}
                                        </span>
                                      </button>
                                    ))}
                                    {getFilteredItems(searchTerm).length === 0 && (
                                      <div className="box-pool-suggestion-empty">No items found</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Quantity (for items only) */}
                          {!isGold && (
                            <div className="box-pool-field box-pool-quantity">
                              <label className="box-pool-label">Qty</label>
                              <input
                                type="number"
                                min="1"
                                value={entry.quantity || ''}
                                onChange={(e) => updatePoolEntry(dropIndex, poolIndex, { quantity: parseInt(e.target.value) || undefined })}
                                className="box-pool-input"
                                disabled={disabled}
                                placeholder="1"
                              />
                            </div>
                          )}

                          {/* Remove Entry Button */}
                          {drop.pool.length > 1 && (
                            <button
                              type="button"
                              className="box-pool-remove-btn"
                              onClick={() => removePoolEntry(dropIndex, poolIndex)}
                              disabled={disabled}
                              title="Remove entry"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Pool Entry Button */}
                  <button
                    type="button"
                    className="box-pool-add-btn"
                    onClick={() => addPoolEntry(dropIndex)}
                    disabled={disabled}
                  >
                    <Plus size={14} />
                    Add Option
                  </button>

                  {/* Weight Sum Indicator */}
                  <div className={`box-pool-weight-indicator ${totalWeight === 100 ? 'valid' : 'warning'}`}>
                    {totalWeight === 100 ? (
                      <>
                        <Check size={12} />
                        <span>Weights sum to 100</span>
                      </>
                    ) : (
                      <span>Weights sum to {totalWeight} (should be 100)</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Drop Button */}
      <button
        type="button"
        className="box-contents-add-btn"
        onClick={addDrop}
        disabled={disabled}
      >
        <Plus size={14} />
        Add Another Drop
      </button>

      {/* consumeOnOpen Toggle */}
      <div className="box-contents-consume">
        <label className="box-contents-checkbox">
          <input
            type="checkbox"
            checked={contents.consumeOnOpen !== false}
            onChange={(e) => updateConsumeOnOpen(e.target.checked)}
            disabled={disabled}
          />
          <span>Consume box on open</span>
          <span className="box-contents-checkbox-hint">(Remove from inventory after opening)</span>
        </label>
      </div>

      {/* Opening Requirements Section */}
      {showRequirements && (
        <div className="box-contents-requirements">
          <h5 className="box-requirements-title">
            Opening Requirements
            <span className="box-requirements-optional">(optional)</span>
          </h5>

          {(contents.openRequirements || []).map((req, index) => (
            <div key={index} className="box-requirement">
              <div className="box-requirement-field">
                <label className="box-requirement-label">Required Item</label>
                <input
                  type="text"
                  value={req.itemName}
                  onChange={(e) => updateRequirement(index, { itemName: e.target.value })}
                  className="box-requirement-input"
                  disabled={disabled}
                  placeholder="e.g., Iron Key"
                  list={`requirement-items-${index}`}
                />
                <datalist id={`requirement-items-${index}`}>
                  {equipmentItems.slice(0, 50).map(item => (
                    <option key={item.name} value={item.name} />
                  ))}
                </datalist>
              </div>
              <div className="box-requirement-field box-requirement-quantity">
                <label className="box-requirement-label">Qty</label>
                <input
                  type="number"
                  min="1"
                  value={req.quantity || 1}
                  onChange={(e) => updateRequirement(index, { quantity: parseInt(e.target.value) || 1 })}
                  className="box-requirement-input"
                  disabled={disabled}
                />
              </div>
              <button
                type="button"
                className="box-requirement-remove-btn"
                onClick={() => removeRequirement(index)}
                disabled={disabled}
                title="Remove requirement"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          <button
            type="button"
            className="box-requirements-add-btn"
            onClick={addRequirement}
            disabled={disabled}
          >
            <Plus size={14} />
            Add Requirement
          </button>
        </div>
      )}

      {/* Validation Errors */}
      {!validation.valid && (
        <div className="box-contents-errors">
          {validation.errors.map((error, index) => (
            <div key={index} className="box-contents-error">
              <AlertCircle size={12} />
              <span>{error}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default BoxContentsBuilder;

// Export utilities for testing
export {
  createEmptyContents,
  createEmptyDrop,
  createEmptyPoolEntry,
  calculatePoolTotalWeight,
  calculateProbabilities,
  validateBoxContents
};
