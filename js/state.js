// ==========================================
// STATE MANAGEMENT MODULE
// ==========================================
// Functions for managing application state, theme, view, and progress

// ==========================================
// THEME MANAGEMENT
// ==========================================

/**
 * Load theme preference from localStorage
 * @returns {string} Theme name ('light' or 'dark')
 */
function loadTheme() {
    const saved = localStorage.getItem('theme');
    return saved || 'dark';
}

/**
 * Save theme preference to localStorage
 * @param {string} theme - Theme name to save
 */
function saveTheme(theme) {
    localStorage.setItem('theme', theme);
}

/**
 * Toggle between light and dark themes
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    document.documentElement.setAttribute('data-theme', newTheme);
    saveTheme(newTheme);
    updateThemeButton(newTheme);
}

/**
 * Update theme toggle button appearance
 * @param {string} theme - Current theme name
 */
function updateThemeButton(theme) {
    const button = document.getElementById('themeToggle');
    if (!button) return;

    const icon = button.querySelector('.theme-icon');
    const text = button.querySelector('.theme-text');

    if (!icon || !text) return;

    if (theme === 'dark') {
        // Moon icon for dark mode
        icon.innerHTML = `
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        `;
        text.textContent = 'Dark';
    } else {
        // Sun icon for light mode
        icon.innerHTML = `
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        `;
        text.textContent = 'Light';
    }
}

/**
 * Initialize theme on page load
 */
function initializeTheme() {
    const theme = loadTheme();
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeButton(theme);
}

// ==========================================
// VIEW MANAGEMENT
// ==========================================

/**
 * Load current view preference from localStorage
 * @returns {string} View name ('dashboard' or 'catalog')
 */
function loadView() {
    const saved = localStorage.getItem('currentView');
    return saved || 'dashboard';
}

/**
 * Save current view preference to localStorage
 * @param {string} view - View name to save
 */
function saveView(view) {
    localStorage.setItem('currentView', view);
}

/**
 * Switch between dashboard and catalog views
 * @param {string} view - View to switch to ('dashboard' or 'catalog')
 */
function switchView(view) {
    currentView = view;
    saveView(view);

    // Update nav buttons
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.dataset.view === view) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Toggle view sections
    const dashboardView = document.getElementById('dashboardView');
    const catalogView = document.getElementById('catalogView');

    if (view === 'dashboard') {
        dashboardView.classList.remove('hidden');
        catalogView.classList.add('hidden');
    } else {
        dashboardView.classList.add('hidden');
        catalogView.classList.remove('hidden');
    }

    // Re-render content for the new view
    render();
}

// ==========================================
// PROGRESS TRACKING
// ==========================================

/**
 * Get progress status for a subject
 * @param {string} id - Subject ID
 * @returns {string} Progress state ('empty', 'partial', or 'complete')
 */
function getSubjectProgress(id) {
    return subjectProgress[id] || 'empty';
}

/**
 * Set progress status for a subject
 * @param {string} id - Subject ID
 * @param {string} progress - Progress state to set
 */
function setSubjectProgress(id, progress) {
    subjectProgress[id] = progress;
    markDataChanged();
    render();
}

/**
 * Cycle through progress states (empty → partial → complete → empty)
 * @param {string} id - Subject ID
 * @param {Event} event - Click event (optional)
 */
function cycleProgress(id, event) {
    if (event) {
        event.stopPropagation();
    }

    const current = getSubjectProgress(id);
    const next = {
        'empty': 'partial',
        'partial': 'complete',
        'complete': 'empty'
    };
    setSubjectProgress(id, next[current]);
}

/**
 * Cycle through project progress states
 * @param {string} subjectId - Subject ID containing the project
 * @param {number} projectIndex - Index of project in subject's projects array
 * @param {Event} event - Click event (optional)
 */
function cycleProjectProgress(subjectId, projectIndex, event) {
    if (event) event.stopPropagation();
    if (viewMode === 'public') return;

    const subject = findSubject(subjectId);
    if (!subject?.projects?.[projectIndex]) return;

    const project = subject.projects[projectIndex];
    const statusCycle = {
        'not-started': 'in-progress',
        'in-progress': 'completed',
        'completed': 'not-started'
    };

    project.status = statusCycle[project.status] || 'not-started';
    markDataChanged();
    render();
}

// ==========================================
// READINESS CALCULATION
// ==========================================

/**
 * Calculate if a subject is ready to study based on prerequisites
 * @param {Object} subject - Subject object
 * @returns {string} Readiness state ('ready', 'partial', or 'locked')
 */
function calculateReadiness(subject) {
    if (!subject.prereq || subject.prereq.length === 0) {
        return 'ready';
    }

    const prereqProgresses = subject.prereq.map(id => getSubjectProgress(id));
    const allComplete = prereqProgresses.every(p => p === 'complete');
    const someComplete = prereqProgresses.some(p => p === 'complete');

    if (allComplete) {
        return 'ready';
    } else if (someComplete) {
        return 'partial';
    } else {
        return 'locked';
    }
}

/**
 * Calculate progress statistics for a tier
 * @param {Object} tier - Tier object with subjects array
 * @returns {string} Progress string (e.g., "3/10")
 */
function calculateTierProgress(tier) {
    let total = tier.subjects.length;
    let completed = tier.subjects.filter(s => getSubjectProgress(s.id) === 'complete').length;
    return `${completed}/${total}`;
}
