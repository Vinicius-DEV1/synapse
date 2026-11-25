import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

// Page cover mirroring apps/web-react/src/components/page-view/PageCover.tsx
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

    Theme { id: theme }

    function loadCoverPosition() {
        isRepositioning = false
        var fallbackPos = 50
        var rawCover = String(coverImage || "").trim()
        if (rawCover.charAt(0) === "{") {
            try {
                var parsed = JSON.parse(rawCover)
                if (parsed && parsed.position !== undefined && !isNaN(Number(parsed.position))) {
                    fallbackPos = Math.max(0, Math.min(100, Math.round(Number(parsed.position))))
                }
            } catch (e) {}
        }
        if (!controller || !pageId || typeof controller.getConfig !== "function") {
            coverPositionY = fallbackPos
            return
        }
        var raw = Number(controller.getConfig("note_cover_pos_" + pageId, String(fallbackPos)))
        coverPositionY = isNaN(raw) ? fallbackPos : Math.max(0, Math.min(100, Math.round(raw)))
    }

    onPageIdChanged: loadCoverPosition()
    Component.onCompleted: loadCoverPosition()

    function reportError(message) {
        errorMessage = message
        actionFailed(message)
    }

    function stableCoverUrl(url) {
        var clean = String(url || "").trim()
        if (!clean) return ""
        if (clean.indexOf("file://") === 0 || clean.indexOf("data:") === 0 ||
                clean.indexOf("qrc:") === 0 || clean.indexOf("http") === 0) return clean
        return "file://" + clean
    }

    Layout.fillWidth: true
    Layout.preferredHeight: hasCover ? 256 : 48
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
        sourceSize.width: Math.max(1, coverRoot.width)
        sourceSize.height: 256
    }

    // Bottom fade gradient blending smoothly into #0f0e17 canvas
    Rectangle {
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.bottom: parent.bottom
        height: 96
        visible: coverRoot.hasCover
        gradient: Gradient {
            GradientStop { position: 0.0; color: "transparent" }
            GradientStop { position: 0.55; color: "#4d0f0e17" }
            GradientStop { position: 1.0; color: "#0f0e17" }
        }
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
            color: theme.textDark
            font.pixelSize: 12
        }
    }

    HoverHandler { id: coverHover }

    // Floating top-right action pills (hover-revealed)
    Row {
        anchors.top: parent.top
        anchors.topMargin: coverRoot.hasCover ? 14 : 10
        anchors.right: parent.right
        anchors.rightMargin: 16
        spacing: 6
        z: 3
        opacity: (coverHover.hovered || coverRoot.isRepositioning || addCoverMouse.containsMouse || changeCoverMouse.containsMouse) ? 1.0 : 0.0
        Behavior on opacity { NumberAnimation { duration: 150 } }

        Rectangle {
            visible: !coverRoot.hasCover
            width: addCoverLbl.implicitWidth + 24
            height: 28
            radius: 8
            color: addCoverMouse.containsMouse ? "#cc1a1924" : "#9915141b"
            border.color: theme.borderCard
            Row {
                anchors.centerIn: parent
                spacing: 6
                AppIcon { name: "image"; color: theme.textSubtext; width: 13; height: 13; anchors.verticalCenter: parent.verticalCenter }
                Text { id: addCoverLbl; text: qsTr("Adicionar capa"); color: theme.textSubtext; font.pixelSize: 11; font.weight: Font.Medium }
            }
            MouseArea {
                id: addCoverMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: coverDialog.openCoverPicker()
            }
        }

        Rectangle {
            visible: coverRoot.hasCover
            width: changeCoverLbl.implicitWidth + 18
            height: 28
            radius: 8
            color: changeCoverMouse.containsMouse ? "#e61a1924" : "#b30f0e17"
            border.color: "#22ffffff"
            Text { id: changeCoverLbl; anchors.centerIn: parent; text: qsTr("Alterar capa"); color: theme.textDark; font.pixelSize: 11; font.weight: Font.Medium }
            MouseArea {
                id: changeCoverMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: coverDialog.openCoverPicker()
            }
        }

        Rectangle {
            visible: coverRoot.hasCover
            width: repoLbl.implicitWidth + 18
            height: 28
            radius: 8
            color: coverRoot.isRepositioning ? theme.brand600 : (repoMouse.containsMouse ? "#e61a1924" : "#b30f0e17")
            border.color: coverRoot.isRepositioning ? theme.brand400 : "#22ffffff"
            Text {
                id: repoLbl
                anchors.centerIn: parent
                text: coverRoot.isRepositioning ? qsTr("Salvar posição") : qsTr("Reposicionar")
                color: theme.textDark
                font.pixelSize: 11
                font.weight: Font.Medium
            }
            MouseArea {
                id: repoMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: {
                    if (coverRoot.isRepositioning) {
                        coverRoot.isRepositioning = false
                        if (coverRoot.controller && coverRoot.pageId && typeof coverRoot.controller.setConfig === "function") {
                            coverRoot.controller.setConfig("note_cover_pos_" + coverRoot.pageId, String(coverRoot.coverPositionY))
                        }
                    } else {
                        coverRoot.isRepositioning = true
                    }
                }
            }
        }

        Rectangle {
            visible: coverRoot.hasCover && !coverRoot.isRepositioning
            width: removeLbl.implicitWidth + 18
            height: 28
            radius: 8
            color: removeMouse.containsMouse ? "#4df43f5e" : "#b30f0e17"
            border.color: removeMouse.containsMouse ? "#80f43f5e" : "#22ffffff"
            Text { id: removeLbl; anchors.centerIn: parent; text: qsTr("Remover"); color: removeMouse.containsMouse ? "#fda4af" : theme.textDark; font.pixelSize: 11; font.weight: Font.Medium }
            MouseArea {
                id: removeMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: {
                    if (coverRoot.controller && coverRoot.controller.updatePageCover(coverRoot.pageId, "")) {
                        coverRoot.coverSaved("")
                    } else {
                        coverRoot.reportError(qsTr("Não foi possível remover a capa."))
                    }
                }
            }
        }
    }

    PageCoverDialog {
        id: coverDialog
        controller: coverRoot.controller
        pageId: coverRoot.pageId
        currentCover: coverRoot.coverImage
        onCoverSaved: function(url) { coverRoot.coverSaved(url) }
        onErrorOccurred: function(msg) { coverRoot.reportError(msg) }
    }
}
