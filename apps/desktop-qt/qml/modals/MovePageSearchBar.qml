import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: searchBar
    objectName: "movePageModalSearchBar"
    property string query: ""
    signal queryEdited(string value)
    signal submitRequested()

    function focusInput() {
        searchInput.forceActiveFocus()
    }

    implicitHeight: 56
    color: "#03ffffff"

    RowLayout {
        anchors.fill: parent
        anchors.leftMargin: 12
        anchors.rightMargin: 12
        spacing: 8

        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 36
            radius: 10
            color: "#0dffffff"
            border.width: searchInput.activeFocus ? 1 : 0
            border.color: "#8b5cf6"

            AppIcon {
                anchors.left: parent.left
                anchors.leftMargin: 10
                anchors.verticalCenter: parent.verticalCenter
                name: "search"
                color: "#a1a1aa"
                width: 15
                height: 15
            }

            TextField {
                id: searchInput
                objectName: "movePageSearchField"
                anchors.fill: parent
                anchors.leftMargin: 32
                anchors.rightMargin: searchBar.query.length > 0 ? 34 : 8
                text: searchBar.query
                placeholderText: qsTr("Buscar página de destino pelo nome ou caminho...")
                selectByMouse: true
                color: "#ffffff"
                font.pixelSize: 12
                background: null
                onTextChanged: searchBar.queryEdited(text)
                Keys.onReturnPressed: (event) => {
                    searchBar.submitRequested()
                    event.accepted = true
                }
            }

            ToolButton {
                id: clearButton
                objectName: "movePageSearchClearButton"
                visible: searchBar.query.length > 0
                anchors.right: parent.right
                anchors.rightMargin: 2
                anchors.verticalCenter: parent.verticalCenter
                width: 28
                height: 28
                Accessible.name: qsTr("Limpar busca")
                onClicked: {
                    searchBar.queryEdited("")
                    searchInput.forceActiveFocus()
                }
                contentItem: AppIcon {
                    name: "close"
                    color: clearButton.hovered ? "#ffffff" : "#a1a1aa"
                    width: 13
                    height: 13
                }
                background: null
            }
        }
    }

    Rectangle {
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.bottom: parent.bottom
        height: 1
        color: "#ffffff"
        opacity: 0.05
    }
}
