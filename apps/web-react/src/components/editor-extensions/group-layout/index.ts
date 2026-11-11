/**
 * group-layout
 *
 * Shared module for side-by-side multi-column editor layouts.
 * Consumidores: `columns/ColumnGroup`, `LinkGroupBlock`, `LinkPreviewBlock` e o
 * `Editor` integration (for dropping files directly into a column cell).
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
