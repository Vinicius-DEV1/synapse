export interface SubtitleCue {
  id?: string;
  startTime: number;
  endTime: number;
  text: string;
}

function parseVttTime(timeStr: string): number {
  // Extract only the time part, e.g., "00:00:02.000" from "00:00:02.000 align:start"
  let cleanTime = timeStr.trim().split(/\s+/)[0];
  cleanTime = cleanTime.replace(',', '.'); // Handle SRT style commas
  const parts = cleanTime.split(':');
  let seconds = 0;
  if (parts.length === 3) {
    seconds = parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseFloat(parts[2]);
  } else if (parts.length === 2) {
    seconds = parseInt(parts[0], 10) * 60 + parseFloat(parts[1]);
  }
  return seconds;
}

function sanitizeCueText(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, '') // Strip HTML tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseVtt(vttContent: string): SubtitleCue[] {
  if (!vttContent || !vttContent.trim()) return [];

  // Normalize line endings
  const lines = vttContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const cues: SubtitleCue[] = [];
  let currentCue: Partial<SubtitleCue> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === 'WEBVTT' || line.startsWith('NOTE') || line.startsWith('STYLE')) {
      continue;
    }

    if (line.includes('-->')) {
      // If there was an unfinalized cue from before, push it!
      if (currentCue && currentCue.text && currentCue.startTime !== undefined && currentCue.endTime !== undefined) {
        cues.push({
          startTime: currentCue.startTime,
          endTime: currentCue.endTime,
          text: sanitizeCueText(currentCue.text)
        });
      }

      const times = line.split('-->');
      currentCue = {
        startTime: parseVttTime(times[0]),
        endTime: parseVttTime(times[1]),
        text: ''
      };
      continue;
    }

    if (currentCue) {
      if (line === '') {
        // End of cue block
        if (currentCue.text && currentCue.startTime !== undefined && currentCue.endTime !== undefined) {
          cues.push({
            startTime: currentCue.startTime,
            endTime: currentCue.endTime,
            text: sanitizeCueText(currentCue.text)
          });
        }
        currentCue = null;
      } else {
        if (currentCue.text) {
          currentCue.text += ' ' + line;
        } else {
          currentCue.text = line;
        }
      }
    }
  }

  // Push final cue at end of file if any
  if (currentCue && currentCue.text && currentCue.startTime !== undefined && currentCue.endTime !== undefined) {
    cues.push({
      startTime: currentCue.startTime,
      endTime: currentCue.endTime,
      text: sanitizeCueText(currentCue.text)
    });
  }

  return cues;
}

