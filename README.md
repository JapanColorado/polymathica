# Learning Tracker

Learning Tracker is a web application designed to help you track learning progress across 87 subjects spanning mathematics, sciences, and humanities. A purely client-side app with no build step or dependencies - just open `index.html` in a browser.

## Features

- **Dashboard**: View an overview of your in-progress subjects and projects.
- **Goal Setting**: Each subject can be given a specific learning goal to keep you motivated.
- **Subject Catalog**: Browse and manage a list of subjects you are learning or plan to learn.
- **Subject Management**: Add, edit, and delete subjects you are learning.
- **Resource Tracking**: Keep track of books, articles, videos, and courses related to each subject.
- **Project Management**: Add projects to each subject to apply what you've learned.
- **Progress Monitoring**: Mark resources and projects as completed, in-progress, or ready to learn to monitor your learning progress.
- **Prerequisites & Corequisites**: Define relationships between subjects to understand what to learn next or concurrently.
- **Add Notes**: Attach Google Doc notes to subjects, resources, and projects for better understanding and reference.
- **Integration with Google Drive**: Sync your Google Drive files with your learning resources for easy access and organization.

## Getting Started

Simply open the `index.html` file in any modern web browser:

```bash
# Linux
xdg-open index.html

# macOS
open index.html

# Or just double-click the file in your file manager
```

No installation, build step, or dependencies required!

## File Structure

```
learning-tracker/
├── index.html              # Main HTML file
├── styles.css              # All CSS styling
├── app.js                  # Application logic
├── data/
│   ├── subjects.js         # Default subjects data
│   └── summaries.js        # Subject summaries
└── learning-tracker.html   # Original single-file version
```

For more details about the file structure, see [REFACTORING-SUMMARY.md](REFACTORING-SUMMARY.md).
