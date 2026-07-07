import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import React from 'react';

export default function CodeBlockComponent({
  node: {
    attrs: { language: defaultLanguage },
  },
  updateAttributes,
  extension,
}: any) {
  return (
    <NodeViewWrapper className="code-block-wrapper relative group">
      <select
        contentEditable={false}
        defaultValue={defaultLanguage || 'null'}
        onChange={(event) => updateAttributes({ language: event.target.value })}
        className="absolute top-2 right-2 bg-dark-bg/90 text-dark-text text-xs border border-white/20 rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 outline-none cursor-pointer"
      >
        <option value="null">Auto</option>
        <option disabled>—</option>
        {extension.options.lowlight.listLanguages().sort().map((lang: string, index: number) => (
          <option key={index} value={lang}>
            {lang}
          </option>
        ))}
      </select>
      <pre className="hljs" spellCheck={false}>
        <NodeViewContent as="code" />
      </pre>
    </NodeViewWrapper>
  );
}
