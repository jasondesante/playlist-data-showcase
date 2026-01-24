import { useEffect, useState } from 'react';
import { useEnvironmentalSensors } from '../../hooks/useEnvironmentalSensors';
import { StatusIndicator } from '../ui/StatusIndicator';
import { MotionGraph } from '../ui/MotionGraph';

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
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Environmental Sensors</h2>

      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-card border border-border rounded-md">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Geolocation</p>
              <StatusIndicator status={permissionToStatus(permissions.geolocation)} />
            </div>
            <p className="text-xs text-muted-foreground">{permissions.geolocation}</p>
            <button
              onClick={() => requestPermission('geolocation')}
              className="mt-2 px-3 py-1 text-sm bg-primary text-primary-foreground rounded"
            >
              Request
            </button>
          </div>
          <div className="p-4 bg-card border border-border rounded-md">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Motion</p>
              <StatusIndicator status={permissionToStatus(permissions.motion)} />
            </div>
            <p className="text-xs text-muted-foreground">{permissions.motion}</p>
            <button
              onClick={() => requestPermission('motion')}
              className="mt-2 px-3 py-1 text-sm bg-primary text-primary-foreground rounded"
            >
              Request
            </button>
          </div>
          <div className="p-4 bg-card border border-border rounded-md">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Light</p>
              <StatusIndicator status={permissionToStatus(permissions.light)} />
            </div>
            <p className="text-xs text-muted-foreground">{permissions.light}</p>
            <button
              onClick={() => requestPermission('light')}
              className="mt-2 px-3 py-1 text-sm bg-primary text-primary-foreground rounded"
            >
              Request
            </button>
          </div>
        </div>

        <button
          onClick={() => startMonitoring()}
          disabled={isMonitoring}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
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
          <div className="space-y-4">
            {/* GPS Location Display */}
            {(environmentalContext as any).location ? (
              <div className="p-5 bg-blue-900/20 border border-blue-700 rounded-lg">
                <h3 className="font-bold text-blue-300 flex items-center gap-2">
                  📍 GPS Location
                </h3>

                {/* Mini Map Placeholder with Coordinates */}
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div className="p-3 bg-black/30 rounded border border-blue-600">
                    <p className="text-xs text-blue-400">Latitude</p>
                    <p className="text-lg font-mono font-bold">
                      {(environmentalContext as any).location?.coords?.latitude?.toFixed(6) ?? 'N/A'}
                    </p>
                  </div>
                  <div className="p-3 bg-black/30 rounded border border-blue-600">
                    <p className="text-xs text-blue-400">Longitude</p>
                    <p className="text-lg font-mono font-bold">
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
                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  {(environmentalContext as any).location?.coords?.altitude != null && (
                    <div className="p-2 bg-black/20 rounded">
                      <span className="text-blue-400">Altitude:</span>{' '}
                      <span className="font-mono">{(environmentalContext as any).location.coords.altitude.toFixed(1)} m</span>
                    </div>
                  )}
                  {(environmentalContext as any).location?.coords?.speed != null && (
                    <div className="p-2 bg-black/20 rounded">
                      <span className="text-blue-400">Speed:</span>{' '}
                      <span className="font-mono">{((environmentalContext as any).location.coords.speed * 3.6).toFixed(1)} km/h</span>
                    </div>
                  )}
                  {(environmentalContext as any).location?.coords?.heading != null && (
                    <div className="p-2 bg-black/20 rounded">
                      <span className="text-blue-400">Heading:</span>{' '}
                      <span className="font-mono">{(environmentalContext as any).location.coords.heading.toFixed(0)}°</span>
                    </div>
                  )}
                  <div className="p-2 bg-black/20 rounded">
                    <span className="text-blue-400">Accuracy:</span>{' '}
                    <span className="font-mono">±{(environmentalContext as any).location?.coords?.accuracy ?? 0} m</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mt-2">
                  Updated: {new Date((environmentalContext as any).location?.timestamp ?? environmentalContext.timestamp).toLocaleTimeString()}
                </p>
              </div>
            ) : (
              <div className="p-5 bg-orange-900/30 border border-orange-700 rounded-lg text-orange-300">
                <h3 className="font-bold">No GPS Data Yet</h3>
                <ul className="mt-3 text-sm space-y-1">
                  <li>• Did you grant geolocation permission?</li>
                  <li>• GPS requires clear view of sky</li>
                  <li>• Indoor locations may have poor accuracy</li>
                </ul>
              </div>
            )}

            {/* Live Motion Data */}
            {environmentalContext.motion ? (
              <div className="p-5 bg-green-900/20 border border-green-700 rounded-lg">
                <h3 className="font-bold text-green-300 flex items-center gap-2">
                  Live Motion Active
                </h3>

                {/* Activity Type Display */}
                <div className="mt-3 text-sm">
                  <span className="text-muted-foreground">Activity:</span>{' '}
                  <strong className="text-lg">
                    {(() => {
                      // This is safe now because we added getCurrentActivity()
                      if (!sensors || !environmentalContext.motion) return 'unknown';
                      return sensors.getCurrentActivity();
                    })()}
                  </strong>
                </div>

                {/* Motion Graphs */}
                <div className="mt-4 space-y-3">
                  <MotionGraph data={xData} color="#22c55e" label="X Acceleration" />
                  <MotionGraph data={yData} color="#3b82f6" label="Y Acceleration" />
                  <MotionGraph data={zData} color="#f59e0b" label="Z Acceleration" />
                </div>

                <p className="text-xs text-muted-foreground mt-2">
                  Updated: {new Date(environmentalContext.timestamp).toLocaleTimeString()}
                </p>
              </div>
            ) : (
              <div className="p-5 bg-orange-900/30 border border-orange-700 rounded-lg text-orange-300">
                <h3 className="font-bold">No Motion Data Yet</h3>
                <ul className="mt-3 text-sm space-y-1">
                  <li>• Did you grant motion permission? (iOS: must tap "Request")</li>
                  <li>• Is your phone flat on a table? Try tilting it!</li>
                  <li>• Motion updates only when device moves</li>
                  <li>• Check: DeviceMotionEvent supported? {typeof window !== 'undefined' && 'DeviceMotionEvent' in window ? 'Yes' : 'No'}</li>
                </ul>
              </div>
            )}

            {/* Full Debug Dump */}
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium">Raw environmentalContext</summary>
              <pre className="mt-2 text-xs overflow-auto bg-black/50 p-3 rounded">
                {JSON.stringify(environmentalContext, null, 2)}
              </pre>
            </details>
          </div>
        ) : null}

      </div>
    </div>
  );
}

export default EnvironmentalSensorsTab;
