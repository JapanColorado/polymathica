// Global variables
let subjects = JSON.parse(JSON.stringify(defaultSubjects));
let subjectState = {};
let subjectNotes = {};
let currentNotesSubject = null;
let currentEditingSubject = null;
let currentEditingField = null;

// Load saved data
function loadSubjects() {
    const saved = localStorage.getItem('subjects');
    if (saved) {
        try {
            subjects = JSON.parse(saved);
        } catch (e) {
            console.error('Error loading subjects:', e);
            subjects = JSON.parse(JSON.stringify(defaultSubjects));
        }
    }
}

function loadState() {
    const saved = localStorage.getItem('subjectTracker');
    if (saved) {
        try {
            subjectState = JSON.parse(saved);
        } catch (e) {
            console.error('Error loading state:', e);
            subjectState = {};
        }
    }
}

function loadNotes() {
    const saved = localStorage.getItem('subjectNotes');
    if (saved) {
        try {
            subjectNotes = JSON.parse(saved);
        } catch (e) {
            console.error('Error loading notes:', e);
            subjectNotes = {};
        }
    }
    // Merge default summaries with user notes (user notes take priority)
    Object.keys(defaultSummaries).forEach(key => {
        if (!subjectNotes[key]) {
            subjectNotes[key] = defaultSummaries[key];
        }
    });
}

// Save functions
function saveSubjects() {
    localStorage.setItem('subjects', JSON.stringify(subjects));
}

function saveState(state) {
    localStorage.setItem('subjectTracker', JSON.stringify(state));
}

function saveNotesState(notes) {
    localStorage.setItem('subjectNotes', JSON.stringify(notes));
}

// Theme management
function loadTheme() {
    const saved = localStorage.getItem('theme');
    return saved || 'light';
}

function saveTheme(theme) {
    localStorage.setItem('theme', theme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    saveTheme(newTheme);
    updateThemeButton(newTheme);
}

function updateThemeButton(theme) {
    const icon = document.getElementById('themeIcon');
    const text = document.getElementById('themeText');
    
    if (theme === 'dark') {
        icon.textContent = '☀️';
        text.textContent = 'Light';
    } else {
        icon.textContent = '🌙';
        text.textContent = 'Dark';
    }
}

function initializeTheme() {
    const theme = loadTheme();
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeButton(theme);
}

// Subject status functions
function getSubjectStatus(id) {
    return subjectState[id] || 'not-started';
}

function setSubjectStatus(id, status) {
    subjectState[id] = status;
    saveState(subjectState);
    render();
}

function cycleStatus(id, event) {
    if (event && (event.target.closest('.notes-button') || event.target.closest('button'))) {
        return;
    }
    
    const current = getSubjectStatus(id);
    const next = {
        'not-started': 'in-progress',
        'in-progress': 'completed',
        'completed': 'not-started'
    };
    setSubjectStatus(id, next[current]);
}

// Calculate readiness
function calculateReadiness(subject) {
    if (!subject.prereq || subject.prereq.length === 0) {
        return 'ready';
    }

    const prereqStatuses = subject.prereq.map(id => getSubjectStatus(id));
    const allCompleted = prereqStatuses.every(status => status === 'completed');
    const someCompleted = prereqStatuses.some(status => status === 'completed');

    if (allCompleted) {
        return 'ready';
    } else if (someCompleted) {
        return 'partial';
    } else {
        return 'locked';
    }
}

// Stats calculation
function calculateStats() {
    let total = 0;
    let completed = 0;
    let inProgress = 0;
    let ready = 0;
    
    Object.values(subjects).forEach(tier => {
        tier.subjects.forEach(subject => {
            total++;
            const status = getSubjectStatus(subject.id);
            if (status === 'completed') completed++;
            if (status === 'in-progress') inProgress++;
            
            if (status === 'not-started') {
                const readiness = calculateReadiness(subject);
                if (readiness === 'ready') {
                    ready++;
                }
            }
        });
    });
    
    return {
        total,
        completed,
        inProgress,
        notStarted: total - completed - inProgress,
        ready,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };
}

function updateStats() {
    const stats = calculateStats();
    document.getElementById('totalSubjects').textContent = stats.total;
    document.getElementById('completedCount').textContent = stats.completed;
    document.getElementById('inProgressCount').textContent = stats.inProgress;
    document.getElementById('readyCount').textContent = stats.ready;
    document.getElementById('progressFill').style.width = stats.percentage + '%';
    document.getElementById('progressFill').textContent = stats.percentage + '%';
}

function calculateTierProgress(tier) {
    let total = tier.subjects.length;
    let completed = tier.subjects.filter(s => getSubjectStatus(s.id) === 'completed').length;
    return `${completed}/${total}`;
}

// Rendering functions
function renderDependencyItem(depId, type) {
    const status = getSubjectStatus(depId);
    const completed = status === 'completed';
    const className = `dependency-item ${type}${completed ? ' completed' : ''}`;
    return `<span class="${className}" title="${completed ? 'Completed' : 'Not completed'}">${depId}</span>`;
}

function renderSubjectCard(subject) {
    const status = getSubjectStatus(subject.id);
    const readiness = calculateReadiness(subject);
    
    const hasUserNotes = subjectNotes[subject.id] && subjectNotes[subject.id].trim().length > 0;
    
    const statusLabels = {
        'not-started': 'Not Started',
        'in-progress': 'In Progress',
        'completed': 'Completed'
    };

    const readinessLabels = {
        'ready': '✅ Ready',
        'locked': '🔒 Locked',
        'partial': '⚠️ Partial'
    };

    let dependenciesHtml = '';
    
    if (subject.prereq && subject.prereq.length > 0) {
        const prereqItems = subject.prereq.map(id => renderDependencyItem(id, 'prereq-required')).join('');
        dependenciesHtml += `
            <div class="dependency-section">
                <div class="dependency-label">🔴 Required Prerequisites:</div>
                <div class="dependency-list">${prereqItems}</div>
            </div>
        `;
    }

    if (subject.soft && subject.soft.length > 0) {
        const softItems = subject.soft.map(id => renderDependencyItem(id, 'prereq-recommended')).join('');
        dependenciesHtml += `
            <div class="dependency-section">
                <div class="dependency-label">🟡 Recommended:</div>
                <div class="dependency-list">${softItems}</div>
            </div>
        `;
    }

    if (subject.coreq && subject.coreq.length > 0) {
        const coreqItems = subject.coreq.map(id => renderDependencyItem(id, 'coreq')).join('');
        dependenciesHtml += `
            <div class="dependency-section">
                <div class="dependency-label">🔵 Best Learned With:</div>
                <div class="dependency-list">${coreqItems}</div>
            </div>
        `;
    }

    let cardClasses = `subject-card ${status}`;
    if (readiness === 'locked') {
        cardClasses += ' locked';
    } else if (readiness === 'ready' && status === 'not-started') {
        cardClasses += ' ready-to-start';
    }

    return `
        <div class="${cardClasses}" 
             data-id="${subject.id}" 
             data-status="${status}"
             data-readiness="${readiness}"
             data-category="${subject.category || 'general'}"
             onclick="cycleStatus('${subject.id}', event)">
            ${status === 'not-started' ? `<div class="readiness-badge readiness-${readiness}">${readinessLabels[readiness]}</div>` : ''}
            <div class="subject-header">
                <div class="subject-name">${subject.name}</div>
                <div class="subject-actions">
                    <button class="notes-button" 
                            onclick="openSubjectEditor('${subject.id}', event)"
                            title="Edit subject"
                            style="background: #95a5a6;">
                        ✏️
                    </button>
                    <button class="notes-button ${hasUserNotes ? 'has-notes' : ''}" 
                            onclick="openNotesModal('${subject.id}', '${subject.name.replace(/'/g, "\\'")}', event)"
                            title="${hasUserNotes ? 'View/edit notes' : 'Add notes'}">
                        📝
                    </button>
                    <div class="subject-status status-${status}">${statusLabels[status]}</div>
                </div>
            </div>
            ${dependenciesHtml ? `<div class="dependencies">${dependenciesHtml}</div>` : ''}
        </div>
    `;
}

function renderTier(tierName, tierData, isCollapsed = false) {
    const progress = calculateTierProgress(tierData);
    const subjectsHtml = tierData.subjects.map(renderSubjectCard).join('');
    
    return `
        <div class="tier ${isCollapsed ? 'collapsed' : ''}" data-tier="${tierName}">
            <div class="tier-header" onclick="toggleTier(this)">
                <span class="tier-title">${tierName}</span>
                <div>
                    <span class="tier-progress">${progress} completed</span>
                    <span class="toggle-icon"> ▼</span>
                </div>
            </div>
            <div class="subjects-grid">
                ${subjectsHtml}
            </div>
        </div>
    `;
}

function toggleTier(header) {
    header.parentElement.classList.toggle('collapsed');
}

function render() {
    const content = document.getElementById('content');
    
    const inProgressSubjects = [];
    Object.entries(subjects).forEach(([fieldName, fieldData]) => {
        fieldData.subjects.forEach(subject => {
            if (getSubjectStatus(subject.id) === 'in-progress') {
                inProgressSubjects.push(subject);
            }
        });
    });
    
    let html = '';
    if (inProgressSubjects.length > 0) {
        const inProgressHtml = inProgressSubjects.map(renderSubjectCard).join('');
        html += `
            <div class="tier" data-tier="In Progress">
                <div class="tier-header" onclick="toggleTier(this)">
                    <span class="tier-title">📚 Currently In Progress</span>
                    <div>
                        <span class="tier-progress">${inProgressSubjects.length} subject${inProgressSubjects.length !== 1 ? 's' : ''}</span>
                        <span class="toggle-icon"> ▼</span>
                    </div>
                </div>
                <div class="subjects-grid">
                    ${inProgressHtml}
                </div>
            </div>
        `;
    }
    
    html += Object.entries(subjects).map(([name, data]) => renderTier(name, data, true)).join('');
    
    content.innerHTML = html;
    updateStats();
    applyFilters();
}

function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const categoryFilter = document.getElementById('categoryFilter').value;
    const readinessFilter = document.getElementById('readinessFilter').value;

    document.querySelectorAll('.subject-card').forEach(card => {
        const text = card.textContent.toLowerCase();
        const status = card.dataset.status;
        const category = card.dataset.category;
        const readiness = card.dataset.readiness;

        const matchesSearch = searchTerm === '' || text.includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || status === statusFilter;
        const matchesCategory = categoryFilter === 'all' || category === categoryFilter;
        const matchesReadiness = readinessFilter === 'all' || readiness === readinessFilter;

        if (matchesSearch && matchesStatus && matchesCategory && matchesReadiness) {
            card.classList.remove('hidden');
        } else {
            card.classList.add('hidden');
        }
    });

    document.querySelectorAll('.tier').forEach(tier => {
        const visibleCards = tier.querySelectorAll('.subject-card:not(.hidden)');
        if (visibleCards.length === 0) {
            tier.classList.add('hidden');
        } else {
            tier.classList.remove('hidden');
        }
    });
}

// Notes modal functions
function openNotesModal(subjectId, subjectName, event) {
    if (event) event.stopPropagation();
    currentNotesSubject = subjectId;
    document.getElementById('modalTitle').textContent = subjectName;
    
    const notes = subjectNotes[subjectId] || '';
    document.getElementById('notesTextarea').value = notes;
    document.getElementById('notesModal').classList.add('active');
    
    const hasNotes = notes.trim().length > 0;
    switchNotesTab(hasNotes ? 'preview' : 'edit');
}

function closeNotesModal() {
    document.getElementById('notesModal').classList.remove('active');
    currentNotesSubject = null;
}

function switchNotesTab(tab) {
    const tabs = document.querySelectorAll('.notes-tab');
    const textarea = document.getElementById('notesTextarea');
    const preview = document.getElementById('notesPreview');
    
    tabs.forEach(t => {
        if (t.dataset.tab === tab) {
            t.classList.add('active');
        } else {
            t.classList.remove('active');
        }
    });
    
    if (tab === 'edit') {
        textarea.style.display = 'block';
        preview.classList.remove('active');
    } else {
        textarea.style.display = 'none';
        preview.classList.add('active');
        updatePreview();
    }
}

function updatePreview() {
    const textarea = document.getElementById('notesTextarea');
    const preview = document.getElementById('notesPreview');
    const markdown = textarea.value;
    
    if (markdown.trim()) {
        marked.setOptions({ breaks: true, gfm: true });
        preview.innerHTML = marked.parse(markdown);
    } else {
        preview.innerHTML = '<p style="color: var(--text-secondary); font-style: italic;">Nothing to preview. Add some markdown in the Edit tab.</p>';
    }
}

function saveNotes() {
    if (currentNotesSubject) {
        const notes = document.getElementById('notesTextarea').value;
        if (notes.trim()) {
            subjectNotes[currentNotesSubject] = notes;
        } else {
            delete subjectNotes[currentNotesSubject];
        }
        saveNotesState(subjectNotes);
        render();
    }
    closeNotesModal();
}

// Subject editor functions
function openSubjectEditor(subjectId = null, event = null) {
    if (event) event.stopPropagation();
    
    currentEditingSubject = subjectId;
    const modal = document.getElementById('subjectModal');
    const title = document.getElementById('subjectModalTitle');
    const deleteBtn = document.getElementById('deleteSubjectBtn');
    const statusEl = document.getElementById('summaryStatus');
    
    // Clear summary status
    statusEl.textContent = '';
    
    if (subjectId) {
        title.textContent = 'Edit Subject';
        deleteBtn.style.display = 'inline-block';
        
        let subject = null;
        let fieldName = null;
        for (const [field, data] of Object.entries(subjects)) {
            const found = data.subjects.find(s => s.id === subjectId);
            if (found) {
                subject = found;
                fieldName = field;
                currentEditingField = field;
                break;
            }
        }
        
        if (subject) {
            document.getElementById('subjectName').value = subject.name;
            document.getElementById('subjectId').value = subject.id;
            document.getElementById('subjectField').value = fieldName;
            document.getElementById('subjectPrereq').value = (subject.prereq || []).join(', ');
            document.getElementById('subjectSoft').value = (subject.soft || []).join(', ');
            document.getElementById('subjectCoreq').value = (subject.coreq || []).join(', ');
            document.getElementById('subjectId').disabled = true;
        }
    } else {
        title.textContent = 'Add New Subject';
        deleteBtn.style.display = 'none';
        document.getElementById('subjectName').value = '';
        document.getElementById('subjectId').value = '';
        document.getElementById('subjectId').disabled = false;
        document.getElementById('subjectField').value = 'Mathematics';
        document.getElementById('subjectPrereq').value = '';
        document.getElementById('subjectSoft').value = '';
        document.getElementById('subjectCoreq').value = '';
        currentEditingField = null;
    }
    
    modal.classList.add('active');
}

function closeSubjectEditor() {
    document.getElementById('subjectModal').classList.remove('active');
    currentEditingSubject = null;
    currentEditingField = null;
}

function saveSubject() {
    const name = document.getElementById('subjectName').value.trim();
    const id = document.getElementById('subjectId').value.trim();
    const field = document.getElementById('subjectField').value;
    const prereqStr = document.getElementById('subjectPrereq').value.trim();
    const softStr = document.getElementById('subjectSoft').value.trim();
    const coreqStr = document.getElementById('subjectCoreq').value.trim();
    
    if (!name || !id) {
        alert('Please enter both a subject name and short code.');
        return;
    }
    
    if (!currentEditingSubject || id !== currentEditingSubject) {
        for (const fieldData of Object.values(subjects)) {
            if (fieldData.subjects.some(s => s.id === id)) {
                alert('A subject with this short code already exists. Please choose a different code.');
                return;
            }
        }
    }
    
    const prereq = prereqStr ? prereqStr.split(',').map(s => s.trim()).filter(s => s) : [];
    const soft = softStr ? softStr.split(',').map(s => s.trim()).filter(s => s) : [];
    const coreq = coreqStr ? coreqStr.split(',').map(s => s.trim()).filter(s => s) : [];
    
    const newSubject = {
        name,
        id,
        ...(prereq.length > 0 && { prereq }),
        ...(soft.length > 0 && { soft }),
        ...(coreq.length > 0 && { coreq })
    };
    
    if (currentEditingSubject) {
        if (currentEditingField && currentEditingField !== field) {
            subjects[currentEditingField].subjects = subjects[currentEditingField].subjects.filter(
                s => s.id !== currentEditingSubject
            );
        }
        
        const targetField = subjects[field];
        const existingIndex = targetField.subjects.findIndex(s => s.id === id);
        if (existingIndex >= 0) {
            targetField.subjects[existingIndex] = newSubject;
        } else {
            targetField.subjects.push(newSubject);
        }
        
        // If ID changed, update notes
        if (currentEditingSubject !== id && subjectNotes[currentEditingSubject]) {
            subjectNotes[id] = subjectNotes[currentEditingSubject];
            delete subjectNotes[currentEditingSubject];
        }
    } else {
        if (!subjects[field]) {
            subjects[field] = { category: field.toLowerCase().replace(/\s+/g, ''), subjects: [] };
        }
        subjects[field].subjects.push(newSubject);
    }
    
    // Save subjects and notes (notes may have been updated by AI generation)
    saveSubjects();
    saveNotesState(subjectNotes);
    render();
    closeSubjectEditor();
}

function deleteSubject() {
    if (!currentEditingSubject) return;
    
    if (!confirm('Are you sure you want to delete this subject? This will also delete any notes associated with it.')) {
        return;
    }
    
    for (const fieldData of Object.values(subjects)) {
        fieldData.subjects = fieldData.subjects.filter(s => s.id !== currentEditingSubject);
    }
    
    delete subjectNotes[currentEditingSubject];
    delete subjectState[currentEditingSubject];
    
    saveSubjects();
    saveNotesState(subjectNotes);
    saveState(subjectState);
    render();
    closeSubjectEditor();
}

// Autocomplete functionality
let autocompleteState = {
    prereq: { selectedIndex: -1, currentSuggestions: [] },
    soft: { selectedIndex: -1, currentSuggestions: [] },
    coreq: { selectedIndex: -1, currentSuggestions: [] }
};

function getAllSubjectCodes() {
    const codes = [];
    Object.values(subjects).forEach(field => {
        field.subjects.forEach(subject => {
            codes.push({
                id: subject.id,
                name: subject.name
            });
        });
    });
    return codes;
}

function setupAutocomplete(inputId, suggestionsId) {
    const input = document.getElementById(inputId);
    const suggestionsDiv = document.getElementById(suggestionsId);
    const stateKey = inputId.replace('subject', '').replace('Prereq', 'prereq').replace('Soft', 'soft').replace('Coreq', 'coreq');
    const state = autocompleteState[stateKey];

    input.addEventListener('input', (e) => {
        const value = e.target.value;
        const lastComma = value.lastIndexOf(',');
        const currentWord = value.slice(lastComma + 1).trim();

        if (currentWord.length === 0) {
            suggestionsDiv.classList.remove('active');
            return;
        }

        const allCodes = getAllSubjectCodes();
        const matches = allCodes.filter(item => 
            item.id.toLowerCase().includes(currentWord.toLowerCase()) ||
            item.name.toLowerCase().includes(currentWord.toLowerCase())
        );

        if (matches.length > 0) {
            state.currentSuggestions = matches;
            state.selectedIndex = -1;
            renderSuggestions(matches, suggestionsDiv);
            suggestionsDiv.classList.add('active');
        } else {
            suggestionsDiv.classList.remove('active');
        }
    });

    input.addEventListener('keydown', (e) => {
        if (!suggestionsDiv.classList.contains('active')) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            state.selectedIndex = Math.min(state.selectedIndex + 1, state.currentSuggestions.length - 1);
            updateSelection(suggestionsDiv, state.selectedIndex);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            state.selectedIndex = Math.max(state.selectedIndex - 1, -1);
            updateSelection(suggestionsDiv, state.selectedIndex);
        } else if (e.key === 'Enter' && state.selectedIndex >= 0) {
            e.preventDefault();
            selectSuggestion(input, state.currentSuggestions[state.selectedIndex].id, suggestionsDiv);
        } else if (e.key === 'Escape') {
            suggestionsDiv.classList.remove('active');
        }
    });

    input.addEventListener('blur', () => {
        setTimeout(() => suggestionsDiv.classList.remove('active'), 200);
    });
}

function renderSuggestions(matches, container) {
    container.innerHTML = matches.map((item, index) => `
        <div class="autocomplete-item" data-index="${index}" onclick="selectSuggestionByClick('${item.id}', '${container.id}')">
            <span class="autocomplete-code">${item.id}</span>
            <span class="autocomplete-name">${item.name}</span>
        </div>
    `).join('');
}

function updateSelection(container, selectedIndex) {
    const items = container.querySelectorAll('.autocomplete-item');
    items.forEach((item, index) => {
        if (index === selectedIndex) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
}

function selectSuggestion(input, code, container) {
    const value = input.value;
    const lastComma = value.lastIndexOf(',');
    let newValue;
    
    if (lastComma === -1) {
        // No comma yet, replace entire value
        newValue = code + ', ';
    } else {
        const beforeCurrent = value.slice(0, lastComma + 1);
        newValue = beforeCurrent + ' ' + code + ', ';
    }
    
    input.value = newValue;
    container.classList.remove('active');
    input.focus();
}

function selectSuggestionByClick(code, containerId) {
    const container = document.getElementById(containerId);
    let inputId = '';
    if (containerId === 'prereqSuggestions') inputId = 'subjectPrereq';
    else if (containerId === 'softSuggestions') inputId = 'subjectSoft';
    else if (containerId === 'coreqSuggestions') inputId = 'subjectCoreq';
    
    const input = document.getElementById(inputId);
    selectSuggestion(input, code, container);
}

// AI Summary Generation
async function generateAISummary() {
    const name = document.getElementById('subjectName').value.trim();
    const field = document.getElementById('subjectField').value;
    const prereqStr = document.getElementById('subjectPrereq').value.trim();
    const softStr = document.getElementById('subjectSoft').value.trim();

    if (!name) {
        alert('Please enter a subject name first.');
        return;
    }

    const statusEl = document.getElementById('summaryStatus');
    const btn = document.getElementById('generateSummaryBtn');
    
    btn.disabled = true;
    statusEl.textContent = 'Generating summary...';
    statusEl.style.color = '#3498db';

    try {
        const prereqs = prereqStr ? prereqStr.split(',').map(s => s.trim()).filter(s => s) : [];
        const softPrereqs = softStr ? softStr.split(',').map(s => s.trim()).filter(s => s) : [];
        
        let prompt = `Create a concise educational summary for the subject "${name}" in the field of ${field}.`;
        
        if (prereqs.length > 0 || softPrereqs.length > 0) {
            prompt += `\n\nContext:`;
            if (prereqs.length > 0) {
                prompt += `\n- Required prerequisites: ${prereqs.join(', ')}`;
            }
            if (softPrereqs.length > 0) {
                prompt += `\n- Recommended background: ${softPrereqs.join(', ')}`;
            }
        }

        prompt += `\n\nFormat your response in Markdown with:\n1. A level 1 heading with the subject name\n2. A brief 2-3 sentence overview\n3. A "Key Topics" section with 5-7 important topics (bold the label)\n4. End with a horizontal rule (---)\n\nKeep it concise and educational.`;

        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 1000,
                messages: [
                    { role: "user", content: prompt }
                ],
            })
        });

        const data = await response.json();
        
        if (data.content && data.content[0] && data.content[0].text) {
            const summary = data.content[0].text;
            const subjectId = document.getElementById('subjectId').value.trim() || 'temp';
            
            // Store the generated summary temporarily
            subjectNotes[subjectId] = summary;
            
            statusEl.textContent = '✓ Summary generated! It will be saved with the subject.';
            statusEl.style.color = '#27ae60';
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('Error generating summary:', error);
        statusEl.textContent = '✗ Failed to generate summary. Please try again.';
        statusEl.style.color = '#e74c3c';
    } finally {
        btn.disabled = false;
    }
}

// Other functions
function resetAll() {
    if (confirm('Are you sure you want to reset all progress AND notes? This cannot be undone.')) {
        subjectState = {};
        subjectNotes = {};
        saveState(subjectState);
        saveNotesState(subjectNotes);
        render();
    }
}

function exportData() {
    const stats = calculateStats();
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    const data = {
        exportDate: new Date().toISOString(),
        theme: theme,
        stats: stats,
        subjects: subjectState,
        notes: subjectNotes
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `learning-tracker-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSubjects();
    loadState();
    loadNotes();
    initializeTheme();
    render();
    
    // Event listeners
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('categoryFilter').addEventListener('change', applyFilters);
    document.getElementById('readinessFilter').addEventListener('change', applyFilters);
    
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('addSubjectBtn').addEventListener('click', () => openSubjectEditor());
    document.getElementById('resetBtn').addEventListener('click', resetAll);
    document.getElementById('exportBtn').addEventListener('click', exportData);
    
    // Notes modal
    document.getElementById('closeNotesBtn').addEventListener('click', closeNotesModal);
    document.getElementById('cancelNotesBtn').addEventListener('click', closeNotesModal);
    document.getElementById('saveNotesBtn').addEventListener('click', saveNotes);
    
    document.querySelectorAll('.notes-tab').forEach(tab => {
        tab.addEventListener('click', () => switchNotesTab(tab.dataset.tab));
    });
    
    document.getElementById('notesTextarea').addEventListener('input', () => {
        const preview = document.getElementById('notesPreview');
        if (preview.classList.contains('active')) {
            updatePreview();
        }
    });
    
    // Subject modal
    document.getElementById('closeSubjectBtn').addEventListener('click', closeSubjectEditor);
    document.getElementById('cancelSubjectBtn').addEventListener('click', closeSubjectEditor);
    document.getElementById('saveSubjectBtn').addEventListener('click', saveSubject);
    document.getElementById('deleteSubjectBtn').addEventListener('click', deleteSubject);
    document.getElementById('generateSummaryBtn').addEventListener('click', generateAISummary);
    
    // Setup autocomplete for prerequisite fields
    setupAutocomplete('subjectPrereq', 'prereqSuggestions');
    setupAutocomplete('subjectSoft', 'softSuggestions');
    setupAutocomplete('subjectCoreq', 'coreqSuggestions');
    
    // Close modals on outside click
    document.getElementById('notesModal').addEventListener('click', (e) => {
        if (e.target.id === 'notesModal') closeNotesModal();
    });
    
    document.getElementById('subjectModal').addEventListener('click', (e) => {
        if (e.target.id === 'subjectModal') closeSubjectEditor();
    });
});
