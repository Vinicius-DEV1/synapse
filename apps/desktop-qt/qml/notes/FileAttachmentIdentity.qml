pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Layouts 1.15
import "../ui"

RowLayout {
    id: identityRoot
    property string fileName: ""
    property string fileType: "other"
    property bool isMissing: false
    property bool isRenaming: false
    property bool pointerHovered: false

    signal previewRequested()
    signal renameRequested()

    Layout.fillWidth: !isRenaming
    Layout.rightMargin: isRenaming ? 4 : 0
    spacing: 12

    function iconName() {
        if (isMissing) return "alert"
        if (fileType === "pdf" || fileType === "document" || fileType === "doc") return "file-text"
        if (fileType.indexOf("image") >= 0 || fileType === "png" || fileType === "jpg") return "image"
        if (fileType.indexOf("video") >= 0 || fileType === "mp4") return "film"
        if (fileType === "folder") return "folder"
        return "files"
    }

    function iconColor() {
        if (isMissing) return "#f87171"
        if (fileType === "pdf" || fileType === "document" || fileType === "doc") return "#60a5fa"
        if (fileType.indexOf("image") >= 0 || fileType === "png" || fileType === "jpg") return "#4ade80"
        if (fileType.indexOf("video") >= 0 || fileType === "mp4") return "#c084fc"
        if (fileType === "folder") return "#facc15"
        return "#a78bfa"
    }

    Rectangle {
        Layout.preferredWidth: 32
        Layout.preferredHeight: 32
        radius: 8
        color: "#0f0e17"
        border.color: "#0dffffff"
        border.width: 1
        AppIcon {
            anchors.centerIn: parent
            name: identityRoot.iconName()
            color: identityRoot.iconColor()
            width: 16
            height: 16
        }
    }

    Text {
        visible: !identityRoot.isRenaming
        Layout.fillWidth: true
        text: identityRoot.fileName + (identityRoot.isMissing ? qsTr(" (Excluído)") : "")
        color: identityRoot.isMissing ? "#f87171" : (identityRoot.pointerHovered ? "#ffffff" : "#fffffe")
        font.pixelSize: 13
        font.weight: Font.Medium
        wrapMode: Text.WordWrap

        MouseArea {
            anchors.fill: parent
            cursorShape: Qt.PointingHandCursor
            onClicked: identityRoot.previewRequested()
            onDoubleClicked: {
                if (!identityRoot.isMissing) identityRoot.renameRequested()
            }
        }
    }
}
