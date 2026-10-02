import { describe, it, expect } from 'vitest';
import { extractJsonFromResponse } from './culture-recommendations';

describe('extractJsonFromResponse', () => {
  it('parses standard clean JSON', () => {
    const json = JSON.stringify({
      clusters: [
        {
          id: 'cluster-1',
          title: 'Ficção Científica',
          description: 'Obras de reflexão',
          items: [],
        },
      ],
    });

    const parsed = extractJsonFromResponse(json);
    expect(parsed).not.toBeNull();
    expect(parsed?.clusters).toHaveLength(1);
    expect(parsed?.clusters[0].title).toBe('Ficção Científica');
  });

  it('extracts JSON from Markdown code blocks', () => {
    const raw = `
Aqui estão as recomendações que preparei para você:

\`\`\`json
{
  "clusters": [
    {
      "id": "c-1",
      "title": "Alta Fantasia",
      "description": "Mundos épicos",
      "items": []
    }
  ]
}
\`\`\`

Espero que aprecie as escolhas!
`;

    const parsed = extractJsonFromResponse(raw);
    expect(parsed).not.toBeNull();
    expect(parsed?.clusters[0].title).toBe('Alta Fantasia');
  });

  it('wraps root array into clusters object', () => {
    const raw = `
[
  {
    "id": "direct-array-cluster",
    "title": "Cyberpunk Clássico",
    "description": "Foco distópico",
    "items": []
  }
]
`;

    const parsed = extractJsonFromResponse(raw);
    expect(parsed).not.toBeNull();
    expect(parsed?.clusters).toHaveLength(1);
    expect(parsed?.clusters[0].title).toBe('Cyberpunk Clássico');
  });

  it('sanitizes and parses JSON with trailing commas', () => {
    const rawWithTrailingCommas = `
{
  "clusters": [
    {
      "id": "c-trailing",
      "title": "Suspense Psicológico",
      "description": "Tramas tensas",
      "items": [],
    },
  ],
}
`;

    const parsed = extractJsonFromResponse(rawWithTrailingCommas);
    expect(parsed).not.toBeNull();
    expect(parsed?.clusters[0].title).toBe('Suspense Psicológico');
  });

  it('returns null on invalid or empty text', () => {
    expect(extractJsonFromResponse('')).toBeNull();
    expect(extractJsonFromResponse('não há json aqui')).toBeNull();
  });
});
