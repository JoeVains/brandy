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
