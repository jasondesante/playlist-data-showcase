import { useState } from 'react';
import { useXPCalculator } from '../../hooks/useXPCalculator';

/**
 * XPCalculatorTab - XP Calculator Tab Component
 *
 * Demonstrates the XPCalculator from playlist-data-engine.
 * Allows users to calculate XP earned based on listening duration.
 *
 * Features:
 * - Duration input (in seconds)
 * - XP calculation button
 * - Display of total XP earned
 */
export function XPCalculatorTab() {
  const { calculateXP } = useXPCalculator();
  const [duration, setDuration] = useState(180);
  const [result, setResult] = useState<any>(null);

  const handleCalculate = () => {
    const xpResult = calculateXP(duration);
    setResult(xpResult);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">XP Calculator</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Duration (seconds)</label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full px-3 py-2 bg-background border border-input rounded-md"
            min="0"
            max="3600"
          />
        </div>

        <button
          onClick={handleCalculate}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
        >
          Calculate XP
        </button>

        {result && (
          <div className="p-4 bg-card border border-border rounded-md">
            <p className="text-sm text-muted-foreground">Total XP</p>
            <p className="text-3xl font-bold">{result.totalXp}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default XPCalculatorTab;
