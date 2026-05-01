import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({ 
  size = 'md', 
  text = 'Loading...',
  fullScreen = false 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <Loader2
        className={`${sizeClasses[size]} animate-spin text-blue-600 motion-reduce:animate-none motion-reduce:opacity-80`}
        aria-hidden
      />
      {text && <p className="text-base sm:text-lg text-gray-600 text-center font-medium">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/80 to-purple-50/70 px-6"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8" role="status" aria-live="polite" aria-busy="true">
      {content}
    </div>
  );
}

