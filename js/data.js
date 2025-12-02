// ==========================================
// DATA LAYER MODULE
// ==========================================
// Functions for loading, saving, and managing subject data

// ==========================================
// CATALOG LOADING
// ==========================================

/**
 * Load the subject catalog from catalog.json
 * @returns {Promise<Object>} The catalog object with schema 3.0
 */
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

/**
 * Merge catalog data with user customizations
 * @param {Object} catalog - The base catalog from catalog.json
 * @param {Object} userData - User data with overlays and custom subjects
 * @returns {Object} Merged subjects organized by tiers
 */
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

// ==========================================
// LOCAL STORAGE
// ==========================================

/**
 * Save subjects to localStorage
 */
function saveSubjects() {
    localStorage.setItem('subjects', JSON.stringify(subjects));
}

/**
 * Save progress to localStorage
 */
function saveProgress() {
    localStorage.setItem('subjectProgress', JSON.stringify(subjectProgress));
}

// ==========================================
// PUBLIC DATA LOADING
// ==========================================

/**
 * Load public data from GitHub Pages (no authentication required)
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
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

// ==========================================
// AUTHENTICATED DATA LOADING
// ==========================================

/**
 * Load data from GitHub API (requires authentication)
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
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

// ==========================================
// DATA SAVING
// ==========================================

/**
 * Mark that data has changed - saves locally and queues for auto-sync
 * This should be called instead of saveDataToGitHub() for most data changes
 * to avoid creating too many commits
 */
function markDataChanged() {
    // Always save to localStorage immediately
    saveSubjects();
    saveProgress();

    // Mark storage as dirty so auto-sync will handle GitHub sync
    if (window.githubStorage && window.githubAuth && githubAuth.isAuthenticated()) {
        githubStorage.markDirty();
        console.log('[App] Data marked as changed, will sync automatically');
    }
}

/**
 * Save data to GitHub repository (requires authentication)
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
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
        for (const [tierName, tierData] of Object.entries(subjects)) {
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

        updateSyncStatusInSettings();
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
