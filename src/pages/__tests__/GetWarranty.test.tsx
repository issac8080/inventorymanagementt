import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';
import GetWarranty from '../GetWarranty';
import { productDb, warrantyDb } from '@/services/database/localDb';
import { Product, WarrantyDocument } from '@/types';
import { generateUUID } from '@/utils/uuid';

// Mock database
vi.mock('@/services/database/localDb');
vi.mock('@/utils/sounds', () => ({
  playBeep: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));
vi.mock('jspdf', () => ({
  default: vi.fn().mockImplementation(() => ({
    setFillColor: vi.fn(),
    rect: vi.fn(),
    setTextColor: vi.fn(),
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    text: vi.fn(),
    setDrawColor: vi.fn(),
    setLineWidth: vi.fn(),
    line: vi.fn(),
    splitTextToSize: vi.fn((text) => [text]),
    addPage: vi.fn(),
    addImage: vi.fn(),
    save: vi.fn(),
  })),
}));

describe('GetWarranty - Page Functional Tests', () => {
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
      createdAt: new Date(),
    };

    testWarranty = {
      id: generateUUID(),
      productId: testProduct.id,
      imageBlob: new Blob(['test'], { type: 'image/png' }),
      createdAt: new Date(),
    };

    vi.mocked(productDb.getByItemCode).mockResolvedValue(undefined);
    vi.mocked(productDb.getAll).mockResolvedValue([]);
    vi.mocked(warrantyDb.getByProductId).mockResolvedValue(undefined);
  });

  const renderGetWarranty = () => {
    return render(
      <BrowserRouter>
        <GetWarranty />
      </BrowserRouter>
    );
  };

  describe('Search Functionality', () => {
    it('should render search section', () => {
      renderGetWarranty();
      expect(screen.getByText('Get Warranty Card')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Enter item code/i)).toBeInTheDocument();
    });

    it('should search by item code', async () => {
      vi.mocked(productDb.getByItemCode).mockResolvedValue(testProduct);
      
      renderGetWarranty();
      const input = screen.getByPlaceholderText(/Enter item code/i);
      const searchButton = screen.getByRole('button', { name: /🔍 Search Product/i });
      
      fireEvent.change(input, { target: { value: 'TV-001' } });
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByText('Test TV')).toBeInTheDocument();
      });
    });

    it('should show error when product not found', async () => {
      vi.mocked(productDb.getByItemCode).mockResolvedValue(undefined);
      
      renderGetWarranty();
      const input = screen.getByPlaceholderText(/Enter item code/i);
      const searchButton = screen.getByRole('button', { name: /🔍 Search Product/i });
      
      fireEvent.change(input, { target: { value: 'TV-999' } });
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Test TV')).not.toBeInTheDocument();
      });
    });

    it('should switch search methods', () => {
      renderGetWarranty();
      
      const barcodeButton = screen.getByText('Barcode');
      fireEvent.click(barcodeButton);
      
      expect(screen.getByPlaceholderText(/Enter barcode/i)).toBeInTheDocument();
    });
  });

  describe('Product Display', () => {
    it('should display product details when found', async () => {
      vi.mocked(productDb.getByItemCode).mockResolvedValue(testProduct);
      
      renderGetWarranty();
      const input = screen.getByPlaceholderText(/Enter item code/i);
      const searchButton = screen.getByRole('button', { name: /🔍 Search Product/i });
      
      fireEvent.change(input, { target: { value: 'TV-001' } });
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByText('TV-001')).toBeInTheDocument();
        expect(screen.getByText('Test TV')).toBeInTheDocument();
      });
    });

    it('should display warranty status', async () => {
      const productWithWarranty = {
        ...testProduct,
        warrantyStart: new Date('2024-01-01'),
        warrantyEnd: new Date('2025-01-01'),
      };
      
      vi.mocked(productDb.getByItemCode).mockResolvedValue(productWithWarranty);
      
      renderGetWarranty();
      const input = screen.getByPlaceholderText(/Enter item code/i);
      const searchButton = screen.getByRole('button', { name: /🔍 Search Product/i });
      
      fireEvent.change(input, { target: { value: 'TV-001' } });
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Status:/i)).toBeInTheDocument();
      });
    });
  });

  describe('Warranty Document', () => {
    it('should display warranty image when available', async () => {
      vi.mocked(productDb.getByItemCode).mockResolvedValue(testProduct);
      vi.mocked(warrantyDb.getByProductId).mockResolvedValue(testWarranty);
      
      renderGetWarranty();
      const input = screen.getByPlaceholderText(/Enter item code/i);
      const searchButton = screen.getByRole('button', { name: /🔍 Search Product/i });
      
      fireEvent.change(input, { target: { value: 'TV-001' } });
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Warranty Card Image/i)).toBeInTheDocument();
      });
    });
  });
});

