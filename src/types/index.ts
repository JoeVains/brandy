export interface Brand {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  headerImage?: string;
  logoImage?: string;
  shareToken?: string;
  description?: string;
  categoryId?: string | null;
}

export interface BrandCategory {
  id: string;
  name: string;
  color: string;
}

export interface Section {
  id: string;
  brandId: string;
  name: string;
  parentId: string | null;
  order: number;
  emoji?: string;
}

// Module item sub-types
export interface ColorItem {
  id: string;
  name: string;
  value: string;
}

export interface FontVariant {
  weight: number;
  style: 'normal' | 'italic';
}

export interface FontItem {
  id: string;
  name: string;
  source: 'google' | 'upload';
  family?: string;
  variants?: FontVariant[];
  filename?: string;
  mimeType?: string;
  size?: number;
}

export interface ImageItem {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  caption?: string;
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

export interface GradientStop {
  color: string;
  position: number;
}

export interface GradientItem {
  id: string;
  name: string;
  type: 'linear' | 'radial';
  angle?: number;
  stops: GradientStop[];
}

export interface DoDontItem {
  id: string;
  type: 'image' | 'text';
  content?: string;
  caption?: string;
  filename?: string;
  mimeType?: string;
  fit?: 'cover' | 'contain';
}

export type ModuleType = 'colors' | 'typography' | 'text' | 'heading' | 'image' | 'attachments' | 'icons' | 'spacing' | 'dodont' | 'gradients' | 'video' | 'audio' | 'divider' | 'accessibility';

export interface Module {
  id: string;
  sectionId: string;
  brandId: string;
  type: ModuleType;
  title: string;
  order: number;
  // layout: side-by-side (2 columns) when paired with an adjacent 'half' module
  layoutWidth?: 'full' | 'half';
  // shared description (heading, typography, attachments)
  description?: string;
  // colors
  colorMode?: 'cards' | 'drops' | 'list';
  colorDescription?: string;
  colorItems?: ColorItem[];
  // typography
  fontItems?: FontItem[];
  typographyPreviewText?: string;
  // text
  content?: string;
  // image
  imageMode?: 'single' | 'gallery';
  imageFit?: 'cover' | 'contain';
  imageFilename?: string;
  imageMimeType?: string;
  imageSize?: number;
  imageItems?: ImageItem[];
  // attachments
  attachmentItems?: AttachmentItem[];
  // icons
  iconDescription?: string;
  iconItems?: IconItem[];
  // spacing
  spacingBase?: number;
  spacingSteps?: number[];
  // gradients
  gradientMode?: 'cards' | 'drops' | 'list';
  gradientItems?: GradientItem[];
  // accessibility
  accessibilitySourceModuleId?: string;
  // video
  videoMode?: 'embed' | 'upload';
  videoUrl?: string;
  videoFilename?: string;
  videoMimeType?: string;
  videoSize?: number;
  videoTitle?: string;
  videoCaption?: string;
  // audio
  audioMode?: 'embed' | 'upload';
  audioUrl?: string;
  audioFilename?: string;
  audioMimeType?: string;
  audioSize?: number;
  audioTitle?: string;
  audioCaption?: string;
  // do & don't
  doDontLayout?: 'stacked' | 'sidebyside';
  doItems?: DoDontItem[];
  dontItems?: DoDontItem[];
  backgroundColor?: string;
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
