/**
 * Format time in seconds to MM:SS format
 * @param seconds - Time in seconds
 * @returns Formatted time string (MM:SS) or "--:--" for invalid values
 */
export const formatTime = (seconds: number): string => {
  // Handle NaN, Infinity, or negative values
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '--:--';
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

/**
 * Format timestamp to locale string
 * @param timestamp - Unix timestamp in seconds
 * @returns Formatted date string
 */
export const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleString();
};

/**
 * Format number with commas for thousands
 * @param num - Number to format
 * @returns Formatted number string
 */
export const formatNumber = (num: number): string => {
  return num.toLocaleString();
};

/**
 * Format XP amount with suffix
 * @param xp - XP amount
 * @returns Formatted XP string
 */
export const formatXP = (xp: number): string => {
  return formatNumber(xp) + ' XP';
};

/**
 * Fake coordinates used for privacy mode (Epstein's Island)
 */
export const FAKE_COORDINATES = {
  latitude: 18.3002,
  longitude: -64.8252,
} as const;

/**
 * Get coordinates, masking with fake ones if privacy mode is enabled
 * @param lat - Real latitude
 * @param lng - Real longitude
 * @param hideRealLocation - Whether to hide real location
 * @returns Object with latitude and longitude (real or fake)
 */
export const getMaskedCoordinates = (
  lat: number | undefined | null,
  lng: number | undefined | null,
  hideRealLocation: boolean
): { latitude: number; longitude: number } | { latitude: null; longitude: null } => {
  if (lat == null || lng == null) {
    return { latitude: null, longitude: null };
  }
  if (hideRealLocation) {
    return FAKE_COORDINATES;
  }
  return { latitude: lat, longitude: lng };
};
