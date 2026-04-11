/**
 * Simulation Configuration Panel (Task 8.2.1)
 *
 * Main configuration panel for Balance Lab simulations.
 * Contains: Party Selection, Encounter Configuration, Simulation Settings,
 * AI Strategy selectors, and Run/Cancel buttons.
 *
 * Orchestrates enemy generation and feeds into useSimulationHistory.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
    type CharacterSheet,
    type SimulationConfig,
    type EnemyRarity,
    type EnemyCategory,
    type EnemyArchetype,
    type EncounterGenerationOptions,
    type PartyAnalysis,
    PartyAnalyzer,
} from 'playlist-data-engine';
import { useCharacterStore } from '@/store/characterStore';
import { useAppStore } from '@/store/appStore';
import { useEnemyGenerator } from '@/hooks/useEnemyGenerator';
import { useEstimateSnapshot } from '@/hooks/useEstimateSnapshot';
import {
    type EncounterConfigUI,
    type SimulationSettingsUI,
    type AIPlayStyle,
    type SimulationEstimateSnapshot,
    DEFAULT_SIMULATION_SETTINGS,
    DEFAULT_ENCOUNTER_CONFIG,
    RUN_COUNT_PRESETS,
    toSimulationConfig,
} from '@/types/simulation';
import type { SimulationStatus, SimulationProgress } from '@/hooks/useCombatSimulation';
import { PartySelector } from './PartySelector';
import { EncounterConfigForm } from './EncounterConfigForm';
import { AIStrategySelector } from './AIStrategySelector';
import { SimulationProgressBar } from './SimulationProgressBar';
import { PartyEstimateCard } from './PartyEstimateCard';
import { EnemyEstimateCard } from './EnemyEstimateCard';
import { PredictedDifficultyBar } from './PredictedDifficultyBar';
import { Play, X, AlertCircle, Lock } from 'lucide-react';
import { logger } from '@/utils/logger';
import './SimulationConfigPanel.css';

interface SimulationConfigPanelProps {
    status: SimulationStatus;
    progress: SimulationProgress;
    error: { message: string } | null;
    isRunning: boolean;

    /** Optional external encounter config override (e.g., from applying a recommendation) */
    encounterConfigOverride?: EncounterConfigUI | null;
    /** Optional party seed override (e.g., from CombatSimulatorTab transfer) */
    partySeedsOverride?: string[] | null;
    /** Called when the internal encounter config changes (for tracking in parent) */
    onEncounterConfigChange?: (config: EncounterConfigUI) => void;

    onRunSimulation: (party: CharacterSheet[], enemies: CharacterSheet[], config: SimulationConfig, estimateSnapshot: SimulationEstimateSnapshot | null) => void;
    onCancel: () => void;
    onReset: () => void;
    /** Pre-locked enemies to reuse instead of generating new ones */
    lockedEnemies?: CharacterSheet[];
    /** Clear all locked enemies */
    onClearLockedEnemies?: () => void;
}

export function SimulationConfigPanel({
    status,
    progress,
    error,
    isRunning,
    encounterConfigOverride,
    partySeedsOverride,
    onEncounterConfigChange,
    onRunSimulation,
    onCancel,
    onReset,
    lockedEnemies = [],
    onClearLockedEnemies,
}: SimulationConfigPanelProps) {
    // ─── State ──────────────────────────────────────────────────────────
    const [selectedPartySeeds, setSelectedPartySeeds] = useState<string[]>([]);
    const [encounterConfig, setEncounterConfig] = useState<EncounterConfigUI>(DEFAULT_ENCOUNTER_CONFIG);
    const [enemySampleCount, setEnemySampleCount] = useState<number>(10);
    const [settings, setSettings] = useState<SimulationSettingsUI>(DEFAULT_SIMULATION_SETTINGS);
    const [validationError, setValidationError] = useState<string | null>(null);
    const { settings: appSettings } = useAppStore();
    const hitMode = appSettings.damageDisplay;

    // Sync external encounter config override into internal state
    useEffect(() => {
        if (encounterConfigOverride != null) {
            setEncounterConfig(encounterConfigOverride);
        }
    }, [encounterConfigOverride]);

    // Sync external party seeds override into internal state
    useEffect(() => {
        if (partySeedsOverride != null && partySeedsOverride.length > 0) {
            setSelectedPartySeeds(partySeedsOverride);
        }
    }, [partySeedsOverride]);

    // Notify parent of encounter config changes
    const updateEncounterConfig = useCallback(
        (config: EncounterConfigUI) => {
            setEncounterConfig(config);
            onEncounterConfigChange?.(config);
        },
        [onEncounterConfigChange],
    );

    const { generateEncounterByCR } = useEnemyGenerator();
    const characters = useCharacterStore((s) => s.characters);

    // Track live win rate during simulation
    const completedWinsRef = useRef(0);
    const completedTotalRef = useRef(0);

    // ─── Derived State ──────────────────────────────────────────────────
    const selectedParty = useMemo(
        () => characters.filter((c) => selectedPartySeeds.includes(c.seed)),
        [characters, selectedPartySeeds],
    );

    const canRun = selectedParty.length > 0 && !isRunning;

    // ─── Pre-Simulation Estimates ────────────────────────────────────────
    const estimateSnapshot = useEstimateSnapshot(selectedParty, encounterConfig, hitMode, enemySampleCount);

    // Instant party analysis (no loading delay) for PartyEstimateCard
    const partyAnalysis: PartyAnalysis | null = useMemo(() => {
        if (selectedParty.length === 0) return null;
        try {
            return PartyAnalyzer.analyzeParty(selectedParty);
        } catch {
            return null;
        }
    }, [selectedParty]);

    // ─── Handlers ───────────────────────────────────────────────────────
    const handleRun = useCallback(() => {
        setValidationError(null);

        if (selectedParty.length === 0) {
            setValidationError('Select at least one party member');
            return;
        }

        // Use locked enemies if available, otherwise generate new ones
        let generatedEnemies: CharacterSheet[];
        let seed: string;

        if (lockedEnemies.length > 0) {
            generatedEnemies = lockedEnemies;
            seed = settings.baseSeed || `balance-${Date.now()}`;
            logger.info('BalanceLab', 'Using locked enemies', {
                enemyCount: generatedEnemies.length,
                enemies: generatedEnemies.map(e => e.name),
            });
        } else {
            seed = encounterConfig.seed || `balance-${Date.now()}`;
            generatedEnemies = generateEncounterByCR({
                seed,
                count: encounterConfig.enemyCount,
                targetCR: encounterConfig.cr,
                category: encounterConfig.category as EnemyCategory,
                archetype: encounterConfig.archetype as EnemyArchetype,
                baseRarity: encounterConfig.rarity as EnemyRarity,
                difficultyMultiplier: encounterConfig.difficultyMultiplier,
                statLevels: encounterConfig.statLevels,
            });
        }

        if (generatedEnemies.length === 0) {
            setValidationError('Failed to generate enemies. Check configuration.');
            return;
        }

        // Build simulation config
        const simConfig = toSimulationConfig({
            party: selectedParty,
            enemies: generatedEnemies,
            settings: {
                ...settings,
                baseSeed: settings.baseSeed || seed,
            },
        });

        // When "regenerate per run" is enabled, pass encounter generation options
        // so the CombatSimulator re-rolls enemies each run with unique seeds.
        if (settings.regenerateEnemiesPerRun) {
            simConfig.config.enemyRegeneration = {
                seed,
                count: encounterConfig.enemyCount,
                targetCR: encounterConfig.cr,
                category: encounterConfig.category as EnemyCategory,
                archetype: encounterConfig.archetype as EnemyArchetype,
                baseRarity: encounterConfig.rarity as EnemyRarity,
                difficultyMultiplier: encounterConfig.difficultyMultiplier,
                statLevels: encounterConfig.statLevels,
            } as EncounterGenerationOptions;
        }

        // Reset win rate tracking
        completedWinsRef.current = 0;
        completedTotalRef.current = 0;

        logger.info('BalanceLab', 'Starting simulation', {
            partySize: selectedParty.length,
            partyLevels: selectedParty.map((p) => p.level),
            enemyCount: generatedEnemies.length,
            runCount: settings.runCount,
            playerStyle: settings.playerStyle,
            enemyStyle: settings.enemyStyle,
            regenerateEnemiesPerRun: settings.regenerateEnemiesPerRun,
            usingLockedEnemies: lockedEnemies.length > 0,
            encounterConfig,
        });

        onRunSimulation(selectedParty, generatedEnemies, simConfig.config, estimateSnapshot);
    }, [selectedParty, encounterConfig, settings, generateEncounterByCR, onRunSimulation, estimateSnapshot, lockedEnemies]);

    const handleReset = useCallback(() => {
        onReset();
        setValidationError(null);
        completedWinsRef.current = 0;
        completedTotalRef.current = 0;
    }, [onReset]);

    // Ctrl+Enter → run simulation (when config panel is visible and can run)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                if (canRun) {
                    handleRun();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [canRun, handleRun]);

    // ─── Render ─────────────────────────────────────────────────────────
    return (
        <div className="sim-config-panel">
            {/* Top Action Buttons */}
            <div className="scp-actions scp-actions-top">
                {!isRunning && status !== 'completed' && (
                    <button
                        className="scp-btn scp-btn-run"
                        onClick={handleRun}
                        disabled={!canRun}
                        title="Run simulation (Ctrl+Enter)"
                    >
                        <Play size={14} />
                        Run Simulation
                        <kbd className="scp-shortcut-hint">Ctrl+Enter</kbd>
                    </button>
                )}
                {isRunning && (
                    <button className="scp-btn scp-btn-cancel" onClick={onCancel}>
                        <X size={14} />
                        Cancel
                    </button>
                )}
                {status === 'completed' && (
                    <button className="scp-btn scp-btn-reset" onClick={handleReset}>
                        New Simulation
                    </button>
                )}
            </div>

            {/* Party Selection */}
            <section className="scp-section">
                <PartySelector
                    selectedSeeds={selectedPartySeeds}
                    onChange={setSelectedPartySeeds}
                    disabled={isRunning}
                />
                <PartyEstimateCard
                    analysis={partyAnalysis}
                    isLoading={false}
                    encounterXP={estimateSnapshot?.enemy.totalAdjustedXP}
                    estimatedDPR={estimateSnapshot?.party.estimatedDPR}
                    weaponName={estimateSnapshot?.party.weaponName}
                />
            </section>

            {/* Encounter Configuration */}
            <section className="scp-section">
                <div className="scp-section-header">
                    <label className="scp-section-label">Encounter</label>
                </div>
                <EncounterConfigForm
                    config={encounterConfig}
                    onChange={updateEncounterConfig}
                    disabled={isRunning}
                />
                <EnemyEstimateCard
                    snapshot={estimateSnapshot?.enemy ?? null}
                    isLoading={false}
                    selectedSampleCount={enemySampleCount}
                    onSampleCountChange={setEnemySampleCount}
                />
            </section>

            {/* Predicted Difficulty Bar */}
            <section className="scp-section">
                <PredictedDifficultyBar snapshot={estimateSnapshot} />
            </section>

            {/* Simulation Settings */}
            <section className="scp-section">
                <div className="scp-section-header">
                    <label className="scp-section-label">Settings</label>
                </div>

                <div className="scp-settings-grid">
                    {/* Run Count */}
                    <div className="scp-field scp-field-wide">
                        <label className="scp-label" htmlFor="scp-runcount">Simulation Runs</label>
                        <select
                            id="scp-runcount"
                            className="scp-select"
                            value={settings.runCount}
                            onChange={(e) => setSettings({ ...settings, runCount: parseInt(e.target.value) })}
                            disabled={isRunning}
                        >
                            {RUN_COUNT_PRESETS.map((preset) => (
                                <option key={preset.value} value={preset.value}>
                                    {preset.label} runs
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Seed */}
                    <div className="scp-field scp-field-wide">
                        <label className="scp-label" htmlFor="scp-seed">Simulation Seed</label>
                        <input
                            id="scp-seed"
                            type="text"
                            className="scp-input"
                            placeholder="Random if empty"
                            value={settings.baseSeed}
                            onChange={(e) => setSettings({ ...settings, baseSeed: e.target.value })}
                            disabled={isRunning}
                        />
                    </div>
                </div>

                {/* AI Strategy */}
                <div className="scp-ai-strategies">
                    <AIStrategySelector
                        side="player"
                        value={settings.playerStyle}
                        onChange={(v) => setSettings({ ...settings, playerStyle: v as AIPlayStyle })}
                        disabled={isRunning}
                    />
                    <AIStrategySelector
                        side="enemy"
                        value={settings.enemyStyle}
                        onChange={(v) => setSettings({ ...settings, enemyStyle: v as AIPlayStyle })}
                        disabled={isRunning}
                    />
                </div>

                {/* Detailed Logs Toggle */}
                <label className="scp-toggle-row">
                    <input
                        type="checkbox"
                        checked={settings.collectDetailedLogs}
                        onChange={(e) => setSettings({ ...settings, collectDetailedLogs: e.target.checked })}
                        disabled={isRunning}
                    />
                    <span className="scp-toggle-label">Collect detailed combat logs</span>
                    <span className="scp-toggle-hint">(uses more memory at high run counts)</span>
                </label>

                {/* Regenerate Enemies Per Run Toggle */}
                <label className="scp-toggle-row">
                    <input
                        type="checkbox"
                        checked={settings.regenerateEnemiesPerRun}
                        onChange={(e) => setSettings({ ...settings, regenerateEnemiesPerRun: e.target.checked })}
                        disabled={isRunning}
                    />
                    <span className="scp-toggle-label">Regenerate enemies each run</span>
                    <span className="scp-toggle-hint">(captures variance in enemy generation across runs)</span>
                </label>

                {/* Locked Enemies Indicator */}
                {lockedEnemies.length > 0 && (
                    <div className="scp-locked-enemies">
                        <Lock size={12} />
                        <span>{lockedEnemies.length} enemy{lockedEnemies.length > 1 ? 's' : ''} locked — will reuse instead of generating</span>
                        {onClearLockedEnemies && (
                            <button
                                className="scp-locked-clear-btn"
                                onClick={onClearLockedEnemies}
                                disabled={isRunning}
                                type="button"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                )}
            </section>

            {/* Progress Bar (during simulation) */}
            {isRunning && (
                <section className="scp-section">
                    <SimulationProgressBar
                        completed={progress.completed}
                        total={progress.total}
                        estimatedMsRemaining={progress.estimatedMsRemaining}
                        liveWinRate={null}
                        onCancel={onCancel}
                    />
                </section>
            )}

            {/* Error Messages */}
            {(validationError || error) && (
                <div className="scp-error">
                    <AlertCircle size={14} />
                    <span>{validationError || error?.message}</span>
                </div>
            )}

            {/* Action Buttons */}
            <div className="scp-actions">
                {!isRunning && status !== 'completed' && (
                    <button
                        className="scp-btn scp-btn-run"
                        onClick={handleRun}
                        disabled={!canRun}
                        title="Run simulation (Ctrl+Enter)"
                    >
                        <Play size={14} />
                        Run Simulation
                        <kbd className="scp-shortcut-hint">Ctrl+Enter</kbd>
                    </button>
                )}
                {isRunning && (
                    <button className="scp-btn scp-btn-cancel" onClick={onCancel}>
                        <X size={14} />
                        Cancel
                    </button>
                )}
                {status === 'completed' && (
                    <button className="scp-btn scp-btn-reset" onClick={handleReset}>
                        New Simulation
                    </button>
                )}
            </div>
        </div>
    );
}
