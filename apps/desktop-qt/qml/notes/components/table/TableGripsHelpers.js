.pragma library

function buildFilterArray(activeFilters) {
    var arr = []
    for (var k in activeFilters) {
        var f = activeFilters[k]
        if (f && (String(f.value || "").trim().length > 0 || f.operator === "empty" || f.operator === "not_empty")) {
            arr.push({
                columnIndex: parseInt(k, 10),
                operator: f.operator || "contains",
                value: String(f.value || ""),
                value2: f.value2 ? String(f.value2) : null
            })
        }
    }
    return arr
}
