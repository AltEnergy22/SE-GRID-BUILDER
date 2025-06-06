import React from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LegendPopoverProps {
  className?: string;
}

export function LegendPopover({ className }: LegendPopoverProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center px-3 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        aria-label="Show legend"
      >
        <Info className="h-4 w-4 mr-2" />
        Legend
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Popover */}
          <div className="absolute top-full right-0 mt-2 w-80 bg-background border border-border rounded-md shadow-lg z-50 p-4">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-sm mb-3">Voltage Deviation (Buses)</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded bg-green-500" />
                    <span className="text-sm">≤ 2% deviation (Normal)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded bg-yellow-500" />
                    <span className="text-sm">≤ 5% deviation (Warning)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded bg-red-500" />
                    <span className="text-sm">&gt; 5% deviation (Critical)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded border-2 border-dashed border-gray-400 bg-gray-200" />
                    <span className="text-sm">Out of Service</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-sm mb-3">Line Loading (Branches)</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="h-2 bg-green-500 rounded" style={{ width: '60%' }} />
                    </div>
                    <span className="text-sm">≤ 50% loading (Normal)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="h-3 bg-yellow-500 rounded" style={{ width: '80%' }} />
                    </div>
                    <span className="text-sm">≤ 80% loading (Warning)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="h-4 bg-red-500 rounded" style={{ width: '100%' }} />
                    </div>
                    <span className="text-sm">&gt; 80% loading (Critical)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="h-2 bg-gray-400 rounded border-dashed border-2 border-gray-500" style={{ width: '50%' }} />
                    </div>
                    <span className="text-sm">Out of Service</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-sm mb-3">Interaction</h3>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div>• Click elements for details</div>
                  <div>• Use search to find elements</div>
                  <div>• Arrow keys to pan</div>
                  <div>• +/- or scroll to zoom</div>
                  <div>• F to fit view</div>
                  <div>• / to focus search</div>
                  <div>• ESC to close dialogs</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 