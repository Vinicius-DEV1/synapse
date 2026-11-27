import QtQuick 2.15

Item {
    id: focusManager

    property bool modalVisible: false
    property bool hasRevisions: false
    property Item revisionTarget: null
    property Item returnTarget: null

    function focusRevisionWhenReady() {
        if (!modalVisible || !hasRevisions) return
        if (revisionTarget) {
            revisionTarget.forceActiveFocus()
            return
        }
        focusRetryTimer.start()
    }

    onModalVisibleChanged: {
        if (modalVisible) focusRevisionWhenReady()
        else if (returnTarget) Qt.callLater(function() { if (returnTarget) returnTarget.forceActiveFocus() })
    }
    onHasRevisionsChanged: if (modalVisible && hasRevisions) focusRevisionWhenReady()
    onRevisionTargetChanged: if (modalVisible && hasRevisions && !revisionTarget) focusRetryTimer.start()

    Timer {
        id: focusRetryTimer
        interval: 16
        repeat: true
        onTriggered: {
            if (focusManager.revisionTarget) {
                stop()
                focusManager.revisionTarget.forceActiveFocus()
            } else if (!focusManager.modalVisible || !focusManager.hasRevisions) {
                stop()
            }
        }
    }
}
