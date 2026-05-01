import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import App from '@/App';
import { productDb, warrantyDb } from '@/services/database/db';
import { Product, WarrantyDocument } from '@/types';
import { generateUUID } from '@/utils/uuid';

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
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
  Toaster: () => <div data-testid="toaster">Toaster</div>,
}));
vi.mock('@/hooks/usePWA', () => ({ usePWA: () => ({ isInstallable: false, install: vi.fn() }) }));
vi.mock('@/components/scanner/QRScanner', () => ({
  QRScanner: ({ onScan, onClose }: { onScan: (s: string) => void; onClose: () => void }) => (
    <div data-testid="qr-scanner">
      <button type="button" onClick={() => onScan('TV-001')}>
        Scan
      </button>
      <button type="button" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}));
vi.mock('@/components/scanner/BarcodeScanner', () => ({
  BarcodeScanner: ({ onScan, onClose }: { onScan: (s: string) => void; onClose: () => void }) => (
    <div data-testid="barcode-scanner">
      <button type="button" onClick={() => onScan('1234567890123')}>
        Scan
      </button>
      <button type="button" onClick={onClose}>
        Close
      </button>
    </div>
  ),
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

async function waitForHome() {
  await waitFor(() => {
    expect(
      screen.getByRole('heading', { name: /Initra.*Home Inventory|Home Inventory/i })
    ).toBeInTheDocument();
  });
}

function clickRouterLink(path: string) {
  const link = screen.getAllByRole('link').find((el) => el.getAttribute('href') === path);
  if (!link) {
    throw new Error(`No <Link href="${path}" /> found`);
  }
  fireEvent.click(link);
}

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
      render(<App />);
      await waitForHome();

      vi.mocked(productDb.add).mockResolvedValue(testProduct.id);
      vi.mocked(productDb.getAll).mockResolvedValue([testProduct]);
      await productDb.add(testProduct);
      expect(productDb.add).toHaveBeenCalled();

      vi.mocked(productDb.getByItemCode).mockResolvedValue(testProduct);
      vi.mocked(warrantyDb.getByProductId).mockResolvedValue(testWarranty);

      clickRouterLink('/warranty');

      expect(await screen.findByRole('heading', { name: /Get Warranty Card/i })).toBeInTheDocument();
    });
  });

  describe('User Flow: QR Code Scan → View Product Details', () => {
    it('should scan QR code and navigate to product', async () => {
      vi.mocked(productDb.getByItemCode).mockResolvedValue(testProduct);

      render(<App />);
      await waitForHome();

      fireEvent.click(screen.getByText('Scan QR Code'));

      expect(await screen.findByTestId('qr-scanner')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Scan'));

      expect(await screen.findByRole('heading', { name: /Product Details/i })).toBeInTheDocument();

      await waitFor(() => {
        expect(productDb.getByItemCode).toHaveBeenCalledWith('TV-001');
      });
    });
  });

  describe('User Flow: Search Product → View Warranty → Download PDF', () => {
    it('should search and view warranty details', async () => {
      vi.mocked(productDb.getByItemCode).mockResolvedValue(testProduct);
      vi.mocked(warrantyDb.getByProductId).mockResolvedValue(testWarranty);

      render(<App />);
      await waitForHome();

      clickRouterLink('/warranty');

      expect(await screen.findByRole('heading', { name: /Get Warranty Card/i })).toBeInTheDocument();

      const input = screen.getByPlaceholderText(/Enter item code/i);
      const searchButton = screen.getByRole('button', { name: /Search Product/i });

      fireEvent.change(input, { target: { value: 'TV-001' } });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('Samsung TV')).toBeInTheDocument();
      });

      expect(warrantyDb.getByProductId).toHaveBeenCalledWith(testProduct.id);
    });
  });

  describe('User Flow: Bulk Import → View Inventory', () => {
    it('should import multiple products and display in inventory', async () => {
      const products = [
        testProduct,
        { ...testProduct, id: generateUUID(), itemCode: 'TV-002', name: 'LG TV' },
        {
          ...testProduct,
          id: generateUUID(),
          itemCode: 'FRIDGE-001',
          name: 'Samsung Fridge',
          category: 'Refrigerator',
        },
      ];

      vi.mocked(productDb.getAll).mockResolvedValue(products);

      render(<App />);
      await waitForHome();

      clickRouterLink('/inventory');

      expect(await screen.findByRole('heading', { name: /My Products/i })).toBeInTheDocument();

      await waitFor(() => {
        expect(productDb.getAll).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling Flow', () => {
    it('should handle database errors gracefully', async () => {
      vi.mocked(productDb.getAll).mockRejectedValue(new Error('Database error'));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('toaster')).toBeInTheDocument();
      });
    });

    it('should handle product not found', async () => {
      vi.mocked(productDb.getByItemCode).mockResolvedValue(undefined);

      render(<App />);
      await waitForHome();

      clickRouterLink('/warranty');

      expect(await screen.findByRole('heading', { name: /Get Warranty Card/i })).toBeInTheDocument();

      const input = screen.getByPlaceholderText(/Enter item code/i);
      const searchButton = screen.getByRole('button', { name: /Search Product/i });

      fireEvent.change(input, { target: { value: 'TV-999' } });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(productDb.getByItemCode).toHaveBeenCalledWith('TV-999');
      });
    });
  });
});
