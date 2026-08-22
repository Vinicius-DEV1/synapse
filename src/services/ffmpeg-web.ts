import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

// NOTE (Web Performance): ffmpeg.wasm runs on a single worker and loads full buffers 
// virtual RAM memory (MEMFS).
// Very large files (>500MB) can cause OOM errors in browser tabs.
// Heavy transcoding is delegated to Desktop (Tauri + native binaries).

let ffmpeg: FFmpeg | null = null;

export async function getFFmpeg(onLog?: (msg: string) => void): Promise<FFmpeg> {
  if (ffmpeg) return ffmpeg;

  ffmpeg = new FFmpeg();
  
  if (onLog) {
    ffmpeg.on('log', ({ message }) => onLog(message));
  }

  // Load ffmpeg.wasm single-thread core
  await ffmpeg.load({
    coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js',
    wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm',
  });

  return ffmpeg;
}

export async function processVideoWeb(
  file: Blob, 
  quality: string,
  conversionPreset: string,
  onProgress: (progress: number) => void,
  signal?: AbortSignal
): Promise<Blob> {
  if (quality === 'original') {
    return file; // No transcoding
  }

  const ffmpegInstance = await getFFmpeg();
  
  let onAbort: (() => void) | null = null;
  if (signal) {
    onAbort = () => {
      try {
        ffmpegInstance.terminate();
      } catch (e) {}
      ffmpeg = null; // force recreate next time
    };
    signal.addEventListener('abort', onAbort);
    if (signal.aborted) onAbort();
  }
  
  ffmpegInstance.on('progress', ({ progress }) => {
    onProgress(progress * 100);
  });

  // @ts-ignore
  const inputName = 'input' + (file.name ? file.name.substring(file.name.lastIndexOf('.')) : '.mp4');
  const outputName = 'output.mp4';

  try {
    await ffmpegInstance.writeFile(inputName, await fetchFile(file));

    const args = ['-i', inputName];
    
    if (quality === 'remux') {
      args.push('-c:v', 'copy', '-c:a', 'aac');
    } else if (quality === '1080p') {
      args.push('-c:v', 'libx264', '-c:a', 'aac', '-preset', conversionPreset, '-crf', '28', '-vf', 'scale=-2:1080');
    } else if (quality === '720p') {
      args.push('-c:v', 'libx264', '-c:a', 'aac', '-preset', conversionPreset, '-crf', '28', '-vf', 'scale=-2:720');
    } else if (quality === '480p') {
      args.push('-c:v', 'libx264', '-c:a', 'aac', '-preset', conversionPreset, '-crf', '28', '-vf', 'scale=-2:480');
    } else if (quality === '360p') {
      args.push('-c:v', 'libx264', '-c:a', 'aac', '-preset', conversionPreset, '-crf', '28', '-vf', 'scale=-2:360');
    } else {
      args.push('-c:v', 'libx264', '-c:a', 'aac', '-preset', conversionPreset, '-crf', '28', '-vf', 'scale=-2:720');
    }

    args.push(outputName);

    await ffmpegInstance.exec(args);

    const data = await ffmpegInstance.readFile(outputName);
    const blobPart = typeof data === 'string' ? data : new Uint8Array(data);
    return new Blob([blobPart], { type: 'video/mp4' });
  } finally {
    // Cleanup memory in finally block to avoid MEMFS leaks (OOM)
    try { await ffmpegInstance.deleteFile(inputName); } catch(e) {}
    try { await ffmpegInstance.deleteFile(outputName); } catch(e) {}
    if (signal && onAbort) {
      signal.removeEventListener('abort', onAbort);
    }
  }
}
