import QtQuick 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: activeFiltersBar
    objectName: "libraryActiveFiltersBar"
    Layout.fillWidth: true
    implicitHeight: 38
    color: "#0cffffff"
    radius: 8
    border.color: "#12ffffff"
    border.width: 1
    visible: hasActiveFilters

    property bool hasActiveFilters: false
    property string filterText: ""
    property string statusFilter: "all"
    property string formatFilter: "all"
    property string selectedAuthor: ""
    property string selectedCollectionName: ""
    property int filteredCount: 0
    property int totalCount: 0

    signal clearSearchRequested()
    signal clearStatusRequested()
    signal clearFormatRequested()
    signal clearAuthorRequested()
    signal clearCollectionRequested()
    signal clearAllRequested()

    function statusLabel(status) {
        if (status === "reading") return qsTr("Lendo")
        if (status === "finished") return qsTr("Concluídos")
        if (status === "queue") return qsTr("Na fila")
        return ""
    }

    function formatLabel(fmt) {
        if (fmt === "epub") return "EPUB"
        if (fmt === "pdf") return "PDF"
        return ""
    }

    RowLayout {
        anchors.fill: parent
        anchors.leftMargin: 12
        anchors.rightMargin: 12
        spacing: 8

        Text {
            text: "⚡"
            font.pixelSize: 11
        }

        Text {
            text: qsTr("Filtros ativos:")
            color: "#a7a9be"
            font.pixelSize: 11
            font.weight: Font.Medium
        }

        // Search chip
        Rectangle {
            visible: activeFiltersBar.filterText.trim().length > 0
            implicitHeight: 24
            implicitWidth: searchRow.implicitWidth + 16
            radius: 12
            color: "#267c3aed"
            border.color: "#667c3aed"
            border.width: 1

            RowLayout {
                id: searchRow
                anchors.centerIn: parent
                spacing: 4
                Text {
                    text: qsTr("Busca: \"%1\"").arg(activeFiltersBar.filterText.trim())
                    color: "#c4b5fd"
                    font.pixelSize: 11
                }
                Text {
                    text: "×"
                    color: "#c4b5fd"
                    font.pixelSize: 13
                    font.bold: true
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: activeFiltersBar.clearSearchRequested()
                    }
                }
            }
        }

        // Status chip
        Rectangle {
            visible: activeFiltersBar.statusFilter !== "all"
            implicitHeight: 24
            implicitWidth: statusRow.implicitWidth + 16
            radius: 12
            color: "#18ffffff"
            border.color: "#20ffffff"
            border.width: 1

            RowLayout {
                id: statusRow
                anchors.centerIn: parent
                spacing: 4
                Text {
                    text: qsTr("Status: %1").arg(activeFiltersBar.statusLabel(activeFiltersBar.statusFilter))
                    color: "#fffffe"
                    font.pixelSize: 11
                }
                Text {
                    text: "×"
                    color: "#a7a9be"
                    font.pixelSize: 13
                    font.bold: true
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: activeFiltersBar.clearStatusRequested()
                    }
                }
            }
        }

        // Format chip
        Rectangle {
            visible: activeFiltersBar.formatFilter !== "all"
            implicitHeight: 24
            implicitWidth: formatRow.implicitWidth + 16
            radius: 12
            color: "#18ffffff"
            border.color: "#20ffffff"
            border.width: 1

            RowLayout {
                id: formatRow
                anchors.centerIn: parent
                spacing: 4
                Text {
                    text: qsTr("Formato: %1").arg(activeFiltersBar.formatLabel(activeFiltersBar.formatFilter))
                    color: "#fffffe"
                    font.pixelSize: 11
                }
                Text {
                    text: "×"
                    color: "#a7a9be"
                    font.pixelSize: 13
                    font.bold: true
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: activeFiltersBar.clearFormatRequested()
                    }
                }
            }
        }

        // Author chip
        Rectangle {
            visible: activeFiltersBar.selectedAuthor.length > 0
            implicitHeight: 24
            implicitWidth: authorRow.implicitWidth + 16
            radius: 12
            color: "#267c3aed"
            border.color: "#667c3aed"
            border.width: 1

            RowLayout {
                id: authorRow
                anchors.centerIn: parent
                spacing: 4
                Text {
                    text: qsTr("Autor: %1").arg(activeFiltersBar.selectedAuthor)
                    color: "#c4b5fd"
                    font.pixelSize: 11
                }
                Text {
                    text: "×"
                    color: "#c4b5fd"
                    font.pixelSize: 13
                    font.bold: true
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: activeFiltersBar.clearAuthorRequested()
                    }
                }
            }
        }

        // Collection chip
        Rectangle {
            visible: activeFiltersBar.selectedCollectionName.length > 0 && activeFiltersBar.selectedCollectionName !== "Collection"
            implicitHeight: 24
            implicitWidth: collectionRow.implicitWidth + 16
            radius: 12
            color: "#267c3aed"
            border.color: "#667c3aed"
            border.width: 1

            RowLayout {
                id: collectionRow
                anchors.centerIn: parent
                spacing: 4
                Text {
                    text: qsTr("Coleção: %1").arg(activeFiltersBar.selectedCollectionName)
                    color: "#c4b5fd"
                    font.pixelSize: 11
                }
                Text {
                    text: "×"
                    color: "#c4b5fd"
                    font.pixelSize: 13
                    font.bold: true
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: activeFiltersBar.clearCollectionRequested()
                    }
                }
            }
        }

        Item { Layout.fillWidth: true }

        Text {
            text: qsTr("%1 de %2 livros").arg(activeFiltersBar.filteredCount).arg(activeFiltersBar.totalCount)
            color: "#71717a"
            font.pixelSize: 11
        }

        Rectangle {
            objectName: "libraryClearAllFiltersButton"
            implicitHeight: 24
            implicitWidth: clearAllText.implicitWidth + 16
            radius: 6
            color: clearAllMouse.containsMouse ? "#20ef4444" : "transparent"

            Text {
                id: clearAllText
                anchors.centerIn: parent
                text: qsTr("Limpar filtros")
                color: clearAllMouse.containsMouse ? "#f87171" : "#a7a9be"
                font.pixelSize: 11
                font.underline: clearAllMouse.containsMouse
            }

            MouseArea {
                id: clearAllMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: activeFiltersBar.clearAllRequested()
            }
        }
    }
}
