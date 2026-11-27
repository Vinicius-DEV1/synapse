pragma ComponentBehavior: Bound

import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: zoomPanel
    objectName: "notesRichImageZoomPanel"

    property real zoom: 1
    property string mode: "view"
    property string message: ""

    signal zoomRequested(real value)

    height: 44 + (messageVisible ? 8 + Math.min(messageLabel.implicitHeight, 48) : 0)
    color: "#b3000000"
    radius: 16
    border.color: "#1affffff"
    border.width: 1

    readonly property bool messageVisible: message.length > 0 || mode === "crop"

    Column {
        anchors.fill: parent
        anchors.leftMargin: 12
        anchors.rightMargin: 12
        anchors.topMargin: zoomPanel.message.length > 0 ? 4 : 0
        anchors.bottomMargin: zoomPanel.message.length > 0 ? 4 : 0
        spacing: 2

        RowLayout {
            width: parent.width
            height: 42

            Label {
                text: "−"
                color: "#80ffffff"
                font.pixelSize: 17
                Accessible.name: qsTr("Diminuir zoom")
            }

            Slider {
                id: zoomSlider
                objectName: "notesRichImageZoomSlider"
                Layout.fillWidth: true
                from: 0.5
                to: 5
                stepSize: 0.1
                value: zoomPanel.zoom
                onMoved: zoomPanel.zoomRequested(value)
                Accessible.name: qsTr("Zoom da imagem")

                background: Rectangle {
                    x: zoomSlider.leftPadding
                    y: zoomSlider.topPadding + zoomSlider.availableHeight / 2 - height / 2
                    width: zoomSlider.availableWidth
                    height: 2
                    radius: 1
                    color: "#66ffffff"
                    Rectangle {
                        width: zoomSlider.visualPosition * parent.width
                        height: parent.height
                        radius: parent.radius
                        color: "#fffffe"
                    }
                }

                handle: Rectangle {
                    x: zoomSlider.leftPadding + zoomSlider.visualPosition *
                        (zoomSlider.availableWidth - width)
                    y: zoomSlider.topPadding + zoomSlider.availableHeight / 2 - height / 2
                    implicitWidth: 12
                    implicitHeight: 12
                    radius: 6
                    color: "#fffffe"
                }
            }

            Label {
                text: "+"
                color: "#80ffffff"
                font.pixelSize: 17
                Accessible.name: qsTr("Aumentar zoom")
            }

            Label {
                Layout.preferredWidth: 44
                text: Math.round(zoomPanel.zoom * 100) + "%"
                color: "#99ffffff"
                font.pixelSize: 12
                font.family: "monospace"
                horizontalAlignment: Text.AlignRight
            }
        }

        Label {
            id: messageLabel
            width: parent.width
            visible: zoomPanel.messageVisible
            text: zoomPanel.message.length > 0 ? zoomPanel.message
                : qsTr("Arraste para selecionar o recorte · Shift + arraste ou arraste com o botão direito para mover a imagem")
            color: zoomPanel.message.length > 0 ? "#fda4af" : "#a7a9be"
            font.pixelSize: 12
            wrapMode: Text.Wrap
            horizontalAlignment: Text.AlignHCenter
        }
    }
}
