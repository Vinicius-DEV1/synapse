import QtQuick
import QtTest
import "../../../qml/notes/NotesBlockAiSession.js" as BlockAiSession

TestCase {
    name: "NotesBlockAiSession"

    function mockController(path, initialValue) {
        var values = initialValue ? { notes_block_ai_sessions_v1: initialValue } : ({})
        var controller = {
            dbPath: path,
            values: values,
            writes: 0,
            getConfig: function(key, fallback) { return values[key] || fallback },
            setConfig: function(key, value) {
                values[key] = value
                controller.writes++
                return true
            }
        }
        return controller
    }

    function test_sessionSurvivesControllerAndApplicationRecreation() {
        var firstController = mockController("profile-a")
        BlockAiSession.configure(firstController)
        BlockAiSession.save("page-1::block-1", [
            { role: "user", content: "Improve this block" },
            { role: "assistant", content: "Updated proposal" }
        ])
        compare(firstController.writes, 1)

        var restartedController = mockController("profile-a", firstController.values.notes_block_ai_sessions_v1)
        BlockAiSession.configure(restartedController)
        compare(BlockAiSession.load("page-1::block-1").length, 2)
        compare(BlockAiSession.load("page-1::block-1")[1].content, "Updated proposal")
    }

    function test_sessionsAreIsolatedWhenTheActiveDatabaseChanges() {
        var firstProfile = mockController("profile-a")
        BlockAiSession.configure(firstProfile)
        BlockAiSession.save("page-1::block-1", [{ role: "assistant", content: "Private profile data" }])

        var secondProfile = mockController("profile-b")
        BlockAiSession.configure(secondProfile)
        compare(BlockAiSession.load("page-1::block-1").length, 0)
    }

    function test_clearPersistsAndInvalidMessageShapesAreFiltered() {
        var controller = mockController("profile-a", JSON.stringify({
            "page-1::block-1": [
                { role: "assistant", content: "Keep" },
                { role: "system", content: "Drop" },
                { role: "user", content: 7 }
            ]
        }))
        BlockAiSession.configure(controller)
        compare(BlockAiSession.load("page-1::block-1").length, 1)
        BlockAiSession.clear("page-1::block-1")
        compare(BlockAiSession.load("page-1::block-1").length, 0)
        compare(JSON.parse(controller.values.notes_block_ai_sessions_v1)["page-1::block-1"], undefined)
        compare(controller.writes, 1)
    }
}
