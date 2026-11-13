import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Item {
    id: authorDropdown
    objectName: "libraryAuthorDropdown"
    implicitWidth: authorButton.implicitWidth
    implicitHeight: 32
    visible: authors && authors.length > 0

    property var authors: []
    property string selectedAuthor: ""
    signal authorSelected(string author)

    Button {
        id: authorButton
        objectName: "libraryAuthorButton"
        anchors.fill: parent
        padding: 6
        leftPadding: 10
        rightPadding: 10
        hoverEnabled: true
        Accessible.name: authorDropdown.selectedAuthor.length > 0
            ? qsTr("Filter by author: %1").arg(authorDropdown.selectedAuthor)
            : qsTr("Filter by author: All")

        background: Rectangle {
            color: authorButton.down ? "#28253b" : authorButton.hovered ? "#211f30" : (authorDropdown.selectedAuthor.length > 0 ? "#207c3aed" : "#161524")
            radius: 8
            border.color: authorDropdown.selectedAuthor.length > 0 ? "#a78bfa" : (authorPopup.visible ? "#a78bfa" : "#1fffffff")
            border.width: 1
        }

        contentItem: RowLayout {
            spacing: 6
            Text {
                text: "📖"
                font.pixelSize: 11
            }
            Text {
                text: authorDropdown.selectedAuthor.length > 0 ? authorDropdown.selectedAuthor : qsTr("Autor")
                color: authorDropdown.selectedAuthor.length > 0 ? "#a78bfa" : "#fffffe"
                font.pixelSize: 12
                font.weight: Font.Medium
                elide: Text.ElideRight
                Layout.maximumWidth: 120
            }
            Text {
                text: "▾"
                color: "#71717a"
                font.pixelSize: 10
            }
        }

        onClicked: {
            if (authorPopup.visible) authorPopup.close()
            else authorPopup.open()
        }
    }

    Popup {
        id: authorPopup
        objectName: "libraryAuthorPopup"
        y: authorButton.height + 4
        width: Math.max(180, authorButton.width)
        padding: 4
        closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside

        background: Rectangle {
            color: "#161524"
            radius: 10
            border.color: "#2a283c"
            border.width: 1
        }

        contentItem: ScrollView {
            id: authorScroll
            implicitHeight: Math.min(240, authorListLayout.implicitHeight)
            clip: true

            ColumnLayout {
                id: authorListLayout
                width: authorScroll.width
                spacing: 2

                Rectangle {
                    objectName: "libraryAuthorOption_all"
                    Layout.fillWidth: true
                    Layout.preferredHeight: 30
                    radius: 6
                    color: allAuthorsMouse.containsMouse ? "#211f30" : (authorDropdown.selectedAuthor.length === 0 ? "#207c3aed" : "transparent")

                    Text {
                        anchors.fill: parent
                        anchors.leftMargin: 10
                        anchors.rightMargin: 10
                        text: qsTr("Todos os autores")
                        color: authorDropdown.selectedAuthor.length === 0 ? "#a78bfa" : (allAuthorsMouse.containsMouse ? "#fffffe" : "#c4c5d4")
                        font.pixelSize: 12
                        font.weight: authorDropdown.selectedAuthor.length === 0 ? Font.DemiBold : Font.Normal
                        verticalAlignment: Text.AlignVCenter
                    }

                    MouseArea {
                        id: allAuthorsMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            authorDropdown.authorSelected("")
                            authorPopup.close()
                        }
                    }
                }

                Repeater {
                    model: authorDropdown.authors
                    delegate: Rectangle {
                        id: authorDelegate
                        required property string modelData
                        readonly property bool isSelected: authorDropdown.selectedAuthor === modelData
                        objectName: "libraryAuthorOption_" + modelData
                        Layout.fillWidth: true
                        Layout.preferredHeight: 30
                        radius: 6
                        color: authorMouse.containsMouse ? "#211f30" : isSelected ? "#207c3aed" : "transparent"

                        Text {
                            anchors.fill: parent
                            anchors.leftMargin: 10
                            anchors.rightMargin: 10
                            text: authorDelegate.modelData
                            color: authorDelegate.isSelected ? "#a78bfa" : authorMouse.containsMouse ? "#fffffe" : "#c4c5d4"
                            font.pixelSize: 12
                            font.weight: authorDelegate.isSelected ? Font.DemiBold : Font.Normal
                            verticalAlignment: Text.AlignVCenter
                            elide: Text.ElideRight
                        }

                        MouseArea {
                            id: authorMouse
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                authorDropdown.authorSelected(authorDelegate.modelData)
                                authorPopup.close()
                            }
                        }
                    }
                }
            }
        }
    }
}
