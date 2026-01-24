import { useEnvironmentalSensors } from '../../hooks/useEnvironmentalSensors';

export function EnvironmentalSensorsTab() {
  const { requestPermission, startMonitoring, isMonitoring, environmentalContext, permissions, sensors } = useEnvironmentalSensors();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Environmental Sensors</h2>

      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-card border border-border rounded-md">
            <p className="text-sm font-medium">Geolocation</p>
            <p className="text-xs text-muted-foreground">{permissions.geolocation}</p>
            <button
              onClick={() => requestPermission('geolocation')}
              className="mt-2 px-3 py-1 text-sm bg-primary text-primary-foreground rounded"
            >
              Request
            </button>
          </div>
          <div className="p-4 bg-card border border-border rounded-md">
            <p className="text-sm font-medium">Motion</p>
            <p className="text-xs text-muted-foreground">{permissions.motion}</p>
            <button
              onClick={() => requestPermission('motion')}
              className="mt-2 px-3 py-1 text-sm bg-primary text-primary-foreground rounded"
            >
              Request
            </button>
          </div>
          <div className="p-4 bg-card border border-border rounded-md">
            <p className="text-sm font-medium">Light</p>
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
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm font-mono">
                  <div>
                    <span className="text-muted-foreground">X:</span>{' '}
                    <strong>{environmentalContext.motion.accelerationIncludingGravity.x?.toFixed(3) ?? '—'}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Y:</span>{' '}
                    <strong>{environmentalContext.motion.accelerationIncludingGravity.y?.toFixed(3) ?? '—'}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Z:</span>{' '}
                    <strong>{environmentalContext.motion.accelerationIncludingGravity.z?.toFixed(3) ?? '—'}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Activity:</span>{' '}
                    <strong className="text-lg">
                      {(() => {
                        // This is safe now because we added getCurrentActivity()
                        if (!sensors || !environmentalContext.motion) return 'unknown';
                        return sensors.getCurrentActivity();
                      })()}
                    </strong>
                  </div>
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
