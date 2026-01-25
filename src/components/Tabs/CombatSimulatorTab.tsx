import { useState, useEffect, useRef } from 'react';
import { useCombatEngine, type Combatant } from '../../hooks/useCombatEngine';
import { useCharacterStore } from '../../store/characterStore';
import { StatusIndicator } from '../ui/StatusIndicator';
import { RawJsonDump } from '../ui/RawJsonDump';
import { SPELL_DATABASE } from 'playlist-data-engine';
import { logger } from '../../utils/logger';

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
  if (action.type === 'spell') return 'border-blue-500';
  if (action.result?.success) return 'border-green-500';
  if (action.result?.success === false) return 'border-red-500';
  return 'border-yellow-500';
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
  const { characters } = useCharacterStore();

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

  // Combat state from task 4.9.1 (moved before useEffect hooks to fix TS error)
  const currentTurnIndex = combat?.currentTurnIndex ?? null;
  const roundNumber = combat?.roundNumber ?? null;
  const combatLog = combat?.history ?? [];
  const isActive = combat?.isActive ?? false;

  const handleStartCombat = () => {
    if (characters.length === 0) return;
    // Create a mock enemy
    const enemy = { ...characters[0], name: 'Goblin', hp: { current: 20, max: 20, temp: 0 } };
    startCombat([characters[0]], [enemy]);
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

  // Get combat result if combat has ended
  const combatResult = combat && !combat.isActive ? getCombatResult() : null;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg md:text-xl font-bold">Combat Engine</h2>
        {combat && <StatusIndicator status={isActive ? 'healthy' : 'error'} label={isActive ? 'Active' : 'Ended'} />}
      </div>

      {characters.length === 0 ? (
        <p className="text-sm md:text-base text-muted-foreground">Generate a character first</p>
      ) : !combat ? (
        <button
          onClick={handleStartCombat}
          className="w-full sm:w-auto px-4 py-3 md:py-2 min-h-[44px] bg-primary text-primary-foreground rounded-md hover:opacity-90 text-sm md:text-base"
        >
          Start Combat
        </button>
      ) : (
        <div className="space-y-4 md:space-y-6">
          {/* Combat Info */}
          <div className="grid grid-cols-2 gap-2 md:gap-4 text-xs md:text-sm">
            <div className="p-2 md:p-0">Round: <span className="font-bold">{roundNumber}</span></div>
            <div className="p-2 md:p-0">Turn: <span className="font-bold">{currentTurnIndex !== null ? currentTurnIndex + 1 : '-'}</span></div>
          </div>

          {/* Manual Attack Controls - Task 4.9.6 */}
          {isActive && combat && (
            <div className="bg-muted rounded-lg p-3 md:p-4">
              <h3 className="font-bold mb-2 md:mb-3 text-sm md:text-base">Manual Attack Controls</h3>
              <p className="text-xs md:text-sm text-muted-foreground mb-2 md:mb-3">
                Choose a target to attack instead of auto-attacking the first available target.
              </p>

              {/* Available attacks for current combatant */}
              <div className="mb-2 md:mb-3">
                <div className="text-xs md:text-sm font-semibold mb-2">Available Attacks:</div>
                {(() => {
                  const current = getCurrentCombatant();
                  if (!current) return <p className="text-sm text-muted-foreground">No current combatant</p>;

                  const weapons = current.character.equipment?.weapons ?? [];
                  if (weapons.length === 0) {
                    return (
                      <div className="text-xs md:text-sm">
                        <span className="bg-background px-2 py-1 rounded border text-xs md:text-sm">Unarmed Strike</span>
                        <span className="text-muted-foreground ml-2">1 damage, bludgeoning</span>
                      </div>
                    );
                  }

                  return (
                    <div className="flex flex-wrap gap-1 md:gap-2">
                      {weapons.map((weapon: any, index: number) => (
                        <div key={index} className="bg-background px-2 md:px-3 py-2 rounded border text-xs md:text-sm">
                          <div className="font-semibold text-xs md:text-sm">{weapon.name}</div>
                          <div className="text-[10px] md:text-xs text-muted-foreground">
                            {weapon.damage_dice} {weapon.damage_type} {weapon.type === 'melee' ? '⚔️' : '🏹'}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Available targets */}
              <div className="mb-2 md:mb-3">
                <div className="text-xs md:text-sm font-semibold mb-2">Available Targets:</div>
                <div className="flex flex-wrap gap-1 md:gap-2">
                  {getLivingCombatants()
                    .filter((c: Combatant) => {
                      const current = getCurrentCombatant();
                      return current && c.id !== current.id;
                    })
                    .map((target: Combatant) => (
                      <button
                        key={target.id}
                        onClick={() => handleManualAttack(target)}
                        className={`px-2 md:px-3 py-2 md:py-2 min-h-[44px] rounded border text-xs md:text-sm text-left transition-colors ${
                          selectedTargetId === target.id
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background hover:bg-muted border-muted'
                        }`}
                      >
                        <div className="font-semibold text-xs md:text-sm truncate">{target.character.name}</div>
                        <div className="text-[10px] md:text-xs opacity-80">
                          {target.character.race} {target.character.class} • HP: {target.currentHP}/{target.character.hp.max}
                        </div>
                      </button>
                    ))}
                </div>
              </div>

              <p className="text-[10px] md:text-xs text-muted-foreground italic">
                Click a target to perform an attack with your current combatant's available weapon(s).
              </p>
            </div>
          )}

          {/* Spell Casting UI - Task 4.9.8 */}
          {isActive && combat && (() => {
            const current = getCurrentCombatant();
            return current && isSpellcaster(current.character);
          })() && (
            <div className="bg-blue-950/30 dark:bg-blue-950/50 rounded-lg p-3 md:p-4 border border-blue-800/50">
              <h3 className="font-bold mb-2 md:mb-3 flex items-center gap-2 text-sm md:text-base">
                <span>✨ Spell Casting</span>
                <span className="text-[10px] md:text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                  {getCurrentCombatant()?.character.class}
                </span>
              </h3>

              {/* Spell slots remaining */}
              <div className="mb-2 md:mb-3 p-2 bg-background/50 rounded">
                <div className="text-xs md:text-sm font-semibold mb-1">Spell Slots Remaining:</div>
                {(() => {
                  const current = getCurrentCombatant();
                  if (!current?.spellSlots) return null;

                  const slots = Object.entries(current.spellSlots)
                    .filter(([_, count]) => count > 0 || parseInt(_) > 0)
                    .sort(([a], [b]) => parseInt(a) - parseInt(b));

                  if (slots.length === 0) {
                    return <p className="text-[10px] md:text-xs text-muted-foreground">No spell slots remaining</p>;
                  }

                  return (
                    <div className="flex flex-wrap gap-1 md:gap-2">
                      {slots.map(([level, count]) => (
                        <div key={level} className="text-[10px] md:text-xs bg-blue-900/30 px-2 py-1 rounded border border-blue-700/50">
                          Level {level}: <span className={`font-bold ${count === 0 ? 'text-red-400' : 'text-green-400'}`}>{count}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Known spells */}
              <div className="mb-2 md:mb-3">
                <div className="text-xs md:text-sm font-semibold mb-2">Known Spells:</div>
                <div className="flex flex-wrap gap-1 md:gap-2 max-h-32 md:max-h-40 overflow-y-auto">
                  {(() => {
                    const current = getCurrentCombatant();
                    if (!current?.character.spells) return <p className="text-xs md:text-sm text-muted-foreground">No spells available</p>;

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
                          className={`px-2 md:px-3 py-2 md:py-2 min-h-[44px] rounded border text-xs md:text-sm text-left transition-colors ${
                            !hasSlot
                              ? 'bg-muted opacity-50 cursor-not-allowed'
                              : isSelected
                              ? 'bg-blue-600 text-white border-blue-500'
                              : 'bg-background hover:bg-blue-100 dark:hover:bg-blue-900/30 border-muted'
                          }`}
                        >
                          <div className="font-semibold text-xs md:text-sm truncate">{spell.name}</div>
                          <div className="text-[10px] md:text-xs opacity-80">
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
                <div className="mb-2 md:mb-3 p-2 md:p-3 bg-background/50 rounded">
                  <div className="text-xs md:text-sm font-semibold mb-2">Select Target(s):</div>
                  <div className="flex flex-wrap gap-1 md:gap-2">
                    {getLivingCombatants()
                      .filter((c: Combatant) => {
                        const current = getCurrentCombatant();
                        return current && c.id !== current.id;
                      })
                      .map((target: Combatant) => (
                        <button
                          key={target.id}
                          onClick={() => handleTargetToggle(target.id)}
                          className={`px-2 md:px-3 py-2 md:py-2 min-h-[44px] rounded border text-xs md:text-sm text-left transition-colors ${
                            selectedTargetIds.includes(target.id)
                              ? 'bg-purple-600 text-white border-purple-500'
                              : 'bg-background hover:bg-purple-100 dark:hover:bg-purple-900/30 border-muted'
                          }`}
                        >
                          <div className="font-semibold text-xs md:text-sm truncate">{target.character.name}</div>
                          <div className="text-[10px] md:text-xs opacity-80">
                            HP: {target.currentHP}/{target.character.hp.max}
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Cast button */}
              {selectedSpellName && selectedTargetIds.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <button
                    onClick={handleCastSpell}
                    className="w-full sm:w-auto px-4 py-3 md:py-2 min-h-[44px] bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold flex items-center justify-center gap-2 text-sm md:text-base"
                  >
                    <span>✨</span> Cast {selectedSpellName}
                  </button>
                  <span className="text-[10px] md:text-xs text-muted-foreground">
                    on {selectedTargetIds.length} target{selectedTargetIds.length > 1 ? 's' : ''}
                  </span>
                </div>
              )}

              {selectedSpellName && selectedTargetIds.length === 0 && (
                <p className="text-[10px] md:text-xs text-amber-600 dark:text-amber-400">
                  ⚠️ Select at least one target to cast this spell
                </p>
              )}
            </div>
          )}

          {/* Combat Area: Initiative Order + Combatant Cards */}
          <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
            {/* Initiative Order Sidebar - Task 4.9.2 */}
            <div className="lg:w-1/4">
              <div className="bg-muted rounded-lg p-3 md:p-4 sticky top-4">
                <h3 className="font-bold mb-2 md:mb-3 text-xs md:text-sm">Initiative Order</h3>
                <div className="space-y-1 md:space-y-2">
                  {combat.combatants
                    .sort((a: Combatant, b: Combatant) => b.initiative - a.initiative)
                    .map((combatant: Combatant, index: number) => {
                      const current = getCurrentCombatant();
                      const isCurrentTurn = current?.id === combatant.id;

                      return (
                        <div
                          key={combatant.id}
                          className={`text-[10px] md:text-xs p-1 md:p-2 rounded border ${
                            isCurrentTurn
                              ? 'bg-primary text-primary-foreground border-primary'
                              : combatant.isDefeated
                              ? 'bg-background opacity-50 border-muted line-through'
                              : 'bg-background border-muted'
                          }`}
                        >
                          <div className="flex items-center gap-1 md:gap-2">
                            <span className="font-bold w-4 md:w-5 text-[10px] md:text-xs">{index + 1}.</span>
                            <span className="flex-1 truncate text-[10px] md:text-xs">{combatant.character.name}</span>
                            <span className="font-mono text-[10px] md:text-xs">{combatant.initiative}</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Combatant Cards */}
            <div className="lg:w-3/4 grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
              {combat.combatants.map((combatant: Combatant) => {
                const current = getCurrentCombatant();
                const isCurrentTurn = current?.id === combatant.id;
                const hpPercent = (combatant.currentHP / combatant.character.hp.max) * 100;
                const hpColor = hpPercent > 50 ? 'bg-green-500' : hpPercent > 25 ? 'bg-yellow-500' : 'bg-red-500';

                return (
                  <div
                    key={combatant.id}
                    className={`border rounded-lg p-3 md:p-4 ${isCurrentTurn ? 'ring-2 ring-primary' : ''} ${combatant.isDefeated ? 'opacity-50' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-1 md:mb-2">
                      <div>
                        <h3 className="font-bold text-sm md:text-base">{combatant.character.name}</h3>
                        <p className="text-xs md:text-sm text-muted-foreground">{combatant.character.race} {combatant.character.class}</p>
                      </div>
                      {isCurrentTurn && <span className="text-[10px] md:text-xs bg-primary text-primary-foreground px-2 py-1 rounded">Current</span>}
                    </div>

                    <div className="mb-1 md:mb-2">
                      <div className="flex justify-between text-xs md:text-sm mb-1">
                        <span>HP</span>
                        <span>{combatant.currentHP} / {combatant.character.hp.max}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 md:h-2">
                        <div className={`h-1.5 md:h-2 rounded-full ${hpColor}`} style={{ width: `${hpPercent}%` }} />
                      </div>
                    </div>

                    <div className="text-xs md:text-sm space-y-0.5 md:space-y-1">
                      <div>Initiative: <span className="font-bold">{combatant.initiative}</span></div>
                      {combatant.isDefeated && <span className="text-red-500">Defeated</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Combat Log - Task 4.9.3 */}
          {combatLog.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-sm md:text-base">Combat Log</h3>
                {isAutoPlaying && <span className="text-[10px] md:text-xs text-green-600 animate-pulse">● Auto-scrolling</span>}
              </div>
              <div ref={combatLogRef} className="bg-muted rounded-lg p-3 md:p-4 max-h-80 md:max-h-96 overflow-y-auto space-y-1 md:space-y-2 scroll-smooth">
                {combatLog.map((action: any, index: number) => {
                  const borderColor = getLogEntryColor(action);
                  const actionRound = getActionRound(index, combat.combatants.length);
                  const isSuccessHit = action.result?.success === true && action.type === 'attack';
                  const isMiss = action.result?.success === false;
                  const isSpell = action.type === 'spell';

                  return (
                    <div
                      key={index}
                      className={`text-[10px] md:text-sm border-l-4 ${borderColor} bg-background rounded-r-lg p-2 md:p-3`}
                    >
                      {/* Round number and action type */}
                      <div className="flex items-center gap-1 md:gap-2 mb-0.5 md:mb-1 flex-wrap">
                        <span className="text-[10px] md:text-xs font-bold bg-muted px-1 md:px-2 py-0.5 rounded">
                          Round {actionRound}
                        </span>
                        <span className="font-bold text-foreground text-[10px] md:text-xs">
                          {action.actor.character.name}
                        </span>
                        <span className="text-muted-foreground text-[10px] md:text-xs">
                          used {action.type === 'attack' ? 'an attack' : action.type}
                        </span>
                        {action.target && (
                          <span className="text-muted-foreground text-[10px] md:text-xs">
                            on <span className="font-semibold">{action.target.character.name}</span>
                          </span>
                        )}
                      </div>

                      {/* Action details */}
                      {action.attack && (
                        <div className="text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">
                          Weapon: <span className="font-semibold">{action.attack.name}</span>
                        </div>
                      )}

                      {/* Roll values */}
                      {action.result?.roll !== undefined && (
                        <div className="text-[10px] md:text-xs">
                          <span className="text-muted-foreground">Roll:</span>{' '}
                          <span className={`font-bold ${isSuccessHit ? 'text-green-600' : isMiss ? 'text-red-600' : ''}`}>
                            d20 {action.result.roll >= 0 ? '+' : ''}{action.result.roll}
                          </span>
                          {action.result.isCritical && (
                            <span className="ml-1 md:ml-2 text-yellow-600 font-bold text-[10px] md:text-xs">🎯 CRITICAL!</span>
                          )}
                        </div>
                      )}

                      {/* Hit/Miss result */}
                      {action.result?.success !== undefined && (
                        <div className="text-[10px] md:text-xs">
                          <span className="text-muted-foreground">Result:</span>{' '}
                          <span className={`font-bold ${isSuccessHit ? 'text-green-600' : 'text-red-600'}`}>
                            {isSuccessHit ? '✓ HIT' : '✗ MISS'}
                          </span>
                        </div>
                      )}

                      {/* Damage dealt */}
                      {action.result?.damage !== undefined && action.result?.success && (
                        <div className="text-[10px] md:text-xs">
                          <span className="text-muted-foreground">Damage:</span>{' '}
                          <span className="font-bold text-orange-600">
                            {action.result.damage} {action.result.damageType || ''}
                          </span>
                        </div>
                      )}

                      {/* HP change */}
                      {action.result?.targetHP !== undefined && (
                        <div className="text-[10px] md:text-xs">
                          <span className="text-muted-foreground">Target HP:</span>{' '}
                          <span className={`font-bold ${action.result.targetHP < 10 ? 'text-red-600' : ''}`}>
                            {action.result.targetHP} / {action.target?.character.hp.max || '?'}
                          </span>
                        </div>
                      )}

                      {/* Spell details */}
                      {isSpell && action.spell && (
                        <div className="text-[10px] md:text-xs text-blue-600">
                          <span className="font-bold">{action.spell.name}</span>
                          {action.result?.description && (
                            <span className="text-muted-foreground ml-1 md:ml-2">({action.result.description})</span>
                          )}
                        </div>
                      )}

                      {/* Status effects */}
                      {action.result?.statusEffects && action.result.statusEffects.length > 0 && (
                        <div className="text-[10px] md:text-xs text-yellow-600">
                          Status: {action.result.statusEffects.map((e: any) => e.name).join(', ')}
                        </div>
                      )}

                      {/* Description as fallback */}
                      {!action.result?.roll && !action.result?.damage && action.result?.description && (
                        <div className="text-[10px] md:text-xs text-muted-foreground italic">
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
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
              <div className="bg-background border-2 border-primary rounded-lg p-4 md:p-8 max-w-md w-full mx-0 md:mx-4 shadow-2xl">
                <h2 className="text-xl md:text-3xl font-bold text-center mb-4 md:mb-6 text-primary">⚔️ Victory! ⚔️</h2>

                <div className="space-y-2 md:space-y-4 mb-4 md:mb-6">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-xs md:text-sm text-muted-foreground">Winner</span>
                    <span className="text-base md:text-2xl font-bold">{combatResult.winner.character.name}</span>
                  </div>

                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-xs md:text-sm text-muted-foreground">XP Awarded</span>
                    <span className="text-base md:text-xl font-bold text-green-600">+{combatResult.xpAwarded} XP</span>
                  </div>

                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-xs md:text-sm text-muted-foreground">Rounds Elapsed</span>
                    <span className="text-sm md:text-lg font-semibold">{combatResult.roundsElapsed}</span>
                  </div>

                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-xs md:text-sm text-muted-foreground">Total Turns</span>
                    <span className="text-sm md:text-lg font-semibold">{combatResult.totalTurns}</span>
                  </div>

                  {/* Performance metrics (Phase 5.5.2) */}
                  {combatPerformance && (
                    <>
                      <div className="flex justify-between items-center border-b pb-2">
                        <span className="text-xs md:text-sm text-muted-foreground">Combat Time</span>
                        <span className={`text-sm md:text-lg font-semibold ${combatPerformance.performanceTarget === 'PASS' ? 'text-green-600' : 'text-red-600'}`}>
                          {combatPerformance.totalTimeSeconds}s
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-b pb-2">
                        <span className="text-xs md:text-sm text-muted-foreground">Performance</span>
                        <span className={`text-xs md:text-sm font-bold px-2 py-1 rounded ${
                          combatPerformance.performanceTarget === 'PASS'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {combatPerformance.performanceTarget}
                        </span>
                      </div>
                    </>
                  )}

                  {combatResult.description && (
                    <div className="pt-2">
                      <p className="text-xs md:text-sm text-center text-muted-foreground italic">
                        {combatResult.description}
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={resetCombat}
                  className="w-full px-4 md:px-6 py-3 md:py-3 min-h-[44px] bg-primary text-primary-foreground rounded-lg font-bold hover:opacity-90 transition-opacity text-sm md:text-base"
                >
                  Restart Combat
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons - Hide when combat ended */}
          {isActive && (
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 md:gap-4">
              {/* Manual control buttons */}
              <button
                onClick={handleNextTurn}
                disabled={isAutoPlaying}
                className="w-full sm:w-auto px-4 py-3 md:py-2 min-h-[44px] bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
              >
                Next Turn
              </button>

              {/* Auto-play buttons (task 4.9.7) */}
              {!isAutoPlaying ? (
                <button
                  onClick={handleStartAutoPlay}
                  className="w-full sm:w-auto px-4 py-3 md:py-2 min-h-[44px] bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center gap-2 text-sm md:text-base"
                >
                  <span>▶</span> Auto-Play
                </button>
              ) : (
                <button
                  onClick={handlePauseAutoPlay}
                  className="w-full sm:w-auto px-4 py-3 md:py-2 min-h-[44px] bg-amber-600 text-white rounded-md hover:bg-amber-700 flex items-center justify-center gap-2 text-sm md:text-base"
                >
                  <span>⏸</span> Pause
                </button>
              )}

              <button
                onClick={resetCombat}
                className="w-full sm:w-auto px-4 py-3 md:py-2 min-h-[44px] bg-muted text-muted-foreground rounded-md hover:opacity-90 text-sm md:text-base"
              >
                Reset Combat
              </button>

              {/* Auto-play status indicator (task 4.9.7) */}
              {isAutoPlaying && (
                <div className="flex items-center gap-1 md:gap-2 text-xs md:text-sm text-green-600 animate-pulse w-full sm:w-auto">
                  <span className="font-semibold">Auto-playing...</span>
                  <span className="text-muted-foreground">({AUTO_PLAY_INTERVAL_MS / 1000}s per turn)</span>
                </div>
              )}
            </div>
          )}

          {/* Raw JSON Dump - Task 4.9.10 */}
          <div className="space-y-2 md:space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm md:text-base">Combat Engine Data</h3>
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
