import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

ColumnLayout {
    id: recRoot
    Layout.fillWidth: true
    Layout.fillHeight: true
    spacing: 14

    property var collectionItems: []
    property var recommendations: []
    property bool isLoading: false
    property string errorMsg: ""

    signal addRecommendationRequested(string title, string mediaType, string synopsis)

    AiClient {
        id: aiClient
        dataController: typeof dataController !== "undefined" ? dataController : null
    }

    function generateRecommendations() {
        if (isLoading) return
        isLoading = true
        errorMsg = ""
        var titles = collectionItems.slice(0, 15).map(function(it) {
            return it.title + " (" + it.type + ", " + it.status + ")"
        }).join(", ")
        var sys = "Sugira 6 obras (anime, série ou filme) compatíveis com o gosto do usuário. Responda APENAS um JSON array válido: [{\"title\":\"...\",\"type\":\"anime|série|filme\",\"reason\":\"...\"}]"
        var prompt = titles.length > 0 ? ("Baseado na minha coleção: " + titles) : "Sugira 6 clássicos imperdíveis de ficção científica e suspense."
        aiClient.promptText(sys, prompt, [], function(ok, reply, err) {
            recRoot.isLoading = false
            if (!ok) { recRoot.errorMsg = err || qsTr("Erro ao gerar recomendações."); return }
            try {
                var parsed = JSON.parse(aiClient.cleanJson(reply))
                if (Array.isArray(parsed)) recRoot.recommendations = parsed
            } catch (e) {
                recRoot.errorMsg = qsTr("Não foi possível interpretar a resposta da IA.")
            }
        })
    }

    RowLayout {
        Layout.fillWidth: true
        Text { text: qsTr("Recomendações personalizadas pela IA"); color: "#fffffe"; font.pixelSize: 16; font.bold: true; Layout.fillWidth: true }
        Button {
            Layout.preferredHeight: 34
            padding: 12
            enabled: !recRoot.isLoading
            onClicked: recRoot.generateRecommendations()
            background: Rectangle { radius: 8; color: "#7c3aed" }
            contentItem: RowLayout {
                spacing: 6
                AppIcon { name: "sparkles"; color: "#ffffff"; width: 14; height: 14 }
                Text { text: recRoot.isLoading ? qsTr("Analisando...") : qsTr("Gerar Sugestões"); color: "#ffffff"; font.pixelSize: 12; font.bold: true }
            }
        }
    }

    Text { visible: recRoot.errorMsg.length > 0; text: recRoot.errorMsg; color: "#fda4af"; font.pixelSize: 12 }

    GridView {
        Layout.fillWidth: true
        Layout.fillHeight: true
        clip: true
        cellWidth: Math.max(260, width / Math.max(1, Math.floor(width / 300)))
        cellHeight: 150
        model: recRoot.recommendations
        delegate: Rectangle {
            required property var modelData
            width: parent ? (GridView.view.cellWidth - 12) : 280
            height: 138
            radius: 12
            color: "#161524"
            border.color: "#22ffffff"
            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 14
                spacing: 6
                RowLayout {
                    Layout.fillWidth: true
                    Text { text: modelData.title || ""; color: "#fffffe"; font.pixelSize: 14; font.bold: true; elide: Text.ElideRight; Layout.fillWidth: true }
                    Text { text: (modelData.type || "filme").toUpperCase(); color: "#c4b5fd"; font.pixelSize: 10; font.bold: true }
                }
                Text { text: modelData.reason || ""; color: "#a7a9be"; font.pixelSize: 11; wrapMode: Text.Wrap; maximumLineCount: 3; elide: Text.ElideRight; Layout.fillWidth: true; Layout.fillHeight: true }
                Button {
                    Layout.preferredHeight: 26
                    padding: 8
                    onClicked: recRoot.addRecommendationRequested(modelData.title || "", modelData.type || "filme", modelData.reason || "")
                    background: Rectangle { radius: 6; color: "#228b5cf6" }
                    contentItem: Text { text: qsTr("+ Adicionar à Coleção"); color: "#ddd6fe"; font.pixelSize: 10; font.bold: true }
                }
            }
        }
    }
}
