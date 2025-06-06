import React from 'react';
import { 
  BoltIcon, 
  ScaleIcon, 
  CpuChipIcon, 
  SunIcon,
  ExclamationTriangleIcon,
  BellAlertIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface KPIGridProps {
  freq: number;
  ace: number;
  load: number;
  renewablePct: number;
  violations: number;
  alarms: number;
  seConv: boolean;
  rtcaJobs: number;
  isLoading?: boolean;
}

interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  status?: 'normal' | 'warning' | 'critical' | 'good';
  isLoading?: boolean;
}

const KPICard: React.FC<KPICardProps> = ({ 
  title, 
  value, 
  unit, 
  icon: Icon, 
  status = 'normal',
  isLoading = false 
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getIconColor = () => {
    switch (status) {
      case 'good': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-blue-500';
    }
  };

  return (
    <div className={`p-4 rounded-lg border-2 transition-all duration-200 ${getStatusColor()}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <div className="flex items-baseline">
            {isLoading ? (
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
            ) : (
              <>
                <span className="text-2xl font-bold text-gray-900">
                  {typeof value === 'number' ? value.toFixed(2) : value}
                </span>
                {unit && <span className="ml-1 text-sm text-gray-500">{unit}</span>}
              </>
            )}
          </div>
        </div>
        <div className={`p-2 rounded-full ${getIconColor()}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
};

const KPIGrid: React.FC<KPIGridProps> = ({
  freq,
  ace,
  load,
  renewablePct,
  violations,
  alarms,
  seConv,
  rtcaJobs,
  isLoading = false
}) => {
  const getFreqStatus = (frequency: number) => {
    if (frequency < 49.5 || frequency > 50.5) return 'critical';
    if (frequency < 49.8 || frequency > 50.2) return 'warning';
    return 'good';
  };

  const getAceStatus = (aceValue: number) => {
    const absAce = Math.abs(aceValue);
    if (absAce > 100) return 'critical';
    if (absAce > 50) return 'warning';
    return 'good';
  };

  const getLoadStatus = (loadValue: number) => {
    if (loadValue > 900) return 'warning';
    if (loadValue > 950) return 'critical';
    return 'normal';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      
      {/* Frequency */}
      <KPICard
        title="System Frequency"
        value={freq}
        unit="Hz"
        icon={BoltIcon}
        status={getFreqStatus(freq)}
        isLoading={isLoading}
      />

      {/* ACE */}
      <KPICard
        title="Area Control Error"
        value={ace}
        unit="MW"
        icon={ScaleIcon}
        status={getAceStatus(ace)}
        isLoading={isLoading}
      />

      {/* Load */}
      <KPICard
        title="Total Load"
        value={load}
        unit="MW"
        icon={CpuChipIcon}
        status={getLoadStatus(load)}
        isLoading={isLoading}
      />

      {/* Renewable % */}
      <KPICard
        title="Renewable Generation"
        value={renewablePct}
        unit="%"
        icon={SunIcon}
        status={renewablePct > 30 ? 'good' : 'normal'}
        isLoading={isLoading}
      />

      {/* Violations */}
      <KPICard
        title="Constraint Violations"
        value={violations}
        icon={ExclamationTriangleIcon}
        status={violations > 0 ? 'critical' : 'good'}
        isLoading={isLoading}
      />

      {/* Alarms */}
      <KPICard
        title="Active Alarms"
        value={alarms}
        icon={BellAlertIcon}
        status={alarms > 0 ? (alarms > 5 ? 'critical' : 'warning') : 'good'}
        isLoading={isLoading}
      />

      {/* State Estimation */}
      <KPICard
        title="State Estimation"
        value={seConv ? 'Converged' : 'Failed'}
        icon={CheckCircleIcon}
        status={seConv ? 'good' : 'critical'}
        isLoading={isLoading}
      />

      {/* RTCA Jobs */}
      <KPICard
        title="RTCA Jobs"
        value={rtcaJobs}
        unit="running"
        icon={ClockIcon}
        status={rtcaJobs > 3 ? 'warning' : 'normal'}
        isLoading={isLoading}
      />

    </div>
  );
};

export default KPIGrid; 