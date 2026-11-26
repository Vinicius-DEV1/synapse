import QtQuick
import QtTest
import "../../../qml/notes" as Notes

TestCase {
    id: testCase
    name: "NotesFocusSetupModal"
    when: windowShown
    width: 560
    height: 540

    property var modal: null

    Component {
        id: modalComponent
        Notes.NotesSetupWidgetsModal {}
    }

    function init() {
        modal = createTemporaryObject(modalComponent, testCase)
        verify(modal !== null)
        modal.openMode("foco", { time: 25, tag: "Math", desc: "Review the lesson" })
    }

    function test_focusFieldsMatchReactOrderLabelsAndPrefill() {
        var tagField = findChild(modal, "notesFocusTagField")
        var descriptionField = findChild(modal, "notesFocusDescriptionField")
        var durationField = findChild(modal, "notesFocusDurationField")
        var tagLabel = findChild(modal, "notesFocusTagLabel")
        var descriptionLabel = findChild(modal, "notesFocusDescriptionLabel")
        var durationLabel = findChild(modal, "notesFocusDurationLabel")
        verify(tagField !== null)
        verify(descriptionField !== null)
        verify(durationField !== null)
        verify(tagLabel !== null)
        verify(descriptionLabel !== null)
        verify(durationLabel !== null)
        compare(tagLabel.text, "Tag da Sessão")
        compare(descriptionLabel.text, "Descrição")
        compare(durationLabel.text, "Tempo Alvo (minutos)")
        verify(tagField.mapToItem(modal, 0, 0).y < descriptionField.mapToItem(modal, 0, 0).y)
        verify(descriptionField.mapToItem(modal, 0, 0).y < durationField.mapToItem(modal, 0, 0).y)
        compare(tagField.text, "Math")
        compare(descriptionField.text, "Review the lesson")
        compare(durationField.text, "25")
        compare(tagField.placeholderText, "Ex: Estudo, Trabalho, Leitura")
        compare(descriptionField.placeholderText, "Ex: Estudando Cálculo Capítulo 4")
    }
}
