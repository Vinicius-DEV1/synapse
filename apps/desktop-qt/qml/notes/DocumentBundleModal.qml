pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import ".."

Item {
    id: bundleModalRoot
    anchors.fill: parent
    visible: isOpen
    z: 100

    property bool isOpen: false
    property var allPages: []
    signal pageSelected(var page)
    signal closed()

    onIsOpenChanged: {
        if (isOpen) {
            allPages = dataController.getPagesHierarchy()
            searchField.forceActiveFocus()
        }
    }

    Rectangle {
        anchors.fill: parent
        color: "#b0000000"
        MouseArea {
            anchors.fill: parent
            onClicked: bundleModalRoot.closed()
        }
    }

    Rectangle {
        width: 440
        height: 480
        anchors.centerIn: parent
        radius: 20
        color: "#16161e"
        border.color: "#2e2e38"
        border.width: 1

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 20
            spacing: 14

            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                AppIcon {
                    name: "notes"
                    color: "#7c3aed"
                    Layout.preferredWidth: 20
                    Layout.preferredHeight: 20
                }

                Text {
                    text: "Adicionar Página ao Pacote"
                    color: "#fffffe"
                    font.pixelSize: 15
                    font.weight: Font.Bold
                    Layout.fillWidth: true
                }

                Rectangle {
                    Layout.preferredWidth: 28
                    Layout.preferredHeight: 28
                    radius: 6
                    color: closeMouse.containsMouse ? "#2e2e38" : "transparent"

                    AppIcon {
                        anchors.centerIn: parent
                        name: "close"
                        color: "#9ca3af"
                        Layout.preferredWidth: 14
                        Layout.preferredHeight: 14
                    }

                    MouseArea {
                        id: closeMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: bundleModalRoot.closed()
                    }
                }
            }

            // Search input
            TextField {
                id: searchField
                Layout.fillWidth: true
                Layout.preferredHeight: 36
                placeholderText: "Buscar páginas..."
                color: "#fffffe"
                placeholderTextColor: "#4b5563"
                font.pixelSize: 12
                background: Rectangle {
                    radius: 8
                    color: "#0f0e17"
                    border.color: searchField.activeFocus ? "#7c3aed" : "#2e2e38"
                    border.width: 1
                }
            }

            // Pages List
            ListView {
                Layout.fillWidth: true
                Layout.fillHeight: true
                clip: true
                spacing: 6
                model: bundleModalRoot.allPages

                delegate: Rectangle {
                    id: pageDelegate
                    required property var modelData
                    required property int index

                    width: ListView.view.width
                    height: 40
                    radius: 8
                    color: pageMouse.containsMouse ? "#222232" : "#0f0e17"
                    border.color: "#2a2a36"
                    border.width: 1

                    RowLayout {
                        anchors.fill: parent
                        anchors.leftMargin: 12
                        anchors.rightMargin: 12
                        spacing: 8

                        Text {
                            text: pageDelegate.modelData.icon || "📄"
                            font.pixelSize: 13
                        }

                        Text {
                            text: pageDelegate.modelData.title || "Sem título"
                            color: "#fffffe"
                            font.pixelSize: 12
                            elide: Text.ElideRight
                            Layout.fillWidth: true
                        }

                        AppIcon {
                            name: "plus"
                            color: "#7c3aed"
                            Layout.preferredWidth: 14
                            Layout.preferredHeight: 14
                        }
                    }

                    MouseArea {
                        id: pageMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            bundleModalRoot.pageSelected(pageDelegate.modelData)
                            bundleModalRoot.closed()
                        }
                    }
                }
            }
        }
    }
}
