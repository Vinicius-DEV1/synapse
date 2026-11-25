#include <QtCore/QScopedPointer>
#include <QtCore/QUrl>
#include <QtQml/QQmlComponent>
#include <QtQml/QQmlEngine>
#include <QtTest/QSignalSpy>
#include <QtTest/QtTest>

class NativeNotesLinkColorController final : public QObject {
    Q_OBJECT
public:
    QVariantMap entity{
        {"canonicalUrl", "https://color.example/card"},
        {"title", "Color card"},
        {"notes", ""},
        {"watched", false},
        {"watching", false},
        {"color", "default"},
        {"extensionField", "preserve me"}
    };

    Q_INVOKABLE QVariantMap getLinkMetadata(const QString &) const { return {}; }
    Q_INVOKABLE QVariantMap getLinkEntity(const QString &url) const {
        return url == entity.value("canonicalUrl").toString() ? entity : QVariantMap{};
    }
    Q_INVOKABLE QVariantMap setLinkEntityColor(const QString &url, const QString &color) {
        if (url != entity.value("canonicalUrl").toString()) return {{"success", false}};
        entity.insert("color", color);
        return {{"success", true}};
    }
    Q_INVOKABLE QVariantList findDuplicateNoteLinks(const QString &, const QString &) const { return {}; }
};

class NativeNotesLinkColorQmlTest final : public QObject {
    Q_OBJECT
private slots:
    void linkPreviewCardUpdatesColorAndSyncsWithVault() {
        QQmlEngine engine;
        NativeNotesLinkColorController controller;
        QQmlComponent component(&engine);
        component.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/qml/notes/LinkPreviewCard.qml")));
        QScopedPointer<QObject> card(component.create());
        QVERIFY2(card, qPrintable(component.errorString()));

        card->setProperty("controller", QVariant::fromValue(static_cast<QObject *>(&controller)));
        card->setProperty("blockData", QVariantMap{
            {"id", "blk_link"},
            {"blockType", "linkPreview"},
            {"attrs", QVariantMap{{"url", "https://color.example/card"}, {"title", "Color card"}, {"data-color", "default"}}}
        });

        QSignalSpy updatedSpy(card.data(), SIGNAL(attrsUpdated(QVariant)));
        QVERIFY(updatedSpy.isValid());
        QVERIFY(QMetaObject::invokeMethod(card.data(), "saveColor", Q_ARG(QVariant, QString("#3B82F6"))));
        QCOMPARE(controller.entity.value("color").toString(), QString("#3B82F6"));
        QCOMPARE(controller.entity.value("extensionField").toString(), QString("preserve me"));
        QCOMPARE(card->property("accentColor").toString(), QString("#3B82F6"));
        QCOMPARE(updatedSpy.count(), 1);
    }
};

int runNativeNotesLinkColorQmlTest(int argc, char **argv) {
    NativeNotesLinkColorQmlTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_link_color_qml_test.moc"
