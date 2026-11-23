use super::models::{DiagramMetaRecord, DiagramRecord};
use crate::errors::map_core_error;
use crate::SynapseError;
use std::sync::Arc;
use synapse_core::domain::diagrams::DiagramsRepository;
use synapse_core::Database;

#[derive(uniffi::Object)]
pub struct SynapseDiagramsStore {
    database: Database,
}

#[uniffi::export]
impl SynapseDiagramsStore {
    #[uniffi::constructor]
    pub fn open(database_path: String) -> Result<Arc<Self>, SynapseError> {
        let database =
            Database::open(database_path).map_err(|msg| SynapseError::IoError { msg })?;
        Ok(Arc::new(Self { database }))
    }

    pub fn get_diagrams(&self) -> Result<Vec<DiagramMetaRecord>, SynapseError> {
        DiagramsRepository::get_diagrams(&self.database)
            .map(|items| items.into_iter().map(Into::into).collect())
            .map_err(map_core_error)
    }

    pub fn get_diagram(&self, id: String) -> Result<Option<DiagramRecord>, SynapseError> {
        DiagramsRepository::get_diagram(&self.database, &id)
            .map(|item| item.map(Into::into))
            .map_err(map_core_error)
    }

    pub fn create_diagram(
        &self,
        title: String,
        icon: String,
    ) -> Result<DiagramRecord, SynapseError> {
        DiagramsRepository::create_diagram_record(&self.database, &title, &icon)
            .map(Into::into)
            .map_err(map_core_error)
    }

    pub fn save_diagram(
        &self,
        id: String,
        title: String,
        content: String,
        icon: String,
    ) -> Result<bool, SynapseError> {
        DiagramsRepository::save_diagram(&self.database, &id, &title, &content, None, &icon)
            .map_err(map_core_error)
    }

    pub fn delete_diagram(&self, id: String) -> Result<bool, SynapseError> {
        DiagramsRepository::delete_diagram(&self.database, &id).map_err(map_core_error)
    }
}
