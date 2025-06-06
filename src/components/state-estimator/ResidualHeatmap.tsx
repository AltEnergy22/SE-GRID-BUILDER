import { ResponsiveHeatMap } from '@nivo/heatmap';
import { SEResidual } from '@/hooks/useStateEstimator';

interface ResidualHeatmapProps {
  residuals: SEResidual[];
}

interface HeatmapData {
  id: string;
  data: Array<{
    x: string;
    y: number;
    residual: number;
    std_dev: number;
    norm_res: number;
  }>;
}

export function ResidualHeatmap({ residuals }: ResidualHeatmapProps) {
  // Transform residuals data for Nivo heatmap
  const transformData = (): HeatmapData[] => {
    const grouped = residuals.reduce((acc, residual) => {
      const measType = `${residual.element_type}_${residual.meas_type}`.toUpperCase();
      const elementId = `${residual.element_type}_${residual.element_id}`;
      const normRes = Math.abs(residual.residual / residual.std_dev);
      
      if (!acc[measType]) {
        acc[measType] = [];
      }
      
      acc[measType].push({
        x: elementId,
        y: normRes,
        residual: residual.residual,
        std_dev: residual.std_dev,
        norm_res: normRes,
      });
      
      return acc;
    }, {} as Record<string, any[]>);

    return Object.entries(grouped).map(([measType, data]) => ({
      id: measType,
      data: data.sort((a, b) => a.x.localeCompare(b.x)),
    }));
  };

  const data = transformData();
  
  // Find max normalized residual for color scale
  const maxNormRes = Math.max(
    ...residuals.map(r => Math.abs(r.residual / r.std_dev)),
    5 // Minimum scale to show variation
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Residual Heatmap</h2>
      <p className="text-sm text-gray-600 mb-4">
        Normalized residuals (|residual/σ|) by measurement type and element. Red borders indicate outliers (&gt;3σ).
      </p>
      
      <div style={{ height: '400px' }}>
        {data.length > 0 ? (
          <ResponsiveHeatMap
            data={data}
            margin={{ top: 60, right: 90, bottom: 60, left: 120 }}
            valueFormat=".2f"
            axisTop={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: -45,
              legend: '',
              legendOffset: -36,
            }}
            axisRight={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: 'Normalized Residual |r/σ|',
              legendPosition: 'middle',
              legendOffset: 70,
            }}
            axisBottom={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: -45,
              legend: 'Element ID',
              legendPosition: 'middle',
              legendOffset: 46,
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: 'Measurement Type',
              legendPosition: 'middle',
              legendOffset: -100,
            }}
            colors={{
              type: 'sequential',
              scheme: 'reds',
              minValue: 0,
              maxValue: maxNormRes,
            }}
            emptyColor="#f7f7f7"
            borderRadius={2}
            borderWidth={2}
            borderColor={(cell) => {
              const value = cell.data?.norm_res || 0;
              return value > 3 ? '#dc2626' : 'transparent'; // Red border for >3σ
            }}
            labelTextColor="#000000"
            tooltip={({ cell }) => {
              const data = cell.data as any;
              return (
                <div className="bg-white p-3 shadow-lg rounded-lg border">
                  <div className="font-semibold">{cell.serieId}</div>
                  <div className="text-sm text-gray-600">Element: {data?.x}</div>
                  <div className="text-sm">
                    <span className="font-medium">Residual:</span> {data?.residual?.toFixed(4)}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Std Dev:</span> {data?.std_dev?.toFixed(4)}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Normalized:</span> {data?.norm_res?.toFixed(2)}σ
                  </div>
                  {data?.norm_res > 3 && (
                    <div className="text-sm text-red-600 font-medium mt-1">
                      ⚠️ Outlier (&gt;3σ)
                    </div>
                  )}
                </div>
              );
            }}
            animate={true}
            motionStiffness={90}
            motionDamping={15}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            No residual data available
          </div>
        )}
      </div>
    </div>
  );
} 