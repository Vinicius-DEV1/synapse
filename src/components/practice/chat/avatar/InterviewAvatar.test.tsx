import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { InterviewAvatar } from './InterviewAvatar';
import React from 'react';

describe('InterviewAvatar', () => {
  it('renders interviewer name and job title', () => {
    const dummyRef = { current: null };

    render(
      <InterviewAvatar
        isPlaying={false}
        isRecording={false}
        playbackAnalyserRef={dummyRef}
        jobTitle="Engenheiro de Software Frontend"
        interviewerName="Carlos Mendes"
      />
    );

    expect(screen.getByText('Carlos Mendes')).toBeInTheDocument();
    expect(screen.getByText('Entrevistador')).toBeInTheDocument();
    expect(screen.getByText('Engenheiro de Software Frontend')).toBeInTheDocument();
  });

  it('renders avatar SVG illustration properly', () => {
    const dummyRef = { current: null };

    const { container } = render(
      <InterviewAvatar
        isPlaying={true}
        isRecording={false}
        playbackAnalyserRef={dummyRef}
      />
    );

    const svgElement = container.querySelector('svg');
    expect(svgElement).toBeInTheDocument();
  });
});
