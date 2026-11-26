import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Item {
    id: controlRoot
    objectName: "notesFileBookmarksControl"

    property var bookmarks: []
    property string bookmarkDraft: ""
    property string editingBookmarkId: ""
    property string editingBookmarkLabel: ""

    signal bookmarkDraftChangedByUser(string value)
    signal addRequested()
    signal jumpRequested(var bookmark)
    signal editRequested(string id, string label)
    signal saveRequested(string id, string label)
    signal removeRequested(string id)

    function closePopup() { bookmarkPopup.close() }

    ToolButton {
        id: bookmarkButton
        objectName: "notesFileReadingBookmarksButton"
        anchors.left: parent.left
        anchors.bottom: parent.bottom
        anchors.leftMargin: 24
        anchors.bottomMargin: 22
        text: controlRoot.bookmarks.length > 0
              ? qsTr("Marcadores (%1)").arg(controlRoot.bookmarks.length)
              : qsTr("Marcadores")
        Accessible.name: qsTr("Marcadores de leitura, %1 salvos").arg(controlRoot.bookmarks.length)
        onClicked: bookmarkPopup.open()
        ToolTip.visible: hovered
        ToolTip.text: qsTr("Marcadores de leitura")
        background: Rectangle {
            radius: 9
            color: bookmarkButton.hovered ? "#1affffff" : "#e61a1924"
            border.color: controlRoot.bookmarks.length > 0 ? "#668b5cf6" : "#33ffffff"
        }
        contentItem: Text {
            text: bookmarkButton.text
            color: controlRoot.bookmarks.length > 0 ? "#fbbf24" : "#e4e4e7"
            font.pixelSize: 11
            font.weight: Font.Medium
            horizontalAlignment: Text.AlignHCenter
            verticalAlignment: Text.AlignVCenter
            leftPadding: 6
            rightPadding: 6
        }
    }

    Popup {
        id: bookmarkPopup
        objectName: "notesFileReadingBookmarksPopup"
        parent: Overlay.overlay
        x: Math.max(16, Math.min(controlRoot.width - width - 20, bookmarkButton.x))
        y: Math.max(16, controlRoot.height - height - 72)
        width: Math.min(340, controlRoot.width - 32)
        height: Math.min(390, controlRoot.height - 32)
        modal: true
        focus: true
        closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside
        padding: 14
        background: Rectangle { color: "#f21a1924"; radius: 12; border.color: "#22ffffff" }

        contentItem: ColumnLayout {
            spacing: 10
            RowLayout {
                Layout.fillWidth: true
                Label { Layout.fillWidth: true; text: qsTr("Marcadores salvos"); color: "#fffffe"; font.pixelSize: 13; font.weight: Font.DemiBold }
                Label { text: qsTr("%1 salvos").arg(controlRoot.bookmarks.length); color: "#a7a9be"; font.pixelSize: 10 }
            }
            RowLayout {
                Layout.fillWidth: true
                TextField {
                    objectName: "notesFileNewBookmarkField"
                    Layout.fillWidth: true
                    placeholderText: qsTr("Nome do marcador...")
                    Accessible.name: qsTr("Nome do novo marcador")
                    text: controlRoot.bookmarkDraft
                    onTextChanged: controlRoot.bookmarkDraftChangedByUser(text)
                    onAccepted: controlRoot.addRequested()
                }
                Button {
                    objectName: "notesFileAddBookmarkButton"
                    text: qsTr("Adicionar")
                    Accessible.name: qsTr("Adicionar marcador nesta posição")
                    onClicked: controlRoot.addRequested()
                }
            }
            ListView {
                Layout.fillWidth: true
                Layout.fillHeight: true
                clip: true
                spacing: 4
                model: controlRoot.bookmarks
                delegate: Rectangle {
                    id: bookmarkRow
                    required property var modelData
                    property var bookmarkData: modelData
                    width: ListView.view.width
                    height: Math.max(44, bookmarkRowLayout.implicitHeight + 8)
                    radius: 8
                    color: bookmarkMouse.containsMouse ? "#1affffff" : "#0dffffff"

                    MouseArea {
                        id: bookmarkMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        onClicked: controlRoot.jumpRequested(bookmarkRow.bookmarkData)
                    }
                    RowLayout {
                        id: bookmarkRowLayout
                        anchors.fill: parent
                        anchors.margins: 6
                        spacing: 4
                        TextField {
                            id: bookmarkEditField
                            objectName: "notesFileBookmarkEditField"
                            visible: controlRoot.editingBookmarkId === bookmarkRow.bookmarkData.id
                            Layout.fillWidth: true
                            Accessible.name: qsTr("Nome do marcador")
                            text: visible ? controlRoot.editingBookmarkLabel : ""
                            onTextChanged: if (visible) controlRoot.editRequested(bookmarkRow.bookmarkData.id, text)
                            onAccepted: controlRoot.saveRequested(bookmarkRow.bookmarkData.id, text)
                        }
                        Label {
                            visible: controlRoot.editingBookmarkId !== bookmarkRow.bookmarkData.id
                            Layout.fillWidth: true
                            text: String(bookmarkRow.bookmarkData.label || qsTr("Marcador"))
                            color: "#fffffe"
                            font.pixelSize: 11
                            elide: Text.ElideRight
                        }
                        Button {
                            objectName: "notesFileBookmarkEditButton"
                            text: controlRoot.editingBookmarkId === bookmarkRow.bookmarkData.id ? qsTr("Salvar") : qsTr("Editar")
                            Accessible.name: controlRoot.editingBookmarkId === bookmarkRow.bookmarkData.id
                                ? qsTr("Salvar nome do marcador")
                                : qsTr("Editar nome do marcador %1").arg(bookmarkRow.bookmarkData.label || "")
                            onClicked: {
                                if (controlRoot.editingBookmarkId === bookmarkRow.bookmarkData.id)
                                    controlRoot.saveRequested(bookmarkRow.bookmarkData.id, controlRoot.editingBookmarkLabel)
                                else {
                                    controlRoot.editRequested(bookmarkRow.bookmarkData.id, bookmarkRow.bookmarkData.label)
                                    bookmarkEditField.forceActiveFocus()
                                    bookmarkEditField.selectAll()
                                }
                            }
                        }
                        Button {
                            text: qsTr("Remover")
                            Accessible.name: qsTr("Remover marcador %1").arg(bookmarkRow.bookmarkData.label || "")
                            onClicked: controlRoot.removeRequested(bookmarkRow.bookmarkData.id)
                        }
                    }
                }
                Label {
                    anchors.centerIn: parent
                    visible: controlRoot.bookmarks.length === 0
                    text: qsTr("Nenhum marcador salvo ainda.")
                    color: "#a7a9be"
                    font.pixelSize: 11
                }
            }
        }
    }
}
