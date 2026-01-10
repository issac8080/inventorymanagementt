import { describe, it, expect } from 'vitest';
import {
  sanitizeInput,
  validateProduct,
  validateFile,
  validateBarcode,
  validateItemCode,
  ProductSchema,
} from '../validation';

describe('Validation - Unit Tests', () => {
  describe('sanitizeInput', () => {
    it('should remove angle brackets', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).not.toContain('<');
      expect(sanitizeInput('<script>alert("xss")</script>')).not.toContain('>');
    });

    it('should remove javascript: protocol', () => {
      expect(sanitizeInput('javascript:alert("xss")')).not.toContain('javascript:');
    });

    it('should remove event handlers', () => {
      expect(sanitizeInput('onclick=alert("xss")')).not.toContain('onclick=');
      expect(sanitizeInput('onerror=alert("xss")')).not.toContain('onerror=');
    });

    it('should trim whitespace', () => {
      expect(sanitizeInput('  test  ')).toBe('test');
    });

    it('should limit length to 10000 characters', () => {
      const longString = 'a'.repeat(15000);
      expect(sanitizeInput(longString).length).toBe(10000);
    });

    it('should handle non-string input', () => {
      expect(sanitizeInput(null as any)).toBe('');
      expect(sanitizeInput(123 as any)).toBe('');
    });
  });

  describe('validateProduct', () => {
    it('should validate correct product data', () => {
      const product = {
        name: 'Test Product',
        category: 'TV',
        barcode: '1234567890123',
      };
      
      const result = validateProduct(product);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should reject product with empty name', () => {
      const product = {
        name: '',
        category: 'TV',
      };
      
      const result = validateProduct(product);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject product with name too long', () => {
      const product = {
        name: 'a'.repeat(201),
        category: 'TV',
      };
      
      const result = validateProduct(product);
      expect(result.success).toBe(false);
    });

    it('should reject invalid barcode format', () => {
      const product = {
        name: 'Test Product',
        category: 'TV',
        barcode: '123', // Too short
      };
      
      const result = validateProduct(product);
      expect(result.success).toBe(false);
    });

    it('should accept valid barcode', () => {
      const product = {
        name: 'Test Product',
        category: 'TV',
        barcode: '1234567890123',
      };
      
      const result = validateProduct(product);
      expect(result.success).toBe(true);
    });

    it('should sanitize product name and category', () => {
      const product = {
        name: '<script>alert("xss")</script>',
        category: 'TV',
      };
      
      const result = validateProduct(product);
      expect(result.success).toBe(true);
      expect(result.data?.name).not.toContain('<script>');
    });
  });

  describe('validateFile', () => {
    it('should validate file size', () => {
      const file = new File(['x'.repeat(6 * 1024 * 1024)], 'test.jpg', { type: 'image/jpeg' });
      const result = validateFile(file, { maxSizeMB: 5 });
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('File size');
    });

    it('should validate file type', () => {
      const file = new File(['test'], 'test.exe', { type: 'application/x-msdownload' });
      const result = validateFile(file);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('File type');
    });

    it('should accept valid image file', () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const result = validateFile(file);
      
      expect(result.valid).toBe(true);
    });

    it('should accept PNG files', () => {
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      const result = validateFile(file);
      
      expect(result.valid).toBe(true);
    });
  });

  describe('validateBarcode', () => {
    it('should validate 8-digit barcode', () => {
      expect(validateBarcode('12345678')).toBe(true);
    });

    it('should validate 14-digit barcode', () => {
      expect(validateBarcode('12345678901234')).toBe(true);
    });

    it('should reject barcode with letters', () => {
      expect(validateBarcode('12345678abc')).toBe(false);
    });

    it('should reject barcode too short', () => {
      expect(validateBarcode('1234567')).toBe(false);
    });

    it('should reject barcode too long', () => {
      expect(validateBarcode('123456789012345')).toBe(false);
    });

    it('should handle whitespace', () => {
      expect(validateBarcode('  12345678  ')).toBe(true);
    });

    it('should reject empty barcode', () => {
      expect(validateBarcode('')).toBe(false);
    });
  });

  describe('validateItemCode', () => {
    it('should validate correct item code format', () => {
      expect(validateItemCode('TV-001')).toBe(true);
      expect(validateItemCode('FRIDGE-123')).toBe(true);
    });

    it('should reject item code without dash', () => {
      expect(validateItemCode('TV001')).toBe(false);
    });

    it('should accept item code with lowercase (converts to uppercase)', () => {
      // The function converts to uppercase, so lowercase should be accepted
      expect(validateItemCode('tv-001')).toBe(true);
    });

    it('should reject empty item code', () => {
      expect(validateItemCode('')).toBe(false);
    });

    it('should handle whitespace', () => {
      expect(validateItemCode('  TV-001  ')).toBe(true);
    });
  });
});

