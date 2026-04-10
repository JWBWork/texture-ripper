# Trackpad Gesture Support Research for Web/Electron Applications

## Current State in texture-ripper
- Using Konva.js v10.0.12
- Already handles wheel events for zoom (with trackpad detection via `ctrlKey`)
- Middle-click panning implemented
- Needs enhancement for multi-touch trackpad gestures

## 1. Available APIs for Trackpad Gesture Detection

### A. Wheel Event (Current Implementation)
- **Browser Support**: Universal
- **Electron Support**: Full support
- **Trackpad Detection**: 
  - `event.ctrlKey` = true indicates pinch zoom on macOS/trackpad
  - `event.deltaY` indicates scroll/zoom magnitude
  - Works on all platforms
- **Limitations**: Only detects zoom, not multi-touch pan or rotation

### B. GestureEvent API (WebKit/Safari specific)
- **Browser Support**: Safari, Chrome on macOS
- **Electron Support**: Yes (Chromium-based)
- **Events**:
  - `gesturestart`: Beginning of gesture
  - `gesturechange`: Ongoing gesture
  - `gestureend`: End of gesture
- **Properties**:
  - `event.scale`: Scaling factor (pinch)
  - `event.rotation`: Rotation in degrees
  - `event.clientX/Y`: Event position
- **Platforms**: Primarily macOS (not on Windows/Linux)
- **Code Example**:
```javascript
element.addEventListener('gesturechange', (e) => {
  e.preventDefault();
  const scale = e.scale;
  const rotation = e.rotation;
  // Handle zoom and rotation
});
```

### C. PointerEvent API (W3C Standard)
- **Browser Support**: Modern browsers (IE 11+, Chrome, Firefox, Edge, Safari)
- **Electron Support**: Full support
- **Events**:
  - `pointerdown`: Pointer activated
  - `pointermove`: Pointer moved
  - `pointerup`: Pointer deactivated
  - `pointercancel`: Pointer canceled
  - `pointerleave`: Pointer left element
- **Properties**:
  - `event.pointerId`: Unique identifier
  - `event.pointerType`: "mouse", "touch", "pen"
  - `event.isPrimary`: Is primary pointer
  - `event.width/height`: Contact area
  - `event.pressure`: Input pressure
  - `event.tangentialPressure`: Tangential pressure
  - `event.tiltX/tiltY`: Pen tilt
  - `event.twist`: Pen rotation
- **Multi-touch Tracking**:
  - Can track multiple pointers simultaneously
  - Use `pointerId` to track individual touches
  - `event.getCoalescedEvents()`: High-frequency pointer updates

### D. Touch Events (Legacy)
- **Browser Support**: Universal on touch devices
- **Electron Support**: Limited (mainly for actual touch devices)
- **Events**: `touchstart`, `touchmove`, `touchend`, `touchcancel`
- **Limitations**: Deprecated on some browsers, complex multi-touch tracking
- **Not ideal for trackpad**: Trackpad doesn't trigger touch events reliably

## 2. Cross-Platform Considerations

### macOS
- **Best APIs**: GestureEvent (gesture swipe, pinch, rotation), PointerEvent
- **Trackpad Features**: Native support for:
  - Two-finger rotation
  - Two-finger zoom/pinch
  - Two-finger pan (if not intercepted by OS)
  - Three-finger swipe (usually intercepted by OS)
- **Detection**: Check for `event.pointerType === "touch"` in PointerEvent
- **Implementation**: GestureEvent is most reliable for gestures

### Windows
- **Trackpad APIs**: PointerEvent (primary)
- **Gesture Events**: Limited support for GestureEvent
- **Note**: Many Windows trackpads have gesture drivers that generate specific events
- **Fallback**: Use PointerEvent for multi-touch tracking
- **Precision Touchpad**: Windows 10+ supports high-precision trackpad input via PointerEvent

### Linux
- **Trackpad APIs**: PointerEvent (if supported by driver)
- **Limitation**: Many Linux trackpad drivers don't support multi-touch events
- **Alternative**: Fall back to wheel events
- **Note**: Wayland vs X11 have different input handling

## 3. Common Trackpad Gestures for Canvas Apps

### A. Two-Finger Pan (Horizontal/Vertical Scroll)
- **Implementation**:
```javascript
// Using PointerEvent - track two fingers moving in same direction
let fingers = {};
canvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'touch') {
    fingers[e.pointerId] = { x: e.clientX, y: e.clientY };
  }
});

canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch' && fingers[e.pointerId]) {
    if (Object.keys(fingers).length === 2) {
      // Two fingers - calculate average movement
      const touchIds = Object.keys(fingers);
      const avgDx = ((e.clientX - fingers[touchIds[0]].x) + 
                     (e.clientX - fingers[touchIds[1]].x)) / 2;
      const avgDy = ((e.clientY - fingers[touchIds[0]].y) + 
                     (e.clientY - fingers[touchIds[1]].y)) / 2;
      // Apply pan
      stage.x(stage.x() + avgDx);
      stage.y(stage.y() + avgDy);
    }
    fingers[e.pointerId] = { x: e.clientX, y: e.clientY };
  }
});
```

### B. Pinch-to-Zoom
- **Using GestureEvent** (simpler for macOS):
```javascript
let lastScale = 1;
canvas.addEventListener('gesturechange', (e) => {
  e.preventDefault();
  const scaleFactor = e.scale / lastScale;
  const pointer = { x: e.clientX, y: e.clientY };
  
  // Zoom with mouse point as center
  const oldScale = stage.scaleX();
  const newScale = oldScale * scaleFactor;
  
  stage.scaleX(newScale);
  stage.scaleY(newScale);
  stage.batchDraw();
  
  lastScale = e.scale;
});
```

- **Using PointerEvent** (cross-platform):
```javascript
// Track two fingers and calculate distance
const getDistance = (p1, p2) => {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
};

let fingers = {};
let lastDistance = 0;

canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch' && fingers[e.pointerId]) {
    fingers[e.pointerId] = { x: e.clientX, y: e.clientY };
    
    const touchIds = Object.keys(fingers);
    if (touchIds.length === 2) {
      const ids = touchIds.map(k => parseInt(k));
      const distance = getDistance(fingers[ids[0]], fingers[ids[1]]);
      
      if (lastDistance > 0) {
        const scale = distance / lastDistance;
        // Apply zoom scaling
      }
      lastDistance = distance;
    }
  }
});
```

### C. Two-Finger Rotation
- **Using GestureEvent** (macOS):
```javascript
canvas.addEventListener('gesturechange', (e) => {
  const rotation = e.rotation; // degrees
  const newRotation = currentRotation + rotation;
  stage.rotation(newRotation);
  stage.batchDraw();
});
```

### D. Continuous Smooth Scrolling
- **Already working via wheel event**
- **Trackpad detection**: Check if `deltaY` is small and `deltaMode` is 0 (DOM_DELTA_PIXEL)
```javascript
stage.on('wheel', (e) => {
  e.evt.preventDefault();
  
  // Trackpad scroll smoothing
  if (e.evt.deltaMode === 0) { // Pixel units
    // Trackpad - use smaller increments
    const amount = e.evt.deltaY * 0.1;
  } else {
    // Mouse wheel - use discrete steps
    const amount = e.evt.deltaY > 0 ? -100 : 100;
  }
});
```

## 4. How Modern Canvas Libraries Handle Trackpad Input

### Konva.js (Current Implementation)
- **Native Event Handling**: Wraps native browser events
- **Gesture Support**:
  - Wheel events (zoom)
  - Mouse events (pan, drag)
  - Touch events (limited)
- **Not Built-in**: No built-in multi-touch gesture support
- **Recommendation**: Implement gesture detection at event level, apply transforms to stage
- **Documentation**: Konva wraps events via `stage.on()` method

### Babylon.js
- **Canvas Engine Integration**: 
  - `ArcRotateCamera` has built-in trackpad zoom
  - Handles GestureEvent for touch/trackpad
  - Uses PointerEvent for multi-touch
- **Implementation Pattern**:
```javascript
// Babylon automatically handles gestures
const camera = new BABYLON.ArcRotateCamera(...);
scene.attachControl(canvas, true);
```

### Three.js
- **OrbitControls**:
  - Handles wheel events
  - Supports touchstart/touchmove for mobile
  - Limited trackpad gesture support
- **Requires Plugin**: TrackballControls for better gesture handling
```javascript
const controls = new THREE.TrackballControls(camera, renderer.domElement);
controls.rotateSpeed = 1.0;
controls.zoomSpeed = 1.2;
```

### Fabric.js
- **Canvas Library**:
  - Has wheel event handling
  - Limited gesture support
  - Primarily mouse-based
- **Multi-touch**: Requires manual PointerEvent handling

### PixiJS
- **Graphics Rendering**:
  - No built-in gesture handling
  - Relies on external event handling
  - Works well with custom gesture layer

## 5. Konva.js Specific Trackpad Support

### Current Capabilities
- Konva handles events via `stage.on(eventName, handler)`
- Event wrapping: `e.evt` contains native browser event
- Available native events bubble through Konva:
  - `mousedown`, `mouseup`, `mousemove`
  - `wheel`
  - `touchstart`, `touchmove`, `touchend`
  - `pointerdown`, `pointermove`, `pointerup` (v10+)

### Konva v10.0.12 Specific Features
- Added PointerEvent support in recent versions
- `event.getCoalescedEvents()` support for smooth tracking
- Better multi-touch tracking
- See: https://konva.dev/docs/events.html

### Not Built-in
- GestureEvent handling (can be added manually)
- Multi-touch gesture recognition
- Rotation transformation via gesture
- High-precision trackpad handling

## 6. Best Practices for Smooth Trackpad Gestures

### A. Requestless Animation (RAF)
```javascript
let isAnimating = false;
let targetScale = stage.scale().x;

function animateZoom() {
  if (Math.abs(targetScale - stage.scaleX()) > 0.001) {
    const current = stage.scaleX();
    const next = current + (targetScale - current) * 0.15; // Easing
    stage.scaleX(next);
    stage.scaleY(next);
    stage.batchDraw();
    requestAnimationFrame(animateZoom);
  }
}

canvas.addEventListener('wheel', (e) => {
  targetScale = calculateNewScale(e);
  if (!isAnimating) {
    isAnimating = true;
    animateZoom();
  }
});
```

### B. Event Coalescing for High-Frequency Updates
```javascript
// Use coalesced events for smooth trackpad input
canvas.addEventListener('pointermove', (e) => {
  const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
  
  for (const coalescedEvent of events) {
    // Process each event for smoother animation
    updatePointerPosition(coalescedEvent);
  }
});
```

### C. Velocity-Based Momentum
```javascript
class GestureTracker {
  constructor() {
    this.velocities = [];
    this.lastTime = 0;
  }

  trackVelocity(delta, timestamp) {
    const timeDelta = timestamp - this.lastTime;
    this.velocities.push(delta / timeDelta);
    
    // Keep last 10 velocities for averaging
    if (this.velocities.length > 10) {
      this.velocities.shift();
    }
    this.lastTime = timestamp;
  }

  getAverageVelocity() {
    if (this.velocities.length === 0) return 0;
    return this.velocities.reduce((a, b) => a + b, 0) / this.velocities.length;
  }
}
```

### D. Debouncing Gesture Start/End
```javascript
let gestureTimeout;
const startGesture = () => {
  clearTimeout(gestureTimeout);
  // Enable gesture-specific UI (e.g., hide tooltips)
};

const endGesture = () => {
  gestureTimeout = setTimeout(() => {
    // Re-enable normal UI
  }, 300);
};

canvas.addEventListener('gesturestart', startGesture);
canvas.addEventListener('gestureend', endGesture);
```

### E. Unified Event Handling Layer
```javascript
class TrackpadGestureHandler {
  constructor(stage) {
    this.stage = stage;
    this.pointers = {};
    this.setupHandlers();
  }

  setupHandlers() {
    this.stage.container().addEventListener('pointerdown', (e) => {
      this.onPointerDown(e);
    });
    
    this.stage.container().addEventListener('pointermove', (e) => {
      this.onPointerMove(e);
    });
    
    this.stage.container().addEventListener('pointerup', (e) => {
      this.onPointerUp(e);
    });

    // Fallback for platforms without PointerEvent
    if (!window.PointerEvent) {
      this.stage.container().addEventListener('touchstart', (e) => {
        this.handleTouchStart(e);
      });
      // ... etc
    }
  }

  onPointerDown(e) {
    if (e.pointerType === 'touch') {
      this.pointers[e.pointerId] = {
        x: e.clientX,
        y: e.clientY,
        startTime: Date.now()
      };
    }
  }

  onPointerMove(e) {
    if (!this.pointers[e.pointerId]) return;

    const prevPos = this.pointers[e.pointerId];
    const dx = e.clientX - prevPos.x;
    const dy = e.clientY - prevPos.y;

    if (Object.keys(this.pointers).length === 2) {
      // Multi-touch gesture
      this.handleMultiTouch(dx, dy);
    }

    prevPos.x = e.clientX;
    prevPos.y = e.clientY;
  }

  onPointerUp(e) {
    delete this.pointers[e.pointerId];
  }

  handleMultiTouch(dx, dy) {
    // Determine gesture type and apply transformation
  }
}
```

## 7. Browser/Electron Compatibility

### Detection Patterns
```javascript
// Check for GestureEvent support
const supportsGestureEvent = 'ongesturechange' in window;

// Check for PointerEvent support  
const supportsPointerEvent = 'PointerEvent' in window;

// Check for Touch support
const supportsTouchEvent = 'ontouchstart' in window;

// Electron specific
const isElectron = (typeof window !== 'undefined' && 
                    typeof window.process === 'object' && 
                    window.process.type === 'renderer');

// Create capability map
const gestures = {
  pinch: supportsGestureEvent || supportsPointerEvent,
  rotation: supportsGestureEvent,
  multiTouch: supportsPointerEvent || supportsTouchEvent,
  smoothZoom: supportsPointerEvent && navigator.maxTouchPoints > 0
};
```

### Platform Detection
```javascript
const platform = {
  isMac: /Mac|iPhone|iPad|iPod/.test(navigator.platform),
  isWindows: /Win/.test(navigator.platform),
  isLinux: /Linux|X11/.test(navigator.platform),
  hasTrackpad: navigator.maxTouchPoints > 0 && !('ontouchstart' in window),
  isElectron: isElectron
};

// Platform-specific initialization
if (platform.isMac) {
  initGestureEventHandlers(); // Use GestureEvent on macOS
}
if (platform.hasTrackpad) {
  initPointerEventHandlers(); // Use PointerEvent for precision trackpad
}
```

### Progressive Enhancement Strategy
```javascript
function initGestureSupport(stage) {
  // Tier 1: GestureEvent (best for macOS)
  if (window.ongesturechange !== undefined) {
    stage.container().addEventListener('gesturechange', handleGestureChange);
  }

  // Tier 2: PointerEvent (cross-platform)
  else if (window.PointerEvent) {
    stage.container().addEventListener('pointermove', handlePointerMove);
  }

  // Tier 3: TouchEvent (fallback)
  else if ('ontouchstart' in window) {
    stage.container().addEventListener('touchmove', handleTouchMove);
  }

  // Tier 4: Wheel only (minimum)
  stage.container().addEventListener('wheel', handleWheel);
}
```

## 8. Recommended Implementation for texture-ripper

### Current Status
- Wheel zoom: ✓ Implemented (with trackpad detection)
- Middle-click pan: ✓ Implemented
- Multi-touch pan: ✗ Not implemented
- Gesture rotation: ✗ Not implemented
- Smooth momentum: ✗ Not implemented

### Recommended Additions
1. **Add GestureEvent support** for macOS trackpad (rotation, zoom)
2. **Enhance PointerEvent** handling for cross-platform multi-touch
3. **Implement momentum scrolling** for inertia pan
4. **Add gesture-based UI feedback** (visual indication of zoom level)
5. **Optimize for Electron** with platform detection

### Implementation Priority
1. **High**: Two-finger pan via PointerEvent (works on all platforms)
2. **High**: Better zoom smoothing with momentum
3. **Medium**: GestureEvent rotation for macOS
4. **Medium**: Gesture start/end UI feedback
5. **Low**: Momentum-based inertia

