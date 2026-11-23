import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

RowLayout {
    id: navRoot
    Layout.fillWidth: true
    spacing: 8

    property string activeSubTab: "explorer" // "explorer" | "dashboard" | "simulations"
    signal tabSelected(string tabId)

    readonly property var tabs: [
        { id: "explorer", label: qsTr("Explorador"), icon: "questions" },
        { id: "dashboard", label: qsTr("Dashboard"), icon: "analytics" },
        { id: "simulations", label: qsTr("Simulados"), icon: "play" }
    ]

    Repeater {
        model: navRoot.tabs
        delegate: Button {
            required property var modelData
            readonly property bool selected: navRoot.activeSubTab === modelData.id
            Layout.preferredHeight: 34
            padding: 12
            focusPolicy: Qt.NoFocus
            onClicked: navRoot.tabSelected(modelData.id)
            background: Rectangle {
                radius: 9
                color: selected ? "#268b5cf6" : (parent.hovered ? "#1affffff" : "#141320")
                border.color: selected ? "#668b5cf6" : "#14ffffff"
            }
            contentItem: RowLayout {
                spacing: 6
                AppIcon { name: modelData.icon; color: selected ? "#c4b5fd" : "#94a1b2"; width: 14; height: 14 }
                Text {
                    text: modelData.label
                    color: selected ? "#fffffe" : "#a7a9be"
                    font.pixelSize: 12
                    font.weight: selected ? Font.DemiBold : Font.Normal
                }
            }
        }
    }

    Item { Layout.fillWidth: true }
}
