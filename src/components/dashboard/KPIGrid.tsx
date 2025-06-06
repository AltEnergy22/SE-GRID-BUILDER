'use client';

import React from 'react';
import { 
  Zap, 
  Scale, 
  Activity, 
  Sun,
  AlertTriangle,
  Bell,
  CheckCircle,
  Clock,
  BarChart3
} from 'lucide-react';

interface KPIGridProps {
  freq: number;
  ace: number;
  load: number;
  renewablePct: number;
  violations: number;
  alarms: number;
  seConv: boolean;
  rtcaJobs: number;
  maxLineLoading?: number;
  isLoading?: boolean;
}

interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  status: 'normal' | 'warning' | 'alert' | 'critical' | 'good';
  isLoading?: boolean;
  trend?: 'up' | 'down' | 'stable';
}

const KPICard: React.FC<KPICardProps> = ({ 
  title, 
  value, 
  unit, 
  icon: Icon, 
  status,
  isLoading = false,
  trend
}) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'good': 
        return {
          border: 'border-green-200',
          bg: 'bg-gradient-to-br from-green-50 to-green-100',
          text: 'text-green-800',
          icon: 'text-green-600 bg-green-100'
        };
      case 'warning': 
        return {
          border: 'border-yellow-200',
          bg: 'bg-gradient-to-br from-yellow-50 to-yellow-100',
          text: 'text-yellow-800',
          icon: 'text-yellow-600 bg-yellow-100'
        };
      case 'alert': 
        return {
          border: 'border-orange-200',
          bg: 'bg-gradient-to-br from-orange-50 to-orange-100',
          text: 'text-orange-800',
          icon: 'text-orange-600 bg-orange-100'
        };
      case 'critical': 
        return {
          border: 'border-red-200',
          bg: 'bg-gradient-to-br from-red-50 to-red-100',
          text: 'text-red-800',
          icon: 'text-red-600 bg-red-100'
        };
      default: 
        return {
          border: 'border-slate-200',
          bg: 'bg-gradient-to-br from-slate-50 to-slate-100',
          text: 'text-slate-800',
          icon: 'text-slate-600 bg-slate-100'
        };
    }
  };

  const styles = getStatusStyles();

  return (
    <div className={`
      relative overflow-hidden rounded-xl border-2 
      ${styles.border} ${styles.bg} 
      transition-all duration-300 hover:shadow-lg hover:scale-105
      backdrop-blur-sm
    `}>
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-600 mb-2 truncate">
              {title}
            </p>
            <div className="flex items-baseline space-x-1">
              {isLoading ? (
                <div className="h-8 w-20 bg-slate-200 rounded-lg animate-pulse"></div>
              ) : (
                <>
                  <span className={`text-2xl font-bold ${styles.text} tabular-nums`}>
                    {typeof value === 'number' ? value.toFixed(2) : value}
                  </span>
                  {unit && (
                    <span className="text-sm font-medium text-slate-500">
                      {unit}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
          
          <div className={`
            p-2.5 rounded-xl shadow-sm
            ${styles.icon}
          `}>
            <Icon className="h-5 w-5" strokeWidth={2} />
          </div>
        </div>

        {/* Status indicator bar */}
        <div className="mt-4 h-1 w-full bg-slate-200 rounded-full overflow-hidden">
          <div 
            className={`
              h-full transition-all duration-500 rounded-full
              ${status === 'good' ? 'bg-green-400' : 
                status === 'warning' ? 'bg-yellow-400' :
                status === 'alert' ? 'bg-orange-400' :
                status === 'critical' ? 'bg-red-400' : 'bg-slate-400'}
            `}
            style={{ 
              width: status === 'critical' ? '100%' : 
                     status === 'alert' ? '75%' :
                     status === 'warning' ? '50%' :
                     status === 'good' ? '25%' : '10%'
            }}
          />
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
  maxLineLoading = 0,
  isLoading = false
}) => {
  // Status calculation functions
  const getFreqStatus = (frequency: number) => {
    if (frequency < 49.5 || frequency > 50.5) return 'critical';
    if (frequency < 49.8 || frequency > 50.2) return 'alert';
    if (frequency < 49.9 || frequency > 50.1) return 'warning';
    return 'good';
  };

  const getAceStatus = (aceValue: number) => {
    const absAce = Math.abs(aceValue);
    if (absAce > 150) return 'critical';
    if (absAce > 100) return 'alert';
    if (absAce > 50) return 'warning';
    return 'good';
  };

  const getLoadStatus = (loadValue: number) => {
    if (loadValue > 950) return 'critical';
    if (loadValue > 900) return 'alert';
    if (loadValue > 850) return 'warning';
    return 'normal';
  };

  const getRenewableStatus = (pct: number) => {
    if (pct > 40) return 'good';
    if (pct > 25) return 'normal';
    if (pct > 15) return 'warning';
    return 'alert';
  };

  const getLineLoadingStatus = (loading: number) => {
    if (loading > 95) return 'critical';
    if (loading > 85) return 'alert';
    if (loading > 75) return 'warning';
    return 'good';
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        
        {/* System Frequency */}
        <KPICard
          title="System Frequency"
          value={freq}
          unit="Hz"
          icon={Zap}
          status={getFreqStatus(freq)}
          isLoading={isLoading}
        />

        {/* Area Control Error */}
        <KPICard
          title="Area Control Error"
          value={ace}
          unit="MW"
          icon={Scale}
          status={getAceStatus(ace)}
          isLoading={isLoading}
        />

        {/* Total Load */}
        <KPICard
          title="Total Load"
          value={load}
          unit="MW"
          icon={Activity}
          status={getLoadStatus(load)}
          isLoading={isLoading}
        />

        {/* Renewable Percentage */}
        <KPICard
          title="Renewable Generation"
          value={renewablePct}
          unit="%"
          icon={Sun}
          status={getRenewableStatus(renewablePct)}
          isLoading={isLoading}
        />

        {/* State Estimation Convergence */}
        <KPICard
          title="State Estimation"
          value={seConv ? 'Converged' : 'Failed'}
          icon={CheckCircle}
          status={seConv ? 'good' : 'critical'}
          isLoading={isLoading}
        />

        {/* Max Line Loading */}
        <KPICard
          title="Max Line Loading"
          value={maxLineLoading}
          unit="%"
          icon={BarChart3}
          status={getLineLoadingStatus(maxLineLoading)}
          isLoading={isLoading}
        />

        {/* Open Alarms */}
        <KPICard
          title="Open Alarms"
          value={alarms}
          icon={Bell}
          status={alarms === 0 ? 'good' : alarms <= 3 ? 'warning' : alarms <= 8 ? 'alert' : 'critical'}
          isLoading={isLoading}
        />

        {/* RTCA Jobs Running */}
        <KPICard
          title="RTCA Jobs Running"
          value={rtcaJobs}
          icon={Clock}
          status={rtcaJobs === 0 ? 'normal' : rtcaJobs <= 2 ? 'warning' : rtcaJobs <= 5 ? 'alert' : 'critical'}
          isLoading={isLoading}
        />

      </div>
    </div>
  );
};

export default KPIGrid; 