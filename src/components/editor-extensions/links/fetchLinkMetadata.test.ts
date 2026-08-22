import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchLinkMetadata } from './fetchLinkMetadata';

describe('fetchLinkMetadata service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches YouTube oEmbed metadata when URL is a youtube link', async () => {
    const mockOEmbed = {
      title: 'Aprenda TypeScript em 10 Minutos',
      author_name: 'Dev Channel',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockOEmbed,
    } as Response);

    const meta = await fetchLinkMetadata('https://www.youtube.com/watch?v=abc123xyz');
    expect(meta.title).toBe('Aprenda TypeScript em 10 Minutos');
    expect(meta.channel).toBe('Dev Channel');
  });

  it('falls back to hostname when all proxy providers fail', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

    const meta = await fetchLinkMetadata('https://antigravity.google.com/docs');
    expect(meta.title).toBe('antigravity.google.com');
  });
});
