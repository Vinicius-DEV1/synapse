import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: searchSection
    objectName: "notesMediaWidgetSearchSection"

    property string mode: ""
    property string searchFilter: ""
    readonly property bool mediaMode: mode === "video" || mode === "livro"
    property alias inputField: mediaSearchField

    signal searchFilterEdited(string value)

    visible: mode === "file-select" || mediaMode
    Layout.fillWidth: true
    Layout.preferredHeight: mediaMode ? 68 : 36
    color: mediaMode ? "#08ffffff" : "transparent"

    Rectangle {
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.bottom: parent.bottom
        height: searchSection.mediaMode ? 1 : 0
        color: "#0dffffff"
    }

    TextField {
        id: mediaSearchField
        objectName: "notesMediaWidgetSearchField"
        anchors.fill: parent
        anchors.margins: searchSection.mediaMode ? 16 : 0
        text: searchSection.searchFilter
        placeholderText: searchSection.mode === "file-select" ? qsTr("Buscar arquivos...") : qsTr("Buscar...")
        color: "#fffffe"
        font.pixelSize: searchSection.mediaMode ? 14 : 12
        leftPadding: searchSection.mediaMode ? 34 : 12
        onTextEdited: searchSection.searchFilterEdited(text)
        background: Rectangle {
            radius: 8
            color: "#0f0e17"
            border.color: searchSection.mediaMode ? "#1affffff" : "#2e2e38"
            AppIcon {
                anchors.left: parent.left
                anchors.leftMargin: 10
                anchors.verticalCenter: parent.verticalCenter
                visible: searchSection.mediaMode
                name: "search"
                color: "#a7a9be"
                width: 16
                height: 16
            }
        }
        Accessible.name: searchSection.mode === "file-select"
            ? qsTr("Buscar arquivos") : qsTr("Buscar mídia")
    }
}
