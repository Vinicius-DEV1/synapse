#include "synapse_controller.h"

#include <QtCore/QTemporaryDir>
#include <QtTest/QtTest>

class NativeNotificationsTest final : public QObject {
    Q_OBJECT

private slots:
    void notificationsLifecycleAndManagement() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("native-notifications.sqlite")));
        QVERIFY(controller.setupMasterPassword("TestPassword123!"));

        // Initially empty
        QCOMPARE(controller.getNotifications().size(), 0);
        QCOMPARE(controller.unreadNotificationCount(), 0);

        // Add 3 notifications
        QVERIFY(controller.addNotification("Bem-vindo ao Synapse", "Seu ambiente de estudos foi iniciado.", "system"));
        QVERIFY(controller.addNotification("Reunião de Estudos", "Em 15 minutos na sala virtual.", "calendar_event",
                                           "page-notif-1", "event-notif-1", "2026-11-13T21:00:00Z"));
        QVERIFY(controller.addNotification("Alarme de Foco", "Pausa do Pomodoro concluída.", "alarm"));

        QVariantList list = controller.getNotifications();
        QCOMPARE(list.size(), 3);
        QCOMPARE(controller.unreadNotificationCount(), 3);

        // Find calendar event notification
        QString calendarNotifId;
        QString alarmNotifId;
        for (const QVariant &itemVar : list) {
            const QVariantMap item = itemVar.toMap();
            if (item.value("type").toString() == "calendar_event") {
                calendarNotifId = item.value("id").toString();
                QCOMPARE(item.value("target_page_id").toString(), QString("page-notif-1"));
                QCOMPARE(item.value("event_id").toString(), QString("event-notif-1"));
                QCOMPARE(item.value("is_read").toInt(), 0);
            } else if (item.value("type").toString() == "alarm") {
                alarmNotifId = item.value("id").toString();
            }
        }
        QVERIFY(!calendarNotifId.isEmpty());
        QVERIFY(!alarmNotifId.isEmpty());

        // Mark single notification as read
        QVERIFY(controller.markNotificationRead(calendarNotifId));
        QCOMPARE(controller.unreadNotificationCount(), 2);

        list = controller.getNotifications();
        for (const QVariant &itemVar : list) {
            const QVariantMap item = itemVar.toMap();
            if (item.value("id").toString() == calendarNotifId) {
                QCOMPARE(item.value("is_read").toInt(), 1);
            }
        }

        // Mark all remaining as read
        QVERIFY(controller.markNotificationRead(""));
        QCOMPARE(controller.unreadNotificationCount(), 0);

        list = controller.getNotifications();
        for (const QVariant &itemVar : list) {
            const QVariantMap item = itemVar.toMap();
            QCOMPARE(item.value("is_read").toInt(), 1);
        }

        // Delete single notification
        QVERIFY(controller.deleteNotification(alarmNotifId));
        list = controller.getNotifications();
        QCOMPARE(list.size(), 2);
        for (const QVariant &itemVar : list) {
            const QVariantMap item = itemVar.toMap();
            QVERIFY(item.value("id").toString() != alarmNotifId);
        }

        // Clear all notifications
        QVERIFY(controller.clearAllNotifications());
        list = controller.getNotifications();
        QCOMPARE(list.size(), 0);
        QCOMPARE(controller.unreadNotificationCount(), 0);
    }
};

int runNativeNotificationsTest(int argc, char **argv) {
    NativeNotificationsTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notifications_test.moc"

