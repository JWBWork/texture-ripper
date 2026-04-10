// ==================== macOS NATIVE GESTURE SUPPORT ====================

/**
 * Handles native macOS gestures via GestureEvent API
 * Only available on macOS - provides smoother pinch zoom and rotation
 * Falls back to PointerEvent on other platforms
 */
const MacOSGestureManager = {
    lastScale: 1,
    lastRotation: 0,
    initialScale: 1,

    /**
     * Initialize macOS native gestures
     * Check if GestureEvent is supported before initializing
     */
    initMacOSGestures: (stage) => {
        // Check if GestureEvent is supported (macOS/WebKit only)
        if (!('ongesturechange' in window)) {
            return;
        }

        const container = stage.container();

        container.addEventListener('gesturestart', (e) => {
            e.preventDefault();
            MacOSGestureManager.lastScale = 1;
            MacOSGestureManager.lastRotation = 0;
            MacOSGestureManager.initialScale = stage.scaleX();
        });

        container.addEventListener('gesturechange', (e) => {
            e.preventDefault();

            // Handle pinch-to-zoom
            if (Math.abs(e.scale - MacOSGestureManager.lastScale) > 0.01) {
                MacOSGestureManager.handlePinch(stage, e);
            }

            // Handle rotation (optional - may not be useful for canvas apps)
            // Commented out by default since rotation is rarely desired
            // if (Math.abs(e.rotation - MacOSGestureManager.lastRotation) > 0.5) {
            //     MacOSGestureManager.handleRotation(stage, e);
            // }

            MacOSGestureManager.lastScale = e.scale;
            MacOSGestureManager.lastRotation = e.rotation;
        });

        container.addEventListener('gestureend', (e) => {
            MacOSGestureManager.lastScale = 1;
            MacOSGestureManager.lastRotation = 0;
        });
    },

    /**
     * Handle pinch zoom gesture
     * Scale is relative (cumulative) during the gesture
     */
    handlePinch: (stage, e) => {
        const pointer = stage.getPointerPosition();
        const oldScale = stage.scaleX();

        const mousePointTo = {
            x: (pointer.x - stage.x()) / oldScale,
            y: (pointer.y - stage.y()) / oldScale
        };

        // Scale based on gesture scale (relative to gesture start)
        const scaleFactor = e.scale;
        const newScale = oldScale * (scaleFactor / MacOSGestureManager.lastScale);

        // Clamp scale to reasonable bounds
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

    /**
     * Handle rotation gesture (currently unused)
     * Rotation applied to canvas in a real implementation
     * Commented out since it's rarely useful for drawing apps
     */
    handleRotation: (stage, e) => {
        const rotation = e.rotation;
        const currentRotation = stage.rotation() || 0;

        // In most canvas apps, rotation of the viewport is not desired
        // This method is provided for reference if needed in future
        // stage.rotation(currentRotation + rotation);
        // stage.batchDraw();
    }
};
