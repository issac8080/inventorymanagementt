import { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react';
import { cn } from '@/utils/cn';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  as?: 'button' | 'span' | 'div';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      children,
      variant = 'primary',
      size = 'lg',
      fullWidth = false,
      className,
      as: Component = 'button',
      ...props
    },
    ref
  ) {
    const baseStyles = 'font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variants = {
      primary: 'bg-blue-700 text-white hover:bg-blue-800 focus:ring-blue-500',
      secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
      outline: 'border-2 border-blue-700 text-blue-700 hover:bg-blue-50 focus:ring-blue-500',
    };

    const sizes = {
      sm: 'px-4 py-2 text-base',
      md: 'px-6 py-3 text-lg',
      lg: 'px-8 py-4 text-xl min-h-touch',
    };

    const classes = cn(
      baseStyles,
      variants[variant],
      sizes[size],
      fullWidth && 'w-full',
      className
    );

    if (Component !== 'button') {
      return (
        <Component
          className={classes}
          ref={ref as any}
          {...(props as any)}
        >
          {children}
        </Component>
      );
    }

    return (
      <button
        ref={ref}
        className={classes}
        aria-label={props['aria-label'] || (typeof children === 'string' ? children : undefined)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

