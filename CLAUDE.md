# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Learning Tracker is a single-file HTML application for tracking learning progress across multiple subjects. It's a purely client-side app with no build step or dependencies - just open `learning-tracker.html` in a browser.

## Development

**Running the application:**
```bash
# Open in default browser (Linux)
xdg-open learning-tracker.html

# Or simply open the file in any modern browser
```

No build, lint, or test commands - this is a standalone HTML file with embedded CSS and JavaScript.

## Architecture

### Single-File Structure

All code lives in `learning-tracker.html`:
- **CSS Styles** (~lines 7-1012): Comprehensive styling with dark/light theme support via CSS custom properties
- **HTML Structure** (~lines 1-300): Static UI structure with modals, filters, and stats dashboard
- **JavaScript Application** (~lines 1014+): All application logic in vanilla JS

### Data Model

The app manages three main data structures stored in localStorage:

1. **`subjects`** - The catalog of learning subjects organized by tier (Mathematics, Physics, Chemistry, etc.)
   - Each subject has: `id`, `name`, optional `prereq` (prerequisites), `coreq` (corequisites), `soft` (soft prerequisites)
   - Loaded from `defaultSubjects` constant, persisted in localStorage as 'subjects'

2. **`subjectState`** - Status tracking for each subject
   - Possible statuses: 'not-started', 'in-progress', 'completed'
   - Persisted in localStorage as 'subjectTracker'

3. **`subjectNotes`** - Notes/summaries for each subject (Markdown format)
   - Persisted in localStorage as 'subjectNotes'

### Key Functions

**State Management:**
- `loadSubjects()`, `loadState()`, `loadNotes()` - Load data from localStorage on init
- `saveSubjects()`, `saveState()`, `saveNotesState()` - Persist changes to localStorage
- `getSubjectStatus(id)`, `setSubjectStatus(id, status)` - Get/set subject completion status

**Dependency Logic:**
- `calculateReadiness(subject)` - Determines if a subject is ready/partial/locked based on prerequisites
- Returns 'ready', 'partial', or 'locked' based on completion of prerequisites

**Rendering:**
- `render()` - Main render function that rebuilds the entire subject list
- `renderTier(tierName, tierData)` - Renders a tier section with all its subjects
- `renderSubjectCard(subject)` - Renders individual subject cards with status and dependencies
- `updateStats()` - Updates the stats dashboard (total, completed, in-progress, ready counts)

**User Actions:**
- `cycleStatus(id, event)` - Click on a card to cycle through statuses
- `openNotesModal(subjectId)` - Open markdown notes editor for a subject
- `openSubjectEditor(subjectId)` - Open modal to add/edit subjects
- `applyFilters()` - Filter subjects by status or search term

### Theme System

Uses CSS custom properties (`--bg-primary`, `--text-primary`, etc.) with `[data-theme="dark"]` selector. Theme persisted in localStorage as 'theme'.

## Adding New Features

**Adding a new subject:**
- Users can add via UI (+ button), or edit `defaultSubjects` constant directly
- Each subject needs a unique `id` and `name`
- Optional: `prereq` array, `coreq` array, `soft` array for dependencies

**Modifying the data model:**
- Update the three data structures: `subjects`, `subjectState`, `subjectNotes`
- Update corresponding save/load functions
- Consider localStorage migration for existing users

**Adding new UI elements:**
- All UI is rendered via string template literals in render functions
- Update the relevant `render*()` function
- Add event listeners in the initialization code at the bottom of the script

## Data Flow

1. Page load → `initializeTheme()` → load data from localStorage
2. User interaction → modify state → call `saveState()`/`saveSubjects()` → call `render()`
3. `render()` → loop through tiers → `renderTier()` → loop through subjects → `renderSubjectCard()`
4. Cards show status badges, dependency indicators, and readiness based on prerequisites
