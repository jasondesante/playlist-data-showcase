import { useCombatEngine } from '../../hooks/useCombatEngine';
import { useCharacterStore } from '../../store/characterStore';

export function CombatSimulatorTab() {
  const { startCombat } = useCombatEngine();
  const { characters } = useCharacterStore();

  const handleStartCombat = () => {
    if (characters.length === 0) return;
    // Create a mock enemy
    const enemy = { ...characters[0], name: 'Goblin', hp: { current: 20, max: 20, temp: 0 } };
    startCombat([characters[0]], [enemy]);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Combat Engine</h2>

      {characters.length === 0 ? (
        <p className="text-muted-foreground">Generate a character first</p>
      ) : (
        <button
          onClick={handleStartCombat}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
        >
          Start Combat
        </button>
      )}
    </div>
  );
}

export default CombatSimulatorTab;
