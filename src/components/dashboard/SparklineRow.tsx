'use client';

import React, { useState, useEffect } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

interface DataPoint {
  timestamp: number;
  value: number;
}

interface SparklineRowProps {
  freqData: DataPoint[];
  aceData: DataPoint[];
  loadData: DataPoint[];
  renewableData: DataPoint[];
  isLoading?: boolean;
}

interface SparklineCardProps {
  title: string;
  data: DataPoint[];
  color: string;
  unit: string;
  currentValue?: number;
  isLoading?: boolean;
}

const SparklineCard: React.FC<SparklineCardProps> = ({
  title,
  data,
  color,
  unit,
  currentValue,
  isLoading = false
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getMinMaxAvg = (data: DataPoint[]) => {
    if (data.length === 0) return { min: 0, max: 0, avg: 0 };
    
    const values = data.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    return { min, max, avg };
  };

  const stats = getMinMaxAvg(data);
  const latestTime = data.length > 0 ? formatTime(data[data.length - 1].timestamp) : '--:--';

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
        <span className="text-xs text-gray-500">{latestTime}</span>
      </div>
      
      {isLoading || !mounted ? (
        <div className="h-16 bg-gray-100 rounded animate-pulse mb-2"></div>
      ) : (
        <div className="h-16 mb-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, fill: color }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      
      <div className="grid grid-cols-4 gap-2 text-xs">
        <div>
          <span className="text-gray-500">Current:</span>
          <div className="font-medium text-gray-900">
            {currentValue !== undefined ? `${currentValue.toFixed(1)}${unit}` : '--'}
          </div>
        </div>
        <div>
          <span className="text-gray-500">Min:</span>
          <div className="font-medium text-gray-900">{stats.min.toFixed(1)}{unit}</div>
        </div>
        <div>
          <span className="text-gray-500">Max:</span>
          <div className="font-medium text-gray-900">{stats.max.toFixed(1)}{unit}</div>
        </div>
        <div>
          <span className="text-gray-500">Avg:</span>
          <div className="font-medium text-gray-900">{stats.avg.toFixed(1)}{unit}</div>
        </div>
      </div>
    </div>
  );
};

const SparklineRow: React.FC<SparklineRowProps> = ({
  freqData,
  aceData,
  loadData,
  renewableData,
  isLoading = false
}) => {
  const getCurrentValue = (data: DataPoint[]) => {
    return data.length > 0 ? data[data.length - 1].value : undefined;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Real-Time Trends (Last 30 Minutes)</h2>
        <span className="text-sm text-gray-500">
          {freqData.length > 0 ? `${freqData.length} data points` : 'No data'}
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Frequency Sparkline */}
        <SparklineCard
          title="System Frequency"
          data={freqData}
          color="#3B82F6"
          unit="Hz"
          currentValue={getCurrentValue(freqData)}
          isLoading={isLoading}
        />

        {/* ACE Sparkline */}
        <SparklineCard
          title="Area Control Error"
          data={aceData}
          color="#EF4444"
          unit="MW"
          currentValue={getCurrentValue(aceData)}
          isLoading={isLoading}
        />

        {/* Load Sparkline */}
        <SparklineCard
          title="Total Load"
          data={loadData}
          color="#F59E0B"
          unit="MW"
          currentValue={getCurrentValue(loadData)}
          isLoading={isLoading}
        />

        {/* Renewable Sparkline */}
        <SparklineCard
          title="Renewable Generation"
          data={renewableData}
          color="#10B981"
          unit="%"
          currentValue={getCurrentValue(renewableData)}
          isLoading={isLoading}
        />

      </div>
    </div>
  );
};

export default SparklineRow; 