import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Home from '../Home';
import * as usePWAHook from '@/hooks/usePWA';
import React from 'react';

// Mock hooks
vi.mock('@/hooks/usePWA', () => ({
  usePWA: vi.fn(),
}));

vi.mock('@/components/scanner/QRScanner', () => ({
  QRScanner: ({ onScan, onClose }: any) => (
    <div data-testid="qr-scanner">
      <button onClick={() => onScan('TV-001')}>Mock Scan</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('@/components/assistant/Chatbot', () => ({
  Chatbot: () => <div data-testid="chatbot">Chatbot</div>,
}));

// Mock useNavigate - must be hoisted to top level
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Home - Page Functional Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePWAHook.usePWA).mockReturnValue({
      isInstallable: false,
      install: vi.fn(),
    });
  });

  const renderHome = () => {
    return render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );
  };

  describe('Rendering', () => {
    it('should render home page with title', () => {
      renderHome();
      expect(screen.getByText('Home Inventory')).toBeInTheDocument();
    });

    it('should render all navigation cards', () => {
      renderHome();
      expect(screen.getByText('Get Warranty')).toBeInTheDocument();
      expect(screen.getByText('Add Product')).toBeInTheDocument();
      expect(screen.getByText('My Products')).toBeInTheDocument();
      expect(screen.getByText('Audit')).toBeInTheDocument();
      expect(screen.getByText('Print QR Codes')).toBeInTheDocument();
    });

    it('should render Quick Scan section', () => {
      renderHome();
      expect(screen.getByText('Quick Scan')).toBeInTheDocument();
      expect(screen.getByText('Scan QR Code')).toBeInTheDocument();
    });

    it('should render chatbot', () => {
      renderHome();
      expect(screen.getByTestId('chatbot')).toBeInTheDocument();
    });
  });

  describe('PWA Installation', () => {
    it('should show install button when app is installable', () => {
      vi.mocked(usePWAHook.usePWA).mockReturnValue({
        isInstallable: true,
        install: vi.fn(),
      });
      
      renderHome();
      expect(screen.getByText('Install this app for easier access')).toBeInTheDocument();
      expect(screen.getByText('Install App')).toBeInTheDocument();
    });

    it('should not show install button when app is not installable', () => {
      vi.mocked(usePWAHook.usePWA).mockReturnValue({
        isInstallable: false,
        install: vi.fn(),
      });
      
      renderHome();
      expect(screen.queryByText('Install this app')).not.toBeInTheDocument();
    });
  });

  describe('Navigation Links', () => {
    it('should have link to warranty page', () => {
      renderHome();
      const link = screen.getByLabelText('Get warranty card');
      expect(link).toHaveAttribute('href', '/warranty');
    });

    it('should have link to add product page', () => {
      renderHome();
      const link = screen.getByLabelText('Add new product');
      expect(link).toHaveAttribute('href', '/add');
    });

    it('should have link to inventory page', () => {
      renderHome();
      const link = screen.getByLabelText('View my products');
      expect(link).toHaveAttribute('href', '/inventory');
    });
  });

  describe('QR Scanner', () => {
    it('should open QR scanner when button is clicked', async () => {
      renderHome();
      const scanButton = screen.getByText('Scan QR Code');
      
      // Initially scanner should not be visible
      expect(screen.queryByTestId('qr-scanner')).not.toBeInTheDocument();
      
      // Click to open scanner
      scanButton.click();
      
      // Scanner should now be visible
      await waitFor(() => {
        expect(screen.getByTestId('qr-scanner')).toBeInTheDocument();
      });
    });
  });
});

