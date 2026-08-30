/**
 * Extracts all text content from a PDF document (ArrayBuffer or Uint8Array).
 * Lazily imports pdfjs-dist to optimize code splitting and avoid loading overhead until a PDF is uploaded.
 *
 * @param data ArrayBuffer or Uint8Array containing PDF binary data.
 * @param maxPages Optional limit on maximum pages to read (default all).
 * @returns Promise resolving to the structured extracted text.
 */
export async function extractTextFromPdf(
  data: ArrayBuffer | Uint8Array,
  maxPages?: number
): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  const pdfWorkerUrl = (await import('pdfjs-dist/build/pdf.worker.mjs?url')).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  const fileData = data instanceof Uint8Array ? data : new Uint8Array(data);
  const loadingTask = pdfjsLib.getDocument({ data: fileData });
  const pdfDoc = await loadingTask.promise;
  const numPages = maxPages ? Math.min(pdfDoc.numPages, maxPages) : pdfDoc.numPages;

  const pageTexts: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    try {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      const text = textContent.items
        .map((item: any) => (typeof item.str === 'string' ? item.str : ''))
        .join(' ')
        .trim();

      if (text) {
        pageTexts.push(`--- Página ${i} ---\n${text}`);
      }
    } catch (err) {
      console.warn(`[extractTextFromPdf] Error reading text on page ${i}:`, err);
    }
  }

  return pageTexts.join('\n\n');
}
