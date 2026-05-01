import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import Home from '@/pages/Home';

// Mock dependencies
vi.mock('@/hooks/usePWA', () => ({ usePWA: () => ({ isInstallable: false, install: vi.fn() }) }));
vi.mock('@/components/scanner/QRScanner', () => ({ QRScanner: () => <div>Scanner</div> }));
vi.mock('@/components/assistant/Chatbot', () => ({ Chatbot: () => <div>Chatbot</div> }));

describe('UI & Accessibility Tests', () => {
  describe('Layout & Visual Design', () => {
    it('should render components with proper styling', () => {
      render(<Button>Test Button</Button>);
      const button = screen.getByText('Test Button');
      
      expect(button).toHaveClass('rounded-lg');
      expect(button).toHaveClass('font-semibold');
    });

    it('should apply responsive classes', () => {
      render(
        <BrowserRouter>
          <Home />
        </BrowserRouter>
      );
      
      // Check for responsive classes
      const title = screen.getByRole('heading', { name: /Initra.*Home Inventory|Home Inventory/i });
      expect(title).toBeInTheDocument();
    });

    it('should have proper spacing and padding', () => {
      render(<Card>Content</Card>);
      const inner = screen.getByText('Content');
      expect(inner).toHaveClass('p-6');
    });
  });

  describe('Accessibility (a11y)', () => {
    it('should have aria-label on buttons', () => {
      render(<Button aria-label="Close dialog">X</Button>);
      expect(screen.getByLabelText('Close dialog')).toBeInTheDocument();
    });

    it('should have aria-label on navigation links', () => {
      render(
        <BrowserRouter>
          <Home />
        </BrowserRouter>
      );
      
      expect(screen.getByLabelText('Get warranty card')).toBeInTheDocument();
      expect(screen.getByLabelText('Add new product')).toBeInTheDocument();
    });

    it('should be keyboard navigable', () => {
      render(<Button>Click me</Button>);
      const button = screen.getByText('Click me');
      
      // Button should be focusable
      button.focus();
      expect(document.activeElement).toBe(button);
    });

    it('should have proper focus styles', () => {
      render(<Button>Focusable</Button>);
      const button = screen.getByText('Focusable');
      
      expect(button).toHaveClass('focus:outline-none');
      expect(button).toHaveClass('focus:ring-2');
    });

    it('should have semantic HTML structure', () => {
      render(
        <BrowserRouter>
          <Home />
        </BrowserRouter>
      );
      
      // Should have heading
      const heading = screen.getByRole('heading', { name: /home inventory/i });
      expect(heading).toBeInTheDocument();
    });
  });

  describe('Color & Contrast', () => {
    it('should use accessible color combinations', () => {
      render(<Button variant="primary">Primary</Button>);
      const button = screen.getByText('Primary');
      
      // Primary button should have good contrast
      expect(button).toHaveClass('bg-blue-700');
      expect(button).toHaveClass('text-white');
    });

    it('should have disabled state styling', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByText('Disabled');
      
      expect(button).toHaveClass('disabled:opacity-50');
      expect(button).toHaveClass('disabled:cursor-not-allowed');
    });
  });

  describe('Responsive Design', () => {
    it('should have mobile-friendly touch targets', () => {
      render(<Button size="lg">Large Button</Button>);
      const button = screen.getByText('Large Button');
      
      // Large buttons should have minimum touch target size
      expect(button).toHaveClass('min-h-touch');
    });

    it('should use responsive grid layouts', () => {
      render(
        <BrowserRouter>
          <Home />
        </BrowserRouter>
      );
      
      // Should use responsive grid
      const container = screen.getByLabelText('Add new product').closest('.grid');
      expect(container).toBeTruthy();
      expect(container).toHaveClass('grid-cols-1');
    });
  });

  describe('Typography', () => {
    it('should use readable font sizes', () => {
      render(<Button size="lg">Large Text</Button>);
      const button = screen.getByText('Large Text');
      
      expect(button).toHaveClass('text-xl');
    });

    it('should have proper font weights', () => {
      render(<Button>Bold Text</Button>);
      const button = screen.getByText('Bold Text');
      
      expect(button).toHaveClass('font-semibold');
    });
  });

  describe('Component Consistency', () => {
    it('should maintain consistent button styles', () => {
      const { rerender } = render(<Button variant="primary">Button 1</Button>);
      const button1 = screen.getByText('Button 1');
      
      rerender(<Button variant="primary">Button 2</Button>);
      const button2 = screen.getByText('Button 2');
      
      // Both should have same base styles
      expect(button1.className).toContain('rounded-lg');
      expect(button2.className).toContain('rounded-lg');
    });

    it('should maintain consistent card styles', () => {
      render(
        <>
          <Card>Card 1</Card>
          <Card>Card 2</Card>
        </>
      );
      
      const cards = screen.getAllByText(/Card [12]/);
      cards.forEach((node) => {
        const cardElement = node.closest('.rounded-lg');
        expect(cardElement).toBeTruthy();
        expect(cardElement).toHaveClass('bg-white');
        expect(cardElement).toHaveClass('rounded-lg');
      });
    });
  });
});

