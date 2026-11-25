#ifndef SYNAPSE_BRIDGE_H
#define SYNAPSE_BRIDGE_H

#include <stdint.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

// Database handle (opaque)
typedef struct Database Database;

// Video reader handle (opaque)
typedef struct EncryptedVideoReader EncryptedVideoReader;
typedef struct SynapseFileOperation SynapseFileOperation;

// Database APIs
Database* synapse_db_open(const char* path);
void synapse_db_close(Database* db);
char* synapse_db_query_json(Database* db, const char* sql);
char* synapse_db_query_json_params(Database* db, const char* sql, const char* parameters_json);
int synapse_db_execute(Database* db, const char* sql);
int synapse_db_execute_params(Database* db, const char* sql, const char* parameters_json);

// Video Streaming APIs (for libmpv stream callback)
EncryptedVideoReader* synapse_video_reader_open(const char* file_path, const char* key_hex);
int64_t synapse_video_reader_size(EncryptedVideoReader* reader);
int64_t synapse_video_reader_seek(EncryptedVideoReader* reader, int64_t offset);
int64_t synapse_video_reader_read(EncryptedVideoReader* reader, uint8_t* buffer, size_t size);
void synapse_video_reader_close(EncryptedVideoReader* reader);

// Encrypted local file storage API (ENC1 chunked AES-GCM format)
SynapseFileOperation* synapse_file_operation_create(void);
void synapse_file_operation_cancel(SynapseFileOperation* operation);
void synapse_file_operation_close(SynapseFileOperation* operation);
int synapse_file_encrypt(const char* input_path, const char* output_path, const char* key_hex,
                         SynapseFileOperation* operation);
int synapse_file_encrypt_bytes(const uint8_t* input, size_t input_size, const char* output_path,
                               const char* key_hex, SynapseFileOperation* operation);
int synapse_file_decrypt(const char* input_path, const char* output_path, const char* key_hex,
                         SynapseFileOperation* operation);
int synapse_file_copy(const char* input_path, const char* output_path,
                      SynapseFileOperation* operation);

// FSRS Spaced Repetition APIs
int synapse_fsrs_calculate(
    double stability,
    double difficulty,
    int32_t reps,
    int32_t lapses,
    int32_t rating,
    int32_t elapsed_days,
    double* out_stability,
    double* out_difficulty,
    int32_t* out_scheduled_days
);

// Cryptography APIs
int synapse_crypto_derive_master_key(const char* password, uint8_t* out_key32);
char* synapse_crypto_hash_password(const char* password);
char* synapse_crypto_hash_password_v2(const char* password);
char* synapse_crypto_generate_module_key(void);
char* synapse_crypto_encrypt_module_key(const char* module_key, const uint8_t* master_key32);
char* synapse_crypto_decrypt_module_key(const char* encrypted_payload, const uint8_t* master_key32);
char* synapse_crypto_encrypt(const char* key_hex, const char* plaintext);
char* synapse_crypto_decrypt(const char* key_hex, const char* encrypted_payload);
void synapse_crypto_wipe_memory(void* ptr, size_t size);
void synapse_free_string(char* s);
void synapse_free_secret_string(char* s);

// Domain APIs: Finance
char* synapse_finance_get_accounts(Database* db);
int synapse_finance_create_account(Database* db, const char* name, const char* color, const char* icon, double initial_balance);
int synapse_finance_update_account(Database* db, const char* account_id, const char* name, const char* color, const char* icon, double initial_balance);
int synapse_finance_delete_account(Database* db, const char* account_id);
char* synapse_finance_get_transactions(Database* db, const char* type_filter, const char* account_filter);
int synapse_finance_add_transaction(Database* db, const char* description, double amount, const char* type, const char* category, const char* date, const char* account_id);
int synapse_finance_add_transaction_with_status(Database* db, const char* description, double amount, const char* type, const char* category, const char* date, const char* account_id, const char* status);
int synapse_finance_confirm_pending_transaction(Database* db, const char* tx_id, double amount, const char* date, const char* account_id, const char* description, const char* category);
int synapse_finance_add_transfer(Database* db, const char* description, double amount, const char* from_account_id, const char* to_account_id, const char* date);
int synapse_finance_update_transaction(Database* db, const char* tx_id, const char* description, double amount, const char* type, const char* category, const char* date, const char* account_id, const char* destination_account_id);
int synapse_finance_delete_transaction(Database* db, const char* tx_id);
char* synapse_finance_get_summary(Database* db);
char* synapse_finance_get_period_metrics(Database* db, const char* account_id, const char* period);
int synapse_finance_reopen_loan(Database* db, const char* loan_id);
char* synapse_finance_get_wishlist(Database* db);
int synapse_finance_add_wishlist_item(Database* db, const char* title, double price, const char* priority, const char* category, const char* link);
int synapse_finance_delete_wishlist_item(Database* db, const char* item_id);
char* synapse_finance_get_loans(Database* db);
int synapse_finance_create_loan(Database* db, const char* description, const char* person, double amount, const char* loan_type, const char* account_id, const char* date);
int synapse_finance_record_loan_payment(Database* db, const char* loan_id, double amount, const char* account_id, const char* payment_date);
int synapse_finance_delete_loan(Database* db, const char* loan_id);

// Domain APIs: Habits
char* synapse_habits_get_habits(Database* db);
int synapse_habits_create_habit(Database* db, const char* title, const char* color, const char* icon, int target_days);
int synapse_habits_update_habit(Database* db, const char* habit_id, const char* title, const char* color, const char* icon, int target_days);
int synapse_habits_delete_habit(Database* db, const char* habit_id);
char* synapse_habits_get_logs(Database* db, const char* date);
char* synapse_habits_get_logs_range(Database* db, const char* start_date, const char* end_date);
char* synapse_habits_get_habit_stats(Database* db, const char* habit_id, const char* today);
int synapse_habits_toggle_checkin(Database* db, const char* habit_id, const char* date, int* out_checked);
char* synapse_habits_resolve_date_from_title(const char* page_title, const char* fallback_date);

// Domain APIs: Questions & Quiz
char* synapse_quiz_get_batteries(Database* db);
char* synapse_quiz_get_battery_tree(Database* db);
char* synapse_quiz_create_battery(Database* db, const char* title, const char* description);
char* synapse_quiz_create_child_battery(Database* db, const char* parent_id, const char* title, const char* description);
char* synapse_quiz_get_available_parent_options(Database* db, const char* moving_battery_id);
int synapse_quiz_move_battery(Database* db, const char* battery_id, const char* new_parent_id);
char* synapse_quiz_parse_import_text(const char* raw_text);
int synapse_quiz_update_battery(Database* db, const char* battery_id, const char* title, const char* description);
int synapse_quiz_delete_battery(Database* db, const char* battery_id);
char* synapse_quiz_get_battery_questions(Database* db, const char* battery_id);
char* synapse_quiz_get_all_questions(Database* db);
char* synapse_quiz_get_all_tags(Database* db);
char* synapse_quiz_get_error_notebook(Database* db);
char* synapse_quiz_get_random_simulation(Database* db, int limit);
char* synapse_quiz_get_filtered_questions(Database* db, const char* tags_json, const char* status, int limit, int shuffle);
int synapse_quiz_create_question(Database* db, const char* battery_id, const char* question, const char* options_json, int correct_index, const char* explanation, const char* tags_json);
int synapse_quiz_update_question(Database* db, const char* question_id, const char* question, const char* options_json, int correct_index, const char* explanation, const char* tags_json);
int synapse_quiz_delete_question(Database* db, const char* question_id);
int synapse_quiz_record_attempt(Database* db, const char* battery_id, const char* question_id, int selected_index, int is_correct);
char* synapse_quiz_get_stats(Database* db);

// Domain APIs: Anki & Spaced Repetition
char* synapse_anki_get_decks(Database* db);
char* synapse_anki_get_hierarchical_decks(Database* db);
char* synapse_anki_get_deck_stats(Database* db, const char* deck_id);
char* synapse_anki_get_global_stats(Database* db);
char* synapse_anki_create_deck(Database* db, const char* name, const char* description, const char* color, const char* parent_id);
int synapse_anki_update_deck(Database* db, const char* deck_id, const char* name, const char* description, const char* color);
int synapse_anki_delete_deck(Database* db, const char* deck_id);
int synapse_anki_reset_deck(Database* db, const char* deck_id);
char* synapse_anki_get_deck_cards(Database* db, const char* deck_id);
char* synapse_anki_get_due_cards(Database* db, const char* deck_id);
char* synapse_anki_create_card(Database* db, const char* deck_id, const char* front, const char* back, const char* tags, const char* card_type, const char* extra_note);
int synapse_anki_update_card(Database* db, const char* card_id, const char* front, const char* back, const char* tags, const char* card_type, const char* extra_note);
int synapse_anki_delete_card(Database* db, const char* card_id);
int synapse_anki_record_review(Database* db, const char* card_id, int rating);
long long synapse_anki_get_due_cards_count(Database* db);

// Domain APIs: Culture & Entertainment
char* synapse_culture_get_items(Database* db, const char* status_filter);
int synapse_culture_create_item(Database* db, const char* title, const char* item_type, const char* synopsis, int total_episodes, const char* cover_image, const char* goal_note, const char* access_link);
int synapse_culture_update_item(Database* db, const char* item_id, const char* title, const char* item_type, const char* synopsis, int total_episodes, const char* cover_image, const char* status, const char* goal_note, const char* access_link);
int synapse_culture_increment_progress(Database* db, const char* item_id);
int synapse_culture_update_progress(Database* db, const char* item_id, int progress);
int synapse_culture_update_status(Database* db, const char* item_id, const char* status);
int synapse_culture_set_goal(Database* db, const char* item_id, int is_goal, const char* goal_note);
int synapse_culture_delete_item(Database* db, const char* item_id);
char* synapse_culture_get_episodes(Database* db, const char* item_id);
int synapse_culture_add_episode(Database* db, const char* item_id, int episode_number, const char* title, const char* synopsis, int season_number, int episode_in_season, const char* aired_at);
int synapse_culture_toggle_episode_watched(Database* db, const char* episode_id, const char* item_id);
int synapse_culture_bulk_create_episodes(Database* db, const char* item_id, int count);
int synapse_culture_delete_episode(Database* db, const char* episode_id);

// Domain APIs: Calendar
char* synapse_calendar_get_events(Database* db);
char* synapse_calendar_get_event_by_id(Database* db, const char* event_id);
char* synapse_calendar_get_events_for_date(Database* db, const char* date_prefix, int include_null, int limit);
int synapse_calendar_create_event(Database* db, const char* title, const char* description, const char* start_date, const char* end_date, const char* event_type, const char* color, const char* page_id);
int synapse_calendar_create_event_with_options(Database* db, const char* title, const char* description, const char* start_date, const char* end_date, const char* event_type, const char* color, const char* page_id, const char* reminders_json, const char* recurrence);
char* synapse_calendar_create_event_with_options_result(Database* db, const char* title, const char* description, const char* start_date, const char* end_date, const char* event_type, const char* color, const char* page_id, const char* reminders_json, const char* recurrence);
int synapse_calendar_update_event(Database* db, const char* event_id, const char* title, const char* description, const char* start_date, const char* end_date, const char* color, const char* event_type, const char* page_id);
int synapse_calendar_update_event_with_options(Database* db, const char* event_id, const char* title, const char* description, const char* start_date, const char* end_date, const char* color, const char* event_type, const char* page_id, const char* reminders_json);
int synapse_calendar_toggle_status(Database* db, const char* event_id);
int synapse_calendar_delete_event(Database* db, const char* event_id);
int synapse_calendar_delete_event_series(Database* db, const char* event_id);
int synapse_calendar_mark_reminder_notified(Database* db, const char* event_id, int reminder_minutes);

// Domain APIs: Focus, Ambient Audio & Alarms
char* synapse_focus_get_lofis(Database* db);
int synapse_focus_add_lofi(Database* db, const char* title, const char* file_path, double duration);
int synapse_focus_delete_lofi(Database* db, const char* lofi_id);
char* synapse_focus_get_sessions(Database* db);
int synapse_focus_record_session(Database* db, const char* tag, int target_minutes, const char* status, const char* summary, const char* description);
int synapse_focus_delete_session(Database* db, const char* session_id);
int synapse_focus_clear_sessions_range(Database* db, const char* range);
char* synapse_focus_get_alarms(Database* db);
int synapse_focus_create_alarm(Database* db, const char* time, const char* label, const char* sound, int enabled, const char* days);
int synapse_focus_update_alarm(Database* db, const char* alarm_id, const char* time, const char* label, const char* sound, int enabled, const char* days);
int synapse_focus_toggle_alarm(Database* db, const char* alarm_id);
int synapse_focus_delete_alarm(Database* db, const char* alarm_id);

// Domain APIs: Notifications
char* synapse_notifications_get(Database* db);
int synapse_notifications_get_unread_count(Database* db);
char* synapse_notifications_deliver_due(Database* db);
int synapse_notifications_snooze(Database* db, const char* id, int delay_minutes, const char* title_suffix);
int synapse_notifications_add(Database* db, const char* title, const char* message, const char* notif_type, const char* target_page_id, const char* event_id, const char* scheduled_for);
int synapse_notifications_mark_read(Database* db, const char* notification_id);
int synapse_notifications_delete(Database* db, const char* notification_id);
int synapse_notifications_clear_all(Database* db);

// Domain APIs: Trash
char* synapse_trash_get_items(Database* db);
int synapse_trash_restore_item(Database* db, const char* id, const char* item_type);
int synapse_trash_delete_permanently(Database* db, const char* id, const char* item_type);
int synapse_trash_empty(Database* db);

// Domain APIs: Vault Credentials & Groups
char* synapse_vault_get_groups(Database* db);
char* synapse_vault_create_group(Database* db, const char* name, const char* icon, const char* color);
int synapse_vault_update_group(Database* db, const char* id, const char* name, const char* icon, const char* color, int position);
int synapse_vault_delete_group(Database* db, const char* id);
char* synapse_vault_get_items(Database* db, const char* group_id);
int synapse_vault_save_item(Database* db, const char* id, const char* group_id, const char* label, const char* username, const char* email, const char* password, const char* url, const char* notes, int is_favorite);
int synapse_vault_save_item_extended(Database* db, const char* id, const char* group_id, const char* label, const char* username, const char* email, const char* password, const char* url, const char* notes, const char* custom_fields, const char* login_type, int is_favorite);
int synapse_vault_delete_item(Database* db, const char* id);
char* synapse_vault_get_password_history(Database* db, const char* item_id);
int synapse_vault_check_password_strength(const char* password);

// Domain APIs: Files & Folders
char* synapse_files_get_folders(Database* db, const char* parent_id);
char* synapse_files_get_all_folders(Database* db);
char* synapse_files_create_folder(Database* db, const char* name, const char* parent_id, const char* color);
int synapse_files_rename_folder(Database* db, const char* folder_id, const char* new_name);
int synapse_files_move_folder(Database* db, const char* folder_id, const char* new_parent_id);
int synapse_files_delete_folder(Database* db, const char* folder_id);
char* synapse_files_get_for_section(Database* db, const char* section, const char* folder_id);
int synapse_files_get_drive_count(Database* db);
int synapse_files_rename_file(Database* db, const char* file_id, const char* name);
int synapse_files_move_file(Database* db, const char* file_id, const char* folder_id);
char* synapse_files_duplicate_file(Database* db, const char* file_id, const char* folder_id);
int synapse_files_delete_file(Database* db, const char* file_id);
int synapse_files_link_to_page(Database* db, const char* file_id, const char* page_id);
int synapse_files_unlink_from_page(Database* db, const char* file_id, const char* page_id);
char* synapse_files_get_linked_pages(Database* db, const char* file_id);
char* synapse_files_get_file(Database* db, const char* file_id);
int synapse_files_update_local_path(Database* db, const char* file_id, const char* local_path);
int synapse_files_create_file(Database* db, const char* id, const char* name, const char* file_type, int64_t file_size, const char* local_path, const char* folder_id, const char* mime_type);

// Domain APIs: Video & Media
char* synapse_video_get_all(Database* db, const char* filter);
char* synapse_video_get_one(Database* db, const char* video_id);
char* synapse_video_get_collections(Database* db);
int synapse_video_insert(Database* db, const char* video_json);
int synapse_video_update_progress(Database* db, const char* video_id, double progress);
int synapse_video_update_duration(Database* db, const char* video_id, double duration);
int synapse_video_delete(Database* db, const char* video_id);
char* synapse_video_get_folders(Database* db);
int synapse_video_save_folders(Database* db, const char* folders_json);
char* synapse_video_create_folder(Database* db, const char* name);
int synapse_video_rename_folder(Database* db, const char* folder_id, const char* name);
int synapse_video_delete_folder(Database* db, const char* folder_id);
int synapse_video_move_to_folder(Database* db, const char* video_id, const char* folder_id);
char* synapse_video_get_subtitles(Database* db, const char* video_id);
int synapse_video_update_subtitles(Database* db, const char* video_id, const char* subtitles_json, const char* local_subtitle_path);
int synapse_video_rename_subtitle(Database* db, const char* video_id, const char* track_id, const char* label);
char* synapse_video_remove_subtitle(Database* db, const char* video_id, const char* track_id);
char* synapse_video_get_words(Database* db, const char* video_id);
int synapse_video_add_word(Database* db, const char* video_id, const char* word, const char* context, double timestamp);
int synapse_video_delete_word(Database* db, const char* word_id);
char* synapse_video_parse_subtitle_cues(const char* subtitle_content);

// Domain APIs: Library & Reader
char* synapse_library_get_books(Database* db, const char* filter);
char* synapse_library_get_book(Database* db, const char* book_id);
int synapse_library_insert_book(Database* db, const char* book_json);
int synapse_library_update_progress(Database* db, const char* book_id, int current_page, int total_pages, const char* reading_status);
int synapse_library_update_status(Database* db, const char* book_id, const char* status);
int synapse_library_set_archived(Database* db, const char* book_id, int archived);
int synapse_library_update_metadata(Database* db, const char* book_id, const char* title, const char* author, const char* description, int published_year, const char* publisher, const char* language);
int synapse_library_update_cover(Database* db, const char* book_id, const char* cover_image, const char* cover_color);
int synapse_library_delete_book(Database* db, const char* book_id);
char* synapse_library_get_collections(Database* db);
char* synapse_library_create_collection(Database* db, const char* name, const char* color);
int synapse_library_update_collection(Database* db, const char* collection_id, const char* name, const char* color);
int synapse_library_delete_collection(Database* db, const char* collection_id);
int synapse_library_set_book_collections(Database* db, const char* book_id, const char* collection_ids_json);
char* synapse_library_get_bookmarks(Database* db, const char* book_id);
char* synapse_library_add_bookmark(Database* db, const char* book_id, int page_number, const char* label);
int synapse_library_update_bookmark(Database* db, const char* bookmark_id, const char* label);
int synapse_library_delete_bookmark(Database* db, const char* bookmark_id);
char* synapse_library_get_highlights(Database* db, const char* book_id);
char* synapse_library_add_highlight(Database* db, const char* book_id, int page_number, const char* text_content, const char* color, const char* note);
int synapse_library_update_highlight(Database* db, const char* highlight_id, const char* color, const char* note);
int synapse_library_update_highlight_note(Database* db, const char* highlight_id, const char* note);
int synapse_library_delete_highlight(Database* db, const char* highlight_id);
char* synapse_library_start_reading_session(Database* db, const char* book_id, int start_page);
int synapse_library_end_reading_session(Database* db, const char* session_id, int end_page, int start_page);
char* synapse_library_get_reading_stats(Database* db);

// Domain APIs: Notes & Pages
char* synapse_notes_get_pages(Database* db, const char* filter);
char* synapse_notes_get_pinned_pages(Database* db);
char* synapse_notes_get_recent_pages(Database* db, int limit);
char* synapse_notes_get_page_tree(Database* db, const char* filter);
char* synapse_notes_get_page(Database* db, const char* page_id);
char* synapse_notes_create_subpage(Database* db, const char* parent_id, const char* title, const char* icon);
int synapse_notes_save_page(Database* db, const char* id, const char* title, const char* content, const char* encrypted_content, const char* icon);
int synapse_notes_rename_page(Database* db, const char* page_id, const char* title);
int synapse_notes_update_icon(Database* db, const char* page_id, const char* icon);
int synapse_notes_update_description(Database* db, const char* page_id, const char* description);
int synapse_notes_update_cover(Database* db, const char* page_id, const char* cover_image);
int synapse_notes_toggle_pin(Database* db, const char* page_id);
int synapse_notes_delete_page(Database* db, const char* page_id);
int synapse_notes_restore_page(Database* db, const char* page_id);
int synapse_notes_move_page(Database* db, const char* page_id, const char* new_parent_id);
int synapse_notes_reorder_pages(Database* db, const char* parent_id, const char* page_ids_json);
char* synapse_notes_record_history(Database* db, const char* page_id, const char* content, const char* encrypted_content);
char* synapse_notes_get_history(Database* db, const char* page_id);
int synapse_notes_restore_revision(Database* db, const char* page_id, const char* revision_id);
char* synapse_notes_get_link_metadata(Database* db, const char* url);
int synapse_notes_save_link_metadata(Database* db, const char* metadata_json);
char* synapse_notes_get_link_entity(Database* db, const char* canonical_url);
int synapse_notes_save_link_entity(Database* db, const char* canonical_url, const char* entity_json);
char* synapse_notes_parse_blocks(const char* html);
char* synapse_notes_serialize_blocks(const char* blocks_json);
char* synapse_notes_hydrate_from_crdt(const char* html, const char* crdt_base64);
char* synapse_notes_apply_search_replace(const char* original, const char* ai_response);
char* synapse_notes_compute_word_diff_html(const char* old_text, const char* new_text);
char* synapse_notes_find_duplicate_links(Database* db, const char* url, const char* exclude_page_id);
char* synapse_notes_split_rich_html(const char* html, int text_offset);
char* synapse_notes_compute_equal_column_widths(int column_count);
char* synapse_notes_parse_table_columns(const char* table_html);
char* synapse_notes_parse_table_columns_at(const char* note_html, int table_index);
char* synapse_notes_update_table_column_schema_at(const char* note_html, int table_index,
                                                  int column_index, const char* column_type,
                                                  const char* options_json, const char* number_format,
                                                  const char* date_format);
char* synapse_notes_update_table_column_width_at(const char* note_html, int table_index,
                                                 int column_index, int width_px);
char* synapse_notes_validate_table_cells(const char* table_html);
char* synapse_notes_validate_table_cells_at(const char* note_html, int table_index);
char* synapse_notes_evaluate_table_filter(const char* table_html, const char* filters_json);
char* synapse_notes_evaluate_table_filter_at(const char* note_html, int table_index, const char* filters_json);
char* synapse_notes_filter_table_rows_for_view(const char* note_html, int table_index, const char* filters_json);
char* synapse_notes_move_table_column(const char* table_html, int from_col, int to_col);
char* synapse_notes_move_table_column_at(const char* note_html, int table_index, int from_col, int to_col);
char* synapse_notes_move_table_row(const char* table_html, int from_row, int to_row);
char* synapse_notes_move_table_row_at(const char* note_html, int table_index, int from_row, int to_row);
char* synapse_notes_extract_loose_file_ids(const char* html);
char* synapse_notes_render_mermaid_data_uri(const char* chart);
char* synapse_notes_render_mermaid_svg(const char* chart);
char* synapse_notes_canonical_link_url(const char* raw_url);
char* synapse_notes_default_link_entity(const char* canonical_url, const char* original_url);
char* synapse_notes_get_cached_image_data_uri(Database* db, const char* image_id, const char* key_hex);
int synapse_notes_put_cached_image_bytes(Database* db, const char* image_id, const unsigned char* data, int data_len, const char* mime_type, const char* key_hex);
int synapse_notes_delete_cached_image(Database* db, const char* image_id);

// Domain APIs: Practice & AI Tutor
char* synapse_practice_get_sessions(Database* db);
char* synapse_practice_get_session(Database* db, const char* session_id);
char* synapse_practice_create_session(Database* db, const char* title, const char* custom_prompt);
int synapse_practice_delete_session(Database* db, const char* session_id);
char* synapse_practice_get_messages(Database* db, const char* session_id);
char* synapse_practice_create_message(Database* db, const char* session_id, const char* role, const char* text_content);
char* synapse_practice_get_memories(Database* db);
char* synapse_practice_create_memory(Database* db, const char* category, const char* fact);
int synapse_practice_delete_memory(Database* db, const char* memory_id);

// Domain APIs: Whiteboard Diagrams
char* synapse_diagrams_get_all(Database* db);
char* synapse_diagrams_get(Database* db, const char* id);
char* synapse_diagrams_create(Database* db, const char* title, const char* icon);
int synapse_diagrams_save(Database* db, const char* id, const char* title, const char* content, const char* encrypted_content, const char* icon);
int synapse_diagrams_delete(Database* db, const char* id);
char* synapse_diagrams_extract_qt_shapes(const char* raw_content);
char* synapse_diagrams_encode_tldraw_v2(const char* shapes_json, const char* existing_raw);
char* synapse_diagrams_export_svg(const char* shapes_json);

// Domain APIs: Global Config & Preferences
char* synapse_config_get(Database* db, const char* key);
int synapse_config_set(Database* db, const char* key, const char* value);

#ifdef __cplusplus
}
#endif

#endif // SYNAPSE_BRIDGE_H

