export interface Product {
  id: string;
  itemCode: string; // Readable: TV-001, FRIDGE-002
  name: string;
  category: string;
  barcode?: string;
  qrValue: string; // Maps to itemCode only
  /** Room or placement, e.g. "Kitchen", "Bedroom 2" */
  location?: string;
  /** Free-form notes (serial number hints, retailer, etc.) */
  notes?: string;
  /** Purchase price for insurance / asset tracking (optional). */
  purchasePrice?: number;
  /** ISO 4217 code, e.g. INR, USD (optional). */
  currency?: string;
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

