# Polymathica

A lightweight web-based learning tracker for organizing and tracking progress across multiple subjects, fields, and learning projects. Hosted on GitHub Pages with cross-device sync and public read-only sharing.

**Live Demo**: [https://japancolorado.github.io/learning-tracker/](https://japancolorado.github.io/learning-tracker/)

## Features

### For Everyone (Public View)

- 📚 **Browse Learning Path**: View subjects, goals, resources, and projects
- 🔍 **Search & Filter**: Find subjects by name, status, or category
- 📊 **Track Progress**: See what's in progress and completed
- 👁️ **Read-Only Access**: Explore without ability to modify
- 🍴 **Fork to Customize**: Create your own personalized tracker

### For Repository Owner (Authenticated)

- ✏️ **Full Edit Access**: Modify goals, add resources, create projects
- 🔄 **Cross-Device Sync**: Changes sync across all your devices via GitHub
- ☁️ **Automatic Backup**: Data stored in GitHub repository (version controlled!)
- 🎨 **Theme Support**: Light and dark mode
- 📱 **Works Everywhere**: Access from any device with a browser

### What's Included

- **Dashboard View**: See subjects currently in progress and completed
- **Catalog View**: Browse all subjects organized by tiers (Mathematics, Physics, etc.)
- **Subject Management**: Goals, resources, projects for each subject
- **Project Tracking**: Nested projects with independent resource lists
- **Dependency System**: Prerequisites, corequisites, and soft dependencies
- **Progress Tracking**: Three states - not started, in progress, completed
- **Auto-Sync**: Changes sync to GitHub every 5 minutes (when authenticated)

### What's NOT Included

- ~~Notepad/notes~~ (removed for privacy - data is public)
- Adding/removing subjects from catalog (catalog is predefined)
- Real-time collaboration
- Mobile app (web-based only)

## Quick Start

### For Repository Owner (You)

1. **Visit your GitHub Pages site**: https://japancolorado.github.io/learning-tracker/
2. **Click "Sign In"** in the top-right
3. **Enter your Personal Access Token** (see setup below if you don't have one)
4. **Start tracking!** Add goals, resources, projects - they sync automatically

### For Public Viewers

Just visit the GitHub Pages URL - no authentication needed! You can browse the catalog, see progress, and click into subjects/projects to view details.

### For People Who Want Their Own Tracker

See [Creating Your Own Tracker](#creating-your-own-tracker) below.

## Setup Guide (First Time)

### Step 1: Enable GitHub Pages

If you haven't already:

1. Go to your repository **Settings**
2. Navigate to **Pages** (left sidebar)
3. Under **Source**, select **Deploy from a branch**
4. Select branch: **main**, folder: **/ (root)**
5. Click **Save**
6. Wait 1-2 minutes for deployment
7. Visit your site at: `https://YOUR-USERNAME.github.io/learning-tracker/`

### Step 2: Create a Personal Access Token

To enable sync, you need a GitHub Personal Access Token:

1. Go to [GitHub Settings](https://github.com/settings/tokens)
2. Click **Developer settings** → **Personal access tokens** → **Tokens (classic)**
3. Click **Generate new token (classic)**
4. Fill in:
   - **Note**: "Polymathica Learning Tracker"
   - **Expiration**: Your choice (recommend "No expiration" or 1 year)
   - **Scopes**: ☑️ Check **repo** (full control of private repositories)
5. Click **Generate token**
6. **Copy the token** (you won't be able to see it again!)

### Step 3: Sign In

1. Visit your GitHub Pages URL
2. Click **"Sign In"** button
3. Paste your Personal Access Token
4. Click **"Save Token"**

You're all set! Your data will now sync across devices.

### Step 4: Configure Your Repo (Optional)

Update [`config.js`](config.js) with your information:

```javascript
const CONFIG = {
  github: {
    repoOwner: 'YOUR-GITHUB-USERNAME',  // Update this
    repoName: 'learning-tracker',        // Update if you renamed the repo
    branch: 'main'
  }
  // ... rest stays the same
};
```

## Renaming Your Repository

Want to give your tracker a custom name? See the [Repository Rename Guide](docs/REPO_RENAME_GUIDE.md) for step-by-step instructions.

**Quick Summary:**

1. Rename on GitHub (Settings → Repository name)
2. Update `config.js` (`repoName` field)
3. Commit and push
4. Re-authenticate on new URL

The guide covers troubleshooting, GitHub Pages updates, and what to expect when renaming.

## Creating Your Own Tracker

Want to use Polymathica for your own learning journey? Here's how:

### Option 1: Fork This Repository

1. Click the **"Fork"** button (top right of this repository)
2. This creates a copy under your GitHub account
3. Follow the [Setup Guide](#setup-guide-first-time) above with your forked repo

### Option 2: Clone and Customize

```bash
# Clone the repository
git clone https://github.com/JapanColorado/learning-tracker.git my-learning-tracker
cd my-learning-tracker

# Create your own GitHub repository
# (via GitHub web interface)

# Update remote
git remote set-url origin https://github.com/YOUR-USERNAME/my-learning-tracker.git
git push -u origin main
```

Then follow the [Setup Guide](#setup-guide-first-time).

### Customizing the Catalog

To add/remove/modify subjects, edit [`data/subjects.js`](data/subjects.js):

```javascript
const defaultSubjects = {
  "Your Custom Tier": {
    category: "stem",  // or "humanities", "arts", etc.
    subjects: [
      {
        id: "unique-id",        // Unique identifier
        name: "Subject Name",   // Display name
        prereq: ["other-id"],   // Prerequisites (optional)
        coreq: [],              // Corequisites (optional)
        soft: []                // Soft dependencies (optional)
      }
      // Add more subjects...
    ]
  }
  // Add more tiers...
};
```

Commit and push your changes - they'll appear in your tracker immediately!

## Usage Guide

### Tracking Your Progress

**As Repository Owner:**

1. Click a subject's **checkbox** (☐) to cycle through progress:
   - ☐ Empty (not started)
   - ☑ Partial (in progress)
   - ☒ Complete (completed)
2. Click on any **subject card** to:
   - Add a learning goal
   - Add resources (links or notes)
   - Create projects
3. Changes **sync automatically** every 5 minutes
4. **Manual sync**: Click the sync status indicator

**As Public Viewer:**

- Browse the catalog
- Click subjects/projects to view details
- See overall progress
- Fork the repo to create your own!

### Adding Resources

1. Open a subject's detail modal (click the card)
2. Click **"+ Add Resource"**
3. Enter:
   - **Title/Description** (required)
   - **Link** (optional) - will become clickable if provided
4. Click **"Add Resource"**

Resources with links show as clickable, those without show as plain text.

### Creating Projects

1. Open a subject's detail modal
2. Click **"+ Add Project"**
3. Fill in:
   - **Name** (required)
   - **Goal** (required) - what you want to accomplish
   - **Resources** (optional) - same as subject resources
4. Click **"Save"**

Projects appear on the subject card and can be clicked to view (or edit if you're the owner).

### Using the Dashboard

The Dashboard automatically shows:

- **Current**: All subjects marked as "in progress" (☑)
- **Completed**: All subjects marked as "complete" (☒)

It's your personalized at-a-glance view of your learning journey.

## Data & Privacy

### How Data is Stored

**Owner Mode (Authenticated):**
- Your customizations stored in [`data/user-data.json`](data/user-data.json)
- Synced via GitHub API
- Creates a commit on every save
- Full version history available in git

**Public Mode (Unauthenticated):**
- Loads data from GitHub Pages URL
- Read-only access
- No modifications possible

**LocalStorage (Both Modes):**
- Used as offline cache
- Fallback if GitHub is unavailable
- Cleared on logout (owner mode)

### What's Public vs Private

**Public** (visible to anyone):
- Subject catalog structure
- Your progress on subjects
- Goals you've set
- Resources you've added
- Projects you've created

**Private** (only you can edit):
- Personal Access Token (stored in browser only, never committed)

**Important**: Your `user-data.json` file is **public** in your repository. Don't store sensitive information!

### Backing Up Your Data

Your data is automatically backed up in Git! Every sync creates a commit.

**Manual export** (browser console):

```javascript
// Export all data
console.log(JSON.stringify(localStorage, null, 2));

// Export just subjects
console.log(JSON.stringify(JSON.parse(localStorage.getItem('subjects')), null, 2));
```

## Sync & Offline

### How Sync Works

1. **Auto-Sync**: Every 5 minutes when you're authenticated
2. **On Page Close**: Syncs when you close/reload the page
3. **Manual Sync**: Click the sync status indicator anytime
4. **Conflict Resolution**: Last-write-wins based on timestamp

### Offline Support

- Works offline with cached data
- Shows "Offline" status when not connected
- Syncs automatically when back online
- LocalStorage serves as fallback

### Sync Status

Watch the sync indicator (next to Sign In/Out):

- 🔄 **Syncing** - Saving changes to GitHub
- ✓ **Synced** - All changes saved
- ⚠️ **Unsaved** - Local changes not yet synced
- ❌ **Offline** - Not authenticated or network issue

Click the status to manually trigger a sync.

## Project Structure

```
learning-tracker/
├── index.html          # Main HTML structure
├── app.js              # Core application logic (~1080 lines)
├── styles.css          # Styling (dark/light themes)
├── auth.js             # GitHub authentication handler
├── storage.js          # GitHub API storage adapter
├── config.js           # Configuration (repo owner, settings)
├── callback.html       # OAuth callback (guides PAT setup)
├── data/
│   ├── subjects.js     # Default subject catalog
│   ├── summaries.js    # Subject summaries (future use)
│   └── user-data.json  # Your personal data (synced via GitHub)
├── CLAUDE.md          # Technical documentation (for developers)
├── README.md          # This file
└── TODO.md            # Feature wishlist
```

## Development

### Technical Stack

- **Pure Vanilla JavaScript** - No frameworks or build tools
- **GitHub Pages** - Static site hosting
- **GitHub API** - Data storage and sync
- **Personal Access Tokens** - Authentication (simpler than OAuth for static sites)
- **LocalStorage** - Offline cache
- **CSS Custom Properties** - Theming

### Documentation

See **[CLAUDE.md](CLAUDE.md)** for comprehensive technical documentation:

- Complete architecture overview
- Authentication & sync system details
- Data model specifications
- Function reference
- Development guidelines
- Recent changes & migration history

### Contributing

Contributions welcome! Please:

1. Read [CLAUDE.md](CLAUDE.md) to understand the architecture
2. Test thoroughly with existing data
3. Update documentation for significant changes
4. Submit pull requests

## Troubleshooting

### Sign In Not Working

- **Verify token has `repo` scope** when creating it
- **Check token hasn't expired** in GitHub settings
- **Clear localStorage** and try again: `localStorage.clear()` in console
- **Check console for errors** (F12 → Console tab)

### Sync Not Working

- **Check sync status indicator** - shows any errors
- **Verify you're signed in** as the repository owner
- **Check GitHub API rate limits**: 5000 requests/hour when authenticated
- **Manual sync**: Click the sync status indicator

### Public View Shows Stale Data

- **GitHub Pages CDN caching** - wait 1-2 minutes for updates
- **Hard refresh**: Ctrl+Shift+R (Cmd+Shift+R on Mac)
- **Check deployment**: Repository → Actions to see if Pages deployed

### Nothing Loads / Blank Screen

- **Check browser console** for errors (F12)
- **Ensure JavaScript is enabled** in browser
- **Clear site data** and reload
- **Try different browser** to isolate issue

### Changes Don't Appear on Other Devices

- **Wait for sync** - takes up to 5 minutes on auto-sync
- **Manual sync** - click sync status indicator
- **Check both devices are signed in** with same account
- **Verify GitHub Pages deployed** - check repository Actions tab

## Browser Compatibility

Works in all modern browsers:

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

Requires:

- LocalStorage support
- ES6+ JavaScript support
- CSS Custom Properties support
- Fetch API support

## FAQ

**Q: Can multiple people edit the same tracker?**
A: No, only the repository owner can edit. Others see a read-only view. They can fork to create their own.

**Q: Can I make my tracker completely private?**
A: Make your repository private in GitHub settings. Public viewers won't be able to see your data, but you'll still be able to sync across your devices.

**Q: Where's the notepad feature?**
A: Removed for privacy since user data is public. Use external note-taking apps for private notes.

**Q: Can I export my data?**
A: Yes! It's stored as JSON in your repository. You can download `data/user-data.json` anytime, or check git history for previous versions.

**Q: What happens if I lose my token?**
A: Generate a new token and sign in again. Your data is safe in GitHub - you just can't edit until you authenticate.

**Q: Can I use this without GitHub?**
A: Yes, but you'll lose cross-device sync and public sharing. Just open `index.html` locally and it will work with localStorage only.

## Support & Contact

- **Issues**: [GitHub Issues](https://github.com/JapanColorado/learning-tracker/issues)
- **Fork & Modify**: Adapt for your own use!
- **Pull Requests**: Contributions welcome

## License

MIT License - feel free to use, modify, and distribute.

---

**Made with** ❤️ **for lifelong learners**

**Last Updated**: November 2025
**Version**: 2.0 (GitHub Integration)
