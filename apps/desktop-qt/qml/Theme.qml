import QtQuick 2.15

QtObject {
    id: theme

    // Canvas & Surfaces (Caderno Design System)
    readonly property color bgDarkBg: "#0f0e17"       // Main deep midnight canvas
    readonly property color bgDarkCard: "#1a1924"     // Elevated cards, panels, modals
    readonly property color bgDarkSurface: "#15141b"  // Tertiary surfaces, inputs
    readonly property color bgHover: "#ffffff0d"      // Subtle hover highlight

    // Text Scale
    readonly property color textDark: "#fffffe"       // Primary high-contrast text
    readonly property color textSubtext: "#a7a9be"    // Secondary muted text
    readonly property color textMuted: "#64748b"      // Micro labels, placeholders

    // Brand Palette (Signature Periwinkle / Violet)
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
    readonly property color borderSubtle: "#ffffff0f" // border-white/5 whisper-thin
    readonly property color borderCard: "#ffffff12"   // border-white/[0.07]
    readonly property color borderBrand: "#8b5cf64d"  // hover:border-brand-500/30
    readonly property color borderFocus: "#8b5cf680"

    // Typography
    readonly property string fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    readonly property string fontMono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
}

