import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CultureTrailerSection } from './CultureTrailerSection';
import { CultureTrailerService } from '../../../services/culture/culture-trailer';

describe('CultureTrailerSection', () => {
  beforeEach(() => {
    CultureTrailerService.clearCache();
    vi.restoreAllMocks();
  });

  it('renders "Assistir Trailer Oficial" when a trailer is found', async () => {
    vi.spyOn(CultureTrailerService, 'resolveTrailer').mockResolvedValue({
      youtubeId: 'qiuSBWVdgLI',
      embedUrl: 'https://www.youtube-nocookie.com/embed/qiuSBWVdgLI',
      watchUrl: 'https://www.youtube.com/watch?v=qiuSBWVdgLI',
      source: 'cinemeta',
    });

    render(
      <CultureTrailerSection
        title="Oppenheimer"
        type="filme"
        apiId="tt15398776"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Assistir Trailer Oficial')).toBeInTheDocument();
    });
  });

  it('expands embedded iframe when play button is clicked', async () => {
    vi.spyOn(CultureTrailerService, 'resolveTrailer').mockResolvedValue({
      youtubeId: 'xEQP4VVuyrY',
      embedUrl: 'https://www.youtube-nocookie.com/embed/xEQP4VVuyrY',
      watchUrl: 'https://www.youtube.com/watch?v=xEQP4VVuyrY',
      source: 'imdb',
    });

    render(
      <CultureTrailerSection
        title="Severance"
        type="série"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Assistir Trailer Oficial')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Assistir Trailer Oficial'));

    expect(screen.getByTitle('Trailer oficial de Severance')).toBeInTheDocument();
    expect(screen.getByText('Ocultar')).toBeInTheDocument();
  });

  it('collapses embedded iframe when "Ocultar" is clicked', async () => {
    vi.spyOn(CultureTrailerService, 'resolveTrailer').mockResolvedValue({
      youtubeId: 'xEQP4VVuyrY',
      embedUrl: 'https://www.youtube-nocookie.com/embed/xEQP4VVuyrY',
      watchUrl: 'https://www.youtube.com/watch?v=xEQP4VVuyrY',
      source: 'imdb',
    });

    render(
      <CultureTrailerSection
        title="Severance"
        type="série"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Assistir Trailer Oficial')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Assistir Trailer Oficial'));
    expect(screen.getByTitle('Trailer oficial de Severance')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Ocultar'));
    expect(screen.queryByTitle('Trailer oficial de Severance')).not.toBeInTheDocument();
    expect(screen.getByText('Assistir Trailer Oficial')).toBeInTheDocument();
  });

  it('renders search fallback button when no official trailer is found', async () => {
    vi.spyOn(CultureTrailerService, 'resolveTrailer').mockResolvedValue(null);

    render(
      <CultureTrailerSection
        title="Filme Desconhecido Indie"
        type="filme"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Buscar Trailer no YouTube')).toBeInTheDocument();
    });
  });
});
