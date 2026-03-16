/**
 * SkillsPanel Component
 *
 * Displays a list of skills grouped by ability score.
 * Extracted from DataViewerTab as part of the refactoring effort.
 *
 * @see docs/plans/DATAVIEWERTAB_REFACTOR_PLAN.md - Task 2.2
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, ChevronsDownUp, Target, Plus } from 'lucide-react';
import type { CustomSkill } from 'playlist-data-engine';
import { ArweaveImage } from '../../../shared/ArweaveImage';
import { Button } from '../../../ui/Button';
import { CustomContentBadge } from '../CustomContentBadge';
import { ABILITY_COLORS } from '../constants';

/**
 * Props for the SkillsPanel component
 */
export interface SkillsPanelProps {
  /** Array of skills to display (already filtered) */
  skills: CustomSkill[];
  /** Function to group skills by ability score */
  groupSkillsByAbility: (skills: CustomSkill[]) => Record<string, CustomSkill[]>;
  /** Set of expanded item IDs */
  expandedItems: Set<string>;
  /** Handler to toggle expansion of an item */
  toggleExpanded: (id: string) => void;
  /** Handler for editing an item */
  onEdit: (category: 'skills', itemName: string) => void;
  /** Handler for deleting an item */
  onDelete: (category: 'skills', itemName: string) => void;
  /** Handler for duplicating an item */
  onDuplicate: (category: 'skills', itemName: string) => void;
  /** Function to check if an item is custom */
  checkIsCustomItem: (category: 'skills', itemName: string) => boolean;
  /** Handler to open skill creator */
  onCreateSkill: () => void;
  /** Render function for spawn mode controls */
  renderSpawnModeControls: () => React.ReactNode;
}

/**
 * Renders a single skill card within an ability group
 */
function SkillCard({
  skill,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onDuplicate,
  checkIsCustomItem
}: {
  skill: CustomSkill;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  checkIsCustomItem: (itemName: string) => boolean;
}) {
  const hasDescription = skill.description && skill.description.length > 0;
  const isCustom = checkIsCustomItem(skill.name);
  const hasImage = skill.image || skill.icon;
  const isExpandable = hasDescription || isCustom || hasImage;

  return (
    <div
      className={`dataviewer-group-item ${isExpandable ? 'dataviewer-group-item-expandable' : ''}`}
      onClick={() => isExpandable && onToggle()}
    >
      <div className="dataviewer-group-item-header">
        {/* Skill image/icon thumbnail */}
        {hasImage && (
          <div className="dataviewer-item-thumbnail dataviewer-item-thumbnail-small">
            <ArweaveImage
              src={skill.image || skill.icon || ''}
              alt={skill.name}
              width={28}
              height={28}
              showShimmer={true}
              fallback={
                <div className="dataviewer-item-thumbnail-fallback dataviewer-item-thumbnail-fallback-small">
                  <Target size={14} />
                </div>
              }
            />
          </div>
        )}
        <span className="dataviewer-group-item-name">{skill.name}</span>
        <div className="dataviewer-item-badges">
          {skill.categories && skill.categories.length > 0 && (
            <div className="dataviewer-group-item-tags">
              {skill.categories.map(cat => (
                <span key={cat} className="dataviewer-tag dataviewer-tag-small">{cat}</span>
              ))}
            </div>
          )}
          {isExpandable && (
            isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />
          )}
        </div>
      </div>
      {isExpanded && isExpandable && (
        <div className="dataviewer-group-item-details">
          {/* Full-size skill image when expanded */}
          {skill.image && (
            <div className="dataviewer-item-image">
              <ArweaveImage
                src={skill.image}
                alt={skill.name}
                width={150}
                height={150}
                showShimmer={true}
                fallback={
                  <div className="dataviewer-item-image-fallback">
                    <Target size={36} />
                  </div>
                }
              />
            </div>
          )}
          {hasDescription && (
            <div className="dataviewer-item-description">
              {skill.description}
            </div>
          )}
          {isCustom && (
            <div className="dataviewer-item-actions">
              <CustomContentBadge
                category="skills"
                itemName={skill.name}
                onEdit={onEdit}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                showActions={true}
                size="sm"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * SkillsPanel - Displays a list of skills grouped by ability score
 */
export function SkillsPanel({
  skills,
  groupSkillsByAbility,
  expandedItems,
  toggleExpanded,
  onEdit,
  onDelete,
  onDuplicate,
  checkIsCustomItem,
  onCreateSkill,
  renderSpawnModeControls
}: SkillsPanelProps) {
  const grouped = groupSkillsByAbility(skills);
  const abilities = Object.keys(grouped).sort();

  // State for collapsed groups
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Toggle a single group's collapse state
  const toggleGroupCollapse = (groupName: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  // Expand all groups
  const expandAllGroups = () => {
    setCollapsedGroups(new Set());
  };

  // Collapse all groups
  const collapseAllGroups = () => {
    setCollapsedGroups(new Set(abilities));
  };

  // Check if all groups are collapsed
  const allCollapsed = abilities.length > 0 && collapsedGroups.size === abilities.length;
  const allExpanded = collapsedGroups.size === 0;

  return (
    <div className="dataviewer-list">
      {/* Skill Creation Header */}
      <div className="dataviewer-section-header">
        {/* Collapse/Expand All buttons */}
        <div className="dataviewer-group-controls">
          <button
            className="dataviewer-group-controls-btn"
            onClick={collapseAllGroups}
            disabled={allCollapsed}
            title="Collapse all groups"
          >
            <ChevronsDownUp />
            <span>Collapse All</span>
          </button>
          <button
            className="dataviewer-group-controls-btn"
            onClick={expandAllGroups}
            disabled={allExpanded}
            title="Expand all groups"
          >
            <ChevronsDownUp style={{ transform: 'rotate(180deg)' }} />
            <span>Expand All</span>
          </button>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={onCreateSkill}
          leftIcon={Plus}
        >
          Create Skill
        </Button>
      </div>

      {/* Skills List */}
      <div className="dataviewer-grouped-list">
        {abilities.map(ability => {
          const isCollapsed = collapsedGroups.has(ability);

          return (
            <div key={ability} className="dataviewer-group">
              <div
                className="dataviewer-group-header"
                onClick={() => toggleGroupCollapse(ability)}
              >
                <span className="dataviewer-group-header-chevron">
                  {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </span>
                <span
                  className="dataviewer-group-title"
                  style={{ color: ABILITY_COLORS[ability] || 'var(--color-text-primary)' }}
                >
                  {ability}
                </span>
                <span className="dataviewer-group-count">({grouped[ability].length})</span>
              </div>
              {!isCollapsed && (
                <div className="dataviewer-group-items">
                  {grouped[ability].map(skill => {
                    const isExpanded = expandedItems.has(skill.id);

                    return (
                      <SkillCard
                        key={skill.id}
                        skill={skill}
                        isExpanded={isExpanded}
                        onToggle={() => toggleExpanded(skill.id)}
                        onEdit={() => onEdit('skills', skill.name)}
                        onDelete={() => onDelete('skills', skill.name)}
                        onDuplicate={() => onDuplicate('skills', skill.name)}
                        checkIsCustomItem={(itemName) => checkIsCustomItem('skills', itemName)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {renderSpawnModeControls()}
    </div>
  );
}
