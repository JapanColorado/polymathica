// Helper utilities
function findSubject(subjectId) {
    for (const tierData of Object.values(subjects)) {
        const subject = tierData.subjects.find(s => s.id === subjectId);
        if (subject) return subject;
    }
    return null;
}

function findSubjectAndTier(subjectId) {
    for (const [tierName, tierData] of Object.entries(subjects)) {
        const index = tierData.subjects.findIndex(s => s.id === subjectId);
        if (index !== -1) {
            return { tierName, tierData, subject: tierData.subjects[index], index };
        }
    }
    return null;
}

// Global variables
let subjects = {};
let subjectProgress = {};
let currentEditingSubject = null;
let currentEditingProject = null;
let currentResourceContext = null; // 'subject' or 'project'
let tempProjectResources = []; // Temporary storage for new project resources
let currentView = 'dashboard'; // 'dashboard' or 'catalog'
let viewMode = 'public'; // 'public' or 'owner'

// Load catalog from catalog.json
async function loadCatalog() {
    try {
        const response = await fetch('data/catalog.json');
        if (!response.ok) {
            throw new Error(`Failed to load catalog: ${response.status}`);
        }
        const catalog = await response.json();

        // Validate schema version
        if (catalog.schema !== '3.0') {
            throw new Error(`Unsupported catalog schema version: ${catalog.schema}`);
        }

        console.log('[App] Loaded catalog v' + catalog.catalogVersion + ' with ' + catalog.metadata.totalSubjects + ' subjects');
        return catalog;
    } catch (error) {
        console.error('[App] Failed to load catalog:', error);
        throw error;
    }
}

// Merge catalog with user data
function mergeCatalogWithUserData(catalog, userData) {
    const subjects = {};

    // 1. Build subjects from catalog (convert keyed objects → arrays for compatibility)
    for (const [tierName, tierData] of Object.entries(catalog.tiers)) {
        subjects[tierName] = {
            category: tierData.category,
            order: tierData.order,
            subjects: []
        };

        // Convert keyed subjects to array
        for (const [id, subjectDef] of Object.entries(tierData.subjects)) {
            subjects[tierName].subjects.push({
                id: id,
                name: subjectDef.name,
                prereq: subjectDef.prereq || [],
                coreq: subjectDef.coreq || [],
                soft: subjectDef.soft || [],
                summary: subjectDef.summary || '',
                goal: null,
                resources: [],
                projects: [],
                isCustom: false
            });
        }
    }

    // 2. Apply user overlays (customizations to catalog subjects)
    if (userData && userData.overlays) {
        for (const [subjectId, overlay] of Object.entries(userData.overlays)) {
            const subject = findSubjectById(subjects, subjectId);
            if (subject) {
                if (overlay.goal !== undefined) subject.goal = overlay.goal;
                if (overlay.resources !== undefined) subject.resources = overlay.resources;
                if (overlay.projects !== undefined) subject.projects = overlay.projects;
            }
        }
    }

    // 3. Add custom tiers (if any)
    if (userData && userData.customTiers) {
        for (const [tierName, tierData] of Object.entries(userData.customTiers)) {
            if (!subjects[tierName]) {
                subjects[tierName] = {
                    category: tierData.category || 'custom',
                    order: tierData.order || 999,
                    subjects: []
                };
            }
        }
    }

    // 4. Add custom subjects
    if (userData && userData.customSubjects) {
        for (const [subjectId, customSubject] of Object.entries(userData.customSubjects)) {
            const tierName = customSubject.tier || 'Other Subjects';

            // Ensure tier exists
            if (!subjects[tierName]) {
                subjects[tierName] = {
                    category: 'custom',
                    order: 999,
                    subjects: []
                };
            }

            // Add the custom subject
            subjects[tierName].subjects.push({
                id: subjectId,
                name: customSubject.name,
                prereq: customSubject.prereq || [],
                coreq: customSubject.coreq || [],
                soft: customSubject.soft || [],
                summary: customSubject.summary || '',
                goal: customSubject.goal || null,
                resources: customSubject.resources || [],
                projects: customSubject.projects || [],
                isCustom: true
            });
        }
    }

    return subjects;
}

// Helper: Find subject by ID in merged subjects
function findSubjectById(subjects, id) {
    for (const tierData of Object.values(subjects)) {
        const subject = tierData.subjects.find(s => s.id === id);
        if (subject) return subject;
    }
    return null;
}

// Load saved data (legacy localStorage fallback - deprecated)
// This function is kept for backwards compatibility but should not be used
// Data loading now happens via loadCatalog() and mergeCatalogWithUserData()
function loadAllData() {
    // Subjects - load from localStorage cache if available
    try {
        const savedSubjects = localStorage.getItem('subjects');
        subjects = savedSubjects ? JSON.parse(savedSubjects) : {};
        if (!subjects || Object.keys(subjects).length === 0) {
            subjects = {};
        }
    } catch (_) {
        subjects = {};
    }
    // Progress
    try {
        subjectProgress = JSON.parse(localStorage.getItem('subjectProgress')) || {};
    } catch (_) {
        subjectProgress = {};
    }
}

// Save functions
function saveSubjects() {
    localStorage.setItem('subjects', JSON.stringify(subjects));
}

function saveProgress() {
    localStorage.setItem('subjectProgress', JSON.stringify(subjectProgress));
}

// Load public data from GitHub (no auth required)
async function loadPublicDataFromGitHub() {
    try {
        console.log('[App] Loading public data from GitHub...');

        // Load catalog first
        const catalog = await loadCatalog();

        // Load user data from GitHub Pages
        const pagesUrl = `https://${CONFIG.github.repoOwner}.github.io/${CONFIG.github.repoName}/data/user-data.json`;
        const cacheBust = `?t=${Date.now()}`;
        console.log('[App] Fetching user data from:', pagesUrl + cacheBust);

        const response = await fetch(pagesUrl + cacheBust);

        console.log('[App] Response status:', response.status);
        if (!response.ok) {
            console.log('[App] No public data file found, using catalog only');
            // Use catalog with no user customizations
            subjects = mergeCatalogWithUserData(catalog, null);
            subjectProgress = {};
            return true;
        }

        const userData = await response.json();
        console.log('[App] Parsed user data:', userData);

        // Validate schema version (if present)
        if (userData.schema && userData.schema !== '3.0') {
            console.warn('[App] User data schema mismatch:', userData.schema);
        }

        // Merge catalog with user data
        subjects = mergeCatalogWithUserData(catalog, userData);
        console.log('[App] Merged catalog with user data');

        // Apply progress
        if (userData.progress) {
            subjectProgress = userData.progress;
            console.log('[App] Applied progress:', subjectProgress);
        } else {
            subjectProgress = {};
        }

        console.log('[App] Public data loaded successfully');
        return true;
    } catch (error) {
        console.error('[App] Failed to load public data:', error);
        return false;
    }
}

// GitHub sync integration
async function loadDataFromGitHub() {
    if (!window.githubStorage || !window.githubAuth || !githubAuth.isAuthenticated()) {
        console.log('[App] Not authenticated, using localStorage only');
        return false;
    }

    try {
        console.log('[App] Loading data from GitHub...');

        // Load catalog first
        const catalog = await loadCatalog();

        // Load user data from GitHub API
        const userData = await githubStorage.loadUserData();

        // Validate schema version (if present)
        if (userData.schema && userData.schema !== '3.0') {
            console.warn('[App] User data schema mismatch:', userData.schema);
        }

        // Merge catalog with user data
        subjects = mergeCatalogWithUserData(catalog, userData);
        console.log('[App] Merged catalog with user data');

        // Apply progress
        if (userData.progress) {
            subjectProgress = userData.progress;
        } else {
            subjectProgress = {};
        }

        // Apply theme
        if (userData.theme) {
            document.documentElement.setAttribute('data-theme', userData.theme);
            updateThemeButton(userData.theme);
        }

        // Don't override currentView from GitHub - preserve navigation state
        // The user's current page should be determined by localStorage only

        console.log('[App] Data loaded from GitHub successfully');
        return true;
    } catch (error) {
        console.error('[App] Failed to load from GitHub:', error);
        return false;
    }
}

async function saveDataToGitHub() {
    if (!window.githubStorage || !window.githubAuth || !githubAuth.isAuthenticated()) {
        console.log('[App] Not authenticated, saving to localStorage only');
        saveSubjects();
        saveProgress();
        return false;
    }

    try {
        console.log('[App] Saving data to GitHub...');

        // Build user data structure (schema 3.0)
        const userData = {
            schema: '3.0',
            lastModified: new Date().toISOString(),
            progress: subjectProgress,
            overlays: {},
            customSubjects: {},
            customTiers: {},
            theme: document.documentElement.getAttribute('data-theme') || 'light'
            // currentView is navigation state, not saved to GitHub (uses localStorage only)
        };

        // Extract user data: overlays and custom subjects
        for (const [tierName, tierData] of Object.values(subjects)) {
            for (const subject of tierData.subjects) {
                if (subject.isCustom) {
                    // This is a custom subject - save full definition
                    userData.customSubjects[subject.id] = {
                        name: subject.name,
                        tier: tierName,
                        prereq: subject.prereq || [],
                        coreq: subject.coreq || [],
                        soft: subject.soft || [],
                        summary: subject.summary || '',
                        goal: subject.goal || null,
                        resources: subject.resources || [],
                        projects: subject.projects || []
                    };

                    // Track custom tiers
                    if (tierData.order >= 999 || tierData.category === 'custom') {
                        userData.customTiers[tierName] = {
                            category: tierData.category || 'custom',
                            order: tierData.order || 999
                        };
                    }
                } else {
                    // This is a catalog subject - save only customizations (overlay)
                    const overlay = {};
                    if (subject.goal) overlay.goal = subject.goal;
                    if (subject.resources && subject.resources.length > 0) overlay.resources = subject.resources;
                    if (subject.projects && subject.projects.length > 0) overlay.projects = subject.projects;

                    if (Object.keys(overlay).length > 0) {
                        userData.overlays[subject.id] = overlay;
                    }
                }
            }
        }

        // Clean up empty objects
        if (Object.keys(userData.overlays).length === 0) delete userData.overlays;
        if (Object.keys(userData.customSubjects).length === 0) delete userData.customSubjects;
        if (Object.keys(userData.customTiers).length === 0) delete userData.customTiers;

        await githubStorage.saveUserData(userData);

        // Also save to localStorage as backup
        saveSubjects();
        saveProgress();

        updateSyncStatus();
        console.log('[App] Data saved to GitHub successfully');
        return true;
    } catch (error) {
        console.error('[App] Failed to save to GitHub:', error);
        // Still save to localStorage
        saveSubjects();
        saveProgress();
        return false;
    }
}

// Removed: saveExpandedState - no longer using expandable cards

// Theme management
function loadTheme() {
    const saved = localStorage.getItem('theme');
    return saved || 'dark';
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

function initializeTheme() {
    const theme = loadTheme();
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeButton(theme);
}

// View management
function loadView() {
    const saved = localStorage.getItem('currentView');
    return saved || 'dashboard';
}

function saveView(view) {
    localStorage.setItem('currentView', view);
}

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

// Subject progress functions
function getSubjectProgress(id) {
    return subjectProgress[id] || 'empty';
}

function setSubjectProgress(id, progress) {
    subjectProgress[id] = progress;
    saveProgress();
    render();
}

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
    saveSubjects();
    render();
}

// Expand/Collapse state management
// Removed: toggleSubjectExpanded, isSubjectExpanded, toggleProjectExpanded, isProjectExpanded
// No longer using expandable/collapsible subject cards - content always visible

// Calculate readiness
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

// Stats calculation
// Removed: calculateStats() and updateStats() - old UI stats display (not used)

function calculateTierProgress(tier) {
    let total = tier.subjects.length;
    let completed = tier.subjects.filter(s => getSubjectProgress(s.id) === 'complete').length;
    return `${completed}/${total}`;
}

// Rendering functions
function renderDependenciesInCard(subject) {
    if (!subject.prereq && !subject.soft && !subject.coreq) return '';

    let html = '<div class="dependencies">';

    if (subject.prereq && subject.prereq.length > 0) {
        const items = subject.prereq.map(id => {
            const completed = getSubjectProgress(id) === 'complete';
            return `<span class="dependency-item prereq-required ${completed ? 'completed' : ''}">${id}</span>`;
        }).join('');
        html += `
            <div class="dependency-section">
                <div class="dependency-label">Prerequisites (Required)</div>
                <div class="dependency-list">${items}</div>
            </div>`;
    }

    if (subject.soft && subject.soft.length > 0) {
        const items = subject.soft.map(id => {
            const completed = getSubjectProgress(id) === 'complete';
            return `<span class="dependency-item prereq-recommended ${completed ? 'completed' : ''}">${id}</span>`;
        }).join('');
        html += `
            <div class="dependency-section">
                <div class="dependency-label">Recommended Background</div>
                <div class="dependency-list">${items}</div>
            </div>`;
    }

    if (subject.coreq && subject.coreq.length > 0) {
        const items = subject.coreq.map(id => {
            const completed = getSubjectProgress(id) === 'complete';
            return `<span class="dependency-item coreq ${completed ? 'completed' : ''}">${id}</span>`;
        }).join('');
        html += `
            <div class="dependency-section">
                <div class="dependency-label">Corequisites</div>
                <div class="dependency-list">${items}</div>
            </div>`;
    }

    html += '</div>';
    return html;
}

function renderProjectsInCard(projects, subjectId) {
    if (!projects || projects.length === 0) return '';

    return `<div class="projects-list">${projects.map((project, index) => {
        // Map old status to new progress values
        const progress = {
            'not-started': 'empty',
            'in-progress': 'partial',
            'completed': 'complete'
        }[project.status] || 'empty';

        return `
            <div class="project-mini-card ${progress}" onclick="editProject('${subjectId}', ${index}, event)">
                <span class="project-name">
                    ${project.name}
                </span>
                <div class="project-progress-checkbox ${progress}"
                     onclick="cycleProjectProgress('${subjectId}', ${index}, event)">
                </div>
            </div>
        `;
    }).join('')}</div>`;
}

function renderSubjectCard(subject) {
    const progress = getSubjectProgress(subject.id);
    const readiness = calculateReadiness(subject);
    const isPublicMode = viewMode === 'public';

    let cardClasses = `subject-card ${progress}`;
    if (readiness === 'locked') cardClasses += ' locked';

    // Public mode: Show everything read-only (no edit access)
    if (isPublicMode) {
        return `
            <div class="${cardClasses}" data-id="${subject.id}" onclick="openSubjectDetail('${subject.id}', event)" style="cursor: pointer;">
                <div class="subject-card-header">
                    <span class="subject-name">${subject.name}</span>
                    <div class="progress-checkbox ${progress}" style="pointer-events: none;"></div>
                </div>
                <div class="subject-card-content">
                    ${subject.goal ? `
                        <div class="card-section">
                            <span class="card-section-label">Goal</span>
                            <div class="card-goal">${subject.goal}</div>
                        </div>
                    ` : ''}

                    ${subject.resources && subject.resources.length > 0 ? `
                        <div class="card-section">
                            <span class="card-section-label">Resources</span>
                            <div class="resources-list">
                                ${subject.resources.map(r => `
                                    <div class="resource-item ${r.type === 'text' ? 'text-resource' : ''}">
                                        ${r.type === 'link' ?
                                            `<a href="${r.url}" target="_blank" rel="noopener">${r.value}</a>` :
                                            `<span>${r.value}</span>`
                                        }
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    ${subject.projects && subject.projects.length > 0 ? `
                        <div class="card-section">
                            <span class="card-section-label">Projects</span>
                            ${renderProjectsInCard(subject.projects, subject.id)}
                        </div>
                    ` : ''}

                    ${renderDependenciesInCard(subject)}
                </div>
            </div>
        `;
    }

    // Owner mode - show full details with edit access
    return `
        <div class="${cardClasses}" data-id="${subject.id}" onclick="openSubjectDetail('${subject.id}', event)" style="cursor: pointer;">
            <div class="subject-card-header">
                <span class="subject-name">${subject.name}</span>
                <div class="progress-checkbox ${progress}" onclick="cycleProgress('${subject.id}', event)"></div>
            </div>
            <div class="subject-card-content">
                ${subject.goal ? `
                    <div class="card-section">
                        <span class="card-section-label">Goal</span>
                        <div class="card-goal">${subject.goal}</div>
                    </div>
                ` : ''}

                ${subject.resources && subject.resources.length > 0 ? `
                    <div class="card-section">
                        <span class="card-section-label">Resources</span>
                        <div class="resources-list">
                            ${subject.resources.map(r => `
                                <div class="resource-item ${r.type === 'text' ? 'text-resource' : ''}">
                                    ${r.type === 'link' ?
                                        `<a href="${r.url}" target="_blank" rel="noopener">${r.value}</a>` :
                                        `<span>${r.value}</span>`
                                    }
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                ${subject.projects && subject.projects.length > 0 ? `
                    <div class="card-section">
                        <span class="card-section-label">Projects</span>
                        ${renderProjectsInCard(subject.projects, subject.id)}
                    </div>
                ` : ''}

                ${renderDependenciesInCard(subject)}
            </div>
        </div>
    `;
}

function renderSubjectCardExpanded(subject) {
    const progress = getSubjectProgress(subject.id);
    const readiness = calculateReadiness(subject);
    const isPublicMode = viewMode === 'public';

    let cardClasses = `subject-card expanded ${progress}`;
    if (readiness === 'locked') cardClasses += ' locked';

    let html = `<div class="${cardClasses}" data-id="${subject.id}" onclick="openSubjectDetail('${subject.id}', event)">`;

    // Header with title and checkbox
    html += `<div class="card-header">`;
    html += `<h3 class="subject-title">${subject.name}</h3>`;

    // Checkbox: clickable in owner mode, static in public mode
    if (isPublicMode) {
        html += `<div class="progress-checkbox ${progress}" style="pointer-events: none;"></div>`;
    } else {
        html += `<div class="progress-checkbox ${progress}" onclick="cycleProgress('${subject.id}', event)"></div>`;
    }
    html += `</div>`;

    // Summary (if exists - now comes from catalog)
    const summary = subject.summary;
    if (summary) {
        const isTruncated = summary.length > 200;
        const displaySummary = isTruncated ? summary.substring(0, 200) + '...' : summary;

        html += `<div class="card-section summary-section">
                   <strong>Summary:</strong>
                   <span class="summary-text" data-full-text="${isTruncated ? 'true' : 'false'}">
                       ${displaySummary}
                   </span>
                   ${isTruncated ? '<button class="expand-summary-btn" onclick="toggleSummary(event)">Read More</button>' : ''}
                 </div>`;
    }

    // Goal (if exists)
    if (subject.goal) {
        html += `<div class="card-section">
                   <strong>Goal:</strong> ${subject.goal}
                 </div>`;
    }

    // Resources (if any, show first 3 inline)
    if (subject.resources && subject.resources.length > 0) {
        html += `<div class="card-section">`;
        html += `<strong>Resources:</strong>`;
        html += `<div class="resources-list-inline">`;
        subject.resources.slice(0, 3).forEach(resource => {
            if (resource.type === 'link') {
                html += `<a href="${resource.url}" target="_blank" rel="noopener"
                            onclick="event.stopPropagation()" class="resource-link-inline">
                           ${resource.value}
                         </a>`;
            } else {
                html += `<span class="resource-text-inline">${resource.value}</span>`;
            }
        });
        if (subject.resources.length > 3) {
            html += `<span class="more-indicator">+${subject.resources.length - 3} more</span>`;
        }
        html += `</div></div>`;
    }

    // Projects (full mini-cards with goals and resources)
    if (subject.projects && subject.projects.length > 0) {
        html += `<div class="card-section">`;
        html += `<strong>Projects:</strong>`;
        html += `<div class="projects-list-expanded">`;
        subject.projects.forEach((project, index) => {
            const projectProgress = {
                'not-started': 'empty',
                'in-progress': 'partial',
                'completed': 'complete'
            }[project.status] || 'empty';

            // In public mode, use viewProject instead of editProject
            const projectClickHandler = isPublicMode
                ? `onclick="viewProject(${index}, event)"`
                : `onclick="editProject('${subject.id}', ${index}, event)"`;

            html += `<div class="project-card-expanded ${projectProgress}" ${projectClickHandler}>`;
            html += `<div class="project-header">`;
            html += `<span class="project-name">
                       ${project.name}
                     </span>`;

            // Project checkbox: static in public mode
            if (isPublicMode) {
                html += `<div class="project-progress-checkbox ${projectProgress}" style="pointer-events: none;"></div>`;
            } else {
                html += `<div class="project-progress-checkbox ${projectProgress}"
                              onclick="cycleProjectProgress('${subject.id}', ${index}, event)">
                         </div>`;
            }
            html += `</div>`;

            if (project.goal) {
                html += `<div class="project-goal">${project.goal}</div>`;
            }

            if (project.resources && project.resources.length > 0) {
                html += `<div class="project-resources-mini">`;
                project.resources.slice(0, 2).forEach(resource => {
                    if (resource.type === 'link') {
                        html += `<a href="${resource.url}" target="_blank" rel="noopener"
                                    onclick="event.stopPropagation()" class="resource-link-mini">
                                   ${resource.value}
                                 </a>`;
                    }
                });
                if (project.resources.length > 2) {
                    html += `<span class="more-indicator">+${project.resources.length - 2}</span>`;
                }
                html += `</div>`;
            }

            html += `</div>`;
        });
        html += `</div></div>`;
    }

    html += `</div>`;
    return html;
}

function toggleSummary(event) {
    event.stopPropagation();
    const button = event.target;
    const summaryText = button.previousElementSibling;
    const card = button.closest('.subject-card');
    const subjectId = card.dataset.id;
    const subject = findSubject(subjectId);

    if (!subject || !subject.summary) return;

    const isExpanded = button.textContent === 'Read Less';

    if (isExpanded) {
        // Collapse
        const truncated = subject.summary.substring(0, 200) + '...';
        summaryText.textContent = truncated;
        button.textContent = 'Read More';
        summaryText.classList.remove('expanded');
    } else {
        // Expand
        summaryText.textContent = subject.summary;
        button.textContent = 'Read Less';
        summaryText.classList.add('expanded');
    }
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
    if (!content) return;
    let html = '';
    const isPublicMode = viewMode === 'public';

    // Public mode: Show banner at top
    if (isPublicMode) {
        html += `
            <div class="public-view-banner">
                📚 You're viewing a public learning catalog.
                <a href="https://github.com/${CONFIG.github.repoOwner}/${CONFIG.github.repoName}">Fork this tracker</a>
                to create your own personalized version!
            </div>
        `;
    }

    // Render dashboard or catalog based on currentView (works for both modes now)
    if (currentView === 'dashboard') {
        const currentSubjects = [];
        const completedSubjects = [];
        Object.values(subjects).forEach(tierData => {
            tierData.subjects.forEach(subject => {
                const progress = getSubjectProgress(subject.id);
                if (progress === 'partial') currentSubjects.push(subject);
                else if (progress === 'complete') completedSubjects.push(subject);
            });
        });
        // Current section - expanded view with 2-column grid
        html += '<div class="dashboard-section"><h2 class="section-title">Current</h2>';
        if (currentSubjects.length) {
            html += '<div class="subjects-grid dashboard-current-grid">';
            html += currentSubjects.map(renderSubjectCardExpanded).join('');
            html += '</div>';
        } else {
            if (isPublicMode) {
                html += '<p class="empty-state">No subjects currently in progress.</p>';
            } else {
                html += '<p class="empty-state">No subjects in progress. Visit the <a href="#" onclick="switchView(\'catalog\'); return false;">Catalog</a> to get started!</p>';
            }
        }
        html += '</div>';

        // Completed section - normal grid
        html += '<div class="dashboard-section"><h2 class="section-title">Completed</h2>';
        if (completedSubjects.length) {
            html += '<div class="subjects-grid">';
            html += completedSubjects.map(renderSubjectCard).join('');
            html += '</div>';
        } else {
            html += '<p class="empty-state">No completed subjects yet.</p>';
        }
        html += '</div>';
    } else {
        html += Object.entries(subjects).map(([name, data]) => renderTier(name, data, false)).join('');
    }

    content.innerHTML = html;
    if (currentView === 'catalog' || viewMode === 'public') applyFilters();
}

function applyFilters() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('statusFilter')?.value || 'all';
    const categoryFilter = document.getElementById('categoryFilter')?.value || 'all';
    document.querySelectorAll('.subject-card').forEach(card => {
        const text = card.textContent.toLowerCase();
        const id = card.dataset.id;
        const progress = getSubjectProgress(id);
        const statusMatch = statusFilter === 'all' ||
            (statusFilter === 'not-started' && progress === 'empty') ||
            (statusFilter === 'in-progress' && progress === 'partial') ||
            (statusFilter === 'completed' && progress === 'complete');
        const subjectInfo = findSubjectAndTier(id);
        const category = subjectInfo ? subjectInfo.tierData.category : 'general';
        const matchesSearch = !searchTerm || text.includes(searchTerm);
        const matchesCategory = categoryFilter === 'all' || category === categoryFilter;
        if (matchesSearch && statusMatch && matchesCategory) card.classList.remove('hidden'); else card.classList.add('hidden');
    });
    document.querySelectorAll('.tier').forEach(tier => {
        const visibleCards = tier.querySelectorAll('.subject-card:not(.hidden)');
        tier.classList.toggle('hidden', visibleCards.length === 0);
    });
}

// Subject Detail Modal
function openSubjectDetail(subjectId, event) {
    if (event) event.stopPropagation();
    currentEditingSubject = subjectId;
    const subject = findSubject(subjectId);
    if (!subject) return;

    const isPublicMode = viewMode === 'public';

    // Set title
    document.getElementById('detailModalTitle').textContent = subject.name;

    // Summary field - display from catalog (read-only) or allow editing for custom subjects
    const summaryField = document.getElementById('subjectSummary');
    summaryField.value = subject.summary || '';

    // Summary is read-only for public mode OR for catalog subjects (non-custom)
    // Only custom subjects can have editable summaries in owner mode
    summaryField.readOnly = isPublicMode || !subject.isCustom;

    // Dependencies - render prerequisites, co-requisites, and recommendations
    const depsContent = document.getElementById('dependenciesContent');
    depsContent.innerHTML = renderDependenciesInModal(subject);

    // Goal field
    const goalField = document.getElementById('subjectGoal');
    goalField.value = subject.goal || '';
    goalField.readOnly = isPublicMode;

    // Resources list
    renderResourcesList(subject.resources || [], 'resourcesList', 'subject');

    // Projects list
    renderProjectsList(subject.projects || []);

    // Show/hide edit controls based on mode
    const addResourceBtn = document.getElementById('addSubjectResourceBtn');
    const addProjectBtn = document.getElementById('addProjectBtn');
    const saveBtn = document.getElementById('saveDetailBtn');
    const cancelBtn = document.getElementById('cancelDetailBtn');
    const deleteBtn = document.getElementById('deleteSubjectBtn');

    if (isPublicMode) {
        addResourceBtn.style.display = 'none';
        addProjectBtn.style.display = 'none';
        saveBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
        deleteBtn.style.display = 'none';
    } else {
        addResourceBtn.style.display = 'block';
        addProjectBtn.style.display = 'block';
        saveBtn.style.display = 'inline-block';
        cancelBtn.style.display = 'inline-block';

        // Show delete button ONLY for custom subjects in owner mode
        if (subject.isCustom) {
            deleteBtn.style.display = 'inline-block';
        } else {
            deleteBtn.style.display = 'none';
        }
    }

    document.getElementById('subjectDetailModal').classList.add('active');
}

function closeSubjectDetail() {
    document.getElementById('subjectDetailModal').classList.remove('active');
    currentEditingSubject = null;
}

function saveSubjectDetail() {
    if (!currentEditingSubject) return;
    const subject = findSubject(currentEditingSubject);
    if (!subject) return;

    // Save summary (only for custom subjects)
    if (subject.isCustom) {
        const summary = document.getElementById('subjectSummary').value.trim();
        subject.summary = summary || '';
    }
    // For catalog subjects, summary is read-only and comes from catalog.json

    // Save goal
    const goal = document.getElementById('subjectGoal').value.trim();
    if (goal) {
        subject.goal = goal;
    } else {
        subject.goal = null;
    }

    saveSubjects();

    // If authenticated, sync to GitHub
    if (window.githubAuth && githubAuth.isAuthenticated()) {
        saveDataToGitHub();
    }

    closeSubjectDetail();
    render();
}

// Render Dependencies in Modal
function renderDependenciesInModal(subject) {
    const sections = [];

    if (subject.prereq && subject.prereq.length > 0) {
        const prereqs = subject.prereq
            .map(id => findSubject(id))
            .filter(s => s)
            .map(s => `<span class="dep-tag prereq">${s.name}</span>`)
            .join('');
        sections.push(`<div class="dep-section"><strong>Prerequisites:</strong> ${prereqs}</div>`);
    }

    if (subject.coreq && subject.coreq.length > 0) {
        const coreqs = subject.coreq
            .map(id => findSubject(id))
            .filter(s => s)
            .map(s => `<span class="dep-tag coreq">${s.name}</span>`)
            .join('');
        sections.push(`<div class="dep-section"><strong>Co-requisites:</strong> ${coreqs}</div>`);
    }

    if (subject.soft && subject.soft.length > 0) {
        const softs = subject.soft
            .map(id => findSubject(id))
            .filter(s => s)
            .map(s => `<span class="dep-tag soft">${s.name}</span>`)
            .join('');
        sections.push(`<div class="dep-section"><strong>Recommended:</strong> ${softs}</div>`);
    }

    return sections.length > 0
        ? sections.join('')
        : '<p class="empty-state">No prerequisites or recommendations</p>';
}

// Resource Management
function renderResourcesList(resources, containerId, type) {
    const container = document.getElementById(containerId);
    const isPublicMode = viewMode === 'public';

    if (!resources || resources.length === 0) {
        container.innerHTML = '<p class="empty-state">No resources yet</p>';
        return;
    }

    container.innerHTML = resources.map((resource, index) => {
        const displayContent = resource.type === 'link' ?
            `<a href="${resource.url}" target="_blank" rel="noopener" class="resource-link">${resource.value}</a>` :
            `<span class="resource-text">${resource.value}</span>`;

        const deleteButton = isPublicMode ? '' : `<button class="remove-btn" onclick="removeResource(${index}, '${type}')">×</button>`;

        return `
            <div class="resource-item">
                ${displayContent}
                ${deleteButton}
            </div>
        `;
    }).join('');
}

function addResource(type) {
    currentResourceContext = type;
    document.getElementById('resourceText').value = '';
    document.getElementById('resourceUrl').value = '';
    document.getElementById('resourceModal').classList.add('active');
}

function closeResourceModal() {
    document.getElementById('resourceModal').classList.remove('active');
    currentResourceContext = null;
}

function saveResource() {
    const text = document.getElementById('resourceText').value.trim();
    if (!text) {
        alert('Please enter a resource title/description');
        return;
    }

    const url = document.getElementById('resourceUrl').value.trim();
    const resource = {
        type: url ? 'link' : 'text',
        value: text
    };

    if (url) {
        resource.url = url;
    }

    if (currentResourceContext === 'subject' && currentEditingSubject) {
        const subject = findSubject(currentEditingSubject);
        if (!subject) return;
        subject.resources = subject.resources || [];
        subject.resources.push(resource);
        renderResourcesList(subject.resources, 'resourcesList', 'subject');
        saveSubjects();
    } else if (currentResourceContext === 'project' && currentEditingProject) {
        if (currentEditingProject === 'new') {
            // Adding resource to a new (unsaved) project
            tempProjectResources.push(resource);
            renderResourcesList(tempProjectResources, 'projectResourcesList', 'project');
        } else {
            // Adding resource to existing project
            const projectIndex = parseInt(currentEditingProject.split('-').pop());
            const subject = findSubject(currentEditingSubject);
            if (!subject || !subject.projects || !subject.projects[projectIndex]) return;
            const project = subject.projects[projectIndex];
            project.resources = project.resources || [];
            project.resources.push(resource);
            renderResourcesList(project.resources, 'projectResourcesList', 'project');
            saveSubjects();
        }
    }

    closeResourceModal();
}

function removeResource(index, type) {
    if (!confirm('Remove this resource?')) return;
    if (type === 'subject' && currentEditingSubject) {
        const subject = findSubject(currentEditingSubject);
        if (!subject || !subject.resources) return;
        subject.resources.splice(index, 1);
        renderResourcesList(subject.resources, 'resourcesList', 'subject');
        saveSubjects();
    } else if (type === 'project' && currentEditingProject) {
        if (currentEditingProject === 'new') {
            // Removing from temporary resources
            tempProjectResources.splice(index, 1);
            renderResourcesList(tempProjectResources, 'projectResourcesList', 'project');
        } else {
            // Removing from existing project
            const projectIndex = parseInt(currentEditingProject.split('-').pop());
            const subject = findSubject(currentEditingSubject);
            if (!subject || !subject.projects || !subject.projects[projectIndex] || !subject.projects[projectIndex].resources) return;
            subject.projects[projectIndex].resources.splice(index, 1);
            renderResourcesList(subject.projects[projectIndex].resources, 'projectResourcesList', 'project');
            saveSubjects();
        }
    }
}

// Project Management
function renderProjectsList(projects) {
    const container = document.getElementById('projectsList');
    const isPublicMode = viewMode === 'public';

    if (!projects || projects.length === 0) {
        container.innerHTML = '<p class="empty-state">No projects yet</p>';
        return;
    }

    container.innerHTML = projects.map((project, index) => {
        const actions = isPublicMode
            ? `<span class="project-status-badge">${project.status}</span>`
            : `
                <span class="project-status-badge">${project.status}</span>
                <button onclick="editProject(${index}, event)">Edit</button>
                <button class="remove-btn" onclick="removeProject(${index}, event)">Delete</button>
            `;

        const clickHandler = isPublicMode ? `onclick="viewProject(${index}, event)"` : ``;
        const cursorStyle = isPublicMode ? `style="cursor: pointer;"` : ``;

        return `
            <div class="project-item" ${clickHandler} ${cursorStyle}>
                <div class="project-header">
                    <span class="project-name">${project.name}</span>
                    <div class="project-actions">
                        ${actions}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function addProject() {
    if (!currentEditingSubject) return;

    // Set to 'new' to indicate we're adding a new project
    currentEditingProject = 'new';

    // Clear temporary resources
    tempProjectResources = [];

    // Clear the form
    document.getElementById('projectModalTitle').textContent = 'Add New Project';
    document.getElementById('projectName').value = '';
    document.getElementById('projectGoal').value = '';
    document.getElementById('deleteProjectBtn').style.display = 'none'; // Hide delete button for new projects

    // Clear resources list
    document.getElementById('projectResourcesList').innerHTML = '<p class="empty-state">No resources yet</p>';

    // Show the modal
    document.getElementById('projectDetailModal').classList.add('active');
}

function editProject(subjectId, projectIndex, event) {
    if (event) event.stopPropagation();

    currentEditingSubject = subjectId;
    currentEditingProject = `${subjectId}-${projectIndex}`;

    const subject = findSubject(subjectId);
    if (!subject || !subject.projects || !subject.projects[projectIndex]) return;

    const project = subject.projects[projectIndex];
    const isPublicMode = viewMode === 'public';

    // Populate modal
    document.getElementById('projectModalTitle').textContent = 'Edit Project';
    document.getElementById('projectName').value = project.name;
    document.getElementById('projectGoal').value = project.goal;
    document.getElementById('projectName').readOnly = isPublicMode;
    document.getElementById('projectGoal').readOnly = isPublicMode;

    renderResourcesList(project.resources || [], 'projectResourcesList', 'project');

    // Show/hide controls
    const addResourceBtn = document.getElementById('addProjectResourceBtn');
    const saveBtn = document.getElementById('saveProjectBtn');
    const cancelBtn = document.getElementById('cancelProjectBtn');
    const deleteBtn = document.getElementById('deleteProjectBtn');

    if (isPublicMode) {
        addResourceBtn.style.display = 'none';
        saveBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
        deleteBtn.style.display = 'none';
    } else {
        addResourceBtn.style.display = 'block';
        saveBtn.style.display = 'inline-block';
        cancelBtn.style.display = 'inline-block';
        deleteBtn.style.display = 'inline-block';
    }

    document.getElementById('projectDetailModal').classList.add('active');
}

function viewProject(projectIndex, event) {
    if (event) event.stopPropagation();
    if (!currentEditingSubject) return;
    currentEditingProject = `${currentEditingSubject}-${projectIndex}`;
    const subject = findSubject(currentEditingSubject);
    if (!subject || !subject.projects || !subject.projects[projectIndex]) return;
    const project = subject.projects[projectIndex];

    document.getElementById('projectModalTitle').textContent = project.name;
    document.getElementById('projectName').value = project.name;
    document.getElementById('projectGoal').value = project.goal;

    // Make fields read-only (public mode)
    document.getElementById('projectName').readOnly = true;
    document.getElementById('projectGoal').readOnly = true;

    renderResourcesList(project.resources || [], 'projectResourcesList', 'project');

    // Hide all edit controls (public mode)
    document.getElementById('addProjectResourceBtn').style.display = 'none';
    document.getElementById('saveProjectBtn').style.display = 'none';
    document.getElementById('cancelProjectBtn').style.display = 'none';
    document.getElementById('deleteProjectBtn').style.display = 'none';

    document.getElementById('projectDetailModal').classList.add('active');
}

function removeProject(projectIndex, event) {
    if (event) event.stopPropagation();
    if (!currentEditingSubject) return;
    if (!confirm('Delete this project? This cannot be undone.')) return;
    const subject = findSubject(currentEditingSubject);
    if (!subject || !subject.projects) return;
    subject.projects.splice(projectIndex, 1);
    renderProjectsList(subject.projects);
    saveSubjects();
    render();
}

function deleteCustomSubject() {
    if (!currentEditingSubject) return;

    const subject = findSubject(currentEditingSubject);
    if (!subject) return;

    // Safety check: only allow deleting custom subjects
    if (!subject.isCustom) {
        alert('Cannot delete catalog subjects. Only custom subjects can be deleted.');
        return;
    }

    // Check for dependencies
    const dependencies = findDependentSubjects(currentEditingSubject);
    if (dependencies.length > 0) {
        const depNames = dependencies.map(s => s.name).join(', ');
        if (!confirm(`Warning: The following subjects list this as a prerequisite or dependency:\n\n${depNames}\n\nDeleting this subject may affect these subjects. Continue anyway?`)) {
            return;
        }
    }

    // Final confirmation
    if (!confirm(`Are you sure you want to delete "${subject.name}"?\n\nThis will permanently remove:\n- All progress data\n- Goals and resources\n- All projects\n\nThis action cannot be undone.`)) {
        return;
    }

    // Find and remove from subjects structure
    const tierInfo = findSubjectAndTier(currentEditingSubject);
    if (tierInfo) {
        tierInfo.tierData.subjects.splice(tierInfo.index, 1);

        // If tier is now empty and was custom, remove the tier too
        if (tierInfo.tierData.subjects.length === 0 &&
            (tierInfo.tierData.category === 'custom' || tierInfo.tierData.order >= 999)) {
            delete subjects[tierInfo.tierName];
        }
    }

    // Remove progress data
    delete subjectProgress[currentEditingSubject];

    // Save changes
    saveSubjects();
    saveProgress();

    // If authenticated, sync to GitHub
    if (window.githubAuth && githubAuth.isAuthenticated()) {
        saveDataToGitHub();
    }

    // Close modal and re-render
    closeSubjectDetail();
    render();

    alert(`"${subject.name}" has been deleted.`);
}

// Helper function to find subjects that depend on this subject
function findDependentSubjects(subjectId) {
    const dependents = [];

    for (const tierData of Object.values(subjects)) {
        for (const subject of tierData.subjects) {
            if (subject.prereq && subject.prereq.includes(subjectId)) {
                dependents.push(subject);
            } else if (subject.coreq && subject.coreq.includes(subjectId)) {
                dependents.push(subject);
            } else if (subject.soft && subject.soft.includes(subjectId)) {
                dependents.push(subject);
            }
        }
    }

    return dependents;
}

// Project Detail Modal
function closeProjectDetail() {
    document.getElementById('projectDetailModal').classList.remove('active');
    currentEditingProject = null;
}

function saveProjectDetail() {
    if (!currentEditingProject) return;

    const name = document.getElementById('projectName').value.trim();
    const goal = document.getElementById('projectGoal').value.trim();

    if (!name) { alert('Project name is required'); return; }
    if (!goal) { alert('Project goal is required'); return; }

    const subject = findSubject(currentEditingSubject);
    if (!subject) return;

    if (currentEditingProject === 'new') {
        // Adding a new project
        const project = {
            id: `${currentEditingSubject}-project-${Date.now()}`,
            name: name,
            goal: goal,
            resources: [...tempProjectResources], // Include any resources added before saving
            status: 'not-started'
        };
        subject.projects = subject.projects || [];
        subject.projects.push(project);
        tempProjectResources = []; // Clear temporary resources
    } else {
        // Editing existing project
        const projectIndex = parseInt(currentEditingProject.split('-').pop());
        if (!subject.projects || !subject.projects[projectIndex]) return;
        const project = subject.projects[projectIndex];
        project.name = name;
        project.goal = goal;
    }

    saveSubjects();
    closeProjectDetail();
    renderProjectsList(subject.projects);
    render();
}

function deleteCurrentProject() {
    if (!currentEditingProject) return;
    if (!confirm('Delete this project? This cannot be undone.')) return;
    const projectIndex = parseInt(currentEditingProject.split('-').pop());
    const subject = findSubject(currentEditingSubject);
    if (!subject || !subject.projects) return;
    subject.projects.splice(projectIndex, 1);
    saveSubjects();
    closeProjectDetail();
    renderProjectsList(subject.projects);
    render();
}

// ==========================================
// Authentication & Sync UI
// ==========================================

async function updateViewMode() {
    if (window.githubAuth && await githubAuth.isOwner()) {
        viewMode = CONFIG.app.viewModes.OWNER;
    } else {
        viewMode = CONFIG.app.viewModes.PUBLIC;
    }
    updateSettingsButtonVisibility();
    render();
}

function updateAuthButton() {
    const authButton = document.getElementById('authButton');
    const syncStatus = document.getElementById('syncStatus');

    if (window.githubAuth && githubAuth.isAuthenticated()) {
        authButton.textContent = githubAuth.username || 'Signed In';
        authButton.classList.add('signed-in');
        authButton.onclick = () => {
            if (confirm('Sign out?')) {
                githubAuth.logout();
            }
        };
        syncStatus.classList.remove('hidden');
    } else {
        authButton.textContent = 'Sign In';
        authButton.classList.remove('signed-in');
        authButton.onclick = openAuthModal;
        syncStatus.classList.add('hidden');
    }
}

function updateSettingsButtonVisibility() {
    const settingsButton = document.getElementById('settingsButton');
    if (settingsButton) {
        settingsButton.style.display = viewMode === 'public' ? 'none' : 'block';
    }
}

function updateSyncStatus() {
    if (!window.githubStorage) return;

    const syncStatus = document.getElementById('syncStatus');
    const syncStatusText = document.getElementById('syncStatusText');
    const status = githubStorage.getSyncStatus();

    syncStatus.className = 'sync-status';
    if (status.status === 'offline') {
        syncStatus.classList.add('hidden');
    } else {
        syncStatus.classList.remove('hidden');
        syncStatusText.textContent = status.message;

        if (status.status === 'syncing') {
            syncStatus.classList.add('syncing');
        } else if (status.status === 'error') {
            syncStatus.classList.add('error');
        } else if (status.status === 'synced') {
            syncStatus.classList.add('success');
        }
    }
}

function openAuthModal() {
    document.getElementById('authModal').classList.add('active');
    document.getElementById('githubToken').value = '';
    document.getElementById('githubToken').focus();
}

function closeAuthModal() {
    document.getElementById('authModal').classList.remove('active');
}

async function saveToken() {
    const token = document.getElementById('githubToken').value.trim();

    if (!token) {
        alert('Please enter a token');
        return;
    }

    if (!window.githubAuth) {
        alert('GitHub auth system not initialized');
        return;
    }

    // Set the token
    githubAuth.setToken(token);

    // Validate it
    const isValid = await githubAuth.validateToken();
    if (!isValid) {
        alert('Invalid token. Please check and try again.');
        githubAuth.clearAuthData();
        return;
    }

    // Check if user is owner
    const isOwner = await githubAuth.isOwner();
    if (!isOwner) {
        alert(`You are signed in as ${githubAuth.username}, but this tracker belongs to ${CONFIG.github.repoOwner}. You can view but not edit.`);
    }

    closeAuthModal();
    updateAuthButton();
    await updateViewMode();

    // Load data from GitHub
    const loaded = await loadDataFromGitHub();
    if (loaded) {
        render();
    }

    // Start auto-sync
    if (window.githubStorage && CONFIG.features.enableAutoSync) {
        githubStorage.startAutoSync();
    }
}

function updateSyncStatusInSettings() {
    if (!window.githubStorage) return;

    const syncIcon = document.getElementById('syncIconLarge');
    const syncMessage = document.getElementById('syncMessage');
    const syncDetails = document.getElementById('syncDetails');

    if (!syncIcon || !syncMessage || !syncDetails) return;

    const status = githubStorage.getSyncStatus();

    // Clear previous state classes
    syncIcon.className = 'sync-icon-large';

    // Update based on status
    if (status.status === 'syncing') {
        syncIcon.classList.add('syncing');
        syncMessage.textContent = 'Syncing...';
        syncMessage.className = 'sync-message syncing';
    } else if (status.status === 'error') {
        syncMessage.textContent = 'Sync Error';
        syncMessage.className = 'sync-message error';
    } else if (status.status === 'synced') {
        syncMessage.textContent = 'Synced';
        syncMessage.className = 'sync-message success';
    } else {
        syncMessage.textContent = status.message;
        syncMessage.className = 'sync-message';
    }

    // Update details
    if (githubStorage.cache.lastFetch) {
        const lastSync = new Date(githubStorage.cache.lastFetch);
        syncDetails.textContent = `Last synced: ${lastSync.toLocaleString()}`;
    } else {
        syncDetails.textContent = 'Never synced';
    }
}

async function manualSync() {
    if (!window.githubStorage || !window.githubAuth || !githubAuth.isAuthenticated()) {
        alert('Please sign in first');
        return;
    }

    try {
        // Update UI to show syncing
        updateSyncStatusInSettings();

        await saveDataToGitHub();

        // Update UI after sync
        updateSyncStatusInSettings();
        alert('Sync complete!');
    } catch (error) {
        updateSyncStatusInSettings();
        alert('Sync failed: ' + error.message);
    }
}

// Settings Modal Functions
function openSettingsModal() {
    if (viewMode === 'public') {
        console.warn('[Settings] Settings not available in public mode');
        return;
    }

    // Show/hide sync section based on authentication
    const syncSection = document.getElementById('syncStatusSection');
    const isAuthenticated = window.githubAuth && githubAuth.isAuthenticated();

    if (syncSection) {
        syncSection.style.display = isAuthenticated ? 'block' : 'none';
    }

    // Update sync status display if authenticated
    if (isAuthenticated) {
        updateSyncStatusInSettings();
    }

    document.getElementById('settingsModal').classList.add('active');
}

function closeSettingsModal() {
    document.getElementById('settingsModal').classList.remove('active');
}

function exportData() {
    // Build complete export data (schema 3.0)
    const exportData = {
        schema: '3.0',
        exportDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        progress: subjectProgress,
        overlays: {},
        customSubjects: {},
        customTiers: {},
        theme: document.documentElement.getAttribute('data-theme') || 'light'
    };

    // Extract all subject customizations and custom subjects
    for (const [tierName, tierData] of Object.entries(subjects)) {
        for (const subject of tierData.subjects) {
            if (subject.isCustom) {
                // This is a custom subject - export full definition
                exportData.customSubjects[subject.id] = {
                    name: subject.name,
                    tier: tierName,
                    prereq: subject.prereq || [],
                    coreq: subject.coreq || [],
                    soft: subject.soft || [],
                    summary: subject.summary || '',
                    goal: subject.goal || null,
                    resources: subject.resources || [],
                    projects: subject.projects || []
                };

                // Track custom tiers
                if (tierData.order >= 999 || tierData.category === 'custom') {
                    exportData.customTiers[tierName] = {
                        category: tierData.category || 'custom',
                        order: tierData.order || 999
                    };
                }
            } else {
                // This is a catalog subject - export only customizations (overlay)
                const overlay = {};
                if (subject.goal) overlay.goal = subject.goal;
                if (subject.resources && subject.resources.length > 0) overlay.resources = subject.resources;
                if (subject.projects && subject.projects.length > 0) overlay.projects = subject.projects;

                if (Object.keys(overlay).length > 0) {
                    exportData.overlays[subject.id] = overlay;
                }
            }
        }
    }

    // Clean up empty objects
    if (Object.keys(exportData.overlays).length === 0) delete exportData.overlays;
    if (Object.keys(exportData.customSubjects).length === 0) delete exportData.customSubjects;
    if (Object.keys(exportData.customTiers).length === 0) delete exportData.customTiers;

    // Create and download JSON file
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `polymathica-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    alert('Data exported successfully!');
}

function importData() {
    const fileInput = document.getElementById('importFileInput');
    fileInput.click();
}

async function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const importedData = JSON.parse(e.target.result);

            // Validate data structure
            if (!importedData.schema && !importedData.version) {
                alert('Invalid data file format: missing schema/version');
                return;
            }

            if (!importedData.progress) {
                alert('Invalid data file format: missing progress data');
                return;
            }

            // Validate schema version
            const schema = importedData.schema || importedData.version;
            if (schema !== '3.0') {
                if (!confirm(`Warning: Data file has schema version ${schema}, but current version is 3.0. Import may not work correctly. Continue anyway?`)) {
                    return;
                }
            }

            if (!confirm('This will replace all your current data. Are you sure?')) {
                return;
            }

            // Load catalog
            const catalog = await loadCatalog();

            // Import progress
            subjectProgress = importedData.progress || {};
            saveProgress();

            // Rebuild subjects from catalog + imported user data
            subjects = mergeCatalogWithUserData(catalog, importedData);
            saveSubjects();

            // Import theme
            if (importedData.theme) {
                document.documentElement.setAttribute('data-theme', importedData.theme);
                updateThemeButton(importedData.theme);
                saveTheme(importedData.theme);
            }

            // Re-render
            render();
            closeSettingsModal();
            alert('Data imported successfully!');

            // If authenticated, sync to GitHub
            if (window.githubAuth && githubAuth.isAuthenticated()) {
                saveDataToGitHub();
            }
        } catch (error) {
            alert('Failed to import data: ' + error.message);
        }
    };
    reader.readAsText(file);

    // Reset input so same file can be selected again
    event.target.value = '';
}

async function resetAllData() {
    const confirmInput = document.getElementById('resetConfirmInput').value;

    if (confirmInput !== 'Polymathica') {
        alert('Please type "Polymathica" to confirm the reset.');
        return;
    }

    if (!confirm('Are you absolutely sure? This will permanently delete ALL your data including progress, goals, resources, and projects. This action CANNOT be undone.')) {
        return;
    }

    // Reset all data to defaults (load fresh catalog with no user data)
    const catalog = await loadCatalog();
    subjects = mergeCatalogWithUserData(catalog, null);
    subjectProgress = {};

    // Save to localStorage
    saveSubjects();
    saveProgress();

    // Clear the confirmation input
    document.getElementById('resetConfirmInput').value = '';

    // If authenticated, sync the reset to GitHub
    if (window.githubAuth && githubAuth.isAuthenticated()) {
        await saveDataToGitHub();
    }

    // Re-render
    render();
    closeSettingsModal();

    alert('All data has been reset successfully.');
}

// Subject Creation Functions
function getAllSubjectIds() {
    const subjectIds = [];
    for (const tierData of Object.values(subjects)) {
        if (tierData.subjects) {
            for (const subject of tierData.subjects) {
                subjectIds.push({
                    id: subject.id,
                    name: subject.name
                });
            }
        }
    }
    return subjectIds;
}

function setupAutocomplete(inputId, suggestionsId) {
    const input = document.getElementById(inputId);
    const suggestionsContainer = document.getElementById(suggestionsId);
    let selectedIndex = -1;

    input.addEventListener('input', function() {
        const value = this.value;
        const lastComma = value.lastIndexOf(',');
        const currentTerm = lastComma >= 0 ? value.substring(lastComma + 1).trim() : value.trim();

        if (currentTerm.length < 1) {
            suggestionsContainer.classList.remove('active');
            return;
        }

        const allSubjects = getAllSubjectIds();
        const matches = allSubjects.filter(s =>
            s.id.toLowerCase().includes(currentTerm.toLowerCase()) ||
            s.name.toLowerCase().includes(currentTerm.toLowerCase())
        ).slice(0, 10);

        if (matches.length === 0) {
            suggestionsContainer.classList.remove('active');
            return;
        }

        suggestionsContainer.innerHTML = matches.map((subject, index) =>
            `<div class="autocomplete-suggestion" data-index="${index}" data-id="${subject.id}">
                <span class="suggestion-id">${subject.id}</span>
                <span class="suggestion-name">${subject.name}</span>
            </div>`
        ).join('');

        suggestionsContainer.classList.add('active');
        selectedIndex = -1;

        // Add click handlers
        suggestionsContainer.querySelectorAll('.autocomplete-suggestion').forEach(el => {
            el.addEventListener('click', function() {
                const selectedId = this.getAttribute('data-id');
                const lastComma = input.value.lastIndexOf(',');
                if (lastComma >= 0) {
                    input.value = input.value.substring(0, lastComma + 1) + ' ' + selectedId + ', ';
                } else {
                    input.value = selectedId + ', ';
                }
                suggestionsContainer.classList.remove('active');
                input.focus();
            });
        });
    });

    input.addEventListener('keydown', function(e) {
        const suggestions = suggestionsContainer.querySelectorAll('.autocomplete-suggestion');
        if (!suggestionsContainer.classList.contains('active') || suggestions.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
            updateSelected();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, 0);
            updateSelected();
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
            e.preventDefault();
            suggestions[selectedIndex].click();
        } else if (e.key === 'Escape') {
            suggestionsContainer.classList.remove('active');
        }

        function updateSelected() {
            suggestions.forEach((el, i) => {
                el.classList.toggle('selected', i === selectedIndex);
            });
        }
    });

    // Close suggestions when clicking outside
    document.addEventListener('click', function(e) {
        if (!input.contains(e.target) && !suggestionsContainer.contains(e.target)) {
            suggestionsContainer.classList.remove('active');
        }
    });
}

function openCreateSubjectModal() {
    document.getElementById('createSubjectModal').classList.add('active');

    // Populate category dropdown with existing tiers
    const categorySelect = document.getElementById('newSubjectCategory');
    categorySelect.innerHTML = '<option value="">Select a category...</option>';

    // Add existing tiers (excluding "Custom Subjects")
    for (const tierName of Object.keys(subjects)) {
        if (tierName !== 'Custom Subjects') {
            const option = document.createElement('option');
            option.value = tierName;
            option.textContent = tierName;
            categorySelect.appendChild(option);
        }
    }

    // Setup autocomplete for dependency fields
    setupAutocomplete('newSubjectPrereq', 'prereqSuggestions');
    setupAutocomplete('newSubjectCoreq', 'coreqSuggestions');
    setupAutocomplete('newSubjectSoft', 'softSuggestions');

    // Reset form
    document.getElementById('newSubjectName').value = '';
    document.getElementById('newSubjectCategory').value = '';
    document.getElementById('newSubjectPrereq').value = '';
    document.getElementById('newSubjectCoreq').value = '';
    document.getElementById('newSubjectSoft').value = '';
    document.getElementById('newSubjectSummary').value = '';
    document.getElementById('newSubjectGoal').value = '';
    document.getElementById('newSubjectName').focus();
}

function closeCreateSubjectModal() {
    document.getElementById('createSubjectModal').classList.remove('active');
}

function saveNewSubject() {
    const name = document.getElementById('newSubjectName').value.trim();
    const category = document.getElementById('newSubjectCategory').value;
    const prereqStr = document.getElementById('newSubjectPrereq').value.trim();
    const coreqStr = document.getElementById('newSubjectCoreq').value.trim();
    const softStr = document.getElementById('newSubjectSoft').value.trim();
    const summary = document.getElementById('newSubjectSummary').value.trim();
    const goal = document.getElementById('newSubjectGoal').value.trim();

    // Validation
    if (!name) {
        alert('Please enter a subject name');
        return;
    }

    if (!category) {
        alert('Please select a category');
        return;
    }

    // Generate a unique ID from the name
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    // Check if subject with this ID already exists
    for (const tierData of Object.values(subjects)) {
        if (tierData.subjects && tierData.subjects.some(s => s.id === id)) {
            alert('A subject with this name already exists. Please choose a different name.');
            return;
        }
    }

    // Parse prerequisites, co-requisites, and soft dependencies
    const prereq = prereqStr ? prereqStr.split(',').map(s => s.trim()).filter(s => s) : [];
    const coreq = coreqStr ? coreqStr.split(',').map(s => s.trim()).filter(s => s) : [];
    const soft = softStr ? softStr.split(',').map(s => s.trim()).filter(s => s) : [];

    // Create the new subject
    const newSubject = {
        id: id,
        name: name,
        prereq: prereq,
        coreq: coreq,
        soft: soft,
        summary: summary || '',
        goal: goal || null,
        resources: [],
        projects: [],
        isCustom: true  // Mark as custom subject
    };

    // Get the category's existing data or use default
    const categoryData = subjects[category] || { category: 'custom', subjects: [] };

    // Ensure the category exists
    if (!subjects[category]) {
        subjects[category] = {
            category: categoryData.category,
            subjects: []
        };
    }

    // Add the subject to the category
    subjects[category].subjects.push(newSubject);

    // Initialize progress as empty
    subjectProgress[id] = 'empty';

    // Save
    saveSubjects();
    saveProgress();

    // If authenticated, sync to GitHub
    if (window.githubAuth && githubAuth.isAuthenticated()) {
        saveDataToGitHub();
    }

    // Re-render
    render();
    closeCreateSubjectModal();

    alert(`Subject "${name}" created successfully!`);
}

// Make functions globally accessible for inline onclick handlers
window.cycleProgress = cycleProgress;
window.cycleProjectProgress = cycleProjectProgress;
window.openSubjectDetail = openSubjectDetail;
window.editProject = editProject;
window.viewProject = viewProject;
window.removeProject = removeProject;
window.removeResource = removeResource;
window.switchView = switchView;
window.toggleTier = toggleTier;
window.toggleSummary = toggleSummary;
window.deleteCustomSubject = deleteCustomSubject;
window.findDependentSubjects = findDependentSubjects;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Hide content during initialization to prevent flash
    const content = document.getElementById('content');
    if (content) content.style.display = 'none';

    loadAllData();
    initializeTheme();
    currentView = loadView();

    // Show content before switching view
    if (content) content.style.display = 'block';
    switchView(currentView);

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => switchView(link.dataset.view));
    });
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('categoryFilter').addEventListener('change', applyFilters);
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('closeDetailBtn').addEventListener('click', closeSubjectDetail);
    document.getElementById('cancelDetailBtn').addEventListener('click', closeSubjectDetail);
    document.getElementById('saveDetailBtn').addEventListener('click', saveSubjectDetail);
    document.getElementById('deleteSubjectBtn').addEventListener('click', deleteCustomSubject);
    document.getElementById('addSubjectResourceBtn').addEventListener('click', () => addResource('subject'));
    document.getElementById('addProjectBtn').addEventListener('click', addProject);
    document.getElementById('closeProjectBtn').addEventListener('click', closeProjectDetail);
    document.getElementById('cancelProjectBtn').addEventListener('click', closeProjectDetail);
    document.getElementById('saveProjectBtn').addEventListener('click', saveProjectDetail);
    document.getElementById('deleteProjectBtn').addEventListener('click', deleteCurrentProject);
    document.getElementById('addProjectResourceBtn').addEventListener('click', () => addResource('project'));
    document.getElementById('subjectDetailModal').addEventListener('click', (e) => { if (e.target.id === 'subjectDetailModal') closeSubjectDetail(); });
    document.getElementById('projectDetailModal').addEventListener('click', (e) => { if (e.target.id === 'projectDetailModal') closeProjectDetail(); });
    document.getElementById('closeResourceBtn').addEventListener('click', closeResourceModal);
    document.getElementById('cancelResourceBtn').addEventListener('click', closeResourceModal);
    document.getElementById('saveResourceBtn').addEventListener('click', saveResource);
    document.getElementById('resourceModal').addEventListener('click', (e) => { if (e.target.id === 'resourceModal') closeResourceModal(); });

    // Auth modal event listeners
    document.getElementById('authButton').addEventListener('click', openAuthModal);
    document.getElementById('closeAuthBtn').addEventListener('click', closeAuthModal);
    document.getElementById('cancelAuthBtn').addEventListener('click', closeAuthModal);
    document.getElementById('saveTokenBtn').addEventListener('click', saveToken);
    document.getElementById('authModal').addEventListener('click', (e) => { if (e.target.id === 'authModal') closeAuthModal(); });

    // Enter key to submit token
    document.getElementById('githubToken').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveToken();
    });

    // Settings modal event listeners
    document.getElementById('settingsButton').addEventListener('click', openSettingsModal);
    document.getElementById('closeSettingsBtn').addEventListener('click', closeSettingsModal);
    document.getElementById('closeSettingsFooterBtn').addEventListener('click', closeSettingsModal);
    document.getElementById('manualSyncBtn')?.addEventListener('click', manualSync);
    document.getElementById('exportDataBtn').addEventListener('click', exportData);
    document.getElementById('importDataBtn').addEventListener('click', importData);
    document.getElementById('importFileInput').addEventListener('change', handleImportFile);
    document.getElementById('resetAllBtn').addEventListener('click', resetAllData);
    document.getElementById('settingsModal').addEventListener('click', (e) => { if (e.target.id === 'settingsModal') closeSettingsModal(); });

    // Catalog create subject button
    document.getElementById('catalogCreateSubjectBtn').addEventListener('click', openCreateSubjectModal);

    // Create subject modal event listeners
    document.getElementById('closeCreateSubjectBtn').addEventListener('click', closeCreateSubjectModal);
    document.getElementById('cancelCreateSubjectBtn').addEventListener('click', closeCreateSubjectModal);
    document.getElementById('saveNewSubjectBtn').addEventListener('click', saveNewSubject);
    document.getElementById('createSubjectModal').addEventListener('click', (e) => { if (e.target.id === 'createSubjectModal') closeCreateSubjectModal(); });

    // Sync status - click to manually sync
    document.getElementById('syncStatus').addEventListener('click', manualSync);

    // Initialize auth state
    if (window.githubAuth) {
        updateAuthButton();

        // If already authenticated, load from GitHub and update view mode
        if (githubAuth.isAuthenticated()) {
            (async () => {
                await updateViewMode();
                const loaded = await loadDataFromGitHub();
                if (loaded) {
                    render();
                }
                // Start auto-sync
                if (window.githubStorage && CONFIG.features.enableAutoSync) {
                    githubStorage.startAutoSync();
                }
            })();
        } else {
            // Not authenticated - load public data for read-only view
            (async () => {
                console.log('[Init] Not authenticated, loading public data...');
                viewMode = 'public';
                const loaded = await loadPublicDataFromGitHub();
                console.log('[Init] Public data loaded:', loaded);
                updateSettingsButtonVisibility();
                // Always render, even if loading failed (will show empty state)
                render();
            })();
        }
    }

    // Save to GitHub on page unload (if authenticated)
    if (CONFIG.app.syncOnUnload) {
        window.addEventListener('beforeunload', () => {
            if (window.githubAuth && githubAuth.isAuthenticated()) {
                saveDataToGitHub();
            }
        });
    }
});
