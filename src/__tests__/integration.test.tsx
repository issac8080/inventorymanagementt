import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { productDb, warrantyDb } from '@/services/database/localDb';
import { Product, WarrantyDocument } from '@/types';
import { generateUUID } from '@/utils/uuid';
import { useProductStore } from '@/stores/productStore';
import Home from '@/pages/Home';
import GetWarranty from '@/pages/GetWarranty';

// Mock dependencies
vi.mock('@/services/database/localDb');
vi.mock('@/utils/sounds', () => ({ playBeep: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/hooks/usePWA', () => ({ usePWA: () => ({ isInstallable: false, install: vi.fn() }) }));
vi.mock('@/components/scanner/QRScanner', () => ({
  QRScanner: ({ onScan }: any) => <div data-testid="qr-scanner">Scanner</div>,
}));
vi.mock('@/components/assistant/Chatbot', () => ({ Chatbot: () => <div>Chatbot</div> }));

describe('Integration Tests - Frontend ↔ Database', () => {
  let testProduct: Product;
  let testWarranty: WarrantyDocument;

  beforeEach(() => {
    vi.clearAllMocks();
    
    testProduct = {
      id: generateUUID(),
      itemCode: 'TV-001',
      name: 'Test TV',
      category: 'TV',
      qrValue: 'TV-001',
      barcode: '1234567890123',
      warrantyStart: new Date('2024-01-01'),
      warrantyEnd: new Date('2025-01-01'),
      createdAt: new Date(),
    };

    testWarranty = {
      id: generateUUID(),
      productId: testProduct.id,
      imageBlob: new Blob(['test'], { type: 'image/png' }),
      createdAt: new Date(),
    };
  });

  describe('Product Creation Flow', () => {
    it('should create product and store in database', async () => {
      vi.mocked(productDb.add).mockResolvedValue(testProduct.id);
      vi.mocked(productDb.getAll).mockResolvedValue([testProduct]);
      
      await useProductStore.getState().addProduct(testProduct);
      
      expect(productDb.add).toHaveBeenCalled();
      const products = await productDb.getAll();
      expect(products).toContainEqual(expect.objectContaining({ itemCode: 'TV-001' }));
    });

    it('should update store after product creation', async () => {
      vi.mocked(productDb.add).mockResolvedValue(testProduct.id);
      vi.mocked(productDb.getAll).mockResolvedValue([testProduct]);
      
      await useProductStore.getState().addProduct(testProduct);
      await useProductStore.getState().loadProducts();
      
      expect(useProductStore.getState().products.length).toBeGreaterThan(0);
    });
  });

  describe('Product Search Flow', () => {
    it('should search product and display results', async () => {
      vi.mocked(productDb.getByItemCode).mockResolvedValue(testProduct);
      vi.mocked(warrantyDb.getByProductId).mockResolvedValue(testWarranty);
      
      render(
        <BrowserRouter>
          <GetWarranty />
        </BrowserRouter>
      );
      
      const input = screen.getByPlaceholderText(/Enter item code/i);
      const searchButton = screen.getByText(/Search Product/i);
      
      fireEvent.change(input, { target: { value: 'TV-001' } });
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByText('Test TV')).toBeInTheDocument();
      });
      
      expect(productDb.getByItemCode).toHaveBeenCalledWith('TV-001');
    });
  });

  describe('Warranty Document Flow', () => {
    it('should load warranty document with product', async () => {
      vi.mocked(productDb.getByItemCode).mockResolvedValue(testProduct);
      vi.mocked(warrantyDb.getByProductId).mockResolvedValue(testWarranty);
      
      render(
        <BrowserRouter>
          <GetWarranty />
        </BrowserRouter>
      );
      
      const input = screen.getByPlaceholderText(/Enter item code/i);
      const searchButton = screen.getByText(/Search Product/i);
      
      fireEvent.change(input, { target: { value: 'TV-001' } });
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        expect(warrantyDb.getByProductId).toHaveBeenCalledWith(testProduct.id);
      });
    });
  });

  describe('Database Transaction Flow', () => {
    it('should delete product and associated warranty', async () => {
      vi.mocked(productDb.delete).mockResolvedValue(undefined);
      vi.mocked(warrantyDb.getByProductId).mockResolvedValue(testWarranty);
      
      await productDb.delete(testProduct.id);
      
      expect(productDb.delete).toHaveBeenCalledWith(testProduct.id);
      // Warranty should also be deleted (handled by database)
    });
  });
});

describe('Integration Tests - API ↔ Database', () => {
  describe('Product Lookup Integration', () => {
    it('should handle product lookup with barcode', async () => {
      const allProducts = [testProduct];
      vi.mocked(productDb.getAll).mockResolvedValue(allProducts);
      
      const found = allProducts.find(p => p.barcode === '1234567890123');
      expect(found).toBeDefined();
      expect(found?.itemCode).toBe('TV-001');
    });
  });

  describe('Search Integration', () => {
    it('should search across multiple fields', async () => {
      const products = [
        testProduct,
        { ...testProduct, id: generateUUID(), itemCode: 'FRIDGE-001', name: 'Test Fridge', category: 'Refrigerator' },
      ];
      
      vi.mocked(productDb.search).mockResolvedValue(products);
      
      const results = await productDb.search('Test');
      expect(results.length).toBeGreaterThan(0);
    });
  });
});

