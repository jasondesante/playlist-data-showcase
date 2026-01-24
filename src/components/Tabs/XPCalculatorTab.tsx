import { useState } from 'react';
import { useXPCalculator } from '../../hooks/useXPCalculator';
import { useSensorStore } from '../../store/sensorStore';
import { StatusIndicator } from '../ui/StatusIndicator';

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
 * - Environmental context integration
 * - Gaming context integration
 */
export function XPCalculatorTab() {
  const { calculateXP } = useXPCalculator();
  const { environmentalContext, gamingContext } = useSensorStore();
  const [duration, setDuration] = useState(180);
  const [result, setResult] = useState<any>(null);

  const handleCalculate = () => {
    const xpResult = calculateXP(
      duration,
      environmentalContext || undefined,
      gamingContext || undefined,
      false // isMastered - can be added later
    );
    setResult(xpResult);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">XP Calculator</h2>

      <div className="space-y-4">
        {/* Duration Input */}
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
          <p className="text-xs text-muted-foreground mt-1">
            {Math.floor(duration / 60)} minutes {duration % 60} seconds
          </p>
        </div>

        {/* Environmental Context Section */}
        <div className="p-4 bg-muted/50 rounded-lg border border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Environmental Context</h3>
            <StatusIndicator
              status={environmentalContext ? 'healthy' : 'degraded'}
              label={environmentalContext ? 'Active' : 'Not set'}
            />
          </div>

          {environmentalContext ? (
            <div className="space-y-2 text-sm">
              {/* Show timestamp */}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Updated:</span>
                <span className="font-medium">
                  {new Date(environmentalContext.timestamp || Date.now()).toLocaleTimeString()}
                </span>
              </div>

              {/* Show motion data status */}
              {environmentalContext.motion && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Motion Data:</span>
                  <span className="font-medium text-green-600">Active</span>
                </div>
              )}

              {/* Show any available geolocation data */}
              {(environmentalContext as any).geolocation && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GPS:</span>
                  <span className="font-medium">
                    {(environmentalContext as any).geolocation.latitude?.toFixed(4) || 'N/A'},{' '}
                    {(environmentalContext as any).geolocation.longitude?.toFixed(4) || 'N/A'}
                  </span>
                </div>
              )}

              {/* Show weather data */}
              {(environmentalContext as any).weather && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Weather:</span>
                  <span className="font-medium capitalize">
                    {(environmentalContext as any).weather.weather_type || 'Unknown'}
                    {(environmentalContext as any).weather.temperature && (
                      <span className="ml-2">
                        {Math.round((environmentalContext as any).weather.temperature)}°C
                      </span>
                    )}
                  </span>
                </div>
              )}

              <p className="text-xs text-muted-foreground mt-2">
                From Environmental Sensors tab
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No environmental data available. Visit the Environmental Sensors tab to set up sensors.
            </p>
          )}
        </div>

        {/* Gaming Context Section */}
        <div className="p-4 bg-muted/50 rounded-lg border border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Gaming Context</h3>
            <StatusIndicator
              status={gamingContext?.isActivelyGaming ? 'healthy' : 'degraded'}
              label={gamingContext?.isActivelyGaming ? 'Gaming' : 'Not gaming'}
            />
          </div>

          {gamingContext ? (
            <div className="space-y-2 text-sm">
              {/* Show active gaming status */}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className={`font-medium ${gamingContext.isActivelyGaming ? 'text-green-600' : ''}`}>
                  {gamingContext.isActivelyGaming ? 'Currently Gaming' : 'Not Gaming'}
                </span>
              </div>

              {/* Show current game if available */}
              {(gamingContext as any).currentGame && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Game:</span>
                  <span className="font-medium">{(gamingContext as any).currentGame.name || 'Unknown'}</span>
                </div>
              )}

              {/* Show Steam ID if available */}
              {(gamingContext as any).steamId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Steam ID:</span>
                  <span className="font-medium font-mono text-xs">{(gamingContext as any).steamId}</span>
                </div>
              )}

              <p className="text-xs text-muted-foreground mt-2">
                From Gaming Platforms tab
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No gaming data available. Visit the Gaming Platforms tab to connect platforms.
            </p>
          )}
        </div>

        {/* Calculate Button */}
        <button
          onClick={handleCalculate}
          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
        >
          Calculate XP
        </button>

        {/* Results */}
        {result && (
          <div className="p-4 bg-card border border-border rounded-md">
            <p className="text-sm text-muted-foreground">Total XP</p>
            <p className="text-3xl font-bold">{result.totalXp}</p>
            {result.bonusXp > 0 && (
              <div className="mt-2 text-xs text-muted-foreground">
                <div>Base XP: {result.baseXp}</div>
                <div className="text-green-600">Bonus XP: +{result.bonusXp}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default XPCalculatorTab;
