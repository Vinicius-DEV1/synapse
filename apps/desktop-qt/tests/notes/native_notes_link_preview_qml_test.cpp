#include <QtCore/QDebug>
#include <QtCore/QUrl>
#include <QtQml/QQmlComponent>
#include <QtQml/QQmlEngine>

int runNativeNotesLinkPreviewQmlTest() {
    QQmlEngine engine;
    QQmlComponent component(&engine);
    component.setData(R"(
        import QtQuick
        import "../../qml/notes/NotesRichLinkPreviewRenderer.js" as Renderer
        Item {
            property string sourceHtml: ""
            property string renderedHtml: Renderer.render(sourceHtml)
        }
    )", QUrl::fromLocalFile(QStringLiteral(SYNAPSE_DESKTOP_SOURCE_DIR "/tests/notes/LinkPreviewTest.qml")));
    QObject *renderer = component.create();
    if (!renderer) {
        qCritical() << "Native Notes link-preview renderer failed to load:" << component.errors();
        return 1;
    }

    const QString source = QStringLiteral(
        "<p>before</p><div class=\"link-preview-block\" url=\"https://example.com/docs?a=1&amp;b=2\" "
        "title=\"A &amp; B\" channel=\"Research\"></div><p>after</p>");
    renderer->setProperty("sourceHtml", source);
    const QString rendered = renderer->property("renderedHtml").toString();
    const bool savedMetadataIsRendered = rendered.contains("<table") &&
        rendered.contains("<b>A &amp; B</b>") && rendered.contains("Research") &&
        rendered.contains("href=\"https://example.com/docs?a=1&amp;b=2\"");
    const bool surroundingContentRemains = rendered.startsWith("<p>before</p>") && rendered.endsWith("<p>after</p>");
    const bool sourceIsUnchanged = renderer->property("sourceHtml").toString() == source;
    if (!savedMetadataIsRendered || !surroundingContentRemains || !sourceIsUnchanged ||
        rendered.contains("link-preview-block")) {
        qCritical() << "Native Notes link-preview renderer did not preserve the expected read-only rendering.";
        delete renderer;
        return 1;
    }

    const QString fallbackSource = QStringLiteral(
        "<div class='link-preview-block' url='https://www.example.org/path'/>");
    renderer->setProperty("sourceHtml", fallbackSource);
    const QString fallback = renderer->property("renderedHtml").toString();
    if (!fallback.contains("<b>example.org</b>") ||
        !fallback.contains("href=\"https://www.example.org/path\"")) {
        qCritical() << "Native Notes link-preview renderer did not use the safe host fallback.";
        delete renderer;
        return 1;
    }

    renderer->setProperty("sourceHtml", QStringLiteral(
        "<div class=\"link-preview-block\" url=\"javascript:alert(1)\" onmouseover=\"alert(2)\"></div>"));
    const QString rejected = renderer->property("renderedHtml").toString();
    delete renderer;
    if (!rejected.contains("Unsupported link preview") || rejected.contains("javascript:") ||
        rejected.contains("onmouseover")) {
        qCritical() << "Native Notes link-preview renderer failed to reject an unsafe target.";
        return 1;
    }

    qInfo() << "Native Notes link-preview rendering passed.";
    return 0;
}
