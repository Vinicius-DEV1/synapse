declare module '*.css' {
  const content: any;
  export default content;
}

declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '@noble/hashes/pbkdf2.js' {
  export function pbkdf2(
    hash: any,
    password: Uint8Array | string,
    salt: Uint8Array | string,
    opts: { c: number; dkLen: number }
  ): Uint8Array;
  export function pbkdf2Async(
    hash: any,
    password: Uint8Array | string,
    salt: Uint8Array | string,
    opts: { c: number; dkLen: number; asyncTick?: number }
  ): Promise<Uint8Array>;
}

declare module '@noble/hashes/sha2.js' {
  export const sha256: any;
}

declare module '@noble/ciphers/aes.js' {
  export function gcm(
    key: Uint8Array,
    nonce: Uint8Array,
    AAD?: Uint8Array
  ): {
    encrypt(plaintext: Uint8Array): Uint8Array;
    decrypt(ciphertext: Uint8Array): Uint8Array;
  };
}

declare module 'lucide-react-native' {
  import { ComponentType } from 'react';
  import { SvgProps } from 'react-native-svg';

  export interface LucideProps extends SvgProps {
    size?: number | string;
    color?: string;
    strokeWidth?: number | string;
  }

  export type LucideIcon = ComponentType<LucideProps>;

  export const ArrowLeft: LucideIcon;
  export const ArrowRight: LucideIcon;
  export const BookCheck: LucideIcon;
  export const BookMarked: LucideIcon;
  export const BookOpen: LucideIcon;
  export const BookType: LucideIcon;
  export const Bookmark: LucideIcon;
  export const Bold: LucideIcon;
  export const BrainCircuit: LucideIcon;
  export const Calendar: LucideIcon;
  export const CheckCircle2: LucideIcon;
  export const CheckSquare: LucideIcon;
  export const ChevronDown: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const Circle: LucideIcon;
  export const Clock: LucideIcon;
  export const Code: LucideIcon;
  export const FileText: LucideIcon;
  export const Flame: LucideIcon;
  export const Folder: LucideIcon;
  export const FolderInput: LucideIcon;
  export const FolderOpen: LucideIcon;
  export const FolderRoot: LucideIcon;
  export const Heading1: LucideIcon;
  export const Heading2: LucideIcon;
  export const Heading3: LucideIcon;
  export const Highlighter: LucideIcon;
  export const History: LucideIcon;
  export const Image: LucideIcon;
  export const Italic: LucideIcon;
  export const Library: LucideIcon;
  export const Link: LucideIcon;
  export const List: LucideIcon;
  export const ListOrdered: LucideIcon;
  export const Lock: LucideIcon;
  export const Menu: LucideIcon;
  export const MoreVertical: LucideIcon;
  export const Pencil: LucideIcon;
  export const Pin: LucideIcon;
  export const Plus: LucideIcon;
  export const Quote: LucideIcon;
  export const RefreshCw: LucideIcon;
  export const Search: LucideIcon;
  export const Settings: LucideIcon;
  export const ShieldAlert: LucideIcon;
  export const ShieldCheck: LucideIcon;
  export const Sparkles: LucideIcon;
  export const Strikethrough: LucideIcon;
  export const Trash2: LucideIcon;
  export const Trophy: LucideIcon;
  export const Type: LucideIcon;
  export const Underline: LucideIcon;
  export const X: LucideIcon;
}
