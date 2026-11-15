# 10 — Vault

> **Status**: ✅ Complete | **Complexity**: 🟠 High | **Priority**: P1
>
> Master password setup, unlock flow, asset migration, vault items CRUD, password management, and removal exist. Vault sidebar, 3-panel item details view, item form with custom fields, password history, security dashboard with health scoring, security analysis, breach badge, auth type toggle (Google SSO vs password), delete item confirmation modal, group management modal, and Google vector icon are fully implemented and verified with automated native tests.

---

## React Reference
- **Components**: `apps/web-react/src/components/vault/` (18 files)
- **Hooks**: `useVault.ts`, `useVaultItemFormLogic.ts`, `useVaultSecurityAnalysis.ts`
- **Services**: `apps/web-react/src/services/vault-crypto.ts`

## Qt Existing
- **QML**: `VaultView.qml`, `VaultSidebar.qml`, `VaultCredentialsList.qml`, `VaultItemDetails.qml`, `VaultCustomFieldsEditor.qml`, `VaultAuthTypeToggle.qml`, `VaultPasswordHistory.qml`, `VaultSecurityDashboard.qml`, `VaultSecurityCategoryCard.qml`, `VaultBreachBadge.qml`, `VaultGroupModal.qml`, `VaultDeleteItemModal.qml`, `GoogleGIcon.qml`, `CreateVaultItemModal.qml`, `VaultHelpDialog.qml`, `VaultUnlockScreen.qml`
- **Controllers**: `vault_auth_controller.cpp`, `vault_items_controller.cpp`, `vault_groups_controller.cpp`, `vault_security_controller.cpp`, `vault_password_controller.cpp`, `vault_setup_controller.cpp`, `vault_setup_assets_controller.cpp`, `vault_removal_controller.cpp`, `vault_asset_migration_controller.cpp`

---

## Feature Parity Table

| Feature | React File | Qt Status |
|---------|-----------|-----------|
| Vault unlock flow | `VaultView.tsx` | ✅ Done |
| Master password setup | — | ✅ Done |
| Asset migration | — | ✅ Done |
| Vault item list | `VaultItemList.tsx` | ✅ Done |
| Vault item create/edit modal | `VaultItemForm.tsx` | ✅ Done |
| Password management | — | ✅ Done |
| Vault removal | — | ✅ Done |
| Help dialog | `VaultHelpModal.tsx` | ✅ Done |
| **Vault sidebar (categories/groups)** | `VaultSidebar.tsx` | ✅ Done (`VaultSidebar.qml`) |
| **Vault item details view** | `VaultItemDetails.tsx` | ✅ Done (`VaultItemDetails.qml`) |
| **Custom fields editor** | `ui/VaultCustomFieldsEditor.tsx` | ✅ Done (`VaultCustomFieldsEditor.qml`) |
| **Auth type toggle (password/Google SSO)** | `ui/VaultAuthTypeToggle.tsx` | ✅ Done (`VaultAuthTypeToggle.qml`) |
| **Password history** | `VaultPasswordHistory.tsx` | ✅ Done (`VaultPasswordHistory.qml`) |
| **Security dashboard** | `VaultSecurityDashboard.tsx` | ✅ Done (`VaultSecurityDashboard.qml`) |
| **Security analysis hook** | `hooks/useVaultSecurityAnalysis.ts` | ✅ Done (`vault_security_controller.cpp`) |
| **Security category card** | `ui/VaultSecurityCategoryCard.tsx` | ✅ Done (`VaultSecurityCategoryCard.qml`) |
| **Breach badge indicator** | `VaultBreachBadge.tsx` | ✅ Done (`VaultBreachBadge.qml`) |
| **Delete item modal** | `ui/VaultDeleteModal.tsx` | ✅ Done (`VaultDeleteItemModal.qml`) |
| **Group management modal** | `ui/VaultGroupModal.tsx` | ✅ Done (`VaultGroupModal.qml`) |
| **Google icon (for Google auth entries)** | `ui/GoogleGIcon.tsx` | ✅ Done (`GoogleGIcon.qml`) |
| **Item form logic hook** | `hooks/useVaultItemFormLogic.ts` | ✅ Done (`CreateVaultItemModal.qml`) |

---

## Implementation Specs

### Vault Sidebar
- **React**: `VaultSidebar.tsx`
- **Create**: `qml/vault/VaultSidebar.qml`
- **Behavior**: Left sidebar showing vault item categories: All Items, Logins, Credit Cards, Secure Notes, Identities, Custom Groups. Each shows item count. Click to filter main list. Groups are user-created with custom icons.
- **Acceptance**: Sidebar shows all categories with counts, clicking filters list, groups are expandable.

### Vault Item Details View
- **React**: `VaultItemDetails.tsx`
- **Create**: `qml/vault/VaultItemDetails.qml`
- **Behavior**: Full details panel for selected vault item. Shows: title, username (with copy button), password (masked with reveal toggle and copy button), URL (clickable), notes, custom fields, creation date, last modified date, password age indicator.
- **Acceptance**: All fields display correctly, copy buttons work, password reveal toggles.

### Custom Fields Editor
- **React**: `ui/VaultCustomFieldsEditor.tsx`
- **Create**: `qml/vault/VaultCustomFieldsEditor.qml`
- **Behavior**: Dynamic form for adding custom fields to vault items. Each field has: label, value, type (text, password, URL, TOTP). Add/remove fields. Reorder via drag.
- **Acceptance**: Custom fields can be added/removed/reordered, types determine display behavior (password fields masked).

### Password History
- **React**: `VaultPasswordHistory.tsx`
- **Create**: `qml/vault/VaultPasswordHistory.qml`
- **Behavior**: List of previous passwords for a vault item with timestamps. Each entry shows masked password (reveal on click) and copy button. Sorted newest first.
- **Controller**: `Q_INVOKABLE QVariantList getPasswordHistory(const QString &itemId)`
- **Acceptance**: Password history shows all previous values with dates, copy works, reveal toggles.

### Security Dashboard
- **React**: `VaultSecurityDashboard.tsx`, `ui/VaultSecurityCategoryCard.tsx`, `hooks/useVaultSecurityAnalysis.ts`
- **Create**: `qml/vault/VaultSecurityDashboard.qml`, `qml/vault/VaultSecurityCategoryCard.qml`
- **Behavior**: Dashboard analyzing vault item security:
  - Weak passwords (length < 12, no special chars, common patterns)
  - Reused passwords (same password across multiple items)
  - Old passwords (not changed in 90+ days)
  - Missing 2FA (items without TOTP field)
  - Compromised passwords (optional: check against breach databases)
  Each category shows count, severity indicator, and list of affected items.
- **Controller**: `Q_INVOKABLE QVariantMap getSecurityAnalysis()` — analysis logic should be in synapse-core or bridge-qt
- **Acceptance**: Dashboard shows all security categories, clicking category reveals affected items, scores are accurate.

### Breach Badge
- **React**: `VaultBreachBadge.tsx`
- **Create**: `qml/vault/VaultBreachBadge.qml`
- **Behavior**: Small badge indicator on vault items whose passwords may be compromised. Red shield icon with tooltip explaining the risk.
- **Acceptance**: Badge appears on items flagged by security analysis, tooltip shows details.

### Group Management
- **React**: `ui/VaultGroupModal.tsx`
- **Create**: `qml/vault/VaultGroupModal.qml`
- **Behavior**: Create/edit vault item groups (folders). Name, icon, color. Move items between groups.
- **Acceptance**: Groups can be created/edited/deleted, items can be moved between groups.

### Delete Item Confirmation
- **React**: `ui/VaultDeleteModal.tsx`
- **Create**: `qml/vault/VaultDeleteItemModal.qml`
- **Behavior**: Confirmation dialog before permanently deleting a vault item. Shows item name and warns about irreversibility.
- **Acceptance**: Delete requires confirmation, item is permanently removed after confirmation.

---

## Dependencies
- Vault crypto operations already in synapse-core and bridge-qt
- Security analysis may need new bridge functions for password strength checking

## Estimated New Files
- ~10 new QML files
- ~1 controller extension
- ~2 test files
