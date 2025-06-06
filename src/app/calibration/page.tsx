import React from 'react';
import { withRole } from '@/components/auth/withRole';
import CalibrationDashboard from '@/components/calibration/CalibrationDashboard';

const CalibrationPage: React.FC = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Sensor Calibration & Bad Data Detection
        </h1>
        <p className="text-gray-600 mt-2">
          Monitor measurement quality, detect suspect sensors, and apply calibration factors.
        </p>
      </div>
      
      <CalibrationDashboard />
    </div>
  );
};

// Apply role-based access control - only OPERATOR and ADMIN can access
export default withRole(["OPERATOR", "ADMIN"])(CalibrationPage); 