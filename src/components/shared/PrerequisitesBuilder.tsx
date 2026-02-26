/**
 * PrerequisitesBuilder Component
 *
 * A shared component for building structured prerequisites for features, traits, skills, and spells.
 * Part of DataViewerTab Improvements Plan - Phase 5.3.
 *
 * Features:
 * - Level prerequisite (1-20)
 * - Abilities prerequisite (6 ability scores with values)
 * - Class prerequisite (from live registry)
 * - Race prerequisite (from live registry)
 * - Subrace prerequisite (dynamic from selected race's subraces)
 * - Features prerequisite (multi-select from live registry)
 * - Skills prerequisite (multi-select from live registry)
 * - Spells prerequisite (multi-select from live registry)
 * - Custom prerequisite (free text)
 * - Add/remove prerequisite buttons
 * - "Custom..." option for raw JSON input
 * - Real-time validation with warnings
 * - Refresh button to reload dropdown options from live registry
 *
 * @see docs/plans/DATAVIEWER_IMPROVEMENTS_PLAN.md for implementation details
 * @see docs/engine/docs/PREREQUISITES.md for prerequisite types reference
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Target,
  Plus,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Code,
  HelpCircle,
  X
} from 'lucide-react';
import { ExtensionManager } from 'playlist-data-engine';
import './PrerequisitesBuilder.css';

/**
 * Valid abilities
 */
const ABILITIES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const;
type Ability = typeof ABILITIES[number];

/**
 * Prerequisite types that can be added
 */
export const PREREQUISITE_TYPES = [
  { value: 'level', label: 'Level', description: 'Minimum character level required' },
  { value: 'abilities', label: 'Abilities', description: 'Minimum ability scores required' },
  { value: 'class', label: 'Class', description: 'Specific class required' },
  { value: 'race', label: 'Race', description: 'Specific race required' },
  { value: 'subrace', label: 'Subrace', description: 'Specific subrace required' },
  { value: 'features', label: 'Features', description: 'Features that must be learned' },
  { value: 'skills', label: 'Skills', description: 'Skills that must be proficient' },
  { value: 'spells', label: 'Spells', description: 'Spells that must be known' },
  { value: 'custom', label: 'Custom', description: 'Custom condition (display only)' },
] as const;

export type PrerequisiteType = typeof PREREQUISITE_TYPES[number]['value'];

/**
 * Prerequisites structure matching engine types
 */
export interface Prerequisites {
  level?: number;
  abilities?: Partial<Record<Ability, number>>;
  class?: string;
  race?: string;
  subrace?: string;
  features?: string[];
  skills?: string[];
  spells?: string[];
  custom?: string;
}

/**
 * Props for PrerequisitesBuilder component
 */
export interface PrerequisitesBuilderProps {
  /** Current prerequisites object */
  value?: Prerequisites;
  /** Callback when prerequisites change */
  onChange?: (prerequisites: Prerequisites) => void;
  /** Callback when validation state changes */
  onValidChange?: (isValid: boolean) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Additional CSS class names */
  className?: string;
  /** Show help hints */
  showHints?: boolean;
  /** Selected race for subrace context (optional - if not provided, uses race from prerequisites) */
  selectedRace?: string;
}

/**
 * Registry data cache
 */
interface RegistryData {
  classes: string[];
  races: string[];
  subracesByRace: Record<string, string[]>;
  skills: Array<{ id: string; name: string }>;
  spells: Array<{ name: string }>;
  classFeatures: Array<{ id: string; name: string; class?: string }>;
  racialTraits: Array<{ id: string; name: string; race?: string }>;
}

/**
 * Get default empty prerequisites
 */
function createEmptyPrerequisites(): Prerequisites {
  return {};
}

/**
 * PrerequisitesBuilder Component
 *
 * A comprehensive editor for building structured prerequisites.
 */
export function PrerequisitesBuilder({
  value = {},
  onChange,
  onValidChange,
  disabled = false,
  className = '',
  showHints = true,
  selectedRace
}: PrerequisitesBuilderProps) {
  // State
  const [prerequisites, setPrerequisites] = useState<Prerequisites>(value);
  const [registryData, setRegistryData] = useState<RegistryData>({
    classes: [],
    races: [],
    subracesByRace: {},
    skills: [],
    spells: [],
    classFeatures: [],
    racialTraits: []
  });
  const [showCustomJson, setShowCustomJson] = useState(false);
  const [customJsonValue, setCustomJsonValue] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<PrerequisiteType>>(new Set());
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [addDropdownOpen, setAddDropdownOpen] = useState(false);

  // Load data from registry
  const loadRegistryData = useCallback(() => {
    try {
      const manager = ExtensionManager.getInstance();

      // Load classes
      const classesRaw = manager.get('classes') || [];
      const classes = Array.isArray(classesRaw)
        ? classesRaw.map((c: string | { name?: string }) => typeof c === 'string' ? c : c.name || '')
        : [];

      // Load races
      const racesRaw = manager.get('races') || [];
      const races = Array.isArray(racesRaw)
        ? racesRaw.map((r: string | { name?: string }) => typeof r === 'string' ? r : r.name || '')
        : [];

      // Load race data for subraces
      const racesDataRaw = manager.get('races.data') || [];
      const subracesByRace: Record<string, string[]> = {};
      if (Array.isArray(racesDataRaw)) {
        racesDataRaw.forEach((rd: { race?: string; subraces?: string[] }) => {
          if (rd.race && rd.subraces && Array.isArray(rd.subraces)) {
            subracesByRace[rd.race] = rd.subraces;
          }
        });
      }

      // Load skills
      const skillsRaw = manager.get('skills') || [];
      const skills = Array.isArray(skillsRaw)
        ? skillsRaw.map((s: { id?: string; name?: string }) => ({
            id: s.id || (s.name ? s.name.toLowerCase().replace(/\s+/g, '_') : ''),
            name: s.name || ''
          }))
        : [];

      // Load spells
      const spellsRaw = manager.get('spells') || [];
      const spells = Array.isArray(spellsRaw)
        ? spellsRaw.map((s: { name?: string }) => ({ name: s.name || '' }))
        : [];

      // Load class features
      const classFeaturesRaw = manager.get('classFeatures') || [];
      const classFeatures = Array.isArray(classFeaturesRaw)
        ? classFeaturesRaw.map((f: { id?: string; name?: string; class?: string }) => ({
            id: f.id || (f.name ? f.name.toLowerCase().replace(/\s+/g, '_') : ''),
            name: f.name || '',
            class: f.class
          }))
        : [];

      // Load racial traits
      const racialTraitsRaw = manager.get('racialTraits') || [];
      const racialTraits = Array.isArray(racialTraitsRaw)
        ? racialTraitsRaw.map((t: { id?: string; name?: string; race?: string }) => ({
            id: t.id || (t.name ? t.name.toLowerCase().replace(/\s+/g, '_') : ''),
            name: t.name || '',
            race: t.race
          }))
        : [];

      setRegistryData({
        classes,
        races,
        subracesByRace,
        skills,
        spells,
        classFeatures,
        racialTraits
      });
    } catch (error) {
      console.warn('Failed to load registry data for PrerequisitesBuilder:', error);
    }
  }, []);

  // Load registry data on mount
  useEffect(() => {
    loadRegistryData();
  }, [loadRegistryData]);

  // Sync with external value
  useEffect(() => {
    if (value && Object.keys(value).length > 0) {
      setPrerequisites(value);
    }
  }, [value]);

  // Get active prerequisite types
  const activePrerequisiteTypes = useMemo(() => {
    const active: PrerequisiteType[] = [];
    if (prerequisites.level !== undefined) active.push('level');
    if (prerequisites.abilities && Object.keys(prerequisites.abilities).length > 0) active.push('abilities');
    if (prerequisites.class) active.push('class');
    if (prerequisites.race) active.push('race');
    if (prerequisites.subrace) active.push('subrace');
    if (prerequisites.features && prerequisites.features.length > 0) active.push('features');
    if (prerequisites.skills && prerequisites.skills.length > 0) active.push('skills');
    if (prerequisites.spells && prerequisites.spells.length > 0) active.push('spells');
    if (prerequisites.custom) active.push('custom');
    return active;
  }, [prerequisites]);

  // Notify parent of changes
  const handleChange = useCallback((newPrerequisites: Prerequisites) => {
    setPrerequisites(newPrerequisites);
    // Filter out empty prerequisites before passing to parent
    const filteredPrereqs: Prerequisites = {};
    if (newPrerequisites.level !== undefined) filteredPrereqs.level = newPrerequisites.level;
    if (newPrerequisites.abilities && Object.keys(newPrerequisites.abilities).length > 0) {
      filteredPrereqs.abilities = newPrerequisites.abilities;
    }
    if (newPrerequisites.class) filteredPrereqs.class = newPrerequisites.class;
    if (newPrerequisites.race) filteredPrereqs.race = newPrerequisites.race;
    if (newPrerequisites.subrace) filteredPrereqs.subrace = newPrerequisites.subrace;
    if (newPrerequisites.features && newPrerequisites.features.length > 0) {
      filteredPrereqs.features = newPrerequisites.features;
    }
    if (newPrerequisites.skills && newPrerequisites.skills.length > 0) {
      filteredPrereqs.skills = newPrerequisites.skills;
    }
    if (newPrerequisites.spells && newPrerequisites.spells.length > 0) {
      filteredPrereqs.spells = newPrerequisites.spells;
    }
    if (newPrerequisites.custom) filteredPrereqs.custom = newPrerequisites.custom;

    onChange?.(filteredPrereqs);
  }, [onChange]);

  // Validate prerequisites
  const validatePrerequisites = useCallback((prereqs: Prerequisites) => {
    const warnings: string[] = [];

    // Validate level
    if (prereqs.level !== undefined && (prereqs.level < 1 || prereqs.level > 20)) {
      warnings.push('Level must be between 1 and 20');
    }

    // Validate abilities
    if (prereqs.abilities) {
      for (const [ability, value] of Object.entries(prereqs.abilities)) {
        if (!ABILITIES.includes(ability as Ability)) {
          warnings.push(`Invalid ability: ${ability}`);
        } else if (typeof value !== 'number' || value < 1 || value > 30) {
          warnings.push(`${ability} must be between 1 and 30`);
        }
      }
    }

    // Check if class exists in registry
    if (prereqs.class && !registryData.classes.includes(prereqs.class)) {
      warnings.push(`Class "${prereqs.class}" not found in registry (may be custom)`);
    }

    // Check if race exists in registry
    if (prereqs.race && !registryData.races.includes(prereqs.race)) {
      warnings.push(`Race "${prereqs.race}" not found in registry (may be custom)`);
    }

    // Check if skills exist in registry
    if (prereqs.skills) {
      for (const skillId of prereqs.skills) {
        const exists = registryData.skills.some(s => s.id === skillId || s.name.toLowerCase() === skillId.toLowerCase());
        if (!exists) {
          warnings.push(`Skill "${skillId}" not found in registry (may be custom)`);
        }
      }
    }

    // Check if features exist in registry
    if (prereqs.features) {
      for (const featureId of prereqs.features) {
        const classFeatureExists = registryData.classFeatures.some(f => f.id === featureId);
        const racialTraitExists = registryData.racialTraits.some(t => t.id === featureId);
        if (!classFeatureExists && !racialTraitExists) {
          warnings.push(`Feature "${featureId}" not found in registry (may be custom)`);
        }
      }
    }

    // Check if spells exist in registry
    if (prereqs.spells) {
      for (const spellName of prereqs.spells) {
        const exists = registryData.spells.some(s => s.name === spellName);
        if (!exists) {
          warnings.push(`Spell "${spellName}" not found in registry (may be custom)`);
        }
      }
    }

    setValidationWarnings(warnings);
    onValidChange?.(warnings.length === 0);
  }, [registryData, onValidChange]);

  // Run validation when prerequisites change
  useEffect(() => {
    validatePrerequisites(prerequisites);
  }, [prerequisites, validatePrerequisites]);

  // Toggle section expansion
  const toggleSectionExpanded = useCallback((type: PrerequisiteType) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  // Add a prerequisite type
  const addPrerequisiteType = useCallback((type: PrerequisiteType) => {
    const newPrereqs = { ...prerequisites };

    switch (type) {
      case 'level':
        newPrereqs.level = 1;
        break;
      case 'abilities':
        newPrereqs.abilities = {};
        break;
      case 'class':
        newPrereqs.class = '';
        break;
      case 'race':
        newPrereqs.race = '';
        break;
      case 'subrace':
        newPrereqs.subrace = '';
        break;
      case 'features':
        newPrereqs.features = [];
        break;
      case 'skills':
        newPrereqs.skills = [];
        break;
      case 'spells':
        newPrereqs.spells = [];
        break;
      case 'custom':
        newPrereqs.custom = '';
        break;
    }

    handleChange(newPrereqs);
    setExpandedSections(prev => new Set([...prev, type]));
    setAddDropdownOpen(false);
  }, [prerequisites, handleChange]);

  // Remove a prerequisite type
  const removePrerequisiteType = useCallback((type: PrerequisiteType) => {
    const newPrereqs = { ...prerequisites };
    switch (type) {
      case 'level':
        delete newPrereqs.level;
        break;
      case 'abilities':
        delete newPrereqs.abilities;
        break;
      case 'class':
        delete newPrereqs.class;
        break;
      case 'race':
        delete newPrereqs.race;
        break;
      case 'subrace':
        delete newPrereqs.subrace;
        break;
      case 'features':
        delete newPrereqs.features;
        break;
      case 'skills':
        delete newPrereqs.skills;
        break;
      case 'spells':
        delete newPrereqs.spells;
        break;
      case 'custom':
        delete newPrereqs.custom;
        break;
    }
    handleChange(newPrereqs);
  }, [prerequisites, handleChange]);

  // Update level prerequisite
  const updateLevel = useCallback((value: number | undefined) => {
    handleChange({ ...prerequisites, level: value });
  }, [prerequisites, handleChange]);

  // Update ability score
  const updateAbility = useCallback((ability: Ability, value: number | undefined) => {
    const abilities = { ...prerequisites.abilities };
    if (value === undefined) {
      delete abilities[ability];
    } else {
      abilities[ability] = value;
    }
    handleChange({ ...prerequisites, abilities });
  }, [prerequisites, handleChange]);

  // Update class prerequisite
  const updateClass = useCallback((value: string) => {
    handleChange({ ...prerequisites, class: value || undefined });
  }, [prerequisites, handleChange]);

  // Update race prerequisite
  const updateRace = useCallback((value: string) => {
    // Clear subrace when race changes
    const newPrereqs = { ...prerequisites, race: value || undefined };
    if (prerequisites.subrace && value !== prerequisites.race) {
      delete newPrereqs.subrace;
    }
    handleChange(newPrereqs);
  }, [prerequisites, handleChange]);

  // Update subrace prerequisite
  const updateSubrace = useCallback((value: string) => {
    handleChange({ ...prerequisites, subrace: value || undefined });
  }, [prerequisites, handleChange]);

  // Update features prerequisite
  const updateFeatures = useCallback((features: string[]) => {
    handleChange({ ...prerequisites, features: features.length > 0 ? features : undefined });
  }, [prerequisites, handleChange]);

  // Update skills prerequisite
  const updateSkills = useCallback((skills: string[]) => {
    handleChange({ ...prerequisites, skills: skills.length > 0 ? skills : undefined });
  }, [prerequisites, handleChange]);

  // Update spells prerequisite
  const updateSpells = useCallback((spells: string[]) => {
    handleChange({ ...prerequisites, spells: spells.length > 0 ? spells : undefined });
  }, [prerequisites, handleChange]);

  // Update custom prerequisite
  const updateCustom = useCallback((value: string) => {
    handleChange({ ...prerequisites, custom: value || undefined });
  }, [prerequisites, handleChange]);

  // Handle multi-select toggle
  const toggleMultiSelectValue = useCallback((
    type: 'features' | 'skills' | 'spells',
    value: string
  ) => {
    const currentArray = prerequisites[type] || [];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(v => v !== value)
      : [...currentArray, value];

    switch (type) {
      case 'features':
        updateFeatures(newArray);
        break;
      case 'skills':
        updateSkills(newArray);
        break;
      case 'spells':
        updateSpells(newArray);
        break;
    }
  }, [prerequisites, updateFeatures, updateSkills, updateSpells]);

  // Handle custom JSON input
  const handleCustomJsonChange = useCallback((json: string) => {
    setCustomJsonValue(json);
    try {
      const parsed = JSON.parse(json);
      if (parsed && typeof parsed === 'object') {
        handleChange(parsed as Prerequisites);
      }
    } catch {
      // Invalid JSON, don't update
    }
  }, [handleChange]);

  // Toggle custom JSON mode
  const toggleCustomJson = useCallback(() => {
    setShowCustomJson(prev => {
      if (!prev) {
        // Entering custom mode, serialize current prerequisites
        setCustomJsonValue(JSON.stringify(prerequisites, null, 2));
      }
      return !prev;
    });
  }, [prerequisites]);

  // Get available subraces for the current race
  const availableSubraces = useMemo(() => {
    const raceToUse = selectedRace || prerequisites.race;
    if (raceToUse && registryData.subracesByRace[raceToUse]) {
      return registryData.subracesByRace[raceToUse];
    }
    return [];
  }, [selectedRace, prerequisites.race, registryData.subracesByRace]);

  // Get prerequisite type label
  const getPrerequisiteTypeLabel = useCallback((type: PrerequisiteType): string => {
    const found = PREREQUISITE_TYPES.find(t => t.value === type);
    return found?.label || type;
  }, []);

  // Get prerequisite value summary
  const getPrerequisiteValueSummary = useCallback((type: PrerequisiteType): string => {
    switch (type) {
      case 'level':
        return prerequisites.level ? `Level ${prerequisites.level}` : '';
      case 'abilities':
        if (!prerequisites.abilities || Object.keys(prerequisites.abilities).length === 0) return '';
        return Object.entries(prerequisites.abilities)
          .map(([a, v]) => `${a} ${v}`)
          .join(', ');
      case 'class':
        return prerequisites.class || '';
      case 'race':
        return prerequisites.race || '';
      case 'subrace':
        return prerequisites.subrace || '';
      case 'features':
        return prerequisites.features?.length ? `${prerequisites.features.length} features` : '';
      case 'skills':
        return prerequisites.skills?.length ? `${prerequisites.skills.length} skills` : '';
      case 'spells':
        return prerequisites.spells?.length ? `${prerequisites.spells.length} spells` : '';
      case 'custom':
        return prerequisites.custom || '';
      default:
        return '';
    }
  }, [prerequisites]);

  // Available prerequisite types to add
  const availablePrerequisiteTypes = useMemo(() => {
    return PREREQUISITE_TYPES.filter(type => !activePrerequisiteTypes.includes(type.value));
  }, [activePrerequisiteTypes]);

  return (
    <div className={`prerequisites-builder ${className}`}>
      {/* Header */}
      <div className="prereqs-builder-header">
        <h4 className="prereqs-builder-title">
          <Target size={16} aria-hidden="true" />
          Prerequisites
          <span className="prereqs-builder-optional">(optional)</span>
        </h4>
        <button
          type="button"
          className="prereqs-builder-refresh-btn"
          onClick={loadRegistryData}
          disabled={disabled}
          title="Refresh options from registry"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Hint */}
      {showHints && (
        <p className="prereqs-builder-hint">
          Set requirements that must be met before this content can be used.
        </p>
      )}

      {/* Custom JSON Toggle */}
      <button
        type="button"
        className="prereqs-custom-toggle"
        onClick={toggleCustomJson}
        disabled={disabled}
      >
        <Code size={14} />
        {showCustomJson ? 'Use Form Editor' : 'Custom JSON'}
      </button>

      {showCustomJson ? (
        /* Custom JSON Input */
        <div className="prereqs-custom-json">
          <label className="prereqs-label">Raw JSON</label>
          <textarea
            value={customJsonValue}
            onChange={(e) => handleCustomJsonChange(e.target.value)}
            placeholder={`{\n  "level": 5,\n  "abilities": { "INT": 16 },\n  "class": "Wizard"\n}`}
            className="prereqs-json-textarea"
            disabled={disabled}
            rows={8}
          />
          <span className="prereqs-hint">Enter raw JSON for advanced prerequisites</span>
        </div>
      ) : (
        <>
          {/* Prerequisites List */}
          <div className="prereqs-list">
            {activePrerequisiteTypes.map((type) => {
              const isExpanded = expandedSections.has(type);
              const summary = getPrerequisiteValueSummary(type);

              return (
                <div key={type} className="prereq-item">
                  {/* Prerequisite Header */}
                  <div
                    className="prereq-header"
                    onClick={() => toggleSectionExpanded(type)}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                  >
                    <div className="prereq-header-info">
                      <span className="prereq-type-badge">{getPrerequisiteTypeLabel(type)}</span>
                      {summary && <span className="prereq-value">{summary}</span>}
                    </div>
                    <div className="prereq-header-actions">
                      <button
                        type="button"
                        className="prereq-remove-btn"
                        onClick={(e) => { e.stopPropagation(); removePrerequisiteType(type); }}
                        disabled={disabled}
                        title="Remove prerequisite"
                      >
                        <Trash2 size={14} />
                      </button>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  {/* Prerequisite Content */}
                  {isExpanded && (
                    <div className="prereq-content">
                      {/* Level Prerequisite */}
                      {type === 'level' && (
                        <div className="prereq-field">
                          <label className="prereqs-label">Minimum Level</label>
                          <select
                            value={prerequisites.level ?? ''}
                            onChange={(e) => updateLevel(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                            className="prereqs-select"
                            disabled={disabled}
                          >
                            <option value="">None</option>
                            {Array.from({ length: 20 }, (_, i) => i + 1).map(level => (
                              <option key={level} value={level}>
                                Level {level}
                              </option>
                            ))}
                          </select>
                          <span className="prereqs-hint">Minimum character level required</span>
                        </div>
                      )}

                      {/* Abilities Prerequisite */}
                      {type === 'abilities' && (
                        <div className="prereq-field">
                          <label className="prereqs-label">Ability Score Requirements</label>
                          <div className="prereqs-abilities-grid">
                            {ABILITIES.map(ability => (
                              <div key={ability} className="prereqs-ability-input">
                                <label>{ability}</label>
                                <input
                                  type="number"
                                  min={1}
                                  max={30}
                                  value={prerequisites.abilities?.[ability] ?? ''}
                                  onChange={(e) => updateAbility(ability, e.target.value ? parseInt(e.target.value, 10) : undefined)}
                                  placeholder="-"
                                  disabled={disabled}
                                />
                              </div>
                            ))}
                          </div>
                          <span className="prereqs-hint">
                            Minimum ability scores required (leave empty for no requirement)
                          </span>
                        </div>
                      )}

                      {/* Class Prerequisite */}
                      {type === 'class' && (
                        <div className="prereq-field">
                          <label className="prereqs-label">Required Class</label>
                          {registryData.classes.length > 10 ? (
                            <input
                              type="text"
                              value={prerequisites.class || ''}
                              onChange={(e) => updateClass(e.target.value)}
                              list="prereq-classes-list"
                              className="prereqs-input"
                              disabled={disabled}
                              placeholder="Type to search..."
                            />
                          ) : (
                            <select
                              value={prerequisites.class || ''}
                              onChange={(e) => updateClass(e.target.value)}
                              className="prereqs-select"
                              disabled={disabled}
                            >
                              <option value="">Select class...</option>
                              {registryData.classes.map(className => (
                                <option key={className} value={className}>
                                  {className}
                                </option>
                              ))}
                            </select>
                          )}
                          {registryData.classes.length > 10 && (
                            <datalist id="prereq-classes-list">
                              {registryData.classes.map(className => (
                                <option key={className} value={className} />
                              ))}
                            </datalist>
                          )}
                          <span className="prereqs-hint">Specific class required</span>
                        </div>
                      )}

                      {/* Race Prerequisite */}
                      {type === 'race' && (
                        <div className="prereq-field">
                          <label className="prereqs-label">Required Race</label>
                          {registryData.races.length > 10 ? (
                            <input
                              type="text"
                              value={prerequisites.race || ''}
                              onChange={(e) => updateRace(e.target.value)}
                              list="prereq-races-list"
                              className="prereqs-input"
                              disabled={disabled}
                              placeholder="Type to search..."
                            />
                          ) : (
                            <select
                              value={prerequisites.race || ''}
                              onChange={(e) => updateRace(e.target.value)}
                              className="prereqs-select"
                              disabled={disabled}
                            >
                              <option value="">Select race...</option>
                              {registryData.races.map(raceName => (
                                <option key={raceName} value={raceName}>
                                  {raceName}
                                </option>
                              ))}
                            </select>
                          )}
                          {registryData.races.length > 10 && (
                            <datalist id="prereq-races-list">
                              {registryData.races.map(raceName => (
                                <option key={raceName} value={raceName} />
                              ))}
                            </datalist>
                          )}
                          <span className="prereqs-hint">Specific race required</span>
                        </div>
                      )}

                      {/* Subrace Prerequisite */}
                      {type === 'subrace' && (
                        <div className="prereq-field">
                          <label className="prereqs-label">Required Subrace</label>
                          {availableSubraces.length > 0 ? (
                            <select
                              value={prerequisites.subrace || ''}
                              onChange={(e) => updateSubrace(e.target.value)}
                              className="prereqs-select"
                              disabled={disabled}
                            >
                              <option value="">Select subrace...</option>
                              {availableSubraces.map(subrace => (
                                <option key={subrace} value={subrace}>
                                  {subrace}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={prerequisites.subrace || ''}
                              onChange={(e) => updateSubrace(e.target.value)}
                              className="prereqs-input"
                              disabled={disabled}
                              placeholder="e.g., High Elf, Hill Dwarf"
                            />
                          )}
                          <span className="prereqs-hint">
                            {availableSubraces.length > 0
                              ? 'Subraces loaded from race data'
                              : 'Enter subrace manually (no subraces defined for selected race)'}
                          </span>
                        </div>
                      )}

                      {/* Features Prerequisite */}
                      {type === 'features' && (
                        <div className="prereq-field">
                          <label className="prereqs-label">Required Features</label>
                          <div className="prereqs-multi-select">
                            {/* Selected features */}
                            {prerequisites.features && prerequisites.features.length > 0 && (
                              <div className="prereqs-selected-items">
                                {prerequisites.features.map(featureId => {
                                  const feature = registryData.classFeatures.find(f => f.id === featureId) ||
                                    registryData.racialTraits.find(t => t.id === featureId);
                                  return (
                                    <span key={featureId} className="prereqs-selected-item">
                                      {feature?.name || featureId}
                                      <button
                                        type="button"
                                        onClick={() => toggleMultiSelectValue('features', featureId)}
                                        disabled={disabled}
                                        className="prereqs-selected-item-remove"
                                      >
                                        <X size={12} />
                                      </button>
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                            {/* Feature selector */}
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  toggleMultiSelectValue('features', e.target.value);
                                }
                              }}
                              className="prereqs-select"
                              disabled={disabled}
                            >
                              <option value="">Add a feature...</option>
                              <optgroup label="Class Features">
                                {registryData.classFeatures
                                  .filter(f => !prerequisites.features?.includes(f.id))
                                  .map(feature => (
                                    <option key={feature.id} value={feature.id}>
                                      {feature.name} {feature.class ? `(${feature.class})` : ''}
                                    </option>
                                  ))}
                              </optgroup>
                              <optgroup label="Racial Traits">
                                {registryData.racialTraits
                                  .filter(t => !prerequisites.features?.includes(t.id))
                                  .map(trait => (
                                    <option key={trait.id} value={trait.id}>
                                      {trait.name} {trait.race ? `(${trait.race})` : ''}
                                    </option>
                                  ))}
                              </optgroup>
                            </select>
                          </div>
                          <span className="prereqs-hint">Features that must be learned first</span>
                        </div>
                      )}

                      {/* Skills Prerequisite */}
                      {type === 'skills' && (
                        <div className="prereq-field">
                          <label className="prereqs-label">Required Skills</label>
                          <div className="prereqs-multi-select">
                            {/* Selected skills */}
                            {prerequisites.skills && prerequisites.skills.length > 0 && (
                              <div className="prereqs-selected-items">
                                {prerequisites.skills.map(skillId => {
                                  const skill = registryData.skills.find(s => s.id === skillId);
                                  return (
                                    <span key={skillId} className="prereqs-selected-item">
                                      {skill?.name || skillId}
                                      <button
                                        type="button"
                                        onClick={() => toggleMultiSelectValue('skills', skillId)}
                                        disabled={disabled}
                                        className="prereqs-selected-item-remove"
                                      >
                                        <X size={12} />
                                      </button>
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                            {/* Skill selector */}
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  toggleMultiSelectValue('skills', e.target.value);
                                }
                              }}
                              className="prereqs-select"
                              disabled={disabled}
                            >
                              <option value="">Add a skill...</option>
                              {registryData.skills
                                .filter(s => !prerequisites.skills?.includes(s.id))
                                .map(skill => (
                                  <option key={skill.id} value={skill.id}>
                                    {skill.name}
                                  </option>
                                ))}
                            </select>
                          </div>
                          <span className="prereqs-hint">Skills that must be proficient</span>
                        </div>
                      )}

                      {/* Spells Prerequisite */}
                      {type === 'spells' && (
                        <div className="prereq-field">
                          <label className="prereqs-label">Required Spells</label>
                          <div className="prereqs-multi-select">
                            {/* Selected spells */}
                            {prerequisites.spells && prerequisites.spells.length > 0 && (
                              <div className="prereqs-selected-items">
                                {prerequisites.spells.map(spellName => (
                                  <span key={spellName} className="prereqs-selected-item">
                                    {spellName}
                                    <button
                                      type="button"
                                      onClick={() => toggleMultiSelectValue('spells', spellName)}
                                      disabled={disabled}
                                      className="prereqs-selected-item-remove"
                                    >
                                      <X size={12} />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                            {/* Spell selector */}
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  toggleMultiSelectValue('spells', e.target.value);
                                }
                              }}
                              className="prereqs-select"
                              disabled={disabled}
                            >
                              <option value="">Add a spell...</option>
                              {registryData.spells
                                .filter(s => !prerequisites.spells?.includes(s.name))
                                .map(spell => (
                                  <option key={spell.name} value={spell.name}>
                                    {spell.name}
                                  </option>
                                ))}
                            </select>
                          </div>
                          <span className="prereqs-hint">Spells that must be known</span>
                        </div>
                      )}

                      {/* Custom Prerequisite */}
                      {type === 'custom' && (
                        <div className="prereq-field">
                          <label className="prereqs-label">Custom Requirement</label>
                          <input
                            type="text"
                            value={prerequisites.custom || ''}
                            onChange={(e) => updateCustom(e.target.value)}
                            className="prereqs-input"
                            disabled={disabled}
                            placeholder="e.g., Must have completed the Trial of Valor"
                            maxLength={200}
                          />
                          <span className="prereqs-hint">
                            Custom condition (display only, not validated by engine)
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Prerequisite Dropdown */}
          {availablePrerequisiteTypes.length > 0 && (
            <div className="prereqs-add-container">
              {addDropdownOpen ? (
                <div className="prereqs-add-dropdown">
                  {availablePrerequisiteTypes.map(type => (
                    <button
                      key={type.value}
                      type="button"
                      className="prereqs-add-option"
                      onClick={() => addPrerequisiteType(type.value)}
                      disabled={disabled}
                    >
                      <span className="prereqs-add-option-label">{type.label}</span>
                      <span className="prereqs-add-option-desc">{type.description}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  className="prereqs-add-btn"
                  onClick={() => setAddDropdownOpen(true)}
                  disabled={disabled}
                >
                  <Plus size={14} />
                  Add Prerequisite
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* Warnings */}
      {validationWarnings.length > 0 && (
        <div className="prereqs-warnings">
          {validationWarnings.map((warning, index) => (
            <div key={index} className="prereqs-warning">
              <AlertCircle size={12} />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}

      {/* Help Section */}
      {showHints && (
        <div className="prereqs-help">
          <HelpCircle size={14} />
          <span>
            Prerequisites define requirements that must be met.
            Use the form for common options or Custom JSON for advanced configurations.
          </span>
        </div>
      )}
    </div>
  );
}

export default PrerequisitesBuilder;

// Export types and utilities
export { ABILITIES, createEmptyPrerequisites };
