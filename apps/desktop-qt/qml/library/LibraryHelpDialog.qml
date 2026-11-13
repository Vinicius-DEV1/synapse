import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import ".."

Dialog {
    id: helpDialog
    modal: true
    anchors.centerIn: parent
    width: Math.min(parent.width - 32, 900)
    height: Math.min(parent.height - 32, 600)
    padding: 0
    closePolicy: Popup.CloseOnEscape
    standardButtons: Dialog.NoButton

    property bool isOpen: false
    property string activeSectionId: "overview"

    signal dismissRequested()

    readonly property var sections: [
        {
            id: "overview", label: "Getting started", title: "Library basics",
            summary: "Keep a local catalog of PDF and EPUB books, track progress, and open each title in the native reader.",
            tips: [
                "Use Import PDF/EPUB to choose one or more books from your computer.",
                "PDF imports generate an optimized first-page cover in the background when pdftoppm is available; the book still imports if cover rendering is unavailable.",
                "PDF title, author, and page count are filled from embedded document properties when available.",
                "EPUB imports use package title and author, count spine chapters, and extract EPUB 2 or EPUB 3 cover images when present.",
                "Select a book card to edit its page count and current reading position.",
                "Open a book card's actions menu and choose Edit book details to update its cover, title, author, publication information, status, or collections.",
                "Use the sparkle button in the book editor to search Open Library; only missing author, publisher, year, language, or cover fields are filled.",
                "Imported book files are protected with the Library key; unlock the vault before importing."
            ]
        },
        {
            id: "collections", label: "Collections", title: "Organize with collections",
            summary: "Collections group books without moving or deleting their files.",
            tips: [
                "Switch to Collections and select New Collection to create a group and choose its color.",
                "Open a collection card to see the books assigned to it; use its menu to edit or delete it.",
                "On a book card, open the actions menu and check or uncheck collections to assign the book."
            ]
        },
        {
            id: "search", label: "Search and status", title: "Find books quickly",
            summary: "Search by title or author, then narrow the shelf by reading status, format, author, or collection.",
            tips: [
                "The status filters show all books, books in progress, finished books, or books in the queue.",
                "Use the format filter tabs to view all formats, only PDF documents, or only EPUB titles.",
                "Filter by author using the author dropdown menu, which lists all unique authors across your books.",
                "Sort by last read, title A-Z, date added, or author; click the active sort option to toggle between ascending and descending order.",
                "Active search terms, status, format, author, and collection filters appear as badges with quick-remove buttons, or select Clear filters to reset all active filters at once.",
                "Use the collection view to browse groups, then choose All collections to return to the groups.",
                "Search updates the visible shelf as you type.",
                "Use the Archive button to switch between active and archived books; the book actions menu can change reading status or archive state.",
                "Select book checkboxes to use the bottom action bar for bulk status, archive, collection assignment, or confirmed removal."
            ]
        },
        {
            id: "reader", label: "PDF and EPUB reader", title: "Read and keep your place",
            summary: "The native reader opens supported local books and stores reading progress with the book record.",
            tips: [
                "Choose Continue reading from the book details to open the native reader.",
                "Use the reader's table of contents and page controls to move through a document.",
                "Search PDF text across pages or EPUB text across chapters with the reader's search button or Ctrl+F.",
                "The reader can save bookmarks and highlights for later review.",
                "Reading sessions are saved when the reader closes or the workspace locks. Open the statistics button to review reading time, pages, streaks, activity days, and books in progress."
            ]
        },
        {
            id: "annotations", label: "Bookmarks and highlights", title: "Save useful passages",
            summary: "Keep annotations attached to the book so they remain available when you return.",
            tips: [
                "Select text in the PDF reader to create a highlight and add a note.",
                "Use the reader sidebar to revisit bookmarks and highlights.",
                "Highlight colors and notes can be edited from the annotation panel."
            ]
        },
        {
            id: "keyboard", label: "Keyboard shortcuts", title: "Keyboard navigation",
            summary: "Use the desktop shortcuts to reach the library and dismiss this guide.",
            tips: [
                "Ctrl+8 switches to the Library module.",
                "In EPUB, use Left and Right to move between chapters when a text field or text selection is not focused. Ctrl+Left and Ctrl+Right also navigate in the reader.",
                "Ctrl+F opens reader search; Escape closes the reader when no dialog is open.",
                "Escape closes this guide.",
                "Use Tab and Enter to move through buttons and confirm actions."
            ]
        }
    ]

    function sectionForId(sectionId) {
        for (var index = 0; index < sections.length; ++index) {
            if (sections[index].id === sectionId) return sections[index]
        }
        return sections[0]
    }

    onIsOpenChanged: {
        if (isOpen) open()
        else close()
    }
    onOpened: activeSectionId = "overview"
    onClosed: helpDialog.dismissRequested()

    background: Rectangle { color: "#181720"; radius: 16; border.color: "#10ffffff" }

    header: Rectangle {
        implicitHeight: 72
        color: "#08ffffff"
        radius: 16
        Rectangle { anchors.bottom: parent.bottom; width: parent.width; height: 1; color: "#0cffffff" }
        RowLayout {
            anchors.fill: parent
            anchors.leftMargin: 20
            anchors.rightMargin: 12
            spacing: 12
            Rectangle {
                Layout.preferredWidth: 40
                Layout.preferredHeight: 40
                radius: 12
                color: "#1a8b5cf6"
                border.color: "#338b5cf6"
                AppIcon { anchors.centerIn: parent; width: 20; height: 20; name: "library"; color: "#c4b5fd" }
            }
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 2
                Label { text: "Library Guide"; color: "#f4f4f5"; font.pixelSize: 15; font.bold: true }
                Label { text: "Native reading and catalog features"; color: "#9293a5"; font.pixelSize: 11 }
            }
            ToolButton {
                text: "×"
                Accessible.name: "Close library guide"
                onClicked: helpDialog.close()
                contentItem: Label { text: parent.text; color: parent.hovered ? "white" : "#a7a9be"; font.pixelSize: 22; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                background: Rectangle { color: parent.hovered ? "#1affffff" : "transparent"; radius: 8 }
            }
        }
    }

    contentItem: RowLayout {
        spacing: 0
        ColumnLayout {
            Layout.preferredWidth: 220
            Layout.fillHeight: true
            Layout.margins: 12
            spacing: 4
            Repeater {
                model: helpDialog.sections
                delegate: Button {
                    required property var modelData
                    Layout.fillWidth: true
                    Layout.preferredHeight: 38
                    onClicked: helpDialog.activeSectionId = modelData.id
                    background: Rectangle {
                        radius: 9
                        color: helpDialog.activeSectionId === modelData.id ? "#268b5cf6" : (parent.hovered ? "#10ffffff" : "transparent")
                        border.color: helpDialog.activeSectionId === modelData.id ? "#408b5cf6" : "transparent"
                    }
                    contentItem: Text {
                        text: modelData.label
                        color: helpDialog.activeSectionId === modelData.id ? "#ddd6fe" : "#a7a9be"
                        font.pixelSize: 11
                        font.weight: helpDialog.activeSectionId === modelData.id ? Font.Medium : Font.Normal
                        horizontalAlignment: Text.AlignLeft
                        verticalAlignment: Text.AlignVCenter
                        leftPadding: 12
                    }
                }
            }
            Item { Layout.fillHeight: true }
        }

        Rectangle { Layout.fillHeight: true; width: 1; color: "#0cffffff" }

        ScrollView {
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true
            contentWidth: availableWidth
            ColumnLayout {
                width: parent.width
                Layout.margins: 24
                spacing: 14
                Label {
                    Layout.fillWidth: true
                    text: helpDialog.sectionForId(helpDialog.activeSectionId).title
                    color: "#f4f4f5"
                    font.pixelSize: 20
                    font.bold: true
                    wrapMode: Text.Wrap
                }
                Label {
                    Layout.fillWidth: true
                    text: helpDialog.sectionForId(helpDialog.activeSectionId).summary
                    color: "#a7a9be"
                    font.pixelSize: 12
                    wrapMode: Text.Wrap
                }
                Repeater {
                    model: helpDialog.sectionForId(helpDialog.activeSectionId).tips
                    delegate: Rectangle {
                        required property string modelData
                        Layout.fillWidth: true
                        implicitHeight: tipText.implicitHeight + 24
                        radius: 10
                        color: "#08ffffff"
                        border.color: "#0cffffff"
                        RowLayout {
                            anchors.fill: parent
                            anchors.margins: 12
                            spacing: 10
                            AppIcon { width: 15; height: 15; name: "plus"; color: "#a78bfa" }
                            Text {
                                id: tipText
                                Layout.fillWidth: true
                                text: modelData
                                color: "#d4d4dc"
                                font.pixelSize: 12
                                wrapMode: Text.Wrap
                            }
                        }
                    }
                }
            }
        }
    }
}
