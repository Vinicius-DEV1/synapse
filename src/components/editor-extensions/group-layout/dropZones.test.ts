import { describe, it, expect } from 'vitest';
import { Schema } from '@tiptap/pm/model';
import type { Node as PMNode } from '@tiptap/pm/model';
import { EditorState } from '@tiptap/pm/state';
import { EditorView } from '@tiptap/pm/view';
import { DragToGroup, startExternalBlockDrag } from './DragToGroup';

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { content: 'inline*', group: 'block', toDOM: () => ['p', 0] as any },
    text: { group: 'inline' },
    columnGroup: { content: 'columnBlock{1,5}', group: 'block', isolating: true, toDOM: () => ['div', { class: 'cg' }, 0] as any },
    columnBlock: { content: 'block+', group: 'column', attrs: { width: { default: 50 } }, isolating: true, toDOM: () => ['div', { class: 'cb' }, 0] as any },
  },
});
const p = (t: string) => schema.nodes.paragraph.create(null, schema.text(t));

/** Layout falso: cada bloco de nível 1 ocupa uma faixa de 100px de altura, x de 100 a 700. */
function layout(view: EditorView) {
  const positions: number[] = [];
  let off = 0;
  view.state.doc.forEach((node) => { positions.push(off); off += node.nodeSize; });

  // Geometria do app: bloco de 70px de altura + my-4 (16px) de cada lado.
  // Faixa de 102px por bloco, dos quais 32px sao VAO entre um bloco e o seguinte.
  const rectFor = (index: number) => ({
    left: 100, right: 700, width: 600,
    top: index * 102 + 16, bottom: index * 102 + 86, height: 70,
    x: 100, y: index * 102 + 16, toJSON: () => ({}),
  }) as DOMRect;

  view.posAtCoords = ({ top }: { left: number; top: number }) => {
    const index = Math.min(positions.length - 1, Math.max(0, Math.round((top - 51) / 102)));
    const pos = positions[index];
    return { pos: pos + 1, inside: pos };
  };
  (view as any).nodeDOM = (pos: number) => {
    const index = positions.indexOf(pos);
    if (index < 0) return null;
    const el = document.createElement('div');
    el.getBoundingClientRect = () => rectFor(index);
    return el;
  };
  return positions;
}

function dragEvent(type: string, x: number, y: number) {
  const ev = new Event(type, { bubbles: true, cancelable: true }) as any;
  ev.clientX = x; ev.clientY = y;
  ev.dataTransfer = { files: [], getData: () => '', setData: () => {}, types: [], dropEffect: 'move', effectAllowed: 'move' };
  return ev as DragEvent;
}

function shape(node: PMNode): string {
  if (node.isTextblock) return `${node.type.name}(${node.textContent})`;
  const k: string[] = []; node.forEach((c) => k.push(shape(c)));
  return `${node.type.name}(${k.join(',')})`;
}

/**
 * As zonas de drop, medidas ponta a ponta num EditorView de verdade.
 *
 * Geometria do app: bloco de 70px com `my-4` (16px) de cada lado, coluna de
 * conteúdo de 100 a 700, alça flutuante à esquerda do bloco.
 *
 * O que estes testes protegem: NÃO PODE HAVER ZONA MORTA. Todo ponto do editor
 * precisa dizer claramente o que vai acontecer — agrupar à esquerda, agrupar à
 * direita, ou mover. Antes, dois pedaços grandes não diziam nada e viravam um
 * mover silencioso: o vão de 32px entre blocos e a margem onde mora a alça.
 * Era o "arrasto e solto e não forma coluna, só troca de posição".
 */
describe('zonas de drop', () => {
  function run(dropX: number, dropY: number, grabX?: number) {
    const place = document.createElement('div');
    document.body.appendChild(place);
    const state = EditorState.create({
      doc: schema.nodes.doc.create(null, [p('AAA'), p('BBB'), p('CCC')]),
      plugins: DragToGroup.config.addProseMirrorPlugins!.call({ ...DragToGroup, options: {}, editor: null } as any),
    });
    const view = new EditorView(place, { state });
    const positions = layout(view);

    startExternalBlockDrag(view, positions[0], grabX); // arrasta o 1º parágrafo
    view.dom.dispatchEvent(dragEvent('dragover', dropX, dropY));
    view.dom.dispatchEvent(dragEvent('drop', dropX, dropY));

    const result = shape(view.state.doc);
    view.destroy();
    place.remove();
    return result;
  }

  // bloco 3 (CCC): faixa 204..306, rect 220..290. Vao acima: 190..220.
  const AGRUPADO_ESQ = 'doc(paragraph(BBB),columnGroup(columnBlock(paragraph(AAA)),columnBlock(paragraph(CCC))))';
  const AGRUPADO_DIR = 'doc(paragraph(BBB),columnGroup(columnBlock(paragraph(CCC)),columnBlock(paragraph(AAA))))';
  const MOVIDO = 'doc(paragraph(BBB),paragraph(AAA),paragraph(CCC))';

  it('terço esquerdo do bloco cria a coluna à esquerda', () => {
    expect(run(200, 255, 74)).toBe(AGRUPADO_ESQ);
  });

  it('terço direito do bloco cria a coluna à direita', () => {
    expect(run(600, 255, 74)).toBe(AGRUPADO_DIR);
  });

  it('o miolo do bloco move, e é o dropcursor que responde', () => {
    // O mover precisa de um alvo PRÓPRIO e visível dentro do bloco. Espremido
    // no vão entre dois, como antes, ele roubava os drops de agrupamento.
    expect(run(400, 255, 74)).toBe(MOVIDO);
  });

  it('o vão entre dois blocos ainda agrupa — a margem pertence ao bloco', () => {
    // 10px acima da borda pintada do bloco, dentro do `my-4`. Aqui o alvo era
    // nulo e o drop virava um mover silencioso.
    expect(run(200, 210, 74)).toBe(AGRUPADO_ESQ);
  });

  it('a margem onde mora a alça alcança a zona de agrupamento', () => {
    // Cursor 20px à ESQUERDA do bloco: é onde fica quem arrasta pela alça.
    // Sem a folga medida no dragstart, agrupar pela alça era impossível.
    expect(run(80, 255, 74)).toBe(AGRUPADO_ESQ);
  });

  it('sem a medida da alça, a margem deixa de agrupar', () => {
    // Prova que é a folga MEDIDA que sustenta o caso acima, e não sorte de
    // geometria: um arrasto que não informa o ponteiro não ganha folga.
    expect(run(80, 255)).toBe(MOVIDO);
  });
});
