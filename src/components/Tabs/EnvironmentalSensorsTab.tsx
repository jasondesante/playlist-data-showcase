import { useEffect, useState, useRef } from 'react';
import { useEnvironmentalSensors } from '../../hooks/useEnvironmentalSensors';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Activity, Navigation, Sun, Cloud, CloudDrizzle, CloudSnow, CloudLightning, Droplets, Wind } from 'lucide-react';
import './EnvironmentalSensorsTab.css';

/**
 * EnvironmentalSensorsTab Component
 *
 * Demonstrates the EnvironmentalSensors engine module with:
 * - Permission requests for geolocation, motion, and light sensors
 * - Sensor monitoring with real-time data visualization
 * - GPS location with coordinates, altitude, speed, and heading
 * - Live motion data with real-time graphs
 * - Weather data from OpenWeather API
 * - Moon phase and day/night status visualization
 *
 * Features:
 * - Card-based layout with status indicators
 * - Permission request with friendly UI
 * - Real-time data visualization with smooth charts
 * - GPS mini-map with Google Maps link
 * - Weather with icon mapping and details
 */

// Helper function to get biome emoji and display name
function getBiomeInfo(biome: string | undefined): { emoji: string; name: string } {
  if (!biome) return { emoji: '🌍', name: 'Unknown' };

  const biomeMap: Record<string, { emoji: string; name: string }> = {
    urban: { emoji: '🏙️', name: 'Urban' },
    forest: { emoji: '🌲', name: 'Forest' },
    desert: { emoji: '🏜️', name: 'Desert' },
    mountain: { emoji: '⛰️', name: 'Mountain' },
    valley: { emoji: '🏞️', name: 'Valley' },
    water: { emoji: '🌊', name: 'Water' },
    coastal: { emoji: '🌊', name: 'Coastal' },
    tundra: { emoji: '❄️', name: 'Tundra' },
    plains: { emoji: '🌾', name: 'Plains' },
    jungle: { emoji: '🌴', name: 'Jungle' },
    swamp: { emoji: '🐊', name: 'Swamp' },
    taiga: { emoji: '🌲❄️', name: 'Taiga' },
    savanna: { emoji: '🦁', name: 'Savanna' },
  };

  return biomeMap[biome.toLowerCase()] || { emoji: '🌍', name: biome };
}

// Helper function to map PermissionState to status type
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

// Status indicator component
function StatusIndicator({ status }: { status: 'healthy' | 'degraded' | 'error' }) {
  const statusConfig = {
    healthy: { color: 'hsl(var(--cute-teal))', label: 'Granted' },
    degraded: { color: 'hsl(var(--cute-yellow))', label: 'Prompt' },
    error: { color: 'hsl(var(--destructive))', label: 'Denied' },
  };

  const config = statusConfig[status];

  return (
    <div className="sensor-status-indicator">
      <div
        className="sensor-status-dot"
        style={{ backgroundColor: config.color }}
      />
      <span className="sensor-status-label">{config.label}</span>
    </div>
  );
}

// Motion graph component
function MotionGraph({ data, color, label }: { data: number[]; color: string; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = 8;

    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = 'hsl(var(--surface-3))';
    ctx.fillRect(0, 0, width, height);

    if (data.length < 2) return;

    // Find min/max for scaling
    const minVal = Math.min(...data);
    const maxVal = Math.max(...data);
    const range = maxVal - minVal || 1;

    // Draw line
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    data.forEach((value, index) => {
      const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
      const normalizedY = (value - minVal) / range;
      const y = height - padding - normalizedY * (height - 2 * padding);

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw label
    ctx.fillStyle = 'hsl(var(--foreground))';
    ctx.font = '10px sans-serif';
    ctx.fillText(label, padding, padding + 10);
  }, [data, color, label]);

  return (
    <canvas
      ref={canvasRef}
      className="sensor-motion-graph"
      height={60}
    />
  );
}

export function EnvironmentalSensorsTab() {
  const { requestPermission, startMonitoring, isMonitoring, environmentalContext, permissions, sensors, xpModifier, biome } = useEnvironmentalSensors();

  const [xData, setXData] = useState<number[]>([]);
  const [yData, setYData] = useState<number[]>([]);
  const [zData, setZData] = useState<number[]>([]);

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
    <div className="sensor-tab-container">
      {/* Header */}
      <div className="sensor-tab-header">
        <div className="sensor-tab-icon-badge">
          <Activity className="sensor-tab-icon" size={20} />
        </div>
        <div className="sensor-tab-header-content">
          <h2>Environmental Sensors</h2>
          <div className="sensor-tab-subtitle">Monitor GPS, motion, and environmental data</div>
        </div>
      </div>

      <div className="sensor-tab-content">
        {/* Permission cards grid */}
        <div className="sensor-permissions-grid">
          {/* Geolocation card */}
          <Card variant="elevated" padding="md" className="sensor-permission-card">
            <div className="sensor-permission-header">
              <span className="sensor-permission-title">Geolocation</span>
              <StatusIndicator status={permissionToStatus(permissions.geolocation)} />
            </div>
            <span className="sensor-permission-state">{permissions.geolocation}</span>
            <Button
              variant="primary"
              size="sm"
              onClick={() => requestPermission('geolocation')}
              leftIcon={Navigation}
              className="sensor-permission-button"
            >
              Request
            </Button>
          </Card>

          {/* Motion card */}
          <Card variant="elevated" padding="md" className="sensor-permission-card">
            <div className="sensor-permission-header">
              <span className="sensor-permission-title">Motion</span>
              <StatusIndicator status={permissionToStatus(permissions.motion)} />
            </div>
            <span className="sensor-permission-state">{permissions.motion}</span>
            <Button
              variant="primary"
              size="sm"
              onClick={() => requestPermission('motion')}
              leftIcon={Activity}
              className="sensor-permission-button"
            >
              Request
            </Button>
          </Card>

          {/* Light card */}
          <Card variant="elevated" padding="md" className="sensor-permission-card">
            <div className="sensor-permission-header">
              <span className="sensor-permission-title">Light</span>
              <StatusIndicator status={permissionToStatus(permissions.light)} />
            </div>
            <span className="sensor-permission-state">{permissions.light}</span>
            <Button
              variant="primary"
              size="sm"
              onClick={() => requestPermission('light')}
              leftIcon={Sun}
              className="sensor-permission-button"
            >
              Request
            </Button>
          </Card>
        </div>

        {/* Start monitoring button */}
        <Button
          variant="primary"
          size="lg"
          onClick={() => startMonitoring()}
          disabled={isMonitoring}
          isLoading={isMonitoring}
          leftIcon={Activity}
          className="sensor-monitor-button"
        >
          {isMonitoring ? 'Monitoring...' : 'Start Monitoring'}
        </Button>

        {/* Environmental data display */}
        {environmentalContext ? (
          <div className="sensor-data-section">
            {/* GPS Location */}
            {(environmentalContext as any).location ? (
              <Card variant="elevated" padding="lg" className="sensor-gps-card">
                <div className="sensor-card-title">
                  <Navigation size={18} />
                  <span>GPS Location</span>
                </div>

                {/* Coordinates */}
                <div className="sensor-coordinates-grid">
                  <div className="sensor-coordinate-item">
                    <span className="sensor-coordinate-label">Latitude</span>
                    <span className="sensor-coordinate-value">
                      {(environmentalContext as any).location?.coords?.latitude?.toFixed(6) ?? 'N/A'}
                    </span>
                  </div>
                  <div className="sensor-coordinate-item">
                    <span className="sensor-coordinate-label">Longitude</span>
                    <span className="sensor-coordinate-value">
                      {(environmentalContext as any).location?.coords?.longitude?.toFixed(6) ?? 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Biome badge */}
                {biome && (
                  <div className="sensor-biome-badge">
                    <span className="sensor-biome-emoji">{getBiomeInfo(biome).emoji}</span>
                    <span className="sensor-biome-name">{getBiomeInfo(biome).name}</span>
                  </div>
                )}

                {/* Mini map placeholder */}
                <div className="sensor-minimap">
                  <div className="sensor-minimap-grid" />
                  <div className="sensor-minimap-pin">
                    <Navigation size={32} />
                    <span className="sensor-minimap-coords">
                      {(environmentalContext as any).location?.coords?.latitude?.toFixed(4) ?? '0.0000'}, {(environmentalContext as any).location?.coords?.longitude?.toFixed(4) ?? '0.0000'}
                    </span>
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${(environmentalContext as any).location?.coords?.latitude ?? 0},${(environmentalContext as any).location?.coords?.longitude ?? 0}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sensor-maps-link"
                  >
                    Open in Google Maps
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M7 17L17 7M17 7H7M17 7V17" />
                    </svg>
                  </a>
                </div>

                {/* GPS details */}
                <div className="sensor-gps-details">
                  {(environmentalContext as any).location?.coords?.altitude != null && (
                    <div className="sensor-gps-detail">
                      <span className="sensor-gps-detail-label">Alt</span>
                      <span className="sensor-gps-detail-value">{(environmentalContext as any).location.coords.altitude.toFixed(1)} m</span>
                    </div>
                  )}
                  {(environmentalContext as any).location?.coords?.speed != null && (
                    <div className="sensor-gps-detail">
                      <span className="sensor-gps-detail-label">Speed</span>
                      <span className="sensor-gps-detail-value">{((environmentalContext as any).location.coords.speed * 3.6).toFixed(1)} km/h</span>
                    </div>
                  )}
                  {(environmentalContext as any).location?.coords?.heading != null && (
                    <div className="sensor-gps-detail">
                      <span className="sensor-gps-detail-label">Heading</span>
                      <span className="sensor-gps-detail-value">{(environmentalContext as any).location.coords.heading.toFixed(0)}°</span>
                    </div>
                  )}
                  <div className="sensor-gps-detail">
                    <span className="sensor-gps-detail-label">Accuracy</span>
                    <span className="sensor-gps-detail-value">±{(environmentalContext as any).location?.coords?.accuracy ?? 0} m</span>
                  </div>
                </div>

                <span className="sensor-updated-time">
                  Updated: {new Date((environmentalContext as any).location?.timestamp ?? environmentalContext.timestamp).toLocaleTimeString()}
                </span>
              </Card>
            ) : (
              <Card variant="outlined" padding="lg" className={`sensor-empty-card ${permissions.geolocation === 'denied' ? 'sensor-error-card' : 'sensor-warning-card'}`}>
                <div className="sensor-empty-icon">
                  {permissions.geolocation === 'denied' ? '🚫' : '📍'}
                </div>
                <h3 className="sensor-empty-title">
                  {permissions.geolocation === 'denied' ? 'Geolocation Permission Denied' : 'No GPS Data Yet'}
                </h3>
                <ul className="sensor-empty-list">
                  {permissions.geolocation === 'denied' ? (
                    <>
                      <li>Location access was denied in browser settings</li>
                      <li>To enable: Click the lock/info icon in your address bar</li>
                      <li>Find Location permission and set to Allow</li>
                      <li>Then refresh the page and try again</li>
                    </>
                  ) : (
                    <>
                      <li>Did you grant geolocation permission?</li>
                      <li>GPS requires clear view of sky</li>
                      <li>Indoor locations may have poor accuracy</li>
                    </>
                  )}
                </ul>
              </Card>
            )}

            {/* Live Motion Data */}
            {environmentalContext.motion ? (
              <Card variant="elevated" padding="lg" className="sensor-motion-card">
                <div className="sensor-card-title">
                  <Activity size={18} />
                  <span>Live Motion</span>
                </div>

                <div className="sensor-activity-display">
                  <span className="sensor-activity-label">Activity</span>
                  <strong className="sensor-activity-value">
                    {(() => {
                      if (!sensors || !environmentalContext.motion) return 'unknown';
                      return sensors.getCurrentActivity();
                    })()}
                  </strong>
                </div>

                <div className="sensor-motion-graphs">
                  <MotionGraph data={xData} color="#22c55e" label="X Acceleration" />
                  <MotionGraph data={yData} color="#3b82f6" label="Y Acceleration" />
                  <MotionGraph data={zData} color="#f59e0b" label="Z Acceleration" />
                </div>

                <span className="sensor-updated-time">
                  Updated: {new Date(environmentalContext.timestamp).toLocaleTimeString()}
                </span>
              </Card>
            ) : (
              <Card variant="outlined" padding="lg" className={`sensor-empty-card ${permissions.motion === 'denied' ? 'sensor-error-card' : 'sensor-warning-card'}`}>
                <div className="sensor-empty-icon">🏃</div>
                <h3 className="sensor-empty-title">
                  {permissions.motion === 'denied' ? 'Motion Permission Denied' : 'No Motion Data Yet'}
                </h3>
                <ul className="sensor-empty-list">
                  {permissions.motion === 'denied' ? (
                    <>
                      <li>Motion sensor access was denied in browser settings</li>
                      <li>To enable: Click the lock/info icon in your address bar</li>
                      <li>Find Motion or Device Motion permission and set to Allow</li>
                      <li>Then refresh the page and try again</li>
                    </>
                  ) : (
                    <>
                      <li>Did you grant motion permission? (iOS: must tap Request)</li>
                      <li>Is your phone flat on a table? Try tilting it!</li>
                      <li>Motion updates only when device moves</li>
                    </>
                  )}
                </ul>
              </Card>
            )}

            {/* XP Modifier */}
            <Card variant="elevated" padding="lg" className="sensor-xp-modifier-card">
              <div className="sensor-card-title">
                <span className="sensor-xp-icon">✨</span>
                <span>XP Modifier</span>
              </div>

              <div className="sensor-xp-display">
                <span
                  className="sensor-xp-value"
                  data-tier={(() => {
                    if (xpModifier >= 2.0) return 'epic';
                    if (xpModifier >= 1.5) return 'high';
                    if (xpModifier >= 1.25) return 'bonus';
                    return 'base';
                  })()}
                >
                  {xpModifier.toFixed(2)}x
                </span>
                <span className="sensor-xp-label">
                  {(() => {
                    if (xpModifier >= 2.0) return 'Epic Environmental Bonus!';
                    if (xpModifier >= 1.5) return 'High Environmental Bonus';
                    if (xpModifier >= 1.25) return 'Environmental Bonus Active';
                    return 'Base XP Rate';
                  })()}
                </span>
              </div>

              <div className="sensor-xp-tier-indicators">
                <div className="sensor-xp-tier" data-active={xpModifier >= 1.0}>
                  <span className="sensor-xp-tier-dot" />
                  <span className="sensor-xp-tier-label">Base</span>
                </div>
                <div className="sensor-xp-tier" data-active={xpModifier >= 1.25}>
                  <span className="sensor-xp-tier-dot" />
                  <span className="sensor-xp-tier-label">Bonus</span>
                </div>
                <div className="sensor-xp-tier" data-active={xpModifier >= 1.5}>
                  <span className="sensor-xp-tier-dot" />
                  <span className="sensor-xp-tier-label">High</span>
                </div>
                <div className="sensor-xp-tier" data-active={xpModifier >= 2.0}>
                  <span className="sensor-xp-tier-dot" />
                  <span className="sensor-xp-tier-label">Epic</span>
                </div>
              </div>
            </Card>

            {/* Weather Status */}
            {environmentalContext.weather ? (
              <Card variant="elevated" padding="lg" className="sensor-weather-card">
                <div className="sensor-card-title">
                  {(() => {
                    const wt = (environmentalContext.weather as any).weatherType?.toLowerCase() || '';
                    if (wt.includes('clear') || wt.includes('sun')) return <Sun size={18} />;
                    if (wt.includes('cloud')) return <Cloud size={18} />;
                    if (wt.includes('rain') || wt.includes('drizzle')) return <CloudDrizzle size={18} />;
                    if (wt.includes('snow')) return <CloudSnow size={18} />;
                    if (wt.includes('thunder') || wt.includes('storm')) return <CloudLightning size={18} />;
                    return <Sun size={18} />;
                  })()}
                  <span>Weather</span>
                </div>

                <div className="sensor-weather-main">
                  <div className="sensor-weather-icon">
                    {(() => {
                      const wt = (environmentalContext.weather as any).weatherType?.toLowerCase() || '';
                      if (wt.includes('clear') || wt.includes('sun')) return '☀️';
                      if (wt.includes('cloud')) return '☁️';
                      if (wt.includes('rain')) return '🌧️';
                      if (wt.includes('drizzle')) return '🌦️';
                      if (wt.includes('snow')) return '❄️';
                      if (wt.includes('thunder') || wt.includes('storm')) return '⛈️';
                      if (wt.includes('mist') || wt.includes('fog')) return '🌫️';
                      return '☀️';
                    })()}
                  </div>
                  <div className="sensor-weather-temp">
                    <span className="sensor-temperature-value">{((environmentalContext.weather as any).temperature).toFixed(1)}°C</span>
                    <span className="sensor-weather-condition">{(environmentalContext.weather as any).weatherType || 'Unknown'}</span>
                    <span className="sensor-weather-feels">Feels like {((environmentalContext.weather as any).temperature - 2).toFixed(1)}°C</span>
                  </div>
                  <div className="sensor-day-night">
                    <span className="sensor-day-night-icon">{(environmentalContext.weather as any).isNight ? '🌙' : '☀️'}</span>
                    <span className="sensor-day-night-label">{(environmentalContext.weather as any).isNight ? 'Night' : 'Day'}</span>
                  </div>
                </div>

                <div className="sensor-weather-details">
                  <div className="sensor-weather-detail">
                    <Droplets size={16} />
                    <div>
                      <span className="sensor-weather-detail-label">Humidity</span>
                      <span className="sensor-weather-detail-value">{((environmentalContext.weather as any).humidity).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="sensor-weather-detail">
                    <Wind size={16} />
                    <div>
                      <span className="sensor-weather-detail-label">Wind Speed</span>
                      <span className="sensor-weather-detail-value">{((environmentalContext.weather as any).windSpeed).toFixed(1)} m/s</span>
                    </div>
                  </div>
                  <div className="sensor-weather-detail">
                    <Navigation size={16} />
                    <div>
                      <span className="sensor-weather-detail-label">Wind Dir</span>
                      <span className="sensor-weather-detail-value">{((environmentalContext.weather as any).windDirection).toFixed(0)}°</span>
                    </div>
                  </div>
                  <div className="sensor-weather-detail">
                    <span className="sensor-weather-detail-icon">🔵</span>
                    <div>
                      <span className="sensor-weather-detail-label">Pressure</span>
                      <span className="sensor-weather-detail-value">{((environmentalContext.weather as any).pressure).toFixed(0)} hPa</span>
                    </div>
                  </div>
                </div>

                <div className="sensor-moon-phase">
                  <span className="sensor-moon-icon">
                    {(() => {
                      const phase = (environmentalContext.weather as any).moonPhase || 0;
                      if (phase < 0.125) return '🌑';
                      if (phase < 0.25) return '🌒';
                      if (phase < 0.375) return '🌓';
                      if (phase < 0.5) return '🌔';
                      if (phase < 0.625) return '🌕';
                      if (phase < 0.75) return '🌖';
                      if (phase < 0.875) return '🌗';
                      return '🌘';
                    })()}
                  </span>
                  <div className="sensor-moon-info">
                    <span className="sensor-weather-detail-label">Moon Phase</span>
                    <span className="sensor-moon-percent">{(((environmentalContext.weather as any).moonPhase || 0) * 100).toFixed(0)}%</span>
                  </div>
                </div>

                <span className="sensor-updated-time">
                  Updated: {new Date((environmentalContext.weather as any).timestamp || environmentalContext.timestamp).toLocaleTimeString()}
                </span>
              </Card>
            ) : (
              <Card variant="outlined" padding="lg" className="sensor-warning-card">
                <div className="sensor-empty-icon">🌡️</div>
                <h3 className="sensor-empty-title">No Weather Data Yet</h3>
                <ul className="sensor-empty-list">
                  <li>Add OpenWeather API key in Settings tab</li>
                  <li>Weather requires API key from openweathermap.org</li>
                  <li>Data updates every 30 seconds during monitoring</li>
                </ul>
              </Card>
            )}

            {/* Raw JSON dump */}
            <Card variant="flat" padding="md" className="sensor-raw-card">
              <div className="sensor-card-title">
                <span>Raw Sensor Data</span>
              </div>
              <pre className="sensor-raw-json">{JSON.stringify(environmentalContext, null, 2)}</pre>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default EnvironmentalSensorsTab;
