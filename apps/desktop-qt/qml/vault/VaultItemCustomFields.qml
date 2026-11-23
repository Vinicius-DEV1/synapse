pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import ".."

Rectangle {
    id: custFieldsRoot
    property var customFieldsList: []
    property string copiedField: ""
    signal copyRequested(string value, string fieldKey)

    visible: customFieldsList && customFieldsList.length > 0
    Layout.fillWidth: true
    Layout.preferredHeight: custCol.implicitHeight + 32
    radius: 16
    color: "#16161e"
    border.color: "#2e2e38"
    border.width: 1

    ColumnLayout {
        id: custCol
        anchors.fill: parent
        anchors.margins: 16
        spacing: 12

        Text {
            text: "CAMPOS ADICIONAIS"
            color: "#a7a9be"
            font.pixelSize: 11
            font.weight: Font.Bold
        }

        Repeater {
            model: custFieldsRoot.customFieldsList

            delegate: Rectangle {
                id: fldDelegate
                required property var modelData
                required property int index

                Layout.fillWidth: true
                Layout.preferredHeight: 46
                radius: 10
                color: "#0f0e17"
                border.color: "#22222d"
                border.width: 1

                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 10
                    spacing: 8

                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 2

                        Text {
                            text: fldDelegate.modelData ? (fldDelegate.modelData.label || "Campo") : "Campo"
                            color: "#6b7280"
                            font.pixelSize: 10
                        }

                        Text {
                            text: fldDelegate.modelData ? (fldDelegate.modelData.value || "") : ""
                            color: "#fffffe"
                            font.pixelSize: 13
                            elide: Text.ElideRight
                            Layout.fillWidth: true
                        }
                    }

                    Rectangle {
                        Layout.preferredWidth: 26
                        Layout.preferredHeight: 26
                        radius: 6
                        color: custFieldsRoot.copiedField === ("fld-" + fldDelegate.index) ? "#14532d" : (fldMouse.containsMouse ? "#2e2e38" : "transparent")

                        AppIcon {
                            anchors.centerIn: parent
                            name: custFieldsRoot.copiedField === ("fld-" + fldDelegate.index) ? "check" : "copy"
                            color: custFieldsRoot.copiedField === ("fld-" + fldDelegate.index) ? "#4ade80" : "#a7a9be"
                            Layout.preferredWidth: 13
                            Layout.preferredHeight: 13
                        }

                        MouseArea {
                            id: fldMouse
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: custFieldsRoot.copyRequested(fldDelegate.modelData ? fldDelegate.modelData.value : "", "fld-" + fldDelegate.index)
                        }
                    }
                }
            }
        }
    }
}
