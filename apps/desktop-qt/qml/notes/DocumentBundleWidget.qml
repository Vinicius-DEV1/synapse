pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Layouts 1.15
import ".."

Rectangle {
    id: bundleWidgetRoot
    Layout.fillWidth: true
    Layout.preferredHeight: contentCol.implicitHeight + 24
    radius: 12
    color: "#16161e"
    border.color: "#2e2e38"
    border.width: 1

    property string bundleId: ""
    property string title: "Pacote de Documentos"
    property var items: []

    signal documentClicked(var doc)
    signal removeDocument(int index)

    property bool isModalOpen: false

    ColumnLayout {
        id: contentCol
        anchors.fill: parent
        anchors.margins: 12
        spacing: 10

        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            AppIcon {
                name: "notes"
                color: "#7c3aed"
                Layout.preferredWidth: 16
                Layout.preferredHeight: 16
            }

            Text {
                text: bundleWidgetRoot.title
                color: "#fffffe"
                font.pixelSize: 13
                font.weight: Font.DemiBold
                Layout.fillWidth: true
            }

            Rectangle {
                Layout.preferredHeight: 26
                Layout.preferredWidth: 80
                radius: 6
                color: addMouse.containsMouse ? "#2e2e38" : "#1f1f2e"
                border.color: "#3a3a4c"
                border.width: 1

                RowLayout {
                    anchors.centerIn: parent
                    spacing: 4
                    AppIcon { name: "plus"; color: "#a78bfa"; Layout.preferredWidth: 12; Layout.preferredHeight: 12 }
                    Text { text: "Adicionar"; color: "#c4b5fd"; font.pixelSize: 11 }
                }

                MouseArea {
                    id: addMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: bundleWidgetRoot.isModalOpen = true
                }
            }
        }

        // Empty state
        Text {
            visible: !bundleWidgetRoot.items || bundleWidgetRoot.items.length === 0
            text: "Nenhuma página vinculada ao pacote. Clique em Adicionar para incluir páginas."
            color: "#6b7280"
            font.pixelSize: 11
        }

        // Badges grid
        Flow {
            Layout.fillWidth: true
            spacing: 6
            visible: bundleWidgetRoot.items && bundleWidgetRoot.items.length > 0

            Repeater {
                model: bundleWidgetRoot.items

                delegate: Rectangle {
                    id: itemDelegate
                    required property var modelData
                    required property int index

                    height: 28
                    width: itemRow.implicitWidth + 16
                    radius: 6
                    color: itemMouse.containsMouse ? "#281b38" : "#0f0e17"
                    border.color: "#2e2e38"
                    border.width: 1

                    RowLayout {
                        id: itemRow
                        anchors.centerIn: parent
                        spacing: 6

                        Text {
                            text: itemDelegate.modelData.title || "Documento"
                            color: "#fffffe"
                            font.pixelSize: 11
                        }

                        AppIcon {
                            name: "close"
                            color: "#9ca3af"
                            Layout.preferredWidth: 10
                            Layout.preferredHeight: 10

                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: bundleWidgetRoot.removeDocument(itemDelegate.index)
                            }
                        }
                    }

                    MouseArea {
                        id: itemMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: bundleWidgetRoot.documentClicked(itemDelegate.modelData)
                    }
                }
            }
        }
    }

    DocumentBundleModal {
        isOpen: bundleWidgetRoot.isModalOpen
        onClosed: bundleWidgetRoot.isModalOpen = false
        onPageSelected: function(page) {
            var copy = bundleWidgetRoot.items ? bundleWidgetRoot.items.slice(0) : []
            copy.push(page)
            bundleWidgetRoot.items = copy
        }
    }
}
