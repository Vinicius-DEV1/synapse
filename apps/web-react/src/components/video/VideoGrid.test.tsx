import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import VideoGrid from './VideoGrid';
import type { VideoItem } from '../../types';

describe('VideoGrid Component', () => {
  const mockVideos: VideoItem[] = [
    {
      id: 'vid_1',
      title: 'Aula 01 - Introdução a Algoritmos',
      duration: 1200,
      is_local: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'vid_2',
      title: 'Aula 02 - Estruturas de Dados',
      duration: 1800,
      is_local: false,
      collection_id: 'col_1',
      collection_name: 'Curso de Algoritmos',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  it('renders standalone videos and folders', () => {
    const onPlayVideo = vi.fn();

    render(
      <VideoGrid
        videos={mockVideos}
        onPlayVideo={onPlayVideo}
        onDownloadVideo={vi.fn()}
        onDeleteLocal={vi.fn()}
        onDeleteCloud={vi.fn()}
      />
    );

    // Standalone video deve estar na tela inicial
    expect(screen.getByText('Aula 01 - Introdução a Algoritmos')).toBeInTheDocument();
    // Pasta da coleção
    expect(screen.getByText('Curso de Algoritmos')).toBeInTheDocument();
  });

  it('navigates into collection folder when folder is clicked', () => {
    render(
      <VideoGrid
        videos={mockVideos}
        onPlayVideo={vi.fn()}
        onDownloadVideo={vi.fn()}
        onDeleteLocal={vi.fn()}
        onDeleteCloud={vi.fn()}
      />
    );

    const folderCard = screen.getByText('Curso de Algoritmos').closest('div');
    fireEvent.click(folderCard!);

    // Agora o vídeo da pasta deve aparecer
    expect(screen.getByText('Aula 02 - Estruturas de Dados')).toBeInTheDocument();
  });
});
