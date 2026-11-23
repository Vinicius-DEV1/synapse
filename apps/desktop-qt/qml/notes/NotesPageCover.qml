import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import ".."

Item {
    id: coverRoot
    readonly property bool isDialogOpen: coverDialog.visible

    property var controller: null
    property string pageId: ""
    property string coverImage: ""
    property string errorMessage: ""
    property int coverPositionY: 50
    property bool isRepositioning: false
    readonly property bool hasCover: coverImage.trim().length > 0

    signal coverSaved(string url)
    signal actionFailed(string message)

    function loadCoverPosition() {
        isRepositioning = false
        if (!controller || !pageId || typeof controller.getConfig !== "function") {
            coverPositionY = 50
            return
        }
        var raw = Number(controller.getConfig("note_cover_pos_" + pageId, "50"))
        coverPositionY = isNaN(raw) ? 50 : Math.max(0, Math.min(100, Math.round(raw)))
    }

    onPageIdChanged: loadCoverPosition()
    Component.onCompleted: loadCoverPosition()

    function reportError(message) {
        errorMessage = message
        actionFailed(message)
    }

    Layout.fillWidth: true
    Layout.preferredHeight: hasCover ? 256 : 104
    implicitHeight: Layout.preferredHeight
    clip: true

    Image {
        id: coverPreview
        x: 0
        width: parent.width
        height: implicitWidth > 0 && implicitHeight > 0
            ? Math.max(parent.height, parent.width * (implicitHeight / implicitWidth))
            : parent.height
        y: height > parent.height
            ? -((height - parent.height) * (coverRoot.coverPositionY / 100.0))
            : 0
        visible: coverRoot.hasCover
        source: coverRoot.stableCoverUrl(coverRoot.coverImage)
        asynchronous: true
        cache: true
        fillMode: Image.PreserveAspectCrop
        sourceSize.width: width
        sourceSize.height: Math.max(parent.height, height)
    }

    MouseArea {
        id: repositionDragArea
        anchors.fill: parent
        visible: coverRoot.hasCover && coverRoot.isRepositioning
        cursorShape: pressed ? Qt.ClosedHandCursor : Qt.OpenHandCursor
        z: 1
        property real pressY: 0
        property int startPositionY: 50
        onPressed: function(mouse) {
            pressY = mouse.y
            startPositionY = coverRoot.coverPositionY
        }
        onPositionChanged: function(mouse) {
            if (!pressed) return
            var delta = Math.round(((pressY - mouse.y) / Math.max(1, height)) * 100)
            coverRoot.coverPositionY = Math.max(0, Math.min(100, startPositionY + delta))
        }
    }

    Rectangle {
        anchors.centerIn: parent
        visible: coverRoot.hasCover && coverRoot.isRepositioning
        width: repositionHint.implicitWidth + 24
        height: 30
        radius: 8
        color: "#b30f0e17"
        border.color: "#33ffffff"
        z: 2
        Label {
            id: repositionHint
            anchors.centerIn: parent
            text: qsTr("Arraste verticalmente para ajustar (%1%)").arg(coverRoot.coverPositionY)
            color: "#fffffe"
            font.pixelSize: 12
        }
    }

    function stableCoverUrl(url) {
        if (!url || url.indexOf("picsum.photos") < 0 || url.indexOf("/seed/") >= 0) return url
        const randomMatch = /[?&]random=([^&]+)/.exec(url)
        const seed = randomMatch ? randomMatch[1].replace("0.", "") : (coverRoot.pageId || "cover")
        return "https://picsum.photos/seed/" + seed + "/1600/400"
    }

    HoverHandler { id: coverHover }

    Rectangle {
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.bottom: parent.bottom
        height: 1
        visible: coverRoot.hasCover
        color: "#0fffffff"
    }

    Label {
        anchors.left: parent.left
        anchors.bottom: parent.bottom
        anchors.leftMargin: 16
        anchors.bottomMargin: 10
        visible: coverRoot.errorMessage.length > 0
        text: coverRoot.errorMessage
        color: "#fda4af"
        font.pixelSize: 12
        z: 2
    }

    RowLayout {
        anchors.top: parent.top
        anchors.right: parent.right
        anchors.margins: 16
        spacing: 8
        z: 3
        visible: coverRoot.hasCover
        opacity: coverRoot.isRepositioning || coverHover.hovered || repositionButton.activeFocus || changeCoverButton.activeFocus || coverActions.activeFocus ? 1 : 0
        Behavior on opacity { NumberAnimation { duration: 150 } }

        Button {
            id: repositionButton
            text: coverRoot.isRepositioning ? qsTr("Salvar posição") : qsTr("Reposicionar")
            onClicked: {
                if (coverRoot.isRepositioning) {
                    if (coverRoot.controller && typeof coverRoot.controller.setConfig === "function") {
                        coverRoot.controller.setConfig("note_cover_pos_" + coverRoot.pageId, String(coverRoot.coverPositionY))
                    }
                    coverRoot.isRepositioning = false
                } else {
                    coverRoot.isRepositioning = true
                }
            }
            background: Rectangle {
                radius: 8
                color: coverRoot.isRepositioning ? "#cc8b5cf6" : (parent.hovered ? "#b3000000" : "#80000000")
            }
            contentItem: Label { text: parent.text; color: "white"; font.pixelSize: 13; font.weight: Font.Medium; leftPadding: 4; rightPadding: 4 }
        }
        Button {
            id: changeCoverButton
            text: qsTr("Change cover")
            onClicked: coverDialog.open()
            background: Rectangle { radius: 8; color: parent.hovered ? "#b3000000" : "#80000000" }
            contentItem: RowLayout {
                spacing: 7
                AppIcon { name: "image"; width: 15; height: 15; color: "white" }
                Label { text: parent.parent.text; color: "white"; font.pixelSize: 13; font.weight: Font.Medium }
            }
        }
        Button {
            id: coverActions
            text: qsTr("Remove cover")
            onClicked: {
                if (!coverRoot.controller || !coverRoot.controller.updatePageCover(coverRoot.pageId, "")) {
                    coverRoot.reportError(qsTr("The cover could not be removed. Try again."))
                    return
                }
                coverRoot.errorMessage = ""
                coverRoot.coverSaved("")
            }
            background: Rectangle { radius: 8; color: parent.hovered ? "#ccf43f5e" : "#80000000" }
            contentItem: Label { text: parent.text; color: "white"; font.pixelSize: 13; font.weight: Font.Medium; leftPadding: 4; rightPadding: 4 }
        }
    }

    Item {
        anchors.horizontalCenter: parent.horizontalCenter
        anchors.bottom: parent.bottom
        width: Math.max(0, Math.min(parent.width - 96, 928))
        height: 96
        visible: !coverRoot.hasCover

        Button {
            anchors.left: parent.left
            anchors.leftMargin: 0
            anchors.bottom: parent.bottom
            anchors.bottomMargin: 8
            text: qsTr("Add cover")
            opacity: coverHover.hovered || activeFocus ? 1 : 0
            Behavior on opacity { NumberAnimation { duration: 150 } }
            onClicked: coverDialog.open()
            background: Rectangle { radius: 6; color: parent.hovered ? "#0dffffff" : "transparent" }
            contentItem: RowLayout {
                spacing: 6
                AppIcon { name: "image"; color: parent.parent.hovered ? "#fffffe" : "#a7a9be"; width: 15; height: 15 }
                Label { text: qsTr("Adicionar capa"); color: parent.parent.hovered ? "#fffffe" : "#a7a9be"; font.pixelSize: 13; font.weight: Font.Medium }
            }
        }
    }

    NotesCoverDialog {
        id: coverDialog
        controller: coverRoot.controller
        pageId: coverRoot.pageId
        onCoverSelected: function(url) { coverRoot.errorMessage = ""; coverRoot.coverSaved(url) }
        onActionFailed: function(message) { coverRoot.reportError(message) }
    }
}
