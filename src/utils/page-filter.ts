import type { Page } from '../types';

/**
 * Returns only active pages, filtering out any soft-deleted (trashed) pages.
 * Centralized utility to ensure consistent page listing across navigation,
 * search, breadcrumbs, and hierarchy views.
 */
export function filterActivePages(pages: Page[]): Page[] {
  return pages.filter((p) => !p.deleted_at);
}
