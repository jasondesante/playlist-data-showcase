import { useEffect, useState } from 'react';
import { useEnvironmentalSensors } from '../../hooks/useEnvironmentalSensors';
import { StatusIndicator } from '../ui/StatusIndicator';
import { MotionGraph } from '../ui/MotionGraph';
import { RawJsonDump } from '../ui/RawJsonDump';

/**
 * EnvironmentalSensorsTab Component
 *
 * Demonstrates the EnvironmentalSensors engine module by:
 * 1. Requesting permissions for geolocation, motion, and light sensors
 * 2. Starting/stopping sensor monitoring
 * 3. Displaying GPS location with coordinates, altitude, speed, and heading
 * 4. Showing live motion data with real-time graphs (X, Y, Z acceleration)
 * 5. Displaying weather data from OpenWeather API (if API key is provided)
 * 6. Visualizing moon phase and day/night status
 * 7. Providing raw JSON dump for debugging
 *
 * Features:
 * - Permission status indicators for each sensor type
 * - Mini-map placeholder with coordinates
 * - Link to open location in Google Maps
 * - Real-time motion graphs showing acceleration over time
 * - Activity type detection (stationary, walking, running, in-vehicle)
 * - Weather icon mapping based on conditions
 * - iOS-specific handling for motion permission (requires user gesture)
 *
 * @example
 * ```tsx
 * // Users can test each sensor independently
 * <EnvironmentalSensorsTab />
 * ```
 */

// Helper function to map PermissionState to StatusType
function permissionToStatus(permission: PermissionState): 'healthy' | 'degraded' | 'error' {
  switch (permission) {
    case 'granted':
      return 'healthy';
    case 'prompt':
      return 'degraded';
    case 'denied':
      return 'error';
    default:
      return 'degraded';
  }
}

export function EnvironmentalSensorsTab() {
  const { requestPermission, startMonitoring, isMonitoring, environmentalContext, permissions, sensors } = useEnvironmentalSensors();

  // Store motion data history for graphs (max 100 points each)
  const [xData, setXData] = useState<number[]>([]);
  const [yData, setYData] = useState<number[]>([]);
  const [zData, setZData] = useState<number[]>([]);

  // Update motion data when environmental context changes
  useEffect(() => {
    if (environmentalContext?.motion?.accelerationIncludingGravity) {
      const acc = environmentalContext.motion.accelerationIncludingGravity;

      setXData(prev => {
        const next = [...prev, acc.x ?? 0];
        return next.slice(-100);
      });
      setYData(prev => {
        const next = [...prev, acc.y ?? 0];
        return next.slice(-100);
      });
      setZData(prev => {
        const next = [...prev, acc.z ?? 0];
        return next.slice(-100);
      });
    }
  }, [environmentalContext?.motion?.accelerationIncludingGravity]);

  return (
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-lg md:text-xl font-bold">Environmental Sensors</h2>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <div className="p-3 md:p-4 bg-card border border-border rounded-md">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Geolocation</p>
              <StatusIndicator status={permissionToStatus(permissions.geolocation)} />
            </div>
            <p className="text-xs text-muted-foreground">{permissions.geolocation}</p>
            <button
              onClick={() => requestPermission('geolocation')}
              className="mt-2 w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base bg-primary text-primary-foreground rounded min-h-[44px] hover:opacity-90 transition-opacity"
            >
              Request
            </button>
          </div>
          <div className="p-3 md:p-4 bg-card border border-border rounded-md">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Motion</p>
              <StatusIndicator status={permissionToStatus(permissions.motion)} />
            </div>
            <p className="text-xs text-muted-foreground">{permissions.motion}</p>
            <button
              onClick={() => requestPermission('motion')}
              className="mt-2 w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base bg-primary text-primary-foreground rounded min-h-[44px] hover:opacity-90 transition-opacity"
            >
              Request
            </button>
          </div>
          <div className="p-3 md:p-4 bg-card border border-border rounded-md">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Light</p>
              <StatusIndicator status={permissionToStatus(permissions.light)} />
            </div>
            <p className="text-xs text-muted-foreground">{permissions.light}</p>
            <button
              onClick={() => requestPermission('light')}
              className="mt-2 w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base bg-primary text-primary-foreground rounded min-h-[44px] hover:opacity-90 transition-opacity"
            >
              Request
            </button>
          </div>
        </div>

        <button
          onClick={() => startMonitoring()}
          disabled={isMonitoring}
          className="w-full sm:w-auto px-4 md:px-6 py-3 md:py-2 text-sm md:text-base bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 min-h-[44px]"
        >
          {isMonitoring ? 'Monitoring...' : 'Start Monitoring'}
        </button>

        {environmentalContext && (
          <div className="p-4 bg-card border border-border rounded-md">
            <p className="text-sm font-medium">Environmental Data</p>
            <pre className="text-xs mt-2 overflow-auto">{JSON.stringify(environmentalContext, null, 2)}</pre>
          </div>
        )}

        {environmentalContext ? (
          <div className="space-y-3 md:space-y-4">
            {/* GPS Location Display */}
            {(environmentalContext as any).location ? (
              <div className="p-3 md:p-5 bg-blue-900/20 border border-blue-700 rounded-lg">
                <h3 className="font-bold text-blue-300 flex items-center gap-2 text-base md:text-lg">
                  📍 GPS Location
                </h3>

                {/* Mini Map Placeholder with Coordinates */}
                <div className="mt-3 grid grid-cols-2 gap-2 md:gap-4">
                  <div className="p-2 md:p-3 bg-black/30 rounded border border-blue-600">
                    <p className="text-xs text-blue-400">Latitude</p>
                    <p className="text-base md:text-lg font-mono font-bold">
                      {(environmentalContext as any).location?.coords?.latitude?.toFixed(6) ?? 'N/A'}
                    </p>
                  </div>
                  <div className="p-2 md:p-3 bg-black/30 rounded border border-blue-600">
                    <p className="text-xs text-blue-400">Longitude</p>
                    <p className="text-base md:text-lg font-mono font-bold">
                      {(environmentalContext as any).location?.coords?.longitude?.toFixed(6) ?? 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Mini Map Placeholder */}
                <div className="mt-3 p-4 bg-gradient-to-br from-green-900/40 to-blue-900/40 rounded border border-blue-600/50 flex items-center justify-center min-h-[120px] relative overflow-hidden">
                  {/* Simple grid pattern to represent a map */}
                  <div className="absolute inset-0 opacity-20" style={{
                    backgroundImage: 'linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                  }}></div>

                  {/* Location pin icon */}
                  <div className="relative z-10 text-center">
                    <div className="text-4xl">📍</div>
                    <p className="text-xs text-blue-300 mt-1">
                      {(environmentalContext as any).location?.coords?.latitude?.toFixed(4) ?? '0.0000'}, {(environmentalContext as any).location?.coords?.longitude?.toFixed(4) ?? '0.0000'}
                    </p>
                  </div>

                  {/* Google Maps Link */}
                  <a
                    href={`https://www.google.com/maps?q=${(environmentalContext as any).location?.coords?.latitude ?? 0},${(environmentalContext as any).location?.coords?.longitude ?? 0}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-2 right-2 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded flex items-center gap-1 transition-colors"
                  >
                    <span>Open in Google Maps</span>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>

                {/* Additional GPS Data */}
                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-1 md:gap-2 text-xs">
                  {(environmentalContext as any).location?.coords?.altitude != null && (
                    <div className="p-1 md:p-2 bg-black/20 rounded">
                      <span className="text-blue-400 text-[10px] md:text-xs">Alt:</span>{' '}
                      <span className="font-mono text-[10px] md:text-xs">{(environmentalContext as any).location.coords.altitude.toFixed(1)} m</span>
                    </div>
                  )}
                  {(environmentalContext as any).location?.coords?.speed != null && (
                    <div className="p-1 md:p-2 bg-black/20 rounded">
                      <span className="text-blue-400 text-[10px] md:text-xs">Speed:</span>{' '}
                      <span className="font-mono text-[10px] md:text-xs">{((environmentalContext as any).location.coords.speed * 3.6).toFixed(1)} km/h</span>
                    </div>
                  )}
                  {(environmentalContext as any).location?.coords?.heading != null && (
                    <div className="p-1 md:p-2 bg-black/20 rounded">
                      <span className="text-blue-400 text-[10px] md:text-xs">Heading:</span>{' '}
                      <span className="font-mono text-[10px] md:text-xs">{(environmentalContext as any).location.coords.heading.toFixed(0)}°</span>
                    </div>
                  )}
                  <div className="p-1 md:p-2 bg-black/20 rounded">
                    <span className="text-blue-400 text-[10px] md:text-xs">Accuracy:</span>{' '}
                    <span className="font-mono text-[10px] md:text-xs">±{(environmentalContext as any).location?.coords?.accuracy ?? 0} m</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mt-2">
                  Updated: {new Date((environmentalContext as any).location?.timestamp ?? environmentalContext.timestamp).toLocaleTimeString()}
                </p>
              </div>
            ) : (
              <div className="p-3 md:p-5 bg-orange-900/30 border border-orange-700 rounded-lg text-orange-300">
                <h3 className="font-bold text-sm md:text-base">No GPS Data Yet</h3>
                <ul className="mt-2 md:mt-3 text-xs md:text-sm space-y-1">
                  <li>• Did you grant geolocation permission?</li>
                  <li>• GPS requires clear view of sky</li>
                  <li>• Indoor locations may have poor accuracy</li>
                </ul>
              </div>
            )}

            {/* Live Motion Data */}
            {environmentalContext.motion ? (
              <div className="p-3 md:p-5 bg-green-900/20 border border-green-700 rounded-lg">
                <h3 className="font-bold text-green-300 flex items-center gap-2 text-sm md:text-base">
                  Live Motion Active
                </h3>

                {/* Activity Type Display */}
                <div className="mt-2 md:mt-3 text-sm">
                  <span className="text-muted-foreground text-xs md:text-sm">Activity:</span>{' '}
                  <strong className="text-base md:text-lg">
                    {(() => {
                      // This is safe now because we added getCurrentActivity()
                      if (!sensors || !environmentalContext.motion) return 'unknown';
                      return sensors.getCurrentActivity();
                    })()}
                  </strong>
                </div>

                {/* Motion Graphs */}
                <div className="mt-3 md:mt-4 space-y-2 md:space-y-3">
                  <MotionGraph data={xData} color="#22c55e" label="X Acceleration" />
                  <MotionGraph data={yData} color="#3b82f6" label="Y Acceleration" />
                  <MotionGraph data={zData} color="#f59e0b" label="Z Acceleration" />
                </div>

                <p className="text-xs text-muted-foreground mt-2">
                  Updated: {new Date(environmentalContext.timestamp).toLocaleTimeString()}
                </p>
              </div>
            ) : (
              <div className="p-3 md:p-5 bg-orange-900/30 border border-orange-700 rounded-lg text-orange-300">
                <h3 className="font-bold text-sm md:text-base">No Motion Data Yet</h3>
                <ul className="mt-2 md:mt-3 text-xs md:text-sm space-y-1">
                  <li>• Did you grant motion permission? (iOS: must tap "Request")</li>
                  <li>• Is your phone flat on a table? Try tilting it!</li>
                  <li>• Motion updates only when device moves</li>
                  <li className="hidden md:list-item">• Check: DeviceMotionEvent supported? {typeof window !== 'undefined' && 'DeviceMotionEvent' in window ? 'Yes' : 'No'}</li>
                </ul>
              </div>
            )}

            {/* Weather Status Display */}
            {environmentalContext.weather ? (
              <div className="p-3 md:p-5 bg-sky-900/20 border border-sky-700 rounded-lg">
                <h3 className="font-bold text-sky-300 flex items-center gap-2 text-sm md:text-base">
                  {(() => {
                    const wt = (environmentalContext.weather as any).weatherType?.toLowerCase() || '';
                    if (wt.includes('clear') || wt.includes('sun')) return '☀️ Weather';
                    if (wt.includes('cloud')) return '☁️ Weather';
                    if (wt.includes('rain') || wt.includes('drizzle')) return '🌧️ Weather';
                    if (wt.includes('snow')) return '❄️ Weather';
                    if (wt.includes('thunder') || wt.includes('storm')) return '⛈️ Weather';
                    if (wt.includes('mist') || wt.includes('fog')) return '🌫️ Weather';
                    return '🌤️ Weather';
                  })()}
                </h3>

                {/* Weather Icon and Main Info */}
                <div className="mt-3 flex items-center gap-3 md:gap-4">
                  {/* Large Weather Icon */}
                  <div className="text-4xl md:text-5xl">
                    {(() => {
                      const wt = (environmentalContext.weather as any).weatherType?.toLowerCase() || '';
                      if (wt.includes('clear')) return '☀️';
                      if (wt.includes('cloud')) return '☁️';
                      if (wt.includes('rain')) return '🌧️';
                      if (wt.includes('drizzle')) return '🌦️';
                      if (wt.includes('snow')) return '❄️';
                      if (wt.includes('thunder') || wt.includes('storm')) return '⛈️';
                      if (wt.includes('mist') || wt.includes('fog')) return '🌫️';
                      return '🌤️';
                    })()}
                  </div>

                  {/* Temperature and Conditions */}
                  <div className="flex-1">
                    <p className="text-2xl md:text-3xl font-bold">
                      {((environmentalContext.weather as any).temperature).toFixed(1)}°C
                    </p>
                    <p className="text-xs md:text-sm text-muted-foreground capitalize">
                      {(environmentalContext.weather as any).weatherType || 'Unknown'}
                    </p>
                    <p className="text-xs text-sky-400 mt-1">
                      Feels like {((environmentalContext.weather as any).temperature - 2).toFixed(1)}°C
                    </p>
                  </div>

                  {/* Day/Night Indicator */}
                  <div className="text-center">
                    <div className="text-xl md:text-2xl">
                      {(environmentalContext.weather as any).isNight ? '🌙' : '☀️'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(environmentalContext.weather as any).isNight ? 'Night' : 'Day'}
                    </p>
                  </div>
                </div>

                {/* Weather Details Grid */}
                <div className="mt-3 md:mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                  {/* Humidity */}
                  <div className="p-2 md:p-3 bg-black/20 rounded">
                    <div className="flex items-center gap-1 md:gap-2">
                      <span className="text-base md:text-lg">💧</span>
                      <div>
                        <p className="text-[10px] md:text-xs text-sky-400">Humidity</p>
                        <p className="font-mono font-bold text-xs md:text-sm">
                          {((environmentalContext.weather as any).humidity).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Wind Speed */}
                  <div className="p-2 md:p-3 bg-black/20 rounded">
                    <div className="flex items-center gap-1 md:gap-2">
                      <span className="text-base md:text-lg">💨</span>
                      <div>
                        <p className="text-[10px] md:text-xs text-sky-400">Wind Speed</p>
                        <p className="font-mono font-bold text-xs md:text-sm">
                          {((environmentalContext.weather as any).windSpeed).toFixed(1)} m/s
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Wind Direction */}
                  <div className="p-2 md:p-3 bg-black/20 rounded">
                    <div className="flex items-center gap-1 md:gap-2">
                      <span className="text-base md:text-lg">🧭</span>
                      <div>
                        <p className="text-[10px] md:text-xs text-sky-400">Wind Dir</p>
                        <p className="font-mono font-bold text-xs md:text-sm">
                          {((environmentalContext.weather as any).windDirection).toFixed(0)}°
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Pressure */}
                  <div className="p-2 md:p-3 bg-black/20 rounded">
                    <div className="flex items-center gap-1 md:gap-2">
                      <span className="text-base md:text-lg">🔵</span>
                      <div>
                        <p className="text-[10px] md:text-xs text-sky-400">Pressure</p>
                        <p className="font-mono font-bold text-xs md:text-sm">
                          {((environmentalContext.weather as any).pressure).toFixed(0)} hPa
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Moon Phase */}
                <div className="mt-2 md:mt-3 p-2 md:p-3 bg-black/20 rounded">
                  <div className="flex items-center gap-1 md:gap-2">
                    <span className="text-base md:text-lg">
                      {(() => {
                        const phase = (environmentalContext.weather as any).moonPhase || 0;
                        if (phase < 0.125) return '🌑'; // New moon
                        if (phase < 0.25) return '🌒'; // Waxing crescent
                        if (phase < 0.375) return '🌓'; // First quarter
                        if (phase < 0.5) return '🌔'; // Waxing gibbous
                        if (phase < 0.625) return '🌕'; // Full moon
                        if (phase < 0.75) return '🌖'; // Waning gibbous
                        if (phase < 0.875) return '🌗'; // Last quarter
                        return '🌘'; // Waning crescent
                      })()}
                    </span>
                    <div className="flex-1">
                      <p className="text-[10px] md:text-xs text-sky-400">Moon Phase</p>
                      <p className="text-xs md:text-sm font-mono">
                        {(((environmentalContext.weather as any).moonPhase || 0) * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mt-2">
                  Updated: {new Date((environmentalContext.weather as any).timestamp || environmentalContext.timestamp).toLocaleTimeString()}
                </p>
              </div>
            ) : (
              <div className="p-3 md:p-5 bg-orange-900/30 border border-orange-700 rounded-lg text-orange-300">
                <h3 className="font-bold text-sm md:text-base">No Weather Data Yet</h3>
                <ul className="mt-2 md:mt-3 text-xs md:text-sm space-y-1">
                  <li>• Add OpenWeather API key in Settings tab</li>
                  <li>• Weather requires API key from openweathermap.org</li>
                  <li>• Data updates every 30 seconds during monitoring</li>
                </ul>
              </div>
            )}

            {/* Raw JSON Dump Section */}
            <RawJsonDump
              data={environmentalContext}
              title="Raw Environmental Sensor Data"
              timestamp={new Date(environmentalContext.timestamp)}
              status="healthy"
            />
          </div>
        ) : null}

      </div>
    </div>
  );
}

export default EnvironmentalSensorsTab;
