.pragma library

function withHexAlpha(colorValue, alphaHex) {
    var colorName = String(colorValue || "")
    var alphaValue = parseInt(String(alphaHex || ""), 16)
    if (!isFinite(alphaValue) || alphaValue < 0 || alphaValue > 255) return "transparent"

    var baseColor = Qt.color(colorName)
    if (!baseColor) return "transparent"
    return Qt.alpha(baseColor, alphaValue / 255)
}
