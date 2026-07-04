# SwiftsAI Editor — Konva.js Canvas Design Editor

## Overview

A standalone Canva-like design editor built with **React 19 + Konva.js + Vite**.  
Located at: `apps/editor/`  
Live at: `https://ai.appswifts.com/editor/`  
Served via nginx as static files (reverse-proxied from the main monorepo container).

## Tech Stack

- **React 19** — UI framework
- **Konva.js 9.x + react-konva 19.x** — HTML5 Canvas rendering engine
- **Vite 6** — Build tool
- **Tailwind CSS (CDN)** — Utility CSS (loaded via CDN script in index.html)
- **Google Fonts** — Inter (body), Plus Jakarta Sans (headings), Material Symbols (icons)
- **TypeScript** — Strict mode disabled (`strict: false` in tsconfig)

## Architecture

```
Stage (1080×1080)
 ├── Layer
 │    ├── Rect (white background, configurable color)
 │    ├── Line[] (grid lines, optional)
 │    ├── Rect | Circle | Text | KonvaImage (user objects)
 │    ├── Line[] (smart guide lines)
 │    ├── Rect (marquee selection box)
 │    └── Transformer (selection handles)
```

All state lives in a single `useEditor()` hook (`src/useEditor.ts`).  
The UI is rendered in `src/App.tsx` (~600 lines).

## Project Structure

```
apps/editor/
├── index.html             # Entry point (Tailwind CDN + Google Fonts)
├── vite.config.ts         # Vite config (base: '/editor/')
├── tsconfig.json
├── package.json
├── Dockerfile             # Production container (Express + static)
├── docker-compose.yml     # Standalone deployment
├── server/
│   ├── package.json
│   └── index.js           # Express API (Unsplash, Fonts, AI, Templates)
├── src/
│   ├── main.tsx           # React mount
│   ├── vite-env.d.ts
│   ├── App.tsx            # Main UI (~600 lines, all components inline)
│   └── useEditor.ts       # All state management hook
```

## Key Files

### `src/useEditor.ts` — State Management Hook

Exports: `useEditor(artboardW, artboardH)`

Returns:
- `objects: EditorObject[]` — all objects on canvas
- `selectedIds: string[]` — multi-select support
- `selectedObjs: EditorObject[]` — filtered selected objects
- `zoom, setZoom` — zoom control (10%–300%)
- `showGrid, setShowGrid` — grid toggle
- `showGuides, setShowGuides` — smart guides toggle
- `canvasBg, setCanvasBg` — artboard background color
- `contextMenu, setContextMenu` — right-click menu state
- `guideLines, setGuideLines` — active alignment guide lines
- `groupIds: string[]` — unique group IDs
- `isPlaying, setIsPlaying` — animation playback state

**Object operations:**
- `addObject(obj)` — add + auto-history
- `updateObject(id, patch)` — direct update (no history)
- `updateSelected(patch)` — update all selected
- `deleteSelected()` — delete selected + history
- `duplicateSelected()` — duplicate with offset + history
- `selectOne(id)`, `toggleSelect(id)`, `selectAll()`
- `copySelected()`, `pasteClipboard()` — clipboard (stores in ref)
- `groupSelected()`, `ungroupSelected()` — group by `groupId`
- `moveUp`, `moveDown`, `moveToTop`, `moveToBottom` — layer order
- `nudge(dx, dy)` — arrow key movement
- `alignSelected(align)` — align left/center/right/top/middle/bottom

**History:**
- `undo()`, `redo()` — ref-based history stack
- `commitObjects()` — push current state to history (called after drag/transform end)
- `loadObjects(objs)` — load + reset history
- `pushHistory(objs)` — internal (autosaves to localStorage 3s debounced)

**Utilities:**
- `snapToGrid(x, y)` — grid snapping
- `computeGuides(movingId, nx, ny)` — smart guide computation with 5px tolerance
- `addText(text, size, font, style)` — presets
- `addRect()`, `addCircle()` — shape presets
- `addAnimationToSelected(anim)`, `removeAnimation(objId, idx)` — animation controls

### `EditorObject` Interface

```typescript
interface EditorObject {
  id: string;
  type: 'text' | 'rect' | 'circle' | 'image';
  x: number; y: number;
  width: number; height: number;
  rotation: number;
  // Visual
  fill?: string;
  fillLinearGradientStartPoint?: { x: number; y: number };
  fillLinearGradientEndPoint?: { x: number; y: number };
  fillLinearGradientColorStops?: (number | string)[];
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;         // 0–1
  visible?: boolean;
  locked?: boolean;
  groupId?: string;
  // Shadow
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  // Image filters
  blurRadius?: number;
  brightness?: number;      // -100 to 100
  contrast?: number;        // -100 to 100
  // Text
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: string;       // 'normal' | 'bold' | '600'
  letterSpacing?: number;
  lineHeight?: number;
  // Shape
  cornerRadius?: number;
  // Image
  image?: HTMLImageElement; // native Image object (NOT serializable)
  src?: string;
  // Animation
  animations?: EditorAnimation[];
}
```

### `EditorAnimation` Interface

```typescript
interface EditorAnimation {
  type: 'fadeIn' | 'fadeOut' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'bounce' | 'pulse' | 'rotate';
  duration: number;  // seconds
  delay: number;
  repeat: number;
}
```

## UI Layout

```
┌────────────────────────────────────────────────────────────┬──────────────────┐
│          Top Bar (56px, #00c4cc teal bg)                   │  Export | JSON   │
│  Logo | Undo/Redo | Align L/C/R | Group/Ungroup            │  Import | SVG    │
├────┬──────────────┬────────────────────────────────────────┴──────┬──────────┤
│    │              │                                                │          │
│ 72 │   300px      │            Canvas Area                         │          │
│ px │   Panel      │     (scrollable, centered artboard)            │          │
│    │              │                                                │          │
│ Bg │              │   ┌──────────────────────────────────┐          │          │
│ lk │  Text/       │   │  1080×1080 artboard             │          │          │
│    │  Elements/   │   │  (Konva Stage with zoom)        │          │          │
│ Dr │  Design/     │   │                                  │          │          │
│ k  │  Uploads/    │   │                                  │          │          │
│    │  Tools/      │   └──────────────────────────────────┘          │          │
│    │  Brand/      │                                                │          │
│    │  Projects    │          Floating bar: [Text] [Shape] [Circle]  │          │
│    │              │                                                │          │
│    └──────────────┴────────────────────────────────────────────────┘          │
├────┴──────────────────────────────────────────────────────────────────────────┤
│ Footer (40px): [-] Zoom Slider [+] | 100% | Fit | Grid | Guides | 🎨 bg      │
│              objects | selected | groups | Duplicate | Delete                 │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Features Implemented

### Canvas
- ✓ White artboard with configurable background color
- ✓ Zoom 10%–300% (slider, +/- buttons, 100% reset, Fit to screen)
- ✓ Grid overlay (toggle in footer)
- ✓ Smart guides (alignment lines during drag, 5px tolerance, toggle in footer)
- ✓ Marquee selection (drag on empty canvas)
- ✓ Multi-select (Shift+click)
- ✓ Drag, resize, rotate (8 anchor points on Transformer)
- ✓ Keyboard shortcuts (arrows 1px/10px, Delete, Ctrl+Z/D/C/V/X/A/G, Ctrl+[/])

### Objects
- ✓ **Text** — 4 presets (Heading 48px, Subtitle 32px, Body 20px, Caption 14px)
- ✓ **Text editing** — font family (Inter, PJS, Arial, Georgia, Courier New + Google Fonts from API), size, bold, color, letter spacing, line height, content (textarea)
- ✓ **Shapes** — Rectangle, Circle (fill, stroke, strokeWidth, cornerRadius)
- ✓ **Images** — Upload (click + drag-drop), SVG import (as rendered image)
- ✓ **Gradient fill** — Linear gradient (start/end colors, toggle between solid/gradient)
- ✓ **Shadow** — Drop shadow (color, blur, offset)
- ✓ **Image filters** — Blur, brightness, contrast sliders
- ✓ **Lock/Unlock** — per object (prevents dragging)
- ✓ **Visibility** — eye icon toggle

### Layer Management
- ✓ Bring to Front, Send to Back, Move Up, Move Down
- ✓ Groups — Group/Ungroup selected objects (Ctrl+G / Ctrl+Shift+G)

### Alignment
- ✓ Align Left, Center, Right, Top, Middle, Bottom (2+ objects selected)

### History
- ✓ Undo/Redo with ref-based stack (not serialized to state for performance)
- ✓ Autosave to localStorage (3s debounce, restores on reload)

### Export/Import
- ✓ Export PNG (2x resolution)
- ✓ Export JSON (stripped of non-serializable image objects)
- ✓ Import JSON (loads design from file)

### Clipboard
- ✓ Copy (Ctrl+C), Paste (Ctrl+V), Cut (Ctrl+X), Duplicate (Ctrl+D, right-click)

### Context Menu
- ✓ Right-click: Copy, Paste, Duplicate, Group, Ungroup, Layer order, Delete

### Animations
- ✓ Fade In, Fade Out, Slide Up/Down, Bounce, Pulse, Rotate
- ✓ Play/Stop via Konva.Tween (duration 1s, applied to selected object)

### Integrations
- ✓ **Unsplash** — Photo search (Design tab, search bar + results grid, fallback to picsum.photos)
- ✓ **Google Fonts** — Fetches from API on load, shows in Text tab as clickable list
- ✓ **AI Design Assistant** — Describe a design, Groq API generates description (Tools tab)
- ✓ **Templates** — Save current design + Load from template list (Design tab)

### Backend API (Express server for standalone deployment)
- `GET /api/health` — health check
- `GET /api/unsplash/search?query=X` — Unsplash photo search
- `GET /api/fonts` — Google Fonts list (sorted by popularity)
- `POST /api/ai/generate` — AI design prompt
- `GET /api/templates` — List saved templates
- `POST /api/templates` — Save template
- `DELETE /api/templates/:id` — Delete template

## Not Yet Implemented

- Proper Tailwind build pipeline (currently uses CDN)
- Editable SVG paths (SVGs render as rasterized images)
- Smart guides only during drag (not during transform)
- Arrow key nudging doesn't update history after each step
- No infinite canvas (fixed 1080×1080 artboard)
- No rulers, no crop tool
- No blend modes
- No mobile touch support (pinch zoom, two-finger pan)
- Konva.Tween animation needs to be wired via useEffect (currently Play button exists but Tween creation needs to be added)
- No real-time collaboration

## Build & Deploy

```bash
cd apps/editor
pnpm install
pnpm build            # Outputs to dist/
```

### Production (via nginx on main server)
- Static files are copied to `/var/www/editor/` on the server
- nginx serves at `https://ai.appswifts.com/editor/`
- Backend API endpoints (`/api/unsplash/*`, `/api/fonts`, `/api/ai/*`, `/api/templates/*`) are proxied to the Express server on port 4201
- Configure env vars: `UNSPLASH_ACCESS_KEY`, `GOOGLE_FONTS_API_KEY`, `GROQ_API_KEY`

### Standalone Docker (for selling separately)
```bash
docker compose up -d
```
Port: 4201  
Requires: `UNSPLASH_ACCESS_KEY`, `GOOGLE_FONTS_API_KEY`, `GROQ_API_KEY` env vars

## Code Style

- Single-file components in App.tsx (no separate component files)
- All state in useEditor.ts hook
- Props interfaces are inline
- No CSS modules — uses Tailwind CDN with arbitrary values (`bg-[#00c4cc]`)
- Material Symbols for icons (`material-symbols-outlined` class)
- `genId()` function for unique IDs
- JSON.parse(JSON.stringify()) for deep cloning history
