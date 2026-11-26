import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ComboBox {
    id: filterCombo

    property string accessibleLabel: qsTr("Filtro")
    property string optionLabelRole: "label"
    property string optionValueRole: "value"
    property var options: []
    property string selectedValue: ""

    signal valueActivated(string value)

    readonly property int selectedOptionIndex: {
        for (var index = 0; index < options.length; ++index) {
            if (String(options[index][optionValueRole]) === selectedValue) return index
        }
        return 0
    }

    function syncSelection() {
        currentIndex = selectedOptionIndex
    }

    Layout.fillWidth: true
    Layout.preferredHeight: 24
    Accessible.name: accessibleLabel
    model: options
    textRole: optionLabelRole
    currentIndex: selectedOptionIndex
    onActivated: function(index) { valueActivated(String(options[index][optionValueRole])) }
    onOptionsChanged: syncSelection()
    onSelectedValueChanged: syncSelection()

    contentItem: Text {
        leftPadding: 6
        rightPadding: 22
        text: filterCombo.displayText
        color: "#e2e8f0"
        font.pixelSize: 11
        verticalAlignment: Text.AlignVCenter
        elide: Text.ElideRight
    }
    indicator: Text {
        x: filterCombo.width - width - 7
        y: (filterCombo.height - height) / 2
        text: "⌄"
        color: "#a7a9be"
        font.pixelSize: 12
    }
    background: Rectangle {
        radius: 5
        color: "#0f0e17"
        border.color: filterCombo.activeFocus ? "#808b5cf6" : "#1affffff"
    }
    delegate: ItemDelegate {
        id: optionDelegate
        required property var modelData
        required property int index
        width: filterCombo.width
        text: optionDelegate.modelData[filterCombo.optionLabelRole]
        highlighted: filterCombo.highlightedIndex === optionDelegate.index
        contentItem: Text {
            text: optionDelegate.modelData[filterCombo.optionLabelRole]
            color: optionDelegate.highlighted ? "#ddd6fe" : "#cbd5e1"
            font.pixelSize: 11
            verticalAlignment: Text.AlignVCenter
        }
        background: Rectangle {
            radius: 3
            color: optionDelegate.highlighted ? "#208b5cf6" : "transparent"
        }
    }
    popup: Popup {
        y: filterCombo.height + 3
        width: filterCombo.width
        implicitHeight: Math.min(contentItem.implicitHeight, 220)
        padding: 3
        contentItem: ListView {
            clip: true
            implicitHeight: contentHeight
            model: filterCombo.delegateModel
            currentIndex: filterCombo.highlightedIndex
        }
        background: Rectangle { radius: 6; color: "#1a1924"; border.color: "#14ffffff" }
    }
}
