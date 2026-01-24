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
