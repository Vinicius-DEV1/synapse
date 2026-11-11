import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQml 2.15

ToolButton {
    id: moveMenu
    property var video: ({})
    property var folders: []
    text: "⋮"
    Accessible.name: "Ações do vídeo"
    signal moveRequested(var video, string folderId)
    signal deleteRequested(var video)
    signal infoRequested(var video)

    contentItem: Text {
        text: parent.text
        color: parent.hovered ? "#c4b5fd" : "#a7a9be"
        font.pixelSize: 18
        horizontalAlignment: Text.AlignHCenter
        verticalAlignment: Text.AlignVCenter
    }
    background: Rectangle { color: parent.hovered ? "#20ffffff" : "transparent"; radius: 6 }
    onClicked: moveOptions.open()

    Menu {
        id: moveOptions
        MenuItem {
            text: "Informações"
            onTriggered: moveMenu.infoRequested(moveMenu.video)
        }
        MenuSeparator {}
        MenuItem {
            text: "Raiz (sem pasta)"
            enabled: !!moveMenu.video.collection_id || !!moveMenu.video.collection_name
            onTriggered: moveMenu.moveRequested(moveMenu.video, "")
        }
        MenuSeparator { visible: moveMenu.folders.length > 0 }
        Instantiator {
            model: moveMenu.folders
            delegate: MenuItem {
                text: modelData.name
                enabled: modelData.id !== moveMenu.video.collection_id
                onTriggered: moveMenu.moveRequested(moveMenu.video, modelData.id)
            }
            onObjectAdded: function(index, object) { moveOptions.insertItem(index + 4, object) }
            onObjectRemoved: function(index, object) { moveOptions.removeItem(object) }
        }
        MenuSeparator {}
        MenuItem {
            text: "Excluir vídeo"
            onTriggered: moveMenu.deleteRequested(moveMenu.video)
        }
    }
}
