import React from 'react';
import { Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FitViewButtonProps {
  onClick: () => void;
  className?: string;
}

export function FitViewButton({ onClick, className }: FitViewButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center px-3 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        className
      )}
      aria-label="Fit view to show all elements"
      title="Fit View (F)"
    >
      <Maximize2 className="h-4 w-4 mr-2" />
      Fit View
    </button>
  );
} 