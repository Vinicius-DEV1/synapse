use super::models::TrashItemRecord;
use synapse_core::domain::trash::TrashItem;

impl From<TrashItem> for TrashItemRecord {
    fn from(item: TrashItem) -> Self {
        Self {
            id: item.id,
            title: item.title,
            item_type: item.item_type,
            deleted_at: item.deleted_at,
        }
    }
}
