import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import VideoPlayer from './VideoPlayer';
import type { VideoItem } from '../../types';

vi.mock('../../hooks/useTimeTracker', () => ({
  useTimeTracker: vi.fn(),
}));

vi.mock('./InteractiveSubtitles', () => ({
  default: () => <div data-testid="interactive-subtitles" />,
}));

vi.mock('../library/DictionaryModal', () => ({
  default: () => <div data-testid="dictionary-modal" />,
}));

vi.mock('./hooks/useVideoProgress', () => ({
  useVideoProgress: vi.fn(() => ({
    progress: 0,
    setProgress: vi.fn(),
    duration: 120,
    setDuration: vi.fn(),
    showResumePrompt: false,
    setShowResumePrompt: vi.fn(),
    savedProgress: 0,
    saveProgress: vi.fn(),
  })),
}));

vi.mock('./hooks/useVideoTracks', () => ({
  useVideoTracks: vi.fn(() => ({
    audioTracks: [],
    subtitleTracks: [],
    activeAudioIndex: -1,
    setActiveAudioIndex: vi.fn(),
    activeSubtitleIndex: 0,
    setActiveSubtitleIndex: vi.fn(),
    activeAudioUrl: null,
  })),
}));

vi.mock('./hooks/useVideoVocabulary', () => ({
  useVideoVocabulary: vi.fn(() => ({
    videoWords: [],
    showVocabDrawer: false,
    setShowVocabDrawer: vi.fn(),
    activeSavedWords: [],
    loadVideoWords: vi.fn(),
  })),
}));

vi.mock('./hooks/useVideoControls', () => ({
  useVideoControls: vi.fn(() => ({
    showControls: true,
    setIsHoveringControls: vi.fn(),
    resetControls: vi.fn(),
  })),
}));

vi.mock('./hooks/useVideoKeyboardShortcuts', () => ({
  useVideoKeyboardShortcuts: vi.fn(),
}));

vi.mock('./ui/VideoControlsOverlay', () => ({
  VideoControlsOverlay: ({ title }: any) => <div data-testid="video-controls">{title}</div>,
}));

vi.mock('./ui/VideoVocabularySidebar', () => ({
  VideoVocabularySidebar: () => <div data-testid="video-vocab-sidebar" />,
}));

vi.mock('./ui/VideoResumePrompt', () => ({
  VideoResumePrompt: () => <div data-testid="video-resume-prompt" />,
}));

describe('VideoPlayer Component', () => {
  const mockVideo: VideoItem = {
    id: 'vid_100',
    title: 'Learn English in 10 Minutes',
    drive_id: 'drive_vid_100',
    created_at: 1000,
    updated_at: 1000,
  };

  it('renders video container with controls and subtitle layer', () => {
    const { getByTestId, container } = render(
      <VideoPlayer
        src="blob:http://localhost/mock-video"
        video={mockVideo}
        title="Learn English in 10 Minutes"
        onClose={vi.fn()}
      />
    );

    const videoEl = container.querySelector('video');
    expect(videoEl).toBeDefined();
    expect(getByTestId('video-controls')).toBeDefined();
  });
});
