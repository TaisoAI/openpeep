# Internal Dev Release Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship OpenPeep + PeepHub + Claude Code plugin to the internal dev team with working install/publish/auth flow and showcase content.

**Architecture:** Three apps — OpenPeep (Python/FastAPI + React/Vite desktop app), PeepHub (Next.js marketplace), www (landing site + auth via Cognito). Claude Code plugin is an npm MCP server package. Auth flows through AWS Cognito as central identity provider.

**Tech Stack:** Python/FastAPI, React 19, Next.js 16, Prisma/PostgreSQL, AWS Cognito/SES, TypeScript MCP server

---

## Phase 1: Install Flow (no auth dependency)

### Task 1: Backend install endpoint

**Files:**
- Modify: `/Users/hanleyleung/Git/taiso/openpeep/backend/routers/peeps.py`

**Step 1: Add install endpoint**

Add after the `publish_peep` endpoint:

```python
class InstallRequest(BaseModel):
    slug: str
    version: str | None = None

@router.post("/peeps/install")
def install_peep(req: InstallRequest):
    """Download a peep from PeepHub and install to ~/.openpeep/peeps/."""
    config = load_config()
    base_url = config.get("peephub", {}).get("url", "https://api.peephub.ai")

    # Download the zip
    try:
        params = {}
        if req.version:
            params["version"] = req.version
        resp = httpx.get(f"{base_url}/api/peeps/{req.slug}/download", params=params, follow_redirects=True, timeout=30)
        resp.raise_for_status()
    except httpx.ConnectError:
        raise HTTPException(status_code=502, detail=f"Cannot connect to PeepHub at {base_url}")
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Download timed out")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"PeepHub: {e.response.text}")

    zip_bytes = resp.content

    # Extract to ~/.openpeep/peeps/{slug}/
    import tempfile
    target_dir = INSTALLED_PEEPS_DIR / req.slug

    # Validate zip has peep.json
    try:
        zf = zipfile.ZipFile(io.BytesIO(zip_bytes))
        if "peep.json" not in zf.namelist():
            raise HTTPException(status_code=400, detail="Downloaded zip missing peep.json")
        manifest = json.loads(zf.read("peep.json"))
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="Invalid zip file from PeepHub")

    # Remove existing and extract
    if target_dir.exists():
        shutil.rmtree(target_dir)
    target_dir.mkdir(parents=True, exist_ok=True)
    zf.extractall(target_dir)

    return {"installed": True, "id": manifest.get("id", req.slug), "version": manifest.get("version", "unknown")}
```

**Step 2: Test manually**

```bash
curl -s -X POST http://localhost:8000/api/peeps/install \
  -H 'Content-Type: application/json' \
  -d '{"slug": "youtube-polls"}'
```

Expected: `{"installed": true, "id": "youtube-polls", "version": "1.6.0"}`

**Step 3: Commit**

```bash
git add backend/routers/peeps.py
git commit -m "feat: add peep install endpoint"
```

---

### Task 2: Frontend install/update API + button wiring

**Files:**
- Modify: `/Users/hanleyleung/Git/taiso/openpeep/frontend/src/utils/api.ts`
- Modify: `/Users/hanleyleung/Git/taiso/openpeep/frontend/src/components/PeepHub/PeepHub.tsx`

**Step 1: Add API methods**

In `api.ts`, add to the `api` object:

```typescript
installPeep: (slug: string, version?: string) =>
  fetchJSON<{ installed: boolean; id: string; version: string }>("/peeps/install", {
    method: "POST",
    body: JSON.stringify({ slug, version }),
  }),
```

**Step 2: Wire up Install/Update buttons in PeepHub.tsx**

Replace the static Install and Update buttons with working handlers. Add state for install loading:

```typescript
const [installingSlug, setInstallingSlug] = useState<string | null>(null);
```

Replace the Install button:
```tsx
<button
  className="..."
  disabled={installingSlug === entry.slug}
  onClick={async (e) => {
    e.stopPropagation();
    setInstallingSlug(entry.slug);
    try {
      await api.installPeep(entry.slug);
      // Refresh local peeps list
      const { peeps: updated } = await api.listPeeps();
      setPeeps(updated);
    } catch (err) {
      // Show error
    } finally {
      setInstallingSlug(null);
    }
  }}
>
  {installingSlug === entry.slug ? <Loader2 size={11} className="animate-spin" /> : "Install"}
</button>
```

Same pattern for the Update button.

**Step 3: Test in browser**

1. Open Peeps modal → Browse tab
2. Click Install on a peep
3. Verify it appears in Installed tab
4. Button should change to "Installed"

**Step 4: Commit**

```bash
git add frontend/src/utils/api.ts frontend/src/components/PeepHub/PeepHub.tsx
git commit -m "feat: wire up install/update buttons in Browse tab"
```

---

### Task 3: Version check badges

**Files:**
- Modify: `/Users/hanleyleung/Git/taiso/openpeep/frontend/src/components/PeepHub/PeepHub.tsx`

**Step 1: Add update available indicator on Installed tab**

When loading installed peeps, cross-reference with PeepHub to show update badges. Fetch hub data when opening the Installed tab and compare versions.

**Step 2: Commit**

```bash
git commit -m "feat: show update badges on installed peeps"
```

---

## Phase 2: Claude Code Plugin

### Task 4: Scaffold MCP server package

**Files:**
- Create: `/Users/hanleyleung/Git/taiso/openpeep-claude/package.json`
- Create: `/Users/hanleyleung/Git/taiso/openpeep-claude/tsconfig.json`
- Create: `/Users/hanleyleung/Git/taiso/openpeep-claude/src/index.ts`

**Step 1: Initialize package**

```bash
mkdir -p /Users/hanleyleung/Git/taiso/openpeep-claude
cd /Users/hanleyleung/Git/taiso/openpeep-claude
npm init -y
npm install @modelcontextprotocol/sdk zod
npm install -D typescript @types/node
```

**Step 2: Create package.json**

```json
{
  "name": "@openpeep/claude-code",
  "version": "0.1.0",
  "description": "Claude Code plugin for building and managing OpenPeep peeps",
  "main": "dist/index.js",
  "bin": { "openpeep-mcp": "dist/index.js" },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  }
}
```

**Step 3: Create MCP server entry**

`src/index.ts` — MCP server with tools:

- `list_files` — list files in a workspace directory
- `read_file` — read file content to understand formats
- `create_peep` — scaffold a new peep (peep.json + index.html + samples/)
- `preview_peep` — return the URL to preview a peep in OpenPeep
- `list_peeps` — list installed peeps
- `publish_peep` — publish a peep to PeepHub

Each tool description should include PeepSDK documentation so Claude knows the API.

**Step 4: Build and test**

```bash
npm run build
node dist/index.js
```

**Step 5: Commit**

```bash
git init
git add .
git commit -m "feat: initial MCP server for Claude Code"
```

---

### Task 5: PeepSDK knowledge in tool descriptions

**Files:**
- Modify: `/Users/hanleyleung/Git/taiso/openpeep-claude/src/index.ts`

**Step 1: Embed SDK docs in create_peep tool**

The `create_peep` tool description should include:
- Complete peep.json manifest spec
- PeepSDK API reference (on, send, ready, save, getInitData, rawFileUrl)
- postMessage protocol (peep:init, peep:theme, peep:save)
- Sample peep HTML template
- The samples/ directory convention
- Content matching rules (extensions, fileNames, contentMatch)

This way Claude has full context when building peeps without needing a CLAUDE.md.

**Step 2: Test with Claude Code**

Add to `.claude/settings.json`:
```json
{
  "mcpServers": {
    "openpeep": {
      "command": "node",
      "args": ["/Users/hanleyleung/Git/taiso/openpeep-claude/dist/index.js"]
    }
  }
}
```

Test: "List my installed peeps" → should return peep list from OpenPeep API.

**Step 3: Commit**

```bash
git commit -m "feat: embed PeepSDK docs in tool descriptions"
```

---

## Phase 3: Auth (AWS Cognito SSO)

### Task 6: Set up Cognito user pool

**Step 1: Create Cognito user pool via AWS Console or CDK**

- Pool name: `openpeep-users`
- Sign-in: email
- MFA: optional (SMS or TOTP)
- Required attributes: email, name
- App client: `openpeep-web` (for www/PeepHub) + `openpeep-desktop` (for OpenPeep OAuth)
- Hosted UI domain: `auth.openpeep.taiso.ai`
- Callback URLs: `http://localhost:3000/api/auth/callback/cognito`, `http://localhost:8000/api/auth/callback`
- SES integration for email verification

**Step 2: Note the pool ID, client IDs, and domain for env vars**

```
COGNITO_USER_POOL_ID=us-east-1_xxxxx
COGNITO_CLIENT_ID=xxxxx
COGNITO_CLIENT_SECRET=xxxxx
COGNITO_ISSUER=https://cognito-idp.us-east-1.amazonaws.com/us-east-1_xxxxx
```

**Step 3: Document in .env.example files**

---

### Task 7: PeepHub — swap NextAuth to Cognito

**Files:**
- Modify: `/Users/hanleyleung/Git/taiso/peephub/src/lib/auth.ts`
- Modify: `/Users/hanleyleung/Git/taiso/peephub/.env.example`

**Step 1: Add Cognito provider to NextAuth config**

```typescript
import CognitoProvider from "next-auth/providers/cognito";

CognitoProvider({
  clientId: process.env.COGNITO_CLIENT_ID!,
  clientSecret: process.env.COGNITO_CLIENT_SECRET!,
  issuer: process.env.COGNITO_ISSUER!,
})
```

**Step 2: Keep existing providers (GitHub, Google) as alternatives**

**Step 3: Test login flow via PeepHub UI**

**Step 4: Commit**

---

### Task 8: OpenPeep — browser OAuth login flow

**Files:**
- Modify: `/Users/hanleyleung/Git/taiso/openpeep/backend/routers/sources.py`
- Create: `/Users/hanleyleung/Git/taiso/openpeep/backend/routers/auth.py`
- Modify: `/Users/hanleyleung/Git/taiso/openpeep/frontend/src/components/Settings/Settings.tsx`

**Step 1: Add auth router with OAuth endpoints**

```python
# GET /api/auth/login — opens browser to Cognito hosted UI
# GET /api/auth/callback — receives code, exchanges for token, stores locally
# GET /api/auth/status — returns current auth state
# POST /api/auth/logout — clears stored token
```

Flow:
1. User clicks "Login" in Settings
2. Backend opens browser to Cognito hosted UI
3. User authenticates
4. Cognito redirects to `localhost:8000/api/auth/callback`
5. Backend exchanges code for tokens, stores in config
6. Frontend polls `/api/auth/status` and updates UI

**Step 2: Add Login/Logout UI in Settings**

Show user avatar + name when logged in, "Login with OpenPeep" button when not.

**Step 3: Use auth token for PeepHub API calls**

Pass `Authorization: Bearer {token}` on publish/install requests instead of API key.

**Step 4: Commit**

---

### Task 9: Track uploads/downloads per user

**Files:**
- Modify: `/Users/hanleyleung/Git/taiso/peephub/prisma/schema.prisma`
- Modify: `/Users/hanleyleung/Git/taiso/peephub/src/app/api/peeps/[slug]/download/route.ts`

**Step 1: Add download tracking table**

```prisma
model Download {
  id        String   @id @default(uuid())
  peepId    String   @map("peep_id")
  userId    String?  @map("user_id")
  version   String
  createdAt DateTime @default(now()) @map("created_at")

  peep Peep @relation(fields: [peepId], references: [id])
  user User? @relation(fields: [userId], references: [id])

  @@map("downloads")
}
```

**Step 2: Record download on install, increment counter**

**Step 3: Commit**

---

## Phase 4: www Site

### Task 10: Scaffold www site

**Files:**
- Create: `/Users/hanleyleung/Git/taiso/openpeep-www/`

**Step 1: Create Next.js app**

```bash
npx create-next-app@latest openpeep-www --typescript --tailwind --app
```

**Step 2: Set up pages:**

- `/` — Landing page ("every file type deserves its own app")
- `/what-is-a-peep` — Explainer with diagrams
- `/get-started` — Getting started guide
- `/make-a-peep` — Tutorial for building peeps
- `/login` — Cognito hosted UI redirect
- `/profile` — User profile (after auth)

**Step 3: Commit**

---

### Task 11: Landing page content

**Files:**
- Modify: `/Users/hanleyleung/Git/taiso/openpeep-www/src/app/page.tsx`

**Step 1: Write hero section**

"Every file type deserves its own app."

Show the paradigm shift: App Store (100k apps for millions) → PeepHub (millions of people making their own apps).

**Step 2: Feature sections**

- "Open any file" — built-in peeps for common formats
- "Build your own" — Claude Code builds peeps in 5 minutes
- "Share on PeepHub" — publish and fork
- "Beyond files" — bundles, process management, system tools

**Step 3: CTA**

- "Get OpenPeep" (download/install)
- "Browse PeepHub" (link to peephub)
- "Make a Peep" (tutorial)

**Step 4: Commit**

---

### Task 12: "What is a Peep?" page

**Step 1: Write explainer content**

- What: A web app that opens when you click a file/folder
- How: HTML + PeepSDK, talks to OpenPeep via postMessage
- Types: Viewers (read-only), Editors (read-write), Bundles (folder apps)
- Examples: CSV viewer, recipe manager, project dashboard
- Comparison: Like Notion templates, but for your actual files

**Step 2: Commit**

---

### Task 13: "Make a Peep" tutorial

**Step 1: Write step-by-step guide**

1. Create folder: `peeps/my-viewer/`
2. Create `peep.json` manifest
3. Create `index.html` with SDK import
4. Handle `peep:init` to receive file content
5. Render your UI
6. Add theme support
7. Add edit/save (optional)
8. Add `samples/` for PeepHub preview
9. Publish to PeepHub

**Step 2: Write "Build with Claude Code" shortcut version**

1. Install `@openpeep/claude-code`
2. "Build me a peep for .recipe files"
3. Claude does everything
4. Preview and iterate
5. Publish

**Step 3: Commit**

---

### Task 14: Getting started guide

**Step 1: Write install + first-use guide**

1. Clone repo / download release
2. `npm run setup && npm run dev`
3. Add your first workspace (pick a folder)
4. Browse files, open them with built-in peeps
5. Try the Board view for project management
6. Browse PeepHub and install a community peep
7. Build your own peep with Claude Code

**Step 2: Commit**

---

## Phase 5: Repo Cleanup & Polish

### Task 15: OpenPeep README

**Files:**
- Create: `/Users/hanleyleung/Git/taiso/openpeep/README.md`

Write a proper README with: overview, screenshot, quick start, architecture, peep development guide, contributing.

---

### Task 16: PeepHub README

**Files:**
- Create: `/Users/hanleyleung/Git/taiso/peephub/README.md`

Write README with: overview, setup (PostgreSQL, env vars, Prisma migrate), development, API docs, deployment.

---

### Task 17: .env.example files

**Files:**
- Create/update: `/Users/hanleyleung/Git/taiso/peephub/.env.example`
- Create: `/Users/hanleyleung/Git/taiso/openpeep/.env.example`

Document all required and optional env vars.

---

### Task 18: Clean stray files from repos

**Step 1: Add to .gitignore and remove screenshots/logs**

```bash
# OpenPeep
echo "*.png" >> .gitignore  # stray screenshots
echo ".playwright-mcp/" >> .gitignore
git rm --cached *.png .playwright-mcp/ 2>/dev/null
```

---

### Task 19: First-run wizard

**Files:**
- Modify: `/Users/hanleyleung/Git/taiso/openpeep/frontend/src/app/page.tsx`

When no spaces are configured, show a welcome screen:
1. "Welcome to OpenPeep"
2. Pick a folder to start with
3. Choose theme (dark/light/auto)
4. Done — opens board view

---

### Task 20: PeepHub homepage thumbnails

**Files:**
- Modify: `/Users/hanleyleung/Git/taiso/peephub/src/app/page.tsx`

The homepage Popular/Recent sections use the same `PeepCard` component but don't pass `thumbnailUrl`. Fix the data query to include it.

---

### Task 21: Download counter

**Files:**
- Modify: `/Users/hanleyleung/Git/taiso/peephub/src/app/api/peeps/[slug]/download/route.ts`

Increment `totalDownloads` on the Peep record when a download/install occurs.

---

## Phase 6: Showcase Peeps

> These should be built USING the Claude Code plugin (Task 4-5) to dogfood the workflow.

### Task 22-31: File Viewer/Editor Peeps

Build each peep using Claude Code, test in OpenPeep, publish to PeepHub:

22. **CSV Viewer** — table with sort/filter, charts (D3 or Chart.js from CDN)
23. **TODO List** — todo.json, checkboxes, priorities, due dates
24. **Recipe Viewer** — .recipe files, ingredients, steps, cook timer
25. **Changelog Viewer** — CHANGELOG.md, version timeline UI
26. **Env File Editor** — .env, masked values, add/remove/edit
27. **Color Palette** — palette.json, swatches, copy hex codes
28. **API Response Viewer** — response.json, headers/body/status
29. **Bookmark Manager** — bookmarks.json, folders, tags, favicons
30. **Invoice Viewer** — invoice.json, line items, totals, print layout
31. **Flashcard Viewer** — flashcards.json, flip cards, quiz mode

### Task 32-36: Bundle Peeps (folder-level apps)

32. **Project Manager** — project.json folder, kanban, timeline
33. **Blog Engine** — posts/ folder, drafts/published, preview
34. **Client Portal** — client folder, invoices, contracts, timeline
35. **Course Builder** — course/ folder, modules, lessons, progress
36. **Design System** — design/ folder, components, tokens, preview

---

## Phase 7: Tutorials & Content

### Task 37: Getting Started guide (for www)
### Task 38: "Organize with Board view" walkthrough
### Task 39: "Preview and edit files" walkthrough
### Task 40: "Build a custom viewer with Claude" walkthrough
### Task 41: "Make Your First Peep" step-by-step tutorial
### Task 42: "Build a Peep in 5 Minutes with Claude Code" tutorial

---

## Execution Order

```
Phase 1 (Install)     ████░░░░░░  Tasks 1-3    — unblocks core loop
Phase 2 (Plugin)      ████░░░░░░  Tasks 4-5    — unblocks peep building
Phase 3 (Auth)        ██████░░░░  Tasks 6-9    — parallel with Phase 2
Phase 4 (www)         ████████░░  Tasks 10-14  — parallel with Phase 3
Phase 5 (Cleanup)     ██░░░░░░░░  Tasks 15-21  — sprinkle throughout
Phase 6 (Peeps)       ██████████  Tasks 22-36  — use plugin to build
Phase 7 (Tutorials)   ████░░░░░░  Tasks 37-42  — after peeps exist
```

**Estimated total: 42 tasks across 7 phases.**

Start with Phase 1 (install flow) and Phase 2 (Claude Code plugin) in parallel — these have zero dependencies and unblock everything else.
