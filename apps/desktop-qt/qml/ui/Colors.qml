import QtQuick 2.15

// Canonical Caderno color palettes mirroring apps/web-react/src/utils/colors.ts & TableColorPopover.tsx
QtObject {
    id: colorsRoot

    readonly property var textColors: [
        { name: "Padrão", value: "inherit", hex: "#FFFFFF" },
        { name: "Cinza", value: "#9CA3AF", hex: "#9CA3AF" },
        { name: "Marrom", value: "#A8A29E", hex: "#A8A29E" },
        { name: "Laranja", value: "#F97316", hex: "#F97316" },
        { name: "Amarelo", value: "#EAB308", hex: "#EAB308" },
        { name: "Verde", value: "#22C55E", hex: "#22C55E" },
        { name: "Azul", value: "#3B82F6", hex: "#3B82F6" },
        { name: "Roxo", value: "#A855F7", hex: "#A855F7" },
        { name: "Rosa", value: "#EC4899", hex: "#EC4899" },
        { name: "Vermelho", value: "#EF4444", hex: "#EF4444" }
    ]

    readonly property var bgColors: [
        { name: "Padrão", value: "transparent", hex: "default" },
        { name: "Fundo Cinza", value: "#269CA3AF", hex: "#9CA3AF" },
        { name: "Fundo Marrom", value: "#26A8A29E", hex: "#A8A29E" },
        { name: "Fundo Laranja", value: "#26F97316", hex: "#F97316" },
        { name: "Fundo Amarelo", value: "#26EAB308", hex: "#EAB308" },
        { name: "Fundo Verde", value: "#2622C55E", hex: "#22C55E" },
        { name: "Fundo Azul", value: "#263B82F6", hex: "#3B82F6" },
        { name: "Fundo Roxo", value: "#26A855F7", hex: "#A855F7" },
        { name: "Fundo Rosa", value: "#26EC4899", hex: "#EC4899" },
        { name: "Fundo Vermelho", value: "#26EF4444", hex: "#EF4444" }
    ]

    readonly property var cellBgColors: [
        { name: "Sem Cor", value: "transparent", hex: "transparent" },
        { name: "Vermelho", value: "rgba(239, 68, 68, 0.2)", hex: "#EF4444" },
        { name: "Laranja", value: "rgba(249, 115, 22, 0.2)", hex: "#F97316" },
        { name: "Amarelo", value: "rgba(234, 179, 8, 0.2)", hex: "#EAB308" },
        { name: "Verde", value: "rgba(34, 197, 94, 0.2)", hex: "#22C55E" },
        { name: "Azul", value: "rgba(59, 130, 246, 0.2)", hex: "#3B82F6" },
        { name: "Roxo", value: "rgba(139, 92, 246, 0.2)", hex: "#8B5CF6" },
        { name: "Rosa", value: "rgba(236, 72, 153, 0.2)", hex: "#EC4899" }
    ]

    function bgTintFor(hexColor, defaultTint) {
        if (!hexColor || hexColor === "default" || hexColor === "transparent") {
            return defaultTint || "#0dffffff"
        }
        var c = String(hexColor).trim()
        if (c.charAt(0) === "#" && c.length === 7) {
            return "#24" + c.substring(1)
        }
        return c
    }

    function borderTintFor(hexColor, defaultBorder) {
        if (!hexColor || hexColor === "default" || hexColor === "transparent") {
            return defaultBorder || "#14ffffff"
        }
        var c = String(hexColor).trim()
        if (c.charAt(0) === "#" && c.length === 7) {
            return "#66" + c.substring(1)
        }
        return c
    }
}
