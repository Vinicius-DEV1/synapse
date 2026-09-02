export function srtToVtt(srtContent: string): string {
  // Normalize newlines
  let clean = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Strip UTF-8 BOM if present
  if (clean.charCodeAt(0) === 0xFEFF) {
    clean = clean.slice(1);
  }

  // Replace commas with periods in timestamps (00:00:01,000 -> 00:00:01.000)
  let vtt = clean.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  
  // Add required WebVTT header if missing
  if (!vtt.trim().startsWith('WEBVTT')) {
    vtt = 'WEBVTT\n\n' + vtt;
  }
  
  return vtt;
}

export async function processSubtitleFile(file: File): Promise<string> {
  const text = await file.text();
  return srtToVtt(text);
}

