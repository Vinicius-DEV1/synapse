import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import type { LibraryBook, ReadingMode } from '../../types/library';

import { PDFJS_LIB_SOURCE } from '../../services/pdfjsSource';

interface PdfViewerProps {
  pdfBase64: string;
  book?: LibraryBook;
  initialPage?: number;
  onPageChange: (pageNumber: number, totalPages: number) => void;
  onBack: () => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  pdfBase64,
  book,
  initialPage = 1,
  onPageChange,
  onBack,
}) => {
  const webViewRef = useRef<any>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [theme, setTheme] = useState<ReadingMode>('dark');
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);

  const sendMsg = useCallback((data: object) => {
    webViewRef.current?.postMessage(JSON.stringify(data));
  }, []);

  const handleMessage = useCallback(
    (event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);

        if (data.type === 'READY') {
          // Step 1: WebView page loaded — send PDF.js library code via postMessage
          // (injectedJavaScript is limited in size on Android; postMessage handles large payloads)
          console.log('[PDF.js] WebView pronto. Enviando PDF.js via postMessage...');
          sendMsg({ type: 'PDFJS_CODE', code: PDFJS_LIB_SOURCE });

        } else if (data.type === 'PDFJS_READY') {
          // Step 2: PDF.js loaded successfully — start PDF loading
          console.log('[PDF.js] PDF.js inicializado! Iniciando página ' + initialPage);
          sendMsg({ type: 'START_PDF', page: initialPage });

        } else if (data.type === 'NEED_PDF') {
          // Step 3: WebView needs the PDF base64 — send it
          console.log('[PDF.js] Enviando base64 do PDF...');
          sendMsg({ type: 'PDF_DATA', base64: pdfBase64 });

        } else if (data.type === 'PAGE_INFO') {
          setCurrentPage(data.page);
          setTotalPages(data.totalPages);
          setLoading(false);
          onPageChange(data.page, data.totalPages);

        } else if (data.type === 'TOGGLE_CONTROLS') {
          setShowControls((prev) => !prev);

        } else if (data.type === 'LOG') {
          console.log('[PDF.js]', data.message);
        }
      } catch (e) {
        console.warn('[PdfViewer] Erro na mensagem:', e);
      }
    },
    [onPageChange, pdfBase64, initialPage, sendMsg]
  );

  const handlePrevPage = () => {
    if (currentPage > 1) webViewRef.current?.injectJavaScript(`window.prevPage(); true;`);
  };
  const handleNextPage = () => {
    if (currentPage < totalPages) webViewRef.current?.injectJavaScript(`window.nextPage(); true;`);
  };
  const handleZoomIn = () => {
    setScale((prev) => {
      const next = Math.min(prev + 0.25, 3.0);
      webViewRef.current?.injectJavaScript(`window.zoomTo(${next}); true;`);
      return next;
    });
  };
  const handleZoomOut = () => {
    setScale((prev) => {
      const next = Math.max(prev - 0.25, 0.75);
      webViewRef.current?.injectJavaScript(`window.zoomTo(${next}); true;`);
      return next;
    });
  };
  const handleThemeChange = (newTheme: ReadingMode) => {
    setTheme(newTheme);
    webViewRef.current?.injectJavaScript(`window.setTheme('${newTheme}'); true;`);
  };

  // Static HTML shell — NO JS bundle embedded here.
  // PDF.js is sent via postMessage after the page loads (avoids size/encoding issues).
  const PDF_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0, user-scalable=yes">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body, html {
      background-color: #0f0e17; color: #fffffe;
      width: 100%; height: 100%;
      overflow-x: hidden; overflow-y: auto;
      display: flex; flex-direction: column; align-items: center;
      padding: 20px 0 80px 0;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }
    #viewer-container { display: flex; flex-direction: column; align-items: center; width: 100%; }
    .canvas-wrapper {
      position: relative; margin: 10px auto;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      border-radius: 6px; overflow: hidden;
      background-color: #fff; transition: filter 0.2s ease;
    }
    canvas { display: block; max-width: 100%; height: auto; }
    body.theme-dark .canvas-wrapper { filter: invert(0.92) hue-rotate(180deg) brightness(0.95) contrast(1.1); background-color: #000; }
    body.theme-sepia .canvas-wrapper { filter: sepia(0.35) contrast(0.95) brightness(0.98); background-color: #fbf0d9; }
    body.theme-light .canvas-wrapper { filter: none; background-color: #fff; }
    #status-msg { margin-top: 40px; font-size: 15px; color: #a7a9be; text-align: center; padding: 0 20px; }
  </style>
</head>
<body class="theme-dark">
  <div id="viewer-container">
    <div id="status-msg">Aguardando PDF.js...</div>
  </div>
  <script>
    function post(data) {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(data));
    }
    function log(msg) { post({ type: 'LOG', message: msg }); }
    function setStatus(msg) {
      var el = document.getElementById('status-msg');
      if (el) el.innerText = msg;
    }

    var pdfDoc = null;
    var pageNum = 1;
    var pageRendering = false;
    var pageNumPending = null;
    var currentScale = 1.0;

    // Receive messages from React Native
    document.addEventListener('message', function(e) {
      try {
        var msg = JSON.parse(e.data);
        if (msg.type === 'PDFJS_CODE') {
          // Evaluate PDF.js bundle — received via postMessage (avoids injectedJavaScript size limits)
          log('PDFJS_CODE recebido, len=' + (msg.code ? msg.code.length : 0));
          setStatus('Carregando PDF.js...');
          try {
            if (typeof window.DOMMatrix === 'undefined' && typeof window.WebKitCSSMatrix !== 'undefined') {
              window.DOMMatrix = window.WebKitCSSMatrix;
            }
            eval(msg.code);
            var ready = !!(window.pdfjsLib);
            log('eval concluido. pdfjsLib=' + (typeof window.pdfjsLib) + ' ready=' + ready);
            post({ type: 'PDFJS_READY' });
          } catch(evalErr) {
            log('eval ERRO: ' + (evalErr.message || String(evalErr)));
            setStatus('Erro ao carregar PDF.js: ' + (evalErr.message || String(evalErr)));
          }
        } else if (msg.type === 'START_PDF') {
          pageNum = msg.page || 1;
          setStatus('Solicitando PDF...');
          log('START_PDF pagina=' + pageNum);
          post({ type: 'NEED_PDF' });
        } else if (msg.type === 'PDF_DATA') {
          log('PDF_DATA recebido, len=' + (msg.base64 ? msg.base64.length : 0));
          loadPdfFromBase64(msg.base64);
        }
      } catch(err) {
        log('message listener erro: ' + (err.message || String(err)));
      }
    });

    async function loadPdfFromBase64(base64Data) {
      try {
        var lib = window.pdfjsLib;
        if (!lib) {
          setStatus('Erro: PDF.js nao disponivel');
          return;
        }
        lib.GlobalWorkerOptions.workerSrc = '';
        setStatus('Decodificando PDF...');
        var raw = atob(base64Data);
        var uint8 = new Uint8Array(raw.length);
        for (var i = 0; i < raw.length; i++) uint8[i] = raw.charCodeAt(i);
        setStatus('Carregando PDF (' + Math.round(uint8.length / 1024) + ' KB)...');
        log('Carregando ' + uint8.length + ' bytes via getDocument...');
        var task = lib.getDocument({ data: uint8, disableWorker: true });
        pdfDoc = await task.promise;
        log('PDF carregado! ' + pdfDoc.numPages + ' paginas');
        document.getElementById('viewer-container').innerHTML = '';
        renderPage(pageNum);
      } catch(err) {
        log('loadPdf ERRO: ' + (err.message || String(err)));
        setStatus('Erro: ' + (err.message || String(err)));
      }
    }

    async function renderPage(num) {
      pageRendering = true;
      var container = document.getElementById('viewer-container');
      container.innerHTML = '';
      try {
        var page = await pdfDoc.getPage(num);
        var clientWidth = window.innerWidth || 360;
        var unscaled = page.getViewport({ scale: 1.0 });
        var sf = ((clientWidth - 24) / unscaled.width) * currentScale;
        var viewport = page.getViewport({ scale: sf });
        var wrapper = document.createElement('div');
        wrapper.className = 'canvas-wrapper';
        wrapper.onclick = function() { post({ type: 'TOGGLE_CONTROLS' }); };
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        wrapper.appendChild(canvas);
        container.appendChild(wrapper);
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;
        pageRendering = false;
        post({ type: 'PAGE_INFO', page: num, totalPages: pdfDoc.numPages });
        if (pageNumPending !== null) {
          var p = pageNumPending; pageNumPending = null; renderPage(p);
        }
      } catch(e) {
        log('renderPage erro: ' + e.message);
        pageRendering = false;
      }
    }

    function queueRenderPage(num) {
      if (pageRendering) { pageNumPending = num; } else { renderPage(num); }
    }

    window.prevPage = function() { if (pageNum <= 1) return; pageNum--; queueRenderPage(pageNum); };
    window.nextPage = function() { if (!pdfDoc || pageNum >= pdfDoc.numPages) return; pageNum++; queueRenderPage(pageNum); };
    window.zoomTo = function(s) { currentScale = s; queueRenderPage(pageNum); };
    window.setTheme = function(t) { document.body.className = 'theme-' + t; };

    window.onload = function() {
      log('onload disparado');
      post({ type: 'READY' });
    };
  </script>
</body>
</html>`;

  return (
    <View style={styles.container}>
      {showControls && (
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconBtn} onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <ArrowLeft size={22} color={colors.darkText} />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text numberOfLines={1} style={styles.titleText}>{book?.title || 'Documento PDF'}</Text>
            <Text style={styles.pageIndicator}>Página {currentPage} de {totalPages}</Text>
          </View>
          <View style={styles.themeGroup}>
            <TouchableOpacity style={[styles.themeBtn, theme === 'dark' && styles.themeBtnActive]} onPress={() => handleThemeChange('dark')}>
              <Text style={styles.themeBtnLabel}>🌙</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.themeBtn, theme === 'sepia' && styles.themeBtnActive]} onPress={() => handleThemeChange('sepia')}>
              <Text style={styles.themeBtnLabel}>☕</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.themeBtn, theme === 'light' && styles.themeBtnActive]} onPress={() => handleThemeChange('light')}>
              <Text style={styles.themeBtnLabel}>☀️</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.webWrapper}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: PDF_HTML, baseUrl: 'https://localhost' }}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          style={styles.webview}
        />
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.brand400} />
            <Text style={styles.loadingText}>Carregando PDF...</Text>
          </View>
        )}
      </View>

      {showControls && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={[styles.navBtn, currentPage <= 1 && styles.btnDisabled]} onPress={handlePrevPage} disabled={currentPage <= 1}>
            <ArrowLeft size={18} color={currentPage <= 1 ? colors.darkSubtext : '#ffffff'} />
            <Text style={[styles.navBtnText, currentPage <= 1 && { color: colors.darkSubtext }]}>Anterior</Text>
          </TouchableOpacity>
          <View style={styles.zoomGroup}>
            <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomOut}><Text style={styles.zoomSymbol}>−</Text></TouchableOpacity>
            <Text style={styles.zoomText}>{Math.round(scale * 100)}%</Text>
            <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomIn}><Text style={styles.zoomSymbol}>+</Text></TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.navBtn, currentPage >= totalPages && styles.btnDisabled]} onPress={handleNextPage} disabled={currentPage >= totalPages}>
            <Text style={[styles.navBtnText, currentPage >= totalPages && { color: colors.darkSubtext }]}>Próxima</Text>
            <ArrowRight size={18} color={currentPage >= totalPages ? colors.darkSubtext : '#ffffff'} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.darkBg },
  topBar: {
    height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, backgroundColor: 'rgba(15,14,23,0.96)',
    borderBottomWidth: 1, borderBottomColor: colors.borderSubtle, zIndex: 10,
  },
  iconBtn: { padding: 8 },
  titleContainer: { flex: 1, alignItems: 'center', marginHorizontal: 8 },
  titleText: { fontSize: 14, fontWeight: 'bold', color: colors.darkText },
  pageIndicator: { fontSize: 11, color: colors.brand400, marginTop: 2 },
  themeGroup: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  themeBtn: { padding: 6, borderRadius: 8 },
  themeBtnActive: { backgroundColor: 'rgba(139,92,246,0.25)' },
  themeBtnLabel: { fontSize: 14 },
  webWrapper: { flex: 1, position: 'relative' },
  webview: { flex: 1, backgroundColor: colors.darkBg },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.darkBg, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: colors.darkSubtext, fontSize: 14 },
  bottomBar: {
    height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, backgroundColor: 'rgba(15,14,23,0.96)',
    borderTopWidth: 1, borderTopColor: colors.borderSubtle,
  },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: colors.brand500, borderRadius: 10 },
  navBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
  btnDisabled: { backgroundColor: 'rgba(255,255,255,0.05)' },
  zoomGroup: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  zoomBtn: { padding: 4 },
  zoomSymbol: { fontSize: 16, fontWeight: 'bold', color: colors.darkText },
  zoomText: { fontSize: 12, fontWeight: 'bold', color: colors.darkText },
});
