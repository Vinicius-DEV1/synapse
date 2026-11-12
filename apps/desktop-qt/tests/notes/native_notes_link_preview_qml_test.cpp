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
        QCOMPARE(actions.size(), 10);
        QCOMPARE(actions.at(9).toMap().value("label").toString(), QString("Convert to text: Saved"));

        QSignalSpy contentChanged(canvas.data(), SIGNAL(contentModified(QString)));
        QVERIFY(contentChanged.isValid());
        const QString conversionAction = actions.at(9).toMap().value("url").toString();
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
    return menuResult | QTest::qExec(&conversionTest);
}

#include "native_notes_link_preview_qml_test.moc"
