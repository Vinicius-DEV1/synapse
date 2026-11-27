import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

RowLayout {
    id: headerRoot

    property string mode: ""

    signal closeRequested()

    Layout.fillWidth: true

    RowLayout {
        Layout.fillWidth: true
        spacing: 12

        AppIcon {
            objectName: "notesSetupModalContextIcon"
            visible: headerRoot.mode === "alarme" || headerRoot.mode === "question"
            name: headerRoot.mode === "question" ? "help" : "clock"
            color: "#a78bfa"
            Layout.preferredWidth: headerRoot.mode === "question" ? 18 : 32
            Layout.preferredHeight: headerRoot.mode === "question" ? 18 : 32
        }

        Rectangle {
            visible: headerRoot.mode === "evento"
            Layout.preferredWidth: 34
            Layout.preferredHeight: 34
            radius: 12
            color: "#338b5cf6"
            AppIcon {
                objectName: "notesCalendarEventHeaderIcon"
                anchors.centerIn: parent
                name: "calendar"
                color: "#a78bfa"
                width: 18
                height: 18
            }
        }

        ColumnLayout {
            Layout.fillWidth: true
            spacing: 2

            Text {
                objectName: "notesSetupModalTitle"
                text: headerRoot.mode === "question" ? qsTr("Criar Widget de Questões")
                    : headerRoot.mode === "foco" ? qsTr("Configurar Timer de Foco")
                    : headerRoot.mode === "alarme" ? qsTr("Novo Alarme")
                    : headerRoot.mode === "evento" ? qsTr("Criar Evento na Agenda")
                    : qsTr("Vincular ou Criar Hábito")
                color: "#fffffe"
                font.pixelSize: headerRoot.mode === "alarme" ? 24
                    : headerRoot.mode === "question" ? 14
                    : headerRoot.mode === "evento" ? headerRoot.width >= 640 ? 16 : 14 : 15
                font.bold: true
                Layout.fillWidth: true
            }

            Text {
                visible: headerRoot.mode === "evento"
                text: qsTr("Vínculo inline com avisos automáticos")
                color: "#a7a9be"
                font.pixelSize: 11
            }
        }
    }

    ToolButton {
        id: closeButton
        objectName: "notesSetupModalCloseButton"
        Layout.preferredWidth: headerRoot.mode === "alarme" ? 48
            : headerRoot.mode === "evento" ? 30 : 26
        Layout.preferredHeight: headerRoot.mode === "alarme" ? 48
            : headerRoot.mode === "evento" ? 30 : 26
        onClicked: headerRoot.closeRequested()
        background: Rectangle {
            radius: headerRoot.mode === "evento" ? 8 : 6
            color: closeButton.hovered ? "#1affffff" : "transparent"
        }
        contentItem: AppIcon {
            anchors.centerIn: parent
            name: "close"
            color: "#94a1b2"
            width: headerRoot.mode === "evento" ? 18 : 12
            height: width
        }
    }
}
