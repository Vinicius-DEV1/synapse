import { describe, it, expect, beforeEach } from 'vitest';
import { getWebDb } from '../../services/db-web';
import { webYoutubeApi } from './youtube';

describe('webYoutubeApi (IndexedDB)', () => {
  let api: ReturnType<typeof webYoutubeApi>;

  beforeEach(async () => {
    const db = await getWebDb();
    await db.clear('youtube_watched');
    await db.clear('youtube_summaries');
    let counter = 0;
    api = webYoutubeApi(db, () => `yt-${++counter}`);
  });

  it('sets and retrieves watched videos correctly', async () => {
    await api.setWatched('video-1', true, 'Curso de Rust', 'Canal Tech');
    await api.setWatched('video-2', true, 'Curso de React 19', 'Frontend Masters');

    const watched = await api.getWatched(['video-1', 'video-2', 'video-3']);
    expect(watched).toHaveLength(2);
    expect(watched).toContain('video-1');
    expect(watched).toContain('video-2');
    expect(watched).not.toContain('video-3');

    // Unmark video-1
    await api.setWatched('video-1', false);
    const updatedWatched = await api.getWatched(['video-1', 'video-2']);
    expect(updatedWatched).toEqual(['video-2']);
  });

  it('saves and retrieves video summaries', async () => {
    const saveRes = await api.saveSummary(
      'vid-100',
      'Como funciona o Event Loop',
      'Tech Channel',
      'Explicação passo a passo do call stack e microtasks',
      'Transcrição completa do vídeo...'
    );
    expect(saveRes).toBe(true);

    const summary = await api.getSummary('vid-100');
    expect(summary).not.toBeNull();
    expect(summary?.title).toBe('Como funciona o Event Loop');
    expect(summary?.summary).toContain('call stack');
    expect(summary?.channel_name).toBe('Tech Channel');

    const missing = await api.getSummary('vid-inexistente');
    expect(missing).toBeNull();
  });
});
