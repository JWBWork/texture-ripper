# Konva.js Trackpad Gesture Implementation Guide

## Integration with Existing texture-ripper Code

### Current panZoomManager.js Analysis

**Strengths:**
- Clean separation of panning and zooming logic
- Uses Konva's native event wrapping (`stage.on()`)
- Handles middle-click panning correctly
- Detects trackpad zoom via `ctrlKey` flag
- Properly manages draggable state during pan

**Gaps:**
- No PointerEvent multi-touch support
- No GestureEvent (macOS specific) rotation
- Zoom not momentum-based
- No gesture start/end lifecycle

### Extension Strategy

The current architecture can be extended without breaking changes:

```javascript
// Keep existing methods, add new ones
const PanZoomManager = {
    isPanning: false,
    
    // Existing methods...
    initPanning: (stage) => { /* ... */ },
    initZooming: (stage) => { /* ... */ },
    cancelPanning: () => { /* ... */ },
    
    // New methods to add
    initMultiTouchGestures: (stage) => { /* ... */ },
    initMacOSGestures: (stage) => { /* ... */ },
    initMomentumZoom: (stage) => { /* ... */ }
};
```

## Implementation 1: Two-Finger Pan with PointerEvent

```javascript
// Add to PanZoomManager
const TrackpadPanManager = {
    pointers: {},
    
    initMultiTouchPan: (stage) => {
        const container = stage.container();
        
        container.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'touch') {
                TrackpadPanManager.pointers[e.pointerId] = {
                    x: e.clientX,
                    y: e.clientY
                };
            }
        });
        
        container.addEventListener('pointermove', (e) => {
            if (e.pointerType !== 'touch' || !TrackpadPanManager.pointers[e.pointerId]) {
                return;
            }
            
            const pointerIds = Object.keys(TrackpadPanManager.pointers);
            
            // Only handle two-finger pan
            if (pointerIds.length !== 2) {
                TrackpadPanManager.pointers[e.pointerId] = {
                    x: e.clientX,
                    y: e.clientY
                };
                return;
            }
            
            // Calculate movement of each finger
            const prev = TrackpadPanManager.pointers[e.pointerId];
            const dx = e.clientX - prev.x;
            const dy = e.clientY - prev.y;
            
            // Apply pan to stage
            stage.x(stage.x() + dx);
            stage.y(stage.y() + dy);
            stage.batchDraw();
            
            TrackpadPanManager.pointers[e.pointerId] = {
                x: e.clientX,
                y: e.clientY
            };
        });
        
        container.addEventListener('pointerup', (e) => {
            delete TrackpadPanManager.pointers[e.pointerId];
        });
        
        container.addEventListener('pointercancel', (e) => {
            delete TrackpadPanManager.pointers[e.pointerId];
        });
    }
};
```

## Implementation 2: GestureEvent Support (macOS)

```javascript
// Add to PanZoomManager for macOS-specific gestures
const MacOSGestureManager = {
    lastScale: 1,
    lastRotation: 0,
    
    initMacOSGestures: (stage) => {
        const container = stage.container();
        
        // Check if GestureEvent is supported
        if (!('ongesturechange' in window)) {
            return;
        }
        
        container.addEventListener('gesturestart', (e) => {
            e.preventDefault();
            MacOSGestureManager.lastScale = 1;
            MacOSGestureManager.lastRotation = 0;
        });
        
        container.addEventListener('gesturechange', (e) => {
            e.preventDefault();
            
            // Handle pinch-to-zoom
            if (Math.abs(e.scale - MacOSGestureManager.lastScale) > 0.01) {
                MacOSGestureManager.handlePinch(stage, e);
            }
            
            // Handle rotation (optional - may not be common)
            if (Math.abs(e.rotation - MacOSGestureManager.lastRotation) > 0.5) {
                MacOSGestureManager.handleRotation(stage, e);
            }
            
            MacOSGestureManager.lastScale = e.scale;
            MacOSGestureManager.lastRotation = e.rotation;
        });
        
        container.addEventListener('gestureend', (e) => {
            MacOSGestureManager.lastScale = 1;
            MacOSGestureManager.lastRotation = 0;
        });
    },
    
    handlePinch: (stage, e) => {
        const oldScale = stage.scaleX();
        const pointer = stage.getPointerPosition();
        
        const mousePointTo = {
            x: (pointer.x - stage.x()) / oldScale,
            y: (pointer.y - stage.y()) / oldScale
        };
        
        // Scale based on gesture scale change
        const scaleFactor = e.scale;
        const newScale = oldScale * scaleFactor;
        
        // Clamp scale to reasonable bounds (e.g., 0.1 to 5)
        const clampedScale = Math.max(0.1, Math.min(5, newScale));
        
        stage.scaleX(clampedScale);
        stage.scaleY(clampedScale);
        
        const newPos = {
            x: pointer.x - mousePointTo.x * clampedScale,
            y: pointer.y - mousePointTo.y * clampedScale
        };
        
        stage.position(newPos);
        stage.batchDraw();
    },
    
    handleRotation: (stage, e) => {
        // Optional: rotate entire canvas/content
        const rotation = e.rotation;
        const currentRotation = stage.rotation() || 0;
        
        // In canvas apps, rotation is usually not desired
        // but this shows how to implement it if needed
        // stage.rotation(currentRotation + rotation);
        // stage.batchDraw();
    }
};
```

## Implementation 3: PointerEvent-Based Pinch-to-Zoom

```javascript
// Cross-platform pinch zoom using PointerEvent
const PointerPinchZoom = {
    pointers: {},
    lastDistance: 0,
    
    getDistance: (p1, p2) => {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        return Math.sqrt(dx * dx + dy * dy);
    },
    
    getMidpoint: (p1, p2) => {
        return {
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2
        };
    },
    
    initPointerPinch: (stage) => {
        const container = stage.container();
        
        container.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'touch') {
                PointerPinchZoom.pointers[e.pointerId] = {
                    x: e.clientX,
                    y: e.clientY
                };
            }
        });
        
        container.addEventListener('pointermove', (e) => {
            if (e.pointerType !== 'touch' || !PointerPinchZoom.pointers[e.pointerId]) {
                return;
            }
            
            const pointerIds = Object.keys(PointerPinchZoom.pointers);
            
            if (pointerIds.length === 2) {
                // Two fingers - detect pinch
                PointerPinchZoom.handlePinchMove(stage, e);
            } else {
                // Single finger or movement update
                PointerPinchZoom.pointers[e.pointerId] = {
                    x: e.clientX,
                    y: e.clientY
                };
            }
        });
        
        container.addEventListener('pointerup', (e) => {
            delete PointerPinchZoom.pointers[e.pointerId];
            PointerPinchZoom.lastDistance = 0;
        });
        
        container.addEventListener('pointercancel', (e) => {
            delete PointerPinchZoom.pointers[e.pointerId];
            PointerPinchZoom.lastDistance = 0;
        });
    },
    
    handlePinchMove: (stage, e) => {
        const pointerIds = Object.keys(PointerPinchZoom.pointers);
        const ids = pointerIds.map(id => parseInt(id));
        
        const p1 = PointerPinchZoom.pointers[ids[0]];
        const p2 = PointerPinchZoom.pointers[ids[1]];
        
        const currentDistance = PointerPinchZoom.getDistance(p1, p2);
        
        if (PointerPinchZoom.lastDistance <= 0) {
            PointerPinchZoom.lastDistance = currentDistance;
            PointerPinchZoom.pointers[e.pointerId] = {
                x: e.clientX,
                y: e.clientY
            };
            return;
        }
        
        // Calculate scale factor
        const scaleFactor = currentDistance / PointerPinchZoom.lastDistance;
        
        // Calculate midpoint between two fingers as zoom center
        const midpoint = PointerPinchZoom.getMidpoint(p1, p2);
        const stage_pos = stage.getAbsolutePosition();
        const pointer = {
            x: midpoint.x - stage_pos.x,
            y: midpoint.y - stage_pos.y
        };
        
        const oldScale = stage.scaleX();
        
        const mousePointTo = {
            x: (pointer.x - stage.x()) / oldScale,
            y: (pointer.y - stage.y()) / oldScale
        };
        
        const newScale = Math.max(0.1, Math.min(5, oldScale * scaleFactor));
        
        stage.scaleX(newScale);
        stage.scaleY(newScale);
        
        const newPos = {
            x: pointer.x - mousePointTo.x * newScale,
            y: pointer.y - mousePointTo.y * newScale
        };
        
        stage.position(newPos);
        stage.batchDraw();
        
        PointerPinchZoom.lastDistance = currentDistance;
        PointerPinchZoom.pointers[e.pointerId] = {
            x: e.clientX,
            y: e.clientY
        };
    }
};
```

## Implementation 4: Momentum/Inertia Zoom

```javascript
// Smooth momentum-based zoom
const MomentumZoom = {
    wheelVelocity: 0,
    lastWheelTime: 0,
    wheelAnimationId: null,
    targetScale: 1,
    
    initMomentumZoom: (stage) => {
        // Override or wrap the existing wheel handler
        stage.on('wheel', (e) => {
            e.evt.preventDefault();
            
            const now = Date.now();
            const timeSinceLastWheel = now - MomentumZoom.lastWheelTime;
            
            // Trackpad scroll detection
            const isTrackpad = Math.abs(e.evt.deltaY) < 100 && timeSinceLastWheel < 50;
            
            // Calculate velocity for momentum
            if (isTrackpad) {
                MomentumZoom.wheelVelocity = e.evt.deltaY;
            } else {
                MomentumZoom.wheelVelocity = e.evt.deltaY > 0 ? 100 : -100;
            }
            
            MomentumZoom.lastWheelTime = now;
            
            // Calculate target scale
            const oldScale = stage.scaleX();
            const pointer = stage.getPointerPosition();
            
            const mousePointTo = {
                x: (pointer.x - stage.x()) / oldScale,
                y: (pointer.y - stage.y()) / oldScale
            };
            
            let direction = MomentumZoom.wheelVelocity > 0 ? -1 : 1;
            
            // Trackpad pinch zoom detection
            if (e.evt.ctrlKey) {
                direction = -direction;
            }
            
            const scaleFactor = 1.1; // 10% per scroll
            const newScale = direction > 0 
                ? oldScale * scaleFactor 
                : oldScale / scaleFactor;
            
            MomentumZoom.targetScale = Math.max(0.1, Math.min(5, newScale));
            
            // Start momentum animation
            MomentumZoom.startMomentumAnimation(stage, pointer, mousePointTo);
        });
    },
    
    startMomentumAnimation: (stage, pointer, mousePointTo) => {
        // Cancel previous animation
        if (MomentumZoom.wheelAnimationId) {
            cancelAnimationFrame(MomentumZoom.wheelAnimationId);
        }
        
        const animate = () => {
            const currentScale = stage.scaleX();
            const delta = MomentumZoom.targetScale - currentScale;
            
            if (Math.abs(delta) > 0.001) {
                // Easing function: exponential decay
                const eased = currentScale + delta * 0.15; // 15% of remaining distance
                
                stage.scaleX(eased);
                stage.scaleY(eased);
                
                const newPos = {
                    x: pointer.x - mousePointTo.x * eased,
                    y: pointer.y - mousePointTo.y * eased
                };
                
                stage.position(newPos);
                stage.batchDraw();
                
                MomentumZoom.wheelAnimationId = requestAnimationFrame(animate);
            }
        };
        
        animate();
    }
};
```

## Implementation 5: Platform Detection and Initialization

```javascript
// Capability detection and initialization
const TrackpadInitializer = {
    detect: () => {
        return {
            supportsGestureEvent: 'ongesturechange' in window,
            supportsPointerEvent: 'PointerEvent' in window,
            supportsTouchEvent: 'ontouchstart' in window,
            maxTouchPoints: navigator.maxTouchPoints || 0,
            isMac: /Mac|iPhone|iPad|iPod/.test(navigator.platform),
            isWindows: /Win/.test(navigator.platform),
            isLinux: /Linux|X11/.test(navigator.platform),
            isElectron: (typeof window !== 'undefined' && 
                        typeof window.process === 'object' && 
                        window.process.type === 'renderer')
        };
    },
    
    initAll: (stage) => {
        const capabilities = TrackpadInitializer.detect();
        
        // Always initialize basic panning and zooming
        PanZoomManager.initPanning(stage);
        PanZoomManager.initZooming(stage);
        
        // Add multi-touch pan (works on most platforms)
        if (capabilities.supportsPointerEvent && capabilities.maxTouchPoints > 0) {
            TrackpadPanManager.initMultiTouchPan(stage);
            PointerPinchZoom.initPointerPinch(stage);
        }
        
        // Add macOS-specific gestures
        if (capabilities.isMac && capabilities.supportsGestureEvent) {
            MacOSGestureManager.initMacOSGestures(stage);
        }
        
        // Optional: Initialize momentum zoom
        MomentumZoom.initMomentumZoom(stage);
    }
};
```

## Integration into Existing Code

### Updated panZoomManager.js Structure

```javascript
const PanZoomManager = {
    isPanning: false,
    
    // Existing methods unchanged
    initPanning: (stage) => { /* existing code */ },
    cancelPanning: () => { /* existing code */ },
    initZooming: (stage) => { /* existing code */ },
    
    // New initialization method
    initAll: (stage) => {
        PanZoomManager.initPanning(stage);
        PanZoomManager.initZooming(stage);
        
        // Add new gesture support
        TrackpadInitializer.initAll(stage);
    }
};

// Update usage in leftPanelManager.js and rightPanelManager.js:
// Replace:
// PanZoomManager.initPanning(stage);
// PanZoomManager.initZooming(stage);
//
// With:
// PanZoomManager.initAll(stage);
```

## Testing Checklist

```javascript
// Add to console for testing gesture support
window.testGestureSupport = () => {
    const caps = TrackpadInitializer.detect();
    console.table(caps);
    console.log('Gesture Support:');
    console.log(`- Pinch Zoom: ${caps.supportsGestureEvent || caps.supportsPointerEvent}`);
    console.log(`- Multi-touch Pan: ${caps.supportsPointerEvent && caps.maxTouchPoints > 0}`);
    console.log(`- Rotation: ${caps.supportsGestureEvent}`);
};
```

## Performance Considerations

1. **Event Coalescing**: Use `getCoalescedEvents()` for smooth trackpad input
```javascript
container.addEventListener('pointermove', (e) => {
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    
    for (const coalescedEvent of events) {
        // Process high-frequency events
    }
});
```

2. **Debouncing**: Use RAF instead of direct calls
```javascript
let rafId = null;
function scheduleRender() {
    if (rafId === null) {
        rafId = requestAnimationFrame(() => {
            stage.batchDraw();
            rafId = null;
        });
    }
}
```

3. **Event Delegation**: Attach listeners at container level, not stage
```javascript
// Good: Attach to container once
stage.container().addEventListener('pointermove', handler);

// Avoid: Attaching to stage multiple times
stage.on('pointermove', handler); // Konva-wrapped, less efficient for high-frequency
```

## Browser Console Debug Commands

```javascript
// Monitor gesture events in real-time
window.debugGestures = () => {
    document.addEventListener('gesturestart', () => console.log('Gesture START'));
    document.addEventListener('gesturechange', (e) => {
        console.log(`Gesture: scale=${e.scale.toFixed(2)}, rotation=${e.rotation.toFixed(1)}`);
    });
    document.addEventListener('gestureend', () => console.log('Gesture END'));
    
    document.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'touch') console.log('Touch DOWN', e.pointerId);
    });
    document.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch' && Object.keys(PointerPinchZoom.pointers).length > 1) {
            console.log('Multi-touch MOVE', Object.keys(PointerPinchZoom.pointers).length);
        }
    });
    document.addEventListener('pointerup', (e) => {
        if (e.pointerType === 'touch') console.log('Touch UP', e.pointerId);
    });
};
```

