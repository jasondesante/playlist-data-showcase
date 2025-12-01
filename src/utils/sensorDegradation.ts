import { logger } from './logger';

/**
 * Sensor Degradation Utility
 * 
 * Implements Principle 5: Graceful Degradation.
 * Provides simulated data when real sensors are unavailable or denied.
 */

export const SIMULATED_LOCATIONS = [
    { lat: 51.5074, lon: -0.1278, name: 'London (Urban)' },
    { lat: 40.7128, lon: -74.0060, name: 'New York (Urban)' },
    { lat: 35.6762, lon: 139.6503, name: 'Tokyo (Urban)' },
    { lat: -33.8688, lon: 151.2093, name: 'Sydney (Coastal)' },
    { lat: 64.1466, lon: -21.9426, name: 'Reykjavik (Tundra)' },
    { lat: 25.2048, lon: 55.2708, name: 'Dubai (Desert)' },
];

export const getSimulatedGeolocation = () => {
    const location = SIMULATED_LOCATIONS[Math.floor(Math.random() * SIMULATED_LOCATIONS.length)];
    logger.info('EnvironmentalSensors', 'Using simulated geolocation', location);
    return {
        coords: {
            latitude: location.lat,
            longitude: location.lon,
            altitude: 100,
            accuracy: 10,
            altitudeAccuracy: 5,
            heading: Math.random() * 360,
            speed: Math.random() * 5,
        },
        timestamp: Date.now(),
    };
};

export const getSimulatedMotion = () => {
    return {
        acceleration: {
            x: (Math.random() - 0.5) * 2,
            y: (Math.random() - 0.5) * 2,
            z: 9.8 + (Math.random() - 0.5) * 2,
        },
        rotationRate: {
            alpha: Math.random() * 10,
            beta: Math.random() * 10,
            gamma: Math.random() * 10,
        },
        interval: 16,
    };
};

export const getSimulatedLight = () => {
    // Simulate varying light conditions
    const lux = Math.random() > 0.5 ? 500 + Math.random() * 500 : 50 + Math.random() * 100;
    return {
        illuminance: lux,
    };
};

export const getSimulatedWeather = () => {
    const conditions = ['Clear', 'Clouds', 'Rain', 'Snow', 'Thunderstorm', 'Drizzle', 'Mist'];
    const condition = conditions[Math.floor(Math.random() * conditions.length)];

    return {
        weather: [{ main: condition, description: `Simulated ${condition}`, icon: '01d' }],
        main: {
            temp: 15 + (Math.random() * 15),
            feels_like: 14 + (Math.random() * 15),
            humidity: 40 + Math.random() * 40,
            pressure: 1013,
        },
        wind: {
            speed: Math.random() * 10,
            deg: Math.random() * 360,
        },
        visibility: 10000,
        sys: {
            sunrise: Date.now() - 20000,
            sunset: Date.now() + 20000,
        },
        name: 'Simulated City',
    };
};
