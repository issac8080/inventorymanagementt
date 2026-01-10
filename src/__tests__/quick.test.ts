/**
 * Quick smoke tests - Run these first for fast feedback
 * These tests verify core functionality without heavy operations
 */

import { describe, it, expect } from 'vitest';
import { calculateWarrantyEnd, getWarrantyStatus } from '@/utils/warrantyCalculator';
import { formatDate } from '@/utils/dateUtils';
import { validateBarcode, validateItemCode, sanitizeInput } from '@/utils/validation';

describe('Quick Smoke Tests', () => {
  it('should calculate warranty end date', () => {
    const startDate = new Date('2024-01-01');
    const endDate = calculateWarrantyEnd(startDate, 12);
    expect(endDate.getFullYear()).toBe(2025);
  });

  it('should get warranty status', () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    expect(getWarrantyStatus(futureDate)).toBe('valid');
  });

  it('should format date', () => {
    const date = new Date('2024-06-15');
    expect(formatDate(date)).toBe('15 Jun 2024');
  });

  it('should validate barcode', () => {
    expect(validateBarcode('1234567890123')).toBe(true);
    expect(validateBarcode('123')).toBe(false);
  });

  it('should validate item code', () => {
    expect(validateItemCode('TV-001')).toBe(true);
    expect(validateItemCode('invalid')).toBe(false);
  });

  it('should sanitize input', () => {
    const malicious = '<script>alert("xss")</script>';
    const sanitized = sanitizeInput(malicious);
    expect(sanitized).not.toContain('<script>');
  });
});

