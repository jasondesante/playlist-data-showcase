import { useCombatEngine, type Combatant } from '../../hooks/useCombatEngine';
import { useCharacterStore } from '../../store/characterStore';
import { StatusIndicator } from '../ui/StatusIndicator';
import { RawJsonDump } from '../ui/RawJsonDump';

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

          {/* Combatant Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          {/* Combat Log */}
          {combatLog.length > 0 && (
            <div>
              <h3 className="font-bold mb-2">Combat Log</h3>
              <div className="bg-muted rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                {combatLog.map((action: any, index: number) => (
                  <div key={index} className="text-sm border-l-2 border-primary pl-2">
                    <span className="font-bold">{action.actor.character.name}</span> used{' '}
                    <span className="font-bold">{action.type}</span>
                    {action.target && <span> on {action.target.character.name}</span>}
                    {action.result && <p className="text-muted-foreground">{action.result.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Combat Result */}
          {combatResult && (
            <div className="bg-primary/10 border border-primary rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4">Combat Ended!</h3>
              <p className="mb-2">Winner: <span className="font-bold">{combatResult.winner.character.name}</span></p>
              <p className="mb-2">Rounds Elapsed: <span className="font-bold">{combatResult.roundsElapsed}</span></p>
              <p className="mb-2">Total Turns: <span className="font-bold">{combatResult.totalTurns}</span></p>
              <p>XP Awarded: <span className="font-bold">{combatResult.xpAwarded}</span></p>
            </div>
          )}

          {/* Action Buttons */}
          {isActive ? (
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
          ) : (
            <button
              onClick={resetCombat}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
            >
              New Combat
            </button>
          )}

          {/* Raw JSON Dump */}
          <RawJsonDump data={combat} title="Combat Instance JSON" defaultOpen={false} />
        </div>
      )}
    </div>
  );
}

export default CombatSimulatorTab;
