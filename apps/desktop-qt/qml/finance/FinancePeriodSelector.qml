import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15

Rectangle {
    id: periodSelectorRoot
    height: 38
    radius: 8
    color: "#161524"
    border.color: "#2e2b44"
    border.width: 1

    property int selectedPeriodIndex: 0 // 0: Este Mês, 1: Mês Anterior, 2: Este Ano, 3: Todos
    readonly property var periodNames: ["Este Mês", "Mês Anterior", "Este Ano", "Todos"]

    signal periodSelected(int index, string label)

    RowLayout {
        anchors.fill: parent
        anchors.leftMargin: 8
        anchors.rightMargin: 8
        spacing: 6

        Text {
            text: "📅 Período:"
            color: "#94a1b2"
            font.pixelSize: 11
            font.bold: true
        }

        Repeater {
            model: periodSelectorRoot.periodNames

            Rectangle {
                Layout.preferredHeight: 26
                Layout.preferredWidth: pText.implicitWidth + 14
                radius: 6
                property bool isCurrent: periodSelectorRoot.selectedPeriodIndex === index
                color: isCurrent ? "#8b5cf6" : (pMouse.containsMouse ? "#232135" : "transparent")

                Text {
                    id: pText
                    anchors.centerIn: parent
                    text: modelData
                    color: parent.isCurrent ? "#ffffff" : "#a7a9be"
                    font.pixelSize: 11
                    font.bold: parent.isCurrent
                }

                MouseArea {
                    id: pMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: {
                        periodSelectorRoot.selectedPeriodIndex = index
                        periodSelectorRoot.periodSelected(index, modelData)
                    }
                }
            }
        }
    }
}
