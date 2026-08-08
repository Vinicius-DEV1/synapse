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
        // Strip HTML tags sometimes found in VTT (e.g. <b>, <i>, <c.color>)
        currentCue.text = currentCue.text.replace(/<[^>]+>/g, '');
        
        // Also decode standard HTML entities just in case (e.g. &amp;, &lt;, &gt;, &quot;, &#39;)
        currentCue.text = currentCue.text
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&nbsp;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        cues.push(currentCue as SubtitleCue);
        currentCue = {};
        isCueText = false;
      }
    }
  }

  return cues;
}
