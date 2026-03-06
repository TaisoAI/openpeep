# Showstopper Peep Ideas

*Complex, multimedia-heavy peeps that demonstrate what's possible in an iframe sandbox. All doable with existing web libraries.*

---

## 3D & Spatial

| Name | Matches | Description |
|------|---------|-------------|
| **3D Model Viewer** | `.glb`, `.gltf`, `.obj` | Three.js powered with orbit controls, material inspector, wireframe toggle, animation playback. Drag to rotate product mockups. |
| **Floor Plan Editor** | `*.floorplan.json` | Interactive office layout with drag-to-place desks, rooms, meeting spaces. SVG-based, exports to image. |
| **3D Data Viz** | `metrics-*.csv` with 3D flag | Three.js scatter plots, bar charts, globe visualizations of geographic data. Rotate, zoom, fly through your data. |

## Audio & Video

| Name | Matches | Description |
|------|---------|-------------|
| **Podcast Editor** | `*.podcast.json` | Waveform viewer with chapter markers, show notes sync, transcript overlay. Cut/trim via PeepSDK.save(). |
| **Video Storyboard** | `storyboard-*.json` | Frame-by-frame storyboard with thumbnail grid, shot type labels, dialogue, timing. Drag to reorder scenes. |
| **Audio Transcription** | `*.transcript.json` + audio ref | Synced transcript viewer where clicking a word seeks to that timestamp. Speaker diarization color-coding. |
| **Sound Design Board** | `soundboard-*.json` | Grid of audio clips with waveform previews, one-click play, drag-to-sequence into a timeline. |
| **Music Sheet** | `*.musicxml`, `*.abc` | Sheet music renderer using VexFlow/ABC.js. Play back with Web Audio API, highlight notes as they play. |

## Visual & Creative

| Name | Matches | Description |
|------|---------|-------------|
| **Lottie Animator** | `*.lottie`, `*.json` (lottie markers) | Lottie animation player with speed control, frame scrubbing, layer inspector, and color theme override. |
| **SVG Editor** | `*.svg` | Full vector editor with node manipulation, path tools, layers panel. Mini-Figma in an iframe. |
| **Color System** | `colors.yaml`, `design-tokens.json` | Interactive color palette with contrast checker (WCAG), harmonics generator, dark/light mode preview side-by-side. |
| **Font Previewer** | `*.ttf`, `*.otf`, `*.woff2` | Font specimen sheet with character map, OpenType feature toggles, waterfall sizing, paragraph preview. |
| **Mood Board** | `moodboard-*.json` | Pinterest-style drag-and-drop board with image clustering, color extraction, and annotation pins. |
| **Pixel Art Editor** | `*.sprite.png`, `*.pixel.json` | Grid-based pixel editor with palette, layers, onion skinning, and sprite sheet export. |
| **Photo Collage** | `collage-*.json` | Drag-to-arrange photo layouts with grid/freeform modes, Ken Burns preview, and export. |

## Data & Interactive

| Name | Matches | Description |
|------|---------|-------------|
| **Interactive Map** | `locations.geojson`, `*.geo.json` | Leaflet/MapLibre map with markers, heatmaps, routes. Click a location to see associated data. |
| **Network Graph** | `*.graph.json`, `network-*.json` | Force-directed graph visualization (D3) for org structures, system architectures, knowledge graphs. Zoom, drag, filter by node type. |
| **Timeline** | `timeline-*.json`, `history.yaml` | Horizontal scrolling timeline with media embeds, zoom levels (day/month/year), era grouping. Museum exhibit quality. |
| **Sankey Diagram** | `flow-*.csv`, `funnel-*.json` | Interactive Sankey/funnel diagrams for conversion funnels, money flows, user journeys. Hover for details. |
| **Gantt Chart** | `project-*.gantt.json` | Full Gantt chart with dependencies, critical path highlighting, drag to reschedule, resource allocation view. |
| **Whiteboard** | `*.whiteboard.json` | Infinite canvas with shapes, sticky notes, arrows, freehand draw. Real collaborative thinking space. |

## AI-Wow Factor

| Name | Matches | Description |
|------|---------|-------------|
| **Prompt Playground** | `*.prompt.md` | Side-by-side prompt editor with live API call to test against multiple models, diff outputs, token/cost calculator. The killer AI peep. |
| **Agent Flow Builder** | `*.agent.yaml` | Visual node graph editor for agent workflows. Drag tools, connect decision nodes, preview execution paths. Like n8n but for AI agents. |
| **Embedding Explorer** | `embeddings-*.json` | 2D/3D t-SNE/UMAP projection of vectors with clustering, search, nearest-neighbor visualization. WebGL for 100K+ points. |
| **Diff Viewer** | `*.diff`, `*.patch` | GitHub-quality side-by-side diff with syntax highlighting, inline comments, and approval buttons. |
| **A/B Test Dashboard** | `experiment-*.json` | Statistical significance calculator with conversion charts, confidence intervals, and "call it" recommendation. |

## Document & Publishing

| Name | Matches | Description |
|------|---------|-------------|
| **Slide Deck** | `*.slides.md`, `slides-*.json` | Reveal.js-powered presentation builder from markdown. Speaker notes, transitions, presenter mode, PDF export. |
| **Resume Builder** | `resume.yaml`, `cv.json` | Beautiful resume renderer with multiple template themes, PDF export, and ATS-friendly plain text view. |
| **Invoice Designer** | `invoice-*.json` | Professional invoice with logo, itemized table, tax calculation, QR code for payment, PDF export. |
| **eBook Viewer** | `*.epub` | Full ePub reader with table of contents, bookmarks, font sizing, night mode, reading progress. |
| **Diagram Editor** | `*.diagram.json` | Mermaid + custom shapes. Flowcharts, sequence diagrams, ER diagrams — all editable, all beautiful. |

## The "Holy Shit" Demos

| Name | Matches | Description |
|------|---------|-------------|
| **Video Annotator** | `*.annotation.json` + video ref | Draw bounding boxes on video frames, add timestamped comments, export annotation data. Training data creation for vision models right in OpenPeep. |
| **Live Dashboard** | `dashboard-*.json` | Real-time metrics dashboard that polls your APIs, with charts, gauges, status lights, alert thresholds. Your startup's mission control. |
| **Code Playground** | `*.playground.json` | In-browser code editor (Monaco) with live preview pane. HTML/CSS/JS sandbox. Prototype peeps inside a peep. |
| **AR Preview** | `*.usdz`, `*.glb` | 3D model viewer with "View in AR" button that opens on phone via WebXR. Show clients their product in their space. |

---

## Top 5 for Demo Impact

1. **Agent Flow Builder** — Visual AI agent design, the category-defining peep
2. **Prompt Playground** — Every AI team wants this, and nobody has it file-based
3. **3D Model Viewer** — Instant "this isn't just a file browser" moment
4. **Video Annotator** — Training data creation inside your project manager
5. **Slide Deck** — Everyone presents, and markdown-to-slides is magic
