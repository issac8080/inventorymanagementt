/**
 * Input validation and sanitization utilities
 * Uses Zod for schema validation
 */

import { z } from 'zod';

// Product validation schema
export const ProductSchema = z.object({
  name: z
    .string()
    .min(1, 'Product name is required')
    .max(200, 'Product name must be less than 200 characters')
    .trim()
    .refine(val => val.length > 0, 'Product name cannot be empty'),
  
  category: z
    .string()
    .min(1, 'Category is required')
    .max(50, 'Category must be less than 50 characters')
    .trim(),
  
  barcode: z
    .string()
    .optional()
    .refine(
      val => !val || /^\d{8,14}$/.test(val),
      'Barcode must be 8-14 digits'
    ),
  
  warrantyStart: z.date().optional(),
  warrantyEnd: z.date().optional(),
  warrantyDuration: z.number().int().positive().max(1200).optional(), // Max 100 years in months
});

export type ProductInput = z.infer<typeof ProductSchema>;

// Warranty document validation
export const WarrantyDocumentSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  imageBlob: z.instanceof(Blob),
  extractedText: z.string().optional(),
});

// Bulk import row validation
export const BulkImportRowSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  category: z.string().min(1).max(50).trim(),
  barcode: z.string().optional().refine(
    val => !val || /^\d{8,14}$/.test(val),
    'Invalid barcode format'
  ),
  warrantyStart: z.string().optional(),
  warrantyEnd: z.string().optional(),
  warrantyDuration: z.string().optional().refine(
    val => !val || /^\d+$/.test(val),
    'Duration must be a number'
  ),
});

// Date string validation (flexible formats)
export const DateStringSchema = z.string().refine(
  (val) => {
    if (!val || !val.trim()) return true; // Optional
    // Try parsing various date formats
    const date = new Date(val);
    return !isNaN(date.getTime());
  },
  'Invalid date format. Use YYYY-MM-DD or DD-MM-YYYY'
);

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .slice(0, 10000); // Limit length
}

/**
 * Validate and sanitize product data
 */
export function validateProduct(data: unknown): {
  success: boolean;
  data?: ProductInput;
  errors?: z.ZodError;
} {
  try {
    const validated = ProductSchema.parse(data);
    return {
      success: true,
      data: {
        ...validated,
        name: sanitizeInput(validated.name),
        category: sanitizeInput(validated.category),
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error,
      };
    }
    throw error;
  }
}

/**
 * Validate file upload
 */
export function validateFile(
  file: File,
  options: {
    maxSizeMB?: number;
    allowedTypes?: string[];
  } = {}
): { valid: boolean; error?: string } {
  const { maxSizeMB = 5, allowedTypes = ['image/jpeg', 'image/png', 'image/webp'] } = options;
  
  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size must be less than ${maxSizeMB}MB`,
    };
  }
  
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }
  
  return { valid: true };
}

/**
 * Validate barcode format
 */
export function validateBarcode(barcode: string): boolean {
  if (!barcode || !barcode.trim()) return false;
  const cleaned = barcode.trim().replace(/\s+/g, '');
  return /^\d{8,14}$/.test(cleaned);
}

/**
 * Validate item code format
 */
export function validateItemCode(itemCode: string): boolean {
  if (!itemCode || !itemCode.trim()) return false;
  return /^[A-Z0-9]+-\d{3,}$/.test(itemCode.trim().toUpperCase());
}

