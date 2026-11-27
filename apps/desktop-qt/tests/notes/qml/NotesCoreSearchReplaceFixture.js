.pragma library

function controllerWithResults(results) {
    var pending = results.slice()
    var calls = 0
    return {
        applyNoteSearchReplace: function(original, proposal) {
            calls += 1
            if (pending.length === 0)
                return { success: false, result: String(original || ""), parsedCount: 0, replacedCount: 0, error: "Unexpected Core call" }
            return pending.shift()
        },
        callCount: function() { return calls }
    }
}

function success(result) {
    return { success: true, result: result, parsedCount: 1, replacedCount: 1, error: "" }
}

function missing(original) {
    return { success: false, result: original, parsedCount: 1, replacedCount: 0, error: "Not found" }
}
