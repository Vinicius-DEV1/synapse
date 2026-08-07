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
  file: File, 
  quality: 'original' | '1080p' | '720p',
  onProgress: (p: number) => void
): Promise<Blob> {
  if (quality === 'original') {
    return file; // No transcoding
  }

  const ffmpeg = await getFFmpeg();
  
  ffmpeg.on('progress', ({ progress }) => {
    onProgress(progress * 100);
  });

  const inputName = 'input' + file.name.substring(file.name.lastIndexOf('.'));
  const outputName = 'output.mp4';

  await ffmpeg.writeFile(inputName, await fetchFile(file));

  const args = ['-i', inputName];
  
  if (quality === '1080p') {
    args.push('-c:v', 'libx264', '-c:a', 'aac', '-preset', 'ultrafast', '-crf', '28', '-vf', 'scale=-2:1080');
  } else if (quality === '720p') {
    args.push('-c:v', 'libx264', '-c:a', 'aac', '-preset', 'ultrafast', '-crf', '28', '-vf', 'scale=-2:720');
  }

  args.push(outputName);

  await ffmpeg.exec(args);

  const data = await ffmpeg.readFile(outputName);
  
  // Cleanup memory
  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);
  
  return new Blob([data], { type: 'video/mp4' });
}
