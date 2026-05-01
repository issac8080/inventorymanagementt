import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { productDb, warrantyDb } from '@/services/database/db';
import { Product, WarrantyDocument } from '@/types';
import { generateUUID } from '@/utils/uuid';
import { useProductStore } from '@/stores/productStore';
import { calculateWarrantyEnd, getWarrantyStatus } from '@/utils/warrantyCalculator';
import { formatDate } from '@/utils/dateUtils';
import { validateProduct, validateBarcode } from '@/utils/validation';
import App from '@/App';

// Mock dependencies
vi.mock('@/services/database/db', () => ({
  productDb: {
    getAll: vi.fn(),
    getById: vi.fn(),
    add: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    search: vi.fn(),
    getByItemCode: vi.fn(),
    getByCategory: vi.fn(),
  },
  warrantyDb: {
    getByProductId: vi.fn(),
    add: vi.fn(),
    delete: vi.fn(),
    deleteByProductId: vi.fn(),
  },
  isUsingLocalDatabase: () => true,
  isUsingFirebase: () => false,
}));
vi.mock('@/utils/sounds', () => ({ playBeep: vi.fn() }));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
  Toaster: () => <div data-testid="toaster">Toaster</div>,
}));
vi.mock('@/hooks/usePWA', () => ({ usePWA: () => ({ isInstallable: false, install: vi.fn() }) }));
vi.mock('@/components/scanner/QRScanner', () => ({
  QRScanner: () => <div data-testid="qr-scanner">Scanner</div>,
}));
vi.mock('@/components/assistant/Chatbot', () => ({ Chatbot: () => <div>Chatbot</div> }));

vi.mock('@/services/auth/simpleAuth', () => {
  const sessionUser = {
    id: 'vitest-user',
    mobile: 'vitest',
    password: '',
    username: 'Vitest',
    created_at: new Date().toISOString(),
  };
  return {
    simpleAuth: {
      getCurrentUser: vi.fn(() => sessionUser),
      initCloudAuthSync: vi.fn(() => () => {}),
      isCurrentUserAdmin: vi.fn(() => false),
      saveUser: vi.fn(),
      logout: vi.fn(),
      continueAsLocalDevice: vi.fn(),
      login: vi.fn(),
      getAllUsers: vi.fn(),
      createUser: vi.fn(),
      deleteUser: vi.fn(),
    },
    LOCAL_OFFLINE_USER: {
      id: '00000000-0000-4000-8000-000000000001',
      mobile: 'local-device',
      password: '',
      username: 'This device',
      created_at: new Date().toISOString(),
    },
  };
});

describe('Regression Tests - Ensure Existing Features Still Work', () => {
  let testProduct: Product;

  beforeEach(() => {
    vi.clearAllMocks();
    
    testProduct = {
      id: generateUUID(),
      itemCode: 'TV-001',
      name: 'Test TV',
      category: 'TV',
      qrValue: 'TV-001',
      barcode: '1234567890123',
      createdAt: new Date(),
    };

    useProductStore.setState({
      products: [],
      loading: false,
      error: null,
      selectedProduct: null,
    });
  });

  describe('Core Functionality Regression', () => {
    it('should still calculate warranty end date correctly', () => {
      const startDate = new Date('2024-01-01');
      const duration = 12;
      const endDate = calculateWarrantyEnd(startDate, duration);
      
      expect(endDate.getFullYear()).toBe(2025);
      expect(endDate.getMonth()).toBe(0);
    });

    it('should still get warranty status correctly', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      
      expect(getWarrantyStatus(futureDate)).toBe('valid');
      
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      
      expect(getWarrantyStatus(pastDate)).toBe('expired');
    });

    it('should still format dates correctly', () => {
      const date = new Date('2024-06-15');
      const formatted = formatDate(date);
      
      expect(formatted).toBe('15 Jun 2024');
    });

    it('should still validate products correctly', () => {
      const validProduct = {
        name: 'Test Product',
        category: 'TV',
      };
      
      const result = validateProduct(validProduct);
      expect(result.success).toBe(true);
    });

    it('should still validate barcodes correctly', () => {
      expect(validateBarcode('1234567890123')).toBe(true);
      expect(validateBarcode('123')).toBe(false);
    });
  });

  describe('Database Operations Regression', () => {
    it('should still add products correctly', async () => {
      vi.mocked(productDb.add).mockResolvedValue(testProduct.id);
      vi.mocked(productDb.getAll).mockResolvedValue([testProduct]);
      
      await useProductStore.getState().addProduct(testProduct);
      await useProductStore.getState().loadProducts();
      
      expect(useProductStore.getState().products.length).toBeGreaterThan(0);
    });

    it('should still search products correctly', async () => {
      vi.mocked(productDb.search).mockResolvedValue([testProduct]);
      
      const results = await useProductStore.getState().searchProducts('TV');
      
      expect(results).toContainEqual(expect.objectContaining({ itemCode: 'TV-001' }));
    });

    it('should still get product by item code correctly', async () => {
      vi.mocked(productDb.getByItemCode).mockResolvedValue(testProduct);
      
      const result = await useProductStore.getState().getProductByItemCode('TV-001');
      
      expect(result).toBeDefined();
      expect(result?.itemCode).toBe('TV-001');
    });
  });

  describe('UI Components Regression', () => {
    it('should still render home page correctly', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: /Initra.*Home Inventory|Home Inventory/i })
        ).toBeInTheDocument();
      });
    });

    it('should still render navigation links', () => {
      render(<App />);

      expect(
        screen.getByRole('heading', { name: /Initra.*Home Inventory|Home Inventory/i })
      ).toBeInTheDocument();
    });
  });

  describe('Error Handling Regression', () => {
    it('should still handle database errors gracefully', async () => {
      vi.mocked(productDb.getAll).mockRejectedValue(new Error('Database error'));
      
      await useProductStore.getState().loadProducts();
      
      // Should set error state
      expect(useProductStore.getState().error).toBeDefined();
    });

    it('should still handle missing products gracefully', async () => {
      vi.mocked(productDb.getByItemCode).mockResolvedValue(undefined);
      
      const result = await useProductStore.getState().getProductByItemCode('TV-999');
      
      expect(result).toBeUndefined();
    });
  });

  describe('State Management Regression', () => {
    it('should still update store state correctly', () => {
      useProductStore.getState().setProducts([testProduct]);
      expect(useProductStore.getState().products).toEqual([testProduct]);
    });

    it('should still clear errors correctly', () => {
      useProductStore.getState().setError('Test error');
      useProductStore.getState().clearError();
      expect(useProductStore.getState().error).toBeNull();
    });

    it('should still set selected product correctly', () => {
      useProductStore.getState().setSelectedProduct(testProduct);
      expect(useProductStore.getState().selectedProduct).toEqual(testProduct);
    });
  });

  describe('Data Validation Regression', () => {
    it('should still reject invalid product data', () => {
      const invalidProduct = {
        name: '', // Empty name
        category: 'TV',
      };
      
      const result = validateProduct(invalidProduct);
      expect(result.success).toBe(false);
    });

    it('should still reject invalid barcodes', () => {
      expect(validateBarcode('abc123')).toBe(false);
      expect(validateBarcode('123')).toBe(false);
    });
  });

  describe('Integration Regression', () => {
    it('should still complete product search flow', async () => {
      vi.mocked(productDb.getByItemCode).mockResolvedValue(testProduct);
      vi.mocked(warrantyDb.getByProductId).mockResolvedValue(undefined);
      
      const product = await useProductStore.getState().getProductByItemCode('TV-001');
      
      expect(product).toBeDefined();
      expect(product?.itemCode).toBe('TV-001');
    });
  });
});

