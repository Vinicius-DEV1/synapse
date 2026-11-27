.pragma library
.import "DocumentBundleOperations.js" as DocumentBundleOperations
.import "NotesBlockAiOperations.js" as BlockAiOperations

var supportedBlockTypes = ["codeBlock", "blockquote", "toggleBlock", "blockquoteToggle"]

function createHandler(editor, index) {
    if (index < 0 || index >= editor.blocks.length || !editor.pageId ||
            !editor.blocks[index] || !editor.blocks[index].id) return null
    if (supportedBlockTypes.indexOf(String(editor.blocks[index].blockType || "")) < 0) return null

    var sourcePageId = editor.pageId
    var sourceBlockId = String(editor.blocks[index].id)
    var sourceState = JSON.stringify(editor.blocks[index])
    return function(result, isCanonicalBlockHtml) {
        return editor.applyAiBlockResult(
            sourcePageId, sourceBlockId, sourceState, String(result || ""), Boolean(isCanonicalBlockHtml))
    }
}

function applyResult(editor, sourcePageId, sourceBlockId, sourceState, result, isCanonicalBlockHtml) {
    if (!sourcePageId || sourcePageId !== editor.pageId || !sourceBlockId || !result ||
            !editor.controller || typeof editor.controller.serializeNoteBlocks !== "function") return false
    if (!editor.flushActiveRichSlices()) return false

    var targetIndex = -1
    for (var i = 0; i < editor.blocks.length; ++i) {
        if (String(editor.blocks[i].id || "") === sourceBlockId) {
            targetIndex = i
            break
        }
    }
    if (targetIndex < 0 || JSON.stringify(editor.blocks[targetIndex]) !== sourceState) return false

    var sourceBlock = editor.blocks[targetIndex]
    var replacement = null
    if (isCanonicalBlockHtml && typeof editor.controller.parseNoteBlocks === "function") {
        var parsed = DocumentBundleOperations.toArray(editor.controller.parseNoteBlocks(result))
        if (parsed.length !== 1 || parsed[0].blockType !== sourceBlock.blockType) return false
        replacement = Object.assign({}, sourceBlock, parsed[0], {
            id: sourceBlock.id,
            attrs: Object.assign({}, sourceBlock.attrs || ({}), parsed[0].attrs || ({}))
        })
    } else {
        replacement = BlockAiOperations.replacementForBlock(sourceBlock, result)
    }
    if (!replacement || replacement.blockType !== sourceBlock.blockType) return false

    var nextBlocks = editor.blocks.slice()
    nextBlocks[targetIndex] = replacement
    var serialized = ""
    try {
        serialized = editor.controller.serializeNoteBlocks(nextBlocks)
    } catch (error) {
        console.error("[Notes:BlockListEditor] Could not serialize an AI block replacement:", error)
        return false
    }
    if (typeof serialized !== "string" || serialized.length === 0 || serialized === editor.lastEmittedHtml) return false

    editor.blocks[targetIndex] = replacement
    var row = editor.aiBlockRepeater.itemAt(targetIndex)
    if (row) row.liveBlockData = replacement
    editor.lastEmittedHtml = serialized
    editor.htmlChanged(serialized)
    return true
}
