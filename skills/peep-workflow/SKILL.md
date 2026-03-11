---
name: peep-workflow
description: Overview of OpenPeep capabilities, peep types, and how to work with the OpenPeep ecosystem. Use when the user asks what OpenPeep can do, what file types are supported, or how peeps work.
---

# OpenPeep Workflow Guide

OpenPeep is a local file viewer that runs at http://localhost:3000. It renders files using specialized viewers called "peeps."

## What OpenPeep can render

| Peep | File Types | Format |
|------|-----------|--------|
| Meeting Notes | .meeting.json, .mn | JSON with `"type": "meeting-notes"` |
| Mermaid Viewer | .mmd, .mermaid | Mermaid diagram syntax |
| Markdown Editor | .md, .markdown, .mdx | Markdown |
| JSON Editor | .json, .jsonc, .json5 | JSON |
| HTML Preview | .html, .htm | HTML |
| SVG Viewer | .svg | SVG |
| Image Viewer | .png, .jpg, .gif, .webp, etc. | Binary image |
| Audio Player | .mp3, .wav, .ogg, etc. | Binary audio |
| Video Player | .mp4, .webm, .mov, etc. | Binary video |
| 3D Model Viewer | .glb, .gltf, .usdz, etc. | Binary 3D model |
| Text Editor | .txt, .js, .ts, .py, .css, etc. | Plain text |

Call `list_peeps` for the complete up-to-date list including community peeps from PeepHub.

## Key concepts

- **Peeps** — Specialized viewers/editors for specific file types. Built-in peeps ship with OpenPeep. Community peeps can be installed from PeepHub.
- **Spaces** — Project folders added to OpenPeep's sidebar. Users add directories via Settings > Spaces. Files in Spaces appear in the sidebar organized by subfolders.
- **PeepHub** — Community registry at peephub.taiso.ai where users browse and install additional peeps.
- **Project folders** — Content is organized in dated folders: `YYYY-MM-DD_descriptive-name/` with a `project.json` inside.

## Creating content

Use the `/openpeep:create-content` skill to create files. It handles:
1. Getting the correct file format from the MCP server
2. Creating a dated project folder
3. Writing the file in the correct format
4. Generating a preview URL

## Custom peeps

Users can build their own peeps. Each peep is a web app with:
- `peep.json` — manifest defining file type matches
- `index.html` — the viewer UI, communicates via PeepSDK
- `samples/` — example files

Use the `create_peep` MCP tool to scaffold a new peep. Use `publish_peep` to share on PeepHub.
