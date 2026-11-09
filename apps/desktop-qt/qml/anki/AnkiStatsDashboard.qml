import QtQuick 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: statsRoot
    spacing: 20

    property var globalStats: ({})

    // 4 Overview KPI Cards
    AnkiStatsOverviewCards {
        globalStats: statsRoot.globalStats
    }

    // Detailed 2-Card Row: Maturity & FSRS Distribution
    AnkiStatsDistributionCards {
        globalStats: statsRoot.globalStats
    }
}
