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

export interface GeminiContentPart {
  text?: string;
  inline_data?: {
    mime_type: string;
    data: string;
  };
  [key: string]: unknown;
}

export interface GeminiContentTurn {
  role: string;
  parts: GeminiContentPart[];
  [key: string]: unknown;
}

export interface GeminiTokenUsage {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
  [key: string]: unknown;
}

export interface GeminiRequestBody {
  contents: GeminiContentTurn[];
  generationConfig?: {
    maxOutputTokens?: number;
    temperature?: number;
    [key: string]: unknown;
  };
  system_instruction?: {
    parts: { text: string };
  };
  tools?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}
