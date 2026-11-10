cmake_minimum_required(VERSION 3.16)
project(synapse_desktop LANGUAGES CXX C)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_AUTOUIC ON)

find_package(Qt6 6.2 REQUIRED COMPONENTS Core Gui Quick Qml OpenGL Network)

find_package(PkgConfig REQUIRED)
pkg_check_modules(MPV REQUIRED mpv)

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
    src/mpv_player_item.cpp
    src/mpv_player_item.h
)

target_include_directories(synapse-desktop PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/src
    ${CMAKE_CURRENT_SOURCE_DIR}/../../bridges/bridge-qt/include
    ${MPV_INCLUDE_DIRS}
)

target_link_libraries(synapse-desktop PRIVATE
    Qt6::Core
    Qt6::Gui
    Qt6::Quick
    Qt6::Qml
    Qt6::OpenGL
    Qt6::Network
    ${MPV_LIBRARIES}
    ${SYNAPSE_BRIDGE_LIB}
    pthread
    dl
    m
)

target_compile_definitions(synapse-desktop PRIVATE
    $<$<CONFIG:Debug>:QT_QML_DEBUG>
)
