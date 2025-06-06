import { useState } from 'react';
import { PlayIcon, ArrowPathIcon, CogIcon } from '@heroicons/react/24/outline';
import { Scenario, Generator, OutageItem } from '@/hooks/useWhatIf';

interface ScenarioPanelProps {
  scenario: Scenario;
  onUpdateScenario: (updates: Partial<Scenario>) => void;
  onApplyScenario: () => Promise<void>;
  onResetScenario: () => void;
  isLoading: boolean;
  gridId: string;
}

export function ScenarioPanel({
  scenario,
  onUpdateScenario,
  onApplyScenario,
  onResetScenario,
  isLoading,
}: ScenarioPanelProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'generators' | 'outages'>('general');

  const handleGeneratorUpdate = (genId: string, updates: Partial<Generator>) => {
    const updatedGenerators = scenario.generators.map(gen =>
      gen.id === genId ? { ...gen, ...updates } : gen
    );
    onUpdateScenario({ generators: updatedGenerators });
  };

  const handleOutageToggle = (outageId: string) => {
    const updatedOutages = scenario.outages.map(outage =>
      outage.id === outageId ? { ...outage, is_selected: !outage.is_selected } : outage
    );
    onUpdateScenario({ outages: updatedOutages });
  };

  const selectedOutagesCount = scenario.outages.filter(o => o.is_selected).length;

  return (
    <div className="bg-white rounded-lg border border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Scenario Builder</h2>
        <p className="text-sm text-gray-500 mt-1">Configure what-if parameters</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          {[
            { id: 'general', label: 'General' },
            { id: 'generators', label: 'Generators', badge: scenario.generators.length },
            { id: 'outages', label: 'Outages', badge: selectedOutagesCount > 0 ? selectedOutagesCount : undefined },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.badge !== undefined && (
                <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  activeTab === tab.id ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            {/* Scenario Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scenario Name
              </label>
              <input
                type="text"
                value={scenario.name}
                onChange={(e) => onUpdateScenario({ name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter scenario name"
              />
            </div>

            {/* Preset Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Base Preset
              </label>
              <select
                value={scenario.preset}
                onChange={(e) => onUpdateScenario({ preset: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="current">Current State</option>
                <option value="peak_load">Peak Load</option>
                <option value="min_load">Minimum Load</option>
                <option value="maintenance">Maintenance Mode</option>
              </select>
            </div>

            {/* Load Scale Slider */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Load Scale Factor
                <span className="ml-2 text-blue-600 font-mono">
                  {(scenario.load_scale * 100).toFixed(0)}%
                </span>
              </label>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                value={scenario.load_scale}
                onChange={(e) => onUpdateScenario({ load_scale: parseFloat(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>50%</span>
                <span>100%</span>
                <span>150%</span>
              </div>
            </div>

            {/* Load Scale Description */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-1">Load Scale Impact</h4>
              <p className="text-sm text-blue-700">
                {scenario.load_scale < 1.0 
                  ? `Reducing system load by ${((1 - scenario.load_scale) * 100).toFixed(0)}%`
                  : scenario.load_scale > 1.0
                  ? `Increasing system load by ${((scenario.load_scale - 1) * 100).toFixed(0)}%`
                  : 'Using current system load levels'
                }
              </p>
            </div>
          </div>
        )}

        {/* Generators Tab */}
        {activeTab === 'generators' && (
          <div className="space-y-4">
            <div className="text-sm text-gray-600 mb-4">
              Adjust generator dispatch for the scenario
            </div>
            
            {scenario.generators.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CogIcon className="w-8 h-8 mx-auto mb-2" />
                <p>No generators available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {scenario.generators.map((generator) => (
                  <div key={generator.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">{generator.name}</h4>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={generator.is_online}
                          onChange={(e) => handleGeneratorUpdate(generator.id, { is_online: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-600">Online</span>
                      </label>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Output: {generator.current_mw.toFixed(1)} MW
                      </label>
                      <input
                        type="range"
                        min={generator.min_mw}
                        max={generator.max_mw}
                        step="0.1"
                        value={generator.current_mw}
                        onChange={(e) => handleGeneratorUpdate(generator.id, { current_mw: parseFloat(e.target.value) })}
                        disabled={!generator.is_online}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{generator.min_mw} MW</span>
                        <span>{generator.max_mw} MW</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Outages Tab */}
        {activeTab === 'outages' && (
          <div className="space-y-4">
            <div className="text-sm text-gray-600 mb-4">
              Select elements to be out of service in the scenario
            </div>
            
            {scenario.outages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CogIcon className="w-8 h-8 mx-auto mb-2" />
                <p>No outage options available</p>
              </div>
            ) : (
              <div className="space-y-1">
                {['line', 'transformer', 'generator'].map(type => {
                  const items = scenario.outages.filter(o => o.type === type);
                  if (items.length === 0) return null;
                  
                  return (
                    <div key={type} className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-2 capitalize">
                        {type}s ({items.filter(i => i.is_selected).length} selected)
                      </h4>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {items.map((outage) => (
                          <label
                            key={outage.id}
                            className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={outage.is_selected}
                              onChange={() => handleOutageToggle(outage.id)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-3 text-sm text-gray-700">{outage.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-6 py-4 border-t border-gray-200">
        <div className="flex space-x-3">
          <button
            onClick={onApplyScenario}
            disabled={isLoading}
            className={`flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-colors ${
              isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }`}
          >
            {isLoading ? (
              <>
                <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <PlayIcon className="w-4 h-4 mr-2" />
                Apply Scenario
              </>
            )}
          </button>
          
          <button
            onClick={onResetScenario}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
} 