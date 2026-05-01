import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useProductStore } from '../productStore';
import { productDb } from '@/services/database/db';
import { Product } from '@/types';
import { generateUUID } from '@/utils/uuid';

// Mock database
vi.mock('@/services/database/db', () => ({
  productDb: {
    getAll: vi.fn(),
    add: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    search: vi.fn(),
    getByItemCode: vi.fn(),
    getByCategory: vi.fn(),
    getById: vi.fn(),
  },
  warrantyDb: {},
  isUsingLocalDatabase: () => true,
  isUsingFirebase: () => false,
}));

describe('ProductStore - Unit & Integration Tests', () => {
  let testProduct: Product;

  beforeEach(() => {
    vi.clearAllMocks();
    
    testProduct = {
      id: generateUUID(),
      itemCode: 'TV-001',
      name: 'Test TV',
      category: 'TV',
      qrValue: 'TV-001',
      createdAt: new Date(),
    };

    // Reset store state
    useProductStore.setState({
      products: [],
      loading: false,
      error: null,
      selectedProduct: null,
    });
  });

  describe('State Management', () => {
    it('should initialize with empty state', () => {
      const state = useProductStore.getState();
      expect(state.products).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.selectedProduct).toBeNull();
    });

    it('should set products', () => {
      useProductStore.getState().setProducts([testProduct]);
      expect(useProductStore.getState().products).toEqual([testProduct]);
    });

    it('should set loading state', () => {
      useProductStore.getState().setLoading(true);
      expect(useProductStore.getState().loading).toBe(true);
    });

    it('should set error', () => {
      useProductStore.getState().setError('Test error');
      expect(useProductStore.getState().error).toBe('Test error');
    });

    it('should set selected product', () => {
      useProductStore.getState().setSelectedProduct(testProduct);
      expect(useProductStore.getState().selectedProduct).toEqual(testProduct);
    });

    it('should clear error', () => {
      useProductStore.getState().setError('Test error');
      useProductStore.getState().clearError();
      expect(useProductStore.getState().error).toBeNull();
    });
  });

  describe('loadProducts', () => {
    it('should load products from database', async () => {
      vi.mocked(productDb.getAll).mockResolvedValue([testProduct]);
      
      await useProductStore.getState().loadProducts();
      
      expect(productDb.getAll).toHaveBeenCalled();
      expect(useProductStore.getState().products).toEqual([testProduct]);
      expect(useProductStore.getState().loading).toBe(false);
    });

    it('should handle errors when loading products', async () => {
      vi.mocked(productDb.getAll).mockRejectedValue(new Error('Database error'));
      
      await useProductStore.getState().loadProducts();
      
      expect(useProductStore.getState().error).toBeDefined();
      expect(useProductStore.getState().loading).toBe(false);
    });
  });

  describe('addProduct', () => {
    it('should add product to database', async () => {
      vi.mocked(productDb.add).mockResolvedValue(testProduct.id);
      vi.mocked(productDb.getAll).mockResolvedValue([testProduct]);
      
      await useProductStore.getState().addProduct(testProduct);
      
      expect(productDb.add).toHaveBeenCalledWith(
        expect.objectContaining({
          ...testProduct,
          updatedAt: expect.any(Date),
        })
      );
    });

    it('should handle errors when adding product', async () => {
      vi.mocked(productDb.add).mockRejectedValue(new Error('Add error'));
      
      await expect(
        useProductStore.getState().addProduct(testProduct)
      ).rejects.toThrow();
    });
  });

  describe('updateProduct', () => {
    it('should update product in database', async () => {
      vi.mocked(productDb.update).mockResolvedValue(1);
      vi.mocked(productDb.getAll).mockResolvedValue([{ ...testProduct, name: 'Updated' }]);
      
      await useProductStore.getState().updateProduct(testProduct.id, { name: 'Updated' });
      
      expect(productDb.update).toHaveBeenCalledWith(
        testProduct.id,
        expect.objectContaining({
          name: 'Updated',
          updatedAt: expect.any(Date),
        })
      );
    });
  });

  describe('deleteProduct', () => {
    it('should delete product from database', async () => {
      vi.mocked(productDb.delete).mockResolvedValue(undefined);
      vi.mocked(productDb.getAll).mockResolvedValue([]);
      useProductStore.getState().setSelectedProduct(testProduct);
      
      await useProductStore.getState().deleteProduct(testProduct.id);
      
      expect(productDb.delete).toHaveBeenCalledWith(testProduct.id);
      expect(useProductStore.getState().selectedProduct).toBeNull();
    });
  });

  describe('searchProducts', () => {
    it('should search products', async () => {
      vi.mocked(productDb.search).mockResolvedValue([testProduct]);
      
      const results = await useProductStore.getState().searchProducts('TV');
      
      expect(productDb.search).toHaveBeenCalledWith('TV');
      expect(results).toEqual([testProduct]);
    });
  });

  describe('getProductByItemCode', () => {
    it('should get product by item code', async () => {
      vi.mocked(productDb.getByItemCode).mockResolvedValue(testProduct);
      
      const result = await useProductStore.getState().getProductByItemCode('TV-001');
      
      expect(productDb.getByItemCode).toHaveBeenCalledWith('TV-001');
      expect(result).toEqual(testProduct);
    });
  });
});

