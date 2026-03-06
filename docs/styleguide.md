# OpenPeep UI Style Guide — macOS 26 Tahoe Theme

This document defines the UI patterns, tokens, and conventions used across OpenPeep when the macOS theme is active. All new components MUST follow these patterns for visual consistency.

## Design Philosophy

OpenPeep's macOS theme follows Apple's Human Interface Guidelines (HIG) for macOS 26 Tahoe:
- **Liquid Glass** — translucent panels with blur, not opaque containers
- **Generous rounding** — 18px radius on modals, 12px on cards, 8px on controls
- **Layered elevation** — clear visual hierarchy from app → surface → elevated → modal
- **Restrained color** — accent color used sparingly for active states and CTAs, not decoration
- **Spatial clarity** — generous padding (p-4 minimum for content areas), clear section separation

## CSS Custom Properties (Theme Tokens)

Never hardcode colors. Always use theme tokens via CSS variables or Tailwind aliases.

### Backgrounds (elevation ramp, lowest to highest)
| Token | Tailwind | Usage |
|-------|----------|-------|
| `--bg-app` | `bg-app` | Page/window background |
| `--bg-sidebar` | `bg-sidebar` | Sidebar panels |
| `--bg-surface` | `bg-surface` | Cards, grouped content |
| `--bg-toolbar` | `bg-toolbar` | Top toolbar |
| `--bg-elevated` | `bg-elevated` | Raised elements within surfaces |
| `--bg-hover` | `bg-hover` | Hover state for interactive elements |
| `--bg-card` | `bg-card` | Card backgrounds (via `card-glass`) |
| `--bg-modal` | `bg-modal` | Modal backgrounds (via `modal-glass`) |
| `--bg-input` | `bg-input` | Text inputs, selects, textareas |

### Text
| Token | Tailwind | Usage |
|-------|----------|-------|
| `--text-primary` | `text-primary` | Headings, important labels |
| `--text-secondary` | `text-secondary` | Body text, descriptions |
| `--text-tertiary` | `text-tertiary` | Captions, metadata, placeholders |

### Borders
| Token | Tailwind | Usage |
|-------|----------|-------|
| `--border` | `border-border` | Strong dividers (header/footer borders) |
| `--border-subtle` | `border-border-subtle` | Subtle dividers (card borders, input borders) |

### Accent
| Token | Tailwind | Usage |
|-------|----------|-------|
| `--accent` | `text-accent`, `bg-accent` | Active tab, primary CTA, selected items |
| `--accent-hover` | `text-accent-hover`, `bg-accent-hover` | Hover state for accent elements |
| `--accent-soft` | `bg-accent-soft` | Very subtle accent tint backgrounds |

## Glass Classes

These are theme-aware — they render differently per OS theme (macOS gets blur + translucency, Windows gets Mica, Linux gets flat).

| Class | Usage |
|-------|-------|
| `modal-glass` | Modal/dialog containers |
| `sidebar-glass` | Sidebar panels |
| `card-glass` | Content cards (auto hover styles) |
| `toolbar-glass` | Top toolbar bar |
| `pill-glass` | Pill-shaped controls |
| `column-glass` | Column panels |

**Always use these classes** instead of manually setting `backdrop-filter` or opacity backgrounds.

## Theme-Aware Radius Classes

**Never use Tailwind's `rounded-*`** for structural elements. Use theme-aware radius utilities:

| Class | macOS | Windows | Linux |
|-------|-------|---------|-------|
| `radius` | 18px | 6px | 8px |
| `radius-sm` | 12px | 4px | 6px |
| `radius-xs` | 8px | 3px | 4px |
| `radius-pill` | 9999px | 9999px | 9999px |

Exception: `rounded-full` is fine for circles (avatars, status dots).

## Typography Scale

Font: DM Sans (body), JetBrains Mono (code).

| Size | Usage |
|------|-------|
| `text-sm` (14px) | Modal titles, primary headings |
| `text-[13px]` | Card names, input values, body text |
| `text-[12px]` | Button labels, secondary info |
| `text-[11px]` | Section headers, metadata, badges, sidebar items, tag labels |

### Section Headers
```tsx
<h3 className="text-[11px] font-semibold text-tertiary uppercase tracking-wider mb-2">
  Section Name
</h3>
```
This pattern is used in Settings, PeepHub sidebar, and all grouped UI sections.

## Component Patterns

### Modal
```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
     onClick={(e) => e.target === e.currentTarget && onClose()}>
  <div className="modal-glass border border-border radius w-[620px] h-[85vh] flex flex-col shadow-2xl shadow-black/50 animate-scale-in">
    {/* Header */}
    <div className="flex items-center px-5 py-3.5 border-b border-border">
      <span className="text-sm font-semibold">Title</span>
      <span className="flex-1" />
      <button className="w-6 h-6 flex items-center justify-center text-tertiary hover:text-primary rounded-md hover:bg-hover transition-all">
        <X size={12} />
      </button>
    </div>
    {/* Content */}
    <div className="flex-1 overflow-y-auto p-4">
      ...
    </div>
  </div>
</div>
```

Key rules:
- Use `modal-glass` + `radius` (not hardcoded border-radius)
- Fixed height (`h-[85vh]`) for large modals, `max-h-[80vh]` for small ones
- Header: `px-5 py-3.5 border-b border-border`
- Content: `p-4` minimum padding
- Close button: `w-6 h-6`, icon `size={12}`

### Tab Switcher
```tsx
<div className="flex h-7 bg-surface rounded-lg overflow-hidden border border-border-subtle">
  <button className={`px-3 text-[11px] font-medium transition-all ${
    active ? "bg-accent/15 text-accent" : "text-secondary hover:text-primary"
  }`}>
    Tab Name
  </button>
</div>
```

### Settings Row (label + control)
```tsx
<div className="flex items-center gap-3 bg-surface border border-border-subtle rounded-xl p-3">
  <span className="text-[13px] text-primary flex-1 font-medium">Label</span>
  <button className="h-7 px-3 bg-elevated hover:bg-hover border border-border-subtle radius-sm text-[11px] font-medium text-secondary hover:text-primary transition-all">
    Control
  </button>
</div>
```

### Card (grid item)
```tsx
<div className="card-glass flex flex-col p-3.5 transition-all">
  <div className="flex items-start gap-3">
    <div className="w-9 h-9 bg-surface radius-xs flex items-center justify-center border border-border-subtle text-secondary shrink-0">
      <Icon size={18} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-[13px] font-semibold text-primary truncate">Name</div>
      <div className="text-[11px] text-secondary mt-0.5 truncate">Description</div>
    </div>
  </div>
</div>
```

Key rules:
- Use `card-glass` (gets auto hover styles per theme)
- Icon container: `w-9 h-9 bg-surface radius-xs border border-border-subtle`
- Title: `text-[13px] font-semibold text-primary`
- Description: `text-[11px] text-secondary`

### Badge / Tag
```tsx
<span className="text-[11px] px-2 py-0.5 radius-xs font-medium text-tertiary bg-surface border border-border-subtle">
  v1.0.0
</span>
```

For colored badges (accent, warning, danger):
```tsx
{/* Accent */}
<span className="text-[11px] px-2 py-0.5 radius-xs font-medium text-accent bg-accent/10 border border-accent/20">
  Installed
</span>

{/* Warning */}
<span className="text-[11px] px-2 py-0.5 radius-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20">
  Project
</span>
```

### Buttons

**Primary CTA:**
```tsx
<button className="h-8 px-4 text-[12px] font-semibold bg-accent hover:bg-accent-hover text-black radius-sm transition-all">
  Action
</button>
```

**Secondary / Ghost:**
```tsx
<button className="h-7 px-3 text-[11px] font-semibold radius-xs text-accent hover:text-accent-hover bg-accent/10 hover:bg-accent/15 transition-all flex items-center gap-1.5">
  <Icon size={12} />
  Label
</button>
```

**Danger:**
```tsx
<button className="h-7 px-3 text-[11px] text-red-400 hover:text-red-300 font-medium radius-xs bg-red-500/10 hover:bg-red-500/15 transition-all">
  Remove
</button>
```

### Text Input
```tsx
<input className="w-full bg-input border border-border-subtle radius-sm px-3 py-2 text-[13px] text-primary outline-none focus:border-accent/50 transition-colors placeholder:text-tertiary" />
```

### Search Input
```tsx
<div className="relative">
  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
  <input className="w-full bg-input border border-border-subtle radius-sm pl-9 pr-3 py-2 text-[13px] text-primary outline-none focus:border-accent/50 transition-colors placeholder:text-tertiary" />
</div>
```

### Sidebar (within modal)
```tsx
<div className="w-[180px] shrink-0 sidebar-glass border-r border-border-subtle p-4 overflow-y-auto">
  <h3 className="text-[11px] font-semibold text-tertiary uppercase tracking-wider mb-2">
    Section
  </h3>
  {/* Selection list items */}
  <button className={`text-left text-[12px] px-2.5 py-1.5 radius-xs transition-all w-full ${
    selected ? "text-accent bg-accent/10 font-medium" : "text-secondary hover:text-primary hover:bg-hover"
  }`}>
    Item Label
  </button>
</div>
```

### Error States
```tsx
<div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 radius-sm p-3">
  <AlertCircle size={14} className="text-red-400 shrink-0" />
  <span className="text-[12px] text-red-400">{error}</span>
</div>
```

### Empty State
```tsx
<div className="flex items-center justify-center py-16">
  <div className="text-center">
    <img src="/peep-icon.png" alt="" className="w-10 h-10 mx-auto mb-3 opacity-20" />
    <p className="text-[13px] text-secondary font-medium">No items found</p>
    <p className="text-[11px] text-tertiary mt-1">Try a different search</p>
  </div>
</div>
```

## Spacing Guidelines

| Context | Padding |
|---------|---------|
| Modal header | `px-5 py-3.5` |
| Modal content | `p-4` or `p-5` |
| Card interior | `p-3.5` |
| Sidebar | `p-4` |
| Between sections | `mb-5` (sidebar), `space-y-4` (form) |
| Grid gap | `gap-3` |
| Icon-to-text gap | `gap-3` |

## Animations

| Class | Usage |
|-------|-------|
| `animate-scale-in` | Modal entrance (0.2s ease-out, scale 0.96→1) |
| `animate-fade-in` | Content tab switches (0.2s ease-out, translateY 4→0) |
| `transition-all` | Interactive element state changes |
| `transition-colors` | Color-only state changes |

## Do NOT

- **Hardcode colors** — use theme tokens always
- **Use `rounded-lg`/`rounded-xl`** for structural elements — use `radius`/`radius-sm`/`radius-xs`
- **Use `bg-elevated` for inputs** — use `bg-input`
- **Use raw `border-r`/`border-b` for panels** — use glass classes + `border-border-subtle`
- **Use `text-[9px]` or `text-[10px]`** — minimum readable size is `text-[11px]`
- **Use `backdrop-filter` directly** — use glass classes which handle all themes + browser fallbacks
- **Skip the `transition-all`** on interactive elements — everything should have smooth state transitions
