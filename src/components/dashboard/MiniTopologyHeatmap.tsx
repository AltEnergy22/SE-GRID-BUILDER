'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Map, Zap } from 'lucide-react';

interface BusData {
  voltage: number;
  angle: number;
  delta_v: number;
}

interface MiniTopologyHeatmapProps {
  voltageData: Record<string, BusData>;
  isLoading?: boolean;
}

const MiniTopologyHeatmap: React.FC<MiniTopologyHeatmapProps> = ({
  voltageData,
  isLoading = false
}) => {
  const router = useRouter();

  // Generate 50 buses in a 10x5 grid layout
  const generateBuses = () => {
    const buses = [];
    const cols = 10;
    const rows = 5;
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const busId = `BUS-${(row * cols + col + 1).toString().padStart(3, '0')}`;
        const busData = voltageData[busId] || {
          voltage: 1.0 + (Math.random() - 0.5) * 0.1,
          angle: (Math.random() - 0.5) * 30,
          delta_v: Math.random() * 0.05
        };
        
        buses.push({
          id: busId,
          x: col,
          y: row,
          ...busData
        });
      }
    }
    return buses;
  };

  const buses = generateBuses();

  // Color mapping based on |ΔV| - voltage deviation magnitude
  const getBusColor = (deltaV: number) => {
    const magnitude = Math.abs(deltaV);
    
    if (magnitude <= 0.01) return '#10b981'; // green-500 - good
    if (magnitude <= 0.02) return '#84cc16'; // lime-500 - normal
    if (magnitude <= 0.03) return '#eab308'; // yellow-500 - warning
    if (magnitude <= 0.05) return '#f97316'; // orange-500 - alert
    return '#ef4444'; // red-500 - critical
  };

  const getBusStatus = (deltaV: number) => {
    const magnitude = Math.abs(deltaV);
    
    if (magnitude <= 0.01) return 'good';
    if (magnitude <= 0.02) return 'normal';
    if (magnitude <= 0.03) return 'warning';
    if (magnitude <= 0.05) return 'alert';
    return 'critical';
  };

  const handleBusClick = (busId: string) => {
    router.push(`/topology?focus=${busId}`);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <Map className="h-5 w-5 text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-900">Network Overview</h3>
          </div>
        </div>
        <div className="p-6 flex items-center justify-center h-64">
          <div className="space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-slate-500">Loading topology data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const criticalBuses = buses.filter(bus => getBusStatus(bus.delta_v) === 'critical').length;
  const alertBuses = buses.filter(bus => getBusStatus(bus.delta_v) === 'alert').length;
  const warningBuses = buses.filter(bus => getBusStatus(bus.delta_v) === 'warning').length;
  const maxDeltaV = Math.max(...buses.map(bus => Math.abs(bus.delta_v)));

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Map className="h-5 w-5 text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-900">Network Overview</h3>
          </div>
          <div className="flex items-center space-x-2 text-sm text-slate-500">
            <Zap className="h-4 w-4" />
            <span>50 Buses</span>
          </div>
        </div>
        
        {/* Quick statistics */}
        <div className="mt-3 flex items-center space-x-4 text-sm">
          {criticalBuses > 0 && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span className="text-red-700 font-medium">{criticalBuses} Critical</span>
            </div>
          )}
          {alertBuses > 0 && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              <span className="text-orange-700 font-medium">{alertBuses} Alert</span>
            </div>
          )}
          {warningBuses > 0 && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <span className="text-yellow-700 font-medium">{warningBuses} Warning</span>
            </div>
          )}
          <div className="flex items-center space-x-1 text-slate-600">
            <span>Max ΔV: {(maxDeltaV * 100).toFixed(2)}%</span>
          </div>
        </div>
      </div>

      {/* SVG Grid */}
      <div className="flex-1 p-4">
        <div className="w-full h-full flex items-center justify-center">
          <svg
            viewBox="0 0 500 250"
            className="w-full h-full max-h-64"
            style={{ aspectRatio: '2/1' }}
          >
            {/* Grid lines */}
            <defs>
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e2e8f0" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Transmission lines (simplified grid) */}
            {buses.map((bus, index) => {
              const x = bus.x * 50 + 25;
              const y = bus.y * 50 + 25;
              
              return (
                <g key={`lines-${bus.id}`}>
                  {/* Horizontal lines */}
                  {bus.x < 9 && (
                    <line
                      x1={x}
                      y1={y}
                      x2={x + 50}
                      y2={y}
                      stroke="#94a3b8"
                      strokeWidth="1"
                      opacity="0.6"
                    />
                  )}
                  {/* Vertical lines */}
                  {bus.y < 4 && (
                    <line
                      x1={x}
                      y1={y}
                      x2={x}
                      y2={y + 50}
                      stroke="#94a3b8"
                      strokeWidth="1"
                      opacity="0.6"
                    />
                  )}
                </g>
              );
            })}

            {/* Bus nodes */}
            {buses.map((bus) => {
              const x = bus.x * 50 + 25;
              const y = bus.y * 50 + 25;
              const color = getBusColor(bus.delta_v);
              const status = getBusStatus(bus.delta_v);

              return (
                <g key={bus.id}>
                  {/* Bus circle */}
                  <circle
                    cx={x}
                    cy={y}
                    r="8"
                    fill={color}
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="cursor-pointer hover:r-10 transition-all duration-200"
                    onClick={() => handleBusClick(bus.id)}
                    style={{
                      filter: status === 'critical' ? 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.8))' :
                              status === 'alert' ? 'drop-shadow(0 0 4px rgba(249, 115, 22, 0.6))' : 'none'
                    }}
                  >
                    <title>
                      {bus.id}
                      {'\n'}Voltage: {bus.voltage.toFixed(3)} pu
                      {'\n'}Angle: {bus.angle.toFixed(1)}°
                      {'\n'}ΔV: {(bus.delta_v * 100).toFixed(2)}%
                      {'\n'}Status: {status}
                      {'\n'}Click to view details
                    </title>
                  </circle>
                  
                  {/* Pulsing effect for critical buses */}
                  {status === 'critical' && (
                    <circle
                      cx={x}
                      cy={y}
                      r="8"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="1"
                      opacity="0.6"
                      className="animate-ping"
                    />
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-3">
            <span className="text-slate-600 font-medium">Voltage Deviation:</span>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-slate-600">≤1%</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-lime-500"></div>
              <span className="text-slate-600">≤2%</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <span className="text-slate-600">≤3%</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              <span className="text-slate-600">≤5%</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span className="text-slate-600">&gt;5%</span>
            </div>
          </div>
          <button
            onClick={() => router.push('/topology')}
            className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
          >
            View Full Topology →
          </button>
        </div>
      </div>
    </div>
  );
};

export default MiniTopologyHeatmap; 