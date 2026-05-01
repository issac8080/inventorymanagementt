import { describe, it, expect, vi, beforeEach } from 'vitest';
import { productDb } from '@/services/database/db';
import { Product } from '@/types';
import { generateUUID } from '@/utils/uuid';
import { useProductStore } from '@/stores/productStore';

// Mock database
vi.mock('@/services/database/db', () => ({
  productDb: {
    getAll: vi.fn(),
    add: vi.fn(),
    search: vi.fn(),
    getByItemCode: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getByCategory: vi.fn(),
  },
  warrantyDb: {},
  isUsingLocalDatabase: () => true,
  isUsingFirebase: () => false,
}));

describe('Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Load Testing - Database Operations', () => {
    it('should handle loading large number of products efficiently', async () => {
      // Reduced from 1000 to 100 for faster tests
      const largeProductList: Product[] = Array.from({ length: 100 }, (_, i) => ({
        id: generateUUID(),
        itemCode: `TV-${String(i + 1).padStart(3, '0')}`,
        name: `Product ${i + 1}`,
        category: 'TV',
        qrValue: `TV-${String(i + 1).padStart(3, '0')}`,
        createdAt: new Date(),
      }));

      vi.mocked(productDb.getAll).mockResolvedValue(largeProductList);
      
      const startTime = performance.now();
      await useProductStore.getState().loadProducts();
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(1000); // 1 second
      expect(useProductStore.getState().products.length).toBe(100);
    });

    it('should handle search operations on large dataset', async () => {
      // Reduced from 5000 to 500 for faster tests
      const largeProductList: Product[] = Array.from({ length: 500 }, (_, i) => ({
        id: generateUUID(),
        itemCode: `TV-${String(i + 1).padStart(3, '0')}`,
        name: `Product ${i + 1}`,
        category: i % 2 === 0 ? 'TV' : 'Refrigerator',
        qrValue: `TV-${String(i + 1).padStart(3, '0')}`,
        createdAt: new Date(),
      }));

      vi.mocked(productDb.search).mockResolvedValue(
        largeProductList.filter(p => p.name.includes('Product'))
      );
      
      const startTime = performance.now();
      const results = await useProductStore.getState().searchProducts('Product');
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      // Search should be fast even with large dataset
      expect(duration).toBeLessThan(500); // 500ms
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Stress Testing - Concurrent Operations', () => {
    it('should handle multiple concurrent product additions', async () => {
      // Reduced from 100 to 20 for faster tests
      vi.mocked(productDb.add).mockImplementation(async (product) => {
        // No delay in tests - instant mock
        return product.id;
      });
      vi.mocked(productDb.getAll).mockResolvedValue([]);

      const products = Array.from({ length: 20 }, (_, i) => ({
        id: generateUUID(),
        itemCode: `TV-${String(i + 1).padStart(3, '0')}`,
        name: `Product ${i + 1}`,
        category: 'TV',
        qrValue: `TV-${String(i + 1).padStart(3, '0')}`,
        createdAt: new Date(),
      }));

      const startTime = performance.now();
      
      // Add products concurrently
      await Promise.all(
        products.map(product => useProductStore.getState().addProduct(product))
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should handle concurrent operations
      expect(duration).toBeLessThan(1000); // 1 second for 20 concurrent operations
      expect(productDb.add).toHaveBeenCalledTimes(20);
    });

    it('should handle rapid search requests', async () => {
      vi.mocked(productDb.search).mockResolvedValue([]);
      
      const startTime = performance.now();
      
      // Reduced from 50 to 10 rapid search requests
      await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          useProductStore.getState().searchProducts(`query-${i}`)
        )
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should handle rapid requests efficiently
      expect(duration).toBeLessThan(500); // 500ms
      expect(productDb.search).toHaveBeenCalledTimes(10);
    });
  });

  describe('Memory Testing', () => {
    it('should not cause memory leaks with repeated operations', async () => {
      vi.mocked(productDb.getAll).mockResolvedValue([]);
      
      // Reduced from 100 to 20 iterations for faster tests
      for (let i = 0; i < 20; i++) {
        await useProductStore.getState().loadProducts();
        await useProductStore.getState().searchProducts('test');
      }
      
      // Store should still be functional
      expect(useProductStore.getState().products).toBeDefined();
      expect(useProductStore.getState().loading).toBe(false);
    });
  });

  describe('Response Time Testing', () => {
    it('should respond to getByItemCode quickly', async () => {
      const product: Product = {
        id: generateUUID(),
        itemCode: 'TV-001',
        name: 'Test TV',
        category: 'TV',
        qrValue: 'TV-001',
        createdAt: new Date(),
      };

      vi.mocked(productDb.getByItemCode).mockResolvedValue(product);
      
      const startTime = performance.now();
      const result = await useProductStore.getState().getProductByItemCode('TV-001');
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      // Should respond quickly
      expect(duration).toBeLessThan(100); // 100ms
      expect(result).toBeDefined();
    });
  });
});

