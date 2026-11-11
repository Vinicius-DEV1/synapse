import { describe, it, expect } from 'vitest';
import {
  parseSearchReplaceBlocks,
  applySearchReplace,
  computeMinimalDiffRange,
  generateDiffHtml,
} from './blockDiffEngine';

describe('blockDiffEngine', () => {
  describe('parseSearchReplaceBlocks', () => {
    it('returns empty array when no SEARCH/REPLACE block is present', () => {
      const input = 'const x = 10;\nconsole.log(x);';
      expect(parseSearchReplaceBlocks(input)).toEqual([]);
    });

    it('parses a single SEARCH/REPLACE block accurately', () => {
      const input = `Aqui está a melhoria:
<<<<<<< SEARCH
const total = a + b;
=======
if (a < 0 || b < 0) throw new Error("Negativo");
const total = a + b;
>>>>>>>
Pronto, validação inserida.`;

      const blocks = parseSearchReplaceBlocks(input);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].search).toBe('const total = a + b;');
      expect(blocks[0].replace).toBe('if (a < 0 || b < 0) throw new Error("Negativo");\nconst total = a + b;');
    });

    it('parses multiple SEARCH/REPLACE blocks', () => {
      const input = `<<<<<<< SEARCH
let count = 0;
=======
let count = 10;
>>>>>>>

<<<<<<< SEARCH
count += 1;
=======
count += 2;
>>>>>>>`;

      const blocks = parseSearchReplaceBlocks(input);
      expect(blocks).toHaveLength(2);
      expect(blocks[0].search).toBe('let count = 0;');
      expect(blocks[0].replace).toBe('let count = 10;');
      expect(blocks[1].search).toBe('count += 1;');
      expect(blocks[1].replace).toBe('count += 2;');
    });
  });

  describe('applySearchReplace', () => {
    it('applies a single replacement cleanly to the original text', () => {
      const original = `function add(a, b) {\n  const res = a + b;\n  return res;\n}`;
      const blocks = [
        {
          search: '  const res = a + b;',
          replace: '  if (!a || !b) return 0;\n  const res = a + b;',
        },
      ];

      const result = applySearchReplace(original, blocks);
      expect(result.success).toBe(true);
      expect(result.replacedCount).toBe(1);
      expect(result.result).toBe(
        `function add(a, b) {\n  if (!a || !b) return 0;\n  const res = a + b;\n  return res;\n}`
      );
    });

    it('returns error when a search block is not found in the original', () => {
      const original = 'const x = 10;';
      const blocks = [{ search: 'const y = 20;', replace: 'const y = 30;' }];

      const result = applySearchReplace(original, blocks);
      expect(result.success).toBe(false);
      expect(result.replacedCount).toBe(0);
      expect(result.error).toContain('não encontrado');
      expect(result.result).toBe(original);
    });

    it('matches search blocks with trimmed whitespace if exact match fails', () => {
      const original = '  const valor = 100;\n';
      const blocks = [{ search: 'const valor = 100;', replace: 'const valor = 200;' }];

      const result = applySearchReplace(original, blocks);
      expect(result.success).toBe(true);
      expect(result.result).toBe('  const valor = 200;\n');
    });
  });

  describe('computeMinimalDiffRange', () => {
    it('returns null when original and updated strings are identical', () => {
      const text = 'function run() { return true; }';
      expect(computeMinimalDiffRange(text, text)).toBeNull();
    });

    it('calculates minimal insertion range inside a larger string', () => {
      const original = 'line 1\nline 2\nline 3';
      const updated = 'line 1\nline 1.5\nline 2\nline 3';

      const diff = computeMinimalDiffRange(original, updated);
      expect(diff).not.toBeNull();
      const reconstructed = original.slice(0, diff!.from) + diff!.replacement + original.slice(diff!.to);
      expect(reconstructed).toBe(updated);
      expect(diff!.from).toBe(diff!.to); // pure insertion (no deletion)
    });

    it('calculates minimal deletion range', () => {
      const original = 'line 1\nline 2\nline 3';
      const updated = 'line 1\nline 3';

      const diff = computeMinimalDiffRange(original, updated);
      expect(diff).not.toBeNull();
      const reconstructed = original.slice(0, diff!.from) + diff!.replacement + original.slice(diff!.to);
      expect(reconstructed).toBe(updated);
      expect(diff!.replacement).toBe(''); // pure deletion
    });

    it('calculates minimal replacement of a single modified word/line', () => {
      const original = 'const status = "pending";';
      const updated = 'const status = "completed";';

      const diff = computeMinimalDiffRange(original, updated);
      expect(diff).not.toBeNull();
      const reconstructed = original.slice(0, diff!.from) + diff!.replacement + original.slice(diff!.to);
      expect(reconstructed).toBe(updated);
      expect(diff!.from).toBe(16); // right after 'const status = "'
      expect(diff!.to).toBe(23); // end of 'pending'
      expect(diff!.replacement).toBe('completed');
    });
  });

  describe('generateDiffHtml', () => {
    it('generates HTML with <ins> and <del> tags for changes', () => {
      const original = 'o resultado é 10';
      const proposed = 'o resultado é 20';

      const html = generateDiffHtml(original, proposed);
      expect(html).toContain('<del');
      expect(html).toContain('10');
      expect(html).toContain('<ins');
      expect(html).toContain('20');
    });

    it('escapes HTML entities to avoid injecting arbitrary markup', () => {
      const original = '<script>alert(1)</script>';
      const proposed = '<div>clean</div>';

      const html = generateDiffHtml(original, proposed);
      expect(html).not.toContain('<script>');
      expect(html).not.toContain('<div>');
      expect(html).toContain('&lt;');
      expect(html).toContain('&gt;');
    });
  });
});
