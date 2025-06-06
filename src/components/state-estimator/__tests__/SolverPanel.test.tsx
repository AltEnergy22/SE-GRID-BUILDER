import { render, screen } from '@testing-library/react';
import { SolverPanel } from '../SolverPanel';
import { SEResult } from '@/hooks/useStateEstimator';

// Mock data
const mockConvergedResult: SEResult = {
  converged: true,
  iterations: 5,
  elapsed_ms: 123.5,
  bus_vm_pu: [1.02, 1.01, 0.99],
  bus_va_degree: [0, -2.5, -5.1],
  residuals: [
    {
      element_type: 'bus',
      element_id: 1,
      meas_type: 'v',
      residual: 0.001,
      std_dev: 0.01,
    },
  ],
};

const mockFailedResult: SEResult = {
  ...mockConvergedResult,
  converged: false,
  iterations: 10,
};

describe('SolverPanel', () => {
  describe('Status Badge Color Logic', () => {
    it('should show running status with yellow badge when isRunning is true', () => {
      render(
        <SolverPanel
          data={null}
          isLoading={false}
          isRunning={true}
        />
      );
      
      const runningBadge = screen.getByText('Running');
      expect(runningBadge).toBeInTheDocument();
      expect(runningBadge.closest('span')).toHaveClass('bg-yellow-100', 'text-yellow-800');
    });

    it('should show no results with gray badge when data is null', () => {
      render(
        <SolverPanel
          data={null}
          isLoading={false}
          isRunning={false}
        />
      );
      
      const noResultsBadge = screen.getByText('No Results');
      expect(noResultsBadge).toBeInTheDocument();
      expect(noResultsBadge.closest('span')).toHaveClass('bg-gray-100', 'text-gray-800');
    });

    it('should show converged status with green badge when converged is true', () => {
      render(
        <SolverPanel
          data={mockConvergedResult}
          isLoading={false}
          isRunning={false}
        />
      );
      
      const convergedBadge = screen.getByText('Converged');
      expect(convergedBadge).toBeInTheDocument();
      expect(convergedBadge.closest('span')).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('should show failed status with red badge when converged is false', () => {
      render(
        <SolverPanel
          data={mockFailedResult}
          isLoading={false}
          isRunning={false}
        />
      );
      
      const failedBadge = screen.getByText('Failed');
      expect(failedBadge).toBeInTheDocument();
      expect(failedBadge.closest('span')).toHaveClass('bg-red-100', 'text-red-800');
    });

    it('should prioritize running status over data when both are present', () => {
      render(
        <SolverPanel
          data={mockConvergedResult}
          isLoading={false}
          isRunning={true}
        />
      );
      
      const runningBadge = screen.getByText('Running');
      expect(runningBadge).toBeInTheDocument();
      expect(screen.queryByText('Converged')).not.toBeInTheDocument();
    });
  });

  describe('Data Display', () => {
    it('should display correct metrics when data is available', () => {
      render(
        <SolverPanel
          data={mockConvergedResult}
          isLoading={false}
          isRunning={false}
        />
      );
      
      expect(screen.getByText('5')).toBeInTheDocument(); // iterations
      expect(screen.getByText('123.5 ms')).toBeInTheDocument(); // elapsed time
      expect(screen.getByText('3 buses')).toBeInTheDocument(); // bus count
      expect(screen.getByText('1 points')).toBeInTheDocument(); // measurements
    });

    it('should show dashes when running', () => {
      render(
        <SolverPanel
          data={mockConvergedResult}
          isLoading={false}
          isRunning={true}
        />
      );
      
      // Should show dashes for numeric values when running
      const dashElements = screen.getAllByText('-');
      expect(dashElements.length).toBeGreaterThanOrEqual(2); // iterations and elapsed time
    });

    it('should calculate outliers correctly', () => {
      const dataWithOutliers: SEResult = {
        ...mockConvergedResult,
        residuals: [
          { element_type: 'bus', element_id: 1, meas_type: 'v', residual: 0.001, std_dev: 0.01 }, // 0.1σ - normal
          { element_type: 'bus', element_id: 2, meas_type: 'v', residual: 0.04, std_dev: 0.01 }, // 4σ - outlier
          { element_type: 'line', element_id: 1, meas_type: 'p', residual: -0.03, std_dev: 0.01 }, // 3σ - outlier
        ],
      };

      render(
        <SolverPanel
          data={dataWithOutliers}
          isLoading={false}
          isRunning={false}
        />
      );
      
      expect(screen.getByText('2 suspect')).toBeInTheDocument(); // Should count 2 outliers (>3σ)
    });
  });
}); 