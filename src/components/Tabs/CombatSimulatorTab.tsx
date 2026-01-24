import { useCombatEngine, type Combatant } from '../../hooks/useCombatEngine';
import { useCharacterStore } from '../../store/characterStore';
import { StatusIndicator } from '../ui/StatusIndicator';
import { RawJsonDump } from '../ui/RawJsonDump';

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

export function CombatSimulatorTab() {
  const {
    startCombat,
    getCurrentCombatant,
    executeAttack,
    nextTurn,
    getCombatResult,
    resetCombat,
    combat
  } = useCombatEngine();
  const { characters } = useCharacterStore();

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

    // Find a living target
    const livingTargets = combat.combatants.filter((c: Combatant) => !c.isDefeated && c.id !== current.id);
    if (livingTargets.length > 0) {
      const target = livingTargets[0];
      const action = executeAttack(current, target);
      if (action) {
        console.log('[Combat]', action.result?.description);
      }
    }

    const updated = nextTurn();
    if (updated && !updated.isActive) {
      const result = getCombatResult();
      console.log('[Combat]', `Combat ended! Winner: ${result?.winner.character.name}`);
    }
  };

  // Combat state from task 4.9.1
  const currentTurnIndex = combat?.currentTurnIndex ?? null;
  const roundNumber = combat?.roundNumber ?? null;
  const combatLog = combat?.history ?? [];
  const isActive = combat?.isActive ?? false;

  // Get combat result if combat has ended
  const combatResult = combat && !combat.isActive ? getCombatResult() : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Combat Engine</h2>
        {combat && <StatusIndicator status={isActive ? 'healthy' : 'error'} label={isActive ? 'Active' : 'Ended'} />}
      </div>

      {characters.length === 0 ? (
        <p className="text-muted-foreground">Generate a character first</p>
      ) : !combat ? (
        <button
          onClick={handleStartCombat}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
        >
          Start Combat
        </button>
      ) : (
        <div className="space-y-6">
          {/* Combat Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>Round: <span className="font-bold">{roundNumber}</span></div>
            <div>Turn: <span className="font-bold">{currentTurnIndex !== null ? currentTurnIndex + 1 : '-'}</span></div>
          </div>

          {/* Combat Area: Initiative Order + Combatant Cards */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Initiative Order Sidebar - Task 4.9.2 */}
            <div className="lg:w-1/4">
              <div className="bg-muted rounded-lg p-4 sticky top-4">
                <h3 className="font-bold mb-3 text-sm">Initiative Order</h3>
                <div className="space-y-2">
                  {combat.combatants
                    .sort((a: Combatant, b: Combatant) => b.initiative - a.initiative)
                    .map((combatant: Combatant, index: number) => {
                      const current = getCurrentCombatant();
                      const isCurrentTurn = current?.id === combatant.id;

                      return (
                        <div
                          key={combatant.id}
                          className={`text-xs p-2 rounded border ${
                            isCurrentTurn
                              ? 'bg-primary text-primary-foreground border-primary'
                              : combatant.isDefeated
                              ? 'bg-background opacity-50 border-muted line-through'
                              : 'bg-background border-muted'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold w-5">{index + 1}.</span>
                            <span className="flex-1 truncate">{combatant.character.name}</span>
                            <span className="font-mono">{combatant.initiative}</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Combatant Cards */}
            <div className="lg:w-3/4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {combat.combatants.map((combatant: Combatant) => {
                const current = getCurrentCombatant();
                const isCurrentTurn = current?.id === combatant.id;
                const hpPercent = (combatant.currentHP / combatant.character.hp.max) * 100;
                const hpColor = hpPercent > 50 ? 'bg-green-500' : hpPercent > 25 ? 'bg-yellow-500' : 'bg-red-500';

                return (
                  <div
                    key={combatant.id}
                    className={`border rounded-lg p-4 ${isCurrentTurn ? 'ring-2 ring-primary' : ''} ${combatant.isDefeated ? 'opacity-50' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold">{combatant.character.name}</h3>
                        <p className="text-sm text-muted-foreground">{combatant.character.race} {combatant.character.class}</p>
                      </div>
                      {isCurrentTurn && <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">Current</span>}
                    </div>

                    <div className="mb-2">
                      <div className="flex justify-between text-sm mb-1">
                        <span>HP</span>
                        <span>{combatant.currentHP} / {combatant.character.hp.max}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className={`h-2 rounded-full ${hpColor}`} style={{ width: `${hpPercent}%` }} />
                      </div>
                    </div>

                    <div className="text-sm space-y-1">
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
              <h3 className="font-bold mb-2">Combat Log</h3>
              <div className="bg-muted rounded-lg p-4 max-h-96 overflow-y-auto space-y-2">
                {combatLog.map((action: any, index: number) => {
                  const borderColor = getLogEntryColor(action);
                  const actionRound = getActionRound(index, combat.combatants.length);
                  const isSuccessHit = action.result?.success === true && action.type === 'attack';
                  const isMiss = action.result?.success === false;
                  const isSpell = action.type === 'spell';

                  return (
                    <div
                      key={index}
                      className={`text-sm border-l-4 ${borderColor} bg-background rounded-r-lg p-3`}
                    >
                      {/* Round number and action type */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold bg-muted px-2 py-0.5 rounded">
                          Round {actionRound}
                        </span>
                        <span className="font-bold text-foreground">
                          {action.actor.character.name}
                        </span>
                        <span className="text-muted-foreground">
                          used {action.type === 'attack' ? 'an attack' : action.type}
                        </span>
                        {action.target && (
                          <span className="text-muted-foreground">
                            on <span className="font-semibold">{action.target.character.name}</span>
                          </span>
                        )}
                      </div>

                      {/* Action details */}
                      {action.attack && (
                        <div className="text-xs text-muted-foreground mb-1">
                          Weapon: <span className="font-semibold">{action.attack.name}</span>
                        </div>
                      )}

                      {/* Roll values */}
                      {action.result?.roll !== undefined && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">Roll:</span>{' '}
                          <span className={`font-bold ${isSuccessHit ? 'text-green-600' : isMiss ? 'text-red-600' : ''}`}>
                            d20 {action.result.roll >= 0 ? '+' : ''}{action.result.roll}
                          </span>
                          {action.result.isCritical && (
                            <span className="ml-2 text-yellow-600 font-bold">🎯 CRITICAL!</span>
                          )}
                        </div>
                      )}

                      {/* Hit/Miss result */}
                      {action.result?.success !== undefined && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">Result:</span>{' '}
                          <span className={`font-bold ${isSuccessHit ? 'text-green-600' : 'text-red-600'}`}>
                            {isSuccessHit ? '✓ HIT' : '✗ MISS'}
                          </span>
                        </div>
                      )}

                      {/* Damage dealt */}
                      {action.result?.damage !== undefined && action.result?.success && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">Damage:</span>{' '}
                          <span className="font-bold text-orange-600">
                            {action.result.damage} {action.result.damageType || ''}
                          </span>
                        </div>
                      )}

                      {/* HP change */}
                      {action.result?.targetHP !== undefined && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">Target HP:</span>{' '}
                          <span className={`font-bold ${action.result.targetHP < 10 ? 'text-red-600' : ''}`}>
                            {action.result.targetHP} / {action.target?.character.hp.max || '?'}
                          </span>
                        </div>
                      )}

                      {/* Spell details */}
                      {isSpell && action.spell && (
                        <div className="text-xs text-blue-600">
                          <span className="font-bold">{action.spell.name}</span>
                          {action.result?.description && (
                            <span className="text-muted-foreground ml-2">({action.result.description})</span>
                          )}
                        </div>
                      )}

                      {/* Status effects */}
                      {action.result?.statusEffects && action.result.statusEffects.length > 0 && (
                        <div className="text-xs text-yellow-600">
                          Status: {action.result.statusEffects.map((e: any) => e.name).join(', ')}
                        </div>
                      )}

                      {/* Description as fallback */}
                      {!action.result?.roll && !action.result?.damage && action.result?.description && (
                        <div className="text-xs text-muted-foreground italic">
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
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
              <div className="bg-background border-2 border-primary rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
                <h2 className="text-3xl font-bold text-center mb-6 text-primary">⚔️ Victory! ⚔️</h2>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-muted-foreground">Winner</span>
                    <span className="text-2xl font-bold">{combatResult.winner.character.name}</span>
                  </div>

                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-muted-foreground">XP Awarded</span>
                    <span className="text-xl font-bold text-green-600">+{combatResult.xpAwarded} XP</span>
                  </div>

                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-muted-foreground">Rounds Elapsed</span>
                    <span className="text-lg font-semibold">{combatResult.roundsElapsed}</span>
                  </div>

                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-muted-foreground">Total Turns</span>
                    <span className="text-lg font-semibold">{combatResult.totalTurns}</span>
                  </div>

                  {combatResult.description && (
                    <div className="pt-2">
                      <p className="text-sm text-center text-muted-foreground italic">
                        {combatResult.description}
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={resetCombat}
                  className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-bold hover:opacity-90 transition-opacity"
                >
                  Restart Combat
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons - Hide when combat ended */}
          {isActive && (
            <div className="flex gap-4">
              <button
                onClick={handleNextTurn}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
              >
                Next Turn
              </button>
              <button
                onClick={resetCombat}
                className="px-4 py-2 bg-muted text-muted-foreground rounded-md hover:opacity-90"
              >
                Reset Combat
              </button>
            </div>
          )}

          {/* Raw JSON Dump - Task 4.9.10 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="font-bold">Combat Engine Data</h3>
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
