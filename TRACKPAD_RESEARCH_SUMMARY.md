# Trackpad Gesture Support Research - Executive Summary

## Quick Overview

This research covers implementing trackpad gesture support in the texture-ripper Electron application (Konva.js-based drawing/image manipulation canvas).

## Key Findings

### 1. Current Implementation Status
- **Wheel zoom**: Fully functional with trackpad detection via `ctrlKey`
- **Middle-click pan**: Working
- **Multi-touch gestures**: Not implemented
- **macOS rotation**: Not supported
- **Cross-platform consistency**: Limited

### 2. Available APIs (by platform)

| API | Support | Best For | Platform |
|-----|---------|----------|----------|
| **Wheel Event** | Universal | General zoom/scroll | All platforms |
| **GestureEvent** | WebKit only | Native pinch/rotate | macOS + Electron |
| **PointerEvent** | Modern browsers | Multi-touch tracking | All modern platforms |
| **Touch Events** | Limited | Mobile devices | Not ideal for trackpad |

### 3. Recommended Roadmap

**Phase 1 (High Priority)**: Add PointerEvent-based two-finger pan
- Cross-platform (Windows, macOS, Linux)
- Minimal code changes
- Immediate UX improvement
- Implementation: ~100 lines of code

**Phase 2 (Medium Priority)**: Add GestureEvent support for macOS
- Better macOS experience
- Native gesture handling
- Optional rotation support
- Implementation: ~150 lines of code

**Phase 3 (Nice-to-have)**: Momentum/inertia zoom
- Smooth deceleration after gesture
- Better feel
- Implementation: ~100 lines of code

### 4. Implementation Complexity

| Feature | Complexity | Time | Code Size |
|---------|-----------|------|-----------|
| Two-finger pan (PointerEvent) | Low | 30 min | 100 lines |
| macOS gestures (GestureEvent) | Low | 45 min | 150 lines |
| Pinch zoom (PointerEvent) | Medium | 1 hr | 150 lines |
| Momentum zoom | Medium | 1 hr | 100 lines |
| Platform detection | Low | 15 min | 50 lines |

### 5. Browser/Electron Compatibility

**Electron Support**: Full (based on Chromium 38.0)
- GestureEvent: macOS only
- PointerEvent: All platforms
- Wheel: All platforms

**Desktop Platforms**:
- macOS: All APIs available
- Windows: PointerEvent + Wheel
- Linux: Wheel primary, PointerEvent if driver supports it

### 6. Konva.js Specific Notes

Current texture-ripper uses Konva.js v10.0.12:
- Events via `stage.on()` wrapper
- Native events accessible via `e.evt`
- PointerEvent support added in v10
- No built-in multi-touch gesture recognition
- Works well with custom gesture handlers

### 7. Best Practices Summary

1. **Use event delegation**: Attach listeners to `stage.container()` not Konva's `stage.on()`
2. **Separate concerns**: Keep gesture logic in dedicated managers
3. **Progressive enhancement**: Start with basic wheel events, add PointerEvent, then GestureEvent
4. **Performance**: Use `requestAnimationFrame` for animations, not direct DOM updates
5. **Testing**: Test on actual hardware (trackpads behave differently than simulated events)

### 8. Key Integration Points

For texture-ripper specifically:
- **File**: `/Users/jacobbrooks/texture-ripper/scripts/panZoomManager.js`
- **Current pattern**: Already uses `initPanning()` and `initZooming()` separation
- **Recommended approach**: Extend to `initAll()` with capability detection
- **No breaking changes**: New code can coexist with existing implementation

### 9. Testing Requirements

Before deployment, test:
- Two-finger pan on macOS trackpad
- Pinch zoom on all platforms
- Wheel zoom still works (regression)
- Middle-click pan still works (regression)
- Performance under rapid gestures
- Zoom centering accuracy

### 10. External Dependencies

Good news: **Zero external dependencies needed**
- All APIs are browser-native
- No gesture libraries required
- Polyfills available if needed (but not necessary for Electron)

## Code Organization Recommendation

```
scripts/
├── panZoomManager.js          (existing - core pan/zoom)
├── trackpadGestureManager.js  (new - PointerEvent gestures)
├── macOSGestureManager.js     (new - GestureEvent support)
└── gestureCapabilities.js     (new - feature detection)
```

## Decision Framework

**Should you implement trackpad gestures?**

YES if:
- Users are on macOS or Windows with precision trackpads
- Multi-touch canvas manipulation is expected
- Competition supports it (Figma, Adobe tools do)

Optional if:
- Current wheel + middle-click is sufficient
- Resources are limited
- Mobile/tablet support not planned

## Estimated Implementation Time

- Basic two-finger pan: 30 minutes
- Full cross-platform support: 2-3 hours
- Testing on all platforms: 1-2 hours
- Documentation: 30 minutes

**Total: ~4-6 hours for production-ready implementation**

## Next Steps

1. Review current `panZoomManager.js` implementation
2. Identify performance bottlenecks if any
3. Create capability detection layer
4. Implement PointerEvent handlers
5. Test on available hardware
6. Add GestureEvent for macOS (if desired)
7. Document for future maintainers

---

**Research compiled**: April 2026
**Platform**: Electron + Konva.js v10.0.12
**Target**: texture-ripper application
**Status**: Ready for implementation
