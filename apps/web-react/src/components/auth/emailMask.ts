const REMEMBERED_EMAIL_STORAGE_KEY = 'synapse_remembered_email';

/**
 * Masks an email address so only the beginning and ending remain visible (e.g. `abc*****.com`).
 */
export function maskEmailAddress(rawEmail: string): string {
  const email = rawEmail.trim();
  if (!email) return '';

  const atIndex = email.indexOf('@');
  if (atIndex === -1) {
    const prefixLen = Math.min(3, Math.max(1, email.length - 1));
    const suffixLen = email.length > 4 ? 4 : Math.max(1, email.length - prefixLen);
    return `${email.slice(0, prefixLen)}*****${email.slice(-suffixLen)}`;
  }

  const localPart = email.slice(0, atIndex);
  const domainPart = email.slice(atIndex + 1);
  const prefixLen = Math.min(3, Math.max(1, localPart.length - 1));
  const prefix = localPart.slice(0, prefixLen);

  const lastDotIndex = domainPart.lastIndexOf('.');
  let suffix = '';
  if (lastDotIndex > 0 && domainPart.length - lastDotIndex <= 6) {
    suffix = domainPart.slice(lastDotIndex);
  } else if (domainPart.length > 0) {
    suffix = domainPart.slice(-Math.min(4, domainPart.length));
  }

  return `${prefix}*****${suffix}`;
}

export function loadRememberedEmail(): string {
  try {
    if (typeof localStorage === 'undefined') return '';
    return localStorage.getItem(REMEMBERED_EMAIL_STORAGE_KEY)?.trim() ?? '';
  } catch {
    return '';
  }
}

export function saveRememberedEmail(email: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const trimmed = email.trim();
    if (trimmed) {
      localStorage.setItem(REMEMBERED_EMAIL_STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(REMEMBERED_EMAIL_STORAGE_KEY);
    }
  } catch {
    // Ignore storage quota or private-mode restrictions.
  }
}

export function clearRememberedEmail(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(REMEMBERED_EMAIL_STORAGE_KEY);
  } catch {
    // Ignore storage restrictions.
  }
}
