#include "synapse_controller.h"

#include <QtCore/QMap>
#include <QtCore/QSet>

QVariantMap SynapseDataController::getVaultSecurityAnalysis() {
    QVariantMap result;
    const QVariantList allItems = getVaultItems(QString());

    QVariantList weakItems;
    QVariantList reusedItems;
    QVariantList breachedItems;
    QVariantList googleItems;

    // Group passwords to identify reuse
    QMap<QString, QStringList> passwordToItemIds;
    for (const QVariant &itemVar : allItems) {
        const QVariantMap item = itemVar.toMap();
        const QString loginType = item.value(QStringLiteral("login_type"), QStringLiteral("password")).toString();
        const QString password = item.value(QStringLiteral("password")).toString();
        const QString id = item.value(QStringLiteral("id")).toString();

        if (loginType == QStringLiteral("google")) {
            googleItems.append(item);
            continue;
        }

        if (!password.isEmpty()) {
            passwordToItemIds[password].append(id);
        }
    }

    QSet<QString> reusedIds;
    for (auto it = passwordToItemIds.constBegin(); it != passwordToItemIds.constEnd(); ++it) {
        if (it.value().size() > 1) {
            for (const QString &id : it.value()) {
                reusedIds.insert(id);
            }
        }
    }

    for (const QVariant &itemVar : allItems) {
        QVariantMap item = itemVar.toMap();
        const QString loginType = item.value(QStringLiteral("login_type"), QStringLiteral("password")).toString();
        if (loginType == QStringLiteral("google")) continue;

        const QString password = item.value(QStringLiteral("password")).toString();
        const QString id = item.value(QStringLiteral("id")).toString();

        const int strength = checkPasswordStrength(password);
        item[QStringLiteral("strengthScore")] = strength;

        const bool isReused = reusedIds.contains(id);
        item[QStringLiteral("isReused")] = isReused;

        if (strength < 3) {
            weakItems.append(item);
        }
        if (isReused) {
            reusedItems.append(item);
        }
    }

    int score = 100;
    if (!allItems.isEmpty()) {
        score -= (weakItems.size() * 5);
        score -= (reusedItems.size() * 10);
        score -= (breachedItems.size() * 20);
        if (score < 0) score = 0;
    } else {
        score = 0;
    }

    result[QStringLiteral("score")] = score;
    result[QStringLiteral("totalCount")] = allItems.size();
    result[QStringLiteral("weakItems")] = weakItems;
    result[QStringLiteral("reusedItems")] = reusedItems;
    result[QStringLiteral("breachedItems")] = breachedItems;
    result[QStringLiteral("googleItems")] = googleItems;
    result[QStringLiteral("hasAnalyzed")] = true;

    return result;
}
