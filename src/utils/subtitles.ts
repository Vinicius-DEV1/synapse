export function srtToVtt(srtContent: string): string {
  // Substitui vírgulas por pontos nos timestamps (00:00:01,000 -> 00:00:01.000)
  let vtt = srtContent.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  
  // Adiciona o cabeçalho obrigatório do formato WebVTT
  vtt = 'WEBVTT\n\n' + vtt;
  
  return vtt;
}

export async function processSubtitleFile(file: File): Promise<string> {
  const text = await file.text();
  if (file.name.toLowerCase().endsWith('.srt')) {
    return srtToVtt(text);
  }
  return text; // Presume que já é VTT ou formato compatível
}
