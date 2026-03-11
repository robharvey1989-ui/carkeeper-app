import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner = ({ size = 'md', className }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
  };

  return (
    <div
      className={cn(
        'border-primary border-t-transparent rounded-full animate-spin',
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
};

interface LoadingStateProps {
  children?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export const LoadingState = ({ 
  children, 
  className, 
  size = 'md', 
  text = 'Loading...' 
}: LoadingStateProps) => {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 p-8', className)}>
      <LoadingSpinner size={size} />
      {text && (
        <p className="text-sm text-muted-foreground animate-pulse" aria-live="polite">
          {text}
        </p>
      )}
      {children}
    </div>
  );
};

export default LoadingState;