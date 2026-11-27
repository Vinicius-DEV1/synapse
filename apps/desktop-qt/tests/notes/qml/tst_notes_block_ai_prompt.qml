import QtQuick
import QtTest
import "../../../qml/notes/NotesBlockAiPrompt.js" as BlockAiPrompt

TestCase {
    name: "NotesBlockAiPrompt"

    function test_contextUsesCurrentCodeAndLanguage() {
        var handler = function() {}
        handler.blockType = "codeBlock"
        handler.blockLanguage = "rust"
        handler.sourceContent = "fn main() {}"
        var context = BlockAiPrompt.contextFor(handler)

        verify(context.indexOf("Bloco de Código") >= 0)
        verify(context.indexOf("Linguagem: rust") >= 0)
        verify(context.indexOf("```rust\nfn main() {}\n```") >= 0)
    }

    function test_contextExtractsRichBlockTextAndTitle() {
        var handler = function() {}
        handler.blockType = "toggleBlock"
        handler.blockSubtitle = "Review notes"
        handler.sourceContent = "<p>First &amp; <strong>second</strong></p><ul><li>Third</li></ul>"
        var context = BlockAiPrompt.contextFor(handler)

        verify(context.indexOf('Título atual: "Review notes"') >= 0)
        verify(context.indexOf("First & second\nThird") >= 0)
        verify(context.indexOf("<strong>") < 0)
    }

    function test_providerHistoryMapsVisibleMessagesToAiClientContract() {
        var mapped = BlockAiPrompt.providerHistory([
            { role: "user", content: "First request" },
            { role: "assistant", content: "First response" },
            { role: "system", content: "Ignore unsupported roles" },
            null
        ])

        compare(mapped.length, 2)
        compare(mapped[0].role, "user")
        compare(mapped[0].messageText, "First request")
        compare(mapped[1].role, "assistant")
        compare(mapped[1].messageText, "First response")
        compare(BlockAiPrompt.providerHistory(null).length, 0)
    }

    function test_systemRulesAreSpecificAndAllowSurgicalEdits() {
        var codePrompt = BlockAiPrompt.systemInstruction("codeBlock", "json")
        var togglePrompt = BlockAiPrompt.systemInstruction("blockquoteToggle", "auto")
        var calloutPrompt = BlockAiPrompt.systemInstruction("blockquote", "auto")

        verify(codePrompt.indexOf("JSON padrão não aceita comentários") >= 0)
        verify(codePrompt.indexOf("<<<<<<< SEARCH") >= 0)
        verify(togglePrompt.indexOf("Título:") >= 0)
        verify(togglePrompt.indexOf("toggle callout") >= 0)
        verify(calloutPrompt.indexOf("casca externa") >= 0)
        verify(calloutPrompt.indexOf("Título:") < 0)
    }
}
