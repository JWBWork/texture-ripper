// ==================== TRACKPAD MULTI-TOUCH GESTURES ====================

/**
 * Handles multi-touch gestures for trackpad and touch devices
 * Uses PointerEvent API for cross-platform support
 */
const TrackpadPanManager = {
    pointers: {},
    isPanning: false,

    /**
     * Initialize two-finger pan gesture
     */
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

            // Calculate movement of current finger
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

/**
 * Handles pinch-to-zoom with PointerEvent
 * Works on Windows, macOS, and Linux with multi-touch capable devices
 */
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

    /**
     * Initialize pinch-to-zoom gesture
     */
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
