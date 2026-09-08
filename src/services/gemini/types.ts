export interface GeminiKeyEntry {
  id: string;
  key: string;
  status: 'active' | 'exhausted' | 'error';
  disabledUntil?: number;
  addedAt: number;
  errorMessage?: string;
}

export interface GeminiModel {
  name: string;
  version: string;
  displayName: string;
  description: string;
}
