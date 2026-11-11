export interface BundledFileItem {
  fileId: string;
  name: string;
  fileType: string;
  fileSize?: number;
  isLink?: boolean;
  addedAt?: number;
}

export interface DocumentBundleAttrs {
  id: string;
  title: string;
  color?: string;
  items: BundledFileItem[];
}
