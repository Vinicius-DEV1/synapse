import { getValidAccessToken, deleteFromDrive } from '../drive';
import type { VideoItem, TrackItem } from '../../types';

/**
 * Permanently and completely deletes a video item:
 * 1. Removes all local video files (original, encrypted, and web versions)
 * 2. Removes all local secondary audio files and subtitle files
 * 3. Removes all linked files in Google Drive (main, web, audios, subtitles)
 * 4. Removes associated video_words/highlights
 * 5. Soft-deletes from database with deleted_at timestamp for cloud sync
 */
export async function deleteVideoAndSync(video: VideoItem & { local_subtitle_path?: string }): Promise<void> {
  // 1. Delete local video files (original, web, enc variants)
  if (window.api?.video?.deleteLocal) {
    const localDeletions: Promise<unknown>[] = [];

    if (video.original_name) {
      localDeletions.push(
        window.api.video.deleteLocal(video.original_name).catch(e => console.warn("Warning deleting local video:", e))
      );
    }
    if (video.file_path) {
      const filename = video.file_path.split(/[\\/]/).pop();
      if (filename && filename !== video.original_name) {
        localDeletions.push(
          window.api.video.deleteLocal(filename).catch(e => console.warn("Warning deleting alternative local file:", e))
        );
      }
    }
    
    // 2. Delete local audio tracks
    try {
      const audios: TrackItem[] = JSON.parse(video.audio_tracks_json || '[]');
      for (const track of audios) {
        if (track.local_path) {
          const fname = track.local_path.split(/[\\/]/).pop();
          if (fname) {
            localDeletions.push(
              window.api.video.deleteLocal(fname).catch(e => console.warn("Warning deleting local audio track:", e))
            );
          }
        }
      }
    } catch (e) {
      console.warn("Failed to parse audios_json for local deletion:", e);
    }

    // 3. Delete local subtitle tracks
    try {
      const subs: TrackItem[] = JSON.parse(video.subtitles_json || '[]');
      for (const track of subs) {
        if (track.local_path) {
          const fname = track.local_path.split(/[\\/]/).pop();
          if (fname) {
            localDeletions.push(
              window.api.video.deleteLocal(fname).catch(e => console.warn("Warning deleting local subtitle track:", e))
            );
          }
        }
      }
    } catch (e) {
      console.warn("Failed to parse subtitles_json for local deletion:", e);
    }

    // 4. Delete standalone local subtitle path if present
    if (video.local_subtitle_path) {
      const fname = video.local_subtitle_path.split(/[\\/]/).pop();
      if (fname) {
        localDeletions.push(
          window.api.video.deleteLocal(fname).catch(e => console.warn("Warning deleting standalone subtitle:", e))
        );
      }
    }

    await Promise.all(localDeletions);
  }

  // 5. Delete all linked files in Google Drive (if authenticated)
  try {
    const token = await getValidAccessToken();
    if (token) {
      const driveDeletions: Promise<unknown>[] = [];

      // Main file
      if (video.drive_file_id) {
        driveDeletions.push(
          deleteFromDrive(token, video.drive_file_id).catch(e => console.warn("Warning deleting main Drive video:", e))
        );
      }
      // Alternative Web file
      if (video.drive_web_file_id) {
        driveDeletions.push(
          deleteFromDrive(token, video.drive_web_file_id).catch(e => console.warn("Warning deleting web Drive video:", e))
        );
      }

      // Extra audio tracks in Drive
      try {
        const audios: TrackItem[] = JSON.parse(video.audio_tracks_json || '[]');
        for (const track of audios) {
          if (track.drive_id) {
            driveDeletions.push(
              deleteFromDrive(token, track.drive_id).catch(e => console.warn("Warning deleting extra Drive audio:", e))
            );
          }
        }
      } catch (e) {
        console.warn("Failed to parse audios_json for Drive deletion:", e);
      }

      // Extra subtitles in Drive
      try {
        const subs: TrackItem[] = JSON.parse(video.subtitles_json || '[]');
        for (const track of subs) {
          if (track.drive_id) {
            driveDeletions.push(
              deleteFromDrive(token, track.drive_id).catch(e => console.warn("Warning deleting extra Drive subtitle:", e))
            );
          }
        }
      } catch (e) {
        console.warn("Failed to parse subtitles_json for Drive deletion:", e);
      }

      await Promise.all(driveDeletions);
    }
  } catch (driveErr) {
    console.warn("Warning: Google Drive offline, continuing local deletion:", driveErr);
  }

  // 6. Delete associated vocabulary / words
  if (window.api?.sync) {
    try {
      const words = await window.api.sync.getTable('video_words') as Array<{ id: string; video_id: string }>;
      const relatedWords = words.filter(w => w.video_id === video.id);
      await Promise.all(
        relatedWords.map(w => 
          window.api.sync.upsertRow('video_words', {
            ...w,
            deleted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }).catch(e => console.warn("Warning deleting associated word:", e))
        )
      );
    } catch (e) {
      console.warn("Failed to clean video_words:", e);
    }
  }

  // 7. Delete from Database (soft-delete to sync deletion across devices)
  if (window.api?.sync) {
    await window.api.sync.upsertRow('videos', {
      ...video,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }
}

