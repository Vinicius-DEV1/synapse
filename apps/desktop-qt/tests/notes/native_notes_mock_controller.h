#pragma once

#include <QtCore/QObject>
#include <QtCore/QVariantMap>
#include <QtCore/QVariantList>

class MockNotesController final : public QObject {
    Q_OBJECT
public:
    int saveCount = 0;
    QString lastSavedPageId;
    QString lastSavedContent;

signals:
    void fileOperationFinished(const QVariantMap &result);

public:
    Q_INVOKABLE QVariantList getPinnedPages() const {
        return {page("page-one", "<p>First page</p>")};
    }

    Q_INVOKABLE QVariantList getPageTree(const QString &query) const {
        QVariantList pages = {page("page-one", "<p>First page</p>"), page("page-two", "<p>Second page</p>")};
        return query.isEmpty() ? pages : QVariantList();
    }

    Q_INVOKABLE QVariantMap getPage(const QString &id) const {
        if (id == "page-one") return page(id, lastSavedPageId == id ? lastSavedContent : "<p>First page</p>");
        if (id == "page-two") return page(id, "<p>Second page</p>");
        return {};
    }

    Q_INVOKABLE bool savePage(const QString &id, const QString &, const QString &content, const QString &) {
        ++saveCount;
        lastSavedPageId = id;
        lastSavedContent = content;
        return true;
    }

    Q_INVOKABLE bool updatePageDescription(const QString &, const QString &) { return true; }
    Q_INVOKABLE QVariantList getPageHistory(const QString &) const { return {}; }
    Q_INVOKABLE QString createSubPage(const QString &, const QString &, const QString &) { return {}; }
    Q_INVOKABLE bool deletePage(const QString &) { return true; }
    Q_INVOKABLE void togglePinPage(const QString &) {}

private:
    static QVariantMap page(const QString &id, const QString &content) {
        return {{"id", id}, {"title", id}, {"description", ""}, {"content", content},
                {"parent_id", ""}, {"sort_order", 0}, {"icon", "📄"},
                {"cover_image", ""}, {"updated_at", "2026-11-11"}};
    }
};
