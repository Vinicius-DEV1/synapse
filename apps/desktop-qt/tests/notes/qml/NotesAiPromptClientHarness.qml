import QtQuick

QtObject {
    id: clientRoot

    property var pendingCallback: null
    property int abortCount: 0
    property int completionCount: 0

    function promptText(systemPrompt, userPrompt, history, callback) {
        pendingCallback = callback
        return {
            abort: function() { clientRoot.abortCount += 1 }
        }
    }

    function complete(success, reply, error) {
        var callback = pendingCallback
        pendingCallback = null
        completionCount += 1
        if (typeof callback === "function") callback(success, reply, error)
    }
}
