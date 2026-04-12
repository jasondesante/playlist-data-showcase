/**
 * EnemyExplorer Component
 *
 * Interactive enemy bestiary that lets users browse all enemy templates,
 * filter by category/archetype/rarity, and visualize how each enemy scales
 * across CR levels 1–20. Generates real enemies at each CR to show actual
 * stat distributions, making it a powerful tool for building encounter intuition.
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
    EnemyGenerator,
    DEFAULT_ENEMY_TEMPLATES,
    getXPForCR,
} from 'playlist-data-engine';
import type {
    EnemyTemplate,
    EnemyCategory,
    EnemyArchetype,
    EnemyRarity,
    CharacterSheet,
} from 'playlist-data-engine';
import { estimateEnemyDPR, getEnemyWeaponNames } from '@/utils/estimateEnemyDPR';
import {
    Search,
    Eye,
    ChevronRight,
    Heart,
    Shield,
    Crosshair,
    Star,
    Skull,
    Swords,
    Zap,
    Filter,
    X,
    Grid3X3,
    List,
} from 'lucide-react';
import './EnemyExplorer.css';

// ─── Constants ─────────────────────────────────────────────────────────────

const CR_RANGE = [0.25, 0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 26, 27, 28, 29, 30] as const;

const ALL_CATEGORIES: EnemyCategory[] = ['humanoid', 'beast', 'undead', 'dragon', 'fiend', 'construct', 'elemental', 'monstrosity'];
const ALL_ARCHETYPES: EnemyArchetype[] = ['brute', 'archer', 'support'];
const ALL_RARITIES: EnemyRarity[] = ['common', 'uncommon', 'elite', 'boss'];

const CATEGORY_LABELS: Record<EnemyCategory, string> = {
    humanoid: 'Humanoid',
    beast: 'Beast',
    undead: 'Undead',
    dragon: 'Dragon',
    fiend: 'Fiend',
    construct: 'Construct',
    elemental: 'Elemental',
    monstrosity: 'Monstrosity',
};

const ARCHETYPE_LABELS: Record<EnemyArchetype, string> = {
    brute: 'Brute',
    archer: 'Archer',
    support: 'Support',
};

const RARITY_LABELS: Record<EnemyRarity, string> = {
    common: 'Common',
    uncommon: 'Uncommon',
    elite: 'Elite',
    boss: 'Boss',
};

const RARITY_COLORS: Record<EnemyRarity, string> = {
    common: 'hsl(210 20% 55%)',
    uncommon: 'hsl(150 60% 45%)',
    elite: 'hsl(270 60% 55%)',
    boss: 'hsl(35 90% 55%)',
};

function formatCR(cr: number): string {
    if (cr === 0.125) return '1/8';
    if (cr === 0.25) return '1/4';
    if (cr === 0.5) return '1/2';
    return String(cr);
}

// ─── Types ─────────────────────────────────────────────────────────────────

interface EnemyStatProfile {
    cr: number;
    rarity: EnemyRarity;
    enemy: CharacterSheet;
    dpr: number;
}

interface FilterState {
    category: EnemyCategory | 'all';
    archetype: EnemyArchetype | 'all';
    rarity: EnemyRarity | 'all';
    search: string;
}

// ─── Stat Bar (mini bar chart) ────────────────────────────────────────────

function StatBar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <div className="ee-stat-bar" title={`${label}: ${value}`}>
            <span className="ee-stat-bar-label">{label}</span>
            <div className="ee-stat-bar-track">
                <div className="ee-stat-bar-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
            <span className="ee-stat-bar-value">{value}</span>
        </div>
    );
}

// ─── CR Spectrum Row ──────────────────────────────────────────────────────

function CRSpectrumRow({ profile, isSelected, onClick }: {
    profile: EnemyStatProfile;
    isSelected: boolean;
    onClick: () => void;
}) {
    const { cr, rarity, enemy, dpr } = profile;
    return (
        <button
            className={`ee-cr-row ${isSelected ? 'ee-cr-row-selected' : ''}`}
            onClick={onClick}
            style={{ '--rarity-color': RARITY_COLORS[rarity] } as React.CSSProperties}
        >
            <span className="ee-cr-badge">CR {formatCR(cr)}</span>
            <span className="ee-rarity-badge" style={{ color: RARITY_COLORS[rarity] }}>{RARITY_LABELS[rarity]}</span>
            <div className="ee-cr-stats">
                <span className="ee-cr-stat" title="Hit Points">
                    <Heart size={11} /> {enemy.hp.max}
                </span>
                <span className="ee-cr-stat" title="Armor Class">
                    <Shield size={11} /> {enemy.armor_class}
                </span>
                <span className="ee-cr-stat" title="Estimated DPR">
                    <Crosshair size={11} /> ~{dpr.toFixed(1)}
                </span>
                <span className="ee-cr-stat" title="XP">
                    <Skull size={11} /> {getXPForCR(cr).toLocaleString()}
                </span>
            </div>
            <span className="ee-cr-weapons" title="Equipped weapons">
                {getEnemyWeaponNames(enemy).join(', ') || '—'}
            </span>
        </button>
    );
}

// ─── Selected Enemy Detail ────────────────────────────────────────────────

function EnemyDetail({ profile, template, crProfiles }: { profile: EnemyStatProfile; template: EnemyTemplate; crProfiles: EnemyStatProfile[] }) {
    const { enemy, dpr, cr, rarity } = profile;
    const stats = enemy.ability_scores;

    const maxHP = 400;
    const maxAC = 25;
    const maxDPR = 80;

    return (
        <div className="ee-detail">
            <div className="ee-detail-header">
                <div className="ee-detail-name-row">
                    <h3 className="ee-detail-name">{enemy.name}</h3>
                    <span className="ee-detail-cr">CR {formatCR(cr)}</span>
                    <span className="ee-detail-rarity" style={{ color: RARITY_COLORS[rarity] }}>
                        {RARITY_LABELS[rarity]}
                    </span>
                </div>
                <div className="ee-detail-tags">
                    <span className="ee-tag">{CATEGORY_LABELS[template.category]}</span>
                    <span className="ee-tag">{ARCHETYPE_LABELS[template.archetype]}</span>
                    <span className="ee-tag">Level {enemy.level}</span>
                    <span className="ee-tag">Prof +{enemy.proficiency_bonus}</span>
                </div>
            </div>

            {/* Ability Scores */}
            <div className="ee-detail-scores">
                {(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const).map(stat => (
                    <div key={stat} className="ee-score" title={`${stat}: ${stats[stat]} (mod: ${enemy.ability_modifiers[stat]})`}>
                        <span className="ee-score-name">{stat}</span>
                        <span className="ee-score-val">{stats[stat]}</span>
                        <span className="ee-score-mod">
                            {enemy.ability_modifiers[stat] >= 0 ? '+' : ''}{enemy.ability_modifiers[stat]}
                        </span>
                    </div>
                ))}
            </div>

            {/* Stat Bars */}
            <div className="ee-detail-bars">
                <StatBar value={enemy.hp.max} max={maxHP} color="hsl(0 70% 55%)" label="HP" />
                <StatBar value={enemy.armor_class} max={maxAC} color="hsl(210 70% 55%)" label="AC" />
                <StatBar value={dpr} max={maxDPR} color="hsl(35 90% 55%)" label="DPR" />
                <StatBar value={enemy.speed} max={60} color="hsl(150 60% 45%)" label="Speed" />
            </div>

            {/* Scaling Chart */}
            <ScalingChart profiles={crProfiles} />

            {/* Signature Ability */}
            <div className="ee-detail-ability">
                <Zap size={13} className="ee-detail-ability-icon" />
                <div className="ee-detail-ability-info">
                    <span className="ee-detail-ability-name">{template.signatureAbility.name}</span>
                    <span className="ee-detail-ability-desc">{template.signatureAbility.description}</span>
                    <span className="ee-detail-ability-dmg">
                        {template.signatureAbility.damageType} ({template.signatureAbility.attackType})
                    </span>
                </div>
            </div>

            {/* Weapons */}
            {enemy.equipment?.weapons && enemy.equipment.weapons.length > 0 && (
                <div className="ee-detail-weapons">
                    <Swords size={13} />
                    <span className="ee-detail-weapon-list">
                        {enemy.equipment.weapons.filter((w: any) => w.equipped).map((w: any, idx: number) => (
                            <span key={idx} className="ee-detail-weapon">
                                {w.name} ({w.damage_dice}{w.damage ? ` + ${w.damage.split('+').pop()}` : ''} {w.damage_type})
                            </span>
                        ))}
                    </span>
                </div>
            )}

            {/* Resistances */}
            {template.resistances && (template.resistances.resistances?.length || template.resistances.immunities?.length) && (
                <div className="ee-detail-resistances">
                    <Shield size={13} />
                    <div className="ee-detail-res-list">
                        {template.resistances.resistances && template.resistances.resistances.length > 0 && (
                            <span className="ee-resist">Resist: {template.resistances.resistances.join(', ')}</span>
                        )}
                        {template.resistances.immunities && template.resistances.immunities.length > 0 && (
                            <span className="ee-immune">Immune: {template.resistances.immunities.join(', ')}</span>
                        )}
                    </div>
                </div>
            )}

            {/* XP */}
            <div className="ee-detail-xp">
                <Skull size={13} />
                <span>{getXPForCR(cr).toLocaleString()} XP</span>
            </div>
        </div>
    );
}

// ─── Archetype color dot ─────────────────────────────────────────────────

const ARCHETYPE_COLORS: Record<EnemyArchetype, string> = {
    brute: 'hsl(0 70% 55%)',
    archer: 'hsl(210 70% 55%)',
    support: 'hsl(150 60% 45%)',
};

// ─── Mini Sparkline (contained, no overflow) ─────────────────────────────

function Sparkline({ values, color, width = 100, height = 20 }: {
    values: number[];
    color: string;
    width?: number;
    height?: number;
}) {
    if (values.length < 2) return null;
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;
    const pad = 1;
    const step = (width - pad * 2) / (values.length - 1);
    const points = values.map((v, i) =>
        `${pad + i * step},${height - pad - ((v - min) / range) * (height - pad * 2)}`
    ).join(' ');
    return (
        <svg
            viewBox={`0 0 ${width} ${height}`}
            width={width}
            height={height}
            className="ee-sparkline"
            style={{ overflow: 'visible' }}
        >
            <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
        </svg>
    );
}

// ─── Scaling Chart (larger, for detail view) ─────────────────────────────

function ScalingChart({ profiles }: { profiles: EnemyStatProfile[] }) {
    const hpColor = 'hsl(0 70% 55%)';
    const acColor = 'hsl(210 70% 55%)';
    const dprColor = 'hsl(35 90% 55%)';

    const width = 280;
    const height = 100;
    const pad = { top: 8, right: 8, bottom: 18, left: 30 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;

    if (profiles.length === 0) return null;

    // Separate by rarity for distinct lines
    const byRarity = new Map<EnemyRarity, EnemyStatProfile[]>();
    for (const p of profiles) {
        const arr = byRarity.get(p.rarity) || [];
        arr.push(p);
        byRarity.set(p.rarity, arr);
    }

    // Collect all values for axis scaling
    const allHP = profiles.map(p => p.enemy.hp.max);
    const allAC = profiles.map(p => p.enemy.armor_class);
    const allDPR = profiles.map(p => p.dpr);
    const allCR = profiles.map(p => p.cr);

    const maxCR = Math.max(...allCR, 1);
    const maxHP = Math.max(...allHP, 1);
    const maxAC = Math.max(...allAC, 1);
    const maxDPR = Math.max(...allDPR, 1);

    const xScale = (cr: number) => pad.left + (cr / maxCR) * plotW;

    return (
        <div className="ee-scaling-chart">
            <svg viewBox={`0 0 ${width} ${height}`} width="100%" className="ee-chart-svg">
                {/* Grid lines */}
                {[0.25, 0.5, 1].map(v => (
                    <line
                        key={v}
                        x1={xScale(v)} y1={pad.top}
                        x2={xScale(v)} y2={height - pad.bottom}
                        stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="2,2"
                    />
                ))}
                {[5, 10, 15, 20].map(v => (
                    <line
                        key={v}
                        x1={xScale(v)} y1={pad.top}
                        x2={xScale(v)} y2={height - pad.bottom}
                        stroke="hsl(var(--border))" strokeWidth="0.5"
                    />
                ))}

                {/* X axis labels */}
                {[1, 5, 10, 15, 20].map(v => (
                    <text key={v} x={xScale(v)} y={height - 2} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="6" fontFamily="inherit">
                        {v}
                    </text>
                ))}

                {/* HP line (red) */}
                {Array.from(byRarity.entries()).map(([rarity, entries]) => {
                    const pts = entries.map(p =>
                        `${xScale(p.cr)},${pad.top + plotH - (p.enemy.hp.max / maxHP) * plotH}`
                    ).join(' ');
                    return <polyline key={`hp-${rarity}`} fill="none" stroke={hpColor} strokeWidth="1.2" strokeLinejoin="round" points={pts} opacity={0.8} />;
                })}

                {/* AC line (blue) */}
                {Array.from(byRarity.entries()).map(([rarity, entries]) => {
                    const pts = entries.map(p =>
                        `${xScale(p.cr)},${pad.top + plotH - (p.enemy.armor_class / maxAC) * plotH}`
                    ).join(' ');
                    return <polyline key={`ac-${rarity}`} fill="none" stroke={acColor} strokeWidth="1.2" strokeLinejoin="round" points={pts} opacity={0.8} />;
                })}

                {/* DPR line (yellow) */}
                {Array.from(byRarity.entries()).map(([rarity, entries]) => {
                    const pts = entries.map(p =>
                        `${xScale(p.cr)},${pad.top + plotH - (p.dpr / maxDPR) * plotH}`
                    ).join(' ');
                    return <polyline key={`dpr-${rarity}`} fill="none" stroke={dprColor} strokeWidth="1.2" strokeLinejoin="round" points={pts} opacity={0.8} />;
                })}
            </svg>

            <div className="ee-chart-legend">
                <span className="ee-chart-legend-item"><span className="ee-chart-swatch" style={{ backgroundColor: hpColor }} /> HP</span>
                <span className="ee-chart-legend-item"><span className="ee-chart-swatch" style={{ backgroundColor: acColor }} /> AC</span>
                <span className="ee-chart-legend-item"><span className="ee-chart-swatch" style={{ backgroundColor: dprColor }} /> DPR</span>
                <span className="ee-chart-legend-item ee-chart-legend-note">(normalized to each axis max)</span>
            </div>
        </div>
    );
}

// ─── Main EnemyExplorer Component ─────────────────────────────────────────

export function EnemyExplorer() {
    // Filters
    const [filters, setFilters] = useState<FilterState>({
        category: 'all',
        archetype: 'all',
        rarity: 'all',
        search: '',
    });

    // Selected template
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

    // Rarity filter for spectrum view
    const [spectrumRarity, setSpectrumRarity] = useState<EnemyRarity | 'all'>('all');

    // Selected CR profile for detail view
    const [selectedProfile, setSelectedProfile] = useState<EnemyStatProfile | null>(null);

    // View mode
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Ref for scroll-to behavior
    const spectrumRef = useRef<HTMLDivElement>(null);

    // Filtered templates
    const filteredTemplates = useMemo(() => {
        let templates = DEFAULT_ENEMY_TEMPLATES;

        if (filters.category !== 'all') {
            templates = templates.filter(t => t.category === filters.category);
        }
        if (filters.archetype !== 'all') {
            templates = templates.filter(t => t.archetype === filters.archetype);
        }
        if (filters.search) {
            const q = filters.search.toLowerCase();
            templates = templates.filter(t =>
                t.name.toLowerCase().includes(q) ||
                t.id.toLowerCase().includes(q) ||
                t.category.toLowerCase().includes(q) ||
                t.signatureAbility.name.toLowerCase().includes(q)
            );
        }

        return templates;
    }, [filters]);

    // Generate stat profiles for the selected template across CR levels
    const crProfiles = useMemo(() => {
        if (!selectedTemplateId) return [];
        const template = DEFAULT_ENEMY_TEMPLATES.find(t => t.id === selectedTemplateId);
        if (!template) return [];

        const rarities = spectrumRarity === 'all' ? ALL_RARITIES : [spectrumRarity];
        const profiles: EnemyStatProfile[] = [];

        for (const cr of CR_RANGE) {
            for (const rarity of rarities) {
                try {
                    const enemy = EnemyGenerator.generate({
                        seed: `explorer-${template.id}-cr${cr}-${rarity}`,
                        templateId: template.id,
                        cr,
                        rarity,
                    });
                    if (enemy) {
                        // Estimate DPR against AC 15 (typical party average)
                        const dpr = estimateEnemyDPR(enemy, 'scaled', 15, 4);
                        profiles.push({ cr, rarity, enemy, dpr });
                    }
                } catch {
                    // Skip failed generations
                }
            }
        }

        return profiles;
    }, [selectedTemplateId, spectrumRarity]);

    // Sparkline data for each template — sample CR 1, 5, 10, 15, 20 at common rarity
    const sparklineData = useMemo(() => {
        const data = new Map<string, { hp: number[]; ac: number[]; dpr: number[] }>();
        for (const template of filteredTemplates) {
            const hp: number[] = [];
            const ac: number[] = [];
            const dpr: number[] = [];
            for (const cr of [1, 5, 10, 15, 20]) {
                try {
                    const enemy = EnemyGenerator.generate({
                        seed: `sparkline-${template.id}-cr${cr}`,
                        templateId: template.id,
                        cr,
                        rarity: 'common',
                    });
                    if (enemy) {
                        hp.push(enemy.hp.max);
                        ac.push(enemy.armor_class);
                        dpr.push(estimateEnemyDPR(enemy, 'scaled', 15, 4));
                    }
                } catch {
                    hp.push(0); ac.push(0); dpr.push(0);
                }
            }
            data.set(template.id, { hp, ac, dpr });
        }
        return data;
    }, [filteredTemplates]);

    // Handle template selection
    const handleSelectTemplate = useCallback((id: string) => {
        setSelectedTemplateId(prev => prev === id ? null : id);
        setSelectedProfile(null);
        setSpectrumRarity('all');
    }, []);

    // Handle filter change
    const updateFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    }, []);

    // Clear all filters
    const clearFilters = useCallback(() => {
        setFilters({ category: 'all', archetype: 'all', rarity: 'all', search: '' });
    }, []);

    // Group templates by category for display
    const groupedTemplates = useMemo(() => {
        const groups = new Map<EnemyCategory, EnemyTemplate[]>();
        for (const template of filteredTemplates) {
            const existing = groups.get(template.category) || [];
            existing.push(template);
            groups.set(template.category, existing);
        }
        return groups;
    }, [filteredTemplates]);

    const selectedTemplate = selectedTemplateId
        ? DEFAULT_ENEMY_TEMPLATES.find(t => t.id === selectedTemplateId)
        : null;

    const hasActiveFilters = filters.category !== 'all' || filters.archetype !== 'all' || filters.search !== '';

    // Auto-scroll to spectrum when template is selected
    useEffect(() => {
        if (selectedTemplateId && spectrumRef.current) {
            spectrumRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [selectedTemplateId]);

    return (
        <div className="ee-container">
            {/* Header */}
            <div className="ee-header">
                <div className="ee-header-left">
                    <Eye size={16} className="ee-header-icon" />
                    <h3 className="ee-header-title">Enemy Explorer</h3>
                    <span className="ee-header-count">{filteredTemplates.length} / {DEFAULT_ENEMY_TEMPLATES.length}</span>
                </div>
                <div className="ee-header-actions">
                    <button
                        className={`ee-view-btn ${viewMode === 'grid' ? 'ee-view-btn-active' : ''}`}
                        onClick={() => setViewMode('grid')}
                        title="Grid view"
                    >
                        <Grid3X3 size={14} />
                    </button>
                    <button
                        className={`ee-view-btn ${viewMode === 'list' ? 'ee-view-btn-active' : ''}`}
                        onClick={() => setViewMode('list')}
                        title="List view"
                    >
                        <List size={14} />
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="ee-filters">
                <div className="ee-filter-row">
                    <div className="ee-search-wrap">
                        <Search size={13} className="ee-search-icon" />
                        <input
                            className="ee-search-input"
                            type="text"
                            placeholder="Search enemies..."
                            value={filters.search}
                            onChange={e => updateFilter('search', e.target.value)}
                        />
                        {filters.search && (
                            <button className="ee-search-clear" onClick={() => updateFilter('search', '')}>
                                <X size={12} />
                            </button>
                        )}
                    </div>
                </div>
                <div className="ee-filter-row">
                    <Filter size={13} className="ee-filter-icon" />
                    <select
                        className="ee-filter-select"
                        value={filters.category}
                        onChange={e => updateFilter('category', e.target.value as FilterState['category'])}
                    >
                        <option value="all">All Categories</option>
                        {ALL_CATEGORIES.map(c => (
                            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                        ))}
                    </select>
                    <select
                        className="ee-filter-select"
                        value={filters.archetype}
                        onChange={e => updateFilter('archetype', e.target.value as FilterState['archetype'])}
                    >
                        <option value="all">All Archetypes</option>
                        {ALL_ARCHETYPES.map(a => (
                            <option key={a} value={a}>{ARCHETYPE_LABELS[a]}</option>
                        ))}
                    </select>
                    {hasActiveFilters && (
                        <button className="ee-clear-btn" onClick={clearFilters}>
                            <X size={12} /> Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Template Grid / List */}
            <div className={`ee-templates ${viewMode === 'list' ? 'ee-templates-list' : ''}`}>
                {filteredTemplates.length === 0 ? (
                    <div className="ee-empty">
                        <Search size={20} />
                        <span>No enemies match your filters</span>
                    </div>
                ) : viewMode === 'grid' ? (
                    // Grouped grid view
                    Array.from(groupedTemplates.entries()).map(([category, templates]) => (
                        <div key={category} className="ee-category-group">
                            <div className="ee-category-label">{CATEGORY_LABELS[category]}</div>
                            <div className="ee-grid">
                                {templates.map(template => {
                                    const spark = sparklineData.get(template.id);
                                    const isSelected = selectedTemplateId === template.id;
                                    return (
                                        <button
                                            key={template.id}
                                            className={`ee-tile ${isSelected ? 'ee-tile-selected' : ''}`}
                                            onClick={() => handleSelectTemplate(template.id)}
                                            title={`${template.name} — ${template.signatureAbility.name}`}
                                        >
                                            <div className="ee-tile-header">
                                                <span
                                                    className="ee-tile-dot"
                                                    style={{ backgroundColor: ARCHETYPE_COLORS[template.archetype] }}
                                                />
                                                <span className="ee-tile-name">{template.name}</span>
                                                <span className="ee-tile-archetype">{ARCHETYPE_LABELS[template.archetype]}</span>
                                            </div>
                                            <div className="ee-tile-sparklines">
                                                {spark && (
                                                    <>
                                                        <Sparkline values={spark.hp} color="hsl(0 70% 55%)" width={52} height={16} />
                                                        <Sparkline values={spark.ac} color="hsl(210 70% 55%)" width={52} height={16} />
                                                        <Sparkline values={spark.dpr} color="hsl(35 90% 55%)" width={52} height={16} />
                                                    </>
                                                )}
                                            </div>
                                            <div className="ee-tile-stats">
                                                <span className="ee-tile-stat">{template.baseHP} HP</span>
                                                <span className="ee-tile-stat">{template.baseAC} AC</span>
                                                <span className="ee-tile-stat">{spark ? spark.hp[spark.hp.length - 1] : template.baseHP}</span>
                                            </div>
                                            <div className="ee-tile-sig">
                                                {template.signatureAbility.name}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                ) : (
                    // List view
                    <div className="ee-list">
                        {filteredTemplates.map(template => {
                            const spark = sparklineData.get(template.id);
                            const isSelected = selectedTemplateId === template.id;
                            return (
                                <button
                                    key={template.id}
                                    className={`ee-list-row ${isSelected ? 'ee-list-row-selected' : ''}`}
                                    onClick={() => handleSelectTemplate(template.id)}
                                >
                                    <span
                                        className="ee-list-dot"
                                        style={{ backgroundColor: ARCHETYPE_COLORS[template.archetype] }}
                                    />
                                    <span className="ee-list-cat">{CATEGORY_LABELS[template.category]}</span>
                                    <span className="ee-list-name">{template.name}</span>
                                    <span className="ee-list-arch">{ARCHETYPE_LABELS[template.archetype]}</span>
                                    <span className="ee-list-base">{template.baseHP} HP / {template.baseAC} AC</span>
                                    <div className="ee-list-sparklines">
                                        {spark && (
                                            <>
                                                <Sparkline values={spark.hp} color="hsl(0 70% 55%)" width={44} height={14} />
                                                <Sparkline values={spark.ac} color="hsl(210 70% 55%)" width={44} height={14} />
                                                <Sparkline values={spark.dpr} color="hsl(35 90% 55%)" width={44} height={14} />
                                            </>
                                        )}
                                    </div>
                                    <span className="ee-list-sig">{template.signatureAbility.name}</span>
                                    <ChevronRight size={14} className="ee-list-chevron" />
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* CR Spectrum Panel */}
            {selectedTemplate && (
                <div className="ee-spectrum" ref={spectrumRef}>
                    <div className="ee-spectrum-header">
                        <div className="ee-spectrum-title-row">
                            <Star size={16} className="ee-spectrum-icon" />
                            <h3 className="ee-spectrum-title">
                                {selectedTemplate.name} — CR Spectrum
                            </h3>
                            <span className="ee-spectrum-count">{crProfiles.length} variants</span>
                        </div>
                        <div className="ee-spectrum-controls">
                            <select
                                className="ee-filter-select"
                                value={spectrumRarity}
                                onChange={e => setSpectrumRarity(e.target.value as EnemyRarity | 'all')}
                            >
                                <option value="all">All Rarities</option>
                                {ALL_RARITIES.map(r => (
                                    <option key={r} value={r}>{RARITY_LABELS[r]}</option>
                                ))}
                            </select>
                            <button
                                className="ee-close-spectrum"
                                onClick={() => {
                                    setSelectedTemplateId(null);
                                    setSelectedProfile(null);
                                }}
                                title="Close spectrum"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="ee-spectrum-legend">
                        <span className="ee-legend-item">
                            <Heart size={11} /> HP
                        </span>
                        <span className="ee-legend-item">
                            <Shield size={11} /> AC
                        </span>
                        <span className="ee-legend-item">
                            <Crosshair size={11} /> DPR
                        </span>
                        <span className="ee-legend-item">
                            <Skull size={11} /> XP
                        </span>
                    </div>

                    {/* CR Rows */}
                    <div className="ee-cr-list">
                        {crProfiles.map((profile) => (
                            <CRSpectrumRow
                                key={`${profile.cr}-${profile.rarity}`}
                                profile={profile}
                                isSelected={selectedProfile === profile}
                                onClick={() => setSelectedProfile(prev =>
                                    prev && prev.cr === profile.cr && prev.rarity === profile.rarity ? null : profile
                                )}
                            />
                        ))}
                    </div>

                    {/* Selected Detail */}
                    {selectedProfile && (
                        <EnemyDetail profile={selectedProfile} template={selectedTemplate} crProfiles={crProfiles} />
                    )}
                </div>
            )}
        </div>
    );
}

export default EnemyExplorer;
