export interface Product {
  id: string;
  itemCode: string; // Readable: TV-001, FRIDGE-002
  name: string;
  category: string;
  barcode?: string;
  qrValue: string; // Maps to itemCode only
  warrantyStart?: Date;
  warrantyEnd?: Date;
  warrantyDuration?: number; // Months
  createdAt: Date;
  updatedAt?: Date; // Added in version 2
}

export interface WarrantyDocument {
  id: string;
  productId: string;
  imageBlob: Blob; // Stored directly in IndexedDB
  extractedText?: string; // OCR result (optional)
  createdAt: Date;
}

export interface ProductLookupResult {
  name?: string;
  category?: string;
  description?: string;
  image?: string;
}

