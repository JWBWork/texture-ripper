# Browser/Library Compatibility & External Resources

## 1. Browser/Platform Support Matrix

| Feature | Chrome | Firefox | Safari | Edge | Electron | Windows | macOS | Linux |
|---------|--------|---------|--------|------|----------|---------|-------|-------|
| Wheel Event | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| GestureEvent | ✓ (macOS) | ✗ | ✓ | ✓ (macOS) | ✓ (macOS) | ✗ | ✓ | ✗ |
| PointerEvent | ✓ | ✓ | ✓ (13+) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Touch Events | ✓ | ✓ | ✓ | ✓ | Limited | ✓ | Limited | Limited |
| Precision Touchpad | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (v10+) | ✓ | Partial |
| Coalesced Events | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

## 2. Canvas Library Feature Comparison

| Library | Wheel Zoom | Touch Pan | Pinch Zoom | Rotation | PointerEvent | Notes |
|---------|-----------|-----------|-----------|----------|-------------|-------|
| **Konva.js** | Native | Limited | No | No | v10+ | Event wrapping required |
| **Babylon.js** | ✓ | ✓ | ✓ | ✓ | ✓ | Built-in camera controls |
| **Three.js** | ✓ | Partial | No | ✓ | Via plugin | Requires TrackballControls |
| **Fabric.js** | ✓ | No | No | No | Manual | 2D canvas focused |
| **PixiJS** | Manual | Manual | Manual | Manual | Manual | No built-in gesture |
| **EaselJS** | Manual | Manual | Manual | Manual | No | Deprecated |

## 3. Konva.js Event System Deep Dive

### Available Stage Events
```javascript
// Input Events
stage.on('mousedown', handler);
stage.on('mouseup', handler);
stage.on('mousemove', handler);
stage.on('mouseover', handler);
stage.on('mouseout', handler);
stage.on('mouseenter', handler);
stage.on('mouseleave', handler);

// Touch Events (v10+)
stage.on('touchstart', handler);
stage.on('touchmove', handler);
stage.on('touchend', handler);

// Pointer Events (v10+)
stage.on('pointerdown', handler);
stage.on('pointermove', handler);
stage.on('pointerup', handler);
stage.on('pointercancel', handler);

// Wheel Event
stage.on('wheel', handler);

// Context Menu
stage.on('contextmenu', handler);
```

### Native Event Access
```javascript
stage.on('eventName', (e) => {
    const nativeEvent = e.evt;  // Access native browser event
    const stagePos = stage.getPointerPosition();  // Konva convenience
    const clientPos = { x: e.evt.clientX, y: e.evt.clientY };  // Native
});
```

### Event Properties
```javascript
stage.on('pointerdown', (e) => {
    // PointerEvent properties (when using pointer events)
    console.log(e.evt.pointerId);           // Unique ID
    console.log(e.evt.pointerType);         // 'mouse', 'touch', 'pen'
    console.log(e.evt.isPrimary);           // Is primary pointer
    console.log(e.evt.width, e.evt.height); // Contact area
    console.log(e.evt.pressure);            // Input pressure
    console.log(e.evt.clientX, e.evt.clientY); // Screen position
    
    // For Konva
    const stageCoords = stage.getPointerPosition();  // Stage coordinates
});
```

## 4. External Resources & Documentation

### Official Documentation
- **Konva.js Events**: https://konva.dev/docs/events.html
- **MDN PointerEvent**: https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent
- **MDN Wheel Event**: https://developer.mozilla.org/en-US/docs/Web/API/WheelEvent
- **MDN GestureEvent**: https://developer.mozilla.org/en-US/docs/Web/API/GestureEvent

### Electron Resources
- **Electron Input Handling**: https://www.electronjs.org/docs/api/web-contents
- **Chromium Input Events**: https://chromium.googlesource.com/chromium/src/+/HEAD/ui/events/event.h

### Browser Implementation Details
- **WebKit GestureEvent**: https://trac.webkit.org/wiki/GestureEvents
- **Chrome/V8 PointerEvent**: https://chromium.googlesource.com/chromium/src/+/HEAD/blink/public/web/web_pointer_event.h

### Gesture Recognition Libraries
- **Hammer.js** (deprecated): https://hammerjs.github.io/
- **Pointer Events Polyfill**: https://github.com/jquery/PEP
- **Gesture Detection**: https://github.com/wbkd/three-interaction

## 5. Code Examples from Real Projects

### Example 1: Figma-like Pan & Zoom
```javascript
class FigmaLikePanZoom {
    constructor(stage) {
        this.stage = stage;
        this.isSpaceDown = false;
        this.lastPos = null;
        this.init();
    }

    init() {
        // Space key for temporary pan
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                this.isSpaceDown = true;
                this.stage.container().style.cursor = 'grab';
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                this.isSpaceDown = false;
                this.stage.container().style.cursor = 'default';
            }
        });

        this.stage.container().addEventListener('mousedown', (e) => {
            if (this.isSpaceDown || e.button === 1) {
                this.lastPos = { x: e.clientX, y: e.clientY };
                this.stage.container().style.cursor = 'grabbing';
            }
        });

        this.stage.container().addEventListener('mousemove', (e) => {
            if (this.lastPos) {
                const dx = e.clientX - this.lastPos.x;
                const dy = e.clientY - this.lastPos.y;

                this.stage.x(this.stage.x() + dx);
                this.stage.y(this.stage.y() + dy);
                this.stage.batchDraw();

                this.lastPos = { x: e.clientX, y: e.clientY };
            }
        });

        this.stage.container().addEventListener('mouseup', () => {
            this.lastPos = null;
            this.stage.container().style.cursor = this.isSpaceDown ? 'grab' : 'default';
        });

        // Wheel zoom
        this.stage.on('wheel', (e) => {
            e.evt.preventDefault();

            const scaleBy = 1.1;
            const oldScale = this.stage.scaleX();
            const mousePointTo = {
                x: (e.evt.clientX - this.stage.x()) / oldScale,
                y: (e.evt.clientY - this.stage.y()) / oldScale,
            };

            let newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
            newScale = Math.max(0.1, Math.min(5, newScale));

            this.stage.scale({ x: newScale, y: newScale });
            this.stage.position({
                x: e.evt.clientX - mousePointTo.x * newScale,
                y: e.evt.clientY - mousePointTo.y * newScale,
            });
            this.stage.batchDraw();
        });
    }
}
```

### Example 2: Adobe-like Trackpad Gesture
```javascript
class AdobeLikeTrackpad {
    constructor(stage) {
        this.stage = stage;
        this.gestureState = null;
        this.init();
    }

    init() {
        // For macOS Safari
        this.stage.container().addEventListener('gesturestart', (e) => {
            this.gestureState = { scale: 1, rotation: 0 };
        });

        this.stage.container().addEventListener('gesturechange', (e) => {
            e.preventDefault();

            if (!this.gestureState) return;

            // Handle zoom
            const scaleDelta = e.scale / this.gestureState.scale;
            const oldScale = this.stage.scaleX();
            const newScale = Math.max(0.1, Math.min(5, oldScale * scaleDelta));

            this.stage.scaleX(newScale);
            this.stage.scaleY(newScale);

            // Handle rotation (optional)
            const rotationDelta = e.rotation - this.gestureState.rotation;
            const newRotation = (this.stage.rotation() || 0) + rotationDelta;
            this.stage.rotation(newRotation);

            this.stage.batchDraw();
            this.gestureState = { scale: e.scale, rotation: e.rotation };
        });

        this.stage.container().addEventListener('gestureend', (e) => {
            this.gestureState = null;
        });
    }
}
```

### Example 3: Blender-like Trackpad (Scroll Wheel Pan)
```javascript
class BlenderLikeTrackpad {
    constructor(stage) {
        this.stage = stage;
        this.scrolling = false;
        this.scrollTimeout = null;
        this.init();
    }

    init() {
        this.stage.on('wheel', (e) => {
            e.evt.preventDefault();

            // In Blender, Shift+Scroll = Pan, Ctrl+Scroll = Zoom
            const isShiftScroll = e.evt.shiftKey;
            const isCtrlScroll = e.evt.ctrlKey;

            if (isShiftScroll) {
                // Pan with scroll
                const panAmount = 10;
                if (e.evt.deltaY > 0) {
                    this.stage.y(this.stage.y() - panAmount);
                } else {
                    this.stage.y(this.stage.y() + panAmount);
                }

                if (e.evt.deltaX > 0) {
                    this.stage.x(this.stage.x() - panAmount);
                } else {
                    this.stage.x(this.stage.x() + panAmount);
                }
            } else {
                // Normal zoom
                const scaleBy = 1.1;
                const oldScale = this.stage.scaleX();
                const pointer = this.stage.getPointerPosition();

                const mousePointTo = {
                    x: (pointer.x - this.stage.x()) / oldScale,
                    y: (pointer.y - this.stage.y()) / oldScale,
                };

                let direction = e.evt.deltaY > 0 ? -1 : 1;
                if (isCtrlScroll) direction = -direction;

                const newScale = direction > 0 
                    ? oldScale * scaleBy 
                    : oldScale / scaleBy;

                this.stage.scale({ x: newScale, y: newScale });
                this.stage.position({
                    x: pointer.x - mousePointTo.x * newScale,
                    y: pointer.y - mousePointTo.y * newScale,
                });
            }

            this.stage.batchDraw();
        });
    }
}
```

## 6. Performance Benchmarking

### Measurement Code
```javascript
class GesturePerformanceMonitor {
    constructor() {
        this.frameCount = 0;
        this.fps = 0;
        this.lastTime = performance.now();
        this.eventCount = 0;
    }

    measureRenderPerformance(stage) {
        let frameCount = 0;
        const startTime = performance.now();

        const measure = () => {
            frameCount++;
            const elapsed = performance.now() - startTime;

            if (elapsed >= 1000) {
                console.log(`FPS: ${frameCount} events/sec: ${this.eventCount}`);
                this.fps = frameCount;
                frameCount = 0;
                this.eventCount = 0;
            }
            requestAnimationFrame(measure);
        };

        measure();
    }

    measureEventLatency(eventName) {
        return (e) => {
            const latency = performance.now() - e.timeStamp;
            console.log(`${eventName} latency: ${latency.toFixed(2)}ms`);
            this.eventCount++;
        };
    }
}

// Usage
const monitor = new GesturePerformanceMonitor();
stage.on('pointermove', monitor.measureEventLatency('pointermove'));
monitor.measureRenderPerformance(stage);
```

## 7. Debugging Tips

### Check Gesture Support
```javascript
// In browser console
{
    "GestureEvent": 'ongesturechange' in window,
    "PointerEvent": !!window.PointerEvent,
    "TouchEvent": 'ontouchstart' in window,
    "maxTouchPoints": navigator.maxTouchPoints,
    "platform": navigator.platform,
    "userAgent": navigator.userAgent
}
```

### Log All Gesture Events
```javascript
function monitorAllGestures(element) {
    ['gesturestart', 'gesturechange', 'gestureend'].forEach(event => {
        element.addEventListener(event, (e) => {
            console.log(`${event}:`, {
                scale: e.scale?.toFixed(2),
                rotation: e.rotation?.toFixed(1),
                clientX: e.clientX,
                clientY: e.clientY
            });
        });
    });

    ['pointerdown', 'pointermove', 'pointerup'].forEach(event => {
        element.addEventListener(event, (e) => {
            if (e.pointerType === 'touch') {
                console.log(`${event}:`, {
                    pointerId: e.pointerId,
                    pointerType: e.pointerType,
                    pressure: e.pressure,
                    width: e.width
                });
            }
        });
    });

    element.addEventListener('wheel', (e) => {
        console.log('wheel:', {
            deltaX: e.deltaX,
            deltaY: e.deltaY,
            deltaZ: e.deltaZ,
            deltaMode: e.deltaMode,
            ctrlKey: e.ctrlKey,
            shiftKey: e.shiftKey
        });
    });
}
```

### Simulate Trackpad Events (for testing)
```javascript
function simulatePinch(element, scale) {
    const event = new GestureEvent('gesturechange', {
        bubbles: true,
        cancelable: true,
        scale: scale,
        rotation: 0,
        clientX: element.clientWidth / 2,
        clientY: element.clientHeight / 2
    });
    element.dispatchEvent(event);
}

// Usage
simulatePinch(canvasContainer, 1.2);  // Zoom in 20%
```

## 8. Known Issues & Workarounds

### Issue: Trackpad zoom direction reversed on Windows
```javascript
// Windows trackpad may reverse wheel deltaY
const isWindows = /Win/.test(navigator.platform);
const correctedDelta = isWindows && e.evt.ctrlKey 
    ? -e.evt.deltaY 
    : e.evt.deltaY;
```

### Issue: PointerEvents not firing on some Linux trackpads
```javascript
// Fallback to wheel events on Linux
const isLinux = /Linux|X11/.test(navigator.platform);
if (isLinux && !navigator.maxTouchPoints) {
    // Use only wheel events for pan/zoom
    initWheelOnlyMode(stage);
}
```

### Issue: GestureEvent only on Safari/Chrome macOS
```javascript
// Check support before using
if ('ongesturechange' in window) {
    // Use GestureEvent
} else {
    // Fall back to PointerEvent
}
```

### Issue: iOS Safari gesture detection
```javascript
// iOS doesn't support standard GestureEvent like macOS
// Use PointerEvent instead with multi-touch detection
const isSafariIOS = /iPad|iPhone|iPod/.test(navigator.platform);
if (isSafariIOS) {
    initPointerEventHandlers(stage);
} else {
    initBothHandlers(stage);
}
```

## 9. Testing Checklist

Test on these platforms/devices:
- [ ] macOS trackpad + Electron app
- [ ] Windows precision touchpad (if available)
- [ ] Linux trackpad (GNOME/KDE)
- [ ] Magic Mouse / MacBook trackpad
- [ ] iPad / tablet with trackpad
- [ ] Touch-enabled monitor
- [ ] Wacom/drawing tablet (if relevant)

For each platform, test:
- [ ] Two-finger pan
- [ ] Pinch zoom
- [ ] Rotation (if implemented)
- [ ] Momentum/inertia
- [ ] Zoom centering
- [ ] Performance at high zoom levels
- [ ] Canvas responsiveness during gestures

## 10. Migration Guide (from current code)

Current texture-ripper uses:
- Middle-click panning ✓
- Wheel zoom ✓
- Trackpad detection via ctrlKey ✓

To add advanced gesture support:

1. Create new file: `trackpadGestureManager.js`
2. Move gesture handlers to separate managers
3. Initialize all in enhanced `PanZoomManager.initAll()`
4. Add capability detection
5. Test on all platforms

```javascript
// New structure
PanZoomManager.initAll(stage) {
    // Basic
    PanZoomManager.initPanning(stage);
    PanZoomManager.initZooming(stage);
    
    // Advanced
    if (capabilities.supportsGestureEvent) {
        MacOSGestureManager.init(stage);
    }
    if (capabilities.supportsPointerEvent) {
        TrackpadPanManager.init(stage);
        PointerPinchZoom.init(stage);
    }
}
```

