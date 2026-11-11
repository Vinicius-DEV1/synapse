import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Dialog {
    id: searchDialog
    modal: true
    anchors.centerIn: parent
    width: Math.min(parent.width - 32, 640)
    height: Math.min(parent.height - 32, 560)
    padding: 0
    closePolicy: Popup.CloseOnEscape
    standardButtons: Dialog.NoButton

    property var controller: null
    property string temporaryPath: ""
    property string format: ""
    property string query: ""
    property int requestId: 0
    property bool isSearching: false
    property var results: []
    property int totalMatches: 0
    property bool truncated: false
    property string errorMessage: ""

    signal jumpRequested(int pageNumber)

    function openFor(path, bookFormat) {
        requestId += 1
        temporaryPath = path
        format = bookFormat
        query = ""
        results = []
        totalMatches = 0
        truncated = false
        errorMessage = ""
        isSearching = false
        open()
    }

    function search() {
        if (isSearching || !controller || !temporaryPath || query.trim().length === 0) return
        if (controller.librarySearchRunning) {
            errorMessage = "The previous search is still stopping. Try again in a moment."
            return
        }
        requestId += 1
        isSearching = true
        results = []
        totalMatches = 0
        truncated = false
        errorMessage = ""
        controller.searchLibraryBookText(temporaryPath, format, query, requestId)
    }

    onOpened: searchField.forceActiveFocus()
    onClosed: {
        if (isSearching && controller) controller.cancelLibraryBookSearch(requestId)
        isSearching = false
        requestId += 1
    }

    background: Rectangle { color: "#181720"; radius: 16; border.color: "#10ffffff" }

    header: Rectangle {
        implicitHeight: 64
        color: "#08ffffff"
        radius: 16
        Rectangle { anchors.bottom: parent.bottom; width: parent.width; height: 1; color: "#0cffffff" }
        RowLayout {
            anchors.fill: parent
            anchors.leftMargin: 20
            anchors.rightMargin: 12
            spacing: 10
            Label {
                Layout.fillWidth: true
                text: "Find in book"
                color: "#f4f4f5"
                font.pixelSize: 15
                font.bold: true
            }
            ToolButton {
                text: "×"
                Accessible.name: "Close book search"
                onClicked: searchDialog.close()
                contentItem: Text { text: parent.text; color: "#a7a9be"; font.pixelSize: 22; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
        }
    }

    contentItem: ColumnLayout {
        spacing: 10
        RowLayout {
            Layout.fillWidth: true
            spacing: 8
            TextField {
                id: searchField
                Layout.fillWidth: true
                text: searchDialog.query
                onTextChanged: searchDialog.query = text
                maximumLength: 256
                placeholderText: "Search text in this book"
                selectByMouse: true
                onAccepted: searchDialog.search()
            }
            Button {
                text: searchDialog.isSearching ? "Searching…"
                    : searchDialog.controller && searchDialog.controller.librarySearchRunning ? "Finishing…" : "Search"
                enabled: !searchDialog.isSearching &&
                         !(searchDialog.controller && searchDialog.controller.librarySearchRunning) &&
                         searchDialog.query.trim().length > 0
                onClicked: searchDialog.search()
            }
        }
        Label {
            visible: searchDialog.errorMessage.length > 0
            Layout.fillWidth: true
            text: searchDialog.errorMessage
            color: "#fda4af"
            font.pixelSize: 11
            wrapMode: Text.Wrap
        }
        Label {
            visible: !searchDialog.isSearching && searchDialog.errorMessage.length === 0 && searchDialog.totalMatches > 0
            Layout.fillWidth: true
            text: searchDialog.truncated
                ? "Showing the first %1 of %2 matches.".arg(searchDialog.results.length).arg(searchDialog.totalMatches)
                : "%1 match(es) found.".arg(searchDialog.totalMatches)
            color: "#9293a5"
            font.pixelSize: 10
        }
        Label {
            visible: !searchDialog.isSearching && searchDialog.errorMessage.length === 0 &&
                     searchDialog.query.trim().length > 0 && searchDialog.results.length === 0
            Layout.fillWidth: true
            text: "No matches were found in the searchable text. Scanned PDF pages without a text layer require OCR."
            color: "#9293a5"
            font.pixelSize: 11
            wrapMode: Text.Wrap
        }
        BusyIndicator {
            Layout.alignment: Qt.AlignHCenter
            running: searchDialog.isSearching || Boolean(searchDialog.controller && searchDialog.controller.librarySearchRunning)
            visible: running
        }
        ListView {
            id: resultsList
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true
            spacing: 6
            model: searchDialog.results
            delegate: ItemDelegate {
                required property var modelData
                width: resultsList.width
                height: resultContent.implicitHeight + 16
                onClicked: {
                    searchDialog.jumpRequested(Number(modelData.pageNumber))
                    searchDialog.close()
                }
                background: Rectangle {
                    radius: 8
                    color: parent.hovered ? "#242331" : "#12111a"
                    border.color: "#12ffffff"
                }
                contentItem: ColumnLayout {
                    id: resultContent
                    spacing: 4
                    Label { text: modelData.pageTitle || ("Page " + modelData.pageNumber); color: "#c4b5fd"; font.pixelSize: 10; font.bold: true }
                    Label { Layout.fillWidth: true; text: modelData.snippet || ""; color: "#e4e4e7"; font.pixelSize: 11; wrapMode: Text.Wrap; maximumLineCount: 3; elide: Text.ElideRight }
                }
            }
        }
    }
}
