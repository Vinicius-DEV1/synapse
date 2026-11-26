.pragma library

function parseJsonAttribute(raw, allowUriEncodedFallback) {
    if (typeof raw !== "string") {
        return { valid: false, value: null, error: "Expected a text attribute." }
    }

    try {
        return { valid: true, value: JSON.parse(raw), error: "" }
    } catch (error) {
        if (allowUriEncodedFallback && raw.indexOf("%") >= 0) {
            try {
                return { valid: true, value: JSON.parse(decodeURIComponent(raw)), error: "" }
            } catch (encodedError) {
                return { valid: false, value: null, error: String(encodedError) }
            }
        }
        return { valid: false, value: null, error: String(error) }
    }
}
