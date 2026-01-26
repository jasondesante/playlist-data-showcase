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
- ✅ Works on Android 6.0+ (API level 23+) with runtime permissions

**Android Version-Specific Dialogs:**
| Android Version | Dialog Style | Notes |
|-----------------|--------------|-------|
| Android 6.0-8.x | Full-screen dialog | Clear "Allow" / "Block" buttons |
| Android 9+ | Bottom sheet dialog | Matches Material Design 3 |
| Android 12+ | Location permission prompt | Includes "Approximate" vs "Precise" location option |
| Android 13+ | Enhanced location dialog | Shows "Allow all the time" / "Allow only while using app" |

**Testing Steps:**
1. Open app in Chrome on Android device
2. Navigate to "Environmental Sensors" tab
3. Tap "Request" under Geolocation
4. Grant permission when prompted
5. Verify coordinates appear
6. Check Chrome Settings > Site Settings > Location to verify permission

**Error Scenarios:**
| Error | Cause | Fallback |
|-------|-------|----------|
| `PERMISSION_DENIED` | User selected "Block" | Show error message, no simulated data |
| `POSITION_UNAVAILABLE` | GPS disabled or no signal | Show error message |
| `TIMEOUT` | Request took too long (>30s default) | Show error message |

**Android-Specific Issues:**
- ⚠️ **High accuracy mode** may consume more battery
- ⚠️ **Indoor locations** may have poor GPS signal
- ⚠️ **Work profile** devices may have additional permission restrictions
- ✅ **Mock locations** possible for testing (Developer Options > Allow mock locations)

---

### Motion Permission

**Android Behavior:**
- ✅ Usually **auto-granted** - no system prompt required
- ✅ `DeviceMotionEvent.requestPermission()` does NOT exist on Android
- Code path: `granted = true` (fallback for non-iOS platforms)
- ✅ No user gesture required for motion events

**Expected Behavior:**
- ✅ Motion events fire immediately after "Start Monitoring"
- ✅ X/Y/Z acceleration data available
- ✅ Activity detection works (stationary/walking/running)
- ✅ Higher sampling rate than iOS (typically 60Hz on Android vs 30-50Hz on iOS)
- ✅ No background restrictions (motion events continue when Chrome backgrounds)

**Android Version-Specific Behavior:**
| Android Version | Motion Support | Sampling Rate | Notes |
|-----------------|----------------|---------------|-------|
| Android 4.4+ | ✅ Full support | ~60Hz | Accelerometer + gyroscope fusion |
| Android 8.0+ | ✅ Enhanced | ~60Hz | Better low-latency reporting |
| Android 10+ | ✅ Full | ~60Hz | No special requirements |

**Testing Steps:**
1. Open app in Chrome on Android device
2. Navigate to "Environmental Sensors" tab
3. Tap "Request" under Motion
4. Status should change to "granted" without dialog
5. Tap "Start Monitoring"
6. Move device, verify live motion data appears

**Android-Specific Issues:**
- ✅ **No permission dialog** - always auto-granted
- ⚠️ **Device variance** - different devices report different acceleration scales
- ⚠️ **Landscape/portrait** - axis orientation changes with device rotation
- ⚠️ **Low-power mode** - may reduce sensor sampling rate on some devices
- ✅ **Background monitoring** - works even when Chrome is not visible

---

### Light Sensor (Android)

**Platform Support:**
- ⚠️ **AmbientLightSensor API support varies by device and Android version**
- Chrome for Android has **experimental support** (disabled by default)
- Must enable: `chrome://flags/#enable-generic-sensor-extra-classes`
- Many devices do NOT expose ambient light sensor to web apps

**Device Compatibility:**
| Device Type | Light Sensor | Notes |
|-------------|--------------|-------|
| Samsung Galaxy | ❌ Usually blocked | Hardware exists but not exposed to web |
| Google Pixel | ❌ Usually blocked | Requires flag enable + origin trial |
| OnePlus | ❌ Usually blocked | Generic Sensor API not enabled |
| Android Emulator | ❌ Not available | No hardware light sensor |
| Chrome Desktop | ✅ Supported (if hardware exists) | Some laptops have light sensors |

**Expected Behavior:**
- If supported: Lux value appears in environmental data (range 0-100,000+ lux)
- If NOT supported: No light data (similar to iOS)
- If flag disabled: `AmbientLightSensor` constructor throws error

**Testing Steps:**
1. Open Chrome on Android device
2. Navigate to `chrome://flags/#enable-generic-sensor-extra-classes`
3. Set to "Enabled" (option may not exist on all Chrome versions)
4. Relaunch Chrome
5. Open app in Chrome on Android device
6. Navigate to "Environmental Sensors" tab
7. Tap "Request" under Light
8. Tap "Start Monitoring"
9. Check if light data appears (device-dependent)

**Android-Specific Issues:**
- ❌ **Experimental feature** - requires Chrome flag to be enabled
- ❌ **Not widely available** - most production builds don't enable Generic Sensor API
- ❌ **Hardware dependent** - some devices lack light sensor hardware
- ⚠️ **Origin trial required** - Chrome may require origin trial token for Generic Sensor API
- ✅ **No permission needed** - if available, works without user prompt

---

## Android Chrome - Comprehensive Issues Documentation

### Android-Specific Permission Dialogs

**Geolocation Permission Dialog Variations:**
1. **Android 6-8:** Full-screen modal with "Allow" / "Deny" buttons
2. **Android 9-11:** Bottom sheet with "Allow" / "Block" buttons
3. **Android 12+:** Two-step dialog:
   - First: "Allow [site] to use your location?"
   - Second: "Allow [site] to access precise location?" (vs approximate)
4. **Android 13+:** Three-option dialog:
   - "Allow all the time"
   - "Allow only while using app"
   - "Don't allow"

**Motion Permission:**
- ❌ **No dialog shown** - auto-granted silently
- No user-facing permission prompt required
- Not visible in Chrome Settings > Site Settings

**Light Sensor Permission:**
- ❌ **No dialog shown** - if hardware exists and API enabled
- No user-facing permission control
- Not managed in Chrome Site Settings

### Android Device Fragmentation Issues

**Sensor Hardware Variance:**
| Issue | Impact | Workaround |
|-------|--------|------------|
| Accelerometer range | Different devices report different g-force ranges | Normalize data to 0-1 range |
| Sampling rate | 30Hz - 100Hz variance across devices | Use timestamp-based calculations |
| Sensor fusion | Some devices use gyroscope fusion, others don't | Provide fallback for missing data |
| Light sensor | Most devices block access to web apps | Assume unavailable, show message |

**Chrome Version Variance:**
| Chrome Version | Geolocation | Motion | Light Sensor |
|----------------|-------------|--------|--------------|
| Chrome 80-89 | ✅ Works | ✅ Works | ❌ Not enabled |
| Chrome 90-99 | ✅ Works | ✅ Works | ⚠️ Flag only |
| Chrome 100+ | ✅ Works | ✅ Works | ⚠️ Flag only |

**Android OS Level Variance:**
| Android Version | Geolocation | Motion | Light Sensor |
|-----------------|-------------|--------|--------------|
| Android 6.0-7.x | ✅ Runtime permissions | ✅ Works | ❌ Not enabled |
| Android 8.x-9.x | ✅ Enhanced dialogs | ✅ Works | ❌ Not enabled |
| Android 10-11 | ✅ Background location | ✅ Works | ❌ Not enabled |
| Android 12+ | ✅ Precise/fine option | ✅ Works | ❌ Not enabled |
| Android 13+ | ✅ All-time/while-using option | ✅ Works | ❌ Not enabled |

### Android Testing Recommendations

**Required Test Devices:**
1. **Samsung Galaxy** (most popular Android device)
   - Test geolocation permission flow
   - Verify motion sensor auto-grant
   - Confirm light sensor unavailable
2. **Google Pixel** (stock Android experience)
   - Test latest Android permission dialogs
   - Verify motion data accuracy
3. **Android Emulator** (for development testing)
   - Mock geolocation coordinates
   - Mock motion sensor data
   - No light sensor hardware

**Android Emulator Testing:**
```bash
# Extend emulator controls for sensor mocking
# 1. Start emulator
# 2. Open Extended Controls (...) > Virtual Sensors > "Additional sensors"
# 3. Set GPS coordinates manually
# 4. Enable "Accelerometer" and move the virtual phone
```

**Chrome Flag Testing:**
1. Navigate to `chrome://flags`
2. Search for "Generic Sensor"
3. Enable: `#enable-generic-sensor-extra-classes`
4. Relaunch Chrome
5. Test light sensor availability

### Android Background Behavior

**Chrome Background Restrictions:**
| Sensor | Foreground | Background | Notes |
|--------|-----------|-----------|-------|
| Geolocation | ✅ Active | ⚠️ May pause | Continues with significant location changes |
| Motion | ✅ Active | ⚠️ May throttle | Reduced frequency, may continue |
| Light | ❌ Not available | ❌ Not available | Generic Sensor API blocked |

**Android Battery Optimization:**
- ⚠️ **Doze mode** (Android 6+) - pauses sensors when device idle
- ⚠️ **App Standby** (Android 7+) - throttles background Chrome
- ✅ **Motion exception** - Android allows motion-triggered wakeups

**Android-Specific Error Messages:**
| Error | Message | Cause |
|-------|---------|-------|
| Geolocation timeout | "Location request timed out" | GPS disabled or weak signal |
| Motion not available | "DeviceMotionEvent not supported" | Very old Android (< 4.4) |
| Light sensor error | "AmbientLightSensor is not defined" | Generic Sensor API not enabled |

### Android Security Considerations

**HTTPS Requirement:**
- ✅ Geolocation API requires HTTPS on production
- ⚠️ Works on `localhost` for development
- ❌ Blocked on HTTP (except localhost)

**User Privacy Expectations:**
- Geolocation: Users expect clear permission dialog
- Motion: Users don't expect tracking (no permission needed)
- Light: Users generally unaware of sensor access

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

**Status:** Documented for task 4.7.1 (iOS) and task 4.7.2 (Android Chrome) - Physical device testing requires access to iOS and Android devices. Code analysis and comprehensive documentation completed for both platforms.

---

**Back to [Documentation Index](../../index.md)**
