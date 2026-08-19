/**
 * group-layout
 *
 * Módulo compartilhado dos layouts "lado a lado" do editor.
 * Consumidores: `columns/ColumnGroup`, `LinkGroupBlock`, `LinkPreviewBlock` e o
 * `Editor` (para soltar arquivos direto numa coluna).
 */

export { default as GroupShell } from './GroupShell';
export {
  DragToGroup,
  consumeGroupDropTarget,
  applyGroupDrop,
  startExternalBlockDrag,
  endExternalDrag,
  selectNodeForDrag,
} from './DragToGroup';
export type { GroupDropTarget } from './DragToGroup';
export { GroupAutoCollapse } from './groupAutoCollapse';
export {
  COLUMN_GROUP_SPEC,
  LINK_GROUP_SPEC,
  GROUP_SPECS,
  getSpecForGroup,
  getSpecByName,
  pickSpecForPair,
} from './groupSpecs';
export type { GroupSpec } from './groupSpecs';
export {
  appendToGroup,
  balanceChildren,
  createGroup,
  findChildIndex,
  flattenGroup,
  getChildPositions,
  getChildren,
  getWidths,
  groupWithSibling,
  moveChild,
  removeChild,
  resolveGroup,
  setChildWidths,
  unwrapGroup,
} from './groupCommands';
export type { GroupRef } from './groupCommands';
