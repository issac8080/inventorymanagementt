/**
 * Zustand store for product state management
 * Provides global state and actions for products
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '@/types';
import { productDb } from '@/services/database/localDb';
import { handleError } from '@/utils/errorHandler';

interface ProductStore {
  // State
  products: Product[];
  loading: boolean;
  error: string | null;
  selectedProduct: Product | null;
  
  // Actions
  setProducts: (products: Product[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedProduct: (product: Product | null) => void;
  
  // Async actions
  loadProducts: () => Promise<void>;
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (id: string, changes: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  searchProducts: (query: string) => Promise<Product[]>;
  getProductByItemCode: (itemCode: string) => Promise<Product | undefined>;
  
  // Utilities
  clearError: () => void;
  refreshProducts: () => Promise<void>;
}

export const useProductStore = create<ProductStore>()(
  persist(
    (set, get) => ({
      // Initial state
      products: [],
      loading: false,
      error: null,
      selectedProduct: null,
      
      // Basic setters
      setProducts: (products) => set({ products }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setSelectedProduct: (product) => set({ selectedProduct: product }),
      
      // Load all products
      loadProducts: async () => {
        set({ loading: true, error: null });
        try {
          const products = await productDb.getAll();
          set({ products, loading: false });
        } catch (error) {
          const appError = handleError(error, 'Load products');
          set({ error: appError.userMessage, loading: false });
        }
      },
      
      // Add product
      addProduct: async (product) => {
        set({ loading: true, error: null });
        try {
          await productDb.add({
            ...product,
            updatedAt: new Date(),
          });
          await get().loadProducts();
        } catch (error) {
          const appError = handleError(error, 'Add product');
          set({ error: appError.userMessage, loading: false });
          throw appError;
        }
      },
      
      // Update product
      updateProduct: async (id, changes) => {
        set({ loading: true, error: null });
        try {
          await productDb.update(id, {
            ...changes,
            updatedAt: new Date(),
          });
          await get().loadProducts();
        } catch (error) {
          const appError = handleError(error, 'Update product');
          set({ error: appError.userMessage, loading: false });
          throw appError;
        }
      },
      
      // Delete product
      deleteProduct: async (id) => {
        set({ loading: true, error: null });
        try {
          await productDb.delete(id);
          await get().loadProducts();
          if (get().selectedProduct?.id === id) {
            set({ selectedProduct: null });
          }
        } catch (error) {
          const appError = handleError(error, 'Delete product');
          set({ error: appError.userMessage, loading: false });
          throw appError;
        }
      },
      
      // Search products
      searchProducts: async (query) => {
        try {
          return await productDb.search(query);
        } catch (error) {
          const appError = handleError(error, 'Search products');
          set({ error: appError.userMessage });
          return [];
        }
      },
      
      // Get product by item code
      getProductByItemCode: async (itemCode) => {
        try {
          return await productDb.getByItemCode(itemCode);
        } catch (error) {
          const appError = handleError(error, 'Get product by item code');
          set({ error: appError.userMessage });
          return undefined;
        }
      },
      
      // Clear error
      clearError: () => set({ error: null }),
      
      // Refresh products
      refreshProducts: async () => {
        await get().loadProducts();
      },
    }),
    {
      name: 'product-storage',
      partialize: (state) => ({
        // Only persist selected product, not the full list
        selectedProduct: state.selectedProduct,
      }),
    }
  )
);

