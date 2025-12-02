// ==========================================
// GLOBAL STATE
// ==========================================
// Note: Helper utilities moved to js/utils.js

let subjects = {};
let subjectProgress = {};
let currentEditingSubject = null;
let currentEditingProject = null;
let currentResourceContext = null; // 'subject' or 'project'
let tempProjectResources = []; // Temporary storage for new project resouhttps://japancolorado.github.io/polymathica/rces
let currentView = 'dashboard'; // 'dashboard' or 'catalog'
let viewMode = 'public'; // 'public' or 'owner'

// ==========================================
// DATA LAYER
// ==========================================
// Note: Data loading and saving functions moved to js/data.js



// ==========================================
// STATE MANAGEMENT
// ==========================================
// Note: Theme, view, progress, and readiness functions moved to js/state.js

// ==========================================
// RENDERING
// ==========================================
// Note: All rendering functions moved to js/render.js


// ==========================================
// MODAL MANAGEMENT
// ==========================================
// Note: All modal functions moved to js/modals.js


// ==========================================
// GLOBAL EXPORTS & INITIALIZATION
// ==========================================

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
    document.getElementById('signOutBtn')?.addEventListener('click', handleSignOut);
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
                updateCreateSubjectButtonState();
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
