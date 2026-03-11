---
name: create-content
description: Create files for OpenPeep viewing. Use this whenever asked to create meeting notes, diagrams, documents, or any file that OpenPeep can render. Handles project folder setup, file format, and preview URL.
---

# Create Content for OpenPeep

You are creating a file that will be viewed in OpenPeep, a local file viewer with specialized renderers called "peeps."

## Step 1: Get the file template

Call the `get_file_template` MCP tool with the peep ID to get the exact format.

Common peep IDs:
- `meeting-notes` — structured meeting minutes (.meeting.json)
- `mermaid-viewer` — diagrams (.mmd)
- `markdown-editor` — documents (.md)
- `json-editor` — data files (.json)
- `html-preview` — web pages (.html)
- `svg-viewer` — vector graphics (.svg)

If unsure which peep to use, call `list_peeps` first.

## Step 2: Create a dated project folder

**ALWAYS** create a project folder using this naming convention:

```
YYYY-MM-DD_descriptive-name/
```

Examples:
- `2026-03-11_team-standup/`
- `2026-03-11_system-architecture/`
- `2026-03-11_quarterly-review/`

**NEVER** create files at the root of the working directory or inside existing OpenPeep Spaces.

## Step 3: Add project.json

Every project folder gets a `project.json`:

```json
{
  "name": "Human-readable project name",
  "description": "Brief description of what this contains",
  "type": "meeting-notes",
  "status": "active"
}
```

Supported types: `meeting-notes`, `diagram`, `document`, `data`, `presentation`, `mixed`
Supported statuses: `active`, `draft`, `archived`

## Step 4: Create the file

Use the template from Step 1 as the base. Adapt it to the user's request.

Place the file inside the project folder:
```
2026-03-11_team-standup/
  project.json
  standup.meeting.json
```

## Step 5: Preview URL

Call the `preview_url` MCP tool with the **absolute path** to the created file.

Tell the user:
1. The preview URL they can open
2. They can add the parent directory as a Space in OpenPeep (Settings > Spaces) to see all their projects in the sidebar

## Example

User: "Create meeting notes for today's standup"

1. `get_file_template("meeting-notes")` → get JSON schema
2. Create `./2026-03-11_team-standup/`
3. Write `project.json` with name/description/type
4. Write `standup.meeting.json` adapted from template with today's date and context
5. `preview_url("/abs/path/2026-03-11_team-standup/standup.meeting.json")`
6. Share the URL and mention adding the folder as a Space
