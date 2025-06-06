import { XMarkIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { RTCAViolation } from '@/hooks/useRTCAStream';

interface DetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  violation: RTCAViolation | null;
  gridId: string;
}

export function DetailDrawer({ isOpen, onClose, violation, gridId }: DetailDrawerProps) {
  const handleExportCSV = () => {
    if (!violation) return;

    const csvData = [
      ['Field', 'Value'],
      ['Contingency ID', violation.contingency_id],
      ['Outage', violation.outage],
      ['Pre-Contingency Loading (%)', violation.pre_loading.toString()],
      ['Post-Contingency Loading (%)', violation.post_loading.toString()],
      ['Loading Percentage (%)', violation.loading_percent.toString()],
      ['Voltage Violations', violation.voltage_violations.toString()],
      ['Angle Margin (degrees)', violation.angle_margin.toString()],
      ['Worst Bus', violation.worst_bus],
      ['Worst Bus Voltage (p.u.)', violation.worst_bus_voltage.toString()],
      ['Severity', violation.severity],
      ['Timestamp', violation.timestamp],
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `rtca_violation_${violation.contingency_id}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const CorridorDiagram = ({ violation }: { violation: RTCAViolation }) => {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">System Corridor</h4>
        <svg viewBox="0 0 400 150" className="w-full h-32 border border-gray-200 rounded">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          <circle cx="50" cy="75" r="8" fill="#3b82f6" stroke="#1e40af" strokeWidth="2" />
          <circle cx="200" cy="75" r="8" fill="#3b82f6" stroke="#1e40af" strokeWidth="2" />
          <circle cx="350" cy="75" r="8" fill="#3b82f6" stroke="#1e40af" strokeWidth="2" />
          
          <line x1="58" y1="75" x2="192" y2="75" 
                stroke={violation.severity === 'critical' ? '#dc2626' : '#6b7280'} 
                strokeWidth="3" />
          <line x1="208" y1="75" x2="342" y2="75" 
                stroke="#6b7280" strokeWidth="3" />
          
          <text x="50" y="95" textAnchor="middle" fontSize="10" fill="#374151">Bus A</text>
          <text x="200" y="95" textAnchor="middle" fontSize="10" fill="#374151">Bus B</text>
          <text x="350" y="95" textAnchor="middle" fontSize="10" fill="#374151">{violation.worst_bus}</text>
          
          <text x="125" y="65" textAnchor="middle" fontSize="9" fill="#dc2626" fontWeight="bold">
            OUTAGE
          </text>
          
          <text x="125" y="50" textAnchor="middle" fontSize="8" fill="#6b7280">
            {violation.post_loading.toFixed(1)}%
          </text>
        </svg>
        <p className="text-xs text-gray-500 mt-2">
          Simplified corridor diagram showing {violation.outage} outage impact
        </p>
      </div>
    );
  };

  if (!violation || !isOpen) return null;

  return (
    <div className="fixed inset-0 overflow-hidden z-50">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
          <div className="pointer-events-auto w-screen max-w-md transform transition-transform">
            <div className="flex h-full flex-col overflow-y-scroll bg-white py-6 shadow-xl">
              <div className="px-4 sm:px-6">
                <div className="flex items-start justify-between">
                  <h2 className="text-lg font-medium text-gray-900">Violation Details</h2>
                  <div className="ml-3 flex h-7 items-center">
                    <button
                      type="button"
                      className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      onClick={onClose}
                    >
                      <span className="sr-only">Close panel</span>
                      <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="relative mt-6 flex-1 px-4 sm:px-6">
                <div className="mb-6">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getSeverityColor(violation.severity)}`}>
                    {violation.severity.toUpperCase()} VIOLATION
                  </span>
                </div>

                <CorridorDiagram violation={violation} />

                <div className="mt-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Contingency Information</h3>
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Outage</dt>
                        <dd className="text-sm text-gray-900 font-mono bg-gray-50 px-2 py-1 rounded">
                          {violation.outage}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Contingency ID</dt>
                        <dd className="text-sm text-gray-900">{violation.contingency_id}</dd>
                      </div>
                    </dl>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Loading Analysis</h3>
                    <dl className="space-y-3">
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">Pre-Contingency</dt>
                        <dd className="text-sm text-gray-900">{violation.pre_loading.toFixed(1)}%</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">Post-Contingency</dt>
                        <dd className={`text-sm font-medium ${
                          violation.post_loading > 100 ? 'text-red-600' : 'text-gray-900'
                        }`}>
                          {violation.post_loading.toFixed(1)}%
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">Loading Change</dt>
                        <dd className="text-sm text-gray-900">
                          +{(violation.post_loading - violation.pre_loading).toFixed(1)}%
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">System Impact</h3>
                    <dl className="space-y-3">
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">Voltage Violations</dt>
                        <dd className={`text-sm font-medium ${
                          violation.voltage_violations > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {violation.voltage_violations}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">Angle Margin</dt>
                        <dd className="text-sm text-gray-900">{violation.angle_margin.toFixed(2)}°</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Worst Bus</dt>
                        <dd className="text-sm text-gray-900">{violation.worst_bus}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">Worst Bus Voltage</dt>
                        <dd className="text-sm text-gray-900">{violation.worst_bus_voltage.toFixed(3)} p.u.</dd>
                      </div>
                    </dl>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Metadata</h3>
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Timestamp</dt>
                        <dd className="text-sm text-gray-900">
                          {new Date(violation.timestamp).toLocaleString()}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200">
                  <button
                    onClick={handleExportCSV}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                    Export to CSV
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 