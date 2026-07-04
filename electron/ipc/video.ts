import { ipcMain, app } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

export function setupVideoIpc() {
  if (ffmpegStatic) {
    ffmpeg.setFfmpegPath(ffmpegStatic);
  }
  if (ffprobeStatic && ffprobeStatic.path) {
    ffmpeg.setFfprobePath(ffprobeStatic.path);
  }
  // Get or create the videos directory
  const getVideosDir = async () => {
    // We use the userData directory for standard storage, or a subfolder in the app if requested.
    // The user requested: "pasta do projeto/videos, mais ele pode alterar nas configurações"
    // For now we default to a 'videos' folder in userData which is safe for Electron
    const videosDir = path.join(app.getPath('userData'), 'videos');
    try {
      await fs.mkdir(videosDir, { recursive: true });
    } catch (e) {
      console.error('Failed to create videos directory', e);
    }
    return videosDir;
  };

  ipcMain.handle('video:getLocalPath', async (_, filename: string) => {
    const videosDir = await getVideosDir();
    const filePath = path.join(videosDir, filename);
    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      return null;
    }
  });

  ipcMain.handle('video:deleteLocal', async (_, filename: string) => {
    const videosDir = await getVideosDir();
    const filePath = path.join(videosDir, filename);
    try {
      await fs.unlink(filePath);
      return true;
    } catch (e) {
      console.error('Failed to delete local video', e);
      return false;
    }
  });

  ipcMain.handle('video:copyLocal', async (_, sourcePath: string, filename: string) => {
    const videosDir = await getVideosDir();
    const destPath = path.join(videosDir, filename);
    try {
      await fs.copyFile(sourcePath, destPath);
      return destPath;
    } catch (e) {
      console.error('Failed to copy local video', e);
      throw e;
    }
  });

  ipcMain.handle('video:saveLocal', async (_, filename: string, buffer: ArrayBuffer) => {
    const videosDir = await getVideosDir();
    const filePath = path.join(videosDir, filename);
    try {
      await fs.writeFile(filePath, Buffer.from(buffer));
      return filePath;
    } catch (e) {
      console.error('Failed to save local video', e);
      throw e;
    }
  });

  ipcMain.handle('video:scanSubtitles', async (_, localPath: string) => {
    return new Promise((resolve) => {
      try {
        ffmpeg.ffprobe(localPath, (err, metadata) => {
          if (err) {
            console.error('[ffprobe] Erro ao analisar o arquivo:', err.message);
            return resolve({ subtitles: [], error: err.message, debug: 'ffprobe callback error' });
          }
          
          const subtitles: { index: string; language?: string; codec: string; title?: string }[] = [];
          const streams = metadata.streams || [];
          
          let subtitleCount = 0;
          streams.forEach((stream) => {
            if (stream.codec_type === 'subtitle') {
              const lang = stream.tags?.language || 'und';
              const title = stream.tags?.title || '';
              subtitles.push({
                index: `0:s:${subtitleCount}`, 
                language: lang,
                codec: stream.codec_name || 'unknown',
                title: title
              });
              subtitleCount++;
            }
          });
          
          resolve({ 
            subtitles, 
            error: null, 
            debug: `Streams found: ${streams.length}, Subs found: ${subtitleCount}, ffprobePath: ${ffprobeStatic?.path || 'unknown'}` 
          });
        });
      } catch (err: any) {
        resolve({ subtitles: [], error: err.message, debug: 'ffprobe try-catch error' });
      }
    });
  });

  ipcMain.handle('video:extractSubtitles', async (_, localPath: string, trackIndex?: string) => {
    return new Promise((resolve) => {
      const vttOutPath = `${localPath}.extracted.vtt`;
      const mapStr = trackIndex || '0:s:0';
      ffmpeg(localPath)
        .outputOptions([
          `-map ${mapStr}`, // Extrai a faixa de legenda escolhida
          '-c:s webvtt' // Converte para o padrão da web (VTT)
        ])
        .output(vttOutPath)
        .on('end', async () => {
          try {
            const content = await fs.readFile(vttOutPath, 'utf8');
            await fs.unlink(vttOutPath).catch(() => {});
            resolve(content);
          } catch (e) {
            resolve(null);
          }
        })
        .on('error', (err) => {
          console.log(`[ffmpeg] Falha ao extrair legenda ${mapStr}:`, err.message);
          resolve(null);
        })
        .run();
    });
  });

  ipcMain.handle('video:openFileDialog', async () => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Vídeos (MP4, MKV)', extensions: ['mp4', 'mkv'] }
      ]
    });
    
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    
    const filePath = result.filePaths[0];
    const stat = await fs.stat(filePath);
    return {
      path: filePath,
      name: path.basename(filePath),
      size: stat.size,
      type: filePath.toLowerCase().endsWith('.mkv') ? 'video/x-matroska' : 'video/mp4'
    };
  });
}
