/**
 * Width calculation and balancing utilities for groups and columns.
 * Pure utility functions without side-effects.
 */

import type { Node as PMNode } from '@tiptap/pm/model';
import type { GroupSpec } from './groupSpecs';

export const round1 = (value: number): number => Math.round(value * 10) / 10;

/**
 * Reads assigned width of group child, using spec default if omitted.
 */
export function readWidth(spec: GroupSpec, child: PMNode): number {
  const raw = Number(child.attrs[spec.widthAttr]);
  return Number.isFinite(raw) && raw > 0 ? raw : spec.defaultWidth;
}

/**
 * Returns widths array of all child cells in a group.
 */
export function getWidths(spec: GroupSpec, groupNode: PMNode): number[] {
  const widths: number[] = [];
  groupNode.forEach((child) => widths.push(readWidth(spec, child)));
  return widths;
}

/**
 * Redistribui as larguras igualmente entre os filhos fornecidos (soma 100%).
 */
export function rebalance(spec: GroupSpec, children: PMNode[]): PMNode[] {
  if (children.length === 0) return children;
  const width = round1(100 / children.length);
  return children.map((child) =>
    child.type.create({ ...child.attrs, [spec.widthAttr]: width }, child.content, child.marks)
  );
}

/**
 * Normaliza um array de larguras garantindo que a soma resulte em 100%.
 */
export function normalizeWidths(widths: number[]): number[] {
  if (widths.length === 0) return [];
  const total = widths.reduce((sum, w) => sum + w, 0);
  if (total === 0) {
    const equal = round1(100 / widths.length);
    return widths.map(() => equal);
  }
  return widths.map((w) => round1((w / total) * 100));
}
