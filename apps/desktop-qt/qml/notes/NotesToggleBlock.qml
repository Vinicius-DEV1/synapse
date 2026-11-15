import QtQuick 2.15
import QtQuick.Layouts 1.15
import ".."

ColumnLayout {
    id: toggleRoot
    spacing: 4
    Layout.fillWidth: true

    property string toggleId: ""
    property string title: "Seção Recolhível"
    property string contentHtml: ""
    property bool isOpen: false

    signal toggled(bool open)

    // Toggle Header
    Rectangle {
        Layout.fillWidth: true
        Layout.preferredHeight: 34
        radius: 6
        color: headerMouse.containsMouse ? "#1c1c27" : "transparent"

        RowLayout {
            anchors.fill: parent
            anchors.leftMargin: 4
            anchors.rightMargin: 8
            spacing: 6

            // Chevron Icon
            Item {
                Layout.preferredWidth: 20
                Layout.preferredHeight: 20

                AppIcon {
                    anchors.centerIn: parent
                    name: "arrow-right"
                    color: toggleRoot.isOpen ? "#c4b5fd" : "#a7a9be"
                    Layout.preferredWidth: 12
                    Layout.preferredHeight: 12
                    rotation: toggleRoot.isOpen ? 90 : 0
                    Behavior on rotation { NumberAnimation { duration: 150; easing.type: Easing.OutQuad } }
                }
            }

            Text {
                text: toggleRoot.title || "Seção Recolhível"
                color: toggleRoot.isOpen ? "#fffffe" : "#a7a9be"
                font.pixelSize: 13
                font.weight: Font.DemiBold
                Layout.fillWidth: true
                elide: Text.ElideRight
            }
        }

        MouseArea {
            id: headerMouse
            anchors.fill: parent
            hoverEnabled: true
            cursorShape: Qt.PointingHandCursor
            onClicked: {
                toggleRoot.isOpen = !toggleRoot.isOpen
                toggleRoot.toggled(toggleRoot.isOpen)
            }
        }
    }

    // Collapsible Child Content Area
    Rectangle {
        visible: toggleRoot.isOpen
        Layout.fillWidth: true
        Layout.preferredHeight: contentCol.implicitHeight + 12
        Layout.leftMargin: 20
        radius: 6
        color: "#0f0e17"
        border.color: "#22222d"
        border.width: 1

        ColumnLayout {
            id: contentCol
            anchors.fill: parent
            anchors.margins: 10
            spacing: 6

            Text {
                Layout.fillWidth: true
                text: toggleRoot.contentHtml || "(Conteúdo vazio)"
                textFormat: Text.RichText
                color: "#e2e8f0"
                font.pixelSize: 12
                wrapMode: Text.WordWrap
            }
        }
    }
}
