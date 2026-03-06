# Internal Dev Release Milestone

## Architecture

```
www (openpeep.taiso.ai)     <- sign up, user management, landing page
    | Cognito SSO
PeepHub (peephub.ai)        <- marketplace, uses SSO from www
    | OAuth token
OpenPeep (desktop app)      <- "Login with OpenPeep" button, browser OAuth, token stored locally
```

Users sign up once on www, SSO into PeepHub, and log in from OpenPeep via browser OAuth (like `gh auth login`). No API keys to copy-paste.

---

## Task List

### Auth (Cognito SSO) — Critical Path
1. Set up AWS Cognito user pool + app client
2. Build www site (openpeep.taiso.ai) — landing page, sign up, profile
3. PeepHub SSO — swap NextAuth to Cognito provider
4. OpenPeep OAuth flow — "Login with OpenPeep" button in Settings, opens browser, stores token locally
5. Track uploads/downloads per authenticated user

### Install Flow — Critical Path
6. `POST /api/peeps/install` endpoint — download zip from PeepHub, extract to `~/.openpeep/peeps/`
7. Wire up Install/Update buttons in Browse tab with onClick handlers
8. Version check — show update badges when newer version available on PeepHub

### Claude Code Plugin — Critical Path
9. `@openpeep/claude-code` npm package (MCP server)
10. PeepSDK knowledge baked into tool descriptions
11. Tools: create_peep, preview_peep, publish_peep, list_files, read_file

### www Site
12. Landing page — "every file type deserves its own app" story
13. "What is a Peep?" explainer page
14. "Make a Peep" getting started guide
15. Sign up / login (Cognito hosted UI or custom)
16. User profile page

### Repo Cleanup & DevEx
17. OpenPeep README with setup instructions
18. PeepHub README with setup instructions
19. `.env.example` files for both repos
20. Setup script or docker-compose for local dev
21. Clean stray screenshots/logs from repo roots
22. First-run wizard in OpenPeep (pick workspace, pick theme)

### PeepHub Polish
23. Homepage cards show thumbnails (currently only /peeps browse page does)
24. Seed PeepHub with built-in peeps so it's not empty on first visit
25. Download counter increment on install

### Onboarding & Tutorials
26. Getting Started guide — install OpenPeep, add a workspace, open your first file
27. Use case walkthrough: "Organize your project with Board view"
28. Use case walkthrough: "Preview and edit Markdown/JSON/HTML side by side"
29. Use case walkthrough: "Build a custom viewer for your team's file format with Claude"
30. Tutorial: "Make Your First Peep" — step-by-step from scratch to publish
31. Tutorial: "Build a Peep in 5 Minutes with Claude Code" — conversational workflow

### Showcase Peeps — File Viewers/Editors
32. CSV Viewer — table view with sort/filter, charts
33. TODO List — .todo or todo.json, checkboxes, priorities, due dates
34. Recipe Viewer — .recipe files, ingredients, steps, cook timer
35. Changelog Viewer — CHANGELOG.md with version timeline UI
36. Env File Editor — .env files with masked values, add/remove/edit
37. Color Palette — .colors or palette.json, swatches, copy hex codes
38. API Response Viewer — .http or response.json, headers, body, status codes
39. Bookmark Manager — bookmarks.json, folders, tags, favicons
40. Invoice/Receipt Viewer — invoice.json, line items, totals, print layout
41. Flashcard Viewer — flashcards.json, flip cards, spaced repetition, quiz mode

### Showcase Peeps — Bundles (folder-level apps, the Notion-killer demos)
42. Project Manager — claims folders with project.json, kanban board, timeline, file list
43. Blog Engine — claims posts/ folder, drafts, published, markdown preview, front matter editor
44. Client Portal — claims client folders, invoices, contracts, notes, activity timeline
45. Course Builder — claims course/ folder, modules, lessons, quizzes, progress tracking
46. Design System — claims design/ folder, component library, tokens, live preview

---

## Critical Path

```
Auth (1-4) --> Install flow (6-7) --> Claude Code plugin (9-11)
```

Everything else (www content, docs, repo cleanup, polish) can be parallelized around the critical path.

---

## Vision

### The Story of Peep

Every file type deserves its own app. Today you open a `.csv` and get a wall of commas. You open a project folder and get a list of filenames. What if every file and folder could open in a purpose-built app — a spreadsheet, a kanban board, a recipe viewer, a design system browser?

That's what a Peep is. It's a full web app (HTML/CSS/JS, any framework, any library) that activates when you open a matching file or folder. No sandbox limitations — Three.js, D3, Monaco, React, Canvas, WebGL — whatever you want. The only difference from a standalone web app is it gets its data from OpenPeep instead of its own backend.

### From App Stores to Personal Apps

We're used to a world with 100,000 apps on the App Store, built by companies for millions of people. But AI changes this. When Claude can build a working app in 5 minutes from a conversation, the model flips:

- **Old world**: 100,000 apps built by companies → millions of consumers pick from a fixed menu
- **New world**: millions of people each create their own constellation of micro-apps → built for exactly how they work

Don't like the layout? "Move the timer to the top." Need a feature? "Add a shopping list." Someone else grabs your peep from PeepHub, tells Claude "add calorie tracking." Now there are two versions, both customized to exactly what each person needs.

PeepHub isn't an app store. It's a starting point. Every peep is a template you can fork and make your own.

### Beyond Files

OpenPeep starts as a file viewer, but the model extends to everything on your machine:

- Process manager, dev servers, Docker containers
- Git UI, terminal, system monitoring
- API testing, database browser, log viewer

AI coding means non-technical people are suddenly working in terminals and running dev servers. They need visual tools that don't require learning `ps aux | grep`. OpenPeep becomes the GUI layer for the entire machine — and every tool is a web app that Claude can build and customize for you.

### The Claude Code Loop

The killer workflow:
1. "Hey Claude, build me a recipe manager"
2. Claude creates the peep, you preview it live in OpenPeep
3. "Add a cooking timer and shopping list export"
4. Claude iterates, you see changes instantly
5. "Publish it" — it's on PeepHub in one click
6. Someone else installs it, customizes it further with their own Claude session

Every user is a developer. Every file type gets its own app. Every app is customizable.

---

## Current State (as of 2026-03-06)

### What works
- OpenPeep: file viewer/editor, board view, three-tier peep system, theme system, settings
- PeepHub: browse, publish with live preview + thumbnail generation, API key auth (temporary)
- 10 built-in peeps (text, markdown, html, json, image, audio, video, 3d model, meeting notes)
- 1 community peep published (YouTube Polls v1.6.0)
- Publish flow: preview + sample data review before submitting
- Server-side thumbnail capture via Playwright

### What's broken/missing
- Install/Update buttons in Browse tab are non-functional (no onClick, no backend endpoint)
- Auth is shared API key only (no per-user identity)
- No www site
- No Claude Code plugin
- No setup docs or install scripts
- PeepHub homepage doesn't show thumbnails on cards
- Stray screenshots and logs in repo roots

---

## Backlog (post-internal release)
- Namespaced slugs (`@username/peep-name`) to prevent conflicts
- Fork button — copy a peep to your account, "forked from @user/peep" attribution
- Stars / likes
- Comments / reviews
- Rate limiting on publish
- Content moderation / similarity detection
- Analytics dashboard (download charts, usage stats)
- Paid peeps / revenue sharing
- System peeps: process manager, dev server dashboard, Docker UI, git UI
- PeepSDK v2: streaming data, WebSocket support, inter-peep communication
