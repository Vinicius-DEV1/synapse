#!/usr/bin/env python3
"""
Synapse Desktop Qt Translation Extractor & Catalog Generator
Extracts all qsTr(...) and tr(...) strings from QML and C++ files,
and generates standard Qt Linguist XML catalogs (.ts) in apps/desktop-qt/i18n/.
"""

import os
import re
import sys
import xml.sax.saxutils as saxutils

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
I18N_DIR = os.path.join(ROOT_DIR, "i18n")

QSTR_PATTERN = re.compile(r'qsTr\(\s*"(.*?)"\s*\)', re.DOTALL)
TR_PATTERN = re.compile(r'\btr\(\s*"(.*?)"\s*\)', re.DOTALL)

def extract_strings():
    catalog = {}  # {context: [(source, line_num)]}
    
    # 1. Walk QML directory
    qml_dir = os.path.join(ROOT_DIR, "qml")
    for root, _, files in os.walk(qml_dir):
        for f in files:
            if f.endswith(".qml") or f.endswith(".js"):
                filepath = os.path.join(root, f)
                rel_path = os.path.relpath(filepath, ROOT_DIR)
                context = os.path.splitext(f)[0]
                with open(filepath, "r", encoding="utf-8", errors="ignore") as fh:
                    content = fh.read()
                    matches = QSTR_PATTERN.findall(content)
                    if matches:
                        if context not in catalog:
                            catalog[context] = []
                        for m in matches:
                            clean_str = m.replace('\\"', '"').replace('\\n', '\n')
                            catalog[context].append((clean_str, rel_path))

    # 2. Walk C++ src directory
    src_dir = os.path.join(ROOT_DIR, "src")
    for root, _, files in os.walk(src_dir):
        for f in files:
            if f.endswith(".cpp") or f.endswith(".h"):
                filepath = os.path.join(root, f)
                rel_path = os.path.relpath(filepath, ROOT_DIR)
                context = os.path.splitext(f)[0]
                with open(filepath, "r", encoding="utf-8", errors="ignore") as fh:
                    content = fh.read()
                    matches = TR_PATTERN.findall(content)
                    if matches:
                        if context not in catalog:
                            catalog[context] = []
                        for m in matches:
                            clean_str = m.replace('\\"', '"').replace('\\n', '\n')
                            catalog[context].append((clean_str, rel_path))

    return catalog

def write_ts_file(catalog, lang, output_path):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    lines = [
        '<?xml version="1.0" encoding="utf-8"?>',
        '<!DOCTYPE TS>',
        f'<TS version="2.1" language="{lang}">',
    ]

    total_messages = 0
    for context, items in sorted(catalog.items()):
        seen = set()
        unique_items = []
        for src, rel_path in items:
            if src not in seen:
                seen.add(src)
                unique_items.append((src, rel_path))

        if not unique_items:
            continue

        lines.append(f'  <context>')
        lines.append(f'    <name>{saxutils.escape(context)}</name>')
        for src, rel_path in unique_items:
            total_messages += 1
            esc_src = saxutils.escape(src)
            # In pt_BR source strings are largely identical to source
            # In en, if translation is pending it can be tagged type="unfinished"
            if lang == "pt_BR":
                trans = esc_src
                lines.append(f'    <message>')
                lines.append(f'      <source>{esc_src}</source>')
                lines.append(f'      <translation>{trans}</translation>')
                lines.append(f'    </message>')
            else:
                lines.append(f'    <message>')
                lines.append(f'      <source>{esc_src}</source>')
                lines.append(f'      <translation type="unfinished">{esc_src}</translation>')
                lines.append(f'    </message>')
        lines.append(f'  </context>')

    lines.append('</TS>')
    
    with open(output_path, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")

    return total_messages

def main():
    print(f"[i18n] Extracting translations from {ROOT_DIR}...")
    catalog = extract_strings()
    
    pt_path = os.path.join(I18N_DIR, "synapse_pt_BR.ts")
    en_path = os.path.join(I18N_DIR, "synapse_en.ts")

    total_pt = write_ts_file(catalog, "pt_BR", pt_path)
    total_en = write_ts_file(catalog, "en_US", en_path)

    print(f"[i18n] Generated {pt_path} with {total_pt} strings across {len(catalog)} contexts.")
    print(f"[i18n] Generated {en_path} with {total_en} strings across {len(catalog)} contexts.")

if __name__ == "__main__":
    main()
