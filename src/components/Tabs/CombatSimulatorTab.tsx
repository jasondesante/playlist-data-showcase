import { useState, useEffect, useRef } from 'react';
import { useCombatEngine, type Combatant } from '../../hooks/useCombatEngine';
import { useCharacterStore } from '../../store/characterStore';
import { useCharacterUpdater } from '../../hooks/useCharacterUpdater';
import { StatusIndicator } from '../ui/StatusIndicator';
import { RawJsonDump } from '../ui/RawJsonDump';
import { SPELL_DATABASE } from 'playlist-data-engine';
import { logger } from '../../utils/logger';
import './CombatSimulatorTab.css';

/**
 * CombatSimulatorTab Component
 *
 * Demonstrates the CombatEngine engine module by:
 * 1. Starting combat between player character(s) and enemies
 * 2. Rolling initiative for turn order
 * 3. Executing attacks with damage calculations
 * 4. Casting spells with slot management
 * 5. Advancing turns manually or via auto-play
 * 6. Displaying combat log with detailed action history
 * 7. Showing victory screen with XP awarded, rounds elapsed, total turns
 * 8. Providing manual attack controls for choosing specific targets
 * 9. Providing spell casting UI for spellcaster classes
 *
 * Features:
 * - D&D 5e combat rules implementation
 * - Initiative order sidebar with current turn highlighting
 * - Combatant cards with HP bars and status
 * - Color-coded combat log (green=hit, red=miss, blue=spell)
 * - Auto-play mode for hands-off combat simulation (1.5s per turn)
 * - Manual attack targeting
 * - Spell selection with slot availability checking
 * - Multi-target spell casting
 * - Victory overlay with combat statistics
 * - Raw JSON dump for debugging
 *
 * @example
 * ```tsx
 * // Requires at least one generated character
 * <CombatSimulatorTab />
 * ```
 */

// Helper function to determine log entry color based on action type and result
function getLogEntryColor(action: any): string {
  if (action.type === 'spell') return 'combat-log-entry-spell';
  if (action.result?.success) return 'combat-log-entry-success';
  if (action.result?.success === false) return 'combat-log-entry-fail';
  return 'combat-log-entry-neutral';
}

// Helper function to calculate which round an action occurred in
function getActionRound(actionIndex: number, totalCombatants: number): number {
  // Approximate round number based on action index and number of combatants
  return Math.floor(actionIndex / totalCombatants) + 1;
}

// Auto-play configuration (task 4.9.7)
const AUTO_PLAY_INTERVAL_MS = 1500; // Advance turns every 1.5 seconds

// Helper function to check if a character is a spellcaster
function isSpellcaster(character: any): boolean {
  const spellcastingClasses = ['Wizard', 'Cleric', 'Sorcerer', 'Bard', 'Druid', 'Warlock', 'Paladin', 'Ranger'];
  return spellcastingClasses.includes(character.class) && character.spells;
}

// Helper function to get spell level as a readable string
function getSpellLevelText(level: number): string {
  if (level === 0) return 'Cantrip';
  return `Level ${level}`;
}

export function CombatSimulatorTab() {
  const {
    startCombat,
    getCurrentCombatant,
    executeAttack,
    executeCastSpell,
    nextTurn,
    getCombatResult,
    resetCombat,
    getLivingCombatants,
    combat
  } = useCombatEngine();
  const { getActiveCharacter } = useCharacterStore();
  const { addXPFromSource } = useCharacterUpdater();

  // State for manual attack selection (task 4.9.6)
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  // State for spell casting (task 4.9.8)
  const [selectedSpellName, setSelectedSpellName] = useState<string | null>(null);
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);

  // State for auto-play functionality (task 4.9.7)
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const autoPlayIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const combatLogRef = useRef<HTMLDivElement>(null);

  // Performance timing state (Phase 5.5.2)
  const combatStartTimeRef = useRef<number | null>(null);
  const [combatPerformance, setCombatPerformance] = useState<{
    totalTimeSeconds: string | null;
    totalTurns: number;
    roundsElapsed: number;
    performanceTarget: string;
  } | null>(null);

  // XP award state (Task 3.4)
  const [xpAwarded, setXpAwarded] = useState<{ amount: number; characterName: string; leveledUp: boolean } | null>(null);

  // Combat state from task 4.9.1 (moved before useEffect hooks to fix TS error)
  const currentTurnIndex = combat?.currentTurnIndex ?? null;
  const roundNumber = combat?.roundNumber ?? null;
  const combatLog = combat?.history ?? [];
  const isActive = combat?.isActive ?? false;

  const handleStartCombat = () => {
    const activeChar = getActiveCharacter();
    if (!activeChar) return;
    // Create a mock enemy based on the active character
    const enemy = { ...activeChar, name: 'Goblin', hp: { current: 20, max: 20, temp: 0 } };
    startCombat([activeChar], [enemy]);
  };

  const handleNextTurn = () => {
    if (!combat) return;

    const current = getCurrentCombatant();
    if (!current) return;

    // If a target is selected, execute manual attack
    if (selectedTargetId) {
      const target = combat.combatants.find((c: Combatant) => c.id === selectedTargetId);
      if (target && !target.isDefeated) {
        const action = executeAttack(current, target);
        if (action) {
          console.log('[Combat]', action.result?.description);
        }
      }
      setSelectedTargetId(null);
    } else {
      // Auto-attack first living target (original behavior)
      const livingTargets = combat.combatants.filter((c: Combatant) => !c.isDefeated && c.id !== current.id);
      if (livingTargets.length > 0) {
        const target = livingTargets[0];
        const action = executeAttack(current, target);
        if (action) {
          console.log('[Combat]', action.result?.description);
        }
      }
    }

    const updated = nextTurn();
    if (updated && !updated.isActive) {
      const result = getCombatResult();
      console.log('[Combat]', `Combat ended! Winner: ${result?.winner.character.name}`);
    }
  };

  // Manual attack handler for specific attack and target (task 4.9.6)
  const handleManualAttack = (target: Combatant) => {
    if (!combat) return;

    const current = getCurrentCombatant();
    if (!current) return;

    const action = executeAttack(current, target);
    if (action) {
      console.log('[Combat]', action.result?.description);
    }

    const updated = nextTurn();
    if (updated && !updated.isActive) {
      const result = getCombatResult();
      console.log('[Combat]', `Combat ended! Winner: ${result?.winner.character.name}`);
    }

    setSelectedTargetId(null);
  };

  // Auto-play functionality (task 4.9.7)
  // Execute a single turn for auto-play
  const executeAutoPlayTurn = () => {
    if (!combat) return;

    // Start performance timer on first turn of auto-play
    if (combatStartTimeRef.current === null) {
      combatStartTimeRef.current = performance.now();
      logger.info('CombatEngine', 'Auto-play started', {
        combatId: combat.id,
        combatants: combat.combatants.length,
        autoPlayInterval: `${AUTO_PLAY_INTERVAL_MS / 1000}s`
      });
    }

    const current = getCurrentCombatant();
    if (!current) return;

    // Auto-attack first living target
    const livingTargets = combat.combatants.filter((c: Combatant) => !c.isDefeated && c.id !== current.id);
    if (livingTargets.length > 0) {
      const target = livingTargets[0];
      const action = executeAttack(current, target);
      if (action) {
        console.log('[Combat Auto-Play]', action.result?.description);
      }
    }

    const updated = nextTurn();
    if (updated && !updated.isActive) {
      // Calculate and log performance metrics
      const endTime = performance.now();
      const elapsedSeconds = combatStartTimeRef.current !== null
        ? ((endTime - combatStartTimeRef.current) / 1000).toFixed(2)
        : null;

      const result = getCombatResult();
      const totalTurns = combat?.history?.length || 0;
      const roundsElapsed = result?.roundsElapsed || 0;

      // Performance target: <5 seconds for 50-round combat
      // For shorter combats, we scale the target proportionally
      const expectedSeconds = (roundsElapsed / 50) * 5;
      const performanceTarget = elapsedSeconds !== null && parseFloat(elapsedSeconds) < expectedSeconds ? 'PASS' : 'FAIL';

      setCombatPerformance({
        totalTimeSeconds: elapsedSeconds,
        totalTurns,
        roundsElapsed,
        performanceTarget
      });

      logger.info('CombatEngine', 'Combat ended - Performance metrics', {
        combatId: combat.id,
        winner: result?.winner.character.name,
        roundsElapsed,
        totalTurns,
        combatTimeSeconds: elapsedSeconds,
        performanceTarget,
        expectedTarget: `${expectedSeconds.toFixed(2)}s for ${roundsElapsed} rounds`
      });

      console.log('[Combat Auto-Play]', `Combat ended! Winner: ${result?.winner.character.name}`);
      // Stop auto-play when combat ends
      setIsAutoPlaying(false);
      // Reset start time ref
      combatStartTimeRef.current = null;
    }
  };

  // Start auto-play (task 4.9.7)
  const handleStartAutoPlay = () => {
    setIsAutoPlaying(true);
  };

  // Pause auto-play (task 4.9.7)
  const handlePauseAutoPlay = () => {
    setIsAutoPlaying(false);
  };

  // Spell casting handlers (task 4.9.8)
  const handleCastSpell = () => {
    if (!combat || !selectedSpellName) return;

    const current = getCurrentCombatant();
    if (!current) return;

    // Get the spell from database
    const spell = SPELL_DATABASE[selectedSpellName];
    if (!spell) {
      console.warn('[Combat] Spell not found:', selectedSpellName);
      return;
    }

    // Get selected targets
    const targets = selectedTargetIds
      .map(id => combat.combatants.find((c: Combatant) => c.id === id))
      .filter((c): c is Combatant => c !== undefined && !c.isDefeated);

    if (targets.length === 0) {
      console.warn('[Combat] No valid targets selected for spell');
      return;
    }

    // Execute spell cast
    const action = executeCastSpell(current, spell, targets);
    if (action) {
      console.log('[Combat]', action.result?.description);
    }

    // Reset selections
    setSelectedSpellName(null);
    setSelectedTargetIds([]);

    // Advance to next turn
    const updated = nextTurn();
    if (updated && !updated.isActive) {
      const result = getCombatResult();
      console.log('[Combat]', `Combat ended! Winner: ${result?.winner.character.name}`);
    }
  };

  const handleTargetToggle = (targetId: string) => {
    setSelectedTargetIds(prev =>
      prev.includes(targetId)
        ? prev.filter(id => id !== targetId)
        : [...prev, targetId]
    );
  };

  // Auto-play interval effect (task 4.9.7)
  useEffect(() => {
    if (isAutoPlaying && isActive) {
      autoPlayIntervalRef.current = setInterval(() => {
        executeAutoPlayTurn();
      }, AUTO_PLAY_INTERVAL_MS);
    } else {
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
        autoPlayIntervalRef.current = null;
      }
    }

    // Cleanup on unmount
    return () => {
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
      }
    };
  }, [isAutoPlaying, isActive]); // Note: executeAutoPlayTurn is not in deps to avoid recreating interval

  // Auto-scroll combat log to bottom (task 4.9.7)
  useEffect(() => {
    if (combatLogRef.current && combatLog.length > 0) {
      combatLogRef.current.scrollTop = combatLogRef.current.scrollHeight;
    }
  }, [combatLog.length]);

  // Award XP when combat ends (Task 3.4)
  useEffect(() => {
    const result = combat && !combat.isActive ? getCombatResult() : null;
    const activeChar = getActiveCharacter();
    if (result && activeChar && result.winner.character.name !== 'Goblin') {
      // Award XP to the active character
      const xpResult = addXPFromSource(activeChar, result.xpAwarded, 'combat');

      console.log(`[Combat] ${activeChar.name} received ${result.xpAwarded} XP from combat!`);

      if (xpResult.leveledUp) {
        console.log(`[Combat] ${activeChar.name} leveled up to ${xpResult.newLevel}!`);
        // TODO: Could trigger level-up modal here if needed
      }

      setXpAwarded({
        amount: result.xpAwarded,
        characterName: activeChar.name,
        leveledUp: xpResult.leveledUp ?? false
      });
    }
    // Only run when combat transitions from active to inactive
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combat?.isActive]);

  // Get combat result if combat has ended
  const combatResult = combat && !combat.isActive ? getCombatResult() : null;

  return (
    <div className="combat-container">
      <div className="combat-header">
        <h2 className="combat-title">Combat Engine</h2>
        {combat && <StatusIndicator status={isActive ? 'healthy' : 'error'} label={isActive ? 'Active' : 'Ended'} />}
      </div>

      {!getActiveCharacter() ? (
        <p className="combat-prompt">Generate a character first</p>
      ) : !combat ? (
        <button
          onClick={handleStartCombat}
          className="combat-generate-button combat-button-base"
        >
          Start Combat
        </button>
      ) : (
        <div className="combat-content">
          {/* Combat Info */}
          <div className="combat-stats">
            <div className="combat-stat-text combat-stat-padding">Round: <span className="combat-stat-bold">{roundNumber}</span></div>
            <div className="combat-stat-text combat-stat-padding">Turn: <span className="combat-stat-bold">{currentTurnIndex !== null ? currentTurnIndex + 1 : '-'}</span></div>
          </div>

          {/* Manual Attack Controls - Task 4.9.6 */}
          {isActive && combat && (
            <div className="combat-controls">
              <h3 className="combat-controls-title">Manual Attack Controls</h3>
              <p className="combat-controls-description">
                Choose a target to attack instead of auto-attacking the first available target.
              </p>

              {/* Available attacks for current combatant */}
              <div className="combat-controls-section">
                <div className="combat-controls-label">Available Attacks:</div>
                {(() => {
                  const current = getCurrentCombatant();
                  if (!current) return <p className="combat-attacks-empty">No current combatant</p>;

                  const weapons = current.character.equipment?.weapons ?? [];
                  if (weapons.length === 0) {
                    return (
                      <div className="combat-unarmed-attack">
                        <span className="combat-attack-badge">Unarmed Strike</span>
                        <span className="combat-attack-muted">1 damage, bludgeoning</span>
                      </div>
                    );
                  }

                  return (
                    <div className="combat-attacks-grid">
                      {weapons.map((weapon: any, index: number) => (
                        <div key={index} className="combat-attack-card">
                          <div className="combat-attack-name">{weapon.name}</div>
                          <div className="combat-attack-damage">
                            {weapon.damage_dice} {weapon.damage_type} {weapon.type === 'melee' ? '⚔️' : '🏹'}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Available targets */}
              <div className="combat-controls-section">
                <div className="combat-controls-label">Available Targets:</div>
                <div className="combat-targets-grid">
                  {getLivingCombatants()
                    .filter((c: Combatant) => {
                      const current = getCurrentCombatant();
                      return current && c.id !== current.id;
                    })
                    .map((target: Combatant) => (
                      <button
                        key={target.id}
                        onClick={() => handleManualAttack(target)}
                        className={`combat-target-button ${selectedTargetId === target.id ? 'combat-target-button-selected' : ''}`}
                      >
                        <div className="combat-target-name">{target.character.name}</div>
                        <div className="combat-target-hp">
                          {target.character.race} {target.character.class} • HP: {target.currentHP}/{target.character.hp.max}
                        </div>
                      </button>
                    ))}
                </div>
              </div>

              <p className="combat-controls-hint">
                Click a target to perform an attack with your current combatant's available weapon(s).
              </p>
            </div>
          )}

          {/* Spell Casting UI - Task 4.9.8 */}
          {isActive && combat && (() => {
            const current = getCurrentCombatant();
            return current && isSpellcaster(current.character);
          })() && (
            <div className="combat-spell-section">
              <h3 className="combat-spell-header">
                <span>✨ Spell Casting</span>
                <span className="combat-spell-class-badge">
                  {getCurrentCombatant()?.character.class}
                </span>
              </h3>

              {/* Spell slots remaining */}
              <div className="combat-spell-slots">
                <div className="combat-spell-slots-label">Spell Slots Remaining:</div>
                {(() => {
                  const current = getCurrentCombatant();
                  if (!current?.spellSlots) return null;

                  const slots = Object.entries(current.spellSlots)
                    .filter(([_, count]) => count > 0 || parseInt(_) > 0)
                    .sort(([a], [b]) => parseInt(a) - parseInt(b));

                  if (slots.length === 0) {
                    return <p className="combat-slots-empty">No spell slots remaining</p>;
                  }

                  return (
                    <div className="combat-spell-slots-grid">
                      {slots.map(([level, count]) => (
                        <div key={level} className="combat-spell-slot-badge">
                          Level {level}: <span className={`font-bold ${count === 0 ? 'combat-spell-slot-unavailable' : 'combat-spell-slot-available'}`}>{count}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Known spells */}
              <div className="combat-spells-list">
                <div className="combat-spells-label">Known Spells:</div>
                <div className="combat-spells-grid">
                  {(() => {
                    const current = getCurrentCombatant();
                    if (!current?.character.spells) return <p className="combat-stat-text">No spells available</p>;

                    const allSpells = [
                      ...(current.character.spells.cantrips || []).map(name => ({ name, level: 0 })),
                      ...(current.character.spells.known_spells || []).map(name => {
                        const spell = SPELL_DATABASE[name];
                        return { name, level: spell?.level || 1 };
                      })
                    ];

                    return allSpells.map((spell) => {
                      const spellData = SPELL_DATABASE[spell.name];
                      if (!spellData) return null;

                      const isSelected = selectedSpellName === spell.name;
                      const isCantrip = spell.level === 0;
                      const hasSlot = isCantrip || (current.spellSlots && (current.spellSlots[spell.level] || 0) > 0);

                      return (
                        <button
                          key={spell.name}
                          onClick={() => setSelectedSpellName(spell.name)}
                          disabled={!hasSlot}
                          className={`combat-spell-button ${!hasSlot ? 'combat-spell-button-disabled' : ''} ${isSelected ? 'combat-spell-button-selected' : ''}`}
                        >
                          <div className="combat-spell-name">{spell.name}</div>
                          <div className="combat-spell-details">
                            {getSpellLevelText(spell.level)} • {spellData.school}
                            {!hasSlot && !isCantrip && ' • No slots'}
                          </div>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Target selection for spells */}
              {selectedSpellName && (
                <div className="combat-spell-targets">
                  <div className="combat-spell-targets-label">Select Target(s):</div>
                  <div className="combat-targets-grid">
                    {getLivingCombatants()
                      .filter((c: Combatant) => {
                        const current = getCurrentCombatant();
                        return current && c.id !== current.id;
                      })
                      .map((target: Combatant) => (
                        <button
                          key={target.id}
                          onClick={() => handleTargetToggle(target.id)}
                          className={`combat-target-button ${selectedTargetIds.includes(target.id) ? 'combat-target-button-selected' : ''}`}
                        >
                          <div className="combat-target-name">{target.character.name}</div>
                          <div className="combat-target-hp">
                            HP: {target.currentHP}/{target.character.hp.max}
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Cast button */}
              {selectedSpellName && selectedTargetIds.length > 0 && (
                <div className="combat-spell-cast-row">
                  <button
                    onClick={handleCastSpell}
                    className="combat-spell-cast-button"
                  >
                    <span>✨</span> Cast {selectedSpellName}
                  </button>
                  <span className="combat-spell-target-count">
                    on {selectedTargetIds.length} target{selectedTargetIds.length > 1 ? 's' : ''}
                  </span>
                </div>
              )}

              {selectedSpellName && selectedTargetIds.length === 0 && (
                <p className="combat-spell-warning">
                  ⚠️ Select at least one target to cast this spell
                </p>
              )}
            </div>
          )}

          {/* Combat Area: Initiative Order + Combatant Cards */}
          <div className="combat-area">
            {/* Initiative Order Sidebar - Task 4.9.2 */}
            <div className="combat-initiative">
              <div className="combat-initiative-inner">
                <h3 className="combat-initiative-title">Initiative Order</h3>
                <div className="combat-initiative-list">
                  {combat.combatants
                    .sort((a: Combatant, b: Combatant) => b.initiative - a.initiative)
                    .map((combatant: Combatant, index: number) => {
                      const current = getCurrentCombatant();
                      const isCurrentTurn = current?.id === combatant.id;

                      return (
                        <div
                          key={combatant.id}
                          className={`combat-initiative-item ${
                            isCurrentTurn
                              ? 'combat-initiative-item-current'
                              : combatant.isDefeated
                              ? 'combat-initiative-item-defeated'
                              : ''
                          }`}
                        >
                          <div className="combat-initiative-row">
                            <span className="combat-initiative-number">{index + 1}.</span>
                            <span className="combat-initiative-name">{combatant.character.name}</span>
                            <span className="combat-initiative-value">{combatant.initiative}</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Combatant Cards */}
            <div className="combat-combatants">
              <div className="combat-combatants-grid">
                {combat.combatants.map((combatant: Combatant) => {
                  const current = getCurrentCombatant();
                  const isCurrentTurn = current?.id === combatant.id;
                  const hpPercent = (combatant.currentHP / combatant.character.hp.max) * 100;
                  const hpColor = hpPercent > 50 ? 'combat-combatant-hp-fill-green' : hpPercent > 25 ? 'combat-combatant-hp-fill-yellow' : 'combat-combatant-hp-fill-red';

                  return (
                    <div
                      key={combatant.id}
                      className={`combat-combatant-card ${isCurrentTurn ? 'combat-combatant-card-current' : ''} ${combatant.isDefeated ? 'combat-combatant-card-defeated' : ''}`}
                    >
                      <div className="combat-combatant-header">
                        <div>
                          <h3 className="combat-combatant-name">{combatant.character.name}</h3>
                          <p className="combat-combatant-class">{combatant.character.race} {combatant.character.class}</p>
                        </div>
                        {isCurrentTurn && <span className="combat-combatant-badge">Current</span>}
                      </div>

                      <div className="combat-combatant-hp-section">
                        <div className="combat-combatant-hp-header">
                          <span>HP</span>
                          <span>{combatant.currentHP} / {combatant.character.hp.max}</span>
                        </div>
                        <div className="combat-combatant-hp-bar">
                          <div className={`combat-combatant-hp-fill ${hpColor}`} style={{ width: `${hpPercent}%` }} />
                        </div>
                      </div>

                      <div className="combat-combatant-stats">
                        <div>Initiative: <span className="combat-stat-bold">{combatant.initiative}</span></div>
                        {combatant.isDefeated && <span className="combat-combatant-defeated">Defeated</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Combat Log - Task 4.9.3 */}
          {combatLog.length > 0 && (
            <div className="combat-log-section">
              <div className="combat-log-header">
                <h3 className="combat-log-title">Combat Log</h3>
                {isAutoPlaying && <span className="combat-log-autoscroll combat-log-autoscroll-pulse">● Auto-scrolling</span>}
              </div>
              <div ref={combatLogRef} className="combat-log-container">
                {combatLog.map((action: any, index: number) => {
                  const borderColor = getLogEntryColor(action);
                  const actionRound = getActionRound(index, combat.combatants.length);
                  const isSuccessHit = action.result?.success === true && action.type === 'attack';
                  const isMiss = action.result?.success === false;
                  const isSpell = action.type === 'spell';

                  return (
                    <div
                      key={index}
                      className={`combat-log-entry ${borderColor}`}
                    >
                      {/* Round number and action type */}
                      <div className="combat-log-meta">
                        <span className="combat-log-round">
                          Round {actionRound}
                        </span>
                        <span className="combat-log-actor">
                          {action.actor.character.name}
                        </span>
                        <span className="combat-log-action">
                          used {action.type === 'attack' ? 'an attack' : action.type}
                        </span>
                        {action.target && (
                          <span className="combat-log-action">
                            on <span className="combat-log-target-name">{action.target.character.name}</span>
                          </span>
                        )}
                      </div>

                      {/* Action details */}
                      {action.attack && (
                        <div className="combat-log-detail">
                          Weapon: <span className="combat-log-detail-value">{action.attack.name}</span>
                        </div>
                      )}

                      {/* Roll values */}
                      {action.result?.roll !== undefined && (
                        <div className="combat-log-detail">
                          <span className="combat-log-detail-label">Roll:</span>{' '}
                          <span className={`combat-log-detail-value ${isSuccessHit ? 'combat-log-roll' : isMiss ? 'combat-log-roll-miss' : ''}`}>
                            d20 {action.result.roll >= 0 ? '+' : ''}{action.result.roll}
                          </span>
                          {action.result.isCritical && (
                            <span className="combat-log-roll-crit">🎯 CRITICAL!</span>
                          )}
                        </div>
                      )}

                      {/* Hit/Miss result */}
                      {action.result?.success !== undefined && (
                        <div className="combat-log-detail">
                          <span className="combat-log-detail-label">Result:</span>{' '}
                          <span className={`combat-log-detail-value ${isSuccessHit ? 'combat-log-roll' : 'combat-log-roll-miss'}`}>
                            {isSuccessHit ? '✓ HIT' : '✗ MISS'}
                          </span>
                        </div>
                      )}

                      {/* Damage dealt */}
                      {action.result?.damage !== undefined && action.result?.success && (
                        <div className="combat-log-detail">
                          <span className="combat-log-detail-label">Damage:</span>{' '}
                          <span className="combat-log-detail-value combat-log-damage">
                            {action.result.damage} {action.result.damageType || ''}
                          </span>
                        </div>
                      )}

                      {/* HP change */}
                      {action.result?.targetHP !== undefined && (
                        <div className="combat-log-detail">
                          <span className="combat-log-detail-label">Target HP:</span>{' '}
                          <span className={`combat-log-detail-value ${action.result.targetHP < 10 ? 'combat-log-low-hp' : ''}`}>
                            {action.result.targetHP} / {action.target?.character.hp.max || '?'}
                          </span>
                        </div>
                      )}

                      {/* Spell details */}
                      {isSpell && action.spell && (
                        <div className="combat-log-detail combat-log-spell">
                          <span className="combat-log-detail-value">{action.spell.name}</span>
                          {action.result?.description && (
                            <span className="combat-log-detail-label combat-log-detail-margin">({action.result.description})</span>
                          )}
                        </div>
                      )}

                      {/* Status effects */}
                      {action.result?.statusEffects && action.result.statusEffects.length > 0 && (
                        <div className="combat-log-detail combat-log-status">
                          Status: {action.result.statusEffects.map((e: any) => e.name).join(', ')}
                        </div>
                      )}

                      {/* Description as fallback */}
                      {!action.result?.roll && !action.result?.damage && action.result?.description && (
                        <div className="combat-log-description">
                          {action.result.description}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Victory Overlay - Task 4.9.5 */}
          {combatResult && (
            <div className="combat-victory-overlay">
              <div className="combat-victory-card">
                <h2 className="combat-victory-title">⚔️ Victory! ⚔️</h2>

                <div className="combat-victory-stats">
                  <div className="combat-victory-stat">
                    <span className="combat-victory-stat-label">Winner</span>
                    <span className="combat-victory-stat-value">{combatResult.winner.character.name}</span>
                  </div>

                  <div className="combat-victory-stat">
                    <span className="combat-victory-stat-label">XP Awarded</span>
                    <span className="combat-victory-stat-value combat-victory-xp">
                      +{combatResult.xpAwarded} XP
                      {xpAwarded && <span className="combat-victory-xp-recipient"> to {xpAwarded.characterName}</span>}
                      {xpAwarded?.leveledUp && <span className="combat-victory-levelup"> 🎉 LEVEL UP!</span>}
                    </span>
                  </div>

                  <div className="combat-victory-stat">
                    <span className="combat-victory-stat-label">Rounds Elapsed</span>
                    <span className="combat-victory-stat-value">{combatResult.roundsElapsed}</span>
                  </div>

                  <div className="combat-victory-stat">
                    <span className="combat-victory-stat-label">Total Turns</span>
                    <span className="combat-victory-stat-value">{combatResult.totalTurns}</span>
                  </div>

                  {/* Performance metrics (Phase 5.5.2) */}
                  {combatPerformance && (
                    <>
                      <div className="combat-victory-stat">
                        <span className="combat-victory-stat-label">Combat Time</span>
                        <span className={`combat-victory-stat-value ${combatPerformance.performanceTarget === 'PASS' ? 'combat-victory-performance-pass' : 'combat-victory-performance-fail'}`}>
                          {combatPerformance.totalTimeSeconds}s
                        </span>
                      </div>
                      <div className="combat-victory-stat">
                        <span className="combat-victory-stat-label">Performance</span>
                        <span className={`combat-victory-performance-badge ${
                          combatPerformance.performanceTarget === 'PASS'
                            ? 'combat-victory-performance-pass'
                            : 'combat-victory-performance-fail'
                        }`}>
                          {combatPerformance.performanceTarget}
                        </span>
                      </div>
                    </>
                  )}

                  {combatResult.description && (
                    <div className="combat-victory-description">
                      <p className="combat-victory-description-text">
                        {combatResult.description}
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={resetCombat}
                  className="combat-victory-restart"
                >
                  Restart Combat
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons - Hide when combat ended */}
          {isActive && (
            <div className="combat-actions">
              {/* Manual control buttons */}
              <button
                onClick={handleNextTurn}
                disabled={isAutoPlaying}
                className={`combat-action-button combat-button combat-button-primary ${isAutoPlaying ? 'combat-button-disabled' : ''}`}
              >
                Next Turn
              </button>

              {/* Auto-play buttons (task 4.9.7) */}
              {!isAutoPlaying ? (
                <button
                  onClick={handleStartAutoPlay}
                  className="combat-action-button combat-button combat-button-green"
                >
                  <span>▶</span> Auto-Play
                </button>
              ) : (
                <button
                  onClick={handlePauseAutoPlay}
                  className="combat-action-button combat-button combat-button-amber"
                >
                  <span>⏸</span> Pause
                </button>
              )}

              <button
                onClick={resetCombat}
                className="combat-action-button combat-button combat-button-muted"
              >
                Reset Combat
              </button>

              {/* Auto-play status indicator (task 4.9.7) */}
              {isAutoPlaying && (
                <div className="combat-autoplay-status">
                  <span className="combat-autoplay-label">Auto-playing...</span>
                  <span className="combat-autoplay-interval">({AUTO_PLAY_INTERVAL_MS / 1000}s per turn)</span>
                </div>
              )}
            </div>
          )}

          {/* Raw JSON Dump - Task 4.9.10 */}
          <div className="combat-dump-section">
            <div className="combat-dump-header">
              <h3 className="combat-dump-title">Combat Engine Data</h3>
              <StatusIndicator status={isActive ? 'healthy' : 'error'} label={isActive ? 'Active' : 'Ended'} />
            </div>
            <RawJsonDump data={combat} title="Combat Instance JSON" defaultOpen={false} />
          </div>
        </div>
      )}
    </div>
  );
}

export default CombatSimulatorTab;
