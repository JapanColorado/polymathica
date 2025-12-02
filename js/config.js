// Configuration for Polymathica
// This file contains public configuration values

const CONFIG = {
    // GitHub repository settings
    github: {
        repoOwner: 'JapanColorado',
        repoName: 'polymathica',
        branch: 'main'
    },

    // Application settings
    app: {
        // Auto-sync interval in milliseconds (5 minutes)
        autoSyncInterval: 5 * 60 * 1000,

        // Whether to sync on page unload
        syncOnUnload: true,

        // Data file paths in repo
        dataPath: 'data/user-data.json',

        // View modes
        viewModes: {
            PUBLIC: 'public',      // Read-only, minimal details
            OWNER: 'owner'         // Full edit access
        }
    },

    // Feature flags
    features: {
        enableAutoSync: true,
        enableOfflineMode: true,
        showSyncStatus: true
    }
};

// Make config available globally
window.CONFIG = CONFIG;
