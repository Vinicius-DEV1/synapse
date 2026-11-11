.pragma library

function mapQuestionRows(rawRows) {
    var mapped = []
    for (var i = 0; i < rawRows.length; ++i) {
        var row = rawRows[i]
        var options = []
        if (Array.isArray(row.options)) {
            options = row.options
        } else if (typeof row.options === "string") {
            try {
                options = JSON.parse(row.options)
            } catch (error) {
                console.warn("[Questions] Ignoring a question with invalid options JSON.", row.id)
                continue
            }
        }

        var correctIndex = Number(row.correct_index)
        if (row.type && row.type !== "multiple_choice") continue
        if (!Array.isArray(options) || options.length < 2 || !Number.isInteger(correctIndex)
                || correctIndex < 0 || correctIndex >= options.length || !row.question) {
            console.warn("[Questions] Ignoring a question with incomplete answer data.", row.id)
            continue
        }

        mapped.push({
            "id": row.id,
            "batteryId": row.battery_id,
            "prompt": row.question,
            "options": options,
            "correctIndex": correctIndex,
            "explanation": row.explanation || ""
        })
    }
    return mapped
}
