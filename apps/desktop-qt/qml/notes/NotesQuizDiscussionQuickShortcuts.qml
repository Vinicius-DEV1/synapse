pragma ComponentBehavior: Bound

import QtQuick 2.15
import QtQuick.Controls 2.15

Flow {
    id: shortcutsRoot
    property bool enabled: true
    property var prompts: [
        { label: qsTr("Gerar 3 questões intermediárias"), prompt: "Crie 3 questões de nível intermediário sobre este tema com explicações didáticas detalhadas." },
        { label: qsTr("Gerar 2 questões abertas com gabarito"), prompt: "Crie 2 questões discursivas (abertas) com gabarito de referência completo e detalhado." },
        { label: qsTr("Revisar distratores e clareza"), prompt: "Revise a didática das alternativas de todas as questões, eliminando ambiguidades e melhorando os distratores." },
        { label: qsTr("Adicionar tags e aprofundar gabarito"), prompt: "Adicione tags temáticas relevantes e aprofunde as explicações do gabarito das questões." }
    ]
    signal promptRequested(string prompt)

    spacing: 8
    Repeater {
        model: shortcutsRoot.prompts
        delegate: Button {
            required property int index
            required property var modelData
            objectName: "notesQuizQuickPrompt_" + index
            text: modelData.label
            enabled: shortcutsRoot.enabled
            onClicked: shortcutsRoot.requestPrompt(index)
        }
    }

    function requestPrompt(index) {
        if (!enabled || index < 0 || index >= prompts.length) return
        promptRequested(prompts[index].prompt)
    }
}
