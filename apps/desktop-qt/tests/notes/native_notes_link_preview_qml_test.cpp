#include "controllers/notes/notes_text_operations.h"

#include <QtCore/QDebug>
#include <QtCore/QScopedPointer>
#include <QtCore/QUrl>
#include <QtGui/QAccessible>
#include <QtGui/QGuiApplication>
#include <QtQuick/QQuickItem>
#include <QtQuick/QQuickWindow>
#include <QtQml/QQmlComponent>
#include <QtQml/QQmlContext>
#include <QtQml/QQmlEngine>
#include <QtTest/QSignalSpy>
#include <QtTest/QtTest>

class NativeNotesLinkPreviewActionMenuTest final : public QObject {
    Q_OBJECT
private slots:
    void actionMenuExposesNamedKeyboardActions() {
        QQmlEngine engine;
        QQmlComponent component(&engine);
        component.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/qml/notes/NotesLinkPreviewActionMenu.qml")));
        QScopedPointer<QObject> actionBar(component.create());
        QVERIFY2(actionBar, qPrintable(component.errorString()));
        actionBar->setProperty("actions", QVariantList{
            QVariantMap{{"label", "Mark completed: Example"}, {"url", "synapse-link://status?item=1"}},
            QVariantMap{{"label", "Copy URL: Example"}, {"url", "synapse-link://copy?item=1"}}});

        QQuickWindow window;
        window.resize(640, 240);
        auto *rootItem = qobject_cast<QQuickItem *>(actionBar.data());
        QVERIFY(rootItem);
        rootItem->setParentItem(window.contentItem());
        window.show();
        QAccessible::setActive(true);
        QTRY_VERIFY(window.isVisible());

        QObject *trigger = actionBar->findChild<QObject *>("notesLinkPreviewActionButton");
        QObject *popup = actionBar->findChild<QObject *>("notesLinkPreviewActionPopup");
        QVERIFY(trigger);
        QVERIFY(popup);
        auto *triggerItem = qobject_cast<QQuickItem *>(trigger);
        QVERIFY(triggerItem);
        auto *accessibleTrigger = QAccessible::queryAccessibleInterface(trigger);
        QVERIFY(accessibleTrigger);
        QCOMPARE(accessibleTrigger->role(), QAccessible::Button);
        QCOMPARE(accessibleTrigger->text(QAccessible::Name), QString("Link actions"));

        QSignalSpy activated(actionBar.data(), SIGNAL(actionActivated(QString)));
        QVERIFY(activated.isValid());
        triggerItem->forceActiveFocus();
        QTRY_VERIFY(triggerItem->hasActiveFocus());
        QTest::keyClick(&window, Qt::Key_Space);
        QTRY_VERIFY(popup->property("visible").toBool());
        QTest::keyClick(&window, Qt::Key_Down);
        QTest::keyClick(&window, Qt::Key_Down);
        QTest::keyClick(&window, Qt::Key_Return);
        QTRY_COMPARE(activated.size(), 1);
        QCOMPARE(activated.takeFirst().at(0).toString(), QString("synapse-link://copy?item=1"));
    }
};

class NativeNotesLinkVaultController final : public QObject {
    Q_OBJECT
public:
    QVariantMap entity{{"canonicalUrl", "https://notes.example/resource"},
                       {"title", "Saved title"}, {"notes", "Saved from Link Vault"},
                       {"watched", false}, {"watching", false}, {"color", "default"},
                       {"extensionField", "preserve me"}};

    Q_INVOKABLE QVariantMap getLinkEntity(const QString &url) const {
        return url == entity.value("canonicalUrl").toString() ? entity : QVariantMap{};
    }

    Q_INVOKABLE QVariantMap setLinkEntityNotes(const QString &url, const QString &notes) {
        if (url != entity.value("canonicalUrl").toString()) return {{"success", false}};
        entity.insert("notes", notes);
        entity.insert("orphanedAt", QVariant{});
        return {{"success", true}};
    }
};

class NativeNotesLinkPreviewConversionTest final : public QObject {
    Q_OBJECT
private slots:
    void conversionReplacesOnlySelectedPreviewAndUndoRestoresIt() {
        QQmlEngine engine;
        NotesTextOperations textOperations;
        engine.rootContext()->setContextProperty("notesTextOperations", &textOperations);
        QQmlComponent component(&engine);
        component.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/qml/notes/NotesEditorCanvas.qml")));
        QScopedPointer<QObject> canvas(component.create());
        QVERIFY2(canvas, qPrintable(component.errorString()));

        const QString source = QStringLiteral(
            "<p>before</p><div class=\"link-preview-block\" url=\"https://example.com/docs?a=1&amp;b=2\"></div>"
            "<p>middle</p><div class=\"link-preview-block\" url=\"https://example.com/docs?a=1&amp;b=2\" title=\"Saved\"></div>"
            "<p><strong>after</strong></p>");
        canvas->setProperty("activeContent", source);
        canvas->setProperty("isPreviewMode", true);

        QObject *editor = canvas->findChild<QObject *>("notesSourceEditor");
        QObject *actionMenu = canvas->findChild<QObject *>("notesLinkPreviewActionMenu");
        QVERIFY(editor);
        QVERIFY(actionMenu);
        const QVariantList actions = actionMenu->property("actions").toList();
        QCOMPARE(actions.size(), 16);
        QCOMPARE(actions.at(14).toMap().value("label").toString(), QString("Convert to text: Saved"));

        QSignalSpy contentChanged(canvas.data(), SIGNAL(contentModified(QString)));
        QVERIFY(contentChanged.isValid());
        const QString conversionAction = actions.at(14).toMap().value("url").toString();
        QVERIFY(QMetaObject::invokeMethod(actionMenu, "actionActivated", Q_ARG(QString, conversionAction)));

        const QString converted = QStringLiteral(
            "<p>before</p><div class=\"link-preview-block\" url=\"https://example.com/docs?a=1&amp;b=2\"></div>"
            "<p>middle</p><p><a href=\"https://example.com/docs?a=1&amp;b=2\">"
            "https://example.com/docs?a=1&amp;b=2</a></p><p><strong>after</strong></p>");
        QTRY_COMPARE(editor->property("text").toString(), converted);
        QTRY_VERIFY(contentChanged.size() > 0);
        QVERIFY(QMetaObject::invokeMethod(editor, "undo"));
        QTRY_COMPARE(editor->property("text").toString(), source);
    }

    void linkNotesActionsShowEditClearAndHide() {
        const QString url = QStringLiteral("https://notes.example/resource");
        QQmlEngine engine;
        NotesTextOperations textOperations;
        NativeNotesLinkVaultController controller;
        engine.rootContext()->setContextProperty("notesTextOperations", &textOperations);
        QQmlComponent component(&engine);
        component.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/qml/notes/NotesEditorCanvas.qml")));
        QScopedPointer<QObject> canvas(component.create());
        QVERIFY2(canvas, qPrintable(component.errorString()));

        const QString source = QStringLiteral(
            "<p>before</p><div class=\"link-preview-block\" url=\"https://notes.example/resource\" "
            "title=\"Saved\" notes=\"\" showNotes=\"false\"></div><p><strong>after</strong></p>");
        canvas->setProperty("activeContent", source);
        canvas->setProperty("controller", QVariant::fromValue(static_cast<QObject *>(&controller)));
        canvas->setProperty("isPreviewMode", true);

        QQuickWindow window;
        window.resize(1000, 700);
        auto *canvasItem = qobject_cast<QQuickItem *>(canvas.data());
        QVERIFY(canvasItem);
        canvasItem->setParentItem(window.contentItem());
        canvasItem->setWidth(1000);
        canvasItem->setHeight(700);
        window.show();
        QTRY_VERIFY(window.isVisible());

        QObject *editor = canvas->findChild<QObject *>("notesSourceEditor");
        QObject *actionMenu = canvas->findChild<QObject *>("notesLinkPreviewActionMenu");
        QObject *previewText = canvas->findChild<QObject *>("notesPageContentPreview");
        QObject *previewSurface = canvas->findChild<QObject *>("notesPreviewSurface");
        QObject *dialog = canvas->findChild<QObject *>("notesLinkNotesDialog");
        QVERIFY(editor);
        QVERIFY(actionMenu);
        QVERIFY(previewText);
        QVERIFY(previewSurface);
        QVERIFY(dialog);

        QVariantList actions = actionMenu->property("actions").toList();
        QCOMPARE(actions.size(), 8);
        QCOMPARE(actions.at(4).toMap().value("label").toString(), QString("Show link notes: Saved"));
        QVERIFY(QMetaObject::invokeMethod(actionMenu, "actionActivated",
                                          Q_ARG(QString, actions.at(4).toMap().value("url").toString())));
        QTRY_VERIFY(editor->property("text").toString().contains("showNotes=\"true\""));
        canvas->setProperty("activeContent", editor->property("text"));
        QTRY_VERIFY(previewSurface->property("sourceHtml").toString().contains("showNotes=\"true\""));
        QTRY_VERIFY(previewText->property("text").toString().contains("Saved from Link Vault"));

        actions = actionMenu->property("actions").toList();
        QTRY_COMPARE(actionMenu->property("actions").toList().size(), 9);
        actions = actionMenu->property("actions").toList();
        QCOMPARE(actions.at(5).toMap().value("label").toString(), QString("Edit link notes: Saved"));
        QVERIFY(QMetaObject::invokeMethod(actionMenu, "actionActivated",
                                          Q_ARG(QString, actions.at(5).toMap().value("url").toString())));
        QTRY_VERIFY(dialog->property("visible").toBool());
        QVERIFY(canvas->property("isDialogOpen").toBool());
        QObject *notesEditor = dialog->findChild<QObject *>("notesLinkNotesEditor");
        QObject *saveButton = dialog->findChild<QObject *>("notesLinkNotesSaveButton");
        QObject *clearButton = dialog->findChild<QObject *>("notesLinkNotesClearButton");
        QVERIFY(notesEditor);
        QVERIFY(saveButton);
        QVERIFY(clearButton);

        const QString note = QStringLiteral("First line\n<script>plain note</script>");
        notesEditor->setProperty("text", note);
        QVERIFY(QMetaObject::invokeMethod(saveButton, "click"));
        QTRY_VERIFY(!dialog->property("visible").toBool());
        QCOMPARE(controller.entity.value("notes").toString(), note);
        QTRY_VERIFY(editor->property("text").toString().contains("notes=\"First line\n&lt;script&gt;"));
        canvas->setProperty("activeContent", editor->property("text"));
        const QString visibleNotes = previewText->property("text").toString();
        QVERIFY(visibleNotes.contains("First line"));
        QVERIFY(visibleNotes.contains("&lt;script&gt;plain note"));
        QVERIFY(!visibleNotes.contains("<script>plain note</script>"));
        QVERIFY(controller.entity.value("extensionField").toString() == "preserve me");

        actions = actionMenu->property("actions").toList();
        QVERIFY(QMetaObject::invokeMethod(actionMenu, "actionActivated",
                                          Q_ARG(QString, actions.at(5).toMap().value("url").toString())));
        QTRY_VERIFY(dialog->property("visible").toBool());
        notesEditor = dialog->findChild<QObject *>("notesLinkNotesEditor");
        clearButton = dialog->findChild<QObject *>("notesLinkNotesClearButton");
        saveButton = dialog->findChild<QObject *>("notesLinkNotesSaveButton");
        QVERIFY(QMetaObject::invokeMethod(clearButton, "click"));
        QCOMPARE(notesEditor->property("text").toString(), QString());
        QVERIFY(QMetaObject::invokeMethod(saveButton, "click"));
        QTRY_VERIFY(!dialog->property("visible").toBool());
        QCOMPARE(controller.entity.value("notes").toString(), QString());
        QTRY_VERIFY(editor->property("text").toString().contains("notes=\"\""));
        canvas->setProperty("activeContent", editor->property("text"));
        QVERIFY(previewText->property("text").toString().contains("No link notes yet."));

        actions = actionMenu->property("actions").toList();
        QCOMPARE(actions.at(4).toMap().value("label").toString(), QString("Hide link notes: Saved"));
        QVERIFY(QMetaObject::invokeMethod(actionMenu, "actionActivated",
                                          Q_ARG(QString, actions.at(4).toMap().value("url").toString())));
        QTRY_VERIFY(editor->property("text").toString().contains("showNotes=\"false\""));
        canvas->setProperty("activeContent", editor->property("text"));
        QVERIFY(!previewText->property("text").toString().contains("No link notes yet."));
        QVERIFY(editor->property("text").toString().startsWith("<p>before</p>"));
        QVERIFY(editor->property("text").toString().endsWith("<p><strong>after</strong></p>"));
    }

    void linkCardConfirmedDeletionRemovesBlockAndUndoRestoresIt() {
        QQmlEngine engine;
        NotesTextOperations textOperations;
        engine.rootContext()->setContextProperty("notesTextOperations", &textOperations);
        QQmlComponent component(&engine);
        component.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/qml/notes/NotesEditorCanvas.qml")));
        QScopedPointer<QObject> canvas(component.create());
        QVERIFY2(canvas, qPrintable(component.errorString()));

        const QString source = QStringLiteral(
            "<p>before</p><div class=\"link-preview-block\" url=\"https://example.com/docs?a=1&amp;b=2\"></div>\n"
            "<p>middle</p><div class=\"link-preview-block\" url=\"https://example.com/docs?a=1&amp;b=2\" title=\"Saved\"></div>\n"
            "<p><strong>after</strong></p>");
        canvas->setProperty("activeContent", source);
        canvas->setProperty("isPreviewMode", true);

        QQuickWindow window;
        window.resize(1000, 700);
        auto *canvasItem = qobject_cast<QQuickItem *>(canvas.data());
        QVERIFY(canvasItem);
        canvasItem->setParentItem(window.contentItem());
        canvasItem->setWidth(1000);
        canvasItem->setHeight(700);
        window.show();
        QTRY_VERIFY(window.isVisible());

        QObject *editor = canvas->findChild<QObject *>("notesSourceEditor");
        QObject *actionMenu = canvas->findChild<QObject *>("notesLinkPreviewActionMenu");
        QObject *deleteDialog = canvas->findChild<QObject *>("notesLinkDeleteDialog");
        QVERIFY(editor);
        QVERIFY(actionMenu);
        QVERIFY(deleteDialog);

        const QVariantList actions = actionMenu->property("actions").toList();
        QCOMPARE(actions.size(), 16);
        QCOMPARE(actions.at(15).toMap().value("label").toString(), QString("Delete link card: Saved"));

        QSignalSpy contentChanged(canvas.data(), SIGNAL(contentModified(QString)));
        QVERIFY(contentChanged.isValid());

        const QString deleteAction = actions.at(15).toMap().value("url").toString();
        QVERIFY(QMetaObject::invokeMethod(actionMenu, "actionActivated", Q_ARG(QString, deleteAction)));
        QTRY_VERIFY(deleteDialog->property("visible").toBool());
        QVERIFY(canvas->property("isDialogOpen").toBool());

        QObject *cancelButton = deleteDialog->findChild<QObject *>("notesLinkDeleteCancelButton");
        QObject *confirmButton = deleteDialog->findChild<QObject *>("notesLinkDeleteConfirmButton");
        QVERIFY(cancelButton);
        QVERIFY(confirmButton);

        QVERIFY(QMetaObject::invokeMethod(cancelButton, "click"));
        QTRY_VERIFY(!deleteDialog->property("visible").toBool());
        QCOMPARE(editor->property("text").toString(), source);
        QCOMPARE(contentChanged.size(), 0);

        QVERIFY(QMetaObject::invokeMethod(actionMenu, "actionActivated", Q_ARG(QString, deleteAction)));
        QTRY_VERIFY(deleteDialog->property("visible").toBool());
        QVERIFY(QMetaObject::invokeMethod(confirmButton, "click"));
        QTRY_VERIFY(!deleteDialog->property("visible").toBool());

        const QString expectedAfterDelete = QStringLiteral(
            "<p>before</p><div class=\"link-preview-block\" url=\"https://example.com/docs?a=1&amp;b=2\"></div>\n"
            "<p>middle</p><p><strong>after</strong></p>");
        QTRY_COMPARE(editor->property("text").toString(), expectedAfterDelete);
        QTRY_VERIFY(contentChanged.size() > 0);

        QVERIFY(QMetaObject::invokeMethod(editor, "undo"));
        QTRY_COMPARE(editor->property("text").toString(), source);
    }
};

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
    NativeNotesLinkPreviewActionMenuTest test;
    const int menuResult = QTest::qExec(&test);
    NativeNotesLinkPreviewConversionTest conversionTest;
    const int conversionResult = QTest::qExec(&conversionTest);

    QQmlEngine widgetEngine;
    QQmlComponent widgetComponent(&widgetEngine);
    widgetComponent.setData(R"(
        import QtQuick
        import "../../qml/notes/NotesCustomWidgetsRenderer.js" as WidgetsRenderer
        Item {
            property string sourceHtml: ""
            property var options: null
            property string renderedHtml: WidgetsRenderer.renderCustomWidgets(sourceHtml, options)
        }
    )", QUrl::fromLocalFile(QStringLiteral(SYNAPSE_DESKTOP_SOURCE_DIR "/tests/notes/WidgetsRendererTest.qml")));
    QScopedPointer<QObject> widgetRenderer(widgetComponent.create());
    if (!widgetRenderer) {
        qCritical() << "Native Notes custom widgets renderer failed to load:" << widgetComponent.errors();
        return 1;
    }

    const QString testCasesHtml = QStringLiteral(
        "<p>Inicio</p>"
        "<span data-type=\"spoiler\" class=\"caderno-spoiler\">segredo-oculto</span>"
        "<div data-type=\"question-block\" data-title=\"Biologia\" data-questions=\"%5B%7B%22prompt%22%3A%22Mitoc%C3%B4ndria%3F%22%2C%22options%22%3A%5B%22Energia%22%2C%22Proteina%22%5D%2C%22correctIndex%22%3A0%2C%22explanation%22%3A%22ATP%22%7D%5D\"></div>"
        "<span data-type=\"focus-widget\" data-duration=\"50\" data-tag=\"Foco\" data-description=\"Deep Work\" data-status=\"running\"></span>"
        "<span data-type=\"alarm-widget\" data-time=\"07:30\" data-label=\"Acordar\" data-status=\"pending\"></span>"
        "<span data-type=\"calendar-event-widget\" data-title=\"Reuniao\" data-date=\"2026-11-15\" data-status=\"pending\"></span>"
        "<span data-type=\"habit-widget\" data-title=\"Exercicios\" data-streak=\"12\"></span>"
        "<div data-type=\"file-widget\" data-name=\"Relatorio.pdf\" data-file-type=\"pdf\"></div>"
        "<div class=\"toggle-block\" data-title=\"Topico Oculto\"><p>Conteudo revelado</p></div>"
        "<div class=\"blockquote-toggle\" data-title=\"Atencao\"><p>Nota importante</p></div>"
        "<div data-type=\"columnGroup\"><div data-type=\"columnBlock\"><p>Esq</p></div><div data-type=\"columnBlock\"><p>Dir</p></div></div>"
        "<div class=\"scrap-widget-block\" data-url=\"https://example.com\" data-title=\"Captura\"></div>"
        "<div data-type=\"document-bundle\" data-title=\"Arquivos\"></div>"
        "<span data-type=\"media-widget\" data-media-id=\"vid-123\" data-media-type=\"video\" data-title=\"Curso Rust\"></span>"
        "<span data-type=\"media-widget\" data-media-id=\"book-456\" data-media-type=\"book\" data-title=\"Clean Code\"></span>"
        "<div class=\"group-collection\" data-title=\"Minhas Paginas\"><p>Subpagina A</p></div>"
        "<div data-type=\"linkGroup\"><div class=\"link-preview-block\">Link 1</div><div class=\"link-preview-block\">Link 2</div></div>"
    );

    widgetRenderer->setProperty("sourceHtml", testCasesHtml);
    const QString widgetRendered = widgetRenderer->property("renderedHtml").toString();

    const bool allWidgetsTransformed =
        widgetRendered.contains("SPOILER OCULTO") &&
        !widgetRendered.contains("segredo-oculto") &&
        widgetRendered.contains("BATERIA DE EXERCÍCIOS / QUIZ: Biologia") &&
        widgetRendered.contains("Gabarito") &&
        widgetRendered.contains("FOCO POMODORO: 50 MINUTOS") &&
        widgetRendered.contains("ALARME AGENDADO: 07:30") &&
        widgetRendered.contains("EVENTO DA AGENDA: Reuniao") &&
        widgetRendered.contains("Exercicios") &&
        widgetRendered.contains("DOCUMENTO ANEXO") &&
        widgetRendered.contains("Relatorio.pdf") &&
        widgetRendered.contains("Topico Oculto") &&
        widgetRendered.contains("Atencao") &&
        widgetRendered.contains("width=\"50%\"") &&
        widgetRendered.contains("Esq") &&
        widgetRendered.contains("Dir") &&
        widgetRendered.contains("SNAPSHOT WEB OFFLINE") &&
        widgetRendered.contains("Captura") &&
        widgetRendered.contains("PACOTE DE DOCUMENTOS: Arquivos") &&
        widgetRendered.contains("VÍDEO VINCULADO") &&
        widgetRendered.contains("Curso Rust") &&
        widgetRendered.contains("LIVRO DA BIBLIOTECA") &&
        widgetRendered.contains("Clean Code") &&
        widgetRendered.contains("Minhas Paginas") &&
        widgetRendered.contains("Subpagina A") &&
        widgetRendered.contains("Link 1") &&
        widgetRendered.contains("Link 2");

    if (!allWidgetsTransformed) {
        qCritical() << "Native Notes custom widgets renderer did not transform all widget blocks correctly:" << widgetRendered;
        return 1;
    }

    // Verify spoiler revealed state
    QVariantMap spoilerOptions;
    spoilerOptions.insert("revealedSpoilers", QVariantMap{{"spoiler_0", true}});
    widgetRenderer->setProperty("options", spoilerOptions);
    const QString revealedRendered = widgetRenderer->property("renderedHtml").toString();
    if (!revealedRendered.contains("segredo-oculto") || revealedRendered.contains("SPOILER OCULTO")) {
        qCritical() << "Spoiler reveal toggle did not show the hidden text correctly:" << revealedRendered;
        return 1;
    }

    // Verify toggle block and collection collapsed state
    QVariantMap toggleCollapsedOptions;
    toggleCollapsedOptions.insert("toggleStates", QVariantMap{{"toggle_0", false}, {"collection_0", false}});
    widgetRenderer->setProperty("options", toggleCollapsedOptions);
    const QString collapsedRendered = widgetRenderer->property("renderedHtml").toString();
    if (!collapsedRendered.contains("clique para expandir") || collapsedRendered.contains("Conteudo revelado")) {
        qCritical() << "Toggle block collapse did not hide inner content correctly:" << collapsedRendered;
        return 1;
    }
    if (!collapsedRendered.contains("(recolhida)") || collapsedRendered.contains("Subpagina A")) {
        qCritical() << "Collection group collapse did not hide inner content correctly:" << collapsedRendered;
        return 1;
    }

    qInfo() << "Native Notes custom widgets rendering passed.";
    return menuResult | conversionResult;
}

#include "native_notes_link_preview_qml_test.moc"
