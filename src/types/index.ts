export interface Brand {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface Section {
  id: string;
  brandId: string;
  name: string;
  parentId: string | null;
  order: number;
}

// Module item sub-types
export interface ColorItem {
  id: string;
  name: string;
  value: string;
}

export interface FontItem {
  id: string;
  name: string;
  source: 'google' | 'upload';
  family?: string;
  weights?: number[];
  filename?: string;
  mimeType?: string;
  size?: number;
}

export interface ImageItem {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface IconItem {
  id: string;
  name: string;
  filename: string;
  size: number;
}

export interface AttachmentItem {
  id: string;
  name: string;
  filename: string;
  mimeType: string;
  size: number;
}

export type ModuleType = 'colors' | 'typography' | 'text' | 'heading' | 'image' | 'attachments' | 'icons' | 'divider';

export interface Module {
  id: string;
  sectionId: string;
  brandId: string;
  type: ModuleType;
  title: string;
  order: number;
  // shared description (heading, typography, attachments)
  description?: string;
  // colors
  colorMode?: 'cards' | 'drops';
  colorDescription?: string;
  colorItems?: ColorItem[];
  // typography
  fontItems?: FontItem[];
  // text
  content?: string;
  // image
  imageMode?: 'single' | 'gallery';
  imageFilename?: string;
  imageMimeType?: string;
  imageSize?: number;
  imageItems?: ImageItem[];
  // attachments
  attachmentItems?: AttachmentItem[];
  // icons
  iconDescription?: string;
  iconItems?: IconItem[];
  createdAt: string;
}

// Legacy — kept for DB compat
export interface Asset {
  id: string;
  brandId: string;
  sectionId: string;
  name: string;
  filename: string;
  type: 'image' | 'document' | 'color' | 'font' | 'other';
  mimeType: string;
  size: number;
  colorValue?: string;
  createdAt: string;
}
