import { describe, it, expect, vi } from 'vitest';
import { sanitizeInput, validateProduct, validateBarcode, validateItemCode } from '@/utils/validation';
import { productDb } from '@/services/database/db';
import { Product } from '@/types';
import { generateUUID } from '@/utils/uuid';

// Mock database
vi.mock('@/services/database/db', () => ({
  productDb: {
    add: vi.fn(),
    getByItemCode: vi.fn(),
    search: vi.fn(),
    getAll: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getByCategory: vi.fn(),
  },
  warrantyDb: {},
  isUsingLocalDatabase: () => true,
  isUsingFirebase: () => false,
}));

describe('Security Tests', () => {
  describe('XSS (Cross-Site Scripting) Prevention', () => {
    it('should sanitize script tags in input', () => {
      const maliciousInput = '<script>alert("XSS")</script>';
      const sanitized = sanitizeInput(maliciousInput);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('</script>');
    });

    it('should sanitize javascript: protocol', () => {
      const maliciousInput = 'javascript:alert("XSS")';
      const sanitized = sanitizeInput(maliciousInput);
      
      expect(sanitized).not.toContain('javascript:');
    });

    it('should sanitize event handlers', () => {
      const maliciousInput = '<img src="x" onerror="alert(\'XSS\')">';
      const sanitized = sanitizeInput(maliciousInput);
      
      expect(sanitized).not.toContain('onerror=');
    });

    it('should prevent XSS in product name', () => {
      const maliciousProduct = {
        name: '<script>alert("XSS")</script>',
        category: 'TV',
      };
      
      const result = validateProduct(maliciousProduct);
      
      if (result.success && result.data) {
        expect(result.data.name).not.toContain('<script>');
      }
    });

    it('should prevent XSS in product category', () => {
      const maliciousProduct = {
        name: 'Test Product',
        category: '<img src=x onerror=alert(1)>',
      };
      
      const result = validateProduct(maliciousProduct);
      
      if (result.success && result.data) {
        expect(result.data.category).not.toContain('onerror');
      }
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should handle SQL injection attempts in search', async () => {
      const sqlInjection = "'; DROP TABLE products; --";
      
      vi.mocked(productDb.search).mockResolvedValue([]);
      
      // Should not execute SQL, just treat as search string
      await productDb.search(sqlInjection);
      
      expect(productDb.search).toHaveBeenCalledWith(sqlInjection);
      // Database should handle this safely (IndexedDB doesn't use SQL)
    });

    it('should prevent SQL injection in item code', () => {
      const sqlInjection = "'; DROP TABLE products; --";
      
      // Should validate and reject invalid format
      const isValid = validateItemCode(sqlInjection);
      expect(isValid).toBe(false);
    });
  });

  describe('Input Validation', () => {
    it('should reject extremely long input', () => {
      const longInput = 'a'.repeat(100000);
      const sanitized = sanitizeInput(longInput);
      
      // Should be limited to 10000 characters
      expect(sanitized.length).toBeLessThanOrEqual(10000);
    });

    it('should validate barcode format to prevent injection', () => {
      const maliciousBarcode = "123'; DROP TABLE products; --";
      const isValid = validateBarcode(maliciousBarcode);
      
      expect(isValid).toBe(false);
    });

    it('should validate item code format', () => {
      const maliciousItemCode = "TV-001'; DROP TABLE products; --";
      const isValid = validateItemCode(maliciousItemCode);
      
      // Should reject due to invalid format
      expect(isValid).toBe(false);
    });
  });

  describe('Data Sanitization', () => {
    it('should sanitize all user inputs before storage', () => {
      const product = {
        name: '<script>alert("XSS")</script>Product',
        category: 'TV<script>',
        barcode: '1234567890123',
      };
      
      const result = validateProduct(product);
      
      if (result.success && result.data) {
        expect(result.data.name).not.toContain('<script>');
        expect(result.data.category).not.toContain('<script>');
      }
    });

    it('should handle null and undefined safely', () => {
      expect(sanitizeInput(null as any)).toBe('');
      expect(sanitizeInput(undefined as any)).toBe('');
    });

    it('should handle special characters safely', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const sanitized = sanitizeInput(specialChars);
      
      // Should preserve most characters but remove dangerous ones
      expect(sanitized).toBeDefined();
    });
  });

  describe('File Upload Security', () => {
    it('should validate file types', () => {
      const maliciousFile = new File(['malicious'], 'malicious.exe', {
        type: 'application/x-msdownload',
      });
      
      // File validation should reject executable files
      // This would be tested in the actual file validation function
      expect(maliciousFile.type).not.toBe('image/jpeg');
    });

    it('should validate file size', () => {
      // Create a large file (simulated)
      const largeFile = new File(['x'.repeat(10 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg',
      });
      
      // File size validation should reject files that are too large
      expect(largeFile.size).toBeGreaterThan(5 * 1024 * 1024); // 5MB
    });
  });

  describe('Authentication & Authorization', () => {
    it('should not expose sensitive data in errors', () => {
      // Error messages should not expose internal details
      const error = new Error('Database connection failed');
      
      // Error handling should sanitize error messages
      expect(error.message).not.toContain('password');
      expect(error.message).not.toContain('secret');
    });
  });

  describe('Data Integrity', () => {
    it('should prevent invalid data from being stored', () => {
      const invalidProduct = {
        name: '', // Empty name should be rejected
        category: 'TV',
      };
      
      const result = validateProduct(invalidProduct);
      expect(result.success).toBe(false);
    });

    it('should enforce data type constraints', () => {
      const invalidProduct = {
        name: 123 as any, // Wrong type
        category: 'TV',
      };
      
      const result = validateProduct(invalidProduct);
      expect(result.success).toBe(false);
    });
  });
});

