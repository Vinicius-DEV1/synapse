#[derive(uniffi::Record, Clone)]
pub struct FocusStatsRecord {
    pub completed_sessions_today: i32,
    pub completed_minutes_today: i32,
}

#[derive(uniffi::Record, Clone)]
pub struct FocusSessionRecord {
    pub id: String,
    pub tag: String,
    pub description: String,
    pub target_time_minutes: i32,
    pub status: String,
    pub justification: Option<String>,
    pub summary: Option<String>,
    pub created_at: Option<String>,
}

#[derive(uniffi::Record, Clone)]
pub struct FocusAlarmRecord {
    pub id: String,
    pub time: String,
    pub label: Option<String>,
    pub sound: Option<String>,
    pub enabled: i32,
    pub days: Option<String>,
    pub created_at: Option<String>,
}

#[derive(uniffi::Record, Clone)]
pub struct FocusLofiRecord {
    pub id: String,
    pub title: String,
    pub file_path: String,
    pub duration: f64,
    pub is_local: i32,
}

impl From<synapse_core::domain::focus::FocusStats> for FocusStatsRecord {
    fn from(stats: synapse_core::domain::focus::FocusStats) -> Self {
        Self {
            completed_sessions_today: stats.completed_sessions_today,
            completed_minutes_today: stats.completed_minutes_today,
        }
    }
}

impl From<synapse_core::domain::focus::FocusSession> for FocusSessionRecord {
    fn from(session: synapse_core::domain::focus::FocusSession) -> Self {
        Self {
            id: session.id,
            tag: session.tag,
            description: session.description,
            target_time_minutes: session.target_time_minutes,
            status: session.status,
            justification: session.justification,
            summary: session.summary,
            created_at: session.created_at,
        }
    }
}

impl From<synapse_core::domain::focus::FocusAlarm> for FocusAlarmRecord {
    fn from(alarm: synapse_core::domain::focus::FocusAlarm) -> Self {
        Self {
            id: alarm.id,
            time: alarm.time,
            label: alarm.label,
            sound: alarm.sound,
            enabled: alarm.enabled,
            days: alarm.days,
            created_at: alarm.created_at,
        }
    }
}

impl From<synapse_core::domain::focus::LofiTrack> for FocusLofiRecord {
    fn from(track: synapse_core::domain::focus::LofiTrack) -> Self {
        Self {
            id: track.id,
            title: track.title,
            file_path: track.file_path,
            duration: track.duration,
            is_local: track.is_local,
        }
    }
}
