import QtQml 2.15
import "../../../qml/notes/NotesBlockAiSession.js" as BlockAiSession

QtObject {
    function saveSession() {
        BlockAiSession.configure(dataController)
        BlockAiSession.save("page-one::code-one", [
            { role: "user", content: "Refactor only this code block" },
            { role: "assistant", content: "const answer = 42;" }
        ])
        return BlockAiSession.load("page-one::code-one")
    }

    function loadSession() {
        BlockAiSession.configure(dataController)
        return BlockAiSession.load("page-one::code-one")
    }

    function clearSession() {
        BlockAiSession.configure(dataController)
        BlockAiSession.clear("page-one::code-one")
        return BlockAiSession.load("page-one::code-one")
    }
}
