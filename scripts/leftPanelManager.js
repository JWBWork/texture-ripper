// ==================== LEFT PANEL MANAGEMENT ====================
const LeftPanelManager = {
    // Initialize the left panel
    init: (containerId, addBtnId, deleteBtnId, uploadId) => {
        const dirtyPolygons = new Set();

        const container = document.getElementById(containerId);
        const stage = new Konva.Stage({
            container: containerId,
            width: container.clientWidth,
            height: container.clientHeight
        });

        const uiLayer = new Konva.Layer();
        const bgLayer = new Konva.Layer();
        const polygonLayer = new Konva.Layer();

        stage.add(bgLayer).add(polygonLayer).add(uiLayer);

        const bgImages = []; // Store multiple images
        let selectedGroup = null;
        let imagesLocked = false; // Track lock state

        // Drawing mode state variables
        let drawingMode = false;
        let drawingModeHandlers = null;

        let linkRectsToImages = false;

        document.getElementById('linkRectsToImages').addEventListener('change', (e) => {
            linkRectsToImages = e.target.checked;
        });

        function getOverlappingGroups(konvaImg) {
            // Use stage coordinates (not screen/clientRect) for correct results at any zoom
            const iX = konvaImg.x(), iY = konvaImg.y();
            const iW = konvaImg.width() * konvaImg.scaleX();
            const iH = konvaImg.height() * konvaImg.scaleY();
            const groups = [];
            polygonLayer.find('.group').forEach(group => {
                const verts = group.vertices;
                if (!verts) return;
                const gx = group.x(), gy = group.y();
                let gMinX = Infinity, gMinY = Infinity, gMaxX = -Infinity, gMaxY = -Infinity;
                for (const v of verts) {
                    gMinX = Math.min(gMinX, v.x + gx);
                    gMinY = Math.min(gMinY, v.y + gy);
                    gMaxX = Math.max(gMaxX, v.x + gx);
                    gMaxY = Math.max(gMaxY, v.y + gy);
                }
                if (gMaxX > iX && gMinX < iX + iW &&
                    gMaxY > iY && gMinY < iY + iH) {
                    groups.push(group);
                }
            });
            return groups;
        }

        // Find a position for a new image that doesn't overlap existing ones
        function findUnoccupiedPosition(w, h) {
            if (bgImages.length === 0) {
                // First image — center on visible area
                return {
                    x: (stage.width() / 2 - stage.x()) / stage.scaleX() - w / 2,
                    y: (stage.height() / 2 - stage.y()) / stage.scaleY() - h / 2
                };
            }

            // Collect existing image rects in stage coordinates
            const rects = bgImages.map(img => ({
                x: img.x(), y: img.y(),
                w: img.width() * img.scaleX(),
                h: img.height() * img.scaleY()
            }));

            const gap = 20;

            function overlaps(x, y) {
                for (const r of rects) {
                    if (x + w + gap > r.x && x < r.x + r.w + gap &&
                        y + h + gap > r.y && y < r.y + r.h + gap) {
                        return true;
                    }
                }
                return false;
            }

            // Try placing to the right of each existing image, then below
            for (const r of rects) {
                const candidates = [
                    { x: r.x + r.w + gap, y: r.y },       // right
                    { x: r.x, y: r.y + r.h + gap },       // below
                    { x: r.x - w - gap, y: r.y },          // left
                    { x: r.x, y: r.y - h - gap },          // above
                ];
                for (const c of candidates) {
                    if (!overlaps(c.x, c.y)) return c;
                }
            }

            // Fallback: place below the bottommost image
            let maxBottom = -Infinity;
            for (const r of rects) {
                maxBottom = Math.max(maxBottom, r.y + r.h);
            }
            return { x: rects[0].x, y: maxBottom + gap };
        }

        // Helper to create a background image with undo support
        function addBackgroundImage(img) {
            const scale = Math.min(stage.width() / img.width, stage.height() / img.height);
            const scaledW = img.width * scale;
            const scaledH = img.height * scale;
            const pos = findUnoccupiedPosition(scaledW, scaledH);
            const konvaImg = new Konva.Image({
                x: pos.x,
                y: pos.y,
                image: img,
                width: scaledW,
                height: scaledH,
                draggable: !imagesLocked
            });

            bgLayer.add(konvaImg);
            bgImages.push(konvaImg);
            bgLayer.batchDraw();

            UndoManager.push({
                undo: () => {
                    konvaImg.remove();
                    const idx = bgImages.indexOf(konvaImg);
                    if (idx > -1) bgImages.splice(idx, 1);
                    tr.nodes([]);
                    bgLayer.batchDraw();
                },
                redo: () => {
                    bgLayer.add(konvaImg);
                    bgImages.push(konvaImg);
                    bgLayer.batchDraw();
                }
            });

            return konvaImg;
        }

        // Lock/Unlock Images button
        const lockBtn = document.getElementById('lockImagesLeft');
        lockBtn.addEventListener('click', () => {
            imagesLocked = !imagesLocked;
            lockBtn.textContent = imagesLocked ? 'Unlock Images' : 'Lock Images';
            lockBtn.classList.toggle("locked");

            // Update draggable state of all background images
            bgImages.forEach(img => {
                img.draggable(!imagesLocked);
            });

            // Also update transformer state
            if (imagesLocked && tr.nodes().length > 0) {
                const selectedImage = tr.nodes()[0];
                if (selectedImage instanceof Konva.Image) {
                    tr.nodes([]); // Deselect any selected image when locking
                }
            }

            bgLayer.batchDraw();
        });

        // Clipboard paste handler with feedback
        document.addEventListener('paste', (e) => {
            // Don't handle paste events if we're in drawing mode
            if (drawingMode) return;

            // Check if we're pasting image data
            const items = e.clipboardData.items;
            let imageFound = false;

            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    imageFound = true;
                    const blob = items[i].getAsFile();
                    const reader = new FileReader();

                    reader.onload = (evt) => {
                        const img = new Image();
                        img.onload = () => {
                            addBackgroundImage(img);
                            FeedbackManager.show('Image pasted successfully!');
                        };
                        img.src = evt.target.result;
                    };
                    reader.readAsDataURL(blob);
                    break; // Only handle the first image
                }
            }

            if (!imageFound) {
                FeedbackManager.show('No image found in clipboard');
            }
        });

        // Drawing mode toggle button
        document.getElementById('toggleDrawingMode').addEventListener('click', () => {
            drawingMode = !drawingMode;
            const button = document.getElementById('toggleDrawingMode');
            button.classList.toggle('drawing-active');

            if (drawingMode) {
                button.textContent = 'Exit Drawing Mode';
                // Initialize drawing mode with callback for when polygon is created
                drawingModeHandlers = PolygonManager.initDrawingMode(
                    stage,
                    polygonLayer,
                    () => drawingMode,
                    (newPolygon) => {
                        selectedGroup = newPolygon;
                        // Guard against duplicate callback (initDrawingMode fires twice)
                        if (!newPolygon._undoPushed) {
                            newPolygon._undoPushed = true;
                            UndoManager.push({
                                undo: () => {
                                    newPolygon.remove();
                                    dirtyPolygons.delete(newPolygon._id);
                                    if (selectedGroup === newPolygon) selectedGroup = null;
                                    polygonLayer.batchDraw();
                                },
                                redo: () => {
                                    polygonLayer.add(newPolygon);
                                    dirtyPolygons.add(newPolygon._id);
                                    selectedGroup = newPolygon;
                                    polygonLayer.batchDraw();
                                }
                            });
                        }
                    },
                    dirtyPolygons
                );
            } else {
                button.textContent = 'Drawing Mode';
                cancelDrawing();
            }
        });

        // Cancel drawing function
        const cancelDrawing = () => {
            if (drawingModeHandlers) {
                drawingModeHandlers.clearTempElements();
                drawingModeHandlers.removeEventListeners();
                drawingModeHandlers = null;
                drawingMode = false;
            }
        };

        // ESC key handler for canceling drawing
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && drawingMode) {
                cancelDrawing();
                document.getElementById('toggleDrawingMode').textContent = 'Drawing Mode';
                drawingMode = false;
            }

            if (e.key === 'Delete' || e.key === 'Backspace') {
                deleteSelectedObjects();
            }
        });

        // Extract All button
        document.getElementById('extractAllLeft').addEventListener('click', () => {
            polygonLayer.find('.group').forEach(async group => {
                if (!dirtyPolygons.has(group._id)) return; // skip unchanged polygons

                const overlappingImgs = PolygonManager.getUnderlyingImages(group, stage);
                if (!overlappingImgs.length) return;

                const topmostImage = overlappingImgs[0];
                const textureData = ImageProcessing.extractTexture(group, topmostImage);

                if (textureData && window.rightPanel) {
                    window.rightPanel.updateTexture(group._id, textureData);
                }
            });

            // Clear dirty set after extraction
            dirtyPolygons.clear();
        });

        // Upload handler
        document.getElementById(uploadId).addEventListener('change', e => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = evt => {
                const img = new Image();
                img.onload = () => {
                    addBackgroundImage(img);
                };
                img.src = evt.target.result;
            };
            reader.readAsDataURL(file);
        });

        // Initialize drag and drop
        const dragDropHandler = DragDropManager.init(
            container,
            (files) => {
                let loaded = 0;
                const total = files.length;
                UndoManager.beginBatch();
                files.forEach(file => {
                    const reader = new FileReader();
                    reader.onload = evt => {
                        const img = new Image();
                        img.onload = () => {
                            addBackgroundImage(img);
                            loaded++;
                            if (loaded === total) {
                                UndoManager.endBatch();
                                FeedbackManager.show(`${total} image(s) dropped`);
                            }
                        };
                        img.src = evt.target.result;
                    };
                    reader.readAsDataURL(file);
                });
            },
            {
                showOverlay: true,
                overlayId: 'leftPanelDropOverlay'
            }
        );

        // Add polygon button
        document.getElementById(addBtnId).addEventListener('click', () => {
            const newGroup = PolygonManager.createPolygonGroup(stage, polygonLayer, null, dirtyPolygons);
            setSelectedPolygon(newGroup);
            UndoManager.push({
                undo: () => {
                    newGroup.remove();
                    dirtyPolygons.delete(newGroup._id);
                    if (selectedGroup === newGroup) selectedGroup = null;
                    polygonLayer.batchDraw();
                },
                redo: () => {
                    polygonLayer.add(newGroup);
                    dirtyPolygons.add(newGroup._id);
                    setSelectedPolygon(newGroup);
                    polygonLayer.batchDraw();
                }
            });
        });

        // Delete button
        document.getElementById(deleteBtnId).addEventListener('click', () => {
            deleteSelectedObjects();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && drawingMode) {
                cancelDrawing();
                document.getElementById('toggleDrawingMode').textContent = 'Drawing Mode';
                drawingMode = false;
            }

            if (e.key === 'Delete' || e.key === 'Backspace') {
                deleteSelectedObjects();
            }
        });

        function setSelectedPolygon(group) {
            // Clear previous selection
            if (selectedGroup && selectedGroup !== group) {
                const prevPolygon = selectedGroup.findOne('.polygon');
                if (prevPolygon) {
                    prevPolygon.stroke(CONFIG.POLYGON.STROKE);
                    prevPolygon.strokeWidth(CONFIG.POLYGON.STROKE_WIDTH);
                }
            }

            // Clear image selection
            tr.nodes([]);

            // Set new selection
            selectedGroup = group;
            if (selectedGroup) {
                const polygon = selectedGroup.findOne('.polygon');
                if (polygon) {
                    polygon.stroke(CONFIG.POLYGON.SELECTED_STROKE);
                    polygon.strokeWidth(CONFIG.POLYGON.SELECTED_STROKE_WIDTH);
                }
            }

            polygonLayer.draw();
        }

        // Helper function for deleting selected objects (with undo)
        function deleteSelectedObjects() {
            // Case 1: polygon selected
            if (selectedGroup) {
                const groupToDelete = selectedGroup;
                const groupId = groupToDelete._id;
                let detachedTexture = null;
                if (window.rightPanel && window.rightPanel.detachTexture) {
                    detachedTexture = window.rightPanel.detachTexture(groupId);
                }
                groupToDelete.remove();
                dirtyPolygons.delete(groupId);
                selectedGroup = null;
                polygonLayer.draw();

                UndoManager.push({
                    undo: () => {
                        polygonLayer.add(groupToDelete);
                        dirtyPolygons.add(groupId);
                        if (detachedTexture && window.rightPanel) {
                            window.rightPanel.restoreTexture(groupId, detachedTexture);
                        }
                        polygonLayer.batchDraw();
                    },
                    redo: () => {
                        groupToDelete.remove();
                        dirtyPolygons.delete(groupId);
                        if (detachedTexture && window.rightPanel) {
                            window.rightPanel.detachTexture(groupId);
                        }
                        selectedGroup = null;
                        polygonLayer.batchDraw();
                    }
                });
                return;
            }

            // Case 2: background image selected with transformer
            const selectedNodes = tr.nodes();
            if (selectedNodes.length > 0) {
                const imagesToDelete = selectedNodes.filter(node => node instanceof Konva.Image);
                if (imagesToDelete.length === 0) return;

                imagesToDelete.forEach(node => {
                    node.remove();
                    const index = bgImages.indexOf(node);
                    if (index > -1) bgImages.splice(index, 1);
                });
                tr.nodes([]);
                bgLayer.draw();

                UndoManager.push({
                    undo: () => {
                        imagesToDelete.forEach(node => {
                            bgLayer.add(node);
                            bgImages.push(node);
                        });
                        tr.nodes([]);
                        bgLayer.batchDraw();
                    },
                    redo: () => {
                        imagesToDelete.forEach(node => {
                            node.remove();
                            const index = bgImages.indexOf(node);
                            if (index > -1) bgImages.splice(index, 1);
                        });
                        tr.nodes([]);
                        bgLayer.batchDraw();
                    }
                });
            }
        }

        // Transformer for background images only
        const tr = new Konva.Transformer({
            keepRatio: true,
            rotateEnabled: false,
            enabledAnchors: [
                'top-left','top-right',
                'bottom-left','bottom-right'
            ]
        });
        uiLayer.add(tr);

        // Image drag — linked rects + undo (stage-level events)
        let imgDragStartPos = null;
        let imgDragLastPos = null;
        let imgLinkedGroups = [];
        let imgLinkedGroupStartPositions = [];

        stage.on('dragstart', (e) => {
            if (!(e.target instanceof Konva.Image)) return;
            const img = e.target;
            imgDragStartPos = { x: img.x(), y: img.y() };
            imgDragLastPos = { x: img.x(), y: img.y() };
            if (linkRectsToImages) {
                imgLinkedGroups = getOverlappingGroups(img);
                imgLinkedGroupStartPositions = imgLinkedGroups.map(g => ({
                    group: g, x: g.x(), y: g.y()
                }));
            } else {
                imgLinkedGroups = [];
                imgLinkedGroupStartPositions = [];
            }
        });

        stage.on('dragmove', (e) => {
            if (!(e.target instanceof Konva.Image)) return;
            if (!linkRectsToImages || imgLinkedGroups.length === 0 || !imgDragLastPos) return;
            const img = e.target;
            const dx = img.x() - imgDragLastPos.x;
            const dy = img.y() - imgDragLastPos.y;
            imgLinkedGroups.forEach(group => {
                group.x(group.x() + dx);
                group.y(group.y() + dy);
            });
            imgDragLastPos = { x: img.x(), y: img.y() };
            polygonLayer.batchDraw();
        });

        stage.on('dragend', (e) => {
            if (!(e.target instanceof Konva.Image) || !imgDragStartPos) return;
            const img = e.target;
            const start = { ...imgDragStartPos };
            const end = { x: img.x(), y: img.y() };
            const groupsBefore = imgLinkedGroupStartPositions.map(s => ({ ...s }));
            const groupsAfter = imgLinkedGroups.map(g => ({ group: g, x: g.x(), y: g.y() }));
            imgDragStartPos = null;
            imgDragLastPos = null;
            imgLinkedGroups = [];
            imgLinkedGroupStartPositions = [];
            if (start.x === end.x && start.y === end.y) return;
            UndoManager.push({
                undo: () => {
                    img.position(start);
                    groupsBefore.forEach(s => s.group.position({ x: s.x, y: s.y }));
                    tr.forceUpdate();
                    stage.batchDraw();
                },
                redo: () => {
                    img.position(end);
                    groupsAfter.forEach(s => s.group.position({ x: s.x, y: s.y }));
                    tr.forceUpdate();
                    stage.batchDraw();
                }
            });
        });

        // Transformer undo/redo for background images
        let trStartState = null;
        tr.on('transformstart', () => {
            const nodes = tr.nodes();
            trStartState = nodes.map(node => ({
                node, x: node.x(), y: node.y(),
                scaleX: node.scaleX(), scaleY: node.scaleY(),
                rotation: node.rotation(),
                width: node.width(), height: node.height()
            }));
        });
        tr.on('transformend', () => {
            if (!trStartState) return;
            const beforeStates = trStartState;
            const afterStates = beforeStates.map(s => ({
                node: s.node, x: s.node.x(), y: s.node.y(),
                scaleX: s.node.scaleX(), scaleY: s.node.scaleY(),
                rotation: s.node.rotation(),
                width: s.node.width(), height: s.node.height()
            }));
            trStartState = null;
            UndoManager.push({
                undo: () => {
                    beforeStates.forEach(s => {
                        s.node.position({ x: s.x, y: s.y });
                        s.node.scale({ x: s.scaleX, y: s.scaleY });
                        s.node.rotation(s.rotation);
                        s.node.size({ width: s.width, height: s.height });
                    });
                    tr.forceUpdate();
                    stage.batchDraw();
                },
                redo: () => {
                    afterStates.forEach(s => {
                        s.node.position({ x: s.x, y: s.y });
                        s.node.scale({ x: s.scaleX, y: s.scaleY });
                        s.node.rotation(s.rotation);
                        s.node.size({ width: s.width, height: s.height });
                    });
                    tr.forceUpdate();
                    stage.batchDraw();
                }
            });
        });

        // Click to select background image or polygon
        stage.on('click', (e) => {
            // Don't process clicks if we're in drawing mode
            if (drawingMode) return;

            // Reset previous selection visual for polygons
            if (selectedGroup) {
                const polygon = selectedGroup.findOne('.polygon');
                if (polygon) {
                    polygon.stroke(CONFIG.POLYGON.STROKE);
                    polygon.strokeWidth(CONFIG.POLYGON.STROKE_WIDTH);
                }
            }

            // Reset selection
            let selectedImage = null;
            selectedGroup = null;
            tr.nodes([]);

            // Check what was clicked
            const clickedNode = e.target;

            // Handle polygon selection
            if (clickedNode instanceof Konva.Group && clickedNode.name() === 'group') {
                setSelectedPolygon(clickedNode);
            }
            // Handle polygon parts (vertices, midpoints, edges, drag surface)
            else if (clickedNode.getParent() instanceof Konva.Group && clickedNode.getParent().name() === 'group') {
                setSelectedPolygon(clickedNode.getParent());
            }
            // Handle background image selection (only if not locked)
            else if (clickedNode instanceof Konva.Image && !imagesLocked) {
                selectedImage = clickedNode;
                tr.nodes([selectedImage]);
            }
            // Click on empty space: clear all selection
            else if (clickedNode === stage || clickedNode.name() === 'bgRect') {
                tr.nodes([]);
                selectedGroup = null;
            }

            bgLayer.batchDraw();
            polygonLayer.batchDraw();
        });

        // Keyboard handlers for transformer
        stage.on('keydown', (e) => {
            if (e.key === 'Shift') tr.keepRatio(true);
        });

        stage.on('keyup', (e) => {
            if (e.key === 'Shift') tr.keepRatio(false);
        });

        // Initialize panning, zooming, and trackpad gestures
        PanZoomManager.initAll(stage);

        // Scale polygon UI elements inversely with zoom so they stay visible
        function updatePolygonScaling() {
            const zoom = stage.scaleX();
            const inv = 1 / zoom;

            polygonLayer.find('.group').forEach(group => {
                // Vertices (squares)
                group.find('.vertex').forEach(v => {
                    const r = CONFIG.VERTEX.RADIUS * inv;
                    v.width(r * 2);
                    v.height(r * 2);
                    v.offsetX(r);
                    v.offsetY(r);
                    v.strokeWidth(CONFIG.VERTEX.STROKE_WIDTH * inv);
                });

                // Vertex labels
                group.find('.vertex-label').forEach(l => {
                    l.fontSize(7 * inv);
                    l.offsetY(10 * inv);
                    l.offsetX(CONFIG.VERTEX.RADIUS * inv);
                });

                // Midpoints (circles)
                group.find('.midpoint').forEach(m => {
                    m.radius(CONFIG.MIDPOINT.RADIUS * inv);
                    m.strokeWidth(CONFIG.MIDPOINT.STROKE_WIDTH * inv);
                });

                // Edge handles (diamonds)
                group.find('.reference').forEach(r => {
                    const rad = CONFIG.MIDPOINT.REFERENCE.RADIUS * inv;
                    r.width(rad * 2);
                    r.height(rad * 2);
                    r.offsetX(rad);
                    r.offsetY(rad);
                    r.strokeWidth(CONFIG.MIDPOINT.REFERENCE.STROKE_WIDTH * inv);
                });

                // Polygon edges
                group.find('.polygon').forEach(p => {
                    p.strokeWidth(CONFIG.POLYGON.STROKE_WIDTH * inv);
                    p.dash([5 * inv, 5 * inv]);
                });
            });

            // Grid lines
            polygonLayer.find('.grid').forEach(l => {
                l.strokeWidth(CONFIG.GRID.STROKE_WIDTH * inv);
                l.dash([5 * inv, 5 * inv]);
            });

            polygonLayer.batchDraw();
        }

        stage.on('scaleXChange', updatePolygonScaling);

        window.leftPanel = {
            getState: () => {
                const images = bgImages.map(img => ({
                    dataURL: SaveManager.imageToDataURL(img, 'image/jpeg', 0.92),
                    x: img.x(), y: img.y(),
                    width: img.width(), height: img.height(),
                    scaleX: img.scaleX(), scaleY: img.scaleY(),
                    rotation: img.rotation()
                }));

                const polygons = [];
                polygonLayer.find('.group').forEach(group => {
                    polygons.push({
                        id: group._id,
                        x: group.x(), y: group.y(),
                        vertices: group.vertices.map(v => ({ x: v.x, y: v.y })),
                        midpoints: group.midpoints.map(m => ({ x: m.x, y: m.y, locked: m.locked }))
                    });
                });

                return { images, polygons };
            },

            loadState: (state) => {
                bgImages.forEach(img => img.destroy());
                bgImages.length = 0;
                polygonLayer.find('.group').forEach(g => g.destroy());
                bgLayer.batchDraw();
                polygonLayer.batchDraw();

                if (state.images) {
                    state.images.forEach(imgData => {
                        const img = new Image();
                        img.onload = () => {
                            const konvaImg = new Konva.Image({
                                x: imgData.x, y: imgData.y,
                                image: img,
                                width: imgData.width, height: imgData.height,
                                scaleX: imgData.scaleX || 1, scaleY: imgData.scaleY || 1,
                                rotation: imgData.rotation || 0,
                                draggable: !imagesLocked
                            });
                            bgLayer.add(konvaImg);
                            bgImages.push(konvaImg);
                            bgLayer.batchDraw();
                        };
                        img.src = imgData.dataURL;
                    });
                }

                if (state.polygons) {
                    state.polygons.forEach(polyData => {
                        const group = PolygonManager.createPolygonGroup(
                            stage, polygonLayer, polyData.vertices, dirtyPolygons, true
                        );
                        group.position({ x: polyData.x || 0, y: polyData.y || 0 });
                        if (polyData.midpoints) {
                            polyData.midpoints.forEach((m, i) => {
                                if (group.midpoints[i]) {
                                    group.midpoints[i].x = m.x;
                                    group.midpoints[i].y = m.y;
                                    group.midpoints[i].locked = m.locked || false;
                                }
                            });
                            group.find('.midpoint').forEach((mp, i) => {
                                if (group.midpoints[i]) mp.position({ x: group.midpoints[i].x, y: group.midpoints[i].y });
                            });
                            PolygonManager.drawCurvedPolygon(group, group.vertices, group.midpoints);
                            GridManager.drawGrid(group, group.vertices, group.midpoints);
                            const pts = PolygonManager.computeDragSurfacePoints(group.vertices, group.midpoints);
                            PolygonManager.updateDragSurface(group, pts);
                        }
                        if (polyData.id) group._id = polyData.id;
                        dirtyPolygons.add(group._id);
                    });
                    polygonLayer.batchDraw();
                }
            },

            autoPackImages: () => {
                if (bgImages.length === 0) return;

                // Snapshot before state for undo
                const beforeImgPositions = bgImages.map(img => ({ img, x: img.x(), y: img.y() }));
                const beforeGroupPositions = [];
                const beforeStage = { scale: stage.scaleX(), x: stage.x(), y: stage.y() };

                // If linked rects, snapshot group positions and find associations
                const linkedGroupMoves = [];
                if (linkRectsToImages) {
                    bgImages.forEach((img, imgIdx) => {
                        const groups = getOverlappingGroups(img);
                        console.log(
                            `[autopack] img ${imgIdx}: pos=(${img.x().toFixed(0)}, ${img.y().toFixed(0)}),` +
                            ` size=${(img.width() * img.scaleX()).toFixed(0)}x${(img.height() * img.scaleY()).toFixed(0)},` +
                            ` linked groups: ${groups.length > 0 ? groups.map(g => g._id).join(', ') : 'none'}`
                        );
                        groups.forEach(group => {
                            linkedGroupMoves.push({
                                group, img,
                                beforeX: group.x(), beforeY: group.y()
                            });
                        });
                    });
                    console.log(`[autopack] total linked moves: ${linkedGroupMoves.length}`);
                }

                const padding = 10;
                const getDims = (img) => ({
                    width: img.width() * Math.abs(img.scaleX()),
                    height: img.height() * Math.abs(img.scaleY())
                });

                const sorted = [...bgImages].sort((a, b) => getDims(b).height - getDims(a).height);

                let totalArea = 0;
                sorted.forEach(img => { const d = getDims(img); totalArea += d.width * d.height; });
                const targetRowWidth = Math.max(stage.width(), Math.sqrt(totalArea) * 1.4);

                let cursorX = 0, cursorY = 0, rowHeight = 0;
                sorted.forEach(img => {
                    const { width, height } = getDims(img);
                    if (cursorX > 0 && cursorX + width > targetRowWidth) {
                        cursorX = 0; cursorY += rowHeight + padding; rowHeight = 0;
                    }
                    const oldX = img.x(), oldY = img.y();
                    img.position({ x: cursorX, y: cursorY });
                    const dx = cursorX - oldX, dy = cursorY - oldY;

                    // Move linked rects with their image
                    if (linkRectsToImages) {
                        linkedGroupMoves.forEach(entry => {
                            if (entry.img === img) {
                                entry.group.x(entry.group.x() + dx);
                                entry.group.y(entry.group.y() + dy);
                            }
                        });
                    }

                    cursorX += width + padding;
                    rowHeight = Math.max(rowHeight, height);
                });

                // Snapshot after state for linked groups
                if (linkRectsToImages) {
                    linkedGroupMoves.forEach(entry => {
                        entry.afterX = entry.group.x();
                        entry.afterY = entry.group.y();
                    });
                }

                tr.nodes([]);
                const scale = Math.min(
                    stage.width() / (targetRowWidth + padding * 2),
                    stage.height() / (cursorY + rowHeight + padding * 2),
                    1
                );
                stage.scale({ x: scale, y: scale });
                stage.position({ x: padding * scale, y: padding * scale });

                const afterStage = { scale: stage.scaleX(), x: stage.x(), y: stage.y() };
                const afterImgPositions = bgImages.map(img => ({ img, x: img.x(), y: img.y() }));

                // Push undo
                UndoManager.push({
                    undo: () => {
                        beforeImgPositions.forEach(s => s.img.position({ x: s.x, y: s.y }));
                        linkedGroupMoves.forEach(s => s.group.position({ x: s.beforeX, y: s.beforeY }));
                        stage.scale({ x: beforeStage.scale, y: beforeStage.scale });
                        stage.position({ x: beforeStage.x, y: beforeStage.y });
                        tr.nodes([]);
                        bgLayer.batchDraw();
                        polygonLayer.batchDraw();
                    },
                    redo: () => {
                        afterImgPositions.forEach(s => s.img.position({ x: s.x, y: s.y }));
                        linkedGroupMoves.forEach(s => s.group.position({ x: s.afterX, y: s.afterY }));
                        stage.scale({ x: afterStage.scale, y: afterStage.scale });
                        stage.position({ x: afterStage.x, y: afterStage.y });
                        tr.nodes([]);
                        bgLayer.batchDraw();
                        polygonLayer.batchDraw();
                    }
                });

                bgLayer.batchDraw();
                polygonLayer.batchDraw();
                FeedbackManager.show('Arranged ' + bgImages.length + ' image(s)');
            }
        };

        return stage;
    }
};
