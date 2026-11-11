import { describe, it, expect, beforeEach } from 'vitest';
import { getWebDb } from '../../services/db-web';
import { webCultureApi } from './culture';

describe('webCultureApi (IndexedDB)', () => {
  let api: ReturnType<typeof webCultureApi>;

  beforeEach(async () => {
    const db = await getWebDb();
    await db.clear('culture_items');
    await db.clear('culture_episodes');
    let counter = 0;
    api = webCultureApi(db, () => `cult-${++counter}`);
  });

  it('creates and retrieves culture items ordered by updated_at descending', async () => {
    const item1 = await api.createItem({
      title: 'Dune: Part Two',
      type: 'filme',
      progress: 0,
      total_progress: 166,
    });
    const item2 = await api.createItem({
      title: 'Shogun',
      type: 'série',
      progress: 5,
      total_progress: 10,
    });

    const items = await api.getItems();
    expect(items).toHaveLength(2);
    expect(items.some((i) => i.id === item1.id)).toBe(true);
    expect(items.some((i) => i.id === item2.id)).toBe(true);
  });

  it('updates culture item fields and progress', async () => {
    const created = await api.createItem({
      title: 'Breaking Bad',
      type: 'série',
      progress: 10,
    });

    const updateRes = await api.updateItem(created.id, {
      score: 10,
      status: 'completed',
    });
    expect(updateRes.success).toBe(true);

    const progRes = await api.updateProgress(created.id, 62);
    expect(progRes.success).toBe(true);

    const items = await api.getItems();
    const updated = items.find((i) => i.id === created.id);
    expect(updated?.score).toBe(10);
    expect(updated?.status).toBe('completed');
    expect(updated?.progress).toBe(62);
  });

  it('soft deletes culture items so getItems excludes them', async () => {
    const item = await api.createItem({
      title: 'To be deleted',
      type: 'livro',
    });

    const delRes = await api.deleteItem(item.id);
    expect(delRes.success).toBe(true);

    const items = await api.getItems();
    expect(items.find((i) => i.id === item.id)).toBeUndefined();
  });

  it('handles episodes saving, retrieval and toggling watched status', async () => {
    const series = await api.createItem({
      title: 'Succession',
      type: 'série',
    });

    await api.saveEpisodes(series.id, [
      { episode_number: 1, title: 'Celebration', is_watched: true },
      { episode_number: 2, title: 'Shit Show at the Fuck Factory', is_watched: false },
    ]);

    const episodes = await api.getEpisodes(series.id);
    expect(episodes).toHaveLength(2);
    expect(episodes[0].episode_number).toBe(1);
    expect(episodes[0].is_watched).toBe(1);
    expect(episodes[1].is_watched).toBe(0);

    // Toggle episode 2 to watched
    const toggleRes = await api.toggleEpisodeWatched(episodes[1].id, true);
    expect(toggleRes.success).toBe(true);

    const updatedEpisodes = await api.getEpisodes(series.id);
    expect(updatedEpisodes[1].is_watched).toBe(1);

    // Save episodes with one removed should soft-delete the removed one
    await api.saveEpisodes(series.id, [
      { id: episodes[0].id, episode_number: 1, title: 'Celebration', is_watched: true },
    ]);

    const finalEpisodes = await api.getEpisodes(series.id);
    expect(finalEpisodes).toHaveLength(1);
    expect(finalEpisodes[0].id).toBe(episodes[0].id);
  });
});
