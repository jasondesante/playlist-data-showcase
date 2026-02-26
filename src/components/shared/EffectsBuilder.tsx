/**
 * EffectsBuilder Component
 *
 * A shared component for building structured effects for features, traits, and equipment.
 * Part of DataViewerTab Improvements Plan - Phase 5.2.
 *
 * Features:
 * - Type dropdown with 6 effect types (stat_bonus, skill_proficiency, ability_unlock, passive_modifier, resource_grant, spell_slot_bonus)
 * - Dynamic target dropdowns based on effect type, populated from live registry
 * - Value field that changes based on effect type (number, text, or boolean)
 * - Optional condition field
 * - Add/remove effect buttons
 * - "Custom..." option for raw JSON input
 * - Real-time validation with warnings
 * - Refresh button to reload dropdown options from live registry
 *
 * @see docs/plans/DATAVIEWER_IMPROVEMENTS_PLAN.md for implementation details
 */

import { useState, useCallback, useEffect } from 'react';
import {
  Zap,
  Plus,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Code,
  HelpCircle
} from 'lucide-react';
import { ExtensionManager } from 'playlist-data-engine';
import './EffectsBuilder.css';

/**
 * Valid effect types according to the engine
 */
export const EFFECT_TYPES = [
  { value: 'stat_bonus', label: 'Stat Bonus', description: 'Ability score bonus' },
  { value: 'skill_proficiency', label: 'Skill Proficiency', description: 'Grant proficiency or expertise' },
  { value: 'ability_unlock', label: 'Ability Unlock', description: 'Unlock special ability' },
  { value: 'passive_modifier', label: 'Passive Modifier', description: 'Constant bonus to stats' },
  { value: 'resource_grant', label: 'Resource Grant', description: 'Grant resource pool' },
  { value: 'spell_slot_bonus', label: 'Spell Slot Bonus', description: 'Extra spell slots' },
] as const;

export type EffectType = typeof EFFECT_TYPES[number]['value'];

/**
 * Standard abilities for stat_bonus
 */
const ABILITIES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const;

/**
 * Common ability unlock options
 */
const ABILITY_UNLOCKS = [
  { value: 'darkvision', label: 'Darkvision', description: 'See in darkness' },
  { value: 'flight', label: 'Flight', description: 'Ability to fly' },
  { value: 'fire_resistance', label: 'Fire Resistance', description: 'Resistance to fire damage' },
  { value: 'cold_resistance', label: 'Cold Resistance', description: 'Resistance to cold damage' },
  { value: 'damage_resistance', label: 'Damage Resistance', description: 'Resistance to specified element' },
  { value: 'telepathy', label: 'Telepathy', description: 'Mental communication' },
  { value: 'poison_immunity', label: 'Poison Immunity', description: 'Immunity to poison' },
  { value: 'psychic_immunity', label: 'Psychic Immunity', description: 'Immunity to psychic damage' },
  { value: 'mage_armor', label: 'Mage Armor', description: 'Magical armor bonus' },
  { value: 'snow_movement', label: 'Snow Movement', description: 'No penalty in snow/ice' },
  { value: 'elemental_magic', label: 'Elemental Magic', description: 'Attuned to element' },
  { value: 'long_jump', label: 'Long Jump', description: 'Enhanced jumping' },
  { value: 'sleep_immunity', label: 'Sleep Immunity', description: 'Immunity to sleep' },
] as const;

/**
 * Common passive modifier targets
 */
const PASSIVE_MODIFIER_TARGETS = [
  { value: 'ac', label: 'Armor Class', description: 'AC bonus' },
  { value: 'speed', label: 'Speed', description: 'Movement speed bonus (feet)' },
  { value: 'initiative', label: 'Initiative', description: 'Initiative bonus' },
  { value: 'attack_roll', label: 'Attack Roll', description: 'Attack roll bonus' },
  { value: 'damage_roll', label: 'Damage Roll', description: 'Damage roll bonus' },
  { value: 'saving_throws', label: 'Saving Throws', description: 'Saving throw bonus' },
  { value: 'spell_save_dc', label: 'Spell Save DC', description: 'Spell save DC bonus' },
  { value: 'spell_strike_damage', label: 'Spell Strike Damage', description: 'Spell strike damage bonus' },
  { value: 'survival_cold_bonus', label: 'Cold Survival', description: 'Bonus to cold survival' },
] as const;

/**
 * Spell slot levels
 */
const SPELL_SLOT_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

/**
 * Single effect structure
 */
export interface Effect {
  type: EffectType | string;
  target: string;
  value?: string | number | boolean;
  condition?: string;
}

/**
 * Props for EffectsBuilder component
 */
export interface EffectsBuilderProps {
  /** Current effects array */
  value?: Effect[];
  /** Callback when effects change */
  onChange?: (effects: Effect[]) => void;
  /** Callback when validation state changes */
  onValidChange?: (isValid: boolean) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Additional CSS class names */
  className?: string;
  /** Show help hints */
  showHints?: boolean;
}

/**
 * Get default empty effect
 */
function createEmptyEffect(): Effect {
  return {
    type: '' as EffectType,
    target: '',
    value: undefined,
    condition: ''
  };
}

/**
 * Registry data cache
 */
interface RegistryData {
  skills: Array<{ id: string; name: string }>;
  resources: Array<{ id: string; name: string; className: string }>;
}

/**
 * EffectsBuilder Component
 *
 * A comprehensive editor for building structured effects.
 */
export function EffectsBuilder({
  value = [],
  onChange,
  onValidChange,
  disabled = false,
  className = '',
  showHints = true
}: EffectsBuilderProps) {
  // State
  const [effects, setEffects] = useState<Effect[]>(value.length > 0 ? value : [createEmptyEffect()]);
  const [registryData, setRegistryData] = useState<RegistryData>({ skills: [], resources: [] });
  const [showCustomJson, setShowCustomJson] = useState<Record<number, boolean>>({});
  const [customJsonValues, setCustomJsonValues] = useState<Record<number, string>>({});
  const [expandedEffects, setExpandedEffects] = useState<Set<number>>(new Set([0]));
  const [validationWarnings, setValidationWarnings] = useState<Record<number, string[]>>({});

  // Load data from registry
  const loadRegistryData = useCallback(() => {
    try {
      const manager = ExtensionManager.getInstance();

      // Load skills
      const skills = (manager.get('skills') || []) as Array<{ id?: string; name: string }>;
      const skillsData = skills.map(skill => ({
        id: skill.id || skill.name.toLowerCase().replace(/\s+/g, '_'),
        name: skill.name
      }));

      // Load resources from class features (features with type: 'resource')
      const classFeatures = (manager.get('classFeatures') || []) as Array<{
        id?: string;
        name: string;
        class?: string;
        type?: string;
      }>;
      const resourcesData = classFeatures
        .filter(feature => feature.type === 'resource')
        .map(feature => ({
          id: feature.id || feature.name.toLowerCase().replace(/\s+/g, '_'),
          name: feature.name,
          className: feature.class || 'Unknown'
        }));

      setRegistryData({
        skills: skillsData,
        resources: resourcesData
      });
    } catch (error) {
      console.warn('Failed to load registry data for EffectsBuilder:', error);
    }
  }, []);

  // Load registry data on mount
  useEffect(() => {
    loadRegistryData();
  }, [loadRegistryData]);

  // Sync with external value
  useEffect(() => {
    if (value.length > 0) {
      setEffects(value);
    }
  }, [value]);

  // Notify parent of changes
  const handleChange = useCallback((newEffects: Effect[]) => {
    setEffects(newEffects);
    // Filter out empty effects before passing to parent
    const validEffects = newEffects.filter(e => e.type && e.target);
    onChange?.(validEffects);
  }, [onChange]);

  // Validate effects
  const validateEffects = useCallback((effectsToValidate: Effect[]) => {
    const warnings: Record<number, string[]> = {};
    let isValid = true;

    effectsToValidate.forEach((effect, index) => {
      const effectWarnings: string[] = [];

      if (effect.type && !effect.target) {
        effectWarnings.push('Target is required when type is set');
        isValid = false;
      }

      // Check if target exists in registry for dynamic types
      if (effect.type === 'skill_proficiency' && effect.target) {
        const skillExists = registryData.skills.some(s => s.id === effect.target || s.name === effect.target);
        if (!skillExists && !effect.target.startsWith('custom:')) {
          effectWarnings.push(`Skill "${effect.target}" not found in registry`);
        }
      }

      if (effect.type === 'resource_grant' && effect.target) {
        const resourceExists = registryData.resources.some(r => r.id === effect.target);
        if (!resourceExists && !effect.target.startsWith('custom:')) {
          effectWarnings.push(`Resource "${effect.target}" not found in registry`);
        }
      }

      if (effectWarnings.length > 0) {
        warnings[index] = effectWarnings;
      }
    });

    setValidationWarnings(warnings);
    onValidChange?.(isValid);
  }, [registryData, onValidChange]);

  // Run validation when effects change
  useEffect(() => {
    validateEffects(effects);
  }, [effects, validateEffects]);

  // Toggle effect expansion
  const toggleEffectExpanded = useCallback((index: number) => {
    setExpandedEffects(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  // Add new effect
  const addEffect = useCallback(() => {
    const newEffects = [...effects, createEmptyEffect()];
    handleChange(newEffects);
    setExpandedEffects(prev => new Set([...prev, newEffects.length - 1]));
  }, [effects, handleChange]);

  // Remove effect
  const removeEffect = useCallback((index: number) => {
    if (effects.length <= 1) return;
    const newEffects = effects.filter((_, i) => i !== index);
    handleChange(newEffects.length > 0 ? newEffects : [createEmptyEffect()]);
    setExpandedEffects(prev => {
      const next = new Set<number>();
      prev.forEach(i => {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
      });
      return next;
    });
  }, [effects, handleChange]);

  // Update effect field
  const updateEffect = useCallback((index: number, field: keyof Effect, newValue: string | number | boolean | undefined) => {
    const newEffects = [...effects];
    newEffects[index] = { ...newEffects[index], [field]: newValue };

    // Reset target when type changes
    if (field === 'type') {
      newEffects[index].target = '';
      newEffects[index].value = undefined;
    }

    handleChange(newEffects);
  }, [effects, handleChange]);

  // Handle custom JSON input
  const handleCustomJsonChange = useCallback((index: number, json: string) => {
    setCustomJsonValues(prev => ({ ...prev, [index]: json }));
    try {
      const parsed = JSON.parse(json);
      if (parsed && typeof parsed === 'object') {
        const newEffects = [...effects];
        newEffects[index] = {
          type: parsed.type || '',
          target: parsed.target || '',
          value: parsed.value,
          condition: parsed.condition || ''
        };
        handleChange(newEffects);
      }
    } catch {
      // Invalid JSON, don't update
    }
  }, [effects, handleChange]);

  // Toggle custom JSON mode
  const toggleCustomJson = useCallback((index: number) => {
    setShowCustomJson(prev => {
      const next = { ...prev, [index]: !prev[index] };
      if (!prev[index]) {
        // Entering custom mode, serialize current effect
        setCustomJsonValues(prevVals => ({
          ...prevVals,
          [index]: JSON.stringify(effects[index], null, 2)
        }));
      }
      return next;
    });
  }, [effects]);

  // Get target options based on effect type
  const getTargetOptions = useCallback((effectType: EffectType | string): Array<{ value: string; label: string; description?: string }> => {
    switch (effectType) {
      case 'stat_bonus':
        return ABILITIES.map(a => ({ value: a, label: a, description: `${a} ability score` }));

      case 'skill_proficiency':
        return [
          ...registryData.skills.map(s => ({ value: s.id, label: s.name, description: 'Skill' })),
          { value: 'expertise', label: 'Expertise', description: 'Double proficiency' }
        ];

      case 'ability_unlock':
        return ABILITY_UNLOCKS.map(a => ({ value: a.value, label: a.label, description: a.description }));

      case 'passive_modifier':
        return PASSIVE_MODIFIER_TARGETS.map(t => ({ value: t.value, label: t.label, description: t.description }));

      case 'resource_grant':
        return registryData.resources.map(r => ({
          value: r.id,
          label: r.name,
          description: `${r.className} resource`
        }));

      case 'spell_slot_bonus':
        return SPELL_SLOT_LEVELS.map(level => ({
          value: String(level),
          label: `Level ${level}`,
          description: `Spell slots`
        }));

      default:
        return [];
    }
  }, [registryData]);

  // Get value input type based on effect type
  const getValueInputType = useCallback((effectType: EffectType | string): 'number' | 'text' | 'boolean' | 'none' => {
    switch (effectType) {
      case 'stat_bonus':
      case 'passive_modifier':
      case 'spell_slot_bonus':
      case 'resource_grant':
        return 'number';

      case 'ability_unlock':
        return 'boolean';

      case 'skill_proficiency':
        return 'text'; // Can be 'expertise' or skill name

      default:
        return 'text';
    }
  }, []);

  // Get placeholder for value input
  const getValuePlaceholder = useCallback((effectType: EffectType | string): string => {
    switch (effectType) {
      case 'stat_bonus':
        return 'e.g., 2';
      case 'passive_modifier':
        return 'e.g., 5';
      case 'resource_grant':
        return 'e.g., 4';
      case 'spell_slot_bonus':
        return 'e.g., 1';
      case 'skill_proficiency':
        return 'skill name or "expertise"';
      default:
        return 'Value';
    }
  }, []);

  // Get effect type description
  const getEffectTypeDescription = useCallback((type: string): string => {
    const found = EFFECT_TYPES.find(t => t.value === type);
    return found?.description || '';
  }, []);

  return (
    <div className={`effects-builder ${className}`}>
      {/* Header */}
      <div className="effects-builder-header">
        <h4 className="effects-builder-title">
          <Zap size={16} aria-hidden="true" />
          Effects
          <span className="effects-builder-optional">(optional)</span>
        </h4>
        <button
          type="button"
          className="effects-builder-refresh-btn"
          onClick={loadRegistryData}
          disabled={disabled}
          title="Refresh options from registry"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Hint */}
      {showHints && (
        <p className="effects-builder-hint">
          Add structured effects for programmatic handling by the game engine.
        </p>
      )}

      {/* Effects List */}
      <div className="effects-list">
        {effects.map((effect, index) => {
          const isExpanded = expandedEffects.has(index);
          const isCustomMode = showCustomJson[index];
          const warnings = validationWarnings[index] || [];
          const hasWarnings = warnings.length > 0;
          const targetOptions = getTargetOptions(effect.type);

          return (
            <div key={index} className={`effect-item ${hasWarnings ? 'has-warnings' : ''}`}>
              {/* Effect Header */}
              <div
                className="effect-header"
                onClick={() => toggleEffectExpanded(index)}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
              >
                <div className="effect-header-info">
                  <span className="effect-number">Effect {index + 1}</span>
                  <span className="effect-summary">
                    {effect.type ? (
                      <>
                        <span className="effect-type-badge">{EFFECT_TYPES.find(t => t.value === effect.type)?.label || effect.type}</span>
                        {effect.target && <span className="effect-target">→ {effect.target}</span>}
                      </>
                    ) : (
                      <span className="effect-empty">Click to configure</span>
                    )}
                  </span>
                </div>
                <div className="effect-header-actions">
                  {effects.length > 1 && (
                    <button
                      type="button"
                      className="effect-remove-btn"
                      onClick={(e) => { e.stopPropagation(); removeEffect(index); }}
                      disabled={disabled}
                      title="Remove effect"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {/* Effect Content */}
              {isExpanded && (
                <div className="effect-content">
                  {/* Custom JSON Toggle */}
                  <button
                    type="button"
                    className="effect-custom-toggle"
                    onClick={() => toggleCustomJson(index)}
                    disabled={disabled}
                  >
                    <Code size={14} />
                    {isCustomMode ? 'Use Form' : 'Custom JSON'}
                  </button>

                  {isCustomMode ? (
                    /* Custom JSON Input */
                    <div className="effect-custom-json">
                      <label className="effect-label">Raw JSON</label>
                      <textarea
                        value={customJsonValues[index] || ''}
                        onChange={(e) => handleCustomJsonChange(index, e.target.value)}
                        placeholder={`{\n  "type": "stat_bonus",\n  "target": "STR",\n  "value": 2\n}`}
                        className="effect-json-textarea"
                        disabled={disabled}
                        rows={5}
                      />
                      <span className="effect-hint">Enter raw JSON for advanced effects</span>
                    </div>
                  ) : (
                    /* Form Fields */
                    <div className="effect-fields">
                      {/* Type Selector */}
                      <div className="effect-field">
                        <label className="effect-label">
                          Type
                          <span className="effect-required">*</span>
                        </label>
                        <select
                          value={effect.type}
                          onChange={(e) => updateEffect(index, 'type', e.target.value)}
                          className="effect-select"
                          disabled={disabled}
                        >
                          <option value="">Select type...</option>
                          {EFFECT_TYPES.map(type => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                        {effect.type && (
                          <span className="effect-hint">{getEffectTypeDescription(effect.type)}</span>
                        )}
                      </div>

                      {/* Target Selector */}
                      {effect.type && (
                        <div className="effect-field">
                          <label className="effect-label">
                            Target
                            <span className="effect-required">*</span>
                          </label>
                          {targetOptions.length > 10 ? (
                            <input
                              type="text"
                              value={effect.target}
                              onChange={(e) => updateEffect(index, 'target', e.target.value)}
                              list={`effect-targets-${index}`}
                              className="effect-input"
                              disabled={disabled}
                              placeholder="Type to search..."
                            />
                          ) : (
                            <select
                              value={effect.target}
                              onChange={(e) => updateEffect(index, 'target', e.target.value)}
                              className="effect-select"
                              disabled={disabled}
                            >
                              <option value="">Select target...</option>
                              {targetOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          )}
                          {targetOptions.length > 10 && (
                            <datalist id={`effect-targets-${index}`}>
                              {targetOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </datalist>
                          )}
                        </div>
                      )}

                      {/* Value Input */}
                      {effect.type && effect.target && (
                        <div className="effect-field">
                          <label className="effect-label">Value</label>
                          {getValueInputType(effect.type) === 'number' && (
                            <input
                              type="number"
                              value={effect.value as number ?? ''}
                              onChange={(e) => updateEffect(index, 'value', e.target.value ? parseFloat(e.target.value) : undefined)}
                              className="effect-input"
                              disabled={disabled}
                              placeholder={getValuePlaceholder(effect.type)}
                            />
                          )}
                          {getValueInputType(effect.type) === 'text' && (
                            <input
                              type="text"
                              value={effect.value as string ?? ''}
                              onChange={(e) => updateEffect(index, 'value', e.target.value || undefined)}
                              className="effect-input"
                              disabled={disabled}
                              placeholder={getValuePlaceholder(effect.type)}
                            />
                          )}
                          {getValueInputType(effect.type) === 'boolean' && (
                            <label className="effect-checkbox">
                              <input
                                type="checkbox"
                                checked={effect.value === true}
                                onChange={(e) => updateEffect(index, 'value', e.target.checked)}
                                disabled={disabled}
                              />
                              <span>Enabled</span>
                            </label>
                          )}
                          {getValueInputType(effect.type) === 'none' && (
                            <span className="effect-hint">No value needed for this effect type</span>
                          )}
                        </div>
                      )}

                      {/* Condition Input */}
                      {effect.type && effect.target && (
                        <div className="effect-field">
                          <label className="effect-label">
                            Condition
                            <span className="effect-optional">(optional)</span>
                          </label>
                          <input
                            type="text"
                            value={effect.condition || ''}
                            onChange={(e) => updateEffect(index, 'condition', e.target.value || undefined)}
                            className="effect-input"
                            disabled={disabled}
                            placeholder="e.g., when wielding martial weapon"
                          />
                          <span className="effect-hint">Optional condition for effect to apply</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Warnings */}
                  {hasWarnings && (
                    <div className="effect-warnings">
                      {warnings.map((warning, wIndex) => (
                        <div key={wIndex} className="effect-warning">
                          <AlertCircle size={12} />
                          <span>{warning}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Effect Button */}
      <button
        type="button"
        className="effects-add-btn"
        onClick={addEffect}
        disabled={disabled}
      >
        <Plus size={14} />
        Add Effect
      </button>

      {/* Help Section */}
      {showHints && (
        <div className="effects-help">
          <HelpCircle size={14} />
          <span>
            Effects define mechanical changes to characters.
            Use the dropdowns for common options or Custom JSON for advanced effects.
          </span>
        </div>
      )}
    </div>
  );
}

export default EffectsBuilder;

// Export utilities and constants
export {
  ABILITIES,
  ABILITY_UNLOCKS,
  PASSIVE_MODIFIER_TARGETS,
  SPELL_SLOT_LEVELS,
  createEmptyEffect
};
