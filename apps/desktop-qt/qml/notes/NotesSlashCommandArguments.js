.pragma library

function extractSlashCommandArgument(rawQuery, aliases) {
    var trimmed = String(rawQuery || "").trim()
    if (!trimmed.length) return ""

    var sortedAliases = (aliases || []).slice().sort(function(left, right) {
        return right.length - left.length
    })
    var lowerTrimmed = trimmed.toLowerCase()
    for (var i = 0; i < sortedAliases.length; ++i) {
        var alias = String(sortedAliases[i] || "")
        var lowerAlias = alias.toLowerCase()
        if (lowerTrimmed === lowerAlias) return ""
        if (lowerTrimmed.indexOf(lowerAlias + " ") === 0 || lowerTrimmed.indexOf(lowerAlias + "\t") === 0)
            return trimmed.substring(alias.length).trim()
    }

    if (trimmed.indexOf(" ") < 0) return ""
    return trimmed.substring(trimmed.indexOf(" ") + 1).trim()
}

function focusPrefill(rawQuery) {
    var argument = extractSlashCommandArgument(rawQuery, ["foco", "timer", "pomodoro"])
    var parts = argument.length ? argument.split(/\s+/) : []
    var result = { time: 30, tag: "", desc: "" }
    var description = []

    for (var i = 0; i < parts.length; ++i) {
        var part = parts[i]
        var number = Number(part)
        if (!Number.isNaN(number) && number > 0) {
            result.time = number
        } else if (part.charAt(0) === "#") {
            result.tag = part.substring(1)
        } else {
            description.push(part)
        }
    }
    result.desc = description.join(" ")
    return result
}

function alarmPrefill(rawQuery) {
    var argument = extractSlashCommandArgument(rawQuery, ["alarme", "despertador"])
    var parts = argument.split(/\s+/)
    var validTime = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    var time = "12:00"
    for (var i = 0; i < parts.length; ++i) {
        if (validTime.test(parts[i])) {
            time = parts[i].length === 4 ? "0" + parts[i] : parts[i]
            break
        }
    }
    return { timeStr: time }
}

function normalizeWebUrl(rawUrl) {
    var url = String(rawUrl || "").trim()
    var httpMatch = /^https?:\/\/([^/?#]+)(?:[/?#][^\s<>"']*)?$/i.exec(url)
    if (httpMatch) {
        var authority = httpMatch[1]
        return /^(?:[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?|\[[0-9a-f:.]+\])(?::[0-9]{1,5})?$/i.test(authority)
            ? url : ""
    }
    if (/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}(?::[0-9]{1,5})?(?:[/?#][^\s<>"']*)?$/i.test(url))
        return "https://" + url
    return ""
}
