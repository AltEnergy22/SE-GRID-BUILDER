import React, { useState, useEffect } from 'react';
import { WrenchIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface SuspectMeasurement {
  stream: string;
  element_type: string;
  element_id: string;
  meas_type: string;
  value: number;
  residual: number;
  normalized_residual: number;
}

const CalibrationDashboard: React.FC = () => {
  const [suspectMeasurements, setSuspectMeasurements] = useState<SuspectMeasurement[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGrid, setSelectedGrid] = useState('grid1');

  const fetchSuspectMeasurements = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/calibration/${selectedGrid}/suspects`);
      if (response.ok) {
        const data = await response.json();
        setSuspectMeasurements(data.suspect_measurements || []);
      }
    } catch (error) {
      console.error('Failed to fetch suspect measurements:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyCalibrationType = async (type: 'suggested' | 'manual') => {
    try {
      const response = await fetch('/api/calibration/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          grid_id: selectedGrid,
          measurements: suspectMeasurements
        })
      });
      
      if (response.ok) {
        alert('Calibration applied successfully!');
        fetchSuspectMeasurements(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to apply calibration:', error);
    }
  };

  useEffect(() => {
    fetchSuspectMeasurements();
  }, [selectedGrid]);

  return (
    <div className="space-y-6">
      {/* Grid Selection */}
      <div className="bg-white p-4 rounded-lg shadow">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Grid:
        </label>
        <select
          value={selectedGrid}
          onChange={(e) => setSelectedGrid(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="grid1">Grid 1</option>
          <option value="grid2">Grid 2</option>
          <option value="grid3">Grid 3</option>
        </select>
      </div>

      {/* Suspect Measurements */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center mb-4">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mr-2" />
          <h2 className="text-lg font-semibold">Suspect Measurements</h2>
          <button
            onClick={fetchSuspectMeasurements}
            disabled={loading}
            className="ml-auto px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {suspectMeasurements.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stream
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Element
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Residual
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Normalized
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {suspectMeasurements.map((measurement, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {measurement.stream}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {measurement.element_type} {measurement.element_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {measurement.meas_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {measurement.value.toFixed(3)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {measurement.residual.toFixed(3)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {measurement.normalized_residual.toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            {loading ? 'Loading measurements...' : 'No suspect measurements found'}
          </div>
        )}
      </div>

      {/* Calibration Actions */}
      {suspectMeasurements.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center mb-4">
            <WrenchIcon className="h-5 w-5 text-blue-500 mr-2" />
            <h2 className="text-lg font-semibold">Calibration Actions</h2>
          </div>
          <div className="space-y-4">
            <div className="flex space-x-4">
              <button
                onClick={() => applyCalibrationType('suggested')}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Apply Suggested Calibration
              </button>
              <button
                onClick={() => applyCalibrationType('manual')}
                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                Manual Calibration
              </button>
            </div>
            <p className="text-sm text-gray-600">
              Suggested calibration applies automatic bias and scale corrections based on residual analysis.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalibrationDashboard; 