/**
 * AppearancePanel Component
 *
 * Displays appearance categories with their options (colors and text values).
 * Supports inline creation, editing, and deletion of custom appearance options.
 * Extracted from DataViewerTab as part of the refactoring effort.
 *
 * @see docs/plans/DATAVIEWERTAB_REFACTOR_PLAN.md - Task 2.8
 */

import React from 'react';
import { ChevronDown, ChevronUp, Plus, X, Edit2, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '../../../ui/Button';
import { AppearanceOptionCreator } from '../forms/AppearanceOptionCreator';
import { isColorOption, getAppearanceIcon } from '../utils';
import type { ContentType } from '../../../../hooks/useContentCreator';

/**
 * Appearance category data for display
 */
export interface AppearanceCategoryData {
  /** Category key (e.g., 'appearance.bodyTypes') */
  key: string;
  /** Display name (e.g., 'Body Types') */
  name: string;
  /** Description of what this category represents */
  description: string;
  /** Available options in this category */
  options: string[];
  /** Icon to display for this category */
  icon: 'body' | 'color' | 'style' | 'feature';
}

/**
 * Props for the AppearancePanel component
 */
export interface AppearancePanelProps {
  /** Array of appearance categories to display */
  appearanceCategories: AppearanceCategoryData[];
  /** Set of expanded item IDs */
  expandedItems: Set<string>;
  /** Handler to toggle expansion of an item */
  toggleExpanded: (id: string) => void;
  /** Handler for deleting an item */
  onDelete: (category: 'appearance', itemName: string) => void;
  /** Function to check if an item is custom */
  checkIsCustomItem: (category: 'appearance', itemName: string) => boolean;
  /** Function to get spawn mode for a category */
  getSpawnModeForCategory: (category: 'appearance') => string;
  /** Currently active appearance creator category */
  appearanceCreatorCategory: string | null;
  /** Setter for appearance creator category */
  setAppearanceCreatorCategory: (category: string | null) => void;
  /** Currently editing appearance category */
  editingAppearanceCategory: string | null;
  /** Setter for editing appearance category */
  setEditingAppearanceCategory: (category: string | null) => void;
  /** Currently editing appearance value */
  editingAppearanceValue: string | null;
  /** Setter for editing appearance value */
  setEditingAppearanceValue: (value: string | null) => void;
  /** Currently selected appearance option */
  selectedAppearanceOption: { category: string; option: string } | null;
  /** Setter for selected appearance option */
  setSelectedAppearanceOption: (option: { category: string; option: string } | null) => void;
  /** Handler for creating an appearance option */
  onCreateAppearanceOption: (category: ContentType, value: string) => void;
  /** Handler for updating an appearance option */
  onUpdateAppearanceOption: (category: ContentType, originalValue: string, newValue: string) => void;
}

/**
 * AppearancePanel - Displays a grid of appearance categories with their options
 */
export function AppearancePanel({
  appearanceCategories,
  expandedItems,
  toggleExpanded,
  onDelete,
  checkIsCustomItem,
  getSpawnModeForCategory,
  appearanceCreatorCategory,
  setAppearanceCreatorCategory,
  editingAppearanceCategory,
  setEditingAppearanceCategory,
  editingAppearanceValue,
  setEditingAppearanceValue,
  selectedAppearanceOption,
  setSelectedAppearanceOption,
  onCreateAppearanceOption,
  onUpdateAppearanceOption
}: AppearancePanelProps) {
  // Get spawn mode for appearance to filter options
  const appearanceSpawnMode = getSpawnModeForCategory('appearance');
  const isAbsoluteMode = appearanceSpawnMode === 'absolute' || appearanceSpawnMode === 'replace';

  return (
    <div className="dataviewer-grid">
      {appearanceCategories.map(category => {
        const isExpanded = expandedItems.has(category.key);
        const CategoryIcon = getAppearanceIcon(category.icon) as LucideIcon;
        const isCreatingOption = appearanceCreatorCategory === category.key;

        // Filter options based on spawn mode - only show custom items in absolute/replace mode
        const filteredOptions = isAbsoluteMode
          ? category.options.filter(option => checkIsCustomItem('appearance', option))
          : category.options;

        return (
          <div key={category.key} className="dataviewer-card">
            <div
              className="dataviewer-card-header"
              onClick={() => toggleExpanded(category.key)}
            >
              <div className="dataviewer-card-header-content">
                <CategoryIcon size={18} className="dataviewer-card-icon" />
                <span className="dataviewer-card-title">{category.name}</span>
              </div>
              <div className="dataviewer-item-badges">
                <span className="dataviewer-badge dataviewer-badge-secondary">
                  {filteredOptions.length} options
                </span>
                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            </div>

            <div className="dataviewer-card-meta">
              <span className="dataviewer-card-stat">
                {category.description}
              </span>
            </div>

            {isExpanded && (
              <div className="dataviewer-card-details">
                {/* Add Option Button */}
                <div className="dataviewer-appearance-actions">
                  <Button
                    variant={isCreatingOption ? 'outline' : 'ghost'}
                    size="sm"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      setAppearanceCreatorCategory(isCreatingOption ? null : category.key);
                      // Clear any editing state when toggling create mode
                      setEditingAppearanceCategory(null);
                      setEditingAppearanceValue(null);
                    }}
                    leftIcon={isCreatingOption ? X : Plus}
                  >
                    {isCreatingOption ? 'Cancel' : 'Add Option'}
                  </Button>
                </div>

                {/* Inline Creator Form */}
                {isCreatingOption && (
                  <div className="dataviewer-appearance-creator">
                    <AppearanceOptionCreator
                      initialCategory={category.key as ContentType}
                      onCreate={onCreateAppearanceOption}
                      onCancel={() => setAppearanceCreatorCategory(null)}
                      submitButtonText="Add to Category"
                      showPreview={true}
                    />
                  </div>
                )}

                {/* Inline Editor Form for editing existing options */}
                {editingAppearanceCategory === category.key && editingAppearanceValue && (
                  <div className="dataviewer-appearance-creator dataviewer-appearance-editor">
                    <AppearanceOptionCreator
                      initialCategory={category.key as ContentType}
                      initialValue={editingAppearanceValue}
                      originalValue={editingAppearanceValue}
                      isEditMode={true}
                      onUpdate={onUpdateAppearanceOption}
                      onCancel={() => {
                        setEditingAppearanceCategory(null);
                        setEditingAppearanceValue(null);
                      }}
                      showPreview={true}
                    />
                  </div>
                )}

                {/* Options List - filtered by spawn mode */}
                <div className="dataviewer-appearance-options">
                  {filteredOptions.map((option, idx) => {
                    const isCustom = checkIsCustomItem('appearance', option);
                    const isEditing = editingAppearanceCategory === category.key && editingAppearanceValue === option;

                    // Check if this is a color value
                    if (isColorOption(option)) {
                      return (
                        <div
                          key={idx}
                          className={`dataviewer-appearance-color ${isCustom ? 'dataviewer-appearance-option-custom' : ''} ${isEditing ? 'dataviewer-appearance-color-editing' : ''} ${selectedAppearanceOption?.category === category.key && selectedAppearanceOption?.option === option ? 'dataviewer-appearance-selected' : ''}`}
                          onClick={() => {
                            if (isCustom) {
                              // Toggle selection - if already selected, deselect; otherwise select
                              if (selectedAppearanceOption?.category === category.key && selectedAppearanceOption?.option === option) {
                                setSelectedAppearanceOption(null);
                              } else {
                                setSelectedAppearanceOption({ category: category.key, option });
                              }
                            }
                          }}
                        >
                          <div
                            className="dataviewer-color-swatch"
                            style={{ backgroundColor: option }}
                            title={option}
                          />
                          <span className="dataviewer-color-value">{option}</span>
                          {isCustom && !isEditing && selectedAppearanceOption?.category === category.key && selectedAppearanceOption?.option === option && (
                            <div className="dataviewer-appearance-option-actions">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e: React.MouseEvent) => {
                                  e.stopPropagation();
                                  setEditingAppearanceCategory(category.key);
                                  setEditingAppearanceValue(option);
                                  // Close create form if open
                                  setAppearanceCreatorCategory(null);
                                  setSelectedAppearanceOption(null);
                                }}
                                leftIcon={Edit2}
                                title="Edit option"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e: React.MouseEvent) => {
                                  e.stopPropagation();
                                  onDelete('appearance', option);
                                  setSelectedAppearanceOption(null);
                                }}
                                leftIcon={Trash2}
                                title="Delete option"
                                className="dataviewer-delete-btn"
                              />
                            </div>
                          )}
                        </div>
                      );
                    }
                    // Regular option (text)
                    return (
                      <div
                        key={idx}
                        className={`dataviewer-appearance-option ${isCustom ? 'dataviewer-appearance-option-custom' : ''} ${isEditing ? 'dataviewer-appearance-option-editing' : ''} ${selectedAppearanceOption?.category === category.key && selectedAppearanceOption?.option === option ? 'dataviewer-appearance-selected' : ''}`}
                        onClick={() => {
                          if (isCustom) {
                            // Toggle selection - if already selected, deselect; otherwise select
                            if (selectedAppearanceOption?.category === category.key && selectedAppearanceOption?.option === option) {
                              setSelectedAppearanceOption(null);
                            } else {
                              setSelectedAppearanceOption({ category: category.key, option });
                            }
                          }
                        }}
                      >
                        <span className="dataviewer-tag dataviewer-tag-appearance">
                          {option}
                        </span>
                        {isCustom && !isEditing && selectedAppearanceOption?.category === category.key && selectedAppearanceOption?.option === option && (
                          <div className="dataviewer-appearance-option-actions">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                setEditingAppearanceCategory(category.key);
                                setEditingAppearanceValue(option);
                                // Close create form if open
                                setAppearanceCreatorCategory(null);
                                setSelectedAppearanceOption(null);
                              }}
                              leftIcon={Edit2}
                              title="Edit option"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                onDelete('appearance', option);
                                setSelectedAppearanceOption(null);
                              }}
                              leftIcon={Trash2}
                              title="Delete option"
                              className="dataviewer-delete-btn"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
