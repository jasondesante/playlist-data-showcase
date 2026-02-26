/**
 * ClassConfigForm Component
 *
 * A tabbed form component for configuring class-specific data.
 * Part of DataViewerTab Custom Content Creation Upgrade - Phase 6.3.
 *
 * Features:
 * - Tabbed interface with 4 configuration types:
 *   1. Skill Lists - Configure skill availability per class
 *   2. Spell Lists - Configure spells available to a class
 *   3. Spell Slots - Configure slot progression per level
 *   4. Starting Equipment - Configure initial equipment
 * - Class selector for targeting specific classes
 * - Live validation with error display
 * - Preview section for configuration overview
 *
 * @see docs/plans/DATAVIEWER_CUSTOM_CONTENT_PLAN.md for implementation details
 */

import { useState, useCallback, useMemo } from 'react';
import {
  Settings,
  Shield,
  Sparkles,
  Package,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useContentCreator } from '@/hooks/useContentCreator';
import { logger } from '@/utils/logger';
import './ClassConfigForm.css';

/**
 * Tab types for configuration
 */
type ConfigTab = 'skillLists' | 'spellLists' | 'spellSlots' | 'startingEquipment';

/**
 * Default D&D 5e classes for selector
 */
const DEFAULT_CLASSES = [
  'Barbarian',
  'Bard',
  'Cleric',
  'Druid',
  'Fighter',
  'Monk',
  'Paladin',
  'Ranger',
  'Rogue',
  'Sorcerer',
  'Warlock',
  'Wizard'
] as const;

/**
 * Default D&D 5e skills
 */
const DEFAULT_SKILLS = [
  'athletics',
  'acrobatics',
  'sleight_of_hand',
  'stealth',
  'arcana',
  'history',
  'investigation',
  'nature',
  'religion',
  'animal_handling',
  'insight',
  'medicine',
  'perception',
  'survival',
  'deception',
  'intimidation',
  'performance',
  'persuasion'
] as const;

/**
 * Spell schools
 */
const SPELL_SCHOOLS = [
  'Abjuration',
  'Conjuration',
  'Divination',
  'Enchantment',
  'Evocation',
  'Illusion',
  'Necromancy',
  'Transmutation'
] as const;

/**
 * Tab configuration
 */
const TAB_CONFIG: Record<ConfigTab, { label: string; icon: typeof Settings; description: string }> = {
  skillLists: {
    label: 'Skill Lists',
    icon: Shield,
    description: 'Configure which skills are available to a class at creation'
  },
  spellLists: {
    label: 'Spell Lists',
    icon: Sparkles,
    description: 'Configure spells available to a spellcasting class'
  },
  spellSlots: {
    label: 'Spell Slots',
    icon: Settings,
    description: 'Configure spell slot progression by character level'
  },
  startingEquipment: {
    label: 'Starting Equipment',
    icon: Package,
    description: 'Configure starting weapons, armor, and items'
  }
};

/**
 * Skill list form data
 */
export interface SkillListFormData {
  class: string;
  skillCount: number;
  availableSkills: string[];
  hasExpertise: boolean;
  expertiseCount: number;
  skillWeights: Record<string, number>;
}

/**
 * Spell list form data
 */
export interface SpellListFormData {
  class: string;
  cantrips: string[];
  spellsByLevel: Record<number, string[]>;
}

/**
 * Spell slots form data
 */
export interface SpellSlotsFormData {
  class: string;
  slots: Record<number, Record<number, number>>; // characterLevel -> spellLevel -> slots
}

/**
 * Starting equipment form data
 */
export interface StartingEquipmentFormData {
  class: string;
  weapons: string[];
  armor: string[];
  items: string[];
}

/**
 * Union type for all form data
 */
export type ClassConfigFormData =
  | { type: 'skillLists'; data: SkillListFormData }
  | { type: 'spellLists'; data: SpellListFormData }
  | { type: 'spellSlots'; data: SpellSlotsFormData }
  | { type: 'startingEquipment'; data: StartingEquipmentFormData };

/**
 * Props for ClassConfigForm component
 */
export interface ClassConfigFormProps {
  /** Initial selected tab */
  initialTab?: ConfigTab;
  /** Available classes (custom classes) */
  availableClasses?: string[];
  /** Available skills */
  availableSkills?: string[];
  /** Available spells */
  availableSpells?: string[];
  /** Available equipment names */
  availableEquipment?: string[];
  /** Callback when configuration is saved */
  onSave?: (config: ClassConfigFormData) => void;
  /** Callback when cancel is clicked */
  onCancel?: () => void;
  /** Whether the form is disabled */
  disabled?: boolean;
}

/**
 * Get default skill list form data
 */
function getDefaultSkillListData(): SkillListFormData {
  return {
    class: '',
    skillCount: 2,
    availableSkills: [],
    hasExpertise: false,
    expertiseCount: 0,
    skillWeights: {}
  };
}

/**
 * Get default spell list form data
 */
function getDefaultSpellListData(): SpellListFormData {
  return {
    class: '',
    cantrips: [],
    spellsByLevel: {}
  };
}

/**
 * Get default spell slots form data
 */
function getDefaultSpellSlotsData(): SpellSlotsFormData {
  // Initialize with empty slots for levels 1-20
  const slots: Record<number, Record<number, number>> = {};
  for (let level = 1; level <= 20; level++) {
    slots[level] = {};
    for (let spellLevel = 1; spellLevel <= 9; spellLevel++) {
      slots[level][spellLevel] = 0;
    }
  }
  return {
    class: '',
    slots
  };
}

/**
 * Get default starting equipment form data
 */
function getDefaultStartingEquipmentData(): StartingEquipmentFormData {
  return {
    class: '',
    weapons: [],
    armor: [],
    items: []
  };
}

/**
 * ClassConfigForm Component
 *
 * A tabbed form for configuring class-specific data.
 */
export function ClassConfigForm({
  initialTab = 'skillLists',
  availableClasses,
  availableSkills,
  availableSpells = [],
  availableEquipment = [],
  onSave,
  onCancel,
  disabled = false
}: ClassConfigFormProps) {
  const { createContent, isLoading, lastError, clearError } = useContentCreator();

  // Tab state
  const [activeTab, setActiveTab] = useState<ConfigTab>(initialTab);

  // Form states for each tab
  const [skillListData, setSkillListData] = useState<SkillListFormData>(getDefaultSkillListData());
  const [spellListData, setSpellListData] = useState<SpellListFormData>(getDefaultSpellListData());
  const [spellSlotsData, setSpellSlotsData] = useState<SpellSlotsFormData>(getDefaultSpellSlotsData());
  const [equipmentData, setEquipmentData] = useState<StartingEquipmentFormData>(getDefaultStartingEquipmentData());

  // UI states
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  // Computed options
  const allClasses = useMemo(() => {
    return availableClasses ? [...DEFAULT_CLASSES, ...availableClasses] : [...DEFAULT_CLASSES];
  }, [availableClasses]);

  const allSkills = useMemo(() => {
    return availableSkills || [...DEFAULT_SKILLS];
  }, [availableSkills]);

  // ========================================
  // Skill Lists Tab Handlers
  // ========================================

  const handleSkillListClassChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSkillListData(prev => ({ ...prev, class: e.target.value }));
    setFormErrors([]);
  }, []);

  const handleSkillCountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10) || 0;
    setSkillListData(prev => ({ ...prev, skillCount: Math.max(0, Math.min(10, value)) }));
  }, []);

  const handleSkillToggle = useCallback((skill: string) => {
    setSkillListData(prev => {
      const isSelected = prev.availableSkills.includes(skill);
      const newSkills = isSelected
        ? prev.availableSkills.filter(s => s !== skill)
        : [...prev.availableSkills, skill];
      return { ...prev, availableSkills: newSkills };
    });
  }, []);

  const handleHasExpertiseChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setSkillListData(prev => ({
      ...prev,
      hasExpertise: checked,
      expertiseCount: checked ? prev.expertiseCount : 0
    }));
  }, []);

  const handleExpertiseCountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10) || 0;
    setSkillListData(prev => ({ ...prev, expertiseCount: Math.max(0, Math.min(10, value)) }));
  }, []);

  const handleSkillWeightChange = useCallback((skill: string, weight: number) => {
    setSkillListData(prev => ({
      ...prev,
      skillWeights: {
        ...prev.skillWeights,
        [skill]: weight
      }
    }));
  }, []);

  // ========================================
  // Spell Lists Tab Handlers
  // ========================================

  const handleSpellListClassChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSpellListData(prev => ({ ...prev, class: e.target.value }));
    setFormErrors([]);
  }, []);

  const handleCantripToggle = useCallback((cantrip: string) => {
    setSpellListData(prev => {
      const isSelected = prev.cantrips.includes(cantrip);
      const newCantrips = isSelected
        ? prev.cantrips.filter(c => c !== cantrip)
        : [...prev.cantrips, cantrip];
      return { ...prev, cantrips: newCantrips };
    });
  }, []);

  const handleSpellToggle = useCallback((level: number, spell: string) => {
    setSpellListData(prev => {
      const levelSpells = prev.spellsByLevel[level] || [];
      const isSelected = levelSpells.includes(spell);
      const newLevelSpells = isSelected
        ? levelSpells.filter(s => s !== spell)
        : [...levelSpells, spell];
      return {
        ...prev,
        spellsByLevel: {
          ...prev.spellsByLevel,
          [level]: newLevelSpells
        }
      };
    });
  }, []);

  // ========================================
  // Spell Slots Tab Handlers
  // ========================================

  const handleSpellSlotsClassChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSpellSlotsData(prev => ({ ...prev, class: e.target.value }));
    setFormErrors([]);
  }, []);

  const handleSlotChange = useCallback((charLevel: number, spellLevel: number, slots: number) => {
    setSpellSlotsData(prev => ({
      ...prev,
      slots: {
        ...prev.slots,
        [charLevel]: {
          ...prev.slots[charLevel],
          [spellLevel]: Math.max(0, Math.min(10, slots))
        }
      }
    }));
  }, []);

  // ========================================
  // Starting Equipment Tab Handlers
  // ========================================

  const handleEquipmentClassChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setEquipmentData(prev => ({ ...prev, class: e.target.value }));
    setFormErrors([]);
  }, []);

  const handleAddWeapon = useCallback(() => {
    setEquipmentData(prev => ({
      ...prev,
      weapons: [...prev.weapons, '']
    }));
  }, []);

  const handleWeaponChange = useCallback((index: number, value: string) => {
    setEquipmentData(prev => {
      const newWeapons = [...prev.weapons];
      newWeapons[index] = value;
      return { ...prev, weapons: newWeapons };
    });
  }, []);

  const handleRemoveWeapon = useCallback((index: number) => {
    setEquipmentData(prev => ({
      ...prev,
      weapons: prev.weapons.filter((_, i) => i !== index)
    }));
  }, []);

  const handleAddArmor = useCallback(() => {
    setEquipmentData(prev => ({
      ...prev,
      armor: [...prev.armor, '']
    }));
  }, []);

  const handleArmorChange = useCallback((index: number, value: string) => {
    setEquipmentData(prev => {
      const newArmor = [...prev.armor];
      newArmor[index] = value;
      return { ...prev, armor: newArmor };
    });
  }, []);

  const handleRemoveArmor = useCallback((index: number) => {
    setEquipmentData(prev => ({
      ...prev,
      armor: prev.armor.filter((_, i) => i !== index)
    }));
  }, []);

  const handleAddItem = useCallback(() => {
    setEquipmentData(prev => ({
      ...prev,
      items: [...prev.items, '']
    }));
  }, []);

  const handleItemChange = useCallback((index: number, value: string) => {
    setEquipmentData(prev => {
      const newItems = [...prev.items];
      newItems[index] = value;
      return { ...prev, items: newItems };
    });
  }, []);

  const handleRemoveItem = useCallback((index: number) => {
    setEquipmentData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  }, []);

  // ========================================
  // Validation & Submission
  // ========================================

  const validateCurrentTab = useCallback((): boolean => {
    const errors: string[] = [];

    switch (activeTab) {
      case 'skillLists':
        if (!skillListData.class) {
          errors.push('Please select a class');
        }
        if (skillListData.availableSkills.length === 0) {
          errors.push('Please select at least one available skill');
        }
        break;

      case 'spellLists':
        if (!spellListData.class) {
          errors.push('Please select a class');
        }
        if (spellListData.cantrips.length === 0 && Object.values(spellListData.spellsByLevel).every(arr => arr.length === 0)) {
          errors.push('Please add at least one cantrip or spell');
        }
        break;

      case 'spellSlots':
        if (!spellSlotsData.class) {
          errors.push('Please select a class');
        }
        const hasAnySlots = Object.values(spellSlotsData.slots).some(levelSlots =>
          Object.values(levelSlots).some(count => count > 0)
        );
        if (!hasAnySlots) {
          errors.push('Please configure at least one spell slot');
        }
        break;

      case 'startingEquipment':
        if (!equipmentData.class) {
          errors.push('Please select a class');
        }
        if (equipmentData.weapons.length === 0 && equipmentData.armor.length === 0 && equipmentData.items.length === 0) {
          errors.push('Please add at least one piece of equipment');
        }
        break;
    }

    setFormErrors(errors);
    return errors.length === 0;
  }, [activeTab, skillListData, spellListData, spellSlotsData, equipmentData]);

  const handleSubmit = useCallback(async () => {
    clearError();

    if (!validateCurrentTab()) {
      return;
    }

    setIsSubmitting(true);

    try {
      let category: string;
      let item: Record<string, unknown>;
      let configData: ClassConfigFormData;

      switch (activeTab) {
        case 'skillLists': {
          category = `skillLists.${skillListData.class}`;
          item = {
            class: skillListData.class,
            skillCount: skillListData.skillCount,
            availableSkills: skillListData.availableSkills,
            hasExpertise: skillListData.hasExpertise,
            expertiseCount: skillListData.hasExpertise ? skillListData.expertiseCount : 0,
            selectionWeights: Object.keys(skillListData.skillWeights).length > 0
              ? { weights: skillListData.skillWeights, mode: 'relative' }
              : undefined,
            source: 'custom'
          };
          configData = { type: 'skillLists', data: skillListData };
          break;
        }

        case 'spellLists': {
          category = `classSpellLists.${spellListData.class}`;
          item = {
            class: spellListData.class,
            cantrips: spellListData.cantrips,
            spells_by_level: spellListData.spellsByLevel,
            source: 'custom'
          };
          configData = { type: 'spellLists', data: spellListData };
          break;
        }

        case 'spellSlots': {
          category = 'classSpellSlots';
          item = {
            class: spellSlotsData.class,
            slots: spellSlotsData.slots,
            source: 'custom'
          };
          configData = { type: 'spellSlots', data: spellSlotsData };
          break;
        }

        case 'startingEquipment': {
          category = `classStartingEquipment.${equipmentData.class}`;
          item = {
            class: equipmentData.class,
            weapons: equipmentData.weapons.filter(w => w.trim()),
            armor: equipmentData.armor.filter(a => a.trim()),
            items: equipmentData.items.filter(i => i.trim()),
            source: 'custom'
          };
          configData = { type: 'startingEquipment', data: equipmentData };
          break;
        }

        default:
          throw new Error(`Unknown tab: ${activeTab}`);
      }

      const result = createContent(category as any, item, { mode: 'relative' });

      if (result.success) {
        logger.info('ClassConfigForm', `Saved ${activeTab} config for ${item.class as string}`);
        setFormErrors([]);
        onSave?.(configData);
      } else {
        setFormErrors([result.error || 'Failed to save configuration']);
      }
    } catch (error) {
      setFormErrors([error instanceof Error ? error.message : 'An error occurred']);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    activeTab,
    skillListData,
    spellListData,
    spellSlotsData,
    equipmentData,
    clearError,
    validateCurrentTab,
    createContent,
    onSave
  ]);

  const handleCancel = useCallback(() => {
    onCancel?.();
  }, [onCancel]);

  // Handle Enter key to submit (but not in textareas)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Submit on Enter (but not in textareas where it should add newlines)
    if (e.key === 'Enter' && !e.shiftKey && !(e.target instanceof HTMLTextAreaElement)) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  // ========================================
  // Render Functions
  // ========================================

  const renderTabs = () => (
    <div className="class-config-tabs">
      {(Object.keys(TAB_CONFIG) as ConfigTab[]).map(tab => {
        const config = TAB_CONFIG[tab];
        const Icon = config.icon;
        const isActive = activeTab === tab;

        return (
          <button
            key={tab}
            type="button"
            className={`class-config-tab ${isActive ? 'class-config-tab-active' : ''}`}
            onClick={() => {
              setActiveTab(tab);
              setFormErrors([]);
            }}
            disabled={disabled}
          >
            <Icon size={16} />
            <span>{config.label}</span>
          </button>
        );
      })}
    </div>
  );

  const renderClassSelector = (value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void) => (
    <div className="class-config-field">
      <label className="class-config-label" htmlFor="config-class">
        Class <span className="class-config-required">*</span>
      </label>
      <select
        id="config-class"
        value={value}
        onChange={onChange}
        className="class-config-select"
        disabled={disabled}
      >
        <option value="">Select a class...</option>
        {allClasses.map(cls => (
          <option key={cls} value={cls}>{cls}</option>
        ))}
      </select>
    </div>
  );

  const renderSkillListsTab = () => (
    <div className="class-config-tab-content">
      <p className="class-config-description">{TAB_CONFIG.skillLists.description}</p>

      {renderClassSelector(skillListData.class, handleSkillListClassChange)}

      <div className="class-config-row">
        <div className="class-config-field class-config-field-inline">
          <label className="class-config-label" htmlFor="skill-count">
            Skills to Choose
          </label>
          <input
            id="skill-count"
            type="number"
            value={skillListData.skillCount}
            onChange={handleSkillCountChange}
            min={0}
            max={10}
            className="class-config-input class-config-input-number"
            disabled={disabled}
          />
        </div>

        <div className="class-config-field class-config-field-inline">
          <label className="class-config-label" htmlFor="has-expertise">
            <input
              id="has-expertise"
              type="checkbox"
              checked={skillListData.hasExpertise}
              onChange={handleHasExpertiseChange}
              disabled={disabled}
              className="class-config-checkbox"
            />
            Has Expertise
          </label>
          {skillListData.hasExpertise && (
            <input
              type="number"
              value={skillListData.expertiseCount}
              onChange={handleExpertiseCountChange}
              min={0}
              max={10}
              placeholder="Count"
              className="class-config-input class-config-input-number class-config-expertise-count"
              disabled={disabled}
            />
          )}
        </div>
      </div>

      <div className="class-config-field">
        <label className="class-config-label">
          Available Skills
          <span className="class-config-count">({skillListData.availableSkills.length} selected)</span>
        </label>
        <span className="class-config-hint">
          Select skills this class can choose from at character creation
        </span>
        <div className="class-config-skills-grid">
          {allSkills.map(skill => {
            const isSelected = skillListData.availableSkills.includes(skill);
            return (
              <label key={skill} className="class-config-skill-option">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleSkillToggle(skill)}
                  disabled={disabled}
                />
                <span>{skill}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Skill Weights (Advanced) */}
      {skillListData.availableSkills.length > 0 && (
        <div className="class-config-advanced">
          <button
            type="button"
            className="class-config-advanced-toggle"
            onClick={() => setShowPreview(!showPreview)}
            disabled={disabled}
          >
            {showPreview ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            Skill Spawn Weights (Optional)
          </button>

          {showPreview && (
            <div className="class-config-weights-grid">
              {skillListData.availableSkills.map(skill => (
                <div key={skill} className="class-config-weight-row">
                  <span className="class-config-weight-skill">{skill}</span>
                  <input
                    type="range"
                    min="0"
                    max="3"
                    step="0.1"
                    value={skillListData.skillWeights[skill] ?? 1}
                    onChange={(e) => handleSkillWeightChange(skill, parseFloat(e.target.value))}
                    disabled={disabled}
                    className="class-config-slider"
                  />
                  <span className="class-config-weight-value">
                    {(skillListData.skillWeights[skill] ?? 1).toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderSpellListsTab = () => (
    <div className="class-config-tab-content">
      <p className="class-config-description">{TAB_CONFIG.spellLists.description}</p>

      {renderClassSelector(spellListData.class, handleSpellListClassChange)}

      {/* Cantrips */}
      <div className="class-config-field">
        <label className="class-config-label">
          Cantrips (Level 0)
          <span className="class-config-count">({spellListData.cantrips.length} selected)</span>
        </label>
        <div className="class-config-spells-grid">
          {availableSpells.filter(_s => {
            // Filter to only show cantrips if we had level info
            // For now, show all spells
            return true;
          }).slice(0, 50).map(spell => {
            const isSelected = spellListData.cantrips.includes(spell);
            return (
              <label key={spell} className="class-config-spell-option">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleCantripToggle(spell)}
                  disabled={disabled}
                />
                <span>{spell}</span>
              </label>
            );
          })}
        </div>
        {availableSpells.length > 50 && (
          <span className="class-config-hint">
            Showing first 50 of {availableSpells.length} spells
          </span>
        )}
      </div>

      {/* Spells by Level */}
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => (
        <div key={level} className="class-config-field">
          <label className="class-config-label">
            Level {level} Spells
            <span className="class-config-count">
              ({(spellListData.spellsByLevel[level] || []).length} selected)
            </span>
          </label>
          <div className="class-config-spells-grid">
            {availableSpells.slice(0, 50).map(spell => {
              const levelSpells = spellListData.spellsByLevel[level] || [];
              const isSelected = levelSpells.includes(spell);
              return (
                <label key={`${level}-${spell}`} className="class-config-spell-option">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSpellToggle(level, spell)}
                    disabled={disabled}
                  />
                  <span>{spell}</span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  const renderSpellSlotsTab = () => (
    <div className="class-config-tab-content">
      <p className="class-config-description">{TAB_CONFIG.spellSlots.description}</p>

      {renderClassSelector(spellSlotsData.class, handleSpellSlotsClassChange)}

      <div className="class-config-slots-table-wrapper">
        <table className="class-config-slots-table">
          <thead>
            <tr>
              <th>Level</th>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(l => (
                <th key={l}>{l}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(charLevel => (
              <tr key={charLevel}>
                <td className="class-config-slots-level">{charLevel}</td>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(spellLevel => (
                  <td key={spellLevel}>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={spellSlotsData.slots[charLevel]?.[spellLevel] ?? 0}
                      onChange={(e) => handleSlotChange(charLevel, spellLevel, parseInt(e.target.value, 10) || 0)}
                      disabled={disabled}
                      className="class-config-slot-input"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderStartingEquipmentTab = () => (
    <div className="class-config-tab-content">
      <p className="class-config-description">{TAB_CONFIG.startingEquipment.description}</p>

      {renderClassSelector(equipmentData.class, handleEquipmentClassChange)}

      {/* Weapons */}
      <div className="class-config-field">
        <label className="class-config-label">
          Weapons
          <span className="class-config-count">({equipmentData.weapons.filter(w => w.trim()).length})</span>
        </label>
        {equipmentData.weapons.map((weapon, index) => (
          <div key={index} className="class-config-equipment-row">
            <input
              type="text"
              value={weapon}
              onChange={(e) => handleWeaponChange(index, e.target.value)}
              placeholder="Weapon name..."
              className="class-config-input"
              disabled={disabled}
              list="equipment-list"
            />
            <button
              type="button"
              className="class-config-remove-btn"
              onClick={() => handleRemoveWeapon(index)}
              disabled={disabled}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddWeapon}
          disabled={disabled}
          leftIcon={Plus}
        >
          Add Weapon
        </Button>
      </div>

      {/* Armor */}
      <div className="class-config-field">
        <label className="class-config-label">
          Armor
          <span className="class-config-count">({equipmentData.armor.filter(a => a.trim()).length})</span>
        </label>
        {equipmentData.armor.map((armor, index) => (
          <div key={index} className="class-config-equipment-row">
            <input
              type="text"
              value={armor}
              onChange={(e) => handleArmorChange(index, e.target.value)}
              placeholder="Armor name..."
              className="class-config-input"
              disabled={disabled}
              list="equipment-list"
            />
            <button
              type="button"
              className="class-config-remove-btn"
              onClick={() => handleRemoveArmor(index)}
              disabled={disabled}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddArmor}
          disabled={disabled}
          leftIcon={Plus}
        >
          Add Armor
        </Button>
      </div>

      {/* Items */}
      <div className="class-config-field">
        <label className="class-config-label">
          Items
          <span className="class-config-count">({equipmentData.items.filter(i => i.trim()).length})</span>
        </label>
        {equipmentData.items.map((item, index) => (
          <div key={index} className="class-config-equipment-row">
            <input
              type="text"
              value={item}
              onChange={(e) => handleItemChange(index, e.target.value)}
              placeholder="Item name..."
              className="class-config-input"
              disabled={disabled}
              list="equipment-list"
            />
            <button
              type="button"
              className="class-config-remove-btn"
              onClick={() => handleRemoveItem(index)}
              disabled={disabled}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddItem}
          disabled={disabled}
          leftIcon={Plus}
        >
          Add Item
        </Button>
      </div>

      {/* Equipment datalist for autocomplete */}
      <datalist id="equipment-list">
        {availableEquipment.map(eq => (
          <option key={eq} value={eq} />
        ))}
      </datalist>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'skillLists':
        return renderSkillListsTab();
      case 'spellLists':
        return renderSpellListsTab();
      case 'spellSlots':
        return renderSpellSlotsTab();
      case 'startingEquipment':
        return renderStartingEquipmentTab();
      default:
        return null;
    }
  };

  const canSubmit = useMemo(() => {
    switch (activeTab) {
      case 'skillLists':
        return skillListData.class && skillListData.availableSkills.length > 0;
      case 'spellLists':
        return spellListData.class && (spellListData.cantrips.length > 0 || Object.values(spellListData.spellsByLevel).some(arr => arr.length > 0));
      case 'spellSlots':
        return spellSlotsData.class && Object.values(spellSlotsData.slots).some(levelSlots => Object.values(levelSlots).some(count => count > 0));
      case 'startingEquipment':
        return equipmentData.class && (equipmentData.weapons.some(w => w.trim()) || equipmentData.armor.some(a => a.trim()) || equipmentData.items.some(i => i.trim()));
      default:
        return false;
    }
  }, [activeTab, skillListData, spellListData, spellSlotsData, equipmentData]);

  return (
    <div className="class-config-form" onKeyDown={handleKeyDown}>
      {/* Tabs */}
      {renderTabs()}

      {/* Tab Content */}
      {renderTabContent()}

      {/* Validation Errors */}
      {(formErrors.length > 0 || lastError) && (
        <div className="class-config-errors">
          {formErrors.map((error, index) => (
            <div key={index} className="class-config-error">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          ))}
          {lastError && !formErrors.includes(lastError) && (
            <div className="class-config-error">
              <AlertCircle size={14} />
              <span>{lastError}</span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="class-config-actions">
        <Button
          variant="primary"
          size="md"
          onClick={handleSubmit}
          isLoading={isSubmitting || isLoading}
          disabled={disabled || !canSubmit}
          leftIcon={Plus}
        >
          Save Configuration
        </Button>

        {onCancel && (
          <Button
            variant="outline"
            size="md"
            onClick={handleCancel}
            disabled={disabled}
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

export default ClassConfigForm;

// Export types and constants
export { DEFAULT_CLASSES, DEFAULT_SKILLS, SPELL_SCHOOLS, TAB_CONFIG };
