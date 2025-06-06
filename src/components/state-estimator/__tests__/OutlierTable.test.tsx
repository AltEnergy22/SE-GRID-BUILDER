import { render, screen, fireEvent } from '@testing-library/react';
import { OutlierTable } from '../OutlierTable';
import { SEResidual } from '@/hooks/useStateEstimator';

// Mock data for testing
const mockResiduals: SEResidual[] = [
  {
    element_type: 'bus',
    element_id: 1,
    meas_type: 'v',
    residual: 0.001,
    std_dev: 0.01, // norm_res = 0.1
  },
  {
    element_type: 'line',
    element_id: 2,
    meas_type: 'p',
    residual: 0.04,
    std_dev: 0.01, // norm_res = 4.0 (outlier)
  },
  {
    element_type: 'bus',
    element_id: 3,
    meas_type: 'v',
    residual: -0.025,
    std_dev: 0.01, // norm_res = 2.5
  },
  {
    element_type: 'line',
    element_id: 1,
    meas_type: 'q',
    residual: 0.035,
    std_dev: 0.01, // norm_res = 3.5 (outlier)
  },
];

describe('OutlierTable', () => {
  describe('Sorting Functionality', () => {
    it('should sort by normalized residual in descending order by default', () => {
      render(<OutlierTable residuals={mockResiduals} />);
      
      const rows = screen.getAllByRole('row');
      // Skip header row, check data rows
      const firstDataRow = rows[1];
      const secondDataRow = rows[2];
      
      // First row should have highest normalized residual (4.0)
      expect(firstDataRow).toHaveTextContent('4.00');
      // Second row should have second highest (3.5)
      expect(secondDataRow).toHaveTextContent('3.50');
    });

    it('should sort by normalized residual in ascending order when clicked twice', () => {
      render(<OutlierTable residuals={mockResiduals} />);
      
      const normResHeader = screen.getByText('|r/σ|');
      
      // Click twice to get ascending order
      fireEvent.click(normResHeader);
      fireEvent.click(normResHeader);
      
      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1];
      
      // First row should have lowest normalized residual (0.1)
      expect(firstDataRow).toHaveTextContent('0.10');
    });

    it('should sort by element when element header is clicked', () => {
      render(<OutlierTable residuals={mockResiduals} />);
      
      const elementHeader = screen.getByText('Element');
      fireEvent.click(elementHeader);
      
      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1];
      
      // Should sort alphabetically by element label
      expect(firstDataRow).toHaveTextContent('bus_1');
    });

    it('should sort by measurement type when type header is clicked', () => {
      render(<OutlierTable residuals={mockResiduals} />);
      
      const typeHeader = screen.getByText('Type');
      fireEvent.click(typeHeader);
      
      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1];
      
      // Should sort alphabetically by type label
      expect(firstDataRow).toHaveTextContent('BUS_V');
    });

    it('should sort by absolute residual when residual header is clicked', () => {
      render(<OutlierTable residuals={mockResiduals} />);
      
      const residualHeader = screen.getByText('Residual');
      fireEvent.click(residualHeader);
      
      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1];
      
      // Should sort by absolute residual value (highest first in desc order)
      expect(firstDataRow).toHaveTextContent('0.0400');
    });
  });

  describe('Row Styling', () => {
    it('should highlight outliers with red background', () => {
      render(<OutlierTable residuals={mockResiduals} />);
      
      const rows = screen.getAllByRole('row');
      
      // Find rows with outlier values (>3σ)
      const outlierRows = rows.filter(row => {
        const text = row.textContent || '';
        return text.includes('4.00') || text.includes('3.50');
      });
      
      outlierRows.forEach(row => {
        expect(row).toHaveClass('bg-red-50', 'border-red-200');
      });
    });

    it('should highlight warnings with yellow background', () => {
      render(<OutlierTable residuals={mockResiduals} />);
      
      const rows = screen.getAllByRole('row');
      
      // Find row with warning value (2-3σ)
      const warningRow = rows.find(row => {
        const text = row.textContent || '';
        return text.includes('2.50');
      });
      
      expect(warningRow).toHaveClass('bg-yellow-50', 'border-yellow-200');
    });

    it('should use normal styling for acceptable values', () => {
      render(<OutlierTable residuals={mockResiduals} />);
      
      const rows = screen.getAllByRole('row');
      
      // Find row with normal value (<2σ)
      const normalRow = rows.find(row => {
        const text = row.textContent || '';
        return text.includes('0.10');
      });
      
      expect(normalRow).toHaveClass('bg-white', 'border-gray-200');
    });
  });

  describe('Summary Statistics', () => {
    it('should display correct total count', () => {
      render(<OutlierTable residuals={mockResiduals} />);
      
      expect(screen.getByText('4')).toBeInTheDocument(); // Total count
    });

    it('should count outliers correctly', () => {
      render(<OutlierTable residuals={mockResiduals} />);
      
      // Should count 2 outliers (norm_res > 3)
      const suspectCount = screen.getByText(/Suspect.*2/);
      expect(suspectCount).toBeInTheDocument();
    });

    it('should count warnings correctly', () => {
      render(<OutlierTable residuals={mockResiduals} />);
      
      // Should count 1 warning (2 < norm_res <= 3)
      const warningCount = screen.getByText(/Warning.*1/);
      expect(warningCount).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('should not show pagination for small datasets', () => {
      render(<OutlierTable residuals={mockResiduals} />);
      
      // Should not show pagination controls for 4 items (< pageSize of 10)
      expect(screen.queryByText('Previous')).not.toBeInTheDocument();
      expect(screen.queryByText('Next')).not.toBeInTheDocument();
    });

    it('should show pagination for large datasets', () => {
      // Create 15 residuals to trigger pagination
      const largeDataset = Array.from({ length: 15 }, (_, i) => ({
        element_type: 'bus' as const,
        element_id: i,
        meas_type: 'v' as const,
        residual: 0.001 * (i + 1),
        std_dev: 0.01,
      }));

      render(<OutlierTable residuals={largeDataset} />);
      
      expect(screen.getByText('Previous')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
      expect(screen.getByText('Showing 1 to 10 of 15 measurements')).toBeInTheDocument();
    });
  });
}); 