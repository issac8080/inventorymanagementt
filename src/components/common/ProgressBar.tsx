import { cn } from '@/utils/cn';

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  showPercentage?: boolean;
  className?: string;
}

/**
 * Progress bar component for showing operation progress
 */
export function ProgressBar({
  value,
  max,
  label,
  showPercentage = true,
  className,
}: ProgressBarProps) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-lg font-semibold text-gray-700">{label}</span>
          {showPercentage && (
            <span className="text-lg font-bold text-blue-600">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300 ease-out rounded-full"
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={label || 'Progress'}
        />
      </div>
      {!label && showPercentage && (
        <div className="text-center mt-1 text-sm text-gray-600">
          {value} / {max}
        </div>
      )}
    </div>
  );
}

