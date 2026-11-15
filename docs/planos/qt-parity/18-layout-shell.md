# 18 — Layout & App Shell

> **Status**: ✅ Complete | **Complexity**: 🟠 High | **Priority**: P1
>
> Basic sidebar, tab bar, and window exist. Missing: sidebar page tree with DnD, pinned items, module list with reorder, tab context menu, global modals host, command palette enhancement, app context menu, background task widget, sync status toast, window controls polish.

---

## React Reference
- **Layout**: `apps/web-react/src/components/layout/` (20 files)
- **Modals**: `apps/web-react/src/components/modals/`
- **UI shared**: `apps/web-react/src/components/ui/`
- **Store**: `apps/web-react/src/store/commands.ts`, `useStore.tsx`, `TaskContext.tsx`
- **Hooks**: `apps/web-react/src/hooks/useAppShortcuts.ts`, `useAppTitle.ts`, `useAppEvents.ts`, `useAppBackPress.ts`, `useAppAuth.ts`

## Qt Existing
- **QML**: `main.qml`, `AppSidebar.qml`, `AppTopTabBar.qml`, `AppNavList.qml`, `AppIcon.qml`, `AuthenticatedApplication.qml`, `CommandPalette.qml`, `WindowResizeHandles.qml`, `Theme.qml`

---

## Feature Parity Table

| Feature | React File | Qt Status |
|---------|-----------|-----------|
| App main layout | `App.tsx` | ✅ Done |
| Sidebar with module list | `sidebar/Sidebar.tsx`, `sidebar/SidebarModuleList.tsx` | ✅ Done |
| Tab bar | `TabBar.tsx` | ✅ Done |
| Navigation list | `sidebar/SidebarItem.tsx` | ✅ Done |
| Command palette | `CommandPalette.qml` (exists) | ✅ Done |
| Window resize handles | — | ✅ Done |
| Theme system | `Theme.qml` | ✅ Done |
| Authenticated app wrapper | — | ✅ Done |
| **Sidebar page tree (hierarchical notes)** | `sidebar/SidebarPageTree.tsx` | ✅ Done |
| **Sidebar pinned items** | `sidebar/PinnedSidebarItem.tsx` | ✅ Done |
| **Sidebar root droppable (DnD reorder)** | `sidebar/RootDroppable.tsx` | ✅ Done |
| **Sidebar modules config (order/visibility)** | `sidebar/modules.config.ts` | ✅ Done |
| **Tab context menu** | `TabContextMenu.tsx` | ✅ Done |
| **App context menu (right-click)** | `AppContextMenu.tsx` | ✅ Done |
| **Global modals host** | `GlobalModals.tsx` | ✅ Done |
| **Window controls (minimize/maximize/close)** | `WindowControls.tsx` | ✅ Done |
| **Background task widget** | `BackgroundTaskWidget.tsx` | ✅ Done |
| **Sync status toast** | `SyncStatusToast.tsx` | ✅ Done |
| **App shortcuts (global keyboard)** | `hooks/useAppShortcuts.ts` | ✅ Done |
| **App title (dynamic window title)** | `hooks/useAppTitle.ts` | ✅ Done |
| **App events (lifecycle)** | `hooks/useAppEvents.ts` | ✅ Done |
| **App back press (navigation)** | `hooks/useAppBackPress.ts` | ✅ Done |
| **Command store (palette commands)** | `store/commands.ts` | ✅ Done |
| **Global store** | `store/useStore.tsx` | ✅ Done |
| **Task context (background tasks)** | `store/TaskContext.tsx` | ✅ Done |

---

## Implementation Specs

### Sidebar Page Tree
- **React**: `sidebar/SidebarPageTree.tsx`
- **Create**: `qml/AppSidebarPageTree.qml`, `qml/AppSidebarPageItem.qml`
- **Behavior**: Below the module list, show a hierarchical tree of notes pages. Expandable nodes for pages with sub-pages. Click to navigate. Right-click for context menu (rename, delete, move, duplicate, pin). Drag & drop to reorder or nest under another page. Indent shows depth. Active page highlighted.
- **Approach**: QML `TreeView` or recursive `ListView` with custom delegate. Drag via `Drag`/`DropArea`.
- **Controller**: Use existing notes controller for page hierarchy. `Q_INVOKABLE void movePageInTree(const QString &pageId, const QString &newParentId, int position)`
- **Acceptance**: Tree shows all pages hierarchically, expand/collapse works, DnD reorders, context menu actions work, active page highlighted.

### Sidebar Pinned Items
- **React**: `sidebar/PinnedSidebarItem.tsx`
- **Create**: `qml/AppSidebarPinnedSection.qml`
- **Behavior**: Section above page tree showing pinned pages/items. Star icon to unpin. Drag to reorder pinned items. Separator line between pinned and tree.
- **Acceptance**: Pinned pages appear in dedicated section, unpin removes from section, reorder via drag works.

### Sidebar DnD Reorder
- **React**: `sidebar/RootDroppable.tsx`
- **Behavior**: Drag items in the sidebar to reorder modules, pinned items, and page tree nodes. Visual drop indicator (line between items).
- **Acceptance**: Drag reorder works for all sidebar sections, order persists.

### Tab Context Menu
- **React**: `TabContextMenu.tsx`
- **Create**: `qml/AppTabContextMenu.qml`
- **Behavior**: Right-click on tab shows: Close, Close Others, Close All, Close to the Right, Pin/Unpin, Duplicate, Copy Path. Pinned tabs move to left side and can't be closed without unpinning.
- **Acceptance**: All context menu actions work, pinned tabs stay left.

### App Context Menu
- **React**: `AppContextMenu.tsx`
- **Create**: `qml/AppContextMenu.qml`
- **Behavior**: Right-click on empty area shows: New Page, New Folder, Paste, Settings, Command Palette (Ctrl+K), Help.
- **Acceptance**: Context menu appears on right-click, all actions navigate correctly.

### Global Modals Host
- **React**: `GlobalModals.tsx`
- **Create**: `qml/GlobalModalsHost.qml`
- **Behavior**: Centralized component that manages app-wide modals (settings, command palette, global search). Ensures only one is visible. Handles Escape key dismissal.
- **Acceptance**: Global modals work from any view, Escape dismisses, only one visible at a time.

### Background Task Widget
- **React**: `BackgroundTaskWidget.tsx`
- **Create**: `qml/BackgroundTaskWidget.qml`
- **Behavior**: Small widget in bottom-right showing progress of background tasks (backup, upload, download, sync). Shows task name, progress bar, cancel button. Collapsible when no active tasks.
- **Controller**: `Q_INVOKABLE QVariantList getActiveTasks()` — singleton tracking all background operations.
- **Acceptance**: Widget shows during active operations, progress updates, cancel stops the task.

### Sync Status Toast
- **React**: `SyncStatusToast.tsx`
- **Create**: `qml/SyncStatusToast.qml`
- **Behavior**: Transient toast notification showing sync status: "Syncing...", "All changes saved", "Sync error — click to retry". Appears at bottom of screen, auto-dismisses after success.
- **Acceptance**: Toast appears during sync operations, shows correct status, auto-dismisses.

### Window Controls
- **Extend**: `main.qml` or `WindowResizeHandles.qml`
- **Behavior**: Custom title bar with minimize, maximize/restore, close buttons. Double-click title bar to maximize. Drag title bar to move window.
- **Acceptance**: All window controls work on Linux, window dragging works, maximize/restore toggles.

### App Shortcuts (Global)
- **React**: `hooks/useAppShortcuts.ts`
- **Extend**: `main.qml` or create `qml/AppGlobalShortcuts.qml`
- **Behavior**: Global keyboard shortcuts:
  - `Ctrl+K` — Command palette
  - `Ctrl+N` — New page
  - `Ctrl+W` — Close current tab
  - `Ctrl+Tab` — Next tab
  - `Ctrl+Shift+Tab` — Previous tab
  - `Ctrl+1-9` — Switch to tab 1-9
  - `Ctrl+,` — Settings
  - `Ctrl+\` — Toggle sidebar
  - `Ctrl+F` — Search (context-aware)
  - `F11` — Toggle fullscreen
- **Acceptance**: All shortcuts work from any view, don't conflict with module-specific shortcuts.

### App Title
- **Behavior**: Window title updates dynamically: "PageName — Synapse" when viewing a page, "Module — Synapse" when in a module.
- **Controller**: Bind `ApplicationWindow.title` to current view/page name.
- **Acceptance**: Window title reflects current context.

---

## Dependencies
- All module views depend on the shell being stable
- Page tree depends on notes controller
- Sync toast depends on sync infrastructure

## Estimated New Files
- ~12 new QML files
- ~1 controller extension (task manager)
- ~2 test files
