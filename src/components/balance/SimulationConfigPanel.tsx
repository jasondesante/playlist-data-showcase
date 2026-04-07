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
    type PartyAnalysis,
    PartyAnalyzer,
} from 'playlist-data-engine';
import { useCharacterStore } from '@/store/characterStore';
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
import { Play, X, AlertCircle } from 'lucide-react';
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
}: SimulationConfigPanelProps) {
    // ─── State ──────────────────────────────────────────────────────────
    const [selectedPartySeeds, setSelectedPartySeeds] = useState<string[]>([]);
    const [encounterConfig, setEncounterConfig] = useState<EncounterConfigUI>(DEFAULT_ENCOUNTER_CONFIG);
    const [settings, setSettings] = useState<SimulationSettingsUI>(DEFAULT_SIMULATION_SETTINGS);
    const [validationError, setValidationError] = useState<string | null>(null);

    // Sync external encounter config override into internal state
    const prevOverrideRef = useRef<EncounterConfigUI | null | undefined>(undefined);
    if (encounterConfigOverride !== prevOverrideRef.current) {
        if (encounterConfigOverride != null) {
            setEncounterConfig(encounterConfigOverride);
        }
        prevOverrideRef.current = encounterConfigOverride;
    }

    // Sync external party seeds override into internal state
    const prevPartySeedsRef = useRef<string[] | null | undefined>(undefined);
    if (partySeedsOverride !== prevPartySeedsRef.current) {
        if (partySeedsOverride != null && partySeedsOverride.length > 0) {
            setSelectedPartySeeds(partySeedsOverride);
        }
        prevPartySeedsRef.current = partySeedsOverride;
    }

    // Notify parent of encounter config changes
    const updateEncounterConfig = useCallback(
        (config: EncounterConfigUI) => {
            setEncounterConfig(config);
            onEncounterConfigChange?.(config);
        },
        [onEncounterConfigChange],
    );

    const { generate } = useEnemyGenerator();
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
    const estimateSnapshot = useEstimateSnapshot(selectedParty, encounterConfig);

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

        // Generate enemies from encounter config
        const seed = encounterConfig.seed || `balance-${Date.now()}`;
        const generatedEnemies: CharacterSheet[] = [];

        for (let i = 0; i < encounterConfig.enemyCount; i++) {
            const enemy = generate({
                seed: `${seed}-enemy-${i}`,
                category: encounterConfig.category as EnemyCategory,
                archetype: encounterConfig.archetype as EnemyArchetype,
                rarity: encounterConfig.rarity as EnemyRarity,
                difficultyMultiplier: encounterConfig.difficultyMultiplier,
            });
            if (enemy) {
                generatedEnemies.push(enemy);
            }
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
            encounterConfig,
        });

        onRunSimulation(selectedParty, generatedEnemies, simConfig.config, estimateSnapshot);
    }, [selectedParty, encounterConfig, settings, generate, onRunSimulation, estimateSnapshot]);

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
