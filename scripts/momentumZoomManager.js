// ==================== MOMENTUM & INERTIA ZOOM ====================

/**
 * Adds smooth momentum-based zoom for trackpad scrolling
 * Also handles trackpad two-finger panning on macOS
 * Provides a more polished feel similar to professional design tools
 */
const MomentumZoom = {
    wheelVelocity: 0,
    lastWheelTime: 0,
    wheelAnimationId: null,
    targetScale: 1,
    isAnimating: false,
    lastDeltaY: 0,
    wheelEventCount: 0,

    /**
     * Initialize momentum zoom on wheel events
     * Also detects trackpad two-finger panning
     */
    initMomentumZoom: (stage) => {
        const container = stage.container();
        let wasTrackpadPan = false;

        stage.on('wheel', (e) => {
            e.evt.preventDefault();

            const now = Date.now();
            const timeSinceLastWheel = now - MomentumZoom.lastWheelTime;

            // Detect trackpad vs mouse wheel
            // Trackpad: many small events in quick succession (< 50ms apart)
            // Mouse wheel: larger deltaY, less frequent
            const deltaY = Math.abs(e.evt.deltaY);
            const isTrackpad = deltaY < 100 && timeSinceLastWheel < 50;

            // On macOS: if deltaY hasn't changed much and it's rapid, it's likely trackpad pan
            const isDeltaConsistent = Math.abs(e.evt.deltaY - MomentumZoom.lastDeltaY) < 30;
            const isLikelyTrackpadPan = isTrackpad && isDeltaConsistent && deltaY < 40;

            MomentumZoom.lastDeltaY = e.evt.deltaY;
            MomentumZoom.lastWheelTime = now;

            // Handle trackpad two-finger panning (macOS)
            if (isLikelyTrackpadPan && !e.evt.ctrlKey) {
                MomentumZoom.handleTrackpadPan(stage, e);
                wasTrackpadPan = true;
                return;
            }

            wasTrackpadPan = false;

            // Handle zoom (mouse wheel or pinch gesture)
            // Calculate velocity for momentum
            if (isTrackpad) {
                MomentumZoom.wheelVelocity = e.evt.deltaY;
            } else {
                MomentumZoom.wheelVelocity = e.evt.deltaY > 0 ? 100 : -100;
            }

            // Get current zoom parameters
            const oldScale = stage.scaleX();
            const pointer = stage.getPointerPosition();

            const mousePointTo = {
                x: (pointer.x - stage.x()) / oldScale,
                y: (pointer.y - stage.y()) / oldScale
            };

            // Determine direction
            let direction = MomentumZoom.wheelVelocity > 0 ? -1 : 1;

            // Trackpad pinch zoom detection via ctrl key
            if (e.evt.ctrlKey) {
                direction = -direction;
            }

            // Calculate new scale
            const scaleFactor = 1.1; // 10% per scroll event
            const newScale = direction > 0
                ? oldScale * scaleFactor
                : oldScale / scaleFactor;

            MomentumZoom.targetScale = Math.max(0.1, Math.min(5, newScale));

            // Start momentum animation
            MomentumZoom.startMomentumAnimation(stage, pointer, mousePointTo);
        });
    },

    /**
     * Handle trackpad two-finger panning
     * macOS trackpad produces consistent small deltaY values for two-finger pan
     */
    handleTrackpadPan: (stage, e) => {
        const pointer = stage.getPointerPosition();

        // Get the pan distance from deltaY (vertical) and deltaX (if available)
        const dx = e.evt.deltaX || 0;
        const dy = e.evt.deltaY;

        // Apply pan to stage
        stage.x(stage.x() - dx);
        stage.y(stage.y() - dy);
        stage.batchDraw();
    },

    /**
     * Animate zoom with easing (exponential decay)
     */
    startMomentumAnimation: (stage, pointer, mousePointTo) => {
        // Cancel previous animation
        if (MomentumZoom.wheelAnimationId) {
            cancelAnimationFrame(MomentumZoom.wheelAnimationId);
        }

        MomentumZoom.isAnimating = true;

        const animate = () => {
            const currentScale = stage.scaleX();
            const delta = MomentumZoom.targetScale - currentScale;

            // Continue animating if delta is significant
            if (Math.abs(delta) > 0.001) {
                // Exponential decay easing: use 15% of remaining distance per frame
                const eased = currentScale + delta * 0.15;

                stage.scaleX(eased);
                stage.scaleY(eased);

                const newPos = {
                    x: pointer.x - mousePointTo.x * eased,
                    y: pointer.y - mousePointTo.y * eased
                };

                stage.position(newPos);
                stage.batchDraw();

                MomentumZoom.wheelAnimationId = requestAnimationFrame(animate);
            } else {
                // Animation complete
                stage.scaleX(MomentumZoom.targetScale);
                stage.scaleY(MomentumZoom.targetScale);

                const finalPos = {
                    x: pointer.x - mousePointTo.x * MomentumZoom.targetScale,
                    y: pointer.y - mousePointTo.y * MomentumZoom.targetScale
                };

                stage.position(finalPos);
                stage.batchDraw();

                MomentumZoom.isAnimating = false;
                MomentumZoom.wheelAnimationId = null;
            }
        };

        animate();
    }
};
