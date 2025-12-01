// GitHub API Storage Adapter
// Handles reading/writing data to GitHub repository

class GitHubStorage {
    constructor(auth, owner, repo, branch = 'main') {
        this.auth = auth;
        this.owner = owner;
        this.repo = repo;
        this.branch = branch;
        this.apiBase = 'https://api.github.com';
        this.dataPath = CONFIG.app.dataPath;

        // Cache for offline support
        this.cache = {
            data: null,
            sha: null,
            lastFetch: null
        };

        // Track if we have unsaved changes
        this.hasUnsavedChanges = false;
        this.autoSyncTimer = null;
    }

    // Get full API URL for a repo file
    getFileUrl(path) {
        return `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${path}`;
    }

    // Make authenticated API request
    async apiRequest(url, options = {}) {
        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            ...options.headers
        };

        // Add auth token if available
        if (this.auth && this.auth.token) {
            headers['Authorization'] = `token ${this.auth.token}`;
        }

        const response = await fetch(url, {
            ...options,
            headers
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `GitHub API error: ${response.status}`);
        }

        return response.json();
    }

    // Load user data from GitHub
    async loadUserData() {
        try {
            console.log('[Storage] Loading user data from GitHub...');
            const url = this.getFileUrl(this.dataPath);
            const fileData = await this.apiRequest(url);

            // Decode base64 content
            const content = atob(fileData.content);
            const data = JSON.parse(content);

            // Update cache
            this.cache.data = data;
            this.cache.sha = fileData.sha;
            this.cache.lastFetch = Date.now();

            console.log('[Storage] User data loaded successfully');
            return data;
        } catch (error) {
            console.error('[Storage] Failed to load from GitHub:', error);

            // Try to load from localStorage cache
            const cachedData = this.loadFromLocalStorage();
            if (cachedData) {
                console.log('[Storage] Using cached data from localStorage');
                return cachedData;
            }

            // Return empty data structure if no cache exists
            console.log('[Storage] No data found, returning empty structure');
            return this.getEmptyDataStructure();
        }
    }

    // Save user data to GitHub
    async saveUserData(data) {
        if (!this.auth || !this.auth.isAuthenticated()) {
            throw new Error('Authentication required to save data');
        }

        try {
            console.log('[Storage] Saving user data to GitHub...');

            // Add metadata
            data.lastModified = new Date().toISOString();
            data.version = data.version || '2.0';

            // Encode content as base64
            const content = btoa(JSON.stringify(data, null, 2));

            // Get current file SHA if we don't have it
            if (!this.cache.sha) {
                try {
                    const fileData = await this.apiRequest(this.getFileUrl(this.dataPath));
                    this.cache.sha = fileData.sha;
                } catch (error) {
                    // File doesn't exist yet, that's OK
                    console.log('[Storage] Creating new data file');
                }
            }

            // Update file on GitHub
            const url = this.getFileUrl(this.dataPath);
            const response = await this.apiRequest(url, {
                method: 'PUT',
                body: JSON.stringify({
                    message: `Update learning progress - ${new Date().toISOString()}`,
                    content: content,
                    branch: this.branch,
                    sha: this.cache.sha // Required for updates, omit for new files
                })
            });

            // Update cache
            this.cache.data = data;
            this.cache.sha = response.content.sha;
            this.cache.lastFetch = Date.now();
            this.hasUnsavedChanges = false;

            // Also save to localStorage
            this.saveToLocalStorage(data);

            console.log('[Storage] User data saved successfully');
            return true;
        } catch (error) {
            console.error('[Storage] Failed to save to GitHub:', error);

            // Save to localStorage as backup
            this.saveToLocalStorage(data);
            this.hasUnsavedChanges = true;

            throw error;
        }
    }

    // Sync: Load from GitHub, merge with local changes, save back
    async sync() {
        console.log('[Storage] Starting sync...');

        try {
            // Load latest from GitHub
            const remoteData = await this.loadUserData();

            // If we have unsaved local changes, we need to merge
            const localData = this.loadFromLocalStorage();
            if (this.hasUnsavedChanges && localData) {
                console.log('[Storage] Merging local changes...');
                const mergedData = this.mergeData(remoteData, localData);
                await this.saveUserData(mergedData);
            }

            console.log('[Storage] Sync complete');
            return true;
        } catch (error) {
            console.error('[Storage] Sync failed:', error);
            return false;
        }
    }

    // Merge remote and local data (simple last-write-wins for now)
    mergeData(remote, local) {
        // Compare timestamps
        const remoteTime = new Date(remote.lastModified || 0);
        const localTime = new Date(local.lastModified || 0);

        // Use whichever is newer
        if (localTime > remoteTime) {
            console.log('[Storage] Local data is newer');
            return local;
        } else {
            console.log('[Storage] Remote data is newer');
            return remote;
        }

        // TODO: Implement smarter merging (per-subject comparison)
    }

    // Start auto-sync timer
    startAutoSync() {
        if (!CONFIG.features.enableAutoSync) {
            return;
        }

        console.log('[Storage] Starting auto-sync...');

        this.autoSyncTimer = setInterval(async () => {
            if (this.hasUnsavedChanges) {
                console.log('[Storage] Auto-sync triggered');
                await this.sync();
            }
        }, CONFIG.app.autoSyncInterval);
    }

    // Stop auto-sync timer
    stopAutoSync() {
        if (this.autoSyncTimer) {
            clearInterval(this.autoSyncTimer);
            this.autoSyncTimer = null;
            console.log('[Storage] Auto-sync stopped');
        }
    }

    // Save to localStorage (offline cache)
    saveToLocalStorage(data) {
        try {
            localStorage.setItem('github_user_data', JSON.stringify(data));
            localStorage.setItem('github_user_data_timestamp', Date.now().toString());
        } catch (error) {
            console.error('[Storage] Failed to save to localStorage:', error);
        }
    }

    // Load from localStorage
    loadFromLocalStorage() {
        try {
            const data = localStorage.getItem('github_user_data');
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('[Storage] Failed to load from localStorage:', error);
            return null;
        }
    }

    // Get empty data structure
    getEmptyDataStructure() {
        return {
            version: '2.0',
            lastModified: new Date().toISOString(),
            progress: {},
            subjects: {},
            theme: 'dark',
            currentView: 'dashboard'
        };
    }

    // Mark that we have unsaved changes
    markDirty() {
        this.hasUnsavedChanges = true;
    }

    // Check sync status
    getSyncStatus() {
        if (!this.auth || !this.auth.isAuthenticated()) {
            return { status: 'offline', message: 'Not signed in' };
        }

        if (this.hasUnsavedChanges) {
            return { status: 'dirty', message: 'Unsaved changes' };
        }

        if (this.cache.lastFetch) {
            const ago = Date.now() - this.cache.lastFetch;
            const minutes = Math.floor(ago / 60000);
            return {
                status: 'synced',
                message: minutes === 0 ? 'Just synced' : `Synced ${minutes}m ago`
            };
        }

        return { status: 'unknown', message: 'Unknown' };
    }
}

// Initialize storage
let githubStorage;
if (typeof CONFIG !== 'undefined' && typeof window.githubAuth !== 'undefined') {
    githubStorage = new GitHubStorage(
        window.githubAuth,
        CONFIG.github.repoOwner,
        CONFIG.github.repoName,
        CONFIG.github.branch
    );
    window.githubStorage = githubStorage;
}
