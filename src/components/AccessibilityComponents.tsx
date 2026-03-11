import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

// Skip to content link for keyboard navigation
export const SkipToContent = () => (
  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium"
  >
    Skip to main content
  </a>
);

// Screen reader only text
interface ScreenReaderOnlyProps {
  children: React.ReactNode;
  as?: keyof JSX.IntrinsicElements;
}

export const ScreenReaderOnly = ({ children, as: Component = 'span' }: ScreenReaderOnlyProps) => (
  <Component className="sr-only">{children}</Component>
);

// Focus trap for modals and dialogs
interface FocusTrapProps {
  children: React.ReactNode;
  isActive?: boolean;
  className?: string;
}

export const FocusTrap = forwardRef<HTMLDivElement, FocusTrapProps>(
  ({ children, isActive = true, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(isActive && 'focus-within:outline-none', className)}
        tabIndex={isActive ? -1 : undefined}
        {...props}
      >
        {children}
      </div>
    );
  }
);

FocusTrap.displayName = 'FocusTrap';

// Accessible heading with proper hierarchy
interface AccessibleHeadingProps {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export const AccessibleHeading = ({ level, children, className, id }: AccessibleHeadingProps) => {
  const Component = `h${level}` as keyof JSX.IntrinsicElements;
  
  return (
    <Component
      id={id}
      className={cn(
        // Base heading styles with proper sizing
        {
          'text-4xl font-bold': level === 1,
          'text-3xl font-bold': level === 2,
          'text-2xl font-semibold': level === 3,
          'text-xl font-semibold': level === 4,
          'text-lg font-medium': level === 5,
          'text-base font-medium': level === 6,
        },
        'scroll-mt-20', // Offset for fixed headers
        className
      )}
      role="heading"
      aria-level={level}
    >
      {children}
    </Component>
  );
};

// Accessible button with proper states
interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  loadingText?: string;
}

export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({ 
    children, 
    variant = 'primary', 
    size = 'md', 
    isLoading = false, 
    loadingText = 'Loading...', 
    disabled,
    className,
    ...props 
  }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        aria-label={isLoading ? loadingText : undefined}
        className={cn(
          // Base button styles
          'inline-flex items-center justify-center rounded-md font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          
          // Variant styles
          {
            'bg-primary text-primary-foreground hover:bg-primary/90': variant === 'primary',
            'bg-secondary text-secondary-foreground hover:bg-secondary/80': variant === 'secondary',
            'hover:bg-accent hover:text-accent-foreground': variant === 'ghost',
            'bg-destructive text-destructive-foreground hover:bg-destructive/90': variant === 'destructive',
          },
          
          // Size styles
          {
            'h-9 px-3 text-sm': size === 'sm',
            'h-10 px-4 py-2': size === 'md',
            'h-11 px-8 text-lg': size === 'lg',
          },
          
          className
        )}
        {...props}
      >
        {isLoading && (
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  }
);

AccessibleButton.displayName = 'AccessibleButton';

export default {
  SkipToContent,
  ScreenReaderOnly,
  FocusTrap,
  AccessibleHeading,
  AccessibleButton,
};