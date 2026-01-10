import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button - Component Unit Tests', () => {
  describe('Rendering', () => {
    it('should render button with text', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    it('should render with primary variant by default', () => {
      render(<Button>Test</Button>);
      const button = screen.getByText('Test');
      expect(button).toHaveClass('bg-blue-700');
    });

    it('should render with different variants', () => {
      const { rerender } = render(<Button variant="danger">Delete</Button>);
      expect(screen.getByText('Delete')).toHaveClass('bg-red-600');

      rerender(<Button variant="outline">Outline</Button>);
      expect(screen.getByText('Outline')).toHaveClass('border-2');
    });

    it('should render with different sizes', () => {
      const { rerender } = render(<Button size="sm">Small</Button>);
      expect(screen.getByText('Small')).toHaveClass('text-base');

      rerender(<Button size="lg">Large</Button>);
      expect(screen.getByText('Large')).toHaveClass('text-xl');
    });

    it('should render full width when fullWidth is true', () => {
      render(<Button fullWidth>Full Width</Button>);
      expect(screen.getByText('Full Width')).toHaveClass('w-full');
    });
  });

  describe('Functionality', () => {
    it('should call onClick when clicked', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      
      fireEvent.click(screen.getByText('Click me'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when disabled', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick} disabled>Disabled</Button>);
      
      fireEvent.click(screen.getByText('Disabled'));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByText('Disabled') as HTMLButtonElement;
      expect(button.disabled).toBe(true);
    });

    it('should have aria-label when provided', () => {
      render(<Button aria-label="Custom label">Button</Button>);
      expect(screen.getByLabelText('Custom label')).toBeInTheDocument();
    });

    it('should use children as aria-label when not provided', () => {
      render(<Button>Click me</Button>);
      const button = screen.getByText('Click me');
      expect(button).toHaveAttribute('aria-label', 'Click me');
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard accessible', () => {
      render(<Button>Accessible</Button>);
      const button = screen.getByText('Accessible');
      
      // Button should be focusable (buttons are naturally focusable, no tabIndex needed)
      button.focus();
      expect(document.activeElement).toBe(button);
      
      // Should handle keyboard events
      fireEvent.keyDown(button, { key: 'Enter' });
      fireEvent.keyDown(button, { key: ' ' });
    });

    it('should have focus styles', () => {
      render(<Button>Focusable</Button>);
      const button = screen.getByText('Focusable');
      expect(button).toHaveClass('focus:outline-none');
      expect(button).toHaveClass('focus:ring-2');
    });
  });

  describe('Custom Component', () => {
    it('should render as span when as="span"', () => {
      render(<Button as="span">Span Button</Button>);
      const element = screen.getByText('Span Button');
      expect(element.tagName).toBe('SPAN');
    });

    it('should render as div when as="div"', () => {
      render(<Button as="div">Div Button</Button>);
      const element = screen.getByText('Div Button');
      expect(element.tagName).toBe('DIV');
    });
  });
});

