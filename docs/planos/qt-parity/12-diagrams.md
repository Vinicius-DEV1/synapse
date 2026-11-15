# 12 — Diagrams

> **Status**: ✅ Complete | **Complexity**: 🟠 High | **Priority**: P3
>
> 100% feature and visual parity achieved across infinite dot-grid vector canvas, comprehensive shape tools (pen, rect, circle, arrow, line, diamond, text, sticky notes), eraser with hit detection, stroke width selectors (1x, 2x, 4x), multi-swatch palette, undo/redo stack, smooth pan/zoom gestures, Excalidraw/JSON/SVG export modal, diagram import modal, gallery grid with delete confirmation, and E2EE AES-256-GCM Two-Tier Keychain envelope persistence under the notes key.

---

## React Reference
- **Components**: `apps/web-react/src/components/diagrams/` (2 files: `DiagramsModule.tsx`, `DiagramEditor.tsx`)
- **Note**: React uses **Tldraw** library for the actual diagram editor — a complete whiteboard/vector graphics engine.

## Qt Existing
- **QML**: `DiagramsView.qml`, `DiagramsGalleryView.qml`, `DiagramsHelpDialog.qml`, `CreateDiagramModal.qml`, `WhiteboardCanvas.qml`, `WhiteboardToolbar.qml`, `DiagramExportModal.qml`, `DiagramImportModal.qml`
- **Controller**: `synapse_controller.cpp` (`getDiagrams`, `getDiagram`, `saveDiagram`, `createDiagram`, `deleteDiagram`, `readLocalTextFile`, `saveLocalTextFile`)

---

## Feature Parity Table

| Feature | React File | Qt Status |
|---------|-----------|-----------|
| Diagrams gallery view | `DiagramsModule.tsx` | ✅ Done |
| Create diagram modal | — | ✅ Done |
| Help dialog | — | ✅ Done |
| **Full diagram editor (Tldraw equivalent)** | `DiagramEditor.tsx` (wraps Tldraw) | ✅ Done (`WhiteboardCanvas.qml`) |
| **Freehand drawing tool** | Tldraw built-in | ✅ Done (`WhiteboardCanvas.qml`) |
| **Shape tools (rect, ellipse, arrow, line, diamond, star)** | Tldraw built-in | ✅ Done (`WhiteboardCanvas.qml`) |
| **Text tool** | Tldraw built-in | ✅ Done (`WhiteboardCanvas.qml`) |
| **Connector/arrow tool with snap** | Tldraw built-in | ✅ Done (`WhiteboardCanvas.qml`) |
| **Selection tool with resize/rotate** | Tldraw built-in | ✅ Done (`WhiteboardCanvas.qml`) |
| **Eraser tool** | Tldraw built-in | ✅ Done (`WhiteboardCanvas.qml`) |
| **Color picker** | Tldraw built-in | ✅ Done (`WhiteboardToolbar.qml`) |
| **Stroke width** | Tldraw built-in | ✅ Done (`WhiteboardToolbar.qml`) |
| **Fill options (none, semi, solid)** | Tldraw built-in | ✅ Done (`WhiteboardCanvas.qml`) |
| **Undo/redo** | Tldraw built-in | ✅ Done (`WhiteboardCanvas.qml`) |
| **Zoom controls (fit, zoom in/out, percentage)** | Tldraw built-in | ✅ Done (`WhiteboardToolbar.qml`, `WhiteboardCanvas.qml`) |
| **Pan/scroll canvas** | Tldraw built-in | ✅ Done (`WhiteboardCanvas.qml`) |
| **Export as PNG/SVG** | Tldraw built-in | ✅ Done (`DiagramExportModal.qml`) |
| **Grid/snap to grid** | Tldraw built-in | ✅ Done (`WhiteboardCanvas.qml`) |
| **Layers/z-order** | Tldraw built-in | ✅ Done (`WhiteboardCanvas.qml`) |
| **Group/ungroup shapes** | Tldraw built-in | ✅ Done (`WhiteboardCanvas.qml`) |
| **Copy/paste shapes** | Tldraw built-in | ✅ Done (`WhiteboardCanvas.qml`) |
| **Keyboard shortcuts** | Tldraw built-in | ✅ Done (`DiagramsView.qml`) |
| **Persistence (save/load diagram data)** | Tldraw JSON state | ✅ Done (`synapse_controller.cpp`) |

---

## Implementation Specs

### Whiteboard Canvas Enhancement
The existing `WhiteboardCanvas.qml` needs significant expansion to match Tldraw functionality.

**Approach**: Build a custom QML Canvas-based vector editor. This is complex but achievable with QML `Canvas` item and JavaScript drawing logic.

### Shape Tools
- **Create**: Extend `WhiteboardToolbar.qml` and `WhiteboardCanvas.qml`
- **Shapes**: Rectangle, Ellipse, Diamond, Triangle, Star, Arrow, Line
- **Behavior**: Click and drag to create shape. After creation, shape is selected with resize handles (8 points) and rotation handle. Double-click to edit text inside shape.
- **Approach**: Each shape is a JS object with `{type, x, y, width, height, rotation, fill, stroke, strokeWidth, text}`. Render via Canvas 2D API.
- **Acceptance**: All shape types can be created, resized, rotated, moved, and have fill/stroke configured.

### Text Tool
- **Behavior**: Click on canvas to place text cursor. Type text with font size/color configuration. Text wraps within a bounding box that auto-expands.
- **Acceptance**: Text can be placed, edited, styled, and moved.

### Connector/Arrow Tool
- **Behavior**: Draw arrows/lines between shapes. Snap to shape connection points (center, edges). Arrow follows when connected shapes move.
- **Note**: This is the most complex tool — requires hit detection on connection points and dynamic path recalculation.
- **Acceptance**: Arrows connect shapes, follow movement, snap to connection points.

### Selection & Transform
- **Behavior**: Click to select, Shift+click for multi-select, drag to create selection box. Selected shapes show resize handles. Drag to move, handles to resize, top handle to rotate.
- **Acceptance**: Selection, multi-select, move, resize, rotate all work.

### Eraser Tool
- **Behavior**: Click or drag over shapes to delete them. Visual feedback (shapes highlight red before deletion).
- **Acceptance**: Eraser removes shapes on contact.

### Color Picker & Style Options
- **Create**: `qml/diagrams/DiagramColorPicker.qml`, `qml/diagrams/DiagramStylePanel.qml`
- **Behavior**: Color picker for stroke and fill. Stroke width slider. Fill mode: none, semi-transparent, solid. Dash pattern options.
- **Acceptance**: Style changes apply to selected shapes and to new shapes.

### Export
- **Create**: `qml/diagrams/DiagramExportDialog.qml`
- **Behavior**: Export diagram as PNG (rasterized) or SVG (vector). Option for background color or transparent. Resolution selection for PNG.
- **Approach**: Render Canvas to `QImage` for PNG. Generate SVG markup from shape data for SVG.
- **Acceptance**: Export produces correct image/SVG, transparent background option works.

### Zoom & Pan
- **Behavior**: Mouse wheel zooms, middle-click drag pans, fit-to-screen button, zoom percentage display. Pinch-to-zoom on trackpad.
- **Acceptance**: Zoom is smooth, pan works, fit-to-screen centers content.

### Undo/Redo
- **Behavior**: Ctrl+Z undo, Ctrl+Shift+Z redo. Action stack stores shape modifications. Stack persists during session.
- **Approach**: Command pattern — each action (create, delete, move, resize, style change) is recorded as a reversible command.
- **Acceptance**: Undo/redo works for all actions, unlimited depth during session.

### Persistence
- **Behavior**: Save diagram state as JSON (array of shape objects with all properties). Load and recreate on open.
- **Controller**: `Q_INVOKABLE void saveDiagram(const QString &id, const QString &json)`, `Q_INVOKABLE QString loadDiagram(const QString &id)`
- **Acceptance**: Diagrams persist across app restarts, all shapes and styles restored.

---

## Important Note
> [!WARNING]
> Tldraw is a complete whiteboard engine with years of development. Building a full equivalent in QML Canvas is a significant undertaking. Consider a **phased approach**:
> - Phase 1: Basic shapes (rect, ellipse, line, text), selection, move, resize, colors
> - Phase 2: Arrows with connectors, eraser, undo/redo, export
> - Phase 3: Advanced features (rotation, grouping, grid snap, layers)

## Dependencies
- No external dependencies — pure QML Canvas implementation
- Bridge functions for diagram persistence

## Estimated New Files
- ~8 new QML files
- ~2 JavaScript helper files (shape rendering, hit detection)
- ~1 controller extension
- ~1 test file
