// ==================== SAVE/LOAD MANAGER ====================
const SaveManager = {
    // Convert a Konva.Image to a data URL (preserving original resolution)
    imageToDataURL(konvaImg) {
        const canvas = document.createElement('canvas');
        const htmlImg = konvaImg.image();
        canvas.width = htmlImg.naturalWidth || htmlImg.width;
        canvas.height = htmlImg.naturalHeight || htmlImg.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(htmlImg, 0, 0);
        return canvas.toDataURL('image/png');
    },

    // Serialize full app state to JSON-ready object
    serialize(stageLeft, stageRight) {
        return {
            version: 1,
            atlas: {
                width: parseInt(document.getElementById('rightWidth').value),
                height: parseInt(document.getElementById('rightHeight').value),
                transparent: document.getElementById('exportTransparent').checked
            },
            leftPanel: window.leftPanel ? window.leftPanel.getState() : { images: [], polygons: [] },
            rightPanel: window.rightPanel && window.rightPanel.getState
                ? window.rightPanel.getState()
                : { textures: [] }
        };
    },

    // Save project to file
    save(stageLeft, stageRight) {
        const state = this.serialize(stageLeft, stageRight);
        const json = JSON.stringify(state);

        if (isElectron()) {
            const { ipcRenderer } = require('electron');
            ipcRenderer.invoke('save-project', json).then(saved => {
                if (saved) FeedbackManager.show('Project saved!');
            });
        } else {
            // Browser: trigger download
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'project.trp';
            a.click();
            URL.revokeObjectURL(url);
            FeedbackManager.show('Project saved!');
        }
    },

    // Load project from file
    load(stageLeft, stageRight) {
        const self = this;

        function handleData(json) {
            try {
                const state = JSON.parse(json);
                self.deserialize(state, stageLeft, stageRight);
            } catch (e) {
                FeedbackManager.show('Failed to load project');
                console.error('Load error:', e);
            }
        }

        if (isElectron()) {
            const { ipcRenderer } = require('electron');
            ipcRenderer.invoke('open-project').then(data => {
                if (data) handleData(data);
            });
        } else {
            // Browser: file input dialog
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.trp,.json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (evt) => handleData(evt.target.result);
                reader.readAsText(file);
            };
            input.click();
        }
    },

    // Deserialize and restore full app state
    deserialize(state, stageLeft, stageRight) {
        if (state.version !== 1) {
            FeedbackManager.show('Unsupported project file version');
            return;
        }

        // Restore atlas settings
        document.getElementById('rightWidth').value = state.atlas.width;
        document.getElementById('rightHeight').value = state.atlas.height;
        document.getElementById('exportTransparent').checked = state.atlas.transparent;

        // Resize right panel background
        stageRight.bgRect.width(state.atlas.width);
        stageRight.bgRect.height(state.atlas.height);
        RightPanelManager.toggleTransparency(stageRight, state.atlas.transparent);

        // Restore left panel
        if (window.leftPanel && window.leftPanel.loadState) {
            window.leftPanel.loadState(state.leftPanel);
        }

        // Restore right panel
        if (window.rightPanel && window.rightPanel.loadState) {
            window.rightPanel.loadState(state.rightPanel);
        }

        FeedbackManager.show('Project loaded!');
    }
};
