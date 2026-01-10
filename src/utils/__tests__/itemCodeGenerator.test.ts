import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateItemCode, getCategoryCode } from '../itemCodeGenerator';
import { productDb } from '@/services/database/localDb';

// Mock the database
vi.mock('@/services/database/localDb', () => ({
  productDb: {
    getByCategory: vi.fn(),
  },
}));

describe('ItemCodeGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCategoryCode', () => {
    it('should return correct code for known categories', () => {
      expect(getCategoryCode('television')).toBe('TV');
      expect(getCategoryCode('TV')).toBe('TV');
      expect(getCategoryCode('refrigerator')).toBe('FRIDGE');
      expect(getCategoryCode('mobile')).toBe('PHONE');
    });

    it('should return uppercase first 6 chars for unknown categories', () => {
      expect(getCategoryCode('unknowncategory')).toBe('UNKNOW');
    });
  });

  describe('generateItemCode', () => {
    it('should generate first item code for new category', async () => {
      (productDb.getByCategory as any).mockResolvedValue([]);
      const code = await generateItemCode('TV');
      expect(code).toBe('TV-001');
    });

    it('should increment code for existing category', async () => {
      (productDb.getByCategory as any).mockResolvedValue([
        { itemCode: 'TV-001' },
        { itemCode: 'TV-002' },
      ]);
      const code = await generateItemCode('TV');
      expect(code).toBe('TV-003');
    });
  });
});

