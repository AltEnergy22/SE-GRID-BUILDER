'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { RTCALoading } from '@/hooks/useRTCAStream';

interface WaterfallChartProps {
  loadings: RTCALoading[];
  isLoading: boolean;
}

export function WaterfallChart({ loadings, isLoading }: WaterfallChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Take top 20 loadings and format for chart
  const chartData = loadings
    .slice(0, 20)
    .map((loading, index) => ({
      name: `${loading.element_type.toUpperCase()}_${loading.element_id}`,
      loading: Math.round(loading.loading_percent * 10) / 10,
      current: Math.round(loading.current_mva * 10) / 10,
      rating: Math.round(loading.rating_mva * 10) / 10,
      rank: index + 1,
    }));

  const getBarColor = (loading: number) => {
    if (loading >= 100) return '#dc2626'; // red-600
    if (loading >= 90) return '#ea580c';  // orange-600
    if (loading >= 80) return '#d97706';  // amber-600
    if (loading >= 70) return '#ca8a04';  // yellow-600
    return '#16a34a'; // green-600
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-sm text-blue-600">
            Loading: <span className="font-medium">{data.loading}%</span>
          </p>
          <p className="text-sm text-gray-600">
            Current: <span className="font-medium">{data.current} MVA</span>
          </p>
          <p className="text-sm text-gray-600">
            Rating: <span className="font-medium">{data.rating} MVA</span>
          </p>
          <p className="text-sm text-gray-500">
            Rank: #{data.rank}
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading || !mounted) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Loadings</h3>
          <div className="animate-pulse">
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          Top Loadings
          {loadings.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              (Top {Math.min(20, loadings.length)})
            </span>
          )}
        </h3>
      </div>

      {loadings.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          <div className="w-12 h-12 mx-auto mb-4">
            <svg viewBox="0 0 24 24" className="w-full h-full text-gray-400">
              <path fill="currentColor" d="M3,13H5V19H3V13M7,9H9V19H7V9M11,5H13V19H11V5M15,1H17V19H15V1M19,9H21V19H19V9Z" />
            </svg>
          </div>
          <p className="text-lg font-medium">No loading data available</p>
          <p className="text-sm">Start an RTCA analysis to see element loadings</p>
        </div>
      ) : (
        <div className="p-6">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 60,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={60}
                fontSize={12}
                stroke="#6b7280"
              />
              <YAxis 
                fontSize={12}
                stroke="#6b7280"
                domain={[0, 'dataMax + 10']}
                label={{ 
                  value: 'Loading (%)', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle' }
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="loading" 
                radius={[4, 4, 0, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.loading)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Loading Legend */}
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-600 rounded mr-1"></div>
              <span>&lt; 70%</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-600 rounded mr-1"></div>
              <span>70-80%</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-amber-600 rounded mr-1"></div>
              <span>80-90%</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-orange-600 rounded mr-1"></div>
              <span>90-100%</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-600 rounded mr-1"></div>
              <span>&gt; 100%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 