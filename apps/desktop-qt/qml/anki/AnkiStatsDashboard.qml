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

    // Heatmap of daily review activity
    AnkiActivityHeatmap {
        totalReviews: statsRoot.globalStats.total_reviews || 0
    }

    // Stacked maturity breakdown
    AnkiMaturityChart {
        newCount: statsRoot.globalStats.new_cards || 0
        learningCount: statsRoot.globalStats.learning_cards || 0
        youngCount: statsRoot.globalStats.young_cards || 0
        matureCount: statsRoot.globalStats.mature_cards || 0
    }

    // Review workload forecast
    AnkiForecastChart {
        forecastData: statsRoot.globalStats.forecast || [12, 8, 15, 6, 9, 4, 11]
    }
}
