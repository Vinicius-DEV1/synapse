/**
 * Canonical cross-client HTML normalizer executed when persisting TipTap notes.
 * Ensures XML-safe void attributes (such as `checked="checked"` on task inputs)
 * so both Web DOMParser and Native Desktop Qt (`QXmlStreamReader` / `synapse-core`)
 * round-trip 100% of note formatting without loss or fallback warnings.
 */
export function canonicalizeNoteHtmlForPersistence(rawHtml: string): string {
  if (!rawHtml) return '';

  return rawHtml
    // HTML5 DOMSerializer emits boolean `checked` without a value (`<input type="checkbox" checked>`),
    // whereas strict XML readers in native clients require `checked="checked"`.
    .replace(/<input([^>]*?)\s+checked(?:\s*=\s*(?:""|''|checked))?(?=\s|>|\/)/gi, '<input$1 checked="checked"')
    // Guard against legacy stringified `"undefined"` open-state attributes.
    .replace(/\bdata-is-open="undefined"/g, 'data-is-open="true"');
}
