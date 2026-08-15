import type { ICadernoAPI } from '../api/types';

export * from './notes';
export * from './finance';
export * from './library';
export * from './culture';
export * from './calendar';
export * from './notifications';
export * from './anki';
export * from './practice';
export * from './diagrams';
export * from './store';
export * from './vault';
export * from './video';
export * from './files';
export * from './lofi';
export * from './dictionary';
export * from './stats';

declare global {
  interface Window {
    api: ICadernoAPI;
  }
}
