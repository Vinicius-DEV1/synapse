import QtQuick 2.15

Item {
    id: shortcutsRoot

    property bool isStudying: false
    property bool isStudyFinished: false
    property bool isAnswerRevealed: false

    signal revealRequested()
    signal rateRequested(int rating)
    signal exitRequested()

    Shortcut {
        sequence: "Space"
        enabled: shortcutsRoot.isStudying && !shortcutsRoot.isStudyFinished && !shortcutsRoot.isAnswerRevealed
        onActivated: shortcutsRoot.revealRequested()
    }
    Shortcut {
        sequence: "Return"
        enabled: shortcutsRoot.isStudying && !shortcutsRoot.isStudyFinished && !shortcutsRoot.isAnswerRevealed
        onActivated: shortcutsRoot.revealRequested()
    }
    Shortcut {
        sequence: "1"
        enabled: shortcutsRoot.isStudying && !shortcutsRoot.isStudyFinished && shortcutsRoot.isAnswerRevealed
        onActivated: shortcutsRoot.rateRequested(1)
    }
    Shortcut {
        sequence: "2"
        enabled: shortcutsRoot.isStudying && !shortcutsRoot.isStudyFinished && shortcutsRoot.isAnswerRevealed
        onActivated: shortcutsRoot.rateRequested(2)
    }
    Shortcut {
        sequence: "3"
        enabled: shortcutsRoot.isStudying && !shortcutsRoot.isStudyFinished && shortcutsRoot.isAnswerRevealed
        onActivated: shortcutsRoot.rateRequested(3)
    }
    Shortcut {
        sequence: "4"
        enabled: shortcutsRoot.isStudying && !shortcutsRoot.isStudyFinished && shortcutsRoot.isAnswerRevealed
        onActivated: shortcutsRoot.rateRequested(4)
    }
    Shortcut {
        sequence: "Esc"
        enabled: shortcutsRoot.isStudying
        onActivated: shortcutsRoot.exitRequested()
    }
}
