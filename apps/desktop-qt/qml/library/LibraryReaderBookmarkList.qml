import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: bookmarkList
    spacing: 5

    property var bookmarks: []
    property bool busy: false
    property string editingId: ""
    property string editingLabel: ""

    signal jumpRequested(int pageNumber)
    signal editRequested(var bookmark)
    signal saveRequested(string id, string label)
    signal cancelRequested()
    signal deleteRequested(string id)

    Repeater {
        model: bookmarkList.bookmarks
        delegate: Rectangle {
            id: bookmarkCard
            property var bookmarkData: modelData
            Layout.fillWidth: true
            implicitHeight: 38
            radius: 7
            color: "#201f2c"

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 8
                anchors.rightMargin: 6
                spacing: 5

                Button {
                    Layout.fillWidth: true
                    visible: bookmarkList.editingId !== bookmarkCard.bookmarkData.id
                    text: (bookmarkCard.bookmarkData.label || "Página " + bookmarkCard.bookmarkData.page_number)
                          + "  ·  " + bookmarkCard.bookmarkData.page_number
                    Accessible.name: "Ir para página " + bookmarkCard.bookmarkData.page_number
                    onClicked: bookmarkList.jumpRequested(Number(bookmarkCard.bookmarkData.page_number))
                    background: Rectangle { color: "transparent" }
                    contentItem: Text {
                        text: parent.text
                        color: "#c4c5d4"
                        font.pixelSize: 11
                        elide: Text.ElideRight
                        verticalAlignment: Text.AlignVCenter
                    }
                }

                TextField {
                    Layout.fillWidth: true
                    visible: bookmarkList.editingId === bookmarkCard.bookmarkData.id
                    text: bookmarkList.editingId === bookmarkCard.bookmarkData.id ? bookmarkList.editingLabel : ""
                    selectByMouse: true
                    color: "#eeeeF4"
                    font.pixelSize: 11
                    background: Rectangle { color: "#111019"; border.color: "#3e315e"; radius: 6 }
                    onTextChanged: {
                        if (bookmarkList.editingId === bookmarkCard.bookmarkData.id) bookmarkList.editingLabel = text
                    }
                    Keys.onReturnPressed: bookmarkList.saveRequested(bookmarkCard.bookmarkData.id, bookmarkList.editingLabel)
                    Keys.onEscapePressed: bookmarkList.cancelRequested()
                }

                Button {
                    text: bookmarkList.editingId === bookmarkCard.bookmarkData.id ? "Salvar" : "Editar"
                    enabled: !bookmarkList.busy
                    Accessible.name: text + " marcador"
                    onClicked: bookmarkList.editingId === bookmarkCard.bookmarkData.id
                        ? bookmarkList.saveRequested(bookmarkCard.bookmarkData.id, bookmarkList.editingLabel)
                        : bookmarkList.editRequested(bookmarkCard.bookmarkData)
                    background: Rectangle { color: parent.text === "Salvar" ? "#3e315e" : "#282735"; radius: 6 }
                    contentItem: Text {
                        text: parent.text
                        color: "#c4b5fd"
                        font.pixelSize: 9
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                }

                Button {
                    visible: bookmarkList.editingId === bookmarkCard.bookmarkData.id
                    text: "Cancelar"
                    onClicked: bookmarkList.cancelRequested()
                    background: Rectangle { color: "transparent" }
                    contentItem: Text {
                        text: parent.text
                        color: "#a7a9be"
                        font.pixelSize: 9
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                }

                Button {
                    visible: bookmarkList.editingId !== bookmarkCard.bookmarkData.id
                    text: "Excluir"
                    enabled: !bookmarkList.busy
                    Accessible.name: "Excluir marcador da página " + bookmarkCard.bookmarkData.page_number
                    onClicked: bookmarkList.deleteRequested(bookmarkCard.bookmarkData.id)
                    background: Rectangle { color: "transparent" }
                    contentItem: Text {
                        text: parent.text
                        color: "#fb7185"
                        font.pixelSize: 9
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                }
            }
        }
    }

    Text {
        visible: bookmarkList.bookmarks.length === 0
        text: "Sem marcadores."
        color: "#767789"
        font.pixelSize: 11
    }
}
