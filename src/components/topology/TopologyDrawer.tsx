import { useState } from 'react';
import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, SignalIcon, CogIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { formatVoltageDeviation, formatPower, getBusTypeIcon, getBranchTypeIcon } from './topologyUtils';
import useSWR from 'swr';

interface TopologyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedElement: {
    id: string;
    type: 'bus' | 'branch';
    data: any;
  } | null;
  gridId: string;
}

interface TelemetryData {
  timestamp: string;
  measurements: Array<{
    type: string;
    value: number;
    unit: string;
    quality: 'good' | 'uncertain' | 'invalid';
  }>;
}

interface BreakersData {
  breakers: Array<{
    id: string;
    name: string;
    state: 'open' | 'closed';
    controllable: boolean;
  }>;
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch');
  return response.json();
};

export function TopologyDrawer({ isOpen, onClose, selectedElement, gridId }: TopologyDrawerProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'measurements' | 'controls'>('details');

  // Fetch live telemetry data
  const { data: telemetryData, error: telemetryError } = useSWR<TelemetryData>(
    selectedElement && activeTab === 'measurements' 
      ? `/api/grids/${gridId}/telemetry/${selectedElement.type}/${selectedElement.id}` 
      : null,
    fetcher,
    { 
      refreshInterval: 2000,
      revalidateOnFocus: false 
    }
  );

  // Fetch breaker data for controls
  const { data: breakersData, error: breakersError, mutate: mutateBreakers } = useSWR<BreakersData>(
    selectedElement && activeTab === 'controls' 
      ? `/api/grids/${gridId}/breakers/${selectedElement.type}/${selectedElement.id}` 
      : null,
    fetcher
  );

  const handleBreakerControl = async (breakerId: string, action: 'open' | 'close') => {
    try {
      const response = await fetch(`/api/grids/${gridId}/breakers/${breakerId}/${action}`, {
        method: 'POST',
      });
      
      if (response.ok) {
        mutateBreakers(); // Refresh breaker data
      } else {
        throw new Error(`Failed to ${action} breaker`);
      }
    } catch (error) {
      console.error(`Error ${action}ing breaker:`, error);
      // In real app, would show toast notification
    }
  };

  if (!selectedElement) return null;

  const { data, type } = selectedElement;

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                  <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-xl">
                    {/* Header */}
                    <div className="bg-gray-900 px-4 py-6 sm:px-6">
                      <div className="flex items-center justify-between">
                        <Dialog.Title className="text-lg font-medium text-white">
                          {type === 'bus' ? getBusTypeIcon(data.bus_type) : getBranchTypeIcon(data.type)} {data.name || selectedElement.id}
                        </Dialog.Title>
                        <div className="ml-3 flex h-7 items-center">
                          <button
                            type="button"
                            className="rounded-md bg-gray-900 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
                            onClick={onClose}
                          >
                            <span className="sr-only">Close panel</span>
                            <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Status */}
                      <div className="mt-1">
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          data.in_service 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {data.in_service ? 'In Service' : 'Out of Service'}
                        </div>
                      </div>
                    </div>

                    {/* Tabs */}
                    <div className="border-b border-gray-200">
                      <nav className="flex -mb-px">
                        {[
                          { id: 'details', label: 'Details', icon: InformationCircleIcon },
                          { id: 'measurements', label: 'Measurements', icon: SignalIcon },
                          { id: 'controls', label: 'Controls', icon: CogIcon },
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                              activeTab === tab.id
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            <tab.icon className="h-4 w-4" />
                            <span>{tab.label}</span>
                          </button>
                        ))}
                      </nav>
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 px-4 py-6 sm:px-6">
                      {/* Details Tab */}
                      {activeTab === 'details' && (
                        <div className="space-y-6">
                          <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                              {type === 'bus' ? 'Bus Details' : 'Branch Details'}
                            </h3>
                            
                            {type === 'bus' ? (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700">Bus ID</label>
                                    <div className="mt-1 text-sm text-gray-900">{data.id}</div>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700">Type</label>
                                    <div className="mt-1 text-sm text-gray-900 capitalize">{data.bus_type}</div>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700">Voltage (kV)</label>
                                    <div className="mt-1 text-sm text-gray-900">{data.voltage_kv?.toFixed(1) || 'N/A'}</div>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700">Voltage (p.u.)</label>
                                    <div className="mt-1 text-sm text-gray-900">{data.voltage_pu?.toFixed(3) || 'N/A'}</div>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700">Angle (deg)</label>
                                    <div className="mt-1 text-sm text-gray-900">{data.angle_deg?.toFixed(2) || 'N/A'}°</div>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700">Deviation</label>
                                    <div className="mt-1 text-sm text-gray-900">{formatVoltageDeviation(data.voltage_pu)}</div>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700">Active Power</label>
                                    <div className="mt-1 text-sm text-gray-900">{formatPower(data.p_mw)}</div>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700">Reactive Power</label>
                                    <div className="mt-1 text-sm text-gray-900">{data.q_mvar?.toFixed(1) || 'N/A'} MVar</div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700">Branch ID</label>
                                    <div className="mt-1 text-sm text-gray-900">{data.id}</div>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700">Type</label>
                                    <div className="mt-1 text-sm text-gray-900 capitalize">{data.type}</div>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700">From Bus</label>
                                    <div className="mt-1 text-sm text-gray-900">{data.from_bus}</div>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700">To Bus</label>
                                    <div className="mt-1 text-sm text-gray-900">{data.to_bus}</div>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700">Loading</label>
                                    <div className="mt-1 text-sm text-gray-900">{data.loading_percent?.toFixed(1) || 'N/A'}%</div>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700">Max Current</label>
                                    <div className="mt-1 text-sm text-gray-900">{data.max_i_ka?.toFixed(1) || 'N/A'} kA</div>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700">Power From</label>
                                    <div className="mt-1 text-sm text-gray-900">{formatPower(data.p_from_mw)}</div>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700">Power To</label>
                                    <div className="mt-1 text-sm text-gray-900">{formatPower(data.p_to_mw)}</div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Measurements Tab */}
                      {activeTab === 'measurements' && (
                        <div className="space-y-6">
                          <h3 className="text-lg font-medium text-gray-900">Live Measurements</h3>
                          
                          {telemetryError ? (
                            <div className="text-center py-8 text-gray-500">
                              <SignalIcon className="h-8 w-8 mx-auto mb-2" />
                              <p>No telemetry data available</p>
                            </div>
                          ) : !telemetryData ? (
                            <div className="text-center py-8">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                              <p className="text-gray-500">Loading measurements...</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="text-sm text-gray-500">
                                Last updated: {new Date(telemetryData.timestamp).toLocaleTimeString()}
                              </div>
                              
                              {telemetryData.measurements.map((measurement, index) => (
                                <div key={index} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0">
                                  <div>
                                    <div className="font-medium text-gray-900">{measurement.type}</div>
                                    <div className={`text-xs ${
                                      measurement.quality === 'good' ? 'text-green-600' : 
                                      measurement.quality === 'uncertain' ? 'text-yellow-600' : 'text-red-600'
                                    }`}>
                                      {measurement.quality}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-mono text-lg">{measurement.value.toFixed(2)}</div>
                                    <div className="text-sm text-gray-500">{measurement.unit}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Controls Tab */}
                      {activeTab === 'controls' && (
                        <div className="space-y-6">
                          <h3 className="text-lg font-medium text-gray-900">Breaker Controls</h3>
                          
                          {breakersError ? (
                            <div className="text-center py-8 text-gray-500">
                              <CogIcon className="h-8 w-8 mx-auto mb-2" />
                              <p>No controllable elements</p>
                            </div>
                          ) : !breakersData ? (
                            <div className="text-center py-8">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                              <p className="text-gray-500">Loading controls...</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {breakersData.breakers.map((breaker) => (
                                <div key={breaker.id} className="border border-gray-200 rounded-lg p-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <div>
                                      <div className="font-medium text-gray-900">{breaker.name}</div>
                                      <div className="text-sm text-gray-500">{breaker.id}</div>
                                    </div>
                                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      breaker.state === 'closed' 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                      {breaker.state}
                                    </div>
                                  </div>
                                  
                                  {breaker.controllable && (
                                    <div className="flex space-x-2">
                                      <button
                                        onClick={() => handleBreakerControl(breaker.id, 'open')}
                                        disabled={breaker.state === 'open'}
                                        className="flex-1 px-3 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        Open
                                      </button>
                                      <button
                                        onClick={() => handleBreakerControl(breaker.id, 'close')}
                                        disabled={breaker.state === 'closed'}
                                        className="flex-1 px-3 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        Close
                                      </button>
                                    </div>
                                  )}
                                  
                                  {!breaker.controllable && (
                                    <div className="text-sm text-gray-500 italic">
                                      Read-only
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
} 