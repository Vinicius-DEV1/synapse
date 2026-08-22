import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/**
 * Extracts the first page of a PDF file and returns it as a Base64 JPEG data URL.
 * @param fileData Binary data of the PDF (Uint8Array).
 * @param targetWidth Desired width for the generated image (default 400px).
 * @returns Promise resolving to the Base64 image data URL.
 */
export async function extractPdfCover(fileData: Uint8Array, targetWidth = 400): Promise<string> {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: fileData });
    const pdfDoc = await loadingTask.promise;
    
    // Fetch first page
    const page = await pdfDoc.getPage(1);
    
    // Calculate scale from target width
    const viewportOriginal = page.getViewport({ scale: 1.0 });
    const scale = targetWidth / viewportOriginal.width;
    const viewport = page.getViewport({ scale });
    
    // Setup canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error("Unable to create canvas 2D rendering context");
    }
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    // Render PDF page to canvas
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
      canvas: canvas,
    };
    
    await page.render(renderContext).promise;
    
    // Return Base64 JPEG (0.85 quality)
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch (error) {
    console.error("Erro ao extrair capa do PDF:", error);
    throw error;
  }
}
