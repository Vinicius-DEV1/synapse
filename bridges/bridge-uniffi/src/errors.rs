use crate::SynapseError;

pub fn map_core_error(error: synapse_core::error::SynapseError) -> SynapseError {
    match error {
        synapse_core::error::SynapseError::Database(message) => {
            SynapseError::IoError { msg: message }
        }
        other => SynapseError::InvalidInput {
            msg: other.to_string(),
        },
    }
}

pub fn not_found(entity: &str, id: &str) -> SynapseError {
    SynapseError::InvalidInput {
        msg: format!("{entity} {id} was not found"),
    }
}
