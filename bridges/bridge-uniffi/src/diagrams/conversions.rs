use super::models::{DiagramMetaRecord, DiagramRecord};
use synapse_core::domain::diagrams::{DiagramMeta, DiagramRecord as CoreDiagramRecord};

impl From<DiagramMeta> for DiagramMetaRecord {
    fn from(value: DiagramMeta) -> Self {
        Self {
            id: value.id,
            title: value.title,
            icon: value.icon,
            created_at: value.created_at,
            updated_at: value.updated_at,
        }
    }
}

impl From<CoreDiagramRecord> for DiagramRecord {
    fn from(value: CoreDiagramRecord) -> Self {
        Self {
            id: value.id,
            title: value.title,
            icon: value.icon,
            content: value.content,
            encrypted_content: value.encrypted_content,
            created_at: value.created_at,
            updated_at: value.updated_at,
        }
    }
}
