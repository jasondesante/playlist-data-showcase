import { useState } from 'react';
import { useXPCalculator, type XPBreakdown } from '../../hooks/useXPCalculator';
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
 * - Detailed bonus breakdown table (Task 4.5.3)
 */
export function XPCalculatorTab() {
  const { calculateXP } = useXPCalculator();
  const { environmentalContext, gamingContext } = useSensorStore();
  const [duration, setDuration] = useState(180);
  const [result, setResult] = useState<XPBreakdown | null>(null);
  const [isMastered, setIsMastered] = useState(false);

  const handleCalculate = () => {
    const xpResult = calculateXP(
      duration,
      environmentalContext || undefined,
      gamingContext || undefined,
      isMastered
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

        {/* Mastery Toggle - Task 4.5.5 (For Testing) */}
        <div className="p-4 bg-muted/50 rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">Track Mastery Bonus</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Simulate a mastered track (+50 bonus XP)
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isMastered}
                onChange={(e) => setIsMastered(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium">Mastered</span>
            </label>
          </div>
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
          <div className="space-y-4">
            {/* Total XP Display */}
            <div className="p-4 bg-card border border-border rounded-md">
              <p className="text-sm text-muted-foreground">Total XP</p>
              <p className="text-3xl font-bold">{result.totalXP}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Total Multiplier: <span className="font-bold">{result.totalMultiplier.toFixed(2)}x</span>
                {result.totalMultiplier >= 3.0 && ' (capped)'}
              </p>
            </div>

            {/* Bonus Breakdown Table - Task 4.5.3 */}
            <div className="p-4 bg-muted/50 rounded-lg border border-border">
              <h3 className="font-semibold text-sm mb-3">XP Bonus Breakdown</h3>
              <div className="space-y-2 text-sm">
                {/* Base XP */}
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <div>
                    <span className="font-medium">Base XP</span>
                    <span className="text-muted-foreground ml-2">
                      ({duration}s × {(result.baseXP / duration).toFixed(2)}/s)
                    </span>
                  </div>
                  <span className="font-bold">{result.baseXP} XP</span>
                </div>

                {/* Environmental Bonus */}
                {result.environmentalBonusXP > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <div>
                      <span className="font-medium text-green-600">Environmental Bonus</span>
                      <span className="text-muted-foreground ml-2">
                        ({result.environmentalMultiplier.toFixed(2)}x)
                      </span>
                      {result.environmentalDetails && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {result.environmentalDetails.activity && (
                            <span>Activity: {result.environmentalDetails.activity}</span>
                          )}
                          {result.environmentalDetails.isNightTime && (
                            <span className="ml-2">🌙 Night Time</span>
                          )}
                          {result.environmentalDetails.weather && (
                            <span className="ml-2">Weather: {result.environmentalDetails.weather}</span>
                          )}
                          {result.environmentalDetails.altitude && (
                            <span className="ml-2">Altitude: {result.environmentalDetails.altitude}m</span>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="font-bold text-green-600">+{result.environmentalBonusXP} XP</span>
                  </div>
                )}

                {/* Gaming Bonus */}
                {result.gamingBonusXP > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <div>
                      <span className="font-medium text-blue-600">Gaming Bonus</span>
                      <span className="text-muted-foreground ml-2">
                        ({result.gamingMultiplier.toFixed(2)}x)
                      </span>
                      {result.gamingDetails && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {result.gamingDetails.gameName && (
                            <span>Game: {result.gamingDetails.gameName}</span>
                          )}
                          {result.gamingDetails.gameGenre && (
                            <span className="ml-2">({result.gamingDetails.gameGenre})</span>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="font-bold text-blue-600">+{result.gamingBonusXP} XP</span>
                  </div>
                )}

                {/* Mastery Bonus */}
                {result.masteryBonusXP > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <div>
                      <span className="font-medium text-purple-600">Mastery Bonus</span>
                      <span className="text-muted-foreground ml-2">
                        (Track mastered)
                      </span>
                    </div>
                    <span className="font-bold text-purple-600">+{result.masteryBonusXP} XP</span>
                  </div>
                )}

                {/* No bonuses message */}
                {result.environmentalBonusXP === 0 && result.gamingBonusXP === 0 && result.masteryBonusXP === 0 && (
                  <p className="text-xs text-muted-foreground py-2 italic">
                    No active bonuses. Enable environmental sensors or start gaming to earn bonus XP!
                  </p>
                )}
              </div>
            </div>

            {/* Multiplier Cap Info */}
            {result.totalMultiplier >= 3.0 && (
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-md">
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  ⚠️ Total multiplier capped at 3.0x (engine limit)
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default XPCalculatorTab;
