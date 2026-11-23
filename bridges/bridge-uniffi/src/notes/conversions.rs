use super::models::{NoteMetadataRecord, NotePageRecord, NoteTreeNodeRecord};
use synapse_core::domain::notes::{NotesRepository, PageMetaRecord, PageNode, PageRecord};

impl From<PageMetaRecord> for NoteMetadataRecord {
    fn from(page: PageMetaRecord) -> Self {
        Self {
            id: page.id,
            parent_id: page.parent_id,
            title: page.title,
            icon: page.icon,
            updated_at: page.updated_at,
            is_pinned: page.is_pinned != 0,
            is_locked: page.is_locked != 0,
        }
    }
}

impl From<PageRecord> for NotePageRecord {
    fn from(page: PageRecord) -> Self {
        let is_protected = page.is_locked != 0 || page.encrypted_content.is_some();
        let editable_as_plain_text = NotesRepository::can_edit_as_plain_text(&page);
        let content = if is_protected {
            String::new()
        } else {
            NotesRepository::extract_plain_text(&page.content).unwrap_or(page.content)
        };

        Self {
            id: page.id,
            parent_id: page.parent_id,
            title: page.title,
            content,
            icon: page.icon,
            updated_at: page.updated_at,
            is_pinned: page.is_pinned != 0,
            is_locked: page.is_locked != 0,
            is_protected,
            editable_as_plain_text,
        }
    }
}

impl From<PageRecord> for NoteMetadataRecord {
    fn from(page: PageRecord) -> Self {
        Self {
            id: page.id,
            parent_id: page.parent_id,
            title: page.title,
            icon: page.icon,
            updated_at: page.updated_at,
            is_pinned: page.is_pinned != 0,
            is_locked: page.is_locked != 0,
        }
    }
}

impl From<PageNode> for NoteTreeNodeRecord {
    fn from(page: PageNode) -> Self {
        Self {
            id: page.id,
            parent_id: page.parent_id,
            title: page.title,
            icon: page.icon,
            depth: page.depth,
            has_children: page.has_children,
        }
    }
}
