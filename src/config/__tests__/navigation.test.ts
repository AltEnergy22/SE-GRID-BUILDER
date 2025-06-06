import { hasRole, getVisibleNavItems, navigationItems } from '../navigation';

describe('Navigation Role-Based Access', () => {
  describe('hasRole', () => {
    it('should return true when user has required role', () => {
      const userRoles = ['OPERATOR', 'USER'];
      const requiredRoles = ['OPERATOR'];
      
      expect(hasRole(userRoles, requiredRoles)).toBe(true);
    });

    it('should return false when user lacks required role', () => {
      const userRoles = ['USER'];
      const requiredRoles = ['OPERATOR'];
      
      expect(hasRole(userRoles, requiredRoles)).toBe(false);
    });

    it('should return true when user has any of multiple required roles', () => {
      const userRoles = ['ENGINEER'];
      const requiredRoles = ['OPERATOR', 'ENGINEER'];
      
      expect(hasRole(userRoles, requiredRoles)).toBe(true);
    });

    it('should return true when no roles required', () => {
      const userRoles = ['USER'];
      const requiredRoles: string[] = [];
      
      expect(hasRole(userRoles, requiredRoles)).toBe(true);
    });

    it('should return true when requiredRoles is undefined', () => {
      const userRoles = ['USER'];
      
      expect(hasRole(userRoles, undefined)).toBe(true);
    });
  });

  describe('getVisibleNavItems', () => {
    it('should include Calibration nav item for OPERATOR role', () => {
      const userRoles = ['OPERATOR'];
      const visibleItems = getVisibleNavItems(userRoles);
      
      const calibrationItem = visibleItems.find(item => item.label === 'Calibration');
      expect(calibrationItem).toBeDefined();
      expect(calibrationItem?.href).toBe('/calibration');
    });

    it('should exclude Calibration nav item for USER role', () => {
      const userRoles = ['USER'];
      const visibleItems = getVisibleNavItems(userRoles);
      
      const calibrationItem = visibleItems.find(item => item.label === 'Calibration');
      expect(calibrationItem).toBeUndefined();
    });

    it('should include Calibration nav item for ADMIN role', () => {
      const userRoles = ['ADMIN'];
      const visibleItems = getVisibleNavItems(userRoles);
      
      const calibrationItem = visibleItems.find(item => item.label === 'Calibration');
      expect(calibrationItem).toBeDefined();
    });

    it('should exclude Settings for non-ADMIN users', () => {
      const userRoles = ['OPERATOR'];
      const visibleItems = getVisibleNavItems(userRoles);
      
      const settingsItem = visibleItems.find(item => item.label === 'Settings');
      expect(settingsItem).toBeUndefined();
    });

    it('should filter children based on user roles', () => {
      const userRoles = ['OPERATOR']; // OPERATOR can't access State Estimation
      const visibleItems = getVisibleNavItems(userRoles);
      
      const analysisItem = visibleItems.find(item => item.label === 'Analysis');
      const stateEstimationChild = analysisItem?.children?.find(child => child.label === 'State Estimation');
      
      expect(stateEstimationChild).toBeUndefined();
    });

    it('should include appropriate children for ENGINEER role', () => {
      const userRoles = ['ENGINEER'];
      const visibleItems = getVisibleNavItems(userRoles);
      
      const analysisItem = visibleItems.find(item => item.label === 'Analysis');
      const stateEstimationChild = analysisItem?.children?.find(child => child.label === 'State Estimation');
      
      expect(stateEstimationChild).toBeDefined();
    });

    it('should return empty array for users with no valid roles', () => {
      const userRoles: string[] = [];
      const visibleItems = getVisibleNavItems(userRoles);
      
      expect(visibleItems).toHaveLength(0);
    });

    it('should include all items for ADMIN role', () => {
      const userRoles = ['ADMIN'];
      const visibleItems = getVisibleNavItems(userRoles);
      
      // ADMIN should see all top-level items
      expect(visibleItems).toHaveLength(navigationItems.length);
      
      // Should include Calibration
      const calibrationItem = visibleItems.find(item => item.label === 'Calibration');
      expect(calibrationItem).toBeDefined();
      
      // Should include Settings
      const settingsItem = visibleItems.find(item => item.label === 'Settings');
      expect(settingsItem).toBeDefined();
    });
  });
}); 