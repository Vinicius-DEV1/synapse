import { ipcMain, app } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

import { getDb } from '../db/connection';

export function setupVideoIpc() {
  if (ffmpegStatic) {
    ffmpeg.setFfmpegPath(ffmpegStatic);
  }
  if (ffprobeStatic && ffprobeStatic.path) {
    ffmpeg.setFfprobePath(ffprobeStatic.path);
  }
  
  // Get or create the videos directory
  const getVideosDir = async () => {
    return new Promise<string>((resolve) => {
      try {
        const db = getDb();
        db.get('SELECT data FROM config WHERE id = ?', ['videoStoragePath'], async (err, row: any) => {
          let videosDir = path.join(app.getPath('userData'), 'videos');
          
          if (!err && row && row.data) {
            const customPath = JSON.parse(row.data);
            if (customPath && typeof customPath === 'string') {
              videosDir = customPath;
            }
          }
          
          try {
            await fs.mkdir(videosDir, { recursive: true });
          } catch (e) {
            console.error('Failed to create videos directory', e);
          }
          resolve(videosDir);
        });
      } catch (e) {
        const fallback = path.join(app.getPath('userData'), 'videos');
        resolve(fallback);
      }
    });
  };

  ipcMain.handle('video:openFolderDialog', async () => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Selecione a pasta para salvar os vídeos'
    });
    
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

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

  ipcMain.handle('video:scanTracks', async (_, localPath: string) => {
    return new Promise((resolve) => {
      try {
        ffmpeg.ffprobe(localPath, (err, metadata) => {
          if (err) {
            console.error('[ffprobe] Erro ao analisar o arquivo:', err.message);
            return resolve({ subtitles: [], audioTracks: [], error: err.message, debug: 'ffprobe callback error' });
          }
          
          const subtitles: { index: string; language?: string; codec: string; title?: string }[] = [];
          const audioTracks: { index: string; language?: string; codec: string; title?: string }[] = [];
          const streams = metadata.streams || [];
          
          let subtitleCount = 0;
          let audioCount = 0;
          
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
            } else if (stream.codec_type === 'audio') {
              const lang = stream.tags?.language || 'und';
              const title = stream.tags?.title || '';
              audioTracks.push({
                index: `0:a:${audioCount}`, 
                language: lang,
                codec: stream.codec_name || 'unknown',
                title: title
              });
              audioCount++;
            }
          });
          
          resolve({ 
            subtitles, 
            audioTracks,
            error: null, 
            debug: `Streams found: ${streams.length}, Subs: ${subtitleCount}, Audios: ${audioCount}` 
          });
        });
      } catch (err: any) {
        resolve({ subtitles: [], audioTracks: [], error: err.message, debug: 'ffprobe try-catch error' });
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

  ipcMain.handle('video:extractAudio', async (_, localPath: string, trackIndex: string) => {
    return new Promise((resolve) => {
      // Create a unique temporary file path for the extracted audio
      const audioOutPath = `${localPath}_${trackIndex.replace(/:/g, '')}.m4a`;
      ffmpeg(localPath)
        .outputOptions([
          `-map ${trackIndex}`,
          '-c:a aac', // Convert to AAC for guaranteed web compatibility
          '-b:a 128k' // Reasonable bitrate to save space
        ])
        .output(audioOutPath)
        .on('end', () => {
          resolve(audioOutPath);
        })
        .on('error', (err) => {
          console.error(`[ffmpeg] Falha ao extrair áudio ${trackIndex}:`, err.message);
          resolve(null);
        })
        .run();
    });
  });

  ipcMain.handle('video:remuxDefaultTrack', async (_, sourcePath: string, filename: string, trackIndex: string) => {
    const videosDir = await getVideosDir();
    const destPath = path.join(videosDir, filename);
    
    return new Promise((resolve, reject) => {
      ffmpeg(sourcePath)
        .outputOptions([
          '-map 0:v',          // Include all video streams
          `-map ${trackIndex}`, // Include the chosen audio stream FIRST (makes it default)
          '-map 0:a',          // Include all other audio streams so they are not lost inside the MKV
          '-map 0:s?',         // Include all subtitle streams (if any)
          '-c copy'            // Copy streams without re-encoding (Zero quality loss, very fast)
        ])
        .output(destPath)
        .on('end', () => {
          resolve(destPath);
        })
        .on('error', (err) => {
          console.error(`[ffmpeg] Falha ao fazer o remux do arquivo principal:`, err.message);
          reject(err);
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
  ipcMain.handle('youtube:fetchInfo', async (_, url: string) => {
    return new Promise((resolve, reject) => {
      try {
        const { spawn } = require('child_process');
        const youtubedl = require('youtube-dl-exec');
        const ytdlPath = youtubedl.constants.YOUTUBE_DL_PATH;

        const args = [
          url,
          '--dump-single-json',
          '--no-check-certificates',
          '--no-warnings',
          '--prefer-free-formats',
          '--add-header', 'referer:youtube.com',
          '--add-header', 'user-agent:Mozilla/5.0'
        ];

        const subprocess = spawn(ytdlPath, args, { shell: false });
        let stdoutData = '';
        let stderrData = '';

        subprocess.stdout.on('data', (data: Buffer) => { stdoutData += data.toString(); });
        subprocess.stderr.on('data', (data: Buffer) => { stderrData += data.toString(); });

        subprocess.on('close', (code: number) => {
          if (code === 0) {
            try {
              resolve(JSON.parse(stdoutData));
            } catch (e) {
              reject(new Error("Falha ao ler dados do vídeo."));
            }
          } else {
            console.error('youtube-dl stderr:', stderrData);
            reject(new Error(`Falha ao buscar informações do vídeo (Code: ${code})`));
          }
        });
      } catch (e: any) {
        reject(e);
      }
    });
  });

  ipcMain.handle('youtube:download', async (event, url: string, filename: string, quality: string, subs?: string[]) => {
    const videosDir = await getVideosDir();
    const finalFilename = filename.replace(/\.mp4$/, '.mkv');
    const destPath = path.join(videosDir, finalFilename);
    
    return new Promise((resolve, reject) => {
      try {
        const { spawn } = require('child_process');
        const youtubedl = require('youtube-dl-exec');
        const ytdlPath = youtubedl.constants.YOUTUBE_DL_PATH;
        
        const formatCode = quality === 'best' ? 'bestvideo+bestaudio/best' : quality;
        
        const args = [
          url,
          '--output', destPath,
          '--format', formatCode,
          '--merge-output-format', 'mkv',
          '--no-check-certificates',
          '--no-warnings',
          '--prefer-free-formats',
          '--add-header', 'referer:youtube.com',
          '--add-header', 'user-agent:Mozilla/5.0'
        ];

        if (ffmpegStatic) {
          args.push('--ffmpeg-location', ffmpegStatic);
        }

        if (subs && subs.length > 0) {
          args.push('--write-subs', '--write-auto-subs', '--sub-langs', subs.join(','), '--embed-subs', '--compat-options', 'no-keep-subs');
        }
        
        const subprocess = spawn(ytdlPath, args, { shell: false });

        subprocess.stdout.on('data', (data: Buffer) => {
          const str = data.toString();
          const match = str.match(/\[download\]\s+([\d\.]+)%/);
          if (match && match[1]) {
            const percent = parseFloat(match[1]);
            if (!isNaN(percent)) {
              event.sender.send('youtube:download-progress', percent);
            }
          }
        });

        subprocess.stderr.on('data', (data: Buffer) => {
          console.error(`[youtube-dl] stderr: ${data.toString()}`);
        });

        subprocess.on('close', (code: number) => {
          if (code === 0) {
            resolve(destPath);
          } else {
            reject(new Error(`Download failed with code ${code}`));
          }
        });
      } catch (e) {
        reject(e);
      }
    });
  });
}
