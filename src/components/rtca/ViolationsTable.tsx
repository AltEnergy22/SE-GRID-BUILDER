import { useState, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { ChevronUpIcon, ChevronDownIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { RTCAViolation } from '@/hooks/useRTCAStream';

interface ViolationsTableProps {
  violations: RTCAViolation[];
  onRowClick: (violation: RTCAViolation) => void;
  isLoading: boolean;
}

type SortDirection = 'asc' | 'desc';
type SortColumn = 'outage' | 'pre_loading' | 'post_loading' | 'loading_percent' | 'voltage_violations' | 'angle_margin' | 'worst_bus';

interface SortState {
  column: SortColumn;
  direction: SortDirection;
}

interface ViolationRowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    violations: RTCAViolation[];
    onRowClick: (violation: RTCAViolation) => void;
  };
}

function ViolationRow({ index, style, data }: ViolationRowProps) {
  const violation = data.violations[index];
  
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-50 border-red-200 text-red-900';
      case 'high': return 'bg-orange-50 border-orange-200 text-orange-900';
      case 'medium': return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      case 'low': return 'bg-green-50 border-green-200 text-green-900';
      default: return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  const getSeverityBadge = (severity: string) => {
    const colors = {
      critical: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800',
    }[severity] || 'bg-gray-100 text-gray-800';

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors}`}>
        {severity === 'critical' && <ExclamationTriangleIcon className="w-3 h-3 mr-1" />}
        {severity.toUpperCase()}
      </span>
    );
  };

  return (
    <div
      style={style}
      className={`border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors ${getSeverityColor(violation.severity)}`}
      onClick={() => data.onRowClick(violation)}
    >
      <div className="grid grid-cols-7 gap-4 px-6 py-4 text-sm">
        <div className="font-medium truncate" title={violation.outage}>
          {violation.outage}
        </div>
        <div className="text-right">
          {violation.pre_loading.toFixed(1)}%
        </div>
        <div className="text-right font-medium">
          {violation.post_loading.toFixed(1)}%
        </div>
        <div className="text-right">
          {violation.loading_percent.toFixed(1)}%
        </div>
        <div className="text-center">
          {violation.voltage_violations > 0 ? (
            <span className="text-red-600 font-medium">{violation.voltage_violations}</span>
          ) : (
            <span className="text-green-600">0</span>
          )}
        </div>
        <div className="text-right">
          {violation.angle_margin.toFixed(2)}°
        </div>
        <div className="flex items-center justify-between">
          <span className="truncate" title={violation.worst_bus}>
            {violation.worst_bus}
          </span>
          {getSeverityBadge(violation.severity)}
        </div>
      </div>
    </div>
  );
}

export function ViolationsTable({ violations, onRowClick, isLoading }: ViolationsTableProps) {
  const [sortState, setSortState] = useState<SortState>({
    column: 'loading_percent',
    direction: 'desc',
  });

  // Sort violations
  const sortedViolations = useMemo(() => {
    if (!violations.length) return [];

    return [...violations].sort((a, b) => {
      const { column, direction } = sortState;
      let aVal: any = a[column];
      let bVal: any = b[column];

      // Handle string comparisons
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [violations, sortState]);

  const handleSort = (column: SortColumn) => {
    setSortState(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortState.column !== column) {
      return <ChevronUpIcon className="w-4 h-4 text-gray-400" />;
    }
    return sortState.direction === 'asc' 
      ? <ChevronUpIcon className="w-4 h-4 text-blue-600" />
      : <ChevronDownIcon className="w-4 h-4 text-blue-600" />;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Violations Analysis</h3>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          Violations Analysis
          {violations.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({violations.length.toLocaleString()} violations)
            </span>
          )}
        </h3>
      </div>

      {violations.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          <ExclamationTriangleIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-lg font-medium">No violations detected</p>
          <p className="text-sm">System appears secure under analyzed contingencies</p>
        </div>
      ) : (
        <>
          {/* Table Header */}
          <div className="bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-7 gap-4 px-6 py-3 text-sm font-medium text-gray-700">
              <button
                className="text-left hover:text-gray-900 flex items-center"
                onClick={() => handleSort('outage')}
              >
                Outage
                <SortIcon column="outage" />
              </button>
              <button
                className="text-right hover:text-gray-900 flex items-center justify-end"
                onClick={() => handleSort('pre_loading')}
              >
                Pre (%)
                <SortIcon column="pre_loading" />
              </button>
              <button
                className="text-right hover:text-gray-900 flex items-center justify-end"
                onClick={() => handleSort('post_loading')}
              >
                Post (%)
                <SortIcon column="post_loading" />
              </button>
              <button
                className="text-right hover:text-gray-900 flex items-center justify-end"
                onClick={() => handleSort('loading_percent')}
              >
                Loading (%)
                <SortIcon column="loading_percent" />
              </button>
              <button
                className="text-center hover:text-gray-900 flex items-center justify-center"
                onClick={() => handleSort('voltage_violations')}
              >
                V-Violations
                <SortIcon column="voltage_violations" />
              </button>
              <button
                className="text-right hover:text-gray-900 flex items-center justify-end"
                onClick={() => handleSort('angle_margin')}
              >
                Angle Margin
                <SortIcon column="angle_margin" />
              </button>
              <button
                className="text-left hover:text-gray-900 flex items-center"
                onClick={() => handleSort('worst_bus')}
              >
                Worst Bus
                <SortIcon column="worst_bus" />
              </button>
            </div>
          </div>

          {/* Virtualized Table Body */}
          <div style={{ height: 400 }}>
            <List
              height={400}
              width={800}
              itemCount={sortedViolations.length}
              itemSize={60}
              itemData={{
                violations: sortedViolations,
                onRowClick,
              }}
            >
              {ViolationRow}
            </List>
          </div>
        </>
      )}
    </div>
  );
} 