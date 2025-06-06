import React from 'react';
import { useRouter } from 'next/router';
import { MapIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

interface VoltageData {
  voltage: number;
  angle: number;
  delta_v: number;
}

interface MiniTopologyHeatmapProps {
  voltageData: Record<string, VoltageData>;
  isLoading?: boolean;
}

interface BusNodeProps {
  busId: string;
  data: VoltageData;
  onClick: () => void;
}

const BusNode: React.FC<BusNodeProps> = ({ busId, data, onClick }) => {
  const getColorByDeltaV = (deltaV: number) => {
    const absDelta = Math.abs(deltaV);
    if (absDelta < 0.02) return 'bg-green-400'; // Normal
    if (absDelta < 0.05) return 'bg-yellow-400'; // Warning
    if (absDelta < 0.1) return 'bg-orange-400'; // Alert
    return 'bg-red-400'; // Critical
  };

  const getSizeByVoltage = (voltage: number) => {
    if (voltage < 0.95) return 'w-3 h-3'; // Low voltage - smaller
    if (voltage > 1.05) return 'w-5 h-5'; // High voltage - larger
    return 'w-4 h-4'; // Normal voltage
  };

  return (
    <div
      className={`
        ${getColorByDeltaV(data.delta_v)} 
        ${getSizeByVoltage(data.voltage)}
        rounded-full cursor-pointer transition-all duration-200 
        hover:scale-125 hover:shadow-lg border-2 border-white
        flex items-center justify-center
      `}
      onClick={onClick}
      title={`Bus ${busId}: ${data.voltage.toFixed(3)} pu (Δ${data.delta_v.toFixed(3)})`}
    >
      <span className="text-xs font-bold text-white drop-shadow">
        {busId.length > 2 ? busId.slice(-2) : busId}
      </span>
    </div>
  );
};

const MiniTopologyHeatmap: React.FC<MiniTopologyHeatmapProps> = ({
  voltageData,
  isLoading = false
}) => {
  const router = useRouter();

  const handleBusClick = (busId: string) => {
    // Navigate to full topology view with selected bus
    router.push(`/topology?bus=${busId}`);
  };

  const handleViewFullTopology = () => {
    router.push('/topology');
  };

  const getVoltageStats = () => {
    const voltages = Object.values(voltageData);
    if (voltages.length === 0) return { min: 0, max: 0, violations: 0 };

    const voltageLevels = voltages.map(v => v.voltage);
    const violations = voltages.filter(v => v.voltage < 0.95 || v.voltage > 1.05).length;

    return {
      min: Math.min(...voltageLevels),
      max: Math.max(...voltageLevels),
      violations
    };
  };

  const stats = getVoltageStats();
  const busIds = Object.keys(voltageData);

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm h-full flex flex-col">
      
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2">
            <MapIcon className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900">Network Topology</h2>
          </div>
          <p className="text-sm text-gray-600">Voltage heatmap (|ΔV| coloring)</p>
        </div>
        <button
          onClick={handleViewFullTopology}
          className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
        >
          <span>Full View</span>
          <ArrowTopRightOnSquareIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
        <div className="text-center">
          <div className="text-gray-500">Min Voltage</div>
          <div className="font-semibold text-gray-900">{stats.min.toFixed(3)} pu</div>
        </div>
        <div className="text-center">
          <div className="text-gray-500">Max Voltage</div>
          <div className="font-semibold text-gray-900">{stats.max.toFixed(3)} pu</div>
        </div>
        <div className="text-center">
          <div className="text-gray-500">Violations</div>
          <div className={`font-semibold ${stats.violations > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {stats.violations}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-4">
        <div className="text-xs text-gray-600 mb-2">Voltage Deviation (|ΔV|):</div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            <span>< 0.02</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
            <span>< 0.05</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
            <span>< 0.10</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-400 rounded-full"></div>
            <span>≥ 0.10</span>
          </div>
        </div>
      </div>

      {/* Topology Visualization */}
      <div className="flex-1 relative bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-gray-500">Loading topology...</div>
          </div>
        ) : busIds.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-gray-500">No voltage data available</div>
          </div>
        ) : (
          <div className="absolute inset-0 p-4">
            {/* Simple grid layout for bus visualization */}
            <div className="grid grid-cols-6 gap-3 h-full">
              {busIds.slice(0, 24).map((busId, index) => (
                <div
                  key={busId}
                  className="flex items-center justify-center"
                  style={{
                    gridColumn: `${(index % 6) + 1}`,
                    gridRow: `${Math.floor(index / 6) + 1}`,
                  }}
                >
                  <BusNode
                    busId={busId}
                    data={voltageData[busId]}
                    onClick={() => handleBusClick(busId)}
                  />
                </div>
              ))}
            </div>
            
            {/* Show count if more buses than displayed */}
            {busIds.length > 24 && (
              <div className="absolute bottom-2 right-2 bg-white px-2 py-1 rounded text-xs text-gray-600 shadow">
                +{busIds.length - 24} more buses
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MiniTopologyHeatmap; 