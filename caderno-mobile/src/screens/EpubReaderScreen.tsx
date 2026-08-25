import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { ShieldAlert, FolderInput, ArrowLeft, X, RefreshCw } from 'lucide-react-native';
import { NativePager } from '../components/epub/NativePager';
import { PdfViewer } from '../components/pdf/PdfViewer';
import { colors } from '../theme/colors';
import { useAppStore } from '../store/AppContext';
import { EpubTopBar, EpubBottomBar } from '../components/epub/EpubControls';
import { ThemeSelector } from '../components/epub/ThemeSelector';
import { parseEpubBuffer, isPdfBuffer, type ParsedEpub } from '../services/epubParser';
import { upsertBook, upsertBookmark, deleteBookmark } from '../services/db';
import { downloadAndDecryptDriveFile } from '../services/drive/drive-service';
import type { ReadingMode } from '../types/library';

interface EpubReaderScreenProps {
  bookId: string;
  onBack: () => void;
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK_SIZE = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + CHUNK_SIZE);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

const THEME_MAP: Record<ReadingMode, { bg: string; text: string; sub: string }> = {
  dark: { bg: '#0f0e17', text: '#fffffe', sub: '#a7a9be' },
  light: { bg: '#ffffff', text: '#2e2e2e', sub: '#666666' },
  sepia: { bg: '#fbf0d9', text: '#5f4b32', sub: '#8f7b62' },
  mint: { bg: '#e8f5e9', text: '#1b4332', sub: '#2d6a4f' },
  dim: { bg: '#2d2d30', text: '#d4d4d4', sub: '#888888' },
  nord: { bg: '#2e3440', text: '#eceff4', sub: '#d8dee9' },
  midnight: { bg: '#0f172a', text: '#f8fafc', sub: '#94a3b8' },
  'high-contrast': { bg: '#000000', text: '#ffffff', sub: '#888888' },
};

export const EpubReaderScreen: React.FC<EpubReaderScreenProps> = ({
  bookId,
  onBack,
}) => {
  const { state, dispatch } = useAppStore();
  const book = state.books.find((b) => b.id === bookId);

  const [parsedBook, setParsedBook] = useState<ParsedEpub | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('Carregando livro...');
  const [isDriveFile, setIsDriveFile] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [showTypography, setShowTypography] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [fontSize, setFontSize] = useState(17);
  const [currentTheme, setCurrentTheme] = useState<ReadingMode>('dark');
  const [isBookmarked, setIsBookmarked] = useState(false);

  const pagerRef = useRef<any>(null);

  const loadBookData = async () => {
    if (!book) return;

    setLoading(true);
    setDriveError(null);
    setIsPdf(false);
    setPdfBase64(null);

    const initialIndex = Math.max(
      0,
      (typeof book.last_read_page === 'number' ? book.last_read_page : 1) - 1
    );
    setCurrentChapterIndex(initialIndex);

    // 1. If we have a local file uri
    if (book?.file_path && book.file_path.startsWith('file://')) {
      try {
        console.log(`[BOOK] 📁 Abrindo arquivo local: ${book.file_path}`);
        setLoadingStatus('Lendo arquivo local...');
        const res = await fetch(book.file_path);
        const buf = await res.arrayBuffer();

        if (isPdfBuffer(buf)) {
          console.log(`[PDF] 📄 Arquivo PDF detectado (${buf.byteLength} bytes).`);
          setPdfBase64(bufferToBase64(buf));
          setIsPdf(true);
          setLoading(false);
          return;
        }

        const parsed = parseEpubBuffer(buf);
        console.log(`[EPUB] ✅ Livro EPUB carregado: ${parsed.chapters.length} capítulos.`);
        setParsedBook(parsed);
        setIsPdf(false);
        setLoading(false);
        return;
      } catch (e) {
        console.warn('[BOOK] ⚠️ Erro ao ler arquivo local, tentando Google Drive:', e);
      }
    }

    // 2. If book is in Google Drive, download and decrypt automatically
    if (book?.drive_file_id) {
      setIsDriveFile(true);
      setLoadingStatus('Conectando ao Google Drive...');
      try {
        const coreKey = state.moduleKeys['core'] || '';
        const libraryKey = state.moduleKeys['library'] || coreKey;

        console.log(`[BOOK-DRIVE] 🚀 Baixando "${book.title}" (Drive ID: ${book.drive_file_id})...`);
        setLoadingStatus('Baixando e descriptografando do Google Drive...');
        
        const decryptedBuffer = await downloadAndDecryptDriveFile(
          book.drive_file_id,
          coreKey,
          libraryKey
        );

        if (isPdfBuffer(decryptedBuffer)) {
          console.log(`[PDF-DRIVE] 🎉 PDF baixado e pronto! (${decryptedBuffer.byteLength} bytes).`);
          setPdfBase64(bufferToBase64(decryptedBuffer));
          setIsPdf(true);
          setDriveError(null);
          setLoading(false);
          return;
        }

        setLoadingStatus('Processando capítulos do livro...');
        console.log(`[EPUB-DRIVE] 📖 Parseando EPUB (${decryptedBuffer.byteLength} bytes)...`);
        const parsed = parseEpubBuffer(decryptedBuffer);

        console.log(`[EPUB-DRIVE] 🎉 Livro pronto! ${parsed.chapters.length} capítulos encontrados.`);
        setParsedBook(parsed);
        setIsPdf(false);
        setDriveError(null);
        setLoading(false);
        return;
      } catch (err: any) {
        console.error('[BOOK-DRIVE] ❌ Falha ao carregar livro do Google Drive:', err);
        setDriveError(err?.message || 'Falha ao acessar o Google Drive.');
        setIsDriveFile(true);
        setLoading(false);
        return;
      }
    }

    // 3. No file available
    console.warn(`[BOOK] ⚠️ Livro "${book?.title}" não tem caminho local nem drive_file_id.`);
    setIsDriveFile(true);
    setLoading(false);
  };

  useEffect(() => {
    loadBookData();
  }, [book?.id, book?.drive_file_id, book?.file_path]);

  const handlePickLocalEpub = async () => {
    try {
      setLoading(true);
      setLoadingStatus('Processando arquivo...');
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/epub+zip', 'application/pdf', 'application/octet-stream', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        setLoading(false);
        return;
      }

      const asset = result.assets[0];
      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();

      // Check if user picked PDF or EPUB
      if (isPdfBuffer(arrayBuffer) || asset.name.toLowerCase().endsWith('.pdf')) {
        console.log('[PICKER] 📄 PDF selecionado pelo usuário!');
        setPdfBase64(bufferToBase64(arrayBuffer));
        setIsPdf(true);
        setIsDriveFile(false);
        setDriveError(null);

        if (book) {
          const updates = {
            file_path: asset.uri,
            total_pages: 1,
          };
          await upsertBook({ id: book.id, ...updates });
          dispatch({ type: 'UPDATE_BOOK', id: book.id, updates });
        }
        setLoading(false);
        return;
      }

      // EPUB file
      const parsed = parseEpubBuffer(arrayBuffer);
      setParsedBook(parsed);
      setIsPdf(false);
      setIsDriveFile(false);
      setDriveError(null);

      if (book) {
        const updates = {
          file_path: asset.uri,
          total_pages: parsed.chapters.length,
        };
        await upsertBook({ id: book.id, ...updates });
        dispatch({ type: 'UPDATE_BOOK', id: book.id, updates });
      }
      setLoading(false);
    } catch (err: any) {
      console.error('[BOOK] Erro ao abrir arquivo selecionado:', err);
      Alert.alert('Erro', err?.message || 'Não foi possível ler o arquivo selecionado.');
      setLoading(false);
    }
  };

  const handlePdfPageChange = async (pageNumber: number, totalPages: number) => {
    if (!book) return;
    const isCompleted = pageNumber >= totalPages ? 'finished' : 'reading';
    const updates = {
      last_read_page: pageNumber,
      total_pages: totalPages,
      last_read_at: new Date().toISOString(),
      reading_status: isCompleted as any,
    };
    await upsertBook({ id: book.id, ...updates });
    dispatch({ type: 'UPDATE_BOOK', id: book.id, updates });
  };

  const handlePageSelected = async (position: number) => {
    setCurrentChapterIndex(position);
    if (!book) return;

    const pageNumber = position + 1;
    const isCompleted =
      parsedBook && pageNumber >= parsedBook.chapters.length ? 'finished' : 'reading';

    const updates = {
      last_read_page: pageNumber,
      last_read_at: new Date().toISOString(),
      reading_status: isCompleted as any,
    };

    await upsertBook({ id: book.id, ...updates });
    dispatch({ type: 'UPDATE_BOOK', id: book.id, updates });
  };

  const handleToggleBookmark = async () => {
    if (!book) return;

    const currentChapter = parsedBook?.chapters[currentChapterIndex];
    const bookmarkId = `bm_${book.id}_${currentChapterIndex}`;

    if (isBookmarked) {
      await deleteBookmark(bookmarkId);
      setIsBookmarked(false);
    } else {
      await upsertBookmark({
        id: bookmarkId,
        book_id: book.id,
        page_number: currentChapterIndex + 1,
        label: currentChapter?.title || `Capítulo ${currentChapterIndex + 1}`,
        created_at: new Date().toISOString(),
      });
      setIsBookmarked(true);
    }
  };

  const handleChapterSelect = (index: number) => {
    setShowToc(false);
    setCurrentChapterIndex(index);
    pagerRef.current?.setPage(index);
  };

  const themeStyles = THEME_MAP[currentTheme] || THEME_MAP.dark;

  // 1. Render PDF Viewer if book is a PDF
  if (isPdf && pdfBase64) {
    return (
      <PdfViewer
        pdfBase64={pdfBase64}
        book={book}
        initialPage={typeof book?.last_read_page === 'number' ? book.last_read_page : 1}
        onPageChange={handlePdfPageChange}
        onBack={onBack}
      />
    );
  }

  // 2. Drive file error / Local PC path fallback screen
  if (!loading && !parsedBook && !isPdf) {
    return (
      <View style={styles.driveContainer}>
        {/* Top Header */}
        <View style={styles.driveHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={22} color={colors.darkText} />
          </TouchableOpacity>
          <Text numberOfLines={1} style={styles.driveHeaderTitle}>
            {book?.title || 'Detalhes do Livro'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.driveContent}>
          <View style={styles.cloudIconCircle}>
            <ShieldAlert size={44} color={colors.brand400} />
          </View>

          <Text style={styles.driveTitle}>Arquivo não Encontrado</Text>
          
          <Text style={styles.driveSubtitle}>
            {driveError 
              ? driveError 
              : 'Este livro está salvo apenas no disco rígido do seu computador ou ainda não foi enviado ao Google Drive.'}
          </Text>

          <View style={styles.driveCard}>
            <View style={styles.driveRow}>
              <Text style={styles.driveLabel}>Título:</Text>
              <Text style={styles.driveValue}>{book?.title || 'Sem título'}</Text>
            </View>
            <View style={styles.driveRow}>
              <Text style={styles.driveLabel}>Autor:</Text>
              <Text style={styles.driveValue}>{book?.author || 'Desconhecido'}</Text>
            </View>
            <View style={styles.driveRow}>
              <Text style={styles.driveLabel}>Origem:</Text>
              <Text style={styles.driveValue}>
                {book?.drive_file_id ? 'Google Drive' : 'Computador Local'}
              </Text>
            </View>
            {book?.drive_file_id && (
              <View style={styles.driveRow}>
                <Text style={styles.driveLabel}>Drive ID:</Text>
                <Text style={styles.driveCode} numberOfLines={1}>
                  {book.drive_file_id}
                </Text>
              </View>
            )}
          </View>

          {/* Action buttons */}
          {book?.drive_file_id ? (
            <TouchableOpacity style={styles.retryButton} onPress={loadBookData}>
              <RefreshCw size={18} color="#ffffff" />
              <Text style={styles.retryButtonText}>Tentar Baixar Novamente</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity style={styles.importButton} onPress={handlePickLocalEpub}>
            <FolderInput size={20} color="#ffffff" />
            <Text style={styles.importButtonText}>Vincular Arquivo (.epub / .pdf)</Text>
          </TouchableOpacity>

          <Text style={styles.driveHelpText}>
            💡 Dica: No aplicativo do computador, conecte o Google Drive para que seus livros e PDFs fiquem disponíveis em qualquer lugar.
          </Text>
        </ScrollView>
      </View>
    );
  }

  // 3. Loading state
  if (loading || !parsedBook) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.brand400} />
        <Text style={styles.loadingText}>{loadingStatus}</Text>
        <Text style={styles.loadingSubtext}>{book?.title || ''}</Text>
      </View>
    );
  }

  const chapters = parsedBook.chapters;
  const currentChapter = chapters[currentChapterIndex];

  return (
    <View style={[styles.container, { backgroundColor: themeStyles.bg }]}>
      {/* Top Floating Bar */}
      {showControls && (
        <EpubTopBar
          title={book?.title || parsedBook.title}
          author={book?.author || parsedBook.creator}
          isBookmarked={isBookmarked}
          onBack={onBack}
          onToggleToc={() => setShowToc(true)}
          onToggleBookmark={handleToggleBookmark}
          onToggleTypography={() => setShowTypography(true)}
        />
      )}

      {/* Main EPUB Reader Pager */}
      <TouchableWithoutFeedback onPress={() => setShowControls((prev) => !prev)}>
        <View style={styles.pagerWrapper}>
          <NativePager
            ref={pagerRef}
            style={styles.pager}
            initialPage={currentChapterIndex}
            onPageSelected={(e: any) => handlePageSelected(e.nativeEvent.position)}
          >
            {chapters.map((ch, idx) => (
              <View key={ch.id || idx} style={styles.chapterSlide}>
                <ScrollView
                  style={styles.chapterScroll}
                  contentContainerStyle={styles.chapterScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <Text
                    style={[
                      styles.chapterTitle,
                      {
                        color: themeStyles.text,
                        fontSize: fontSize + 5,
                      },
                    ]}
                  >
                    {ch.title}
                  </Text>
                  <Text
                    style={[
                      styles.chapterContent,
                      {
                        color: themeStyles.text,
                        fontSize: fontSize,
                        lineHeight: Math.round(fontSize * 1.65),
                      },
                    ]}
                  >
                    {ch.content}
                  </Text>
                </ScrollView>
              </View>
            ))}
          </NativePager>
        </View>
      </TouchableWithoutFeedback>

      {/* Bottom Floating Bar */}
      {showControls && (
        <EpubBottomBar
          currentChapterTitle={currentChapter?.title || `Capítulo ${currentChapterIndex + 1}`}
          currentPageIndex={currentChapterIndex}
          totalChapters={chapters.length}
          onPrevChapter={() => {
            const nextIdx = Math.max(0, currentChapterIndex - 1);
            pagerRef.current?.setPage(nextIdx);
            handlePageSelected(nextIdx);
          }}
          onNextChapter={() => {
            const nextIdx = Math.min(chapters.length - 1, currentChapterIndex + 1);
            pagerRef.current?.setPage(nextIdx);
            handlePageSelected(nextIdx);
          }}
        />
      )}

      {/* Table of Contents Modal */}
      <Modal visible={showToc} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={() => setShowToc(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalSheet, { backgroundColor: colors.darkCard }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.darkText }]}>
                    Índice de Capítulos
                  </Text>
                  <TouchableOpacity onPress={() => setShowToc(false)}>
                    <X size={20} color={colors.darkSubtext} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.tocList}>
                  {chapters.map((ch, idx) => (
                    <TouchableOpacity
                      key={ch.id || idx}
                      style={[
                        styles.tocItem,
                        currentChapterIndex === idx && {
                          backgroundColor: 'rgba(139, 92, 246, 0.15)',
                        },
                      ]}
                      onPress={() => handleChapterSelect(idx)}
                    >
                      <Text
                        style={[
                          styles.tocIndex,
                          {
                            color:
                              currentChapterIndex === idx
                                ? colors.brand400
                                : colors.darkSubtext,
                          },
                        ]}
                      >
                        {idx + 1}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.tocChapterTitle,
                          {
                            color:
                              currentChapterIndex === idx
                                ? colors.brand300
                                : colors.darkText,
                            fontWeight:
                              currentChapterIndex === idx ? 'bold' : 'normal',
                          },
                        ]}
                      >
                        {ch.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Typography & Theme Modal */}
      <Modal visible={showTypography} animationType="fade" transparent>
        <TouchableWithoutFeedback onPress={() => setShowTypography(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalSheet, { backgroundColor: colors.darkCard }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.darkText }]}>
                    Configurações de Leitura
                  </Text>
                  <TouchableOpacity onPress={() => setShowTypography(false)}>
                    <X size={20} color={colors.darkSubtext} />
                  </TouchableOpacity>
                </View>

                <ThemeSelector
                  currentTheme={currentTheme}
                  onSelectTheme={(th) => setCurrentTheme(th)}
                  fontSize={fontSize}
                  onChangeFontSize={(delta) => setFontSize((s) => Math.max(12, Math.min(32, s + delta)))}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.darkBg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.darkText,
    fontSize: 15,
    fontWeight: 'bold',
  },
  loadingSubtext: {
    color: colors.darkSubtext,
    fontSize: 13,
  },
  pagerWrapper: {
    flex: 1,
  },
  pager: {
    flex: 1,
  },
  chapterSlide: {
    flex: 1,
  },
  chapterScroll: {
    flex: 1,
  },
  chapterScrollContent: {
    paddingHorizontal: 22,
    paddingTop: 30,
    paddingBottom: 80,
  },
  chapterTitle: {
    fontWeight: '800',
    marginBottom: 20,
    lineHeight: 32,
  },
  chapterContent: {
    fontFamily: 'System',
    textAlign: 'justify',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  tocList: {
    maxHeight: 350,
  },
  tocItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 12,
  },
  tocIndex: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  tocChapterTitle: {
    fontSize: 15,
    flex: 1,
  },
  driveContainer: {
    flex: 1,
    backgroundColor: colors.darkBg,
  },
  driveHeader: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    backgroundColor: 'rgba(15, 14, 23, 0.95)',
  },
  backButton: {
    padding: 8,
  },
  driveHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.darkText,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerSpacer: {
    width: 34,
  },
  driveContent: {
    padding: 24,
    alignItems: 'center',
  },
  cloudIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  driveTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.darkText,
    marginBottom: 8,
    textAlign: 'center',
  },
  driveSubtitle: {
    fontSize: 13,
    color: colors.darkSubtext,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
    maxWidth: 320,
  },
  driveCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 16,
    gap: 12,
    marginBottom: 24,
  },
  driveRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  driveLabel: {
    fontSize: 13,
    color: colors.darkSubtext,
    fontWeight: '500',
  },
  driveValue: {
    fontSize: 13,
    color: colors.darkText,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  driveCode: {
    fontSize: 11,
    color: colors.brand400,
    fontFamily: 'monospace',
    flex: 1,
    textAlign: 'right',
  },
  retryButton: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    height: 52,
    backgroundColor: colors.brand500,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    height: 52,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 14,
    marginBottom: 16,
  },
  importButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  driveHelpText: {
    fontSize: 12,
    color: colors.darkSubtext,
    textAlign: 'center',
    lineHeight: 17,
  },
});
