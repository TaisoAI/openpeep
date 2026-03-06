# PeepHub — Marketplace Spec (SUPERSEDED)

**Date:** 2026-03-05
**Status:** Superseded by `docs/peephub-integration.md`

> **Note:** This was the original GitHub-hosted design. The actual implementation uses S3-hosted zips with direct upload. See `docs/peephub-integration.md` for the current spec and `taiso/peephub` for the implementation.

---

## Overview

PeepHub is the companion marketplace for OpenPeep. It's a lightweight curation and discovery layer — it doesn't host peep code, just points to it.

**URL:** peephub.ai
**Repo:** taiso/peephub (separate from openpeep)

---

## Core Principle

PeepHub hosts nothing. Authors host their own peeps on GitHub. PeepHub is just a searchable catalog of pointers with social features.

```
Author's GitHub repo           PeepHub                    User's machine
┌──────────────┐          ┌──────────────┐          ┌──────────────────┐
│ my-peep/     │          │ Catalog DB   │          │ ~/.openpeep/     │
│   peep.json  │◀─install─│   repo URL   │─browse──▶│   peeps/         │
│   index.html │  (direct │   metadata   │          │     my-peep/     │
│   icon.svg   │  from GH)│   votes/stars│          │       peep.json  │
└──────────────┘          └──────────────┘          │       index.html │
                                                    └──────────────────┘
```

---

## Distribution Model

- Peep code lives in the **author's GitHub repo** (their storage, their bandwidth)
- PeepHub registry is a **GitHub repo of small JSON listing files** (~1KB each)
- Authors submit via **pull request** to the registry repo (GitHub IS the auth)
- Install downloads directly from the **author's GitHub releases/repo**
- PeepHub DB stores only catalog metadata (name, URL, votes, stars)

### Why GitHub-based

- Authors already have GitHub accounts
- Free storage and bandwidth for public repos
- PRs are a familiar submission workflow
- No file hosting costs for PeepHub ever

---

## Two-Tier Catalog

### Curated (default tab)

- PR reviewed by OpenPeep team (manual) or AI agent + manual approval
- Merged to registry repo with `"curated": true`
- Quality checked, tested, works well
- This is the default Browse experience

### Community (opt-in tab)

- PR auto-merged after CI passes (schema valid, repo exists, basic scan)
- Listed with `"curated": false`
- Warning badge on listings
- Hidden by default — user enables via settings toggle: `☑ Show community peeps`

---

## Submission Flow

```
1. Author builds peep locally
   └─ my-peep/peep.json + index.html

2. Author pushes to their GitHub repo
   └─ github.com/jane/csv-viewer

3. Author forks peephub/registry repo
   └─ Adds peeps/csv-viewer.json:
      {
        "id": "csv-viewer",
        "name": "CSV Viewer",
        "author": "jane",
        "authorGithub": "jane",
        "repo": "github.com/jane/csv-viewer",
        "version": "1.2.0",
        "description": "View and edit CSV files with sorting and charts",
        "tags": ["data", "viewer", "csv"],
        "icon": "icon.svg"
      }

4. Author opens PR to peephub/registry

5. CI runs:
   - Schema validation (required fields, valid JSON)
   - Repo exists and is public
   - Repo contains valid peep.json
   - Downloads peep, basic security scan
   - (Optional) AI agent reviews code quality

6a. Curated path: Team reviews → approves → merges
6b. Community path: CI passes → auto-merge

7. GitHub webhook fires → PeepHub API upserts listing in DB
```

---

## Registry Listing Schema

```json
{
  "id": "csv-viewer",
  "name": "CSV Viewer",
  "author": "jane",
  "authorGithub": "jane",
  "repo": "github.com/jane/csv-viewer",
  "version": "1.2.0",
  "description": "View and edit CSV files with sorting, filtering, and chart generation",
  "tags": ["data", "viewer", "csv"],
  "icon": "icon.svg",
  "curated": false,
  "screenshots": ["screenshot1.png", "screenshot2.png"]
}
```

---

## Social Features

### No auth required
- Browse catalog
- Search / filter by tags
- Install peeps
- View stars, votes, comments

### GitHub OAuth required (via peephub.ai)
- Star a peep (toggle)
- Upvote / downvote a peep
- Watch a peep (notifications on new versions)
- Comment on a peep (with upvotes on comments)

### Auth flow
1. User clicks Star/Vote/Comment in OpenPeep Browse tab
2. Redirects to peephub.ai GitHub OAuth
3. Token stored locally in `~/.openpeep/config.json`
4. Subsequent social actions use stored token
5. OpenPeep local app never has auth — token is just passed through to PeepHub API

---

## PeepHub Database

Lightweight Postgres (or SQLite for v1):

**peeps** — id, name, author, repo_url, version, description, tags, icon, curated, scanned, scan_date, created_at, updated_at, install_count

**users** — github_id, github_username, avatar_url, created_at

**stars** — user_id, peep_id, created_at

**votes** — user_id, peep_id, value (+1/-1), created_at

**watches** — user_id, peep_id, created_at

**comments** — id, user_id, peep_id, body, upvotes, created_at, updated_at

---

## Install Flow (OpenPeep client side)

```
User clicks Install in Browse tab
  └─ Frontend calls: POST /api/peeps/install { repo: "github.com/jane/csv-viewer", version: "1.2.0" }
  └─ Local backend:
       1. Downloads zip/tarball from GitHub release (or repo archive)
       2. Extracts to ~/.openpeep/peeps/csv-viewer/
       3. Validates peep.json exists and is valid
       4. Returns success
  └─ Frontend refreshes peep list
  └─ (Optional) Pings PeepHub API to increment install count
```

---

## Listing UI (inside OpenPeep Browse tab)

```
┌─────────────────────────────────────────────────┐
│  CSV Viewer                            ⭐ 342   │
│  by jane · v1.2.0 · Updated 2 days ago          │
│                                                  │
│  View and edit CSV files with sorting,           │
│  filtering, and chart generation.                │
│                                                  │
│  ▲ 89  ▼ 3        👁 28 watching                │
│                                                  │
│  [Install]   [View on GitHub]                    │
│                                                  │
│  ── Comments (12) ──────────────────────────     │
│  @mike · 3d ago                                  │
│  Works great with large files. Would love        │
│  export to Excel.                                │
│     ▲ 5                                          │
│                                                  │
│  @jane (author) · 2d ago                         │
│  Excel export coming in v1.3!                    │
│     ▲ 8                                          │
└─────────────────────────────────────────────────┘
```

---

## Security

Peeps are **iframe-sandboxed** — a malicious peep cannot:
- Access the filesystem
- Read other peeps' data
- Execute system commands
- Access the host app's state

Worst case: a bad peep shows garbage in its own iframe. This is fundamentally safer than OpenClaw's model where skills have full system access.

Additional safety layers:
- CI scans on submission (schema validation, basic code review)
- AI agent review for curated peeps
- Community voting surfaces quality issues
- Easy uninstall (just delete the folder)

---

## Phased Rollout

**Phase 1 (now):** Build peeps. Local install from zip/folder. No marketplace.

**Phase 2:** Registry repo + webhook → DB. Browse tab shows curated listings. Install from GitHub. No social features yet.

**Phase 3:** peephub.ai web frontend. GitHub OAuth. Stars, votes, comments, community tab.

**Phase 4 (future):** Paid peeps, revenue share, analytics dashboard for authors.

---

## Cost

| Component | Cost |
|-----------|------|
| Peep code hosting | $0 (author's GitHub) |
| Registry repo | $0 (GitHub free tier) |
| PeepHub API | ~$5-20/mo (small VPS or Lambda) |
| Postgres | ~$0-15/mo (free tier or small instance) |
| Domain (peephub.ai) | ~$15/yr |
| Install bandwidth | $0 (downloads from author's GitHub) |
| **Total** | **~$10-40/mo** |
