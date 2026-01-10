import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  calculateWarrantyEnd,
  parseWarrantyDuration,
  parseWarrantyDate,
  getWarrantyStatus,
} from '../warrantyCalculator';

describe('WarrantyCalculator - Unit Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('calculateWarrantyEnd', () => {
    it('should calculate warranty end date correctly for 12 months', () => {
      const startDate = new Date('2024-01-01');
      const duration = 12;
      const endDate = calculateWarrantyEnd(startDate, duration);
      
      expect(endDate.getFullYear()).toBe(2025);
      expect(endDate.getMonth()).toBe(0); // January
      expect(endDate.getDate()).toBe(1);
    });

    it('should calculate warranty end date correctly for 24 months', () => {
      const startDate = new Date('2024-06-15');
      const duration = 24;
      const endDate = calculateWarrantyEnd(startDate, duration);
      
      expect(endDate.getFullYear()).toBe(2026);
      expect(endDate.getMonth()).toBe(5); // June
      expect(endDate.getDate()).toBe(15);
    });

    it('should handle leap year correctly', () => {
      const startDate = new Date('2024-02-29');
      const duration = 12;
      const endDate = calculateWarrantyEnd(startDate, duration);
      
      expect(endDate.getFullYear()).toBe(2025);
      expect(endDate.getMonth()).toBe(1); // February
    });
  });

  describe('parseWarrantyDuration', () => {
    it('should parse months correctly', () => {
      expect(parseWarrantyDuration('12 months')).toBe(12);
      expect(parseWarrantyDuration('24 months')).toBe(24);
      expect(parseWarrantyDuration('6 mo')).toBe(6);
    });

    it('should parse years correctly and convert to months', () => {
      expect(parseWarrantyDuration('1 year')).toBe(12);
      expect(parseWarrantyDuration('2 years')).toBe(24);
      expect(parseWarrantyDuration('3 yr')).toBe(36);
    });

    it('should return null for invalid input', () => {
      expect(parseWarrantyDuration('invalid')).toBeNull();
      expect(parseWarrantyDuration('')).toBeNull();
      expect(parseWarrantyDuration('abc months')).toBeNull();
    });

    it('should handle case insensitive input', () => {
      expect(parseWarrantyDuration('12 MONTHS')).toBe(12);
      expect(parseWarrantyDuration('1 YEAR')).toBe(12);
    });
  });

  describe('parseWarrantyDate', () => {
    it('should parse DD-MM-YYYY format', () => {
      const date = parseWarrantyDate('15-06-2024');
      expect(date).not.toBeNull();
      expect(date?.getFullYear()).toBe(2024);
      expect(date?.getMonth()).toBe(5); // June (0-indexed)
      expect(date?.getDate()).toBe(15);
    });

    it('should parse YYYY-MM-DD format', () => {
      const date = parseWarrantyDate('2024-06-15');
      expect(date).not.toBeNull();
      expect(date?.getFullYear()).toBe(2024);
    });

    it('should parse DD/MM/YYYY format', () => {
      const date = parseWarrantyDate('15/06/2024');
      expect(date).not.toBeNull();
      if (date) {
        expect(date.getFullYear()).toBe(2024);
        expect(date.getMonth()).toBe(5); // June (0-indexed)
        expect(date.getDate()).toBe(15);
      }
    });

    it('should return null for invalid dates', () => {
      expect(parseWarrantyDate('invalid')).toBeNull();
      expect(parseWarrantyDate('32-13-2024')).toBeNull();
    });
  });

  describe('getWarrantyStatus', () => {
    it('should return "valid" for future warranty end date', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      
      expect(getWarrantyStatus(futureDate)).toBe('valid');
    });

    it('should return "expired" for past warranty end date', () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      
      expect(getWarrantyStatus(pastDate)).toBe('expired');
    });

    it('should return "none" when warranty end is undefined', () => {
      expect(getWarrantyStatus(undefined)).toBe('none');
    });

    it('should return "expired" for warranty that ended today', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      expect(getWarrantyStatus(today)).toBe('expired');
    });
  });
});

