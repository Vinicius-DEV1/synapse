import QtQuick
import "../../../qml/notes/NotesBlockAiMarkdown.js" as BlockAiMarkdown

QtObject {
    function markdownToHtml(markdown) {
        return BlockAiMarkdown.markdownToHtml(markdown)
    }

    function richContentHtml(content) {
        return BlockAiMarkdown.richContentHtml(content)
    }

    function conversationHtml(content) {
        return BlockAiMarkdown.conversationHtml(content)
    }
}
