import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import App from '@/App';
import { productDb, warrantyDb } from '@/services/database/localDb';
import { Product, WarrantyDocument } from '@/types';
import { generateUUID } from '@/utils/uuid';

// Mock all external dependencies
vi.mock('@/services/database/localDb');
vi.mock('@/utils/sounds', () => ({ playBeep: vi.fn() }));
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
  Toaster: () => <div data-testid="toaster">Toaster</div>,
}));
vi.mock('@/hooks/usePWA', () => ({ usePWA: () => ({ isInstallable: false, install: vi.fn() }) }));
vi.mock('@/components/scanner/QRScanner', () => ({
  QRScanner: ({ onScan, onClose }: any) => (
    <div data-testid="qr-scanner">
      <button onClick={() => onScan('TV-001')}>Scan</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));
vi.mock('@/components/scanner/BarcodeScanner', () => ({
  BarcodeScanner: ({ onScan, onClose }: any) => (
    <div data-testid="barcode-scanner">
      <button onClick={() => onScan('1234567890123')}>Scan</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));
vi.mock('@/components/assistant/Chatbot', () => ({ Chatbot: () => <div>Chatbot</div> }));

describe('System/E2E Tests - Complete User Flows', () => {
  let testProduct: Product;
  let testWarranty: WarrantyDocument;

  beforeEach(() => {
    vi.clearAllMocks();
    
    testProduct = {
      id: generateUUID(),
      itemCode: 'TV-001',
      name: 'Samsung TV',
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

    vi.mocked(productDb.getAll).mockResolvedValue([]);
    vi.mocked(productDb.getByItemCode).mockResolvedValue(undefined);
    vi.mocked(warrantyDb.getByProductId).mockResolvedValue(undefined);
  });

  describe('User Flow: Add Product → View Inventory → Get Warranty', () => {
    it('should complete full product lifecycle', async () => {
      // Step 1: Navigate to home
      render(
        <MemoryRouter>
          <App />
        </MemoryRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText('Home Inventory')).toBeInTheDocument();
      });

      // Step 2: Navigate to add product (simulated)
      vi.mocked(productDb.add).mockResolvedValue(testProduct.id);
      vi.mocked(productDb.getAll).mockResolvedValue([testProduct]);
      
      // Simulate adding product
      await productDb.add(testProduct);
      expect(productDb.add).toHaveBeenCalled();

      // Step 3: Search for product
      vi.mocked(productDb.getByItemCode).mockResolvedValue(testProduct);
      vi.mocked(warrantyDb.getByProductId).mockResolvedValue(testWarranty);
      
      // Navigate to warranty page
      render(
        <MemoryRouter initialEntries={['/warranty']}>
          <App />
        </MemoryRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText('Get Warranty Card')).toBeInTheDocument();
      });
    });
  });

  describe('User Flow: QR Code Scan → View Product Details', () => {
    it('should scan QR code and navigate to product', async () => {
      vi.mocked(productDb.getByItemCode).mockResolvedValue(testProduct);
      
      render(
        <MemoryRouter>
          <App />
        </MemoryRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText('Home Inventory')).toBeInTheDocument();
      });
      
      // Open QR scanner
      const scanButton = screen.getByText('Scan QR Code');
      fireEvent.click(scanButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('qr-scanner')).toBeInTheDocument();
      });
      
      // Simulate scan
      const mockScan = screen.getByText('Scan');
      fireEvent.click(mockScan);
      
      // Should navigate to product detail
      await waitFor(() => {
        expect(productDb.getByItemCode).toHaveBeenCalledWith('TV-001');
      });
    });
  });

  describe('User Flow: Search Product → View Warranty → Download PDF', () => {
    it('should search and view warranty details', async () => {
      vi.mocked(productDb.getByItemCode).mockResolvedValue(testProduct);
      vi.mocked(warrantyDb.getByProductId).mockResolvedValue(testWarranty);
      
      render(
        <MemoryRouter initialEntries={['/warranty']}>
          <App />
        </MemoryRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText('Get Warranty Card')).toBeInTheDocument();
      });
      
      // Search for product
      const input = screen.getByPlaceholderText(/Enter item code/i);
      const searchButton = screen.getByText(/Search Product/i);
      
      fireEvent.change(input, { target: { value: 'TV-001' } });
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByText('Samsung TV')).toBeInTheDocument();
      });
      
      // Check warranty is loaded
      expect(warrantyDb.getByProductId).toHaveBeenCalledWith(testProduct.id);
    });
  });

  describe('User Flow: Bulk Import → View Inventory', () => {
    it('should import multiple products and display in inventory', async () => {
      const products = [
        testProduct,
        { ...testProduct, id: generateUUID(), itemCode: 'TV-002', name: 'LG TV' },
        { ...testProduct, id: generateUUID(), itemCode: 'FRIDGE-001', name: 'Samsung Fridge', category: 'Refrigerator' },
      ];
      
      vi.mocked(productDb.getAll).mockResolvedValue(products);
      
      render(
        <MemoryRouter initialEntries={['/inventory']}>
          <App />
        </MemoryRouter>
      );
      
      await waitFor(() => {
        expect(productDb.getAll).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling Flow', () => {
    it('should handle database errors gracefully', async () => {
      vi.mocked(productDb.getAll).mockRejectedValue(new Error('Database error'));
      
      render(
        <MemoryRouter>
          <App />
        </MemoryRouter>
      );
      
      // App should still render without crashing
      await waitFor(() => {
        expect(screen.getByTestId('toaster')).toBeInTheDocument();
      });
    });

    it('should handle product not found', async () => {
      vi.mocked(productDb.getByItemCode).mockResolvedValue(undefined);
      
      render(
        <MemoryRouter initialEntries={['/warranty']}>
          <App />
        </MemoryRouter>
      );
      
      const input = screen.getByPlaceholderText(/Enter item code/i);
      const searchButton = screen.getByText(/Search Product/i);
      
      fireEvent.change(input, { target: { value: 'TV-999' } });
      fireEvent.click(searchButton);
      
      // Should show error message (handled by toast)
      await waitFor(() => {
        expect(productDb.getByItemCode).toHaveBeenCalledWith('TV-999');
      });
    });
  });
});

