export function srtToVtt(srtContent: string): string {
  // Replace commas with periods in timestamps (00:00:01,000 -> 00:00:01.000)
  let vtt = srtContent.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  
  // Add required WebVTT header
  vtt = 'WEBVTT\n\n' + vtt;
  
  return vtt;
}

export async function processSubtitleFile(file: File): Promise<string> {
  const text = await file.text();
  if (file.name.toLowerCase().endsWith('.srt')) {
    return srtToVtt(text);
  }
  return text; // Assumes text is already valid VTT or compatible
}
