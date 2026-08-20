import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MicTestWidget } from './MicTestWidget';

describe('MicTestWidget component', () => {
  beforeEach(() => {
    class MockMediaRecorder {
      ondataavailable: ((e: any) => void) | null = null;
      onstop: (() => void) | null = null;
      start = vi.fn();
      stop = vi.fn().mockImplementation(() => {
        if (this.onstop) this.onstop();
      });
    }
    (window as any).MediaRecorder = MockMediaRecorder;

    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }]),
        }),
      },
    });

    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:audio-test-url');
  });

  it('renders initial microphone test button', () => {
    render(<MicTestWidget />);
    const testButton = screen.getByTitle('Testar microfone antes da ligação');
    expect(testButton).toBeInTheDocument();
  });

  it('starts test recording on click and stops when stop button clicked', async () => {
    render(<MicTestWidget />);

    fireEvent.click(screen.getByTitle('Testar microfone antes da ligação'));

    await waitFor(() => {
      expect(screen.getByText('Gravando teste...')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Gravando teste...'));

    await waitFor(() => {
      expect(screen.getByTitle('Ouvir áudio gravado')).toBeInTheDocument();
    });
  });
});
