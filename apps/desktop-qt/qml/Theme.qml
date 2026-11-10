import QtQuick 2.15

QtObject {
    id: theme

    // Canvas & Surfaces (Caderno Signature Violet/Midnight Design System)
    readonly property color bgDarkBg: "#0d0b14"       // Main deep dark purple canvas
    readonly property color bgDarkCard: "#161325"     // Card & panel surfaces
    readonly property color bgDarkSurface: "#1d1830"  // Elevated pills, item tiles, inputs
    readonly property color bgHover: "#ffffff0a"      // Subtle hover highlight
    readonly property color activePillBg: "#231c38"   // Active capsule in navigation & tabs
    readonly property color activePillBorder: "#8b5cf633" // Delicate purple accent border

    // Text Scale
    readonly property color textDark: "#ffffff"       // Primary high-contrast text
    readonly property color textSubtext: "#9ca3af"    // Secondary muted text (zinc-400)
    readonly property color textMuted: "#6b7280"      // Micro labels, placeholders (zinc-500)

    // Brand Palette (Signature Violet / Purple)
    readonly property color brand50: "#f5f3ff"
    readonly property color brand200: "#ddd6fe"
    readonly property color brand300: "#c4b5fd"
    readonly property color brand400: "#a78bfa"
    readonly property color brand500: "#8b5cf6"
    readonly property color brand600: "#7c3aed"
    readonly property color brand700: "#6d28d9"

    // Functional & Semantic Colors
    readonly property color success: "#10b981"        // Emerald
    readonly property color successBg: "#10b9811a"
    readonly property color successBorder: "#10b98133"

    readonly property color error: "#f43f5e"          // Rose
    readonly property color errorBg: "#f43f5e1a"
    readonly property color errorBorder: "#f43f5e33"

    readonly property color warning: "#f59e0b"        // Amber
    readonly property color warningBg: "#f59e0b1a"
    readonly property color warningBorder: "#f59e0b33"

    // Borders & Dividers
    readonly property color borderSubtle: "#ffffff0a" // Whisper-thin border
    readonly property color borderCard: "#26203b"     // Subtle purple-card border
    readonly property color borderBrand: "#8b5cf64d"  // hover:border-brand-500/30
    readonly property color borderFocus: "#8b5cf680"

    // Typography
    readonly property string fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif"
    readonly property string fontMono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
}
