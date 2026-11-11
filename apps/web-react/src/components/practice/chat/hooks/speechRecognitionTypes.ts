export interface ISpeechRecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  [index: number]: { readonly transcript: string };
}

export interface ISpeechRecognitionResultList {
  readonly length: number;
  [index: number]: ISpeechRecognitionResult;
}

export interface ISpeechRecognitionEvent {
  readonly resultIndex: number;
  readonly results: ISpeechRecognitionResultList;
}

export interface ISpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export interface ISpeechRecognitionConstructor {
  new (): ISpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: ISpeechRecognitionConstructor;
    webkitSpeechRecognition?: ISpeechRecognitionConstructor;
  }
}
