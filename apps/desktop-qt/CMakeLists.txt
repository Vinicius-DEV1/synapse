cmake_minimum_required(VERSION 3.16)
project(synapse_desktop LANGUAGES CXX C)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_AUTOUIC ON)

find_package(Qt6 6.2 REQUIRED COMPONENTS Core Gui Quick Qml OpenGL Network Concurrent)

find_package(PkgConfig REQUIRED)
pkg_check_modules(MPV REQUIRED mpv)
pkg_check_modules(LIBARCHIVE REQUIRED libarchive)

# Synapse Rust Bridge Static Library
if(EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/../../target/release/libsynapse_bridge_qt.a")
    set(SYNAPSE_BRIDGE_LIB "${CMAKE_CURRENT_SOURCE_DIR}/../../target/release/libsynapse_bridge_qt.a")
else()
    set(SYNAPSE_BRIDGE_LIB "${CMAKE_CURRENT_SOURCE_DIR}/../../target/debug/libsynapse_bridge_qt.a")
endif()

add_executable(synapse-desktop
    src/main.cpp
    src/synapse_controller.cpp
    src/synapse_controller.h
    src/controllers/platform/database_prepared_controller.cpp
    src/controllers/notes/notes_controller.cpp
    src/controllers/notes/notes_link_metadata_controller.cpp
    src/controllers/notes/notes_link_vault_controller.cpp
    src/controllers/notes/notes_reference_search_controller.cpp
    src/controllers/notes/notes_code_syntax_highlighter.cpp
    src/controllers/notes/notes_code_syntax_highlighter.h
    src/controllers/notes/notes_text_operations.cpp
    src/controllers/notes/notes_rich_page_reference_actions.cpp
    src/controllers/notes/notes_rich_image_controller.cpp
    src/controllers/notes/notes_rich_image_export.cpp
    src/controllers/notes/notes_rich_image_crop.cpp
    src/controllers/notes/notes_rich_images.cpp
    src/controllers/notes/notes_rich_image_insertions.cpp
    src/controllers/notes/notes_rich_image_properties.cpp
    src/controllers/notes/notes_rich_image_editing.cpp
    src/controllers/notes/notes_rich_image_editing.h
    src/controllers/notes/notes_rich_image_operations.cpp
    src/controllers/notes/notes_text_table_operations.cpp
    src/controllers/notes/notes_rich_slash_commands.cpp
    src/controllers/notes/notes_rich_slash_commands.h
    src/controllers/notes/notes_rich_document.cpp
    src/controllers/notes/notes_rich_inline_marks.cpp
    src/controllers/notes/notes_rich_callouts.cpp
    src/controllers/notes/notes_rich_code_blocks.cpp
    src/controllers/notes/notes_rich_spoilers.cpp
    src/controllers/notes/notes_rich_block_editing.cpp
    src/controllers/notes/notes_rich_divider_editing.cpp
    src/controllers/notes/notes_rich_serialization.cpp
    src/controllers/notes/notes_rich_list_serialization.cpp
    src/controllers/notes/notes_rich_markup.cpp
    src/controllers/notes/notes_rich_tables.cpp
    src/controllers/notes/notes_rich_table_cell_formatting.cpp
        src/controllers/notes/notes_rich_table_cell_selection.cpp
    src/controllers/notes/notes_rich_table_structure_range.cpp
    src/controllers/notes/notes_rich_table_operations.cpp
    src/controllers/notes/notes_rich_table_movement.cpp
    src/controllers/notes/notes_rich_table_movement.h
    src/controllers/notes/notes_rich_table_merging.cpp
    src/controllers/notes/notes_rich_table_merging.h
    src/controllers/notes/notes_rich_table_styles.cpp
    src/controllers/notes/notes_rich_heading.cpp
    src/controllers/notes/notes_rich_validation.cpp
    src/controllers/notes/notes_rich_validation_semantics.cpp
    src/controllers/notes/notes_rich_validation_semantics.h
    src/controllers/notes/notes_rich_task_markup.cpp
    src/controllers/notes/notes_rich_task_lists.cpp
    src/controllers/notes/notes_rich_task_checkbox.cpp
    src/controllers/notes/notes_rich_task_checkbox.h
    src/controllers/notes/notes_cover_controller.cpp
    src/controllers/notes/notes_hierarchy_controller.cpp
    src/controllers/anki/anki_decks_controller.cpp
    src/controllers/anki/anki_cards_controller.cpp
    src/controllers/questions/quiz_controller.cpp
    src/controllers/finance/finance_controller.cpp
    src/controllers/habits/habits_controller.cpp
    src/controllers/calendar/calendar_controller.cpp
    src/controllers/culture/culture_controller.cpp
    src/controllers/focus/focus_controller.cpp
    src/controllers/practice/practice_controller.cpp
    src/controllers/vault/vault_items_controller.cpp
    src/controllers/vault/vault_groups_controller.cpp
    src/controllers/vault/vault_security_controller.cpp
    src/controllers/files/files_browser_controller.cpp
    src/controllers/files/files_items_controller.cpp
    src/controllers/files/files_transfer_controller.cpp
    src/controllers/files/files_preview_controller.cpp
    src/controllers/platform/system_controller.cpp
    src/controllers/layout/task_manager_controller.cpp
    src/controllers/trash/trash_controller.cpp
    src/controllers/home/home_controller.cpp
    src/controllers/notifications/notifications_controller.cpp
    src/controllers/vault/vault_auth_controller.cpp
    src/controllers/vault/vault_setup_controller.cpp
    src/controllers/vault/vault_setup_assets_controller.cpp
    src/controllers/vault/vault_password_controller.cpp
    src/controllers/vault/vault_asset_migration_controller.cpp
    src/controllers/vault/vault_removal_controller.cpp
    src/controllers/video/video_controller.cpp
    src/controllers/video/video_storage_controller.cpp
    src/controllers/video/video_subtitles_controller.cpp
    src/controllers/video/video_subtitle_metadata_controller.cpp
    src/controllers/video/video_subtitle_import_controller.cpp
    src/controllers/video/video_subtitle_helpers.cpp
    src/controllers/video/video_subtitle_format.cpp
    src/controllers/video/video_catalog_controller.cpp
    src/controllers/video/video_collections_controller.cpp
    src/controllers/library/library_controller.cpp
    src/controllers/library/library_cover_controller.cpp
    src/controllers/library/library_collections_controller.cpp
    src/controllers/library/library_reader_controller.cpp
    src/controllers/library/library_stats_controller.cpp
    src/controllers/library/library_metadata_controller.cpp
    src/controllers/library/library_search_controller.cpp
    src/native_book_reader.cpp
    src/native_book_metadata.cpp
    src/native_book_cover.cpp
    src/native_book_search.cpp
    src/native_video_metadata.cpp
    src/mpv_player_item.cpp
    src/mpv_player_item.h
    src/video/encrypted_video_stream.cpp
    src/video/encrypted_video_stream.h
    src/video/mpv_track_selection.cpp
    src/video/mpv_track_parser.cpp
    src/video/mpv_track_parser.h
    src/video/mpv_player_events.cpp
)

target_include_directories(synapse-desktop PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/src
    ${CMAKE_CURRENT_SOURCE_DIR}/../../bridges/bridge-qt/include
    ${MPV_INCLUDE_DIRS}
    ${LIBARCHIVE_INCLUDE_DIRS}
)

target_link_libraries(synapse-desktop PRIVATE
    Qt6::Core
    Qt6::Gui
    Qt6::Quick
    Qt6::Qml
    Qt6::OpenGL
    Qt6::Network
    Qt6::Concurrent
    ${MPV_LIBRARIES}
    ${LIBARCHIVE_LIBRARIES}
    ${SYNAPSE_BRIDGE_LIB}
    pthread
    dl
    m
)

target_compile_definitions(synapse-desktop PRIVATE
    $<$<CONFIG:Debug>:QT_QML_DEBUG>
)

option(SYNAPSE_BUILD_NATIVE_TESTS "Build native desktop controller tests" OFF)
if(SYNAPSE_BUILD_NATIVE_TESTS)
    enable_testing()
    find_package(Qt6 6.2 REQUIRED COMPONENTS Test)

    add_executable(synapse-desktop-tests
        tests/native_test_main.cpp
        tests/crypto/native_vault_crypto_test.cpp
        tests/notes/native_notes_test.cpp
        tests/notes/native_notes_link_vault_test.cpp
        tests/notes/native_notes_rich_images_test.cpp
        tests/notes/native_notes_rich_image_clipboard_test.cpp
        tests/notes/native_notes_reference_search_test.cpp
        tests/notes/native_notes_rich_tables_test.cpp
        tests/notes/native_notes_table_structure_test.cpp
        tests/notes/native_notes_table_merge_test.cpp
        tests/notes/native_notes_table_background_selection_test.cpp
        tests/notes/native_notes_table_clear_formatting_test.cpp
        tests/notes/native_notes_table_cell_selection_test.cpp
        tests/notes/native_notes_callout_test.cpp
        tests/notes/native_notes_code_language_test.cpp
        tests/notes/native_notes_divider_drag_test.cpp
        tests/finance/native_finance_test.cpp
        tests/questions/native_questions_test.cpp
        tests/calendar/native_calendar_test.cpp
        tests/video/native_video_test.cpp
        tests/video/native_video_subtitle_test.cpp
        tests/library/native_library_test.cpp
        tests/library/native_library_cover_test.cpp
        tests/files/native_files_test.cpp
        tests/anki/native_anki_test.cpp
        tests/habits/native_habits_test.cpp
        tests/culture/native_culture_test.cpp
        tests/focus/native_focus_test.cpp
        tests/notifications/native_notifications_test.cpp
        tests/trash/native_trash_test.cpp
        tests/settings/native_settings_test.cpp
        tests/home/native_home_test.cpp
        tests/layout/native_layout_test.cpp
        tests/diagrams/native_diagrams_test.cpp
        tests/practice/native_practice_test.cpp
        src/video/mpv_track_parser.cpp
        src/synapse_controller.cpp
        src/controllers/platform/database_prepared_controller.cpp
        src/controllers/notes/notes_controller.cpp
        src/controllers/notes/notes_link_metadata_controller.cpp
        src/controllers/notes/notes_link_vault_controller.cpp
        src/controllers/notes/notes_reference_search_controller.cpp
        src/controllers/notes/notes_code_syntax_highlighter.cpp
        src/controllers/notes/notes_code_syntax_highlighter.h
        src/controllers/notes/notes_text_operations.cpp
        src/controllers/notes/notes_rich_page_reference_actions.cpp
        src/controllers/notes/notes_rich_image_controller.cpp
        src/controllers/notes/notes_rich_image_export.cpp
        src/controllers/notes/notes_rich_image_crop.cpp
        src/controllers/notes/notes_rich_images.cpp
        src/controllers/notes/notes_rich_image_insertions.cpp
        src/controllers/notes/notes_rich_image_properties.cpp
        src/controllers/notes/notes_rich_image_editing.cpp
        src/controllers/notes/notes_rich_image_editing.h
        src/controllers/notes/notes_rich_image_operations.cpp
        src/controllers/notes/notes_text_table_operations.cpp
        src/controllers/notes/notes_rich_slash_commands.cpp
        src/controllers/notes/notes_rich_slash_commands.h
        src/controllers/notes/notes_rich_document.cpp
        src/controllers/notes/notes_rich_inline_marks.cpp
        src/controllers/notes/notes_rich_callouts.cpp
        src/controllers/notes/notes_rich_code_blocks.cpp
        src/controllers/notes/notes_rich_spoilers.cpp
        src/controllers/notes/notes_rich_block_editing.cpp
    src/controllers/notes/notes_rich_divider_editing.cpp
        src/controllers/notes/notes_rich_serialization.cpp
        src/controllers/notes/notes_rich_list_serialization.cpp
        src/controllers/notes/notes_rich_markup.cpp
        src/controllers/notes/notes_rich_tables.cpp
        src/controllers/notes/notes_rich_table_cell_formatting.cpp
        src/controllers/notes/notes_rich_table_cell_selection.cpp
        src/controllers/notes/notes_rich_table_structure_range.cpp
        src/controllers/notes/notes_rich_table_operations.cpp
        src/controllers/notes/notes_rich_table_movement.cpp
        src/controllers/notes/notes_rich_table_movement.h
        src/controllers/notes/notes_rich_table_merging.cpp
        src/controllers/notes/notes_rich_table_merging.h
        src/controllers/notes/notes_rich_table_styles.cpp
        src/controllers/notes/notes_rich_heading.cpp
        src/controllers/notes/notes_rich_validation.cpp
        src/controllers/notes/notes_rich_validation_semantics.cpp
        src/controllers/notes/notes_rich_validation_semantics.h
        src/controllers/notes/notes_rich_task_markup.cpp
        src/controllers/notes/notes_rich_task_lists.cpp
        src/controllers/notes/notes_rich_task_checkbox.cpp
        src/controllers/notes/notes_rich_task_checkbox.h
        src/controllers/notes/notes_cover_controller.cpp
        src/controllers/notes/notes_hierarchy_controller.cpp
        src/controllers/anki/anki_decks_controller.cpp
        src/controllers/anki/anki_cards_controller.cpp
        src/controllers/questions/quiz_controller.cpp
        src/controllers/finance/finance_controller.cpp
        src/controllers/habits/habits_controller.cpp
        src/controllers/calendar/calendar_controller.cpp
        src/controllers/culture/culture_controller.cpp
        src/controllers/focus/focus_controller.cpp
        src/controllers/practice/practice_controller.cpp
        src/controllers/vault/vault_items_controller.cpp
        src/controllers/vault/vault_groups_controller.cpp
        src/controllers/vault/vault_security_controller.cpp
        src/controllers/files/files_browser_controller.cpp
        src/controllers/files/files_items_controller.cpp
        src/controllers/files/files_transfer_controller.cpp
        src/controllers/files/files_preview_controller.cpp
        src/controllers/platform/system_controller.cpp
        src/controllers/layout/task_manager_controller.cpp
        src/controllers/trash/trash_controller.cpp
        src/controllers/home/home_controller.cpp
        src/controllers/notifications/notifications_controller.cpp
        src/controllers/vault/vault_auth_controller.cpp
        src/controllers/vault/vault_setup_controller.cpp
        src/controllers/vault/vault_setup_assets_controller.cpp
        src/controllers/vault/vault_password_controller.cpp
        src/controllers/vault/vault_asset_migration_controller.cpp
        src/controllers/vault/vault_removal_controller.cpp
        src/controllers/video/video_controller.cpp
        src/controllers/video/video_storage_controller.cpp
        src/controllers/video/video_subtitles_controller.cpp
        src/controllers/video/video_subtitle_metadata_controller.cpp
        src/controllers/video/video_subtitle_import_controller.cpp
        src/controllers/video/video_subtitle_helpers.cpp
        src/controllers/video/video_subtitle_format.cpp
        src/controllers/video/video_catalog_controller.cpp
        src/controllers/video/video_collections_controller.cpp
        src/controllers/library/library_controller.cpp
        src/controllers/library/library_cover_controller.cpp
        src/controllers/library/library_collections_controller.cpp
        src/controllers/library/library_reader_controller.cpp
        src/controllers/library/library_stats_controller.cpp
        src/controllers/library/library_metadata_controller.cpp
        src/controllers/library/library_search_controller.cpp
        src/native_book_reader.cpp
        src/native_book_metadata.cpp
        src/native_book_cover.cpp
        src/native_book_search.cpp
        src/native_video_metadata.cpp
        src/synapse_controller.h
    )

    target_include_directories(synapse-desktop-tests PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/src
        ${CMAKE_CURRENT_SOURCE_DIR}/../../bridges/bridge-qt/include
        ${MPV_INCLUDE_DIRS}
        ${LIBARCHIVE_INCLUDE_DIRS}
    )
    target_compile_definitions(synapse-desktop-tests PRIVATE
        SYNAPSE_DESKTOP_SOURCE_DIR="${CMAKE_CURRENT_SOURCE_DIR}"
    )

    target_link_libraries(synapse-desktop-tests PRIVATE
        Qt6::Core
        Qt6::Gui
        Qt6::Quick
        Qt6::Qml
        Qt6::Network
        Qt6::Concurrent
        Qt6::Test
        ${SYNAPSE_BRIDGE_LIB}
        ${LIBARCHIVE_LIBRARIES}
        pthread
        dl
        m
    )

    add_test(NAME native-priority-modules COMMAND synapse-desktop-tests)
    set_tests_properties(native-priority-modules PROPERTIES ENVIRONMENT "QT_QPA_PLATFORM=offscreen")

    add_executable(synapse-notes-rich-qml-tests
        tests/notes/native_rich_qml_test.cpp
        tests/notes/native_notes_mock_controller.h
        tests/notes/native_notes_slash_menu_qml_test.cpp
        tests/notes/native_notes_page_reference_qml_test.cpp
        tests/notes/native_notes_page_reference_slash_qml_test.cpp
        tests/notes/native_notes_rich_images_qml_test.cpp
        tests/notes/native_notes_rich_image_movement_qml_test.cpp
        tests/notes/native_notes_rich_image_clipboard_qml_test.cpp
        tests/notes/native_notes_rich_image_deletion_qml_test.cpp
        tests/notes/native_notes_rich_image_drop_qml_test.cpp
        tests/notes/native_notes_link_preview_qml_test.cpp
        tests/notes/native_notes_link_color_qml_test.cpp
        tests/notes/native_notes_reference_search_qml_test.cpp
        tests/notes/native_notes_reference_actions_qml_test.cpp
        tests/notes/native_notes_callout_qml_test.cpp
        tests/notes/native_notes_code_language_qml_test.cpp
        src/controllers/notes/notes_code_syntax_highlighter.cpp
        src/controllers/notes/notes_code_syntax_highlighter.h
        tests/notes/native_notes_divider_drag_qml_test.cpp
        src/controllers/notes/notes_text_operations.cpp
        src/controllers/notes/notes_rich_images.cpp
        src/controllers/notes/notes_rich_image_insertions.cpp
        src/controllers/notes/notes_rich_image_properties.cpp
        src/controllers/notes/notes_rich_image_editing.cpp
        src/controllers/notes/notes_rich_image_editing.h
        src/controllers/notes/notes_rich_image_operations.cpp
        src/controllers/notes/notes_rich_page_reference_actions.cpp
        src/controllers/notes/notes_text_table_operations.cpp
        src/controllers/notes/notes_rich_slash_commands.cpp
        src/controllers/notes/notes_rich_slash_commands.h
        src/controllers/notes/notes_rich_document.cpp
        src/controllers/notes/notes_rich_inline_marks.cpp
        src/controllers/notes/notes_rich_callouts.cpp
        src/controllers/notes/notes_rich_code_blocks.cpp
        src/controllers/notes/notes_rich_spoilers.cpp
        src/controllers/notes/notes_rich_block_editing.cpp
    src/controllers/notes/notes_rich_divider_editing.cpp
        src/controllers/notes/notes_rich_serialization.cpp
        src/controllers/notes/notes_rich_list_serialization.cpp
        src/controllers/notes/notes_rich_markup.cpp
        src/controllers/notes/notes_rich_tables.cpp
        src/controllers/notes/notes_rich_table_cell_formatting.cpp
        src/controllers/notes/notes_rich_table_cell_selection.cpp
        src/controllers/notes/notes_rich_table_structure_range.cpp
        src/controllers/notes/notes_rich_table_operations.cpp
        src/controllers/notes/notes_rich_table_movement.cpp
        src/controllers/notes/notes_rich_table_movement.h
        src/controllers/notes/notes_rich_table_merging.cpp
        src/controllers/notes/notes_rich_table_merging.h
        src/controllers/notes/notes_rich_table_styles.cpp
        src/controllers/notes/notes_rich_heading.cpp
        src/controllers/notes/notes_rich_validation.cpp
        src/controllers/notes/notes_rich_validation_semantics.cpp
        src/controllers/notes/notes_rich_validation_semantics.h
        src/controllers/notes/notes_rich_task_markup.cpp
        src/controllers/notes/notes_rich_task_lists.cpp
        src/controllers/notes/notes_rich_task_checkbox.cpp
        src/controllers/notes/notes_rich_task_checkbox.h
    )
    target_include_directories(synapse-notes-rich-qml-tests PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/src)
    target_compile_definitions(synapse-notes-rich-qml-tests PRIVATE
        SYNAPSE_DESKTOP_SOURCE_DIR="${CMAKE_CURRENT_SOURCE_DIR}"
    )
    target_link_libraries(synapse-notes-rich-qml-tests PRIVATE Qt6::Core Qt6::Gui Qt6::Quick Qt6::Qml Qt6::Test)
    add_test(NAME native-notes-rich-qml COMMAND synapse-notes-rich-qml-tests)
    set_tests_properties(native-notes-rich-qml PROPERTIES ENVIRONMENT "QT_QPA_PLATFORM=offscreen")

    add_executable(synapse-notes-table-qml-tests
        tests/notes/native_rich_table_qml_test.cpp
        tests/notes/native_notes_table_merge_qml_test.cpp
        tests/notes/native_notes_table_background_selection_qml_test.cpp
        tests/notes/native_notes_table_clear_formatting_qml_test.cpp
        tests/notes/native_notes_table_cell_selection_qml_test.cpp
        tests/notes/native_notes_table_structure_qml_test.cpp
        tests/notes/native_notes_spoiler_geometry_qml_test.cpp
        src/controllers/notes/notes_code_syntax_highlighter.cpp
        src/controllers/notes/notes_code_syntax_highlighter.h
        src/controllers/notes/notes_text_operations.cpp
        src/controllers/notes/notes_rich_page_reference_actions.cpp
        src/controllers/notes/notes_rich_images.cpp
        src/controllers/notes/notes_rich_image_insertions.cpp
        src/controllers/notes/notes_rich_image_properties.cpp
        src/controllers/notes/notes_rich_image_editing.cpp
        src/controllers/notes/notes_rich_image_editing.h
        src/controllers/notes/notes_rich_image_operations.cpp
        src/controllers/notes/notes_text_table_operations.cpp
        src/controllers/notes/notes_rich_slash_commands.cpp
        src/controllers/notes/notes_rich_slash_commands.h
        src/controllers/notes/notes_rich_document.cpp
        src/controllers/notes/notes_rich_inline_marks.cpp
        src/controllers/notes/notes_rich_callouts.cpp
        src/controllers/notes/notes_rich_code_blocks.cpp
        src/controllers/notes/notes_rich_spoilers.cpp
        src/controllers/notes/notes_rich_block_editing.cpp
    src/controllers/notes/notes_rich_divider_editing.cpp
        src/controllers/notes/notes_rich_serialization.cpp
        src/controllers/notes/notes_rich_list_serialization.cpp
        src/controllers/notes/notes_rich_markup.cpp
        src/controllers/notes/notes_rich_tables.cpp
        src/controllers/notes/notes_rich_table_cell_formatting.cpp
        src/controllers/notes/notes_rich_table_cell_selection.cpp
        src/controllers/notes/notes_rich_table_structure_range.cpp
        src/controllers/notes/notes_rich_table_operations.cpp
        src/controllers/notes/notes_rich_table_movement.cpp
        src/controllers/notes/notes_rich_table_movement.h
        src/controllers/notes/notes_rich_table_merging.cpp
        src/controllers/notes/notes_rich_table_merging.h
        src/controllers/notes/notes_rich_table_styles.cpp
        src/controllers/notes/notes_rich_heading.cpp
        src/controllers/notes/notes_rich_validation.cpp
        src/controllers/notes/notes_rich_validation_semantics.cpp
        src/controllers/notes/notes_rich_validation_semantics.h
        src/controllers/notes/notes_rich_task_markup.cpp
        src/controllers/notes/notes_rich_task_lists.cpp
        src/controllers/notes/notes_rich_task_checkbox.cpp
        src/controllers/notes/notes_rich_task_checkbox.h
    )
    target_include_directories(synapse-notes-table-qml-tests PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/src)
    target_compile_definitions(synapse-notes-table-qml-tests PRIVATE
        SYNAPSE_DESKTOP_SOURCE_DIR="${CMAKE_CURRENT_SOURCE_DIR}"
    )
    target_link_libraries(synapse-notes-table-qml-tests PRIVATE Qt6::Core Qt6::Gui Qt6::Quick Qt6::Qml Qt6::Test)
    add_test(NAME native-notes-table-qml COMMAND synapse-notes-table-qml-tests)
    set_tests_properties(native-notes-table-qml PROPERTIES ENVIRONMENT "QT_QPA_PLATFORM=offscreen")
endif()
