/**
 * ClassesPanel Component
 *
 * Displays a list of classes with their features, abilities, and spellcaster status.
 * Extracted from DataViewerTab as part of the refactoring effort.
 *
 * @see docs/plans/DATAVIEWERTAB_REFACTOR_PLAN.md - Task 2.6
 */

import { ChevronDown, ChevronUp, Zap, Target, Sparkles, Plus, Settings } from 'lucide-react';
import type { ClassDataEntry } from '../../../../hooks/useDataViewer';
import { ArweaveImage } from '../../../shared/ArweaveImage';
import { Button } from '../../../ui/Button';
import { CustomContentBadge } from '../CustomContentBadge';
import { ABILITY_COLORS } from '../constants';

/**
 * Props for the ClassesPanel component
 */
export interface ClassesPanelProps {
  /** Array of classes to display (already filtered) */
  classes: ClassDataEntry[];
  /** Set of expanded item IDs */
  expandedItems: Set<string>;
  /** Handler to toggle expansion of an item */
  toggleExpanded: (id: string) => void;
  /** Handler for editing an item */
  onEdit: (category: 'classes', itemName: string) => void;
  /** Handler for deleting an item */
  onDelete: (category: 'classes', itemName: string) => void;
  /** Handler for duplicating an item */
  onDuplicate: (category: 'classes', itemName: string) => void;
  /** Function to check if an item is custom */
  checkIsCustomItem: (category: 'classes', itemName: string) => boolean;
  /** Handler to open class creator */
  onCreateClass: () => void;
  /** Handler to open class configuration */
  onConfigureClass: () => void;
}

/**
 * Renders a single class card
 */
function ClassCard({
  cls,
  index,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onDuplicate,
  checkIsCustomItem
}: {
  cls: ClassDataEntry;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  checkIsCustomItem: (itemName: string) => boolean;
}) {
  const className = cls.name || `Class-${index}`;
  const hasImage = cls.image || cls.icon;
  const isCustom = checkIsCustomItem(className);

  return (
    <div className="dataviewer-card">
      <div
        className="dataviewer-card-header"
        onClick={onToggle}
      >
        <div className="dataviewer-card-header-content">
          {/* Class image/icon thumbnail */}
          {hasImage ? (
            <div className="dataviewer-card-thumbnail">
              <ArweaveImage
                src={cls.image || cls.icon || ''}
                alt={className}
                width={32}
                height={32}
                showShimmer={true}
                fallback={
                  <div className="dataviewer-card-thumbnail-fallback">
                    <Zap size={16} />
                  </div>
                }
              />
            </div>
          ) : (
            <Zap size={18} className="dataviewer-card-icon" />
          )}
          <span className="dataviewer-card-title">{className}</span>
        </div>
        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </div>

      <div className="dataviewer-card-meta">
        <span className="dataviewer-card-stat">
          <Target size={14} />
          Hit Die: d{cls.hit_die}
        </span>
        {cls.is_spellcaster && (
          <span className="dataviewer-card-stat dataviewer-card-stat-spellcaster">
            <Sparkles size={14} />
            Spellcaster
          </span>
        )}
      </div>

      {isExpanded && (
        <div className="dataviewer-card-details">
          {/* Full-size class image when expanded */}
          {cls.image && (
            <div className="dataviewer-card-image">
              <ArweaveImage
                src={cls.image}
                alt={className}
                width={180}
                height={180}
                showShimmer={true}
                fallback={
                  <div className="dataviewer-card-image-fallback">
                    <Zap size={48} />
                  </div>
                }
              />
            </div>
          )}
          {/* Class description */}
          {cls.description && (
            <div className="dataviewer-card-section">
              <div className="dataviewer-item-description">
                {cls.description}
              </div>
            </div>
          )}

          <div className="dataviewer-card-section">
            <span className="dataviewer-card-section-title">Primary Ability:</span>
            <span
              className="dataviewer-card-ability"
              style={{ color: ABILITY_COLORS[cls.primary_ability] }}
            >
              {cls.primary_ability}
            </span>
          </div>

          <div className="dataviewer-card-section">
            <span className="dataviewer-card-section-title">Saving Throws:</span>
            <div className="dataviewer-card-bonuses">
              {cls.saving_throws.map(save => (
                <span
                  key={save}
                  className="dataviewer-card-bonus"
                  style={{ color: ABILITY_COLORS[save] }}
                >
                  {save}
                </span>
              ))}
            </div>
          </div>

          <div className="dataviewer-card-section">
            <span className="dataviewer-card-section-title">Skill Choices:</span>
            <span className="dataviewer-card-text">
              Choose {cls.skill_count} from {cls.available_skills.length} skills
            </span>
          </div>
          {isCustom && (
            <div className="dataviewer-item-actions">
              <CustomContentBadge
                category="classes"
                itemName={className}
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
 * ClassesPanel - Displays a list of classes with their details
 */
export function ClassesPanel({
  classes,
  expandedItems,
  toggleExpanded,
  onEdit,
  onDelete,
  onDuplicate,
  checkIsCustomItem,
  onCreateClass,
  onConfigureClass
}: ClassesPanelProps) {
  return (
    <div className="dataviewer-list">
      {/* Class Creation Header (Phase 6.2) */}
      <div className="dataviewer-section-header">
        <Button
          variant="primary"
          size="sm"
          onClick={onCreateClass}
          leftIcon={Plus}
        >
          Create Class
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onConfigureClass}
          leftIcon={Settings}
        >
          Configure Class
        </Button>
      </div>

      <div className="dataviewer-grid">
        {classes.map((cls, index) => {
          const className = cls.name || `Class-${index}`;
          const isExpanded = expandedItems.has(className);

          return (
            <ClassCard
              key={className}
              cls={cls}
              index={index}
              isExpanded={isExpanded}
              onToggle={() => toggleExpanded(className)}
              onEdit={() => onEdit('classes', className)}
              onDelete={() => onDelete('classes', className)}
              onDuplicate={() => onDuplicate('classes', className)}
              checkIsCustomItem={(itemName) => checkIsCustomItem('classes', itemName)}
            />
          );
        })}
      </div>
    </div>
  );
}
