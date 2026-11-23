# UX and Acceptance

See the [audit dashboard](./README.md) for overall status. Treat source implementation and runtime acceptance as separate checklist items.

## Phase 4 — User-Facing Integrations and Acceptance

- [x] Schedule Core-backed snoozed notifications and Calendar reminders through Android after runtime permission, restore pending alarms after reboot/app restart, and navigate to linked notes/events from notification rows and system alerts; [ ] sync notification/reminder state across devices.
- [ ] Add Android share intents, workspace switching, AI assistant, and relevant global actions.
- [ ] Review responsive Compose layouts, TalkBack labels, keyboard/hardware back behavior, process recreation, offline use, and large collections.
- [ ] Audit remaining hardcoded Android UI text and move user-facing labels, messages, and accessibility descriptions into English defaults with matching `values-pt-rBR` translations.
- [x] Remove trailing whitespace from the touched Anki TypeScript and Core files; the repository diff whitespace check passes.
- [x] Add and maintain the native Focus help guide, aligned with the React guide and actual Android behavior.
- [x] Add localized, categorized native guides for Finance, Focus, Culture, Habits, Library, Questions, Vault, and Trash; [ ] add guides for remaining routes with meaningful user-facing flows; [ ] compile and verify the newly added Trash guide.
- [ ] Build and exercise each completed route on a current Android package; record the exact command, device/API, and exercised path.
- [ ] Add focused bridge, repository, and instrumentation coverage for domain persistence, error recovery, encryption, and lifecycle behavior.
- [ ] Update [module structure](../../architecture/module-structure.md), [documentation status](../../documentation-status.md), and relevant security/finance guides in the same change as each capability.
