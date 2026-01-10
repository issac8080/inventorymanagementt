import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatDateInput,
  getRelativeTime,
} from '../dateUtils';

describe('DateUtils - Unit Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-06-15');
      expect(formatDate(date)).toBe('15 Jun 2024');
    });

    it('should handle different dates', () => {
      const date = new Date('2024-12-25');
      expect(formatDate(date)).toBe('25 Dec 2024');
    });
  });

  describe('formatDateTime', () => {
    it('should format date and time correctly', () => {
      const date = new Date('2024-06-15T14:30:00');
      const formatted = formatDateTime(date);
      expect(formatted).toContain('15 Jun 2024');
      expect(formatted).toContain('02:30 PM');
    });
  });

  describe('formatDateInput', () => {
    it('should format date for input field', () => {
      const date = new Date('2024-06-15');
      expect(formatDateInput(date)).toBe('2024-06-15');
    });

    it('should handle single digit months and days', () => {
      const date = new Date('2024-01-05');
      expect(formatDateInput(date)).toBe('2024-01-05');
    });
  });

  describe('getRelativeTime', () => {
    it('should return relative time for past dates', () => {
      const pastDate = new Date('2024-06-10T12:00:00Z');
      const relative = getRelativeTime(pastDate);
      expect(relative).toContain('ago');
    });

    it('should return relative time for future dates', () => {
      const futureDate = new Date('2024-06-20T12:00:00Z');
      const relative = getRelativeTime(futureDate);
      expect(relative).toContain('in');
    });
  });
});

