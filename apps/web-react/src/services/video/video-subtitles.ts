import { getValidAccessToken, downloadFromDrive, uploadToDrive, deleteFromDrive } from '../drive';
import { processSubtitleFile } from '../../utils/subtitles';
import type { VideoItem, TrackItem } from '../../types';

const VIDEO_TABLE = 'videos';

/**
 * Safely parses a JSON subtitle tracks string into a TrackItem array.
 */
export function parseSubtitleTracks(json?: string): TrackItem[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Failed to parse subtitle tracks JSON:', e);
    return [];
  }
}

/**
 * Fetches subtitles (VTT) as text.
 * If masterKey is provided, decrypts content (subtitles encrypted during upload).
 */
export async function getSubtitleText(driveSubtitleId?: string, localSubtitlePath?: string, masterKey?: CryptoKey): Promise<string | null> {
  if (!driveSubtitleId && !localSubtitlePath) return null;

  try {
    // 1. Attempt loading from local file first (faster and offline-capable)
    if (localSubtitlePath) {
      try {
        let rawBuffer: ArrayBuffer | null = null;
        if (window.api?.video?.readLocalFile) {
          const uint8 = await window.api.video.readLocalFile(localSubtitlePath);
          if (uint8 && uint8.length > 0) {
            rawBuffer = uint8.buffer.slice(uint8.byteOffset, uint8.byteOffset + uint8.byteLength) as ArrayBuffer;
          }
        } else {
          const fileUrl = 'file:///' + localSubtitlePath.replace(/\\/g, '/');
          const res = await fetch(fileUrl);
          if (res.ok) rawBuffer = await res.arrayBuffer();
        }

        if (rawBuffer && rawBuffer.byteLength > 0) {
          // Check if it's plaintext
          try {
            const plain = new TextDecoder().decode(rawBuffer);
            if (plain.includes('WEBVTT') || plain.includes('-->')) {
              return plain;
            }
          } catch (decodeErr) {
            console.warn('Failed to decode raw buffer as plaintext VTT:', decodeErr);
          }

          // If not plaintext and masterKey is provided, decrypt
          if (masterKey) {
            try {
              const { decryptFile } = await import('../storage');
              const decrypted = await decryptFile(rawBuffer, masterKey);
              return new TextDecoder().decode(decrypted);
            } catch (decErr) {
              console.warn('Failed to decrypt local subtitle with masterKey:', decErr);
            }
          }

          // Fallback: decode directly
          return new TextDecoder().decode(rawBuffer);
        }
      } catch (localErr) {
        console.warn('Failed to read local subtitle file, falling back to Drive:', localErr);
      }
    }

    // 2. Fallback: Download from Google Drive (with decryption if needed)
    if (driveSubtitleId) {
      const token = await getValidAccessToken();
      if (!token) return null;
      
      const buffer = await downloadFromDrive(token, driveSubtitleId);
      
      // Check if plaintext
      try {
        const plain = new TextDecoder().decode(buffer);
        if (plain.includes('WEBVTT') || plain.includes('-->')) {
          return plain;
        }
      } catch (decodeErr) {
        console.warn('Failed to decode Drive buffer as plaintext VTT:', decodeErr);
      }

      if (masterKey) {
        try {
          const { decryptFile } = await import('../storage');
          const decrypted = await decryptFile(buffer, masterKey);
          return new TextDecoder().decode(decrypted);
        } catch (e) {
          console.warn('Failed to decrypt Drive subtitle with masterKey:', e);
        }
      }
      return new TextDecoder().decode(buffer);
    }
    
    return null;
  } catch (e) {
    console.error("Failed to retrieve subtitle text:", e);
    return null;
  }
}

/**
 * Attaches a new SRT/VTT subtitle file to an existing video entity.
 * Automatically converts SRT to WebVTT, encrypts with masterKey (if present), saves locally and on Drive, and updates the DB.
 */
export async function attachSubtitleToVideo(
  video: VideoItem,
  subtitleFile: File,
  customLabel?: string,
  masterKey?: CryptoKey
): Promise<{ updatedVideo: VideoItem; newTrack: TrackItem }> {
  const vttText = await processSubtitleFile(subtitleFile);
  if (!vttText || !vttText.trim()) {
    throw new Error('Selected subtitle file is empty or invalid.');
  }

  const trackId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const cleanFileName = subtitleFile.name.replace(/\.[^/.]+$/, "");
  const label = customLabel?.trim() || cleanFileName || 'New Subtitle';

  const encoder = new TextEncoder();
  let subBuffer = encoder.encode(vttText).buffer as ArrayBuffer;

  let localPath: string | undefined = undefined;
  let driveId: string | undefined = undefined;

  const ext = masterKey ? '.vtt.enc' : '.vtt';

  // 1. Encrypt buffer if masterKey is provided
  if (masterKey) {
    const { encryptFile } = await import('../storage');
    subBuffer = await encryptFile(subBuffer, masterKey);
  }

  // 2. Save locally if running in Desktop / Tauri environment
  if (window.api?.video?.saveLocal && window.api?.video?.getLocalPath) {
    const localFileName = `${video.id}_${trackId}${ext}`;
    await window.api.video.saveLocal(localFileName, subBuffer);
    localPath = (await window.api.video.getLocalPath(localFileName)) || undefined;
  }

  // 3. Upload to Google Drive if connected
  try {
    const token = await getValidAccessToken();
    if (token) {
      const driveFileName = `${video.title || 'video'} - ${label}${ext}`;
      driveId = await uploadToDrive(token, driveFileName, subBuffer, 'root');
    }
  } catch (err) {
    console.warn('Warning: Failed to upload subtitle to Google Drive (saved locally):', err);
  }

  // 4. Update Video entity in database
  const currentSubs = parseSubtitleTracks(video.subtitles_json);

  const newTrack: TrackItem = {
    id: trackId,
    label,
    local_path: localPath,
    drive_id: driveId
  };

  currentSubs.push(newTrack);

  const updatedVideo: VideoItem = {
    ...video,
    subtitles_json: JSON.stringify(currentSubs),
    updated_at: new Date().toISOString()
  };

  if (window.api?.sync) {
    await window.api.sync.upsertRow(VIDEO_TABLE, updatedVideo);
  }

  return { updatedVideo, newTrack };
}

/**
 * Removes a subtitle track from an existing video entity, cleaning up local storage.
 */
export async function removeSubtitleFromVideo(
  video: VideoItem,
  trackId: string
): Promise<VideoItem> {
  const currentSubs = parseSubtitleTracks(video.subtitles_json);
  const trackToRemove = currentSubs.find(t => t.id === trackId);

  // Clean up local file
  if (trackToRemove?.local_path && window.api?.video?.deleteLocal) {
    const filename = trackToRemove.local_path.split(/[\\/]/).pop();
    if (filename) {
      try {
        await window.api.video.deleteLocal(filename);
      } catch (e) {
        console.warn('Failed to delete local subtitle file:', e);
      }
    }
  }

  // Clean up Drive file if token available
  if (trackToRemove?.drive_id) {
    try {
      const token = await getValidAccessToken();
      if (token) {
        await deleteFromDrive(token, trackToRemove.drive_id);
      }
    } catch (e) {
      console.warn('Failed to delete subtitle from Google Drive:', e);
    }
  }

  const updatedSubs = currentSubs.filter(t => t.id !== trackId);
  const updatedVideo: VideoItem = {
    ...video,
    subtitles_json: JSON.stringify(updatedSubs),
    updated_at: new Date().toISOString()
  };

  if (window.api?.sync) {
    await window.api.sync.upsertRow(VIDEO_TABLE, updatedVideo);
  }

  return updatedVideo;
}

/**
 * Renames a subtitle track label in an existing video entity.
 */
export async function renameSubtitleInVideo(
  video: VideoItem,
  trackId: string,
  newLabel: string
): Promise<VideoItem> {
  const currentSubs = parseSubtitleTracks(video.subtitles_json);

  const updatedSubs = currentSubs.map(track => {
    if (track.id === trackId) {
      return { ...track, label: newLabel.trim() || track.label };
    }
    return track;
  });

  const updatedVideo: VideoItem = {
    ...video,
    subtitles_json: JSON.stringify(updatedSubs),
    updated_at: new Date().toISOString()
  };

  if (window.api?.sync) {
    await window.api.sync.upsertRow(VIDEO_TABLE, updatedVideo);
  }

  return updatedVideo;
}

