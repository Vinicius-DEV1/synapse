import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import ".."

Rectangle {
    id: folderCard
    radius: 12
    color: folderMouse.containsMouse ? "#1affffff" : "#0dffffff"
    border.color: isCreateCard ? "#33818cf8" : "#0fffffff"
    border.width: 1
    clip: true
    transform: Translate {
        y: folderMouse.containsMouse && folderCard.viewMode === "grid" && !folderCard.isCreateCard ? -4 : 0
        Behavior on y { NumberAnimation { duration: 150; easing.type: Easing.OutQuad } }
    }

    property bool isCreateCard: false
    property var folder: ({})
    property int videoCount: 0
    property string viewMode: "grid"
    readonly property bool compact: viewMode === "compact"
    readonly property bool isList: viewMode !== "grid"

    signal selected(string folderId, string folderName)
    signal createRequested()
    signal renameRequested(string folderId, string folderName)
    signal deleteRequested(string folderId, string folderName)

    MouseArea {
        id: folderMouse
        anchors.fill: parent
        z: -1
        hoverEnabled: true
        cursorShape: Qt.PointingHandCursor
        onClicked: {
            if (folderCard.isCreateCard) folderCard.createRequested()
            else folderCard.selected(folderCard.folder.id, folderCard.folder.name)
        }
    }

    ColumnLayout {
        anchors.fill: parent
        visible: folderCard.viewMode === "grid"
        spacing: 0

        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: Math.round(folderCard.width * 0.5625)
            gradient: Gradient {
                GradientStop { position: 0.0; color: folderCard.isCreateCard ? "#15141b" : "#664c1d95" }
                GradientStop { position: 1.0; color: folderCard.isCreateCard ? "#15141b" : "#1a8b5cf6" }
            }

            AppIcon {
                anchors.centerIn: parent
                width: 32
                height: 32
                name: folderCard.isCreateCard ? "plus" : "folder"
                color: folderCard.isCreateCard ? "#a7a9be" : "#a78bfa"
            }
            Rectangle {
                anchors.bottom: parent.bottom
                anchors.right: parent.right
                anchors.margins: 8
                width: countText.contentWidth + 12
                height: 20
                radius: 4
                color: "#b3000000"
                visible: !folderCard.isCreateCard
                Text {
                    id: countText
                    anchors.centerIn: parent
                    text: folderCard.videoCount + (folderCard.videoCount === 1 ? " vídeo" : " vídeos")
                    color: "#fffffe"
                    font.pixelSize: 10
                }
            }
        }

        RowLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            Layout.margins: 12
            spacing: 8
            Text {
                Layout.fillWidth: true
                text: folderCard.isCreateCard ? "Nova pasta" : folderCard.folder.name
                color: folderCard.isCreateCard ? "#a7a9be" : (folderMouse.containsMouse ? "#c4b5fd" : "#fffffe")
                font.pixelSize: folderCard.isList ? 14 : 12
                font.weight: folderCard.isCreateCard ? Font.Normal : Font.Medium
                elide: Text.ElideRight
            }
            ToolButton {
                visible: !folderCard.isCreateCard
                text: "⋮"
                Accessible.name: "Ações da pasta " + folderCard.folder.name
                onClicked: folderMenu.open()
                contentItem: Text { text: parent.text; color: "#a7a9be"; font.pixelSize: 16; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                background: Rectangle { color: parent.hovered ? "#20ffffff" : "transparent"; radius: 6 }
                Menu {
                    id: folderMenu
                    MenuItem { text: "Renomear pasta"; onTriggered: folderCard.renameRequested(folderCard.folder.id, folderCard.folder.name) }
                    MenuItem { text: "Excluir pasta"; onTriggered: folderCard.deleteRequested(folderCard.folder.id, folderCard.folder.name) }
                }
            }
        }
    }

    RowLayout {
        anchors.fill: parent
        anchors.margins: folderCard.compact ? 8 : 10
        visible: folderCard.isList
        spacing: 10

        Rectangle {
            visible: !folderCard.compact
            Layout.preferredWidth: 160
            Layout.fillHeight: true
            radius: 8
            color: "#402b1450"
            AppIcon { anchors.centerIn: parent; width: 20; height: 20; name: folderCard.isCreateCard ? "plus" : "folder"; color: "#a78bfa" }
        }
        Text {
            visible: folderCard.compact
            text: folderCard.isCreateCard ? "＋" : "📁"
            color: "#c4b5fd"
            font.pixelSize: 16
        }
        ColumnLayout {
            Layout.fillWidth: true
            spacing: 4
            Text {
                Layout.fillWidth: true
                text: folderCard.isCreateCard ? "Nova pasta" : folderCard.folder.name
                color: folderCard.isCreateCard ? "#a7a9be" : "#fffffe"
                font.pixelSize: folderCard.compact ? 12 : (folderCard.isList ? 14 : 12)
                font.weight: folderCard.isCreateCard ? Font.Normal : Font.Medium
                elide: Text.ElideRight
            }
            Text {
                visible: !folderCard.compact && !folderCard.isCreateCard
                text: folderCard.videoCount + (folderCard.videoCount === 1 ? " vídeo" : " vídeos")
                color: "#a7a9be"
                font.pixelSize: 10
            }
        }
        Text {
            visible: folderCard.compact && !folderCard.isCreateCard
            text: folderCard.videoCount
            color: "#a7a9be"
            font.pixelSize: 10
        }
        ToolButton {
            visible: !folderCard.isCreateCard
            text: "⋮"
            Accessible.name: "Ações da pasta " + folderCard.folder.name
            onClicked: folderMenuList.open()
            contentItem: Text { text: parent.text; color: "#a7a9be"; font.pixelSize: 16; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            background: Rectangle { color: parent.hovered ? "#20ffffff" : "transparent"; radius: 6 }
            Menu {
                id: folderMenuList
                MenuItem { text: "Renomear pasta"; onTriggered: folderCard.renameRequested(folderCard.folder.id, folderCard.folder.name) }
                MenuItem { text: "Excluir pasta"; onTriggered: folderCard.deleteRequested(folderCard.folder.id, folderCard.folder.name) }
            }
        }
    }
}
