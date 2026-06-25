import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  TrendingUp, 
  DollarSign, 
  Target, 
  PieChart, 
  FileText, 
  BarChart3,
  Users,
  Settings,
  Layers,
  Database,
  GitBranch
} from 'lucide-react';

const navigation = [
  { name: 'Executive Overview', href: '/', icon: LayoutDashboard },
  { name: 'Product Financial Analysis', href: '/revenue-planning', icon: TrendingUp },
  { name: 'Workforce Reporting', href: '/workforce-planning', icon: Users },
  { name: 'CFO Budgeting', href: '/cfo-budgeting', icon: DollarSign },
  { name: 'Forecasting Analysis', href: '/forecasting-analysis', icon: BarChart3 },
  { name: 'P&L Statement', href: '/pl-statement', icon: FileText },
  { name: 'Balance Sheet', href: '/balance-sheet', icon: Layers },
  { name: 'Financial Consolidation', href: '/financial-consolidation', icon: GitBranch },
  { name: 'Cube Explorer', href: '/cube-explorer', icon: Database },
  { name: 'Dimension Explorer', href: '/dimension-explorer', icon: PieChart },
  { name: 'TM1 Architecture', href: '/tm1-architecture', icon: Target },
  { name: 'Admin Data Health', href: '/admin-data-health', icon: Settings },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <div className="w-64 bg-gradient-to-b from-gray-900 to-gray-800 min-h-screen shadow-2xl">
      <nav className="p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
              }`}
            >
              <Icon className={`mr-3 h-5 w-5 ${isActive ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'}`} />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
