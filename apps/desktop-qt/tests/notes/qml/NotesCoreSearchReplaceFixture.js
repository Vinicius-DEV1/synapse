.pragma library

function controllerWithResults(results) {
    var pending = results.slice()
    return {
        applyNoteSearchReplace: function(original, proposal) {
            if (pending.length === 0)
                return { success: false, result: String(original || ""), replacedCount: 0, error: "Unexpected Core call" }
            return pending.shift()
        }
    }
}

function success(result) {
    return { success: true, result: result, replacedCount: 1, error: "" }
}

function missing(original) {
    return { success: false, result: original, replacedCount: 0, error: "Not found" }
}
