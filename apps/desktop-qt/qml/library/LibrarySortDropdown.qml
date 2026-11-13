import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Item {
    id: sortDropdown
    objectName: "librarySortDropdown"
    implicitWidth: sortButton.implicitWidth
    implicitHeight: 32

    property string sortBy: "last_read" // "last_read", "title", "created", "author"
    property string sortOrder: "desc" // "asc", "desc"
    signal sortChanged(string key, string order)

    readonly property var sortOptions: [
        { key: "last_read", label: qsTr("Último lido") },
        { key: "title", label: qsTr("Título A-Z") },
        { key: "created", label: qsTr("Data de adição") },
        { key: "author", label: qsTr("Autor") }
    ]

    function currentLabel() {
        for (var i = 0; i < sortOptions.length; ++i) {
            if (sortOptions[i].key === sortBy) return sortOptions[i].label
        }
        return qsTr("Ordenar")
    }

    Button {
        id: sortButton
        objectName: "librarySortButton"
        anchors.fill: parent
        padding: 6
        leftPadding: 10
        rightPadding: 10
        hoverEnabled: true
        Accessible.name: qsTr("Sort books: %1").arg(sortDropdown.currentLabel())

        background: Rectangle {
            color: sortButton.down ? "#28253b" : sortButton.hovered ? "#211f30" : "#161524"
            radius: 8
            border.color: sortPopup.visible ? "#a78bfa" : "#1fffffff"
            border.width: 1
        }

        contentItem: RowLayout {
            spacing: 6
            Text {
                text: "⇅"
                color: "#a7a9be"
                font.pixelSize: 13
                font.bold: true
            }
            Text {
                text: sortDropdown.currentLabel()
                color: "#fffffe"
                font.pixelSize: 12
                font.weight: Font.Medium
            }
            Text {
                text: sortDropdown.sortOrder === "asc" ? "↑" : "↓"
                color: "#a78bfa"
                font.pixelSize: 11
                font.bold: true
            }
            Text {
                text: "▾"
                color: "#71717a"
                font.pixelSize: 10
            }
        }

        onClicked: {
            if (sortPopup.visible) sortPopup.close()
            else sortPopup.open()
        }
    }

    Popup {
        id: sortPopup
        objectName: "librarySortPopup"
        y: sortButton.height + 4
        width: 180
        padding: 4
        closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside

        background: Rectangle {
            color: "#161524"
            radius: 10
            border.color: "#2a283c"
            border.width: 1
        }

        contentItem: ColumnLayout {
            spacing: 2
            Repeater {
                model: sortDropdown.sortOptions
                delegate: Rectangle {
                    id: optionDelegate
                    required property var modelData
                    readonly property bool isSelected: sortDropdown.sortBy === modelData.key
                    objectName: "librarySortOption_" + modelData.key
                    Layout.fillWidth: true
                    Layout.preferredHeight: 32
                    radius: 6
                    color: itemMouse.containsMouse ? "#211f30" : isSelected ? "#207c3aed" : "transparent"

                    RowLayout {
                        anchors.fill: parent
                        anchors.leftMargin: 10
                        anchors.rightMargin: 10
                        spacing: 8
                        Text {
                            Layout.fillWidth: true
                            text: optionDelegate.modelData.label
                            color: optionDelegate.isSelected ? "#a78bfa" : itemMouse.containsMouse ? "#fffffe" : "#c4c5d4"
                            font.pixelSize: 12
                            font.weight: optionDelegate.isSelected ? Font.DemiBold : Font.Normal
                        }
                        Text {
                            visible: optionDelegate.isSelected
                            text: sortDropdown.sortOrder === "asc" ? "↑" : "↓"
                            color: "#a78bfa"
                            font.pixelSize: 11
                            font.bold: true
                        }
                    }

                    MouseArea {
                        id: itemMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            if (sortDropdown.sortBy === optionDelegate.modelData.key) {
                                var newOrder = sortDropdown.sortOrder === "asc" ? "desc" : "asc"
                                sortDropdown.sortChanged(optionDelegate.modelData.key, newOrder)
                            } else {
                                var defaultOrder = (optionDelegate.modelData.key === "title" || optionDelegate.modelData.key === "author") ? "asc" : "desc"
                                sortDropdown.sortChanged(optionDelegate.modelData.key, defaultOrder)
                            }
                            sortPopup.close()
                        }
                    }
                }
            }
        }
    }
}
