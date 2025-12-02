// GitHub Personal Access Token Authentication Handler
// Manages user authentication and authorization using GitHub PATs

class GitHubAuth {
    constructor(repoOwner) {
        this.repoOwner = repoOwner;
        this.token = null;
        this.username = null;
        this.tokenKey = 'github_token';
        this.usernameKey = 'github_username';

        // Load saved auth data
        this.loadAuthData();
    }

    // Load authentication data from localStorage
    loadAuthData() {
        this.token = localStorage.getItem(this.tokenKey);
        this.username = localStorage.getItem(this.usernameKey);
    }

    // Save authentication data to localStorage
    saveAuthData() {
        if (this.token) {
            localStorage.setItem(this.tokenKey, this.token);
        }
        if (this.username) {
            localStorage.setItem(this.usernameKey, this.username);
        }
    }

    // Clear authentication data
    clearAuthData() {
        this.token = null;
        this.username = null;
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.usernameKey);
    }

    // Set token manually (Personal Access Token flow)
    setToken(token) {
        this.token = token;
        this.saveAuthData();
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.token;
    }

    // Fetch authenticated user info from GitHub
    async fetchUserInfo() {
        if (!this.token) {
            return null;
        }

        try {
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    // Token is invalid
                    this.clearAuthData();
                    return null;
                }
                throw new Error(`GitHub API error: ${response.status}`);
            }

            const userData = await response.json();
            this.username = userData.login;
            this.saveAuthData();
            return userData;
        } catch (error) {
            console.error('Failed to fetch user info:', error);
            return null;
        }
    }

    // Check if authenticated user is the repo owner
    async isOwner() {
        if (!this.isAuthenticated()) {
            return false;
        }

        // Fetch user info if we don't have username yet
        if (!this.username) {
            const userInfo = await this.fetchUserInfo();
            if (!userInfo) {
                return false;
            }
        }

        return this.username.toLowerCase() === this.repoOwner.toLowerCase();
    }

    // Validate token by making a test API call
    async validateToken() {
        const userInfo = await this.fetchUserInfo();
        return !!userInfo;
    }

    // Logout
    logout() {
        this.clearAuthData();
        window.location.reload();
    }

    // Get current view mode based on auth status
    async getViewMode() {
        if (await this.isOwner()) {
            return CONFIG.app.viewModes.OWNER;
        }
        return CONFIG.app.viewModes.PUBLIC;
    }
}

// Initialize auth system
let githubAuth;
if (typeof CONFIG !== 'undefined') {
    githubAuth = new GitHubAuth(CONFIG.github.repoOwner);
    window.githubAuth = githubAuth;
}
