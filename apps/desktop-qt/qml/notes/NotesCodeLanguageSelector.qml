import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

pragma ComponentBehavior: Bound

ComboBox {
    id: languageSelector
    objectName: "notesCodeLanguageSelector"
    signal languageRequested(string language)

    property string language: "auto"
    readonly property var registeredLanguages: [
        "arduino", "bash", "c", "cpp", "csharp", "css", "diff", "go", "graphql", "ini", "java",
        "javascript", "json", "kotlin", "less", "lua", "makefile", "markdown", "objectivec", "perl",
        "php", "php-template", "plaintext", "python", "python-repl", "r", "ruby", "rust", "scss", "shell",
        "sql", "swift", "typescript", "vbnet", "wasm", "xml", "yaml"
    ]
    readonly property var options: {
        var values = ["auto"].concat(languageSelector.registeredLanguages)
        if (languageSelector.language !== "auto" && values.indexOf(languageSelector.language) < 0)
            values.splice(1, 0, languageSelector.language)
        return values
    }

    Layout.preferredWidth: 116
    Layout.preferredHeight: 26
    Accessible.name: qsTr("Code block language")
    model: languageSelector.options
    currentIndex: Math.max(0, languageSelector.options.indexOf(languageSelector.language))
    onActivated: function(index) {
        var selectedLanguage = languageSelector.options[index]
        languageSelector.languageRequested(selectedLanguage === "auto" ? "" : selectedLanguage)
    }

    contentItem: Text {
        leftPadding: 8
        rightPadding: 24
        text: languageSelector.displayText
        color: "#ddd6fe"
        font.pixelSize: 11
        verticalAlignment: Text.AlignVCenter
        elide: Text.ElideRight
    }
    indicator: Text {
        x: languageSelector.width - width - 8
        y: (languageSelector.height - height) / 2
        text: "⌄"
        color: "#a7a9be"
        font.pixelSize: 12
    }
    background: Rectangle {
        radius: 5
        color: languageSelector.hovered ? "#1c1b29" : "#161524"
        border.color: languageSelector.activeFocus ? "#808b5cf6" : "#18ffffff"
    }
    delegate: ItemDelegate {
        id: languageDelegate
        required property var modelData
        required property int index
        width: languageSelector.width
        text: languageDelegate.modelData
        highlighted: languageSelector.highlightedIndex === languageDelegate.index
        contentItem: Text {
            text: languageDelegate.modelData
            color: languageDelegate.highlighted ? "#ddd6fe" : "#c4c4d0"
            font.pixelSize: 11
            verticalAlignment: Text.AlignVCenter
        }
        background: Rectangle {
            radius: 3
            color: languageDelegate.highlighted ? "#208b5cf6" : "transparent"
        }
    }
    popup: Popup {
        y: languageSelector.height + 3
        width: languageSelector.width
        implicitHeight: Math.min(contentItem.implicitHeight, 280)
        padding: 3
        contentItem: ListView {
            clip: true
            implicitHeight: contentHeight
            model: languageSelector.delegateModel
            currentIndex: languageSelector.highlightedIndex
            ScrollIndicator.vertical: ScrollIndicator { }
        }
        background: Rectangle {
            radius: 6
            color: "#1a1924"
            border.color: "#14ffffff"
        }
    }
}
