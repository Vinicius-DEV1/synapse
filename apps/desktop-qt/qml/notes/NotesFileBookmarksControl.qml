import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

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
        anchors.top: parent.top
        anchors.right: parent.right
        anchors.topMargin: 34
        anchors.rightMargin: 112
        width: 34
        height: 34
        Accessible.name: qsTr("Marcadores de leitura, %1 salvos").arg(controlRoot.bookmarks.length)
        onClicked: bookmarkPopup.open()
        ToolTip.visible: hovered
        ToolTip.text: qsTr("Marcadores de leitura")
        background: Rectangle {
            radius: 9
            color: bookmarkButton.hovered || controlRoot.bookmarks.length > 0 ? "#1af59e0b" : "transparent"
            border.color: bookmarkButton.hovered ? "#33ffffff" : "transparent"
        }
        contentItem: AppIcon {
            width: 18
            height: 18
            name: "bookmark"
            color: controlRoot.bookmarks.length > 0 ? "#fbbf24" : "#a1a1aa"
        }
        Rectangle {
            objectName: "notesFileReadingBookmarkCount"
            visible: controlRoot.bookmarks.length > 0
            anchors.top: parent.top
            anchors.right: parent.right
            width: 16
            height: 16
            radius: 8
            color: "#f59e0b"
            Text {
                objectName: "notesFileReadingBookmarkCountText"
                anchors.centerIn: parent
                text: controlRoot.bookmarks.length > 99 ? "99+" : String(controlRoot.bookmarks.length)
                color: "#18181b"
                font.pixelSize: controlRoot.bookmarks.length > 99 ? 7 : 9
                font.bold: true
            }
        }
    }

    Popup {
        id: bookmarkPopup
        objectName: "notesFileReadingBookmarksPopup"
        parent: Overlay.overlay
        x: Math.max(16, Math.min(controlRoot.width - width - 16,
                                 bookmarkButton.x + bookmarkButton.width - width))
        y: Math.max(16, Math.min(controlRoot.height - height - 16,
                                 bookmarkButton.y + bookmarkButton.height + 8))
        width: Math.min(288, controlRoot.width - 32)
        height: Math.min(360, controlRoot.height - 32)
        modal: false
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
                        ColumnLayout {
                            visible: controlRoot.editingBookmarkId !== bookmarkRow.bookmarkData.id
                            Layout.fillWidth: true
                            spacing: 2
                            Label {
                                Layout.fillWidth: true
                                text: String(bookmarkRow.bookmarkData.label || qsTr("Marcador"))
                                color: "#fffffe"
                                font.pixelSize: 11
                                elide: Text.ElideRight
                            }
                            Label {
                                visible: String(bookmarkRow.bookmarkData.createdAt || "").length > 0
                                text: {
                                    var date = new Date(String(bookmarkRow.bookmarkData.createdAt || ""))
                                    return isNaN(date.getTime()) ? ""
                                        : Qt.formatDate(date, Qt.locale().dateFormat(Locale.ShortFormat))
                                }
                                color: "#71717a"
                                font.pixelSize: 9
                            }
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
