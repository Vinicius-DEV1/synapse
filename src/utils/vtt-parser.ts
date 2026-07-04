export interface SubtitleCue {
  id?: string;
  startTime: number;
  endTime: number;
  text: string;
}

// Converte "00:00:01.000" para segundos (1.0)
function parseVttTime(timeStr: string): number {
  const parts = timeStr.trim().split(':');
  let seconds = 0;
  if (parts.length === 3) {
    seconds = parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseFloat(parts[2]);
  } else if (parts.length === 2) {
    seconds = parseInt(parts[0], 10) * 60 + parseFloat(parts[1]);
  }
  return seconds;
}

export function parseVtt(vttContent: string): SubtitleCue[] {
  const lines = vttContent.split('\n');
  const cues: SubtitleCue[] = [];
  let currentCue: Partial<SubtitleCue> = {};
  let isCueText = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === 'WEBVTT' || line === '') {
      isCueText = false;
      continue;
    }

    if (line.includes('-->')) {
      const times = line.split('-->');
      currentCue.startTime = parseVttTime(times[0]);
      currentCue.endTime = parseVttTime(times[1]);
      isCueText = true;
      currentCue.text = '';
      continue;
    }

    if (isCueText) {
      if (currentCue.text) {
        currentCue.text += ' ' + line;
      } else {
        currentCue.text = line;
      }
      
      // Look ahead to see if the next line is empty (end of cue)
      if (i === lines.length - 1 || lines[i + 1].trim() === '') {
        // Strip HTML tags sometimes found in VTT (e.g. <b>, <i>)
        const cleanText = currentCue.text.replace(/<[^>]+>/g, '');
        cues.push(currentCue as SubtitleCue);
        currentCue = {};
        isCueText = false;
      }
    }
  }

  return cues;
}
