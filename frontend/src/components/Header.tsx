import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sun, Moon, LayoutDashboard, TrendingUp, DollarSign, FileText, Target, BarChart2, Users, Activity, Settings, Filter, Calendar, Building2, ChevronDown } from 'lucide-react';

export default function Header() {
  const [isDark, setIsDark] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const location = useLocation();

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const navTabs = [
    { path: '/', label: 'Overview', icon: LayoutDashboard },
    { path: '/revenue-analysis', label: 'Revenue', icon: TrendingUp },
    { path: '/profitability', label: 'Profitability', icon: DollarSign },
    { path: '/pl-statement', label: 'P&L', icon: FileText },
    { path: '/budget-actual', label: 'Budget', icon: Target },
    { path: '/forecast-analysis', label: 'Forecast', icon: BarChart2 },
    { path: '/workforce-analytics', label: 'Workforce', icon: Users },
    { path: '/variance-analysis', label: 'Variance', icon: Activity },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
      {/* Top Bar */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 px-6 py-3">
        <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center font-bold text-blue-700 text-xl">
              TM1
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">TM1 Analytics</h1>
              <p className="text-blue-100 text-xs">Enterprise Performance Management</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Global Filters Trigger */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg flex items-center gap-2 transition-colors backdrop-blur-sm border border-white/30"
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filters</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors backdrop-blur-sm border border-white/30"
              aria-label="Toggle dark mode"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* User Profile */}
            <div className="flex items-center gap-2 px-3 py-2 bg-white/20 rounded-lg border border-white/30 backdrop-blur-sm">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-sm font-bold text-blue-700">
                JD
              </div>
              <div className="text-left">
                <p className="text-white text-sm font-medium">John Doe</p>
                <p className="text-blue-100 text-xs">Finance Manager</p>
              </div>
            </div>

            {/* Settings */}
            <Link
              to="/admin"
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors backdrop-blur-sm border border-white/30"
            >
              <Settings className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Filter Bar (Collapsible) */}
      {showFilters && (
        <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="max-w-screen-2xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Date Range */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  Date Range
                </label>
                <select className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option>Year to Date</option>
                  <option>Last 12 Months</option>
                  <option>Current Quarter</option>
                  <option>Last Quarter</option>
                  <option>Current Month</option>
                  <option>Custom Range</option>
                </select>
              </div>

              {/* Entity */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  <Building2 className="w-3 h-3 inline mr-1" />
                  Entity / Region
                </label>
                <select className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option>All Entities</option>
                  <option>North America</option>
                  <option>Europe</option>
                  <option>Asia Pacific</option>
                  <option>Latin America</option>
                </select>
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Department</label>
                <select className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option>All Departments</option>
                  <option>Sales</option>
                  <option>Marketing</option>
                  <option>Engineering</option>
                  <option>Finance</option>
                </select>
              </div>

              {/* Scenario */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Scenario</label>
                <select className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option>Actual</option>
                  <option>Budget</option>
                  <option>Forecast</option>
                  <option>Prior Year</option>
                </select>
              </div>

              {/* Apply Button */}
              <div className="flex items-end">
                <button className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <nav className="bg-white dark:bg-gray-900 px-6">
        <div className="max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = location.pathname === tab.path;
              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all whitespace-nowrap border-b-2 ${
                    isActive
                      ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </header>
  );
}
