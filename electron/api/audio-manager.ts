import { app, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { EdgeTTS } from 'node-edge-tts';

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

export function registerAudioHandlers() {
  const mediaDir = path.join(app.getPath('userData'), 'media', 'anki');
  if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir, { recursive: true });
  }

  ipcMain.handle('audio:generate-tts', async (_, text: string, lang: string = 'en-US') => {
    try {
      const fileName = `tts_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
      const filePath = path.join(mediaDir, fileName);

      const tts = new EdgeTTS({
        voice: lang === 'en-US' ? 'en-US-AriaNeural' : 'en-GB-SoniaNeural',
      });

      await tts.ttsPromise(text, filePath);
      
      return { success: true, filePath: `file://${filePath.replace(/\\/g, '/')}` };
    } catch (err: any) {
      console.error('Error generating TTS:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('audio:extract-clip', async (_, videoPath: string, startTimeMs: number, endTimeMs: number) => {
    try {
      const fileName = `clip_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
      const filePath = path.join(mediaDir, fileName);

      return new Promise((resolve) => {
        let safeVideoPath = videoPath;
        if (safeVideoPath.startsWith('file://')) {
          try {
            safeVideoPath = fileURLToPath(safeVideoPath);
          } catch(e) {
            safeVideoPath = decodeURI(safeVideoPath.replace('file://', ''));
            if (safeVideoPath.startsWith('/')) safeVideoPath = safeVideoPath.substring(1);
          }
        }
        
        ffmpeg(safeVideoPath)
          .setStartTime(startTimeMs / 1000)
          .setDuration((endTimeMs - startTimeMs) / 1000)
          .output(filePath)
          .audioCodec('libmp3lame')
          .noVideo()
          .on('end', () => {
            resolve({ success: true, filePath: `file://${filePath.replace(/\\/g, '/')}` });
          })
          .on('error', (err) => {
            console.error('Error extracting audio clip:', err);
            resolve({ success: false, error: err.message });
          })
          .run();
      });
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });
}
