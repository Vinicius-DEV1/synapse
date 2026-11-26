.pragma library

function escapeHtmlText(value) {
    return String(value === undefined || value === null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
}

function escapeHtmlAttribute(value) {
    return escapeHtmlText(value)
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;")
}

function escapeHtmlNonNegativeIntegerAttribute(value) {
    var number = Number(value)
    var normalized = isFinite(number) && number >= 0 ? Math.floor(number) : 0
    return escapeHtmlAttribute(normalized)
}
