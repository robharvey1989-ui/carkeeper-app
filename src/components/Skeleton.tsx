import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      role="presentation"
      aria-hidden="true"
      {...props}
    />
  );
}

// Pre-built skeleton components for common use cases
export const CardSkeleton = ({ className }: { className?: string }) => (
  <div className={cn('space-y-3', className)}>
    <Skeleton className="h-4 w-[250px]" />
    <Skeleton className="h-4 w-[200px]" />
    <Skeleton className="h-4 w-[150px]" />
  </div>
);

export const ImageSkeleton = ({ className }: { className?: string }) => (
  <Skeleton className={cn('aspect-video w-full', className)} />
);

export const TextSkeleton = ({ lines = 3, className }: { lines?: number; className?: string }) => (
  <div className={cn('space-y-2', className)}>
    {Array.from({ length: lines }, (_, i) => (
      <Skeleton
        key={i}
        className={cn(
          'h-4',
          i === lines - 1 ? 'w-[60%]' : 'w-full'
        )}
      />
    ))}
  </div>
);

export const ButtonSkeleton = ({ className }: { className?: string }) => (
  <Skeleton className={cn('h-10 w-24', className)} />
);

export default Skeleton;