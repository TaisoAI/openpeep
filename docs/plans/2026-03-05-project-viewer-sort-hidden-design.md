# Design: Project Viewer, Sort Options, Hidden Files

**Date:** 2026-03-05
**Status:** Approved

## Overview

Three related file browser enhancements:
1. Built-in pretty viewer for project.json
2. Sort options in the file tree
3. Show hidden files toggle in Settings

---

## Feature 1: project.json Pretty Viewer

**Approach:** Built-in React component (not a Peep — it's app metadata)

### Component: `ProjectViewer.tsx`

- Renders in PreviewPane when a file named `project.json` is selected
- Detection: filename check in PreviewPane's render logic (before Peep matching)
- Formatted card layout:
  - **Status** — color-coded badge using space's status list, clickable to change
  - **Description** — editable text area
  - **Type** — editable text field
  - Additional fields rendered as key-value pairs
- Saves via existing `POST /api/file` endpoint (writes JSON back)

### Why built-in (not a Peep)

- project.json is app metadata, not user content
- No iframe overhead
- Direct access to app state (space statuses, theme)
- Instant load

---

## Feature 2: Show Hidden Files Toggle

### Backend

- `/api/files` gets optional `showHidden` query param (default: `false`)
- When `true`, skip the `.startswith(".")` filter in files.py

### Frontend

- New toggle in Settings modal under a "File Browser" section
- Persisted in `openpeep.config.json` as `showHiddenFiles: boolean`
- Passed as query param when calling `api.listFiles()`

### Config

- `sources.py` reads/writes the new field
- Default: `false` (preserves current behavior)

---

## Feature 3: File Browser Sort Options

### Sort options

| Sort | Field | Default Direction |
|------|-------|-------------------|
| Name | name (case-insensitive) | A-Z (asc) |
| Date Modified | lastModified | Newest first (desc) |
| Date Created | createdAt | Newest first (desc) |
| Size | size | Largest first (desc) |
| Type | extension | A-Z (asc) |

Directories always sort first. Sort applied separately within dirs and files.

### Backend

- `/api/files` gets optional `sort` param: `name` (default), `modified`, `created`, `size`, `type`
- Optional `sortDir` param: `asc` (default for name/type) or `desc` (default for date/size)

### Frontend

- Sort dropdown in FileTree header (icon button)
- Each option toggles asc/desc on re-click
- Sort preference in component state (resets to Name on reload)

---

## Backlog Item

- Consider renaming `project.json` to `.project.json` (dotfile) — would auto-hide it, but requires migration logic and updating all references
