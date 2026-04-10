// ==================== MOMENTUM & INERTIA ZOOM ====================

/**
 * Adds smooth momentum-based zoom for trackpad scrolling
 * Provides a more polished feel similar to professional design tools
 */
const MomentumZoom = {
    wheelVelocity: 0,
    lastWheelTime: 0,
    wheelAnimationId: null,
    targetScale: 1,
    isAnimating: false,

    /**
     * Initialize momentum zoom on wheel events
     * Wraps or enhances existing wheel event handler
     */
    initMomentumZoom: (stage) => {
        const originalWheelHandler = stage._events?.wheel || [];

        stage.on('wheel', (e) => {
            e.evt.preventDefault();

            // Detect trackpad vs mouse wheel
            // Trackpad: many small events in quick succession
            // Mouse wheel: larger deltaY, less frequent
            const now = Date.now();
            const timeSinceLastWheel = now - MomentumZoom.lastWheelTime;
            const isTrackpad = Math.abs(e.evt.deltaY) < 100 && timeSinceLastWheel < 50;

            // Calculate velocity for momentum
            if (isTrackpad) {
                MomentumZoom.wheelVelocity = e.evt.deltaY;
            } else {
                MomentumZoom.wheelVelocity = e.evt.deltaY > 0 ? 100 : -100;
            }

            MomentumZoom.lastWheelTime = now;

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
