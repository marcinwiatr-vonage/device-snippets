class SnippetManager {
    constructor() {
        this.snippets = [];
        this.currentCategory = 'all';
        this.currentView = 'grid';
        this.editingSnippetId = null;
        this.apiBaseUrl = 'http://localhost:3000/api';

        this.initializeEventListeners();
        this.fetchSnippets();
    }

    async fetchSnippets() {
        try {
            const res = await fetch('snippets-data.json');
            const data = await res.json();
            this.snippets = data.snippets || [];
            this.renderCategories();
            this.populateCategoryDatalist();
            this.renderSnippets();
        } catch (e) {
            console.error(e);
            this.renderCategories(); // render defaults even on error
            this.showToast('Failed to load snippets', 'error');
        }
    }

    renderCategories() {
        const container = document.getElementById('navButtons');
        if (!container) return;
        const categories = Array.from(new Set(this.snippets.map(s => s.category))).sort();
        const buttons = [
            { key: 'all', label: 'All', icon: 'fas fa-th' },
            ...(categories.length ? categories.map(c => ({ key: c, label: c.charAt(0).toUpperCase() + c.slice(1), icon: 'fas fa-tag' })) : [
                { key: 'polycom', label: 'Polycom', icon: 'fas fa-phone' },
                { key: 'yealink', label: 'Yealink', icon: 'fas fa-phone-alt' },
                { key: 'cisco', label: 'Cisco', icon: 'fas fa-network-wired' },
                { key: 'grandstream', label: 'Grandstream', icon: 'fas fa-phone-square' },
                { key: 'algo', label: 'Algo', icon: 'fas fa-broadcast-tower' },
            ])
        ];
        container.innerHTML = buttons.map(b => `
            <button class="nav-btn${b.key === this.currentCategory ? ' active' : ''}" data-category="${b.key}">
                <i class="${b.icon}"></i> ${b.label}
            </button>
        `).join('');
        container.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setActiveCategory(e.currentTarget.dataset.category);
            });
        });

        // Add Device button handler
        const addCategoryBtn = document.getElementById('addCategoryBtn');
        if (addCategoryBtn) {
            addCategoryBtn.onclick = () => {
                const name = prompt('Enter new device category name:');
                if (!name) return;
                const category = name.trim().toLowerCase();
                // Open modal to add a first snippet under this category
                const modalData = { title: '', category, description: '', code: '', tags: [], notes: '' };
                this.openModal(modalData);
            };
        }
    }

    populateCategoryDatalist() {
        const datalist = document.getElementById('categorySuggestions');
        if (!datalist) return;
        const categories = Array.from(new Set(this.snippets.map(s => s.category))).sort();
        const defaults = ['polycom','yealink','cisco','grandstream','algo'];
        const all = Array.from(new Set([...defaults, ...categories]));
        datalist.innerHTML = all.map(c => `<option value="${c}"></option>`).join('');
    }

    initializeEventListeners() {
        // Navigation buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setActiveCategory(e.target.dataset.category);
            });
        });

        // Search functionality
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filterSnippets(e.target.value);
        });

        // View toggle buttons
        document.getElementById('gridViewBtn').addEventListener('click', () => {
            this.setView('grid');
        });

        document.getElementById('listViewBtn').addEventListener('click', () => {
            this.setView('list');
        });

        // Modal controls
        document.getElementById('addSnippetBtn').addEventListener('click', () => {
            this.openModal();
        });

        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.closeModal();
        });

        // Form submission
        document.getElementById('snippetForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSnippet();
        });

        // Close modal when clicking outside
        document.getElementById('snippetModal').addEventListener('click', (e) => {
            if (e.target.id === 'snippetModal') {
                this.closeModal();
            }
        });
    }

    addSnippetEventListeners() {
        // Copy buttons
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.closest('.copy-btn').dataset.id, 10);
                this.copySnippet(id);
            });
        });

        // Edit buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.closest('.edit-btn').dataset.id, 10);
                this.editSnippet(id);
            });
        });

        // Delete buttons
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.closest('.delete-btn').dataset.id, 10);
                this.deleteSnippet(id);
            });
        });
    }

    copySnippet(snippetId) {
        const snippet = this.snippets.find(s => s.id === snippetId);
        if (snippet) {
            navigator.clipboard.writeText(snippet.code).then(() => {
                this.showToast('Code copied to clipboard!', 'success');
            }).catch(() => {
                this.showToast('Failed to copy code', 'error');
            });
        }
    }

    editSnippet(snippetId) {
        const snippet = this.snippets.find(s => s.id === snippetId);
        if (snippet) {
            this.editingSnippetId = snippetId;
            this.openModal(snippet);
        }
    }

    async deleteSnippet(snippetId) {
        alert('This is a read-only version. To request changes, use the "Request New Snippet" button.');
    }

    openModal(snippet = null) {
        const modal = document.getElementById('snippetModal');
        const form = document.getElementById('snippetForm');
        const title = document.getElementById('modalTitle');

        if (snippet) {
            title.textContent = 'Edit Snippet';
            document.getElementById('snippetTitle').value = snippet.title;
            document.getElementById('snippetCategory').value = snippet.category;
            document.getElementById('snippetDescription').value = snippet.description || '';
            document.getElementById('snippetCode').value = snippet.code;
            document.getElementById('snippetTags').value = snippet.tags.join(', ');
            document.getElementById('snippetNotes').value = snippet.notes || '';
        } else {
            title.textContent = 'Add New Snippet';
            form.reset();
            this.editingSnippetId = null;
        }

        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        const modal = document.getElementById('snippetModal');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        this.editingSnippetId = null;
    }

    async saveSnippet() {
        alert('This is a read-only version. To request new snippets or changes, use the "Request New Snippet" button.');
        this.closeModal();
    }

    setActiveCategory(category) {
        this.currentCategory = category;
        this.renderCategories();
        
        // Update nav button states
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });

        this.renderSnippets();
    }

    setView(view) {
        this.currentView = view;
        
        // Update view button states
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.getElementById(view + 'ViewBtn').classList.add('active');
        
        // Update container class
        const container = document.getElementById('snippetsContainer');
        container.className = `snippets-container ${view}-view`;
    }

    filterSnippets(searchTerm) {
        const filteredSnippets = this.getFilteredSnippets().filter(snippet => {
            const searchLower = searchTerm.toLowerCase();
            return snippet.title.toLowerCase().includes(searchLower) ||
                   snippet.description.toLowerCase().includes(searchLower) ||
                   snippet.code.toLowerCase().includes(searchLower) ||
                   (snippet.notes && snippet.notes.toLowerCase().includes(searchLower)) ||
                   snippet.tags.some(tag => tag.toLowerCase().includes(searchLower));
        });

        this.renderSnippetsList(filteredSnippets);
    }

    getFilteredSnippets() {
        if (this.currentCategory === 'all') {
            return this.snippets;
        }
        return this.snippets.filter(snippet => snippet.category === this.currentCategory);
    }

    renderSnippets() {
        const filteredSnippets = this.getFilteredSnippets();
        this.renderSnippetsList(filteredSnippets);
    }

    renderSnippetsList(snippets) {
        const container = document.getElementById('snippetsContainer');
        
        if (snippets.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-code"></i>
                    <h3>No snippets found</h3>
                    <p>Start by adding your first code snippet!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = snippets.map(snippet => this.createSnippetHTML(snippet)).join('');
        
        // Re-highlight code blocks
        if (window.Prism) {
            Prism.highlightAll();
        }

        // Add event listeners to snippet buttons
        this.addSnippetEventListeners();
    }

    createSnippetHTML(snippet) {
        const tagsHTML = snippet.tags.map(tag => 
            `<span class="snippet-tag">${tag}</span>`
        ).join('');

        const notesHTML = snippet.notes ? 
            `<div class="snippet-notes"><strong>Notes:</strong> ${snippet.notes}</div>` : '';

        const categoryClass = `snippet-category ${snippet.category}`;

        return `
            <div class="snippet-card" data-id="${snippet.id}">
                <div class="snippet-header">
                    <div>
                        <h3 class="snippet-title">${snippet.title}</h3>
                        <span class="${categoryClass}">${snippet.category}</span>
                    </div>
                </div>
                <p class="snippet-description">${snippet.description || 'No description provided'}</p>
                ${notesHTML}
                <div class="snippet-code">
                    <pre><code class="language-xml">${this.escapeHtml(snippet.code)}</code></pre>
                </div>
                <div class="snippet-actions">
                    <div class="snippet-tags">${tagsHTML}</div>
                    <div class="snippet-buttons">
                        <button class="snippet-btn copy-btn" title="Copy to clipboard" data-id="${snippet.id}">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="snippet-btn edit-btn" title="Edit snippet" data-id="${snippet.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="snippet-btn delete-btn" title="Delete snippet" data-id="${snippet.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            ${message}
        `;

        document.body.appendChild(toast);

        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 100);

        // Remove toast after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Export/Import functionality
    exportSnippets() {
        const dataStr = JSON.stringify(this.snippets, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'device-snippets-export.json';
        link.click();
        
        URL.revokeObjectURL(url);
        this.showToast('Snippets exported successfully!', 'success');
    }

    importSnippets(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedSnippets = JSON.parse(e.target.result);
                if (Array.isArray(importedSnippets)) {
                    // Add imported snippets (with new IDs to avoid conflicts)
                    importedSnippets.forEach(snippet => {
                        snippet.id = this.generateId();
                        this.snippets.push(snippet);
                    });
                    
                    this.saveToStorage();
                    this.renderSnippets();
                    this.showToast(`Imported ${importedSnippets.length} snippets successfully!`, 'success');
                } else {
                    throw new Error('Invalid file format');
                }
            } catch (error) {
                this.showToast('Failed to import snippets. Please check the file format.', 'error');
            }
        };
        reader.readAsText(file);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.snippetManager = new SnippetManager();
});

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('searchInput').focus();
    }
    
    // Ctrl/Cmd + N to add new snippet
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        if (window.snippetManager) {
            window.snippetManager.openModal();
        }
    }
    
    // Escape to close modal
    if (e.key === 'Escape') {
        const modal = document.getElementById('snippetModal');
        if (modal.style.display === 'block' && window.snippetManager) {
            window.snippetManager.closeModal();
        }
    }
});

// Add drag and drop support for importing files
document.addEventListener('dragover', (e) => {
    e.preventDefault();
});

document.addEventListener('drop', (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/json') {
        if (window.snippetManager) {
            window.snippetManager.importSnippets(files[0]);
        }
    }
});
