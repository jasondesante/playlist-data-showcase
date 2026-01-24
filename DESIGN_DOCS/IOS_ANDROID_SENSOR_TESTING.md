# iOS and Android Sensor Testing Documentation

**Document Purpose:** Document expected behavior, known limitations, and testing procedures for environmental sensors on iOS Safari and Android Chrome.

**Last Updated:** 2026-01-24

---

## Overview

This document provides comprehensive information about sensor permissions and behavior on mobile platforms, specifically iOS Safari and Android Chrome. The Environmental Sensors tab uses three sensor types:

1. **Geolocation** - GPS coordinates, altitude, speed
2. **Motion** - Device acceleration (accelerometer)
3. **Light** - Ambient light level (lux)

---

## iOS Safari (iPhone/iPad)

### Geolocation Permission

**Permission Flow:**
1. User taps "Request" button for Geolocation
2. iOS shows system dialog: *"Allow [App Name] to access your location?"*
3. User options:
   - **Allow Once** - Permission granted for current session only
   - **Allow While Using App** - Permission granted until revoked
   - **Don't Allow** - Permission denied

**Expected Behavior:**
- ✅ Permission prompt appears immediately after tap
- ✅ If granted, `navigator.geolocation.getCurrentPosition()` succeeds
- ✅ Coordinates displayed: latitude, longitude, altitude (if available)
- ✅ Permission state stored in `sensorStore` as `'granted'`

**Known Limitations:**
- iOS requires HTTPS for geolocation API
- Simulators (Xcode) may not return accurate coordinates
- Users must have Location Services enabled in iOS Settings
- Precision may vary based on device and location

**Error Scenarios:**
| Error | Cause | Fallback |
|-------|-------|----------|
| `PERMISSION_DENIED` | User selected "Don't Allow" | Show error message, no simulated data |
| `POSITION_UNAVAILABLE` | Location services disabled | Show error message |
| `TIMEOUT` | Request took too long | Show error message |

**Testing Steps:**
1. Open app in Safari on iPhone/iPad
2. Navigate to "Environmental Sensors" tab
3. Tap "Request" under Geolocation
4. Verify system dialog appears
5. Select "Allow While Using App"
6. Verify coordinates appear in "Environmental Data" section
7. Verify StatusIndicator shows 🟢 (healthy/green)

---

### Motion Permission (iOS 13+)

**Permission Flow:**
1. User taps "Request" button for Motion
2. iOS shows system dialog: *"Allow [App Name] to access motion and orientation data?"*
3. User options:
   - **OK** - Permission granted
   - **Don't Allow** - Permission denied

**Critical iOS Requirement:**
- ⚠️ **MUST be triggered by direct user interaction** (button click/tap)
- ⚠️ **CANNOT be triggered automatically** on page load or via timer
- This is an iOS security restriction

**Code Implementation:**
```typescript
// From useEnvironmentalSensors.ts lines 34-42
if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
    const response = await (DeviceMotionEvent as any).requestPermission();
    granted = response === 'granted';
} else {
    // Android or desktop: usually auto-granted
    granted = true;
}
```

**Expected Behavior:**
- ✅ Permission prompt appears ONLY after tapping "Request" button
- ✅ If granted, motion events fire when device moves
- ✅ Live motion data shows X, Y, Z acceleration values
- ✅ Activity type detected (stationary, walking, running)
- ✅ StatusIndicator shows 🟢 (healthy/green)

**Known Limitations:**
- iOS 12 and earlier do NOT support `DeviceMotionEvent.requestPermission()`
- Motion events pause when Safari goes to background
- Data updates ONLY when device physically moves
- Flat/stationary device shows minimal values (near 0)

**Testing Steps:**
1. Open app in Safari on iPhone/iPad (iOS 13+)
2. Navigate to "Environmental Sensors" tab
3. Tap "Request" under Motion
4. Verify system dialog appears (may not appear if already granted)
5. Select "OK"
6. Tap "Start Monitoring"
7. Physically tilt/shake device
8. Verify "Live Motion Active" card appears with X/Y/Z values
9. Verify StatusIndicator shows 🟢 (healthy/green)
10. Put device flat on table, verify values decrease

**Debugging Tips:**
```javascript
// Check if DeviceMotionEvent is supported
console.log('DeviceMotionEvent supported:', 'DeviceMotionEvent' in window);
console.log('requestPermission available:', typeof (DeviceMotionEvent as any).requestPermission);
```

---

### Light Sensor

**iOS Limitation:**
- ❌ **AmbientLightSensor API NOT supported on iOS Safari**
- No browser on iOS provides access to ambient light sensor
- This is a platform limitation, not a bug

**Current Implementation:**
```typescript
// From useEnvironmentalSensors.ts lines 49-52
else if (sensorType === 'light') {
    // Light sensor usually doesn't need explicit request
    granted = true;
}
```

**Expected Behavior on iOS:**
- ⚠️ Request button shows "granted" status (for UI consistency)
- ⚠️ NO actual light data will be available
- ⚠️ `environmentalContext.light` will be `null` or `undefined`
- StatusIndicator shows 🟢 (misleading - shows granted but no data)

**Recommended UI Improvement:**
- Show platform-specific message: *"Light sensor not available on iOS"*
- Hide Request button for light on iOS
- Display 🟡 status indicator (degraded) with explanation

**Testing Steps:**
1. Open app in Safari on iPhone/iPad
2. Navigate to "Environmental Sensors" tab
3. Tap "Request" under Light
4. Verify status changes to "granted"
5. Tap "Start Monitoring"
6. Verify NO light data appears (expected behavior on iOS)
7. Check console for any sensor-related errors

---

## Background Sensor Behavior (iOS)

**iOS Background Restrictions:**

When Safari goes to background (user switches apps or locks screen):

| Sensor | Background Behavior |
|--------|---------------------|
| Geolocation | Pauses, may continue with significant location changes |
| Motion | ⚠️ **Events STOP firing** until app returns to foreground |
| Light | N/A (not supported) |

**Workaround:** No programmatic workaround - this is iOS battery optimization behavior.

**User Education:** Show message: *"Motion data pauses when Safari is in background"*

---

## Android Chrome

### Geolocation Permission

**Permission Flow:**
1. User taps "Request" button for Geolocation
2. Android shows system dialog: *"Allow [site] to access your location?"*
3. User options:
   - **Allow** - Permission granted
   - **Block** - Permission denied

**Expected Behavior:**
- ✅ Similar to iOS, but dialog appearance varies by Android version
- ✅ Chrome may show permission in omnibox (address bar) icon instead
- ✅ If granted, coordinates displayed immediately
- ✅ Permission persists across sessions (until revoked in Chrome settings)

**Testing Steps:**
1. Open app in Chrome on Android device
2. Navigate to "Environmental Sensors" tab
3. Tap "Request" under Geolocation
4. Grant permission when prompted
5. Verify coordinates appear
6. Check Chrome Settings > Site Settings > Location to verify permission

---

### Motion Permission

**Android Behavior:**
- ✅ Usually **auto-granted** - no system prompt required
- ✅ `DeviceMotionEvent.requestPermission()` does NOT exist on Android
- Code path: `granted = true` (fallback for non-iOS platforms)

**Expected Behavior:**
- ✅ Motion events fire immediately after "Start Monitoring"
- ✅ X/Y/Z acceleration data available
- ✅ Activity detection works (stationary/walking/running)

**Testing Steps:**
1. Open app in Chrome on Android device
2. Navigate to "Environmental Sensors" tab
3. Tap "Request" under Motion
4. Status should change to "granted" without dialog
5. Tap "Start Monitoring"
6. Move device, verify live motion data appears

---

### Light Sensor (Android)

**Platform Support:**
- ⚠️ **AmbientLightSensor API support varies by device and Android version**
- Chrome for Android has experimental support
- Many devices do NOT expose ambient light sensor to web apps

**Expected Behavior:**
- If supported: Lux value appears in environmental data
- If NOT supported: No light data (similar to iOS)

**Testing Steps:**
1. Open app in Chrome on Android device
2. Navigate to "Environmental Sensors" tab
3. Tap "Request" under Light
4. Tap "Start Monitoring"
5. Check if light data appears (device-dependent)

---

## Summary Table

| Feature | iOS Safari | Android Chrome | Notes |
|---------|-----------|----------------|-------|
| **Geolocation** | ✅ Full support | ✅ Full support | Requires HTTPS, user permission |
| **Motion Permission** | ⚠️ Requires user tap + prompt | ✅ Auto-granted | iOS 13+ security restriction |
| **Motion Events** | ✅ Works after permission | ✅ Works | Pauses on iOS background |
| **Light Sensor** | ❌ Not supported | ⚠️ Device-dependent | AmbientLightSensor API |
| **Background Updates** | ❌ Paused | ⚠️ May continue | iOS battery optimization |

---

## Platform Detection Code

For implementing platform-specific UI improvements:

```typescript
// Detect iOS
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
             (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// Detect Android
const isAndroid = /Android/.test(navigator.userAgent);

// Detect Safari (iOS)
const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome|CriOS|FxiOS/.test(navigator.userAgent);

// Detect Chrome
const isChrome = /Chrome|CriOS/.test(navigator.userAgent);

// Check DeviceMotionEvent permission support
const requiresMotionPermission = typeof (DeviceMotionEvent as any).requestPermission === 'function';

// Check AmbientLightSensor support
const lightSensorSupported = 'AmbientLightSensor' in window;
```

---

## Recommended UI Improvements

Based on platform limitations discovered:

1. **iOS Light Sensor - Hide or disable button:**
   ```typescript
   {!isIOS && (
     <button onClick={() => requestPermission('light')}>
       Request
     </button>
   )}
   {isIOS && (
     <p className="text-xs text-muted-foreground">
       Not available on iOS
     </p>
   )}
   ```

2. **Add platform-specific help text:**
   - iOS: "Motion permission requires direct tap (iOS security)"
   - Android: "Motion usually auto-granted on Android"

3. **Show degraded status for unsupported features:**
   - Light on iOS: 🟡 with "Platform limitation" tooltip

---

## Testing Checklist

Use this checklist when testing on physical devices:

### iOS Safari Testing
- [ ] Open app in Safari on iPhone/iPad
- [ ] Test geolocation permission flow
- [ ] Test motion permission flow (iOS 13+)
- [ ] Verify motion data updates when device moves
- [ ] Verify motion data stops when Safari backgrounds
- [ ] Verify light sensor shows "not available" state
- [ ] Test with different iOS versions (13, 14, 15, 16, 17)

### Android Chrome Testing
- [ ] Open app in Chrome on Android device
- [ ] Test geolocation permission flow
- [ ] Test motion permission (auto-grant expected)
- [ ] Verify motion data updates
- [ ] Test light sensor availability (device-dependent)
- [ ] Test with different Android versions and devices

---

## References

- [MDN: DeviceMotionEvent](https://developer.mozilla.org/en-US/docs/Web/API/DeviceMotionEvent)
- [MDN: Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
- [MDN: AmbientLightSensor](https://developer.mozilla.org/en-US/docs/Web/API/AmbientLightSensor)
- [WebKit: DeviceMotion Permission](https://webkit.org/blog/7742/enhanced-video-controls-in-the-browser/)
- [Safari 13 Release Notes](https://webkit.org/blog/9278/safari-13/)

---

**Status:** Documented for task 4.7.1 - Physical device testing requires access to iOS and Android devices. Code analysis completed.
