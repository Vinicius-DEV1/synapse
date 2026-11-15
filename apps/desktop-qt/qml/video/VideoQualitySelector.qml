import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: root
    spacing: 6
    Layout.fillWidth: true

    property string selectedQuality: "720p"
    property bool enabledState: true

    signal qualityChanged(string quality)

    readonly property var qualityOptions: [
        { id: "original", label: "Original (Sem Conversão - Pesado)" },
        { id: "remux",    label: "Clonar Original (Remux MP4 Rápido)" },
        { id: "1080p",    label: "1080p Full HD (Alta Qualidade)" },
        { id: "720p",     label: "720p HD (Rápido e Leve - Recomendado)" },
        { id: "480p",     label: "480p SD (Econômico)" },
        { id: "360p",     label: "360p (Economia Máxima de Espaço)" }
    ]

    Text {
        text: "Qualidade do Vídeo"
        color: "#d4d4dc"
        font.pixelSize: 13
        font.bold: true
    }

    ComboBox {
        id: qualityCombo
        Layout.fillWidth: true
        Layout.preferredHeight: 40
        enabled: root.enabledState

        model: root.qualityOptions
        textRole: "label"
        valueRole: "id"

        currentIndex: {
            for (var i = 0; i < root.qualityOptions.length; ++i) {
                if (root.qualityOptions[i].id === root.selectedQuality) return i
            }
            return 3 // 720p
        }

        onActivated: function(index) {
            root.selectedQuality = root.qualityOptions[index].id
            root.qualityChanged(root.selectedQuality)
        }

        background: Rectangle {
            color: qualityCombo.hovered ? "#242332" : "#1a1924"
            radius: 8
            border.color: qualityCombo.visualFocus ? "#818cf8" : "#20ffffff"
            border.width: 1
        }

        contentItem: Text {
            leftPadding: 12
            rightPadding: qualityCombo.indicator.width + 12
            text: qualityCombo.displayText
            font.pixelSize: 13
            color: "#fffffe"
            verticalAlignment: Text.AlignVCenter
            elide: Text.ElideRight
        }

        delegate: ItemDelegate {
            width: qualityCombo.width
            height: 38
            highlighted: qualityCombo.highlightedIndex === index

            background: Rectangle {
                color: highlighted ? "#2d2a45" : (hovered ? "#222131" : "#181723")
            }

            contentItem: Text {
                leftPadding: 12
                text: modelData.label
                color: modelData.id === root.selectedQuality ? "#818cf8" : "#e2e8f0"
                font.pixelSize: 13
                font.bold: modelData.id === root.selectedQuality
                verticalAlignment: Text.AlignVCenter
                elide: Text.ElideRight
            }
        }

        popup: Popup {
            y: qualityCombo.height + 4
            width: qualityCombo.width
            implicitHeight: contentItem.implicitHeight
            padding: 1

            contentItem: ListView {
                clip: true
                implicitHeight: contentHeight
                model: qualityCombo.popup.visible ? qualityCombo.delegateModel : null
                currentIndex: qualityCombo.highlightedIndex
                ScrollIndicator.vertical: ScrollIndicator { }
            }

            background: Rectangle {
                color: "#181723"
                radius: 8
                border.color: "#30ffffff"
                border.width: 1
            }
        }
    }
}
