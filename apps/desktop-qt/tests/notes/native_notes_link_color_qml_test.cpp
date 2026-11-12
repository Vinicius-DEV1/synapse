#include "controllers/notes/notes_text_operations.h"

#include <QtCore/QScopedPointer>
#include <QtCore/QUrl>
#include <QtQuick/QQuickItem>
#include <QtQuick/QQuickWindow>
#include <QtQml/QQmlComponent>
#include <QtQml/QQmlContext>
#include <QtQml/QQmlEngine>
#include <QtTest/QtTest>

namespace {
QQuickItem *findVisualItem(QQuickItem *parent, const QString &objectName) {
    if (!parent) return nullptr;
    if (parent->objectName() == objectName) return parent;
    for (QQuickItem *child : parent->childItems()) {
        if (QQuickItem *match = findVisualItem(child, objectName)) return match;
    }
    return nullptr;
}
}

class NativeNotesLinkColorController final : public QObject {
    Q_OBJECT
public:
    QVariantMap entity{{"canonicalUrl", "https://color.example/card"},
                       {"title", "Color card"}, {"color", "default"},
                       {"extensionField", "preserve me"}};

    Q_INVOKABLE QVariantMap getLinkEntity(const QString &url) const {
        return url == entity.value("canonicalUrl").toString() ? entity : QVariantMap{};
    }

    Q_INVOKABLE QVariantMap setLinkEntityColor(const QString &url, const QString &color) {
        if (url != entity.value("canonicalUrl").toString()) return {{"success", false}};
        entity.insert("color", color);
        return {{"success", true}};
    }
};

class NativeNotesLinkColorQmlTest final : public QObject {
    Q_OBJECT
private slots:
    void colorPaletteUpdatesOnlyTheSelectedSavedCard() {
        QQmlEngine engine;
        NotesTextOperations textOperations;
        NativeNotesLinkColorController controller;
        engine.rootContext()->setContextProperty("notesTextOperations", &textOperations);
        QQmlComponent component(&engine);
        component.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/qml/notes/NotesEditorCanvas.qml")));
        QScopedPointer<QObject> canvas(component.create());
        QVERIFY2(canvas, qPrintable(component.errorString()));

        const QString source = QStringLiteral(
            "<p>before</p><div class=\"link-preview-block\" url=\"https://color.example/card\" "
            "title=\"First card\" color=\"default\"></div><p>middle</p>"
            "<div class=\"link-preview-block\" url=\"https://color.example/card\" "
            "title=\"Color card\" color=\"default\"></div><p><strong>after</strong></p>");
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
        QObject *dialog = canvas->findChild<QObject *>("notesLinkColorDialog");
        QVERIFY(editor);
        QVERIFY(actionMenu);
        QVERIFY(previewText);
        QVERIFY(dialog);

        QVariantList actions = actionMenu->property("actions").toList();
        QCOMPARE(actions.size(), 14);
        QCOMPARE(actions.at(12).toMap().value("label").toString(), QString("Change link color: Color card"));
        QVERIFY(QMetaObject::invokeMethod(actionMenu, "actionActivated",
                                          Q_ARG(QString, actions.at(12).toMap().value("url").toString())));
        QTRY_VERIFY(dialog->property("visible").toBool());
        auto *dialogContent = dialog->property("contentItem").value<QQuickItem *>();
        const QList<QPair<QString, QString>> expectedSwatches = {
            {"Default", "default"}, {"Gray", "#9CA3AF"}, {"Brown", "#A8A29E"},
            {"Orange", "#F97316"}, {"Yellow", "#EAB308"}, {"Green", "#22C55E"},
            {"Blue", "#3B82F6"}, {"Purple", "#A855F7"}, {"Pink", "#EC4899"},
            {"Red", "#EF4444"}};
        for (const auto &expected : expectedSwatches) {
            QQuickItem *swatch = findVisualItem(
                dialogContent, "notesLinkColorSwatch" + expected.first);
            QVERIFY2(swatch, qPrintable("Missing link color swatch: " + expected.first));
            QCOMPARE(swatch->property("colorValue").toString(), expected.second);
        }
        QQuickItem *blueSwatch = findVisualItem(dialogContent, "notesLinkColorSwatchBlue");
        QVERIFY(blueSwatch);
        QVERIFY(QMetaObject::invokeMethod(blueSwatch, "click"));
        QTRY_VERIFY(!dialog->property("visible").toBool());
        QCOMPARE(controller.entity.value("color").toString(), QString("#3B82F6"));
        QCOMPARE(controller.entity.value("extensionField").toString(), QString("preserve me"));
        QTRY_VERIFY(editor->property("text").toString().contains("color=\"#3B82F6\""));
        QVERIFY(editor->property("text").toString().contains("title=\"First card\" color=\"default\""));
        canvas->setProperty("activeContent", editor->property("text"));
        QTRY_VERIFY(previewText->property("text").toString().contains("bgcolor=\"#1f2538\""));
        QVERIFY(previewText->property("text").toString().contains("bgcolor=\"#1c1b24\""));

        actions = actionMenu->property("actions").toList();
        QVERIFY(QMetaObject::invokeMethod(actionMenu, "actionActivated",
                                          Q_ARG(QString, actions.at(12).toMap().value("url").toString())));
        QTRY_VERIFY(dialog->property("visible").toBool());
        QQuickItem *defaultSwatch = findVisualItem(dialogContent, "notesLinkColorSwatchDefault");
        QVERIFY(defaultSwatch);
        QVERIFY(QMetaObject::invokeMethod(defaultSwatch, "click"));
        QTRY_VERIFY(!dialog->property("visible").toBool());
        QCOMPARE(controller.entity.value("color").toString(), QString("default"));
        QTRY_VERIFY(editor->property("text").toString().contains("color=\"default\""));
        QVERIFY(editor->property("text").toString().startsWith("<p>before</p>"));
        QVERIFY(editor->property("text").toString().endsWith("<p><strong>after</strong></p>"));
    }
};

int runNativeNotesLinkColorQmlTest(int argc, char **argv) {
    NativeNotesLinkColorQmlTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_link_color_qml_test.moc"
