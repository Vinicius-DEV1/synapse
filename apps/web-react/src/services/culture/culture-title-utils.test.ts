import { describe, it, expect } from 'vitest';
import {
  normalizeTitle,
  areTitlesEquivalent,
  isItemInLibrary,
} from './culture-title-utils';
import type { CultureItem } from '../../types';

describe('culture-title-utils', () => {
  describe('normalizeTitle', () => {
    it('normalizes accents, numbers, and common keywords', () => {
      expect(normalizeTitle('Duna: Parte 2')).toBe('dune pt 2');
      expect(normalizeTitle('Dune: Part Two')).toBe('dune pt 2');
      expect(normalizeTitle('Dune: Part II')).toBe('dune pt 2');
      expect(normalizeTitle('Duna: Parte Dois')).toBe('dune pt 2');
    });

    it('strips leading articles and punctuation', () => {
      expect(normalizeTitle('The Matrix')).toBe('matrix');
      expect(normalizeTitle('O Poderoso Chefão')).toBe('poderoso chefao');
      expect(normalizeTitle('A Viagem de Chihiro')).toBe('viagem de chihiro');
    });
  });

  describe('areTitlesEquivalent', () => {
    it('identifies identical translations and number word variations as equivalent', () => {
      expect(areTitlesEquivalent('Duna: Parte 2', 'Dune: Part Two')).toBe(true);
      expect(areTitlesEquivalent('Duna Parte 2', 'Dune Part 2')).toBe(true);
      expect(areTitlesEquivalent('Dune: Part II', 'Duna: Parte 2')).toBe(true);
    });

    it('distinguishes different sequel numbers as distinct', () => {
      expect(areTitlesEquivalent('Dune: Part One', 'Dune: Part Two')).toBe(false);
      expect(areTitlesEquivalent('Duna: Parte 1', 'Duna: Parte 2')).toBe(false);
      expect(areTitlesEquivalent('John Wick 3', 'John Wick 4')).toBe(false);
    });

    it('identifies extended cuts and edition variants as equivalent without bugs', () => {
      expect(areTitlesEquivalent('Ex-Machina', 'Ex-Machina: Versão Longa')).toBe(true);
      expect(areTitlesEquivalent('Ex-Machina', 'Ex-Machina (Versão Longa)')).toBe(true);
      expect(areTitlesEquivalent('Ex-Machina', 'Ex-Machina: Extended Cut')).toBe(true);
      expect(areTitlesEquivalent('Ex-Machina', 'Ex Machina (Director\'s Cut)')).toBe(true);
      expect(areTitlesEquivalent('Blade Runner', 'Blade Runner: The Final Cut')).toBe(true);
      expect(areTitlesEquivalent('Apocalypse Now', 'Apocalypse Now Redux (Edição Especial)')).toBe(false); // Redux has separate title token
      expect(areTitlesEquivalent('Avatar', 'Avatar (Versão Estendida)')).toBe(true);
    });

    it('preserves genuine sequels as distinct works', () => {
      expect(areTitlesEquivalent('Blade Runner', 'Blade Runner 2049')).toBe(false);
      expect(areTitlesEquivalent('Avatar', 'Avatar: O Caminho da Água')).toBe(false);
      expect(areTitlesEquivalent('Duna', 'Duna: Profecia')).toBe(false);
      expect(areTitlesEquivalent('Godzilla', 'Godzilla Minus One')).toBe(false);
    });

    it('identifies TV series seasons as belonging to the same series', () => {
      expect(areTitlesEquivalent('Succession', 'Succession: Temporada 3', { isSeries: true })).toBe(true);
      expect(areTitlesEquivalent('Severance', 'Severance Season 2', { isSeries: true })).toBe(true);
      expect(areTitlesEquivalent('Stranger Things', 'Stranger Things (Temporada 5)', { isSeries: true })).toBe(true);
      expect(areTitlesEquivalent('The Bear: Temporada 1', 'The Bear: Temporada 3', { isSeries: true })).toBe(true);
    });
  });

  describe('isItemInLibrary', () => {
    const mockLibrary: CultureItem[] = [
      {
        id: '1',
        title: 'Duna: Parte 2',
        type: 'filme',
        api_id: 'tt15239678',
        api_source: 'imdb',
        progress: 1,
        total_progress: 1,
        is_goal: false,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      },
      {
        id: '2',
        title: 'Sousou no Frieren',
        type: 'anime',
        api_id: '52991',
        api_source: 'jikan',
        progress: 28,
        total_progress: 28,
        is_goal: false,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      },
      {
        id: '3',
        title: 'Ex-Machina',
        type: 'filme',
        progress: 1,
        total_progress: 1,
        is_goal: false,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      },
      {
        id: '4',
        title: 'Succession',
        type: 'série',
        progress: 10,
        total_progress: 39,
        is_goal: false,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      },
    ];

    it('detects duplicate via translated / normalized title', () => {
      expect(
        isItemInLibrary(
          { title: 'Dune: Part Two' },
          mockLibrary
        )
      ).toBe(true);
    });

    it('detects duplicate via original_title', () => {
      expect(
        isItemInLibrary(
          {
            title: "Frieren: Beyond Journey's End",
            original_title: 'Sousou no Frieren',
          },
          mockLibrary
        )
      ).toBe(true);
    });

    it('detects duplicate via exact api_id', () => {
      expect(
        isItemInLibrary(
          {
            title: 'Some Translated Title',
            api_id: 'tt15239678',
          },
          mockLibrary
        )
      ).toBe(true);
    });

    it('detects duplicate for extended version of existing film', () => {
      expect(
        isItemInLibrary(
          {
            title: 'Ex-Machina: Versão Longa',
            type: 'filme',
          },
          mockLibrary
        )
      ).toBe(true);
      expect(
        isItemInLibrary(
          {
            title: 'Ex-Machina (Extended Cut)',
            type: 'filme',
          },
          mockLibrary
        )
      ).toBe(true);
    });

    it('detects duplicate for subsequent season of existing series', () => {
      expect(
        isItemInLibrary(
          {
            title: 'Succession: Temporada 3',
            type: 'série',
          },
          mockLibrary
        )
      ).toBe(true);
      expect(
        isItemInLibrary(
          {
            title: 'Succession Season 4',
            type: 'série',
          },
          mockLibrary
        )
      ).toBe(true);
    });

    it('allows genuinely new items and sequels', () => {
      expect(
        isItemInLibrary(
          {
            title: 'Blade Runner 2049',
            api_id: 'tt1856101',
            type: 'filme',
          },
          mockLibrary
        )
      ).toBe(false);
      expect(
        isItemInLibrary(
          {
            title: 'Severance',
            type: 'série',
          },
          mockLibrary
        )
      ).toBe(false);
    });
  });
});
