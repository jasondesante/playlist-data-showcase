/**
 * Encounter Configuration Form (Task 8.2.4)
 *
 * CR input, enemy count, category, archetype, seed, rarity,
 * difficulty multiplier, and stat level overrides.
 * Collapsible stat level overrides with quick presets.
 */

import { useState, useCallback } from 'react';
import {
    type EnemyCategory,
    type EnemyArchetype,
    type EnemyRarity,
    type StatLevelOverrides,
} from 'playlist-data-engine';
import { EncounterConfigUI, STAT_LEVEL_PRESETS } from '@/types/simulation';
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import './EncounterConfigForm.css';

const CATEGORIES: { value: EnemyCategory; label: string }[] = [
    { value: 'humanoid', label: 'Humanoid' },
    { value: 'beast', label: 'Beast' },
    { value: 'undead', label: 'Undead' },
    { value: 'fiend', label: 'Fiend' },
    { value: 'elemental', label: 'Elemental' },
    { value: 'construct', label: 'Construct' },
    { value: 'dragon', label: 'Dragon' },
    { value: 'monstrosity', label: 'Monstrosity' },
];

const ARCHETYPES: { value: EnemyArchetype; label: string }[] = [
    { value: 'brute', label: 'Brute' },
    { value: 'archer', label: 'Archer' },
    { value: 'support', label: 'Support' },
];

const RARITIES: { value: EnemyRarity; label: string }[] = [
    { value: 'common', label: 'Common' },
    { value: 'uncommon', label: 'Uncommon' },
    { value: 'elite', label: 'Elite' },
    { value: 'boss', label: 'Boss' },
];

const CR_OPTIONS = [0.125, 0.25, 0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30];

interface EncounterConfigFormProps {
    config: EncounterConfigUI;
    onChange: (config: EncounterConfigUI) => void;
    disabled?: boolean;
}

export function EncounterConfigForm({
    config,
    onChange,
    disabled = false,
}: EncounterConfigFormProps) {
    const [showStatLevels, setShowStatLevels] = useState(false);

    const updateField = useCallback(
        <K extends keyof EncounterConfigUI>(key: K, value: EncounterConfigUI[K]) => {
            onChange({ ...config, [key]: value });
        },
        [config, onChange],
    );

    const updateStatLevel = useCallback(
        (key: keyof StatLevelOverrides, value: number | undefined) => {
            const statLevels = { ...config.statLevels, [key]: value };
            // Remove undefined keys
            if (value === undefined) {
                delete statLevels[key];
            }
            onChange({ ...config, statLevels: Object.keys(statLevels).length > 0 ? statLevels : undefined });
        },
        [config, onChange],
    );

    const applyPreset = useCallback(
        (overrides: StatLevelOverrides) => {
            onChange({ ...config, statLevels: { ...overrides } });
        },
        [config, onChange],
    );

    const resetStatLevels = useCallback(() => {
        onChange({ ...config, statLevels: undefined });
    }, [config, onChange]);

    const hasStatOverrides = config.statLevels !== undefined &&
        Object.keys(config.statLevels).length > 0;

    const cr = config.cr;
    const crDisplay = cr < 1 ? cr.toString() : `CR ${cr}`;

    return (
        <div className="encounter-config-form">
            <div className="encounter-config-grid">
                {/* CR */}
                <div className="ecf-field ecf-field-wide">
                    <label className="ecf-label" htmlFor="ecf-cr">
                        Challenge Rating
                    </label>
                    <select
                        id="ecf-cr"
                        className="ecf-select"
                        value={cr}
                        onChange={(e) => updateField('cr', parseFloat(e.target.value))}
                        disabled={disabled}
                    >
                        {CR_OPTIONS.map((crVal) => (
                            <option key={crVal} value={crVal}>
                                {crVal < 1 ? crVal.toString() : `CR ${crVal}`}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Enemy Count */}
                <div className="ecf-field">
                    <label className="ecf-label" htmlFor="ecf-count">
                        Count
                    </label>
                    <input
                        id="ecf-count"
                        type="number"
                        className="ecf-input"
                        min={1}
                        max={10}
                        value={config.enemyCount}
                        onChange={(e) => updateField('enemyCount', Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                        disabled={disabled}
                    />
                </div>

                {/* Category */}
                <div className="ecf-field">
                    <label className="ecf-label" htmlFor="ecf-category">
                        Category
                    </label>
                    <select
                        id="ecf-category"
                        className="ecf-select"
                        value={config.category}
                        onChange={(e) => updateField('category', e.target.value as EnemyCategory)}
                        disabled={disabled}
                    >
                        {CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                    </select>
                </div>

                {/* Archetype */}
                <div className="ecf-field">
                    <label className="ecf-label" htmlFor="ecf-archetype">
                        Archetype
                    </label>
                    <select
                        id="ecf-archetype"
                        className="ecf-select"
                        value={config.archetype}
                        onChange={(e) => updateField('archetype', e.target.value as EnemyArchetype)}
                        disabled={disabled}
                    >
                        {ARCHETYPES.map((a) => (
                            <option key={a.value} value={a.value}>{a.label}</option>
                        ))}
                    </select>
                </div>

                {/* Rarity */}
                <div className="ecf-field">
                    <label className="ecf-label" htmlFor="ecf-rarity">
                        Rarity
                    </label>
                    <select
                        id="ecf-rarity"
                        className="ecf-select"
                        value={config.rarity}
                        onChange={(e) => updateField('rarity', e.target.value as EnemyRarity)}
                        disabled={disabled}
                    >
                        {RARITIES.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                    </select>
                </div>

                {/* Difficulty Multiplier */}
                <div className="ecf-field">
                    <label className="ecf-label" htmlFor="ecf-diff-mult">
                        Diff Mult
                    </label>
                    <input
                        id="ecf-diff-mult"
                        type="number"
                        className="ecf-input"
                        min={0.1}
                        max={5}
                        step={0.1}
                        value={config.difficultyMultiplier}
                        onChange={(e) => updateField('difficultyMultiplier', Math.max(0.1, Math.min(5, parseFloat(e.target.value) || 1)))}
                        disabled={disabled}
                    />
                </div>

                {/* Seed */}
                <div className="ecf-field ecf-field-wide">
                    <label className="ecf-label" htmlFor="ecf-seed">
                        Seed
                    </label>
                    <input
                        id="ecf-seed"
                        type="text"
                        className="ecf-input"
                        placeholder="Random if empty"
                        value={config.seed}
                        onChange={(e) => updateField('seed', e.target.value)}
                        disabled={disabled}
                    />
                </div>
            </div>

            {/* Stat Level Overrides (collapsible) */}
            <div className="ecf-stat-levels-section">
                <button
                    type="button"
                    className="ecf-stat-levels-toggle"
                    onClick={() => setShowStatLevels(!showStatLevels)}
                    disabled={disabled}
                >
                    <span className="ecf-stat-levels-toggle-text">
                        Stat Level Overrides
                        {hasStatOverrides && <span className="ecf-stat-badge">Custom</span>}
                    </span>
                    {showStatLevels ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showStatLevels && (
                    <div className="ecf-stat-levels-content">
                        <p className="ecf-stat-levels-hint">
                            Override HP/Attack/Defense scaling to a different effective level.
                            Default: all match {crDisplay}.
                        </p>

                        <div className="ecf-stat-levels-presets">
                            {STAT_LEVEL_PRESETS.map((preset) => (
                                <button
                                    key={preset.label}
                                    type="button"
                                    className="ecf-preset-btn"
                                    onClick={() => applyPreset(preset.overrides)}
                                    disabled={disabled}
                                    title={preset.description}
                                >
                                    {preset.label}
                                </button>
                            ))}
                            <button
                                type="button"
                                className="ecf-preset-btn ecf-preset-reset"
                                onClick={resetStatLevels}
                                disabled={disabled}
                                title="Reset to match CR"
                            >
                                <RotateCcw size={11} />
                                Reset
                            </button>
                        </div>

                        <div className="ecf-stat-sliders">
                            {/* HP Level */}
                            <div className="ecf-stat-slider">
                                <label className="ecf-stat-slider-label">
                                    <span>HP Level</span>
                                    {config.statLevels?.hpLevel !== undefined && (
                                        <span className="ecf-stat-value">
                                            {config.statLevels.hpLevel}
                                            {config.statLevels.hpLevel > cr && <span className="ecf-stat-over">+</span>}
                                            {config.statLevels.hpLevel < cr && <span className="ecf-stat-under">-</span>}
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="range"
                                    min={1}
                                    max={20}
                                    value={config.statLevels?.hpLevel ?? Math.round(cr)}
                                    onChange={(e) => updateStatLevel('hpLevel', parseInt(e.target.value))}
                                    disabled={disabled}
                                />
                            </div>

                            {/* Attack Level */}
                            <div className="ecf-stat-slider">
                                <label className="ecf-stat-slider-label">
                                    <span>Attack Level</span>
                                    {config.statLevels?.attackLevel !== undefined && (
                                        <span className="ecf-stat-value">
                                            {config.statLevels.attackLevel}
                                            {config.statLevels.attackLevel > cr && <span className="ecf-stat-over">+</span>}
                                            {config.statLevels.attackLevel < cr && <span className="ecf-stat-under">-</span>}
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="range"
                                    min={1}
                                    max={20}
                                    value={config.statLevels?.attackLevel ?? Math.round(cr)}
                                    onChange={(e) => updateStatLevel('attackLevel', parseInt(e.target.value))}
                                    disabled={disabled}
                                />
                            </div>

                            {/* Defense Level */}
                            <div className="ecf-stat-slider">
                                <label className="ecf-stat-slider-label">
                                    <span>Defense Level</span>
                                    {config.statLevels?.defenseLevel !== undefined && (
                                        <span className="ecf-stat-value">
                                            {config.statLevels.defenseLevel}
                                            {config.statLevels.defenseLevel > cr && <span className="ecf-stat-over">+</span>}
                                            {config.statLevels.defenseLevel < cr && <span className="ecf-stat-under">-</span>}
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="range"
                                    min={1}
                                    max={20}
                                    value={config.statLevels?.defenseLevel ?? Math.round(cr)}
                                    onChange={(e) => updateStatLevel('defenseLevel', parseInt(e.target.value))}
                                    disabled={disabled}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
