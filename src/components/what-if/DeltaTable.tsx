import { useMemo, useState } from 'react';
import { PowerFlowResult } from '@/hooks/useWhatIf';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';

interface DeltaTableProps {
  baseCase: PowerFlowResult;
  scenarioResult: PowerFlowResult;
}

interface DeltaRow {
  id: string;
  type: 'bus' | 'branch';
  name: string;
  base_value: number;
  scenario_value: number;
  delta: number;
  delta_percent: number;
  unit: string;
  category: string;
}

type SortField = 'name' | 'base_value' | 'scenario_value' | 'delta' | 'delta_percent';
type SortDirection = 'asc' | 'desc';

export function DeltaTable({ baseCase, scenarioResult }: DeltaTableProps) {
  const [filter, setFilter] = useState<'all' | 'buses' | 'branches'>('all');
  const [sortField, setSortField] = useState<SortField>('delta_percent');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const deltaData = useMemo(() => {
    const rows: DeltaRow[] = [];

    // Bus voltage comparisons
    baseCase.buses.forEach((baseBus) => {
      const scenarioBus = scenarioResult.buses.find(b => b.id === baseBus.id);
      if (!scenarioBus) return;

      const delta = scenarioBus.voltage_pu - baseBus.voltage_pu;
      const deltaPercent = (delta / baseBus.voltage_pu) * 100;

      rows.push({
        id: `bus-${baseBus.id}`,
        type: 'bus',
        name: baseBus.name || `Bus ${baseBus.id}`,
        base_value: baseBus.voltage_pu,
        scenario_value: scenarioBus.voltage_pu,
        delta,
        delta_percent: deltaPercent,
        unit: 'p.u.',
        category: 'Voltage',
      });
    });

    // Branch power flow comparisons  
    baseCase.branches.forEach((baseBranch) => {
      const scenarioBranch = scenarioResult.branches.find(b => b.id === baseBranch.id);
      if (!scenarioBranch) return;

      const delta = scenarioBranch.p_from_mw - baseBranch.p_from_mw;
      const deltaPercent = baseBranch.p_from_mw !== 0 
        ? (delta / Math.abs(baseBranch.p_from_mw)) * 100 
        : 0;

      rows.push({
        id: `branch-${baseBranch.id}`,
        type: 'branch',
        name: `Line ${baseBranch.from_bus}-${baseBranch.to_bus}`,
        base_value: baseBranch.p_from_mw,
        scenario_value: scenarioBranch.p_from_mw,
        delta,
        delta_percent: deltaPercent,
        unit: 'MW',
        category: 'Power Flow',
      });
    });

    return rows;
  }, [baseCase, scenarioResult]);

  const filteredAndSortedData = useMemo(() => {
    let filtered = deltaData;

    // Apply filter
    if (filter === 'buses') {
      filtered = filtered.filter(row => row.type === 'bus');
    } else if (filter === 'branches') {
      filtered = filtered.filter(row => row.type === 'branch');
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: number | string = a[sortField];
      let bValue: number | string = b[sortField];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return filtered;
  }, [deltaData, filter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ArrowUpIcon className="w-4 h-4 ml-1" />
    ) : (
      <ArrowDownIcon className="w-4 h-4 ml-1" />
    );
  };

  const getDeltaColor = (deltaPercent: number) => {
    const abs = Math.abs(deltaPercent);
    if (abs < 0.1) return 'text-gray-600';
    if (abs < 1) return 'text-green-600';
    if (abs < 3) return 'text-amber-600';
    if (abs < 5) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="h-full flex flex-col">
      {/* Filters */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            {[
              { key: 'all', label: 'All Elements', count: deltaData.length },
              { key: 'buses', label: 'Buses', count: deltaData.filter(r => r.type === 'bus').length },
              { key: 'branches', label: 'Branches', count: deltaData.filter(r => r.type === 'branch').length },
            ].map((option) => (
              <button
                key={option.key}
                onClick={() => setFilter(option.key as any)}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  filter === option.key
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 border border-transparent'
                }`}
              >
                {option.label}
                <span className="ml-2 text-xs font-normal">({option.count})</span>
              </button>
            ))}
          </div>
          
          <div className="text-sm text-gray-500">
            Showing {filteredAndSortedData.length} of {deltaData.length} elements
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center">
                  Element
                  {getSortIcon('name')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('base_value')}
              >
                <div className="flex items-center">
                  Base Case
                  {getSortIcon('base_value')}
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('scenario_value')}
              >
                <div className="flex items-center">
                  Scenario
                  {getSortIcon('scenario_value')}
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('delta')}
              >
                <div className="flex items-center">
                  Δ
                  {getSortIcon('delta')}
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('delta_percent')}
              >
                <div className="flex items-center">
                  Δ%
                  {getSortIcon('delta_percent')}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedData.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{row.name}</div>
                    <div className="text-xs text-gray-500 capitalize">{row.type}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {row.category}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {row.base_value.toFixed(3)} {row.unit}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {row.scenario_value.toFixed(3)} {row.unit}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={getDeltaColor(row.delta_percent)}>
                    {row.delta > 0 ? '+' : ''}{row.delta.toFixed(3)} {row.unit}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`font-medium ${getDeltaColor(row.delta_percent)}`}>
                    {row.delta_percent > 0 ? '+' : ''}{row.delta_percent.toFixed(2)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredAndSortedData.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <p className="text-lg font-medium">No data available</p>
              <p className="text-sm">No elements match the current filter</p>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-600">
            Largest voltage change: {Math.max(...deltaData.filter(r => r.type === 'bus').map(r => Math.abs(r.delta_percent))).toFixed(2)}%
          </div>
          <div className="text-gray-600">
            Largest power change: {Math.max(...deltaData.filter(r => r.type === 'branch').map(r => Math.abs(r.delta))).toFixed(1)} MW
          </div>
        </div>
      </div>
    </div>
  );
} 