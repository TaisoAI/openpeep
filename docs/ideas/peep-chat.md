# PeepChat — A Messaging Platform Built on Rich Mini-Apps

**Date:** 2026-03-11
**Status:** Idea / Exploration

## The Insight

Slack's fundamental unit is a text message. Everything else — file previews, polls, forms, dashboards — is bolted on via Block Kit, unfurls, and third-party integrations. They're second-class citizens: limited, clunky, and sandboxed into rigid templates.

What if the fundamental unit of communication was a **rich interactive mini-app**?

## The Concept

PeepChat is a messaging platform where every message can be a **peep** — a self-contained HTML mini-app that runs inline in the conversation. Text messages are just the simplest peep.

### What a conversation looks like

```
Alice: here's the Q1 dashboard
       ┌──────────────────────────────┐
       │  [Live interactive dashboard │
       │   with charts, filters,      │
       │   drill-down — not a         │
       │   screenshot, the real app]  │
       └──────────────────────────────┘

Bob:   updated the sprint board
       ┌──────────────────────────────┐
       │  [Kanban board — everyone    │
       │   in the channel can drag    │
       │   cards, add tasks, comment] │
       └──────────────────────────────┘

Carol: vote on the offsite date
       ┌──────────────────────────────┐
       │  [Rich poll with calendar    │
       │   picker, availability       │
       │   overlay, live results]     │
       └──────────────────────────────┘

Dave:  meeting notes from standup
       ┌──────────────────────────────┐
       │  [Meeting notes app with     │
       │   attendees, agenda, action  │
       │   items — editable by all]   │
       └──────────────────────────────┘
```

### How it's different from Slack

| Slack | PeepChat |
|-------|----------|
| Text-first, rich content bolted on | Rich content is native, text is the simplest case |
| Block Kit: rigid, template-based | Peeps: full HTML/CSS/JS, anything you can build on the web |
| Integrations require API apps + OAuth | Drop in an HTML file, it just works |
| File previews are read-only thumbnails | Files render as interactive apps |
| Workflows are form-based, limited | Workflows can be any interactive experience |
| Bots post text with buttons | AI agents create and update rich peeps in real-time |

## Key Concepts

### 1. Every message is a peep
A peep is a self-contained HTML mini-app. The peep SDK handles communication between the app and the chat platform (read/write data, notify participants, sync state).

### 2. Collaborative by default
When a peep is posted in a channel, everyone sees the same live state. Alice drags a card on the kanban board → Bob sees it move in real-time. This isn't a screenshot or a link — it's a shared interactive document.

### 3. AI-native
Claude (or any LLM) can create peeps on the fly:
- "make a poll for the team lunch" → interactive poll peep appears
- "summarize this thread as a decision doc" → formatted decision doc peep
- "create a project tracker for the redesign" → kanban/table peep

The AI doesn't just respond with text — it creates purpose-built interactive tools.

### 4. Peep ecosystem
Same PeepHub registry from OpenPeep. Anyone can create and share peep types. A company could build internal peeps for their specific workflows (expense reports, code reviews, incident response).

### 5. Threads become workspaces
A thread isn't just a reply chain — it's a workspace. Pin a spreadsheet peep, a kanban peep, and a notes peep to a thread, and you have a project workspace that lives inside your chat.

## Why This Could Work

### The WeChat playbook
WeChat started as a messaging app, then added Mini Programs — lightweight apps that run inside the chat. They became the dominant way people in China interact with services. PeepChat is this concept applied to work communication, but with truly rich, collaborative HTML apps instead of WeChat's constrained framework.

### Slack's ceiling
Slack has hit a feature ceiling. Their Block Kit is intentionally limited (for security/consistency), which means every rich experience feels like it's fighting the platform. PeepChat would make rich experiences the default, not the exception.

### The OpenPeep bridge
If OpenPeep gains traction as a file viewer, PeepChat becomes "OpenPeep + messaging." The peep format is the same. The SDK is the same. The ecosystem is the same. Users who know how to create peeps for OpenPeep can create peeps for PeepChat.

## Technical Considerations

### Security model
Running arbitrary HTML in a chat app is a security challenge. Peeps would need:
- Sandboxed iframes (same as OpenPeep)
- Permissions system (can this peep access the network? read files? write data?)
- Content Security Policy enforcement
- Peep signing / trusted registry

### Real-time sync
Collaborative peeps need real-time state sync. Options:
- WebSocket/WebRTC for live state
- CRDT-based conflict resolution (like Figma)
- Server-authoritative state with optimistic updates

### Platform
- Desktop app (Electron/Tauri) — primary
- Web app — secondary
- Mobile — hard (mini-apps on mobile is constrained), but WeChat proved it's possible

## Open Questions

- How do you handle peeps that break or crash? (Graceful degradation to a text summary?)
- What's the moderation story? (Peeps could contain anything)
- How does search work across rich peeps? (Need structured metadata/text extraction)
- Is E2E encryption possible with collaborative peeps? (State sync vs. encryption tension)
- Mobile experience — full peeps or simplified views?
- How does this relate to the existing OpenPeep product? Same brand? Sub-brand? Separate?

## Competitive Landscape

- **Slack** — Block Kit is limited by design, won't go full mini-app
- **Teams** — Has adaptive cards, similarly limited
- **Discord** — Activities API is close but gaming-focused
- **WeChat** — Proved the model works, but closed ecosystem and China-only
- **Notion** — Collaborative docs but not messaging-first
- **Linear/Height** — Task-specific, not general communication

## Next Steps (if pursuing)

1. Prototype: Fork OpenPeep, add a simple channel/messaging layer, render peeps inline
2. Test with 2-3 peep types: poll, kanban, meeting notes
3. See if the experience feels magical or forced
4. If magical — explore further. If forced — backlog permanently.
