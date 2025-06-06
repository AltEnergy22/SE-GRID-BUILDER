import React from 'react';
import { X, ExternalLink, Activity, Zap, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LiveData } from '@/utils/topologyUtils';

interface SelectedElement {
  id: string;
  type: 'node' | 'edge';
  data: any;
}

interface DetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  element: SelectedElement | null;
  liveData?: LiveData;
}

export function DetailsDrawer({ open, onOpenChange, element, liveData }: DetailsDrawerProps) {
  const [activeTab, setActiveTab] = React.useState<'live' | 'controls'>('live');

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [open, onOpenChange]);

  if (!open || !element) {
    return null;
  }

  const isNode = element.type === 'node';
  const elementData = element.data;

  const renderLiveTab = () => {
    if (isNode) {
      const vmPu = liveData?.vm_pu_by_bus[element.id] || elementData.vmPu || 1.0;
      const deviation = Math.abs(vmPu - 1.0) * 100;
      
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Voltage (p.u.)</div>
              <div className="text-2xl font-bold">{vmPu.toFixed(3)}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Deviation</div>
              <div className={cn(
                "text-2xl font-bold",
                deviation <= 2 ? "text-green-600" : deviation <= 5 ? "text-yellow-600" : "text-red-600"
              )}>
                {deviation.toFixed(1)}%
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Nominal kV</div>
              <div className="text-lg">{elementData.voltageKv} kV</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Bus Type</div>
              <div className="text-lg capitalize">{elementData.bus?.type || 'N/A'}</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">5-min Voltage Trend</div>
            <div className="h-16 bg-muted rounded flex items-center justify-center text-sm text-muted-foreground">
              Mini sparkline would go here
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Active Alarms</div>
            <div className="text-sm text-muted-foreground">No active alarms</div>
          </div>
        </div>
      );
    } else {
      // Edge/Branch data
      const loadingPercent = liveData?.loading_by_branch[element.id] || elementData.loadingPercent || 0;
      
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Loading</div>
              <div className={cn(
                "text-2xl font-bold",
                loadingPercent <= 50 ? "text-green-600" : loadingPercent <= 80 ? "text-yellow-600" : "text-red-600"
              )}>
                {loadingPercent.toFixed(1)}%
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Type</div>
              <div className="text-lg capitalize">{elementData.branch?.type || 'Line'}</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">From Bus</div>
              <div className="text-sm">{elementData.branch?.from_bus}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">To Bus</div>
              <div className="text-sm">{elementData.branch?.to_bus}</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">5-min Loading Trend</div>
            <div className="h-16 bg-muted rounded flex items-center justify-center text-sm text-muted-foreground">
              Mini sparkline would go here
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Status</div>
            <div className={cn(
              "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
              elementData.inService 
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
            )}>
              {elementData.inService ? 'In Service' : 'Out of Service'}
            </div>
          </div>
        </div>
      );
    }
  };

  const renderControlsTab = () => {
    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Control actions for this element would be shown here.
        </div>
        
        {!isNode && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Breaker Control</span>
              <button className="px-3 py-1 bg-primary text-primary-foreground rounded text-xs hover:bg-primary/90">
                {elementData.inService ? 'Open' : 'Close'}
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Maintenance Mode</span>
              <button className="px-3 py-1 bg-secondary text-secondary-foreground rounded text-xs hover:bg-secondary/90">
                Enable
              </button>
            </div>
          </div>
        )}
        
        <div className="pt-4 border-t">
          <button
            onClick={() => {
              const url = `/state-estimator?focus=${element.id}`;
              window.open(url, '_blank');
            }}
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            Go to SE Residuals
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Drawer */}
      <div
        className={cn(
          "fixed bg-background border-l z-50 transition-transform duration-300 ease-in-out",
          "md:right-0 md:top-0 md:h-full md:w-96",
          "max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:h-1/2 max-md:border-t max-md:border-l-0",
          open 
            ? "translate-x-0 translate-y-0" 
            : "md:translate-x-full max-md:translate-y-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              {isNode ? (
                <Zap className="h-5 w-5 text-primary" />
              ) : (
                <Activity className="h-5 w-5 text-primary" />
              )}
              <div>
                <h2 id="drawer-title" className="font-semibold">
                  {elementData.label || elementData.branch?.name || element.id}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {isNode ? 'Bus' : 'Branch'} Details
                </p>
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 hover:bg-accent rounded-md"
              aria-label="Close details"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('live')}
              className={cn(
                "flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === 'live'
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Activity className="h-4 w-4 inline mr-2" />
              Live
            </button>
            <button
              onClick={() => setActiveTab('controls')}
              className={cn(
                "flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === 'controls'
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Settings className="h-4 w-4 inline mr-2" />
              Controls
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 p-4 overflow-y-auto">
            {activeTab === 'live' ? renderLiveTab() : renderControlsTab()}
          </div>
        </div>
      </div>
    </>
  );
} 