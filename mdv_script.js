class MarkdownViewer {
    constructor() {
        this.files = JSON.parse(localStorage.getItem('markdownFiles')) || {};
        this.currentFileId = null;
        this.viewMode = 'edit'; // 'edit', 'preview', 'split'

        this.initializeElements();
        this.setupEventListeners();
        this.setupMarkedOptions();
        this.renderFileList();
        this.updateStatus('Ready');
    }

    initializeElements() {
        this.elements = {
            markdownInput: document.getElementById('markdownInput'),
            preview: document.getElementById('preview'),
            fileList: document.getElementById('fileList'),
            currentFileName: document.getElementById('currentFileName'),
            currentFileId: document.getElementById('currentFileId'),
            fileNameInput: document.getElementById('fileNameInput'),
            statusText: document.getElementById('statusText'),
            wordCount: document.getElementById('wordCount'),
            editor: document.getElementById('editor'),
            editModeBtn: document.getElementById('editModeBtn'),
            previewModeBtn: document.getElementById('previewModeBtn'),
            splitModeBtn: document.getElementById('splitModeBtn'),
            loadFileInput: document.getElementById('loadFileInput')
        };
    }

    setupEventListeners() {
        // File operations
        document.getElementById('newFileBtn').addEventListener('click', () => this.createNewFile());
        document.getElementById('createFileBtn').addEventListener('click', () => this.createNamedFile());
        document.getElementById('saveFileBtn').addEventListener('click', () => this.saveCurrentFile());
        document.getElementById('loadFileBtn').addEventListener('click', () => this.elements.loadFileInput.click());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportToHTML());
        this.elements.loadFileInput.addEventListener('change', (e) => this.loadFile(e));

        // View modes
        this.elements.editModeBtn.addEventListener('click', () => this.setViewMode('edit'));
        this.elements.previewModeBtn.addEventListener('click', () => this.setViewMode('preview'));
        this.elements.splitModeBtn.addEventListener('click', () => this.setViewMode('split'));

        // Editor input
        this.elements.markdownInput.addEventListener('input', () => {
            this.updatePreview();
            this.updateWordCount();
            this.autoSave();
        });

        // File name input
        this.elements.fileNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.createNamedFile();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 's':
                        e.preventDefault();
                        this.saveCurrentFile();
                        break;
                    case 'n':
                        e.preventDefault();
                        this.createNewFile();
                        break;
                    case '1':
                        e.preventDefault();
                        this.setViewMode('edit');
                        break;
                    case '2':
                        e.preventDefault();
                        this.setViewMode('preview');
                        break;
                    case '3':
                        e.preventDefault();
                        this.setViewMode('split');
                        break;
                }
            }
        });
    }

    setupMarkedOptions() {
        marked.setOptions({
            highlight: function(code, lang) {
                if (lang && hljs.getLanguage(lang)) {
                    return hljs.highlight(code, { language: lang }).value;
                }
                return hljs.highlightAuto(code).value;
            },
            breaks: true,
            gfm: true
        });
    }

    generateUniqueId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    createNewFile() {
        const id = this.generateUniqueId();
        const name = `Untitled-${id.slice(-6)}`;

        this.files[id] = {
            name: name,
            content: `# ${name}\n\nStart writing your markdown here...`,
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        };

        this.saveFiles();
        this.renderFileList();
        this.openFile(id);
        this.updateStatus(`Created new file: ${name}`);
    }

    createNamedFile() {
        const name = this.elements.fileNameInput.value.trim();
        if (!name) {
            alert('Please enter a file name');
            return;
        }

        const id = this.generateUniqueId();
        this.files[id] = {
            name: name,
            content: `# ${name}\n\n`,
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        };

        this.elements.fileNameInput.value = '';
        this.saveFiles();
        this.renderFileList();
        this.openFile(id);
        this.updateStatus(`Created file: ${name}`);
    }

    openFile(id) {
    if (!this.files[id]) return;

    this.currentFileId = id;
    const file = this.files[id];

    this.elements.currentFileName.textContent = file.name;
    this.elements.currentFileId.textContent = `ID: ${id}`;
    this.elements.markdownInput.value = file.content;

    this.updatePreview(); // This should already be here
    this.updateWordCount();
    this.renderFileList();
    this.updateStatus(`Opened: ${file.name}`);

    // Force update preview if in preview or split mode
    if (this.viewMode === 'preview' || this.viewMode === 'split') {
        setTimeout(() => this.updatePreview(), 100);
    }
  }


    saveCurrentFile() {
        if (!this.currentFileId) {
            this.updateStatus('No file to save');
            return;
        }

        const content = this.elements.markdownInput.value;
        this.files[this.currentFileId].content = content;
        this.files[this.currentFileId].modified = new Date().toISOString();

        this.saveFiles();
        this.updateStatus('File saved');
    }

    autoSave() {
        if (this.currentFileId) {
            clearTimeout(this.autoSaveTimeout);
            this.autoSaveTimeout = setTimeout(() => {
                this.saveCurrentFile();
            }, 2000);
        }
    }

    deleteFile(id) {
        if (confirm('Are you sure you want to delete this file?')) {
            delete this.files[id];
            this.saveFiles();
            this.renderFileList();

            if (this.currentFileId === id) {
                this.currentFileId = null;
                this.elements.currentFileName.textContent = 'No file selected';
                this.elements.currentFileId.textContent = '';
                this.elements.markdownInput.value = '';
                this.updatePreview();
            }

            this.updateStatus('File deleted');
        }
    }

    loadFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const id = this.generateUniqueId();
            const name = file.name.replace(/\.[^/.]+$/, ""); // Remove extension

            this.files[id] = {
                name: name,
                content: e.target.result,
                created: new Date().toISOString(),
                modified: new Date().toISOString()
            };

            this.saveFiles();
            this.renderFileList();
            this.openFile(id);
            this.updateStatus(`Loaded: ${name}`);
        };

        reader.readAsText(file);
    }

    exportToHTML() {
        if (!this.currentFileId) {
            alert('No file to export');
            return;
        }

        const file = this.files[this.currentFileId];
        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>${file.name}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
               max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; }
        code { background: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
        pre { background: #f4f4f4; padding: 1rem; border-radius: 4px; overflow-x: auto; }
        blockquote { border-left: 4px solid #ddd; padding-left: 1rem; color: #666; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
${this.processReferences(marked(file.content))}
</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${file.name}.html`;
        a.click();
        URL.revokeObjectURL(url);

        this.updateStatus('Exported to HTML');
    }

    updatePreview() {
        if (!this.elements.markdownInput.value) {
            this.elements.preview.innerHTML = '<p style="color: #999;">Preview will appear here...</p>';
            return;
        }

        const content = this.elements.markdownInput.value;
        const html = marked(content);
        this.elements.preview.innerHTML = this.processReferences(html);
    }

    processReferences(html) {
        // Process reference links like [[file-id]] or [[file-id|display text]]
        return html.replace(/\[\[([^\]]+)\]\]/g, (match, content) => {
            const parts = content.split('|');
            const fileId = parts[0].trim();
            const displayText = parts[1] ? parts[1].trim() : this.getFileNameById(fileId) || fileId;

            if (this.files[fileId]) {
                return `<span class="reference-link" onclick="app.openFile('${fileId}')" title="Open ${this.files[fileId].name}">${displayText}</span>`;
            } else {
                return `<span style="color: red; text-decoration: line-through;" title="File not found">${displayText}</span>`;
            }
        });
    }

    getFileNameById(id) {
        return this.files[id] ? this.files[id].name : null;
    }

    setViewMode(mode) {
    this.viewMode = mode;

    // Update button states
    document.querySelectorAll('.btn-toggle').forEach(btn => btn.classList.remove('active'));

    // Reset styles
    this.elements.editor.style.flex = '';
    this.elements.preview.style.flex = '';

    switch(mode) {
        case 'edit':
            this.elements.editModeBtn.classList.add('active');
            this.elements.editor.classList.remove('hidden');
            this.elements.preview.classList.add('hidden');
            break;

        case 'preview':
            this.elements.previewModeBtn.classList.add('active');
            this.elements.editor.classList.add('hidden');
            this.elements.preview.classList.remove('hidden');
            this.updatePreview(); // Ensure preview is updated
            break;

        case 'split':
            this.elements.splitModeBtn.classList.add('active');
            this.elements.editor.classList.remove('hidden');
            this.elements.preview.classList.remove('hidden');
            this.elements.editor.style.flex = '1';
            this.elements.preview.style.flex = '1';
            this.updatePreview(); // Ensure preview is updated
            break;
    }
  }


    renderFileList() {
        const fileListEl = this.elements.fileList;
        fileListEl.innerHTML = '';

        Object.entries(this.files).forEach(([id, file]) => {
            const fileItem = document.createElement('div');
            fileItem.className = `file-item ${this.currentFileId === id ? 'active' : ''}`;

            fileItem.innerHTML = `
                <div>
                    <div style="font-weight: 500;">${file.name}</div>
                    <div class="file-id">ID: ${id}</div>
                </div>
                <button onclick="app.deleteFile('${id}')" style="background: #e74c3c; color: white; border: none; border-radius: 3px; padding: 2px 6px; font-size: 12px;">✕</button>
            `;

            fileItem.addEventListener('click', (e) => {
                if (e.target.tagName !== 'BUTTON') {
                    this.openFile(id);
                }
            });

            fileListEl.appendChild(fileItem);
        });
    }

    updateWordCount() {
        const text = this.elements.markdownInput.value;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        this.elements.wordCount.textContent = `Words: ${words}`;
    }

    updateStatus(message) {
        this.elements.statusText.textContent = message;
        setTimeout(() => {
            if (this.elements.statusText.textContent === message) {
                this.elements.statusText.textContent = 'Ready';
            }
        }, 3000);
    }

    saveFiles() {
        localStorage.setItem('markdownFiles', JSON.stringify(this.files));
    }
}

// Initialize the application
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new MarkdownViewer();
});
