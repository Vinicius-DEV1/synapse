import HtmlDiff from 'htmldiff-js';

export interface SearchReplaceBlock {
  search: string;
  replace: string;
}

export interface SearchReplaceResult {
  success: boolean;
  result: string;
  replacedCount: number;
  error?: string;
}

export interface MinimalDiffRange {
  from: number;
  to: number;
  replacement: string;
}

/**
 * Regex to match <<<<<<< SEARCH ... ======= ... >>>>>>> blocks
 * Flags: 'g' (global) and 's' (dotAll for multiline match)
 */
const SEARCH_REPLACE_REGEX = /<{7}\s*SEARCH\s*\n([\s\S]*?)\n?={7}\s*\n([\s\S]*?)\n?>{7}/g;

/**
 * Parses all SEARCH/REPLACE blocks emitted by the AI model.
 */
export function parseSearchReplaceBlocks(content: string): SearchReplaceBlock[] {
  if (!content || !content.includes('<<<<<<< SEARCH')) return [];

  const blocks: SearchReplaceBlock[] = [];
  const regex = new RegExp(SEARCH_REPLACE_REGEX.source, 'g');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    blocks.push({
      search: match[1],
      replace: match[2],
    });
  }

  return blocks;
}

/**
 * Applies SEARCH/REPLACE blocks sequentially to the original text.
 * Tolerant to small differences in trailing whitespace or carriage returns.
 */
export function applySearchReplace(original: string, blocks: SearchReplaceBlock[]): SearchReplaceResult {
  if (!blocks || blocks.length === 0) {
    return { success: true, result: original, replacedCount: 0 };
  }

  let current = original;
  let count = 0;

  for (let i = 0; i < blocks.length; i++) {
    const { search, replace } = blocks[i];
    
    // 1. Exact match
    if (current.includes(search)) {
      current = current.replace(search, replace);
      count++;
      continue;
    }

    // 2. Normalized CRLF match
    const normalizedCurrent = current.replace(/\r\n/g, '\n');
    const normalizedSearch = search.replace(/\r\n/g, '\n');
    if (normalizedCurrent.includes(normalizedSearch)) {
      current = normalizedCurrent.replace(normalizedSearch, replace.replace(/\r\n/g, '\n'));
      count++;
      continue;
    }

    // 3. Trimmed edges match (in case AI emitted an extra newline)
    const trimmedSearch = search.trim();
    if (trimmedSearch.length > 0 && current.includes(trimmedSearch)) {
      current = current.replace(trimmedSearch, replace.trim());
      count++;
      continue;
    }

    // Not found
    return {
      success: false,
      result: original,
      replacedCount: count,
      error: `Trecho de busca não encontrado no bloco atual (bloco #${i + 1}).`,
    };
  }

  return {
    success: true,
    result: current,
    replacedCount: count,
  };
}

/**
 * Computes the minimal contiguous character range [from, to] between original and updated text.
 * Finds common prefix and common suffix, allowing surgical atomic replacements in ProseMirror.
 */
export function computeMinimalDiffRange(original: string, updated: string): MinimalDiffRange | null {
  if (original === updated) return null;

  let start = 0;
  const origLen = original.length;
  const updLen = updated.length;

  // Find length of common prefix
  while (start < origLen && start < updLen && original[start] === updated[start]) {
    start++;
  }

  // Find length of common suffix
  let endOrig = origLen;
  let endUpd = updLen;
  while (endOrig > start && endUpd > start && original[endOrig - 1] === updated[endUpd - 1]) {
    endOrig--;
    endUpd--;
  }

  return {
    from: start,
    to: endOrig,
    replacement: updated.slice(start, endUpd),
  };
}

/**
 * Generates an HTML diff string with <ins> and <del> tags for visual inspection.
 */
export function generateDiffHtml(original: string, proposed: string): string {
  try {
    const safeOld = original.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeNew = proposed.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return HtmlDiff.execute(safeOld, safeNew);
  } catch (err) {
    console.warn('[blockDiffEngine] HtmlDiff execution error, returning fallback:', err);
    return proposed.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
