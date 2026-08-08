import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

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
  
  if (signal) {
    const onAbort = () => {
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

  const inputName = 'input' + file.name.substring(file.name.lastIndexOf('.'));
  const outputName = 'output.mp4';

  await ffmpegInstance.writeFile(inputName, await fetchFile(file));

  const args = ['-i', inputName];
  
  if (quality === '1080p') {
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
  
  // Cleanup memory
  await ffmpegInstance.deleteFile(inputName);
  await ffmpegInstance.deleteFile(outputName);
  
  return new Blob([data], { type: 'video/mp4' });
}
