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
    readonly property bool hasCover: coverImage.trim().length > 0

    signal coverSaved(string url)
    signal actionFailed(string message)

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
        anchors.fill: parent
        visible: coverRoot.hasCover
        source: coverRoot.stableCoverUrl(coverRoot.coverImage)
        asynchronous: true
        cache: true
        fillMode: Image.PreserveAspectCrop
        sourceSize.width: width
        sourceSize.height: height
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
        visible: coverRoot.hasCover
        opacity: coverHover.hovered || changeCoverButton.activeFocus || coverActions.activeFocus ? 1 : 0
        Behavior on opacity { NumberAnimation { duration: 150 } }

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
        height: 104
        visible: !coverRoot.hasCover

        Button {
            anchors.left: parent.left
            anchors.leftMargin: 48
            anchors.bottom: parent.bottom
            anchors.bottomMargin: 8
            text: qsTr("Add cover")
            opacity: coverHover.hovered || activeFocus ? 1 : 0
            Behavior on opacity { NumberAnimation { duration: 150 } }
            onClicked: coverDialog.open()
            background: Rectangle { radius: 6; color: parent.hovered ? "#0dffffff" : "transparent" }
            contentItem: RowLayout {
                spacing: 6
                AppIcon { name: "image"; color: "#a7a9be" }
                Label { text: parent.parent.text; color: parent.parent.hovered ? "#fffffe" : "#a7a9be"; font.pixelSize: 13; font.weight: Font.Medium }
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
