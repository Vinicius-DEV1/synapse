import QtQuick 2.15

QtObject {
    id: theme

    // Canvas & Surfaces (Caderno Signature Violet/Midnight Design System)
    readonly property color bgDarkBg: "#0f0e17"       // Main application canvas
    readonly property color bgDarkCard: "#1a1924"     // Card & panel surfaces
    readonly property color bgDarkSurface: "#15141b"  // Elevated pills, item tiles, inputs
    readonly property color bgHover: "#0affffff"      // Subtle hover highlight
    readonly property color activePillBg: "#268b5cf6" // Brand accent at 15% opacity
    readonly property color activePillBorder: "#408b5cf6" // Brand accent at 25% opacity

    // Text Scale
    readonly property color textDark: "#ffffff"       // Primary high-contrast text
    readonly property color textSubtext: "#a7a9be"    // Secondary text from the web design system
    readonly property color textMuted: "#77798d"      // Micro labels and placeholders

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
    readonly property color successBg: "#1a10b981"
    readonly property color successBorder: "#3310b981"

    readonly property color error: "#f43f5e"          // Rose
    readonly property color errorBg: "#1af43f5e"
    readonly property color errorBorder: "#33f43f5e"

    readonly property color warning: "#f59e0b"        // Amber
    readonly property color warningBg: "#1af59e0b"
    readonly property color warningBorder: "#33f59e0b"

    // Borders & Dividers
    readonly property color borderSubtle: "#0affffff" // Whisper-thin border
    readonly property color borderCard: "#0fffffff"   // Whisper-thin neutral card border
    readonly property color borderBrand: "#4d8b5cf6"  // hover:border-brand-500/30
    readonly property color borderFocus: "#808b5cf6"

    // Typography
    readonly property string fontFamily: "Sans Serif"
    readonly property string fontMono: "Monospace"
}
