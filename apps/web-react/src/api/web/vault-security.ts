import type { PasswordGenOptions, BreachCheckResult } from '../../types/vault';

export async function generatePassword(options?: PasswordGenOptions): Promise<string> {
  const length = options?.length ?? 16;
  const useUppercase = options?.uppercase ?? true;
  const useLowercase = options?.lowercase ?? true;
  const useNumbers = options?.numbers ?? true;
  const useSymbols = options?.symbols ?? true;

  const LOWER = 'abcdefghijklmnopqrstuvwxyz';
  const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const NUMBERS = '0123456789';
  const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  let charset = '';
  const requiredChars: string[] = [];

  if (useLowercase) {
    charset += LOWER;
    requiredChars.push(LOWER);
  }
  if (useUppercase) {
    charset += UPPER;
    requiredChars.push(UPPER);
  }
  if (useNumbers) {
    charset += NUMBERS;
    requiredChars.push(NUMBERS);
  }
  if (useSymbols) {
    charset += SYMBOLS;
    requiredChars.push(SYMBOLS);
  }

  if (!charset) charset = LOWER + UPPER + NUMBERS;

  // Cryptographically secure, unbiased integer generation via rejection sampling
  const getSecureRandom = (max: number): number => {
    if (max <= 0) return 0;
    const limit = Math.floor(0x100000000 / max) * max;
    const array = new Uint32Array(1);
    let val: number;
    do {
      crypto.getRandomValues(array);
      val = array[0];
    } while (val >= limit);
    return val % max;
  };

  const chars: string[] = [];

  // Ensure at least one character from each required set
  for (const reqSet of requiredChars) {
    chars.push(reqSet[getSecureRandom(reqSet.length)]);
  }

  // Fill remaining length
  while (chars.length < length) {
    chars.push(charset[getSecureRandom(charset.length)]);
  }

  // Shuffle using Fisher-Yates with secure random
  for (let i = chars.length - 1; i > 0; i--) {
    const j = getSecureRandom(i + 1);
    const temp = chars[i];
    chars[i] = chars[j];
    chars[j] = temp;
  }

  return chars.join('');
}

export async function checkBreach(password: string): Promise<BreachCheckResult> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();

    const prefix = hashHex.substring(0, 5);
    const suffix = hashHex.substring(5);

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
    });

    if (!response.ok) {
      return { breached: false, count: 0 };
    }

    const text = await response.text();
    const lines = text.split('\n');

    for (const line of lines) {
      const [hashSuffix, countStr] = line.trim().split(':');
      if (hashSuffix === suffix) {
        const count = parseInt(countStr, 10);
        return { breached: count > 0, count };
      }
    }

    return { breached: false, count: 0 };
  } catch (e) {
    console.error('[Vault] Error checking HIBP breach:', e);
    return { breached: false, count: 0 };
  }
}

export async function checkStrength(password: string): Promise<number> {
  if (!password) return 0;

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  const commonPatterns = [/^[a-z]+$/i, /^[0-9]+$/];
  let penalties = 0;
  for (const pattern of commonPatterns) {
    if (pattern.test(password)) penalties++;
  }
  score = Math.max(0, score - penalties);

  if (score <= 1) return 0;
  if (score <= 2) return 1;
  if (score <= 3) return 2;
  if (score <= 4) return 3;
  return 4;
}
