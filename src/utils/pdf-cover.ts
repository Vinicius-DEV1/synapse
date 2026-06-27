import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/**
 * Extrai a primeira página de um arquivo PDF e retorna como Base64 JPEG.
 * @param fileUrl Caminho local ou URL do PDF.
 * @param targetWidth Largura desejada para a imagem gerada (padrão 400px para boa resolução).
 * @returns Promise com o Base64 da imagem gerada.
 */
export async function extractPdfCover(fileUrl: string, targetWidth = 400): Promise<string> {
  try {
    const loadingTask = pdfjsLib.getDocument(fileUrl);
    const pdfDoc = await loadingTask.promise;
    
    // Obter a primeira página
    const page = await pdfDoc.getPage(1);
    
    // Calcular a escala baseada na largura desejada
    const viewportOriginal = page.getViewport({ scale: 1.0 });
    const scale = targetWidth / viewportOriginal.width;
    const viewport = page.getViewport({ scale });
    
    // Preparar canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error("Não foi possível criar o contexto do canvas");
    }
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    // Renderizar página no canvas
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };
    
    await page.render(renderContext).promise;
    
    // Retornar como JPEG em base64 (qualidade 0.85)
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch (error) {
    console.error("Erro ao extrair capa do PDF:", error);
    throw error;
  }
}
