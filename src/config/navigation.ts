import { WrenchIcon, HomeIcon, ChartBarIcon, CogIcon, SignalIcon } from '@heroicons/react/24/outline';

export interface NavigationItem {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  href: string;
  roles?: string[];
  children?: NavigationItem[];
}

export const navigationItems: NavigationItem[] = [
  {
    icon: HomeIcon,
    label: "Dashboard",
    href: "/dashboard",
    roles: ["OPERATOR", "ENGINEER", "ADMIN"]
  },
  {
    icon: SignalIcon,
    label: "Grid Management",
    href: "/grids",
    roles: ["OPERATOR", "ENGINEER", "ADMIN"]
  },
  {
    icon: ChartBarIcon,
    label: "Analysis",
    href: "/analysis",
    roles: ["OPERATOR", "ENGINEER", "ADMIN"],
    children: [
      {
        icon: ChartBarIcon,
        label: "Power Flow",
        href: "/analysis/powerflow",
        roles: ["OPERATOR", "ENGINEER", "ADMIN"]
      },
      {
        icon: ChartBarIcon,
        label: "State Estimator",
        href: "/state-estimator",
        roles: ["ENGINEER", "OPERATOR", "ADMIN"]
      },
      {
        icon: ChartBarIcon,
        label: "RTCA",
        href: "/contingency",
        roles: ["OPERATOR", "ENGINEER", "ADMIN"]
      }
    ]
  },
  {
    icon: WrenchIcon,
    label: "Calibration",
    href: "/calibration",
    roles: ["OPERATOR", "ADMIN"]
  },
  {
    icon: CogIcon,
    label: "Settings",
    href: "/settings",
    roles: ["ADMIN"]
  }
];

export const hasRole = (userRoles: string[], requiredRoles?: string[]): boolean => {
  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }
  
  return requiredRoles.some(role => userRoles.includes(role));
};

export const getVisibleNavItems = (userRoles: string[]): NavigationItem[] => {
  return navigationItems.filter(item => hasRole(userRoles, item.roles)).map(item => ({
    ...item,
    children: item.children?.filter(child => hasRole(userRoles, child.roles))
  }));
}; 