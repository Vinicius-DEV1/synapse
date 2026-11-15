import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: toolbar
    Layout.fillWidth: true
    Layout.preferredHeight: 64
    radius: 12
    color: "#171620"
    border.color: "#12ffffff"

    property var book: null
    property int currentPage: 1
    property int totalPages: 0
    property string format: ""
    property bool busy: false

    signal backRequested()
    signal previousRequested()
    signal nextRequested()
    signal searchRequested()
    signal typographyRequested()
    signal bookmarkRequested()

    RowLayout {
        anchors.fill: parent
        anchors.leftMargin: 16
        anchors.rightMargin: 16
        spacing: 12

        Button {
            text: "‹ Biblioteca"
            onClicked: toolbar.backRequested()
            background: Rectangle { color: "#242331"; radius: 8; border.color: "#18ffffff" }
            contentItem: Text { text: parent.text; color: "#d4d4dc"; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
        }

        ColumnLayout {
            Layout.fillWidth: true
            spacing: 2
            Text {
                Layout.fillWidth: true
                text: toolbar.book ? toolbar.book.title : "Leitor nativo"
                color: "#fffffe"
                font.pixelSize: 15
                font.bold: true
                elide: Text.ElideRight
            }
            Text {
                text: toolbar.book ? (toolbar.book.author || "Autor desconhecido") : ""
                color: "#9293a5"
                font.pixelSize: 11
                elide: Text.ElideRight
            }
        }

        Text { text: toolbar.format.toUpperCase(); color: "#a78bfa"; font.pixelSize: 11; font.bold: true }

        Button {
            text: "◀"
            enabled: !toolbar.busy && toolbar.currentPage > 1
            onClicked: toolbar.previousRequested()
            background: Rectangle { color: parent.enabled ? "#242331" : "#191823"; radius: 7 }
            contentItem: Text { text: parent.text; color: parent.enabled ? "#d4d4dc" : "#595968"; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
        }

        Text {
            text: toolbar.totalPages > 0 ? toolbar.currentPage + " / " + toolbar.totalPages : "—"
            color: "#c4c5d4"
            font.pixelSize: 12
            Layout.minimumWidth: 54
            horizontalAlignment: Text.AlignHCenter
        }

        Button {
            text: "▶"
            enabled: !toolbar.busy && toolbar.currentPage < toolbar.totalPages
            onClicked: toolbar.nextRequested()
            background: Rectangle { color: parent.enabled ? "#242331" : "#191823"; radius: 7 }
            contentItem: Text { text: parent.text; color: parent.enabled ? "#d4d4dc" : "#595968"; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
        }

        Button {
            text: "⌕"
            Accessible.name: "Search in book"
            ToolTip.visible: hovered
            ToolTip.text: "Find in book"
            enabled: !toolbar.busy && toolbar.totalPages > 0
            onClicked: toolbar.searchRequested()
            background: Rectangle { color: parent.enabled ? "#242331" : "#191823"; radius: 7 }
            contentItem: Text { text: parent.text; color: parent.enabled ? "#d4d4dc" : "#595968"; font.pixelSize: 18; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
        }

        Button {
            text: "Aa"
            Accessible.name: "Tipografia e tema"
            ToolTip.visible: hovered
            ToolTip.text: "Tipografia e tema"
            enabled: !toolbar.busy && toolbar.totalPages > 0
            onClicked: toolbar.typographyRequested()
            background: Rectangle { color: parent.enabled ? "#242331" : "#191823"; radius: 7 }
            contentItem: Text { text: parent.text; color: parent.enabled ? "#a78bfa" : "#595968"; font.pixelSize: 14; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
        }

        Button {
            text: "Salvar marcador"
            enabled: !toolbar.busy && toolbar.totalPages > 0
            onClicked: toolbar.bookmarkRequested()
            background: Rectangle { color: "#3e315e"; radius: 8; border.color: "#378b5cf6" }
            contentItem: Text { text: parent.text; color: "#ddd6fe"; font.pixelSize: 11; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
        }
    }
}
