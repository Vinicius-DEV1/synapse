/**
 * Utility for sanitizing and defensively hardening epub.js Book and Rendition instances.
 * 
 * Some EPUB files (especially from Gutenberg, Internet Archive, or legacy Calibre exports)
 * contain orphaned <itemref> tags in the OPF spine that reference nonexistent manifest items
 * (e.g., <itemref idref="cover"/> when no manifest entry for "cover" exists).
 * 
 * In standard epub.js, this causes:
 * 1. A dummy Section to be created with `url = undefined` and `href = undefined`.
 * 2. Uncaught `TypeError: undefined is not an object (evaluating 'e.indexOf')` inside
 *    `Path` and `archive.request(undefined)`.
 * 3. Synchronization freeze in the Rendition task queue, leaving the reader modal stuck at 100%.
 * 
 * This module strips invalid spine items, re-indexes the spine, and installs defensive guards
 * across `archive.request`, `book.load`, `locations.process`, and Rendition queue dequeue.
 */

export interface EpubSectionLike {
  idref?: string;
  href?: string;
  url?: string;
  canonical?: string;
  linear?: boolean;
  index?: number;
  prev?: () => EpubSectionLike | undefined;
  next?: () => EpubSectionLike | undefined;
}

export interface EpubSpineLike {
  spineItems: EpubSectionLike[];
  spineByHref: Record<string, number>;
  spineById: Record<string, number>;
  length: number;
  get: (target?: unknown) => EpubSectionLike | null;
  first: () => EpubSectionLike | null;
  last: () => EpubSectionLike | null;
  each: (fn: (section: EpubSectionLike) => void) => void;
}

export interface EpubArchiveLike {
  zip?: {
    file: (name: string) => unknown;
    files?: Record<string, unknown>;
  };
  check?: (url: string) => boolean;
  request: (url: string, type?: string) => Promise<unknown>;
}

export interface EpubLocationsLike {
  process?: (section: EpubSectionLike) => Promise<unknown>;
}

export interface EpubBookLike {
  spine?: EpubSpineLike;
  archive?: EpubArchiveLike;
  load?: (path: string) => Promise<unknown>;
  locations?: EpubLocationsLike;
  __cadernoSanitized?: boolean;
}

export interface RenditionQueueLike {
  dequeue?: () => Promise<unknown> | unknown;
  __cadernoSafePatched?: boolean;
}

export interface EpubRenditionLike {
  q?: RenditionQueueLike;
}

/**
 * Checks whether a given path or filename exists within the EPUB zip archive.
 */
function fileExistsInZip(zip: NonNullable<EpubArchiveLike['zip']>, cleanPath: string): boolean {
  if (!cleanPath) return false;
  const normalized = cleanPath.startsWith('/') ? cleanPath.slice(1) : cleanPath;

  if (zip.file(normalized) || zip.file(cleanPath)) return true;

  if (zip.files) {
    if (zip.files[normalized] || zip.files[cleanPath]) return true;

    const lowerNorm = normalized.toLowerCase();
    const filename = normalized.split('/').pop()?.toLowerCase() || lowerNorm;

    const matched = Object.keys(zip.files).some((f) => {
      const lowerFile = f.toLowerCase();
      return lowerFile === lowerNorm || lowerFile.endsWith('/' + filename) || lowerFile === filename;
    });

    if (matched) return true;
  }

  return false;
}

/**
 * Sanitizes the EPUB book instance:
 * 1. Patches `book.archive.request` and `book.load` against empty or undefined URLs.
 * 2. Prunes phantom / orphaned spine items that have no href/url or do not exist in the archive.
 * 3. Re-indexes surviving spine items and rebuilds lookup dictionaries.
 * 4. Defensively wraps `spine.get` and `spine.first` to always resolve a valid section.
 * 5. Guards `locations.process` from crashing if a section fails to load.
 */
export function sanitizeEpubBook(book: unknown): void {
  const target = book as EpubBookLike | null | undefined;
  if (!target || target.__cadernoSanitized) return;
  target.__cadernoSanitized = true;

  const archive = target.archive;
  const spine = target.spine;
  const locations = target.locations;

  // 1. Defensively patch archive.request
  if (archive && typeof archive.request === 'function') {
    const origArchiveRequest = archive.request.bind(archive);
    archive.request = function (url: string, type?: string): Promise<unknown> {
      if (!url || typeof url !== 'string' || url === 'undefined') {
        return Promise.reject(new Error(`[EpubSanitizer] Invalid or empty archive request URL: ${String(url)}`));
      }
      try {
        return origArchiveRequest(url, type);
      } catch (syncErr) {
        return Promise.reject(syncErr);
      }
    };
  }

  // 2. Defensively patch book.load
  if (typeof target.load === 'function') {
    const origBookLoad = target.load.bind(target);
    target.load = function (path: string): Promise<unknown> {
      if (!path || typeof path !== 'string' || path === 'undefined') {
        return Promise.reject(new Error(`[EpubSanitizer] Cannot load empty or unresolvable path: ${String(path)}`));
      }
      try {
        return origBookLoad(path);
      } catch (syncErr) {
        return Promise.reject(syncErr);
      }
    };
  }

  // 3. Defensively guard locations.process so location generation doesn't abort on bad sections
  if (locations && typeof locations.process === 'function') {
    const origLocationsProcess = locations.process.bind(locations);
    locations.process = function (section: EpubSectionLike): Promise<unknown> {
      if (!section || !section.url || !section.href || section.url === 'undefined') {
        return Promise.resolve([]);
      }
      try {
        const promise = origLocationsProcess(section);
        if (promise && typeof (promise as Promise<unknown>).catch === 'function') {
          return (promise as Promise<unknown>).catch((err: unknown) => {
            console.warn('[EpubSanitizer] Skipping bad section during location generation:', section.href, err);
            return [];
          });
        }
        return promise;
      } catch (syncErr) {
        console.warn('[EpubSanitizer] Synchronous error during section location processing:', section.href, syncErr);
        return Promise.resolve([]);
      }
    };
  }

  // 4. Sanitize and prune orphaned spine items
  if (spine && Array.isArray(spine.spineItems)) {
    const zip = archive?.zip;
    const validItems: EpubSectionLike[] = [];
    const removedItems: EpubSectionLike[] = [];

    for (const section of spine.spineItems) {
      const href = section.href;
      const url = section.url;

      // Must have valid string href and url
      if (
        !href ||
        typeof href !== 'string' ||
        href.trim() === '' ||
        href === 'undefined' ||
        !url ||
        typeof url !== 'string' ||
        url.trim() === '' ||
        url === 'undefined'
      ) {
        console.warn(`[EpubSanitizer] Pruning orphaned spine item missing href/url (idref: ${section.idref})`);
        removedItems.push(section);
        continue;
      }

      // If zip entries are available, ensure the section exists in the archive
      if (zip && typeof zip.file === 'function') {
        const cleanHref = href.split('#')[0].split('?')[0];
        const cleanUrl = url.split('#')[0].split('?')[0];
        const exists = fileExistsInZip(zip, cleanUrl) || fileExistsInZip(zip, cleanHref);

        if (!exists) {
          console.warn(`[EpubSanitizer] Pruning orphaned spine item not found in zip archive: ${cleanHref} (idref: ${section.idref})`);
          removedItems.push(section);
          continue;
        }
      }

      validItems.push(section);
    }

    if (removedItems.length > 0 && validItems.length > 0) {
      console.info(`[EpubSanitizer] Pruned ${removedItems.length} broken spine items. Retained ${validItems.length} valid items.`);

      // Update spineItems in place
      spine.spineItems.length = 0;
      spine.spineItems.push(...validItems);

      // Re-index sections and rebuild lookup tables
      spine.spineByHref = {};
      spine.spineById = {};

      validItems.forEach((section, index) => {
        section.index = index;

        if (section.href) {
          try {
            spine.spineByHref[decodeURI(section.href)] = index;
            spine.spineByHref[encodeURI(section.href)] = index;
          } catch {
            // Ignore URI malformed error
          }
          spine.spineByHref[section.href] = index;
        }

        if (section.idref) {
          spine.spineById[section.idref] = index;
        }

        // Re-link safe prev / next closures
        section.prev = function () {
          let prevIndex = index - 1;
          while (prevIndex >= 0) {
            const prev = spine.spineItems[prevIndex];
            if (prev && prev.linear && prev.url && prev.href) return prev;
            prevIndex--;
          }
          return undefined;
        };

        section.next = function () {
          let nextIndex = index + 1;
          while (nextIndex < spine.spineItems.length) {
            const next = spine.spineItems[nextIndex];
            if (next && next.linear && next.url && next.href) return next;
            nextIndex++;
          }
          return undefined;
        };
      });

      spine.length = validItems.length;
    }

    // 5. Defensively wrap spine.get
    if (typeof spine.get === 'function') {
      const origSpineGet = spine.get.bind(spine);
      spine.get = function (target?: unknown): EpubSectionLike | null {
        let section: EpubSectionLike | null = null;
        try {
          section = origSpineGet(target);
        } catch (err) {
          console.warn('[EpubSanitizer] spine.get threw error for target:', target, err);
        }

        if (!section || !section.url || !section.href) {
          section =
            spine.spineItems.find((s) => Boolean(s && s.url && s.href && s.linear)) ||
            spine.spineItems.find((s) => Boolean(s && s.url && s.href)) ||
            null;
        }
        return section;
      };
    }

    // 6. Defensively wrap spine.first
    spine.first = function (): EpubSectionLike | null {
      return (
        spine.spineItems.find((s) => Boolean(s && s.url && s.href && s.linear)) ||
        spine.spineItems.find((s) => Boolean(s && s.url && s.href)) ||
        null
      );
    };
  }
}

/**
 * Patches the Rendition task queue to catch synchronous exceptions during dequeue.
 * Prevents unhandled errors from breaking the queue loop and permanently freezing the display promise.
 */
export function patchRenditionQueue(rendition: unknown): void {
  const target = rendition as EpubRenditionLike | null | undefined;
  const q = target?.q;
  if (!q || typeof q.dequeue !== 'function' || q.__cadernoSafePatched) return;
  q.__cadernoSafePatched = true;

  const origDequeue = q.dequeue.bind(q);
  q.dequeue = function (): Promise<unknown> | unknown {
    try {
      const res = origDequeue();
      if (res && typeof (res as Promise<unknown>).catch === 'function') {
        return (res as Promise<unknown>).catch((err: unknown) => {
          console.warn('[EpubSanitizer] Rendition queued task rejected:', err);
          return null;
        });
      }
      return res;
    } catch (syncErr) {
      console.warn('[EpubSanitizer] Rendition dequeue caught synchronous error:', syncErr);
      return Promise.resolve(null);
    }
  };
}
