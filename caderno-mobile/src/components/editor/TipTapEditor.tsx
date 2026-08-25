import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors } from '../../theme/colors';
import { EditorToolbar } from './EditorToolbar';
import { YJS_SOURCE } from '../../services/yjsSource';

interface TipTapEditorProps {
  initialCrdtState?: string | null;
  initialContent?: string | null;
  onSave: (data: { crdtState: string; content: string }) => void;
  readOnly?: boolean;
}

export const TipTapEditor: React.FC<TipTapEditorProps> = ({
  initialCrdtState,
  initialContent,
  onSave,
  readOnly = false,
}) => {
  const webViewRef = useRef<any>(null);
  const [editorReady, setEditorReady] = useState(false);
  const [webViewHeight, setWebViewHeight] = useState(480);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Safety fallback: ensure loading overlay is dismissed within 1.5s no matter what
  useEffect(() => {
    const timer = setTimeout(() => {
      setEditorReady(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleMessage = useCallback(
    (event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);

        if (data.type === 'READY') {
          console.log('[TipTap Host] 🟢 WebView pronto! Enviando dados para renderizar...');
          setEditorReady(true);
          webViewRef.current?.injectJavaScript(`
            window.initCadernoEditor(${JSON.stringify(initialCrdtState || '')}, ${JSON.stringify(initialContent || '')}, ${readOnly});
            true;
          `);
        } else if (data.type === 'LOG') {
          console.log(`[TipTap] ${data.message}`);
        } else if (data.type === 'HEIGHT_CHANGE') {
          if (data.height && data.height > 150) {
            setWebViewHeight(Math.max(350, data.height + 40));
          }
        } else if (data.type === 'UPDATE') {
          const { crdtState, content } = data;
          if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = setTimeout(() => {
            onSave({ crdtState, content });
          }, 800);
        }
      } catch (e) {
        console.warn('[TipTap Host] Erro na mensagem:', e);
      }
    },
    [initialCrdtState, initialContent, readOnly, onSave]
  );

  const handleToolbarCommand = (command: string, value?: any) => {
    if (!webViewRef.current) return;
    webViewRef.current.injectJavaScript(`
      window.executeEditorCommand(${JSON.stringify(command)}, ${JSON.stringify(value ?? null)});
      true;
    `);
  };

  const TIPTAP_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <script>${YJS_SOURCE}</script>
  <style>
    * {
      box-sizing: border-box;
      -webkit-tap-highlight-color: transparent;
    }
    body, html {
      margin: 0;
      padding: 0;
      background-color: #0f0e17;
      color: #fffffe;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, Helvetica, Arial, sans-serif;
      font-size: 16px;
      line-height: 1.7;
      overflow-x: hidden;
    }
    ::selection {
      background: rgba(139, 92, 246, 0.4);
      color: #ffffff;
    }
    #editor-container {
      padding: 16px 20px 100px 20px;
      min-height: 350px;
    }
    #editor {
      outline: none;
      min-height: 250px;
      word-break: break-word;
    }
    p {
      margin: 0.6em 0;
      line-height: 1.7;
      color: #fffffe;
    }
    h1 {
      font-size: 1.85em;
      font-weight: 800;
      margin: 1.3em 0 0.4em 0;
      color: #fffffe;
      letter-spacing: -0.025em;
      line-height: 1.25;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 0.25em;
    }
    h2 {
      font-size: 1.45em;
      font-weight: 700;
      margin: 1.1em 0 0.35em 0;
      color: #f1f5f9;
      letter-spacing: -0.015em;
      line-height: 1.3;
    }
    h3 {
      font-size: 1.2em;
      font-weight: 600;
      margin: 0.9em 0 0.3em 0;
      color: #cbd5e1;
      line-height: 1.4;
    }
    strong, b {
      font-weight: 700;
      color: #ffffff;
    }
    em, i {
      font-style: italic;
      color: #e2e8f0;
    }
    u {
      text-decoration: underline;
      text-underline-offset: 3px;
    }
    s, del {
      text-decoration: line-through;
      color: #94a3b8;
    }
    mark {
      padding: 2px 5px;
      border-radius: 4px;
    }
    ul, ol {
      padding-left: 24px;
      margin: 0.6em 0;
    }
    li {
      margin: 0.35em 0;
      line-height: 1.65;
    }
    /* Task Lists / Checkboxes (Fiel ao Desktop) */
    ul[data-type="taskList"], ul.task-list {
      list-style: none;
      padding: 0;
      margin: 0.8em 0;
    }
    ul[data-type="taskList"] li, li.task-item {
      display: flex;
      align-items: flex-start;
      margin-bottom: 10px;
      gap: 10px;
    }
    ul[data-type="taskList"] li > label, li.task-item > label {
      user-select: none;
      margin-top: 3px;
      display: inline-flex;
    }
    ul[data-type="taskList"] li input[type="checkbox"], li.task-item input[type="checkbox"] {
      appearance: none;
      -webkit-appearance: none;
      width: 20px;
      height: 20px;
      border: 2px solid #8b5cf6;
      border-radius: 6px;
      outline: none;
      cursor: pointer;
      background-color: rgba(139, 92, 246, 0.08);
      position: relative;
      transition: all 0.15s ease;
    }
    ul[data-type="taskList"] li input[type="checkbox"]:checked, li.task-item input[type="checkbox"]:checked {
      background-color: #8b5cf6;
      border-color: #8b5cf6;
    }
    ul[data-type="taskList"] li input[type="checkbox"]:checked::after, li.task-item input[type="checkbox"]:checked::after {
      content: '✓';
      position: absolute;
      color: #ffffff;
      font-size: 14px;
      font-weight: bold;
      top: -1px;
      left: 3.5px;
    }
    ul[data-type="taskList"] li > div, li.task-item > div {
      flex: 1;
      line-height: 1.55;
    }
    ul[data-type="taskList"] li[data-checked="true"] > div, li.task-item[data-checked="true"] > div {
      text-decoration: line-through;
      color: #94a3b8;
    }
    /* Callouts / ColorBlockquote (Desktop Theme) */
    blockquote, .callout {
      border-left: 4px solid #8b5cf6;
      background: rgba(139, 92, 246, 0.07);
      margin: 1.2em 0;
      padding: 12px 18px;
      border-radius: 0 12px 12px 0;
      color: #e2e8f0;
      position: relative;
    }
    .callout-tip {
      border-left-color: #10b981;
      background: rgba(16, 185, 129, 0.07);
    }
    .callout-warning {
      border-left-color: #f59e0b;
      background: rgba(245, 158, 11, 0.07);
    }
    .callout-danger {
      border-left-color: #ef4444;
      background: rgba(239, 68, 68, 0.07);
    }
    /* Toggle / Accordion (Desktop Fiel) */
    details.caderno-toggle, details.caderno-collection {
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.02);
      margin: 1.2em 0;
      overflow: hidden;
    }
    details.caderno-toggle summary, details.caderno-collection summary {
      padding: 12px 16px;
      font-weight: 600;
      color: #f1f5f9;
      cursor: pointer;
      outline: none;
      user-select: none;
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.03);
    }
    details.caderno-toggle summary::marker, details.caderno-collection summary::marker {
      color: #8b5cf6;
    }
    details.caderno-toggle .toggle-content, details.caderno-collection .collection-content {
      padding: 14px 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }
    /* Code Blocks */
    pre {
      background: #151324;
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 12px;
      padding: 14px 16px;
      overflow-x: auto;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13.5px;
      color: #c4b5fd;
      margin: 1.2em 0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
    code {
      background: rgba(139, 92, 246, 0.15);
      color: #c4b5fd;
      padding: 3px 7px;
      border-radius: 6px;
      font-family: ui-monospace, SFMono-Regular, monospace;
      font-size: 0.9em;
    }
    pre code {
      background: none;
      padding: 0;
      color: inherit;
    }
    /* Tables (Desktop Fiel e Responsivo para Mobile) */
    .table-wrapper {
      width: 100%;
      overflow-x: auto;
      margin: 1.2em 0;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.12);
    }
    table {
      border-collapse: collapse;
      width: 100%;
      min-width: 280px;
    }
    td, th {
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 10px 14px;
      vertical-align: top;
      box-sizing: border-box;
      font-size: 14.5px;
    }
    th {
      font-weight: 700;
      background-color: rgba(139, 92, 246, 0.18);
      color: #ffffff;
      text-align: left;
      border-bottom: 2px solid rgba(139, 92, 246, 0.3);
    }
    tr:nth-child(even) {
      background-color: rgba(255, 255, 255, 0.02);
    }
    /* Widgets (Desktop Fiel) */
    .widget-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      margin: 1.2em 0;
      background: #1a1829;
      border: 1px solid rgba(139, 92, 246, 0.25);
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
    .widget-icon {
      font-size: 24px;
    }
    .widget-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .widget-title {
      font-weight: 600;
      color: #f1f5f9;
      font-size: 15px;
    }
    .widget-sub {
      font-size: 12px;
      color: #94a3b8;
    }
    .page-reference {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 2px 8px;
      background: rgba(139, 92, 246, 0.18);
      border: 1px solid rgba(139, 92, 246, 0.35);
      border-radius: 6px;
      color: #c4b5fd;
      font-weight: 600;
      font-size: 0.92em;
      margin: 0 2px;
    }
    .column-group {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      margin: 1.2em 0;
    }
    .column-block {
      flex: 1;
      min-width: 260px;
    }

    /* Link Cards / Previews & Groups (Desktop Fiel) */
    .link-group-block, .group-layout[data-type="linkGroup"] {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin: 1.2em 0;
      width: 100%;
    }
    .link-preview-card {
      display: flex;
      flex-direction: column;
      padding: 12px 14px;
      margin: 0.8em 0;
      background: #181628;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
      transition: all 0.2s ease;
      position: relative;
      text-decoration: none;
      color: inherit;
    }
    .link-preview-card:active {
      transform: scale(0.99);
      border-color: #8b5cf6;
    }
    .link-card-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      width: 100%;
    }
    .link-card-icon-wrap {
      position: relative;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: #100e1c;
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      overflow: visible;
      margin-top: 2px;
    }
    .link-card-icon-wrap img {
      width: 20px;
      height: 20px;
      border-radius: 4px;
      margin: 0;
      display: block;
    }
    .link-card-badge-watched {
      position: absolute;
      top: -4px;
      right: -4px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #10b981;
      color: #000000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 900;
      box-shadow: 0 1px 4px rgba(0,0,0,0.5);
    }
    .link-card-content {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .link-card-title {
      font-size: 14.5px;
      font-weight: 600;
      color: #ffffff;
      line-height: 1.35;
      word-break: break-word;
      text-decoration: none;
    }
    .link-card-title:hover {
      color: #c4b5fd;
    }
    .link-card-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #94a3b8;
      margin-top: 2px;
    }
    .link-meta-domain {
      color: #c4b5fd;
      font-weight: 600;
    }
    .link-meta-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 1px 7px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.06);
      font-size: 11.5px;
    }
    .link-meta-playlist {
      background: rgba(139, 92, 246, 0.18);
      color: #c4b5fd;
      border: 1px solid rgba(139, 92, 246, 0.35);
    }
    .link-card-notes {
      margin-top: 10px;
      padding: 8px 12px;
      background: rgba(0, 0, 0, 0.25);
      border-left: 3px solid #8b5cf6;
      border-radius: 0 8px 8px 0;
      font-size: 13px;
      color: #cbd5e1;
      line-height: 1.5;
    }

    /* Question / Quiz Block */
    .quiz-card {
      padding: 16px 18px;
      margin: 1.2em 0;
      background: #161426;
      border: 1px solid rgba(139, 92, 246, 0.35);
      border-radius: 14px;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
    }
    .quiz-title {
      font-weight: 700;
      color: #c4b5fd;
      font-size: 16.5px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .quiz-desc {
      color: #94a3b8;
      font-size: 13.5px;
      margin-bottom: 12px;
      line-height: 1.5;
    }
    .quiz-item {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      padding: 12px 14px;
      margin-top: 10px;
    }
    .quiz-q-title {
      font-weight: 600;
      color: #f1f5f9;
      font-size: 14px;
      margin-bottom: 8px;
    }
    .quiz-options {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .quiz-opt {
      padding: 8px 12px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 13px;
      color: #e2e8f0;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .quiz-opt.correct {
      background: rgba(16, 185, 129, 0.15);
      border-color: #10b981;
      color: #6ee7b7;
    }

    /* Spoiler */
    .caderno-spoiler {
      background-color: #334155;
      color: transparent;
      border-radius: 4px;
      padding: 1px 6px;
      cursor: pointer;
      user-select: none;
      transition: all 0.2s ease;
    }
    .caderno-spoiler.revealed {
      background-color: rgba(255, 255, 255, 0.1);
      color: inherit;
    }
    /* Divider */
    hr {
      border: none;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.4), transparent);
      margin: 2em 0;
    }
    img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin: 0.8em 0;
    }
  </style>
</head>
<body>
  <div id="editor-container">
    <div id="editor" contenteditable="true" spellcheck="false"></div>
  </div>

  <script>
    let ydoc = null;
    let isReadOnly = false;

    function postLog(msg) {
      try {
        window.ReactNativeWebView?.postMessage(JSON.stringify({
          type: 'LOG',
          message: msg
        }));
      } catch (e) {}
    }

    function sendHeight() {
      const height = document.getElementById('editor-container').offsetHeight;
      window.ReactNativeWebView?.postMessage(JSON.stringify({
        type: 'HEIGHT_CHANGE',
        height: height
      }));
    }

    function emitUpdate() {
      const editorEl = document.getElementById('editor');
      const htmlContent = editorEl.innerHTML;
      let crdtBase64 = '';

      if (typeof Y !== 'undefined' && ydoc) {
        try {
          const stateVector = Y.encodeStateAsUpdate(ydoc);
          let binary = '';
          for (let i = 0; i < stateVector.length; i++) {
            binary += String.fromCharCode(stateVector[i]);
          }
          crdtBase64 = btoa(binary);
        } catch (e) {}
      }

      window.ReactNativeWebView?.postMessage(JSON.stringify({
        type: 'UPDATE',
        crdtState: crdtBase64,
        content: htmlContent
      }));

      sendHeight();
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    function formatInline(text) {
      let s = escapeHtml(text);
      s = s.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>');
      s = s.replace(/_(.*?)_/g, '<em>$1</em>');
      s = s.replace(/\`(.*?)\`/g, '<code>$1</code>');
      return s;
    }

    function markdownToHtml(md) {
      if (!md) return '<p><br></p>';
      if (md.trim().startsWith('<') && md.trim().endsWith('>')) {
        return md;
      }

      const lines = md.split('\\n');
      let html = '';

      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        if (line.startsWith('### ')) {
          html += '<h3>' + escapeHtml(line.slice(4)) + '</h3>';
          continue;
        }
        if (line.startsWith('## ')) {
          html += '<h2>' + escapeHtml(line.slice(3)) + '</h2>';
          continue;
        }
        if (line.startsWith('# ')) {
          html += '<h1>' + escapeHtml(line.slice(2)) + '</h1>';
          continue;
        }

        if (line.startsWith('[x] ') || line.startsWith('[X] ') || line.startsWith('- [x] ') || line.startsWith('- [X] ')) {
          const text = line.replace(/^(\\-\\s+)?\\[[xX]\\]\\s+/, '');
          html += '<ul data-type="taskList"><li data-checked="true"><label><input type="checkbox" checked></label><div>' + formatInline(text) + '</div></li></ul>';
          continue;
        }
        if (line.startsWith('[ ] ') || line.startsWith('- [ ] ')) {
          const text = line.replace(/^(\\-\\s+)?\\[\\s+\\]\\s+/, '');
          html += '<ul data-type="taskList"><li data-checked="false"><label><input type="checkbox"></label><div>' + formatInline(text) + '</div></li></ul>';
          continue;
        }

        if (line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* ')) {
          const text = line.replace(/^([•\\-\\*])\\s+/, '');
          html += '<ul><li>' + formatInline(text) + '</li></ul>';
          continue;
        }

        if (line.startsWith('> ')) {
          html += '<blockquote>' + formatInline(line.slice(2)) + '</blockquote>';
          continue;
        }

        if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
          const cells = line.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1).map(c => c.trim());
          if (cells.length > 0 && !cells.every(c => /^[-:]+$/.test(c))) {
            const isHeader = (i === 0 || (lines[i+1] && lines[i+1].includes('---')));
            const rowTag = isHeader ? 'th' : 'td';
            const rowHtml = '<tr>' + cells.map(c => '<' + rowTag + '>' + formatInline(c) + '</' + rowTag + '>').join('') + '</tr>';
            html += '<div class="table-wrapper"><table class="caderno-table">' + rowHtml + '</table></div>';
          }
          continue;
        }

        if (!line.trim()) {
          html += '<p><br></p>';
          continue;
        }

        html += '<p>' + formatInline(line) + '</p>';
      }

      return html || '<p><br></p>';
    }

    // Comprehensive nodeToHtml function supporting YXmlText deltas and all Desktop extensions
    function nodeToHtml(node) {
      if (!node) return '';

      // 1. Plain string or number
      if (typeof node === 'string' || typeof node === 'number') {
        return escapeHtml(String(node));
      }

      // 2. YXmlText or YText (ProseMirror rich text with marks)
      if (typeof node.toDelta === 'function') {
        try {
          const deltas = node.toDelta();
          if (Array.isArray(deltas) && deltas.length > 0) {
            let res = '';
            for (let d = 0; d < deltas.length; d++) {
              const delta = deltas[d];
              let textPiece = escapeHtml(delta.insert || '');
              if (delta.attributes) {
                if (delta.attributes.bold || delta.attributes.strong) textPiece = '<strong>' + textPiece + '</strong>';
                if (delta.attributes.italic || delta.attributes.em) textPiece = '<em>' + textPiece + '</em>';
                if (delta.attributes.underline) textPiece = '<u>' + textPiece + '</u>';
                if (delta.attributes.strike || delta.attributes.s) textPiece = '<s>' + textPiece + '</s>';
                if (delta.attributes.code) textPiece = '<code>' + textPiece + '</code>';
                if (delta.attributes.link && delta.attributes.link.href) textPiece = '<a href="' + escapeHtml(delta.attributes.link.href) + '">' + textPiece + '</a>';
                if (delta.attributes.highlight) {
                  const color = typeof delta.attributes.highlight === 'string' ? delta.attributes.highlight : (delta.attributes.highlight.color || '#fef08a');
                  textPiece = '<mark style="background-color: ' + color + ';">' + textPiece + '</mark>';
                }
                if (delta.attributes.textStyle && delta.attributes.textStyle.color) {
                  textPiece = '<span style="color: ' + escapeHtml(delta.attributes.textStyle.color) + ';">' + textPiece + '</span>';
                }
              }
              res += textPiece;
            }
            return res;
          }
        } catch (e) {}
      }

      // 3. Leaf text fallback
      if (typeof node.toString === 'function' && (!node.toArray || node.toArray().length === 0)) {
        const ctor = node.constructor ? node.constructor.name : '';
        if (ctor === 'YXmlText' || ctor === 'YText') {
          return escapeHtml(node.toString());
        }
      }

      // 4. Recursive child traversal
      const children = (typeof node.toArray === 'function') ? node.toArray() : [];
      let inner = '';
      for (let i = 0; i < children.length; i++) {
        inner += nodeToHtml(children[i]);
      }

      const nodeName = node.nodeName || '';
      const attrs = (typeof node.getAttributes === 'function') ? (node.getAttributes() || {}) : {};

      switch (nodeName) {
        case '':
        case undefined:
        case null:
          // YXmlFragment (root fragment) — return children directly
          return inner;
        case 'doc': return inner;
        case 'heading': {
          const level = attrs.level || 1;
          return '<h' + level + '>' + inner + '</h' + level + '>';
        }
        case 'paragraph': return '<p>' + (inner || '<br>') + '</p>';
        case 'bulletList': case 'bullet_list': return '<ul>' + inner + '</ul>';
        case 'orderedList': case 'ordered_list': return '<ol>' + inner + '</ol>';
        case 'listItem': case 'list_item': return '<li>' + inner + '</li>';
        case 'taskList': case 'task_list': return '<ul data-type="taskList">' + inner + '</ul>';
        case 'taskItem': case 'task_item': {
          const checked = (attrs.checked === true || attrs.checked === 'true');
          return '<li data-checked="' + (checked ? 'true' : 'false') + '"><label><input type="checkbox" ' + (checked ? 'checked' : '') + '></label><div>' + inner + '</div></li>';
        }
        case 'toggleBlock':
        case 'toggle': {
          const title = attrs.title || 'Seção Retrátil';
          return '<details class="caderno-toggle" open><summary>' + escapeHtml(title) + '</summary><div class="toggle-content">' + inner + '</div></details>';
        }
        case 'groupBlock':
        case 'collectionBlock': {
          const title = attrs.title || 'Coleção';
          return '<details class="caderno-collection" open><summary>📁 ' + escapeHtml(title) + '</summary><div class="collection-content">' + inner + '</div></details>';
        }
        case 'blockquoteToggle': {
          const title = attrs.title || 'Citação';
          return '<details class="caderno-toggle" open><summary>' + escapeHtml(title) + '</summary><blockquote>' + inner + '</blockquote></details>';
        }
        case 'colorBlockquote':
        case 'blockquote': {
          const color = attrs.color || '#8b5cf6';
          return '<blockquote class="callout" style="border-left-color: ' + color + '; background-color: ' + color + '15;">' + inner + '</blockquote>';
        }
        case 'columnGroup':
        case 'columns': {
          return '<div class="column-group">' + inner + '</div>';
        }
        case 'columnBlock':
        case 'column': {
          return '<div class="column-block">' + inner + '</div>';
        }
        case 'linkGroup': {
          return '<div class="link-group-block" data-type="linkGroup">' + inner + '</div>';
        }
        case 'linkPreview': {
          const url = attrs.url || '';
          const title = attrs.title || '';
          const channel = attrs.channel || '';
          const duration = attrs.duration;
          const isPlaylist = (attrs.isPlaylist === true || attrs.isPlaylist === 'true');
          const playlistCount = attrs.playlistCount;
          const uploadDate = attrs.uploadDate || '';
          const notes = attrs.notes || '';
          const watched = (attrs.watched === true || attrs.watched === 'true');
          const color = (attrs.color && attrs.color !== 'default') ? attrs.color : null;

          let domain = '';
          try {
            domain = new URL(url).hostname.replace(/^www\./, '');
          } catch(e) {}

          const isYouTube = url.indexOf('youtube.com') !== -1 || url.indexOf('youtu.be') !== -1;

          let formattedDuration = '';
          if (duration && !isNaN(duration)) {
            const s = Number(duration);
            const hrs = Math.floor(s / 3600);
            const mins = Math.floor((s % 3600) / 60);
            const secs = Math.floor(s % 60);
            if (hrs > 0) {
              formattedDuration = hrs + ':' + (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
            } else {
              formattedDuration = mins + ':' + (secs < 10 ? '0' : '') + secs;
            }
          }

          const iconHtml = isYouTube
            ? '<span style="font-size: 17px;">▶️</span>'
            : (domain
                ? '<img src="https://www.google.com/s2/favicons?domain=' + encodeURIComponent(domain) + '&sz=64" alt="" onerror="this.style.display=\'none\'">'
                : '<span style="font-size: 16px;">🌐</span>');

          const customStyle = color ? 'border-color: ' + color + '70; background-color: ' + color + '15;' : '';

          let cardHtml = '<div class="link-preview-card" style="' + customStyle + '">';
          cardHtml += '<div class="link-card-header">';
          cardHtml += '<div class="link-card-icon-wrap">' + iconHtml;
          if (watched) {
            cardHtml += '<div class="link-card-badge-watched">✓</div>';
          }
          cardHtml += '</div>';

          cardHtml += '<div class="link-card-content">';
          cardHtml += '<a href="' + escapeHtml(url) + '" target="_blank" class="link-card-title">' + escapeHtml(title || domain || url || 'Link') + '</a>';

          cardHtml += '<div class="link-card-meta">';
          if (domain) {
            cardHtml += '<span class="link-meta-domain">' + escapeHtml(domain) + '</span>';
          }
          if (channel) {
            cardHtml += '<span class="link-meta-chip">👤 ' + escapeHtml(channel) + '</span>';
          }
          if (isPlaylist) {
            const pText = playlistCount ? playlistCount + ' vídeos' : 'Playlist';
            cardHtml += '<span class="link-meta-chip link-meta-playlist">📑 ' + pText + '</span>';
          }
          if (formattedDuration && !isPlaylist) {
            cardHtml += '<span class="link-meta-chip">⏱️ ' + formattedDuration + '</span>';
          }
          if (uploadDate) {
            cardHtml += '<span class="link-meta-chip">📅 ' + escapeHtml(uploadDate) + '</span>';
          }
          cardHtml += '</div>';
          cardHtml += '</div>';
          cardHtml += '</div>';

          if (notes && notes.trim().length > 0) {
            cardHtml += '<div class="link-card-notes">📝 ' + escapeHtml(notes) + '</div>';
          }

          cardHtml += '</div>';
          return cardHtml;
        }
        case 'pageReference': {
          const pageId = attrs.pageId || '';
          const title = attrs.title || 'Página';
          return '<span class="page-reference" data-page-id="' + pageId + '">📄 ' + escapeHtml(title) + '</span>';
        }
        case 'fileWidgetBlock':
        case 'fileWidget': {
          const fileName = attrs.name || attrs.fileName || 'Arquivo Anexo';
          const fileType = attrs.fileType || 'file';
          const fileSize = attrs.fileSize || '';
          const fileIcons = {
            pdf: '📄',
            image: '🖼️',
            video: '🎥',
            audio: '🎵',
            code: '💻',
            archive: '📦',
            document: '📝',
          };
          const icon = fileIcons[fileType] || '📎';
          return '<div class="widget-card file-widget"><span class="widget-icon">' + icon + '</span><div class="widget-info"><span class="widget-title">' + escapeHtml(fileName) + '</span>' + (fileSize ? '<span class="widget-sub">' + escapeHtml(fileSize) + '</span>' : '') + '</div></div>';
        }
        case 'focusWidgetBlock':
        case 'focusWidget': {
          const duration = attrs.duration ? attrs.duration + ' min' : '25 min';
          const tag = attrs.tag || 'Foco';
          const desc = attrs.description || '';
          return '<div class="widget-card"><span class="widget-icon">⏱️</span><div class="widget-info"><span class="widget-title">Sessão de Foco (' + escapeHtml(duration) + ')</span>' + (desc ? '<span class="widget-sub">' + escapeHtml(desc) + '</span>' : '<span class="widget-sub">Tag: ' + escapeHtml(tag) + '</span>') + '</div></div>';
        }
        case 'alarmWidgetBlock':
        case 'alarmWidget': {
          const timeStr = attrs.timeStr || '08:00';
          const label = attrs.label || 'Alarme';
          return '<div class="widget-card"><span class="widget-icon">⏰</span><div class="widget-info"><span class="widget-title">' + escapeHtml(timeStr) + '</span><span class="widget-sub">' + escapeHtml(label) + '</span></div></div>';
        }
        case 'calendarEventWidgetBlock':
        case 'calendarEventWidget':
        case 'calendarEvent': {
          const eventTitle = attrs.title || 'Evento do Calendário';
          const dateStr = attrs.dateStr || '';
          return '<div class="widget-card"><span class="widget-icon">📅</span><div class="widget-info"><span class="widget-title">' + escapeHtml(eventTitle) + '</span>' + (dateStr ? '<span class="widget-sub">' + escapeHtml(dateStr) + '</span>' : '') + '</div></div>';
        }
        case 'mediaWidgetBlock':
        case 'mediaWidget': {
          const mediaTitle = attrs.title || 'Mídia';
          const mediaType = attrs.mediaType === 'book' ? '📖 Livro' : '🎥 Vídeo';
          return '<div class="widget-card"><span class="widget-icon">' + (attrs.mediaType === 'book' ? '📖' : '🎥') + '</span><div class="widget-info"><span class="widget-title">' + escapeHtml(mediaTitle) + '</span><span class="widget-sub">' + mediaType + '</span></div></div>';
        }
        case 'questionBlock': {
          const quizTitle = attrs.title || 'Bateria de Exercícios';
          const quizDesc = attrs.description || '';
          let qHtml = '<div class="quiz-card"><div class="quiz-title">🎯 ' + escapeHtml(quizTitle) + '</div>';
          if (quizDesc) {
            qHtml += '<div class="quiz-desc">' + escapeHtml(quizDesc) + '</div>';
          }
          if (attrs.questions) {
            let questionsList = [];
            try {
              if (Array.isArray(attrs.questions)) {
                questionsList = attrs.questions;
              } else if (typeof attrs.questions === 'string') {
                questionsList = JSON.parse(decodeURIComponent(attrs.questions));
              }
            } catch(e) {}

            for (let q = 0; q < questionsList.length; q++) {
              const item = questionsList[q];
              if (item) {
                qHtml += '<div class="quiz-item"><div class="quiz-q-title">Q' + (q + 1) + '. ' + escapeHtml(item.question || item.title || 'Questão') + '</div>';
                if (Array.isArray(item.options)) {
                  qHtml += '<div class="quiz-options">';
                  for (let o = 0; o < item.options.length; o++) {
                    const opt = item.options[o];
                    const optText = typeof opt === 'string' ? opt : (opt.text || opt.label || '');
                    const isCorrect = (item.correctAnswer === o || opt.isCorrect === true);
                    qHtml += '<div class="quiz-opt' + (isCorrect ? ' correct' : '') + '">' + (isCorrect ? '✅ ' : '⚪ ') + escapeHtml(optText) + '</div>';
                  }
                  qHtml += '</div>';
                }
                qHtml += '</div>';
              }
            }
          }
          qHtml += '</div>';
          return qHtml;
        }
        case 'codeBlock':
        case 'code_block':
        case 'codeBlockLowlight': {
          const lang = attrs.language || '';
          return '<pre data-language="' + lang + '"><code>' + inner + '</code></pre>';
        }
        case 'customDivider':
        case 'horizontalRule':
        case 'horizontal_rule': return '<hr>';
        case 'hardBreak':
        case 'hard_break': return '<br>';
        case 'table': return '<div class="table-wrapper"><table class="caderno-table">' + inner + '</table></div>';
        case 'tableRow': return '<tr>' + inner + '</tr>';
        case 'tableHeader': return '<th>' + inner + '</th>';
        case 'tableCell': return '<td>' + inner + '</td>';
        case 'image':
        case 'encryptedImage':
        case 'resizableImage': {
          const src = attrs.src || '';
          const alt = attrs.alt || '';
          return '<img src="' + src + '" alt="' + alt + '">';
        }
        case 'spoiler': {
          return '<span class="caderno-spoiler" onclick="this.classList.toggle(&quot;revealed&quot;)">' + inner + '</span>';
        }
        case 'bold': case 'strong': return '<strong>' + inner + '</strong>';
        case 'italic': case 'em': return '<em>' + inner + '</em>';
        case 'underline': return '<u>' + inner + '</u>';
        case 'strike': return '<s>' + inner + '</s>';
        case 'code': return '<code>' + inner + '</code>';
        case 'link': {
          const href = attrs.href || '';
          return '<a href="' + href + '">' + inner + '</a>';
        }
        default: {
          // If unhandled container with content, preserve content in a styled block
          if (inner && inner.trim().length > 0) {
            return '<div class="custom-node" data-type="' + escapeHtml(nodeName) + '">' + inner + '</div>';
          }
          return inner;
        }
      }
    }

    window.initCadernoEditor = function(crdtBase64, rawContent, readOnly) {
      postLog('🚀 initCadernoEditor iniciado! CRDT len: ' + (crdtBase64 ? crdtBase64.length : 0) + ', Content len: ' + (rawContent ? rawContent.length : 0));
      isReadOnly = !!readOnly;
      const editorEl = document.getElementById('editor');
      if (isReadOnly) {
        editorEl.setAttribute('contenteditable', 'false');
      }

      let loaded = false;

      // 1. Try decoding Yjs CRDT binary
      if (typeof Y !== 'undefined' && crdtBase64 && crdtBase64.length > 8) {
        try {
          ydoc = new Y.Doc();
          const binary = atob(crdtBase64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          Y.applyUpdate(ydoc, bytes);
          postLog('📦 Y.applyUpdate concluído! Total shared keys no doc: ' + ydoc.share.size);

          let renderedHtml = '';

          // Log all known shared keys for debugging
          const allKeys = [];
          for (const [k] of ydoc.share.entries()) allKeys.push(k);
          postLog('📋 Shared keys: [' + allKeys.join(', ') + ']');

          // A. Try all keys using getXmlFragment (correct typed accessor for TipTap/ProseMirror)
          for (let n = 0; n < allKeys.length; n++) {
            const key = allKeys[n];
            try {
              const frag = ydoc.getXmlFragment(key);
              const childCount = frag.toArray().length;
              postLog('🔍 getXmlFragment("' + key + '") -> ' + childCount + ' children');
              if (childCount > 0) {
                // Log first 2 children for debugging
                const children = frag.toArray();
                for (let ci = 0; ci < Math.min(children.length, 2); ci++) {
                  const c = children[ci];
                  postLog('  ↳ child[' + ci + '] nodeName=' + (c.nodeName||'?') + ' ctor=' + (c.constructor ? c.constructor.name : '?') + ' hasToDelta=' + (typeof c.toDelta==='function'));
                }
                const html = nodeToHtml(frag);
                postLog('  -> nodeToHtml gerou ' + html.length + ' chars');
                if (html && html.trim().length > 0) {
                  renderedHtml += html;
                }
              }
            } catch(fragErr) {
              postLog('  ⚠️ getXmlFragment("' + key + '") erro: ' + fragErr.message);
            }
          }

          // B. If XmlFragment didn't work, try getText (for YText-based docs)
          if (!renderedHtml || renderedHtml.trim().length === 0) {
            for (let n = 0; n < allKeys.length; n++) {
              const key = allKeys[n];
              try {
                const ytext = ydoc.getText(key);
                const str = ytext.toString();
                postLog('🔍 getText("' + key + '") -> len=' + str.length);
                if (str && str.trim().length > 0) {
                  renderedHtml += '<p>' + escapeHtml(str) + '</p>';
                }
              } catch(e) {}
            }
          }

          // C. Raw AbstractType fallback — try toArray() on whatever is stored
          if (!renderedHtml || renderedHtml.trim().length === 0) {
            for (const [key, type] of ydoc.share.entries()) {
              try {
                const ctor = type && type.constructor ? type.constructor.name : 'unknown';
                postLog('  🔹 AbstractType key="' + key + '" ctor=' + ctor + ' hasToArray=' + (typeof type.toArray === 'function'));
                const html = nodeToHtml(type);
                if (html && html.trim().length > 0) {
                  postLog('  -> AbstractType gerou ' + html.length + ' chars');
                  renderedHtml += html;
                }
              } catch(e) {
                postLog('  ⚠️ AbstractType erro: ' + e.message);
              }
            }
          }

          if (renderedHtml && renderedHtml.trim().length > 0) {
            editorEl.innerHTML = renderedHtml;
            loaded = true;
            postLog('✅ HTML do CRDT aplicado no editor (' + renderedHtml.length + ' chars)!');
          } else {
            postLog('ℹ️ CRDT válido mas gerou HTML vazio. Verificando fallback de content...');
          }
        } catch (e) {
          postLog('⚠️ Erro crítico ao decodificar CRDT: ' + (e.message || String(e)));
        }
      }

      // 2. Fallback to raw content
      if (!loaded) {
        if (rawContent && rawContent.trim() && rawContent.trim() !== '<p></p>') {
          editorEl.innerHTML = markdownToHtml(rawContent);
          postLog('📄 Conteúdo fallback aplicado (' + rawContent.length + ' chars).');
        } else {
          editorEl.innerHTML = '<p><br></p>';
          postLog('📄 Página inicializada em branco.');
        }
      }

      // Wrap any unwrapped tables
      document.querySelectorAll('table').forEach(function(tbl) {
        if (!tbl.parentElement || !tbl.parentElement.classList.contains('table-wrapper')) {
          var wrapper = document.createElement('div');
          wrapper.className = 'table-wrapper';
          tbl.parentNode.insertBefore(wrapper, tbl);
          wrapper.appendChild(tbl);
        }
      });

      editorEl.addEventListener('input', function() {
        emitUpdate();
      });

      editorEl.addEventListener('click', function(e) {
        if (e.target && e.target.type === 'checkbox') {
          var li = e.target.closest('li');
          if (li) {
            li.setAttribute('data-checked', e.target.checked ? 'true' : 'false');
            emitUpdate();
          }
        }
      });

      setTimeout(sendHeight, 100);
    };

    window.executeEditorCommand = function(cmd, val) {
      document.getElementById('editor').focus();
      switch (cmd) {
        case 'bold': document.execCommand('bold', false, null); break;
        case 'italic': document.execCommand('italic', false, null); break;
        case 'underline': document.execCommand('underline', false, null); break;
        case 'h1': document.execCommand('formatBlock', false, '<h1>'); break;
        case 'h2': document.execCommand('formatBlock', false, '<h2>'); break;
        case 'h3': document.execCommand('formatBlock', false, '<h3>'); break;
        case 'paragraph': document.execCommand('formatBlock', false, '<p>'); break;
        case 'bulletList': document.execCommand('insertUnorderedList', false, null); break;
        case 'orderedList': document.execCommand('insertOrderedList', false, null); break;
        case 'blockquote': document.execCommand('formatBlock', false, '<blockquote>'); break;
        case 'calloutTip': {
          document.execCommand('insertHTML', false, '<blockquote class="callout callout-tip"><p>💡 Dica: Escreva sua dica aqui...</p></blockquote><p><br></p>');
          break;
        }
        case 'calloutWarn': {
          document.execCommand('insertHTML', false, '<blockquote class="callout callout-warning"><p>⚠️ Atenção: Escreva seu aviso aqui...</p></blockquote><p><br></p>');
          break;
        }
        case 'toggle': {
          document.execCommand('insertHTML', false, '<details class="caderno-toggle"><summary>Título do Acordeão</summary><div class="toggle-content"><p>Conteúdo oculto aqui...</p></div></details><p><br></p>');
          break;
        }
        case 'taskList': {
          document.execCommand('insertHTML', false, '<ul data-type="taskList"><li data-checked="false"><label><input type="checkbox"></label><div>Item de Tarefa</div></li></ul><p><br></p>');
          break;
        }
        case 'table': {
          document.execCommand('insertHTML', false, '<div class="table-wrapper"><table><thead><tr><th>Coluna 1</th><th>Coluna 2</th></tr></thead><tbody><tr><td>Dado 1</td><td>Dado 2</td></tr><tr><td>Dado 3</td><td>Dado 4</td></tr></tbody></table></div><p><br></p>');
          break;
        }
        case 'codeBlock': {
          document.execCommand('insertHTML', false, '<pre><code>// Digite seu código aqui...</code></pre><p><br></p>');
          break;
        }
        case 'hr': document.execCommand('insertHorizontalRule', false, null); break;
      }
      emitUpdate();
    };

    window.onload = function() {
      postLog('⚡ window.onload disparado!');
      window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'READY' }));
    };
  </script>
</body>
</html>
  `;

  return (
    <View style={styles.container}>
      <View style={[styles.webViewWrapper, { minHeight: webViewHeight }]}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: TIPTAP_HTML, baseUrl: 'https://localhost' }}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          scrollEnabled={false}
          style={[styles.webview, { height: webViewHeight }]}
        />
        {!editorReady && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color={colors.brand400} />
            <Text style={styles.loadingText}>Carregando nota...</Text>
          </View>
        )}
      </View>

      {!readOnly && (
        <EditorToolbar
          onInsertSyntax={(cmd) => handleToolbarCommand(cmd)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBg,
  },
  webViewWrapper: {
    width: '100%',
    position: 'relative',
  },
  webview: {
    backgroundColor: colors.darkBg,
    width: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.darkBg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: colors.darkSubtext,
    fontSize: 13,
  },
});
