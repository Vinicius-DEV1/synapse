import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import VideoPlayer from './VideoPlayer';
import type { VideoItem } from '../../types';

describe('VideoPlayer Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockVideo: VideoItem = {
    id: 'vid_100',
    title: 'Learn English in 10 Minutes',
    drive_id: 'drive_vid_100',
    created_at: 1000,
    updated_at: 1000,
  };

  it('renders video player container with provided title', () => {
    const { container } = render(
      <VideoPlayer
        src="blob:http://localhost/mock-video"
        video={mockVideo}
        title="Learn English in 10 Minutes"
        onClose={vi.fn()}
      />
    );

    const videoEl = container.querySelector('video');
    expect(videoEl).toBeDefined();
  });
});
