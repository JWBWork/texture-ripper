// ==================== GESTURE CAPABILITIES DETECTION ====================

/**
 * Detects available gesture capabilities on the current platform
 * Used to enable/disable gesture features appropriately
 */
const GestureCapabilities = {
    /**
     * Detect supported gesture APIs and platform
     * @returns {Object} Capability flags and platform info
     */
    detect: () => {
        return {
            // API support
            supportsGestureEvent: 'ongesturechange' in window,
            supportsPointerEvent: 'PointerEvent' in window,
            supportsTouchEvent: 'ontouchstart' in window,
            maxTouchPoints: navigator.maxTouchPoints || 0,

            // Platform detection
            isMac: /Mac|iPhone|iPad|iPod/.test(navigator.platform),
            isWindows: /Win/.test(navigator.platform),
            isLinux: /Linux|X11/.test(navigator.platform),

            // Runtime detection
            isElectron: (typeof window !== 'undefined' &&
                typeof window.process === 'object' &&
                window.process.type === 'renderer'),

            // User agent info
            userAgent: navigator.userAgent
        };
    },

    /**
     * Log capability info to console for debugging
     */
    logCapabilities: () => {
        const caps = GestureCapabilities.detect();
        console.log('=== Gesture Capabilities ===');
        console.table(caps);

        console.log('\n=== Gesture Support ===');
        console.log(`Pinch Zoom: ${caps.supportsGestureEvent || caps.supportsPointerEvent ? '✓' : '✗'}`);
        console.log(`Two-finger Pan: ${caps.supportsPointerEvent && caps.maxTouchPoints > 0 ? '✓' : '✗'}`);
        console.log(`Rotation Gesture: ${caps.supportsGestureEvent ? '✓' : '✗'}`);
        console.log(`Platform: ${caps.isMac ? 'macOS' : caps.isWindows ? 'Windows' : caps.isLinux ? 'Linux' : 'Unknown'}`);
        console.log(`Electron: ${caps.isElectron ? 'Yes' : 'No'}`);
    }
};

/**
 * Initialize all gesture support based on capabilities
 */
const TrackpadInitializer = {
    /**
     * Initialize all gesture handlers appropriate for the platform
     * @param {Konva.Stage} stage - The Konva stage to attach gestures to
     */
    initAll: (stage) => {
        const capabilities = GestureCapabilities.detect();

        // Always initialize basic panning and zooming
        PanZoomManager.initPanning(stage);
        PanZoomManager.initZooming(stage);

        // Add multi-touch pan and pinch zoom (works on most platforms)
        if (capabilities.supportsPointerEvent && capabilities.maxTouchPoints > 0) {
            TrackpadPanManager.initMultiTouchPan(stage);
            PointerPinchZoom.initPointerPinch(stage);
        }

        // Add macOS-specific native gestures
        if (capabilities.isMac && capabilities.supportsGestureEvent) {
            MacOSGestureManager.initMacOSGestures(stage);
        }

        // Add momentum zoom for better trackpad scroll feel
        MomentumZoom.initMomentumZoom(stage);
    },

    /**
     * Debug: Log what gestures were initialized
     */
    logInitialization: () => {
        const caps = GestureCapabilities.detect();
        console.log('\n=== Gesture Initialization ===');
        console.log('✓ Basic panning (middle-click)');
        console.log('✓ Basic zooming (wheel)');

        if (caps.supportsPointerEvent && caps.maxTouchPoints > 0) {
            console.log('✓ Multi-touch pan (PointerEvent)');
            console.log('✓ Pinch zoom (PointerEvent)');
        } else {
            console.log('✗ Multi-touch pan (not supported)');
            console.log('✗ Pinch zoom (not supported)');
        }

        if (caps.isMac && caps.supportsGestureEvent) {
            console.log('✓ macOS native gestures');
        } else {
            console.log('✗ macOS native gestures (not on macOS or not WebKit)');
        }

        console.log('✓ Momentum zoom');
    }
};
