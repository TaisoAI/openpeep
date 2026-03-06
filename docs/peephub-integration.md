# OpenPeep ↔ PeepHub Integration Spec

**Date:** 2026-03-05
**Status:** Active
**Repos:** `taiso/openpeep` (client), `taiso/peephub` (service)

---

## Overview

PeepHub is the marketplace for OpenPeep peeps. Authors publish peeps from inside OpenPeep. Users browse, install, and update peeps from inside OpenPeep. The PeepHub website (`peephub.ai`) is for marketing, discovery, and publisher dashboards (download stats, ratings, comments) — not the primary workflow.

**Everything happens inside OpenPeep. PeepHub is the service behind it.**

---

## Configuration

OpenPeep connects to PeepHub via the `peephub.url` field in `openpeep.config.json`:

```json
{
  "peephub": {
    "url": "https://api.peephub.ai"
  }
}
```

The URL is configurable per environment:
- **Production default:** `https://api.peephub.ai` (bundled fallback if not set)
- **Staging:** `https://staging-api.peephub.ai`
- **Local dev:** `http://localhost:3000`

The OpenPeep backend reads this from the config file. If `peephub.url` is not set, it falls back to `https://api.peephub.ai`.

---

## Peep Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                        AUTHOR FLOW                              │
│                                                                 │
│  AI creates peep ──► Test in OpenPeep ──► Publish to PeepHub   │
│  <project>/peeps/     (live preview)       (zip + upload)       │
│                                                                 │
│  Keep editing ──► Bump version ──► Publish update               │
│  (local copy stays)  peep.json      (new version uploaded)      │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                       CONSUMER FLOW                             │
│                                                                 │
│  Browse PeepHub ──► Install ──► Use ──► Update when available   │
│  (inside OpenPeep)   (download   (auto-    (re-download,        │
│                       to ~/      matched)   replace)             │
│                       .openpeep/                                │
│                       peeps/)                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Three-Tier Peep Storage

| Tier | Path | How it gets there | Priority |
|------|------|-------------------|----------|
| Project | `<workspace>/peeps/` | AI creates during work | Highest |
| Installed | `~/.openpeep/peeps/` | Downloaded from PeepHub | Middle |
| Built-in | `<app>/peeps/` | Ships with OpenPeep | Lowest |

Higher tier shadows lower tier on same peep `id`.

---

## PeepHub API (What OpenPeep Calls)

Base URL: value of `peephub.url` from config (default: `https://api.peephub.ai`)

### Browse & Search

```
GET /api/peeps?q=csv&category=viewer&sort=downloads&page=1&limit=20
```
Returns paginated list of published peeps. No auth required.

**Response:**
```json
{
  "peeps": [
    {
      "id": "uuid",
      "slug": "csv-viewer",
      "name": "CSV Viewer",
      "description": "View and edit CSV files",
      "category": "viewer",
      "iconUrl": "https://cdn.peephub.ai/csv-viewer/icon.svg",
      "tags": ["data", "csv"],
      "latestVersion": "1.2.0",
      "totalDownloads": 1542,
      "featured": true,
      "author": { "name": "jane", "avatarUrl": "..." }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

### Peep Detail

```
GET /api/peeps/{slug}
```
Returns full peep info with version history. No auth required.

### Categories

```
GET /api/peeps/categories
```
Returns list of categories with counts. No auth required.

### Featured

```
GET /api/peeps/featured
```
Returns up to 12 featured peeps. No auth required.

### Download / Install

```
GET /api/peeps/{slug}/download?version=1.2.0
```
Returns 303 redirect to S3/CloudFront zip URL. Increments download counter. No auth required. Version param optional (defaults to latest).

### Publish (New Peep)

```
POST /api/peeps
Content-Type: multipart/form-data
Authorization: Bearer <token>

zip: <file>
category: "editor"
tags: "youtube, poll"
```
Auth required. Creates peep + first version. Returns 201 with peep and version data.

### Publish Update (New Version)

```
POST /api/peeps/{slug}/versions
Content-Type: multipart/form-data
Authorization: Bearer <token>

zip: <file>
changelog: "Added quiz mode support"
```
Auth required. Owner only. Creates new version, updates `latestVersion`.

### Update Metadata

```
PUT /api/peeps/{slug}
Authorization: Bearer <token>

{ "description": "...", "tags": ["..."], "category": "editor" }
```
Auth required. Owner only. No re-upload needed.

---

## OpenPeep Backend Endpoints (New)

These endpoints proxy to PeepHub and handle local install/publish operations.

### Install a Peep

```
POST /api/peeps/install
{ "slug": "youtube-polls", "version": "1.0.0" }
```

**Flow:**
1. Read `peephub.url` from config
2. `GET {peephub_url}/api/peeps/{slug}/download?version={version}`
3. Follow 303 redirect, download zip
4. Extract to `~/.openpeep/peeps/{slug}/`
5. Validate extracted `peep.json`
6. Return success with installed manifest

**Error cases:**
- Peep not found on PeepHub → 404
- Download failed → 502
- Invalid peep.json in zip → 422
- Slug conflict with built-in → 409

### Update a Peep

```
POST /api/peeps/update
{ "slug": "youtube-polls" }
```

**Flow:**
1. Read current version from `~/.openpeep/peeps/{slug}/peep.json`
2. `GET {peephub_url}/api/peeps/{slug}` to check latest version
3. If latest > current, download and replace
4. Return success with new version or "already up to date"

### Check for Updates

```
GET /api/peeps/updates
```

**Flow:**
1. Scan `~/.openpeep/peeps/` for installed peeps
2. Batch-check versions against PeepHub
3. Return list of peeps with available updates

### Publish a Peep

```
POST /api/peeps/publish
{
  "peepPath": "/path/to/peep/folder",
  "category": "editor",
  "tags": ["youtube", "poll"],
  "changelog": "Initial release"
}
```

**Flow:**
1. Validate peep locally (see Client-Side Validation below)
2. Zip the peep folder
3. Read PeepHub auth token from config
4. `POST {peephub_url}/api/peeps` (new) or `POST {peephub_url}/api/peeps/{slug}/versions` (update)
5. Return success with PeepHub response

### Browse PeepHub

```
GET /api/peephub/browse?q=csv&category=viewer&sort=downloads&page=1
```

Proxies to `GET {peephub_url}/api/peeps` with query params. Returns PeepHub response. This allows the frontend to avoid CORS issues and keeps the PeepHub URL configurable server-side.

### PeepHub Auth

```
POST /api/peephub/auth
{ "provider": "github" }
```

Initiates OAuth flow with PeepHub. Stores token in `openpeep.config.json` under `peephub.token`. Used for publish and social features.

---

## Client-Side Validation (Before Upload)

OpenPeep validates locally before sending to PeepHub. Fast feedback, no round trip.

| Check | Rule | Severity |
|-------|------|----------|
| `peep.json` exists | Must be present | Error |
| Valid JSON | Must parse | Error |
| `id` field | Required, matches `/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/` | Error |
| `name` field | Required, non-empty | Error |
| `version` field | Required, valid semver | Error |
| `description` field | Required, non-empty | Error |
| `entry` field | Required, file must exist in peep folder | Error |
| `capabilities` field | Required, non-empty array of: view, edit, tools, verify, bundle | Error |
| `matches` field | Required, must have at least one of: extensions[], fileNames[], contentMatch | Error |
| `builtin` field | Must not be `true` | Error |
| Total size | Under 10MB | Error |
| Icon file | If referenced in manifest, must exist | Warning |

### Server-Side Validation (PeepHub re-checks everything)

PeepHub re-validates the entire zip on upload. Same rules as client-side, plus:

| Check | Rule | Severity |
|-------|------|----------|
| Slug ownership | Same author or new slug | Error (409) |
| Version uniqueness | No duplicate version | Error (409) |
| Zip integrity | Must be valid zip | Error |
| Entry in zip | Entry file exists in extracted zip | Error |

---

## PeepHub S3 Storage Structure

```
s3://peephub-plugins/
├── {slug}/
│   ├── icon.{svg|png}
│   ├── versions/
│   │   ├── 1.0.0/peep.zip
│   │   ├── 1.1.0/peep.zip
│   │   └── 1.2.0/peep.zip
│   └── screenshots/
│       ├── 0.png
│       └── 1.png
```

CloudFront CDN in front. Download endpoint redirects (303) to CDN URL.

---

## Auth Model

PeepHub uses NextAuth with OAuth providers (GitHub, Google, Apple). OpenPeep stores the auth token locally:

```json
{
  "peephub": {
    "url": "https://api.peephub.ai",
    "token": "eyJ..."
  }
}
```

Token is obtained via OAuth flow initiated from OpenPeep, completed in browser, token returned to OpenPeep app. Used for publish and social actions (stars, comments, flags).

Browse, search, download, and install do NOT require auth.

---

## Error Handling

All PeepHub API errors return:
```json
{
  "error": "Human-readable message",
  "details": ["Specific validation issue 1", "Specific validation issue 2"]
}
```

OpenPeep should surface these messages to the user. Never add fallback logic that masks errors — show the real error so it can be fixed.

---

## Phased Rollout

**Phase 1 (current):** Peeps work locally. Three-tier discovery. No PeepHub integration yet.

**Phase 2:** Install from PeepHub (browse, download, install endpoints). Publish from OpenPeep.

**Phase 3:** Social features (stars, comments, flags) via PeepHub OAuth. Update notifications.

**Phase 4:** Paid peeps, revenue share, analytics dashboard on peephub.ai.
