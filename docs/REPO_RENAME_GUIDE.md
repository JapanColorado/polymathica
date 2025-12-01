# Repository Rename Guide

This guide walks you through renaming your Polymathica learning tracker repository and updating all references.

## Prerequisites

- Administrative access to your GitHub repository
- A GitHub Personal Access Token (you'll need to re-authenticate after rename)
- Your new desired repository name

## Important Notes

⚠️ **Warning:** Renaming your repository will:
- Change your GitHub Pages URL
- Break existing links to your tracker
- Require re-authentication with your Personal Access Token
- Require updating the config.js file

✅ **Good News:**
- GitHub automatically redirects old URLs for a period
- Your data is preserved
- The process is reversible

---

## Step 1: Rename Repository on GitHub

1. Go to your repository on GitHub
2. Click **Settings** (repository settings, not your account)
3. Scroll down to the "Repository name" section
4. Enter your new repository name (e.g., `my-learning-journey`)
5. Click **Rename**

GitHub will show a confirmation page with the new URL.

**New Repository URL Format:**
```
https://github.com/YOUR_USERNAME/NEW_REPO_NAME
```

---

## Step 2: Update GitHub Pages URL

Your GitHub Pages URL will automatically update to:
```
https://YOUR_USERNAME.github.io/NEW_REPO_NAME/
```

**Note:** It may take a few minutes for GitHub Pages to reflect the change.

### Verify GitHub Pages is Working

1. Go to **Settings** → **Pages**
2. Verify the source is set to `main` branch
3. Wait for the green "Your site is published" message
4. Visit your new URL to confirm it loads

---

## Step 3: Update config.js

You **must** update the repository name in your code:

1. Open `config.js` in your code editor
2. Find the `github` section (around line 6)
3. Update the `repoName` field:

```javascript
const CONFIG = {
    github: {
        clientId: 'Ov23limAHgxWKUF6JeG8',
        repoOwner: 'YOUR_USERNAME',        // Keep this as your GitHub username
        repoName: 'NEW_REPO_NAME',          // ← UPDATE THIS
        branch: 'main'
    },
    // ... rest of config
};
```

**Example:**
```javascript
repoName: 'my-learning-journey',  // Changed from 'learning-tracker'
```

---

## Step 4: Commit and Push Changes

After updating config.js:

```bash
git add config.js
git commit -m "Update repository name in config"
git push origin main
```

**Note:** If you get an error about the remote URL, update it:

```bash
git remote set-url origin https://github.com/YOUR_USERNAME/NEW_REPO_NAME.git
```

---

## Step 5: Re-authenticate

Because the repository name changed, you'll need to re-authenticate:

1. Visit your new GitHub Pages URL
2. You'll be automatically signed out
3. Click **Sign In**
4. Enter your GitHub Personal Access Token
5. Your data will sync from the renamed repository

**Why re-authenticate?**
The app stores the repository name when you first authenticate. After a rename, it needs to re-initialize with the new repository path.

---

## Step 6: Update Bookmarks and Links

Update any bookmarks or links you have to your tracker:

**Old URL:**
```
https://YOUR_USERNAME.github.io/learning-tracker/
```

**New URL:**
```
https://YOUR_USERNAME.github.io/NEW_REPO_NAME/
```

---

## Troubleshooting

### Problem: GitHub Pages not working after rename

**Solution:**
1. Go to Settings → Pages
2. Change Source to "None", save
3. Change Source back to "main" branch, save
4. Wait 2-3 minutes

### Problem: Authentication fails after rename

**Solution:**
1. Clear your browser's localStorage:
   - Open browser console (F12)
   - Type: `localStorage.clear()`
   - Press Enter
2. Refresh the page
3. Sign in again with your token

### Problem: Data not loading after rename

**Solution:**
1. Verify `config.js` has the correct `repoName`
2. Commit and push the changes
3. Wait for GitHub Pages to rebuild (2-3 minutes)
4. Clear localStorage and re-authenticate

### Problem: Old URL still works

**Explanation:**
GitHub automatically sets up redirects from old repository URLs. This is temporary and may expire after a few months. Update your links to use the new URL.

---

## Reverting a Rename

If you want to revert to the old name:

1. Rename the repository back on GitHub
2. Update `config.js` with the old name
3. Commit and push
4. Re-authenticate

---

## Best Practices

1. **Choose a meaningful name** - Pick something you'll stick with
2. **Update immediately** - Don't delay updating config.js
3. **Test thoroughly** - Visit your app and verify everything works
4. **Document the change** - Note the new URL somewhere safe

---

## Summary Checklist

- [ ] Renamed repository on GitHub
- [ ] Verified GitHub Pages URL updated
- [ ] Updated `config.js` with new `repoName`
- [ ] Committed and pushed changes
- [ ] Re-authenticated on the new URL
- [ ] Tested data loading and saving
- [ ] Updated bookmarks/links
- [ ] Verified sync is working

---

## Need Help?

If you encounter issues:

1. Check the [GitHub Pages documentation](https://docs.github.com/en/pages)
2. Verify your Personal Access Token hasn't expired
3. Open an issue on the original Polymathica repository
4. Check browser console for error messages

---

**Last Updated:** 2025-12-01
