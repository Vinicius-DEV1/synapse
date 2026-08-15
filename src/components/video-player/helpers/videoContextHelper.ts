import type { SubtitleCue } from '../../../utils/vtt-parser';

export function formatVideoTime(timeInSeconds: number): string {
  const h = Math.floor(timeInSeconds / 3600);
  const m = Math.floor((timeInSeconds % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(timeInSeconds % 60).toString().padStart(2, '0');
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

export function buildVideoSubtitleContext(
  cues: SubtitleCue[],
  currentIndex: number,
  title: string,
  fallbackContext: string
): string {
  if (currentIndex === -1) return fallbackContext;

  const currentCue = cues[currentIndex];
  const currentLine = `[${(currentCue.startTime * 1000).toFixed(0)}ms - ${(currentCue.endTime * 1000).toFixed(0)}ms]: \n${currentCue.text.trim()}`;

  const backwardLines: string[] = [];
  let backChars = 0;
  let backIdx = currentIndex - 1;
  while (backIdx >= 0 && backChars < 1600) {
    const c = cues[backIdx];
    const line = `[${(c.startTime * 1000).toFixed(0)}ms - ${(c.endTime * 1000).toFixed(0)}ms]: \n${c.text.trim()}`;
    backwardLines.unshift(line);
    backChars += line.length;
    backIdx--;
  }

  const forwardLines: string[] = [];
  let fwdChars = 0;
  let fwdIdx = currentIndex + 1;
  while (fwdIdx < cues.length && fwdChars < 1600) {
    const c = cues[fwdIdx];
    const line = `[${(c.startTime * 1000).toFixed(0)}ms - ${(c.endTime * 1000).toFixed(0)}ms]: \n${c.text.trim()}`;
    forwardLines.push(line);
    fwdChars += line.length;
    fwdIdx++;
  }

  const contextLines = [...backwardLines, currentLine, ...forwardLines];
  return `Metadados do Vídeo:\nTítulo: "${title}"\n\nContexto das Legendas (Tempo Mínimo e Máximo em ms):\n${contextLines.join('\n')}`;
}

export function calculateVideoClip(
  cues: SubtitleCue[],
  currentIndex: number,
  sourcePath: string
): { path: string; startMs: number; endMs: number } | undefined {
  if (currentIndex === -1) return undefined;
  const cue = cues[currentIndex];
  const startMs = Math.max(0, (cue.startTime - 0.5) * 1000);
  const endMs = (cue.endTime + 0.5) * 1000;
  return { path: sourcePath, startMs, endMs };
}
