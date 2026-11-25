.pragma library

function parseCoverConfig(rawCover) {
    if (!rawCover) return { url: "", position: 50 }
    var str = String(rawCover).trim()
    if (!str) return { url: "", position: 50 }
    if (str.charAt(0) === "{") {
        try {
            var parsed = JSON.parse(str)
            return {
                url: String(parsed.url || parsed.cover_image || ""),
                position: parsed.position !== undefined ? Number(parsed.position) : 50
            }
        } catch (err) {
            console.warn("[PageViewActions] Invalid cover JSON, falling back to string URL:", err)
        }
    }
    return { url: str, position: 50 }
}

function encodeCoverConfig(url, position) {
    var cleanUrl = String(url || "").trim()
    if (!cleanUrl) return ""
    var pos = Math.max(0, Math.min(100, Math.round(Number(position))))
    if (pos === 50) return cleanUrl
    return JSON.stringify({ url: cleanUrl, position: pos })
}

function normalizedParentId(page) {
    if (!page || page.parent_id === undefined || page.parent_id === null || page.parent_id === "null") {
        return ""
    }
    return String(page.parent_id)
}

function sortPagesCanonical(pages) {
    var copy = (pages || []).slice()
    copy.sort(function(a, b) {
        var orderDiff = Number(a.sort_order || 0) - Number(b.sort_order || 0)
        if (orderDiff !== 0) return orderDiff
        var titleDiff = String(a.title || "").localeCompare(String(b.title || ""), undefined, { numeric: true, sensitivity: "base" })
        if (titleDiff !== 0) return titleDiff
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
    })
    return copy
}

function buildHierarchyMaps(allPages) {
    var byId = {}
    var childrenByParent = {}
    var sorted = sortPagesCanonical(allPages)
    for (var i = 0; i < sorted.length; ++i) {
        var page = sorted[i]
        if (!page || !page.id) continue
        byId[page.id] = page
        var pid = normalizedParentId(page)
        if (!childrenByParent[pid]) childrenByParent[pid] = []
        childrenByParent[pid].push(page)
    }
    return { byId: byId, childrenByParent: childrenByParent, sorted: sorted }
}

function buildBreadcrumbs(pageId, byId) {
    var trail = []
    var seen = {}
    var curr = byId[pageId]
    while (curr && !seen[curr.id]) {
        seen[curr.id] = true
        trail.unshift(curr)
        var pid = normalizedParentId(curr)
        curr = pid ? byId[pid] : null
    }
    return trail
}

function isEncryptedStub(page) {
    if (!page || !page.id) return false
    var content = String(page.content || "").trim()
    var title = String(page.title || "").trim()
    if (page.is_encrypted === true || page.decryption_error === true) return true
    if (content === "🔒 [Encrypted note]") return true
    if (content.indexOf("ENC1:") === 0 || content.indexOf("v1:") === 0 || title.indexOf("ENC1:") === 0) return true
    if (content.indexOf("__SYNAPSE_ENCRYPTED__") >= 0) return true
    return false
}

function countWords(html) {
    var plain = String(html || "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&[a-z0-9#]+;/gi, " ")
        .trim()
    if (!plain) return 0
    return plain.split(/\s+/).length
}

function toggleCollapsedKey(map, pageId) {
    var next = Object.assign({}, map || ({}))
    if (next[pageId]) delete next[pageId]
    else next[pageId] = true
    return next
}

function duplicatePageWithController(ctrl, sourceId, fallbackTitle, activeContent, activeIcon, activeDesc, activeCover) {
    if (!sourceId || !ctrl) return ""
    var cur = ctrl.getPage(sourceId)
    if (!cur || !cur.id) return ""
    var copyTitle = (fallbackTitle || "Sem título") + " (Cópia)"
    var newId = ctrl.createSubPage(normalizedParentId(cur), copyTitle, activeIcon || "📄")
    if (newId) {
        ctrl.savePage(newId, copyTitle, activeContent, activeIcon || "📄", "")
        if (activeDesc) ctrl.updatePageDescription(newId, activeDesc)
        if (activeCover) ctrl.updatePageCover(newId, activeCover)
    }
    return newId || ""
}
