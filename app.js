// State
let notes = [];
let currentListTab = 'active'; // 'active' or 'archived'
let editingNoteId = null;
let searchQuery = '';

// DOM Elements
const elements = {
    // Header
    searchInput: document.getElementById('searchInput'),
    syncBtn: document.getElementById('syncBtn'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    settingsBtnHeader: document.getElementById('settingsBtnHeader'),

    // Sidebar
    sidebar: document.querySelector('.sidebar'),
    navActive: document.getElementById('navActive'),
    navArchived: document.getElementById('navArchived'),
    navTrash: document.getElementById('navTrash'),
    settingsBtn: document.getElementById('settingsBtn'),

    // App Body
    offlineBanner: document.getElementById('offlineBanner'),
    notesGrid: document.getElementById('notesGrid'),
    emptyState: document.getElementById('emptyState'),

    // Create Note Input
    fabCreateNote: document.getElementById('fabCreateNote'),

    // Edit Modal
    editNoteModal: document.getElementById('editNoteModal'),
    editBackdrop: document.getElementById('editBackdrop'),
    editNoteTitle: document.getElementById('editNoteTitle'),
    editNoteBody: document.getElementById('editNoteBody'),
    editNoteAddUrl: document.getElementById('editNoteAddUrl'),
    editNoteUrlsList: document.getElementById('editNoteUrlsList'),
    editNoteMeta: document.getElementById('editNoteMeta'),
    btnSaveModal: document.getElementById('btnSaveModal'),
    btnArchive: document.getElementById('btnArchive'),
    btnDelete: document.getElementById('btnDelete'),

    // Settings Modal
    settingsModal: document.getElementById('settingsModal'),
    settingsBackdrop: document.getElementById('settingsBackdrop'),
    supabaseUrl: document.getElementById('supabaseUrl'),
    supabaseKey: document.getElementById('supabaseKey'),
    btnSaveSettings: document.getElementById('btnSaveSettings'),
    btnCancelSettings: document.getElementById('btnCancelSettings'),
    btnPullData: document.getElementById('btnPullData'),

    // Toast
    toast: document.getElementById('toast'),
};

document.addEventListener('DOMContentLoaded', () => {
    init();
    setupEventListeners();
});

// Init
function init() {
    initTheme();
    checkSettings();
    loadNotes();
    renderNotes();
}

function initTheme() {
    const isDark = localStorage.getItem('theme') === 'dark';
    if (isDark) {
        document.documentElement.classList.add('dark-theme');
    } else {
        document.documentElement.classList.remove('dark-theme');
    }
    updateThemeIcon();
}

function toggleTheme() {
    const root = document.documentElement;
    root.classList.toggle('dark-theme');
    const isDark = root.classList.contains('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon();
}

function updateThemeIcon() {
    if (!elements.themeToggleBtn) return;
    const isDark = document.documentElement.classList.contains('dark-theme');
    const moonIcon = elements.themeToggleBtn.querySelector('.moon-icon');
    const sunIcon = elements.themeToggleBtn.querySelector('.sun-icon');
    if (moonIcon && sunIcon) {
        if (isDark) {
            moonIcon.classList.add('hidden');
            sunIcon.classList.remove('hidden');
        } else {
            moonIcon.classList.remove('hidden');
            sunIcon.classList.add('hidden');
        }
    }
}

// Data and Settings
function checkSettings() {
    const isConfigured = !!(localStorage.getItem('supabaseUrl') && localStorage.getItem('supabaseKey'));
    if (isConfigured) {
        elements.offlineBanner.classList.add('hidden');
    } else {
        elements.offlineBanner.classList.remove('hidden');
    }
}

function loadNotes() {
    const data = localStorage.getItem('notes');
    if (data) {
        notes = JSON.parse(data) || [];
    } else {
        notes = [];
    }
    notes.sort((a, b) => b.updatedAt - a.updatedAt);
}

function saveNotesLocal() {
    localStorage.setItem('notes', JSON.stringify(notes));
}

// Render
function renderNotes() {
    elements.notesGrid.innerHTML = '';

    let filteredNotes = notes.filter(n => {
        // Tab filter
        let isTabMatch = false;
        if (currentListTab === 'archived') {
            isTabMatch = !!n.archived && !n.deleted;
        } else if (currentListTab === 'trash') {
            isTabMatch = !!n.deleted;
        } else {
            isTabMatch = !n.archived && !n.deleted;
        }

        // Search filter
        if (!isTabMatch) return false;

        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        const tMatch = (n.title || '').toLowerCase().includes(q);
        const bMatch = (n.body || '').toLowerCase().includes(q);
        const uMatch = (n.urls || []).some(url => url.toLowerCase().includes(q));
        return tMatch || bMatch || uMatch;
    });

    if (filteredNotes.length === 0) {
        elements.emptyState.classList.remove('hidden');
        if (searchQuery) {
            elements.emptyState.querySelector('p').textContent = `No notes match "${searchQuery}"`;
        } else {
            elements.emptyState.querySelector('p').textContent = currentListTab === 'archived' ? 'No archived notes' : 'Notes you add appear here';
        }
    } else {
        elements.emptyState.classList.add('hidden');
        filteredNotes.forEach(note => {
            const card = document.createElement('div');
            card.className = 'note-card';

            // Render title
            if (note.title) {
                const title = document.createElement('h3');
                title.textContent = note.title;
                card.appendChild(title);
            }

            // Render body
            if (note.body) {
                const body = document.createElement('p');
                body.textContent = note.body;
                card.appendChild(body);
            }

            // Render URLs
            if (note.urls && note.urls.length > 0) {
                const urlsDiv = document.createElement('div');
                urlsDiv.className = 'note-card-urls';
                note.urls.forEach(url => {
                    const u = document.createElement('a');
                    u.href = url;
                    u.target = "_blank";
                    u.className = 'note-card-url';
                    u.textContent = url;
                    // Stop event propagation so card click doesn't fire when clicking link
                    u.addEventListener('click', e => e.stopPropagation());
                    urlsDiv.appendChild(u);
                });
                card.appendChild(urlsDiv);
            }

            // Render meta
            const metaDiv = document.createElement('div');
            metaDiv.className = 'note-meta';
            metaDiv.innerHTML = `
                <span class="tag ${note.synced ? 'tag-synced' : 'tag-local'}">
                  ${note.synced ? 'Synced' : 'Local Only'}
                </span>
                <span>${new Date(note.updatedAt).toLocaleDateString()}</span>
            `;
            card.appendChild(metaDiv);

            card.addEventListener('click', () => openEditModal(note));
            elements.notesGrid.appendChild(card);
        });
    }
}

// Event Listeners
function setupEventListeners() {
    // Sidebar navigation
    if (elements.navActive) {
        elements.navActive.addEventListener('click', () => {
            currentListTab = 'active';
            elements.navActive.classList.add('active');
            if (elements.navArchived) elements.navArchived.classList.remove('active');
            if (elements.navTrash) elements.navTrash.classList.remove('active');
            renderNotes();
        });
    }

    if (elements.navArchived) {
        elements.navArchived.addEventListener('click', () => {
            currentListTab = 'archived';
            elements.navArchived.classList.add('active');
            if (elements.navActive) elements.navActive.classList.remove('active');
            if (elements.navTrash) elements.navTrash.classList.remove('active');
            renderNotes();
        });
    }

    if (elements.navTrash) {
        elements.navTrash.addEventListener('click', () => {
            currentListTab = 'trash';
            elements.navTrash.classList.add('active');
            if (elements.navActive) elements.navActive.classList.remove('active');
            if (elements.navArchived) elements.navArchived.classList.remove('active');
            renderNotes();
        });
    }

    const collapser = document.querySelector('.sidebar-collapser');
    if (collapser && elements.sidebar) {
        collapser.addEventListener('click', () => {
            elements.sidebar.classList.toggle('collapsed');
        });
    }

    // Search
    if (elements.searchInput) {
        elements.searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.trim();
            renderNotes();
        });
    }

    // Sync Note
    if (elements.syncBtn) {
        elements.syncBtn.addEventListener('click', async () => {
            const isConfigured = !!(localStorage.getItem('supabaseUrl') && localStorage.getItem('supabaseKey'));
            if (!isConfigured) {
                showToast('Configure Supabase settings to sync.', 'error');
                return;
            }

            let localNotesToSync = notes.filter(n => !n.synced);
            if (localNotesToSync.length > 0) {
                showToast(`Syncing ${localNotesToSync.length} notes...`, '');
                let successCount = 0;
                for (let n of localNotesToSync) {
                    if (await syncToSupabase(n)) {
                        n.synced = true;
                        successCount++;
                    }
                }
                if (successCount > 0) saveNotesLocal();
                showToast(`Synced ${successCount} notes`, 'success');
                renderNotes();
            } else {
                showToast('Up to date', 'success');
            }
        });
    }

    // Theme Toggle
    if (elements.themeToggleBtn) {
        elements.themeToggleBtn.addEventListener('click', toggleTheme);
    }

    // Settings
    if (elements.settingsBtn) elements.settingsBtn.addEventListener('click', openSettings);
    if (elements.settingsBtnHeader) elements.settingsBtnHeader.addEventListener('click', openSettings);
    if (elements.btnCancelSettings) elements.btnCancelSettings.addEventListener('click', closeSettings);
    if (elements.settingsBackdrop) elements.settingsBackdrop.addEventListener('click', closeSettings);
    if (elements.btnSaveSettings) elements.btnSaveSettings.addEventListener('click', saveSettings);
    if (elements.btnPullData) elements.btnPullData.addEventListener('click', pullDataFromCloud);

    // Create Note Box behavior
    if (elements.fabCreateNote) {
        elements.fabCreateNote.addEventListener('click', () => {
            editingNoteId = null;  // New note mode
            elements.editNoteTitle.value = '';
            elements.editNoteBody.value = '';
            elements.editNoteUrlsList.innerHTML = '';
            addUrlInput('editNoteUrlsList');
            elements.editNoteMeta.innerHTML = `<span class="tag tag-local">New Note</span>`;
            elements.btnArchive.classList.add('hidden');
            elements.btnDelete.classList.add('hidden');
            elements.editNoteModal.classList.remove('hidden');
            elements.editNoteTitle.focus();
        });
    }

    elements.editNoteAddUrl.addEventListener('click', (e) => {
        e.stopPropagation();
        addUrlInput('editNoteUrlsList');
    });

    // Edit Modal close & save
    elements.btnSaveModal.addEventListener('click', saveEditModalAndClose);
    elements.editBackdrop.addEventListener('click', saveEditModalAndClose);

    // Edit Modal actions
    elements.btnArchive.addEventListener('click', toggleArchiveCurrentNote);
    elements.btnDelete.addEventListener('click', deleteCurrentNote);
}

// Logic Functions

function openSettings() {
    elements.supabaseUrl.value = localStorage.getItem('supabaseUrl') || '';
    elements.supabaseKey.value = localStorage.getItem('supabaseKey') || '';
    elements.settingsModal.classList.remove('hidden');
}

function closeSettings() {
    elements.settingsModal.classList.add('hidden');
}

function saveSettings() {
    const url = elements.supabaseUrl.value.trim();
    const key = elements.supabaseKey.value.trim();

    localStorage.setItem('supabaseUrl', url);
    localStorage.setItem('supabaseKey', key);

    checkSettings();
    showToast('Settings saved', 'success');
    closeSettings();
}

// (saveNewNote removed, logic handled in saveEditModalAndClose)

// Edit Modal
function openEditModal(note) {
    editingNoteId = note.id;

    elements.editNoteTitle.value = note.title || '';
    elements.editNoteBody.value = note.body || '';

    elements.editNoteUrlsList.innerHTML = '';
    if (note.urls && note.urls.length > 0) {
        note.urls.forEach(url => addUrlInput('editNoteUrlsList', url));
    } else {
        addUrlInput('editNoteUrlsList');
    }

    elements.editNoteMeta.innerHTML = `<span class="tag ${note.synced ? 'tag-synced' : 'tag-local'}">${note.synced ? 'Cloud Synced' : 'Local Only'}</span>`;

    // Archive button state
    if (note.deleted) {
        elements.btnArchive.title = "Restore Note";
        elements.btnArchive.classList.remove('hidden');
        elements.btnArchive.classList.remove('tag-archived');
        elements.btnArchive.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 14 4 9 9 4"></polyline><path d="M20 20v-7a4 4 0 0 0-4-4H4"></path></svg>`;
        elements.btnDelete.title = "Permanently Delete";
    } else {
        elements.btnArchive.classList.remove('hidden');
        elements.btnDelete.title = "Move to Trash";
        if (note.archived) {
            elements.btnArchive.title = "Unarchive Note";
            elements.btnArchive.classList.add('tag-archived');
            elements.btnArchive.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line><line x1="12" y1="12" x2="12" y2="17"></line><polyline points="9 15 12 12 15 15"></polyline></svg>`;
        } else {
            elements.btnArchive.title = "Archive Note";
            elements.btnArchive.classList.remove('tag-archived');
            elements.btnArchive.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>`;
        }
    }

    elements.editNoteModal.classList.remove('hidden');
}

async function saveEditModalAndClose() {
    const title = elements.editNoteTitle.value.trim();
    const body = elements.editNoteBody.value.trim();
    const urls = getUrlsFromList('editNoteUrlsList');

    if (!editingNoteId) {
        // New note
        if (title || body || urls.length > 0) {
            const now = Date.now();
            const note = {
                id: generateUUID(),
                title,
                body,
                urls,
                createdAt: now,
                updatedAt: now,
                synced: false,
                archived: false
            };
            notes.unshift(note);
            saveNotesLocal();

            // Sync
            const isConfigured = !!(localStorage.getItem('supabaseUrl') && localStorage.getItem('supabaseKey'));
            if (isConfigured) {
                if (await syncToSupabase(note)) {
                    note.synced = true;
                    saveNotesLocal();
                }
            }
            renderNotes();
        }
        closeEditModal();
        return;
    }

    const noteIndex = notes.findIndex(n => n.id === editingNoteId);
    if (noteIndex === -1) {
        closeEditModal();
        return;
    }

    const note = notes[noteIndex];

    // Check if anything changed
    const oldUrlsStr = JSON.stringify(note.urls || []);
    const newUrlsStr = JSON.stringify(urls);

    if (note.title !== title || note.body !== body || oldUrlsStr !== newUrlsStr) {
        note.title = title;
        note.body = body;
        note.urls = urls;
        note.updatedAt = Date.now();
        note.synced = false;

        // Push note to top based on updatedAt
        notes.splice(noteIndex, 1);
        notes.unshift(note);

        saveNotesLocal();

        // Sync
        const isConfigured = !!(localStorage.getItem('supabaseUrl') && localStorage.getItem('supabaseKey'));
        if (isConfigured) {
            if (await syncToSupabase(note)) {
                note.synced = true;
                saveNotesLocal();
            }
        }

        renderNotes();
    }

    closeEditModal();
}

function closeEditModal() {
    elements.editNoteModal.classList.add('hidden');
    editingNoteId = null;
}

async function toggleArchiveCurrentNote(e) {
    if (e) e.stopPropagation();
    if (!editingNoteId) return;

    const noteIndex = notes.findIndex(n => n.id === editingNoteId);
    if (noteIndex === -1) return;

    const note = notes[noteIndex];
    if (note.deleted) {
        // Restore
        note.deleted = false;
        note.updatedAt = Date.now();
        note.synced = false;
        saveNotesLocal();
        showToast('Note restored', 'success');
    } else {
        note.archived = !note.archived;
        note.updatedAt = Date.now();
        note.synced = false;
        saveNotesLocal();
        showToast(note.archived ? 'Note archived' : 'Note unarchived', 'success');
    }

    const isConfigured = !!(localStorage.getItem('supabaseUrl') && localStorage.getItem('supabaseKey'));
    if (isConfigured) {
        if (await syncToSupabase(note)) {
            note.synced = true;
            saveNotesLocal();
        }
    }

    renderNotes();
    closeEditModal();
}

async function deleteCurrentNote(e) {
    if (e) e.stopPropagation();
    if (!editingNoteId) return;

    const noteIndex = notes.findIndex(n => n.id === editingNoteId);
    if (noteIndex === -1) return;

    const note = notes[noteIndex];

    if (!note.deleted) {
        // Move to Trash
        note.deleted = true;
        note.updatedAt = Date.now();
        note.synced = false;
        saveNotesLocal();
        showToast('Moved to Trash', 'success');

        // Push local changes up, though `is_deleted` column won't be saved unless DB adds it
        const isConfigured = !!(localStorage.getItem('supabaseUrl') && localStorage.getItem('supabaseKey'));
        if (isConfigured) {
            if (await syncToSupabase(note)) {
                note.synced = true;
                saveNotesLocal();
            }
        }

        renderNotes();
        closeEditModal();
        return;
    }

    if (!confirm('Permanently delete this note?')) return;

    notes.splice(noteIndex, 1);
    saveNotesLocal();

    showToast('Note permanently deleted', 'success');

    const isConfigured = !!(localStorage.getItem('supabaseUrl') && localStorage.getItem('supabaseKey'));
    if (isConfigured) {
        await deleteFromSupabase(note.id);
    }

    renderNotes();
    closeEditModal();
}

// URL Helper Functions
function addUrlInput(containerId, value = '') {
    const container = document.getElementById(containerId);

    const wrapper = document.createElement('div');
    wrapper.className = 'url-item';

    const input = document.createElement('input');
    input.type = 'url';
    input.className = 'url-input';
    input.placeholder = 'https://...';
    input.value = value;

    // Stop event bubbling for clicks or key presses inside the input
    input.addEventListener('click', e => e.stopPropagation());

    const removeBtn = document.createElement('button');
    removeBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    removeBtn.className = 'btn-remove-url';
    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        wrapper.remove();
    });

    wrapper.appendChild(input);
    wrapper.appendChild(removeBtn);
    container.appendChild(wrapper);
}

function getUrlsFromList(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return [];
    const inputs = container.querySelectorAll('.url-input');
    return Array.from(inputs).map(i => i.value.trim()).filter(v => v);
}


// API Helpers
async function syncToSupabase(note) {
    try {
        const supabaseUrl = localStorage.getItem('supabaseUrl');
        const supabaseKey = localStorage.getItem('supabaseKey');
        if (!supabaseUrl || !supabaseKey) return false;

        let cleanUrl = supabaseUrl;
        cleanUrl = cleanUrl.replace(/^(https?:\/\/)?(db\.)?/, 'https://');
        if (cleanUrl.endsWith('/')) cleanUrl = cleanUrl.slice(0, -1);

        const payload = {
            local_id: note.id,
            title: note.title,
            body: note.body,
            urls: note.urls,
            is_archived: note.archived || false
        };

        const res = await fetch(`${cleanUrl}/rest/v1/notes?on_conflict=local_id`, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok && res.status !== 201) {
            console.error('Supabase Sync Error:', await res.text());
            return false;
        }
        return true;
    } catch (err) {
        console.error('Supabase Exception:', err);
        return false;
    }
}

async function deleteFromSupabase(localId) {
    try {
        const supabaseUrl = localStorage.getItem('supabaseUrl');
        const supabaseKey = localStorage.getItem('supabaseKey');
        if (!supabaseUrl || !supabaseKey) return false;

        let cleanUrl = supabaseUrl;
        cleanUrl = cleanUrl.replace(/^(https?:\/\/)?(db\.)?/, 'https://');
        if (cleanUrl.endsWith('/')) cleanUrl = cleanUrl.slice(0, -1);

        const res = await fetch(`${cleanUrl}/rest/v1/notes?local_id=eq.${localId}`, {
            method: 'DELETE',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });

        return res.ok;
    } catch (err) {
        console.error('Supabase Delete Exception:', err);
        return false;
    }
}

async function pullDataFromCloud() {
    try {
        const supabaseUrl = elements.supabaseUrl.value.trim();
        const supabaseKey = elements.supabaseKey.value.trim();
        if (!supabaseUrl || !supabaseKey) {
            showToast('Enter Supabase URL and Key first.', 'error');
            return;
        }

        elements.btnPullData.textContent = 'Pulling...';
        elements.btnPullData.disabled = true;

        let cleanUrl = supabaseUrl;
        cleanUrl = cleanUrl.replace(/^(https?:\/\/)?(db\.)?/, 'https://');
        if (cleanUrl.endsWith('/')) cleanUrl = cleanUrl.slice(0, -1);

        const res = await fetch(`${cleanUrl}/rest/v1/notes?select=*`, {
            method: 'GET',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });

        if (res.ok) {
            const data = await res.json();

            // Map remote data to local notes format
            notes = data.map(dbNote => ({
                id: dbNote.local_id || generateUUID(),
                title: dbNote.title || '',
                body: dbNote.body || '',
                urls: dbNote.urls || [],
                createdAt: Date.parse(dbNote.created_at) || Date.now(),
                updatedAt: Date.now(), // update time locally
                synced: true,
                archived: dbNote.is_archived === true
            }));

            saveNotesLocal();

            showToast(`Pulled ${notes.length} notes successfully`, 'success');

            // Auto close/save settings since config is verified
            saveSettings();
            renderNotes();
        } else {
            showToast('Error pulling data. Check credentials.', 'error');
            console.error(await res.text());
        }
    } catch (err) {
        showToast('Exception pulling data', 'error');
        console.error('Pull data error', err);
    } finally {
        elements.btnPullData.textContent = 'Pull Data from Cloud';
        elements.btnPullData.disabled = false;
    }
}

// Helpers
function showToast(message, type) {
    elements.toast.textContent = message;
    elements.toast.className = `toast show ${type}`;
    elements.toast.classList.remove('hidden');

    setTimeout(() => {
        elements.toast.classList.remove('show');
        setTimeout(() => elements.toast.classList.add('hidden'), 300);
    }, 3000);
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
